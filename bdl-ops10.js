/* ═══════════════════════════════════════════════════════════════════
   bdl-ops10.js — لوحة الأرباح المباشرة v2.3 (Build 1148) — طبقة إضافية فوق settle-v2
   • Profit Engine مركزي: الربح = الإيراد − التكلفة − الرسوم − المصاريف (حساب بدقة BigInt، تقريب عند العرض فقط)
   • Summary: إجمالي / اليوم / الأسبوع / الشهر / متوسط العملية + التغيّر % مقابل الفترة السابقة
   • رسم بياني تفاعلي (يومي/أسبوعي/شهري/سنوي) + إحصاءات الفترة عند النقر
   • حجم التداول / الإيراد / التكلفة / الرسوم / الصافي — منفصلة. ربح إجمالي / خسارة إجمالية / نسبة الربح
   • الأرباح حسب العملة + اختيار عملة العرض (MRU / AOA)
   • كل عملية Card + Bottom Sheet تفاصيل مع معادلة الربح + تعديل الرسوم
   • Drill-down من الإجمالي حتى العملية الأصلية. فلاتر + بحث. تصدير CSV/Excel/PDF. سجل أرباح.
   • Real-Time: Supabase Realtime (WebSocket) + اعتراض طلبات الكتابة + مؤقّت احتياطي
   • على الخادم (bdl-ops10.sql): view bdl_tx_profit + RPC bdl_profit_summary/buckets + bdl_profit_ledger.
     يعمل بدون SQL (يحسب على الجهاز)، ويتحوّل تلقائيًا للحساب الخادمي حين يُلصق.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
(function(){
const q=s=>document.querySelector(s);
const TZ=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'UTC';
const S={refRb:null,base:'MRU',period:'day',range:'30',rows:[],all:null,srv:null,srvOk:null,ledger:null,ledgerOk:null,
  page:0,more:false,sel:null,open:{},f:{q:'',ccy:'',pair:'',client:'',status:'done',pl:'',min:'',max:'',from:'',to:''},
  last:null,busy:false,ws:null,wsOk:false};

/* ═══════ ١) الحساب الدقيق — BigInt بمقياس 1e6 ═══════ */
const SC=1000000n;
const D=x=>{ if(x==null||x==='')return null; const s=String(x); const m=s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if(!m)return BigInt(Math.round(Number(x)*1e6)); const frac=(m[3]||'').padEnd(6,'0').slice(0,6);
  return BigInt((m[1]||'')+m[2]+frac); };
const N=b=>b==null?null:Number(b)/1e6;
const mulDiv=(a,b,c)=>c===0n?null:(a*b)/c;               /* a*b/c بلا فقدان */
/* ═══════ ٢) Profit Engine لعملية واحدة ═══════ */
function eng(t){
  const tgt=t.settle_ccy||'AOA',m=t.meta||{};
  const amt=D(t.amount),rev=D(t.settle_amount),cost=D(t.cost),fee=D(m.fee)||0n,exp=D(m.expense)||0n;
  const old=m.pair==='MRU_AOA_OLD'||(t.ccy==='MRU'&&tgt==='AOA');
  const o={tgt,old,ok:false,amt:N(amt),rev:N(rev),cost:N(cost),fee:N(fee),exp:N(exp),net:null,netMru:null,netAoa:null,pct:null,rs:null,rb:null,
    dir:(t.ccy||'?')+' → '+tgt,who:(t.bdl_customers&&t.bdl_customers.name)||t.customer_name||m.customer||m.name||''};
  if(amt==null||rev==null||amt<=0n)return o;
  o.rs=old?N(mulDiv(amt,10n*SC,rev)):N(mulDiv(rev,SC,amt));
  if(cost==null||cost===0n)return o;
  const net=rev-cost-fee-exp;                                 /* بالعملة الهدف */
  o.ok=true;o.net=N(net);o.pct=N(mulDiv(net,100n*SC,cost));
  o.rb=m.rate_cost?Number(m.rate_cost):(old?N(mulDiv(amt,10n*SC,cost)):N(mulDiv(cost,SC,amt)));
  if(tgt==='MRU'){o.netMru=o.net;o.netAoa=t.ccy==='AOA'?N(mulDiv(net,amt,rev)):null;}
  else if(old){o.netMru=N(mulDiv(net,amt,cost));o.netAoa=o.net;}          /* تحويل بسعر الشراء */
  else if(t.ccy==='MRU'){o.netMru=N(mulDiv(net,amt,rev));o.netAoa=tgt==='AOA'?o.net:null;}
  else{o.netAoa=tgt==='AOA'?o.net:null;
    /* ربح بعملة أجنبية ← أوقية بسعر الشراء المرجعي (آخر تسوية أوقية←كوانزا) */
    if(tgt==='AOA'&&S.refRb){o.netMru=N(mulDiv(net,BigInt(Math.round(S.refRb*1e6)),10n*SC));o.viaRef=true;}}
  return o;
}
function refRb(rows){const r=(rows||[]).find(t=>{const m=t.meta||{};return (m.pair==='MRU_AOA_OLD'||(t.ccy==='MRU'&&(t.settle_ccy||'AOA')==='AOA'))&&Number(t.cost)>0&&Number(t.amount)>0&&(t.status==='done'||t.status==='settled');});
  if(!r)return null;const m=r.meta||{};return Number(m.rate_cost)||Number(r.amount)*10/Number(r.cost);}
const netBase=e=>S.base==='MRU'?e.netMru:e.netAoa;
/* أعلام العملات — دوائر بألوان الأعلام (SVG مضمّن) */
const FLAG_FILE={AOA:'ao',MRU:'mr',CNY:'cn',AED:'ae',MAD:'ma',USD:'us',EUR:'eu',USDT:'usdt',XOF:'cfa',CFA:'cfa'};
/* علم زجاجي كما في صفحة التسوية: PNG دائري محلي + حلقة بيضاء + ظل + لمعة */
function flag(c,sz,glass){sz=sz||26;const f=FLAG_FILE[c];
  const inner=f?'<img src="flags/'+f+'.png" alt="'+esc(c)+'" loading="lazy" onerror="this.style.display=\'none\'">'
    :'<span class="p10fx0">'+esc(String(c||'?').slice(0,3))+'</span>';
  return '<span class="p10fw'+(glass?' glass':'')+'" style="width:'+sz+'px;height:'+sz+'px">'+inner+'</span>';}
const shortRef=r=>{r=String(r||'—');return r.length>14?'…'+r.slice(-8):r;};
/* شارة التغيّر: تُعرض فقط حين تكون المقارنة ذات معنى */
function chg(cur,prev,lblPrev){
  if(prev&&cur)return arrow(cur,prev);
  if(prev&&!cur)return '<span class="p10prev">'+esc(lblPrev||'السابق')+' <span class="num">'+sgn(prev,0)+'</span></span>';
  return '';}
/* ═══════ ٣) Aggregation Engine ═══════ */
function agg(rows){
  const T={n:0,na:0,net:0,netMru:0,netAoa:0,vol:0,rev:0,cost:0,fee:0,gp:0,gl:0,wins:0,losses:0,best:null,worst:null,other:{},ids:[]};
  rows.forEach(t=>{const e=t._e||(t._e=eng(t));T.n++;T.vol+=e.amt||0;T.rev+=e.rev||0;T.ids.push(t.id);
    if(!e.ok){T.na++;return;}
    T.cost+=e.cost;T.fee+=e.fee+e.exp;
    const v=netBase(e);
    if(v==null){T.other[e.tgt]=(T.other[e.tgt]||0)+e.net;return;}
    T.net+=v;if(e.netMru!=null)T.netMru+=e.netMru;if(e.netAoa!=null)T.netAoa+=e.netAoa;
    if(v>0){T.gp+=v;T.wins++;}else if(v<0){T.gl+=v;T.losses++;}
    if(!T.best||v>T.best.v)T.best={v,t};if(!T.worst||v<T.worst.v)T.worst={v,t};});
  T.avg=T.n-T.na?T.net/(T.n-T.na):0;T.pct=T.cost?(T.netAoa||T.net)/T.cost*100:0;
  T.rate=T.wins+T.losses?T.wins/(T.wins+T.losses)*100:0;return T;}
/* ═══════ أدوات ═══════ */
const dayOf=t=>new Date(t.updated_at||t.created_at);
const sgn=(v,d)=>(v>=0?'+':'−')+fmt(Math.abs(v),d==null?2:d);
const money=(v,d,c)=>'<span class="num">'+sgn(v,d)+'</span> '+esc(c||S.base);
const cls=v=>v>0?'pos':v<0?'neg':'zero';
const startOf={day:d=>{d=new Date(d);d.setHours(0,0,0,0);return d;},
  week:d=>{d=startOf.day(d);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;},
  month:d=>{d=startOf.day(d);d.setDate(1);return d;},year:d=>{d=startOf.day(d);d.setMonth(0,1);return d;}};
const bucketKey=(d,p)=>{d=startOf[p](d);return p==='day'?d.toLocaleDateString('en-GB'):p==='week'?'أسبوع '+d.toLocaleDateString('en-GB'):
  p==='month'?d.toLocaleDateString('en-GB',{month:'2-digit',year:'numeric'}):String(d.getFullYear());};
const pctChg=(a,b)=>b?((a-b)/Math.abs(b)*100):(a?100:0);
const arrow=(a,b)=>{const c=pctChg(a,b);return '<span class="p10chg '+(c>=0?'up':'dn')+'">'+(c>=0?'↑':'↓')+' '+Math.abs(c).toFixed(1)+'%</span>';};
function rangeBounds(){const now=new Date(),f=S.f;let from=null,to=null;
  if(f.from)from=new Date(f.from+'T00:00:00');if(f.to){to=new Date(f.to+'T00:00:00');to.setDate(to.getDate()+1);}
  if(!from&&!to){ if(S.range==='today')from=startOf.day(now);else if(S.range==='7'){from=startOf.day(now);from.setDate(from.getDate()-6);}
    else if(S.range==='30'){from=startOf.day(now);from.setDate(from.getDate()-29);}else if(S.range==='year')from=startOf.year(now);}
  return {from,to};}
