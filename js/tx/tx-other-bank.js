/* ============================================================
   FILE: js/tx/tx-other-bank.js — COMPLETE
   PURPOSE: অন্য ব্যাংক লেনদেন — Bank dropdown সহ
   VERSION: v4.0
   ============================================================ */
'use strict';

function openOtherBankForm(editId, prefill){
  var editing = editId ? DB.txs.find(function(t){ return t.id === editId; }) : null;
  var isAdmin = SESSION.role === 'admin';
  var initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  var vault = DB.liveVault[initBranch] || {};

  // Default direction and bank
  var initDir = editing ? (editing.dir || 'in') : 'in';
  var initBank = editing ? (editing.bank || 'brac_outlet_kalaroa') : 'brac_outlet_kalaroa';

  // Current time (only for new)
  var now = new Date();
  var initHH = String(now.getHours()).padStart(2, '0');
  var initMM = String(now.getMinutes()).padStart(2, '0');

  // Bank options
  var bankOptions = Object.entries(BANKS).map(function(e){
    return '<option value="' + e[0] + '"' + (initBank === e[0] ? ' selected' : '') + '>' + e[1].name + '</option>';
  }).join('');

  var inputStyle = 'width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none';

  var body =
    // ═══════════════════════════════════════════════════════════
    // ROW 1: তারিখ | সময় | ধরন | ব্যাংক (4 columns)
    // ═══════════════════════════════════════════════════════════
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +

      // তারিখ
      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">📅 তারিখ</label>' +
        '<input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '" style="' + inputStyle + '">' +
      '</div>' +

      // সময়
      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">🕐 সময়</label>' +
        '<input type="time" id="f-time" value="' + (editing ? '' : (initHH + ':' + initMM)) + '" style="' + inputStyle + '">' +
      '</div>' +

      // ধরন
      '<div>' +
        '<label style="display:block;font-size:12px;color:#22c55e;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">🔄 ধরন</label>' +
        '<select id="f-dir" style="' + inputStyle + ';border-color:rgba(34,197,94,.5);cursor:pointer">' +
          '<option value="in"' + (initDir === 'in' ? ' selected' : '') + '>📥 ফিজিক্যাল আসা</option>' +
          '<option value="out"' + (initDir === 'out' ? ' selected' : '') + '>📤 ফিজিক্যাল পাঠানো</option>' +
          '<option value="online_in"' + (initDir === 'online_in' ? ' selected' : '') + '>💳 অনলাইন আসা</option>' +
          '<option value="online_out"' + (initDir === 'online_out' ? ' selected' : '') + '>💳 অনলাইন পাঠানো</option>' +
        '</select>' +
      '</div>' +

      // ব্যাংক
      '<div>' +
        '<label style="display:block;font-size:12px;color:#c4b5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">🏦 ব্যাংক</label>' +
        '<select id="f-bank" style="' + inputStyle + ';border-color:rgba(167,139,250,.5);cursor:pointer">' +
          bankOptions +
        '</select>' +
      '</div>' +

    '</div>' +

    // ═══════════════════════════════════════════════════════════
    // Info Banner
    // ═══════════════════════════════════════════════════════════
    '<div id="ob-info" style="padding:10px 14px;margin-bottom:14px;border-radius:10px;background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3));border:1.5px solid rgba(34,197,94,.4)">' +
      '<div id="ob-info-text" style="font-size:12px;color:#86efac;font-weight:800;line-height:1.6">' +
        '📥 ফিজিক্যাল আসা — ভল্টে ক্যাশ নোট + যোগ হবে' +
      '</div>' +
    '</div>' +

    // ═══════════════════════════════════════════════════════════
    // PHYSICAL — Notes (2 columns)
    // ═══════════════════════════════════════════════════════════
    '<div id="ob-physical-box">' +
      '<div class="notes-cols">' +
        '<div class="notes-col out">' +
          '<h4>💸 প্রদান (Out)</h4>' +
          denomRowHTML('out', editing ? editing.notesOut : null, vault) +
          '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in">' +
          '<h4>📥 গ্রহণ (In)</h4>' +
          denomRowHTML('in', editing ? editing.notesIn : null, {}) +
          '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══════════════════════════════════════════════════════════
    // ONLINE — Amount
    // ═══════════════════════════════════════════════════════════
    '<div id="ob-online-box" style="display:none">' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.12),rgba(0,0,0,.3));border:1.5px solid rgba(59,130,246,.45);margin-bottom:14px">' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:8px;text-transform:uppercase">💳 অনলাইন পরিমাণ</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amount" value="' + (editing && (initDir === 'online_in' || initDir === 'online_out') ? (editing.amount || '') : '') + '" placeholder="0" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.5);color:#93c5fd;font-family:inherit;font-size:20px;font-weight:900;outline:none;letter-spacing:-.3px" autocomplete="off">' +
        '<div id="ob-online-hint" style="font-size:11.5px;color:#a5b4d8;margin-top:8px;font-weight:700;line-height:1.5">' +
          '💡 অনলাইন আসা — মাদার অ্যাকাউন্টে + যোগ হবে' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══════════════════════════════════════════════════════════
    // মন্তব্য
    // ═══════════════════════════════════════════════════════════
    '<div class="field"><label>📝 মন্তব্য</label>' +
      '<input type="text" id="f-note" value="' + esc(editing && editing.note || '') + '" autocomplete="off">' +
    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn green block" id="f-save">💾 সংরক্ষণ</button>' +
    '</div>';

  openModal({
    title: '🏦 অন্য ব্যাংক লেনদেন',
    bodyHTML: body,
    wide: true,
    onMount: function(root, close){
      var branchSel = root.querySelector('#f-branch');
      var dirSel = root.querySelector('#f-dir');
      var bankSel = root.querySelector('#f-bank');
      var physicalBox = root.querySelector('#ob-physical-box');
      var onlineBox = root.querySelector('#ob-online-box');
      var onlineInput = root.querySelector('#f-online-amount');
      var infoBox = root.querySelector('#ob-info');
      var infoText = root.querySelector('#ob-info-text');
      var onlineHint = root.querySelector('#ob-online-hint');
      var sumOut = root.querySelector('#sum-out');
      var sumIn = root.querySelector('#sum-in');

      function getBranch(){
        return branchSel && branchSel.value ? branchSel.value : initBranch;
      }
      function getDir(){
        return dirSel ? dirSel.value : 'in';
      }
      function getBank(){
        return bankSel ? bankSel.value : initBank;
      }
      function isOnline(){
        var d = getDir();
        return d === 'online_in' || d === 'online_out';
      }

      // ═══ Visibility + Info Banner ═══
      function updateVisibility(){
        var d = getDir();
        var online = isOnline();

        physicalBox.style.display = online ? 'none' : 'block';
        onlineBox.style.display = online ? 'block' : 'none';

        // Info text
        var info = '';
        if(d === 'in'){
          info = '📥 <b>ফিজিক্যাল আসা</b> — ভল্টে ক্যাশ নোট <span style="color:#4ade80">+ যোগ হবে</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(34,197,94,.4)';
          infoText.style.color = '#86efac';
        } else if(d === 'out'){
          info = '📤 <b>ফিজিক্যাল পাঠানো</b> — ভল্ট থেকে ক্যাশ নোট <span style="color:#f87171">− কমবে</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(220,38,38,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(220,38,38,.5)';
          infoText.style.color = '#fca5a5';
        } else if(d === 'online_in'){
          info = '💳 <b>অনলাইন আসা</b> — মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(34,197,94,.4)';
          infoText.style.color = '#86efac';
        } else if(d === 'online_out'){
          info = '💳 <b>অনলাইন পাঠানো</b> — মাদার অ্যাকাউন্ট থেকে <span style="color:#f87171">− কমবে</span>';
          infoBox.style.background = 'linear-gradient(145deg,rgba(220,38,38,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(220,38,38,.5)';
          infoText.style.color = '#fca5a5';
        }
        infoText.innerHTML = info;

        // Online hint
        if(onlineHint){
          if(d === 'online_in'){
            onlineHint.innerHTML = '💡 অনলাইন আসা — মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>';
            onlineHint.style.color = '#86efac';
          } else {
            onlineHint.innerHTML = '💡 অনলাইন পাঠানো — মাদার অ্যাকাউন্ট থেকে <span style="color:#f87171">− কমবে</span>';
            onlineHint.style.color = '#fca5a5';
          }
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
      if(dirSel) dirSel.addEventListener('change', updateVisibility);
      updateVisibility();
      recalc();

      // ═══ SAVE ═══
      root.querySelector('#f-save').addEventListener('click', async function(){
        var btn = root.querySelector('#f-save');
        if(btn.disabled) return;

        var dateEl = root.querySelector('#f-date');
        var timeEl = root.querySelector('#f-time');
        var date = dateEl.value || todayStr();
        var timeVal = timeEl && timeEl.value ? timeEl.value : null;
        var branch = getBranch();
        var dir = getDir();
        var bank = getBank();
        var note = root.querySelector('#f-note').value.trim();
        var online = isOnline();

        var amount = 0;
        var nIn = {};
        var nOut = {};
        var onlineAmt = 0;

        if(online){
          onlineAmt = parseNum(onlineInput.value);
          amount = onlineAmt;
          if(amount <= 0){
            alert('⚠️ অনলাইন পরিমাণ দিন');
            return;
          }

          // Online out → mother account check
          if(dir === 'online_out'){
            var bankBal = Number(DB.liveAccounts[branch]?.bank) || 0;
            if(bankBal < amount){
              alert('🚫 মাদার অ্যাকাউন্টে পর্যাপ্ত নেই (আছে ৳ ' + fmt(bankBal) + ')');
              return;
            }
          }
        } else {
          nOut = readNotes(root, 'out');
          nIn = readNotes(root, 'in');
          var outSum = sumNotes(nOut);
          var inSum = sumNotes(nIn);

          if(dir === 'in'){
            amount = inSum;
            if(amount <= 0){ alert('⚠️ গ্রহণ নোট দিন'); return; }
          } else if(dir === 'out'){
            amount = outSum;
            if(amount <= 0){ alert('⚠️ প্রদান নোট দিন'); return; }

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
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        // Build createdAt with time if provided
        var createdAt = editing ? editing.createdAt : new Date().toISOString();
        if(timeVal && !editing){
          try {
            var parts = timeVal.split(':');
            var d = new Date(date + 'T' + String(parts[0]).padStart(2, '0') + ':' + String(parts[1]).padStart(2, '0') + ':00');
            if(!isNaN(d.getTime())) createdAt = d.toISOString();
          } catch(e){}
        }

        var tx = {
          id: editing ? editing.id : uid(),
          type: 'other_bank',
          date: date,
          branch: branch,
          custBranch: branch,
          dir: dir,
          bank: bank,
          amount: Math.round(amount * 100) / 100,
          onlineAmount: online ? Math.round(onlineAmt * 100) / 100 : null,
          notesOut: online ? {} : nOut,
          notesIn: online ? {} : nIn,
          note: note,
          user: SESSION.name,
          createdAt: createdAt,
          updatedAt: new Date().toISOString()
        };

        if(!editing) DB.txs.push(tx);
        else {
          var i = DB.txs.findIndex(function(x){ return x.id === editing.id; });
          if(i >= 0) DB.txs[i] = tx;
        }

        var dirLabel = (dir === 'in') ? '📥 ফিজিক্যাল আসা' :
                       (dir === 'out') ? '📤 ফিজিক্যাল পাঠানো' :
                       (dir === 'online_in') ? '💳 অনলাইন আসা' :
                       '💳 অনলাইন পাঠানো';

        logActivity('txn_create', '🏦 অন্য ব্যাংক লেনদেন',
          dirLabel + ' — ' + (BANKS[bank]?.name || bank), amount);

        close();
        toast('✅ সংরক্ষিত — ৳ ' + fmt(amount) + ' (' + dirLabel + ')', 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Other Bank loaded — v4.0 (with bank dropdown)');