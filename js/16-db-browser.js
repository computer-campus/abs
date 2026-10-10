/* ============================================================
   FILE: js/16-db-browser.js — COMPLETE FRESH
   PURPOSE: Full database browser with edit/delete
   VERSION: v2.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   DB BROWSER
   ═══════════════════════════════════════════════════════════ */
function openDBBrowser(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return;
  }
  if(!DB){ if(typeof toast === 'function') toast('❌ DB নেই'); return; }

  var activeTab = 'txs';
  var searchText = '';

  var TABLES = {
    txs:           { label: '💸 লেনদেন',      icon: '💸', type: 'array', editable: true },
    customers:     { label: '👥 গ্রাহক',      icon: '👥', type: 'array', editable: true },
    users:         { label: '👤 ইউজার',       icon: '👤', type: 'array', editable: true },
    activity:      { label: '📜 অ্যাক্টিভিটি', icon: '📜', type: 'array', editable: true },
    baseVault:     { label: '🗄️ বেস ভল্ট',    icon: '🗄️', type: 'object', editable: true },
    liveVault:     { label: '🗄️ লাইভ ভল্ট',   icon: '🗄️', type: 'object', editable: false },
    baseAccounts:  { label: '🏦 বেস অ্যাকাউন্ট', icon: '🏦', type: 'object', editable: true },
    liveAccounts:  { label: '🏦 লাইভ অ্যাকাউন্ট', icon: '🏦', type: 'object', editable: false },
    branchCapital: { label: '💰 মূলধন',       icon: '💰', type: 'object', editable: true },
    deletedTxIds:  { label: '🗑️ ডিলিটেড',    icon: '🗑️', type: 'object', editable: true },
    yearlyArchive: { label: '📚 আর্কাইভ',      icon: '📚', type: 'object', editable: false }
  };

  function getTableData(name){ return DB[name]; }

  function getTableCount(name){
    var d = getTableData(name);
    if(d == null) return 0;
    if(Array.isArray(d)) return d.length;
    if(typeof d === 'object') return Object.keys(d).length;
    return 1;
  }

  function escapeHTML(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildTabs(){
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid rgba(59,130,246,.2)">';
    Object.entries(TABLES).forEach(function(e){
      var key = e[0];
      var tbl = e[1];
      var isActive = activeTab === key;
      var cnt = getTableCount(key);
      html += '<button class="db-tab" data-tab="' + key + '" style="' +
        'padding:8px 13px;border-radius:9px;' +
        'background:' + (isActive ? 'linear-gradient(145deg,rgba(59,130,246,.3),rgba(59,130,246,.12))' : 'rgba(0,0,0,.3)') + ';' +
        'border:1.5px solid ' + (isActive ? 'rgba(59,130,246,.7)' : 'rgba(59,130,246,.25)') + ';' +
        'color:' + (isActive ? '#fff' : '#a5b4d8') + ';' +
        'font-family:inherit;font-size:12.5px;font-weight:900;' +
        'cursor:pointer;white-space:nowrap;transition:all .15s' +
        '">' + tbl.icon + ' ' + tbl.label +
        ' <span style="padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.15);font-size:11px;margin-left:4px">' + toBn(cnt) + '</span>' +
      '</button>';
    });
    html += '</div>';
    return html;
  }

  function buildPreview(item, table){
    if(!item) return '—';
    try {
      if(table === 'txs'){
        var cfg = (typeof TX_TYPES !== 'undefined' && TX_TYPES[item.type]) || { icon: '📌', title: item.type };
        return cfg.icon + ' <b style="color:#4ade80">' + escapeHTML(cfg.title) + '</b>' +
          ' • ৳ ' + fmt(item.amount) +
          (item.custName ? ' • 👤 ' + escapeHTML(item.custName) : '') +
          (item.date ? ' • ' + toBn(item.date) : '');
      }
      if(table === 'customers'){
        return '👤 <b style="color:#4ade80">' + escapeHTML(item.name || '—') + '</b>' +
          (item.accountNo ? ' • 🆔 ' + escapeHTML(item.accountNo) : '') +
          (item.mobile ? ' • 📱 ' + escapeHTML(item.mobile) : '');
      }
      if(table === 'users'){
        return '👤 <b>' + escapeHTML(item.name || '—') + '</b>' +
          ' • @' + escapeHTML(item.username || '—') +
          ' • ' + (item.role === 'admin' ? '👑' : '👤') +
          (item.__secret ? ' 🔐' : '');
      }
      if(table === 'activity'){
        return escapeHTML(item.title || item.type || '—') +
          (item.detail ? ' • ' + escapeHTML(item.detail) : '') +
          (item.user ? ' • 👤 ' + escapeHTML(item.user) : '');
      }
      var s = JSON.stringify(item);
      return escapeHTML(s.length > 120 ? s.slice(0, 120) + '…' : s);
    } catch(e){ return '—'; }
  }

  function buildContent(){
    var data = getTableData(activeTab);
    var meta = TABLES[activeTab];

    if(data == null){
      return '<div style="padding:40px;text-align:center;color:#7a8ab8">📭 এই table নেই</div>';
    }

    // ═══ Array ═══
    if(Array.isArray(data)){
      var list = data.slice();
      if(searchText){
        var q = searchText.toLowerCase();
        list = list.filter(function(item){
          return JSON.stringify(item).toLowerCase().indexOf(q) !== -1;
        });
      }

      var html = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
        '<div style="font-size:13px;color:#93c5fd;font-weight:800">' +
          '📊 মোট: <b style="color:#fff">' + toBn(data.length) + '</b>' +
          (searchText ? ' • দেখানো: <b style="color:#facc15">' + toBn(list.length) + '</b>' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          (meta.editable ? '<button class="mini accept" id="dbb-add" style="padding:7px 14px;font-size:12px">➕ নতুন</button>' : '') +
          (data.length > 0 && meta.editable ? '<button class="mini danger" id="dbb-clear" style="padding:7px 14px;font-size:12px">🗑️ Clear All (' + toBn(data.length) + ')</button>' : '') +
        '</div>' +
      '</div>';

      if(!list.length){
        html += '<div style="padding:30px;text-align:center;color:#7a8ab8">📭 কোনো data নেই</div>';
        return html;
      }

      html += '<div style="max-height:55vh;overflow-y:auto;border-radius:10px;border:1px solid rgba(59,130,246,.15)">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<thead><tr>' +
          '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1;width:50px">#</th>' +
          '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">Preview</th>' +
          '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:center;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1;width:160px">Actions</th>' +
        '</tr></thead><tbody>';

      list.slice(0, 200).forEach(function(item, i){
        var realIdx = data.indexOf(item);
        var preview = buildPreview(item, activeTab);

        html += '<tr>' +
          '<td style="padding:9px 11px;color:#7a8ab8;font-weight:800;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + toBn(realIdx + 1) + '</td>' +
          '<td style="padding:9px 11px;color:#e0eaff;font-size:12px;border-bottom:1px solid rgba(59,130,246,.08)">' + preview + '</td>' +
          '<td style="padding:9px 11px;text-align:center;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">' +
            '<button class="mini" data-view="' + realIdx + '" style="padding:5px 10px;font-size:11px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.4);color:#22d3ee;border-radius:6px;cursor:pointer;margin-right:3px">👁️</button>' +
            (meta.editable ? '<button class="mini" data-edit="' + realIdx + '" style="padding:5px 10px;font-size:11px;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.4);color:#facc15;border-radius:6px;cursor:pointer;margin-right:3px">✏️</button>' : '') +
            (meta.editable ? '<button class="mini danger" data-del="' + realIdx + '" style="padding:5px 10px;font-size:11px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;border-radius:6px;cursor:pointer">🗑️</button>' : '') +
          '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div>';
      if(list.length > 200){
        html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);color:#facc15;font-size:11.5px;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ২০০ দেখানো হচ্ছে (মোট ' + toBn(list.length) + ')</div>';
      }
      return html;
    }

    // ═══ Object ═══
    var keys = Object.keys(data);
    if(searchText){
      var q2 = searchText.toLowerCase();
      keys = keys.filter(function(k){
        return (k + ' ' + JSON.stringify(data[k])).toLowerCase().indexOf(q2) !== -1;
      });
    }

    var html2 = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
      '<div style="font-size:13px;color:#93c5fd;font-weight:800">🔑 Keys: <b style="color:#fff">' + toBn(Object.keys(data).length) + '</b></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        (meta.editable ? '<button class="mini accept" id="dbb-addkey" style="padding:7px 14px;font-size:12px">➕ নতুন Key</button>' : '') +
        (Object.keys(data).length > 0 && meta.editable ? '<button class="mini danger" id="dbb-clear" style="padding:7px 14px;font-size:12px">🗑️ Clear All (' + toBn(Object.keys(data).length) + ')</button>' : '') +
      '</div>' +
    '</div>';

    if(!keys.length){
      html2 += '<div style="padding:30px;text-align:center;color:#7a8ab8">📭 কোনো key নেই</div>';
      return html2;
    }

    html2 += '<div style="max-height:55vh;overflow-y:auto;border-radius:10px;border:1px solid rgba(59,130,246,.15)">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr>' +
        '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0">Key</th>' +
        '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0">Value</th>' +
        '<th style="padding:9px 11px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:center;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;width:160px">Actions</th>' +
      '</tr></thead><tbody>';

    keys.forEach(function(k){
      var val = data[k];
      var valDisplay = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if(valDisplay.length > 100) valDisplay = valDisplay.slice(0, 100) + '…';

      html2 += '<tr>' +
        '<td style="padding:9px 11px;color:#93c5fd;font-family:monospace;font-weight:800;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08);word-break:break-all">' + escapeHTML(k) + '</td>' +
        '<td style="padding:9px 11px;color:#e0eaff;font-family:monospace;font-size:11px;border-bottom:1px solid rgba(59,130,246,.08);word-break:break-all">' + escapeHTML(valDisplay) + '</td>' +
        '<td style="padding:9px 11px;text-align:center;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">' +
          '<button class="mini" data-keyview="' + escapeHTML(k) + '" style="padding:5px 10px;font-size:11px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.4);color:#22d3ee;border-radius:6px;cursor:pointer;margin-right:3px">👁️</button>' +
          (meta.editable ? '<button class="mini" data-keyedit="' + escapeHTML(k) + '" style="padding:5px 10px;font-size:11px;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.4);color:#facc15;border-radius:6px;cursor:pointer;margin-right:3px">✏️</button>' : '') +
          (meta.editable ? '<button class="mini danger" data-keydel="' + escapeHTML(k) + '" style="padding:5px 10px;font-size:11px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;border-radius:6px;cursor:pointer">🗑️</button>' : '') +
        '</td>' +
      '</tr>';
    });

    html2 += '</tbody></table></div>';
    return html2;
  }

  /* ═══════════════════════════════════════════════════════════
     MODAL
     ═══════════════════════════════════════════════════════════ */
  var m = openModal({
    title: '🗄️ Database Browser (Full Control)',
    bodyHTML:
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">' +
        '<input type="text" id="dbb-search" placeholder="🔍 Search..." style="flex:1;min-width:200px;padding:11px 14px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13px;font-weight:700;outline:none">' +
        '<button class="mini" id="dbb-export" style="padding:9px 14px;font-size:12px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.4);color:#22d3ee;border-radius:8px;cursor:pointer;font-weight:900">📥 Export</button>' +
        '<button class="mini" id="dbb-import" style="padding:9px 14px;font-size:12px;background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.4);color:#c4b5fd;border-radius:8px;cursor:pointer;font-weight:900">📤 Import</button>' +
        '<input type="file" id="dbb-file" accept=".json" style="display:none">' +
      '</div>' +
      '<div id="dbb-tabs">' + buildTabs() + '</div>' +
      '<div id="dbb-content">' + buildContent() + '</div>',
    xwide: true,
    onMount: function(root, close){
      var tabsEl = root.querySelector('#dbb-tabs');
      var contentEl = root.querySelector('#dbb-content');

      function refresh(){
        tabsEl.innerHTML = buildTabs();
        contentEl.innerHTML = buildContent();
        wire();
      }

      function saveAndPush(){
        DB.__updated = new Date().toISOString();
        if(typeof __invalidateCaches === 'function') __invalidateCaches();
        if(typeof recomputeLive === 'function') recomputeLive();
        if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);
        if(typeof saveLocal === 'function') saveLocal();
        if(typeof pushCloud === 'function') pushCloud().catch(function(){});
        if(typeof renderDashboard === 'function') renderDashboard(true);
      }

      function wire(){
        // Tab clicks
        tabsEl.querySelectorAll('[data-tab]').forEach(function(b){
          b.addEventListener('click', function(){
            activeTab = b.dataset.tab;
            refresh();
          });
        });

        var data = getTableData(activeTab);
        if(!data) return;

        // ═══ Array actions ═══
        contentEl.querySelectorAll('[data-view]').forEach(function(b){
          b.addEventListener('click', function(){
            var idx = parseInt(b.dataset.view, 10);
            var item = data[idx];
            openDBViewer(item, activeTab, idx);
          });
        });

        contentEl.querySelectorAll('[data-edit]').forEach(function(b){
          b.addEventListener('click', function(){
            var idx = parseInt(b.dataset.edit, 10);
            var item = data[idx];
            openDBEditor(item, function(newVal){
              data[idx] = newVal;
              saveAndPush();
              refresh();
            });
          });
        });

        contentEl.querySelectorAll('[data-del]').forEach(function(b){
          b.addEventListener('click', async function(){
            var idx = parseInt(b.dataset.del, 10);
            var item = data[idx];
            if(!confirm('🗑️ Delete করবেন?\n\n' + (buildPreview(item, activeTab).replace(/<[^>]+>/g, '')))) return;

            // Special for txs
            if(activeTab === 'txs' && item.id){
              if(!DB.deletedTxIds) DB.deletedTxIds = {};
              DB.deletedTxIds[item.id] = new Date().toISOString();
            }
            data.splice(idx, 1);
            saveAndPush();
            refresh();
            if(typeof toast === 'function') toast('🗑️ Delete OK', 'ok');
          });
        });

        // ═══ Object actions ═══
        contentEl.querySelectorAll('[data-keyview]').forEach(function(b){
          b.addEventListener('click', function(){
            var k = b.dataset.keyview;
            openDBViewer({ key: k, value: data[k] }, activeTab, k);
          });
        });

        contentEl.querySelectorAll('[data-keyedit]').forEach(function(b){
          b.addEventListener('click', function(){
            var k = b.dataset.keyedit;
            openDBEditor(data[k], function(newVal){
              data[k] = newVal;
              saveAndPush();
              refresh();
            }, k);
          });
        });

        contentEl.querySelectorAll('[data-keydel]').forEach(function(b){
          b.addEventListener('click', async function(){
            var k = b.dataset.keydel;
            if(!confirm('🗑️ Key "' + k + '" delete করবেন?')) return;
            delete data[k];
            saveAndPush();
            refresh();
            if(typeof toast === 'function') toast('🗑️ Delete OK', 'ok');
          });
        });

        // ═══ Add new ═══
        var addBtn = contentEl.querySelector('#dbb-add');
        if(addBtn){
          addBtn.addEventListener('click', function(){
            var tpl = {};
            if(activeTab === 'txs'){
              tpl = {
                id: 'tx_' + Date.now(),
                type: 'deposit',
                date: todayStr(),
                branch: 'kalaroa',
                custBranch: 'kalaroa',
                amount: 0,
                notesIn: {},
                notesOut: {},
                note: '',
                user: SESSION.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            } else if(activeTab === 'customers'){
              tpl = {
                id: 'cust_' + Date.now(),
                accountNo: '',
                name: '',
                mobile: '',
                branch: 'kalaroa',
                createdAt: new Date().toISOString()
              };
            } else if(activeTab === 'users'){
              tpl = {
                id: 'user_' + Date.now(),
                name: '',
                username: '',
                password: '',
                plainPassword: '',
                role: 'user',
                branch: 'kalaroa',
                createdAt: new Date().toISOString()
              };
            } else {
              tpl = {
                id: 'item_' + Date.now(),
                type: 'manual',
                at: new Date().toISOString()
              };
            }

            openDBEditor(tpl, function(newVal){
              data.push(newVal);
              saveAndPush();
              refresh();
              if(typeof toast === 'function') toast('✅ যোগ হয়েছে', 'ok');
            }, null, true);
          });
        }

        // ═══ Add key ═══
        var addKeyBtn = contentEl.querySelector('#dbb-addkey');
        if(addKeyBtn){
          addKeyBtn.addEventListener('click', function(){
            var k = prompt('নতুন Key এর নাম:');
            if(!k || !k.trim()) return;
            if(data[k] !== undefined){
              if(typeof toast === 'function') toast('❌ এই key আগেই আছে');
              return;
            }
            var v = prompt('Value (JSON or text):', '');
            if(v === null) return;
            var parsed;
            try { parsed = JSON.parse(v); } catch(e){ parsed = v; }
            data[k] = parsed;
            saveAndPush();
            refresh();
          });
        }

        // ═══ Clear All ═══
        var clearBtn = contentEl.querySelector('#dbb-clear');
        if(clearBtn){
          clearBtn.addEventListener('click', async function(){
            if(!SESSION || SESSION.role !== 'admin'){
              if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
              return;
            }

            var tname = activeTab;
            var cnt = Array.isArray(data) ? data.length : Object.keys(data).length;

            var confirmMsg = '🗑️ সব ' + cnt + ' টি data delete করবেন?\n\n' +
              'Table: ' + tname + '\n';

            if(tname === 'txs'){
              confirmMsg += '\n⚠️ সব লেনদেন মুছে যাবে! Cloud থেকেও যাবে।';
            } else if(tname === 'activity'){
              confirmMsg += '\n📜 শুধু activity log clear হবে।';
            } else if(tname === 'deletedTxIds'){
              confirmMsg += '\n⚠️ Deleted txs cloud থেকে ফিরে আসতে পারে!';
            }

            if(!confirm(confirmMsg)) return;

            var typed = prompt('🔒 টাইপ করুন: DELETE ALL');
            if(String(typed).trim() !== 'DELETE ALL'){
              if(typeof toast === 'function') toast('❌ বাতিল');
              return;
            }

            try {
              var now = new Date().toISOString();

              if(tname === 'activity'){
                DB.activity = [];
                DB.activityLogClearedAt = now;
              } else if(tname === 'deletedTxIds'){
                DB.deletedTxIds = {};
              } else if(tname === 'txs'){
                if(!DB.deletedTxIds) DB.deletedTxIds = {};
                (DB.txs || []).forEach(function(t){
                  if(t && t.id) DB.deletedTxIds[t.id] = now;
                });
                DB.txs = [];
                DB.yearlyArchive = {};
              } else if(tname === 'customers'){
                if(!DB.deletedCustomerIds) DB.deletedCustomerIds = {};
                if(!DB.deletedCustomerAccounts) DB.deletedCustomerAccounts = {};
                (DB.customers || []).forEach(function(c){
                  if(c && c.id) DB.deletedCustomerIds[c.id] = now;
                  if(c && c.accountNo) DB.deletedCustomerAccounts[c.accountNo] = now;
                });
                DB.customers = [];
              } else if(Array.isArray(data)){
                data.length = 0;
              } else if(typeof data === 'object'){
                Object.keys(data).forEach(function(k){ delete data[k]; });
              }

              saveAndPush();
              refresh();
              if(typeof toast === 'function') toast('✅ Clear OK — ' + cnt + ' items', 'ok');

            } catch(e){
              console.error('Clear error:', e);
              if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
            }
          });
        }
      }

      // Search
      var searchEl = root.querySelector('#dbb-search');
      if(searchEl){
        var searchTimer = null;
        searchEl.addEventListener('input', function(e){
          if(searchTimer) clearTimeout(searchTimer);
          searchTimer = setTimeout(function(){
            searchText = e.target.value.trim();
            contentEl.innerHTML = buildContent();
            wire();
            // Refocus search
            var s = root.querySelector('#dbb-search');
            if(s){ s.focus(); try { s.setSelectionRange(s.value.length, s.value.length); } catch(e){} }
          }, 250);
        });
      }

      // Export
      root.querySelector('#dbb-export').addEventListener('click', function(){
        try {
          var json = JSON.stringify(DB, null, 2);
          var blob = new Blob([json], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'ccbank_db_' + todayStr() + '.json';
          a.click();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
          if(typeof toast === 'function') toast('📥 Export OK', 'ok');
        } catch(e){
          if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
        }
      });

      // Import
      root.querySelector('#dbb-import').addEventListener('click', function(){
        root.querySelector('#dbb-file').click();
      });

      root.querySelector('#dbb-file').addEventListener('change', function(e){
        var f = e.target.files[0];
        if(!f) return;
        var r = new FileReader();
        r.onload = async function(ev){
          try {
            var parsed = JSON.parse(ev.target.result);
            if(!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');

            if(!confirm('📤 Import করবেন?\n\n⚠️ সব data replace হবে!')) return;
            if(!confirm('⚠️ শেষবার confirm?')) return;

            window.db = parsed;
            if(typeof normalizeDB === 'function') normalizeDB();
            if(typeof recomputeLive === 'function') recomputeLive();
            saveAndPush();
            refresh();
            if(typeof toast === 'function') toast('✅ Import OK', 'ok');
          } catch(err){
            if(typeof toast === 'function') toast('❌ ' + err.message, 'err');
          }
        };
        r.readAsText(f);
        e.target.value = '';
      });

      // Initial
      wire();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   VIEWER MODAL
   ═══════════════════════════════════════════════════════════ */
function openDBViewer(item, tableName, idx){
  var jsonStr = JSON.stringify(item, null, 2);
  openModal({
    title: '👁️ ' + (tableName || '') + ' #' + (typeof idx === 'number' ? toBn(idx + 1) : idx),
    bodyHTML:
      '<div style="padding:14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.3);max-height:60vh;overflow-y:auto">' +
        '<pre style="margin:0;color:#e0eaff;font-family:monospace;font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-all">' +
          escapeHTMLDB(jsonStr) +
        '</pre>' +
      '</div>' +
      '<div style="margin-top:14px;display:flex;gap:8px">' +
        '<button class="btn cyan" id="dbb-v-copy" style="flex:1">📋 Copy</button>' +
      '</div>',
    xwide: true,
    onMount: function(root, close){
      root.querySelector('#dbb-v-copy').addEventListener('click', function(){
        try {
          navigator.clipboard.writeText(jsonStr);
          if(typeof toast === 'function') toast('📋 Copied', 'ok');
        } catch(e){}
      });
    }
  });
}

function escapeHTMLDB(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ═══════════════════════════════════════════════════════════
   EDITOR MODAL
   ═══════════════════════════════════════════════════════════ */
function openDBEditor(value, onSave, keyName, isNew){
  var title = isNew ? '➕ নতুন Item' : ('✏️ এডিট' + (keyName ? ' — ' + keyName : ''));
  var jsonStr = JSON.stringify(value, null, 2);

  openModal({
    title: title,
    bodyHTML:
      '<div style="margin-bottom:10px;font-size:12px;color:#7a8ab8;font-weight:700">' +
        '💡 JSON format এ এডিট করুন। <b style="color:#fff">Ctrl+Enter</b> চেপে save করুন।' +
      '</div>' +
      '<textarea id="dbb-editor" style="width:100%;min-height:380px;padding:14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.4);color:#e0eaff;font-family:monospace;font-size:13px;line-height:1.6;outline:none;resize:vertical;box-sizing:border-box" spellcheck="false">' +
        escapeHTMLDB(jsonStr) +
      '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="btn green" id="dbb-editor-save" style="flex:1">💾 Save</button>' +
      '</div>',
    wide: true,
    onMount: function(root, close){
      var ta = root.querySelector('#dbb-editor');
      setTimeout(function(){ ta.focus(); }, 100);

      function doSave(){
        try {
          var parsed = JSON.parse(ta.value);
          if(typeof onSave === 'function') onSave(parsed);
          close();
          if(typeof toast === 'function') toast('✅ Save OK', 'ok');
        } catch(e){
          if(typeof toast === 'function') toast('❌ Invalid JSON: ' + e.message, 'err');
        }
      }

      root.querySelector('#dbb-editor-save').addEventListener('click', doSave);
      ta.addEventListener('keydown', function(e){
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
          e.preventDefault();
          doSave();
        }
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTO INJECT SIDEBAR BUTTON
   ═══════════════════════════════════════════════════════════ */
setInterval(function(){
  if(!SESSION || SESSION.role !== 'admin') return;
  var sbBody = document.getElementById('sb-body');
  if(!sbBody) return;
  if(sbBody.querySelector('#sb-db-browser')) return;

  var btns = sbBody.querySelectorAll('.sb-btn');
  var inserted = false;
  btns.forEach(function(b){
    if(inserted) return;
    if(b.textContent.indexOf('সব ডেটা') !== -1){
      var newBtn = document.createElement('button');
      newBtn.id = 'sb-db-browser';
      newBtn.className = 'sb-btn';
      newBtn.style.borderColor = 'rgba(6,182,212,.4)';
      newBtn.innerHTML = '🗄️ Database Browser';
      newBtn.addEventListener('click', function(){
        if(typeof closeSidebar === 'function') closeSidebar();
        setTimeout(openDBBrowser, 200);
      });
      b.parentNode.insertBefore(newBtn, b.nextSibling);
      inserted = true;
    }
  });

  // If no "সব ডেটা" found, just append
  if(!inserted){
    var newBtn2 = document.createElement('button');
    newBtn2.id = 'sb-db-browser';
    newBtn2.className = 'sb-btn';
    newBtn2.style.borderColor = 'rgba(6,182,212,.4)';
    newBtn2.innerHTML = '🗄️ Database Browser';
    newBtn2.addEventListener('click', function(){
      if(typeof closeSidebar === 'function') closeSidebar();
      setTimeout(openDBBrowser, 200);
    });
    sbBody.appendChild(newBtn2);
  }
}, 2000);

console.log('✅ DB Browser loaded — v2.0');