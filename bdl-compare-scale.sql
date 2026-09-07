-- سعة صفحة المقارنة لمئات آلاف الإيصالات: فهارس + سياسة التخزين
create index if not exists ix_cmp_owner_fp   on bdl_cmp_receipts(owner_id, fp);
create index if not exists ix_cmp_owner_date on bdl_cmp_receipts(owner_id, msg_at desc);
create index if not exists ix_cmp_owner_side on bdl_cmp_receipts(owner_id, side, msg_at desc);
create index if not exists ix_cmp_ref        on bdl_cmp_receipts(owner_id, ref) where ref is not null;
-- الأصول: bucket receipts — رفع الحد الأقصى لحجم الملف (50MB) والسماح بالـ PDF والصور
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'receipts';
-- تنبيه: سعة التخزين نفسها تحددها خطة Supabase (Free = 1GB، Pro = 100GB + 0.021$/GB) — مئات آلاف الإيصالات ≈ 30–80GB ⇒ خطة Pro.
