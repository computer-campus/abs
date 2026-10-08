/* ============================================================
   FILE: js/04-login.js
   PURPOSE: Login + Logout
   ============================================================ */
'use strict';

async function doLogin(){
  const u = String($('#login-user').value || '').trim();
  const p = String($('#login-pass').value || '').trim();
  const err = $('#login-err');
  const btn = $('#login-btn');

  if(!u || !p){ err.textContent = '⚠️ আইডি ও পাসওয়ার্ড দিন'; return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> যাচাই...';
  err.textContent = '';

  try{
    // ⚡ Cloud থেকে fresh data নামাও (users পাওয়ার জন্য)
    if(SUPA && navigator.onLine){
      await pullCloud();
    }

    // ⚡ Database তে user আছে কি না চেক
    if(!DB.users || !DB.users.length){
      err.textContent = '❌ Database এ কোনো ইউজার নেই';
      btn.disabled = false; btn.innerHTML = '🔐 লগইন';
      return;
    }

    // ⚡ Username match করো
    const user = DB.users.find(x => String(x.username || '').toLowerCase() === u.toLowerCase());

    if(!user){
      err.textContent = '❌ ইউজার পাওয়া যায়নি';
      btn.disabled = false; btn.innerHTML = '🔐 লগইন';
      return;
    }

    // ⚡ Password verify করো (database stored value দিয়ে)
    let ok = false;

    // Priority 1: plainPassword field
    if(user.plainPassword && String(user.plainPassword) === p){
      ok = true;
    }
    // Priority 2: hashed password verify
    else if(verifyPass(p, user.password, user.username)){
      ok = true;
    }

    if(!ok){
      err.textContent = '❌ পাসওয়ার্ড ভুল';
      $('#login-pass').value = '';
      btn.disabled = false; btn.innerHTML = '🔐 লগইন';
      return;
    }

    // ⚡ plainPassword না থাকলে set করো (ভবিষ্যতের জন্য)
    if(!user.plainPassword){
      user.plainPassword = p;
      if(!user.password) user.password = hashPass(p);
    }

    // ⚡ Session set
    SESSION = user;
    VIEW_BRANCH = user.role === 'admin' ? 'all' : user.branch;
    DASH_DATE = todayStr();
    sessionStorage.setItem(SKEY, user.id);

    logActivity('login', '🔓 লগইন', user.name);
    pushCloud();

    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');

    renderTopbar();
    renderDashboard();
    renderSidebar();

    if(READ_ONLY){
      const b = document.createElement('div');
      b.id = 'ro-banner';
      b.innerHTML = '👁️ <b>Read-Only Mode</b> — শুধু দেখা যাবে • কম্পিউটার থেকে sync হবে';
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 12000);
    }

    toast('✅ স্বাগতম, ' + user.name, 'ok');
  } catch(e){
    console.error(e);
    err.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔐 লগইন';
  }
}

async function doLogout(){
  if(!confirmBox('লগআউট করবেন?')) return;
  logActivity('logout', '🔒 লগআউট', SESSION ? SESSION.name : '');
  await pushCloud();
  sessionStorage.removeItem(SKEY);
  SESSION = null;
  location.reload();
}