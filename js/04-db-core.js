/* ============================================================
   FILE: 04-db-core.js
   PURPOSE: Database load, save, normalize, default
   VERSION: v7.6 — PERFORMANCE OPTIMIZED
   ============================================================ */

'use strict';

/* ───── GLOBAL DB OBJECT ───── */
window.db = null;

/* ───── SESSION ───── */
let session = null;
let viewBranch = 'all';
let dashDate = '';
let isDateViewMode = false;

/* ───── DEFAULT USERS ───── */
function defaultUsers(){
  return [{
    id: 'admin1',
    name: 'প্রধান অ্যাডমিন',
    username: 'admin',
    password: _AK_DEFAULT_HASH,
    encryptedPassword: encryptPlain(_akDecode()),
    role: 'admin',
    branch: 'all',
    __hashed: true,
    createdAt: new Date().toISOString()
  }];
}

/* ───── DEFAULT DB ───── */
function defaultDB(){
  const baseVault = {};
  const baseAccounts = {};
  const liveVault = {};
  const liveAccounts = {};
  const branchCapital = {};
  
  Object.keys(BRANCHES).forEach(b => {
    baseVault[b] = {};
    DENOMS.forEach(d => baseVault[b][d] = 0);
    
    baseAccounts[b] = { bank: 0, cash: 0, other: 0 };
    
    liveVault[b] = {};
    DENOMS.forEach(d => liveVault[b][d] = 0);
    
    liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
    
    branchCapital[b] = 0;
  });
  
  return {
    __version: window.APP_VERSION,
    users: defaultUsers(),
    customers: [],
    txs: [],
    txEditLog: [],
    activityLog: [],
    totalCapital: 0,
    branchCapital,
    baseVault,
    baseAccounts,
    liveVault,
    liveAccounts,
    dailyClose: {},
    yearlyArchive: {},
    deletedTxIds: {},
    lastBaseDate: todayStr(),
    __lastRolloverDate: todayStr(),
    __firstSetupDone: false,
    __lastUpdate: new Date().toISOString()
  };
}

/* ───── NORMALIZE DB ───── */
function normalizeDB(){
  const d = DB();
  if(!d) return;
  
  Object.keys(BRANCHES).forEach(b => {
    if(!d.baseVault) d.baseVault = {};
    if(!d.baseVault[b]){
      d.baseVault[b] = {};
      DENOMS.forEach(x => d.baseVault[b][x] = 0);
    }
    DENOMS.forEach(x => {
      const v = Number(d.baseVault[b][x]);
      d.baseVault[b][x] = Number.isFinite(v) ? v : 0;
    });
    
    if(!d.liveVault) d.liveVault = {};
    if(!d.liveVault[b]){
      d.liveVault[b] = {};
      DENOMS.forEach(x => d.liveVault[b][x] = 0);
    }
    DENOMS.forEach(x => {
      const v = Number(d.liveVault[b][x]);
      d.liveVault[b][x] = Number.isFinite(v) ? v : 0;
    });
    
    if(!d.baseAccounts) d.baseAccounts = {};
    if(!d.baseAccounts[b]) d.baseAccounts[b] = { bank: 0, cash: 0, other: 0 };
    
    if(!d.liveAccounts) d.liveAccounts = {};
    if(!d.liveAccounts[b]) d.liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
  });
  
  if(!Array.isArray(d.customers)) d.customers = [];
  if(!Array.isArray(d.txs)) d.txs = [];
  if(!Array.isArray(d.activityLog)) d.activityLog = [];
    // ⚡ Preserve clear timestamps
  if(!d.activityLogClearedAt) d.activityLogClearedAt = '';
  if(!d.txEditLogClearedAt) d.txEditLogClearedAt = '';
  if(!Array.isArray(d.users) || !d.users.length) d.users = defaultUsers();
  if(!d.lastBaseDate) d.lastBaseDate = todayStr();
  if(!d.__lastRolloverDate) d.__lastRolloverDate = d.lastBaseDate;
  if(!d.yearlyArchive) d.yearlyArchive = {};
  if(!d.txEditLog) d.txEditLog = [];
  if(!d.deletedTxIds) d.deletedTxIds = {};
  if(typeof d.totalCapital !== 'number') d.totalCapital = 0;
  if(!d.branchCapital || typeof d.branchCapital !== 'object') d.branchCapital = {};
  
  Object.keys(BRANCHES).forEach(b => {
    if(typeof d.branchCapital[b] !== 'number') d.branchCapital[b] = 0;
  });
  
  d.totalCapital = Object.values(d.branchCapital).reduce((s, v) => s + (Number(v) || 0), 0);
  
  (d.txs || []).forEach(t => {
    if(!t.custBranch) t.custBranch = t.branch || 'kalaroa';
    if(!t.year && t.date) t.year = t.date.slice(0, 4);
  });
  
  (d.users || []).forEach(u => {
    if(u.password && !u.__hashed){
      u.password = hashPassword(u.password);
      u.__hashed = true;
    }
    if(u.plainPassword === undefined) u.plainPassword = '';
    if(u.encryptedPassword === undefined) u.encryptedPassword = '';
    if(!u.createdAt) u.createdAt = new Date().toISOString();
  });
}

