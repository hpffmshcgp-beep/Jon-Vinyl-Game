// Rhythm-true chase: what you see matches what you pressed. On every hit, Jon is high over it (jump) or low under it
// (slide) the moment it reaches him, early, on the beat or late; on every miss he runs into it right then.
// Phones: swipe up jumps, swipe down slides, timed from the finger landing.  Usage: node chase-feel.test.js [desk|phone]
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); await C.skipLessons(p); if (n === 'phone') await p.addInitScript(() => { window.__swipeAt = 10.6; }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const check = (cond, msg) => { if (!cond) throw new Error(n + ': ' + msg); };
    await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#startBtn');
    await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 }); await p.evaluate(() => startSong());
    await p.waitForFunction(() => mode === 'play' && songTime() > (window.__swipeAt || 9), null, { timeout: 30000 });
    if (n === 'phone') {   // swipes: up jumps, down slides; the move starts from when the finger landed
      const swipe = (dy) => p.evaluate(dy => { const c = document.getElementById('stage'), x = innerWidth*0.5, y = innerHeight*0.5, o = { pointerId: 9, pointerType: 'touch', bubbles: true, isPrimary: true };
        c.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x, clientY: y })); const t0 = songTime();
        c.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x, clientY: y + dy })); c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x, clientY: y + dy }));
        return { t0, jump: S.jump && +(S.jump.p - t0).toFixed(3), slide: S.slide && +(S.slide.p - t0).toFixed(3) }; }, dy);
      const up = await swipe(-60); check(up.jump !== null && Math.abs(up.jump) < 0.02, 'swipe up jumps ' + JSON.stringify(up));
      await p.waitForTimeout(500);
      const down = await swipe(60); check(down.slide !== null && Math.abs(down.slide) < 0.02 && !down.jump, 'swipe down slides ' + JSON.stringify(down));
      console.log(n, 'swipes ok', JSON.stringify([up, down]));
    }
    // the bot: presses each note on the beat, a bit early or a bit late, and skips every 7th; checks at the moment of contact
    await p.evaluate(() => {
      window.__log = []; let i = 0;
      const plan = S.notes.map((x, k) => x.lane === 2 ? 0 : k % 7 === 6 ? null : [0, -0.08, 0.08, 0, 0.05][k % 5]);
      setInterval(() => { const t = songTime();
        S.notes.forEach((x, k) => { const d = plan[k]; if (d === null || x.judged || x.pressedByBot) return; if (t >= x.t + d - 0.002) { x.pressedByBot = true; press(x.lane === 2 ? 0 : x.lane, performance.now()); } });
        S.notes.forEach(x => { if (x.lane === 2 || x.seen) return; const c = x.t + OB.lead; if (t >= c && t < c + 0.04) { x.seen = true;
          window.__log.push({ lane: x.lane, hit: !!x.hit, k: x.k || '', up: +jumpH(t).toFixed(2), low: +slideAmt(t).toFixed(2), crash: t >= S.stumbleAt && t - S.stumbleAt < 0.1 }); } });
      }, 2);
    });
    const at = async (s, name) => { await p.waitForFunction(s => songTime() > s, s, { timeout: 60000, polling: 20 }); if (name) await p.screenshot({ path: C.OUT + `feel-${n}-${name}.png` }); };
    await at(13.3, 'verse'); await at(22.0); 
    const first = await p.evaluate(() => S.notes.find(x => x.lane === 1 && x.t > songTime() + 0.6));
    await at(first.t + 0.22 + 0.01, 'slide-under');
    const jn = await p.evaluate(() => S.notes.find(x => x.lane === 0 && x.t > songTime() + 0.6 && !x.k)); await at(jn.t + 0.22 + 0.01, 'jump-over');
    await at(34);
    const log = await p.evaluate(() => window.__log);
    const hits = log.filter(x => x.hit), miss = log.filter(x => !x.hit);
    const badHit = hits.filter(x => x.lane === 0 ? x.up < 0.6 : x.low < 0.6), badMiss = miss.filter(x => !x.crash);
    console.log(n, `${log.length} obstacles reached Jon: ${hits.length} hits (${badHit.length} not clear), ${miss.length} misses (${badMiss.length} without a crash)`, errs);
    check(log.length > 15 && !badHit.length && !badMiss.length, 'moves match the judgement ' + JSON.stringify({ badHit: badHit.slice(0, 4), badMiss: badMiss.slice(0, 4) }));
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
