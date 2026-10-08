/* ============================================================
   FILE: js/06-dispatcher.js
   PURPOSE: Transaction Router — openTxForm()
   ============================================================ */
'use strict';

function openTxForm(type, editId){
  if(READ_ONLY){ toast('👁️ Read-Only Mode — Save কাজ করবে না', 'warn'); return; }
  if(!SESSION) return;

  switch(type){
    case 'deposit':         return openDepositForm(editId);
    case 'expense':         return openExpenseForm(editId);
    case 'support':         return openSupportForm(editId);
    case 'other_bank':      return openOtherBankForm(editId);
    case 'withdrawal':      return openWithdrawalForm(editId);
    case 'loan_given':      return openLoanGivenForm(editId);
    case 'loan_received':   return openLoanReceivedForm(editId);
    case 'branch_transfer': return openBranchTransferForm(editId);
    case 'bank_transfer':   return openBankTransferForm(editId);
    case 'money_exchange':  return openMoneyExchange(editId);
    case 'loan_collection': return openCollectionListModal();
    default: toast('❌ Unknown: ' + type);
  }
}