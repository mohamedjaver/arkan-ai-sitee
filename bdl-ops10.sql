-- ═══════════════════════════════════════════════════════════════════
-- bdl-ops10.sql — محرّك الأرباح على الخادم (Build 1145)
-- يُلصق مرة واحدة في Supabase → SQL Editor. آمن للتكرار (idempotent).
-- ١) فهرس للاستعلامات المفهرسة على التسويات المكتملة
-- ٢) bdl_tx_profit: ربح كل عملية محسوب على الخادم بدقة numeric (لا floating point)
-- ٣) bdl_profit_summary(tz): ملخّص مجمّع (الكل/اليوم/الأسبوع/الشهر + الفترات السابقة + حسب العملة)
-- ٤) bdl_profit_buckets(from,to,bucket,tz): تجميع يومي/أسبوعي/شهري/سنوي للرسم البياني
-- ٥) bdl_profit_ledger: سجل أرباح تراكمي قابل للتدقيق (قبل/مضاف/بعد) يُملأ بمحفّز تلقائي
-- ٦) تفعيل Realtime على bdl_transactions
-- القاعدة: الربح = الإيراد (settle_amount) − التكلفة (cost) − الرسوم (meta.fee) − مصاريف (meta.expense)
--          بالعملة الهدف، ويُحوَّل للأوقية بنسبة amount/cost (سعر الشراء) — قاعدة المالك.
-- ═══════════════════════════════════════════════════════════════════

create index if not exists ix_tx_owner_status_upd
  on bdl_transactions(owner_id, status, updated_at desc);

-- ── ٢) محرّك ربح العملية ──────────────────────────────────────────
create or replace view bdl_tx_profit as
select
  t.id, t.owner_id, t.ref, t.customer_id, c.name as customer_name,
  t.ccy, coalesce(t.settle_ccy,'AOA') as tgt,
  t.amount, t.settle_amount, t.cost, t.rate, t.meta, t.status,
  t.created_at, t.updated_at, t.settlement_id,
  f.fee, f.expense,
  n.net_tgt,
  case
    when n.net_tgt is null then null
    when coalesce(t.settle_ccy,'AOA')='MRU' then n.net_tgt
    when t.ccy='MRU' and coalesce(t.settle_ccy,'AOA')='AOA' and t.cost<>0
         then n.net_tgt * t.amount / t.cost                      -- تحويل بسعر الشراء
    when t.ccy='MRU' and t.settle_amount<>0
         then n.net_tgt * t.amount / t.settle_amount             -- تحويل بسعر البيع
    else null
  end as net_mru,
  case when t.cost<>0 and n.net_tgt is not null then n.net_tgt / t.cost * 100 end as margin_pct,
  case when t.ccy='MRU' and coalesce(t.settle_ccy,'AOA')='AOA' and t.settle_amount<>0
       then t.amount*10/t.settle_amount
       when t.amount<>0 then t.settle_amount/t.amount end as rate_sell,
  case when t.ccy='MRU' and coalesce(t.settle_ccy,'AOA')='AOA' and t.cost<>0
       then coalesce((t.meta->>'rate_cost')::numeric, t.amount*10/t.cost)
       when t.amount<>0 then coalesce((t.meta->>'rate_cost')::numeric, t.cost/t.amount) end as rate_buy
from bdl_transactions t
left join bdl_customers c on c.id = t.customer_id
cross join lateral (
  select coalesce(nullif(t.meta->>'fee','')::numeric,0)     as fee,
         coalesce(nullif(t.meta->>'expense','')::numeric,0) as expense
) f
cross join lateral (
  select case when t.settle_amount is not null and t.cost is not null and t.cost<>0
              then t.settle_amount - t.cost - f.fee - f.expense end as net_tgt
) n;
alter view bdl_tx_profit set (security_invoker = on);

