/* ============================================================
   FILE: 07-notifications.js
   PURPOSE: Sound, Vibration, Toast, Browser notifications
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ───── SETTINGS ───── */
let __audioCtx = null;
let __soundEnabled = true;
let __vibrationEnabled = true;
let __notifHistory = [];

/* ───── LOAD / SAVE PREFS ───── */
function loadNotifPrefs(){
  try{
    const p = safeLS_get(NOTIF_PREF_KEY);
    if(p){
      const o = JSON.parse(p);
      __soundEnabled = o.sound !== false;
      __vibrationEnabled = o.vibration !== false;
    }
  } catch(e){}
}

function saveNotifPrefs(){
  try{
    safeLS_set(NOTIF_PREF_KEY, JSON.stringify({
      sound: __soundEnabled,
      vibration: __vibrationEnabled
    }));
  } catch(e){}
}

/* ───── PLAY NOTIFICATION SOUND ───── */
function playNotifSound(type){
  if(!__soundEnabled) return;
  
  try{
    if(!__audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      __audioCtx = new AC();
    }
    if(__audioCtx.state === 'suspended'){
      __audioCtx.resume();
    }
    
    const patterns = {
      success: [
        { f: 880, d: .10, t: 0 },
        { f: 1100, d: .14, t: .11 },
        { f: 1320, d: .22, t: .26 }
      ],
      danger: [
        { f: 520, d: .16, t: 0 },
        { f: 420, d: .16, t: .18 },
        { f: 520, d: .22, t: .36 }
      ],
      warning: [
        { f: 720, d: .13, t: 0 },
        { f: 720, d: .13, t: .18 }
      ],
      info: [
        { f: 620, d: .10, t: 0 },
        { f: 820, d: .16, t: .12 }
      ],
      transfer: [
        { f: 660, d: .10, t: 0 },
        { f: 880, d: .10, t: .11 },
        { f: 1100, d: .20, t: .22 }
      ]
    };
    
    const notes = patterns[type] || patterns.info;
    
    notes.forEach(n => {
      const osc = __audioCtx.createOscillator();
      const gain = __audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      
      gain.gain.setValueAtTime(0, __audioCtx.currentTime + n.t);
      gain.gain.linearRampToValueAtTime(0.28, __audioCtx.currentTime + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, __audioCtx.currentTime + n.t + n.d);
      
      osc.connect(gain);
      gain.connect(__audioCtx.destination);
      
      osc.start(__audioCtx.currentTime + n.t);
      osc.stop(__audioCtx.currentTime + n.t + n.d + 0.02);
    });
  } catch(e){}
}

/* ───── VIBRATE ───── */
function vibrateNotif(type){
  if(!__vibrationEnabled || !navigator.vibrate) return;
  
  try{
    const patterns = {
      success: [80, 40, 120],
      danger: [200, 80, 200, 80, 200],
      warning: [140, 60, 140],
      info: [60, 40, 80],
      transfer: [100, 50, 100, 50, 150]
    };
    navigator.vibrate(patterns[type] || patterns.info);
  } catch(e){}
}

/* ───── NETWORK TYPE ───── */
function getNetworkType(){
  try{
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!conn) return 'unknown';
    
    const t = (conn.type || '').toLowerCase();
    if(t) return t;
    
    const et = conn.effectiveType || '';
    if(et === '4g' || et === '5g') return 'fast';
    if(et === '3g') return 'medium';
    if(et === '2g' || et === 'slow-2g') return 'slow';
    return 'unknown';
  } catch(e){ return 'unknown'; }
}

/* ───── SHOW NOTIF TOAST ───── */
function showNotifToast(opts){
  try{
    const type = opts.type || 'info';
    const duration = opts.duration || 8000;
    
    let container = document.getElementById('notifContainer');
    if(!container){
      container = document.createElement('div');
      container.id = 'notifContainer';
      container.className = 'notif-container';
      document.body.appendChild(container);
    }
    
    if(opts.playSound !== false) playNotifSound(type);
    if(opts.vibrate !== false) vibrateNotif(type);
    
    const card = document.createElement('div');
    card.className = 'notif-card ' + type;
    card.innerHTML =
      '<div class="notif-icon' + (type === 'info' || type === 'transfer' ? ' ring' : '') + '">' + (opts.icon || '🔔') + '</div>' +
      '<div class="notif-content">' +
        '<div class="notif-title">' + (opts.title || 'নোটিফিকেশন') +
          (opts.badge ? '<span class="notif-badge ' + type + '">' + opts.badge + '</span>' : '') +
        '</div>' +
        '<div class="notif-body">' + (opts.body || '') + '</div>' +
        (opts.actions && opts.actions.length ?
          '<div class="notif-actions">' +
            opts.actions.map((a, i) => '<button data-notif-action="' + i + '" class="' + (a.cls || '') + '">' + a.label + '</button>').join('') +
          '</div>' : '') +
      '</div>' +
      '<button class="notif-close" data-notif-close="1">✕</button>' +
      '<div class="notif-progress" style="animation-duration:' + duration + 'ms"></div>';
    
    container.appendChild(card);
    
    __notifHistory.unshift({
      id: uid(),
      type,
      title: opts.title,
      body: opts.body,
      at: new Date().toISOString()
    });
    if(__notifHistory.length > 50) __notifHistory = __notifHistory.slice(0, 50);
    
    const closeIt = () => {
      card.style.transition = 'all .3s';
      card.style.transform = 'translateX(420px)';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 320);
    };
    
    card.querySelector('[data-notif-close]').addEventListener('click', (e) => {
      e.stopPropagation();
      closeIt();
    });
    
    const timer = setTimeout(closeIt, duration);
    
    if(opts.actions){
      card.querySelectorAll('[data-notif-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const a = opts.actions[parseInt(btn.dataset.notifAction)];
          clearTimeout(timer);
          closeIt();
          if(a.onClick) a.onClick();
        });
      });
    }
    
    if(opts.onClick){
      card.addEventListener('click', (e) => {
        if(e.target.closest('button')) return;
        clearTimeout(timer);
        closeIt();
        opts.onClick();
      });
    }
    
    while(container.children.length > 4) container.firstChild.remove();
    return card;
  } catch(e){}
}

