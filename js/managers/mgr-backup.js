/* ============================================================
   FILE: managers/mgr-backup.js
   PURPOSE: 💾 Backup Manager + Danger Zone (Complete Reset)
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 INDEXEDDB HELPERS
   ═══════════════════════════════════════════════════════════ */
let __backupDB = null;

function openBackupDB(){
  return new Promise((resolve, reject) => {
    if(__backupDB) return resolve(__backupDB);
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB'));
    
    const req = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(BACKUP_STORE)){
        const store = db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('isAuto', 'isAuto');
      }
    };
    
    req.onsuccess = (e) => {
      __backupDB = e.target.result;
      resolve(__backupDB);
    };
    
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveBackupToStore(data, options){
  options = options || {};
  const db = await openBackupDB();
  const json = JSON.stringify(data);
  
  const backup = {
    id: options.id || uid(),
    name: options.name || 'ব্যাকআপ',
    note: options.note || '',
    isAuto: !!options.isAuto,
    createdAt: options.createdAt || new Date().toISOString(),
    size: json.length,
    txCount: (data.txs || []).length,
    custCount: (data.customers || []).length,
    userCount: (data.users || []).length,
    capital: Number(data.totalCapital) || 0,
    user: session?.name || 'system',
    data: data
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    const req = tx.objectStore(BACKUP_STORE).put(backup);
    req.onsuccess = () => resolve(backup);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getAllBackups(){
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const req = tx.objectStore(BACKUP_STORE).getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      resolve(list);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function deleteBackupById(id){
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    const req = tx.objectStore(BACKUP_STORE).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function clearAllBackups(){
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    const req = tx.objectStore(BACKUP_STORE).clear();
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 FORMAT HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatBytes(bytes){
  if(!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while(n >= 1024 && i < units.length - 1){ n /= 1024; i++; }
  return n.toFixed(2) + ' ' + units[i];
}

function fmtBackupDate(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    return toBn(String(d.getDate()).padStart(2, '0')) + '/' +
      toBn(String(d.getMonth() + 1).padStart(2, '0')) + '/' +
      toBn(d.getFullYear()) + ' ' + fmtTimeOnly(iso);
  } catch(e){ return '-'; }
}

/* ═══════════════════════════════════════════════════════════
   🔥 CREATE / RESTORE BACKUP
   ═══════════════════════════════════════════════════════════ */
async function createBackupSnapshot(name, isAuto, note){
  try{
    if(!DB()) return null;
    
    const snapshot = JSON.parse(JSON.stringify(DB()));
    snapshot.__backupMeta = {
      at: new Date().toISOString(),
      user: session?.name || 'system',
      reason: isAuto ? 'auto' : 'manual'
    };
    
    const defaultName = (isAuto ? '🤖 অটো' : '📸 ম্যানুয়াল') + ' — ' +
      new Date().toLocaleString('en-GB');
    
    const backup = await saveBackupToStore(snapshot, {
      name: name || defaultName,
      isAuto: !!isAuto,
      note: note || ''
    });
    
    // Auto-cleanup old backups
    if(isAuto){
      const all = await getAllBackups();
      const autos = all.filter(b => b.isAuto).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      if(autos.length > AUTO_BACKUP_MAX){
        for(const b of autos.slice(AUTO_BACKUP_MAX)){
          await deleteBackupById(b.id);
        }
      }
    }
    
    return backup;
  } catch(e){
    return null;
  }
}

async function downloadBackupFile(backup){
  if(!backup || !backup.data){ toast('❌ নেই'); return; }
  
  try{
    const json = JSON.stringify(backup.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(backup.name || 'backup')
      .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_')
      .slice(0, 40);
    
    a.href = url;
    a.download = 'cc_backup_' + safeName + '_' + (backup.createdAt || '').slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    
    toast('📥 ডাউনলোড');
  } catch(e){
    toast('❌ ' + e.message);
  }
}

async function restoreBackupFromStore(backup, silent){
  if(!backup || !backup.data){ toast('❌ নেই'); return false; }
  if(!requireAdmin('রিস্টোর')) return false;
  
  if(!silent){
    if(!confirm('♻️ রিস্টোর করবেন?\n\n📦 ' + backup.name + '\n\n⚠️ বর্তমান ডেটা মুছে যাবে!')) return false;
  }
  
  try{
    // Safety backup first
    await createBackupSnapshot('🔒 প্রি-রিস্টোর', true, 'auto safety');
    
    window.db = JSON.parse(JSON.stringify(backup.data));
    __lastAutoPushTs = '';
    
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
    
    toast('✅ রিস্টোর সফল');
    return true;
  } catch(e){
    toast('❌ ' + e.message);
    return false;
  }
}

async function maybeAutoBackup(){
  try{
    if(!DB()) return;
    
    const last = safeLS_get(AUTO_BACKUP_KEY);
    const today = todayStr();
    if(last === today) return;
    
    const txC = (DB().txs || []).length;
    const cuC = (DB().customers || []).length;
    if(txC === 0 && cuC === 0) return;
    
    await createBackupSnapshot(null, true, 'দৈনিক অটো');
    safeLS_set(AUTO_BACKUP_KEY, today);
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   🔥 BACKUP MODAL (Main)
   ═══════════════════════════════════════════════════════════ */
function openBackupModal(){
  if(!requireAdmin('ব্যাকআপ')) return;
  
  let _currentTab = 'all';
  let _cache = [];
  
  openModal({
    title: '💾 ব্যাকআপ ম্যানেজার',
    xwide: true,
    bodyHTML:
      // ═════ Top Buttons ═════
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px">' +
        '<button class="btn green" id="bk_new">📸 নতুন ব্যাকআপ</button>' +
        '<button class="btn cyan" id="bk_download_now">📥 JSON ডাউনলোড</button>' +
        '<button class="btn purple" id="bk_restore_file">📤 ফাইল থেকে রিস্টোর</button>' +
        '<input type="file" id="bk_file_input" accept=".json" style="display:none">' +
      '</div>' +
      
      // ═════ Tabs ═════
      '<div class="db-tabs" style="margin-bottom:10px">' +
        '<button class="db-tab-btn active" data-bk-tab="all">📦 সব <span class="cnt" id="bk_cnt_all">0</span></button>' +
        '<button class="db-tab-btn" data-bk-tab="manual">📸 ম্যানুয়াল</button>' +
        '<button class="db-tab-btn" data-bk-tab="auto">🤖 অটো</button>' +
      '</div>' +
      
      // ═════ Backup List ═════
      '<div id="bk_list_body"><div class="empty"><span class="spinner"></span> লোড...</div></div>' +
      
      // ═════ DANGER ZONE ═════
      '<div style="margin-top:18px;padding:16px;border-radius:14px;background:linear-gradient(145deg,rgba(220,38,38,.12),rgba(153,27,27,.05));border:2px solid rgba(220,38,38,.5)">' +
        '<div style="font-size:14px;font-weight:900;color:#f87171;margin-bottom:12px;display:flex;align-items:center;gap:8px">' +
          '🚨 Danger Zone ' +
          '<span style="font-size:11px;color:#fca5a5;font-weight:700;padding:3px 10px;border-radius:6px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5)">⚠️ সাবধান</span>' +
        '</div>' +
        
        '<div style="display:grid;gap:10px">' +
          // Complete Reset
          '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.4);border:1.5px solid rgba(220,38,38,.4)">' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">' +
              '<div style="flex:1;min-width:200px">' +
                '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px">' +
                  '🔄 সম্পূর্ণ Reset ' +
                  '<span style="font-size:10.5px;padding:2px 8px;border-radius:5px;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-weight:800">Recommended</span>' +
                '</div>' +
                '<div style="font-size:11.5px;color:#a5b4d8;line-height:1.7">' +
                  'সব জায়গা থেকে data মুছবে: <b style="color:#fff">Cloud + LocalStorage + IndexedDB + Memory</b>। তারপর App fresh start করবে।' +
                '</div>' +
              '</div>' +
              '<button class="btn red" id="bk_complete_reset" style="min-width:160px;padding:14px 20px;font-size:14px;font-weight:900">🔄 Complete Reset</button>' +
            '</div>' +
          '</div>' +
          
          // Backup Only Clear
          '<div style="padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid rgba(220,38,38,.3)">' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
              '<div style="flex:1;min-width:180px">' +
                '<div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px">🗑️ শুধু ব্যাকআপ মুছুন</div>' +
                '<div style="font-size:11px;color:#7a8ab8;line-height:1.6">শুধু IndexedDB-এর backup files মুছবে। DB data অপরিবর্তিত থাকবে।</div>' +
              '</div>' +
              '<button class="btn red sm" id="bk_clear_backups" style="min-width:140px">🗑️ ব্যাকআপ Clear</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        
        '<div style="font-size:11px;color:#fca5a5;margin-top:12px;line-height:1.7;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,.3);border:1px dashed rgba(220,38,38,.3)">' +
          '💡 <b style="color:#fff">Complete Reset</b> চাপলে:<br>' +
          '&nbsp;&nbsp;• Supabase Cloud → empty করা হবে<br>' +
          '&nbsp;&nbsp;• LocalStorage + SessionStorage → clear<br>' +
          '&nbsp;&nbsp;• IndexedDB backups → delete<br>' +
          '&nbsp;&nbsp;• Memory DB → reset<br>' +
          '&nbsp;&nbsp;• Auto-reload হবে 3 সেকেন্ডে<br>' +
          '⚠️ এরপর App নিজে থেকে fresh DB বানাবে' +
        '</div>' +
      '</div>',
    
    onMount: async (w, close) => {
      
      /* ═════ LOAD & RENDER LIST ═════ */
      async function loadAndRender(){
        const listBody = w.querySelector('#bk_list_body');
        
        try{
          listBody.innerHTML = '<div class="empty"><span class="spinner"></span> লোড...</div>';
          _cache = await getAllBackups();
        } catch(e){
          listBody.innerHTML = '<div class="empty" style="color:#f87171">❌ ' + esc(e.message) + '</div>';
          return;
        }
        
        const all = _cache;
        const manual = all.filter(b => !b.isAuto);
        const auto = all.filter(b => b.isAuto);
        
        w.querySelector('#bk_cnt_all').textContent = toBn(all.length);
        
        let filtered = all;
        if(_currentTab === 'manual') filtered = manual;
        else if(_currentTab === 'auto') filtered = auto;
        
        if(!filtered.length){
          listBody.innerHTML = '<div class="empty">📭 ব্যাকআপ নেই</div>';
          return;
        }
        
        listBody.innerHTML = '<div style="max-height:52vh;overflow-y:auto">' +
          filtered.map(b => {
            const cardColor = b.isAuto ? '#a78bfa' : '#22c55e';
            const badge = b.isAuto ? '🤖 অটো' : '📸 ম্যানুয়াল';
            
            return '<div style="margin-bottom:10px;padding:14px;border-radius:14px;background:linear-gradient(145deg,#0f1428,#07091a);border-left:4px solid ' + cardColor + '">' +
              '<div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:6px">' +
                esc(b.name) +
                ' <span style="font-size:10.5px;color:' + cardColor + '">' + badge + '</span>' +
              '</div>' +
              '<div style="font-size:11.5px;color:#a5b4d8">' +
                '<span>📅 ' + fmtBackupDate(b.createdAt) + '</span> • ' +
                '<span>💾 ' + formatBytes(b.size) + '</span> • ' +
                '<span>📋 ' + toBn(b.txCount || 0) + ' tx</span>' +
              '</div>' +
              '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="mini" data-bk-dl="' + b.id + '">📥 ডাউনলোড</button>' +
                '<button class="mini accept" data-bk-restore="' + b.id + '">♻️ রিস্টোর</button>' +
                '<button class="mini danger" data-bk-del="' + b.id + '">🗑️ ডিলিট</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
        
        // Download
        listBody.querySelectorAll('[data-bk-dl]').forEach(btn => btn.addEventListener('click', async () => {
          const b = _cache.find(x => x.id === btn.dataset.bkDl);
          if(b) downloadBackupFile(b);
        }));
        
        // Restore
        listBody.querySelectorAll('[data-bk-restore]').forEach(btn => btn.addEventListener('click', async () => {
          const b = _cache.find(x => x.id === btn.dataset.bkRestore);
          if(!b) return;
          const ok = await restoreBackupFromStore(b);
          if(ok) close();
        }));
        
        // Delete
        listBody.querySelectorAll('[data-bk-del]').forEach(btn => btn.addEventListener('click', async () => {
          const b = _cache.find(x => x.id === btn.dataset.bkDel);
          if(!b) return;
          if(!confirm('ডিলিট?')) return;
          try{
            await deleteBackupById(b.id);
            loadAndRender();
          } catch(e){
            toast('❌ ' + e.message);
          }
        }));
      }
      
      /* ═════ TAB SWITCH ═════ */
      w.querySelectorAll('[data-bk-tab]').forEach(btn => btn.addEventListener('click', () => {
        w.querySelectorAll('[data-bk-tab]').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        _currentTab = btn.dataset.bkTab;
        loadAndRender();
      }));
      
      /* ═════ NEW BACKUP ═════ */
      w.querySelector('#bk_new').addEventListener('click', async () => {
        const btn = w.querySelector('#bk_new');
        btn.disabled = true;
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span>';
        
        try{
          await saveDB();
          const b = await createBackupSnapshot(null, false, 'ম্যানুয়াল');
          if(b){
            toast('✅ ' + formatBytes(b.size));
            await loadAndRender();
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = orig;
        }
      });
      
      /* ═════ DOWNLOAD NOW ═════ */
      w.querySelector('#bk_download_now').addEventListener('click', async () => {
        await saveDB();
        const json = JSON.stringify(DB(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cc_live_' + todayStr() + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        toast('📥 ডাউনলোড');
      });
      
      /* ═════ RESTORE FROM FILE ═════ */
      w.querySelector('#bk_restore_file').addEventListener('click', () => {
        w.querySelector('#bk_file_input').click();
      });
      
      w.querySelector('#bk_file_input').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if(!f) return;
        
        const r = new FileReader();
        r.onload = async (ev) => {
          try{
            const data = JSON.parse(ev.target.result);
            if(!data || !data.users || !data.baseVault){
              alert('❌ ভুল ফাইল');
              return;
            }
            
            const ok = await restoreBackupFromStore({
              id: 'up_' + Date.now(),
              name: '📤 ' + f.name,
              createdAt: new Date().toISOString(),
              size: f.size,
              txCount: (data.txs || []).length,
              custCount: (data.customers || []).length,
              userCount: (data.users || []).length,
              capital: data.totalCapital || 0,
              isAuto: false,
              data: data
            });
            
            if(ok) close();
          } catch(err){
            alert('❌ ' + err.message);
          }
        };
        r.readAsText(f);
        e.target.value = '';
      });
      
      /* ═════ CLEAR ONLY BACKUPS ═════ */
      w.querySelector('#bk_clear_backups').addEventListener('click', async () => {
        if(prompt('টাইপ করুন: DELETE ALL') !== 'DELETE ALL') return;
        
        try{
          await clearAllBackups();
          toast('✅ সব ব্যাকআপ মুছে ফেলা হয়েছে');
          loadAndRender();
        } catch(e){
          toast('❌ ' + e.message);
        }
      });
      
      /* ═════ COMPLETE RESET ═════ */
      w.querySelector('#bk_complete_reset').addEventListener('click', async () => {
        if(!confirm(
          '🔄 সম্পূর্ণ Reset করবেন?\n\n' +
          '═══════════════════════════════\n' +
          '📌 Cloud (Supabase): empty হবে\n' +
          '📌 LocalStorage: clear হবে\n' +
          '📌 SessionStorage: clear হবে\n' +
          '📌 IndexedDB Backups: delete হবে\n' +
          '📌 Memory DB: reset হবে\n' +
          '═══════════════════════════════\n\n' +
          '⚠️ সব data চিরতরে মুছে যাবে!\n' +
          '🔄 Page auto-reload হবে 3 সেকেন্ডে\n\n' +
          '✅ এরপর App fresh DB দিয়ে চালু হবে।\n\n' +
          'চালিয়ে যাবেন?'
        )) return;
        
        const t = prompt('নিশ্চিত করতে টাইপ করুন: RESET');
        if(t !== 'RESET'){ toast('❌ বাতিল'); return; }
        
        const btn = w.querySelector('#bk_complete_reset');
        btn.disabled = true;
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Reset চলছে...';
        
        try{
          /* -------- Step 1: Timers bondho -------- */
          try{
            if(window.__autoPushInterval){ clearInterval(window.__autoPushInterval); window.__autoPushInterval = null; }
            if(window.__remoteSaveTimer){ clearTimeout(window.__remoteSaveTimer); window.__remoteSaveTimer = null; }
            if(window.__localSaveTimer){ clearTimeout(window.__localSaveTimer); window.__localSaveTimer = null; }
            if(window.__lightRenderTimer){ clearTimeout(window.__lightRenderTimer); window.__lightRenderTimer = null; }
            console.log('✅ Timers bondho');
          } catch(e){}
          
          /* -------- Step 2: Channels disconnect -------- */
          try{
            if(window.__realtimeChannel && window.__supabaseClient){
              try{ window.__realtimeChannel.untrack(); } catch(e){}
              try{ window.__supabaseClient.removeChannel(window.__realtimeChannel); } catch(e){}
              window.__realtimeChannel = null;
            }
            if(window.__activityChannel && window.__supabaseClient){
              try{ window.__supabaseClient.removeChannel(window.__activityChannel); } catch(e){}
              window.__activityChannel = null;
              window.__activityChannelReady = false;
            }
            if(window.__broadcastCh){ try{ window.__broadcastCh.close(); } catch(e){} }
            console.log('✅ Channels disconnect');
          } catch(e){}
          
          /* -------- Step 3: Supabase Cloud empty -------- */
          try{
            if(window.__supabaseClient){
              const emptyDB = {
                __version: window.APP_VERSION || 'ccbank-v7.2',
                users: [],
                customers: [],
                txs: [],
                txEditLog: [],
                activityLog: [],
                totalCapital: 0,
                branchCapital: { kalaroa: 0, jhaudanga: 0 },
                baseVault: {
                  kalaroa: { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
                  jhaudanga: { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }
                },
                baseAccounts: {
                  kalaroa: { bank: 0, cash: 0, other: 0 },
                  jhaudanga: { bank: 0, cash: 0, other: 0 }
                },
                liveVault: {
                  kalaroa: { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
                  jhaudanga: { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }
                },
                liveAccounts: {
                  kalaroa: { bank: 0, cash: 0, other: 0 },
                  jhaudanga: { bank: 0, cash: 0, other: 0 }
                },
                lastBaseDate: new Date().toISOString().slice(0, 10),
                __lastRolloverDate: new Date().toISOString().slice(0, 10),
                __lastUpdate: new Date().toISOString(),
                deletedTxIds: {},
                yearlyArchive: {}
              };
              
              const res = await window.__supabaseClient
                .from(window.SUPABASE_TABLE || 'agent_bank')
                .upsert({
                  id: window.SUPABASE_ROW_ID || 'cc_agent_bank_main',
                  data: emptyDB,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
              
              if(res && res.error) throw new Error(res.error.message);
              console.log('✅ Supabase Cloud empty');
            }
          } catch(e){
            console.error('❌ Cloud clear failed:', e);
          }
          
          /* -------- Step 4: LocalStorage + SessionStorage Clear -------- */
          try{
            let cleared = 0;
            Object.keys(localStorage).forEach(k => {
              if(k.indexOf('cc_') === 0){
                localStorage.removeItem(k);
                cleared++;
              }
            });
            
            ['cc_agent_bank_local', 'cc_agent_bank_session', 'cc_net_queue', 'cc_geo_cache',
             'cc_last_auto_backup_date', 'cc_snapshot_settings_v1', 'cc_snapshot_last_sent_v1',
             'cc_notif_prefs', 'cc_stored_version'].forEach(k => {
              if(localStorage.getItem(k)){
                localStorage.removeItem(k);
                cleared++;
              }
            });
            
            sessionStorage.clear();
            console.log('✅ LocalStorage + SessionStorage clear (' + cleared + ' items)');
          } catch(e){
            console.warn('LocalStorage:', e);
          }
          
          /* -------- Step 5: IndexedDB Delete -------- */
          try{
            if(window.indexedDB){
              await new Promise((resolve) => {
                const req = indexedDB.deleteDatabase('cc_agent_bank_backups');
                req.onsuccess = () => { console.log('✅ IndexedDB clear'); resolve(); };
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
                setTimeout(resolve, 2500);
              });
            }
          } catch(e){
            console.warn('IndexedDB:', e);
          }
          
          /* -------- Step 6: Memory DB Reset (Admin রাখব) -------- */
          try{
            const admins = (window.db?.users || []).filter(u => u.username === 'admin');
            const fresh = (typeof defaultDB === 'function') ? defaultDB() : {};
            fresh.users = admins.length ? admins : ((typeof defaultUsers === 'function') ? defaultUsers() : []);
            window.db = fresh;
            
            if(typeof normalizeDB === 'function') normalizeDB();
            if(typeof forceFixAdmin === 'function') forceFixAdmin();
            if(typeof recomputeLive === 'function') recomputeLive();
            if(typeof __invalidateCaches === 'function') __invalidateCaches();
            
            window.__hasSyncedOnce = false;
            window.__lastAutoPushTs = '';
            console.log('✅ Memory DB reset');
          } catch(e){
            console.warn('Memory reset:', e);
          }
          
          /* -------- Step 7: Success + Reload -------- */
          try{ toast('✅ Complete Reset সফল — Reload হবে 3s-এ'); } catch(e){}
          try{ close(); } catch(e){}
          
          setTimeout(() => {
            window.location.href = location.pathname + '?clean=1';
          }, 3000);
          
        } catch(e){
          console.error('❌ Complete Reset error:', e);
          alert('❌ Error: ' + e.message);
          btn.disabled = false;
          btn.innerHTML = orig;
        }
      });
      
      /* ═════ INITIAL LOAD ═════ */
      await loadAndRender();
    }
  });
}

/* ───── END OF FILE managers/mgr-backup.js ───── */
console.log('✅ Manager Backup loaded');