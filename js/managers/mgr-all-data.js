/* ============================================================
   FILE: managers/mgr-all-data.js
   PURPOSE: 📋 সব ডেটা modal — v8.2 (Note column added)
   VERSION: v8.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 TX LIST HTML — WITH NOTE COLUMN
   ═══════════════════════════════════════════════════════════ */
function txListHTML(list, opts){
  opts = opts || {};
  if(!list.length) return '<div class="empty">📭 নেই</div>';
  
  const MAX_ROWS = 100;
  const totalCount = list.length;
  const hasMore = totalCount > MAX_ROWS;
  const limitedList = hasMore ? list.slice(0, MAX_ROWS) : list;
  const isAdminUser = session && session.role === 'admin';
  
  // ⚡ Pre-cache dir info
  const dirCache = {};
  
  let rowsHtml = '';
  
  for(let i = 0; i < limitedList.length; i++){
    const t = limitedList[i];
    
    const dirKey = t.type + '|' + (t.dir || '') + '|' + (t.accepted ? 'A' : 'P') + '|' + (t.cancelled ? 'C' : 'N');
    let dirInfo = dirCache[dirKey];
    if(!dirInfo){
      dirInfo = getDirInfo(t);
      dirCache[dirKey] = dirInfo;
    }
    
    // ⚡ Extra description
    let extra = '';
    if(t.type === 'branch_transfer'){
      extra = (BRANCHES[t.from]?.name || '') + ' ➜ ' + (BRANCHES[t.to]?.name || '');
    } else if(t.type === 'loan_given' && t.cashNotTaken){
      extra = '💰 ক্যাশ নেয়নি';
    } else if(t.type === 'loan_given' && t.collectionStatus === 'partial'){
      extra = '⏳ আংশিক';
    } else if(t.type === 'loan_received' && t.changeAmount > 0){
      extra = '🔄 ফেরত ৳ ' + fmt(t.changeAmount);
    } else if(t.type === 'withdrawal' && t.customerAccountAmount > 0){
      extra = '💰 অ্যাকাউন্ট + 💵 ক্যাশ';
    }
    
    // ⚡ Note display
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<div style="font-size:10.5px;color:#93c5fd;margin-top:3px;line-height:1.4;font-style:italic;padding:2px 6px;border-radius:4px;background:rgba(59,130,246,.08);display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(noteText) + '">📝 ' + esc(noteText) + '</div>' : '';
    
    // ⚡ Action buttons
    let ab = '';
    if(canEditTx(t)){
      ab += '<button class="mini" data-edit="' + t.id + '" title="এডিট">✏️</button>';
    }
    ab += '<button class="mini print-btn" data-print="' + t.id + '" title="প্রিন্ট">🖨️</button>';
    if(isAdminUser){
      ab += '<button class="mini danger" data-del="' + t.id + '" title="ডিলিট">🗑️</button>';
    }
    
    const cn = t.custName || '';
    const ca = t.custAcc || '';
    const hasCust = !!ca;
    
    // ⚡ Row with note column
    rowsHtml += '<tr' + (hasCust ? ' class="clickable-row" data-cust-acc="' + esc(ca) + '" data-cust-name="' + esc(cn) + '"' : '') + '>' +
      '<td>' + toBn(t.date) + '</td>' +
      '<td>' + (dirInfo.icon || '') + ' ' + esc(dirInfo.label || t.type) + '</td>' +
      '<td>' + (hasCust ? '👤 <b style="color:#4ade80">' + esc(cn) + '</b>' : '—') + '</td>' +
      '<td>' + extra + '</td>' +
      '<td style="min-width:120px">' + (noteHtml || '—') + '</td>' +
      '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
      '<td>' + esc(t.user || '-') + '</td>' +
      '<td style="white-space:nowrap">' + ab + '</td>' +
    '</tr>';
  }
  
  const notice = hasMore ?
    '<div style="padding:10px 14px;margin-bottom:10px;border-radius:10px;background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.3);font-size:13px;color:#facc15;text-align:center">' +
      '⚠️ প্রথম <b>' + toBn(MAX_ROWS) + '</b> টি দেখানো হচ্ছে — মোট <b>' + toBn(totalCount) + '</b> টি' +
    '</div>' : '';
  
  // ⚡ Table with Note column
  return notice +
    '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>তারিখ</th><th>ধরন</th><th>গ্রাহক</th><th>বিবরণ</th><th>📝 মন্তব্য</th>' +
      '<th>টাকা</th><th>ইউজার</th><th>অ্যাকশন</th>' +
    '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
}

/* ═══════════════════════════════════════════════════════════
   🔥 ALL DATA MODAL
   ═══════════════════════════════════════════════════════════ */
