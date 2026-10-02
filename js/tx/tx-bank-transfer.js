/* ============================================================
   FILE: tx/tx-bank-transfer.js
   PURPOSE: 🏛️ ইন্টারনাল অনলাইন ট্রান্সফার (Account to Account)
   VERSION: v8.1 — History Calendar Default Today
   ============================================================ */

'use strict';

function openBankTransferForm(editId){
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  const myB = session.branch || 'kalaroa';
  const fromB = editing ? (editing.from || editing.branch) : (isAdminUser ? (viewBranch === 'all' ? 'kalaroa' : viewBranch) : myB);
  const toB = editing ? editing.to : ((fromB === 'kalaroa') ? 'jhaudanga' : 'kalaroa');
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>📅 তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      '<div class="field"><label>📤 থেকে (Sender)</label>' +
        (isAdminUser ?
          '<select id="f_from">' + branchOpts(fromB) + '</select>'
          : '<input type="text" value="' + BRANCHES[fromB].name + '" disabled><input type="hidden" id="f_from" value="' + fromB + '">') +
      '</div>' +
      '<div class="field"><label>📥 গ্রাহক (Receiver)</label><select id="f_to">' + branchOpts(toB) + '</select></div>' +
    '</div>' +
    
    '<div class="bank-only-box">' +
      '<div class="title">🏛️ ইন্টারনাল অনলাইন ট্রান্সফার</div>' +
      '<div style="font-size:12.5px;color:#c4b5fd;margin-bottom:12px;padding:8px 12px;border-radius:8px;background:rgba(167,139,250,.1);border:1px dashed rgba(167,139,250,.3)">' +
        '💡 এই ট্রান্সফারটি <b style="color:#fff">মাদার অ্যাকাউন্ট থেকে মাদার অ্যাকাউন্টে</b> হবে — Vault/নোটে কোনো পরিবর্তন হবে না।' +
      '</div>' +
      '<div class="field" style="margin-top:8px"><label>💰 পরিমাণ <span style="color:#f87171">*</span></label>' +
        '<input type="text" inputmode="decimal" id="bt_amount" value="' + (editing?.amount || '') + '" style="color:#a78bfa;font-weight:900;font-size:18px" autocomplete="off">' +
      '</div>' +
      '<div class="field"><label>🏦 ব্যাংক (ঐচ্ছিক)</label><select id="bt_bank"><option value="">— সাধারণ —</option>' + bankOpts(editing?.bank || '') + '</select></div>' +
      '<div class="field"><label>📝 বিবরণ</label><input type="text" id="bt_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    '</div>' +
    
    '<div class="bank-hint" style="border-color:rgba(250,204,21,.4);background:rgba(250,204,21,.08)">' +
      '⚠️ <b style="color:#facc15">Receiver Accept করার আগে কোনো Account-এ পরিবর্তন হবে না।</b><br>' +
      '✅ Accept করলে:<br>' +
      '&nbsp;&nbsp;• Sender-এর মাদার অ্যাকাউন্ট থেকে কমবে<br>' +
      '&nbsp;&nbsp;• Receiver-এর মাদার অ্যাকাউন্টে যোগ হবে<br>' +
      '&nbsp;&nbsp;• কোনো Vault/নোটে পরিবর্তন হবে না' +
    '</div>' +
    
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
      '<button class="btn green" id="f_save" style="flex:1;min-width:160px">📤 পাঠান</button>' +
    '</div>' +
    
    '<div id="pendingArea" style="margin-top:20px"></div>' +
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: '🏛️ ইন্টারনাল অনলাইন ট্রান্সফার',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupBankTransferForm(w, editing, close)
  });
}

