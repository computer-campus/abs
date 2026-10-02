/* ============================================================
   FILE: tx/tx-dispatcher.js
   PURPOSE: Transaction router — openTxModal()
   VERSION: v8.2 — Support Note Fix + History Note Display
   ============================================================ */

'use strict';

function openTxModal(type, editId, prefill){
  if(!session) return;
  
  const cfg = TX_CFG[type];
  if(!cfg){
    toast('❌ Unknown transaction: ' + type);
    return;
  }
  
  if(type === 'customer'){
    if(typeof openCustomerList === 'function') openCustomerList();
    return;
  }
  if(type === 'money_exchange'){
    if(typeof openMoneyExchange === 'function') openMoneyExchange();
    return;
  }
  if(type === 'loan_collection'){
    if(typeof openAllPendingModal === 'function') openAllPendingModal();
    return;
  }
  if(type === 'branch_transfer'){
    if(typeof openBranchTransferForm === 'function') openBranchTransferForm(editId);
    return;
  }
  if(type === 'bank_transfer'){
    if(typeof openBankTransferForm === 'function') openBankTransferForm(editId);
    return;
  }
  if(type === 'loan_given'){
    if(typeof openLoanGivenForm === 'function') openLoanGivenForm(editId, prefill);
    return;
  }
  if(type === 'loan_received'){
    if(typeof openLoanReceivedForm === 'function') openLoanReceivedForm(editId, prefill);
    return;
  }
  if(type === 'withdrawal'){
    if(typeof openWithdrawalForm === 'function') openWithdrawalForm(editId, prefill);
    return;
  }
  
  openGenericTxForm(type, editId, prefill);
}

/* ═══════════════════════════════════════════════════════════
   🔥 GENERIC FORM
   ═══════════════════════════════════════════════════════════ */
