/* ============================================================
   FILE: js/02-engine.js — COMPLETE
   PURPOSE: Transaction engine + date-wise state
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function sumNotes(notes){
  if(!notes) return 0;
  var s = 0;
  for(var k in notes) s += Number(k) * (Number(notes[k]) || 0);
  return Math.round(s * 100) / 100;
}

// Alias
function noteSum(notes){ return sumNotes(notes); }

function addNotes(target, notes, sign){
  if(!notes || !target) return;
  for(var k in notes){
    var n = Number(notes[k]) || 0;
    if(!n) continue;
    target[k] = (Number(target[k]) || 0) + sign * n;
    if(target[k] < 0) target[k] = 0;
  }
}

/* ═══════════════════════════════════════════════════════════
   APPLY TX TO LIVE
   ═══════════════════════════════════════════════════════════ */
function applyTx(tx, phase){
  if(!tx || tx.cancelled) return;

  var bb = tx.branch || 'kalaroa';
  var vb = tx.custBranch || bb;

  [bb, vb, tx.from, tx.to].forEach(function(b){
    if(!b) return;
    if(!DB.liveAccounts[b]) DB.liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
    if(!DB.liveVault[b]){
      DB.liveVault[b] = {};
      DENOMS.forEach(function(d){ DB.liveVault[b][d] = 0; });
    }
  });

  var amt = Number(tx.amount) || 0;
  var nIn = tx.notesIn || {};
  var nOut = tx.notesOut || {};

  switch(tx.type){

    // ═══════════════════════════════════════════════════════
    // 💸 LOAN GIVEN — শুধু মূল ঋণ bank এ যোগ হবে
    // ═══════════════════════════════════════════════════════
    case 'loan_given': {
      var onlineAmt = Number(tx.onlineAmount) || 0;

      // ⚡ Bank += main loan amount
      if(amt > 0) DB.liveAccounts[bb].bank += amt;

      // ⚡ Bank -= online (customer এর account এ গেলে)
      if(onlineAmt > 0) DB.liveAccounts[bb].bank -= onlineAmt;

      // ⚡ Vault: cash notes বাদ যাবে
      addNotes(DB.liveVault[vb], nOut, -1);
      addNotes(DB.liveVault[vb], nIn, +1);
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 📥 LOAN RECEIVED — online + cash
    // ═══════════════════════════════════════════════════════
    case 'loan_received': {
      var onl = Number(tx.onlineAmount) || 0;
      if(onl > 0) DB.liveAccounts[bb].bank += onl;

      var splits = tx.branchSplits || [];
      splits.forEach(function(sp){
        if(!sp.branch) return;
        if(!DB.liveVault[sp.branch]){
          DB.liveVault[sp.branch] = {};
          DENOMS.forEach(function(d){ DB.liveVault[sp.branch][d] = 0; });
        }
        if(sp.notesIn){
          var sAmt = sumNotes(sp.notesIn);
          if(sAmt > 0) DB.liveAccounts[bb].bank -= sAmt;
          addNotes(DB.liveVault[sp.branch], sp.notesIn, +1);
        }
      });

      if(!splits.length && nIn && Object.keys(nIn).length){
        var sAmt2 = sumNotes(nIn);
        if(sAmt2 > 0) DB.liveAccounts[bb].bank -= sAmt2;
        addNotes(DB.liveVault[vb], nIn, +1);
      }

      var cn = tx.changeNotesOut || {};
      if(Object.keys(cn).length) addNotes(DB.liveVault[bb], cn, -1);
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 💰 LOAN COLLECTION
    // ═══════════════════════════════════════════════════════
    case 'loan_collection': {
      if(tx.collectionMode === 'cash'){
        addNotes(DB.liveVault[vb], nOut, -1);
        addNotes(DB.liveVault[vb], nIn, +1);
      } else {
        DB.liveAccounts[bb].bank -= amt;
      }
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🏦 DEPOSIT — customer জমা দেয়
    // ═══════════════════════════════════════════════════════
    case 'deposit': {
      // 🏦 Mother account always decreases
      DB.liveAccounts[bb].bank -= amt;

      // 💵 Vault only updated for cash deposit
      if(tx.depositType !== 'online'){
        addNotes(DB.liveVault[vb], nIn, +1);
        addNotes(DB.liveVault[vb], nOut, -1);
      }
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 💵 WITHDRAWAL — customer টাকা তোলে
    // ═══════════════════════════════════════════════════════
    case 'withdrawal': {
      DB.liveAccounts[bb].bank += amt;
      addNotes(DB.liveVault[vb], nOut, -1);
      addNotes(DB.liveVault[vb], nIn, +1);
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🧾 EXPENSE
    // ═══════════════════════════════════════════════════════
    case 'expense': {
      addNotes(DB.liveVault[bb], nOut, -1);
      addNotes(DB.liveVault[bb], nIn, +1);
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🔁 BRANCH TRANSFER
    // ═══════════════════════════════════════════════════════
    case 'branch_transfer': {
      var from = tx.from, to = tx.to;
      if(!from || !to || from === to) break;
      var tNotes = (nOut && Object.keys(nOut).length) ? nOut : nIn;
      if(!tNotes) break;

      if(phase === 'send') addNotes(DB.liveVault[from], tNotes, -1);
      else if(phase === 'accept') addNotes(DB.liveVault[to], tNotes, +1);
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🏛️ BANK TRANSFER (mother → mother)
    // ═══════════════════════════════════════════════════════
    case 'bank_transfer': {
      var bFrom = tx.from || bb;
      var bTo = tx.to;
      if(bFrom && bTo){
        if(!DB.liveAccounts[bFrom]) DB.liveAccounts[bFrom] = { bank: 0, cash: 0, other: 0 };
        if(!DB.liveAccounts[bTo]) DB.liveAccounts[bTo] = { bank: 0, cash: 0, other: 0 };
        DB.liveAccounts[bFrom].bank -= amt;
        DB.liveAccounts[bTo].bank += amt;
      }
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🏦 OTHER BANK
    // ═══════════════════════════════════════════════════════
    case 'other_bank': {
      if(tx.dir === 'online_in') DB.liveAccounts[bb].bank += amt;
      else if(tx.dir === 'online_out') DB.liveAccounts[bb].bank -= amt;
      else if(tx.dir === 'in'){
        addNotes(DB.liveVault[vb], nIn, +1);
        addNotes(DB.liveVault[vb], nOut, -1);
      }
      else if(tx.dir === 'out'){
        addNotes(DB.liveVault[vb], nOut, -1);
        addNotes(DB.liveVault[vb], nIn, +1);
      }
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 🤝 SUPPORT
    // ═══════════════════════════════════════════════════════
    case 'support': {
      if(tx.dir === 'online_support_out') DB.liveAccounts[bb].bank -= amt;
      else if(tx.dir === 'online_support_in') DB.liveAccounts[bb].bank += amt;
      else if(tx.dir === 'out'){
        addNotes(DB.liveVault[vb], nOut, -1);
        addNotes(DB.liveVault[vb], nIn, +1);
      }
      else {
        addNotes(DB.liveVault[vb], nIn, +1);
        addNotes(DB.liveVault[vb], nOut, -1);
      }
      break;
    }

    // ═══════════════════════════════════════════════════════
    // 💱 MONEY EXCHANGE
    // ═══════════════════════════════════════════════════════
    case 'money_exchange': {
      if(tx.exchangeType === 'online'){
        // ⚡ Online Receipt → mother account +=
        DB.liveAccounts[bb].bank += amt;
      } else {
        // ⚡ Physical Exchange → vault only
        addNotes(DB.liveVault[vb], nOut, -1);
        addNotes(DB.liveVault[vb], nIn, +1);
      }
      break;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   RECOMPUTE LIVE — full replay from base
   ═══════════════════════════════════════════════════════════ */
function recomputeLive(){
  if(!DB) return;

  // Reset to base
  Object.keys(BRANCHES).forEach(function(b){
    DB.liveVault[b] = {};
    DENOMS.forEach(function(d){ DB.liveVault[b][d] = Number(DB.baseVault[b][d]) || 0; });
    DB.liveAccounts[b] = {
      bank: Number(DB.baseAccounts[b].bank) || 0,
      cash: Number(DB.baseAccounts[b].cash) || 0,
      other: Number(DB.baseAccounts[b].other) || 0
    };
  });

  // Sort txs chronologically
  var txs = (DB.txs || []).slice().sort(function(a, b){
    return (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '');
  });

  // Apply each
  txs.forEach(function(tx){
    if(!tx || tx.cancelled) return;
    if(tx.type === 'branch_transfer'){
      applyTx(tx, 'send');
      if(tx.accepted) applyTx(tx, 'accept');
    } else {
      applyTx(tx);
    }
  });

  // Sync cash from vault
  Object.keys(BRANCHES).forEach(function(b){
    var total = 0;
    DENOMS.forEach(function(d){ total += (Number(DB.liveVault[b][d]) || 0) * d; });
    DB.liveAccounts[b].cash = Math.round(total * 100) / 100;
  });
}

/* ═══════════════════════════════════════════════════════════
   DATE-SPECIFIC STATE
   ═══════════════════════════════════════════════════════════ */
function computeStateAtDate(bf, targetDate){
  var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];

  var state = {
    accounts: {},
    vault: {},
    totals: { bank: 0, cash: 0, other: 0 },
    vaultTotals: {}
  };

  branches.forEach(function(b){
    var baseAcc = DB.baseAccounts[b] || { bank: 0, cash: 0, other: 0 };
    state.accounts[b] = {
      bank: Number(baseAcc.bank) || 0,
      cash: Number(baseAcc.cash) || 0,
      other: Number(baseAcc.other) || 0
    };
    state.vault[b] = {};
    DENOMS.forEach(function(d){ state.vault[b][d] = Number(DB.baseVault[b]?.[d]) || 0; });
  });

  DENOMS.forEach(function(d){ state.vaultTotals[d] = 0; });

  var txs = (DB.txs || []).slice()
    .filter(function(t){
      if(!t || t.cancelled) return false;
      if(!targetDate) return true;
      return (t.date || '') <= targetDate;
    })
    .sort(function(a, b){
      return (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '');
    });

  function addNotesState(target, notes, sign){
    if(!notes || !target) return;
    for(var k in notes){
      var n = Number(notes[k]) || 0;
      if(!n) continue;
      target[k] = (Number(target[k]) || 0) + sign * n;
      if(target[k] < 0) target[k] = 0;
    }
  }

  txs.forEach(function(tx){
    var bb = tx.branch || 'kalaroa';
    var vb = tx.custBranch || bb;

    if(!state.accounts[bb]) state.accounts[bb] = { bank: 0, cash: 0, other: 0 };
    if(!state.vault[bb]){ state.vault[bb] = {}; DENOMS.forEach(function(d){ state.vault[bb][d] = 0; }); }
    if(!state.accounts[vb]) state.accounts[vb] = { bank: 0, cash: 0, other: 0 };
    if(!state.vault[vb]){ state.vault[vb] = {}; DENOMS.forEach(function(d){ state.vault[vb][d] = 0; }); }

    var amt = Number(tx.amount) || 0;
    var nIn = tx.notesIn || {};
    var nOut = tx.notesOut || {};

    switch(tx.type){
      case 'loan_given': {
        var lgOnline = Number(tx.onlineAmount) || 0;
        if(amt > 0) state.accounts[bb].bank += amt;
        if(lgOnline > 0) state.accounts[bb].bank -= lgOnline;
        addNotesState(state.vault[vb], nOut, -1);
        addNotesState(state.vault[vb], nIn, +1);
        break;
      }
      case 'loan_received': {
        var lrOnline = Number(tx.onlineAmount) || 0;
        if(lrOnline > 0) state.accounts[bb].bank += lrOnline;
        var sp = tx.branchSplits || [];
        sp.forEach(function(s){
          if(!s.branch) return;
          if(!state.vault[s.branch]){ state.vault[s.branch] = {}; DENOMS.forEach(function(d){ state.vault[s.branch][d] = 0; }); }
          if(s.notesIn){
            var sAmt = sumNotes(s.notesIn);
            if(sAmt > 0) state.accounts[bb].bank -= sAmt;
            addNotesState(state.vault[s.branch], s.notesIn, +1);
          }
        });
        if(!sp.length && nIn && Object.keys(nIn).length){
          var sAmt2 = sumNotes(nIn);
          if(sAmt2 > 0) state.accounts[bb].bank -= sAmt2;
          addNotesState(state.vault[vb], nIn, +1);
        }
        var cn = tx.changeNotesOut || {};
        if(Object.keys(cn).length) addNotesState(state.vault[bb], cn, -1);
        break;
      }
      case 'loan_collection': {
        if(tx.collectionMode === 'cash'){
          addNotesState(state.vault[vb], nOut, -1);
          addNotesState(state.vault[vb], nIn, +1);
        } else {
          state.accounts[bb].bank -= amt;
        }
        break;
      }
      case 'deposit': {
        state.accounts[bb].bank -= amt;
        if(tx.depositType !== 'online'){
          addNotesState(state.vault[vb], nIn, +1);
          addNotesState(state.vault[vb], nOut, -1);
        }
        break;
      }
      case 'withdrawal': {
        state.accounts[bb].bank += amt;
        addNotesState(state.vault[vb], nOut, -1);
        addNotesState(state.vault[vb], nIn, +1);
        break;
      }
      case 'expense': {
        addNotesState(state.vault[bb], nOut, -1);
        addNotesState(state.vault[bb], nIn, +1);
        break;
      }
      case 'branch_transfer': {
        var from = tx.from, to = tx.to;
        if(!from || !to || from === to) break;
        var tNotes = (nOut && Object.keys(nOut).length) ? nOut : nIn;
        if(!tNotes) break;
        if(!state.vault[from]){ state.vault[from] = {}; DENOMS.forEach(function(d){ state.vault[from][d] = 0; }); }
        addNotesState(state.vault[from], tNotes, -1);
        if(tx.accepted){
          if(!state.vault[to]){ state.vault[to] = {}; DENOMS.forEach(function(d){ state.vault[to][d] = 0; }); }
          addNotesState(state.vault[to], tNotes, +1);
        }
        break;
      }
      case 'bank_transfer': {
        var bFrom = tx.from || bb;
        var bTo = tx.to;
        if(bFrom && bTo){
          if(!state.accounts[bFrom]) state.accounts[bFrom] = { bank: 0, cash: 0, other: 0 };
          if(!state.accounts[bTo]) state.accounts[bTo] = { bank: 0, cash: 0, other: 0 };
          state.accounts[bFrom].bank -= amt;
          state.accounts[bTo].bank += amt;
        }
        break;
      }
      case 'other_bank': {
        if(tx.dir === 'online_in') state.accounts[bb].bank += amt;
        else if(tx.dir === 'online_out') state.accounts[bb].bank -= amt;
        else if(tx.dir === 'in'){
          addNotesState(state.vault[vb], nIn, +1);
          addNotesState(state.vault[vb], nOut, -1);
        }
        else if(tx.dir === 'out'){
          addNotesState(state.vault[vb], nOut, -1);
          addNotesState(state.vault[vb], nIn, +1);
        }
        break;
      }
      case 'support': {
        if(tx.dir === 'online_support_out') state.accounts[bb].bank -= amt;
        else if(tx.dir === 'online_support_in') state.accounts[bb].bank += amt;
        else if(tx.dir === 'out'){
          addNotesState(state.vault[vb], nOut, -1);
          addNotesState(state.vault[vb], nIn, +1);
        }
        else {
          addNotesState(state.vault[vb], nIn, +1);
          addNotesState(state.vault[vb], nOut, -1);
        }
        break;
      }
      case 'money_exchange': {
        if(tx.exchangeType === 'online'){
          state.accounts[bb].bank += amt;
        } else {
          addNotesState(state.vault[vb], nOut, -1);
          addNotesState(state.vault[vb], nIn, +1);
        }
        break;
      }
    }
  });

  // Sync cash from vault
  Object.keys(state.accounts).forEach(function(br){
    var total = 0;
    DENOMS.forEach(function(d){ total += (Number(state.vault[br]?.[d]) || 0) * d; });
    state.accounts[br].cash = Math.round(total * 100) / 100;
  });

  // Totals
  Object.keys(state.accounts).forEach(function(br){
    var acc = state.accounts[br];
    state.totals.bank += acc.bank;
    state.totals.cash += acc.cash;
    state.totals.other += acc.other;
    DENOMS.forEach(function(d){
      state.vaultTotals[d] += (Number(state.vault[br]?.[d]) || 0);
    });
  });

  // Safety — negative → 0
  Object.keys(state.accounts).forEach(function(br){
    var a = state.accounts[br];
    if(a.bank < 0) a.bank = 0;
    if(a.cash < 0) a.cash = 0;
    if(a.other < 0) a.other = 0;
  });
  Object.keys(state.vault).forEach(function(br){
    for(var d in state.vault[br]){
      if(Number(state.vault[br][d]) < 0) state.vault[br][d] = 0;
    }
  });
  for(var d in state.vaultTotals){
    if(state.vaultTotals[d] < 0) state.vaultTotals[d] = 0;
  }
  if(state.totals.bank < 0) state.totals.bank = 0;
  if(state.totals.cash < 0) state.totals.cash = 0;
  if(state.totals.other < 0) state.totals.other = 0;

  return state;
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function currentBranch(){
  if(!SESSION) return 'all';
  if(SESSION.role === 'admin') return VIEW_BRANCH || 'all';
  return SESSION.branch || 'kalaroa';
}

function calcStats(bf, date){
  var r = {
    loan_given: { amt: 0, cnt: 0 },
    loan_received: { amt: 0, cnt: 0 },
    deposit: { amt: 0, cnt: 0 },
    withdrawal: { amt: 0, cnt: 0 },
    expense: { amt: 0, cnt: 0 },
    transfer: { in: 0, out: 0, cnt: 0 },
    bank_transfer: { in: 0, out: 0, cnt: 0 },
    other: { in: 0, out: 0, onlineIn: 0, onlineOut: 0 },
    support: { in: 0, out: 0, cnt: 0 },
    money_exchange: { in: 0, out: 0, online: 0, cnt: 0 }
  };

  var isAll = bf === 'all';

  (DB.txs || []).forEach(function(t){
    if(!t || t.cancelled) return;
    if(!isAll && t.branch !== bf && t.type !== 'branch_transfer') return;
    if(t.type === 'branch_transfer' && !isAll && t.from !== bf && t.to !== bf) return;
    if(date && t.date !== date) return;

    var amt = Number(t.amount) || 0;

    switch(t.type){
      case 'loan_given':
        r.loan_given.amt += amt;
        r.loan_given.cnt++;
        break;
      case 'loan_received': r.loan_received.amt += amt; r.loan_received.cnt++; break;
      case 'deposit': r.deposit.amt += amt; r.deposit.cnt++; break;
      case 'withdrawal': r.withdrawal.amt += amt; r.withdrawal.cnt++; break;
      case 'expense': r.expense.amt += amt; r.expense.cnt++; break;
      case 'branch_transfer':
        if(t.accepted){ r.transfer.in += amt; r.transfer.out += amt; }
        else r.transfer.out += amt;
        r.transfer.cnt++;
        break;
      case 'bank_transfer':
        if(t.dir === 'in') r.bank_transfer.in += amt;
        else r.bank_transfer.out += amt;
        break;
      case 'other_bank':
        if(t.dir === 'in') r.other.in += amt;
        else if(t.dir === 'online_in') r.other.onlineIn += amt;
        else if(t.dir === 'out') r.other.out += amt;
        else if(t.dir === 'online_out') r.other.onlineOut += amt;
        break;
      case 'support':
        if(t.dir === 'out' || t.dir === 'online_support_out') r.support.out += amt;
        else r.support.in += amt;
        r.support.cnt++;
        break;

      case 'money_exchange':
        if(t.exchangeType === 'online'){
          r.money_exchange.online += amt;   // ⚡ Online receipt
        } else {
          r.money_exchange.out += Number(t.notesOutSum) || 0;
          r.money_exchange.in += Number(t.notesInSum) || 0;
        }
        r.money_exchange.cnt++;
        break;
    }
  });

  return r;
}

function getBalances(bf){
  var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  var r = { bank: 0, cash: 0, other: 0 };
  branches.forEach(function(b){
    var la = DB.liveAccounts[b] || {};
    r.bank += Number(la.bank) || 0;
    r.cash += Number(la.cash) || 0;
    r.other += Number(la.other) || 0;
  });
  return r;
}

function getVault(bf){
  var branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  var t = {};
  DENOMS.forEach(function(d){ t[d] = 0; });
  branches.forEach(function(b){
    DENOMS.forEach(function(d){ t[d] += Number(DB.liveVault[b]?.[d]) || 0; });
  });
  return t;
}

console.log('✅ Engine loaded — v3.0 (loan + withdrawal separate)');