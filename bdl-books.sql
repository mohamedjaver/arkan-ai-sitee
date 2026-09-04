-- ─────────────────────────────────────────────────────────────
-- bdl-books.sql — Build 1208 «دفاتري» (دفتر نقد لكل مستخدم مسجّل)
-- يُنفَّذ مرة واحدة في Supabase → SQL Editor → Run. آمن للتكرار.
-- يشمل bdl-ops8.sql كاملًا (إن لم يكن قد نُفِّذ) ثم يضيف أعمدة 1208.
-- ─────────────────────────────────────────────────────────────

-- 1) الجداول الأساسية (من ops8)
create table if not exists bdl_books(
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  name       text not null,
  cust_id    uuid references bdl_customers(id) on delete set null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists bdl_book_entries(
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  book_id    uuid not null references bdl_books(id) on delete cascade,
  side       text not null check (side in ('in','out')),
  amount     numeric not null check (amount > 0),
  ccy        text not null default 'AOA',
  note       text,
  entry_date date not null default (now()::date),
  tx_id      uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists ux_bke_tx on bdl_book_entries(book_id, tx_id) where tx_id is not null;
create index  if not exists ix_bke_book on bdl_book_entries(book_id, entry_date, created_at);

-- 2) أعمدة 1208
alter table bdl_books        add column if not exists kind  text not null default 'customer' check (kind in ('customer','supplier','cash'));
alter table bdl_books        add column if not exists phone text;
alter table bdl_book_entries add column if not exists ref         text;   -- مرجع الإيصال البنكي
alter table bdl_book_entries add column if not exists receipt_url text;   -- رابط صورة الإيصال
-- لا يُقبل نفس مرجع الإيصال مرتين داخل الدفتر الواحد
create unique index if not exists ux_bke_ref on bdl_book_entries(book_id, ref) where ref is not null;
create index if not exists ix_books_owner on bdl_books(owner_id, updated_at desc);

-- 3) تحديث updated_at عند أي قيد
create or replace function bdl_book_touch() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update bdl_books set updated_at=now() where id=coalesce(new.book_id, old.book_id);
  return coalesce(new, old);
end $$;
drop trigger if exists tg_bke_touch on bdl_book_entries;
create trigger tg_bke_touch after insert or update or delete on bdl_book_entries
  for each row execute function bdl_book_touch();

-- 4) الملخص (يُعاد إنشاؤه ليشمل الأعمدة الجديدة)
drop view if exists bdl_books_summary;
create view bdl_books_summary as
select b.*,
  (select coalesce(jsonb_object_agg(s.ccy,
            jsonb_build_object('tin',s.tin,'tout',s.tout,'net',s.tin-s.tout)),'{}'::jsonb)
     from (select e.ccy,
                  coalesce(sum(e.amount) filter (where e.side='in'),0)  as tin,
                  coalesce(sum(e.amount) filter (where e.side='out'),0) as tout
             from bdl_book_entries e where e.book_id=b.id group by e.ccy) s) as bal,
  (select count(*)          from bdl_book_entries e where e.book_id=b.id) as n_entries,
  (select max(e.created_at) from bdl_book_entries e where e.book_id=b.id) as last_entry_at
from bdl_books b;
alter view bdl_books_summary set (security_invoker = on);

-- 5) نسخ دفتر
create or replace function bdl_book_duplicate(p_book uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare nb uuid;
begin
  insert into bdl_books(owner_id,name,cust_id,note,kind,phone)
    select owner_id, name||' (نسخة)', cust_id, note, kind, phone
      from bdl_books where id=p_book and owner_id=auth.uid()
    returning id into nb;
  if nb is null then raise exception 'book not found'; end if;
  insert into bdl_book_entries(owner_id,book_id,side,amount,ccy,note,entry_date)
    select owner_id, nb, side, amount, ccy, note, entry_date
      from bdl_book_entries where book_id=p_book;
  return nb;
end $$;
grant execute on function bdl_book_duplicate(uuid) to authenticated;

-- 6) العزل: كل مستخدم (مالك أو تاجر) يرى دفاتره فقط
alter table bdl_books        enable row level security;
alter table bdl_book_entries enable row level security;
drop policy if exists p_books_owner on bdl_books;
create policy p_books_owner on bdl_books
  for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists p_bke_owner on bdl_book_entries;
create policy p_bke_owner on bdl_book_entries
  for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
grant select, insert, update, delete on bdl_books, bdl_book_entries to authenticated;
grant select on bdl_books_summary to authenticated;

-- 7) تخزين صور الإيصالات: كل مستخدم يكتب/يقرأ مجلده books/<uid>/ فقط
insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict (id) do nothing;
drop policy if exists p_books_rcpt_rw on storage.objects;
create policy p_books_rcpt_rw on storage.objects for all to authenticated
  using  (bucket_id='receipts' and (storage.foldername(name))[1]='books' and (storage.foldername(name))[2]=auth.uid()::text)
  with check (bucket_id='receipts' and (storage.foldername(name))[1]='books' and (storage.foldername(name))[2]=auth.uid()::text);
