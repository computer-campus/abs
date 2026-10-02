/* ============================================================
   FILE: 90-login.js
   PURPOSE: Login, Logout, startApp, afterTxSave
   VERSION: v7.6 — FAST LOGOUT
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 LOGIN
   ═══════════════════════════════════════════════════════════ */
async function doLogin(){
  const b = $('#loginBtn');
  const e = $('#loginErr');
  
  const u = String($('#loginUser').value || '').replace(/\s+/g, ' ').trim();
  const p = String($('#loginPass').value || '').trim();
  
  if(!u || !p){
    e.textContent = '⚠️ আইডি ও পাসওয়ার্ড দিন';
    return;
  }
  
  b.disabled = true;
  b.innerHTML = '<span class="spinner"></span> যাচাই...';
  e.textContent = '';
  
  try{
    if(!DB()){
      e.textContent = '❌ ডেটাবেস লোড হয়নি';
      b.disabled = false;
      b.innerHTML = '🔐 লগইন';
      return;
    }
    
    forceFixAdmin();
    
    const users = DB().users || [];
    const lowerU = u.toLowerCase();
    
    let user = users.find(x =>
      String(x.username || '').toLowerCase() === lowerU &&
      verifyPassword(p, x.password)
    );
    
    if(!user){
      user = users.find(x =>
        String(x.username || '').toLowerCase() === lowerU &&
        getPlainPassword(x) === p
      );
    }
    
    if(!user && lowerU === 'admin' && _akVerify(p)){
      forceFixAdmin();
      user = DB().users.find(x => x.username === 'admin');
    }
    
    if(!user){
      e.textContent = '❌ ইউজার আইডি বা পাসওয়ার্ড ভুল';
      $('#loginPass').value = '';
      b.disabled = false;
      b.innerHTML = '🔐 লগইন';
      return;
    }
    
    if(user.role !== 'admin' && !BRANCHES[user.branch]){
      e.textContent = '❌ আপনার আউটলেট সেট নেই।';
      b.disabled = false;
      b.innerHTML = '🔐 লগইন';
      return;
    }
    
    session = user;
    try{ sessionStorage.setItem(SKEY, user.id); } catch(ex){}
    
    viewBranch = user.role === 'admin' ? 'all' : user.branch;
    dashDate = todayStr();
    
    // ⚡ Show app immediately — no waiting for cloud
    startApp();
    
    // ⚡ Background sync (non-blocking)
    setTimeout(async () => {
      try{
        if(__isRemoteReady && __supabaseClient && navigator.onLine){
          await pullRemoteDB();
        }
      } catch(e){}
      
      try{
        __activityChannelReady = false;
        if(__activityChannel){
          try{ __activityChannel.unsubscribe(); } catch(e){}
          try{ __supabaseClient.removeChannel(__activityChannel); } catch(e){}
          __activityChannel = null;
        }
        setupActivityChannel();
      } catch(e){}
      
      // Broadcast login (background)
      let tries = 0;
      const tryBroadcast = () => {
        tries++;
        if(__activityChannelReady){
          try{
            broadcastActivity({ type: 'login' });
            addActivityLog({
              type: 'login',
              title: '🔓 লগইন',
              detail: user.name + ' (' + user.username + ')'
            });
            saveDB();
          } catch(ex){}
          return;
        }
        if(tries >= 100){
          try{ broadcastActivity({ type: 'login' }); } catch(e){}
          return;
        }
        setTimeout(tryBroadcast, 100);
      };
      tryBroadcast();
    }, 100);
    
    // Ensure sidebar handler
    setTimeout(() => {
      try{ attachSidebarClickHandler(); } catch(e){}
    }, 100);
    
  } catch(err){
    e.textContent = '❌ ' + (err.message || 'Error');
    b.disabled = false;
    b.innerHTML = '🔐 লগইন';
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 LOGOUT — FAST (UI change first, cleanup in background)
   ═══════════════════════════════════════════════════════════ */
async function logout(){
  // ═══════ STEP 1: Show login screen IMMEDIATELY ═══════
  const sid = session?.id || 'unknown';
  const sname = session?.name || '';
  
  // Hide app + show login — instantly
  try{
    $('#app').classList.add('hidden');
    const ls = $('#loginScreen');
    if(ls){
      ls.classList.remove('hidden');
      ls.style.display = 'flex';
    }
    $('#loginPass').value = '';
    $('#loginUser').value = '';
    $('#modalRoot').innerHTML = '';
    
    const b = $('#loginBtn');
    if(b){
      b.disabled = false;
      b.innerHTML = '🔐 লগইন করুন';
    }
  } catch(e){}
  
  // ═══════ STEP 2: Clear session in-memory ═══════
  try{ sessionStorage.removeItem(SKEY); } catch(e){}
  session = null;
  viewBranch = 'all';
  dashDate = todayStr();
  isDateViewMode = false;
  
  // Topbar reset
  try{
    const tb = document.getElementById('topbar');
    if(tb) tb.classList.remove('hidden-scroll', 'scrolled');
    if(window.__topbarScrollHandler){
      window.removeEventListener('scroll', window.__topbarScrollHandler);
      window.removeEventListener('touchmove', window.__topbarScrollHandler);
      window.__topbarScrollHandler = null;
    }
    updatePresenceUI([]);
  } catch(e){}
  
  // ═══════ STEP 3: Background cleanup (NO await) ═══════
  // Save locally first (fast)
  try{ saveLocalDB(); } catch(e){}
  
  // All async work in background — don't block UI
  setTimeout(async () => {
    try{
      // Activity log — local only
      try{
        if(DB()){
          if(!DB().activityLog) DB().activityLog = [];
          DB().activityLog.push({
            id: uid(),
            type: 'logout',
            title: '🔒 লগআউট',
            detail: sname,
            user: sname,
            username: '',
            role: 'user',
            branch: '—',
            device: getDeviceName(),
            location: (window.__geoCache && window.__geoCache.label) || '',
            at: new Date().toISOString()
          });
          if(DB().activityLog.length > ACTIVITY_LOG_LIMIT){
            DB().activityLog = DB().activityLog.slice(-ACTIVITY_LOG_LIMIT);
          }
        }
      } catch(e){}
      
      // Broadcast logout
      try{
        if(__activityChannelReady){
          broadcastActivity({ type: 'logout' });
        }
      } catch(e){}
      
      // Save + push in background
      try{
        if(DB()){
          DB().__lastUpdate = new Date().toISOString();
          saveLocalDB();
          if(navigator.onLine && __isRemoteReady && __supabaseClient){
            pushRemoteDB(true).catch(() => {});
          }
        }
      } catch(e){}
      
      // Disconnect realtime (background)
      try{
        if(__realtimeChannel && __supabaseClient){
          __realtimeChannel.untrack().catch(() => {});
          setTimeout(() => {
            try{ __supabaseClient.removeChannel(__realtimeChannel); } catch(e){}
            __realtimeChannel = null;
          }, 500);
        }
      } catch(e){}
      
      // Disconnect activity channel (background)
      try{
        if(__activityChannel && __supabaseClient){
          setTimeout(() => {
            try{ __supabaseClient.removeChannel(__activityChannel); } catch(e){}
            __activityChannel = null;
            __activityChannelReady = false;
            __activityQueue = [];
          }, 800);
        }
      } catch(e){}
      
    } catch(e){}
  }, 50);
}

/* ═══════════════════════════════════════════════════════════
   🔥 START APP
   ═══════════════════════════════════════════════════════════ */
function startApp(){
  if(!session) return;
  
  const ls = $('#loginScreen');
  if(ls){
    ls.classList.add('hidden');
    ls.style.display = '';
  }
  $('#app').classList.remove('hidden');
  
  performDailyRollover(false);
  __invalidateCaches();
  recalcAllCustomerDues(false);
  recomputeLive();
  
  dashDate = todayStr();
  isDateViewMode = false;
  
  // ⚡ Render UI first
  renderTopbar();
  renderDashboard(true);
  renderSidebar();
  attachSidebarClickHandler();
  startClock();
  
  // ⚡ Attach scroll (deferred)
  setTimeout(() => {
    try{ attachTopbarScroll(); } catch(e){}
  }, 300);
  
  // ⚡ Background tasks
  setTimeout(() => {
    try{ saveDB(); } catch(e){}
    try{ maybeAutoBackup(); } catch(e){}
  }, 2000);
  
  // ⚡ Presence tracking (deferred)
  setTimeout(() => {
    try{
      if(__realtimeChannel && __realtimeChannel.state === 'joined'){
        __realtimeChannel.track({
          user: session.name,
          username: session.username,
          branch: session.branch || 'all',
          role: session.role,
          location: (window.__geoCache && window.__geoCache.label) || '',
          joined_at: new Date().toISOString()
        }).catch(() => {});
      }
    } catch(e){}
  }, 800);
}

/* ═══════════════════════════════════════════════════════════
   🔥 TOPBAR SCROLL HANDLER
   ═══════════════════════════════════════════════════════════ */
function attachTopbarScroll(){
  if(window.__topbarScrollHandler){
    window.removeEventListener('scroll', window.__topbarScrollHandler);
    window.removeEventListener('touchmove', window.__topbarScrollHandler);
  }
  
  let __lastScrollY = window.scrollY || 0;
  let __scrollThreshold = 60;
  let __scrollTicking = false;
  
  const handler = function(){
    if(__scrollTicking) return;
    __scrollTicking = true;
    
    requestAnimationFrame(() => {
      const topbar = document.getElementById('topbar');
      if(!topbar){
        __scrollTicking = false;
        return;
      }
      
      const modalOpen = document.getElementById('modalRoot')?.children?.length > 0;
      if(modalOpen){
        topbar.classList.remove('hidden-scroll');
        __scrollTicking = false;
        return;
      }
      
      const currentY = window.scrollY || 0;
      const diff = currentY - __lastScrollY;
      
      if(currentY <= 20){
        topbar.classList.remove('hidden-scroll');
        topbar.classList.remove('scrolled');
      } else if(diff > 8 && currentY > __scrollThreshold){
        topbar.classList.add('hidden-scroll');
      } else if(diff < -8){
        topbar.classList.remove('hidden-scroll');
        topbar.classList.add('scrolled');
      } else if(currentY > __scrollThreshold){
        topbar.classList.add('scrolled');
      }
      
      __lastScrollY = currentY;
      __scrollTicking = false;
    });
  };
  
  window.__topbarScrollHandler = handler;
  window.addEventListener('scroll', handler, { passive: true });
  window.addEventListener('touchmove', handler, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   🔥 AFTER TX SAVE
   ═══════════════════════════════════════════════════════════ */
async function afterTxSave(tx, isCreating){
  if(!tx) return;
  
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
  
  __invalidateCaches();
  recalcAllCustomerDues(false);
  
  if(typeof recomputeLiveIncremental === 'function'){
    recomputeLiveIncremental(tx);
  } else {
    recomputeLive();
  }
  
  try{ saveLocalDB(); } catch(e){}
  
  updateDashboardLight();
  renderTopbar();
  renderSidebar();
  
  pushRemoteDB(true, isCreating ? [tx] : null).catch(() => {});
  
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
  
  setTimeout(() => {
    try{
      if(!tx.id || !(window.__recentMyTxIds || []).includes(tx.id)){
        notifyTransaction(tx, isCreating ? '📥 নতুন' : '✏️ আপডেট');
      }
    } catch(e){}
  }, 800);
}

/* ───── END OF FILE 90-login.js ───── */
console.log('✅ Login loaded — v7.6 (fast logout)');