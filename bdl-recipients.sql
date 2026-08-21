-- ═══════════════════════════════════════════════════════════════
-- BDL — دفتر المستلمين المركزي: يُزامن عبر كل الصفحات والأجهزة
-- الصقه في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════
create table if not exists bdl_recipients (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  name       text not null default '',
  phone      text not null default '',
  acct       text not null default '',
  updated_at timestamptz not null default now()
);
-- مستلم واحد لكل (اسم+حساب/هاتف) — التكرار يحدّث بدل أن يضيف
create unique index if not exists ux_rcp on bdl_recipients(owner_id, name, phone, acct);
create index if not exists ix_rcp_recent on bdl_recipients(owner_id, updated_at desc);

alter table bdl_recipients enable row level security;
drop policy if exists p_owner_all on bdl_recipients;
create policy p_owner_all on bdl_recipients for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
