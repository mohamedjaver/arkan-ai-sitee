/* ═══════════════════════════════════════════════════════════════════
   bdl-ops7.js — إعادة تنظيم العمليات/العملاء/التسوية (طبقة إضافية)
   ١) بطاقات نظيفة بلا أزرار — الضغط يفتح Bottom Sheet بالخيارات
   ٢) منع تكرار الإيصالات ١٠٠٪: بصمة دلالية + بصمة صورة SHA-256
   ٣) رفع جماعي ١٠٠+ وصل: قراءة تلقائية، منع مكرر، ربط بالعميل والعملية
   ٤) مبلغ يدوي «بدون وصل» يدخل التسوية والتقرير بوسم واضح
   ٥) تقرير PDF مجمّع حسب الشركة/الجهة
   ٦) التسوية التلقائية عند اكتمال التغطية (مع مسار Supabase trigger)
   يُحمَّل بعد سكربت settle-v2 — لا يمس التصميم ولا يكسر شيئًا قائمًا.
   يتطلب لصق bdl-ops7.sql مرة واحدة في Supabase (يعمل بتدرّج آمن قبلها).
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
if(typeof renderOps!=='function'){console.warn('ops7: settle-v2 غير محمّل');return;}

var OPS7=true;                 /* أعمدة bdl-ops7.sql متوفرة؟ يتدرّج تلقائيًا */
window.RC_CUR_FILE=null;       /* آخر ملف قُرئ في نافذة الإلحاق */
window.OP7_META={};            /* تاريخ/حساب من آخر قراءة */

/* ─────────── أدوات البصمة ─────────── */
async function sha256(buf){
  var h=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}
async function fpFile(file){try{return await sha256(await file.arrayBuffer());}catch(e){return null;}}
function fpNorm(s){return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g,'');}
async function fpSem(txn,amt,date,acct,sender,side){
  var key=[fpNorm(txn),Math.round(+amt||0),fpNorm(date),fpNorm(acct),fpNorm(sender),fpNorm(side||'in')].join('|');
  return await sha256(new TextEncoder().encode(key));
}

/* ─────────── الأنماط + هيكل الـ Bottom Sheet ─────────── */
var st=document.createElement('style');
st.textContent=
'.op7card{background:#fff;border:1px solid #D7E2F2;padding:13px 15px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s}'+
'.op7card:active{box-shadow:0 4px 18px rgba(10,86,184,.18)}'+
'.op7bs{position:fixed;inset:0;background:rgba(11,36,71,.45);z-index:340;display:none;align-items:flex-end}'+
'.op7bs.on{display:flex}'+
'.op7bs .bx{background:#fff;width:100%;max-width:560px;margin:0 auto;border-radius:22px 22px 0 0;padding:10px 18px calc(20px + env(safe-area-inset-bottom));animation:op7up .22s ease}'+
'@keyframes op7up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}'+
'.op7bs .grab{width:44px;height:5px;background:#D7E2F2;border-radius:99px;margin:4px auto 12px}'+
'.op7bs .ttl{font-size:14.5px;font-weight:800;color:#0B2447}'+
'.op7bs .sub{font-size:11.5px;color:#5C7699;margin:3px 0 12px}'+
'.op7bs button.it{display:flex;align-items:center;gap:12px;width:100%;height:52px;border:0;background:#F4F8FD;margin-bottom:8px;padding:0 16px;font-family:inherit;font-size:13.5px;font-weight:800;color:#0B2447;cursor:pointer;text-align:start}'+
'.op7bs button.it.main{background:var(--navy,#0B2F70);color:#fff}'+
'.op7bs button.it.red{background:#FFF5F5;color:#B00020}'+
'.op7tag{font-size:10px;font-weight:800;padding:3px 8px;margin-inline-start:6px}'+
'.op7row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #E3ECF7;padding:9px 2px;font-size:12px}'+
'.op7st{font-size:10.5px;font-weight:800;padding:3px 9px;white-space:nowrap}'+
'.op7st.ok{background:#E7F6EC;color:#0B7A3B}.op7st.dup{background:#FDECEA;color:#B00020}'+
'.op7st.rev{background:#FFF6E0;color:#8A6100}.op7st.unk{background:#EEF2F8;color:#5C7699}';
document.head.appendChild(st);

var bs=document.createElement('div');bs.className='op7bs';bs.id='op7bs';
bs.innerHTML='<div class="bx"><div class="grab"></div><div class="ttl" id="op7t"></div><div class="sub num" id="op7s"></div><div id="op7acts"></div></div>';
bs.addEventListener('click',function(e){if(e.target===bs)op7Close();});
document.body.appendChild(bs);
window.op7Close=function(){bs.classList.remove('on');};

