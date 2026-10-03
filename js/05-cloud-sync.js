/* ============================================================
   FILE: 05-cloud-sync.js
   PURPOSE: ⭐ Cloud First → Local Second → Duplicate Skip
   VERSION: v8.3 — Timestamp-Aware Merge (Fix Overwrite Bug)
   ============================================================ */

'use strict';

/* ───── GLOBAL STATE (Window-attached) ───── */
window.__supabaseClient = null;
window.__remoteSaveTimer = null;
window.__isRemoteReady = false;
window.__realtimeChannel = null;
window.__activityChannel = null;
window.__isApplyingRemote = false;
window.__realtimeReconnectAttempts = 0;
window.__broadcastCh = null;
window.__isOnline = navigator.onLine;
window.__retryCount = 0;
window.__retryTimer = null;
window.__netCheckTimer = null;
window.__autoPushInterval = null;
window.__lastAutoPushTs = '';
window.__activityCount = 0;
window.__activityChannelReady = false;
window.__activityQueue = [];
window.__activityChannelRetry = 0;
window.__localSaveTimer = null;
window.__renderTimer = null;
window.__pushInFlight = false;
window.__pushPending = false;

window.__hasSyncedOnce = false;
window.__notifiedTxIds = {};
window.__recentMyTxIds = [];
window.__geoCache = null;

/* ═══════════════════════════════════════════════════════════
   🔥 TX SIGNATURE (Duplicate Detection)
   ═══════════════════════════════════════════════════════════ */
function makeTxSignature(tx){
  if(!tx) return '';
  const createdAt = String(tx.createdAt || '').slice(0, 16);
  return [
    tx.type || '',
    tx.date || '',
    String(Number(tx.amount || 0).toFixed(2)),
    String(tx.custAcc || '').trim(),
    String(tx.branch || ''),
    createdAt
  ].join('|');
}

/* ═══════════════════════════════════════════════════════════
   ⚡ TIMESTAMP HELPER — কে নতুন?
   ═══════════════════════════════════════════════════════════ */
function getTxTimestamp(tx){
  if(!tx) return 0;
  return Date.parse(tx.updatedAt || tx.createdAt || 0) || 0;
}

function getTimestamp(obj){
  if(!obj) return 0;
  return Date.parse(obj.updatedAt || obj.createdAt || obj.at || 0) || 0;
}

/* ═══════════════════════════════════════════════════════════
   🔥 SMART MERGE — Cloud First + Local Second + Timestamp Win
   ═══════════════════════════════════════════════════════════ */
