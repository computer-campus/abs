/* ============ TX: LOAN COLLECTION (সংগ্রহ) ============ */
'use strict';

function openCollectionListModal(){
  const bf = currentBranch();
  const list = DB.txs.filter(t => t.type === 'loan_given' && t.cashNotTaken &&
    (Number(t.cashNotTakenAmount) || 0) > (Number(t.collectedAmount) || 0) &&
    (bf === 'all' || t.branch === bf));
  let rows = '';
  list.forEach((t, i) => {
    const pend = (Number(t.cashNotTakenAmount) || 0) - (Number(t.collectedAmount) || 0);
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<span style="font-size:11.5px;color:#93c5fd;font-style:italic">📝 ' + esc(noteText) + '</span>' :
      '<span style="color:#4a5878;font-size:11px">—</span>';

    rows += '<tr><td>' + toBn(i + 1) + '</td>' +
      '<td>👤 <b style="color:#4ade80">' + esc(t.custName) + '</b></td>' +
      '<td>' + toBn(t.date) + '</td>' +
      '<td style="max-width:200px">' + noteHtml + '</td>' +
      '<td class="amt" style="color:#facc15">৳ ' + fmt(pend) + '</td>' +
      '<td><button class="mini cash" data-collect="' + t.id + '" data-mode="cash">💵</button> ' +
        '<button class="mini online" data-collect="' + t.id + '" data-mode="online">🌐</button></td></tr>';
  });
  openModal({
    title: '💰 ঋণ সংগ্রহ',
    bodyHTML: list.length ?
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>গ্রাহক</th><th>তারিখ</th><th>📝 মন্তব্য</th><th>বাকি</th><th>অ্যাকশন</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty">🎉 কোনো সংগ্রহ বাকি নেই</div>',
    wide: true,
    onMount: (root, close) => {
      root.querySelectorAll('[data-collect]').forEach(b => {
        b.addEventListener('click', () => { close(); setTimeout(() => openCollectModal(b.dataset.collect, b.dataset.mode), 100); });
      });
    }
  });
}

function openCollectModal(parentId, mode){
  if(READ_ONLY){ toast('👁️ Read-Only', 'warn'); return; }
  const parent = DB.txs.find(t => t.id === parentId);
  if(!parent){ toast('❌ নেই'); return; }
  const owed = Number(parent.cashNotTakenAmount) || 0;
  const collected = Number(parent.collectedAmount) || 0;
  const pending = Math.round((owed - collected) * 100) / 100;
  if(pending <= 0.01){ toast('✅ সম্পূর্ণ'); return; }
  const isCash = mode === 'cash';
  const vault = DB.liveVault[parent.branch] || {};

  const body =
    '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.15),rgba(0,0,0,.2));border:1.5px solid rgba(34,197,94,.4);margin-bottom:14px">' +
      '<div style="font-size:15px;color:#fff;font-weight:900;margin-bottom:6px">👤 ' + esc(parent.custName || '—') + '</div>' +
      '<div style="color:#a5b4d8;font-size:13px">মোট: ৳ ' + fmt(owed) + ' • সংগৃহীত: ৳ ' + fmt(collected) + '</div>' +
      '<div style="color:#facc15;font-size:18px;font-weight:900;margin-top:6px">⏳ বাকি: ৳ ' + fmt(pending) + '</div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label><input type="date" id="c-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>পরিমাণ</label><input type="text" inputmode="decimal" id="c-amount" value="' + pending.toFixed(2) + '"></div>' +
    '</div>' +
    (isCash ?
      '<div class="notes-col out"><h4>💸 প্রদান নোট</h4>' + denomRowHTML('out', null, vault) +
        '<div class="sum-line"><span>মোট</span><b id="c-sum">৳ 0.00</b></div></div>'
      :
      '<div class="field"><label>মন্তব্য</label><input type="text" id="c-note" value="অনলাইন সংগ্রহ"></div>') +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="c-save">✅ সংগ্রহ</button></div>';

  openModal({
    title: isCash ? '💵 ক্যাশ সংগ্রহ' : '🌐 অনলাইন সংগ্রহ',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      function recalc(){
        const outN = readNotes(root, 'out');
        const el = root.querySelector('#c-sum');
        if(el) el.textContent = '৳ ' + fmt(sumNotes(outN));
      }
      setupDenomInputs(root, 'out', recalc);
      attachAmountInput(root.querySelector('#c-amount'));
      recalc();

      root.querySelector('#c-save').addEventListener('click', async () => {
        const btn = root.querySelector('#c-save');
        if(btn.disabled) return;
        const amt = parseNum(root.querySelector('#c-amount').value);
        if(amt <= 0){ alert('⚠️ পরিমাণ দিন'); return; }
        if(amt > pending + 0.01){ alert('⚠️ বাকির বেশি'); return; }
        if(isCash){
          const outN = readNotes(root, 'out');
          const sum = sumNotes(outN);
          if(Math.abs(sum - amt) > 0.01){ alert('⚠️ নোট যোগফল ৳ ' + fmt(sum) + ' ≠ ৳ ' + fmt(amt)); return; }
          const v = DB.liveVault[parent.branch] || {};
          const miss = [];
          Object.keys(outN).forEach(d => { if((outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d); });
          if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }
        }
        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';

        const child = {
          id: uid(), type: 'loan_collection',
          date: root.querySelector('#c-date').value || todayStr(),
          branch: parent.branch, custBranch: parent.custBranch || parent.branch,
          dir: isCash ? 'cash' : 'online_out', amount: amt,
          notesOut: isCash ? readNotes(root, 'out') : {},
          custAcc: parent.custAcc, custName: parent.custName,
          note: root.querySelector('#c-note')?.value.trim() || 'সংগ্রহ',
          collectionMode: isCash ? 'cash' : 'online',
          linkedParentId: parent.id,
          user: SESSION.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        DB.txs.push(child);
        const nc = Math.round((collected + amt) * 100) / 100;
        parent.collectedAmount = nc;
        parent.collectionStatus = nc >= owed - 0.01 ? 'collected' : 'partial';
        parent.updatedAt = new Date().toISOString();
        logActivity('txn_collect', '💰 সংগ্রহ', parent.custName, amt);
        close();
        toast('✅ সংগ্রহ — ৳ ' + fmt(amt), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Loan Collection');