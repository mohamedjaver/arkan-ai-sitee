/* BDL Splash — شاشة افتتاح متحركة: تُعرض مرة واحدة لكل جلسة */
(function(){
  try{
    if(sessionStorage.getItem('bdlSplashShown'))return;
    sessionStorage.setItem('bdlSplashShown','1');
  }catch(e){}
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR=reduce?900:3000;
  var css=''+
  '#bdlSplash{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;'+
  'background:radial-gradient(130% 110% at 50% 28%,#0D3A8C 0%,#082253 72%);transition:opacity .45s ease}'+
  '#bdlSplash.out{opacity:0;pointer-events:none}'+
  '#bdlSplash .bm{width:min(56vw,240px)}'+
  '#bdlSplash .bw{display:flex;gap:.08em;font-weight:800;font-size:clamp(38px,10vw,60px);letter-spacing:.05em;color:#F5F7FA;direction:ltr;font-family:Inter,-apple-system,sans-serif}'+
  '#bdlSplash .bw span{opacity:0;transform:translateY(24px);animation:bdlL .5s cubic-bezier(.22,1,.36,1) forwards}'+
  '#bdlSplash .bw span:nth-child(1){animation-delay:1.95s}'+
  '#bdlSplash .bw span:nth-child(2){animation-delay:2.07s}'+
  '#bdlSplash .bw span:nth-child(3){animation-delay:2.19s}'+
  '@keyframes bdlL{to{opacity:1;transform:translateY(0)}}'+
  '#bdlSplash .bu{opacity:0;animation:bdlSh .5s cubic-bezier(.22,1,.36,1) .1s forwards}'+
  '@keyframes bdlSh{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}'+
  '#bdlSplash .bg1{animation:bdlG 1s cubic-bezier(.34,1.3,.5,1) .5s both}'+
  '@keyframes bdlG{0%{transform:translateY(-320px) scale(.92);opacity:0}12%{opacity:1}58%{transform:translateY(0) scale(1)}'+
  '70%{transform:translateY(0) scale(1.07,.91)}84%{transform:translateY(-10px) scale(.98,1.03)}100%{transform:translateY(0) scale(1)}}'+
  '#bdlSplash .bt{opacity:0;transform:translateY(-70px);animation:bdlT .45s cubic-bezier(.34,1.56,.64,1) forwards}'+
  '#bdlSplash .bt2{animation-delay:1.55s}#bdlSplash .bt1{animation-delay:1.42s}'+
  '@keyframes bdlT{from{opacity:0;transform:translateY(-70px)}to{opacity:1;transform:translateY(0)}}'+
  '@media (prefers-reduced-motion:reduce){#bdlSplash .bu,#bdlSplash .bg1,#bdlSplash .bt,#bdlSplash .bw span{animation:none!important;opacity:1!important;transform:none!important}}';
  var svg='<svg viewBox="0 16 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;overflow:visible">'+
  '<defs><radialGradient id="bdlGG" cx="38%" cy="30%" r="85%"><stop offset="0%" stop-color="#1462BE"/><stop offset="55%" stop-color="#0B3F92"/><stop offset="100%" stop-color="#072C6B"/></radialGradient>'+
  '<pattern id="bdlDT" width="4.6" height="4.6" patternUnits="userSpaceOnUse"><circle cx="2.3" cy="2.3" r="1.2" fill="#A9DBFF"/></pattern>'+
  '<clipPath id="bdlGC"><circle cx="120" cy="100" r="30"/></clipPath></defs>'+
  '<path class="bu" d="M66 44 L66 93 A54 54 0 0 0 174 93 L174 44 L157 44 L157 93 A37 37 0 0 1 83 93 L83 44 Z" fill="#F5F7FA"/>'+
  '<g><path class="bt bt1" d="M101 44 h12 v20 a6 6 0 0 1 -12 0 Z" fill="#F5F7FA"/>'+
  '<path class="bt bt2" d="M127 44 h12 v20 a6 6 0 0 1 -12 0 Z" fill="#F5F7FA"/></g>'+
  '<ellipse cx="120" cy="127" rx="23" ry="4" fill="#04173D" opacity=".3"/>'+
  '<g class="bg1"><circle cx="120" cy="100" r="30" fill="url(#bdlGG)"/>'+
  '<g clip-path="url(#bdlGC)"><g fill="url(#bdlDT)"><path d="M94 87 C98 79 109 75 117 77 C123 79 124 84 119 88 C114 91 110 91 108 96 C105 101 101 103 97 101 C92 98 91 92 94 87 Z"/><path d="M104 107 C109 103 115 105 116 111 C118 117 115 124 111 128 C108 131 104 130 102 125 C100 119 100 110 104 107 Z"/><path d="M128 77 C132 74 139 74 142 77 C144 80 143 83 139 84 C134 84 130 82 128 77 Z"/><path d="M126 88 C132 84 141 85 146 91 C150 96 149 106 145 111 C142 116 136 118 133 115 C128 111 125 105 124 99 C124 95 124 91 126 88 Z"/><path d="M145 80 C150 77 156 79 157 84 C159 88 155 92 151 90 C146 88 143 83 145 80 Z"/><path d="M140 118 C144 115 149 117 150 121 C151 125 147 128 143 126 C139 124 138 120 140 118 Z"/></g>'+
  '<g stroke="#6FBEFF" stroke-width=".6" opacity=".22" fill="none">'+
  '<ellipse cx="120" cy="100" rx="30" ry="11"/><ellipse cx="120" cy="100" rx="30" ry="22"/>'+
  '<ellipse cx="120" cy="100" rx="11" ry="30"/><ellipse cx="120" cy="100" rx="22" ry="30"/></g></g>'+
  '<circle cx="120" cy="100" r="30" fill="none" stroke="#04173D" stroke-opacity=".3" stroke-width="1.8"/></g></svg>';
  function mount(){
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var d=document.createElement('div');d.id='bdlSplash';
    d.innerHTML='<div class="bm">'+svg+'</div><div class="bw"><span>B</span><span>D</span><span>L</span></div>';
    document.body.appendChild(d);
    setTimeout(function(){d.classList.add('out');setTimeout(function(){d.remove();st.remove();},500);},DUR);
  }
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
})();
