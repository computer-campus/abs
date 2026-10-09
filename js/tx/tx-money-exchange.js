/* ============================================================
   FILE: js/tx/tx-money-exchange.js — COMPLETE
   PURPOSE: মানি এক্সচেঞ্জ — 2 types (শুধুই পরিবর্তন / Online গ্রহণ)
   VERSION: v3.0
   ============================================================ */
'use strict';

function openMoneyExchange(editId, prefill){
  var editing = editId ? DB.txs.find(function(t){ return t.id === editId; }) : null;
  var isAdmin = SESSION.role === 'admin';
  var initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  var vault = DB.liveVault[initBranch] || {};
  var initType = editing ? (editing.exchangeType || 'physical') : 'physical';

  var body =
    // ═══ Top Row: তারিখ + সময় + আউটলেট + ধরন ═══
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +

      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase">তারিখ</label>' +
        '<input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none">' +
      '</div>' +

      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase">আউটলেট</label>' +
        (isAdmin
          ? '<select id="f-branch" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;cursor:pointer">' +
              Object.entries(BRANCHES).map(function(e){
                return '<option value="' + e[0] + '"' + (initBranch === e[0] ? ' selected' : '') + '>' + e[1].name + '</option>';
              }).join('') +
            '</select>'
          : '<input type="text" value="' + BRANCHES[initBranch].name + '" disabled style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;cursor:not-allowed">' +
            '<input type="hidden" id="f-branch" value="' + initBranch + '">') +
      '</div>' +

      '<div>' +
        '<label style="display:block;font-size:12px;color:#fbbf24;font-weight:800;margin-bottom:6px;text-transform:uppercase">ধরন</label>' +
        '<select id="f-exchange-type" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(251,191,36,.5);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;cursor:pointer">' +
          '<option value="physical"' + (initType === 'physical' ? ' selected' : '') + '>🔄 শুধুই পরিবর্তন</option>' +
          '<option value="online"' + (initType === 'online' ? ' selected' : '') + '>🌐 Online এ গ্রহণ</option>' +
        '</select>' +
      '</div>' +

    '</div>' +

    // ═══ Info Banner ═══
    '<div id="me-info" style="padding:10px 14px;margin-bottom:14px;border-radius:10px;background:linear-gradient(145deg,rgba(251,191,36,.12),rgba(0,0,0,.3));border:1.5px solid rgba(251,191,36,.4)">' +
      '<div id="me-info-text" style="font-size:12px;color:#fcd34d;font-weight:800;line-height:1.6">' +
        '🔄 শুধুই পরিবর্তন — নোট বদল (ভল্টে যোগ/বিয়োগ)' +
      '</div>' +
    '</div>' +

    // ═══ PHYSICAL — Notes (2 columns) ═══
    '<div id="me-physical-box">' +
      '<div class="notes-cols">' +
        '<div class="notes-col out">' +
          '<h4>💸 প্রদান</h4>' +
          denomRowHTML('out', editing && initType === 'physical' ? editing.notesOut : null, vault) +
          '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in">' +
          '<h4>📥 গ্রহণ</h4>' +
          denomRowHTML('in', editing && initType === 'physical' ? editing.notesIn : null, {}) +
          '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══ ONLINE — Amount only ═══
    '<div id="me-online-box" style="display:none">' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3));border:1.5px solid rgba(34,197,94,.45);margin-bottom:14px">' +
        '<label style="display:block;font-size:12px;color:#4ade80;font-weight:800;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">🌐 Online এ গ্রহণ পরিমাণ</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amount" value="' + (editing && initType === 'online' ? (editing.amount || '') : '') + '" placeholder="0" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(34,197,94,.5);color:#4ade80;font-family:inherit;font-size:22px;font-weight:900;outline:none;letter-spacing:-.3px" autocomplete="off">' +
        '<div style="font-size:11.5px;color:#a5b4d8;margin-top:8px;font-weight:700;line-height:1.5">' +
          '💡 Online এ গ্রহণ — 🏦 মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══ মন্তব্য ═══
    '<div class="field"><label>📝 মন্তব্য</label>' +
      '<input type="text" id="f-note" value="' + esc(editing && editing.note || '') + '" autocomplete="off">' +
    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn green block" id="f-save">💾 সংরক্ষণ</button>' +
    '</div>';

  openModal({
    title: '💱 মানি এক্সচেঞ্জ',
    bodyHTML: body,
    wide: true,
    onMount: function(root, close){
      var branchSel = root.querySelector('#f-branch');
      var typeSel = root.querySelector('#f-exchange-type');
      var physicalBox = root.querySelector('#me-physical-box');
      var onlineBox = root.querySelector('#me-online-box');
      var onlineInput = root.querySelector('#f-online-amount');
      var infoText = root.querySelector('#me-info-text');
      var infoBox = root.querySelector('#me-info');
      var sumOut = root.querySelector('#sum-out');
      var sumIn = root.querySelector('#sum-in');

      function getBranch(){
        return branchSel && branchSel.value ? branchSel.value : initBranch;
      }
      function getType(){
        return typeSel ? typeSel.value : 'physical';
      }

      function updateVisibility(){
        var t = getType();
        var isOnline = (t === 'online');

        physicalBox.style.display = isOnline ? 'none' : 'block';
        onlineBox.style.display = isOnline ? 'block' : 'none';

        // Info text
        if(isOnline){
          infoText.innerHTML = '🌐 <b>Online এ গ্রহণ</b> — 🏦 মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(34,197,94,.5)';
          infoText.style.color = '#86efac';
        } else {
          infoText.innerHTML = '🔄 <b>শুধুই পরিবর্তন</b> — নোট বদল (ভল্টে যোগ/বিয়োগ)';
          infoBox.style.background = 'linear-gradient(145deg,rgba(251,191,36,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(251,191,36,.4)';
          infoText.style.color = '#fcd34d';
        }
      }

      function recalc(){
        var nOut = readNotes(root, 'out');
        var nIn = readNotes(root, 'in');
        if(sumOut) sumOut.textContent = '৳ ' + fmt(sumNotes(nOut));
        if(sumIn) sumIn.textContent = '৳ ' + fmt(sumNotes(nIn));
      }

      if(onlineInput) attachAmountInput(onlineInput);
      setupDenomInputs(root, 'out', getBranch, recalc);
      setupDenomInputs(root, 'in', getBranch, recalc);
      if(typeSel) typeSel.addEventListener('change', updateVisibility);
      updateVisibility();
      recalc();

      // ═══ SAVE ═══
      root.querySelector('#f-save').addEventListener('click', async function(){
        var btn = root.querySelector('#f-save');
        if(btn.disabled) return;

        var date = root.querySelector('#f-date').value || todayStr();
        var branch = getBranch();
        var exType = getType();
        var note = root.querySelector('#f-note').value.trim();

        var amount = 0;
        var nIn = {};
        var nOut = {};
        var onlineAmt = 0;

        if(exType === 'online'){
          // ═══ Online Receipt ═══
          onlineAmt = parseNum(onlineInput.value);
          amount = onlineAmt;
          if(amount <= 0){
            alert('⚠️ অনলাইন পরিমাণ দিন');
            return;
          }
        } else {
          // ═══ Physical Exchange ═══
          nOut = readNotes(root, 'out');
          nIn = readNotes(root, 'in');
          var outSum = sumNotes(nOut);
          var inSum = sumNotes(nIn);

          if(outSum === 0 && inSum === 0){
            alert('⚠️ প্রদান বা গ্রহণ — কোনো নোট দিন');
            return;
          }

          amount = Math.max(outSum, inSum);

          // Vault check for out
          var v = DB.liveVault[branch] || {};
          var miss = [];
          Object.keys(nOut).forEach(function(d){
            if((nOut[d] || 0) > (v[d] || 0)) miss.push('৳' + d);
          });
          if(miss.length){
            alert('🚫 ভল্টে কম: ' + miss.join(', '));
            return;
          }
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        var tx = {
          id: editing ? editing.id : uid(),
          type: 'money_exchange',
          exchangeType: exType,              // ⚡ 'physical' or 'online'
          date: date,
          branch: branch,
          custBranch: branch,
          dir: exType === 'online' ? 'online_in' : 'exchange',
          amount: Math.round(amount * 100) / 100,
          onlineAmount: exType === 'online' ? Math.round(onlineAmt * 100) / 100 : null,
          notesOutSum: exType === 'physical' ? Math.round(noteSum(nOut) * 100) / 100 : 0,
          notesInSum: exType === 'physical' ? Math.round(noteSum(nIn) * 100) / 100 : 0,
          notesOut: exType === 'physical' ? nOut : {},
          notesIn: exType === 'physical' ? nIn : {},
          note: note || (exType === 'online' ? 'Online এ গ্রহণ' : 'মানি এক্সচেঞ্জ'),
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if(!editing) DB.txs.push(tx);
        else {
          var i = DB.txs.findIndex(function(x){ return x.id === editing.id; });
          if(i >= 0) DB.txs[i] = tx;
        }

        logActivity('txn_create', '💱 মানি এক্সচেঞ্জ',
          (exType === 'online' ? '🌐 Online এ গ্রহণ' : '🔄 শুধুই পরিবর্তন'), amount);

        close();
        toast('✅ মানি এক্সচেঞ্জ — ৳ ' + fmt(amount) +
          (exType === 'online' ? ' (Online)' : ' (পরিবর্তন)'), 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Money Exchange loaded — v3.0 (physical + online)');