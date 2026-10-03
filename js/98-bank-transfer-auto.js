/* ============================================================
   FILE: js/98-bank-transfer-auto.js
   PURPOSE: Bank Transfer — Auto apply + no accept notification
   VERSION: v10.0
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #1: applyTxToLive — bank_transfer always applies
   ═══════════════════════════════════════════════════════════ */
const __origApplyTxToLive_auto = window.applyTxToLive;

window.applyTxToLive = function(tx, phase){
  if(tx && tx.type === 'bank_transfer' && tx.from && tx.to){
    if(tx.cancelled) return;

    const d = DB();
    const amt = Number(tx.amount) || 0;

    const ensure = br => {
      if(!br) return;
      if(!d.liveAccounts[br]) d.liveAccounts[br] = { bank: 0, cash: 0, other: 0 };
      if(!d.liveVault[br]) d.liveVault[br] = {};
      DENOMS.forEach(x => {
        if(typeof d.liveVault[br][x] !== 'number') d.liveVault[br][x] = 0;
      });
    };

    ensure(tx.from);
    ensure(tx.to);

    // ⚡ Always apply — no phase check
    d.liveAccounts[tx.from].bank -= amt;
    d.liveAccounts[tx.to].bank   += amt;

    return;
  }

  // Fallback for other types
  return __origApplyTxToLive_auto.call(this, tx, phase);
};

/* ═══════════════════════════════════════════════════════════
   🔥 FIX #2: showBankTransferNotif — simple toast (no accept)
   ═══════════════════════════════════════════════════════════ */
window.showBankTransferNotif = function(data, info){
  try{
    if(typeof showActivityToast === 'function'){
      const fromName = data.txFromBranch || '—';
      const toName   = data.txToBranch || '—';
      showActivityToast(
        '🏛️',
        'ইন্টারনাল ট্রান্সফার — ' + fromName + ' ➜ ' + toName,
        info || {},
        'info',
        '#a78bfa',
        '#7c3aed',
        '৳ ' + fmt(data.amount || 0)
      );
    }

    try{
      if('Notification' in window && Notification.permission === 'granted'){
        new Notification('🏛️ ইন্টারনাল ট্রান্সফার', {
          body: (data.txFromBranch || '') + ' ➜ ' + (data.txToBranch || '') +
            '\n৳ ' + fmt(data.amount || 0),
          tag: 'cc_bt_' + (data.txId || Date.now()),
          silent: false
        });
      }
    } catch(e){}
  } catch(e){
    console.error('showBankTransferNotif fix:', e);
  }
};

/* ═══════════════════════════════════════════════════════════
   🧪 DEBUG HELPER
   ═══════════════════════════════════════════════════════════ */
window.__checkBankBalance = function(){
  const db = DB();
  if(!db){ console.log('❌ No DB'); return; }
  console.log('🏦 Mother Accounts:');
  console.log('  কলারোয়া:   ৳', fmt(db.liveAccounts?.kalaroa?.bank || 0));
  console.log('  ঝাউডাঙ্গা: ৳', fmt(db.liveAccounts?.jhaudanga?.bank || 0));
  console.log('📋 Total bank_transfer txs:',
    (db.txs || []).filter(t => t.type === 'bank_transfer').length);
  return db.liveAccounts;
};

console.log('%c🏛️ BANK TRANSFER AUTO v10.0 ACTIVE',
  'background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');
console.log('%c✅ Transfer = Instant • No accept needed',
  'background:#16a34a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');