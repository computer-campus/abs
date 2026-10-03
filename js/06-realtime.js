/* ============================================================
   FILE: 06-realtime.js
   PURPOSE: Supabase Realtime + Activity Channel
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 REALTIME CHANNEL (Presence + DB Changes)
   ═══════════════════════════════════════════════════════════ */
function setupRealtime(){
  if(!__isRemoteReady || !__supabaseClient) return;
  
  try{
    if(__realtimeChannel){
      try{ __supabaseClient.removeChannel(__realtimeChannel); } catch(e){}
      __realtimeChannel = null;
    }
    
    const presenceKey = (session?.id || 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    
    __realtimeChannel = __supabaseClient
      .channel('agent_bank_rt_' + window.SUPABASE_ROW_ID, {
        config: {
          presence: { key: presenceKey },
          broadcast: { self: false }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: window.SUPABASE_TABLE,
        filter: 'id=eq.' + window.SUPABASE_ROW_ID
      }, (payload) => {
        handleRealtimeUpdate(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        try{
          const state = __realtimeChannel.presenceState();
          const flat = Object.values(state).flat();
          updatePresenceUI(flat);
        } catch(e){}
      })
      .subscribe(async (status) => {
        if(status === 'SUBSCRIBED'){
          __realtimeReconnectAttempts = 0;
          
          try{ await pullRemoteDB(); } catch(e){}
          
          // Track presence
          try{
            const geo = await fetchGeoLocation();
            await __realtimeChannel.track({
              user: (session?.name) || 'অতিথি',
              username: (session?.username) || '',
              branch: (session?.branch) || 'all',
              role: (session?.role) || '',
              location: geo.label,
              joined_at: new Date().toISOString()
            });
          } catch(e){}
        }
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
          __realtimeReconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(1.5, __realtimeReconnectAttempts - 1), 15000);
          setTimeout(() => {
            if(navigator.onLine) setupRealtime();
          }, delay);
        }
        else if(status === 'CLOSED'){
          setTimeout(() => {
            if(navigator.onLine) setupRealtime();
          }, 3000);
        }
      });
  } catch(e){
    setTimeout(() => {
      if(navigator.onLine) setupRealtime();
    }, 5000);
  }
}

function updatePresenceUI(users){
  const cnt = document.getElementById('presenceCount');
  const bdg = document.getElementById('presenceBadge');
  if(!cnt || !bdg) return;
  
  const uniq = new Set();
  users.forEach(u => {
    if(u && u.username) uniq.add(u.username);
  });
  
  cnt.textContent = toBn(uniq.size);
  const names = Array.from(uniq).slice(0, 8).join(', ');
  bdg.title = 'অনলাইন: ' + (names || 'শুধু আপনি');
}

/* ═══════════════════════════════════════════════════════════
   🔥 ACTIVITY CHANNEL (Instant Notification with self:true)
   ═══════════════════════════════════════════════════════════ */
function setupActivityChannel(){
  try{
    if(!__isRemoteReady || !__supabaseClient) return;
    
    if(__activityChannel){
      try{ __activityChannel.unsubscribe(); } catch(e){}
      try{ __supabaseClient.removeChannel(__activityChannel); } catch(e){}
      __activityChannel = null;
    }
    
    __activityChannelReady = false;
    
    __activityChannel = __supabaseClient
      .channel('cc_activity_broadcast', {
        config: { broadcast: { self: true, ack: true } }
      })
      .on('broadcast', { event: 'activity' }, (payload) => {
        try{
          const data = payload && payload.payload;
          if(!data || !data.type) return;
          handleRemoteActivity(data);
        } catch(e){}
      })
      .subscribe((status) => {
        if(status === 'SUBSCRIBED'){
          __activityChannelReady = true;
          __activityChannelRetry = 0;
          
          // Flush queued activities
          if(__activityQueue.length){
            const q = __activityQueue.slice();
            __activityQueue = [];
            q.forEach(p => {
              try{
                __activityChannel.send({
                  type: 'broadcast',
                  event: 'activity',
                  payload: p
                }).catch(() => {});
              } catch(e){}
            });
          }
        }
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
          __activityChannelReady = false;
          __activityChannelRetry++;
          const delay = Math.min(2000 * Math.pow(1.6, __activityChannelRetry - 1), 20000);
          setTimeout(() => {
            if(navigator.onLine) setupActivityChannel();
          }, delay);
        }
        else if(status === 'CLOSED'){
          __activityChannelReady = false;
          setTimeout(() => {
            if(navigator.onLine) setupActivityChannel();
          }, 3000);
        }
      });
  } catch(e){
    __activityChannelReady = false;
    setTimeout(() => {
      if(navigator.onLine) setupActivityChannel();
    }, 5000);
  }
}