function passes(t){const e=t._e||(t._e=eng(t)),f=S.f;
  if(f.q){const s=f.q.toLowerCase();if(String(t.ref||'').toLowerCase().indexOf(s)<0&&e.who.toLowerCase().indexOf(s)<0)return false;}
  if(f.ccy&&t.ccy!==f.ccy&&e.tgt!==f.ccy)return false;
  if(f.pair&&e.dir!==f.pair)return false;
  if(f.client&&e.who.toLowerCase().indexOf(f.client.toLowerCase())<0)return false;
  const v=netBase(e);
  if(f.pl==='win'&&!(v>0))return false;if(f.pl==='loss'&&!(v<0))return false;if(f.pl==='na'&&e.ok)return false;
  if(f.min!==''&&!(Math.abs(v||0)>=Number(f.min)))return false;if(f.max!==''&&!(Math.abs(v||0)<=Number(f.max)))return false;
  return true;}
const visRows=()=>S.rows.filter(passes);

/* ═══════ ٤) التنسيق ═══════ */
const css=document.createElement('style');css.textContent=`
#v-profit .seg{display:none}
.p10h{color:#fff;margin:12px 12px 0;padding:16px 16px 14px;border-radius:16px;position:relative;overflow:hidden;cursor:pointer;
  background:linear-gradient(90deg,#D9B44A,#FFE9A8,#D9B44A) top/100% 3px no-repeat,
             radial-gradient(120% 90% at 85% -10%,rgba(64,169,255,.35) 0%,rgba(64,169,255,0) 45%),
             radial-gradient(100% 120% at -10% 110%,rgba(21,63,148,.9) 0%,rgba(21,63,148,0) 55%),
             linear-gradient(140deg,#071B45 0%,#0B2F70 48%,#0A56B8 100%);
  padding-top:19px;box-shadow:0 22px 48px -18px rgba(7,27,69,.55)}
.p10h::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 26px),repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 26px)}
.p10h::before{content:"";position:absolute;top:0;bottom:0;width:46%;left:-60%;pointer-events:none;
  background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.14) 48%,transparent 100%);animation:p10sheen 2.4s .5s 1 forwards}
@keyframes p10sheen{to{left:130%}}
.p10spark{margin:10px -4px -2px;position:relative}
.p10spark svg{width:100%;height:46px;display:block}
.p10srv{font-family:"Inter",sans-serif;font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:3px 8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);text-transform:uppercase}
.p10live{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;opacity:.9;font-family:"Inter",sans-serif}
.p10live>span{display:flex;align-items:center;gap:6px}
.p10dot{width:7px;height:7px;border-radius:50%;background:#3DDC84;box-shadow:0 0 0 0 rgba(61,220,132,.6);animation:p10p 1.6s infinite}
.p10dot.busy{background:#FFD166;animation:none}.p10dot.off{background:#9AB;animation:none}
@keyframes p10p{0%{box-shadow:0 0 0 0 rgba(61,220,132,.6)}70%{box-shadow:0 0 0 7px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}
.p10lbl{font-size:12px;opacity:.85;margin-top:10px;display:flex;justify-content:space-between;align-items:center}
.p10base{display:flex;background:rgba(255,255,255,.15);border-radius:8px;overflow:hidden}
.p10base button{border:0;background:transparent;color:#fff;font-size:10.5px;font-weight:700;padding:4px 9px;font-family:"Inter",sans-serif;cursor:pointer}
.p10base button.on{background:#fff;color:var(--navy)}
.p10tot{font-size:31px;font-weight:800;letter-spacing:-.5px;margin-top:2px;font-family:"Inter",sans-serif;direction:ltr;text-align:right}
.p10tot small{font-size:15px;font-weight:700;opacity:.85;margin-left:4px}
.p10sub{font-size:11.5px;opacity:.9;margin-top:5px;line-height:1.7}
.p10chg{font-weight:800;font-family:"Inter",sans-serif;padding:1px 7px;border-radius:999px;font-size:10.5px}
.p10h .p10chg.up{background:rgba(61,220,132,.25);color:#C8FFDD}.p10h .p10chg.dn{background:rgba(255,120,120,.3);color:#FFD6D6}
.p10chg.up{background:#E3F7EE;color:var(--ok)}.p10chg.dn{background:#FDE8E8;color:var(--bad)}
.p10cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 12px 0}
.p10c{background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 12px;cursor:pointer}
.p10c .l{font-size:11px;color:var(--muted);font-weight:600;display:flex;justify-content:space-between;align-items:center}
.p10c .v{font-size:18px;font-weight:800;font-family:"Inter",sans-serif;margin-top:3px;direction:ltr;text-align:right}
.p10c .v small{font-size:10.5px;font-weight:600;opacity:.7;margin-left:3px}
.p10c .s{font-size:10.5px;color:var(--muted);margin-top:2px}
.pos{color:var(--ok)}.neg{color:var(--bad)}.zero{color:var(--muted)}
.p10sec{background:#fff;border:1px solid var(--line);border-radius:14px;margin:10px 12px 0;padding:12px 14px}
.p10sec .p10hd{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;color:var(--navy);margin-bottom:8px}
.p10tabs{display:flex;background:var(--wash);border:1px solid var(--line);border-radius:9px;overflow:hidden}
.p10tabs button{flex:1;border:0;background:transparent;padding:6px 4px;font-size:11px;font-weight:700;color:var(--muted);font-family:inherit;cursor:pointer}
.p10tabs button.on{background:var(--navy);color:#fff}
.p10chart svg{width:100%;height:150px;display:block}
.p10chart .bar{cursor:pointer}.p10chart .bar rect.b{transition:opacity .15s}.p10chart .bar:hover rect.b,.p10chart .bar.on rect.b{opacity:1}
.p10kv{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:11.5px;margin-top:8px}
.p10kv div{display:flex;justify-content:space-between;border-bottom:1px dashed var(--line);padding:5px 0;color:var(--muted)}
.p10kv b{font-family:"Inter",sans-serif;color:var(--ink);font-weight:700;text-align:left;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.p10row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.p10row:last-child{border-bottom:0}.p10row b{font-family:"Inter",sans-serif;font-weight:800;color:var(--ink);font-size:13.5px}
.p10row.tot{border-top:2px solid var(--navy);border-bottom:0;margin-top:2px;color:var(--navy);font-weight:800}
.p10row.tot b{font-size:16px}
.p10tools{display:flex;gap:6px;margin:10px 12px 0}
.p10tools .srch{flex:1;display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 11px}
.p10tools input{flex:1;border:0;outline:0;background:transparent;font-size:12.5px;font-family:inherit;color:var(--ink);min-width:0}
.p10tools .tb{border:1px solid var(--line);background:#fff;color:var(--navy);font-weight:800;font-size:11.5px;padding:0 12px;border-radius:10px;font-family:inherit;cursor:pointer;white-space:nowrap}
.p10tools .tb.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.p10rng{display:flex;gap:6px;margin:10px 12px 0}
.p10rng button{flex:1;border:1px solid var(--line);background:#fff;color:var(--muted);font-size:11.5px;font-weight:700;padding:7px 4px;border-radius:9px;font-family:inherit;cursor:pointer}
.p10rng button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.p10g{cursor:pointer}.p10g .t .p10n{font-size:11px;color:var(--muted);font-weight:600}.p10g .t .p10n b{color:var(--navy);font-family:"Inter",sans-serif}
.p10g .v{direction:ltr;text-align:right}
.p10btn{display:inline-block;margin-top:9px;font-size:11.5px;font-weight:800;color:var(--blue);border:1px solid #D6E4F7;background:#F4F8FF;padding:6px 12px;border-radius:8px;font-family:inherit;cursor:pointer}
.p10ops{display:none;border-top:1px solid var(--line);margin:10px -14px -13px;background:var(--wash)}
.p10g.open .p10ops{display:block}
.p10op{display:flex;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);cursor:pointer;background:transparent}
.p10op:active{background:#EEF3FA}.p10op:last-child{border-bottom:0}
.p10op .ref{font-size:11px;color:var(--blue);font-weight:700;font-family:"Inter",sans-serif}
.p10op .who{font-size:12.5px;font-weight:700;color:var(--ink);margin-top:1px}
.p10op .amt{font-size:11px;color:var(--muted);margin-top:2px;font-family:"Inter",sans-serif}
.p10op .rt{font-size:10.5px;color:var(--muted);margin-top:1px}.p10op .rt b{font-family:"Inter",sans-serif;font-weight:700;color:#0B2447}
.p10op .r{text-align:left;white-space:nowrap}
.p10op .pf{font-size:14px;font-weight:800;font-family:"Inter",sans-serif}.p10op .pf.na{color:var(--warn);font-size:11px}
.p10op .pa{font-size:10.5px;color:var(--muted);margin-top:2px;font-family:"Inter",sans-serif}
.p10more{display:block;width:calc(100% - 24px);margin:6px 12px 0;padding:11px;border:1px dashed var(--line);background:#fff;color:var(--blue);font-weight:800;font-size:12px;border-radius:10px;font-family:inherit;cursor:pointer}
.p10note{margin:8px 12px 0;background:#FFF9E8;border:1px solid #EAD48A;color:#8A6100;border-radius:10px;padding:8px 12px;font-size:11.5px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.p10note b{font-family:"Inter",sans-serif}
/* Wise-style */
.p10fw{display:inline-grid;place-items:center;border-radius:50%;overflow:hidden;position:relative;flex:0 0 auto;vertical-align:middle;background:#0B2F70}
.p10fw img{width:100%;height:100%;object-fit:cover;display:block}
.p10fw .p10fx0{font:800 .38em "Inter",sans-serif;color:#fff;letter-spacing:.02em}
.p10fw.glass{box-shadow:0 0 0 3px rgba(255,255,255,.92),0 8px 22px rgba(3,20,60,.45),0 0 0 7px rgba(255,255,255,.14)}
.p10fw.glass::after{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(160deg,rgba(255,255,255,.45) 0%,rgba(255,255,255,.08) 38%,rgba(255,255,255,0) 52%,rgba(0,0,0,.10) 100%);pointer-events:none}
.p10fw.glass::before{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);z-index:1;pointer-events:none}
.p10base button .p10fw{box-shadow:0 0 0 1.5px rgba(255,255,255,.8)}
.p10prev{font-size:10.5px;color:var(--muted);font-weight:600;margin:0 6px}
.p10w .l .p10chg{margin:0 6px}
.p10h .p10prev{color:rgba(255,255,255,.85)}
.p10hero2{display:flex;align-items:center;gap:16px;margin-top:8px}
.p10hero2 .p10tot{margin:0;font-size:38px;line-height:1.02;min-width:0;overflow:hidden;font-variant-numeric:tabular-nums;text-shadow:0 2px 14px rgba(0,0,0,.25)}
.p10hero2 .p10tot small{font-size:14px;display:block;text-align:right;opacity:.8;margin:2px 0 0}
.p10base button{display:flex;align-items:center;gap:5px;padding:4px 10px 4px 6px}
.p10wl{margin:10px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(min-width:640px){.p10wl{grid-template-columns:repeat(4,1fr)}}
.p10w{position:relative;background:linear-gradient(180deg,#FFFFFF 0%,#FBFDFF 100%);border:1px solid var(--line);border-radius:0;padding:12px 13px 10px;cursor:pointer;overflow:hidden;
  box-shadow:0 1px 0 rgba(11,47,112,.04);transition:transform .12s ease,box-shadow .12s ease;border-inline-start:3px solid var(--line)}
.p10w.up{border-inline-start-color:#1FA855}.p10w.dn{border-inline-start-color:#D64545}
.p10w:active{transform:scale(.985)}
.p10w .txt{position:relative;z-index:1}
.p10w .l{font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.01em;display:flex;justify-content:space-between;align-items:center;gap:6px}
.p10w .v{font-size:21px;font-weight:800;font-family:"Inter",sans-serif;font-variant-numeric:tabular-nums;direction:ltr;text-align:right;margin-top:5px;letter-spacing:-.4px;line-height:1.05}
.p10w .v small{font-size:10.5px;font-weight:700;opacity:.6;margin-left:3px}
.p10w .s{font-size:10.5px;color:var(--muted);margin-top:4px;position:relative;z-index:1}
.p10w .mb{position:absolute;left:0;right:0;bottom:0;height:28px;display:flex;align-items:flex-end;gap:2px;padding:0 10px;opacity:.6;pointer-events:none}
.p10w .mb i{flex:1;background:linear-gradient(180deg,#59C98F,#1FA855);min-height:2px}
.p10w .mb i.n{background:linear-gradient(180deg,#F09B9B,#D64545)}
.p10w .wr{height:4px;background:var(--wash);margin-top:7px;overflow:hidden}
.p10w .wr i{display:block;height:100%;background:linear-gradient(90deg,#0A56B8,#19A9F5)}
.p10sec .p10hd{font-size:14px}
.p10row b{font-size:15px}.p10row b .p10flag{margin-right:6px}
.p10row.tot b{font-size:19px}
.p10pair{display:inline-flex;align-items:center;margin-left:6px;vertical-align:middle}
.p10pair .p10flag+.p10flag{margin-left:-7px}
.p10ccyrow{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.p10ccyrow:last-child{border-bottom:0}
.p10cc{display:inline-grid;place-items:center;min-width:44px;height:30px;padding:0 8px;border-radius:9px;background:var(--wash);border:1px solid var(--line);font:800 11px "Inter",sans-serif;color:var(--navy)}
.p10ccyrow .txt{flex:1}.p10ccyrow .txt b{font-size:14px;color:var(--ink);font-family:"Inter",sans-serif}
.p10ccyrow .txt span{display:block;font-size:11px;color:var(--muted)}
.p10ccyrow .val{font-family:"Inter",sans-serif;font-weight:800;font-size:17px;direction:ltr}
/* الشيتات */
.p10sheet .kv{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.p10sheet .kv b{font-family:"Inter",sans-serif;color:var(--ink);font-weight:700;direction:ltr}
.p10sheet .kv.big b{font-size:20px;font-weight:800}
.p10fx{background:var(--wash);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0;font-family:"Inter",sans-serif;direction:ltr;text-align:right}
.p10fx div{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:var(--ink)}
.p10fx div span:first-child{color:var(--muted);font-size:11px;font-family:"IBM Plex Sans Arabic",sans-serif;direction:rtl}
.p10fx .eq{border-top:2px solid var(--navy);margin-top:6px;padding-top:7px;font-weight:800;font-size:16px}
.p10fld{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.p10fld label{font-size:11px;color:var(--muted);font-weight:700}
.p10fld input,.p10fld select{border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;background:#fff;color:var(--ink)}
.p10grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.p10act{display:flex;gap:8px;margin-top:12px}
.p10act button{flex:1;border:0;border-radius:10px;padding:11px;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;background:var(--navy);color:#fff}
.p10act button.ghost{background:#fff;color:var(--navy);border:1px solid #D6E4F7}
.p10menu button{display:block;width:100%;text-align:right;border:0;border-bottom:1px solid var(--line);background:#fff;padding:13px 4px;font-size:13.5px;font-family:inherit;color:var(--ink);font-weight:600;cursor:pointer}
.p10menu button small{display:block;font-size:11px;color:var(--muted);font-weight:500;margin-top:2px}
.p10led{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:11.5px}
.p10led .m{color:var(--muted)}.p10led b{font-family:"Inter",sans-serif;direction:ltr}

/* الوضع المظلم — تلقائي حسب النظام + زر يدوي */
#p10root.p10dark{background:#0A1220;padding-bottom:14px}
#p10root.p10dark .p10c,#p10root.p10dark .p10sec,#p10root.p10dark .p10tools .srch,#p10root.p10dark .p10tools .tb,#p10root.p10dark .p10rng button,#p10root.p10dark .p10more{background:#101A2E;border-color:#1D2B47;color:#EDF2FA}
#p10root.p10dark .p10w{background:linear-gradient(180deg,#101A2E,#0D1728);border-color:#1D2B47;box-shadow:none}
#p10root.p10dark .p10w .l,#p10root.p10dark .p10w .s,#p10root.p10dark .p10c .l,#p10root.p10dark .p10c .s,#p10root.p10dark .p10row,#p10root.p10dark .p10kv div,#p10root.p10dark .p10ccyrow .txt span{color:#93A3BE}
#p10root.p10dark .p10row b,#p10root.p10dark .p10kv b,#p10root.p10dark .p10ccyrow .txt b,#p10root.p10dark .p10tools input{color:#EDF2FA}
#p10root.p10dark .p10sec .p10hd{color:#BFD2F2}
#p10root.p10dark .p10tabs{background:#0A1220;border-color:#1D2B47}
#p10root.p10dark .p10tabs button{color:#93A3BE}
#p10root.p10dark .p10tabs button.on,#p10root.p10dark .p10rng button.on,#p10root.p10dark .p10tools .tb.on{background:#1E4FA8;border-color:#1E4FA8;color:#fff}
#p10root.p10dark .p10cc{background:#0A1220;border-color:#1D2B47;color:#BFD2F2}
#p10root.p10dark .p10ops{background:#0C1526;border-top-color:#1D2B47}
#p10root.p10dark .p10op{border-bottom-color:#1D2B47}
#p10root.p10dark .p10op .who{color:#EDF2FA}
#p10root.p10dark .p10op:active{background:#14233F}
#p10root.p10dark .p10note{background:#2A230C;border-color:#5A4A14;color:#EAD48A}
#p10root.p10dark .p10row.tot{color:#7FA6E8;border-top-color:#1E4FA8}
#p10root.p10dark .p10btn{background:#12213C;border-color:#1E4FA8;color:#7FA6E8}
#p10root.p10dark .p10chg.up{background:#0D2B20;color:#5AD79A}
#p10root.p10dark .p10chg.dn{background:#33141A;color:#F09B9B}
`;document.head.appendChild(css);

