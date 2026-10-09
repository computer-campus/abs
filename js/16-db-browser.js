/* ============================================================
   FILE: js/16-db-browser.js
   PURPOSE: Full database control — add/edit/update/delete
   VERSION: v1.0
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
  if(!DB){ toast('❌ DB load হয়নি'); return; }

  var activeTab = 'txs';
  var searchText = '';

  // Table definitions
  var TABLES = {
    txs:            { label: '💸 লেনদেন', icon: '💸', type: 'array', editable: true },
    customers:      { label: '👥 গ্রাহক', icon: '👥', type: 'array', editable: true },
    users:          { label: '👤 ইউজার', icon: '👤', type: 'array', editable: true },
    activity:       { label: '📜 অ্যাক্টিভিটি', icon: '📜', type: 'array', editable: false },
    baseVault:      { label: '🗄️ বেস ভল্ট', icon: '🗄️', type: 'object', editable: true },
    liveVault:      { label: '🗄️ লাইভ ভল্ট', icon: '🗄️', type: 'object', editable: false },
    baseAccounts:   { label: '🏦 বেস অ্যাকাউন্ট', icon: '🏦', type: 'object', editable: true },
    liveAccounts:   { label: '🏦 লাইভ অ্যাকাউন্ট', icon: '🏦', type: 'object', editable: false },
    branchCapital:  { label: '💰 মূলধন', icon: '💰', type: 'object', editable: true },
    deletedTxIds:   { label: '🗑️ ডিলিটেড', icon: '🗑️', type: 'object', editable: false },
    yearlyArchive:  { label: '📚 আর্কাইভ', icon: '📚', type: 'object', editable: false }
  };

  function getTableData(name){
    return DB[name];
  }

  function getTableCount(name){
    var data = getTableData(name);
    if(data == null) return 0;
    if(Array.isArray(data)) return data.length;
    if(typeof data === 'object') return Object.keys(data).length;
    return 1;
  }

  function renderTabs(){
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1.5px solid rgba(59,130,246,.2)">';
    Object.entries(TABLES).forEach(function(e){
      var key = e[0];
      var tbl = e[1];
      var isActive = activeTab === key;
      var cnt = getTableCount(key);
      html += '<button class="db-tab-btn" data-db-tab="' + key + '" style="padding:7px 12px;border-radius:8px;background:' +
        (isActive ? 'linear-gradient(145deg,rgba(59,130,246,.25),rgba(59,130,246,.1))' : 'rgba(0,0,0,.3)') +
        ';border:1.5px solid ' + (isActive ? 'rgba(59,130,246,.6)' : 'rgba(59,130,246,.25)') +
        ';color:' + (isActive ? '#fff' : '#a5b4d8') +
        ';font-family:inherit;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap">' +
        tbl.icon + ' ' + tbl.label +
        ' <span style="padding:1px 6px;border-radius:5px;background:rgba(255,255,255,.15);font-size:10.5px;margin-left:4px">' + toBn(cnt) + '</span>' +
      '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderTable(){
    var data = getTableData(activeTab);
    var meta = TABLES[activeTab];

    if(data == null){
      return '<div class="empty" style="padding:40px;text-align:center;color:#7a8ab8">📭 এই table নেই</div>';
    }

    // ═══ Array type ═══
    if(Array.isArray(data)){
      var list = data.slice();
      if(searchText){
        var q = searchText.toLowerCase();
        list = list.filter(function(item){
          return JSON.stringify(item).toLowerCase().indexOf(q) !== -1;
        });
      }

      var html = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">' +
        '<div style="font-size:12.5px;color:#93c5fd;font-weight:800">' +
          '📊 মোট: <b style="color:#fff">' + toBn(data.length) + '</b>' +
          (searchText ? ' • দেখানো: <b style="color:#facc15">' + toBn(list.length) + '</b>' : '') +
        '</div>' +
        (meta.editable
          ? '<button class="mini accept" id="db-add-new" style="padding:6px 14px;font-size:12px">➕ নতুন যোগ করুন</button>'
          : '') +
      '</div>';

      if(!list.length){
        html += '<div class="empty" style="padding:30px;text-align:center;color:#7a8ab8">📭 কোনো data নেই</div>';
        return html;
      }

      // Table view — first 200 items
      html += '<div class="table-wrap" style="max-height:55vh;overflow-y:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<thead><tr>' +
          '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:left;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0;z-index:1">#</th>' +
          '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:left;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0;z-index:1">Preview</th>' +
          '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:center;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0;z-index:1;width:160px">Actions</th>' +
        '</tr></thead><tbody>';

      list.slice(0, 200).forEach(function(item, i){
        var realIdx = data.indexOf(item);
        var preview = buildPreview(item, activeTab);

        html += '<tr>' +
          '<td style="padding:8px 10px;color:#7a8ab8;font-weight:800;font-size:11px;border-bottom:1px solid rgba(59,130,246,.08)">' + toBn(realIdx + 1) + '</td>' +
          '<td style="padding:8px 10px;color:#e0eaff;font-size:12px;border-bottom:1px solid rgba(59,130,246,.08)">' + preview + '</td>' +
          '<td style="padding:8px 10px;text-align:center;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">' +
            '<button class="mini" data-db-view="' + realIdx + '" style="padding:4px 9px;font-size:11px;background:rgba(6,182,212,.15);border-color:rgba(6,182,212,.4);color:#22d3ee" title="বিস্তারিত">👁️</button>' +
            (meta.editable ? ' <button class="mini" data-db-edit="' + realIdx + '" style="padding:4px 9px;font-size:11px;background:rgba(250,204,21,.15);border-color:rgba(250,204,21,.4);color:#facc15" title="এডিট">✏️</button>' : '') +
            (meta.editable ? ' <button class="mini danger" data-db-del="' + realIdx + '" style="padding:4px 9px;font-size:11px" title="ডিলিট">🗑️</button>' : '') +
          '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div>';
      if(list.length > 200){
        html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);color:#facc15;font-size:11.5px;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ২০০ দেখানো হচ্ছে (মোট ' + toBn(list.length) + ')</div>';
      }
      return html;
    }

    // ═══ Object type ═══
    var keys = Object.keys(data);
    if(searchText){
      var q2 = searchText.toLowerCase();
      keys = keys.filter(function(k){
        return (k + ' ' + JSON.stringify(data[k])).toLowerCase().indexOf(q2) !== -1;
      });
    }

    var html2 = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">' +
      '<div style="font-size:12.5px;color:#93c5fd;font-weight:800">' +
        '🔑 Keys: <b style="color:#fff">' + toBn(Object.keys(data).length) + '</b>' +
      '</div>' +
      (meta.editable ? '<button class="mini accept" id="db-add-key" style="padding:6px 14px;font-size:12px">➕ নতুন Key যোগ করুন</button>' : '') +
    '</div>';

    if(!keys.length){
      html2 += '<div class="empty" style="padding:30px;text-align:center;color:#7a8ab8">📭 কোনো key নেই</div>';
      return html2;
    }

    html2 += '<div class="table-wrap" style="max-height:55vh;overflow-y:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr>' +
        '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:left;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0">Key</th>' +
        '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:left;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0">Value</th>' +
        '<th style="padding:8px 10px;background:rgba(59,130,246,.15);color:#93c5fd;font-weight:900;text-align:center;border-bottom:1.5px solid rgba(59,130,246,.3);font-size:11px;position:sticky;top:0;width:150px">Actions</th>' +
      '</tr></thead><tbody>';

    keys.forEach(function(k){
      var val = data[k];
      var valDisplay = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if(valDisplay.length > 120) valDisplay = valDisplay.slice(0, 120) + '…';

      html2 += '<tr>' +
        '<td style="padding:8px 10px;color:#93c5fd;font-family:monospace;font-weight:800;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(k) + '</td>' +
        '<td style="padding:8px 10px;color:#e0eaff;font-family:monospace;font-size:11px;border-bottom:1px solid rgba(59,130,246,.08);word-break:break-all">' + esc(valDisplay) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;border-bottom:1px solid rgba(59,130,246,.08);white-space:nowrap">' +
          '<button class="mini" data-db-key-view="' + esc(k) + '" style="padding:4px 9px;font-size:11px;background:rgba(6,182,212,.15);border-color:rgba(6,182,212,.4);color:#22d3ee">👁️</button>' +
          (meta.editable ? ' <button class="mini" data-db-key-edit="' + esc(k) + '" style="padding:4px 9px;font-size:11px;background:rgba(250,204,21,.15);border-color:rgba(250,204,21,.4);color:#facc15">✏️</button>' : '') +
          (meta.editable ? ' <button class="mini danger" data-db-key-del="' + esc(k) + '" style="padding:4px 9px;font-size:11px">🗑️</button>' : '') +
        '</td>' +
      '</tr>';
    });

    html2 += '</tbody></table></div>';
    return html2;
  }

  function buildPreview(item, table){
    if(!item) return '—';
    if(table === 'txs'){
      var cfg = (typeof TX_TYPES !== 'undefined' && TX_TYPES[item.type]) || { icon: '📌', title: item.type };
      return cfg.icon + ' <b>' + esc(cfg.title) + '</b> — ৳ ' + fmt(item.amount) +
        (item.custName ? ' • 👤 ' + esc(item.custName) : '') +
        (item.date ? ' • ' + toBn(item.date) : '');
    }
    if(table === 'customers'){
      return '👤 <b>' + esc(item.name || '—') + '</b>' +
        (item.accountNo ? ' • ' + esc(item.accountNo) : '') +
        (item.mobile ? ' • 📱 ' + esc(item.mobile) : '');
    }
    if(table === 'users'){
      return '👤 <b>' + esc(item.name || '—') + '</b> • ' + esc(item.username || '—') +
        ' • ' + (item.role === 'admin' ? '👑' : '👤');
    }
    if(table === 'activity'){
      return esc(item.title || item.type || '—') +
        (item.detail ? ' • ' + esc(item.detail) : '') +
        (item.user ? ' • 👤 ' + esc(item.user) : '');
    }
    // Generic
    var s = JSON.stringify(item);
    return esc(s.length > 150 ? s.slice(0, 150) + '…' : s);
  }

  /* ═══════════════════════════════════════════════════════════
     MODAL
     ═══════════════════════════════════════════════════════════ */
  var m = openModal({
    title: '🗄️ Database Browser (Full Control)',
    bodyHTML:
      // Toolbar
      '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">' +
        '<input type="text" id="db-search" placeholder="🔍 Search..." style="flex:1;min-width:200px;padding:10px 14px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13px;font-weight:700;outline:none">' +
        '<button class="mini" id="db-export" style="padding:9px 14px;font-size:12px;background:rgba(6,182,212,.15);border-color:rgba(6,182,212,.4);color:#22d3ee">📥 Export All</button>' +
        '<button class="mini" id="db-import-btn" style="padding:9px 14px;font-size:12px;background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">📤 Import</button>' +
        '<input type="file" id="db-import-file" accept=".json" style="display:none">' +
      '</div>' +

      // Tabs
      '<div id="db-tabs">' + renderTabs() + '</div>' +

      // Content
      '<div id="db-content">' + renderTable() + '</div>' +
      '<div id="db-footer" style="margin-top:14px;padding:10px 14px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.2);font-size:11.5px;color:#a5b4d8">' +
        '💡 <b style="color:#fff">Ctrl+Enter</b> — JSON editor এ save • <b style="color:#fff">Esc</b> — বন্ধ করুন' +
      '</div>',
    xwide: true,
    onMount: function(root, close){
      var tabsEl = root.querySelector('#db-tabs');
      var contentEl = root.querySelector('#db-content');

      // ═══ Refresh ═══
      function refresh(){
        tabsEl.innerHTML = renderTabs();
        contentEl.innerHTML = renderTable();
        wireTabs();
        wireActions();
      }

      // ═══ Wire tabs ═══
      function wireTabs(){
        tabsEl.querySelectorAll('[data-db-tab]').forEach(function(b){
          b.addEventListener('click', function(){
            activeTab = b.dataset.dbTab;
            refresh();
          });
        });
      }

      // ═══ Wire actions ═══
      function wireActions(){
        var data = getTableData(activeTab);
        var meta = TABLES[activeTab];

        // Array — View
        contentEl.querySelectorAll('[data-db-view]').forEach(function(b){
          b.addEventListener('click', function(){
            var idx = parseInt(b.dataset.dbView, 10);
            var item = data[idx];
            openJsonViewer(item, activeTab, idx, function(){ refresh(); });
          });
        });

        // Array — Edit
        contentEl.querySelectorAll('[data-db-edit]').forEach(function(b){
          b.addEventListener('click', function(){
            var idx = parseInt(b.dataset.dbEdit, 10);
            var item = data[idx];
            openJsonEditor(item, function(newVal){
              data[idx] = newVal;
              saveAllData();
              refresh();
            });
          });
        });

        // Array — Delete
        contentEl.querySelectorAll('[data-db-del]').forEach(function(b){
          b.addEventListener('click', async function(){
            var idx = parseInt(b.dataset.dbDel, 10);
            var item = data[idx];
            if(!confirm('🗑️ এই item ডিলিট করবেন?\n\n' + buildPreview(item, activeTab).replace(/<[^>]+>/g, ''))) return;

            // Special handling for txs
            if(activeTab === 'txs' && item.id){
              if(!DB.deletedTxIds) DB.deletedTxIds = {};
              DB.deletedTxIds[item.id] = new Date().toISOString();
            }
            data.splice(idx, 1);
            await saveAllData();
            refresh();
            if(typeof toast === 'function') toast('🗑️ ডিলিট সফল', 'ok');
          });
        });

        // Object — View
        contentEl.querySelectorAll('[data-db-key-view]').forEach(function(b){
          b.addEventListener('click', function(){
            var key = b.dataset.dbKeyView;
            openJsonViewer({ key: key, value: data[key] }, activeTab, key, function(){ refresh(); });
          });
        });

        // Object — Edit
        contentEl.querySelectorAll('[data-db-key-edit]').forEach(function(b){
          b.addEventListener('click', function(){
            var key = b.dataset.dbKeyEdit;
            openJsonEditor(data[key], function(newVal){
              data[key] = newVal;
              saveAllData();
              refresh();
            }, key);
          });
        });

        // Object — Delete
        contentEl.querySelectorAll('[data-db-key-del]').forEach(function(b){
          b.addEventListener('click', async function(){
            var key = b.dataset.dbKeyDel;
            if(!confirm('🗑️ Key "' + key + '" ডিলিট করবেন?')) return;
            delete data[key];
            await saveAllData();
            refresh();
            if(typeof toast === 'function') toast('🗑️ ডিলিট সফল', 'ok');
          });
        });

        // Array — Add new
        var addBtn = contentEl.querySelector('#db-add-new');
        if(addBtn){
          addBtn.addEventListener('click', function(){
            var template = getTemplate(activeTab);
            openJsonEditor(template, async function(newVal){
              data.push(newVal);
              await saveAllData();
              refresh();
              if(typeof toast === 'function') toast('✅ যোগ করা হয়েছে', 'ok');
            }, null, true);
          });
        }

        // Object — Add new key
        var addKeyBtn = contentEl.querySelector('#db-add-key');
        if(addKeyBtn){
          addKeyBtn.addEventListener('click', function(){
            var key = prompt('নতুন Key এর নাম:');
            if(!key) return;
            if(data[key] !== undefined){
              toast('❌ এই key আগেই আছে', 'err');
              return;
            }
            var val = prompt('Value (JSON or text):', '');
            if(val === null) return;
            var parsed;
            try { parsed = JSON.parse(val); }
            catch(e){ parsed = val; }
            data[key] = parsed;
            saveAllData().then(refresh);
          });
        }
      }

      // ═══ Save all data ═══
      async function saveAllData(){
        try {
          if(typeof __invalidateCaches === 'function') __invalidateCaches();
          if(typeof normalizeDB === 'function') normalizeDB();
          if(typeof recomputeLive === 'function') recomputeLive();
          if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);

          DB.__updated = new Date().toISOString();
          if(typeof saveLocal === 'function') saveLocal();
          if(typeof pushCloud === 'function'){
            try { await pushCloud(); } catch(e){ console.warn('Push error:', e); }
          }
          if(typeof renderDashboard === 'function') renderDashboard();
        } catch(e){
          console.error('Save error:', e);
          toast('❌ Save error: ' + e.message, 'err');
        }
      }

      // ═══ Search ═══
      root.querySelector('#db-search').addEventListener('input', function(e){
        searchText = e.target.value.trim();
        contentEl.innerHTML = renderTable();
        wireActions();
      });

      // ═══ Export all ═══
      root.querySelector('#db-export').addEventListener('click', function(){
        try {
          var json = JSON.stringify(DB, null, 2);
          var blob = new Blob([json], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'ccbank_db_export_' + todayStr() + '.json';
          document.body.appendChild(a);
          a.click();
          setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
          if(typeof toast === 'function') toast('📥 Export হয়েছে', 'ok');
        } catch(e){
          toast('❌ ' + e.message, 'err');
        }
      });

      // ═══ Import ═══
      root.querySelector('#db-import-btn').addEventListener('click', function(){
        root.querySelector('#db-import-file').click();
      });

      root.querySelector('#db-import-file').addEventListener('change', function(e){
        var f = e.target.files[0];
        if(!f) return;
        var r = new FileReader();
        r.onload = async function(ev){
          try {
            var parsed = JSON.parse(ev.target.result);
            if(!parsed || typeof parsed !== 'object'){ toast('❌ ভুল ফাইল', 'err'); return; }
            if(!confirm('📤 Import করবেন?\n\n⚠️ বর্তমান সব data replace হবে!')) return;
            if(!confirm('⚠️ শেষবার confirm করুন।')) return;

            window.db = parsed;
            if(typeof normalizeDB === 'function') normalizeDB();
            await saveAllData();
            refresh();
            if(typeof toast === 'function') toast('✅ Import সফল', 'ok');
          } catch(e){
            toast('❌ ' + e.message, 'err');
          }
        };
        r.readAsText(f);
        e.target.value = '';
      });

      // Initial
      wireTabs();
      wireActions();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   📝 JSON EDITOR
   ═══════════════════════════════════════════════════════════ */
function openJsonEditor(value, onSave, keyName, isNew){
  var title = isNew ? '➕ নতুন Item' : ('✏️ এডিট' + (keyName ? ' — ' + keyName : ''));

  var jsonStr = JSON.stringify(value, null, 2);

  var m = openModal({
    title: title,
    bodyHTML:
      '<div style="margin-bottom:10px;font-size:11.5px;color:#7a8ab8;font-weight:700">' +
        '💡 JSON format এ এডিট করুন। <b style="color:#fff">Ctrl+Enter</b> চেপে save করুন।' +
      '</div>' +
      '<textarea id="je-input" style="width:100%;min-height:380px;padding:14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.4);color:#e0eaff;font-family:monospace;font-size:13px;line-height:1.6;outline:none;resize:vertical;box-sizing:border-box" spellcheck="false">' +
        esc(jsonStr) +
      '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button class="btn green" id="je-save" style="flex:1">💾 Save</button>' +
        '<button class="btn gray" id="je-close" style="padding:14px 22px">✕</button>' +
      '</div>',
    wide: true,
    onMount: function(root, close){
      var textarea = root.querySelector('#je-input');

      // Focus
      setTimeout(function(){ textarea.focus(); }, 100);

      // Save
      function doSave(){
        try {
          var parsed = JSON.parse(textarea.value);
          onSave(parsed);
          close();
        } catch(e){
          toast('❌ Invalid JSON: ' + e.message, 'err');
        }
      }

      root.querySelector('#je-save').addEventListener('click', doSave);
      root.querySelector('#je-close').addEventListener('click', close);

      // Ctrl+Enter
      textarea.addEventListener('keydown', function(e){
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
          e.preventDefault();
          doSave();
        }
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   👁️ JSON VIEWER
   ═══════════════════════════════════════════════════════════ */
function openJsonViewer(item, tableName, idx, onDelete){
  var jsonStr = JSON.stringify(item, null, 2);

  openModal({
    title: '👁️ বিস্তারিত — ' + (tableName || '') + ' #' + (typeof idx === 'number' ? toBn(idx + 1) : idx),
    bodyHTML:
      '<div style="padding:14px;border-radius:11px;background:#050810;border:1.5px solid rgba(59,130,246,.3);max-height:60vh;overflow-y:auto">' +
        '<pre style="margin:0;color:#e0eaff;font-family:monospace;font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-all">' +
          esc(jsonStr) +
        '</pre>' +
      '</div>' +
      '<div style="margin-top:14px;display:flex;gap:8px">' +
        '<button class="btn cyan" id="jv-copy" style="flex:1">📋 Copy</button>' +
        '<button class="btn gray" id="jv-close" style="padding:14px 22px">✕</button>' +
      '</div>',
    xwide: true,
    onMount: function(root, close){
      root.querySelector('#jv-copy').addEventListener('click', function(){
        navigator.clipboard.writeText(jsonStr).then(function(){
          toast('📋 Copy হয়েছে', 'ok');
        }).catch(function(){
          toast('❌ Copy fail', 'err');
        });
      });
      root.querySelector('#jv-close').addEventListener('click', close);
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   📋 TEMPLATE — নতুন item এর জন্য
   ═══════════════════════════════════════════════════════════ */
function getTemplate(table){
  if(table === 'txs'){
    return {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'deposit',
      date: todayStr(),
      branch: 'kalaroa',
      custBranch: 'kalaroa',
      dir: 'cash',
      amount: 0,
      notesIn: {},
      notesOut: {},
      custAcc: '',
      custName: '',
      custMobile: '',
      note: '',
      user: SESSION ? SESSION.name : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  if(table === 'customers'){
    return {
      id: 'cust_' + Date.now(),
      accountNo: '',
      name: '',
      mobile: '',
      branch: 'kalaroa',
      createdAt: new Date().toISOString()
    };
  }
  if(table === 'users'){
    return {
      id: 'user_' + Date.now(),
      name: '',
      username: '',
      password: '',
      plainPassword: '',
      role: 'user',
      branch: 'kalaroa',
      createdAt: new Date().toISOString()
    };
  }
  if(table === 'activity'){
    return {
      id: 'act_' + Date.now(),
      type: 'manual',
      title: '',
      detail: '',
      user: SESSION ? SESSION.name : '',
      at: new Date().toISOString()
    };
  }
  return {};
}

/* ═══════════════════════════════════════════════════════════
   🔗 Auto-inject button in sidebar
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
}, 2000);

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG
   ═══════════════════════════════════════════════════════════ */
window.__openDBBrowser = openDBBrowser;
window.__dbDump = function(){
  console.log('═══════════════════════════════════');
  console.log('🗄️ Database Dump');
  console.log('═══════════════════════════════════');
  Object.keys(DB).forEach(function(k){
    var v = DB[k];
    var info = Array.isArray(v) ? v.length + ' items' :
               (v && typeof v === 'object' ? Object.keys(v).length + ' keys' : typeof v);
    console.log('  ' + k + ':', info);
  });
  console.log('═══════════════════════════════════');
  return DB;
};

console.log('✅ DB Browser loaded — v1.0 (full control)');