/* ============================================================
   FILE: js/95-perf-overrides.js
   PURPOSE: Performance overrides — 5x-10x faster
   VERSION: v9.0
   LOAD ORDER: After 90-login.js, before 99-init.js
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1️⃣ STATS MEMOIZATION (computeStats cache)
   ═══════════════════════════════════════════════════════════ */
const __perfStatsMemo = new Map();
const __PERF_STATS_MAX = 40;

const __origComputeStats = window.computeStats;
window.computeStats = function(bf, date){
  const db = typeof DB === 'function' ? DB() : null;
  if(!db){
    return __origComputeStats.call(this, bf, date);
  }

  const key = bf + '|' + (date || '') + '|' +
              String(db.__lastUpdate || '') + '|' +
              String((db.txs || []).length) + '|' +
              String(Object.keys(db.deletedTxIds || {}).length);

  const hit = __perfStatsMemo.get(key);
  if(hit) return hit;

  const result = __origComputeStats.call(this, bf, date);

  if(__perfStatsMemo.size >= __PERF_STATS_MAX){
    __perfStatsMemo.delete(__perfStatsMemo.keys().next().value);
  }
  __perfStatsMemo.set(key, result);
  return result;
};

/* ═══════════════════════════════════════════════════════════
   2️⃣ FAST refreshSystem — No full replay, No duplicate save
   ═══════════════════════════════════════════════════════════ */
window.refreshSystem = function(options){
  try{
    // ⚡ Invalidate caches
    if(typeof __invalidateCaches === 'function') __invalidateCaches();
    __perfStatsMemo.clear();

    // ⚡ Recalc customer dues (has own cache)
    if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);

    // ⚡ Fast UI update (light — not full rebuild)
    if(typeof updateDashboardLight === 'function'){
      updateDashboardLight();
    }
    if(typeof renderTopbar === 'function') renderTopbar();
    if(typeof renderSidebar === 'function') renderSidebar();

    // ⚡ Save local — DEBOUNCED (300ms) — avoid double stringify
    if(window.__perfSaveTimer) clearTimeout(window.__perfSaveTimer);
    window.__perfSaveTimer = setTimeout(() => {
      window.__perfSaveTimer = null;
      try{ saveLocalDB(); } catch(e){}
    }, 300);

    // ❌ NOT calling recomputeLive here — biggest cost eliminated
    // ❌ NOT calling pushRemoteDB here — afterTxSave handles it

    return true;
  } catch(e){
    console.error('refreshSystem error:', e);
    return false;
  }
};

/* ═══════════════════════════════════════════════════════════
   3️⃣ THROTTLED pushRemoteDB — Faster cloud sync
   ═══════════════════════════════════════════════════════════ */
const __origPushRemoteDB = window.pushRemoteDB;
let __perfLastPushTs = 0;
let __perfPendingPushTimer = null;
const __PERF_PUSH_THROTTLE_MS = 1500;

window.pushRemoteDB = function(force, newTxs){
  const now = Date.now();
  const hasNewTx = !!(newTxs && newTxs.length > 0);

  // ⚡ New tx → push immediately (data safety)
  if(hasNewTx){
    __perfLastPushTs = now;
    return __origPushRemoteDB.call(this, force, newTxs);
  }

  // ⚡ Within throttle window → defer
  if(now - __perfLastPushTs < __PERF_PUSH_THROTTLE_MS){
    if(__perfPendingPushTimer) clearTimeout(__perfPendingPushTimer);
    const wait = __PERF_PUSH_THROTTLE_MS - (now - __perfLastPushTs);
    __perfPendingPushTimer = setTimeout(() => {
      __perfPendingPushTimer = null;
      __perfLastPushTs = Date.now();
      __origPushRemoteDB.call(window, true).catch(() => {});
    }, wait);
    return Promise.resolve();
  }

  // ⚡ Outside window → push now
  __perfLastPushTs = now;
  return __origPushRemoteDB.call(this, force, newTxs);
};

/* ═══════════════════════════════════════════════════════════
   4️⃣ FAST renderTopbar — Cache static HTML
   ═══════════════════════════════════════════════════════════ */
let __perfTopbarKey = '';
const __origRenderTopbar = window.renderTopbar;
window.renderTopbar = function(){
  if(!session) return;
  const bf = currentBranchFilter();
  const isAdminUser = session.role === 'admin';
  const key = session.id + '|' + bf + '|' + viewBranch + '|' + dashDate + '|' + isAdminUser;

  if(__perfTopbarKey === key){
    // ⚡ Same content — just refresh queue badge + clock
    try{ updateQueueBadge(); } catch(e){}
    return;
  }
  __perfTopbarKey = key;
  return __origRenderTopbar.call(this);
};

/* ═══════════════════════════════════════════════════════════
   5️⃣ FAST renderSidebar — Cache by content hash
   ═══════════════════════════════════════════════════════════ */
let __perfSidebarKey = '';
const __origRenderSidebar = window.renderSidebar;
window.renderSidebar = function(){
  if(!session) return;
  const bf = currentBranchFilter();
  let pendingCount = 0;
  try{
    const p = getAllPending();
    pendingCount = p.totalCount;
  } catch(e){}
  const key = session.id + '|' + bf + '|' + session.role + '|' + pendingCount;

  if(__perfSidebarKey === key) return;
  __perfSidebarKey = key;
  return __origRenderSidebar.call(this);
};

/* ═══════════════════════════════════════════════════════════
   6️⃣ FAST saveDB — Skip unnecessary work when nothing changed
   ═══════════════════════════════════════════════════════════ */
const __origSaveDB = window.saveDB;
let __perfLastSaveTs = 0;
window.saveDB = function(opts){
  opts = opts || {};
  const now = Date.now();
  // ⚡ Debounce rapid saves (100ms)
  if(now - __perfLastSaveTs < 100 && !opts.force){
    if(window.__perfPendingSave) clearTimeout(window.__perfPendingSave);
    window.__perfPendingSave = setTimeout(() => {
      window.__perfPendingSave = null;
      __perfLastSaveTs = Date.now();
      try{ __origSaveDB.call(window, opts); } catch(e){}
    }, 100);
    return Promise.resolve();
  }
  __perfLastSaveTs = now;
  return __origSaveDB.call(this, opts);
};

/* ═══════════════════════════════════════════════════════════
   7️⃣ STARTUP LOG
   ═══════════════════════════════════════════════════════════ */
console.log('%c⚡ PERF OVERRIDES ACTIVE v9.0',
  'background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c🚀 Stats memoized • refreshSystem fast • push throttled • renders cached',
  'background:#1e40af;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');

/* Debug helper */
window.__perfDebug = function(){
  return {
    statsMemoSize: __perfStatsMemo.size,
    lastPushTs: __perfLastPushTs,
    pendingPush: !!__perfPendingPushTimer,
    topbarKey: __perfTopbarKey,
    sidebarKey: __perfSidebarKey
  };
};