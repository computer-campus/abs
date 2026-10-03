/* ============================================================
   FILE: 03-security.js
   PURPOSE: Password, crypto, permissions, bank validation
   VERSION: v11.6
   ============================================================ */

'use strict';

/* ───── PASSWORD ───── */
function hashPassword(p){
  try{
    if(typeof CryptoJS !== 'undefined'){
      return CryptoJS.SHA256(PASS_SALT + String(p)).toString();
    }
  } catch(e){}
  let h = 0;
  const s = PASS_SALT + String(p);
  for(let i = 0; i < s.length; i++){
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'fb_' + Math.abs(h).toString(36) + '_' + s.length;
}

function verifyPassword(p, stored){
  if(!stored) return false;
  if(!/^[a-f0-9]{64}$/.test(stored) && !stored.startsWith('fb_')){
    return String(p) === String(stored);
  }
  return hashPassword(p) === stored;
}

const _AK_DEFAULT_HASH = hashPassword(_akDecode());

function encryptPlain(text){
  try{
    if(!text) return '';
    return CryptoJS.AES.encrypt(String(text), MASTER_KEY).toString();
  } catch(e){ return ''; }
}

function decryptPlain(cipher){
  try{
    if(!cipher) return '';
    const b = CryptoJS.AES.decrypt(cipher, MASTER_KEY);
    return b.toString(CryptoJS.enc.Utf8) || '';
  } catch(e){ return ''; }
}

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
function isAdmin(){ return session && session.role === 'admin'; }
function canEditTx(tx){ if(!session) return false; return true; }
function canDeleteTx(tx){ return isAdmin(); }
function canAcceptTransfer(tx){ if(!session || !tx) return false; if(isAdmin()) return true; return session.branch === tx.to; }
function canCancelTransfer(tx){ if(!session || !tx) return false; if(isAdmin()) return true; return session.branch === tx.from; }
function requireAdmin(actionName){ if(!isAdmin()){ toast('🔒 শুধু অ্যাডমিন ' + (actionName || 'এই কাজ') + ' করতে পারবে'); return false; } return true; }
function sorryNoNote(){ alert('🙏 দুঃখিত!\n\nসব ঘর খালি আছে।'); }

/* ───── NEGATIVE CHECK (existing live values) ───── */
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
      '\n\n⚠️ এই আউটলেটে পর্যাপ্ত টাকা নেই।\n📌 আগে মাদার অ্যাকাউন্টে বা ভল্টে টাকা যোগ করুন।');
    return { ok: false, issues };
  }
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════
   💰 BANK VALIDATION — Prevent Negative
   ═══════════════════════════════════════════════════════════ */

function calculateTxBankDelta(tx){
  if(!tx || !tx.type) return 0;
  const amt = Number(tx.amount) || 0;
  
  switch(tx.type){
    case 'loan_given': {
      const A = Number(tx.amount) || 0;
      const B = Number(tx.onlineAmount) || 0;
      const C = Number(tx.cashAmount) || 0;
      const D = Number(tx.cashNotTakenAmount);
      return isNaN(D) || D === null ? Math.max(0, A - B - C) : D;
    }
    
    case 'loan_received': {
      const withdrawal = Number(tx.withdrawalAmount) || 0;
      const loanKisti = Number(tx.loanKistiAmount) || 0;
      const online = Number(tx.onlineAmount) || 0;
      let totalCashKisti = 0;
      
      if(tx.branchSplits && Array.isArray(tx.branchSplits)){
        tx.branchSplits.forEach(s => {
          const splitType = s.type || 'kisti';
          if(splitType === 'kisti' && s.notesIn){
            Object.keys(s.notesIn).forEach(d => {
              totalCashKisti += Number(d) * Number(s.notesIn[d] || 0);
            });
          }
        });
      } else if(tx.notesIn){
        Object.keys(tx.notesIn).forEach(d => {
          totalCashKisti += Number(d) * Number(tx.notesIn[d] || 0);
        });
      }
      
      return withdrawal - loanKisti - online - totalCashKisti;
    }
    
    case 'withdrawal': return amt;
    case 'deposit': return -amt;
    case 'expense': return 0;
    case 'branch_transfer': return 0;
    case 'bank_transfer': return 0;
    
    case 'other_bank':
      if(tx.dir === 'online_in') return amt;
      if(tx.dir === 'online_out') return -amt;
      if(tx.dir === 'in') return amt;
      if(tx.dir === 'out') return -amt;
      return 0;
    
    case 'support':
      if(tx.dir === 'online_support_out') return -amt;
      if(tx.dir === 'online_support_in') return amt;
      return 0;
    
    case 'money_exchange': return 0;
    
    case 'loan_collection':
      if(tx.collectionMode === 'online') return -amt;
      return 0;
    
    default: return 0;
  }
}

function validateBankBalance(tx){
  if(!tx) return { ok: true };
  const delta = calculateTxBankDelta(tx);
  if(delta >= 0) return { ok: true };
  
  const branchKey = tx.branch || 'kalaroa';
  const currentBank = Number(DB()?.liveAccounts?.[branchKey]?.bank) || 0;
  const projected = currentBank + delta;
  
  if(projected < -0.01){
    return {
      ok: false,
      current: currentBank,
      delta: delta,
      projected: projected,
      short: Math.abs(projected),
      branch: branchKey
    };
  }
  return { ok: true, projected: projected };
}

function blockNegativeBank(check, tx){
  const branchName = BRANCHES[check.branch]?.name || check.branch;
  const txTitle = TX_CFG[tx?.type]?.title || tx?.type || 'লেনদেন';
  
  alert(
    '🚫 মাদার অ্যাকাউন্ট Negative হবে!\n\n' +
    '═══════════════════════════════\n' +
    '📌 লেনদেন: ' + txTitle + '\n' +
    '🏦 আউটলেট: ' + branchName + '\n' +
    '═══════════════════════════════\n' +
    '💰 বর্তমান ব্যালেন্স: ৳ ' + fmt(check.current) + '\n' +
    '📉 এই লেনদেনে কমবে: ৳ ' + fmt(Math.abs(check.delta)) + '\n' +
    '💸 প্রয়োজন হবে: ৳ ' + fmt(check.short) + ' বেশি\n' +
    '═══════════════════════════════\n' +
    '⚠️ পর্যাপ্ত টাকা না থাকায় ' +
    'এই লেনদেন সংরক্ষণ করা যাবে না।\n\n' +
    '💡 আগে মাদার অ্যাকাউন্টে টাকা যোগ করুন।'
  );
  return false;
}

/* ───── AMOUNT INPUT ───── */
function attachAmountInput(inputEl, opts){
  opts = opts || {};
  if(!inputEl || inputEl.__smartAttached) return;
  inputEl.__smartAttached = true;
  
  const allowDecimal = opts.decimal !== false;
  const maxDecimals = opts.maxDecimals != null ? opts.maxDecimals : 2;
  
  inputEl.addEventListener('keydown', (e) => {
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter','Escape'];
    if(allowed.includes(e.key)) return;
    if(e.ctrlKey || e.metaKey) return;
    if(e.key === '.'){ if(!allowDecimal) e.preventDefault(); return; }
    if(!/^[0-9]$/.test(e.key)) e.preventDefault();
  });
  
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
  
  inputEl.addEventListener('focus', () => {
    setTimeout(() => inputEl.select(), 50);
  });
}

/* ───── ENTER NAV ───── */
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

console.log('✅ Security loaded — v11.6 (with bank validation)');