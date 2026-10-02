/* ============================================================
   FILE: 09-customer.js
   PURPOSE: Customer management — ULTRA FAST v8.0
   VERSION: v8.0
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 CUSTOMER DUE CACHE (Fast)
   ═══════════════════════════════════════════════════════════ */
function calculateCustomerDue(accountNo){
  if(!accountNo) return { paid: 0, refund: 0, net: 0, count: 0 };
  
  const acc = String(accountNo).trim();
  const currentVersion = (DB().__lastUpdate || '0') + '|' + (DB().txs?.length || 0);
  
  if(__customerDueCache && __customerDueCacheVersion === currentVersion){
    if(__customerDueCache[acc]) return { ...__customerDueCache[acc] };
    return { paid: 0, refund: 0, net: 0, count: 0 };
  }
  
  recalcAllCustomerDues(false);
  
  if(__customerDueCache && __customerDueCache[acc]) return { ...__customerDueCache[acc] };
  return { paid: 0, refund: 0, net: 0, count: 0 };
}

function recalcAllCustomerDues(save){
  const currentVersion = (DB().__lastUpdate || '0') + '|' + (DB().txs?.length || 0);
  
  if(__customerDueCache && __customerDueCacheVersion === currentVersion){
    (DB().customers || []).forEach(c => {
      const m = __customerDueCache[c.accountNo] || { paid: 0, refund: 0, net: 0, count: 0 };
      c.supportPaid = m.paid;
      c.supportRefund = m.refund;
      c.supportDue = m.net;
      c.supportCount = m.count;
    });
    return;
  }
  
  const map = {};
  const allTxs = getAllTxs();
  const len = allTxs.length;
  
  for(let i = 0; i < len; i++){
    const t = allTxs[i];
    if(t.type !== 'support') continue;
    
    const acc = String(t.custAcc || '').trim();
    if(!acc) continue;
    
    if(!map[acc]) map[acc] = { paid: 0, refund: 0, count: 0 };
    
    const amt = Number(t.amount) || 0;
    if(t.dir === 'out' || t.dir === 'online_support_out') map[acc].paid += amt;
    else if(t.dir === 'in' || t.dir === 'online_support_in') map[acc].refund += amt;
    map[acc].count++;
  }
  
  __customerDueCache = {};
  Object.keys(map).forEach(acc => {
    const m = map[acc];
    __customerDueCache[acc] = {
      paid: Math.round(m.paid * 100) / 100,
      refund: Math.round(m.refund * 100) / 100,
      net: Math.round((m.paid - m.refund) * 100) / 100,
      count: m.count
    };
  });
  __customerDueCacheVersion = currentVersion;
  
  (DB().customers || []).forEach(c => {
    const m = __customerDueCache[c.accountNo] || { paid: 0, refund: 0, net: 0, count: 0 };
    c.supportPaid = m.paid;
    c.supportRefund = m.refund;
    c.supportDue = m.net;
    c.supportCount = m.count;
  });
}

function updateCustomerDueInDB(accountNo, save){
  if(!accountNo) return null;
  const acc = String(accountNo).trim();
  const c = (DB().customers || []).find(x => x.accountNo === acc);
  if(!c) return null;
  
  __customerDueCache = null;
  __customerDueCacheVersion = '';
  
  const d = calculateCustomerDue(acc);
  c.supportPaid = d.paid;
  c.supportRefund = d.refund;
  c.supportDue = d.net;
  c.supportCount = d.count;
  
  if(save){ try{ saveDB(); } catch(e){} }
  return c;
}

/* ═══════════════════════════════════════════════════════════
   🔥 CUSTOMER CRUD
   ═══════════════════════════════════════════════════════════ */
function upsertCustomer(data){
  if(!data.accountNo && !data.name) return null;
  
  let c = DB().customers.find(x =>
    (data.accountNo && x.accountNo === data.accountNo) ||
    (!data.accountNo && data.name && x.name === data.name)
  );
  
  if(c){
    if(data.name) c.name = data.name;
    if(data.mobile) c.mobile = data.mobile;
    if(data.address) c.address = data.address;
    if(data.branch) c.branch = data.branch;
    return c;
  }
  
  c = {
    id: uid(),
    accountNo: data.accountNo || ('ACC' + Math.floor(Math.random() * 900000 + 100000)),
    name: data.name || 'অজ্ঞাত',
    mobile: data.mobile || '',
    address: data.address || '',
    branch: data.branch || 'kalaroa',
    createdAt: new Date().toISOString(),
    supportPaid: 0,
    supportRefund: 0,
    supportDue: 0,
    supportCount: 0
  };
  DB().customers.push(c);
  return c;
}