/* ───── FORCE FIX ADMIN ───── */
function forceFixAdmin(){
  if(!DB()) return;
  if(!Array.isArray(DB().users)) DB().users = [];
  
  let admin = DB().users.find(u => u.username === 'admin');
  if(!admin){
    admin = {
      id: 'admin1',
      name: 'প্রধান অ্যাডমিন',
      username: 'admin',
      password: _AK_DEFAULT_HASH,
      encryptedPassword: encryptPlain(_akDecode()),
      role: 'admin',
      branch: 'all',
      __hashed: true,
      createdAt: new Date().toISOString()
    };
    DB().users.push(admin);
  } else {
    if(!admin.__hashed || !admin.password){
      admin.password = _AK_DEFAULT_HASH;
      admin.__hashed = true;
    }
    if(!admin.role) admin.role = 'admin';
    if(!admin.branch) admin.branch = 'all';
    if(!admin.encryptedPassword) admin.encryptedPassword = encryptPlain(_akDecode());
  }
}

/* ───── DB GETTER ───── */
function DB(){
  return window.db;
}

/* ───── SAVE LOCAL DB ───── */
function saveLocalDB(){
  try{
    const db = DB();
    const clean = {
      __version: db.__version,
      __firstSetupDone: db.__firstSetupDone,
      __lastRolloverDate: db.__lastRolloverDate,
      users: db.users || [],
      customers: db.customers || [],
      txs: (db.txs || []).slice(-LS_TX_LIMIT),
      txEditLog: (db.txEditLog || []).slice(-300),
      activityLog: (db.activityLog || []).slice(-300),
      activityLogClearedAt: db.activityLogClearedAt || '',
      txEditLogClearedAt: db.txEditLogClearedAt || '',
      totalCapital: db.totalCapital || 0,
      branchCapital: db.branchCapital || {},
      baseVault: db.baseVault,
      baseAccounts: db.baseAccounts,
      liveVault: db.liveVault,
      liveAccounts: db.liveAccounts,
      lastBaseDate: db.lastBaseDate || todayStr(),
      deletedTxIds: db.deletedTxIds || {},
      yearlyArchive: db.yearlyArchive || {},
      __lastUpdate: db.__lastUpdate || new Date().toISOString()
    };
    safeLS_set(LOCAL_DB_KEY, JSON.stringify(clean));
  } catch(e){}
}

