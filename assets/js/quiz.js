/* The Throne Check quiz. Questions, tips and results are the original wording.
   Depends on app.js (window.P2T). The result is sent with the newsletter sign-up by POST, never in a URL. */
(function () {
  'use strict';
  var P2T = window.P2T, doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var openedAt = Date.now();

  // Each answer scores 0 (consumption) to 3 (purpose). Options are not in score order on purpose.
  var Q = [
    { area: 'Mornings', q: 'When you pick up your phone first thing in the morning, you usually...', o: [
      ['Scroll social media until I am running late', 0], ['Pray, plan or learn something before opening any feed', 3],
      ['Check messages and news, then scroll a bit', 1], ['Check a few important things, then start my day', 2] ] },
    { area: 'Screen time', q: 'Most of your daily screen time goes to...', o: [
      ['Work, learning and building something', 3], ['Entertainment and endless scrolling', 0],
      ['Work, chats and a little learning', 2], ['Chatting and some entertainment', 1] ] },
    { area: 'Learning', q: 'In the last month, how much have you learned on your phone?', o: [
      ['I saved some videos to watch later', 1], ['Nothing I can name', 0],
      ['A course or steady skill practice most weeks', 3], ['A few useful tutorials', 2] ] },
    { area: 'Creating', q: 'How often do you post something useful of your own (not just reposts)?', o: [
      ['Weekly or more', 3], ['Rarely, when I feel like it', 1], ['Never', 0], ['A few times a month', 2] ] },
    { area: 'Visibility', q: 'If someone searched your name online today, they would find...', o: [
      ['Nothing, or only old photos', 0], ['A profile that says what I do', 2],
      ['Clear proof of my skill or work', 3], ['Some personal posts', 1] ] },
    { area: 'Income', q: 'Does your phone earn you money, or help you earn it?', o: [
      ['Not yet, but I am working on it', 1], ['Yes, regularly', 3], ['No, it mostly costs me data', 0], ['Sometimes', 2] ] },
    { area: 'Faith', q: 'How does your phone fit with your faith?', o: [
      ['I use it to grow and to encourage or serve others', 3], ['It mostly distracts me from it', 0],
      ['I sometimes use it for the Bible or devotionals', 2], ['I keep the two separate', 1] ] },
    { area: 'Serving', q: 'In the last week, did you use your phone to help someone?', o: [
      ['Not that I remember', 0], ['I shared something helpful', 1],
      ['Yes, I taught, answered or encouraged several people', 3], ['Yes, once or twice', 2] ] },
    { area: 'Mindset', q: 'After a long scroll, you usually feel...', o: [
      ['Mostly fine', 2], ['Behind, and worse about myself', 0], ['Inspired and ready to act', 3], ['Nothing much, just tired', 1] ] },
    { area: 'Boundaries', q: 'Do you have phone-free times, like meals, family time or rest?', o: [
      ['A few habits', 2], ['Never, it is always in my hand', 0], ['Yes, on purpose, every day', 3], ['Sometimes, by accident', 1] ] }
  ];
  var TIPS = {
    'Mornings': 'Give the first 20 minutes of your day to prayer, planning or learning before you open any feed.',
    'Screen time': 'Check your screen time tonight. Move one hour a day from scrolling to one thing you want to grow in.',
    'Learning': 'Pick one skill and one free course. Give it 30 minutes a day for the next two weeks.',
    'Creating': 'Post one useful thing this week: a tip, a lesson or something you made. It does not need to be perfect.',
    'Visibility': 'Update one profile so a stranger can tell in five seconds what you do and who you help.',
    'Income': 'Write down one skill someone would pay for, and one person you could offer it to this month.',
    'Faith': 'Use your phone to encourage one person this week with a verse, a voice note or a prayer.',
    'Serving': 'Answer one real question someone has in your area this week. Helping is how influence starts.',
    'Mindset': 'Unfollow five accounts that leave you feeling behind, and follow five that teach you something.',
    'Boundaries': 'Choose one phone-free time every day, such as meals or the last hour before bed, and keep it for a week.'
  };
  var R = [
    { max: 10, z: 0, title: 'The Consumption Throne', sum: 'Right now your phone is mostly serving the kingdom of consumption. That is honest, and it is where most people start. The good news: the same phone can change your life once you point it somewhere.' },
    { max: 20, z: 1, title: 'The Divided Throne', sum: 'Your phone serves both kingdoms. Some days it builds, other days it drains. A few deliberate habits will tip it firmly towards purpose.' },
    { max: 30, z: 2, title: 'The Purpose Throne', sum: 'Your phone is already serving purpose. You use it to learn, build and serve. Your next step is consistency, and helping others do the same.' }
  ];
  var EMAIL = /^[A-Za-z0-9][A-Za-z0-9._%+\-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  var KEYS = ['A', 'B', 'C', 'D'];

  var ans = new Array(Q.length), i = 0, result = null, subscribed = false, moving = false;
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return P2T.esc(s); }

  function show(id, focusId) {
    ['sIntro', 'sQuiz', 'sResult'].forEach(function (s) { $(s).classList.toggle('on', s === id); });
    var f = focusId && $(focusId);
    if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    var top = $('qz').getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }

  function render(focus) {
    var q = Q[i];
    $('count').textContent = (i + 1) + ' of ' + Q.length;
    $('fill').style.width = (i / Q.length * 100) + '%';
    $('progress').setAttribute('aria-valuenow', String(i + 1));
    $('qText').textContent = q.q;
    $('prev').style.visibility = i ? 'visible' : 'hidden';
    var box = $('opts'); box.innerHTML = '';
    q.o.forEach(function (o, k) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'qz-opt' + (ans[i] === k ? ' picked' : '');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', ans[i] === k ? 'true' : 'false');
      b.innerHTML = '<span class="k" aria-hidden="true">' + KEYS[k] + '</span><span></span>';
      b.lastChild.textContent = o[0];
      b.addEventListener('click', function () { pick(k); });
      box.appendChild(b);
    });
    if (focus) { var t = $('qText'); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }

  function pick(k) {
    if (moving) return;
    moving = true;
    ans[i] = k;
    [].forEach.call($('opts').children, function (el, n) { el.classList.toggle('picked', n === k); el.setAttribute('aria-checked', n === k ? 'true' : 'false'); });
    setTimeout(function () {
      moving = false;
      if (i < Q.length - 1) { i++; render(true); } else finish();
    }, reduce ? 0 : 260);
  }

  function finish() {
    $('fill').style.width = '100%';
    var per = Q.map(function (q, n) { return { area: q.area, s: q.o[ans[n]][1] }; });
    var total = per.reduce(function (a, b) { return a + b.s; }, 0);
    var band = R.filter(function (r) { return total <= r.max; })[0];
    result = { total: total, per: per, band: band, label: band.title + ' (' + total + '/30)' };
    $('rTitle').textContent = band.title;
    $('rSummary').textContent = band.sum;
    $('rScore').textContent = total;
    [].forEach.call(doc.querySelectorAll('.qz-zones span'), function (s) { s.classList.toggle('on', +s.dataset.z === band.z); });
    $('marker').style.left = '0%';
    show('sResult', 'rTitle');
    setTimeout(function () { $('marker').style.left = (total / 30 * 100) + '%'; }, reduce ? 0 : 150);
    var url = location.origin + '/quiz';
    $('shareWa').href = 'https://wa.me/?text=' + encodeURIComponent('I got "' + band.title + '" on the Throne Check. Which throne is your phone serving? ' + url);
    // The breakdown is free: it shows straight away. The email sign-up below it is optional.
    $('gate').hidden = subscribed;
    unlock('free');
  }

  function unlock(mode) {
    var per = result.per.slice();
    $('areas').innerHTML = per.map(function (a) {
      return '<div class="qz-area"><span class="t">' + esc(a.area) + '</span><span class="b"><i data-w="' + (a.s / 3 * 100) + '"></i></span><span class="n">' + a.s + '/3</span></div>';
    }).join('');
    setTimeout(function () { [].forEach.call(doc.querySelectorAll('.qz-area .b i'), function (el) { el.style.width = el.dataset.w + '%'; }); }, reduce ? 0 : 80);
    var low = per.map(function (a, n) { return { a: a, n: n }; }).sort(function (x, y) { return x.a.s - y.a.s || x.n - y.n; }).slice(0, 3);
    $('tips').innerHTML = low.map(function (x) { return '<li><b>' + esc(x.a.area) + '</b>' + esc(TIPS[x.a.area]) + '</li>'; }).join('');
    $('checkNote').textContent = mode === 'already' ? "You're already subscribed, so there's nothing to confirm."
      : mode === 'new' ? 'Check your email and tap the confirm button to finish subscribing.' : '';
    $('full').hidden = false;
    var h = $('fullTitle'); h.setAttribute('tabindex', '-1');
    if (mode === 'new' || mode === 'already') { $('gate').hidden = true; $('checkNote').focus({ preventScroll: true }); }
  }

  $('start').addEventListener('click', function () { i = 0; ans = new Array(Q.length); render(false); show('sQuiz', 'qText'); });
  $('prev').addEventListener('click', function () { if (i && !moving) { i--; render(true); } });
  $('retake').addEventListener('click', function () { ans = new Array(Q.length); i = 0; render(false); show('sQuiz', 'qText'); });
  $('shareCopy').addEventListener('click', function () {
    var u = location.origin + '/quiz', b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { b.textContent = 'Link copied'; }, function () { b.textContent = u; });
  });

  // Keyboard: A to D or 1 to 4 pick an answer; arrow keys move between answers
  doc.addEventListener('keydown', function (e) {
    if (!$('sQuiz').classList.contains('on') || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 }[String(e.key).toLowerCase()];
    if (k !== undefined) { e.preventDefault(); pick(k); return; }
    var btns = [].slice.call($('opts').children), at = btns.indexOf(doc.activeElement);
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].indexOf(e.key) >= 0 && btns.length) {
      e.preventDefault();
      var step = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      btns[(at + step + btns.length) % btns.length].focus();
    }
  });

  function fieldErr(id, errId, msg) {
    var el = $(id), box = $(errId);
    box.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  $('gf').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('gm'), b = $('gb'), label = b.textContent;
    m.className = 'msg'; m.textContent = '';
    var first = $('fn').value.trim(), email = $('em').value.trim();
    fieldErr('fn', 'err-fn', ''); fieldErr('em', 'err-em', ''); fieldErr('cs', 'err-cs', ''); fieldErr('ad', 'err-ad', '');
    var bad = null;
    if (!first) { fieldErr('fn', 'err-fn', 'Enter your first name.'); bad = bad || 'fn'; }
    if (!email || email.length > 254 || !EMAIL.test(email)) { fieldErr('em', 'err-em', 'Enter a valid email address, for example name@example.com.'); bad = bad || 'em'; }
    if (!$('cs').checked) { fieldErr('cs', 'err-cs', 'Tick the box to continue.'); bad = bad || 'cs'; }
    if (!$('ad').checked) { fieldErr('ad', 'err-ad', 'Please confirm that you are 18 or over.'); bad = bad || 'ad'; }
    if (bad) { $(bad).focus(); m.className = 'msg err'; m.textContent = 'Please fix the highlighted fields.'; return; }
    if (!P2T.apiReady()) { m.className = 'msg err'; m.textContent = 'Sign-up is not connected yet. Please try again later.'; return; }
    b.disabled = true; b.textContent = 'One moment...'; $('gf').setAttribute('aria-busy', 'true');
    var data = { firstName: first, email: email, consent: true, adult: true, website: $('website').value, source: 'Throne Check', quiz: result.label };
    P2T.post('subscribe', data, openedAt).then(function (res) {
      if (res && res.ok) { subscribed = true; unlock(res.state === 'already' ? 'already' : 'new'); }
      else { m.className = 'msg err'; m.textContent = (res && res.error) || 'Something went wrong. Try again in a moment.'; }
    }).catch(function () {
      m.className = 'msg err'; m.textContent = 'Connection problem. Check your internet and try again. Your result is still here.';
    }).then(function () { b.disabled = false; b.textContent = label; $('gf').removeAttribute('aria-busy'); });
  });
})();
