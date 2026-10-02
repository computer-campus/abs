/* ============================================================
   FILE: 10-print.js
   PURPOSE: Print system (A4 receipt + reports) — v8.2
   VERSION: v8.2 — Note in print
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 PRINT HTML BUILDER
   ═══════════════════════════════════════════════════════════ */
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
    '.denom-box .head{font-size:10px;font-weight:900;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}' +
    '.denom-box.out .head{color:#a16207}' +
    '.denom-box.in .head{color:#15803d}' +
    '.denom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:4px}' +
    '.denom-item{padding:4px 6px;border-radius:3px;background:#fff;border:1px solid #cbd5e1;font-size:9.5px}' +
    '.denom-item .d{color:#475569;font-weight:800}' +
    '.denom-item .c{color:#0f172a;font-weight:700;font-size:9px}' +
    '.denom-item .a{color:#15803d;font-weight:900;text-align:right;font-size:10px;margin-top:2px}' +
    '.denom-total{padding:6px 10px;margin-top:6px;border-radius:3px;font-weight:900;font-size:11px;display:flex;justify-content:space-between}' +
    '.denom-box.out .denom-total{background:#fef3c7;color:#a16207}' +
    '.denom-box.in .denom-total{background:#dcfce7;color:#15803d}' +
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
   🗄️ DENOMINATION BUILDER (Reusable)
   ═══════════════════════════════════════════════════════════ */
