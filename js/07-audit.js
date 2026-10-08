/* ============================================================
   FILE: js/07-audit.js — COMPLETE
   PURPOSE: All Data + Audit Log + Tx Detail + Delete + Restore
   VERSION: v5.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   📋 ALL DATA MODAL
   ═══════════════════════════════════════════════════════════ */
function openAllData(){
  var bf = currentBranch();
  var filterDate = todayStr();
  var filterType = 'all';

  var typeOptions = Object.entries(TX_TYPES)
    .filter(function(e){ return e[0] !== 'loan_collection'; })
    .map(function(e){ return '<option value="' + e[0] + '">' + e[1].icon + ' ' + e[1].title + '</option>'; })
    .join('');

  function render(){
    var list = DB.txs.slice().reverse();
    if(filterDate) list = list.filter(function(t){ return t.date === filterDate; });
    if(filterType !== 'all') list = list.filter(function(t){ return t.type === filterType; });
    if(bf !== 'all') list = list.filter(function(t){
      return t.branch === bf || t.from === bf || t.to === bf;
    });

    var limited = list.slice(0, 200);
    var rows = '';

    limited.forEach(function(t){
      var cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };
      var noteText = (t.note && String(t.note).trim()) ? String(t.note).trim() : '';
      var noteHtml = noteText
        ? '<div style="font-size:11.5px;color:#93c5fd;font-style:italic;padding:3px 8px;border-radius:5px;background:rgba(59,130,246,.1);display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px" title="' + esc(noteText) + '">📝 ' + esc(noteText) + '</div>'
        : '<span style="color:#4a5878;font-size:11px">—</span>';

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

    return (list.length > 200
        ? '<div style="padding:8px;text-align:center;color:#facc15;font-size:12px;font-weight:700;margin-bottom:8px">প্রথম ২০০ (মোট ' + toBn(list.length) + ')</div>'
        : '') +
      (rows
        ? '<div class="table-wrap"><table><thead><tr><th>তারিখ</th><th>ধরন</th><th>গ্রাহক</th><th>📝 মন্তব্য</th><th>টাকা</th><th>ইউজার</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
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
    onMount: function(root){
      var bodyEl = root.querySelector('#ad-body');
      var refresh = function(){
        bodyEl.innerHTML = render();
        bodyEl.querySelectorAll('[data-tx-detail]').forEach(function(b){
          b.addEventListener('click', function(){ showTxDetail(b.dataset.txDetail); });
        });
      };
      refresh();
      root.querySelector('#ad-date').addEventListener('change', function(e){
        filterDate = e.target.value || '';
        refresh();
      });
      root.querySelector('#ad-type').addEventListener('change', function(e){
        filterType = e.target.value;
        refresh();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   👁️ SHOW TX DETAIL
   ═══════════════════════════════════════════════════════════ */
function showTxDetail(id){
  var t = DB.txs.find(function(x){ return x.id === id; });
  if(!t){ toast('❌ নেই'); return; }

  var cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };

  // ═══ HEADER ═══
  var html = '';
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

  // ═══ BASIC INFO — 2 COLUMN ═══
  html += '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:16px">';
  html += '<div style="font-size:11px;color:#93c5fd;font-weight:900;text-transform:uppercase;margin-bottom:10px;letter-spacing:.5px">📋 মৌলিক তথ্য</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;font-size:13px">';

  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">📅 তারিখ:</span><b style="color:#fff">' + toBn(t.date) + '</b></div>';

  var timeStr = '—';
  if(t.createdAt){
    try {
      var dt = new Date(t.createdAt);
      var hh = dt.getHours();
      var mm = String(dt.getMinutes()).padStart(2, '0');
      var ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      timeStr = toBn(String(hh).padStart(2, '0') + ':' + mm) + ' ' + ampm;
    } catch(e){ timeStr = '—'; }
  }
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🕐 সময়:</span><b style="color:#fff">' + timeStr + '</b></div>';

  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">🏦 আউটলেট:</span><b style="color:#fff">' + esc(BRANCHES[t.branch]?.name || '—') + '</b></div>';
  html += '<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">👤 ইউজার:</span><b style="color:#fff">' + esc(t.user || '—') + '</b></div>';

  if(t.custName){
    html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px dashed rgba(59,130,246,.2)"><span style="color:#93c5fd;font-weight:700">👤 গ্রাহক:</span><b style="color:#4ade80">' + esc(t.custName) + (t.custAcc ? ' <span style="color:#a5b4d8;font-weight:600">(' + esc(t.custAcc) + ')</span>' : '') + '</b></div>';
  }
  if(t.custMobile){
    html += '<div style="grid-column:1/-1;display:flex;justify-content:space-between;gap:8px"><span style="color:#93c5fd;font-weight:700">📱 মোবাইল:</span><b style="color:#fff">' + esc(t.custMobile) + '</b></div>';
  }

  html += '</div>';

  if(t.note){
    html += '<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(59,130,246,.08);border-left:3px solid #3b82f6;color:#93c5fd;font-style:italic;font-size:13px">📝 ' + esc(t.note) + '</div>';
  }
  html += '</div>';

  // ═══════════════════════════════════════════════════════════
  // 💸 LOAN GIVEN — Side by Side
  // ═══════════════════════════════════════════════════════════
  if(t.type === 'loan_given'){
    var mainLoan = Number(t.mainLoanAmount) || Number(t.amount) || 0;
    var withdrawal = Number(t.withdrawalAmount) || 0;
    var total = mainLoan + withdrawal;
    var online = Number(t.onlineAmount) || 0;
    var cash = Number(t.cashAmount) || 0;
    var notTaken = Number(t.cashNotTakenAmount) || 0;

    html += '<div style="padding:14px;border-radius:14px;background:linear-gradient(145deg,rgba(250,204,21,.08),rgba(0,0,0,.3));border:1.5px solid rgba(250,204,21,.4);margin-bottom:16px">';
    html += '<div style="font-size:13px;color:#facc15;font-weight:900;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px">💸 ঋণ বিতরণ বিবরণ</div>';

    // ROW 1: মূল ঋণ + নগদ উত্তোলন
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';

    html += '<div style="padding:12px 14px;border-radius:11px;background:rgba(59,130,246,.12);border:1.5px solid rgba(59,130,246,.4)">';
    html += '<div style="font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:6px">🏦 মূল ঋণ</div>';
    html += '<div style="font-size:20px;color:#93c5fd;font-weight:900;letter-spacing:-.4px">৳ ' + fmt(mainLoan) + '</div>';
    html += '</div>';

    html += '<div style="padding:12px 14px;border-radius:11px;background:rgba(250,204,21,.12);border:1.5px solid rgba(250,204,21,.4)">';
    html += '<div style="font-size:11.5px;color:#facc15;font-weight:800;margin-bottom:6px">💵 নগদ উত্তোলন</div>';
    html += '<div style="font-size:20px;color:#facc15;font-weight:900;letter-spacing:-.4px">৳ ' + fmt(withdrawal) + '</div>';
    html += '</div>';

    html += '</div>';

    // ROW 2: মোট ঋণ
    html += '<div style="padding:12px 16px;border-radius:11px;background:linear-gradient(145deg,rgba(34,197,94,.18),rgba(34,197,94,.06));border:2px solid rgba(34,197,94,.5);margin-bottom:10px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
    html += '<div style="font-size:13px;color:#4ade80;font-weight:900">= মোট ঋণ</div>';
    html += '<div style="font-size:22px;color:#4ade80;font-weight:900;letter-spacing:-.5px">৳ ' + fmt(total) + '</div>';
    html += '</div></div>';

    // ROW 3: অনলাইন + ক্যাশ + ক্যাশ নেয়নি
    html += '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px">';

    html += '<div style="padding:10px 12px;border-radius:10px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.35)">';
    html += '<div style="font-size:10.5px;color:#c4b5fd;font-weight:800;margin-bottom:4px">🌐 অনলাইন</div>';
    html += '<div style="font-size:14px;color:#c4b5fd;font-weight:900;letter-spacing:-.3px">৳ ' + fmt(online) + '</div>';
    html += '</div>';

    html += '<div style="padding:10px 12px;border-radius:10px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.35)">';
    html += '<div style="font-size:10.5px;color:#facc15;font-weight:800;margin-bottom:4px">💸 ক্যাশ</div>';
    html += '<div style="font-size:14px;color:#facc15;font-weight:900;letter-spacing:-.3px">৳ ' + fmt(cash) + '</div>';
    html += '</div>';

    html += '<div style="padding:10px 12px;border-radius:10px;background:linear-gradient(145deg,rgba(250,204,21,.18),rgba(250,204,21,.06));border:1.5px solid rgba(250,204,21,.5)">';
    html += '<div style="font-size:10.5px;color:#facc15;font-weight:800;margin-bottom:4px">💰 ক্যাশ নেয়নি</div>';
    html += '<div style="font-size:14px;color:#facc15;font-weight:900;letter-spacing:-.3px">৳ ' + fmt(notTaken) + '</div>';
    html += '</div>';

    html += '</div></div>';
  }

  // ═══════════════════════════════════════════════════════════
  // 📥 LOAN RECEIVED
  // ═══════════════════════════════════════════════════════════
  if(t.type === 'loan_received'){
    var lrOnline = Number(t.onlineAmount) || 0;
    var totalRec = Number(t.receivedAmount) || 0;
    var change = Number(t.changeAmount) || 0;
    var net = Number(t.netAmount) || 0;

    html += '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(34,197,94,.35);margin-bottom:16px">';
    html += '<div style="font-size:13px;color:#4ade80;font-weight:900;text-transform:uppercase;margin-bottom:10px">📥 ঋণ গ্রহণ বিবরণ</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;font-size:13px">';
    if(lrOnline > 0) html += '<div style="display:flex;justify-content:space-between"><span>🌐 অনলাইন:</span><b style="color:#c4b5fd">৳ ' + fmt(lrOnline) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between"><span>📥 মোট গ্রহণ:</span><b style="color:#93c5fd">৳ ' + fmt(totalRec) + '</b></div>';
    if(change > 0) html += '<div style="display:flex;justify-content:space-between"><span>🔄 ফেরত:</span><b style="color:#facc15">− ৳ ' + fmt(change) + '</b></div>';
    html += '<div style="display:flex;justify-content:space-between;grid-column:1/-1;padding-top:8px;margin-top:4px;border-top:2px solid rgba(34,197,94,.4)"><span style="color:#4ade80;font-weight:900">💰 Net জমা:</span><b style="color:#4ade80;font-size:16px">৳ ' + fmt(net) + '</b></div>';
    html += '</div></div>';
  }

  // ═══════════════════════════════════════════════════════════
  // 🗄️ DENOMINATION
  // ═══════════════════════════════════════════════════════════
  var hasOut = t.notesOut && Object.keys(t.notesOut).length > 0;
  var hasIn = t.notesIn && Object.keys(t.notesIn).length > 0;
  var hasChange = t.changeNotesOut && Object.keys(t.changeNotesOut).length > 0;
  var hasSplits = t.branchSplits && t.branchSplits.length > 0;

  if(hasOut || hasIn || hasChange || hasSplits){
    html += '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(167,139,250,.08),rgba(59,130,246,.04));border:1.5px solid rgba(167,139,250,.4);margin-bottom:16px">';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span style="font-size:18px">🗄️</span><span style="font-size:13px;color:#c4b5fd;font-weight:900;text-transform:uppercase;letter-spacing:.5px">নোট ডিনোমিনেশন</span></div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px">';

    if(hasIn) html += buildDenomBox('📥 গ্রহণ (In)', t.notesIn, '#4ade80', 'rgba(34,197,94,.12)', 'rgba(34,197,94,.5)');
    if(hasOut) html += buildDenomBox('💸 প্রদান (Out)', t.notesOut, '#facc15', 'rgba(250,204,21,.12)', 'rgba(250,204,21,.5)');

    if(hasSplits){
      t.branchSplits.forEach(function(sp){
        if(!sp.branch || !sp.notesIn) return;
        if(Object.keys(sp.notesIn).length === 0) return;
        var branchName = BRANCHES[sp.branch]?.name || sp.branch;
        html += buildDenomBox('🏦 ' + branchName, sp.notesIn, '#93c5fd', 'rgba(59,130,246,.12)', 'rgba(59,130,246,.5)');
      });
    }

    if(hasChange) html += buildDenomBox('🔄 ফেরত (Change)', t.changeNotesOut, '#facc15', 'rgba(250,204,21,.12)', 'rgba(250,204,21,.5)');

    html += '</div></div>';
  } else {
    html += '<div style="padding:16px;text-align:center;border-radius:12px;background:rgba(0,0,0,.25);border:1px dashed rgba(122,138,184,.4);margin-bottom:16px;font-size:13px;color:#7a8ab8">📭 কোনো নোট ডিনোমিনেশন নেই</div>';
  }

  // ═══ ACTION BUTTONS ═══
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">';
  html += '<button class="btn cyan" id="tx-print" style="flex:1;min-width:120px">🖨️ প্রিন্ট</button>';
  if(!READ_ONLY && SESSION.role === 'admin'){
    html += '<button class="btn red" id="tx-delete" style="flex:1;min-width:120px">🗑️ ডিলিট</button>';
  }
  html += '</div>';

  var m = openModal({ title: '👁️ লেনদেন বিস্তারিত', bodyHTML: html, wide: true });

  setTimeout(function(){
    var root = m.bg.querySelector('.modal-body');

    var pb = root.querySelector('#tx-print');
    if(pb) pb.addEventListener('click', function(){
      if(typeof printSingleTransaction === 'function') printSingleTransaction(t);
      else toast('❌ Print function নেই');
    });

    var db = root.querySelector('#tx-delete');
    if(db) db.addEventListener('click', async function(){
      m.close();
      await deleteTx(t.id);
    });
  }, 50);
}

/* ═══════════════════════════════════════════════════════════
   🗄️ Build Denomination Box
   ═══════════════════════════════════════════════════════════ */
function buildDenomBox(title, notes, color, bg, border){
  var keys = Object.keys(notes || {}).filter(function(k){ return Number(notes[k]) > 0; }).sort(function(a, b){ return b - a; });
  if(!keys.length) return '';

  var total = 0;
  keys.forEach(function(d){ total += Number(d) * Number(notes[d]); });

  var itemsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(85px,1fr));gap:5px">';
  keys.forEach(function(d){
    var count = Number(notes[d]);
    var amt = Number(d) * count;
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
   📜 AUDIT LOG MODAL — Admin only
   ═══════════════════════════════════════════════════════════ */
function openAuditLog(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন এই লগ দেখতে পারবেন');
    return;
  }

  var logs = DB.activity.slice().reverse().slice(0, 100);
  var rows = '';

  logs.forEach(function(l){
    var noteText = (l.detail && String(l.detail).trim()) ? String(l.detail).trim() : '';
    var noteHtml = noteText
      ? '<span style="color:#93c5fd;font-style:italic">' + esc(noteText) + '</span>'
      : '<span style="color:#4a5878">—</span>';

    rows += '<tr>' +
      '<td style="white-space:nowrap;font-size:11.5px">' + fmtDateTime(l.at) + '</td>' +
      '<td style="font-size:12.5px">' + esc(l.title || l.type) + '</td>' +
      '<td style="max-width:250px;font-size:12px">' + noteHtml + '</td>' +
      '<td style="font-size:11.5px">' + esc(l.user || '—') + '</td>' +
    '</tr>';
  });

  openModal({
    title: '📜 অডিট লগ (' + DB.activity.length + ')',
    bodyHTML: rows
      ? '<div class="table-wrap" style="max-height:60vh;overflow-y:auto"><table><thead><tr><th>সময়</th><th>কাজ</th><th>📝 মন্তব্য</th><th>ইউজার</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="empty">📭 নেই</div>',
    xwide: true
  });
}

/* ═══════════════════════════════════════════════════════════
   💾 BACKUP HELPERS
   ═══════════════════════════════════════════════════════════ */
function backupDeletedTx(t){
  try {
    var backupKey = 'cc_deleted_tx_backup';
    var backups = {};
    try {
      backups = JSON.parse(localStorage.getItem(backupKey) || '{}');
    } catch(e){}

    backups[t.id] = JSON.parse(JSON.stringify(t));

    var keys = Object.keys(backups);
    if(keys.length > 200){
      keys.slice(0, keys.length - 200).forEach(function(k){ delete backups[k]; });
    }

    localStorage.setItem(backupKey, JSON.stringify(backups));
    console.log('💾 Backup saved:', t.id);
  } catch(e){
    console.warn('Backup error:', e);
  }
}

/* ═══════════════════════════════════════════════════════════
   🗑️ DELETE TX
   ═══════════════════════════════════════════════════════════ */
async function deleteTx(id){
  if(!id) return;

  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন ডিলিট করতে পারবেন');
    return;
  }

  var found = (typeof findTxAnywhere === 'function') ? findTxAnywhere(id) : null;
  var t = found && found.tx ? found.tx : (DB.txs || []).find(function(x){ return x.id === id; });

  if(!t){
    if(typeof toast === 'function') toast('❌ লেনদেন পাওয়া যায়নি');
    return;
  }

  // Find related txs
  var related = [];
  if(t.type === 'loan_given'){
    related = (DB.txs || []).filter(function(x){
      return x.linkedFrom === 'loan_given' && x.linkedParentId === id;
    });
    var collections = (DB.txs || []).filter(function(x){
      return x.type === 'loan_collection' && x.linkedParentId === id;
    });
    related = related.concat(collections);
  }

  var confirmMsg = '🗑️ ডিলিট করবেন?\n\n' +
    (TX_TYPES[t.type]?.title || t.type) + '\n' +
    '৳ ' + fmt(t.amount) + '\n' +
    (t.custName ? '👤 ' + t.custName : '');

  if(related.length > 0){
    confirmMsg += '\n\n⚠️ সাথে ' + related.length + ' টি রিলেটেড লেনদেনও মুছে যাবে:';
    related.forEach(function(r){
      confirmMsg += '\n  • ' + (TX_TYPES[r.type]?.title || r.type) + ' — ৳ ' + fmt(r.amount);
    });
  }

  confirmMsg += '\n\n⚠️ এটা undo করা যাবে না (backup থেকে restore সম্ভব)।';

  if(!confirm(confirmMsg)) return;

  try {
    // Backup
    backupDeletedTx(t);
    related.forEach(function(r){ backupDeletedTx(r); });

    // Tombstone
    if(!DB.deletedTxIds) DB.deletedTxIds = {};
    DB.deletedTxIds[id] = new Date().toISOString();

    // Remove main
    DB.txs = (DB.txs || []).filter(function(x){ return x.id !== id; });

    // Remove from archive
    if(DB.yearlyArchive){
      Object.keys(DB.yearlyArchive).forEach(function(y){
        if(Array.isArray(DB.yearlyArchive[y])){
          DB.yearlyArchive[y] = DB.yearlyArchive[y].filter(function(x){ return x.id !== id; });
        }
      });
    }

    // Remove related
    related.forEach(function(r){
      DB.deletedTxIds[r.id] = new Date().toISOString();
      DB.txs = DB.txs.filter(function(x){ return x.id !== r.id; });

      if(DB.yearlyArchive){
        Object.keys(DB.yearlyArchive).forEach(function(y){
          if(Array.isArray(DB.yearlyArchive[y])){
            DB.yearlyArchive[y] = DB.yearlyArchive[y].filter(function(x){ return x.id !== r.id; });
          }
        });
      }
    });

    // Revert parent collectedAmount
    if(t.type === 'loan_collection' && t.linkedParentId){
      var parent = (DB.txs || []).find(function(x){ return x.id === t.linkedParentId; });
      if(parent){
        var revertAmt = Number(t.amount) || 0;
        parent.collectedAmount = Math.max(0, (Number(parent.collectedAmount) || 0) - revertAmt);
        if(parent.collectedAmount <= 0.01){
          parent.collectionStatus = 'pending';
        } else {
          parent.collectionStatus = 'partial';
        }
        parent.updatedAt = new Date().toISOString();
      }
    }

    // Invalidate caches
    if(typeof __invalidateCaches === 'function') __invalidateCaches();
    if(typeof recalcAllCustomerDues === 'function') recalcAllCustomerDues(false);
    if(typeof recomputeLive === 'function') recomputeLive();

    // Log
    if(typeof logActivity === 'function'){
      logActivity('txn_delete', '🗑️ লেনদেন ডিলিট',
        (TX_TYPES[t.type]?.title || '') + (t.custName ? ' — ' + t.custName : '') +
        (related.length > 0 ? ' (+ ' + related.length + ' related)' : ''),
        t.amount || 0);
    }

    // Save + Push
    DB.__updated = new Date().toISOString();
    if(typeof saveLocal === 'function') saveLocal();
    if(typeof pushCloud === 'function'){
      try { await pushCloud(); } catch(e){ console.warn('Push error:', e); }
    }

    // UI refresh
    if(typeof renderDashboard === 'function') renderDashboard();
    if(typeof renderSidebar === 'function') renderSidebar();

    document.querySelectorAll('.modal-bg').forEach(function(m){
      if(m.__reloadCustomerPopup && typeof m.__reloadCustomerPopup === 'function'){
        try { m.__reloadCustomerPopup(); } catch(e){}
      }
    });

    if(typeof toast === 'function'){
      var msg = '🗑️ ডিলিট — ৳ ' + fmt(t.amount);
      if(related.length > 0){
        msg += ' (+ ' + related.length + ' related)';
      }
      toast(msg, 'ok');
    }

  } catch(e){
    console.error('Delete error:', e);
    if(typeof toast === 'function') toast('❌ ' + e.message, 'err');
  }
}

/* ═══════════════════════════════════════════════════════════
   🔄 RESTORE DELETED TX
   ═══════════════════════════════════════════════════════════ */
async function restoreDeletedTx(txId){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return false;
  }

  var backupKey = 'cc_deleted_tx_backup';
  var backups = {};
  try {
    backups = JSON.parse(localStorage.getItem(backupKey) || '{}');
  } catch(e){}

  var tx = backups[txId];
  if(!tx){
    if(typeof toast === 'function') toast('❌ Backup পাওয়া যায়নি');
    return false;
  }

  if(!DB.txs.find(function(x){ return x.id === txId; })){
    DB.txs.push(tx);
  }
  if(DB.deletedTxIds) delete DB.deletedTxIds[txId];

  if(typeof __invalidateCaches === 'function') __invalidateCaches();
  if(typeof recomputeLive === 'function') recomputeLive();

  DB.__updated = new Date().toISOString();
  if(typeof saveLocal === 'function') saveLocal();
  if(typeof pushCloud === 'function'){
    try { await pushCloud(); } catch(e){}
  }

  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof toast === 'function') toast('✅ Restored — ৳ ' + fmt(tx.amount), 'ok');
  return true;
}

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG HELPERS
   ═══════════════════════════════════════════════════════════ */
window.__listDeletedTxs = function(){
  var backups = {};
  try {
    backups = JSON.parse(localStorage.getItem('cc_deleted_tx_backup') || '{}');
  } catch(e){}

  console.log('═══════════════════════════════════════');
  console.log('🗑️ Deleted Tx Backups');
  console.log('═══════════════════════════════════════');
  var keys = Object.keys(backups);
  console.log('Total backups:', keys.length);
  keys.forEach(function(k){
    var b = backups[k];
    console.log('  • ' + b.type + ' — ৳ ' + fmt(b.amount) + ' — ' + (b.custName || '—') + ' — ' + b.date);
  });
  console.log('═══════════════════════════════════════');
  return backups;
};

window.__restoreLastDeleted = async function(){
  var backups = window.__listDeletedTxs();
  var keys = Object.keys(backups);
  if(!keys.length){
    console.log('❌ No backups');
    return;
  }
  var lastKey = keys[keys.length - 1];
  console.log('Restoring:', lastKey);
  await restoreDeletedTx(lastKey);
};

console.log('✅ Audit module loaded — v5.0 (loan total = main + withdrawal)');