function setupBankTransferForm(wrap, editing, close){
  const amountInput = wrap.querySelector('#bt_amount');
  if(amountInput) attachAmountInput(amountInput, { decimal: true });
  
  // ═══════════════════════════════════════════════════════════
  // PENDING SECTION — Auto refresh
  // ═══════════════════════════════════════════════════════════
  function renderPending(){
    const box = wrap.querySelector('#pendingArea');
    if(!box) return;
    
    // ⚡ Always fresh data from DB
    const freshTxs = DB().txs || [];
    let pending = freshTxs.filter(t => 
      t.type === 'bank_transfer' && 
      t.from && 
      t.to && 
      !t.accepted && 
      !t.cancelled
    );
    pending.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    
    if(!pending.length){
      box.innerHTML = '<div class="pending-box"><h4>⏳ অপেক্ষমাণ</h4><div class="pending-empty">নেই ✅</div></div>';
      return;
    }
    
    box.innerHTML = '<div class="pending-box"><h4>⏳ অপেক্ষমাণ (' + toBn(pending.length) + ')</h4>' +
      pending.map(t => {
        const acceptBtn = '<button class="mini accept" data-bt-acc="' + t.id + '">✅ গ্রহণ</button>';
        const cancelBtn = '<button class="mini danger" data-bt-cancel="' + t.id + '">❌ বাতিল</button>';
        return '<div class="pending-item">' +
          '<div class="info"><b>' + esc(BRANCHES[t.from]?.name || t.from) + '</b> ➜ <b style="color:#4ade80">' + esc(BRANCHES[t.to]?.name || t.to) + '</b>' +
            '<small>' + toBn(t.date) + ' • ৳ ' + fmt(t.amount) + ' • 👤 ' + esc(t.user || '-') + '</small>' +
          '</div>' + acceptBtn + ' ' + cancelBtn +
        '</div>';
      }).join('') + '</div>';
    
    // ⚡ Delegate clicks
    if(!box.__delegated){
      box.__delegated = true;
      box.addEventListener('click', async (e) => {
        const accBtn = e.target.closest('[data-bt-acc]');
        const cancelBtn = e.target.closest('[data-bt-cancel]');
        
        if(accBtn){
          e.stopPropagation();
          e.preventDefault();
          const btn = accBtn;
          btn.disabled = true;
          btn.innerHTML = '...';
          await receiveBankTransferDirect(accBtn.dataset.btAcc);
          // ⚡ Refresh both sections (not close modal)
          renderPending();
          renderHistory();
          return;
        }
        
        if(cancelBtn){
          e.stopPropagation();
          e.preventDefault();
          const btn = cancelBtn;
          btn.disabled = true;
          btn.innerHTML = '...';
          await cancelBankTransferDirect(cancelBtn.dataset.btCancel);
          renderPending();
          renderHistory();
          return;
        }
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // HISTORY SECTION
  // ═══════════════════════════════════════════════════════════
  const area = wrap.querySelector('#modalHistoryArea');
  let histDate = todayStr();
  
  function renderHistory(){
    if(!area) return;
    
    let allBt = getAllTxs().filter(t => t.type === 'bank_transfer');
    if(histDate) allBt = allBt.filter(t => t.date === histDate);
    allBt.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    
    const disp = allBt.slice(0, 30);
    const totalAmt = allBt.filter(t => !t.cancelled && t.accepted).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    
    let html = '<div class="modal-history">';
    html += '<div class="modal-history-title"><span class="bar"></span> 📋 হিস্টোরি — ' +
      '<input type="date" id="bt_hist_date" value="' + histDate + '" style="padding:6px 10px;border-radius:8px;background:#050810;border:1px solid var(--line-2);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700">' +
      '<button type="button" id="bt_hist_clear" style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-left:6px">সব</button>' +
      '<span class="badge" style="margin-left:auto">' + toBn(allBt.length) + ' টি • ৳ ' + fmt(totalAmt) + '</span>' +
    '</div>';
    
    if(disp.length){
      html += '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th style="width:40px;text-align:center">#</th>' +
        '<th>তারিখ</th><th>From ➜ To</th><th>পরিমাণ</th><th>স্ট্যাটাস</th><th>ইউজার</th>' +
        '<th style="text-align:center;width:110px">অ্যাকশন</th>' +
      '</tr></thead><tbody>';
      
      disp.forEach((t, i) => {
        const statusBadge = t.cancelled ?
          '<span class="badge due">❌ বাতিল</span>' :
          (t.accepted ? '<span class="badge accepted">✅ গৃহীত</span>' : '<span class="badge pending">⏳ অপেক্ষমাণ</span>');
        
        const canAccept = !t.accepted && !t.cancelled;
        const actionBtns = canAccept ?
          ('<button class="mini accept" data-bt-hacc="' + t.id + '">✅</button> <button class="mini danger" data-bt-hcancel="' + t.id + '">❌</button>')
          : ('<button class="mini print-btn" data-bt-print="' + t.id + '">🖨️</button>');
        
        html += '<tr>' +
          '<td style="text-align:center;color:#7a8ab8;font-weight:800">' + toBn(i + 1) + '</td>' +
          '<td style="font-size:11.5px;white-space:nowrap">' + toBn(t.date) + '</td>' +
          '<td style="font-size:11.5px">' + esc(BRANCHES[t.from]?.name || '') + ' ➜ <b style="color:#4ade80">' + esc(BRANCHES[t.to]?.name || '') + '</b></td>' +
          '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td style="font-size:11px">' + esc(t.user || '-') + '</td>' +
          '<td style="text-align:center;white-space:nowrap">' + actionBtns + '</td>' +
        '</tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<div class="empty">📭 এই তারিখে কোনো লেনদেন নেই</div>';
    }
    
    html += '</div>';
    area.innerHTML = html;
    
    // ⚡ Event listeners
    const dateEl = area.querySelector('#bt_hist_date');
    if(dateEl){
      dateEl.addEventListener('change', (e) => {
        histDate = e.target.value;
        renderHistory();
      });
    }
    
    const clearBtn = area.querySelector('#bt_hist_clear');
    if(clearBtn){
      clearBtn.addEventListener('click', () => {
        histDate = '';
        const dEl2 = area.querySelector('#bt_hist_date');
        if(dEl2) dEl2.value = '';
        renderHistory();
      });
    }
    
    // ⚡ Delegate history actions
    area.querySelectorAll('[data-bt-hacc]').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      b.disabled = true;
      b.innerHTML = '...';
      await receiveBankTransferDirect(b.dataset.btHacc);
      renderPending();
      renderHistory();
    }));
    
    area.querySelectorAll('[data-bt-hcancel]').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      b.disabled = true;
      b.innerHTML = '...';
      await cancelBankTransferDirect(b.dataset.btHcancel);
      renderPending();
      renderHistory();
    }));
    
    area.querySelectorAll('[data-bt-print]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = getAllTxs().find(x => x.id === b.dataset.btPrint);
      if(t && typeof printSingleTransaction === 'function') printSingleTransaction(t);
    }));
  }
  
  // ⚡ Initial render
  renderPending();
  renderHistory();
  
  // ═══════════════════════════════════════════════════════════
  // SAVE (Send)
  // ═══════════════════════════════════════════════════════════
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const fromEl = wrap.querySelector('#f_from');
    const toEl = wrap.querySelector('#f_to');
    const from = fromEl?.value || session.branch || 'kalaroa';
    const to = toEl?.value || ((from === 'kalaroa') ? 'jhaudanga' : 'kalaroa');
    const amount = parseNum(amountInput?.value);
    const bank = wrap.querySelector('#bt_bank')?.value || null;
    const note = wrap.querySelector('#bt_note')?.value.trim() || '';
    
    if(from === to){ alert('❌ একই আউটলেটে পাঠানো যাবে না'); return; }
    if(amount <= 0){ alert('⚠️ পরিমাণ দিন'); amountInput?.focus(); return; }
    
    const balCheck = checkNegativeBalance(from);
    if(!balCheck.ok) return;
    
    const senderAcc = DB().liveAccounts?.[from]?.bank || 0;
    if(senderAcc < amount){
      alert('🚫 মাদার অ্যাকাউন্টে পর্যাপ্ত টাকা নেই!\n\n🏦 ' + (BRANCHES[from]?.name || from) +
        '\n💰 আছে: ৳ ' + fmt(senderAcc) +
        '\n📌 দরকার: ৳ ' + fmt(amount) +
        '\n\n❌ কম: ৳ ' + fmt(amount - senderAcc));
      return;
    }
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'bank_transfer',
        date,
        branch: from,
        custBranch: from,
        from,
        to,
        dir: 'out',
        bank: bank,
        amount: Math.round(amount * 100) / 100,
        note: note,
        user: session.name,
        userUsername: session.username,
        createdAt: editing ? editing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        year: date.slice(0, 4),
        accepted: false,
        acceptedDate: null,
        requiresAccept: true,
        accountOnly: true
      };
      
      const isCreating = !editing;
      
      if(!editing){
        DB().txs.push(tx);
      } else {
        const i = DB().txs.findIndex(x => x.id === editing.id);
        if(i >= 0) DB().txs[i] = tx;
      }
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new bank transfer' } : computeTxChanges(editing, tx), tx);
      
      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '🏛️ ' : '✏️ ') + 'ইন্টারনাল অনলাইন ট্রান্সফার',
        detail: (BRANCHES[from]?.name || '') + ' ➜ ' + (BRANCHES[to]?.name || ''),
        amount: amount,
        targetId: tx.id
      });
      
      toast('✅ পাঠানো — ৳ ' + fmt(amount) + '\n⏳ Receiver Accept করার অপেক্ষায়');
      
      try{ saveLocalDB(); } catch(e){}
      
      __invalidateCaches();
      renderTopbar();
      renderDashboard(true);
      renderSidebar();
      
      pushRemoteDB(true, [tx]).catch(() => {});
      
      try{
        broadcastActivity({
          type: 'txn_create',
          txTitle: '🏛️ ইন্টারনাল অনলাইন ট্রান্সফার',
          amount: amount,
          txId: tx.id
        });
      } catch(e){}
      
      setTimeout(() => {
        try{ notifyTransaction(tx, '🏛️ নতুন'); } catch(e){}
      }, 800);
      
      // ⚡ Reset form for new entry
      amountInput.value = '';
      wrap.querySelector('#bt_note').value = '';
      
      renderPending();
      renderHistory();
      
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 RECEIVE — Fixed
   ═══════════════════════════════════════════════════════════ */
