/* ============================================================
   FILE: js/11-auto-screenshot.js
   PURPOSE: Daily auto screenshot + desktop save
   VERSION: v1.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════ */
const SCREENSHOT_LAST_KEY = 'cc_last_screenshot_date';
const SCREENSHOT_TIME_KEY = 'cc_screenshot_time';
const SCREENSHOT_DEFAULT_TIME = '19:00';  // সন্ধ্যা ৭টা

/* ═══════════════════════════════════════════════════════════
   CHECK — আজ নেওয়া হয়েছে কি না
   ═══════════════════════════════════════════════════════════ */
function hasTakenScreenshotToday(){
  try {
    var last = localStorage.getItem(SCREENSHOT_LAST_KEY);
    var today = todayStr();
    return last === today;
  } catch(e){
    return false;
  }
}

function markScreenshotTaken(){
  try {
    localStorage.setItem(SCREENSHOT_LAST_KEY, todayStr());
  } catch(e){}
}

function getScreenshotTime(){
  try {
    return localStorage.getItem(SCREENSHOT_TIME_KEY) || SCREENSHOT_DEFAULT_TIME;
  } catch(e){
    return SCREENSHOT_DEFAULT_TIME;
  }
}

function setScreenshotTime(t){
  try {
    localStorage.setItem(SCREENSHOT_TIME_KEY, t);
  } catch(e){}
}

/* ═══════════════════════════════════════════════════════════
   LOAD html2canvas (dynamic)
   ═══════════════════════════════════════════════════════════ */
function loadHtml2Canvas(callback){
  if(window.html2canvas){
    callback();
    return;
  }

  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = function(){
    console.log('✅ html2canvas loaded');
    callback();
  };
  script.onerror = function(){
    console.error('❌ html2canvas load failed');
    if(typeof toast === 'function') toast('❌ Screenshot library load হয়নি', 'err');
  };
  document.head.appendChild(script);
}

/* ═══════════════════════════════════════════════════════════
   TAKE SCREENSHOT
   ═══════════════════════════════════════════════════════════ */
