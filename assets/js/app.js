/*
 * Talks to the Apps Script backend.
 * - Reads (events) use GET and carry no personal data.
 * - Anything with a name or email is sent as a POST body, never in the URL.
 * - Content-Type is text/plain on purpose: Apps Script cannot answer CORS preflight requests, and a
 *   text/plain POST is a "simple" request that skips it. The body is still JSON.
 */
window.P2T = window.P2T || {};
(function (P2T) {
  'use strict';

  function base() { return (window.SITE_CONFIG || {}).APPS_SCRIPT_URL || ''; }

  function parse(res) {
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  }

  P2T.apiReady = function () { return !!base(); };

  var evCache = null, evAt = 0;
  P2T.getEvents = function () {
    if (!base()) return Promise.resolve([]);
    if (evCache && Date.now() - evAt < 60000) return evCache; // one request serves the hero strip and the list
    evAt = Date.now();
    evCache = fetch(base() + '?api=events', { method: 'GET' }).then(parse).then(function (r) {
      return r && r.ok && Array.isArray(r.events) ? r.events : [];
    });
    evCache.catch(function () { evCache = null; });
    return evCache;
  };

  P2T.getLessons = function () {
    if (!base()) return Promise.resolve([]);
    return fetch(base() + '?api=lessons', { method: 'GET' }).then(parse).then(function (r) {
      return r && r.ok && Array.isArray(r.lessons) ? r.lessons : [];
    });
  };

  // Settings kept in the Sheet (Settings > Featured video). Falls back to config.js if the Sheet cannot be reached.
  var siteCache = null;
  P2T.getSite = function () {
    if (siteCache) return siteCache;
    var fallback = { videoId: (window.SITE_CONFIG || {}).HERO_VIDEO_ID || '', cover: '' };
    if (!base()) return (siteCache = Promise.resolve(fallback));
    siteCache = fetch(base() + '?api=site', { method: 'GET' }).then(parse).then(function (r) {
      return r && r.ok && /^[A-Za-z0-9_-]{11}$/.test(r.videoId || '') ? { videoId: r.videoId, cover: String(r.cover || '') } : fallback;
    }).catch(function () { return fallback; });
    return siteCache;
  };

  /** action: 'subscribe' | 'signup' | 'registerEvent' | 'speaking' | 'contact'. Resolves to the server's JSON answer. */
  P2T.post = function (action, fields, openedAt) {
    if (!base()) return Promise.resolve({ ok: false, error: 'Sign-up is not connected yet. Please try again later.' });
    var body = Object.assign({}, fields, { action: action, fillMs: openedAt ? Date.now() - openedAt : undefined });
    return fetch(base(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    }).then(parse);
  };

  /** Only allow http(s) links from the Sheet into href attributes. */
  P2T.safeUrl = function (u) {
    try {
      var x = new URL(String(u), location.href);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '#';
    } catch (e) { return '#'; }
  };

  P2T.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
})(window.P2T);

/* Shared behaviour for every page: navigation, forms, events, curriculum, video, small helpers.
   Depends on config.js (window.SITE_CONFIG) and api.js (window.P2T). No other libraries. */
