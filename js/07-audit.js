/* ============================================================
   FILE: js/07-audit.js
   PURPOSE: All Data + Audit Log
   ============================================================ */
'use strict';

function openAllData(){
  const bf = currentBranch();
  let filterDate = todayStr();
  let filterType = 'all';

  const typeOptions = Object.entries(TX_TYPES)
    .filter(([k]) => k !== 'loan_collection')
    .map(([k, v]) => '<option value="' + k + '">' + v.icon + ' ' + v.title + '</option>')
    .join('');

  function render(){
    let list = DB.txs.slice().reverse();
    if(filterDate) list = list.filter(t => t.date === filterDate);
    if(filterType !== 'all') list = list.filter(t => t.type === filterType);
    if(bf !== 'all') list = list.filter(t => t.branch === bf || t.from === bf || t.to === bf);

    const limited = list.slice(0, 200);
    let rows = '';
    limited.forEach(t => {
      const cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };

      // ⚡ Note display
      const noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
      const noteHtml = noteText ?
        '<div style="font-size:11.5px;color:#93c5fd;font-style:italic;padding:3px 8px;border-radius:5px;background:rgba(59,130,246,.1);display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px" title="' + esc(noteText) + '">📝 ' + esc(noteText) + '</div>' :
        '<span style="color:#4a5878;font-size:11px">—</span>';

      rows += '<tr>' +
        '<td style="white-space:nowrap">' + toBn(t.date) + '</td>' +
        '<td>' + cfg.icon + ' ' + esc(cfg.title) + '</td>' +
        '<td>' + (t.custName ? '👤 ' + esc(t.custName) : '—') + '</td>' +
        '<td style="min-width:130px">' + noteHtml + '</td>' +
        '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
        '<td style="font-size:11px;color:#7a8ab8">' + esc(t.user || '—') + '</td>' +
        '<td><button class="mini" data-tx-detail="' + t.id + '">👁️</button></td>' +
      '</tr>';
    });

    return (list.length > 200 ?
        '<div style="padding:8px;text-align:center;color:#facc15;font-size:12px;font-weight:700;margin-bottom:8px">প্রথম ২০০ (মোট ' + toBn(list.length) + ')</div>'
        : '') +
      (rows ?
        '<div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>ধরন</th><th>গ্রাহক</th><th>📝 মন্তব্য</th><th>টাকা</th><th>ইউজার</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">📭 নেই</div>');
  }

  openModal({
    title: '📋 সব ডেটা',
    bodyHTML:
      '<div class="form-row">' +
        '<div class="field"><label>তারিখ</label><input type="date" id="ad-date" value="' + filterDate + '"></div>' +
        '<div class="field"><label>ধরন</label><select id="ad-type"><option value="all">— সব —</option>' + typeOptions + '</select></div>' +
      '</div>' +
      '<div id="ad-body">' + render() + '</div>',
    xwide: true,
    onMount: (root) => {
      const bodyEl = root.querySelector('#ad-body');
      const refresh = () => {
        bodyEl.innerHTML = render();
        bodyEl.querySelectorAll('[data-tx-detail]').forEach(b => {
          b.addEventListener('click', () => showTxDetail(b.dataset.txDetail));
        });
      };
      refresh();
      root.querySelector('#ad-date').addEventListener('change', e => { filterDate = e.target.value || ''; refresh(); });
      root.querySelector('#ad-type').addEventListener('change', e => { filterType = e.target.value; refresh(); });
    }
  });
}

