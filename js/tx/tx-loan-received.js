/* ============ TX: LOAN RECEIVED (ঋণ গ্রহণ) ============ */
'use strict';
function openLoanReceivedForm(editId){
  const editing = editId ? DB.txs.find(t => t.id === editId) : null;
  const isAdmin = SESSION.role === 'admin';
  const mainB = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  const oppB = mainB === 'kalaroa' ? 'jhaudanga' : 'kalaroa';
  const splits = editing?.branchSplits || [];
  const mainNotes = splits.find(s => s.branch === mainB)?.notesIn || {};
  const oppNotes = splits.find(s => s.branch === oppB)?.notesIn || {};
  const changeNotes = editing?.changeNotesOut || {};

  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '"></div>' +
      (isAdmin ?
        '<div class="field"><label>মূল আউটলেট</label><select id="f-branch">' +
          Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '"' + (mainB === k ? ' selected' : '') + '>' + v.name + '</option>').join('') +
        '</select></div>'
        : '<input type="hidden" id="f-branch" value="' + mainB + '">') +
    '</div>' +
    '<div class="field"><label>গ্রাহক</label><input type="text" id="f-search" placeholder="নাম/অ্যাকাউন্ট" value="' + esc(editing?.custAcc || '') + '"></div>' +
    '<div class="form-row">' +
      '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f-acc" value="' + esc(editing?.custAcc || '') + '"></div>' +
      '<div class="field"><label>নাম</label><input type="text" id="f-name" value="' + esc(editing?.custName || '') + '"></div>' +
    '</div>' +
    '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(167,139,250,.06),rgba(59,130,246,.04));border:1.5px solid rgba(167,139,250,.4);margin-bottom:14px">' +
      '<div class="form-row">' +
        '<div class="field"><label style="color:#c4b5fd">🌐 অনলাইন (ঐচ্ছিক)</label>' +
          '<input type="text" inputmode="decimal" id="f-online" value="' + (editing?.onlineAmount || '') + '" placeholder="0" style="color:#c4b5fd;font-weight:800"></div>' +
        '<div class="field"><label>Net জমা (auto)</label>' +
          '<input type="text" id="f-total" readonly value="" style="color:#4ade80;font-weight:900;font-size:18px;cursor:not-allowed"></div>' +
      '</div>' +
      '<div id="lr-summary" style="margin-top:10px;padding:12px;border-radius:11px;background:rgba(0,0,0,.4);border:1px solid rgba(59,130,246,.25);font-size:13px;color:#e0eaff;line-height:1.9"></div>' +
    '</div>' +
    '<div class="notes-col in" style="margin-bottom:14px;border-color:rgba(59,130,246,.4)"><h4 style="color:#93c5fd">📥 <span id="lbl-main">' + esc(BRANCHES[mainB].name) + '</span></h4>' +
      denomRowHTML('in_main', mainNotes, {}) +
      '<div class="sum-line" style="color:#93c5fd"><span>মোট</span><b id="sum-main">৳ 0.00</b></div></div>' +
    '<div class="notes-col in" style="margin-bottom:14px"><h4>📥 <span id="lbl-opp">' + esc(BRANCHES[oppB].name) + '</span></h4>' +
      denomRowHTML('in_opp', oppNotes, {}) +
      '<div class="sum-line"><span>মোট</span><b id="sum-opp">৳ 0.00</b></div></div>' +
    '<div class="notes-col out" style="margin-bottom:14px"><h4>🔄 ফেরত (Change)</h4>' +
      denomRowHTML('change_out', changeNotes, {}) +
      '<div class="sum-line"><span>মোট</span><b id="sum-change">৳ 0.00</b></div></div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note" value="' + esc(editing?.note || '') + '"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">💾 সংরক্ষণ</button></div>';

  openModal({
    title: '📥 ঋণ কিস্তি গ্রহণ',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getMain = () => root.querySelector('#f-branch')?.value || mainB;
      const getOpp = () => getMain() === 'kalaroa' ? 'jhaudanga' : 'kalaroa';

      function recalc(){
        const online = parseNum(root.querySelector('#f-online').value);
        const inM = readNotes(root, 'in_main');
        const inO = readNotes(root, 'in_opp');
        const chg = readNotes(root, 'change_out');
        const sumM = sumNotes(inM), sumO = sumNotes(inO), sumC = sumNotes(chg);
        const totalReceived = online + sumM + sumO;
        const net = totalReceived - sumC;
        root.querySelector('#sum-main').textContent = '৳ ' + fmt(sumM);
        root.querySelector('#sum-opp').textContent = '৳ ' + fmt(sumO);
        root.querySelector('#sum-change').textContent = '৳ ' + fmt(sumC);
        root.querySelector('#f-total').value = net > 0 ? fmt(net) : '0.00';

        const el = root.querySelector('#lr-summary');
        let html = '';
        if(online > 0) html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>🌐 অনলাইন:</span><b style="color:#c4b5fd">৳ ' + fmt(online) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>🏦 মূল ক্যাশ:</span><b style="color:#93c5fd">৳ ' + fmt(sumM) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>🏦 অন্য ক্যাশ:</span><b style="color:#4ade80">৳ ' + fmt(sumO) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px dashed rgba(255,255,255,.1);margin-top:4px"><span>📥 মোট গ্রহণ:</span><b style="color:#93c5fd">৳ ' + fmt(totalReceived) + '</b></div>';
        if(sumC > 0) html += '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>🔄 ফেরত:</span><b style="color:#facc15">− ৳ ' + fmt(sumC) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:2px solid rgba(34,197,94,.4);margin-top:4px"><span style="font-weight:900;color:#4ade80">💰 Net জমা:</span><b style="color:#4ade80;font-size:16px">৳ ' + fmt(net) + '</b></div>';
        el.innerHTML = html;
        return { online, inM, inO, chg, sumM, sumO, sumC, totalReceived, net };
      }
      setupDenomInputs(root, 'in_main', recalc);
      setupDenomInputs(root, 'in_opp', recalc);
      setupDenomInputs(root, 'change_out', recalc);
      attachAmountInput(root.querySelector('#f-online'));
      root.querySelector('#f-online').addEventListener('input', recalc);
      const bSel = root.querySelector('#f-branch');
      if(bSel) bSel.addEventListener('change', () => {
        root.querySelector('#lbl-main').textContent = BRANCHES[getMain()].name;
        root.querySelector('#lbl-opp').textContent = BRANCHES[getOpp()].name;
      });
      root.querySelector('#f-search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        if(!q) return;
        const c = DB.customers.find(x => String(x.accountNo || '').toLowerCase() === q || String(x.name || '').toLowerCase().includes(q));
        if(c){
          root.querySelector('#f-acc').value = c.accountNo || '';
          root.querySelector('#f-name').value = c.name || '';
        }
      });
      recalc();

      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;
        const r = recalc();
        const mainKey = getMain();
        const oppKey = getOpp();
        const date = root.querySelector('#f-date').value || todayStr();
        let custAcc = root.querySelector('#f-acc').value.trim();
        let custName = root.querySelector('#f-name').value.trim();
        if(r.totalReceived <= 0 && r.sumC <= 0){ alert('⚠️ কমপক্ষে একটি field-এ পরিমাণ দিন'); return; }
        if(!custName) custName = 'অজ্ঞাত';
        if(!custAcc) custAcc = 'ACC' + Date.now().toString(36).slice(-6);

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const sp = [];
        if(Object.keys(r.inM).length) sp.push({ branch: mainKey, notesIn: r.inM });
        if(Object.keys(r.inO).length) sp.push({ branch: oppKey, notesIn: r.inO });
        const tx = {
          id: editing ? editing.id : uid(),
          type: 'loan_received', date, branch: mainKey, custBranch: mainKey, dir: 'in',
          amount: Math.round((r.net > 0 ? r.net : r.totalReceived) * 100) / 100,
          onlineAmount: r.online > 0 ? r.online : null,
          receivedAmount: Math.round(r.totalReceived * 100) / 100,
          changeAmount: Math.round(r.sumC * 100) / 100,
          netAmount: Math.round(r.net * 100) / 100,
          mainBranch: mainKey, oppositeBranch: oppKey,
          notesIn: { ...r.inM, ...r.inO }, notesOut: {},
          changeNotesOut: r.chg, branchSplits: sp,
          custAcc, custName,
          note: root.querySelector('#f-note').value.trim(),
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if(!editing) DB.txs.push(tx);
        else { const i = DB.txs.findIndex(x => x.id === editing.id); if(i >= 0) DB.txs[i] = tx; }
        upsertCustomer({ accountNo: custAcc, name: custName, branch: mainKey });
        logActivity('txn_create', '📥 ঋণ গ্রহণ', custName, r.totalReceived);
        close();
        toast('✅ সংরক্ষিত — ৳ ' + fmt(r.net > 0 ? r.net : r.totalReceived), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Loan Received');