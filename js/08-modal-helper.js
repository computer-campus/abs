/* ============================================================
   FILE: 08-modal-helper.js
   PURPOSE: Modal system + Denom inputs + Menu handlers
   VERSION: v7.6 — PERFORMANCE OPTIMIZED
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 MODAL SYSTEM
   ═══════════════════════════════════════════════════════════ */
function openModal({ title, bodyHTML, wide = false, xwide = false, onMount }){
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  const cls = xwide ? 'xwide' : (wide ? 'wide' : '');
  
  wrap.innerHTML =
    '<div class="modal ' + cls + '">' +
      '<div class="modal-head">' +
        '<h3>' + title + '</h3>' +
        '<button class="x" type="button">✕</button>' +
      '</div>' +
      '<div class="modal-body">' + bodyHTML + '</div>' +
    '</div>';
  
  document.getElementById('modalRoot').appendChild(wrap);
  
  const close = () => wrap.remove();
  wrap.querySelector('.x').addEventListener('click', close);
  
  if(onMount) onMount(wrap, close);
  
  const innerModal = wrap.querySelector('.modal');
  if(innerModal && innerModal.__reloadCustomerPopup){
    wrap.__reloadCustomerPopup = innerModal.__reloadCustomerPopup;
  }
  
  return { wrap, close };
}

/* ═══════════════════════════════════════════════════════════
   🔥 DISABLE AUTOFILL — OPTIMIZED (no readonly trick)
   ═══════════════════════════════════════════════════════════ */
