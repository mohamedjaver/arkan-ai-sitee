-- ═══════════════════════════════════════════════════════════════
-- BDL — سجل الأطراف الموحد (عملاء وموردون يُسجَّلون مرة واحدة)
--        + عرض التقرير الدوري للعمليات
-- الصقه في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════
create table if not exists bdl_parties (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  kind       text not null check (kind in ('client','supplier')),
  name       text not null,
  phone      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ux_party on bdl_parties(owner_id, kind, name);
create index if not exists ix_party_recent on bdl_parties(owner_id, kind, updated_at desc);

alter table bdl_parties enable row level security;
drop policy if exists p_party_owner on bdl_parties;
create policy p_party_owner on bdl_parties for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- التقرير اليومي للعمليات (الأسبوعي والشهري يُجمَّعان منه في الواجهة)
drop view if exists bdl_ops_report_daily;
create view bdl_ops_report_daily as
select owner_id,
       date_trunc('day', created_at)::date as day,
       count(*)::int                        as ops_n,
       count(*) filter (where status='closed')::int as closed_n,
       coalesce(sum(target_aoa),0)          as target_aoa,
       coalesce(sum(profit_mru) filter (where status='closed'),0) as profit_mru
from bdl_ops
group by owner_id, date_trunc('day', created_at)::date;
alter view bdl_ops_report_daily set (security_invoker = on);
