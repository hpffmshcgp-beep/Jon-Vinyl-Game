/* ---------- the chase: obstacles on the beat, passengers cheering him on, and learning by doing ----------
   Left side (or F, ←, ↑) = JUMP over what's on the deck (the snare and hi-hats). Right side (or J, →, ↓) = SLIDE under
   what hangs overhead (the kick). Every obstacle sits on a measured drum hit, as the stars and kicks did before.
   The first time each move comes up (ever), the song stops with Jon at the obstacle and waits for the right side. */

// where an obstacle is: at its note's time it sits just ahead of Jon, so the jump (or slide) carries him across it
const OB = { lead: 0.2, lowH: 0.25, lowW: 0.44, highBot: 0.62, highH: 0.24, highW: 0.5 };
const obX = (L, n, t) => L.jx + (n.t - t + OB.lead)*L.speed;
const slideAmt = t => { const e = t - S.slideAt; if (e < 0 || e > 0.56) return 0; return e < 0.07 ? e/0.07 : e < 0.42 ? 1 : 1 - (e - 0.42)/0.14; };
const obKind = n => Math.min(4, Math.max(1, actAt(n.t)));   // one look per act: 1 verse, 2 pre-chorus, 3 chorus, 4 outro
function inked(path, fill, lw = 2){ path(); g.fillStyle = fill; g.fill(); g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = PAL.out; g.stroke(); }

