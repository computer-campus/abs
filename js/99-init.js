/* ============================================================
   FILE: js/99-init.js
   PURPOSE: Initialization
   ============================================================ */
'use strict';

async function init(){
  console.log('%c🚀 Init...', 'background:#3b82f6;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold');

  if(new URLSearchParams(location.search).get('clean') === '1'){
    localStorage.removeItem(DB_KEY);
    sessionStorage.clear();
    if(history.replaceState) history.replaceState(null, '', location.pathname);
  }

  const local = loadLocal();
  DB = local || defaultDB();
  normalizeDB();

  initSupa();

  $('#sb-overlay').addEventListener('click', closeSidebar);
  $('#login-btn').addEventListener('click', doLogin);
  $('#login-user').addEventListener('keydown', e => { if(e.key === 'Enter') $('#login-pass').focus(); });
  $('#login-pass').addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });

  // Auto-login
  const sid = sessionStorage.getItem(SKEY);
  if(sid){
    const u = DB.users.find(x => x.id === sid);
    if(u){
      SESSION = u;
      VIEW_BRANCH = u.role === 'admin' ? 'all' : u.branch;
      DASH_DATE = todayStr();
      $('#login').classList.add('hidden');
      $('#app').classList.remove('hidden');
      renderTopbar(); renderDashboard(); renderSidebar();
      if(READ_ONLY){
        const b = document.createElement('div');
        b.id = 'ro-banner';
        b.innerHTML = '👁️ <b>Read-Only Mode</b> — শুধু দেখা যাবে';
        document.body.appendChild(b);
        setTimeout(() => b.remove(), 12000);
      }
    } else {
      $('#login').classList.remove('hidden');
    }
  } else {
    $('#login').classList.remove('hidden');
  }

  // Background cloud pull
  if(navigator.onLine){
    pullCloud().then(ok => {
      if(ok){
        console.log('☁️ Cloud loaded');
        if(SESSION){ renderTopbar(); renderDashboard(); }
      }
    }).catch(() => {});
  }

  window.addEventListener('online', () => {
    toast('✅ ইন্টারনেট ফিরে এসেছে', 'ok');
    if(SESSION) pullCloud().then(() => renderDashboard());
  });
  window.addEventListener('offline', () => toast('📵 ইন্টারনেট নেই', 'warn'));

  console.log('%c✅ Ready', 'background:#22c55e;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold');
}

  /* ═══════════════════════════════════════════════════════════
     📱 MOBILE AUTO-PULL — session থাকলে cloud থেকে data আনো
     ═══════════════════════════════════════════════════════════ */
  if(window.__READ_ONLY_MODE){
    var mobilePullAttempts = 0;

    function mobileAutoPull(){
      mobilePullAttempts++;
      if(mobilePullAttempts > 30) return;

      // Need session
      var savedSession = null;
      try {
        savedSession = JSON.parse(localStorage.getItem('cc_session_persist') || 'null');
      } catch(e){}

      if(!savedSession){
        setTimeout(mobileAutoPull, 1000);
        return;
      }

      // Need SUPA
      if(!window.SUPA){
        setTimeout(mobileAutoPull, 1000);
        return;
      }

      console.log('📱 Mobile: pulling cloud data...');

      SUPA.from('agent_bank').select('data').eq('id', 'cc_agent_bank_main').maybeSingle()
        .then(function(r){
          if(!r.data || !r.data.data) return;

          var c = r.data.data;
          window.db = JSON.parse(JSON.stringify(c));

          if(c.liveAccounts) DB.liveAccounts = JSON.parse(JSON.stringify(c.liveAccounts));
          if(c.liveVault) DB.liveVault = JSON.parse(JSON.stringify(c.liveVault));
          if(c.baseAccounts) DB.baseAccounts = JSON.parse(JSON.stringify(c.baseAccounts));
          if(c.baseVault) DB.baseVault = JSON.parse(JSON.stringify(c.baseVault));

          // Fix negatives
          if(DB.liveAccounts){
            Object.keys(DB.liveAccounts).forEach(function(b){
              var a = DB.liveAccounts[b];
              if(a.bank < 0) a.bank = 0;
              if(a.cash < 0) a.cash = 0;
              if(a.other < 0) a.other = 0;
            });
          }

          if(typeof saveLocal === 'function') saveLocal();

          if(window.SESSION){
            if(typeof renderTopbar === 'function') renderTopbar();
            if(typeof renderDashboard === 'function') renderDashboard(true);
          }

          console.log('✅ Mobile auto-pull done');
        })
        .catch(function(e){
          console.warn('❌', e);
        });
    }

    // Start after 3s
    setTimeout(mobileAutoPull, 3000);
    // Refresh every 30s
    setInterval(mobileAutoPull, 30000);
  }

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}