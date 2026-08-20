-- ═══════════════════════════════════════════════════════════════
-- BDL — إصلاح احتساب الربح: المعادلة القديمة (settle − cost) كانت
-- تُخرج كامل الكوانزا كـ«ربح» عند غياب التكلفة. المعادلة الصحيحة:
--   ربح MRU = المستلَم MRU − (الكوانزا المدفوعة × سعر التكلفة القديمة ÷ 10)
-- الصقه في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════
create or replace view bdl_profit_daily as
select owner_id,
       date_trunc('day', updated_at) as day,
       ccy,
       count(*)::int                as tx_count,
       sum(amount)                  as amount,
       sum(coalesce(settle_amount,0)) as settle_amount,
       sum(
         case
           when ccy='MRU' and settle_ccy='AOA'
                and (meta->>'rate_cost') is not null
             then amount - settle_amount * ((meta->>'rate_cost')::numeric) / 10
           when settle_ccy = ccy
             then coalesce(settle_amount,0) - coalesce(cost,0)
           else 0
         end
       ) as profit
from bdl_transactions
where status = 'done'
group by owner_id, date_trunc('day', updated_at), ccy;

alter view bdl_profit_daily set (security_invoker = on);
