/* ============================================================
   FILE: js/tx/tx-simple-form.js
   PURPOSE: Shared simple form (deposit/expense/support/other_bank)
   LOAD: সব tx-* এর আগে
   ============================================================ */
'use strict';

function openSimpleForm(type, editId, opts){
  opts = opts || {};
  const cfg = TX_TYPES[type];
  if(!cfg){ toast('❌ Unknown type: ' + type); return; }

  const editing = editId ? DB.txs.find(t => t.id === editId) : null;
  const isAdmin = SESSION.role === 'admin';
  const initBranch = editing ? editing.branch :
    (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  const vault = DB.liveVault[initBranch] || {};

  const needsDir = !!opts.needsDir;
  const needsOnline = !!opts.needsOnline;
  const dirOptions = opts.dirOptions || [];
  const amountLabel = opts.amountLabel || 'পরিমাণ';

  // Build dir options HTML
  let dirOptionsHTML = '';
  dirOptions.forEach(d => {
    dirOptionsHTML += '<option value="' + d.v + '"' +
      (editing?.dir === d.v ? ' selected' : '') + '>' + d.l + '</option>';
  });

  const body =
    '<div class="form-row">' +
      '<div class="field"><label>তারিখ</label>' +
        '<input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '">' +
      '</div>' +
      (isAdmin ?
        '<div class="field"><label>আউটলেট</label><select id="f-branch">' +
          Object.entries(BRANCHES).map(([k, v]) =>
            '<option value="' + k + '"' + (initBranch === k ? ' selected' : '') + '>' + v.name + '</option>'
          ).join('') +
        '</select></div>'
        : '<input type="hidden" id="f-branch" value="' + initBranch + '">') +
      (needsDir ?
        '<div class="field"><label>ধরন</label>' +
          '<select id="f-dir">' + dirOptionsHTML + '</select>' +
        '</div>'
        : '') +
    '</div>' +

    // Online amount (only shows for online dir)
    (needsOnline ?
      '<div id="f-online" class="field" style="display:none">' +
        '<label>💳 অনলাইন ' + amountLabel + '</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amt" value="' +
          (editing?.onlineAmount || '') + '" placeholder="0">' +
      '</div>'
      : '') +

    // Notes section (hidden when online)
    '<div id="f-notes-wrap">' +
      '<div class="notes-cols">' +
        '<div class="notes-col out"><h4>💸 প্রদান</h4>' +
          denomRowHTML('out', editing?.notesOut, vault) +
          '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in"><h4>📥 গ্রহণ</h4>' +
          denomRowHTML('in', editing?.notesIn, {}) +
          '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Customer (for support, optional)
    (type === 'support' ?
      '<div class="field"><label>👤 গ্রাহক (ঐচ্ছিক)</label>' +
        '<input type="text" id="f-cust-acc" placeholder="অ্যাকাউন্ট/নাম" value="' +
          esc(editing?.custAcc || '') + '">' +
      '</div>' +
      '<input type="hidden" id="f-cust-name" value="' + esc(editing?.custName || '') + '">'
      : '') +

    '<div class="field"><label>📝 মন্তব্য</label>' +
      '<input type="text" id="f-note" value="' + esc(editing?.note || '') + '">' +
    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn green block" id="f-save">💾 সংরক্ষণ</button>' +
    '</div>';

  openModal({
    title: cfg.icon + ' ' + cfg.title,
    bodyHTML: body,
    wide: true,
    onMount: (root, close) => {
      const getBranch = () => root.querySelector('#f-branch')?.value || initBranch;
      const getDir = () => root.querySelector('#f-dir')?.value || null;
      const isOnline = () => {
        const d = getDir();
        return d === 'online_in' || d === 'online_out' ||
               d === 'online_support_in' || d === 'online_support_out';
      };

      function recalc(){
        const outN = readNotes(root, 'out');
        const inN = readNotes(root, 'in');
        root.querySelector('#sum-out').textContent = '৳ ' + fmt(sumNotes(outN));
        root.querySelector('#sum-in').textContent = '৳ ' + fmt(sumNotes(inN));
        return { outN, inN, outSum: sumNotes(outN), inSum: sumNotes(inN) };
      }

      setupDenomInputs(root, 'out', recalc);
      setupDenomInputs(root, 'in', recalc);

      if(needsOnline){
        attachAmountInput(root.querySelector('#f-online-amt'));
        root.querySelector('#f-online-amt').addEventListener('input', recalc);
      }

      // Dir change handler
      function applyDir(){
        if(!needsDir) return;
        const on = isOnline();
        root.querySelector('#f-notes-wrap').style.display = on ? 'none' : 'block';
        const onlineBox = root.querySelector('#f-online');
        if(onlineBox) onlineBox.style.display = on ? 'block' : 'none';
      }

      if(needsDir){
        root.querySelector('#f-dir').addEventListener('change', applyDir);
        applyDir();
      }

      // Customer search (support only)
      const custSearch = root.querySelector('#f-cust-acc');
      if(custSearch){
        custSearch.addEventListener('input', e => {
          const q = e.target.value.trim().toLowerCase();
          if(!q) return;
          const c = DB.customers.find(x =>
            String(x.accountNo || '').toLowerCase() === q ||
            String(x.name || '').toLowerCase().includes(q)
          );
          if(c){
            root.querySelector('#f-cust-acc').value = c.accountNo || '';
            root.querySelector('#f-cust-name').value = c.name || '';
          }
        });
      }

      recalc();

      // ═════ SAVE ═════
      root.querySelector('#f-save').addEventListener('click', async () => {
        const btn = root.querySelector('#f-save');
        if(btn.disabled) return;

        const date = root.querySelector('#f-date').value || todayStr();
        const branch = getBranch();
        const dir = getDir();
        const on = isOnline();
        const r = recalc();

        let amount = 0;
        let onlineAmount = 0;

        if(on){
          onlineAmount = parseNum(root.querySelector('#f-online-amt').value);
          if(onlineAmount <= 0){ alert('⚠️ অনলাইন পরিমাণ দিন'); return; }
          amount = onlineAmount;
        } else {
          if(r.outSum === 0 && r.inSum === 0){ alert('⚠️ নোট দিন'); return; }
          // Determine amount based on direction
          if(dir === 'in' || dir === 'in') amount = r.inSum || r.outSum;
          else amount = r.outSum || r.inSum;
        }

        // Vault check for physical OUT
        if(!on && (dir === 'out' || !dir)){
          const v = DB.liveVault[branch] || {};
          const miss = [];
          Object.keys(r.outN).forEach(d => {
            if((r.outN[d] || 0) > (v[d] || 0)) miss.push('৳' + d);
          });
          if(miss.length){ alert('🚫 ভল্টে কম: ' + miss.join(', ')); return; }
        }

        // Bank check for online OUT
        if(on && (dir === 'online_out' || dir === 'online_support_out')){
          const bal = Number(DB.liveAccounts[branch].bank) || 0;
          if(bal < onlineAmount){
            alert('🚫 মাদার অ্যাকাউন্টে পর্যাপ্ত নেই (আছে ৳ ' + fmt(bal) + ')');
            return;
          }
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        const custAccInput = root.querySelector('#f-cust-acc');
        const custAcc = custAccInput ? custAccInput.value.trim() : '';
        const custName = root.querySelector('#f-cust-name')?.value.trim() || '';

        const tx = {
          id: editing ? editing.id : uid(),
          type,
          date,
          branch,
          custBranch: branch,
          dir: dir || 'out',
          amount: Math.round(amount * 100) / 100,
          onlineAmount: on ? onlineAmount : null,
          notesOut: on ? {} : r.outN,
          notesIn: on ? {} : r.inN,
          custAcc, custName,
          note: root.querySelector('#f-note').value.trim(),
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if(!editing) DB.txs.push(tx);
        else {
          const i = DB.txs.findIndex(x => x.id === editing.id);
          if(i >= 0) DB.txs[i] = tx;
        }

        // Auto upsert customer if support + has cust
        if(type === 'support' && (custAcc || custName)){
          upsertCustomer({ accountNo: custAcc, name: custName || 'অজ্ঞাত', branch });
        }

        logActivity('txn_create', cfg.icon + ' ' + cfg.title, custName || '', amount);

        close();
        toast('✅ সংরক্ষিত — ৳ ' + fmt(amount), 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Simple Form loaded');