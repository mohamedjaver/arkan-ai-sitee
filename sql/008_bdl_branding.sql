-- BDL — Migration 008: العلامة BDL بدل ARKAN في رسائل الترحيب (Build 1351)
-- شغّله مرة في Supabase SQL Editor.
update public.chat_users set full_name='BDL' where role='owner' and full_name in ('ARKAN','Arkan');
update public.messages_v2 set text=replace(text,'ARKAN','BDL') where type='system' and text like '%ARKAN%';
-- رسالة الترحيب الافتراضية في دوال إنشاء المحادثة:
do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and pg_get_functiondef(p.oid) like '%ARKAN%' loop
    execute replace(r.def,'ARKAN','BDL');
  end loop; end $$;
