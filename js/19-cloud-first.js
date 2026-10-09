/* ============================================================
   FILE: js/19-cloud-first.js — CLOUD AUTHORITATIVE
   PURPOSE: txn → cloud save → local clear → fresh pull → UI update
   VERSION: v3.0
   ============================================================ */
'use strict';

(function(){
  console.log('☁️ Cloud Authoritative Save loading...');

  /* ═══════════════════════════════════════════════════════════
     🎯 CLOUD AUTHORITATIVE SAVE
     1. Push to cloud
     2. Verify
     3. Clear local DB
     4. Pull fresh from cloud
     5. Silent UI update
     ═══════════════════════════════════════════════════════════ */
  window.cloudAuthoritativeSave = async function(options){
    options = options || {};
    var showToast = options.showToast !== false;

    try {
      if(!window.DB) throw new Error('DB নেই');
      if(!window.SUPA) throw new Error('SUPA নেই');

      // ═══ 1. Timestamp update ═══
      DB.__updated = new Date().toISOString();

      // ═══ 2. Push to cloud ═══
      if(showToast && typeof toast === 'function'){
        toast('☁️ Cloud এ save হচ্ছে...', 'info');
      }

      var pushRes = await window.SUPA
        .from(window.SUPABASE_TABLE || 'agent_bank')
        .upsert({
          id: window.SUPABASE_ROW_ID || 'cc_agent_bank_main',
          data: JSON.parse(JSON.stringify(DB)),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if(pushRes.error) throw new Error(pushRes.error.message);
      console.log('☁️ Push OK');

      // ═══ 3. Clear local DB (immediately!) ═══
      console.log('🧹 Clearing local DB...');

      // Clear in-memory
      window.db = null;

      // Clear localStorage
      try {
        localStorage.removeItem('cc_agent_bank_local');
        console.log('🧹 LocalStorage cleared');
      } catch(e){}

      // ═══ 4. Pull fresh from cloud ═══
      if(showToast && typeof toast === 'function'){
        toast('📥 Fresh data আসছে...', 'info');
      }

      var pullRes = await window.SUPA
        .from(window.SUPABASE_TABLE || 'agent_bank')
        .select('data')
        .eq('id', window.SUPABASE_ROW_ID || 'cc_agent_bank_main')
        .maybeSingle();

      if(pullRes.error) throw new Error(pullRes.error.message);
      if(!pullRes.data || !pullRes.data.data){
        throw new Error('Cloud থেকে data পাওয়া যায়নি');
      }

      var freshData = pullRes.data.data;
      console.log('📥 Fresh pull OK. Txs:', (freshData.txs || []).length);

      // ═══ 5. Update DB from cloud ═══
      window.db = freshData;

      if(typeof normalizeDB === 'function') normalizeDB();
      if(typeof recomputeLive === 'function') recomputeLive();
      if(typeof saveLocal === 'function') saveLocal();

      // ═══ 6. Silent UI update ═══
      try {
        if(typeof renderTopbar === 'function') renderTopbar();
        if(typeof renderDashboard === 'function') renderDashboard(true);
        if(typeof renderSidebar === 'function') renderSidebar();
      } catch(e){
        console.warn('UI update error:', e);
      }

      // Reload customer popup if open
      document.querySelectorAll('.modal-bg').forEach(function(m){
        if(m.__reloadCustomerPopup && typeof m.__reloadCustomerPopup === 'function'){
          try { m.__reloadCustomerPopup(); } catch(e){}
        }
      });

      if(showToast && typeof toast === 'function'){
        toast('✅ Cloud এ save হয়েছে', 'ok');
      }

      console.log('✅ Cloud authoritative save complete');
      return true;

    } catch(e){
      console.error('❌ Save error:', e);
      if(showToast && typeof toast === 'function'){
        toast('❌ ' + e.message, 'err');
      }
      return false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     🔧 afterTxSave → Cloud authoritative
     ═══════════════════════════════════════════════════════════ */
  window.afterTxSave = async function(tx, isCreating){
    if(!tx) return;

    console.log('☁️ afterTxSave → cloud authoritative');

    if(isCreating){
      if(!window.__recentMyTxIds) window.__recentMyTxIds = [];
      window.__recentMyTxIds.push(tx.id);
      setTimeout(function(){
        var idx = window.__recentMyTxIds.indexOf(tx.id);
        if(idx >= 0) window.__recentMyTxIds.splice(idx, 1);
      }, 10000);
    }

    if(typeof __invalidateCaches === 'function') __invalidateCaches();
    if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);
    if(typeof recomputeLive === 'function') recomputeLive();

    try {
      var cfg = (typeof TX_CFG !== 'undefined' && TX_CFG[tx.type]) || {};
      if(typeof broadcastActivity === 'function'){
        broadcastActivity({
          type: isCreating ? 'txn_create' : 'txn_update',
          txTitle: cfg.title || tx.type,
          amount: tx.amount,
          txId: tx.id,
          custName: tx.custName || ''
        });
      }
      if(typeof logActivity === 'function'){
        logActivity(
          isCreating ? 'txn_create' : 'txn_update',
          cfg.title || tx.type,
          tx.custName || '',
          tx.amount || 0
        );
      }
    } catch(e){}

    await window.cloudAuthoritativeSave({ showToast: true });
  };

  /* ═══════════════════════════════════════════════════════════
     🔧 deleteTx → Cloud authoritative
     ═══════════════════════════════════════════════════════════ */
  window.deleteTx = async function(id){
    if(!id) return;

    if(!SESSION || SESSION.role !== 'admin'){
      if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
      return;
    }

    var found = (typeof findTxAnywhere === 'function') ? findTxAnywhere(id) : null;
    var t = found && found.tx ? found.tx : (DB.txs || []).find(function(x){ return x.id === id; });
    if(!t){
      if(typeof toast === 'function') toast('❌ পাওয়া যায়নি');
      return;
    }

    if(!confirm('🗑️ ডিলিট করবেন?\n\n' +
      ((typeof TX_TYPES !== 'undefined' && TX_TYPES[t.type]?.title) || t.type) + '\n' +
      '৳ ' + fmt(t.amount))) return;

    try {
      if(!DB.deletedTxIds) DB.deletedTxIds = {};
      DB.deletedTxIds[id] = new Date().toISOString();
      DB.txs = (DB.txs || []).filter(function(x){ return x.id !== id; });

      if(DB.yearlyArchive){
        Object.keys(DB.yearlyArchive).forEach(function(y){
          if(Array.isArray(DB.yearlyArchive[y])){
            DB.yearlyArchive[y] = DB.yearlyArchive[y].filter(function(x){ return x.id !== id; });
          }
        });
      }

      if(t.type === 'loan_given'){
        var linked = (DB.txs || []).filter(function(x){
          return x.linkedFrom === 'loan_given' && x.linkedParentId === id;
        });
        linked.forEach(function(wtx){
          DB.deletedTxIds[wtx.id] = new Date().toISOString();
          DB.txs = DB.txs.filter(function(x){ return x.id !== wtx.id; });
        });
      }

      if(typeof __invalidateCaches === 'function') __invalidateCaches();
      if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);
      if(typeof recomputeLive === 'function') recomputeLive();

      if(typeof logActivity === 'function'){
        logActivity('txn_delete', '🗑️ লেনদেন ডিলিট',
          ((typeof TX_TYPES !== 'undefined' && TX_TYPES[t.type]?.title) || '') +
          (t.custName ? ' — ' + t.custName : ''),
          t.amount || 0);
      }

      await window.cloudAuthoritativeSave({ showToast: true });

    } catch(e){
      console.error('Delete error:', e);
      if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
    }
  };

  /* ═══════════════════════════════════════════════════════════
     🔧 saveDB/pushCloud/pushRemoteDB → Cloud authoritative
     ═══════════════════════════════════════════════════════════ */
  window.saveDB = function(){ return window.cloudAuthoritativeSave({ showToast: false }); };
  window.pushCloud = function(){ return window.cloudAuthoritativeSave({ showToast: false }); };
  window.pushRemoteDB = function(){ return window.cloudAuthoritativeSave({ showToast: false }); };

  /* ═══════════════════════════════════════════════════════════
     📱 MOBILE — Block all writes
     ═══════════════════════════════════════════════════════════ */
  if(window.__READ_ONLY_MODE){
    window.cloudAuthoritativeSave = async function(){
      if(typeof toast === 'function') toast('📱 Mobile — Read-Only', 'warn');
      return false;
    };
    window.afterTxSave = async function(){ return; };
    window.deleteTx = async function(){
      if(typeof toast === 'function') toast('📱 Mobile — Read-Only', 'warn');
    };
    window.pushCloud = async function(){ return false; };
    window.pushRemoteDB = async function(){ return false; };
    window.saveDB = async function(){ return false; };
  }

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__cloudStatus = function(){
    console.log('═══════════════════════════════════');
    console.log('☁️ Cloud Authoritative Status');
    console.log('═══════════════════════════════════');
    console.log('Mode:', window.__READ_ONLY_MODE ? '📱 Mobile' : '💻 Desktop');
    console.log('Strategy: Push → Clear → Pull → Update');
    console.log('SUPA:', typeof window.SUPA);
    console.log('DB loaded:', !!window.DB);
    console.log('═══════════════════════════════════');
  };

  window.__manualSave = function(){
    return window.cloudAuthoritativeSave({ showToast: true });
  };

  console.log('✅ Cloud Authoritative ready — Clear + Fresh Pull');
})();