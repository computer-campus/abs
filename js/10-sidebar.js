/* ============================================================
   FILE: js/10-sidebar.js
   PURPOSE: Sidebar functions (override)
   ============================================================ */
'use strict';

function renderSidebar(){
  if(!SESSION) return;

  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sb-overlay');
  var app = document.getElementById('app');
  var topbar = document.getElementById('topbar');
  var main = document.querySelector('main');

  // ═══════════════════════════════════════════════════════════
  // USER MODE — Sidebar সম্পূর্ণ hide
  // ═══════════════════════════════════════════════════════════
  if(SESSION.role === 'user'){
    document.body.classList.add('user-mode');

    if(sidebar){
      sidebar.style.cssText = 'display:none !important;visibility:hidden !important;width:0 !important;max-width:0 !important;overflow:hidden !important;position:absolute !important;left:-9999px !important;';
    }
    if(overlay){
      overlay.style.cssText = 'display:none !important;visibility:hidden !important;width:0 !important;';
    }
    if(app){
      app.style.cssText = 'margin-left:0 !important;margin-right:0 !important;width:100% !important;max-width:100% !important;padding-left:0 !important;';
    }
    if(topbar){
      topbar.style.cssText = 'padding-left:20px !important;padding-right:20px !important;';
    }
    if(main){
      main.style.cssText = 'margin-left:0 !important;margin-right:0 !important;max-width:100% !important;width:100% !important;padding:20px !important;padding-bottom:100px !important;';
    }

    return;
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN MODE — Sidebar দেখাও
  // ═══════════════════════════════════════════════════════════
  document.body.classList.remove('user-mode');

  if(sidebar) sidebar.style.cssText = '';
  if(overlay) overlay.style.cssText = '';
  if(app) app.style.cssText = '';
  if(topbar) topbar.style.cssText = '';
  if(main) main.style.cssText = '';

  // ─── Header ───
  var headEl = document.querySelector('#sidebar .sb-head');
  if(headEl){
    headEl.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;row-gap:6px;padding:11px 13px;border-radius:12px;background:linear-gradient(145deg, rgba(59,130,246,.15), rgba(167,139,250,.08));border:1.5px solid rgba(59,130,246,.4);box-shadow:0 4px 12px rgba(0,0,0,.3)">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:16px;line-height:1">📅</span>' +
          '<span id="sb-date" style="font-size:13px;color:#93c5fd;font-weight:900;white-space:nowrap">--/--/----</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:16px;line-height:1">🕐</span>' +
          '<span id="sb-time" style="font-size:13px;color:#facc15;font-weight:900;white-space:nowrap">--:--:-- --</span>' +
        '</div>' +
        '<button onclick="closeSidebar()" style="margin-left:auto;padding:4px 9px;border-radius:7px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5);color:#f87171;font-family:inherit;font-size:11px;font-weight:900;cursor:pointer">✕</button>' +
      '</div>';
    startSidebarClock();
  }

  // ─── Body ───
  var bodyHTML = '';
  bodyHTML += '<div class="sb-user">';
  bodyHTML += '<div class="name">👤 ' + esc(SESSION.name) + '</div>';
  bodyHTML += '<div class="role">👑 অ্যাডমিন • ' + esc(currentBranch() === 'all' ? 'সব' : (BRANCHES[currentBranch()]?.name || '')) + '</div>';
  bodyHTML += '</div>';
  bodyHTML += '<div class="sb-section">ড্যাশবোর্ড</div>';
  bodyHTML += '<button class="sb-btn" onclick="openAllData()">📋 সব ডেটা</button>';
  bodyHTML += '<button class="sb-btn" onclick="openDueList()">🤝 বকেয়া তালিকা</button>';
  bodyHTML += '<button class="sb-btn" onclick="openAuditLog()">📜 অডিট লগ</button>';
  bodyHTML += '<div class="sb-section">ম্যানেজমেন্ট</div>';
  bodyHTML += '<button class="sb-btn" onclick="openBranchMgmt()">🏢 আউটলেট ম্যানেজমেন্ট</button>';
  bodyHTML += '<button class="sb-btn" onclick="openUserMgmt()">👥 ইউজার ম্যানেজমেন্ট</button>';
  bodyHTML += '<button class="sb-btn" onclick="openBackupMgmt()">💾 ব্যাকআপ / রিস্টোর</button>';
  bodyHTML += '<button class="sb-btn" onclick="openDangerZone()">🚨 ডেঞ্জার জোন</button>';
  bodyHTML += '<div class="sb-section">সেশন</div>';
  bodyHTML += '<button class="sb-btn danger" onclick="doLogout()">🚪 লগআউট</button>';

  var bodyEl = document.getElementById('sb-body');
  if(bodyEl) bodyEl.innerHTML = bodyHTML;
}

function startSidebarClock(){
  if(window.__sbClockTimer) clearInterval(window.__sbClockTimer);

  function tick(){
    var dateEl = document.getElementById('sb-date');
    var timeEl = document.getElementById('sb-time');
    if(!dateEl || !timeEl) return;

    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    dateEl.textContent = toBn(dd + '/' + mm + '/' + yyyy);

    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    timeEl.textContent = toBn(String(h).padStart(2, '0') + ':' + m + ':' + s) + ' ' + ampm;
  }

  tick();
  window.__sbClockTimer = setInterval(tick, 1000);
}

function openSidebar(){
  var el = document.getElementById('sidebar');
  if(el) el.classList.add('open');
  var ov = document.getElementById('sb-overlay');
  if(ov) ov.classList.add('on');
}

function closeSidebar(){
  var el = document.getElementById('sidebar');
  if(el) el.classList.remove('open');
  var ov = document.getElementById('sb-overlay');
  if(ov) ov.classList.remove('on');
}

console.log('✅ Sidebar module loaded');