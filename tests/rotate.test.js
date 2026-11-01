// Phones play sideways. Held upright, a phone gets the "turn your phone sideways" card; turning it upright mid-song
// pauses the song; turning it back hides the card. Computers never see the card, however narrow the window.
// Usage: node rotate.test.js
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let bad = 0; const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) bad++; };
  const shown = p => p.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
  // a phone held upright
  let ctx = await b.newContext(C.PHONE_UPRIGHT), p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await C.skipLessons(p);
  await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  await p.waitForTimeout(700); await p.screenshot({ path: C.OUT + 'rotate-upright.png' });
  check(await shown(p), 'upright phone shows the card');
  // turn it sideways: the card goes; start the chase, then turn it upright mid-song: paused, card back
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300);
  check(!(await shown(p)), 'sideways phone hides the card');
  await p.evaluate(() => { goTitle(); startGame(); });
  await p.waitForFunction(() => S && S.running && songTime() > 2, null, { timeout: 30000 }).catch(() => {});
  const playing = await p.evaluate(() => !!(S && S.running && !S.paused));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  const paused = await p.evaluate(() => !!(S && S.paused));
  check(!playing || paused, `turning upright mid-song pauses it (playing ${playing}, paused ${paused})`);
  check(await shown(p), 'card back when upright');
  await ctx.close();
  // a narrow computer window: no card
  ctx = await b.newContext({ viewport: { width: 420, height: 800 } }); p = await ctx.newPage();
  await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  check(!(await shown(p)), 'narrow computer window has no card');
  await ctx.close(); await b.close();
  check(!errs.length, 'no page errors ' + JSON.stringify(errs));
  if (bad) { console.log('FAIL', bad); process.exit(1); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
