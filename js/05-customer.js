/* ============================================================
   FILE: js/05-customer.js
   PURPOSE: Customer Management + Due
   ============================================================ */
'use strict';

function upsertCustomer(data){
  if(!data) return null;
  let c = DB.customers.find(x => (data.accountNo && x.accountNo === data.accountNo));
  if(c){
    if(data.name) c.name = data.name;
    if(data.mobile) c.mobile = data.mobile;
    if(data.branch) c.branch = data.branch;
    c.updatedAt = new Date().toISOString();
    return c;
  }
  c = {
    id: uid(),
    accountNo: data.accountNo || ('ACC' + Date.now().toString(36).slice(-6)),
    name: data.name || 'অজ্ঞাত',
    mobile: data.mobile || '',
    branch: data.branch || 'kalaroa',
    createdAt: new Date().toISOString()
  };
  DB.customers.push(c);
  return c;
}

function getCustomerTxs(acc){
  return DB.txs.filter(t => t.custAcc && String(t.custAcc).trim() === String(acc).trim())
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function customerDue(acc){
  const txs = getCustomerTxs(acc).filter(t => t.type === 'support');
  let paid = 0, refund = 0;
  txs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if(t.dir === 'out' || t.dir === 'online_support_out') paid += amt;
    else refund += amt;
  });
  return { paid, refund, net: paid - refund };
}

