/* ============================================================
   FILE: js/08-managers.js — COMPLETE FRESH
   PURPOSE: Branch + User + Backup + Danger Zone
   VERSION: v5.0
   ============================================================ */
'use strict';

/* ═══════════════════════════════════════════════════════════
   🏢 BRANCH MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function openBranchMgmt(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return;
  }

  var activeB = 'kalaroa';

  function bodyHTML(){
    var a = DB.baseAccounts[activeB] || { bank: 0, cash: 0, other: 0 };
    var v = DB.baseVault[activeB] || {};
    var cap = Number(DB.branchCapital[activeB]) || 0;
    var vTotal = DENOMS.reduce(function(s, d){ return s + (Number(v[d]) || 0) * d; }, 0);

    var html = '';

    // Branch tabs
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    Object.entries(BRANCHES).forEach(function(e){
      var k = e[0], val = e[1];
      var isActive = (activeB === k);
      html += '<button type="button" class="btn ' + (isActive ? 'blue' : 'gray') + ' sm" data-btab="' + k + '" style="flex:1;padding:10px;font-weight:900">' + val.name + '</button>';
    });
    html += '</div>';

    // Capital
    html += '<div class="form-row">' +
      '<div class="field"><label style="color:#facc15 !important">💰 মূলধন</label>' +
        '<input type="text" inputmode="decimal" id="bm-cap" value="' + cap + '" style="color:#facc15;font-weight:900"></div>' +
    '</div>';

    // Accounts
    html += '<div class="form-row">' +
      '<div class="field"><label>🏦 মাদার অ্যাকাউন্ট</label>' +
        '<input type="text" inputmode="decimal" id="bm-bank" value="' + a.bank + '"></div>' +
      '<div class="field"><label>🏛️ অন্যান্য</label>' +
        '<input type="text" inputmode="decimal" id="bm-other" value="' + a.other + '"></div>' +
    '</div>';

    // Vault
    html += '<div class="notes-col out" style="margin-top:12px">' +
      '<h4>🗄️ বেস ভল্ট</h4>' +
      denomRowHTML('bv', v, {}) +
      '<div class="sum-line"><span>মোট</span><b id="bv-sum">৳ ' + fmt(vTotal) + '</b></div>' +
    '</div>';

    // Buttons
    html += '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn green" id="bm-save" style="flex:1">💾 সেভ</button>' +
      '<button class="btn red" id="bm-reset">🔄 রিসেট</button>' +
    '</div>';

    return html;
  }

  var m = openModal({
    title: '🏢 আউটলেট ম্যানেজমেন্ট',
    bodyHTML: '<div id="bm-body">' + bodyHTML() + '</div>',
    wide: true,
    onMount: function(root, close){
      var bodyEl = root.querySelector('#bm-body');

      function rebind(){
        var bvSum = function(){
          var bn = readNotes(bodyEl, 'bv');
          var el = bodyEl.querySelector('#bv-sum');
          if(el) el.textContent = '৳ ' + fmt(sumNotes(bn));
        };

        setupDenomInputs(bodyEl, 'bv', bvSum);
        attachAmountInput(bodyEl.querySelector('#bm-cap'));
        attachAmountInput(bodyEl.querySelector('#bm-bank'));
        attachAmountInput(bodyEl.querySelector('#bm-other'));

        // Branch tabs
        bodyEl.querySelectorAll('[data-btab]').forEach(function(b){
          b.addEventListener('click', function(){
            activeB = b.dataset.btab;
            bodyEl.innerHTML = bodyHTML();
            rebind();
          });
        });

        // Save
        bodyEl.querySelector('#bm-save').addEventListener('click', async function(){
          var cap = parseNum(bodyEl.querySelector('#bm-cap').value);
          var bank = parseNum(bodyEl.querySelector('#bm-bank').value);
          var other = parseNum(bodyEl.querySelector('#bm-other').value);
          var bv = readNotes(bodyEl, 'bv');

          DB.baseAccounts[activeB] = { bank: bank, cash: sumNotes(bv), other: other };
          DB.baseVault[activeB] = {};
          DENOMS.forEach(function(d){ DB.baseVault[activeB][d] = Number(bv[d]) || 0; });
          DB.branchCapital[activeB] = cap;
          DB.totalCapital = Object.values(DB.branchCapital).reduce(function(s, x){ return s + (Number(x) || 0); }, 0);

          if(typeof logActivity === 'function'){
            logActivity('vault_update', '🗄️ আউটলেট আপডেট', BRANCHES[activeB].name, cap);
          }

          DB.__updated = new Date().toISOString();
          if(typeof saveLocal === 'function') saveLocal();
          if(typeof recomputeLive === 'function') recomputeLive();
          if(typeof renderDashboard === 'function') renderDashboard();
          if(typeof pushCloud === 'function'){
            try { await pushCloud(); } catch(e){}
          }
          if(typeof toast === 'function') toast('✅ সেভ হয়েছে', 'ok');
        });

        // Reset
        bodyEl.querySelector('#bm-reset').addEventListener('click', async function(){
          if(!confirm('🔄 রিসেট করবেন?')) return;
          DB.baseAccounts[activeB] = { bank: 0, cash: 0, other: 0 };
          DB.baseVault[activeB] = {};
          DENOMS.forEach(function(d){ DB.baseVault[activeB][d] = 0; });
          DB.branchCapital[activeB] = 0;
          DB.totalCapital = Object.values(DB.branchCapital).reduce(function(s, x){ return s + (Number(x) || 0); }, 0);
          DB.__updated = new Date().toISOString();
          if(typeof saveLocal === 'function') saveLocal();
          if(typeof recomputeLive === 'function') recomputeLive();
          if(typeof renderDashboard === 'function') renderDashboard();
          if(typeof pushCloud === 'function'){
            try { await pushCloud(); } catch(e){}
          }
          bodyEl.innerHTML = bodyHTML();
          rebind();
          if(typeof toast === 'function') toast('🔄 রিসেট', 'ok');
        });
      }

      rebind();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   👥 USER MANAGEMENT — Fresh Working Version
   ═══════════════════════════════════════════════════════════ */
