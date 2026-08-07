-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — Migration 001
-- محادثات دائمة مرتبطة بالحساب + RLS كامل + طلبات البديلة
-- شغّله في Supabase SQL Editor (مشروع vyxzlazwpbstigcqvizb)
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ── 1) المستخدمون ──────────────────────────────────────────────
-- id = uuid_v5(namespace, phone) — يولّده خادم OTP، ثابت للهاتف نفسه
create table if not exists public.chat_users (
  id                 uuid primary key,
  full_name          text not null default '',
  phone              text unique not null,
  email              text,
  avatar_url         text,
  country            text,
  preferred_language text default 'ar',
  role               text not null default 'customer' check (role in ('customer','owner','staff')),
  created_at         timestamptz not null default now(),
  last_seen_at       timestamptz
);

-- ── 2) المحادثات — محادثة واحدة دائمة لكل عميل ─────────────────
create table if not exists public.conversations_v2 (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid not null references public.chat_users(id),
  owner_id         uuid not null references public.chat_users(id),
  secret           text not null default encode(gen_random_bytes(24),'hex'), -- مفتاح تشفير AES مشتق منه
  status           text not null default 'active' check (status in ('active','archived')),
  pinned           boolean not null default false,
  last_message_id  uuid,
  last_message_at  timestamptz,
  last_preview     text,           -- معاينة مقصوصة (نوع + نص قصير)
  unread_customer  int not null default 0,
  unread_owner     int not null default 0,
  created_at       timestamptz not null default now(),
  constraint one_conv_per_customer unique (customer_id)   -- يمنع تكرار المحادثات نهائيًا
);

-- ── 3) الرسائل ─────────────────────────────────────────────────
create table if not exists public.messages_v2 (
  id                  uuid primary key default uuid_generate_v4(),
  conversation_id     uuid not null references public.conversations_v2(id) on delete cascade,
  sender_id           uuid not null references public.chat_users(id),
  type                text not null check (type in
    ('text','audio','image','pdf','receipt','document','system','rate_quote','exchange_request','status_update')),
  text                text,
  media_path          text,          -- مسار داخل bucket خاص (ليس URL عام)
  mime_type           text,
  file_name           text,
  file_size           bigint,
  audio_duration      real,
  waveform_data       jsonb,         -- مصفوفة مستويات الصوت [0..1]
  reply_to_message_id uuid references public.messages_v2(id),
  meta                jsonb,         -- بيانات البطاقات (طلب بديلة، عرض سعر...)
  delivery_status     text not null default 'sent' check (delivery_status in ('sent','delivered','read','failed')),
  created_at          timestamptz not null default now(),
  delivered_at        timestamptz,
  read_at             timestamptz
);
create index if not exists idx_msg_conv_time on public.messages_v2(conversation_id, created_at);
create index if not exists idx_msg_unread on public.messages_v2(conversation_id, delivery_status);

-- ── 4) طلبات البديلة ───────────────────────────────────────────
create table if not exists public.exchange_requests_v2 (
  id               uuid primary key default uuid_generate_v4(),
  request_no       text unique not null default ('AR-' || upper(substr(md5(random()::text),1,6))),
  conversation_id  uuid not null references public.conversations_v2(id),
  customer_id      uuid not null references public.chat_users(id),
  pay_amount       numeric not null,
  pay_currency     text not null,
  receive_currency text not null,
  country          text,
  receiving_method text,
  bank_name        text,
  beneficiary_name text,
  note             text,
  quoted_rate      numeric,
  fee              numeric,
  final_amount     numeric,
  status           text not null default 'awaiting_quote' check (status in
    ('awaiting_quote','quoted','accepted','awaiting_payment','receipt_received',
     'verifying','processing','completed','cancelled','rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_xreq_conv on public.exchange_requests_v2(conversation_id);

-- ── 5) دوال مساعدة ─────────────────────────────────────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from chat_users where id = auth.uid() and role in ('owner','staff'));
$$;

create or replace function public.is_conv_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from conversations_v2 c
    where c.id = cid and (c.customer_id = auth.uid() or public.is_staff())
  );
$$;

