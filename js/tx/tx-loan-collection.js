/* ============================================================
   FILE: tx/tx-loan-collection.js
   PURPOSE: 💰 ঋণ সংগ্রহ (Cash + Online)
   VERSION: v7.2
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   🔥 COLLECTION CHILD MODAL — Cash or Online
   ═══════════════════════════════════════════════════════════ */
function openCollectionChildModal(parentId, mode){
  const found = findTxAnywhere(parentId);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const parent = found.tx;
  const owed = Number(parent.cashNotTakenAmount) || Number(parent.amount) || 0;
  const collected = Number(parent.collectedAmount) || 0;
  const pending = Math.round((owed - collected) * 100) / 100;
  
  if(pending <= 0.01){ toast('✅ সম্পূর্ণ'); return; }
  
  const isC = mode === 'cash';
  const branchVault = DB().liveVault?.[parent.branch] || {};
  
  openModal({
    title: isC ? '💵 ক্যাশ সংগ্রহ' : '🌐 অনলাইন সংগ্রহ',
    wide: true,
    bodyHTML:
      '<div class="accept-head" style="border-color:' + (isC ? 'rgba(34,197,94,.5)' : 'rgba(59,130,246,.5)') + '">' +
        '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:8px">' + (isC ? '💵 ক্যাশ সংগ্রহ' : '🌐 অনলাইন সংগ্রহ') + '</div>' +
        '👤 <b>' + esc(parent.custName || '-') + '</b><br>' +
        'মোট: ৳ ' + fmt(owed) + ' • পূর্বে সংগৃহীত: ৳ ' + fmt(collected) + '<br>' +
        '⏳ বাকি: <b style="color:#facc15;font-size:17px">৳ ' + fmt(pending) + '</b>' +
      '</div>' +
      
      '<div class="form-row">' +
        '<div class="field"><label>তারিখ</label><input type="date" id="cc_date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>আউটলেট</label>' +
          (session.role === 'admin' ?
            '<select id="cc_branch"><option value="kalaroa" ' + (parent.branch === 'kalaroa' ? 'selected' : '') + '>কলারোয়া</option><option value="jhaudanga" ' + (parent.branch === 'jhaudanga' ? 'selected' : '') + '>ঝাউডাঙ্গা</option></select>'
            : '<input type="hidden" id="cc_branch" value="' + parent.branch + '"><input type="text" value="' + BRANCHES[parent.branch].name + '" disabled>') +
        '</div>' +
        '<div class="field"><label>💰 পরিমাণ</label><input type="text" inputmode="decimal" id="cc_amount" value="' + pending.toFixed(2) + '" autocomplete="off"></div>' +
      '</div>' +
      
      (!isC ?
        '<div class="form-row">' +
          '<div class="field"><label>ব্যাংক</label><select id="cc_bank">' + bankOpts('al_arafah_kalaroa') + '</select></div>' +
          '<div class="field"><label>প্রাপক</label><input type="text" id="cc_partner" autocomplete="off"></div>' +
        '</div>'
        :
        '<div class="notes-col out">' +
          '<h4>💸 প্রদান</h4>' +
          notesRowHTML('cc_out', null, branchVault) +
          '<div class="sum-line"><span>মোট</span><b id="cc_sumOut">৳ 0.00</b></div>' +
        '</div>') +
      
      '<div class="field"><label>📝 মন্তব্য</label><input type="text" id="cc_note" value="' + (isC ? 'ক্যাশ সংগ্রহ' : 'অনলাইন সংগ্রহ') + '" autocomplete="off"></div>' +
      '<div style="display:flex;gap:10px;margin-top:18px"><button class="btn ' + (isC ? 'green' : '') + '" id="cc_save" style="flex:1">✅ সংগ্রহ</button></div>',
    
    onMount: (w, close) => {
      const so = w.querySelector('#cc_sumOut');
      const getBranchKey = () => {
        const b = w.querySelector('#cc_branch');
        return b?.value || parent.branch;
      };
      
      function recalc(){
        if(isC && so) so.textContent = '৳ ' + fmt(noteSum(readNotes(w, 'cc_out')));
      }
      
      __setupDenomInputs(w, 'cc_out', getBranchKey, recalc);
      w.querySelectorAll('input[inputmode="decimal"]').forEach(inp => {
        attachAmountInput(inp, { decimal: true });
      });
      
      if(isC) updateVaultStock(w, 'cc_out', getBranchKey());
      recalc();
      
      w.querySelector('#cc_save').addEventListener('click', async () => {
        const b = w.querySelector('#cc_save');
        if(b.disabled) return;
        
        const date = w.querySelector('#cc_date').value;
        const br = w.querySelector('#cc_branch').value;
        const amt = Math.round(parseNum(w.querySelector('#cc_amount').value) * 100) / 100;
        
        if(amt <= 0){ alert('পরিমাণ দিন'); return; }
        if(amt > pending + 0.01){
          alert('পরিমাণ বাকির বেশি হতে পারবে না (সর্বোচ্চ ৳ ' + fmt(pending) + ')');
          return;
        }
        
        let on = {}, inN = {}, bk = null, pn = '';
        
        if(isC){
          on = readNotes(w, 'cc_out');
          if(Object.keys(on).length === 0){ sorryNoNote(); return; }
          
          if(Math.abs(noteSum(on) - amt) > 0.01){
            alert('নোট যোগফল ৳ ' + fmt(noteSum(on)) + ' সমান হতে হবে ৳ ' + fmt(amt) + ' এর');
            return;
          }
          
          const vault = DB().liveVault?.[br] || {};
          const miss = [];
          Object.keys(on).forEach(d => {
            const n = Number(on[d]) || 0, h = Number(vault[d]) || 0;
            if(n > h) miss.push({ d, n, h });
          });
          
          if(miss.length > 0){
            miss.forEach(m => {
              const inp = w.querySelector('#cc_out_' + m.d);
              if(inp){
                inp.style.borderColor = 'rgba(220,38,38,.9)';
                inp.style.background = 'rgba(220,38,38,.25)';
                inp.focus();
              }
            });
            alert('🚫 ভল্টে কম!\n\n' + miss.map(m => '৳ ' + toBn(m.d) + ' — দরকার ' + toBn(m.n) + ', আছে ' + toBn(m.h)).join('\n'));
            return;
          }
        } else {
          bk = w.querySelector('#cc_bank').value;
          pn = w.querySelector('#cc_partner').value.trim();
          if(!pn){ alert('প্রাপক দিন'); return; }
        }

                
        // ═══ NEGATIVE BANK CHECK (online only) ═══
        if(!isC){
          const txPreview = {
            type: 'loan_collection',
            branch: br,
            amount: amt,
            collectionMode: 'online'
          };
          
          const bankCheck = validateBankBalance(txPreview);
          if(!bankCheck.ok){
            blockNegativeBank(bankCheck, txPreview);
            return;
          }
        }
        
        b.disabled = true;
        const og = b.innerHTML;
        b.innerHTML = '<span class="spinner"></span>';
        
        try{
          const child = {
            id: uid(),
            type: 'loan_collection',
            date,
            branch: br,
            custBranch: parent.custBranch || parent.branch,
            dir: isC ? 'cash' : 'online_out',
            amount: amt,
            notesOut: on,
            notesIn: inN,
            bank: bk,
            partnerName: pn,
            custAcc: parent.custAcc,
            custName: parent.custName,
            note: w.querySelector('#cc_note').value.trim(),
            linkedParentId: parent.id,
            collectionMode: isC ? 'cash' : 'online',
            user: session.name,
            userUsername: session.username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            year: date.slice(0, 4),
            accepted: true,
            acceptedDate: date
          };
          
          DB().txs.push(child);
          
          const nc = Math.round(((Number(parent.collectedAmount) || 0) + amt) * 100) / 100;
          const ns = nc >= owed - 0.01 ? 'collected' : 'partial';
          
          updateTxAnywhere(parent.id, {
            collectedAmount: nc,
            collectionStatus: ns,
            updatedAt: new Date().toISOString()
          });
          
          addTxLog(parent.id, 'collect', {
            collectedAmount: { from: collected, to: nc },
            collectionStatus: { from: parent.collectionStatus, to: ns }
          }, parent);
          
          addTxLog(child.id, 'create', { action: 'collection entry created' }, child);
          
          addActivityLog({
            type: 'txn_collect',
            title: '💰 ঋণ সংগ্রহ',
            detail: parent.custName || '',
            amount: amt,
            targetId: parent.id
          });
          
          close();
          toast('✅ সংগ্রহ — ৳ ' + fmt(amt) + (ns === 'collected' ? ' (সম্পূর্ণ)' : ' (বাকি ৳ ' + fmt(owed - nc) + ')'));
          
          await afterTxSave(child, true);
          
          try{
            broadcastActivity({
              type: 'txn_collect',
              amount: amt,
              txId: parent.id,
              custName: parent.custName
            });
          } catch(e){}
        } catch(e){
          alert('❌ ' + e.message);
          b.disabled = false;
          b.innerHTML = og;
        }
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🔥 COLLECTION PENDING DETAIL
   ═══════════════════════════════════════════════════════════ */
function openCollectionPendingDetail(id){
  const found = findTxAnywhere(id);
  if(!found || !found.tx){ toast('❌ নেই'); return; }
  
  const parent = found.tx;
  const owed = Number(parent.cashNotTakenAmount) || Number(parent.amount) || 0;
  const collected = Number(parent.collectedAmount) || 0;
  const pending = Math.round((owed - collected) * 100) / 100;
  const withdrawnAmount = Number(parent.amount) || 0;
  
  openModal({
    title: '⏳ অপেক্ষমাণ ঋণ সংগ্রহ',
    wide: true,
    bodyHTML:
      '<div class="accept-head">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px">' +
          '<div>' +
            '<div style="color:#a5b4d8;font-size:12px;font-weight:700">👤 গ্রাহক</div>' +
            '<div style="color:#4ade80;font-size:17px;font-weight:900">' + esc(parent.custName || '-') + '</div>' +
            '<div style="color:#a5b4d8;font-size:12px">' + esc(parent.custAcc || '') + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#a5b4d8;font-size:12px;font-weight:700">📅 তারিখ</div>' +
            '<div style="color:#fff;font-size:17px;font-weight:900">' + toBn(parent.date) + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#a5b4d8;font-size:12px;font-weight:700">💰 উত্তোলনকৃত</div>' +
            '<div style="color:#93c5fd;font-size:18px;font-weight:900">৳ ' + fmt(withdrawnAmount) + '</div>' +
          '</div>' +
          '<div>' +
            '<div style="color:#a5b4d8;font-size:12px;font-weight:700">⏳ বাকি</div>' +
            '<div style="color:#facc15;font-size:22px;font-weight:900">৳ ' + fmt(pending) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      
      '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">' +
        '<button class="btn green" id="cp_cash" style="flex:1;padding:14px 22px;font-size:15px">💵 ক্যাশ সংগ্রহ</button>' +
        '<button class="btn" id="cp_online" style="flex:1;padding:14px 22px;font-size:15px">🌐 অনলাইন সংগ্রহ</button>' +
      '</div>',
    
    onMount: (w, close) => {
      w.querySelector('#cp_cash').addEventListener('click', () => {
        close();
        setTimeout(() => openCollectionChildModal(id, 'cash'), 100);
      });
      w.querySelector('#cp_online').addEventListener('click', () => {
        close();
        setTimeout(() => openCollectionChildModal(id, 'online'), 100);
      });
    }
  });
}

/* ───── END OF FILE tx/tx-loan-collection.js ───── */
console.log('✅ Loan Collection loaded');