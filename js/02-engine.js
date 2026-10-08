/* ============================================================
   FILE: js/02-engine.js
   PURPOSE: Transaction Engine + Stats
   ============================================================ */
'use strict';

function sumNotes(notes){
  if(!notes) return 0;
  let s = 0;
  for(const k in notes) s += Number(k) * (Number(notes[k]) || 0);
  return Math.round(s * 100) / 100;
}

function addNotes(target, notes, sign){
  if(!notes || !target) return;
  for(const k in notes){
    const n = Number(notes[k]) || 0;
    if(!n) continue;
    target[k] = (Number(target[k]) || 0) + sign * n;
  }
}

function applyTx(tx, phase){
  if(!tx || tx.cancelled) return;
  const bb = tx.branch || 'kalaroa';
  const vb = tx.custBranch || bb;

  [bb, vb, tx.from, tx.to].forEach(b => {
    if(!b) return;
    if(!DB.liveAccounts[b]) DB.liveAccounts[b] = { bank: 0, cash: 0, other: 0 };
    if(!DB.liveVault[b]){ DB.liveVault[b] = {}; DENOMS.forEach(d => DB.liveVault[b][d] = 0); }
  });

  const amt = Number(tx.amount) || 0;
  const nIn = tx.notesIn || {};
  const nOut = tx.notesOut || {};

  switch(tx.type){
    case 'loan_given': {
      const notTaken = Number(tx.cashNotTakenAmount) || 0;
      if(notTaken > 0) DB.liveAccounts[bb].bank += notTaken;
      addNotes(DB.liveVault[vb], nOut, -1);
      addNotes(DB.liveVault[vb], nIn, +1);
      break;
    }
    case 'loan_received': {
      const onl = Number(tx.onlineAmount) || 0;
      if(onl > 0) DB.liveAccounts[bb].bank += onl;
      const splits = tx.branchSplits || [];
      splits.forEach(sp => {
        if(!sp.branch) return;
        if(!DB.liveVault[sp.branch]){ DB.liveVault[sp.branch] = {}; DENOMS.forEach(d => DB.liveVault[sp.branch][d] = 0); }
        if(sp.notesIn){
          const sAmt = sumNotes(sp.notesIn);
          if(sAmt > 0) DB.liveAccounts[bb].bank -= sAmt;
          addNotes(DB.liveVault[sp.branch], sp.notesIn, +1);
        }
      });
      if(!splits.length && nIn && Object.keys(nIn).length){
        const sAmt = sumNotes(nIn);
        if(sAmt > 0) DB.liveAccounts[bb].bank -= sAmt;
        addNotes(DB.liveVault[vb], nIn, +1);
      }
      const cn = tx.changeNotesOut || {};
      if(Object.keys(cn).length) addNotes(DB.liveVault[bb], cn, -1);
      break;
    }
    case 'loan_collection': {
      if(tx.collectionMode === 'cash'){
        addNotes(DB.liveVault[vb], nOut, -1);
        addNotes(DB.liveVault[vb], nIn, +1);
      } else {
        DB.liveAccounts[bb].bank -= amt;
      }
      break;
    }
    case 'deposit': {
      DB.liveAccounts[bb].bank -= amt;
      addNotes(DB.liveVault[vb], nIn, +1);
      addNotes(DB.liveVault[vb], nOut, -1);
      break;
    }
    case 'withdrawal': {
      DB.liveAccounts[bb].bank += amt;
      addNotes(DB.liveVault[vb], nOut, -1);
      addNotes(DB.liveVault[vb], nIn, +1);
      break;
    }
    case 'expense': {
      addNotes(DB.liveVault[bb], nOut, -1);
      addNotes(DB.liveVault[bb], nIn, +1);
      break;
    }
    case 'branch_transfer': {
      const from = tx.from, to = tx.to;
      if(!from || !to || from === to) break;
      const tNotes = (nOut && Object.keys(nOut).length) ? nOut : nIn;
      if(!tNotes) break;
      if(phase === 'send') addNotes(DB.liveVault[from], tNotes, -1);
      else if(phase === 'accept') addNotes(DB.liveVault[to], tNotes, +1);
      break;
    }
    case 'bank_transfer': {
      const from = tx.from || bb, to = tx.to;
      if(from && to){
        if(!DB.liveAccounts[from]) DB.liveAccounts[from] = { bank: 0, cash: 0, other: 0 };
        if(!DB.liveAccounts[to]) DB.liveAccounts[to] = { bank: 0, cash: 0, other: 0 };
        DB.liveAccounts[from].bank -= amt;
        DB.liveAccounts[to].bank += amt;
      }
      break;
    }
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
    case 'money_exchange': {
      addNotes(DB.liveVault[vb], nOut, -1);
      addNotes(DB.liveVault[vb], nIn, +1);
      break;
    }
  }
}

