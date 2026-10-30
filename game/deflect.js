/* ---------- album levels: Deflect (Beatblock-style) ----------
   Jon stands on the record's label. A golden shield circles him; hearts (the rhythm guitar) and heartbreaks (the lead
   guitar) fly in from eight directions and land on the beat. Point the shield at each one as it arrives:
   mouse, or drag a finger anywhere on a phone, or the arrow keys / WASD. Dead centre is PERFECT, the edge is GOOD. */
const SONGS = __SONGS__;                       // charts for the album songs that have been added (tools/make_deflect_chart.py)
const DEF = { half: 34*Math.PI/180, perfect: 14*Math.PI/180, grace: 0.07, preroll: 2.6 };
const dirAngle = d => -Math.PI/2 + d*Math.PI/4;   // 0 = top, clockwise
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
let LV = null;
const SONGBUF = {};                           // decoded album songs, kept apart from the prologue's buffers
const AIM = { target: -Math.PI/2, keys: new Set(), mouse: false };
function levelGeo(){
  const L = layout(), cx = W/2, cy = L.top + L.fh*0.54, R = clamp(Math.min(W, L.fh)*0.24, 64, 170);
  return { L, cx, cy, R, spawn: Math.hypot(W, H)*0.62, jh: Math.min(L.jh, R*1.25) };
}
async function startLevel(track){
  const t = ALBUM.tracks.find(x => x.n === track), chart = t && SONGS[t.song]; if (!chart) return;
  $('mapLoading').hidden = false; $('mapLoading').textContent = 'Dropping the needle…';
  if (!ac) ac = makeCtx(); if (ac.state === 'suspended') await ac.resume();
  if (!nodes) buildGraph();
  try { if (!SONGBUF[t.song]) SONGBUF[t.song] = await new Promise((res, rej) => { fetchProg(t.song).then(ab => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }, rej); }); }
  catch(e) { $('mapLoading').textContent = 'This browser could not play the song.'; return; }
  $('mapLoading').hidden = true; leaveMap(); stopAmbience(); stopSources();
  const notes = chart.levels[DIFF].map(([tt, dir, kind]) => ({ t: tt, dir, kind, ang: dirAngle(dir), judged: false, hit: false, k: '', jt: 0, out: 0 }));
  LV = S = { kind: 'level', track: t, chart, notes, approach: chart.approach[DIFF], startAt: ac.currentTime + DEF.preroll, running: true, paused: false,
    score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, miss: 0 }, aim: -Math.PI/2, flash: -9, shake: -9, popups: [], next: 0, lastNow: 0, ended: false };
  setLayer(nodes.songplay, 'open');
  const src = ac.createBufferSource(); src.buffer = SONGBUF[t.song]; src.connect(nodes.songplay.lp); src.start(LV.startAt); srcs.push(src);
  mode = 'level'; cv.hidden = false; grabKeys();
  ['title', 'results', 'pause'].forEach(id => $(id).hidden = true);
}
const levelTime = () => heardCtx(performance.now()) - LV.startAt - userDelay/1000;
function levelAimFromPoint(x, y){ const G = levelGeo(); AIM.target = Math.atan2(y - G.cy, x - G.cx); }
function levelKeys(){   // arrows / WASD give eight directions
  const k = AIM.keys, dx = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0),
        dy = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
  if (dx || dy) { AIM.target = Math.atan2(dy, dx); AIM.mouse = false; }
}
function levelJudge(t){
  for (let i = LV.next; i < LV.notes.length; i++) {
    const n = LV.notes[i]; if (n.t > t) break;
    if (n.judged) { if (i === LV.next) LV.next++; continue; }
    const d = Math.abs(angDiff(LV.aim, n.ang));
    if (d <= DEF.half) {   // the shield is there: deflected
      n.judged = n.hit = true; n.k = d <= DEF.perfect && t - n.t < 0.03 ? 'perfect' : 'good'; n.jt = t; n.out = LV.aim;
      LV.counts[n.k]++; LV.combo++; LV.maxCombo = Math.max(LV.maxCombo, LV.combo);
      LV.score += (n.k === 'perfect' ? 300 : 150)*Math.min(4, 1 + Math.floor(LV.combo/10)); LV.flash = t;
      LV.popups.push({ t, ang: n.ang, text: n.k.toUpperCase(), k: n.k });
    } else if (t - n.t > DEF.grace) {   // too late: it gets through
      n.judged = true; n.k = 'miss'; n.jt = t; LV.counts.miss++;
      if (LV.combo >= 5) scratch();
      LV.combo = 0; LV.shake = t; LV.popups.push({ t, ang: n.ang, text: 'MISS', k: 'miss' });
    }
  }
}
function heartbreak(x, y, s, rot){   // a heart split by a jagged crack
  g.save(); g.translate(x, y); g.rotate(rot);
  [-1, 1].forEach(side => { g.save(); g.beginPath(); g.rect(side < 0 ? -s : 0, -s, s, s*2); g.clip(); g.translate(side*s*0.06, 0); g.rotate(side*0.08);
    heart(0, 0, s*1.9, '#4a1a3a', '#c58ae6'); g.restore(); });
  g.strokeStyle = '#120812'; g.lineWidth = Math.max(1.5, s*0.08); g.lineJoin = 'miter';
  g.beginPath(); g.moveTo(0, -s*0.62); g.lineTo(s*0.12, -s*0.32); g.lineTo(-s*0.1, -s*0.05); g.lineTo(s*0.1, s*0.22); g.lineTo(0, s*0.62); g.stroke();
  g.restore();
}
function levelFrame(now){
  const G = levelGeo(), { L, cx, cy, R } = G, t = LV.running ? levelTime() : LV.lastT || 0; LV.lastT = t;
  const dt = clamp(now - (LV.lastNow || now), 0, 0.1); LV.lastNow = now;
  levelKeys();
  // the shield follows the pointer straight away; keys turn it fast but not instantly
  const da = angDiff(AIM.target, LV.aim); LV.aim += AIM.mouse ? da : Math.sign(da)*Math.min(Math.abs(da), dt*Math.PI*6.5);
  if (LV.running && !LV.paused) levelJudge(t);
  const beat = 60/91.25, pulse = Math.max(0, 1 - (((t/beat) % 1) + 1) % 1*2.5);
  // the void, then the record under him, turning slowly
  const bg = g.createRadialGradient(cx, cy, R*1.6, cx, cy, Math.hypot(W, H)*0.75); bg.addColorStop(0, '#2a1420'); bg.addColorStop(.5, '#6e3a2c'); bg.addColorStop(1, '#c97d45');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const shake = Math.max(0, 1 - (t - LV.shake)/0.25), sx = shake ? (Math.random() - 0.5)*10*shake : 0, sy = shake ? (Math.random() - 0.5)*10*shake : 0;
  g.save(); g.translate(sx, sy);
  vinyl2D(cx, cy, R*1.95, t*0.35, 0.18 + pulse*0.22);   // the label (about R*0.64) is the little stage he stands on
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = R*0.26; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();          // the shield's track
  g.strokeStyle = 'rgba(230,184,92,.18)'; g.lineWidth = 1; [R*0.87, R*1.13].forEach(rr => { g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke(); });
  // eight spokes; the slots where the next notes land light up
  for (let d = 0; d < 8; d++) { const a = dirAngle(d); g.strokeStyle = 'rgba(243,230,200,.06)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + Math.cos(a)*R*1.15, cy + Math.sin(a)*R*1.15); g.lineTo(cx + Math.cos(a)*G.spawn, cy + Math.sin(a)*G.spawn); g.stroke(); }
  g.strokeStyle = `rgba(243,230,200,${0.12 + pulse*0.12})`; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  for (let i = LV.next, shown = 0; i < LV.notes.length && shown < 3; i++) { const n = LV.notes[i]; if (n.judged) continue; const k = 1 - clamp((n.t - t)/LV.approach, 0, 1); if (k <= 0) break; shown++;
    g.strokeStyle = n.kind ? `rgba(197,138,230,${0.25 + 0.5*k})` : `rgba(240,163,160,${0.25 + 0.5*k})`; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R, n.ang - 0.18, n.ang + 0.18); g.stroke(); }
  // Jon, on the label, facing the way the shield points
  drawJon(cx, cy + G.jh*0.48, G.jh*0.9, { running: false, amp: 0, phase: 0, idle: now*0.8, jumpK: -1, kick: false, stumble: Math.max(0, 1 - (t - LV.shake)/0.3), reach: 0,
    dir: Math.cos(LV.aim) >= 0 ? 1 : -1, shades: true, glow: 0, holdHand: false, lookUp: false, smile: LV.combo >= 10 });
  // the notes: flying in, then either knocked away or getting through
  const ns = R*0.2;
  for (let i = Math.max(0, LV.next - 12); i < LV.notes.length; i++) {
    const n = LV.notes[i]; if (n.t - t > LV.approach) break;
    let x, y, a = 1, rot = 0;
    if (!n.judged) { const r = R + (n.t - t)/LV.approach*(G.spawn - R); x = cx + Math.cos(n.ang)*r; y = cy + Math.sin(n.ang)*r; rot = Math.sin(now*3 + i)*0.15; }
    else if (n.hit) { const e = t - n.jt; if (e > 0.6) continue; const out = n.ang + angDiff(n.out, n.ang)*2, r = R + e*R*3.2; x = cx + Math.cos(out)*r; y = cy + Math.sin(out)*r; a = 1 - e/0.6; rot = e*14; }
    else { const e = t - n.jt; if (e > 0.35) continue; const r = R*(1 - e/0.35); x = cx + Math.cos(n.ang)*r; y = cy + Math.sin(n.ang)*r; a = 1 - e/0.35; }
    g.globalAlpha = a;
    if (n.kind) heartbreak(x, y, ns, rot); else { g.save(); g.translate(x, y); g.rotate(rot); heart(0, 0, ns*1.9, '#e8746a', PAL.gold); g.restore(); }
    g.globalAlpha = 1;
  }
  // the shield: a golden arc of record rim
  const fl = Math.max(0, 1 - (t - LV.flash)/0.18);
  g.save(); g.lineCap = 'round';
  g.strokeStyle = `rgba(255,214,150,${0.25 + fl*0.4})`; g.lineWidth = R*0.22 + fl*6; g.beginPath(); g.arc(cx, cy, R, LV.aim - DEF.half, LV.aim + DEF.half); g.stroke();
  const sg = g.createLinearGradient(cx + Math.cos(LV.aim - DEF.half)*R, cy + Math.sin(LV.aim - DEF.half)*R, cx + Math.cos(LV.aim + DEF.half)*R, cy + Math.sin(LV.aim + DEF.half)*R);
  sg.addColorStop(0, '#b98a3a'); sg.addColorStop(.5, '#fff2cf'); sg.addColorStop(1, '#b98a3a');
  g.strokeStyle = sg; g.lineWidth = R*0.1; g.beginPath(); g.arc(cx, cy, R, LV.aim - DEF.half, LV.aim + DEF.half); g.stroke();
  g.restore();
  LV.popups = LV.popups.filter(p => t - p.t < .55);
  LV.popups.forEach(p => { const k = (t - p.t)/.55, r = R*1.55 + k*16; g.globalAlpha = 1 - k; g.textAlign = 'center';
    g.fillStyle = p.k === 'miss' ? '#9a8f7a' : p.k === 'perfect' ? PAL.gold : PAL.cream; g.font = `400 ${clamp(R*0.16, 14, 22)}px ${FONT.deco}`;
    g.fillText(p.text, cx + Math.cos(p.ang)*r, cy + Math.sin(p.ang)*r); g.globalAlpha = 1; });
  g.restore();
  filmPost(0.7); letterbox(L);
  // HUD: score, combo, the song, and how far through it you are
  const pad = 16, cyTop = SAFE.t + L.barH/2, sz = Math.min(24, L.barH*0.48);
  g.textAlign = 'left'; g.fillStyle = PAL.gold; g.font = `400 ${sz}px ${FONT.deco}`; g.fillText(LV.score.toLocaleString(), pad, cyTop + sz*0.35);
  const sw = g.measureText(LV.score.toLocaleString()).width;
  g.font = `700 10px ${FONT.type}`; g.fillStyle = PAL.cream; g.fillText(`${LV.combo} COMBO  ·  ${DIFFS[DIFF].name.toUpperCase()}`, pad + sw + 10, cyTop + 4);
  g.textAlign = 'right'; g.fillStyle = PAL.gold; g.font = `400 ${Math.min(14, L.barH*0.32)}px ${FONT.deco}`; g.fillText(`TRACK ${LV.track.n} · ${LV.track.title.toUpperCase()}`, W - pad, cyTop + 5);
  g.fillStyle = 'rgba(230,184,92,.9)'; g.fillRect(0, L.top - 2, W*clamp(t/LV.chart.duration, 0, 1), 2);
  // the title card while the needle drops, with how to turn the shield
  if (t < 3.2) { const a = clamp(Math.min((t + DEF.preroll)*3, (3.2 - t)*2), 0, 1); g.globalAlpha = a; g.textAlign = 'center';
    g.fillStyle = PAL.cream; g.font = `italic 500 ${clamp(W*0.04, 15, 22)}px ${FONT.serif}`; g.fillText(`Track ${LV.track.n}`, W/2, L.top + L.fh*0.16);
    g.fillStyle = PAL.gold; g.font = `400 ${clamp(W*0.09, 34, 64)}px ${FONT.deco}`; g.fillText(LV.track.title, W/2, L.top + L.fh*0.16 + clamp(W*0.08, 34, 58));
    g.fillStyle = PAL.cream; g.font = `700 ${clamp(W*0.026, 10, 13)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'DRAG AROUND JON TO TURN THE SHIELD' : 'AIM THE SHIELD WITH THE MOUSE  ·  OR ARROWS / WASD', W/2, L.bot - L.fh*0.06);
    g.globalAlpha = 1; }
  if (LV.running && !LV.ended && t > LV.chart.duration + 0.3) levelEnd();
}
function levelEnd(){
  LV.ended = true; LV.running = false; stopSources();
  const n = LV.notes.length, c = LV.counts, acc = n ? (c.perfect + c.good*0.7)/n : 0, st = starsFor(acc, true), tn = LV.track.n;
  const prevStars = PROG.stars[tn] || 0, key = `${tn}-${DIFF}`, prevBest = PROG.best[key] || 0;
  PROG.stars[tn] = Math.max(prevStars, st); PROG.best[key] = Math.max(prevBest, LV.score); saveProg();
  const lines = ['', 'Got through it.', 'Hardly a scratch.', 'Nothing gets past you.'];
  $('resEyebrow').textContent = `Track ${tn} · ${DIFFS[DIFF].name.toLowerCase()}` + (LV.score > prevBest ? ' · new high score' : '');
  $('resTitle').textContent = LV.track.title;
  $('resStars').innerHTML = '★'.repeat(st) + '<i>' + '★'.repeat(3 - st) + '</i>'; $('resStars').setAttribute('aria-label', st + ' out of 3 stars');
  $('resLine').textContent = st < 3 ? `${lines[st]} ${st === 1 ? '85%' : '95%'} accuracy for the next star.` : lines[3];
  $('resScore').textContent = LV.score.toLocaleString(); $('resAcc').textContent = (acc*100).toFixed(1) + '%';
  $('resCombo').textContent = LV.maxCombo; $('resPerf').textContent = c.perfect + '/' + n;
  $('resTiming').textContent = ''; $('fixBtn').hidden = true;
  $('intoBtn').hidden = false; $('intoBtn').textContent = 'Back to the record'; $('intoBtn').onclick = () => { $('results').hidden = true; enterMap(false); };
  $('againBtn').className = 'ghost'; $('againBtn').textContent = 'Play again'; $('againBtn').onclick = () => { $('results').hidden = true; startLevel(tn); };
  $('menuBtn').hidden = true;
  $('results').hidden = false; mode = 'results'; startAmbience();
}
