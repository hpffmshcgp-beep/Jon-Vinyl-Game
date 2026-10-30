// The whole prologue, played through: the opening on the deck, the chase, the bow, the gift, and into the record.
// Usage: node prologue.test.js [desk|phone]   (USE_FILE=1 to run the single-file build)
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto(process.env.USE_FILE ? C.FILE_URL : C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#dEasy');
    const shot = async (name, ms = 0) => { if (ms) await p.waitForTimeout(ms); await p.screenshot({ path: C.OUT + `pro-${n}-${name}.png` }); };
    const hold = async on => { if (n === 'desk') { on ? await p.keyboard.down('ArrowRight') : await p.keyboard.up('ArrowRight'); }
      else await p.evaluate(on => cv.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: innerWidth*0.8, clientY: innerHeight/2, bubbles: true })), on); };
    const tap = async () => { if (n === 'desk') await p.keyboard.press('Space'); else { await hold(true); await hold(false); } };
    const tapWhile = async (ph, max, each) => { for (let i = 0; i < max && await p.evaluate(ph => S.sc && S.sc.ph === ph, ph); i++) { await tap(); await p.waitForTimeout(260); if (each) await each(i); } };

    // 1. the opening
    await p.click('#startBtn'); await p.waitForFunction(() => mode === 'intro', null, { timeout: 20000 });
    await shot('1-start', 600);
    await hold(true); await p.waitForTimeout(500); await shot('2-walking'); await p.waitForFunction(() => S.sc.ph === 'italk', null, { timeout: 10000 }); await hold(false);
    await shot('3-talk', 1200);
    await tapWhile('italk', 30, async i => { if (i === 9) await shot('4-plans'); });
    await shot('5-plan-heart', 400);
    await p.waitForFunction(() => S.sc && S.sc.ph === 'iwords', null, { timeout: 10000 }); await shot('6-stranger', 900);
    await tapWhile('iwords', 6);
    await shot('7-taken', 1300);
    await p.waitForFunction(() => mode === 'play', null, { timeout: 10000 });
    await shot('8-titles', 2500);
    // 2. the chase: a glimpse of them, then jump to the end of the song (points don't matter: hit nothing)
    await p.evaluate(() => { S.startAt -= (GLIMPSE[0] + 2.2 - songTime()); }); await shot('9-glimpse', 300);
    await p.evaluate(() => { S.startAt -= (LAST_NOTE - 1 - songTime()); });
    await shot('10-bow-held', 2600);
    // 3. the bow
    await p.waitForFunction(() => S.sc && S.sc.ph === 'walk', null, { timeout: 15000 });
    await hold(true); await p.waitForFunction(() => S.sc.ph !== 'walk', null, { timeout: 10000 }); await hold(false);
    await shot('11-free', 350); await p.waitForFunction(() => S.sc.ph === 'end', null, { timeout: 8000 }); await shot('12-reunion', 1200);
    await tapWhile('end', 12);
    await shot('13-strolls-over', 900); await p.waitForFunction(() => S.sc.ph === 'gift', null, { timeout: 12000 }); await shot('14-gift', 1200);
    await tapWhile('gift', 20, async i => { if (i === 7) await shot('15-offer'); });
    await shot('16-album', 900);
    await hold(true); await p.waitForFunction(() => S.sc.ph !== 'album', null, { timeout: 8000 }); await hold(false);
    await p.waitForFunction(() => S.sc.ph === 'pull', null, { timeout: 8000 }); await shot('17-pull', 1400);
    // 4. straight into the record, no score card
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    const r = await p.evaluate(() => [document.getElementById('results').hidden, JSON.parse(localStorage.getItem('jv-progress')).prologue, document.getElementById('stopTitle').textContent, S.counts.perfect + S.counts.great + S.counts.ok]);
    console.log(n, 'results card hidden, prologue saved, first stop, notes hit:', JSON.stringify(r), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
