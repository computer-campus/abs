/* ============================================================
   FILE: tx/tx-bank-transfer.js
   PURPOSE: 🏛️ ইন্টারনাল অনলাইন ট্রান্সফার — Auto Complete
   VERSION: v10.0
   ============================================================ */

'use strict';

function openBankTransferForm(editId){
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  const myB = session.branch || 'kalaroa';

  const fromB = editing
    ? (editing.from || editing.branch)
    : (isAdminUser ? (viewBranch === 'all' ? 'kalaroa' : viewBranch) : myB);

  const toB = editing
    ? editing.to
    : ((fromB === 'kalaroa') ? 'jhaudanga' : 'kalaroa');

  const fromName = BRANCHES[fromB]?.name || fromB;
  const toName   = BRANCHES[toB]?.name || toB;

  const body =
    // ═════ Form ═════
    '<div class="form-row">' +
      '<div class="field"><label>📅 তারিখ</label>' +
        '<input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '">' +
      '</div>' +
      '<div class="field"><label>📤 থেকে (Sender)</label>' +
        (isAdminUser
          ? '<select id="f_from">' + branchOpts(fromB) + '</select>'
          : '<input type="text" value="' + fromName + '" disabled>' +
            '<input type="hidden" id="f_from" value="' + fromB + '">') +
      '</div>' +
      '<div class="field"><label>📥 গ্রাহক (Receiver)</label>' +
        '<select id="f_to">' + branchOpts(toB) + '</select>' +
      '</div>' +
    '</div>' +

    '<div style="padding:14px 16px;border-radius:12px;background:linear-gradient(145deg,rgba(167,139,250,.10),rgba(0,0,0,.2));border:1.5px solid rgba(167,139,250,.4);margin-bottom:14px">' +
      '<div style="font-size:12.5px;color:#c4b5fd;font-weight:700;line-height:1.7">' +
        '💡 <b style="color:#fff">Auto Transfer:</b> পাঠানোর সাথে সাথেই ' +
        'Sender-এর মাদার অ্যাকাউন্ট থেকে কমবে এবং Receiver-এর মাদার অ্যাকাউন্টে যোগ হবে।<br>' +
        '<b style="color:#facc15">⚠️ Vault/নোটে কোনো পরিবর্তন হবে না।</b>' +
      '</div>' +
    '</div>' +

    '<div class="field"><label>💰 পরিমাণ <span style="color:#f87171">*</span></label>' +
      '<input type="text" inputmode="decimal" id="bt_amount" value="' + (editing?.amount || '') + '" style="color:#a78bfa;font-weight:900;font-size:20px" placeholder="0" autocomplete="off">' +
    '</div>' +

    '<div class="form-row">' +
      '<div class="field"><label>🏦 ব্যাংক (ঐচ্ছিক)</label>' +
        '<select id="bt_bank"><option value="">— সাধারণ —</option>' + bankOpts(editing?.bank || '') + '</select>' +
      '</div>' +
      '<div class="field"><label>📝 বিবরণ</label>' +
        '<input type="text" id="bt_note" value="' + esc(editing?.note || '') + '" autocomplete="off">' +
      '</div>' +
    '</div>' +

    // ═════ Live Preview ═════
    '<div id="bt_preview" style="margin-top:6px;padding:14px;border-radius:12px;background:rgba(0,0,0,.4);border:1.5px solid rgba(167,139,250,.35);font-size:13px;line-height:1.9"></div>' +

    // ═════ Save ═════
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
      '<button class="btn green" id="f_save" style="flex:1;min-width:160px;padding:16px;font-size:15px;font-weight:900">📤 ট্রান্সফার করুন</button>' +
    '</div>' +

    // ═════ History ═════
    '<div id="modalHistoryArea"></div>';

  openModal({
    title: '🏛️ ইন্টারনাল অনলাইন ট্রান্সফার',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupBankTransferForm(w, editing, close)
  });
}