/* ═══════ ٥) الهيكل ═══════ */
function ensure(){
  const box=q('#opsProfBox');if(!box||q('#p10root'))return;
  box.innerHTML='<div id="p10root"><div id="p10hero"></div><div id="p10cards"></div><div id="p10note"></div><div id="p10chart"></div><div id="p10pl"></div><div id="p10ccy"></div>'+
    '<div class="p10tools"><div class="srch"><span style="font-size:11px;color:var(--muted);font-weight:700">بحث</span><input id="p10q" placeholder="رقم العملية أو اسم العميل…" inputmode="search"></div>'+
    '<button class="tb" id="p10fbtn" onclick="p10.filters()">فلاتر</button><button class="tb" onclick="p10.exportMenu()">تصدير</button><button class="tb" onclick="p10.ledger()">السجل</button></div>'+
    '<div class="p10rng" id="p10rng"></div><div id="p10ops"></div></div>';
  q('#p10q').addEventListener('input',function(){S.f.q=this.value.trim();renderAll(false);});
  if(!q('#ovl-p10')){document.body.insertAdjacentHTML('beforeend',
    '<div class="ovl" id="ovl-p10"><div class="sheet p10sheet" id="p10sheetBody"></div></div>');
    q('#ovl-p10').addEventListener('click',e=>{if(e.target.id==='ovl-p10')closeOvl('p10');});}
}
function sheet(html){ensure();q('#p10sheetBody').innerHTML=html;openOvl('p10');}
const hdr=(t,extra)=>'<h3><span>'+t+'</span><span>'+(extra||'')+'<button onclick="closeOvl(\'p10\')">إغلاق</button></span></h3>';

