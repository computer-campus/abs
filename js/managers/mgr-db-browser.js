/* ============================================================
   FILE: managers/mgr-db-browser.js
   PURPOSE: 🗄️ Full Database Control (Browse + Edit + Delete)
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ───── TABLE HELPERS ───── */
function getTableData(n){
  const d = DB();
  if(!d) return null;
  return d[n];
}

function getTableCount(n){
  const d = getTableData(n);
  if(d == null) return 0;
  if(Array.isArray(d)) return d.length;
  if(typeof d === 'object') return Object.keys(d).length;
  return 1;
}

/* ═══════════════════════════════════════════════════════════
   🔥 DATABASE BROWSER
   ═══════════════════════════════════════════════════════════ */
function openDatabaseBrowser(){
  if(!requireAdmin('ডেটাবেস')) return;
  
  let activeTab = 'txs';
  let searchQuery = '';
  
  const editableTables = {
    txs: { label: '💸 লেনদেন', editable: true },
    customers: { label: '🧑 গ্রাহক', editable: true },
    users: { label: '👥 ইউজার', editable: true },
    txEditLog: { label: '📜 অডিট', editable: false },
    activityLog: { label: '🔔 অ্যাক্টিভিটি', editable: false },
    branchCapital: { label: '💵 মূলধন', editable: true },
    baseVault: { label: '🗄️ বেস ভল্ট', editable: true },
    baseAccounts: { label: '🏦 বেস', editable: true },
    liveVault: { label: '⚡ লাইভ ভল্ট', editable: false },
    liveAccounts: { label: '💵 লাইভ', editable: false }
  };
  
  const tabsHTML = Object.entries(editableTables)
    .map(([k, v]) =>
      '<button class="db-tab-btn" data-dbtab="' + k + '">' + v.label +
        ' <span class="cnt">' + toBn(getTableCount(k)) + '</span>' +
      '</button>'
    ).join('');
  
  openModal({
    title: '🗄️ ডেটাবেস ব্রাউজার (Full Control)',
    xwide: true,
    bodyHTML:
      '<div class="db-tabs" id="dbTabs">' + tabsHTML + '</div>' +
      
      '<div class="db-toolbar">' +
        '<input type="text" class="db-search" id="dbSearch" placeholder="🔍 খুঁজুন..." autocomplete="off">' +
        '<span class="db-info" id="dbInfo">—</span>' +
        '<button class="btn cyan sm" id="dbExportBtn" style="white-space:nowrap">📥 Export</button>' +
        '<button class="btn purple sm" id="dbImportBtn" style="white-space:nowrap">📤 Import</button>' +
        '<input type="file" id="dbImportFile" accept=".json" style="display:none">' +
      '</div>' +
      
      '<div id="dbContent"></div>',
    
    onMount: (w) => {
      const tabsEl = w.querySelector('#dbTabs');
      const contentEl = w.querySelector('#dbContent');
      const infoEl = w.querySelector('#dbInfo');
      
      function setActive(t){
        activeTab = t;
        tabsEl.querySelectorAll('.db-tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.dbtab === t);
        });
        renderTable();
      }
      
      function refreshCounts(){
        tabsEl.querySelectorAll('.db-tab-btn').forEach(btn => {
          const k = btn.dataset.dbtab;
          const cnt = btn.querySelector('.cnt');
          if(cnt) cnt.textContent = toBn(getTableCount(k));
        });
      }
      
      function renderTable(){
        const data = getTableData(activeTab);
        const meta = editableTables[activeTab];
        
        if(data == null){
          contentEl.innerHTML = '<div class="empty">📭 খালি</div>';
          infoEl.textContent = '0';
          return;
        }
        
        if(Array.isArray(data)){
          let list = data.slice();
          if(searchQuery){
            const q = searchQuery.toLowerCase();
            list = list.filter(item => JSON.stringify(item).toLowerCase().includes(q));
          }
          
          infoEl.textContent = 'মোট: ' + toBn(data.length) + ' • দেখানো: ' + toBn(list.length);
          
          if(!list.length){
            contentEl.innerHTML = '<div class="empty">📭 নেই</div>';
            return;
          }
          
          const allKeys = new Set();
          list.forEach(item => {
            if(item && typeof item === 'object'){
              Object.keys(item).forEach(k => allKeys.add(k));
            }
          });
          const dk = Array.from(allKeys).slice(0, 6);
          const canEdit = meta.editable;
          const canDelete = meta.editable;
          
          contentEl.innerHTML =
            '<div class="table-wrap"><table class="tbl"><thead><tr>' +
              '<th>#</th>' +
              dk.map(k => '<th>' + esc(k) + '</th>').join('') +
              '<th style="min-width:160px">অ্যাকশন</th>' +
            '</tr></thead><tbody>' +
            list.slice(0, 200).map((item, i) => {
              const originalIndex = data.indexOf(item);
              return '<tr>' +
                '<td>' + toBn(i + 1) + '</td>' +
                dk.map(k => {
                  let v = item[k];
                  if(v == null) return '<td>—</td>';
                  if(typeof v === 'object') v = JSON.stringify(v).slice(0, 50) + '…';
                  v = String(v);
                  if(v.length > 60) v = v.slice(0, 60) + '…';
                  return '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v) + '</td>';
                }).join('') +
                '<td style="white-space:nowrap">' +
                  '<button class="mini show" data-dbview="' + originalIndex + '">👁️</button>' +
                  (canEdit ? ' <button class="mini" data-dbedit="' + originalIndex + '">✏️</button>' : '') +
                  (canDelete ? ' <button class="mini danger" data-dbdel="' + originalIndex + '">🗑️</button>' : '') +
                '</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div>';
          
          // View
          contentEl.querySelectorAll('[data-dbview]').forEach(b => b.addEventListener('click', () => {
            const item = data[+b.dataset.dbview];
            openModal({
              title: '👁️ বিস্তারিত (' + activeTab + ')',
              wide: true,
              bodyHTML: '<div class="db-json">' + esc(JSON.stringify(item, null, 2)) + '</div>'
            });
          }));
          
          // Edit
          contentEl.querySelectorAll('[data-dbedit]').forEach(b => b.addEventListener('click', () => {
            const idx = +b.dataset.dbedit;
            const item = data[idx];
            
            if(activeTab === 'txs'){
              if(typeof openTxModal === 'function' && item.type){
                w.querySelector('.x').click();
                setTimeout(() => openTxModal(item.type, item.id), 150);
              }
            } else if(activeTab === 'customers'){
              openCustomerEditInline(item, () => { renderTable(); refreshCounts(); });
            } else if(activeTab === 'users'){
              openUserEditInline(item, () => { renderTable(); refreshCounts(); });
            } else {
              openJsonEditor(item, (newData) => {
                data[idx] = newData;
                saveDB();
                renderTable();
                toast('✅ আপডেট');
              });
            }
          }));
          
          // Delete
          contentEl.querySelectorAll('[data-dbdel]').forEach(b => b.addEventListener('click', async () => {
            const idx = +b.dataset.dbdel;
            const item = data[idx];
            
            let confirmMsg = '🗑️ ডিলিট করবেন?\n\n';
            if(activeTab === 'txs'){
              confirmMsg += '📌 ' + (item.type || '') + '\n💰 ৳ ' + fmt(item.amount) + '\n📅 ' + toBn(item.date);
            } else if(activeTab === 'customers'){
              confirmMsg += '👤 ' + (item.name || '') + '\n🆔 ' + (item.accountNo || '');
            } else if(activeTab === 'users'){
              confirmMsg += '👤 ' + (item.name || '') + '\n🆔 ' + (item.username || '');
            } else {
              confirmMsg += JSON.stringify(item).slice(0, 100);
            }
            confirmMsg += '\n\n⚠️ এই ডেটা মুছে যাবে!';
            
            if(!confirm(confirmMsg)) return;
            if(!confirm('🚨 শেষবার নিশ্চিত?')) return;
            
            if(activeTab === 'txs'){
              if(!DB().deletedTxIds) DB().deletedTxIds = {};
              DB().deletedTxIds[item.id] = new Date().toISOString();
              DB().txs = DB().txs.filter(x => x.id !== item.id);
              
              addActivityLog({
                type: 'txn_delete',
                title: '🗑️ DB Browser ডিলিট',
                detail: (item.type || ''),
                amount: item.amount,
                targetId: item.id
              });
              
              __invalidateCaches();
              recomputeLive();
              await saveDB();
              try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
              
              renderTable();
              refreshCounts();
              toast('🗑️ ডিলিট');
              renderTopbar();
              updateDashboardLight();
              renderSidebar();
            } else if(activeTab === 'customers'){
              DB().customers = DB().customers.filter(x => x.id !== item.id);
              addActivityLog({
                type: 'user_delete',
                title: '🗑️ গ্রাহক ডিলিট',
                detail: item.name + ' (' + item.accountNo + ')'
              });
              await saveDB();
              try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
              renderTable();
              refreshCounts();
              toast('🗑️ ডিলিট');
            } else if(activeTab === 'users'){
              if(item.id === session.id){ toast('❌ নিজেকে ডিলিট নয়'); return; }
              const admins = DB().users.filter(u => u.role === 'admin');
              if(item.role === 'admin' && admins.length <= 1){
                toast('❌ শেষ অ্যাডমিন ডিলিট নয়');
                return;
              }
              DB().users = DB().users.filter(x => x.id !== item.id);
              addActivityLog({
                type: 'user_delete',
                title: '🗑️ ইউজার ডিলিট',
                detail: item.name + ' (' + item.username + ')'
              });
              await saveDB();
              try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
              renderTable();
              refreshCounts();
              toast('🗑️ ডিলিট');
            } else {
              delete data[idx];
              await saveDB();
              renderTable();
              refreshCounts();
              toast('🗑️ ডিলিট');
            }
          }));
        } else {
          const keys = Object.keys(data);
          infoEl.textContent = 'কী: ' + toBn(keys.length);
          
          contentEl.innerHTML =
            '<div class="table-wrap"><table class="tbl"><thead><tr>' +
              '<th>#</th><th>কী</th><th>মান</th>' +
            '</tr></thead><tbody>' +
            keys.map((k, i) => {
              let v = data[k];
              if(typeof v === 'object') v = JSON.stringify(v);
              return '<tr>' +
                '<td>' + toBn(i + 1) + '</td>' +
                '<td style="font-family:monospace;color:#93c5fd">' + esc(k) + '</td>' +
                '<td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:12px">' + esc(String(v).slice(0, 200)) + '</td>' +
              '</tr>';
            }).join('') +
            '</tbody></table></div>';
        }
      }
      
      // Tab clicks
      tabsEl.querySelectorAll('.db-tab-btn').forEach(b => b.addEventListener('click', () => {
        setActive(b.dataset.dbtab);
      }));
      
      // Search
      w.querySelector('#dbSearch').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTable();
      });
      
      // Export button
      w.querySelector('#dbExportBtn').addEventListener('click', () => {
        openExportDialog(activeTab, searchQuery);
      });
      
      // Import button
      w.querySelector('#dbImportBtn').addEventListener('click', () => {
        const choice = confirm('📤 Import mode?\n\n✅ OK = 🟢 Merge (নিরাপদ)\n❌ Cancel = 🔴 Replace (পুরনো মুছে যাবে)');
        w.__importMode = choice ? 'merge' : 'replace';
        w.querySelector('#dbImportFile').click();
      });
      
      w.querySelector('#dbImportFile').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if(!f) return;
        
        const r = new FileReader();
        r.onload = async (ev) => {
          const mode = w.__importMode || 'merge';
          const ok = await importSpecificData(ev.target.result, { mode });
          if(ok){
            refreshCounts();
            renderTable();
          }
        };
        r.readAsText(f);
        e.target.value = '';
      });
      
      setActive(activeTab);
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 INLINE CUSTOMER EDITOR
   ═══════════════════════════════════════════════════════════ */
function openCustomerEditInline(customer, onSave){
  openModal({
    title: '✏️ গ্রাহক এডিট — ' + esc(customer.name || ''),
    wide: true,
    bodyHTML:
      '<div class="form-row">' +
        '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="ce_acc" value="' + esc(customer.accountNo || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>নাম</label><input type="text" id="ce_name" value="' + esc(customer.name || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>মোবাইল</label><input type="text" id="ce_mobile" value="' + esc(customer.mobile || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>ঠিকানা</label><input type="text" id="ce_addr" value="' + esc(customer.address || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>আউটলেট</label><select id="ce_branch">' + branchOpts(customer.branch || 'kalaroa') + '</select></div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button class="btn green" id="ce_save" style="flex:1">💾 সেভ</button>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#ce_save').addEventListener('click', async () => {
        const newName = w.querySelector('#ce_name').value.trim();
        if(!newName){ alert('❌ নাম দিন'); return; }
        
        customer.accountNo = w.querySelector('#ce_acc').value.trim();
        customer.name = newName;
        customer.mobile = w.querySelector('#ce_mobile').value.trim();
        customer.address = w.querySelector('#ce_addr').value.trim();
        customer.branch = w.querySelector('#ce_branch').value;
        
        addActivityLog({
          type: 'user_update',
          title: '✏️ গ্রাহক আপডেট (DB)',
          detail: newName
        });
        
        await saveDB();
        try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
        
        close();
        if(onSave) onSave();
        toast('✅ আপডেট');
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 INLINE USER EDITOR
   ═══════════════════════════════════════════════════════════ */
function openUserEditInline(user, onSave){
  openModal({
    title: '✏️ ইউজার এডিট — ' + esc(user.name || ''),
    wide: true,
    bodyHTML:
      '<div class="form-row">' +
        '<div class="field"><label>নাম</label><input type="text" id="ue_name" value="' + esc(user.name || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>আইডি</label><input type="text" id="ue_user" value="' + esc(user.username || '') + '" autocomplete="off"></div>' +
        '<div class="field"><label>রোল</label>' +
          '<select id="ue_role">' +
            '<option value="user" ' + (user.role === 'user' ? 'selected' : '') + '>ইউজার</option>' +
            '<option value="admin" ' + (user.role === 'admin' ? 'selected' : '') + '>অ্যাডমিন</option>' +
          '</select>' +
        '</div>' +
        '<div class="field"><label>আউটলেট</label>' +
          '<select id="ue_branch">' +
            '<option value="all" ' + (user.branch === 'all' ? 'selected' : '') + '>সব</option>' +
            branchOpts(user.branch) +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button class="btn green" id="ue_save" style="flex:1">💾 সেভ</button>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#ue_save').addEventListener('click', async () => {
        const newName = w.querySelector('#ue_name').value.trim();
        const newUser = w.querySelector('#ue_user').value.trim();
        if(!newName || !newUser){ alert('❌ নাম ও আইডি দিন'); return; }
        
        if(DB().users.some(x => x.username === newUser && x.id !== user.id)){
          alert('❌ আইডি আছে');
          return;
        }
        
        user.name = newName;
        user.username = newUser;
        user.role = w.querySelector('#ue_role').value;
        user.branch = user.role === 'admin' ? 'all' : w.querySelector('#ue_branch').value;
        
        addActivityLog({
          type: 'user_update',
          title: '✏️ ইউজার আপডেট (DB)',
          detail: newName
        });
        
        await saveDB();
        try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
        
        close();
        if(onSave) onSave();
        toast('✅ আপডেট');
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 JSON EDITOR
   ═══════════════════════════════════════════════════════════ */
function openJsonEditor(item, onSave){
  openModal({
    title: '✏️ JSON এডিট',
    wide: true,
    bodyHTML:
      '<div class="field">' +
        '<label>JSON Data</label>' +
        '<textarea id="je_json" style="min-height:320px;font-family:monospace;font-size:12px;line-height:1.6" spellcheck="false">' +
          esc(JSON.stringify(item, null, 2)) +
        '</textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button class="btn green" id="je_save" style="flex:1">💾 সেভ</button>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#je_save').addEventListener('click', () => {
        try{
          const newData = JSON.parse(w.querySelector('#je_json').value);
          if(onSave) onSave(newData);
          close();
        } catch(e){
          alert('❌ Invalid JSON: ' + e.message);
        }
      });
    }
  });
}

/* ───── END OF FILE managers/mgr-db-browser.js ───── */
console.log('✅ Manager DB Browser loaded');