function smartMergeCloudLocal(cloud, local){
  if(!cloud) return local;
  if(!local) return cloud;
  
  const merged = JSON.parse(JSON.stringify(cloud));
  
  /* ───── TX MERGE (Timestamp-Aware) ───── */
  const cloudTxMap = new Map();
  (cloud.txs || []).forEach(t => {
    if(t && t.id) cloudTxMap.set(t.id, t);
  });
  
  const cloudTxSignatures = new Set((cloud.txs || []).map(t => makeTxSignature(t)));
  const localUniqueTxs = [];
  
  (local.txs || []).forEach(lt => {
    if(!lt || !lt.id) return;
    
    const cloudTx = cloudTxMap.get(lt.id);
    if(cloudTx){
      const localTs = getTxTimestamp(lt);
      const cloudTs = getTxTimestamp(cloudTx);
      
      if(localTs > cloudTs){
        const idx = merged.txs.findIndex(x => x.id === lt.id);
        if(idx >= 0){
          merged.txs[idx] = JSON.parse(JSON.stringify(lt));
        }
      }
      return;
    }
    
    const sig = makeTxSignature(lt);
    if(cloudTxSignatures.has(sig)) return;
    
    localUniqueTxs.push(lt);
    cloudTxSignatures.add(sig);
  });
  
  merged.txs = [...merged.txs, ...localUniqueTxs];
  
  /* ───── CUSTOMER MERGE ───── */
  const cloudCustById = new Map();
  const cloudCustByAcc = new Map();
  (cloud.customers || []).forEach(c => {
    if(!c) return;
    if(c.id) cloudCustById.set(c.id, c);
    const acc = String(c.accountNo || '').trim();
    if(acc) cloudCustByAcc.set(acc, c);
  });
  
  const localUniqueCusts = [];
  
  (local.customers || []).forEach(lc => {
    if(!lc) return;
    const acc = String(lc.accountNo || '').trim();
    
    let existing = null;
    if(lc.id && cloudCustById.has(lc.id)) existing = cloudCustById.get(lc.id);
    else if(acc && cloudCustByAcc.has(acc)) existing = cloudCustByAcc.get(acc);
    
    if(existing){
      const localTs = getTimestamp(lc);
      const cloudTs = getTimestamp(existing);
      if(localTs > cloudTs){
        const idx = merged.customers.findIndex(x => x.id === existing.id);
        if(idx >= 0) merged.customers[idx] = JSON.parse(JSON.stringify(lc));
      }
      return;
    }
    
    localUniqueCusts.push(lc);
    if(acc) cloudCustByAcc.set(acc, lc);
    if(lc.id) cloudCustById.set(lc.id, lc);
  });
  
  merged.customers = [...(cloud.customers || []), ...localUniqueCusts];
  
  /* ───── USER MERGE ───── */
  const cloudUserByName = new Map();
  (cloud.users || []).forEach(u => {
    const un = String(u.username || '').toLowerCase();
    if(un) cloudUserByName.set(un, u);
  });
  
  const localUniqueUsers = [];
  
  (local.users || []).forEach(lu => {
    const un = String(lu.username || '').toLowerCase();
    if(!un) return;
    
    const existing = cloudUserByName.get(un);
    if(existing){
      const localTs = getTimestamp(lu);
      const cloudTs = getTimestamp(existing);
      if(localTs > cloudTs){
        const idx = merged.users.findIndex(x => String(x.username || '').toLowerCase() === un);
        if(idx >= 0) merged.users[idx] = JSON.parse(JSON.stringify(lu));
      }
      return;
    }
    
    localUniqueUsers.push(lu);
    cloudUserByName.set(un, lu);
  });
  
  merged.users = [...(cloud.users || []), ...localUniqueUsers];
  
  /* ═══════════════════════════════════════════════════════════
     ⚡ ACTIVITY LOG MERGE — WITH CLEAR TIMESTAMP SUPPORT
     ═══════════════════════════════════════════════════════════ */
  const activityClearedAt = Math.max(
    Date.parse(cloud.activityLogClearedAt || 0) || 0,
    Date.parse(local.activityLogClearedAt || 0) || 0
  );
  
  // Filter cloud logs by timestamp
  const cloudActivityFiltered = (cloud.activityLog || []).filter(a => {
    if(!a || !a.at) return false;
    return Date.parse(a.at) > activityClearedAt;
  });
  
  const cloudActIds = new Set(cloudActivityFiltered.map(a => a.id));
  const localActivityFiltered = (local.activityLog || []).filter(a => {
    if(!a || !a.id) return false;
    if(!a.at) return false;
    if(Date.parse(a.at) <= activityClearedAt) return false;
    return !cloudActIds.has(a.id);
  });
  
  merged.activityLog = [...cloudActivityFiltered, ...localActivityFiltered]
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
    .slice(-ACTIVITY_LOG_LIMIT);
  
  // Preserve clear timestamp
  if(activityClearedAt > 0){
    merged.activityLogClearedAt = new Date(activityClearedAt).toISOString();
  }
  
  /* ═══════════════════════════════════════════════════════════
     ⚡ TX EDIT LOG MERGE — WITH CLEAR TIMESTAMP SUPPORT
     ═══════════════════════════════════════════════════════════ */
  const txLogClearedAt = Math.max(
    Date.parse(cloud.txEditLogClearedAt || 0) || 0,
    Date.parse(local.txEditLogClearedAt || 0) || 0
  );
  
  const cloudEditFiltered = (cloud.txEditLog || []).filter(a => {
    if(!a || !a.at) return false;
    return Date.parse(a.at) > txLogClearedAt;
  });
  
  const cloudEditIds = new Set(cloudEditFiltered.map(a => a.id));
  const localEditFiltered = (local.txEditLog || []).filter(a => {
    if(!a || !a.id) return false;
    if(!a.at) return false;
    if(Date.parse(a.at) <= txLogClearedAt) return false;
    return !cloudEditIds.has(a.id);
  });
  
  merged.txEditLog = [...cloudEditFiltered, ...localEditFiltered]
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
    .slice(-2000);
  
  if(txLogClearedAt > 0){
    merged.txEditLogClearedAt = new Date(txLogClearedAt).toISOString();
  }
  
  /* ───── DELETED TX IDS ───── */
  merged.deletedTxIds = {
    ...(local.deletedTxIds || {}),
    ...(cloud.deletedTxIds || {})
  };
  
  /* ───── YEARLY ARCHIVE ───── */
  const mergedArchive = { ...(cloud.yearlyArchive || {}) };
  Object.keys(local.yearlyArchive || {}).forEach(y => {
    if(!mergedArchive[y]) mergedArchive[y] = [];
    const existingIds = new Set(mergedArchive[y].map(t => t.id));
    (local.yearlyArchive[y] || []).forEach(t => {
      if(t.id && !existingIds.has(t.id)) mergedArchive[y].push(t);
    });
  });
  merged.yearlyArchive = mergedArchive;
  
  /* ───── TIMESTAMP ───── */
  const cloudTs = Date.parse(cloud.__lastUpdate || 0) || 0;
  const localTs = Date.parse(local.__lastUpdate || 0) || 0;
  merged.__lastUpdate = new Date(Math.max(cloudTs, localTs)).toISOString();
  
  merged.lastBaseDate = cloud.lastBaseDate || local.lastBaseDate || todayStr();
  merged.__lastRolloverDate = cloud.__lastRolloverDate || local.__lastRolloverDate;
  
  return merged;
}

