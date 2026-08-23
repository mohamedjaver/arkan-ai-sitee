-- ═══ bdl-fix-custcode.sql — إصلاح توليد كود الزبون ═══
-- العلة: count(*)+1 يصطدم بكود موجود بعد أي حذف زبون → 409 دائم لكل زبون جديد.
-- الإصلاح: أعلى رقم موجود + 1 — لا يصطدم أبدًا.
-- الصقه مرة واحدة في Supabase ← SQL Editor

create or replace function bdl_cust_before() returns trigger language plpgsql as $$
declare n int;
begin
  if new.code is null or new.code = '' then
    select coalesce(max(nullif(regexp_replace(code, '\D', '', 'g'), '')::int), 0) + 1
      into n
      from bdl_customers
      where owner_id = new.owner_id and code ~ '^C-\d+$';
    new.code := 'C-' || lpad(n::text, 4, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;
