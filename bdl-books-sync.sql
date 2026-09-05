-- ─────────────────────────────────────────────────────────────
-- bdl-books-sync.sql — Build 1213
-- ربط «دفاتري» بكونسول التسوية وكروت الزبائن/الموردين:
--   • كل زبون/مورد في bdl_customers ↔ دفتر واحد (cust_id)
--   • كل معاملة تسوية (bdl_transactions) ↔ قيدان في دفتر الجهة:
--       A: ما دفعته الجهة لنا (amount ccy)      B: ما سلّمناه لها (settle_amount settle_ccy) عند الإتمام
--       للمورد تُعكس الجهتان.
--   • عمليات الكوانزا (bdl_ops / bdl_op_receipts): إيصالات الزبون = وارد AOA، الإغلاق = صادر target_aoa،
--       والمورد المغطّي = وارد target_aoa في دفتره.
--   • الأرباح: كل معاملة مكتملة تُقيَّد ربحها/خسارتها في دفتر صندوق «أرباح التسوية» (leg P).
--   • القيود المصدرها التسوية/العمليات للقراءة فقط في الواجهة (source ≠ manual).
-- يُنفَّذ بعد bdl-books-v2.sql. آمن للتكرار. يشمل تعبئة رجعية لكل ما سبق.
-- ─────────────────────────────────────────────────────────────

alter table bdl_book_entries add column if not exists source text not null default 'manual';   -- manual | settle | ops
alter table bdl_book_entries add column if not exists tx_leg text;                              -- A/B (تسوية) R/D/S (عمليات)
drop index if exists ux_bke_tx;
-- قيد مرجع الإيصال الفريد يخصّ القيود اليدوية فقط (قيدا A وB يحملان نفس مرجع المعاملة)
drop index if exists ux_bke_ref;
create unique index if not exists ux_bke_ref on bdl_book_entries(book_id, ref) where ref is not null and coalesce(source,'manual')='manual';
create unique index if not exists ux_bke_txleg on bdl_book_entries(book_id, tx_id, tx_leg) where tx_id is not null;
alter table bdl_books add column if not exists source text not null default 'manual';
create unique index if not exists ux_books_cust on bdl_books(owner_id, cust_id) where cust_id is not null;
create index if not exists ix_books_kind_name on bdl_books(owner_id, kind, lower(name));

-- ───────── دفتر لجهة من bdl_customers
create or replace function bdl_book_for_customer(p_owner uuid, p_cust uuid, p_kind text, p_ccy text)
returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid; c record;
begin
  if p_cust is null then return null; end if;
  select id into b from bdl_books where owner_id=p_owner and cust_id=p_cust limit 1;
  if b is not null then return b; end if;
  select name, phone into c from bdl_customers where id=p_cust;
  if c.name is null then return null; end if;
  -- أعد استعمال دفتر يدوي بنفس الاسم والنوع إن وُجد
  select id into b from bdl_books where owner_id=p_owner and cust_id is null and kind=p_kind and lower(name)=lower(c.name) limit 1;
  if b is not null then
    update bdl_books set cust_id=p_cust, phone=coalesce(phone,c.phone), source='settle' where id=b; return b;
  end if;
  insert into bdl_books(owner_id,name,phone,kind,currency,cust_id,source)
    values(p_owner,c.name,nullif(c.phone,''),p_kind,coalesce(p_ccy,'AOA'),p_cust,'settle') returning id into b;
  return b;
end $$;

-- ───────── دفتر لجهة بالاسم (كروت العمليات: client_name / supplier)
create or replace function bdl_book_for_name(p_owner uuid, p_kind text, p_name text, p_ccy text)
returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid; ph text;
begin
  if p_name is null or btrim(p_name)='' then return null; end if;
  select id into b from bdl_books where owner_id=p_owner and kind=p_kind and lower(name)=lower(btrim(p_name)) limit 1;
  if b is not null then return b; end if;
  select nullif(phone,'') into ph from bdl_parties where owner_id=p_owner and name=btrim(p_name)
    and kind=case when p_kind='supplier' then 'supplier' else 'client' end limit 1;
  insert into bdl_books(owner_id,name,phone,kind,currency,source) values(p_owner,btrim(p_name),ph,p_kind,coalesce(p_ccy,'AOA'),'ops') returning id into b;
  return b;
