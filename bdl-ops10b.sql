-- ═══════════════════════════════════════════════════════════════════
-- bdl-ops10b.sql — توحيد ربح العملات الأجنبية (Build 1164)
-- المشكلة: عمليات USDT/USD… → AOA كانت net_mru = null على الخادم،
--          بينما الجهاز يحوّلها للأوقية بسعر الشراء المرجعي (بناء 1161).
--          النتيجة: بطاقة «اليوم» أقل من عمود الرسم لنفس اليوم.
-- الإصلاح: الخادم يطبّق نفس القاعدة — الربح بالكوانزا × السعر المرجعي ÷ 10.
--          السعر المرجعي = سعر شراء آخر تسوية أوقية←كوانزا (meta.rate_cost
--          أو amount×10/cost). آمن للتكرار (idempotent). يُلصق مرة واحدة.
-- ═══════════════════════════════════════════════════════════════════

-- ── السعر المرجعي: سعر شراء آخر تسوية MRU→AOA للمالك نفسه ──────────
create or replace function bdl_ref_rb(p_owner uuid)
returns numeric language sql stable as $$
  select coalesce(nullif(m.meta->>'rate_cost','')::numeric, m.amount*10/m.cost)
  from bdl_transactions m
  where m.owner_id = p_owner
    and m.ccy='MRU' and coalesce(m.settle_ccy,'AOA')='AOA'
    and m.cost > 0 and m.amount > 0
    and m.status in ('done','settled')
  order by m.updated_at desc
  limit 1;
$$;

-- ── ٢) view الربح: إضافة حالة العملة الأجنبية ─────────────────────
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
    when coalesce(t.settle_ccy,'AOA')='AOA'
         then n.net_tgt * bdl_ref_rb(t.owner_id) / 10            -- أجنبي: السعر المرجعي
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

-- ── دالة السجل: نفس القاعدة (لم تعد immutable لأنها تقرأ السعر المرجعي) ──
create or replace function bdl_tx_net_mru(r bdl_transactions) returns numeric
language sql stable as $$
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
        when coalesce(r.settle_ccy,'AOA')='AOA' then n.net * bdl_ref_rb(r.owner_id) / 10
        else null end
      from n)
  end;
$$;
