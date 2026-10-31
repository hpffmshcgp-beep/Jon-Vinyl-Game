/* ---------- album levels: Deflect ----------
   Jon is down in a groove of the record. A stereo groove has two walls (one carries the left channel, one the right):
   here the left wall is love (hearts) and the right wall is heartbreak. Whatever falls down the wall he is on lands on
   the beat, and he dodges it by jumping across to the other wall right as it lands — never settling on either side.
   Hearts and heartbreaks take turns, so he keeps going back and forth: undecided, deflecting both.
   Controls: tap / click the side to jump to, or the left-hand keys (A S D F ←) and right-hand keys (J K L ; →); Space
   jumps across. Jump within 55 ms of the landing for PERFECT, within the window for GOOD; jump too early and it's a miss. */
const SONGS = __SONGS__;                       // charts for the album songs that have been added (tools/make_deflect_chart.py)
const DEF = { perfect: 0.055, early: 0.13, late: 0.08, preroll: 2.6, jump: 0.15 };
let LV = null;
const lerp = (a, b, k) => a + (b - a)*k;
const SONGBUF = {};                           // decoded album songs, kept apart from the prologue's buffers
function levelGeo(){
  const L = layout(), cx = W/2, sw = Math.min(W, L.fh*(L.portrait ? 1.05 : 1.5)), wall = sw*(L.portrait ? 0.13 : 0.1);   // the groove: two walls and the gap between
  const inL = cx - sw/2 + wall, inR = cx + sw/2 - wall, jh = Math.min(L.fh*(L.portrait ? 0.2 : 0.25), (inR - inL)*0.3);
  const feet = L.top + L.fh*0.86, xs = [inL + jh*0.3, inR - jh*0.3];
  return { L, cx, sw, wall, inL, inR, jh, feet, xs, land: feet - jh*0.62, spawn: L.top - jh*0.4, ns: clamp(jh*0.3, 15, 34) };
}
async function startLevel(track){
  const t = ALBUM.tracks.find(x => x.n === track), chart = t && SONGS[t.song]; if (!chart) return;
  $('mapLoading').hidden = false; $('mapLoading').textContent = 'Dropping the needle…';
  if (!ac) ac = makeCtx(); if (ac.state === 'suspended') await ac.resume();
  if (!nodes) buildGraph();
  try { if (!SONGBUF[t.song]) SONGBUF[t.song] = await new Promise((res, rej) => { fetchProg(t.song).then(ab => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }, rej); }); }
  catch(e) { $('mapLoading').textContent = 'This browser could not play the song.'; return; }
  $('mapLoading').hidden = true; leaveMap(); stopAmbience(); stopSources();
  // hearts fall on the left wall, heartbreaks on the right, taking turns (he starts on the left, so a heart comes first)
  const notes = chart.levels[DIFF].map(([tt, side, kind], i) => ({ t: tt, side: i % 2, kind, judged: false, dodged: false, k: '', jt: 0, burst: false }));
  const endAt = notes.length ? notes[notes.length - 1].t + 2.4 : chart.duration;   // the song fades out a little after the last one
  LV = S = { kind: 'level', track: t, chart, notes, endAt, approach: chart.approach[DIFF], startAt: ac.currentTime + DEF.preroll, running: true, paused: false,
    score: 0, combo: 0, maxCombo: 0, counts: { perfect: 0, good: 0, miss: 0 }, side: 0, jumpT: -9, jumpFrom: 0, knocked: false, flash: -9, shake: -9,
    popups: [], parts: [], comboT: -9, next: 0, lastNow: 0, ended: false };
  setLayer(nodes.songplay, 'open');
  const src = ac.createBufferSource(); src.buffer = SONGBUF[t.song]; src.connect(nodes.songplay.lp); src.start(LV.startAt); srcs.push(src);
  mode = 'level'; cv.hidden = false; grabKeys();
  ['title', 'results', 'pause'].forEach(id => $(id).hidden = true);
}
const levelTime = (p = performance.now()) => heardCtx(p) - LV.startAt - userDelay/1000;
const nextOn = side => LV.notes.find((n, i) => i >= LV.next && !n.judged && n.side === side);
function jumpTo(side, t, knocked){   // start the leap across (from wherever he is, even mid-air)
  const G = levelGeo(), k = clamp((t - LV.jumpT)/DEF.jump, 0, 1);
  LV.jumpFrom = LV.jumpT > -9 && k < 1 ? lerp(G.xs[1 - LV.side], G.xs[LV.side], easeIO(k)) : G.xs[LV.side];
  LV.side = side; LV.jumpT = t; LV.knocked = !!knocked;
}
// tap a side (0 left, 1 right; 'x' = across): leaving a wall is judged against whatever is falling down it
function levelPress(side, p){
  if (!LV || !LV.running || LV.ended) return;
  const t = levelTime(p); if (side === 'x') side = 1 - LV.side;
  if (side === LV.side) return;
  const n = nextOn(LV.side);
  if (!n || n.t - t > LV.approach) {   // nothing falling on this wall yet: a free jump, and what comes next follows him across
    LV.notes.forEach((m, i) => { if (i >= LV.next && !m.judged) m.side = 1 - m.side; }); jumpTo(side, t); return;
  }
  jumpTo(side, t);
  const d = t - n.t;
  if (d > DEF.late) return;                                   // already hit him (judged by the landing)
  if (d < -DEF.early) { judge(n, t, 'miss', 'EARLY'); return; }
  judge(n, t, Math.abs(d) <= DEF.perfect ? 'perfect' : 'good');
}
function judge(n, t, k, text){
  const G = levelGeo();
  n.judged = true; n.k = k; n.jt = t; LV.counts[k]++;
  if (k === 'miss') { if (LV.combo >= 5) scratch(); LV.combo = 0; LV.popups.push({ t, side: n.side, text: text || 'MISS', k }); return; }
  n.dodged = true; LV.combo++; LV.maxCombo = Math.max(LV.maxCombo, LV.combo); LV.comboT = t;
  LV.score += (k === 'perfect' ? 300 : 150)*Math.min(4, 1 + Math.floor(LV.combo/10)); LV.flash = t;
  LV.popups.push({ t, side: n.side, text: k.toUpperCase(), k });
}
function levelJudge(t){   // anything that lands while he's still on its wall hits him and knocks him across
  const G = levelGeo();
  for (let i = LV.next; i < LV.notes.length; i++) {
    const n = LV.notes[i]; if (n.t > t) break;
    if (n.judged) { if (i === LV.next) LV.next++; continue; }
    if (t - n.t > DEF.late) {
      judge(n, t, 'miss'); LV.shake = t;
      burst(t, G.xs[n.side], G.land, n.side ? 'break' : 'heart', 10, -Math.PI/2, true);
      if (LV.side === n.side) jumpTo(1 - n.side, t, true);
    }
  }
  for (const n of LV.notes.slice(Math.max(0, LV.next - 8), LV.next + 4))   // a dodged one carries on down and smashes on the empty ledge
    if (n.dodged && !n.burst && t >= n.t + 0.07) { n.burst = true; burst(t, G.xs[n.side], G.feet - G.ns*0.3, n.side ? 'break' : 'heart', n.k === 'perfect' ? 16 : 10, -Math.PI/2); }
}
// sparks when something smashes on the ledge (gold for hearts, violet shards for heartbreaks); a dull puff when it hits him
function burst(t, x, y, kind, count, dir, onJon){
  for (let i = 0; i < count; i++) LV.parts.push({ t0: t, x, y, a: dir + (Math.random() - 0.5)*(onJon ? 3.4 : 2.2), sp: 0.5 + Math.random()*1.4,
    life: 0.35 + Math.random()*0.35, sz: 0.5 + Math.random(), kind: onJon ? 'miss' : kind, spin: (Math.random() - 0.5)*12 });
}
function drawParts(t, jh){
  LV.parts = LV.parts.filter(p => t - p.t0 < p.life && t >= p.t0);
  for (const p of LV.parts) {
    const e = t - p.t0, k = e/p.life, d = p.sp*jh*0.9*(1 - Math.pow(1 - k, 2.2)), x = p.x + Math.cos(p.a)*d, y = p.y + Math.sin(p.a)*d + e*e*jh*2.2;   // out, then falling
    g.globalAlpha = (1 - k)*(p.kind === 'miss' ? 0.7 : 1);
    if (p.kind === 'break') { g.save(); g.translate(x, y); g.rotate(p.spin*e); g.fillStyle = k < 0.3 ? '#e9c6ff' : '#9a5fc0'; const s = jh*0.035*p.sz; g.beginPath(); g.moveTo(0, -s); g.lineTo(s*0.7, s*0.6); g.lineTo(-s*0.6, s*0.4); g.closePath(); g.fill(); g.restore(); }
    else { const s = jh*0.022*p.sz*(1 - k*0.5); g.fillStyle = p.kind === 'miss' ? '#a89a8c' : k < 0.25 ? '#fff6dc' : '#ffb38a';
      g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  }
  g.globalAlpha = 1;
}
function heartbreak(x, y, s, rot, split = 0){   // a heart split by a jagged crack; when it smashes the halves come apart
  g.save(); g.translate(x, y); g.rotate(rot);
  [-1, 1].forEach(side => { g.save(); g.translate(side*s*split, 0); g.rotate(side*split*0.9); g.beginPath(); g.rect(side < 0 ? -s*1.3 : 0, -s*1.4, s*1.3, s*2.8); g.clip(); g.translate(side*s*0.06, 0); g.rotate(side*0.08);
    heart(0, 0, s*1.9, '#4a1a3a', '#c58ae6'); g.restore(); });
  g.strokeStyle = '#120812'; g.lineWidth = Math.max(1.5, s*0.08); g.lineJoin = 'miter';
  if (!split) { g.beginPath(); g.moveTo(0, -s*0.62); g.lineTo(s*0.12, -s*0.32); g.lineTo(-s*0.1, -s*0.05); g.lineTo(s*0.1, s*0.22); g.lineTo(0, s*0.62); g.stroke(); }
  g.restore();
}
const swingPop = k => k >= 1 ? 1 : 0.7 + 0.3*k + Math.sin(Math.min(1, k)*Math.PI)*0.35;   // grow past full size, then settle
function grooveWall(G, side, t, pulse, next){   // one wall of the groove: glossy black vinyl, tinted by what it carries
  const { L, cx, sw, wall } = G, x0 = side ? G.inR : cx - sw/2, x1 = side ? cx + sw/2 : G.inL, top = L.top, bot = L.bot;
  const gr = g.createLinearGradient(side ? x1 : x0, 0, side ? x0 : x1, 0);
  gr.addColorStop(0, '#060408'); gr.addColorStop(0.75, side ? '#1c0f26' : '#2a0f16'); gr.addColorStop(1, side ? '#4a2a66' : '#6e2232');
  g.fillStyle = gr; g.fillRect(x0, top, x1 - x0, bot - top);
  const sp = G.jh*0.9, off = (t*sp*1.6) % sp;   // ridges sliding up: he's sinking deeper into the record
  g.strokeStyle = side ? 'rgba(197,138,230,.10)' : 'rgba(240,140,140,.10)'; g.lineWidth = 1;
  for (let y = top - sp + (sp - off); y < bot; y += sp/3) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + (side ? -1 : 1)*wall*0.08); g.stroke(); }
  for (let y = top - sp + (sp - off), i = 0; y < bot; y += sp, i++) {   // little hearts / heartbreaks pressed into the wall
    const ix = (x0 + x1)/2, a = 0.12 + pulse*0.08; g.globalAlpha = a;
    if (side) heartbreak(ix, y + sp*0.5, wall*0.16, 0); else heart(ix, y + sp*0.5, wall*0.3, '#c0505a', null);
    g.globalAlpha = 1;
  }
  const edge = side ? x0 : x1, glow = 0.35 + pulse*0.35 + (next ? 0.4 : 0);   // the lit edge where the wall meets the gap
  g.strokeStyle = side ? `rgba(214,170,255,${glow})` : `rgba(255,170,160,${glow})`; g.lineWidth = 2; g.beginPath(); g.moveTo(edge, top); g.lineTo(edge, bot); g.stroke();
  // the ledge he stands on
  const lx = side ? G.inR - G.jh*0.62 : G.inL, lw = G.jh*0.62;
  g.fillStyle = '#c99b4a'; g.fillRect(lx, G.feet, lw, Math.max(4, G.jh*0.05)); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(lx, G.feet + Math.max(4, G.jh*0.05), lw, 3);
}
function levelFrame(now){
  const G = levelGeo(), { L, cx, jh } = G, t = LV.running ? levelTime() : LV.lastT || 0; LV.lastT = t;
  LV.lastNow = now;
  if (LV.running && !LV.paused) levelJudge(t);
  const beat = 60/91.25, pulse = Math.max(0, 1 - (((t/beat) % 1) + 1) % 1*2.5);
  // deep in the groove: the amber void of the cover far below, the record's ridges rushing up
  g.fillStyle = '#050307'; g.fillRect(0, 0, W, H);
  const shake = Math.max(0, 1 - (t - LV.shake)/0.25), sx = shake ? (Math.random() - 0.5)*10*shake : 0, sy = shake ? (Math.random() - 0.5)*10*shake : 0;
  g.save(); g.translate(sx, sy);
  const bg = g.createLinearGradient(0, L.top, 0, L.bot); bg.addColorStop(0, '#1a0c14'); bg.addColorStop(0.6, '#5a2c22'); bg.addColorStop(1, `rgb(${200 + pulse*30},${120 + pulse*20},70)`);
  g.fillStyle = bg; g.fillRect(G.inL, L.top, G.inR - G.inL, L.fh);
  for (let i = 0; i < 9; i++) { const k = ((t*0.35 + i/9) % 1), y = L.bot - k*k*L.fh; g.strokeStyle = `rgba(255,214,150,${0.05 + 0.08*k})`; g.lineWidth = 1; g.beginPath(); g.moveTo(G.inL, y); g.lineTo(G.inR, y); g.stroke(); }
  const nxt = LV.notes.find((n, i) => i >= LV.next && !n.judged);
  [0, 1].forEach(sd => grooveWall(G, sd, t, pulse, nxt && nxt.side === sd && nxt.t - t < 0.6));
  if (G.sw < W) { g.fillStyle = 'rgba(5,3,7,.85)'; g.fillRect(0, L.top, cx - G.sw/2, L.fh); g.fillRect(cx + G.sw/2, L.top, W - cx - G.sw/2, L.fh); }
  // where the next one lands: a soft glow on its ledge
  if (nxt) { const k = 1 - clamp((nxt.t - t)/LV.approach, 0, 1), x = G.xs[nxt.side], gl = g.createRadialGradient(x, G.land, 0, x, G.land, jh*0.7);
    gl.addColorStop(0, nxt.side ? `rgba(197,138,230,${0.3*k})` : `rgba(240,140,140,${0.3*k})`); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(x - jh, G.land - jh, jh*2, jh*2); }
  // Jon: on his ledge, facing across; mid-leap he arcs over the gap
  const jk = clamp((t - LV.jumpT)/DEF.jump, 0, 1), air = jk < 1;
  const jx = air ? lerp(LV.jumpFrom, G.xs[LV.side], easeIO(jk)) : G.xs[LV.side], jy = G.feet - (air ? Math.sin(jk*Math.PI)*jh*0.32 : 0);
  drawJon(jx, jy, jh, { running: false, amp: 0, phase: 0, idle: now*0.8, jumpK: air ? jk : -1, kick: false, stumble: Math.max(0, 1 - (t - LV.shake)/0.35), reach: 0,
    dir: air ? (G.xs[LV.side] > LV.jumpFrom ? 1 : -1) : (LV.side ? -1 : 1), shades: true, glow: 0, holdHand: false, lookUp: !air && !!nxt && nxt.t - t < 0.5, smile: LV.combo >= 10 });
  // what's falling: hearts down the left wall, heartbreaks down the right
  for (let i = Math.max(0, LV.next - 8); i < LV.notes.length; i++) {
    const n = LV.notes[i]; if (n.t - t > LV.approach) break;
    const x = G.xs[n.side]; let y, a = 1, rot = Math.sin(now*3 + i)*0.15, split = 0, sc = 1;
    if (!n.judged || n.dodged) { if (n.burst) continue; y = G.land - (n.t - t)/LV.approach*(G.land - G.spawn); if (t > n.t) y = G.land + (t - n.t)*(G.land - G.spawn)/LV.approach*1.6; }
    else { const e = t - n.jt; if (e > 0.35) continue; y = G.land; a = 1 - e/0.35; sc = 1 + e*1.2; split = n.side ? e*2.5 : 0; }
    g.globalAlpha = a;
    if (n.side) heartbreak(x, y, G.ns*sc, rot, split); else { g.save(); g.translate(x, y); g.rotate(rot); heart(0, 0, G.ns*1.9*sc, '#e8746a', PAL.gold); g.restore(); }
    g.globalAlpha = 1;
  }
  drawParts(t, jh);
  LV.popups = LV.popups.filter(p => t - p.t < .55);
  LV.popups.forEach(p => { const k = (t - p.t)/.55, pop = swingPop(k*0.55/0.22); g.globalAlpha = 1 - k*k; g.textAlign = 'center';
    g.fillStyle = p.k === 'miss' ? '#9a8f7a' : p.k === 'perfect' ? PAL.gold : PAL.cream; g.font = `400 ${clamp(jh*0.16, 14, 22)*pop}px ${FONT.deco}`;
    g.fillText(p.text, G.xs[p.side] + (p.side ? -1 : 1)*jh*0.15, G.land - jh*0.75 - k*14); g.globalAlpha = 1; });
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
  // the title card while the needle drops, with what to do
  if (t < 3.2) { const a = clamp(Math.min((t + DEF.preroll)*3, (3.2 - t)*2), 0, 1); g.globalAlpha = a; g.textAlign = 'center';
    g.fillStyle = PAL.cream; g.font = `italic 500 ${clamp(W*0.04, 15, 22)}px ${FONT.serif}`; g.fillText(`Track ${LV.track.n}`, W/2, L.top + L.fh*0.16);
    g.fillStyle = PAL.gold; g.font = `400 ${clamp(W*0.09, 34, 64)}px ${FONT.deco}`; g.fillText(LV.track.title, W/2, L.top + L.fh*0.16 + clamp(W*0.08, 34, 58));
    g.fillStyle = PAL.cream; g.font = `700 ${clamp(W*0.026, 10, 13)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'TAP THE OTHER SIDE TO JUMP' : '←  →  JUMP ACROSS', W/2, L.top + L.fh*0.16 + clamp(W*0.08, 34, 58) + 34);
    g.fillStyle = PAL.gold; g.fillText('DODGE IT RIGHT AS IT LANDS', W/2, L.top + L.fh*0.16 + clamp(W*0.08, 34, 58) + 54);
    g.globalAlpha = 1; }
  if (LV.running && !LV.fading && t > LV.endAt) { LV.fading = true; nodes.songplay.gn.gain.setTargetAtTime(0, ac.currentTime, 0.35); }
  if (LV.fading) { g.fillStyle = `rgba(3,2,5,${clamp((t - LV.endAt)/1.4, 0, 0.6)})`; g.fillRect(0, 0, W, H); }
  if (LV.running && !LV.ended && t > LV.endAt + 1.4) levelEnd();
}
function levelEnd(){
  LV.ended = true; LV.running = false; stopSources();
  const n = LV.notes.length, c = LV.counts, acc = n ? (c.perfect + c.good*0.7)/n : 0, st = starsFor(acc, true), tn = LV.track.n;
  const prevStars = PROG.stars[tn] || 0, key = `${tn}-${DIFF}`, prevBest = PROG.best[key] || 0;
  PROG.stars[tn] = Math.max(prevStars, st); PROG.best[key] = Math.max(prevBest, LV.score); saveProg();
  const lines = ['', 'Got through it.', 'Hardly a scratch.', 'Nothing gets past you.'];
  $('resEyebrow').textContent = `Track ${tn} · ${DIFFS[DIFF].name.toLowerCase()}` + (LV.score > prevBest ? ' · new high score' : '');
  $('resTitle').textContent = LV.track.title;
  $('resStars').innerHTML = [0, 1, 2].map(i => i < st ? `<b class="pop" style="animation-delay:${0.35 + i*0.22}s">★</b>` : '<i>★</i>').join(''); $('resStars').setAttribute('aria-label', st + ' out of 3 stars');
  $('resLine').textContent = st < 3 ? `${lines[st]} ${st === 1 ? '85%' : '95%'} accuracy for the next star.` : lines[3];
  $('resScore').textContent = LV.score.toLocaleString(); $('resAcc').textContent = (acc*100).toFixed(1) + '%';
  $('resCombo').textContent = LV.maxCombo; $('resPerf').textContent = c.perfect + '/' + n;
  $('resTiming').textContent = ''; $('fixBtn').hidden = true;
  $('intoBtn').hidden = false; $('intoBtn').textContent = 'Back to the record'; $('intoBtn').onclick = () => { $('results').hidden = true; enterMap(false); };
  $('againBtn').className = 'ghost'; $('againBtn').textContent = 'Play again'; $('againBtn').onclick = () => { $('results').hidden = true; startLevel(tn); };
  $('menuBtn').hidden = true;
  $('resBilling').textContent = `Fan-made and unofficial · music “${LV.track.title}” by Jon Vinyl`;
  $('results').hidden = false; mode = 'results'; startAmbience();
}
