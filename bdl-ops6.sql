-- ═══ bdl-ops6.sql — خط الأنابيب الموحّد: كل طلب يدخل العمليات مصنّفًا ═══
-- الصقه مرة واحدة في Supabase ← SQL Editor

-- مصدر العملية: console (يدوي) | customer (طلب زبون من التطبيق) | owner (طلب من حساب المالك)
alter table bdl_ops add column if not exists source text not null default 'console'
  check (source in ('console','customer','owner'));

-- مرجع الطلب الأصلي (payment_requests.ref) — أساس عدم التكرار عند الاستيراد التلقائي
alter table bdl_ops add column if not exists req_ref text;

-- قفل صلب: طلب واحد = عملية واحدة (لكل مالك)
create unique index if not exists ux_ops_req on bdl_ops(owner_id, req_ref)
  where req_ref is not null;

-- إعادة بناء الـ view بنفس تعريف bdl-ops5 حرفيًا (o.* يشمل العمودين الجديدين تلقائيًا)
drop view if exists bdl_ops_coverage;
create view bdl_ops_coverage as
select o.*,
       coalesce(sum(r.amount_aoa) filter (where r.side='in'),0) as covered_aoa,
       count(r.id)               filter (where r.side='in')     as rcpt_count
from bdl_ops o
left join bdl_op_receipts r on r.op_id = o.id
group by o.id;
alter view bdl_ops_coverage set (security_invoker = on);
