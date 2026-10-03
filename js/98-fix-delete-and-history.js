/* ============================================================
   FILE: js/98-fix-delete-and-history.js
   PURPOSE: Delete bug fix + History hang fix
   VERSION: v11.9
   LOAD: 98-fix-loan-received-engine.js এর পরে, 99-init.js এর আগে
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #1: smartMergeCloudLocal — deleted txs বাদ দাও
   ═══════════════════════════════════════════════════════════ */
const __origSmartMerge_delfix = window.smartMergeCloudLocal;

window.smartMergeCloudLocal = function(cloud, local){
  const merged = __origSmartMerge_delfix.call(this, cloud, local);
  if(!merged) return merged;

  // ⚡ deletedTxIds merge (local + cloud, local priority)
  const delIds = new Set([
    ...Object.keys((local && local.deletedTxIds) || {}),
    ...Object.keys((cloud && cloud.deletedTxIds) || {})
  ]);

  // ⚡ merged.txs থেকে deleted txs filter করো
  if(delIds.size > 0 && Array.isArray(merged.txs)){
    const before = merged.txs.length;
    merged.txs = merged.txs.filter(t => !t || !t.id || !delIds.has(t.id));
    const after = merged.txs.length;
    if(before !== after){
      console.log('🗑️ Merge: removed ' + (before - after) + ' deleted txs');
    }
  }

  // ⚡ yearlyArchive থেকেও filter
  if(delIds.size > 0 && merged.yearlyArchive){
    Object.keys(merged.yearlyArchive).forEach(y => {
      if(Array.isArray(merged.yearlyArchive[y])){
        merged.yearlyArchive[y] = merged.yearlyArchive[y].filter(t => !t || !t.id || !delIds.has(t.id));
      }
    });
  }

  // ⚡ deletedTxIds complete version save করো
  merged.deletedTxIds = {};
  delIds.forEach(id => { merged.deletedTxIds[id] = true; });

  return merged;
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #2: normalizeDB — auto-cleanup undo করে, তাই restore
   ═══════════════════════════════════════════════════════════ */
const __origNormalizeDB_delfix = window.normalizeDB;

window.normalizeDB = function(){
  if(!DB()) return;

  // ⚡ আগে snapshot নাও
  const savedDeleted = JSON.parse(JSON.stringify(DB().deletedTxIds || {}));

  // ⚡ Original normalizeDB চালাও
  __origNormalizeDB_delfix.call(this);

  // ⚡ deletedTxIds restore করো (auto-cleanup undo নিষ্ক্রিয়)
  if(DB() && Object.keys(savedDeleted).length > 0){
    DB().deletedTxIds = savedDeleted;
  }
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #3: deleteTx — post-check (safety net)
   ═══════════════════════════════════════════════════════════ */
const __origDeleteTx_delfix = window.deleteTx;

window.deleteTx = async function(id){
  if(!id) return;
  await __origDeleteTx_delfix.call(this, id);

  // ⚡ 2s পরে verify — tx ফিরে এলে আবার মুছো
  setTimeout(() => {
    try{
      if(!DB()) return;
      const stillInTx = (DB().txs || []).some(t => t && t.id === id);
      const hasDeleted = DB().deletedTxIds && DB().deletedTxIds[id];

      if(stillInTx || !hasDeleted){
        if(!DB().deletedTxIds) DB().deletedTxIds = {};
        DB().deletedTxIds[id] = new Date().toISOString();
        DB().txs = (DB().txs || []).filter(x => x.id !== id);
        if(typeof __invalidateCaches === 'function') __invalidateCaches();
        if(typeof saveLocalDB === 'function') saveLocalDB();
        console.log('🛡️ deleteTx: re-enforced delete for', id);
      }
    } catch(e){}
  }, 2000);
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #4: History loading spinner — global safety
   ═══════════════════════════════════════════════════════════ */
window.addEventListener('error', function(e){
  try{
    // spinner আটকে থাকলে সেটা replace করো
    document.querySelectorAll('#cust_all_txns, #ya_body, #al_body, #dbContent, #bk_list_body').forEach(el => {
      if(!el) return;
      const html = el.innerHTML || '';
      if(html.includes('লোড হচ্ছে') || html.includes('লোডিং')){
        el.innerHTML = '<div class="empty" style="color:#f87171;padding:20px;text-align:center">' +
          '❌ লোড ব্যর্থ — Page রিফ্রেশ করুন (Ctrl+R)' +
        '</div>';
      }
    });
  } catch(err){}
});

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG
   ═══════════════════════════════════════════════════════════ */
window.__checkDeleted = function(){
  const d = DB();
  if(!d){ console.log('❌ No DB'); return; }
  const delIds = Object.keys(d.deletedTxIds || {});
  const inTxs = (d.txs || []).filter(t => t.id && d.deletedTxIds && d.deletedTxIds[t.id]);
  console.log('🗑️ Deleted IDs count:', delIds.length);
  console.log('❌ Zombie txs (in both txs + deletedTxIds):', inTxs.length);
  if(inTxs.length){
    console.log('   Zombie IDs:', inTxs.map(t => t.id));
  }
  return { deletedCount: delIds.length, zombieCount: inTxs.length };
};

console.log('%c🗑️ DELETE + HISTORY FIX v11.9 ACTIVE',
  'background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c✅ Delete এখন কাজ করবে • History আর hang করবে না',
  'background:#16a34a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');