function broadcastActivity(data){
  try{
    if(!data || !data.type) return;
    
    const payload = {
      ...data,
      senderId: session?.id || 'anon_' + Date.now(),
      senderName: session?.name || 'অজানা',
      senderUsername: session?.username || '',
      senderRole: session?.role || 'user',
      senderBranch: session?.role === 'admin' ? 'অ্যাডমিন' : (BRANCHES[session?.branch]?.name || 'অজানা'),
      device: getDeviceName(),
      location: (window.__geoCache && window.__geoCache.label) || 'Kalaroa, Satkhira, BD',
      at: new Date().toISOString()
    };
    
    if(!__activityChannel || !__activityChannelReady){
      __activityQueue.push(payload);
      if(__activityQueue.length > ACTIVITY_QUEUE_MAX){
        __activityQueue = __activityQueue.slice(-ACTIVITY_QUEUE_MAX);
      }
      if(!__activityChannel) setupActivityChannel();
      return;
    }
    
    __activityChannel
      .send({ type: 'broadcast', event: 'activity', payload })
      .then(() => {})
      .catch((err) => {
        __activityQueue.push(payload);
        __activityChannelReady = false;
        setTimeout(() => setupActivityChannel(), 1000);
      });
  } catch(e){}
}

function handleRemoteActivity(data){
  try{
    const info = {
      user: data.senderName || 'অজানা',
      username: data.senderUsername || '',
      role: data.senderRole || 'user',
      branch: data.senderBranch || 'অজানা',
      device: data.device || 'অজানা ডিভাইস',
      location: data.location || 'Kalaroa, Satkhira, BD',
      time: fmtDateTime(data.at) || 'এইমাত্র'
    };
    
    if(data.type === 'login'){
      showActivityToast('🔓', 'ইউজার লগইন করেছেন', info, 'success', '#22c55e', '#16a34a');
      playNotifSound('info');
      vibrateNotif('info');
    }
    else if(data.type === 'logout'){
      showActivityToast('🔒', 'ইউজার লগআউট করেছেন', info, 'warning', '#f59e0b', '#d97706');
      playNotifSound('warning');
      vibrateNotif('warning');
    }
    else if(data.type === 'txn_create'){
      showActivityToast('💸', 'নতুন লেনদেন — ' + (data.txTitle || ''), info, 'success', '#3b82f6', '#2563eb', '৳ ' + fmt(data.amount || 0));
      playNotifSound('success');
      vibrateNotif('success');
    }
    else if(data.type === 'txn_update'){
      showActivityToast('✏️', 'লেনদেন আপডেট — ' + (data.txTitle || ''), info, 'warning', '#eab308', '#ca8a04', '৳ ' + fmt(data.amount || 0));
      playNotifSound('warning');
      vibrateNotif('warning');
    }
    else if(data.type === 'txn_delete'){
      showActivityToast('🗑️', 'লেনদেন ডিলিট — ' + (data.txTitle || ''), info, 'danger', '#dc2626', '#991b1b', '৳ ' + fmt(data.amount || 0));
      playNotifSound('danger');
      vibrateNotif('danger');
    }
    else if(data.type === 'txn_accept'){
      showActivityToast('✅', 'আউটলেট ট্রান্সফার গৃহীত', info, 'success', '#06b6d4', '#0891b2', '৳ ' + fmt(data.amount || 0));
      playNotifSound('success');
      vibrateNotif('success');
    }
    else if(data.type === 'txn_collect'){
      showActivityToast('💰', 'ঋণ সংগ্রহ সম্পন্ন', info, 'success', '#a78bfa', '#7c3aed', '৳ ' + fmt(data.amount || 0));
      playNotifSound('success');
      vibrateNotif('success');
    }
    else if(data.type === 'user_add'){
      showActivityToast('👥', 'নতুন ইউজার তৈরি — ' + esc(data.targetName || ''), info, 'info', '#3b82f6', '#2563eb');
      playNotifSound('info');
      vibrateNotif('info');
    }
    else if(data.type === 'user_update'){
      showActivityToast('👤', 'ইউজার আপডেট — ' + esc(data.targetName || ''), info, 'warning', '#eab308', '#ca8a04');
      playNotifSound('warning');
      vibrateNotif('warning');
    }
    else if(data.type === 'user_delete'){
      showActivityToast('🗑️', 'ইউজার ডিলিট — ' + esc(data.targetName || ''), info, 'danger', '#dc2626', '#991b1b');
      playNotifSound('danger');
      vibrateNotif('danger');
    }
    else if(data.type === 'password_change'){
      showActivityToast('🔑', 'পাসওয়ার্ড পরিবর্তন — ' + esc(data.targetName || ''), info, 'warning', '#eab308', '#ca8a04');
      playNotifSound('warning');
      vibrateNotif('warning');
    }
    else if(data.type === 'vault_update'){
      showActivityToast('🗄️', 'ভল্ট আপডেট — ' + esc(data.targetName || ''), info, 'info', '#06b6d4', '#0891b2');
      playNotifSound('info');
      vibrateNotif('info');
    }
    // ✅ INTERNAL BANK TRANSFER — Accept/Cancel button সহ
    else if(data.type === 'bank_transfer_create'){
      showBankTransferNotif(data, info);
      playNotifSound('transfer');
      vibrateNotif('transfer');
    }
    
    // Native browser notification
    if(data.type && data.type.indexOf('txn_') === 0){
      try{
        if('Notification' in window && Notification.permission === 'granted'){
          new Notification('💸 ' + (data.txTitle || 'লেনদেন'), {
            body: (data.senderName || '') + ' — ৳ ' + fmt(data.amount || 0) +
              (data.custName ? '\n' + data.custName : ''),
            tag: 'cc_' + (data.txId || Date.now()),
            silent: false
          });
        }
      } catch(e){}
    }
  } catch(e){
    console.error('handleRemoteActivity:', e);
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 BANK TRANSFER NOTIFICATION — Accept/Cancel Buttons
   ═══════════════════════════════════════════════════════════ */
function showBankTransferNotif(data, info){
  try{
    if(window.__bumpActivity) window.__bumpActivity();
    
    let container = document.getElementById('activityContainer');
    if(!container){
      container = document.createElement('div');
      container.id = 'activityContainer';
      container.style.cssText = 'position:fixed;top:78px;right:18px;z-index:99998;display:flex;flex-direction:column;gap:12px;max-width:440px;width:calc(100% - 36px);pointer-events:none';
      document.body.appendChild(container);
    }
    
    const txId = data.txId;
    
    // ✅ Already closed check
    if(document.querySelector('[data-notif-bt-id="' + txId + '"]')) return;
    
    const card = document.createElement('div');
    card.dataset.notifBtId = txId;
    card.style.cssText = 'pointer-events:auto;position:relative;overflow:hidden;border-radius:18px;padding:16px 18px;background:linear-gradient(150deg,rgba(167,139,250,.25),rgba(6,9,26,.98));border:2px solid rgba(167,139,250,.7);box-shadow:0 24px 60px rgba(0,0,0,.95);animation:notifSlide .35s cubic-bezier(.2,1,.3,1);display:flex;gap:14px;align-items:flex-start;backdrop-filter:blur(14px)';
    
    const roleBadge = info.role === 'admin' ? '👑 অ্যাডমিন' : '👤 ইউজার';
    const fromBranch = data.txFromBranch || 'অজানা';
    const toBranch = data.txToBranch || 'অজানা';
    
    card.innerHTML =
      '<div style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:24px;flex-shrink:0;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4)">🏛️</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14.5px;font-weight:900;color:#fff;line-height:1.45;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '🏛️ ইন্টারনাল অনলাইন ট্রান্সফার' +
          '<span style="font-size:11.5px;padding:3px 9px;border-radius:7px;background:rgba(250,204,21,.25);border:1px solid rgba(250,204,21,.5);color:#facc15;font-weight:800">⏳ অপেক্ষমাণ</span>' +
        '</div>' +
        '<div style="display:grid;gap:6px;font-size:12.5px;color:#fff">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">📤</span><span>প্রেরক: <b>' + esc(fromBranch) + '</b></span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">📥</span><span>গ্রহণকারী: <b style="color:#4ade80">' + esc(toBranch) + '</b></span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">💰</span><span style="color:#c4b5fd;font-weight:900;font-size:16px">৳ ' + fmt(data.amount || 0) + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:8px;font-size:11.5px;opacity:.9"><span style="width:18px;text-align:center">👤</span><span>' + esc(info.user) + ' (' + roleBadge + ')</span></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
          '<button class="bt-acc-btn" data-tx-id="' + esc(txId) + '" style="flex:1;min-width:100px;padding:11px 14px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;color:#fff;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(34,197,94,.4)">✅ গ্রহণ</button>' +
          '<button class="bt-cancel-btn" data-tx-id="' + esc(txId) + '" style="flex:1;min-width:100px;padding:11px 14px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);border:none;color:#fff;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,.4)">❌ বাতিল</button>' +
        '</div>' +
      '</div>' +
      '<button class="act-close" style="background:rgba(255,255,255,.18);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>' +
      '<div style="position:absolute;bottom:0;left:0;height:3px;background:linear-gradient(90deg,#a78bfa,#4ade80);animation:notifProgress linear forwards;animation-duration:30000ms;width:100%"></div>';
    
    container.appendChild(card);
    
    const closeIt = () => {
      card.style.transition = 'all .3s';
      card.style.transform = 'translateX(420px)';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 320);
    };
    
    // ✅ Accept button
    card.querySelector('.bt-acc-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try{
        await receiveBankTransferDirect(txId);
        closeIt();
      } catch(err){
        console.error('Accept error:', err);
        toast('❌ ' + err.message);
      }
    });
    
    // ✅ Cancel button
    card.querySelector('.bt-cancel-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try{
        await cancelBankTransferDirect(txId);
        closeIt();
      } catch(err){
        console.error('Cancel error:', err);
        toast('❌ ' + err.message);
      }
    });
    
    // Close button
    card.querySelector('.act-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeIt();
    });
    
    // Auto-close check
    let checks = 0;
    const autoCloseTimer = setInterval(() => {
      checks++;
      if(checks > 60){
        clearInterval(autoCloseTimer);
        return;
      }
      const t = getAllTxs().find(x => x.id === txId);
      if(!t || t.accepted || t.cancelled){
        clearInterval(autoCloseTimer);
        closeIt();
      }
    }, 500);
    
    while(container.children.length > 5) container.firstChild.remove();
  } catch(e){
    console.error('showBankTransferNotif:', e);
  }
}

