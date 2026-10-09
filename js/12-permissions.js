/* ============================================================
   FILE: js/12-permissions.js
   PURPOSE: Edit সবাই করতে পারবে, Delete শুধু admin
   VERSION: v1.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   PERMISSIONS — Global override
   ═══════════════════════════════════════════════════════════ */

// ⚡ সব logged-in user edit করতে পারবে
window.canEditTx = function(tx){
  if(!SESSION) return false;
  if(!tx) return false;
  if(tx.cancelled) return false;
  return true;
};

// ⚡ শুধু admin delete করতে পারবে
window.canDeleteTx = function(tx){
  if(!SESSION) return false;
  return SESSION.role === 'admin';
};

// ⚡ অন্য সব admin permission check (vault, user, backup, danger zone)
window.requireAdmin = function(actionName){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন ' + (actionName || 'এই কাজ') + ' করতে পারবে');
    return false;
  }
  return true;
};

// ⚡ any user can edit (alias)
window.canEditAnyTx = function(){
  return !!SESSION;
};

console.log('✅ Permissions loaded — everyone can edit, only admin can delete');