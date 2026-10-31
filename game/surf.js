/* ---------- album levels: Void (surf) ----------
   Jon rides a long wave while the sun goes down and the moon comes up over the song. Hold anywhere (or any key) to
   climb the face, let go to carve down. Gems sit on the beat: kick = low in the trough, snare = high at the lip, hi-hat =
   in between. You collect one by being at its height as it reaches him (closer = PERFECT). At the song's big moments
   the wave throws him into the air for four beats: tap on each star cue to spin. Scored like the other album songs. */
const lerp = (a, b, k) => a + (b - a)*k;
const SURF = { low: 0.12, high: 0.88, perfect: 0.1, good: 0.21, spinWin: 0.11, spinPerfect: 0.05, ease: 0.05, preroll: 2.0 };
function surfGeo(){
  const L = layout(), port = L.portrait;
  const horizon = L.top + L.fh*(port ? 0.3 : 0.34), lipY = L.top + L.fh*(port ? 0.5 : 0.5), troughY = L.top + L.fh*(port ? 0.84 : 0.88);
  const jh = Math.min(L.fh*(port ? 0.13 : 0.19), W*0.2), jonX = W*(port ? 0.26 : 0.27);
  const yOf = h => troughY - h*(troughY - lipY);   // where the board sits for a height on the face (0 trough, 1 lip)
  return { L, horizon, lipY, troughY, jh, jonX, yOf, gem: clamp(jh*0.17, 9, 18), speed: (W - jonX + 60)/LV.approach };
}
function surfInit(t, chart){
  const lv = chart.levels[DIFF];
  const gems = lv.gems.map(([tt, h, kind]) => ({ t: tt, h, kind, judged: false, hit: false, k: '', jt: 0 }));
  const spins = lv.spins.map(tt => ({ t: tt, spin: true, judged: false, hit: false, k: '', jt: 0 }));
  const notes = [...gems, ...spins].sort((a, b) => a.t - b.t);
  const last = notes.length ? notes[notes.length - 1].t : chart.duration;
  return { mode: 'surf', notes, gems, spins, airs: chart.airs, rise: chart.rise, endAt: Math.min(chart.duration - 0.6, last + 2.0),
    h: 0.3, vel: 0, hold: new Set(), spinAt: -9, spinDir: 1, spray: [], sparks: [], gNext: 0, sNext: 0, hint: -1 };
}
const surfAir = t => LV.airs.find(([a, b]) => t >= a && t < b);
function surfDown(e){   // a finger or a key goes down: climb; in the air it's a spin
  if (!LV || !LV.running || LV.ended) return;
  const id = e.pointerId != null ? 'p' + e.pointerId : e.code; if (LV.hold.has(id)) return; LV.hold.add(id);
  const t = levelTime(evTime(e));
  if (!surfAir(t + 0.12) && !surfAir(t - 0.12)) return;
  let best = null;
  for (const s of LV.spins) { if (s.judged) continue; const d = Math.abs(t - s.t); if (d <= SURF.spinWin && (!best || d < Math.abs(t - best.t))) best = s; }
  if (!best) return;
  const k = Math.abs(t - best.t) <= SURF.spinPerfect ? 'perfect' : 'good';
  surfScore(best, t, k); LV.spinAt = t; LV.spinDir = -LV.spinDir;
}
function surfUp(e){ if (LV && LV.hold) LV.hold.delete(e.pointerId != null ? 'p' + e.pointerId : e.code); }
function surfScore(n, t, k){
  n.judged = true; n.hit = k !== 'miss'; n.k = k; n.jt = t; LV.counts[k]++;
  if (k === 'miss') { if (LV.combo >= 5) scratch(); LV.combo = 0; LV.popups.push({ t, text: n.spin ? 'MISS' : '', k, h: n.h ?? 1.3 }); return; }
  LV.combo++; LV.maxCombo = Math.max(LV.maxCombo, LV.combo); LV.comboT = t;
  LV.score += (k === 'perfect' ? 300 : 150)*Math.min(4, 1 + Math.floor(LV.combo/10)); LV.flash = t;
  LV.popups.push({ t, text: n.spin ? (k === 'perfect' ? 'PERFECT SPIN' : 'SPIN') : k === 'perfect' ? 'PERFECT' : 'NICE', k, h: n.h ?? 1.3 });
}
function surfStep(t, dt){
  // the ride: holding climbs, letting go carves down; a short ease keeps it smooth
  const reach = (SURF.high - SURF.low)/LV.rise, want = LV.hold.size > 0 ? reach : -reach;
  LV.vel += (want - LV.vel)*(1 - Math.exp(-dt/SURF.ease));
  LV.h = clamp(LV.h + LV.vel*dt, SURF.low, SURF.high);
  if ((LV.h <= SURF.low && LV.vel < 0) || (LV.h >= SURF.high && LV.vel > 0)) LV.vel = 0;
  const air = surfAir(t), next = LV.airs.find(([a]) => a > t && a - t < 0.55);
  if (next) { const k = 1 - (next[0] - t)/0.55; LV.h = lerp(LV.h, SURF.high, k*k); }   // the wave lifts him to the lip
  if (air) { LV.h = SURF.high; LV.vel = 0; }
  // gems: judged as they reach him, by how close his height is
  for (const n of LV.gems) { if (n.judged) continue; if (n.t > t) break;
    const d = Math.abs(LV.h - n.h); surfScore(n, t, d <= SURF.perfect ? 'perfect' : d <= SURF.good ? 'good' : 'miss');
    if (n.hit) surfBurst(t, n.h, n.kind, n.k === 'perfect' ? 14 : 9); }
  for (const n of LV.spins) { if (n.judged) continue; if (n.t > t - SURF.spinWin) break; surfScore(n, t, 'miss'); }
}
function surfBurst(t, h, kind, count){
  for (let i = 0; i < count; i++) LV.sparks.push({ t0: t, h, kind, a: Math.random()*Math.PI*2, sp: 0.4 + Math.random(), life: 0.4 + Math.random()*0.35, sz: 0.5 + Math.random() });
}
const GEMCOL = [['#7fe7dc', '#1f7f86'], ['#ffe2a0', '#c98a2a'], ['#ffc4d8', '#b9587e']];   // kick (low), snare (high), hi-hat (mid)
function gemShape(x, y, s, kind, rot, alpha){
  const [hi, lo] = GEMCOL[kind];
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, s*2.4); gl.addColorStop(0, hi + '66'); gl.addColorStop(1, hi + '00'); g.fillStyle = gl; g.fillRect(-s*2.4, -s*2.4, s*4.8, s*4.8);
  g.beginPath(); g.moveTo(0, -s*1.25); g.lineTo(s*0.95, -s*0.2); g.lineTo(0, s*1.25); g.lineTo(-s*0.95, -s*0.2); g.closePath();
  const fg = g.createLinearGradient(-s, -s, s, s); fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.35, hi); fg.addColorStop(1, lo); g.fillStyle = fg; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-s*0.95, -s*0.2); g.lineTo(s*0.95, -s*0.2); g.moveTo(0, -s*1.25); g.lineTo(-s*0.3, -s*0.2); g.lineTo(0, s*1.25); g.stroke();
  g.restore();
}
function surfSky(G, p, now){   // sunset into moonrise over the song
  const { L, horizon } = G, mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v)*k)), rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const stops = [[[58, 34, 92], [236, 120, 88], [255, 196, 120]], [[32, 22, 70], [140, 70, 110], [230, 130, 110]], [[10, 12, 34], [26, 30, 70], [52, 58, 110]]];
  const k = clamp(p*2, 0, 2), i = Math.min(1, Math.floor(k)), f = k - i, c = [0, 1, 2].map(j => mix(stops[i][j], stops[i + 1][j], f));
  const sky = g.createLinearGradient(0, L.top, 0, horizon); sky.addColorStop(0, rgb(c[0])); sky.addColorStop(0.65, rgb(c[1])); sky.addColorStop(1, rgb(c[2]));
  g.fillStyle = sky; g.fillRect(0, L.top, W, horizon - L.top + 1);
  const night = clamp((p - 0.4)/0.45, 0, 1);
  if (night > 0) { g.fillStyle = `rgba(255,248,230,${0.8*night})`; for (let s = 0; s < 70; s++) { const x = (s*137.5) % W, y = L.top + ((s*71.3) % (horizon - L.top)); g.globalAlpha = night*(0.4 + 0.6*Math.abs(Math.sin(now*0.8 + s))); g.fillRect(x, y, 1.6, 1.6); } g.globalAlpha = 1; }
  // the sun sinks ahead of him; the moon comes up behind
  const sunY = horizon - (horizon - L.top)*0.55*(1 - clamp(p/0.55, 0, 1)) + clamp((p - 0.5)/0.1, 0, 1)*30, sr = Math.min(W, L.fh)*0.07;
  if (p < 0.62) { g.save(); g.beginPath(); g.rect(0, L.top, W, horizon - L.top); g.clip();
    const sg = g.createRadialGradient(W*0.74, sunY, 0, W*0.74, sunY, sr*4); sg.addColorStop(0, 'rgba(255,220,150,.55)'); sg.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = sg; g.fillRect(0, L.top, W, horizon - L.top);
    g.fillStyle = '#ffd99a'; g.beginPath(); g.arc(W*0.74, sunY, sr, 0, 7); g.fill(); g.restore(); }
  const mk = clamp((p - 0.35)/0.6, 0, 1);
  if (mk > 0) { const mx = W*0.2, my = horizon - (horizon - L.top)*0.62*easeIO(mk), mr = sr*0.8;
    g.save(); g.beginPath(); g.rect(0, L.top, W, horizon - L.top); g.clip(); g.globalAlpha = clamp(mk*3, 0, 1);
    const mg = g.createRadialGradient(mx, my, 0, mx, my, mr*4); mg.addColorStop(0, 'rgba(220,230,255,.35)'); mg.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = mg; g.fillRect(mx - mr*4, my - mr*4, mr*8, mr*8);
    g.fillStyle = '#f1efe6'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
    g.fillStyle = 'rgba(150,150,170,.25)'; [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.35, 0.12]].forEach(([a, b, r]) => { g.beginPath(); g.arc(mx + a*mr, my + b*mr, r*mr, 0, 7); g.fill(); });
    g.restore(); }
  // the far sea, with a path of light from the sun (then the moon)
  const sea = g.createLinearGradient(0, horizon, 0, L.bot); sea.addColorStop(0, rgb(mix(c[1], [40, 70, 110], 0.5))); sea.addColorStop(1, rgb(mix(c[0], [8, 22, 46], 0.65)));
  g.fillStyle = sea; g.fillRect(0, horizon, W, L.bot - horizon);
  const lx = p < 0.55 ? W*0.74 : W*0.2, la = p < 0.55 ? 0.35*(1 - clamp((p - 0.4)/0.15, 0, 1)) : 0.25*mk;
  g.fillStyle = p < 0.55 ? `rgba(255,214,150,${la})` : `rgba(220,230,255,${la})`;
  for (let r = 0; r < 14; r++) { const y = horizon + 3 + r*r*1.4, w = 8 + r*5 + Math.sin(now*2 + r)*4; g.fillRect(lx - w/2 + Math.sin(now*1.3 + r*2)*6, y, w, 1.5); }
  // a liner far off on the horizon, lights on
  const sx = ((W*1.15 - (now*6) % (W*1.4)) + W*1.4) % (W*1.4) - W*0.2; g.fillStyle = 'rgba(12,10,20,.75)';
  g.fillRect(sx, horizon - 7, 46, 5); g.fillRect(sx + 12, horizon - 12, 6, 5); g.fillRect(sx + 24, horizon - 12, 6, 5);
  g.fillStyle = `rgba(255,214,150,${0.3 + night*0.6})`; for (let i = 0; i < 6; i++) g.fillRect(sx + 4 + i*7, horizon - 5, 2, 1.5);
}
function surfWave(G, t, p){   // the face he rides: deep at the trough, glassy near the lip, foam along the top
  const { L, lipY, troughY, horizon } = G, crest = x => lipY - 6 + Math.sin(x*0.012 + t*1.6)*5 + Math.sin(x*0.031 - t*2.3)*2.5;
  const deep = p < 0.5 ? [16, 62, 84] : [10, 28, 60], glass = p < 0.5 ? [96, 196, 190] : [70, 120, 170];
  const wg = g.createLinearGradient(0, lipY - 10, 0, L.bot); wg.addColorStop(0, `rgb(${glass})`); wg.addColorStop(0.35, `rgb(${deep.map((v, i) => (v + glass[i])/2)})`); wg.addColorStop(1, `rgb(${deep.map(v => v*0.45)})`);
  g.fillStyle = wg; g.beginPath(); g.moveTo(0, L.bot);
  for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, crest(x)); g.lineTo(W, L.bot); g.closePath(); g.fill();
  // the light catching the face, then streaks rushing past (he's moving fast)
  const shine = g.createLinearGradient(0, lipY, 0, lipY + (troughY - lipY)*0.5); shine.addColorStop(0, 'rgba(255,240,210,.22)'); shine.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = shine; g.fillRect(0, lipY - 6, W, (troughY - lipY)*0.5);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) { const y = lipY + (troughY - lipY)*((i*0.37) % 1)*1.1 + 8, len = 40 + (i*53) % 90, x = W - ((t*G.speed*(0.7 + (i % 4)*0.12) + i*197) % (W + 200)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + 2); g.stroke(); }
  // foam along the crest, thickening behind him where the wave breaks
  for (let x = 0; x <= W; x += 6) { const behind = clamp(1 - x/(G.jonX*1.1), 0, 1), y = crest(x);
    g.fillStyle = `rgba(255,255,255,${0.55 + behind*0.4})`; const r = 2 + behind*9 + Math.abs(Math.sin(x*0.13 + t*5))*2.5; g.beginPath(); g.arc(x, y + 1 - behind*4, r, 0, 7); g.fill(); }
  // behind him the wave stands up and curls over: a glassy wall rising to a lip that pitches forward into foam
  const x0 = G.jonX*0.95, top = lipY - (troughY - lipY)*0.55, wob = Math.sin(t*1.8)*4;
  const body = g.createLinearGradient(0, top, 0, troughY); body.addColorStop(0, `rgb(${glass.map(v => Math.min(255, v + 40))})`); body.addColorStop(0.5, `rgb(${glass})`); body.addColorStop(1, `rgb(${deep})`);
  g.fillStyle = body; g.beginPath(); g.moveTo(x0, crest(x0));
  g.bezierCurveTo(x0*0.72, crest(x0) - 4, x0*0.55, top + 10 + wob, x0*0.36, top + wob);                     // the face steepening
  g.bezierCurveTo(x0*0.22, top - 8 + wob, x0*0.06, top + 14, x0*0.1, top + (troughY - top)*0.32);          // the lip throwing forward
  g.bezierCurveTo(x0*0.05, top + (troughY - top)*0.45, -10, top + (troughY - top)*0.4, -10, top + (troughY - top)*0.5);
  g.lineTo(-10, crest(0) + 4); for (let x = 0; x <= x0; x += 8) g.lineTo(x, crest(x) + 4); g.closePath(); g.fill();   // sits on the wave, no seam
  // the hollow under the lip, then foam along its edge and spray coming off it
  g.fillStyle = 'rgba(0,20,30,.28)'; g.beginPath(); g.moveTo(x0*0.36, top + 20 + wob); g.bezierCurveTo(x0*0.2, top + 10, x0*0.1, top + 30, x0*0.12, top + (troughY - top)*0.36);
  g.bezierCurveTo(x0*0.3, top + (troughY - top)*0.5, x0*0.55, crest(x0*0.6) + 10, x0*0.7, crest(x0*0.7) + 6); g.closePath(); g.fill();
  for (let i = 0; i <= 40; i++) { const k = i/40, bx = x0*(0.95 - k*0.85), by = k < 0.6 ? lerp(crest(x0), top + wob, Math.sin(k/0.6*Math.PI/2)) : lerp(top + wob, top + (troughY - top)*0.34, (k - 0.6)/0.4);
    g.fillStyle = `rgba(255,255,255,${0.6 + k*0.35})`; g.beginPath(); g.arc(bx, by + 2, 2 + k*6 + Math.abs(Math.sin(i*1.7 + t*6))*2.5, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.6)';
  for (let i = 0; i < 18; i++) { const e = (((t*0.9 + i*0.37) % 1) + 1) % 1, sx2 = x0*0.25 - e*x0*0.2 + Math.sin(i*3.1)*10, sy2 = top + 6 - e*(troughY - top)*0.12 + e*e*(troughY - top)*0.6; g.globalAlpha = 1 - e; g.beginPath(); g.arc(sx2, sy2, 1.5 + e*2, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // white water where it has already broken: a soft glow at the foot of the curl
  const ww = g.createRadialGradient(0, crest(0) + 10, 0, 0, crest(0) + 10, x0*0.6); ww.addColorStop(0, 'rgba(255,255,255,.45)'); ww.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = ww; g.fillRect(0, crest(0) - x0*0.6, x0*0.6, x0*1.2);
}
function surfBoard(x, y, ang, len){
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 4, len*0.5, 4, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(-len*0.5, 0); g.quadraticCurveTo(-len*0.52, -6, -len*0.38, -6.5); g.lineTo(len*0.32, -6.5); g.quadraticCurveTo(len*0.58, -5, len*0.55, -1); g.quadraticCurveTo(len*0.5, 2.5, len*0.3, 2.5); g.lineTo(-len*0.42, 2.5); g.closePath();
  g.fillStyle = '#f3e6c8'; g.fill(); g.strokeStyle = PAL.out; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = '#8e2335'; g.fillRect(-len*0.42, -3.6, len*0.8, 2.2); g.fillStyle = '#e6b85c'; g.fillRect(-len*0.42, -1.2, len*0.8, 0.9);
  g.restore();
}
function surfFrame(now){
  const t = LV.running ? levelTime() : LV.lastT || 0, dt = clamp(now - (LV.lastNow || now), 0, 0.1); LV.lastT = t; LV.lastNow = now;
  if (LV.running && !LV.paused) surfStep(t, dt);
  const G = surfGeo(), { L, jonX, jh, yOf } = G, p = clamp(t/LV.chart.duration, 0, 1);
  g.fillStyle = '#050307'; g.fillRect(0, 0, W, H);
  surfSky(G, p, now);
  surfWave(G, t, p);
  // where he is: on the face, or up in the air
  const air = surfAir(t), ak = air ? (t - air[0])/(air[1] - air[0]) : -1;
  const boardY = air ? yOf(SURF.high) - Math.sin(ak*Math.PI)*L.fh*0.2 : yOf(LV.h);
  const tilt = air ? -0.5 + ak*0.9 : clamp(-LV.vel*0.16, -0.38, 0.38);
  const se = t - LV.spinAt, spinning = se >= 0 && se < 0.38, spinA = spinning ? easeIO(se/0.38)*Math.PI*2*LV.spinDir : 0;
  // the racing line: faint dots joining the gems still to come
  g.fillStyle = 'rgba(255,255,255,.25)';
  let prev = [jonX, boardY - jh*0.45];
  for (const n of LV.gems) { if (n.judged) continue; const x = jonX + (n.t - t)*G.speed; if (x > W + 40) break; const y = yOf(n.h) - jh*0.45;
    const steps = Math.max(1, Math.floor(Math.hypot(x - prev[0], y - prev[1])/14)); for (let i = 1; i < steps; i++) { const k = i/steps; g.beginPath(); g.arc(lerp(prev[0], x, k), lerp(prev[1], y, k), 1.2, 0, 7); g.fill(); } prev = [x, y]; }
  // spray off the tail
  if (LV.running && !air) for (let i = 0; i < 2; i++) LV.spray.push({ t0: now, x: jonX - jh*0.3, y: boardY, vx: -(60 + Math.random()*90), vy: -(30 + Math.random()*80) - Math.abs(LV.vel)*40 });
  LV.spray = LV.spray.filter(s => now - s.t0 < 0.6);
  for (const s of LV.spray) { const e = now - s.t0; g.fillStyle = `rgba(255,255,255,${0.7*(1 - e/0.6)})`; g.beginPath(); g.arc(s.x + s.vx*e, s.y + s.vy*e + 260*e*e, 1.6 + e*3, 0, 7); g.fill(); }
  // Jon on his board
  g.save(); g.translate(jonX, boardY); g.rotate(tilt + spinA); g.translate(-jonX, -boardY);
  surfBoard(jonX, boardY, 0, jh*0.95);
  drawJon(jonX, boardY - 3, jh, { running: false, amp: 0, phase: 0, idle: now*0.8, jumpK: -1, kick: false, stumble: 0, reach: 0,
    dir: 1, shades: true, glow: 0, holdHand: false, lookUp: false, surf: true, smile: LV.combo >= 10 });
  g.restore();
  // the gems coming in, and the spin cues in the air
  for (const n of LV.notes) {
    if (n.t - t > LV.approach + 0.2) break;
    if (n.judged && n.hit) continue;
    const x = jonX + (n.t - t)*G.speed; if (x < -30) continue;
    const fade = n.judged ? clamp(1 - (t - n.jt)/0.4, 0, 1) : 1; if (fade <= 0) continue;
    if (n.spin) { const a = LV.airs.find(([a, b]) => n.t >= a && n.t <= b), k2 = a ? (n.t - a[0])/(a[1] - a[0]) : 0.5, y = yOf(SURF.high) - Math.sin(k2*Math.PI)*L.fh*0.2 - jh*0.5;
      star(x, y + (n.judged ? (t - n.jt)*60 : 0), G.gem*1.3, now*2, `rgba(255,236,170,${fade})`, `rgba(255,255,255,${fade*0.8})`); }
    else gemShape(x, yOf(n.h) - jh*0.45 + (n.judged ? (t - n.jt)*90 : 0), G.gem, n.kind, Math.sin(now*2 + n.t)*0.25, n.judged ? fade*0.5 : 1);
  }
  // sparkles where gems were picked up
  LV.sparks = LV.sparks.filter(s => t - s.t0 < s.life);
  for (const s of LV.sparks) { const e = t - s.t0, k = e/s.life, r = jh*0.5*s.sp*(1 - Math.pow(1 - k, 2));
    g.globalAlpha = 1 - k; g.fillStyle = k < 0.3 ? '#ffffff' : GEMCOL[s.kind][0];
    g.beginPath(); g.arc(jonX + Math.cos(s.a)*r, yOf(s.h) - jh*0.45 + Math.sin(s.a)*r - e*20, G.gem*0.18*s.sz, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  LV.popups = LV.popups.filter(q => t - q.t < .6);
  LV.popups.forEach(q => { if (!q.text) return; const k = (t - q.t)/.6, pop = swingPop(k*0.6/0.22); g.globalAlpha = 1 - k*k; g.textAlign = 'center';
    g.fillStyle = q.k === 'miss' ? '#c8bfb2' : q.k === 'perfect' ? PAL.gold : PAL.cream; g.font = `400 ${clamp(jh*0.2, 13, 20)*pop}px ${FONT.deco}`;
    g.fillText(q.text, jonX + jh*0.2, boardY - jh*1.25 - k*16); g.globalAlpha = 1; });
  filmPost(0.55); letterbox(L);
  // HUD
  const pad = 16, cyTop = SAFE.t + L.barH/2, sz = Math.min(24, L.barH*0.48);
  g.textAlign = 'left'; g.fillStyle = PAL.gold; g.font = `400 ${sz}px ${FONT.deco}`; g.fillText(LV.score.toLocaleString(), pad, cyTop + sz*0.35);
  const sw = g.measureText(LV.score.toLocaleString()).width;
  { const cp = LV.combo >= 2 ? swingPop(clamp((t - LV.comboT)/0.22, 0, 1)) : 1;
    g.save(); g.translate(pad + sw + 10, cyTop + 4); g.scale(cp, cp); g.font = `700 10px ${FONT.type}`; g.fillStyle = LV.combo >= 10 ? PAL.gold : PAL.cream; g.fillText(`${LV.combo} COMBO  ·  ${DIFFS[DIFF].name.toUpperCase()}`, 0, 0); g.restore(); }
  g.textAlign = 'right'; g.fillStyle = PAL.gold; g.font = `400 ${Math.min(14, L.barH*0.32)}px ${FONT.deco}`; g.fillText(`TRACK ${LV.track.n} · ${LV.track.title.toUpperCase()}`, W - pad, cyTop + 5);
  g.fillStyle = 'rgba(230,184,92,.9)'; g.fillRect(0, L.top - 2, W*clamp(t/LV.endAt, 0, 1), 2);
  // the title while he paddles into the wave, with how to ride; a reminder just before the first jump
  const first = LV.gems.length ? LV.gems[0].t : 14;
  if (t < first - 0.5) { const a = clamp(Math.min((t + SURF.preroll)*2, (first - 0.5 - t)*1.5), 0, 1); g.globalAlpha = a; g.textAlign = 'center';
    const ty = L.top + L.fh*0.14;
    g.fillStyle = PAL.cream; g.font = `italic 500 ${clamp(W*0.04, 15, 22)}px ${FONT.serif}`; g.fillText(`Track ${LV.track.n}`, W/2, ty);
    g.fillStyle = PAL.gold; g.font = `400 ${clamp(W*0.09, 34, 64)}px ${FONT.deco}`; g.fillText(LV.track.title, W/2, ty + clamp(W*0.08, 34, 58));
    g.fillStyle = PAL.cream; g.font = `700 ${clamp(W*0.026, 10, 13)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'HOLD TO CLIMB  ·  LET GO TO CARVE' : 'HOLD ANY KEY TO CLIMB  ·  LET GO TO CARVE', W/2, ty + clamp(W*0.08, 34, 58) + 32);
    g.globalAlpha = 1; }
  const jump0 = LV.airs[0];
  if (jump0 && t > jump0[0] - 1.6 && t < jump0[0] + 0.8) { const a = clamp(Math.min((t - jump0[0] + 1.6)*3, (jump0[0] + 0.8 - t)*3), 0, 1);
    g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = PAL.gold; g.font = `700 ${clamp(W*0.03, 11, 14)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'TAP ON THE STARS TO SPIN' : 'TAP ON THE STARS TO SPIN', W/2, L.top + L.fh*0.1); g.globalAlpha = 1; }
  if (LV.running && !LV.fading && t > LV.endAt) { LV.fading = true; nodes.songplay.gn.gain.setTargetAtTime(0, ac.currentTime, 0.5); }
  if (LV.fading) { g.fillStyle = `rgba(3,2,5,${clamp((t - LV.endAt)/1.4, 0, 0.6)})`; g.fillRect(0, 0, W, H); }
  if (LV.running && !LV.ended && t > LV.endAt + 1.4) levelEnd();
}
