/* ---------- the record: a 3D map inside "Lost in You" ----------
   Records play from the rim inward, so Jon walks the groove from the outer edge toward the label.
   Each song is one band of grooves; a band stays hidden in shadow until the song before it is beaten.
   Jon is the same painted figure as in the film, drawn onto a billboard every frame (paper-cut-out style). */
const MAP = { ready: false, building: null };
const REC = { R: 10, rOut: 9.55, rIn: 3.75, label: 3.3, top: 0.15 };
const edgeR = i => REC.rOut - albumEdges()[i]*(REC.rOut - REC.rIn);          // radius where track i begins (i = N: the run-out)
const bandMid = i => (edgeR(Math.min(i, ALBUM.tracks.length - 1)) + edgeR(Math.min(i + 1, ALBUM.tracks.length)))/2;
const nodeAng = i => 0.55 - i*0.82;                               // each stop sits a little further round the spiral
const spiralAt = (i, k) => { const r = bandMid(i) + (bandMid(i + 1) - bandMid(i))*k, a = nodeAng(i) + (nodeAng(i + 1) - nodeAng(i))*k; return [r*Math.cos(a), r*Math.sin(a)]; };
let THREE_MOD = null;
async function loadThree(){
  if (THREE_MOD) return THREE_MOD;
  if (window.THREE_MOD) return (THREE_MOD = window.THREE_MOD);    // built into the page (tools/build.py)
  {
    try { THREE_MOD = await import(new URL('three.module.min.js', location.href).href); }                 // shipped next to the page
    catch(e) { THREE_MOD = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js'); }   // or the public copy of the same version
  }
  return THREE_MOD;
}
function canvasTex(T, w, h, draw){ const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }

async function buildMap(){
  const T = await loadThree();
  const cvm = $('map');
  const R = new T.WebGLRenderer({ canvas: cvm, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.setSize(innerWidth, innerHeight, false);
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = T.SRGBColorSpace;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  // the void inside the record: the warm amber of the album cover, falling to night above
  scene.background = canvasTex(T, 8, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#12091a'); gr.addColorStop(.35, '#3b1d2c'); gr.addColorStop(.62, '#b5653a'); gr.addColorStop(.8, '#e8a35e'); gr.addColorStop(1, '#f3cf98'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  scene.fog = new T.Fog('#7a3f2e', 26, 62);
  const cam = new T.PerspectiveCamera(40, innerWidth/innerHeight, 0.1, 300);

  // ---- lights ----
  scene.add(new T.HemisphereLight('#ffd7a8', '#1c0d16', 0.85));
  const key = new T.DirectionalLight('#ffc38a', 2.3); key.position.set(-9, 16, 11); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 }); key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new T.DirectionalLight('#9fb2ff', 0.7); rim.position.set(8, 7, -13); scene.add(rim);
  const glow = new T.PointLight('#ffb36b', 14, 14, 1.6); glow.position.set(0, 2.2, 0); scene.add(glow);

  // ---- the record ----
  const N = ALBUM.tracks.length, W2 = 2048, px = r => r/REC.R*(W2/2);
  const gaps = []; for (let i = 1; i < N; i++) gaps.push(edgeR(i));            // the smooth bands between songs
  const grooves = (x, w, h, bump) => {
    x.fillStyle = bump ? '#000' : '#0a0a0c'; x.fillRect(0, 0, w, h);
    const cx = w/2, cy = h/2;
    for (let rr = px(REC.rIn - 0.25); rr < px(REC.rOut + 0.18); rr += 1.6) {            // fine spiral grooves
      const r = rr/(W2/2)*REC.R;
      const gap = gaps.some(g0 => Math.abs(r - g0) < 0.05);
      if (gap) continue;                                                                     // the smooth gap between two songs
      const v = 0.5 + 0.5*Math.sin(rr*2.1) + (Math.random() - 0.5)*0.25;
      x.strokeStyle = bump ? `rgba(255,255,255,${0.35 + v*0.4})` : `rgba(60,58,66,${0.25 + v*0.35})`;
      x.lineWidth = 0.8; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI*2); x.stroke();
    }
    // lead-in rim and the run-out area
    x.strokeStyle = bump ? '#fff' : '#26242b'; x.lineWidth = px(0.18); x.beginPath(); x.arc(cx, cy, px(REC.R - 0.12), 0, 7); x.stroke();
    x.fillStyle = bump ? '#222' : '#121115'; x.beginPath(); x.arc(cx, cy, px(REC.rIn - 0.25), 0, 7); x.fill();
  };
  const topMap = canvasTex(T, W2, W2, (x, w, h) => grooves(x, w, h, false));
  const bumpMap = canvasTex(T, W2, W2, (x, w, h) => grooves(x, w, h, true)); bumpMap.colorSpace = T.NoColorSpace;
  const topMat = new T.MeshPhysicalMaterial({ map: topMap, bumpMap, bumpScale: 1.4, roughness: 0.34, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.22, sheen: 0.4, sheenColor: new T.Color('#4a3a5a') });
  const sideMat = new T.MeshPhysicalMaterial({ color: '#0c0b0f', roughness: 0.4, clearcoat: 0.6 });
  const disc = new T.Mesh(new T.CylinderGeometry(REC.R, REC.R, 0.3, 192, 1), [sideMat, topMat, sideMat]);
  disc.receiveShadow = true; scene.add(disc);
  // the light catching the grooves: two opposing wedges that always face the camera, like real vinyl
  const sheenTex = canvasTex(T, 512, 512, (x, w, h) => {
    const cx = w/2, cy = h/2;
    for (const a0 of [0, Math.PI]) { const gr = x.createRadialGradient(cx, cy, w*0.16, cx, cy, w*0.5); gr.addColorStop(0, 'rgba(255,236,210,0)'); gr.addColorStop(.35, 'rgba(255,230,200,.5)'); gr.addColorStop(1, 'rgba(255,230,200,.08)');
      x.fillStyle = gr; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, w*0.5, a0 - 0.16, a0 + 0.16); x.closePath(); x.fill(); } });
  const sheen = new T.Mesh(new T.CircleGeometry(REC.rOut + 0.2, 96), new T.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false }));
  sheen.rotation.x = -Math.PI/2; sheen.position.y = REC.top + 0.012; scene.add(sheen);

  // ---- the label: the album cover ----
  const labelImg = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = LABEL_SRC; });
  const labelTex = canvasTex(T, 1024, 1024, (x, w, h) => {       // the real label from the pressing, edge to edge
    x.fillStyle = '#e8a64e'; x.fillRect(0, 0, w, h);
    if (labelImg) x.drawImage(labelImg, 0, 0, w, h);
    const sh = x.createRadialGradient(w/2, h/2, w*0.4, w/2, h/2, w/2); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,30,0,.18)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
  });
  const label = new T.Mesh(new T.CircleGeometry(REC.label, 96), new T.MeshStandardMaterial({ map: labelTex, roughness: 0.75 }));
  label.rotation.x = -Math.PI/2; label.position.y = REC.top + 0.004; label.receiveShadow = true; scene.add(label);
  const spindle = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 0.9, 24), new T.MeshStandardMaterial({ color: '#c9c3b8', metalness: 0.9, roughness: 0.25 }));
  spindle.position.y = 0.45; spindle.castShadow = true; scene.add(spindle);

  // ---- songs not yet reached: their bands sit under a veil of shadow ----
  const veils = [];
  for (let i = 0; i < N; i++) {
    const v = new T.Mesh(new T.RingGeometry(edgeR(i + 1) + 0.01, edgeR(i) - 0.01, 160), new T.MeshBasicMaterial({ color: '#0c0710', transparent: true, opacity: 0.9, depthWrite: false }));
    v.rotation.x = -Math.PI/2; v.position.y = REC.top + 0.02 + i*0.0004; scene.add(v); veils.push(v);
  }

  // ---- the path along the groove, and a stop for each song ----
  const dotTex = canvasTex(T, 64, 64, (x, w) => { const gr = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(.4, 'rgba(255,200,120,.8)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const pathPts = [];
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < 1; k += 1/22) { const [x, z] = spiralAt(i, k); pathPts.push({ i, x, z }); }
  const pathGeo = new T.BufferGeometry().setFromPoints(pathPts.map(p => new T.Vector3(p.x, REC.top + 0.05, p.z)));
  const pathMat = new T.PointsMaterial({ map: dotTex, size: 0.22, transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: '#ffd59a' });
  const path = new T.Points(pathGeo, pathMat); scene.add(path);
  const stops = [];
  for (let i = 0; i < N; i++) {
    const t = ALBUM.tracks[i], a = nodeAng(i), r = bandMid(i), grp = new T.Group(); grp.position.set(r*Math.cos(a), REC.top, r*Math.sin(a));
    const pad = new T.Mesh(new T.CylinderGeometry(0.48, 0.52, 0.08, 48), new T.MeshStandardMaterial({ color: t.outro ? '#d9c3ff' : '#e6b85c', metalness: 0.85, roughness: 0.3, emissive: t.outro ? '#5a3a8a' : '#6a3c10', emissiveIntensity: 0.6 }));
    pad.position.y = 0.04; pad.castShadow = true; pad.receiveShadow = true; grp.add(pad);
    const ring = new T.Mesh(new T.RingGeometry(0.58, 0.66, 48), new T.MeshBasicMaterial({ color: '#ffd59a', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.09; grp.add(ring);
    const tag = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false })); tag.center.set(0.5, -0.9); tag.position.y = 0.1; tag.scale.set(1.6, 0.8, 1); grp.add(tag);
    scene.add(grp); stops.push({ grp, pad, ring, tag, stars: -1 });
  }

  // ---- the tonearm, hovering over the band you are on ----
  const metal = new T.MeshStandardMaterial({ color: '#b9b4ad', metalness: 0.95, roughness: 0.22 });
  const armRig = new T.Group(); scene.add(armRig);   // the arm's stand keeps to the back right of the record as the camera goes round, so it never blocks the view
  const arm = new T.Group(); const pivot = new T.Vector3(REC.R + 2.4, 0, -REC.R*0.62); arm.position.copy(pivot); armRig.add(arm);
  const base = new T.Mesh(new T.CylinderGeometry(1.0, 1.15, 0.7, 48), new T.MeshStandardMaterial({ color: '#1a1820', metalness: 0.6, roughness: 0.4 })); base.position.y = 0.35; base.castShadow = true; arm.add(base);
  const post = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 2.8, 24), metal); post.position.y = 1.9; arm.add(post);
  const ARM_L = 11.4, beam = new T.Group(); beam.position.y = 3.2; arm.add(beam);   // high enough to pass over Jon's head
  const tube = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, ARM_L, 16), metal); tube.rotation.z = Math.PI/2; tube.position.x = -ARM_L/2; tube.castShadow = true; beam.add(tube);
  const head = new T.Mesh(new T.BoxGeometry(0.75, 0.22, 0.42), new T.MeshStandardMaterial({ color: '#2a2630', metalness: 0.5, roughness: 0.35 })); head.position.set(-ARM_L - 0.2, -0.12, 0); head.castShadow = true; beam.add(head);
  const cw = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.7, 32), metal); cw.rotation.z = Math.PI/2; cw.position.x = 0.8; beam.add(cw);
  const needleTo = r => {   // swing the arm so the head hangs over radius r
    let lo = 0, hi = Math.PI, best = 0, bd = 1e9;
    for (let s = 0; s <= 200; s++) { const a = lo + (hi - lo)*s/200, hx = pivot.x - Math.cos(a)*ARM_L, hz = pivot.z + Math.sin(a)*ARM_L, d = Math.abs(Math.hypot(hx, hz) - r); if (d < bd) { bd = d; best = a; } }
    return best;
  };

  // ---- Jon, painted fresh onto a billboard every frame ----
  const jc = document.createElement('canvas'); jc.width = 256; jc.height = 320;
  const jTex = new T.CanvasTexture(jc); jTex.colorSpace = T.SRGBColorSpace;
  const jon = new T.Sprite(new T.SpriteMaterial({ map: jTex, transparent: true })); jon.center.set(0.5, 0.06); jon.scale.set(2.2, 2.75, 1); scene.add(jon);
  const blob = new T.Mesh(new T.CircleGeometry(0.42, 32), new T.MeshBasicMaterial({ map: canvasTex(T, 64, 64, (x, w) => { const gr = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI/2; scene.add(blob);

  // ---- warm dust drifting in the light, and a heart over the label: the way home ----
  const dustN = 420, dp = new Float32Array(dustN*3); for (let i = 0; i < dustN; i++) { dp[i*3] = (Math.random() - .5)*30; dp[i*3 + 1] = Math.random()*9; dp[i*3 + 2] = (Math.random() - .5)*30; }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ map: dotTex, size: 0.12, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.55, color: '#ffcf96' })); scene.add(dust);
  const heartTex = canvasTex(T, 256, 256, (x) => { const real = g; g = x; heart(128, 150, 190, PAL.wine, PAL.gold); g = real; });
  const goal = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, opacity: 0.0 })); goal.position.set(0, 3.6, 0); goal.scale.set(1.0, 1.0, 1);   // high enough to leave the label readable
  scene.add(goal);

  Object.assign(MAP, { T, R, scene, cam, disc, label, sheen, veils, path, pathPts, stops, arm, armRig, pivotAng: Math.atan2(pivot.z, pivot.x), beam, needleTo, jon, jc, jTex, blob, dust, goal, glow, ready: true,
    camPos: new T.Vector3(0, 32, 0.1), camLook: new T.Vector3(0, 0, 0), at: 0, walk: null, fall: 0, armA: needleTo(REC.rOut - 0.3) });
  addEventListener('resize', () => { if (!MAP.ready) return; MAP.R.setSize(innerWidth, innerHeight, false); MAP.cam.aspect = innerWidth/innerHeight; MAP.cam.updateProjectionMatrix(); });
}

