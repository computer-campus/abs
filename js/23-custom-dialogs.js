/* ============================================================
   FILE: js/23-custom-dialogs.js
   PURPOSE: Browser-এর native confirm/alert/prompt কে নিজের
            branded dialog দিয়ে replace করা
   LOAD: before 99-init.js
   VERSION: v1.0
   ============================================================ */
'use strict';

(function(){
  console.log('🎨 Custom Dialogs loading...');

  var BRAND_NAME = 'কম্পিউটার ক্যাম্পাস';

  /* ═══════════════════════════════════════════════════════════
     Helper: HTML escape
     ═══════════════════════════════════════════════════════════ */
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ═══════════════════════════════════════════════════════════
     Common: Dialog shell তৈরি করা
     ═══════════════════════════════════════════════════════════ */
  function createDialog(opts){
    return new Promise(function(resolve){
      var bg = document.createElement('div');
      bg.id = 'cc-dialog-bg';
      bg.style.cssText =
        'position:fixed;inset:0;z-index:99999;' +
        'background:rgba(0,0,0,.75);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'display:flex;align-items:center;justify-content:center;' +
        'padding:20px;animation:ccFadeIn .18s ease';

      // Animation keyframes inject
      if(!document.getElementById('cc-dlg-anim')){
        var style = document.createElement('style');
        style.id = 'cc-dlg-anim';
        style.textContent =
          '@keyframes ccFadeIn{from{opacity:0}to{opacity:1}}' +
          '@keyframes ccPopIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}';
        document.head.appendChild(style);
      }

      var modal = document.createElement('div');
      modal.style.cssText =
        'width:100%;max-width:420px;' +
        'background:linear-gradient(145deg,#0f1428,#050810);' +
        'border:1.5px solid rgba(59,130,246,.5);' +
        'border-radius:18px;overflow:hidden;' +
        'box-shadow:0 24px 80px rgba(0,0,0,.95);' +
        'animation:ccPopIn .25s cubic-bezier(.2,1,.3,1)';

      // ═══ HEADER (Branded!) ═══
      var header = document.createElement('div');
      header.style.cssText =
        'padding:16px 20px;' +
        'background:linear-gradient(145deg,rgba(59,130,246,.15),rgba(167,139,250,.08));' +
        'border-bottom:1.5px solid rgba(59,130,246,.3);' +
        'display:flex;align-items:center;gap:10px';
      header.innerHTML =
        '<div style="font-size:24px;line-height:1">🏛️</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:15px;font-weight:900;color:#fff;letter-spacing:.2px">' + BRAND_NAME + '</div>' +
          '<div style="font-size:10.5px;color:#93c5fd;font-weight:700;margin-top:2px">এজেন্ট ব্যাংকিং সিস্টেম</div>' +
        '</div>';
      modal.appendChild(header);

      // ═══ BODY ═══
      var body = document.createElement('div');
      body.style.cssText = 'padding:22px 20px';

      // Icon + type
      var iconMap = { confirm: '❓', alert: '⚠️', prompt: '✏️' };
      var colorMap = { confirm: '#facc15', alert: '#f87171', prompt: '#22d3ee' };

      var iconRow = document.createElement('div');
      iconRow.style.cssText =
        'display:flex;gap:12px;align-items:flex-start;margin-bottom:' +
        (opts.type === 'prompt' ? '16px' : '0');
      iconRow.innerHTML =
        '<div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;' +
          'display:grid;place-items:center;font-size:22px;' +
          'background:rgba(59,130,246,.1);' +
          'border:1.5px solid ' + (colorMap[opts.type] || '#3b82f6') + '55">' +
          (iconMap[opts.type] || '❓') +
        '</div>' +
        '<div style="flex:1;min-width:0;padding-top:4px;' +
          'font-size:14.5px;color:#e0eaff;font-weight:700;' +
          'line-height:1.6;white-space:pre-line;word-break:break-word">' +
          esc(opts.message || '') +
        '</div>';
      body.appendChild(iconRow);

      var input = null;

      // ═══ PROMPT INPUT ═══
      if(opts.type === 'prompt'){
        input = document.createElement('input');
        input.type = opts.inputType || 'text';
        input.value = opts.defaultValue || '';
        input.style.cssText =
          'width:100%;padding:12px 14px;border-radius:11px;' +
          'background:#050810;border:1.5px solid rgba(59,130,246,.5);' +
          'color:#fff;font-family:inherit;font-size:15px;' +
          'font-weight:700;outline:none;box-sizing:border-box';
        body.appendChild(input);
      }

      modal.appendChild(body);

      // ═══ BUTTONS ═══
      var footer = document.createElement('div');
      footer.style.cssText =
        'padding:14px 20px 18px;display:flex;gap:10px';

      var cancelBtn = null;
      if(opts.type !== 'alert'){
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = opts.cancelText || 'বাতিল';
        cancelBtn.style.cssText =
          'flex:1;padding:12px 16px;border-radius:11px;' +
          'background:linear-gradient(135deg,#475569,#334155);' +
          'border:none;color:#fff;font-family:inherit;' +
          'font-size:14px;font-weight:800;cursor:pointer';
        footer.appendChild(cancelBtn);
      }

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.textContent = opts.okText || 'ঠিক আছে';
      okBtn.style.cssText =
        'flex:1;padding:12px 16px;border-radius:11px;' +
        'border:none;color:#fff;font-family:inherit;' +
        'font-size:14px;font-weight:800;cursor:pointer;' +
        'background:' + (
          opts.type === 'alert' ? 'linear-gradient(135deg,#dc2626,#991b1b)' :
          opts.type === 'prompt' ? 'linear-gradient(135deg,#06b6d4,#0891b2)' :
          'linear-gradient(135deg,#22c55e,#16a34a)'
        );
      footer.appendChild(okBtn);
      modal.appendChild(footer);

      bg.appendChild(modal);
      document.body.appendChild(bg);

      // ═══ Actions ═══
      function cleanup(){
        try { bg.remove(); } catch(e){}
        document.removeEventListener('keydown', escH);
      }

      function onCancel(){
        cleanup();
        if(opts.type === 'prompt') resolve(null);
        else if(opts.type === 'confirm') resolve(false);
        else resolve(undefined);
      }

      function onOk(){
        var result;
        if(opts.type === 'prompt') result = input ? input.value : '';
        else if(opts.type === 'confirm') result = true;
        else result = undefined;
        cleanup();
        resolve(result);
      }

      if(cancelBtn) cancelBtn.addEventListener('click', onCancel);
      okBtn.addEventListener('click', onOk);

      // Click outside → cancel
      bg.addEventListener('click', function(e){
        if(e.target === bg) onCancel();
      });

      // Esc → cancel, Enter → ok
      var escH = function(e){
        if(e.key === 'Escape'){ e.preventDefault(); onCancel(); }
        else if(e.key === 'Enter'){
          // For prompt with textarea allow shift+enter
          if(input && input.tagName === 'TEXTAREA' && e.shiftKey) return;
          e.preventDefault(); onOk();
        }
      };
      document.addEventListener('keydown', escH);

      // Focus
      setTimeout(function(){
        if(input){
          input.focus();
          if(input.setSelectionRange) input.setSelectionRange(input.value.length, input.value.length);
        } else {
          okBtn.focus();
        }
      }, 100);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     GLOBAL OVERRIDES
     ═══════════════════════════════════════════════════════════ */

  // ─── alert → async (returns Promise) ───
  window.ccAlert = function(message, title){
    return createDialog({
      type: 'alert',
      message: message,
      okText: 'ঠিক আছে'
    });
  };

  // ─── confirm → async (returns Promise<boolean>) ───
  window.ccConfirm = function(message, options){
    options = options || {};
    return createDialog({
      type: 'confirm',
      message: message,
      okText: options.okText || 'হ্যাঁ',
      cancelText: options.cancelText || 'বাতিল'
    });
  };

  // ─── prompt → async (returns Promise<string|null>) ───
  window.ccPrompt = function(message, defaultValue, options){
    options = options || {};
    return createDialog({
      type: 'prompt',
      message: message,
      defaultValue: defaultValue || '',
      inputType: options.inputType || 'text',
      okText: options.okText || 'ঠিক আছে',
      cancelText: options.cancelText || 'বাতিল'
    });
  };

  /* ═══════════════════════════════════════════════════════════
     ⚡ IMPORTANT: Native confirm() call করা জায়গাগুলো
        যেহেতু synchronous, তাই আমরা সেগুলোতে intercept করব না
        (ব্রেক করবে)। শুধু confirmBox() কে override করব যেটা
        আপনার সিস্টেমে ব্যবহার হচ্ছে।
     ═══════════════════════════════════════════════════════════ */

  // override confirmBox (async version)
  window.confirmBox = function(message){
    return window.ccConfirm(message);
  };

  // Helper: যেকোনো native confirm call কে branded confirm এ পাঠানো
  // (sync → async conversion এর জন্য promise pattern)
  window.confirmAsync = async function(message, options){
    return await window.ccConfirm(message, options);
  };

  /* ═══════════════════════════════════════════════════════════
     🎯 PATCH: যে জায়গাগুলোতে `confirm()` sync use হচ্ছে
              সেগুলো কাজ করতে থাকবে (native), কিন্তু নতুন
              code এ আমরা ccConfirm() use করব
     ═══════════════════════════════════════════════════════════ */

  // Global Alert override — শুধু sync `alert()` use করলে branded দেখাবে
  // ⚠️ sync alert বন্ধ করব না (ব্রেক হবে), তবুও ccAlert দিয়ে replace করা ভালো

  console.log('✅ Custom Dialogs ready');
  console.log('💡 Use ccAlert(), ccConfirm(), ccPrompt() in new code');

  /* ═══════════════════════════════════════════════════════════
     🧪 DEBUG
     ═══════════════════════════════════════════════════════════ */
  window.__testDialogs = async function(){
    var c = await window.ccConfirm('এটা একটা test confirm — "কম্পিউটার ক্যাম্পাস" header দেখাচ্ছে?');
    console.log('Confirm result:', c);

    var p = await window.ccPrompt('নাম লিখুন:', 'test');
    console.log('Prompt result:', p);

    await window.ccAlert('এটা একটা test alert ✅');
  };

  console.log('💡 Test: __testDialogs()');

})();