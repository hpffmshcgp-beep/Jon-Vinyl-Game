// Settings: Normal by default, the level and timing live in Settings (from the title, the lobby and the record),
// the lobby says where they are, and a sound check comes back to Settings.
// Usage: node settings.test.js
const { chromium } = require('playwright');
const C = require('./config');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [n, o] of [['desk', C.DESK], ['phone', C.PHONE]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const check = (cond, msg) => { if (!cond) throw new Error(n + ': ' + msg); };
    await p.goto(C.URL);
    await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
    await p.waitForFunction(() => mode === 'title', null, { timeout: 30000 }); await p.waitForTimeout(500);
    check(await p.evaluate(() => DIFF) === 'normal', 'default is Normal');
    await p.screenshot({ path: C.OUT + `settings-${n}-title.png` });
    await p.click('#nextBtn'); await p.waitForTimeout(300);
    const note = await p.evaluate(() => document.querySelector('#howPanel .lvlNote').textContent);
    check(/Playing on Normal/.test(note) && /Settings/.test(note), 'lobby note: ' + note);
    check(await p.evaluate(() => !document.querySelector('#howPanel .diff')), 'no level picker left in the lobby');
    await p.screenshot({ path: C.OUT + `settings-${n}-lobby.png` });
    await p.click('#howSettings'); await p.waitForTimeout(300);
    await p.screenshot({ path: C.OUT + `settings-${n}-panel.png` });
    await p.click('#dHard'); await p.click('#delayUp'); await p.click('#delayUp');
    let s = await p.evaluate(() => [DIFF, localStorage.getItem('sc-diff'), userDelay, localStorage.getItem('sc-delay'), document.querySelector('#howPanel .lvlName').textContent]);
    check(s[0] === 'hard' && s[1] === 'hard' && s[2] === 20 && s[3] === '20' && s[4] === 'Hard', 'picked hard and +20 ms ' + JSON.stringify(s));
    await p.keyboard.press('Escape'); check(await p.evaluate(() => document.getElementById('settings').hidden), 'Escape closes');
    // the title's Settings button, then a sound check that comes back to Settings
    await p.click('#backBtn'); await p.click('#titleSettings'); await p.waitForTimeout(200);
    await p.click('#calBtn'); await p.waitForFunction(() => mode === 'calib');
    await p.evaluate(() => { CAL = null; document.getElementById('calDone').hidden = false; }); await p.click('#calDone');
    s = await p.evaluate(() => [mode, document.getElementById('settings').hidden, document.getElementById('title').hidden]);
    check(s[0] === 'title' && !s[1] && s[2], 'sound check returns to settings ' + JSON.stringify(s));
    await p.click('#setDone');
    // the record: the stop card shows the level as a chip that opens Settings
    await p.evaluate(() => { PROG.prologue = true; PROG.stars = { 3: 1 }; saveProg(); goTitle(); }); await p.click('#recordBtn');
    await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
    await p.evaluate(() => { MAP.first = false; MAP.fall = 0; }); await p.waitForTimeout(1500);
    check(await p.evaluate(() => document.querySelector('#stopLvl .lvlName').textContent) === 'Hard', 'map chip shows Hard');
    await p.screenshot({ path: C.OUT + `settings-${n}-map.png` });
    await p.click('#stopLvl'); await p.waitForTimeout(300); await p.click('#dEasy'); await p.click('#setDone');
    check(await p.evaluate(() => document.querySelector('#stopLvl .lvlName').textContent) === 'Easy' && await p.evaluate(() => mode) === 'map', 'map chip updated');
    console.log(n, 'ok', errs); await ctx.close();
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