/* progress: how far round the record you are */
const songTracks = () => ALBUM.tracks.filter(t => !t.outro);
const allThreeStars = () => songTracks().every(t => (PROG.stars[t.n] || 0) >= 3);   // the full ending, on top
const allCleared = () => songTracks().every(t => (PROG.stars[t.n] || 0) >= 1);      // the way out: finish the album
function reachedIndex(){   // the furthest stop you can reach: beat a song (1★+) to go on; songs not added yet don't stand in the way;
  let i = 0; const tr = ALBUM.tracks;   // the Outro opens once every song is beaten (three stars everywhere adds the full ending)
  while (i < tr.length - 1 && ((PROG.stars[tr[i].n] || 0) >= 1 || !tr[i].song) && (!tr[i + 1].outro || allCleared())) i++;
  return i;
}
function homeStop(){   // where Jon waits when you open the record: the furthest song you can actually play
  const r = reachedIndex(); for (let i = r; i >= 0; i--) if (ALBUM.tracks[i].song) return i; return r;
}
function mapStep(d){   // walk to the next or previous stop you've reached (one stop at a time, along the groove)
  if (!MAP.ready || MAP.walk) return; const to = MAP.at + d; if (to < 0 || to > reachedIndex()) return;
  MAP.walk = { from: MAP.at, to, k: 0 }; $('stopPlay').disabled = true;
}
function tagFor(i){
  const t = ALBUM.tracks[i], st = PROG.stars[t.n] || 0;
  return canvasTex(MAP.T, 300, 150, (x, w, h) => {
    x.fillStyle = 'rgba(10,8,18,.78)'; x.beginPath(); x.roundRect(w*0.2, 6, w*0.6, 66, 33); x.fill();
    x.strokeStyle = t.outro ? '#d9c3ff' : '#e6b85c'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#f3e6c8'; x.font = '400 40px Limelight, Georgia, serif'; x.textAlign = 'center'; x.fillText(t.outro ? '✦' : String(t.n), w/2, 54);
    if (!t.outro) for (let k = 0; k < 3; k++) { const real = g; g = x; star(w/2 + (k - 1)*46, 112, 19, 0, k < st ? '#ffe29a' : 'rgba(243,230,200,.18)', k < st ? PAL.gold2 : null); g = real; }
  });
}
function refreshMap(instant){
  const at = reachedIndex(), N = ALBUM.tracks.length;
  MAP.veils.forEach((v, i) => { v.userData.target = i <= at ? 0 : 0.9; if (instant) v.material.opacity = v.userData.target; });
  MAP.stops.forEach((s, i) => { s.grp.visible = i <= at; const st = PROG.stars[ALBUM.tracks[i].n] || 0; if (s.stars !== st) { s.stars = st; s.tag.material.map = tagFor(i); s.tag.material.needsUpdate = true; } });
  const vis = MAP.pathPts.filter(p => p.i < at).length; MAP.path.geometry.setDrawRange(0, vis);
  MAP.at = homeStop();
  MAP.armTarget = MAP.needleTo(edgeR(at) - 0.3);
  showStop(MAP.at);
}
function mapFrame(now){
  if (!MAP.ready) return;
  const { T, cam } = MAP, dt = clamp(now - (MAP.last || now), 0, 0.1); MAP.last = now;
  // Jon's spot: standing on a stop, or walking the groove to the next one
  if (MAP.walk) { MAP.walk.k = Math.min(1, MAP.walk.k + dt/1.6); if (MAP.walk.k >= 1) { MAP.at = MAP.walk.to; MAP.walk = null; showStop(MAP.at); } }
  let jx, jz, moving = false;
  if (MAP.walk) { const fw = MAP.walk.to > MAP.walk.from, k = easeIO(MAP.walk.k); [jx, jz] = spiralAt(Math.min(MAP.walk.from, MAP.walk.to), fw ? k : 1 - k); moving = true; } else { const a = nodeAng(MAP.at), r = bandMid(MAP.at); jx = r*Math.cos(a); jz = r*Math.sin(a); }
  const fallY = MAP.fall > 0 ? Math.pow(MAP.fall, 2)*9 : 0;
  if (MAP.fall > 0) MAP.fall = Math.max(0, MAP.fall - dt/1.4);
  MAP.jon.position.set(jx, REC.top + 0.06 + fallY, jz); MAP.blob.position.set(jx, REC.top + 0.03, jz); MAP.blob.scale.setScalar(1 - Math.min(0.7, fallY/9));
  // paint Jon (facing the way he walks: forward along the groove is to his left as we look in)
  const real = g; g = MAP.jc.getContext('2d'); g.clearRect(0, 0, 256, 320);
  const land = MAP.fall > 0 ? 0 : clamp(1 - (now - (MAP.landT || -9))/0.35, 0, 1);
  g.save(); g.translate(128, 312); g.scale(1 + land*0.12, 1 - land*0.12); g.translate(-128, -312);
  drawJon(128, 312, 270, { running: moving, amp: 0.6, phase: (now*1.4) % 1, idle: now*0.8, jumpK: MAP.fall > 0 ? 0.5 : -1, kick: false, stumble: 0, shades: true, glow: 0, dir: MAP.walk ? -1 : 1, lookUp: !moving });
  g.restore(); g = real; MAP.jTex.needsUpdate = true;
  if (MAP.fall === 0 && MAP.wasFalling) { MAP.wasFalling = false; MAP.landT = now; }
  if (MAP.fall > 0) MAP.wasFalling = true;
  // camera: outside Jon, looking in across the record toward the label
  const r = Math.hypot(jx, jz) || 1, ux = jx/r, uz = jz/r;
  // high and well back, so most of the record is in view and you can see where Jon is on it (he stands on the near side)
  const asp = innerWidth/innerHeight, el = (asp < 1 ? 60 : 52)*Math.PI/180, D = asp < 1 ? 40 : 26.5;
  const look = new T.Vector3(jx*0.32, 0, jz*0.32), want = new T.Vector3(look.x + ux*Math.cos(el)*D, Math.sin(el)*D, look.z + uz*Math.cos(el)*D);
  const intro = clamp((now - (MAP.enterT || 0))/2.6, 0, 1), k = MAP.first ? easeIO(intro) : 1;
  const from = new T.Vector3(0, 30, 0.1);
  const target = from.clone().lerp(want, k), lookT = new T.Vector3(0, 0, 0).lerp(look, k);
  const s = 1 - Math.pow(0.002, dt);
  MAP.camPos.lerp(target, MAP.first && intro < 1 ? 1 : s); MAP.camLook.lerp(lookT, MAP.first && intro < 1 ? 1 : s);
  cam.position.copy(MAP.camPos); cam.lookAt(MAP.camLook);
  // keep Jon clear of the song card: the picture's centre moves into the open space beside or above it
  const card = $('mapUI').querySelector('.stopCard').getBoundingClientRect(), side = card.left > innerWidth*0.45;
  const ox = side ? (innerWidth - card.left)*0.5 : 0, oy = side ? 0 : (innerHeight - card.top)*0.5;
  cam.setViewOffset(innerWidth + 2*ox, innerHeight + 2*oy, 2*ox, 2*oy, innerWidth, innerHeight);
  cam.fov = asp < 1 ? 2*Math.atan(Math.tan(20*Math.PI/180)/asp)*180/Math.PI : 40;
  cam.aspect = (innerWidth + 2*ox)/(innerHeight + 2*oy); cam.updateProjectionMatrix();
  // the sheen follows the camera, veils lift as songs are beaten, the arm swings in, dust drifts
  MAP.sheen.rotation.z = Math.atan2(cam.position.z, cam.position.x) + Math.PI/2;
  // the label turns to read upright toward the camera (the grooves look the same all the way round, so the record seems to turn)
  let want2 = Math.PI/2 - Math.atan2(cam.position.z, cam.position.x), d2 = want2 - MAP.label.rotation.z; d2 = Math.atan2(Math.sin(d2), Math.cos(d2));
  MAP.label.rotation.z += d2*Math.min(1, dt*2.5);
  MAP.veils.forEach(v => { const tg = v.userData.target ?? 0.9; v.material.opacity += (tg - v.material.opacity)*Math.min(1, dt*1.5); v.visible = v.material.opacity > 0.01; });
  { let d = (MAP.pivotAng - (Math.atan2(cam.position.z, cam.position.x) - 2.45)) - MAP.armRig.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); MAP.armRig.rotation.y += MAP.first && intro < 1 ? d : d*Math.min(1, dt*3); }
  MAP.armA += ((MAP.armTarget ?? MAP.armA) - MAP.armA)*Math.min(1, dt*1.2); MAP.arm.rotation.y = MAP.armA; MAP.beam.rotation.z = -0.025 + Math.sin(now*0.8)*0.006;
  MAP.stops.forEach((st, i) => { st.ring.scale.setScalar(1 + 0.08*Math.sin(now*3 + i)); st.ring.material.opacity = i === MAP.at && !MAP.walk ? 0.85 : 0.35; st.tag.center.y += ((i === MAP.at && !MAP.walk ? -2.95 : -0.9) - st.tag.center.y)*Math.min(1, dt*6) + Math.sin(now*2 + i)*0.002; });   // offsets in screen space: over Jon's head where he stands
  const p = MAP.dust.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt*0.18; if (y > 9) y = 0; p.setY(i, y); } p.needsUpdate = true;
  MAP.goal.material.opacity = 0.55 + 0.25*Math.sin(now*2); MAP.goal.position.y = 4.4 + Math.sin(now*1.3)*0.15; MAP.glow.intensity = 12 + 3*Math.sin(now*2);
  MAP.R.render(MAP.scene, cam);
}
async function enterMap(first){
  mode = 'map'; ['title', 'results', 'pause'].forEach(id => $(id).hidden = true);
  $('mapLoading').hidden = false; $('mapUI').hidden = true;
  if (!MAP.ready) { try { MAP.building = MAP.building || buildMap(); await MAP.building; } catch(e) { console.error(e); $('mapLoading').textContent = 'This browser could not draw the record (WebGL is off).'; return; } }
  $('mapLoading').hidden = true; cv.hidden = true; $('map').hidden = false; $('mapUI').hidden = false;
  MAP.first = !!first; MAP.enterT = nowS(); MAP.fall = first ? 1 : 0; MAP.walk = null;
  MAP.camPos.set(0, 30, 0.1); MAP.camLook.set(0, 0, 0);
  refreshMap(!!first); updateMapStars();
  startAmbience();
}
function leaveMap(){ $('map').hidden = true; $('mapUI').hidden = true; cv.hidden = false; }
function updateMapStars(){ const n = songTracks().reduce((a, t) => a + (PROG.stars[t.n] || 0), 0); $('mapStars').textContent = `★ ${n} / ${songTracks().length*3}`; wayHome($('mapWay')); }
// the way home: a record for each song, joined up to the heart; `fresh` (a track number) pops in as just beaten
function wayHome(el, fresh){
  const tr = songTracks(), on = t => (PROG.stars[t.n] || 0) >= 1, done = tr.filter(on).length, all = done === tr.length;
  const row = tr.map((t, i) => (i ? `<i class="link${on(t) ? ' on' : ''}"></i>` : '') +
    `<b class="seg${on(t) ? ' on' : t.song ? '' : ' soon'}${t.n === fresh ? ' new' : ''}" title="${t.n} · ${t.title}${on(t) ? ' · beaten' : t.song ? '' : ' · coming soon'}"></b>`).join('');
  const left = tr.length - done, label = all ? 'Every song beaten · the way home is open'
    : fresh ? `${tr.find(t => t.n === fresh).title} beaten · ${left} more to get home` : `The way home · ${done} of ${tr.length} songs`;
  el.innerHTML = `<div class="wayRow" role="img" aria-label="${done} of ${tr.length} songs beaten">${row}<i class="link${all ? ' on' : ''}"></i><b class="home${all ? ' on' : ''}">♥</b></div><span>${label}</span>`;
}
function showStop(i){
  const t = ALBUM.tracks[i], st = PROG.stars[t.n] || 0;
  lockXplus(t.n);
  $('stopNum').textContent = t.outro ? 'The Outro' : `Track ${t.n} of ${ALBUM.tracks.length}`;
  $('stopTitle').textContent = t.title || `Track ${t.n}`;
  $('stopStars').innerHTML = t.outro ? '' : '★'.repeat(st) + '<i>' + '★'.repeat(3 - st) + '</i>';
  const ready = !!t.song, r = reachedIndex();
  $('stopPlay').disabled = !ready; $('stopPlay').textContent = ready ? (t.outro ? 'Go home' : 'Play') : 'Coming soon';
  $('stopPrev').disabled = i <= 0; $('stopNext').disabled = i >= r;
  const best = ready ? Math.max(0, ...Object.keys(PROG.best).filter(k => k.startsWith(t.n + '-')).map(k => PROG.best[k])) : 0;
  $('stopNote').textContent = t.outro ? (allThreeStars() ? 'Three stars on every song. The long way home.' : 'Beat every song to find the way out. Three stars on all of them for the full ending.')
    : ready ? (best ? `High score ${best.toLocaleString()} · beat every song to get back to her` : 'Beat every song to get back to her.') : 'This song hasn’t been pressed yet.';
}
