/* ============================================================
   FILE: 12-tx-detail.js
   PURPOSE: Transaction detail popup (👁️ button handler)
   VERSION: v8.2 — Note + Denominations Detailed
   ============================================================ */

'use strict';

function openTxDetail(txId){
  if(!txId){ toast('❌ Transaction ID নেই'); return; }
  
  const found = findTxAnywhere(txId);
  if(!found || !found.tx){ toast('❌ লেনদেন পাওয়া যায়নি'); return; }
  
  const t = found.tx;
  const cfg = TX_CFG[t.type] || { title: t.type, icon: '📌' };
  const dirInfo = getDirInfo(t);
  const isAdminUser = isAdmin();
  
  /* ═══════════════════════════════════════════════════════════
     🗄️ DENOMINATIONS — Detailed Breakdown
     ═══════════════════════════════════════════════════════════ */
  const nOut = t.notesOut || {};
  const nIn = t.notesIn || {};
  const outKeys = Object.keys(nOut).filter(k => Number(nOut[k]) > 0).sort((a, b) => b - a);
  const inKeys = Object.keys(nIn).filter(k => Number(nIn[k]) > 0).sort((a, b) => b - a);
  
  let denomOutTotal = 0;
  let denomInTotal = 0;
  outKeys.forEach(d => { denomOutTotal += Number(d) * Number(nOut[d]); });
  inKeys.forEach(d => { denomInTotal += Number(d) * Number(nIn[d]); });
  
  // ═══ OUT Denominations Table ═══
  let outDenomHtml = '';
  if(outKeys.length){
    outDenomHtml =
      '<div style="padding:12px;border-radius:12px;background:linear-gradient(145deg,rgba(250,204,21,.1),rgba(0,0,0,.2));border:1.5px solid rgba(250,204,21,.4);margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="font-size:13px;color:#facc15;font-weight:900;text-transform:uppercase;letter-spacing:.5px">💸 প্রদান (ক্যাশ আউট)</div>' +
          '<div style="font-size:16px;color:#facc15;font-weight:900">৳ ' + fmt(denomOutTotal) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">' +
          outKeys.map(d => {
            const count = Number(nOut[d]);
            const amt = Number(d) * count;
            return '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(250,204,21,.3)">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
                '<span style="font-size:12px;color:#facc15;font-weight:900">৳ ' + toBn(d) + '</span>' +
                '<span style="font-size:11px;color:#fff;font-weight:800">× ' + toBn(count) + '</span>' +
              '</div>' +
              '<div style="font-size:11.5px;color:#fff;font-weight:800;text-align:right">= ৳ ' + fmt(amt) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 10px;margin-top:8px;border-radius:8px;background:rgba(250,204,21,.15);border-top:1px dashed rgba(250,204,21,.5)">' +
          '<span style="font-size:12px;color:#facc15;font-weight:900">📤 সর্বমোট প্রদান</span>' +
          '<span style="font-size:14px;color:#facc15;font-weight:900">৳ ' + fmt(denomOutTotal) + '</span>' +
        '</div>' +
      '</div>';
  }
  
  // ═══ IN Denominations Table ═══
  let inDenomHtml = '';
  if(inKeys.length){
    inDenomHtml =
      '<div style="padding:12px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.1),rgba(0,0,0,.2));border:1.5px solid rgba(34,197,94,.4);margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="font-size:13px;color:#4ade80;font-weight:900;text-transform:uppercase;letter-spacing:.5px">📥 গ্রহণ (ক্যাশ ইন)</div>' +
          '<div style="font-size:16px;color:#4ade80;font-weight:900">৳ ' + fmt(denomInTotal) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">' +
          inKeys.map(d => {
            const count = Number(nIn[d]);
            const amt = Number(d) * count;
            return '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(34,197,94,.3)">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
                '<span style="font-size:12px;color:#4ade80;font-weight:900">৳ ' + toBn(d) + '</span>' +
                '<span style="font-size:11px;color:#fff;font-weight:800">× ' + toBn(count) + '</span>' +
              '</div>' +
              '<div style="font-size:11.5px;color:#fff;font-weight:800;text-align:right">= ৳ ' + fmt(amt) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 10px;margin-top:8px;border-radius:8px;background:rgba(34,197,94,.15);border-top:1px dashed rgba(34,197,94,.5)">' +
          '<span style="font-size:12px;color:#4ade80;font-weight:900">📥 সর্বমোট গ্রহণ</span>' +
          '<span style="font-size:14px;color:#4ade80;font-weight:900">৳ ' + fmt(denomInTotal) + '</span>' +
        '</div>' +
      '</div>';
  }
  
  // ═══ Change Notes ═══
  const changeNotes = t.changeNotesOut || {};
  const changeKeys = Object.keys(changeNotes).filter(k => Number(changeNotes[k]) > 0).sort((a, b) => b - a);
  let changeDenomTotal = 0;
  changeKeys.forEach(d => { changeDenomTotal += Number(d) * Number(changeNotes[d]); });
  
  let changeDenomHtml = '';
  if(changeKeys.length){
    changeDenomHtml =
      '<div style="padding:12px;border-radius:12px;background:linear-gradient(145deg,rgba(250,204,21,.1),rgba(0,0,0,.2));border:1.5px solid rgba(250,204,21,.4);margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="font-size:13px;color:#facc15;font-weight:900;text-transform:uppercase;letter-spacing:.5px">🔄 ফেরত (Change Out)</div>' +
          '<div style="font-size:16px;color:#facc15;font-weight:900">৳ ' + fmt(changeDenomTotal) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">' +
          changeKeys.map(d => {
            const count = Number(changeNotes[d]);
            const amt = Number(d) * count;
            return '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(250,204,21,.3)">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
                '<span style="font-size:12px;color:#facc15;font-weight:900">৳ ' + toBn(d) + '</span>' +
                '<span style="font-size:11px;color:#fff;font-weight:800">× ' + toBn(count) + '</span>' +
              '</div>' +
              '<div style="font-size:11.5px;color:#fff;font-weight:800;text-align:right">= ৳ ' + fmt(amt) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
  }
  
  // ═══ Branch Splits ═══
  let splitsHtml = '';
  if(t.branchSplits && Array.isArray(t.branchSplits) && t.branchSplits.length){
    splitsHtml = '<div style="padding:12px;border-radius:12px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.3);margin-bottom:10px">' +
      '<div style="font-size:13px;color:#93c5fd;font-weight:900;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">🏦 আউটলেট ভিত্তিক ডিনোমিনেশন</div>';
    
    t.branchSplits.forEach(s => {
      const notes = s.notesIn || s.notesOut || {};
      const keys = Object.keys(notes).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
      const total = keys.reduce((sum, d) => sum + Number(d) * Number(notes[d]), 0);
      
      splitsHtml += '<div style="padding:10px;border-radius:10px;background:rgba(0,0,0,.35);margin-bottom:8px;border:1px solid rgba(59,130,246,.25)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:13px;color:#93c5fd;font-weight:900">' + esc(BRANCHES[s.branch]?.name || s.branch) + '</div>' +
          '<div style="font-size:14px;color:#4ade80;font-weight:900">৳ ' + fmt(total) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:5px">' +
          keys.map(d => {
            const count = Number(notes[d]);
            const amt = Number(d) * count;
            return '<div style="padding:6px 8px;border-radius:6px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3)">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<span style="font-size:11px;color:#93c5fd;font-weight:800">৳ ' + toBn(d) + '</span>' +
                '<span style="font-size:11px;color:#fff;font-weight:800">× ' + toBn(count) + '</span>' +
              '</div>' +
              '<div style="font-size:10.5px;color:#fff;font-weight:700;text-align:right;margin-top:2px">৳ ' + fmt(amt) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    });
    
    splitsHtml += '</div>';
  }
  
  // ═══ Empty Denominations Message ═══
  let emptyDenomMsg = '';
  if(!outKeys.length && !inKeys.length && !changeKeys.length && !t.branchSplits){
    emptyDenomMsg = '<div style="padding:14px;text-align:center;border-radius:10px;background:rgba(0,0,0,.25);border:1px dashed rgba(122,138,184,.4);margin-bottom:10px;font-size:12.5px;color:#7a8ab8">📭 এই লেনদেনে কোনো নোট ডিনোমিনেশন নেই</div>';
  }
  
  /* ═══════════════════════════════════════════════════════════
     📝 মন্তব্য / Comments Section
     ═══════════════════════════════════════════════════════════ */
  let noteHtml = '';
  const hasNote = t.note && String(t.note).trim().length > 0;
  
  if(hasNote){
    noteHtml =
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(167,139,250,.06));border:1.5px solid rgba(59,130,246,.4);margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
          '<span style="font-size:18px">📝</span>' +
          '<span style="font-size:13px;color:#93c5fd;font-weight:900;text-transform:uppercase;letter-spacing:.5px">মন্তব্য</span>' +
        '</div>' +
        '<div style="font-size:14px;color:#fff;font-weight:600;line-height:1.8;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,.35);border-left:3px solid #3b82f6">' +
          esc(t.note) +
        '</div>' +
      '</div>';
  } else {
    noteHtml =
      '<div style="padding:12px;border-radius:12px;background:rgba(0,0,0,.25);border:1px dashed rgba(122,138,184,.3);margin-bottom:12px;text-align:center;font-size:12.5px;color:#7a8ab8">' +
        '📝 কোনো মন্তব্য নেই' +
      '</div>';
  }
  
  /* ═══════════════════════════════════════════════════════════
     💰 Amount Info Grid
     ═══════════════════════════════════════════════════════════ */
  const infoGrid =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px">' +
      '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,rgba(34,197,94,.15),rgba(0,0,0,.2));border:1.5px solid rgba(34,197,94,.4)">' +
        '<div style="font-size:10.5px;color:#7a8ab8;font-weight:800;text-transform:uppercase">💰 পরিমাণ</div>' +
        '<div style="font-size:18px;color:#4ade80;font-weight:900;margin-top:3px">৳ ' + fmt(t.amount) + '</div>' +
      '</div>' +
      '<div style="padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)">' +
        '<div style="font-size:10.5px;color:#7a8ab8;font-weight:800;text-transform:uppercase">📅 তারিখ</div>' +
        '<div style="font-size:14px;color:#fff;font-weight:800;margin-top:3px">' + toBn(t.date || '-') + '</div>' +
      '</div>' +
      '<div style="padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)">' +
        '<div style="font-size:10.5px;color:#7a8ab8;font-weight:800;text-transform:uppercase">🏦 আউটলেট</div>' +
        '<div style="font-size:13px;color:#fff;font-weight:800;margin-top:3px">' + esc(BRANCHES[t.branch]?.name || '-') + '</div>' +
      '</div>' +
      '<div style="padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)">' +
        '<div style="font-size:10.5px;color:#7a8ab8;font-weight:800;text-transform:uppercase">👤 ইউজার</div>' +
        '<div style="font-size:13px;color:#fff;font-weight:800;margin-top:3px">' + esc(t.user || '-') + '</div>' +
      '</div>' +
    '</div>';
  
  /* ═══════════════════════════════════════════════════════════
     👤 Customer Info
     ═══════════════════════════════════════════════════════════ */
  let custHtml = '';
  if(t.custName || t.custAcc){
    custHtml = '<div style="padding:12px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(34,197,94,.05));border:1.5px solid rgba(59,130,246,.35);margin-bottom:12px">' +
      '<div style="font-size:11.5px;color:#93c5fd;font-weight:900;text-transform:uppercase;margin-bottom:8px">👤 গ্রাহক তথ্য</div>' +
      '<div style="display:grid;gap:6px">' +
        '<div style="font-size:14px;color:#fff;font-weight:900">' + esc(t.custName || '—') + '</div>' +
        (t.custAcc ? '<div style="font-size:12px;color:#93c5fd;font-family:monospace;font-weight:700">🆔 ' + esc(t.custAcc) + '</div>' : '') +
        (t.custMobile ? '<div style="font-size:12px;color:#a5b4d8">📱 ' + esc(t.custMobile) + '</div>' : '') +
        (t.custAddr ? '<div style="font-size:12px;color:#a5b4d8">📍 ' + esc(t.custAddr) + '</div>' : '') +
      '</div>' +
    '</div>';
  }
  
  /* ═══════════════════════════════════════════════════════════
     💰 Extra Info (Change, Online, Customer Account)
     ═══════════════════════════════════════════════════════════ */
  let extraInfo = '';
  if(t.changeAmount > 0){
    extraInfo += '<div style="padding:10px 12px;border-radius:10px;background:rgba(250,204,21,.12);border:1.5px solid rgba(250,204,21,.4);margin-bottom:8px;font-size:13px;color:#facc15;font-weight:800">🔄 ফেরত (Change): ৳ ' + fmt(t.changeAmount) + '</div>';
  }
  if(t.customerAccountAmount > 0){
    extraInfo += '<div style="padding:10px 12px;border-radius:10px;background:rgba(59,130,246,.12);border:1.5px solid rgba(59,130,246,.4);margin-bottom:8px;font-size:13px;color:#93c5fd;font-weight:800">💰 গ্রাহক অ্যাকাউন্ট: ৳ ' + fmt(t.customerAccountAmount) + '</div>';
  }
  if(t.cashNotTakenAmount > 0){
    extraInfo += '<div style="padding:10px 12px;border-radius:10px;background:rgba(250,204,21,.12);border:1.5px solid rgba(250,204,21,.4);margin-bottom:8px;font-size:13px;color:#facc15;font-weight:800">💰 গ্রাহক ক্যাশ নেয়নি: ৳ ' + fmt(t.cashNotTakenAmount) + '</div>';
  }
  if(t.onlineAmount > 0){
    extraInfo += '<div style="padding:10px 12px;border-radius:10px;background:rgba(167,139,250,.12);border:1.5px solid rgba(167,139,250,.4);margin-bottom:8px;font-size:13px;color:#c4b5fd;font-weight:800">🌐 অনলাইন: ৳ ' + fmt(t.onlineAmount) + (t.onlineBankName ? ' — ' + esc(t.onlineBankName) : '') + '</div>';
  }
  if(t.cancelled){
    extraInfo += '<div style="padding:12px;border-radius:10px;background:rgba(220,38,38,.15);border:2px solid rgba(220,38,38,.6);margin-bottom:8px">' +
      '<div style="font-size:13px;color:#f87171;font-weight:900;margin-bottom:4px">❌ বাতিল হয়েছে</div>' +
      (t.cancelReason ? '<div style="font-size:12px;color:#fca5a5;font-weight:600">কারণ: ' + esc(t.cancelReason) + '</div>' : '') +
    '</div>';
  }
  
  /* ═══════════════════════════════════════════════════════════
     🕐 Timestamp
     ═══════════════════════════════════════════════════════════ */
  const timeHtml = '<div style="padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(59,130,246,.15);margin-bottom:12px;font-size:11.5px;color:#7a8ab8;line-height:1.8">' +
    '<div>🕐 তৈরি: <b style="color:#93c5fd">' + esc(fmtDateTime(t.createdAt)) + '</b></div>' +
    (t.updatedAt && t.updatedAt !== t.createdAt ? '<div>✏️ আপডেট: <b style="color:#facc15">' + esc(fmtDateTime(t.updatedAt)) + '</b></div>' : '') +
    (t.acceptedAt ? '<div>✅ গৃহীত: <b style="color:#4ade80">' + esc(fmtDateTime(t.acceptedAt)) + '</b></div>' : '') +
    (t.cancelledAt ? '<div>❌ বাতিল: <b style="color:#f87171">' + esc(fmtDateTime(t.cancelledAt)) + '</b></div>' : '') +
  '</div>';
  
  /* ═══════════════════════════════════════════════════════════
     🎯 Action Buttons
     ═══════════════════════════════════════════════════════════ */
  let actionsHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">' +
    '<button class="btn cyan" id="txd_print" style="flex:1;min-width:120px">🖨️ প্রিন্ট</button>';
  
  if(canEditTx(t)){
    actionsHtml += '<button class="btn yellow" id="txd_edit" style="flex:1;min-width:120px">✏️ এডিট</button>';
  }
  
  if(isAdminUser){
    actionsHtml += '<button class="btn red" id="txd_del" style="flex:1;min-width:120px">🗑️ ডিলিট</button>';
  }
  
  actionsHtml += '</div>';
  
  /* ═══════════════════════════════════════════════════════════
     📦 Build Body
     ═══════════════════════════════════════════════════════════ */
  const bodyHTML =
    // Header
    '<div style="padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(34,197,94,.08));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:32px">' + (cfg.icon || '📌') + '</span>' +
        '<div style="flex:1">' +
          '<div style="font-size:16px;color:#fff;font-weight:900">' + esc(cfg.title || t.type) + '</div>' +
          '<div style="font-size:12px;color:#93c5fd;font-weight:700;margin-top:2px">' + (dirInfo.badge || '') + '</div>' +
        '</div>' +
        '<div style="font-size:20px;color:#4ade80;font-weight:900">৳ ' + fmt(t.amount) + '</div>' +
      '</div>' +
    '</div>' +
    
    // Info Grid
    infoGrid +
    
    // Customer
    custHtml +
    
    // Extra info
    extraInfo +
    
    // 📝 মন্তব্য
    noteHtml +
    
    // 🗄️ Denominations Header
    ((outKeys.length || inKeys.length || changeKeys.length || t.branchSplits) ?
      '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(59,130,246,.08));border:1.5px solid rgba(167,139,250,.4);margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="font-size:18px">🗄️</span>' +
          '<span style="font-size:13px;color:#c4b5fd;font-weight:900;text-transform:uppercase;letter-spacing:.5px">ডিনোমিনেশন বিবরণী</span>' +
        '</div>' +
      '</div>'
      : '') +
    
    // Out
    outDenomHtml +
    
    // In
    inDenomHtml +
    
    // Change
    changeDenomHtml +
    
    // Branch splits
    splitsHtml +
    
    // Empty message
    emptyDenomMsg +
    
    // Timestamp
    timeHtml +
    
    // Actions
    actionsHtml;
  
  /* ═══════════════════════════════════════════════════════════
     🎬 Open Modal
     ═══════════════════════════════════════════════════════════ */
  openModal({
    title: '👁️ লেনদেন বিস্তারিত',
    bodyHTML: bodyHTML,
    wide: true,
    onMount: (w, close) => {
      // Print
      w.querySelector('#txd_print').addEventListener('click', () => {
        if(typeof printSingleTransaction === 'function') printSingleTransaction(t);
      });
      
      // Edit
      const editBtn = w.querySelector('#txd_edit');
      if(editBtn){
        editBtn.addEventListener('click', () => {
          close();
          setTimeout(() => openTxModal(t.type, t.id), 150);
        });
      }
      
      // Delete
      const delBtn = w.querySelector('#txd_del');
      if(delBtn){
        delBtn.addEventListener('click', async () => {
          if(!confirm('🗑️ ডিলিট করবেন?\n\n⚠️ undo হবে না।')) return;
          close();
          await deleteTx(t.id);
          toast('🗑️ ডিলিট সম্পন্ন');
        });
      }
    }
  });
}

/* ───── END OF FILE 12-tx-detail.js ───── */
console.log('✅ TX Detail loaded — v8.2 (note + denominations)');