/* ═══════ ٦) التحميل — Server-side أولًا ثم Fallback ═══════ */
const SEL='id,ref,amount,ccy,settle_ccy,settle_amount,cost,rate,meta,status,updated_at,created_at,bdl_customers(name)';
const PAGE=200;
async function fetchAll(){
  try{const r=await fetch(SB+'/bdl_transactions?select=id,ref,amount,ccy,settle_ccy,settle_amount,cost,meta,updated_at&status=in.(done,settled)&order=updated_at.desc&limit=5000',{headers:H()});
    S.all=r.ok?await r.json():(S.all||[]);}catch(e){S.all=S.all||[];}
  return S.all;
}
async function loadSummary(){
  if(S.srvOk!==false){
    try{const r=await fetch(SB+'/rpc/bdl_profit_summary',{method:'POST',headers:H(),body:JSON.stringify({p_tz:TZ})});
      if(r.ok){S.srv=await r.json();S.srvOk=true;S.all=null;return;}
      if(r.status===404)S.srvOk=false;}catch(e){}
  }
  await fetchAll(); /* بدون SQL: أعمدة الحساب فقط لكل التسويات المكتملة */
}
async function loadRows(append){
  const {from,to}=rangeBounds();S.page=append?S.page+1:0;
  let u=SB+'/bdl_transactions?select='+SEL+'&order=updated_at.desc&limit='+PAGE+'&offset='+(S.page*PAGE);
  u+=S.f.status==='settling'?'&status=eq.settling&cost=not.is.null':'&status=in.(done,settled)';
  if(from)u+='&updated_at=gte.'+encodeURIComponent(from.toISOString());
  if(to)u+='&updated_at=lt.'+encodeURIComponent(to.toISOString());
  let r=await fetch(u,{headers:H()});
  if(!r.ok&&r.status===400)r=await fetch(u.replace(',bdl_customers(name)',''),{headers:H()});
  const rows=r.ok?await r.json():[];
  S.rows=append?S.rows.concat(rows):rows;S.more=rows.length===PAGE;
}
async function load(append){
  if(S.busy)return;S.busy=true;ensure();wsConnect();
  const dot=q('#p10dot');if(dot)dot.classList.add('busy');
  try{await Promise.all([append?null:loadSummary(),loadRows(append)]);S.last=new Date();}catch(e){}
  S.refRb=refRb(S.rows)||refRb(S.all)||S.refRb||null;S.rows.forEach(t=>t._e=null);
  S.busy=false;window.PROF=S.rows;renderAll(true);
}
/* ملخّص الفترات: من الخادم أو محليًا من S.all */
function periods(){
  const now=new Date();
  if(S.srv&&S.srv.periods){const P=S.srv.periods,g=k=>{const p=P[k]||{};const net=S.base==='MRU'?Number(p.net_mru||0):Number(p.net_aoa||0);
      return {n:Number(p.n||0),na:Number(p.na||0),net,netMru:Number(p.net_mru||0),netAoa:Number(p.net_aoa||0),vol:Number(p.vol||0),rev:Number(p.rev||0),cost:Number(p.cost||0),fee:Number(p.fee||0),
        gp:Number(p.gp||0),gl:Number(p.gl||0),wins:Number(p.wins||0),losses:Number(p.losses||0),avg:Number(p.n||0)-Number(p.na||0)?net/(Number(p.n)-Number(p.na)):0,
        rate:Number(p.wins||0)+Number(p.losses||0)?Number(p.wins)/(Number(p.wins)+Number(p.losses))*100:0,other:{}};};
    const out={total:g('total'),today:g('today'),yday:g('yday'),week:g('week'),pweek:g('pweek'),month:g('month'),pmonth:g('pmonth'),srv:true};
    out.byCcy=(S.srv.by_ccy||[]).map(x=>({ccy:x.ccy,n:Number(x.n),net:Number(x.net),rev:Number(x.rev),cost:Number(x.cost)}));return out;}
  const A=S.all||S.rows,f=(a,b)=>A.filter(t=>{const d=dayOf(t);return d>=a&&(!b||d<b);});
  const d0=startOf.day(now),d1=new Date(d0);d1.setDate(d0.getDate()-1);
  const w0=startOf.week(now),w1=new Date(w0);w1.setDate(w0.getDate()-7);
  const m0=startOf.month(now),m1=new Date(m0);m1.setMonth(m0.getMonth()-1);
  const out={total:agg(A),today:agg(f(d0)),yday:agg(f(d1,d0)),week:agg(f(w0)),pweek:agg(f(w1,w0)),month:agg(f(m0)),pmonth:agg(f(m1,m0)),srv:false};
  const by={};A.forEach(t=>{const e=t._e||(t._e=eng(t));if(!e.ok)return;const b=by[e.tgt]=by[e.tgt]||{ccy:e.tgt,n:0,net:0,rev:0,cost:0};b.n++;b.net+=e.net;b.rev+=e.rev;b.cost+=e.cost;});
  out.byCcy=Object.values(by);return out;
}

/* ═══════ ٧) العرض ═══════ */
function renderAll(full){ensure();themeApply();if(full){renderHero();renderCards();renderNote();renderPL();renderCcy();}renderChart();renderRange();renderOps();}
function dailySeries(days){
  const A=S.all||S.rows||[];if(!A.length)return [];
  const out=[],now=new Date();
  for(let i=days-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);out.push({t:+d,v:0,has:false});}
  const t0=out[0].t;
  A.forEach(t=>{const e=t._e||(t._e=eng(t));if(!e.ok)return;const d=dayOf(t);if(!d)return;const dd=new Date(d);dd.setHours(0,0,0,0);
    const idx=Math.round((+dd-t0)/86400000);if(idx>=0&&idx<out.length){out[idx].v+=netBase(e)||0;out[idx].has=true;}});
  return out;
}
function sparkSvg(ser){
  if(!ser.length||!ser.some(x=>x.has))return '';
  const W=600,Hh=46,vals=ser.map(x=>x.v);
  const mn=Math.min(0,...vals),mx=Math.max(0,...vals),rg=(mx-mn)||1;
  const X=i=>i*(W/(ser.length-1||1)),Y=v=>4+(Hh-8)*(1-(v-mn)/rg);
  const pts=ser.map((x,i)=>X(i).toFixed(1)+','+Y(x.v).toFixed(1)).join(' ');
  const up=(vals[vals.length-1]||0)>=0;
  return '<div class="p10spark"><svg viewBox="0 0 '+W+' '+Hh+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="p10sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+(up?'#3DDC84':'#FF8A8A')+'" stop-opacity=".5"/><stop offset="1" stop-color="'+(up?'#3DDC84':'#FF8A8A')+'" stop-opacity="0"/></linearGradient></defs>'+
    (mn<0?'<line x1="0" x2="'+W+'" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 4"/>':'')+
    '<polygon points="0,'+Hh+' '+pts+' '+W+','+Hh+'" fill="url(#p10sg)"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+(up?'#7CF2B4':'#FFB3B3')+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<circle cx="'+X(ser.length-1).toFixed(1)+'" cy="'+Y(vals[vals.length-1]).toFixed(1)+'" r="3.6" fill="#fff"/></svg></div>';
}
function renderHero(){
  const P=periods(),T=P.total;
  const wsTxt=S.wsOk?'مباشر (Realtime)':'مباشر';
  q('#p10hero').innerHTML=
    '<div class="p10h" onclick="p10.drill()"><div class="p10live"><span><span class="p10dot'+(S.busy?' busy':S.wsOk?'':' off')+'" id="p10dot"></span>'+
    '<span>'+wsTxt+' · <span id="p10clk" class="num">'+new Date().toLocaleTimeString('en-GB')+'</span></span></span>'+
    '<span style="display:flex;align-items:center;gap:8px"><span style="opacity:.75">'+(P.srv?'حساب خادمي':'حساب محلي')+'</span>'+
    '<button id="p10thm" onclick="event.stopPropagation();p10.theme()" style="border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font:700 10px \'IBM Plex Sans Arabic\',sans-serif;padding:3px 9px;cursor:pointer">'+themeLbl()+'</button></span></div>'+
    '<div class="p10lbl"><span>إجمالي الأرباح المحققة</span><span class="p10base" onclick="event.stopPropagation()">'+['MRU','AOA'].map(c=>'<button class="'+(S.base===c?'on':'')+'" onclick="p10.base(\''+c+'\')">'+flag(c,16)+c+'</button>').join('')+'</span></div>'+
    '<div class="p10hero2">'+flag(S.base,58,true)+'<div class="p10tot" style="flex:1">'+sgn(T.net,2)+'<small>'+S.base+' · <span class="num">'+T.n+'</span> عملية</small></div></div>'+
    '<div class="p10sub">'+(chg(P.month.net,P.pmonth.net,'الشهر السابق')||'')+(P.month.net&&P.pmonth.net?' هذا الشهر مقابل الشهر السابق':'')+
    (T.na?' · <span style="color:#FFD166">'+T.na+' بلا تكلفة</span>':'')+
    '<br><span style="opacity:.8">اضغط للتدقيق: كيف تكوّن هذا الرقم</span></div></div>';
}
function renderCards(){
  const P=periods();
  const bars=(a,b)=>{const ser=dailySeries(14).slice(a,b);if(!ser.some(x=>x.has))return '';
    const mx=Math.max(...ser.map(x=>Math.abs(x.v)))||1;
    return '<div class="mb">'+ser.map(x=>'<i class="'+(x.v<0?'n':'')+'" style="height:'+Math.max(6,Math.abs(x.v)/mx*100)+'%"></i>').join('')+'</div>';};
  const w=(l,T,prev,lblPrev,sub,fn,mbar)=>{const dir=T.net>0?'up':T.net<0?'dn':'';
    return '<div class="p10w '+dir+'" onclick="'+fn+'">'+(mbar||'')+'<div class="txt"><div class="l"><span>'+l+'</span>'+chg(T.net,prev,'')+'</div>'+
    '<div class="v '+cls(T.net)+'">'+sgn(T.net,0)+'<small>'+S.base+'</small></div><div class="s">'+sub+'</div></div></div>';};
  q('#p10cards').innerHTML='<div class="p10wl">'+
    w('اليوم',P.today,P.yday.net,'أمس','<span class="num">'+P.today.n+'</span> عملية · أمس '+sgn(P.yday.net,0),'p10.range(\'today\')',bars(7,14))+
    w('هذا الأسبوع',P.week,P.pweek.net,'','<span class="num">'+P.week.n+'</span> عملية منذ الاثنين','p10.range(\'7\')',bars(7,14))+
    w('هذا الشهر',P.month,P.pmonth.net,'','<span class="num">'+P.month.n+'</span> عملية هذا الشهر','p10.range(\'30\')',bars(0,14))+
    '<div class="p10w" onclick="p10.range(\'all\')"><div class="txt"><div class="l"><span>متوسط الربح / عملية</span><span class="num" style="font-weight:800;color:var(--navy)">'+P.total.rate.toFixed(0)+'%</span></div>'+
    '<div class="v '+cls(P.total.avg)+'">'+sgn(P.total.avg,0)+'<small>'+S.base+'</small></div>'+
    '<div class="s">على <span class="num">'+(P.total.n-P.total.na)+'</span> عملية مسعّرة</div>'+
    '<div class="wr"><i style="width:'+Math.min(100,P.total.rate).toFixed(0)+'%"></i></div></div></div></div>';
}
function renderNote(){
  const el=q('#p10note');
  el.innerHTML=S.srvOk===false?'<div class="p10note"><span>الحساب يجري على الجهاز. للأداء مع آلاف العمليات والسجل والـRealtime: الصق <b>bdl-ops10.sql</b> في Supabase مرة واحدة.</span></div>':'';
}
function renderPL(){
  const P=periods(),T=P.total,cc=c=>' <small style="color:var(--muted);font-weight:700;font-size:11px">'+esc(c)+'</small>',m=(v,d,c)=>'<span class="num">'+fmt(v,d)+'</span>'+cc(c);
  q('#p10pl').innerHTML='<div class="p10sec"><div class="p10hd"><span>الأرباح والخسائر — الإجمالي</span><span style="font-size:11px;color:var(--muted);font-weight:700">'+S.base+'</span></div>'+
    '<div class="p10row"><span>حجم التداول (Volume)</span><b>'+m(T.vol,0,'MRU')+'</b></div>'+
    '<div class="p10row"><span>الإيراد (Revenue)</span><b>'+m(T.rev,2,'AOA')+'</b></div>'+
    '<div class="p10row"><span>التكلفة (Cost)</span><b>'+m(T.cost,2,'AOA')+'</b></div>'+
    '<div class="p10row"><span>الرسوم والمصاريف (Fees)</span><b>'+m(T.fee,2,'AOA')+'</b></div>'+
    '<div class="p10row"><span>ربح إجمالي (Gross Profit) · <span class="num">'+T.wins+'</span></span><b class="pos"><span class="num">'+sgn(T.gp,2)+'</span>'+cc(S.base)+'</b></div>'+
    '<div class="p10row"><span>خسارة إجمالية (Gross Loss) · <span class="num">'+T.losses+'</span></span><b class="neg"><span class="num">'+sgn(T.gl,2)+'</span>'+cc(S.base)+'</b></div>'+
    '<div class="p10row"><span>نسبة العمليات الرابحة</span><b><span class="num">'+T.rate.toFixed(1)+'%</span></b></div>'+
    '<div class="p10row tot"><span>صافي الربح (NET PROFIT)</span><b class="'+cls(T.net)+'"><span class="num">'+sgn(T.net,2)+'</span>'+cc(S.base)+'</b></div></div>';
}
function renderCcy(){
  const P=periods();
  q('#p10ccy').innerHTML='<div class="p10sec"><div class="p10hd"><span>الأرباح حسب العملة</span><span style="font-size:11px;color:var(--muted);font-weight:600">بعملة كل عملية</span></div>'+
    (P.byCcy.length?P.byCcy.map(b=>'<div class="p10ccyrow"><span class="p10cc">'+esc(b.ccy)+'</span><div class="txt"><b>'+esc(b.ccy)+'</b><span><span class="num">'+b.n+'</span> عملية · إيراد <span class="num">'+fmt(b.rev,0)+'</span></span></div>'+
      '<div class="val '+cls(b.net)+'">'+sgn(b.net,2)+'</div></div>').join(''):'<div class="empty" style="padding:14px">لا بيانات</div>')+'</div>';
}
/* الرسم البياني */
function chartBuckets(){const map={},order=[];visRows().forEach(t=>{const k=bucketKey(dayOf(t),S.period);if(!map[k]){map[k]={k,rows:[],d:startOf[S.period](dayOf(t))};order.push(k);}map[k].rows.push(t);});
  return order.map(k=>map[k]).sort((a,b)=>a.d-b.d).map(b=>Object.assign(b,{T:agg(b.rows)}));}
