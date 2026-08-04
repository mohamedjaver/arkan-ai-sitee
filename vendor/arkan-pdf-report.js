/* ═══════════════════════════════════════════════════════════════
   ARKAN Intelligence Archive — Receipts PDF Report
   jsPDF + AutoTable + Noto Naskh (نص حقيقي قابل للنسخ والبحث)
   يعمل محليًا داخل المتصفح بالكامل — بدون خادم.
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var BLUE='#0B2A66', BLUE2='#0056D6', SKY='#0B8BE8', GREEN='#0A9E5C', ORANGE='#D97706',
    INK='#102A43', MUTED='#486581', LINE='#D9E5F2', BGROW='#F5F9FF';

var L={
 ar:{title:'تقرير الإيصالات', gen:'تاريخ إنشاء التقرير', count:'عدد الإيصالات', total:'إجمالي المبالغ',
     cur:'العملة', verified:'الإيصالات الموثّقة', review:'تحتاج مراجعة', multi:'متعددة',
     cols:['#','التاريخ','البنك','المستفيد','المبلغ','العملة','الحالة'],
     ok:'✓ موثّق', warn:'⚠ يحتاج مراجعة', unknown:'Unknown',
     summary:'الملخص', avg:'متوسط قيمة الإيصال', max:'أكبر إيصال', min:'أصغر إيصال',
     banks:'عدد البنوك المختلفة', bens:'عدد المستفيدين',
     byBank:'الإجماليات حسب البنك', byBen:'الإجماليات حسب المستفيد',
     bank:'البنك', ben:'المستفيد', ops:'عدد العمليات', amt:'إجمالي المبلغ', page:'صفحة', of:'من', rtl:true},
 en:{title:'Receipts Report', gen:'Report generated', count:'Receipts', total:'Total amounts',
     cur:'Currency', verified:'Verified receipts', review:'Need review', multi:'Multiple',
     cols:['#','Date','Bank','Beneficiary','Amount','Currency','Status'],
     ok:'✓ Verified', warn:'⚠ Needs review', unknown:'Unknown',
     summary:'Summary', avg:'Average receipt', max:'Largest receipt', min:'Smallest receipt',
     banks:'Distinct banks', bens:'Beneficiaries',
     byBank:'Totals by Bank', byBen:'Totals by Beneficiary',
     bank:'Bank', ben:'Beneficiary', ops:'Operations', amt:'Total amount', page:'Page', of:'of', rtl:false},
 pt:{title:'Relatório de Recibos', gen:'Relatório gerado em', count:'Recibos', total:'Montantes totais',
     cur:'Moeda', verified:'Recibos verificados', review:'Precisam de revisão', multi:'Várias',
     cols:['#','Data','Banco','Beneficiário','Montante','Moeda','Estado'],
     ok:'✓ Verificado', warn:'⚠ Rever', unknown:'Unknown',
     summary:'Resumo — Summary', avg:'Média por recibo', max:'Maior recibo', min:'Menor recibo',
     banks:'Bancos distintos', bens:'Beneficiários',
     byBank:'Totais por Banco', byBen:'Totais por Beneficiário',
     bank:'Banco', ben:'Beneficiário', ops:'Operações', amt:'Montante total', page:'Página', of:'de', rtl:false}
};

var nf=function(n,d){return (+n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d==null?2:d});};

function pickLang(){
  var l=(localStorage.getItem('arkan_lang')||document.documentElement.lang||'ar').slice(0,2);
  return L[l]?l:'ar';
}

var AR_RE=/[\u0600-\u06FF]/;
function fontFor(s){ return AR_RE.test(String(s))?'NotoNaskh':'helvetica'; }
function registerFonts(pdf){
  var F=window.ARKAN_FONTS||{};
  if(F.reg){ pdf.addFileToVFS('NotoNaskh-Regular.ttf',F.reg); pdf.addFont('NotoNaskh-Regular.ttf','NotoNaskh','normal'); }
  if(F.bold){ pdf.addFileToVFS('NotoNaskh-Bold.ttf',F.bold); pdf.addFont('NotoNaskh-Bold.ttf','NotoNaskh','bold'); }
}

function collect(docs){
  var rows=docs.map(function(d){
    var p=d.parsed||{};
    return {
      date:p.date||'', ts:p.date?Date.parse(p.date)||d.uploadedAt||0:(d.uploadedAt||0),
      bank:(p.bank||'').trim(), ben:(p.beneficiary||'').trim(),
      amount:+p.amount||0, cur:(p.currency||'').trim().toUpperCase(),
      ok:!!d.verifiedByUser||!d.needsReview
    };
  }).sort(function(a,b){return a.ts-b.ts;});
  var byCur={}, byBank={}, byBen={};
  rows.forEach(function(r){
    var c=r.cur||'?'; byCur[c]=(byCur[c]||0)+r.amount;
    var b=r.bank||'Unknown';
    (byBank[b]=byBank[b]||{n:0,amt:0}); byBank[b].n++; byBank[b].amt+=r.amount;
    var e=r.ben||'—';
    (byBen[e]=byBen[e]||{n:0,amt:0}); byBen[e].n++; byBen[e].amt+=r.amount;
  });
  return {rows:rows, byCur:byCur, byBank:byBank, byBen:byBen};
}

function totalsLine(byCur, t){
  var ks=Object.keys(byCur).filter(function(k){return k!=='?'||Object.keys(byCur).length===1;});
  if(!ks.length) return '0';
  return ks.map(function(k){return nf(byCur[k],2)+' '+(k==='?'?'':k);}).join('  ·  ');
}

window.ArkanPdfReport={ run: function(docs){
  try{
    var t=L[pickLang()];
    var JS=window.jspdf&&window.jspdf.jsPDF;
    if(!JS){ alert('PDF engine not loaded'); return; }
    var pdf=new JS({unit:'pt',format:'a4'});
    registerFonts(pdf);
    var FONT='NotoNaskh';
    var W=pdf.internal.pageSize.getWidth(), H=pdf.internal.pageSize.getHeight();
    var M=40, dat=collect(docs), rows=dat.rows;
    var today=new Date(), iso=today.toISOString().slice(0,10);
    var curKeys=Object.keys(dat.byCur), mainCur=curKeys.length===1?curKeys[0]:t.multi;
    var okN=rows.filter(function(r){return r.ok;}).length, revN=rows.length-okN;

    /* ── الرأس البنكي ── */
    function header(first){
      pdf.setFillColor(BLUE); pdf.rect(0,0,W,first?110:0,'F');
      if(!first)return;
      pdf.setFillColor(SKY); pdf.rect(0,110,W,4,'F');
      pdf.setTextColor('#FFFFFF'); pdf.setFont('helvetica','bold'); pdf.setFontSize(22);
      pdf.text('ARKAN INTELLIGENCE',M,44);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor('#9CC3F5');
      pdf.text('ARCHIVE - AI OCR 2.0',M,60);
      pdf.setTextColor('#FFFFFF'); pdf.setFont(fontFor(t.title),'bold'); pdf.setFontSize(15);
      pdf.text(t.title,W-M,44,{align:'right'});
      pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor('#BBD7F6');
      pdf.text('Receipts Report - arkanrates.com',W-M,60,{align:'right'});
      /* معلومات التقرير — صفّان × ثلاث خلايا */
      pdf.setFontSize(9.5);
      var info=[
        [t.gen, today.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})],
        [t.count, String(rows.length)],
        [t.total, totalsLine(dat.byCur,t)],
        [t.cur, mainCur],
        [t.verified, String(okN)],
        [t.review, String(revN)]
      ];
      var colw=(W-2*M)/3;
      for(var i=0;i<info.length;i++){
        var cx=M+(i%3)*colw, cy=80+Math.floor(i/3)*15;
        pdf.setTextColor('#9CC3F5'); pdf.setFont(fontFor(info[i][0]),'normal');
        var lab=String(info[i][0]); pdf.text(lab,cx,cy);
        var lw=pdf.getTextWidth(lab)+5;
        pdf.setTextColor('#FFFFFF'); pdf.setFont(fontFor(info[i][1]),'bold');
        pdf.text(String(info[i][1]),cx+lw,cy);
      }
    }

    /* ── جدول الإيصالات ── */
    var cols=t.cols.slice(); var body=rows.map(function(r,i){
      return [String(i+1), r.date||'—', r.bank||t.unknown, r.ben||'—',
              nf(r.amount,2), r.cur||'—', r.ok?t.ok:t.warn];
    });
    if(t.rtl){ cols=cols.slice().reverse(); body=body.map(function(r){return r.slice().reverse();}); }
    var statusIdx=t.rtl?0:6;

    pdf.autoTable({
      head:[cols], body:body, startY:126, margin:{left:M,right:M,top:60,bottom:46},
      styles:{font:FONT,fontStyle:'normal',fontSize:8.6,cellPadding:5,textColor:INK,lineColor:LINE,lineWidth:.6,halign:t.rtl?'right':'left'},
      headStyles:{fillColor:BLUE2,textColor:'#FFFFFF',fontStyle:'bold',fontSize:9,halign:t.rtl?'right':'left'},
      alternateRowStyles:{fillColor:BGROW},
      showHead:'everyPage',
      didParseCell:function(d){
        d.cell.styles.font=fontFor(d.cell.raw);
        if(d.section==='head')d.cell.styles.fontStyle='bold';
        if(d.section==='body'&&d.column.index===statusIdx){
          var v=String(d.cell.raw||'');
          d.cell.styles.textColor=(v.indexOf('✓')===0)?GREEN:ORANGE;
          d.cell.styles.fontStyle='bold';
        }
      },
      didDrawPage:function(){ header(pdf.internal.getNumberOfPages()===1); }
    });

    /* ── صفحة الملخص ── */
    pdf.addPage();
    var y=60;
    pdf.setFillColor(BLUE); pdf.rect(0,0,W,6,'F');
    pdf.setTextColor(BLUE); pdf.setFont(fontFor(t.summary),'bold'); pdf.setFontSize(16);
    pdf.text(t.summary, t.rtl?W-M:M, y, {align:t.rtl?'right':'left'}); y+=14;
    pdf.setDrawColor(SKY); pdf.setLineWidth(2); pdf.line(M,y,W-M,y); y+=22;

    var amounts=rows.map(function(r){return r.amount;}).filter(function(v){return v>0;});
    var sum=amounts.reduce(function(a,b){return a+b;},0);
    var stats=[
      [t.count, String(rows.length)],
      [t.total, totalsLine(dat.byCur,t)],
      [t.avg, amounts.length?nf(sum/amounts.length,2):'0'],
      [t.max, amounts.length?nf(Math.max.apply(null,amounts),2):'0'],
      [t.min, amounts.length?nf(Math.min.apply(null,amounts),2):'0'],
      [t.banks, String(Object.keys(dat.byBank).filter(function(k){return k!=='Unknown';}).length)],
      [t.bens, String(Object.keys(dat.byBen).filter(function(k){return k!=='—';}).length)],
      [t.verified, String(okN)],
      [t.review, String(revN)]
    ];
    pdf.setFontSize(10.5);
    stats.forEach(function(kv){
      pdf.setFont(fontFor(kv[0]),'normal'); pdf.setTextColor(MUTED);
      pdf.text(kv[0], t.rtl?W-M:M, y, {align:t.rtl?'right':'left'});
      pdf.setFont(fontFor(kv[1]),'bold'); pdf.setTextColor(INK);
      pdf.text(String(kv[1]), t.rtl?M:W-M, y, {align:t.rtl?'left':'right'});
      pdf.setDrawColor(LINE); pdf.setLineWidth(.6); pdf.line(M,y+6,W-M,y+6);
      y+=22;
    });

    function totalsTable(title, mapObj, keyLabel){
      y+=16;
      pdf.setFont(fontFor(title),'bold'); pdf.setFontSize(12.5); pdf.setTextColor(BLUE);
      pdf.text(title, t.rtl?W-M:M, y, {align:t.rtl?'right':'left'}); y+=8;
      var entries=Object.keys(mapObj).map(function(k){return [k,mapObj[k].n,mapObj[k].amt];})
        .sort(function(a,b){return b[2]-a[2];});
      var head=[keyLabel,t.ops,t.amt], bd=entries.map(function(e){return [e[0],String(e[1]),nf(e[2],2)];});
      if(t.rtl){ head=head.slice().reverse(); bd=bd.map(function(r){return r.slice().reverse();}); }
      pdf.autoTable({
        head:[head], body:bd, startY:y, margin:{left:M,right:M,bottom:60},
        styles:{font:FONT,fontSize:8.8,cellPadding:5,textColor:INK,lineColor:LINE,lineWidth:.6,halign:t.rtl?'right':'left'},
        headStyles:{fillColor:BLUE,textColor:'#FFFFFF',fontStyle:'bold',halign:t.rtl?'right':'left'},
        alternateRowStyles:{fillColor:BGROW}, showHead:'everyPage',
        didParseCell:function(d){ d.cell.styles.font=fontFor(d.cell.raw); if(d.section==='head')d.cell.styles.fontStyle='bold'; }
      });
      y=pdf.lastAutoTable.finalY+10;
      if(y>H-160){ pdf.addPage(); y=60; }
    }
    totalsTable(t.byBank, dat.byBank, t.bank);
    totalsTable(t.byBen, dat.byBen, t.ben);

    /* تذييل الختام على الصفحة الأخيرة */
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(MUTED);
    pdf.text('Generated by', W/2, H-64, {align:'center'});
    pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.setTextColor(BLUE);
    pdf.text('ARKAN Intelligence Archive', W/2, H-50, {align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); pdf.setTextColor(MUTED);
    pdf.text('AI OCR 2.0 · arkanrates.com', W/2, H-38, {align:'center'});

    /* أرقام الصفحات على كل الصفحات */
    var total=pdf.internal.getNumberOfPages();
    for(var p=1;p<=total;p++){
      pdf.setPage(p);
      pdf.setFont(fontFor(t.page),'normal'); pdf.setFontSize(8.5); pdf.setTextColor(MUTED);
      pdf.text(t.page+' '+p+' '+t.of+' '+total, W/2, H-18, {align:'center'});
      pdf.setDrawColor(LINE); pdf.setLineWidth(.5); pdf.line(M,H-28,W-M,H-28);
    }

    pdf.save('ARKAN_Receipts_'+iso+'.pdf');
  }catch(e){ console.error(e); alert('PDF error: '+(e.message||e)); }
}};
})();