async function receiveBankTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ পাওয়া যায়নি'); return; }
  
  const t = found.tx;
  if(t.cancelled){ toast('❌ বাতিল হয়েছে'); return; }
  if(t.accepted){ toast('✅ ইতিমধ্যে গৃহীত'); return; }
  
  if(!confirm('✅ ইন্টারনাল অনলাইন ট্রান্সফার গ্রহণ করবেন?\n\n📤 ' + (BRANCHES[t.from]?.name || '') +
    '\n📥 ' + (BRANCHES[t.to]?.name || '') +
    '\n💰 ৳ ' + fmt(t.amount) +
    '\n\n⚠️ Accept করলে:\n• ' + (BRANCHES[t.from]?.name || t.from) + ' এর অ্যাকাউন্ট থেকে কমবে\n• ' + (BRANCHES[t.to]?.name || t.to) + ' এর অ্যাকাউন্টে যোগ হবে')) return;
  
  const nowISO = new Date().toISOString();
  
  // ⚡ Update with new timestamp
  updateTxAnywhere(id, {
    accepted: true,
    acceptedDate: todayStr(),
    acceptedAt: nowISO,
    acceptedBy: session.name,
    updatedAt: nowISO
  });
  
  // ⚡ Force DB update timestamp so push wins over cloud
  if(DB()) DB().__lastUpdate = nowISO;
  
  addTxLog(id, 'accept', {
    accepted: { from: false, to: true },
    acceptedBy: { from: '', to: session.name }
  }, t);
  
  addActivityLog({
    type: 'txn_accept',
    title: '✅ ইন্টারনাল ট্রান্সফার গৃহীত',
    detail: (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || ''),
    amount: t.amount,
    targetId: id
  });
  
  toast('✅ গ্রহণ — ৳ ' + fmt(t.amount));
  await afterTxSave({ ...t, accepted: true }, false);
  
  try{
    broadcastActivity({ type: 'txn_accept', amount: t.amount, txId: id });
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   🔥 CANCEL — Fixed
   ═══════════════════════════════════════════════════════════ */
async function cancelBankTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const t = found.tx;
  if(t.accepted && !t.cancelled){ toast('❌ ইতিমধ্যে গৃহীত'); return; }
  if(t.cancelled){ toast('❌ ইতিমধ্যে বাতিল'); return; }
  
  const reason = prompt(
    '🔴 বাতিল করবেন?\n\n📤 ' + (BRANCHES[t.from]?.name || '') +
    '\n📥 ' + (BRANCHES[t.to]?.name || '') +
    '\n💰 ৳ ' + fmt(t.amount) + '\n\nকারণ:',
    'দরকার নেই'
  );
  
  if(reason === null) return;
  if(!confirm('🔴 নিশ্চিত?')) return;
  
  const nowISO = new Date().toISOString();
  
  updateTxAnywhere(id, {
    accepted: false,
    cancelled: true,
    cancelledAt: nowISO,
    cancelledBy: session.name,
    cancelReason: reason || 'দরকার নেই',
    updatedAt: nowISO
  });
  
  // ⚡ Force DB update timestamp
  if(DB()) DB().__lastUpdate = nowISO;
  
  addTxLog(id, 'delete', {
    cancelled: { from: false, to: true },
    cancelReason: { from: '', to: reason || 'দরকার নেই' }
  }, t);
  
  addActivityLog({
    type: 'txn_delete',
    title: '🔴 ইন্টারনাল ট্রান্সফার বাতিল',
    detail: (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || ''),
    amount: t.amount,
    targetId: id
  });
  
  toast('🔴 বাতিল — ৳ ' + fmt(t.amount));
  await afterTxSave({ ...t, cancelled: true }, false);
  
  try{
    broadcastActivity({ type: 'txn_delete', amount: t.amount, txId: id });
  } catch(e){}
}

