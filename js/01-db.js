/* ============================================================
   FILE: js/01-db.js
   PURPOSE: DB State + Storage + Cloud Sync + Tombstones
   ============================================================ */
'use strict';

let DB = null;
let SESSION = null;
let VIEW_BRANCH = 'all';
let DASH_DATE = todayStr();
let SUPA = null;
let PUSHING = false;
let HAS_SYNCED = false;
let RECENT_TX = new Set();

/* ──── DEFAULT DB ──── */
function defaultDB(){
  const v = {}, a = {}, c = {};
  Object.keys(BRANCHES).forEach(b => {
    v[b] = {};
    DENOMS.forEach(d => v[b][d] = 0);
    a[b] = { bank: 0, cash: 0, other: 0 };
    c[b] = 0;
  });
  return {
    __v: 8,
    __updated: new Date().toISOString(),
    users: [],   // ⚡ কোনো default admin নেই — cloud থেকে আসবে
    customers: [],
    txs: [],
    activity: [],
    baseVault: JSON.parse(JSON.stringify(v)),
    baseAccounts: JSON.parse(JSON.stringify(a)),
    branchCapital: JSON.parse(JSON.stringify(c)),
    totalCapital: 0,
    liveVault: JSON.parse(JSON.stringify(v)),
    liveAccounts: JSON.parse(JSON.stringify(a)),
    deletedTxIds: {},
    deletedCustomerIds: {},
    deletedCustomerAccounts: {},
    deletedUserIds: {},
    deletedUsernames: {}
  };
}

function normalizeDB(){
  if(!DB) return;
  if(!DB.users) DB.users = [];
  if(!DB.customers) DB.customers = [];
  if(!DB.txs) DB.txs = [];
  if(!DB.activity) DB.activity = [];
  if(!DB.baseVault) DB.baseVault = {};
  if(!DB.baseAccounts) DB.baseAccounts = {};
  if(!DB.liveVault) DB.liveVault = {};
  if(!DB.liveAccounts) DB.liveAccounts = {};
  if(!DB.branchCapital) DB.branchCapital = {};
  if(!DB.deletedTxIds) DB.deletedTxIds = {};
  if(!DB.deletedCustomerIds) DB.deletedCustomerIds = {};
  if(!DB.deletedCustomerAccounts) DB.deletedCustomerAccounts = {};
  if(!DB.deletedUserIds) DB.deletedUserIds = {};
  if(!DB.deletedUsernames) DB.deletedUsernames = {};

  Object.keys(BRANCHES).forEach(b => {
    if(!DB.baseVault[b]){ DB.baseVault[b] = {}; DENOMS.forEach(d => DB.baseVault[b][d] = 0); }
    if(!DB.liveVault[b]){ DB.liveVault[b] = {}; DENOMS.forEach(d => DB.liveVault[b][d] = 0); }
    DENOMS.forEach(d => {
      DB.baseVault[b][d] = Number(DB.baseVault[b][d]) || 0;
      DB.liveVault[b][d] = Number(DB.liveVault[b][d]) || 0;
    });
    if(!DB.baseAccounts[b]) DB.baseAccounts[b] = { bank: 0, cash: 0, other: 0 };
    if(!DB.liveAccounts[b]) DB.liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
    ['bank','cash','other'].forEach(k => {
      DB.baseAccounts[b][k] = Number(DB.baseAccounts[b][k]) || 0;
      DB.liveAccounts[b][k] = Number(DB.liveAccounts[b][k]) || 0;
    });
    if(typeof DB.branchCapital[b] !== 'number') DB.branchCapital[b] = 0;
  });

  DB.totalCapital = Object.values(DB.branchCapital).reduce((s, v) => s + (Number(v) || 0), 0);
}

/* ──── STORAGE ──── */
function saveLocal(){
  if(READ_ONLY) return;
  try{
    const clean = {
      __v: DB.__v,
      __updated: DB.__updated,
      users: DB.users,
      customers: DB.customers,
      txs: DB.txs.slice(-500),
      activity: DB.activity.slice(-300),
      baseVault: DB.baseVault,
      baseAccounts: DB.baseAccounts,
      branchCapital: DB.branchCapital,
      totalCapital: DB.totalCapital,
      liveVault: DB.liveVault,
      liveAccounts: DB.liveAccounts,
      deletedTxIds: DB.deletedTxIds,
      deletedCustomerIds: DB.deletedCustomerIds,
      deletedCustomerAccounts: DB.deletedCustomerAccounts,
      deletedUserIds: DB.deletedUserIds,
      deletedUsernames: DB.deletedUsernames
    };
    localStorage.setItem(DB_KEY, JSON.stringify(clean));
  } catch(e){ console.warn('saveLocal', e); }
}