end $$;

-- ───────── قيد مُزامن (upsert على tx_id+leg)
create or replace function bdl_upsert_leg(p_owner uuid, p_book uuid, p_side text, p_amount numeric, p_ccy text, p_note text,
  p_date date, p_tx uuid, p_leg text, p_source text, p_method text, p_cat text, p_ref text, p_party text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_book is null or p_amount is null or p_amount<=0 or p_ccy is null then
    delete from bdl_book_entries where tx_id=p_tx and tx_leg=p_leg; return;
  end if;
  insert into bdl_book_entries(owner_id,book_id,side,amount,ccy,note,entry_date,tx_id,tx_leg,source,method,category,ref,party,created_by_name)
  values(p_owner,p_book,p_side,p_amount,p_ccy,p_note,p_date,p_tx,p_leg,p_source,p_method,p_cat,p_ref,p_party,'BDL')
  on conflict (book_id,tx_id,tx_leg) where tx_id is not null
  do update set side=excluded.side, amount=excluded.amount, ccy=excluded.ccy, note=excluded.note, entry_date=excluded.entry_date,
                method=excluded.method, category=excluded.category, ref=excluded.ref, party=excluded.party, updated_at=now();
end $$;

-- ───────── سعر الشراء المرجعي (نسخة مستقلة عن ops10b): آخر معاملة MRU→AOA مكتملة لها تكلفة
create or replace function bdl_books_ref_rb(p_owner uuid) returns numeric
language sql stable security definer set search_path=public as $$
  select coalesce(nullif(m.meta->>'rate_cost','')::numeric, m.amount*10/m.cost)
  from bdl_transactions m
  where m.owner_id=p_owner and m.ccy='MRU' and coalesce(m.settle_ccy,'AOA')='AOA'
    and m.cost>0 and m.amount>0 and m.status in ('done','settled')
  order by m.updated_at desc limit 1;
$$;

-- ───────── دفتر «أرباح التسوية» (صندوق واحد لكل مالك)
create or replace function bdl_profit_book(p_owner uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare b uuid;
begin
  select id into b from bdl_books where owner_id=p_owner and kind='cash' and settings->>'system'='profit' limit 1;
  if b is not null then return b; end if;
  insert into bdl_books(owner_id,name,kind,currency,source,settings,note)
    values(p_owner,'أرباح التسوية','cash','MRU','settle','{"system":"profit"}'::jsonb,'يُغذَّى تلقائيًا من كل معاملة مكتملة في كونسول التسوية')
    returning id into b;
  return b;
end $$;

-- ───────── مزامنة معاملة تسوية (A/B للجهة + P للأرباح)
create or replace function bdl_sync_tx(t bdl_transactions) returns void
language plpgsql security definer set search_path=public as $$
declare side text := coalesce(t.meta->>'side','customer'); kind text; b uuid; done boolean; d date; recip text;
        cname text; p numeric; pc text := 'MRU'; pb uuid; rb numeric; est boolean := false;
begin
  kind := case when side='supplier' then 'supplier' else 'customer' end;
  b := bdl_book_for_customer(t.owner_id, t.customer_id, kind, t.ccy);
  if b is null then return; end if;
  done := t.status in ('done','settled','closed');
  d := coalesce((t.meta->>'date')::date, t.created_at::date);
  recip := coalesce(t.meta->>'recipient', t.meta->>'to', null);
  select name into cname from bdl_customers where id=t.customer_id;
  -- A: ما دفعته الجهة لنا
  perform bdl_upsert_leg(t.owner_id, b, case when kind='supplier' then 'out' else 'in' end, t.amount, t.ccy,
    'تحويل '||t.ref||coalesce(' — '||nullif(t.note,''),''), d, t.id, 'A', 'settle', 'transfer', 'تسوية', t.ref, recip);
  -- B: ما سلّمناه لها عند الإتمام
  if done then
    perform bdl_upsert_leg(t.owner_id, b, case when kind='supplier' then 'in' else 'out' end, t.settle_amount, t.settle_ccy,
      'تسليم '||t.ref||coalesce(' بسعر '||t.rate::text,''), d, t.id, 'B', 'settle', 'transfer', 'تسوية', t.ref, recip);
  else
    delete from bdl_book_entries where tx_id=t.id and tx_leg='B';
  end if;
  -- P: الربح إلى دفتر «أرباح التسوية» (بالأوقية عبر bdl_tx_net_mru إن وُجدت، وإلا settle_amount − cost بعملة التسوية)
  p := null;
  if done and t.settle_amount is not null and t.settle_amount<>0 then
    begin p := bdl_tx_net_mru(t); exception when others then p := null; end;
    if p is null then
      -- تكلفة فعلية بلا تحويل للأوقية
      if t.cost is not null and t.cost<>0 then
        p := t.settle_amount - t.cost - coalesce(nullif(t.meta->>'fee','')::numeric,0) - coalesce(nullif(t.meta->>'expense','')::numeric,0);
        pc := coalesce(t.settle_ccy,'AOA');
      -- لا تكلفة مسجّلة: تقدير بسعر الشراء المرجعي (آخر معاملة MRU→AOA لها سعر شراء)، كما تفعل صفحة P&L
      elsif t.ccy='MRU' and coalesce(t.settle_ccy,'AOA')='AOA' and t.amount>0 then
        rb := bdl_books_ref_rb(t.owner_id);
        if rb is not null and rb>0 then
          p := (t.settle_amount - t.amount*10/rb - coalesce(nullif(t.meta->>'fee','')::numeric,0) - coalesce(nullif(t.meta->>'expense','')::numeric,0)) * rb / 10;
          pc := 'MRU'; est := true;
        end if;
      end if;
    end if;
  end if;
  if p is not null and p<>0 then
    pb := bdl_profit_book(t.owner_id);
    perform bdl_upsert_leg(t.owner_id, pb, case when p>0 then 'in' else 'out' end, abs(round(p,2)), pc,
      (case when p>0 then 'ربح' else 'خسارة' end)||' تسوية '||t.ref||coalesce(' — '||cname,'')||(case when est then ' (تقديري بسعر الشراء المرجعي)' else '' end), d, t.id, 'P', 'settle', 'transfer', case when est then 'أرباح تقديرية' else 'أرباح' end, t.ref, cname);
  else
    delete from bdl_book_entries where tx_id=t.id and tx_leg='P';
  end if;
end $$;

create or replace function bdl_tg_tx_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then delete from bdl_book_entries where tx_id=old.id; return old; end if;
  perform bdl_sync_tx(new); return new;
end $$;
drop trigger if exists tg_tx_books on bdl_transactions;
create trigger tg_tx_books after insert or update or delete on bdl_transactions for each row execute function bdl_tg_tx_sync();

-- ───────── مزامنة عمليات الكوانزا
create or replace function bdl_sync_op(o bdl_ops) returns void
language plpgsql security definer set search_path=public as $$
declare cb uuid; sb uuid; d date;
begin
  d := o.created_at::date;
  cb := bdl_book_for_name(o.owner_id,'customer',o.client_name,'AOA');
  -- D: ما سلّمناه للزبون (عند الإغلاق)
  if o.status in ('closed','confirmed') then
    perform bdl_upsert_leg(o.owner_id, cb, 'out', o.target_aoa, 'AOA', 'تسليم عملية '||o.ref||coalesce(' — '||nullif(o.note,''),''), d, o.id, 'D', 'ops', 'transfer', 'عملية', o.ref, o.supplier);
  else
    delete from bdl_book_entries where tx_id=o.id and tx_leg='D';
  end if;
  -- S: المورد الذي غطّى العملية (ما قدّمه لنا)
  if o.supplier is not null and btrim(o.supplier)<>'' and o.status in ('sent','confirmed','closed') then
    sb := bdl_book_for_name(o.owner_id,'supplier',o.supplier,'AOA');
    perform bdl_upsert_leg(o.owner_id, sb, 'in', o.target_aoa, 'AOA', 'تغطية عملية '||o.ref||' لـ '||o.client_name, d, o.id, 'S', 'ops', 'transfer', 'عملية', o.ref, o.client_name);
  else
    delete from bdl_book_entries where tx_id=o.id and tx_leg='S';
  end if;
end $$;
create or replace function bdl_tg_op_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then delete from bdl_book_entries where tx_id=old.id; return old; end if;
  perform bdl_sync_op(new); return new;
end $$;
drop trigger if exists tg_ops_books on bdl_ops;
create trigger tg_ops_books after insert or update or delete on bdl_ops for each row execute function bdl_tg_op_sync();

-- R: إيصالات الزبون على العملية (وارد AOA)
create or replace function bdl_sync_opr(r bdl_op_receipts) returns void
language plpgsql security definer set search_path=public as $$
declare o record; cb uuid;
begin
  select * into o from bdl_ops where id=r.op_id;
  if o.id is null then return; end if;
  cb := bdl_book_for_name(r.owner_id,'customer',o.client_name,'AOA');
  perform bdl_upsert_leg(r.owner_id, cb, 'in', r.amount_aoa, 'AOA',
    'إيصال '||coalesce(r.bank,'')||' — عملية '||o.ref||coalesce(' — '||nullif(r.sender,''),''), r.created_at::date, r.id, 'R', 'ops', 'transfer', 'عملية', r.txn_id, r.sender);
end $$;
create or replace function bdl_tg_opr_sync() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then delete from bdl_book_entries where tx_id=old.id; return old; end if;
  perform bdl_sync_opr(new); return new;
end $$;
drop trigger if exists tg_opr_books on bdl_op_receipts;
create trigger tg_opr_books after insert or update or delete on bdl_op_receipts for each row execute function bdl_tg_opr_sync();

-- ───────── تغيير اسم/هاتف الزبون ينعكس على دفتره
create or replace function bdl_tg_cust_books() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update bdl_books set name=new.name, phone=coalesce(nullif(new.phone,''),phone) where cust_id=new.id;
  return new;
end $$;
drop trigger if exists tg_cust_books on bdl_customers;
create trigger tg_cust_books after update of name, phone on bdl_customers for each row execute function bdl_tg_cust_books();
-- هاتف الكرت (bdl_parties) ينعكس على دفتر الاسم
create or replace function bdl_tg_party_books() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update bdl_books set phone=nullif(new.phone,'') where owner_id=new.owner_id and lower(name)=lower(new.name)
    and kind=case when new.kind='supplier' then 'supplier' else 'customer' end and coalesce(phone,'')='';
  return new;
end $$;
drop trigger if exists tg_party_books on bdl_parties;
create trigger tg_party_books after insert or update of phone on bdl_parties for each row execute function bdl_tg_party_books();

-- ───────── حماية: القيود المُزامنة لا تُعدَّل/تُحذف من الواجهة (RLS) — حذف الدفتر بالتتالي يبقى يعمل
drop trigger if exists tg_bke_guard_upd on bdl_book_entries;
drop policy if exists p_bke_upd on bdl_book_entries; drop policy if exists p_bke_del on bdl_book_entries;
create policy p_bke_upd on bdl_book_entries for update to authenticated
  using (bdl_can_write(book_id) and coalesce(source,'manual')='manual') with check (bdl_can_write(book_id) and coalesce(source,'manual')='manual');
create policy p_bke_del on bdl_book_entries for delete to authenticated
  using (bdl_can_write(book_id) and coalesce(source,'manual')='manual');

-- ───────── تعبئة رجعية
do $$ declare t bdl_transactions; o bdl_ops; r bdl_op_receipts; bad int := 0;
begin
  for t in select * from bdl_transactions loop
    begin perform bdl_sync_tx(t); exception when others then bad := bad + 1; raise notice 'tx % skipped: %', t.ref, sqlerrm; end;
  end loop;
  for o in select * from bdl_ops loop
    begin perform bdl_sync_op(o); exception when others then bad := bad + 1; raise notice 'op % skipped: %', o.ref, sqlerrm; end;
  end loop;
  for r in select * from bdl_op_receipts loop
    begin perform bdl_sync_opr(r); exception when others then bad := bad + 1; raise notice 'op receipt % skipped: %', r.txn_id, sqlerrm; end;
  end loop;
  raise notice 'backfill done, skipped: %', bad;
end $$;

-- ملخص الدفاتر يحمل cust_id/source أصلًا عبر b.* — لا حاجة لتعديل bdl_books_summary