function disableAutofill(scope){
  scope = scope || document;
  const loginScreen = document.getElementById('loginScreen');
  
  // ⚡ Only target new inputs (skip marked ones, dates, checkboxes)
  scope.querySelectorAll(
    'input:not([data-af]):not([type="checkbox"]):not([type="radio"]):not([type="date"]):not([type="hidden"]), textarea:not([data-af])'
  ).forEach(el => {
    if(loginScreen && loginScreen.contains(el)) return;
    if(el.dataset.af) return;
    
    // ⚡ Only attributes — no readonly, no focus listener
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'none');
    el.setAttribute('spellcheck', 'false');
    el.dataset.af = '1';
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 DENOMINATION INPUTS
   ═══════════════════════════════════════════════════════════ */
function readNotes(scope, prefix){
  const o = {};
  scope.querySelectorAll('[id^="' + prefix + '_"]').forEach(inp => {
    const raw = String(inp.value || '').trim();
    if(raw === '') return;
    const v = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if(!isNaN(v) && v > 0) o[inp.dataset.denom] = v;
  });
  return o;
}

function noteSum(o){
  let s = 0;
  if(!o) return 0;
  for(const k in o) s += (Number(o[k]) || 0) * Number(k);
  return s;
}

function noteDetailHTML(notes){
  const keys = Object.keys(notes || {}).filter(k => notes[k] > 0).sort((a, b) => b - a);
  if(!keys.length) return '—';
  return keys.map(k =>
    '<span style="display:inline-block;padding:4px 10px;margin:3px 5px 3px 0;border-radius:8px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-size:12.5px;font-weight:600">' +
    '৳' + toBn(k) + ' × ' + toBn(notes[k]) + ' = ৳' + fmt(Number(k) * Number(notes[k])) +
    '</span>'
  ).join('');
}

function noteListInline(notes){
  const keys = Object.keys(notes || {}).filter(k => notes[k] > 0).sort((a, b) => b - a);
  if(!keys.length) return '';
  return keys.map(k => '<span>৳' + toBn(k) + '×' + toBn(notes[k]) + '</span>').join(' ');
}

function notesRowHTML(prefix, values, vault){
  values = values || {};
  vault = vault || {};
  
  return '<div class="notes-row">' + DENOMS.map(d => {
    const hasValue = values[d] !== undefined && values[d] !== null && Number(values[d]) > 0;
    const val = hasValue ? values[d] : '';
    const avail = Number(vault[d]) || 0;
    const availColor = avail > 0 ? '#4ade80' : '#7a8ab8';
    const availLabel = avail > 0 ? 'আছে ' + toBn(avail) + ' টি' : 'নেই';
    
    return '<div class="note-item" data-denom-box="' + prefix + '_' + d + '">' +
      '<label>৳ ' + toBn(d) + '</label>' +
      '<input type="text" inputmode="numeric" autocomplete="off" maxlength="5" ' +
        'id="' + prefix + '_' + d + '" data-denom="' + d + '" data-prefix="' + prefix + '" ' +
        'value="' + val + '">' +
      '<div class="vault-stock" id="stock_' + prefix + '_' + d + '" ' +
        'style="font-size:10px;color:' + availColor + ';font-weight:800;margin-top:4px;' +
        'text-align:center;letter-spacing:.3px;white-space:nowrap">' + availLabel + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function updateVaultStock(scope, prefix, branchKey){
  if(!scope) return;
  const vault = DB()?.liveVault?.[branchKey] || {};
  
  DENOMS.forEach(d => {
    const inp = scope.querySelector('#' + prefix + '_' + d);
    const stockEl = scope.querySelector('#stock_' + prefix + '_' + d);
    const box = scope.querySelector('[data-denom-box="' + prefix + '_' + d + '"]');
    if(!inp || !stockEl) return;
    
    const avail = Number(vault[d]) || 0;
    const entered = parseInt(String(inp.value || '').replace(/[^0-9]/g, ''), 10) || 0;
    const exceeded = entered > avail;
    
    if(avail <= 0 && entered === 0){
      stockEl.textContent = 'নেই';
      stockEl.style.color = '#7a8ab8';
    } else if(exceeded){
      stockEl.innerHTML = 'আছে ' + toBn(avail) + ' — <span style="color:#f87171;font-weight:900">কম ' + toBn(entered - avail) + '</span>';
      stockEl.style.color = '#facc15';
    } else {
      stockEl.textContent = 'আছে ' + toBn(avail) + ' টি';
      stockEl.style.color = '#4ade80';
    }
    
    if(exceeded){
      inp.style.borderColor = 'rgba(220,38,38,.9)';
      inp.style.background = 'rgba(220,38,38,.15)';
      inp.style.color = '#f87171';
      inp.style.boxShadow = '0 0 0 3px rgba(220,38,38,.2)';
      if(box){
        box.style.animation = 'shake .3s ease-in-out';
        setTimeout(() => { box.style.animation = ''; }, 320);
      }
    } else if(entered > 0){
      inp.style.borderColor = 'rgba(34,197,94,.6)';
      inp.style.background = '';
      inp.style.color = '#4ade80';
      inp.style.boxShadow = '';
    } else {
      inp.style.borderColor = '';
      inp.style.background = '';
      inp.style.color = '#fff';
      inp.style.boxShadow = '';
    }
  });
}

function __setupDenomInputs(wrap, prefix, branchFn, onInput){
  wrap.querySelectorAll('[id^="' + prefix + '_"]').forEach(inp => {
    if(!inp.dataset.denom) return;
    if(inp.__denomSetup) return;
    inp.__denomSetup = true;
    
    inp.setAttribute('inputmode', 'numeric');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('maxlength', '5');
    
    inp.addEventListener('input', (e) => {
      let v = String(e.target.value || '').replace(/[^0-9]/g, '');
      if(v.length > 5) v = v.slice(0, 5);
      if(e.target.value !== v) e.target.value = v;
      
      const bk = typeof branchFn === 'function' ? branchFn() : branchFn;
      updateVaultStock(wrap, prefix, bk);
      if(typeof onInput === 'function') onInput();
    });
    
    inp.addEventListener('keydown', (e) => {
      const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End','Enter','Escape'];
      if(allowed.includes(e.key)) return;
      if(e.ctrlKey || e.metaKey) return;
      if(!/^[0-9]$/.test(e.key)) e.preventDefault();
    });
    
    inp.addEventListener('paste', (e) => {
      e.preventDefault();
      const txt = (e.clipboardData || window.clipboardData).getData('text');
      let v = String(txt).replace(/[^0-9]/g, '').slice(0, 5);
      e.target.value = v;
      e.target.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 MENU HANDLER — Logout INSTANT, others with spinner
   ═══════════════════════════════════════════════════════════ */
function attachSidebarClickHandler(){
  const box = document.getElementById('sidebarBody') || document.getElementById('menuBody');
  if(!box) return;
  if(box.__delegated) return;
  box.__delegated = true;
  
  box.addEventListener('click', function(e){
    const btn = e.target.closest('[data-sb]');
    if(!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const action = btn.dataset.sb;
    if(!action) return;
    
    // ⚡⚡ LOGOUT — Instant, no spinner
    if(action === 'logout'){
      closeSidebar();
      if(typeof logout === 'function') logout();
      return;
    }
    
    // ⚡ For OTHER actions — show spinner
    const loading = document.createElement('div');
    loading.id = 'menuLoading';
    loading.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:linear-gradient(145deg,#0f1428,#06091a);border:2px solid #3b82f6;border-radius:20px;padding:22px 36px;color:#fff;font-weight:900;font-size:14px;box-shadow:0 24px 60px rgba(0,0,0,.95),0 0 40px rgba(59,130,246,.4);display:flex;align-items:center;gap:12px;pointer-events:none';
    loading.innerHTML = '<span style="width:22px;height:22px;border:3px solid rgba(59,130,246,.3);border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite"></span> লোড হচ্ছে...';
    document.body.appendChild(loading);
    
    closeSidebar();
    
    // ⚡ Defer heavy work to next frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        try{
          switch(action){
            case 'all-data':
              if(typeof openAllData === 'function') openAllData();
              break;
            case 'due-list':
              if(typeof openDueListModal === 'function') openDueListModal();
              break;
            case 'all-pending':
              if(typeof openAllPendingModal === 'function') openAllPendingModal();
              break;
            case 'print-dashboard':
              if(typeof printDashboardSnapshot === 'function') printDashboardSnapshot();
              break;
            case 'audit-log':
              if(typeof openAuditLogModal === 'function') openAuditLogModal();
              break;
            case 'db-browser':
              if(typeof openDatabaseBrowser === 'function') openDatabaseBrowser();
              break;
            case 'branch-mgmt':
              if(typeof openBranchManagement === 'function') openBranchManagement();
              break;
            case 'user-mgr':
              if(typeof openUserManager === 'function') openUserManager();
              break;
            case 'backup':
              if(typeof openBackupModal === 'function') openBackupModal();
              break;
            case 'year-archive':
              if(typeof openYearArchive === 'function') openYearArchive();
              break;
            case 'snapshot-settings':
              if(typeof openSnapshotSettings === 'function') openSnapshotSettings();
              break;
            case 'notif-settings':
              if(typeof openNotifSettings === 'function') openNotifSettings();
              break;
            default:
              toast('❌ Unknown: ' + action);
          }
        } catch(err){
          console.error('Menu action error:', err);
          toast('❌ ' + err.message);
        }
        
        // ⚡ Remove spinner
        const el = document.getElementById('menuLoading');
        if(el) el.remove();
      }, 20);
    });
  });
}

function openSidebar(){
  const sideEl = document.getElementById('sidebar');
  const menuEl = document.getElementById('mainMenu');
  const sideOv = document.getElementById('sidebarOverlay');
  const menuOv = document.getElementById('menuOverlay');
  
  if(sideEl) sideEl.classList.add('open');
  if(menuEl) menuEl.classList.add('open');
  if(sideOv) sideOv.classList.add('active');
  if(menuOv) menuOv.classList.add('active');
  
  setTimeout(() => {
    try{ attachSidebarClickHandler(); } catch(e){}
  }, 30);
}

function closeSidebar(){
  const sideEl = document.getElementById('sidebar');
  const menuEl = document.getElementById('mainMenu');
  const sideOv = document.getElementById('sidebarOverlay');
  const menuOv = document.getElementById('menuOverlay');
  
  if(sideEl) sideEl.classList.remove('open');
  if(menuEl) menuEl.classList.remove('open');
  if(sideOv) sideOv.classList.remove('active');
  if(menuOv) menuOv.classList.remove('active');
}

/* ═══════════════════════════════════════════════════════════
   🔥 CUSTOMER CLICK DELEGATION
   ═══════════════════════════════════════════════════════════ */
function attachTxHistoryCustomerClick(scope){
  if(!scope) return;
  try{
    if(scope.__custDelegateAttached) return;
    scope.__custDelegateAttached = true;
    
    scope.addEventListener('click', function(e){
      if(e.target.closest('button')) return;
      const tr = e.target.closest('tr.clickable-row[data-cust-acc]');
      if(!tr) return;
      
      const acc = tr.dataset.custAcc;
      const name = tr.dataset.custName;
      
      if(acc && typeof openCustomerDetailPopup === 'function'){
        openCustomerDetailPopup(acc, name);
      }
    });
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   🔥 DIR INFO (Cached)
   ═══════════════════════════════════════════════════════════ */
const __dirInfoCache = {};

function getDirInfo(t){
  if(!t || !t.type) return { icon: '📌', label: '', badge: '' };
  
  const cacheKey = t.type + '|' + (t.dir || '') + '|' +
    (t.accepted ? 'A' : 'P') + '|' + (t.cancelled ? 'C' : 'N');
  
  if(__dirInfoCache[cacheKey]) return __dirInfoCache[cacheKey];
  
  const cfg = TX_CFG[t.type] || { title: t.type, icon: '📌' };
  let result;
  
  if(t.type === 'support'){
    if(t.dir === 'out'){
      result = { icon: '🤝', label: 'সাপোর্ট', badge: '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.5);color:#93c5fd;font-size:10.5px;font-weight:800">💸 প্রদান</span>' };
    } else if(t.dir === 'in'){
      result = { icon: '🤝', label: 'সাপোর্ট', badge: '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-size:10.5px;font-weight:800">↩️ ফেরত</span>' };
    } else if(t.dir === 'online_support_out'){
      result = { icon: '🤝', label: 'সাপোর্ট', badge: '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(167,139,250,.2);border:1px solid rgba(167,139,250,.5);color:#c084fc;font-size:10.5px;font-weight:800">🌐 অনলাইন প্রদান</span>' };
    } else if(t.dir === 'online_support_in'){
      result = { icon: '🤝', label: 'সাপোর্ট', badge: '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(6,182,212,.2);border:1px solid rgba(6,182,212,.5);color:#22d3ee;font-size:10.5px;font-weight:800">🌐 অনলাইন ফেরত</span>' };
    } else {
      result = { icon: '🤝', label: 'সাপোর্ট', badge: '' };
    }
  }
  else if(t.type === 'loan_given'){
    result = { icon: cfg.icon, label: cfg.title, badge: '' };
  }
  else if(t.type === 'branch_transfer'){
    result = {
      icon: cfg.icon,
      label: cfg.title,
      badge: '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(167,139,250,.2);border:1px solid rgba(167,139,250,.5);color:#c084fc;font-size:10.5px;font-weight:800">' + (t.accepted ? '✅ গৃহীত' : '⏳ অপেক্ষমাণ') + '</span>'
    };
  }
  else {
    result = { icon: cfg.icon, label: cfg.title, badge: '' };
  }
  
  __dirInfoCache[cacheKey] = result;
  return result;
}

/* ═══════════════════════════════════════════════════════════
   🔥 BRANCH / BANK / DIR OPTIONS
   ═══════════════════════════════════════════════════════════ */
function branchOpts(sel){
  return Object.entries(BRANCHES).map(([k, v]) =>
    '<option value="' + k + '" ' + (k === sel ? 'selected' : '') + '>' + v.name + '</option>'
  ).join('');
}

function bankOpts(sel){
  return Object.entries(BANKS).map(([k, v]) =>
    '<option value="' + k + '" ' + (k === sel ? 'selected' : '') + '>' + v.name + '</option>'
  ).join('');
}

function dirOptions(type, cur){
  if(type === 'bank_transfer'){
    return '<option value="in" ' + (cur === 'in' ? 'selected' : '') + '>📥 আসা</option>' +
      '<option value="out" ' + (cur === 'out' ? 'selected' : '') + '>📤 পাঠানো</option>';
  }
  if(type === 'other_bank'){
    return '<option value="in" ' + (cur === 'in' ? 'selected' : '') + '>📥 ফিজিক্যাল আসা</option>' +
      '<option value="online_in" ' + (cur === 'online_in' ? 'selected' : '') + '>💳 অনলাইন আসা</option>' +
      '<option value="out" ' + (cur === 'out' ? 'selected' : '') + '>📤 ফিজিক্যাল পাঠানো</option>' +
      '<option value="online_out" ' + (cur === 'online_out' ? 'selected' : '') + '>💳 অনলাইন পাঠানো</option>';
  }
  if(type === 'support'){
    return '<option value="out" ' + (cur === 'out' ? 'selected' : '') + '>প্রদান</option>' +
      '<option value="in" ' + (cur === 'in' ? 'selected' : '') + '>ফেরত</option>' +
      '<option value="online_support_out" ' + (cur === 'online_support_out' ? 'selected' : '') + '>🌐 অনলাইন প্রদান</option>' +
      '<option value="online_support_in" ' + (cur === 'online_support_in' ? 'selected' : '') + '>🌐 অনলাইন ফেরত</option>';
  }
  return '<option value="in" ' + (cur === 'in' ? 'selected' : '') + '>গ্রহণ</option>' +
    '<option value="out" ' + (cur === 'out' ? 'selected' : '') + '>পাঠানো</option>';
}

/* ═══════════════════════════════════════════════════════════
   🔥 CONSOLE TOOLS
   ═══════════════════════════════════════════════════════════ */
window.ccStatus = function(){
  const s = {
    __isRemoteReady,
    hasClient: !!__supabaseClient,
    hasActivityChannel: !!__activityChannel,
    __activityChannelReady,
    queue: __activityQueue.length,
    online: navigator.onLine,
    hasSyncedOnce: window.__hasSyncedOnce,
    session: session ? { id: session.id, name: session.name, role: session.role } : null,
    txCount: (DB()?.txs || []).length
  };
  console.log('📊 Status:', s);
  return s;
};

window.ccTestBroadcast = function(type){
  broadcastActivity({
    type: type === 'login' ? 'login' : type === 'txn' ? 'txn_create' : 'info',
    txTitle: 'পরীক্ষামূলক',
    amount: 100,
    txId: 'test_' + Date.now()
  });
  console.log('✅ Broadcast sent:', type);
};

window.ccForceReconnect = function(){
  __activityChannelReady = false;
  if(__activityChannel){
    try{ __activityChannel.unsubscribe(); } catch(e){}
    try{ __supabaseClient.removeChannel(__activityChannel); } catch(e){}
    __activityChannel = null;
  }
  setupActivityChannel();
};

window.ccDebugActivity = function(){
  console.log('=== ACTIVITY DEBUG ===');
  console.log('Client:', !!__supabaseClient);
  console.log('Channel:', !!__activityChannel);
  console.log('Ready:', __activityChannelReady);
  console.log('Queue:', __activityQueue.length);
  console.log('Session:', session?.id, '-', session?.name);
  console.log('Notification.permission:', typeof Notification !== 'undefined' ? Notification.permission : 'N/A');
  console.log('Online:', navigator.onLine);
  console.log('======================');
};

window.ccCheckSidebar = function(){
  const fns = ['openAllData','openDueListModal','openAllPendingModal','printDashboardSnapshot','openAuditLogModal','openDatabaseBrowser','openBranchManagement','openUserManager','openBackupModal','openYearArchive','openSnapshotSettings','openNotifSettings','logout'];
  console.log('=== SIDEBAR FUNCTION CHECK ===');
  fns.forEach(fn => console.log(fn + ':', typeof window[fn]));
  console.log('=== SIDEBAR DOM CHECK ===');
  const sb = document.getElementById('sidebarBody') || document.getElementById('menuBody');
  console.log('sidebarBody/menuBody exists:', !!sb);
  console.log('handler attached:', sb?.__delegated);
  console.log('buttons count:', document.querySelectorAll('[data-sb]').length);
};

/* ───── END OF FILE 08-modal-helper.js ───── */
console.log('✅ Modal Helper loaded — v7.6');