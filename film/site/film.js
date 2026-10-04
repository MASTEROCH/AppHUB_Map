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
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ru';
  function L(s) { return (window.I18N && window.I18N[s]) || s; }   // английская версия: словарь кладёт сборка
  var HAS_BITMAP = typeof window.createImageBitmap === 'function';

  var TINT = {
    c01: 'rgba(255,181,71,.16)', c02: 'rgba(90,140,255,.14)', c03: 'rgba(0,224,199,.16)', c04: 'rgba(0,224,199,.12)',
    c05: 'rgba(0,224,199,.10)', c06: 'rgba(124,58,255,.20)', c06h: 'rgba(255,181,71,.16)', c06j: 'rgba(0,224,199,.14)', c07k: 'rgba(0,224,199,.14)', c07: 'rgba(0,224,199,.14)', c08: 'rgba(124,58,255,.18)', c09: 'rgba(0,224,199,.16)'
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
    this.ambc = NARROW ? null : el.querySelector('.ambc');
    if (this.ambc) { this.ambc.width = 24; this.ambc.height = 42; this.actx = this.ambc.getContext('2d'); }
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
    // стекло: под каждой карточкой свой маленький холст с куском кадра (backdrop-filter над живым холстом стоит половину кадров, #842)
    this.glass = REDUCED ? [] : [].map.call(el.querySelectorAll('.ch, .hero-card'), function (card) {
      var c = document.createElement('canvas'); c.className = 'glass-cv'; c.setAttribute('aria-hidden', 'true');
      card.insertBefore(c, card.firstChild); card.classList.add('glassed');
      return { card: card, cv: c, ctx: c.getContext('2d'), rad: 0 };
    });
    this.settle = 0;
    this.layer = el.querySelector('.ph-layer'); this.ui = el.querySelector('.ph-ui');
    this.cn = el.querySelector('.cn'); this.cnLoop = el.querySelector('.cn-loop');
    this.cnTags = [].map.call(el.querySelectorAll('.cn-tag'), function (n) { return { n: n, f: +n.getAttribute('data-f'), a: +n.getAttribute('data-a') * Math.PI / 180, r: +n.getAttribute('data-r'), on: false }; });
    this.size();
  }
  Track.prototype.size = function () {
    var h = this.stage.clientHeight || innerHeight;
    this.el.style.height = Math.round(this.N * PX_PER_FRAME + h) + 'px';
    var w = this.cv.clientWidth, hh = this.cv.clientHeight;
    if (w && hh) { this.cv.width = Math.round(w * DPR); this.cv.height = Math.round(hh * DPR); this.shown = -1; this.shownKey = -1; }
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
    var self = this, c = Math.round(this.view), want = [], far = 90;
    if (this.ahead != null) {                                     // листание: окно тянется до карточки назначения
      var top = this.el.getBoundingClientRect().top + scrollY, span = this.el.offsetHeight - this.stage.clientHeight;
      if (span > 0) far = clamp(Math.round(clamp((this.ahead - top) / span, 0, 1) * (this.N - 1)) - c + 20, 90, 150);
      this.ahead = null;
    }
    for (var d = -30; d <= far; d++) {
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
  Track.prototype.draw = function (v) {
    var f0 = Math.floor(v), fr = v - f0, f, b2 = null, key;
    if (fr > 0.06 && fr < 0.94 && this.bm.has(f0) && this.bm.has(f0 + 1)) { f = f0; b2 = this.bm.get(f0 + 1); key = f0 + Math.round(fr * 12) / 12; }
    else { f = this.nearest(Math.round(v)); key = f; }
    if (f < 0 || key === this.shownKey) return;
    var b = this.bm.get(f), cw = this.cv.width, ch = this.cv.height;
    var iw = b.width || b.naturalWidth, ih = b.height || b.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    this.ctx.globalAlpha = 1; this.ctx.drawImage(b, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    if (b2) { this.ctx.globalAlpha = Math.round(fr * 12) / 12; this.ctx.drawImage(b2, (cw - dw) / 2, (ch - dh) / 2, dw, dh); this.ctx.globalAlpha = 1; }   // промежуточная фаза — смешение соседних кадров
    this.shownKey = key;
    f = b2 && fr >= 0.5 ? f0 + 1 : f;
    this.shown = f;
    this.screenUI(f);
    this.constellation(f);
    if (this.actx) { this.actx.drawImage(b, 0, 0, 24, 42); if (!this.ambOn) { this.ambOn = true; this.ambc.classList.add('on'); } }
  };
  var C09 = ['322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,322,269,361,434,321,269,362,434,321,269,362,434,320,269,363,434,320,269,363,434,320,269,363,434,321,269,362,434,320,269,363,434,320,269,363,434,319,269,364,434,318,269,366,434,317,271,368,433,317,272,369,432,317,275,370,431,317,278,371,429,317,281,372,428,316,282,373,428,314,284,374,428,313,284,376,427,312,284,377,427,311,285,378,426,311,286,378,424,311,286,378,423,311,287,378,422,312,287,377,422,313,286,376,422,314,284,374,422,316,281,373,423,317,278,372,424,317,275,371,424,317,272,370,425,318,269,368,425,319,266,366,426,320,262,363,426,321,259,361,427,322,256,359,428,322,253,358,429,322,251,357,430,322,249,356,431,323,247,354,431,324,246,353,431,326,245,352,431,327,244,350,431,328,244,348,431,328,244,347,431,328,244,346,431,328,244,344,430,328,245,344,429,328,246,344,429,328,246,344,428,328,247,344,428,328,247,344,428,328,248,344,428,328,248,344,427,328,249,344,426,328,249,344,426,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425,328,250,344,425'][0].split(',').map(Number);
  Track.prototype.screenUI = function (f) {
    if (!this.ui) return;
    var si = this.segAt(f), sg = this.segs[si], li = f - sg.start;
    if (sg.id !== 'c09' || li * 4 + 3 >= C09.length) { if (this.uiOn) { this.uiOn = false; this.ui.style.opacity = 0; } return; }
    var b = this.bm.get(f) || this.bm.get(this.shown); if (!b) return;
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight, iw = b.width || b.naturalWidth, ih = b.height || b.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s, ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    var x = ox + C09[li * 4] / 1000 * dw, y = oy + C09[li * 4 + 1] / 1000 * dh, w = C09[li * 4 + 2] / 1000 * dw, h = C09[li * 4 + 3] / 1000 * dh;
    var st = this.ui.style;
    st.left = x.toFixed(1) + 'px'; st.top = y.toFixed(1) + 'px'; st.width = w.toFixed(1) + 'px'; st.height = h.toFixed(1) + 'px';
    st.fontSize = (w / 10).toFixed(2) + 'px'; st.borderRadius = (w * 0.13).toFixed(1) + 'px';
    st.opacity = clamp((li - 3) / 12, 0, 1) * clamp((120 - li) / 10, 0, 1);   // экран просыпается, к мосту гаснет
    this.uiOn = true;
    this.ui.classList.toggle('on', li >= 72);                                     // палец коснулся — точка включена
    this.ui.classList.toggle('near', li >= 34);                                  // палец на подходе — подсказка гаснет
  };
  /* созвездие c08: подписи слоёв встают на свои кольца (центр 0.5/0.412 кадра, радиусы в долях ширины кадра — замер по кадру 121) */
  Track.prototype.constellation = function (f) {
    if (!this.cn) return;
    var sg = this.segs[this.segAt(f)], li = f - sg.start;
    var on = sg.id === 'c08';
    if (on !== this.cnOn) { this.cnOn = on; this.cn.classList.toggle('on', on); }
    if (!on) return;
    var b = this.bm.get(this.shown); if (!b) return;
    var cw = this.cv.clientWidth, ch = this.cv.clientHeight, iw = b.width || b.naturalWidth, ih = b.height || b.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), dw = iw * s, ox = (cw - dw) / 2, oy = (ch - ih * s) / 2;
    var cx = ox + 0.5 * dw, cy = oy + 0.412 * ih * s;
    if (this.cnLoop) { var R2 = 0.254 * dw; this.cnLoop.style.cssText = 'left:' + (cx - R2).toFixed(1) + 'px;top:' + (cy - R2).toFixed(1) + 'px;width:' + (2 * R2).toFixed(1) + 'px;height:' + (2 * R2).toFixed(1) + 'px'; this.cnLoop.classList.toggle('on', li >= 96); }
    var placed = [];
    this.cnTags.forEach(function (t) {
      var R = t.r * dw, x = cx + Math.cos(t.a) * R, y = cy + Math.sin(t.a) * R, w = t.n.offsetWidth, h = t.n.offsetHeight, up = t.n.classList.contains('up');
      var left = clamp(x - w / 2, 8, cw - 8 - w), top = up ? y - 16 - h : y + 16, dy = 0;   // подпись над узлом (или под ним), к узлу — ножка
      for (var g = 0; g < 4; g++) {                                                  // на узком экране подписи не налезают: отодвигаем от кольца, ножка тянется
        var tt = top + (up ? -dy : dy), hit = null;
        placed.forEach(function (r) { if (left < r.r + 4 && r.l < left + w + 4 && tt < r.b + 4 && r.t < tt + h + 4) hit = r; });
        if (!hit) break;
        dy += up ? tt + h + 6 - hit.t : hit.b + 6 - tt;
      }
      top += up ? -dy : dy; placed.push({ l: left, r: left + w, t: top, b: top + h });
      t.n.style.left = left.toFixed(1) + 'px'; t.n.style.top = top.toFixed(1) + 'px';
      t.n.style.setProperty('--dy', dy.toFixed(1) + 'px');
      t.n.style.setProperty('--ax', (x - left).toFixed(1) + 'px');
      var o = li >= t.f; if (o !== t.on) { t.on = o; t.n.classList.toggle('on', o); }
    });
  };
  Track.prototype.captions = function () {
    var si = this.segAt(Math.round(this.view)), s = this.segs[si];
    var u = s.n > 1 ? clamp((this.view - s.start) / (s.n - 1), 0, 1) : 0;
    // переход (t..) показывает подписи следующего клипа с самого начала
    var id = s.id, chap = this.chapters[id];
    if (!chap && /^[tx]/.test(id) && this.segs[si + 1]) { id = this.segs[si + 1].id; chap = this.chapters[id]; u = 0; }
    if (si !== this.curSeg) {
      this.curSeg = si;
      if (this.amb) this.amb.style.setProperty('--tint', TINT[id] || TINT.c01);
      for (var k in this.chapters) {
        var c = this.chapters[k], on = (k === id);
        if (c.on !== on) { c.on = on; c.el.classList.toggle('on', on); }
      }
      if (chap) haptic();
    }
    if (chap) {
      var any = false;
      chap.items.forEach(function (it) {
        var on = u >= it.a && u <= it.b; if (on) any = true;
        if (on !== it.on) { it.on = on; it.n.classList.toggle('on', on); }
      });
      if (any !== chap.full) { chap.full = any; chap.el.classList.toggle('full', any); this.settle = performance.now() + 1000; }   // пустую плашку не показываем; стекло догоняет въезд карточки
    }
    if (this.bar) this.bar.style.transform = 'scaleX(' + (this.N > 1 ? this.view / (this.N - 1) : 0).toFixed(4) + ')';
  };
  /* стекло карточки: кусок кадра под ней → уменьшение (это и есть блюр) → линза по краю (искажение) */
  var GT = document.createElement('canvas'), gtx = GT.getContext('2d'), GR = document.createElement('canvas'), grx = GR.getContext('2d');
  function rr(c, x, y, w, h, r) { if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function fit(c, w, h) { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } }
  Track.prototype.glassDraw = function () {
    if (!this.glass.length) return;
    var b = this.shown >= 0 ? this.bm.get(this.shown) : null, r = this.cv.getBoundingClientRect();
    var ar = this.ambc && this.ambOn ? this.ambc.getBoundingClientRect() : null;
    for (var i = 0; i < this.glass.length; i++) {
      var g = this.glass[i], card = g.card;
      var vis = card.classList.contains('hero-card') ? !card.hasAttribute('data-off') : card.classList.contains('on') && card.classList.contains('full');
      if (!vis) continue;
      var cr = card.getBoundingClientRect(), cw = card.offsetWidth, chh = card.offsetHeight;
      if (cw < 20 || cr.bottom < 0 || cr.top > innerHeight) continue;
      if (!g.rad) g.rad = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 24;
      var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      var ov = Math.max(0, Math.min(cr.right, r.right) - Math.max(cr.left, r.left)) * Math.max(0, Math.min(cr.bottom, r.bottom) - Math.max(cr.top, r.top));
      var src, iw, ih, map;
      if (b && ov > cr.width * cr.height * 0.5) {                                       // карточка над кадром
        iw = b.width || b.naturalWidth; ih = b.height || b.naturalHeight;
        var s = Math.max(r.width / iw, r.height / ih), ox = r.left + (r.width - iw * s) / 2, oy = r.top + (r.height - ih * s) / 2;
        src = b; map = function (z) { var w = cr.width / z, h = cr.height / z; return [(cx - w / 2 - ox) / s, (cy - h / 2 - oy) / s, w / s, h / s]; };
      } else if (ar && ar.width) {                                                      // карточка рядом с панелью: под ней подсветка из кадра
        src = this.ambc; iw = 24; ih = 42;
        map = function (z) { var w = cr.width / z, h = cr.height / z; return [(cx - w / 2 - ar.left) / ar.width * 24, (cy - h / 2 - ar.top) / ar.height * 42, w / ar.width * 24, h / ar.height * 42]; };
      } else continue;
      function clampSrc(q) { q[2] = Math.min(q[2], iw); q[3] = Math.min(q[3], ih); q[0] = clamp(q[0], 0, iw - q[2]); q[1] = clamp(q[1], 0, ih - q[3]); return q; }
      var W = Math.max(8, Math.round(cw / 2)), H = Math.max(8, Math.round(chh / 2)), k = W / cw;
      fit(g.cv, W, H); var x = g.ctx;
      // тело: сильный блюр — кусок ужат до 1/16 и растянут обратно
      var tw = Math.max(6, Math.round(cw / 16)), th = Math.max(4, Math.round(chh / 16)), q = clampSrc(map(1.12));
      fit(GT, tw, th); gtx.imageSmoothingQuality = 'high'; gtx.drawImage(src, q[0], q[1], q[2], q[3], 0, 0, tw, th);
      x.globalCompositeOperation = 'source-over'; x.imageSmoothingQuality = 'high'; x.drawImage(GT, 0, 0, tw, th, 0, 0, W, H);
      // кромка: тот же кадр сильнее увеличен и чётче — по краю стекло «ломает» картинку
      var rw = Math.max(8, Math.round(cw / 6)), rh = Math.max(6, Math.round(chh / 6)), q2 = clampSrc(map(1.5)), rad = g.rad * k;
      fit(GR, rw, rh); grx.imageSmoothingQuality = 'high'; grx.drawImage(src, q2[0], q2[1], q2[2], q2[3], 0, 0, rw, rh);
      // кромка тонкая и с затуханием внутрь: три кольца по 2 px, без резкой внутренней границы
      for (var ri = 0; ri < 3; ri++) {
        var a0 = ri * 2 * k, a1 = (ri + 1) * 2 * k;
        x.save(); x.beginPath(); rr(x, a0, a0, W - a0 * 2, H - a0 * 2, Math.max(0, rad - a0)); rr(x, a1, a1, W - a1 * 2, H - a1 * 2, Math.max(0, rad - a1)); x.clip('evenodd');
        x.globalAlpha = [0.7, 0.4, 0.15][ri]; x.drawImage(GR, 0, 0, rw, rh, 0, 0, W, H); x.restore();
      }
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(6,6,10,.36)'; x.fillRect(0, 0, W, H);                       // плотность под белый текст
    }
  };
  var IDLE_MAX = 40, IDLE_HALF = 3.6;   // 40 кадров за 3,6 с в каждую сторону: в середине ≈ 16 к/с, обратный ход такой же бодрый
  Track.prototype.step = function (dt) {
    if (!this.near()) return false;
    this.target = this.progress() * (this.N - 1);
    // первый экран живёт сам: пока не листали, первые кадры идут туда-обратно (как в AppOS) — она печатает, на ноутбуке что-то меняется
    var idle = this === Engine.tracks[0] && !REDUCED && !pg.on && this.target < 0.15 && Math.abs(this.view) < IDLE_MAX + 1 && !document.getElementById('boot');
    if (idle) {
      if (!Engine.idleT0) Engine.idleT0 = performance.now() - clamp(this.view / IDLE_MAX, 0, 1) * IDLE_HALF * 1000;   // вход в цикл без скачка кадра
      var ph = ((performance.now() - Engine.idleT0) / 1000 / IDLE_HALF) % 2, x = ph < 1 ? ph : 2 - ph;   // туда-обратно с одной скоростью
      this.view = (0.25 * x + 0.75 * (1 - Math.cos(Math.PI * x)) / 2) * IDLE_MAX;                          // края смягчены, но без долгого зависания
    } else {
      Engine.idleT0 = 0;
      var d = this.target - this.view;
      if (REDUCED || Math.abs(d) > 220) this.view = this.target;        // телепорт при большом отставании
      else this.view += Math.abs(d) < 0.04 ? d : d * (1 - Math.exp(-(dt || 16) / 70));   // догоняние по времени: одинаково на 60 и 120 Гц
    }
    var moving = idle || pg.on || Math.abs(this.target - this.view) > 0.02;
    this.pump(); this.draw(moving ? this.view : Math.round(this.view)); this.captions(); this.glassDraw();
    return idle || Math.abs(this.target - this.view) > 0.02 || this.loading.size > 0 || performance.now() < this.settle;
  };

  /* ── поле точек — нейросеть из частиц: ядро-сфера 4 000 → отъезд в мерцающую галактику бизнесов →
        синапсы загораются от центра наружу, по связям бегут импульсы. Анимация живёт, пока сцена на экране. ── */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sprite(r, stops) {
    var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = c.height = r * 2;
    var g = x.createRadialGradient(r, r, 0, r, r, r); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); return c;
  }
  function Dots(el) {
    this.el = el; this.stage = el.querySelector('.stage'); this.cv = el.querySelector('.dv');
    this.ctx = this.cv.getContext('2d'); this.cnt = document.getElementById('cnt');
    this.items = [].map.call(el.querySelectorAll('[data-d]'), function (n) {
      var r = n.getAttribute('data-d').split(','); return { n: n, a: +r[0], b: +r[1], on: false };
    });
    var rnd = mulberry(11), i, NC = NARROW ? 2600 : 4000, NF = NARROW ? 4200 : 7500, NL = NARROW ? 150 : 230;
    // ядро: точки на оболочке и внутри сферы
    this.core = []; for (i = 0; i < NC; i++) {
      var u = rnd() * 2 - 1, ph = rnd() * 6.2832, rr = i % 4 === 0 ? Math.cbrt(rnd()) : 0.9 + rnd() * 0.1, sq = Math.sqrt(1 - u * u);
      this.core.push([sq * Math.cos(ph) * rr, u * rr, sq * Math.sin(ph) * rr]);
    }
    // галактика бизнесов: плотнее к центру, лёгкая спираль, глубина для параллакса и мерцания
    this.field = []; for (i = 0; i < NF; i++) {
      var r = 0.5 + Math.pow(rnd(), 0.62) * 4.6, a = rnd() * 6.2832 + r * 0.42;
      this.field.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82, d: 0.35 + rnd() * 0.65, ph: rnd() * 6.2832, sp: 0.0012 + rnd() * 0.0028 });
    }
    // синапсы: загораются от центра наружу, каждый тянется к ближайшему уже горящему (или к ядру)
    var cand = this.field.map(function (f, k) { return { k: k, r: Math.hypot(f.x, f.y) + rnd() * 0.35 }; }).sort(function (a, b) { return a.r - b.r; });
    var step = Math.floor(cand.length / NL); this.lit = [];
    for (i = 0; i < NL; i++) {
      var k = cand[Math.min(cand.length - 1, i * step + Math.floor(rnd() * step))].k, f = this.field[k], par = -1, best = 0.9;
      for (var j = 0; j < this.lit.length; j++) { var g = this.field[this.lit[j].k], dd = Math.hypot(g.x - f.x, g.y - f.y); if (dd < best) { best = dd; par = j; } }
      this.lit.push({ k: k, par: par, off: rnd() });
    }
    this.glowCore = sprite(128, [[0, 'rgba(235,244,255,.95)'], [0.18, 'rgba(160,205,255,.45)'], [0.5, 'rgba(41,151,255,.12)'], [1, 'rgba(41,151,255,0)']]);
    this.glowNode = sprite(32, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(160,210,255,.9)'], [0.55, 'rgba(41,151,255,.25)'], [1, 'rgba(41,151,255,0)']]);
    this.p = 0; this.size();
  }
  Dots.prototype.size = function () { this.cv.width = Math.round(this.cv.clientWidth * DPR); this.cv.height = Math.round(this.cv.clientHeight * DPR); };
  Dots.prototype.step = function (now) {
    var r = this.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return false;
    var span = this.el.offsetHeight - this.stage.clientHeight, p = span > 0 ? clamp(-r.top / span, 0, 1) : 0, t = REDUCED ? 0 : (now || 0);
    this.p = p;
    var c = this.ctx, W = this.cv.width, H = this.cv.height, cx = W / 2, cy = H * 0.4;
    var e1 = clamp(p / 0.28, 0, 1), e2 = clamp((p - 0.28) / 0.32, 0, 1), e3 = clamp((p - 0.6) / 0.38, 0, 1);
    var S = Math.min(W, H) * 0.3, zEnd = 0.42, zoom = 1 - (1 - zEnd) * (1 - Math.pow(1 - e2, 3));   // отъезд камеры: ядро уменьшается, галактика раскрывается
    c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    var fx = function (q) { return cx + q.x * S * zoom; }, fy = function (q) { return cy + q.y * S * zoom; };
    // галактика: мерцает, проявляется на отъезде (чуть видна и раньше — глубина космоса)
    var fa = 0.12 + 0.88 * e2;
    for (var i = 0; i < this.field.length; i++) {
      var f = this.field[i], x = fx(f), y = fy(f);
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      var tw = 0.55 + 0.45 * Math.sin(t * f.sp + f.ph), a = fa * f.d * tw * 0.7;
      if (a < 0.02) continue;
      c.fillStyle = 'rgba(190,215,255,' + a.toFixed(3) + ')';
      var sz = (0.7 + f.d * 1.1) * DPR; c.fillRect(x, y, sz, sz);
    }
    // орбитальные кольца вокруг ядра
    var Rc = S * zoom, rot = t * 0.00012 + p * 2.2;
    c.lineWidth = Math.max(1, DPR * 0.8);
    for (var o = 0; o < 3; o++) {
      c.strokeStyle = 'rgba(140,195,255,' + (0.16 - o * 0.04) * (0.4 + 0.6 * e1) + ')';
      c.beginPath(); c.ellipse(cx, cy, Rc * (1.35 + o * 0.32), Rc * (0.34 + o * 0.1), rot * (o % 2 ? -1 : 1) + o * 0.9, 0, 6.2832); c.stroke();
    }
    // ядро: собирается по мере счёта, вращается, объём через перспективу и яркость по глубине
    var k = Math.round(this.core.length * (1 - Math.pow(1 - e1, 2)));
    var ca = Math.cos(rot * 1.4), sa = Math.sin(rot * 1.4), ct = Math.cos(0.38), st = Math.sin(0.38);
    var gsz = Rc * 3.2; c.globalAlpha = 0.35 + 0.65 * e1; c.drawImage(this.glowCore, cx - gsz / 2, cy - gsz / 2, gsz, gsz); c.globalAlpha = 1;
    for (var j = 0; j < k; j++) {
      var q = this.core[j], X = q[0] * ca + q[2] * sa, Z = -q[0] * sa + q[2] * ca, Y = q[1] * ct - Z * st; Z = q[1] * st + Z * ct;
      var pr = 1 / (1.9 - Z * 0.55), px = cx + X * Rc * pr * 1.25, py = cy + Y * Rc * pr * 1.25, al = 0.22 + (Z + 1) * 0.36;
      c.fillStyle = 'rgba(225,238,255,' + al.toFixed(3) + ')';
      var ps = (0.9 + (Z + 1) * 0.55) * DPR; c.fillRect(px, py, ps, ps);
    }
    if (this.cnt) { var cn = Math.round(4000 * (1 - Math.pow(1 - e1, 2))); setTxt(this.cnt, cn.toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU') + (cn >= 4000 ? '+' : '')); }
    // синапсы: связь к соседу или к ядру, бегущий импульс, светящийся узел
    var m = Math.floor(this.lit.length * e3);
    for (var n = 0; n < m; n++) {
      var L = this.lit[n], g = this.field[L.k], gx = fx(g), gy = fy(g);
      var P = L.par >= 0 ? this.field[this.lit[L.par].k] : null, px2 = P ? fx(P) : cx, py2 = P ? fy(P) : cy;
      var age = clamp((e3 * this.lit.length - n) / 6, 0, 1);
      c.strokeStyle = 'rgba(80,165,255,' + (0.32 * age).toFixed(3) + ')'; c.lineWidth = Math.max(1, DPR * 0.9);
      c.beginPath(); c.moveTo(px2, py2); c.lineTo(gx, gy); c.stroke();
      var u = (t * 0.00045 + L.off) % 1, ix = px2 + (gx - px2) * u, iy = py2 + (gy - py2) * u, is = 10 * DPR;
      c.globalAlpha = age * 0.9; c.drawImage(this.glowNode, ix - is / 2, iy - is / 2, is, is);
      var ns = (16 + 6 * Math.sin(t * 0.004 + L.off * 9)) * DPR; c.globalAlpha = age; c.drawImage(this.glowNode, gx - ns / 2, gy - ns / 2, ns, ns); c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
    this.items.forEach(function (it) { var on = p >= it.a && p <= it.b; if (on !== it.on) { it.on = on; it.n.classList.toggle('on', on); } });
    return !REDUCED;   // живёт, пока на экране: мерцание и импульсы идут и без скролла
  };

  /* ── телефон по скроллу: подсказки → запрос → ответы бизнесов → их приложения → оплата → Loop ── */
  /* мокап телефона: интерфейс в родных точках iPhone (393 pt), масштабируется под размер телефона на странице — пропорции как на устройстве */
  function fitPhoneUI() {
    document.querySelectorAll('#agent .dv-screen').forEach(function (scr) {
      var ui = scr.querySelector(':scope > .dv-ui');
      if (!ui) { ui = document.createElement('div'); ui.className = 'dv-ui'; while (scr.firstChild) ui.appendChild(scr.firstChild); scr.appendChild(ui); }
      var w = scr.clientWidth, h = scr.clientHeight; if (!w || !h) return;
      var W = Math.round(clamp(w * 1.25, 270, 393)), H = Math.round(W * h / w);   // маленький макет — меньше точек, иначе текст ужимается до нечитаемого
      ui.style.width = W + 'px'; ui.style.height = H + 'px'; ui.style.transform = 'scale(' + (w / W).toFixed(5) + ')';
    });
  }
  fitPhoneUI(); addEventListener('resize', fitPhoneUI);
  if (window.ResizeObserver) { var dvs = document.querySelector('#agent .dv-screen'); if (dvs) new ResizeObserver(fitPhoneUI).observe(dvs); }

  function AgentScene(el) {
    var q = function (sel) { return el.querySelector(sel); }, self = this;
    this.el = el; this.stage = q('.stage'); this.p = -1;
    this.scr = {}; el.querySelectorAll('.gs').forEach(function (n) { self.scr[n.getAttribute('data-s')] = n; });
    this.msg = [].map.call(el.querySelectorAll('.msgs [data-t]'), function (n) { return { n: n, t: +n.getAttribute('data-t'), on: false }; });
    this.hl = [].map.call(el.querySelectorAll('[data-h]'), function (n) { return { n: n, t: +n.getAttribute('data-h'), on: false }; });
    this.done = [].map.call(el.querySelectorAll('.msgs [data-done]'), function (n) { return { n: n, t: +n.getAttribute('data-done'), pts: +(n.getAttribute('data-pts') || 0), on: false }; });
    this.pins = [].map.call(el.querySelectorAll('.mc-pin'), function (n) { return { n: n, t: +n.getAttribute('data-k') }; });
    this.route = el.querySelector('.mc-route'); this.req = el.querySelector('#gReq');
    this.reqText = this.req ? this.req.textContent.replace(/\s+/g, ' ').trim() : '';
    this.apps = [].map.call(el.querySelectorAll('.appview img[data-t]'), function (n) { return { n: n, t: +n.getAttribute('data-t') }; });
    this.goals = [].map.call(el.querySelectorAll('[data-g]'), function (n) { return { n: n, t: +n.getAttribute('data-g') }; });
    this.msgs = q('#gMsgs'); this.draft = q('#gDraft'); this.send = q('#gSend'); this.compose = q('.compose');
    this.tag = q('#gAppTag'); this.seg = q('.seg'); this.coins = q('#gCoins'); this.go = q('#gGo'); this.spend = q('#gSpend'); this.spent = q('#gSpent');
    this.wallet = q('#gWallet'); this.time = q('#gTime'); this.biz = q('#gBiz'); this.pts = q('#gPts'); this.prog = q('#asProg'); this.hint = q('#gHint'); this.title = q('#gTitle');
    this.screen = ''; this.nMsg = -1; this.phase = '';
  }
  var TAGS = ['Hotelito · приложение гостевого дома', 'EPOCH · приложение ресторана', 'Batumi Neon · приложение проката'].map(L);
  var HINTS = [[0, 'Одна просьба агенту вместо ночи с вкладками.'], [0.09, 'Она просто пишет, чего хочет.'], [0.31, 'Агент понимает просьбу и раскладывает её на задачи.'], [0.42, 'И сам договаривается с каждым бизнесом.'],
    [0.595, 'Это настоящие приложения наших клиентов.'], [0.745, 'Картой или криптой — одним касанием.'], [0.875, 'Шесть секунд вместо ночи.'], [0.945, 'Это Loop: гость отеля стал гостем ресторана.']].map(function (h) { return [h[0], L(h[1])]; });
  function setTxt(n, v) { if (n && n.textContent !== v) n.textContent = v; }
  AgentScene.prototype.step = function () {
    var r = this.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    var span = this.el.offsetHeight - this.stage.clientHeight, p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    if (Math.abs(p - this.p) < 0.0003) return;
    this.p = p; this.render(p);
  };
  AgentScene.prototype.render = function (p) {
    var self = this;
    var screen = p < 0.08 ? 'intro' : p < 0.595 ? 'chat' : p < 0.745 ? 'app' : p < 0.875 ? 'pay' : 'done';
    if (screen !== this.screen) { for (var k in this.scr) this.scr[k].classList.toggle('on', k === screen); this.screen = screen; haptic(); }
    // она печатает просьбу своими словами — по букве на шаг прокрутки
    var sent = p >= 0.296, n = Math.round(this.reqText.length * clamp((p - 0.09) / 0.185, 0, 1));
    setTxt(this.draft, sent || !n ? (sent ? '' : L('Напишите, чего хотите…')) : this.reqText.slice(0, n));
    this.compose.classList.toggle('typing', n > 0 && !sent);
    this.send.classList.toggle('ready', n > 12); this.send.classList.toggle('sent', p >= 0.285 && p < 0.32);
    // агент понимает: смыслы в её сообщении подсвечиваются и становятся задачами
    this.hl.forEach(function (h) { var on = p >= h.t; if (on !== h.on) { h.on = on; h.n.classList.toggle('hl', on); } });
    if (this.req) this.req.classList.toggle('scan', p >= 0.318 && p < 0.408);                // нейрозрение: луч читает её сообщение
    // и делает сам: «в работе» → галочка; маршрут на карте прорисовывается, точки всплывают
    this.done.forEach(function (d) { var on = p >= d.t; if (on !== d.on) { d.on = on; d.n.classList.toggle('done', on); } });
    if (this.route) this.route.style.strokeDashoffset = (100 - 100 * clamp((p - 0.53) / 0.028, 0, 1)).toFixed(1);
    this.pins.forEach(function (k) { k.n.classList.toggle('on', p >= k.t); });
    // переписка и ответы бизнесов
    var nOn = 0, nRes = 0, pts = 0;
    this.msg.forEach(function (m) {
      var on = p >= m.t; if (on !== m.on) { m.on = on; m.n.classList.toggle('on', on); }
      if (on) nOn++;
    });
    this.done.forEach(function (d) { if (d.on && d.pts) { pts += d.pts; nRes++; } });
    if (nOn !== this.nMsg) { this.nMsg = nOn; var ms = this.msgs; requestAnimationFrame(function () { ms.scrollTop = ms.scrollHeight; }); }
    // настоящие приложения: на экране последнее пройденное
    var cur = -1; this.apps.forEach(function (a, i) { if (p >= a.t) cur = i; });
    this.apps.forEach(function (a, i) { a.n.classList.toggle('on', i === cur); });
    if (cur >= 0) setTxt(this.tag, TAGS[cur]);
    // оплата
    var crypto = p >= 0.8; this.seg.classList.toggle('crypto', crypto); this.coins.classList.toggle('off', !crypto);
    this.go.classList.toggle('pressed', p >= 0.845 && p < 0.88);
    // Loop: баллы отеля уходят на ужин
    var spentNow = p >= 0.945;
    this.spend.classList.toggle('used', spentNow); this.spent.classList.toggle('on', spentNow);
    if (spentNow) pts -= 400;
    setTxt(this.wallet, pts.toLocaleString('ru-RU'));
    // панель миссии
    this.goals.forEach(function (g) { g.n.classList.toggle('ok', p >= g.t); });
    var sec = Math.round(clamp((p - 0.3) / 0.56, 0, 1) * 6);
    setTxt(this.time, '0:0' + sec); setTxt(this.biz, String(nRes)); setTxt(this.pts, pts.toLocaleString('ru-RU'));
    var h = HINTS[0][1]; HINTS.forEach(function (x) { if (p >= x[0]) h = x[1]; });
    setTxt(this.hint, h); setTxt(this.title, L(p >= 0.875 ? 'Готово за 0:06' : 'Соберите отпуск в Батуми'));
    if (this.prog) this.prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  };

  /* ── подача AppOS: карточка первого кадра, главы, «Авто» ── */
  var heroCard = document.getElementById('heroCard'), hud = document.getElementById('chapHud'), chName = document.getElementById('chName'), chDash = document.getElementById('chDash');
  var CHAPS = [['film', ['c01', 't12', 'c02'], 'Ночь'], ['film', ['t23a', 'x1', 'a21', 'a22', 'x2', 't34b'], 'Пробуждение'], ['agent', null, 'Шесть секунд'], ['film2', ['c04', 't45', 'c05'], 'Шесть секунд'],
    ['film2', ['t56h', 'c06h', 'c06j', 't67h'], 'Загородный дом'], ['film2', ['c07k', 'c08'], 'Сеть'], ['dots', null, 'Точки'], ['finale', null, 'Финал'], ['deck', null, 'Что строим']];
  CHAPS.forEach(function (c) { c[2] = L(c[2]); });
  if (chDash) CHAPS.forEach(function () { chDash.appendChild(document.createElement('i')); });
  var curChap = -1;
  function sectionAtCenter() {
    var ids = ['film', 'agent', 'film2', 'dots', 'finale', 'deck'], mid = innerHeight / 2;
    for (var i = 0; i < ids.length; i++) { var e = document.getElementById(ids[i]); if (!e) continue; var r = e.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) return ids[i]; }
    return null;
  }
  function chrome() {
    var t0 = Engine.tracks[0];
    if (heroCard && t0) { var h = 1 - clamp(t0.target / 26, 0, 1); if (dive) dive.classList.toggle('lure', h > 0.9 && !auto); t0.stage.style.setProperty('--hero', h.toFixed(3)); if (h < 0.05) heroCard.setAttribute('data-off', ''); else heroCard.removeAttribute('data-off'); t0.stage.classList.toggle('hero-on', h > 0.35); }
    if (!hud) return;
    var sec = sectionAtCenter(), idx = -1;
    if (sec) {
      var tr = null; Engine.tracks.forEach(function (t) { if (t.el.id === sec) tr = t; });
      var seg = tr ? tr.segs[tr.segAt(Math.round(tr.view))].id : null;
      for (var i = 0; i < CHAPS.length; i++) if (CHAPS[i][0] === sec && (!CHAPS[i][1] || CHAPS[i][1].indexOf(seg) >= 0)) { idx = i; break; }
    }
    var show = idx >= 0;
    hud.classList.toggle('on', show);
    if (idx >= 0 && idx !== curChap) {
      curChap = idx; chName.textContent = CHAPS[idx][2];
      [].forEach.call(chDash.children, function (d, k) { d.className = k < idx ? 'done' : k === idx ? 'cur' : ''; });
    }
  }
  /* ── слова заголовков: каждое — свой элемент, проявляется из размытия по очереди ── */
  if (!REDUCED) document.querySelectorAll('.ch .line, .ch .big, .sl-h').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 1) { walk(c); return; }
        if (c.nodeType !== 3 || !c.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        c.nodeValue.split(/([ \t\n\r]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = part; frag.appendChild(w);
        });
        node.replaceChild(frag, c);
      });
    })(el);
  });

  /* ── листание: жест = одна карточка; видео между карточками проигрывается само ── */
  var stops = [], zoneEnd = 0, lastScroll = 0, touching = false, snapId = 0, snapping = false;
  var pg = { on: false, to: 0, lastW: 0, minD: 1e9, fired: 0, armed: true, acc: 0 };
  function buildStops() {
    stops = [0];
    Engine.tracks.forEach(function (t) {
      var span = t.el.offsetHeight - t.stage.clientHeight; if (span <= 0 || t.N < 2) return;
      var top = t.el.getBoundingClientRect().top + scrollY;
      t.segs.forEach(function (sg) {
        var ch = t.chapters[sg.id]; if (!ch) return;
        // одна остановка на целую карточку: момент, когда её строки уже видны вместе
        var its = ch.items.filter(function (it) { return it.n.parentNode === ch.el; });
        var us = its.map(function (it) {
          var a = it.a; ch.items.forEach(function (o) { if (o !== it && it.n.contains(o.n)) a = Math.max(a, o.a); });   // список внутри карточки — ждём последний пункт
          return Math.min(it.b - 0.02, a + 0.07);
        }).sort(function (a, b) { return a - b; });
        function vis(u) { return its.filter(function (it) { return u >= it.a && u <= it.b; }); }
        us.forEach(function (u, i) {
          if (i < us.length - 1) { var nx = vis(us[i + 1]); if (vis(u).every(function (it) { return nx.indexOf(it) >= 0; })) return; }   // следующая точка показывает то же и больше
          stops.push(top + Math.round(sg.start + u * (sg.n - 1)) / (t.N - 1) * span);   // целый кадр: в покое — чистая картинка, без смешения
        });
      });
    });
    var d = document.getElementById('dots'), g = document.getElementById('agent'), fin = document.getElementById('finale');
    if (d) { var dt = d.getBoundingClientRect().top + scrollY, ds = d.offsetHeight - innerHeight; [0.3, 0.52, 0.86].forEach(function (k) { stops.push(dt + ds * k); }); }   // первая — когда счёт уже дошёл до 4 000+
    if (g) { var gt = g.getBoundingClientRect().top + scrollY, gs = g.offsetHeight - innerHeight; [0.04, 0.2, 0.31, 0.415, 0.5, 0.575, 0.63, 0.68, 0.73, 0.83, 0.9, 0.99].forEach(function (k) { stops.push(gt + gs * k); }); }
    if (fin) { var ft = fin.getBoundingClientRect().top + scrollY; stops.push(ft + fin.offsetHeight - innerHeight); zoneEnd = ft + fin.offsetHeight; }   // последний кадр — логотип
    document.querySelectorAll('.deck .sl').forEach(function (sl) {                // слайды брифа: по одному на жест; высокий — ещё остановка на его низе
      var st = sl.getBoundingClientRect().top + scrollY, sh = sl.offsetHeight;
      stops.push(st); if (sh > innerHeight + 24) stops.push(st + sh - innerHeight);
      zoneEnd = Math.max(zoneEnd, st + sh);
    });
    stops.sort(function (a, b) { return a - b; });
    var gap = innerHeight * 0.3;                                                    // свайп обязан что-то показать: близкие точки сливаются в дальнюю
    stops = stops.filter(function (y, i) { return i === stops.length - 1 || stops[i + 1] - y > gap; });
  }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easePage(t) {                                    // трапеция скорости: видео не ползёт ступеньками в конце перехода
    var a = 0.18, d = 0.22, v = 1 / (1 - a / 2 - d / 2);
    if (t < a) return 0.5 * v * t * t / a;
    if (t > 1 - d) return 1 - 0.5 * v * (1 - t) * (1 - t) / d;
    return v * (a / 2 + t - a);
  }
  function snapTo(y) {
    var y0 = scrollY, t0 = performance.now(), id = ++snapId; snapping = true;
    root.style.scrollBehavior = 'auto';
    (function f(now) {
      if (id !== snapId) { snapping = false; return; }
      var k = Math.min(1, (now - t0) / 650); scrollTo(0, y0 + (y - y0) * easeOut(k));
      if (k < 1) requestAnimationFrame(f); else { snapping = false; root.style.scrollBehavior = ''; }
    })(t0);
  }
  function inZone(dir) { var y = scrollY; return zoneEnd > 0 && (y < zoneEnd - 2 || (dir < 0 && y <= zoneEnd + 2)); }
  function stopFrom(y, dir) {
    if (dir > 0) { for (var i = 0; i < stops.length; i++) if (stops[i] > y + 6) return stops[i]; return y < zoneEnd - 2 ? zoneEnd : null; }
    for (var j = stops.length - 1; j >= 0; j--) if (stops[j] < y - 6) return stops[j];
    return null;
  }
  function pageTo(y, done) {
    var y0 = scrollY, dist = Math.abs(y - y0), chained = pg.on;
    var dur = REDUCED ? 0 : clamp(dist / PX_PER_FRAME * 26, 900, 2400);       // ~26 мс на кадр: переход в 2–3× быстрее жизни, глаз успевает
    var id = ++snapId, t0 = performance.now(); snapping = true; pg.on = true; pg.to = y;
    root.style.scrollBehavior = 'auto';
    Engine.tracks.forEach(function (t) { t.ahead = y; });
    (function f(now) {
      if (id !== snapId) return;
      var k = dur ? Math.min(1, (now - t0) / dur) : 1;
      scrollTo(0, y0 + (y - y0) * (chained ? easeOut(k) : easePage(k)));
      push(dur > 1000 ? Math.sin(Math.PI * k) : 0);                              // наезд камеры на длинном переходе
      if (k < 1) { requestAnimationFrame(f); return; }
      push(0);
      pg.on = false; snapping = false; root.style.scrollBehavior = ''; haptic();
      if (done) done();
    })(t0);
  }
  function push(v) {
    Engine.tracks.forEach(function (t) { if (!t.near()) return; var tf = v > 0.002 ? 'scale(' + (1 + v * 0.06).toFixed(4) + ')' : ''; t.cv.style.transform = tf; if (t.layer) t.layer.style.transform = tf; });
  }
  function go(dir) {
    var y = stopFrom(pg.on ? pg.to : scrollY, dir);
    if (y !== null) pageTo(y);
  }
  // колесо и трекпад: один толчок — одна карточка, хвост инерции не листает дальше
  addEventListener('wheel', function (e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    if (!inZone(dir)) { if (!pg.on) { snapId++; snapping = false; } return; }
    e.preventDefault();
    var now = performance.now(), gap = now - pg.lastW, ad = Math.abs(e.deltaY);
    // новый жест — пауза в колесе или резкий толчок поверх затухшей инерции; разгон того же свайпа новым жестом не считается
    if (gap > 220 || (now - pg.fired > 450 && ad > pg.minD * 3 && ad > 30)) { pg.armed = true; pg.acc = 0; }
    pg.lastW = now; pg.minD = Math.min(pg.minD, ad);
    if (!pg.armed) return;
    pg.acc += e.deltaY;
    if (Math.abs(pg.acc) > 28) { pg.armed = false; pg.fired = now; pg.minD = 1e9; go(dir); }
  }, { passive: false });
  // палец: решаем на первом же движении, иначе iOS успевает начать свой скролл
  var tY = 0, tX = 0, tMode = 0, tFired = false;
  addEventListener('touchstart', function (e) {
    touching = true; if (!pg.on) { snapId++; snapping = false; }
    var t = e.touches[0]; tY = t.clientY; tX = t.clientX; tMode = 0; tFired = false;
  }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) return;
    var t = e.touches[0], dy = t.clientY - tY, dx = t.clientX - tX;
    if (!tMode) {
      if (!dy && !dx) return;
      tMode = Math.abs(dy) >= Math.abs(dx) && inZone(dy < 0 ? 1 : -1) ? 1 : 2;
    }
    if (tMode !== 1) return;
    if (e.cancelable) e.preventDefault();
    if (!tFired && Math.abs(dy) > 26) { tFired = true; go(dy < 0 ? 1 : -1); }
  }, { passive: false });
  addEventListener('touchend', function () { touching = false; lastScroll = performance.now(); }, { passive: true });
  addEventListener('keydown', function (e) {
    var k = e.key, tag = e.target && e.target.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (k === ' ' && /BUTTON|A/.test(tag))) return;
    var dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1 : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
    if (!dir || !inZone(dir)) return;
    e.preventDefault(); go(dir);
  });
  addEventListener('scroll', function () { lastScroll = performance.now(); }, { passive: true });
  // доводчик для всего прочего: ползунок, якоря, инерция снизу — после остановки к ближайшей карточке
  setInterval(function () {
    if (REDUCED || auto || touching || snapping || !stops.length || !lastScroll) return;
    if (performance.now() - lastScroll < 160) return;
    lastScroll = 0;
    var y = scrollY, best = null, bd = 1e9;
    if (y >= zoneEnd - 4) return;
    stops.forEach(function (s) { var dd = Math.abs(s - y); if (dd < bd) { bd = dd; best = s; } });
    if (best !== null && bd > 4 && bd < innerHeight * 0.34) snapTo(best);
  }, 60);

  /* ── подсказка «листайте»: если зритель 3 с ничего не делает на первом экране (или 12 с в фильме) ── */
  (function () {
    var el = document.getElementById('swipeHint'); if (!el) return;
    var touch = matchMedia('(hover:none),(pointer:coarse)').matches; el.classList.add(touch ? 'is-touch' : 'is-mouse');
    var last = performance.now(), shown = false, used = false;
    function hide() { last = performance.now(); if (shown) { shown = false; el.classList.remove('on'); } }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { addEventListener(ev, function () { used = true; hide(); }, { passive: true }); });
    addEventListener('scroll', function () { if (!snapping && !pg.on && !auto) hide(); }, { passive: true });
    setInterval(function () {
      if (document.getElementById('boot') || auto || pg.on || snapping) { last = performance.now(); return; }
      var inFilm = zoneEnd && scrollY < zoneEnd - innerHeight * 0.5, top = scrollY < innerHeight * 0.3;
      var wait = top && !used ? 3000 : 12000;
      if (!shown && inFilm && performance.now() - last > wait) {
        var hc = document.getElementById('heroCard'), b = 26;
        if (top && hc && !hc.hasAttribute('data-off')) { var r = hc.getBoundingClientRect(); if (r.bottom > innerHeight - 140) b = innerHeight - r.top + 14; }   // над карточкой первого экрана
        el.style.bottom = 'calc(' + Math.round(b) + 'px + env(safe-area-inset-bottom,0px))';
        shown = true; el.classList.add('on');
      }
    }, 250);
  })();

  /* ── «Авто»: листает сам, с паузой на чтение карточки ── */
  var auto = false, autoTm = 0, autoBtn = document.getElementById('autoBtn');
  function setAuto(on) {
    if (on && zoneEnd && scrollY >= zoneEnd - 2) { root.style.scrollBehavior = 'auto'; scrollTo(0, 0); }   // ниже фильма «Авто» запускает показ с начала
    auto = on; clearTimeout(autoTm); if (autoBtn) autoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) autoStep();
    else if (pg.on) { snapId++; pg.on = false; snapping = false; root.style.scrollBehavior = ''; push(0); lastScroll = performance.now(); }   // стоп сразу, доводчик посадит на ближайшую карточку
  }
  function autoStep() {
    if (!auto) return;
    var y = stopFrom(pg.on ? pg.to : scrollY, 1);
    if (y === null || y >= zoneEnd - 2) { setAuto(false); return; }
    pageTo(y, function () {
      if (auto) autoTm = setTimeout(autoStep, dwellHere());
    });
  }
  // сколько стоять на карточке: столько, сколько нужно прочитать её текст (≈18 знаков в секунду)
  function dwellHere() {
    function inView(id) { var e = document.getElementById(id), r = e && e.getBoundingClientRect(); return r && r.top <= 2 && r.bottom >= innerHeight - 2; }
    if (inView('agent')) return 3400;
    if (inView('dots')) return 4200;
    var sl = [].filter.call(document.querySelectorAll('.deck .sl'), function (e) { var r = e.getBoundingClientRect(); return r.top < innerHeight / 2 && r.bottom > innerHeight / 2; })[0];
    if (sl) return clamp(1800 + sl.textContent.replace(/\s+/g, ' ').length * 38, 4500, 11000);
    var n = 0;
    document.querySelectorAll('.ch.on > [data-u].on, .dots-cap .line.on').forEach(function (e) { n += e.textContent.trim().length; });
    return clamp(1600 + n * 55, 3500, 8500);
  }
  if (autoBtn) autoBtn.addEventListener('click', function () { setAuto(!auto); haptic(); });
  document.querySelectorAll('.lang-sw a').forEach(function (a) { a.addEventListener('click', function () { try { localStorage.setItem('lang', a.getAttribute('data-l')); } catch (e) {} }); });
  var dive = document.getElementById('diveBtn');
  if (dive) dive.addEventListener('click', function (e) { e.preventDefault(); setAuto(true); });
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { addEventListener(ev, function (e) { if (auto && !(e.target && e.target.closest && e.target.closest('#autoBtn, #diveBtn'))) setAuto(false); }, { passive: true }); });   // касание самого тумблера — не вмешательство, иначе тап выключал и тут же включал

  /* ── общий цикл ── */
  var Engine = {
    tracks: [], dots: null, phone: null, agent: null, raf: 0, loaded: 0,
    kick: function () { if (!Engine.raf) Engine.raf = requestAnimationFrame(Engine.tick); },
    last: 0,
    tick: function (now) {
      Engine.raf = 0; var more = false, dt = Engine.last ? Math.min(64, now - Engine.last) : 16; Engine.last = now;
      Engine.tracks.forEach(function (t) { if (t.step(dt)) more = true; });
      if (Engine.dots && Engine.dots.step(now)) more = true;
      if (Engine.phone) Engine.phone.step();
      if (Engine.agent) Engine.agent.step();
      chrome();
      if (more) Engine.kick(); else Engine.last = 0;
    }
  };

  function boot(manifest) {
    document.querySelectorAll('.film').forEach(function (el) { Engine.tracks.push(new Track(el, manifest)); });
    var d = document.getElementById('dots'); if (d) Engine.dots = new Dots(d);
    var ag = document.getElementById('agent'); if (ag) { Engine.agent = new AgentScene(ag); Engine.agent.render(0); }
    addEventListener('scroll', Engine.kick, { passive: true });
    var lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', function () {
      // адресная строка iOS меняет высоту посреди жеста: мелкие изменения высоты не пересчитываем (#876)
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 200) return;
      lastW = innerWidth; lastH = innerHeight;
      Engine.tracks.forEach(function (t) { t.size(); }); if (Engine.dots) Engine.dots.size(); Engine.kick(); setTimeout(buildStops, 200);
    });
    Engine.kick();
    setTimeout(buildStops, 300);
    // заставка: ждём первые кадры, но не дольше 8 с; потом удаляем из DOM
    var bootEl = document.getElementById('boot'), bar = document.getElementById('bootBar'), t0 = performance.now();
    (function wait() {
      var ready = Engine.tracks[0] ? Engine.tracks[0].bm.size : 0, need = 24;
      if (bootEl) bootEl.style.setProperty('--p', Math.min(1, ready / need).toFixed(3));
      if ((ready >= need && performance.now() - t0 > 1500) || performance.now() - t0 > 8000) {   // минимум 1,5 с: заставка успевает сыграть
        if (bootEl) { bootEl.classList.add('out'); setTimeout(function () { bootEl.remove(); Engine.kick(); }, 600); }
        return;
      }
      setTimeout(wait, 120);
    })();
  }


  /* ── заставка: частицы с фона притягиваются к круглому логотипу, поглощение подсвечивает ядро ── */
  (function bootFx() {
    var cv = document.getElementById('bootCv'), orb = document.getElementById('bootOrb');
    if (!cv || !orb || REDUCED) return;
    var c = cv.getContext('2d'), W, H, cx, cy, R, energy = 0, P = [], N = NARROW ? 240 : 460;
    function size() { W = cv.width = Math.round(innerWidth * DPR); H = cv.height = Math.round(innerHeight * DPR); cx = W / 2; cy = H / 2; R = 74 * DPR; }
    function spawn(p, anywhere) {
      var a = Math.random() * 6.2832, d = anywhere ? Math.random() * Math.hypot(W, H) * 0.6 + R * 2 : Math.hypot(W, H) * (0.45 + Math.random() * 0.25);
      p.x = cx + Math.cos(a) * d; p.y = cy + Math.sin(a) * d; p.vx = 0; p.vy = 0; p.s = (0.7 + Math.random() * 1.3) * DPR; p.h = Math.random();
      return p;
    }
    size(); addEventListener('resize', size);
    for (var i = 0; i < N; i++) P.push(spawn({}, true));
    (function frame() {
      if (!document.getElementById('boot')) return;                       // заставка снята — анимация останавливается
      c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      for (var k = 0; k < P.length; k++) {
        var p = P[k], dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1, a = 2600 * DPR / (d + 140 * DPR);
        var sw = 0.024 * clamp((d - R) / (R * 4), 0, 1);                         // закрутка гаснет у круга: частица падает в лого, а не кружит
        p.vx = (p.vx + (dx / d) * a * 0.06 - (dy / d) * a * sw) * 0.965;
        p.vy = (p.vy + (dy / d) * a * 0.06 + (dx / d) * a * sw) * 0.965;
        var ox = p.x, oy = p.y; p.x += p.vx; p.y += p.vy;
        if (d < R * 1.04) { energy = Math.min(1.6, energy + 0.05); spawn(p, false); continue; }
        var sp = Math.min(1, Math.hypot(p.vx, p.vy) / (6 * DPR)), al = 0.25 + sp * 0.65;
        c.strokeStyle = p.h < 0.7 ? 'rgba(120,190,255,' + al.toFixed(3) + ')' : 'rgba(225,240,255,' + al.toFixed(3) + ')';
        c.lineWidth = p.s; c.beginPath(); c.moveTo(ox, oy); c.lineTo(p.x, p.y); c.stroke();
      }
      energy *= 0.94; orb.style.setProperty('--e', energy.toFixed(3));
      requestAnimationFrame(frame);
    })();
  })();

  fetch('seq/v1/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(boot, function () {
    var b = document.getElementById('boot'); if (b) b.remove();
  });
  setTimeout(function () {                                   // страховка: повисший запрос не держит заставку вечно
    var b = document.getElementById('boot'); if (b) { b.classList.add('out'); setTimeout(function () { b.remove(); Engine.kick(); }, 600); }
  }, 12000);

  /* ── секции: появление, карусели экранов, наклон карточек ── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(function (n) { io.observe(n); });
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); so.unobserve(e.target); } });
  }, { threshold: 0.35 });
  document.querySelectorAll('.deck .sl').forEach(function (n) { so.observe(n); });

  document.querySelectorAll('[data-car]').forEach(function (car) {
    var imgs = car.querySelectorAll('img'), dots = car.querySelectorAll('.dots i'), k = 0, vis = false, tm = 0;
    if (imgs.length < 2) return;
    var vo = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis && !tm) tm = setInterval(next, +car.getAttribute('data-ms') || 2600); if (!vis && tm) { clearInterval(tm); tm = 0; } });
    vo.observe(car);
    function next() { imgs[k].classList.remove('on'); if (dots[k]) dots[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); if (dots[k]) dots[k].classList.add('on'); }
  });


  /* ── лента приложений: сама едет, но её можно тянуть пальцем, мышью и трекпадом; бросок — с инерцией ── */
  document.querySelectorAll('.marquee').forEach(function (mq) {
    var tr = mq.querySelector('.mq-track'); if (!tr) return;
    [].slice.call(tr.children).forEach(function (c) { var k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); k.tabIndex = -1; tr.appendChild(k); });
    tr.querySelectorAll('img').forEach(function (i) { i.draggable = false; });
    var x = 0, v = 0, half = 0, drag = false, cap = false, lastX = 0, lastT = 0, moved = 0, rest = 0, vis = false, raf = 0, tPrev = 0;
    function measure() { half = tr.scrollWidth / 2; }
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    function frame(now) {
      raf = 0; if (!vis) return;
      var dt = tPrev ? Math.min(48, now - tPrev) : 16; tPrev = now;
      if (!drag) {
        if (Math.abs(v) > 0.02) { x += v * dt; v *= Math.pow(0.94, dt / 16); }
        else if (now > rest && !REDUCED) x += 0.045 * dt;
      }
      if (half) x = ((x % half) + half) % half;
      tr.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis && !raf) { tPrev = 0; measure(); raf = requestAnimationFrame(frame); } }).observe(mq);
    mq.addEventListener('pointerdown', function (e) { drag = true; cap = false; moved = 0; v = 0; lastX = e.clientX; lastT = performance.now(); });
    mq.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - lastX, now = performance.now();
      x -= dx; moved += Math.abs(dx); v = -dx / Math.max(8, now - lastT); lastX = e.clientX; lastT = now;
      if (!cap && moved > 6) { cap = true; mq.classList.add('drag'); try { mq.setPointerCapture(e.pointerId); } catch (er) {} }   // захват только после сдвига: клик по приложению остаётся ссылкой
    });
    function up() { if (!drag) return; drag = false; mq.classList.remove('drag'); rest = performance.now() + 2600; }
    mq.addEventListener('pointerup', up); mq.addEventListener('pointercancel', up); mq.addEventListener('lostpointercapture', up);
    mq.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    mq.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); x += e.deltaX; v = 0; rest = performance.now() + 2600; } }, { passive: false });
    mq.addEventListener('mouseenter', function () { rest = Infinity; });
    mq.addEventListener('mouseleave', function () { rest = performance.now() + 500; });
  });

  /* ── бегущая строка ниш: вторая копия для бесшовного круга, скорость — по длине ── */
  document.querySelectorAll('.cl-track').forEach(function (t) {
    [].slice.call(t.children).forEach(function (c) { var k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); t.appendChild(k); });
    t.style.setProperty('--cl-dur', Math.max(18, Math.round(t.children.length / 2 * 2.6)) + 's');
  });

  /* ── карта: превью на телефоне листается вбок, «Исследовать» открывает живую карту поверх страницы ── */
  (function () {
    var pan = document.getElementById('mapPan'), open = document.getElementById('mapOpen'), modal = document.getElementById('mapModal'), close = document.getElementById('mapClose');
    if (!open || !modal) return;
    var fr = modal.querySelector('iframe');
    function shut() { modal.hidden = true; root.style.overflow = ''; }
    open.addEventListener('click', function (e) {
      e.preventDefault(); haptic();
      if (!fr.src || fr.src === 'about:blank') fr.src = open.href;
      modal.hidden = false; root.style.overflow = 'hidden';
    });
    close.addEventListener('click', shut);
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) shut(); });
  })();

  /* ── цифры: счёт при появлении ── */
  var no = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; no.unobserve(e.target);
      var b = e.target, n = +b.getAttribute('data-n'), t0 = performance.now();
      (function f() { var k = Math.min(1, (performance.now() - t0) / 1400); b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })();
    });
  }, { threshold: .6 });
  document.querySelectorAll('[data-n]').forEach(function (b) { no.observe(b); });

  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !REDUCED) {
    document.querySelectorAll('.st,.num,.money,.team3').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 6).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-2px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }
})();
