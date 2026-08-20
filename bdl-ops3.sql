-- ═══════════════════════════════════════════════════════════════
-- BDL — المرحلة 3: الإقفال اليومي (لقطة مجمّدة لكل يوم عمل)
-- الصقه في Supabase → SQL Editor → Run   (بعد bdl-ops2.sql)
-- ═══════════════════════════════════════════════════════════════

create table if not exists bdl_day_close (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid(),
  day          date not null,
  received_aoa numeric(20,2) not null default 0,   -- مجموع إيصالات اليوم
  receipts_n   int not null default 0,
  ops_open     int not null default 0,             -- ناقصة التغطية لحظة الإقفال
  gap_open     numeric(20,2) not null default 0,   -- فجوة الكوانزا المتبقية
  ops_covered  int not null default 0,
  ops_sent     int not null default 0,
  ops_confirmed int not null default 0,
  ops_closed_today int not null default 0,
  note         text,
  created_at   timestamptz not null default now()
);
-- يوم واحد = إقفال واحد (المحاولة الثانية تُرفض 409)
create unique index if not exists ux_dc_day on bdl_day_close(owner_id, day);

alter table bdl_day_close enable row level security;
drop policy if exists p_owner_all on bdl_day_close;
create policy p_owner_all on bdl_day_close for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
