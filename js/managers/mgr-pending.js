/* ============================================================
   FILE: managers/mgr-pending.js
   PURPOSE: ⏳ সব অপেক্ষমাণ modal — PERFORMANCE OPTIMIZED
   VERSION: v7.6
   ============================================================ */

'use strict';

function openAllPendingModal(){
  const p = getAllPending();
  
  if(p.totalCount === 0){
    toast('✅ অপেক্ষমাণ নেই');
    return;
  }
  
  const bf = currentBranchFilter();
  let transfers = p.transfers;
  let collections = p.collections;
  
  if(bf !== 'all'){
    transfers = transfers.filter(t => t.to === bf);
    collections = collections.filter(t => t.branch === bf);
  }
  
  // ⚡ Limit rows to prevent lag
  const MAX_TR = 50;
  const MAX_CO = 50;
  const shownTr = transfers.slice(0, MAX_TR);
  const shownCo = collections.slice(0, MAX_CO);
  const hasMoreTr = transfers.length > MAX_TR;
  const hasMoreCo = collections.length > MAX_CO;
  
  // ⚡ Build transfer rows (fast string concat)
  let trRows = '';
  for(let i = 0; i < shownTr.length; i++){
    const t = shownTr[i];
    const canCancel = canCancelTransfer(t);
    const cancelBtn = canCancel ? ' <button class="mini danger" data-cancel="' + esc(t.id) + '">❌</button>' : '';
    
    trRows += '<tr class="clickable-row" data-tx-id="' + esc(t.id) + '" data-tx-kind="transfer">' +
      '<td>' + toBn(t.date) + '</td>' +
      '<td>' + esc(BRANCHES[t.from]?.name || '') + ' ➜ <b style="color:#4ade80">' + esc(BRANCHES[t.to]?.name || '') + '</b></td>' +
      '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="mini accept" data-acc="' + esc(t.id) + '">✅</button>' +
        cancelBtn +
      '</td>' +
    '</tr>';
  }
  
  // ⚡ Build collection rows
  let coRows = '';
  for(let i = 0; i < shownCo.length; i++){
    const c = shownCo[i];
    
    coRows += '<tr class="clickable-row" data-tx-id="' + esc(c.id) + '" data-tx-kind="collection">' +
      '<td>' + toBn(c.date) + '</td>' +
      '<td>👤 <b style="color:#4ade80">' + esc(c.custName || '-') + '</b></td>' +
      '<td class="amt" style="color:#facc15">৳ ' + fmt(c._pending) + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="mini cash-btn" data-cash="' + esc(c.id) + '">💵</button> ' +
        '<button class="mini online-btn" data-online="' + esc(c.id) + '">🌐</button>' +
      '</td>' +
    '</tr>';
  }
  
  // ⚡ More rows notice
  const trMoreNotice = hasMoreTr ?
    '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);border-top:1px solid rgba(250,204,21,.3);font-size:12px;color:#facc15;font-weight:700">আরো <b>' + toBn(transfers.length - MAX_TR) + '</b> টি আছে</div>'
    : '';
  
  const coMoreNotice = hasMoreCo ?
    '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);border-top:1px solid rgba(250,204,21,.3);font-size:12px;color:#facc15;font-weight:700">আরো <b>' + toBn(collections.length - MAX_CO) + '</b> টি আছে</div>'
    : '';
  
  openModal({
    title: '⏳ সব অপেক্ষমাণ',
    wide: true,
    bodyHTML:
      '<div class="accept-head">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">' +
          '<div>' +
            '<div style="color:#93c5fd;font-size:12px;font-weight:700">🔁 ট্রান্সফার</div>' +
            '<div style="font-size:20px;font-weight:900;color:#fff">' + toBn(transfers.length) + ' টি</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#facc15;font-size:12px;font-weight:700">💰 সংগ্রহ</div>' +
            '<div style="font-size:20px;font-weight:900;color:#fff">' + toBn(collections.length) + ' টি</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#a5b4d8;font-size:12px;font-weight:700">📊 সর্বমোট</div>' +
            '<div style="font-size:20px;font-weight:900;color:#fff">' + toBn(p.totalCount) + ' টি</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      (transfers.length ?
        '<div class="section-title" style="margin-top:10px"><span class="bar"></span> 🔁 ট্রান্সফার</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th>তারিখ</th><th>From ➜ To</th><th>টাকা</th><th>অ্যাকশন</th>' +
        '</tr></thead><tbody>' + trRows + '</tbody></table></div>' + trMoreNotice
        : '') +
      
      (collections.length ?
        '<div class="section-title" style="margin-top:22px"><span class="bar"></span> 💰 সংগ্রহ</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th>তারিখ</th><th>গ্রাহক</th><th>অপেক্ষমাণ</th><th>অ্যাকশন</th>' +
        '</tr></thead><tbody>' + coRows + '</tbody></table></div>' + coMoreNotice
        : ''),
    
    onMount: (w, close) => {
      // ⚡ Delegate all clicks (one handler)
      w.addEventListener('click', async (e) => {
        const accBtn = e.target.closest('[data-acc]');
        const cancelBtn = e.target.closest('[data-cancel]');
        const cashBtn = e.target.closest('[data-cash]');
        const onlineBtn = e.target.closest('[data-online]');
        const tr = e.target.closest('tr[data-tx-id]');
        
        if(accBtn){
          e.stopPropagation();
          await receiveTransferDirect(accBtn.dataset.acc);
          close();
          return;
        }
        if(cancelBtn){
          e.stopPropagation();
          await cancelTransferDirect(cancelBtn.dataset.cancel);
          close();
          return;
        }
        if(cashBtn){
          e.stopPropagation();
          close();
          setTimeout(() => openCollectionChildModal(cashBtn.dataset.cash, 'cash'), 100);
          return;
        }
        if(onlineBtn){
          e.stopPropagation();
          close();
          setTimeout(() => openCollectionChildModal(onlineBtn.dataset.online, 'online'), 100);
          return;
        }
        if(tr && !e.target.closest('button')){
          const id = tr.dataset.txId;
          const kind = tr.dataset.txKind;
          close();
          setTimeout(() => {
            if(kind === 'transfer') openTransferPendingDetail(id);
            else if(kind === 'collection') openCollectionPendingDetail(id);
          }, 100);
        }
      });
    }
  });
}

/* ───── END OF FILE managers/mgr-pending.js ───── */
console.log('✅ Manager Pending loaded — v7.6 (optimized)');