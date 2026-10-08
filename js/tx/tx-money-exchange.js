/* ============ TX: MONEY EXCHANGE (মানি এক্সচেঞ্জ) ============ */
'use strict';
function openMoneyExchange(editId){
  const isAdmin = SESSION.role === 'admin';
  const initBranch = isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch;
  const vault = DB.liveVault[initBranch] || {};

  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f-date" value="' + DASH_DATE + '"></div>' +
      (isAdmin ?
        '<div class="field"><label>আউটলেট</label><select id="f-branch">' +
          Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '"' + (initBranch === k ? ' selected' : '') + '>' + v.name + '</option>').join('') +
        '</select></div>'
        : '<input type="hidden" id="f-branch" value="' + initBranch + '">') +
    '</div>' +
    '<div class="notes-cols">' +
      '<div class="notes-col out"><h4>💸 প্রদান</h4>' + denomRowHTML('out', null, vault) +
        '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div></div>' +
      '<div class="notes-col in"><h4>📥 গ্রহণ</h4>' + denomRowHTML('in', null, {}) +
        '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div></div>' +
    '</div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">💾 সংরক্ষণ</button></div>';

  openModal({
    title: '💱 মানি এক্সচেঞ্জ',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getBranch = () => root.querySelector('#f-branch')?.value || initBranch;
      function recalc(){
        const outN = readNotes(root, 'out');
        const inN = readNotes(root, 'in');
        root.querySelector('#sum-out').textContent = '৳ ' + fmt(sumNotes(outN));
        root.querySelector('#sum-in').textContent = '৳ ' + fmt(sumNotes(inN));
        return { outN, inN };
      }
      setupDenomInputs(root, 'out', recalc);
      setupDenomInputs(root, 'in', recalc);
      recalc();

      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;
        const { outN, inN } = recalc();
        const branch = getBranch();
        const date = root.querySelector('#f-date').value || todayStr();
        const oSum = sumNotes(outN);
        const iSum = sumNotes(inN);
        if(oSum === 0 && iSum === 0){ alert('⚠️ নোট দিন'); return; }
        const v = DB.liveVault[branch] || {};
        const miss = [];
        Object.keys(outN).forEach(d => { if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d); });
        if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const tx = {
          id: uid(), type: 'money_exchange', date, branch, custBranch: branch, dir: 'exchange',
          amount: Math.round(Math.max(oSum, iSum) * 100) / 100,
          notesOutSum: oSum, notesInSum: iSum,
          notesOut: outN, notesIn: inN,
          note: root.querySelector('#f-note').value.trim() || 'মানি এক্সচেঞ্জ',
          user: SESSION.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        DB.txs.push(tx);
        logActivity('txn_create', '💱 মানি এক্সচেঞ্জ', BRANCHES[branch].name, tx.amount);
        close();
        toast('✅ মানি এক্সচেঞ্জ', 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Money Exchange');