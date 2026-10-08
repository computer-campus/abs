/* ============ TX: WITHDRAWAL (উত্তোলন) ============ */
'use strict';
function openWithdrawalForm(editId){
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
    '<div class="notes-col out" style="margin-bottom:14px"><h4>💵 গ্রাহককে ক্যাশ</h4>' +
      denomRowHTML('out', editing?.notesOut, vault) +
      '<div class="sum-line"><span>মোট ক্যাশ</span><b id="sum-out">৳ 0.00</b></div></div>' +
    '<div style="padding:14px;border-radius:14px;background:rgba(59,130,246,.06);border:1.5px dashed rgba(59,130,246,.4);margin-bottom:14px">' +
      '<label style="color:#93c5fd;font-size:12px;font-weight:800;text-transform:uppercase">💰 গ্রাহক অ্যাকাউন্ট থেকে (ঐচ্ছিক)</label>' +
      '<input type="text" inputmode="decimal" id="f-acct-amt" value="' + (editing?.customerAccountAmount || '') + '" placeholder="০" style="width:100%;padding:12px 14px;margin-top:8px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:16px;font-weight:700;outline:none">' +
    '</div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note" value="' + esc(editing?.note || '') + '"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">💾 সংরক্ষণ</button></div>';

  openModal({
    title: '💵 নগদ উত্তোলন',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getBranch = () => root.querySelector('#f-branch')?.value || initBranch;
      function recalc(){
        const outN = readNotes(root, 'out');
        const acctAmt = parseNum(root.querySelector('#f-acct-amt').value);
        const cashAmt = sumNotes(outN);
        root.querySelector('#sum-out').textContent = '৳ ' + fmt(cashAmt);
        return { outN, acctAmt, cashAmt, total: cashAmt + acctAmt };
      }
      setupDenomInputs(root, 'out', recalc);
      attachAmountInput(root.querySelector('#f-acct-amt'));
      root.querySelector('#f-acct-amt').addEventListener('input', recalc);
      root.querySelector('#f-search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if(!q) return;
        const c = DB.customers.find(x =>
          String(x.accountNo || '').toLowerCase() === q || String(x.name || '').toLowerCase().includes(q));
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
        const { outN, acctAmt, cashAmt, total } = recalc();
        const branch = getBranch();
        const date = root.querySelector('#f-date').value || todayStr();
        const custAcc = root.querySelector('#f-acc').value.trim();
        const custName = root.querySelector('#f-name').value.trim();
        const custMobile = root.querySelector('#f-mobile').value.trim();
        if(total <= 0){ alert('⚠️ পরিমাণ দিন'); return; }
        if(!custName || !custAcc){ alert('⚠️ গ্রাহক তথ্য দিন'); return; }
        const v = DB.liveVault[branch] || {};
        const miss = [];
        Object.keys(outN).forEach(d => { if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d); });
        if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const tx = {
          id: editing ? editing.id : uid(),
          type: 'withdrawal', date, branch, custBranch: branch, dir: 'out',
          amount: Math.round(total * 100) / 100,
          customerAccountAmount: acctAmt, cashAmount: cashAmt,
          notesOut: outN, notesIn: {},
          custAcc, custName, custMobile,
          note: root.querySelector('#f-note').value.trim(),
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if(!editing) DB.txs.push(tx);
        else { const i = DB.txs.findIndex(x => x.id === editing.id); if(i >= 0) DB.txs[i] = tx; }
        upsertCustomer({ accountNo: custAcc, name: custName, mobile: custMobile, branch });
        logActivity('txn_create', '💵 উত্তোলন', custName, total);
        close();
        toast('✅ সংরক্ষিত — ৳ ' + fmt(total), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Withdrawal');