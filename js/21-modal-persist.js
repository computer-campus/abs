/* ============================================================
   FILE: js/21-modal-persist.js
   PURPOSE: Page refresh করলে last modal + input values restore
   LOAD: after 20-online-only.js, before 99-init.js
   VERSION: v1.0
   ============================================================ */
'use strict';

(function(){
  console.log('💾 Modal Persist v1.0 loading...');

  var STATE_KEY = 'cc_modal_state';
  var MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

  /* ═══════════════════════════════════════════════════════════
     1️⃣ HOOK openTxForm — কোন modal খুলছে track করি
     ═══════════════════════════════════════════════════════════ */
  function hookOpenTxForm(){
    if(typeof window.openTxForm !== 'function'){
      setTimeout(hookOpenTxForm, 200);
      return;
    }
    if(window.__openTxFormHooked) return;
    window.__openTxFormHooked = true;

    var __origOpenTxForm = window.openTxForm;

    window.openTxForm = function(type, editId, prefill){
      // Modal open এর আগে state তৈরি
      if(!window.__currentModalState || window.__currentModalState.type !== type){
        window.__currentModalState = {
          type: type,
          editId: editId || null,
          prefill: prefill || {},
          inputs: {},
          selects: {},
          checked: {},
          at: Date.now()
        };
        persistState();
        console.log('💾 Modal state created:', type);
      }

      return __origOpenTxForm.apply(this, arguments);
    };

    console.log('✅ openTxForm hooked');
  }

  hookOpenTxForm();

  /* ═══════════════════════════════════════════════════════════
     2️⃣ TRACK — যেকোনো input/select change হলে save
     ═══════════════════════════════════════════════════════════ */
  function trackChanges(e){
    if(!window.__currentModalState) return;

    var modal = e.target.closest('.modal-bg');
    if(!modal) return;

    var el = e.target;
    if(!el || !el.id) return;

    if(el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') return;

    if(el.type === 'checkbox' || el.type === 'radio'){
      window.__currentModalState.checked[el.id] = el.checked;
    } else if(el.tagName === 'SELECT'){
      window.__currentModalState.selects[el.id] = el.value;
    } else {
      window.__currentModalState.inputs[el.id] = el.value;
    }

    persistState();
  }

  document.addEventListener('input', trackChanges, true);
  document.addEventListener('change', trackChanges, true);

  /* ═══════════════════════════════════════════════════════════
     3️⃣ DEBOUNCED save to sessionStorage
     ═══════════════════════════════════════════════════════════ */
  var persistTimer = null;
  function persistState(){
    if(persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function(){
      try {
        if(window.__currentModalState){
          sessionStorage.setItem(STATE_KEY, JSON.stringify(window.__currentModalState));
        } else {
          sessionStorage.removeItem(STATE_KEY);
        }
      } catch(e){}
    }, 250);
  }

  /* ═══════════════════════════════════════════════════════════
     4️⃣ Modal close হলে state clear
     ═══════════════════════════════════════════════════════════ */
  function setupModalCloseWatcher(){
    var modalRoot = document.getElementById('modal-root');
    if(!modalRoot){
      setTimeout(setupModalCloseWatcher, 500);
      return;
    }

    var observer = new MutationObserver(function(){
      setTimeout(function(){
        var hasModal = document.querySelector('.modal-bg');
        if(!hasModal && window.__currentModalState){
          console.log('💾 Modal closed — clearing state');
          window.__currentModalState = null;
          try { sessionStorage.removeItem(STATE_KEY); } catch(e){}
        }
      }, 200);
    });

    observer.observe(modalRoot, { childList: true, subtree: true });
  }

  setupModalCloseWatcher();

  /* ═══════════════════════════════════════════════════════════
     5️⃣ PAGE UNLOAD — state force save
     ═══════════════════════════════════════════════════════════ */
  window.addEventListener('beforeunload', function(){
    if(window.__currentModalState){
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(window.__currentModalState));
      } catch(e){}
    }
  });

  /* ═══════════════════════════════════════════════════════════
     6️⃣ APPLY saved values to reopened modal
     ═══════════════════════════════════════════════════════════ */
  function applySavedValues(state, attempt){
    attempt = attempt || 0;
    if(attempt > 8) return;

    var modal = document.querySelector('.modal-bg');
    if(!modal){
      setTimeout(function(){ applySavedValues(state, attempt + 1); }, 300);
      return;
    }

    if(modal.__savedValuesApplied) return;
    modal.__savedValuesApplied = true;

    var applied = 0;

    // ═══ Inputs (text, number, date, time, amount) ═══
    Object.keys(state.inputs || {}).forEach(function(id){
      var el = modal.querySelector('#' + id);
      if(!el) return;
      if(el.type === 'checkbox' || el.type === 'radio') return;

      try {
        el.value = state.inputs[id];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        applied++;
      } catch(e){}
    });

    // ═══ Selects (disabled সহ — value set হবে) ═══
    Object.keys(state.selects || {}).forEach(function(id){
      var el = modal.querySelector('#' + id);
      if(!el) return;

      try {
        el.value = state.selects[id];
        el.dispatchEvent(new Event('change', { bubbles: true }));
        applied++;
      } catch(e){}
    });

    // ═══ Checkboxes / Radios ═══
    Object.keys(state.checked || {}).forEach(function(id){
      var el = modal.querySelector('#' + id);
      if(!el) return;

      try {
        el.checked = state.checked[id];
        el.dispatchEvent(new Event('change', { bubbles: true }));
        applied++;
      } catch(e){}
    });

    console.log('💾 Modal values restored:', applied, 'fields');

    // ═══ Extra recalc trigger (denomination input) ═══
    setTimeout(function(){
      var firstDenom = modal.querySelector('input[data-denom]');
      if(firstDenom){
        firstDenom.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Also trigger change on select elements
      modal.querySelectorAll('select').forEach(function(s){
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, 150);
  }

  /* ═══════════════════════════════════════════════════════════
     7️⃣ RESTORE — page load এর পর login হলে modal reopen
     ═══════════════════════════════════════════════════════════ */
  var restoreDone = false;
  var restoring = false;

  function tryRestore(){
    if(restoreDone || restoring) return;
    if(!window.SESSION) return;
    if(!window.DB) return;
    if(document.querySelector('.modal-bg')) return;

    var raw;
    try { raw = sessionStorage.getItem(STATE_KEY); } catch(e){ return; }
    if(!raw){
      restoreDone = true;
      return;
    }

    var state;
    try { state = JSON.parse(raw); } catch(e){
      restoreDone = true;
      sessionStorage.removeItem(STATE_KEY);
      return;
    }

    if(!state || !state.type){
      restoreDone = true;
      sessionStorage.removeItem(STATE_KEY);
      return;
    }

    // ═══ Age check ═══
    if(Date.now() - (state.at || 0) > MAX_AGE_MS){
      console.log('💾 State too old — skipped');
      restoreDone = true;
      sessionStorage.removeItem(STATE_KEY);
      return;
    }

    // ═══ Must have some data ═══
    var hasData =
      Object.keys(state.inputs || {}).length > 0 ||
      Object.keys(state.selects || {}).length > 0 ||
      Object.keys(state.checked || {}).length > 0;

    if(!hasData){
      console.log('💾 State empty — skipped');
      restoreDone = true;
      sessionStorage.removeItem(STATE_KEY);
      return;
    }

    restoreDone = true;
    restoring = true;
    console.log('💾 Restoring modal:', state.type, '— data:', {
      inputs: Object.keys(state.inputs || {}).length,
      selects: Object.keys(state.selects || {}).length
    });

    // ⚡ Set state আগে (trackChanges যেন ঠিক কাজ করে)
    window.__currentModalState = state;

    // ⚡ Reopen modal
    if(typeof window.openTxForm === 'function'){
      try {
        window.openTxForm(state.type, state.editId, state.prefill);
      } catch(e){
        console.warn('Modal reopen error:', e);
      }

      // Multiple apply attempts (modal mount timing)
      setTimeout(function(){ applySavedValues(state, 0); }, 400);
      setTimeout(function(){ applySavedValues(state, 0); }, 900);
      setTimeout(function(){ applySavedValues(state, 0); }, 1600);
      setTimeout(function(){ applySavedValues(state, 0); }, 2400);

      // Toast notification
      if(typeof toast === 'function'){
        setTimeout(function(){
          toast('🔄 আগের form restore হয়েছে', 'ok');
        }, 900);
      }
    }

    setTimeout(function(){ restoring = false; }, 3000);
  }

  /* ═══════════════════════════════════════════════════════════
     8️⃣ POLL for restore opportunity
     ═══════════════════════════════════════════════════════════ */
  var attempts = 0;
  var MAX_ATTEMPTS = 120; // 60 seconds

  var interval = setInterval(function(){
    attempts++;
    if(restoreDone || attempts > MAX_ATTEMPTS){
      clearInterval(interval);
      return;
    }
    tryRestore();
  }, 500);

  // Trigger after 2s directly (init timing safe)
  setTimeout(tryRestore, 2000);
  setTimeout(tryRestore, 4000);

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__modalStateInfo = function(){
    var raw = null;
    try { raw = sessionStorage.getItem(STATE_KEY); } catch(e){}
    console.log('═══════════════════════════════════');
    console.log('💾 MODAL STATE INFO');
    console.log('═══════════════════════════════════');
    console.log('Current:', window.__currentModalState);
    console.log('Saved:', raw ? JSON.parse(raw) : null);
    console.log('Restore done:', restoreDone);
    console.log('═══════════════════════════════════');
  };

  window.__clearModalState = function(){
    window.__currentModalState = null;
    try { sessionStorage.removeItem(STATE_KEY); } catch(e){}
    console.log('💾 Modal state cleared');
  };

  console.log('✅ Modal Persist ready — refresh করলে form ফিরে আসবে');

})();