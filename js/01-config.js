/* ============================================================
   FILE: 01-config.js
   PURPOSE: All constants, config, and app settings
   VERSION: v7.6
   ============================================================ */

'use strict';

/* ───── SECURITY SHIELD ───── */
(function securityShield(){
  const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === '1';
  
  document.addEventListener('contextmenu', e => { e.preventDefault(); return false; }, true);
  
  if(!DEBUG_MODE){
    document.addEventListener('keydown', function(e){
      const k = (e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey;
      if(k === 'f12'){ e.preventDefault(); return false; }
      if(ctrl && shift && ['i','j','c','k'].includes(k)){ e.preventDefault(); return false; }
      if(ctrl && ['u','s'].includes(k)){ e.preventDefault(); return false; }
    }, true);
  }
  
  document.addEventListener('dragstart', e => e.preventDefault());
})();

/* ───── SUPABASE CONFIG ───── */
window.SUPABASE_URL = 'https://xmjemenswfharaptazxn.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtamVtZW5zd2ZoYXJhcHRhenhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDI2MDIsImV4cCI6MjEwNTMxODYwMn0.akRSS-22xeU72gdVye9B7xrV09QkjJY_9zoA9xXNiJc';
window.SUPABASE_TABLE = 'agent_bank';
window.SUPABASE_ROW_ID = 'cc_agent_bank_main';
window.APP_VERSION = 'ccbank-stable';

/* ───── BRANCHES ───── */
const BRANCHES = {
  kalaroa: { name: 'কলারোয়া আউটলেট' },
  jhaudanga: { name: 'ঝাউডাঙ্গা আউটলেট' }
};

/* ───── BANKS ───── */
const BANKS = {
  brac_outlet_kalaroa: { name: 'ব্র্যাক আউটলেট (কলারোয়া)' },
  brac_outlet_jhaudanga: { name: 'ব্র্যাক আউটলেট (ঝাউডাঙ্গা)' },
  brac_satkhira: { name: 'ব্র্যাক (সাতক্ষীরা)' },
  brac_dhaka: { name: 'ব্র্যাক (ঢাকা)' },
  al_arafah_kalaroa: { name: 'আল আরাফাহ (কলারোয়া)' },
  al_arafah_jhaudanga: { name: 'আল আরাফাহ (ঝাউডাঙ্গা)' },
  dutch_bangla_kalaroa: { name: 'ডাচ বাংলা (কলারোয়া)' },
  other_bank: { name: 'অন্যান্য ব্যাংক' }
};

/* ───── DENOMINATIONS ───── */
const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

/* ───── STORAGE KEYS ───── */
const SKEY = 'cc_agent_bank_session';
const LOCAL_DB_KEY = 'cc_agent_bank_local';
const NET_QUEUE_KEY = 'cc_net_queue';
const NOTIF_PREF_KEY = 'cc_notif_prefs';
const GEO_CACHE_KEY = 'cc_geo_cache';
const SNAPSHOT_SETTINGS_KEY = 'cc_snapshot_settings_v1';
const SNAPSHOT_LAST_SENT_KEY = 'cc_snapshot_last_sent_v1';

/* ───── DEFAULT SETTINGS ───── */
const DEFAULT_SNAPSHOT_EMAIL = 'skjahangirkabir@gmail.com';
const DEFAULT_SNAPSHOT_TIME = '23:30';
const SUPABASE_TIMEOUT_MS = 12000;
const LS_TX_LIMIT = 500;
const PASS_SALT = 'cc_agent_bank_salt_';
const ARCHIVE_YEARS_AFTER = 2;
const MASTER_KEY = 'cc_agent_bank_master_x9k7m2p4q8';
const AUTO_PUSH_DELAY_MS = 1500;
const ACTIVITY_LOG_LIMIT = 500;
const ACTIVITY_QUEUE_MAX = 30;

/* ───── ADMIN KEY (Encoded) ───── */
const _AK_BYTES = [56, 49, 56, 50]; // "8182"
function _akDecode(){
  try{ return String.fromCharCode.apply(null, _AK_BYTES); }
  catch(e){ return ''; }
}
function _akVerify(p){
  try{ return String(p) === _akDecode(); }
  catch(e){ return false; }
}

/* ───── TRANSACTION CONFIG ───── */
const TX_CFG = {
  loan_given: {
    title: 'ঋণের টাকা বিতরণ',
    icon: '💸',
    primary: 'out',
    cust: true
  },
  loan_collection: {
    title: 'ঋণ ক্যাশ সংগ্রহ',
    icon: '💵',
    primary: 'out',
    cust: false
  },
  loan_received: {
    title: 'ঋণের টাকা গ্রহণ',
    icon: '📥',
    primary: 'in',
    cust: true
  },
  deposit: {
    title: 'জমা',
    icon: '🏦',
    primary: 'in',
    cust: true
  },
  withdrawal: {
    title: 'উত্তোলন',
    icon: '💵',
    primary: 'out',
    cust: true
  },
  branch_transfer: {
    title: 'আউটলেট-থেকে-আউটলেট',
    icon: '🔁',
    primary: 'out',
    cust: false
  },
  bank_transfer: {
    title: 'ইন্টারনাল অনলাইন ট্রান্সফার',
    icon: '🏛️',
    primary: 'out',
    cust: false,
    dir: true,
    bankOnly: true
  },
  expense: {
    title: 'ক্যাশ থেকে খরচ',
    icon: '🧾',
    primary: 'out',
    cust: false
  },
  other_bank: {
    title: 'অন্য ব্যাঙ্কে লেনদেন',
    icon: '🏦',
    primary: 'in',
    cust: false,
    dir: true,
    banks: true,
    online: true
  },
  support: {
    title: 'সাপোর্ট',
    icon: '🤝',
    primary: 'out',
    cust: true,
    dir: true,
    onlineSupport: true
  },
  money_exchange: {
    title: 'মানি এক্সচেঞ্জ',
    icon: '💱',
    primary: 'out',
    cust: false
  },
  customer: {
    title: 'গ্রাহক তালিকা',
    icon: '👥',
    primary: 'in',
    cust: false
  }
};

/* ───── BACKUP SETTINGS ───── */
const BACKUP_DB_NAME = 'cc_agent_bank_backups';
const BACKUP_STORE = 'backups';
const BACKUP_DB_VERSION = 1;
const AUTO_BACKUP_MAX = 30;
const AUTO_BACKUP_KEY = 'cc_last_auto_backup_date';

/* ───── END OF FILE 01-config.js ───── */
console.log('✅ Config loaded — v7.6');