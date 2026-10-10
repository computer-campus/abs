/* ============================================================
   FILE: js/20-online-only.js
   PURPOSE: Force COMPLETE cloud-only operation
            - No localStorage caching
            - Every read/write to Supabase
            - Fresh login on every entry
            - Clear all local DB on load
   LOAD: after 19-cloud-first.js, before 99-init.js
   ============================================================ */
'use strict';

(function(){
  console.log('%c🌐 ONLINE-ONLY MODE ACTIVATING...',
    'background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;font-size:13px');

  /* ═══════════════════════════════════════════════════════════
     1️⃣ CLEAR ALL LOCAL DB ON PAGE LOAD
     ═══════════════════════════════════════════════════════════ */
  try {
    var removed = 0;
    var allKeys = Object.keys(localStorage);
    allKeys.forEach(function(k){
      if(
        k === 'cc_db_v8' ||
        k === 'cc_agent_bank_local' ||
        k === 'cc_deleted_tx_backup' ||
        k === 'cc_session_persist' ||
        k.indexOf('cc_db_') === 0 ||
        k.indexOf('cc_agent_bank_') === 0 ||
        k.indexOf('cc_deleted_') === 0
      ){
        try { localStorage.removeItem(k); removed++; } catch(e){}
      }
    });
    console.log('🧹 Cleared ' + removed + ' local DB key(s)');
  } catch(e){
    console.warn('Clear error:', e);
  }

  /* ═══════════════════════════════════════════════════════════
     2️⃣ DISABLE ALL LOCAL PERSISTENCE
     ═══════════════════════════════════════════════════════════ */
  window.saveLocal = function(){
    /* ONLINE-ONLY: localStorage is never used */
  };

  window.loadLocal = function(){
    return null; /* Always start fresh from cloud */
  };

  /* ═══════════════════════════════════════════════════════════
     3️⃣ MERGE → CLOUD ALWAYS WINS
     ═══════════════════════════════════════════════════════════ */
  window.mergeCloudLocal = function(cloud, local){
    if(!cloud){
      return (typeof window.defaultDB === 'function') ? window.defaultDB() : {};
    }
    return JSON.parse(JSON.stringify(cloud));
  };

  /* ═══════════════════════════════════════════════════════════
     4️⃣ PULL — Fetch FRESH from cloud (replace DB completely)
     ═══════════════════════════════════════════════════════════ */
  window.pullCloud = async function(){
    if(!window.SUPA){
      console.warn('⏳ Supabase not ready');
      return false;
    }

    if(!navigator.onLine){
      if(typeof toast === 'function') toast('📵 ইন্টারনেট নেই', 'err');
      return false;
    }

    try {
      var res = await window.SUPA
        .from('agent_bank')
        .select('data')
        .eq('id', 'cc_agent_bank_main')
        .maybeSingle();

      if(res.error) throw res.error;

      var newData;
      if(res.data && res.data.data){
        newData = JSON.parse(JSON.stringify(res.data.data));
        console.log('☁️ Pulled:',
          (newData.txs || []).length + ' txs,',
          (newData.users || []).length + ' users,',
          (newData.customers || []).length + ' customers');
      } else {
        newData = (typeof window.defaultDB === 'function') ? window.defaultDB() : {};
        console.log('⚠️ Cloud empty — using default');
      }

      // ⚡ Update ALL references (let binding + window props)
      try { DB = newData; } catch(e){}
      window.DB = newData;
      window.db = newData;

      if(typeof normalizeDB === 'function') normalizeDB();
      if(typeof recomputeLive === 'function') recomputeLive();

      return true;

    } catch(e){
      console.warn('Pull error:', e);
      return false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     5️⃣ PUSH — Send to cloud ONLY (no local fallback)
     ═══════════════════════════════════════════════════════════ */
  window.pushCloud = async function(){
    if(!window.SUPA) return false;

    var currentDB = (typeof DB !== 'undefined' && DB) ? DB : window.DB;
    if(!currentDB) return false;

    if(!navigator.onLine){
      if(typeof toast === 'function') toast('📵 ইন্টারনেট নেই — save হবে না', 'err');
      return false;
    }

    try {
      if(typeof recomputeLive === 'function') recomputeLive();

      currentDB.__updated = new Date().toISOString();

      var res = await window.SUPA
        .from('agent_bank')
        .upsert({
          id: 'cc_agent_bank_main',
          data: JSON.parse(JSON.stringify(currentDB)),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if(res.error) throw res.error;
      console.log('☁️ Pushed to cloud');
      return true;

    } catch(e){
      console.warn('Push error:', e);
      if(typeof toast === 'function') toast('❌ Cloud save fail: ' + e.message, 'err');
      return false;
    }
  };

  // Aliases — some modules call these names
  window.saveDB = window.pushCloud;
  window.pushRemoteDB = window.pushCloud;

  /* ═══════════════════════════════════════════════════════════
     6️⃣ AUTHORITATIVE SAVE = push + re-pull + refresh UI
     ═══════════════════════════════════════════════════════════ */
  window.cloudAuthoritativeSave = async function(opts){
    opts = opts || {};

    var ok = await window.pushCloud();
    if(!ok) return false;

    var pulled = await window.pullCloud();

    try {
      if(typeof renderTopbar === 'function') renderTopbar();
      if(typeof renderDashboard === 'function') renderDashboard(true);
      if(typeof renderSidebar === 'function') renderSidebar();
    } catch(e){
      console.warn('UI refresh error:', e);
    }

    return pulled;
  };

  /* ═══════════════════════════════════════════════════════════
     7️⃣ AFTER TX SAVE — override to cloud-only flow
     ═══════════════════════════════════════════════════════════ */
  window.afterTxSave = async function(tx, isCreating){
    if(!tx) return;

    console.log('🌐 afterTxSave → cloud-only');

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
      var cfg = (typeof TX_TYPES !== 'undefined' && TX_TYPES[tx.type]) || {};
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
     8️⃣ DELETE TX — cloud-only
     ═══════════════════════════════════════════════════════════ */
  window.deleteTx = async function(id){
    if(!id) return;

    if(!SESSION || SESSION.role !== 'admin'){
      if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
      return;
    }

    var found = (typeof findTxAnywhere === 'function') ? findTxAnywhere(id) : null;
    var t = found && found.tx ? found.tx :
      (window.DB && window.DB.txs ? window.DB.txs.find(function(x){ return x.id === id; }) : null);

    if(!t){
      if(typeof toast === 'function') toast('❌ পাওয়া যায়নি');
      return;
    }

    if(!confirm('🗑️ ডিলিট করবেন?\n\n' +
      ((typeof TX_TYPES !== 'undefined' && TX_TYPES[t.type]?.title) || t.type) + '\n' +
      '৳ ' + fmt(t.amount))) return;

    if(!navigator.onLine){
      if(typeof toast === 'function') toast('📵 ইন্টারনেট নেই', 'err');
      return;
    }

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
     9️⃣ LOGIN — pull fresh from cloud, then verify
     ═══════════════════════════════════════════════════════════ */
  window.doLogin = async function(){
    var err = document.getElementById('login-err');
    var btn = document.getElementById('login-btn');
    var uEl = document.getElementById('login-user');
    var pEl = document.getElementById('login-pass');

    var u = String(uEl ? uEl.value : '').trim();
    var p = String(pEl ? pEl.value : '').trim();

    if(!u || !p){
      if(err) err.textContent = '⚠️ আইডি ও পাসওয়ার্ড দিন';
      return;
    }

    if(!navigator.onLine){
      if(err) err.textContent = '📵 ইন্টারনেট নেই — সিস্টেম অনলাইন-অনলি';
      return;
    }

    if(!window.SUPA){
      if(err) err.textContent = '⏳ Cloud init হচ্ছে — ২ সেকেন্ড পর আবার চেষ্টা করুন';
      return;
    }

    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span> যাচাই...';
    }
    if(err) err.textContent = '';

    try {
      // ⚡ Fetch FRESH from cloud
      var ok = await window.pullCloud();
      if(!ok){
        if(err) err.textContent = '❌ Cloud থেকে data আনতে পারিনি';
        return;
      }

      var usersArr = (window.DB && window.DB.users) || [];
      if(!usersArr.length){
        if(err) err.textContent = '❌ Database এ কোনো ইউজার নেই';
        return;
      }

      var user = usersArr.find(function(x){
        return String(x.username || '').toLowerCase() === u.toLowerCase();
      });

      if(!user){
        if(err) err.textContent = '❌ ইউজার পাওয়া যায়নি';
        return;
      }

      // ⚡ Verify password
      var passOk = false;
      if(user.plainPassword && String(user.plainPassword) === p){
        passOk = true;
      } else if(typeof verifyPass === 'function' && verifyPass(p, user.password, user.username)){
        passOk = true;
      }

      if(!passOk){
        if(err) err.textContent = '❌ পাসওয়ার্ড ভুল';
        if(pEl) pEl.value = '';
        return;
      }

      // ⚡ Set session
      try { SESSION = user; } catch(e){}
      window.SESSION = user;

      try { VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch; } catch(e){}
      window.VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch;

      try { DASH_DATE = todayStr(); } catch(e){}

      try { sessionStorage.setItem('cc_session', user.id); } catch(e){}

      if(typeof logActivity === 'function'){
        try { logActivity('login', '🔓 লগইন', user.name); } catch(e){}
      }

      // ⚡ Show app
      var lg = document.getElementById('login');
      var ap = document.getElementById('app');
      if(lg){ lg.classList.add('hidden'); lg.style.display = 'none'; }
      if(ap) ap.classList.remove('hidden');

      if(typeof renderTopbar === 'function') renderTopbar();
      if(typeof renderDashboard === 'function') renderDashboard();
      if(typeof renderSidebar === 'function') renderSidebar();

      if(typeof toast === 'function') toast('✅ স্বাগতম, ' + user.name, 'ok');

      // Push login log to cloud
      setTimeout(function(){
        if(typeof pushCloud === 'function') pushCloud().catch(function(){});
      }, 500);

    } catch(e){
      console.error('Login error:', e);
      if(err) err.textContent = '❌ ' + e.message;
    } finally {
      if(btn){
        btn.disabled = false;
        btn.innerHTML = '🔐 লগইন';
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     🔟 OFFLINE / ONLINE NOTIFICATIONS
     ═══════════════════════════════════════════════════════════ */
  window.addEventListener('offline', function(){
    if(typeof toast === 'function'){
      toast('📵 ইন্টারনেট নেই — সিস্টেম কাজ করবে না', 'err');
    }
  });

  window.addEventListener('online', function(){
    if(typeof toast === 'function') toast('✅ ইন্টারনেট ফিরে এসেছে', 'ok');

    if(window.SUPA && typeof window.pullCloud === 'function'){
      window.pullCloud().then(function(ok){
        if(ok){
          try {
            if(typeof renderTopbar === 'function') renderTopbar();
            if(typeof renderDashboard === 'function') renderDashboard(true);
            if(typeof renderSidebar === 'function') renderSidebar();
          } catch(e){}
        }
      }).catch(function(){});
    }
  });

  /* ═══════════════════════════════════════════════════════════
     1️⃣1️⃣ AUTO-SYNC — every 20 seconds (silent refresh)
     ═══════════════════════════════════════════════════════════ */
  setInterval(function(){
    if(!window.SESSION) return;
    if(!navigator.onLine) return;
    if(!window.SUPA) return;
    if(window.__isSaving) return;

    window.pullCloud().then(function(ok){
      if(ok){
        try {
          if(typeof renderDashboard === 'function') renderDashboard(true);
        } catch(e){}
      }
    }).catch(function(){});
  }, 20000);

  /* ═══════════════════════════════════════════════════════════
     1️⃣2️⃣ VISIBILITY CHANGE — pull fresh when tab becomes active
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && window.SESSION && navigator.onLine){
      window.pullCloud().then(function(ok){
        if(ok){
          try {
            if(typeof renderDashboard === 'function') renderDashboard(true);
          } catch(e){}
        }
      }).catch(function(){});
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG HELPERS
     ═══════════════════════════════════════════════════════════ */
  window.__onlineStatus = function(){
    console.log('═══════════════════════════════════');
    console.log('🌐 ONLINE-ONLY MODE STATUS');
    console.log('═══════════════════════════════════');
    console.log('Online:', navigator.onLine ? '✅' : '❌');
    console.log('SUPA ready:', window.SUPA ? '✅' : '❌');
    console.log('DB loaded:', window.DB ? '✅' : '❌');
    console.log('Session:', window.SESSION ? '✅ ' + window.SESSION.name : '❌ none');
    console.log('saveLocal:', window.saveLocal.toString().length < 80 ? '🚫 blocked' : '⚠️ ACTIVE');
    console.log('Txs:', (window.DB?.txs || []).length);
    console.log('Users:', (window.DB?.users || []).length);
    console.log('LocalStorage DB keys:',
      Object.keys(localStorage).filter(function(k){
        return k.indexOf('cc_db_') === 0 || k.indexOf('cc_agent_bank_') === 0;
      }).length);
    console.log('═══════════════════════════════════');
  };

  window.__forceSync = function(){
    console.log('🔄 Force cloud sync...');
    return window.pullCloud().then(function(ok){
      console.log('Result:', ok ? '✅' : '❌');
      if(ok && typeof renderDashboard === 'function'){
        renderDashboard(true);
      }
    });
  };

  console.log('%c✅ ONLINE-ONLY MODE READY',
    'background:#22c55e;color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');

  console.log('💡 Debug: __onlineStatus() | __forceSync()');

})();