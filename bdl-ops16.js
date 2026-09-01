/* bdl-ops16.js — اختيار زوج التسعير بالأعلام في شيت التسوية (Build 1161)
   للعمليات بعملة غير الأوقية (USDT/USD/EUR…): بلاطتان بأعلام Wise-style: «← كوانزا» / «← أوقية» بدل القائمة المنسدلة. */
'use strict';
(function(){
const FL={AOA:'ao',MRU:'mr',USDT:'usdt',USD:'us',EUR:'eu',CNY:'cn',AED:'ae'};
const fl=(c,sz)=>{const f=FL[String(c||'').toUpperCase()];sz=sz||28;return f?'<img src="flags/'+f+'.png" alt="'+c+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%!important;object-fit:cover;box-shadow:0 0 0 2px #fff,0 3px 8px rgba(0,0,0,.2)">':'<span style="display:inline-grid;place-items:center;width:'+sz+'px;height:'+sz+'px;background:#0B2F70;color:#fff;font:800 10px Inter;border-radius:50%!important">'+String(c||'?').slice(0,3)+'</span>';};
const css=document.createElement('style');css.textContent=`
#p16pair{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
#p16pair.on{display:grid}
#p16pair button{border:2px solid #C9DFFA;background:#fff;padding:11px 8px;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px}
#p16pair button.on{border-color:#0A56B8;background:#F2F8FF}
#p16pair .fx{display:flex;align-items:center;gap:6px}
#p16pair .fx svg{color:#66788F}
#p16pair b{font-size:12.5px;color:#0B2F70}
#p16pair small{font-size:10.5px;color:#66788F}
#ssPair{display:none!important}
`;document.head.appendChild(css);
function render(){
  const sel=document.getElementById('ssPair');if(!sel)return;
  let box=document.getElementById('p16pair');
  if(!box){box=document.createElement('div');box.id='p16pair';sel.insertAdjacentElement('afterend',box);}
  const opts=(typeof ssPairOpts==='function')?ssPairOpts():[];
  const single=opts.length<=1&&opts[0]&&opts[0].v==='MRU_AOA_OLD';
  box.classList.toggle('on',!single&&opts.length>0);
  if(single||!opts.length){box.innerHTML='';return;}
  const cur=sel.value||opts[0].v;
  box.innerHTML=opts.map(o=>'<button type="button" class="'+(o.v===cur?'on':'')+'" onclick="p16.pick(\''+o.v+'\')">'+
    '<span class="fx">'+fl(o.base)+'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'+fl(o.tgt)+'</span>'+
    '<b>'+o.base+' ← '+(o.tgt==='AOA'?'كوانزا':'أوقية')+'</b><small>'+(o.tgt==='AOA'?'بعتُه مقابل كوانزا':'بعتُه مقابل أوقية')+' · '+o.tgt+' لكل 1 '+o.base+'</small></button>').join('');
}
window.p16={pick:v=>{const sel=document.getElementById('ssPair');if(!sel)return;sel.value=v;if(typeof ssPairUi==='function')ssPairUi();if(typeof ssRatePrev==='function')ssRatePrev();render();}};
const U=window.ssPairUi;if(typeof U==='function')window.ssPairUi=function(){U.apply(this,arguments);render();};
console.log('bdl-ops16: أعلام زوج التسعير جاهزة ✓');
})();
