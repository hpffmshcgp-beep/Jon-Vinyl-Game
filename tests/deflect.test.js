// Deflect: open the record, play track 3 with a bot jumping between the walls, check hits, results, stars and the map after.
// Usage: node deflect.test.js [desk|phone]
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: {}, best: {} })); localStorage.setItem('sc-diff', 'hard'); });
    await p.goto(process.env.USE_FILE ? C.FILE_URL : C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#recordBtn');
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; });
    const stop = await p.evaluate(() => [MAP.at, document.getElementById('stopTitle').textContent, document.getElementById('stopPlay').disabled, document.getElementById('stopPrev').disabled, document.getElementById('stopNext').disabled]);
    await p.waitForTimeout(1500); await p.screenshot({ path: C.OUT + `deflect-${n}-map.png` });
    await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level', null, { timeout: 30000 });
    await p.waitForTimeout(1200); await p.screenshot({ path: C.OUT + `deflect-${n}-title.png` });
    if (n === 'phone') {   // tap the right side, then the left, before anything is falling: he jumps across and back, no penalty
      const r = await p.evaluate(async () => { const ev = x => cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, pointerType: 'touch', clientX: x, clientY: innerHeight*0.6, bubbles: true }));
        ev(innerWidth*0.8); await new Promise(r => setTimeout(r, 90)); const mid = LV.side; await new Promise(r => setTimeout(r, 300)); ev(innerWidth*0.2); await new Promise(r => setTimeout(r, 300)); return [mid, LV.side, LV.counts.miss, LV.notes[0].side]; });
      console.log(n, 'tap right -> side', r[0], ', tap left -> side', r[1], ', misses', r[2], ', first note on side', r[3]);
    }
    // the bot: jump across right as each one lands
    await p.evaluate(() => setInterval(() => { if (!LV || !LV.running) return; const t = levelTime(); const nx = LV.notes.find((x, i) => i >= LV.next && !x.judged); if (nx && nx.side === LV.side && t >= nx.t - 0.012) levelPress(1 - LV.side); }, 4));
    await p.waitForFunction(() => levelTime() > 12, null, { timeout: 40000 });
    await p.screenshot({ path: C.OUT + `deflect-${n}-play1.png` });
    await p.waitForTimeout(2200); await p.screenshot({ path: C.OUT + `deflect-${n}-play2.png` });
    const mid = await p.evaluate(() => ({ ...LV.counts, judged: LV.notes.filter(x => x.judged).length }));
    // jump near the end, then a miss on purpose to see it get through
    await p.evaluate(() => { LV.startAt -= (LV.chart.duration - 6 - levelTime()); });
    await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 30000 });
    await p.waitForTimeout(600); await p.screenshot({ path: C.OUT + `deflect-${n}-results.png` });
    const res = await p.evaluate(() => [document.getElementById('resTitle').textContent, document.getElementById('resStars').getAttribute('aria-label'), document.getElementById('resAcc').textContent, JSON.parse(localStorage.getItem('jv-progress')).stars]);
    await p.click('#intoBtn'); await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 30000 });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; }); await p.waitForTimeout(2500); await p.screenshot({ path: C.OUT + `deflect-${n}-after.png` });
    const after = await p.evaluate(() => [reachedIndex(), MAP.at, document.getElementById('stopTitle').textContent, document.getElementById('mapStars').textContent]);
    console.log(n, 'stop', JSON.stringify(stop), 'first 12 s', JSON.stringify(mid), 'results', JSON.stringify(res), 'after', JSON.stringify(after), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
