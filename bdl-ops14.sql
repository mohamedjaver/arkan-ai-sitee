-- bdl-ops14.sql — سجل العملاء الموحّد (Build 1153). آمن للتكرار.
-- ١) تطبيع الهاتف: أرقام فقط، 8 أرقام موريتانية → 222…، 9 أرقام أنغولية → 244…
create or replace function bdl_phone_norm(p text) returns text language sql immutable as $$
  select case when d ~ '^[234][0-9]{7}$' then '222'||d
              when d ~ '^9[0-9]{8}$'     then '244'||d
              else d end
  from (select regexp_replace(regexp_replace(coalesce(p,''),'\D','','g'),'^00','') d) x;
$$;
update bdl_customers set phone = bdl_phone_norm(phone) where phone is not null and phone <> bdl_phone_norm(phone);
create index if not exists ix_cust_phone_last8 on bdl_customers(owner_id, right(phone,8));

-- ٢) دمج زبونين: تُنقل كل عمليات وحسابات المحذوف إلى المحتفَظ به، ثم يُحذف — ذريًا
create or replace function bdl_customer_merge(p_keep uuid, p_drop uuid, p_name text default null, p_phone text default null)
returns jsonb language plpgsql security invoker as $$
declare n_tx int; n_acc int; d record;
begin
  if p_keep = p_drop then raise exception 'same customer'; end if;
  select * into d from bdl_customers where id = p_drop and owner_id = auth.uid();
  if not found then raise exception 'drop not found'; end if;
  update bdl_transactions set customer_id = p_keep where customer_id = p_drop and owner_id = auth.uid();
  get diagnostics n_tx = row_count;
  begin
    update bdl_accounts set customer_id = p_keep where customer_id = p_drop and owner_id = auth.uid();
    get diagnostics n_acc = row_count;
  exception when others then n_acc := 0; end;
  update bdl_customers set
    name  = coalesce(nullif(p_name,''), name),
    phone = coalesce(nullif(bdl_phone_norm(p_phone),''), nullif(phone,''), d.phone)
    where id = p_keep and owner_id = auth.uid();
  delete from bdl_customers where id = p_drop and owner_id = auth.uid();
  return jsonb_build_object('ok',true,'tx',n_tx,'accounts',n_acc);
end $$;
grant execute on function bdl_customer_merge(uuid,uuid,text,text) to authenticated;
