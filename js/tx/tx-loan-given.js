/* ============================================================
   FILE: js/tx/tx-loan-given.js — COMPLETE
   PURPOSE: ঋণ বিতরণ + আলাদা নগদ উত্তোলন
   ============================================================ */
'use strict';

function openLoanGivenForm(editId){
  const editing = editId ? DB.txs.find(t => t.id === editId) : null;
  const isAdmin = SESSION.role === 'admin';
  const initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  const vault = DB.liveVault[initBranch] || {};

  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '"></div>' +
      (isAdmin ?
        '<div class="field"><label>আউটলেট</label><select id="f-branch">' +
          Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '"' + (initBranch === k ? ' selected' : '') + '>' + v.name + '</option>').join('') +
        '</select></div>'
        : '<input type="hidden" id="f-branch" value="' + initBranch + '">') +
    '</div>' +

    '<div class="field"><label>গ্রাহক খুঁজুন</label><input type="text" id="f-search" placeholder="নাম/অ্যাকাউন্ট" value="' + esc(editing?.custAcc || '') + '"></div>' +

    '<div class="form-row">' +
      '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f-acc" value="' + esc(editing?.custAcc || '') + '"></div>' +
      '<div class="field"><label>নাম</label><input type="text" id="f-name" value="' + esc(editing?.custName || '') + '"></div>' +
      '<div class="field"><label>মোবাইল</label><input type="text" id="f-mobile" value="' + esc(editing?.custMobile || '') + '"></div>' +
    '</div>' +

    // ═══ 3 Fields Side by Side ═══
    '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.08),rgba(34,197,94,.03));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
        '<div>' +
          '<label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:900;margin-bottom:5px;text-transform:uppercase">🏦 মূল ঋণ <span style="color:#f87171">*</span></label>' +
          '<input type="text" inputmode="decimal" id="f-total" value="' + (editing?.mainLoanAmount || editing?.amount || '') + '" placeholder="0" style="width:100%;padding:11px 12px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:15px;font-weight:900;outline:none" autocomplete="off">' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:11.5px;color:#c4b5fd;font-weight:900;margin-bottom:5px;text-transform:uppercase">🌐 অনলাইন</label>' +
          '<input type="text" inputmode="decimal" id="f-online" value="' + (editing?.onlineAmount || '') + '" placeholder="0" style="width:100%;padding:11px 12px;border-radius:11px;background:#050810;border:1.5px solid rgba(167,139,250,.4);color:#c4b5fd;font-family:inherit;font-size:15px;font-weight:900;outline:none" autocomplete="off">' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:11.5px;color:#facc15;font-weight:900;margin-bottom:5px;text-transform:uppercase">💵 নগদ উত্তোলন</label>' +
          '<input type="text" inputmode="decimal" id="f-withdrawal" placeholder="0" style="width:100%;padding:11px 12px;border-radius:11px;background:#050810;border:1.5px solid rgba(250,204,21,.4);color:#facc15;font-family:inherit;font-size:15px;font-weight:900;outline:none" autocomplete="off"' + (editing ? ' disabled' : '') + '>' +
        '</div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:10px"><label style="color:#c4b5fd !important">🏛️ অনলাইন ব্যাংকের নাম</label>' +
        '<input type="text" id="f-bankname" value="' + esc(editing?.onlineBankName || '') + '" placeholder="যেমন: BRAC Bank" autocomplete="off"></div>' +
    '</div>' +

    // ═══ SUMMARY BOX ═══
    '<div id="loan-summary" style="margin-bottom:14px;padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(0,0,0,.4));border:1.5px solid rgba(59,130,246,.4);font-size:13.5px;color:#e0eaff;line-height:2">' +
      '<div style="text-align:center;color:#7a8ab8;font-size:12px;padding:10px">💡 পরিমাণ দিন — হিসাব দেখা যাবে</div>' +
    '</div>' +

    '<div class="notes-col out" style="margin-bottom:14px"><h4>💸 ক্যাশ প্রদান (ঋণ)</h4>' +
      denomRowHTML('out', editing?.notesOut, vault) +
      '<div class="sum-line"><span>মোট ক্যাশ</span><b id="sum-out">৳ 0.00</b></div></div>' +

    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note" value="' + esc(editing?.note || '') + '"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">💾 সংরক্ষণ</button></div>';

  openModal({
    title: '💸 ঋণের টাকা বিতরণ',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => setupLoanGivenForm(root, editing, close, initBranch)
  });
}

