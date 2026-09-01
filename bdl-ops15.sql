-- ═══════════════════════════════════════════════════════════════
-- bdl-ops15.sql — «أي حذف = نهائي» (Build 1155). يتضمن أساس ops9 ويكمّله. آمن للتكرار.
-- المشكلة: مجموعات محذوفة من «التسوية» تعود لأن المزامنة (archive_docs / طلبات العملاء)
--          تعيد إدخال نفس المرجع. الحل على الخادم: كل حذف يُسجَّل تلقائيًا في قائمة حظر،
--          وأي إدخال لمرجع محظور يُتجاهل بصمت — من أي شاشة أو أي جهاز.
-- ═══════════════════════════════════════════════════════════════
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

-- ١) الحارس قبل الإدخال
create or replace function bdl_block_reimport() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.ref is not null and exists(select 1 from bdl_purged_refs
        where ref=new.ref and owner_id=coalesce(new.owner_id, auth.uid())) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists tg_tx_block_reimport on bdl_transactions;
create trigger tg_tx_block_reimport before insert on bdl_transactions
  for each row execute function bdl_block_reimport();

-- ٢) الجديد: كل حذف يحصّن مرجعه تلقائيًا (لا يعتمد على الواجهة)
create or replace function bdl_tomb_on_delete() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.ref is not null then
    insert into bdl_purged_refs(ref, owner_id) values (old.ref, old.owner_id) on conflict do nothing;
    /* شاهد قبر في سجل التطبيق القديم كي لا يعرضه تطبيق العميل كطلب حي */
    begin
      insert into archive_docs(id, data, updated_at)
      values ('rc_'||old.ref, jsonb_build_object('ref',old.ref,'kind','transfer','status','deleted','deletedAt',(extract(epoch from now())*1000)::bigint), now())
      on conflict (id) do update set data = jsonb_set(coalesce(archive_docs.data,'{}'::jsonb),'{status}','"deleted"'), updated_at = now();
    exception when others then null; end;
  end if;
  return old;
end $$;
drop trigger if exists tg_tx_tomb_on_delete on bdl_transactions;
create trigger tg_tx_tomb_on_delete after delete on bdl_transactions
  for each row execute function bdl_tomb_on_delete();

-- ٣) تطهير القديم ذريًا (من ops9)
create or replace function bdl_purge_old(p_keep_from date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare n_del int;
begin
  insert into bdl_purged_refs(ref, owner_id)
    select distinct ref, owner_id from bdl_transactions
     where owner_id=auth.uid() and created_at < p_keep_from and ref is not null
  on conflict do nothing;
  delete from bdl_transactions where owner_id=auth.uid() and created_at < p_keep_from;
  get diagnostics n_del = row_count;
  return jsonb_build_object('deleted', n_del);
end $$;
grant execute on function bdl_purge_old(date) to authenticated;

-- ٤) إعادة السماح لمرجع بعينه عند الحاجة
create or replace function bdl_unpurge(p_ref text) returns void language sql security invoker as $$
  delete from bdl_purged_refs where ref = p_ref and owner_id = auth.uid();
$$;
grant execute on function bdl_unpurge(text) to authenticated;