function openAllData(){
  const bf = currentBranchFilter();
  const isAdminUser = session.role === 'admin';
  
  openModal({
    title: '📋 সব ডেটা',
    xwide: true,
    bodyHTML:
      '<div class="form-row">' +
        '<div class="field"><label>তারিখ</label><input type="date" id="ad_date" value=""></div>' +
        '<div class="field"><label>ধরন</label>' +
          '<select id="ad_type">' +
            '<option value="all">— সব —</option>' +
            Object.entries(TX_CFG).map(([k, v]) =>
              '<option value="' + k + '">' + v.icon + ' ' + v.title + '</option>'
            ).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      
      '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
        '<button type="button" class="btn cyan sm" data-quick="today">আজ</button>' +
        '<button type="button" class="btn cyan sm" data-quick="yesterday">গতকাল</button>' +
        '<button type="button" class="btn cyan sm" data-quick="all">সব</button>' +
      '</div>' +
      
      '<div id="ad_body" style="margin-top:16px"></div>',
    
    onMount: (w) => {
      let renderTimer = null;
      const bodyEl = w.querySelector('#ad_body');
      
      function render(){
        if(renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
          renderTimer = null;
          
          try{
            const selectedDate = w.querySelector('#ad_date').value;
            const ty = w.querySelector('#ad_type').value;
            const allTxs = getAllTxs();
            
            const list = [];
            const len = allTxs.length;
            for(let i = 0; i < len; i++){
              const t = allTxs[i];
              
              if(selectedDate && t.date !== selectedDate) continue;
              if(ty !== 'all' && t.type !== ty) continue;
              
              if(isAdminUser){
                if(bf !== 'all' && t.branch !== bf) continue;
              } else {
                if(t.branch !== session.branch) continue;
              }
              
              list.push(t);
            }
            
            list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            
            bodyEl.innerHTML =
              '<div style="margin-bottom:10px;font-size:13.5px;color:#a5b4d8">' +
                '📅 <b style="color:#fff">' + toBn(selectedDate || 'সব তারিখ') + '</b> • ' +
                'মোট <b style="color:#fff">' + toBn(list.length) + '</b> টি' +
              '</div>' +
              txListHTML(list, { admin: isAdminUser });
            
            attachTxHistoryCustomerClick(bodyEl);
            
            if(!bodyEl.__btnDelegation){
              bodyEl.__btnDelegation = true;
              bodyEl.addEventListener('click', async function(e){
                const delBtn = e.target.closest('[data-del]');
                const editBtn = e.target.closest('[data-edit]');
                const printBtn = e.target.closest('[data-print]');
                
                if(delBtn){
                  e.stopPropagation();
                  if(!isAdmin()){ toast('🔒 শুধু অ্যাডমিন'); return; }
                  if(confirm('🗑️ ডিলিট?')){
                    await deleteTx(delBtn.dataset.del);
                    render();
                  }
                  return;
                }
                if(editBtn){
                  e.stopPropagation();
                  const t = getAllTxs().find(x => x.id === editBtn.dataset.edit);
                  if(!t){ toast('❌ পাওয়া যায়নি'); return; }
                  if(!canEditTx(t)){ toast('🔒 এডিট করা যাবে না'); return; }
                  w.querySelector('.x').click();
                  setTimeout(() => openTxModal(t.type, t.id), 100);
                  return;
                }
                if(printBtn){
                  e.stopPropagation();
                  const t = getAllTxs().find(x => x.id === printBtn.dataset.print);
                  if(t && typeof printSingleTransaction === 'function'){
                    printSingleTransaction(t);
                  }
                  return;
                }
              });
            }
          } catch(e){
            console.error('Render error:', e);
            bodyEl.innerHTML = '<div class="empty" style="color:#f87171">❌ ' + esc(e.message) + '</div>';
          }
        }, 50);
      }
      
      w.querySelectorAll('[data-quick]').forEach(b => {
        b.addEventListener('click', () => {
          const t = b.dataset.quick;
          if(t === 'today'){
            w.querySelector('#ad_date').value = todayStr();
          } else if(t === 'yesterday'){
            w.querySelector('#ad_date').value = dateOffset(-1);
          } else if(t === 'all'){
            w.querySelector('#ad_date').value = '';
          }
          render();
        });
      });
      
      w.querySelector('#ad_date').addEventListener('change', render);
      w.querySelector('#ad_type').addEventListener('change', render);
      
      render();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 DELETE TX
   ═══════════════════════════════════════════════════════════ */
async function deleteTx(id){
  if(!isAdmin()){
    toast('🔒 শুধু অ্যাডমিন ডিলিট করতে পারবেন');
    return;
  }
  
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ পাওয়া যায়নি'); return; }
  
  const t = found.tx;
  
  if(!DB().deletedTxIds) DB().deletedTxIds = {};
  DB().deletedTxIds[id] = new Date().toISOString();
  
  DB().txs = (DB().txs || []).filter(x => x.id !== id);
  
  if(DB().yearlyArchive){
    Object.keys(DB().yearlyArchive).forEach(y => {
      if(Array.isArray(DB().yearlyArchive[y])){
        DB().yearlyArchive[y] = DB().yearlyArchive[y].filter(x => x.id !== id);
      }
    });
  }
  
  addTxLog(id, 'delete', {
    deleted: { from: 'active', to: 'deleted' }
  }, t);
  
  addActivityLog({
    type: 'txn_delete',
    title: '🗑️ লেনদেন ডিলিট',
    detail: (TX_CFG[t?.type]?.title || '') + (t?.custName ? ' — ' + t.custName : ''),
    amount: t?.amount || 0,
    targetId: id
  });
  
  __invalidateCaches();
  recalcAllCustomerDues(false);
  recomputeLive();
  
  await saveDB();
  
  try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
  
  try{
    broadcastActivity({
      type: 'txn_delete',
      txTitle: TX_CFG[t?.type]?.title || '',
      amount: t?.amount || 0,
      txId: id
    });
  } catch(e){}
  
  renderTopbar();
  updateDashboardLight();
  renderSidebar();
  
  document.querySelectorAll('.modal-overlay').forEach(m => {
    if(m.__reloadCustomerPopup){
      try{ m.__reloadCustomerPopup(); } catch(e){}
    }
  });
  
  toast('🗑️ ডিলিট — ৳ ' + fmt(t?.amount || 0));
}

/* ───── END OF FILE managers/mgr-all-data.js ───── */
console.log('✅ Manager All Data loaded — v8.2 (note column)');