function showTxDetail(id){
  const t = DB.txs.find(x => x.id === id);
  if(!t){ toast('❌ নেই'); return; }
  const cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };

  // ═══════════ HEADER ═══════════
  let html = '';
  html += '<div style="padding:16px;border-radius:14px;background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(34,197,94,.05));border:1.5px solid rgba(59,130,246,.4);margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
      '<span style="font-size:38px;line-height:1">' + cfg.icon + '</span>' +
      '<div style="flex:1;min-width:200px">' +
        '<div style="font-size:18px;color:#fff;font-weight:900">' + esc(cfg.title) + '</div>' +
        (t.cancelled ? '<div style="color:#f87171;font-size:12px;font-weight:800;margin-top:2px">❌ বাতিল</div>' : '') +
      '</div>' +
      '<div style="font-size:24px;color:#4ade80;font-weight:900;letter-spacing:-.5px">৳ ' + fmt(t.amount) + '</div>' +
    '</div>' +
  '</div>';

  // ═══════════ BASIC INFO — 2 COLUMN GRID ═══════════
  html += '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:16px">';
  html += '<div style="font-size:11px;color:#93c5fd;font-weight:900;text-transform:uppercase;margin-bottom:10px;letter-spacing:.5px">📋 মৌলিক তথ্য</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;font-size:13px">';

  // Date + Time
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">📅 তারিখ:</span><b style="color:#fff">' + toBn(t.date) + '</b></div>';
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🕐 সময়:</span><b style="color:#fff">' + fmtDateTime(t.createdAt).split(' ').slice(-2).join(' ') + '</b></div>';

  // Outlet + User
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🏦 আউটলেট:</span><b style="color:#fff">' + esc(BRANCHES[t.branch]?.name || '—') + '</b></div>';
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">👤 ইউজার:</span><b style="color:#fff">' + esc(t.user || '—') + '</b></div>';

  // Customer (full width if exists)
  if(t.custName){
    html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px dashed rgba(59,130,246,.2)"><span style="color:#93c5fd;font-weight:700">👤 গ্রাহক:</span><b style="color:#4ade80">' + esc(t.custName) + (t.custAcc ? ' <span style="color:#a5b4d8;font-weight:600">(' + esc(t.custAcc) + ')</span>' : '') + '</b></div>';
  }
  if(t.custMobile){
    html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">📱 মোবাইল:</span><b style="color:#fff">' + esc(t.custMobile) + '</b></div>';
  }

  html += '</div>';

  // Note
  if(t.note){
    html += '<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(59,130,246,.08);border-left:3px solid #3b82f6;color:#93c5fd;font-style:italic;font-size:13px">📝 ' + esc(t.note) + '</div>';
  }
  html += '</div>';

  // ═══════════ LOAN GIVEN breakdown ═══════════
  if(t.type === 'loan_given'){
    const total = Number(t.amount) || 0;
    const online = Number(t.onlineAmount) || 0;
    const cash = Number(t.cashAmount) || 0;
    const notTaken = Number(t.cashNotTakenAmount) || 0;

    html += '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(250,204,21,.35);margin-bottom:16px">';
    html += '<div style="font-size:13px;color:#facc15;font-weight:900;text-transform:uppercase;margin-bottom:10px">💸 ঋণ বিতরণ বিবরণ</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:13px">';
    html += '<div style="display:flex;justify-content:space-between"><span>মোট ঋণ:</span><b style="color:#93c5fd">৳ ' + fmt(total) + '</b></div>';
    if(online > 0) html += '<div style="display:flex;justify-content:space-between"><span>− অনলাইন:</span><b style="color:#c4b5fd">৳ ' + fmt(online) + '</b></div>';
    if(cash > 0) html += '<div style="display:flex;justify-content:space-between"><span>− ক্যাশ:</span><b style="color:#facc15">৳ ' + fmt(cash) + '</b></div>';
    if(notTaken > 0) html += '<div style="display:flex;justify-content:space-between;grid-column:1/-1;padding-top:8px;margin-top:4px;border-top:1px dashed rgba(250,204,21,.4)"><span style="color:#facc15;font-weight:900">💰 ক্যাশ নেয়নি:</span><b style="color:#facc15;font-size:15px">৳ ' + fmt(notTaken) + '</b></div>';
    html += '</div></div>';
  }

  // ═══════════ LOAN RECEIVED breakdown ═══════════
  if(t.type === 'loan_received'){
    const online = Number(t.onlineAmount) || 0;
    const totalRec = Number(t.receivedAmount) || 0;
    const change = Number(t.changeAmount) || 0;
    const net = Number(t.netAmount) || 0;

    html += '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(34,197,94,.35);margin-bottom:16px">';
    html += '<div style="font-size:13px;color:#4ade80;font-weight:900;text-transform:uppercase;margin-bottom:10px">📥 ঋণ গ্রহণ বিবরণ</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:13px">';
    if(online > 0) html += '<div style="display:flex;justify-content:space-between"><span>🌐 অনলাইন:</span><b style="color:#c4b5fd">৳ ' + fmt(online) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between"><span>📥 মোট গ্রহণ:</span><b style="color:#93c5fd">৳ ' + fmt(totalRec) + '</b></div>';
    if(change > 0) html += '<div style="display:flex;justify-content:space-between"><span>🔄 ফেরত:</span><b style="color:#facc15">− ৳ ' + fmt(change) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between;grid-column:1/-1;padding-top:8px;margin-top:4px;border-top:2px solid rgba(34,197,94,.4)"><span style="color:#4ade80;font-weight:900">💰 Net জমা:</span><b style="color:#4ade80;font-size:16px">৳ ' + fmt(net) + '</b></div>';
    html += '</div></div>';
  }

  // ═══════════ 🌟 DENOMINATION — SIDE BY SIDE ═══════════
  const hasOut = t.notesOut && Object.keys(t.notesOut).length > 0;
  const hasIn = t.notesIn && Object.keys(t.notesIn).length > 0;
  const hasChange = t.changeNotesOut && Object.keys(t.changeNotesOut).length > 0;
  const hasSplits = t.branchSplits && t.branchSplits.length > 0;

  if(hasOut || hasIn || hasChange || hasSplits){
    html += '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(167,139,250,.08),rgba(59,130,246,.04));border:1.5px solid rgba(167,139,250,.4);margin-bottom:16px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="font-size:18px">🗄️</span><span style="font-size:13px;color:#c4b5fd;font-weight:900;text-transform:uppercase;letter-spacing:.5px">নোট ডিনোমিনেশন</span></div>';

    // ⚡ Grid — max 2 columns
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">';

    if(hasIn) html += buildDenomBox('📥 গ্রহণ (In)', t.notesIn, '#4ade80', 'rgba(34,197,94,.12)', 'rgba(34,197,94,.5)');
    if(hasOut) html += buildDenomBox('💸 প্রদান (Out)', t.notesOut, '#facc15', 'rgba(250,204,21,.12)', 'rgba(250,204,21,.5)');

    // Branch splits
    if(hasSplits){
      t.branchSplits.forEach(sp => {
        if(!sp.branch || !sp.notesIn) return;
        if(Object.keys(sp.notesIn).length === 0) return;
        const branchName = BRANCHES[sp.branch]?.name || sp.branch;
        html += buildDenomBox('🏦 ' + branchName, sp.notesIn, '#93c5fd', 'rgba(59,130,246,.12)', 'rgba(59,130,246,.5)');
      });
    }

    if(hasChange) html += buildDenomBox('🔄 ফেরত (Change)', t.changeNotesOut, '#facc15', 'rgba(250,204,21,.12)', 'rgba(250,204,21,.5)');

    html += '</div></div>';
  } else {
    html += '<div style="padding:16px;text-align:center;border-radius:12px;background:rgba(0,0,0,.25);border:1px dashed rgba(122,138,184,.4);margin-bottom:16px;font-size:13px;color:#7a8ab8">📭 কোনো নোট ডিনোমিনেশন নেই</div>';
  }

  // ═══════════ ACTION BUTTONS ═══════════
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">';
  html += '<button class="btn cyan" id="tx-print" style="flex:1;min-width:120px">🖨️ প্রিন্ট</button>';
  if(!READ_ONLY && SESSION.role === 'admin'){
    html += '<button class="btn red" id="tx-delete" style="flex:1;min-width:120px">🗑️ ডিলিট</button>';
  }
  html += '</div>';

  const m = openModal({ title: '👁️ লেনদেন বিস্তারিত', bodyHTML: html, wide: true });

  setTimeout(() => {
    const root = m.bg.querySelector('.modal-body');

    const pb = root.querySelector('#tx-print');
    if(pb) pb.addEventListener('click', () => {
      if(typeof printSingleTransaction === 'function') printSingleTransaction(t);
      else toast('❌ Print function নেই');
    });

    const db = root.querySelector('#tx-delete');
    if(db) db.addEventListener('click', async () => {
      if(!confirm('🗑️ ডিলিট করবেন?')) return;
      DB.deletedTxIds[t.id] = new Date().toISOString();
      DB.txs = DB.txs.filter(x => x.id !== t.id);
      logActivity('txn_delete', '🗑️ ডিলিট', cfg.title, t.amount);
      DB.__updated = new Date().toISOString();
      saveLocal(); recomputeLive(); renderDashboard(); await pushCloud();
      m.close();
      toast('🗑️ ডিলিট', 'ok');
    });
  }, 50);
}

