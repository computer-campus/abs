/* ============================================================
   FILE: render/render-dashboard.js
   PURPOSE: Dashboard cards + Vault + Balance
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 DATE BANNER
   ═══════════════════════════════════════════════════════════ */
function renderDateBanner(){
  const box = document.getElementById('dateBannerSection');
  if(!box) return;
  
  if(!isDateViewMode){
    box.innerHTML = '';
    return;
  }
  
  box.innerHTML =
    '<div class="date-mode-banner">' +
      '<span>📅</span>' +
      '<span>আপনি <b>' + toBn(dashDate) + '</b> তারিখের ডাটা দেখছেন।</span>' +
      '<button class="close-mode" id="btnExitDateMode">🔄 আজকে ফিরুন</button>' +
    '</div>';
  
  document.getElementById('btnExitDateMode').addEventListener('click', () => {
    isDateViewMode = false;
    dashDate = todayStr();
    renderTopbar();
    renderDashboard(true);
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 RENDER DASHBOARD (with debounce)
   ═══════════════════════════════════════════════════════════ */
function renderDashboard(force){
  if(!session) return;
  
  if(force){
    if(__renderTimer){ clearTimeout(__renderTimer); __renderTimer = null; }
    __actualRenderDashboard();
    return;
  }
  
  if(__renderTimer) clearTimeout(__renderTimer);
  __renderTimer = setTimeout(() => {
    __renderTimer = null;
    __actualRenderDashboard();
  }, 150);
}

function __actualRenderDashboard(){
  if(!session) return;
  
  performDailyRollover(false);
  recalcAllCustomerDues(false);
  
  const bf = currentBranchFilter();
  const st = computeStats(bf, dashDate);
  
  renderDateBanner();
  renderStats(bf, st);
  renderVault(bf);
  renderBalances(bf, st);
  renderDueSection();
  renderCollectionPendingSection();
}

/* ═══════════════════════════════════════════════════════════
   🔥 LIGHT UPDATE (for new transactions)
   ═══════════════════════════════════════════════════════════ */
let __lightRenderTimer = null;
let __lightRenderPending = false;

function updateDashboardLight(){
  if(__lightRenderPending) return;
  __lightRenderPending = true;
  
  if(__lightRenderTimer) clearTimeout(__lightRenderTimer);
  
  __lightRenderTimer = setTimeout(() => {
    __lightRenderTimer = null;
    
    requestAnimationFrame(() => {
      try{
        const bf = currentBranchFilter();
        const st = computeStats(bf, dashDate);
        
        renderStats(bf, st);
        renderVault(bf);
        renderBalances(bf, st);
        
        if(window.__heavyRenderTimer) clearTimeout(window.__heavyRenderTimer);
        window.__heavyRenderTimer = setTimeout(() => {
          window.__heavyRenderTimer = null;
          try{ renderDueSection(); } catch(e){}
          try{ renderCollectionPendingSection(); } catch(e){}
          __lightRenderPending = false;
        }, 200);
      } catch(e){
        __lightRenderPending = false;
      }
    });
  }, 30);
}

/* ═══════════════════════════════════════════════════════════
   🔥 RENDER VAULT
   ═══════════════════════════════════════════════════════════ */
let __vaultRenderKey = '';

function renderVault(bf){
  if(!BRANCHES[bf] && bf !== 'all') bf = session?.branch || 'kalaroa';
  
  const v = getVaultForDate(dashDate, bf);
  const totals = v.totals;
  const cacheKey = bf + '|' + dashDate + '|' + DENOMS.map(d => totals[d] || 0).join(',');
  
  if(__vaultRenderKey === cacheKey) return;
  __vaultRenderKey = cacheKey;
  
  const sl = bf === 'all' ? 'উভয় আউটলেট' : (BRANCHES[bf]?.name || bf);
  let itemsHtml = '';
  let totalAmt = 0;
  let totalNotes = 0;
  
  for(let i = 0; i < DENOMS.length; i++){
    const d = DENOMS[i];
    const c = Number(totals[d]) || 0;
    const amt = c * d;
    totalAmt += amt;
    totalNotes += c;
    const empty = c === 0;
    
    itemsHtml +=
      '<div class="vault-item" style="' + (empty ? 'opacity:0.35;filter:grayscale(.6);' : '') + '">' +
        '<div class="d">৳ ' + toBn(d) + '</div>' +
        '<div class="c">' + toBn(c) + '<span style="font-size:13px;color:#a5b4d8;margin-left:4px">টি</span></div>' +
        '<div style="font-size:12.5px;color:#facc15;font-weight:800;margin-top:6px;padding-top:5px;border-top:1px dashed rgba(255,255,255,.1)">= ৳ ' + fmt(amt) + '</div>' +
      '</div>';
  }
  
  $('#vaultSection').innerHTML =
    '<div class="section-title">' +
      '<span class="bar"></span> 🗄️ ভল্ট নোট ইনভেন্টরি — ' + esc(sl) +
      '<span class="auto-badge">⚡ লাইভ</span>' +
    '</div>' +
    '<div class="vault-box">' +
      '<div class="vault-row">' + itemsHtml + '</div>' +
      '<div class="vault-total">' +
        '<span>মোট নোট: <b>' + toBn(totalNotes) + '</b> টি</span>' +
        '<span>মোট মান: <b style="font-size:19px">৳ ' + fmt(totalAmt) + '</b></span>' +
      '</div>' +
    '</div>';
}

/* ═══════════════════════════════════════════════════════════
   🔥 RENDER STATS CARDS
   ═══════════════════════════════════════════════════════════ */
let __statsRenderKey = '';

function renderStats(bf, st){
  const isToday = dashDate === todayStr();
  const hb = isToday ?
    '<span class="auto-badge">⚡ লাইভ</span>' :
    '<span class="badge">📅 ' + toBn(dashDate) + '</span>';
  
  const apT = getPendingTransfers();
  const rPending = (bf === 'all') ? apT : apT.filter(t => t.to === bf);
  const rc = rPending.length;
  const ra = rPending.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  const cc = DB().customers.length;
  const dc = DB().customers.filter(c => (c.supportDue || 0) > 0).length;
  
  const oIn = (st.other.in || 0) + (st.other.onlineIn || 0);
  const oOut = (st.other.out || 0) + (st.other.onlineOut || 0);
  
  const cacheKey = bf + '|' + dashDate + '|' + JSON.stringify(st) + '|' + cc + '|' + dc + '|' + rc;
  if(__statsRenderKey === cacheKey) return;
  __statsRenderKey = cacheKey;
  
  const cards = [
    '<div class="card" data-tx="loan_received">' +
      '<div class="card-top"><span class="ico">📥</span><h3>ঋণের টাকা গ্রহণ</h3></div>' +
      '<div class="big-amt">৳ ' + fmt(st.loan_received.amt) + '</div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.loan_received.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="loan_given">' +
      '<div class="card-top"><span class="ico">💸</span><h3>ঋণের টাকা বিতরণ</h3></div>' +
      '<div class="big-amt">৳ ' + fmt(st.loan_given.amt) + '</div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.loan_given.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="deposit">' +
      '<div class="card-top"><span class="ico">🏦</span><h3>জমা</h3></div>' +
      '<div class="big-amt">৳ ' + fmt(st.deposit.amt) + '</div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.deposit.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="withdrawal">' +
      '<div class="card-top"><span class="ico">💵</span><h3>উত্তোলন</h3></div>' +
      '<div class="big-amt">৳ ' + fmt(st.withdrawal.amt) + '</div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.withdrawal.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="branch_transfer">' +
      '<div class="card-top"><span class="ico">🔁</span><h3>আউটলেট-থেকে-আউটলেট</h3></div>' +
      '<div class="big-amt sm"><span class="lbl">গ্রহণ:</span><span>+৳ ' + fmt(st.transfer.in) + '</span></div>' +
      '<div class="big-amt sm"><span class="lbl">প্রদান:</span><span>−৳ ' + fmt(st.transfer.out) + '</span></div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.transfer.cnt) + '</b> টি</div>' +
      (rc > 0 ?
        '<div style="margin-top:10px;padding:9px 13px;border-radius:10px;background:rgba(220,38,38,.18);font-size:13.5px;color:#ef4444;font-weight:900">⏳ ' + toBn(rc) + ' টি গ্রহণ বাকি — ৳ ' + fmt(ra) + '</div>'
        : '') +
    '</div>',
    
    '<div class="card" data-tx="bank_transfer">' +
      '<div class="card-top"><span class="ico">🏛️</span><h3>ইন্টারনাল অনলাইন ট্রান্সফার</h3></div>' +
      '<div class="big-amt sm"><span class="lbl">আসা:</span><span>+৳ ' + fmt(st.bank_transfer.in) + '</span></div>' +
      '<div class="big-amt sm"><span class="lbl">পাঠানো:</span><span>−৳ ' + fmt(st.bank_transfer.out) + '</span></div>' +
      '<div class="card-sub">মোট: <b>৳ ' + fmt(st.bank_transfer.in - st.bank_transfer.out) + '</b></div>' +
    '</div>',
    
    '<div class="card" data-tx="expense">' +
      '<div class="card-top"><span class="ico">🧾</span><h3>ক্যাশ খরচ</h3></div>' +
      '<div class="big-amt">৳ ' + fmt(st.expense.amt) + '</div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.expense.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="other_bank">' +
      '<div class="card-top"><span class="ico">🏦</span><h3>অন্য ব্যাঙ্ক</h3></div>' +
      '<div class="big-amt sm"><span class="lbl">আসা:</span><span>+৳ ' + fmt(oIn) + '</span></div>' +
      '<div class="big-amt sm"><span class="lbl">পাঠানো:</span><span>−৳ ' + fmt(oOut) + '</span></div>' +
      '<div class="card-sub">মোট: <b>৳ ' + fmt(oIn - oOut) + '</b></div>' +
    '</div>',
    
    '<div class="card" data-tx="support">' +
      '<div class="card-top"><span class="ico">🤝</span><h3>সাপোর্ট</h3></div>' +
      '<div class="big-amt sm"><span class="lbl">প্রদান:</span><span>+৳ ' + fmt(st.support.out) + '</span></div>' +
      '<div class="big-amt sm"><span class="lbl">ফেরত:</span><span>−৳ ' + fmt(st.support.in) + '</span></div>' +
      '<div class="card-sub">মোট: <b>৳ ' + fmt(st.support.out - st.support.in) + '</b></div>' +
    '</div>',
    
    '<div class="card" data-tx="money_exchange">' +
      '<div class="card-top"><span class="ico">💱</span><h3>মানি এক্সচেঞ্জ</h3></div>' +
      '<div class="big-amt sm"><span class="lbl">প্রদান:</span><span>৳ ' + fmt(st.money_exchange.out) + '</span></div>' +
      '<div class="big-amt sm"><span class="lbl">গ্রহণ:</span><span>৳ ' + fmt(st.money_exchange.in) + '</span></div>' +
      '<div class="card-sub">মোট: <b>' + toBn(st.money_exchange.cnt) + '</b> টি</div>' +
    '</div>',
    
    '<div class="card" data-tx="customer">' +
      '<div class="card-top"><span class="ico">👥</span><h3>গ্রাহক তালিকা</h3></div>' +
      '<div>' +
        '<span style="font-size:48px;line-height:1.1;font-weight:900;background:linear-gradient(135deg,#60a5fa,#4ade80);-webkit-background-clip:text;background-clip:text;color:transparent">' + toBn(cc) + '</span>' +
        '<span style="font-size:20px;color:#4ade80;">জন</span>' +
      '</div>' +
      (dc > 0 ?
        '<div class="card-sub" style="color:#fde047">⚠️ <b style="color:#facc15">' + toBn(dc) + '</b> জনের বকেয়া</div>'
        : '<div class="card-sub">📋 দেখতে ক্লিক</div>') +
    '</div>'
  ];
  
  $('#statsSection').innerHTML =
    '<div class="section-title">' +
      '<span class="bar"></span> 📊 ড্যাশবোর্ড — ' + toBn(dashDate) + ' ' + hb +
    '</div>' +
    '<div class="grid" id="statsGrid">' + cards.join('') + '</div>';
  
  const grid = document.getElementById('statsGrid');
  if(grid && !grid.__delegated){
    grid.__delegated = true;
    grid.addEventListener('click', function(e){
      const card = e.target.closest('.card[data-tx]');
      if(!card) return;
      e.preventDefault();
      e.stopPropagation();
      const t = card.dataset.tx;
      if(!t) return;
      handleCardClick(t);
    });
  }
}

function handleCardClick(type){
  try{
    if(type === 'branch_transfer'){
      const p = getPendingCountByType('branch_transfer');
      if(p > 0){
        openAllPendingModal();
        return;
      }
    }
    openTxModal(type);
  } catch(err){
    toast('❌ ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   🔥 RENDER BALANCES
   ═══════════════════════════════════════════════════════════ */
function renderBalances(bf, st){
  const isAdminUser = session.role === 'admin';
  const bal = getBalancesForDate(dashDate, bf);
  const mb = (bal.bank || 0) + (bal.cash || 0) + (bal.other || 0);
  const tc = Number(DB().totalCapital) || 0;
  const df = tc - mb;
  
  $('#balanceSection').innerHTML =
    '<div class="section-title"><span class="bar"></span> 💰 অ্যাকাউন্ট ব্যালেন্স</div>' +
    '<div class="balance-panel">' +
      '<div class="balance-row-top">' +
        '<div class="balance-cell blue">' +
          '<div class="bc-ico">🏦</div>' +
          '<div class="bc-lbl big-label">মাদার অ্যাকাউন্ট</div>' +
          '<div class="bc-val">৳ ' + fmt(bal.bank) + '</div>' +
        '</div>' +
        '<div class="balance-cell green">' +
          '<div class="bc-ico">💵</div>' +
          '<div class="bc-lbl">ক্যাশ ইন হ্যান্ড</div>' +
          '<div class="bc-val">৳ ' + fmt(bal.cash) + '</div>' +
        '</div>' +
        '<div class="balance-cell purple">' +
          '<div class="bc-ico">🏛️</div>' +
          '<div class="bc-lbl">অন্যান্য ব্যাংকে জমা</div>' +
          '<div class="bc-val">৳ ' + fmt(bal.other) + '</div>' +
        '</div>' +
        '<div class="balance-cell yellow">' +
          '<div class="bc-ico">🧾</div>' +
          '<div class="bc-lbl">খরচ</div>' +
          '<div class="bc-val">৳ ' + fmt(st.expense.amt) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    
    (isAdminUser ?
      '<div class="bal-grid">' +
        '<div class="bal-card main">' +
          '<div class="t">⭐ সর্বমোট</div>' +
          '<div class="v">৳ ' + fmt(mb) + '</div>' +
        '</div>' +
        '<div class="bal-card capital">' +
          '<div class="t">💰 মূলধন</div>' +
          '<div class="v">৳ ' + fmt(tc) + '</div>' +
        '</div>' +
        '<div class="bal-card ' + (df > 0 ? 'deficit' : 'surplus') + '">' +
          '<div class="t">📉 ঘাটতি</div>' +
          '<div class="v">৳ ' + fmt(df) + '</div>' +
        '</div>' +
      '</div>'
      : '');
}

/* ───── END OF FILE render/render-dashboard.js ───── */
console.log('✅ Render Dashboard loaded');