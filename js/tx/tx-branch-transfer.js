/* ============================================================
   FILE: tx/tx-branch-transfer.js
   PURPOSE: 🔁 আউটলেট-থেকে-আউটলেট (Vault notes transfer)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openBranchTransferForm(editId){
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  const myB = session.branch || 'kalaroa';
  const df = editing ? editing.from : (isAdminUser ? (viewBranch === 'all' ? 'kalaroa' : viewBranch) : myB);
  const dt = editing ? editing.to : (df === 'kalaroa' ? 'jhaudanga' : 'kalaroa');
  const fromVault = DB().liveVault?.[df] || {};
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      '<div class="field"><label>যে আউটলেট থেকে</label><select id="f_from">' + branchOpts(df) + '</select></div>' +
      '<div class="field"><label>যে আউটলেটে</label><select id="f_to">' + branchOpts(dt) + '</select></div>' +
    '</div>' +
    
    '<div class="bank-hint">💡 নোট sender-এর ভল্ট থেকে কমবে, receiver-এর ভল্টে যোগ হবে।</div>' +
    
    '<div class="notes-cols" id="notesCols">' +
      '<div class="notes-col out">' +
        '<h4>💸 পাঠানো নোট</h4>' +
        notesRowHTML('out', editing?.notesOut || null, fromVault) +
        '<div class="sum-line"><span>মোট</span><b id="sumOut">৳ 0.00</b></div>' +
      '</div>' +
      '<div class="notes-col in">' +
        '<h4>📥 গ্রহণযোগ্য</h4>' +
        notesRowHTML('in', editing?.notesIn || null, {}) +
        '<div class="sum-line"><span>মোট</span><b id="sumIn">৳ 0.00</b></div>' +
      '</div>' +
    '</div>' +
    
    '<div id="noteAvailabilityWarning" style="margin-top:10px;display:none"></div>' +
    '<div class="total-preview"><div class="l">নেট পরিমাণ</div><div class="v" id="netAmt">৳ 0.00</div></div>' +
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label><input type="text" id="f_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn green" id="f_save" style="flex:1;min-width:160px">📤 পাঠান</button></div>' +
    '<div id="pendingArea" style="margin-top:20px"></div>' +
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: '🔁 আউটলেট-থেকে-আউটলেট',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupTransferForm(w, editing, close)
  });
}

function setupTransferForm(wrap, editing, close){
  const so = wrap.querySelector('#sumOut');
  const si = wrap.querySelector('#sumIn');
  const ne = wrap.querySelector('#netAmt');
  
  const getBranchKey = () => {
    const b = wrap.querySelector('#f_from');
    return b?.value || 'kalaroa';
  };
  
  function recalc(){
    const on = readNotes(wrap, 'out');
    
    // Sync in/out
    wrap.querySelectorAll('[id^="in_"]').forEach(inp => {
      const v = on[inp.dataset.denom] || 0;
      if(inp.dataset.touched !== 'true') inp.value = v > 0 ? v : '';
    });
    
    const inN = readNotes(wrap, 'in');
    const os = noteSum(on);
    const is = noteSum(inN);
    
    if(so) so.textContent = '৳ ' + fmt(os);
    if(si) si.textContent = '৳ ' + fmt(is);
    if(ne) ne.textContent = '৳ ' + fmt(Math.max(os, is));
    
    const wb = wrap.querySelector('#noteAvailabilityWarning');
    if(wb){
      const fb = getBranchKey();
      const vault = DB().liveVault?.[fb] || {};
      const iss = [];
      Object.keys(on).forEach(d => {
        const n = Number(on[d]) || 0, h = Number(vault[d]) || 0;
        if(n > h) iss.push({ d, n, h });
      });
      
      if(iss.length > 0){
        wb.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:rgba(220,38,38,.15);border:2px solid rgba(220,38,38,.6);font-size:13px;color:#f87171;font-weight:700">🚫 ভল্টে কম: ' + iss.map(it => '৳' + toBn(it.d) + '×' + toBn(it.n) + '(আছে ' + toBn(it.h) + ')').join(' • ') + '</div>';
        wb.style.display = 'block';
      } else {
        wb.innerHTML = '';
        wb.style.display = 'none';
      }
    }
  }
  
  __setupDenomInputs(wrap, 'out', getBranchKey, recalc);
  __setupDenomInputs(wrap, 'in', getBranchKey, recalc);
  
  wrap.querySelectorAll('[id^="in_"]').forEach(i => {
    i.addEventListener('focus', () => {
      if(i.id.startsWith('in_')) i.dataset.touched = 'true';
    });
  });
  
  updateVaultStock(wrap, 'out', getBranchKey());
  updateVaultStock(wrap, 'in', getBranchKey());
  
  const fromEl = wrap.querySelector('#f_from');
  if(fromEl){
    fromEl.addEventListener('change', () => {
      updateVaultStock(wrap, 'out', getBranchKey());
      recalc();
    });
  }
  
  recalc();
  
  // History
  const area = wrap.querySelector('#modalHistoryArea');
  const allTx = getAllBranchTransfers().slice(0, 15);
  area.innerHTML =
    '<div class="modal-history">' +
      '<div class="modal-history-title"><span class="bar"></span> 📋 সম্প্রতি (' + toBn(allTx.length) + ')</div>' +
      (allTx.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th>সময়</th><th>From ➜ To</th><th>বিবরণ</th><th>টাকা</th><th>স্ট্যাটাস</th><th>ইউজার</th>' +
        '</tr></thead><tbody>' +
        allTx.map(t =>
          '<tr>' +
            '<td style="font-size:12px">' + esc(fmtDateTime(t.createdAt)) + '</td>' +
            '<td>' + esc(BRANCHES[t.from]?.name || '') + ' ➜ <b style="color:#4ade80">' + esc(BRANCHES[t.to]?.name || '') + '</b></td>' +
            '<td style="font-size:11.5px;color:#a5b4d8;max-width:220px;line-height:1.6">' +
              noteListInline(t.notesOut || t.notesIn) +
              (t.note ? '<div style="margin-top:4px;font-style:italic">📝 ' + esc(t.note) + '</div>' : '') +
            '</td>' +
            '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
            '<td>' + (t.accepted ? '<span class="badge accepted">✅</span>' : '<span class="badge pending">⏳</span>') + '</td>' +
            '<td>' + esc(t.user || '-') + '</td>' +
          '</tr>'
        ).join('') +
        '</tbody></table></div>'
        : '<div class="empty">📭 নেই</div>') +
    '</div>';
  
  // Pending Section
  function renderPending(){
    const box = wrap.querySelector('#pendingArea');
    if(!box) return;
    
    const bf = currentBranchFilter();
    const myB = session.role === 'admin' ? (bf === 'all' ? null : bf) : session.branch;
    let pending = DB().txs.filter(t => t.type === 'branch_transfer' && !t.accepted && !t.cancelled);
    if(myB) pending = pending.filter(t => t.to === myB);
    
    if(!pending.length){
      box.innerHTML = '<div class="pending-box"><h4>⏳ অপেক্ষমাণ</h4><div class="pending-empty">নেই ✅</div></div>';
      return;
    }
    
    box.innerHTML = '<div class="pending-box"><h4>⏳ (' + toBn(pending.length) + ')</h4>' +
      pending.map(t => {
        const canCancel = canCancelTransfer(t);
        const cancelBtn = canCancel ? ' <button class="mini danger" data-cancel="' + t.id + '">❌</button>' : '';
        return '<div class="pending-item">' +
          '<div class="info"><b>' + esc(BRANCHES[t.from]?.name || t.from) + '</b> ➜ <b>' + esc(BRANCHES[t.to]?.name || t.to) + '</b><small>' + toBn(t.date) + ' • ৳ ' + fmt(t.amount) + '</small></div>' +
          '<button class="mini accept" data-acc="' + t.id + '">✅ গ্রহণ</button>' + cancelBtn +
        '</div>';
      }).join('') + '</div>';
    
    box.querySelectorAll('[data-acc]').forEach(b => b.addEventListener('click', async () => {
      await receiveTransferDirect(b.dataset.acc);
      close();
    }));
    box.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', async () => {
      await cancelTransferDirect(b.dataset.cancel);
      close();
    }));
  }
  
  renderPending();
  
  // ═══════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const from = wrap.querySelector('#f_from').value;
    const to = wrap.querySelector('#f_to').value;
    const note = wrap.querySelector('#f_note').value.trim();
    
    if(from === to){ alert('একই আউটলেট নয়'); return; }
    
    const on = readNotes(wrap, 'out');
    const inN = readNotes(wrap, 'in');
    const os = noteSum(on);
    const is = noteSum(inN);
    
    if(Object.keys(on).length === 0 && Object.keys(inN).length === 0){ sorryNoNote(); return; }
    if(os <= 0 && is <= 0){ sorryNoNote(); return; }
    
    const balCheck = checkNegativeBalance(from);
    if(!balCheck.ok) return;
    
    if(!editing){
      const vault = DB().liveVault?.[from] || {};
      const miss = [];
      Object.keys(on).forEach(d => {
        const n = Number(on[d]) || 0, h = Number(vault[d]) || 0;
        if(n > h) miss.push({ d, n, h });
      });
      if(miss.length > 0){
        miss.forEach(m => {
          const inp = wrap.querySelector('#out_' + m.d);
          if(inp){
            inp.style.borderColor = 'rgba(220,38,38,.9)';
            inp.style.background = 'rgba(220,38,38,.25)';
            inp.focus();
          }
        });
        alert('🚫 ভল্টে কম!\n\n' + miss.map(m => '৳ ' + toBn(m.d) + ' — দরকার ' + toBn(m.n) + ', আছে ' + toBn(m.h)).join('\n'));
        return;
      }
    }
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const amt = Math.max(os, is);
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'branch_transfer',
        date,
        branch: from,
        custBranch: from,
        from,
        to,
        dir: 'out',
        amount: Math.round(amt * 100) / 100,
        notesOut: on,
        notesIn: inN,
        note: note || (BRANCHES[from].name + ' ➜ ' + BRANCHES[to].name),
        user: session.name,
        userUsername: session.username,
        createdAt: editing ? editing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        year: date.slice(0, 4),
        accepted: false,
        acceptedDate: null
      };
      
      const isCreating = !editing;
      
      if(!editing){
        DB().txs.push(tx);
      } else {
        const i = DB().txs.findIndex(x => x.id === editing.id);
        if(i >= 0) DB().txs[i] = tx;
      }
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new transaction' } : computeTxChanges(editing, tx), tx);
      
      if(isCreating){
        addActivityLog({
          type: 'txn_create',
          title: '🔁 আউটলেট ট্রান্সফার তৈরি',
          detail: (BRANCHES[from]?.name || '') + ' ➜ ' + (BRANCHES[to]?.name || ''),
          amount: amt,
          targetId: tx.id
        });
      }
      
      close();
      toast('✅ পাঠানো — ৳ ' + fmt(amt));
      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 TRANSFER ACTIONS — Receive / Cancel
   ═══════════════════════════════════════════════════════════ */
