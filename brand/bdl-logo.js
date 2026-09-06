/* BDL brand v3 — applies the new logo to every page. Load once: <script src="/brand/bdl-logo.js?v=3"></script> */
(function(){
  var B='/brand/', v='?v=3';
  var A={mark:B+'bdl-mark.svg'+v, icon:B+'bdl-icon-fullbleed.svg'+v,
         horiz:B+'bdl-logo-horizontal.svg'+v, horizWhite:B+'bdl-logo-horizontal-white.svg'+v,
         map:B+'bdl-logo-map.svg'+v, png512:B+'icon-512.png'+v, png192:B+'icon-192.png'+v,
         apple:B+'apple-touch-icon.png'+v, fav32:B+'favicon-32.png'+v, fav16:B+'favicon-16.png'+v};
  window.BDL_LOGO=A;

  function head(rel,href,extra){
    var q='link[rel="'+rel+'"]'+(extra&&extra.sizes?'[sizes="'+extra.sizes+'"]':'');
    var l=document.querySelector(q)||document.createElement('link');
    l.rel=rel; l.href=href; if(extra) for(var k in extra) l.setAttribute(k,extra[k]);
    if(!l.parentNode) document.head.appendChild(l);
  }
  head('icon',A.fav32,{sizes:'32x32',type:'image/png'});
  head('icon',A.fav16,{sizes:'16x16',type:'image/png'});
  head('apple-touch-icon',A.apple,{sizes:'180x180'});
  var th=document.querySelector('meta[name="theme-color"]')||document.head.appendChild(document.createElement('meta'));
  th.name='theme-color'; th.content='#0B2F70';

  function isDark(el){
    var e=el; while(e&&e!==document.body){
      var bg=getComputedStyle(e).backgroundColor, m=bg&&bg.match(/\d+/g);
      if(m&&m.length>=3&&(m[3]===undefined||+m[3]>0)){ return (0.299*m[0]+0.587*m[1]+0.114*m[2])<140; }
      e=e.parentElement;
    } return false;
  }
  function swap(){
    var sel='img[src*="logo"],img[alt*="BDL"],img[alt*="لبدال"],img[src*="icon-"],[data-bdl-logo]';
    document.querySelectorAll(sel).forEach(function(el){
      var kind=el.getAttribute('data-bdl-logo')||'auto';
      var square=el.naturalWidth?Math.abs(el.naturalWidth-el.naturalHeight)<el.naturalWidth*0.25:(el.getBoundingClientRect().height>0&&Math.abs(el.getBoundingClientRect().width-el.getBoundingClientRect().height)<20);
      var src= kind==='mark'?A.mark : kind==='horizontal'?A.horiz : kind==='horizontal-white'?A.horizWhite : kind==='map'?A.map
             : square?A.mark : (isDark(el)?A.horizWhite:A.horiz);
      if(el.tagName==='IMG'){ if(el.src.indexOf(src.split('?')[0])<0) el.src=src; el.alt=el.alt||'BDL — لبدال'; }
      else { el.style.backgroundImage='url("'+src+'")'; el.style.backgroundSize='contain'; el.style.backgroundRepeat='no-repeat'; }
    });
    document.querySelectorAll('.brand-text,.logo-text,.wordmark').forEach(function(t){
      if(!t.querySelector('img')&&/^\s*(BDL|لبدال)\s*$/.test(t.textContent)){
        var im=new Image(); im.src=isDark(t)?A.horizWhite:A.horiz; im.alt='BDL — لبدال'; im.style.height='38px'; im.style.width='auto'; im.style.verticalAlign='middle';
        t.textContent=''; t.appendChild(im);
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',swap); else swap();
  new MutationObserver(function(){ clearTimeout(swap._t); swap._t=setTimeout(swap,120); }).observe(document.documentElement,{childList:true,subtree:true});
})();
