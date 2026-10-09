/* ============================================================
   FILE: js/03-ui.js — CLEAN WORKING
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════ */
function toast(msg, type){
  let box = $('#toast-box');
  if(!box){
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 320);
  }, 2600);
  while(box.children.length > 4) box.firstChild.remove();
}

function confirmBox(msg){ return confirm(msg); }

/* ═══════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════ */
function openModal(opts){
  const { title, bodyHTML, wide, xwide, onMount } = opts;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML =
    '<div class="modal ' + (xwide ? 'xwide' : wide ? 'wide' : '') + '">' +
      '<div class="modal-head"><h3>' + title + '</h3><button class="x">✕</button></div>' +
      '<div class="modal-body">' + bodyHTML + '</div>' +
    '</div>';
  document.getElementById('modal-root').appendChild(bg);

  const close = () => { if(bg.parentNode) bg.remove(); };
  bg.querySelector('.x').addEventListener('click', close);
  bg.addEventListener('click', e => { if(e.target === bg) close(); });
  const escH = e => { if(e.key === 'Escape'){ close(); document.removeEventListener('keydown', escH); } };
  document.addEventListener('keydown', escH);

  setTimeout(() => {
    if(!bg.parentNode) return;
    const body = bg.querySelector('.modal-body');
    if(!body) return;
    setupCustomerSearch(body);
    const type = detectTxTypeFromTitle(title);
    if(!type) return;
    injectTimeField(body);
    renderFormHistory(body, type);
  }, 60);

  if(onMount) setTimeout(() => onMount(bg.querySelector('.modal-body'), close, bg), 10);
  return { close, bg };
}

/* ═══════════════════════════════════════════════════════════
   DETECT TX TYPE
   ═══════════════════════════════════════════════════════════ */
