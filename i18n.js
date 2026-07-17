/* ARKAN i18n — AR/FR/PT auto-detect + manual switch */
(function(){
  var DICT={
  /* ===== NAV & COMMON ===== */
  "الصرافة":{fr:"Change",pt:"Câmbio"},
  "المؤشرات":{fr:"Indicateurs",pt:"Indicadores"},
  "الاشتراكات":{fr:"Abonnements",pt:"Planos"},
  "كيف يعمل":{fr:"Comment ça marche",pt:"Como funciona"},
  "تواصل":{fr:"Contact",pt:"Contacto"},
  "ابدأ الآن":{fr:"Commencer",pt:"Começar"},
  "تواصل واتساب":{fr:"WhatsApp",pt:"WhatsApp"},
  /* ===== HERO (trading) ===== */
  "تداول بعين":{fr:"Tradez avec l'œil",pt:"Negocie com o olhar"},
  "المؤسسات":{fr:"des institutions",pt:"das instituições"},
  "لا بعين المتداول.":{fr:"pas celui du trader.",pt:"não do trader comum."},
  /* ===== EXCHANGE SECTION ===== */
  "أركان للصرافة والتسوية الدولية":{fr:"ARKAN Change & Règlement International",pt:"ARKAN Câmbio & Liquidação Internacional"},
  "أسعار يومية محدّثة بين الأوقية والكوانزا واليوان والدولار واليورو — جملة وتجزئة، وطلب تحويل مباشر عبر واتساب.":{
    fr:"Taux quotidiens actualisés entre Ouguiya, Kwanza, Yuan, Dollar et Euro — gros et détail, avec demande de transfert directe via WhatsApp.",
    pt:"Taxas diárias atualizadas entre Ouguiya, Kwanza, Yuan, Dólar e Euro — grosso e retalho, com pedido de transferência direto via WhatsApp."},
  "كوانزا أنغولية":{fr:"Kwanza angolais",pt:"Kwanza angolano"},
  "تيثر":{fr:"Tether",pt:"Tether"},
  "يورو":{fr:"Euro",pt:"Euro"},
  "افتح بوابة الأسعار":{fr:"Ouvrir le portail des taux",pt:"Abrir portal de taxas"},
  "جدول اليوم كاملًا بثلاث شرائح: جملة، متوسط، تجزئة — واحسب تحويلك فورًا.":{
    fr:"Tableau du jour en trois paliers : gros, moyen, détail — calculez votre transfert instantanément.",
    pt:"Tabela do dia em três níveis: grosso, médio, retalho — calcule a sua transferência na hora."},
  "أرسل طلبك واتساب":{fr:"Envoyez via WhatsApp",pt:"Envie via WhatsApp"},
  "رسالة جاهزة بالمبلغ والسعر ومرجع الطلب — تأكيد ودفع خلال دقائق.":{
    fr:"Message prêt avec montant, taux et référence — confirmation et paiement en minutes.",
    pt:"Mensagem pronta com valor, taxa e referência — confirmação e pagamento em minutos."},
  "تسوية الشركات":{fr:"Règlement entreprises",pt:"Liquidação empresarial"},
  "دفع فواتير الموردين الدوليين (الصين/أوروبا) بمرجع رسمي وفاتورة معتمدة.":{
    fr:"Paiement des factures fournisseurs internationaux (Chine/Europe) avec référence officielle et facture certifiée.",
    pt:"Pagamento de faturas de fornecedores internacionais (China/Europa) com referência oficial e fatura certificada."},
  "بوابة الأسعار ←":{fr:"Portail des taux ←",pt:"Portal de taxas ←"},
  "طلب مؤسسي ←":{fr:"Demande entreprise ←",pt:"Pedido empresarial ←"},
  /* ===== RATES PAGE ===== */
  "أسعار الصرف اليوم":{fr:"Taux de change du jour",pt:"Taxas de câmbio de hoje"},
  "أسعار اليوم (مقابل الأوقية)":{fr:"Taux du jour (contre Ouguiya)",pt:"Taxas de hoje (contra Ouguiya)"},
  "العملة":{fr:"Devise",pt:"Moeda"},
  "جملة":{fr:"Gros",pt:"Grosso"},
  "متوسط":{fr:"Moyen",pt:"Médio"},
  "تجزئة":{fr:"Détail",pt:"Retalho"},
  "احسب تحويلك":{fr:"Calculez votre transfert",pt:"Calcule a sua transferência"},
  "العملة التي تريد تحويلها":{fr:"Devise à convertir",pt:"Moeda a converter"},
  "المبلغ":{fr:"Montant",pt:"Montante"},
  "تستلم بالأوقية":{fr:"Vous recevez en Ouguiya",pt:"Recebe em Ouguiya"},
  "أرسل الطلب عبر واتساب":{fr:"Envoyer la demande via WhatsApp",pt:"Enviar pedido via WhatsApp"},
  "بعد الإرسال، أكّد الدفع وسنحوّل لك المبلغ فورًا.":{
    fr:"Après l'envoi, confirmez le paiement et nous transférons immédiatement.",
    pt:"Após o envio, confirme o pagamento e transferimos de imediato."},
  "لكل عملة حدّها — فوقه سعر الجملة، دونه التجزئة":{
    fr:"Chaque devise a son seuil — au-dessus : gros, en dessous : détail",
    pt:"Cada moeda tem o seu limite — acima: grosso, abaixo: retalho"},
  "اسمك (اختياري)":{fr:"Votre nom (optionnel)",pt:"O seu nome (opcional)"},
  /* ===== REQUEST PAGE ===== */
  "تحويلات الشركات الدولية":{fr:"Transferts internationaux d'entreprise",pt:"Transferências empresariais internacionais"},
  /* ===== FOOTER/MISC ===== */
  "عرض تأسيسي محدود — خصم حتى":{fr:"Offre fondateurs limitée — jusqu'à",pt:"Oferta fundadores limitada — até"},
  "على خطة المؤسسين":{fr:"sur le plan fondateurs",pt:"no plano fundadores"},
  };

  var LANGS=['ar','fr','pt'];
  function detect(){
    var saved=localStorage.getItem('arkan-lang');
    if(saved&&LANGS.indexOf(saved)>=0)return saved;
    var nav=(navigator.languages&&navigator.languages[0])||navigator.language||'ar';
    nav=nav.toLowerCase();
    if(nav.indexOf('pt')===0)return 'pt';
    if(nav.indexOf('fr')===0)return 'fr';
    return 'ar';
  }
  var cur=detect();

  function apply(lang){
    cur=lang;localStorage.setItem('arkan-lang',lang);
    document.documentElement.lang=lang;
    document.documentElement.dir=(lang==='ar')?'rtl':'ltr';
    /* استبدال النصوص: نمشي على العقد النصية */
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
    var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      var raw=n.nodeValue, t=raw.trim();
      if(!t)return;
      /* عند العودة للعربية: البحث العكسي */
      if(lang==='ar'){
        var orig=n._arkanAR;
        if(orig!=null){n.nodeValue=orig;}
        return;
      }
      var src=n._arkanAR!=null?n._arkanAR.trim():t;
      var d=DICT[src];
      if(d&&d[lang]){
        if(n._arkanAR==null)n._arkanAR=raw;
        n.nodeValue=raw.replace(t,d[lang]).replace(src,d[lang]);
        n.nodeValue=d[lang];
      }
    });
    /* placeholders */
    document.querySelectorAll('input[placeholder],select').forEach(function(el){
      var p=el.getAttribute('placeholder');if(!p)return;
      if(lang==='ar'&&el._arkanARP){el.setAttribute('placeholder',el._arkanARP);return;}
      var src=el._arkanARP||p;var d=DICT[src];
      if(d&&d[lang]){el._arkanARP=src;el.setAttribute('placeholder',d[lang]);}
    });
    /* تحديث أزرار المبدل */
    document.querySelectorAll('.arkan-lang button').forEach(function(b){
      b.classList.toggle('on',b.dataset.l===lang);
    });
  }

  /* مبدّل اللغة */
  function mountSwitcher(){
    if(document.querySelector('.arkan-lang'))return;
    var d=document.createElement('div');
    d.className='arkan-lang';
    d.style.cssText='position:fixed;bottom:16px;left:16px;z-index:99;display:flex;gap:4px;background:rgba(10,11,26,.85);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);border-radius:100px;padding:4px';
    LANGS.forEach(function(l){
      var b=document.createElement('button');
      b.dataset.l=l;b.textContent=l.toUpperCase();
      b.style.cssText='border:none;background:transparent;color:#8B8FA8;font-family:monospace;font-size:11px;font-weight:700;padding:7px 12px;border-radius:100px;cursor:pointer;letter-spacing:.05em';
      b.onclick=function(){apply(l);style(b)};
      d.appendChild(b);
    });
    function style(){
      d.querySelectorAll('button').forEach(function(b){
        var on=b.dataset.l===cur;
        b.style.background=on?'linear-gradient(135deg,#8B72FF,#5B3FD1)':'transparent';
        b.style.color=on?'#fff':'#8B8FA8';
      });
    }
    document.body.appendChild(d);
    var _apply=apply;
    apply=function(l){_apply(l);style();};
    style();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){mountSwitcher();if(cur!=='ar')apply(cur);});
  }else{mountSwitcher();if(cur!=='ar')apply(cur);}
})();