/* ═══════════════════════════════════════════════════════════
   🔥 INIT SUPABASE
   ═══════════════════════════════════════════════════════════ */
function initSupabase(){
  try{
    if(typeof window.supabase === 'undefined' || !window.supabase.createClient) return;
    if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
    
    __supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      {
        realtime: { params: { eventsPerSecond: 10 } },
        auth: { persistSession: false }
      }
    );
    __isRemoteReady = true;
    
    const ind = document.getElementById('syncIndicator');
    if(ind){
      ind.textContent = 'ক্লাউড ✓';
      ind.classList.add('active');
      setTimeout(() => {
        ind.classList.remove('active');
        ind.textContent = 'সিঙ্ক';
      }, 2000);
    }
    
    setTimeout(() => {
      try{ setupRealtime(); } catch(e){}
    }, 300);
    
    setTimeout(() => {
      try{ setupActivityChannel(); } catch(e){}
    }, 500);
    
    if(session){
      pullRemoteDB().catch(() => {});
    }
    
    startAutoPush();
  } catch(e){
    console.error('initSupabase error:', e);
    __supabaseClient = null;
    __isRemoteReady = false;
    setTimeout(() => {
      try{ initSupabase(); } catch(e2){}
    }, 5000);
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 AUTO PUSH
   ═══════════════════════════════════════════════════════════ */
function startAutoPush(){
  if(__autoPushInterval) clearInterval(__autoPushInterval);
  
  __autoPushInterval = setInterval(() => {
    try{
      if(!__isRemoteReady || !__supabaseClient) return;
      if(!window.__hasSyncedOnce) return;
      if(__isApplyingRemote) return;
      if(!navigator.onLine) return;
      if(__pushInFlight) return;
      
      const db = DB();
      if(!db) return;
      
      const ts = db.__lastUpdate || '';
      if(!ts) return;
      
      if(ts !== __lastAutoPushTs){
        __lastAutoPushTs = ts;
        pushRemoteDB(true).catch(() => {});
      }
    } catch(e){}
  }, AUTO_PUSH_DELAY_MS);
}

/* ═══════════════════════════════════════════════════════════
   🔥 PULL REMOTE DB
   ═══════════════════════════════════════════════════════════ */
async function pullRemoteDB(){
  if(window.__resetInProgress){
    console.log('🛑 Pull blocked — Reset in progress');
    return;
  }
  
  if(!__isRemoteReady || !__supabaseClient) return;
  if(!navigator.onLine) return;
  
  try{
    const res = await withTimeout(
      __supabaseClient
        .from(window.SUPABASE_TABLE)
        .select('data')
        .eq('id', window.SUPABASE_ROW_ID)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS,
      { data: null, error: { message: 'timeout' } }
    );
    
    if(res && res.data && res.data.data && typeof res.data.data === 'object'){
      const remote = res.data.data;
      const remoteTxCount = (remote.txs || []).length;
      const remoteCustCount = (remote.customers || []).length;
      const localTxCount = (DB()?.txs || []).length;
      const localCustCount = (DB()?.customers || []).length;
      
      if(remoteTxCount === 0 && remoteCustCount === 0 &&
         (localTxCount > 0 || localCustCount > 0)){
        window.__hasSyncedOnce = true;
        if(navigator.onLine){
          pushRemoteDB(true).catch(() => {});
        }
        return;
      }
      
      __isApplyingRemote = true;
      
      // ⚡ Timestamp-aware merge
      const merged = smartMergeCloudLocal(remote, DB());
      
      window.db = merged;
      __lastAutoPushTs = merged.__lastUpdate || '';
      
      normalizeDB();
      forceFixAdmin();
      __invalidateCaches();
      recalcAllCustomerDues(false);
      recomputeLive();
      saveLocalDB();
      
      __isApplyingRemote = false;
      window.__hasSyncedOnce = true;
      
      if(session){
        renderTopbar();
        renderDashboard(true);
        renderSidebar();
      }
    } else {
      window.__hasSyncedOnce = true;
      if((DB()?.txs || []).length > 0 && navigator.onLine){
        pushRemoteDB(true).catch(() => {});
      }
    }
  } catch(e){
    window.__hasSyncedOnce = true;
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 PUSH REMOTE DB — Cloud fetch + Timestamp Merge + Push
   ═══════════════════════════════════════════════════════════ */
async function pushRemoteDB(force, newTxs){
  if(window.__resetInProgress){
    console.log('🛑 Push blocked — Reset in progress');
    return;
  }
  
  if(!__isRemoteReady || !__supabaseClient) return;
  if(__isApplyingRemote) return;
  if(!navigator.onLine && !force){
    queueAdd('push_offline');
    return;
  }
  if(__pushInFlight){
    __pushPending = true;
    return;
  }
  
  __pushInFlight = true;
  
  try{
    // ⭐ STEP 1: Cloud থেকে latest data নামাই
    const cloudRes = await withTimeout(
      __supabaseClient
        .from(window.SUPABASE_TABLE)
        .select('data')
        .eq('id', window.SUPABASE_ROW_ID)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS,
      { data: null }
    );
    
    const cloudData = cloudRes?.data?.data || null;
    const localDB = DB();
    
    // ⭐ STEP 2: Smart Merge (Timestamp-aware)
    let merged;
    if(cloudData){
      merged = smartMergeCloudLocal(cloudData, localDB);
    } else {
      merged = JSON.parse(JSON.stringify(localDB));
    }
    
    // ⭐ STEP 3: Device info
    let deviceInfo = null;
    try{
      deviceInfo = await buildDeviceInfo();
    } catch(e){}
    
    merged.__lastDevice = deviceInfo || {
      device: getDeviceName(),
      user: session?.name || 'অজানা',
      username: session?.username || '',
      branch: session?.role === 'admin' ? 'অ্যাডমিন' : (BRANCHES[session?.branch]?.name || 'অজানা'),
      role: session?.role || 'user',
      location: (window.__geoCache && window.__geoCache.label) || 'Kalaroa, Satkhira, BD'
    };
    
    merged.__lastUpdateInfo = {
      device: merged.__lastDevice.device,
      user: merged.__lastDevice.user,
      username: merged.__lastDevice.username,
      branch: merged.__lastDevice.branch,
      role: merged.__lastDevice.role,
      location: merged.__lastDevice.location,
      txCount: (newTxs && newTxs.length) || 0,
      txTypes: newTxs ? newTxs.map(t => t.type) : [],
      txIds: newTxs ? newTxs.map(t => t.id) : [],
      at: new Date().toISOString()
    };
    
    // ⭐ STEP 4: Local DB update
    window.db = merged;
    normalizeDB();
    __invalidateCaches();
    saveLocalDB();
    
    // ⭐ STEP 5: Cloud-এ push
    const payload = {
      id: window.SUPABASE_ROW_ID,
      data: merged,
      updated_at: new Date().toISOString()
    };
    
    const res = await withTimeout(
      __supabaseClient
        .from(window.SUPABASE_TABLE)
        .upsert(payload, { onConflict: 'id' }),
      SUPABASE_TIMEOUT_MS,
      { error: { message: 'timeout' } }
    );
    
    if(res && res.error) throw new Error(res.error.message || 'push error');
    
    window.__hasSyncedOnce = true;
    __lastAutoPushTs = merged.__lastUpdate || '';
    
    if(newTxs && newTxs.length){
      newTxs.forEach(tx => broadcastTx(tx));
    }
    
    const ind = document.getElementById('syncIndicator');
    if(ind){
      ind.classList.add('active');
      ind.textContent = '☁️ Synced';
      setTimeout(() => {
        ind.classList.remove('active');
        ind.textContent = 'সিঙ্ক';
      }, 1500);
    }
    
    if(queueSize() > 0) queueClear();
    return true;
    
  } catch(e){
    queueAdd('push_fail');
    throw e;
  } finally {
    __pushInFlight = false;
    if(__pushPending){
      __pushPending = false;
      setTimeout(() => pushRemoteDB(true).catch(() => {}), 100);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 HANDLE REALTIME UPDATE
   ═══════════════════════════════════════════════════════════ */
function handleRealtimeUpdate(payload){
  try{
    if(__isApplyingRemote) return;
    if(!payload || payload.eventType === 'DELETE') return;
    
    const remote = payload.new && payload.new.data;
    if(!remote || typeof remote !== 'object') return;
    
    const remoteTs = Date.parse(remote.__lastUpdate || 0) || 0;
    const localTs = Date.parse((DB() && DB().__lastUpdate) || 0) || 0;
    
    if(remoteTs <= localTs) return;
    
    __isApplyingRemote = true;
    
    const oldTxIds = new Set((DB()?.txs || []).map(t => t.id));
    
    // ⚡ Timestamp-aware merge
    const merged = smartMergeCloudLocal(remote, DB());
    
    const newTxs = (merged.txs || []).filter(t => !oldTxIds.has(t.id));
    
    const prevWasDateView = isDateViewMode;
    const prevDashDate = dashDate;
    const prevViewBranch = viewBranch;
    
    window.db = merged;
    __lastAutoPushTs = merged.__lastUpdate || '';
    
    normalizeDB();
    forceFixAdmin();
    __invalidateCaches();
    recalcAllCustomerDues(false);
    recomputeLive();
    saveLocalDB();
    
    dashDate = prevWasDateView ? prevDashDate : todayStr();
    viewBranch = (session && session.role === 'admin') ? prevViewBranch : viewBranch;
    
    if(session){
      renderTopbar();
      renderDashboard(true);
      renderSidebar();
    }
    
    if(newTxs.length > 0){
      const otherTxs = newTxs.filter(tx => !(window.__recentMyTxIds || []).includes(tx.id));
      if(otherTxs.length > 0){
        otherTxs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        otherTxs.forEach((tx, idx) => {
          setTimeout(() => {
            notifyTransaction(tx, '⚡ নতুন');
          }, idx * 600);
        });
      }
    }
    
    __isApplyingRemote = false;
  } catch(e){
    __isApplyingRemote = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 NETWORK QUEUE
   ═══════════════════════════════════════════════════════════ */
function loadQueue(){
  try{
    const raw = safeLS_get(NET_QUEUE_KEY);
    return raw ? JSON.parse(raw) : { items: [], lastAttempt: 0 };
  } catch(e){
    return { items: [], lastAttempt: 0 };
  }
}

function saveQueue(q){
  try{
    safeLS_set(NET_QUEUE_KEY, JSON.stringify(q));
  } catch(e){}
}

function queueAdd(reason){
  const q = loadQueue();
  const last = q.items[q.items.length - 1];
  
  if(last && last.reason === reason &&
     (Date.now() - new Date(last.at).getTime()) < 10000){
    return;
  }
  
  q.items.push({
    id: uid(),
    reason: reason || 'auto',
    at: new Date().toISOString()
  });
  
  if(q.items.length > 50) q.items = q.items.slice(-50);
  saveQueue(q);
  updateQueueBadge();
}

function queueClear(){
  const q = loadQueue();
  q.items = [];
  q.lastAttempt = Date.now();
  saveQueue(q);
  updateQueueBadge();
}

function queueSize(){
  return loadQueue().items.length;
}

function updateQueueBadge(){
  const bdg = document.getElementById('queueBadge');
  const cnt = document.getElementById('queueCount');
  if(!bdg || !cnt) return;
  const n = queueSize();
  cnt.textContent = toBn(n);
  bdg.classList.toggle('show', n > 0);
}

function showNetBanner(isOnline, msg){
  let banner = document.getElementById('netBanner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'netBanner';
    banner.className = 'net-banner';
    document.body.appendChild(banner);
  }
  
  if(isOnline === null){
    banner.classList.remove('show');
    return;
  }
  
  banner.className = 'net-banner' + (isOnline ? ' online-banner' : '');
  banner.innerHTML = '<span>' + (isOnline ? '✅' : '⚠️') + '</span>' +
    '<span>' + msg + '</span>' +
    (!isOnline ? '<button class="retry-btn" id="netRetryBtn">🔄 চেষ্টা</button>' : '');
  banner.classList.add('show');
  
  const rb = banner.querySelector('#netRetryBtn');
  if(rb){
    rb.addEventListener('click', () => forceSyncNow());
  }
  
  setTimeout(() => {
    banner.classList.remove('show');
  }, isOnline ? 2500 : 999999999);
}

function scheduleRetry(){
  if(__retryTimer) clearTimeout(__retryTimer);
  const delay = Math.min(3000 * Math.pow(2, __retryCount), 60000);
  __retryTimer = setTimeout(() => {
    if(!navigator.onLine){
      scheduleRetry();
      return;
    }
    forceSyncNow();
  }, delay);
}

async function forceSyncNow(){
  if(!__isRemoteReady || !__supabaseClient) return;
  if(!navigator.onLine){
    showNetBanner(false, '📶 ইন্টারনেট নেই');
    return;
  }
  
  try{
    await pushRemoteDB(true);
    queueClear();
    __retryCount = 0;
    showNetBanner(true, '✅ সিঙ্ক সফল');
  } catch(e){
    __retryCount++;
    queueAdd('retry_' + __retryCount);
    scheduleRetry();
  }
}

function attachNetworkListeners(){
  window.addEventListener('online', () => {
    __isOnline = true;
    __retryCount = 0;
    showNetBanner(true, '✅ ইন্টারনেট ফিরে এসেছে');
    setTimeout(() => {
      try{ setupRealtime(); setupActivityChannel(); } catch(e){}
    }, 500);
    setTimeout(() => forceSyncNow(), 800);
  });
  
  window.addEventListener('offline', () => {
    __isOnline = false;
    showNetBanner(false, '📵 ইন্টারনেট নেই');
    queueAdd('offline');
  });
  
  if(__netCheckTimer) clearInterval(__netCheckTimer);
  __netCheckTimer = setInterval(async () => {
    __isOnline = navigator.onLine;
    
    if(navigator.onLine && queueSize() > 0){
      const qd = loadQueue();
      if(Date.now() - (qd.lastAttempt || 0) > 25000) forceSyncNow();
    }
    
    if(navigator.onLine && __realtimeChannel){
      try{
        const state = __realtimeChannel.state;
        if(state === 'closed' || state === 'errored') setupRealtime();
      } catch(e){}
    }
    
    if(navigator.onLine && !__activityChannelReady){
      try{ setupActivityChannel(); } catch(e){}
    }
  }, 30000);
}

/* ═══════════════════════════════════════════════════════════
   🔥 BROADCAST CHANNEL (Cross-Tab)
   ═══════════════════════════════════════════════════════════ */
function setupBroadcastChannel(){
  try{
    if(!('BroadcastChannel' in window)) return;
    if(__broadcastCh) __broadcastCh.close();
    
    __broadcastCh = new BroadcastChannel('cc_agent_bank_final');
    __broadcastCh.onmessage = (e) => {
      try{
        const msg = e.data;
        if(!msg || !msg.type) return;
        
        if(msg.type === 'tx_added' && msg.tx){
          if(msg.sender === (session?.id || 'anon')) return;
          if((window.__recentMyTxIds || []).includes(msg.tx.id)) return;
          if(window.__notifiedTxIds && window.__notifiedTxIds[msg.tx.id]) return;
          
          setTimeout(() => notifyTransaction(msg.tx, '📱 অন্য ট্যাব'), 100);
        }
      } catch(err){}
    };
  } catch(e){}
}

function broadcastTx(tx){
  try{
    if(__broadcastCh && tx){
      __broadcastCh.postMessage({
        type: 'tx_added',
        tx: tx,
        sender: session?.id || 'anon',
        at: Date.now()
      });
    }
  } catch(e){}
}

/* ───── END OF FILE 05-cloud-sync.js ───── */
console.log('✅ Cloud Sync loaded — v8.3 (Timestamp-Aware Merge)');