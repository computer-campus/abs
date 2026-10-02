/* ============================================================
   FILE: managers/mgr-export-import.js
   PURPOSE: 📥 Export / 📤 Import (Full + Specific + Filtered)
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 DOWNLOAD JSON
   ═══════════════════════════════════════════════════════════ */
function downloadJSON(obj, filename){
  try{
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  } catch(e){
    toast('❌ ' + e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 EXPORT: CURRENT TABLE
   ═══════════════════════════════════════════════════════════ */
function exportCurrentTable(tableName){
  const data = getTableData(tableName);
  if(!data){ toast('❌ Table নেই'); return; }
  
  const exportObj = {
    __exportMeta: {
      type: 'table',
      table: tableName,
      exportedAt: new Date().toISOString(),
      exportedBy: session?.name || 'system',
      appVersion: window.APP_VERSION,
      count: Array.isArray(data) ? data.length : Object.keys(data).length
    },
    data: data
  };
  
  downloadJSON(exportObj, 'cc_' + tableName + '_' + todayStr() + '.json');
  toast('📥 Export: ' + (Array.isArray(data) ? data.length : Object.keys(data).length) + ' items');
}

/* ═══════════════════════════════════════════════════════════
   🔥 EXPORT: FILTERED DATA
   ═══════════════════════════════════════════════════════════ */
function exportFilteredData(activeTab, filters){
  const data = getTableData(activeTab);
  if(!Array.isArray(data)){
    toast('❌ শুধু array table export হবে');
    return;
  }
  
  let filtered = data.slice();
  
  if(filters.dateFrom) filtered = filtered.filter(item => item.date >= filters.dateFrom);
  if(filters.dateTo) filtered = filtered.filter(item => item.date <= filters.dateTo);
  if(filters.type && filters.type !== 'all') filtered = filtered.filter(item => item.type === filters.type);
  if(filters.branch && filters.branch !== 'all') filtered = filtered.filter(item => item.branch === filters.branch);
  if(filters.search){
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(item => JSON.stringify(item).toLowerCase().includes(q));
  }
  
  if(!filtered.length){ toast('❌ কোনো item পাওয়া যায়নি'); return; }
  
  const exportObj = {
    __exportMeta: {
      type: 'filtered',
      table: activeTab,
      filters: filters,
      exportedAt: new Date().toISOString(),
      exportedBy: session?.name || 'system',
      appVersion: window.APP_VERSION,
      count: filtered.length
    },
    data: filtered
  };
  
  downloadJSON(exportObj, 'cc_' + activeTab + '_filtered_' + todayStr() + '.json');
  toast('📥 Export: ' + filtered.length + ' items');
}

/* ═══════════════════════════════════════════════════════════
   🔥 EXPORT: SPECIFIC TABLES
   ═══════════════════════════════════════════════════════════ */
function exportSpecificTables(tables){
  if(!tables || !tables.length){ toast('❌ কোনো table select করুন'); return; }
  
  const db = DB();
  const exportObj = {
    __exportMeta: {
      type: 'partial_db',
      tables: tables,
      exportedAt: new Date().toISOString(),
      exportedBy: session?.name || 'system',
      appVersion: window.APP_VERSION
    },
    data: {}
  };
  
  tables.forEach(t => {
    if(db[t] !== undefined){
      exportObj.data[t] = JSON.parse(JSON.stringify(db[t]));
    }
  });
  
  downloadJSON(exportObj, 'cc_partial_db_' + todayStr() + '.json');
  toast('📥 Export: ' + tables.length + ' tables');
}

/* ═══════════════════════════════════════════════════════════
   🔥 EXPORT DIALOG (Main)
   ═══════════════════════════════════════════════════════════ */
function openExportDialog(activeTab, searchQuery){
  const currentData = getTableData(activeTab);
  const itemCount = Array.isArray(currentData) ?
    currentData.length :
    (currentData ? Object.keys(currentData).length : 0);
  
  openModal({
    title: '📥 Export Data',
    wide: true,
    bodyHTML:
      '<div style="padding:12px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(0,0,0,.2));border:1.5px solid rgba(59,130,246,.4);margin-bottom:16px">' +
        '<div style="font-size:13px;color:#93c5fd;font-weight:800;margin-bottom:6px">📊 Current Table</div>' +
        '<div style="font-size:16px;color:#fff;font-weight:900">' + esc(activeTab) + '</div>' +
        '<div style="font-size:12px;color:#a5b4d8;margin-top:4px">মোট: ' + toBn(itemCount) + ' items</div>' +
      '</div>' +
      
      '<button class="btn cyan block" id="ex_current" style="margin-bottom:10px;padding:14px;text-align:left">' +
        '<div style="font-weight:900;font-size:15px;margin-bottom:4px">📦 ১. Current Table (Full)</div>' +
        '<div style="font-size:12px;opacity:.85">শুধু <b>' + esc(activeTab) + '</b> table-এর সব data</div>' +
      '</button>' +
      
      '<button class="btn green block" id="ex_filtered" style="margin-bottom:10px;padding:14px;text-align:left">' +
        '<div style="font-weight:900;font-size:15px;margin-bottom:4px">🔍 ২. Filtered Export</div>' +
        '<div style="font-size:12px;opacity:.85">তারিখ / ধরন / আউটলেট অনুযায়ী</div>' +
      '</button>' +
      
      '<button class="btn purple block" id="ex_specific" style="margin-bottom:10px;padding:14px;text-align:left">' +
        '<div style="font-weight:900;font-size:15px;margin-bottom:4px">🗄️ ৩. Specific Tables</div>' +
        '<div style="font-size:12px;opacity:.85">একাধিক table একসাথে</div>' +
      '</button>' +
      
      '<button class="btn yellow block" id="ex_full" style="padding:14px;text-align:left">' +
        '<div style="font-weight:900;font-size:15px;margin-bottom:4px;color:#000">💾 ৪. Full Database</div>' +
        '<div style="font-size:12px;color:#000;opacity:.75">সম্পূর্ণ database backup</div>' +
      '</button>',
    
    onMount: (w, close) => {
      w.querySelector('#ex_current').addEventListener('click', () => {
        exportCurrentTable(activeTab);
        close();
      });
      
      w.querySelector('#ex_filtered').addEventListener('click', () => {
        close();
        openFilteredExportDialog(activeTab, searchQuery);
      });
      
      w.querySelector('#ex_specific').addEventListener('click', () => {
        close();
        openSpecificTablesDialog();
      });
      
      w.querySelector('#ex_full').addEventListener('click', () => {
        if(!confirm('💾 সম্পূর্ণ database export করবেন?')) return;
        
        const exportObj = {
          __exportMeta: {
            type: 'full_db',
            exportedAt: new Date().toISOString(),
            exportedBy: session?.name || 'system',
            appVersion: window.APP_VERSION,
            txCount: (DB().txs || []).length,
            custCount: (DB().customers || []).length,
            userCount: (DB().users || []).length
          },
          data: JSON.parse(JSON.stringify(DB()))
        };
        
        downloadJSON(exportObj, 'cc_full_backup_' + todayStr() + '.json');
        toast('💾 Full backup download');
        close();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 FILTERED EXPORT DIALOG
   ═══════════════════════════════════════════════════════════ */
function openFilteredExportDialog(activeTab, searchQuery){
  const isTxTable = ['txs', 'txEditLog', 'activityLog'].includes(activeTab);
  
  openModal({
    title: '🔍 Filtered Export — ' + activeTab,
    wide: true,
    bodyHTML:
      '<div style="padding:12px;border-radius:12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);margin-bottom:16px;font-size:13px;color:#a5b4d8;line-height:1.7">' +
        '💡 <b style="color:#4ade80">Field খালি রাখলে সব data আসবে</b>' +
      '</div>' +
      
      '<div class="form-row">' +
        '<div class="field"><label>📅 তারিখ থেকে</label><input type="date" id="ex_from"></div>' +
        '<div class="field"><label>📅 তারিখ পর্যন্ত</label><input type="date" id="ex_to"></div>' +
      '</div>' +
      
      (isTxTable ?
        '<div class="form-row">' +
          '<div class="field"><label>📋 ধরন</label>' +
            '<select id="ex_type">' +
              '<option value="all">— সব —</option>' +
              Object.entries(TX_CFG).map(([k, v]) =>
                '<option value="' + k + '">' + v.icon + ' ' + v.title + '</option>'
              ).join('') +
            '</select>' +
          '</div>' +
          '<div class="field"><label>🏦 আউটলেট</label>' +
            '<select id="ex_branch">' +
              '<option value="all">— সব —</option>' +
              '<option value="kalaroa">কলারোয়া</option>' +
              '<option value="jhaudanga">ঝাউডাঙ্গা</option>' +
            '</select>' +
          '</div>' +
        '</div>'
        : '') +
      
      '<div class="field">' +
        '<label>🔍 সার্চ (ঐচ্ছিক)</label>' +
        '<input type="text" id="ex_search" value="' + esc(searchQuery || '') + '" autocomplete="off">' +
      '</div>' +
      
      '<div style="margin-top:14px;padding:12px;border-radius:10px;background:rgba(0,0,0,.4);border:1px solid rgba(59,130,246,.3)">' +
        '<div style="font-size:12px;color:#93c5fd;font-weight:700;margin-bottom:4px">📊 Preview</div>' +
        '<div id="ex_preview" style="font-size:14px;color:#fff;font-weight:900">0 items</div>' +
      '</div>' +
      
      '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
        '<button class="btn green" id="ex_doit" style="flex:1;min-width:160px">📥 Export</button>' +
      '</div>',
    
    onMount: (w, close) => {
      function updatePreview(){
        const data = getTableData(activeTab);
        if(!Array.isArray(data)) return;
        
        const filters = {
          dateFrom: w.querySelector('#ex_from').value,
          dateTo: w.querySelector('#ex_to').value,
          type: w.querySelector('#ex_type')?.value || 'all',
          branch: w.querySelector('#ex_branch')?.value || 'all',
          search: w.querySelector('#ex_search').value.trim()
        };
        
        let filtered = data.slice();
        if(filters.dateFrom) filtered = filtered.filter(item => item.date >= filters.dateFrom);
        if(filters.dateTo) filtered = filtered.filter(item => item.date <= filters.dateTo);
        if(filters.type !== 'all') filtered = filtered.filter(item => item.type === filters.type);
        if(filters.branch !== 'all') filtered = filtered.filter(item => item.branch === filters.branch);
        if(filters.search){
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(item => JSON.stringify(item).toLowerCase().includes(q));
        }
        
        w.querySelector('#ex_preview').textContent = toBn(filtered.length) + ' items';
      }
      
      ['ex_from', 'ex_to', 'ex_type', 'ex_branch', 'ex_search'].forEach(id => {
        const el = w.querySelector('#' + id);
        if(el){
          el.addEventListener('input', updatePreview);
          el.addEventListener('change', updatePreview);
        }
      });
      
      updatePreview();
      
      w.querySelector('#ex_doit').addEventListener('click', () => {
        const filters = {
          dateFrom: w.querySelector('#ex_from').value,
          dateTo: w.querySelector('#ex_to').value,
          type: w.querySelector('#ex_type')?.value || 'all',
          branch: w.querySelector('#ex_branch')?.value || 'all',
          search: w.querySelector('#ex_search').value.trim()
        };
        exportFilteredData(activeTab, filters);
        close();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 SPECIFIC TABLES DIALOG
   ═══════════════════════════════════════════════════════════ */
function openSpecificTablesDialog(){
  const allTables = [
    'txs', 'customers', 'users', 'txEditLog', 'activityLog',
    'branchCapital', 'baseVault', 'baseAccounts', 'liveVault',
    'liveAccounts', 'yearlyArchive', 'deletedTxIds'
  ];
  
  openModal({
    title: '🗄️ Specific Tables Export',
    wide: true,
    bodyHTML:
      '<div style="font-size:13px;color:#a5b4d8;margin-bottom:14px;line-height:1.7">' +
        '💡 যে টেবিলগুলো চান সেগুলো select করুন।' +
      '</div>' +
      
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">' +
        allTables.map(t => {
          const cnt = getTableCount(t);
          return '<label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;background:rgba(0,0,0,.3);border:1.5px solid rgba(59,130,246,.3);cursor:pointer">' +
            '<input type="checkbox" class="ext-check" value="' + t + '" style="width:20px;height:20px;accent-color:#3b82f6;cursor:pointer">' +
            '<div style="flex:1">' +
              '<div style="font-size:14px;font-weight:800;color:#fff">' + esc(t) + '</div>' +
              '<div style="font-size:11.5px;color:#93c5fd;margin-top:2px">' + toBn(cnt) + ' items</div>' +
            '</div>' +
          '</label>';
        }).join('') +
      '</div>' +
      
      '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">' +
        '<button class="btn green" id="ext_all" style="flex:1;padding:12px">✅ সব Select</button>' +
        '<button class="btn gray" id="ext_none" style="flex:1;padding:12px">❌ সব Unselect</button>' +
      '</div>' +
      
      '<div style="display:flex;gap:10px;margin-top:14px">' +
        '<button class="btn cyan block" id="ext_doit" style="padding:14px">📥 Export Selected</button>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#ext_all').addEventListener('click', () => {
        w.querySelectorAll('.ext-check').forEach(cb => cb.checked = true);
      });
      
      w.querySelector('#ext_none').addEventListener('click', () => {
        w.querySelectorAll('.ext-check').forEach(cb => cb.checked = false);
      });
      
      w.querySelector('#ext_doit').addEventListener('click', () => {
        const selected = Array.from(w.querySelectorAll('.ext-check:checked')).map(cb => cb.value);
        if(!selected.length){
          alert('❌ কমপক্ষে একটি table select করুন');
          return;
        }
        exportSpecificTables(selected);
        close();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 IMPORT: SPECIFIC DATA
   ═══════════════════════════════════════════════════════════ */
async function importSpecificData(fileData, options){
  try{
    const parsed = JSON.parse(fileData);
    if(!parsed || !parsed.__exportMeta || !parsed.data){
      alert('❌ Invalid export file!');
      return false;
    }
    
    const meta = parsed.__exportMeta;
    const data = parsed.data;
    const db = DB();
    const mode = options.mode || 'merge';
    const itemCount = Array.isArray(data) ? data.length : Object.keys(data).length;
    
    const confirmMsg =
      '📤 Import করবেন?\n\n' +
      '📁 Type: ' + meta.type + '\n' +
      '📊 Items: ' + itemCount + '\n' +
      '📅 Exported: ' + (meta.exportedAt || 'unknown') + '\n' +
      '👤 By: ' + (meta.exportedBy || 'unknown') + '\n\n' +
      '⚙️ Mode: ' + (mode === 'replace' ? '🔴 Replace' : '🟢 Merge') + '\n\n' +
      '⚠️ এটি undo করা যাবে না!';
    
    if(!confirm(confirmMsg)) return false;
    
    if(meta.type === 'table'){
      const tableName = meta.table;
      
      if(Array.isArray(data)){
        if(mode === 'replace'){
          db[tableName] = data;
        } else {
          if(!Array.isArray(db[tableName])) db[tableName] = [];
          const existingIds = new Set(db[tableName].map(x => x.id));
          data.forEach(item => {
            if(item.id && existingIds.has(item.id)){
              const idx = db[tableName].findIndex(x => x.id === item.id);
              if(idx >= 0) db[tableName][idx] = item;
            } else {
              db[tableName].push(item);
            }
          });
        }
      } else {
        if(mode === 'replace'){
          db[tableName] = data;
        } else {
          db[tableName] = { ...db[tableName], ...data };
        }
      }
    } else if(meta.type === 'filtered'){
      const tableName = meta.table;
      if(!Array.isArray(db[tableName])) db[tableName] = [];
      const existingIds = new Set(db[tableName].map(x => x.id));
      data.forEach(item => {
        if(item.id && existingIds.has(item.id)){
          const idx = db[tableName].findIndex(x => x.id === item.id);
          if(idx >= 0) db[tableName][idx] = item;
        } else {
          db[tableName].push(item);
        }
      });
    } else if(meta.type === 'partial_db'){
      Object.keys(data).forEach(tableName => {
        if(Array.isArray(data[tableName])){
          if(mode === 'replace'){
            db[tableName] = data[tableName];
          } else {
            if(!Array.isArray(db[tableName])) db[tableName] = [];
            const existingIds = new Set(db[tableName].map(x => x.id));
            data[tableName].forEach(item => {
              if(item.id && existingIds.has(item.id)){
                const idx = db[tableName].findIndex(x => x.id === item.id);
                if(idx >= 0) db[tableName][idx] = item;
              } else {
                db[tableName].push(item);
              }
            });
          }
        } else if(data[tableName] && typeof data[tableName] === 'object'){
          if(mode === 'replace'){
            db[tableName] = data[tableName];
          } else {
            db[tableName] = { ...db[tableName], ...data[tableName] };
          }
        }
      });
    } else if(meta.type === 'full_db'){
      if(mode === 'replace'){
        window.db = data;
      } else {
        // Smart merge for full DB
        const merged = smartMergeCloudLocal(data, db);
        window.db = merged;
      }
    } else {
      alert('❌ Unknown export type: ' + meta.type);
      return false;
    }
    
    normalizeDB();
    forceFixAdmin();
    __invalidateCaches();
    recalcAllCustomerDues(false);
    recomputeLive();
    
    await saveDB();
    try{ await pushRemoteDB(true); } catch(e){}
    
    renderTopbar();
    renderDashboard(true);
    renderSidebar();
    
    toast('✅ Import সফল!');
    return true;
  } catch(e){
    alert('❌ Import error:\n\n' + e.message);
    return false;
  }
}

/* ───── END OF FILE managers/mgr-export-import.js ───── */
console.log('✅ Manager Export/Import loaded');