// what's on the deck to jump: a stack of chips, a deck chair, a steamer trunk, a crate of fireworks
function lowObstacle(L, kind, x, now, fall){
  const h = L.jh*OB.lowH, w = L.jh*OB.lowW, gy = L.groundY, lw = Math.max(1.5, L.jh*0.012);
  g.save(); g.translate(x, gy);
  if (fall) { g.translate(w*0.5, 0); g.rotate(fall*1.35); g.translate(-w*0.5, 0); }   // knocked over when he trips on it
  const sh = g.createRadialGradient(0, 0, 0, 0, 0, w*0.7); sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.scale(1, 0.18); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, w*0.7, 0, 7); g.fill(); g.restore();
  if (kind === 1) {   // a teetering stack of poker chips
    const n = 5, ch = h/n, cw = w*0.62;
    for (let i = 0; i < n; i++) { const y = -ch*(i + 1), off = Math.sin(i*2.1 + 0.5)*w*0.05;
      inked(() => rrect(-cw/2 + off, y, cw, ch*0.92, ch*0.3), i % 2 ? '#e9dcc0' : PAL.wine, lw);
      g.fillStyle = i % 2 ? PAL.wine : '#f3e6c8'; for (let k = 0; k < 4; k++) g.fillRect(-cw/2 + off + cw*(0.08 + k*0.25), y + ch*0.2, cw*0.1, ch*0.5); }
    g.beginPath(); g.ellipse(Math.sin(4*2.1 + 0.5)*w*0.05, -h + ch*0.08, cw/2, ch*0.32, 0, 0, 7); g.fillStyle = PAL.wine; g.fill(); g.strokeStyle = PAL.out; g.lineWidth = lw; g.stroke();
  } else if (kind === 2) {   // a folded deck chair, striped canvas on a wooden frame
    g.lineCap = 'round';
    [[-w*0.45, 0, w*0.25, -h], [w*0.45, 0, -w*0.2, -h*0.9]].forEach(([x0, y0, x1, y1]) => { g.strokeStyle = PAL.out; g.lineWidth = lw*3.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = '#a8743f'; g.lineWidth = lw*1.8; g.stroke(); });
    inked(() => { g.beginPath(); g.moveTo(-w*0.3, -h*0.95); g.lineTo(w*0.32, -h*0.92); g.lineTo(w*0.42, -h*0.32); g.lineTo(-w*0.38, -h*0.38); g.closePath(); }, '#f3e6c8', lw);
    g.save(); g.beginPath(); g.moveTo(-w*0.3, -h*0.95); g.lineTo(w*0.32, -h*0.92); g.lineTo(w*0.42, -h*0.32); g.lineTo(-w*0.38, -h*0.38); g.closePath(); g.clip();
    g.fillStyle = '#b8323f'; for (let k = -3; k < 4; k++) g.fillRect(k*w*0.16, -h, w*0.08, h); g.restore();
  } else if (kind === 3) {   // a steamer trunk with brass corners and travel stickers
    inked(() => rrect(-w/2, -h, w, h, h*0.12), '#6e4024', lw);
    g.fillStyle = '#4e2c18'; g.fillRect(-w/2 + lw, -h*0.62, w - lw*2, h*0.08); g.fillRect(-w/2 + lw, -h*0.3, w - lw*2, h*0.06);
    g.fillStyle = '#d8a94c'; [[-w/2, -h], [w/2 - w*0.12, -h], [-w/2, -h*0.14], [w/2 - w*0.12, -h*0.14]].forEach(([cx, cy]) => g.fillRect(cx, cy, w*0.12, h*0.14));
    g.fillStyle = '#e6c06a'; g.fillRect(-w*0.06, -h*0.68, w*0.12, h*0.16);
    [[-w*0.28, -h*0.5, '#e9dcc0'], [w*0.22, -h*0.42, '#c7e0de'], [-w*0.05, -h*0.18, '#f0b7a8']].forEach(([cx, cy, c]) => { g.beginPath(); g.ellipse(cx, cy, w*0.1, h*0.12, 0.3, 0, 7); g.fillStyle = c; g.fill(); });
  } else {   // a crate of fireworks, rockets sticking out
    [[-w*0.22, 0.2], [0, -0.1], [w*0.2, 0.15]].forEach(([rx, a], i) => { g.save(); g.translate(rx, -h*0.8); g.rotate(a);
      inked(() => rrect(-w*0.05, -h*0.75, w*0.1, h*0.75, w*0.03), ['#c8323f', '#2f5aa8', '#e6b85c'][i], lw);
      inked(() => { g.beginPath(); g.moveTo(-w*0.06, -h*0.75); g.lineTo(0, -h*0.98); g.lineTo(w*0.06, -h*0.75); g.closePath(); }, '#f3e6c8', lw);
      g.restore(); });
    inked(() => rrect(-w/2, -h*0.82, w, h*0.82, h*0.05), '#b98a4f', lw);
    g.strokeStyle = 'rgba(70,40,20,.65)'; g.lineWidth = lw; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(-w/2, -h*0.82*k/3); g.lineTo(w/2, -h*0.82*k/3); g.stroke(); }
    const sp = 0.5 + 0.5*Math.sin(now*30); g.fillStyle = `rgba(255,220,140,${0.6 + sp*0.4})`; g.beginPath(); g.arc(w*0.2 + Math.sin(0.15)*h*0.98, -h*1.72, lw*1.6*(1 + sp), 0, 7); g.fill();
  }
  g.restore();
}
// what hangs overhead to slide under: a casino sign, an awning, a lifebuoy, a banner
function highObstacle(L, kind, x, now, swing){
  const bot = L.groundY - L.jh*OB.highBot, h = L.jh*OB.highH, w = L.jh*OB.highW, lw = Math.max(1.5, L.jh*0.012), top = L.top - 4;
  g.save(); g.translate(x, top);
  const sw = swing ? Math.sin(swing*14)*0.5*(1 - swing) : Math.sin(now*1.6 + x*0.01)*0.03;   // knocked swinging if he runs into it
  g.rotate(sw); const len = bot - top;
  g.strokeStyle = 'rgba(30,22,26,.85)'; g.lineWidth = lw*1.2;
  if (kind === 1) {   // a hanging sign from the casino, on two chains
    [-w*0.32, w*0.32].forEach(cx => { g.setLineDash([lw*2.2, lw*1.4]); g.beginPath(); g.moveTo(cx*0.6, 0); g.lineTo(cx, len - h); g.stroke(); }); g.setLineDash([]);
    inked(() => rrect(-w/2, len - h, w, h, h*0.12), '#1c1420', lw);
    g.strokeStyle = PAL.gold; g.lineWidth = lw; g.strokeRect(-w/2 + lw*2.5, len - h + lw*2.5, w - lw*5, h - lw*5);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h*0.5}px ${FONT.serif}`;
    ['♠', '♥', '♣', '♦'].forEach((c, i) => { g.fillStyle = i % 2 ? '#e8746a' : PAL.gold; g.fillText(c, -w*0.3 + i*w*0.2, len - h/2 + h*0.03); }); g.textBaseline = 'alphabetic';
  } else if (kind === 2) {   // a striped canopy on a wooden rail, its scalloped edge hanging low
    const cw = w*1.3, top2 = len - h*1.35, sc = 7, sw2 = cw/sc;
    [-cw*0.45, cw*0.45].forEach(cx => { g.beginPath(); g.moveTo(cx*0.5, 0); g.lineTo(cx, top2); g.stroke(); });
    g.beginPath(); g.moveTo(-cw/2, top2); g.lineTo(cw/2, top2); g.lineTo(cw/2, len - h*0.3);
    for (let k = sc - 1; k >= 0; k--) g.quadraticCurveTo(-cw/2 + sw2*(k + 0.5), len + h*0.12, -cw/2 + sw2*k, len - h*0.3);
    g.closePath(); g.fillStyle = '#f3e6c8'; g.fill();
    g.save(); g.clip(); g.fillStyle = '#2f6e74'; for (let k = 0; k < sc; k += 2) g.fillRect(-cw/2 + sw2*k, top2, sw2, h*1.6);
    const sh = g.createLinearGradient(0, top2, 0, len); sh.addColorStop(0, 'rgba(0,0,0,.25)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(-cw/2, top2, cw, h*1.5); g.restore();
    g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = PAL.out; g.stroke();
    inked(() => rrect(-cw/2 - lw*2, top2 - h*0.14, cw + lw*4, h*0.16, h*0.06), '#8a5a32', lw);
  } else if (kind === 3) {   // a lifebuoy on a rope
    const r = h*0.62, cy = len - r;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, cy - r); g.stroke();
    g.beginPath(); g.arc(0, cy, r, 0, 7); g.arc(0, cy, r*0.5, 0, 7, true); g.fillStyle = '#f3e6c8'; g.fill('evenodd');
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(0, cy, r, k*Math.PI/2 + 0.35, k*Math.PI/2 + 0.35 + Math.PI/4); g.arc(0, cy, r*0.5, k*Math.PI/2 + 0.35 + Math.PI/4, k*Math.PI/2 + 0.35, true); g.closePath(); g.fillStyle = '#c8323f'; g.fill(); }
    g.lineWidth = lw; g.strokeStyle = PAL.out; g.beginPath(); g.arc(0, cy, r, 0, 7); g.stroke(); g.beginPath(); g.arc(0, cy, r*0.5, 0, 7); g.stroke();
  } else {   // a bon voyage banner under a string of lanterns
    [-w*0.42, w*0.42].forEach(cx => { g.beginPath(); g.moveTo(cx*0.4, 0); g.lineTo(cx, len - h); g.stroke(); });
    inked(() => { g.beginPath(); g.moveTo(-w/2, len - h); g.lineTo(w/2, len - h); g.lineTo(w/2, len - h*0.15); g.lineTo(w*0.3, len); g.lineTo(-w*0.3, len); g.lineTo(-w/2, len - h*0.15); g.closePath(); }, '#8e2335', lw);
    g.fillStyle = '#f3e6c8'; g.textAlign = 'center'; g.font = `400 ${h*0.36}px ${FONT.deco}`; g.fillText('BON VOYAGE', 0, len - h*0.38, w*0.88);
    for (let k = -2; k <= 2; k++) { const lx = k*w*0.24, ly = len - h - h*0.25 + Math.abs(k)*h*0.06, gl = 0.6 + 0.4*Math.sin(now*3 + k);
      const lg = g.createRadialGradient(lx, ly, 0, lx, ly, h*0.35); lg.addColorStop(0, `rgba(255,214,140,${0.55*gl})`); lg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = lg; g.fillRect(lx - h*0.35, ly - h*0.35, h*0.7, h*0.7);
      inked(() => { g.beginPath(); g.ellipse(lx, ly, h*0.1, h*0.13, 0, 0, 7); }, k % 2 ? '#f0b44c' : '#e8746a', lw*0.8); }
  }
  g.restore();
}
// the notes of the chase, as obstacles in the world (the last one, her hand, is still the heart in the middle)
function drawObstacles(L, t, now){
  for (let i = Math.max(0, S.nextIdx - 12); i < S.notes.length; i++) {
    const n = S.notes[i]; if (n.lane === 2) continue;
    const x = obX(L, n, t); if (x > W + L.jh) break; if (x < -L.jh) continue;
    const k = obKind(n), fall = n.missT != null ? clamp((t - n.missT)/0.35, 0, 1) : 0;
    // a soft glow so each reads from far off: gold on the deck (jump, left), rose overhead (slide, right)
    if (!n.judged) { const y = n.lane ? L.groundY - L.jh*(OB.highBot + OB.highH*0.5) : L.groundY - L.jh*OB.lowH*0.5, r = L.jh*0.42;
      const gl = g.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, n.lane ? 'rgba(232,116,106,.32)' : 'rgba(255,226,150,.32)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl; g.fillRect(x - r, y - r, r*2, r*2); }
    if (n.miss) g.globalAlpha = Math.max(0, 1 - Math.max(0, t - n.t - 0.5)*2);
    if (n.lane === 0) lowObstacle(L, k, x, now, fall); else highObstacle(L, k, x, now, n.missT != null ? clamp((t - n.missT)/1.2, 0, 1) : 0);
    g.globalAlpha = 1;
  }
}

/* passengers along the deck, cheering him on as he runs past (like the flowers in Mario Wonder) */
const PASS = [   // [coat, legs, hat, skin, accent]
  { coat: '#f4f0e6', legs: '#f4f0e6', hat: '#f4f0e6', skin: '#9a6a4a', acc: '#2a3c6e', hatK: 'cap' },        // a sailor
  { coat: '#f1d27a', legs: '#f1d27a', hat: '#e9dcc0', skin: '#e2b896', acc: '#e8746a', hatK: 'sun', dress: true, parasol: true },
  { coat: '#5d5f6a', legs: '#3f4049', hat: '#1c1a20', skin: '#d9a982', acc: '#f3e6c8', hatK: 'top', cane: true, tache: true },
  { coat: '#a82a36', legs: '#1f1a22', hat: '#a82a36', skin: '#5a3424', acc: '#e6b85c', hatK: 'pill' },       // a bellhop
  { coat: '#3f78a8', legs: '#7a5636', hat: '#c8323f', skin: '#7a4a32', acc: '#f3e6c8', hatK: 'cap', kid: true },
  { coat: '#3e7a5e', legs: '#3e7a5e', hat: '#2a1a14', skin: '#b07a56', acc: '#f0d9bd', hatK: 'curls', dress: true },
];
function drawPassenger(x, gy, h, type, now, cheer){
  const P = PASS[type], s = (P.kid ? h*0.66 : h)/100, OUT = PAL.out, ph = now*7 + type;
  g.save(); g.translate(x, gy); g.scale(-s, s);   // they face Jon, who's off to the left
  const hop = cheer ? Math.abs(Math.sin(ph))*(P.kid ? 9 : 3) : 0; g.translate(0, -hop);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = (fill, lw = 2.6) => { g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); g.fillStyle = fill; g.fill(); };
  // legs, then the body (a dress or a coat), then the arms: one cheering, one holding something
  if (!P.dress) { [[-4, 0], [4, 0]].forEach(([lx]) => { g.beginPath(); rrect(lx - 4.2, -46, 8.4, 46, 3.5); ink(P.legs); g.beginPath(); g.ellipse(lx + 2, -1.5, 6, 3.4, 0, 0, 7); ink('#1c1418'); }); }
  else { [[-4], [4]].forEach(([lx]) => { g.beginPath(); rrect(lx - 2.6, -24, 5.2, 24, 2.5); ink(P.skin); g.beginPath(); g.ellipse(lx + 2, -1.5, 5.2, 3, 0, 0, 7); ink('#1c1418'); }); }
  g.beginPath();
  if (P.dress) { g.moveTo(-9, -80); g.lineTo(9, -80); g.quadraticCurveTo(12, -50, 17, -22); g.lineTo(-17, -22); g.quadraticCurveTo(-12, -50, -9, -80); }
  else { g.moveTo(-10, -80); g.lineTo(10, -80); g.lineTo(11, -42); g.lineTo(-11, -42); g.closePath(); }
  ink(P.coat);
  if (type === 0) { g.beginPath(); g.moveTo(-10, -80); g.lineTo(10, -80); g.lineTo(0, -66); g.closePath(); ink(P.acc, 2); }                 // sailor collar
  if (type === 3) { g.fillStyle = P.acc; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(3, -76 + k*8, 1.5, 0, 7); g.fill(); } }           // brass buttons
  if (type === 4) { g.fillStyle = 'rgba(243,230,200,.85)'; for (let k = 0; k < 4; k++) g.fillRect(-10, -76 + k*8, 20, 3); }                   // striped shirt
  const wave = cheer ? Math.sin(ph*1.6)*0.45 : 0;
  const arm = (sx, a, len = 30) => { const ex = sx + Math.sin(a)*len, ey = -78 + Math.cos(a)*len;   // a = 0 hangs down, π points up
    g.beginPath(); g.moveTo(sx, -78); g.lineTo(ex, ey); g.lineWidth = 9; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5.6; g.strokeStyle = P.coat; g.stroke();
    g.beginPath(); g.arc(ex, ey, 3.6, 0, 7); ink(P.skin, 2); return [ex, ey]; };
  if (P.kid) { arm(-7, -2.6 + wave); arm(7, 2.6 - wave); }
  else {
    const [hx, hy] = arm(7, cheer ? 2.7 + wave : 2.9);          // the near arm up, waving him on
    const [bx, by] = arm(-7, P.cane ? -2.4 + (cheer ? wave*0.6 : 0) : -0.3, 26);
    if (P.cane) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 6, by - 26); g.lineWidth = 3; g.strokeStyle = '#2a1a14'; g.stroke(); }
    if (P.parasol) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 2, by - 40); g.lineWidth = 2; g.strokeStyle = '#2a1a14'; g.stroke();
      g.beginPath(); g.moveTo(bx - 24, by - 36); g.quadraticCurveTo(bx - 2, by - 62, bx + 20, by - 36); g.closePath(); ink('#f3c2c8'); }
    if (type === 0 && cheer) { g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy - 16); g.lineWidth = 1.6; g.strokeStyle = '#2a1a14'; g.stroke(); g.beginPath(); g.moveTo(hx, hy - 16); g.lineTo(hx + 12, hy - 12); g.lineTo(hx, hy - 8); g.closePath(); ink(PAL.rose, 1.6); }   // a little pennant
  }
  // head and face
  g.beginPath(); rrect(-2.6, -86, 5.2, 7, 2); ink(P.skin, 2);
  g.beginPath(); g.ellipse(0, -94, 8.2, 9.2, 0, 0, 7); ink(P.skin);
  g.fillStyle = OUT; g.beginPath(); g.arc(4.2, -95, 1.1, 0, 7); g.fill();
  g.beginPath(); cheer ? g.ellipse(5, -89.4, 2, 2.4, 0, 0, 7) : g.arc(4.6, -90, 1.8, 0.2, 2.6); cheer ? g.fill() : (g.lineWidth = 1.2, g.stroke());
  if (P.tache) { g.beginPath(); g.ellipse(4.6, -91.4, 3.6, 1.3, 0, 0, 7); ink('#f3efe6', 1); }
  // hats
  g.beginPath();
  if (P.hatK === 'cap') { g.ellipse(0, -101.5, 9.6, 3.4, 0, Math.PI, 0); g.lineTo(9.6, -101); g.lineTo(-9.6, -101); ink(P.hat); g.beginPath(); rrect(-9.4, -102.5, 18.8, 3, 1.2); ink(type === 0 ? P.acc : '#1c1418', 1.6); }
  else if (P.hatK === 'sun') { g.ellipse(0, -100, 17, 3.8, 0, 0, 7); ink(P.hat); g.beginPath(); g.ellipse(0, -104, 8.4, 6, 0, Math.PI, 0); ink(P.hat); g.beginPath(); rrect(-8.4, -103.4, 16.8, 2.6, 1); ink(P.acc, 1.4); }
  else if (P.hatK === 'top') { rrect(-7.4, -118, 14.8, 17, 1.5); ink(P.hat); g.beginPath(); g.ellipse(0, -101, 12, 2.6, 0, 0, 7); ink(P.hat); }
  else if (P.hatK === 'pill') { rrect(-6.6, -110, 13.2, 8.4, 2); ink(P.hat); g.fillStyle = P.acc; g.fillRect(-6.6, -104, 13.2, 1.6); }
  else { [[-6, -100], [-1, -104], [5, -102], [-8, -94], [-6, -88]].forEach(([cx, cy]) => { g.beginPath(); g.arc(cx, cy, 4.4, 0, 7); ink(P.hat, 1.6); }); }
  g.restore();
}
// who says what, and when (game time). Short, so you can read it at a run; nothing from the song's lyrics.
const CHEERS = [
  [13.2, 0, 'Go get her!'], [16.4, 'jon', 'I gotta catch her!'],
  [23.0, 1, 'She went that way!'], [27.4, 'jon', 'Sorry! Excuse me!'],
  [37.6, 2, 'Run, young man!'], [41.4, 'jon', 'Should’ve trained at the cruise gym…'],
  [45.6, 3, 'Mind the luggage!'],
  [58.0, 4, 'Faster! Faster!'], [61.8, 'jon', 'Hold on, I’m coming!'], [64.8, 5, 'Ah, young love…'],
  [78.2, 0, 'Don’t let him get away!'], [82.2, 2, 'To the bow!'], [86.0, 'jon', 'Almost there…'],
];
const CHEER_SHOW = 1.7;
const passX = (L, te, t) => W*0.9 + (te - t)*L.speed;   // where a passenger is: they start talking as they come on screen
function drawPassengers(L, t, now){
  CHEERS.forEach(([te, who], i) => { if (who === 'jon') return;
    const x = passX(L, te, t); if (x < -L.jh || x > W + L.jh) return;
    const cheer = t > te - 0.6 && t < te + CHEER_SHOW + 0.6;
    g.save(); g.globalAlpha = 0.97; drawPassenger(x, L.groundY - L.jh*0.05, L.jh*0.84, who, now + i, cheer); g.restore(); });
}
// a speech bubble with its tail pointing at whoever is talking
function speech(text, cx, by, tx, ty, a, jon){
  if (a <= 0) return;
  const fs = clamp(W*0.032, 13, 19); g.font = `italic 600 ${fs}px ${FONT.serif}`;
  const tw = g.measureText(text).width, pw = tw + fs*1.4, ph = fs*1.9;
  const x = clamp(cx - pw/2, 8, W - pw - 8), y = by - ph;
  g.save(); g.globalAlpha = a;
  const pop = 0.85 + 0.15*Math.min(1, a*1.5); g.translate(cx, by); g.scale(pop, pop); g.translate(-cx, -by);
  g.beginPath(); rrect(x, y, pw, ph, ph*0.45);
  const bx = clamp(tx, x + ph*0.5, x + pw - ph*0.5); g.moveTo(bx - fs*0.45, y + ph - 1); g.lineTo(tx, ty); g.lineTo(bx + fs*0.45, y + ph - 1);
  g.fillStyle = jon ? '#fff6e3' : '#f6efdf'; g.fill(); g.lineJoin = 'round'; g.lineWidth = 2; g.strokeStyle = PAL.out; g.stroke();
  g.beginPath(); rrect(x + 1.5, y + 1.5, pw - 3, ph - 3, ph*0.45 - 1.5); g.fillStyle = jon ? '#fff6e3' : '#f6efdf'; g.fill();
  g.fillStyle = jon ? PAL.wine : '#2a1a14'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + pw/2, y + ph/2 + 1); g.textBaseline = 'alphabetic';
  g.restore();
}
function drawCheers(L, t){
  CHEERS.forEach(([te, who, line]) => {
    const e = t - te, dur = who === 'jon' ? 2.2 : CHEER_SHOW; if (e < 0 || e > dur) return;
    const a = clamp(Math.min(e*7, (dur - e)*5), 0, 1);
    if (who === 'jon') speech(line, L.jx + L.jh*0.55, L.groundY - L.jh*1.32, L.jx + L.jh*0.08, L.groundY - L.jh*1.06, a, true);
    else { const x = passX(L, te, t), hy = L.groundY - L.jh*0.05 - L.jh*0.84*(PASS[who].kid ? 0.66 : 1)*1.08;
      speech(line, x, hy - L.jh*0.12, x, hy - L.jh*0.02, a, false); }
  });
}

/* learning by doing: the first time each move comes up, the song stops at the obstacle and waits for the right side */
const LESSON_KEY = 'sc-lessons';
let LESSONS = {}; try { LESSONS = JSON.parse(localStorage.getItem(LESSON_KEY) || '{}') || {}; } catch(e){}
function lessonCheck(t){
  if (S.lesson || S.paused || !S.running) return;
  for (const lane of [0, 1]) {
    if (LESSONS[lane]) continue;
    const n = S.notes.find(x => !x.judged && x.lane === lane); if (!n) continue;
    if (t >= n.t - 0.075 && t < n.t + 0.05) { lessonStart(n, lane); return; }
  }
}
function lessonStart(n, lane){
  S.lesson = { n, lane, at: nowS(), wrong: -9 };
  const gn = nodes.songplay.gn.gain, now = ac.currentTime;   // the music dips out, then everything holds still
  gn.cancelScheduledValues(now); gn.setValueAtTime(gn.value, now); gn.linearRampToValueAtTime(0.0001, now + 0.05);
  setTimeout(() => { if (S && S.lesson) ac.suspend(); }, 55);
}
function lessonInput(side){   // true if the lesson took the input
  const ls = S && S.lesson; if (!ls) return false;
  if (side !== ls.lane) { ls.wrong = nowS(); return true; }
  LESSONS[ls.lane] = true; try { localStorage.setItem(LESSON_KEY, JSON.stringify(LESSONS)); } catch(e){}
  S.lesson = null;
  ac.resume().then(() => { const gn = nodes.songplay.gn.gain, now = ac.currentTime; gn.cancelScheduledValues(now); gn.setValueAtTime(0.0001, now); gn.linearRampToValueAtTime(1, now + 0.06); });
  const t = songTime(); judgeNote(ls.n, 'perfect', t, 0);
  if (ls.lane === 0) S.jumpAt = t; else S.slideAt = t; S.flash[ls.lane] = t;
  return true;
}
function drawLesson(L, now){
  const ls = S.lesson; if (!ls) return;
  const e = now - ls.at, a = clamp(e*5, 0, 1), jump = ls.lane === 0, wrong = now - ls.wrong < 0.7;
  const col = jump ? PAL.gold : PAL.rose, verb = jump ? 'JUMP' : 'SLIDE';
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(3,2,6,.42)'; g.fillRect(0, L.top, W, L.fh);
  // show the move: a dotted arc over what's on the deck, or a dotted line under what hangs overhead
  const x = obX(L, ls.n, ls.n.t), j = L.jx;
  g.setLineDash([5, 6]); g.lineWidth = 2.5; g.strokeStyle = col; g.lineDashOffset = -now*30; g.beginPath();
  if (jump) { g.moveTo(j, L.groundY - L.jh*0.2); g.quadraticCurveTo((j + x)/2 + L.jh*0.2, L.groundY - L.jh*0.95, x + L.jh*0.45, L.groundY - L.jh*0.1); }
  else { g.moveTo(j, L.groundY - L.jh*0.25); g.lineTo(x + L.jh*0.6, L.groundY - L.jh*0.25); }
  g.stroke(); g.setLineDash([]);
  if (TOUCH) {   // phones: light up the side to tap; tap the other side and it points you over
    const left = jump, hx = left ? W*0.25 : W*0.75, hy = L.groundY + (L.bot - L.groundY)*0.45;   // down on the hull, clear of Jon
    const gr = g.createLinearGradient(left ? 0 : W, 0, W/2, 0); gr.addColorStop(0, rgba(col, 0.38)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(left ? 0 : W/2, L.top, W/2, L.fh);
    for (let k = 0; k < 3; k++) { const p = ((now*1.2 + k/3) % 1); g.beginPath(); g.arc(hx, hy, L.jh*(0.12 + p*0.32), 0, 7); g.strokeStyle = rgba(col, 0.8*(1 - p)); g.lineWidth = 3; g.stroke(); }
    tapTarget(hx, hy, L.jh*0.2, now, col);
    if (wrong) {   // the other side lit up for a moment, and arrows sweeping back to the right one
      const wx0 = left ? W/2 : 0; g.fillStyle = `rgba(150,140,160,${0.25*(1 - (now - ls.wrong)/0.7)})`; g.fillRect(wx0, L.top, W/2, L.fh);
      const dir = left ? -1 : 1, sx = W/2 + dir*(-W*0.1) + dir*((now*2) % 1)*W*0.08; g.fillStyle = rgba(col, 0.95); g.font = `700 ${clamp(W*0.07, 26, 44)}px ${FONT.type}`; g.textAlign = 'center';
      g.fillText(left ? '◀ ◀' : '▶ ▶', sx, hy + 10);
    }
    const shake = wrong ? Math.sin(now*60)*6*(1 - (now - ls.wrong)/0.7) : 0;
    const ty = L.top + L.fh*0.2;   // the words across the middle, so they fit on a phone
    g.textAlign = 'center'; g.fillStyle = PAL.cream; g.font = `400 ${clamp(W*0.085, 26, 44)}px ${FONT.deco}`; g.fillText(`TAP TO ${verb}`, W/2 + shake, ty);
    g.font = `700 ${clamp(W*0.032, 11, 14)}px ${FONT.type}`; g.fillStyle = rgba(col, 1); g.fillText(jump ? 'LEFT SIDE  ·  OVER IT' : 'RIGHT SIDE  ·  UNDER IT', W/2 + shake, ty + clamp(W*0.06, 20, 30));
  } else {   // computers: a small card with the keys
    const cw = Math.min(W - 40, 420), ch = 150, cx = (W - cw)/2, cy = L.top + L.fh*0.18, shake = wrong ? Math.sin(now*60)*8*(1 - (now - ls.wrong)/0.7) : 0;
    g.translate(shake, 0);
    g.fillStyle = 'rgba(10,8,18,.92)'; g.fillRect(cx, cy, cw, ch); g.strokeStyle = PAL.gold; g.lineWidth = 1; g.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1); g.strokeRect(cx + 5.5, cy + 5.5, cw - 11, ch - 11);
    g.textAlign = 'center'; g.fillStyle = col; g.font = `400 34px ${FONT.deco}`; g.fillText(verb + '!', W/2, cy + 48);
    const keys = jump ? ['F', '←', '↑'] : ['J', '→', '↓'], kw = 40, gap = 12, kx0 = W/2 - (keys.length*kw + (keys.length - 1)*gap)/2;
    keys.forEach((k, i) => { const kx = kx0 + i*(kw + gap), ky = cy + 64, pulse = 0.5 + 0.5*Math.sin(now*6);
      g.fillStyle = wrong ? rgba(col, 0.55) : rgba(col, 0.15 + pulse*0.2); g.fillRect(kx, ky, kw, 36); g.strokeStyle = col; g.lineWidth = 1.5; g.strokeRect(kx + 0.5, ky + 0.5, kw - 1, 35);
      g.fillStyle = PAL.cream; g.font = `700 17px ${FONT.type}`; g.fillText(k, kx + kw/2, ky + 24); });
    g.fillStyle = PAL.cream; g.font = `italic 500 16px ${FONT.serif}`; g.fillText(jump ? 'over what’s on the deck' : 'under what’s overhead', W/2, cy + ch - 18);
  }
  g.restore();
}
function tapTarget(x, y, r, now, col){   // a pulsing button-like target that says TAP
  const p = (Math.sin(now*6) + 1)/2;
  g.beginPath(); g.arc(x, y, r*(0.95 + p*0.08), 0, 7); g.fillStyle = rgba(col, 0.28); g.fill(); g.lineWidth = 3; g.strokeStyle = rgba(col, 0.95); g.stroke();
  g.beginPath(); g.arc(x, y, r*0.62, 0, 7); g.fillStyle = 'rgba(246,239,223,.92)'; g.fill();
  g.fillStyle = PAL.out; g.font = `700 ${r*0.42}px ${FONT.type}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAP', x, y + 1); g.textBaseline = 'alphabetic';
}