function renderChart(){
  const B=chartBuckets(),el=q('#p10chart');
  const tabs='<div class="p10tabs">'+[['day','يومي'],['week','أسبوعي'],['month','شهري'],['year','سنوي']].map(x=>'<button class="'+(S.period===x[0]?'on':'')+'" onclick="p10.period(\''+x[0]+'\')">'+x[1]+'</button>').join('')+'</div>';
  if(!B.length){el.innerHTML='<div class="p10sec"><div class="p10hd"><span>الأرباح حسب الفترة</span></div>'+tabs+'<div class="empty" style="padding:24px">لا بيانات في هذه الفترة</div></div>';return;}
  const W=340,Hh=150,padL=6,padB=22,padT=8,n=B.length,gap=n>20?1:4,bw=Math.max(3,(W-padL*2)/n-gap);
  const mx=Math.max(...B.map(b=>Math.abs(b.T.net)),1),zero=padT+(Hh-padB-padT)*(Math.max(...B.map(b=>b.T.net),0)/(Math.max(...B.map(b=>b.T.net),0)-Math.min(...B.map(b=>b.T.net),0)||1));
  const posMax=Math.max(...B.map(b=>b.T.net),0),negMin=Math.min(...B.map(b=>b.T.net),0),span=(posMax-negMin)||1,scale=(Hh-padB-padT)/span,z=padT+posMax*scale;
  if(S.sel==null||S.sel>=n)S.sel=n-1;
  const bars=B.map((b,i)=>{const x=padL+i*((W-padL*2)/n),h=Math.max(2,Math.abs(b.T.net)*scale),y=b.T.net>=0?z-h:z;
    const lab=n<=8?b.k.replace('أسبوع ','').slice(0,5):(i===0||i===n-1||i===S.sel?b.k.replace('أسبوع ','').slice(0,5):'');
    return '<g class="bar'+(i===S.sel?' on':'')+'" onclick="p10.sel('+i+')"><rect x="'+x+'" y="'+padT+'" width="'+(bw+gap)+'" height="'+(Hh-padB-padT)+'" fill="transparent"/>'+
      '<rect class="b" x="'+x+'" y="'+y+'" width="'+bw+'" height="'+h+'" rx="2" fill="'+(b.T.net>=0?'#0E9F6E':'#D64545')+'" opacity="'+(i===S.sel?1:.55)+'"/>'+
      (lab?'<text x="'+(x+bw/2)+'" y="'+(Hh-6)+'" font-size="9" text-anchor="middle" fill="#66788F" font-family="Inter">'+lab+'</text>':'')+'</g>';}).join('');
  const s=B[S.sel],T=s.T;
  el.innerHTML='<div class="p10sec"><div class="p10hd"><span>الأرباح حسب الفترة</span><span style="font-size:11px;color:var(--muted)"><span class="num">'+n+'</span> فترة</span></div>'+tabs+
    '<div class="p10chart"><svg viewBox="0 0 '+W+' '+Hh+'" preserveAspectRatio="none"><line x1="0" x2="'+W+'" y1="'+z+'" y2="'+z+'" stroke="#DCE4EF"/>'+bars+'</svg></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><b style="font-size:13px;color:var(--navy);font-family:Inter">'+esc(s.k)+'</b><b class="'+cls(T.net)+'" style="font-family:Inter;font-size:20px;display:flex;align-items:center;gap:6px;direction:ltr">'+sgn(T.net,2)+' <small style="font-size:12px;opacity:.7">'+S.base+'</small></b></div>'+
    '<div class="p10kv"><div><span>عدد العمليات</span><b>'+T.n+'</b></div><div><span>حجم التداول</span><b>'+fmt(T.vol,0)+' MRU</b></div>'+
    '<div><span>متوسط الربح</span><b class="'+cls(T.avg)+'">'+sgn(T.avg,0)+'</b></div><div><span>الهامش</span><b>'+(T.cost?((T.netAoa||T.net)/T.cost*100).toFixed(2):'—')+'%</b></div>'+
    '<div><span>أكبر ربح</span><b class="pos">'+(T.best?sgn(T.best.v,0)+' · '+esc(shortRef(T.best.t.ref)):'—')+'</b></div><div><span>أكبر خسارة</span><b class="neg">'+(T.worst&&T.worst.v<0?sgn(T.worst.v,0)+' · '+esc(shortRef(T.worst.t.ref)):'—')+'</b></div></div>'+
    '<button class="p10btn" onclick="p10.openGroup(\''+esc(s.k).replace(/'/g,"\\'")+'\')">عرض عمليات هذه الفترة</button></div>';
}
function renderRange(){
  q('#p10rng').innerHTML=[['today','اليوم'],['7','٧ أيام'],['30','٣٠ يومًا'],['year','السنة'],['all','الكل']].map(x=>'<button class="'+(S.range===x[0]&&!S.f.from&&!S.f.to?'on':'')+'" onclick="p10.range(\''+x[0]+'\')">'+x[1]+'</button>').join('');
  const fb=q('#p10fbtn'),act=Object.keys(S.f).filter(k=>k!=='q'&&k!=='status'&&S.f[k]!=='').length+(S.f.status!=='done'?1:0);
  if(fb){fb.textContent=act?'فلاتر ('+act+')':'فلاتر';fb.classList.toggle('on',!!act);}
}
function opRow(t){
  const e=t._e||(t._e=eng(t)),v=netBase(e);
  const rate=e.rs?('بيع <b>'+(e.old?e.rs.toFixed(4):fmt(e.rs,4))+'</b>'+(e.rb?' · شراء <b>'+(e.old?e.rb.toFixed(4):fmt(e.rb,4))+'</b>':'')):'';
  const right=e.ok?'<div class="pf '+cls(e.net)+'">'+(v!=null?sgn(v,2)+' '+S.base:sgn(e.net,2)+' '+esc(e.tgt))+'</div>'+
      '<div class="pa">'+(v!=null&&e.tgt!==S.base?sgn(e.net,0)+' '+esc(e.tgt)+' · ':'')+(e.pct>=0?'+':'−')+Math.abs(e.pct).toFixed(2)+'%</div>'
    :'<div class="pf na">بلا تكلفة</div><div class="pa">أضف سعر الشراء من التسوية</div>';
  return '<div class="p10op" onclick="event.stopPropagation();p10.detail(\''+t.id+'\')"><div style="flex:1;min-width:0">'+
    '<div class="ref">'+esc(shortRef(t.ref))+(t.status==='settling'?' <span class="p10chg dn" style="background:#FFF4E2;color:var(--warn)">معلقة</span>':'')+'</div>'+(e.who?'<div class="who">'+esc(e.who)+'</div>':'')+
    '<div class="amt">'+fmt(t.amount,0)+' '+esc(t.ccy)+' → '+fmt(t.settle_amount,2)+' '+esc(e.tgt)+' <span style="opacity:.75">· '+dayOf(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</span></div>'+
    (rate?'<div class="rt">'+rate+'</div>':'')+'</div><div class="r">'+right+'</div></div>';
}
function renderOps(){
  const el=q('#p10ops'),vis=visRows(),groups={},order=[];
  vis.forEach(t=>{const k=bucketKey(dayOf(t),S.period==='year'?'month':S.period);if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(t);});
  const todayK=bucketKey(new Date(),S.period==='year'?'month':S.period);
  if(!Object.keys(S.open).length&&groups[todayK])S.open[todayK]=true;if(S.f.q)order.forEach(k=>S.open[k]=true);
  el.innerHTML='<div style="margin:12px 12px 6px;font-size:13px;font-weight:800;color:var(--navy);display:flex;justify-content:space-between"><span>آخر العمليات</span><span style="font-size:11px;color:var(--muted);font-weight:600"><span class="num">'+vis.length+'</span> عملية'+(S.more?' (محمّل جزئيًا)':'')+'</span></div>'+
    (order.length?order.map(k=>{const rows=groups[k],T=agg(rows);
      return '<div class="pcard p10g'+(S.open[k]?' open':'')+'" data-p10k="'+esc(k)+'" style="margin:0 12px 8px" onclick="p10.toggle(\''+esc(k).replace(/'/g,"\\'")+'\')">'+
        '<div class="t"><b>'+esc(k)+'</b><span class="p10n"><b>'+T.n+'</b> عملية'+(T.na?' · <span style="color:var(--warn)">'+T.na+' بلا تكلفة</span>':'')+'</span></div>'+
        '<div class="v '+cls(T.net)+' num" style="display:flex;align-items:center;gap:7px;font-size:22px">'+sgn(T.net,2)+' <small style="font-size:12px;opacity:.7">'+S.base+'</small></div>'+
        '<div class="s"><span class="num">'+fmt(T.vol,0)+'</span> MRU → <span class="num">'+fmt(T.rev,2)+'</span> AOA · تكلفة <span class="num">'+fmt(T.cost,0)+'</span>'+(T.fee?' · رسوم <span class="num">'+fmt(T.fee,0)+'</span>':'')+
        (T.cost?' · هامش <span class="num">'+((T.netAoa||T.net)/T.cost*100).toFixed(2)+'%</span>':'')+(Object.keys(T.other).length?' · '+Object.keys(T.other).map(c=>sgn(T.other[c],0)+' '+c).join(' · '):'')+'</div>'+
        '<span class="p10btn">'+(S.open[k]?'إخفاء التفاصيل':'عرض التفاصيل')+'</span>'+
        '<div class="p10ops" onclick="event.stopPropagation()">'+rows.map(opRow).join('')+'</div></div>';}).join(''):
      '<div class="empty">'+(S.f.q?'لا نتائج للبحث':'لا تسويات في هذه الفترة')+'</div>')+
    (S.more?'<button class="p10more" onclick="p10.more()">تحميل المزيد</button>':'');
}

/* ═══════ ٨) الشيتات: تفاصيل العملية / Drill-down / فلاتر / تصدير / سجل ═══════ */
function detail(id){
  const t=S.rows.find(x=>x.id===id);if(!t)return;const e=t._e||(t._e=eng(t)),d=dayOf(t);
  const kv=(l,v,c)=>'<div class="kv'+(c||'')+'"><span>'+l+'</span><b>'+v+'</b></div>';
  const cur=x=>x==null?'—':fmt(x,2);
  sheet(hdr('تفاصيل العملية','<button onclick="p10.copyDetail(\''+id+'\')" style="margin-left:8px;font-size:12px;color:var(--blue)">نسخ</button>')+
    kv('Transaction ID',esc(t.ref||t.id))+kv('التاريخ والوقت',d.toLocaleDateString('en-GB')+' '+d.toLocaleTimeString('en-GB'))+
    (e.who?kv('العميل',esc(e.who)):'')+kv('الحالة',t.status==='settling'?'تسوية معلقة':'مسوّاة ✓')+
    kv('من / إلى',esc(t.ccy)+' → '+esc(e.tgt))+kv('المبلغ المرسل (Amount Sent)',fmt(t.amount,2)+' '+esc(t.ccy))+kv('المبلغ المستلم (Amount Received)',cur(e.rev)+' '+esc(e.tgt))+
    kv('سعر البيع (Sell Rate)',e.rs!=null?(e.old?e.rs.toFixed(4):fmt(e.rs,6)):'—')+kv('سعر الشراء / التكلفة (Buy Rate)',e.rb!=null?(e.old?e.rb.toFixed(4):fmt(e.rb,6)):'—')+
    kv('الإيراد (Revenue)',cur(e.rev)+' '+esc(e.tgt))+kv('التكلفة (Cost)',cur(e.cost)+' '+esc(e.tgt))+kv('رسوم العملية (Fees)',fmt(e.fee,2)+' '+esc(e.tgt))+kv('مصاريف أخرى',fmt(e.exp,2)+' '+esc(e.tgt))+
    (e.ok?kv('صافي الربح (Net Profit)','<span class="'+cls(e.net)+'">'+sgn(e.net,2)+' '+esc(e.tgt)+'</span>',' big')+
      (e.netMru!=null&&e.tgt!=='MRU'?kv('صافي الربح بالأوقية','<span class="'+cls(e.netMru)+'">'+sgn(e.netMru,2)+' MRU</span>'):'')+
      kv('هامش الربح (Margin)',(e.pct>=0?'+':'−')+Math.abs(e.pct).toFixed(3)+'%')+
      '<div class="p10fx"><div><span>الإيراد</span><span>'+fmt(e.rev,2)+' '+esc(e.tgt)+'</span></div><div><span>− التكلفة</span><span>− '+fmt(e.cost,2)+' '+esc(e.tgt)+'</span></div>'+
      '<div><span>− الرسوم</span><span>− '+fmt(e.fee+e.exp,2)+' '+esc(e.tgt)+'</span></div><div class="eq '+cls(e.net)+'"><span>= صافي الربح</span><span>'+sgn(e.net,2)+' '+esc(e.tgt)+'</span></div>'+
      (e.netMru!=null&&e.tgt!=='MRU'?'<div style="font-size:11px;color:var(--muted)"><span>'+(e.viaRef?'× سعر شراء الأوقية المرجعي '+S.refRb.toFixed(4):'× (المبلغ ÷ التكلفة) بسعر الشراء')+'</span><span>= '+sgn(e.netMru,2)+' MRU</span></div>':'')+'</div>'
     :'<div class="p10note" style="margin:12px 0"><span>لا يمكن حساب الربح: لا تكلفة (سعر شراء) مسجلة لهذه العملية. افتح التسوية وأدخل سعر الشراء.</span></div>')+
    '<div class="p10grid2"><div class="p10fld"><label>رسوم العملية ('+esc(e.tgt)+')</label><input id="p10fee" inputmode="decimal" value="'+(e.fee||'')+'" placeholder="0"></div>'+
    '<div class="p10fld"><label>مصاريف أخرى ('+esc(e.tgt)+')</label><input id="p10exp" inputmode="decimal" value="'+(e.exp||'')+'" placeholder="0"></div></div>'+
    '<div class="p10act"><button onclick="p10.saveFees(\''+id+'\')">حفظ الرسوم وإعادة الحساب</button><button class="ghost" onclick="closeOvl(\'p10\')">إغلاق</button></div>');
}
async function saveFees(id){
  const t=S.rows.find(x=>x.id===id);if(!t)return;
  const fee=String(q('#p10fee').value).replace(/[^\d.]/g,''),exp=String(q('#p10exp').value).replace(/[^\d.]/g,'');
  const meta=Object.assign({},t.meta||{});if(fee)meta.fee=fee;else delete meta.fee;if(exp)meta.expense=exp;else delete meta.expense;
  try{const r=await fetch(SB+'/bdl_transactions?id=eq.'+id,{method:'PATCH',headers:H(),body:JSON.stringify({meta})});
    if(!r.ok)throw 0;t.meta=meta;t._e=null;toast('حُفظت الرسوم وأُعيد الحساب ✓');closeOvl('p10');load(false);}catch(e){toast('تعذّر الحفظ');}
}
async function drill(){
  sheet(hdr('تدقيق إجمالي الأرباح')+'<div class="empty" style="padding:24px">جارٍ التحميل…</div>');
  const A=S.all||await fetchAll();const P=periods(),T=P.total,map={},order=[];
  A.forEach(t=>{const k=bucketKey(dayOf(t),'day');if(!map[k]){map[k]={k,rows:[],d:startOf.day(dayOf(t))};order.push(k);}map[k].rows.push(t);});
  const days=order.map(k=>map[k]).sort((a,b)=>b.d-a.d);let run=0;
  const rows=days.map(b=>{const g=agg(b.rows);run+=g.net;return '<div class="p10row" style="cursor:pointer" onclick="closeOvl(\'p10\');p10.openGroup(\''+esc(b.k)+'\',true)"><span><span class="num">'+esc(b.k)+'</span> · <span class="num">'+g.n+'</span> عملية</span><b class="'+cls(g.net)+'"><span class="num">'+sgn(g.net,2)+'</span></b></div>';}).join('');
  const check=Math.abs(run-T.net)<0.01;
  sheet(hdr('تدقيق إجمالي الأرباح')+'<div style="font-size:12px;color:var(--muted);margin-bottom:8px">TOTAL PROFIT = مجموع صافي أرباح كل التسويات المؤهلة (مكتملة + لها تكلفة). كل سطر قابل للفتح حتى العملية الأصلية.</div>'+
    rows+'<div class="p10row tot"><span>TOTAL</span><b class="'+cls(T.net)+'"><span class="num">'+sgn(T.net,2)+'</span> '+S.base+'</b></div>'+
    '<div style="font-size:11px;margin-top:8px;color:'+(check?'var(--ok)':'var(--warn)')+'">'+(check?'✓ مجموع الأيام يطابق الإجمالي 100%':(P.srv?'المجموع الخادمي والمحلي يختلفان قليلًا — تحقّق من التقريب أو بيانات خارج النطاق المحمّل':'فرق تقريب'))+'</div>'+
    '<div class="p10act"><button class="ghost" onclick="p10.csv(\'daily\')">تصدير الأيام CSV</button><button onclick="closeOvl(\'p10\')">إغلاق</button></div>');
}
function filtersSheet(){
  const f=S.f,ccys=['','MRU','AOA','USDT','USD','EUR','CNY','AED'],pairs=[...new Set(S.rows.map(t=>(t._e||(t._e=eng(t))).dir))];
  const opt=(arr,v,lbl)=>arr.map(x=>'<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+(x===''?lbl:esc(x))+'</option>').join('');
  sheet(hdr('الفلاتر')+
    '<div class="p10grid2"><div class="p10fld"><label>من تاريخ</label><input type="date" id="pf_from" value="'+f.from+'"></div><div class="p10fld"><label>إلى تاريخ</label><input type="date" id="pf_to" value="'+f.to+'"></div>'+
    '<div class="p10fld"><label>العملة</label><select id="pf_ccy">'+opt(ccys,f.ccy,'كل العملات')+'</select></div><div class="p10fld"><label>نوع العملية</label><select id="pf_pair">'+opt(['',...pairs],f.pair,'كل الأنواع')+'</select></div>'+
    '<div class="p10fld"><label>حالة العملية</label><select id="pf_status"><option value="done"'+(f.status==='done'?' selected':'')+'>مسوّاة (محققة)</option><option value="settling"'+(f.status==='settling'?' selected':'')+'>تسوية معلقة (متوقعة)</option></select></div>'+
    '<div class="p10fld"><label>رابحة / خاسرة</label><select id="pf_pl"><option value="">الكل</option><option value="win"'+(f.pl==='win'?' selected':'')+'>رابحة فقط</option><option value="loss"'+(f.pl==='loss'?' selected':'')+'>خاسرة فقط</option><option value="na"'+(f.pl==='na'?' selected':'')+'>بلا تكلفة</option></select></div>'+
    '<div class="p10fld"><label>ربح أكبر من ('+S.base+')</label><input id="pf_min" inputmode="decimal" value="'+f.min+'"></div><div class="p10fld"><label>ربح أقل من ('+S.base+')</label><input id="pf_max" inputmode="decimal" value="'+f.max+'"></div></div>'+
    '<div class="p10fld"><label>العميل</label><input id="pf_client" value="'+esc(f.client)+'" placeholder="اسم العميل"></div>'+
    '<div class="p10act"><button onclick="p10.applyFilters()">تطبيق</button><button class="ghost" onclick="p10.resetFilters()">مسح</button></div>');
}
function applyFilters(){const g=id=>q('#'+id).value.trim();
  Object.assign(S.f,{from:g('pf_from'),to:g('pf_to'),ccy:g('pf_ccy'),pair:g('pf_pair'),status:g('pf_status'),pl:g('pf_pl'),min:g('pf_min'),max:g('pf_max'),client:g('pf_client')});
  closeOvl('p10');S.open={};load(false);}
function resetFilters(){S.f={q:S.f.q,ccy:'',pair:'',client:'',status:'done',pl:'',min:'',max:'',from:'',to:''};closeOvl('p10');S.open={};load(false);}
/* تصدير */
function dl(name,content,mime){const b=new Blob([content],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}
const csvLine=a=>a.map(v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');
const stamp=()=>new Date().toISOString().slice(0,10);
async function csv(kind){
  let head,body,name;const BOM='\uFEFF';
  if(kind==='daily'||kind==='monthly'){if(!S.all)await fetchAll();}
  if(kind==='ops'){head=['Transaction ID','Date','Time','Client','From','To','Amount Sent','Amount Received','Sell Rate','Buy Rate','Revenue','Cost','Fees','Expenses','Net Profit (tgt)','Net Profit MRU','Margin %','Status'];
    body=visRows().map(t=>{const e=t._e||eng(t),d=dayOf(t);return [t.ref,d.toLocaleDateString('en-GB'),d.toLocaleTimeString('en-GB'),e.who,t.ccy,e.tgt,e.amt,e.rev,e.rs,e.rb,e.rev,e.cost,e.fee,e.exp,e.net,e.netMru,e.pct!=null?e.pct.toFixed(4):'',t.status];});name='BDL-operations-'+stamp()+'.csv';}
  else if(kind==='daily'||kind==='monthly'){const p=kind==='daily'?'day':'month',A=S.all||S.rows,map={};A.forEach(t=>{const k=bucketKey(dayOf(t),p);(map[k]=map[k]||[]).push(t);});
    head=[kind==='daily'?'Day':'Month','Transactions','Volume MRU','Revenue AOA','Cost AOA','Fees','Gross Profit','Gross Loss','Net Profit '+S.base,'Best','Worst'];
    body=Object.keys(map).map(k=>{const T=agg(map[k]);return [k,T.n,T.vol,T.rev,T.cost,T.fee,T.gp,T.gl,T.net,T.best?T.best.v:'',T.worst?T.worst.v:''];});name='BDL-profit-'+kind+'-'+stamp()+'.csv';}
  else if(kind==='ledger'){head=['ID','Timestamp','Event','Transaction','Profit Before','Profit Added','Profit After','Currency','Actor'];
    body=(S.ledger||[]).map(l=>[l.id,l.ts,l.event,l.ref,l.profit_before,l.profit_added,l.profit_after,l.ccy,l.actor]);name='BDL-profit-ledger-'+stamp()+'.csv';}
  else{const P=periods(),T=P.total;head=['Metric','Value','Currency'];
    body=[['Trading Volume',T.vol,'MRU'],['Revenue',T.rev,'AOA'],['Cost',T.cost,'AOA'],['Fees',T.fee,'AOA'],['Gross Profit',T.gp,S.base],['Gross Loss',T.gl,S.base],['Net Profit',T.net,S.base],['Transactions',T.n,''],['Win Rate %',T.rate.toFixed(2),''],
      ['Today',P.today.net,S.base],['This Week',P.week.net,S.base],['This Month',P.month.net,S.base],['Avg / Transaction',P.total.avg,S.base]];name='BDL-PL-report-'+stamp()+'.csv';}
  dl(name,BOM+[csvLine(head)].concat(body.map(csvLine)).join('\r\n'),'text/csv;charset=utf-8');toast('صُدّر '+name+' ✓');closeOvl('p10');
}
async function pdf(){
  const JS=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;if(!JS){toast('jsPDF لم يُحمَّل');return;}
  const P=periods(),T=P.total,B=chartBuckets().slice().reverse().slice(0,60);
  const W=1400,M=70,rowH=56,c=document.createElement('canvas');
  const Hh=250+70+8*rowH+90+70+(B.length+1)*rowH+120;c.width=W;c.height=Hh;
  const x=c.getContext('2d'),F='"IBM Plex Sans Arabic","Inter",sans-serif';x.direction='ltr';
  x.fillStyle='#fff';x.fillRect(0,0,W,Hh);
  /* رأس */
  const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,'#19A9F5');g.addColorStop(.5,'#0A56B8');g.addColorStop(1,'#0B2F70');x.fillStyle=g;x.fillRect(0,0,W,250);
  x.fillStyle='#fff';x.textAlign='right';x.font='800 40px '+F;x.fillText('تقرير الأرباح والخسائر',W-M,90);
  if(!(typeof bdlLogo==='function'&&bdlLogo(x,M,60,130))){x.font='700 30px Inter';x.fillText('BDL',W-M-460,90);}
  x.font='500 22px '+F;x.fillStyle='rgba(255,255,255,.85)';x.fillText((S.range==='all'&&!S.f.from?'كل الفترات':'الفترة المختارة')+' · '+new Date().toLocaleString('en-GB'),W-M,132);
  x.textAlign='left';x.fillStyle='#fff';x.font='800 60px Inter';x.fillText(sgn(T.net,2)+' '+S.base,M,150);
  x.font='500 22px Inter';x.fillStyle='rgba(255,255,255,.85)';x.fillText('NET PROFIT  ·  '+T.n+' transactions  ·  win rate '+T.rate.toFixed(0)+'%',M,195);
  /* الملخّص */
  let y=250+60;x.font='700 28px '+F;x.fillStyle='#0B2F70';x.textAlign='right';x.fillText('الملخّص',W-M,y);y+=14;
  const kv=[['حجم التداول (Volume)',fmt(T.vol,0)+' MRU'],['الإيراد (Revenue)',fmt(T.rev,2)+' AOA'],['التكلفة (Cost)',fmt(T.cost,2)+' AOA'],['الرسوم والمصاريف (Fees)',fmt(T.fee,2)+' AOA'],
    ['ربح إجمالي (Gross Profit) · '+T.wins,sgn(T.gp,2)+' '+S.base],['خسارة إجمالية (Gross Loss) · '+T.losses,sgn(T.gl,2)+' '+S.base],['نسبة العمليات الرابحة',T.rate.toFixed(1)+'%'],['صافي الربح (NET PROFIT)',sgn(T.net,2)+' '+S.base]];
  kv.forEach((r,i)=>{y+=rowH;const last=i===kv.length-1;x.fillStyle=last?'#EAF7F0':(i%2?'#F4F7FB':'#fff');x.fillRect(M,y-38,W-2*M,rowH);
    x.fillStyle=last?'#0B2F70':'#66788F';x.font=(last?'800 25px ':'500 24px ')+F;x.textAlign='right';x.fillText(r[0],W-M-18,y);
    x.fillStyle=last?(T.net>=0?'#0E9F6E':'#D64545'):'#0C1526';x.font=(last?'800 32px':'700 26px')+' Inter';x.textAlign='left';x.fillText(r[1],M+18,y);});
  /* جدول الفترات — كل الأعمدة محاذاة يمين بحواف ثابتة */
  y+=90;x.font='700 28px '+F;x.fillStyle='#0B2F70';x.textAlign='right';x.fillText('الأرباح حسب الفترة ('+{day:'يومي',week:'أسبوعي',month:'شهري',year:'سنوي'}[S.period]+')',W-M,y);y+=14;
  const R=W-M-18,cols=[{t:'الفترة',x:R},{t:'عمليات',x:R-235},{t:'الحجم MRU',x:R-380},{t:'الإيراد AOA',x:R-630},{t:'التكلفة AOA',x:R-880},{t:'صافي الربح '+S.base,x:R-1130}];
  y+=rowH;x.fillStyle='#EEF3FA';x.fillRect(M,y-38,W-2*M,rowH);x.font='700 20px '+F;x.fillStyle='#66788F';x.textAlign='right';cols.forEach(cc=>x.fillText(cc.t,cc.x,y));
  B.forEach((b,i)=>{y+=rowH;x.fillStyle=i%2?'#F4F7FB':'#fff';x.fillRect(M,y-38,W-2*M,rowH);const T2=b.T;x.textAlign='right';
    x.font='700 23px Inter';x.fillStyle='#0C1526';x.fillText(b.k.replace('أسبوع ','W '),cols[0].x,y);
    x.font='600 23px Inter';[String(T2.n),fmt(T2.vol,0),fmt(T2.rev,0),fmt(T2.cost,0)].forEach((v,j)=>x.fillText(v,cols[j+1].x,y));
    x.fillStyle=T2.net>=0?'#0E9F6E':'#D64545';x.font='800 24px Inter';x.fillText(sgn(T2.net,2),cols[5].x,y);});
  x.textAlign='center';x.fillStyle='#8AA3C4';x.font='500 20px '+F;x.fillText('أُصدر تلقائيًا من BDL Profit Engine · '+new Date().toLocaleString('en-GB'),W/2,Hh-40);
  /* صفحة PDF بنفس أبعاد اللوحة تمامًا (نقاط) */
  const pw=W/2,ph=Hh/2,pdf=new JS({unit:'pt',format:[pw,ph],orientation:pw>ph?'l':'p'});
  pdf.addImage(c.toDataURL('image/jpeg',.93),'JPEG',0,0,pw,ph);pdf.save('BDL-PL-report-'+stamp()+'.pdf');toast('صدر تقرير PDF ✓');closeOvl('p10');
}
function exportMenu(){
  sheet(hdr('تصدير')+'<div class="p10menu">'+
    '<button onclick="p10.csv(\'ops\')">جميع العمليات — CSV / Excel<small>حسب الفلاتر الحالية: رقم العملية، العميل، الأسعار، الإيراد، التكلفة، الرسوم، صافي الربح، الهامش</small></button>'+
    '<button onclick="p10.csv(\'daily\')">الأرباح اليومية — CSV / Excel</button>'+
    '<button onclick="p10.csv(\'monthly\')">الأرباح الشهرية — CSV / Excel</button>'+
    '<button onclick="p10.csv(\'ledger\')">سجل الأرباح (Profit Ledger) — CSV<small>افتح السجل أولًا ليُحمَّل</small></button>'+
    '<button onclick="p10.csv(\'pl\')">تقرير الأرباح والخسائر — CSV</button>'+
    '<button onclick="p10.pdf()">تقرير الأرباح والخسائر — PDF<small>ملخّص + جدول الفترات بهوية BDL</small></button></div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:8px">ملفات CSV بترميز UTF-8 تُفتح مباشرة في Excel.</div>');
}
async function ledger(){
  sheet(hdr('سجل الأرباح (Profit Ledger)')+'<div class="empty" style="padding:24px">جارٍ التحميل…</div>');
  try{const r=await fetch(SB+'/bdl_profit_ledger?select=*&order=id.desc&limit=300',{headers:H()});
    if(r.status===404){S.ledgerOk=false;sheet(hdr('سجل الأرباح')+'<div class="p10note" style="margin:0"><span>السجل يتطلب لصق <b>bdl-ops10.sql</b> في Supabase. بعدها تُسجَّل كل حركة ربح تلقائيًا: قبل / المضاف / بعد، مع المرجع والمنفّذ.</span></div>');return;}
    S.ledger=r.ok?await r.json():[];S.ledgerOk=true;}catch(e){S.ledger=[];}
  const ev={settled:'تسوية',adjusted:'تعديل',reversed:'فك تسوية',deleted:'حذف'};
  sheet(hdr('سجل الأرباح (Profit Ledger)','<button onclick="p10.csv(\'ledger\')" style="margin-left:8px;font-size:12px;color:var(--blue)">CSV</button>')+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">كل حركة: الربح قبل → المضاف → الربح بعد (MRU). آخر <span class="num">'+S.ledger.length+'</span> حركة.</div>'+
    (S.ledger.length?S.ledger.map(l=>'<div class="p10led"><div><div><b style="color:var(--blue)">'+esc(l.ref||'—')+'</b> <span class="m">· '+(ev[l.event]||esc(l.event))+' · '+esc(l.actor==='backfill'?'تعبئة أولية':l.actor==='system'?'النظام':'المالك')+'</span></div>'+
      '<div class="m num">'+new Date(l.ts).toLocaleString('en-GB')+'</div></div><div style="text-align:left"><b class="'+cls(Number(l.profit_added))+'">'+sgn(Number(l.profit_added),2)+'</b>'+
      '<div class="m num">'+fmt(l.profit_before,2)+' → <b>'+fmt(l.profit_after,2)+'</b></div></div></div>').join(''):'<div class="empty">لا حركات بعد</div>'));
}
function copyDetail(id){const t=S.rows.find(x=>x.id===id);if(!t)return;const e=eng(t);
  const s=['Transaction: '+(t.ref||t.id),'Client: '+e.who,'Pair: '+e.dir,'Amount: '+fmt(e.amt,2)+' '+t.ccy,'Received: '+fmt(e.rev,2)+' '+e.tgt,'Sell rate: '+(e.rs||'—'),'Buy rate: '+(e.rb||'—'),
    'Revenue: '+fmt(e.rev,2),'Cost: '+fmt(e.cost,2),'Fees: '+fmt(e.fee+e.exp,2),'Net profit: '+(e.ok?sgn(e.net,2)+' '+e.tgt+(e.netMru!=null?' ('+sgn(e.netMru,2)+' MRU)':''):'n/a'),'Margin: '+(e.ok?e.pct.toFixed(3)+'%':'n/a')].join('\n');
  (navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast('نُسخت التفاصيل ✓'),()=>toast('تعذّر النسخ'));}

/* ═══════ ٩) Real-Time: WebSocket (Supabase Realtime) + اعتراض الكتابة + مؤقّت ═══════ */
let DEB=null,HB=null,wsTry=0;
const visible=()=>{const v=q('#v-profit');return v&&v.style.display!=='none'&&document.visibilityState==='visible';};
function bump(){try{window.dispatchEvent(new CustomEvent('bdl:change'));}catch(e){}clearTimeout(DEB);DEB=setTimeout(()=>{if(visible())load(false);else window.PROF=null;},700);}
function wsConnect(){
  if(S.ws||!window.WebSocket||!(window.TOK))return;
  try{const base=SB.replace('/rest/v1','').replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+encodeURIComponent(ANON)+'&vsn=1.0.0';
    const ws=new WebSocket(base);S.ws=ws;let ref=1;
    ws.onopen=()=>{wsTry=0;ws.send(JSON.stringify({topic:'realtime:public:bdl_transactions',event:'phx_join',ref:String(ref++),
        payload:{config:{postgres_changes:[{event:'*',schema:'public',table:'bdl_transactions'}]},access_token:TOK}}));
      HB=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:String(ref++)}));},28000);};
    ws.onmessage=m=>{try{const d=JSON.parse(m.data);
      if(d.event==='phx_reply'&&d.topic!=='phoenix'){S.wsOk=d.payload&&d.payload.status==='ok';renderHero();}
      if(d.event==='postgres_changes'||d.event==='INSERT'||d.event==='UPDATE'||d.event==='DELETE')bump();}catch(e){}};
    ws.onclose=ws.onerror=()=>{clearInterval(HB);S.ws=null;S.wsOk=false;setTimeout(wsConnect,Math.min(30000,2000*Math.pow(2,wsTry++)));};
  }catch(e){S.ws=null;}
}
const F=window.fetch;
window.fetch=function(u,o){const p=F.apply(this,arguments);
  try{const url=String(u&&u.url||u),m=((o&&o.method)||'GET').toUpperCase();
    if(m!=='GET'&&/bdl_transactions|bdl_settle|bdl_unsettle|bdl_purge|bdl_settlements|bdl_ops_purge|bdl_receipts_purge|log-transfer/.test(url)&&!/bdl_profit_summary/.test(url))p.then(bump,()=>{});}catch(e){}
  return p;};
