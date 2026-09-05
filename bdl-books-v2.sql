-- ─────────────────────────────────────────────────────────────
-- bdl-books-v2.sql — Build 1209 «دفاتري v2» (كامل خدمات CashBook)
-- يُنفَّذ بعد bdl-books.sql (أو بدلًا منه — آمن للتكرار ويشمله).
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- 0) الأساس (من ops8 + 1208) إن لم يكن موجودًا
create table if not exists bdl_books(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null, cust_id uuid, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists bdl_book_entries(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  book_id uuid not null references bdl_books(id) on delete cascade,
  side text not null check (side in ('in','out')),
  amount numeric not null check (amount > 0),
  ccy text not null default 'AOA', note text,
  entry_date date not null default (now()::date), tx_id uuid,
  created_at timestamptz not null default now());
alter table bdl_books add column if not exists kind  text not null default 'customer';
alter table bdl_books add column if not exists phone text;
alter table bdl_book_entries add column if not exists ref text;
alter table bdl_book_entries add column if not exists receipt_url text;

-- 1) أعمدة 1209
alter table bdl_books add column if not exists currency text not null default 'AOA';     -- العملة الافتراضية للدفتر
alter table bdl_books add column if not exists settings jsonb not null default '{}'::jsonb;
alter table bdl_book_entries add column if not exists method   text;   -- cash / transfer / card / binance / wallet / other
alter table bdl_book_entries add column if not exists category text;
alter table bdl_book_entries add column if not exists party    text;   -- جهة الاتصال داخل القيد
alter table bdl_book_entries add column if not exists entry_time time;
alter table bdl_book_entries add column if not exists created_by_phone text default (auth.jwt()->>'phone');
alter table bdl_book_entries add column if not exists created_by_name  text;
alter table bdl_book_entries add column if not exists updated_at timestamptz not null default now();
create unique index if not exists ux_bke_ref  on bdl_book_entries(book_id, ref) where ref is not null;
create index if not exists ix_bke_book on bdl_book_entries(book_id, entry_date, created_at);
create index if not exists ix_bke_party on bdl_book_entries(book_id, party);

-- 2) الأعضاء (مشاركة الدفتر مع فريق) — التعريف بالهاتف لأن رمز الجلسة يحمل claim phone
create table if not exists bdl_book_members(
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references bdl_books(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  phone text not null,
  name text,
  role text not null default 'editor' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique(book_id, phone));
create index if not exists ix_bbm_phone on bdl_book_members(phone);

-- 3) نشاط الدفتر
create table if not exists bdl_book_activity(
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references bdl_books(id) on delete cascade,
  actor_phone text default (auth.jwt()->>'phone'),
  actor_name text,
  action text not null,           -- entry.add / entry.edit / entry.del / member.add / member.del / book.edit / entries.clear
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now());
create index if not exists ix_bba_book on bdl_book_activity(book_id, created_at desc);

-- 4) الملف الشخصي / النشاط التجاري
create table if not exists bdl_profiles(
  uid uuid primary key default auth.uid(),
  phone text, name text, email text,
  business_name text, business_type text, city text, country text,
  avatar_url text,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now());
alter table bdl_profiles enable row level security;
drop policy if exists p_prof_own on bdl_profiles;
create policy p_prof_own on bdl_profiles for all to authenticated using (uid=auth.uid()) with check (uid=auth.uid());
grant select, insert, update, delete on bdl_profiles to authenticated;

-- 5) دوال الصلاحية
create or replace function bdl_my_phone() returns text language sql stable as $$ select coalesce(auth.jwt()->>'phone','') $$;
create or replace function bdl_book_role(p_book uuid) returns text
language sql stable security definer set search_path=public as $$
  select case
    when exists(select 1 from bdl_books b where b.id=p_book and b.owner_id=auth.uid()) then 'owner'
    else (select m.role from bdl_book_members m where m.book_id=p_book and m.phone=bdl_my_phone() limit 1)
  end $$;
grant execute on function bdl_book_role(uuid) to authenticated;
create or replace function bdl_can_read(p_book uuid) returns boolean language sql stable security definer set search_path=public as
$$ select bdl_book_role(p_book) is not null $$;
create or replace function bdl_can_write(p_book uuid) returns boolean language sql stable security definer set search_path=public as
$$ select bdl_book_role(p_book) in ('owner','admin','editor') $$;
create or replace function bdl_can_admin(p_book uuid) returns boolean language sql stable security definer set search_path=public as
$$ select bdl_book_role(p_book) in ('owner','admin') $$;
grant execute on function bdl_can_read(uuid), bdl_can_write(uuid), bdl_can_admin(uuid) to authenticated;

-- 6) updated_at + لمس الدفتر
create or replace function bdl_book_touch() returns trigger language plpgsql security definer set search_path=public as $$
begin update bdl_books set updated_at=now() where id=coalesce(new.book_id, old.book_id); return coalesce(new, old); end $$;
drop trigger if exists tg_bke_touch on bdl_book_entries;
create trigger tg_bke_touch after insert or update or delete on bdl_book_entries for each row execute function bdl_book_touch();
create or replace function bdl_set_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists tg_bke_upd on bdl_book_entries;
create trigger tg_bke_upd before update on bdl_book_entries for each row execute function bdl_set_updated();

