/* ---------- album levels: Void (surf) ----------
   Jon rides a long wave while the sun goes down and the moon comes up over the song. Hold anywhere (or any key) to
   climb the face, let go to carve down. Gems sit on the beat: kick = low in the trough, hi-hat = in between, snare =
   high on the face. You collect one by being at its height as it reaches him (closer = PERFECT). Ride all the way up
   off the lip and he flies (always the same arc, so the chart can line gems along it). In the air, press and hold to
   backflip; land flat or the tail catches and he wipes out. Three wipeouts and the song is over. */
const lerp = (a, b, k) => a + (b - a)*k;
const SURF = { low: 0.12, lip: 1.0, perfect: 0.1, good: 0.21, ease: 0.05, preroll: 2.0,
  flipRate: Math.PI*2/0.7, land: 0.15, landWin: 0.78, settle: 0.9, downFor: 1.8, lives: 3 };
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
function surfGeo(){
  const L = layout(), port = L.portrait;
  const horizon = L.top + L.fh*(port ? 0.3 : 0.34), lipY = L.top + L.fh*(port ? 0.5 : 0.5), troughY = L.top + L.fh*(port ? 0.84 : 0.88);
  const jh = Math.min(L.fh*(port ? 0.13 : 0.19), W*0.2), jonX = W*(port ? 0.26 : 0.27);
  const yOf = h => troughY - h*(troughY - lipY);   // where the board sits for a height (0 trough, 1 lip, above 1 = in the air)
  return { L, horizon, lipY, troughY, jh, jonX, yOf, gem: clamp(jh*0.17, 9, 18), speed: (W - jonX + 60)/LV.approach };
}
function surfInit(t, chart){
  const lv = chart.levels[DIFF], airs = lv.airs, AIRT = chart.air, PEAK = chart.peak, GR = 8*PEAK/(AIRT*AIRT);
  const gems = lv.gems.map(([tt, h, kind]) => ({ t: tt, h, kind, judged: false, hit: false, k: '', jt: 0, air: airs.find(([a, b]) => tt >= a - 1e-3 && tt <= b) || null }));
  const last = gems.length ? gems[gems.length - 1].t : chart.duration;
  return { mode: 'surf', notes: gems, gems, airs, rise: chart.rise, airT: AIRT, grav: GR, v0: GR*AIRT/2, endAt: Math.min(chart.duration - 0.6, last + 2.0),
    h: 0.3, vel: 0, ang: 0, angVel: 0, piv: 0, cam: 0, air: null, hold: new Set(), airIds: new Set(),
    lives: SURF.lives, down: -9, back: -9, wipe: null, over: false, flips: 0, flown: 0, landT: -9,
    spray: [], drops: [], sparks: [] };
}
const surfArc = (tau) => SURF.lip + LV.v0*tau - 0.5*LV.grav*tau*tau;
function surfDown(e){   // a finger or a key goes down: climb; a press in the air is a backflip for as long as it's held
  if (!LV || !LV.running || LV.ended) return;
  const id = e.pointerId != null ? 'p' + e.pointerId : e.code; if (LV.hold.has(id)) return; LV.hold.add(id);
  if (LV.air) LV.airIds.add(id);
}
function surfUp(e){ if (!LV || !LV.hold) return; const id = e.pointerId != null ? 'p' + e.pointerId : e.code; LV.hold.delete(id); LV.airIds.delete(id); }
const surfMult = () => Math.min(4, 1 + Math.floor(LV.combo/10));
function surfScore(n, t, k){
  n.judged = true; n.hit = k !== 'miss'; n.k = k; n.jt = t; LV.counts[k]++;
  if (k === 'miss') { if (LV.combo >= 5 && LV.down < 0) scratch(); LV.combo = 0; return; }
  LV.combo++; LV.maxCombo = Math.max(LV.maxCombo, LV.combo); LV.comboT = t;
  LV.score += (k === 'perfect' ? 300 : 150)*surfMult(); LV.flash = t;
  LV.popups = LV.popups.filter(q => q.big); LV.popups.push({ t, text: k === 'perfect' ? 'PERFECT' : 'NICE', k });   // one at a time, so they never stack
}
function surfLaunch(t0){
  LV.air = { t0, rot: 0 }; LV.flown++; LV.airIds.clear(); LV.angVel = 0;
  for (let i = 0; i < 16; i++) LV.drops.push({ t0, h: SURF.lip, dx: -Math.random()*30, vx: -(40 + Math.random()*140), vy: -(80 + Math.random()*160), r: 1.5 + Math.random()*2.5 });
}
function surfLand(t){
  const rel = wrapA(LV.ang - SURF.land), flips = Math.floor((-LV.air.rot + 0.9)/(Math.PI*2));
  LV.air = null; LV.landT = t;
  if (Math.abs(rel) > SURF.landWin) { surfWipe(t, rel < 0 ? 'tail' : 'nose'); return; }
  const reach = (0.88 - SURF.low)/LV.rise; LV.h = SURF.lip - 0.002; LV.vel = -reach; LV.ang = clamp(LV.ang, -0.4, 0.5);
  if (flips > 0) { LV.flips += flips; LV.score += 1000*flips*surfMult(); LV.flash = t;
    LV.popups.push({ t, text: ['', 'BACKFLIP', 'DOUBLE BACKFLIP', 'TRIPLE BACKFLIP'][Math.min(3, flips)], k: 'perfect', big: true }); }
  for (let i = 0; i < 22; i++) LV.drops.push({ t0: t, h: SURF.lip, dx: (Math.random() - 0.5)*30, vx: (Math.random() - 0.6)*180, vy: -(60 + Math.random()*170), r: 1.5 + Math.random()*3 });
}
function surfWipe(t, how){
  const G = surfGeo();
  LV.down = t; LV.lives--; LV.combo = 0; LV.air = null; LV.airIds.clear(); scratch();
  LV.wipe = { t, how, ang: LV.ang, y: G.yOf(SURF.lip) };
  if (LV.lives <= 0) LV.over = true;
  LV.popups.push({ t, text: 'WIPEOUT', k: 'miss', big: true });
  for (let i = 0; i < 60; i++) LV.drops.push({ t0: t, h: SURF.lip, dx: (Math.random() - 0.5)*40, vx: (Math.random() - 0.5)*320, vy: -(120 + Math.random()*320), r: 2 + Math.random()*4.5 });
}
function surfStep(t, dt){
  const reach = (0.88 - SURF.low)/LV.rise;
  const under = LV.down >= 0;
  if (under && !LV.over && t >= LV.down + SURF.downFor) { LV.down = -9; LV.back = t; LV.h = SURF.low; LV.vel = 0; LV.ang = 0; LV.wipe = null; }
  if (LV.down >= 0) { LV.h = SURF.low; LV.vel = 0; }
  else if (!LV.air) {
    // the ride: holding climbs, letting go carves down; a short ease keeps it smooth. A hold that began in the air
    // (a flip) doesn't count on the wave, so landing mid-press carves down instead of throwing him straight back up.
    const climbing = [...LV.hold].some(id => !LV.airIds.has(id)), want = climbing ? reach : -reach;
    LV.vel += (want - LV.vel)*(1 - Math.exp(-dt/SURF.ease));
    LV.h += LV.vel*dt;
    if (LV.h <= SURF.low && LV.vel < 0) { LV.h = SURF.low; LV.vel = 0; }
    if (LV.h >= SURF.lip && LV.vel > 0) { const t0 = t - (LV.h - SURF.lip)/LV.vel; surfLaunch(t0); LV.h = surfArc(t - t0); }
    else LV.ang += (clamp(-LV.vel*0.16, -0.38, 0.38) - LV.ang)*(1 - Math.exp(-dt/0.08));
  }
  if (LV.air) {
    const tau = t - LV.air.t0, flipping = LV.airIds.size > 0;
    LV.h = surfArc(tau);
    LV.angVel += ((flipping ? -SURF.flipRate : 0) - LV.angVel)*(1 - Math.exp(-dt/0.06));
    LV.ang += LV.angVel*dt; LV.air.rot += LV.angVel*dt;
    if (!flipping) {   // let go and the board settles into the line of the jump, if it's close
      const nat = -0.45*(LV.v0 - LV.grav*tau)/LV.v0, rel = wrapA(LV.ang - nat);
      if (Math.abs(rel) < SURF.settle) LV.ang -= rel*(1 - Math.exp(-dt/0.22));
    }
    if (tau >= LV.airT) surfLand(LV.air.t0 + LV.airT);
  }
  // gems: judged as they reach him, by how close his height is (all missed while he's under)
  for (const n of LV.gems) { if (n.judged) continue; if (n.t > t) break;
    if (LV.down >= 0) { surfScore(n, t, 'miss'); continue; }
    const d = Math.abs(LV.h - n.h); n.err = LV.h - n.h; surfScore(n, t, d <= SURF.perfect ? 'perfect' : d <= SURF.good ? 'good' : 'miss');
    if (n.hit) surfBurst(t, n.h, n.kind, n.k === 'perfect' ? 14 : 9); }
}
function surfBurst(t, h, kind, count){
  for (let i = 0; i < count; i++) LV.sparks.push({ t0: t, h, kind, a: Math.random()*Math.PI*2, sp: 0.4 + Math.random(), life: 0.4 + Math.random()*0.35, sz: 0.5 + Math.random() });
}
const GEMCOL = [['#7fe7dc', '#1f7f86'], ['#ffe2a0', '#c98a2a'], ['#ffc4d8', '#b9587e'], ['#fff6dc', '#e6b85c']];   // kick (low), snare (high), hi-hat (mid), launch (the lip)
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
  if (night > 0) { g.fillStyle = `rgba(255,248,230,${alphaF(0.8*night)})`; for (let s = 0; s < 70; s++) { const x = (s*137.5) % W, y = L.top + ((s*71.3) % (horizon - L.top)); g.globalAlpha = night*(0.4 + 0.6*Math.abs(Math.sin(now*0.8 + s))); g.fillRect(x, y, 1.6, 1.6); } g.globalAlpha = 1; }
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
  g.fillStyle = p < 0.55 ? `rgba(255,214,150,${alphaF(la)})` : `rgba(220,230,255,${alphaF(la)})`;
  for (let r = 0; r < 14; r++) { const y = horizon + 3 + r*r*1.4, w = 8 + r*5 + Math.sin(now*2 + r)*4; g.fillRect(lx - w/2 + Math.sin(now*1.3 + r*2)*6, y, w, 1.5); }
  // a liner far off on the horizon, lights on
  const sx = ((W*1.15 - (now*6) % (W*1.4)) + W*1.4) % (W*1.4) - W*0.2; g.fillStyle = 'rgba(12,10,20,.75)';
  g.fillRect(sx, horizon - 7, 46, 5); g.fillRect(sx + 12, horizon - 12, 6, 5); g.fillRect(sx + 24, horizon - 12, 6, 5);
  g.fillStyle = `rgba(255,214,150,${alphaF(0.3 + night*0.6)})`; for (let i = 0; i < 6; i++) g.fillRect(sx + 4 + i*7, horizon - 5, 2, 1.5);
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
    g.fillStyle = `rgba(255,255,255,${alphaF(0.55 + behind*0.4)})`; const r = 2 + behind*9 + Math.abs(Math.sin(x*0.13 + t*5))*2.5; g.beginPath(); g.arc(x, y + 1 - behind*4, r, 0, 7); g.fill(); }
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
    g.fillStyle = `rgba(255,255,255,${alphaF(0.6 + k*0.35)})`; g.beginPath(); g.arc(bx, by + 2, 2 + k*6 + Math.abs(Math.sin(i*1.7 + t*6))*2.5, 0, 7); g.fill(); }
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
// the mix follows the ride: the drums fill in as the combo builds (a miss drops them back), in the air the bass and
// most of the drums fall away and slam back in when he lands, and a wipeout pulls the whole song underwater
function surfMix(t){
  const M = LV.mix, now = ac.currentTime, down = LV.down >= 0, air = !!LV.air, landed = t - LV.landT < 0.15;
  const drums = down ? 0.12 : air ? 0.45 : 0.55 + 0.45*Math.min(1, LV.combo/6);
  const tc = landed ? 0.015 : air ? 0.22 : 0.12;
  M.dG.gain.setTargetAtTime(drums, now, tc);
  M.bHP.frequency.setTargetAtTime(air ? 260 : 10, now, landed ? 0.01 : 0.2);
  M.lp.frequency.setTargetAtTime(down ? 420 : 20000, now, down ? 0.08 : 0.3);
}
function surfPathH(ts, A, B){   // the racing line's height at a time between two gems: along the arc while in the air
  const air = (A && A.air && ts <= A.air[1]) ? A.air : (B && B.air && ts >= B.air[0]) ? B.air : null;
  if (air && ts >= air[0] && ts <= air[1]) return surfArc(ts - air[0]);
  const ha = A ? (A.air ? SURF.lip : A.h) : LV.h, ta = A ? (A.air ? Math.max(A.t, A.air[1]) : A.t) : ts;
  return B.t <= ta ? B.h : lerp(ha, B.h, clamp((ts - ta)/(B.t - ta), 0, 1));
}
function surfFrame(now){
  const t = LV.running ? levelTime() : LV.lastT || 0, dt = clamp(t - (LV.lastT ?? t), 0, 0.25); LV.lastT = t; LV.lastNow = now;   // physics on the song's clock, so slow frames don't change a flip
  if (LV.running && !LV.paused) surfStep(t, dt);
  if (LV.running && !LV.paused && LV.mix) surfMix(t);
  const G = surfGeo(), { L, jonX, jh, yOf } = G, p = clamp(t/LV.chart.duration, 0, 1);
  g.fillStyle = '#050307'; g.fillRect(0, 0, W, H);
  surfSky(G, p, now);
  // in the air the camera rises with him a little, so the whole jump stays in frame
  const camWant = LV.down < 0 ? clamp((LV.h - 1)/LV.chart.peak, 0, 1)*L.fh*(L.portrait ? 0.16 : 0.13) : 0;
  LV.cam += (camWant - LV.cam)*(1 - Math.exp(-dt/0.18)); LV.piv += ((LV.air ? 1 : 0) - LV.piv)*(1 - Math.exp(-dt/0.1));
  const sk = LV.wipe ? Math.max(0, 1 - (t - LV.wipe.t)/0.35) : 0, shx = sk ? Math.sin(now*90)*6*sk : 0;
  g.save(); g.translate(shx, LV.cam);
  surfWave(G, t, p);
  const boardY = yOf(LV.h);
  // the racing line: faint dots joining the gems still to come (curving along each jump)
  g.fillStyle = 'rgba(255,255,255,.25)';
  { let A = null, tA = t; const step = 14/G.speed;
    for (const n of LV.gems) { if (n.judged) { A = n; continue; } const x = jonX + (n.t - t)*G.speed; if (x > W + 40) break;
      for (let ts = Math.max(t, tA) + step; ts < n.t; ts += step) { const xx = jonX + (ts - t)*G.speed; g.beginPath(); g.arc(xx, yOf(surfPathH(ts, A, n)) - jh*0.45, 1.2, 0, 7); g.fill(); }
      A = n; tA = n.t; } }
  // spray off the tail on the wave; drops from takeoffs, landings and wipeouts
  if (LV.running && !LV.air && LV.down < 0) for (let i = 0; i < 2; i++) LV.spray.push({ t0: now, x: jonX - jh*0.3, y: boardY, vx: -(60 + Math.random()*90), vy: -(30 + Math.random()*80) - Math.abs(LV.vel)*40 });
  LV.spray = LV.spray.filter(q => now - q.t0 < 0.6);
  for (const q of LV.spray) { const e = now - q.t0; g.fillStyle = `rgba(255,255,255,${alphaF(0.7*(1 - e/0.6))})`; g.beginPath(); g.arc(q.x + q.vx*e, q.y + q.vy*e + 260*e*e, 1.6 + e*3, 0, 7); g.fill(); }
  LV.drops = LV.drops.filter(q => t - q.t0 < 0.9 && t >= q.t0 - 0.05);
  for (const q of LV.drops) { const e = Math.max(0, t - q.t0); g.fillStyle = `rgba(255,255,255,${alphaF(0.85*(1 - e/0.9))})`; g.beginPath(); g.arc(jonX + q.dx + q.vx*e, yOf(q.h) + q.vy*e + 520*e*e, q.r*(1 - e*0.5), 0, 7); g.fill(); }
  // Jon on his board, or tumbling off it
  const pose = { running: false, amp: 0, phase: 0, idle: now*0.8, jumpK: -1, kick: false, stumble: 0, reach: 0, dir: 1, shades: true, glow: 0, holdHand: false, lookUp: false, surf: true, smile: LV.combo >= 10 };
  if (LV.wipe) {
    const e = t - LV.wipe.t, w = LV.wipe;
    const bx = jonX - e*G.speed*0.3 + e*40, by = w.y - L.fh*0.32*e + L.fh*0.9*e*e;   // the board flips away behind him
    if (by < L.bot + 40) surfBoard(bx, by, w.ang + e*11, jh*0.95);
    const ja = clamp(1 - (e - 0.3)/0.35, 0, 1);
    if (ja > 0) { const jx = jonX + e*30, jy = w.y - L.fh*0.12*e + L.fh*0.7*e*e;
      g.save(); g.globalAlpha = ja; g.translate(jx, jy - jh*0.45); g.rotate(w.ang - e*7); g.translate(-jx, -(jy - jh*0.45));
      drawJon(jx, jy, jh, { ...pose, smile: false, stumble: 1 }); g.restore(); }
  } else {
    const blink = t - LV.back < 0.7 ? 0.45 + 0.55*Math.abs(Math.cos((t - LV.back)*14)) : 1;
    const py = boardY - jh*0.42*LV.piv;
    g.save(); g.globalAlpha = blink; g.translate(jonX, py); g.rotate(LV.ang); g.translate(-jonX, -py);
    surfBoard(jonX, boardY, 0, jh*0.95);
    drawJon(jonX, boardY - 3, jh, pose);
    g.restore();
  }
  // the gems coming in (the launch gem on the lip is a star)
  for (const n of LV.gems) {
    if (n.t - t > LV.approach + 0.2) break;
    if (n.judged && n.hit) continue;
    const x = jonX + (n.t - t)*G.speed; if (x < -30) continue;
    const fade = n.judged ? clamp(1 - (t - n.jt)/0.4, 0, 1) : 1; if (fade <= 0) continue;
    const y = yOf(n.h) - jh*0.45 + (n.judged ? (t - n.jt)*90 : 0);
    if (n.kind === 3) { const pulse = 1 + Math.sin(now*6)*0.08;
      const gl = g.createRadialGradient(x, y, 0, x, y, G.gem*3); gl.addColorStop(0, `rgba(255,236,170,${alphaF(0.45*fade)})`); gl.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gl; g.fillRect(x - G.gem*3, y - G.gem*3, G.gem*6, G.gem*6);
      star(x, y, G.gem*1.35*pulse, now*1.5, `rgba(255,236,170,${alphaF(n.judged ? fade*0.5 : 1)})`, `rgba(255,255,255,${alphaF(fade*0.85)})`); }
    else gemShape(x, y, G.gem, n.kind, Math.sin(now*2 + n.t)*0.25, n.judged ? fade*0.5 : 1);
  }
  // sparkles where gems were picked up
  LV.sparks = LV.sparks.filter(q => t - q.t0 < q.life);
  for (const q of LV.sparks) { const e = t - q.t0, k = e/q.life, r = jh*0.5*q.sp*(1 - Math.pow(1 - k, 2));
    g.globalAlpha = 1 - k; g.fillStyle = k < 0.3 ? '#ffffff' : GEMCOL[q.kind][0];
    g.beginPath(); g.arc(jonX + Math.cos(q.a)*r, yOf(q.h) - jh*0.45 + Math.sin(q.a)*r - e*20, G.gem*0.18*q.sz, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  LV.popups = LV.popups.filter(q => t - q.t < (q.big ? 1.1 : 0.6));
  LV.popups.forEach(q => { if (!q.text) return; const life = q.big ? 1.1 : 0.6, k = (t - q.t)/life, pop = swingPop(k*life/0.22); g.globalAlpha = 1 - k*k; g.textAlign = 'center';
    g.fillStyle = q.k === 'miss' ? '#e9e1d4' : q.k === 'perfect' ? PAL.gold : PAL.cream;
    g.font = `400 ${clamp(jh*(q.big ? 0.3 : 0.2), q.big ? 18 : 13, q.big ? 30 : 20)*pop}px ${FONT.deco}`;
    const py = q.big ? Math.min(boardY, yOf(SURF.lip)) - jh*1.45 : boardY - jh*1.25; g.fillText(q.text, jonX + jh*(q.big ? 0.5 : 0.2), py - k*16); g.globalAlpha = 1; });
  g.restore();
  filmPost(0.55); letterbox(L);
  // HUD
  const pad = 16 + SAFE.x, cyTop = SAFE.t + L.barH/2, sz = Math.min(24, L.barH*0.48);
  g.textAlign = 'left'; g.fillStyle = PAL.gold; g.font = `400 ${sz}px ${FONT.deco}`; g.fillText(LV.score.toLocaleString(), pad, cyTop + sz*0.35);
  const sw = g.measureText(LV.score.toLocaleString()).width;
  { const cp = LV.combo >= 2 ? swingPop(clamp((t - LV.comboT)/0.22, 0, 1)) : 1;
    g.save(); g.translate(pad + sw + 10, cyTop + 4); g.scale(cp, cp); g.font = `700 10px ${FONT.type}`; g.fillStyle = LV.combo >= 10 ? PAL.gold : PAL.cream; g.fillText(`${LV.combo} COMBO  ·  ${DIFFS[DIFF].name.toUpperCase()}`, 0, 0); g.restore(); }
  g.textAlign = 'right'; g.fillStyle = PAL.gold; const tsz = Math.min(14, L.barH*0.32); g.font = `400 ${tsz}px ${FONT.deco}`;
  const ttl = L.portrait ? LV.track.title.toUpperCase() : `TRACK ${LV.track.n} · ${LV.track.title.toUpperCase()}`; g.fillText(ttl, W - pad, cyTop + 5);
  { const tw = g.measureText(ttl).width, bl = clamp(L.barH*0.42, 14, 22);   // lives: three little boards
    for (let i = 0; i < SURF.lives; i++) { const x = W - pad - tw - 14 - bl*0.55 - i*(bl + 5), lost = i >= LV.lives;
      g.save(); g.globalAlpha = lost ? 0.25 : 1; g.translate(x, cyTop + 2); g.rotate(-0.5); surfBoard(0, 0, 0, bl); g.restore(); } }
  g.fillStyle = 'rgba(230,184,92,.9)'; g.fillRect(0, L.top - 2, W*clamp(t/LV.endAt, 0, 1), 2);
  // the title while he paddles into the wave, with how to ride; then how to fly, and how to flip the first times up
  const first = LV.gems.length ? LV.gems[0].t : 14;
  const hint = (txt, a) => { if (a <= 0) return; g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = PAL.gold; g.font = `700 ${clamp(W*0.03, 11, 14)}px ${FONT.type}`; g.fillText(txt, W/2, Math.max(L.top + L.fh*0.1, L.ui + 34)); g.globalAlpha = 1; };
  if (t < first - 0.5) { const a = clamp(Math.min((t + SURF.preroll)*2, (first - 0.5 - t)*1.5), 0, 1); g.globalAlpha = a; g.textAlign = 'center';
    const ty = Math.max(L.top + L.fh*0.14, L.ui + 40);
    g.fillStyle = PAL.cream; g.font = `italic 500 ${clamp(W*0.04, 15, 22)}px ${FONT.serif}`; g.fillText(`Track ${LV.track.n}`, W/2, ty);
    g.fillStyle = PAL.gold; g.font = `400 ${clamp(W*0.09, 34, 64)}px ${FONT.deco}`; g.fillText(LV.track.title, W/2, ty + clamp(W*0.08, 34, 58));
    g.fillStyle = PAL.cream; g.font = `700 ${clamp(W*0.026, 10, 13)}px ${FONT.type}`;
    g.fillText(TOUCH ? 'HOLD TO CLIMB  ·  LET GO TO CARVE' : 'HOLD ANY KEY TO CLIMB  ·  LET GO TO CARVE', W/2, ty + clamp(W*0.08, 34, 58) + 32);
    g.globalAlpha = 1; }
  const l0 = LV.gems.find(n => n.kind === 3);
  if (l0 && !LV.flown && t > l0.t - 2.2 && t < l0.t + 0.3) hint('RIDE OFF THE TOP TO FLY', clamp(Math.min((t - l0.t + 2.2)*3, (l0.t + 0.3 - t)*3), 0, 1));
  if (LV.air && LV.flown <= 2 && !LV.flips) hint(TOUCH ? 'IN THE AIR: HOLD TO FLIP  ·  LAND IT FLAT' : 'IN THE AIR: HOLD TO FLIP  ·  LAND IT FLAT', clamp((t - LV.air.t0)*4, 0, 1));
  if (LV.wipe && !LV.over) hint(LV.lives === 1 ? 'LAST BOARD' : `${LV.lives} BOARDS LEFT`, clamp(Math.min((t - LV.wipe.t - 0.3)*4, (LV.wipe.t + SURF.downFor - t)*4), 0, 1));
  // the end: the song fades out (or, after the last wipeout, the run is over)
  const endAt = LV.over ? LV.wipe.t + 1.0 : LV.endAt;
  if (LV.running && !LV.fading && t > endAt) { LV.fading = true; nodes.songplay.gn.gain.setTargetAtTime(0, ac.currentTime, LV.over ? 0.35 : 0.5); }
  if (LV.fading) { g.fillStyle = `rgba(3,2,5,${alphaF(clamp((t - endAt)/1.4, 0, LV.over ? 0.75 : 0.6))})`; g.fillRect(0, 0, W, H); }
  if (LV.running && !LV.ended && t > endAt + 1.4) levelEnd(LV.over);
}
