/* ============================================================
   FILE: js/05-customer.js
   PURPOSE: Customer Management + Due
   ============================================================ */
'use strict';

function upsertCustomer(data){
  if(!data) return null;
  let c = DB.customers.find(x => (data.accountNo && x.accountNo === data.accountNo));
  if(c){
    if(data.name) c.name = data.name;
    if(data.mobile) c.mobile = data.mobile;
    if(data.branch) c.branch = data.branch;
    c.updatedAt = new Date().toISOString();
    return c;
  }
  c = {
    id: uid(),
    accountNo: data.accountNo || ('ACC' + Date.now().toString(36).slice(-6)),
    name: data.name || 'অজ্ঞাত',
    mobile: data.mobile || '',
    branch: data.branch || 'kalaroa',
    createdAt: new Date().toISOString()
  };
  DB.customers.push(c);
  return c;
}

function getCustomerTxs(acc){
  return DB.txs.filter(t => t.custAcc && String(t.custAcc).trim() === String(acc).trim())
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function customerDue(acc){
  const txs = getCustomerTxs(acc).filter(t => t.type === 'support');
  let paid = 0, refund = 0;
  txs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if(t.dir === 'out' || t.dir === 'online_support_out') paid += amt;
    else refund += amt;
  });
  return { paid, refund, net: paid - refund };
}

