/* ============================================================
   FILE: managers/mgr-branch.js
   PURPOSE: 🏢 আউটলেট ম্যানেজমেন্ট (Base Vault/Capital/Reset)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openBranchManagement(){
  if(!requireAdmin('আউটলেট')) return;
  
  openModal({
    title: '🏢 আউটলেট ম্যানেজমেন্ট',
    wide: true,
    bodyHTML:
      '<div class="branch-tab">' +
        '<button type="button" class="branch-tab-btn active" data-btab="kalaroa">কলারোয়া</button>' +
        '<button type="button" class="branch-tab-btn" data-btab="jhaudanga">ঝাউডাঙ্গা</button>' +
      '</div>' +
      '<div id="bmBody"></div>',
    
    onMount: (w, close) => {
      function render(br){
        const a = DB().baseAccounts[br] || { bank: 0, cash: 0, other: 0 };
        const v = DB().baseVault[br] || {};
        const bc = Number(DB().branchCapital?.[br]) || 0;
        
        w.querySelector('#bmBody').innerHTML =
          // ═════ Capital ═════
          '<div class="form-row">' +
            '<div class="field">' +
              '<label style="color:#facc15 !important">💰 মূলধন</label>' +
              '<input type="text" inputmode="decimal" id="bm_capital" value="' + (bc ? bc.toLocaleString('en-US') : '') + '" style="color:#facc15;font-weight:900;font-size:18px" autocomplete="off">' +
            '</div>' +
          '</div>' +
          
          // ═════ Accounts ═════
          '<div class="form-row">' +
            '<div class="field">' +
              '<label>🏦 মাদার অ্যাকাউন্ট</label>' +
              '<input type="text" inputmode="decimal" id="bm_bank" value="' + (a.bank ? Number(a.bank).toLocaleString('en-US') : '') + '" autocomplete="off">' +
            '</div>' +
            '<div class="field">' +
              '<label>🏛️ অন্যান্য ব্যাংকে জমা</label>' +
              '<input type="text" inputmode="decimal" id="bm_other" value="' + (a.other ? Number(a.other).toLocaleString('en-US') : '') + '" autocomplete="off">' +
            '</div>' +
          '</div>' +
          
          // ═════ Vault Notes ═════
          '<div class="notes-col" style="margin-top:12px">' +
            '<h4 style="font-size:16px;margin-bottom:12px;color:#93c5fd">🗄️ ক্যাশ ইন হ্যান্ড (ভল্ট)</h4>' +
            '<div class="notes-row">' +
              DENOMS.map(d =>
                '<div class="note-item">' +
                  '<label>৳ ' + toBn(d) + '</label>' +
                  '<input type="text" inputmode="numeric" id="bm_note_' + d + '" data-denom="' + d + '" value="' + (v[d] || '') + '" autocomplete="off">' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>' +
          
          // ═════ Buttons ═════
          '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">' +
            '<button class="btn green" id="bm_save" style="flex:1;min-width:200px">💾 সেভ</button>' +
            '<button class="btn red" id="bm_reset" style="flex:1;min-width:140px">🔄 রিসেট</button>' +
          '</div>';
        
        // Attach amount inputs
        attachAmountInput(w.querySelector('#bm_capital'), { decimal: true });
        attachAmountInput(w.querySelector('#bm_bank'), { decimal: true });
        attachAmountInput(w.querySelector('#bm_other'), { decimal: true });
        
        // Denom inputs — numeric only
        DENOMS.forEach(d => {
          const el = w.querySelector('#bm_note_' + d);
          if(el){
            el.addEventListener('input', (e) => {
              let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
              e.target.value = v;
            });
          }
        });
        
        // ═════ Save ═════
        w.querySelector('#bm_save').addEventListener('click', async () => {
          if(!requireAdmin('সেভ')) return;
          
          const cap = parseNum(w.querySelector('#bm_capital').value);
          const bnk = parseNum(w.querySelector('#bm_bank').value);
          const oth = parseNum(w.querySelector('#bm_other').value);
          
          const vv = {};
          DENOMS.forEach(d => {
            vv[d] = parseInt(
              String(w.querySelector('#bm_note_' + d).value).replace(/[^0-9]/g, ''),
              10
            ) || 0;
          });
          
          const csh = DENOMS.reduce((s, d) => s + vv[d] * d, 0);
          
          DB().baseAccounts[br] = { bank: bnk, cash: csh, other: oth };
          DB().baseVault[br] = vv;
          
          if(!DB().branchCapital) DB().branchCapital = {};
          DB().branchCapital[br] = cap;
          DB().totalCapital = Object.values(DB().branchCapital).reduce(
            (s, v) => s + (Number(v) || 0), 0
          );
          
          addActivityLog({
            type: 'vault_update',
            title: '🗄️ আউটলেট আপডেট',
            detail: BRANCHES[br]?.name,
            amount: cap
          });
          
          recomputeLive();
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          renderDashboard(true);
          toast('✅ সেভ — ৳ ' + fmt(cap));
        });
        
        // ═════ Reset ═════
        w.querySelector('#bm_reset').addEventListener('click', async () => {
          if(!requireAdmin('রিসেট')) return;
          if(!confirm('⚠️ রিসেট?')) return;
          
          DB().baseAccounts[br] = { bank: 0, cash: 0, other: 0 };
          DB().baseVault[br] = {};
          DENOMS.forEach(d => DB().baseVault[br][d] = 0);
          
          if(!DB().branchCapital) DB().branchCapital = {};
          DB().branchCapital[br] = 0;
          DB().totalCapital = Object.values(DB().branchCapital).reduce(
            (s, v) => s + (Number(v) || 0), 0
          );
          
          recomputeLive();
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          renderDashboard(true);
          render(br);
          toast('🔄 রিসেট');
        });
      }
      
      // Tab switching
      w.querySelectorAll('[data-btab]').forEach(b => b.addEventListener('click', () => {
        w.querySelectorAll('[data-btab]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        render(b.dataset.btab);
      }));
      
      render('kalaroa');
    }
  });
}

/* ───── END OF FILE managers/mgr-branch.js ───── */
console.log('✅ Manager Branch loaded');