/* ============================================================
   FILE: js/22-device-info.js
   PURPOSE: Detect device type + location (GeoIP + GPS optional)
   LOAD: after 09-notifications.js, before 20-online-only.js
   VERSION: v1.0
   ============================================================ */
'use strict';

(function(){
  console.log('📍 Device Info loading...');

  /* ═══════════════════════════════════════════════════════════
     1️⃣ DEVICE DETECTION
     ═══════════════════════════════════════════════════════════ */
  function getDeviceType(){
    var ua = navigator.userAgent || '';
    var w = window.innerWidth || 0;

    if(/iPad|Tablet/i.test(ua)) return '📟 ট্যাবলেট';
    if(/iPhone/i.test(ua)) return '📱 iPhone';
    if(/Android/i.test(ua)){
      if(/Mobile/i.test(ua)) return '📱 Android';
      return '📟 Android Tablet';
    }
    if(/Windows/i.test(ua)) return '💻 Windows PC';
    if(/Macintosh|Mac OS X/i.test(ua)) return '💻 Mac';
    if(/Linux/i.test(ua)) return '💻 Linux';

    if(w < 768) return '📱 Mobile';
    if(w < 1024) return '📟 Tablet';
    return '💻 Desktop';
  }

  function getBrowserName(){
    var ua = navigator.userAgent || '';
    if(/Edg\//i.test(ua)) return 'Edge';
    if(/OPR\//i.test(ua)) return 'Opera';
    if(/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
    if(/Firefox/i.test(ua)) return 'Firefox';
    if(/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    return 'Browser';
  }

  function getOSName(){
    var ua = navigator.userAgent || '';
    if(/Windows NT 10/i.test(ua)) return 'Windows 10/11';
    if(/Windows/i.test(ua)) return 'Windows';
    if(/Android (\d+)/i.test(ua)) return 'Android ' + RegExp.$1;
    if(/iPhone OS (\d+)/i.test(ua)) return 'iOS ' + RegExp.$1;
    if(/Mac OS X/i.test(ua)) return 'macOS';
    if(/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  /* ═══════════════════════════════════════════════════════════
     2️⃣ NETWORK / IP INFO (free API, no key)
     ═══════════════════════════════════════════════════════════ */
  var __ipInfoCache = null;
  var __ipInfoPromise = null;

  async function fetchIPInfo(){
    if(__ipInfoCache) return __ipInfoCache;
    if(__ipInfoPromise) return __ipInfoPromise;

    // ⚡ Try localStorage cache (24h)
    try {
      var cached = localStorage.getItem('cc_ip_info');
      if(cached){
        var parsed = JSON.parse(cached);
        if(parsed && (Date.now() - parsed.__cachedAt < 24 * 60 * 60 * 1000)){
          __ipInfoCache = parsed;
          console.log('📍 IP info from cache');
          return parsed;
        }
      }
    } catch(e){}

    __ipInfoPromise = (async function(){
      // ⚡ Try multiple APIs
      var apis = [
        'https://ipapi.co/json/',
        'https://api.ipify.org?format=json',
        'https://ipinfo.io/json'
      ];

      for(var i = 0; i < apis.length; i++){
        try {
          console.log('📍 Trying IP API:', apis[i]);
          var res = await fetch(apis[i], { cache: 'no-store' });
          if(!res.ok) continue;
          var data = await res.json();

          // Normalize different API responses
          var info = {
            ip:    data.ip    || data.query || '—',
            city:  data.city  || data.city   || '—',
            region: data.region || data.regionName || '—',
            country: data.country_name || data.country || '—',
            countryCode: data.country_code || data.countryCode || '',
            isp:   data.org   || data.isp    || '—',
            timezone: data.timezone || '—',
            __cachedAt: Date.now()
          };

          // Success check
          if(info.ip && info.ip !== '—'){
            __ipInfoCache = info;
            try { localStorage.setItem('cc_ip_info', JSON.stringify(info)); } catch(e){}
            console.log('📍 IP info:', info);
            return info;
          }
        } catch(e){
          console.warn('📍 API failed:', apis[i], e.message);
        }
      }

      // All failed
      return { ip: '—', city: '—', region: '—', country: '—', isp: '—', __cachedAt: Date.now() };
    })();

    return __ipInfoPromise;
  }

  /* ═══════════════════════════════════════════════════════════
     3️⃣ OPTIONAL GPS (user approval লাগবে)
     ═══════════════════════════════════════════════════════════ */
  var __gpsCache = null;
  var __gpsPromise = null;

  function getGPSCoords(){
    if(__gpsCache) return Promise.resolve(__gpsCache);
    if(__gpsPromise) return __gpsPromise;
    if(!navigator.geolocation) return Promise.resolve(null);

    __gpsPromise = new Promise(function(resolve){
      // 5 second timeout
      var timeout = setTimeout(function(){ resolve(null); }, 5000);

      navigator.geolocation.getCurrentPosition(
        function(pos){
          clearTimeout(timeout);
          var coords = {
            lat: pos.coords.latitude.toFixed(4),
            lon: pos.coords.longitude.toFixed(4),
            accuracy: Math.round(pos.coords.accuracy)
          };
          __gpsCache = coords;
          console.log('📍 GPS:', coords);
          resolve(coords);
        },
        function(err){
          clearTimeout(timeout);
          console.log('📍 GPS denied/failed:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    });

    return __gpsPromise;
  }

  /* ═══════════════════════════════════════════════════════════
     4️⃣ GET COMPLETE DEVICE + LOCATION INFO
     ═══════════════════════════════════════════════════════════ */
  window.getDeviceInfo = async function(){
    var ipInfo = await fetchIPInfo();
    var gps = await getGPSCoords();

    var device = getDeviceType();
    var browser = getBrowserName();
    var os = getOSName();
    var screenRes = (window.screen.width || 0) + '×' + (window.screen.height || 0);

    // Build display string
    var locParts = [];
    if(ipInfo.city && ipInfo.city !== '—') locParts.push(ipInfo.city);
    if(ipInfo.region && ipInfo.region !== '—' && ipInfo.region !== ipInfo.city) locParts.push(ipInfo.region);
    if(ipInfo.country && ipInfo.country !== '—') locParts.push(ipInfo.country);

    var locStr = locParts.length ? locParts.join(', ') : '—';

    return {
      device: device,
      browser: browser,
      os: os,
      screen: screenRes,
      ip: ipInfo.ip || '—',
      city: ipInfo.city || '—',
      region: ipInfo.region || '—',
      country: ipInfo.country || '—',
      isp: ipInfo.isp || '—',
      timezone: ipInfo.timezone || '—',
      location: locStr,
      gps: gps,
      userAgent: (navigator.userAgent || '').substring(0, 120),
      at: new Date().toISOString()
    };
  };

  /* ═══════════════════════════════════════════════════════════
     5️⃣ FORMAT HELPERS
     ═══════════════════════════════════════════════════════════ */
  window.formatDeviceShort = function(info){
    if(!info) return '—';
    var parts = [];
    if(info.device) parts.push(info.device);
    if(info.location && info.location !== '—') parts.push('📍 ' + info.location);
    return parts.join(' • ') || '—';
  };

  window.formatDeviceFull = function(info){
    if(!info) return '—';
    var lines = [];
    lines.push('📱 ' + (info.device || '—'));
    lines.push('🌐 ' + (info.browser || '—') + ' • ' + (info.os || '—'));
    lines.push('📍 ' + (info.location || '—'));
    if(info.isp && info.isp !== '—') lines.push('📡 ' + info.isp);
    if(info.ip && info.ip !== '—') lines.push('🔢 ' + info.ip);
    if(info.gps) lines.push('🛰️ GPS: ' + info.gps.lat + ', ' + info.gps.lon);
    return lines.join('\n');
  };

  /* ═══════════════════════════════════════════════════════════
     6️⃣ INITIALIZE — load on app start (background)
     ═══════════════════════════════════════════════════════════ */
  // Pre-fetch IP info on startup
  setTimeout(function(){
    fetchIPInfo().then(function(){
      console.log('✅ IP info ready');
    });
  }, 2000);

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__deviceInfo = async function(){
    var info = await window.getDeviceInfo();
    console.log('═══════════════════════════════════');
    console.log('📍 DEVICE + LOCATION INFO');
    console.log('═══════════════════════════════════');
    console.log('Device:', info.device);
    console.log('Browser:', info.browser);
    console.log('OS:', info.os);
    console.log('Screen:', info.screen);
    console.log('City:', info.city);
    console.log('Region:', info.region);
    console.log('Country:', info.country);
    console.log('ISP:', info.isp);
    console.log('IP:', info.ip);
    console.log('GPS:', info.gps);
    console.log('═══════════════════════════════════');
    return info;
  };

  console.log('✅ Device Info loaded — v1.0');

})();