function detectTxTypeFromTitle(title){
  if(!title) return null;
  var patterns = [
    ['loan_given',      '💸 ঋণের টাকা বিতরণ'],
    ['loan_received',   '📥 ঋণ কিস্তি গ্রহণ'],
    ['withdrawal',      '💵 নগদ উত্তোলন'],
    ['deposit',         '🏦 নগদ/অনলাইনে জমা'],     // ⚡ নতুন
    ['expense',         '🧾 ক্যাশ থেকে খরচ'],
    ['support',         '🤝 সাপোর্ট'],
    ['other_bank',      '🏦 অন্য ব্যাংক'],
    ['branch_transfer', '🔁 আউটলেট'],
    ['bank_transfer',   '🏛️ ইন্টারনাল'],
    ['money_exchange',  '💱 মানি']
  ];
  for(var i = 0; i < patterns.length; i++){
    if(title.indexOf(patterns[i][1]) === 0) return patterns[i][0];
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   TIME FIELD
   ═══════════════════════════════════════════════════════════ */
function injectTimeField(body){
  if(body.querySelector('#f-time')) return;
  const dateInput = body.querySelector('#f-date');
  if(!dateInput) return;

  // ⚡ Future date block
  dateInput.setAttribute('max', todayStr());

  const dateField = dateInput.closest('.field');
  if(!dateField) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeField = document.createElement('div');
  timeField.className = 'field';
  timeField.innerHTML = '<label>🕐 সময়</label><input type="time" id="f-time" value="' + hh + ':' + mm + '">';
  if(dateField.parentElement){
    dateField.parentElement.insertBefore(timeField, dateField.nextSibling);
  }
}

/* ═══════════════════════════════════════════════════════════
   FORM HISTORY (with calendar)
   ═══════════════════════════════════════════════════════════ */
function renderFormHistory(body, type){
  let h = body.querySelector('#tx-history-auto');
  if(!h){
    h = document.createElement('div');
    h.id = 'tx-history-auto';
    body.appendChild(h);
  }
  if(h.__histDate === undefined) h.__histDate = todayStr();
  h.innerHTML = buildHistoryHTML(type, h.__histDate);

  const datePick = h.querySelector('.hist-date-pick');
  if(datePick){
    datePick.addEventListener('change', function(e){
      h.__histDate = e.target.value || '';
      renderFormHistory(body, type);
    });
  }
  const allBtn = h.querySelector('.hist-all-btn');
  if(allBtn){
    allBtn.addEventListener('click', function(){
      h.__histDate = '';
      renderFormHistory(body, type);
    });
  }
  const todayBtn = h.querySelector('.hist-today-btn');
  if(todayBtn){
    todayBtn.addEventListener('click', function(){
      h.__histDate = todayStr();
      renderFormHistory(body, type);
    });
  }
  h.querySelectorAll('[data-hist-view]').forEach(function(b){
    if(b.__wired) return;
    b.__wired = true;
    b.addEventListener('click', function(e){
      e.stopPropagation();
      if(typeof showTxDetail === 'function') showTxDetail(b.dataset.histView);
    });
  });
}

function buildHistoryHTML(type, date){
  const cfg = TX_TYPES[type] || { icon: '📌', title: type };
  const allTxs = DB.txs.filter(t => t.type === type && !t.cancelled);
  const txs = date ? allTxs.filter(t => t.date === date) : allTxs;
  const sorted = txs.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const total = sorted.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const isToday = date === todayStr();
  const isAll = !date;

  let label = '';
  if(isAll) label = '📋 সব হিস্টোরি';
  else if(isToday) label = '📋 আজকের হিস্টোরি';
  else label = '📋 ' + toBn(date) + ' তারিখের';

  let html = '<div style="margin-top:22px;padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(59,130,246,.06),rgba(0,0,0,.25));border:1.5px solid rgba(59,130,246,.3)">';

  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
    '<span style="font-size:14px;color:#fff;font-weight:900;white-space:nowrap">' + label + '</span>' +
    '<input type="date" class="hist-date-pick" max="' + todayStr() + '" value="' + (date || '') + '" ' +
      'style="padding:5px 10px;border-radius:8px;background:#050810;border:1.5px solid rgba(59,130,246,.4);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700;outline:none;cursor:pointer">' +
    '<button type="button" class="hist-all-btn" style="padding:5px 11px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">সব</button>' +
    '<button type="button" class="hist-today-btn" style="padding:5px 11px;border-radius:8px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#4ade80;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">আজ</button>' +
    '<span style="padding:3px 10px;border-radius:6px;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-size:11.5px;font-weight:800">' + toBn(sorted.length) + ' টি</span>' +
    '<span style="margin-left:auto;font-size:14px;color:#4ade80;font-weight:900">মোট: ৳ ' + fmt(total) + '</span>' +
  '</div>';

  if(!sorted.length){
    html += '<div style="padding:18px;text-align:center;border-radius:10px;background:rgba(0,0,0,.25);border:1px dashed rgba(122,138,184,.4);font-size:12.5px;color:#7a8ab8">' +
      '📭 ' + (isAll ? '' : (isToday ? 'আজ ' : toBn(date) + ' তারিখে ')) + 'কোনো লেনদেন নেই' +
    '</div>';
  } else {
    html += '<div style="max-height:280px;overflow-y:auto;border-radius:10px">' +
      '<table style="width:100%;border-collapse:collapse;min-width:auto">' +
        '<thead><tr>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:left;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25);color:#93c5fd;font-weight:900;text-transform:uppercase">তারিখ</th>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:left;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25);color:#93c5fd;font-weight:900;text-transform:uppercase">সময়</th>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:left;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25);color:#93c5fd;font-weight:900;text-transform:uppercase">গ্রাহক</th>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:left;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25);color:#93c5fd;font-weight:900;text-transform:uppercase">মন্তব্য</th>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:right;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25);color:#93c5fd;font-weight:900;text-transform:uppercase">টাকা</th>' +
          '<th style="font-size:10.5px;padding:8px 10px;text-align:center;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.25)"></th>' +
        '</tr></thead><tbody>';

    sorted.forEach(t => {
      const time = t.createdAt
        ? new Date(t.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '—';

      let who = '—';
      if(t.custName) who = '👤 ' + esc(t.custName);
      else if(t.from && t.to) who = esc(BRANCHES[t.from]?.name || '') + ' ➜ ' + esc(BRANCHES[t.to]?.name || '');

      const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
      const noteHtml = noteText
        ? '<span style="font-size:11px;color:#93c5fd;font-style:italic" title="' + esc(noteText) + '">📝 ' + esc(noteText.length > 24 ? noteText.slice(0, 24) + '…' : noteText) + '</span>'
        : '<span style="color:#4a5878;font-size:10.5px">—</span>';

      html += '<tr>' +
        '<td style="white-space:nowrap;font-size:11.5px;color:#a5b4d8;padding:8px 10px">' + toBn(t.date) + '</td>' +
        '<td style="white-space:nowrap;font-size:11.5px;color:#a5b4d8;padding:8px 10px">' + toBn(time) + '</td>' +
        '<td style="font-size:12px;padding:8px 10px">' + who + '</td>' +
        '<td style="max-width:150px;padding:8px 10px">' + noteHtml + '</td>' +
        '<td class="amt" style="font-size:13px;padding:8px 10px">৳ ' + fmt(t.amount) + '</td>' +
        '<td style="text-align:center;padding:8px 6px">' +
          '<button class="mini" data-hist-view="' + t.id + '" style="padding:4px 9px;font-size:11px">👁️</button>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
  }

  html += '</div>';
  return html;
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMER SEARCH
   ═══════════════════════════════════════════════════════════ */
function setupCustomerSearch(body){
  const searchInput = body.querySelector('#f-search');
  if(!searchInput) return;
  if(searchInput.__searchSetup) return;
  searchInput.__searchSetup = true;

  const dropdown = document.createElement('div');
  dropdown.style.cssText =
    'position:absolute;left:0;right:0;top:100%;z-index:50;margin-top:4px;max-height:280px;overflow-y:auto;' +
    'background:linear-gradient(145deg,#0f1428,#050810);border:1.5px solid rgba(59,130,246,.5);' +
    'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.8);display:none';

  const parent = searchInput.parentElement;
  if(parent){
    parent.style.position = 'relative';
    parent.appendChild(dropdown);
  }

  let activeIndex = -1;
  let currentResults = [];

  function hideDropdown(){
    dropdown.style.display = 'none';
    activeIndex = -1;
    currentResults = [];
  }

  function selectCustomer(c){
    const accEl = body.querySelector('#f-acc');
    const nameEl = body.querySelector('#f-name');
    const mobileEl = body.querySelector('#f-mobile');
    const addrEl = body.querySelector('#f-addr');
    if(accEl) accEl.value = c.accountNo || '';
    if(nameEl) nameEl.value = c.name || '';
    if(mobileEl) mobileEl.value = c.mobile || '';
    if(addrEl) addrEl.value = c.address || '';
    searchInput.value = c.accountNo || c.name || '';
    hideDropdown();
    searchInput.focus();
  }

  function renderResults(q){
    if(!q){ hideDropdown(); return; }
    const query = q.toLowerCase();
    const matches = DB.customers.filter(c => {
      const name = String(c.name || '').toLowerCase();
      const acc = String(c.accountNo || '').toLowerCase();
      const mob = String(c.mobile || '').toLowerCase();
      return name.indexOf(query) !== -1 || acc.indexOf(query) !== -1 || mob.indexOf(query) !== -1;
    }).slice(0, 15);
    currentResults = matches;

    if(!matches.length){
      dropdown.innerHTML = '<div style="padding:14px;text-align:center;font-size:12.5px;color:#7a8ab8">❌ কোনো গ্রাহক পাওয়া যায়নি</div>';
      dropdown.style.display = 'block';
      return;
    }

    let html = '';
    matches.forEach((c, i) => {
      const due = (typeof customerDue === 'function') ? customerDue(c.accountNo) : { net: 0 };
      const dueBadge = due.net > 0
        ? '<span style="padding:2px 7px;border-radius:5px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5);color:#f87171;font-size:10.5px;font-weight:800">বকেয়া ৳ ' + fmt(due.net) + '</span>'
        : '';

      html += '<div class="cust-suggest-item" data-cust-idx="' + i + '" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(59,130,246,.12)">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(145deg,rgba(236,72,153,.2),rgba(167,139,250,.1));border:1px solid rgba(236,72,153,.4);display:grid;place-items:center;flex-shrink:0;font-size:14px">👤</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
              '<b style="color:#4ade80;font-size:13.5px">' + esc(c.name || '') + '</b>' + dueBadge +
            '</div>' +
            '<div style="font-size:11.5px;color:#93c5fd;font-family:monospace;margin-top:2px">' + esc(c.accountNo || '') + '</div>' +
            (c.mobile ? '<div style="font-size:11px;color:#7a8ab8;margin-top:1px">📱 ' + esc(c.mobile) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    });

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    activeIndex = -1;

    dropdown.querySelectorAll('.cust-suggest-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const idx = parseInt(el.dataset.custIdx, 10);
        if(currentResults[idx]) selectCustomer(currentResults[idx]);
      });
    });
  }

  searchInput.addEventListener('input', e => renderResults(e.target.value.trim()));
  searchInput.addEventListener('keydown', e => {
    if(dropdown.style.display !== 'block') return;
    if(!currentResults.length) return;
    const items = dropdown.querySelectorAll('.cust-suggest-item');
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      items.forEach((el, i) => el.style.background = (i === activeIndex) ? 'rgba(59,130,246,.2)' : 'transparent');
      if(items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
    else if(e.key === 'ArrowUp'){
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      items.forEach((el, i) => el.style.background = (i === activeIndex) ? 'rgba(59,130,246,.2)' : 'transparent');
      if(items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
    else if(e.key === 'Enter'){
      if(activeIndex >= 0 && activeIndex < currentResults.length){
        e.preventDefault();
        selectCustomer(currentResults[activeIndex]);
      }
    }
    else if(e.key === 'Escape'){
      hideDropdown();
    }
  });

  setTimeout(() => {
    document.addEventListener('mousedown', function hideOnClick(e){
      if(!body.parentNode){ document.removeEventListener('mousedown', hideOnClick); return; }
      if(!parent.contains(e.target)) hideDropdown();
    });
  }, 100);
}

/* ═══════════════════════════════════════════════════════════
   DENOM HELPERS
   ═══════════════════════════════════════════════════════════ */
function denomRowHTML(prefix, values, vault){
  values = values || {};
  vault = vault || {};
  let html = '<div class="notes-row">';
  DENOMS.forEach(d => {
    const v = values[d] > 0 ? values[d] : '';
    const avail = Number(vault[d]) || 0;
    const color = avail > 0 ? '#4ade80' : '#7a8ab8';
    html += '<div class="note-item">' +
      '<label>৳ ' + toBn(d) + '</label>' +
      '<input type="text" inputmode="numeric" maxlength="5" id="' + prefix + '_' + d + '" data-denom="' + d + '" value="' + v + '" data-prefix="' + prefix + '">' +
      '<div style="font-size:10px;color:' + color + ';text-align:center;margin-top:3px;font-weight:800" id="stock_' + prefix + '_' + d + '">' + (avail > 0 ? 'আছে ' + toBn(avail) : 'নেই') + '</div>' +
    '</div>';
  });
  return html + '</div>';
}

function readNotes(scope, prefix){
  const o = {};
  scope.querySelectorAll('[id^="' + prefix + '_"]').forEach(inp => {
    if(!inp.dataset.denom) return;
    const v = parseInt(String(inp.value || '').replace(/[^0-9]/g, ''), 10) || 0;
    if(v > 0) o[inp.dataset.denom] = v;
  });
  return o;
}

function setupDenomInputs(scope, prefix, arg3, arg4){
  // ⚡ Support both signatures:
  // setupDenomInputs(scope, prefix, recalc)              → 3 args
  // setupDenomInputs(scope, prefix, branchFn, recalc)    → 4 args
  var recalc = null;
  if(typeof arg4 === 'function'){
    recalc = arg4;        // 4th arg is callback
  } else if(typeof arg3 === 'function'){
    recalc = arg3;        // 3rd arg is callback
  }

  scope.querySelectorAll('[id^="' + prefix + '_"]').forEach(function(inp){
    if(!inp.dataset.denom || inp.__setup) return;
    inp.__setup = true;

    inp.addEventListener('input', function(e){
      var v = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
      if(e.target.value !== v) e.target.value = v;
      if(recalc){
        try { recalc(); } catch(err){ console.warn('recalc error:', err); }
      }
    });
  });
}

function attachAmountInput(inp){
  if(!inp || inp.__amt) return;
  inp.__amt = true;
  inp.addEventListener('input', e => {
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if(parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    if(!raw){ e.target.value = ''; return; }
    if(raw.includes('.')){
      const p = raw.split('.');
      e.target.value = (p[0] ? Number(p[0]).toLocaleString('en-US') : '0') + '.' + p[1].slice(0, 2);
    } else {
      e.target.value = raw ? Number(raw).toLocaleString('en-US') : '';
    }
  });
  inp.addEventListener('focus', () => setTimeout(() => inp.select(), 30));
}

/* ═══════════════════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════════════════ */
function renderTopbar(){
  if(!SESSION) return;
  var isAdmin = SESSION.role === 'admin';
  var ro = READ_ONLY ? '<span class="tb-pill warn">👁️ Read-Only</span>' : '';
  var roleLabel = isAdmin ? '👑 অ্যাডমিন' : '👤 ইউজার';
  var branchName = currentBranch() === 'all' ? 'সব' : (BRANCHES[currentBranch()]?.name || currentBranch());

  var html =
    '<div class="brand">' +
      '<div style="font-size:24px">🏛️</div>' +
      '<div style="min-width:0">' +
        '<h1>কম্পিউটার ক্যাম্পাস</h1>' +
        '<p>' + esc(branchName) + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="tb-right">' + ro;

  // ⚡ User info badge (admin er jonno sidebar e ache, user er jonno topbar e)
  if(!isAdmin){
    html +=
      '<div class="tb-user" style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:10px;background:linear-gradient(145deg,rgba(59,130,246,.15),rgba(167,139,250,.08));border:1px solid rgba(59,130,246,.4);white-space:nowrap">' +
        '<span style="font-size:16px;line-height:1">👤</span>' +
        '<div style="display:flex;flex-direction:column;line-height:1.15">' +
          '<span style="font-size:12.5px;font-weight:900;color:#fff">' + esc(SESSION.name) + '</span>' +
          '<span style="font-size:10.5px;font-weight:700;color:#93c5fd">' + roleLabel + ' • ' + esc(branchName) + '</span>' +
        '</div>' +
      '</div>';
  }

  // ⚡ Admin er jonno branch select
  if(isAdmin){
    html +=
      '<select id="tb-branch">' +
        '<option value="all"' + (VIEW_BRANCH === 'all' ? ' selected' : '') + '>🏦 সব আউটলেট</option>' +
        '<option value="kalaroa"' + (VIEW_BRANCH === 'kalaroa' ? ' selected' : '') + '>কলারোয়া</option>' +
        '<option value="jhaudanga"' + (VIEW_BRANCH === 'jhaudanga' ? ' selected' : '') + '>ঝাউডাঙ্গা</option>' +
      '</select>';
  }

  html += '<input type="date" id="tb-date" value="' + DASH_DATE + '" style="width:145px">';

  // ⚡ User mode — extra buttons
  if(!isAdmin){
    html +=
      '<button class="tb-btn" id="tb-all-data" title="সব ডেটা">📋 সব ডেটা</button>' +
      '<button class="tb-btn" id="tb-logout" title="লগআউট" style="background:linear-gradient(135deg,#dc2626,#991b1b)">🚪 লগআউট</button>';
  }

  html += '</div>';

  document.getElementById('topbar').innerHTML = html;

  // ═══ Date change ═══
  var dateEl = document.getElementById('tb-date');
  if(dateEl){
    dateEl.addEventListener('change', function(e){
      DASH_DATE = e.target.value || todayStr();
      renderDashboard();
    });
  }

  // ═══ Branch change (admin) ═══
  var branchEl = document.getElementById('tb-branch');
  if(branchEl){
    branchEl.addEventListener('change', function(e){
      VIEW_BRANCH = e.target.value;
      renderDashboard();
    });
  }

  // ═══ All Data (user) ═══
  var allDataBtn = document.getElementById('tb-all-data');
  if(allDataBtn){
    allDataBtn.addEventListener('click', function(){
      if(typeof openAllData === 'function') openAllData();
    });
  }

  // ═══ Logout (user) ═══
  var logoutBtn = document.getElementById('tb-logout');
  if(logoutBtn){
    logoutBtn.addEventListener('click', function(){
      if(typeof doLogout === 'function') doLogout();
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function renderDashboard(){
  if(!SESSION) return;
  recomputeLive();
  const bf = currentBranch();
  const st = calcStats(bf, DASH_DATE);

  // ⚡ Date-specific state
  const isToday = DASH_DATE === todayStr();
  let bal, vault;

  if(isToday){
    // আজ — current live state
    bal = getBalances(bf);
    vault = getVault(bf);
  } else {
    // Past date — compute state up to that date
    const state = computeStateAtDate(bf, DASH_DATE);
    bal = state.totals;
    vault = state.vaultTotals;
  }
  const totalCapital = Number(DB.totalCapital) || 0;
  const surplus = (bal.bank + bal.cash + bal.other) - totalCapital;

  const pendingT = DB.txs.filter(t =>
    t.type === 'branch_transfer' && !t.accepted && !t.cancelled &&
    (bf === 'all' || t.to === bf));

  let html = '';

  // ═══ STATS CARDS ═══
  html += '<div class="section"><div class="section-title"><span class="bar"></span>📊 ড্যাশবোর্ড<span class="badge">' + toBn(DASH_DATE) + '</span></div><div class="grid" id="stats-grid">';

  const cards = [
    { type: 'loan_given',    icon: TX_TYPES.loan_given.icon,    title: TX_TYPES.loan_given.title,    amt: st.loan_given.amt,    cnt: st.loan_given.cnt },
    { type: 'loan_received', icon: TX_TYPES.loan_received.icon, title: TX_TYPES.loan_received.title, amt: st.loan_received.amt, cnt: st.loan_received.cnt },
    { type: 'deposit',       icon: TX_TYPES.deposit.icon,       title: TX_TYPES.deposit.title,       amt: st.deposit.amt,       cnt: st.deposit.cnt },
    { type: 'withdrawal',    icon: TX_TYPES.withdrawal.icon,    title: TX_TYPES.withdrawal.title,    amt: st.withdrawal.amt,    cnt: st.withdrawal.cnt },
    { type: 'expense',       icon: TX_TYPES.expense.icon,       title: TX_TYPES.expense.title,       amt: st.expense.amt,       cnt: st.expense.cnt },
    { type: 'customer',      icon: '👥',                        title: 'গ্রাহক',                     amt: DB.customers.length,  cnt: 0, isCount: true }
  ];
  cards.forEach(c => {
    html += '<div class="card" data-type="' + c.type + '"><div class="ico">' + c.icon + '</div><h3>' + c.title + '</h3>' +
      '<div class="amt">' + (c.isCount ? toBn(c.amt) + ' জন' : '৳ ' + fmt(c.amt)) + '</div>' +
      (c.cnt ? '<div class="sub">' + toBn(c.cnt) + ' টি</div>' : '') + '</div>';
  });

  html += '<div class="card" data-type="branch_transfer"><div class="ico">' + TX_TYPES.branch_transfer.icon + '</div><h3>' + TX_TYPES.branch_transfer.title + '</h3>' +
    '<div class="amt sm"><span>পাঠানো:</span><span>৳ ' + fmt(st.transfer.out) + '</span></div>' +
    '<div class="amt sm"><span>গৃহীত:</span><span>৳ ' + fmt(st.transfer.in) + '</span></div>' +
    (pendingT.length ? '<div class="badge-red">⏳ ' + toBn(pendingT.length) + ' টি</div>' : '') + '</div>';

  html += '<div class="card" data-type="bank_transfer"><div class="ico">' + TX_TYPES.bank_transfer.icon + '</div><h3>' + TX_TYPES.bank_transfer.title + '</h3>' +
    '<div class="amt sm"><span>আসা:</span><span>৳ ' + fmt(st.bank_transfer.in) + '</span></div>' +
    '<div class="amt sm"><span>পাঠানো:</span><span>৳ ' + fmt(st.bank_transfer.out) + '</span></div></div>';

  const oIn = (st.other.in || 0) + (st.other.onlineIn || 0);
  const oOut = (st.other.out || 0) + (st.other.onlineOut || 0);
  html += '<div class="card" data-type="other_bank"><div class="ico">' + TX_TYPES.other_bank.icon + '</div><h3>' + TX_TYPES.other_bank.title + '</h3>' +
    '<div class="amt sm"><span>আসা:</span><span>৳ ' + fmt(oIn) + '</span></div>' +
    '<div class="amt sm"><span>পাঠানো:</span><span>৳ ' + fmt(oOut) + '</span></div></div>';

  html += '<div class="card" data-type="support"><div class="ico">' + TX_TYPES.support.icon + '</div><h3>' + TX_TYPES.support.title + '</h3>' +
    '<div class="amt sm"><span>প্রদান:</span><span>৳ ' + fmt(st.support.out) + '</span></div>' +
    '<div class="amt sm"><span>ফেরত:</span><span>৳ ' + fmt(st.support.in) + '</span></div></div>';

  html += '<div class="card" data-type="money_exchange"><div class="ico">' + TX_TYPES.money_exchange.icon + '</div><h3>' + TX_TYPES.money_exchange.title + '</h3>' +
    (st.money_exchange.online > 0 ?
      '<div class="amt sm"><span>🌐 Online:</span><span>৳ ' + fmt(st.money_exchange.online) + '</span></div>' : '') +
    (st.money_exchange.out > 0 ?
      '<div class="amt sm"><span>💸 প্রদান:</span><span>৳ ' + fmt(st.money_exchange.out) + '</span></div>' : '') +
    (st.money_exchange.in > 0 ?
      '<div class="amt sm"><span>📥 গ্রহণ:</span><span>৳ ' + fmt(st.money_exchange.in) + '</span></div>' : '') +
    '<div class="sub">মোট: <b>' + toBn(st.money_exchange.cnt) + '</b> টি</div>' +
  '</div>';

  // ⚡ Collect + Support Due Card
  // ⚡ সব branch এর count (informed থাকার জন্য)
  const pendingCountForCard = DB.txs.filter(t => {
    if(t.type !== 'loan_given' || t.cancelled) return false;
    const owed = Number(t.cashNotTakenAmount) || 0;
    const collected = Number(t.collectedAmount) || 0;
    return (owed - collected) > 0.01;
  }).length;

  const supportDueCountForCard = DB.customers.filter(c => {
    if(typeof customerDue !== 'function') return false;
    return customerDue(c.accountNo).net > 0.01;
  }).length;

  html += '<div class="card" data-type="pending-hub" style="border-color:rgba(250,204,21,.5);background:linear-gradient(145deg,rgba(250,204,21,.08),rgba(236,72,153,.05))">' +
    '<div class="ico">💰</div>' +
    '<h3>বাকি হিসাব</h3>' +
    '<div class="amt sm"><span style="color:#facc15">💰 ক্যাশ সংগ্রহ:</span><span style="color:#facc15">' + toBn(pendingCountForCard) + ' জন</span></div>' +
    '<div class="amt sm"><span style="color:#ec4899">🤝 সাপোর্ট:</span><span style="color:#ec4899">' + toBn(supportDueCountForCard) + ' জন</span></div>' +
    '<div class="sub">👆 বিস্তারিত দেখতে ক্লিক</div>' +
  '</div>';

  html += '</div></div>';

  // ═══ VAULT ═══
  html += '<div class="section"><div class="section-title"><span class="bar"></span>🗄️ ভল্ট ইনভেন্টরি</div><div class="vault-row">';
  let vTotal = 0, vNotes = 0;
  DENOMS.forEach(d => {
    const c = vault[d] || 0;
    vTotal += c * d;
    vNotes += c;
    html += '<div class="vault-item' + (c === 0 ? ' empty' : '') + '"><div class="d">৳ ' + toBn(d) + '</div>' +
      '<div class="c">' + toBn(c) + '</div><div class="a">৳ ' + fmt(c * d) + '</div></div>';
  });
  html += '</div>';
  html += '<div style="margin-top:10px;padding:12px 16px;border-radius:12px;background:rgba(250,204,21,.12);border:1.5px solid rgba(250,204,21,.4);display:flex;justify-content:space-between;font-weight:900">' +
    '<span>মোট নোট: <b>' + toBn(vNotes) + '</b> টি</span>' +
    '<span style="color:#facc15">মোট: ৳ ' + fmt(vTotal) + '</span></div></div>';

  // ═══ BALANCE ═══
  html += '<div class="section"><div class="section-title"><span class="bar"></span>💰 ব্যালেন্স</div><div class="bal-grid">';
  html += '<div class="bal blue"><div class="lbl">🏦 মাদার অ্যাকাউন্ট</div><div class="val">৳ ' + fmt(bal.bank) + '</div></div>';
  html += '<div class="bal green"><div class="lbl">💵 ক্যাশ ইন হ্যান্ড</div><div class="val">৳ ' + fmt(bal.cash) + '</div></div>';
  html += '<div class="bal purple"><div class="lbl">🏛️ অন্যান্য ব্যাংকে</div><div class="val">৳ ' + fmt(bal.other) + '</div></div>';
  html += '<div class="bal yellow"><div class="lbl">🧾 আজকের খরচ</div><div class="val">৳ ' + fmt(st.expense.amt) + '</div></div>';
  html += '</div>';

  if(SESSION.role === 'admin'){
    html += '<div class="bal-grid">';
    html += '<div class="bal blue"><div class="lbl">⭐ সর্বমোট</div><div class="val">৳ ' + fmt(bal.bank + bal.cash + bal.other) + '</div></div>';
    html += '<div class="bal purple"><div class="lbl">💰 মূলধন</div><div class="val">৳ ' + fmt(totalCapital) + '</div></div>';
    html += '<div class="bal ' + (surplus >= 0 ? 'green' : 'yellow') + '"><div class="lbl">' + (surplus >= 0 ? '✅ উদ্বৃত্ত' : '⚠️ ঘাটতি') + '</div><div class="val">৳ ' + fmt(Math.abs(surplus)) + '</div></div>';
    html += '</div>';
  }
  html += '</div>';

  

  // ═══ PENDING ═══
  if(pendingT.length){
    html += '<div class="section"><div class="section-title"><span class="bar"></span>⏳ অপেক্ষমাণ<span class="badge">' + toBn(pendingT.length) + ' টি</span></div>';
    html += '<div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>From ➜ To</th><th>📝 মন্তব্য</th><th>টাকা</th><th>অ্যাকশন</th></tr></thead><tbody>';
    pendingT.forEach(t => {
      const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
      const noteHtml = noteText
        ? '<span style="font-size:11.5px;color:#93c5fd;font-style:italic">📝 ' + esc(noteText) + '</span>'
        : '<span style="color:#4a5878;font-size:11px">—</span>';
      html += '<tr><td>' + toBn(t.date) + '</td>' +
        '<td>' + esc(BRANCHES[t.from]?.name || '') + ' ➜ <b>' + esc(BRANCHES[t.to]?.name || '') + '</b></td>' +
        '<td style="max-width:200px;font-size:12px">' + noteHtml + '</td>' +
        '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
        '<td><button class="mini accept" data-acc="' + t.id + '">✅ গ্রহণ</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
  }

  $('#main').innerHTML = html;

  document.querySelectorAll('#stats-grid .card').forEach(c => {
    c.addEventListener('click', () => {
      const t = c.dataset.type;
      if(t === 'customer') openCustomerList();
      else if(t === 'pending-hub') openPendingHub();
      else openTxForm(t);
    });
  });

  document.querySelectorAll('[data-acc]').forEach(b => {
    b.addEventListener('click', async e => {
      e.stopPropagation();
      await acceptTransfer(b.dataset.acc);
    });
  });
}


/* ═══════════════════════════════════════════════════════════
   🕐 SIDEBAR LIVE CLOCK
   ═══════════════════════════════════════════════════════════ */
let __sbClockTimer = null;


/* ═══════════════════════════════════════════════════════════
   💰🤝 PENDING HUB — Tabs: Cash Collection + Support Due
   ═══════════════════════════════════════════════════════════ */
function openPendingHub(){
  if(!SESSION) return;

  // ⚡ সব user সব branch দেখবে (informed থাকার জন্য)
  const bf = 'all';

  // ═══ Tab 1: Cash collection pending ═══
  const pendingCollections = DB.txs.filter(t => {
    if(t.type !== 'loan_given' || t.cancelled) return false;
    if(bf !== 'all' && t.branch !== bf) return false;
    const owed = Number(t.cashNotTakenAmount) || 0;
    const collected = Number(t.collectedAmount) || 0;
    return (owed - collected) > 0.01;
  }).map(t => {
    const owed = Number(t.cashNotTakenAmount) || 0;
    const collected = Number(t.collectedAmount) || 0;
    return {
      ...t,
      _owed: owed,
      _collected: collected,
      _pending: Math.round((owed - collected) * 100) / 100
    };
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // ═══ Tab 2: Support due ═══
  const supportList = [];
  DB.customers.forEach(c => {
    if(bf !== 'all' && c.branch !== bf) return;
    const due = (typeof customerDue === 'function') ? customerDue(c.accountNo) : { net: 0, paid: 0, refund: 0 };
    if(due.net > 0.01){
      supportList.push({
        ...c,
        _paid: due.paid,
        _refund: due.refund,
        _due: due.net
      });
    }
  });
  supportList.sort((a, b) => b._due - a._due);

  // ═══════════════════════════════════════════════════════════
  // Cash Tab HTML
  // ═══════════════════════════════════════════════════════════
  function buildCashTab(){
    if(!pendingCollections.length){
      return '<div style="padding:40px 20px;text-align:center">' +
        '<div style="font-size:56px;margin-bottom:12px">🎉</div>' +
        '<div style="font-size:16px;color:#4ade80;font-weight:900;margin-bottom:6px">সব ক্যাশ সংগৃহীত</div>' +
        '<div style="font-size:13px;color:#7a8ab8">কোনো গ্রাহকের কাছে ক্যাশ বাকি নেই</div>' +
      '</div>';
    }

    const totalPending = pendingCollections.reduce((s, t) => s + t._pending, 0);
    const totalOwed = pendingCollections.reduce((s, t) => s + t._owed, 0);
    const totalCollected = pendingCollections.reduce((s, t) => s + t._collected, 0);

    let html = '';

    // Summary
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(250,204,21,.12);border:1.5px solid rgba(250,204,21,.4)">' +
        '<div style="font-size:11px;color:#facc15;font-weight:800;text-transform:uppercase">💰 মোট নেয়নি</div>' +
        '<div style="font-size:18px;color:#fff;font-weight:900;margin-top:4px">৳ ' + fmt(totalOwed) + '</div>' +
      '</div>' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(34,197,94,.12);border:1.5px solid rgba(34,197,94,.4)">' +
        '<div style="font-size:11px;color:#4ade80;font-weight:800;text-transform:uppercase">✅ সংগৃহীত</div>' +
        '<div style="font-size:18px;color:#fff;font-weight:900;margin-top:4px">৳ ' + fmt(totalCollected) + '</div>' +
      '</div>' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(220,38,38,.12);border:1.5px solid rgba(220,38,38,.5)">' +
        '<div style="font-size:11px;color:#f87171;font-weight:800;text-transform:uppercase">⏳ বাকি</div>' +
        '<div style="font-size:18px;color:#f87171;font-weight:900;margin-top:4px">৳ ' + fmt(totalPending) + '</div>' +
      '</div>' +
    '</div>';

    // Table
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th>তারিখ</th>' +
      '<th>গ্রাহক</th>' +
      '<th>আউটলেট</th>' +
      '<th style="text-align:right">নেয়নি</th>' +
      '<th style="text-align:right">সংগৃহীত</th>' +
      '<th style="text-align:right">বাকি</th>' +
      '<th style="text-align:center">অ্যাকশন</th>' +
    '</tr></thead><tbody>';

    pendingCollections.slice(0, 100).forEach(t => {
      const isPartial = t._collected > 0;
      html += '<tr>' +
        '<td style="white-space:nowrap;font-size:12px">' + toBn(t.date) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(145deg,rgba(250,204,21,.2),rgba(220,38,38,.1));border:1px solid rgba(250,204,21,.4);display:grid;place-items:center;flex-shrink:0;font-size:12px">👤</div>' +
            '<div style="min-width:0">' +
              '<div style="color:#facc15;font-weight:800;font-size:12.5px">' + esc(t.custName || '—') + '</div>' +
              (t.custAcc ? '<div style="font-size:10px;color:#93c5fd;font-family:monospace">' + esc(t.custAcc) + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td style="font-size:11.5px">' + esc(BRANCHES[t.branch]?.name || '—') + '</td>' +
        '<td class="amt" style="color:#facc15">৳ ' + fmt(t._owed) + '</td>' +
        '<td class="amt" style="color:' + (isPartial ? '#4ade80' : '#7a8ab8') + '">৳ ' + fmt(t._collected) + '</td>' +
        '<td class="amt" style="color:#f87171;font-weight:900">৳ ' + fmt(t._pending) + '</td>' +
        '<td style="text-align:center;white-space:nowrap">' +
          '<button class="mini cash" data-collect="' + t.id + '" data-mode="cash" style="margin-right:3px">💵</button>' +
          '<button class="mini online" data-collect="' + t.id + '" data-mode="online" style="margin-right:3px">🌐</button>' +
          '<button class="mini" data-tx-detail="' + t.id + '">👁️</button>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';

    if(pendingCollections.length > 100){
      html += '<div style="padding:8px;text-align:center;background:rgba(250,204,21,.08);font-size:12px;color:#facc15;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ১০০ জন (মোট ' + toBn(pendingCollections.length) + ')</div>';
    }

    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // Support Tab HTML
  // ═══════════════════════════════════════════════════════════
  function buildSupportTab(){
    if(!supportList.length){
      return '<div style="padding:40px 20px;text-align:center">' +
        '<div style="font-size:56px;margin-bottom:12px">🎉</div>' +
        '<div style="font-size:16px;color:#4ade80;font-weight:900;margin-bottom:6px">সব পরিশোধিত</div>' +
        '<div style="font-size:13px;color:#7a8ab8">কোনো সাপোর্ট বকেয়া নেই</div>' +
      '</div>';
    }

    const totalPaid = supportList.reduce((s, c) => s + c._paid, 0);
    const totalRefund = supportList.reduce((s, c) => s + c._refund, 0);
    const totalDue = supportList.reduce((s, c) => s + c._due, 0);

    let html = '';

    // Summary
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(59,130,246,.12);border:1.5px solid rgba(59,130,246,.4)">' +
        '<div style="font-size:11px;color:#93c5fd;font-weight:800;text-transform:uppercase">📤 মোট প্রদান</div>' +
        '<div style="font-size:18px;color:#93c5fd;font-weight:900;margin-top:4px">৳ ' + fmt(totalPaid) + '</div>' +
      '</div>' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(34,197,94,.12);border:1.5px solid rgba(34,197,94,.4)">' +
        '<div style="font-size:11px;color:#4ade80;font-weight:800;text-transform:uppercase">↩️ মোট ফেরত</div>' +
        '<div style="font-size:18px;color:#4ade80;font-weight:900;margin-top:4px">৳ ' + fmt(totalRefund) + '</div>' +
      '</div>' +
      '<div style="padding:12px 14px;border-radius:12px;background:rgba(236,72,153,.12);border:1.5px solid rgba(236,72,153,.5)">' +
        '<div style="font-size:11px;color:#ec4899;font-weight:800;text-transform:uppercase">⚠️ মোট বকেয়া</div>' +
        '<div style="font-size:18px;color:#ec4899;font-weight:900;margin-top:4px">৳ ' + fmt(totalDue) + '</div>' +
      '</div>' +
    '</div>';

    // Table
    html += '<div class="table-wrap"><table><thead><tr>' +
      '<th style="width:40px;text-align:center">#</th>' +
      '<th>গ্রাহক</th>' +
      '<th>আউটলেট</th>' +
      '<th style="text-align:right">প্রদান</th>' +
      '<th style="text-align:right">ফেরত</th>' +
      '<th style="text-align:right">বকেয়া</th>' +
      '<th style="text-align:center">হিস্টোরি</th>' +
    '</tr></thead><tbody>';

    supportList.slice(0, 100).forEach((c, i) => {
      html += '<tr>' +
        '<td style="text-align:center;color:#7a8ab8;font-weight:800;font-size:11.5px">' + toBn(i + 1) + '</td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(145deg,rgba(236,72,153,.2),rgba(167,139,250,.1));border:1px solid rgba(236,72,153,.4);display:grid;place-items:center;flex-shrink:0;font-size:12px">👤</div>' +
            '<div style="min-width:0">' +
              '<div style="color:#ec4899;font-weight:800;font-size:12.5px">' + esc(c.name || '—') + '</div>' +
              (c.accountNo ? '<div style="font-size:10px;color:#93c5fd;font-family:monospace">' + esc(c.accountNo) + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td style="font-size:11.5px">' + esc(BRANCHES[c.branch]?.name || '—') + '</td>' +
        '<td class="amt" style="color:#93c5fd">৳ ' + fmt(c._paid) + '</td>' +
        '<td class="amt" style="color:#4ade80">৳ ' + fmt(c._refund) + '</td>' +
        '<td class="amt" style="color:#f87171;font-weight:900">৳ ' + fmt(c._due) + '</td>' +
        '<td style="text-align:center">' +
          '<button class="mini" data-support-cust="' + esc(c.accountNo) + '">📜</button>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';

    if(supportList.length > 100){
      html += '<div style="padding:8px;text-align:center;background:rgba(236,72,153,.08);font-size:12px;color:#ec4899;font-weight:700;border-radius:8px;margin-top:8px">প্রথম ১০০ জন (মোট ' + toBn(supportList.length) + ')</div>';
    }

    return html;
  }

  // ═══════════════════════════════════════════════════════════
  // Open Modal
  // ═══════════════════════════════════════════════════════════
  const cashCount = pendingCollections.length;
  const supCount = supportList.length;

  const bodyHTML =
    // Branch info banner
    '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;margin-bottom:12px;border-radius:9px;background:linear-gradient(145deg,rgba(59,130,246,.1),rgba(167,139,250,.05));border:1px solid rgba(59,130,246,.3)">' +
      '<span style="font-size:16px">🏦</span>' +
      '<span style="font-size:12px;color:#93c5fd;font-weight:800">' +
        (bf === 'all' ? 'উভয় আউটলেট — কলারোয়া + ঝাউডাঙ্গা' : (BRANCHES[bf]?.name || bf)) +
      '</span>' +
      (bf === 'all' ? '<span style="padding:2px 8px;border-radius:5px;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-size:10.5px;font-weight:900;margin-left:auto">✅ সব</span>' : '') +
    '</div>' +

    // Tab buttons
    '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' +
      '<button class="ph-tab-btn active" data-ph-tab="cash" style="flex:1;min-width:150px;padding:12px 16px;border-radius:11px;background:linear-gradient(135deg,rgba(250,204,21,.2),rgba(250,204,21,.08));border:1.5px solid rgba(250,204,21,.5);color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
        '<span>💰 ক্যাশ সংগ্রহ</span>' +
        '<span style="padding:2px 9px;border-radius:6px;background:rgba(250,204,21,.3);font-size:11.5px;font-weight:900">' + toBn(cashCount) + '</span>' +
      '</button>' +
      '<button class="ph-tab-btn" data-ph-tab="support" style="flex:1;min-width:150px;padding:12px 16px;border-radius:11px;background:rgba(0,0,0,.3);border:1.5px solid rgba(236,72,153,.3);color:#a5b4d8;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
        '<span>🤝 সাপোর্ট বকেয়া</span>' +
        '<span style="padding:2px 9px;border-radius:6px;background:rgba(236,72,153,.3);font-size:11.5px;font-weight:900">' + toBn(supCount) + '</span>' +
      '</button>' +
    '</div>' +

    // Tab content
    '<div id="ph-content-cash" class="ph-content">' + buildCashTab() + '</div>' +
    '<div id="ph-content-support" class="ph-content" style="display:none">' + buildSupportTab() + '</div>';

  const m = openModal({
    title: '💰 বাকি হিসাব — ক্যাশ ও সাপোর্ট',
    bodyHTML: bodyHTML,
    xwide: true
  });

  // ═══ Wire Tabs + Buttons ═══
  setTimeout(() => {
    const root = m.bg.querySelector('.modal-body');
    if(!root) return;

    // Tab switching
    root.querySelectorAll('[data-ph-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.phTab;

        root.querySelectorAll('[data-ph-tab]').forEach(b => {
          const bTab = b.dataset.phTab;
          if(bTab === tab){
            b.classList.add('active');
            b.style.background = (bTab === 'cash')
              ? 'linear-gradient(135deg,rgba(250,204,21,.2),rgba(250,204,21,.08))'
              : 'linear-gradient(135deg,rgba(236,72,153,.2),rgba(236,72,153,.08))';
            b.style.borderColor = (bTab === 'cash') ? 'rgba(250,204,21,.5)' : 'rgba(236,72,153,.5)';
            b.style.color = '#fff';
          } else {
            b.classList.remove('active');
            b.style.background = 'rgba(0,0,0,.3)';
            b.style.borderColor = (bTab === 'cash') ? 'rgba(250,204,21,.3)' : 'rgba(236,72,153,.3)';
            b.style.color = '#a5b4d8';
          }
        });

        root.querySelector('#ph-content-cash').style.display = (tab === 'cash') ? 'block' : 'none';
        root.querySelector('#ph-content-support').style.display = (tab === 'support') ? 'block' : 'none';
      });
    });

    // Cash collect
    root.querySelectorAll('[data-collect]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        m.close();
        setTimeout(() => {
          if(typeof openCollectModal === 'function') openCollectModal(b.dataset.collect, b.dataset.mode);
        }, 100);
      });
    });

    // Tx detail
    root.querySelectorAll('[data-tx-detail]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        m.close();
        setTimeout(() => {
          if(typeof showTxDetail === 'function') showTxDetail(b.dataset.txDetail);
        }, 100);
      });
    });

    // Support customer
    root.querySelectorAll('[data-support-cust]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        m.close();
        setTimeout(() => {
          if(typeof openCustomerDetail === 'function') openCustomerDetail(b.dataset.supportCust);
        }, 100);
      });
    });
  }, 50);
}

console.log('✅ UI loaded — v1.2 (clean base)');

/* ═══════════════════════════════════════════════════════════
   📅 FUTURE DATE BLOCK — Global watcher
   যেকোনো date input এ max=today auto-set
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function applyMaxToDateInputs(){
    var today = todayStr();
    // সব date input খুঁজে বের করো (form + history)
    var inputs = document.querySelectorAll('input[type="date"]');
    for(var i = 0; i < inputs.length; i++){
      var el = inputs[i];
      if(el.getAttribute('max') !== today){
        el.setAttribute('max', today);
      }
      // Extra safety: block future value on change
      if(!el.__futureBlocked){
        el.__futureBlocked = true;
        el.addEventListener('change', function(e){
          if(e.target.value && e.target.value > todayStr()){
            e.target.value = todayStr();
            if(typeof toast === 'function') toast('⚠️ ভবিষ্যতের তারিখ নির্বাচন করা যাবে না');
          }
        });
        el.addEventListener('input', function(e){
          if(e.target.value && e.target.value > todayStr()){
            e.target.value = todayStr();
          }
        });
      }
    }
  }

  // প্রতি 300ms এ check (নতুন modal খুললেও apply হবে)
  setInterval(applyMaxToDateInputs, 300);

  // Initial run
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyMaxToDateInputs);
  } else {
    applyMaxToDateInputs();
  }

/* ═══════════════════════════════════════════════════════════
   SIDEBAR — User info + Live clock (fresh version)
   ═══════════════════════════════════════════════════════════ */
function renderSidebar(){
  if(!SESSION) return;
  const isAdmin = SESSION.role === 'admin';
  const bf = currentBranch();
  const roleLabel = isAdmin ? '👑 অ্যাডমিন' : '👤 ইউজার';
  const branchName = bf === 'all' ? 'সব' : (BRANCHES[bf]?.name || bf);

  // ═══ HEADER ═══
  var headEl = document.querySelector('#sidebar .sb-head');
  if(headEl){
    headEl.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;row-gap:6px;padding:11px 13px;border-radius:12px;background:linear-gradient(145deg, rgba(59,130,246,.15), rgba(167,139,250,.08));border:1.5px solid rgba(59,130,246,.4);box-shadow:0 4px 12px rgba(0,0,0,.3)">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:18px;line-height:1">📅</span>' +
          '<span id="sb-date" style="font-size:15px;color:#93c5fd;font-weight:900;letter-spacing:.2px;white-space:nowrap">--/--/----</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:18px;line-height:1">🕐</span>' +
          '<span id="sb-time" style="font-size:15px;color:#facc15;font-weight:900;letter-spacing:.4px;white-space:nowrap">--:--:-- --</span>' +
        '</div>' +
        '<button onclick="closeSidebar()" style="margin-left:auto;padding:4px 9px;border-radius:7px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5);color:#f87171;font-family:inherit;font-size:11.5px;font-weight:900;cursor:pointer;flex-shrink:0">✕</button>' +
      '</div>';
    startSidebarClock();
  }

  // ═══ BODY ═══
  var bodyHTML = '';
  bodyHTML += '<div class="sb-user">';
  bodyHTML += '<div class="name">👤 ' + esc(SESSION.name) + '</div>';
  bodyHTML += '<div class="role">' + roleLabel + ' • ' + esc(branchName) + '</div>';
  bodyHTML += '</div>';
  bodyHTML += '<div class="sb-section">ড্যাশবোর্ড</div>';
  bodyHTML += '<button class="sb-btn" onclick="openAllData()">📋 সব ডেটা</button>';
  bodyHTML += '<button class="sb-btn" onclick="openDueList()">🤝 বকেয়া তালিকা</button>';

  // Audit Log শুধু admin
  if(isAdmin){
    bodyHTML += '<button class="sb-btn" onclick="openAuditLog()">📜 অডিট লগ</button>';
  }

  if(isAdmin){
    bodyHTML += '<div class="sb-section">ম্যানেজমেন্ট</div>';
    bodyHTML += '<button class="sb-btn" onclick="openBranchMgmt()">🏢 আউটলেট ম্যানেজমেন্ট</button>';
    bodyHTML += '<button class="sb-btn" onclick="openUserMgmt()">👥 ইউজার ম্যানেজমেন্ট</button>';
    bodyHTML += '<button class="sb-btn" onclick="openBackupMgmt()">💾 ব্যাকআপ / রিস্টোর</button>';
    bodyHTML += '<button class="sb-btn" onclick="openDangerZone()">🚨 ডেঞ্জার জোন</button>';
  }

  bodyHTML += '<div class="sb-section">সেশন</div>';
  bodyHTML += '<button class="sb-btn danger" onclick="doLogout()">🚪 লগআউট</button>';

  var bodyEl = document.getElementById('sb-body');
  if(bodyEl) bodyEl.innerHTML = bodyHTML;
}

/* ═══════════════════════════════════════════════════════════
   LIVE CLOCK
   ═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   OPEN / CLOSE
   ═══════════════════════════════════════════════════════════ */
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

/* ============================================================
   🛡️ GLOBAL TX VALIDATION — Negative block
   ============================================================ */
(function(){
  'use strict';

  // ⚡ Form save button এ validator attach
  document.addEventListener('click', function(e){
    var btn = e.target.closest('#f-save, #c-save, #cc-save, #me_save');
    if(!btn) return;

    var modal = btn.closest('.modal');
    if(!modal) return;

    // Vault out values check করো
    var prefix = null;
    modal.querySelectorAll('input[data-denom]').forEach(function(inp){
      if(inp.dataset.prefix) prefix = inp.dataset.prefix;
    });

    // ⚡ সব number input check
    var errors = [];
    modal.querySelectorAll('input[inputmode="decimal"], input[inputmode="numeric"]').forEach(function(inp){
      var v = parseNum(inp.value);
      if(v < 0){
        errors.push('❌ Negative পরিমাণ: ' + inp.value);
        inp.style.borderColor = '#dc2626';
      }
    });

    if(errors.length > 0){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert(errors.join('\n') + '\n\nধনাত্মক সংখ্যা দিন।');
      return false;
    }
  }, true);

  // ⚡ Negative value typed হলে সাথে সাথে block
  document.addEventListener('input', function(e){
    var inp = e.target;
    if(!inp) return;
    if(inp.tagName !== 'INPUT') return;
    if(inp.inputMode !== 'decimal' && inp.inputMode !== 'numeric') return;

    var val = inp.value;
    if(val && val.indexOf('-') !== -1){
      inp.value = val.replace(/-/g, '');
      if(typeof toast === 'function') toast('⚠️ Negative value allowed না', 'warn');
    }
  }, true);

  console.log('✅ Global negative input block active');
})();

  console.log('✅ Future-date blocker active');
})();