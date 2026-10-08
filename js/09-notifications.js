/* ============================================================
   FILE: js/09-notifications.js
   PURPOSE: Real-time user activity notifications
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */
window.__activityChannel = null;
window.__notifHistory = [];
window.__notifCount = 0;

/* ═══════════════════════════════════════════════════════════
   SETUP CHANNEL
   ═══════════════════════════════════════════════════════════ */
function setupActivityChannel(){
  if(!window.SUPA){
    console.log('⚠️ SUPA not ready, retrying...');
    setTimeout(setupActivityChannel, 500);
    return;
  }

  // ⚡ পুরনো channel clean
  if(window.__activityChannel){
    try { window.__activityChannel.unsubscribe(); } catch(e){}
    try { window.SUPA.removeChannel(window.__activityChannel); } catch(e){}
    window.__activityChannel = null;
  }

  try {
    window.__activityChannel = window.SUPA.channel('cc_activity_v1', {
      config: { broadcast: { self: false } }
    });

    window.__activityChannel
      .on('broadcast', { event: 'activity' }, function(payload){
        try {
          console.log('📨 Incoming activity:', payload);
          handleRemoteActivity(payload.payload);
        } catch(e){
          console.warn('handleRemoteActivity error:', e);
        }
      })
      .subscribe(function(status){
        console.log('📡 Activity channel:', status);
        if(status === 'SUBSCRIBED'){
          console.log('✅ Notification channel READY');
        } else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
          // Retry after 3s
          setTimeout(function(){
            if(!window.__activityChannel || window.__activityChannel.state !== 'joined'){
              setupActivityChannel();
            }
          }, 3000);
        }
      });

  } catch(e){
    console.error('❌ setupActivityChannel error:', e);
    setTimeout(setupActivityChannel, 500);
  }
}

/* ═══════════════════════════════════════════════════════════
   BROADCAST
   ═══════════════════════════════════════════════════════════ */
function broadcastActivity(data){
  if(!window.__activityChannel){
    console.log('⚠️ No channel — cannot broadcast');
    return;
  }

  // Channel ready না হলে queue তে রাখো
  if(window.__activityChannel.state !== 'joined'){
    console.log('⏳ Channel not joined yet, state:', window.__activityChannel.state);
    return;
  }

  try {
    window.__activityChannel.send({
      type: 'broadcast',
      event: 'activity',
      payload: Object.assign({}, data, {
        sender: SESSION ? SESSION.id : null,
        senderName: SESSION ? SESSION.name : '—',
        senderUsername: SESSION ? SESSION.username : '',
        senderRole: SESSION ? SESSION.role : '',
        senderBranch: SESSION ? (SESSION.branch === 'all' ? 'সব' : (BRANCHES[SESSION.branch]?.name || SESSION.branch)) : '—',
        at: new Date().toISOString()
      })
    }).then(function(){
      console.log('✅ Broadcast delivered:', data.type);
    }).catch(function(e){
      console.warn('Broadcast send error:', e);
    });
  } catch(e){
    console.warn('Broadcast error:', e);
  }
}

/* ═══════════════════════════════════════════════════════════
   HANDLE INCOMING
   ═══════════════════════════════════════════════════════════ */
function handleRemoteActivity(data){
  if(!data || !data.type) return;
  if(data.sender && SESSION && data.sender === SESSION.id) return;

  window.__notifHistory.unshift(data);
  if(window.__notifHistory.length > 50) window.__notifHistory = window.__notifHistory.slice(0, 50);
  window.__notifCount++;

  showActivityNotification(data);
  updateNotifBadge();
  playNotifSound(data.type);
  vibrateNotif(data.type);
}

/* ═══════════════════════════════════════════════════════════
   SHOW NOTIFICATION CARD
   ═══════════════════════════════════════════════════════════ */
