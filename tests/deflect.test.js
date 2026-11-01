// Deflect: open the record, play track 3 with a bot aiming the shield, check hits, results, stars and the map after.
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
    if (n === 'phone') {   // phones face forward: tap the strip of lane 1, then slide the same finger over to lane 6's strip
      const r = await p.evaluate(async () => { const G = levelGeo(), xs = i => G.x0 + (i + 0.5)/FRONT.n*(G.x1 - G.x0), ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 3, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
        const lane = () => Math.round((LV.aim + Math.PI/2)/FRONT.sp + (FRONT.n - 1)/2), wait = () => new Promise(r => setTimeout(r, 80));
        ev('pointerdown', xs(1), H*0.85); await wait(); const a1 = lane();
        for (let k = 1; k <= 8; k++) { ev('pointermove', xs(1) + (xs(6) - xs(1))*k/8, H*0.85 - k*4); await new Promise(r => setTimeout(r, 16)); }
        await wait(); const a2 = lane(); ev('pointerup', xs(6), H*0.8); return [G.front, a1, a2, LV.notes.every(x => x.lane >= 0 && x.lane < FRONT.n && (x.kind ? x.lane < FRONT.n/2 : x.lane >= FRONT.n/2))]; });
      await p.screenshot({ path: C.OUT + `deflect-${n}-tap.png` });
      console.log(n, 'front', r[0], 'tap lane 1 ->', r[1], 'slide to lane 6 ->', r[2], 'lead left / rhythm right:', r[3]);
      if (!r[0] || r[1] !== 1 || r[2] !== 6 || !r[3]) throw new Error('front controls ' + JSON.stringify(r));
    }
    // the bot: point the shield at the next note just before it lands
    if (n === 'phone')   // on the phone the bot taps like a thumb would: in the strip of the note's path, a little off-centre, low on the screen
      await p.evaluate(() => setInterval(() => { if (!LV || !LV.running) return; const t = levelTime(), G = levelGeo(); const nx = LV.notes.find(x => !x.judged && x.t - t < 0.12);
        if (nx && nx !== window.__last) { window.__last = nx; const x = G.x0 + (nx.lane + 0.5 + (Math.random() - 0.5)*0.6)/FRONT.n*(G.x1 - G.x0), y = H*(0.7 + Math.random()*0.25);
          cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); } }, 4));
    else
    await p.evaluate(() => setInterval(() => { if (!LV || !LV.running) return; const t = levelTime(); const nx = LV.notes.find(x => !x.judged && x.t - t < 0.12); if (nx) { AIM.mouse = true; AIM.target = nx.ang; } }, 4));
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
