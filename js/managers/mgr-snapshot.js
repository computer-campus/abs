/* ============================================================
   FILE: managers/mgr-snapshot.js
   PURPOSE: 📧 Email Snapshot + Notification Settings
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 SNAPSHOT SETTINGS
   ═══════════════════════════════════════════════════════════ */
function getDefaultSnapshotSettings(){
  return {
    enabled: false,
    email: DEFAULT_SNAPSHOT_EMAIL,
    accessKey: '',
    sendTime: DEFAULT_SNAPSHOT_TIME,
    createdAt: new Date().toISOString()
  };
}

function loadSnapshotSettings(){
  try{
    const raw = safeLS_get(SNAPSHOT_SETTINGS_KEY);
    if(raw){
      const o = JSON.parse(raw);
      return Object.assign(getDefaultSnapshotSettings(), o);
    }
  } catch(e){}
  return getDefaultSnapshotSettings();
}

function saveSnapshotSettings(s){
  try{
    safeLS_set(SNAPSHOT_SETTINGS_KEY, JSON.stringify(s));
    return true;
  } catch(e){
    return false;
  }
}

function openSnapshotSettings(){
  const s = loadSnapshotSettings();
  
  openModal({
    title: '📧 ডেইলি স্ন্যাপশট',
    wide: true,
    bodyHTML:
      '<div class="cust-box">' +
        '<div class="head"><h4>⚙️ কনফিগারেশন</h4></div>' +
        
        '<label class="online-tick-label" for="ss_enabled" style="margin-bottom:10px">' +
          '<input type="checkbox" id="ss_enabled" ' + (s.enabled ? 'checked' : '') + '>' +
          '<div class="online-tick-text">' +
            '<div class="title">✅ অটো পাঠানো</div>' +
          '</div>' +
        '</label>' +
        
        '<div class="form-row" style="margin-top:12px">' +
          '<div class="field">' +
            '<label>📧 ইমেইল</label>' +
            '<input type="email" id="ss_email" value="' + esc(s.email) + '" autocomplete="off">' +
          '</div>' +
          '<div class="field">' +
            '<label>🕐 সময়</label>' +
            '<input type="time" id="ss_time" value="' + esc(s.sendTime) + '">' +
          '</div>' +
        '</div>' +
        
        '<div class="field">' +
          '<label>🔑 Access Key</label>' +
          '<input type="text" id="ss_key" value="' + esc(s.accessKey) + '" placeholder="web3forms.com" style="font-family:monospace">' +
        '</div>' +
        
        '<div style="display:flex;gap:8px;margin-top:14px">' +
          '<button class="btn green" id="ss_save" style="flex:1">💾 সেভ</button>' +
        '</div>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#ss_save').addEventListener('click', () => {
        const newS = {
          enabled: w.querySelector('#ss_enabled').checked,
          email: w.querySelector('#ss_email').value.trim(),
          sendTime: w.querySelector('#ss_time').value || DEFAULT_SNAPSHOT_TIME,
          accessKey: w.querySelector('#ss_key').value.trim(),
          createdAt: s.createdAt || new Date().toISOString()
        };
        
        if(!newS.email){
          alert('❌ ইমেইল দিন');
          return;
        }
        
        if(saveSnapshotSettings(newS)){
          toast('✅ সেভ');
          close();
        }
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 NOTIFICATION SETTINGS
   ═══════════════════════════════════════════════════════════ */
function openNotifSettings(){
  openModal({
    title: '🔔 নোটিফিকেশন সেটিংস',
    bodyHTML:
      '<div class="cust-box">' +
        '<div class="head"><h4>⚙️ প্রেফারেন্স</h4></div>' +
        
        '<label class="online-tick-label" for="ns_sound" style="margin-bottom:10px">' +
          '<input type="checkbox" id="ns_sound" ' + (__soundEnabled ? 'checked' : '') + '>' +
          '<div class="online-tick-text">' +
            '<div class="title">🔊 সাউন্ড</div>' +
          '</div>' +
        '</label>' +
        
        '<label class="online-tick-label" for="ns_vib">' +
          '<input type="checkbox" id="ns_vib" ' + (__vibrationEnabled ? 'checked' : '') + '>' +
          '<div class="online-tick-text">' +
            '<div class="title">📳 ভাইব্রেশন</div>' +
          '</div>' +
        '</label>' +
      '</div>' +
      
      '<div class="cust-box" style="margin-top:14px">' +
        '<div class="head"><h4>🔬 পরীক্ষা</h4></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn green sm" id="ns_t_success">✅</button>' +
          '<button class="btn yellow sm" id="ns_t_warning">⚠️</button>' +
          '<button class="btn red sm" id="ns_t_danger">🚨</button>' +
          '<button class="btn sm" id="ns_t_info">ℹ️</button>' +
          '<button class="btn cyan sm" id="ns_t_transfer">🔁</button>' +
        '</div>' +
      '</div>' +
      
      '<div class="cust-box" style="margin-top:14px">' +
        '<div class="head"><h4>🔔 Browser Notification</h4></div>' +
        '<div style="font-size:13px;color:#a5b4d8;line-height:1.7;margin-bottom:10px">' +
          'Status: <b id="ns_perm" style="color:#fff">' +
            (typeof Notification !== 'undefined' ? Notification.permission : 'N/A') +
          '</b>' +
        '</div>' +
        '<button class="btn purple block sm" id="ns_request">🔔 Allow Notification</button>' +
      '</div>',
    
    onMount: (w) => {
      const sCb = w.querySelector('#ns_sound');
      const vCb = w.querySelector('#ns_vib');
      
      sCb.addEventListener('change', () => {
        __soundEnabled = sCb.checked;
        saveNotifPrefs();
      });
      
      vCb.addEventListener('change', () => {
        __vibrationEnabled = vCb.checked;
        saveNotifPrefs();
      });
      
      const test = (type) => {
        showNotifToast({
          type,
          icon: ({ success: '✅', warning: '⚠️', danger: '🚨', info: 'ℹ️', transfer: '🔁' })[type],
          badge: 'পরীক্ষা',
          title: '🔔 টেস্ট',
          body: '<b>পরীক্ষা</b><br><span class="notif-amt">৳ 1,234.00</span>',
          duration: 5000
        });
      };
      
      w.querySelector('#ns_t_success').addEventListener('click', () => test('success'));
      w.querySelector('#ns_t_warning').addEventListener('click', () => test('warning'));
      w.querySelector('#ns_t_danger').addEventListener('click', () => test('danger'));
      w.querySelector('#ns_t_info').addEventListener('click', () => test('info'));
      w.querySelector('#ns_t_transfer').addEventListener('click', () => test('transfer'));
      
      w.querySelector('#ns_request').addEventListener('click', async () => {
        const p = await requestNotifPermission();
        w.querySelector('#ns_perm').textContent =
          typeof Notification !== 'undefined' ? Notification.permission : 'N/A';
        toast(p ? '✅ Enabled' : '❌ Denied');
      });
    }
  });
}

/* ───── END OF FILE managers/mgr-snapshot.js ───── */
console.log('✅ Manager Snapshot + Notif Settings loaded');