/* ─────────── ١+٣) البطاقة النظيفة — كل الخيارات في الـ Sheet ─────────── */
window.renderOps=function(){
  if(!OPS_DATA)return;
  var q=($('#opq').value||'').trim().toLowerCase();
  var rows=OPS_DATA.filter(function(o){
    if(o.status==='cancelled')return false;
    if(OP_ST==='ALL'&&o.status==='closed')return false;
    if(OP_ST!=='ALL'&&o.status!==OP_ST)return false;
    if(OP_LANE&&Number(o.legs||2)!==OP_LANE)return false;
    if(!q)return true;
    return [o.ref,o.client_name,o.supplier,o.req_ref,o.note].join(' ').toLowerCase().indexOf(q)>=0;
  });
  $('#opList').innerHTML=rows.map(function(o){
    var s=OP_STL[o.status]||['open',o.status];
    var src=o.source==='customer'?'<span class="op7tag" style="background:#E8F1FF;color:#0058D9">زبون</span>'
      :o.source==='owner'?'<span class="op7tag" style="background:#FFF6E0;color:#8A6100">حساب المالك</span>':'';
    var rc=reconOf(o.id),lane=(Number(o.legs)===3?'ثلاثية':Number(o.legs)===4?'رباعية':'ثنائية');
    var rt=rc.in_n?'<div style="margin-top:6px"><span class="num" style="font-size:11px;font-weight:800;'+
      (rc.matched>=rc.in_n?'color:#0B7A3B">المطابقة '+rc.matched+'/'+rc.in_n:'color:#B00020">مطابقة '+rc.matched+'/'+rc.in_n)+'</span></div>':'';
    return '<div class="op7card" onclick="op7Sheet(\''+o.id+'\')">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'+
      '<div style="min-width:0"><b style="font-size:14.5px;color:var(--navy)">'+esc(o.client_name)+'</b>'+src+
      '<div class="num" style="font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+
      esc(o.ref)+' · '+lane+(o.supplier?' · '+esc(o.supplier):'')+'</div></div>'+
      '<span class="st '+s[0]+'" style="flex-shrink:0">'+s[1]+'</span></div>'+
      (window.opPipe?opPipe(o):'')+opBar(o)+rt+'</div>';
  }).join('')||'<div class="empty">لا عمليات'+(q?' مطابقة':' — أنشئ الأولى بزر «+ عملية»')+'</div>';
};

window.op7Sheet=function(id){
  var o=(OPS_DATA||[]).find(function(x){return x.id===id;});if(!o)return;
  $('#op7t').textContent=o.client_name+' · '+o.ref;
  $('#op7s').textContent=fmt(o.covered_aoa,0)+' / '+fmt(o.target_aoa,0)+' AOA · '+(o.rcpt_count||0)+' إيصال';
  var a='';
  function it(cls,txt,fn){return '<button class="it '+cls+'" onclick="op7Close();'+fn+'">'+txt+'</button>';}
  if(o.status==='open'||o.status==='covered')a+=it('main',' إضافة وصل',"opSheet('"+id+"')");
  if(o.status==='open'||o.status==='covered')a+=it('',' مبلغ يدوي — بدون وصل',"op7Manual('"+id+"')");
  if(o.status==='covered')a+=it('',' أُرسلت للمورد',"opSetSt('"+id+"','sent')");
  if(o.status==='sent')a+=it('',' رابط تأكيد المورد',"opCopyLink('"+(o.confirm_token||'')+"')");
  if(o.status==='confirmed')a+=it('main',' تسوية وإقفال',"opCloseSheet('"+id+"')");
  if(o.status==='covered')a+=it('',' تمت التسوية — أرشفة الآن',"op7Archive('"+id+"')");
  a+=it('',' التفاصيل والإيصالات',"op7Details('"+id+"')");
  a+=it('','تعديل',"opEditSheet('"+id+"')");
  a+=it('red','حذف',"opDelete('"+id+"')");
  $('#op7acts').innerHTML=a;
  bs.classList.add('on');
};

/* ─────────── تفاصيل العملية: كل الإيصالات والمبالغ اليدوية ─────────── */
window.op7Details=async function(id){
  var o=(OPS_DATA||[]).find(function(x){return x.id===id;});if(!o)return;
  $('#op7t').textContent='تفاصيل — '+o.ref;
  $('#op7s').textContent=o.client_name+' · '+fmt(o.covered_aoa,0)+' / '+fmt(o.target_aoa,0)+' AOA';
  $('#op7acts').innerHTML='<div class="empty" style="padding:18px">جارٍ التحميل…</div>';
  bs.classList.add('on');
  try{
    var r=await fetch(SB+'/bdl_op_receipts?op_id=eq.'+id+'&select=*&order=created_at.desc',{headers:H()});
    var rs=r.ok?await r.json():[];
    var html=rs.map(function(x){
      var man=x.manual||/^MANUAL-/.test(x.txn_id||'');
      return '<div class="op7row"><div style="min-width:0">'+
        '<div class="num" style="font-weight:800;color:#0B2447">'+fmt(x.amount_aoa,0)+' AOA'+
        (man?'<span class="op7tag" style="background:#FFF6E0;color:#8A6100">بدون إيصال</span>'
            :(x.side==='out'?'<span class="op7tag" style="background:#EEF2F8;color:#5C7699">صادر</span>':''))+'</div>'+
        '<div class="num" style="font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+
        esc(man?(x.sender||'يدوي'):x.txn_id)+(x.bank&&!man?' · '+esc(x.bank):'')+
        (x.rcpt_date?' · '+esc(x.rcpt_date):'')+'</div></div>'+
        '<span class="num" style="font-size:10px;color:#8AA3C4;flex-shrink:0">'+String(x.created_at||'').slice(0,10)+'</span></div>';
    }).join('')||'<div class="empty">لا إيصالات بعد</div>';
    var gap=Math.max(0,Number(o.target_aoa)-Number(o.covered_aoa));
    $('#op7acts').innerHTML='<div style="max-height:46vh;overflow:auto">'+html+'</div>'+
      '<div style="display:flex;justify-content:space-between;padding:12px 2px;font-size:12.5px;font-weight:800">'+
      '<span style="color:'+(gap?'#B00020':'#0B7A3B')+'">'+(gap?'المتبقي '+fmt(gap,0)+' AOA':'التغطية مكتملة ✓')+'</span>'+
      '<span class="num" style="color:#0B2447">'+rs.length+' قيد</span></div>'+
      '<button class="it" onclick="op7Sheet(\''+id+'\')">← رجوع</button>';
  }catch(e){$('#op7acts').innerHTML='<div class="empty">تعذّر التحميل</div>';}
};