-- ── ٣) الملخّص المجمّع ────────────────────────────────────────────
create or replace function bdl_profit_summary(p_tz text default 'UTC')
returns jsonb language sql stable security invoker as $$
with p as (
  select *, (updated_at at time zone p_tz) as lt,
         (now() at time zone p_tz) as lnow
  from bdl_tx_profit
  where owner_id = auth.uid() and status in ('done','settled')
),
w as (
  select 'total'  k, p.* from p
  union all select 'today',  p.* from p where lt >= date_trunc('day',lnow)
  union all select 'yday',   p.* from p where lt >= date_trunc('day',lnow)-interval '1 day' and lt < date_trunc('day',lnow)
  union all select 'week',   p.* from p where lt >= date_trunc('week',lnow)
  union all select 'pweek',  p.* from p where lt >= date_trunc('week',lnow)-interval '7 day' and lt < date_trunc('week',lnow)
  union all select 'month',  p.* from p where lt >= date_trunc('month',lnow)
  union all select 'pmonth', p.* from p where lt >= date_trunc('month',lnow)-interval '1 month' and lt < date_trunc('month',lnow)
),
agg as (
  select k, count(*) n, count(*) filter (where net_tgt is null) na,
         sum(net_mru) net_mru,
         sum(net_tgt) filter (where tgt='AOA') net_aoa,
         sum(settle_amount) rev, sum(cost) cost, sum(fee+expense) fee, sum(amount) vol,
         sum(net_mru) filter (where net_mru>0) gp, sum(net_mru) filter (where net_mru<0) gl,
         count(*) filter (where net_mru>0) wins, count(*) filter (where net_mru<0) losses
  from w group by k
),
byc as (
  select tgt as ccy, count(*) n, sum(net_tgt) net, sum(settle_amount) rev, sum(cost) cost
  from p where net_tgt is not null group by tgt
)
select jsonb_build_object(
  'periods', (select jsonb_object_agg(k, to_jsonb(agg) - 'k') from agg),
  'by_ccy',  coalesce((select jsonb_agg(to_jsonb(byc)) from byc),'[]'::jsonb),
  'at', now());
$$;

-- ── ٤) تجميع للرسم البياني ───────────────────────────────────────
create or replace function bdl_profit_buckets(p_from timestamptz, p_to timestamptz,
                                              p_bucket text default 'day', p_tz text default 'UTC')
returns table(bucket date, n int, net_mru numeric, net_aoa numeric, vol numeric, rev numeric, cost numeric,
              best numeric, worst numeric)
language sql stable security invoker as $$
  select date_trunc(p_bucket, updated_at at time zone p_tz)::date,
         count(*)::int, sum(net_mru), sum(net_tgt) filter (where tgt='AOA'),
         sum(amount), sum(settle_amount), sum(cost), max(net_mru), min(net_mru)
  from bdl_tx_profit
  where owner_id = auth.uid() and status in ('done','settled')
    and updated_at >= p_from and updated_at < p_to
  group by 1 order by 1;
$$;

-- ── ٥) سجل الأرباح التراكمي ─────────────────────────────────────
create table if not exists bdl_profit_ledger (
  id            bigserial primary key,
  owner_id      uuid not null default auth.uid(),
  tx_id         uuid,
  ref           text,
  ts            timestamptz not null default now(),
  event         text not null,                 -- settled | adjusted | reversed | deleted
  profit_before numeric(24,6) not null,
  profit_added  numeric(24,6) not null,
  profit_after  numeric(24,6) not null,
  ccy           text not null default 'MRU',
  actor         text,
  detail        jsonb not null default '{}'::jsonb
);
create index if not exists ix_pl_owner_id on bdl_profit_ledger(owner_id, id desc);
create index if not exists ix_pl_tx on bdl_profit_ledger(tx_id);
alter table bdl_profit_ledger enable row level security;
drop policy if exists pl_owner on bdl_profit_ledger;
create policy pl_owner on bdl_profit_ledger for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function bdl_tx_net_mru(r bdl_transactions) returns numeric
language sql immutable as $$
  select case
    when r.status not in ('done','settled') or r.settle_amount is null or r.cost is null or r.cost=0 then null
    else (
      with f as (select coalesce(nullif(r.meta->>'fee','')::numeric,0) fee,
                        coalesce(nullif(r.meta->>'expense','')::numeric,0) expense),
           n as (select r.settle_amount - r.cost - f.fee - f.expense net from f)
      select case
        when coalesce(r.settle_ccy,'AOA')='MRU' then n.net
        when r.ccy='MRU' and coalesce(r.settle_ccy,'AOA')='AOA' then n.net * r.amount / r.cost
        when r.ccy='MRU' and r.settle_amount<>0 then n.net * r.amount / r.settle_amount
        else null end
      from n)
  end;
