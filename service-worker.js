/* ============================================================
   FILE: service-worker.js
   PURPOSE: PWA offline shell (only static assets, not DB)
   ============================================================ */
'use strict';

const CACHE_NAME = 'cc-shell-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.json',
  './css/style.css',
  './js/00-core.js',
  './js/00-validate.js',
  './js/01-db.js',
  './js/02-engine.js',
  './js/03-ui.js',
  './js/04-login.js',
  './js/05-customer.js',
  './js/06-dispatcher.js',
  './js/07-audit.js',
  './js/08-managers.js',
  './js/09-notifications.js',
  './js/10-sidebar.js',
  './js/10-print.js',
  './js/11-auto-screenshot.js',
  './js/12-permissions.js',
  './js/13-auto-vault-stock.js',
  './js/14-print-preview.js',
  './js/16-db-browser.js',
  './js/17-secret-admin.js',
  './js/20-online-only.js',
  './js/21-modal-persist.js',
  './js/99-init.js',
  './js/tx/tx-simple-form.js',
  './js/tx/tx-deposit.js',
  './js/tx/tx-expense.js',
  './js/tx/tx-support.js',
  './js/tx/tx-other-bank.js',
  './js/tx/tx-withdrawal.js',
  './js/tx/tx-loan-given.js',
  './js/tx/tx-loan-received.js',
  './js/tx/tx-loan-collection.js',
  './js/tx/tx-branch-transfer.js',
  './js/tx/tx-bank-transfer.js',
  './js/tx/tx-money-exchange.js'
];

/* ── Install: cache shell ── */
self.addEventListener('install', function(event){
  console.log('🔧 SW installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(
        CACHE_ASSETS.map(function(url){
          return cache.add(url).catch(function(e){
            console.warn('Cache skip:', url, e);
          });
        })
      );
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', function(event){
  console.log('✅ SW activated');
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
          .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

/* ── Fetch: static from cache, API always network ── */
self.addEventListener('fetch', function(event){
  var url = new URL(event.request.url);

  // ⚡ Supabase API → always network (online-only!)
  if(url.hostname.indexOf('supabase') !== -1){
    return; // bypass cache
  }

  // ⚡ Google Fonts, CDN → network first, fallback cache
  if(url.hostname.indexOf('googleapis') !== -1 ||
     url.hostname.indexOf('gstatic') !== -1 ||
     url.hostname.indexOf('cdn') !== -1 ||
     url.hostname.indexOf('jsdelivr') !== -1 ||
     url.hostname.indexOf('cloudflare') !== -1){
    event.respondWith(
      fetch(event.request).catch(function(){
        return caches.match(event.request);
      })
    );
    return;
  }

  // ⚡ Local assets → cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, clone).catch(function(){});
          });
        }
        return response;
      });
    }).catch(function(){
      // Offline fallback → serve index.html
      if(event.request.mode === 'navigate'){
        return caches.match('./index.html');
      }
    })
  );
});

/* ── Message: skip waiting ── */
self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});