-- ── 6) إنشاء/استرجاع المحادثة الدائمة تلقائيًا ─────────────────
-- تُستدعى بعد كل تسجيل دخول ناجح. Idempotent بفضل unique(customer_id).
create or replace function public.ensure_my_conversation(
  p_name text default null, p_phone text default null,
  p_country text default null, p_lang text default 'ar'
) returns table (conversation_id uuid, conv_secret text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_conv conversations_v2;
  v_new boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- إنشاء/تحديث ملف المستخدم
  insert into chat_users(id, full_name, phone, country, preferred_language, last_seen_at)
  values (v_uid, coalesce(p_name,''), coalesce(p_phone, v_uid::text), p_country, p_lang, now())
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name,''), chat_users.full_name),
    country   = coalesce(excluded.country, chat_users.country),
    last_seen_at = now();

  select id into v_owner from chat_users where role = 'owner' order by created_at limit 1;
  if v_owner is null then raise exception 'no owner account configured'; end if;

  select * into v_conv from conversations_v2 where customer_id = v_uid;
  if v_conv.id is null then
    insert into conversations_v2(customer_id, owner_id)
    values (v_uid, v_owner)
    on conflict (customer_id) do nothing;
    select * into v_conv from conversations_v2 where customer_id = v_uid;
    if v_conv.last_message_id is null then
      v_new := true;
      insert into messages_v2(conversation_id, sender_id, type, text, delivery_status)
      values (v_conv.id, v_owner, 'system',
        'مرحبًا بك في ARKAN. يمكنك إرسال المبلغ والعملة المطلوبة، وسنخبرك بالسعر والبديلة المتوفرة.', 'sent');
      update conversations_v2 set
        last_message_at = now(), last_preview = 'رسالة ترحيب',
        unread_customer = 1
      where id = v_conv.id;
    end if;
  end if;

  return query select v_conv.id, v_conv.secret, v_new;
end $$;

-- ── 7) Trigger: تحديث آخر رسالة وعدّادات غير المقروء ──────────
create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prev text; v_customer uuid;
begin
  v_prev := case new.type
    when 'text' then left(coalesce(new.text,''),80)
    when 'audio' then '🎤 رسالة صوتية · ' || coalesce(to_char(new.audio_duration,'FM999')||' ث','')
    when 'image' then '📷 صورة'
    when 'pdf' then '📄 ' || left(coalesce(new.file_name,'PDF'),28)
    when 'receipt' then '🧾 إيصال بنكي'
    when 'document' then '📎 ' || left(coalesce(new.file_name,'مستند'),28)
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
drop trigger if exists trg_msg_insert on public.messages_v2;
create trigger trg_msg_insert after insert on public.messages_v2
  for each row execute function public.on_message_insert();

-- ── 8) تصفير غير المقروء عند القراءة ──────────────────────────
create or replace function public.mark_conversation_read(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_customer uuid;
begin
  if not public.is_conv_member(cid) then raise exception 'forbidden'; end if;
  select customer_id into v_customer from conversations_v2 where id = cid;
  if auth.uid() = v_customer then
    update conversations_v2 set unread_customer = 0 where id = cid;
    update messages_v2 set delivery_status='read', read_at=now()
      where conversation_id=cid and sender_id <> v_customer and delivery_status <> 'read';
  else
    update conversations_v2 set unread_owner = 0 where id = cid;
    update messages_v2 set delivery_status='read', read_at=now()
      where conversation_id=cid and sender_id = v_customer and delivery_status <> 'read';
  end if;
end $$;

-- ── 9) تحديث حالة طلب البديلة (يرسل رسالة حالة تلقائيًا) ──────
create or replace function public.on_xreq_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into messages_v2(conversation_id, sender_id, type, text, meta)
    values (new.conversation_id, auth.uid(), 'status_update',
      null, jsonb_build_object('request_id', new.id, 'request_no', new.request_no,
            'status', new.status, 'quoted_rate', new.quoted_rate,
            'fee', new.fee, 'final_amount', new.final_amount));
  end if;
  return new;
end $$;
drop trigger if exists trg_xreq_update on public.exchange_requests_v2;
create trigger trg_xreq_update before update on public.exchange_requests_v2
  for each row execute function public.on_xreq_update();

-- ── 10) RLS ────────────────────────────────────────────────────
alter table public.chat_users          enable row level security;
alter table public.conversations_v2    enable row level security;
alter table public.messages_v2         enable row level security;
alter table public.exchange_requests_v2 enable row level security;

-- chat_users: أرى نفسي؛ الطاقم يرى الجميع؛ أعدّل ملفي فقط (بدون تغيير الدور)
drop policy if exists cu_select on public.chat_users;
create policy cu_select on public.chat_users for select
  using (id = auth.uid() or public.is_staff()
         or exists(select 1 from conversations_v2 c
                   where (c.customer_id=auth.uid()) and (chat_users.id=c.owner_id)));
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from chat_users where id = auth.uid();
$$;
drop policy if exists cu_update on public.chat_users;
create policy cu_update on public.chat_users for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());  -- يمنع رفع الصلاحيات ذاتيًا

