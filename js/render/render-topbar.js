/* ============================================================
   FILE: render/render-topbar.js
   PURPOSE: Topbar with user info, branch select, clock
   VERSION: v7.2
   ============================================================ */

'use strict';

function renderTopbar(){
  if(!session) return;
  
  const bf = currentBranchFilter();
  const bl = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || bf);
  const isAdminUser = session.role === 'admin';
  
  $('#topbar').innerHTML =
    '<div class="tb-left">' +
      '<button class="tb-menu-btn" id="btnMenu">☰</button>' +
      '<div class="brand">' +
        '<div class="logo">' +
          '<svg viewBox="0 0 100 100" style="width:40px;height:40px;">' +
            '<circle cx="50" cy="50" r="47" fill="#000" stroke="#fff" stroke-width="3"/>' +
            '<g transform="translate(50,50)" fill="#fff">' +
              '<path d="M -22 -12 L 0 -28 L 22 -12 Z"/>' +
              '<rect x="-18" y="-8" width="4" height="22" rx="1"/>' +
              '<rect x="-8" y="-8" width="4" height="22" rx="1"/>' +
              '<rect x="4" y="-8" width="4" height="22" rx="1"/>' +
              '<rect x="14" y="-8" width="4" height="22" rx="1"/>' +
              '<rect x="-22" y="14" width="44" height="4" rx="1.5"/>' +
            '</g>' +
          '</svg>' +
        '</div>' +
        '<div>' +
          '<h1 class="rgb">কম্পিউটার ক্যাম্পাস</h1>' +
          '<p>কলারোয়া আউটলেট • ঝাউডাঙ্গা আউটলেট</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    
    '<div class="tb-right">' +
      '<span class="presence-badge" id="presenceBadge">👥 <b id="presenceCount">০</b></span>' +
      '<span class="presence-badge" id="activityBadge" style="background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.5);color:#4ade80;cursor:pointer">🔔 <b id="activityCount">০</b></span>' +
      '<span class="queue-badge" id="queueBadge"><span class="sync-spinner"></span>⏳ <b id="queueCount">০</b></span>' +
      
      (isAdminUser ?
        '<select class="tb-select" id="tbBranchSel">' +
          '<option value="all" ' + (viewBranch === 'all' ? 'selected' : '') + '>🏦 উভয় আউটলেট</option>' +
          '<option value="kalaroa" ' + (viewBranch === 'kalaroa' ? 'selected' : '') + '>🏦 কলারোয়া</option>' +
          '<option value="jhaudanga" ' + (viewBranch === 'jhaudanga' ? 'selected' : '') + '>🏦 ঝাউডাঙ্গা</option>' +
        '</select>'
        : '<span class="tb-branch">🏦 <b>' + esc(bl) + '</b></span>') +
      
      '<input type="date" class="tb-date" id="dashDateInput" value="' + dashDate + '">' +
      '<span class="tb-time"><span class="dot"></span><span id="liveClock">--:--:--</span></span>' +
    '</div>';
  
  // Event listeners
  $('#dashDateInput').addEventListener('change', e => {
    dashDate = e.target.value || todayStr();
    isDateViewMode = dashDate !== todayStr();
    renderDashboard(true);
  });
  
  const btnMenu = document.getElementById('btnMenu');
  if(btnMenu) btnMenu.addEventListener('click', openSidebar);
  
  const bs = document.getElementById('tbBranchSel');
  if(bs){
    bs.addEventListener('change', e => {
      viewBranch = e.target.value;
      renderTopbar();
      renderDashboard(true);
      renderSidebar();
    });
  }
  
  const qb = document.getElementById('queueBadge');
  if(qb) qb.addEventListener('click', () => forceSyncNow());
  
  const ab = document.getElementById('activityBadge');
  if(ab){
    ab.addEventListener('click', () => {
      __activityCount = 0;
      const el = document.getElementById('activityCount');
      if(el) el.textContent = '০';
      openAuditLogModal();
    });
  }
  
  updateQueueBadge();
  startClock();
}

/* ───── END OF FILE render/render-topbar.js ───── */
console.log('✅ Render Topbar loaded');