async function takeDashboardScreenshot(isAuto){
  if(!SESSION){
    if(typeof toast === 'function') toast('❌ Login করুন');
    return false;
  }

  // Library load
  loadHtml2Canvas(async function(){
    try {
      if(typeof toast === 'function'){
        toast('📸 Screenshot নেওয়া হচ্ছে...', 'info');
      }

      // Main element to capture
      var mainEl = document.getElementById('main');
      if(!mainEl){
        if(typeof toast === 'function') toast('❌ Main element পাওয়া যায়নি', 'err');
        return;
      }

      // Store current scroll
      var originalScroll = window.scrollY;

      // Scroll to top for full capture
      window.scrollTo(0, 0);

      // Wait for scroll
      await new Promise(function(r){ setTimeout(r, 300); });

      // Options
      var canvas = await window.html2canvas(mainEl, {
        backgroundColor: '#0a0e1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: mainEl.scrollWidth,
        windowHeight: mainEl.scrollHeight,
        height: mainEl.scrollHeight,
        width: mainEl.scrollWidth
      });

      // Restore scroll
      window.scrollTo(0, originalScroll);

      // Convert to Blob
      canvas.toBlob(function(blob){
        if(!blob){
          if(typeof toast === 'function') toast('❌ Blob তৈরি হয়নি', 'err');
          return;
        }

        // Filename
        var today = todayStr();
        var time = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
        var filename = 'ccbank_dashboard_' + today + (isAuto ? '' : '_' + time) + '.png';

        // Download
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

        // Mark as taken
        markScreenshotTaken();

        console.log('📸 Screenshot saved:', filename);
        if(typeof toast === 'function'){
          toast('📸 Dashboard screenshot নেওয়া হয়েছে\n📁 ' + filename, 'ok');
        }

        // Log activity
        if(typeof logActivity === 'function'){
          logActivity('screenshot', '📸 Dashboard Screenshot',
            (isAuto ? '🤖 অটো' : '👤 ম্যানুয়াল') + ' — ' + filename);
        }

      }, 'image/png');

    } catch(e){
      console.error('Screenshot error:', e);
      if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   TIME CHECK — প্রতি মিনিটে
   ═══════════════════════════════════════════════════════════ */
function checkScreenshotTime(){
  if(!SESSION) return;
  if(hasTakenScreenshotToday()) return;

  var now = new Date();
  var currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var targetTime = getScreenshotTime();

  if(currentTime === targetTime){
    console.log('⏰ Auto screenshot time reached');
    takeDashboardScreenshot(true);
  }
}

// Run every minute
setInterval(checkScreenshotTime, 60000);

/* ═══════════════════════════════════════════════════════════
   TOPBAR BUTTON — Manual Screenshot
   ═══════════════════════════════════════════════════════════ */
function injectScreenshotButton(){
  var tbRight = document.querySelector('#topbar .tb-right');
  if(!tbRight) return;
  if(tbRight.querySelector('#screenshot-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'screenshot-btn';
  btn.className = 'tb-btn';
  btn.style.cssText = 'background:linear-gradient(135deg,#06b6d4,#0891b2);padding:9px 12px';
  btn.title = 'Dashboard Screenshot';
  btn.innerHTML = '📸';
  btn.addEventListener('click', function(){
    takeDashboardScreenshot(false);
  });

  // Insert after bell or at start
  var bell = tbRight.querySelector('#notif-bell');
  if(bell && bell.nextSibling){
    tbRight.insertBefore(btn, bell.nextSibling);
  } else {
    tbRight.insertBefore(btn, tbRight.firstChild);
  }
}

setInterval(function(){
  if(SESSION) injectScreenshotButton();
}, 1500);

/* ═══════════════════════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════════════════════ */
function openScreenshotSettings(){
  if(!SESSION) return;

  var time = getScreenshotTime();
  var last = localStorage.getItem(SCREENSHOT_LAST_KEY) || 'কখনো না';

  openModal({
    title: '📸 Auto Screenshot Settings',
    bodyHTML:
      '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(6,182,212,.1),rgba(0,0,0,.3));border:1.5px solid rgba(6,182,212,.4);margin-bottom:16px">' +
        '<div style="font-size:13px;color:#22d3ee;font-weight:900;margin-bottom:10px">📸 Daily Screenshot</div>' +
        '<div style="font-size:12.5px;color:#a5b4d8;line-height:1.7">' +
          'প্রতিদিন <b style="color:#fff">নির্দিষ্ট সময়ে</b> dashboard এর screenshot ' +
          'স্বয়ংক্রিয়ভাবে আপনার ডেস্কটপে save হবে।' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<label>🕐 Screenshot সময়</label>' +
        '<input type="time" id="ss-time" value="' + time + '">' +
      '</div>' +

      '<div style="padding:12px 14px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:16px;font-size:12.5px;color:#a5b4d8">' +
        '<div style="display:flex;justify-content:space-between;padding:3px 0">' +
          '<span>সর্বশেষ নেওয়া:</span>' +
          '<b style="color:#fff">' + (last === todayStr() ? '✅ আজ নেওয়া হয়েছে' : (last === 'কখনো না' ? '❌ কখনো না' : toBn(last))) + '</b>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn green" id="ss-save" style="flex:1;min-width:120px">💾 Save</button>' +
        '<button class="btn cyan" id="ss-now" style="flex:1;min-width:120px">📸 এখনই নাও</button>' +
      '</div>' +
      '<button class="btn gray" id="ss-reset" style="width:100%;margin-top:10px">🔄 Reset (আবার auto চালু)</button>',
    wide: true,
    onMount: function(root, close){
      root.querySelector('#ss-save').addEventListener('click', function(){
        var t = root.querySelector('#ss-time').value;
        if(!t){
          alert('⚠️ সময় দিন');
          return;
        }
        setScreenshotTime(t);
        toast('✅ সময় saved: ' + t, 'ok');
        close();
      });

      root.querySelector('#ss-now').addEventListener('click', function(){
        close();
        setTimeout(function(){
          takeDashboardScreenshot(false);
        }, 200);
      });

      root.querySelector('#ss-reset').addEventListener('click', function(){
        if(!confirm('🔄 Reset করলে আজকেও আবার auto screenshot নেবে। চালিয়ে যাবেন?')) return;
        localStorage.removeItem(SCREENSHOT_LAST_KEY);
        toast('✅ Reset হয়েছে', 'ok');
        close();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   DEBUG HELPERS
   ═══════════════════════════════════════════════════════════ */
window.__screenshotStatus = function(){
  console.log('═══════════════════════════════════');
  console.log('📸 Screenshot Status');
  console.log('═══════════════════════════════════');
  console.log('Target time:', getScreenshotTime());
  console.log('Last taken:', localStorage.getItem(SCREENSHOT_LAST_KEY) || 'never');
  console.log('Taken today:', hasTakenScreenshotToday());
  console.log('Library loaded:', !!window.html2canvas);
  console.log('═══════════════════════════════════');
};

window.__screenshotNow = function(){
  takeDashboardScreenshot(false);
};

window.__screenshotReset = function(){
  localStorage.removeItem(SCREENSHOT_LAST_KEY);
  console.log('✅ Reset — next check এ auto screenshot হবে');
};

console.log('✅ Auto-screenshot module loaded');