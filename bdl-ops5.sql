-- ═══════════════════════════════════════════════════════════════════════
-- BDL OPS 2.0 — نظام الممرات متعدد الأطراف مع مطابقة إيصالات الموردين
--   • حارات العمليات: ثنائية / ثلاثية / رباعية (legs + structure)
--   • كل إيصال له جهة: وارد من الزبون (in) أو صادر للمورد (out)
--   • إيصال المورد يغطي إيصال زبون بعينه (match_txn) — والمطابقة شرط الإقفال
-- الصقه في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════

alter table bdl_ops add column if not exists legs int not null default 2
  check (legs between 2 and 4);
alter table bdl_ops add column if not exists structure text not null default 'MRU→AOA';

alter table bdl_op_receipts add column if not exists side text not null default 'in'
  check (side in ('in','out'));
alter table bdl_op_receipts add column if not exists match_txn text;

-- القفل الصلب الجديد: التفرد لكل جهة (نفس رقم زبون يظهر مرة واردًا ومرة صادرًا مطابِقًا)
drop index if exists ux_opr_txn;
create unique index if not exists ux_opr_txn_side
  on bdl_op_receipts(owner_id, txn_id, side);
create index if not exists ix_opr_side on bdl_op_receipts(op_id, side);

-- التغطية = الوارد من الزبائن فقط (إسقاط ثم إنشاء — ترتيب الأعمدة تغيّر)
drop view if exists bdl_ops_coverage;
create view bdl_ops_coverage as
select o.*,
       coalesce(sum(r.amount_aoa) filter (where r.side='in'),0) as covered_aoa,
       count(r.id)               filter (where r.side='in')     as rcpt_count
from bdl_ops o
left join bdl_op_receipts r on r.op_id = o.id
group by o.id;
alter view bdl_ops_coverage set (security_invoker = on);

-- ميزان المطابقة: كل وارد يجب أن يقابله صادر يحمل رقمه
drop view if exists bdl_ops_recon;
create view bdl_ops_recon as
select o.id as op_id,
       count(*) filter (where r.side='in')  as in_n,
       count(*) filter (where r.side='out') as out_n,
       count(*) filter (where r.side='in' and exists (
         select 1 from bdl_op_receipts x
          where x.op_id=o.id and x.side='out' and x.match_txn=r.txn_id)) as matched
from bdl_ops o
left join bdl_op_receipts r on r.op_id=o.id
group by o.id;
alter view bdl_ops_recon set (security_invoker = on);
