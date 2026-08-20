-- ═══════════════════════════════════════════════════════════════
-- BDL — حذف تسوية (إعادة فتح ذرّية): العمليات تعود مفتوحة،
-- الإيصالات تتحرر من عدّاد الاستخدام، وسجل التسوية يُحذف — والأرباح تتصحح تلقائيًا
-- الصقه في Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════
create or replace function bdl_unsettle(p_st uuid)
returns json language plpgsql security invoker as $$
declare n int;
begin
  update bdl_transactions
     set status='open', settlement_id=null, updated_at=now()
   where settlement_id = p_st and owner_id = auth.uid();
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'لا توجد تسوية بهذا المعرف أو ليست ملكك';
  end if;

  update bdl_receipts
     set used_count = greatest(0, used_count - 1)
   where owner_id = auth.uid()
     and id in (select receipt_id from bdl_settlement_receipts where settlement_id = p_st);

  delete from bdl_settlement_receipts where settlement_id = p_st;
  delete from bdl_settlements where id = p_st and owner_id = auth.uid();

  return json_build_object('ok', true, 'reopened', n);
end $$;
