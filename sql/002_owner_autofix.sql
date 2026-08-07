-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — Migration 002
-- إصلاح جذري: ترقية المالك تلقائيًا من توكن الخادم (arkan_role)
-- + المالك/الطاقم لا يحتاجون محادثة ذاتية — تعود null
-- نفّذه مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

create or replace function public.ensure_my_conversation(
  p_name text default null, p_phone text default null,
  p_country text default null, p_lang text default 'ar'
) returns table (conversation_id uuid, conv_secret text, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_claim_role text := coalesce(auth.jwt() ->> 'arkan_role','customer');
  v_claim_phone text := auth.jwt() ->> 'phone';
  v_owner uuid;
  v_conv conversations_v2;
  v_new boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- إنشاء/تحديث ملف المستخدم (الهاتف من التوكن الموقّع — لا يُزوَّر)
  insert into chat_users(id, full_name, phone, country, preferred_language, role, last_seen_at)
  values (v_uid, coalesce(p_name,''), coalesce(v_claim_phone, p_phone, v_uid::text),
          p_country, p_lang,
          case when v_claim_role in ('owner','staff') then v_claim_role else 'customer' end,
          now())
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name,''), chat_users.full_name),
    country   = coalesce(excluded.country, chat_users.country),
    role      = case when v_claim_role in ('owner','staff') then v_claim_role else chat_users.role end,
    last_seen_at = now();

  -- المالك/الطاقم: لا محادثة ذاتية
  if v_claim_role in ('owner','staff') then
    return query select null::uuid, null::text, false;
    return;
  end if;

  select id into v_owner from chat_users where role = 'owner' order by created_at limit 1;
  if v_owner is null then
    -- لا مالك بعد: سجّل العميل دون محادثة (تُنشأ عند أول فتح بعد تفعيل المالك)
    return query select null::uuid, null::text, false;
    return;
  end if;

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
        last_message_at = now(), last_preview = 'رسالة ترحيب', unread_customer = 1
      where id = v_conv.id;
    end if;
  end if;

  return query select v_conv.id, v_conv.secret, v_new;
end $$;
