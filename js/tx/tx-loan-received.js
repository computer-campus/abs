/* ============================================================
   FILE: tx/tx-loan-received.js
   PURPOSE: 📥 ঋণের টাকা গ্রহণ (Main + Opposite + Change)
   VERSION: v8.1 — History Calendar Default Today
   ============================================================ */

'use strict';

function openLoanReceivedForm(editId, prefill){
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  
  let baseBranch;
  if(editing) baseBranch = editing.branch;
  else if(isAdminUser) baseBranch = (viewBranch === 'all') ? 'kalaroa' : viewBranch;
  else baseBranch = session.branch || 'kalaroa';
  if(!BRANCHES[baseBranch]) baseBranch = 'kalaroa';
  
  const mainBranchName = BRANCHES[baseBranch]?.name || 'কলারোয়া আউটলেট';
  const oppositeBranchKey = (baseBranch === 'kalaroa') ? 'jhaudanga' : 'kalaroa';
  const oppositeBranchName = BRANCHES[oppositeBranchKey]?.name || 'ঝাউডাঙ্গা আউটলেট';
  
  const preAcc = editing ? (editing.custAcc || '') : (prefill?.custAcc || '');
  const preName = editing ? (editing.custName || '') : (prefill?.custName || '');
  const preMobile = editing ? (editing.custMobile || '') : (prefill?.custMobile || '');
  const preAddr = editing ? (editing.custAddr || '') : (prefill?.custAddr || '');
  const initTotal = editing ? (Number(editing.amount) || 0) : 0;
  
  const existingSplits = editing?.branchSplits || [];
  const splitMain = existingSplits.find(s => s.branch === baseBranch)?.notesIn || {};
  const splitOpposite = existingSplits.find(s => s.branch === oppositeBranchKey)?.notesIn || {};
  const legacySplit = editing?.notesIn || {};
  const splitMainFinal = Object.keys(splitMain).length ? splitMain : legacySplit;
  const changeNotes = editing?.changeNotesOut || {};
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>📅 তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      (isAdminUser ?
        '<div class="field"><label>🏦 মূল আউটলেট (Main Branch)</label><select id="f_branch">' + branchOpts(baseBranch) + '</select></div>'
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
      '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px">💰 ঋণ গ্রহণের পরিমাণ</div>' +
      '<div class="field" style="margin-bottom:0">' +
        '<label style="color:#4ade80 !important">💰 মোট পরিমাণ (🤖 অটো হিসাব)</label>' +
        '<input type="text" id="f_total_amount" readonly value="' + (initTotal ? initTotal.toLocaleString('en-US') : '') + '" placeholder="auto calculate হবে..." style="color:#4ade80;font-weight:900;font-size:20px;background:rgba(34,197,94,.05);cursor:not-allowed">' +
      '</div>' +
      '<div id="loanReceivedSummary" style="margin-top:14px;padding:14px;border-radius:12px;background:rgba(0,0,0,.4);border:1px solid rgba(59,130,246,.25);font-size:13px;color:#e0eaff;line-height:2"></div>' +
    '</div>' +
    
    // MAIN Branch Section
    '<div id="splitMainSection" style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.06),rgba(0,0,0,.3));border:1.5px solid rgba(59,130,246,.35);margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
        '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(59,130,246,.25);border:1px solid rgba(59,130,246,.5);color:#93c5fd;font-weight:900;letter-spacing:.5px">MAIN</span>' +
        '<div id="splitMainTitle" style="font-size:13px;font-weight:900;color:#93c5fd;text-transform:uppercase">📥 ' + esc(mainBranchName) + ' — জমা হবে</div>' +
      '</div>' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(0,0,0,.2));border:1.5px solid rgba(59,130,246,.4)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🏦</span><span style="font-size:13px;font-weight:900;color:#93c5fd;text-transform:uppercase">নোট</span></div>' +
          '<div id="splitTotalMain" style="font-size:16px;font-weight:900;color:#93c5fd">৳ 0.00</div>' +
        '</div>' +
        notesRowHTML('in_main', splitMainFinal, {}) +
      '</div>' +
    '</div>' +
    
    // OPPOSITE Branch Section
    '<div id="splitOppositeSection" style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(34,197,94,.06),rgba(0,0,0,.3));border:1.5px solid rgba(34,197,94,.35);margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
        '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(34,197,94,.25);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-weight:900;letter-spacing:.5px">OPPOSITE</span>' +
        '<div id="splitOppositeTitle" style="font-size:13px;font-weight:900;color:#4ade80;text-transform:uppercase">📥 ' + esc(oppositeBranchName) + ' — জমা হবে</div>' +
      '</div>' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.1),rgba(0,0,0,.2));border:1.5px solid rgba(34,197,94,.4)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🏦</span><span style="font-size:13px;font-weight:900;color:#4ade80;text-transform:uppercase">নোট</span></div>' +
          '<div id="splitTotalOpposite" style="font-size:16px;font-weight:900;color:#4ade80">৳ 0.00</div>' +
        '</div>' +
        notesRowHTML('in_opp', splitOpposite, {}) +
      '</div>' +
    '</div>' +
    
    // Change Section
    '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(250,204,21,.06),rgba(0,0,0,.3));border:1.5px solid rgba(250,204,21,.35);margin-bottom:14px">' +
      '<div style="font-size:13px;font-weight:900;color:#facc15;margin-bottom:12px;text-transform:uppercase">🔄 ফেরত (Change)</div>' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(250,204,21,.1),rgba(0,0,0,.2));border:1.5px solid rgba(250,204,21,.4)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🔄</span><span style="font-size:13px;font-weight:900;color:#facc15;text-transform:uppercase">গ্রাহককে ফেরত দিতে হবে</span></div>' +
          '<div id="changeTotal" style="font-size:16px;font-weight:900;color:#facc15">৳ 0.00</div>' +
        '</div>' +
        notesRowHTML('change_out', changeNotes, {}) +
      '</div>' +
    '</div>' +
    
    '<div id="splitMismatchWarning" style="display:none;margin-top:10px"></div>' +
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label><input type="text" id="f_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn green" id="f_save" style="flex:1;min-width:160px">💾 সংরক্ষণ</button></div>' +
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: '📥 ঋণের টাকা গ্রহণ',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupLoanReceivedForm(w, editing, close, baseBranch)
  });
}

