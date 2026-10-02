/* ============================================================
   FILE: managers/mgr-audit.js
   PURPOSE: 📜 অডিট লগ + Year Archive
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 AUDIT LOG MODAL
   ═══════════════════════════════════════════════════════════ */
function openAuditLogModal(){
  const logs = getAllTxLogs();
  const activity = getAllActivityLogs();
  
  if(!logs.length && !activity.length){
    openModal({
      title: '📜 ইতিহাস',
      wide: true,
      bodyHTML: '<div class="empty">📭 নেই</div>'
    });
    return;
  }
  
  let filterAction = 'all';
  let filterUser = 'all';
  let activeTab = 'txn';
  
  const actionLabels = {
    create: { label: '🆕 তৈরি', color: '#22c55e' },
    update: { label: '✏️ আপডেট', color: '#facc15' },
    delete: { label: '🗑️ ডিলিট', color: '#dc2626' },
    accept: { label: '✅ গ্রহণ', color: '#06b6d4' },
    collect: { label: '💰 সংগ্রহ', color: '#a78bfa' }
  };
  
  function buildTxn(){
    let filtered = logs.slice();
    if(filterAction !== 'all') filtered = filtered.filter(l => l.action === filterAction);
    if(filterUser !== 'all') filtered = filtered.filter(l => l.username === filterUser);
    
    if(!filtered.length) return '<div class="empty">📭 নেই</div>';
    
    return '<div style="max-height:60vh;overflow-y:auto">' +
      filtered.slice(0, 200).map(log => {
        const a = actionLabels[log.action] || { label: log.action, color: '#7a8ab8' };
        const tx = findTxAnywhere(log.txId)?.tx;
        const txLabel = tx ?
          (TX_CFG[tx.type]?.icon || '') + ' ' + (TX_CFG[tx.type]?.title || tx.type) :
          '❓';
        const txAmt = tx ? '৳ ' + fmt(tx.amount) : '—';
        
        return '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,#0f1428,#07091a);border:1px solid ' + a.color + '55;margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
            '<div>' +
              '<span style="padding:2px 9px;border-radius:5px;font-size:11px;font-weight:900;color:' + a.color + ';background:' + a.color + '22">' + a.label + '</span>' +
              '<div style="margin-top:6px;font-size:12.5px;color:#fff;font-weight:800">👤 ' + esc(log.user) + '</div>' +
              '<div style="font-size:11.5px;color:#a5b4d8">🏦 ' + esc(log.branch) + '</div>' +
              '<div style="margin-top:5px;font-size:12px;color:#fde047"><b>' + txLabel + '</b> • <b style="color:#4ade80">' + txAmt + '</b></div>' +
            '</div>' +
            '<div style="text-align:right;font-size:11px;color:#93c5fd;font-weight:700">' + esc(fmtDateTime(log.at)) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }
  
  function buildActivity(){
    let filtered = activity.slice();
    if(filterUser !== 'all') filtered = filtered.filter(l => l.username === filterUser);
    
    if(!filtered.length) return '<div class="empty">📭 নেই</div>';
    
    return '<div style="max-height:60vh;overflow-y:auto">' +
      filtered.slice(0, 200).map(log =>
        '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,#0f1428,#07091a);margin-bottom:8px">' +
          '<div style="font-size:13px;color:#fff;font-weight:800">' + esc(log.title || log.type) + '</div>' +
          (log.detail ? '<div style="font-size:12px;color:#a5b4d8;margin-top:4px">' + esc(log.detail) + '</div>' : '') +
          '<div style="font-size:11px;color:#93c5fd;margin-top:4px">👤 ' + esc(log.user) + ' • 🕐 ' + esc(fmtDateTime(log.at)) + '</div>' +
        '</div>'
      ).join('') +
    '</div>';
  }
  
  const users = [...new Set([
    ...logs.map(l => l.username),
    ...activity.map(l => l.username)
  ].filter(Boolean))];
  
  const userOptions = '<option value="all">— সব —</option>' +
    users.map(u => '<option value="' + esc(u) + '">' + esc(u) + '</option>').join('');
  
  openModal({
    title: '📜 সম্পূর্ণ ইতিহাস',
    xwide: true,
    bodyHTML:
      '<div class="db-tabs" style="margin-bottom:12px">' +
        '<button class="db-tab-btn active" data-hist-tab="txn">💸 লেনদেন <span class="cnt">' + toBn(logs.length) + '</span></button>' +
        '<button class="db-tab-btn" data-hist-tab="activity">🔔 অ্যাক্টিভিটি <span class="cnt">' + toBn(activity.length) + '</span></button>' +
      '</div>' +
      
      '<div class="form-row" style="margin-bottom:12px">' +
        '<div class="field" id="hf_action_wrap">' +
          '<label>কাজ</label>' +
          '<select id="al_action">' +
            '<option value="all">— সব —</option>' +
            '<option value="create">🆕</option>' +
            '<option value="update">✏️</option>' +
            '<option value="delete">🗑️</option>' +
            '<option value="accept">✅</option>' +
            '<option value="collect">💰</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>ইউজার</label>' +
          '<select id="al_user">' + userOptions + '</select>' +
        '</div>' +
      '</div>' +
      
      '<div id="al_body"></div>',
    
    onMount: (w) => {
      const bodyEl = w.querySelector('#al_body');
      
      function refresh(){
        bodyEl.innerHTML = activeTab === 'txn' ? buildTxn() : buildActivity();
      }
      
      w.querySelectorAll('[data-hist-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          w.querySelectorAll('[data-hist-tab]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeTab = btn.dataset.histTab;
          
          const aw = w.querySelector('#hf_action_wrap');
          aw.style.display = activeTab === 'activity' ? 'none' : '';
          
          refresh();
        });
      });
      
      w.querySelector('#al_action').addEventListener('change', e => {
        filterAction = e.target.value;
        refresh();
      });
      
      w.querySelector('#al_user').addEventListener('change', e => {
        filterUser = e.target.value;
        refresh();
      });
      
      refresh();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 YEAR ARCHIVE MODAL
   ═══════════════════════════════════════════════════════════ */
function openYearArchive(){
  if(!requireAdmin('আর্কাইভ')) return;
  
  const years = new Set();
  (DB().txs || []).forEach(t => {
    if(t.date) years.add(t.date.slice(0, 4));
  });
  Object.keys(DB().yearlyArchive || {}).forEach(y => years.add(y));
  
  const sorted = Array.from(years).sort().reverse();
  
  openModal({
    title: '📚 বছর আর্কাইভ',
    wide: true,
    bodyHTML: sorted.length ?
      '<div class="form-row">' +
        '<div class="field">' +
          '<label>বছর</label>' +
          '<select id="ya_year">' +
            sorted.map(y => '<option value="' + y + '">' + toBn(y) + '</option>').join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="ya_body" style="margin-top:14px"></div>'
      : '<div class="empty">📭 নেই</div>',
    
    onMount: (w) => {
      if(!sorted.length) return;
      
      function render(){
        const y = w.querySelector('#ya_year').value;
        w.querySelector('#ya_body').innerHTML = txListHTML(getAllTxsForYear(y), { admin: true });
        attachTxHistoryCustomerClick(w.querySelector('#ya_body'));
      }
      
      w.querySelector('#ya_year').addEventListener('change', render);
      render();
    }
  });
}

/* ───── END OF FILE managers/mgr-audit.js ───── */
console.log('✅ Manager Audit loaded');