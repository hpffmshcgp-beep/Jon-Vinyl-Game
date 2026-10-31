// Learning by doing: no how-to pop-up; the first jump and the first slide (ever) stop the song with Jon at the
// obstacle and wait for the right side. The wrong side just points you over. Then the chase plays on: obstacles,
// passengers cheering, Jon's own lines.  Usage: node lesson.test.js [desk|phone]
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const check = (cond, msg) => { if (!cond) throw new Error(n + ': ' + msg); };
    await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#startBtn');
    await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 });
    check(await p.evaluate(() => !document.getElementById('howPop')), 'the how-to pop-up is gone');
    await p.evaluate(() => startSong());   // test shortcut past the cabin and deck (the deck now runs straight into it)
    const vp = p.viewportSize();
    const tap = async side => n === 'phone' ? p.touchscreen.tap(side ? vp.width*0.8 : vp.width*0.2, vp.height*0.5) : p.keyboard.press(side ? 'KeyJ' : 'KeyF');
    for (const lane of [0, 1]) {
      const first = await p.evaluate(l => S.notes.find(x => x.lane === l).t, lane);
      await p.evaluate(f => { S.startAt -= (f - 1.2 - songTime()); }, first);
      await p.waitForFunction(l => S.lesson && S.lesson.lane === l, lane, { timeout: 20000, polling: 20 });
      await p.waitForTimeout(400);
      const t0 = await p.evaluate(() => songTime()); await p.waitForTimeout(500); const t1 = await p.evaluate(() => songTime());
      check(Math.abs(t1 - t0) < 0.005 && Math.abs(t0 - first) < 0.09, `song holds still at the obstacle (${t0.toFixed(3)} → ${t1.toFixed(3)}, note ${first})`);
      await p.screenshot({ path: C.OUT + `lesson-${n}-${lane ? 'slide' : 'jump'}.png` });
      await tap(1 - lane); await p.waitForTimeout(250);
      check(await p.evaluate(() => !!S.lesson && nowS() - S.lesson.wrong < 1), 'the wrong side keeps waiting and points you over');
      await p.screenshot({ path: C.OUT + `lesson-${n}-${lane ? 'slide' : 'jump'}-wrong.png` });
      await tap(lane); await p.waitForTimeout(350);
      const r = await p.evaluate(l => ({ lesson: S.lesson, hit: S.notes.find(x => x.lane === l).k ?? (S.notes.find(x => x.lane === l).hit ? 'hit' : 'no'), saved: JSON.parse(localStorage.getItem('sc-lessons'))[l], t: songTime() }), lane);
      check(!r.lesson && r.saved && r.t > first, 'the right side clears it and the song goes on ' + JSON.stringify(r));
      await p.waitForTimeout(150); await p.screenshot({ path: C.OUT + `lesson-${n}-${lane ? 'slide' : 'jump'}-go.png` });
    }
    // the chase plays on: a bot hits everything; screenshots of passengers cheering and Jon's lines
    await p.evaluate(() => { setInterval(() => { const t = songTime(); for (const x of S.notes) if (!x.judged && Math.abs(x.t - t) < 0.012) press(x.lane === 2 ? 0 : x.lane, performance.now()); }, 2); });
    const at = async (s, name) => { await p.evaluate(s => { if (songTime() < s - 4) S.startAt -= (s - 2 - songTime()); }, s); await p.waitForFunction(s => songTime() > s, s, { timeout: 30000, polling: 20 }); await p.screenshot({ path: C.OUT + `chase-${n}-${name}.png` }); };
    await at(24.0, 'cheer'); await at(42.2, 'jon-line'); await at(46.4, 'bellhop'); await at(58.7, 'chorus');
    // a slide mid-move, and a jump mid-air, for the record
    const nx = await p.evaluate(() => S.notes.find(x => x.lane === 1 && x.t > songTime() + 1).t); await p.waitForFunction(t => songTime() > t + 0.1, nx, { timeout: 20000, polling: 10 }); await p.screenshot({ path: C.OUT + `chase-${n}-slide.png` });
    const jx = await p.evaluate(() => S.notes.find(x => x.lane === 0 && x.t > songTime() + 1).t); await p.waitForFunction(t => songTime() > t + 0.15, jx, { timeout: 20000, polling: 10 }); await p.screenshot({ path: C.OUT + `chase-${n}-jump.png` });
    const c = await p.evaluate(() => S.counts);
    console.log(n, 'ok', JSON.stringify(c), errs); await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