function openCustomerList(){
  if(!SESSION) return;

  function renderList(){
    const list = DB.customers.slice();
    let html = '<div class="field"><input type="text" id="c-search" placeholder="🔍 খুঁজুন..." autocomplete="off"></div>';
    if(!list.length){
      html += '<div class="empty">📭 কোনো গ্রাহক নেই</div>';
    } else {
      html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>নাম</th><th>অ্যাকাউন্ট</th><th>আউটলেট</th><th>বকেয়া</th><th>অ্যাকশন</th></tr></thead><tbody>';
      list.forEach((c, i) => {
        const due = customerDue(c.accountNo).net;
        html += '<tr class="clickable" data-cust="' + esc(c.accountNo) + '">' +
          '<td>' + toBn(i + 1) + '</td>' +
          '<td><b style="color:#4ade80">' + esc(c.name) + '</b></td>' +
          '<td style="font-family:monospace;color:#93c5fd">' + esc(c.accountNo) + '</td>' +
          '<td>' + esc(BRANCHES[c.branch]?.name || '—') + '</td>' +
          '<td class="amt">' + (due > 0 ? '৳ ' + fmt(due) : '✅') + '</td>' +
          '<td>' + (SESSION.role === 'admin' ? '<button class="mini danger" data-del="' + c.id + '">🗑️</button>' : '') + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }
    return html;
  }

  openModal({
    title: '👥 গ্রাহক তালিকা',
    bodyHTML:
      '<div style="padding:12px;border-radius:12px;background:rgba(59,130,246,.06);border:1.5px solid rgba(59,130,246,.3);margin-bottom:12px">' +
        '<div style="font-size:12.5px;color:#93c5fd;font-weight:800;margin-bottom:8px">➕ নতুন গ্রাহক</div>' +
        '<div class="form-row">' +
          '<div class="field"><label>অ্যাকাউন্ট</label><input type="text" id="nc-acc"></div>' +
          '<div class="field"><label>নাম *</label><input type="text" id="nc-name"></div>' +
          '<div class="field"><label>মোবাইল</label><input type="text" id="nc-mobile"></div>' +
          '<div class="field"><label>আউটলেট</label><select id="nc-branch">' +
            Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '">' + v.name + '</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<button class="btn green block" id="nc-save" style="margin-top:8px">💾 যোগ করুন</button>' +
      '</div>' +
      '<div id="c-list">' + renderList() + '</div>',
    wide: true,
    onMount: (root, close) => {
      const listEl = root.querySelector('#c-list');
      const reRender = () => {
        listEl.innerHTML = renderList();
        listEl.querySelectorAll('tr[data-cust]').forEach(tr => {
          tr.addEventListener('click', e => {
            if(e.target.closest('button')) return;
            openCustomerDetail(tr.dataset.cust);
          });
        });
        listEl.querySelectorAll('[data-del]').forEach(b => {
          b.addEventListener('click', async e => {
            e.stopPropagation();
            if(!confirmBox('গ্রাহক ও সব লেনদেন ডিলিট হবে?')) return;
            const cid = b.dataset.del;
            const c = DB.customers.find(x => x.id === cid);
            if(!c) return;
            DB.deletedCustomerIds[c.id] = new Date().toISOString();
            if(c.accountNo) DB.deletedCustomerAccounts[c.accountNo] = new Date().toISOString();
            DB.customers = DB.customers.filter(x => x.id !== cid);
            DB.txs.filter(t => t.custAcc === c.accountNo).forEach(t => {
              DB.deletedTxIds[t.id] = new Date().toISOString();
            });
            DB.txs = DB.txs.filter(t => t.custAcc !== c.accountNo);
            logActivity('user_delete', '🗑️ গ্রাহক ডিলিট', c.name);
            DB.__updated = new Date().toISOString();
            saveLocal();
            await pushCloud();
            reRender();
            renderDashboard();
          });
        });
      };
      reRender();

      root.querySelector('#nc-save').addEventListener('click', async () => {
        const acc = root.querySelector('#nc-acc').value.trim();
        const name = root.querySelector('#nc-name').value.trim();
        if(!name){ alert('⚠️ নাম দিন'); return; }
        upsertCustomer({
          accountNo: acc, name,
          mobile: root.querySelector('#nc-mobile').value.trim(),
          branch: root.querySelector('#nc-branch').value
        });
        logActivity('user_add', '👥 গ্রাহক যোগ', name);
        root.querySelector('#nc-acc').value = '';
        root.querySelector('#nc-name').value = '';
        root.querySelector('#nc-mobile').value = '';
        reRender();
        toast('✅ যোগ হয়েছে', 'ok');
        DB.__updated = new Date().toISOString();
        saveLocal();
        pushCloud();
      });
    }
  });
}

function openCustomerDetail(acc){
  const c = DB.customers.find(x => x.accountNo === acc);
  const txs = getCustomerTxs(acc);
  const due = customerDue(acc);

  let rows = '';
  txs.slice().reverse().forEach(t => {
    const cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };
    const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
    const noteHtml = noteText ?
      '<span style="font-size:11px;color:#93c5fd;font-style:italic">📝 ' + esc(noteText) + '</span>' :
      '<span style="color:#4a5878;font-size:10.5px">—</span>';

    rows += '<tr>' +
      '<td style="white-space:nowrap;font-size:12px">' + toBn(t.date) + '</td>' +
      '<td style="font-size:12.5px">' + cfg.icon + ' ' + esc(cfg.title) + '</td>' +
      '<td style="max-width:180px">' + noteHtml + '</td>' +
      '<td class="amt" style="color:#4ade80">৳ ' + fmt(t.amount) + '</td>' +
      '<td style="font-size:10.5px;color:#7a8ab8">' + esc(t.user || '—') + '</td>' +
    '</tr>';
  });

  openModal({
    title: '👤 ' + esc(c ? c.name : acc),
    bodyHTML:
      '<div style="padding:12px 14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(0,0,0,.2));border:1.5px solid rgba(59,130,246,.4);margin-bottom:14px">' +
        '<div style="font-size:13px;color:#a5b4d8;line-height:2">' +
          '<div>🆔 <b style="color:#fff">' + esc(acc) + '</b></div>' +
          '<div>📱 <b style="color:#fff">' + esc(c?.mobile || '—') + '</b></div>' +
          '<div>🏦 <b style="color:#fff">' + esc(BRANCHES[c?.branch]?.name || '—') + '</b></div>' +
        '</div></div>' +
      (due.net > 0 ?
        '<div style="padding:14px;border-radius:12px;background:rgba(220,38,38,.15);border:1.5px solid rgba(220,38,38,.5);margin-bottom:14px">' +
          '<div style="font-size:12px;color:#fca5a5;font-weight:800">⚠️ বকেয়া</div>' +
          '<div style="font-size:22px;color:#fff;font-weight:900">৳ ' + fmt(due.net) + '</div></div>'
        : '<div style="padding:12px;border-radius:12px;background:rgba(34,197,94,.15);border:1.5px solid rgba(34,197,94,.5);color:#4ade80;font-weight:900;text-align:center;margin-bottom:14px">✅ বকেয়া নেই</div>') +
      (rows ?
        '<div class="section-title" style="font-size:13px;margin-bottom:8px"><span class="bar" style="height:16px"></span> লেনদেন (' + toBn(txs.length) + ')</div>' +
        '<div class="table-wrap" style="max-height:400px;overflow-y:auto"><table><thead><tr><th>তারিখ</th><th>ধরন</th><th>📝 মন্তব্য</th><th>টাকা</th><th>ইউজার</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">📭 লেনদেন নেই</div>'),
    wide: true
  });
}

function openDueList(){
  const bf = currentBranch();
  const list = DB.customers.filter(c => {
    if(bf !== 'all' && c.branch !== bf) return false;
    return customerDue(c.accountNo).net > 0;
  });
  let rows = '';
  list.forEach((c, i) => {
    const d = customerDue(c.accountNo);
    rows += '<tr class="clickable" data-cust="' + esc(c.accountNo) + '">' +
      '<td>' + toBn(i + 1) + '</td>' +
      '<td><b style="color:#ec4899">' + esc(c.name) + '</b></td>' +
      '<td style="font-family:monospace;color:#93c5fd">' + esc(c.accountNo) + '</td>' +
      '<td class="amt" style="color:#f87171">৳ ' + fmt(d.net) + '</td></tr>';
  });
  openModal({
    title: '🤝 সাপোর্ট বকেয়া',
    bodyHTML: list.length ?
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>নাম</th><th>অ্যাকাউন্ট</th><th>বকেয়া</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty">🎉 কোনো বকেয়া নেই</div>',
    wide: true,
    onMount: (root) => {
      root.querySelectorAll('tr[data-cust]').forEach(tr => {
        tr.addEventListener('click', () => openCustomerDetail(tr.dataset.cust));
      });
    }
  });
}