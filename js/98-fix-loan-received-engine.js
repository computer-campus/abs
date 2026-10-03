/* ============================================================
   FILE: js/98-fix-loan-received-engine.js
   PURPOSE: Engine override — new loan_received format
   VERSION: v9.0
   LOAD: After 11-db-engine.js, before 99-init.js
   ============================================================ */

'use strict';

const __origApplyTxToLive = window.applyTxToLive;

window.applyTxToLive = function(tx, phase){
  // ⚡ NEW loan_received format detection
  if(tx && tx.type === 'loan_received' && tx.accountAmount !== undefined){
    const d = DB();
    const bb = tx.branch || 'kalaroa';
    const ensure = br => {
      if(!br) return;
      if(!d.liveAccounts[br]) d.liveAccounts[br] = { bank: 0, cash: 0, other: 0 };
      if(!d.liveVault[br]) d.liveVault[br] = {};
      DENOMS.forEach(x => {
        if(typeof d.liveVault[br][x] !== 'number') d.liveVault[br][x] = 0;
      });
    };
    ensure(bb);

    // 1. Online → mother bank
    d.liveAccounts[bb].bank += Number(tx.installmentOnline) || 0;

    // 2. Cash installment → vault
    if(tx.installmentCashNotes){
      adjustNotes(d.liveVault[bb], tx.installmentCashNotes, +1);
    }

    // 3. Other branch → its bank
    const otherKey = tx.installmentOtherBranchKey;
    const otherAmt = Number(tx.installmentOtherBranch) || 0;
    if(otherKey && otherKey !== bb && otherAmt > 0){
      ensure(otherKey);
      d.liveAccounts[otherKey].bank += otherAmt;
    }

    // 4. Cash to customer — informational only (no live effect)

    syncLiveCashFromVault();
    return;
  }

  // Fallback to original
  return __origApplyTxToLive.call(this, tx, phase);
};

console.log('✅ Loan Received engine override — v9.0');