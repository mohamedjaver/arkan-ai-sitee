-- ═══════════════════════════════════════════════════════════════
-- bdl-ops9.sql — «الحذف النهائي الذي لا يعود»
-- المشكلة: العمليات المحذوفة تعود لأن المزامنة تعيد إدخالها.
-- الحل: قائمة حظر بالمرجع + حارس قبل الإدخال يرفض أي نسخة عائدة،
--       ودالة تطهير ذرية تحذف كل ما قبل تاريخ معيّن وتحصّنه.
-- الصقه مرة واحدة في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- ١) قائمة الحظر
create table if not exists bdl_purged_refs(
  ref       text not null,
  owner_id  uuid not null default auth.uid(),
  purged_at timestamptz not null default now(),
  primary key(owner_id, ref)
);
alter table bdl_purged_refs enable row level security;
drop policy if exists p_purged_owner on bdl_purged_refs;
create policy p_purged_owner on bdl_purged_refs
  for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

-- ٢) الحارس: أي إدخال جديد لمرجع محظور يُتجاهل بصمت (المزامنة لن تعيده)
create or replace function bdl_block_reimport() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from bdl_purged_refs
             where ref=new.ref
               and owner_id=coalesce(new.owner_id, auth.uid())) then
    return null; -- يُسقط الإدخال
  end if;
  return new;
end $$;
drop trigger if exists tg_tx_block_reimport on bdl_transactions;
create trigger tg_tx_block_reimport before insert on bdl_transactions
  for each row execute function bdl_block_reimport();

-- ٣) التطهير الذري: يحظر ثم يحذف كل عمليات المالك قبل التاريخ المعطى
create or replace function bdl_purge_old(p_keep_from date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare n_del int;
begin
  insert into bdl_purged_refs(ref, owner_id)
    select distinct ref, owner_id from bdl_transactions
     where owner_id=auth.uid() and created_at < p_keep_from and ref is not null
  on conflict do nothing;

  delete from bdl_transactions
   where owner_id=auth.uid() and created_at < p_keep_from;
  get diagnostics n_del = row_count;

  return jsonb_build_object('deleted', n_del);
end $$;
grant execute on function bdl_purge_old(date) to authenticated;

-- ٤) إلغاء حظر مرجع بعينه لاحقًا (عند الحاجة): 
--    delete from bdl_purged_refs where ref='XXXX';
