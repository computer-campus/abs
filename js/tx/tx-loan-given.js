/* ============================================================
   FILE: tx/tx-loan-given.js
   PURPOSE: 💸 ঋণের টাকা বিতরণ
   VERSION: v7.2
   ============================================================ */

'use strict';

function openLoanGivenForm(editId, prefill){
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  
  let baseBranch;
  if(editing) baseBranch = editing.branch;
  else if(isAdminUser) baseBranch = (viewBranch === 'all') ? 'kalaroa' : viewBranch;
  else baseBranch = session.branch || 'kalaroa';
  if(!BRANCHES[baseBranch]) baseBranch = 'kalaroa';
  
  const preAcc = editing ? (editing.custAcc || '') : (prefill?.custAcc || '');
  const preName = editing ? (editing.custName || '') : (prefill?.custName || '');
  const preMobile = editing ? (editing.custMobile || '') : (prefill?.custMobile || '');
  const preAddr = editing ? (editing.custAddr || '') : (prefill?.custAddr || '');
  
  const initLoanTotal = editing ? (Number(editing.amount) || 0) : 0;
  const initOnline = editing ? (Number(editing.onlineAmount) || 0) : 0;
  const initBankName = editing?.onlineBankName || '';
  const branchVault = DB().liveVault?.[baseBranch] || {};
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>📅 তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      (isAdminUser ?
        '<div class="field"><label>🏦 আউটলেট</label><select id="f_branch">' + branchOpts(baseBranch) + '</select></div>'
        : '<input type="hidden" id="f_branch" value="' + baseBranch + '">') +
    '</div>' +
    
    '<div class="cust-box">' +
      '<div class="head"><h4>🔍 গ্রাহক খুঁজুন</h4></div>' +
      '<div class="field"><input type="text" id="f_search" placeholder="নাম / অ্যাকাউন্ট / মোবাইল..." value="' + preAcc + '" autocomplete="off"><div class="suggest" id="f_suggest"></div></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f_acc" value="' + preAcc + '" autocomplete="off"></div>' +
        '<div class="field"><label>নাম</label><input type="text" id="f_name" value="' + preName + '" autocomplete="off"></div>' +
        '<div class="field"><label>মোবাইল</label><input type="text" id="f_mobile" value="' + preMobile + '" autocomplete="off"></div>' +
        '<div class="field"><label>ঠিকানা</label><input type="text" id="f_addr" value="' + preAddr + '" autocomplete="off"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">' +
        '<button class="btn gray" type="button" id="f_editCust" style="padding:10px 16px">✏️ সেভ</button>' +
        '<button class="btn pink" type="button" id="f_checkDue" style="padding:10px 16px">📜 হিস্টোরি</button>' +
      '</div>' +
      '<div id="custInfoPanel" style="display:none;margin-top:12px"></div>' +
    '</div>' +
    
    '<div style="padding:16px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.08),rgba(34,197,94,.03));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
      '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">💰 ঋণের পরিমাণ বিবরণী</div>' +
      '<div class="form-row">' +
        '<div class="field" style="margin-bottom:0">' +
          '<label style="color:#93c5fd !important">🏦 মূল উত্তোলনযোগ্য ঋণ <span style="color:#f87171;font-size:14px">*</span></label>' +
          '<input type="text" inputmode="decimal" id="f_loan_total" value="' + (initLoanTotal ? initLoanTotal.toLocaleString('en-US') : '') + '" placeholder="বাধ্যতামূলক" style="color:#93c5fd;font-weight:900;font-size:18px" autocomplete="off">' +
          '<div id="loanTotalError" style="display:none;margin-top:6px;padding:5px 10px;border-radius:6px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.5);color:#f87171;font-size:11.5px;font-weight:700">⚠️ বাধ্যতামূলক</div>' +
        '</div>' +
        '<div class="field" style="margin-bottom:0">' +
          '<label style="color:#a78bfa !important">🌐 অনলাইন ফান্ড ট্রান্সফার</label>' +
          '<input type="text" inputmode="decimal" id="f_onlineAmount" value="' + (initOnline ? initOnline.toLocaleString('en-US') : '') + '" placeholder="০" style="color:#c4b5fd;font-weight:800;font-size:16px" autocomplete="off">' +
        '</div>' +
      '</div>' +
      '<div class="field" style="margin-top:10px;margin-bottom:0"><label style="color:#c4b5fd !important">🏛️ অনলাইন ব্যাংকের নাম (ঐচ্ছিক)</label><input type="text" id="f_onlineBankName" value="' + esc(initBankName) + '" autocomplete="off"></div>' +
      
      '<div id="cashNotTakenBox" style="margin-top:14px;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.3);border:1.5px solid rgba(59,130,246,.3)">' +
        '<label class="online-tick-label" style="border:none;background:transparent;padding:0;cursor:default">' +
          '<input type="checkbox" id="f_cashNotTakenTick" disabled style="accent-color:#facc15;cursor:not-allowed">' +
          '<div class="online-tick-text">' +
            '<div class="title" id="cashNotTakenTitle" style="color:#a5b4d8">💰 গ্রাহক ক্যাশ নেয়নি</div>' +
            '<div class="sub" id="cashNotTakenSub" style="color:#7a8ab8">টাকা মাদার অ্যাকাউন্টে থাকবে</div>' +
          '</div>' +
        '</label>' +
        '<div id="cashNotTakenInfo" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(250,204,21,.3)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
            '<div>' +
              '<div style="font-size:12px;color:#facc15;font-weight:800">💰 মাদার অ্যাকাউন্টে থাকবে</div>' +
              '<div style="font-size:11px;color:#a5b4d8">Loan Collection-এ সংগ্রহযোগ্য</div>' +
            '</div>' +
            '<div id="cashNotTakenAmountDisplay" style="font-size:24px;font-weight:900;color:#facc15;letter-spacing:-.5px">৳ 0.00</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      '<div id="loanSummaryPreview" style="margin-top:14px;padding:14px;border-radius:12px;background:rgba(0,0,0,.4);border:1px solid rgba(59,130,246,.25);font-size:13px;color:#e0eaff;line-height:2"></div>' +
    '</div>' +
    
    '<div class="notes-cols" id="notesCols">' +
      '<div class="notes-col out"><h4>💸 ক্যাশ প্রদান</h4>' +
        notesRowHTML('out', editing?.notesOut || null, branchVault) +
        '<div class="sum-line"><span>মোট</span><b id="sumOut">৳ 0.00</b></div>' +
      '</div>' +
      '<div class="notes-col in"><h4>📥 গ্রহণ</h4>' +
        notesRowHTML('in', editing?.notesIn || null, {}) +
        '<div class="sum-line"><span>মোট</span><b id="sumIn">৳ 0.00</b></div>' +
      '</div>' +
    '</div>' +
    
    '<div id="noteAvailabilityWarning" style="margin-top:10px;display:none"></div>' +
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label><input type="text" id="f_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn green" id="f_save" style="flex:1;min-width:160px">💾 সংরক্ষণ</button></div>' +
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: '💸 ঋণের টাকা বিতরণ',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupLoanGivenForm(w, editing, close, baseBranch)
  });
}

