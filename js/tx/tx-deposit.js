/* ============================================================
   FILE: js/tx/tx-deposit.js — COMPLETE
   PURPOSE: নগদ/অনলাইনে জমা — with customer
   VERSION: v3.0
   ============================================================ */
'use strict';

function openDepositForm(editId, prefill){
  var editing = editId ? DB.txs.find(function(t){ return t.id === editId; }) : null;
  var isAdmin = SESSION.role === 'admin';
  var initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  var vault = DB.liveVault[initBranch] || {};
  var initDir = 'cash';
  if(editing){
    initDir = (editing.depositType === 'online' || editing.dir === 'online') ? 'online' : 'cash';
  }

  var preAcc = editing ? (editing.custAcc || '') : (prefill && prefill.custAcc || '');
  var preName = editing ? (editing.custName || '') : (prefill && prefill.custName || '');
  var preMobile = editing ? (editing.custMobile || '') : (prefill && prefill.custMobile || '');

  var body =
    // ═══ Top Row: তারিখ + আউটলেট + ধরন ═══
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +

      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">তারিখ</label>' +
        '<input type="date" id="f-date" value="' + (editing ? editing.date : DASH_DATE) + '" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none">' +
      '</div>' +

      '<div>' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">আউটলেট</label>' +
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
        '<label style="display:block;font-size:12px;color:#22c55e;font-weight:800;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">ধরন</label>' +
        '<select id="f-dep-type" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(34,197,94,.5);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;cursor:pointer">' +
          '<option value="cash"' + (initDir === 'cash' ? ' selected' : '') + '>💵 ক্যাশ</option>' +
          '<option value="online"' + (initDir === 'online' ? ' selected' : '') + '>🌐 অনলাইন</option>' +
        '</select>' +
      '</div>' +

    '</div>' +

    // ═══ Customer Section ═══
    '<div class="field"><label>🔍 গ্রাহক খুঁজুন</label><input type="text" id="f-search" placeholder="নাম/অ্যাকাউন্ট/মোবাইল..." value="' + esc(preAcc) + '" autocomplete="off"></div>' +

    '<div class="form-row">' +
      '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f-acc" value="' + esc(preAcc) + '" autocomplete="off"></div>' +
      '<div class="field"><label>নাম</label><input type="text" id="f-name" value="' + esc(preName) + '" autocomplete="off"></div>' +
      '<div class="field"><label>মোবাইল</label><input type="text" id="f-mobile" value="' + esc(preMobile) + '" autocomplete="off"></div>' +
    '</div>' +

    // ═══ CASH box ═══
    '<div id="dep-cash-box">' +
      '<div class="notes-col in" style="margin-bottom:14px">' +
        '<h4>💵 ক্যাশ জমা</h4>' +
        denomRowHTML('in', editing && initDir === 'cash' ? editing.notesIn : null, {}) +
        '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div>' +
      '</div>' +
    '</div>' +

    // ═══ ONLINE box ═══
    '<div id="dep-online-box" style="display:none">' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(167,139,250,.12),rgba(0,0,0,.3));border:1.5px solid rgba(167,139,250,.45);margin-bottom:14px">' +
        '<label style="display:block;font-size:12px;color:#c4b5fd;font-weight:800;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">🌐 অনলাইন পরিমাণ</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amount" value="' + (editing && initDir === 'online' ? (editing.amount || '') : '') + '" placeholder="0" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(167,139,250,.5);color:#c4b5fd;font-family:inherit;font-size:20px;font-weight:900;outline:none;letter-spacing:-.3px" autocomplete="off">' +
        '<div style="font-size:11.5px;color:#a5b4d8;margin-top:8px;font-weight:700;line-height:1.5">' +
          '💡 অনলাইন জমা — 🏦 মাদার অ্যাকাউন্ট থেকে বাদ যাবে' +
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
    title: '🏦 নগদ/অনলাইনে জমা',
    bodyHTML: body,
    wide: true,
    onMount: function(root, close){
      var branchSel = root.querySelector('#f-branch');
      var typeSel = root.querySelector('#f-dep-type');
      var cashBox = root.querySelector('#dep-cash-box');
      var onlineBox = root.querySelector('#dep-online-box');
      var onlineInput = root.querySelector('#f-online-amount');
      var sumIn = root.querySelector('#sum-in');
      var accEl = root.querySelector('#f-acc');
      var nameEl = root.querySelector('#f-name');
      var mobileEl = root.querySelector('#f-mobile');
      var searchEl = root.querySelector('#f-search');

      function getBranch(){
        return branchSel && branchSel.value ? branchSel.value : initBranch;
      }
      function getDir(){
        return typeSel ? typeSel.value : 'cash';
      }

      function updateVisibility(){
        var t = getDir();
        cashBox.style.display = (t === 'cash') ? 'block' : 'none';
        onlineBox.style.display = (t === 'online') ? 'block' : 'none';
      }

      function recalc(){
        var nIn = readNotes(root, 'in');
        if(sumIn) sumIn.textContent = '৳ ' + fmt(sumNotes(nIn));
      }

      if(onlineInput) attachAmountInput(onlineInput);
      setupDenomInputs(root, 'in', getBranch, recalc);
      if(typeSel) typeSel.addEventListener('change', updateVisibility);
      updateVisibility();
      recalc();

      // ═══ Customer search ═══
      if(searchEl){
        searchEl.addEventListener('input', function(){
          var q = searchEl.value.trim().toLowerCase();
          if(!q) return;
          var c = DB.customers.find(function(x){
            return String(x.accountNo || '').toLowerCase() === q ||
              String(x.name || '').toLowerCase().indexOf(q) !== -1 ||
              String(x.mobile || '').indexOf(q) !== -1;
          });
          if(c){
            accEl.value = c.accountNo || '';
            nameEl.value = c.name || '';
            mobileEl.value = c.mobile || '';
          }
        });
      }

      // ═══ SAVE ═══
      root.querySelector('#f-save').addEventListener('click', async function(){
        var btn = root.querySelector('#f-save');
        if(btn.disabled) return;

        var date = root.querySelector('#f-date').value || todayStr();
        var branch = getBranch();
        var dir = getDir();
        var note = root.querySelector('#f-note').value.trim();
        var custAcc = accEl.value.trim();
        var custName = nameEl.value.trim();
        var custMobile = mobileEl.value.trim();

        var amount = 0;
        var nIn = {};
        var onlineAmt = 0;

        if(dir === 'cash'){
          nIn = readNotes(root, 'in');
          amount = sumNotes(nIn);
          if(amount <= 0){ alert('⚠️ নোট দিন'); return; }
        } else {
          onlineAmt = parseNum(onlineInput.value);
          amount = onlineAmt;
          if(amount <= 0){ alert('⚠️ অনলাইন পরিমাণ দিন'); return; }
        }

        if(!custName || !custAcc){
          alert('⚠️ গ্রাহকের নাম ও অ্যাকাউন্ট দিন');
          return;
        }

        // Mother account check for online
        if(dir === 'online'){
          var bank = Number(DB.liveAccounts[branch]?.bank) || 0;
          if(bank < amount){
            alert('🚫 মাদার অ্যাকাউন্টে পর্যাপ্ত নেই (আছে ৳ ' + fmt(bank) + ')');
            return;
          }
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        var tx = {
          id: editing ? editing.id : uid(),
          type: 'deposit',
          date: date,
          branch: branch,
          custBranch: branch,
          dir: dir,
          depositType: dir,
          amount: Math.round(amount * 100) / 100,
          onlineAmount: dir === 'online' ? Math.round(onlineAmt * 100) / 100 : null,
          notesOut: {},
          notesIn: dir === 'cash' ? nIn : {},
          custAcc: custAcc,
          custName: custName,
          custMobile: custMobile,
          note: note,
          user: SESSION.name,
          createdAt: editing ? editing.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if(!editing) DB.txs.push(tx);
        else {
          var i = DB.txs.findIndex(function(x){ return x.id === editing.id; });
          if(i >= 0) DB.txs[i] = tx;
        }

        // Upsert customer
        if(typeof upsertCustomer === 'function'){
          upsertCustomer({ accountNo: custAcc, name: custName, mobile: custMobile, branch: branch });
        }

        logActivity('txn_create', '🏦 নগদ/অনলাইনে জমা', custName + ' — ' + (dir === 'online' ? '🌐 অনলাইন' : '💵 ক্যাশ'), amount);

        close();
        toast('✅ জমা — ৳ ' + fmt(amount), 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Deposit loaded — v3.0 (with customer)');