async function receiveTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx || found.tx.accepted){ toast('❌ পাওয়া যায়নি'); return; }
  
  const t = found.tx;
  if(t.cancelled){ toast('❌ বাতিল'); return; }
  if(!canAcceptTransfer(t)){ toast('❌ শুধু গ্রহণকারী আউটলেট'); return; }
  
  if(!confirm('গ্রহণ?\n\n' + (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || '') + '\n৳ ' + fmt(t.amount))) return;
  
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
    title: '✅ ট্রান্সফার গৃহীত',
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

async function cancelTransferDirect(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const t = found.tx;
  if(t.accepted && !t.cancelled){ toast('❌ গৃহীত'); return; }
  if(t.cancelled){ toast('❌ বাতিল'); return; }
  if(!canCancelTransfer(t)){ toast('❌ শুধু প্রেরক'); return; }
  
  const reason = prompt(
    '🔴 বাতিল?\n\n📤 ' + (BRANCHES[t.from]?.name || '') +
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
    title: '🔴 ট্রান্সফার বাতিল',
    detail: (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || ''),
    amount: t.amount,
    targetId: id
  });
  
  toast('🔴 বাতিল — ৳ ' + fmt(t.amount));
  await afterTxSave({ ...t, cancelled: true }, false);
}

/* ═══════════════════════════════════════════════════════════
   🔥 TRANSFER PENDING DETAIL
   ═══════════════════════════════════════════════════════════ */