function recomputeLive(){
  if(!DB) return;
  Object.keys(BRANCHES).forEach(b => {
    DB.liveVault[b] = {};
    DENOMS.forEach(d => DB.liveVault[b][d] = Number(DB.baseVault[b][d]) || 0);
    DB.liveAccounts[b] = {
      bank: Number(DB.baseAccounts[b].bank) || 0,
      cash: Number(DB.baseAccounts[b].cash) || 0,
      other: Number(DB.baseAccounts[b].other) || 0
    };
  });

  const txs = (DB.txs || []).slice().sort((a, b) =>
    (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '')
  );

  txs.forEach(tx => {
    if(!tx || tx.cancelled) return;
    if(tx.type === 'branch_transfer'){
      applyTx(tx, 'send');
      if(tx.accepted) applyTx(tx, 'accept');
    } else {
      applyTx(tx);
    }
  });

  Object.keys(BRANCHES).forEach(b => {
    let total = 0;
    DENOMS.forEach(d => total += (Number(DB.liveVault[b][d]) || 0) * d);
    DB.liveAccounts[b].cash = Math.round(total * 100) / 100;
  });
}

function currentBranch(){
  if(!SESSION) return 'all';
  if(SESSION.role === 'admin') return VIEW_BRANCH || 'all';
  return SESSION.branch || 'kalaroa';
}

function calcStats(bf, date){
  const r = {
    loan_given: { amt: 0, cnt: 0 }, loan_received: { amt: 0, cnt: 0 },
    deposit: { amt: 0, cnt: 0 }, withdrawal: { amt: 0, cnt: 0 },
    expense: { amt: 0, cnt: 0 }, transfer: { in: 0, out: 0, cnt: 0 },
    bank_transfer: { in: 0, out: 0, cnt: 0 },
    other: { in: 0, out: 0, onlineIn: 0, onlineOut: 0 },
    support: { in: 0, out: 0, cnt: 0 },
    money_exchange: { in: 0, out: 0, cnt: 0 }
  };
  const isAll = bf === 'all';
  (DB.txs || []).forEach(t => {
    if(!t || t.cancelled) return;
    if(!isAll && t.branch !== bf && t.type !== 'branch_transfer') return;
    if(t.type === 'branch_transfer' && !isAll && t.from !== bf && t.to !== bf) return;
    if(date && t.date !== date) return;
    const amt = Number(t.amount) || 0;
    switch(t.type){
      case 'loan_given': r.loan_given.amt += amt; r.loan_given.cnt++; break;
      case 'loan_received': r.loan_received.amt += amt; r.loan_received.cnt++; break;
      case 'deposit': r.deposit.amt += amt; r.deposit.cnt++; break;
      case 'withdrawal': r.withdrawal.amt += amt; r.withdrawal.cnt++; break;
      case 'expense': r.expense.amt += amt; r.expense.cnt++; break;
      case 'branch_transfer':
        if(t.accepted){ r.transfer.in += amt; r.transfer.out += amt; }
        else r.transfer.out += amt;
        r.transfer.cnt++; break;
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
        r.support.cnt++; break;
      case 'money_exchange':
        r.money_exchange.out += Number(t.notesOutSum) || 0;
        r.money_exchange.in += Number(t.notesInSum) || 0;
        r.money_exchange.cnt++; break;
    }
  });
  return r;
}

