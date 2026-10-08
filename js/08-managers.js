/* ============================================================
   FILE: js/08-managers.js
   PURPOSE: Branch + User + Backup + Danger Zone
   ============================================================ */
'use strict';

/* ──── BRANCH MANAGEMENT ──── */
function openBranchMgmt(){
  if(SESSION.role !== 'admin'){ toast('❌ শুধু অ্যাডমিন'); return; }
  let activeB = 'kalaroa';

  function bodyHTML(){
    const a = DB.baseAccounts[activeB] || { bank: 0, cash: 0, other: 0 };
    const v = DB.baseVault[activeB] || {};
    const cap = Number(DB.branchCapital[activeB]) || 0;
    const vTotal = DENOMS.reduce((s, d) => s + (Number(v[d]) || 0) * d, 0);
    return '<div style="display:flex;gap:8px;margin-bottom:12px">' +
        Object.entries(BRANCHES).map(([k, val]) =>
          '<button class="btn ' + (activeB === k ? 'blue' : 'gray') + ' sm" data-btab="' + k + '" style="flex:1">' + val.name + '</button>'
        ).join('') + '</div>' +
      '<div class="form-row"><div class="field"><label style="color:#facc15">💰 মূলধন</label>' +
        '<input type="text" inputmode="decimal" id="bm-cap" value="' + cap + '"></div></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>🏦 মাদার অ্যাকাউন্ট</label><input type="text" inputmode="decimal" id="bm-bank" value="' + a.bank + '"></div>' +
        '<div class="field"><label>🏛️ অন্যান্য</label><input type="text" inputmode="decimal" id="bm-other" value="' + a.other + '"></div>' +
      '</div>' +
      '<div class="notes-col out" style="margin-top:12px"><h4>🗄️ বেস ভল্ট</h4>' +
        denomRowHTML('bv', v, {}) +
        '<div class="sum-line"><span>মোট</span><b id="bv-sum">৳ ' + fmt(vTotal) + '</b></div></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn green" id="bm-save" style="flex:1">💾 সেভ</button>' +
        '<button class="btn red" id="bm-reset">🔄 রিসেট</button></div>';
  }

  openModal({
    title: '🏢 আউটলেট ম্যানেজমেন্ট',
    bodyHTML: bodyHTML(),
    wide: true,
    onMount: (root) => {
      function rebind(){
        const bvSum = () => {
          const bn = readNotes(root, 'bv');
          root.querySelector('#bv-sum').textContent = '৳ ' + fmt(sumNotes(bn));
        };
        setupDenomInputs(root, 'bv', bvSum);
        attachAmountInput(root.querySelector('#bm-cap'));
        attachAmountInput(root.querySelector('#bm-bank'));
        attachAmountInput(root.querySelector('#bm-other'));
        root.querySelectorAll('[data-btab]').forEach(b => {
          b.addEventListener('click', () => { activeB = b.dataset.btab; root.innerHTML = bodyHTML(); rebind(); });
        });
        root.querySelector('#bm-save').addEventListener('click', async () => {
          const cap = parseNum(root.querySelector('#bm-cap').value);
          const bank = parseNum(root.querySelector('#bm-bank').value);
          const other = parseNum(root.querySelector('#bm-other').value);
          const bv = readNotes(root, 'bv');
          DB.baseAccounts[activeB] = { bank, cash: sumNotes(bv), other };
          DB.baseVault[activeB] = {};
          DENOMS.forEach(d => DB.baseVault[activeB][d] = Number(bv[d]) || 0);
          DB.branchCapital[activeB] = cap;
          DB.totalCapital = Object.values(DB.branchCapital).reduce((s, x) => s + (Number(x) || 0), 0);
          logActivity('vault_update', '🗄️ আউটলেট আপডেট', BRANCHES[activeB].name, cap);
          DB.__updated = new Date().toISOString();
          saveLocal(); recomputeLive(); renderDashboard(); await pushCloud();
          toast('✅ সেভ', 'ok');
        });
        root.querySelector('#bm-reset').addEventListener('click', async () => {
          if(!confirmBox('রিসেট করবেন?')) return;
          DB.baseAccounts[activeB] = { bank: 0, cash: 0, other: 0 };
          DB.baseVault[activeB] = {};
          DENOMS.forEach(d => DB.baseVault[activeB][d] = 0);
          DB.branchCapital[activeB] = 0;
          DB.totalCapital = Object.values(DB.branchCapital).reduce((s, x) => s + (Number(x) || 0), 0);
          DB.__updated = new Date().toISOString();
          saveLocal(); recomputeLive(); renderDashboard(); await pushCloud();
        });
      }
      rebind();
    }
  });
}

