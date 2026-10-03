/* ============================================================
   FILE: 10-print.js
   PURPOSE: Print system — v10.5 (Full Denomination Display)
   VERSION: v10.5
   ============================================================ */

'use strict';

function buildPrintHTML(title, bodyHTML){
  const now = new Date();
  const bf = currentBranchFilter();
  const bl = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || bf);
  
  const printCSS =
    '@page{size:A4 portrait;margin:6mm 8mm}' +
    '@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;transform:scale(0.85);transform-origin:top left;width:117%}}' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Noto Sans Bengali",sans-serif;color:#111;background:#fff;font-size:10px;line-height:1.35}' +
    '.print-container{max-width:21cm;margin:0 auto;padding:0}' +
    '.print-header{display:flex;align-items:center;gap:10px;padding-bottom:6px;border-bottom:2px solid #1e40af;margin-bottom:8px}' +
    '.print-logo{width:44px;height:44px;flex-shrink:0}' +
    '.print-header-text{flex:1}' +
    '.print-header-text h1{font-size:16px;font-weight:900;color:#1e40af}' +
    '.print-header-text h2{font-size:10.5px;color:#475569;font-weight:700;margin-top:1px}' +
    '.print-meta{text-align:right;font-size:9.5px;color:#475569;font-weight:700;line-height:1.5}' +
    '.print-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:6px;padding:6px 10px;background:linear-gradient(90deg,#dbeafe,#eff6ff);border-left:3px solid #1e40af;border-radius:3px}' +
    '.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px}' +
    '.info-cell{padding:5px 8px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc}' +
    '.info-cell .lbl{font-size:8.5px;color:#64748b;font-weight:700;text-transform:uppercase}' +
    '.info-cell .val{font-size:11px;color:#0f172a;font-weight:900;margin-top:1px}' +
    '.info-cell.green{background:#f0fdf4;border-color:#86efac}.info-cell.green .val{color:#15803d}' +
    '.info-cell.blue{background:#eff6ff;border-color:#93c5fd}.info-cell.blue .val{color:#1e40af}' +
    '.info-cell.yellow{background:#fefce8;border-color:#fde047}.info-cell.yellow .val{color:#a16207}' +
    '.info-cell.red{background:#fef2f2;border-color:#fca5a5}.info-cell.red .val{color:#b91c1c}' +
    'table.tbl-print{width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:6px}' +
    'table.tbl-print th{background:#1e40af;color:#fff;padding:5px 6px;text-align:left;font-weight:800;font-size:8.5px;border:1px solid #1e40af}' +
    'table.tbl-print td{padding:4px 6px;border:1px solid #cbd5e1;color:#0f172a;font-weight:600;vertical-align:top}' +
    'table.tbl-print td.amt{font-weight:900;color:#15803d;text-align:right;white-space:nowrap}' +
    '.footer{margin-top:10px;padding-top:8px;border-top:1.5px dashed #94a3b8;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}' +
    '.footer .sig{text-align:center;padding-top:26px;font-size:9.5px;font-weight:700;color:#334155}' +
    '.footer .sig::before{content:"";display:block;width:78%;margin:0 auto 3px;border-top:1px solid #64748b}' +
    '.summary-line{display:flex;justify-content:space-between;padding:5px 10px;background:#f1f5f9;border-radius:4px;margin-bottom:6px;font-weight:800;font-size:10.5px}' +
    '.note-box{padding:8px 10px;border-radius:4px;background:#fefce8;border:1.5px solid #fde047;margin-bottom:6px}' +
    '.note-box .lbl{font-size:9px;color:#a16207;font-weight:800;text-transform:uppercase;margin-bottom:4px}' +
    '.note-box .val{font-size:11px;color:#0f172a;font-weight:700;line-height:1.5}' +
    '.denom-box{padding:8px 10px;border-radius:4px;background:#f8fafc;border:1px solid #cbd5e1;margin-bottom:6px}' +
    '.denom-box.out{background:#fefce8;border-color:#fde047}' +
    '.denom-box.in{background:#f0fdf4;border-color:#86efac}' +
    '.denom-box.change{background:#fff7ed;border-color:#fdba74}' +
    '.denom-box .head{font-size:10px;font-weight:900;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}' +
    '.denom-box.out .head{color:#a16207}' +
    '.denom-box.in .head{color:#15803d}' +
    '.denom-box.change .head{color:#c2410c}' +
    '.denom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:4px}' +
    '.denom-item{padding:4px 6px;border-radius:3px;background:#fff;border:1px solid #cbd5e1;font-size:9.5px}' +
    '.denom-item .d{color:#475569;font-weight:800}' +
    '.denom-item .c{color:#0f172a;font-weight:700;font-size:9px}' +
    '.denom-item .a{color:#15803d;font-weight:900;text-align:right;font-size:10px;margin-top:2px}' +
    '.denom-total{padding:6px 10px;margin-top:6px;border-radius:3px;font-weight:900;font-size:11px;display:flex;justify-content:space-between}' +
    '.denom-box.out .denom-total{background:#fef3c7;color:#a16207}' +
    '.denom-box.in .denom-total{background:#dcfce7;color:#15803d}' +
    '.denom-box.change .denom-total{background:#ffedd5;color:#c2410c}' +
    '@media screen{body{background:#e5e7eb;padding:20px}.print-container{background:#fff;padding:8mm;box-shadow:0 4px 20px rgba(0,0,0,.15);border-radius:4px}}';
  
  const header =
    '<div class="print-header">' +
      '<svg class="print-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="47" fill="#000" stroke="#1e40af" stroke-width="3"/>' +
        '<g transform="translate(50,50)" fill="#1e40af">' +
          '<path d="M -22 -12 L 0 -28 L 22 -12 Z"/>' +
          '<rect x="-18" y="-8" width="4" height="22" rx="1"/>' +
          '<rect x="-8" y="-8" width="4" height="22" rx="1"/>' +
          '<rect x="4" y="-8" width="4" height="22" rx="1"/>' +
          '<rect x="14" y="-8" width="4" height="22" rx="1"/>' +
          '<rect x="-22" y="14" width="44" height="4" rx="1.5"/>' +
        '</g>' +
      '</svg>' +
      '<div class="print-header-text">' +
        '<h1>কম্পিউটার ক্যাম্পাস</h1>' +
        '<h2>কলারোয়া আউটলেট • ঝাউডাঙ্গা আউটলেট</h2>' +
      '</div>' +
      '<div class="print-meta">' +
        '📅 ' + toBn(now.toLocaleDateString('en-GB')) + '<br>' +
        '🕐 ' + toBn(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })) + '<br>' +
        '🏦 ' + esc(bl) +
      '</div>' +
    '</div>';
  
  const footer =
    '<div class="footer">' +
      '<div class="sig">গ্রাহকের স্বাক্ষর</div>' +
      '<div class="sig">অনুমোদনকারী</div>' +
      '<div class="sig">' + esc(session?.name || 'ইউজার') + '</div>' +
    '</div>';
  
  return '<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8">' +
    '<title>' + esc(title) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' +
    '<style>' + printCSS + '</style>' +
    '</head><body><div class="print-container">' + header + bodyHTML + footer + '</div></body></html>';
}

