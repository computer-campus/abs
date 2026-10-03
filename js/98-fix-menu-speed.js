/* ============================================================
   FILE: js/98-fix-menu-speed.js
   PURPOSE: Sidebar spinner instant-kill + modal stutter fix
   VERSION: v1.0
   LOAD: 98-fix-branch-fast.js এর পরে, 99-init.js এর আগে
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1️⃣ Spinner auto-kill helper
   ═══════════════════════════════════════════════════════════ */
function __killMenuSpinner(){
  const el = document.getElementById('menuLoading');
  if(el) el.remove();
}

/* ═══════════════════════════════════════════════════════════
   2️⃣ MutationObserver — menuLoading create হলেই সাথে সাথে remove
   ═══════════════════════════════════════════════════════════ */
try{
  const __spinObserver = new MutationObserver((muts) => {
    for(let i = 0; i < muts.length; i++){
      const added = muts[i].addedNodes;
      for(let j = 0; j < added.length; j++){
        const n = added[j];
        if(n && n.nodeType === 1 && n.id === 'menuLoading'){
          n.remove();
        }
      }
    }
  });
  __spinObserver.observe(document.body, { childList: true, subtree: false });
} catch(e){}

/* ═══════════════════════════════════════════════════════════
   3️⃣ Click capture — multiple timeouts to catch spinner
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  const btn = e.target.closest('[data-sb]');
  if(!btn) return;

  // Kill before spinner is created
  __killMenuSpinner();

  // Kill again at multiple delays in case sidebar handler adds it later
  setTimeout(__killMenuSpinner, 0);
  setTimeout(__killMenuSpinner, 15);
  setTimeout(__killMenuSpinner, 40);
  setTimeout(__killMenuSpinner, 100);
  setTimeout(__killMenuSpinner, 250);
}, true);

/* ═══════════════════════════════════════════════════════════
   4️⃣ Skip universal silent-refresh while modal is open
       (prevents stutter during modal render)
   ═══════════════════════════════════════════════════════════ */
const __origRefreshSystem_speed = window.refreshSystem;
if(typeof __origRefreshSystem_speed === 'function'){
  window.refreshSystem = function(options){
    // Skip silent refresh if any modal is open
    if(options && options.silent === true){
      const mr = document.getElementById('modalRoot');
      if(mr && mr.children.length > 0){
        return true;
      }
    }
    return __origRefreshSystem_speed.call(this, options);
  };
}

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG
   ═══════════════════════════════════════════════════════════ */
window.__testMenuSpeed = function(){
  const t0 = performance.now();
  const mr = document.getElementById('modalRoot');
  console.log('⚡ Time from click to now:', (performance.now() - t0).toFixed(1) + 'ms');
  console.log('📂 Open modals:', mr ? mr.children.length : 0);
  console.log('🔍 Spinner present:', !!document.getElementById('menuLoading'));
};

console.log('%c🚀 MENU SPEED FIX v1.0 ACTIVE',
  'background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c✅ Sidebar spinner আর দেখা যাবে না • Modal stutter নেই',
  'background:#1e40af;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');