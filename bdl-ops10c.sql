-- ═══════════════════════════════════════════════════════════════════
-- bdl-ops10c.sql — منع التكرار نهائيًا على مستوى القاعدة (Build 1181)
-- الضمانة: أي إيصال بنفس البصمة، أو بنفس رقم العملية في نفس الجانب،
--          تُرفضه القاعدة نفسها (409) مهما كان مصدر الإدخال أو الجهاز.
-- التنظيف المسبق: التكرارات القائمة لا تُحذف (قد تكون مربوطة بعمليات)
--          بل يُصفَّر الحقل المتصادم في النسخة الأحدث فقط ويبقى الأقدم مرجعًا.
-- آمن للتكرار (idempotent). يُلصق مرة واحدة في Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- ── ١) البصمة: فريدة لكل مالك ─────────────────────────────────────
with d as (
  select id, row_number() over (partition by owner_id, fingerprint order by created_at, id) rn
  from bdl_receipts where fingerprint is not null
)
update bdl_receipts r set fingerprint = null
from d where d.id = r.id and d.rn > 1;

create unique index if not exists uq_bdl_rcpt_fp
  on bdl_receipts(owner_id, fingerprint)
  where fingerprint is not null;

-- ── ٢) رقم العملية: فريد لكل مالك داخل نفس الجانب (زبون/مورد) ─────
with d as (
  select id, row_number() over (
    partition by owner_id, coalesce(ocr->>'side','customer'), txn_ref
    order by created_at, id) rn
  from bdl_receipts where coalesce(txn_ref,'') <> ''
)
update bdl_receipts r set txn_ref = null
from d where d.id = r.id and d.rn > 1;

create unique index if not exists uq_bdl_rcpt_ref
  on bdl_receipts(owner_id, coalesce(ocr->>'side','customer'), txn_ref)
  where coalesce(txn_ref,'') <> '';

-- ── ٣) إيصالات العمليات: رقم العملية فريد ─────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='bdl_op_receipts' and column_name='txn_id') then
    with d as (
      select id, row_number() over (partition by txn_id order by created_at, id) rn
      from bdl_op_receipts where coalesce(txn_id,'') <> ''
    )
    update bdl_op_receipts r set txn_id = null
    from d where d.id = r.id and d.rn > 1;

    execute $ix$create unique index if not exists uq_bdl_oprc_ref
      on bdl_op_receipts(txn_id) where coalesce(txn_id,'') <> ''$ix$;
  end if;
end $$;
