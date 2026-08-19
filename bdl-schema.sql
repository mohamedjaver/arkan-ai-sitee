-- ═══════════════════════════════════════════════════════════════
--  BDL SETTLEMENT — المخطط المركزي (Source of Truth)
--  الصقه كاملًا في: Supabase → SQL Editor → Run
--  آمن للتشغيل أكثر من مرة (IF NOT EXISTS / OR REPLACE)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── 1) العملاء ──────────────────────────────────────────────────
create table if not exists bdl_customers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  code        text,                       -- Customer ID الظاهر: C-0001
  name        text not null,
  phone       text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ix_cust_owner on bdl_customers(owner_id);
create index if not exists ix_cust_name  on bdl_customers(owner_id, lower(name));
create unique index if not exists ux_cust_code on bdl_customers(owner_id, code)
  where code is not null;

-- ── 2) حسابات العميل (Bankily / Sedad / Masrvi / IBAN / محفظة) ──
create table if not exists bdl_accounts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  customer_id uuid not null references bdl_customers(id) on delete cascade,
  kind        text not null default 'other',   -- bankily|sedad|masrvi|bank|iban|wallet|other
  label       text,
  number      text not null,                   -- رقم الحساب/الهاتف/IBAN
  bank        text,
  currency    text,
  created_at  timestamptz not null default now()
);
create index if not exists ix_acc_cust on bdl_accounts(customer_id);
-- رقم الحساب فريد لكل مالك: كتابته وحدها تكفي للتعرف على العميل
create unique index if not exists ux_acc_number
  on bdl_accounts(owner_id, regexp_replace(number,'[^0-9A-Za-z]','','g'));

-- ── 3) العمليات — كل تحويل سجل مستقل، لا يُدمج ولا يُحذف ────────
create table if not exists bdl_transactions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid(),
  ref           text not null,                 -- BDL-260819-A7K2
  customer_id   uuid not null references bdl_customers(id),
  account_id    uuid          references bdl_accounts(id),
  amount        numeric(20,4) not null,        -- بعملة العميل
  ccy           text not null,                 -- MRU / AOA / USDT / CNY / AED
  settle_ccy    text,                          -- عملة التسوية
  rate          numeric(20,8),
  settle_amount numeric(20,4),                 -- amount ÷/× rate
  cost          numeric(20,4),                 -- تكلفتنا (لحساب الربح)
  status        text not null default 'open',  -- open | settling | done
  settlement_id uuid,
  note          text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists ux_tx_ref on bdl_transactions(owner_id, ref);
create index if not exists ix_tx_open on bdl_transactions(owner_id, status, ccy);
create index if not exists ix_tx_group on bdl_transactions(owner_id, customer_id, account_id, ccy);
create index if not exists ix_tx_created on bdl_transactions(owner_id, created_at desc);
create index if not exists ix_tx_settlement on bdl_transactions(settlement_id);

-- ── 4) الإيصالات ───────────────────────────────────────────────
create table if not exists bdl_receipts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  file_url    text,
  amount      numeric(20,4),
  ccy         text,
  bank        text,
  account_no  text,
  txn_ref     text,
  dated_at    timestamptz,
  ocr         jsonb not null default '{}'::jsonb,
  fingerprint text,                            -- لمنع الاستخدام المزدوج
  used_count  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists ix_rc_owner on bdl_receipts(owner_id, created_at desc);
create unique index if not exists ux_rc_fp on bdl_receipts(owner_id, fingerprint)
  where fingerprint is not null;

-- ── 5) التسويات ────────────────────────────────────────────────
create table if not exists bdl_settlements (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid(),
  ref          text not null,
  ccy          text,
  total_amount numeric(20,4) default 0,
  total_settle numeric(20,4) default 0,
  profit       numeric(20,4) default 0,
  tx_count     int default 0,
  status       text not null default 'done',   -- done | partial
  note         text,
  created_at   timestamptz not null default now()
);
create unique index if not exists ux_st_ref on bdl_settlements(owner_id, ref);
create index if not exists ix_st_created on bdl_settlements(owner_id, created_at desc);

