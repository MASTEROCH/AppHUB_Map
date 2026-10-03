/* AppHUB Film v3 · движок скролла.
   Каждая секция .film — дорожка из отрезков (клипы и переходы). Скролл задаёт целевой кадр,
   показанный кадр догоняет его плавно. Кадры грузятся окном вокруг текущего через
   fetch → createImageBitmap и закрываются вне окна (правила донора AppOS: #843, #848, #855, #875).
   Подписи [data-u="a,b"] включаются по локальному прогрессу своего отрезка. */
(function () {
  'use strict';

  var root = document.documentElement;
  var TG = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) ? Telegram.WebApp : null;
  if (TG) {
    root.classList.add('no-transparency');   // WKWebView Telegram: стекло без блюра, prefers-reduced-transparency там не работает
    try {
      TG.ready(); TG.expand();
      if (TG.disableVerticalSwipes) TG.disableVerticalSwipes();
      if (TG.setHeaderColor) TG.setHeaderColor('#0A0A14');
      if (TG.setBackgroundColor) TG.setBackgroundColor('#0A0A14');
      var setH = function () { root.style.setProperty('--tgh', Math.min(TG.viewportStableHeight || innerHeight, innerHeight) + 'px'); };
      setH(); if (TG.onEvent) TG.onEvent('viewportChanged', setH);
    } catch (e) {}
  }
  function haptic() { try { if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); } catch (e) {} }

  var NARROW = matchMedia('(max-width:900px)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var LANE = (TG || NARROW) ? 'lo' : 'hi';          // выбирается один раз: понижение на ходу «било по невиновным» (#848)
  var BASE = 'seq/v1/' + LANE + '/';
  var PX_PER_FRAME = NARROW ? 7 : 9;
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_BITMAP = typeof window.createImageBitmap === 'function';

  var TINT = {
    c01: 'rgba(255,181,71,.16)', c02: 'rgba(90,140,255,.14)', c03: 'rgba(0,224,199,.16)', c04: 'rgba(0,224,199,.12)',
    c05: 'rgba(0,224,199,.10)', c06: 'rgba(124,58,255,.20)', c07: 'rgba(0,224,199,.14)', c08: 'rgba(124,58,255,.18)', c09: 'rgba(0,224,199,.16)'
  };

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /* ── загрузка кадров ── */
  function fetchFrame(url) {
    if (HAS_BITMAP) {
      return fetch(url, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      }).then(function (b) { return createImageBitmap(b); });
    }
    return new Promise(function (res, rej) {
      var im = new Image(); im.decoding = 'async'; im.src = url;
      im.decode().then(function () { res(im); }, rej);
    });
  }

  function Track(el, manifest) {
    var self = this;
    this.el = el;
    this.stage = el.querySelector('.stage');
    this.cv = el.querySelector('.cv');
    this.ctx = this.cv.getContext('2d', { alpha: false });
    this.amb = el.querySelector('.amb');
    this.bar = el.querySelector('.prog i');
    this.segs = [];
    var g = 0;
    el.getAttribute('data-segs').split(',').forEach(function (id) {
      id = id.trim(); var n = manifest[id] || 0;
      if (!n) return;
      self.segs.push({ id: id, start: g, n: n }); g += n;
    });
    this.N = g;
    this.bm = new Map(); this.loading = new Set();
    this.view = 0; this.target = 0; this.shown = -1; this.curSeg = -1;
    this.chapters = {};
    el.querySelectorAll('.ch').forEach(function (ch) {
      var items = [].map.call(ch.querySelectorAll('[data-u]'), function (n) {
        var r = n.getAttribute('data-u').split(','); return { n: n, a: +r[0], b: +r[1], on: false };
      });
      self.chapters[ch.getAttribute('data-seg')] = { el: ch, items: items, on: false };
    });
    this.size();
  }
  Track.prototype.size = function () {
    var h = this.stage.clientHeight || innerHeight;
    this.el.style.height = Math.round(this.N * PX_PER_FRAME + h) + 'px';
    var w = this.cv.clientWidth, hh = this.cv.clientHeight;
    if (w && hh) { this.cv.width = Math.round(w * DPR); this.cv.height = Math.round(hh * DPR); this.shown = -1; }
  };
  Track.prototype.segAt = function (g) {
    for (var i = this.segs.length - 1; i >= 0; i--) if (g >= this.segs[i].start) return i;
    return 0;
  };
  Track.prototype.url = function (g) {
    var s = this.segs[this.segAt(g)]; return BASE + s.id + '/' + (g - s.start + 1) + '.webp';
  };
  Track.prototype.near = function () {
    var r = this.el.getBoundingClientRect();
    return r.bottom > -innerHeight && r.top < innerHeight * 2;
  };
  Track.prototype.progress = function () {
    var r = this.el.getBoundingClientRect();
    var span = this.el.offsetHeight - this.stage.clientHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  };
  Track.prototype.pump = function () {
    if (!this.near()) return;
    var self = this, c = Math.round(this.view), want = [];
    for (var d = -30; d <= 90; d++) {
      var g = c + d;
      if (g < 0 || g >= this.N || this.bm.has(g) || this.loading.has(g)) continue;
      want.push({ g: g, cost: d < 0 ? -d * 2.4 : d });   // назад дороже: листают вперёд
    }
    want.sort(function (a, b) { return a.cost - b.cost; });
    for (var i = 0; i < want.length && this.loading.size < 6; i++) this.load(want[i].g);
    // окно памяти: 340 битмапов 1080p — это гигабайты (#855)
    this.bm.forEach(function (b, g) {
      if (g < c - 60 || g > c + 150) { try { b.close && b.close(); } catch (e) {} self.bm.delete(g); }
    });
  };
  Track.prototype.load = function (g) {
    var self = this; this.loading.add(g);
    fetchFrame(this.url(g)).then(function (b) {
      self.loading.delete(g); self.bm.set(g, b); Engine.loaded++; Engine.kick();
    }, function () { self.loading.delete(g); });
  };
  Track.prototype.nearest = function (g) {
    if (this.bm.has(g)) return g;
    for (var d = 1; d < 28; d++) {
      if (this.bm.has(g - d)) return g - d;
      if (this.bm.has(g + d)) return g + d;
    }
    return -1;
  };
  Track.prototype.draw = function (g) {
    var f = this.nearest(g);
    if (f < 0 || f === this.shown) return;
    var b = this.bm.get(f), cw = this.cv.width, ch = this.cv.height;
    var iw = b.width || b.naturalWidth, ih = b.height || b.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    this.ctx.drawImage(b, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    this.shown = f;
  };
  Track.prototype.captions = function () {
    var si = this.segAt(Math.round(this.view)), s = this.segs[si];
    var u = s.n > 1 ? clamp((this.view - s.start) / (s.n - 1), 0, 1) : 0;
    // переход (t..) показывает подписи следующего клипа с самого начала
    var id = s.id, chap = this.chapters[id];
    if (!chap && id.charAt(0) === 't' && this.segs[si + 1]) { id = this.segs[si + 1].id; chap = this.chapters[id]; u = 0; }
    if (si !== this.curSeg) {
      this.curSeg = si;
      if (this.amb) this.amb.style.setProperty('--tint', TINT[id] || TINT.c01);
      for (var k in this.chapters) {
        var c = this.chapters[k], on = (k === id);
        if (c.on !== on) { c.on = on; c.el.classList.toggle('on', on); }
      }
      if (chap) haptic();
    }
    if (chap) chap.items.forEach(function (it) {
      var on = u >= it.a && u <= it.b;
      if (on !== it.on) { it.on = on; it.n.classList.toggle('on', on); }
    });
    if (this.bar) this.bar.style.transform = 'scaleX(' + (this.N > 1 ? this.view / (this.N - 1) : 0).toFixed(4) + ')';
  };
  Track.prototype.step = function () {
    if (!this.near()) return false;
    this.target = this.progress() * (this.N - 1);
    var d = this.target - this.view;
    if (REDUCED || Math.abs(d) > 220) this.view = this.target;        // телепорт при большом отставании
    else this.view += Math.abs(d) < 0.04 ? d : d * 0.22;               // плавное догоняние
    this.pump(); this.draw(Math.round(this.view)); this.captions();
    return Math.abs(this.target - this.view) > 0.02 || this.loading.size > 0;
  };

  /* ── поле точек: 4 000 ярких → миллионы тёмных → по одной загораются фиолетовые ── */
  function Dots(el) {
    this.el = el; this.stage = el.querySelector('.stage'); this.cv = el.querySelector('.dv');
    this.ctx = this.cv.getContext('2d'); this.cnt = document.getElementById('cnt');
    this.items = [].map.call(el.querySelectorAll('[data-d]'), function (n) {
      var r = n.getAttribute('data-d').split(','); return { n: n, a: +r[0], b: +r[1], on: false };
    });
    var rnd = mulberry(7), i;
    this.bright = []; for (i = 0; i < 4000; i++) { var a = rnd() * 6.283, r = Math.pow(rnd(), .6); this.bright.push([Math.cos(a) * r, Math.sin(a) * r]); }
    this.dim = []; for (i = 0; i < 9000; i++) this.dim.push([(rnd() * 2 - 1) * 9, (rnd() * 2 - 1) * 9, rnd()]);
    this.lit = []; for (i = 0; i < 260; i++) this.lit.push(Math.floor(rnd() * 9000));
    this.p = -1; this.size();
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  Dots.prototype.size = function () { this.cv.width = Math.round(this.cv.clientWidth * DPR); this.cv.height = Math.round(this.cv.clientHeight * DPR); this.p = -1; };
  Dots.prototype.step = function () {
    var r = this.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return false;
    var span = this.el.offsetHeight - this.stage.clientHeight, p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    if (Math.abs(p - this.p) < 0.0005) return false;
    this.p = p;
    var c = this.ctx, W = this.cv.width, H = this.cv.height, cx = W / 2, cy = H * .34;
    var e1 = clamp(p / 0.3, 0, 1), e2 = clamp((p - 0.3) / 0.32, 0, 1), e3 = clamp((p - 0.62) / 0.38, 0, 1);
    var R = Math.min(W, H) * 0.24, zoom = 1 - 0.82 * (1 - Math.pow(1 - e2, 3));
    c.clearRect(0, 0, W, H);
    // тёмное поле проявляется на отъезде
    if (e2 > 0) {
      c.fillStyle = 'rgba(120,130,190,' + (0.35 * e2).toFixed(3) + ')';
      var ds = Math.max(1, DPR);
      for (var i = 0; i < this.dim.length; i++) {
        var q = this.dim[i], x = cx + q[0] * R * zoom, y = cy + q[1] * R * zoom;
        if (x < 0 || y < 0 || x > W || y > H) continue;
        c.fillRect(x, y, ds, ds);
      }
    }
    // 4 000 ярких точек в центре, счётчик бежит вместе с ними
    var k = Math.round(4000 * (1 - Math.pow(1 - e1, 2)));
    c.fillStyle = '#00E0C7';
    var bs = Math.max(1.5, 2.2 * DPR * (0.4 + 0.6 * zoom));
    for (var j = 0; j < k; j++) { var b = this.bright[j]; c.fillRect(cx + b[0] * R * zoom, cy + b[1] * R * zoom, bs, bs); }
    if (this.cnt) this.cnt.textContent = k.toLocaleString('ru-RU');
    // фиолетовые загораются по одной: AppHUB включает бизнесы
    if (e3 > 0) {
      var m = Math.floor(this.lit.length * e3);
      c.fillStyle = '#A78BFF'; c.shadowColor = 'rgba(124,58,255,.9)'; c.shadowBlur = 10 * DPR;
      for (var v = 0; v < m; v++) { var d = this.dim[this.lit[v]], vx = cx + d[0] * R * zoom, vy = cy + d[1] * R * zoom; if (vx < 0 || vy < 0 || vx > W || vy > H) continue; c.beginPath(); c.arc(vx, vy, 2.4 * DPR, 0, 6.283); c.fill(); }
      c.shadowBlur = 0;
    }
    this.items.forEach(function (it) { var on = p >= it.a && p <= it.b; if (on !== it.on) { it.on = on; it.n.classList.toggle('on', on); } });
    return false;
  };

  /* ── общий цикл ── */
  var Engine = {
    tracks: [], dots: null, raf: 0, loaded: 0,
    kick: function () { if (!Engine.raf) Engine.raf = requestAnimationFrame(Engine.tick); },
    tick: function () {
      Engine.raf = 0; var more = false;
      Engine.tracks.forEach(function (t) { if (t.step()) more = true; });
      if (Engine.dots) Engine.dots.step();
      if (more) Engine.kick();
    }
  };

  function boot(manifest) {
    document.querySelectorAll('.film').forEach(function (el) { Engine.tracks.push(new Track(el, manifest)); });
    var d = document.getElementById('dots'); if (d) Engine.dots = new Dots(d);
    addEventListener('scroll', Engine.kick, { passive: true });
    var lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', function () {
      // адресная строка iOS меняет высоту посреди жеста: мелкие изменения высоты не пересчитываем (#876)
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 200) return;
      lastW = innerWidth; lastH = innerHeight;
      Engine.tracks.forEach(function (t) { t.size(); }); if (Engine.dots) Engine.dots.size(); Engine.kick();
    });
    Engine.kick();
    // заставка: ждём первые кадры, но не дольше 8 с; потом удаляем из DOM
    var bootEl = document.getElementById('boot'), bar = document.getElementById('bootBar'), t0 = performance.now();
    (function wait() {
      var ready = Engine.tracks[0] ? Engine.tracks[0].bm.size : 0, need = 24;
      if (bar) bar.style.width = Math.min(100, ready / need * 100) + '%';
      if (ready >= need || performance.now() - t0 > 8000) {
        if (bootEl) { bootEl.classList.add('out'); setTimeout(function () { bootEl.remove(); }, 600); }
        return;
      }
      setTimeout(wait, 120);
    })();
  }

  fetch('seq/v1/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(boot, function () {
    var b = document.getElementById('boot'); if (b) b.remove();
  });

  /* ── секции: появление, карусели экранов, наклон карточек ── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(function (n) { io.observe(n); });

  document.querySelectorAll('[data-car]').forEach(function (car) {
    var imgs = car.querySelectorAll('img'), dots = car.querySelectorAll('.dots i'), k = 0, vis = false, tm = 0;
    if (imgs.length < 2) return;
    var vo = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis && !tm) tm = setInterval(next, 2600); if (!vis && tm) { clearInterval(tm); tm = 0; } });
    vo.observe(car);
    function next() { imgs[k].classList.remove('on'); if (dots[k]) dots[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); if (dots[k]) dots[k].classList.add('on'); }
  });

  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !REDUCED) {
    document.querySelectorAll('.tile,.nc,.steps>div').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 6).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-2px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }
})();
