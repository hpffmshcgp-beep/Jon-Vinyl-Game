// The whole prologue, played through: the opening on the deck, the chase, the bow, the gift, and into the record.
// Usage: node prologue.test.js [desk|phone]   (USE_FILE=1 to run the single-file build)
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const devs = process.argv[2] === 'phone' ? [['phone', C.PHONE]] : process.argv[2] === 'desk' ? [['desk', C.DESK]] : [['desk', C.DESK], ['phone', C.PHONE]];
  for (const [n, o] of devs) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); await C.skipLessons(p); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto(process.env.USE_FILE ? C.FILE_URL : C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.evaluate(() => setDiff('easy'));
    const shot = async (name, ms = 0) => { if (ms) await p.waitForTimeout(ms); await p.screenshot({ path: C.OUT + `pro-${n}-${name}.png` }); };
    const hold = async on => { if (n === 'desk') { on ? await p.keyboard.down('ArrowRight') : await p.keyboard.up('ArrowRight'); }
      else await p.evaluate(on => cv.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: innerWidth*0.8, clientY: innerHeight/2, bubbles: true })), on); };
    const tap = async () => { if (n === 'desk') await p.keyboard.press('Space'); else { await hold(true); await hold(false); } };
    const tapWhile = async (ph, max, each) => { for (let i = 0; i < max && await p.evaluate(ph => S.sc && S.sc.ph === ph, ph); i++) { await tap(); await p.waitForTimeout(260); if (each) await each(i); } };

    const act = async () => { if (n === 'desk') await p.keyboard.press('KeyE'); else await p.click('#actBtn'); };
    const holdUntil = async (fn, ms = 15000) => { await hold(true); await p.waitForFunction(fn, null, { timeout: ms, polling: 50 }); await hold(false); };
    // 1. the cabin: walk to the door first (not without her), then to her, talk, then out the door
    await p.click('#startBtn'); await p.waitForFunction(() => mode === 'intro' && S.sc.kind === 'cabin', null, { timeout: 20000 });
    await shot('01-cabin', 800);
    // on a phone you tap the things themselves: Jon walks over and talks or looks
    const tapObj = async id => { const [x, y] = await p.evaluate(id => { const L = layout(), f = { her: S.sc.herX ?? ROOM.her, tt: ROOM.tt, door: ROOM.door, port2: ROOM.port2 }[id];
      const y = id === 'port2' ? L.top + (L.groundY - L.top)*0.36 : L.groundY - L.jh*(id === 'tt' ? 0.3 : 0.6); return [W*f, y]; }, id); await p.touchscreen.tap(x, y); };
    const waitDlg = () => p.waitForFunction(() => !!S.sc.dlg, null, { timeout: 15000 });
    const closeDlg = async () => { for (let i = 0; i < 30 && await p.evaluate(() => !!S.sc.dlg); i++) { await tap(); await p.waitForTimeout(240); } };
    if (n === 'desk') {
      await holdUntil(() => S.sc.spot && S.sc.spot.id === 'tt'); await shot('02-turntable'); await act(); await shot('03-look', 900); await tapWhile('free', 0); await tap(); await p.waitForTimeout(300);
      await holdUntil(() => S.sc.spot && S.sc.spot.id === 'her'); await shot('04-near-her'); await act();
    } else {
      await tapObj('tt'); await shot('02-walk-to-turntable', 300); await waitDlg(); await shot('03-look', 900); await closeDlg();
      await tapObj('door'); await waitDlg(); await shot('03b-not-without-her', 900); await closeDlg();
      await tapObj('port2'); await waitDlg(); await closeDlg();
      await tapObj('her'); await waitDlg(); await shot('04-near-her');
    }
    await shot('05-talk', 1300);
    await (async () => { for (let i = 0; i < 30 && await p.evaluate(() => !!S.sc.dlg); i++) { await tap(); await p.waitForTimeout(240); if (i === 8) await shot('06-just-us'); } })();
    await shot('07-after-talk', 500);
    if (n === 'desk') { await holdUntil(() => S.sc.spot && S.sc.spot.id === 'door'); await shot('08-door'); await act(); }
    else { await tapObj('door'); await shot('08-door', 600); }
    await shot('09-door-open', 1200); await p.waitForFunction(() => S.sc.kind === 'deck', null, { timeout: 10000 });
    // 2. the deck: a cutscene, then the how-to pop-up
    await shot('10-deck', 3200); await shot('11-sky', 2400); await shot('12-stranger', 4300); await shot('13-taken', 2600);
    await p.waitForFunction(() => !document.getElementById('howPop').hidden, null, { timeout: 15000 }); await shot('14-howto', 600);
    await p.click('#goBtn'); await p.waitForFunction(() => mode === 'play', null, { timeout: 10000 });
    await shot('15-titles', 2500);
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
    await p.waitForFunction(() => S.sc.ph === 'pull', null, { timeout: 8000 });
    await shot('17a-pull-rises', 900); await shot('17b-pull-hands', 900); await shot('17c-pull-slip', 1100); await shot('17d-pull-lifted', 900); await shot('17e-enjoy', 500); await shot('17f-fall', 1700); await shot('17g-fall2', 1000);
    await p.waitForFunction(() => S.sc.ph === 'rating', null, { timeout: 10000 }); await shot('18-reviews', 1600); await tap();
    // 4. straight into the record, no score card
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    const r = await p.evaluate(() => [document.getElementById('results').hidden && document.getElementById('skipBtn') === null, JSON.parse(localStorage.getItem('jv-progress')).prologue, document.getElementById('stopTitle').textContent, S.counts.perfect + S.counts.great + S.counts.ok]);
    console.log(n, 'results card hidden, prologue saved, first stop, notes hit:', JSON.stringify(r), errs);
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
