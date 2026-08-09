-- ═══════════════════════════════════════════════════════════════
-- ARKAN Chat v2 — Migration 005 (إصلاحات أمنية)
-- يمنع استدعاء الدوال الحساسة مباشرة بالمفتاح العام (anon)
-- كانت api_ensure_customer / get_customer_code قابلة للاستدعاء
-- من المتصفح متجاوزةً خادم Railway بالكامل.
-- نفّذه مرة واحدة في Supabase SQL Editor بعد 003.
-- ═══════════════════════════════════════════════════════════════

-- 1) اسحب صلاحية التنفيذ من anon (وauthenticated) لكل التواقيع الموجودة
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('api_ensure_customer','get_customer_code')
  loop
    execute format('revoke execute on function %s from anon', r.fn);
    execute format('revoke execute on function %s from authenticated', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
    raise notice 'Locked: %', r.fn;
  end loop;
end $$;

-- 2) سدّ المنفذ الافتراضي: أي دالة جديدة في public لا تُمنح لـ anon تلقائيًا
alter default privileges in schema public revoke execute on functions from anon;

-- 3) resolve_chat_link تبقى لـ anon (روابط ?c=CODE تعمل من المتصفح)
--    لكن نتأكد أنها security definer فقط ولا تُرجع بيانات زائدة — لا تغيير هنا.

-- ═══════════════════════════════════════════════════════════════
-- تحقُّق نهائي: يجب أن يظهر can_exec = false لدور anon على الدالتين
-- ═══════════════════════════════════════════════════════════════
select
  p.proname as fn,
  pg_get_function_identity_arguments(p.oid) as args,
  has_function_privilege('anon', p.oid, 'execute') as can_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('api_ensure_customer','get_customer_code','resolve_chat_link')
order by 1;
