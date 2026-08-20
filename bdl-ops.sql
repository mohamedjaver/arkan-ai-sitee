-- ═══════════════════════════════════════════════════════════════
-- BDL — المرحلة 1: عمود العمليات والتغطية + قفل تكرار الإيصالات
-- الصقه مرة واحدة في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- العملية: صفقة بهدف كوانزا محدد
create table if not exists bdl_ops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  ref         text not null,                 -- OP-XXXX
  client_name text not null,                 -- الزبون الموريتاني
  target_aoa  numeric(20,2) not null,        -- المبلغ المتفق بالكوانزا
  supplier    text,                          -- المورد الأنغولي (المرحلة 2 توسّعه)
  status      text not null default 'open',  -- open|covered|sent|confirmed|closed
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists ux_ops_ref on bdl_ops(owner_id, ref);
create index if not exists ix_ops_status on bdl_ops(owner_id, status, created_at desc);

-- إيصالات الكوانزا الملحقة بالعمليات — رقم عملية البنك فريد = قفل التكرار الصلب
create table if not exists bdl_op_receipts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  op_id      uuid not null references bdl_ops(id) on delete cascade,
  txn_id     text not null,                  -- رقم عملية البنك من الإيصال
  amount_aoa numeric(20,2) not null,
  bank       text,
  sender     text,                           -- من دفع (اختياري)
  created_at timestamptz not null default now()
);
-- القفل: نفس رقم العملية لا يدخل مرتين مهما حاول أحد
create unique index if not exists ux_opr_txn on bdl_op_receipts(owner_id, txn_id);
create index if not exists ix_opr_op on bdl_op_receipts(op_id);

-- عرض التغطية: كل عملية مع مجموع إيصالاتها ونسبتها
create or replace view bdl_ops_coverage as
select o.id, o.owner_id, o.ref, o.client_name, o.target_aoa, o.supplier,
       o.status, o.note, o.created_at,
       coalesce(sum(r.amount_aoa),0)                    as covered_aoa,
       count(r.id)                                      as receipts_n,
       round(100*coalesce(sum(r.amount_aoa),0)/nullif(o.target_aoa,0),1) as pct
from bdl_ops o
left join bdl_op_receipts r on r.op_id = o.id
group by o.id;

-- الأمان: نفس نمط بقية جداول BDL — المالك الموثق فقط
alter table bdl_ops         enable row level security;
alter table bdl_op_receipts enable row level security;
do $$
declare tb text;
begin
  foreach tb in array array['bdl_ops','bdl_op_receipts']
  loop
    execute format('drop policy if exists p_owner_all on %I', tb);
    execute format(
      'create policy p_owner_all on %I for all to authenticated
         using (owner_id = auth.uid()) with check (owner_id = auth.uid())', tb);
  end loop;
end $$;
alter view bdl_ops_coverage set (security_invoker = on);

-- تحديث updated_at تلقائيًا
create or replace function bdl_ops_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists tg_ops_touch on bdl_ops;
create trigger tg_ops_touch before update on bdl_ops
  for each row execute function bdl_ops_touch();
