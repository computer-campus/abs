/* ============================================================
   FILE: js/05-customer.js — COMPLETE FRESH
   PURPOSE: Customer + Due + Detail popup with working buttons
   VERSION: v4.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   CUSTOMER CRUD
   ═══════════════════════════════════════════════════════════ */
function upsertCustomer(data){
  if(!data) return null;
  if(!DB.customers) DB.customers = [];

  var c = DB.customers.find(function(x){
    return (data.accountNo && x.accountNo === data.accountNo);
  });

  if(c){
    if(data.name) c.name = data.name;
    if(data.mobile) c.mobile = data.mobile;
    if(data.address) c.address = data.address;
    if(data.branch) c.branch = data.branch;
    c.updatedAt = new Date().toISOString();
    return c;
  }

  c = {
    id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    accountNo: data.accountNo || ('ACC' + Date.now().toString(36).slice(-6)),
    name: data.name || 'অজ্ঞাত',
    mobile: data.mobile || '',
    address: data.address || '',
    branch: data.branch || 'kalaroa',
    createdAt: new Date().toISOString()
  };
  DB.customers.push(c);
  return c;
}

function searchCustomers(q){
  q = String(q || '').trim().toLowerCase();
  if(!q) return [];
  var results = [];
  var list = DB.customers || [];
  for(var i = 0; i < list.length && results.length < 10; i++){
    var c = list[i];
    if((c.accountNo || '').toLowerCase().indexOf(q) !== -1 ||
       (c.name || '').toLowerCase().indexOf(q) !== -1 ||
       (c.mobile || '').indexOf(q) !== -1){
      results.push(c);
    }
  }
  return results;
}