function getBalances(bf){
  const branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  const r = { bank: 0, cash: 0, other: 0 };
  branches.forEach(b => {
    const la = DB.liveAccounts[b] || {};
    r.bank += Number(la.bank) || 0;
    r.cash += Number(la.cash) || 0;
    r.other += Number(la.other) || 0;
  });
  return r;
}

function getVault(bf){
  const branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  const t = {};
  DENOMS.forEach(d => t[d] = 0);
  branches.forEach(b => {
    DENOMS.forEach(d => t[d] += Number(DB.liveVault[b]?.[d]) || 0);
  });
  return t;
}


/* ═══════════════════════════════════════════════════════════
   📅 Date-specific State Calculation
   Base + সব tx যেগুলো এই date এর মধ্যে হয়েছে
   ═══════════════════════════════════════════════════════════ */
function computeStateAtDate(bf, targetDate){
  const branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];

  const state = {
    accounts: {},
    vault: {},
    totals: { bank: 0, cash: 0, other: 0 },
    vaultTotals: {}
  };

  // Initialize per branch
  branches.forEach(b => {
    const baseAcc = DB.baseAccounts[b] || { bank: 0, cash: 0, other: 0 };
    state.accounts[b] = {
      bank: Number(baseAcc.bank) || 0,
      cash: Number(baseAcc.cash) || 0,
      other: Number(baseAcc.other) || 0
    };
    state.vault[b] = {};
    DENOMS.forEach(d => state.vault[b][d] = Number(DB.baseVault[b]?.[d]) || 0);
  });

  DENOMS.forEach(d => state.vaultTotals[d] = 0);

  // সব tx (target date পর্যন্ত) sort করো
  const txs = (DB.txs || []).slice()
    .filter(t => {
      if(!t || t.cancelled) return false;
      if(!targetDate) return true;
      return (t.date || '') <= targetDate;
    })
    .sort((a, b) =>
      (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '')
    );

  // Helpers
  function addNotes(target, notes, sign){
    if(!notes || !target) return;
    for(var k in notes){
      var n = Number(notes[k]) || 0;
      if(!n) continue;
      target[k] = (Number(target[k]) || 0) + sign * n;
      if(target[k] < 0) target[k] = 0;
    }
  }

  function sumNotes(notes){
    if(!notes) return 0;
    var s = 0;
    for(var k in notes) s += Number(k) * (Number(notes[k]) || 0);
    return Math.round(s * 100) / 100;
  }

  // প্রতিটা tx apply করো
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
        var notTaken = Number(tx.cashNotTakenAmount) || 0;
        if(notTaken > 0) state.accounts[bb].bank += notTaken;
        addNotes(state.vault[vb], nOut, -1);
        addNotes(state.vault[vb], nIn, +1);
        break;
      }
      case 'loan_received': {
        var onl = Number(tx.onlineAmount) || 0;
        if(onl > 0) state.accounts[bb].bank += onl;
        var splits = tx.branchSplits || [];
        splits.forEach(function(sp){
          if(!sp.branch) return;
          if(!state.vault[sp.branch]){
            state.vault[sp.branch] = {};
            DENOMS.forEach(function(d){ state.vault[sp.branch][d] = 0; });
          }
          if(sp.notesIn){
            var sAmt = sumNotes(sp.notesIn);
            if(sAmt > 0) state.accounts[bb].bank -= sAmt;
            addNotes(state.vault[sp.branch], sp.notesIn, +1);
          }
        });
        if(!splits.length && nIn && Object.keys(nIn).length){
          var sAmt2 = sumNotes(nIn);
          if(sAmt2 > 0) state.accounts[bb].bank -= sAmt2;
          addNotes(state.vault[vb], nIn, +1);
        }
        var cn = tx.changeNotesOut || {};
        if(Object.keys(cn).length) addNotes(state.vault[bb], cn, -1);
        break;
      }
      case 'loan_collection': {
        if(tx.collectionMode === 'cash'){
          addNotes(state.vault[vb], nOut, -1);
          addNotes(state.vault[vb], nIn, +1);
        } else {
          state.accounts[bb].bank -= amt;
        }
        break;
      }
      case 'deposit': {
        state.accounts[bb].bank -= amt;
        addNotes(state.vault[vb], nIn, +1);
        addNotes(state.vault[vb], nOut, -1);
        break;
      }
      case 'withdrawal': {
        state.accounts[bb].bank += amt;
        addNotes(state.vault[vb], nOut, -1);
        addNotes(state.vault[vb], nIn, +1);
        break;
      }
      case 'expense': {
        addNotes(state.vault[bb], nOut, -1);
        addNotes(state.vault[bb], nIn, +1);
        break;
      }
      case 'branch_transfer': {
        var from = tx.from, to = tx.to;
        if(!from || !to || from === to) break;
        var tNotes = (nOut && Object.keys(nOut).length) ? nOut : nIn;
        if(!tNotes) break;
        if(!state.vault[from]){ state.vault[from] = {}; DENOMS.forEach(function(d){ state.vault[from][d] = 0; }); }
        addNotes(state.vault[from], tNotes, -1);
        if(tx.accepted){
          if(!state.vault[to]){ state.vault[to] = {}; DENOMS.forEach(function(d){ state.vault[to][d] = 0; }); }
          addNotes(state.vault[to], tNotes, +1);
        }
        break;
      }
      case 'bank_transfer': {
        var bf2 = tx.from || bb;
        var bt = tx.to;
        if(bf2 && bt){
          if(!state.accounts[bf2]) state.accounts[bf2] = { bank: 0, cash: 0, other: 0 };
          if(!state.accounts[bt]) state.accounts[bt] = { bank: 0, cash: 0, other: 0 };
          state.accounts[bf2].bank -= amt;
          state.accounts[bt].bank += amt;
        }
        break;
      }
      case 'other_bank': {
        if(tx.dir === 'online_in') state.accounts[bb].bank += amt;
        else if(tx.dir === 'online_out') state.accounts[bb].bank -= amt;
        else if(tx.dir === 'in'){
          addNotes(state.vault[vb], nIn, +1);
          addNotes(state.vault[vb], nOut, -1);
        }
        else if(tx.dir === 'out'){
          addNotes(state.vault[vb], nOut, -1);
          addNotes(state.vault[vb], nIn, +1);
        }
        break;
      }
      case 'support': {
        if(tx.dir === 'online_support_out') state.accounts[bb].bank -= amt;
        else if(tx.dir === 'online_support_in') state.accounts[bb].bank += amt;
        else if(tx.dir === 'out'){
          addNotes(state.vault[vb], nOut, -1);
          addNotes(state.vault[vb], nIn, +1);
        }
        else {
          addNotes(state.vault[vb], nIn, +1);
          addNotes(state.vault[vb], nOut, -1);
        }
        break;
      }
      case 'money_exchange': {
        addNotes(state.vault[vb], nOut, -1);
        addNotes(state.vault[vb], nIn, +1);
        break;
      }
    }
  });

  // Cash from vault recalculate
  Object.keys(state.accounts).forEach(function(br){
    var total = 0;
    DENOMS.forEach(function(d){
      total += (Number(state.vault[br]?.[d]) || 0) * d;
    });
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

  return state;
}

console.log('✅ Date-specific state calculator loaded');