/* ============================================================
   FILE: js/13-auto-vault-stock.js — COMPLETE
   PURPOSE: প্রতিটা notes input এ auto vault stock (branch-aware)
   VERSION: v2.0
   ============================================================ */
'use strict';

(function(){
  console.log('🔄 Vault Stock Auto-Watcher v2.0 loading...');

  /* ═══════════════════════════════════════════════════════════
     🎯 Determine branch for a given prefix
     ═══════════════════════════════════════════════════════════ */
  function getBranchForPrefix(modal, prefix){
    if(!modal) return 'kalaroa';

    // Main branch from select
    var mainBranch = 'kalaroa';
    var branchSel = modal.querySelector('#f-branch, #me_branch');
    if(branchSel && branchSel.value){
      mainBranch = branchSel.value;
    } else if(typeof SESSION !== 'undefined' && SESSION){
      if(SESSION.role === 'admin'){
        mainBranch = (typeof VIEW_BRANCH !== 'undefined' && VIEW_BRANCH !== 'all') ? VIEW_BRANCH : 'kalaroa';
      } else {
        mainBranch = SESSION.branch || 'kalaroa';
      }
    }
    if(typeof BRANCHES !== 'undefined' && !BRANCHES[mainBranch]){
      mainBranch = 'kalaroa';
    }

    var oppositeBranch = (mainBranch === 'kalaroa') ? 'jhaudanga' : 'kalaroa';

    // ⚡ Prefix-based mapping
    // in_main / out_main → main branch
    // in_opp  / out_opp  → opposite branch
    // change_out         → main branch
    // out / in / in_main / etc → default
    if(prefix){
      if(prefix.indexOf('_opp') !== -1 || prefix.indexOf('opp_') !== -1){
        return oppositeBranch;
      }
      if(prefix.indexOf('_main') !== -1){
        return mainBranch;
      }
    }

    // Check branch toggle buttons (cust branch)
    var custBranchHidden = modal.querySelector('#f_custBranch_hidden');
    if(custBranchHidden && custBranchHidden.value){
      return custBranchHidden.value;
    }

    // Branch toggle active button (generic tx)
    var activeBtn = modal.querySelector('.branch-toggle-btn.active');
    if(activeBtn && activeBtn.dataset.bbranch){
      return activeBtn.dataset.bbranch;
    }

    // From field (branch transfer)
    var fromSel = modal.querySelector('#f-from');
    if(fromSel && fromSel.value){
      return fromSel.value;
    }

    return mainBranch;
  }

  /* ═══════════════════════════════════════════════════════════
     🔧 Update all stock displays in modal
     ═══════════════════════════════════════════════════════════ */
  function updateAllStocks(modal){
    if(!modal) return;

    var inputs = modal.querySelectorAll('input[data-denom][data-prefix]');
    inputs.forEach(function(inp){
      var denom = inp.dataset.denom;
      var prefix = inp.dataset.prefix;

      // ⚡ Branch for THIS prefix
      var branch = getBranchForPrefix(modal, prefix);
      var vault = (DB && DB.liveVault && DB.liveVault[branch]) || {};

      // Find stock element
      var stockEl = modal.querySelector('#stock_' + prefix + '_' + denom);
      if(!stockEl){
        var parent = inp.closest('.note-item');
        if(parent){
          stockEl = parent.querySelector('div[style*="font-size"]');
          if(!stockEl){
            stockEl = document.createElement('div');
            stockEl.id = 'stock_' + prefix + '_' + denom;
            parent.appendChild(stockEl);
          }
        }
      }
      if(!stockEl) return;

      var avail = Number(vault[denom]) || 0;
      var entered = parseInt(String(inp.value || '').replace(/[^0-9]/g, ''), 10) || 0;
      var exceeded = entered > avail;

      // Stock display
      if(avail <= 0 && entered === 0){
        stockEl.textContent = 'নেই';
        stockEl.style.color = '#7a8ab8';
      } else if(exceeded){
        stockEl.innerHTML = 'আছে ' + toBn(avail) + ' — কম ' + toBn(entered - avail);
        stockEl.style.color = '#facc15';
      } else {
        stockEl.textContent = 'আছে ' + toBn(avail) + ' টি';
        stockEl.style.color = '#4ade80';
      }
      stockEl.style.cssText += ';font-size:12px;font-weight:900;margin-top:5px;text-align:center;letter-spacing:.3px;white-space:nowrap';

      // Input border
      if(exceeded){
        inp.style.borderColor = 'rgba(220,38,38,.9)';
        inp.style.background = 'rgba(220,38,38,.15)';
        inp.style.color = '#f87171';
      } else if(entered > 0){
        inp.style.borderColor = 'rgba(34,197,94,.6)';
        inp.style.background = '';
        inp.style.color = '#4ade80';
      } else {
        inp.style.borderColor = '';
        inp.style.background = '';
        inp.style.color = '#fff';
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     👁️ Watch modal
     ═══════════════════════════════════════════════════════════ */
  var lastModal = null;

  function checkModal(){
    var modal = document.querySelector('.modal-bg');
    if(!modal){ lastModal = null; return; }

    if(lastModal !== modal){
      lastModal = modal;
      setTimeout(function(){ updateAllStocks(modal); }, 100);
      setTimeout(function(){ updateAllStocks(modal); }, 300);
      setTimeout(function(){ updateAllStocks(modal); }, 600);
    }
    updateAllStocks(modal);
  }

  setInterval(checkModal, 300);

  /* ═══════════════════════════════════════════════════════════
     🔄 Input change
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('input', function(e){
    var target = e.target;
    if(!target || target.tagName !== 'INPUT') return;
    if(!target.dataset.denom) return;
    var modal = target.closest('.modal-bg');
    if(modal) updateAllStocks(modal);
  }, true);

  /* ═══════════════════════════════════════════════════════════
     🔄 Select / toggle change
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('change', function(e){
    var target = e.target;
    if(!target) return;
    var modal = target.closest('.modal-bg');
    if(!modal) return;
    setTimeout(function(){ updateAllStocks(modal); }, 100);
  }, true);

  /* ═══════════════════════════════════════════════════════════
     🔄 Toggle buttons (kalaroa/jhaudanga switch)
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function(e){
    var target = e.target;
    if(!target) return;
    if(target.closest('.branch-toggle-btn') || target.closest('.branch-tab-btn')){
      var modal = target.closest('.modal-bg');
      if(modal){
        setTimeout(function(){ updateAllStocks(modal); }, 100);
      }
    }
  }, true);

  /* ═══════════════════════════════════════════════════════════
     🧪 Debug
     ═══════════════════════════════════════════════════════════ */
  window.__checkVaultStock = function(){
    var modal = document.querySelector('.modal-bg');
    if(!modal){ console.log('❌ No modal'); return; }

    var stocks = modal.querySelectorAll('[id^="stock_"]');
    console.log('Stock displays:', stocks.length);
    stocks.forEach(function(el){
      console.log('  ' + el.id + ' → ' + el.textContent);
    });

    // Show branch values
    var inputs = modal.querySelectorAll('input[data-denom][data-prefix]');
    var prefixes = {};
    inputs.forEach(function(inp){
      var p = inp.dataset.prefix;
      if(!prefixes[p]){
        prefixes[p] = getBranchForPrefix(modal, p);
      }
    });
    console.log('');
    console.log('Prefix → Branch mapping:');
    Object.keys(prefixes).forEach(function(p){
      console.log('  ' + p + ' → ' + prefixes[p]);
    });
  };

  console.log('✅ Vault Stock Auto-Watcher v2.0 active');
})();