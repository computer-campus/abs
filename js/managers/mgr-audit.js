/* ============================================================
   FILE: managers/mgr-audit.js
   PURPOSE: 📜 অডিট লগ + Year Archive + Clear All
   VERSION: v10.1
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 AUDIT LOG MODAL
   ═══════════════════════════════════════════════════════════ */
function openAuditLogModal(){
  const logs = getAllTxLogs();
  const activity = getAllActivityLogs();
  
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
  
  const MAX_ROWS = 100;
  
  function buildTxn(){
    const filtered = [];
    const len = logs.length;
    
    for(let i = 0; i < len && filtered.length < MAX_ROWS; i++){
      const l = logs[i];
      if(filterAction !== 'all' && l.action !== filterAction) continue;
      if(filterUser !== 'all' && l.username !== filterUser) continue;
      filtered.push(l);
    }
    
    if(!filtered.length) return '<div class="empty">📭 নেই</div>';
    
    let html = '<div style="max-height:60vh;overflow-y:auto">';
    
    for(let i = 0; i < filtered.length; i++){
      const log = filtered[i];
      const a = actionLabels[log.action] || { label: log.action, color: '#7a8ab8' };
      const tx = findTxAnywhere(log.txId)?.tx;
      const txLabel = tx ?
        (TX_CFG[tx.type]?.icon || '') + ' ' + (TX_CFG[tx.type]?.title || tx.type) :
        '❓';
      const txAmt = tx ? '৳ ' + fmt(tx.amount) : '—';
      
      html += '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,#0f1428,#07091a);border:1px solid ' + a.color + '55;margin-bottom:10px">' +
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
    }
    
    html += '</div>';
    
    if(logs.length > MAX_ROWS){
      html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ' + toBn(MAX_ROWS) + ' দেখানো হচ্ছে (মোট ' + toBn(logs.length) + ')</div>';
    }
    
    return html;
  }
  
  function buildActivity(){
    const filtered = [];
    const len = activity.length;
    
    for(let i = 0; i < len && filtered.length < MAX_ROWS; i++){
      const l = activity[i];
      if(filterUser !== 'all' && l.username !== filterUser) continue;
      filtered.push(l);
    }
    
    if(!filtered.length) return '<div class="empty">📭 নেই</div>';
    
    let html = '<div style="max-height:60vh;overflow-y:auto">';
    
    for(let i = 0; i < filtered.length; i++){
      const log = filtered[i];
      html += '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,#0f1428,#07091a);margin-bottom:8px">' +
        '<div style="font-size:13px;color:#fff;font-weight:800">' + esc(log.title || log.type) + '</div>' +
        (log.detail ? '<div style="font-size:12px;color:#a5b4d8;margin-top:4px">' + esc(log.detail) + '</div>' : '') +
        '<div style="font-size:11px;color:#93c5fd;margin-top:4px">👤 ' + esc(log.user) + ' • 🕐 ' + esc(fmtDateTime(log.at)) + '</div>' +
      '</div>';
    }
    
    html += '</div>';
    
    if(activity.length > MAX_ROWS){
      html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ' + toBn(MAX_ROWS) + ' দেখানো হচ্ছে (মোট ' + toBn(activity.length) + ')</div>';
    }
    
    return html;
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
      // ═══════ TOP TABS + CLEAR BUTTON ═══════
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
        '<div class="db-tabs" style="flex:1;margin-bottom:0;border:none;padding-bottom:0">' +
          '<button class="db-tab-btn active" data-hist-tab="txn">📜 অডিট <span class="cnt">' + toBn(logs.length) + '</span></button>' +
          '<button class="db-tab-btn" data-hist-tab="activity">🔔 অ্যাক্টিভিটি <span class="cnt">' + toBn(activity.length) + '</span></button>' +
        '</div>' +
        '<button type="button" id="audit_clear_all" style="padding:10px 16px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);border:none;color:#fff;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;box-shadow:0 4px 12px rgba(220,38,38,.4)">' +
          '🗑️ সব Clear' +
        '</button>' +
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
    
    onMount: (w, close) => {
      const bodyEl = w.querySelector('#al_body');
      
      let refreshTimer = null;
      function refresh(){
        if(refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          refreshTimer = null;
          try{
            bodyEl.innerHTML = activeTab === 'txn' ? buildTxn() : buildActivity();
          } catch(e){
            console.error(e);
            bodyEl.innerHTML = '<div class="empty" style="color:#f87171">❌ ' + esc(e.message) + '</div>';
          }
        }, 30);
      }
      
      // ═══════ TABS ═══════
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
      
      // ═══════ FILTERS ═══════
      w.querySelector('#al_action').addEventListener('change', e => {
        filterAction = e.target.value;
        refresh();
      });
      
      w.querySelector('#al_user').addEventListener('change', e => {
        filterUser = e.target.value;
        refresh();
      });
      
      // ═══════════════════════════════════════════════════════════
      // 🗑️ CLEAR ALL — One Click
      // ═══════════════════════════════════════════════════════════
      const clearBtn = w.querySelector('#audit_clear_all');
      clearBtn.addEventListener('click', async () => {
        const txCount = (DB().txEditLog || []).length;
        const actCount = (DB().activityLog || []).length;
        const totalCount = txCount + actCount;
        
        if(totalCount === 0){
          toast('ℹ️ ইতিমধ্যে খালি');
          return;
        }
        
        // ⚡ Step 1: Confirmation
        const confirmed = confirm(
          '⚠️ সব লগ Clear করবেন?\n\n' +
          '═══════════════════════════\n' +
          '📜 অডিট লগ: ' + toBn(txCount) + ' টি\n' +
          '🔔 অ্যাক্টিভিটি: ' + toBn(actCount) + ' টি\n' +
          '═══════════════════════════\n' +
          '📊 মোট: ' + toBn(totalCount) + ' টি\n\n' +
          '⚠️ এটা undo করা যাবে না!\n' +
          '💾 আগে Backup নেওয়ার কথা ভাবুন।\n\n' +
          'চালিয়ে যাবেন?'
        );
        
        if(!confirmed) return;
        
        // ⚡ Step 2: Type confirmation
        const typed = prompt(
          '🔒 চূড়ান্ত নিশ্চয়তা\n\n' +
          'টাইপ করুন: CLEAR\n\n' +
          '(ছোট-বড় হাতের অক্ষর একই)'
        );
        
        if(!typed || typed.toUpperCase() !== 'CLEAR'){
          toast('❌ বাতিল');
          return;
        }
        
        // ⚡ Step 3: Show loading
        clearBtn.disabled = true;
        const origHtml = clearBtn.innerHTML;
        clearBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite"></span> Clear হচ্ছে...';
        
        try{
          // ⚡ Clear both logs
          DB().txEditLog = [];
          DB().activityLog = [];
          
          // ⚡ Add ONE entry to keep track (optional)
          if(!DB().activityLog) DB().activityLog = [];
          DB().activityLog.push({
            id: uid(),
            type: 'log_cleared',
            title: '🗑️ সব লগ Clear',
            detail: toBn(txCount) + ' অডিট + ' + toBn(actCount) + ' অ্যাক্টিভিটি মুছে ফেলা হয়েছে',
            user: session?.name || 'system',
            username: session?.username || '',
            role: session?.role || 'admin',
            branch: '—',
            device: getDeviceName(),
            location: (window.__geoCache && window.__geoCache.label) || '',
            at: new Date().toISOString()
          });
          
          // ⚡ Force timestamp update
          if(DB()) DB().__lastUpdate = new Date().toISOString();
          
          // ⚡ Save & Sync
          try{ saveLocalDB(); } catch(e){}
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          // ⚡ Success message
          toast('✅ ' + toBn(totalCount) + ' টি লগ Clear হয়েছে');
          
          // ⚡ Close and reopen to refresh
          close();
          setTimeout(() => {
            if(typeof openAuditLogModal === 'function') openAuditLogModal();
          }, 200);
          
        } catch(e){
          console.error('Clear error:', e);
          alert('❌ ' + e.message);
          clearBtn.disabled = false;
          clearBtn.innerHTML = origHtml;
        }
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
  
  const yearsSet = new Set();
  const txs = DB().txs || [];
  
  for(let i = 0; i < txs.length; i++){
    const t = txs[i];
    if(t.date) yearsSet.add(t.date.slice(0, 4));
  }
  
  const arch = DB().yearlyArchive || {};
  Object.keys(arch).forEach(y => yearsSet.add(y));
  
  const sorted = Array.from(yearsSet).sort().reverse();
  
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
      
      let renderTimer = null;
      function render(){
        if(renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
          renderTimer = null;
          const y = w.querySelector('#ya_year').value;
          const bodyEl = w.querySelector('#ya_body');
          
          bodyEl.innerHTML = '<div style="padding:20px;text-align:center;color:#7a8ab8;font-size:13px">' +
            '<div style="display:inline-block;width:18px;height:18px;border:3px solid rgba(59,130,246,.3);border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle"></div>লোড হচ্ছে...' +
          '</div>';
          
          requestAnimationFrame(() => {
            try{
              const list = getAllTxsForYear(y);
              bodyEl.innerHTML = txListHTML(list, { admin: true });
              attachTxHistoryCustomerClick(bodyEl);
            } catch(e){
              console.error(e);
              bodyEl.innerHTML = '<div class="empty" style="color:#f87171">❌ ' + esc(e.message) + '</div>';
            }
          });
        }, 20);
      }
      
      w.querySelector('#ya_year').addEventListener('change', render);
      render();
    }
  });
}

/* ───── END OF FILE managers/mgr-audit.js ───── */
console.log('✅ Manager Audit loaded — v10.1 (with Clear All)');