-- conversations: العميل يرى محادثته فقط؛ الطاقم يرى الكل
drop policy if exists cv_select on public.conversations_v2;
create policy cv_select on public.conversations_v2 for select
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists cv_update on public.conversations_v2;
create policy cv_update on public.conversations_v2 for update
  using (public.is_staff());   -- التثبيت/الأرشفة للمالك؛ العميل عبر RPC فقط

-- messages: الأعضاء فقط؛ sender_id يُفرض من الخادم = auth.uid()
drop policy if exists mg_select on public.messages_v2;
create policy mg_select on public.messages_v2 for select
  using (public.is_conv_member(conversation_id));
drop policy if exists mg_insert on public.messages_v2;
create policy mg_insert on public.messages_v2 for insert
  with check (public.is_conv_member(conversation_id) and sender_id = auth.uid());
drop policy if exists mg_update on public.messages_v2;
create policy mg_update on public.messages_v2 for update
  using (sender_id = auth.uid() or public.is_staff());
drop policy if exists mg_delete on public.messages_v2;
create policy mg_delete on public.messages_v2 for delete
  using (sender_id = auth.uid() or public.is_staff());

-- exchange_requests: العميل ينشئ لطلبه فقط؛ التسعير للطاقم؛ القبول عبر RPC
drop policy if exists xr_select on public.exchange_requests_v2;
create policy xr_select on public.exchange_requests_v2 for select
  using (customer_id = auth.uid() or public.is_staff());
drop policy if exists xr_insert on public.exchange_requests_v2;
create policy xr_insert on public.exchange_requests_v2 for insert
  with check (customer_id = auth.uid() and public.is_conv_member(conversation_id));
drop policy if exists xr_update_staff on public.exchange_requests_v2;
create policy xr_update_staff on public.exchange_requests_v2 for update
  using (public.is_staff());

-- قبول/رفض العرض من العميل (بدون منح update عام)
create or replace function public.respond_to_quote(rid uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update exchange_requests_v2
     set status = case when accept then 'accepted' else 'rejected' end
   where id = rid and customer_id = auth.uid() and status = 'quoted';
  if not found then raise exception 'not allowed'; end if;
end $$;

-- ── 11) التخزين: bucket خاص للوسائط + عام للصور الشخصية ───────
insert into storage.buckets (id, name, public) values ('chat-media','chat-media', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;

-- chat-media: المسار = {conversation_id}/{filename} — الأعضاء فقط
drop policy if exists cm_read on storage.objects;
create policy cm_read on storage.objects for select
  using (bucket_id='chat-media' and public.is_conv_member((split_part(name,'/',1))::uuid));
drop policy if exists cm_write on storage.objects;
create policy cm_write on storage.objects for insert
  with check (bucket_id='chat-media' and public.is_conv_member((split_part(name,'/',1))::uuid)
              and length(name) < 300 and name !~ '\.\.' );

-- avatars: المسار = {user_id}/avatar.jpg — صاحبها فقط يكتب، القراءة عامة
drop policy if exists av_read on storage.objects;
create policy av_read on storage.objects for select using (bucket_id='avatars');
drop policy if exists av_write on storage.objects;
create policy av_write on storage.objects for insert
  with check (bucket_id='avatars' and (split_part(name,'/',1))::uuid = auth.uid());
drop policy if exists av_upd on storage.objects;
create policy av_upd on storage.objects for update
  using (bucket_id='avatars' and (split_part(name,'/',1))::uuid = auth.uid());
drop policy if exists av_del on storage.objects;
create policy av_del on storage.objects for delete
  using (bucket_id='avatars' and (split_part(name,'/',1))::uuid = auth.uid());

-- ── 12) Realtime ───────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.messages_v2;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations_v2;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.exchange_requests_v2;
exception when duplicate_object then null; end $$;

-- ── 13) حساب المالك (نفّذ مرة واحدة — عدّل الهاتف إن لزم) ─────
-- UUID المالك يجب أن يطابق ما يولّده خادم OTP لهاتف المالك:
-- uuidv5(NAMESPACE_ARKAN, '22236295050')  → انظر server-otp-patch.js
-- بعد أول تسجيل دخول للمالك، نفّذ:
--   update chat_users set role='owner' where phone='22236295050';