/* ──── USER MANAGEMENT ──── */
function openUserMgmt(){
  if(SESSION.role !== 'admin'){ toast('❌ শুধু অ্যাডমিন'); return; }

  function render(){
    let html = '<div style="padding:12px;border-radius:12px;background:rgba(59,130,246,.06);border:1.5px solid rgba(59,130,246,.3);margin-bottom:12px">' +
      '<div style="font-size:12.5px;color:#93c5fd;font-weight:800;margin-bottom:8px">➕ নতুন ইউজার</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>নাম *</label><input type="text" id="nu-name"></div>' +
        '<div class="field"><label>আইডি *</label><input type="text" id="nu-user"></div>' +
        '<div class="field"><label>পাসওয়ার্ড *</label><input type="text" id="nu-pass"></div>' +
        '<div class="field"><label>রোল</label><select id="nu-role"><option value="user">ইউজার</option><option value="admin">অ্যাডমিন</option></select></div>' +
        '<div class="field"><label>আউটলেট</label><select id="nu-branch">' +
          Object.entries(BRANCHES).map(([k, v]) => '<option value="' + k + '">' + v.name + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<button class="btn green block" id="nu-save">💾 তৈরি</button></div>';
    html += '<div class="table-wrap"><table><thead><tr><th>নাম</th><th>আইডি</th><th>পাসওয়ার্ড</th><th>রোল</th><th>আউটলেট</th><th>অ্যাকশন</th></tr></thead><tbody>';
    DB.users.forEach(u => {
      html += '<tr><td><b>' + esc(u.name) + '</b></td>' +
        '<td style="font-family:monospace;color:#93c5fd">' + esc(u.username) + '</td>' +
        '<td style="color:#4ade80;font-weight:800">' + esc(u.plainPassword || '🔒') + '</td>' +
        '<td>' + (u.role === 'admin' ? '👑' : '👤') + '</td>' +
        '<td>' + esc(u.branch === 'all' ? 'সব' : (BRANCHES[u.branch]?.name || '—')) + '</td>' +
        '<td><button class="mini" data-edit-u="' + u.id + '">✏️</button> <button class="mini" data-pass-u="' + u.id + '">🔑</button>' +
        (u.id !== SESSION.id ? ' <button class="mini danger" data-del-u="' + u.id + '">🗑️</button>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  openModal({
    title: '👥 ইউজার ম্যানেজমেন্ট',
    bodyHTML: '<div id="u-body">' + render() + '</div>',
    wide: true,
    onMount: (root) => {
      function rebind(){
        const body = root.querySelector('#u-body');
        body.querySelector('#nu-save').addEventListener('click', async () => {
          const name = body.querySelector('#nu-name').value.trim();
          const username = body.querySelector('#nu-user').value.trim();
          const password = body.querySelector('#nu-pass').value.trim();
          const role = body.querySelector('#nu-role').value;
          let branch = body.querySelector('#nu-branch').value;
          if(!name || !username || !password){ alert('⚠️ সব পূরণ করুন'); return; }
          if(DB.users.some(u => u.username.toLowerCase() === username.toLowerCase())){ alert('❌ আইডি আছে'); return; }
          if(role === 'admin') branch = 'all';
          DB.users.push({ id: uid(), name, username, password: hashPass(password), plainPassword: password, role, branch, createdAt: new Date().toISOString() });
          logActivity('user_add', '👥 নতুন ইউজার', name);
          DB.__updated = new Date().toISOString();
          saveLocal(); await pushCloud();
          body.innerHTML = render(); rebind();
          toast('✅ তৈরি — ' + username + ' / ' + password, 'ok');
        });
        body.querySelectorAll('[data-del-u]').forEach(b => {
          b.addEventListener('click', async () => {
            if(!confirmBox('ইউজার ডিলিট?')) return;
            const u = DB.users.find(x => x.id === b.dataset.delU);
            if(!u) return;
            DB.deletedUserIds[u.id] = new Date().toISOString();
            DB.deletedUsernames[u.username.toLowerCase()] = new Date().toISOString();
            DB.users = DB.users.filter(x => x.id !== u.id);
            logActivity('user_delete', '🗑️ ইউজার ডিলিট', u.name);
            DB.__updated = new Date().toISOString();
            saveLocal(); await pushCloud();
            body.innerHTML = render(); rebind();
            toast('🗑️ ডিলিট');
          });
        });
        body.querySelectorAll('[data-pass-u]').forEach(b => {
          b.addEventListener('click', async () => {
            const u = DB.users.find(x => x.id === b.dataset.passU);
            if(!u) return;
            const np = prompt('নতুন পাসওয়ার্ড (' + u.name + '):', u.plainPassword || '');
            if(!np || np.length < 3) return;
            u.password = hashPass(np.trim());
            u.plainPassword = np.trim();
            logActivity('password_change', '🔑 পাসওয়ার্ড পরিবর্তন', u.name);
            DB.__updated = new Date().toISOString();
            saveLocal(); await pushCloud();
            toast('✅ পাসওয়ার্ড — ' + np, 'ok');
          });
        });
        body.querySelectorAll('[data-edit-u]').forEach(b => {
          b.addEventListener('click', async () => {
            const u = DB.users.find(x => x.id === b.dataset.editU);
            if(!u) return;
            const n = prompt('নাম:', u.name);
            if(n === null) return;
            u.name = n.trim() || u.name;
            DB.__updated = new Date().toISOString();
            saveLocal(); await pushCloud();
            body.innerHTML = render(); rebind();
          });
        });
      }
      rebind();
    }
  });
}

/* ──── BACKUP ──── */
function openBackupMgmt(){
  if(SESSION.role !== 'admin'){ toast('❌ শুধু অ্যাডমিন'); return; }
  openModal({
    title: '💾 ব্যাকআপ / রিস্টোর',
    bodyHTML:
      '<button class="btn green block" id="bk-dl" style="margin-bottom:10px;padding:16px">📥 এখনই ব্যাকআপ ডাউনলোড</button>' +
      '<button class="btn blue block" id="bk-up" style="margin-bottom:10px;padding:16px">📤 ফাইল থেকে রিস্টোর</button>' +
      '<input type="file" id="bk-file" accept=".json" style="display:none">' +
      '<button class="btn red block" id="bk-reset" style="padding:16px">🚨 সম্পূর্ণ রিসেট</button>' +
      '<div style="margin-top:14px;font-size:12px;color:#7a8ab8;text-align:center">⚠️ রিস্টোর করলে সব data মুছে যাবে</div>',
    wide: true,
    onMount: (root, close) => {
      root.querySelector('#bk-dl').addEventListener('click', () => {
        const json = JSON.stringify(DB, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ccbank_backup_' + todayStr() + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('📥 ডাউনলোড', 'ok');
      });
      root.querySelector('#bk-up').addEventListener('click', () => root.querySelector('#bk-file').click());
      root.querySelector('#bk-file').addEventListener('change', async e => {
        const f = e.target.files[0];
        if(!f) return;
        const r = new FileReader();
        r.onload = async ev => {
          try{
            const data = JSON.parse(ev.target.result);
            if(!data || !data.users || !data.baseVault){ alert('❌ ভুল ফাইল'); return; }
            if(!confirmBox('রিস্টোর করবেন? বর্তমান সব data মুছে যাবে!')) return;
            DB = data; normalizeDB();
            DB.__updated = new Date().toISOString();
            saveLocal(); recomputeLive(); await pushCloud();
            renderDashboard(); close();
            toast('✅ রিস্টোর', 'ok');
          } catch(err){ alert('❌ ' + err.message); }
        };
        r.readAsText(f);
      });
      root.querySelector('#bk-reset').addEventListener('click', () => { close(); openDangerZone(); });
    }
  });
}

function openDangerZone(){
  if(SESSION.role !== 'admin'){ toast('❌ শুধু অ্যাডমিন'); return; }
  openModal({
    title: '🚨 ডেঞ্জার জোন',
    bodyHTML:
      '<div style="padding:14px;border-radius:12px;background:rgba(220,38,38,.15);border:2px solid rgba(220,38,38,.5);margin-bottom:14px">' +
        '<div style="font-size:14px;font-weight:900;color:#f87171;margin-bottom:8px">⚠️ সাবধান!</div>' +
        '<div style="font-size:13px;color:#fca5a5;line-height:1.8">Cloud + Local সব data চিরতরে মুছে যাবে</div></div>' +
      '<button class="btn red block" id="dz-clear" style="padding:16px;margin-bottom:10px">🗑️ সব ডেটা মুছুন</button>' +
      '<button class="btn gray block" id="dz-close" style="padding:14px">বাতিল</button>',
    wide: true,
    onMount: (root, close) => {
      root.querySelector('#dz-close').addEventListener('click', close);
      root.querySelector('#dz-clear').addEventListener('click', async () => {
        if(!confirmBox('⚠️ সব data মুছে যাবে!')) return;
        const t1 = prompt('টাইপ করুন: CLEAR');
        if(t1 !== 'CLEAR'){ toast('❌ বাতিল'); return; }
        const t2 = prompt('আবার টাইপ করুন: DELETE ALL');
        if(t2 !== 'DELETE ALL'){ toast('❌ বাতিল'); return; }
        try{
          if(SUPA) await SUPA.from(TABLE).delete().eq('id', ROW_ID);
          localStorage.removeItem(DB_KEY);
          sessionStorage.removeItem(SKEY);
          toast('✅ সব মুছে — ৩ সেকেন্ডে reload', 'ok');
          setTimeout(() => { location.href = location.pathname + '?clean=1'; }, 3000);
        } catch(e){ alert('❌ ' + e.message); }
      });
    }
  });
}
console.log('✅ Managers');