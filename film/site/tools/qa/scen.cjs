const { chromium } = require('/Users/roch/code/AppBrandHUB/node_modules/playwright');
const U = 'http://localhost:8776/';
const res = [];
const ok = (name, cond, extra) => res.push((cond ? '✓ ' : '✗ ') + name + (extra ? ' — ' + extra : ''));
const ready = p => p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
(async () => {
  const b = await chromium.launch();
  // 1. карта: открыть, закрыть кнопкой и Esc
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + '?lang=ru'); await ready(p);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.getElementById('map').getBoundingClientRect().top + scrollY - 60); }); await p.waitForTimeout(800);
    await p.click('#mapOpen'); await p.waitForTimeout(600);
    const open1 = await p.evaluate(() => !document.getElementById('mapModal').hidden && getComputedStyle(document.documentElement).overflow === 'hidden');
    const src = await p.evaluate(() => document.querySelector('#mapModal iframe').src);
    await p.click('#mapClose'); await p.waitForTimeout(200);
    const shut1 = await p.evaluate(() => document.getElementById('mapModal').hidden && document.documentElement.style.overflow === '');
    await p.click('#mapOpen'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const shut2 = await p.evaluate(() => document.getElementById('mapModal').hidden);
    ok('карта открывается поверх и блокирует прокрутку', open1, src); ok('карта закрывается кнопкой', shut1); ok('карта закрывается Esc', shut2); ok('без ошибок (карта)', !errs.length, errs.join('; '));
    await ctx.close(); }
  // 2. язык: RU→EN→RU без петли; автоопределение
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ru-RU' }); const p = await ctx.newPage();
    await p.goto(U); await ready(p);
    ok('русский браузер остаётся на RU', !/en\.html/.test(p.url()), p.url());
    await p.click('.lang-sw a[data-l="en"]'); await p.waitForURL(/en\.html/); await ready(p);
    ok('RU→EN', /en\.html/.test(p.url()) && await p.evaluate(() => document.documentElement.lang === 'en'));
    await p.goto(U); await p.waitForTimeout(1500);
    ok('выбор EN запоминается: корень уводит на EN', /en\.html/.test(p.url()), p.url());
    await p.click('.lang-sw a[data-l="ru"]'); await p.waitForTimeout(2000);
    ok('EN→RU и остаётся', !/en\.html/.test(p.url()) && await p.evaluate(() => document.documentElement.lang === 'ru'), p.url());
    await ctx.close();
    const c2 = await b.newContext({ locale: 'en-US' }); const p2 = await c2.newPage(); await p2.goto(U); await p2.waitForTimeout(1500);
    ok('английский браузер → EN', /en\.html/.test(p2.url()), p2.url()); await c2.close(); }
  // 3. «уменьшить движение»: текст виден, листание мгновенное
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + '?lang=ru'); await ready(p);
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(600);
    const y = await p.evaluate(() => scrollY);
    const vis = await p.evaluate(() => { const w = document.querySelector('.ch.on.full .w'); return w ? getComputedStyle(w).opacity : 'нет .w'; });
    ok('reduced-motion: листание работает', y > 100, 'scrollY ' + Math.round(y)); ok('reduced-motion: слова видны', vis === '1' || vis === 'нет .w', vis); ok('без ошибок (reduced)', !errs.length, errs.join('; '));
    await ctx.close(); }
  // 4. Telegram Mini App: подменный WebApp
  { const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('https://telegram.org/js/telegram-web-app.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.Telegram={WebApp:{initData:"x",platform:"ios",version:"8.0",viewportStableHeight:700,colorScheme:"dark",ready(){window.__tgReady=1},expand(){window.__tgExp=1},disableVerticalSwipes(){window.__tgSw=1},setHeaderColor(){},setBackgroundColor(){},onEvent(){},HapticFeedback:{selectionChanged(){window.__hap=(window.__hap||0)+1},impactOccurred(){}}}}' }));
    await p.goto(U + '?lang=ru'); await ready(p);
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(2600);
    const tg = await p.evaluate(() => ({ ready: !!window.__tgReady, exp: !!window.__tgExp, sw: !!window.__tgSw, hap: window.__hap || 0, lane: [...performance.getEntriesByType('resource')].some(e => /seq\/v1\/lo\//.test(e.name)) }));
    ok('TMA: ready/expand/disableVerticalSwipes', tg.ready && tg.exp && tg.sw, JSON.stringify(tg)); ok('TMA: лёгкие кадры lo', tg.lane); ok('TMA: вибрация на смене карточки', tg.hap > 0); ok('без ошибок (TMA)', !errs.length, errs.join('; '));
    await ctx.close(); }
  // 5. клавиатура и «Авто» до конца
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    await p.goto(U + '?lang=ru'); await ready(p);
    const y0 = await p.evaluate(() => scrollY);
    await p.keyboard.press('PageDown'); await p.waitForTimeout(2600); const y1 = await p.evaluate(() => scrollY);
    await p.keyboard.press('ArrowUp'); await p.waitForTimeout(2600); const y2 = await p.evaluate(() => scrollY);
    ok('PageDown — следующая карточка, ArrowUp — назад', y1 > y0 && Math.abs(y2 - y0) < 5, [y0, y1, y2].map(Math.round).join(' → '));
    // «Авто» с последнего слайда: должен остановиться на конце колоды
    await p.evaluate(() => { const d = document.getElementById('deck'); const sl = d.querySelectorAll('.sl'); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, sl[sl.length - 2].getBoundingClientRect().top + scrollY); });
    await p.waitForTimeout(800); await p.click('#autoBtn');
    await p.waitForTimeout(16000);
    const end = await p.evaluate(() => ({ pressed: document.getElementById('autoBtn').getAttribute('aria-pressed'), y: Math.round(scrollY), deckEnd: Math.round(document.getElementById('deck').getBoundingClientRect().bottom + scrollY) }));
    ok('«Авто» доходит до конца и выключается сам', end.pressed === 'false' && end.y >= end.deckEnd - 900, JSON.stringify(end));
    await ctx.close(); }
  // 6. кадры не загрузились — заставка не висит вечно
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    await p.route('**/seq/v1/manifest.json', r => r.abort()); const t0 = Date.now();
    await p.goto(U + '?lang=ru'); const gone = await p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 12000 }).then(() => true, () => false);
    ok('без manifest заставка снимается', gone, (Date.now() - t0) + ' мс'); await ctx.close(); }
  console.log(res.join('\n'));
  await b.close();
})();
