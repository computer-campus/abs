/* ============ TX: BRANCH TRANSFER (আউটলেট ট্রান্সফার) ============ */
'use strict';
function openBranchTransferForm(editId){
  const isAdmin = SESSION.role === 'admin';
  const initFrom = isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch;
  const initTo = initFrom === 'kalaroa' ? 'jhaudanga' : 'kalaroa';
  const vault = DB.liveVault[initFrom] || {};

  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="f-date" value="' + DASH_DATE + '"></div>' +
      '<div class="field"><label>থেকে</label><select id="f-from">' +
        Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '"' + (initFrom === k ? ' selected' : '') + '>' + v.name + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>গ্রাহক</label><select id="f-to">' +
        Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '"' + (initTo === k ? ' selected' : '') + '>' + v.name + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="notes-col out" style="margin-bottom:14px"><h4>💸 পাঠানো নোট</h4>' +
      denomRowHTML('out', null, vault) +
      '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div></div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">📤 পাঠান</button></div>';

  openModal({
    title: '🔁 আউটলেট টু আউটলেট ট্রান্সফার',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getFrom = () => root.querySelector('#f-from').value;
      const getTo = () => root.querySelector('#f-to').value;
      function recalc(){
        const outN = readNotes(root, 'out');
        root.querySelector('#sum-out').textContent = '৳ ' + fmt(sumNotes(outN));
        return outN;
      }
      setupDenomInputs(root, 'out', recalc);
      recalc();

      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;
        const from = getFrom(), to = getTo();
        const date = root.querySelector('#f-date').value || todayStr();
        const outN = recalc();
        const total = sumNotes(outN);
        if(from === to){ alert('⚠️ একই আউটলেট'); return; }
        if(total <= 0){ alert('⚠️ নোট দিন'); return; }
        const v = DB.liveVault[from] || {};
        const miss = [];
        Object.keys(outN).forEach(d => { if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d); });
        if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const tx = {
          id: uid(), type: 'branch_transfer', date, branch: from, custBranch: from,
          from, to, dir: 'out',
          amount: Math.round(total * 100) / 100,
          notesOut: outN, notesIn: outN,
          note: root.querySelector('#f-note').value.trim() || (BRANCHES[from].name + ' ➜ ' + BRANCHES[to].name),
          user: SESSION.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          accepted: false
        };
        DB.txs.push(tx);
        logActivity('txn_create', '🔁 ট্রান্সফার তৈরি', BRANCHES[from].name + ' ➜ ' + BRANCHES[to].name, total);
        close();
        toast('✅ পাঠানো — ৳ ' + fmt(total), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}

async function acceptTransfer(id){
  if(READ_ONLY){ toast('👁️ Read-Only', 'warn'); return; }
  const tx = DB.txs.find(t => t.id === id);
  if(!tx || tx.accepted || tx.cancelled){ toast('❌ নেই'); return; }
  if(!confirmBox('গ্রহণ করবেন?\n\n' + BRANCHES[tx.from].name + ' ➜ ' + BRANCHES[tx.to].name + '\n৳ ' + fmt(tx.amount))) return;
  tx.accepted = true;
  tx.acceptedAt = new Date().toISOString();
  tx.acceptedBy = SESSION.name;
  tx.updatedAt = new Date().toISOString();
  logActivity('txn_accept', '✅ ট্রান্সফার গৃহীত', BRANCHES[tx.from].name + ' ➜ ' + BRANCHES[tx.to].name, tx.amount);
  DB.__updated = new Date().toISOString();
  saveLocal(); recomputeLive(); renderDashboard();
  toast('✅ গৃহীত — ৳ ' + fmt(tx.amount), 'ok');
  pushCloud();
}
console.log('✅ Branch Transfer');