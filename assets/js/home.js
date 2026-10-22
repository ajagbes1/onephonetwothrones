/* Home page only: load animation, hero video (loads on tap), scroll scene, reveal-on-scroll. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(function () { setTimeout(function () { root.classList.add('loaded'); }, 60); });

  // Hero video: the photo shows first (fast, no third-party request). A tap loads the video with sound.
  var play = doc.getElementById('heroPlay'), id = (window.SITE_CONFIG || {}).HERO_VIDEO_ID || '';
  if (play) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) { play.remove(); }
    else play.addEventListener('click', function () {
      var screen = play.closest('.screen'), ifr = doc.createElement('iframe');
      ifr.className = 'vid';
      ifr.title = '1 Phone, 2 Thrones video';
      ifr.allow = 'autoplay; encrypted-media; picture-in-picture';
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&loop=1&playlist=' + id + '&controls=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3';
      $$('img, .chip', screen).forEach(function (n) { n.remove(); });
      play.remove();
      screen.appendChild(ifr);
      ifr.focus();
    });
  }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  // Reveal once: the formula, the 30 dots, and the mobile throne cards
  var targets = $$('#formula, #weeks, .throne');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.35 });
    targets.forEach(function (t) { io.observe(t); });
  } else targets.forEach(function (t) { t.classList.add('in'); });

  // One phone opening into two thrones (desktop only, no motion if the visitor prefers less)
  var split = doc.getElementById('principle');
  if (!split) return;
  var desktop = window.matchMedia('(min-width: 861px)'), ticking = false;
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function update() {
    ticking = false;
    if (desktop.matches && !reduce) {
      var r = split.getBoundingClientRect(), total = split.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, (-r.top) / (total * .8)));
      split.style.setProperty('--p', ease(p).toFixed(4));
    } else split.style.setProperty('--p', 1);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } });
  update();
})();
