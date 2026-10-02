/* ============================================================
   FILE: tx/tx-withdrawal.js
   PURPOSE: 💵 উত্তোলন (Customer Account + Cash)
   VERSION: v8.1 — History Calendar Default Today
   ============================================================ */

'use strict';

function openWithdrawalForm(editId, prefill){
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
  const initAcctAmt = editing ? (Number(editing.customerAccountAmount) || 0) : 0;
  const branchVault = DB().liveVault?.[baseBranch] || {};
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>📅 তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      (isAdminUser ?
        '<div class="field"><label>🏦 আউটলেট</label><select id="f_branch">' + branchOpts(baseBranch) + '</select></div>'
        : '<input type="hidden" id="f_branch" value="' + baseBranch + '">') +
    '</div>' +
    
    '<div class="cust-box">' +
      '<div class="head"><h4>🔍 গ্রাহক</h4></div>' +
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
    '</div>' +
    
    '<div class="notes-col out" style="margin-bottom:14px">' +
      '<h4>💵 গ্রাহক ক্যাশ দিল</h4>' +
      notesRowHTML('out', editing?.notesOut || null, branchVault) +
      '<div class="sum-line"><span>মোট ক্যাশ</span><b id="sumOut">৳ 0.00</b></div>' +
    '</div>' +
    
    '<div id="noteAvailabilityWarning" style="margin-top:10px;display:none"></div>' +
    
    '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.06),rgba(0,0,0,.3));border:1.5px dashed rgba(59,130,246,.4);margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">💰</span><span style="font-size:13px;font-weight:800;color:#93c5fd">গ্রাহক অ্যাকাউন্ট থেকে (ঐচ্ছিক)</span></div>' +
        '<span style="font-size:11px;color:#7a8ab8;padding:3px 8px;border-radius:6px;background:rgba(122,138,184,.15)">বেশিরভাগ ক্ষেত্রে খালি</span>' +
      '</div>' +
      '<div class="field" style="margin-bottom:0">' +
        '<input type="text" inputmode="decimal" id="f_acct_amount" value="' + (initAcctAmt ? initAcctAmt.toLocaleString('en-US') : '') + '" placeholder="০" style="color:#93c5fd;font-weight:800;font-size:16px" autocomplete="off">' +
        '<div style="font-size:11px;color:#7a8ab8;margin-top:4px;font-weight:600">💡 শুধু গ্রাহকের অ্যাকাউন্ট থেকে টাকা তুললে এখানে লিখুন</div>' +
      '</div>' +
    '</div>' +
    
    '<div id="withdrawalSummary" style="padding:14px;border-radius:14px;background:rgba(0,0,0,.4);border:1px solid rgba(34,197,94,.3);margin-bottom:14px;font-size:13px;color:#e0eaff;line-height:2"></div>' +
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label><input type="text" id="f_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn green" id="f_save" style="flex:1;min-width:160px">💾 সংরক্ষণ</button></div>' +
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: '💵 উত্তোলন',
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupWithdrawalForm(w, editing, close, baseBranch)
  });
}

