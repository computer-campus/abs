/* ============ TX: LOAN GIVEN (ঋণ বিতরণ) ============ */
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
    '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.08),rgba(34,197,94,.03));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
      '<div class="form-row">' +
        '<div class="field"><label style="color:#93c5fd">🏦 মূল ঋণ <span style="color:#f87171">*</span></label>' +
          '<input type="text" inputmode="decimal" id="f-total" value="' + (editing?.amount || '') + '" placeholder="0" style="color:#93c5fd;font-weight:900;font-size:17px"></div>' +
        '<div class="field"><label style="color:#c4b5fd">🌐 অনলাইন (ঐচ্ছিক)</label>' +
          '<input type="text" inputmode="decimal" id="f-online" value="' + (editing?.onlineAmount || '') + '" placeholder="0" style="color:#c4b5fd;font-weight:800"></div>' +
      '</div>' +
      '<div class="field"><label style="color:#c4b5fd">ব্যাংকের নাম (ঐচ্ছিক)</label>' +
        '<input type="text" id="f-bankname" value="' + esc(editing?.onlineBankName || '') + '"></div>' +
      '<div id="loan-summary" style="margin-top:10px;padding:12px;border-radius:11px;background:rgba(0,0,0,.4);border:1px solid rgba(59,130,246,.25);font-size:13px;color:#e0eaff;line-height:1.9"></div>' +
    '</div>' +
    '<div class="notes-col out" style="margin-bottom:14px"><h4>💸 ক্যাশ প্রদান</h4>' +
      denomRowHTML('out', editing?.notesOut, vault) +
      '<div class="sum-line"><span>মোট ক্যাশ</span><b id="sum-out">৳ 0.00</b></div></div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note" value="' + esc(editing?.note || '') + '"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">💾 সংরক্ষণ</button></div>';

  openModal({
    title: '💸 ঋণের টাকা বিতরণ',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getBranch = () => root.querySelector('#f-branch')?.value || initBranch;
      function recalc(){
        const total = parseNum(root.querySelector('#f-total').value);
        const online = parseNum(root.querySelector('#f-online').value);
        const outN = readNotes(root, 'out');
        const cash = sumNotes(outN);
        const notTaken = Math.max(0, total - online - cash);
        const over = (online + cash) > total + 0.01;
        root.querySelector('#sum-out').textContent = '৳ ' + fmt(cash);
        const el = root.querySelector('#loan-summary');
        let html = '';
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>মোট ঋণ:</span><b style="color:#93c5fd">৳ ' + fmt(total) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>− অনলাইন:</span><b style="color:#c4b5fd">৳ ' + fmt(online) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>− ক্যাশ:</span><b style="color:#facc15">৳ ' + fmt(cash) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;border-top:2px solid rgba(250,204,21,.4)"><span style="font-weight:900;color:#facc15">💰 ক্যাশ নেয়নি:</span><b style="color:#facc15;font-size:16px">৳ ' + fmt(notTaken) + '</b></div>';
        if(over) html += '<div style="margin-top:8px;padding:8px;border-radius:8px;background:rgba(220,38,38,.15);color:#f87171;font-weight:900;text-align:center">🚨 অতিরিক্ত!</div>';
        el.innerHTML = html;
        return { total, online, outN, cash, notTaken, over };
      }
      setupDenomInputs(root, 'out', recalc);
      attachAmountInput(root.querySelector('#f-total'));
      attachAmountInput(root.querySelector('#f-online'));
      root.querySelector('#f-total').addEventListener('input', recalc);
      root.querySelector('#f-online').addEventListener('input', recalc);
      root.querySelector('#f-search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if(!q) return;
        const c = DB.customers.find(x => String(x.accountNo || '').toLowerCase() === q || String(x.name || '').toLowerCase().includes(q));
        if(c){
          root.querySelector('#f-acc').value = c.accountNo || '';
          root.querySelector('#f-name').value = c.name || '';
          root.querySelector('#f-mobile').value = c.mobile || '';
        }
      });
      recalc();

      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;
        const { total, online, outN, cash, notTaken, over } = recalc();
        const branch = getBranch();
        const date = root.querySelector('#f-date').value || todayStr();
        const custAcc = root.querySelector('#f-acc').value.trim();
        const custName = root.querySelector('#f-name').value.trim();
        const custMobile = root.querySelector('#f-mobile').value.trim();
        if(total <= 0){ alert('⚠️ মূল ঋণ দিন'); return; }
        if(over){ alert('⚠️ অনলাইন + ক্যাশ > মোট'); return; }
        if(!custName || !custAcc){ alert('⚠️ গ্রাহক তথ্য দিন'); return; }
        const v = DB.liveVault[branch] || {};
        const miss = [];
        Object.keys(outN).forEach(d => { if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d); });
        if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const tx = {
          id: editing ? editing.id : uid(),
          type: 'loan_given', date, branch, custBranch: branch, dir: 'out',
          amount: Math.round(total * 100) / 100,
          onlineAmount: online > 0 ? online : null,
          onlineBankName: root.querySelector('#f-bankname').value.trim(),
          cashAmount: Math.round(cash * 100) / 100,
          cashNotTaken: notTaken > 0.01,
          cashNotTakenAmount: notTaken > 0.01 ? Math.round(notTaken * 100) / 100 : null,
          notesOut: outN, notesIn: {},
          custAcc, custName, custMobile,
          note: root.querySelector('#f-note').value.trim(),
          collectionStatus: notTaken > 0.01 ? 'pending' : null,
          collectedAmount: 0,
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if(!editing) DB.txs.push(tx);
        else { const i = DB.txs.findIndex(x => x.id === editing.id); if(i >= 0) DB.txs[i] = tx; }
        upsertCustomer({ accountNo: custAcc, name: custName, mobile: custMobile, branch });
        logActivity('txn_create', '💸 ঋণ বিতরণ', custName, total);
        close();
        toast('✅ সংরক্ষিত — ৳ ' + fmt(total), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Loan Given');