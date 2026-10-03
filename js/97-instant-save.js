/* ============================================================
   FILE: js/97-instant-save.js
   PURPOSE: Instant save → close → dashboard refresh (zero delay)
   VERSION: v9.2
   LOAD: After 96-fix-live-sync.js, before 99-init.js
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 INSTANT afterTxSave — Sync render BEFORE any await
   ═══════════════════════════════════════════════════════════ */
window.afterTxSave = function(tx, isCreating){
  if(!tx) return Promise.resolve();

  /* ── STEP 1: Track recent (avoid self-notification) ── */
  if(isCreating){
    if(!window.__recentMyTxIds) window.__recentMyTxIds = [];
    window.__recentMyTxIds.push(tx.id);
    if(window.__recentMyTxIds.length > 20){
      window.__recentMyTxIds = window.__recentMyTxIds.slice(-20);
    }
    setTimeout(() => {
      const idx = window.__recentMyTxIds.indexOf(tx.id);
      if(idx >= 0) window.__recentMyTxIds.splice(idx, 1);
    }, 10000);
  }

  /* ── STEP 2: Memory update (SYNC, ~10ms) ── */
  try{ __invalidateCaches(); } catch(e){}
  try{ recalcAllCustomerDues(false); } catch(e){}
  try{
    if(typeof recomputeLiveIncremental === 'function'){
      recomputeLiveIncremental(tx);
    } else {
      recomputeLive();
    }
  } catch(e){ console.error(e); }

  /* ── STEP 3: INSTANT RENDER (SYNC, ~20ms) ── */
  try{
    const bf = currentBranchFilter();
    const st = computeStats(bf, dashDate);
    renderStats(bf, st);
    renderVault(bf);
    renderBalances(bf, st);
  } catch(e){ console.error('Instant render error:', e); }

  /* ── STEP 4: Defer heavy sections (due/collection) ── */
  setTimeout(() => {
    try{ renderDueSection(); } catch(e){}
    try{ renderCollectionPendingSection(); } catch(e){}
  }, 80);

  /* ── STEP 5: Background local save ── */
  setTimeout(() => {
    try{ saveLocalDB(); } catch(e){}
  }, 0);

  /* ── STEP 6: Cloud push — WITHOUT newTxs (skip 96-fix re-render) ── */
  if(navigator.onLine){
    setTimeout(() => {
      try{
        if(window.__origPushRemoteDB_fix){
          // Pass null to skip 96-fix's heavy re-render
          window.__origPushRemoteDB_fix.call(window, true, null).catch(() => {});
        } else {
          pushRemoteDB(true, null).catch(() => {});
        }
        // Manual broadcast
        try{ if(typeof broadcastTx === 'function') broadcastTx(tx); } catch(e){}
      } catch(e){}
    }, 50);
  }

  /* ── STEP 7: Broadcast activity ── */
  setTimeout(() => {
    try{
      const cfg = TX_CFG[tx.type] || {};
      broadcastActivity({
        type: isCreating ? 'txn_create' : 'txn_update',
        txTitle: cfg.title || tx.type,
        amount: tx.amount,
        txId: tx.id,
        custName: tx.custName || ''
      });
    } catch(e){}
  }, 100);

  /* ── STEP 8: Notification ── */
  setTimeout(() => {
    try{
      if(!tx.id || !(window.__recentMyTxIds || []).includes(tx.id)){
        notifyTransaction(tx, isCreating ? '📥 নতুন' : '✏️ আপডেট');
      }
    } catch(e){}
  }, 800);

  return Promise.resolve();
};

/* ═══════════════════════════════════════════════════════════
   🔥 MODAL INSTANT CLOSE — No fade animation
   ═══════════════════════════════════════════════════════════ */
const __origOpenModal97 = window.openModal;
window.openModal = function(opts){
  const result = __origOpenModal97.call(this, opts);
  if(result && result.wrap){
    // ⚡ Override close for instant removal
    const wrap = result.wrap;
    const origClose = result.close;
    result.close = function(){
      try{
        wrap.style.transition = 'none';
        wrap.style.animation = 'none';
        wrap.remove();
      } catch(e){
        try{ origClose(); } catch(e2){}
      }
    };
  }
  return result;
};

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG — Test render speed
   ═══════════════════════════════════════════════════════════ */
window.__testInstantSave = function(){
  const t0 = performance.now();
  try{
    const bf = currentBranchFilter();
    const st = computeStats(bf, dashDate);
    renderStats(bf, st);
    renderVault(bf);
    renderBalances(bf, st);
  } catch(e){}
  const elapsed = performance.now() - t0;
  console.log(`⚡ Dashboard render: ${elapsed.toFixed(1)}ms`);
  return elapsed;
};

console.log('%c⚡ INSTANT SAVE v9.2 ACTIVE',
  'background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c💾 Save → Close → Dashboard = INSTANT (0ms delay)',
  'background:#16a34a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');