function setupLoanGivenForm(wrap, editing, close, defaultBranch){
  const so = wrap.querySelector('#sumOut');
  const si = wrap.querySelector('#sumIn');
  const cTick = wrap.querySelector('#f_cashNotTakenTick');
  const cInfo = wrap.querySelector('#cashNotTakenInfo');
  const cAmtDisplay = wrap.querySelector('#cashNotTakenAmountDisplay');
  const cTitle = wrap.querySelector('#cashNotTakenTitle');
  const cSub = wrap.querySelector('#cashNotTakenSub');
  const cBox = wrap.querySelector('#cashNotTakenBox');
  const loanTotalInput = wrap.querySelector('#f_loan_total');
  const onlineAmountInput = wrap.querySelector('#f_onlineAmount');
  const summaryEl = wrap.querySelector('#loanSummaryPreview');
  const custInfoEl = wrap.querySelector('#custInfoPanel');
  const accEl = wrap.querySelector('#f_acc');
  const nameEl = wrap.querySelector('#f_name');
  const loanTotalError = wrap.querySelector('#loanTotalError');
  
  if(loanTotalInput) attachAmountInput(loanTotalInput, { decimal: true });
  if(onlineAmountInput) attachAmountInput(onlineAmountInput, { decimal: true });
  
  const getBranchKey = () => {
    const b = wrap.querySelector('#f_branch');
    return b?.value || defaultBranch;
  };
  const getLoanTotal = () => parseNum(loanTotalInput?.value);
  const getOnline = () => parseNum(onlineAmountInput?.value);
  
  function updateSummary(){
    const total = getLoanTotal();
    const online = getOnline();
    const cashGiven = noteSum(readNotes(wrap, 'out'));
    const cashReceived = noteSum(readNotes(wrap, 'in'));
    const cashNotTaken = Math.max(0, total - online - cashGiven);
    const overUtilized = (online + cashGiven) > (total + 0.01);
    const hasCashNotTaken = cashNotTaken > 0.01;
    
    if(cTick){ cTick.checked = hasCashNotTaken; cTick.disabled = true; }
    if(cInfo) cInfo.style.display = hasCashNotTaken ? 'block' : 'none';
    if(cAmtDisplay) cAmtDisplay.textContent = '৳ ' + fmt(cashNotTaken);
    
    if(cBox && cTitle && cSub){
      if(overUtilized){
        cBox.style.background = 'rgba(220,38,38,.12)';
        cBox.style.borderColor = 'rgba(220,38,38,.6)';
        cTitle.style.color = '#f87171';
        cTitle.textContent = '🚨 অতিরিক্ত পরিমাণ!';
        cSub.style.color = '#fca5a5';
        cSub.textContent = 'অনলাইন + ক্যাশ = ৳ ' + fmt(online + cashGiven) + ' কিন্তু মোট ৳ ' + fmt(total);
      } else if(hasCashNotTaken){
        cBox.style.background = 'rgba(250,204,21,.12)';
        cBox.style.borderColor = 'rgba(250,204,21,.6)';
        cTitle.style.color = '#facc15';
        cTitle.textContent = '💰 গ্রাহক ক্যাশ নেয়নি (auto)';
        cSub.style.color = '#fde047';
        cSub.textContent = '৳ ' + fmt(cashNotTaken) + ' মাদার অ্যাকাউন্টে থাকবে';
      } else if(total > 0){
        cBox.style.background = 'rgba(34,197,94,.08)';
        cBox.style.borderColor = 'rgba(34,197,94,.4)';
        cTitle.style.color = '#4ade80';
        cTitle.textContent = '✅ গ্রাহক সম্পূর্ণ ক্যাশ নিয়েছে';
        cSub.style.color = '#86efac';
        cSub.textContent = 'কোনো Loan Collection থাকবে না';
      } else {
        cBox.style.background = 'rgba(0,0,0,.3)';
        cBox.style.borderColor = 'rgba(59,130,246,.3)';
        cTitle.style.color = '#a5b4d8';
        cTitle.textContent = '💰 গ্রাহক ক্যাশ নেয়নি';
        cSub.style.color = '#7a8ab8';
        cSub.textContent = 'টাকা মাদার অ্যাকাউন্টে থাকবে';
      }
    }
    
    if(summaryEl){
      let html = '';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>🏦 মূল উত্তোলনযোগ্য ঋণ:</span><b style="color:#93c5fd;font-size:15px">৳ ' + fmt(total) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>🌐 অনলাইন ফান্ড ট্রান্সফার:</span><b style="color:#c4b5fd;font-size:15px">− ৳ ' + fmt(online) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>💵 নগদ ক্যাশ প্রদান:</span><b style="color:#facc15;font-size:15px">− ৳ ' + fmt(cashGiven) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;padding-top:8px;border-top:2px solid rgba(250,204,21,.4)"><span style="font-weight:800;color:#facc15">💰 গ্রাহক ক্যাশ নেয়নি:</span><b style="color:#facc15;font-size:17px;font-weight:900">৳ ' + fmt(cashNotTaken) + '</b></div>';
      if(cashReceived > 0){
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;margin-top:4px;border-top:1px dashed rgba(34,197,94,.3)"><span>📥 গ্রাহকের কাছ থেকে গ্রহণ:</span><b style="color:#4ade80;font-size:14px">+ ৳ ' + fmt(cashReceived) + '</b></div>';
      }
      summaryEl.innerHTML = html;
    }
    
    updateWarn();
  }
  
  function updateWarn(){
    const wb = wrap.querySelector('#noteAvailabilityWarning');
    if(!wb) return;
    
    const vb = getBranchKey();
    const vault = DB().liveVault?.[vb] || {};
    const on = readNotes(wrap, 'out');
    const iss = [];
    
    Object.keys(on).forEach(d => {
      const n = Number(on[d]) || 0, h = Number(vault[d]) || 0;
      if(n > h) iss.push({ d, n, h });
    });
    
    if(iss.length > 0){
      wb.innerHTML = '<div style="padding:12px 14px;border-radius:10px;background:rgba(220,38,38,.15);border:2px solid rgba(220,38,38,.6);font-size:13px;color:#f87171;font-weight:700">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:20px">🚫</span><span style="font-size:14px">ভল্টে পর্যাপ্ত নোট নেই!</span></div>' +
        iss.map(it => '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed rgba(220,38,38,.3)"><span>৳' + toBn(it.d) + ' — দরকার <b>' + toBn(it.n) + '</b></span><span style="color:#fca5a5">আছে <b>' + toBn(it.h) + '</b></span></div>').join('') +
        '</div>';
      wb.style.display = 'block';
    } else {
      wb.innerHTML = '';
      wb.style.display = 'none';
    }
  }
  
  function recalc(){
    const on = readNotes(wrap, 'out');
    const inN = readNotes(wrap, 'in');
    const os = noteSum(on);
    const is = noteSum(inN);
    
    if(so) so.textContent = '৳ ' + fmt(os);
    if(si) si.textContent = '৳ ' + fmt(is);
    
    updateSummary();
  }
  
  if(loanTotalInput){
    loanTotalInput.addEventListener('blur', () => {
      const v = getLoanTotal();
      if(v <= 0){
        if(loanTotalError) loanTotalError.style.display = 'block';
        loanTotalInput.style.borderColor = 'rgba(220,38,38,.6)';
      } else {
        if(loanTotalError) loanTotalError.style.display = 'none';
        loanTotalInput.style.borderColor = '';
      }
    });
  }
  
  function showCustomerInfo(acc, name){
    if(!acc || !custInfoEl) return;
    
    const allTxs = getCustomerAllTxs(acc);
    const loanTxs = allTxs.filter(t => t.type === 'loan_given' && !t.cancelled);
    const totalLoan = loanTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalOnline = loanTxs.reduce((s, t) => s + (Number(t.onlineAmount) || 0), 0);
    const totalNotTaken = loanTxs.reduce((s, t) => s + (Number(t.cashNotTakenAmount) || 0), 0);
    
    custInfoEl.style.display = 'block';
    custInfoEl.innerHTML =
      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.12),rgba(34,197,94,.05));border:1.5px solid rgba(59,130,246,.4)">' +
        '<div style="font-size:12.5px;color:#93c5fd;font-weight:800;text-transform:uppercase;margin-bottom:10px">👤 গ্রাহক তথ্য — ' + esc(name || '-') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;font-size:12.5px">' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">📊 মোট লেনদেন</div><div style="color:#fff;font-weight:900;font-size:14px;margin-top:2px">' + toBn(allTxs.length) + ' টি</div></div>' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">🏦 মোট ঋণ</div><div style="color:#93c5fd;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(totalLoan) + '</div></div>' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">🌐 অনলাইন</div><div style="color:#c4b5fd;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(totalOnline) + '</div></div>' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(59,130,246,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">💰 নেয়নি</div><div style="color:#facc15;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(totalNotTaken) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          '<button type="button" class="btn cyan sm" id="ci_view_history" style="flex:1;min-width:140px;padding:9px 14px;font-size:13px">📜 সম্পূর্ণ হিস্টোরি দেখুন</button>' +
        '</div>' +
      '</div>';
    
    setTimeout(() => {
      const btn = custInfoEl.querySelector('#ci_view_history');
      if(btn){
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if(typeof openCustomerDetailPopup === 'function'){
            openCustomerDetailPopup(acc, name);
          }
        });
      }
    }, 100);
  }
  
  const sEl = wrap.querySelector('#f_search');
  const sg = wrap.querySelector('#f_suggest');
  if(sEl && sg){
    sEl.addEventListener('input', () => {
      const list = searchCustomers(sEl.value);
      if(!list.length){ sg.innerHTML = ''; return; }
      
      sg.innerHTML = list.map(c => {
        const d = calculateCustomerDue(c.accountNo);
        const dueBadge = d.net > 0 ?
          '<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:6px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5);color:#f87171;font-size:11px;font-weight:800">বকেয়া ৳ ' + fmt(d.net) + '</span>' : '';
        return '<div class="sug-item" data-id="' + c.id + '" data-acc="' + esc(c.accountNo) + '" data-name="' + esc(c.name) + '">' +
          '<b>' + esc(c.name) + '</b> — <small>' + esc(c.accountNo) + '</small>' + dueBadge +
          '<br><small>📱 ' + esc(c.mobile || '-') + '</small>' +
        '</div>';
      }).join('');
      
      sg.querySelectorAll('.sug-item').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const c = DB().customers.find(x => x.id === el.dataset.id);
          if(!c) return;
          accEl.value = c.accountNo;
          nameEl.value = c.name;
          wrap.querySelector('#f_mobile').value = c.mobile || '';
          wrap.querySelector('#f_addr').value = c.address || '';
          sEl.value = c.accountNo;
          sg.innerHTML = '';
          showCustomerInfo(c.accountNo, c.name);
        });
      });
    });
  }
  
  if(accEl){
    accEl.addEventListener('blur', () => {
      const acc = accEl.value.trim();
      if(acc){
        const c = DB().customers.find(x => x.accountNo === acc);
        if(c) showCustomerInfo(acc, c.name);
      }
    });
  }
  
  const ec = wrap.querySelector('#f_editCust');
  if(ec){
    ec.addEventListener('click', async () => {
      const acc = accEl.value.trim();
      const name = nameEl.value.trim();
      if(!acc && !name) return;
      
      const br = getBranchKey();
      upsertCustomer({
        accountNo: acc,
        name,
        mobile: wrap.querySelector('#f_mobile').value.trim(),
        address: wrap.querySelector('#f_addr').value.trim(),
        branch: br
      });
      await saveDB();
      toast('✅ গ্রাহক সেভ');
      if(acc) showCustomerInfo(acc, name);
    });
  }
  
  const cd = wrap.querySelector('#f_checkDue');
  if(cd){
    cd.addEventListener('click', () => {
      const acc = accEl.value.trim();
      if(!acc){ toast('⚠️ অ্যাকাউন্ট দিন'); return; }
      const c = DB().customers.find(x => x.accountNo === acc);
      if(c) openCustomerDetailPopup(c.accountNo, c.name);
      else toast('ℹ️ পাওয়া যায়নি');
    });
  }
  
  __setupDenomInputs(wrap, 'out', getBranchKey, recalc);
  __setupDenomInputs(wrap, 'in', getBranchKey, recalc);
  updateVaultStock(wrap, 'out', getBranchKey());
  updateVaultStock(wrap, 'in', getBranchKey());
  
  if(loanTotalInput) loanTotalInput.addEventListener('input', recalc);
  if(onlineAmountInput) onlineAmountInput.addEventListener('input', recalc);
  recalc();
  
  // History section
  const area = wrap.querySelector('#modalHistoryArea');
  if(area){
    const allLoans = getAllTxs().filter(t => t.type === 'loan_given' && !t.cancelled);
    const custMap = {};
    
    allLoans.forEach(t => {
      const key = (t.custAcc || '').trim() || ('name_' + (t.custName || 'unknown'));
      if(!custMap[key]){
        custMap[key] = {
          acc: t.custAcc || '',
          name: t.custName || '-',
          total: 0,
          online: 0,
          notTaken: 0,
          count: 0,
          lastTime: t.createdAt || ''
        };
      }
      custMap[key].total += Number(t.amount) || 0;
      custMap[key].online += Number(t.onlineAmount) || 0;
      custMap[key].notTaken += Number(t.cashNotTakenAmount) || 0;
      custMap[key].count++;
      if((t.createdAt || '') > (custMap[key].lastTime || '')){
        custMap[key].lastTime = t.createdAt;
      }
    });
    
    const custList = Object.values(custMap).sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''));
    
    area.innerHTML =
      '<div class="modal-history">' +
        '<div class="modal-history-title"><span class="bar"></span> 👥 গ্রাহক ভিত্তিক ঋণ হিস্টোরি (' + toBn(custList.length) + ' জন)</div>' +
        (custList.length ?
          '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            '<th>#</th><th>গ্রাহক</th><th>লেনদেন</th><th>মোট ঋণ</th><th>অনলাইন</th><th>নেয়নি</th><th>ভিউ</th>' +
          '</tr></thead><tbody>' +
          custList.map((c, i) =>
            '<tr class="clickable-row" data-cust-acc="' + esc(c.acc) + '" data-cust-name="' + esc(c.name) + '">' +
              '<td>' + toBn(i + 1) + '</td>' +
              '<td>👤 <b style="color:#4ade80">' + esc(c.name) + '</b><br><small style="color:#7a8ab8;font-family:monospace;font-size:11px">' + esc(c.acc || '-') + '</small></td>' +
              '<td style="text-align:center">' + toBn(c.count) + '</td>' +
              '<td style="color:#93c5fd;font-weight:800;white-space:nowrap">৳ ' + fmt(c.total) + '</td>' +
              '<td style="color:#c4b5fd;font-weight:800;white-space:nowrap">৳ ' + fmt(c.online) + '</td>' +
              '<td style="color:#facc15;font-weight:800;white-space:nowrap">৳ ' + fmt(c.notTaken) + '</td>' +
              '<td><button class="mini show" data-view-cust="' + esc(c.acc) + '" data-view-name="' + esc(c.name) + '">👁️</button></td>' +
            '</tr>'
          ).join('') +
          '</tbody></table></div>'
          : '<div class="empty">📭 নেই</div>') +
      '</div>';
    
    area.querySelectorAll('tr[data-cust-acc]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if(e.target.closest('button')) return;
        const acc = tr.dataset.custAcc, name = tr.dataset.custName;
        if(acc && typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(acc, name);
        }
      });
    });
    
    area.querySelectorAll('[data-view-cust]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(btn.dataset.viewCust && typeof openCustomerDetailPopup === 'function'){
          openCustomerDetailPopup(btn.dataset.viewCust, btn.dataset.viewName);
        }
      });
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const branchEl = wrap.querySelector('#f_branch');
    const tB = branchEl?.value || defaultBranch;
    const cB = tB;
    const on = readNotes(wrap, 'out');
    const inN = readNotes(wrap, 'in');
    const total = getLoanTotal();
    const online = getOnline();
    const cashGiven = noteSum(on);
    const cashNotTakenAuto = Math.max(0, total - online - cashGiven);
    
    if(total <= 0){
      if(loanTotalError) loanTotalError.style.display = 'block';
      loanTotalInput.style.borderColor = 'rgba(220,38,38,.6)';
      loanTotalInput.focus();
      loanTotalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      alert('⚠️ "মূল উত্তোলনযোগ্য ঋণ" অবশ্যই পূরণ করতে হবে!');
      return;
    }
    
    if(online > total + 0.01){
      onlineAmountInput.style.borderColor = 'rgba(220,38,38,.6)';
      onlineAmountInput.focus();
      alert('⚠️ অনলাইন ফান্ড ট্রান্সফার মূল ঋণের চেয়ে বেশি!\n\nমোট: ৳ ' + fmt(total) + '\nঅনলাইন: ৳ ' + fmt(online));
      return;
    }
    
    if((online + cashGiven) > total + 0.01){
      alert('⚠️ অতিরিক্ত পরিমাণ!\n\nমোট ঋণ: ৳ ' + fmt(total) + '\n− অনলাইন: ৳ ' + fmt(online) + '\n= ক্যাশ সর্বোচ্চ: ৳ ' + fmt(total - online) + '\n\nআপনি ক্যাশ দিয়েছেন: ৳ ' + fmt(cashGiven) + '\n\n💸 অতিরিক্ত: ৳ ' + fmt((online + cashGiven) - total));
      return;
    }
    
    const balCheck = checkNegativeBalance(tB);
    if(!balCheck.ok) return;
    
    if(!editing){
      const vault = DB().liveVault?.[cB] || {};
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
            inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        const details = miss.map(m => '৳ ' + toBn(m.d) + ' — দরকার ' + toBn(m.n) + ', আছে ' + toBn(m.h)).join('\n');
        alert('🚫 ভল্টে পর্যাপ্ত নোট নেই!\n\n' + details);
        return;
      }
    }
    
    const custAcc = accEl.value.trim();
    const custName = nameEl.value.trim();
    
    if(!custName || !custAcc){
      alert('⚠️ গ্রাহকের নাম ও অ্যাকাউন্ট দিন');
      return;
    }
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'loan_given',
        date,
        branch: tB,
        custBranch: cB,
        dir: 'out',
        amount: Math.round(total * 100) / 100,
        onlineAmount: online > 0 ? Math.round(online * 100) / 100 : null,
        cashAmount: Math.round(cashGiven * 100) / 100,
        cashNotTaken: cashNotTakenAuto > 0,
        cashNotTakenAmount: cashNotTakenAuto > 0 ? Math.round(cashNotTakenAuto * 100) / 100 : null,
        onlineTransfer: online > 0,
        onlineBankName: online > 0 ? (wrap.querySelector('#f_onlineBankName')?.value || '') : null,
        notesOut: on,
        notesIn: inN,
        custAcc,
        custName,
        custMobile: wrap.querySelector('#f_mobile').value.trim(),
        custAddr: wrap.querySelector('#f_addr').value.trim(),
        note: wrap.querySelector('#f_note').value.trim() || '',
        user: session.name,
        userUsername: session.username,
        createdAt: editing ? editing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        year: date.slice(0, 4),
        accepted: true,
        acceptedDate: date
      };
      
      if(cashNotTakenAuto > 0){
        tx.collectionStatus = editing?.collectionStatus || 'pending';
        tx.collectedAmount = editing?.collectedAmount || 0;
      } else {
        tx.collectionStatus = null;
        tx.collectedAmount = 0;
      }
      
      const isCreating = !editing;
      
      if(!editing){
        DB().txs.push(tx);
      } else {
        const i = DB().txs.findIndex(x => x.id === editing.id);
        if(i >= 0) DB().txs[i] = tx;
      }
      
      upsertCustomer({
        accountNo: custAcc,
        name: custName,
        mobile: tx.custMobile,
        address: tx.custAddr,
        branch: cB
      });
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new loan' } : computeTxChanges(editing, tx), tx);
      
      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '💸 ' : '✏️ ') + 'ঋণ বিতরণ' + (isCreating ? ' তৈরি' : ' আপডেট'),
        detail: custName,
        amount: total,
        targetId: tx.id
      });
      
      close();
      toast('✅ সংরক্ষিত — ৳ ' + fmt(total));
      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
}

/* ───── END OF FILE tx/tx-loan-given.js ───── */
console.log('✅ Loan Given loaded');