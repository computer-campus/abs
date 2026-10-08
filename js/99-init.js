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

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}