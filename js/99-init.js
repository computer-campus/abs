/* ============================================================
   FILE: 99-init.js
   PURPOSE: Application initialization
   VERSION: v7.6
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 SIDEBAR/MENU EVENT LISTENERS
   ═══════════════════════════════════════════════════════════ */
const _sideOverlay = document.getElementById('sidebarOverlay');
const _menuOverlay = document.getElementById('menuOverlay');
const _sideClose = document.getElementById('sidebarClose');
const _menuClose = document.getElementById('menuClose');

if(_sideOverlay) _sideOverlay.addEventListener('click', closeSidebar);
if(_menuOverlay) _menuOverlay.addEventListener('click', closeSidebar);
if(_sideClose) _sideClose.addEventListener('click', closeSidebar);
if(_menuClose) _menuClose.addEventListener('click', closeSidebar);

document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeSidebar();
});

/* ═══════════════════════════════════════════════════════════
   🔥 ENTER NAVIGATION
   ═══════════════════════════════════════════════════════════ */
setupEnterNavigation();

/* ═══════════════════════════════════════════════════════════
   🔥 WRAP openModal FOR AUTOFILL
   ═══════════════════════════════════════════════════════════ */
const _origOpenModal = openModal;
window.openModal = function(opts){
  const result = _origOpenModal(opts);
  setTimeout(() => {
    if(result && result.wrap) disableAutofill(result.wrap);
  }, 50);
  return result;
};

/* ═══════════════════════════════════════════════════════════
   🔥 MUTATION OBSERVER FOR AUTOFILL
   ═══════════════════════════════════════════════════════════ */
const __autofillObserver = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if(node.nodeType === 1){
        if(node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'){
          disableAutofill(node.parentElement || document);
        } else if(node.querySelectorAll){
          disableAutofill(node);
        }
      }
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   🔥 BEFORE UNLOAD
   ═══════════════════════════════════════════════════════════ */
window.addEventListener('beforeunload', () => {
  try{
    if(__realtimeChannel && __supabaseClient){
      __realtimeChannel.untrack().catch(() => {});
    }
  } catch(e){}
});

/* ═══════════════════════════════════════════════════════════
   🔥 MAIN INIT FUNCTION
   ═══════════════════════════════════════════════════════════ */
(async function init(){
  
  // ═══════════════════════════════════════════════════════════
  // 🚫 RESET FLAG
  // ═══════════════════════════════════════════════════════════
  window.__resetInProgress = false;
  
  // ═══════════════════════════════════════════════════════════
  // 🧹 STEP 2: CLEAN MODE (?clean=1)
  // ═══════════════════════════════════════════════════════════
  if(new URLSearchParams(location.search).get('clean') === '1'){
    console.log('🧹 CLEAN MODE — সম্পূর্ণ reset করা হচ্ছে...');
    
    try{
      let cleared = 0;
      Object.keys(localStorage).forEach(k => {
        if(k.indexOf('cc_') === 0){
          localStorage.removeItem(k);
          cleared++;
        }
      });
      sessionStorage.clear();
      try{ indexedDB.deleteDatabase('cc_agent_bank_backups'); } catch(e){}
      
      console.log('✅ সব local data clear (' + cleared + ' items)');
    } catch(e){
      console.error(e);
    }
    
    if(history.replaceState){
      history.replaceState(null, '', location.pathname);
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // 📦 STEP 3: LOAD DATABASE
  // ═══════════════════════════════════════════════════════════
  window.__hasSyncedOnce = false;
  dashDate = todayStr();
  
  try{
    window.db = loadLocalDB() || defaultDB();
  } catch(e){
    window.db = defaultDB();
  }
  
  normalizeDB();
  forceFixAdmin();
  __invalidateCaches();
  recalcAllCustomerDues(false);
  recomputeLive();
  loadNotifPrefs();
  
  // Geo cache
  try{
    const c = loadGeoCache();
    if(c){
      window.__geoCache = c;
    } else {
      fetchGeoLocation().then(g => {
        window.__geoCache = g;
      }).catch(() => {});
    }
  } catch(e){}
  
  // ═══════════════════════════════════════════════════════════
  // 🎯 STEP 4: LOGIN SCREEN EVENTS
  // ═══════════════════════════════════════════════════════════
  const lb = $('#loginBtn');
  if(lb) lb.addEventListener('click', doLogin);
  
  const lu = $('#loginUser');
  const lp = $('#loginPass');
  
  if(lu){
    lu.addEventListener('keydown', e => {
      if(e.key === 'Enter') lp.focus();
    });
  }
  
  if(lp){
    lp.addEventListener('keydown', e => {
      if(e.key === 'Enter') doLogin();
    });
  }
  
  // ═══════════════════════════════════════════════════════════
  // 👤 STEP 5: AUTO-LOGIN FROM SESSION
  // ═══════════════════════════════════════════════════════════
  const sid = sessionStorage.getItem(SKEY);
  if(sid){
    const u = DB().users.find(x => x.id === sid);
    if(u){
      session = u;
      viewBranch = u.role === 'admin' ? 'all' : u.branch;
      startApp();
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // 🌐 STEP 6: NETWORK + CHANNELS
  // ═══════════════════════════════════════════════════════════
  attachNetworkListeners();
  updateQueueBadge();
  setupBroadcastChannel();
  
  // Audio unlock
  const unlockAudio = () => {
    try{
      if(!__audioCtx){
        const AC = window.AudioContext || window.webkitAudioContext;
        if(AC) __audioCtx = new AC();
      }
      if(__audioCtx && __audioCtx.state === 'suspended'){
        __audioCtx.resume();
      }
    } catch(e){}
    
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  
  // ═══════════════════════════════════════════════════════════
  // ☁️ STEP 7: INIT SUPABASE
  // ═══════════════════════════════════════════════════════════
  initSupabase();
  
  // Retry sync if queue has items
  setTimeout(() => {
    if(window.__hasSyncedOnce && navigator.onLine && queueSize() > 0){
      forceSyncNow();
    }
  }, 3000);
  
  // ═══════════════════════════════════════════════════════════
  // 🚫 STEP 8: AUTOFILL + OBSERVER
  // ═══════════════════════════════════════════════════════════
  disableAutofill(document);
  __autofillObserver.observe(document.body, { childList: true, subtree: true });
  
  // ═══════════════════════════════════════════════════════════
  // 🔔 STEP 9: NOTIF PERMISSION
  // ═══════════════════════════════════════════════════════════
  requestNotifPermission();
  
  // ═══════════════════════════════════════════════════════════
  // 🎉 STEP 10: SUCCESS LOG
  // ═══════════════════════════════════════════════════════════
  console.log('%c✅ কম্পিউটার ক্যাম্পাস প্রস্তুত — v7.6', 'background:#1e40af;color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
  console.log('%c⚡ Performance Optimized', 'background:#22c55e;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');
  console.log('%c🎯 Cloud First + Duplicate Skip Active', 'background:#3b82f6;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');
  
})();

  // ═══════════════════════════════════════════════════════════
  // ✅ Version Check DISABLED — data persist করবে
  // ═══════════════════════════════════════════════════════════
  console.log('ℹ️ Version check disabled — data persist active');  

/* ───── END OF FILE 99-init.js ───── */
console.log('✅ Init loaded — v7.6');