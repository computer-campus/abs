/* ============================================================
   FILE: managers/mgr-user.js
   PURPOSE: 👥 ইউজার ম্যানেজমেন্ট (Add/Edit/Delete/Password)
   VERSION: v7.2
   ============================================================ */

'use strict';

function openUserManager(){
  if(!requireAdmin('ইউজার')) return;
  
  openModal({
    title: '👥 ইউজার ম্যানেজমেন্ট',
    wide: true,
    bodyHTML:
      // ═════ Add New User Section ═════
      '<div class="cust-box" style="margin-bottom:14px">' +
        '<div class="head"><h4>➕ নতুন ইউজার</h4></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>নাম</label><input type="text" id="u_name" autocomplete="off"></div>' +
          '<div class="field"><label>আইডি</label><input type="text" id="u_user" autocomplete="off"></div>' +
          '<div class="field"><label>পাসওয়ার্ড</label><input type="text" id="u_pass" autocomplete="off"></div>' +
          '<div class="field"><label>আউটলেট</label>' +
            '<select id="u_branch">' +
              '<option value="kalaroa">কলারোয়া</option>' +
              '<option value="jhaudanga">ঝাউডাঙ্গা</option>' +
              '<option value="all">সব</option>' +
            '</select>' +
          '</div>' +
          '<div class="field"><label>রোল</label>' +
            '<select id="u_role">' +
              '<option value="user">ইউজার</option>' +
              '<option value="admin">অ্যাডমিন</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<button class="btn green block" id="u_add" style="margin-top:10px">➕ তৈরি</button>' +
      '</div>' +
      
      // ═════ User List Section ═════
      '<div style="margin-top:14px" id="u_list"></div>',
    
    onMount: (w, close) => {
      const lb = w.querySelector('#u_list');
      
      function render(){
        const list = DB().users || [];
        
        lb.innerHTML =
          '<div class="table-wrap"><table class="tbl"><thead><tr>' +
            '<th>নাম</th><th>আইডি</th><th>পাসওয়ার্ড</th>' +
            '<th>আউটলেট</th><th>রোল</th><th>অ্যাকশন</th>' +
          '</tr></thead><tbody>' +
          list.map(u => {
            const isLastAdmin = u.role === 'admin' &&
              list.filter(x => x.role === 'admin').length <= 1;
            const plain = getPlainPassword(u);
            const pwdDisplay = plain ?
              '<span style="color:#4ade80;font-weight:900;font-family:monospace">' + esc(plain) + '</span>' :
              '<span style="color:#facc15">🔒</span>';
            
            return '<tr>' +
              '<td><b>' + esc(u.name) + '</b></td>' +
              '<td style="font-family:monospace;color:#93c5fd">' + esc(u.username) + '</td>' +
              '<td>' + pwdDisplay + '</td>' +
              '<td>' + (u.branch === 'all' ? 'সব' : esc(BRANCHES[u.branch]?.name || '')) + '</td>' +
              '<td>' + (u.role === 'admin' ? '👑' : '👤') + '</td>' +
              '<td>' +
                '<button class="mini show" data-pwd="' + u.id + '">🔑</button> ' +
                '<button class="mini" data-edit="' + u.id + '">✏️</button> ' +
                '<button class="mini danger" data-del="' + u.id + '" ' + (isLastAdmin ? 'disabled' : '') + '>🗑️</button>' +
              '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table></div>';
        
        // Change Password
        lb.querySelectorAll('[data-pwd]').forEach(b => b.addEventListener('click', async () => {
          if(!requireAdmin('পাসওয়ার্ড')) return;
          const u = DB().users.find(x => x.id === b.dataset.pwd);
          if(!u) return;
          
          const np = prompt('🔑 নতুন পাসওয়ার্ড (' + u.name + '):', getPlainPassword(u) || '');
          if(np === null) return;
          
          const trimmed = np.trim();
          if(!trimmed || trimmed.length < 3){
            alert('❌ কমপক্ষে ৩ অক্ষর');
            return;
          }
          
          u.encryptedPassword = encryptPlain(trimmed);
          u.password = hashPassword(trimmed);
          u.__hashed = true;
          
          addActivityLog({
            type: 'password_change',
            title: '🔑 পাসওয়ার্ড পরিবর্তন',
            detail: u.name
          });
          
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          render();
          toast('✅ ' + trimmed);
        }));
        
        // Edit User
        lb.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', async () => {
          if(!requireAdmin('ইউজার এডিট')) return;
          const u = DB().users.find(x => x.id === b.dataset.edit);
          if(!u) return;
          
          const nn = prompt('📝 নাম:', u.name);
          if(nn === null) return;
          
          const nu = prompt('🆔 আইডি:', u.username);
          if(nu === null) return;
          
          if(DB().users.some(x => x.username === nu.trim() && x.id !== u.id)){
            alert('❌ আইডি আছে');
            return;
          }
          
          u.name = nn.trim();
          u.username = nu.trim();
          
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          render();
          toast('✅ আপডেট');
        }));
        
        // Delete User
        lb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
          if(!requireAdmin('ইউজার ডিলিট')) return;
          const u = DB().users.find(x => x.id === b.dataset.del);
          if(!u) return;
          
          if(u.id === session.id){
            alert('❌ নিজেকে ডিলিট করা যাবে না');
            return;
          }
          
          if(!confirm('ডিলিট?')) return;
          
          DB().users = DB().users.filter(x => x.id !== u.id);
          
          addActivityLog({
            type: 'user_delete',
            title: '🗑️ ইউজার ডিলিট',
            detail: u.name
          });
          
          await saveDB();
          try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
          
          render();
          toast('🗑️ ডিলিট');
        }));
      }
      
      render();
      
      // Add User
      w.querySelector('#u_add').addEventListener('click', async () => {
        if(!requireAdmin('ইউজার তৈরি')) return;
        
        const name = w.querySelector('#u_name').value.trim();
        const username = w.querySelector('#u_user').value.trim();
        const password = w.querySelector('#u_pass').value.trim();
        let branch = w.querySelector('#u_branch').value;
        const role = w.querySelector('#u_role').value;
        
        if(!name || !username || !password){
          alert('❌ সব পূরণ করুন');
          return;
        }
        
        if(DB().users.some(u => u.username.toLowerCase() === username.toLowerCase())){
          alert('❌ আইডি আছে');
          return;
        }
        
        if(role === 'admin') branch = 'all';
        
        DB().users.push({
          id: uid(),
          name,
          username,
          password: hashPassword(password),
          encryptedPassword: encryptPlain(password),
          role,
          branch,
          __hashed: true,
          createdAt: new Date().toISOString()
        });
        
        addActivityLog({
          type: 'user_add',
          title: '👥 নতুন ইউজার',
          detail: name + ' (' + username + ')'
        });
        
        await saveDB();
        try{ pushRemoteDB(true).catch(() => {}); } catch(e){}
        
        render();
        
        w.querySelector('#u_name').value = '';
        w.querySelector('#u_user').value = '';
        w.querySelector('#u_pass').value = '';
        
        toast('✅ তৈরি: ' + username + ' / ' + password);
      });
    }
  });
}

/* ───── END OF FILE managers/mgr-user.js ───── */
console.log('✅ Manager User loaded');