function openPrintWindow(title, bodyHTML){
  const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if(!w){
    toast('❌ পপ-আপ ব্লক');
    return;
  }
  w.document.open();
  w.document.write(buildPrintHTML(title, bodyHTML));
  w.document.close();
}

/* ═══════════════════════════════════════════════════════════
   🗄️ DENOMINATION BUILDER — 4 Types
   ═══════════════════════════════════════════════════════════ */
function buildDenomHTML(notes, type){
  const keys = Object.keys(notes || {}).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
  if(!keys.length) return '';
  
  let total = 0;
  keys.forEach(d => { total += Number(d) * Number(notes[d]); });
  
  const cfg = {
    out: { label: '💸 প্রদান (ক্যাশ আউট)', boxCls: 'out' },
    in: { label: '📥 গ্রহণ (ক্যাশ ইন)', boxCls: 'in' },
    change: { label: '🔄 ফেরত (Change)', boxCls: 'change' }
  }[type] || { label: 'নোট', boxCls: 'out' };
  
  let html = '<div class="denom-box ' + cfg.boxCls + '">' +
    '<div class="head">' + cfg.label + '</div>' +
    '<div class="denom-grid">';
  
  keys.forEach(d => {
    const count = Number(notes[d]);
    const amt = Number(d) * count;
    html += '<div class="denom-item">' +
      '<div class="d">৳ ' + toBn(d) + '</div>' +
      '<div class="c">× ' + toBn(count) + '</div>' +
      '<div class="a">= ৳ ' + fmt(amt) + '</div>' +
    '</div>';
  });
  
  html += '</div>' +
    '<div class="denom-total"><span>📊 সর্বমোট</span><span>৳ ' + fmt(total) + '</span></div>' +
  '</div>';
  
  return html;
}

/* ═══════════════════════════════════════════════════════════
   🔥 PRINT SINGLE TRANSACTION
   ═══════════════════════════════════════════════════════════ */
