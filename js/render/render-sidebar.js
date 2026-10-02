/* ============================================================
   FILE: render/render-sidebar.js
   PURPOSE: Sidebar menu
   VERSION: v7.2
   ============================================================ */

'use strict';

function renderSidebar(){
  if(!session) return;
  
  const isAdminUser = session.role === 'admin';
  const bf = currentBranchFilter();
  const pendingAll = getAllPending();
  const totalPendingCount = pendingAll.totalCount;
  const box = document.getElementById('sidebarBody');
  if(!box) return;
  
  box.innerHTML =
    '<div class="sb-user">' +
      '<div class="name">👤 ' + esc(session.name) + '</div>' +
      '<div class="role">' + (isAdminUser ? '👑 অ্যাডমিন' : '👤 ইউজার') +
        ' • ' + esc(bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || bf)) +
      '</div>' +
    '</div>' +
    
    '<div class="sb-section">📊 ড্যাশবোর্ড</div>' +
    '<button class="sb-btn primary" data-sb="all-data">' +
      '<span class="sb-ico">📋</span>' +
      '<span class="sb-lbl">সব ডেটা<span class="sb-sub">সম্পূর্ণ লেনদেন</span></span>' +
    '</button>' +
    '<button class="sb-btn warn" data-sb="due-list">' +
      '<span class="sb-ico">🤝</span>' +
      '<span class="sb-lbl">সাপোর্ট বকেয়া<span class="sb-sub">গ্রাহক বকেয়া</span></span>' +
    '</button>' +
    '<button class="sb-btn" data-sb="all-pending" style="border-color:rgba(220,38,38,.5)">' +
      '<span class="sb-ico">⏳</span>' +
      '<span class="sb-lbl" style="color:#ef4444">অপেক্ষমাণ</span>' +
      (totalPendingCount > 0 ? '<span class="sb-badge">' + toBn(totalPendingCount) + '</span>' : '') +
    '</button>' +
    
    '<div class="sb-section">🖨️ প্রিন্ট (A4)</div>' +
    '<button class="sb-btn primary" data-sb="print-dashboard">' +
      '<span class="sb-ico">🖨️</span>' +
      '<span class="sb-lbl">ড্যাশবোর্ড প্রিন্ট</span>' +
    '</button>' +
    
    '<div class="sb-section">📜 অডিট ট্রেইল</div>' +
    '<button class="sb-btn primary" data-sb="audit-log">' +
      '<span class="sb-ico">📜</span>' +
      '<span class="sb-lbl">সম্পূর্ণ ইতিহাস</span>' +
    '</button>' +
    
    (isAdminUser ?
      '<div class="sb-section">⚙️ ম্যানেজমেন্ট</div>' +
      '<button class="sb-btn" data-sb="branch-mgmt">' +
        '<span class="sb-ico">🏢</span>' +
        '<span class="sb-lbl">আউটলেট ম্যানেজমেন্ট</span>' +
      '</button>' +
      '<button class="sb-btn" data-sb="user-mgr">' +
        '<span class="sb-ico">👥</span>' +
        '<span class="sb-lbl">ইউজার ম্যানেজমেন্ট</span>' +
      '</button>' +
      '<button class="sb-btn primary" data-sb="backup">' +
        '<span class="sb-ico">💾</span>' +
        '<span class="sb-lbl">ব্যাকআপ ম্যানেজার<span class="sb-sub">Complete Reset</span></span>' +
      '</button>' +
      '<button class="sb-btn" data-sb="db-browser">' +
        '<span class="sb-ico">🗄️</span>' +
        '<span class="sb-lbl">ডেটাবেস ব্রাউজার<span class="sb-sub">Full Control + Export/Import</span></span>' +
      '</button>' +
      '<button class="sb-btn" data-sb="year-archive">' +
        '<span class="sb-ico">📚</span>' +
        '<span class="sb-lbl">বছর আর্কাইভ</span>' +
      '</button>'
      : '') +
    
    '<div class="sb-section">📧 ইমেইল রিপোর্ট</div>' +
    '<button class="sb-btn primary" data-sb="snapshot-settings">' +
      '<span class="sb-ico">📧</span>' +
      '<span class="sb-lbl">ডেইলি স্ন্যাপশট</span>' +
    '</button>' +
    
    '<div class="sb-section">🔔 নোটিফিকেশন</div>' +
    '<button class="sb-btn" data-sb="notif-settings">' +
      '<span class="sb-ico">🔔</span>' +
      '<span class="sb-lbl">নোটিফিকেশন সেটিংস</span>' +
    '</button>' +
    
    '<div class="sb-section">🖥️ সেশন</div>' +
    '<button class="sb-btn danger" data-sb="logout">' +
      '<span class="sb-ico">🚪</span>' +
      '<span class="sb-lbl">লগআউট</span>' +
    '</button>';
}

/* ───── END OF FILE render/render-sidebar.js ───── */
console.log('✅ Render Sidebar loaded');