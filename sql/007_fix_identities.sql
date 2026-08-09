-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — Migration 007 (توحيد الهويات — نهائي)
-- بلا أي اعتماد على uuid-ossp: المعرفات محسوبة مسبقًا (uuidv5 مطابق للخادم)
-- OWNER 22236295050  → 5a936770-12b0-57bf-9e06-acf497f83d8c
-- ZIDAN 244946762418 → 625836ce-79d9-56a9-9796-51dd1eb4a5f5
-- نفّذه كاملًا مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

begin;

-- 1) صف المالك — إدراج مباشر بالمعرّف الصحيح
insert into chat_users(id, full_name, phone, role, created_at)
values ('5a936770-12b0-57bf-9e06-acf497f83d8c','ARKAN','22236295050','owner',now())
on conflict (id) do update set role='owner', phone='22236295050';

-- أي صف مالك قديم بمعرّف مختلف: خفّضه لتجنب ازدواج اللوحة
update chat_users set role='customer'
 where role='owner' and id <> '5a936770-12b0-57bf-9e06-acf497f83d8c';

-- 2) توحيد هوية ZIDAN: من المعرّف العشوائي القديم إلى معرّف الهاتف
do $$
declare v_old uuid; v_new uuid := '625836ce-79d9-56a9-9796-51dd1eb4a5f5';
begin
  select id into v_old from chat_users
   where phone in ('244946762418','00244946762418','946762418')
     and id <> v_new
   limit 1;

  -- أنشئ الصف الجديد الموحّد
  insert into chat_users(id, full_name, phone, role, created_at)
  values (v_new,'ZIDAN','244946762418','customer',now())
  on conflict (id) do update set phone='244946762418';

  if v_old is not null then
    -- انقل كل الآثار إلى المعرّف الجديد ثم احذف القديم
    update messages_v2        set sender_id   = v_new where sender_id   = v_old;
    update conversations_v2   set customer_id = v_new where customer_id = v_old;
    begin
      update exchange_requests_v2 set customer_id = v_new where customer_id = v_old;
    exception when undefined_table or undefined_column then null; end;
    delete from chat_users where id = v_old;
    raise notice 'ZIDAN migrated: % -> %', v_old, v_new;
  end if;
end $$;

-- 3) إصلاح أي محادثات معلقة على مالك خاطئ + منع التكرار
update conversations_v2
   set owner_id = '5a936770-12b0-57bf-9e06-acf497f83d8c'
 where owner_id <> '5a936770-12b0-57bf-9e06-acf497f83d8c';

-- لو نتج تكرار محادثات لنفس العميل بعد التوحيد: أبقِ الأقدم وأرشف البقية
do $$
declare r record;
begin
  for r in (
    select customer_id, (array_agg(id order by created_at))[1] keep_id,
           array_agg(id order by created_at) all_ids
      from conversations_v2 group by customer_id having count(*)>1)
  loop
    update messages_v2 set conversation_id = r.keep_id
     where conversation_id = any(r.all_ids) and conversation_id <> r.keep_id;
    delete from conversations_v2 where id = any(r.all_ids) and id <> r.keep_id;
    raise notice 'merged duplicate convs for %', r.customer_id;
  end loop;
end $$;

commit;

-- ── تحقق نهائي: يجب صف owner واحد + Zidan بالمعرّف الجديد + محادثة واحدة ──
select 'owner' k, id::text, phone from chat_users where role='owner'
union all
select 'zidan', id::text, phone from chat_users where phone='244946762418'
union all
select 'convs', count(*)::text, '' from conversations_v2;