function printSingleTransaction(tx){
  if(!tx){ toast('❌ নেই'); return; }
  
  const cfg = TX_CFG[tx.type] || { title: tx.type, icon: '📌' };
  const outletName = BRANCHES[tx.branch]?.name || 'উভয় আউটলেট';
  const hasSplits = tx.branchSplits && Array.isArray(tx.branchSplits) && tx.branchSplits.length > 0;
  
  /* ═══ Loan Received Breakdown ═══ */
  let loanRecvBreakdown = '';
  if(tx.type === 'loan_received' && !tx.cancelled){
    const wd = Number(tx.withdrawalAmount) || 0;
    const lk = Number(tx.loanKistiAmount) || 0;
    const km = Number(tx.kistiMain) || 0;
    const ko = Number(tx.kistiOpposite) || 0;
    const onl = Number(tx.onlineAmount) || 0;
    const nc = Number(tx.netCashAmount) || 0;
    const ch = Number(tx.changeAmount) || 0;
    const cashKisti = km + ko + onl;
    
    if(wd > 0 || lk > 0 || cashKisti > 0 || nc > 0){
      loanRecvBreakdown =
        '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">📊 ঋণ গ্রহণ — বিস্তারিত</div>' +
        '<table class="tbl-print" style="margin-bottom:6px"><thead><tr>' +
          '<th style="padding:5px 8px;font-size:10px;width:22%">তারিখ</th>' +
          '<th style="padding:5px 8px;font-size:10px;width:53%">ধরন</th>' +
          '<th style="padding:5px 8px;font-size:10px;text-align:right;width:25%">টাকা</th>' +
        '</tr></thead><tbody>';
      
      if(wd > 0){
        loanRecvBreakdown += '<tr>' +
          '<td style="padding:5px 8px;font-size:11px;color:#1e40af;font-weight:700">' + toBn(tx.date) + '<br><span style="font-size:9.5px;color:#64748b">' + esc(fmtTimeOnly(tx.createdAt)) + '</span></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#1e40af;font-weight:900">নিজ Account থেকে উত্তোলন</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#15803d">' + fmt(wd) + '</td>' +
        '</tr>';
      }
      if(lk > 0){
        loanRecvBreakdown += '<tr style="background:#f8fafc">' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#b91c1c;font-weight:800">উত্তোলন থেকে ঋণ কিস্তি</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#b91c1c">− ' + fmt(lk) + '</td>' +
        '</tr>';
      }
      if(km > 0){
        loanRecvBreakdown += '<tr>' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#a16207;font-weight:800">কলারোয়া কিস্তি নগদ</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#a16207">− ' + fmt(km) + '</td>' +
        '</tr>';
      }
      if(ko > 0){
        loanRecvBreakdown += '<tr>' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#a16207;font-weight:800">ঝাউডাঙ্গা কিস্তি নগদ</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#a16207">− ' + fmt(ko) + '</td>' +
        '</tr>';
      }
      if(onl > 0){
        loanRecvBreakdown += '<tr>' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#6d28d9;font-weight:800">অনলাইন' + (tx.onlineBankName ? ' (' + esc(tx.onlineBankName) + ')' : '') + '</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#6d28d9">− ' + fmt(onl) + '</td>' +
        '</tr>';
      }
      if(nc > 0){
        loanRecvBreakdown += '<tr style="background:#fdf2f8">' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#9d174d;font-weight:800">গ্রাহক নগদ নিয়ে গেল</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#be185d">− ' + fmt(nc) + '</td>' +
        '</tr>';
      }
      if(ch > 0){
        loanRecvBreakdown += '<tr style="background:#fff7ed">' +
          '<td style="padding:5px 8px"></td>' +
          '<td style="padding:5px 8px;font-size:11.5px;color:#c2410c;font-weight:800">🔄 ফেরত (Change)</td>' +
          '<td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#c2410c">− ' + fmt(ch) + '</td>' +
        '</tr>';
      }
      
      const totalOut = lk + cashKisti + nc + ch;
      const diff = wd - totalOut;
      loanRecvBreakdown += '<tr style="background:#dbeafe;border-top:2px solid #1e40af">' +
        '<td style="padding:6px 8px"></td>' +
        '<td style="padding:6px 8px;font-size:11.5px;color:#1e40af;font-weight:900;text-transform:uppercase">মোট হিসাব</td>' +
        '<td style="padding:6px 8px;font-size:12px;text-align:right;font-weight:900;color:' + (Math.abs(diff) < 0.01 ? '#15803d' : '#b91c1c') + '">' + (Math.abs(diff) < 0.01 ? '✓ সমান' : '৳ ' + fmt(diff)) + '</td>' +
      '</tr>';
      
      loanRecvBreakdown += '</tbody></table>';
    }
  }
  
  /* ═══ Note ═══ */
  let displayNote = '';
  if(tx.note && String(tx.note).trim()){
    displayNote = String(tx.note).trim();
  }
  const hasNote = displayNote.length > 0;
  const noteSection = hasNote ?
    '<div class="note-box">' +
      '<div class="lbl">📝 মন্তব্য</div>' +
      '<div class="val">' + esc(displayNote) + '</div>' +
    '</div>' : '';
  
  /* ═══ Denominations — for single tx view ═══ */
  let denomSection = '';
  if(!tx.cancelled){
    const nOut = tx.notesOut || {};
    const nIn = tx.notesIn || {};
    const changeNotes = tx.changeNotesOut || {};
    const netCashNotes = tx.netCashNotes || {};
    
    const hasOut = Object.keys(nOut).some(k => Number(nOut[k]) > 0);
    const hasIn = Object.keys(nIn).some(k => Number(nIn[k]) > 0);
    const hasChange = Object.keys(changeNotes).some(k => Number(changeNotes[k]) > 0);
    const hasNetCash = Object.keys(netCashNotes).some(k => Number(netCashNotes[k]) > 0);
    
    if(hasOut || hasIn || hasChange || hasNetCash){
      denomSection = '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">🗄️ ডিনোমিনেশন বিবরণী</div>';
      if(hasIn) denomSection += buildDenomHTML(nIn, 'in');
      if(hasOut) denomSection += buildDenomHTML(nOut, 'out');
      if(hasNetCash) denomSection += buildDenomHTML(netCashNotes, 'out');
      if(hasChange) denomSection += buildDenomHTML(changeNotes, 'change');
    }
  }
  
  /* ═══ Build Body ═══ */
  const body =
    '<div class="print-title" style="margin-bottom:8px;padding:8px 12px;font-size:14px">' +
      (cfg.icon || '') + ' ' + esc(cfg.title || tx.type) + ' — লেনদেন রশিদ' +
    '</div>' +
    '<div class="info-grid" style="gap:5px;margin-bottom:6px;grid-template-columns:repeat(2,1fr)">' +
      '<div class="info-cell blue" style="padding:8px 10px"><div class="lbl" style="font-size:9px">তারিখ</div><div class="val" style="font-size:13px">' + toBn(tx.date || '-') + '</div></div>' +
      '<div class="info-cell green" style="padding:8px 10px"><div class="lbl" style="font-size:9px">পরিমাণ</div><div class="val" style="font-size:14px">৳ ' + fmt(tx.amount) + '</div></div>' +
      '<div class="info-cell" style="padding:8px 10px;grid-column:1/-1"><div class="lbl" style="font-size:9px">আউটলেট</div><div class="val" style="font-size:13px">' + esc(outletName) + '</div></div>' +
    '</div>' +
    (tx.custName ?
      '<div class="info-grid" style="margin-bottom:6px"><div class="info-cell blue" style="grid-column:1/-1;padding:6px 10px"><div class="lbl" style="font-size:9px">👤 গ্রাহক</div><div class="val" style="font-size:12px">' + esc(tx.custName) + (tx.custAcc ? ' — ' + esc(tx.custAcc) : '') + (tx.custMobile ? ' — ' + esc(tx.custMobile) : '') + '</div></div></div>'
      : '') +
    
    loanRecvBreakdown +
    noteSection +
    denomSection +
    
    '<div style="padding:6px 10px;border-radius:4px;background:#f8fafc;border:1px solid #cbd5e1;margin-top:6px;font-size:9.5px;color:#475569;line-height:1.7">' +
      '<div>🕐 তৈরি: <b>' + esc(fmtDateTime(tx.createdAt)) + '</b></div>' +
      (tx.acceptedAt ? '<div>✅ গৃহীত: <b>' + esc(fmtDateTime(tx.acceptedAt)) + '</b></div>' : '') +
      (tx.cancelledAt ? '<div>❌ বাতিল: <b>' + esc(fmtDateTime(tx.cancelledAt)) + '</b></div>' : '') +
    '</div>';
  
  openPrintWindow((cfg.title || tx.type) + ' — ৳ ' + fmt(tx.amount), body);
}

