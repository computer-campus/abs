/* ============ TX: SUPPORT (সাপোর্ট) ============ */
'use strict';
function openSupportForm(editId){
  openSimpleForm('support', editId, {
    needsDir: true, needsOnline: true,
    dirOptions: [
      { v: 'out', l: 'প্রদান' },
      { v: 'in', l: 'ফেরত' },
      { v: 'online_support_out', l: '🌐 অনলাইন প্রদান' },
      { v: 'online_support_in', l: '🌐 অনলাইন ফেরত' }
    ],
    amountLabel: 'পরিমাণ'
  });
}
console.log('✅ Support');