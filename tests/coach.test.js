// The results card coaches: one thing that went well, one thing to try, and a level nudge (up after ≥95 %, down under
// 55 %). Plays a few seconds of Deflect and Void, then fakes how the run went and checks what the card says.
// Usage: node coach.test.js
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [n, o] of [['desk', C.DESK], ['phone', C.PHONE]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const check = (cond, msg) => { if (!cond) throw new Error(n + ': ' + msg); };
    await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: { 3: 1 }, best: {}, xplus: {} })); localStorage.setItem('sc-diff', 'normal'); });
    await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.waitForFunction(() => mode === 'title', null, { timeout: 30000 });
    const play = async i => { await p.evaluate(() => goTitle()); await p.click('#recordBtn'); await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
      await p.evaluate(i => { MAP.first = false; MAP.fall = 0; MAP.at = i; showStop(i); }, i); await p.waitForTimeout(500);
      await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level' && LV && LV.running, null, { timeout: 30000 }); };
    const card = () => p.evaluate(() => ({ tips: [...document.querySelectorAll('#resTips p')].map(x => x.className + ': ' + x.textContent), btn: document.getElementById('tryBtn').hidden ? '' : document.getElementById('tryBtn').textContent }));
    // the Outro opens once every song is beaten (1 star each); three stars on all of them is the full ending, on top
    const gate = await p.evaluate(() => { const keep = PROG.stars, out = [];
      PROG.stars = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }; out.push(ALBUM.tracks[reachedIndex()].outro || false);
      PROG.stars[7] = 1; out.push(ALBUM.tracks[reachedIndex()].outro || false, allThreeStars());
      [1, 2, 3, 4, 5, 6, 7].forEach(k => PROG.stars[k] = 3); out.push(allThreeStars()); PROG.stars = keep; return out; });
    check(JSON.stringify(gate) === '[false,true,false,true]', 'outro gate ' + JSON.stringify(gate));
    // Deflect: a strong run where what got through came from the left, and no heartbreak was missed
    await play(2);
    await p.evaluate(() => { LV.notes.forEach((x, i) => { x.judged = true; const m = x.dir === 6 && !x.kind && i % 2 === 0; x.hit = !m; x.k = m ? 'miss' : 'perfect'; x.late = 0; x.off = 0.3; });
      LV.counts = { perfect: LV.notes.filter(x => x.hit).length, good: 0, miss: LV.notes.filter(x => !x.hit).length }; levelEnd(); });
    let c = await card(); await p.waitForTimeout(900); await p.screenshot({ path: C.OUT + `coach-${n}-deflect.png` });
    console.log(n, 'deflect', JSON.stringify(c));
    check(c.tips.some(t => /from the left/.test(t)), 'deflect direction tip');
    // ≥95 %: the card offers the next level up, and it plays straight away on it
    await p.evaluate(() => { LV.notes.forEach(x => { x.judged = x.hit = true; x.k = 'perfect'; }); LV.counts = { perfect: LV.notes.length, good: 0, miss: 0 }; LV.ended = false; levelEnd(); });
    c = await card(); console.log(n, 'deflect perfect', JSON.stringify(c)); check(c.btn === 'Ready for Hard?', 'nudge up');
    await p.click('#tryBtn'); await p.waitForFunction(() => mode === 'level' && LV && LV.running, null, { timeout: 30000 });
    check(await p.evaluate(() => DIFF === 'hard' && localStorage.getItem('sc-diff') === 'hard'), 'nudge sets Hard');
    // Void: riding high, a hard run (under 55 %): a 'ride lower' tip and an offer to step down
    await p.evaluate(() => { LV.ended = true; LV.running = false; stopSources(); });
    await play(3); await p.waitForFunction(() => LV.mode === 'surf');
    await p.evaluate(() => { LV.gems.forEach((x, i) => { x.judged = true; const ok = i % 3 === 0; x.hit = ok; x.k = ok ? 'good' : 'miss'; x.err = x.air ? 0 : 0.18; });
      LV.counts = { perfect: 0, good: LV.gems.filter(x => x.hit).length, miss: LV.gems.filter(x => !x.hit).length }; levelEnd(); });
    c = await card(); await p.waitForTimeout(900); await p.screenshot({ path: C.OUT + `coach-${n}-void.png` });
    console.log(n, 'void', JSON.stringify(c));
    check(c.tips.some(t => /take-offs|ride a little high/.test(t)) && c.btn === 'Try Normal?', 'void tip and step down');
    // the way home: Void just beaten pops in on the results, then the record shows 2 of 7
    const way = await p.evaluate(() => [document.querySelector('#resWay span').textContent, document.querySelectorAll('#resWay .seg.on').length, document.querySelectorAll('#resWay .seg.new').length]);
    console.log(n, 'way home', JSON.stringify(way));
    check(way[0] === 'Void beaten · 5 more to get home' && way[1] === 2 && way[2] === 1, 'way home on results');
    await p.click('#intoBtn'); await p.waitForFunction(() => mode === 'map' && !document.getElementById('mapUI').hidden, null, { timeout: 30000 }); await p.waitForTimeout(1500);
    const mw = await p.evaluate(() => document.querySelector('#mapWay span').textContent); check(mw === 'The way home · 2 of 7 songs', 'map way home ' + mw);
    await p.screenshot({ path: C.OUT + `coach-${n}-map.png` });
    console.log(n, 'ok', errs); await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
