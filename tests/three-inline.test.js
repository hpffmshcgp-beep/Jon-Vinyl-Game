// The record must open with no module import at all (file previews and sandboxes block them): import() is booby-trapped.
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch();
  for (const url of [C.FILE_URL, C.URL]) {
    const p = await (await b.newContext(C.DESK)).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: {}, best: {} })); });
    await p.goto(url); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    const r = await p.evaluate(async () => { enterMap(false); for (let i = 0; i < 200 && !MAP.ready; i++) await new Promise(r => setTimeout(r, 100)); return [MAP.ready, !!window.THREE_MOD, THREE_MOD === window.THREE_MOD, document.getElementById('mapLoading').hidden]; });
    console.log(url.startsWith('file') ? 'single file' : 'web build', 'map ready / inline three / used inline / no error screen:', JSON.stringify(r), errs);
  }
  await b.close();
})();