-- 7) الملخص (يشمل الدفاتر المشتركة عبر RLS + دور المستخدم)
drop view if exists bdl_books_summary;
create view bdl_books_summary as
select b.*,
  bdl_book_role(b.id) as my_role,
  (select coalesce(jsonb_object_agg(s.ccy, jsonb_build_object('tin',s.tin,'tout',s.tout,'net',s.tin-s.tout)),'{}'::jsonb)
     from (select e.ccy, coalesce(sum(e.amount) filter (where e.side='in'),0) tin, coalesce(sum(e.amount) filter (where e.side='out'),0) tout
             from bdl_book_entries e where e.book_id=b.id group by e.ccy) s) as bal,
  (select count(*) from bdl_book_entries e where e.book_id=b.id) as n_entries,
  (select count(*) from bdl_book_members m where m.book_id=b.id) as n_members,
  (select max(e.created_at) from bdl_book_entries e where e.book_id=b.id) as last_entry_at
from bdl_books b;
alter view bdl_books_summary set (security_invoker = on);
grant select on bdl_books_summary to authenticated;

-- 8) RLS: المالك + الأعضاء
alter table bdl_books enable row level security;
alter table bdl_book_entries enable row level security;
alter table bdl_book_members enable row level security;
alter table bdl_book_activity enable row level security;
drop policy if exists p_books_owner on bdl_books;
drop policy if exists p_books_sel on bdl_books; drop policy if exists p_books_ins on bdl_books;
drop policy if exists p_books_upd on bdl_books; drop policy if exists p_books_del on bdl_books;
create policy p_books_sel on bdl_books for select to authenticated using (owner_id=auth.uid() or bdl_can_read(id));
create policy p_books_ins on bdl_books for insert to authenticated with check (owner_id=auth.uid());
create policy p_books_upd on bdl_books for update to authenticated using (bdl_can_admin(id)) with check (bdl_can_admin(id));
create policy p_books_del on bdl_books for delete to authenticated using (owner_id=auth.uid());

drop policy if exists p_bke_owner on bdl_book_entries;
drop policy if exists p_bke_sel on bdl_book_entries; drop policy if exists p_bke_ins on bdl_book_entries;
drop policy if exists p_bke_upd on bdl_book_entries; drop policy if exists p_bke_del on bdl_book_entries;
create policy p_bke_sel on bdl_book_entries for select to authenticated using (bdl_can_read(book_id));
create policy p_bke_ins on bdl_book_entries for insert to authenticated with check (bdl_can_write(book_id));
create policy p_bke_upd on bdl_book_entries for update to authenticated using (bdl_can_write(book_id)) with check (bdl_can_write(book_id));
create policy p_bke_del on bdl_book_entries for delete to authenticated using (bdl_can_write(book_id));
-- owner_id للقيد يجب أن يبقى مالك الدفتر (لا المُدخِل) حتى تبقى الملكية ثابتة
create or replace function bdl_entry_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin select owner_id into new.owner_id from bdl_books where id=new.book_id; return new; end $$;
drop trigger if exists tg_bke_owner on bdl_book_entries;
create trigger tg_bke_owner before insert on bdl_book_entries for each row execute function bdl_entry_owner();

drop policy if exists p_bbm_sel on bdl_book_members; drop policy if exists p_bbm_mut on bdl_book_members;
create policy p_bbm_sel on bdl_book_members for select to authenticated using (bdl_can_read(book_id));
create policy p_bbm_mut on bdl_book_members for all to authenticated using (bdl_can_admin(book_id)) with check (bdl_can_admin(book_id));

drop policy if exists p_bba_sel on bdl_book_activity; drop policy if exists p_bba_ins on bdl_book_activity;
create policy p_bba_sel on bdl_book_activity for select to authenticated using (bdl_can_read(book_id));
create policy p_bba_ins on bdl_book_activity for insert to authenticated with check (bdl_can_read(book_id));

grant select, insert, update, delete on bdl_books, bdl_book_entries, bdl_book_members to authenticated;
grant select, insert on bdl_book_activity to authenticated;

-- 9) نسخ دفتر (1208) محدّث
create or replace function bdl_book_duplicate(p_book uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare nb uuid;
begin
  if not bdl_can_admin(p_book) then raise exception 'forbidden'; end if;
  insert into bdl_books(owner_id,name,cust_id,note,kind,phone,currency)
    select auth.uid(), name||' (نسخة)', cust_id, note, kind, phone, currency from bdl_books where id=p_book returning id into nb;
  insert into bdl_book_entries(owner_id,book_id,side,amount,ccy,note,entry_date,method,category,party)
    select auth.uid(), nb, side, amount, ccy, note, entry_date, method, category, party from bdl_book_entries where book_id=p_book;
  return nb;
end $$;
grant execute on function bdl_book_duplicate(uuid) to authenticated;

-- 10) تخزين الإيصالات والصور الشخصية
insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict (id) do nothing;
drop policy if exists p_books_rcpt_rw on storage.objects;
create policy p_books_rcpt_rw on storage.objects for all to authenticated
  using  (bucket_id='receipts' and (storage.foldername(name))[1] in ('books','avatars') and (storage.foldername(name))[2]=auth.uid()::text)
  with check (bucket_id='receipts' and (storage.foldername(name))[1] in ('books','avatars') and (storage.foldername(name))[2]=auth.uid()::text);
-- قراءة صور الإيصالات لأعضاء الدفتر تتم عبر روابط موقّعة طويلة الأمد يصدرها المُرفِق