/* ═══════════════════════════════════════════════════════════
   🗄️ Build Denomination Box (compact)
   ═══════════════════════════════════════════════════════════ */
function buildDenomBox(title, notes, color, bg, border){
  const keys = Object.keys(notes || {}).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
  if(!keys.length) return '';

  let total = 0;
  keys.forEach(d => { total += Number(d) * Number(notes[d]); });

  // ⚡ Compact grid — items fit in one line
  let itemsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(85px,1fr));gap:5px">';
  keys.forEach(d => {
    const count = Number(notes[d]);
    const amt = Number(d) * count;
    itemsHtml += '<div style="padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.4);text-align:center">' +
      '<div style="font-size:11px;color:' + color + ';font-weight:900;white-space:nowrap">৳ ' + toBn(d) + ' × ' + toBn(count) + '</div>' +
      '<div style="font-size:12px;color:#fff;font-weight:900;margin-top:2px;white-space:nowrap">৳ ' + fmt(amt) + '</div>' +
    '</div>';
  });
  itemsHtml += '</div>';

  return '<div style="padding:10px;border-radius:10px;background:' + bg + ';border:1px solid ' + border + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">' +
      '<div style="font-size:12.5px;color:' + color + ';font-weight:900">' + title + '</div>' +
      '<div style="font-size:14px;color:' + color + ';font-weight:900">৳ ' + fmt(total) + '</div>' +
    '</div>' + itemsHtml +
  '</div>';
}

