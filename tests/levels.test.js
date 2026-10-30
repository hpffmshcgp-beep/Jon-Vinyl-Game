const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const LV of ['Easy','Normal','Hard','Expert','Expertplus']) for (const [n, o] of [['desk', { viewport: {width:1280,height:800} }], ['phone', { viewport: {width:375,height:740}, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(C.FILE_URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#d'+LV); await p.waitForTimeout(300);
    await p.screenshot({ path: C.OUT + `lv-${LV}-${n}-how.png` });
    await p.click('#startBtn'); await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 }); await p.click('#skipBtn'); await p.waitForFunction(() => mode === 'play', null, { timeout: 20000 });
    const info = await p.evaluate(() => [DIFF, PAR, S.notes.length]);
    await p.evaluate(() => { setInterval(() => { const t = songTime(); for (const n of S.notes) if (!n.judged && Math.abs(n.t - t) < 0.012) press(n.lane === 2 ? 0 : n.lane, performance.now()); }, 2); });
    await p.evaluate(() => { S.startAt -= (54 - songTime()); }); await p.waitForTimeout(3500);
    await p.screenshot({ path: C.OUT + `lv-${LV}-${n}-play.png` });
    const c = await p.evaluate(() => S.counts);
    await p.evaluate(() => { S.notes.forEach(n => { if (!n.judged) { n.judged = true; n.hit = true; S.wsum += 1; } }); S.score += 1; S.startAt -= (CUT.endCard + 0.3 - songTime()); });
    await p.waitForFunction(() => S.sc && S.sc.kind === 'bow', null, { timeout: 15000 });   // whatever the score, the story goes on to the bow
    const res = await p.evaluate(() => [S.sc.ph, document.getElementById('results').hidden]);
    console.log(LV,n, JSON.stringify(info), JSON.stringify(c), JSON.stringify(res), errs);
    await ctx.close();
  }
  await b.close();
})();