function openUserMgmt(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return;
  }

  // ⚡ AUTO-CLEAR stale user tombstones (প্রতি বার User Manager খুললে)
  try {
    var usernamesCount = Object.keys(DB.deletedUsernames || {}).length;
    var idsCount = Object.keys(DB.deletedUserIds || {}).length;

    if(usernamesCount > 0 || idsCount > 0){
      console.log('🧹 Auto-clearing user tombstones (' + usernamesCount + ' usernames, ' + idsCount + ' IDs)');
      DB.deletedUsernames = {};
      DB.deletedUserIds = {};
      if(typeof saveLocal === 'function') saveLocal();
      // Silent push
      if(typeof pushCloud === 'function') pushCloud().catch(function(){});
    }
  } catch(e){}

  /* ═══ Render HTML ═══ */
  function buildHTML(){
    var users = DB.users || [];
    var html = '';

    // ═══ Add New User Form ═══
    html += '<div style="padding:14px;border-radius:12px;background:linear-gradient(145deg,rgba(59,130,246,.08),rgba(0,0,0,.3));border:1.5px solid rgba(59,130,246,.35);margin-bottom:14px">';
    html += '<div style="font-size:13px;color:#93c5fd;font-weight:900;margin-bottom:10px;text-transform:uppercase">➕ নতুন ইউজার তৈরি</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
      '<div><label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:5px;text-transform:uppercase">নাম *</label>' +
      '<input type="text" id="nu-name" placeholder="পূর্ণ নাম" style="width:100%;padding:11px 13px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;outline:none;box-sizing:border-box"></div>' +

      '<div><label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:5px;text-transform:uppercase">ইউজার আইডি *</label>' +
      '<input type="text" id="nu-user" placeholder="username" style="width:100%;padding:11px 13px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;outline:none;box-sizing:border-box"></div>' +

      '<div><label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:5px;text-transform:uppercase">পাসওয়ার্ড *</label>' +
      '<input type="text" id="nu-pass" placeholder="পাসওয়ার্ড" style="width:100%;padding:11px 13px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;outline:none;box-sizing:border-box"></div>' +

      '<div><label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:5px;text-transform:uppercase">রোল</label>' +
      '<select id="nu-role" style="width:100%;padding:11px 13px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;outline:none;box-sizing:border-box;cursor:pointer">' +
        '<option value="user">👤 ইউজার</option>' +
        '<option value="admin">👑 অ্যাডমিন</option>' +
      '</select></div>' +

      '<div style="grid-column:1/-1"><label style="display:block;font-size:11.5px;color:#93c5fd;font-weight:800;margin-bottom:5px;text-transform:uppercase">আউটলেট</label>' +
      '<select id="nu-branch" style="width:100%;padding:11px 13px;border-radius:10px;background:#050810;border:1.5px solid rgba(59,130,246,.35);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;outline:none;box-sizing:border-box;cursor:pointer">' +
        Object.entries(BRANCHES).map(function(e){
          return '<option value="' + e[0] + '">' + e[1].name + '</option>';
        }).join('') +
        '<option value="all">🌐 সব আউটলেট</option>' +
      '</select></div>' +
    '</div>';

    html += '<button id="nu-save" style="width:100%;padding:13px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer">💾 ইউজার তৈরি করুন</button>';
    html += '</div>';

    // ═══ User List ═══
    html += '<div style="padding:10px 14px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(59,130,246,.25);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">' +
      '<div style="font-size:12px;color:#93c5fd;font-weight:800">📊 মোট ইউজার</div>' +
      '<div style="font-size:16px;color:#fff;font-weight:900">' + toBn(users.length) + ' জন</div>' +
    '</div>';

    if(!users.length){
      html += '<div style="padding:30px;text-align:center;color:#7a8ab8;font-size:13px">📭 কোনো ইউজার নেই</div>';
      return html;
    }

    html += '<div style="max-height:45vh;overflow-y:auto;border-radius:10px;border:1px solid rgba(59,130,246,.15)">' +
      '<table style="width:100%;border-collapse:collapse">' +
      '<thead><tr>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">#</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">নাম</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">আইডি</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">পাসওয়ার্ড</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">রোল</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:left;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">আউটলেট</th>' +
        '<th style="padding:10px 12px;background:rgba(59,130,246,.15);color:#93c5fd;text-align:center;font-size:11px;font-weight:900;border-bottom:1.5px solid rgba(59,130,246,.3);position:sticky;top:0;z-index:1">অ্যাকশন</th>' +
      '</tr></thead><tbody>';

    users.forEach(function(u, i){
      var isSecret = u.__secret === true;
      var isSelf = u.id === SESSION.id;
      var plainPwd = (typeof getPlainPassword === 'function') ? getPlainPassword(u) : (u.plainPassword || '—');
      if(!plainPwd) plainPwd = '—';

      html += '<tr>' +
        '<td style="padding:9px 12px;color:#7a8ab8;font-size:11.5px;border-bottom:1px solid rgba(59,130,246,.08)">' + toBn(i + 1) + '</td>' +
        '<td style="padding:9px 12px;color:#fff;font-size:12.5px;font-weight:800;border-bottom:1px solid rgba(59,130,246,.08)">' +
          esc(u.name || '—') +
          (isSecret ? ' <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.5);color:#f87171;font-weight:900">🔐</span>' : '') +
          (isSelf ? ' <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-weight:900">👤</span>' : '') +
        '</td>' +
        '<td style="padding:9px 12px;color:#93c5fd;font-family:monospace;font-size:12px;font-weight:800;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(u.username || '—') + '</td>' +
        '<td style="padding:9px 12px;color:#4ade80;font-weight:900;font-family:monospace;font-size:12px;border-bottom:1px solid rgba(59,130,246,.08)">' + esc(plainPwd) + '</td>' +
        '<td style="padding:9px 12px;font-size:12px;border-bottom:1px solid rgba(59,130,246,.08)">' + (u.role === 'admin' ? '👑 অ্যাডমিন' : '👤 ইউজার') + '</td>' +
        '<td style="padding:9px 12px;font-size:11.5px;color:#a5b4d8;border-bottom:1px solid rgba(59,130,246,.08)">' +
          (u.branch === 'all' ? '🌐 সব' : esc(BRANCHES[u.branch]?.name || '—')) +
        '</td>' +
        '<td style="padding:9px 12px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(59,130,246,.08)">';

      if(isSecret){
        html += '<span style="font-size:11px;color:#f87171;font-weight:800">🔒 Protected</span>';
      } else {
        html += '<button class="mini" data-user-edit="' + esc(u.id) + '" style="padding:4px 9px;font-size:11px;background:rgba(250,204,21,.15);border:1px solid rgba(250,204,21,.4);color:#facc15;margin-right:3px;border-radius:6px;cursor:pointer">✏️</button>';
        html += '<button class="mini" data-user-pwd="' + esc(u.id) + '" style="padding:4px 9px;font-size:11px;background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.4);color:#c4b5fd;margin-right:3px;border-radius:6px;cursor:pointer">🔑</button>';
        if(!isSelf){
          html += '<button class="mini danger" data-user-del="' + esc(u.id) + '" style="padding:4px 9px;font-size:11px;background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.4);color:#f87171;border-radius:6px;cursor:pointer">🗑️</button>';
        }
      }

      html += '</td></tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /* ═══ Open Modal ═══ */
  var m = openModal({
    title: '👥 ইউজার ম্যানেজমেন্ট',
    bodyHTML: '<div id="um-content">' + buildHTML() + '</div>',
    xwide: true,
    onMount: function(root, close){
      var contentEl = root.querySelector('#um-content');

      function refresh(){
        contentEl.innerHTML = buildHTML();
        wireAll();
      }

      function wireAll(){
        // ═══ Save New User ═══
        var saveBtn = contentEl.querySelector('#nu-save');
        if(saveBtn){
          saveBtn.addEventListener('click', async function(){
            try {
              var name = contentEl.querySelector('#nu-name').value.trim();
              var username = contentEl.querySelector('#nu-user').value.trim();
              var password = contentEl.querySelector('#nu-pass').value.trim();
              var role = contentEl.querySelector('#nu-role').value;
              var branch = contentEl.querySelector('#nu-branch').value;

              // Validate
              if(!name){ alert('⚠️ নাম দিন'); return; }
              if(!username){ alert('⚠️ ইউজার আইডি দিন'); return; }
              if(!password){ alert('⚠️ পাসওয়ার্ড দিন'); return; }
              if(password.length < 3){ alert('⚠️ পাসওয়ার্ড কমপক্ষে ৩ অক্ষর'); return; }

              // Duplicate
              var exists = (DB.users || []).some(function(u){
                return String(u.username || '').toLowerCase() === username.toLowerCase();
              });
              if(exists){
                alert('❌ এই ইউজার আইডি আগেই আছে');
                return;
              }

              if(role === 'admin') branch = 'all';

              saveBtn.disabled = true;
              saveBtn.innerHTML = '<span class="spin"></span> তৈরি হচ্ছে...';

              // Create
              var newUser = {
                id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: name,
                username: username,
                password: (typeof hashPass === 'function') ? hashPass(password) : password,
                plainPassword: password,
                role: role,
                branch: branch,
                __hashed: true,
                createdAt: new Date().toISOString()
              };

              if(!DB.users) DB.users = [];
              DB.users.push(newUser);

              console.log('✅ User created:', username, '| Total:', DB.users.length);

              if(typeof logActivity === 'function'){
                logActivity('user_add', '👥 নতুন ইউজার', name + ' (' + username + ')');
              }

              DB.__updated = new Date().toISOString();
              if(typeof saveLocal === 'function') saveLocal();
              if(typeof pushCloud === 'function'){
                try { await pushCloud(); } catch(e){ console.warn('Push:', e); }
              }

              // Toast
              if(typeof toast === 'function'){
                toast('✅ ইউজার তৈরি — ' + username + ' / ' + password, 'ok');
              }

              // ⚡ CLOSE + REOPEN (100% refresh)
              close();
              setTimeout(function(){
                openUserMgmt();
              }, 400);

            } catch(err){
              console.error('User create error:', err);
              alert('❌ ' + err.message);
              if(saveBtn){
                saveBtn.disabled = false;
                saveBtn.innerHTML = '💾 ইউজার তৈরি করুন';
              }
            }
          });
        }

        // ═══ Edit User ═══
        contentEl.querySelectorAll('[data-user-edit]').forEach(function(b){
          b.addEventListener('click', async function(){
            var uid = b.dataset.userEdit;
            var u = DB.users.find(function(x){ return x.id === uid; });
            if(!u) return;

            var newName = prompt('নাম:', u.name || '');
            if(newName === null) return;
            if(!newName.trim()){ alert('⚠️ নাম দিন'); return; }

            var newUsername = prompt('ইউজার আইডি:', u.username || '');
            if(newUsername === null) return;
            if(!newUsername.trim()){ alert('⚠️ আইডি দিন'); return; }

            var dup = DB.users.some(function(x){
              return x.id !== uid && String(x.username || '').toLowerCase() === newUsername.toLowerCase();
            });
            if(dup){ alert('❌ এই আইডি আগেই আছে'); return; }

            u.name = newName.trim();
            u.username = newUsername.trim();
            u.updatedAt = new Date().toISOString();

            if(typeof logActivity === 'function'){
              logActivity('user_update', '✏️ ইউজার আপডেট', u.name);
            }

            DB.__updated = new Date().toISOString();
            if(typeof saveLocal === 'function') saveLocal();
            if(typeof pushCloud === 'function'){
              try { await pushCloud(); } catch(e){}
            }

            close();
            setTimeout(function(){ openUserMgmt(); }, 300);

            if(typeof toast === 'function') toast('✅ আপডেট সফল', 'ok');
          });
        });

        // ═══ Change Password ═══
        contentEl.querySelectorAll('[data-user-pwd]').forEach(function(b){
          b.addEventListener('click', async function(){
            var uid = b.dataset.userPwd;
            var u = DB.users.find(function(x){ return x.id === uid; });
            if(!u) return;

            var newPwd = prompt('নতুন পাসওয়ার্ড (' + u.name + '):', '');
            if(newPwd === null) return;
            if(!newPwd.trim() || newPwd.trim().length < 3){
              alert('⚠️ কমপক্ষে ৩ অক্ষর');
              return;
            }

            u.password = (typeof hashPass === 'function') ? hashPass(newPwd.trim()) : newPwd.trim();
            u.plainPassword = newPwd.trim();
            u.updatedAt = new Date().toISOString();

            if(typeof logActivity === 'function'){
              logActivity('password_change', '🔑 পাসওয়ার্ড পরিবর্তন', u.name);
            }

            DB.__updated = new Date().toISOString();
            if(typeof saveLocal === 'function') saveLocal();
            if(typeof pushCloud === 'function'){
              try { await pushCloud(); } catch(e){}
            }

            close();
            setTimeout(function(){ openUserMgmt(); }, 300);

            if(typeof toast === 'function') toast('✅ পাসওয়ার্ড — ' + newPwd.trim(), 'ok');
          });
        });

        // ═══ Delete User ═══
        contentEl.querySelectorAll('[data-user-del]').forEach(function(b){
          b.addEventListener('click', async function(){
            var uid = b.dataset.userDel;
            var u = DB.users.find(function(x){ return x.id === uid; });
            if(!u) return;

            if(u.__secret){
              if(typeof toast === 'function') toast('🔒 Protected', 'err');
              return;
            }
            if(u.id === SESSION.id){
              if(typeof toast === 'function') toast('❌ নিজেকে delete নয়', 'err');
              return;
            }

            if(!confirm('🗑️ "' + u.name + '" delete করবেন?\n\n@' + u.username)) return;

            // ⚡ Simply remove from users array — no tombstone
            DB.users = DB.users.filter(function(x){ return x.id !== uid; });
            console.log('🗑️ User deleted:', u.username, '| Remaining:', DB.users.length);

            if(typeof logActivity === 'function'){
              logActivity('user_delete', '🗑️ ইউজার ডিলিট', u.name + ' (' + u.username + ')');
            }

            DB.__updated = new Date().toISOString();
            if(typeof saveLocal === 'function') saveLocal();
            if(typeof pushCloud === 'function'){
              try { await pushCloud(); } catch(e){}
            }

            close();
            setTimeout(function(){ openUserMgmt(); }, 300);

            if(typeof toast === 'function') toast('🗑️ Delete সফল', 'ok');
          });
        });
      }

      wireAll();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   💾 BACKUP MANAGER
   ═══════════════════════════════════════════════════════════ */
function openBackupMgmt(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return;
  }

  openModal({
    title: '💾 ব্যাকআপ / রিস্টোর',
    bodyHTML:
      '<button class="btn green block" id="bk-dl" style="margin-bottom:10px;padding:16px">📥 এখনই ব্যাকআপ ডাউনলোড</button>' +
      '<button class="btn blue block" id="bk-up" style="margin-bottom:10px;padding:16px">📤 ফাইল থেকে রিস্টোর</button>' +
      '<input type="file" id="bk-file" accept=".json" style="display:none">' +
      '<button class="btn red block" id="bk-reset" style="padding:16px">🚨 সম্পূর্ণ রিসেট</button>' +
      '<div style="margin-top:14px;font-size:12px;color:#7a8ab8;text-align:center">⚠️ রিস্টোর করলে সব data মুছে যাবে</div>',
    wide: true,
    onMount: function(root, close){
      root.querySelector('#bk-dl').addEventListener('click', function(){
        var json = JSON.stringify(DB, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ccbank_backup_' + todayStr() + '.json';
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
        if(typeof toast === 'function') toast('📥 ডাউনলোড', 'ok');
      });

      root.querySelector('#bk-up').addEventListener('click', function(){
        root.querySelector('#bk-file').click();
      });

      root.querySelector('#bk-file').addEventListener('change', async function(e){
        var f = e.target.files[0];
        if(!f) return;
        var r = new FileReader();
        r.onload = async function(ev){
          try {
            var data = JSON.parse(ev.target.result);
            if(!data || !data.users || !data.baseVault){ alert('❌ ভুল ফাইল'); return; }
            if(!confirm('রিস্টোর করবেন? বর্তমান সব data মুছে যাবে!')) return;
            window.db = data;
            if(typeof normalizeDB === 'function') normalizeDB();
            DB.__updated = new Date().toISOString();
            if(typeof saveLocal === 'function') saveLocal();
            if(typeof recomputeLive === 'function') recomputeLive();
            if(typeof pushCloud === 'function'){
              try { await pushCloud(); } catch(e){}
            }
            if(typeof renderDashboard === 'function') renderDashboard();
            close();
            if(typeof toast === 'function') toast('✅ রিস্টোর হয়েছে', 'ok');
          } catch(err){
            alert('❌ ' + err.message);
          }
        };
        r.readAsText(f);
      });

      root.querySelector('#bk-reset').addEventListener('click', function(){
        close();
        openDangerZone();
      });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🚨 DANGER ZONE
   ═══════════════════════════════════════════════════════════ */
function openDangerZone(){
  if(!SESSION || SESSION.role !== 'admin'){
    if(typeof toast === 'function') toast('🔒 শুধু অ্যাডমিন');
    return;
  }

  openModal({
    title: '🚨 ডেঞ্জার জোন',
    bodyHTML:
      '<div style="padding:14px;border-radius:12px;background:rgba(220,38,38,.15);border:2px solid rgba(220,38,38,.5);margin-bottom:14px">' +
        '<div style="font-size:14px;font-weight:900;color:#f87171;margin-bottom:8px">⚠️ সাবধান!</div>' +
        '<div style="font-size:13px;color:#fca5a5;line-height:1.8">Cloud + Local সব data চিরতরে মুছে যাবে</div>' +
      '</div>' +
      '<button class="btn red block" id="dz-clear" style="padding:16px;margin-bottom:10px">🗑️ সব ডেটা মুছুন</button>' +
      '<button class="btn gray block" id="dz-close" style="padding:14px">বাতিল</button>',
    wide: true,
    onMount: function(root, close){
      root.querySelector('#dz-close').addEventListener('click', close);

      root.querySelector('#dz-clear').addEventListener('click', async function(){
        if(!confirm('⚠️ সব data মুছে যাবে!')) return;
        var t1 = prompt('টাইপ করুন: CLEAR');
        if(t1 !== 'CLEAR'){ if(typeof toast === 'function') toast('❌ বাতিল'); return; }
        var t2 = prompt('আবার টাইপ করুন: DELETE ALL');
        if(t2 !== 'DELETE ALL'){ if(typeof toast === 'function') toast('❌ বাতিল'); return; }

        try {
          if(window.SUPA){
            await SUPA.from('agent_bank').delete().eq('id', 'cc_agent_bank_main');
          }
          localStorage.removeItem('cc_agent_bank_local');
          sessionStorage.removeItem('cc_session');
          if(typeof toast === 'function') toast('✅ সব মুছে — ৩ সেকেন্ডে reload', 'ok');
          setTimeout(function(){ location.href = location.pathname + '?clean=1'; }, 3000);
        } catch(e){
          alert('❌ ' + e.message);
        }
      });
    }
  });
}

console.log('✅ Managers loaded — v5.0 (fresh user manager)');