/* ─────────── ٤) مبلغ يدوي بدون وصل — يُحتسب في التسوية بوسم واضح ─────────── */
window.op7Manual=function(id){
  var o=(OPS_DATA||[]).find(function(x){return x.id===id;});if(!o)return;
  $('#op7t').textContent='مبلغ يدوي — '+o.ref;
  $('#op7s').textContent='يُحتسب في التسوية والتقرير بوسم «بدون إيصال / وصل مفقود»';
  $('#op7acts').innerHTML=
    '<div class="clabel">المبلغ (AOA)</div><input id="m7Amt" class="cin num" inputmode="numeric" style="width:100%;box-sizing:border-box">'+
    '<div class="clabel" style="margin-top:9px">الجهة / من دفع</div><input id="m7Who" class="cin" style="width:100%;box-sizing:border-box">'+
    '<div class="clabel" style="margin-top:9px">التاريخ</div><input id="m7Dt" type="date" class="cin num" style="width:100%;box-sizing:border-box" value="'+new Date().toISOString().slice(0,10)+'">'+
    '<div class="clabel" style="margin-top:9px">ملاحظة</div><input id="m7Nt" class="cin" style="width:100%;box-sizing:border-box" placeholder="سبب غياب الوصل…">'+
    '<button class="it main" style="margin-top:14px" onclick="op7ManualSave(\''+id+'\')">حفظ — بدون إيصال</button>';
  bs.classList.add('on');
};
window.op7ManualSave=async function(id){
  var a=parseFloat(($('#m7Amt').value||'').replace(/[^\d.]/g,''))||0;
  var w=($('#m7Who').value||'').trim(),dt=$('#m7Dt').value||'',nt=($('#m7Nt').value||'').trim();
  if(a<=0){toast('أدخل المبلغ');return;}
  if(w.length<2){toast('أدخل الجهة');return;}
  var body={op_id:id,side:'in',amount_aoa:a,
    txn_id:'MANUAL-'+Date.now().toString(36).toUpperCase(),
    bank:'بدون إيصال',sender:w+(nt?' · '+nt:'')};
  var ext=Object.assign({},body,{manual:true,rcpt_date:dt});
  try{
    var r=await fetch(SB+'/bdl_op_receipts',{method:'POST',headers:H(),body:JSON.stringify(OPS7?ext:body)});
    if(r.status===400&&OPS7){OPS7=false;
      r=await fetch(SB+'/bdl_op_receipts',{method:'POST',headers:H(),body:JSON.stringify(body)});
      if(r.ok)toast('الصق bdl-ops7.sql في Supabase لتفعيل الوسوم الكاملة');}
    if(!r.ok)throw new Error(r.status);
    op7Close();toast('سُجّل المبلغ اليدوي — بوسم «بدون إيصال» ✓');
    await op7AutoSettle(id,a);
    OPS_DATA=null;loadOps();
  }catch(e){toast('تعذّر الحفظ: '+e.message);}
};

/* ─────────── ٦) التسوية التلقائية (احتياط للواجهة — والحاسم trigger القاعدة) ─────────── */
window.op7AutoSettle=async function(id,addAmt){
  var o=(OPS_DATA||[]).find(function(x){return x.id===id;});if(!o)return;
  var cov=Number(o.covered_aoa)+(+addAmt||0),tgt=Number(o.target_aoa);
  if(o.status==='open'&&tgt>0&&cov>=tgt){
    try{await fetch(SB+'/bdl_ops?id=eq.'+id,{method:'PATCH',headers:H(),body:JSON.stringify({status:'covered'})});
      toast('اكتملت تغطية '+o.ref+' — تحولت تلقائيًا إلى «مكتملة»');}catch(e){}
  }
};

/* ─────────── ٢) بصمة الإيصال في نافذة الإلحاق الفردي ─────────── */
var _rcReadOne=window.rcReadOne;
window.rcReadOne=async function(f){
  window.RC_CUR_FILE=f;window.OP7_META={};
  /* فحص بصمة الصورة قبل القراءة — يمسك التكرار حتى بتغيير اسم الملف */
  var hi=await fpFile(f);
  if(hi&&OPS7){
    try{
      var r=await fetch(SB+'/bdl_op_receipts?select=id,amount_aoa,txn_id&fp_img=eq.'+hi+'&limit=1',{headers:H()});
      if(r.status===400)OPS7=false;
      else{var j=r.ok?await r.json():[];
        if(j[0]){rcSt(' هذا الإيصال مسجل مسبقًا ('+fmt(j[0].amount_aoa,0)+' AOA · '+j[0].txn_id+')');
          $('#rcDup').style.display='block';
          $('#rcDup').textContent=' هذا الإيصال مسجل مسبقًا — نفس الصورة رُفعت من قبل';
          $('#rcSaveBtn').disabled=true;
          if(RC_QUEUE.length){setTimeout(function(){
            $('#rcTxn').value='';$('#rcAmt').value='';$('#rcBank').value='';$('#rcSender').value='';
            $('#rcDup').style.display='none';$('#rcSaveBtn').disabled=false;
            rcNextInQueue();},1100);}
          return false;}}
    }catch(e){}
  }
  window.OP7_META.fp_img=hi;
  var ok=await _rcReadOne(f);
  return ok;
};
var _rcFill=window.rcFill;
window.rcFill=function(p){
  window.OP7_META.date=p.date||p.transaction_date||'';
  window.OP7_META.account=p.account||p.iban||p.account_number||'';
  _rcFill(p);
};

