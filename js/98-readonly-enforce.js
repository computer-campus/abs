/* ============================================================
   FILE: js/98-readonly-enforce.js — COMPLETE FRESH
   PURPOSE: Mobile read-only + cloud sync (no minus)
   VERSION: v3.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   MOBILE MODE ONLY
   ═══════════════════════════════════════════════════════════ */
if(!window.__READ_ONLY_MODE){
  console.log('%c💻 Full Mode Active', 'background:#16a34a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');
} else {

  console.log('%c📱 MOBILE READ-ONLY MODE ACTIVE',
    'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold;font-size:13px');

  /* ═══════════════════════════════════════════════════════════
     🚫 BLOCK ALL WRITE FUNCTIONS
     ═══════════════════════════════════════════════════════════ */
  window.saveDB = function(){
    console.warn('🚫 saveDB blocked (mobile read-only)');
    return Promise.resolve();
  };

  window.pushRemoteDB = function(){
    console.warn('🚫 pushRemoteDB blocked (mobile read-only)');
    return Promise.resolve();
  };

  window.afterTxSave = function(){
    console.warn('🚫 afterTxSave blocked (mobile read-only)');
    return Promise.resolve();
  };

  window.deleteTx = async function(){
    if(typeof toast === 'function') toast('👁️ Read-Only Mode\n\nডিলিট করা যাবে না।', 'warn');
  };

  window.maybeAutoBackup = function(){};
  window.createBackupSnapshot = async function(){ return null; };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE mergeCloudLocal — Cloud Always Win
     ⚡ Never recompute on mobile (prevents minus)
     ═══════════════════════════════════════════════════════════ */
  var __origMerge = window.smartMergeCloudLocal;

  window.smartMergeCloudLocal = function(cloud, local){
    // Get merged base (txs, customers, users)
    var merged = __origMerge ? __origMerge.call(this, cloud, local) : (cloud || local);
    if(!merged) return merged;

    // ⚡ Cloud এ যা আছে সেটাই final (mobile এ recompute হবে না)
    if(cloud){
      // Base data — force copy
      if(cloud.baseVault)     merged.baseVault     = JSON.parse(JSON.stringify(cloud.baseVault));
      if(cloud.baseAccounts)  merged.baseAccounts  = JSON.parse(JSON.stringify(cloud.baseAccounts));
      if(cloud.branchCapital) merged.branchCapital = JSON.parse(JSON.stringify(cloud.branchCapital));
      if(cloud.totalCapital !== undefined) merged.totalCapital = cloud.totalCapital;
      if(cloud.lastBaseDate)  merged.lastBaseDate  = cloud.lastBaseDate;

      // Live data — force copy
      if(cloud.liveVault)     merged.liveVault     = JSON.parse(JSON.stringify(cloud.liveVault));
      if(cloud.liveAccounts)  merged.liveAccounts  = JSON.parse(JSON.stringify(cloud.liveAccounts));
    }

    return merged;
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE recomputeLive — NO-OP on mobile
     ⚡ Mobile এ recompute কখনো করব না
     ═══════════════════════════════════════════════════════════ */
  window.recomputeLive = function(){
    console.log('📱 recomputeLive blocked on mobile (using cloud values)');
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE computeStateAtDate — Cloud value return
     ═══════════════════════════════════════════════════════════ */
  var __origComputeState = window.computeStateAtDate;

  window.computeStateAtDate = function(bf, targetDate){
    // Mobile এ সবসময় current live values from cloud
    if(!window.DB) return { totals: { bank: 0, cash: 0, other: 0 }, vaultTotals: {} };

    var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
    var totals = { bank: 0, cash: 0, other: 0 };
    var vaultTotals = {};
    DENOMS.forEach(function(d){ vaultTotals[d] = 0; });

    branches.forEach(function(b){
      var la = DB.liveAccounts && DB.liveAccounts[b] || { bank: 0, cash: 0, other: 0 };
      var lv = DB.liveVault && DB.liveVault[b] || {};

      totals.bank += Number(la.bank) || 0;
      totals.cash += Number(la.cash) || 0;
      totals.other += Number(la.other) || 0;

      DENOMS.forEach(function(d){
        vaultTotals[d] += Number(lv[d]) || 0;
      });
    });

    return { totals: totals, vaultTotals: vaultTotals, accounts: {}, vault: {} };
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE pullCloud — Direct replace
     ═══════════════════════════════════════════════════════════ */
  var __origPull = window.pullCloud;

  window.pullCloud = async function(){
    if(!window.SUPA || !navigator.onLine) return false;

    try {
      console.log('📱 Mobile: pulling fresh cloud data...');
      var res = await SUPA.from('agent_bank').select('data').eq('id', 'cc_agent_bank_main').maybeSingle();

      if(!res.data || !res.data.data){
        console.warn('⚠️ No cloud data');
        return false;
      }

      var cloud = res.data.data;

      // ⚡ FULL REPLACE — cloud is authoritative on mobile
      window.db = JSON.parse(JSON.stringify(cloud));

      // Ensure basic structure
      if(typeof normalizeDB === 'function') normalizeDB();

      // ⚡ Force cloud values (override any merge artifacts)
      if(cloud.liveAccounts){
        DB.liveAccounts = JSON.parse(JSON.stringify(cloud.liveAccounts));
      }
      if(cloud.liveVault){
        DB.liveVault = JSON.parse(JSON.stringify(cloud.liveVault));
      }
      if(cloud.baseAccounts){
        DB.baseAccounts = JSON.parse(JSON.stringify(cloud.baseAccounts));
      }
      if(cloud.baseVault){
        DB.baseVault = JSON.parse(JSON.stringify(cloud.baseVault));
      }
      if(cloud.branchCapital){
        DB.branchCapital = JSON.parse(JSON.stringify(cloud.branchCapital));
      }

      // ⚡ Fix negatives (safety)
      if(DB.liveAccounts){
        Object.keys(DB.liveAccounts).forEach(function(b){
          var acc = DB.liveAccounts[b];
          if(acc.bank < 0) acc.bank = 0;
          if(acc.cash < 0) acc.cash = 0;
          if(acc.other < 0) acc.other = 0;
        });
      }
      if(DB.liveVault){
        Object.keys(DB.liveVault).forEach(function(b){
          Object.keys(DB.liveVault[b]).forEach(function(d){
            if(DB.liveVault[b][d] < 0) DB.liveVault[b][d] = 0;
          });
        });
      }

      // Save locally
      if(typeof saveLocal === 'function') saveLocal();

      window.__hasSyncedOnce = true;

      console.log('📱 Mobile cloud pull done');
      console.log('   Bank:', DB.liveAccounts?.kalaroa?.bank);
      console.log('   Cash:', DB.liveAccounts?.kalaroa?.cash);

      return true;

    } catch(e){
      console.warn('📱 Pull error:', e);
      return false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE getBalances — Cloud value
     ═══════════════════════════════════════════════════════════ */
  var __origGetBalances = window.getBalances;

  window.getBalances = function(bf){
    if(!window.DB) return { bank: 0, cash: 0, other: 0 };

    var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
    var r = { bank: 0, cash: 0, other: 0 };

    branches.forEach(function(b){
      var la = DB.liveAccounts && DB.liveAccounts[b] || { bank: 0, cash: 0, other: 0 };
      r.bank += Math.max(0, Number(la.bank) || 0);
      r.cash += Math.max(0, Number(la.cash) || 0);
      r.other += Math.max(0, Number(la.other) || 0);
    });

    return r;
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ OVERRIDE getVault — Cloud value
     ═══════════════════════════════════════════════════════════ */
  var __origGetVault = window.getVault;

  window.getVault = function(bf){
    if(!window.DB) return {};

    var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
    var t = {};
    DENOMS.forEach(function(d){ t[d] = 0; });

    branches.forEach(function(b){
      var lv = DB.liveVault && DB.liveVault[b] || {};
      DENOMS.forEach(function(d){
        t[d] += Math.max(0, Number(lv[d]) || 0);
      });
    });

    return t;
  };

  /* ═══════════════════════════════════════════════════════════
     🔒 BLOCK ALL SAVE BUTTONS
     ═══════════════════════════════════════════════════════════ */
  var BLOCKED_IDS = [
    'f_save', 'cc_save', 'me_save', 'ss_save',
    'u_add', 'bm_save', 'nc_save',
    'bk_complete_reset', 'bk_clear_backups', 'bk_new', 'bk_restore_file',
    'audit_clear_all',
    'txd_edit', 'txd_del',
    'cust_h_support',
    'tp_accept', 'tp_cancel',
    'cp_cash', 'cp_online',
    'tx-save', 'nc-save'
  ];

  var BLOCKED_DATA = [
    'cdel', 'del', 'dbdel', 'bk-del', 'bk-restore',
    'acc', 'cancel',
    'edit', 'dbedit',
    'cash', 'online',
    'bt-acc', 'bt-cancel', 'bt-hacc', 'bt-hcancel',
    'pwd',
    'user-del', 'user-edit', 'user-pwd',
    'cust-del'
  ];

  var ALLOWED_DATA = [
    'print', 'cust-tx-print', 'bt-print', 'print-cust',
    'cust-view', 'cust-tx-view', 'tx-view',
    'hist', 'view-cust',
    'sug-item', 'close',
    'notif-close', 'act-close',
    'quick', 'bk-dl',
    'tx-detail', 'cust-row'
  ];

  document.addEventListener('click', function(e){
    // Allowed?
    for(var i = 0; i < ALLOWED_DATA.length; i++){
      if(e.target.closest('[data-' + ALLOWED_DATA[i] + ']')) return;
    }

    // Blocked IDs?
    for(var j = 0; j < BLOCKED_IDS.length; j++){
      var btn = e.target.closest('#' + BLOCKED_IDS[j]);
      if(btn){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if(typeof toast === 'function'){
          toast('📱 Read-Only Mode\n\nশুধু দেখা যাবে', 'warn');
        }
        return;
      }
    }

    // Blocked data attrs?
    for(var k = 0; k < BLOCKED_DATA.length; k++){
      var b2 = e.target.closest('[data-' + BLOCKED_DATA[k] + ']');
      if(b2){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if(typeof toast === 'function'){
          toast('📱 Read-Only Mode\n\nশুধু দেখা যাবে', 'warn');
        }
        return;
      }
    }
  }, true);

  /* ═══════════════════════════════════════════════════════════
     🔄 AUTO REFRESH every 30 seconds
     ═══════════════════════════════════════════════════════════ */
  setInterval(function(){
    if(!SESSION) return;
    if(!navigator.onLine) return;
    if(window.__isApplyingRemote) return;
    if(!window.SUPA) return;

    window.pullCloud().then(function(ok){
      if(ok){
        if(typeof renderDashboard === 'function') renderDashboard(true);
        console.log('📱 Auto-refresh done');
      }
    }).catch(function(){});
  }, 30000);

  /* ═══════════════════════════════════════════════════════════
     📱 WELCOME TOAST
     ═══════════════════════════════════════════════════════════ */
  setTimeout(function(){
    if(typeof toast === 'function'){
      toast('📱 Mobile — Read-Only Mode\n\nল্যাপটপ থেকে sync হবে', 'warn');
    }
  }, 3000);

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__checkMobile = function(){
    console.log('═══════════════════════════════════');
    console.log('📱 MOBILE STATUS');
    console.log('═══════════════════════════════════');
    console.log('Read-Only:', window.__READ_ONLY_MODE);
    console.log('');
    console.log('🏦 Live Accounts:');
    console.log('  Kalaroa:', DB?.liveAccounts?.kalaroa);
    console.log('  Jhaudanga:', DB?.liveAccounts?.jhaudanga);
    console.log('');
    console.log('🗄️ Live Vault (Kalaroa):');
    console.log(DB?.liveVault?.kalaroa);
    console.log('');
    console.log('📊 Txs:', (DB?.txs || []).length);
    console.log('⏰ Last update:', DB?.__lastUpdate);
    console.log('═══════════════════════════════════');
  };

  window.__forcePull = function(){
    console.log('🔄 Forcing cloud pull...');
    return window.pullCloud().then(function(ok){
      console.log('Result:', ok ? '✅' : '❌');
      if(ok){
        console.log('Bank:', DB?.liveAccounts?.kalaroa?.bank);
        console.log('Cash:', DB?.liveAccounts?.kalaroa?.cash);
        if(typeof renderDashboard === 'function') renderDashboard(true);
      }
    });
  };

    /* ═══════════════════════════════════════════════════════════
     🚀 AUTO PULL — Mobile এ page load এ cloud থেকে data আনো
     ═══════════════════════════════════════════════════════════ */
  var autoPullAttempts = 0;

  function autoPullFromCloud(){
    autoPullAttempts++;

    if(autoPullAttempts > 20){
      console.log('⚠️ Auto-pull timeout after 20 attempts');
      return;
    }

    // Wait for SUPA
    if(!window.SUPA){
      console.log('⏳ Waiting for SUPA... (' + autoPullAttempts + ')');
      setTimeout(autoPullFromCloud, 1000);
      return;
    }

    // Wait for session
    if(!window.SESSION){
      console.log('⏳ Waiting for session... (' + autoPullAttempts + ')');
      setTimeout(autoPullFromCloud, 1000);
      return;
    }

    console.log('🚀 Mobile auto-pull starting...');

    window.SUPA.from('agent_bank').select('data').eq('id', 'cc_agent_bank_main').maybeSingle()
      .then(function(r){
        if(!r.data || !r.data.data){
          console.log('❌ Cloud এ data নেই');
          return;
        }

        var c = r.data.data;
        console.log('✅ Cloud data found:', (c.txs || []).length, 'txs');

        // ⚡ Full replace
        window.db = JSON.parse(JSON.stringify(c));

        // Force cloud values (mobile-safe)
        if(c.liveAccounts) DB.liveAccounts = JSON.parse(JSON.stringify(c.liveAccounts));
        if(c.liveVault) DB.liveVault = JSON.parse(JSON.stringify(c.liveVault));
        if(c.baseAccounts) DB.baseAccounts = JSON.parse(JSON.stringify(c.baseAccounts));
        if(c.baseVault) DB.baseVault = JSON.parse(JSON.stringify(c.baseVault));
        if(c.branchCapital) DB.branchCapital = JSON.parse(JSON.stringify(c.branchCapital));

        // Fix negatives
        if(DB.liveAccounts){
          Object.keys(DB.liveAccounts).forEach(function(b){
            var a = DB.liveAccounts[b];
            if(a.bank < 0) a.bank = 0;
            if(a.cash < 0) a.cash = 0;
            if(a.other < 0) a.other = 0;
          });
        }
        if(DB.liveVault){
          Object.keys(DB.liveVault).forEach(function(b){
            Object.keys(DB.liveVault[b] || {}).forEach(function(d){
              if(DB.liveVault[b][d] < 0) DB.liveVault[b][d] = 0;
            });
          });
        }

        // Save local
        if(typeof saveLocal === 'function') saveLocal();

        // Refresh UI
        if(typeof renderTopbar === 'function') renderTopbar();
        if(typeof renderDashboard === 'function') renderDashboard(true);
        if(typeof renderSidebar === 'function') renderSidebar();

        console.log('✅ Mobile auto-pull complete');
        console.log('   Bank:', DB.liveAccounts?.kalaroa?.bank);
        console.log('   Vault 1000:', DB.liveVault?.kalaroa?.[1000]);

        // Toast
        if(typeof toast === 'function'){
          toast('☁️ Cloud থেকে data sync হয়েছে', 'ok');
        }

      })
      .catch(function(e){
        console.warn('❌ Pull error:', e);
        // Retry
        setTimeout(autoPullFromCloud, 2000);
      });
  }

  // ⚡ Multiple triggers
  setTimeout(autoPullFromCloud, 2000);   // 2s
  setTimeout(autoPullFromCloud, 5000);   // 5s (safety)
  setTimeout(autoPullFromCloud, 10000);  // 10s (safety)

  console.log('%c✅ Mobile Read-Only v3.0 — no more minus!',
    'background:#16a34a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');
}