(function () {
  'use strict';
  var P2T = window.P2T, doc = document, root = doc.documentElement;
  var pageOpenedAt = Date.now();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var qs = new URLSearchParams(location.search);

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } }

  /* ---------- navigation ---------- */
  safe(function () {
    var nav = $('#nav'), btn = $('#menuBtn'), bar = $('#bar');
    if (!nav) return;
    var more = $('.more', nav);
    // On phones the "More" links sit inside the open menu; on desktop they live in a dropdown.
    var small = window.matchMedia('(max-width: 1020px)');
    function syncMore() { if (more) more.open = small.matches; }
    syncMore();
    small.addEventListener('change', syncMore);

    function setOpen(open) {
      nav.classList.toggle('open', open);
      doc.body.classList.toggle('nav-open', open);
      if (btn) { btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
    }
    if (btn) btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (nav.classList.contains('open')) { setOpen(false); if (btn) btn.focus(); }
      if (more && more.open && !small.matches) { more.open = false; $('summary', more).focus(); }
    });
    doc.addEventListener('click', function (e) { if (more && more.open && !small.matches && !more.contains(e.target)) more.open = false; });
    window.matchMedia('(min-width: 1021px)').addEventListener('change', function () { setOpen(false); });

    var ticking = false;
    function update() {
      ticking = false;
      var h = root.scrollHeight - window.innerHeight, y = window.pageYOffset;
      if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
      nav.classList.toggle('solid', y > 30);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  });

  /* ---------- challenge links ---------- */
  safe(function () {
    // The sign-up form lives on /challenge. These links just go there and keep ?src= for tracking.
    var src = qs.get('src');
    if (!src) return;
    $$('a[data-keep-src]').forEach(function (a) { a.href = a.getAttribute('href') + (a.getAttribute('href').indexOf('?') < 0 ? '?' : '&') + 'src=' + encodeURIComponent(src); });
  });

  /* ---------- forms ---------- */
  var EMAIL = /^[A-Za-z0-9][A-Za-z0-9._%+\-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  var DONE = {
    subscribe: { check: ['Check your email', 'Tap the confirm button in the email we just sent. Look in Promotions or spam if you do not see it in a few minutes.'],
      already: ["You're already subscribed", "You'll get the next video as soon as it goes up."] },
    signup: { pending: ['Check your email to confirm', 'We sent you a confirmation email. Tap the button in it to start the challenge. Day 1 arrives the day after you confirm. Look in Promotions or spam if it is not in your inbox.'],
      already: ["You're already in the challenge", 'Look out for the next email in your inbox.'],
      waitlist: ["You're on the waitlist", 'The challenge is full for now. We will email you as soon as a place opens.'] },
    speaking: { received: ['Invitation received', 'Thank you. Samuel will review it and reply by email.'], already: ['We already have this invitation', 'We received the same invitation recently, so we did not add it again.'] },
    contact: { received: ['Message received', 'Thank you. We will reply by email.'], already: ['We already have this message', 'We received the same message recently.'] }
  };

  function fieldErr(form, name, msg) {
    var input = form.elements[name], box = $('#err-' + name, form);
    if (!input) return;
    var el = input.length ? input[0] : input;
    if (box) box.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  function validate(form) {
    var first = null, bad = false;
    $$('[name]', form).forEach(function (el) {
      if (el.name === 'website') return;
      var v = el.type === 'checkbox' ? el.checked : String(el.value || '').trim(), msg = '';
      if (el.hasAttribute('required') && (el.type === 'checkbox' ? !v : !v)) msg = el.dataset.msg || 'This field is required.';
      else if (v && el.type === 'email' && (v.length > 254 || !EMAIL.test(v))) msg = 'Enter a valid email address, for example name@example.com.';
      else if (v && el.minLength > 0 && v.length < el.minLength) msg = 'Please write at least ' + el.minLength + ' characters.';
      else if (v && el.type === 'date' && el.min && v < el.min) msg = 'Choose today or a later date.';
      fieldErr(form, el.name, msg);
      if (msg) { bad = true; if (!first) first = el; }
    });
    if (first) first.focus();
    return !bad;
  }

  function wireForm(form) {
    var action = form.dataset.action, wrap = form.closest('.form') || form.parentNode;
    var btn = $('button[type=submit]', form), label = btn ? btn.textContent : '', status = $('.msg', form);
    var minDate = $('input[type=date]', form);
    if (minDate) minDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    $$('[name]', form).forEach(function (el) {
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) fieldErr(form, el.name, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn && btn.disabled) return;
      status.className = 'msg'; status.textContent = '';
      if (!validate(form)) { status.className = 'msg err'; status.textContent = 'Please fix the highlighted fields.'; return; }
      if (!P2T.apiReady()) { status.className = 'msg err'; status.textContent = 'This form is not connected yet. Please try again later or email onephonetwothrones@gmail.com.'; return; }

      var data = {};
      $$('[name]', form).forEach(function (el) {
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else if (el.value !== '') data[el.name] = el.value;
      });
      if (action === 'subscribe' || action === 'signup') data.source = String(qs.get('src') || data.source || form.dataset.source || 'Website').slice(0, 60);
      if (form.dataset.subject && !data.subject) data.subject = form.dataset.subject;

      btn.disabled = true; btn.textContent = 'Sending...'; form.setAttribute('aria-busy', 'true');
      P2T.post(action, data, pageOpenedAt).then(function (res) {
        if (res && res.ok) {
          var map = (DONE[action] || {})[res.state] || (DONE[action] || {})[Object.keys(DONE[action] || {})[0]] || ['Done', 'Thank you.'];
          $('.done-title', wrap).textContent = map[0];
          $('.done-text', wrap).textContent = map[1];
          var ref = $('.done-ref', wrap);
          if (ref) { ref.hidden = !res.id; if (res.id) $('.ref', ref).textContent = res.id; }
          wrap.classList.add('ok');
          var t = $('.done-title', wrap); t.setAttribute('tabindex', '-1'); t.focus();
        } else {
          status.className = 'msg err';
          status.textContent = (res && res.error) || 'Something went wrong. Please try again in a moment.';
        }
      }).catch(function () {
        status.className = 'msg err';
        status.textContent = 'Connection problem. Check your internet and try again. Nothing was lost: your answers are still in the form.';
      }).then(function () { btn.disabled = false; btn.textContent = label; form.removeAttribute('aria-busy'); });
    });
  }
  safe(function () { $$('form[data-action]').forEach(wireForm); });

  /* ---------- events list ---------- */
  safe(function () {
    var box = $('#events-list');
    if (!box) return;
    var limit = Number(box.dataset.limit) || 20;
    var esc = P2T.esc;
    function empty(text) {
      box.innerHTML = '<div class="empty event-empty"><p>' + text + '</p><div class="btns"><a class="btn solid" href="/#subscribe">Get told about the next event</a></div></div>';
    }
    if (!P2T.apiReady()) { empty('Events will appear here soon.'); return; }
    box.innerHTML = '<p class="loading" role="status">Loading events...</p>';
    P2T.getEvents().then(function (events) {
      events = events.slice(0, limit);
      if (!events.length) { empty('No events are open for registration right now. Subscribe and you will hear about the next one first.'); return; }
      box.innerHTML = '<ul class="events" style="list-style:none;padding:0;margin:40px 0 0">' + events.map(function (e) {
        return '<li class="event"><div class="date"><span class="d">' + esc(e.day) + '</span><span class="m">' + esc((e.wk ? e.wk + ' ' : '') + (e.mon || '')) + '</span></div>' +
          '<div><h3>' + esc(e.title) + '</h3><div class="meta"><time datetime="' + esc(e.ts ? new Date(Number(e.ts)).toISOString() : '') + '">' + esc(e.date || '') + ' at ' + esc(e.time) + ' WAT</time><span class="loc">' + esc(e.where) + '. <span class="price">' + esc(e.price) + '</span></span></div></div>' +
          '<a class="btn solid" href="' + esc(P2T.safeUrl(e.url)) + '">Register<span class="sr-only"> for ' + esc(e.title) + '</span></a></li>';
      }).join('') + '</ul>';
    }).catch(function () {
      box.innerHTML = '<div class="empty event-empty"><p>We could not load the events just now. Please check your connection and <a href="">try again</a>.</p></div>';
    });
  });

  /* ---------- hero: next event strip and live lesson titles ---------- */
  safe(function () {
    var ne = $('#next-event');
    if (ne && P2T.apiReady()) {
      P2T.getEvents().then(function (events) {
        if (!events.length) return;
        var e = events[0];
        $('#ne-title', ne).textContent = e.title;
        $('#ne-when', ne).textContent = [e.date, e.where].filter(Boolean).join(' · ');
        ne.hidden = false;
      }).catch(function () { /* the strip simply stays hidden */ });
    }
    var cards = $$('[data-day]');
    if (cards.length && P2T.apiReady()) {
      P2T.getLessons().then(function (lessons) {
        lessons.forEach(function (l) {
          $$('[data-day="' + Number(l.day) + '"]').forEach(function (el) { el.textContent = l.title; });
        });
      }).catch(function () { /* keep the printed titles */ });
    }
  });

  /* ---------- challenge curriculum ---------- */
  safe(function () {
    var box = $('#curriculum'); // the 30 days are already printed in the page; this swaps in the live Sheet wording
    if (!box || !P2T.apiReady()) return;
    P2T.getLessons().then(function (lessons) {
      if (!lessons.length) return;
      var weeks = {};
      lessons.forEach(function (l) { (weeks[l.week] = weeks[l.week] || { title: l.weekTitle, items: [] }).items.push(l); });
      $$('details', box).forEach(function (d) {
        var wk = weeks[d.dataset.week];
        if (!wk) return;
        var old = $('ol', d);
        if (old) old.remove();
        var ol = doc.createElement('ol');
        ol.innerHTML = wk.items.map(function (l) {
          return '<li><b>Day ' + Number(l.day) + '</b><div>' + P2T.esc(l.title) + '<span>' + P2T.esc(l.preview) + '</span></div></li>';
        }).join('');
        d.appendChild(ol);
      });
    }).catch(function () { /* keep the four-week summary */ });
  });

  /* ---------- video facades ---------- */
  safe(function () {
    // The featured video comes from the Sheet (Settings > Featured video); config.js is the fallback.
    // The page ships with the cover picture of the config.js video. If the Sheet names a different video,
    // its cover is used instead (the script fetches it, so visitors never contact YouTube before pressing play).
    var frames = $$('.vframe[data-yt="CONFIG"], .vframe.vlink');
    if (!frames.length) return;
    var cfgId = (window.SITE_CONFIG || {}).HERO_VIDEO_ID || '';
    P2T.getSite().then(function (site) {
      frames.forEach(function (f) {
        var id = site.videoId;
        if (!id) { f.hidden = true; return; }
        var img = $('img.cover', f);
        if (id !== cfgId) {
          if (site.cover && img) img.src = site.cover; else if (img) img.remove();
        } else if (site.cover && img) img.src = site.cover;
        if (f.classList.contains('vlink')) return;
        f.dataset.yt = id;
        wireVideo(f);
      });
    });
  });
  function wireVideo(f) {
    safe(function () {
      var id = f.dataset.yt, b = $('button', f), auto = f.hasAttribute('data-autoplay'), embed = f.hasAttribute('data-embed');
      if (!/^[A-Za-z0-9_-]{11}$/.test(id) || (!b && !auto && !embed)) { f.hidden = true; return; }
      function start() {
        var ifr = doc.createElement('iframe');
        ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=' + (embed ? 0 : 1) + '&rel=0&playsinline=1&modestbranding=1';
        ifr.title = f.dataset.title || 'Video';
        ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        ifr.allowFullscreen = true;
        f.replaceChildren(ifr);
        if (!auto && !embed) ifr.focus();
      }
      if (b) b.addEventListener('click', start);
      // The Videos page shows its featured video straight away, with sound where the browser allows it
      // The home page shows the video in its phone from the start, but waits for a press on play
      if (auto || embed) start();
    });
  }
  safe(function () {
    $$('.vframe[data-yt]:not([data-yt="CONFIG"])').forEach(wireVideo);
  });

  /* ---------- pause button for the scrolling topics ---------- */
  safe(function () {
    $$('[data-pause]').forEach(function (b) {
      var target = $(b.dataset.pause);
      if (!target) return;
      b.addEventListener('click', function () {
        var p = target.classList.toggle('paused');
        b.textContent = p ? 'Play animation' : 'Pause animation';
        b.setAttribute('aria-pressed', p ? 'true' : 'false');
      });
    });
  });

  /* ---------- footer year ---------- */
  safe(function () { $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); }); });
})();
