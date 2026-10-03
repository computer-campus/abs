/* ============================================================
   FILE: tx/tx-deposit.js
   PURPOSE: 🏦 জমা (Customer deposits into account)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openDepositForm(editId, prefill){
  // Reuse generic form with deposit config
  openGenericTxForm('deposit', editId, prefill);
}

/* ───── END OF FILE tx/tx-deposit.js ───── */
console.log('✅ Deposit loaded');