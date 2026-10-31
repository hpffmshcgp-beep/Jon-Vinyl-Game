const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [n, o] of [['desk', { viewport: {width:1280,height:800} }], ['phone', { viewport: {width:390,height:780}, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }], ['land', { viewport: {width:844,height:390}, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); await C.skipLessons(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.evaluate(() => setDiff('normal')); await p.click('#startBtn'); await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 }); await p.evaluate(() => startSong());   // test shortcut past the opening await p.waitForFunction(() => mode === 'play', null, { timeout: 20000 });
    await p.evaluate(() => { S.startAt -= (OPEN.start + 0.8 - songTime()); }); await p.waitForTimeout(500);
    // real taps: left half then right half
    if (n === 'desk') { await p.keyboard.press('KeyF'); await p.waitForTimeout(60); await p.keyboard.press('ArrowRight'); }
    else { await p.evaluate(() => { window.__pd = []; cv.addEventListener('pointerdown', e => __pd.push([e.pointerType, Math.round(e.clientX)]), true); }); await p.touchscreen.tap(60, 200); await p.waitForTimeout(400); await p.touchscreen.tap(o.viewport.width - 60, 200); console.log(await p.evaluate(() => JSON.stringify(__pd))); }
    await p.waitForTimeout(60);
    await p.screenshot({ path: C.OUT + `split-${n}.png` });
    const fl = await p.evaluate(() => S.flash.map(x => +x.toFixed(2)));
    console.log(n, 'lane flashes', fl, errs); await ctx.close();
  }
  await b.close();
})();
