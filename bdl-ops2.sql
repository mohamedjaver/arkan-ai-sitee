-- ═══════════════════════════════════════════════════════════════
-- BDL — المرحلة 2: تأكيد استلام المورد عبر رابط آمن (بلا تسجيل دخول)
-- الصقه في Supabase → SQL Editor → Run   (بعد bdl-ops.sql)
-- ═══════════════════════════════════════════════════════════════

alter table bdl_ops add column if not exists confirm_token text;
alter table bdl_ops add column if not exists confirmed_at  timestamptz;
create unique index if not exists ux_ops_ct on bdl_ops(confirm_token) where confirm_token is not null;

-- عرض عام محكوم بالرمز: المورد يرى عمليته فقط، عبر رمز عشوائي غير قابل للتخمين
create or replace function bdl_op_public(t text)
returns json language sql security definer set search_path=public as $$
  select json_build_object(
    'ref', o.ref, 'client_name', o.client_name, 'supplier', o.supplier,
    'target_aoa', o.target_aoa, 'status', o.status, 'confirmed_at', o.confirmed_at,
    'covered_aoa', coalesce((select sum(amount_aoa) from bdl_op_receipts r where r.op_id=o.id),0),
    'receipts', coalesce((select json_agg(json_build_object(
        'txn', r.txn_id, 'amount', r.amount_aoa, 'bank', r.bank, 'at', r.created_at)
        order by r.created_at) from bdl_op_receipts r where r.op_id=o.id), '[]'::json))
  from bdl_ops o
  where o.confirm_token = t and length(t) >= 16
    and o.status in ('sent','confirmed','closed');
$$;

-- تأكيد الاستلام: يقلب sent → confirmed مرة واحدة (idempotent)
create or replace function bdl_op_confirm(t text)
returns json language plpgsql security definer set search_path=public as $$
declare o bdl_ops;
begin
  update bdl_ops set status='confirmed', confirmed_at=now()
   where confirm_token = t and length(t) >= 16 and status='sent'
   returning * into o;
  if o.id is null then
    select * into o from bdl_ops where confirm_token=t and length(t)>=16;
    if o.id is null then return json_build_object('ok',false,'err','not_found'); end if;
  end if;
  return json_build_object('ok',true,'status',o.status,'confirmed_at',o.confirmed_at);
end $$;

revoke all on function bdl_op_public(text)  from public;
revoke all on function bdl_op_confirm(text) from public;
grant execute on function bdl_op_public(text)  to anon, authenticated;
grant execute on function bdl_op_confirm(text) to anon, authenticated;