-- ربط الإيصالات بالتسويات (إيصال واحد يغطي عدة عمليات، والعكس)
create table if not exists bdl_settlement_receipts (
  settlement_id uuid not null references bdl_settlements(id) on delete cascade,
  receipt_id    uuid not null references bdl_receipts(id) on delete cascade,
  owner_id      uuid not null default auth.uid(),
  primary key (settlement_id, receipt_id)
);

-- ═══ حساب المالك: عرض محسوب، لا إدخال مزدوج ═══════════════════
-- كل عملية عميل تظهر هنا تلقائيًا. لا يوجد جدول "جهات".
create or replace view bdl_owner_ledger as
select
  t.owner_id, t.id as tx_id, t.ref, t.status, t.created_at,
  c.id as customer_id, c.name as customer_name, c.phone,
  a.id as account_id, a.kind as account_kind, a.number as account_number, a.bank,
  t.ccy, t.amount, t.settle_ccy, t.settle_amount, t.rate,
  coalesce(t.settle_amount,0) - coalesce(t.cost,0) as profit,
  t.settlement_id
from bdl_transactions t
join bdl_customers c on c.id = t.customer_id
left join bdl_accounts a on a.id = t.account_id;

-- ═══ التجميع: عميل + حساب + عملة (كل عملية تبقى مستقلة تحته) ═══
create or replace view bdl_open_groups as
select
  t.owner_id,
  t.customer_id, c.name as customer_name,
  t.account_id,
  coalesce(a.kind,'—')   as account_kind,
  coalesce(a.number,'—') as account_number,
  t.ccy,
  max(t.settle_ccy)              as settle_ccy,
  count(*)::int                  as tx_count,
  sum(t.amount)                  as total_amount,
  sum(coalesce(t.settle_amount,0)) as total_settle,
  min(t.created_at)              as first_at,
  max(t.created_at)              as last_at,
  array_agg(t.id order by t.created_at) as tx_ids
from bdl_transactions t
join bdl_customers c on c.id = t.customer_id
left join bdl_accounts a on a.id = t.account_id
where t.status in ('open','settling')
group by t.owner_id, t.customer_id, c.name, t.account_id, a.kind, a.number, t.ccy;

-- ═══ الأرباح ══════════════════════════════════════════════════
create or replace view bdl_profit_daily as
select owner_id, date_trunc('day', created_at) as day, ccy,
       count(*)::int as tx_count,
       sum(amount) as amount,
       sum(coalesce(settle_amount,0)) as settle_amount,
       sum(coalesce(settle_amount,0) - coalesce(cost,0)) as profit
from bdl_transactions
where status = 'done'
group by owner_id, date_trunc('day', created_at), ccy;

-- ═══ توليد المراجع ════════════════════════════════════════════
create or replace function bdl_new_ref(p_prefix text default 'BDL')
returns text language plpgsql as $$
declare s text; a text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; i int;
begin
  s := '';
  for i in 1..4 loop s := s || substr(a, 1+floor(random()*length(a))::int, 1); end loop;
  return p_prefix || '-' || to_char(now(),'YYMMDD') || '-' || s;
end $$;

-- تعبئة ref تلقائيًا إن تُرك فارغًا + تحديث updated_at
create or replace function bdl_tx_before() returns trigger language plpgsql as $$
begin
  if new.ref is null or new.ref = '' then new.ref := bdl_new_ref('BDL'); end if;
  if new.settle_amount is null and new.rate is not null and new.rate <> 0 then
    new.settle_amount := round(new.amount / new.rate, 4);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tg_tx_before on bdl_transactions;
create trigger tg_tx_before before insert or update on bdl_transactions
  for each row execute function bdl_tx_before();

