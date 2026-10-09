/* ============================================================
   FILE: js/11-auto-screenshot.js — COMPLETE FRESH
   PURPOSE: Dashboard screenshot + auto daily + Telegram
   VERSION: v3.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════ */
var SS_LAST_KEY = 'cc_last_screenshot_date';
var SS_TIME_KEY = 'cc_screenshot_time';
var SS_DEFAULT_TIME = '19:00';
var TG_BOT_TOKEN_KEY = 'cc_tg_bot_token';
var TG_CHAT_ID_KEY = 'cc_tg_chat_id';
var SS_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function ssHasTakenToday(){
  try { return localStorage.getItem(SS_LAST_KEY) === todayStr(); }
  catch(e){ return false; }
}

function ssMarkTaken(){
  try { localStorage.setItem(SS_LAST_KEY, todayStr()); } catch(e){}
}

function ssGetTime(){
  try { return localStorage.getItem(SS_TIME_KEY) || SS_DEFAULT_TIME; }
  catch(e){ return SS_DEFAULT_TIME; }
}

function ssSetTime(t){
  try { localStorage.setItem(SS_TIME_KEY, t); } catch(e){}
}

function ssGetTgToken(){
  try { return localStorage.getItem(TG_BOT_TOKEN_KEY) || ''; }
  catch(e){ return ''; }
}

function ssGetTgChat(){
  try { return localStorage.getItem(TG_CHAT_ID_KEY) || ''; }
  catch(e){ return ''; }
}

/* ═══════════════════════════════════════════════════════════
   LOAD HTML2CANVAS DYNAMICALLY
   ═══════════════════════════════════════════════════════════ */
function ssLoadLib(cb){
  if(window.html2canvas){
    cb(true);
    return;
  }
  console.log('📥 Loading html2canvas...');

  // Try multiple CDNs
  var cdns = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
  ];

  var idx = 0;

  function tryNext(){
    if(idx >= cdns.length){
      console.error('❌ All CDNs failed');
      if(typeof toast === 'function') toast('❌ Library load হয়নি (internet চেক করুন)', 'err');
      cb(false);
      return;
    }

    var src = cdns[idx++];
    var s = document.createElement('script');
    s.src = src;
    s.onload = function(){
      console.log('✅ html2canvas loaded from:', src);
      cb(true);
    };
    s.onerror = function(){
      console.warn('⚠️ Failed:', src);
      tryNext();
    };
    document.head.appendChild(s);
  }

  tryNext();
}

/* ═══════════════════════════════════════════════════════════
   TAKE SCREENSHOT
   ═══════════════════════════════════════════════════════════ */
