/* ============================================================
   FILE: js/00-validate.js
   PURPOSE: Negative value protection + cloud restore guard
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   1️⃣ VALIDATE — কোনো negative value থাকলে true return করবে
   ═══════════════════════════════════════════════════════════ */
function hasNegativeValues(db){
  if(!db) return false;

  // Accounts check
  var accounts = db.liveAccounts || {};
  for(var br in accounts){
    var a = accounts[br] || {};
    if(Number(a.bank) < -0.01) return { field: br + '.bank', value: a.bank };
    if(Number(a.cash) < -0.01) return { field: br + '.cash', value: a.cash };
    if(Number(a.other) < -0.01) return { field: br + '.other', value: a.other };
  }

  // Base accounts
  var baseAcc = db.baseAccounts || {};
  for(var br2 in baseAcc){
    var b = baseAcc[br2] || {};
    if(Number(b.bank) < -0.01) return { field: br2 + '.base.bank', value: b.bank };
    if(Number(b.cash) < -0.01) return { field: br2 + '.base.cash', value: b.cash };
    if(Number(b.other) < -0.01) return { field: br2 + '.base.other', value: b.other };
  }

  // Vaults
  var vaults = db.liveVault || {};
  for(var br3 in vaults){
    var v = vaults[br3] || {};
    for(var d in v){
      if(Number(v[d]) < 0) return { field: br3 + '.vault.' + d, value: v[d] };
    }
  }

  var baseV = db.baseVault || {};
  for(var br4 in baseV){
    var bv = baseV[br4] || {};
    for(var d2 in bv){
      if(Number(bv[d2]) < 0) return { field: br4 + '.baseVault.' + d2, value: bv[d2] };
    }
  }

  // Capital
  var cap = db.branchCapital || {};
  for(var br5 in cap){
    if(Number(cap[br5]) < 0) return { field: br5 + '.capital', value: cap[br5] };
  }

  return false;
}

/* ═══════════════════════════════════════════════════════════
   2️⃣ FIX NEGATIVES — ক্ষতিকর নয়, zero করে দাও
   ═══════════════════════════════════════════════════════════ */
function fixNegativeValues(db){
  if(!db) return 0;

  var fixed = 0;

  // Live accounts
  var acc = db.liveAccounts || {};
  for(var br in acc){
    var a = acc[br] || {};
    if(Number(a.bank) < 0){ a.bank = 0; fixed++; }
    if(Number(a.cash) < 0){ a.cash = 0; fixed++; }
    if(Number(a.other) < 0){ a.other = 0; fixed++; }
  }

  // Base accounts
  var bacc = db.baseAccounts || {};
  for(var br2 in bacc){
    var b = bacc[br2] || {};
    if(Number(b.bank) < 0){ b.bank = 0; fixed++; }
    if(Number(b.cash) < 0){ b.cash = 0; fixed++; }
    if(Number(b.other) < 0){ b.other = 0; fixed++; }
  }

  // Live vaults
  var lv = db.liveVault || {};
  for(var br3 in lv){
    var v = lv[br3] || {};
    for(var d in v){
      if(Number(v[d]) < 0){ v[d] = 0; fixed++; }
    }
  }

  // Base vaults
  var bv = db.baseVault || {};
  for(var br4 in bv){
    var vv = bv[br4] || {};
    for(var d2 in vv){
      if(Number(vv[d2]) < 0){ vv[d2] = 0; fixed++; }
    }
  }

  // Capital
  var cap = db.branchCapital || {};
  for(var br5 in cap){
    if(Number(cap[br5]) < 0){ cap[br5] = 0; fixed++; }
  }

  return fixed;
}

/* ═══════════════════════════════════════════════════════════
   3️⃣ WRAP saveLocal — negative হলে save block
   ═══════════════════════════════════════════════════════════ */
var __origSaveLocal_validate = window.saveLocal;
window.saveLocal = function(){
  try {
    if(!DB) return;

    // ⚡ DB তে negative আছে কি না দেখো
    var neg = hasNegativeValues(DB);
    if(neg){
      console.warn('🚫 saveLocal BLOCKED — negative found:', neg);
      // Auto-fix করো
      var fixedCount = fixNegativeValues(DB);
      if(fixedCount > 0){
        console.log('🔧 Auto-fixed', fixedCount, 'negative values → 0');
        if(typeof toast === 'function'){
          toast('⚠️ ' + fixedCount + ' টি negative value ঠিক করা হয়েছে', 'warn');
        }
      }
      if(typeof recomputeLive === 'function') recomputeLive();
    }

    return __origSaveLocal_validate.call(this);

  } catch(e){
    console.error('saveLocal guard error:', e);
    return __origSaveLocal_validate.call(this);
  }
};

/* ═══════════════════════════════════════════════════════════
   4️⃣ WRAP mergeCloudLocal — negative হলে cloud reject
   ═══════════════════════════════════════════════════════════ */
var __origMerge_validate = window.mergeCloudLocal;
window.mergeCloudLocal = function(cloud, local){
  // ⚡ Cloud এ negative থাকলে পুরো cloud reject করো
  if(cloud){
    var cloudNeg = hasNegativeValues(cloud);
    if(cloudNeg){
      console.warn('🚫 CLOUD DATA REJECTED — has negative:', cloudNeg);
      if(typeof toast === 'function'){
        toast('🛡️ Cloud এ negative value — বর্তমান data রাখা হলো', 'warn');
      }
      // Local রাখো
      return local || cloud;
    }

    // ⚡ Cloud এ tx count কম হলে reject (auto-restore guard)
    var cloudTx = (cloud.txs || []).length;
    var localTx = (local && local.txs || []).length;
    if(cloudTx < localTx * 0.5 && localTx > 20){
      console.warn('🚫 CLOUD REJECTED — tx কম:', cloudTx, 'vs', localTx);
      if(typeof toast === 'function'){
        toast('🛡️ Cloud এ পুরনো data — reject করা হলো', 'warn');
      }
      return local;
    }
  }

  var merged = __origMerge_validate.call(this, cloud, local);
  if(!merged) return merged;

  // ⚡ Merged এ negative থাকলে fix
  var mergedNeg = hasNegativeValues(merged);
  if(mergedNeg){
    console.warn('⚠️ Merged has negative:', mergedNeg);
    fixNegativeValues(merged);
    if(typeof recomputeLive === 'function'){
      setTimeout(function(){ recomputeLive(); }, 100);
    }
  }

  return merged;
};

console.log('✅ Negative value protection active');