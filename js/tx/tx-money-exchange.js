/* ============================================================
   FILE: js/tx/tx-money-exchange.js — COMPLETE
   PURPOSE: মানি এক্সচেঞ্জ — Online এ গ্রহণ + Cash দেওয়া
   VERSION: v4.0
   ============================================================ */
'use strict';

function openMoneyExchange(editId, prefill){
  var editing = editId ? DB.txs.find(function(t){ return t.id === editId; }) : null;
  var isAdmin = SESSION.role === 'admin';
  var initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  var vault = DB.liveVault[initBranch] || {};
  var initType = editing ? (editing.exchangeType || 'physical') : 'physical';

  var inputStyle = 'width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none';

  var body =
    // Top Row: তারিখ + সময় + আউটলেট + ধরন
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +
      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase">📅 তারিখ</label>' +
        '<input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '" style="' + inputStyle + '">' +
      '</div>' +
      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase">🕐 সময়</label>' +
        '<input type="time" id="f-time" value="" style="' + inputStyle + '">' +
      '</div>' +
      '<div>' +
        '<label style="display:block;font-size:12px;color:#22c55e;font-weight:800;margin-bottom:6px;text-transform:uppercase">🏦 আউটলেট</label>' +
        (isAdmin
          ? '<select id="f-branch" style="' + inputStyle + ';border-color:rgba(34,197,94,.5);cursor:pointer">' +
              Object.entries(BRANCHES).map(function(e){
                return '<option value="' + e[0] + '"' + (initBranch === e[0] ? ' selected' : '') + '>' + e[1].name + '</option>';
              }).join('') +
            '</select>'
          : '<input type="hidden" id="f-branch" value="' + initBranch + '">' +
            '<input type="text" value="' + BRANCHES[initBranch].name + '" disabled style="' + inputStyle + ';cursor:not-allowed">') +
      '</div>' +
      '<div>' +
        '<label style="display:block;font-size:12px;color:#fbbf24;font-weight:800;margin-bottom:6px;text-transform:uppercase">🔄 ধরন</label>' +
        '<select id="f-exchange-type" style="' + inputStyle + ';border-color:rgba(251,191,36,.5);cursor:pointer">' +
          '<option value="physical"' + (initType === 'physical' ? ' selected' : '') + '>🔄 শুধুই পরিবর্তন</option>' +
          '<option value="online"' + (initType === 'online' ? ' selected' : '') + '>🌐 Online এ গ্রহণ → Cash প্রদান</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    // Info Banner
    '<div id="me-info" style="padding:10px 14px;margin-bottom:14px;border-radius:10px;background:linear-gradient(145deg,rgba(251,191,36,.12),rgba(0,0,0,.3));border:1.5px solid rgba(251,191,36,.4)">' +
      '<div id="me-info-text" style="font-size:12px;color:#fcd34d;font-weight:800;line-height:1.6">' +
        '🔄 শুধুই পরিবর্তন — নোট বদল (ভল্টে যোগ/বিয়োগ)' +
      '</div>' +
    '</div>' +

    // PHYSICAL — Notes
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

    // ONLINE — Amount + Cash Give
    '<div id="me-online-box" style="display:none">' +

      // Online amount
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3));border:1.5px solid rgba(34,197,94,.45);margin-bottom:14px">' +
        '<label style="display:block;font-size:12px;color:#4ade80;font-weight:800;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">🌐 Online এ গ্রহণ পরিমাণ</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amount" value="' + (editing && initType === 'online' ? (editing.amount || '') : '') + '" placeholder="0" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(34,197,94,.5);color:#4ade80;font-family:inherit;font-size:22px;font-weight:900;outline:none;letter-spacing:-.3px" autocomplete="off">' +
        '<div style="font-size:11.5px;color:#a5b4d8;margin-top:8px;font-weight:700;line-height:1.5">' +
          '💡 🏦 মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>' +
        '</div>' +
      '</div>' +

      // Manual cash give — Notes input
      '<div class="notes-col out" style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(250,204,21,.08),rgba(0,0,0,.3));border:1.5px solid rgba(250,204,21,.45)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">' +
          '<label style="font-size:12.5px;color:#facc15;font-weight:900;text-transform:uppercase;letter-spacing:.4px">💸 গ্রাহককে Cash প্রদান</label>' +
          '<span id="me-cash-amount" style="font-size:18px;color:#facc15;font-weight:900">৳ 0.00</span>' +
        '</div>' +
        '<div style="font-size:11.5px;color:#a5b4d8;margin-bottom:12px;font-weight:700;line-height:1.5">' +
          '💡 💵 ভল্ট থেকে <span style="color:#f87171">− কমবে</span>' +
        '</div>' +

        // Denomination inputs
        denomRowHTML('cash_out', null, vault) +
        '<div class="sum-line" style="color:#facc15"><span>মোট</span><b id="me-cash-sum">৳ 0.00</b></div>' +

        // Status message
        '<div id="me-cash-status" style="margin-top:10px;padding:10px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid rgba(250,204,21,.25);font-size:12px;color:#a5b4d8;text-align:center;font-weight:800">' +
          '💡 Notes দিন — Online amount এর সাথে মিলতে হবে' +
        '</div>' +
      '</div>' +

    '</div>' +

    // মন্তব্য
    '<div class="field" style="margin-top:14px"><label>📝 মন্তব্য</label>' +
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
      var cashAmountEl = root.querySelector('#me-cash-amount');
      var cashPreviewEl = root.querySelector('#me-cash-preview');
      var infoText = root.querySelector('#me-info-text');
      var infoBox = root.querySelector('#me-info');
      var sumOut = root.querySelector('#sum-out');
      var sumIn = root.querySelector('#sum-in');

      function getBranch(){
        return (branchSel && branchSel.value) ? branchSel.value : initBranch;
      }
      function getType(){
        return typeSel ? typeSel.value : 'physical';
      }

      // ═══ Extract notes from vault ═══
      function extractNotesFromVault(vault, amount){
        var remaining = Math.round(amount * 100) / 100;
        var notesOut = {};
        var sorted = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

        for(var i = 0; i < sorted.length && remaining > 0.01; i++){
          var d = sorted[i];
          var have = Number(vault[d]) || 0;
          if(have <= 0) continue;
          var needed = Math.floor(remaining / d);
          var use = Math.min(needed, have);
          if(use > 0){
            notesOut[d] = use;
            remaining = Math.round((remaining - use * d) * 100) / 100;
          }
        }
        return { notes: notesOut, remaining: remaining };
      }

      // ═══ Update cash status (Online vs Given notes) ═══
      function updateOnlineStatus(){
        var onlineAmt = parseNum(onlineInput.value);
        var cashNotes = readNotes(root, 'cash_out');
        var cashSum = sumNotes(cashNotes);

        cashAmountEl.textContent = '৳ ' + fmt(cashSum);

        var statusEl = root.querySelector('#me-cash-status');
        if(!statusEl) return;

        // Nothing typed
        if(onlineAmt <= 0 && cashSum <= 0){
          statusEl.style.background = 'rgba(0,0,0,.35)';
          statusEl.style.borderColor = 'rgba(250,204,21,.25)';
          statusEl.style.color = '#a5b4d8';
          statusEl.innerHTML = '💡 Notes দিন — Online amount এর সাথে মিলতে হবে';
          return;
        }

        // Online given but no cash
        if(onlineAmt > 0 && cashSum <= 0){
          statusEl.style.background = 'rgba(250,204,21,.12)';
          statusEl.style.borderColor = 'rgba(250,204,21,.5)';
          statusEl.style.color = '#facc15';
          statusEl.innerHTML = '⚠️ Online ৳ ' + fmt(onlineAmt) + ' — Cash notes দিন';
          return;
        }

        // Compare
        var diff = Math.abs(onlineAmt - cashSum);

        if(diff <= 0.01){
          // Match ✅
          statusEl.style.background = 'rgba(34,197,94,.12)';
          statusEl.style.borderColor = 'rgba(34,197,94,.5)';
          statusEl.style.color = '#4ade80';
          statusEl.innerHTML = '✅ সঠিক — Online = Cash (৳ ' + fmt(onlineAmt) + ')';
        } else if(cashSum < onlineAmt){
          // Short
          statusEl.style.background = 'rgba(250,204,21,.12)';
          statusEl.style.borderColor = 'rgba(250,204,21,.5)';
          statusEl.style.color = '#facc15';
          statusEl.innerHTML = '⚠️ কম: ৳ ' + fmt(onlineAmt - cashSum) + ' • Online ৳ ' + fmt(onlineAmt) + ' / Cash ৳ ' + fmt(cashSum);
        } else {
          // Over
          statusEl.style.background = 'rgba(220,38,38,.12)';
          statusEl.style.borderColor = 'rgba(220,38,38,.5)';
          statusEl.style.color = '#f87171';
          statusEl.innerHTML = '🚫 বেশি: ৳ ' + fmt(cashSum - onlineAmt) + ' • Online ৳ ' + fmt(onlineAmt) + ' / Cash ৳ ' + fmt(cashSum);
        }
      }

      function updateVisibility(){
        var t = getType();
        var isOnline = (t === 'online');

        physicalBox.style.display = isOnline ? 'none' : 'block';
        onlineBox.style.display = isOnline ? 'block' : 'none';

        if(isOnline){
          infoText.innerHTML = '🌐 <b>Online এ গ্রহণ → Cash প্রদান</b> — 🏦 মাদার অ্যাকাউন্টে <span style="color:#4ade80">+</span>, 💵 ভল্ট থেকে <span style="color:#f87171">−</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(59,130,246,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(59,130,246,.5)';
          infoText.style.color = '#93c5fd';
          updateOnlineStatus();
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
      setupDenomInputs(root, 'cash_out', getBranch, updateOnlineStatus);

      if(typeSel) typeSel.addEventListener('change', updateVisibility);
      if(onlineInput) onlineInput.addEventListener('input', updateOnlineStatus);
      if(branchSel) branchSel.addEventListener('change', updateOnlineStatus);

      updateVisibility();
      recalc();

      // ═══ SAVE ═══
      root.querySelector('#f-save').addEventListener('click', async function(){
        var btn = root.querySelector('#f-save');
        if(btn.disabled) return;

        var date = root.querySelector('#f-date').value || todayStr();
        var timeVal = root.querySelector('#f-time').value;
        var branch = getBranch();
        var exType = getType();
        var note = root.querySelector('#f-note').value.trim();

        var amount = 0;
        var nIn = {};
        var nOut = {};
        var onlineAmt = 0;

                if(exType === 'online'){
          // Online receive + cash give
          onlineAmt = parseNum(onlineInput.value);
          amount = onlineAmt;

          if(amount <= 0){
            alert('⚠️ Online পরিমাণ দিন');
            return;
          }

          // ⚡ Manual notes from user
          nOut = readNotes(root, 'cash_out');
          var cashSum = sumNotes(nOut);

          if(cashSum <= 0){
            alert('⚠️ Cash denomination notes দিন');
            return;
          }

          // Must match
          if(Math.abs(cashSum - onlineAmt) > 0.01){
            alert(
              '⚠️ Online এবং Cash amount মিলছে না!\n\n' +
              '🌐 Online: ৳ ' + fmt(onlineAmt) + '\n' +
              '💸 Cash: ৳ ' + fmt(cashSum) + '\n\n' +
              (cashSum < onlineAmt ? 'কম পড়ছে: ৳ ' + fmt(onlineAmt - cashSum) : 'বেশি: ৳ ' + fmt(cashSum - onlineAmt))
            );
            return;
          }

          // ⚡ Vault check
          var v = DB.liveVault[branch] || {};
          var miss = [];
          Object.keys(nOut).forEach(function(d){
            if((nOut[d] || 0) > (v[d] || 0)) miss.push('৳' + d);
          });
          if(miss.length){
            alert('🚫 ভল্টে কম: ' + miss.join(', '));
            return;
          }
        } else {
          // Physical exchange
          nOut = readNotes(root, 'out');
          nIn = readNotes(root, 'in');
          var outSum = sumNotes(nOut);
          var inSum = sumNotes(nIn);

          if(outSum === 0 && inSum === 0){
            alert('⚠️ কোনো নোট দিন');
            return;
          }

          amount = Math.max(outSum, inSum);

          var v2 = DB.liveVault[branch] || {};
          var miss = [];
          Object.keys(nOut).forEach(function(d){
            if((nOut[d] || 0) > (v2[d] || 0)) miss.push('৳' + d);
          });
          if(miss.length){
            alert('🚫 ভল্টে কম: ' + miss.join(', '));
            return;
          }
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        var nowISO = new Date().toISOString();
        var createdAt = nowISO;
        if(timeVal && !editing){
          try {
            var parts = timeVal.split(':');
            var d = new Date(date + 'T' + String(parts[0]).padStart(2, '0') + ':' + String(parts[1]).padStart(2, '0') + ':00');
            if(!isNaN(d.getTime())) createdAt = d.toISOString();
          } catch(e){}
        }

        var tx = {
          id: editing ? editing.id : uid(),
          type: 'money_exchange',
          exchangeType: exType,
          date: date,
          branch: branch,
          custBranch: branch,
          dir: exType === 'online' ? 'online_in' : 'exchange',
          amount: Math.round(amount * 100) / 100,
          onlineAmount: exType === 'online' ? Math.round(onlineAmt * 100) / 100 : null,
          notesOutSum: Math.round(sumNotes(nOut) * 100) / 100,
          notesInSum: Math.round(sumNotes(nIn) * 100) / 100,
          notesOut: nOut,
          notesIn: nIn,
          note: note || (exType === 'online' ? 'Online এ গ্রহণ — Cash প্রদান' : 'মানি এক্সচেঞ্জ'),
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : createdAt,
          updatedAt: nowISO
        };

        if(!editing) DB.txs.push(tx);
        else {
          var i = DB.txs.findIndex(function(x){ return x.id === editing.id; });
          if(i >= 0) DB.txs[i] = tx;
        }

        logActivity('txn_create', '💱 মানি এক্সচেঞ্জ',
          (exType === 'online' ? '🌐 Online → Cash' : '🔄 শুধুই পরিবর্তন'), amount);

        close();
        toast('✅ ' + (exType === 'online' ? 'Online → Cash' : 'পরিবর্তন') + ' — ৳ ' + fmt(amount), 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Money Exchange loaded — v4.0 (online → cash)');