/* ============================================================
   FILE: 02-utils.js
   PURPOSE: Utility functions (format, escape, date, etc.)
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ───── DOM SELECTOR ───── */
const $ = s => document.querySelector(s);

/* ───── UNIQUE ID ───── */
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);

/* ───── NUMBER FORMAT (with 2 decimals) ───── */
const fmt = n => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const safe = Object.is(v, -0) ? 0 : v;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/* ───── TODAY STRING (YYYY-MM-DD) ───── */
const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
};

/* ───── HTML ESCAPE ───── */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

/* ───── TO BANGLA NUMERALS ───── */
const toBn = s => String(s).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

/* ───── PARSE NUMBER (safe) ───── */
function parseNum(val){
  if(val == null) return 0;
  const n = Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/* ───── FORMAT DATE TIME ───── */
function fmtDateTime(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if(h === 0) h = 12;
    return toBn(String(d.getDate()).padStart(2, '0')) + '/' +
      toBn(String(d.getMonth() + 1).padStart(2, '0')) + '/' +
      toBn(d.getFullYear()) + ' ' +
      toBn(String(h).padStart(2, '0')) + ':' + toBn(m) + ':' + toBn(s) + ' ' + ampm;
  } catch(e){ return '-'; }
}

/* ───── FORMAT TIME ONLY ───── */
function fmtTimeOnly(iso){
  if(!iso) return '-';
  try{
    const d = new Date(iso);
    if(isNaN(d.getTime())) return '-';
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if(h === 0) h = 12;
    return toBn(String(h).padStart(2, '0')) + ':' + toBn(m) + ':' + toBn(s) + ' ' + ampm;
  } catch(e){ return '-'; }
}

/* ───── PROMISE WITH TIMEOUT ───── */
async function withTimeout(promise, ms, fallback){
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

/* ───── SAFE LOCALSTORAGE ───── */
function safeLS_set(key, value){
  try{
    localStorage.setItem(key, value);
    return { ok: true };
  } catch(e){
    return { ok: false };
  }
}

function safeLS_get(k){
  try{ return localStorage.getItem(k); }
  catch(e){ return null; }
}

/* ───── CLOCK ───── */
let __clockTimer = null;
function startClock(){
  if(__clockTimer) clearInterval(__clockTimer);
  function tick(){
    const el = document.getElementById('liveClock');
    if(!el) return;
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if(h === 0) h = 12;
    el.textContent = toBn(String(h).padStart(2, '0')) + ':' + toBn(m) + ':' + toBn(s) + ' ' + ampm;
  }
  tick();
  __clockTimer = setInterval(tick, 1000);
}

/* ═══════════════════════════════════════════════════════════
   🔥 TOAST — Stackable + Auto-cleanup (v8.4)
   ═══════════════════════════════════════════════════════════ */
function toast(msg){
  // Create or get container
  let container = document.getElementById('toastContainer');
  if(!container){
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column-reverse;gap:8px;align-items:center;pointer-events:none;max-width:calc(100% - 32px)';
    document.body.appendChild(container);
  }
  
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'background:#fff;color:#000;' +
    'padding:13px 24px;' +
    'border-radius:14px;' +
    'font-weight:800;' +
    'font-size:14px;' +
    'box-shadow:0 16px 40px rgba(0,0,0,.8);' +
    'opacity:0;' +
    'transform:translateY(20px);' +
    'transition:all .3s cubic-bezier(.2,1,.3,1);' +
    'white-space:pre-line;' +
    'text-align:center;' +
    'max-width:100%;' +
    'word-break:break-word;' +
    'pointer-events:auto;' +
    'cursor:pointer;' +
    'user-select:none;';
  
  container.appendChild(el);
  
  // ⚡ Fade in (double rAF for reliability)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
  
  // ⚡ Removal function
  let removed = false;
  const removeToast = () => {
    if(removed) return;
    removed = true;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      el.remove();
      if(container.children.length === 0){
        container.remove();
      }
    }, 320);
  };
  
  // ⚡ Auto-remove after 2.5s
  const timer = setTimeout(removeToast, 2500);
  
  // ⚡ Click to dismiss
  el.addEventListener('click', () => {
    clearTimeout(timer);
    removeToast();
  });
  
  // ⚡ Safety: force remove after 5s
  setTimeout(() => {
    if(el.parentNode){
      el.remove();
      if(container.children.length === 0) container.remove();
    }
  }, 5000);
  
  // ⚡ Max 5 toasts visible
  while(container.children.length > 5){
    container.firstChild.remove();
  }
}

/* ───── TODAY / YESTERDAY HELPERS ───── */
function dateOffset(days){
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* ───── END OF FILE 02-utils.js ───── */
console.log('✅ Utils loaded');