/* ============================================================
   FILE: js/tx/tx-support.js — COMPLETE
   PURPOSE: সাপোর্ট + বকেয়া গ্রাহক list + one-click return
   VERSION: v4.0
   ============================================================ */
'use strict';

function openSupportForm(editId, prefill){
  var editing = editId ? DB.txs.find(function(t){ return t.id === editId; }) : null;
  var isAdmin = SESSION.role === 'admin';
  var initBranch = editing ? editing.branch : (isAdmin ? (VIEW_BRANCH === 'all' ? 'kalaroa' : VIEW_BRANCH) : SESSION.branch);
  var vault = DB.liveVault[initBranch] || {};

  var initDir = editing ? (editing.dir || 'out') : 'out';

  var preAcc = editing ? (editing.custAcc || '') : (prefill && prefill.custAcc || '');
  var preName = editing ? (editing.custName || '') : (prefill && prefill.custName || '');
  var preMobile = editing ? (editing.custMobile || '') : (prefill && prefill.custMobile || '');

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
        '<label style="display:block;font-size:12px;color:#ec4899;font-weight:800;margin-bottom:6px;text-transform:uppercase">ধরন</label>' +
        '<select id="f-dir" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(236,72,153,.5);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;cursor:pointer">' +
          '<option value="out"' + (initDir === 'out' ? ' selected' : '') + '>📤 সাপোর্ট প্রদান</option>' +
          '<option value="in"' + (initDir === 'in' ? ' selected' : '') + '>📥 সাপোর্ট ফেরত</option>' +
          '<option value="online_support_out"' + (initDir === 'online_support_out' ? ' selected' : '') + '>🌐 অনলাইন প্রদান</option>' +
          '<option value="online_support_in"' + (initDir === 'online_support_in' ? ' selected' : '') + '>🌐 অনলাইন ফেরত</option>' +
        '</select>' +
      '</div>' +

    '</div>' +

    // ═══ Info Banner ═══
    '<div id="support-info" style="padding:10px 14px;margin-bottom:14px;border-radius:10px;background:linear-gradient(145deg,rgba(236,72,153,.12),rgba(0,0,0,.3));border:1.5px solid rgba(236,72,153,.4)">' +
      '<div id="support-info-text" style="font-size:12px;color:#f9a8d4;font-weight:800;line-height:1.6">' +
        '💡 সাপোর্ট প্রদান — ভল্ট থেকে ক্যাশ বাদ যাবে' +
      '</div>' +
    '</div>' +

    // ═══ Customer Section ═══
    '<div class="field"><label>🔍 গ্রাহক খুঁজুন</label><input type="text" id="f-search" placeholder="নাম/অ্যাকাউন্ট/মোবাইল..." value="' + esc(preAcc) + '" autocomplete="off"></div>' +

    '<div class="form-row">' +
      '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="f-acc" value="' + esc(preAcc) + '" autocomplete="off"></div>' +
      '<div class="field"><label>নাম</label><input type="text" id="f-name" value="' + esc(preName) + '" autocomplete="off"></div>' +
      '<div class="field"><label>মোবাইল</label><input type="text" id="f-mobile" value="' + esc(preMobile) + '" autocomplete="off"></div>' +
    '</div>' +

    // ═══ NOTES box (for physical) ═══
    '<div id="sup-notes-box">' +
      '<div class="notes-cols">' +
        '<div class="notes-col out" id="sup-out-col">' +
          '<h4>💸 প্রদান (Out)</h4>' +
          denomRowHTML('out', editing && initDir === 'out' ? editing.notesOut : null, vault) +
          '<div class="sum-line"><span>মোট</span><b id="sum-out">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in" id="sup-in-col">' +
          '<h4>📥 গ্রহণ (In)</h4>' +
          denomRowHTML('in', editing && initDir === 'in' ? editing.notesIn : null, {}) +
          '<div class="sum-line"><span>মোট</span><b id="sum-in">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══ ONLINE box ═══
    '<div id="sup-online-box" style="display:none">' +
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.12),rgba(0,0,0,.3));border:1.5px solid rgba(59,130,246,.45);margin-bottom:14px">' +
        '<label style="display:block;font-size:12px;color:#93c5fd;font-weight:800;margin-bottom:8px;text-transform:uppercase">🌐 অনলাইন পরিমাণ</label>' +
        '<input type="text" inputmode="decimal" id="f-online-amount" value="' + (editing && (initDir === 'online_support_out' || initDir === 'online_support_in') ? (editing.amount || '') : '') + '" placeholder="0" style="width:100%;padding:12px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.5);color:#93c5fd;font-family:inherit;font-size:20px;font-weight:900;outline:none;letter-spacing:-.3px" autocomplete="off">' +
        '<div id="sup-online-hint" style="font-size:11.5px;color:#a5b4d8;margin-top:8px;font-weight:700;line-height:1.5">' +
          '💡 অনলাইন প্রদান — মাদার অ্যাকাউন্ট থেকে বাদ যাবে' +
        '</div>' +
      '</div>' +
    '</div>' +

    // ═══ মন্তব্য ═══
    '<div class="field"><label>📝 মন্তব্য</label>' +
      '<input type="text" id="f-note" value="' + esc(editing && editing.note || '') + '" autocomplete="off">' +
    '</div>' +

    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn green block" id="f-save">💾 সংরক্ষণ</button>' +
    '</div>' +

    // ═══════════════════════════════════════════════════════════
    // 🎯 বকেয়া গ্রাহক তালিকা (always visible)
    // ═══════════════════════════════════════════════════════════
    '<div id="support-due-list" style="margin-top:22px"></div>';

  openModal({
    title: '🤝 সাপোর্ট প্রদান/ফেরত',
    bodyHTML: body,
    wide: true,
    onMount: function(root, close){
      var branchSel = root.querySelector('#f-branch');
      var dirSel = root.querySelector('#f-dir');
      var notesBox = root.querySelector('#sup-notes-box');
      var onlineBox = root.querySelector('#sup-online-box');
      var onlineInput = root.querySelector('#f-online-amount');
      var infoText = root.querySelector('#support-info-text');
      var infoBox = root.querySelector('#support-info');
      var onlineHint = root.querySelector('#sup-online-hint');
      var sumOut = root.querySelector('#sum-out');
      var sumIn = root.querySelector('#sum-in');
      var accEl = root.querySelector('#f-acc');
      var nameEl = root.querySelector('#f-name');
      var mobileEl = root.querySelector('#f-mobile');
      var searchEl = root.querySelector('#f-search');
      var dueListEl = root.querySelector('#support-due-list');

      function getBranch(){
        return branchSel && branchSel.value ? branchSel.value : initBranch;
      }
      function getDir(){
        return dirSel ? dirSel.value : 'out';
      }
      function isOnline(){
        var d = getDir();
        return d === 'online_support_out' || d === 'online_support_in';
      }

      // ═══ Visibility ═══
      function updateVisibility(){
        var d = getDir();
        var online = isOnline();

        notesBox.style.display = online ? 'none' : 'block';
        onlineBox.style.display = online ? 'block' : 'none';

        var info = '';
        if(d === 'out') info = '💸 <b>সাপোর্ট প্রদান</b> — ভল্ট থেকে ক্যাশ নোট <span style="color:#f87171">- কমবে</span>';
        else if(d === 'in') info = '📥 <b>সাপোর্ট ফেরত</b> — ভল্টে ক্যাশ নোট <span style="color:#4ade80">+ যোগ হবে</span>';
        else if(d === 'online_support_out') info = '🌐 <b>অনলাইন প্রদান</b> — মাদার অ্যাকাউন্ট থেকে <span style="color:#f87171">- কমবে</span>';
        else info = '🌐 <b>অনলাইন ফেরত</b> — মাদার অ্যাকাউন্টে <span style="color:#4ade80">+ যোগ হবে</span>';
        infoText.innerHTML = info;

        if(d === 'out' || d === 'online_support_out'){
          infoBox.style.background = 'linear-gradient(145deg,rgba(220,38,38,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(220,38,38,.5)';
          infoText.style.color = '#fca5a5';
        } else {
          infoBox.style.background = 'linear-gradient(145deg,rgba(34,197,94,.12),rgba(0,0,0,.3))';
          infoBox.style.borderColor = 'rgba(34,197,94,.5)';
          infoText.style.color = '#86efac';
        }

        if(onlineHint){
          if(d === 'online_support_out'){
            onlineHint.innerHTML = '💡 অনলাইন প্রদান — মাদার অ্যাকাউন্ট থেকে বাদ যাবে';
            onlineHint.style.color = '#fca5a5';
          } else {
            onlineHint.innerHTML = '💡 অনলাইন ফেরত — মাদার অ্যাকাউন্টে যোগ হবে';
            onlineHint.style.color = '#86efac';
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

      // ═══════════════════════════════════════════════════════════
      // 🎯 বকেয়া গ্রাহক তালিকা RENDER
      // ═══════════════════════════════════════════════════════════
      function renderDueList(){
        var bf = getBranch();

        // Get all customers with due (paid > refund)
        var dueList = [];
        (DB.customers || []).forEach(function(c){
          if(bf !== 'all' && c.branch !== bf) return;
          var due = customerDue(c.accountNo);
          if(due.net > 0.01){
            dueList.push({
              accountNo: c.accountNo,
              name: c.name,
              mobile: c.mobile || '',
              branch: c.branch,
              paid: due.paid,
              refund: due.refund,
              net: due.net
            });
          }
        });

        dueList.sort(function(a, b){ return b.net - a.net; });

        var totalDue = dueList.reduce(function(s, c){ return s + c.net; }, 0);

        var html = '';

        // Header
        html += '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(250,204,21,.1),rgba(0,0,0,.35));border:1.5px solid rgba(250,204,21,.4)">';

        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
          '<span style="font-size:14px;color:#facc15;font-weight:900">🎯 বকেয়া গ্রাহক তালিকা</span>' +
          (dueList.length > 0
            ? '<span style="padding:3px 10px;border-radius:6px;background:rgba(250,204,21,.2);border:1px solid rgba(250,204,21,.4);color:#facc15;font-size:11.5px;font-weight:800">' + toBn(dueList.length) + ' জন</span>' +
              '<span style="margin-left:auto;font-size:14px;color:#f87171;font-weight:900">মোট: ৳ ' + fmt(totalDue) + '</span>'
            : '<span style="padding:3px 10px;border-radius:6px;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.4);color:#4ade80;font-size:11.5px;font-weight:800">✅ সব পরিশোধিত</span>') +
        '</div>';

        if(!dueList.length){
          html += '<div style="padding:20px;text-align:center;color:#7a8ab8;font-size:12.5px">🎉 এই আউটলেটে কোনো বকেয়া নেই</div>';
          html += '</div>';
          dueListEl.innerHTML = html;
          return;
        }

        // Info hint
        html += '<div style="padding:8px 12px;margin-bottom:10px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);font-size:11.5px;color:#4ade80;font-weight:700">' +
          '💡 যেকোনো গ্রাহকের উপর click করলে ফর্মে auto-fill হবে (ফেরত mode)' +
        '</div>';

        // Table
        html += '<div class="table-wrap" style="max-height:280px;overflow-y:auto">' +
          '<table><thead><tr>' +
            '<th style="width:40px;text-align:center">#</th>' +
            '<th>গ্রাহক</th>' +
            '<th>আউটলেট</th>' +
            '<th style="text-align:right">প্রদান</th>' +
            '<th style="text-align:right">ফেরত</th>' +
            '<th style="text-align:right">বকেয়া</th>' +
            '<th style="text-align:center">অ্যাকশন</th>' +
          '</tr></thead><tbody>';

        dueList.forEach(function(c, i){
          html += '<tr class="support-due-row" data-acc="' + esc(c.accountNo) + '" data-name="' + esc(c.name) + '" data-mobile="' + esc(c.mobile) + '" style="cursor:pointer">' +
            '<td style="text-align:center;color:#7a8ab8;font-weight:800;font-size:11.5px">' + toBn(i + 1) + '</td>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
                '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(145deg,rgba(236,72,153,.2),rgba(167,139,250,.1));border:1px solid rgba(236,72,153,.4);display:grid;place-items:center;flex-shrink:0;font-size:12px">👤</div>' +
                '<div style="min-width:0">' +
                  '<div style="color:#ec4899;font-weight:800;font-size:12.5px">' + esc(c.name) + '</div>' +
                  (c.accountNo ? '<div style="font-size:10px;color:#93c5fd;font-family:monospace">' + esc(c.accountNo) + '</div>' : '') +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td style="font-size:11.5px">' + esc(BRANCHES[c.branch]?.name || '—') + '</td>' +
            '<td class="amt" style="color:#93c5fd;font-size:12.5px">৳ ' + fmt(c.paid) + '</td>' +
            '<td class="amt" style="color:#4ade80;font-size:12.5px">৳ ' + fmt(c.refund) + '</td>' +
            '<td class="amt" style="color:#f87171;font-weight:900;font-size:13px">৳ ' + fmt(c.net) + '</td>' +
            '<td style="text-align:center">' +
              '<button class="mini accept" style="padding:4px 10px;font-size:11px">📥 ফেরত</button>' +
            '</td>' +
          '</tr>';
        });

        html += '</tbody></table></div>';
        html += '</div>';

        dueListEl.innerHTML = html;

        // ═══ Row click handlers ═══
        dueListEl.querySelectorAll('.support-due-row').forEach(function(tr){
          tr.addEventListener('click', function(){
            var acc = tr.dataset.acc;
            var name = tr.dataset.name;
            var mobile = tr.dataset.mobile;

            // Auto-fill form
            accEl.value = acc || '';
            nameEl.value = name || '';
            mobileEl.value = mobile || '';

            // Switch to "ফেরত" (in) mode
            if(dirSel){
              dirSel.value = 'in';
              updateVisibility();
            }

            // Scroll to top of modal
            var modalBody = root;
            if(modalBody){
              modalBody.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // Focus first notes input
            setTimeout(function(){
              var firstInput = root.querySelector('#in_1000');
              if(firstInput) firstInput.focus();
            }, 300);

            // Toast
            toast('👤 ' + name + ' selected — ফেরত mode', 'ok');
          });
        });
      }

      // ═══ Initial render ═══
      renderDueList();

      // ═══ Re-render when branch changes ═══
      if(branchSel){
        branchSel.addEventListener('change', function(){
          setTimeout(renderDueList, 100);
        });
      }

      // ═══════════════════════════════════════════════════════════
      // SAVE
      // ═══════════════════════════════════════════════════════════
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
        var online = isOnline();

        var amount = 0;
        var nIn = {};
        var nOut = {};
        var onlineAmt = 0;

        if(online){
          onlineAmt = parseNum(onlineInput.value);
          amount = onlineAmt;
          if(amount <= 0){ alert('⚠️ অনলাইন পরিমাণ দিন'); return; }

          if(dir === 'online_support_out'){
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

          if(dir === 'out'){
            amount = outSum;
            if(amount <= 0){ alert('⚠️ প্রদান নোট দিন'); return; }

            var v = DB.liveVault[branch] || {};
            var miss = [];
            Object.keys(nOut).forEach(function(d){
              if((nOut[d] || 0) > (v[d] || 0)) miss.push('৳' + d);
            });
            if(miss.length){
              alert('🚫 ভল্টে কম: ' + miss.join(', '));
              return;
            }
          } else if(dir === 'in'){
            amount = inSum;
            if(amount <= 0){ alert('⚠️ ফেরত নোট দিন'); return; }
          }
        }

        if(!custName || !custAcc){
          alert('⚠️ গ্রাহকের নাম ও অ্যাকাউন্ট দিন');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spin"></span>';

        var tx = {
          id: editing ? editing.id : uid(),
          type: 'support',
          date: date,
          branch: branch,
          custBranch: branch,
          dir: dir,
          amount: Math.round(amount * 100) / 100,
          onlineAmount: online ? Math.round(onlineAmt * 100) / 100 : null,
          notesOut: online ? {} : nOut,
          notesIn: online ? {} : nIn,
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

        if(typeof upsertCustomer === 'function'){
          upsertCustomer({ accountNo: custAcc, name: custName, mobile: custMobile, branch: branch });
        }

        var dirLabel = (dir === 'out') ? '💸 প্রদান' :
                       (dir === 'in') ? '📥 ফেরত' :
                       (dir === 'online_support_out') ? '🌐 অনলাইন প্রদান' :
                       '🌐 অনলাইন ফেরত';

        logActivity('txn_create', '🤝 সাপোর্ট', custName + ' — ' + dirLabel, amount);

        close();
        toast('✅ সাপোর্ট — ৳ ' + fmt(amount) + ' (' + dirLabel + ')', 'ok');

        DB.__updated = new Date().toISOString();
        saveLocal();
        recomputeLive();
        renderDashboard();
        pushCloud();
      });
    }
  });
}

console.log('✅ Support loaded — v4.0 (due list + one-click return)');