/* ============================================================
   FILE: js/18-mobile-session-fix.js
   PURPOSE: Mobile session persist + notification enable
   VERSION: v1.0
   ============================================================ */
'use strict';

(function(){
  console.log('📱 Mobile Session Fix loading...');

  /* ═══════════════════════════════════════════════════════════
     🔑 SESSION PERSISTENCE — localStorage use করো
     ═══════════════════════════════════════════════════════════ */
  
  // Session keys
  var SKEY_OLD = 'cc_session';
  var SKEY_NEW = 'cc_session_persist';  // localStorage version

  // ⚡ Save session to localStorage
  function persistSession(user){
    if(!user || !user.id) return;
    try {
      localStorage.setItem(SKEY_NEW, JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branch: user.branch,
        savedAt: new Date().toISOString()
      }));
      console.log('✅ Session persisted to localStorage');
    } catch(e){
      console.warn('Session save error:', e);
    }
  }

  // ⚡ Restore session from localStorage
  function restoreSession(){
    try {
      var raw = localStorage.getItem(SKEY_NEW);
      if(!raw) return null;
      var data = JSON.parse(raw);
      if(!data || !data.id) return null;
      return data;
    } catch(e){
      return null;
    }
  }

  // ⚡ Clear session
  function clearSession(){
    try {
      localStorage.removeItem(SKEY_NEW);
      sessionStorage.removeItem(SKEY_OLD);
    } catch(e){}
  }

  /* ═══════════════════════════════════════════════════════════
     🔄 AUTO LOGIN — Page Load এ
     ═══════════════════════════════════════════════════════════ */
  
  var autoLoginAttempts = 0;
  var MAX_ATTEMPTS = 30;

  function tryAutoLogin(){
    autoLoginAttempts++;
    
    if(autoLoginAttempts > MAX_ATTEMPTS){
      console.log('⚠️ Auto-login timeout');
      return;
    }

    // Need DB loaded + user session
    if(!window.DB || !DB.users || !DB.users.length){
      setTimeout(tryAutoLogin, 500);
      return;
    }

    // Already logged in?
    if(window.SESSION){
      console.log('✅ Already logged in');
      persistSession(window.SESSION);
      return;
    }

    // Try restore
    var saved = restoreSession();
    if(!saved){
      console.log('ℹ️ No saved session');
      return;
    }

    // Find user
    var user = DB.users.find(function(u){ return u.id === saved.id; });
    if(!user){
      console.log('❌ User not found:', saved.id);
      clearSession();
      return;
    }

    // ⚡ Auto login
    console.log('🔄 Auto-login:', user.username);
    window.SESSION = user;
    try { SESSION = user; } catch(e){}

    try { sessionStorage.setItem(SKEY_OLD, user.id); } catch(e){}

    try { VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch; } catch(e){}
    try { window.VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch; } catch(e){}

    if(typeof todayStr === 'function'){
      try { DASH_DATE = todayStr(); } catch(e){}
    }

    // Hide login, show app
    var loginScreen = document.getElementById('login');
    var app = document.getElementById('app');
    
    if(loginScreen){
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
    }
    if(app){
      app.classList.remove('hidden');
    }

    // ⚡ Init app
    setTimeout(function(){
      try {
        if(typeof renderTopbar === 'function') renderTopbar();
        if(typeof renderDashboard === 'function') renderDashboard(true);
        if(typeof renderSidebar === 'function') renderSidebar();
        if(typeof startClock === 'function') startClock();
        if(typeof setupActivityChannel === 'function') setupActivityChannel();
        
        if(typeof toast === 'function'){
          toast('✅ স্বাগতম, ' + user.name, 'ok');
        }
      } catch(e){
        console.warn('Init error:', e);
      }
    }, 100);

    console.log('✅ Auto-login done');
  }

  // Start trying
  setTimeout(tryAutoLogin, 800);

  /* ═══════════════════════════════════════════════════════════
     🔓 HOOK doLogin — Session persist করো
     ═══════════════════════════════════════════════════════════ */
  
  var hookAttempts = 0;
  function hookLogin(){
    hookAttempts++;
    if(hookAttempts > 50) return;

    if(typeof window.doLogin !== 'function'){
      setTimeout(hookLogin, 200);
      return;
    }

    var __origDoLogin = window.doLogin;

    window.doLogin = async function(){
      var result = await __origDoLogin.apply(this, arguments);

      // After login, check SESSION and persist
      setTimeout(function(){
        if(window.SESSION){
          persistSession(window.SESSION);
          console.log('🔑 Session persisted after login');
        }
      }, 500);

      return result;
    };

    console.log('✅ Login hook installed');
  }

  hookLogin();

  /* ═══════════════════════════════════════════════════════════
     🔔 NOTIFICATION CHANNEL — Force setup on mobile
     ═══════════════════════════════════════════════════════════ */
  
  function setupMobileNotifications(){
    if(!window.SUPA){
      setTimeout(setupMobileNotifications, 1000);
      return;
    }

    if(!window.SESSION){
      setTimeout(setupMobileNotifications, 1000);
      return;
    }

    console.log('🔔 Setting up mobile notifications...');

    try {
      // ⚡ Ensure activity channel
      if(typeof setupActivityChannel === 'function'){
        setupActivityChannel();
      }

      // ⚡ Ensure broadcast channel
      if(typeof setupBroadcastChannel === 'function'){
        setupBroadcastChannel();
      }

      // ⚡ Listen for cloud pull — notify about new txs
      var lastTxCount = (window.DB && DB.txs ? DB.txs.length : 0);

      setInterval(function(){
        if(!window.DB || !DB.txs) return;

        var currentCount = DB.txs.length;
        if(currentCount > lastTxCount){
          var diff = currentCount - lastTxCount;
          console.log('🔔 ' + diff + ' new txs detected');
          
          // Notify user
          if(typeof toast === 'function'){
            toast('🔔 ' + diff + ' টি নতুন লেনদেন sync হয়েছে', 'ok');
          }

          // Browser notification
          if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
            try {
              new Notification('💸 নতুন লেনদেন', {
                body: diff + ' টি নতুন লেনদেন sync হয়েছে',
                tag: 'cc_mobile_tx_' + Date.now()
              });
            } catch(e){}
          }

          lastTxCount = currentCount;
        }
      }, 5000);

    } catch(e){
      console.warn('Notification setup error:', e);
    }
  }

  setTimeout(setupMobileNotifications, 3000);

  /* ═══════════════════════════════════════════════════════════
     🔓 PWA-like — visibility change এ pull
     ═══════════════════════════════════════════════════════════ */
  
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && window.SESSION){
      console.log('📱 App visible — pulling fresh data');
      if(typeof pullCloud === 'function'){
        pullCloud().then(function(ok){
          if(ok && typeof renderDashboard === 'function'){
            renderDashboard(true);
          }
        }).catch(function(){});
      }
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🎯 BEFORE UNLOAD — session save
     ═══════════════════════════════════════════════════════════ */
  
  window.addEventListener('beforeunload', function(){
    if(window.SESSION){
      persistSession(window.SESSION);
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🎯 HOOK logout — session clear
     ═══════════════════════════════════════════════════════════ */
  
  var logoutHookAttempts = 0;
  function hookLogout(){
    logoutHookAttempts++;
    if(logoutHookAttempts > 50) return;

    if(typeof window.doLogout !== 'function'){
      setTimeout(hookLogout, 200);
      return;
    }

    var __origDoLogout = window.doLogout;

    window.doLogout = async function(){
      clearSession();
      console.log('🔑 Session cleared on logout');
      return __origDoLogout.apply(this, arguments);
    };

    console.log('✅ Logout hook installed');
  }

  hookLogout();

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__sessionStatus = function(){
    var saved = restoreSession();
    console.log('═══════════════════════════════════');
    console.log('📱 Session Status');
    console.log('═══════════════════════════════════');
    console.log('Current SESSION:', window.SESSION ? window.SESSION.name : 'none');
    console.log('Saved session:', saved ? saved.username : 'none');
    console.log('Session storage:', sessionStorage.getItem(SKEY_OLD) ? '✅' : '❌');
    console.log('LocalStorage:', localStorage.getItem(SKEY_NEW) ? '✅' : '❌');
    console.log('═══════════════════════════════════');
  };

  window.__forceAutoLogin = function(){
    clearSession();
    autoLoginAttempts = 0;
    tryAutoLogin();
  };

  console.log('✅ Mobile Session Fix ready');
})();