// The game as the Claude app shows it on an iPhone 17 held sideways: 874x402 with a 74 pt top inset under the app's
// floating buttons (stand-ins drawn grey). The picture runs up under them; the HUD and text keep clear (L.ui).
// Usage: node app-inset.test.js
const { chromium } = require('playwright');
const C = require('./config');
const OUT = C.OUT + 'app-';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: {}, best: {} }));
    addEventListener('DOMContentLoaded', () => { const st = document.createElement('style');
      st.textContent = '#safeProbe{padding:74px 0 21px 0 !important} .fakeapp{position:fixed;z-index:999;top:12px;height:46px;border-radius:23px;background:rgba(140,140,140,.75);pointer-events:none}';
      document.head.appendChild(st); [['left:20px;width:46px'], ['right:20px;width:162px']].forEach(([css]) => { const d = document.createElement('div'); d.className = 'fakeapp'; d.style.cssText = css; document.body.appendChild(d); });
      dispatchEvent(new Event('resize')); }); });
  await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  await p.evaluate(() => dispatchEvent(new Event('resize')));
  await p.evaluate(() => goTitle()); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '0-title.png' });
  await p.click('#nextBtn'); await p.click('#startBtn');
  await p.waitForFunction(() => S && S.sc && S.sc.kind === 'cabin', null, { timeout: 20000 }); await p.waitForTimeout(1200);
  const lay = await p.evaluate(() => [SAFE.t, layout().top, layout().ui, H - layout().bot]);
  console.log('inset, picture top, text top, bottom bar', JSON.stringify(lay));
  if (!(lay[0] === 74 && lay[1] < 30 && lay[2] >= 74 && lay[3] < 30)) { console.log('FAIL layout'); process.exitCode = 1; }
  await p.screenshot({ path: OUT + '1-cabin.png' });
  await p.evaluate(() => cabinDo('her')); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '2-talk.png' });
  await p.evaluate(() => { S.sc.dlg = null; startSong(); }); await p.waitForFunction(() => mode === 'play', null, { timeout: 20000 });
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '3-titles.png' });
  await p.waitForFunction(() => S.lesson, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '4-lesson.png' });
  await p.evaluate(() => { S.lesson = null; try { localStorage.setItem('sc-lessons', '{"0":true,"1":true}'); } catch(e){} S.startAt -= (40 - songTime()); ac.resume(); }); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '5-chase.png' });
  await p.evaluate(() => { stopSources(); S = null; goTitle(); }); await p.click('#recordBtn');
  await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 }); await p.evaluate(() => { MAP.first = false; MAP.fall = 0; });
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '6-map.png' });
  await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level', null, { timeout: 30000 }); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '7-deflect.png' });
  console.log(errs.length ? 'FAIL ' + errs : 'ok'); if (errs.length) process.exitCode = 1; await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