function setupWithdrawalForm(wrap, editing, close, defaultBranch){
  const acctInput = wrap.querySelector('#f_acct_amount');
  const summaryEl = wrap.querySelector('#withdrawalSummary');
  const accEl = wrap.querySelector('#f_acc');
  const nameEl = wrap.querySelector('#f_name');
  const so = wrap.querySelector('#sumOut');
  
  if(acctInput) attachAmountInput(acctInput, { decimal: true });
  
  const getAcct = () => parseNum(acctInput?.value);
  const getBranchKey = () => {
    const b = wrap.querySelector('#f_branch');
    return b?.value || defaultBranch;
  };
  
  function updateSummary(){
    const acctAmt = getAcct();
    const cashAmt = noteSum(readNotes(wrap, 'out'));
    const totalAmt = acctAmt + cashAmt;
    
    if(so) so.textContent = '৳ ' + fmt(cashAmt);
    
    if(summaryEl){
      let html = '';
      if(cashAmt > 0){
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>💵 গ্রাহকের ক্যাশ:</span><b style="color:#4ade80;font-size:15px">৳ ' + fmt(cashAmt) + '</b></div>';
      }
      if(acctAmt > 0){
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.08)"><span>💰 গ্রাহক অ্যাকাউন্ট:</span><b style="color:#93c5fd;font-size:15px">৳ ' + fmt(acctAmt) + '</b></div>';
      }
      if(cashAmt > 0 || acctAmt > 0){
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;padding-top:8px;border-top:2px solid rgba(34,197,94,.4)"><span style="font-weight:800;color:#4ade80">💰 মোট জমা হবে:</span><b style="color:#4ade80;font-size:18px;font-weight:900">৳ ' + fmt(totalAmt) + '</b></div>';
      } else {
        html += '<div style="text-align:center;color:#7a8ab8;font-size:12px">💡 ক্যাশ বা অ্যাকাউন্ট — কমপক্ষে একটি দিন</div>';
      }
      summaryEl.innerHTML = html;
    }
  }
  
  function recalc(){ updateSummary(); }
  
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
        });
      });
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
  updateVaultStock(wrap, 'out', getBranchKey());
  if(acctInput) acctInput.addEventListener('input', recalc);
  recalc();
  
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const branchEl = wrap.querySelector('#f_branch');
    const tB = branchEl?.value || defaultBranch;
    const on = readNotes(wrap, 'out');
    const acctAmt = getAcct();
    const cashAmt = noteSum(on);
    const totalAmt = acctAmt + cashAmt;
    
    if(acctAmt <= 0 && cashAmt <= 0){
      alert('⚠️ কমপক্ষে একটি সোর্স দিন!');
      return;
    }
    
    const custAcc = accEl.value.trim();
    const custName = nameEl.value.trim();
    
    if(!custName || !custAcc){
      alert('⚠️ গ্রাহকের নাম ও অ্যাকাউন্ট দিন');
      return;
    }
    
    const balCheck = checkNegativeBalance(tB);
    if(!balCheck.ok) return;
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const tx = {
        id: editing ? editing.id : uid(),
        type: 'withdrawal',
        date,
        branch: tB,
        custBranch: tB,
        dir: 'out',
        amount: Math.round(totalAmt * 100) / 100,
        customerAccountAmount: acctAmt > 0 ? Math.round(acctAmt * 100) / 100 : 0,
        cashAmount: cashAmt > 0 ? Math.round(cashAmt * 100) / 100 : 0,
        notesOut: on,
        notesIn: {},
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
        branch: tB
      });
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new withdrawal' } : computeTxChanges(editing, tx), tx);
      
      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '💵 ' : '✏️ ') + 'উত্তোলন' + (isCreating ? ' তৈরি' : ' আপডেট'),
        detail: custName,
        amount: totalAmt,
        targetId: tx.id
      });
      
      close();
      toast('✅ সংরক্ষিত — ৳ ' + fmt(totalAmt));
      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
  
  // ⚡ History — DEFAULT TODAY
  const area = wrap.querySelector('#modalHistoryArea');
  if(area){
    let histDate = todayStr(); // ⚡ Default today
    
    function renderHistory(){
      const allWdTxs = getAllTxs().filter(t => t.type === 'withdrawal' && !t.cancelled);
      const txsFiltered = histDate ? allWdTxs.filter(t => t.date === histDate) : allWdTxs;
      const custMap = {};
      
      txsFiltered.forEach(t => {
        const key = (t.custAcc || '').trim() || (t.custName ? 'name:' + t.custName.trim() : '');
        if(!key) return;
        if(!custMap[key]){
          custMap[key] = { acc: t.custAcc || '', name: t.custName || 'অজ্ঞাত', txs: [], totalAmount: 0, lastTime: t.createdAt || '' };
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
      const totalToday = txsFiltered.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      
      let html = '<div class="modal-history">' +
        '<div class="modal-history-title"><span class="bar"></span> 📋 হিস্টোরি — ' +
          '<input type="date" id="hist_date" value="' + histDate + '" style="padding:6px 10px;border-radius:8px;background:#050810;border:1px solid var(--line-2);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700">' +
          '<button type="button" id="hist_clear" style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-left:6px">সব</button>' +
          '<span class="badge" style="margin-left:auto">' + toBn(txsFiltered.length) + ' টি • ৳ ' + fmt(totalToday) + '</span>' +
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
              '<div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(145deg,rgba(59,130,246,.2),rgba(167,139,250,.1));border:1.5px solid rgba(59,130,246,.4);display:grid;place-items:center;flex-shrink:0;font-size:13px">👤</div>' +
              '<div style="min-width:0">' +
                '<div style="color:#60a5fa;font-weight:900;font-size:13px">' + esc(c.name) + '</div>' +
                (c.acc ? '<div style="font-size:10.5px;color:#93c5fd;font-family:monospace;font-weight:700">' + esc(c.acc) + '</div>' : '') +
              '</div>' +
            '</div></td>' +
            '<td style="text-align:center"><span style="padding:3px 9px;border-radius:7px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-size:11.5px;font-weight:800">' + toBn(c.txs.length) + ' টি</span></td>' +
            '<td style="text-align:right"><span style="color:#60a5fa;font-weight:900;font-size:14px">৳ ' + fmt(c.totalAmount) + '</span></td>' +
            '<td style="text-align:center"><button class="mini show" data-cust-view="' + esc(c.acc) + '" data-cust-view-name="' + esc(c.name) + '">📜</button></td>' +
          '</tr>';
        });
        
        html += '</tbody></table></div>';
      } else {
        html += '<div class="empty">📭 এই তারিখে কোনো লেনদেন নেই</div>';
      }
      
      html += '</div>';
      area.innerHTML = html;
      
      const dateEl = area.querySelector('#hist_date');
      if(dateEl){
        dateEl.addEventListener('change', (e) => {
          histDate = e.target.value;
          renderHistory();
        });
      }
      
      // ⚡ "সব" button
      const clearBtn = area.querySelector('#hist_clear');
      if(clearBtn){
        clearBtn.addEventListener('click', () => {
          histDate = '';
          const dEl = area.querySelector('#hist_date');
          if(dEl) dEl.value = '';
          renderHistory();
        });
      }
      
      area.querySelectorAll('tr[data-cust-acc]').forEach(tr => {
        tr.addEventListener('click', (e) => {
          if(e.target.closest('button')) return;
          const acc = tr.dataset.custAcc, name = tr.dataset.custName;
          if(acc && typeof openCustomerDetailPopup === 'function'){
            openCustomerDetailPopup(acc, name);
          }
        });
      });
      
      area.querySelectorAll('[data-cust-view]').forEach(btn => {
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
}

/* ───── END OF FILE tx/tx-withdrawal.js ───── */
console.log('✅ Withdrawal loaded — v8.1 (today default)');