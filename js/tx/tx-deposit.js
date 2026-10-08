/* ============ TX: DEPOSIT (জমা) ============ */
'use strict';
function openDepositForm(editId){
  openSimpleForm('deposit', editId, {
    needsDir: false, needsOnline: false,
    dirOptions: null,
    amountLabel: 'পরিমাণ'
  });
}
console.log('✅ Deposit');