/* ───── ACTIVITY TOAST (simple, non-interactive) ───── */
function showActivityToast(icon, title, info, type, color1, color2, extraBadge){
  try{
    if(window.__bumpActivity) window.__bumpActivity();
    
    let container = document.getElementById('activityContainer');
    if(!container){
      container = document.createElement('div');
      container.id = 'activityContainer';
      container.style.cssText = 'position:fixed;top:78px;right:18px;z-index:99998;display:flex;flex-direction:column;gap:12px;max-width:440px;width:calc(100% - 36px);pointer-events:none';
      document.body.appendChild(container);
    }
    
    const card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;position:relative;overflow:hidden;border-radius:18px;padding:16px 18px;background:linear-gradient(150deg,' + color1 + 'E6,' + color2 + 'CC),linear-gradient(150deg,#0f1428,#06091a);background-blend-mode:overlay;border:1.5px solid ' + color1 + ';box-shadow:0 24px 60px rgba(0,0,0,.95);animation:notifSlide .35s cubic-bezier(.2,1,.3,1);display:flex;gap:14px;align-items:flex-start;backdrop-filter:blur(14px);cursor:pointer';
    
    const roleBadge = info.role === 'admin' ? '👑 অ্যাডমিন' : '👤 ইউজার';
    
    card.innerHTML =
      '<div style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:24px;flex-shrink:0;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4)">' + icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14.5px;font-weight:900;color:#fff;line-height:1.45;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          esc(title) +
          (extraBadge ? '<span style="font-size:11.5px;padding:3px 9px;border-radius:7px;background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.4);font-weight:800">' + extraBadge + '</span>' : '') +
        '</div>' +
        '<div style="display:grid;gap:5px;font-size:12.5px;color:#fff">' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">👤</span><span><b>' + esc(info.user) + '</b> <span style="opacity:.85;font-size:11.5px">(' + roleBadge + ')</span></span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">🏦</span><span>' + esc(info.branch) + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">📍</span><span>' + esc(info.location) + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">📱</span><span style="font-size:11.5px;opacity:.92">' + esc(info.device) + '</span></div>' +
          '<div style="display:flex;align-items:center;gap:8px"><span style="width:18px;text-align:center">🕐</span><span style="font-size:11.5px;opacity:.92">' + esc(info.time) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<button class="act-close" style="background:rgba(255,255,255,.18);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>' +
      '<div style="position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,.6);animation:notifProgress linear forwards;animation-duration:9000ms;width:100%"></div>';
    
    container.appendChild(card);
    
    const closeIt = () => {
      card.style.transition = 'all .3s';
      card.style.transform = 'translateX(420px)';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 320);
    };
    
    card.querySelector('.act-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeIt();
    });
    
    card.addEventListener('click', (e) => {
      if(e.target.closest('button')) return;
      closeIt();
    });
    
    setTimeout(closeIt, 9000);
    while(container.children.length > 5) container.firstChild.remove();
  } catch(e){}
}

window.__bumpActivity = function(){
  __activityCount++;
  const el = document.getElementById('activityCount');
  if(el) el.textContent = toBn(__activityCount);
};

/* ───── END OF FILE 06-realtime.js ───── */
console.log('✅ Realtime loaded');