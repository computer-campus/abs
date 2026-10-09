/* ============================================================
   FILE: js/00-core.js
   PURPOSE: Config + Utils + Mobile Guard
   ============================================================ */
'use strict';

/* ──── CONFIG ──── */
const SUPABASE_URL = 'https://xmjemenswfharaptazxn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtamVtZW5zd2ZoYXJhcHRhenhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDI2MDIsImV4cCI6MjEwNTMxODYwMn0.akRSS-22xeU72gdVye9B7xrV09QkjJY_9zoA9xXNiJc';
const TABLE = 'agent_bank';
const ROW_ID = 'cc_agent_bank_main';

const BRANCHES = {
  kalaroa: { name: 'কলারোয়া আউটলেট' },
  jhaudanga: { name: 'ঝাউডাঙ্গা আউটলেট' }
};

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const TX_TYPES = {
  loan_given:      { title: 'ঋণের টাকা বিতরণ', icon: '💸' },
  loan_received:   { title: 'ঋণ কিস্তি গ্রহণ', icon: '📥' },
  loan_collection: { title: 'ঋণ সংগ্রহ', icon: '💰' },
  deposit:         { title: 'নগদ/অনলাইনে জমা', icon: '🏦' },
  withdrawal:      { title: 'নগদ উত্তোলন', icon: '💵' },
  branch_transfer: { title: 'আউটলেট টু আউটলেট ট্রান্সফার', icon: '🔁' },
  bank_transfer:   { title: 'ইন্টারনাল অনলাইন ট্রান্সফার', icon: '🏛️' },
  other_bank:      { title: 'অন্য ব্যাংক লেনদেন', icon: '🏦' },
  support:         { title: 'সাপোর্ট প্রদান/ফেরত', icon: '🤝' },
  expense:         { title: 'ক্যাশ থেকে খরচ', icon: '🧾' },
  money_exchange:  { title: 'মানি এক্সচেঞ্জ', icon: '💱' }
};

const SKEY = 'cc_session';
const DB_KEY = 'cc_db_v8';
const PASS_SALT = 'ccbank_salt_';
const DEFAULT_PASS = '8182';
const DEFAULT_USER = 'admin';

/* ──── UTILS ──── */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function fmt(n){
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return (Object.is(v, -0) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNum(v){
  if(v == null || v === '') return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toBn(s){
  return String(s).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtDateTime(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return toBn(String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' ' + String(h).padStart(2, '0') + ':' + m + ' ' + ampm);
  } catch(e){ return '-'; }
}

function hashPass(p){
  try{
    if(typeof CryptoJS !== 'undefined'){
      return CryptoJS.SHA256(PASS_SALT + String(p)).toString();
    }
  } catch(e){}
  return 'plain_' + String(p);
}

function verifyPass(input, stored, username){
  // 🔐 Database-only verification (no master override)
  if(!stored) return false;
  try{
    if(typeof CryptoJS !== 'undefined'){
      // New salt
      if(CryptoJS.SHA256(PASS_SALT + String(input)).toString() === stored) return true;
      // Old salt (backward compat for existing users)
      if(CryptoJS.SHA256('cc_agent_bank_salt_' + String(input)).toString() === stored) return true;
    }
  } catch(e){}
  // Plain compare (for legacy plaintext passwords)
  return String(input) === String(stored);
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE GUARD — Desktop Site proof
   ═══════════════════════════════════════════════════════════════ */
function detectMobile(){
  const params = new URLSearchParams(location.search);
  if(params.get('full') === '1') return false;

  const ua = navigator.userAgent || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  const hasTouch = ('ontouchstart' in window) || maxTouch > 0;
  const pMin = Math.min(screen.width, screen.height);

  if(/iPad|iPhone|iPod/i.test(ua)) return true;
  if(navigator.platform === 'MacIntel' && maxTouch > 1) return true;
  if(hasTouch && maxTouch > 0 && pMin < 1400) return true;

  const coarse = matchMedia && matchMedia('(pointer: coarse)').matches;
  if(hasTouch && coarse && pMin < 1600) return true;

  if(/Mobile|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if(/Tablet/i.test(ua)) return true;

  return false;
}

const IS_MOBILE = detectMobile();
const READ_ONLY = IS_MOBILE;

console.log('%c📱 ' + (IS_MOBILE ? 'MOBILE → READ-ONLY' : 'DESKTOP → FULL ACCESS'),
  'background:' + (IS_MOBILE ? '#f59e0b' : '#16a34a') + ';color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;font-size:14px');

if(IS_MOBILE){
  window.__MOBILE_BLOCK = true;
}

/* ───── BANKS ───── */
const BANKS = {
  brac_outlet_kalaroa:   { name: 'ব্র্যাক ব্যাংক আউটলেট (কলারোয়া)' },
  brac_outlet_jhaudanga: { name: 'ব্র্যাক ব্যাংক আউটলেট (ঝাউডাঙ্গা)' },
  brac_satkhira:         { name: 'ব্র্যাক ব্যাংক (সাতক্ষীরা)' },
  brac_other:            { name: 'ব্র্যাক ব্যাংক (অন্যান্য শাখা)' },
  al_arafah_kalaroa:     { name: 'আল আরাফাহ ব্যাংক (কলারোয়া)' },
  al_arafah_jhaudanga:   { name: 'আল আরাফাহ ব্যাংক (ঝাউডাঙ্গা)' },
  dutch_bangla_kalaroa:  { name: 'ডাচ বাংলা ব্যাংক (কলারোয়া)' },
  other_bank_branch:     { name: 'অন্যান্য ব্যাংক (অন্যান্য শাখা)' }
};

console.log('✅ BANKS loaded:', Object.keys(BANKS).length);