-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — نظام الروابط المباشرة (Migration 004)
-- كل عميل له كود وصول فريد: chat-v2.html?c=CODE
-- يفتح محادثته مباشرة بلا تسجيل ولا PIN
-- نفّذه في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) عمود كود الوصول الفريد لكل عميل
alter table chat_users add column if not exists access_code text unique;

-- توليد كود للمستخدمين الحاليين الذين لا كود لهم
update chat_users
set access_code = upper(substr(encode(gen_random_bytes(6),'hex'),1,8))
where access_code is null and role = 'customer';

-- 2) دالة: إنشاء/فتح محادثة عميل من كود الوصول (تُستدعى من الخادم بدور service)
--    آمنة: security definer، تتحقق من الكود فقط
create or replace function public.resolve_chat_link(p_code text)
returns table (customer_id uuid, conversation_id uuid, customer_name text, customer_phone text)
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_owner uuid;
  v_conv uuid;
  v_name text;
  v_phone text;
begin
  -- ابحث عن العميل بالكود
  select id, full_name, phone into v_customer, v_name, v_phone
  from chat_users where access_code = upper(p_code) and role = 'customer';
  if v_customer is null then return; end if;

  -- المالك
  select id into v_owner from chat_users where role = 'owner' order by created_at limit 1;
  if v_owner is null then return; end if;

  -- المحادثة (أنشئها إن لم توجد)
  select id into v_conv from conversations_v2 where customer_id = v_customer;
  if v_conv is null then
    insert into conversations_v2(customer_id, owner_id)
    values (v_customer, v_owner)
    on conflict (customer_id) do nothing;
    select id into v_conv from conversations_v2 where customer_id = v_customer;
    insert into messages_v2(conversation_id, sender_id, type, text, delivery_status)
    values (v_conv, v_owner, 'system',
      'مرحبًا بك في ARKAN. أرسل المبلغ والعملة المطلوبة وسنخبرك بالسعر والبديلة المتوفرة.', 'sent');
    update conversations_v2 set last_message_at = now(),
      last_preview = 'رسالة ترحيب', unread_customer = 1 where id = v_conv;
  end if;

  return query select v_customer, v_conv, v_name, v_phone;
end $$;

grant execute on function public.resolve_chat_link to authenticated, anon, service_role;

-- 3) دالة مساعدة: احصل على كود عميل (لإنشاء الرابط) — للمالك فقط عبر الخادم
create or replace function public.get_customer_code(p_phone text)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_id uuid;
begin
  select id, access_code into v_id, v_code from chat_users
  where phone = p_phone and role = 'customer';
  if v_id is null then return null; end if;
  if v_code is null then
    v_code := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
    update chat_users set access_code = v_code where id = v_id;
  end if;
  return v_code;
end $$;

grant execute on function public.get_customer_code to authenticated, anon, service_role;

-- تحقّق: اعرض الأكواد
select phone, full_name, access_code, role from chat_users order by created_at;
