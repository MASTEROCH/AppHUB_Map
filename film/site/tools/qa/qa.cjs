const { chromium } = require('/Users/roch/code/AppBrandHUB/node_modules/playwright');
const OUT = __dirname;
const CONF = [
  ['ru-390', 'ru', { width: 390, height: 844 }, 2, true, true],
  ['ru-375se', 'ru', { width: 375, height: 667 }, 2, true, true],
  ['ru-1440', 'ru', { width: 1440, height: 900 }, 1, false, true],
  ['en-390', 'en', { width: 390, height: 844 }, 2, true, true],
  ['en-1280', 'en', { width: 1280, height: 720 }, 1, false, true],
  ['ru-430', 'ru', { width: 430, height: 932 }, 2, true, false],
  ['ru-768', 'ru', { width: 768, height: 1024 }, 2, true, false],
  ['ru-1920', 'ru', { width: 1920, height: 1080 }, 1, false, false],
];
const pick = process.argv[2] ? CONF.filter(c => c[0] === process.argv[2]) : CONF;
const checks = () => {
  const vw = innerWidth, vh = innerHeight, out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push('overflow-x ' + document.documentElement.scrollWidth);
  document.querySelectorAll('.top > *, .hud-r > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > vw + 1 || r.left < -1)) out.push('header-out ' + e.className + ' ' + Math.round(r.right)); });
  const hb = document.querySelector('.top').getBoundingClientRect().bottom;
  document.querySelectorAll('.ch.on.full, .sl, .cn.on .cn-tag.on, .dots-cap .line.on, .hero-card:not([data-off])').forEach(e => {
    const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > vh) return;
    const cls = (e.className + '').slice(0, 30);
    if (!e.classList.contains('sl') && (r.top < hb - 1 && r.bottom > hb)) out.push('under-header ' + cls);
    if (!e.classList.contains('sl') && (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1)) out.push('off-screen ' + cls + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.right) + ',' + Math.round(r.bottom));
    e.querySelectorAll('p,span,b,h1,h2,a,em,li,div').forEach(t => { if (t.children.length === 0 && t.scrollWidth > t.clientWidth + 2 && getComputedStyle(t).overflow !== 'visible') out.push('text-clip ' + t.textContent.trim().slice(0, 30)); });
  });
  const ph = document.querySelector('#agent .dv-screen'); if (ph) { const r = ph.getBoundingClientRect(); if (r.top < vh && r.bottom > 0 && (r.bottom > vh + 1 || r.top < hb - 1)) out.push('phone-out ' + Math.round(r.top) + '-' + Math.round(r.bottom)); }
  const tags = [...document.querySelectorAll('.cn.on .cn-tag.on')].map(e => e.getBoundingClientRect());
  for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) { const a = tags[i], b = tags[j]; if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) out.push('tag-overlap ' + i + '/' + j); }
  return out;
};
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const [nm, lang, vp, dsf, mob, full] of pick) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mob, hasTouch: mob, locale: lang === 'en' ? 'en-US' : 'ru-RU' });
    const p = await ctx.newPage(); const errs = [], bad = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 120)); });
    p.on('requestfailed', r => bad.push('failed ' + r.url().slice(0, 100))); p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 100)); });
    const t0 = Date.now();
    await p.goto('http://localhost:8776/' + (lang === 'en' ? 'en.html' : '') + '?lang=' + lang + '&t=' + Date.now());
    await p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 }).catch(() => errs.push('boot не снялся за 20 с'));
    const bootMs = Date.now() - t0;
    const issues = []; const add = (where, arr) => arr.forEach(x => issues.push(where + ': ' + x));
    add('hero', await p.evaluate(checks));
    await p.screenshot({ path: `${OUT}/${nm}-00.png` });
    let i = 1, prev = -1, same = 0;
    const zoneEndY = await p.evaluate(() => { const d = document.getElementById('deck'); return d.getBoundingClientRect().bottom + scrollY; });
    if (full) {
      while (i < 60) {
        await p.keyboard.press('ArrowDown');
        // ждём, пока прокрутка встанет
        await p.waitForTimeout(3300);
        const yy = await p.evaluate(() => Math.round(scrollY));
        add('stop' + String(i).padStart(2, '0') + '@' + yy, await p.evaluate(checks));
        await p.screenshot({ path: `${OUT}/${nm}-${String(i).padStart(2, '0')}.png` });
        if (yy === prev) { if (++same >= 1) break; } else same = 0;
        prev = yy; i++;
        if (yy >= zoneEndY - 5) break;
      }
    }
    // ниже фильма: секции
    for (const id of ['how', 'apps', 'map', 'team']) {
      await p.evaluate(id => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.getElementById(id); scrollTo(0, e.getBoundingClientRect().top + scrollY - 50); }, id);
      await p.waitForTimeout(1300); add(id, await p.evaluate(checks));
      await p.screenshot({ path: `${OUT}/${nm}-z-${id}.png` });
    }
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${nm}-z-foot.png` });
    report[nm] = { bootMs, stops: i - 1, errs: [...new Set(errs)], bad: [...new Set(bad)], issues: [...new Set(issues)] };
    console.log(nm, JSON.stringify(report[nm]));
    await ctx.close();
  }
  require('fs').writeFileSync(OUT + '/report-' + (process.argv[2] || 'all') + '.json', JSON.stringify(report, null, 1));
  await b.close();
})();
