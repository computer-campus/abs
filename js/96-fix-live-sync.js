/* ============================================================
   FILE: js/96-fix-live-sync.js
   PURPOSE: Fix — Mother Account / Vault cloud merge overwrite bug
   VERSION: v9.1
   LOAD: After 95-perf-overrides.js, before 99-init.js
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #1: smartMergeCloudLocal — preserve local derived state
   ═══════════════════════════════════════════════════════════ */
const __origSmartMergeCloudLocal = window.smartMergeCloudLocal;

window.smartMergeCloudLocal = function(cloud, local){
  if(!cloud) return local;
  if(!local) return cloud;

  const merged = __origSmartMergeCloudLocal.call(this, cloud, local);

  const cloudTs = Date.parse(cloud.__lastUpdate || 0) || 0;
  const localTs = Date.parse(local.__lastUpdate || 0) || 0;

  // 🔥 Local newer বা same → local-এর derived state রাখব
  if(localTs >= cloudTs){
    try{
      if(local.baseVault)     merged.baseVault     = JSON.parse(JSON.stringify(local.baseVault));
      if(local.baseAccounts)  merged.baseAccounts  = JSON.parse(JSON.stringify(local.baseAccounts));
      if(local.liveVault)     merged.liveVault     = JSON.parse(JSON.stringify(local.liveVault));
      if(local.liveAccounts)  merged.liveAccounts  = JSON.parse(JSON.stringify(local.liveAccounts));
      if(local.branchCapital) merged.branchCapital = JSON.parse(JSON.stringify(local.branchCapital));
      if(typeof local.totalCapital === 'number') merged.totalCapital = local.totalCapital;
      if(local.lastBaseDate)         merged.lastBaseDate = local.lastBaseDate;
      if(local.__lastRolloverDate)   merged.__lastRolloverDate = local.__lastRolloverDate;
      console.log('🔧 Merge fix: kept LOCAL derived state');
    } catch(e){
      console.error('Merge derived-state fix error:', e);
    }
  }

  return merged;
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #2: pushRemoteDB — recompute live after cloud merge
   ═══════════════════════════════════════════════════════════ */
const __origPushRemoteDB_fix = window.pushRemoteDB;
let __fixPushInProgress = false;

window.pushRemoteDB = async function(force, newTxs){
  if(__fixPushInProgress){
    return __origPushRemoteDB_fix.call(this, force, newTxs);
  }
  __fixPushInProgress = true;
  try{
    const result = await __origPushRemoteDB_fix.call(this, force, newTxs);

    // 🔥 New txs থাকলে live state আবার recompute করব (safety net)
    try{
      if(DB() && newTxs && newTxs.length > 0 && typeof recomputeLive === 'function'){
        recomputeLive();
        if(typeof saveLocalDB === 'function') saveLocalDB();
        if(typeof renderDashboard === 'function') renderDashboard(true);
        console.log('🔧 Push fix: recomputed live state');
      }
    } catch(e){}

    return result;
  } finally {
    __fixPushInProgress = false;
  }
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #3: handleRealtimeUpdate — recompute after remote merge
   ═══════════════════════════════════════════════════════════ */
const __origHandleRealtimeUpdate = window.handleRealtimeUpdate;

window.handleRealtimeUpdate = function(payload){
  try{
    if(typeof __origHandleRealtimeUpdate === 'function'){
      __origHandleRealtimeUpdate.call(this, payload);
    }

    // Realtime-এ অন্য device থেকে update আসলে live recompute
    if(DB() && typeof recomputeLive === 'function'){
      setTimeout(() => {
        try{
          recomputeLive();
          if(typeof saveLocalDB === 'function') saveLocalDB();
          if(typeof renderDashboard === 'function') renderDashboard(true);
        } catch(e){}
      }, 20);
    }
  } catch(e){
    console.error('handleRealtimeUpdate fix error:', e);
  }
};

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG HELPER
   ═══════════════════════════════════════════════════════════ */
window.__checkLiveState = function(){
  const db = DB();
  if(!db){ console.log('❌ No DB'); return; }
  const accounts = {
    kalaroa:   db.liveAccounts?.kalaroa,
    jhaudanga: db.liveAccounts?.jhaudanga
  };
  console.log('🔍 Live Accounts:', accounts);
  console.log('📊 Base Accounts:', db.baseAccounts);
  console.log('📋 Total txs:', (db.txs || []).length);
  console.log('⏰ Last update:', db.__lastUpdate);
  return { accounts, base: db.baseAccounts, txCount: (db.txs || []).length };
};

/* Quick check for a specific branch */
window.__checkBranch = function(br){
  const db = DB();
  if(!db) return;
  br = br || 'kalaroa';
  const la = db.liveAccounts?.[br] || {};
  const ba = db.baseAccounts?.[br] || {};
  console.log('🏦 Branch:', br);
  console.log('  Live Bank : ৳', la.bank);
  console.log('  Live Cash : ৳', la.cash);
  console.log('  Base Bank : ৳', ba.bank);
  return la;
};

console.log('%c🔧 LIVE SYNC FIX v9.1 ACTIVE',
  'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c✅ Mother account / Vault আর cloud sync-এ overwrite হবে না',
  'background:#1e40af;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');