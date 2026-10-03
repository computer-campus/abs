/* ============================================================
   FILE: 11-db-engine.js
   PURPOSE: Transaction engine — v11.7 (Complete Fix)
   VERSION: v11.7
   ============================================================ */

'use strict';

/* ───── DAILY ROLLOVER ───── */
function performDailyRollover(force){
  const today = todayStr();
  if(!force && DB().__lastRolloverDate === today) return false;
  
  if(!DB().yearlyArchive) DB().yearlyArchive = {};
  
  (DB().txs || []).forEach(t => {
    if(!t.year && t.date) t.year = t.date.slice(0, 4);
  });
  
  const currentYear = new Date().getFullYear();
  const keep = [];
  
  (DB().txs || []).forEach(t => {
    const ty = parseInt((t.date || '').slice(0, 4), 10);
    if(!isNaN(ty) && (currentYear - ty) >= ARCHIVE_YEARS_AFTER){
      const y = String(ty);
      if(!DB().yearlyArchive[y]) DB().yearlyArchive[y] = [];
      DB().yearlyArchive[y].push(t);
    } else {
      keep.push(t);
    }
  });
  
  DB().txs = keep;
  DB().lastBaseDate = today;
  DB().__lastRolloverDate = today;
  DB().__lastUpdate = new Date().toISOString();
  return true;
}

/* ───── ADJUST NOTES ───── */
function adjustNotes(target, notes, sign){
  if(!notes || !target) return;
  for(const k in notes){
    target[k] = (target[k] || 0) + sign * (Number(notes[k]) || 0);
    if(target[k] < 0) target[k] = 0;
  }
}

/* ───── SUM NOTES ───── */
function sumNotesValue(notes){
  if(!notes) return 0;
  let total = 0;
  for(const k in notes){
    total += Number(k) * Number(notes[k] || 0);
  }
  return total;
}

