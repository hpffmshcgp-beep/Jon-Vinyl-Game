// A phone held upright (390x844, iPhone-style notch and home bar): the game only plays sideways, so the whole page is
// drawn turned a quarter turn and you turn the phone. Checks the frame, that taps land on what they look like they hit
// (cabin, chase sides, Deflect's thumb strip, page buttons), and that turning the phone puts it back the normal way.
// Screenshots are saved turned back upright (as you'd see them with the phone sideways) as upright-*.png.
// Usage: node upright.test.js
const { chromium } = require('playwright');
const C = require('./config');
const OUT = C.OUT + 'upright-';
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await C.skipLessons(p);
  await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: {}, best: {} }));
    addEventListener('DOMContentLoaded', () => { const st = document.createElement('style');
      st.textContent = '#safeProbe{padding:59px 0 34px 0 !important}'; document.head.appendChild(st); dispatchEvent(new Event('resize')); }); });
  // a screenshot turned back so it reads the way the player sees it (phone sideways)
  const shot = async (name, wait = 500) => { await p.waitForTimeout(wait); await p.screenshot({ path: OUT + name + '.png' });
    require('child_process').spawnSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).rotate(90, expand=True).save(sys.argv[1])', OUT + name + '.png']); };
  // game point -> where it is on the upright phone's screen
  const scr = (x, y) => [390 - y, x];
  const tapG = (x, y) => p.touchscreen.tap(...scr(x, y));
  await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  await p.evaluate(() => dispatchEvent(new Event('resize')));
  const fr = await p.evaluate(() => ({ ROT, W, H, cw: cv.width/DPR, l: SAFE.l, r: SAFE.r, t: SAFE.t, short: document.documentElement.classList.contains('short') }));
  check(fr.ROT && fr.W === 844 && fr.H === 390 && fr.cw === 844, 'upright phone: game frame 844x390, turned ' + JSON.stringify(fr));
  check(fr.l === 59 && fr.r === 34 && fr.t === 0 && fr.short, 'notch and home bar land at the game\'s sides; short-screen layout on');
  await p.evaluate(() => goTitle()); await shot('0-title', 700);
  // page buttons work through the turn
  await p.click('#nextBtn'); await p.waitForTimeout(300);
  check(await p.evaluate(() => !document.getElementById('howPanel').hidden), 'tapping a page button (Continue) works');
  await shot('1-lobby');
  await p.click('#startBtn');
  await p.waitForFunction(() => S && S.sc && S.sc.kind === 'cabin' && S.sc.ph === 'free', null, { timeout: 20000 }); await shot('2-cabin', 1000);
  // tap the turntable where it's drawn: Jon should head for it
  const tt = await p.evaluate(() => { const L = layout(), [SW, ox] = cabStage(L); return [ox + SW*ROOM.tt, L.groundY - L.jh*0.3]; });
  await tapG(...tt); await p.waitForTimeout(200);
  check(await p.evaluate(() => S.sc.goto && S.sc.goto.id === 'tt'), 'tapping the turntable on screen sends Jon to it');
  await p.waitForFunction(() => !!S.sc.dlg, null, { timeout: 15000 }); await shot('3-look', 700);
  // the chase: the game's left half is a jump, right half a slide
  await p.evaluate(() => { S.sc.dlg = null; startSong(); }); await p.waitForFunction(() => mode === 'play', null, { timeout: 20000 });
  await p.evaluate(() => { S.startAt -= (40 - songTime()); });
  await p.waitForTimeout(800);
  const t0 = await p.evaluate(() => [...TAPFX]);
  await tapG(200, 250); await p.waitForTimeout(250); const t1 = await p.evaluate(() => [...TAPFX]);
  await tapG(650, 250); await p.waitForTimeout(250); const t2 = await p.evaluate(() => [...TAPFX]);
  check(t1[0] > t0[0] && t1[1] === t0[1], 'tap on the game\'s left = jump');
  check(t2[1] > t1[1] && t2[0] === t1[0], 'tap on the game\'s right = slide');
  // a swipe up in the game's frame (toward the phone's right edge) is a jump
  const [sx, sy] = scr(650, 300);
  await p.evaluate(([x, y]) => { const ev = (n, cx) => cv.dispatchEvent(new PointerEvent(n, { pointerId: 9, pointerType: 'touch', clientX: cx, clientY: y, bubbles: true, cancelable: true }));
    ev('pointerdown', x); ev('pointermove', x + 14); ev('pointermove', x + 28); ev('pointerup', x + 28); }, [sx, sy]);
  await p.waitForTimeout(250); const t3 = await p.evaluate(() => [...TAPFX]);
  check(t3[0] > t2[0] && t3[1] === t2[1], 'swipe up (in the game\'s frame) on the right half = jump ' + JSON.stringify([t2, t3]));
  await shot('4-chase', 300);
  // the record map and Deflect
  await p.evaluate(() => { stopSources(); S = null; goTitle(); }); await p.click('#recordBtn');
  await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 }); await p.evaluate(() => { MAP.first = false; MAP.fall = 0; });
  await shot('5-map', 2500);
  const mr = await p.evaluate(() => [MAP.R.domElement.width, MAP.R.domElement.height, MAP.cam.aspect.toFixed(2)]);
  check(mr[0] > mr[1], 'the map renders wide ' + JSON.stringify(mr));
  await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level' && LV, null, { timeout: 30000 });
  check(await p.evaluate(() => LV.front), 'Deflect plays facing forward');
  await p.waitForTimeout(800);
  await tapG(844*0.12, 200); await p.waitForTimeout(150); const ln0 = await p.evaluate(() => LV.lane);
  await tapG(844*0.88, 200); await p.waitForTimeout(150); const ln1 = await p.evaluate(() => LV.lane);
  check(ln0 === 0 && ln1 === 7, `thumb on the game's far left / far right = lanes 0 / 7 (got ${ln0} / ${ln1})`);
  await shot('6-deflect', 600);
  // turn the phone: back to the normal frame
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  const fr2 = await p.evaluate(() => ({ ROT, W, H, rot: document.documentElement.classList.contains('rot') }));
  check(!fr2.ROT && !fr2.rot && fr2.W === 844 && fr2.H === 390, 'turned sideways: plain frame ' + JSON.stringify(fr2));
  await p.waitForTimeout(400); await p.screenshot({ path: OUT + '7-turned.png' });
  check(!errs.length, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAIL' : 'ok'); if (fails) process.exitCode = 1; await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
