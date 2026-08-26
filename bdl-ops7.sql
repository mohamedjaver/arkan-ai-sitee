-- ═══════════════════════════════════════════════════════════════
-- bdl-ops7.sql — منع تكرار الإيصالات ١٠٠٪ + المبالغ اليدوية + التسوية التلقائية
-- الصقه مرة واحدة في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ١) أعمدة البصمة والوسوم على إيصالات العمليات
alter table bdl_op_receipts add column if not exists fp        text;     -- بصمة دلالية: txn+مبلغ+تاريخ+حساب+مرسل
alter table bdl_op_receipts add column if not exists fp_img    text;     -- SHA-256 لبايتات ملف الوصل نفسه
alter table bdl_op_receipts add column if not exists rcpt_date text;     -- تاريخ الوصل كما قُرئ
alter table bdl_op_receipts add column if not exists account   text;     -- الحساب/IBAN كما قُرئ
alter table bdl_op_receipts add column if not exists manual    boolean not null default false; -- «بدون إيصال»

-- ٢) الأقفال الصلبة: نفس الوصل لا يدخل مرتين مهما تغيّر اسم الملف أو الصورة
create unique index if not exists ux_opr_fp    on bdl_op_receipts(owner_id, fp)     where fp     is not null;
create unique index if not exists ux_opr_fpimg on bdl_op_receipts(owner_id, fp_img) where fp_img is not null;

-- ٣) التسوية التلقائية: التغطية ≥ الهدف ← الحالة «مكتملة» فورًا (يشمل الرفع الجماعي)
create or replace function bdl_op_autosettle() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update bdl_ops o
     set status='covered', updated_at=now()
   where o.id = new.op_id
     and o.status = 'open'
     and o.target_aoa > 0
     and (select coalesce(sum(r.amount_aoa),0)
            from bdl_op_receipts r
           where r.op_id=o.id and r.side='in') >= o.target_aoa;
  return new;
end $$;
drop trigger if exists tg_opr_autosettle on bdl_op_receipts;
create trigger tg_opr_autosettle after insert on bdl_op_receipts
  for each row execute function bdl_op_autosettle();

-- ٤) إعادة بناء عرض التغطية (o.* يلتقط الأعمدة الجديدة تلقائيًا — نفس تعريف ops6)
drop view if exists bdl_ops_coverage;
create view bdl_ops_coverage as
select o.*,
       coalesce(sum(r.amount_aoa) filter (where r.side='in'),0)          as covered_aoa,
       count(r.id)               filter (where r.side='in')              as rcpt_count,
       count(r.id)               filter (where r.side='in' and r.manual) as manual_count
from bdl_ops o
left join bdl_op_receipts r on r.op_id = o.id
group by o.id;
alter view bdl_ops_coverage set (security_invoker = on);
