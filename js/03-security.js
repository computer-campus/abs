/* ============================================================
   FILE: 03-security.js
   PURPOSE: Password hashing, crypto, permissions
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ───── PASSWORD HASHING ───── */
function hashPassword(p){
  try{
    if(typeof CryptoJS !== 'undefined'){
      return CryptoJS.SHA256(PASS_SALT + String(p)).toString();
    }
  } catch(e){}
  // Fallback (should not be used normally)
  let h = 0;
  const s = PASS_SALT + String(p);
  for(let i = 0; i < s.length; i++){
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'fb_' + Math.abs(h).toString(36) + '_' + s.length;
}

/* ───── VERIFY PASSWORD ───── */
function verifyPassword(p, stored){
  if(!stored) return false;
  if(!/^[a-f0-9]{64}$/.test(stored) && !stored.startsWith('fb_')){
    return String(p) === String(stored);
  }
  return hashPassword(p) === stored;
}

/* ───── DEFAULT ADMIN HASH ───── */
const _AK_DEFAULT_HASH = hashPassword(_akDecode());

/* ───── AES ENCRYPT ───── */
function encryptPlain(text){
  try{
    if(!text) return '';
    return CryptoJS.AES.encrypt(String(text), MASTER_KEY).toString();
  } catch(e){ return ''; }
}

/* ───── AES DECRYPT ───── */
function decryptPlain(cipher){
  try{
    if(!cipher) return '';
    const b = CryptoJS.AES.decrypt(cipher, MASTER_KEY);
    return b.toString(CryptoJS.enc.Utf8) || '';
  } catch(e){ return ''; }
}

/* ───── GET PLAIN PASSWORD (for admin display) ───── */
function getPlainPassword(u){
  if(!u) return '';
  if(u.encryptedPassword){
    const p = decryptPlain(u.encryptedPassword);
    if(p) return p;
  }
  if(u.plainPassword) return u.plainPassword;
  return '';
}

/* ───── PERMISSIONS ───── */
function isAdmin(){
  return session && session.role === 'admin';
}

function canEditTx(tx){
  if(!session) return false;
  return true; // সবাই সব edit করতে পারবে
}

function canDeleteTx(tx){
  return isAdmin();
}

function canAcceptTransfer(tx){
  if(!session || !tx) return false;
  if(isAdmin()) return true;
  return session.branch === tx.to;
}

function canCancelTransfer(tx){
  if(!session || !tx) return false;
  if(isAdmin()) return true;
  return session.branch === tx.from;
}

function requireAdmin(actionName){
  if(!isAdmin()){
    toast('🔒 শুধু অ্যাডমিন ' + (actionName || 'এই কাজ') + ' করতে পারবে');
    return false;
  }
  return true;
}

function sorryNoNote(){
  alert('🙏 দুঃখিত!\n\nসব ঘর খালি আছে।');
}

/* ───── NEGATIVE BALANCE CHECK ───── */
function checkNegativeBalance(branchKey){
  if(!branchKey) return { ok: true };
  const live = DB().liveAccounts?.[branchKey] || { bank: 0, cash: 0, other: 0 };
  const issues = [];
  if(Number(live.bank) < 0) issues.push({ field: 'মাদার অ্যাকাউন্ট', amount: Number(live.bank) });
  if(Number(live.cash) < 0) issues.push({ field: 'ক্যাশ ইন হ্যান্ড', amount: Number(live.cash) });
  if(Number(live.other) < 0) issues.push({ field: 'অন্যান্য ব্যাংকে জমা', amount: Number(live.other) });
  
  if(issues.length > 0){
    const branchName = BRANCHES[branchKey]?.name || branchKey;
    const details = issues.map(i => '  • ' + i.field + ': ৳ ' + fmt(i.amount)).join('\n');
    alert('🚫 ব্যালেন্স নেগেটিভ!\n\n🏦 ' + branchName + '\n\n' + details +
      '\n\n⚠️ এই আউটলেটে পর্যাপ্ত টাকা নেই।\n📌 আগে মাদার অ্যাকাউন্টে বা ভল্টে টাকা যোগ করুন।\n\n⛔ যতক্ষণ পর্যন্ত না টাকা যোগ হচ্ছে, কোনো লেনদেন হবে না।');
    return { ok: false, issues };
  }
  return { ok: true };
}

/* ───── AMOUNT INPUT ATTACHMENT ───── */
function attachAmountInput(inputEl, opts){
  opts = opts || {};
  if(!inputEl || inputEl.__smartAttached) return;
  inputEl.__smartAttached = true;
  
  const allowDecimal = opts.decimal !== false;
  const maxDecimals = opts.maxDecimals != null ? opts.maxDecimals : 2;
  
  // Keydown filter
  inputEl.addEventListener('keydown', (e) => {
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter','Escape'];
    if(allowed.includes(e.key)) return;
    if(e.ctrlKey || e.metaKey) return;
    if(e.key === '.'){ if(!allowDecimal) e.preventDefault(); return; }
    if(!/^[0-9]$/.test(e.key)) e.preventDefault();
  });
  
  // Paste handler
  inputEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    let clean = String(txt).replace(/[^0-9.]/g, '');
    if(!allowDecimal) clean = clean.replace(/\./g, '');
    const parts = clean.split('.');
    if(parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
    inputEl.value = clean;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  });
  
  // Input formatter
  inputEl.addEventListener('input', () => {
    let raw = inputEl.value.replace(/[^0-9.]/g, '');
    if(!allowDecimal) raw = raw.replace(/\./g, '');
    const parts = raw.split('.');
    if(parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    if(!raw){ inputEl.value = ''; return; }
    if(raw.includes('.')){
      const [ip, dp] = raw.split('.');
      inputEl.value = (ip ? Number(ip).toLocaleString('en-US') : '0') + '.' + dp.slice(0, maxDecimals);
    } else {
      inputEl.value = raw ? Number(raw).toLocaleString('en-US') : '';
    }
  });
  
  // Select on focus
  inputEl.addEventListener('focus', () => {
    setTimeout(() => inputEl.select(), 50);
  });
}

/* ───── ENTER KEY NAVIGATION ───── */
function setupEnterNavigation(){
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter') return;
    const el = e.target;
    if(!el || !(el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
    if(el.type === 'checkbox' || el.type === 'radio') return;
    
    const container = el.closest('.modal-body') || document.body;
    const focusables = Array.from(container.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ));
    const idx = focusables.indexOf(el);
    
    if(idx >= 0 && idx < focusables.length - 1){
      e.preventDefault();
      focusables[idx + 1].focus();
      if(focusables[idx + 1].select){
        setTimeout(() => focusables[idx + 1].select(), 30);
      }
    }
  }, true);
}

/* ───── END OF FILE 03-security.js ───── */
console.log('✅ Security loaded');