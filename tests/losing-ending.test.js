const { chromium } = require('playwright');
const C = require('./config');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: {width:1280,height:800} })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto(C.URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled);
 await p.evaluate(() => goTitle()); await p.click('#nextBtn'); await p.click('#startBtn'); await p.waitForFunction(() => mode === 'play');
 await p.evaluate(() => { S.startAt -= (LAST_NOTE - 0.5 - songTime()); });
 await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 20000 });
 console.log(await p.evaluate(() => [document.getElementById('resTitle').textContent, !!S.sc]), errs); await b.close(); })();
