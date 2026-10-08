/* ============ TX: BANK TRANSFER (ইন্টারনাল অনলাইন) ============ */
'use strict';
function openBankTransferForm(editId){
  const isAdmin = SESSION.role === 'admin';
  const initFrom = isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch;
  const initTo = initFrom === 'kalaroa' ? 'jhaudanga' : 'kalaroa';

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
    '<div class="field"><label>💰 পরিমাণ</label>' +
      '<input type="text" inputmode="decimal" id="f-amount" placeholder="0" style="color:#c4b5fd;font-weight:900;font-size:20px">' +
    '</div>' +
    '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="f-note"></div>' +
    '<div id="bt-preview" style="padding:12px;border-radius:11px;background:rgba(0,0,0,.4);border:1.5px solid rgba(167,139,250,.35);font-size:13px;line-height:1.9;margin-top:10px"></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn green block" id="f-save">📤 ট্রান্সফার</button></div>';

  openModal({
    title: '🏛️ ইন্টারনাল অনলাইন ট্রান্সফার',
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getFrom = () => root.querySelector('#f-from').value;
      const getTo = () => root.querySelector('#f-to').value;
      function preview(){
        const from = getFrom(), to = getTo();
        const amt = parseNum(root.querySelector('#f-amount').value);
        const fb = Number(DB.liveAccounts[from].bank) || 0;
        const tb = Number(DB.liveAccounts[to].bank) || 0;
        const el = root.querySelector('#bt-preview');
        if(from === to){ el.innerHTML = '<div style="color:#f87171;text-align:center;font-weight:900">❌ একই আউটলেট</div>'; return; }
        const enough = amt > 0 && fb >= amt;
        let html = '';
        html += '<div style="display:flex;justify-content:space-between"><span style="color:#f87171">📤 ' + BRANCHES[from].name + ':</span><b style="color:#f87171">− ৳ ' + fmt(amt) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between"><span style="color:#4ade80">📥 ' + BRANCHES[to].name + ':</span><b style="color:#4ade80">+ ৳ ' + fmt(amt) + '</b></div>';
        html += '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(255,255,255,.1);font-size:12px">';
        html += '<div style="display:flex;justify-content:space-between"><span>Sender বর্তমান:</span><b>৳ ' + fmt(fb) + '</b></div>';
        html += '<div style="display:flex;justify-content:space-between"><span>Sender পরে:</span><b style="color:' + (enough ? '#93c5fd' : '#f87171') + '">৳ ' + fmt(fb - amt) + '</b></div>';
        html += '</div>';
        if(amt > 0 && !enough) html += '<div style="margin-top:8px;padding:8px;border-radius:8px;background:rgba(220,38,38,.15);color:#f87171;font-weight:900;text-align:center">🚫 পর্যাপ্ত নেই</div>';
        el.innerHTML = html;
      }
      attachAmountInput(root.querySelector('#f-amount'));
      ['f-amount', 'f-from', 'f-to'].forEach(id => {
        root.querySelector('#' + id).addEventListener('input', preview);
        root.querySelector('#' + id).addEventListener('change', preview);
      });
      preview();

      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;
        const from = getFrom(), to = getTo();
        const date = root.querySelector('#f-date').value || todayStr();
        const amt = parseNum(root.querySelector('#f-amount').value);
        if(from === to){ alert('⚠️ একই আউটলেট'); return; }
        if(amt <= 0){ alert('⚠️ পরিমাণ দিন'); return; }
        const bal = Number(DB.liveAccounts[from].bank) || 0;
        if(bal < amt){ alert('🚫 পর্যাপ্ত নেই (আছে ৳ ' + fmt(bal) + ')'); return; }

        btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
        const tx = {
          id: uid(), type: 'bank_transfer', date, branch: from, custBranch: from,
          from, to, dir: 'out', amount: Math.round(amt * 100) / 100,
          note: root.querySelector('#f-note').value.trim(),
          user: SESSION.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        DB.txs.push(tx);
        logActivity('txn_create', '🏛️ ইন্টারনাল ট্রান্সফার', BRANCHES[from].name + ' ➜ ' + BRANCHES[to].name, amt);
        close();
        toast('✅ ট্রান্সফার — ৳ ' + fmt(amt), 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal(); recomputeLive(); renderDashboard(); pushCloud();
      });
    }
  });
}
console.log('✅ Bank Transfer');