function openGenericTxForm(type, editId, prefill){
  const cfg = TX_CFG[type];
  const editing = editId ? getAllTxs().find(t => t.id === editId) : null;
  const isAdminUser = session.role === 'admin';
  
  let baseBranch;
  if(editing) baseBranch = editing.branch;
  else if(isAdminUser) baseBranch = (viewBranch === 'all') ? 'kalaroa' : viewBranch;
  else baseBranch = session.branch || 'kalaroa';
  if(!BRANCHES[baseBranch]) baseBranch = 'kalaroa';
  
  const bcb = editing ? (editing.custBranch || editing.branch) : (isAdminUser ? baseBranch : (BRANCHES[session.branch] ? session.branch : 'kalaroa'));
  const showBT = !!cfg.cust && type !== 'support';
  const activeBranchForForm = bcb;
  const showCust = cfg.cust;
  const showDir = !!cfg.dir;
  const showBank = !!cfg.banks;
  const showOnline = !!cfg.online;
  const showOS = !!cfg.onlineSupport;
  const isBankOnly = !!cfg.bankOnly;
  const isST = type === 'support';
  const initialDir = editing ? editing.dir : (cfg.primary);
  
  const preAcc = editing ? (editing.custAcc || '') : (prefill?.custAcc || '');
  const preName = editing ? (editing.custName || '') : (prefill?.custName || '');
  const preMobile = editing ? (editing.custMobile || '') : (prefill?.custMobile || '');
  const preAddr = editing ? (editing.custAddr || '') : (prefill?.custAddr || '');
  const branchVault = DB().liveVault?.[activeBranchForForm] || {};
  
  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f_date" value="' + (editing ? editing.date : dashDate) + '"></div>' +
      (showBank ? '<div class="field"><label>ব্যাংক</label><select id="f_bank">' + bankOpts(editing ? editing.bank : 'al_arafah_kalaroa') + '</select></div>' : '') +
      (isBankOnly || (!showCust && !isST) ?
        '<div class="field"><label>আউটলেট</label>' +
          (isAdminUser ? '<select id="f_branch">' + branchOpts(baseBranch) + '</select>' : '<input type="text" value="' + BRANCHES[baseBranch].name + '" disabled><input type="hidden" id="f_branch" value="' + baseBranch + '">') +
        '</div>' : '') +
      (showDir ? '<div class="field"><label>ধরন</label><select id="f_dir">' + dirOptions(type, initialDir) + '</select></div>' : '') +
    '</div>' +
    
    (isBankOnly ?
      '<div class="bank-only-box">' +
        '<div class="title">🏛️ ইন্টারনাল অনলাইন ট্রান্সফার</div>' +
        '<div class="field" style="margin-top:8px"><label>💰 পরিমাণ</label><input type="text" inputmode="decimal" id="bt_amount" value="' + (editing?.amount || '') + '" style="color:#a78bfa" autocomplete="off"></div>' +
        '<div class="field"><label>📝 বিবরণ</label><input type="text" id="bt_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
      '</div>'
      : '') +
    
    (showBT ?
      '<div class="cust-branch-toggle">' +
        '<div class="toggle-title">🏦 গ্রাহকের আউটলেট</div>' +
        '<div class="branch-toggle-row">' +
          '<button type="button" class="branch-toggle-btn ' + (activeBranchForForm === 'kalaroa' ? 'active' : '') + '" data-bbranch="kalaroa">কলারোয়া</button>' +
          '<button type="button" class="branch-toggle-btn ' + (activeBranchForForm === 'jhaudanga' ? 'active' : '') + '" data-bbranch="jhaudanga">ঝাউডাঙ্গা</button>' +
        '</div>' +
        '<input type="hidden" id="f_custBranch_hidden" value="' + activeBranchForForm + '">' +
      '</div>'
      : '') +
    
    (showCust ?
      '<div class="cust-box">' +
        '<div class="head"><h4>🔍 গ্রাহক</h4></div>' +
        '<div class="field"><input type="text" id="f_search" placeholder="নাম/অ্যাকাউন্ট/মোবাইল..." value="' + preAcc + '" autocomplete="off"><div class="suggest" id="f_suggest"></div></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f_acc" value="' + preAcc + '" autocomplete="off"></div>' +
          '<div class="field"><label>নাম</label><input type="text" id="f_name" value="' + preName + '" autocomplete="off"></div>' +
          '<div class="field"><label>মোবাইল</label><input type="text" id="f_mobile" value="' + preMobile + '" autocomplete="off"></div>' +
          '<div class="field"><label>ঠিকানা</label><input type="text" id="f_addr" value="' + preAddr + '" autocomplete="off"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">' +
          '<button class="btn gray" type="button" id="f_editCust" style="padding:10px 16px">✏️ সেভ</button>' +
          '<button class="btn pink" type="button" id="f_checkDue" style="padding:10px 16px">⚠️ বকেয়া</button>' +
        '</div>' +
      '</div>'
      : '') +
    
    (showOnline ?
      '<div class="online-box" id="onlineBox">' +
        '<h4>💳 অনলাইন</h4>' +
        '<div class="form-row">' +
          '<div class="field"><label>পরিমাণ</label><input type="text" inputmode="decimal" id="online_amount" value="' + (editing?.onlineAmount || '') + '" autocomplete="off"></div>' +
          '<div class="field"><label>রেফারেন্স</label><input type="text" id="online_ref" value="' + (editing?.onlineRef || '') + '" autocomplete="off"></div>' +
        '</div>' +
      '</div>'
      : '') +
    
    (showOS ?
      '<div class="online-box" id="onlineSupportBox">' +
        '<h4>🌐 অনলাইন সাপোর্ট</h4>' +
        '<div class="form-row">' +
          '<div class="field"><label>পরিমাণ</label><input type="text" inputmode="decimal" id="support_amount" value="' + (editing?.onlineAmount || editing?.amount || '') + '" autocomplete="off"></div>' +
        '</div>' +
        '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="support_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
      '</div>'
      : '') +
    
    (!isBankOnly ?
      '<div class="notes-cols" id="notesCols">' +
        '<div class="notes-col out" id="outCol">' +
          '<h4>💸 প্রদান</h4>' +
          notesRowHTML('out', editing?.notesOut || null, branchVault) +
          '<div class="sum-line"><span>মোট</span><b id="sumOut">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in" id="inCol">' +
          '<h4>📥 গ্রহণ</h4>' +
          notesRowHTML('in', editing?.notesIn || null, {}) +
          '<div class="sum-line"><span>মোট</span><b id="sumIn">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
      '<div id="noteAvailabilityWarning" style="margin-top:10px;display:none"></div>' +
      '<div class="total-preview"><div class="l">নেট</div><div class="v" id="netAmt">৳ 0.00</div></div>' +
      '<div style="margin-top:14px;padding:14px 16px;border-radius:16px;background:linear-gradient(145deg,#080c1a,#050810);border:1px solid rgba(59,130,246,.22);font-size:13px;color:#a5b4d8;line-height:1.9">' +
        '<div style="font-size:12px;color:#93c5fd;font-weight:700;margin-bottom:6px;text-transform:uppercase">🧾 বিবরণী</div>' +
        '<div id="noteDetailContent">—</div>' +
      '</div>'
      : '') +
    
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label><input type="text" id="f_note" value="' + (editing?.note || '') + '" autocomplete="off"></div>' +
    
    '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
      '<button class="btn green" id="f_save" style="flex:1;min-width:160px">💾 সংরক্ষণ</button>' +
    '</div>' +
    
    '<div id="modalHistoryArea"></div>';
  
  openModal({
    title: (cfg.icon || '') + ' ' + cfg.title,
    bodyHTML: body,
    wide: true,
    onMount: (w, close) => setupGenericTxForm(w, type, editing, close, activeBranchForForm)
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 SETUP GENERIC FORM
   ═══════════════════════════════════════════════════════════ */
function setupGenericTxForm(wrap, type, editing, close, activeBranchForForm){
  const cfg = TX_CFG[type];
  const so = wrap.querySelector('#sumOut');
  const si = wrap.querySelector('#sumIn');
  const ne = wrap.querySelector('#netAmt');
  const nb = wrap.querySelector('#noteDetailContent');
  const hasDir = !!cfg.dir;
  const hasBT = !!cfg.cust && type !== 'support';
  const isBO = !!cfg.bankOnly;
  
  const isOS = () => {
    const d = wrap.querySelector('#f_dir')?.value;
    return d === 'online_support_out' || d === 'online_support_in';
  };
  const isOn = () => {
    const d = wrap.querySelector('#f_dir')?.value;
    return d === 'online_in' || d === 'online_out';
  };
  const getBranchKey = () => {
    const b = wrap.querySelector('#f_branch');
    if(b) return b.value;
    const h = wrap.querySelector('#f_custBranch_hidden');
    if(h) return h.value;
    return session.role === 'admin' ? (viewBranch === 'all' ? 'kalaroa' : viewBranch) : session.branch;
  };
  
  wrap.querySelectorAll('input[type="text"][inputmode="decimal"]').forEach(inp => {
    attachAmountInput(inp, { decimal: true });
  });
  
  if(hasBT){
    wrap.querySelectorAll('.branch-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.branch-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        wrap.querySelector('#f_custBranch_hidden').value = btn.dataset.bbranch;
        updateVaultStock(wrap, 'out', getBranchKey());
        recalc();
      });
    });
  }
  
  if(hasDir){
    const dirEl = wrap.querySelector('#f_dir');
    function applyDir(){
      const d = dirEl.value;
      const nc = wrap.querySelector('#notesCols');
      const ob = wrap.querySelector('#onlineBox');
      const osb = wrap.querySelector('#onlineSupportBox');
      const isOSv = d === 'online_support_out' || d === 'online_support_in';
      const isOv = d === 'online_in' || d === 'online_out';
      
      if(nc) nc.style.display = (isOSv || isOv) ? 'none' : 'grid';
      if(ob) ob.classList.toggle('active', isOv);
      if(osb) osb.classList.toggle('active', isOSv);
      
          // ⚡ Sync note fields — always mirror values
      if(type === 'support'){
        const sn = wrap.querySelector('#support_note');
        const fn = wrap.querySelector('#f_note');
        if(sn && fn){
          // Live sync: whichever has value
          if(isOSv){
            // Switching to online — copy f_note → support_note if support_note empty
            if(!sn.value && fn.value){
              sn.value = fn.value;
            }
          } else {
            // Switching to physical — copy support_note → f_note if f_note empty
            if(!fn.value && sn.value){
              fn.value = sn.value;
            }
          }
        }
      }
      
      recalc();
    }
    dirEl.addEventListener('change', applyDir);
    applyDir();
  }
  
  function recalc(){
    if(isBO){
      const v = parseNum(wrap.querySelector('#bt_amount')?.value);
      if(ne) ne.textContent = '৳ ' + fmt(v);
      return;
    }
    
    const on = readNotes(wrap, 'out');
    const inN = readNotes(wrap, 'in');
    const os = noteSum(on);
    const is = noteSum(inN);
    
    if(so) so.textContent = '৳ ' + fmt(os);
    if(si) si.textContent = '৳ ' + fmt(is);
    
    if(isOS()){
      const v = parseNum(wrap.querySelector('#support_amount')?.value);
      if(ne) ne.textContent = '৳ ' + fmt(v);
    } else if(isOn()){
      const v = parseNum(wrap.querySelector('#online_amount')?.value);
      if(ne) ne.textContent = '৳ ' + fmt(v);
    } else {
      if(ne) ne.textContent = '৳ ' + fmt(Math.abs(os - is));
    }
    
    let html = '';
    if(Object.keys(on).length) html += '<div style="margin-bottom:6px"><b style="color:#fff">📤</b> ' + noteDetailHTML(on) + '</div>';
    if(Object.keys(inN).length) html += '<div><b style="color:#fff">📥</b> ' + noteDetailHTML(inN) + '</div>';
    if(nb) nb.innerHTML = html || '—';
    
    const wb = wrap.querySelector('#noteAvailabilityWarning');
    if(wb){
      const vb = getBranchKey();
      const vault = DB().liveVault?.[vb] || {};
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
  }
  
  __setupDenomInputs(wrap, 'out', getBranchKey, recalc);
  __setupDenomInputs(wrap, 'in', getBranchKey, recalc);
  updateVaultStock(wrap, 'out', getBranchKey());
  updateVaultStock(wrap, 'in', getBranchKey());
  recalc();
  
  // ⚡ HISTORY — Today default + Note display
  const area = wrap.querySelector('#modalHistoryArea');
  if(area){
    let histDate = todayStr();
    
    function renderHistory(){
      const allTypeTxs = getAllTxs().filter(t => t.type === type && !t.cancelled);
      const txsToday = histDate ? allTypeTxs.filter(t => t.date === histDate) : allTypeTxs;
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
            lastTime: t.createdAt || '',
            notes: [] // ⚡ Collect notes
          };
        }
        custMap[key].txs.push(t);
        custMap[key].totalAmount += Number(t.amount) || 0;
        // ⚡ Collect note
        if(t.note && String(t.note).trim()){
          custMap[key].notes.push(String(t.note).trim());
        }
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
          // ⚡ Note display (max 2)
          let noteHtml = '';
          if(c.notes.length){
            const shownNotes = c.notes.slice(-2);
            noteHtml = shownNotes.map(n =>
              '<div style="font-size:10.5px;color:#a5b4d8;margin-top:3px;font-style:italic;padding:3px 6px;border-radius:5px;background:rgba(59,130,246,.08)">📝 ' + esc(n) + '</div>'
            ).join('');
          }
          
          html += '<tr class="clickable-row" data-cust-acc="' + esc(c.acc) + '" data-cust-name="' + esc(c.name) + '" style="cursor:pointer">' +
            '<td style="text-align:center;color:#7a8ab8;font-weight:800">' + toBn(i + 1) + '</td>' +
            '<td><div style="display:flex;align-items:center;gap:8px">' +
              '<div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(145deg,rgba(236,72,153,.2),rgba(167,139,250,.1));border:1.5px solid rgba(236,72,153,.4);display:grid;place-items:center;flex-shrink:0;font-size:13px">👤</div>' +
              '<div style="min-width:0;flex:1">' +
                '<div style="color:#ec4899;font-weight:900;font-size:13px">' + esc(c.name) + '</div>' +
                (c.acc ? '<div style="font-size:10.5px;color:#93c5fd;font-family:monospace;font-weight:700">' + esc(c.acc) + '</div>' : '') +
                noteHtml +
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
      area.innerHTML = html;
      
      const dateEl = area.querySelector('#hist_date');
      if(dateEl){
        dateEl.addEventListener('change', (e) => {
          histDate = e.target.value;
          renderHistory();
        });
      }
      
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
  
  // ⚡ Live sync between support_note and f_note
  if(type === 'support'){
    setTimeout(() => {
      const sn = wrap.querySelector('#support_note');
      const fn = wrap.querySelector('#f_note');
      
      if(sn && fn){
        // When typing in support_note → mirror to f_note
        if(!sn.__synced){
          sn.__synced = true;
          sn.addEventListener('input', () => {
            fn.value = sn.value;
          });
        }
        
        // When typing in f_note → mirror to support_note
        if(!fn.__synced){
          fn.__synced = true;
          fn.addEventListener('input', () => {
            const snEl = wrap.querySelector('#support_note');
            if(snEl) snEl.value = fn.value;
          });
        }
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
          wrap.querySelector('#f_acc').value = c.accountNo;
          wrap.querySelector('#f_name').value = c.name;
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
      const acc = wrap.querySelector('#f_acc').value.trim();
      const name = wrap.querySelector('#f_name').value.trim();
      if(!acc && !name) return;
      
      const hb = wrap.querySelector('#f_custBranch_hidden');
      const br = hb?.value || 'kalaroa';
      
      upsertCustomer({
        accountNo: acc,
        name,
        mobile: wrap.querySelector('#f_mobile').value.trim(),
        address: wrap.querySelector('#f_addr').value.trim(),
        branch: br
      });
      await saveDB();
      toast('✅ সেভ');
    });
  }
  
  const cd = wrap.querySelector('#f_checkDue');
  if(cd){
    cd.addEventListener('click', () => {
      const acc = wrap.querySelector('#f_acc').value.trim();
      if(!acc){ toast('⚠️ অ্যাকাউন্ট দিন'); return; }
      const c = DB().customers.find(x => x.accountNo === acc);
      if(c) openCustomerDetailPopup(c.accountNo, c.name);
      else toast('ℹ️ নেই');
    });
  }
  
  wrap.querySelector('#f_save').addEventListener('click', async () => {
    const sBtn = wrap.querySelector('#f_save');
    if(sBtn.disabled) return;
    
    const date = wrap.querySelector('#f_date').value || todayStr();
    const on = isBO ? {} : readNotes(wrap, 'out');
    const inN = isBO ? {} : readNotes(wrap, 'in');
    const os = noteSum(on);
    const is = noteSum(inN);
    const dir = wrap.querySelector('#f_dir')?.value || null;
    const osL = isOS();
    const onL = isOn();
    
    const _anyNote = Object.keys(on).length > 0 || Object.keys(inN).length > 0;
    const _anySpecial = (isBO && parseNum(wrap.querySelector('#bt_amount')?.value) > 0) ||
      (osL && parseNum(wrap.querySelector('#support_amount')?.value) > 0) ||
      (onL && parseNum(wrap.querySelector('#online_amount')?.value) > 0);
    
    if(!_anyNote && !_anySpecial){ sorryNoNote(); return; }
    
    let osA = 0, onA = 0;
    if(osL){
      osA = parseNum(wrap.querySelector('#support_amount')?.value);
      if(osA <= 0){ alert('পরিমাণ দিন'); return; }
    }
    if(onL){
      onA = parseNum(wrap.querySelector('#online_amount')?.value);
      if(onA <= 0){ alert('পরিমাণ দিন'); return; }
    }
    
    let btA = 0;
    if(isBO){
      btA = parseNum(wrap.querySelector('#bt_amount')?.value);
      if(btA <= 0){ alert('পরিমাণ দিন'); return; }
    }
    
    let tB, cB;
    if(type === 'support' || hasBT){
      const hb = wrap.querySelector('#f_custBranch_hidden');
      const br = hb?.value || (session.role === 'admin' ? (viewBranch === 'all' ? 'kalaroa' : viewBranch) : session.branch);
      tB = BRANCHES[br] ? br : 'kalaroa';
      cB = tB;
    } else {
      const bs = wrap.querySelector('#f_branch');
      if(bs?.value && BRANCHES[bs.value]) tB = bs.value;
      else tB = session.role !== 'admin' ? session.branch : 'kalaroa';
      cB = tB;
    }
    
    const bk = wrap.querySelector('#f_bank')?.value || null;
    
    let tA;
    if(isBO) tA = btA;
    else if(osL) tA = osA;
    else if(onL) tA = onA;
    else if(type === 'support') tA = Math.abs(os - is);
    else if(dir === 'in') tA = is;
    else if(dir === 'out') tA = os;
    else tA = Math.abs(os - is);
    
    const balCheck = checkNegativeBalance(tB);
    if(!balCheck.ok) return;
    
    if(!isBO && !editing){
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
        alert('🚫 ভল্টে পর্যাপ্ত নোট নেই!\n\n' + details + '\n\n📌 Modal বন্ধ করা হয়নি।');
        return;
      }
    }
    
        /* ⚡⚡ FIX: Read note from ALL possible fields ⚡⚡ */
    let noteValue = '';
    const fNoteVal = wrap.querySelector('#f_note')?.value.trim() || '';
    const supportNoteVal = wrap.querySelector('#support_note')?.value.trim() || '';
    
    if(type === 'support'){
      // Support: check both fields, use whichever has value
      // If both, concatenate unique values
      if(supportNoteVal && fNoteVal){
        noteValue = supportNoteVal === fNoteVal ? supportNoteVal : (supportNoteVal + ' | ' + fNoteVal);
      } else {
        noteValue = supportNoteVal || fNoteVal;
      }
    } else {
      noteValue = fNoteVal;
    }
    
    console.log('📝 Note read:', { type, fNoteVal, supportNoteVal, noteValue });
    
    sBtn.disabled = true;
    const orig = sBtn.innerHTML;
    sBtn.innerHTML = '<span class="spinner"></span>';
    
    try{
      const tx = {
        id: editing ? editing.id : uid(),
        type,
        date,
        branch: tB,
        custBranch: cB,
        bank: bk,
        dir,
        amount: Math.round(tA * 100) / 100,
        onlineAmount: (onL || osL) ? Math.round(tA * 100) / 100 : null,
        notesOut: osL ? {} : on,
        notesIn: osL ? {} : inN,
        custAcc: wrap.querySelector('#f_acc')?.value.trim() || '',
        custName: wrap.querySelector('#f_name')?.value.trim() || '',
        custMobile: wrap.querySelector('#f_mobile')?.value.trim() || '',
        custAddr: wrap.querySelector('#f_addr')?.value.trim() || '',
        note: noteValue,
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
      
      if(cfg.cust && (tx.custAcc || tx.custName)){
        const c = upsertCustomer({
          accountNo: tx.custAcc,
          name: tx.custName,
          mobile: tx.custMobile,
          address: tx.custAddr,
          branch: cB
        });
        if(c) tx.custAcc = c.accountNo;
      }
      
      if(type === 'support' && tx.custAcc){
        updateCustomerDueInDB(tx.custAcc, false);
      }
      
      addTxLog(tx.id, isCreating ? 'create' : 'update',
        isCreating ? { action: 'new transaction' } : computeTxChanges(editing, tx), tx);
      
      addActivityLog({
        type: isCreating ? 'txn_create' : 'txn_update',
        title: (isCreating ? '💸 ' : '✏️ ') + (cfg.title || type) + (isCreating ? ' তৈরি' : ' আপডেট'),
        detail: tx.custName || '',
        amount: tA,
        targetId: tx.id
      });
      
      close();
      toast('✅ সংরক্ষিত — ৳ ' + fmt(tA));
      await afterTxSave(tx, isCreating);
    } catch(e){
      alert('❌ ' + e.message);
      sBtn.disabled = false;
      sBtn.innerHTML = orig;
    }
  });
}

/* ───── END OF FILE tx/tx-dispatcher.js ───── */
console.log('✅ TX Dispatcher loaded — v8.2 (support note fixed)');