document.addEventListener('visibilitychange',()=>{if(visible()&&!S.busy)load(false);});
setInterval(()=>{if(visible()&&!S.busy&&!S.wsOk)load(false);},20000);   /* احتياطي إن لم يتوفر Realtime */
setInterval(()=>{if(visible()&&!S.busy&&S.wsOk)load(false);},45000);    /* تحقق دوري خفيف */

/* الوضع المظلم */
function themeMode(){try{return localStorage.getItem('p10_theme')||'auto';}catch(e){return 'auto';}}
function themeDark(){const m=themeMode();return m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);}
function themeLbl(){return {auto:'تلقائي',dark:'داكن',light:'فاتح'}[themeMode()];}
function themeApply(){const r=q('#p10root');if(r)r.classList.toggle('p10dark',themeDark());const b=q('#p10thm');if(b)b.textContent=themeLbl();}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeApply);}catch(e){}
setInterval(()=>{const e=q('#p10clk');if(e)e.textContent=new Date().toLocaleTimeString('en-GB');},1000);

/* ═══════ ١٠) الواجهة العامة + استبدال دوال الأصل ═══════ */
window.p10={
  base:c=>{S.base=c;S.rows.forEach(t=>t._e=null);renderAll(true);},
  period:p=>{S.period=p;window.PR=p==='year'?'month':p;S.sel=null;S.open={};renderAll(false);},
  range:r=>{S.range=r;S.f.from='';S.f.to='';S.open={};S.sel=null;load(false);},
  sel:i=>{S.sel=i;renderChart();},
  toggle:k=>{S.open[k]=!S.open[k];renderOps();},
  openGroup:(k,jump)=>{S.open[k]=true;if(jump){S.range='all';load(false).then(()=>{const el=document.querySelector('[data-p10k="'+k.replace(/"/g,'\\"')+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});});return;}
    renderOps();const el=document.querySelector('[data-p10k="'+k.replace(/"/g,'\\"')+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},
  theme:()=>{const nxt={auto:'dark',dark:'light',light:'auto'}[themeMode()];try{localStorage.setItem('p10_theme',nxt);}catch(e){}themeApply();toast('الوضع: '+themeLbl());},
  more:()=>load(true),eng,agg,state:S,detail,saveFees,drill,filters:filtersSheet,applyFilters,resetFilters,exportMenu,csv,pdf,ledger,copyDetail,
  applyFiltersFromQuery:()=>{}
};
window.loadProfit=()=>load(false);
window.renderProfit=()=>{ensure();renderAll(true);};
window.renderOpsProfit=()=>{};                       /* قسم bdl_ops القديم يندمج في المصدر الموحّد */
window.setPr=p=>window.p10.period(p);
if(visible())load(false);
wsConnect();
console.log('bdl-ops10: لوحة الأرباح المباشرة v2 جاهزة ✓');
})();
