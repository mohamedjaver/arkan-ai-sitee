/* bdl-brand.js — شعار BDL المشترك لكل التقارير (Canvas → PDF) والرؤوس.
   window.BDL_LOGO   : صورة الأيقونة (arkan-icon-512.png) محمّلة عند فتح الصفحة
   bdlLogo(ctx,x,y,s,r): يرسم الشعار بزوايا مدوّرة داخل canvas؛ يعيد false إن لم تُحمّل بعد */
(function(){
  if(!window.BDL_LOGO){var im=new Image();im.decoding='async';im.src='arkan-icon-512.png';window.BDL_LOGO=im;}
  window.bdlLogo=function(x,px,py,s,r){
    var im=window.BDL_LOGO;if(!(im&&im.complete&&im.naturalWidth))return false;
    r=r==null?Math.round(s*.22):r;
    x.save();x.beginPath();
    x.moveTo(px+r,py);x.arcTo(px+s,py,px+s,py+s,r);x.arcTo(px+s,py+s,px,py+s,r);x.arcTo(px,py+s,px,py,r);x.arcTo(px,py,px+s,py,r);x.closePath();
    x.clip();x.drawImage(im,px,py,s,s);x.restore();return true;
  };
})();
