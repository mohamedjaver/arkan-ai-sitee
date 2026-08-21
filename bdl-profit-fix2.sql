-- ═══════════════════════════════════════════════════════════════
-- BDL — ربح بيع الدولار (USDT/USD/EUR) مقابل الكوانزا أو الأوقية:
--   الربح يُحسب ويُعرض بعملة الهدف نفسها (كوانزا للكوانزا)
--   ربح = المدفوع للهدف − (الكمية × سعر التكلفة)
-- الصقه في Supabase → SQL Editor → Run  (يستبدل النسخة السابقة)
-- ═══════════════════════════════════════════════════════════════
create or replace view bdl_profit_daily as
select owner_id,
       date_trunc('day', updated_at) as day,
       ccy,
       coalesce(settle_ccy, ccy)     as settle_ccy,
       count(*)::int                 as tx_count,
       sum(amount)                   as amount,
       sum(coalesce(settle_amount,0)) as settle_amount,
       sum(
         case
           /* أوقية ← كوانزا (نمط السعر القديم): الربح بالأوقية الجديدة */
           when ccy='MRU' and settle_ccy='AOA'
                and (meta->>'rate_cost') is not null
             then amount - settle_amount * ((meta->>'rate_cost')::numeric) / 10
           /* دولار/يورو ← كوانزا أو أوقية: الربح بعملة الهدف */
           when ccy<>'MRU' and settle_ccy in ('AOA','MRU')
                and (meta->>'rate_cost') is not null
             then settle_amount - amount * ((meta->>'rate_cost')::numeric)
           when settle_ccy = ccy
             then coalesce(settle_amount,0) - coalesce(cost,0)
           else 0
         end
       ) as profit,
       max(
         case
           when ccy='MRU' and settle_ccy='AOA' then 'MRU'
           when ccy<>'MRU' and settle_ccy in ('AOA','MRU') then settle_ccy
           else ccy
         end
       ) as profit_ccy
from bdl_transactions
where status = 'done'
group by owner_id, date_trunc('day', updated_at), ccy, coalesce(settle_ccy, ccy);

alter view bdl_profit_daily set (security_invoker = on);