function openCustomerList(){
  if(!SESSION) return;

  var currentQuery = '';
  var currentBranch = 'all';   // ⚡ নতুন — outlet filter

  function renderList(){
    var list = DB.customers.slice();

    // ⚡ Outlet filter
    if(currentBranch !== 'all'){
      list = list.filter(function(c){ return c.branch === currentBranch; });
    }

    // ⚡ Search filter
    if(currentQuery){
      var q = currentQuery.toLowerCase();
      list = list.filter(function(c){
        var name = String(c.name || '').toLowerCase();
        var acc = String(c.accountNo || '').toLowerCase();
        var mob = String(c.mobile || '').toLowerCase();
        return name.indexOf(q) !== -1 || acc.indexOf(q) !== -1 || mob.indexOf(q) !== -1;
      });
    }

    var totalCount = list.length;

    var html = '';

    // ═══ Search + Outlet Filter Row ═══
    html += '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:10px">' +
      '<input type="text" id="cust-search-input" placeholder="🔍 নাম / অ্যাকাউন্ট / মোবাইল..." value="' + esc(currentQuery) + '" autocomplete="off" style="padding:11px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none">' +
      '<select id="cust-branch-filter" style="padding:11px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(34,197,94,.4);color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;outline:none;cursor:pointer;white-space:nowrap">' +
        '<option value="all"' + (currentBranch === 'all' ? ' selected' : '') + '>🌐 সব আউটলেট</option>' +
        Object.entries(BRANCHES).map(function(e){
          return '<option value="' + e[0] + '"' + (currentBranch === e[0] ? ' selected' : '') + '>🏦 ' + e[1].name + '</option>';
        }).join('') +
      '</select>' +
    '</div>';

    // ═══ Status ═══
    var statusParts = [];
    if(currentBranch !== 'all'){
      statusParts.push('🏦 ' + (BRANCHES[currentBranch]?.name || currentBranch));
    }
    if(currentQuery){
      statusParts.push('🔍 "' + currentQuery + '"');
    }
    var statusText = statusParts.length
      ? statusParts.join(' • ') + ' — ' + toBn(totalCount) + ' জন'
      : 'মোট ' + toBn(totalCount) + ' জন গ্রাহক';

    html += '<div style="font-size:11.5px;color:#7a8ab8;margin-bottom:10px;font-weight:700;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<span>' + statusText + '</span>' +
      ((currentQuery || currentBranch !== 'all') ?
        '<button type="button" id="cust-clear-filter" style="padding:3px 10px;border-radius:6px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer">✕ Clear</button>'
        : '') +
    '</div>';

    // ═══ List ═══
    if(!list.length){
      html += '<div class="empty" style="padding:30px 20px;text-align:center;color:#7a8ab8">' +
        (currentQuery || currentBranch !== 'all' ? '❌ কোনো গ্রাহক পাওয়া যায়নি' : '📭 কোনো গ্রাহক নেই') +
      '</div>';
    } else {
      html += '<div class="table-wrap" style="max-height:50vh;overflow-y:auto"><table><thead><tr>' +
        '<th style="width:40px;text-align:center">#</th>' +
        '<th>নাম</th>' +
        '<th>অ্যাকাউন্ট</th>' +
        '<th>মোবাইল</th>' +
        '<th>আউটলেট</th>' +
        '<th style="text-align:right">বকেয়া</th>' +
        '<th style="text-align:center">অ্যাকশন</th>' +
      '</tr></thead><tbody>';

      list.slice(0, 200).forEach(function(c, i){
        var due = (typeof customerDue === 'function') ? customerDue(c.accountNo).net : 0;
        var dueBadge = due > 0
          ? '<span style="color:#f87171;font-weight:900">৳ ' + fmt(due) + '</span>'
          : '<span style="color:#4ade80">✅</span>';

        html += '<tr class="clickable" data-cust="' + esc(c.accountNo) + '" data-cust-name="' + esc(c.name) + '" style="cursor:pointer">' +
          '<td style="text-align:center;color:#7a8ab8;font-weight:800;font-size:11.5px">' + toBn(i + 1) + '</td>' +
          '<td><b style="color:#4ade80">' + esc(c.name) + '</b></td>' +
          '<td style="font-family:monospace;color:#93c5fd;font-size:12px">' + esc(c.accountNo) + '</td>' +
          '<td style="font-size:12px">' + (c.mobile ? '📱 ' + esc(c.mobile) : '—') + '</td>' +
          '<td style="font-size:11.5px">' + esc(BRANCHES[c.branch]?.name || '—') + '</td>' +
          '<td class="amt" style="text-align:right;font-size:13px">' + dueBadge + '</td>' +
          '<td style="text-align:center">' +
            (SESSION.role === 'admin' ? '<button class="mini danger" data-del="' + c.id + '" style="padding:4px 9px;font-size:11px">🗑️</button>' : '') +
          '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div>';

      if(list.length > 200){
        html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ২০০ জন (মোট ' + toBn(list.length) + ')</div>';
      }
    }

    return html;
  }

  var m = openModal({
    title: '👥 গ্রাহক তালিকা',
    bodyHTML:
      // ═══ Add Customer Form ═══
      '<div style="padding:12px;border-radius:12px;background:rgba(59,130,246,.06);border:1.5px solid rgba(59,130,246,.3);margin-bottom:14px">' +
        '<div style="font-size:12.5px;color:#93c5fd;font-weight:800;margin-bottom:8px">➕ নতুন গ্রাহক</div>' +
        '<div class="form-row">' +
          '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="nc-acc" autocomplete="off"></div>' +
          '<div class="field"><label>নাম *</label><input type="text" id="nc-name" autocomplete="off"></div>' +
          '<div class="field"><label>মোবাইল</label><input type="text" id="nc-mobile" autocomplete="off"></div>' +
          '<div class="field"><label>আউটলেট</label><select id="nc-branch">' +
            Object.entries(BRANCHES).map(function(e){ return '<option value="' + e[0] + '">' + e[1].name + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<button class="btn green block" id="nc-save" style="margin-top:8px">💾 যোগ করুন</button>' +
      '</div>' +
      // ═══ List Container ═══
      '<div id="cust-list-container"></div>',
    wide: true
  });

  setTimeout(function(){
    var root = m.bg.querySelector('.modal-body');
    var container = root.querySelector('#cust-list-container');

    function wireEvents(){
      // Row click → detail
      container.querySelectorAll('tr[data-cust]').forEach(function(tr){
        tr.addEventListener('click', function(e){
          if(e.target.closest('button')) return;
          var acc = tr.dataset.cust;
          if(acc && typeof openCustomerDetail === 'function'){
            openCustomerDetail(acc);
          }
        });
      });

      // Delete button
      container.querySelectorAll('[data-del]').forEach(function(b){
        b.addEventListener('click', function(e){
          e.stopPropagation();
          if(!confirm('🗑️ এই গ্রাহক ডিলিট করবেন?')) return;
          var cid = b.dataset.del;
          var c = DB.customers.find(function(x){ return x.id === cid; });
          if(!c) return;

          if(!DB.deletedCustomerIds) DB.deletedCustomerIds = {};
          if(!DB.deletedCustomerAccounts) DB.deletedCustomerAccounts = {};
          if(!DB.deletedTxIds) DB.deletedTxIds = {};
          DB.deletedCustomerIds[c.id] = new Date().toISOString();
          if(c.accountNo) DB.deletedCustomerAccounts[c.accountNo] = new Date().toISOString();

          DB.customers = DB.customers.filter(function(x){ return x.id !== cid; });
          DB.txs.forEach(function(t){
            if(t.custAcc === c.accountNo){
              DB.deletedTxIds[t.id] = new Date().toISOString();
            }
          });
          DB.txs = DB.txs.filter(function(t){ return t.custAcc !== c.accountNo; });

          if(typeof logActivity === 'function'){
            logActivity('user_delete', '🗑️ গ্রাহক ডিলিট', c.name);
          }
          DB.__updated = new Date().toISOString();
          if(typeof saveLocal === 'function') saveLocal();
          if(typeof recomputeLive === 'function') recomputeLive();
          if(typeof renderDashboard === 'function') renderDashboard();
          if(typeof pushCloud === 'function') pushCloud();

          refresh();
          if(typeof toast === 'function') toast('🗑️ ডিলিট', 'ok');
        });
      });

      // ⚡ Branch filter change
      var branchFilter = container.querySelector('#cust-branch-filter');
      if(branchFilter){
        branchFilter.addEventListener('change', function(e){
          currentBranch = e.target.value;
          refresh();
        });
      }

      // ⚡ Clear filter button
      var clearBtn = container.querySelector('#cust-clear-filter');
      if(clearBtn){
        clearBtn.addEventListener('click', function(){
          currentQuery = '';
          currentBranch = 'all';
          refresh();
        });
      }
    }

    function refresh(){
      container.innerHTML = renderList();
      wireEvents();

      // ⚡ Focus preservation on search
      var si = container.querySelector('#cust-search-input');
      if(si && currentQuery){
        si.focus();
        si.setSelectionRange(si.value.length, si.value.length);
      }
    }

    // ⚡ Search with debounce
    var searchTimer = null;
    container.addEventListener('input', function(e){
      if(e.target && e.target.id === 'cust-search-input'){
        var val = e.target.value;
        if(searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function(){
          currentQuery = val.trim();
          refresh();
        }, 250);
      }
    });

    // ⚡ Initial
    refresh();

    // ⚡ Add customer
    root.querySelector('#nc-save').addEventListener('click', function(){
      var name = root.querySelector('#nc-name').value.trim();
      if(!name){
        alert('⚠️ নাম দিন');
        return;
      }

      var acc = root.querySelector('#nc-acc').value.trim();
      var mobile = root.querySelector('#nc-mobile').value.trim();
      var branch = root.querySelector('#nc-branch').value;

      if(typeof upsertCustomer === 'function'){
        upsertCustomer({
          accountNo: acc,
          name: name,
          mobile: mobile,
          branch: branch
        });
      }

      if(typeof logActivity === 'function'){
        logActivity('user_add', '👥 গ্রাহক যোগ', name);
      }

      DB.__updated = new Date().toISOString();
      if(typeof saveLocal === 'function') saveLocal();
      if(typeof pushCloud === 'function') pushCloud();

      root.querySelector('#nc-acc').value = '';
      root.querySelector('#nc-name').value = '';
      root.querySelector('#nc-mobile').value = '';

      currentQuery = '';
      refresh();
      if(typeof toast === 'function') toast('✅ যোগ হয়েছে', 'ok');
    });

  }, 50);
}

function openCustomerDetail(acc){
  const c = DB.customers.find(x => x.accountNo === acc);
  const txs = getCustomerTxs(acc);
  const due = customerDue(acc);

  let rows = '';
  txs.slice().reverse().forEach(t => {
    const cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<span style="font-size:11px;color:#93c5fd;font-style:italic">📝 ' + esc(noteText) + '</span>' :
      '<span style="color:#4a5878;font-size:10.5px">—</span>';

    var canEdit = (typeof canEditTx === 'function') ? canEditTx(t) : false;
    var canDel = (SESSION && SESSION.role === 'admin');
    var actionBtns = '<button class="mini" data-cust-tx-view="' + t.id + '" title="বিস্তারিত">👁️</button>';
    if(canEdit){
      actionBtns += ' <button class="mini" data-cust-tx-edit="' + t.id + '" title="এডিট">✏️</button>';
    }
    if(canDel){
      actionBtns += ' <button class="mini danger" data-cust-tx-del="' + t.id + '" title="ডিলিট">🗑️</button>';
    }

    rows += '<tr data-tx-row="' + t.id + '">' +
      '<td style="white-space:nowrap;font-size:12px">' + toBn(t.date) + '</td>' +
      '<td style="font-size:12.5px">' + cfg.icon + ' ' + esc(cfg.title) + '</td>' +
      '<td style="max-width:180px">' + noteHtml + '</td>' +
      '<td class="amt" style="color:#4ade80">৳ ' + fmt(t.amount) + '</td>' +
      '<td style="font-size:10.5px;color:#7a8ab8">' + esc(t.user || '—') + '</td>' +
      '<td style="white-space:nowrap">' + actionBtns + '</td>' +
    '</tr>';
  });


  openModal({
    title: '👤 ' + esc(c ? c.name : acc),
    bodyHTML:
      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(0,0,0,.2));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
        '<div style="font-size:13px;color:#a5b4d8;line-height:2">' +
          '<div>🆔 <b style="color:#fff">' + esc(acc) + '</b></div>' +
          '<div>📱 <b style="color:#fff">' + esc(c?.mobile || '—') + '</b></div>' +
          '<div>🏦 <b style="color:#fff">' + esc(BRANCHES[c?.branch]?.name || '—') + '</b></div>' +
        '</div></div>' +
      (due.net > 0 ?
        '<div style="padding:14px;border-radius:12px;background:rgba(220,38,38,.15);border:1.5px solid rgba(220,38,38,.5);margin-bottom:14px">' +
          '<div style="font-size:12px;color:#fca5a5;font-weight:800">⚠️ বকেয়া</div>' +
          '<div style="font-size:22px;color:#fff;font-weight:900">৳ ' + fmt(due.net) + '</div></div>'
        : '<div style="padding:12px;border-radius:12px;background:rgba(34,197,94,.15);border:1.5px solid rgba(34,197,94,.5);color:#4ade80;font-weight:900;text-align:center;margin-bottom:14px">✅ বকেয়া নেই</div>') +
      (rows ?
        '<div class="section-title" style="font-size:13px;margin-bottom:8px"><span class="bar" style="height:16px"></span> লেনদেন (' + toBn(txs.length) + ')</div>' +
        '<div class="table-wrap" style="max-height:400px;overflow-y:auto"><table><thead><tr><th>তারিখ</th><th>ধরন</th><th>📝 মন্তব্য</th><th>টাকা</th><th>ইউজার</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">📭 লেনদেন নেই</div>'),
    wide: true
  });
}

function openDueList(){
  const bf = currentBranch();
  const list = DB.customers.filter(c => {
    if(bf !== 'all' && c.branch !== bf) return false;
    return customerDue(c.accountNo).net > 0;
  });
  let rows = '';
  list.forEach((c, i) => {
    const d = customerDue(c.accountNo);
    rows += '<tr class="clickable" data-cust="' + esc(c.accountNo) + '">' +
      '<td>' + toBn(i + 1) + '</td>' +
      '<td><b style="color:#ec4899">' + esc(c.name) + '</b></td>' +
      '<td style="font-family:monospace;color:#93c5fd">' + esc(c.accountNo) + '</td>' +
      '<td class="amt" style="color:#f87171">৳ ' + fmt(d.net) + '</td></tr>';
  });
  openModal({
    title: '🤝 সাপোর্ট বকেয়া',
    bodyHTML: list.length ?
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>নাম</th><th>অ্যাকাউন্ট</th><th>বকেয়া</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty">🎉 কোনো বকেয়া নেই</div>',
    wide: true,
    onMount: (root) => {
      root.querySelectorAll('tr[data-cust]').forEach(tr => {
        tr.addEventListener('click', () => openCustomerDetail(tr.dataset.cust));
      });
    }
  });
}