function showActivityNotification(data){
  var container = document.getElementById('notif-stack');
  if(!container){
    container = document.createElement('div');
    container.id = 'notif-stack';
    container.style.cssText = 'position:fixed;top:80px;right:16px;z-index:9998;display:flex;flex-direction:column;gap:10px;max-width:380px;width:calc(100% - 32px);pointer-events:none';
    document.body.appendChild(container);
  }

  var info = getActivityInfo(data.type);
  var card = document.createElement('div');
  card.style.cssText = 'pointer-events:auto;padding:14px 16px;border-radius:14px;background:linear-gradient(145deg,#0f1428,#050810);border:1.5px solid ' + info.color + ';box-shadow:0 12px 40px rgba(0,0,0,.7);animation:notifSlide .35s cubic-bezier(.2,1,.3,1);position:relative;overflow:hidden';

  var timeStr = new Date(data.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  card.innerHTML =
    '<div style="display:flex;gap:12px;align-items:flex-start">' +
      '<div style="width:42px;height:42px;border-radius:12px;flex-shrink:0;display:grid;place-items:center;font-size:22px;background:' + info.bg + ';border:1.5px solid ' + info.color + '55">' + info.icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13.5px;font-weight:900;color:#fff;margin-bottom:4px;line-height:1.35">' + esc(info.label) + '</div>' +
        '<div style="font-size:12px;color:#a5b4d8;line-height:1.5">' +
          '👤 <b style="color:#4ade80">' + esc(data.senderName) + '</b>' +
          ' <span style="font-size:10.5px;opacity:.8">(' + esc(data.senderBranch) + ')</span>' +
        '</div>' +
        (data.detail ? '<div style="font-size:11.5px;color:#93c5fd;margin-top:3px">📌 ' + esc(data.detail) + '</div>' : '') +
        (data.amount ? '<div style="font-size:13px;color:#facc15;font-weight:900;margin-top:4px">৳ ' + fmt(data.amount) + '</div>' : '') +
        '<div style="font-size:10.5px;color:#7a8ab8;margin-top:4px">🕐 ' + toBn(timeStr) + '</div>' +
      '</div>' +
      '<button class="notif-close-btn" style="background:rgba(255,255,255,.1);border:none;color:#fff;width:24px;height:24px;border-radius:6px;font-size:12px;cursor:pointer;flex-shrink:0">✕</button>' +
    '</div>' +
    '<div style="position:absolute;bottom:0;left:0;height:3px;background:' + info.color + ';animation:notifProgress 8s linear forwards;width:100%"></div>';

  container.appendChild(card);

  card.querySelector('.notif-close-btn').addEventListener('click', function(){
    removeNotifCard(card);
  });

  setTimeout(function(){ removeNotifCard(card); }, 8000);

  while(container.children.length > 5) container.firstChild.remove();
}

function removeNotifCard(card){
  if(!card.parentNode) return;
  card.style.transition = 'all .3s';
  card.style.opacity = '0';
  card.style.transform = 'translateX(100%)';
  setTimeout(function(){ if(card.parentNode) card.parentNode.removeChild(card); }, 300);
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY INFO MAP
   ═══════════════════════════════════════════════════════════ */
function getActivityInfo(type){
  var map = {
    'login':           { icon: '🔓', color: '#22c55e', bg: 'rgba(34,197,94,.15)',  label: 'ইউজার লগইন' },
    'logout':          { icon: '🔒', color: '#94a3b8', bg: 'rgba(148,163,184,.15)', label: 'ইউজার লগআউট' },
    'txn_create':      { icon: '💸', color: '#3b82f6', bg: 'rgba(59,130,246,.15)', label: 'নতুন লেনদেন' },
    'txn_update':      { icon: '✏️', color: '#facc15', bg: 'rgba(250,204,21,.15)', label: 'লেনদেন আপডেট' },
    'txn_delete':      { icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,.15)', label: 'লেনদেন ডিলিট' },
    'txn_accept':      { icon: '✅', color: '#06b6d4', bg: 'rgba(6,182,212,.15)',  label: 'ট্রান্সফার গৃহীত' },
    'txn_collect':     { icon: '💰', color: '#a78bfa', bg: 'rgba(167,139,250,.15)', label: 'ক্যাশ সংগ্রহ' },
    'user_add':        { icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,.15)', label: 'নতুন ইউজার' },
    'user_update':     { icon: '👤', color: '#facc15', bg: 'rgba(250,204,21,.15)', label: 'ইউজার আপডেট' },
    'user_delete':     { icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,.15)', label: 'ইউজার ডিলিট' },
    'vault_update':    { icon: '🗄️', color: '#06b6d4', bg: 'rgba(6,182,212,.15)', label: 'ভল্ট আপডেট' },
    'password_change': { icon: '🔑', color: '#facc15', bg: 'rgba(250,204,21,.15)', label: 'পাসওয়ার্ড পরিবর্তন' }
  };
  return map[type] || { icon: '🔔', color: '#3b82f6', bg: 'rgba(59,130,246,.15)', label: 'কার্যক্রম' };
}

/* ═══════════════════════════════════════════════════════════
   BELL BADGE
   ═══════════════════════════════════════════════════════════ */
function updateNotifBadge(){
  var el = document.getElementById('notif-badge');
  if(!el) return;
  el.textContent = toBn(window.__notifCount);
  el.style.display = window.__notifCount > 0 ? 'inline-block' : 'none';
}

function resetNotifCount(){
  window.__notifCount = 0;
  updateNotifBadge();
}

/* ═══════════════════════════════════════════════════════════
   SOUND + VIBRATION
   ═══════════════════════════════════════════════════════════ */
function playNotifSound(type){
  try {
    var ctx = window.__audioCtx;
    if(!ctx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      ctx = new AC();
      window.__audioCtx = ctx;
    }
    if(ctx.state === 'suspended') ctx.resume();
    var notes = type === 'txn_delete' ? [400, 300] : [700, 900];
    notes.forEach(function(f, i){
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  } catch(e){}
}

function vibrateNotif(type){
  if(!navigator.vibrate) return;
  try {
    if(type === 'txn_delete') navigator.vibrate([200, 80, 200]);
    else navigator.vibrate([80, 40, 120]);
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   HISTORY MODAL
   ═══════════════════════════════════════════════════════════ */
function openNotifHistory(){
  resetNotifCount();
  var list = window.__notifHistory || [];

  var html = '';
  if(!list.length){
    html = '<div style="padding:40px;text-align:center;color:#7a8ab8">' +
      '<div style="font-size:40px;margin-bottom:10px">🔔</div>' +
      '<div>এই সেশনে কোনো notification নেই</div>' +
    '</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    list.forEach(function(data){
      var info = getActivityInfo(data.type);
      var timeStr = new Date(data.at).toLocaleString('en-GB');
      html += '<div style="padding:12px 14px;border-radius:11px;background:linear-gradient(145deg,#0f1428,#050810);border:1.5px solid ' + info.color + '40;display:flex;gap:10px;align-items:flex-start">' +
        '<div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;font-size:18px;background:' + info.bg + ';border:1.5px solid ' + info.color + '55">' + info.icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:3px">' + esc(info.label) + '</div>' +
          '<div style="font-size:11.5px;color:#a5b4d8">👤 <b style="color:#4ade80">' + esc(data.senderName) + '</b> (' + esc(data.senderBranch) + ')</div>' +
          (data.detail ? '<div style="font-size:11.5px;color:#93c5fd;margin-top:2px">📌 ' + esc(data.detail) + '</div>' : '') +
          (data.amount ? '<div style="font-size:12.5px;color:#facc15;font-weight:900;margin-top:3px">৳ ' + fmt(data.amount) + '</div>' : '') +
          '<div style="font-size:10.5px;color:#7a8ab8;margin-top:4px">🕐 ' + toBn(timeStr) + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  openModal({
    title: '🔔 সাম্প্রতিক কার্যক্রম (' + list.length + ')',
    bodyHTML: html,
    wide: true
  });
}

/* ═══════════════════════════════════════════════════════════
   INJECT BELL
   ═══════════════════════════════════════════════════════════ */
function injectNotifBell(){
  var tbRight = document.querySelector('#topbar .tb-right');
  if(!tbRight) return;
  if(tbRight.querySelector('#notif-bell')) return;

  var bell = document.createElement('button');
  bell.id = 'notif-bell';
  bell.className = 'tb-pill';
  bell.style.cssText = 'cursor:pointer;position:relative;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;background:rgba(250,204,21,.15);border-color:rgba(250,204,21,.4);color:#facc15';
  bell.innerHTML = '🔔 <b id="notif-badge" style="display:none;font-size:11px">0</b>';
  bell.addEventListener('click', openNotifHistory);

  tbRight.insertBefore(bell, tbRight.firstChild);
}

setInterval(function(){
  if(SESSION) injectNotifBell();
}, 1000);

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
function initNotifications(){
  // ⚡ window.SUPA এর জন্য অপেক্ষা করো
  if(!window.SUPA){
    console.log('⏳ Waiting for Supabase...');
    setTimeout(initNotifications, 500);
    return;
  }

  // ⚡ Channel exists হলে skip
  if(window.__activityChannel){
    return;
  }

  console.log('📡 Initializing notification channel...');
  try {
    setupActivityChannel();
  } catch(e){
    console.warn('Channel error:', e);
    setTimeout(initNotifications, 500);
  }
}

// ⚡ Multiple trigger points
setTimeout(initNotifications, 500);
setTimeout(initNotifications, 500);
setTimeout(initNotifications,500);

setTimeout(initNotifications, 1500);

var __origStartApp_notif = window.startApp;
if(typeof __origStartApp_notif === 'function'){
  window.startApp = function(){
    var r = __origStartApp_notif.apply(this, arguments);
    setTimeout(initNotifications, 500);
    return r;
  };
}

console.log('✅ Notifications module loaded');