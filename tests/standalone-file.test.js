const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: {width:1280,height:720} }); await C.skipLessons(p); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/fonts|ERR_TUNNEL|ERR_NAME/.test(m.text()) && errs.push(m.text()));
  await p.goto(C.FILE_URL);
  await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  await p.mouse.click(640, 360); await p.waitForFunction(() => mode === 'title', null, { timeout: 10000 });
  await p.click('#nextBtn'); await p.click('#startBtn'); await p.waitForFunction(() => document.getElementById('title').hidden, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  console.log('opened from disk ->', await p.evaluate(() => [mode, !!buffers, Math.round(buffers.songplay.duration), document.title, document.characterSet]), errs);
  await p.screenshot({ path: C.OUT + 'standalone.png' });
  await b.close();
})();
