-- أمثلة تدريب قارئ الإيصالات (تصحيحات المالك) — يقرأها الخادم كـ few-shot لكل بنك
create table if not exists bdl_read_examples (
  id bigserial primary key,
  bank text,
  fields jsonb not null,
  hint text,
  created_at timestamptz default now()
);
create index if not exists ix_read_examples_bank on bdl_read_examples(bank);
alter table bdl_read_examples enable row level security;
drop policy if exists "owner rw" on bdl_read_examples;
create policy "owner rw" on bdl_read_examples for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
