/* ============================================================
   FILE: js/98-fix-branch-fast.js
   PURPOSE: Outlet Management fast load + no toast
   VERSION: v1.0
   LOAD: 98-fix-delete-and-history.js এর পরে
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1️⃣ Spinner তৎক্ষণাৎ সরাও (branch-mgmt ক্লিক করলে)
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-sb="branch-mgmt"]');
  if(!btn) return;

  // Capture phase-এ click ধরা পড়ে, তারপর setTimeOut দিয়ে
  // spinner তৈরি হওয়ার সাথে সাথেই সরিয়ে ফেলি
  setTimeout(() => {
    const spin = document.getElementById('menuLoading');
    if(spin) spin.remove();
  }, 0);

  // আরেকবার (rAF + 20ms delay এর জন্য safety)
  setTimeout(() => {
    const spin = document.getElementById('menuLoading');
    if(spin) spin.remove();
  }, 30);
}, true);

/* ═══════════════════════════════════════════════════════════
   2️⃣ Branch Management toasts বন্ধ করো
   ═══════════════════════════════════════════════════════════ */
const __origToast_branchfix = window.toast;

window.toast = function(msg){
  if(typeof msg === 'string'){
    // Save toast — "✅ সেভ — ৳ X"
    if(msg.indexOf('✅ সেভ — ৳') === 0) return;
    // Reset toast — "🔄 রিসেট"
    if(msg.trim() === '🔄 রিসেট') return;
  }
  return __origToast_branchfix.apply(this, arguments);
};

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG
   ═══════════════════════════════════════════════════════════ */
console.log('%c🚀 BRANCH FAST-FIX ACTIVE',
  'background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c✅ Outlet Management দ্রুত খুলবে • কোনো toast আসবে না',
  'background:#1e40af;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');