-- ترقيم العملاء C-0001
create or replace function bdl_cust_before() returns trigger language plpgsql as $$
declare n int;
begin
  if new.code is null or new.code = '' then
    select count(*)+1 into n from bdl_customers where owner_id = new.owner_id;
    new.code := 'C-' || lpad(n::text, 4, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tg_cust_before on bdl_customers;
create trigger tg_cust_before before insert or update on bdl_customers
  for each row execute function bdl_cust_before();

-- ═══ إتمام التسوية: عملية ذرية واحدة ══════════════════════════
create or replace function bdl_settle(p_tx uuid[], p_receipts uuid[] default '{}', p_note text default null)
returns bdl_settlements language plpgsql security invoker as $$
declare st bdl_settlements; v_ccy text; v_amt numeric; v_set numeric; v_pf numeric; v_n int;
begin
  select max(ccy), sum(amount), sum(coalesce(settle_amount,0)),
         sum(coalesce(settle_amount,0)-coalesce(cost,0)), count(*)
    into v_ccy, v_amt, v_set, v_pf, v_n
  from bdl_transactions
  where id = any(p_tx) and owner_id = auth.uid() and status <> 'done';

  if coalesce(v_n,0) = 0 then raise exception 'لا توجد عمليات قابلة للتسوية'; end if;

  insert into bdl_settlements(ref, ccy, total_amount, total_settle, profit, tx_count, note)
  values (bdl_new_ref('STL'), v_ccy, v_amt, v_set, v_pf, v_n, p_note)
  returning * into st;

  update bdl_transactions
     set status = 'done', settlement_id = st.id, updated_at = now()
   where id = any(p_tx) and owner_id = auth.uid();

  if array_length(p_receipts,1) is not null then
    insert into bdl_settlement_receipts(settlement_id, receipt_id)
    select st.id, r from unnest(p_receipts) r
    on conflict do nothing;
    update bdl_receipts set used_count = used_count + 1
     where id = any(p_receipts) and owner_id = auth.uid();
  end if;

  return st;
end $$;

-- ═══ الأمان: كل مالك يرى بياناته فقط ══════════════════════════
alter table bdl_customers          enable row level security;
alter table bdl_accounts           enable row level security;
alter table bdl_transactions       enable row level security;
alter table bdl_receipts           enable row level security;
alter table bdl_settlements        enable row level security;
alter table bdl_settlement_receipts enable row level security;

do $$
declare tb text;
begin
  foreach tb in array array['bdl_customers','bdl_accounts','bdl_transactions',
                            'bdl_receipts','bdl_settlements','bdl_settlement_receipts']
  loop
    execute format('drop policy if exists p_owner_all on %I', tb);
    execute format(
      'create policy p_owner_all on %I for all to authenticated
         using (owner_id = auth.uid()) with check (owner_id = auth.uid())', tb);
  end loop;
end $$;

-- العروض ترث أمان الجداول (security_invoker)
alter view bdl_owner_ledger  set (security_invoker = on);
alter view bdl_open_groups   set (security_invoker = on);
alter view bdl_profit_daily  set (security_invoker = on);

-- ═══ التحقق العام (QR) — دالة واحدة فقط، بيانات مخفية جزئيًا ══
-- تُستدعى بمفتاح anon من verify.html ولا تكشف الجداول.
create or replace function bdl_verify(p_ref text)
returns table(ref text, ccy text, amount numeric, settle_ccy text,
              settle_amount numeric, status text, created_at timestamptz,
              customer_masked text, account_masked text)
language sql security definer set search_path = public as $$
  select t.ref, t.ccy, t.amount, t.settle_ccy, t.settle_amount, t.status, t.created_at,
         split_part(c.name,' ',1) || ' ' || left(coalesce(split_part(c.name,' ',2),''),1) || '•••',
         case when a.number is null then null
              else '•••• ' || right(a.number, 4) end
  from bdl_transactions t
  join bdl_customers c on c.id = t.customer_id
  left join bdl_accounts a on a.id = t.account_id
  where upper(t.ref) = upper(p_ref)
  limit 1;
$$;
revoke all on function bdl_verify(text) from public;
grant execute on function bdl_verify(text) to anon, authenticated;
