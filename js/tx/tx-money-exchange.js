/* ============================================================
   FILE: tx/tx-money-exchange.js
   PURPOSE: 💱 মানি এক্সচেঞ্জ (Note exchange / currency)
   VERSION: v8.1 — History Calendar Default Today
   ============================================================ */

'use strict';

function openMoneyExchange(){
  const bf = currentBranchFilter();
  const tb = (bf === 'all' || !BRANCHES[bf]) ? 'kalaroa' : bf;
  const bo = Object.entries(BANKS).map(([k, v]) =>
    '<option value="' + k + '">' + esc(v.name) + '</option>'
  ).join('');
  const branchVault = DB().liveVault?.[tb] || {};
  
  openModal({
    title: '💱 মানি এক্সচেঞ্জ',
    wide: true,
    bodyHTML:
      '<div class="form-row">' +
        '<div class="field"><label>তারিখ</label><input type="date" id="me_date" value="' + dashDate + '"></div>' +
        '<div class="field"><label>আউটলেট</label>' +
          (session.role === 'admin' ?
            '<select id="me_branch"><option value="kalaroa" ' + (tb === 'kalaroa' ? 'selected' : '') + '>কলারোয়া</option><option value="jhaudanga" ' + (tb === 'jhaudanga' ? 'selected' : '') + '>ঝাউডাঙ্গা</option></select>'
            : '<input type="text" value="' + BRANCHES[tb].name + '" disabled><input type="hidden" id="me_branch" value="' + tb + '">') +
        '</div>' +
        '<div class="field"><label>🏦 ব্যাংক</label><select id="me_bank"><option value="general">— সাধারণ —</option>' + bo + '</select></div>' +
        '<div class="field"><label>ধরন</label>' +
          '<select id="me_dir">' +
            '<option value="in_physical">📥 ফিজিক্যাল আনা</option>' +
            '<option value="in_online">💳 অনলাইন আনা</option>' +
            '<option value="out_physical">📤 ফিজিক্যাল পাঠানো</option>' +
            '<option value="out_online">📤 অনলাইন পাঠানো</option>' +
            '<option value="note_change">🔁 নোট পরিবর্তন</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      
      '<div class="field"><label>📝 বিবরণী</label><input type="text" id="me_desc" autocomplete="off"></div>' +
      
      '<div class="online-box" id="me_online_box" style="display:none">' +
        '<h4>💳 অনলাইন</h4>' +
        '<div class="form-row">' +
          '<div class="field"><label>পরিমাণ</label><input type="text" inputmode="decimal" id="me_online_amount" autocomplete="off"></div>' +
          '<div class="field"><label>রেফারেন্স</label><input type="text" id="me_online_ref" autocomplete="off"></div>' +
        '</div>' +
      '</div>' +
      
      '<div class="bank-hint">💡 প্রদান = আমি দিলাম | গ্রহণ = আমি নিলাম</div>' +
      
      '<div class="notes-cols" id="me_notes_cols">' +
        '<div class="notes-col out">' +
          '<h4>💸 প্রদান</h4>' +
          notesRowHTML('me_out', null, branchVault) +
          '<div class="sum-line"><span>মোট</span><b id="me_sumOut">৳ 0.00</b></div>' +
        '</div>' +
        '<div class="notes-col in">' +
          '<h4>📥 গ্রহণ</h4>' +
          notesRowHTML('me_in', null, {}) +
          '<div class="sum-line"><span>মোট</span><b id="me_sumIn">৳ 0.00</b></div>' +
        '</div>' +
      '</div>' +
      
      '<div class="total-preview"><div class="l">নেট</div><div class="v" id="me_netAmt">৳ 0.00</div></div>' +
      '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn green" id="me_save" style="flex:1;min-width:160px">💾 সংরক্ষণ</button></div>' +
      '<div id="me_history" style="margin-top:20px"></div>',
    
    onMount: (w, close) => {
      const so = w.querySelector('#me_sumOut');
      const si = w.querySelector('#me_sumIn');
      const ne = w.querySelector('#me_netAmt');
      
      const getBranchKey = () => {
        const b = w.querySelector('#me_branch');
        return b?.value || tb;
      };
      
      function isOD(){
        const d = w.querySelector('#me_dir').value;
        return d === 'in_online' || d === 'out_online';
      }
      
      function recalc(){
        const o = noteSum(readNotes(w, 'me_out'));
        const i = noteSum(readNotes(w, 'me_in'));
        
        so.textContent = '৳ ' + fmt(o);
        si.textContent = '৳ ' + fmt(i);
        
        if(isOD()){
          const v = parseNum(w.querySelector('#me_online_amount')?.value);
          ne.textContent = '৳ ' + fmt(v);
          return;
        }
        ne.textContent = '৳ ' + fmt(Math.abs(o - i));
      }
      
      __setupDenomInputs(w, 'me_out', getBranchKey, recalc);
      __setupDenomInputs(w, 'me_in', getBranchKey, recalc);
      
      w.querySelectorAll('input[inputmode="decimal"]').forEach(inp => {
        attachAmountInput(inp, { decimal: true });
      });
      
      const oa = w.querySelector('#me_online_amount');
      if(oa) oa.addEventListener('input', recalc);
      
      w.querySelector('#me_dir').addEventListener('change', () => {
        const io = isOD();
        w.querySelector('#me_notes_cols').style.display = io ? 'none' : 'grid';
        w.querySelector('#me_online_box').style.display = io ? 'block' : 'none';
        recalc();
      });
      w.querySelector('#me_dir').dispatchEvent(new Event('change'));
      
      updateVaultStock(w, 'me_out', getBranchKey());
      updateVaultStock(w, 'me_in', getBranchKey());
      recalc();
      
      // ⚡ HISTORY — DEFAULT TODAY
      let histDate = todayStr();
      
      function renderHistory(){
        const histEl = w.querySelector('#me_history');
        if(!histEl) return;
        
        const allMxTxs = getAllTxs().filter(t => t.type === 'money_exchange' && !t.cancelled);
        const txsFiltered = histDate ? allMxTxs.filter(t => t.date === histDate) : allMxTxs;
        const total = txsFiltered.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        
        let html = '<div class="modal-history">' +
          '<div class="modal-history-title"><span class="bar"></span> 📋 হিস্টোরি — ' +
            '<input type="date" id="me_hist_date" value="' + histDate + '" style="padding:6px 10px;border-radius:8px;background:#050810;border:1px solid var(--line-2);color:#fff;font-family:inherit;font-size:12.5px;font-weight:700">' +
            '<button type="button" id="me_hist_clear" style="padding:6px 12px;border-radius:8px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#93c5fd;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-left:6px">সব</button>' +
            '<span class="badge" style="margin-left:auto">' + toBn(txsFiltered.length) + ' টি • ৳ ' + fmt(total) + '</span>' +
          '</div>';
        
        if(txsFiltered.length){
          html += '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            '<th>তারিখ</th><th>ধরন</th><th>বিবরণ</th><th>পরিমাণ</th><th>ইউজার</th>' +
          '</tr></thead><tbody>';
          
          txsFiltered.slice(0, 30).forEach(t => {
            const dirLabel = ({
              in_physical: '📥 ফিজিক্যাল আনা',
              in_online: '💳 অনলাইন আনা',
              out_physical: '📤 ফিজিক্যাল পাঠানো',
              out_online: '📤 অনলাইন পাঠানো',
              note_change: '🔁 নোট পরিবর্তন'
            })[t.dir] || t.dir;
            
            html += '<tr>' +
              '<td style="font-size:11.5px">' + toBn(t.date) + '</td>' +
              '<td style="font-size:11.5px">' + dirLabel + '</td>' +
              '<td style="font-size:11px;color:#a5b4d8;max-width:200px;line-height:1.5">' + esc(t.note || '-') + '</td>' +
              '<td class="amt">৳ ' + fmt(t.amount) + '</td>' +
              '<td style="font-size:11px">' + esc(t.user || '-') + '</td>' +
            '</tr>';
          });
          
          html += '</tbody></table></div>';
        } else {
          html += '<div class="empty">📭 এই তারিখে কোনো লেনদেন নেই</div>';
        }
        
        html += '</div>';
        histEl.innerHTML = html;
        
        const dEl = histEl.querySelector('#me_hist_date');
        if(dEl){
          dEl.addEventListener('change', (e) => {
            histDate = e.target.value;
            renderHistory();
          });
        }
        
        // ⚡ "সব" button
        const cBtn = histEl.querySelector('#me_hist_clear');
        if(cBtn){
          cBtn.addEventListener('click', () => {
            histDate = '';
            const dEl2 = histEl.querySelector('#me_hist_date');
            if(dEl2) dEl2.value = '';
            renderHistory();
          });
        }
      }
      
      renderHistory();
      
      w.querySelector('#me_save').addEventListener('click', async () => {
        const b = w.querySelector('#me_save');
        if(b.disabled) return;
        
        const br = w.querySelector('#me_branch').value;
        const bk = w.querySelector('#me_bank').value;
        const dv = w.querySelector('#me_dir').value;
        const io = isOD();
        const on = io ? {} : readNotes(w, 'me_out');
        const inN = io ? {} : readNotes(w, 'me_in');
        const os = noteSum(on);
        const is = noteSum(inN);
        
        let a = 0, oa2 = 0, orf = '';
        
        if(io){
          oa2 = parseNum(w.querySelector('#me_online_amount').value);
          orf = w.querySelector('#me_online_ref').value.trim();
          if(oa2 <= 0){ alert('পরিমাণ দিন'); return; }
          a = oa2;
        } else {
          if(os === 0 && is === 0){ sorryNoNote(); return; }
          a = Math.abs(os - is);
        }
        
        const balCheck = checkNegativeBalance(br);
        if(!balCheck.ok) return;
        
        if(!io){
          const vault = DB().liveVault?.[br] || {};
          const miss = [];
          Object.keys(on).forEach(d => {
            const n = Number(on[d]) || 0, h = Number(vault[d]) || 0;
            if(n > h) miss.push({ d, n, h });
          });
          
          if(miss.length > 0){
            miss.forEach(m => {
              const inp = w.querySelector('#me_out_' + m.d);
              if(inp){
                inp.style.borderColor = 'rgba(220,38,38,.9)';
                inp.style.background = 'rgba(220,38,38,.25)';
                inp.focus();
              }
            });
            alert('🚫 ভল্টে কম!\n\n' + miss.map(m => '৳ ' + toBn(m.d) + ' — দরকার ' + toBn(m.n) + ', আছে ' + toBn(m.h)).join('\n'));
            return;
          }
        }
        
        b.disabled = true;
        const og = b.innerHTML;
        b.innerHTML = '<span class="spinner"></span>';
        
        try{
          const dV = w.querySelector('#me_date').value || dashDate;
          
          const tx = {
            id: uid(),
            type: 'money_exchange',
            date: dV,
            branch: br,
            custBranch: br,
            bank: bk,
            dir: dv,
            amount: Math.round(a * 100) / 100,
            onlineAmount: io ? Math.round(oa2 * 100) / 100 : null,
            onlineRef: io ? orf : null,
            notesOutSum: Math.round(os * 100) / 100,
            notesInSum: Math.round(is * 100) / 100,
            notesOut: on,
            notesIn: inN,
            note: w.querySelector('#me_desc').value.trim() || 'মানি এক্সচেঞ্জ',
            user: session.name,
            userUsername: session.username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            year: dV.slice(0, 4),
            accepted: true,
            acceptedDate: dV
          };
          
          DB().txs.push(tx);
          
          addTxLog(tx.id, 'create', { action: 'money exchange' }, tx);
          
          addActivityLog({
            type: 'txn_create',
            title: '💱 মানি এক্সচেঞ্জ',
            detail: BRANCHES[br]?.name || '',
            amount: a,
            targetId: tx.id
          });
          
          close();
          toast('✅ মানি এক্সচেঞ্জ');
          await afterTxSave(tx, true);
        } catch(e){
          alert('❌ ' + e.message);
          b.disabled = false;
          b.innerHTML = og;
        }
      });
    }
  });
}

/* ───── END OF FILE tx/tx-money-exchange.js ───── */
console.log('✅ Money Exchange loaded — v8.1 (today default)');