/* الإلحاق: نضيف البصمتين + التاريخ والحساب — مع تدرّج آمن قبل bdl-ops7.sql */
var _opAddReceipt=window.opAddReceipt;
window.opAddReceipt=async function(){
  if(!OP_CUR)return _opAddReceipt();
  var t=($('#rcTxn').value||'').trim(),a=parseFloat(($('#rcAmt').value||'').replace(/[^\d.]/g,''))||0;
  if(t.length<6||a<=0)return _opAddReceipt(); /* رسائل التحقق الأصلية */
  if(!OPS7)return _opAddReceipt();
  var payload={op_id:OP_CUR.id,txn_id:t,amount_aoa:a,side:RC_SIDE,
    bank:($('#rcBank').value||'').trim()||null,sender:($('#rcSender').value||'').trim()||null};
  if(RC_SIDE==='out'){
    var ins=(reconOf(OP_CUR.id).ins||[]).map(function(x){return x.txn;});
    payload.match_txn=ins.indexOf(t)>=0?t:(($('#rcMatch').value)||null);
    if(!payload.match_txn){toast('حدد إيصال الزبون الذي يغطيه هذا الصادر');return;}
  }
  payload.fp=await fpSem(t,a,window.OP7_META.date,window.OP7_META.account,payload.sender,RC_SIDE);
  if(window.OP7_META.fp_img)payload.fp_img=window.OP7_META.fp_img;
  if(window.OP7_META.date)payload.rcpt_date=String(window.OP7_META.date).slice(0,20);
  if(window.OP7_META.account)payload.account=String(window.OP7_META.account).slice(0,40);
  try{
    var r=await fetch(SB+'/bdl_op_receipts',{method:'POST',headers:H(),body:JSON.stringify(payload)});
    if(r.status===400){OPS7=false;return _opAddReceipt();} /* الأعمدة غير مثبتة بعد */
    if(r.status===409){
      $('#rcDup').style.display='block';
      $('#rcDup').textContent=' هذا الإيصال مسجل مسبقًا — القفل الصلب منع التكرار';
      return;}
    if(!r.ok)throw new Error(r.status);
    var newCov=Number(OP_CUR.covered_aoa)+(RC_SIDE==='in'?a:0);
    if(RC_SIDE==='in')await op7AutoSettle(OP_CUR.id,a);
    toast('أُلحق ✓ — التغطية '+fmt(newCov,0)+' / '+fmt(OP_CUR.target_aoa,0));
    window.OP7_META={};window.RC_CUR_FILE=null;
    if(RC_QUEUE.length){OP_CUR.covered_aoa=newCov;
      $('#addrOp').textContent=OP_CUR.ref+' · '+OP_CUR.client_name+' — متبقٍ '+fmt(Math.max(0,OP_CUR.target_aoa-newCov),0)+' AOA';
      OPS_DATA=null;loadOps();rcNextInQueue();return;}
    closeOvl('addr');OPS_DATA=null;loadOps();
  }catch(e){toast('تعذّر الإلحاق: '+e.message);}
};