function ssTakeScreenshot(isAuto){
  if(!SESSION){
    if(typeof toast === 'function') toast('❌ Login করুন', 'err');
    return;
  }

  if(typeof toast === 'function') toast('📸 Screenshot নেওয়া হচ্ছে...', 'info');

  ssLoadLib(function(ok){
    if(!ok) return;

    try {
      var target = document.getElementById('app');
      if(!target) target = document.body;

      var origScroll = window.scrollY;
      window.scrollTo(0, 0);

      // Wait for scroll + render
      setTimeout(function(){
        // Full size
        var fullW = Math.max(target.scrollWidth, document.documentElement.scrollWidth, document.body.scrollWidth);
        var fullH = Math.max(target.scrollHeight, document.documentElement.scrollHeight, document.body.scrollHeight);

        window.html2canvas(target, {
          backgroundColor: '#0a0e1a',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: fullW,
          height: fullH,
          windowWidth: fullW,
          windowHeight: fullH,
          scrollX: 0,
          scrollY: 0
        }).then(function(canvas){
          console.log('✅ Canvas:', canvas.width, 'x', canvas.height);
          window.scrollTo(0, origScroll);

          canvas.toBlob(function(blob){
            if(!blob){
              if(typeof toast === 'function') toast('❌ Blob fail', 'err');
              return;
            }

            var today = todayStr();
            var time = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
            var filename = 'ccbank_dashboard_' + today + (isAuto ? '' : '_' + time) + '.png';

            // Download
            try {
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(function(){
                URL.revokeObjectURL(url);
                a.remove();
              }, 1500);
            } catch(e){
              console.warn('Download error:', e);
            }

            ssMarkTaken();

            // Telegram
            var tgToken = ssGetTgToken();
            var tgChat = ssGetTgChat();

            if(tgToken && tgChat){
              try {
                var fd = new FormData();
                fd.append('chat_id', tgChat);
                fd.append('photo', blob, filename);
                fd.append('caption',
                  '📸 Dashboard Screenshot\n' +
                  '📅 ' + today + '\n' +
                  '🕐 ' + new Date().toLocaleTimeString('en-GB') + '\n' +
                  '👤 ' + (SESSION ? SESSION.name : '—') +
                  '\n' + (isAuto ? '🤖 অটো' : '👤 ম্যানুয়াল'));
                fetch('https://api.telegram.org/bot' + tgToken + '/sendPhoto', {
                  method: 'POST',
                  body: fd
                }).then(function(r){ return r.json(); }).then(function(j){
                  if(j.ok) console.log('📤 Telegram sent');
                }).catch(function(){});
              } catch(e){}
            }

            if(typeof toast === 'function'){
              toast('📸 Screenshot সেভ হয়েছে\n📁 ' + filename, 'ok');
            }

            if(typeof logActivity === 'function'){
              logActivity('screenshot', '📸 Dashboard Screenshot',
                (isAuto ? '🤖 অটো' : '👤 ম্যানুয়াল') + ' — ' + filename);
            }

          }, 'image/png', 0.95);

        }).catch(function(err){
          console.error('html2canvas error:', err);
          window.scrollTo(0, origScroll);
          if(typeof toast === 'function') toast('❌ ' + err.message, 'err');
        });
      }, 400);

    } catch(e){
      console.error('Screenshot error:', e);
      if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTO BACKUP TIME CHECK
   ═══════════════════════════════════════════════════════════ */
function ssCheckTime(){
  if(!SESSION) return;
  if(ssHasTakenToday()) return;

  var now = new Date();
  var cur = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var target = ssGetTime();

  if(cur === target){
    console.log('⏰ Auto screenshot time');
    ssTakeScreenshot(true);
  }
}

setInterval(ssCheckTime, 60000);

/* ═══════════════════════════════════════════════════════════
   INJECT TOPBAR BUTTON
   ═══════════════════════════════════════════════════════════ */
function ssInjectButton(){
  if(!SESSION) return;

  var tbRight = document.querySelector('#topbar .tb-right');
  if(!tbRight) return;

  if(tbRight.querySelector('#screenshot-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'screenshot-btn';
  btn.className = 'tb-btn';
  btn.type = 'button';
  btn.title = 'Dashboard Screenshot';
  btn.style.cssText = 'background:linear-gradient(135deg,#06b6d4,#0891b2);padding:9px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:900';
  btn.innerHTML = '📸';
  btn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    ssTakeScreenshot(false);
  });

  tbRight.insertBefore(btn, tbRight.firstChild);
  console.log('✅ Screenshot button injected');
}

setInterval(ssInjectButton, 1000);
setTimeout(ssInjectButton, 100);
setTimeout(ssInjectButton, 500);

/* ═══════════════════════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════════════════════ */
function openScreenshotSettings(){
  if(!SESSION) return;

  var time = ssGetTime();
  var last = localStorage.getItem(SS_LAST_KEY) || '';
  var tgToken = ssGetTgToken();
  var tgChat = ssGetTgChat();

  var m = openModal({
    title: '📸 Screenshot Settings',
    bodyHTML:
      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(6,182,212,.1),rgba(0,0,0,.3));border:1.5px solid rgba(6,182,212,.4);margin-bottom:16px">' +
        '<div style="font-size:13px;color:#22d3ee;font-weight:900;margin-bottom:8px">📸 Daily Dashboard Screenshot</div>' +
        '<div style="font-size:12.5px;color:#a5b4d8;line-height:1.7">' +
          'প্রতিদিন <b style="color:#fff">নির্দিষ্ট সময়ে</b> dashboard এর screenshot নেবে।<br>' +
          '📥 Downloads folder এ save হবে<br>' +
          '📤 Telegram এ পাঠানো যাবে (optional)' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<label>🕐 Screenshot সময়</label>' +
        '<input type="time" id="ss-time" value="' + time + '">' +
      '</div>' +

      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.08),rgba(0,0,0,.3));border:1.5px solid rgba(59,130,246,.35);margin-bottom:14px">' +
        '<div style="font-size:13px;color:#93c5fd;font-weight:900;margin-bottom:10px">📤 Telegram (Optional)</div>' +
        '<div style="font-size:11.5px;color:#7a8ab8;line-height:1.6;margin-bottom:10px">' +
          '<b>1.</b> Telegram এ <b>@BotFather</b> → /newbot → token<br>' +
          '<b>2.</b> <b>@userinfobot</b> → /start → Chat ID' +
        '</div>' +
        '<div class="field"><label>Bot Token</label>' +
          '<input type="text" id="ss-tg-token" value="' + esc(tgToken) + '" placeholder="1234:ABC..." style="font-family:monospace;font-size:12px">' +
        '</div>' +
        '<div class="field" style="margin-bottom:0"><label>Chat ID</label>' +
          '<input type="text" id="ss-tg-chat" value="' + esc(tgChat) + '" placeholder="123456789" style="font-family:monospace;font-size:12px">' +
        '</div>' +
      '</div>' +

      '<div style="padding:12px 14px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:16px;font-size:12.5px;color:#a5b4d8">' +
        '<div style="display:flex;justify-content:space-between;padding:3px 0">' +
          '<span>সর্বশেষ নেওয়া:</span>' +
          '<b style="color:#fff">' + (last === todayStr() ? '✅ আজ' : (last ? toBn(last) : '❌ কখনো না')) + '</b>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;padding:3px 0">' +
          '<span>Telegram:</span>' +
          '<b style="color:' + (tgToken && tgChat ? '#4ade80' : '#7a8ab8') + '">' + (tgToken && tgChat ? '✅ Setup' : '⚪ নেই') + '</b>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button class="btn green" id="ss-save" style="flex:1;min-width:120px">💾 Save</button>' +
        '<button class="btn cyan" id="ss-now" style="flex:1;min-width:120px">📸 এখনই</button>' +
      '</div>' +
      '<button class="btn red" id="ss-reset" style="width:100%">🔄 Reset (আজকেও আবার)</button>',
    wide: true,
    onMount: function(root, close){
      root.querySelector('#ss-save').addEventListener('click', function(){
        var t = root.querySelector('#ss-time').value;
        var tk = root.querySelector('#ss-tg-token').value.trim();
        var tc = root.querySelector('#ss-tg-chat').value.trim();
        if(!t){ alert('⚠️ সময় দিন'); return; }
        ssSetTime(t);
        try {
          localStorage.setItem(TG_BOT_TOKEN_KEY, tk);
          localStorage.setItem(TG_CHAT_ID_KEY, tc);
        } catch(e){}
        toast('✅ Save হয়েছে', 'ok');
        close();
      });

      root.querySelector('#ss-now').addEventListener('click', function(){
        close();
        setTimeout(function(){ ssTakeScreenshot(false); }, 200);
      });

      root.querySelector('#ss-reset').addEventListener('click', function(){
        if(!confirm('🔄 Reset করলে আজকেও আবার auto screenshot হবে।')) return;
        localStorage.removeItem(SS_LAST_KEY);
        toast('✅ Reset', 'ok');
        close();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   DEBUG
   ═══════════════════════════════════════════════════════════ */
window.__screenshotStatus = function(){
  console.log('═══════════════════════════════════');
  console.log('📸 Screenshot Status');
  console.log('═══════════════════════════════════');
  console.log('html2canvas:', typeof window.html2canvas);
  console.log('Target time:', ssGetTime());
  console.log('Last taken:', localStorage.getItem(SS_LAST_KEY) || 'never');
  console.log('Today done:', ssHasTakenToday());
  console.log('Telegram token:', ssGetTgToken() ? '✓' : '✗');
  console.log('Telegram chat:', ssGetTgChat() ? '✓' : '✗');
  console.log('Button exists:', !!document.getElementById('screenshot-btn'));
  console.log('═══════════════════════════════════');
};

window.__screenshotNow = function(){ ssTakeScreenshot(false); };
window.__screenshotReset = function(){
  localStorage.removeItem(SS_LAST_KEY);
  console.log('✅ Reset');
};
window.__loadLib = function(){
  ssLoadLib(function(ok){ console.log('Lib load:', ok); });
};

console.log('✅ Screenshot module loaded — v3.0');