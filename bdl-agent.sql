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

-- Build 1286: الأرباح والتصعيد
create table if not exists bdl_deals (
  id bigserial primary key, created_at timestamptz default now(),
  cust_fp text, sup_fp text, amount_aoa numeric, unit text default 'MRU',
  cust_rate numeric, sup_rate numeric, profit numeric, note text, source text,
  unique (cust_fp, sup_fp));
create table if not exists bdl_rates_daily (
  day date primary key, unit text default 'MRU', cust_rate numeric, sup_rate numeric, updated_at timestamptz default now());
alter table bdl_deals enable row level security;
alter table bdl_rates_daily enable row level security;
drop policy if exists "owner rw" on bdl_deals;
create policy "owner rw" on bdl_deals for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
drop policy if exists "owner rw" on bdl_rates_daily;
create policy "owner rw" on bdl_rates_daily for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');

-- Build 1289: المعايير المالية — سجل التدقيق والسلة
create table if not exists bdl_audit (
  id bigserial primary key, at timestamptz default now(),
  actor text, action text, tbl text, row_id text, before jsonb, after jsonb, source text);
create table if not exists bdl_trash (
  id bigserial primary key, at timestamptz default now(),
  tbl text, row_id text, row jsonb, reason text, restored_at timestamptz);
create index if not exists bdl_audit_at on bdl_audit(at desc);
alter table bdl_audit enable row level security;
alter table bdl_trash enable row level security;
drop policy if exists "owner rw" on bdl_audit;
create policy "owner rw" on bdl_audit for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
drop policy if exists "owner rw" on bdl_trash;
create policy "owner rw" on bdl_trash for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');

-- Build 1297: دليل الجهات الموحّد (ذاكرة واحدة للأسماء والأرقام في كل الصفحات)
create table if not exists bdl_parties (
  phone text primary key, name text not null, side text check (side in ('cust','sup','both')) default 'cust',
  aliases text[] default '{}', note text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table bdl_parties enable row level security;
drop policy if exists "owner rw" on bdl_parties;
create policy "owner rw" on bdl_parties for all using (coalesce(auth.jwt()->>'arkan_role','')='owner') with check (coalesce(auth.jwt()->>'arkan_role','')='owner');
