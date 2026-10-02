/* ============================================================
   FILE: tx/tx-expense.js
   PURPOSE: 🧾 ক্যাশ খরচ (Cash expense from vault)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openExpenseForm(editId, prefill){
  // Reuse generic form with expense config
  openGenericTxForm('expense', editId, prefill);
}

/* ───── END OF FILE tx/tx-expense.js ───── */
console.log('✅ Expense loaded');