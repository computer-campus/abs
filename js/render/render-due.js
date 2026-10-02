/* ============================================================
   FILE: render/render-due.js
   PURPOSE: Due list + Collection pending sections
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 DUE SECTION
   ═══════════════════════════════════════════════════════════ */
function renderDueSection(){
  const box = document.getElementById('dueSection');
  if(!box) return;
  
  const bf = currentBranchFilter();
  const all = DB().customers || [];
  const sc = bf === 'all' ? all : all.filter(c => c.branch === bf);
  
  sc.forEach(c => {
    const d = calculateCustomerDue(c.accountNo);
    c.supportDue = d.net;
    c.supportPaid = d.paid;
    c.supportRefund = d.refund;
  });
  
  const due = sc.filter(c => (c.supportDue || 0) > 0)
    .sort((a, b) => (b.supportDue || 0) - (a.supportDue || 0));
  
  const total = due.reduce((s, c) => s + (c.supportDue || 0), 0);
  const paidTotal = due.reduce((s, c) => s + (c.supportPaid || 0), 0);
  const refundTotal = due.reduce((s, c) => s + (c.supportRefund || 0), 0);
  
  if(!due.length){
    box.innerHTML =
      '<div class="section-title">' +
        '<span class="bar"></span> 🤝 সাপোর্ট বকেয়া' +
        '<span class="auto-badge" style="margin-left:auto">✅ সব পরিশোধিত</span>' +
      '</div>' +
      '<div class="vault-box" style="text-align:center;padding:22px;color:#a5b4d8">🎉 কোনো সাপোর্ট বকেয়া নেই।</div>';
    return;
  }
  
  const MAX_ROWS = 20;
  const showAll = due.length <= MAX_ROWS;
  const limitedDue = showAll ? due : due.slice(0, MAX_ROWS);
  
  let rowsHtml = '';
  for(let i = 0; i < limitedDue.length; i++){
    const c = limitedDue[i];
    rowsHtml +=
      '<tr class="cust-row has-due clickable-row" data-cust-acc="' + esc(c.accountNo) + '" data-cust-name="' + esc(c.name) + '" style="cursor:pointer">' +
        '<td style="text-align:center;color:#7a8ab8;font-weight:800;font-size:12px">' + toBn(i + 1) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0">' +
            '<div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(145deg,rgba(236,72,153,.2),rgba(167,139,250,.1));border:1.5px solid rgba(236,72,153,.4);display:grid;place-items:center;flex-shrink:0;font-size:13px">👤</div>' +
            '<div style="min-width:0">' +
              '<div style="color:#ec4899;font-weight:800;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">' + esc(c.name || '-') + '</div>' +
              '<div style="font-size:10.5px;color:#93c5fd;font-family:monospace;font-weight:700">' + esc(c.accountNo || '-') + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td style="text-align:right"><span style="color:#93c5fd;font-weight:800;white-space:nowrap;font-size:12px">৳ ' + fmt(c.supportPaid || 0) + '</span></td>' +
        '<td style="text-align:right"><span style="color:#4ade80;font-weight:800;white-space:nowrap;font-size:12px">৳ ' + fmt(c.supportRefund || 0) + '</span></td>' +
        '<td style="text-align:right">' +
          '<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:8px;background:rgba(220,38,38,.15);border:1.5px solid rgba(220,38,38,.5);color:#f87171;font-weight:900;white-space:nowrap;font-size:12px">' +
            '<span style="font-size:10px">🔴</span>৳ ' + fmt(c.supportDue || 0) +
          '</span>' +
        '</td>' +
        '<td style="text-align:center"><button class="mini show" data-due-show="' + esc(c.accountNo) + '" style="white-space:nowrap;font-weight:700;padding:6px 9px;font-size:12px">📜</button></td>' +
      '</tr>';
  }
  
  const moreNote = showAll ? '' :
    '<div style="padding:10px;text-align:center;background:rgba(250,204,21,.08);border-top:1px solid rgba(250,204,21,.3);font-size:12.5px;color:#facc15;font-weight:700">' +
      '⚠️ আরো <b>' + toBn(due.length - MAX_ROWS) + '</b> জন দেখতে <b>সাপোর্ট বকেয়া</b> মেনুতে যান' +
    '</div>';
  
  box.innerHTML =
    '<div class="section-title">' +
      '<span class="bar"></span> 🤝 সাপোর্ট বকেয়া' +
      '<span class="badge due" style="margin-left:auto">' + toBn(due.length) + ' জন • ৳ ' + fmt(total) + '</span>' +
    '</div>' +
    '<div class="vault-box" style="padding:0;overflow:hidden">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;background:linear-gradient(145deg,rgba(220,38,38,.04),rgba(0,0,0,.2));border-bottom:1px solid rgba(59,130,246,.2)">' +
        '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,rgba(59,130,246,.12),rgba(59,130,246,.04));border:1.5px solid rgba(59,130,246,.4)">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
            '<span style="font-size:13px">🤝</span>' +
            '<span style="font-size:11px;color:#93c5fd;font-weight:800;text-transform:uppercase;letter-spacing:.4px">মোট প্রদান</span>' +
          '</div>' +
          '<div style="font-size:14px;color:#fff;font-weight:900;letter-spacing:-.3px">৳ ' + fmt(paidTotal) + '</div>' +
        '</div>' +
        '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(34,197,94,.04));border:1.5px solid rgba(34,197,94,.4)">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
            '<span style="font-size:13px">↩️</span>' +
            '<span style="font-size:11px;color:#4ade80;font-weight:800;text-transform:uppercase;letter-spacing:.4px">মোট ফেরত</span>' +
          '</div>' +
          '<div style="font-size:14px;color:#fff;font-weight:900;letter-spacing:-.3px">৳ ' + fmt(refundTotal) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap" style="border:none;border-radius:0">' +
        '<table class="tbl">' +
          '<thead><tr>' +
            '<th style="width:40px;text-align:center;font-size:11px">#</th>' +
            '<th style="font-size:11px">গ্রাহক</th>' +
            '<th style="text-align:right;font-size:11px">প্রদান</th>' +
            '<th style="text-align:right;font-size:11px">ফেরত</th>' +
            '<th style="text-align:right;font-size:11px">বকেয়া</th>' +
            '<th style="text-align:center;width:100px;font-size:11px">অ্যাকশন</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>' +
      moreNote +
    '</div>';
  
  if(!box.__delegated){
    box.__delegated = true;
    box.addEventListener('click', function(e){
      const tr = e.target.closest('tr[data-cust-acc]');
      const btn = e.target.closest('[data-due-show]');
      
      if(btn){
        e.stopPropagation();
        const acc = btn.dataset.dueShow;
        if(acc && typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(acc, '');
        }
        return;
      }
      
      if(tr){
        const acc = tr.dataset.custAcc;
        const name = tr.dataset.custName;
        if(acc && typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(acc, name);
        }
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 COLLECTION PENDING SECTION
   ═══════════════════════════════════════════════════════════ */
function renderCollectionPendingSection(){
  const box = document.getElementById('collectionPendingSection');
  if(!box) return;
  
  const bf = currentBranchFilter();
  let collections = getPendingCollections();
  if(bf !== 'all') collections = collections.filter(t => t.branch === bf);
  
  const total = collections.reduce((s, t) => s + (t._pending || 0), 0);
  const owedTotal = collections.reduce((s, t) => s + (t._owed || 0), 0);
  const collectedTotal = collections.reduce((s, t) => s + (t._collected || 0), 0);
  
  if(!collections.length){
    box.innerHTML =
      '<div class="section-title">' +
        '<span class="bar"></span> ⏳ সংগ্রহ বাকি' +
        '<span class="auto-badge">✅ সব সংগৃহীত</span>' +
      '</div>' +
      '<div class="vault-box" style="text-align:center;padding:22px;color:#a5b4d8">🎉 কোনো সংগ্রহ বাকি নেই।</div>';
    return;
  }
  
  const MAX = 20;
  const showAll = collections.length <= MAX;
  const list = showAll ? collections : collections.slice(0, MAX);
  
  let rowsHtml = '';
  for(let i = 0; i < list.length; i++){
    const c = list[i];
    rowsHtml +=
      '<tr class="clickable-row" data-col-cust="' + esc(c.custAcc || '') + '" data-col-name="' + esc(c.custName || '') + '" data-col-id="' + esc(c.id) + '" style="cursor:pointer">' +
        '<td>' + toBn(i + 1) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(145deg,rgba(59,130,246,.2),rgba(34,197,94,.1));border:1px solid rgba(59,130,246,.4);display:grid;place-items:center;flex-shrink:0">👤</div>' +
            '<div style="min-width:0">' +
              '<div style="color:#4ade80;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.custName || '-') + '</div>' +
              '<div style="font-size:10.5px;color:#7a8ab8;font-family:monospace">' + esc(c.custAcc || '') + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td style="color:#fff;font-weight:800;white-space:nowrap">৳ ' + fmt(c._owed || 0) + '</td>' +
        '<td style="color:#4ade80;font-weight:800;white-space:nowrap">৳ ' + fmt(c._collected || 0) + '</td>' +
        '<td><span class="badge pending" style="white-space:nowrap;color:#facc15">৳ ' + fmt(c._pending || 0) + '</span></td>' +
        '<td style="white-space:nowrap">' +
          '<button class="mini cash-btn" data-cash="' + esc(c.id) + '">💵</button> ' +
          '<button class="mini online-btn" data-online="' + esc(c.id) + '">🌐</button> ' +
          '<button class="mini show" data-colhistory="' + esc(c.custAcc || '') + '" data-colname="' + esc(c.custName || '') + '">📜</button>' +
        '</td>' +
      '</tr>';
  }
  
  const moreNote = showAll ? '' :
    '<div style="padding:10px;text-align:center;background:rgba(250,204,21,.08);border-top:1px solid rgba(250,204,21,.3);font-size:12.5px;color:#facc15;font-weight:700">' +
      'আরো <b>' + toBn(collections.length - MAX) + '</b> টি' +
    '</div>';
  
  box.innerHTML =
    '<div class="section-title">' +
      '<span class="bar"></span> ⏳ সংগ্রহ বাকি' +
      '<span class="badge pending">' + toBn(collections.length) + ' টি • ৳ ' + fmt(total) + '</span>' +
    '</div>' +
    '<div class="vault-box">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(59,130,246,.2)">' +
        '<div style="padding:8px 10px;border-radius:8px;background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.3);font-size:12px;text-align:center">' +
          '<div style="color:#facc15;font-weight:700">💰 মোট</div>' +
          '<div style="color:#fff;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(owedTotal) + '</div>' +
        '</div>' +
        '<div style="padding:8px 10px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);font-size:12px;text-align:center">' +
          '<div style="color:#4ade80;font-weight:700">✅ সংগৃহীত</div>' +
          '<div style="color:#fff;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(collectedTotal) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="tbl">' +
          '<thead><tr>' +
            '<th>#</th><th>গ্রাহক</th><th>মোট</th><th>সংগৃহীত</th>' +
            '<th>বাকি</th><th>অ্যাকশন</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>' +
      moreNote +
    '</div>';
  
  if(!box.__delegated){
    box.__delegated = true;
    box.addEventListener('click', function(e){
      const cashBtn = e.target.closest('[data-cash]');
      const onlineBtn = e.target.closest('[data-online]');
      const histBtn = e.target.closest('[data-colhistory]');
      const tr = e.target.closest('tr[data-col-cust]');
      
      if(cashBtn){
        e.stopPropagation();
        openCollectionChildModal(cashBtn.dataset.cash, 'cash');
        return;
      }
      if(onlineBtn){
        e.stopPropagation();
        openCollectionChildModal(onlineBtn.dataset.online, 'online');
        return;
      }
      if(histBtn){
        e.stopPropagation();
        const acc = histBtn.dataset.colhistory;
        const name = histBtn.dataset.colname;
        if(acc && typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(acc, name);
        }
        return;
      }
      if(tr){
        const acc = tr.dataset.colCust;
        const name = tr.dataset.colName;
        if(!acc && !name) return;
        if(typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(acc, name);
        }
      }
    });
  }
}

/* ───── END OF FILE render/render-due.js ───── */
console.log('✅ Render Due loaded');