/* ───── BUILD TX NOTIF BODY ───── */
function buildTxNotifBody(tx){
  const cfg = TX_CFG[tx.type] || { title: tx.type, icon: '📌' };
  let brName = BRANCHES[tx.branch]?.name || '-';
  
  if(tx.type === 'branch_transfer'){
    brName = (BRANCHES[tx.from]?.name || '') + ' ➜ ' + (BRANCHES[tx.to]?.name || '');
  }
  
  let html = '<b>' + esc(cfg.icon + ' ' + (cfg.title || tx.type)) + '</b><br>';
  html += '<span class="notif-amt">৳ ' + fmt(tx.amount) + '</span> &nbsp;•&nbsp; ' + esc(brName) + '<br>';
  
  if(tx.custName){
    html += '👤 <b>' + esc(tx.custName) + '</b>';
    if(tx.custAcc) html += ' <small>(' + esc(tx.custAcc) + ')</small>';
    html += '<br>';
  }
  
  if(tx.note){
    const n = String(tx.note).length > 80 ? String(tx.note).slice(0, 80) + '…' : tx.note;
    html += '📝 ' + esc(n) + '<br>';
  }
  
  html += '<span class="notif-meta">👤 ' + esc(tx.user || '-') +
    ' &nbsp;•&nbsp; 🕐 ' + esc(fmtDateTime(tx.createdAt)) + '</span>';
  
  return html;
}

/* ───── DECIDE NOTIF TYPE / ICON ───── */
function decideNotifType(tx){
  if(!tx || !tx.type) return 'info';
  if(tx.type === 'branch_transfer') return 'transfer';
  if(tx.type === 'loan_given' && tx.cashNotTaken) return 'warning';
  if(tx.type === 'support' && (tx.dir === 'out' || tx.dir === 'online_support_out')) return 'warning';
  if(tx.type === 'withdrawal' || tx.type === 'loan_given') return 'info';
  if(tx.type === 'deposit' || tx.type === 'loan_received' || tx.type === 'loan_collection') return 'success';
  if(tx.type === 'expense') return 'warning';
  return 'info';
}

function decideNotifIcon(tx){
  const cfg = TX_CFG[tx.type] || { icon: '🔔' };
  return cfg.icon || '🔔';
}

/* ───── NOTIFY TRANSACTION ───── */
function notifyTransaction(tx, sourceLabel){
  if(!tx) return;
  
  // Debounce same tx id
  if(tx.id){
    if(!window.__notifiedTxIds) window.__notifiedTxIds = {};
    const last = window.__notifiedTxIds[tx.id];
    if(last && (Date.now() - last) < 5000) return;
    window.__notifiedTxIds[tx.id] = Date.now();
    setTimeout(() => {
      if(window.__notifiedTxIds) delete window.__notifiedTxIds[tx.id];
    }, 30000);
  }
  
  const type = decideNotifType(tx);
  
  showNotifToast({
    type,
    icon: decideNotifIcon(tx),
    badge: sourceLabel || 'নতুন',
    title: '💸 নতুন লেনদেন',
    body: buildTxNotifBody(tx),
    duration: type === 'danger' ? 12000 : 9000,
    actions: [
      {
        label: '👁️ বিস্তারিত',
        cls: '',
        onClick: () => {
          if(typeof openTxDetail === 'function') openTxDetail(tx.id);
        }
      },
      {
        label: '📋 সব লেনদেন',
        cls: 'primary',
        onClick: () => {
          if(typeof openAllData === 'function') openAllData();
        }
      }
    ]
  });
}

/* ───── REQUEST BROWSER NOTIF PERMISSION ───── */
async function requestNotifPermission(){
  try{
    if(!('Notification' in window)) return false;
    if(Notification.permission === 'granted') return true;
    if(Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  } catch(e){
    return false;
  }
}

/* ───── END OF FILE 07-notifications.js ───── */
console.log('✅ Notifications loaded');