function openTransferPendingDetail(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const t = found.tx;
  const notes = t.notesOut || t.notesIn || {};
  const notesHtml = Object.keys(notes).sort((a, b) => b - a)
    .map(d => '<div style="display:flex;justify-content:space-between;padding:8px 14px;border-radius:10px;background:rgba(59,130,246,.1);margin-bottom:6px"><span style="color:#93c5fd;font-weight:700">৳ ' + toBn(d) + ' × ' + toBn(notes[d]) + '</span><span style="color:#fff;font-weight:800">= ৳ ' + fmt(d * notes[d]) + '</span></div>')
    .join('');
  
  const canCancel = canCancelTransfer(t);
  
  openModal({
    title: '🔁 অপেক্ষমাণ আউটলেট ট্রান্সফার',
    wide: true,
    bodyHTML:
      '<div class="accept-head">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">' +
          '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📅 তারিখ</div><div style="color:#fff;font-size:18px;font-weight:900">' + toBn(t.date) + '</div></div>' +
          '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">💰 পরিমাণ</div><div style="color:#4ade80;font-size:22px;font-weight:900">৳ ' + fmt(t.amount) + '</div></div>' +
          '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📤 প্রেরক</div><div style="color:#fff;font-weight:800">' + esc(BRANCHES[t.from]?.name || '-') + '</div></div>' +
          '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📥 গ্রহণকারী</div><div style="color:#4ade80;font-weight:800">' + esc(BRANCHES[t.to]?.name || '-') + '</div></div>' +
        '</div>' +
      '</div>' +
      
      (notesHtml ?
        '<div class="section-title" style="margin-top:16px"><span class="bar"></span> 🗄️ নোট বিবরণ</div>' +
        '<div style="padding:12px;border-radius:12px;background:rgba(0,0,0,.25)">' + notesHtml + '</div>'
        : '') +
      
      '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' +
        '<button class="btn green" id="tp_accept" style="flex:1">✅ গ্রহণ করুন</button>' +
        (canCancel ? '<button class="btn red" id="tp_cancel" style="flex:1">❌ বাতিল করুন</button>' : '') +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#tp_accept').addEventListener('click', async () => {
        close();
        await receiveTransferDirect(t.id);
      });
      const cb = w.querySelector('#tp_cancel');
      if(cb){
        cb.addEventListener('click', async () => {
          close();
          await cancelTransferDirect(t.id);
        });
      }
    }
  });
}

/* ───── END OF FILE tx/tx-branch-transfer.js ───── */
console.log('✅ Branch Transfer loaded');