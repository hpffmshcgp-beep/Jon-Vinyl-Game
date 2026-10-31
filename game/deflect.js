/* ---------- album levels: Deflect (Beatblock-style) ----------
   Jon stands on the record's label. A golden shield circles him; hearts (the rhythm guitar) and heartbreaks (the lead
   guitar) fly in from eight directions and land on the beat. Point the shield at each one as it arrives:
   mouse, or on a phone tap where it's coming from (snaps to the 8 directions), or the arrow keys / WASD. Dead centre is PERFECT, the edge is GOOD. */
const SONGS = __SONGS__;                       // charts for the album songs that have been added (tools/make_deflect_chart.py)
const DEF = { half: 34*Math.PI/180, perfect: 14*Math.PI/180, grace: 0.07, preroll: 2.6 };
const dirAngle = d => -Math.PI/2 + d*Math.PI/4;   // 0 = top, clockwise
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
let LV = null;
const SONGBUF = {};                           // decoded album songs, kept apart from the prologue's buffers
const AIM = { target: -Math.PI/2, keys: new Set(), mouse: false };
function levelGeo(){
  const L = layout(), cx = W/2, cy = L.top + L.fh*0.54, R = clamp(Math.min(W, L.fh)*0.15, 46, 110);   // a small centre leaves a long way in to read the notes
  return { L, cx, cy, R, spawn: Math.hypot(W, H)*0.62, jh: Math.min(L.jh, R*1.3) };
}
async function startLevel(track){
  const t = ALBUM.tracks.find(x => x.n === track), chart = t && SONGS[t.song]; if (!chart) return;
  $('mapLoading').hidden = false; $('mapLoading').textContent = 'Dropping the needle…';
  if (!ac) ac = makeCtx(); if (ac.state === 'suspended') await ac.resume();
  if (!nodes) buildGraph();
  const files = t.layers || [t.song];   // Void comes as layers (drums, everything else) so the mix can follow your riding
  try { for (const f of files) if (!SONGBUF[f]) SONGBUF[f] = await new Promise((res, rej) => { fetchProg(f).then(ab => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }, rej); }); }
  catch(e) { $('mapLoading').textContent = 'This browser could not play the song.'; return; }
  $('mapLoading').hidden = true; leaveMap(); stopAmbience(); stopSources();
  const notes = chart.mode === 'surf' ? [] : chart.levels[DIFF].map(([tt, dir, kind]) => ({ t: tt, dir, kind, ang: dirAngle(dir), judged: false, hit: false, k: '', jt: 0, out: 0 }));
  const endAt = notes.length ? notes[notes.length - 1].t + 2.4 : chart.duration;   // the song fades out a little after the last heart
  LV = S = { kind: 'level', track: t, chart, notes, endAt, approach: chart.approach[DIFF], startAt: ac.currentTime + DEF.preroll, running: true, paused: false,
    score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, miss: 0 }, aim: -Math.PI/2, flash: -9, shake: -9, popups: [], parts: [], trail: [], comboT: -9, next: 0, lastNow: 0, ended: false };
  if (chart.mode === 'surf') Object.assign(LV, surfInit(t, chart));   // track 4, Void: a different game on the same engine
  setLayer(nodes.songplay, 'open');
  if (t.layers) LV.mix = layerMix(t.layers, LV.startAt);
  else { const src = ac.createBufferSource(); src.buffer = SONGBUF[t.song]; src.connect(nodes.songplay.lp); src.start(LV.startAt); srcs.push(src); }
  mode = 'level'; cv.hidden = false; grabKeys();
  ['title', 'results', 'pause'].forEach(id => $(id).hidden = true);
}
const levelTime = (p = performance.now()) => heardCtx(p) - LV.startAt - userDelay/1000;
function levelAimFromPoint(x, y){ const G = levelGeo(); AIM.target = Math.atan2(y - G.cy, x - G.cx); }
// phones: tap where it's coming from. The shield snaps to the nearest of the eight directions, so a tap anywhere in
// roughly the right area aims it dead centre; keep a finger down and slide to follow. Taps right on Jon are ignored.
const TOUCHES = new Set();
function levelTouch(e, ph){
  if (ph === 'up') { TOUCHES.delete(e.pointerId); return; }
  if (ph === 'down') TOUCHES.add(e.pointerId); else if (!TOUCHES.has(e.pointerId)) return;
  const G = levelGeo(), dx = e.clientX - G.cx, dy = e.clientY - G.cy;
  if (Math.hypot(dx, dy) < G.R*0.45) return;
  const d = ((Math.round((Math.atan2(dy, dx) + Math.PI/2)/(Math.PI/4)) % 8) + 8) % 8;
  AIM.target = dirAngle(d); AIM.mouse = true;
  if (ph === 'down' && LV) LV.tapFx = { x: e.clientX, y: e.clientY, t: performance.now()/1000, d };
}
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
      n.judged = n.hit = true; n.k = d <= DEF.perfect && t - n.t < 0.03 ? 'perfect' : 'good'; n.jt = t; n.out = LV.aim; n.late = t - n.t;
      LV.counts[n.k]++; LV.combo++; LV.maxCombo = Math.max(LV.maxCombo, LV.combo);
      LV.score += (n.k === 'perfect' ? 300 : 150)*Math.min(4, 1 + Math.floor(LV.combo/10)); LV.flash = t;
      LV.popups.push({ t, ang: n.ang, text: n.k.toUpperCase(), k: n.k }); LV.comboT = t;
      burst(t, n.ang, n.kind ? 'break' : 'heart', n.k === 'perfect' ? 18 : 11);
    } else if (t - n.t > DEF.grace) {   // too late: it gets through
      n.judged = true; n.k = 'miss'; n.jt = t; LV.counts.miss++; n.off = Math.abs(angDiff(LV.aim, n.ang));
      if (LV.combo >= 5) scratch();
      LV.combo = 0; LV.shake = t; LV.popups.push({ t, ang: n.ang, text: 'MISS', k: 'miss' }); burst(t, n.ang, 'miss', 8);
    }
  }
}
// sparks when a note is knocked away (gold for hearts, violet shards for heartbreaks), a dull puff when one gets through
function burst(t, ang, kind, count){
  const out = kind === 'miss' ? ang + Math.PI : ang;   // a miss bursts on Jon's side of the shield
  for (let i = 0; i < count; i++) {
    const a = out + (Math.random() - 0.5)*(kind === 'miss' ? 2.4 : 1.6), sp = (kind === 'miss' ? 0.5 : 0.9) + Math.random()*1.6;
    LV.parts.push({ t0: t, ang, a, sp, life: 0.35 + Math.random()*0.35, sz: 0.5 + Math.random(), kind, spin: (Math.random() - 0.5)*12 });
  }
}
function drawParts(t, cx, cy, R){
  LV.parts = LV.parts.filter(p => t - p.t0 < p.life && t >= p.t0);
  for (const p of LV.parts) {
    const e = t - p.t0, k = e/p.life, r0 = R*(p.kind === 'miss' ? 0.85 : 1.05), d = p.sp*R*1.4*(1 - Math.pow(1 - k, 2.2));   // flies out from where it struck, slowing down
    const x = cx + Math.cos(p.ang)*r0 + Math.cos(p.a)*d, y = cy + Math.sin(p.ang)*r0 + Math.sin(p.a)*d;
    g.globalAlpha = (1 - k)*(p.kind === 'miss' ? 0.6 : 1);
    if (p.kind === 'break') { g.save(); g.translate(x, y); g.rotate(p.spin*e); g.fillStyle = k < 0.3 ? '#e9c6ff' : '#9a5fc0'; const s = R*0.05*p.sz; g.beginPath(); g.moveTo(0, -s); g.lineTo(s*0.7, s*0.6); g.lineTo(-s*0.6, s*0.4); g.closePath(); g.fill(); g.restore(); }
    else { const s = R*(p.kind === 'miss' ? 0.035 : 0.03)*p.sz*(1 - k*0.5); g.fillStyle = p.kind === 'miss' ? '#8c7f73' : k < 0.25 ? '#fff6dc' : '#ffcf7a';
      g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
      if (p.kind === 'heart') { g.strokeStyle = g.fillStyle; g.lineWidth = s*0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(p.a)*s*4, y - Math.sin(p.a)*s*4); g.stroke(); } }
  }
  g.globalAlpha = 1;
}
function heartbreak(x, y, s, rot, split = 0){   // a heart split by a jagged crack; when knocked away the halves come apart
  g.save(); g.translate(x, y); g.rotate(rot);
  [-1, 1].forEach(side => { g.save(); g.translate(side*s*split, 0); g.rotate(side*split*0.9); g.beginPath(); g.rect(side < 0 ? -s : 0, -s, s, s*2); g.clip(); g.translate(side*s*0.06, 0); g.rotate(side*0.08);
    heart(0, 0, s*1.9, '#4a1a3a', '#c58ae6'); g.restore(); });
  g.strokeStyle = '#120812'; g.lineWidth = Math.max(1.5, s*0.08); g.lineJoin = 'miter';
  if (!split) { g.beginPath(); g.moveTo(0, -s*0.62); g.lineTo(s*0.12, -s*0.32); g.lineTo(-s*0.1, -s*0.05); g.lineTo(s*0.1, s*0.22); g.lineTo(0, s*0.62); g.stroke(); }
  g.restore();
}
const swingPop = k => k >= 1 ? 1 : 0.7 + 0.3*k + Math.sin(Math.min(1, k)*Math.PI)*0.35;   // grow past full size, then settle
function levelFrame(now){
  if (LV.mode === 'surf') return surfFrame(now);
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
  const ns = clamp(R*0.26, 13, 26);
  for (let i = Math.max(0, LV.next - 12); i < LV.notes.length; i++) {
    const n = LV.notes[i]; if (n.t - t > LV.approach) break;
    let x, y, a = 1, rot = 0, split = 0;
    if (!n.judged) { const r = R + (n.t - t)/LV.approach*(G.spawn - R); x = cx + Math.cos(n.ang)*r; y = cy + Math.sin(n.ang)*r; rot = Math.sin(now*3 + i)*0.15; }
    else if (n.hit) { const e = t - n.jt; if (e > 0.6) continue; const out = n.ang + angDiff(n.out, n.ang)*2, r = R + e*R*3.2; x = cx + Math.cos(out)*r; y = cy + Math.sin(out)*r; a = 1 - e/0.6; rot = e*14; split = n.kind ? Math.min(0.9, e*3.2) : 0; }
    else { const e = t - n.jt; if (e > 0.35) continue; const r = R*(1 - e/0.35); x = cx + Math.cos(n.ang)*r; y = cy + Math.sin(n.ang)*r; a = 1 - e/0.35; }
    g.globalAlpha = a;
    if (n.kind) heartbreak(x, y, ns, rot, split); else { g.save(); g.translate(x, y); g.rotate(rot); heart(0, 0, ns*1.9, '#e8746a', PAL.gold); g.restore(); }
    g.globalAlpha = 1;
  }
  if (LV.tapFx) { const e = now - LV.tapFx.t; if (e < 0.3) { const k = e/0.3, a = dirAngle(LV.tapFx.d);
    g.strokeStyle = `rgba(255,214,150,${(1 - k)*0.7})`; g.lineWidth = 2; g.beginPath(); g.arc(LV.tapFx.x - sx, LV.tapFx.y - sy, 10 + k*22, 0, 7); g.stroke();
    g.strokeStyle = `rgba(255,214,150,${(1 - k)*0.18})`; g.lineWidth = R*0.5; g.beginPath(); g.moveTo(cx + Math.cos(a)*R*1.3, cy + Math.sin(a)*R*1.3); g.lineTo(cx + Math.cos(a)*G.spawn*0.7, cy + Math.sin(a)*G.spawn*0.7); g.stroke(); } }
  drawParts(t, cx, cy, R);
  // the shield: a golden arc of record rim, leaving a short fading smear when it turns fast
  const fl = Math.max(0, 1 - (t - LV.flash)/0.18);
  LV.trail.push({ a: LV.aim, t: now }); LV.trail = LV.trail.filter(p => now - p.t < 0.12);
  g.save(); g.lineCap = 'round';
  LV.trail.forEach(p => { const k = 1 - (now - p.t)/0.12, mv = Math.abs(angDiff(p.a, LV.aim)); if (mv < 0.04) return;
    g.strokeStyle = `rgba(255,214,150,${0.22*k})`; g.lineWidth = R*0.1*(0.6 + 0.4*k); g.beginPath(); g.arc(cx, cy, R, p.a - DEF.half*0.9, p.a + DEF.half*0.9); g.stroke(); });
  g.strokeStyle = `rgba(255,214,150,${0.25 + fl*0.4})`; g.lineWidth = R*0.22 + fl*6; g.beginPath(); g.arc(cx, cy, R, LV.aim - DEF.half, LV.aim + DEF.half); g.stroke();
  const sg = g.createLinearGradient(cx + Math.cos(LV.aim - DEF.half)*R, cy + Math.sin(LV.aim - DEF.half)*R, cx + Math.cos(LV.aim + DEF.half)*R, cy + Math.sin(LV.aim + DEF.half)*R);
  sg.addColorStop(0, '#b98a3a'); sg.addColorStop(.5, '#fff2cf'); sg.addColorStop(1, '#b98a3a');
  g.strokeStyle = sg; g.lineWidth = R*0.1; g.beginPath(); g.arc(cx, cy, R, LV.aim - DEF.half, LV.aim + DEF.half); g.stroke();
  g.restore();
  LV.popups = LV.popups.filter(p => t - p.t < .55);
  LV.popups.forEach(p => { const k = (t - p.t)/.55, r = R*1.55 + k*16, pop = swingPop(k*0.55/0.22); g.globalAlpha = 1 - k*k; g.textAlign = 'center';
    g.fillStyle = p.k === 'miss' ? '#9a8f7a' : p.k === 'perfect' ? PAL.gold : PAL.cream; g.font = `400 ${clamp(R*0.16, 14, 22)*pop}px ${FONT.deco}`;
    g.fillText(p.text, cx + Math.cos(p.ang)*r, cy + Math.sin(p.ang)*r); g.globalAlpha = 1; });
  g.restore();
  filmPost(0.7); letterbox(L);
  // HUD: score, combo, the song, and how far through it you are
  const pad = 16, cyTop = SAFE.t + L.barH/2, sz = Math.min(24, L.barH*0.48);
  g.textAlign = 'left'; g.fillStyle = PAL.gold; g.font = `400 ${sz}px ${FONT.deco}`; g.fillText(LV.score.toLocaleString(), pad, cyTop + sz*0.35);
  const sw = g.measureText(LV.score.toLocaleString()).width;
  { const cp = LV.combo >= 2 ? swingPop(clamp((t - LV.comboT)/0.22, 0, 1)) : 1;   // the combo hops each time it grows
    g.save(); g.translate(pad + sw + 10, cyTop + 4); g.scale(cp, cp); g.font = `700 10px ${FONT.type}`; g.fillStyle = LV.combo >= 10 ? PAL.gold : PAL.cream; g.fillText(`${LV.combo} COMBO  ·  ${DIFFS[DIFF].name.toUpperCase()}`, 0, 0); g.restore(); }
  g.textAlign = 'right'; g.fillStyle = PAL.gold; g.font = `400 ${Math.min(14, L.barH*0.32)}px ${FONT.deco}`; g.fillText(`TRACK ${LV.track.n} · ${LV.track.title.toUpperCase()}`, W - pad, cyTop + 5);
  g.fillStyle = 'rgba(230,184,92,.9)'; g.fillRect(0, L.top - 2, W*clamp(t/LV.endAt, 0, 1), 2);
  // the title card while the needle drops, with how to turn the shield
  if (t < 3.2) { const a = clamp(Math.min((t + DEF.preroll)*3, (3.2 - t)*2), 0, 1); g.globalAlpha = a; g.textAlign = 'center';
    g.fillStyle = PAL.cream; g.font = `italic 500 ${clamp(W*0.04, 15, 22)}px ${FONT.serif}`; g.fillText(`Track ${LV.track.n}`, W/2, L.top + L.fh*0.16);
    g.fillStyle = PAL.gold; g.font = `400 ${clamp(W*0.09, 34, 64)}px ${FONT.deco}`; g.fillText(LV.track.title, W/2, L.top + L.fh*0.16 + clamp(W*0.08, 34, 58));
    g.fillStyle = PAL.cream; g.font = `700 ${clamp(W*0.026, 10, 13)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'TAP WHERE IT’S COMING FROM' : 'AIM THE SHIELD WITH THE MOUSE  ·  OR ARROWS / WASD', W/2, L.bot - L.fh*0.06);
    g.globalAlpha = 1; }
  if (LV.running && !LV.fading && t > LV.endAt) { LV.fading = true; nodes.songplay.gn.gain.setTargetAtTime(0, ac.currentTime, 0.35); }
  if (LV.fading) { g.fillStyle = `rgba(3,2,5,${clamp((t - LV.endAt)/1.4, 0, 0.6)})`; g.fillRect(0, 0, W, H); }
  if (LV.running && !LV.ended && t > LV.endAt + 1.4) levelEnd();
}
function levelEnd(wiped){   // wiped: Void's last board went (no stars, nothing saved; try again)
  LV.ended = true; LV.running = false; stopSources();
  const n = wiped ? LV.notes.filter(x => x.judged).length : LV.notes.length, c = LV.counts, acc = n ? (c.perfect + c.good*0.7)/n : 0, st = wiped ? 0 : starsFor(acc, true), tn = LV.track.n;
  const prevStars = PROG.stars[tn] || 0, key = `${tn}-${DIFF}`, prevBest = PROG.best[key] || 0;
  if (!wiped) { PROG.stars[tn] = Math.max(prevStars, st); PROG.best[key] = Math.max(prevBest, LV.score); saveProg(); }
  const xplus = !wiped && DIFF === 'expert' && st === 3 && unlockXplus(tn);   // three stars on Expert opens Expert+ for this song
  const lines = ['', 'Got through it.', 'Hardly a scratch.', 'Nothing gets past you.'];
  $('resEyebrow').textContent = `Track ${tn} · ${DIFFS[DIFF].name.toLowerCase()}` + (wiped ? ' · wiped out' : LV.score > prevBest ? ' · new high score' : '');
  $('resTitle').textContent = LV.track.title;
  $('resStars').innerHTML = [0, 1, 2].map(i => i < st ? `<b class="pop" style="animation-delay:${0.35 + i*0.22}s">★</b>` : '<i>★</i>').join(''); $('resStars').setAttribute('aria-label', st + ' out of 3 stars');
  $('resLine').textContent = wiped ? 'Three wipeouts. Paddle back out?' : st < 3 ? `${lines[st]} ${st === 1 ? '85%' : '95%'} accuracy for the next star.` : lines[3] + (xplus ? ' Expert+ unlocked.' : '');
  $('resScore').textContent = LV.score.toLocaleString(); $('resAcc').textContent = (acc*100).toFixed(1) + '%';
  $('resCombo').textContent = LV.maxCombo; $('resPerf').textContent = c.perfect + '/' + n;
  $('resTiming').textContent = ''; $('fixBtn').hidden = true;
  coach(acc, wiped, tn);
  $('intoBtn').hidden = false; $('intoBtn').className = wiped ? 'ghost' : 'btn'; $('intoBtn').textContent = 'Back to the record'; $('intoBtn').onclick = () => { $('results').hidden = true; enterMap(false); };
  $('againBtn').className = wiped ? 'btn' : 'ghost'; $('againBtn').textContent = wiped ? 'Try again' : 'Play again'; $('againBtn').onclick = () => { $('results').hidden = true; startLevel(tn); };
  $('menuBtn').hidden = true;
  $('resBilling').textContent = `Fan-made and unofficial · music “${LV.track.title}” by Jon Vinyl`;
  $('results').hidden = false; mode = 'results'; startAmbience();
}

/* ---------- coaching on the results card: one thing that went well, one thing to try, and a level nudge ---------- */
const mmss = t => `${Math.floor(t/60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const DIRNAME = ['above', 'the upper right', 'the right', 'the lower right', 'below', 'the lower left', 'the left', 'the upper left'];
const LEVELS = ['easy', 'normal', 'hard', 'expert', 'expertplus'];
function stretches(notes){   // accuracy over ~20 s stretches of the song: the best and the toughest
  const done = notes.filter(n => n.judged); if (done.length < 16) return null;
  const t0 = done[0].t, t1 = done[done.length - 1].t, k = Math.max(2, Math.round((t1 - t0)/20)), w = (t1 - t0)/k, out = [];
  for (let i = 0; i < k; i++) { const a = t0 + i*w, b = a + w, ns = done.filter(n => n.t >= a && (i === k - 1 ? n.t <= b : n.t < b)); if (ns.length < 5) continue;
    out.push({ a, b, acc: ns.reduce((s, n) => s + (n.k === 'perfect' ? 1 : n.k === 'good' ? 0.7 : 0), 0)/ns.length }); }
  if (out.length < 2) return null;
  out.sort((x, y) => y.acc - x.acc); return { best: out[0], worst: out[out.length - 1] };
}
function coachLines(acc){   // [strength, tip]: worded for the song that was played, from what actually happened
  const N = LV.notes.filter(n => n.judged), miss = N.filter(n => n.k === 'miss'), good = N.filter(n => n.k === 'good');
  let up = '', tip = '';
  const st = stretches(LV.notes);
  if (LV.mode === 'surf') {
    const ground = N.filter(n => !n.air), launches = N.filter(n => n.kind === 3), airGems = N.filter(n => n.air && n.kind !== 3);
    const lost = launches.filter(n => !n.hit).length, off = ground.filter(n => n.k !== 'perfect' && n.err != null);
    const bias = off.length >= 4 ? off.reduce((s, n) => s + n.err, 0)/off.length : 0;
    const kinds = [0, 1, 2].map(k => ground.filter(n => n.kind === k && !n.hit).length), worst = kinds.indexOf(Math.max(...kinds));
    const wipes = SURF.lives - LV.lives;
    if (wipes >= 2) tip = 'The board caught on landing. Let go of a flip a little sooner, and it settles flat by itself.';
    else if (launches.length >= 3 && lost/launches.length > 0.34) tip = `${lost} of ${launches.length} take-offs missed. Start climbing early, so you reach the lip right on the gold star.`;
    else if (Math.abs(bias) > 0.06) tip = bias > 0 ? 'You ride a little high. Let go a touch sooner to drop onto the gems.' : 'You ride a little low. Hold a touch longer to reach the gems.';
    else if (kinds[worst] >= 3) tip = ['The teal kick gems down low got away most. Let go early and sit in the trough.', 'The gold snare gems up high got away most. Hold a beat earlier to reach them.', 'The pink hi-hat gems in the middle got away most. Tap and release to hover halfway.'][worst];
    else if (!LV.flips && !wipes) tip = 'In the air, press and hold to backflip. Let go when he comes round upright.';
    if (launches.length && !lost) up = `Every take-off right on the beat${LV.flips ? `, and ${LV.flips} backflip${LV.flips > 1 ? 's' : ''} landed` : ''}.`;
    else if (LV.flips >= 2 && !wipes) up = `${LV.flips} backflips, every one landed.`;
    else if (airGems.length >= 6 && airGems.filter(n => n.hit).length/airGems.length > 0.9) up = 'Nearly every gem in the air.';
  } else {
    const hm = miss.filter(n => !n.kind).length, bm = miss.filter(n => n.kind).length, hearts = N.filter(n => !n.kind).length, breaks = N.filter(n => n.kind).length;
    const byDir = Array(8).fill(0); miss.forEach(n => byDir[n.dir]++); const wd = byDir.indexOf(Math.max(...byDir));
    const late = good.filter(n => n.late >= 0.03).length, wrongWay = miss.filter(n => n.off > Math.PI/2).length;
    if (miss.length >= 4 && byDir[wd] >= miss.length*0.4) tip = `Most of what got through came from ${DIRNAME[wd]}. Glance that way when the guitar moves.`;
    else if (bm >= 3 && bm/Math.max(1, breaks) > 1.5*hm/Math.max(1, hearts)) tip = 'Heartbreaks, the lead guitar notes, got past you most. Follow the melody: it climbs clockwise.';
    else if (hm >= 3 && hm/Math.max(1, hearts) > 1.5*bm/Math.max(1, breaks)) tip = 'Hearts, the rhythm-guitar strums, got past you most. They come in runs that spin around him, so keep turning.';
    else if (wrongWay >= 3) tip = `${wrongWay} hearts hit while the shield faced the other way. Turn as soon as you see one leave the edge.`;
    else if (good.length >= 6 && late/good.length > 0.5) tip = 'You often meet them at the last moment. Turn a beat earlier for more perfects.';
    if (!bm && breaks >= 5) up = 'Not one heartbreak got past you.';
    else if (!hm && hearts >= 5) up = 'Not one heart got past you.';
  }
  if (!miss.length && N.length >= 10) up = `A full combo: all ${N.length}, not one missed.`;
  if (!up && st && st.best.acc >= 0.85) up = `Your best stretch: ${mmss(st.best.a)} to ${mmss(st.best.b)} (${Math.round(st.best.acc*100)}%).`;
  if (!tip && st && st.best.acc - st.worst.acc > 0.12) tip = `The toughest stretch was ${mmss(st.worst.a)} to ${mmss(st.worst.b)}. That's the part to practise.`;
  if (!tip && acc < 0.95) tip = 'Aim for the centre of each one: perfects count fully, nice ones 70%.';
  return [up, tip];
}
function coach(acc, wiped, tn){
  const [up, tip] = coachLines(acc), box = $('resTips');
  box.innerHTML = ''; [[up, 'up'], [tip, 'tip']].forEach(([txt, cls]) => { if (!txt) return; const p = document.createElement('p'); p.className = cls; p.textContent = txt; box.appendChild(p); });
  box.hidden = !box.childElementCount;
  // a level nudge: up after a near-perfect run, down after a hard one (it changes Settings and plays again)
  const i = LEVELS.indexOf(DIFF); let to = null;
  if (!wiped && acc >= 0.95 && i < LEVELS.length - 1 && (LEVELS[i + 1] !== 'expertplus' || PROG.xplus[tn])) to = LEVELS[i + 1];
  else if (acc < 0.55 && i > 0) to = LEVELS[i - 1];
  const b = $('tryBtn'); b.hidden = !to;
  if (to) { b.textContent = `${LEVELS.indexOf(to) > i ? 'Ready for' : 'Try'} ${DIFFS[to].name}?`; b.onclick = () => { setDiff(to); $('results').hidden = true; startLevel(tn); }; }
}

/* ---------- a song in layers: [drums, band], started together, through their own gains and filters ---------- */
function layerMix(names, at){
  const f = (type, hz) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = hz; b.Q.value = 0.7; return b; };
  const dG = ac.createGain(), bG = ac.createGain(), bHP = f('highpass', 10), lp = f('lowpass', 20000);
  dG.connect(lp); bHP.connect(bG); bG.connect(lp); lp.connect(nodes.songplay.lp);
  names.forEach((n, i) => { const s = ac.createBufferSource(); s.buffer = SONGBUF[n]; s.connect(i ? bHP : dG); s.start(at); srcs.push(s); });
  return { dG, bG, bHP, lp };
}
