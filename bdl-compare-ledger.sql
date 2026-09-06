-- ─────────────────────────────────────────────────────────────
-- bdl-compare-ledger.sql — Build 1237 «دفتر إيصالات المقارنة»
-- يُلصق مرة واحدة في Supabase SQL Editor. آمن للتكرار.
-- كل إيصال قُرئ في compare.html يُسجَّل هنا مرة واحدة (بصمة الملف fp)
-- ولا يُعاد تسجيله أو قراءته؛ التعديل اليدوي فقط يغيّره (manual=true).
-- ─────────────────────────────────────────────────────────────
create table if not exists bdl_cmp_receipts(
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid(),
  side          text not null check (side in ('cust','sup')),
  fp            text not null,                 -- SHA-256 للملف الأصلي
  amount        numeric,                       -- null = لم يُقرأ بعد / يحتاج إدخالًا
  amount_read   numeric,                       -- قراءة مرفوضة (رقم عملية/IBAN) للمرجعية
  ccy           text not null default 'AOA',
  ref           text not null default '',      -- رقم العملية البنكي
  who           text not null default '',      -- الزبون / المورد
  bank          text not null default '',
  msg_at        timestamptz not null,          -- وقت رسالة واتساب (أو الملف) — تاريخ الإيصال المعتمد
  name          text,
  receipt_url   text,                          -- مسار الصورة في bucket receipts (books/<uid>/cmp/<fp>.ext)
  matched_fp    text,                          -- بصمة الإيصال المقابل
  how           text not null default '',      -- ref / amount / approx / manual
  manual        boolean not null default false,
  verified      boolean not null default false,
  review        boolean not null default false,
  flags         jsonb not null default '[]'::jsonb,
  book_entry_id uuid,                          -- قيد الدفتر (bdl_book_entries) إن رُحّل
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists ux_cmp_owner_fp on bdl_cmp_receipts(owner_id, fp);
create index if not exists ix_cmp_owner_side_ref on bdl_cmp_receipts(owner_id, side, ref) where ref <> '';
create index if not exists ix_cmp_owner_msg on bdl_cmp_receipts(owner_id, msg_at desc);

alter table bdl_cmp_receipts enable row level security;
drop policy if exists p_cmp_own on bdl_cmp_receipts;
create policy p_cmp_own on bdl_cmp_receipts for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function bdl_cmp_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists t_cmp_touch on bdl_cmp_receipts;
create trigger t_cmp_touch before update on bdl_cmp_receipts for each row execute function bdl_cmp_touch();

-- ملفات الإيصالات: نفس bucket «receipts» وسياسة books/<uid>/… القائمة في bdl-books-v2.sql
insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict (id) do nothing;
