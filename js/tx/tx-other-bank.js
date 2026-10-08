/* ============ TX: OTHER BANK (অন্য ব্যাঙ্ক) ============ */
'use strict';
function openOtherBankForm(editId){
  openSimpleForm('other_bank', editId, {
    needsDir: true, needsOnline: true,
    dirOptions: [
      { v: 'in', l: '📥 ফিজিক্যাল আসা' },
      { v: 'out', l: '📤 ফিজিক্যাল পাঠানো' },
      { v: 'online_in', l: '💳 অনলাইন আসা' },
      { v: 'online_out', l: '💳 অনলাইন পাঠানো' }
    ],
    amountLabel: 'পরিমাণ'
  });
}
console.log('✅ Other Bank');