/* ═══════════════════════════════════════════════════════════
   🔥 PRINT CUSTOMER HISTORY — গ্রহণ + ফেরত পাশাপাশি
   ═══════════════════════════════════════════════════════════ */
function printCustomerHistory(accountNo, custName){
  if(!accountNo){ toast('❌ নেই'); return; }
  
  const allTxs = getCustomerAllTxs(accountNo);
  const cust = DB().customers.find(c => c.accountNo === accountNo);
  const name = custName || cust?.name || '-';
  
  const sTxs = allTxs.filter(t => t.type === 'support');
  const sPaid = sTxs.filter(t => t.dir === 'out' || t.dir === 'online_support_out')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const sRefund = sTxs.filter(t => t.dir === 'in' || t.dir === 'online_support_in')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const sNet = sPaid - sRefund;
  
  /* ═══ Denomination box builder ═══ */
  function buildDenomBox(notes, label, color, bg, border){
    const keys = Object.keys(notes || {}).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
    if(!keys.length) return null;
    
    let total = 0;
    keys.forEach(d => { total += Number(d) * Number(notes[d]); });
    
    let itemsHtml = '';
    keys.forEach(d => {
      const count = Number(notes[d]);
      const amt = Number(d) * count;
      itemsHtml += '<div style="display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px dashed ' + border + ';font-size:9px">' +
        '<span style="color:' + color + '">৳ ' + toBn(d) + ' × ' + toBn(count) + '</span>' +
        '<span style="color:' + color + ';font-weight:900">৳ ' + fmt(amt) + '</span>' +
      '</div>';
    });
    
    return {
      total: total,
      html: '<div style="border:1px solid ' + border + ';border-radius:4px;overflow:hidden;background:' + bg + '">' +
        '<div style="padding:4px 8px;background:' + color + ';color:#fff;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.3px">' + label + '</div>' +
        '<div style="padding:4px 6px">' + itemsHtml + '</div>' +
        '<div style="padding:5px 8px;background:' + border + '55;display:flex;justify-content:space-between;border-top:1.5px solid ' + color + '">' +
          '<span style="color:' + color + ';font-weight:900;font-size:10px">মোট</span>' +
          '<span style="color:' + color + ';font-weight:900;font-size:11px">৳ ' + fmt(total) + '</span>' +
        '</div>' +
      '</div>'
    };
  }
  
  const rows = allTxs.map((t, i) => {
    const cfg = TX_CFG[t.type] || { title: t.type, icon: '📌' };
    const nOut = t.notesOut || {}, nIn = t.notesIn || {};
    const changeNotes = t.changeNotesOut || {};
    const netCashNotes = t.netCashNotes || {};
    
    let detailHtml = '';
    
    // ═══════════════════════════════════════════════════════════
    // 📥 LOAN RECEIVED — with side-by-side denom
    // ═══════════════════════════════════════════════════════════
    if(t.type === 'loan_received' && !t.cancelled){
      const wd = Number(t.withdrawalAmount) || 0;
      const lk = Number(t.loanKistiAmount) || 0;
      const km = Number(t.kistiMain) || 0;
      const ko = Number(t.kistiOpposite) || 0;
      const onl = Number(t.onlineAmount) || 0;
      const nc = Number(t.netCashAmount) || 0;
      const ch = Number(t.changeAmount) || 0;
      const cashKisti = km + ko + onl;
      
      // Branch notes
      const mainNotes = t.branchSplits?.find(s => s.type === 'kisti' && s.branch === 'kalaroa')?.notesIn || {};
      const oppNotes = t.branchSplits?.find(s => s.type === 'kisti' && s.branch === 'jhaudanga')?.notesIn || {};
      const combinedKistiNotes = { ...mainNotes };
      Object.keys(oppNotes).forEach(k => {
        combinedKistiNotes[k] = (combinedKistiNotes[k] || 0) + Number(oppNotes[k]);
      });
      
      let breakdown = '';
      
      // Row 1: Uttolon
      if(wd > 0){
        breakdown += '<div style="display:flex;justify-content:space-between;padding:3px 8px;background:#eff6ff;border:1px solid #93c5fd;border-bottom:none;font-size:10px">' +
          '<span style="color:#1e40af;font-weight:800">💰 নিজ Account থেকে উত্তোলন</span>' +
          '<span style="color:#15803d;font-weight:900">' + fmt(wd) + '</span>' +
        '</div>';
      }
      
      // Row 2: Loan Kisti
      if(lk > 0){
        breakdown += '<div style="display:flex;justify-content:space-between;padding:3px 8px;background:#fef2f2;border:1px solid #fca5a5;border-bottom:none;font-size:10px">' +
          '<span style="color:#b91c1c;font-weight:800">📥 উত্তোলন থেকে ঋণ কিস্তি</span>' +
          '<span style="color:#b91c1c;font-weight:900">− ' + fmt(lk) + '</span>' +
        '</div>';
      }
      
      // Row 3: Cash Kisti — with side-by-side denomination display
      if(cashKisti > 0){
        // Build the boxes
        const inBox = buildDenomBox(combinedKistiNotes, '📥 গ্রহণ', '#15803d', '#f0fdf4', '#86efac');
        const changeBox = buildDenomBox(changeNotes, '🔄 ফেরত', '#c2410c', '#fff7ed', '#fdba74');
        
        let denomRow = '';
        
        // Show both side by side if both exist
        if(inBox && changeBox){
          denomRow = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">' +
            '<div>' + inBox.html + '</div>' +
            '<div>' + changeBox.html + '</div>' +
          '</div>';
        } else if(inBox){
          denomRow = '<div style="margin-top:4px">' + inBox.html + '</div>';
        } else if(changeBox){
          denomRow = '<div style="margin-top:4px">' + changeBox.html + '</div>';
        }
        
        // Summary label with total
        let summaryLabel = '';
        if(km > 0 && ko > 0) summaryLabel = '📥 কলারোয়া + ঝাউডাঙ্গা কিস্তি নগদ';
        else if(km > 0) summaryLabel = '📥 কলারোয়া কিস্তি নগদ';
        else if(ko > 0) summaryLabel = '📥 ঝাউডাঙ্গা কিস্তি নগদ';
        else summaryLabel = '📥 কিস্তি নগদ';
        
        breakdown += '<div style="background:#fefce8;border:1px solid #fde047;border-bottom:none;padding:4px 8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px">' +
            '<span style="color:#a16207;font-weight:800">' + summaryLabel + '</span>' +
            '<span style="color:#a16207;font-weight:900">− ' + fmt(cashKisti) + '</span>' +
          '</div>' +
          denomRow +
        '</div>';
      }
      
      // Row 4: Online
      if(onl > 0){
        breakdown += '<div style="display:flex;justify-content:space-between;padding:3px 8px;background:#f5f3ff;border:1px solid #a78bfa;border-bottom:none;font-size:10px">' +
          '<span style="color:#6d28d9;font-weight:800">🌐 অনলাইন' + (t.onlineBankName ? ' (' + esc(t.onlineBankName) + ')' : '') + '</span>' +
          '<span style="color:#6d28d9;font-weight:900">− ' + fmt(onl) + '</span>' +
        '</div>';
      }
      
      // Row 5: Net Cash — with its own denom box
      if(nc > 0){
        const ncBox = buildDenomBox(netCashNotes, '📤 নগদ নিয়ে গেল', '#be185d', '#fdf2f8', '#f9a8d4');
        
        breakdown += '<div style="background:#fdf2f8;border:1px solid #f9a8d4;border-bottom:none;padding:4px 8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px">' +
            '<span style="color:#9d174d;font-weight:800">📤 গ্রাহক নগদ নিয়ে গেল</span>' +
            '<span style="color:#be185d;font-weight:900">− ' + fmt(nc) + '</span>' +
          '</div>' +
          (ncBox ? '<div style="margin-top:4px">' + ncBox.html + '</div>' : '') +
        '</div>';
      }
      
      // If change exists but no cash kisti
      if(ch > 0 && cashKisti === 0){
        const changeBox2 = buildDenomBox(changeNotes, '🔄 ফেরত', '#c2410c', '#fff7ed', '#fdba74');
        breakdown += '<div style="background:#fff7ed;border:1px solid #fdba74;border-bottom:none;padding:4px 8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px">' +
            '<span style="color:#c2410c;font-weight:800">🔄 ফেরত (Change)</span>' +
            '<span style="color:#c2410c;font-weight:900">− ' + fmt(ch) + '</span>' +
          '</div>' +
          (changeBox2 ? '<div style="margin-top:4px">' + changeBox2.html + '</div>' : '') +
        '</div>';
      }
      
      if(breakdown){
        detailHtml = '<div style="margin-top:4px">' + breakdown + '</div>';
      }
    }
    // ═══════════════════════════════════════════════════════════
    // OTHER TX TYPES — with side-by-side in/out denom
    // ═══════════════════════════════════════════════════════════
    else {
      const outBox = buildDenomBox(nOut, '📤 প্রদান', '#a16207', '#fefce8', '#fde047');
      const inBox = buildDenomBox(nIn, '📥 গ্রহণ', '#15803d', '#f0fdf4', '#86efac');
      const changeBox = buildDenomBox(changeNotes, '🔄 ফেরত', '#c2410c', '#fff7ed', '#fdba74');
      
      let denomRow = '';
      if(inBox && outBox){
        denomRow = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
          '<div>' + inBox.html + '</div>' +
          '<div>' + outBox.html + '</div>' +
        '</div>';
        if(changeBox){
          denomRow += '<div style="margin-top:4px">' + changeBox.html + '</div>';
        }
      } else if(inBox){
        denomRow = '<div>' + inBox.html + '</div>';
        if(changeBox) denomRow += '<div style="margin-top:4px">' + changeBox.html + '</div>';
      } else if(outBox){
        denomRow = '<div>' + outBox.html + '</div>';
        if(changeBox) denomRow += '<div style="margin-top:4px">' + changeBox.html + '</div>';
      } else if(changeBox){
        denomRow = '<div>' + changeBox.html + '</div>';
      }
      
      if(denomRow){
        detailHtml = '<div style="margin-top:4px">' + denomRow + '</div>';
      }
    }
    
    // Note
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<div style="font-size:9.5px;color:#1e40af;margin-top:4px;font-style:italic;padding:2px 6px;border-radius:3px;background:#eff6ff;display:inline-block">📝 ' + esc(noteText) + '</div>' : '';
    
    return '<tr>' +
      '<td style="text-align:center;padding:5px 4px;font-size:10px;vertical-align:top">' + toBn(i + 1) + '</td>' +
      '<td style="white-space:nowrap;padding:5px 4px;font-size:10px;vertical-align:top">' + toBn(t.date) + '</td>' +
      '<td style="padding:5px 4px;font-size:10px">' +
        '<div style="font-weight:900;color:#0f172a;margin-bottom:3px">' + cfg.icon + ' ' + esc(cfg.title) + '</div>' +
        detailHtml + noteHtml +
      '</td>' +
      '<td class="amt" style="padding:5px 4px;font-size:10.5px;vertical-align:top">৳ ' + fmt(t.amount) + '</td>' +
    '</tr>';
  }).join('');
  
  const body =
    '<div class="print-title" style="padding:8px 12px;margin-bottom:8px;font-size:14px">' +
      '👤 গ্রাহক লেনদেন ইতিহাস — ' + esc(name) +
      '<div style="font-size:11px;color:#475569;font-weight:700;margin-top:2px">' +
        'অ্যাকাউন্ট: ' + esc(accountNo) + ' • মোবাইল: ' + esc(cust?.mobile || '-') +
      '</div>' +
    '</div>' +
    '<div class="info-grid" style="gap:5px;margin-bottom:6px">' +
      '<div class="info-cell blue" style="padding:6px 8px"><div class="lbl" style="font-size:9px">মোট লেনদেন</div><div class="val" style="font-size:12px">' + toBn(allTxs.length) + ' টি</div></div>' +
      '<div class="info-cell" style="padding:6px 8px"><div class="lbl" style="font-size:9px">সাপোর্ট প্রদান</div><div class="val" style="font-size:12px;color:#1e40af">৳ ' + fmt(sPaid) + '</div></div>' +
      '<div class="info-cell green" style="padding:6px 8px"><div class="lbl" style="font-size:9px">সাপোর্ট ফেরত</div><div class="val" style="font-size:12px;color:#15803d">৳ ' + fmt(sRefund) + '</div></div>' +
    '</div>' +
    '<div class="summary-line" style="padding:6px 10px;margin-bottom:6px;font-size:11.5px;background:' + (sNet > 0 ? '#fef2f2' : '#f0fdf4') + '">' +
      '<span>📊 নেট সাপোর্ট ' + (sNet > 0 ? '(বকেয়া)' : '(পরিশোধিত)') + '</span>' +
      '<span style="color:' + (sNet > 0 ? '#b91c1c' : '#15803d') + ';font-size:12px">৳ ' + fmt(Math.abs(sNet)) + '</span>' +
    '</div>' +
    '<table class="tbl-print"><thead><tr>' +
      '<th style="width:5%;padding:5px 4px;font-size:9.5px">#</th>' +
      '<th style="width:13%;padding:5px 4px;font-size:9.5px">তারিখ</th>' +
      '<th style="width:67%;padding:5px 4px;font-size:9.5px">ধরন / ডিনোমিনেশন / মন্তব্য</th>' +
      '<th style="width:15%;padding:5px 4px;font-size:9.5px;text-align:right">টাকা</th>' +
    '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8">📭 কোনো লেনদেন নেই</td></tr>') +
    '</tbody></table>';
  
  openPrintWindow('গ্রাহক: ' + name + ' — ' + accountNo, body);
}