/* ───── LOAD LOCAL DB ───── */
function loadLocalDB(){
  try{
    const raw = safeLS_get(LOCAL_DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}

/* ───── SAVE DB ───── */
async function saveDB(opts){
  opts = opts || {};
  if(!DB()) return;
  
  const db = DB();
  db.__lastUpdate = new Date().toISOString();
  db.__version = window.APP_VERSION;
  
  if(db.branchCapital){
    db.totalCapital = Object.values(db.branchCapital).reduce((s, v) => s + (Number(v) || 0), 0);
  }
  
  __invalidateCaches();
  
  if(!opts.skipLocal){
    try{ saveLocalDB(); } catch(e){}
  }
  
  if(navigator.onLine && __isRemoteReady && __supabaseClient){
    pushRemoteDB(true).catch(() => { queueAdd('push_fail'); });
  } else if(!navigator.onLine){
    queueAdd('offline');
  }
}

/* ───── CACHE VARIABLES ───── */
let __cachedAllTxs = null;
let __cachedAllTxsVersion = '';
let __customerDueCache = null;
let __customerDueCacheVersion = '';

function __invalidateCaches(){
  __cachedAllTxs = null;
  __cachedAllTxsVersion = '';
  __customerDueCache = null;
  __customerDueCacheVersion = '';
}

/* ═══════════════════════════════════════════════════════════
   ⚡ PERFORMANCE HELPERS
   ═══════════════════════════════════════════════════════════ */
window.__perfLog = function(label, ms){
  console.log('⚡ ' + label + ': ' + ms.toFixed(0) + 'ms');
};

function fastFilter(arr, predicate){
  const result = [];
  const len = arr.length;
  for(let i = 0; i < len; i++){
    if(predicate(arr[i])) result.push(arr[i]);
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════
   🔥 GET ALL TXS — OPTIMIZED CACHE
   ═══════════════════════════════════════════════════════════ */
function getAllTxs(){
  const db = DB();
  if(!db) return [];
  
  // ⚡ Fast cache key computation
  const currentVersion = String(db.__lastUpdate || '0') + '_' + 
                         (db.txs?.length || 0) + '_' + 
                         Object.keys(db.deletedTxIds || {}).length;
  
  if(__cachedAllTxs && __cachedAllTxsVersion === currentVersion){
    return __cachedAllTxs;
  }
  
  const seen = new Set();
  const result = [];
  const delSet = new Set(Object.keys(db.deletedTxIds || {}));
  
  // ⚡ Process main txs first (usually newest)
  const mainTxs = db.txs || [];
  const mainLen = mainTxs.length;
  for(let i = 0; i < mainLen; i++){
    const t = mainTxs[i];
    if(!t || !t.id) continue;
    if(delSet.has(t.id)) continue;
    if(seen.has(t.id)) continue;
    seen.add(t.id);
    result.push(t);
  }
  
  // ⚡ Then process archive
  const arch = db.yearlyArchive || {};
  for(const year in arch){
    const arr = arch[year];
    if(!Array.isArray(arr)) continue;
    const arrLen = arr.length;
    for(let i = 0; i < arrLen; i++){
      const t = arr[i];
      if(!t || !t.id) continue;
      if(delSet.has(t.id)) continue;
      if(seen.has(t.id)) continue;
      seen.add(t.id);
      result.push(t);
    }
  }
  
  __cachedAllTxs = result;
  __cachedAllTxsVersion = currentVersion;
  return result;
}

/* ───── GET TXS FOR YEAR ───── */
function getAllTxsForYear(year){
  year = String(year);
  const delSet = new Set(Object.keys(DB().deletedTxIds || {}));
  const fromArch = (DB().yearlyArchive?.[year]) || [];
  const fromMain = (DB().txs || []).filter(t => (t.date || '').startsWith(year));
  return [...fromArch, ...fromMain].filter(t => !delSet.has(t.id));
}

/* ───── FIND TX ANYWHERE ───── */
function findTxAnywhere(id){
  if(!id) return null;
  const m = (DB().txs || []).find(t => t.id === id);
  if(m) return { tx: m, location: 'main' };
  
  for(const y in (DB().yearlyArchive || {})){
    const a = DB().yearlyArchive[y] || [];
    const f = a.find(t => t.id === id);
    if(f) return { tx: f, location: 'archive', year: y };
  }
  return null;
}

/* ───── UPDATE TX ANYWHERE ───── */
function updateTxAnywhere(id, updates){
  const found = findTxAnywhere(id);
  if(!found) return false;
  
  if(found.location === 'main'){
    const i = DB().txs.findIndex(x => x.id === id);
    if(i >= 0){
      DB().txs[i] = { ...DB().txs[i], ...updates };
      return true;
    }
  } else {
    const arr = DB().yearlyArchive[found.year] || [];
    const i = arr.findIndex(x => x.id === id);
    if(i >= 0){
      arr[i] = { ...arr[i], ...updates };
      return true;
    }
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════
   🔥 LOGS
   ═══════════════════════════════════════════════════════════ */
function addActivityLog(entry){
  try{
    if(!DB().activityLog) DB().activityLog = [];
    
    const deviceName = getDeviceName();
    let outletName = 'অজানা';
    if(session){
      if(session.role === 'admin'){
        const bf = (typeof currentBranchFilter === 'function') ? currentBranchFilter() : 'all';
        outletName = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || 'অ্যাডমিন');
      } else {
        outletName = BRANCHES[session.branch]?.name || session.branch || 'অজানা';
      }
    }
    
    const log = {
      id: uid(),
      type: entry.type || 'unknown',
      title: entry.title || '',
      detail: entry.detail || '',
      amount: entry.amount || null,
      targetId: entry.targetId || null,
      user: session?.name || 'অজানা',
      username: session?.username || '',
      role: session?.role || 'user',
      branch: outletName,
      device: deviceName,
      location: (window.__geoCache && window.__geoCache.label) || '',
      at: new Date().toISOString()
    };
    
    DB().activityLog.push(log);
    if(DB().activityLog.length > ACTIVITY_LOG_LIMIT){
      DB().activityLog = DB().activityLog.slice(-ACTIVITY_LOG_LIMIT);
    }
    return log;
  } catch(e){ return null; }
}

function getAllActivityLogs(){
  const logs = [...(DB().activityLog || [])];
  logs.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return logs;
}

/* ───── TX EDIT LOG ───── */
function addTxLog(txId, action, changes, txSnapshot){
  try{
    if(!DB().txEditLog) DB().txEditLog = [];
    
    const deviceName = getDeviceName();
    let outletName = 'অজানা';
    if(session){
      if(session.role === 'admin'){
        const bf = (typeof currentBranchFilter === 'function') ? currentBranchFilter() : 'all';
        outletName = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || 'অ্যাডমিন');
      } else {
        outletName = BRANCHES[session.branch]?.name || session.branch || 'অজানা';
      }
    }
    
    const log = {
      id: uid(),
      txId: txId,
      action: action,
      changes: changes || null,
      txSnapshot: txSnapshot ? JSON.parse(JSON.stringify(txSnapshot)) : null,
      user: session?.name || 'অজানা',
      username: session?.username || '',
      role: session?.role || 'user',
      branch: outletName,
      device: deviceName,
      location: (window.__geoCache && window.__geoCache.label) || '',
      at: new Date().toISOString()
    };
    
    DB().txEditLog.push(log);
    if(DB().txEditLog.length > 2000){
      DB().txEditLog = DB().txEditLog.slice(-2000);
    }
    return log;
  } catch(e){ return null; }
}

function computeTxChanges(oldTx, newTx){
  const changes = {};
  const keys = [
    'date','amount','note','type','branch','custBranch',
    'custName','custAcc','custMobile','custAddr','dir','bank',
    'onlineAmount','onlineBankName','cashAmount','cashNotTaken',
    'cashNotTakenAmount','collectionStatus','collectedAmount',
    'cancelled','cancelReason','customerAccountAmount',
    'receivedAmount','changeAmount','netAmount'
  ];
  keys.forEach(k => {
    const oldV = oldTx ? oldTx[k] : undefined;
    const newV = newTx ? newTx[k] : undefined;
    if(JSON.stringify(oldV) !== JSON.stringify(newV)){
      changes[k] = { from: oldV, to: newV };
    }
  });
  return changes;
}

function getTxHistory(txId){
  if(!txId) return [];
  const logs = (DB().txEditLog || []).filter(l => l.txId === txId);
  logs.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return logs;
}

function getAllTxLogs(){
  const logs = [...(DB().txEditLog || [])];
  logs.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return logs;
}

/* ───── DEVICE NAME ───── */
function getDeviceName(){
  try{
    const ua = navigator.userAgent;
    let device = 'অজানা', browser = 'ব্রাউজার', os = 'ওএস';
    
    if(/Windows/i.test(ua)) os = 'উইন্ডোজ';
    else if(/Macintosh|Mac OS X/i.test(ua)) os = 'ম্যাক';
    else if(/Android/i.test(ua)) os = 'অ্যান্ড্রয়েড';
    else if(/iPhone|iPad|iPod/i.test(ua)) os = 'আইওএস';
    else if(/Linux/i.test(ua)) os = 'লিনাক্স';
    
    if(/Edg/i.test(ua)) browser = 'এজ';
    else if(/OPR|Opera/i.test(ua)) browser = 'অপেরা';
    else if(/Chrome/i.test(ua)) browser = 'ক্রোম';
    else if(/Safari/i.test(ua)) browser = 'সাফারি';
    else if(/Firefox/i.test(ua)) browser = 'ফায়ারফক্স';
    
    if(/Mobile|Android.*Mobile|iPhone/i.test(ua)) device = '📱 মোবাইল';
    else if(/Tablet|iPad/i.test(ua)) device = '📱 ট্যাবলেট';
    else device = '💻 ডেস্কটপ';
    
    return device + ' • ' + browser + ' • ' + os;
  } catch(e){ return 'অজানা'; }
}

/* ───── GEO ───── */
async function fetchGeoLocation(){
  const cached = loadGeoCache();
  if(cached){
    window.__geoCache = cached;
    return cached;
  }
  
  const fallback = {
    city: 'Kalaroa',
    region: 'Satkhira',
    country: 'BD',
    label: 'Kalaroa, Satkhira, BD'
  };
  
  if(!navigator.onLine){
    saveGeoCache(fallback);
    window.__geoCache = fallback;
    return fallback;
  }
  
  try{
    const r = await withTimeout(fetch('https://ipapi.co/json/', { cache: 'no-store' }), 6000, null);
    if(r && r.ok){
      const j = await r.json();
      if(j && (j.city || j.region || j.country_code)){
        const d = {
          city: j.city || '',
          region: j.region || '',
          country: j.country_code || '',
          label: [j.city, j.region, j.country_code].filter(Boolean).join(', ') || fallback.label
        };
        saveGeoCache(d);
        window.__geoCache = d;
        return d;
      }
    }
  } catch(e){}
  
  saveGeoCache(fallback);
  window.__geoCache = fallback;
  return fallback;
}

function loadGeoCache(){
  try{
    const raw = safeLS_get(GEO_CACHE_KEY);
    if(!raw) return null;
    const o = JSON.parse(raw);
    if(!o || !o.at) return null;
    if(Date.now() - o.at > 3600000) return null;
    return o.data;
  } catch(e){ return null; }
}

function saveGeoCache(data){
  try{
    safeLS_set(GEO_CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch(e){}
}

async function buildDeviceInfo(){
  let loc = (window.__geoCache && window.__geoCache.label) || '';
  if(!loc){
    try{
      const g = await fetchGeoLocation();
      loc = g.label;
    } catch(e){
      loc = 'Kalaroa, Satkhira, BD';
    }
  }
  return {
    device: getDeviceName(),
    user: session?.name || 'অজানা',
    username: session?.username || '',
    branch: session?.role === 'admin' ? 'অ্যাডমিন' : (BRANCHES[session?.branch]?.name || 'অজানা'),
    role: session?.role || 'user',
    location: loc
  };
}

/* ───── END OF FILE 04-db-core.js ───── */
console.log('✅ DB Core loaded — v7.6 (optimized)');