function setupBankTransferForm(wrap, editing, close){
  const q = s => wrap.querySelector(s);
  const amountInput = q('#bt_amount');
  const previewEl   = q('#bt_preview');

  if(amountInput) attachAmountInput(amountInput, { decimal: true });

  const getFrom = () => q('#f_from')?.value || 'kalaroa';
  const getTo   = () => q('#f_to')?.value   || 'jhaudanga';
  const getAmt  = () => parseNum(amountInput?.value);

  function updatePreview(){
    const from = getFrom();
    const to   = getTo();
    const amt  = getAmt();
    const fromAcc = Number(DB().liveAccounts?.[from]?.bank) || 0;
    const toAcc   = Number(DB().liveAccounts?.[to]?.bank)   || 0;
    const fromName = BRANCHES[from]?.name || from;
    const toName   = BRANCHES[to]?.name   || to;

    if(from === to){
      previewEl.innerHTML =
        '<div style="padding:10px 14px;border-radius:10px;background:rgba(220,38,38,.15);border:1.5px solid rgba(220,38,38,.5);color:#f87171;font-weight:800;text-align:center">❌ একই আউটলেটে পাঠানো যাবে না</div>';
      return;
    }

    const enough = fromAcc >= amt && amt > 0;
    const fromAfter = fromAcc - amt;
    const toAfter   = toAcc + amt;

    let html = '';
    html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span style="color:#f87171">📤 ' + esc(fromName) + ' (Sender):</span><b style="color:#f87171;font-size:14px">− ৳ ' + fmt(amt) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span style="color:#4ade80">📥 ' + esc(toName) + ' (Receiver):</span><b style="color:#4ade80;font-size:14px">+ ৳ ' + fmt(amt) + '</b></div>';

    html += '<div style="margin-top:10px;padding-top:10px;border-top:2px solid rgba(167,139,250,.4)">';
    html += '<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#a5b4d8">🏦 ' + esc(fromName) + ' বর্তমান:</span><b style="color:#fff">৳ ' + fmt(fromAcc) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#a5b4d8">🏦 ' + esc(toName) + ' বর্তমান:</span><b style="color:#fff">৳ ' + fmt(toAcc) + '</b></div>';
    html += '</div>';

    if(amt > 0){
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(255,255,255,.08)">';
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#a5b4d8">🏦 ' + esc(fromName) + ' এর পরে:</span><b style="color:' + (fromAfter < 0 ? '#f87171' : '#93c5fd') + ';font-weight:900">৳ ' + fmt(fromAfter) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#a5b4d8">🏦 ' + esc(toName) + ' এর পরে:</span><b style="color:#4ade80;font-weight:900">৳ ' + fmt(toAfter) + '</b></div>';
      html += '</div>';

      if(!enough){
        html += '<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(220,38,38,.15);border:1.5px solid rgba(220,38,38,.5);color:#f87171;font-weight:800;text-align:center">🚫 Sender-এর মাদার অ্যাকাউন্টে পর্যাপ্ত টাকা নেই</div>';
      } else {
        html += '<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:rgba(34,197,94,.15);border:1.5px solid rgba(34,197,94,.5);color:#4ade80;font-weight:900;text-align:center">✅ ট্রান্সফার প্রস্তুত</div>';
      }
    }

    previewEl.innerHTML = html;
  }

  amountInput?.addEventListener('input', updatePreview);
  q('#f_from')?.addEventListener('change', updatePreview);
  q('#f_to')?.addEventListener('change', updatePreview);
  updatePreview();

  /* ═══════════════════════════════════════════════════════════
     SAVE — Instant transfer
     ═══════════════════════════════════════════════════════════ */
  q('#f_save').addEventListener('click', async () => {
    const sBtn = q('#f_save');
    if(sBtn.disabled) return;

    const date   = q('#f_date').value || todayStr();
    const from   = getFrom();
    const to     = getTo();
    const amount = getAmt();
    const bank   = q('#bt_bank')?.value || null;
    const note   = q('#bt_note')?.value.trim() || '';

    if(from === to){ alert('❌ একই আউটলেটে পাঠানো যাবে না'); return; }
    if(amount <= 0){ alert('⚠️ পরিমাণ দিন'); amountInput?.focus(); return; }

    const balCheck = checkNegativeBalance(from);
    if(!balCheck.ok) return;

    const senderAcc = Number(DB().liveAccounts?.[from]?.bank) || 0;
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
      const nowISO = new Date().toISOString();
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
        createdAt: editing ? editing.createdAt : nowISO,
        updatedAt: nowISO,
        year: date.slice(0, 4),
        // ✅ Auto-accepted — no pending state
        accepted: true,
        acceptedDate: date,
        acceptedAt: nowISO,
        acceptedBy: session.name,
        requiresAccept: false,
        accountOnly: true
      };

      const isCreating = !editing;
      if(!editing) DB().txs.push(tx);
      else {
        const i = DB().txs.findIndex(x => x.id === editing.id);
        if(i >= 0) DB().txs[i] = tx;
      }

      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'auto bank transfer' } : computeTxChanges(editing, tx), tx);

      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '🏛️ ' : '✏️ ') + 'ইন্টারনাল অনলাইন ট্রান্সফার',
        detail: (BRANCHES[from]?.name || '') + ' ➜ ' + (BRANCHES[to]?.name || ''),
        amount: amount,
        targetId: tx.id
      });

      close();
      toast('✅ ট্রান্সফার — ৳ ' + fmt(amount) + '\n' +
        (BRANCHES[from]?.name || '') + ' ➜ ' + (BRANCHES[to]?.name || ''));

      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });

  /* ═══════════════════════════════════════════════════════════
     HISTORY — All transfers, default today
     ═══════════════════════════════════════════════════════════ */
  const area = q('#modalHistoryArea');
  if(area){
    let histDate = todayStr();

    function renderHistory(){
      const allTxs = getAllTxs().filter(t => t.type === 'bank_transfer' && !t.cancelled);
      const list = histDate ? allTxs.filter(t => t.date === histDate) : allTxs;
      const total = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      let html = '<div class="modal-history">' +
        '<div class="modal-history-title"><span class="bar"></span> 📋 ট্রান্সফার হিস্টোরি — ' +
          '<input type="date" id="bt_hist_date" value="' + histDate + '" style="padding:6px 10px;border-radius:8px;background:#050810;border:1px solid var(--line-2);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700">' +
          '<button type="button" id="bt_hist_clear" style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-left:6px">সব</button>' +
          '<span class="badge" style="margin-left:auto">' + toBn(list.length) + ' টি • ৳ ' + fmt(total) + '</span>' +
        '</div>';

      if(list.length){
        html += '<div class="table-wrap" style="max-height:380px;overflow-y:auto"><table class="tbl"><thead><tr>' +
          '<th style="width:40px;text-align:center">#</th>' +
          '<th>তারিখ</th>' +
          '<th>From ➜ To</th>' +
          '<th style="text-align:right">পরিমাণ</th>' +
          '<th>ব্যাংক</th>' +
          '<th>ইউজার</th>' +
          '<th style="text-align:center;width:80px">প্রিন্ট</th>' +
        '</tr></thead><tbody>';

        list.slice().reverse().slice(0, 100).forEach((t, i) => {
          const bankName = t.bank ? (BANKS[t.bank]?.name || t.bank) : '—';
          html += '<tr>' +
            '<td style="text-align:center;color:#7a8ab8;font-weight:800">' + toBn(i + 1) + '</td>' +
            '<td style="font-size:11.5px;white-space:nowrap">' + toBn(t.date) + '</td>' +
            '<td style="font-size:12px">' +
              '<b style="color:#f87171">' + esc(BRANCHES[t.from]?.name || t.from) + '</b>' +
              ' <span style="color:#a5b4d8">➜</span> ' +
              '<b style="color:#4ade80">' + esc(BRANCHES[t.to]?.name || t.to) + '</b>' +
            '</td>' +
            '<td style="text-align:right;color:#a78bfa;font-weight:900;white-space:nowrap">৳ ' + fmt(t.amount) + '</td>' +
            '<td style="font-size:11.5px;color:#a5b4d8">' + esc(bankName) + '</td>' +
            '<td style="font-size:11.5px">' + esc(t.user || '-') + '</td>' +
            '<td style="text-align:center">' +
              '<button class="mini print-btn" data-bt-print="' + t.id + '">🖨️</button>' +
            '</td>' +
          '</tr>';
        });

        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty">📭 এই তারিখে কোনো ট্রান্সফার নেই</div>';
      }

      html += '</div>';
      area.innerHTML = html;

      // Date change
      const dEl = area.querySelector('#bt_hist_date');
      if(dEl) dEl.addEventListener('change', e => {
        histDate = e.target.value;
        renderHistory();
      });

      // "সব" button
      const cBtn = area.querySelector('#bt_hist_clear');
      if(cBtn) cBtn.addEventListener('click', () => {
        histDate = '';
        const d = area.querySelector('#bt_hist_date');
        if(d) d.value = '';
        renderHistory();
      });

      // Print buttons
      area.querySelectorAll('[data-bt-print]').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          const t = getAllTxs().find(x => x.id === b.dataset.btPrint);
          if(t && typeof printSingleTransaction === 'function'){
            printSingleTransaction(t);
          }
        });
      });
    }

    renderHistory();
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 Legacy no-op (safe for any remaining references)
   ═══════════════════════════════════════════════════════════ */
async function receiveBankTransferDirect(id){
  // No longer needed — transfers auto-complete
  console.log('ℹ️ receiveBankTransferDirect deprecated');
}

async function cancelBankTransferDirect(id){
  // No longer needed — transfers auto-complete
  console.log('ℹ️ cancelBankTransferDirect deprecated');
}

console.log('✅ Bank Transfer REBUILT — v10.0 (auto complete)');