/* ─────────── ٣) الرفع الجماعي — ١٠٠+ وصل دفعة واحدة ─────────── */
var B7=[]; /* {file,fpImg,parsed,txn,amt,st:'read|dup|review|unknown|saved',opId} */
function b7Ui(){
  var box=$('#b7List');if(!box)return;
  var open=(OPS_DATA||[]).filter(function(o){return o.status==='open'||o.status==='covered';});
  var opts=open.map(function(o){return '<option value="'+o.id+'">'+esc(o.ref+' · '+o.client_name)+'</option>';}).join('');
  var C={read:0,dup:0,review:0,unknown:0,saved:0};
  box.innerHTML=B7.map(function(x,i){
    C[x.st]=(C[x.st]||0)+1;
    var tag=x.st==='read'?'<span class="op7st ok">تمت القراءة ✓</span>'
      :x.st==='saved'?'<span class="op7st ok">حُفظ ✓</span>'
      :x.st==='dup'?'<span class="op7st dup">مكرر</span>'
      :x.st==='review'?'<span class="op7st rev">يحتاج مراجعة</span>'
      :x.st==='busy'?'<span class="op7st unk">⏳</span>'
      :'<span class="op7st unk">غير معروف</span>';
    var sel=(x.st==='review'||x.st==='read')?
      '<select onchange="B7SetOp('+i+',this.value)" style="width:100%;margin-top:6px;height:40px;border:1px solid #C9DFFA;font-family:inherit;font-size:12px;font-weight:700;color:#0B2447;background:#fff">'+
      '<option value="">— اختر العملية —</option>'+opts.replace('value="'+(x.opId||'')+'"','value="'+(x.opId||'')+'" selected')+'</select>':'';
    return '<div style="background:#fff;border:1px solid #E3ECF7;padding:10px 12px;margin-bottom:7px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'+
      '<div class="num" style="min-width:0;font-size:12px;font-weight:800;color:#0B2447;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+
      (x.amt?fmt(x.amt,0)+' AOA · ':'')+esc(x.txn||x.file.name)+
      (x.sender?'<div style="font-size:10.5px;color:var(--muted);font-weight:700">'+esc(x.sender)+'</div>':'')+'</div>'+tag+'</div>'+sel+'</div>';
  }).join('')||'<div class="empty">اختر الملفات — يمكنك تحديد ١٠٠+ دفعة واحدة</div>';
  $('#b7Sum').innerHTML=B7.length?('<b>'+B7.length+'</b> ملف · مقروء <b style="color:#0B7A3B">'+(C.read+C.saved)+'</b>'+
    ' · مكرر <b style="color:#B00020">'+C.dup+'</b> · مراجعة <b style="color:#8A6100">'+C.review+'</b>'+
    ' · غير معروف <b style="color:#5C7699">'+C.unknown+'</b>'):'';
  var ready=B7.filter(function(x){return (x.st==='read'||x.st==='review')&&x.opId&&x.txn&&x.amt;}).length;
  var btn=$('#b7Save');btn.disabled=!ready;btn.textContent=ready?('حفظ الجاهز ('+ready+') — منع المكرر تلقائي'):'حفظ — لا شيء جاهز بعد';
}
window.B7SetOp=function(i,v){if(B7[i]){B7[i].opId=v;if(B7[i].st==='review'&&v&&B7[i].txn&&B7[i].amt)B7[i].st='read';b7Ui();}};

window.op7Bulk=function(){
  B7=[];
  $('#op7t').textContent='رفع جماعي للإيصالات';
  $('#op7s').textContent='قراءة تلقائية · منع مكرر · ربط بالعميل والعملية';
  $('#op7acts').innerHTML=
    '<input id="b7File" type="file" accept="image/*,application/pdf" multiple style="display:none" onchange="op7BulkFiles(this.files)">'+
    '<button class="it main" onclick="document.getElementById(\'b7File\').click()"> اختيار الملفات (١٠٠+ مدعوم)</button>'+
    '<div id="b7Sum" class="num" style="font-size:11.5px;color:#5C7699;margin:4px 2px 8px"></div>'+
    '<div id="b7List" style="max-height:44vh;overflow:auto"></div>'+
    '<button id="b7Save" class="it main" style="margin-top:10px" disabled onclick="op7BulkSave()">حفظ</button>';
  bs.classList.add('on');b7Ui();
};

window.op7BulkFiles=async function(files){
  if(!files||!files.length)return;
  if(!window.ArkanRead){toast('محرك القراءة لم يُحمّل — أعد فتح الصفحة');return;}
  var arr=Array.prototype.slice.call(files);
  arr.forEach(function(f){B7.push({file:f,st:'busy'});});b7Ui();
  /* ١) بصمات الصور دفعة واحدة ثم فحص المكرر بطلب واحد */
  for(var i=0;i<B7.length;i++)if(!B7[i].fpImg)B7[i].fpImg=await fpFile(B7[i].file);
  if(OPS7){try{
    var hs=B7.filter(function(x){return x.fpImg&&x.st==='busy';}).map(function(x){return x.fpImg;});
    if(hs.length){
      var r=await fetch(SB+'/bdl_op_receipts?select=fp_img&fp_img=in.('+hs.join(',')+')',{headers:H()});
      if(r.status===400)OPS7=false;
      else if(r.ok){var seen={};(await r.json()).forEach(function(x){seen[x.fp_img]=1;});
        B7.forEach(function(x){if(x.fpImg&&seen[x.fpImg])x.st='dup';});}
    }}catch(e){}}
  b7Ui();
  /* ٢) قراءة تسلسلية + ربط تلقائي بالعملية عبر اسم المرسل/العميل */
  var open=(OPS_DATA||[]).filter(function(o){return o.status==='open'||o.status==='covered';});
  function matchOp(sender){
    if(!sender)return null;var s=fpNorm(sender);
    var hit=open.filter(function(o){var c=fpNorm(o.client_name);
      return c&&(s.indexOf(c)>=0||c.indexOf(s)>=0);});
    return hit.length===1?hit[0].id:null;
  }
  for(var k=0;k<B7.length;k++){
    var x=B7[k];if(x.st!=='busy')continue;
    try{
      var rr=await ArkanRead.read(x.file),p=(rr&&rr.parsed)||{};
      x.txn=String(p.transaction_id||p.reference||'').replace(/\s+/g,'');
      x.amt=Math.round(+p.amount||0);x.sender=p.sender||'';x.bank=p.bank||'';
      x.date=p.date||p.transaction_date||'';x.account=p.account||p.iban||'';
      if(!x.txn&&!x.amt){x.st='unknown';}
      else{
        /* فحص تكرار رقم العملية */
        var dq=await fetch(SB+'/bdl_op_receipts?select=id&txn_id=eq.'+encodeURIComponent(x.txn)+'&side=eq.in&limit=1',{headers:H()});
        var dj=dq.ok?await dq.json():[];
        if(x.txn&&dj[0])x.st='dup';
        else{x.opId=matchOp(x.sender);x.st=(x.opId&&x.txn&&x.amt)?'read':'review';}
      }
    }catch(e){x.st='unknown';}
    if(k%3===0)b7Ui();
  }
  b7Ui();
};

