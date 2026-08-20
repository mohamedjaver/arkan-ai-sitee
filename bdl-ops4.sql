-- ═══════════════════════════════════════════════════════════════
-- BDL — المرحلة 4: ربحية العمليات (تُحسب عند الإقفال وتصب في الأرباح)
-- الصقه في Supabase → SQL Editor → Run   (بعد bdl-ops3.sql)
-- ═══════════════════════════════════════════════════════════════

alter table bdl_ops add column if not exists rate_client numeric(10,4); -- سعر بيعك للعميل (أوقية قديمة/Kz)
alter table bdl_ops add column if not exists rate_cost   numeric(10,4); -- تكلفتك/سعر السوق
alter table bdl_ops add column if not exists profit_mru  numeric(20,2); -- الربح بالأوقية الجديدة
alter table bdl_ops add column if not exists closed_at   timestamptz;

alter table bdl_day_close add column if not exists profit_mru numeric(20,2) not null default 0;

-- ربحية يومية من العمليات المقفلة
create or replace view bdl_ops_profit_daily as
select owner_id,
       (closed_at at time zone 'utc')::date as day,
       count(*)                              as ops_n,
       sum(target_aoa)                       as volume_aoa,
       sum(profit_mru)                       as profit_mru
from bdl_ops
where status = 'closed' and closed_at is not null
group by owner_id, (closed_at at time zone 'utc')::date;

alter view bdl_ops_profit_daily set (security_invoker = on);
