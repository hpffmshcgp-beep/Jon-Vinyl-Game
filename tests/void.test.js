// Void (track 4, surf): open the record at Void, ride with a bot (hold to climb, let go to carve, ride off the lip, backflip),
// take screenshots from sunset to moonrise, then check the results and the map.
// Usage: node void.test.js [desk|phone]   DIFF=expertplus to pick a level
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.addInitScript(d => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: { 3: 1 }, best: {} })); localStorage.setItem('sc-diff', d); }, process.env.DIFF || 'hard');
    await p.goto(process.env.USE_FILE ? C.FILE_URL : C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#recordBtn');
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; }); await p.waitForTimeout(1500);
    const stop = await p.evaluate(() => [MAP.at, document.getElementById('stopTitle').textContent, document.getElementById('stopPlay').disabled]);
    await p.screenshot({ path: C.OUT + `void-${n}-map.png` });
    await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level' && LV && LV.mode === 'surf', null, { timeout: 30000 });
    await p.waitForTimeout(2500); await p.screenshot({ path: C.OUT + `void-${n}-title.png` });
    // the bot: steer toward the next gem when it's time to move (all the way off the lip for a launch gem); backflip
    // on every other jump, and once on purpose under-rotate to check the wipeout
    await p.evaluate(wipeAt => {
      const reach = (0.88 - SURF.low)/LV.rise; window.__flipT = 0; window.__bad = false; window.__lands = [];
      const land0 = surfLand; window.surfLand = t => { window.__lands.push([+wrapA(LV.ang - SURF.land).toFixed(2), +LV.air.rot.toFixed(1)]); return land0(t); };
      setInterval(() => { if (!LV || !LV.running) return; const t = levelTime();
        if (LV.air) { const tau = t - LV.air.t0, flip = LV.flown % 2 === 0, bad = !window.__bad && wipeAt && LV.air.t0 > wipeAt;
          if ((flip || bad) && tau > 0.25 && !LV.airIds.size && !window.__flipT && window.__did !== LV.air.t0) { surfDown({ pointerId: 88 }); window.__flipT = t; window.__did = LV.air.t0; if (bad) window.__bad = true; }
          if (window.__flipT && t - window.__flipT > (window.__bad && !window.__badDone ? 0.32 : 0.7)) { surfUp({ pointerId: 88 }); window.__flipT = 0; if (window.__bad) window.__badDone = true; }
          LV.hold.delete('bot'); return; }
        window.__flipT = 0;
        const nx = LV.gems.find(x => !x.judged && !(x.air && x.kind !== 3)); let hold = LV.hold.has('bot');
        if (nx) { const goal = nx.kind === 3 ? 1.3 : nx.h, need = Math.abs(Math.min(goal, 1) - LV.h)/reach + 0.06;
          if (nx.t - t <= need + 0.05) { if (goal > LV.h + 0.03) hold = true; else if (goal < LV.h - 0.03) hold = false; else hold = LV.vel < 0 ? true : LV.vel > 0 ? false : hold; }
          else if (LV.h > 0.8) hold = false; }
        hold ? LV.hold.add('bot') : LV.hold.delete('bot');
      }, 4);
    }, n === 'phone' ? 134 : 0);
    const at = async (s, name) => { await p.waitForFunction(s => levelTime() > s, s, { timeout: 200000, polling: 50 }); await p.screenshot({ path: C.OUT + `void-${n}-${name}.png` }); };
    await at(17.5, '1-sunset'); await at(30.4, '2-air');
    const mid = await p.evaluate(() => ({ ...LV.counts, judged: LV.notes.filter(x => x.judged).length }));
    await p.evaluate(() => { LV.startAt -= (78 - levelTime()); }); await at(80.0, '3-dusk'); await at(81.6, '3b-air');
    console.log(n, 'lands so far', await p.evaluate(() => [LV.lives, LV.flips, LV.flown, window.__lands.map(x => x.join(':')).join(' ')]));
    await p.evaluate(() => { LV.startAt -= (106 - levelTime()); }); await p.waitForFunction(() => LV.flown && LV.air, null, { timeout: 20000, polling: 20 });
    await p.waitForFunction(() => LV.air && levelTime() - LV.air.t0 > 0.6, null, { timeout: 20000, polling: 20 }); await p.screenshot({ path: C.OUT + `void-${n}-3c-flip.png` });
    await p.evaluate(() => { LV.startAt -= (126 - levelTime()); }); await at(128, '4-night'); await at(133.6, '4b-air');
    if (n === 'phone') { await p.waitForFunction(() => LV.wipe || !LV.running, null, { timeout: 30000, polling: 20 }); console.log('after 134', await p.evaluate(() => [levelTime(), LV.lives, LV.flown, window.__lands.map(x => x.join(':')).join(' '), LV.airs.map(a => a[0]).filter(a => a > 125).join(',')])); await p.waitForTimeout(250); await p.screenshot({ path: C.OUT + `void-${n}-5-wipeout.png` }); }
    const air = await p.evaluate(() => ({ flown: LV.flown, flips: LV.flips, lives: LV.lives, lands: window.__lands.map(x => x.join(':')).join(' ') }));
    await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 60000 });
    await p.waitForTimeout(1200); await p.screenshot({ path: C.OUT + `void-${n}-results.png` });
    const res = await p.evaluate(() => [document.getElementById('resTitle').textContent, document.getElementById('resStars').getAttribute('aria-label'), document.getElementById('resBilling').textContent, JSON.parse(localStorage.getItem('jv-progress')).stars]);
    const tail = await p.evaluate(() => { const g = LV.gems.filter(x => x.t > 126 && x.judged && !x.air), a = LV.gems.filter(x => x.t > 126 && x.judged && x.air); return [g.filter(x => x.hit).length + '/' + g.length + ' ground', a.filter(x => x.hit).length + '/' + a.length + ' air']; });
    if (n === 'desk') {   // three wipeouts end the run: no stars, try again
      await p.click('#againBtn'); await p.waitForFunction(() => mode === 'level' && LV && LV.running && levelTime() > 1, null, { timeout: 30000 });
      await p.evaluate(() => { LV.startAt -= (40 - levelTime()); }); await p.waitForTimeout(300);
      await p.evaluate(() => { surfWipe(levelTime()); LV.down = -9; LV.wipe = null; surfWipe(levelTime()); LV.down = -9; LV.wipe = null; surfWipe(levelTime()); });
      await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 20000 }); await p.waitForTimeout(1200);
      await p.screenshot({ path: C.OUT + `void-${n}-wiped.png` });
      console.log(n, 'wiped', JSON.stringify(await p.evaluate(() => [document.getElementById('resEyebrow').textContent, document.getElementById('resLine').textContent, document.getElementById('againBtn').textContent, JSON.parse(localStorage.getItem('jv-progress')).stars])));
    }
    console.log(n, 'stop', JSON.stringify(stop), 'first 30 s', JSON.stringify(mid), 'air', JSON.stringify(air), 'last stretch', JSON.stringify(tail), 'results', JSON.stringify(res), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
