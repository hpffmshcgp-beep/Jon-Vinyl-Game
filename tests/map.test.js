// The record map: open it with saved progress, check what is shown, and take screenshots on desktop and phone.
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const cases = process.env.ONLY === 'phone' ? [['phone', C.PHONE, {}]] : process.env.ONLY ? [['desk3', C.DESK, { 1: 3, 2: 2, 3: 1 }]] : [['desk', C.DESK, {}], ['phone', C.PHONE, {}], ['desk3', C.DESK, { 1: 3, 2: 2, 3: 1 }]];
  for (const [n, o, stars] of cases) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(st => localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: st, best: {} })), stars);
    await p.goto(C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.waitForTimeout(200);
    const btn = await p.evaluate(() => [!document.getElementById('recordBtn').hidden, document.getElementById('nextBtn').textContent]);
    await p.click('#recordBtn'); await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 30000 });
    const t0 = await p.evaluate(() => { window.__f = 0; const c = () => { __f++; requestAnimationFrame(c); }; requestAnimationFrame(c); return performance.now(); });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; });   // skip the drop-in so the camera settles
    await p.waitForFunction(() => __f >= 14, null, { timeout: 240000, polling: 500 });
    const fps = await p.evaluate(t0 => __f / ((performance.now() - t0)/1000), t0);
    await p.screenshot({ path: C.OUT + `map-${n}.png` });
    const info = await p.evaluate(() => [reachedIndex(), document.getElementById('stopTitle').textContent, document.getElementById('mapStars').textContent]);
    console.log(n, 'title buttons', JSON.stringify(btn), 'map', JSON.stringify(info), 'fps', fps.toFixed(1), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