/* ═══════════════════════════════════════════════════════════
   🔥 PRINT DASHBOARD SNAPSHOT
   ═══════════════════════════════════════════════════════════ */
function printDashboardSnapshot(){
  if(!session){ toast('❌ লগইন করুন'); return; }
  
  try{
    const isAdminUser = session.role === 'admin';
    const bf = currentBranchFilter();
    const bl = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || bf);
    const st = computeStats(bf, dashDate);
    const bal = getBalancesForDate(dashDate, bf);
    const vault = getVaultForDate(dashDate, bf);
    const total = (bal.bank || 0) + (bal.cash || 0) + (bal.other || 0);
    
    const vaultRows = DENOMS.filter(d => (vault.totals[d] || 0) > 0)
      .map(d => '<tr><td style="padding:3px 5px;font-size:9px">৳ ' + toBn(d) + '</td><td style="text-align:center;padding:3px 5px;font-size:9px">' + toBn(vault.totals[d]) + ' টি</td><td class="amt" style="padding:3px 5px;font-size:9px">৳ ' + fmt(d * vault.totals[d]) + '</td></tr>').join('');
    const vaultTotal = DENOMS.reduce((s, d) => s + d * (vault.totals[d] || 0), 0);
    
    let capitalSection = '';
    if(isAdminUser){
      const totalCapital = Number(DB().totalCapital) || 0;
      const deficit = totalCapital - total;
      capitalSection = '<div class="print-title" style="padding:5px 9px;margin-bottom:4px;font-size:11px">💰 মূলধন</div>' +
        '<div class="info-grid" style="gap:4px;margin-bottom:5px">' +
          '<div class="info-cell yellow" style="padding:5px 8px"><div class="lbl" style="font-size:8px">মূলধন</div><div class="val" style="font-size:11px;color:#a16207">৳ ' + fmt(totalCapital) + '</div></div>' +
          '<div class="info-cell blue" style="padding:5px 8px"><div class="lbl" style="font-size:8px">সর্বমোট</div><div class="val" style="font-size:11px">৳ ' + fmt(total) + '</div></div>' +
          '<div class="info-cell ' + (deficit > 0 ? 'red' : 'green') + '" style="padding:5px 8px"><div class="lbl" style="font-size:8px">' + (deficit > 0 ? 'ঘাটতি' : 'উদ্বৃত্ত') + '</div><div class="val" style="font-size:11px">৳ ' + fmt(Math.abs(deficit)) + '</div></div>' +
        '</div>';
    }
    
    const body =
      '<div class="print-title" style="padding:5px 9px;margin-bottom:5px;font-size:11.5px">📊 দৈনিক Snapshot — ' + toBn(dashDate) +
        '<div style="font-size:9.5px;color:#475569;font-weight:700">আউটলেট: ' + esc(bl) + '</div>' +
      '</div>' +
      '<div class="info-grid" style="gap:4px;margin-bottom:5px">' +
        '<div class="info-cell blue" style="padding:5px 8px"><div class="lbl" style="font-size:8px">🏦 মাদার অ্যাকাউন্ট</div><div class="val" style="font-size:11px">৳ ' + fmt(bal.bank) + '</div></div>' +
        '<div class="info-cell green" style="padding:5px 8px"><div class="lbl" style="font-size:8px">💵 ক্যাশ ইন হ্যান্ড</div><div class="val" style="font-size:11px">৳ ' + fmt(bal.cash) + '</div></div>' +
        '<div class="info-cell" style="padding:5px 8px"><div class="lbl" style="font-size:8px">🏛️ অন্যান্য ব্যাংকে</div><div class="val" style="font-size:11px">৳ ' + fmt(bal.other) + '</div></div>' +
      '</div>' +
      '<div class="print-title" style="padding:5px 9px;margin-bottom:4px;font-size:11px">💼 লেনদেন সারসংক্ষেপ</div>' +
      '<table class="tbl-print" style="margin-bottom:5px"><thead><tr>' +
        '<th style="padding:4px 5px;font-size:8.5px">ধরন</th>' +
        '<th style="padding:4px 5px;font-size:8.5px;text-align:center">সংখ্যা</th>' +
        '<th style="padding:4px 5px;font-size:8.5px;text-align:right">পরিমাণ</th>' +
      '</tr></thead><tbody>' +
        '<tr><td style="padding:3px 5px;font-size:9.5px">💸 ঋণ বিতরণ</td><td style="text-align:center;padding:3px 5px;font-size:9.5px">' + toBn(st.loan_given.cnt) + '</td><td class="amt" style="padding:3px 5px;font-size:9.5px">৳ ' + fmt(st.loan_given.amt) + '</td></tr>' +
        '<tr><td style="padding:3px 5px;font-size:9.5px">📥 ঋণ গ্রহণ</td><td style="text-align:center;padding:3px 5px;font-size:9.5px">' + toBn(st.loan_received.cnt) + '</td><td class="amt" style="padding:3px 5px;font-size:9.5px">৳ ' + fmt(st.loan_received.amt) + '</td></tr>' +
        '<tr><td style="padding:3px 5px;font-size:9.5px">🏦 জমা</td><td style="text-align:center;padding:3px 5px;font-size:9.5px">' + toBn(st.deposit.cnt) + '</td><td class="amt" style="padding:3px 5px;font-size:9.5px">৳ ' + fmt(st.deposit.amt) + '</td></tr>' +
        '<tr><td style="padding:3px 5px;font-size:9.5px">💵 উত্তোলন</td><td style="text-align:center;padding:3px 5px;font-size:9.5px">' + toBn(st.withdrawal.cnt) + '</td><td class="amt" style="padding:3px 5px;font-size:9.5px">৳ ' + fmt(st.withdrawal.amt) + '</td></tr>' +
        '<tr><td style="padding:3px 5px;font-size:9.5px">🧾 ক্যাশ খরচ</td><td style="text-align:center;padding:3px 5px;font-size:9.5px">' + toBn(st.expense.cnt) + '</td><td class="amt" style="padding:3px 5px;font-size:9.5px">৳ ' + fmt(st.expense.amt) + '</td></tr>' +
      '</tbody></table>' +
      (vaultRows ?
        '<div class="print-title" style="padding:5px 9px;margin-bottom:4px;font-size:11px">🗄️ ভল্ট ইনভেন্টরি</div>' +
        '<table class="tbl-print" style="margin-bottom:5px"><thead><tr>' +
          '<th style="padding:4px 5px;font-size:8.5px">নোট</th>' +
          '<th style="padding:4px 5px;font-size:8.5px;text-align:center">সংখ্যা</th>' +
          '<th style="padding:4px 5px;font-size:8.5px;text-align:right">মান</th>' +
        '</tr></thead><tbody>' + vaultRows +
          '<tr style="background:#dbeafe"><td style="font-weight:900;padding:3px 5px;font-size:9.5px">মোট</td><td></td><td class="amt" style="font-weight:900;padding:3px 5px;font-size:9.5px">৳ ' + fmt(vaultTotal) + '</td></tr>' +
        '</tbody></table>'
        : '') +
      capitalSection;
    
    openPrintWindow('Snapshot — ' + dashDate, body);
  } catch(err){
    toast('❌ ' + err.message);
  }
}

/* ───── END OF FILE 10-print.js ───── */
console.log('✅ Print system loaded — v10.5');