function setupLoanReceivedForm(wrap, editing, close, defaultBranch){
  const totalInput = wrap.querySelector('#f_total_amount');
  const summaryEl = wrap.querySelector('#loanReceivedSummary');
  const custInfoEl = wrap.querySelector('#custInfoPanel');
  const accEl = wrap.querySelector('#f_acc');
  const nameEl = wrap.querySelector('#f_name');
  const splitTotalMain = wrap.querySelector('#splitTotalMain');
  const splitTotalOpposite = wrap.querySelector('#splitTotalOpposite');
  const splitMainTitle = wrap.querySelector('#splitMainTitle');
  const splitOppositeTitle = wrap.querySelector('#splitOppositeTitle');
  const mismatchWarn = wrap.querySelector('#splitMismatchWarning');
  
  const getMainKey = () => {
    const b = wrap.querySelector('#f_branch');
    return b?.value || defaultBranch;
  };
  const getOppositeKey = () => {
    const main = getMainKey();
    return (main === 'kalaroa') ? 'jhaudanga' : 'kalaroa';
  };
  const getMainName = () => BRANCHES[getMainKey()]?.name || 'কলারোয়া আউটলেট';
  const getOppositeName = () => BRANCHES[getOppositeKey()]?.name || 'ঝাউডাঙ্গা আউটলেট';
  
  function updateBranchTitles(){
    if(splitMainTitle) splitMainTitle.textContent = '📥 ' + getMainName() + ' — জমা হবে';
    if(splitOppositeTitle) splitOppositeTitle.textContent = '📥 ' + getOppositeName() + ' — জমা হবে';
  }
  
  const branchSelect = wrap.querySelector('#f_branch');
  if(branchSelect){
    branchSelect.addEventListener('change', () => {
      updateBranchTitles();
      updateSummary();
    });
  }
  updateBranchTitles();
  
  function updateSplitTotals(){
    const splitMain = readNotes(wrap, 'in_main');
    const splitOpp = readNotes(wrap, 'in_opp');
    const changeNotes = readNotes(wrap, 'change_out');
    const totalMain = noteSum(splitMain);
    const totalOpp = noteSum(splitOpp);
    const both = totalMain + totalOpp;
    const changeAmt = noteSum(changeNotes);
    
    if(splitTotalMain) splitTotalMain.textContent = '৳ ' + fmt(totalMain);
    if(splitTotalOpposite) splitTotalOpposite.textContent = '৳ ' + fmt(totalOpp);
    
    const changeTotalEl = wrap.querySelector('#changeTotal');
    if(changeTotalEl) changeTotalEl.textContent = '৳ ' + fmt(changeAmt);
    
    return { totalMain, totalOpp, both, splitMain, splitOpp, changeNotes, changeAmt };
  }
  
  function updateSummary(){
    const splits = updateSplitTotals();
    const received = splits.both;
    const changeAmt = splits.changeAmt;
    const netDeposit = received - changeAmt;
    const mainName = getMainName();
    const oppName = getOppositeName();
    
    if(totalInput){
      if(netDeposit > 0){
        totalInput.value = netDeposit.toLocaleString('en-US', { maximumFractionDigits: 2 });
        totalInput.style.color = '#4ade80';
      } else if(received > 0){
        totalInput.value = received.toLocaleString('en-US', { maximumFractionDigits: 2 });
        totalInput.style.color = '#4ade80';
      } else {
        totalInput.value = '';
      }
    }
    
    if(summaryEl){
      let html = '';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>🏦 ' + esc(mainName) + ':</span><b style="color:#93c5fd;font-size:15px">৳ ' + fmt(splits.totalMain) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>🏦 ' + esc(oppName) + ':</span><b style="color:#4ade80;font-size:15px">৳ ' + fmt(splits.totalOpp) + '</b></div>';
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>📥 দুই আউটলেট মোট:</span><b style="color:#4ade80;font-size:15px">৳ ' + fmt(received) + '</b></div>';
      
      if(changeAmt > 0){
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(250,204,21,.3)"><span>🔄 ফেরত (Change):</span><b style="color:#facc15;font-size:15px">− ৳ ' + fmt(changeAmt) + '</b></div>';
      }
      
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;padding-top:8px;border-top:2px solid rgba(34,197,94,.4)"><span style="font-weight:800;color:#4ade80">💰 Net জমা (auto):</span><b style="color:#4ade80;font-size:18px;font-weight:900">৳ ' + fmt(netDeposit) + '</b></div>';
      
      summaryEl.innerHTML = html;
    }
    
    if(mismatchWarn){
      mismatchWarn.innerHTML = '';
      mismatchWarn.style.display = 'none';
    }
  }
  
  function recalc(){ updateSummary(); }
  
  function showCustomerInfo(acc, name){
    if(!acc || !custInfoEl) return;
    
    const allTxs = getCustomerAllTxs(acc);
    const recTxs = allTxs.filter(t => t.type === 'loan_received' && !t.cancelled);
    const totalRec = recTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    
    custInfoEl.style.display = 'block';
    custInfoEl.innerHTML =
      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(59,130,246,.05));border:1.5px solid rgba(34,197,94,.4)">' +
        '<div style="font-size:12.5px;color:#4ade80;font-weight:800;text-transform:uppercase;margin-bottom:10px">👤 গ্রাহক তথ্য — ' + esc(name || '-') + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;font-size:12.5px">' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(34,197,94,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">📊 মোট লেনদেন</div><div style="color:#fff;font-weight:900;font-size:14px;margin-top:2px">' + toBn(allTxs.length) + ' টি</div></div>' +
          '<div style="padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(34,197,94,.25)"><div style="color:#a5b4d8;font-size:10.5px;font-weight:700">📥 মোট গ্রহণ</div><div style="color:#4ade80;font-weight:900;font-size:14px;margin-top:2px">৳ ' + fmt(totalRec) + '</div></div>' +
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
      
      sg.innerHTML = list.map(c =>
        '<div class="sug-item" data-id="' + c.id + '" data-acc="' + esc(c.accountNo) + '" data-name="' + esc(c.name) + '">' +
          '<b>' + esc(c.name) + '</b> — <small>' + esc(c.accountNo) + '</small>' +
          '<br><small>📱 ' + esc(c.mobile || '-') + '</small>' +
        '</div>'
      ).join('');
      
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
      
      const br = getMainKey();
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
  
  __setupDenomInputs(wrap, 'in_main', () => getMainKey(), recalc);
  __setupDenomInputs(wrap, 'in_opp', () => getOppositeKey(), recalc);
  __setupDenomInputs(wrap, 'change_out', () => getMainKey(), recalc);
  recalc();
  
  // ⚡ History — DEFAULT TODAY
  const histArea = wrap.querySelector('#modalHistoryArea');
  if(histArea){
    let histDate = todayStr(); // ⚡ Default today
    
    function renderHistory(){
      const allRecTxs = getAllTxs().filter(t => t.type === 'loan_received' && !t.cancelled);
      const txsToday = histDate ? allRecTxs.filter(t => t.date === histDate) : allRecTxs;
      const custMap = {};
      
      txsToday.forEach(t => {
        const key = (t.custAcc || '').trim() || (t.custName ? 'name:' + t.custName.trim() : '');
        if(!key) return;
        if(!custMap[key]){
          custMap[key] = {
            acc: t.custAcc || '',
            name: t.custName || 'অজ্ঞাত',
            txs: [],
            totalAmount: 0,
            lastTime: t.createdAt || ''
          };
        }
        custMap[key].txs.push(t);
        custMap[key].totalAmount += Number(t.amount) || 0;
        if((t.createdAt || '') > custMap[key].lastTime){
          custMap[key].lastTime = t.createdAt;
          custMap[key].name = t.custName || custMap[key].name;
          custMap[key].acc = t.custAcc || custMap[key].acc;
        }
      });
      
      const custList = Object.values(custMap).sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''));
      const totalToday = txsToday.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      
      let html = '<div class="modal-history">' +
        '<div class="modal-history-title"><span class="bar"></span> 📋 হিস্টোরি — ' +
          '<input type="date" id="hist_date" value="' + histDate + '" style="padding:6px 10px;border-radius:8px;background:#050810;border:1px solid var(--line-2);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700">' +
          '<button type="button" id="hist_clear" style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-left:6px">সব</button>' +
          '<span class="badge" style="margin-left:auto">' + toBn(txsToday.length) + ' টি • ৳ ' + fmt(totalToday) + '</span>' +
        '</div>';
      
      if(custList.length){
        html += '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th style="width:40px;text-align:center">#</th>' +
          '<th>গ্রাহক</th>' +
          '<th style="text-align:center;width:80px">লেনদেন</th>' +
          '<th style="text-align:right;width:120px">মোট</th>' +
          '<th style="text-align:center;width:110px">অ্যাকশন</th>' +
        '</tr></thead><tbody>';
        
        custList.forEach((c, i) => {
          html += '<tr class="clickable-row" data-cust-acc="' + esc(c.acc) + '" data-cust-name="' + esc(c.name) + '" style="cursor:pointer">' +
            '<td style="text-align:center;color:#7a8ab8;font-weight:800">' + toBn(i + 1) + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:8px">' +
              '<div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(145deg,rgba(34,197,94,.2),rgba(59,130,246,.1));border:1.5px solid rgba(34,197,94,.4);display:grid;place-items:center;flex-shrink:0;font-size:13px">👤</div>' +
              '<div style="min-width:0">' +
                '<div style="color:#4ade80;font-weight:900;font-size:13px">' + esc(c.name) + '</div>' +
                (c.acc ? '<div style="font-size:10.5px;color:#93c5fd;font-family:monospace;font-weight:700">' + esc(c.acc) + '</div>' : '') +
              '</div>' +
            '</div></td>' +
            '<td style="text-align:center"><span style="padding:3px 9px;border-radius:7px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-size:11.5px;font-weight:800">' + toBn(c.txs.length) + ' টি</span></td>' +
            '<td style="text-align:right"><span style="color:#4ade80;font-weight:900;font-size:14px">৳ ' + fmt(c.totalAmount) + '</span></td>' +
            '<td style="text-align:center"><button class="mini show" data-cust-view="' + esc(c.acc) + '" data-cust-view-name="' + esc(c.name) + '">📜</button></td>' +
          '</tr>';
        });
        
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty">📭 এই তারিখে কোনো লেনদেন নেই</div>';
      }
      
      html += '</div>';
      histArea.innerHTML = html;
      
      const dateEl = histArea.querySelector('#hist_date');
      if(dateEl){
        dateEl.addEventListener('change', (e) => {
          histDate = e.target.value;
          renderHistory();
        });
      }
      
      // ⚡ "সব" button
      const clearBtn = histArea.querySelector('#hist_clear');
      if(clearBtn){
        clearBtn.addEventListener('click', () => {
          histDate = '';
          const dEl = histArea.querySelector('#hist_date');
          if(dEl) dEl.value = '';
          renderHistory();
        });
      }
      
      histArea.querySelectorAll('tr[data-cust-acc]').forEach(tr => {
        tr.addEventListener('click', (e) => {
          if(e.target.closest('button')) return;
          const acc = tr.dataset.custAcc, name = tr.dataset.custName;
          if(acc && typeof openCustomerDetailPopup === 'function'){
            openCustomerDetailPopup(acc, name);
          }
        });
      });
      
      histArea.querySelectorAll('[data-cust-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if(btn.dataset.custView && typeof openCustomerDetailPopup === 'function'){
            openCustomerDetailPopup(btn.dataset.custView, btn.dataset.custViewName);
          }
        });
      });
    }
    
    renderHistory();
  }
  
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const mainKey = getMainKey();
    const oppKey = getOppositeKey();
    const splitMain = readNotes(wrap, 'in_main');
    const splitOpp = readNotes(wrap, 'in_opp');
    const changeNotes = readNotes(wrap, 'change_out');
    const totalMain = noteSum(splitMain);
    const totalOpp = noteSum(splitOpp);
    const totalReceived = totalMain + totalOpp;
    const changeAmt = noteSum(changeNotes);
    const netDeposit = totalReceived - changeAmt;
    const allNotesIn = { ...splitMain, ...splitOpp };
    
    if(totalReceived <= 0){
      alert('⚠️ কমপক্ষে একটি আউটলেটে পরিমাণ লিখুন!');
      return;
    }
    
    const custAcc = accEl.value.trim();
    const custName = nameEl.value.trim();
    
    if(!custName || !custAcc){
      alert('⚠️ গ্রাহকের নাম ও অ্যাকাউন্ট দিন');
      return;
    }
    
    const balCheck = checkNegativeBalance(mainKey);
    if(!balCheck.ok) return;
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const branchSplits = [];
      if(Object.keys(splitMain).length > 0){
        branchSplits.push({ branch: mainKey, notesIn: splitMain });
      }
      if(Object.keys(splitOpp).length > 0){
        branchSplits.push({ branch: oppKey, notesIn: splitOpp });
      }
      
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'loan_received',
        date,
        branch: mainKey,
        custBranch: mainKey,
        dir: 'in',
        amount: Math.round((netDeposit > 0 ? netDeposit : totalReceived) * 100) / 100,
        receivedAmount: Math.round(totalReceived * 100) / 100,
        changeAmount: Math.round(changeAmt * 100) / 100,
        netAmount: Math.round(netDeposit * 100) / 100,
        mainBranch: mainKey,
        oppositeBranch: oppKey,
        notesIn: allNotesIn,
        notesOut: {},
        changeNotesOut: changeNotes,
        branchSplits: branchSplits,
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
        branch: mainKey
      });
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new loan received' } : computeTxChanges(editing, tx), tx);
      
      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '📥 ' : '✏️ ') + 'ঋণ গ্রহণ' + (isCreating ? ' তৈরি' : ' আপডেট'),
        detail: custName,
        amount: totalReceived,
        targetId: tx.id
      });
      
      close();
      toast('✅ সংরক্ষিত — ৳ ' + fmt(netDeposit > 0 ? netDeposit : totalReceived));
      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
}

/* ───── END OF FILE tx/tx-loan-received.js ───── */
console.log('✅ Loan Received loaded — v8.1 (today default)');