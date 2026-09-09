-- جداول المحاسب (الوكيل المجدول)
create table if not exists bdl_agent_log (
  id bigserial primary key,
  at timestamptz default now(),
  kind text, msg text, data jsonb
);
create table if not exists bdl_agent_reports (
  id bigserial primary key,
  created_at timestamptz default now(),
  report text not null,
  facts jsonb
);
alter table bdl_agent_log enable row level security;
alter table bdl_agent_reports enable row level security;
drop policy if exists "owner rw" on bdl_agent_log;
create policy "owner rw" on bdl_agent_log for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
drop policy if exists "owner rw" on bdl_agent_reports;
create policy "owner rw" on bdl_agent_reports for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');

-- Build 1280: أنبوب واتساب
create table if not exists bdl_wa_parties (
  phone text primary key, name text, side text check (side in ('cust','sup')), created_at timestamptz default now());
create table if not exists bdl_wa_pending (
  fp text primary key, phone text, name text, url text, mime text, read jsonb, created_at timestamptz default now());
alter table bdl_wa_parties enable row level security;
alter table bdl_wa_pending enable row level security;
drop policy if exists "owner rw" on bdl_wa_parties;
create policy "owner rw" on bdl_wa_parties for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
drop policy if exists "owner rw" on bdl_wa_pending;
create policy "owner rw" on bdl_wa_pending for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
