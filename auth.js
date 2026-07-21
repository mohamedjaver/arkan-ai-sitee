/* ============================================================
   ARKAN — نظام الحسابات (Firebase Auth)
   خامل تمامًا حتى تُملأ مفاتيح firebase في config.js
   عندها يظهر زر "حسابي" ويعمل الدخول بالبريد أو Google.
   ============================================================ */
(function(){
  var C=(window.ARKAN_CONFIG||{}).firebase||{};
  if(!C.apiKey)return; /* لا مفاتيح = لا شيء يظهر */

  var A=null,DB=null,user=null;

  function css(){
    var s=document.createElement('style');
    s.textContent=`
    #authBtn{position:fixed;bottom:16px;right:16px;z-index:98;background:rgba(8,9,20,.9);backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:10px 18px;color:#f0f0f5;font-size:13px;
      font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px}
    #authBtn:hover{border-color:#c9a84c;color:#c9a84c}
    #authOv{position:fixed;inset:0;z-index:150;background:rgba(4,5,12,.82);backdrop-filter:blur(10px);
      display:none;align-items:center;justify-content:center;padding:20px}
    #authOv.on{display:flex}
    #authBox{background:linear-gradient(160deg,#0e0e18,#141420);border:1px solid #2a2a40;border-radius:20px;
      padding:28px;width:100%;max-width:390px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
    #authBox h3{font-size:19px;margin-bottom:6px}
    #authBox p{color:#9ca3af;font-size:13px;margin-bottom:20px}
    #authBox input{width:100%;background:rgba(0,0,0,.34);border:1px solid #2a2a40;border-radius:10px;
      padding:13px 15px;color:#f0f0f5;font-size:14px;outline:none;margin-bottom:11px;font-family:inherit}
    #authBox input:focus{border-color:#c9a84c}
    #authBox .b{width:100%;padding:14px;border-radius:14px;border:none;font-weight:700;font-size:14px;
      cursor:pointer;margin-bottom:9px;font-family:inherit}
    .bGold{background:linear-gradient(135deg,#e0c268,#c9a84c);color:#151005}
    .bLine{background:transparent;border:1px solid #2a2a40 !important;color:#f0f0f5}
    #authMsg{font-size:12.5px;text-align:center;margin-top:10px;min-height:18px}
    #authX{float:left;background:none;border:none;color:#6b7280;font-size:22px;cursor:pointer;line-height:1}`;
    document.head.appendChild(s);
  }
  function ui(){
    var b=document.createElement('button');
    b.id='authBtn';b.innerHTML='<i class="fa-regular fa-user"></i><span id="authLbl">حسابي</span>';
    b.onclick=function(){ user?logout():open_(); };
    document.body.appendChild(b);
    var o=document.createElement('div');
    o.id='authOv';
    o.innerHTML=`<div id="authBox">
      <button id="authX" onclick="document.getElementById('authOv').classList.remove('on')">×</button>
      <h3>تسجيل الدخول</h3>
      <p>ادخل لحفظ طلباتك ومتابعة حالتها.</p>
      <input id="aEmail" type="email" placeholder="البريد الإلكتروني" autocomplete="email">
      <input id="aPass" type="password" placeholder="كلمة المرور" autocomplete="current-password">
      <button class="b bGold" id="aLogin">دخول</button>
      <button class="b bLine" id="aReg">إنشاء حساب جديد</button>
      <button class="b bLine" id="aGoogle"><i class="fa-brands fa-google"></i> متابعة بحساب Google</button>
      <div id="authMsg"></div>
    </div>`;
    document.body.appendChild(o);
    o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on');});
  }
  function open_(){document.getElementById('authOv').classList.add('on');}
  function msg(t,ok){var m=document.getElementById('authMsg');m.textContent=t;m.style.color=ok?'#00d4aa':'#ff4757';}
  function label(){
    var l=document.getElementById('authLbl');
    if(l)l.textContent=user?(user.email||'حسابي').split('@')[0]:'حسابي';
  }
  function logout(){ if(A)A.signOut(A.auth?A.auth:null); }

  css();ui();

  Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
  ]).then(function(m){
    var app=m[0].initializeApp(C), auth=m[1].getAuth(app);
    A={signOut:function(){m[1].signOut(auth);}};
    m[1].onAuthStateChanged(auth,function(u){user=u;label();
      if(u)document.getElementById('authOv').classList.remove('on');});
    document.getElementById('aLogin').onclick=function(){
      m[1].signInWithEmailAndPassword(auth,aEmail.value.trim(),aPass.value)
        .then(function(){msg('تم الدخول ✓',true);})
        .catch(function(e){msg(fbErr(e.code));});
    };
    document.getElementById('aReg').onclick=function(){
      m[1].createUserWithEmailAndPassword(auth,aEmail.value.trim(),aPass.value)
        .then(function(){msg('تم إنشاء الحساب ✓',true);})
        .catch(function(e){msg(fbErr(e.code));});
    };
    document.getElementById('aGoogle').onclick=function(){
      var p=new m[1].GoogleAuthProvider();
      m[1].signInWithPopup(auth,p).then(function(){msg('تم الدخول ✓',true);})
        .catch(function(e){msg(fbErr(e.code));});
    };
  }).catch(function(){});

  function fbErr(c){
    var M={'auth/invalid-email':'بريد غير صالح','auth/user-not-found':'لا يوجد حساب بهذا البريد',
      'auth/wrong-password':'كلمة المرور غير صحيحة','auth/email-already-in-use':'البريد مستخدم بالفعل',
      'auth/weak-password':'كلمة المرور ضعيفة (6 أحرف على الأقل)','auth/invalid-credential':'بيانات الدخول غير صحيحة',
      'auth/popup-closed-by-user':'أُغلقت النافذة'};
    return M[c]||'تعذّر إتمام العملية';
  }
})();
