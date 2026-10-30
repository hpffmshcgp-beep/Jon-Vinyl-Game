const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', { viewport: {width:390,height:780}, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]] : process.argv[2] === 'desk' ? [['desk', { viewport: {width:1280,height:800} }]] :
    [['desk', { viewport: {width:1280,height:800} }], ['phone', { viewport: {width:390,height:780}, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(process.env.USE_FILE ? C.FILE_URL : C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#dEasy'); await p.waitForTimeout(300);
    await p.screenshot({ path: C.OUT + `sc-${n}-how.png` });
    await p.click('#startBtn'); await p.waitForFunction(() => mode === 'play', null, { timeout: 20000 });
    await p.evaluate(() => { S.startAt -= (OPEN.start + 1.2 - songTime()); }); await p.waitForTimeout(700);
    await p.screenshot({ path: C.OUT + `sc-${n}-split.png` });
    const shot = async (name, ms = 0) => { if (ms) await p.waitForTimeout(ms); await p.screenshot({ path: C.OUT + `sc-${n}-${name}.png` }); };
    // win: mark everything hit, jump near the end
    await p.evaluate(() => { S.notes.forEach(x => { if (x.t < LAST_NOTE - 1) { x.judged = true; x.hit = true; S.wsum += 1; } }); S.nextIdx = 0; S.startAt -= (LAST_NOTE - 1 - songTime());
      setInterval(() => { const t = songTime(); for (const x of S.notes) if (!x.judged && Math.abs(x.t - t) < 0.012) press(x.lane === 2 ? 0 : x.lane, performance.now()); }, 2); });
    await p.waitForFunction(() => S.sc && S.sc.ph === 'walk', null, { timeout: 15000 });
    await shot('walk', 400);
    const hold = async (on) => { if (n === 'desk') { on ? await p.keyboard.down('ArrowRight') : await p.keyboard.up('ArrowRight'); }
      else await p.evaluate(on => cv.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: innerWidth*0.8, clientY: innerHeight/2, bubbles: true })), on); };
    const tap = async () => { if (n === 'desk') await p.keyboard.press('Space'); else { await hold(true); await hold(false); } };
    await hold(true); await p.waitForTimeout(500); await shot('walking'); await p.waitForFunction(() => S.sc.ph === 'talk', null, { timeout: 8000 }); await hold(false);
    await shot('talk1', 1200);
    for (let i = 0; i < 8 && await p.evaluate(() => S.sc.ph === 'talk'); i++) { await tap(); await p.waitForTimeout(250); if (i === 2) await shot('talk2'); }
    await p.waitForFunction(() => S.sc.ph === 'end', null, { timeout: 8000 }); await shot('end', 1300);
    for (let i = 0; i < 6 && await p.evaluate(() => S.sc.ph === 'end'); i++) { await tap(); await p.waitForTimeout(250); }
    // the stranger walks in and hands over the album
    await shot('stranger', 900); await p.waitForFunction(() => S.sc.ph === 'gift', null, { timeout: 10000 });
    await shot('gift1', 1000);
    for (let i = 0; i < 16 && await p.evaluate(() => S.sc.ph === 'gift'); i++) { await tap(); await p.waitForTimeout(260); if (i === 6) await shot('gift-offer'); if (i === 9) await shot('gift-got', 300); }
    await shot('album', 900);
    await hold(true); await p.waitForTimeout(700); await shot('album-sliding'); await p.waitForFunction(() => S.sc.ph !== 'album', null, { timeout: 8000 }); await hold(false);
    await shot('spinup', 1200);
    await p.waitForFunction(() => S.sc.ph === 'pull', null, { timeout: 8000 });
    await shot('pull1', 700); await shot('pull2', 900); await shot('pull3', 700); await shot('pull4', 900);
    await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 10000 });
    const r = await p.evaluate(() => [document.getElementById('resTitle').textContent, document.getElementById('resEyebrow').textContent, !document.getElementById('intoBtn').hidden]);
    await shot('results');
    // into the record
    await p.click('#intoBtn'); await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 30000 });
    await shot('map-fall', 500); await shot('map-land', 2600);
    const m = await p.evaluate(() => [reachedIndex(), document.getElementById('stopTitle').textContent, document.getElementById('stopPlay').textContent, JSON.parse(localStorage.getItem('jv-progress')).prologue]);
    console.log(n, JSON.stringify(r), JSON.stringify(m), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
