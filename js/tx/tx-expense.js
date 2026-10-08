/* ============ TX: EXPENSE (ক্যাশ খরচ) ============ */
'use strict';
function openExpenseForm(editId){
  openSimpleForm('expense', editId, {
    needsDir: false, needsOnline: false,
    amountLabel: 'পরিমাণ'
  });
}
console.log('✅ Expense');