window.op7BulkSave=async function(){
  var todo=B7.filter(function(x){return (x.st==='read'||x.st==='review')&&x.opId&&x.txn&&x.amt;});
  if(!todo.length)return;
  $('#b7Save').disabled=true;var ok=0,dups=0;
  for(var i=0;i<todo.length;i++){
    var x=todo[i];
    var body={op_id:x.opId,txn_id:x.txn,amount_aoa:x.amt,side:'in',
      bank:(x.bank||'').slice(0,40)||null,sender:(x.sender||'').slice(0,60)||null};
    if(OPS7){
      body.fp=await fpSem(x.txn,x.amt,x.date,x.account,x.sender,'in');
      if(x.fpImg)body.fp_img=x.fpImg;
      if(x.date)body.rcpt_date=String(x.date).slice(0,20);
      if(x.account)body.account=String(x.account).slice(0,40);
    }
    try{
      var r=await fetch(SB+'/bdl_op_receipts',{method:'POST',headers:H(),body:JSON.stringify(body)});
      if(r.status===400&&OPS7){OPS7=false;delete body.fp;delete body.fp_img;delete body.rcpt_date;delete body.account;
        r=await fetch(SB+'/bdl_op_receipts',{method:'POST',headers:H(),body:JSON.stringify(body)});}
      if(r.status===409){x.st='dup';dups++;}
      else if(r.ok){x.st='saved';ok++;}
    }catch(e){}
    b7Ui();
  }
  toast('حُفظ '+ok+' وصل'+(dups?' · صُدّ '+dups+' مكرر':'')+' ✓');
  if(!OPS7)toast('الصق bdl-ops7.sql في Supabase لتفعيل بصمات التكرار الكاملة');
  OPS_DATA=null;await loadOps();b7Ui();
};

/* ─────────── ٥) تقرير PDF مجمّع حسب الشركة/الجهة ─────────── */
window.op7GroupByCompany=function(receipts,ops){
  var opBy={};(ops||[]).forEach(function(o){opBy[o.id]=o;});
  var G={};
  (receipts||[]).forEach(function(r){
    if(r.side&&r.side!=='in')return;
    var o=opBy[r.op_id];if(!o||o.status==='cancelled')return;
    var co=String(r.sender||o.client_name||'غير محدد').trim().replace(/\s·.*$/,'')||'غير محدد';
    var g=G[co]=G[co]||{name:co,n:0,total:0,manual:0,ops:{},txns:[]};
    g.n++;g.total+=Number(r.amount_aoa)||0;
    if(r.manual||/^MANUAL-/.test(r.txn_id||''))g.manual++;
    g.ops[r.op_id]=1;
    if(g.txns.length<8)g.txns.push((r.manual||/^MANUAL-/.test(r.txn_id||'')?'يدوي':r.txn_id)+' · '+fmt(r.amount_aoa,0));
  });
  return Object.keys(G).map(function(k){
    var g=G[k],req=0,allSet=true;
    Object.keys(g.ops).forEach(function(id){var o=opBy[id];if(!o)return;
      req+=Number(o.target_aoa)||0;
      if(!(o.status==='covered'||o.status==='confirmed'||o.status==='closed'||
        (Number(o.target_aoa)>0&&Number(o.covered_aoa)>=Number(o.target_aoa))))allSet=false;});
    g.required=req;g.diff=g.total-req;
    g.status=req>0?(allSet||g.total>=req?'تمت التسوية':'ناقصة'):'—';
    return g;
  }).sort(function(a,b){return b.total-a.total;});
};