/* ───── APPLY TX TO LIVE ───── */
function applyTxToLive(tx, phase){
  const d = DB();
  const bb = tx.branch || 'kalaroa';
  const vb = tx.custBranch || tx.branch || 'kalaroa';
  
  const ensure = br => {
    if(!br) return;
    if(!d.liveAccounts[br]) d.liveAccounts[br] = { bank: 0, cash: 0, other: 0 };
    if(!d.liveVault[br]) d.liveVault[br] = {};
    DENOMS.forEach(x => {
      if(typeof d.liveVault[br][x] !== 'number') d.liveVault[br][x] = 0;
    });
  };
  
  ensure(bb);
  ensure(vb);
  
  const amt = Number(tx.amount) || 0;
  const nIn = tx.notesIn || {};
  const nOut = tx.notesOut || {};
  
  switch(tx.type){
    
    // ═══════════════════════════════════════════════════════════
    // 💸 LOAN GIVEN
    // ═══════════════════════════════════════════════════════════
    case 'loan_given': {
      const A = Number(tx.amount) || 0;
      const B = Number(tx.onlineAmount) || 0;
      const C = Number(tx.cashAmount) || 0;
      const D = Number(tx.cashNotTakenAmount) || Math.max(0, A - B - C);
      
      d.liveAccounts[bb].bank += D;
      adjustNotes(d.liveVault[vb], nOut, -1);
      adjustNotes(d.liveVault[vb], nIn, +1);
      break;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 📥 LOAN RECEIVED — v11.7 COMPLETE FIX
    // ═══════════════════════════════════════════════════════════
    case 'loan_received': {
      const withdrawal = Number(tx.withdrawalAmount) || 0;
      const loanKisti = Number(tx.loanKistiAmount) || 0;
      const onlineAmt = Number(tx.onlineAmount) || 0;
      
      // ═══════════════════════════════════════════════════════════
      // 🏦 BANK: Uttolon brings money IN
      // ═══════════════════════════════════════════════════════════
      if(withdrawal > 0){
        d.liveAccounts[bb].bank += withdrawal;
        console.log('🏦 Bank +' + withdrawal + ' (uttolon)');
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🏦 BANK: Loan kisti (bank transfer) reduces bank
      // ═══════════════════════════════════════════════════════════
      if(loanKisti > 0){
        d.liveAccounts[bb].bank -= loanKisti;
        console.log('🏦 Bank −' + loanKisti + ' (loan kisti via bank)');
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🏦 BANK: Online kisti reduces bank
      // ═══════════════════════════════════════════════════════════
      if(onlineAmt > 0){
        d.liveAccounts[bb].bank -= onlineAmt;
        console.log('🏦 Bank −' + onlineAmt + ' (online kisti)');
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🗄️ VAULT + BANK: Cash kisti (bank→vault) & Net Cash (vault−)
      // ═══════════════════════════════════════════════════════════
      let splitsProcessed = false;
      
      if(tx.branchSplits && Array.isArray(tx.branchSplits) && tx.branchSplits.length > 0){
        splitsProcessed = true;
        
        tx.branchSplits.forEach(split => {
          if(!split.branch) return;
          ensure(split.branch);
          
          const splitType = split.type || 'kisti';
          
          // ─── Cash kisti: bank −amount, vault +notes ───
          if(splitType === 'kisti' && split.notesIn){
            const kistiAmt = sumNotesValue(split.notesIn);
            if(kistiAmt > 0){
              d.liveAccounts[bb].bank -= kistiAmt;
              console.log('🏦 Bank −' + kistiAmt + ' (cash kisti to ' + split.branch + ')');
              adjustNotes(d.liveVault[split.branch], split.notesIn, +1);
              console.log('🗄️ Vault ' + split.branch + ' +cash kisti notes');
            }
          }
          
          // ─── Net cash: vault −notes only ───
          else if(splitType === 'netCash' && split.notesOut){
            adjustNotes(d.liveVault[split.branch], split.notesOut, -1);
            console.log('🗄️ Vault ' + split.branch + ' −net cash notes');
          }
          
          // ─── Change: vault −notes only ───
          else if(splitType === 'change' && split.notesOut){
            adjustNotes(d.liveVault[split.branch], split.notesOut, -1);
            console.log('🗄️ Vault ' + split.branch + ' −change notes');
          }
        });
      }
      
      // ═══════════════════════════════════════════════════════════
      // FALLBACK: Old format (no branchSplits)
      // ═══════════════════════════════════════════════════════════
      if(!splitsProcessed){
        // notesIn → kisti (bank −, vault +)
        if(nIn && Object.keys(nIn).length > 0){
          const kistiAmt = sumNotesValue(nIn);
          if(kistiAmt > 0){
            d.liveAccounts[bb].bank -= kistiAmt;
            console.log('🏦 Bank −' + kistiAmt + ' (fallback kisti)');
            adjustNotes(d.liveVault[vb], nIn, +1);
            console.log('🗄️ Vault ' + vb + ' +kisti notes');
          }
        }
        
        // notesOut → net cash (vault −)
        if(nOut && Object.keys(nOut).length > 0){
          adjustNotes(d.liveVault[bb], nOut, -1);
          console.log('🗄️ Vault ' + bb + ' −net cash notes (fallback)');
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // CHANGE: Always process if separate (not in branchSplits)
      // ═══════════════════════════════════════════════════════════
      const changeNotes = tx.changeNotesOut || {};
      if(Object.keys(changeNotes).length > 0){
        let alreadyInSplits = false;
        if(tx.branchSplits){
          tx.branchSplits.forEach(s => {
            if(s.type === 'change' && s.notesOut) alreadyInSplits = true;
          });
        }
        if(!alreadyInSplits){
          adjustNotes(d.liveVault[bb], changeNotes, -1);
          console.log('🗄️ Vault ' + bb + ' −change notes (separate field)');
        }
      }
      
      break;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 💵 WITHDRAWAL
    // ═══════════════════════════════════════════════════════════
    case 'withdrawal': {
      const custAcctAmt = Number(tx.customerAccountAmount) || 0;
      const cashAmt = Number(tx.cashAmount) || 0;
      const totalW = custAcctAmt + cashAmt;
      
      d.liveAccounts[bb].bank += totalW;
      adjustNotes(d.liveVault[vb], nOut, -1);
      adjustNotes(d.liveVault[vb], nIn, +1);
      break;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 💰 LOAN COLLECTION
    // ═══════════════════════════════════════════════════════════
    case 'loan_collection':
      if(tx.collectionMode === 'cash'){
        adjustNotes(d.liveVault[vb], nOut, -1);
        adjustNotes(d.liveVault[vb], nIn, +1);
      } else {
        d.liveAccounts[bb].bank -= amt;
      }
      break;
    
    // ═══════════════════════════════════════════════════════════
    // 🏦 DEPOSIT
    // ═══════════════════════════════════════════════════════════
    case 'deposit':
      d.liveAccounts[bb].bank -= amt;
      adjustNotes(d.liveVault[vb], nIn, +1);
      adjustNotes(d.liveVault[vb], nOut, -1);
      break;
    
    // ═══════════════════════════════════════════════════════════
    // 🧾 EXPENSE
    // ═══════════════════════════════════════════════════════════
    case 'expense':
      adjustNotes(d.liveVault[bb], nOut, -1);
      adjustNotes(d.liveVault[bb], nIn, +1);
      break;
    
    // ═══════════════════════════════════════════════════════════
    // 🔁 BRANCH TRANSFER
    // ═══════════════════════════════════════════════════════════
    case 'branch_transfer': {
      const from = tx.from;
      const to = tx.to;
      if(!from || !to || from === to) break;
      
      ensure(from);
      ensure(to);
      
      const transferNotes = (nOut && Object.keys(nOut).length > 0) ? nOut : nIn;
      if(!transferNotes || !Object.keys(transferNotes).length) break;
      
      if(phase === 'send'){
        adjustNotes(d.liveVault[from], transferNotes, -1);
      } else if(phase === 'accept'){
        adjustNotes(d.liveVault[to], transferNotes, +1);
      }
      break;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🏛️ BANK TRANSFER
    // ═══════════════════════════════════════════════════════════
    case 'bank_transfer': {
      const from = tx.from || tx.branch;
      const to = tx.to;
      
      if(from && to){
        ensure(from);
        ensure(to);
        
        if(!tx.cancelled){
          d.liveAccounts[from].bank -= amt;
          d.liveAccounts[to].bank += amt;
        }
      } else {
        if(tx.dir === 'in') d.liveAccounts[bb].bank += amt;
        else if(tx.dir === 'out') d.liveAccounts[bb].bank -= amt;
      }
      break;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🏦 OTHER BANK
    // ═══════════════════════════════════════════════════════════
    case 'other_bank':
      if(tx.dir === 'online_in') d.liveAccounts[bb].bank += amt;
      else if(tx.dir === 'online_out') d.liveAccounts[bb].bank -= amt;
      else if(tx.dir === 'in'){
        d.liveAccounts[bb].bank += amt;
        adjustNotes(d.liveVault[vb], nIn, +1);
        adjustNotes(d.liveVault[vb], nOut, -1);
      } else {
        d.liveAccounts[bb].bank -= amt;
        adjustNotes(d.liveVault[vb], nOut, -1);
        adjustNotes(d.liveVault[vb], nIn, +1);
      }
      break;
    
    // ═══════════════════════════════════════════════════════════
    // 🤝 SUPPORT
    // ═══════════════════════════════════════════════════════════
    case 'support':
      if(tx.dir === 'online_support_out') d.liveAccounts[bb].bank -= amt;
      else if(tx.dir === 'online_support_in') d.liveAccounts[bb].bank += amt;
      else if(tx.dir === 'out'){
        adjustNotes(d.liveVault[vb], nOut, -1);
        adjustNotes(d.liveVault[vb], nIn, +1);
      } else {
        adjustNotes(d.liveVault[vb], nIn, +1);
        adjustNotes(d.liveVault[vb], nOut, -1);
      }
      break;
    
    // ═══════════════════════════════════════════════════════════
    // 💱 MONEY EXCHANGE
    // ═══════════════════════════════════════════════════════════
    case 'money_exchange':
      adjustNotes(d.liveVault[vb], nOut, -1);
      adjustNotes(d.liveVault[vb], nIn, +1);
      break;
  }
}

/* ───── SYNC CASH FROM VAULT ───── */
function syncLiveCashFromVault(){
  const d = DB();
  Object.keys(BRANCHES).forEach(br => {
    let total = 0;
    DENOMS.forEach(x => total += (Number(d.liveVault[br][x]) || 0) * x);
    d.liveAccounts[br].cash = Math.round(total * 100) / 100;
  });
}

/* ───── RECOMPUTE LIVE (FULL) ───── */
function recomputeLive(){
  const d = DB();
  
  // Reset from base
  Object.keys(BRANCHES).forEach(b => {
    d.liveVault[b] = {};
    DENOMS.forEach(x => d.liveVault[b][x] = Number(d.baseVault[b][x]) || 0);
    
    d.liveAccounts[b] = {
      bank: Number(d.baseAccounts[b].bank) || 0,
      cash: Number(d.baseAccounts[b].cash) || 0,
      other: Number(d.baseAccounts[b].other) || 0
    };
  });
  
  // Invalidate caches
  if(typeof __invalidateCaches === 'function'){
    __invalidateCaches();
  }
  
  // Get sorted txs
  const allTxs = (typeof getAllTxs === 'function') ? getAllTxs() : (d.txs || []);
  const sorted = allTxs.slice().sort((a, b) =>
    (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '')
  );
  
  console.log('🔄 Recomputing ' + sorted.length + ' transactions...');
  
  // Apply each
  sorted.forEach(tx => {
    if(!tx || tx.cancelled) return;
    
    if(tx.type === 'branch_transfer'){
      applyTxToLive(tx, 'send');
      if(tx.accepted && !tx.cancelled) applyTxToLive(tx, 'accept');
    }
    else if(tx.type === 'bank_transfer' && tx.from && tx.to){
      if(!tx.cancelled) applyTxToLive(tx, 'accept');
    }
    else {
      applyTxToLive(tx);
    }
  });
  
  syncLiveCashFromVault();
  
  console.log('✅ Done. Kalaroa Bank: ' + d.liveAccounts.kalaroa.bank + ', Jhaudanga Bank: ' + d.liveAccounts.jhaudanga.bank);
}

/* ───── RECOMPUTE LIVE INCREMENTAL ───── */
function recomputeLiveIncremental(newTx){
  if(!newTx || newTx.cancelled) return;
  
  const d = DB();
  const bb = newTx.branch || 'kalaroa';
  const vb = newTx.custBranch || newTx.branch || 'kalaroa';
  
  const ensure = br => {
    if(!br) return;
    if(!d.liveAccounts[br]) d.liveAccounts[br] = { bank: 0, cash: 0, other: 0 };
    if(!d.liveVault[br]) d.liveVault[br] = {};
    DENOMS.forEach(x => {
      if(typeof d.liveVault[br][x] !== 'number') d.liveVault[br][x] = 0;
    });
  };
  
  ensure(bb);
  ensure(vb);
  if(newTx.type === 'branch_transfer'){ ensure(newTx.from); ensure(newTx.to); }
  if(newTx.type === 'bank_transfer' && newTx.from && newTx.to){ ensure(newTx.from); ensure(newTx.to); }
  if(newTx.branchSplits && Array.isArray(newTx.branchSplits)){
    newTx.branchSplits.forEach(s => ensure(s.branch));
  }
  
  try{
    if(newTx.type === 'branch_transfer'){
      applyTxToLive(newTx, 'send');
      if(newTx.accepted) applyTxToLive(newTx, 'accept');
    }
    else if(newTx.type === 'bank_transfer' && newTx.from && newTx.to){
      if(!newTx.cancelled) applyTxToLive(newTx, 'accept');
    }
    else {
      applyTxToLive(newTx);
    }
    syncLiveCashFromVault();
  } catch(e){
    console.error('Incremental apply failed:', e);
    recomputeLive();
  }
}

/* ───── GET BALANCES ───── */
function getBalancesForDate(dateStr, bf){
  const branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  const r = { bank: 0, cash: 0, other: 0 };
  
  branches.forEach(b => {
    const la = DB().liveAccounts[b] || { bank: 0, cash: 0, other: 0 };
    r.bank += Number(la.bank) || 0;
    r.cash += Number(la.cash) || 0;
    r.other += Number(la.other) || 0;
  });
  return r;
}

/* ───── GET VAULT ───── */
function getVaultForDate(dateStr, bf){
  const branches = bf === 'all' ? Object.keys(BRANCHES) : [bf];
  const totals = {};
  DENOMS.forEach(d => totals[d] = 0);
  
  branches.forEach(b => {
    const lv = DB().liveVault[b] || {};
    DENOMS.forEach(d => {
      totals[d] += Number(lv[d]) || 0;
    });
  });
  
  return { totals };
}

/* ───── COMPUTE STATS ───── */
function computeStats(bf, date){
  const r = {
    loan_given: { amt: 0, cnt: 0 },
    loan_received: { amt: 0, cnt: 0 },
    deposit: { amt: 0, cnt: 0 },
    withdrawal: { amt: 0, cnt: 0 },
    transfer: { in: 0, out: 0, cnt: 0 },
    expense: { amt: 0, cnt: 0 },
    other: { in: 0, out: 0, onlineIn: 0, onlineOut: 0 },
    support: { in: 0, out: 0, cnt: 0 },
    money_exchange: { in: 0, out: 0, cnt: 0 },
    bank_transfer: { in: 0, out: 0, cnt: 0 }
  };
  
  const txs = getAllTxs();
  const isAll = (bf === 'all');
  
  for(let i = 0; i < txs.length; i++){
    const t = txs[i];
    if(t.cancelled) continue;
    
    if(!isAll){
      if(t.type !== 'branch_transfer'){
        if(t.branch !== bf) continue;
      } else {
        if(t.from !== bf && t.to !== bf) continue;
      }
    }
    
    if(t.type === 'branch_transfer'){
      const accepted = !!t.accepted;
      const isS = (t.from === bf), isR = (t.to === bf);
      
      if(!accepted){
        if(isAll || isS){
          r.transfer.out += t.amount;
          if(!date || t.date === date) r.transfer.cnt++;
        }
        continue;
      }
      
      if(isAll){
        if(!date || t.acceptedDate === date){
          r.transfer.in += t.amount;
          r.transfer.out += t.amount;
          r.transfer.cnt++;
        }
      } else {
        if(isS && (!date || t.date === date)){
          r.transfer.out += t.amount;
          r.transfer.cnt++;
        }
        if(isR && (!date || t.acceptedDate === date)){
          r.transfer.in += t.amount;
          if(!isS) r.transfer.cnt++;
        }
      }
      continue;
    }
    
    if(date && t.date !== date) continue;
    
    switch(t.type){
      case 'loan_given':
        r.loan_given.amt += t.amount;
        r.loan_given.cnt++;
        break;
      case 'loan_received':
        r.loan_received.amt += t.amount;
        r.loan_received.cnt++;
        break;
      case 'deposit':
        r.deposit.amt += t.amount;
        r.deposit.cnt++;
        break;
      case 'withdrawal':
        r.withdrawal.amt += t.amount;
        r.withdrawal.cnt++;
        break;
      case 'expense':
        r.expense.amt += t.amount;
        r.expense.cnt++;
        break;
      case 'bank_transfer':
        if(t.dir === 'in') r.bank_transfer.in += t.amount;
        else r.bank_transfer.out += t.amount;
        r.bank_transfer.cnt++;
        break;
      case 'other_bank':
        if(t.dir === 'in') r.other.in += t.amount;
        else if(t.dir === 'online_in') r.other.onlineIn += t.amount;
        else if(t.dir === 'out') r.other.out += t.amount;
        else if(t.dir === 'online_out') r.other.onlineOut += t.amount;
        break;
      case 'support':
        if(t.dir === 'online_support_out' || t.dir === 'out') r.support.out += t.amount;
        else r.support.in += t.amount;
        r.support.cnt++;
        break;
      case 'money_exchange':
        r.money_exchange.out += Number(t.notesOutSum) || 0;
        r.money_exchange.in += Number(t.notesInSum) || 0;
        r.money_exchange.cnt++;
        break;
    }
  }
  
  return r;
}

/* ───── HELPERS ───── */
function getAllBranchTransfers(){
  const all = getAllTxs().filter(t => t.type === 'branch_transfer' && !t.cancelled);
  all.sort((a, b) => {
    const aT = a.accepted ? (a.acceptedAt || a.acceptedDate || '') : (a.createdAt || '');
    const bT = b.accepted ? (b.acceptedAt || b.acceptedDate || '') : (b.createdAt || '');
    return bT.localeCompare(aT);
  });
  return all;
}

function getPendingTransfers(){
  return getAllBranchTransfers().filter(t => !t.accepted && !t.cancelled);
}

function getPendingCountByType(type){
  const bf = currentBranchFilter();
  
  if(type === 'branch_transfer'){
    let l = getPendingTransfers();
    if(bf !== 'all') l = l.filter(t => t.to === bf);
    return l.length;
  }
  
  if(type === 'loan_given'){
    let l = getAllTxs().filter(t => t.type === 'loan_given' &&
      (t.collectionStatus === 'pending' || t.collectionStatus === 'partial'));
    if(bf !== 'all') l = l.filter(t => t.branch === bf);
    return l.length;
  }
  
  return 0;
}

function getPendingCollections(){
  const result = [];
  
  getAllTxs().forEach(t => {
    if(t.type !== 'loan_given' || !t.cashNotTaken || t.collectionStatus === 'collected') return;
    
    const totalOwed = Number(t.cashNotTakenAmount) || Number(t.amount) || 0;
    const collected = Number(t.collectedAmount) || 0;
    const pending = totalOwed - collected;
    
    if(pending <= 0.01) return;
    
    result.push({
      ...t,
      _pending: Math.round(pending * 100) / 100,
      _owed: totalOwed,
      _collected: collected
    });
  });
  
  result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return result;
}

function getAllPending(){
  const bf = currentBranchFilter();
  
  let transfers = getPendingTransfers();
  if(bf !== 'all') transfers = transfers.filter(t => t.to === bf);
  
  let collections = getPendingCollections();
  if(bf !== 'all') collections = collections.filter(t => t.branch === bf);
  
  const transferAmt = transfers.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const collectionAmt = collections.reduce((s, t) => s + (t._pending || 0), 0);
  
  return {
    transfers,
    collections,
    totalAmount: transferAmt + collectionAmt,
    totalCount: transfers.length + collections.length
  };
}

function currentBranchFilter(){
  if(!session) return 'all';
  if(session.role === 'admin') return viewBranch || 'all';
  return BRANCHES[session.branch] ? session.branch : 'kalaroa';
}

/* ───── END OF FILE 11-db-engine.js ───── */
console.log('✅ DB Engine loaded — v11.7 (complete fix)');