function searchCustomers(q){
  q = String(q || '').trim().toLowerCase();
  if(!q) return [];
  
  const results = [];
  const list = DB().customers;
  const len = list.length;
  
  for(let i = 0; i < len && results.length < 10; i++){
    const c = list[i];
    if((c.accountNo || '').toLowerCase().includes(q) ||
       (c.name || '').toLowerCase().includes(q) ||
       (c.mobile || '').toLowerCase().includes(q)){
      results.push(c);
    }
  }
  return results;
}

function getCustomerAllTxs(accountNo){
  if(!accountNo) return [];
  const acc = String(accountNo).trim();
  const all = getAllTxs();
  const result = [];
  const len = all.length;
  
  for(let i = 0; i < len; i++){
    const t = all[i];
    if(t.custAcc && String(t.custAcc).trim() === acc){
      result.push(t);
    }
  }
  
  result.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return result;
}

/* ═══════════════════════════════════════════════════════════
   🔥 CUSTOMER LIST MODAL — FAST
   ═══════════════════════════════════════════════════════════ */
function openCustomerList(){
  const isAdminUser = session.role === 'admin';
  
  openModal({
    title: '👥 গ্রাহক তালিকা',
    wide: true,
    bodyHTML:
      '<div class="cust-box">' +
        '<div class="head"><h4>➕ নতুন গ্রাহক</h4></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="nc_acc" autocomplete="off"></div>' +
          '<div class="field"><label>নাম *</label><input type="text" id="nc_name" autocomplete="off"></div>' +
          '<div class="field"><label>মোবাইল</label><input type="text" id="nc_mobile" autocomplete="off"></div>' +
          '<div class="field"><label>ঠিকানা</label><input type="text" id="nc_addr" autocomplete="off"></div>' +
          (isAdminUser ? '<div class="field"><label>আউটলেট</label><select id="nc_branch"><option value="kalaroa">কলারোয়া</option><option value="jhaudanga">ঝাউডাঙ্গা</option></select></div>' : '') +
        '</div>' +
        '<button class="btn green" id="nc_save" style="margin-top:10px">💾 সংরক্ষণ</button>' +
      '</div>' +
      '<div class="form-row" style="margin-top:12px">' +
        '<div class="field"><input type="text" id="cust_search" placeholder="🔍 খুঁজুন..." autocomplete="off"></div>' +
      '</div>' +
      '<div id="cust_list"></div>',
    
    onMount: (w, close) => {
      const lb = w.querySelector('#cust_list');
      
      function render(filter){
        // ⚡ Build with pre-fetched data
        const all = DB().customers;
        const list = [];
        const f = (filter || '').toLowerCase();
        
        for(let i = 0; i < all.length; i++){
          const c = all[i];
          if(f){
            if(!((c.accountNo || '').toLowerCase().includes(f) ||
                 (c.name || '').toLowerCase().includes(f) ||
                 (c.mobile || '').toLowerCase().includes(f))) continue;
          }
          const d = calculateCustomerDue(c.accountNo);
          c.supportDue = d.net;
          list.push(c);
        }
        
        list.sort((a, b) => (b.supportDue || 0) - (a.supportDue || 0));
        
        if(!list.length){
          lb.innerHTML = '<div class="empty">📭 নেই</div>';
          return;
        }
        
        // ⚡ Limit to 100 for speed
        const MAX = 100;
        const shown = list.slice(0, MAX);
        const hasMore = list.length > MAX;
        
        let rows = '';
        for(let i = 0; i < shown.length; i++){
          const c = shown[i];
          rows += '<tr class="cust-row ' + (c.supportDue > 0 ? 'has-due' : '') + ' clickable-row" ' +
            'data-cust-acc="' + esc(c.accountNo) + '" data-cust-name="' + esc(c.name) + '">' +
            '<td>' + toBn(i + 1) + '</td>' +
            '<td>' + esc(c.accountNo) + '</td>' +
            '<td>👤 <b style="color:#4ade80">' + esc(c.name) + '</b></td>' +
            '<td>' + esc(BRANCHES[c.branch]?.name || '') + '</td>' +
            '<td>' + (c.supportDue > 0 ? '<span class="badge due">৳ ' + fmt(c.supportDue) + '</span>' : '✅') + '</td>' +
            '<td>' +
              '<button class="mini show" data-hist="' + esc(c.accountNo) + '">📄</button>' +
              '<button class="mini print-btn" data-print-cust="' + esc(c.accountNo) + '" data-print-name="' + esc(c.name) + '">🖨️</button>' +
              (isAdminUser ? '<button class="mini danger" data-cdel="' + c.id + '">🗑️</button>' : '') +
            '</td>' +
          '</tr>';
        }
        
        const moreNote = hasMore ?
          '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700">আরো ' + toBn(list.length - MAX) + ' জন — search করুন</div>' : '';
        
        lb.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th>#</th><th>অ্যাকাউন্ট</th><th>নাম</th><th>আউটলেট</th><th>সাপোর্ট বকেয়া</th><th>অ্যাকশন</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>' + moreNote;
        
        // ⚡ Event delegation — 1 handler
        if(!lb.__delegated){
          lb.__delegated = true;
          lb.addEventListener('click', async (e) => {
            const histBtn = e.target.closest('[data-hist]');
            const printBtn = e.target.closest('[data-print-cust]');
            const delBtn = e.target.closest('[data-cdel]');
            
            if(histBtn){
              e.stopPropagation();
              close();
              openCustomerDetailPopup(histBtn.dataset.hist);
              return;
            }
            if(printBtn){
              e.stopPropagation();
              printCustomerHistory(printBtn.dataset.printCust, printBtn.dataset.printName);
              return;
            }
            if(delBtn){
              e.stopPropagation();
              if(!requireAdmin('গ্রাহক ডিলিট')) return;
              if(confirm('ডিলিট?')){
                DB().customers = DB().customers.filter(x => x.id !== delBtn.dataset.cdel);
                await saveDB();
                render(w.querySelector('#cust_search').value);
              }
              return;
            }
          });
        }
        
        attachTxHistoryCustomerClick(lb);
      }
      
      // ⚡ Debounced search
      let sTimer = null;
      w.querySelector('#cust_search').addEventListener('input', (e) => {
        if(sTimer) clearTimeout(sTimer);
        sTimer = setTimeout(() => {
          sTimer = null;
          render(e.target.value);
        }, 150);
      });
      
      w.querySelector('#nc_save').addEventListener('click', async () => {
        const name = w.querySelector('#nc_name').value.trim();
        if(!name){ alert('নাম দিন'); return; }
        
        const brS = w.querySelector('#nc_branch');
        const br = brS ? brS.value : (session.role === 'admin' ? 'kalaroa' : session.branch);
        
        upsertCustomer({
          accountNo: w.querySelector('#nc_acc').value.trim(),
          name,
          mobile: w.querySelector('#nc_mobile').value.trim(),
          address: w.querySelector('#nc_addr').value.trim(),
          branch: br
        });
        await saveDB();
        render('');
        toast('✅ যোগ');
      });
      
      render('');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 CUSTOMER DETAIL POPUP — ULTRA FAST
   ═══════════════════════════════════════════════════════════ */
function openCustomerDetailPopup(accountNo, custName){
  const t0 = performance.now();
  
  // ⚡ Pre-fetch customer
  const cust = DB().customers.find(c => c.accountNo === accountNo);
  const name = custName || cust?.name || '-';
  
  // ⚡ Fetch all txs once
  const allTxs = getCustomerAllTxs(accountNo);
  const totalCount = allTxs.length;
  
  // ⚡ Compute support stats in one pass
  let sPaid = 0, sRefund = 0;
  for(let i = 0; i < totalCount; i++){
    const t = allTxs[i];
    if(t.type !== 'support') continue;
    const amt = Number(t.amount) || 0;
    if(t.dir === 'out' || t.dir === 'online_support_out') sPaid += amt;
    else if(t.dir === 'in' || t.dir === 'online_support_in') sRefund += amt;
  }
  const sNet = sPaid - sRefund;
  
  // ⚡ Type info cache
  const typeInfo = {
    loan_given: { icon: '💸', label: 'ঋণ বিতরণ', color: '#93c5fd' },
    loan_received: { icon: '📥', label: 'ঋণ গ্রহণ', color: '#4ade80' },
    deposit: { icon: '🏦', label: 'জমা', color: '#4ade80' },
    withdrawal: { icon: '💵', label: 'উত্তোলন', color: '#facc15' },
    loan_collection: { icon: '💰', label: 'ঋণ সংগ্রহ', color: '#a78bfa' },
    support: { icon: '🤝', label: 'সাপোর্ট', color: '#ec4899' },
    branch_transfer: { icon: '🔁', label: 'ট্রান্সফার', color: '#06b6d4' },
    bank_transfer: { icon: '🏛️', label: 'ইন্টারনাল অনলাইন', color: '#c4b5fd' },
    other_bank: { icon: '🏦', label: 'অন্য ব্যাংক', color: '#60a5fa' },
    expense: { icon: '🧾', label: 'খরচ', color: '#f87171' },
    money_exchange: { icon: '💱', label: 'মানি এক্সচেঞ্জ', color: '#fbbf24' }
  };
  
  // ⚡ Build header
  const headerAlert = sNet > 0 ?
    '<div id="cust_header_alert" style="margin-bottom:14px;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,rgba(220,38,38,.22),rgba(153,27,27,.12));border:2px solid rgba(220,38,38,.6)">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div style="font-size:32px">🚨</div>' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="font-size:13px;color:#fca5a5;font-weight:800">সতর্কতা — বকেয়া আছে</div>' +
          '<div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px">৳ ' + fmt(sNet) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
    :
    '<div id="cust_header_alert" style="margin-bottom:14px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(34,197,94,.18),rgba(22,163,74,.08));border:2px solid rgba(34,197,94,.5)">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:28px">✅</div>' +
        '<div><div style="font-size:13px;color:#4ade80;font-weight:800">কোনো বকেয়া নেই</div></div>' +
      '</div>' +
    '</div>';
  
  // ⚡ Customer info
  const custInfo =
    '<div class="cust-box" style="margin-bottom:16px">' +
      '<div class="head"><h4>👤 গ্রাহকের তথ্য</h4></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;font-size:13.5px;line-height:1.9">' +
        '<div>অ্যাকাউন্ট: <b style="color:#fff">' + esc(accountNo) + '</b></div>' +
        '<div>নাম: <b style="color:#fff">' + esc(name) + '</b></div>' +
        '<div>মোবাইল: <b style="color:#fff">' + esc(cust?.mobile || '-') + '</b></div>' +
        '<div>আউটলেট: <b style="color:#fff">' + esc(BRANCHES[cust?.branch]?.name || '-') + '</b></div>' +
      '</div>' +
    '</div>';
  
  // ⚡ Stats
  const stats =
    '<div class="accept-head" id="cust_stats_box">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px">' +
        '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📊 মোট</div>' +
          '<div style="font-size:22px;font-weight:900;color:#fff">' + toBn(totalCount) + ' টি</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">🤝 প্রদান</div>' +
          '<div style="font-size:16px;font-weight:800;color:#93c5fd">৳ ' + fmt(sPaid) + '</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">↩️ ফেরত</div>' +
          '<div style="font-size:16px;font-weight:800;color:#4ade80">৳ ' + fmt(sRefund) + '</div></div>' +
        '<div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📉 নেট</div>' +
          '<div style="font-size:18px;font-weight:900;color:' + (sNet > 0 ? '#f87171' : '#4ade80') + '">৳ ' + fmt(Math.abs(sNet)) + '</div></div>' +
      '</div>' +
    '</div>';
  
  // ⚡ Initial tx placeholder (loaded async)
  const txPlaceholder = '<div id="cust_all_txns" style="margin-top:16px">' +
    '<div style="padding:20px;text-align:center;color:#7a8ab8;font-size:13px">' +
      '<div style="display:inline-block;width:20px;height:20px;border:3px solid rgba(59,130,246,.3);border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle"></div>' +
      'লেনদেন লোড হচ্ছে...' +
    '</div>' +
  '</div>';
  
  openModal({
    title: (sNet > 0 ? '🔴 ' : '👤 ') + esc(name) + (sNet > 0 ? ' — ⚠️ বকেয়া ৳ ' + fmt(sNet) : ''),
    xwide: true,
    bodyHTML: headerAlert + custInfo + stats + txPlaceholder +
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">' +
        '<button class="btn green" id="cust_h_support" style="flex:1">🤝 নতুন সাপোর্ট</button>' +
        '<button class="btn cyan" id="cust_h_print" style="flex:1">🖨️ Print</button>' +
      '</div>',
    
    onMount: (w, close) => {
      // ⚡ Reload function
      w.__reloadCustomerPopup = function(){
        try{
          const allTxs2 = getCustomerAllTxs(accountNo);
          let sPaid2 = 0, sRefund2 = 0;
          for(let i = 0; i < allTxs2.length; i++){
            const t = allTxs2[i];
            if(t.type !== 'support') continue;
            const amt = Number(t.amount) || 0;
            if(t.dir === 'out' || t.dir === 'online_support_out') sPaid2 += amt;
            else if(t.dir === 'in' || t.dir === 'online_support_in') sRefund2 += amt;
          }
          const sNet2 = sPaid2 - sRefund2;
          
          const hEl = w.querySelector('#cust_header_alert');
          if(hEl){
            if(sNet2 > 0){
              hEl.outerHTML = '<div id="cust_header_alert" style="margin-bottom:14px;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,rgba(220,38,38,.22),rgba(153,27,27,.12));border:2px solid rgba(220,38,38,.6)"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="font-size:32px">🚨</div><div style="flex:1;min-width:200px"><div style="font-size:13px;color:#fca5a5;font-weight:800">সতর্কতা — বকেয়া আছে</div><div style="font-size:22px;color:#fff;font-weight:900;margin-top:4px">৳ ' + fmt(sNet2) + '</div></div></div></div>';
            } else {
              hEl.outerHTML = '<div id="cust_header_alert" style="margin-bottom:14px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(34,197,94,.18),rgba(22,163,74,.08));border:2px solid rgba(34,197,94,.5)"><div style="display:flex;align-items:center;gap:12px"><div style="font-size:28px">✅</div><div><div style="font-size:13px;color:#4ade80;font-weight:800">কোনো বকেয়া নেই</div></div></div></div>';
            }
          }
          
          const stEl = w.querySelector('#cust_stats_box');
          if(stEl){
            stEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px"><div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📊 মোট</div><div style="font-size:22px;font-weight:900;color:#fff">' + toBn(allTxs2.length) + ' টি</div></div><div><div style="color:#a5b4d8;font-size:12px;font-weight:700">🤝 প্রদান</div><div style="font-size:16px;font-weight:800;color:#93c5fd">৳ ' + fmt(sPaid2) + '</div></div><div><div style="color:#a5b4d8;font-size:12px;font-weight:700">↩️ ফেরত</div><div style="font-size:16px;font-weight:800;color:#4ade80">৳ ' + fmt(sRefund2) + '</div></div><div><div style="color:#a5b4d8;font-size:12px;font-weight:700">📉 নেট</div><div style="font-size:18px;font-weight:900;color:' + (sNet2 > 0 ? '#f87171' : '#4ade80') + '">৳ ' + fmt(Math.abs(sNet2)) + '</div></div></div>';
          }
          
          renderTxList(allTxs2);
        } catch(e){}
      };
      
      function renderTxList(txs){
        const el = w.querySelector('#cust_all_txns');
        if(!el) return;
        
        if(!txs.length){
          el.innerHTML = '<div class="accept-head" style="text-align:center;color:#a5b4d8">📭 এই গ্রাহকের কোনো লেনদেন নেই।</div>';
          return;
        }
        
        // ⚡ Limit to 100 for speed
        const MAX = 100;
        const shown = txs.length > MAX ? txs.slice(-MAX) : txs;
        const reversed = shown.slice().reverse(); // newest first
        
        const isAdminUser = isAdmin();
        let rowsHtml = '';
        const totalRows = reversed.length;
        
        for(let i = 0; i < totalRows; i++){
          const t = reversed[i];
          const info = typeInfo[t.type] || { icon: '📌', label: t.type, color: '#a5b4d8' };
          
          // Notes
          const nOut = t.notesOut || {};
          const nIn = t.notesIn || {};
          let nOutStr = '', nInStr = '';
          
          const outKeys = Object.keys(nOut).filter(k => nOut[k] > 0).sort((a, b) => b - a);
          if(outKeys.length){
            nOutStr = outKeys.map(d => '৳' + toBn(d) + '×' + toBn(nOut[d])).join(' • ');
          }
          const inKeys = Object.keys(nIn).filter(k => nIn[k] > 0).sort((a, b) => b - a);
          if(inKeys.length){
            nInStr = inKeys.map(d => '৳' + toBn(d) + '×' + toBn(nIn[d])).join(' • ');
          }
          
          const notesHtml = (nOutStr || nInStr) ?
            '<div style="font-size:10.5px;margin-top:4px;line-height:1.5">' +
              (nOutStr ? '<span style="color:#f87171">📤 ' + nOutStr + '</span>' : '') +
              (nOutStr && nInStr ? ' • ' : '') +
              (nInStr ? '<span style="color:#4ade80">📥 ' + nInStr + '</span>' : '') +
            '</div>' : '';
          
          const noteHtml = t.note ?
            '<div style="font-size:10.5px;color:#a5b4d8;margin-top:2px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📝 ' + esc(t.note) + '</div>' : '';
          
          // Action buttons
          let btns = '<button class="mini show" data-cust-tx-view="' + esc(t.id) + '">👁️</button>';
          if(canEditTx(t)) btns += '<button class="mini" data-cust-tx-edit="' + esc(t.id) + '">✏️</button>';
          btns += '<button class="mini print-btn" data-cust-tx-print="' + esc(t.id) + '">🖨️</button>';
          if(isAdminUser) btns += '<button class="mini danger" data-cust-tx-del="' + esc(t.id) + '">🗑️</button>';
          
          rowsHtml += '<tr data-tx-row="' + esc(t.id) + '">' +
            '<td style="font-size:11.5px;white-space:nowrap">' + toBn(t.date) +
              '<div style="font-size:10px;color:#7a8ab8">' + esc(fmtTimeOnly(t.createdAt)) + '</div></td>' +
            '<td><span style="color:' + info.color + ';font-weight:800;font-size:11.5px">' + info.icon + ' ' + info.label + '</span>' +
              notesHtml + noteHtml + '</td>' +
            '<td class="amt" style="color:' + info.color + ';white-space:nowrap;font-size:12px">৳ ' + fmt(t.amount) + '</td>' +
            '<td style="font-size:10.5px;color:#a5b4d8">' + esc(t.user || '-') + '</td>' +
            '<td style="white-space:nowrap;text-align:center">' + btns + '</td>' +
          '</tr>';
        }
        
        const moreNote = txs.length > MAX ?
          '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:11.5px;color:#facc15;font-weight:700">সর্বশেষ ' + toBn(MAX) + ' টি দেখানো হচ্ছে (মোট ' + toBn(txs.length) + ')</div>' : '';
        
        el.innerHTML =
          '<div class="section-title" style="margin-bottom:10px"><span class="bar"></span> 📋 লেনদেন (' + toBn(txs.length) + ')</div>' +
          '<div class="table-wrap" style="max-height:400px;overflow-y:auto">' +
            '<table class="tbl"><thead><tr>' +
              '<th>তারিখ</th><th>ধরন</th><th>টাকা</th><th>ইউজার</th>' +
              '<th style="text-align:center">অ্যাকশন</th>' +
            '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
          '</div>' + moreNote;
        
        // ⚡ Single delegated handler
        if(!el.__delegated){
          el.__delegated = true;
          el.addEventListener('click', function(e){
            const tr = e.target.closest('tr[data-tx-row]');
            if(!tr) return;
            const txId = tr.dataset.txRow;
            
            const viewBtn = e.target.closest('[data-cust-tx-view]');
            const editBtn = e.target.closest('[data-cust-tx-edit]');
            const printBtn = e.target.closest('[data-cust-tx-print]');
            const delBtn = e.target.closest('[data-cust-tx-del]');
            
            if(viewBtn){
              e.stopPropagation();
              openTxDetail(txId);
              return;
            }
            if(editBtn){
              e.stopPropagation();
              const t = getAllTxs().find(x => x.id === txId);
              if(!t){ toast('❌ পাওয়া যায়নি'); return; }
              if(!canEditTx(t)){ toast('🔒 এডিট করা যাবে না'); return; }
              w.querySelector('.x').click();
              setTimeout(() => openTxModal(t.type, t.id), 100);
              return;
            }
            if(printBtn){
              e.stopPropagation();
              const t = getAllTxs().find(x => x.id === txId);
              if(t) printSingleTransaction(t);
              return;
            }
            if(delBtn){
              e.stopPropagation();
              if(!isAdmin()){ toast('🔒 শুধু অ্যাডমিন'); return; }
              if(confirm('🗑️ ডিলিট করবেন?')){
                deleteTx(txId).then(() => {
                  try{ w.__reloadCustomerPopup(); } catch(e){}
                });
              }
              return;
            }
            
            if(!e.target.closest('button')){
              openTxDetail(txId);
            }
          });
        }
      }
      
      // ⚡ Render after modal appears (lazy)
      requestAnimationFrame(() => {
        setTimeout(() => {
          renderTxList(allTxs);
          
          const elapsed = (performance.now() - t0).toFixed(0);
          console.log('⚡ Customer popup rendered in ' + elapsed + 'ms');
        }, 10);
      });
      
      // Support button
      w.querySelector('#cust_h_support').addEventListener('click', () => {
        close();
        setTimeout(() => {
          openTxModal('support', null, {
            custAcc: accountNo,
            custName: name,
            custMobile: cust?.mobile || '',
            custAddr: cust?.address || ''
          });
        }, 200);
      });
      
      // Print button
      w.querySelector('#cust_h_print').addEventListener('click', () => {
        printCustomerHistory(accountNo, name);
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 DUE LIST MODAL — FAST
   ═══════════════════════════════════════════════════════════ */
function openDueListModal(){
  const bf = currentBranchFilter();
  const all = DB().customers || [];
  const sc = [];
  
  for(let i = 0; i < all.length; i++){
    const c = all[i];
    if(bf !== 'all' && c.branch !== bf) continue;
    const d = calculateCustomerDue(c.accountNo);
    c.supportDue = d.net;
    sc.push(c);
  }
  
  const due = sc.filter(c => c.supportDue > 0).sort((a, b) => b.supportDue - a.supportDue);
  const total = due.reduce((s, c) => s + c.supportDue, 0);
  
  let rows = '';
  const MAX = 100;
  const shown = due.slice(0, MAX);
  
  for(let i = 0; i < shown.length; i++){
    const c = shown[i];
    rows += '<tr class="clickable-row" data-cust-acc="' + esc(c.accountNo) + '" data-cust-name="' + esc(c.name) + '">' +
      '<td>' + toBn(i + 1) + '</td>' +
      '<td>👤 <b style="color:#4ade80">' + esc(c.name) + '</b></td>' +
      '<td>' + esc(c.accountNo) + '</td>' +
      '<td>' + esc(BRANCHES[c.branch]?.name || '') + '</td>' +
      '<td><span class="badge due">৳ ' + fmt(c.supportDue) + '</span></td>' +
      '<td><button class="mini print-btn" data-print-cust="' + esc(c.accountNo) + '" data-print-name="' + esc(c.name) + '">🖨️</button></td>' +
    '</tr>';
  }
  
  const moreNote = due.length > MAX ?
    '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700">আরো ' + toBn(due.length - MAX) + ' জন</div>' : '';
  
  openModal({
    title: '🤝 সাপোর্ট বকেয়া তালিকা',
    wide: true,
    bodyHTML:
      '<div class="accept-head">' + toBn(due.length) + ' জন • মোট <b style="color:#f87171">৳ ' + fmt(total) + '</b></div>' +
      (due.length ?
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          '<th>#</th><th>গ্রাহক</th><th>অ্যাকাউন্ট</th><th>আউটলেট</th><th>বকেয়া</th><th>প্রিন্ট</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' + moreNote
        : '<div class="empty">🎉 নেই</div>'),
    
    onMount: (w) => {
      attachTxHistoryCustomerClick(w);
      w.addEventListener('click', (e) => {
        const printBtn = e.target.closest('[data-print-cust]');
        if(printBtn){
          e.stopPropagation();
          printCustomerHistory(printBtn.dataset.printCust, printBtn.dataset.printName);
        }
      });
    }
  });
}

/* ───── END OF FILE 09-customer.js ───── */
console.log('✅ Customer logic loaded — v8.0 (ULTRA FAST)');