window.op7Report=async function(){
  toast('جارٍ إعداد تقرير الشركات…');
  try{
    if(!OPS_DATA){await loadOps();}
    var ids=(OPS_DATA||[]).map(function(o){return o.id;});
    var rs=[];
    for(var i=0;i<ids.length;i+=40){
      var r=await fetch(SB+'/bdl_op_receipts?select=*&op_id=in.('+ids.slice(i,i+40).join(',')+')&order=created_at.desc',{headers:H()});
      if(r.ok)rs=rs.concat(await r.json());
    }
    var G=op7GroupByCompany(rs,OPS_DATA);
    if(!G.length){toast('لا إيصالات بعد — التقرير فارغ');return;}
    /* canvas عربي مثالي — نفس أسلوب تقرير الإقفال */
    var W=1080,rowH=132,Hh=340,H_=Hh+G.length*rowH+180;
    var c=document.createElement('canvas');c.width=W;c.height=H_;
    var x=c.getContext('2d'),F="'IBM Plex Sans Arabic','Inter',system-ui,sans-serif";
    if(!x.roundRect){x.roundRect=function(a,b,w,h,r){r=Math.min(r,w/2,h/2);
      this.moveTo(a+r,b);this.arcTo(a+w,b,a+w,b+h,r);this.arcTo(a+w,b+h,a,b+h,r);
      this.arcTo(a,b+h,a,b,r);this.arcTo(a,b,a+w,b,r);this.closePath();};}
    x.fillStyle='#F6FAFD';x.fillRect(0,0,W,H_);
    var g=x.createLinearGradient(0,0,W,240);
    g.addColorStop(0,'#0B2F70');g.addColorStop(.55,'#0A56B8');g.addColorStop(1,'#19A9F5');
    x.fillStyle=g;x.fillRect(0,0,W,240);
    x.textAlign='right';x.fillStyle='#fff';x.font='800 44px '+F;
    x.fillText('تقرير التسوية حسب الشركة — BDL',W-60,100);
    x.font='600 27px '+F;x.fillStyle='rgba(255,255,255,.9)';
    var TT=0,TN=0;G.forEach(function(q){TT+=q.total;TN+=q.n;});
    x.fillText(new Date().toISOString().slice(0,10)+' · '+G.length+' جهة · '+TN+' حوالة · '+fmt(TT,0)+' AOA',W-60,155);
    var ty=Hh-40;
    G.forEach(function(q){
      x.fillStyle='#fff';x.beginPath();x.roundRect(50,ty,W-100,rowH-16,16);x.fill();
      x.strokeStyle='#E3ECF7';x.lineWidth=2;x.stroke();
      x.textAlign='right';x.fillStyle='#0B2447';x.font='800 28px '+F;
      x.fillText(q.name,W-80,ty+40);
      x.font='600 21px '+F;x.fillStyle='#5C7699';
      x.fillText(q.n+' حوالة'+(q.manual?' (منها '+q.manual+' بدون وصل)':'')+' · المطلوب '+fmt(q.required,0)+' AOA',W-80,ty+74);
      x.font='500 18px '+F;x.fillStyle='#8AA3C4';
      x.fillText(q.txns.slice(0,4).join('  |  '),W-80,ty+102);
      x.textAlign='left';x.fillStyle='#0B2F70';x.font='800 30px '+F;
      x.fillText(fmt(q.total,0)+' AOA',80,ty+44);
      var stc=q.status==='تمت التسوية'?'#0B7A3B':q.status==='ناقصة'?'#B00020':'#5C7699';
      x.fillStyle=stc;x.font='800 22px '+F;
      x.fillText(q.status+(q.required>0&&q.diff?' · الفرق '+(q.diff>0?'+':'')+fmt(q.diff,0):''),80,ty+80);
      ty+=rowH;
    });
    x.textAlign='center';x.fillStyle='#8AA3C4';x.font='500 21px '+F;
    x.fillText('lbdal.com · أُصدر تلقائيًا '+new Date().toLocaleString('en-GB'),W/2,H_-40);
    var img=c.toDataURL('image/jpeg',.92);
    var JS=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
    if(!JS)throw new Error('jsPDF لم يُحمَّل — تحقق من الاتصال');
    var pdf=new JS({unit:'px',format:[W/2,H_/2]});
    pdf.addImage(img,'JPEG',0,0,W/2,H_/2);
    pdf.save('BDL-companies-'+new Date().toISOString().slice(0,10)+'.pdf');
    toast('صدر تقرير الشركات ✓');
  }catch(e){toast('تعذّر التقرير: '+e.message);}
};

/* ─────────── ٨) دمج العمليات المكررة — عملية واحدة لكل زبون ───────────
   يجمع العمليات المفتوحة لنفس الزبون: يُبقي الأنسب (هدف حقيقي ← إيصالات أكثر ← الأقدم)،
   ينقل إليه كل الإيصالات، يجمع الأهداف، ينسخ أقفال REQ للملاحظة، ويلغي الباقي نهائيًا. */
window.op7Merge=async function(){
  var open=(OPS_DATA||[]).filter(function(o){return o.status==='open';});
  var G={};
  open.forEach(function(o){
    var k=fpNorm(o.client_name);if(k.length<3)return;
    (G[k]=G[k]||[]).push(o);
  });
  var groups=Object.keys(G).filter(function(k){return G[k].length>1;});
  if(!groups.length){toast('لا عمليات مكررة — كل زبون له عملية واحدة ✓');return;}
  var dupN=groups.reduce(function(s,k){return s+G[k].length-1;},0);
  if(!confirm('وُجد '+groups.length+' زبون بعمليات مكررة ('+dupN+' عملية زائدة).\n'+
    'سيُبقى لكل زبون عملية واحدة: تُنقل إليها كل الإيصالات وتُجمع الأهداف والأقفال، وتُلغى الزائدة نهائيًا.\nمتابعة الدمج؟'))return;
  var merged=0,fails=0;
  for(var gi=0;gi<groups.length;gi++){
    var arr=G[groups[gi]].slice();
    arr.sort(function(a,b){
      var ta=Number(a.target_aoa)>0?1:0,tb=Number(b.target_aoa)>0?1:0;
      if(ta!==tb)return tb-ta;
      var ra=Number(a.rcpt_count||0),rb=Number(b.rcpt_count||0);
      if(ra!==rb)return rb-ra;
      return String(a.created_at||'').localeCompare(String(b.created_at||''));});
    var keep=arr[0],tgt=Number(keep.target_aoa)||0,tags=[];
    for(var di=1;di<arr.length;di++){
      var d=arr[di];
      try{
        /* ١) نقل الإيصالات للعملية الباقية */
        var mv=await fetch(SB+'/bdl_op_receipts?op_id=eq.'+d.id,{method:'PATCH',headers:H(),
          body:JSON.stringify({op_id:keep.id})});
        if(!mv.ok&&mv.status!==404)throw new Error('mv '+mv.status);
        /* ٢) جمع الهدف + أقفال REQ */
        tgt+=Number(d.target_aoa)||0;
        var tg=String(d.note||'').match(/REQ:[^\s|·]+/g)||[];
        if(d.req_ref)tg.push('REQ:'+d.req_ref);
        tg.forEach(function(x){if(tags.indexOf(x)<0&&String(keep.note||'').indexOf(x)<0)tags.push(x);});
        /* ٣) إلغاء المكررة نهائيًا (قفل req_ref يبقى حيًا في الصف الملغى) */
        var cx=await fetch(SB+'/bdl_ops?id=eq.'+d.id,{method:'PATCH',headers:H(),
          body:JSON.stringify({status:'cancelled',note:String(d.note||'').slice(0,3800)+' | ↪ دُمجت في '+keep.ref})});
        if(!cx.ok)throw new Error('cx '+cx.status);
        merged++;
      }catch(e){fails++;console.warn('merge',d.ref,e.message);}
    }
    /* ٤) تحديث العملية الباقية: الهدف المجموع + الأقفال المنسوخة */
    try{
      var nb={target_aoa:tgt};
      if(tags.length)nb.note=(String(keep.note||'')+(keep.note?' | ':'')+tags.join(' | ')).slice(0,4000);
      await fetch(SB+'/bdl_ops?id=eq.'+keep.id,{method:'PATCH',headers:H(),body:JSON.stringify(nb)});
    }catch(e){}
  }
  toast('دُمج '+merged+' عملية مكررة ✓'+(fails?' · تعذّر '+fails+' — أعد المحاولة':''));
  OPS_DATA=null;await loadOps();
};

