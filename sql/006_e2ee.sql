-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — Migration 006 (E2EE v2)
-- مفاتيح عامة + مفاتيح محادثة مغلفة + encryption_version + idempotency
-- نفّذه بعد 005 في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) المفتاح العام لكل مستخدم (ECDH P-256، JWK) + نسخة احتياطية مغلفة للمفتاح الخاص
alter table chat_users add column if not exists public_key jsonb;
alter table chat_users add column if not exists key_version int default 0;
alter table chat_users add column if not exists enc_priv_backup jsonb; -- {ct,iv,salt,iter,v} مغلف بـ PBKDF2(عبارة الاسترداد) — السيرفر لا يفكه

-- المستخدم يحدّث مفاتيحه هو فقط (cu_update موجودة: id = auth.uid())

-- 2) مفاتيح المحادثة المغلفة لكل طرف — السيرفر يرى المغلفات فقط
alter table conversations_v2 add column if not exists wrapped_keys jsonb default '{}'::jsonb;
--   شكلها: { "<customer_uuid>": {ct,iv,epk}, "<owner_uuid>": {ct,iv,epk} }
alter table conversations_v2 add column if not exists enc_v int default 1; -- 1=مفتاح خادمي قديم، 2=E2EE

-- العميل عضو المحادثة يحتاج كتابة wrapped_keys عند أول توليد:
drop policy if exists cv_update_keys on public.conversations_v2;
create policy cv_update_keys on public.conversations_v2 for update
  using (customer_id = auth.uid() or public.is_staff())
  with check (customer_id = auth.uid() or public.is_staff());

-- 3) الرسائل: إصدار تشفير + منع التكرار (Idempotency / Replay)
alter table messages_v2 add column if not exists encryption_version int default 1;
alter table messages_v2 add column if not exists client_msg_id text;
create unique index if not exists uq_msg_client_id
  on messages_v2(conversation_id, client_msg_id) where client_msg_id is not null;

-- مرفقات مشفرة: مفتاح الملف مغلفًا بمفتاح المحادثة داخل الرسالة
alter table messages_v2 add column if not exists enc_file_key jsonb; -- {ct,iv} AES-GCM wrap by ConvKey
alter table messages_v2 add column if not exists enc_file_iv text;   -- iv تشفير جسم الملف

-- 4) إخفاء اسم الملف الأصلي من المعاينة (تسريب metadata V5)
create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prev text; v_customer uuid;
begin
  v_prev := case new.type
    when 'text' then 'رسالة'
    when 'audio' then '🎤 رسالة صوتية'
    when 'image' then '📷 صورة'
    when 'pdf' then '📄 مستند'
    when 'receipt' then '🧾 إيصال بنكي'
    when 'document' then '📎 مستند'
    when 'exchange_request' then '💱 طلب بديلة'
    when 'rate_quote' then '💰 عرض سعر'
    when 'status_update' then '🔄 تحديث حالة'
    else 'رسالة' end;

  select customer_id into v_customer from conversations_v2 where id = new.conversation_id;

  update conversations_v2 set
    last_message_id = new.id,
    last_message_at = new.created_at,
    last_preview    = v_prev,
    status          = 'active',
    unread_customer = unread_customer + (case when new.sender_id <> v_customer then 1 else 0 end),
    unread_owner    = unread_owner    + (case when new.sender_id  = v_customer then 1 else 0 end)
  where id = new.conversation_id;
  return new;
end $$;

-- 5) Storage: قراءة/كتابة chat-media بعضوية المحادثة (المسار يبدأ بـ conv_id/)
--    (لا تعتمد على signed URL وحده — بند 11)
drop policy if exists cm_read on storage.objects;
create policy cm_read on storage.objects for select
  using (bucket_id = 'chat-media'
         and public.is_conv_member( (split_part(name,'/',1))::uuid ));
drop policy if exists cm_write on storage.objects;
create policy cm_write on storage.objects for insert
  with check (bucket_id = 'chat-media'
         and public.is_conv_member( (split_part(name,'/',1))::uuid ));

-- 6) كتم secret القديم عن النتائج الجديدة تدريجيًا (يبقى للرسائل v1 حتى اكتمال الترحيل)
comment on column conversations_v2.secret is 'LEGACY v1 only — لا يُستخدم للرسائل enc_v>=2؛ يُحذف بعد اكتمال الترحيل';

-- ── تحقق نهائي ──
select 'chat_users' t, count(*) filter (where public_key is not null) with_keys from chat_users
union all
select 'conversations enc_v=2', count(*) from conversations_v2 where enc_v = 2;
