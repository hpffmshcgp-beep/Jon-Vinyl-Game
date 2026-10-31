// The cold open: the stranger in the casino doorway and his two lines.
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [n, o] of [['desk', C.DESK], ['phone', C.PHONE]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); await C.skipLessons(p); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#startBtn'); await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 }); await p.evaluate(() => startSong());   // test shortcut past the opening await p.waitForFunction(() => mode === 'play');
    for (const at of [5.2, 7.0]) { await p.evaluate(at => { S.startAt -= (at - songTime()); }, at); await p.waitForTimeout(250); await p.screenshot({ path: C.OUT + `coldopen-${n}-${at}.png` }); }
    console.log(n, 'cold open ok', errs); await ctx.close();
  }
  await b.close();
})();
