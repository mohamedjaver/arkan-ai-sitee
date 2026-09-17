/* BDL — مرجع السوق الحقيقي للدولار/USDT/الدرهم بالأوقية (Build 1346)
   المصدر: Binance P2P (USDT/MRU) — وسيط أفضل 10 عروض بيع وشراء.
   الهدف: تسعير USDT/USD/AED على السوق الفعلي الذي يتعامل به المالك، لا على مرجع BCM الرسمي وحده. */
const P2P='https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
async function side(tradeType, fiat, asset){
  const r=await fetch(P2P,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
    body:JSON.stringify({asset,fiat,tradeType,page:1,rows:10,payTypes:[],publisherType:null,transAmount:''}),signal:AbortSignal.timeout(12000)});
  if(!r.ok) throw new Error('p2p '+r.status);
  const j=await r.json(); const ps=(j.data||[]).map(x=>+((x.adv||{}).price)).filter(v=>v>0).sort((a,b)=>a-b);
  if(!ps.length) return null;
  return { median: ps[Math.floor(ps.length/2)], best: ps[0], worst: ps[ps.length-1], n: ps.length };
}
/* يعيد {sell,buy,mid,at} بالأوقية الجديدة لكل 1 USDT — sell = ما يدفعه المشتري في السوق (المرجع لبيعنا)، buy = ما يقبضه البائع */
async function fetchUSDT(fiat){
  fiat=fiat||'MRU';
  try{
    const [s,b]=await Promise.all([side('BUY',fiat,'USDT').catch(()=>null), side('SELL',fiat,'USDT').catch(()=>null)]);
    /* في Binance: tradeType BUY = إعلانات البائعين (السعر الذي يشتري به المستخدم) */
    const sell=s&&s.median, buy=b&&b.median;
    if(!sell&&!buy) return null;
    return { sell: sell||buy, buy: buy||sell, mid: +(((sell||buy)+(buy||sell))/2).toFixed(2), n:(s?s.n:0)+(b?b.n:0), at:new Date().toISOString(), src:'Binance P2P' };
  }catch(e){ return null; }
}
const AED_PER_USD=3.6725; /* ربط الدرهم بالدولار — ثابت */
module.exports={ fetchUSDT, AED_PER_USD };