$$;

create or replace function bdl_profit_ledger_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old numeric := 0; v_new numeric := 0; v_delta numeric; v_before numeric; v_owner uuid; v_ev text;
begin
  if tg_op <> 'INSERT' then v_old := coalesce(bdl_tx_net_mru(old),0); end if;
  if tg_op <> 'DELETE' then v_new := coalesce(bdl_tx_net_mru(new),0); end if;
  v_delta := v_new - v_old;
  if v_delta = 0 then return coalesce(new,old); end if;
  v_owner := coalesce(new.owner_id, old.owner_id);
  select coalesce(profit_after,0) into v_before from bdl_profit_ledger
   where owner_id = v_owner order by id desc limit 1;
  v_before := coalesce(v_before,0);
  v_ev := case when tg_op='DELETE' then 'deleted'
               when v_old=0 then 'settled'
               when v_new=0 then 'reversed' else 'adjusted' end;
  insert into bdl_profit_ledger(owner_id, tx_id, ref, event, profit_before, profit_added, profit_after, ccy, actor, detail)
  values (v_owner, coalesce(new.id,old.id), coalesce(new.ref,old.ref), v_ev, v_before, v_delta, v_before+v_delta, 'MRU',
          coalesce(auth.uid()::text,'system'),
          jsonb_build_object('op',tg_op,'status_old',case when tg_op<>'INSERT' then old.status end,
                             'status_new',case when tg_op<>'DELETE' then new.status end,
                             'net_old',v_old,'net_new',v_new));
  return coalesce(new,old);
end $$;

drop trigger if exists trg_bdl_profit_ledger on bdl_transactions;
create trigger trg_bdl_profit_ledger
  after insert or update of status, settle_amount, cost, meta or delete on bdl_transactions
  for each row execute function bdl_profit_ledger_trg();

-- تعبئة أولية للسجل من التسويات القائمة (مرة واحدة، إن كان السجل فارغًا)
do $$
declare r record; v_run numeric := 0;
begin
  if not exists (select 1 from bdl_profit_ledger) then
    for r in select t.*, bdl_tx_net_mru(t.*) net from bdl_transactions t
              where t.status in ('done','settled') order by t.updated_at, t.id loop
      if r.net is not null and r.net <> 0 then
        insert into bdl_profit_ledger(owner_id, tx_id, ref, ts, event, profit_before, profit_added, profit_after, ccy, actor, detail)
        values (r.owner_id, r.id, r.ref, r.updated_at, 'settled', v_run, r.net, v_run + r.net, 'MRU', 'backfill',
                jsonb_build_object('op','BACKFILL'));
        v_run := v_run + r.net;
      end if;
    end loop;
  end if;
end $$;

-- ── ٦) Realtime ──────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table bdl_transactions;
exception when duplicate_object then null; when others then null; end $$;

grant select on bdl_tx_profit to authenticated;
grant select on bdl_profit_ledger to authenticated;
grant execute on function bdl_profit_summary(text) to authenticated;
grant execute on function bdl_profit_buckets(timestamptz,timestamptz,text,text) to authenticated;
