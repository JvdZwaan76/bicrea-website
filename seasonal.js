/* BIC REA — seasonal greeting modal
   Shows once per visitor inside a fixed date window, then goes quiet.
   No third-party code, no tracking; one functional localStorage flag so the
   greeting is not repeated. Safe to leave in place year-round: outside the
   window it does nothing. */
(function () {
  'use strict';

  var CAMPAIGN = 'thanksgiving-2026';
  var START = new Date(2026, 10, 23, 0, 0, 0);   // Mon 23 Nov 2026, local time
  var END   = new Date(2026, 10, 27, 0, 0, 0);   // pauses at 00:00 Fri 27 Nov (after Thanksgiving, Thu 26 Nov)
  var DELAY_MS = 3000;
  var KEY = 'bicrea_seasonal_' + CAMPAIGN;

  var now = new Date();
  if (now < START || now >= END) return;
  if (document.body.classList.contains('no-seasonal')) return;
  if (/^\/(team|client-portal|contact)(\/|$)/.test(location.pathname)) return;   // never over a form or gated page
  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* storage blocked: show once this session */ }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile-first: base rules are the phone layout; min-width/min-height queries add room upward.
  var css = ''
    + '.szn-backdrop{position:fixed;inset:0;z-index:700;background:rgba(10,10,10,.8);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left));opacity:0;transition:opacity .45s ease}'
    + '.szn-backdrop.is-open{opacity:1}'
    + '.szn-card{position:relative;box-sizing:border-box;width:100%;max-width:520px;max-height:100%;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#121212;border:1px solid rgba(212,175,55,.35);border-radius:14px;padding:2.25rem 1.25rem 1.75rem;text-align:center;color:#f5f5f7;box-shadow:0 30px 80px rgba(0,0,0,.6);transform:translateY(14px) scale(.985);transition:transform .5s cubic-bezier(.2,.7,.2,1)}'
    + '.szn-backdrop.is-open .szn-card{transform:none}'
    + '.szn-card::before{content:"";position:absolute;left:50%;top:0;width:110px;height:2px;transform:translateX(-50%);background:linear-gradient(90deg,rgba(212,175,55,0),#d4af37,rgba(212,175,55,0))}'
    + '.szn-dia{display:block;color:#d4af37;font-size:1.25rem;line-height:1;margin-bottom:.75rem}'
    + '.szn-eyebrow{display:block;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:.6875rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#d4af37;margin-bottom:.625rem}'
    + '.szn-title{font-family:Cinzel,"Times New Roman",Georgia,serif;font-weight:600;font-size:clamp(1.5rem,5.5vw,2.125rem);letter-spacing:-.01em;line-height:1.15;margin:0 0 .875rem;color:#f5f5f7;text-wrap:balance}'
    + '.szn-title:focus{outline:none}'
    + '.szn-body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:1rem;line-height:1.6;color:rgba(245,245,247,.84);margin:0 auto 1rem;max-width:40ch;text-wrap:pretty}'
    + '.szn-sign{font-family:Cinzel,"Times New Roman",Georgia,serif;font-size:.875rem;letter-spacing:.08em;color:#d4af37;margin:0 0 1.25rem}'
    + '.szn-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:160px;padding:0 1.5rem;border-radius:999px;background:#d4af37;color:#0a0a0a;font-family:Inter,sans-serif;font-weight:600;font-size:1rem;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '.szn-btn:hover{background:#f4d03f}'
    + '.szn-btn:focus-visible{outline:2px solid #f4d03f;outline-offset:3px}'
    + '.szn-x{position:absolute;top:.75rem;right:.75rem;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(245,245,247,.7);font-size:1.375rem;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '.szn-x:hover{color:#f5f5f7;border-color:rgba(255,255,255,.3)}'
    + '.szn-x:focus-visible{outline:2px solid #d4af37;outline-offset:2px}'
    /* phones from ~390px up: a little more air */
    + '@media (min-width:390px){.szn-card{padding:2.5rem 1.5rem 2rem}}'
    /* very narrow phones / folded devices */
    + '@media (max-width:320px){.szn-card{padding:3.25rem 1rem 1.25rem}.szn-dia{display:none}.szn-eyebrow{letter-spacing:.1em;margin-bottom:.5rem}.szn-title{font-size:1.25rem;margin-bottom:.625rem}.szn-body{font-size:.9375rem;line-height:1.5;margin-bottom:.75rem}.szn-sign{margin-bottom:1rem}.szn-btn{min-width:0;width:100%}}'
    /* tablets and desktop */
    + '@media (min-width:600px){.szn-card{border-radius:16px;padding:2.75rem 2.25rem 2.5rem}.szn-dia{font-size:1.5rem;margin-bottom:1rem}.szn-body{line-height:1.7;margin-bottom:1.25rem}.szn-sign{font-size:.9375rem;margin-bottom:1.75rem}.szn-x{top:1rem;right:1rem}}'
    /* short viewports (landscape phones): compact so the button stays in view without scrolling */
    + '@media (max-height:520px){.szn-card{max-width:640px;padding:1.5rem 1.5rem 1.25rem}.szn-dia,.szn-eyebrow{display:none}.szn-title{font-size:1.375rem;margin-bottom:.5rem}.szn-body{font-size:1rem;line-height:1.45;max-width:50ch;margin-bottom:.75rem}.szn-title{padding:0 2.5rem}.szn-sign{margin-bottom:.875rem}.szn-btn{min-height:44px}}'
    + '@media (prefers-reduced-motion:reduce){.szn-backdrop,.szn-card{transition:none}}';

  function build() {
    var style = document.createElement('style');
    style.setAttribute('data-seasonal', CAMPAIGN);
    style.textContent = css;
    document.head.appendChild(style);

    var backdrop = document.createElement('div');
    backdrop.className = 'szn-backdrop';
    backdrop.innerHTML = ''
      + '<div class="szn-card" role="dialog" aria-modal="true" aria-labelledby="szn-title" aria-describedby="szn-body">'
      + '  <button type="button" class="szn-x" aria-label="Close greeting">&times;</button>'
      + '  <span class="szn-dia" aria-hidden="true">&#9674;</span>'
      + '  <span class="szn-eyebrow">From all of us at BIC REA</span>'
      + '  <h2 id="szn-title" class="szn-title" tabindex="-1">Happy Thanksgiving</h2>'
      + '  <p id="szn-body" class="szn-body">Title work is quiet work &mdash; long days in county records and the discipline to get the chain right. What makes it worthwhile are the people on the other end: partners who pick up the phone, families who share their history, counsel who trust our findings. Thank you for a year of that trust. From our small team in Sarasota, we hope this Thanksgiving finds you with the people who matter most.</p>'
      + '  <p class="szn-sign">With gratitude, the BIC REA team</p>'
      + '  <button type="button" class="szn-btn">Thank you</button>'
      + '</div>';
    document.body.appendChild(backdrop);

    var card = backdrop.querySelector('.szn-card');
    var closeBtns = backdrop.querySelectorAll('.szn-x, .szn-btn');
    var previouslyFocused = document.activeElement;
    var prevOverflow = document.body.style.overflow;

    function close() {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      backdrop.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      var done = function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus(); };
      if (reduce) done(); else setTimeout(done, 460);
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var f = card.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    for (var i = 0; i < closeBtns.length; i++) closeBtns[i].addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      backdrop.classList.add('is-open');
      backdrop.querySelector('#szn-title').focus();
    });
  }

  function ready() { setTimeout(build, DELAY_MS); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
