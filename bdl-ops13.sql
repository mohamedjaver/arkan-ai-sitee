-- bdl-ops13.sql — مركز المطابقة (Build 1151) — اختياري لكن موصى به. آمن للتكرار.
-- ١) حاوية تخزين لملفات الإيصالات المرفوعة من مركز المطابقة (عامة للقراءة، الكتابة للمسجّلين)
insert into storage.buckets (id, name, public) values ('receipts','receipts', true) on conflict (id) do nothing;
drop policy if exists "receipts_read"  on storage.objects;
drop policy if exists "receipts_write" on storage.objects;
create policy "receipts_read"  on storage.objects for select using (bucket_id = 'receipts');
create policy "receipts_write" on storage.objects for insert to authenticated with check (bucket_id = 'receipts');
create policy "receipts_update" on storage.objects for update to authenticated using (bucket_id = 'receipts');
-- ٢) فهارس تسريع استعلامات مركز المطابقة
create index if not exists ix_rc_owner_created on bdl_receipts(owner_id, created_at desc);
create index if not exists ix_rc_ocr_source on bdl_receipts((ocr->>'source'));
create index if not exists ix_opr_created on bdl_op_receipts(owner_id, created_at desc);
