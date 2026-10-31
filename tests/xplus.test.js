// Expert+ is locked on each song until it's beaten with three stars on Expert (the prologue: a 3-star review or better).
// Usage: node xplus.test.js
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [n, o] of [['desk', C.DESK], ['phone', C.PHONE]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1);
      localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: { 3: 3 }, best: {} })); localStorage.setItem('sc-diff', 'expertplus'); } });
    await p.goto(C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    const check = (cond, msg) => { if (!cond) throw new Error(n + ': ' + msg); };
    // the lobby: Expert+ locked, a saved Expert+ choice falls back to Expert, a click explains and doesn't select it
    await p.waitForFunction(() => mode === 'title', null, { timeout: 30000 }); await p.waitForTimeout(600);
    await p.evaluate(() => { goTitle(); showPanel('how'); }); await p.waitForTimeout(600);
    let s = await p.evaluate(() => ({ diff: DIFF, locked: document.getElementById('dExpertplus').classList.contains('locked') }));
    check(s.locked && s.diff === 'expert', 'lobby should lock Expert+ ' + JSON.stringify(s));
    await p.click('#dExpertplus', { force: true });   // aria-disabled, but still clickable: it explains the lock
    s = await p.evaluate(() => ({ diff: DIFF, note: document.getElementById('diffNote').textContent }));
    check(s.diff === 'expert' && /three-star review on Expert/.test(s.note), 'locked click ' + JSON.stringify(s));
    await p.screenshot({ path: C.OUT + `xplus-${n}-lobby-locked.png` });
    // a 3-star review on Expert opens it for the prologue
    await p.evaluate(() => { S = { notes: [{}], counts: { perfect: 1, great: 0, ok: 0 }, score: 0 }; const r = rateRun(); window.__r = r; goTitle(); showPanel('how'); }); await p.waitForTimeout(400);
    s = await p.evaluate(() => ({ r: window.__r.xplus, locked: document.getElementById('dExpertplus').classList.contains('locked') }));
    check(s.r === true && !s.locked, 'prologue unlock ' + JSON.stringify(s));
    await p.click('#dExpertplus'); check(await p.evaluate(() => DIFF) === 'expertplus', 'prologue Expert+ selectable');
    // the record: Deflect (3 stars but not on Expert) is still locked; three stars on Expert opens it
    await p.evaluate(() => goTitle()); await p.click('#recordBtn');
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; MAP.at = 2; showStop(2); }); await p.waitForTimeout(800);
    s = await p.evaluate(() => ({ diff: DIFF, locked: document.querySelector('.stopCard .diffBtn[data-d=expertplus]').classList.contains('locked') }));
    check(s.locked && s.diff === 'expert', 'map lock ' + JSON.stringify(s));
    await p.click('.stopCard .diffBtn[data-d=expertplus]', { force: true });
    check(/Three stars on Expert/.test(await p.evaluate(() => document.getElementById('stopNote').textContent)), 'map note');
    await p.screenshot({ path: C.OUT + `xplus-${n}-map-locked.png` });
    await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level' && LV && LV.running, null, { timeout: 30000 });
    await p.evaluate(() => { LV.notes.forEach(x => { x.judged = true; x.hit = true; }); LV.counts = { perfect: LV.notes.length, good: 0, miss: 0 }; levelEnd(); });
    s = await p.evaluate(() => ({ line: document.getElementById('resLine').textContent, x: JSON.parse(localStorage.getItem('jv-progress')).xplus }));
    check(/Expert\+ unlocked/.test(s.line) && s.x[3], 'unlock on results ' + JSON.stringify(s));
    await p.screenshot({ path: C.OUT + `xplus-${n}-results.png` });
    await p.click('#intoBtn'); await p.waitForFunction(() => mode === 'map', null, { timeout: 30000 }); await p.waitForTimeout(800);
    await p.evaluate(() => { MAP.at = 2; showStop(2); });
    check(!(await p.evaluate(() => document.querySelector('.stopCard .diffBtn[data-d=expertplus]').classList.contains('locked'))), 'map unlocked after');
    await p.click('.stopCard .diffBtn[data-d=expertplus]'); check(await p.evaluate(() => DIFF) === 'expertplus', 'Deflect Expert+ selectable');
    await p.evaluate(() => showStop(3));   // Void still locked, falls back to Expert
    check(await p.evaluate(() => DIFF) === 'expert', 'Void stays locked');
    await p.screenshot({ path: C.OUT + `xplus-${n}-map-void.png` });
    console.log(n, 'ok', errs); await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