function buildDenomHTML(notes, type){
  // type: 'out' | 'in' | 'change'
  const keys = Object.keys(notes || {}).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
  if(!keys.length) return '';
  
  let total = 0;
  keys.forEach(d => { total += Number(d) * Number(notes[d]); });
  
  const cfg = {
    out: { label: '💸 প্রদান (ক্যাশ আউট)', boxCls: 'out' },
    in: { label: '📥 গ্রহণ (ক্যাশ ইন)', boxCls: 'in' },
    change: { label: '🔄 ফেরত (Change)', boxCls: 'out' }
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
   🔥 PRINT SINGLE TRANSACTION — with Note + Denoms
   ═══════════════════════════════════════════════════════════ */
function printSingleTransaction(tx){
  if(!tx){ toast('❌ নেই'); return; }
  
  const cfg = TX_CFG[tx.type] || { title: tx.type, icon: '📌' };
  const outletName = BRANCHES[tx.branch]?.name || 'উভয় আউটলেট';
  const hasSplits = tx.branchSplits && Array.isArray(tx.branchSplits) && tx.branchSplits.length > 0;
  
  /* ═══ Note Section ═══ */
  const hasNote = tx.note && String(tx.note).trim().length > 0;
  const noteSection = hasNote ?
    '<div class="note-box">' +
      '<div class="lbl">📝 মন্তব্য</div>' +
      '<div class="val">' + esc(tx.note) + '</div>' +
    '</div>' : '';
  
  /* ═══ Split Section ═══ */
  let splitSection = '';
  if(hasSplits){
    splitSection = '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">🏦 আউটলেট ভিত্তিক বিবরণী</div>';
    let grandTotal = 0;
    
    tx.branchSplits.forEach(s => {
      const notes = s.notesIn || s.notesOut || {};
      const keys = Object.keys(notes).filter(k => Number(notes[k]) > 0).sort((a, b) => Number(b) - Number(a));
      if(!keys.length) return;
      
      let branchTotal = 0;
      keys.forEach(d => { branchTotal += Number(d) * Number(notes[d]); });
      grandTotal += branchTotal;
      
      const isK = s.branch === 'kalaroa';
      const branchColor = isK ? '#1e40af' : '#15803d';
      const branchBg = isK ? '#eff6ff' : '#f0fdf4';
      
      splitSection += '<table class="tbl-print" style="margin-bottom:6px"><thead><tr>' +
        '<th style="padding:5px 8px;font-size:10px;width:55%;background:' + branchColor + ';color:#fff">🏦 ' + esc(BRANCHES[s.branch]?.name || s.branch) + '</th>' +
        '<th style="padding:5px 8px;font-size:10px;text-align:right;width:45%;background:' + branchColor + ';color:#fff">পরিমাণ</th>' +
        '</tr></thead><tbody>';
      
      keys.forEach(d => {
        const amt = Number(d) * Number(notes[d]);
        splitSection += '<tr style="background:' + branchBg + '"><td style="padding:4px 8px;font-size:10.5px;color:#a16207">💵 ৳ ' + toBn(d) + ' × ' + toBn(notes[d]) + ' টি</td><td style="padding:4px 8px;font-size:11px;text-align:right;font-weight:800;color:#a16207">৳ ' + fmt(amt) + '</td></tr>';
      });
      
      splitSection += '<tr style="background:' + branchBg + ';border-top:1.5px solid ' + branchColor + '"><td style="padding:5px 8px;font-size:11px;font-weight:900;color:' + branchColor + '">📥 মোট</td><td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:' + branchColor + '">৳ ' + fmt(branchTotal) + '</td></tr>';
      splitSection += '</tbody></table>';
    });
    
    if(tx.branchSplits.length > 1){
      splitSection += '<table class="tbl-print" style="margin-bottom:6px"><tbody><tr style="background:#dbeafe;border-top:2px solid #1e40af"><td style="padding:7px 8px;font-size:12px;font-weight:900;color:#1e40af">📊 দুই আউটলেট সর্বমোট</td><td style="padding:7px 8px;font-size:13px;text-align:right;font-weight:900;color:#1e40af;width:45%">৳ ' + fmt(grandTotal) + '</td></tr></tbody></table>';
    }
  }
  
  /* ═══ Balance Section (Loan Given) ═══ */
  let balanceSection = '';
  if(tx.type === 'loan_given' && !tx.cancelled && !hasSplits){
    const totalLoan = Number(tx.amount) || 0;
    const onlineAmt = Number(tx.onlineAmount) || 0;
    const notTaken = Number(tx.cashNotTakenAmount) || 0;
    const cashAmt = Number(tx.cashAmount) || 0;
    
    balanceSection = '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">💰 এই লেনদেনের ব্যালেন্স বিবরণী</div>' +
      '<table class="tbl-print" style="margin-bottom:8px"><thead><tr>' +
        '<th style="padding:5px 8px;font-size:10px;width:55%">বিবরণ</th>' +
        '<th style="padding:5px 8px;font-size:10px;text-align:right;width:45%">পরিমাণ</th>' +
      '</tr></thead><tbody>' +
        '<tr><td style="padding:5px 8px;font-size:11.5px">🏦 মূল উত্তোলনযোগ্য ঋণ</td><td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#1e40af">৳ ' + fmt(totalLoan) + '</td></tr>' +
        '<tr style="background:#f8fafc"><td style="padding:5px 8px;font-size:11.5px">🌐 অনলাইন ফান্ড ট্রান্সফার' + (tx.onlineBankName ? ' — <i>' + esc(tx.onlineBankName) + '</i>' : '') + '</td><td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#6d28d9">− ৳ ' + fmt(onlineAmt) + '</td></tr>' +
        (cashAmt > 0 ? '<tr style="background:#fef3c7"><td style="padding:5px 8px;font-size:11.5px;font-weight:800;color:#a16207">📤 ক্যাশ প্রদান মোট</td><td style="padding:5px 8px;font-size:12.5px;text-align:right;font-weight:900;color:#a16207">− ৳ ' + fmt(cashAmt) + '</td></tr>' : '') +
        (notTaken > 0 ? '<tr style="background:#fefce8"><td style="padding:5px 8px;font-size:11.5px;font-weight:800">💰 গ্রাহক ক্যাশ নেয়নি</td><td style="padding:5px 8px;font-size:12.5px;text-align:right;font-weight:900;color:#a16207">= ৳ ' + fmt(notTaken) + '</td></tr>' : '') +
        '<tr style="background:#dbeafe;border-top:2px solid #1e40af"><td style="padding:7px 8px;font-size:12px;font-weight:900;color:#1e40af">✅ সর্বমোট</td><td style="padding:7px 8px;font-size:13px;text-align:right;font-weight:900;color:#1e40af">৳ ' + fmt(totalLoan) + '</td></tr>' +
      '</tbody></table>';
  }
  
  if(tx.type === 'withdrawal' && !tx.cancelled){
    balanceSection = '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">💰 উত্তোলন ব্যালেন্স বিবরণী</div>' +
      '<table class="tbl-print" style="margin-bottom:8px"><thead><tr>' +
        '<th style="padding:5px 8px;font-size:10px;width:55%">বিবরণ</th>' +
        '<th style="padding:5px 8px;font-size:10px;text-align:right;width:45%">পরিমাণ</th>' +
      '</tr></thead><tbody>' +
        '<tr><td style="padding:5px 8px;font-size:11.5px">💰 গ্রাহক অ্যাকাউন্ট থেকে</td><td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#1e40af">৳ ' + fmt(tx.customerAccountAmount || 0) + '</td></tr>' +
        '<tr style="background:#f0fdf4"><td style="padding:5px 8px;font-size:11.5px">💵 গ্রাহক ক্যাশ দিল</td><td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:900;color:#15803d">+ ৳ ' + fmt(tx.cashAmount || 0) + '</td></tr>' +
        '<tr style="background:#dbeafe;border-top:2px solid #1e40af"><td style="padding:7px 8px;font-size:12px;font-weight:900;color:#1e40af">✅ সর্বমোট জমা</td><td style="padding:7px 8px;font-size:13px;text-align:right;font-weight:900;color:#1e40af">৳ ' + fmt(tx.amount) + '</td></tr>' +
      '</tbody></table>';
  }
  
  /* ═══ Denominations Section ═══ */
  let denomSection = '';
  
  // If has splits → skip (already in split section)
  if(!hasSplits && !tx.cancelled){
    const nOut = tx.notesOut || {};
    const nIn = tx.notesIn || {};
    const changeNotes = tx.changeNotesOut || {};
    
    const hasOut = Object.keys(nOut).some(k => Number(nOut[k]) > 0);
    const hasIn = Object.keys(nIn).some(k => Number(nIn[k]) > 0);
    const hasChange = Object.keys(changeNotes).some(k => Number(changeNotes[k]) > 0);
    
    if(hasOut || hasIn || hasChange){
      denomSection = '<div class="print-title" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;font-size:12px">🗄️ ডিনোমিনেশন বিবরণী</div>';
      if(hasOut) denomSection += buildDenomHTML(nOut, 'out');
      if(hasIn) denomSection += buildDenomHTML(nIn, 'in');
      if(hasChange) denomSection += buildDenomHTML(changeNotes, 'change');
    }
  }
  
  /* ═══ Header Info ═══ */
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
    
    // ⚡ Note (top position for visibility)
    noteSection +
    
    // Balance
    balanceSection +
    
    // Splits
    splitSection +
    
    // Denominations
    denomSection +
    
    // Timestamp at bottom
    '<div style="padding:6px 10px;border-radius:4px;background:#f8fafc;border:1px solid #cbd5e1;margin-top:6px;font-size:9.5px;color:#475569;line-height:1.7">' +
      '<div>🕐 তৈরি: <b>' + esc(fmtDateTime(tx.createdAt)) + '</b></div>' +
      (tx.acceptedAt ? '<div>✅ গৃহীত: <b>' + esc(fmtDateTime(tx.acceptedAt)) + '</b></div>' : '') +
      (tx.cancelledAt ? '<div>❌ বাতিল: <b>' + esc(fmtDateTime(tx.cancelledAt)) + '</b></div>' : '') +
    '</div>';
  
  openPrintWindow((cfg.title || tx.type) + ' — ৳ ' + fmt(tx.amount), body);
}

/* ═══════════════════════════════════════════════════════════
   🔥 PRINT CUSTOMER HISTORY — with Note column
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
  
  // ⚡ Build rows with note
  const rows = allTxs.map((t, i) => {
    const cfg = TX_CFG[t.type] || { title: t.type, icon: '📌' };
    const nOut = t.notesOut || {}, nIn = t.notesIn || {};
    const outParts = Object.keys(nOut).filter(k => nOut[k] > 0).sort((a, b) => b - a).map(d => '৳' + toBn(d) + '×' + toBn(nOut[d]));
    const inParts = Object.keys(nIn).filter(k => nIn[k] > 0).sort((a, b) => b - a).map(d => '৳' + toBn(d) + '×' + toBn(nIn[d]));
    
    let notesHtml = '';
    if(outParts.length) notesHtml += '<div style="font-size:9.5px;color:#a16207;margin-top:2px"><b>📤</b> ' + outParts.join(' • ') + '</div>';
    if(inParts.length) notesHtml += '<div style="font-size:9.5px;color:#15803d;margin-top:2px"><b>📥</b> ' + inParts.join(' • ') + '</div>';
    
    // ⚡ Note display
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<div style="font-size:9.5px;color:#1e40af;margin-top:3px;font-style:italic;padding:2px 5px;border-radius:3px;background:#eff6ff;display:inline-block;max-width:280px;overflow:hidden;text-overflow:ellipsis">📝 ' + esc(noteText) + '</div>' : '';
    
    return '<tr>' +
      '<td style="text-align:center;padding:5px 4px;font-size:10px">' + toBn(i + 1) + '</td>' +
      '<td style="white-space:nowrap;padding:5px 4px;font-size:10px">' + toBn(t.date) + '</td>' +
      '<td style="padding:5px 4px;font-size:10px"><b>' + cfg.icon + ' ' + esc(cfg.title) + '</b>' + notesHtml + noteHtml + '</td>' +
      '<td class="amt" style="padding:5px 4px;font-size:10.5px">৳ ' + fmt(t.amount) + '</td>' +
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
      '<th style="width:6%;padding:5px 4px;font-size:9.5px">#</th>' +
      '<th style="width:15%;padding:5px 4px;font-size:9.5px">তারিখ</th>' +
      '<th style="width:60%;padding:5px 4px;font-size:9.5px">ধরন / বিবরণ / মন্তব্য</th>' +
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
      capitalSection = '<div class="print-title" style="padding:5px 9px;margin-bottom:4px;font-size:11px">💰 মূলধন <span style="font-size:9px;color:#dc2626">(শুধু অ্যাডমিন)</span></div>' +
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
console.log('✅ Print system loaded — v8.2 (note in print)');