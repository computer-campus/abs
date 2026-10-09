/* ============================================================
   FILE: js/14-print-preview.js
   PURPOSE: সব txn এর print preview modal
   VERSION: v1.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   🔧 Generate printable HTML for a transaction
   ═══════════════════════════════════════════════════════════ */
function buildReceiptHTML(t){
  if(!t) return '';
  var cfg = TX_TYPES[t.type] || { icon: '📌', title: t.type };
  var branchName = BRANCHES[t.branch]?.name || '—';
  var user = t.user || '—';
  var date = t.date || '—';
  var timeStr = '—';
  if(t.createdAt){
    try {
      var dt = new Date(t.createdAt);
      var hh = dt.getHours();
      var mm = String(dt.getMinutes()).padStart(2, '0');
      var ss = String(dt.getSeconds()).padStart(2, '0');
      var ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      timeStr = toBn(String(hh).padStart(2, '0') + ':' + mm + ':' + ss) + ' ' + ampm;
    } catch(e){}
  }

  // ═══ Denom helper ═══
  function denomRows(notes, color){
    var keys = Object.keys(notes || {}).filter(function(k){ return Number(notes[k]) > 0; }).sort(function(a,b){ return b - a; });
    if(!keys.length) return '';
    var total = 0;
    var rows = '';
    keys.forEach(function(d){
      var cnt = Number(notes[d]);
      var amt = Number(d) * cnt;
      total += amt;
      rows += '<tr>' +
        '<td style="padding:5px 10px;border:1px solid #999;font-size:11px">৳ ' + toBn(d) + '</td>' +
        '<td style="padding:5px 10px;border:1px solid #999;font-size:11px;text-align:center">× ' + toBn(cnt) + '</td>' +
        '<td style="padding:5px 10px;border:1px solid #999;font-size:11px;text-align:right;font-weight:700">৳ ' + fmt(amt) + '</td>' +
      '</tr>';
    });
    rows += '<tr style="background:#f0f0f0">' +
      '<td colspan="2" style="padding:6px 10px;border:1px solid #999;font-size:11px;font-weight:900;color:' + color + '">মোট</td>' +
      '<td style="padding:6px 10px;border:1px solid #999;font-size:12px;text-align:right;font-weight:900;color:' + color + '">৳ ' + fmt(total) + '</td>' +
    '</tr>';
    return rows;
  }

  // ═══ Build rows based on type ═══
  var rowsHTML = '';

  // Common info
  // ═══ Basic Info — 3 Column Grid ═══
  var infoItems = [];
  infoItems.push({ label: '📅 তারিখ', value: toBn(date), color: '#1e40af' });
  infoItems.push({ label: '🕐 সময়', value: timeStr, color: '#1e40af' });
  infoItems.push({ label: '🏦 আউটলেট', value: branchName, color: '#111' });
  infoItems.push({ label: '👤 ইউজার', value: user, color: '#111' });
  if(t.custName) infoItems.push({ label: '👤 গ্রাহক', value: t.custName + (t.custAcc ? ' (' + t.custAcc + ')' : ''), color: '#15803d' });
  if(t.custMobile) infoItems.push({ label: '📱 মোবাইল', value: t.custMobile, color: '#111' });
  if(t.note) infoItems.push({ label: '📝 মন্তব্য', value: t.note, color: '#7c3aed', full: true });

  var infoHTML = '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;margin-bottom:14px">';
  infoItems.forEach(function(item){
    var span = item.full ? 'grid-column:1/-1;' : '';
    infoHTML += '<div style="' + span + 'padding:7px 10px;border-radius:6px;background:#f8fafc;border:1px solid #cbd5e1">' +
      '<div style="font-size:9.5px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px">' + item.label + '</div>' +
      '<div style="font-size:11.5px;font-weight:900;color:' + item.color + ';word-break:break-word;line-height:1.4">' + esc(item.value) + '</div>' +
    '</div>';
  });
  infoHTML += '</div>';

  // ═══ Loan Given specific ═══
  if(t.type === 'loan_given'){
    var mainLoan = Number(t.mainLoanAmount) || Number(t.amount) || 0;
    var withdrawal = Number(t.withdrawalAmount) || 0;
    var total = mainLoan + withdrawal;
    var online = Number(t.onlineAmount) || 0;
    var cash = Number(t.cashAmount) || 0;
    var notTaken = Number(t.cashNotTakenAmount) || 0;

    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#dbeafe;font-size:11px;font-weight:800;width:38%">🏦 মূল ঋণ</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#1e40af;text-align:right">৳ ' + fmt(mainLoan) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fef3c7;font-size:11px;font-weight:800">+ 💵 নগদ উত্তোলন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#a16207;text-align:right">৳ ' + fmt(withdrawal) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:12px;font-weight:900">= মোট ঋণ</td>' +
        '<td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:15px;font-weight:900;color:#15803d;text-align:right">৳ ' + fmt(total) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;font-size:11px;font-weight:700">🌐 অনলাইন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:800;color:#7c3aed;text-align:right">৳ ' + fmt(online) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;font-size:11px;font-weight:700">💸 ক্যাশ</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:800;color:#a16207;text-align:right">৳ ' + fmt(cash) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fef2f2;font-size:11px;font-weight:800">💰 ক্যাশ নেয়নি</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;background:#fef2f2;font-size:13px;font-weight:900;color:#b91c1c;text-align:right">৳ ' + fmt(notTaken) + '</td></tr>' +
    '</table>';
  }

  // ═══ Loan Received specific ═══
  if(t.type === 'loan_received'){
    var lrOnline = Number(t.onlineAmount) || 0;
    var totalRec = Number(t.receivedAmount) || 0;
    var change = Number(t.changeAmount) || 0;
    var net = Number(t.netAmount) || 0;

    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#dbeafe;font-size:11px;font-weight:800;width:38%">🌐 অনলাইন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#1e40af;text-align:right">৳ ' + fmt(lrOnline) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#dbeafe;font-size:11px;font-weight:800">📥 মোট গ্রহণ</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#1e40af;text-align:right">৳ ' + fmt(totalRec) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fef3c7;font-size:11px;font-weight:800">🔄 ফেরত</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#a16207;text-align:right">৳ ' + fmt(change) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:12px;font-weight:900">💰 Net জমা</td>' +
        '<td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:15px;font-weight:900;color:#15803d;text-align:right">৳ ' + fmt(net) + '</td></tr>' +
    '</table>';
  }

  // ═══ Deposit specific ═══
  if(t.type === 'deposit'){
    var depType = (t.depositType === 'online' || t.dir === 'online') ? '🌐 অনলাইন' : '💵 ক্যাশ';
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#dcfce7;font-size:11px;font-weight:800;width:38%">ধরন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#15803d;text-align:right">' + depType + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:12px;font-weight:900">মোট জমা</td>' +
        '<td style="padding:8px 12px;border:2px solid #16a34a;background:#dcfce7;font-size:15px;font-weight:900;color:#15803d;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Support specific ═══
  if(t.type === 'support'){
    var dirLabel = (t.dir === 'out') ? '📤 সাপোর্ট প্রদান' :
                   (t.dir === 'in') ? '📥 সাপোর্ট ফেরত' :
                   (t.dir === 'online_support_out') ? '🌐 অনলাইন প্রদান' :
                   '🌐 অনলাইন ফেরত';
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fce7f3;font-size:11px;font-weight:800;width:38%">ধরন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:13px;font-weight:900;color:#be185d;text-align:right">' + dirLabel + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #ec4899;background:#fce7f3;font-size:12px;font-weight:900">মোট</td>' +
        '<td style="padding:8px 12px;border:2px solid #ec4899;background:#fce7f3;font-size:15px;font-weight:900;color:#be185d;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Other Bank specific ═══
  if(t.type === 'other_bank'){
    var dirLabel2 = (t.dir === 'in') ? '📥 ফিজিক্যাল আসা' :
                    (t.dir === 'out') ? '📤 ফিজিক্যাল পাঠানো' :
                    (t.dir === 'online_in') ? '💳 অনলাইন আসা' :
                    '💳 অনলাইন পাঠানো';
    var bankName = BANKS[t.bank]?.name || '—';
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#ede9fe;font-size:11px;font-weight:800;width:38%">ধরন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:900;color:#6d28d9;text-align:right">' + dirLabel2 + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#ede9fe;font-size:11px;font-weight:800">🏦 ব্যাংক</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:800;text-align:right">' + esc(bankName) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #7c3aed;background:#ede9fe;font-size:12px;font-weight:900">মোট</td>' +
        '<td style="padding:8px 12px;border:2px solid #7c3aed;background:#ede9fe;font-size:15px;font-weight:900;color:#6d28d9;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Branch/Bank Transfer specific ═══
  if(t.type === 'branch_transfer' || t.type === 'bank_transfer'){
    var fromN = BRANCHES[t.from]?.name || t.from || '—';
    var toN = BRANCHES[t.to]?.name || t.to || '—';
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fee2e2;font-size:11px;font-weight:800;width:38%">📤 থেকে</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:800;color:#b91c1c;text-align:right">' + esc(fromN) + '</td></tr>' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#dcfce7;font-size:11px;font-weight:800">📥 গ্রাহক</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:800;color:#15803d;text-align:right">' + esc(toN) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #0891b2;background:#cffafe;font-size:12px;font-weight:900">মোট</td>' +
        '<td style="padding:8px 12px;border:2px solid #0891b2;background:#cffafe;font-size:15px;font-weight:900;color:#0891b2;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Money Exchange specific ═══
  if(t.type === 'money_exchange'){
    var exType = (t.exchangeType === 'online') ? '🌐 Online এ গ্রহণ' : '🔄 শুধুই পরিবর্তন';
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:6px 12px;border:1px solid #bbb;background:#fef3c7;font-size:11px;font-weight:800;width:38%">ধরন</td>' +
        '<td style="padding:6px 12px;border:1px solid #bbb;font-size:12px;font-weight:900;color:#a16207;text-align:right">' + exType + '</td></tr>' +
      '<tr><td style="padding:8px 12px;border:2px solid #f59e0b;background:#fef3c7;font-size:12px;font-weight:900">মোট</td>' +
        '<td style="padding:8px 12px;border:2px solid #f59e0b;background:#fef3c7;font-size:15px;font-weight:900;color:#a16207;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Generic (withdrawal, expense) ═══
  if(t.type === 'withdrawal' || t.type === 'expense'){
    rowsHTML += '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">' +
      '<tr><td style="padding:8px 12px;border:2px solid #1e40af;background:#dbeafe;font-size:12px;font-weight:900;width:38%">মোট</td>' +
        '<td style="padding:8px 12px;border:2px solid #1e40af;background:#dbeafe;font-size:15px;font-weight:900;color:#1e40af;text-align:right">৳ ' + fmt(t.amount) + '</td></tr>' +
    '</table>';
  }

  // ═══ Denomination sections ═══
  var denomHTML = '';
  var hasOut = t.notesOut && Object.keys(t.notesOut).length > 0;
  var hasIn = t.notesIn && Object.keys(t.notesIn).length > 0;
  var hasChange = t.changeNotesOut && Object.keys(t.changeNotesOut).length > 0;

  if(hasOut || hasIn || hasChange || (t.branchSplits && t.branchSplits.length)){
    denomHTML += '<div style="font-size:12px;font-weight:900;color:#1e40af;margin:14px 0 8px;padding:6px 10px;background:#dbeafe;border-left:3px solid #1e40af">🗄️ নোট ডিনোমিনেশন</div>';

    if(hasIn){
      denomHTML += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:900;color:#15803d;padding:4px 8px;background:#dcfce7">📥 গ্রহণ</div>' +
        '<table style="width:100%;border-collapse:collapse"><tbody>' + denomRows(t.notesIn, '#15803d') + '</tbody></table></div>';
    }
    if(hasOut){
      denomHTML += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:900;color:#a16207;padding:4px 8px;background:#fef3c7">💸 প্রদান</div>' +
        '<table style="width:100%;border-collapse:collapse"><tbody>' + denomRows(t.notesOut, '#a16207') + '</tbody></table></div>';
    }
    if(hasChange){
      denomHTML += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:900;color:#c2410c;padding:4px 8px;background:#ffedd5">🔄 ফেরত</div>' +
        '<table style="width:100%;border-collapse:collapse"><tbody>' + denomRows(t.changeNotesOut, '#c2410c') + '</tbody></table></div>';
    }
    if(t.branchSplits && t.branchSplits.length){
      t.branchSplits.forEach(function(sp){
        if(!sp.notesIn || !Object.keys(sp.notesIn).length) return;
        var bN = BRANCHES[sp.branch]?.name || sp.branch;
        denomHTML += '<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:900;color:#1e40af;padding:4px 8px;background:#dbeafe">🏦 ' + esc(bN) + '</div>' +
          '<table style="width:100%;border-collapse:collapse"><tbody>' + denomRows(sp.notesIn, '#1e40af') + '</tbody></table></div>';
      });
    }
  }

  // ═══ Final HTML ═══
  return '<div style="font-family:\'Noto Sans Bengali\',sans-serif;color:#111;background:#fff;padding:20px;line-height:1.5">' +
    // Header
    '<div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:14px">' +
      '<div style="font-size:36px">🏛️</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:17px;font-weight:900;color:#1e40af">কম্পিউটার ক্যাম্পাস</div>' +
        '<div style="font-size:11px;color:#555;font-weight:700">কলারোয়া আউটলেট • ঝাউডাঙ্গা আউটলেট</div>' +
      '</div>' +
      '<div style="text-align:right;font-size:10px;color:#666;font-weight:700">' +
        '📅 ' + toBn(new Date().toLocaleDateString('en-GB')) + '<br>' +
        '🕐 ' + toBn(new Date().toLocaleTimeString('en-GB')) +
      '</div>' +
    '</div>' +

    // Title
    '<div style="font-size:14px;font-weight:900;color:#fff;background:#1e40af;padding:8px 12px;border-radius:5px;margin-bottom:14px;display:flex;justify-content:space-between">' +
      '<span>' + cfg.icon + ' ' + esc(cfg.title) + '</span>' +
      '<span>৳ ' + fmt(t.amount) + '</span>' +
    '</div>' +

    // Basic info — 3 columns
    infoHTML +

    // Specific rows
    rowsHTML +

    // Denomination
    denomHTML +

    // Footer
    '<div style="margin-top:20px;padding-top:12px;border-top:2px dashed #999;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">' +
      '<div style="text-align:center;font-size:10px;font-weight:700;color:#333">' +
        '<div style="border-top:1px solid #666;margin-top:35px;padding-top:3px">গ্রাহকের স্বাক্ষর</div>' +
      '</div>' +
      '<div style="text-align:center;font-size:10px;font-weight:700;color:#333">' +
        '<div style="border-top:1px solid #666;margin-top:35px;padding-top:3px">অনুমোদনকারী</div>' +
      '</div>' +
      '<div style="text-align:center;font-size:10px;font-weight:700;color:#333">' +
        '<div style="border-top:1px solid #666;margin-top:35px;padding-top:3px">' + esc(user) + '</div>' +
      '</div>' +
    '</div>' +

    '<div style="text-align:center;font-size:9px;color:#666;margin-top:14px;padding-top:8px;border-top:1px solid #ddd">' +
      'কম্পিউটার ক্যাম্পাস • এজেন্ট ব্যাংকিং সিস্টেম' +
    '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════════════════
   👁️ PRINT PREVIEW MODAL
   ═══════════════════════════════════════════════════════════ */
function openPrintPreview(tx){
  if(!tx){ toast('❌ নেই'); return; }

  var receiptHTML = buildReceiptHTML(tx);

  var bodyHTML =
    // Preview container (A4 scaled)
    '<div style="padding:20px;border-radius:14px;background:#f0f0f0;max-height:60vh;overflow-y:auto">' +
      '<div style="background:#fff;max-width:800px;margin:0 auto;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15)">' +
        receiptHTML +
      '</div>' +
    '</div>' +

    // Action buttons
    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn cyan" id="pv-print-btn" style="flex:1">🖨️ প্রিন্ট করুন</button>' +
      '<button class="btn gray" id="pv-close-btn" style="flex:0 0 auto;padding:12px 20px">✕ বন্ধ</button>' +
    '</div>';

  var m = openModal({
    title: '👁️ প্রিন্ট প্রিভিউ',
    bodyHTML: bodyHTML,
    wide: true
  });

  setTimeout(function(){
    var root = m.bg.querySelector('.modal-body');

    // Print button
    var pb = root.querySelector('#pv-print-btn');
    if(pb){
      pb.addEventListener('click', function(){
        // Open new window with content
        var w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
        if(!w){
          toast('❌ পপ-আপ ব্লক হয়েছে — allow করুন', 'err');
          return;
        }
        w.document.open();
        w.document.write(
          '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
          (TX_TYPES[tx.type]?.title || 'Receipt') + ' — ৳ ' + fmt(tx.amount) +
          '</title>' +
          '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' +
          '<style>' +
            '@page{size:A4 portrait;margin:10mm}' +
            '@media print{body{margin:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}' +
            'body{margin:0;padding:20px;font-family:"Noto Sans Bengali",sans-serif;background:#fff}' +
            'table{page-break-inside:auto}' +
            'tr{page-break-inside:avoid}' +
          '</style>' +
          '</head><body>' + receiptHTML + '</body></html>'
        );
        w.document.close();
        setTimeout(function(){
          try { w.focus(); w.print(); } catch(e){}
        }, 500);
      });
    }

    // Close
    var cb = root.querySelector('#pv-close-btn');
    if(cb) cb.addEventListener('click', function(){ m.close(); });

  }, 100);
}

/* ═══════════════════════════════════════════════════════════
   🔗 Override printSingleTransaction — open preview instead
   ═══════════════════════════════════════════════════════════ */
var __origPrintSingle = window.printSingleTransaction;
window.printSingleTransaction = function(tx){
  if(!tx){ toast('❌ নেই'); return; }
  openPrintPreview(tx);
};

console.log('✅ Print Preview module loaded');