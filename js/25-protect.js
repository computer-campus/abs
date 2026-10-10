/* ============================================================
   FILE: js/25-protect.js
   PURPOSE: Content protection — Save/Source/Copy block
   VERSION: v1.0
   ============================================================ */
'use strict';

(function(){
  console.log('🛡️ Content Protection loading...');

  /* ═══════════════════════════════════════════════════════════
     1️⃣ DISABLE RIGHT CLICK (Context Menu)
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('contextmenu', function(e){
    // Allow right-click only inside input fields (for paste)
    var target = e.target;
    var isInput = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;

    if(!isInput){
      e.preventDefault();
      if(typeof toast === 'function'){
        toast('🔒 Right-click নিষ্ক্রিয়', 'warn');
      }
      return false;
    }
  }, false);

  /* ═══════════════════════════════════════════════════════════
     2️⃣ BLOCK KEYBOARD SHORTCUTS
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', function(e){
    var key = (e.key || '').toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey; // metaKey = Mac Cmd

    // ⚡ Ctrl+S — Save
    if(ctrl && key === 's'){
      e.preventDefault();
      e.stopPropagation();
      if(typeof toast === 'function') toast('🔒 Page save নিষ্ক্রিয়', 'warn');
      return false;
    }

    // ⚡ Ctrl+U — View Source
    if(ctrl && key === 'u'){
      e.preventDefault();
      e.stopPropagation();
      if(typeof toast === 'function') toast('🔒 Source দেখা নিষ্ক্রিয়', 'warn');
      return false;
    }

    // ⚡ Ctrl+P — Print
    if(ctrl && key === 'p'){
      e.preventDefault();
      e.stopPropagation();
      if(typeof toast === 'function') toast('🔒 Print নিষ্ক্রিয় (app এর ভিতরে print আছে)', 'warn');
      return false;
    }

    // ⚡ Ctrl+Shift+I — DevTools
    if(ctrl && e.shiftKey && key === 'i'){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // ⚡ Ctrl+Shift+J — Console
    if(ctrl && e.shiftKey && key === 'j'){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // ⚡ Ctrl+Shift+C — Inspect Element
    if(ctrl && e.shiftKey && key === 'c'){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // ⚡ Ctrl+A — Select All (except inputs)
    if(ctrl && key === 'a'){
      var t = e.target;
      var isInput = t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.isContentEditable;
      if(!isInput){
        e.preventDefault();
        return false;
      }
    }

    // ⚡ F12 — DevTools
    if(e.key === 'F12' || e.keyCode === 123){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // ⚡ Ctrl+Shift+Delete — Clear cache
    if(ctrl && e.shiftKey && key === 'delete'){
      e.preventDefault();
      return false;
    }

  }, true);

  /* ═══════════════════════════════════════════════════════════
     3️⃣ DISABLE TEXT SELECTION (body-level)
     ═══════════════════════════════════════════════════════════ */
  // CSS দিয়ে selection disable
  var style = document.createElement('style');
  style.id = 'cc-protect-css';
  style.textContent =
    // Body এ selection বন্ধ
    'body{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    // তবে input, textarea এ allow করব
    'input,textarea,[contenteditable],.allow-select{-webkit-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}' +
    // Drag বন্ধ
    'img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;pointer-events:none}' +
    'img.allow-drag{pointer-events:auto}';
  document.head.appendChild(style);

  /* ═══════════════════════════════════════════════════════════
     4️⃣ DISABLE DRAG
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('dragstart', function(e){
    var target = e.target;
    if(target.tagName === 'IMG' || target.tagName === 'A'){
      e.preventDefault();
      return false;
    }
  });

  /* ═══════════════════════════════════════════════════════════
     5️⃣ DISABLE COPY (except inputs)
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('copy', function(e){
    var target = e.target;
    var isInput = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;

    if(!isInput){
      e.preventDefault();
      if(typeof toast === 'function') toast('🔒 Copy নিষ্ক্রিয়', 'warn');
      return false;
    }
  });

  document.addEventListener('cut', function(e){
    var target = e.target;
    var isInput = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;

    if(!isInput){
      e.preventDefault();
      return false;
    }
  });

  /* ═══════════════════════════════════════════════════════════
     6️⃣ MOBILE LONG-PRESS
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('touchstart', function(e){
    var target = e.target;
    var isInput = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA';

    if(!isInput && e.touches.length > 1){
      e.preventDefault();
    }
  }, { passive: false });

  // Long-press context menu block (already handled by contextmenu)

  /* ═══════════════════════════════════════════════════════════
     7️⃣ DISABLE DEVTOOLS — Simple trick (not 100%)
     ═══════════════════════════════════════════════════════════ */
  // console.log wrapper (hides logs from casual inspection)
  var noop = function(){};
  try {
    // Set flag to know protection is active
    console.log('%c🔒 Protected', 'color:#dc2626;font-weight:bold');

    // ⚠️ DevTools detection (optional — disabled by default)
    // কারণ এটা user experience খারাপ করতে পারে
  } catch(e){}

  /* ═══════════════════════════════════════════════════════════
     8️⃣ IFRAME PROTECTION (block embedding)
     ═══════════════════════════════════════════════════════════ */
  try {
    if(window.top !== window.self){
      // Someone is trying to embed our site in an iframe
      // Redirect top window to our page
      if(window.top.location.href !== window.location.href){
        try { window.top.location = window.location.href; } catch(e){}
      }
    }
  } catch(e){}

  /* ═══════════════════════════════════════════════════════════
     9️⃣ RIGHT-CLICK ON IMAGE / LOGO — extra protection
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('mousedown', function(e){
    if(e.button === 2){ // right click
      var target = e.target;
      if(target.tagName === 'IMG' || target.tagName === 'SVG'){
        e.preventDefault();
        return false;
      }
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🔟 CSS ANIMATION FOR SELECTION
     ═══════════════════════════════════════════════════════════ */
  // Double-click select বন্ধ
  document.addEventListener('selectstart', function(e){
    var target = e.target;
    var isInput = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;

    if(!isInput){
      e.preventDefault();
      return false;
    }
  });

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__protectionStatus = function(){
    console.log('═══════════════════════════════════');
    console.log('🛡️ PROTECTION STATUS');
    console.log('═══════════════════════════════════');
    console.log('Right-click: 🚫 blocked');
    console.log('Ctrl+S: 🚫 blocked');
    console.log('Ctrl+U: 🚫 blocked');
    console.log('Ctrl+P: 🚫 blocked');
    console.log('F12: 🚫 blocked');
    console.log('Copy: 🚫 blocked (except inputs)');
    console.log('Selection: 🚫 disabled');
    console.log('Drag: 🚫 disabled');
    console.log('IFrame embed: 🚫 prevented');
    console.log('═══════════════════════════════════');
  };

  console.log('✅ Content Protection active');

})();