function loadLocal(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}

/* ──── CLOUD ──── */
function initSupa(){
  try{
    if(!window.supabase){
      console.log('⏳ Supabase library loading...');
      setTimeout(initSupa, 500);
      return;
    }
    if(!SUPABASE_URL || !SUPABASE_KEY){
      console.warn('⚠️ Supabase credentials missing');
      return;
    }

    SUPA = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false }
    });

    // ⚡ Global এ expose (notifications module এর জন্য)
    window.SUPA = SUPA;

    console.log('✅ Supabase connected');

    // ⚡ Notifications channel শুরু করো
    if(typeof setupActivityChannel === 'function'){
      setTimeout(function(){
        try {
          setupActivityChannel();
        } catch(e){
          console.warn('Channel setup error:', e);
        }
      }, 800);
    }

  } catch(e){
    console.error('❌ Supa init error:', e);
    setTimeout(initSupa, 2000);
  }
}

async function pullCloud(){
  if(!SUPA || !navigator.onLine) return false;
  try{
    const res = await SUPA.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
    if(res.error) throw res.error;
    if(!res.data || !res.data.data){
      console.warn('⚠️ Cloud এ কোনো data নেই');
      return false;
    }
    DB = mergeCloudLocal(res.data.data, DB);
    normalizeDB();
    recomputeLive();
    saveLocal();
    HAS_SYNCED = true;
    console.log('☁️ Pulled. Users:', DB.users.length, '| Txs:', DB.txs.length);
    return true;
  } catch(e){
    console.warn('Pull', e);
    return false;
  }
}

async function pushCloud(){
  if(READ_ONLY) return false;
  if(!SUPA || !navigator.onLine) return false;
  if(PUSHING) return false;

  PUSHING = true;
  try {
    // ⚡ Step 1: Fetch cloud (to merge txs)
    const res = await SUPA.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
    const cloud = res.data && res.data.data ? res.data.data : null;

    // ⚡ Step 2: Merge cloud + local (txs, customers, users only)
    if(cloud){
      DB = mergeCloudLocal(cloud, DB);
      normalizeDB();
    }

    // ⚡ Step 3: ALWAYS recompute live from base + txs (ignore old live values)
    recomputeLive();

    // ⚡ Step 4: Update timestamp
    DB.__updated = new Date().toISOString();

    // ⚡ Step 5: Push — but strip live values (they're derived, will be recomputed on pull)
    const toPush = JSON.parse(JSON.stringify(DB));

    // Base + tx are source of truth; live values are just for display
    // But we keep them for offline-first — they'll be recomputed after merge anyway

    const payload = {
      id: ROW_ID,
      data: toPush,
      updated_at: new Date().toISOString()
    };

    const up = await SUPA.from(TABLE).upsert(payload, { onConflict: 'id' });
    if(up.error) throw up.error;

    saveLocal();
    console.log('☁️ Pushed. Txs:', DB.txs.length);
    return true;
  } catch(e){
    console.warn('Push error:', e);
    return false;
  } finally {
    PUSHING = false;
  }
}