/* ═══════════════════════════════════════════════════════════
   Helper: Build denomination section HTML
   ═══════════════════════════════════════════════════════════ */
function buildDenomSection(title, notes, color, bg, border){
  const keys = Object.keys(notes || {}).filter(k => Number(notes[k]) > 0).sort((a, b) => b - a);
  if(!keys.length) return '';

  let total = 0;
  keys.forEach(d => { total += Number(d) * Number(notes[d]); });

  let html = '<div style="margin-bottom:10px;padding:12px;border-radius:10px;background:' + bg + ';border:1px solid ' + border + '">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">';
  html += '<div style="font-size:13px;color:' + color + ';font-weight:900">' + title + '</div>';
  html += '<div style="font-size:15px;color:' + color + ';font-weight:900">৳ ' + fmt(total) + '</div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">';
  keys.forEach(d => {
    const count = Number(notes[d]);
    const amt = Number(d) * count;
    html += '<div style="padding:8px 10px;border-radius:7px;background:rgba(0,0,0,.35);display:flex;justify-content:space-between;align-items:center;gap:8px">';
    html += '<span style="font-size:12px;color:' + color + ';font-weight:800">৳ ' + toBn(d) + ' × ' + toBn(count) + '</span>';
    html += '<span style="font-size:12px;color:#fff;font-weight:900">৳ ' + fmt(amt) + '</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function openAuditLog(){
  const logs = DB.activity.slice().reverse().slice(0, 100);
  let rows = '';
  logs.forEach(l => {
    const noteText = (l.detail && String(l.detail).trim()) ? String(l.detail).trim() : '';
    const noteHtml = noteText ?
      '<span style="color:#93c5fd;font-style:italic">' + esc(noteText) + '</span>' :
      '<span style="color:#4a5878">—</span>';

    rows += '<tr>' +
      '<td style="white-space:nowrap;font-size:11.5px">' + fmtDateTime(l.at) + '</td>' +
      '<td style="font-size:12.5px">' + esc(l.title || l.type) + '</td>' +
      '<td style="max-width:250px;font-size:12px">' + noteHtml + '</td>' +
      '<td style="font-size:11.5px">' + esc(l.user || '—') + '</td>' +
    '</tr>';
  });
  openModal({
    title: '📜 অডিট লগ (' + DB.activity.length + ')',
    bodyHTML: rows ?
      '<div class="table-wrap" style="max-height:60vh;overflow-y:auto"><table><thead><tr><th>সময়</th><th>কাজ</th><th>📝 মন্তব্য</th><th>ইউজার</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty">📭 নেই</div>',
    xwide: true
  });
}
console.log('✅ Audit');