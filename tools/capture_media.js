// Capture the README's gameplay GIFs and stills on a frozen game clock, so every frame is exact no matter how fast the
// machine draws. A bot plays: Deflect aims the shield at the next heart; Void steers to the next gem and backflips.
// Usage: serve the repo root on 8765, then  node tools/capture_media.js   (needs ffmpeg). Writes docs/media/.
// The story stills in the README come from the play-tests (tests/prologue.test.js, tests/map.test.js).
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const OUT = path.join(__dirname, '..', 'docs', 'media'); fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.GAME_URL || 'http://localhost:8765/dist/web/index.html';
const FPS = 15, SUB = 4;   // 15 frames a second in the GIF, physics stepped 4 times per frame

async function page(b){
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.addInitScript(() => { localStorage.setItem('jv-progress', JSON.stringify({ prologue: true, stars: { 3: 3, 4: 2 }, best: {}, xplus: {} })); localStorage.setItem('sc-diff', 'hard'); });
  p.on('pageerror', e => { if (!global.__pe) { global.__pe = 1; console.log('page error:', e.stack); } });
  await p.goto(URL); await p.waitForFunction(() => !document.getElementById('startBtn').disabled, null, { timeout: 30000 });
  await p.waitForFunction(() => mode === 'title', null, { timeout: 30000 });
  return p;
}
const raf = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function playLevel(p, track, from){   // open the record at a stop, start the song, freeze the clock at `from`
  await p.evaluate(() => goTitle()); await p.click('#recordBtn');
  await p.waitForFunction(() => mode === 'map' && MAP.ready, null, { timeout: 60000 });
  await p.evaluate(i => { MAP.first = false; MAP.fall = 0; MAP.at = i; showStop(i); }, track - 1); await p.waitForTimeout(800);
  await p.click('#stopPlay'); await p.waitForFunction(() => mode === 'level' && LV && LV.running && levelTime() > 0.2, null, { timeout: 30000 });
  await p.evaluate(t => { window.__VT = heardCtx(performance.now()); LV.startAt = window.__VT - t - userDelay/1000; window.heardCtx = () => window.__VT;
    window.filmPost = (k = 1) => { g.save(); g.globalAlpha = Math.min(1, k); g.fillStyle = grainCv[0]; g.fillRect(0, 0, W, H); g.restore(); g.drawImage(vignCv, 0, 0, W, H); }; }, from);
}
async function record(p, name, secs, bot){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), name + '-'));
  for (let f = 0; f < secs*FPS; f++) {
    for (let s = 0; s < SUB; s++) { await p.evaluate(bot); await p.evaluate(dt => { window.__VT += dt; }, 1/(FPS*SUB)); await raf(p); }
    await p.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
  }
  const gif = path.join(OUT, name + '.gif');
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/f%04d.png -vf "scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 ${gif}`);
  fs.rmSync(dir, { recursive: true });
  console.log(name, (fs.statSync(gif).size/1e6).toFixed(1) + ' MB');
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const only = process.env.ONLY;   // ONLY=void (or deflect, title) to redo one
  let p = await page(b);
  if (!only || only === 'title') { await p.evaluate(() => goTitle()); await p.waitForTimeout(1800); await p.screenshot({ path: path.join(OUT, 'title.png') }); }   // the README uses a JPEG of it
  // Deflect (track 3): turn the shield to meet each heart
  if (!only || only === 'deflect') { await playLevel(p, 3, 30);
  await record(p, 'deflect', 6, () => { const t = levelTime(), nx = LV.notes.find(x => !x.judged && x.t - t < 0.25); if (nx) { AIM.mouse = true; AIM.target = nx.ang; } });
  } await p.close();
  if (only && only !== 'void') return b.close();
  // Void (track 4): ride up to the launch star, backflip in the air, land it, carve through the gems
  p = await page(b);
  await playLevel(p, 4, 26.6);
  await p.evaluate(() => { window.__did = -1; window.__flipT = 0; });
  await record(p, 'void', 7, () => {
    const t = levelTime(), reach = (0.88 - SURF.low)/LV.rise;
    if (LV.air) { const tau = t - LV.air.t0;
      if (tau > 0.22 && !window.__flipT && window.__did !== LV.air.t0) { surfDown({ pointerId: 88 }); window.__flipT = t; window.__did = LV.air.t0; }
      if (window.__flipT && t - window.__flipT > 0.7) { surfUp({ pointerId: 88 }); window.__flipT = 0; }
      LV.hold.delete('bot'); return; }
    window.__flipT = 0;
    const nx = LV.gems.find(x => !x.judged && !(x.air && x.kind !== 3)); let hold = LV.hold.has('bot');
    if (nx) { const goal = nx.kind === 3 ? 1.3 : nx.h, need = Math.abs(Math.min(goal, 1) - LV.h)/reach + 0.06;
      if (nx.t - t <= need + 0.05) { if (goal > LV.h + 0.03) hold = true; else if (goal < LV.h - 0.03) hold = false; else hold = LV.vel < 0 ? true : LV.vel > 0 ? false : hold; }
      else if (LV.h > 0.8) hold = false; }
    hold ? LV.hold.add('bot') : LV.hold.delete('bot');
  });
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
