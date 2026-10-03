/* ============================================================
   FILE: tx/tx-other-bank.js
   PURPOSE: 🏦 অন্য ব্যাংকে লেনদেন (Physical + Online)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openOtherBankForm(editId, prefill){
  // Reuse generic form with other_bank config
  openGenericTxForm('other_bank', editId, prefill);
}

/* ───── END OF FILE tx/tx-other-bank.js ───── */
console.log('✅ Other Bank loaded');