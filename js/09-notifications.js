/* ============================================================
   FILE: js/09-notifications.js — FINAL v2.0
   PURPOSE: Real-time notification + Device/Location info
   ============================================================ */
'use strict';

window.__activityChannel = null;
window.__notifHistory = [];
window.__notifCount = 0;
window.__lastSeenActivityId = null;
window.__shownActivityIds = {};

/* ═══════════════════════════════════════════════════════════
   SETUP CHANNEL
   ═══════════════════════════════════════════════════════════ */
function setupActivityChannel(){
  if(!window.SUPA){
    console.log('⏳ SUPA not ready, retrying...');
    setTimeout(setupActivityChannel, 500);
    return;
  }

  if(window.__activityChannel){
    try { window.__activityChannel.unsubscribe(); } catch(e){}
    try { window.SUPA.removeChannel(window.__activityChannel); } catch(e){}
    window.__activityChannel = null;
  }

  try {
    window.__activityChannel = window.SUPA.channel('cc_activity_v2', {
      config: { broadcast: { self: false } }
    });

    window.__activityChannel
      .on('broadcast', { event: 'activity' }, function(payload){
        try {
          console.log('📨 Broadcast received:', payload.payload);
          handleRemoteActivity(payload.payload);
        } catch(e){
          console.warn('handle error:', e);
        }
      })
      .subscribe(function(status){
        console.log('📡 Channel:', status);

        if(status === 'SUBSCRIBED'){
          console.log('✅ Notification channel READY');
          startActivityPolling();
        }
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          console.warn('⚠️ Channel failed:', status);
          setTimeout(setupActivityChannel, 3000);
          startActivityPolling();
        }
      });

  } catch(e){
    console.error('❌ Channel error:', e);
    setTimeout(setupActivityChannel, 1000);
    startActivityPolling();
  }
}

/* ═══════════════════════════════════════════════════════════
   BROADCAST (with device info)
   ═══════════════════════════════════════════════════════════ */