/* ──── MERGE (tombstones respected) ──── */
function mergeCloudLocal(cloud, local){
  if(!cloud) return local || defaultDB();
  if(!local) return cloud;
  const out = JSON.parse(JSON.stringify(cloud));

  const dTx = { ...(cloud.deletedTxIds || {}), ...(local.deletedTxIds || {}) };
  const dCustId = { ...(cloud.deletedCustomerIds || {}), ...(local.deletedCustomerIds || {}) };
  const dCustAcc = { ...(cloud.deletedCustomerAccounts || {}), ...(local.deletedCustomerAccounts || {}) };
  const dUserId = { ...(cloud.deletedUserIds || {}), ...(local.deletedUserIds || {}) };
  const dUserNames = {};
  [...Object.keys(cloud.deletedUsernames || {}), ...Object.keys(local.deletedUsernames || {})]
    .forEach(u => dUserNames[u.toLowerCase()] = true);

  // txs
  const txMap = new Map();
  [...(cloud.txs || []), ...(local.txs || [])].forEach(t => {
    if(!t || !t.id || dTx[t.id]) return;
    const ex = txMap.get(t.id);
    if(!ex) txMap.set(t.id, t);
    else {
      const oTs = Date.parse(ex.updatedAt || ex.createdAt || 0) || 0;
      const nTs = Date.parse(t.updatedAt || t.createdAt || 0) || 0;
      if(nTs > oTs) txMap.set(t.id, t);
    }
  });
  out.txs = Array.from(txMap.values());

  // customers
  const custMap = new Map();
  [...(cloud.customers || []), ...(local.customers || [])].forEach(c => {
    if(!c) return;
    if(c.id && dCustId[c.id]) return;
    if(c.accountNo && dCustAcc[c.accountNo]) return;
    const k = c.accountNo || c.id;
    if(!k) return;
    if(!custMap.has(k)) custMap.set(k, c);
    else {
      const ex = custMap.get(k);
      const oTs = Date.parse(ex.updatedAt || ex.createdAt || 0) || 0;
      const nTs = Date.parse(c.updatedAt || c.createdAt || 0) || 0;
      if(nTs > oTs) custMap.set(k, c);
    }
  });
  out.customers = Array.from(custMap.values());

  // users
  const userMap = new Map();
  [...(cloud.users || []), ...(local.users || [])].forEach(u => {
    if(!u) return;
    if(u.id && dUserId[u.id]) return;
    if(u.username && dUserNames[String(u.username).toLowerCase()]) return;
    const k = String(u.username || u.id).toLowerCase();
    if(!userMap.has(k)) userMap.set(k, u);
  });
 
  out.users = Array.from(userMap.values());

  // activity
  const actMap = new Map();
  [...(cloud.activity || []), ...(local.activity || [])].forEach(a => {
    if(a && a.id) actMap.set(a.id, a);
  });
  out.activity = Array.from(actMap.values())
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''))
    .slice(-300);

  // base data (local wins if newer)
  const cloudTs = Date.parse(cloud.__updated || 0) || 0;
  const localTs = Date.parse(local.__updated || 0) || 0;
  if(localTs > cloudTs){
    out.baseVault = JSON.parse(JSON.stringify(local.baseVault || cloud.baseVault));
    out.baseAccounts = JSON.parse(JSON.stringify(local.baseAccounts || cloud.baseAccounts));
    out.branchCapital = JSON.parse(JSON.stringify(local.branchCapital || cloud.branchCapital));
    out.totalCapital = local.totalCapital;
  }

  out.deletedTxIds = dTx;
  out.deletedCustomerIds = dCustId;
  out.deletedCustomerAccounts = dCustAcc;
  out.deletedUserIds = dUserId;
  out.deletedUsernames = dUserNames;

  // ⚡ CRITICAL: liveAccounts/liveVault সবসময় local রাখো
  // এগুলো derived — base + txs থেকে হিসাব হবে
  if(local){
    out.liveAccounts = JSON.parse(JSON.stringify(local.liveAccounts || {}));
    out.liveVault = JSON.parse(JSON.stringify(local.liveVault || {}));
  } else {
    // local নেই → base থেকে নতুন করে বানাও
    out.liveAccounts = {};
    out.liveVault = {};
    Object.keys(BRANCHES).forEach(function(b){
      out.liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
      out.liveVault[b] = {};
      DENOMS.forEach(function(d){ out.liveVault[b][d] = 0; });
    });
  }

  out.__updated = new Date(Math.max(cloudTs, localTs)).toISOString();
  return out;
}

/* ──── LOG ──── */
function logActivity(type, title, detail, amount){
  if(!DB) return;
  if(!DB.activity) DB.activity = [];
  DB.activity.push({
    id: uid(),
    type, title, detail,
    amount: amount || null,
    user: SESSION ? SESSION.name : '—',
    username: SESSION ? SESSION.username : '',
    role: SESSION ? SESSION.role : '',
    at: new Date().toISOString()
  });
  if(DB.activity.length > 300) DB.activity = DB.activity.slice(-300);

  // ⚡ Broadcast to other devices
  if(typeof broadcastActivity === 'function'){
    try {
      broadcastActivity({
        type: type,
        detail: detail || '',
        amount: amount || null
      });
      console.log('📡 Broadcast sent:', type, '|', detail);
    } catch(e){
      console.warn('Broadcast error:', e);
    }
  } else {
    console.log('⚠️ broadcastActivity not ready yet');
  }
}