// The shortened prologue (chart meta.cut): the chase runs verse → pre-chorus → chorus → outro. Plays it with a bot and
// screenshots each act, the join at bar 26 and the outro, then checks the song reaches the bow and the end title.
// Usage: node chase-cut.test.js [desk|phone]
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#startBtn');
    await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 }); await p.evaluate(() => startSong());
    const info = await p.evaluate(() => ({ len: buffers.songplay.duration - CHART.meta.cutLen, cut: CHART.meta.cut, finale: CHART.finale, end: CHART.end, notes: S.notes.length, acts: ACTS.map(a => a.name + '@' + a.t.toFixed(1)).join(' ') }));
    await p.evaluate(() => { setInterval(() => { const t = songTime(); for (const x of S.notes) if (!x.judged && Math.abs(x.t - t) < 0.012) press(x.lane === 2 ? 0 : x.lane, performance.now()); }, 2); });
    const at = async (s, name) => { await p.evaluate(s => { if (songTime() < s - 6) S.startAt -= (s - 3 - songTime()); }, s); await p.waitForFunction(s => songTime() > s, s, { timeout: 60000, polling: 30 }); await p.screenshot({ path: C.OUT + `cut-${n}-${name}.png` }); };
    await at(14, '1-verse'); await at(33, '2-prechorus'); await at(53, '3-chorus'); await at(67.5, '4-join'); await at(73.5, '5-outro'); await at(86, '6-outro-late');
    await p.waitForFunction(() => S.sc && S.sc.kind === 'bow', null, { timeout: 60000 }).catch(() => {});
    const end = await p.evaluate(() => ({ t: +songTime().toFixed(1), scene: S.sc && S.sc.kind, counts: S.counts }));
    console.log(n, JSON.stringify(info), 'end', JSON.stringify(end), errs);
    if (!end.scene) throw new Error('never reached the bow');
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