/* ─────────── الأرشفة اليدوية + قسم العمليات المؤرشفة ─────────── */
window.op7Archive=async function(id){
  var o=(OPS_DATA||[]).find(function(x){return x.id===id;});if(!o)return;
  var rc=reconOf(id),warn='';
  if(rc.in_n>0&&rc.matched<rc.in_n)warn='\n مطابقة الموردين ناقصة ('+rc.matched+'/'+rc.in_n+').';
  if(!confirm('أرشفة '+o.ref+' كعملية مسوّاة؟'+warn+'\nملاحظة: الربح يُسجَّل من «تسوية وإقفال» — الأرشفة المباشرة بلا ربح.'))return;
  try{
    await fetch(SB+'/bdl_ops?id=eq.'+id,{method:'PATCH',headers:H(),body:JSON.stringify({status:'closed'})});
    toast('✓ تمت التسوية — '+o.ref+' انتقلت للأرشيف');
    OPS_DATA=null;loadOps();
  }catch(e){toast('تعذّرت الأرشفة');}
};
var _go7=window.go;
window.go=function(t){_go7(t);if(t==='arch')op7ArchList();};
window.op7ArchList=async function(){
  var v=document.getElementById('v-arch');if(!v)return;
  var box=document.getElementById('op7ArchBox');
  if(!box){box=document.createElement('div');box.id='op7ArchBox';v.insertBefore(box,v.firstChild);}
  try{
    var r=await fetch(SB+'/bdl_ops_coverage?select=*&status=in.(closed,confirmed)&order=created_at.desc&limit=120',{headers:H()});
    var j=r.ok?await r.json():[];
    if(!j.length){box.innerHTML='';return;}
    box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin:2px 0 10px">'+
      '<b style="font-size:14px;color:var(--navy)">عمليات مسوّاة — '+j.length+'</b>'+
      '<button class="selall" onclick="op7Report()" style="height:38px">تقرير الشركات</button></div>'+
      j.map(function(o){
        return '<div class="op7card" onclick="op7Details(\''+o.id+'\')" style="opacity:.94">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'+
          '<div style="min-width:0"><b style="font-size:13.5px;color:var(--navy)">'+esc(o.client_name)+'</b>'+
          '<div class="num" style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(o.ref)+' · '+fmt(o.covered_aoa,0)+' AOA</div></div>'+
          '<span class="st done" style="flex-shrink:0">تمت التسوية ✓</span></div></div>';
      }).join('')+'<div style="height:14px"></div>';
  }catch(e){box.innerHTML='';}
};

/* ─────────── أزرار الشريط: رفع جماعي + تقرير الشركات + دمج المكرر ─────────── */
(function(){
  var bar=document.querySelector('#v-ops .fbar .row');if(!bar)return;
  var b1=document.createElement('button');b1.className='selall';b1.textContent='⇪ جماعي';
  b1.onclick=function(){op7Bulk();};
  var b2=document.createElement('button');b2.className='selall';b2.textContent='تقرير الشركات';
  b2.onclick=function(){op7Report();};
  var b3=document.createElement('button');b3.className='selall';b3.textContent=' دمج المكرر';
  b3.onclick=function(){op7Merge();};
  bar.appendChild(b1);bar.appendChild(b2);bar.appendChild(b3);
})();

/* إعادة الرسم بالنمط الجديد إن كانت البيانات محمّلة قبل هذه الطبقة */
try{if(window.OPS_DATA)renderOps();}catch(e){}
console.log('bdl-ops7 ✓ — البطاقات النظيفة، البصمات، الرفع الجماعي، تقرير الشركات');
})();