function getCustomerAllTxs(accountNo){
  if(!accountNo) return [];
  var acc = String(accountNo).trim();
  var all = (typeof getAllTxs === 'function') ? getAllTxs() : (DB.txs || []);
  var result = [];
  for(var i = 0; i < all.length; i++){
    var t = all[i];
    if(t && t.custAcc && String(t.custAcc).trim() === acc){
      result.push(t);
    }
  }
  result.sort(function(a, b){
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
  return result;
}

function customerDue(accountNo){
  var txs = getCustomerAllTxs(accountNo).filter(function(t){ return t.type === 'support'; });
  var paid = 0, refund = 0;
  txs.forEach(function(t){
    var amt = Number(t.amount) || 0;
    if(t.dir === 'out' || t.dir === 'online_support_out') paid += amt;
    else refund += amt;
  });
  return { paid: paid, refund: refund, net: paid - refund };
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER LIST
   ═══════════════════════════════════════════════════════════ */
function openCustomerList(){
  if(!SESSION) return;

  var currentQuery = '';
  var currentBranch = 'all';

  function renderList(){
    var list = (DB.customers || []).slice();

    if(currentBranch !== 'all'){
      list = list.filter(function(c){ return c.branch === currentBranch; });
    }

    if(currentQuery){
      var q = currentQuery.toLowerCase();
      list = list.filter(function(c){
        return (c.name || '').toLowerCase().indexOf(q) !== -1 ||
               (c.accountNo || '').toLowerCase().indexOf(q) !== -1 ||
               (c.mobile || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    var html = '';

    // ═══ Search + Branch filter ═══
    html += '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:10px">' +
      '<input type="text" id="cust-search" placeholder="🔍 নাম / অ্যাকাউন্ট / মোবাইল..." value="' + esc(currentQuery) + '" autocomplete="off" style="padding:11px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:14px;font-weight:700;outline:none;box-sizing:border-box">' +
      '<select id="cust-branch-filter" style="padding:11px 14px;border-radius:11px;background:#050810;border:1.5px solid rgba(34,197,94,.4);color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;outline:none;cursor:pointer;box-sizing:border-box">' +
        '<option value="all"' + (currentBranch === 'all' ? ' selected' : '') + '>🌐 সব আউটলেট</option>' +
        Object.entries(BRANCHES).map(function(e){
          return '<option value="' + e[0] + '"' + (currentBranch === e[0] ? ' selected' : '') + '>🏦 ' + e[1].name + '</option>';
        }).join('') +
      '</select>' +
    '</div>';

    // ═══ Count ═══
    html += '<div style="padding:8px 12px;margin-bottom:10px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);font-size:12px;color:#93c5fd;font-weight:800;display:flex;justify-content:space-between;align-items:center">' +
      '<span>📊 ' + (currentQuery ? '"' + esc(currentQuery) + '" — ' : '') + toBn(list.length) + ' জন গ্রাহক</span>' +
      ((currentQuery || currentBranch !== 'all') ? '<button type="button" id="cust-clear" style="padding:3px 10px;border-radius:6px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer">✕ Clear</button>' : '') +
    '</div>';

    if(!list.length){
      html += '<div style="padding:30px;text-align:center;color:#7a8ab8;font-size:13px">📭 কোনো গ্রাহক নেই</div>';
      return html;
    }

    html += '<div style="max-height:50vh;overflow-y:auto;border-radius:10px;border:1px solid rgba(59,130,246,.15)">' +
      '<table style="width:100%;border-collapse:collapse">' +
      '<thead><tr>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">#</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">নাম</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">অ্যাকাউন্ট</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">মোবাইল</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">আউটলেট</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:right;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">বকেয়া</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:center;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">অ্যাকশন</th>' +
      '</tr></thead><tbody>';

    list.slice(0, 200).forEach(function(c, i){
      var due = customerDue(c.accountNo).net;
      var dueHtml = due > 0.01
        ? '<span style="color:#f87171;font-weight:900">৳ ' + fmt(due) + '</span>'
        : '<span style="color:#4ade80">✅</span>';

      html += '<tr data-cust-row="' + esc(c.accountNo) + '" style="cursor:pointer">' +
        '<td style="padding:9px 12px;color:#7a8ab8;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + toBn(i + 1) + '</td>' +
        '<td style="padding:9px 12px;color:#4ade80;font-size:12.5px;font-weight:800;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(c.name) + '</td>' +
        '<td style="padding:9px 12px;color:#93c5fd;font-family:monospace;font-size:11.5px;font-weight:800;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(c.accountNo) + '</td>' +
        '<td style="padding:9px 12px;color:#a5b4d8;font-size:12px;border-bottom:1px solid rgba(59,130,246,.08)">' + (c.mobile ? '📱 ' + esc(c.mobile) : '—') + '</td>' +
        '<td style="padding:9px 12px;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(BRANCHES[c.branch]?.name || '—') + '</td>' +
        '<td style="padding:9px 12px;text-align:right;font-size:13px;border-bottom:1px solid rgba(59,130,246,.08)">' + dueHtml + '</td>' +
        '<td style="padding:9px 12px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(59,130,246,.08)">' +
          '<button class="mini" data-cust-view="' + esc(c.accountNo) + '" title="বিস্তারিত" style="padding:4px 9px;font-size:11px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.4);color:#22d3ee;border-radius:6px;cursor:pointer;margin-right:3px">👁️</button>' +
          '<button class="mini" data-cust-print="' + esc(c.accountNo) + '" title="প্রিন্ট" style="padding:4px 9px;font-size:11px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#4ade80;border-radius:6px;cursor:pointer;margin-right:3px">🖨️</button>' +
          (SESSION.role === 'admin' ? '<button class="mini danger" data-cust-del="' + esc(c.id) + '" title="ডিলিট" style="padding:4px 9px;font-size:11px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;border-radius:6px;cursor:pointer">🗑️</button>' : '') +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';

    if(list.length > 200){
      html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);color:#facc15;font-size:11.5px;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ২০০ দেখানো হচ্ছে (মোট ' + toBn(list.length) + ')</div>';
    }

    return html;
  }

  var m = openModal({
    title: '👥 গ্রাহক তালিকা',
    bodyHTML:
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
      '<div id="cust-list-container"></div>',
    xwide: true,
    onMount: function(root, close){
      var container = root.querySelector('#cust-list-container');

      function refresh(){
        container.innerHTML = renderList();
        wireEvents();
      }

      function wireEvents(){
        // ⚡ Row click → detail
        container.querySelectorAll('tr[data-cust-row]').forEach(function(tr){
          tr.addEventListener('click', function(e){
            if(e.target.closest('button')) return;
            var acc = tr.dataset.custRow;
            if(acc){
              openCustomerDetail(acc);
            }
          });
        });

        // ⚡ View button
        container.querySelectorAll('[data-cust-view]').forEach(function(b){
          b.addEventListener('click', function(e){
            e.stopPropagation();
            openCustomerDetail(b.dataset.custView);
          });
        });

        // ⚡ Print button
        container.querySelectorAll('[data-cust-print]').forEach(function(b){
          b.addEventListener('click', function(e){
            e.stopPropagation();
            var acc = b.dataset.custPrint;
            var c = DB.customers.find(function(x){ return x.accountNo === acc; });
            if(c && typeof printCustomerHistory === 'function'){
              printCustomerHistory(acc, c.name);
            } else {
              if(typeof toast === 'function') toast('❌ Print function নেই', 'err');
            }
          });
        });

        // ⚡ Delete button
        container.querySelectorAll('[data-cust-del]').forEach(function(b){
          b.addEventListener('click', async function(e){
            e.stopPropagation();
            var cid = b.dataset.custDel;
            var c = DB.customers.find(function(x){ return x.id === cid; });
            if(!c) return;

            if(!confirm('🗑️ "' + c.name + '" delete করবেন?\n\n@' + c.accountNo + '\n\n⚠️ সাথে তার সব লেনদেনও মুছে যাবে!')) return;

            try {
              // Tombstone
              if(!DB.deletedCustomerIds) DB.deletedCustomerIds = {};
              if(!DB.deletedCustomerAccounts) DB.deletedCustomerAccounts = {};
              if(!DB.deletedTxIds) DB.deletedTxIds = {};
              DB.deletedCustomerIds[c.id] = new Date().toISOString();
              if(c.accountNo) DB.deletedCustomerAccounts[c.accountNo] = new Date().toISOString();

              // Remove customer
              DB.customers = DB.customers.filter(function(x){ return x.id !== cid; });

              // Tombstone + remove their txs
              var removed = 0;
              (DB.txs || []).forEach(function(t){
                if(t && t.custAcc === c.accountNo){
                  DB.deletedTxIds[t.id] = new Date().toISOString();
                  removed++;
                }
              });
              DB.txs = (DB.txs || []).filter(function(t){ return !t || t.custAcc !== c.accountNo; });

              if(typeof logActivity === 'function'){
                logActivity('user_delete', '🗑️ গ্রাহক ডিলিট', c.name + ' (+ ' + removed + ' txs)');
              }

              if(typeof __invalidateCaches === 'function') __invalidateCaches();
              DB.__updated = new Date().toISOString();
              if(typeof saveLocal === 'function') saveLocal();
              if(typeof recomputeLive === 'function') recomputeLive();
              if(typeof pushCloud === 'function'){
                try { await pushCloud(); } catch(e){}
              }
              if(typeof renderDashboard === 'function') renderDashboard();

              refresh();
              if(typeof toast === 'function') toast('🗑️ ডিলিট সফল', 'ok');

            } catch(err){
              console.error('Delete error:', err);
              alert('❌ ' + err.message);
            }
          });
        });

        // ⚡ Search input
        var searchEl = container.querySelector('#cust-search');
        if(searchEl){
          var timer = null;
          searchEl.addEventListener('input', function(e){
            if(timer) clearTimeout(timer);
            timer = setTimeout(function(){
              currentQuery = e.target.value.trim();
              var cur = container.querySelector('#cust-search');
              var curPos = cur ? cur.selectionStart : 0;
              container.innerHTML = renderList();
              wireEvents();
              var newSearch = container.querySelector('#cust-search');
              if(newSearch){
                newSearch.focus();
                try { newSearch.setSelectionRange(curPos, curPos); } catch(e){}
              }
            }, 250);
          });
        }

        // ⚡ Branch filter
        var bfEl = container.querySelector('#cust-branch-filter');
        if(bfEl){
          bfEl.addEventListener('change', function(e){
            currentBranch = e.target.value;
            refresh();
          });
        }

        // ⚡ Clear filter
        var clearEl = container.querySelector('#cust-clear');
        if(clearEl){
          clearEl.addEventListener('click', function(){
            currentQuery = '';
            currentBranch = 'all';
            refresh();
          });
        }
      }

      refresh();

      // ⚡ Add customer
      var addBtn = root.querySelector('#nc-save');
      if(addBtn){
        addBtn.addEventListener('click', async function(){
          var name = root.querySelector('#nc-name').value.trim();
          if(!name){ alert('⚠️ নাম দিন'); return; }

          var acc = root.querySelector('#nc-acc').value.trim();
          var mobile = root.querySelector('#nc-mobile').value.trim();
          var branch = root.querySelector('#nc-branch').value;

          upsertCustomer({
            accountNo: acc,
            name: name,
            mobile: mobile,
            branch: branch
          });

          if(typeof logActivity === 'function'){
            logActivity('user_add', '👥 গ্রাহক যোগ', name);
          }

          DB.__updated = new Date().toISOString();
          if(typeof saveLocal === 'function') saveLocal();
          if(typeof pushCloud === 'function'){
            try { await pushCloud(); } catch(e){}
          }

          root.querySelector('#nc-acc').value = '';
          root.querySelector('#nc-name').value = '';
          root.querySelector('#nc-mobile').value = '';

          refresh();
          if(typeof toast === 'function') toast('✅ যোগ হয়েছে', 'ok');
        });
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   👤 CUSTOMER DETAIL POPUP — Full Working
   ═══════════════════════════════════════════════════════════ */
function openCustomerDetail(accountNo, custName){
  if(!accountNo){ if(typeof toast === 'function') toast('❌ Account নেই', 'err'); return; }

  var cust = (DB.customers || []).find(function(c){ return c.accountNo === accountNo; });
  var name = custName || (cust ? cust.name : accountNo);

  var allTxs = getCustomerAllTxs(accountNo);
  var due = customerDue(accountNo);

  // ═══ Header alert ═══
  var headerAlert = due.net > 0.01
    ? '<div style="margin-bottom:14px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(220,38,38,.22),rgba(153,27,27,.12));border:2px solid rgba(220,38,38,.6)">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<div style="font-size:32px">🚨</div>' +
          '<div style="flex:1">' +
            '<div style="font-size:12px;color:#fca5a5;font-weight:800">সতর্কতা — বকেয়া আছে</div>' +
            '<div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px">৳ ' + fmt(due.net) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    : '<div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(34,197,94,.18),rgba(22,163,74,.08));border:2px solid rgba(34,197,94,.5)">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div style="font-size:24px">✅</div>' +
          '<div style="font-size:13px;color:#4ade80;font-weight:900">কোনো বকেয়া নেই</div>' +
        '</div>' +
      '</div>';

  // ═══ Customer info ═══
  var custInfo =
    '<div style="padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.3);margin-bottom:14px">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:13px">' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🆔 অ্যাকাউন্ট:</span><b style="color:#fff">' + esc(accountNo) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">👤 নাম:</span><b style="color:#4ade80">' + esc(name) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">📱 মোবাইল:</span><b style="color:#fff">' + esc(cust ? (cust.mobile || '—') : '—') + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🏦 আউটলেট:</span><b style="color:#fff">' + esc(cust ? (BRANCHES[cust.branch]?.name || '—') : '—') + '</b></div>' +
      '</div>' +
    '</div>';

  // ═══ Stats ═══
  var stats =
    '<div style="padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:14px">' +
      '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px">' +
        '<div><div style="color:#a5b4d8;font-size:11px;font-weight:800">📊 মোট</div>' +
          '<div style="font-size:18px;color:#fff;font-weight:900;margin-top:3px">' + toBn(allTxs.length) + '</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:11px;font-weight:800">🤝 প্রদান</div>' +
          '<div style="font-size:15px;color:#93c5fd;font-weight:900;margin-top:3px">৳ ' + fmt(due.paid) + '</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:11px;font-weight:800">↩️ ফেরত</div>' +
          '<div style="font-size:15px;color:#4ade80;font-weight:900;margin-top:3px">৳ ' + fmt(due.refund) + '</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:11px;font-weight:800">📉 নেট</div>' +
          '<div style="font-size:15px;color:' + (due.net > 0 ? '#f87171' : '#4ade80') + ';font-weight:900;margin-top:3px">৳ ' + fmt(Math.abs(due.net)) + '</div></div>' +
      '</div>' +
    '</div>';

  // ═══ Transaction rows ═══
  var txRowsHtml = '';
  if(!allTxs.length){
    txRowsHtml = '<div style="padding:30px;text-align:center;color:#7a8ab8;font-size:13px">📭 কোনো লেনদেন নেই</div>';
  } else {
    var sorted = allTxs.slice().reverse();
    var MAX = 200;
    var shown = sorted.slice(0, MAX);

    txRowsHtml += '<div style="max-height:400px;overflow-y:auto;border-radius:10px;border:1px solid rgba(59,130,246,.15)">' +
      '<table style="width:100%;border-collapse:collapse">' +
      '<thead><tr>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">তারিখ</th>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">ধরন</th>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">মন্তব্য</th>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:right;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">টাকা</th>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">ইউজার</th>' +
        '<th style="padding:9px 10px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:center;font-size:10.5px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">অ্যাকশন</th>' +
      '</tr></thead><tbody>';

    shown.forEach(function(t){
      var cfg = (typeof TX_TYPES !== 'undefined' && TX_TYPES[t.type]) || { icon: '📌', title: t.type };

      var noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
      var noteHtml = noteText
        ? '<div style="font-size:11px;color:#93c5fd;font-style:italic;padding:3px 6px;border-radius:4px;background:rgba(59,130,246,.08);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(noteText) + '">📝 ' + esc(noteText) + '</div>'
        : '<span style="color:#4a5878;font-size:10.5px">—</span>';

      txRowsHtml += '<tr data-tx-id="' + esc(t.id) + '">' +
        '<td style="padding:8px 10px;color:#a5b4d8;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">' + toBn(t.date) +
          '<div style="font-size:10px;color:#7a8ab8">' + (t.createdAt ? esc(fmtDateTime(t.createdAt).split(' ').slice(-2).join(' ')) : '') + '</div>' +
        '</td>' +
        '<td style="padding:8px 10px;font-size:12px;font-weight:800;color:#fff;border-bottom:1px solid rgba(59,130,246,.08)">' + cfg.icon + ' ' + esc(cfg.title) + '</td>' +
        '<td style="padding:8px 10px;border-bottom:1px solid rgba(59,130,246,.08)">' + noteHtml + '</td>' +
        '<td style="padding:8px 10px;text-align:right;color:#4ade80;font-weight:900;font-size:13px;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">৳ ' + fmt(t.amount) + '</td>' +
        '<td style="padding:8px 10px;color:#7a8ab8;font-size:11px;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(t.user || '—') + '</td>' +
        '<td style="padding:8px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(59,130,246,.08)">' +
          '<button class="mini" data-tx-view="' + esc(t.id) + '" title="বিস্তারিত" style="padding:4px 9px;font-size:11px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.4);color:#22d3ee;border-radius:6px;cursor:pointer;margin-right:2px">👁️</button>' +
          '<button class="mini" data-tx-edit="' + esc(t.id) + '" title="এডিট" style="padding:4px 9px;font-size:11px;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.4);color:#facc15;border-radius:6px;cursor:pointer;margin-right:2px">✏️</button>' +
          (SESSION.role === 'admin' ? '<button class="mini danger" data-tx-del="' + esc(t.id) + '" title="ডিলিট" style="padding:4px 9px;font-size:11px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;border-radius:6px;cursor:pointer">🗑️</button>' : '') +
        '</td>' +
      '</tr>';
    });

    txRowsHtml += '</tbody></table></div>';

    if(allTxs.length > MAX){
      txRowsHtml += '<div style="padding:6px;text-align:center;background:rgba(250,204,21,.08);font-size:11px;color:#facc15;font-weight:700;border-radius:6px;margin-top:6px">সর্বশেষ ২০০ দেখানো হচ্ছে (মোট ' + toBn(allTxs.length) + ')</div>';
    }
  }

  // ═══ Actions ═══
  var actionHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
      '<button class="btn green" id="cust-support-btn" style="flex:1;min-width:140px">🤝 নতুন সাপোর্ট</button>' +
      '<button class="btn cyan" id="cust-print-btn" style="flex:1;min-width:140px">🖨️ প্রিন্ট</button>' +
    '</div>';

  /* ═══ Open Modal ═══ */
  var m = openModal({
    title: '👤 ' + esc(name),
    bodyHTML:
      headerAlert +
      custInfo +
      stats +
      '<div style="font-size:12px;color:#93c5fd;font-weight:900;margin-bottom:8px;text-transform:uppercase">📋 লেনদেন (' + toBn(allTxs.length) + ')</div>' +
      txRowsHtml +
      actionHTML,
    xwide: true,
    onMount: function(root, close){

      // ═══════════════════════════════════════════════════════════
      // 🔧 EVENT DELEGATION (single handler for all buttons)
      // ═══════════════════════════════════════════════════════════
      root.addEventListener('click', async function(e){
        // ⚡ View button
        var viewBtn = e.target.closest('[data-tx-view]');
        if(viewBtn){
          e.preventDefault();
          e.stopPropagation();
          var txId = viewBtn.dataset.txView;
          if(typeof showTxDetail === 'function'){
            showTxDetail(txId);
          } else {
            if(typeof toast === 'function') toast('❌ Detail function নেই', 'err');
          }
          return;
        }

        // ⚡ Edit button
        var editBtn = e.target.closest('[data-tx-edit]');
        if(editBtn){
          e.preventDefault();
          e.stopPropagation();
          var eid = editBtn.dataset.txEdit;
          var tx = (DB.txs || []).find(function(x){ return x.id === eid; });
          if(!tx){
            if(typeof toast === 'function') toast('❌ পাওয়া যায়নি', 'err');
            return;
          }
          close();
          setTimeout(function(){
            if(typeof openTxModal === 'function'){
              openTxModal(tx.type, tx.id);
            } else if(typeof openTxForm === 'function'){
              openTxForm(tx.type, tx.id);
            } else {
              if(typeof toast === 'function') toast('❌ Edit function নেই', 'err');
            }
          }, 200);
          return;
        }

        // ⚡ Delete button
        var delBtn = e.target.closest('[data-tx-del]');
        if(delBtn){
          e.preventDefault();
          e.stopPropagation();
          var did = delBtn.dataset.txDel;
          if(typeof deleteTx === 'function'){
            await deleteTx(did);
            close();
            setTimeout(function(){ openCustomerDetail(accountNo, name); }, 300);
          }
          return;
        }

        // ⚡ Support button
        var supportBtn = e.target.closest('#cust-support-btn');
        if(supportBtn){
          e.preventDefault();
          e.stopPropagation();
          close();
          setTimeout(function(){
            if(typeof openTxModal === 'function'){
              openTxModal('support', null, {
                custAcc: accountNo,
                custName: name,
                custMobile: cust ? (cust.mobile || '') : ''
              });
            } else if(typeof openTxForm === 'function'){
              openTxForm('support', null, {
                custAcc: accountNo,
                custName: name,
                custMobile: cust ? (cust.mobile || '') : ''
              });
            }
          }, 200);
          return;
        }

        // ⚡ Print button
        var printBtn = e.target.closest('#cust-print-btn');
        if(printBtn){
          e.preventDefault();
          e.stopPropagation();
          if(typeof printCustomerHistory === 'function'){
            printCustomerHistory(accountNo, name);
          } else {
            if(typeof toast === 'function') toast('❌ Print function নেই', 'err');
          }
          return;
        }
      }, true);

    }
  });
}

/* ═══════════════════════════════════════════════════════════
   📋 DUE LIST
   ═══════════════════════════════════════════════════════════ */
function openDueList(){
  var bf = currentBranch();
  var list = (DB.customers || []).filter(function(c){
    if(bf !== 'all' && c.branch !== bf) return false;
    return customerDue(c.accountNo).net > 0.01;
  });

  list.sort(function(a, b){
    return customerDue(b.accountNo).net - customerDue(a.accountNo).net;
  });

  var totalDue = list.reduce(function(s, c){
    return s + customerDue(c.accountNo).net;
  }, 0);

  var rows = '';
  list.forEach(function(c, i){
    var d = customerDue(c.accountNo);
    rows += '<tr data-cust-row="' + esc(c.accountNo) + '" style="cursor:pointer">' +
      '<td style="padding:9px 12px;color:#7a8ab8;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + toBn(i + 1) + '</td>' +
      '<td style="padding:9px 12px;color:#ec4899;font-weight:800;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(c.name) + '</td>' +
      '<td style="padding:9px 12px;color:#93c5fd;font-family:monospace;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(c.accountNo) + '</td>' +
      '<td style="padding:9px 12px;text-align:right;color:#f87171;font-weight:900;border-bottom:1px solid rgba(59,130,246,.08)">৳ ' + fmt(d.net) + '</td>' +
    '</tr>';
  });

  var m = openModal({
    title: '🤝 সাপোর্ট বকেয়া',
    bodyHTML:
      '<div style="padding:12px;border-radius:12px;background:rgba(220,38,38,.1);border:1.5px solid rgba(220,38,38,.4);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-size:12px;color:#f87171;font-weight:800">মোট বকেয়া</div>' +
        '<div style="font-size:20px;color:#f87171;font-weight:900">৳ ' + fmt(totalDue) + '</div>' +
      '</div>' +
      (list.length
        ? '<div class="table-wrap" style="max-height:55vh;overflow-y:auto"><table style="width:100%;border-collapse:collapse">' +
          '<thead><tr>' +
            '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3)">#</th>' +
            '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3)">গ্রাহক</th>' +
            '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3)">অ্যাকাউন্ট</th>' +
            '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:right;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3)">বকেয়া</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div style="padding:30px;text-align:center;color:#7a8ab8">🎉 কোনো বকেয়া নেই</div>'),
    xwide: true,
    onMount: function(root, close){
      root.addEventListener('click', function(e){
        var tr = e.target.closest('tr[data-cust-row]');
        if(tr){
          var acc = tr.dataset.custRow;
          if(acc){
            close();
            setTimeout(function(){ openCustomerDetail(acc); }, 200);
          }
        }
      });
    }
  });
}

console.log('✅ Customer module loaded — v4.0 (working buttons)');