/* ───── END OF FILE tx/tx-bank-transfer.js ───── */
console.log('✅ Bank Transfer loaded — v8.3 (fixed accept/cancel)');

/* ═══════════════════════════════════════════════════════════
   🔥 BANK TRANSFER — RECEIVE
   ═══════════════════════════════════════════════════════════ */
async function receiveBankTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ পাওয়া যায়নি'); return; }
  
  const t = found.tx;
  if(t.cancelled){ toast('❌ বাতিল হয়েছে'); return; }
  if(t.accepted){ toast('✅ ইতিমধ্যে গৃহীত'); return; }
  
  if(!confirm('✅ ইন্টারনাল অনলাইন ট্রান্সফার গ্রহণ করবেন?\n\n📤 ' + (BRANCHES[t.from]?.name || '') +
    '\n📥 ' + (BRANCHES[t.to]?.name || '') +
    '\n💰 ৳ ' + fmt(t.amount) +
    '\n\n⚠️ Accept করলে:\n• ' + (BRANCHES[t.from]?.name || t.from) + ' এর অ্যাকাউন্ট থেকে কমবে\n• ' + (BRANCHES[t.to]?.name || t.to) + ' এর অ্যাকাউন্টে যোগ হবে')) return;
  
  const nowISO = new Date().toISOString();
  
  updateTxAnywhere(id, {
    accepted: true,
    acceptedDate: todayStr(),
    acceptedAt: nowISO,
    acceptedBy: session.name,
    updatedAt: nowISO
  });
  
  addTxLog(id, 'accept', {
    accepted: { from: false, to: true },
    acceptedBy: { from: '', to: session.name }
  }, t);
  
  addActivityLog({
    type: 'txn_accept',
    title: '✅ ইন্টারনাল ট্রান্সফার গৃহীত',
    detail: (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || ''),
    amount: t.amount,
    targetId: id
  });
  
  toast('✅ গ্রহণ — ৳ ' + fmt(t.amount));
  await afterTxSave({ ...t, accepted: true }, false);
  
  try{
    broadcastActivity({ type: 'txn_accept', amount: t.amount, txId: id });
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   🔥 BANK TRANSFER — CANCEL
   ═══════════════════════════════════════════════════════════ */
async function cancelBankTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const t = found.tx;
  if(t.accepted && !t.cancelled){ toast('❌ ইতিমধ্যে গৃহীত'); return; }
  if(t.cancelled){ toast('❌ ইতিমধ্যে বাতিল'); return; }
  
  const reason = prompt(
    '🔴 বাতিল করবেন?\n\n📤 ' + (BRANCHES[t.from]?.name || '') +
    '\n📥 ' + (BRANCHES[t.to]?.name || '') +
    '\n💰 ৳ ' + fmt(t.amount) + '\n\nকারণ:',
    'দরকার নেই'
  );
  
  if(reason === null) return;
  if(!confirm('🔴 নিশ্চিত?')) return;
  
  const nowISO = new Date().toISOString();
  
  updateTxAnywhere(id, {
    accepted: false,
    cancelled: true,
    cancelledAt: nowISO,
    cancelledBy: session.name,
    cancelReason: reason || 'দরকার নেই',
    updatedAt: nowISO
  });
  
  addTxLog(id, 'delete', {
    cancelled: { from: false, to: true },
    cancelReason: { from: '', to: reason || 'দরকার নেই' }
  }, t);
  
  addActivityLog({
    type: 'txn_delete',
    title: '🔴 ইন্টারনাল ট্রান্সফার বাতিল',
    detail: (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || ''),
    amount: t.amount,
    targetId: id
  });
  
  toast('🔴 বাতিল — ৳ ' + fmt(t.amount));
  await afterTxSave({ ...t, cancelled: true }, false);
  
  try{
    broadcastActivity({ type: 'txn_delete', amount: t.amount, txId: id });
  } catch(e){}
}

/* ───── END OF FILE tx/tx-bank-transfer.js ───── */
console.log('✅ Bank Transfer loaded — v8.1 (today default)');