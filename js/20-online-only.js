/* ============================================================
   FILE: js/20-online-only.js — FINAL
   PURPOSE: Online-only + Session persist + Mobile read-only
   VERSION: v2.0
   ============================================================ */
'use strict';

(function(){
  console.log('%c🌐 ONLINE-ONLY MODE v2.0',
    'background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;font-size:13px');

  /* ═══════════════════════════════════════════════════════════
     1️⃣ CLEAR LOCAL DB — শুধু data, session নয়
     ═══════════════════════════════════════════════════════════ */
  try {
    var removed = 0;
    Object.keys(localStorage).forEach(function(k){
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
  } catch(e){}

  /* ═══════════════════════════════════════════════════════════
     2️⃣ DISABLE LOCAL PERSISTENCE (data) — session থাকবে
     ═══════════════════════════════════════════════════════════ */
  window.saveLocal = function(){ /* no-op */ };
  window.loadLocal = function(){ return null; };

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
     4️⃣ PULL — fresh fetch, replace DB
     ═══════════════════════════════════════════════════════════ */
  window.pullCloud = async function(){
    if(!window.SUPA){
      console.warn('⏳ Supabase not ready');
      return false;
    }
    if(!navigator.onLine){
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
          (newData.users || []).length + ' users');
      } else {
        newData = (typeof window.defaultDB === 'function') ? window.defaultDB() : {};
        console.log('⚠️ Cloud empty — using default');
      }

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
     5️⃣ PUSH — cloud only
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

  window.saveDB = window.pushCloud;
  window.pushRemoteDB = window.pushCloud;

  /* ═══════════════════════════════════════════════════════════
     6️⃣ AUTHORITATIVE SAVE
     ═══════════════════════════════════════════════════════════ */
  window.cloudAuthoritativeSave = async function(){
    var ok = await window.pushCloud();
    if(!ok) return false;
    var pulled = await window.pullCloud();
    try {
      if(typeof renderTopbar === 'function') renderTopbar();
      if(typeof renderDashboard === 'function') renderDashboard(true);
      if(typeof renderSidebar === 'function') renderSidebar();
    } catch(e){}
    return pulled;
  };

  /* ═══════════════════════════════════════════════════════════
     7️⃣ AFTER TX SAVE
     ═══════════════════════════════════════════════════════════ */
  window.afterTxSave = async function(tx, isCreating){
    if(!tx) return;

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
        logActivity(isCreating ? 'txn_create' : 'txn_update',
          cfg.title || tx.type, tx.custName || '', tx.amount || 0);
      }
    } catch(e){}

    await window.cloudAuthoritativeSave();
  };

  /* ═══════════════════════════════════════════════════════════
     8️⃣ DELETE TX
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

    if(!t){ if(typeof toast === 'function') toast('❌ পাওয়া যায়নি'); return; }

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

      await window.cloudAuthoritativeSave();

    } catch(e){
      console.error('Delete error:', e);
      if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
    }
  };

  /* ═══════════════════════════════════════════════════════════
     9️⃣ SESSION PERSISTENCE — refresh এ logout হবে না
     ═══════════════════════════════════════════════════════════ */
  var SKEY = 'cc_session';
  var SKEY_FULL = 'cc_session_full';

  window.__saveFullSession = function(user){
    if(!user) return;
    try {
      sessionStorage.setItem(SKEY, user.id);
      sessionStorage.setItem(SKEY_FULL, JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branch: user.branch
      }));
      console.log('💾 Session saved for:', user.username);
    } catch(e){}
  };

  window.__restoreQuickSession = function(){
    try {
      var raw = sessionStorage.getItem(SKEY_FULL);
      if(!raw) return null;
      var data = JSON.parse(raw);
      if(!data || !data.id) return null;
      return data;
    } catch(e){ return null; }
  };

  window.__clearFullSession = function(){
    try {
      sessionStorage.removeItem(SKEY);
      sessionStorage.removeItem(SKEY_FULL);
    } catch(e){}
  };

  /* ═══════════════════════════════════════════════════════════
     🔟 LOGIN — fresh pull + save session
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
      if(err) err.textContent = '⏳ Cloud init হচ্ছে — ২ সেকেন্ড পর চেষ্টা করুন';
      return;
    }

    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span> যাচাই...';
    }
    if(err) err.textContent = '';

    try {
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

      // ⚡ Save session for refresh persistence
      window.__saveFullSession(user);

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
     1️⃣1️⃣ LOGOUT — session clear
     ═══════════════════════════════════════════════════════════ */
  var __origDoLogout = window.doLogout;
  window.doLogout = async function(){
    try { window.__clearFullSession(); } catch(e){}
    try {
      if(__origDoLogout) return await __origDoLogout.apply(this, arguments);
    } catch(e){}
    location.reload();
  };

  /* ═══════════════════════════════════════════════════════════
     1️⃣2️⃣ AUTO-RESTORE SESSION ON REFRESH
     ═══════════════════════════════════════════════════════════ */
  function applySessionToUI(user){
    try { SESSION = user; } catch(e){}
    window.SESSION = user;

    try { VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch; } catch(e){}
    window.VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch;

    try { DASH_DATE = todayStr(); } catch(e){}

    var lg = document.getElementById('login');
    var ap = document.getElementById('app');
    if(lg){ lg.classList.add('hidden'); lg.style.display = 'none'; }
    if(ap) ap.classList.remove('hidden');

    if(typeof renderTopbar === 'function') renderTopbar();
    if(typeof renderDashboard === 'function') renderDashboard();
    if(typeof renderSidebar === 'function') renderSidebar();
  }

  var restoreAttempts = 0;
  function tryRestoreSession(){
    restoreAttempts++;
    if(restoreAttempts > 60) return;

    // Already logged in? Done.
    if(window.SESSION){
      var saved = window.__restoreQuickSession();
      if(saved && saved.id === window.SESSION.id) return;
    }

    // Check saved session first
    var saved = window.__restoreQuickSession();
    if(!saved){
      return; /* nothing to restore */
    }

    // Wait for SUPA
    if(!window.SUPA){
      setTimeout(tryRestoreSession, 500);
      return;
    }

    // Pull cloud + restore
    window.pullCloud().then(function(ok){
      if(!ok){
        console.log('⚠️ No cloud — using saved session object');
        applySessionToUI(saved);
        if(typeof toast === 'function') toast('⚠️ অফলাইন session', 'warn');
        return;
      }

      var user = (window.DB && window.DB.users || []).find(function(u){
        return u.id === saved.id;
      });

      if(user){
        applySessionToUI(user);
        window.__saveFullSession(user); /* refresh saved data */
        console.log('✅ Session restored:', user.username);
      } else {
        console.log('❌ Session user not found in cloud');
        window.__clearFullSession();
      }
    }).catch(function(e){
      console.warn('Restore failed:', e);
      applySessionToUI(saved);
    });
  }

  // Multiple attempts (init timing safe)
  setTimeout(tryRestoreSession, 1000);
  setTimeout(tryRestoreSession, 2500);
  setTimeout(tryRestoreSession, 5000);
  setTimeout(tryRestoreSession, 8000);

  /* ═══════════════════════════════════════════════════════════
     1️⃣3️⃣ MOBILE — FORM খুলবে, কিন্তু READ-ONLY
     ═══════════════════════════════════════════════════════════ */
  var IS_MOBILE = !!window.__MOBILE_BLOCK;

  if(IS_MOBILE){
    console.log('%c📱 Mobile — Form OPEN, Save BLOCKED',
      'background:#f59e0b;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');

    /* ═════════════════════════════════════════════════════════
       🎯 openTxForm → form খুলবে (view only)
       এটা default behavior-ই allow করব, কেবল save block করব
       ═════════════════════════════════════════════════════════ */
    // (openTxForm untouched — form open হবে)

    /* ═════════════════════════════════════════════════════════
       🎯 openModal → mobile এ form read-only
       প্রতি modal খুললে:
         1. সব input readonly
         2. সব save/delete button disabled
         3. উপরে banner দেখাবে
       ═════════════════════════════════════════════════════════ */
    var __origOpenModal = window.openModal;

    window.openModal = function(opts){
      var result = __origOpenModal.apply(this, arguments);

      // Modal mount হওয়ার পর read-only apply
      setTimeout(function(){
        if(result && result.bg){
          applyReadOnlyToModal(result.bg);
        } else {
          var modal = document.querySelector('.modal-bg');
          if(modal) applyReadOnlyToModal(modal);
        }
      }, 200);
      setTimeout(function(){
        var modal = document.querySelector('.modal-bg');
        if(modal) applyReadOnlyToModal(modal);
      }, 500);
      setTimeout(function(){
        var modal = document.querySelector('.modal-bg');
        if(modal) applyReadOnlyToModal(modal);
      }, 900);

      return result;
    };

    /* ═════════════════════════════════════════════════════════
       🔧 applyReadOnlyToModal — modal কে read-only করে
       ═════════════════════════════════════════════════════════ */
    function applyReadOnlyToModal(modal){
      if(!modal) return;
      if(modal.__roApplied) return;

      // ⚡ শুধু transaction form gulo te apply (login form না)
      var titleEl = modal.querySelector('.modal-head h3');
      var title = titleEl ? (titleEl.textContent || '') : '';

      // ⚡ Login modal / notification / history modal এ readonly দরকার নেই
      var skipKeywords = ['প্রিভিউ', 'হিস্টোরি', 'অডিট', 'তালিকা', 'ডেটা', 'ব্রাউজার', 'কার্যক্রম'];
      for(var i = 0; i < skipKeywords.length; i++){
        if(title.indexOf(skipKeywords[i]) !== -1) return;
      }

      modal.__roApplied = true;
      var body = modal.querySelector('.modal-body');
      if(!body) return;

      // ═══ Top banner ═══
      var banner = document.createElement('div');
      banner.id = 'ro-mobile-banner';
      banner.style.cssText =
        'margin-bottom:14px;padding:12px 14px;border-radius:11px;' +
        'background:linear-gradient(135deg,rgba(250,204,21,.18),rgba(217,119,6,.1));' +
        'border:1.5px solid rgba(250,204,21,.5);' +
        'display:flex;align-items:center;gap:10px';
      banner.innerHTML =
        '<div style="font-size:22px">📱</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12.5px;color:#facc15;font-weight:900">মোবাইল — Read-Only Mode</div>' +
          '<div style="font-size:11px;color:#fcd34d;font-weight:700;margin-top:2px;line-height:1.5">' +
            'শুধু দেখা যাবে। কম্পিউটার/ল্যাপটপ থেকে save করুন।' +
          '</div>' +
        '</div>';
      body.insertBefore(banner, body.firstChild);

      // ═══ সব input readonly ═══
      body.querySelectorAll('input, select, textarea').forEach(function(el){
        if(el.type === 'hidden') return;
        if(el.tagName === 'SELECT'){
          el.disabled = true;
          el.style.cursor = 'not-allowed';
          el.style.opacity = '0.7';
        } else if(el.tagName === 'INPUT' && el.type === 'date'){
          el.disabled = true;
          el.style.cursor = 'not-allowed';
          el.style.opacity = '0.7';
        } else if(el.tagName === 'INPUT' && el.type === 'time'){
          el.disabled = true;
          el.style.cursor = 'not-allowed';
          el.style.opacity = '0.7';
        } else {
          el.readOnly = true;
          el.style.cursor = 'not-allowed';
          el.style.opacity = '0.7';
          el.style.background = 'rgba(0,0,0,.5)';
        }
      });

      // ═══ সব button disable ═══
      body.querySelectorAll('button').forEach(function(btn){
        var txt = (btn.textContent || '').trim();
        var isSaveBtn =
          btn.id === 'f-save' || btn.id === 'c-save' || btn.id === 'f_save' ||
          btn.id === 'cc-save' || btn.id === 'me_save' ||
          btn.id === 'ss-save' || btn.id === 'nu-save' || btn.id === 'nc-save' ||
          btn.id === 'bm-save' || btn.id === 'bm-reset' ||
          txt.indexOf('সংরক্ষণ') !== -1 ||
          txt.indexOf('💾') === 0 ||
          txt.indexOf('✅ সংগ্রহ') !== -1 ||
          txt.indexOf('✅ গ্রহণ') !== -1 ||
          txt.indexOf('📤 পাঠান') !== -1 ||
          txt.indexOf('📤 ট্রান্সফার') !== -1 ||
          txt.indexOf('📤 ট্রান্স') !== -1 ||
          txt.indexOf('যোগ করুন') !== -1 ||
          txt.indexOf('💾 যোগ') !== -1;

        if(isSaveBtn){
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
          btn.style.filter = 'grayscale(.6)';
          btn.title = '📱 মোবাইলে save হবে না';

          // Also intercept click (defence in depth)
          if(!btn.__roClickBlocked){
            btn.__roClickBlocked = true;
            btn.addEventListener('click', function(e){
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              if(typeof toast === 'function'){
                toast('📱 মোবাইলে save করা যাবে না\n\nকম্পিউটার থেকে করুন', 'warn');
              }
              return false;
            }, true);
          }
        }
      });

      // ═══ Save button খুঁজে না পেলে label-change ═══
      var saveBtns = body.querySelectorAll('button');
      saveBtns.forEach(function(btn){
        if(btn.disabled) return;
        // Any button with green save look
        var bg = btn.style.background || '';
        var cls = btn.className || '';
        if((cls.indexOf('btn') !== -1 && cls.indexOf('green') !== -1) && !btn.disabled){
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
          btn.title = '📱 মোবাইলে save হবে না';
        }
      });

      // ═══ Enter key block (form submit) ═══
      body.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey && !e.ctrlKey){
          var target = e.target;
          if(target.tagName === 'INPUT' && target.type !== 'textarea'){
            e.preventDefault();
            if(typeof toast === 'function'){
              toast('📱 মোবাইলে save করা যাবে না', 'warn');
            }
            return false;
          }
        }
      }, true);

      console.log('📱 Read-only applied:', title || '(modal)');
    }

    /* ═════════════════════════════════════════════════════════
       🎯 Global click intercept — যেকোনো save button block
       ═════════════════════════════════════════════════════════ */
    document.addEventListener('click', function(e){
      var btn = e.target.closest('button');
      if(!btn) return;

      // Login button allow
      if(btn.id === 'login-btn') return;

      // ═══ ID check ═══
      var BLOCKED_IDS = [
        'f-save', 'f_save', 'c-save', 'cc-save', 'me_save',
        'tx-delete-btn', 'tx-edit-btn', 'tx-accept-btn', 'tx-cancel-btn',
        'nc-save', 'nu-save', 'bm-save', 'bm-reset',
        'ss-save', 'ss-now', 'ss-reset',
        'bk-dl', 'bk-up', 'bk-reset',
        'dz-clear',
        'dbb-add', 'dbb-clear', 'dbb-addkey', 'dbb-editor-save',
        'cust-support-btn'
      ];

      // ═══ Data attr check ═══
      var BLOCKED_DATA = [
        'del', 'user-del', 'user-pwd',
        'cust-del', 'tx-del', 'tx-edit', 'tx-accept', 'tx-cancel',
        'collect', 'acc', 'cancel'
      ];

      var blocked = false;
      var reason = '';

      if(btn.id && BLOCKED_IDS.indexOf(btn.id) !== -1){
        blocked = true;
        reason = '📱 Read-Only — save/edit করা যাবে না';
      }

      if(!blocked){
        for(var i = 0; i < BLOCKED_DATA.length; i++){
          if(btn.hasAttribute('data-' + BLOCKED_DATA[i])){
            blocked = true;
            reason = '📱 Read-Only Mode';
            break;
          }
        }
      }

      // ═══ Text content check ═══
      if(!blocked){
        var txt = (btn.textContent || '').trim();
        if(txt.indexOf('সংরক্ষণ') !== -1 ||
           txt.indexOf('💾 যোগ') !== -1 ||
           txt.indexOf('যোগ করুন') !== -1 ||
           txt.indexOf('✅ সংগ্রহ') !== -1 ||
           txt.indexOf('✅ গ্রহণ') !== -1 ||
           txt.indexOf('📤 পাঠান') !== -1 ||
           txt.indexOf('📤 ট্রান্সফার') !== -1 ||
           txt.indexOf('🗑️ ডিলিট') !== -1){
          blocked = true;
          reason = '📱 Read-Only — শুধু দেখা যাবে';
        }
      }

      if(blocked){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if(typeof toast === 'function') toast(reason, 'warn');
        return false;
      }
    }, true);

    console.log('✅ Mobile read-only enforced (form opens, save blocked)');
  }

  /* ═══════════════════════════════════════════════════════════
     1️⃣4️⃣ ONLINE/OFFLINE HANDLERS
     ═══════════════════════════════════════════════════════════ */
  window.addEventListener('offline', function(){
    if(typeof toast === 'function') toast('📵 ইন্টারনেট নেই — সিস্টেম কাজ করবে না', 'err');
  });

  window.addEventListener('online', function(){
    if(typeof toast === 'function') toast('✅ ইন্টারনেট ফিরে এসেছে', 'ok');
    if(window.SUPA && window.SESSION){
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
     1️⃣5️⃣ AUTO-SYNC every 25 seconds
     ═══════════════════════════════════════════════════════════ */
  setInterval(function(){
    if(!window.SESSION) return;
    if(!navigator.onLine) return;
    if(!window.SUPA) return;
    window.pullCloud().then(function(ok){
      if(ok && typeof renderDashboard === 'function'){
        renderDashboard(true);
      }
    }).catch(function(){});
  }, 25000);

  /* ═══════════════════════════════════════════════════════════
     1️⃣6️⃣ VISIBILITY CHANGE — pull when tab becomes active
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && window.SESSION && navigator.onLine){
      window.pullCloud().then(function(ok){
        if(ok && typeof renderDashboard === 'function'){
          renderDashboard(true);
        }
      }).catch(function(){});
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__onlineStatus = function(){
    console.log('═══════════════════════════════════');
    console.log('🌐 ONLINE-ONLY STATUS v2.0');
    console.log('═══════════════════════════════════');
    console.log('Online:', navigator.onLine ? '✅' : '❌');
    console.log('Mode:', IS_MOBILE ? '📱 Read-Only' : '💻 Full');
    console.log('SUPA:', window.SUPA ? '✅' : '❌');
    console.log('DB:', window.DB ? '✅' : '❌');
    console.log('Session:', window.SESSION ? '✅ ' + window.SESSION.name : '❌ none');
    console.log('SessionStorage saved:', sessionStorage.getItem(SKEY_FULL) ? '✅' : '❌');
    console.log('Local DB keys (should be 0):',
      Object.keys(localStorage).filter(function(k){
        return k.indexOf('cc_db_') === 0 || k.indexOf('cc_agent_bank_') === 0;
      }).length);
    console.log('Txs:', (window.DB?.txs || []).length);
    console.log('Users:', (window.DB?.users || []).length);
    console.log('═══════════════════════════════════');
  };

  window.__forceSync = function(){
    return window.pullCloud().then(function(ok){
      console.log('Sync:', ok ? '✅' : '❌');
      if(ok && typeof renderDashboard === 'function') renderDashboard(true);
    });
  };

  window.__clearSession = function(){
    window.__clearFullSession();
    console.log('🧹 Session cleared — reload করলে login screen আসবে');
  };

  console.log('%c✅ ONLINE-ONLY v2.0 READY',
    'background:#22c55e;color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');
  console.log('💡 Debug: __onlineStatus() | __forceSync() | __clearSession()');

})();