function setupLoanGivenForm(wrap, editing, close, defaultBranch){
  const so = wrap.querySelector('#sum-out');
  const loanTotalInput = wrap.querySelector('#f-total');
  const onlineAmountInput = wrap.querySelector('#f-online');
  const withdrawalInput = wrap.querySelector('#f-withdrawal');
  const summaryEl = wrap.querySelector('#loan-summary');
  const accEl = wrap.querySelector('#f-acc');
  const nameEl = wrap.querySelector('#f-name');

  if(loanTotalInput) attachAmountInput(loanTotalInput);
  if(onlineAmountInput) attachAmountInput(onlineAmountInput);
  if(withdrawalInput) attachAmountInput(withdrawalInput);

  const getBranchKey = () => {
    const b = wrap.querySelector('#f-branch');
    return (b && b.value) ? b.value : defaultBranch;
  };
  const getMainLoan = () => parseNum(loanTotalInput?.value);
  const getOnline = () => parseNum(onlineAmountInput?.value);
  const getWithdrawal = () => parseNum(withdrawalInput?.value);

  // ═══════════════════════════════════════════════════════════
  // UPDATE SUMMARY
  // ═══════════════════════════════════════════════════════════
  function updateSummary(){
    try {
      const mainLoan = getMainLoan();
      const withdrawal = getWithdrawal();
      const totalLoan = mainLoan + withdrawal;
      const online = getOnline();
      const cashGiven = sumNotes(readNotes(wrap, 'out'));
      const cashNotTaken = Math.max(0, totalLoan - online - cashGiven);
      const over = (online + cashGiven) > (totalLoan + 0.01);

      if(so) so.textContent = '৳ ' + fmt(cashGiven);
      if(!summaryEl) return;

      if(totalLoan <= 0 && online <= 0){
        summaryEl.innerHTML = '<div style="text-align:center;color:#7a8ab8;font-size:12px;padding:10px">💡 পরিমাণ দিন — হিসাব দেখা যাবে</div>';
        return;
      }

      let html = '';

      // 🏦 মূল ঋণ + 💵 নগদ উত্তোলন = মোট ঋণ (top)
      html += '<div style="padding:12px 14px;margin-bottom:12px;border-radius:12px;background:rgba(0,0,0,.35);border:1.5px solid rgba(59,130,246,.4)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">';
      html += '<span style="font-size:13px;color:#93c5fd;font-weight:800">🏦 মূল ঋণ:</span>';
      html += '<b style="color:#93c5fd;font-size:16px;font-weight:900">৳ ' + fmt(mainLoan) + '</b>';
      html += '</div>';

      if(withdrawal > 0){
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">';
        html += '<span style="font-size:13px;color:#facc15;font-weight:800">+ 💵 নগদ উত্তোলন:</span>';
        html += '<b style="color:#facc15;font-size:16px;font-weight:900">৳ ' + fmt(withdrawal) + '</b>';
        html += '</div>';
      }

      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;margin-top:6px;border-top:1.5px solid rgba(59,130,246,.4)">';
      html += '<span style="font-size:13px;color:#4ade80;font-weight:900">= মোট ঋণ:</span>';
      html += '<b style="color:#4ade80;font-size:20px;font-weight:900">৳ ' + fmt(totalLoan) + '</b>';
      html += '</div>';
      html += '</div>';

      // Deductions
      html += '<div style="padding:10px 12px;margin-bottom:10px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(250,204,21,.3)">';
      if(online > 0){
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">';
        html += '<span style="font-size:12.5px;color:#c4b5fd;font-weight:700">🌐 অনলাইন:</span>';
        html += '<b style="color:#c4b5fd;font-weight:900">− ৳ ' + fmt(online) + '</b>';
        html += '</div>';
      }
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">';
      html += '<span style="font-size:12.5px;color:#facc15;font-weight:700">💸 ক্যাশ (প্রদান):</span>';
      html += '<b style="color:#facc15;font-weight:900">− ৳ ' + fmt(cashGiven) + '</b>';
      html += '</div>';
      html += '</div>';

      // ক্যাশ নেয়নি (final)
      html += '<div style="padding:14px 16px;border-radius:12px;background:linear-gradient(145deg,rgba(250,204,21,.15),rgba(250,204,21,.05));border:2px solid rgba(250,204,21,.5)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="font-size:14px;color:#facc15;font-weight:900">💰 ক্যাশ নেয়নি:</span>';
      html += '<b style="color:#facc15;font-size:22px;font-weight:900">৳ ' + fmt(cashNotTaken) + '</b>';
      html += '</div></div>';

      if(over){
        html += '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(220,38,38,.15);color:#f87171;font-weight:900;text-align:center;border:1.5px solid rgba(220,38,38,.5)">🚨 অনলাইন + ক্যাশ > মোট ঋণ!</div>';
      }

      if(withdrawal > 0){
        html += '<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.4)">';
        html += '<div style="font-size:11.5px;color:#22d3ee;font-weight:800">💵 আলাদা withdrawal txn — ৳ ' + fmt(withdrawal) + '</div>';
        html += '</div>';
      }

      summaryEl.innerHTML = html;
    } catch(e){
      console.error('updateSummary error:', e);
    }
  }

  function recalc(){ updateSummary(); }

  setupDenomInputs(wrap, 'out', getBranchKey, recalc);

  if(loanTotalInput) loanTotalInput.addEventListener('input', recalc);
  if(onlineAmountInput) onlineAmountInput.addEventListener('input', recalc);
  if(withdrawalInput) withdrawalInput.addEventListener('input', recalc);

  // Customer search
  const sEl = wrap.querySelector('#f-search');
  if(sEl){
    sEl.addEventListener('input', () => {
      const q = sEl.value.trim().toLowerCase();
      if(!q) return;
      const c = DB.customers.find(x =>
        String(x.accountNo || '').toLowerCase() === q ||
        String(x.name || '').toLowerCase().includes(q) ||
        String(x.mobile || '').includes(q)
      );
      if(c){
        accEl.value = c.accountNo || '';
        nameEl.value = c.name || '';
        wrap.querySelector('#f-mobile').value = c.mobile || '';
      }
    });
  }

  recalc();

  // ═══════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════
  wrap.querySelector('#f-save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f-save');
    if(sBtn.disabled) return;

    try{
      const mainLoan = getMainLoan();
      const withdrawal = getWithdrawal();
      const totalLoan = Number(editing?.totalLoanAmount) || (mainLoan + withdrawal);
      const online = getOnline();
      const outN = readNotes(wrap, 'out');
      const cashGiven = sumNotes(outN);
      const cashNotTaken = Math.max(0, totalLoan - online - cashGiven);
      const branch = getBranchKey();
      const date = wrap.querySelector('#f-date').value || todayStr();
      const custAcc = accEl.value.trim();
      const custName = nameEl.value.trim();
      const custMobile = wrap.querySelector('#f-mobile').value.trim();

      // Validations
      if(mainLoan <= 0 && withdrawal <= 0){
        alert('⚠️ মূল ঋণ বা নগদ উত্তোলন - যেকোনো একটি দিন');
        return;
      }
      if((online + cashGiven) > (totalLoan + 0.01)){
        alert('⚠️ অনলাইন + ক্যাশ > মোট ঋণ');
        return;
      }
      if(!custName || !custAcc){
        alert('⚠️ গ্রাহক তথ্য দিন (নাম + অ্যাকাউন্ট)');
        return;
      }

      // Vault check
      const v = DB.liveVault[branch] || {};
      const miss = [];
      Object.keys(outN).forEach(d => {
        if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d);
      });
      if(miss.length){
        alert('🚫 ঋণ ক্যাশের জন্য ভল্টে কম: ' + miss.join(', '));
        return;
      }

      sBtn.disabled = true;
      const orig = sBtn.innerHTML;
      sBtn.innerHTML = '<span class="spin"></span>';

      const nowISO = new Date().toISOString();

      // ═══════════════════════════════════════════════════════
      // 1️⃣ LOAN GIVEN TXN — শুধু মূল ঋণ
      // ═══════════════════════════════════════════════════════
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'loan_given',
        date,
        branch,
        custBranch: branch,
        dir: 'out',
        amount: Math.round(mainLoan * 100) / 100,             // ⚡ শুধু মূল ঋণ
        mainLoanAmount: Math.round(mainLoan * 100) / 100,
        withdrawalAmount: Math.round(withdrawal * 100) / 100,
        totalLoanAmount: Math.round(totalLoan * 100) / 100,   // reference
        onlineAmount: online > 0 ? Math.round(online * 100) / 100 : null,
        onlineBankName: online > 0 ? (wrap.querySelector('#f-bankname')?.value || '') : null,
        cashAmount: Math.round(cashGiven * 100) / 100,
        cashNotTaken: cashNotTaken > 0.01,
        cashNotTakenAmount: cashNotTaken > 0.01 ? Math.round(cashNotTaken * 100) / 100 : null,
        notesOut: outN,
        notesIn: {},
        custAcc, custName, custMobile,
        note: wrap.querySelector('#f-note').value.trim(),
        collectionStatus: cashNotTaken > 0.01 ? 'pending' : null,
        collectedAmount: 0,
        user: SESSION.name,
        createdAt: editing ? editing.createdAt : nowISO,
        updatedAt: nowISO
      };

      if(!editing) DB.txs.push(tx);
      else {
        const i = DB.txs.findIndex(x => x.id === editing.id);
        if(i >= 0) DB.txs[i] = tx;
      }

      upsertCustomer({ accountNo: custAcc, name: custName, mobile: custMobile, branch });
      logActivity('txn_create', '💸 ঋণ বিতরণ', custName, mainLoan);

      // ═══════════════════════════════════════════════════════
      // 2️⃣ WITHDRAWAL TXN — আলাদা
      // ═══════════════════════════════════════════════════════
      if(withdrawal > 0 && !editing){
        const wTx = {
          id: uid(),
          type: 'withdrawal',
          date,
          branch,
          custBranch: branch,
          dir: 'out',
          amount: Math.round(withdrawal * 100) / 100,        // ⚡ শুধু withdrawal
          customerAccountAmount: 0,
          cashAmount: Math.round(withdrawal * 100) / 100,
          notesOut: {},
          notesIn: {},
          custAcc, custName, custMobile,
          note: 'ঋণ বিতরণের সাথে নগদ উত্তোলন',
          user: SESSION.name,
          createdAt: nowISO,
          updatedAt: nowISO,
          linkedFrom: 'loan_given',
          linkedParentId: tx.id
        };

        DB.txs.push(wTx);
        logActivity('txn_create', '💵 নগদ উত্তোলন', custName, withdrawal);
      }

      close();

      const toastMsg = (mainLoan > 0 && withdrawal > 0)
        ? '✅ ঋণ ৳ ' + fmt(mainLoan) + ' + উত্তোলন ৳ ' + fmt(withdrawal)
        : (mainLoan > 0 ? '✅ ঋণ — ৳ ' + fmt(mainLoan) : '✅ উত্তোলন — ৳ ' + fmt(withdrawal));
      toast(toastMsg, 'ok');

      DB.__updated = new Date().toISOString();
      saveLocal();
      recomputeLive();
      renderDashboard();
      pushCloud();

    } catch(err){
      console.error('Save error:', err);
      alert('❌ ' + err.message);
      const sBtn2 = wrap.querySelector('#f-save');
      if(sBtn2){ sBtn2.disabled = false; sBtn2.innerHTML = '💾 সংরক্ষণ'; }
    }
  });
}

console.log('✅ Loan Given loaded — v5.0 (separate txns)');