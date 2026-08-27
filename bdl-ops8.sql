-- ═══════════════════════════════════════════════════════════════
-- bdl-ops8.sql — دفاتر النقد (نمط CashBook): دفتر لكل طرف + رصيد جارٍ
-- الصقه مرة واحدة في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ١) الدفاتر
create table if not exists bdl_books(
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  name       text not null,
  cust_id    uuid references bdl_customers(id) on delete set null,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ٢) قيود الدفتر (قبض in / دفع out) — متعدد العملات
create table if not exists bdl_book_entries(
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  book_id    uuid not null references bdl_books(id) on delete cascade,
  side       text not null check (side in ('in','out')),
  amount     numeric not null check (amount > 0),
  ccy        text not null default 'AOA',
  note       text,
  entry_date date not null default (now()::date),
  tx_id      uuid,          -- قفل ضد الاستيراد المكرر مستقبلًا
  created_at timestamptz not null default now()
);
create unique index if not exists ux_bke_tx   on bdl_book_entries(book_id, tx_id) where tx_id is not null;
create index  if not exists ix_bke_book       on bdl_book_entries(book_id, entry_date, created_at);

-- ٣) أي قيد يلمس الدفتر يحدّث «آخر نشاط» (لترتيب القائمة مثل CashBook)
create or replace function bdl_book_touch() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update bdl_books set updated_at=now() where id=coalesce(new.book_id, old.book_id);
  return coalesce(new, old);
end $$;
drop trigger if exists tg_bke_touch on bdl_book_entries;
create trigger tg_bke_touch after insert or update or delete on bdl_book_entries
  for each row execute function bdl_book_touch();

-- ٤) ملخص الدفاتر: رصيد لكل عملة (in/out/net) + عدد القيود + آخر قيد
drop view if exists bdl_books_summary;
create view bdl_books_summary as
select b.*,
  (select coalesce(jsonb_object_agg(s.ccy,
            jsonb_build_object('tin',s.tin,'tout',s.tout,'net',s.tin-s.tout)),'{}'::jsonb)
     from (select e.ccy,
                  coalesce(sum(e.amount) filter (where e.side='in'),0)  as tin,
                  coalesce(sum(e.amount) filter (where e.side='out'),0) as tout
             from bdl_book_entries e where e.book_id=b.id group by e.ccy) s) as bal,
  (select count(*)        from bdl_book_entries e where e.book_id=b.id)      as n_entries,
  (select max(e.created_at) from bdl_book_entries e where e.book_id=b.id)    as last_entry_at
from bdl_books b;
alter view bdl_books_summary set (security_invoker = on);

-- ٥) تكرار دفتر بقيوده (زر «تكرار الدفتر»)
create or replace function bdl_book_duplicate(p_book uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare nb uuid;
begin
  insert into bdl_books(owner_id,name,cust_id,note)
    select owner_id, name||' (نسخة)', cust_id, note
      from bdl_books where id=p_book and owner_id=auth.uid()
    returning id into nb;
  if nb is null then raise exception 'book not found'; end if;
  insert into bdl_book_entries(owner_id,book_id,side,amount,ccy,note,entry_date)
    select owner_id, nb, side, amount, ccy, note, entry_date
      from bdl_book_entries where book_id=p_book;
  return nb;
end $$;
grant execute on function bdl_book_duplicate(uuid) to authenticated;

-- ٦) الحماية: كل مالك يرى دفاتره فقط (المفتاح العام في الصفحة لا يكشف شيئًا)
alter table bdl_books        enable row level security;
alter table bdl_book_entries enable row level security;
drop policy if exists p_books_owner on bdl_books;
create policy p_books_owner on bdl_books
  for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists p_bke_owner on bdl_book_entries;
create policy p_bke_owner on bdl_book_entries
  for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