async function broadcastActivity(data){
  if(!window.__activityChannel){
    console.log('⚠️ No channel for broadcast');
    return;
  }

  if(window.__activityChannel.state !== 'joined'){
    console.log('⏳ Channel not ready:', window.__activityChannel.state);
    return;
  }

  try {
    // ⚡ Device + Location info
    var deviceInfo = null;
    try {
      if(typeof window.getDeviceInfo === 'function'){
        deviceInfo = await window.getDeviceInfo();
      }
    } catch(e){
      console.warn('Device info fail:', e);
    }

    var payload = Object.assign({}, data, {
      sender: SESSION ? SESSION.id : null,
      senderName: SESSION ? SESSION.name : '—',
      senderUsername: SESSION ? SESSION.username : '',
      senderRole: SESSION ? SESSION.role : '',
      senderBranch: SESSION ? (SESSION.branch === 'all' ? 'সব' : (BRANCHES[SESSION.branch]?.name || SESSION.branch)) : '—',
      deviceInfo: deviceInfo,
      at: new Date().toISOString()
    });

    window.__activityChannel.send({
      type: 'broadcast',
      event: 'activity',
      payload: payload
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
   POLLING FALLBACK
   ═══════════════════════════════════════════════════════════ */
var __pollingStarted = false;

function startActivityPolling(){
  if(__pollingStarted) return;
  __pollingStarted = true;
  console.log('🔄 Activity polling started');

  setInterval(function(){
    if(!window.SESSION) return;
    if(!window.DB || !DB.activity) return;
    if(!navigator.onLine) return;

    try {
      var acts = DB.activity;
      if(acts.length === 0) return;

      var latest = acts[acts.length - 1];
      if(!latest || !latest.id) return;

      if(!window.__lastSeenActivityId){
        window.__lastSeenActivityId = latest.id;
        return;
      }

      if(latest.id === window.__lastSeenActivityId) return;

      var newOnes = [];
      var foundIdx = -1;

      for(var i = acts.length - 1; i >= 0; i--){
        if(acts[i].id === window.__lastSeenActivityId){
          foundIdx = i;
          break;
        }
        newOnes.unshift(acts[i]);
      }

      if(foundIdx === -1){
        newOnes = acts.slice(-5);
      }

      newOnes.forEach(function(a){
        if(!a) return;
        if(a.username && SESSION && a.username === SESSION.username) return;
        if(window.__shownActivityIds[a.id]) return;

        window.__shownActivityIds[a.id] = true;

        var notifData = {
          type: a.type,
          detail: a.detail || a.title,
          amount: a.amount,
          sender: a.username,
          senderName: a.user || '—',
          senderBranch: a.role === 'admin' ? 'সব' : (BRANCHES[a.branch]?.name || '—'),
          deviceInfo: a.deviceInfo || null,
          at: a.at
        };

        console.log('🔔 Polling detected:', a.type);
        handleRemoteActivity(notifData);
      });

      window.__lastSeenActivityId = latest.id;

    } catch(e){
      console.warn('Polling error:', e);
    }
  }, 8000);
}

/* ═══════════════════════════════════════════════════════════
   HANDLE INCOMING
   ═══════════════════════════════════════════════════════════ */
function handleRemoteActivity(data){
  if(!data || !data.type) return;
  if(data.sender && SESSION && data.sender === SESSION.id) return;

  window.__notifHistory.unshift(data);
  if(window.__notifHistory.length > 50){
    window.__notifHistory = window.__notifHistory.slice(0, 50);
  }
  window.__notifCount++;

  showActivityNotification(data);
  updateNotifBadge();
  playNotifSound(data.type);
  vibrateNotif(data.type);
  trySystemNotification(data);
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM NOTIFICATION
   ═══════════════════════════════════════════════════════════ */
function trySystemNotification(data){
  if(typeof Notification === 'undefined') return;
  if(Notification.permission !== 'granted') return;
  if(document.visibilityState === 'visible') return;

  try {
    var info = getActivityInfo(data.type);
    var body = '👤 ' + (data.senderName || '—');
    if(data.deviceInfo && data.deviceInfo.location && data.deviceInfo.location !== '—'){
      body += '\n📍 ' + data.deviceInfo.location;
    }
    if(data.detail) body += '\n📌 ' + data.detail;
    if(data.amount) body += '\n💰 ৳ ' + fmt(data.amount);

    var notif = new Notification(info.label, {
      body: body,
      icon: 'favicon.svg',
      badge: 'favicon.svg',
      tag: 'cc_activity_' + Date.now(),
      vibrate: [80, 40, 120]
    });

    notif.onclick = function(){
      window.focus();
      notif.close();
    };

    setTimeout(function(){ notif.close(); }, 6000);
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   SHOW CARD (in-page notification)
   ═══════════════════════════════════════════════════════════ */
function showActivityNotification(data){
  var container = document.getElementById('notif-stack');
  if(!container){
    container = document.createElement('div');
    container.id = 'notif-stack';
    container.style.cssText =
      'position:fixed;top:80px;right:16px;z-index:9998;' +
      'display:flex;flex-direction:column;gap:10px;' +
      'max-width:380px;width:calc(100% - 32px);pointer-events:none';
    document.body.appendChild(container);
  }

  var info = getActivityInfo(data.type);
  var card = document.createElement('div');
  card.style.cssText =
    'pointer-events:auto;padding:14px 16px;border-radius:14px;' +
    'background:linear-gradient(145deg,#0f1428,#050810);' +
    'border:1.5px solid ' + info.color + ';' +
    'box-shadow:0 12px 40px rgba(0,0,0,.7);' +
    'animation:notifSlide .35s cubic-bezier(.2,1,.3,1);' +
    'position:relative;overflow:hidden';

  var timeStr = data.at
    ? new Date(data.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'এখন';

  // ═══ Build HTML ═══
  var html = '';

  html += '<div style="display:flex;gap:12px;align-items:flex-start">';

  // Icon
  html += '<div style="width:42px;height:42px;border-radius:12px;flex-shrink:0;' +
    'display:grid;place-items:center;font-size:22px;' +
    'background:' + info.bg + ';border:1.5px solid ' + info.color + '55">' +
    info.icon + '</div>';

  // Content
  html += '<div style="flex:1;min-width:0">';

  // Title
  html += '<div style="font-size:13.5px;font-weight:900;color:#fff;margin-bottom:4px;line-height:1.35">' +
    esc(info.label) + '</div>';

  // User + branch
  html += '<div style="font-size:12px;color:#a5b4d8;line-height:1.5">' +
    '👤 <b style="color:#4ade80">' + esc(data.senderName || '—') + '</b>' +
    (data.senderBranch ? ' <span style="font-size:10.5px;opacity:.8">(' + esc(data.senderBranch) + ')</span>' : '') +
  '</div>';

  // ⚡ DEVICE + LOCATION
  if(data.deviceInfo){
    html += '<div style="font-size:11px;color:#22d3ee;margin-top:5px;line-height:1.6;' +
      'padding:6px 8px;border-radius:6px;background:rgba(34,211,238,.08);' +
      'border-left:2px solid #22d3ee">';

    html += '📱 <b>' + esc(data.deviceInfo.device || '—') + '</b>';

    if(data.deviceInfo.browser){
      html += ' • ' + esc(data.deviceInfo.browser);
    }
    if(data.deviceInfo.os && data.deviceInfo.os !== 'Unknown'){
      html += ' • ' + esc(data.deviceInfo.os);
    }

    if(data.deviceInfo.location && data.deviceInfo.location !== '—'){
      html += '<br>📍 <b style="color:#facc15">' + esc(data.deviceInfo.location) + '</b>';
    }

    if(data.deviceInfo.isp && data.deviceInfo.isp !== '—'){
      html += '<br>📡 ' + esc(data.deviceInfo.isp);
    }

    if(data.deviceInfo.ip && data.deviceInfo.ip !== '—'){
      html += ' <span style="opacity:.6">(' + esc(data.deviceInfo.ip) + ')</span>';
    }

    html += '</div>';
  }

  // Detail
  if(data.detail){
    html += '<div style="font-size:11.5px;color:#93c5fd;margin-top:4px">📌 ' + esc(data.detail) + '</div>';
  }

  // Amount
  if(data.amount){
    html += '<div style="font-size:13px;color:#facc15;font-weight:900;margin-top:4px">৳ ' + fmt(data.amount) + '</div>';
  }

  // Time
  html += '<div style="font-size:10.5px;color:#7a8ab8;margin-top:5px">🕐 ' + toBn(timeStr) + '</div>';

  html += '</div>'; // content

  // Close btn
  html += '<button class="notif-close-btn" style="background:rgba(255,255,255,.1);border:none;color:#fff;' +
    'width:24px;height:24px;border-radius:6px;font-size:12px;cursor:pointer;flex-shrink:0">✕</button>';

  html += '</div>'; // flex

  // Progress bar
  html += '<div style="position:absolute;bottom:0;left:0;height:3px;background:' + info.color + ';' +
    'animation:notifProgress 8s linear forwards;width:100%"></div>';

  card.innerHTML = html;

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
  setTimeout(function(){
    if(card.parentNode) card.parentNode.removeChild(card);
  }, 300);
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY INFO MAP
   ═══════════════════════════════════════════════════════════ */
function getActivityInfo(type){
  var map = {
    'login':           { icon: '🔓', color: '#22c55e', bg: 'rgba(34,197,94,.15)',   label: 'ইউজার লগইন' },
    'logout':          { icon: '🔒', color: '#94a3b8', bg: 'rgba(148,163,184,.15)', label: 'ইউজার লগআউট' },
    'txn_create':      { icon: '💸', color: '#3b82f6', bg: 'rgba(59,130,246,.15)',  label: 'নতুন লেনদেন' },
    'txn_update':      { icon: '✏️', color: '#facc15', bg: 'rgba(250,204,21,.15)',  label: 'লেনদেন আপডেট' },
    'txn_delete':      { icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,.15)',   label: 'লেনদেন ডিলিট' },
    'txn_accept':      { icon: '✅', color: '#06b6d4', bg: 'rgba(6,182,212,.15)',   label: 'ট্রান্সফার গৃহীত' },
    'txn_collect':     { icon: '💰', color: '#a78bfa', bg: 'rgba(167,139,250,.15)', label: 'ক্যাশ সংগ্রহ' },
    'user_add':        { icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,.15)',  label: 'নতুন ইউজার' },
    'user_update':     { icon: '👤', color: '#facc15', bg: 'rgba(250,204,21,.15)',  label: 'ইউজার আপডেট' },
    'user_delete':     { icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,.15)',   label: 'ইউজার ডিলিট' },
    'vault_update':    { icon: '🗄️', color: '#06b6d4', bg: 'rgba(6,182,212,.15)',   label: 'ভল্ট আপডেট' },
    'password_change': { icon: '🔑', color: '#facc15', bg: 'rgba(250,204,21,.15)',  label: 'পাসওয়ার্ড পরিবর্তন' }
  };
  return map[type] || { icon: '🔔', color: '#3b82f6', bg: 'rgba(59,130,246,.15)', label: 'কার্যক্রম' };
}

/* ═══════════════════════════════════════════════════════════
   BADGE
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

      html += '<div style="padding:12px 14px;border-radius:11px;' +
        'background:linear-gradient(145deg,#0f1428,#050810);' +
        'border:1.5px solid ' + info.color + '40;' +
        'display:flex;gap:10px;align-items:flex-start">';

      html += '<div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;' +
        'display:grid;place-items:center;font-size:18px;' +
        'background:' + info.bg + ';border:1.5px solid ' + info.color + '55">' +
        info.icon + '</div>';

      html += '<div style="flex:1;min-width:0">';

      html += '<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:3px">' +
        esc(info.label) + '</div>';

      html += '<div style="font-size:11.5px;color:#a5b4d8">' +
        '👤 <b style="color:#4ade80">' + esc(data.senderName || '—') + '</b>' +
        ' (' + esc(data.senderBranch || '—') + ')</div>';

      // ⚡ DEVICE + LOCATION
      if(data.deviceInfo){
        html += '<div style="font-size:11px;color:#22d3ee;margin-top:4px;line-height:1.5;' +
          'padding:5px 7px;border-radius:5px;background:rgba(34,211,238,.08);' +
          'border-left:2px solid #22d3ee">';

        html += '📱 ' + esc(data.deviceInfo.device || '—');

        if(data.deviceInfo.browser){
          html += ' • ' + esc(data.deviceInfo.browser);
        }

        if(data.deviceInfo.location && data.deviceInfo.location !== '—'){
          html += '<br>📍 <b style="color:#facc15">' + esc(data.deviceInfo.location) + '</b>';
        }

        if(data.deviceInfo.isp && data.deviceInfo.isp !== '—'){
          html += '<br>📡 ' + esc(data.deviceInfo.isp);
        }

        html += '</div>';
      }

      if(data.detail){
        html += '<div style="font-size:11.5px;color:#93c5fd;margin-top:3px">📌 ' + esc(data.detail) + '</div>';
      }

      if(data.amount){
        html += '<div style="font-size:12.5px;color:#facc15;font-weight:900;margin-top:3px">৳ ' + fmt(data.amount) + '</div>';
      }

      html += '<div style="font-size:10.5px;color:#7a8ab8;margin-top:4px">🕐 ' + toBn(timeStr) + '</div>';

      html += '</div>'; // content
      html += '</div>'; // row
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
   BELL
   ═══════════════════════════════════════════════════════════ */
function injectNotifBell(){
  var tbRight = document.querySelector('#topbar .tb-right');
  if(!tbRight) return;
  if(tbRight.querySelector('#notif-bell')) return;

  var bell = document.createElement('button');
  bell.id = 'notif-bell';
  bell.className = 'tb-pill';
  bell.style.cssText =
    'cursor:pointer;position:relative;padding:6px 12px;' +
    'display:inline-flex;align-items:center;gap:6px;' +
    'background:rgba(250,204,21,.15);border-color:rgba(250,204,21,.4);color:#facc15';
  bell.innerHTML = '🔔 <b id="notif-badge" style="display:none;font-size:11px">0</b>';
  bell.addEventListener('click', openNotifHistory);

  tbRight.insertBefore(bell, tbRight.firstChild);
}

setInterval(function(){
  if(window.SESSION) injectNotifBell();
}, 1000);

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
function initNotifications(){
  if(!window.SUPA){
    setTimeout(initNotifications, 500);
    return;
  }
  if(window.__activityChannel) return;

  console.log('📡 Initializing notifications...');
  try {
    setupActivityChannel();
  } catch(e){
    console.warn('Channel error:', e);
    setTimeout(initNotifications, 500);
  }
}

setTimeout(initNotifications, 500);
setTimeout(initNotifications, 1500);
setTimeout(initNotifications, 3000);

/* ═══════════════════════════════════════════════════════════
   PERMISSION REQUEST
   ═══════════════════════════════════════════════════════════ */
window.requestNotifPermission = function(){
  if(typeof Notification === 'undefined'){
    if(typeof toast === 'function') toast('❌ Browser support নেই');
    return;
  }
  if(Notification.permission === 'granted'){
    if(typeof toast === 'function') toast('✅ Permission আছে', 'ok');
    return;
  }
  Notification.requestPermission().then(function(p){
    if(typeof toast === 'function'){
      if(p === 'granted') toast('✅ Notification enable হয়েছে', 'ok');
      else toast('❌ Permission deny হয়েছে', 'err');
    }
  });
};

/* ═══════════════════════════════════════════════════════════
   DEBUG
   ═══════════════════════════════════════════════════════════ */
window.__notifStatus = function(){
  console.log('═══════════════════════════════════');
  console.log('🔔 NOTIFICATION STATUS');
  console.log('═══════════════════════════════════');
  console.log('Channel:', window.__activityChannel?.state || 'none');
  console.log('SUPA:', window.SUPA ? '✅' : '❌');
  console.log('History:', window.__notifHistory.length);
  console.log('Badge count:', window.__notifCount);
  console.log('Browser permission:', Notification?.permission || 'N/A');
  console.log('Polling active:', __pollingStarted);
  console.log('═══════════════════════════════════');
};

window.__testNotif = function(){
  console.log('🧪 Sending test notification...');
  broadcastActivity({
    type: 'txn_create',
    detail: 'টেস্ট notification',
    amount: 100
  });
  handleRemoteActivity({
    type: 'txn_create',
    detail: 'টেস্ট notification (local)',
    amount: 100,
    senderName: 'Test',
    senderBranch: 'টেস্ট',
    deviceInfo: {
      device: '💻 Test PC',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Dhaka, Bangladesh',
      isp: 'Test ISP',
      ip: '127.0.0.1'
    },
    at: new Date().toISOString()
  });
};

console.log('✅ Notifications loaded — v2.0 (Device + Location)');