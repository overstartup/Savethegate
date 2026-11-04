// Serious redesigns of stage species (group A) — replaces the drawing of
// existing SPECIES entries; see render/species.js for the draw contract.
// Abyssal Rift, Glacial Peak and Oasis Citadel casts: stylised dark-fantasy
// creatures with layered shading (own lighting model below), sharp
// silhouettes and one glowing accent each.
// Every top-level name is prefixed `sxa` (the standalone build shares one
// scope).
import { SPECIES } from './species.js';
import { crBlink, drawGlow, crMix } from './creatures.js';

const SXA_TAU = Math.PI * 2;

// ------------------------------------------------------------ helpers ----

// hit-flash amount, same rule as creatures.js crPalette
function sxaFlash(m) { return m.hitFlash > 0 ? ((m.boss || m.elite) ? 0.3 : 0.85) : 0; }
// flash a fixed detail colour toward white
function sxaF(f, c) { return f > 0 ? crMix(c, '#ffffff', f * 0.7) : c; }

// A 5-tone material (highlight → light → mid → shade → dark) + rim light,
// flashed white on hit. Cached per colour set + flash level.
const sxaPalCache = new Map();
function sxaP(f, hi, light, primary, shade, dark, rim) {
  const key = hi + light + primary + shade + dark + rim + f;
  let p = sxaPalCache.get(key);
  if (!p) {
    const w = (c, k) => (f > 0 ? crMix(c, '#ffffff', Math.min(1, f * k)) : c);
    const d = w(dark, 0.5);
    p = { hi: w(hi, 0.6), light: w(light, 0.8), primary: w(primary, 1), shade: w(shade, 0.85), dark: d, rim, line: crMix(d, '#000000', 0.55) };
    if (sxaPalCache.size > 600) sxaPalCache.clear();
    sxaPalCache.set(key, p);
  }
  return p;
}

// Volume shading: 4-stop radial body gradient lit from the top-left, an
// optional texture pass (clipped to the body), a core shadow band hugging
// the lower edge with a sliver of bounce light under it, a rim light and a
// dark ink outline. Gradients are cached per size + material.
const sxaGradCache = new Map();
function sxaShade(ctx, pathFn, P, r, tex, lw) {
  const A = ctx.globalAlpha;
  pathFn();
  const rr = r >= 4 ? Math.round(r) : Math.max(0.25, Math.round(r * 4) / 4);
  const key = rr + P.hi + P.light + P.primary + P.shade;
  let g = sxaGradCache.get(key);
  if (!g) {
    g = ctx.createRadialGradient(-rr * 0.38, -rr * 0.48, rr * 0.02, -rr * 0.1, -rr * 0.12, rr * 1.25);
    g.addColorStop(0, P.hi);
    g.addColorStop(0.16, P.light);
    g.addColorStop(0.55, P.primary);
    g.addColorStop(1, P.shade);
    if (sxaGradCache.size > 3000) sxaGradCache.clear();
    sxaGradCache.set(key, g);
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (tex) { tex(); ctx.globalAlpha = A; }
  // core shadow
  ctx.translate(-r * 0.08, -r * 0.3);
  pathFn();
  ctx.globalAlpha = A * 0.5;
  ctx.strokeStyle = P.dark;
  ctx.lineWidth = r * 0.46;
  ctx.stroke();
  // rim light
  ctx.translate(-r * 0.02, r * 0.19);
  pathFn();
  ctx.globalAlpha = A * 0.8;
  ctx.strokeStyle = P.rim;
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
  ctx.restore();
  if (lw !== 0) {
    pathFn();
    ctx.strokeStyle = P.line;
    ctx.lineWidth = lw || Math.max(1.2, r * 0.055);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// flat fill + outline for small parts that don't need full shading
function sxaFlat(ctx, fill, line, lw) {
  ctx.fillStyle = fill; ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

// soft specular glint
function sxaSpec(ctx, x, y, w, h, rot, a) {
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * a;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x, y, w, h, rot, 0, SXA_TAU); ctx.fill();
  ctx.globalAlpha = A;
}

// tapered quad between two points
function sxaSeg(ctx, x1, y1, x2, y2, w1, w2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
  ctx.lineTo(x2 + nx * w2, y2 + ny * w2);
  ctx.lineTo(x2 - nx * w2, y2 - ny * w2);
  ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
  ctx.closePath();
}

// jointed limb through pts [[x,y]…] tapering w0 → w1, flat lit with a
// highlight edge; last segment comes to a point when tip is true
function sxaLimb(ctx, pts, w0, w1, fill, line, hiCol, tip) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const wa = w0 + (w1 - w0) * (i / n), wb = tip && i === n - 1 ? 0.4 : w0 + (w1 - w0) * ((i + 1) / n);
    sxaSeg(ctx, a[0], a[1], b[0], b[1], wa, wb);
    sxaFlat(ctx, fill, line, Math.max(1, w0 * 0.35));
    if (hiCol) {
      ctx.strokeStyle = hiCol; ctx.lineWidth = Math.max(0.8, wa * 0.35); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0] - wa * 0.3, a[1] - wa * 0.5); ctx.lineTo(b[0] - wb * 0.3, b[1] - wb * 0.5); ctx.stroke();
    }
  }
}

// one closed tapered ribbon along a spine (tentacles, tails, strips)
function sxaTaper(ctx, pts, w0, w1) {
  const n = pts.length;
  ctx.beginPath();
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < n; j++) {
      const i = pass ? n - 1 - j : j;
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const w = (w0 + (w1 - w0) * (i / (n - 1))) * (pass ? -1 : 1);
      const x = pts[i][0] - (dy / d) * w, y = pts[i][1] + (dx / d) * w;
      if (j === 0 && pass === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// Glowing predator eyes: dark socket, slanted almond lit in `col`, a hot
// white core and a soft bloom. Inner corners low = a glare.
function sxaEyes(ctx, x, y, gap, w, h, col, blink, bloom, tilt = 0.38) {
  for (const s of [-1, 1]) {
    const ex = x + s * gap;
    ctx.save();
    ctx.translate(ex, y);
    ctx.rotate(-s * tilt);
    ctx.fillStyle = 'rgba(4,2,8,0.7)';
    ctx.beginPath(); ctx.ellipse(0, -h * 0.15, w * 1.35, h * 1.9, 0, 0, SXA_TAU); ctx.fill();
    ctx.scale(1, Math.max(0.15, blink));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, -h * 1.5, w, 0);
    ctx.quadraticCurveTo(0, h * 0.9, -w, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-s * w * 0.12, -h * 0.12, w * 0.32, h * 0.38, 0, 0, SXA_TAU); ctx.fill();
    ctx.restore();
    if (bloom > 0) drawGlow(ctx, ex, y, w * 2.4, col, bloom);
  }
}

// a single glowing pinpoint eye (small or side eyes)
function sxaDot(ctx, x, y, s, col, bloom) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, s, 0, SXA_TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - s * 0.2, y - s * 0.2, s * 0.45, 0, SXA_TAU); ctx.fill();
  if (bloom > 0) drawGlow(ctx, x, y, s * 3, col, bloom);
}

// row of fangs along a line from (x0,y0) to (x1,y1); dir = +1 point down
function sxaFangs(ctx, x0, y0, x1, y1, n, len, w, dir, col, line, seed = 0) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    const l = len * (0.6 + 0.4 * Math.abs(Math.sin(i * 2.3 + seed)));
    ctx.moveTo(x - w, y); ctx.lineTo(x + w * 0.2, y + dir * l); ctx.lineTo(x + w, y);
  }
  ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = 0.8; ctx.stroke(); }
}

// crystal shard (elongated faceted gem) rooted at (x,y), pointing along ang
function sxaShard(ctx, x, y, ang, len, wid, lightC, darkC, line) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-wid, 0); ctx.lineTo(-wid * 0.8, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(0, 0); ctx.closePath();
  ctx.fillStyle = lightC; ctx.fill();
  ctx.beginPath(); ctx.moveTo(wid, 0); ctx.lineTo(wid * 0.8, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(0, 0); ctx.closePath();
  ctx.fillStyle = darkC; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-wid, 0); ctx.lineTo(-wid * 0.8, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(wid * 0.8, -len * 0.7); ctx.lineTo(wid, 0);
  ctx.strokeStyle = line; ctx.lineWidth = Math.max(0.8, wid * 0.25); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

// ====================================================== ABYSSAL RIFT ====

// Riftclaw — abyssal crab: wide serrated carapace in blood-dark chitin,
// rift-glow cracks, an oversized crusher claw and a cutter claw with
// toothed fingers, spiked walking legs.
function sxaCrab(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const sc = m.anim * (ph === 'burst' ? 5.5 : 3.2);
  const P = sxaP(f, '#f09a8a', '#b8484e', '#7a2432', '#3a0c18', '#100308', '#5ae8ff');
  const legC = sxaF(f, '#5a1c26'), legHi = sxaF(f, '#b0585a'), ink = P.line;
  const glow = '#5ae8ff';
  ctx.translate(0, -Math.abs(Math.sin(sc)) * r * 0.05);
  // walking legs, 4 per side, alternating gait, needle tips
  for (const side of [-1, 1]) {
    for (let i = 3; i >= 0; i--) {
      const g = Math.sin(sc + i * 1.9 + (side > 0 ? Math.PI : 0));
      const by = r * (-0.12 + i * 0.16);
      const bx = side * r * 0.55;
      const kx = side * r * (1.02 + i * 0.03), ky = by - r * 0.3 + g * r * 0.08;
      const fx = side * r * (1.22 - i * 0.02) + side * g * r * 0.05, fy = by + r * 0.28 - Math.max(0, g) * r * 0.1;
      sxaLimb(ctx, [[bx, by], [kx, ky], [fx, fy]], r * 0.085, r * 0.05, legC, ink, legHi, true);
    }
  }
  // carapace
  const shell = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, -r * 0.08);
    ctx.lineTo(-r * 0.8, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.74, -r * 0.62, 0, -r * 0.68);
    ctx.quadraticCurveTo(r * 0.74, -r * 0.62, r * 0.8, -r * 0.2);
    ctx.lineTo(r * 1.0, -r * 0.08);
    ctx.lineTo(r * 0.78, r * 0.06);
    for (let i = 0; i <= 8; i++) {
      const u = 0.78 - i * (1.56 / 8), yy = 0.16 + 0.14 * (1 - (u / 0.78) * (u / 0.78));
      ctx.lineTo(r * u, r * yy);
      if (i < 8) { const un = u - 0.0975; const yn = 0.16 + 0.14 * (1 - (un / 0.78) * (un / 0.78)); ctx.lineTo(r * un, r * (yn + 0.09)); }
    }
    ctx.lineTo(-r * 0.78, r * 0.06);
    ctx.closePath();
  };
  sxaShade(ctx, shell, P, r, () => {
    // cervical groove (H) + rugged plates
    ctx.strokeStyle = P.dark; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.6); ctx.quadraticCurveTo(-r * 0.12, -r * 0.25, -r * 0.3, r * 0.2);
    ctx.moveTo(r * 0.3, -r * 0.6); ctx.quadraticCurveTo(r * 0.12, -r * 0.25, r * 0.3, r * 0.2);
    ctx.moveTo(-r * 0.2, -r * 0.2); ctx.lineTo(r * 0.2, -r * 0.2);
    ctx.stroke();
    // tubercle studs
    ctx.globalAlpha = A * 0.75; ctx.fillStyle = P.light;
    for (const [x, y, s] of [[-0.55, -0.3, 0.05], [-0.45, -0.05, 0.04], [0.5, -0.32, 0.05], [0.58, -0.08, 0.04], [0, -0.45, 0.045], [-0.08, -0.05, 0.035], [0.12, 0.02, 0.03]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SXA_TAU); ctx.fill(); }
    // glowing rift cracks
    ctx.globalAlpha = A * 0.9; ctx.strokeStyle = glow; ctx.lineWidth = Math.max(0.9, r * 0.03);
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.42); ctx.lineTo(-r * 0.48, -r * 0.3); ctx.lineTo(-r * 0.52, -r * 0.14); ctx.lineTo(-r * 0.4, r * 0.0);
    ctx.moveTo(r * 0.42, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.36); ctx.lineTo(r * 0.44, -r * 0.24);
    ctx.stroke();
  });
  sxaSpec(ctx, -r * 0.3, -r * 0.48, r * 0.22, r * 0.06, -0.25, 0.35);
  // barnacle crust on one shoulder
  ctx.fillStyle = sxaF(f, '#cfc6b0'); ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
  for (const [x, y, s] of [[0.66, -0.3, 0.07], [0.74, -0.16, 0.05], [0.58, -0.44, 0.045]]) {
    ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SXA_TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.arc(x * r, y * r, s * r * 0.4, 0, SXA_TAU); ctx.fill(); ctx.fillStyle = sxaF(f, '#cfc6b0');
  }
  // eyes sunk in the front notch, on short armoured stalks
  for (const side of [-1, 1]) {
    ctx.fillStyle = legC;
    ctx.beginPath(); ctx.ellipse(side * r * 0.16, r * 0.08, r * 0.08, r * 0.1, 0, 0, SXA_TAU); ctx.fill();
  }
  sxaEyes(ctx, 0, r * 0.06, r * 0.16, r * 0.085, r * 0.055, glow, crBlink(m, t), 0.6, 0.45);
  // mouthparts working under the front edge
  const chew = Math.sin(t * 9 + m.seed) * r * 0.03;
  ctx.fillStyle = sxaF(f, '#2a0a12');
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.04, r * 0.24); ctx.lineTo(side * (r * 0.16 + chew), r * 0.26); ctx.lineTo(side * r * 0.06, r * 0.42 + (ph === 'windup' ? r * 0.05 : 0));
    ctx.closePath(); ctx.fill();
  }
  // claws on jointed arms, raised in front of the face
  const snap = ph === 'windup' ? 1 : (Math.sin(t * 5 + m.seed) * 0.5 + 0.5) * 0.55;
  for (const side of [-1, 1]) {
    const big = side > 0 ? 1.15 : 0.95;
    const sw = Math.sin(sc * 0.5 + side) * 0.08;
    const sx = side * r * 0.4, sy = r * 0.22;
    const ex = side * r * 0.86, ey = r * 0.46;
    const wx = side * r * 0.74, wy = r * 0.12;
    sxaLimb(ctx, [[sx, sy], [ex, ey], [wx, wy]], r * 0.13, r * 0.12, legC, ink, legHi, false);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(side * r * big, r * big);
    ctx.rotate(-0.35 + sw - (ph === 'windup' ? 0.25 : 0));
    const k = 1 / (r * big);
    // dactyl (movable finger) swings open behind the palm's edge
    const tipC = sxaF(f, '#efe2cc');
    ctx.save();
    ctx.translate(0.08, -0.22);
    ctx.rotate(0.1 + snap * 0.6);
    sxaShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-0.07, 0.04);
      ctx.quadraticCurveTo(0.16, -0.12, 0.06, -0.56);
      ctx.lineTo(0.01, -0.4); ctx.lineTo(-0.03, -0.36); ctx.lineTo(-0.04, -0.26); ctx.lineTo(-0.08, -0.2); ctx.lineTo(-0.08, -0.1);
      ctx.closePath();
    }, P, 0.3, null, k * Math.max(1.2, r * 0.05));
    ctx.fillStyle = tipC;
    ctx.beginPath(); ctx.moveTo(0.06, -0.56); ctx.lineTo(0.1, -0.4); ctx.lineTo(0.02, -0.42); ctx.closePath(); ctx.fill();
    ctx.restore();
    // propodus: compact palm + long hooked fixed finger, toothed inner edge
    sxaShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-0.15, 0.14);
      ctx.quadraticCurveTo(-0.26, -0.08, -0.16, -0.28);
      ctx.quadraticCurveTo(-0.16, -0.6, -0.02, -0.82);
      ctx.lineTo(-0.03, -0.62); ctx.lineTo(0.0, -0.58); ctx.lineTo(-0.01, -0.48); ctx.lineTo(0.03, -0.44); ctx.lineTo(0.02, -0.34);
      ctx.lineTo(0.1, -0.26);
      ctx.quadraticCurveTo(0.2, -0.08, 0.15, 0.12);
      ctx.quadraticCurveTo(0.0, 0.2, -0.15, 0.14);
      ctx.closePath();
    }, P, 0.42, () => {
      ctx.fillStyle = P.light;
      for (const [x, y] of [[-0.12, -0.05], [-0.05, -0.16], [0.05, -0.02], [-0.08, 0.07], [-0.11, -0.3]]) { ctx.beginPath(); ctx.arc(x, y, 0.025, 0, SXA_TAU); ctx.fill(); }
    }, k * Math.max(1.2, r * 0.05));
    ctx.fillStyle = tipC;
    ctx.beginPath(); ctx.moveTo(-0.02, -0.82); ctx.lineTo(-0.1, -0.62); ctx.lineTo(-0.03, -0.62); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// Abyssal Medusa — translucent violet bell with glowing inner organs,
// barbed margin, slanted glowing eyes, frilled oral arms and long stinging
// tentacles studded with nematocyst lights.
function sxaJelly(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const pulse = Math.sin(t * 3.6 + m.seed);
  const squeeze = ph === 'windup' ? 0.22 : ph === 'burst' ? -0.16 : pulse * 0.07;
  const glow = '#ff5ad8', glow2 = '#8af4ff';
  const P = sxaP(f, '#f0c8ff', '#a070d0', '#5a2a8a', '#2a0c48', '#0c0418', '#ff8ae8');
  // stinging tentacles
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x0 = (-0.66 + i * 0.22) * r;
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push([x0 * (1 + k * 0.05) + Math.sin(t * 4 - k * 0.8 + i * 1.7 + m.seed) * r * 0.05 * k, r * 0.28 + k * r * 0.2 * (1 - squeeze)]);
    ctx.globalAlpha = A * 0.8;
    sxaTaper(ctx, pts, r * 0.045, r * 0.008);
    ctx.fillStyle = sxaF(f, i % 2 ? '#7a3aa8' : '#4a1a70'); ctx.fill();
    ctx.globalAlpha = A;
    if (i % 2 === 0) for (const k of [2, 4]) { ctx.fillStyle = glow2; ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], r * 0.03 + 0.5, 0, SXA_TAU); ctx.fill(); }
  }
  // oral arms: three frilled ribbons from the mouth
  for (let i = -1; i <= 1; i++) {
    const pts = [];
    for (let k = 0; k <= 5; k++) pts.push([i * r * 0.14 + Math.sin(t * 3 - k * 0.9 + i * 2) * r * 0.08 * (k / 5 + 0.3), r * 0.25 + k * r * 0.17]);
    sxaTaper(ctx, pts, r * 0.1, r * 0.02);
    ctx.globalAlpha = A * 0.9;
    sxaFlat(ctx, sxaF(f, '#8a3ab8'), sxaF(f, '#d88aff'), Math.max(0.8, r * 0.025));
    ctx.globalAlpha = A;
  }
  ctx.save();
  ctx.scale(1 + squeeze, 1 - squeeze);
  // bell with barbed scalloped margin
  const bell = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, r * 0.22);
    ctx.bezierCurveTo(-r * 1.0, -r * 0.55, -r * 0.5, -r * 0.88, 0, -r * 0.86);
    ctx.bezierCurveTo(r * 0.5, -r * 0.88, r * 1.0, -r * 0.55, r * 0.92, r * 0.22);
    for (let i = 8; i >= 0; i--) {
      const x = -r * 0.92 + (i / 8) * r * 1.84;
      ctx.lineTo(x + r * 0.1, r * 0.3);
      ctx.lineTo(x + r * 0.03, r * 0.42);
      ctx.lineTo(x, r * 0.24);
    }
    ctx.closePath();
  };
  ctx.globalAlpha = A * 0.86;
  sxaShade(ctx, bell, P, r, () => {
    // radial canals
    ctx.globalAlpha = A * 0.35; ctx.strokeStyle = P.hi; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(i * r * 0.05, -r * 0.75); ctx.quadraticCurveTo(i * r * 0.22, -r * 0.3, i * r * 0.3, r * 0.3); }
    ctx.stroke();
  });
  ctx.globalAlpha = A;
  // glowing gonads (horseshoe organs) seen through the bell
  const beat = 0.55 + 0.35 * Math.sin(t * 3 + m.seed) + (ph === 'windup' ? 0.4 : 0);
  ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1.2, r * 0.06); ctx.lineCap = 'round';
  ctx.globalAlpha = A * Math.min(1, beat);
  for (const [cx, cy] of [[-0.42, -0.25], [0.42, -0.25]]) { ctx.beginPath(); ctx.arc(cx * r, cy * r, r * 0.13, 0.4, Math.PI * 1.9); ctx.stroke(); }
  ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 0.35, r * 0.6, glow, 0.25 * beat);
  sxaSpec(ctx, -r * 0.38, -r * 0.58, r * 0.22, r * 0.07, -0.55, 0.55);
  sxaSpec(ctx, r * 0.48, -r * 0.45, r * 0.06, r * 0.03, 0.6, 0.4);
  // eyes + dark maw slit
  sxaEyes(ctx, 0, -r * 0.05, r * 0.24, r * 0.15, r * 0.08, glow2, crBlink(m, t), 0.5, 0.5);
  ctx.fillStyle = 'rgba(10,2,20,0.85)';
  const mo = ph === 'windup' ? 1 : 0.3;
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.12); ctx.lineTo(0, r * (0.18 + mo * 0.08)); ctx.lineTo(r * 0.12, r * 0.12); ctx.lineTo(0, r * 0.15); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Rift urchin — black-violet test bristling with long needle spines,
// glowing venom tips, a toothed Aristotle's-lantern maw and two cold eyes.
function sxaUrchin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const coil = ph === 'windup' ? 1 : 0;
  const glow = '#ff6ad0';
  const P = sxaP(f, '#d8a8f0', '#7a4a9a', '#3a1a52', '#1a0828', '#080210', '#ff8ae8');
  const spC = sxaF(f, '#2a1036'), spHi = sxaF(f, '#9a6ab8');
  ctx.save();
  ctx.rotate(m.anim * 0.9 + m.seed);
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * SXA_TAU, long = k % 2 ? 1.0 : 1.35;
    const len = r * long * (1 + coil * 0.15);
    const ca = Math.cos(a), sa = Math.sin(a);
    sxaSeg(ctx, ca * r * 0.45, sa * r * 0.45, ca * len, sa * len, r * 0.075, 0.3);
    ctx.fillStyle = spC; ctx.fill();
    ctx.strokeStyle = spHi; ctx.lineWidth = Math.max(0.6, r * 0.025);
    ctx.beginPath(); ctx.moveTo(ca * r * 0.5 - sa * r * 0.02, sa * r * 0.5 + ca * r * 0.02); ctx.lineTo(ca * len * 0.92, sa * len * 0.92); ctx.stroke();
    if (long > 1) { ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ca * len, sa * len, r * 0.045 + 0.4, 0, SXA_TAU); ctx.fill(); }
  }
  ctx.restore();
  sxaShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, SXA_TAU); }, P, r * 0.62, () => {
    ctx.fillStyle = P.light; ctx.globalAlpha = A * 0.55;
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 7; k++) {
      const a = k / 7 * SXA_TAU + ring * 0.45 + m.anim * 0.3, rr = r * (0.22 + ring * 0.2);
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr - r * 0.08, r * 0.035, 0, SXA_TAU); ctx.fill();
    }
  });
  sxaSpec(ctx, -r * 0.22, -r * 0.3, r * 0.14, r * 0.06, -0.6, 0.4);
  // eyes
  sxaEyes(ctx, 0, -r * 0.14, r * 0.2, r * 0.13, r * 0.07, glow, crBlink(m, t), 0.45, 0.45);
  // lantern maw: dark ring with five converging teeth
  const open = 0.5 + coil * 0.5;
  ctx.fillStyle = sxaF(f, '#0a0210');
  ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.17 * (0.7 + open * 0.3), 0, SXA_TAU); ctx.fill();
  ctx.fillStyle = sxaF(f, '#e8e0f0');
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * SXA_TAU - Math.PI / 2, rr = r * 0.16;
    const cx = Math.cos(a), sy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx * rr - sy * r * 0.05, r * 0.2 + sy * rr + cx * r * 0.05);
    ctx.lineTo(cx * rr * (0.35 - open * 0.25), r * 0.2 + sy * rr * (0.35 - open * 0.25));
    ctx.lineTo(cx * rr + sy * r * 0.05, r * 0.2 + sy * rr - cx * r * 0.05);
    ctx.closePath(); ctx.fill();
  }
}

// Lanternfin — abyssal anglerfish: sloped skull, jutting underbite with
// needle fangs of mixed length, pin-prick eyes, ragged pectoral fins and
// a bony lure whose bulb flares as it charges a shot.
function sxaLanternfin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const fan = Math.sin(t * 8 + m.seed);
  const glow = '#7ff6ff';
  const P = sxaP(f, '#8aa8b8', '#4a6a7c', '#263c4c', '#0e1a26', '#03070c', '#5ae8ff');
  const fin = sxaP(f, '#6a8a9a', '#3a5a6a', '#1e3444', '#0a1620', '#03070c', '#5ae8ff');
  const charge = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const bob = Math.sin(t * 2.4 + m.seed) * r * 0.05;
  ctx.translate(0, bob);
  // tail fin flicking behind
  ctx.save(); ctx.translate(0, -r * 0.55); ctx.rotate(fan * 0.18);
  ctx.beginPath(); ctx.moveTo(-r * 0.12, 0); ctx.lineTo(-r * 0.5, -r * 0.55); ctx.lineTo(-r * 0.22, -r * 0.42); ctx.lineTo(0, -r * 0.62); ctx.lineTo(r * 0.22, -r * 0.42); ctx.lineTo(r * 0.5, -r * 0.55); ctx.lineTo(r * 0.12, 0); ctx.closePath();
  sxaFlat(ctx, fin.shade, P.line, Math.max(1, r * 0.04));
  ctx.restore();
  // ragged pectoral fins
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.72, r * 0.05); ctx.scale(side, 1); ctx.rotate(0.25 + fan * 0.35);
    sxaShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.2);
      ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.45, -r * 0.14); ctx.lineTo(r * 0.62, -r * 0.05); ctx.lineTo(r * 0.46, r * 0.06);
      ctx.lineTo(r * 0.56, r * 0.22); ctx.lineTo(r * 0.3, r * 0.14); ctx.lineTo(0, r * 0.18); ctx.closePath();
    }, fin, r * 0.45);
    ctx.strokeStyle = fin.light; ctx.lineWidth = Math.max(0.7, r * 0.02); ctx.globalAlpha = A * 0.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.52, -r * 0.24); ctx.moveTo(0, 0); ctx.lineTo(r * 0.55, -r * 0.04); ctx.moveTo(0, 0); ctx.lineTo(r * 0.5, r * 0.18); ctx.stroke();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  // dorsal spines
  ctx.fillStyle = fin.shade;
  for (const [x, h] of [[-0.3, 0.3], [0.05, 0.38], [0.36, 0.26]]) { ctx.beginPath(); ctx.moveTo((x - 0.06) * r, -r * 0.62); ctx.lineTo((x + 0.04) * r, -r * (0.66 + h)); ctx.lineTo((x + 0.1) * r, -r * 0.6); ctx.fill(); }
  // body: sloped skull, jutting jaw
  const open = 0.3 + 0.7 * charge;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.74, r * 0.12);
    ctx.quadraticCurveTo(-r * 0.86, -r * 0.5, -r * 0.2, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.82, r * 0.76, -r * 0.34);
    ctx.quadraticCurveTo(r * 0.92, r * 0.02, r * 0.8, r * 0.24);
    ctx.lineTo(r * 0.94, r * 0.4);
    ctx.quadraticCurveTo(r * 0.5, r * (0.78 + open * 0.12), -r * 0.05, r * (0.76 + open * 0.12));
    ctx.quadraticCurveTo(-r * 0.66, r * (0.72 + open * 0.1), -r * 0.94, r * 0.4);
    ctx.lineTo(-r * 0.78, r * 0.26);
    ctx.closePath();
  };
  sxaShade(ctx, body, P, r, () => {
    // mottled hide + glowing lateral-line pores
    ctx.globalAlpha = A * 0.4; ctx.fillStyle = P.dark;
    for (const [x, y, s] of [[-0.4, -0.35, 0.12], [0.3, -0.5, 0.1], [0.5, -0.1, 0.09], [-0.55, 0.0, 0.08], [0.0, -0.25, 0.07]]) { ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.7, x, 0, SXA_TAU); ctx.fill(); }
    ctx.globalAlpha = A * 0.9; ctx.fillStyle = glow;
    for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.17); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.5 + r * 0.05, r * 0.025 + 0.4, 0, SXA_TAU); ctx.fill(); }
  });
  sxaSpec(ctx, -r * 0.32, -r * 0.5, r * 0.22, r * 0.07, -0.4, 0.3);
  // gaping maw with needle fangs
  const my = r * 0.36, mh = r * (0.07 + 0.2 * open);
  ctx.fillStyle = sxaF(f, '#05020a');
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, my - r * 0.06);
  ctx.quadraticCurveTo(0, my - mh * 0.6 - r * 0.08, r * 0.7, my - r * 0.06);
  ctx.quadraticCurveTo(r * 0.4, my + mh + r * 0.08, 0, my + mh + r * 0.1);
  ctx.quadraticCurveTo(-r * 0.4, my + mh + r * 0.08, -r * 0.7, my - r * 0.06);
  ctx.closePath(); ctx.fill();
  if (charge > 0.05) drawGlow(ctx, 0, my + mh * 0.4, r * 0.4 * charge, glow, 0.6 * charge);
  const fang = sxaF(f, '#e8e4d4');
  sxaFangs(ctx, -r * 0.6, my - r * 0.12, r * 0.6, my - r * 0.12, 7, r * (0.18 + open * 0.08), r * 0.035, 1, fang, null, 1);
  sxaFangs(ctx, -r * 0.55, my + mh + r * 0.04, r * 0.55, my + mh + r * 0.04, 6, r * (0.22 + open * 0.06), r * 0.035, -1, fang, null, 4);
  // pin-prick eyes deep under the brow
  ctx.strokeStyle = P.line; ctx.lineWidth = Math.max(1.2, r * 0.06); ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.56, -r * 0.22); ctx.lineTo(side * r * 0.2, -r * 0.08); ctx.stroke(); }
  sxaEyes(ctx, 0, -r * 0.02, r * 0.38, r * 0.085, r * 0.05, glow, crBlink(m, t), 0.55, 0.35);
  // bony lure
  const lx = Math.sin(t * 2 + m.seed) * r * 0.22 + r * 0.1, ly = -r * 1.32;
  ctx.strokeStyle = sxaF(f, '#1a2a36'); ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.7); ctx.quadraticCurveTo(-r * 0.15, -r * 1.45, lx, ly); ctx.stroke();
  const pulse = 0.65 + 0.3 * Math.sin(t * 5 + m.seed) + charge * 0.9;
  drawGlow(ctx, lx, ly, r * 0.55 * pulse, glow, 0.85);
  ctx.fillStyle = sxaF(f, '#2a4a5a');
  ctx.beginPath(); ctx.ellipse(lx, ly - r * 0.02, r * 0.13, r * 0.15, 0, Math.PI, SXA_TAU); ctx.fill();
  ctx.fillStyle = '#e8ffff'; ctx.beginPath(); ctx.arc(lx, ly + r * 0.03, r * 0.09, 0, SXA_TAU); ctx.fill();
}

// Drowned Corsair — rotted sea-captain: kelp-hung tricorn, a skull with
// a teal ghost-light eye, torn sea-green greatcoat over exposed ribs,
// barnacled shoulder, rusted cutlass and a flintlock raised to fire.
function sxaPirate(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const step = Math.sin(m.anim * 1.8);
  const glow = '#5affc8';
  const coat = sxaP(f, '#7a9a8a', '#4a6a5e', '#2c443c', '#14221e', '#050a08', '#5affc8');
  const boneP = sxaP(f, '#f4f0dc', '#d0c8a8', '#a49a78', '#5a5240', '#1a1610', '#9affd8');
  const ink = coat.line;
  const aim = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  ctx.lineCap = 'round';
  // legs: torn breeches + boots, stalking gait
  for (const side of [-1, 1]) {
    const sw = side * step;
    const hx = side * r * 0.16, hy = r * 0.38;
    const kx = hx + sw * r * 0.08, ky = r * 0.62;
    const fx = hx + sw * r * 0.16, fy = r * 0.86 - Math.max(0, sw) * r * 0.06;
    sxaLimb(ctx, [[hx, hy], [kx, ky]], r * 0.11, r * 0.09, sxaF(f, '#3a3428'), ink, null, false);
    sxaLimb(ctx, [[kx, ky], [fx, fy]], r * 0.1, r * 0.1, sxaF(f, '#1a1410'), ink, sxaF(f, '#4a3a2a'), false);
    ctx.fillStyle = sxaF(f, '#1a1410');
    ctx.beginPath(); ctx.ellipse(fx + side * r * 0.04, fy + r * 0.04, r * 0.12, r * 0.06, 0, 0, SXA_TAU); ctx.fill();
  }
  // greatcoat with tattered hem
  const sway = Math.sin(t * 2.2 + m.seed) * r * 0.03;
  const coatPath = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, -r * 0.3);
    ctx.lineTo(r * 0.36, -r * 0.3);
    ctx.lineTo(r * 0.46, r * 0.2);
    ctx.lineTo(r * 0.52 + sway, r * 0.62);
    ctx.lineTo(r * 0.36, r * 0.5); ctx.lineTo(r * 0.3, r * 0.68 + sway); ctx.lineTo(r * 0.18, r * 0.46);
    ctx.lineTo(r * 0.08, r * 0.4); ctx.lineTo(-r * 0.08, r * 0.4);
    ctx.lineTo(-r * 0.2, r * 0.5); ctx.lineTo(-r * 0.3, r * 0.7 - sway); ctx.lineTo(-r * 0.38, r * 0.52); ctx.lineTo(-r * 0.54 - sway, r * 0.6);
    ctx.lineTo(-r * 0.46, r * 0.2);
    ctx.closePath();
  };
  sxaShade(ctx, coatPath, coat, r * 0.7, () => {
    // open front: rotten shirt + exposed ribs through a tear
    ctx.fillStyle = sxaF(f, '#0c0e0a');
    ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.3); ctx.lineTo(r * 0.14, -r * 0.3); ctx.lineTo(r * 0.08, r * 0.42); ctx.lineTo(-r * 0.08, r * 0.42); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = boneP.primary; ctx.lineWidth = Math.max(1, r * 0.045);
    for (let i = 0; i < 4; i++) { const y = -r * 0.18 + i * r * 0.1; ctx.beginPath(); ctx.moveTo(-r * 0.12, y + r * 0.03); ctx.quadraticCurveTo(0, y - r * 0.03, r * 0.12, y + r * 0.03); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, -r * 0.24); ctx.lineTo(0, r * 0.2); ctx.stroke();
    // lapels + brass buttons
    ctx.fillStyle = coat.light; ctx.globalAlpha = A * 0.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.3); ctx.lineTo(-r * 0.3, -r * 0.3); ctx.lineTo(-r * 0.16, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.14, -r * 0.3); ctx.lineTo(r * 0.3, -r * 0.3); ctx.lineTo(r * 0.16, r * 0.05); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = A; ctx.fillStyle = sxaF(f, '#b8902a');
    for (const y of [0.0, 0.12, 0.24]) for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.2, y * r, r * 0.03, 0, SXA_TAU); ctx.fill(); }
    // belt
    ctx.fillStyle = sxaF(f, '#1a120a'); ctx.fillRect(-r * 0.5, r * 0.16, r, r * 0.08);
    ctx.fillStyle = sxaF(f, '#b8902a'); ctx.fillRect(-r * 0.05, r * 0.15, r * 0.1, r * 0.1);
  });
  // barnacles + coral on the left shoulder, kelp hanging off
  ctx.fillStyle = sxaF(f, '#cfc6b0'); ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
  for (const [x, y, s] of [[-0.36, -0.28, 0.06], [-0.28, -0.32, 0.045], [-0.42, -0.2, 0.04]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SXA_TAU); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = sxaF(f, '#2e6a3e'); ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 0.26); ctx.quadraticCurveTo(-r * 0.5 + Math.sin(t * 3) * r * 0.08, r * 0.05, -r * 0.4, r * 0.32);
  ctx.moveTo(r * 0.3, -r * 0.28); ctx.quadraticCurveTo(r * 0.4 + Math.sin(t * 3 + 1) * r * 0.06, -r * 0.05, r * 0.36, r * 0.12);
  ctx.stroke();
  // cutlass arm (left)
  ctx.save();
  ctx.translate(-r * 0.4, -r * 0.2);
  ctx.rotate(0.35 + step * 0.2);
  sxaLimb(ctx, [[0, 0], [0, r * 0.3]], r * 0.1, r * 0.08, coat.shade, ink, null, false);
  ctx.fillStyle = boneP.primary; ctx.beginPath(); ctx.arc(0, r * 0.34, r * 0.06, 0, SXA_TAU); ctx.fill();
  // rusted curved blade
  ctx.beginPath();
  ctx.moveTo(-r * 0.03, r * 0.38);
  ctx.quadraticCurveTo(-r * 0.2, r * 0.75, r * 0.04, r * 1.02);
  ctx.quadraticCurveTo(-r * 0.04, r * 0.72, r * 0.05, r * 0.38);
  ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#8a9098'), ink, 1);
  ctx.fillStyle = sxaF(f, '#7a3a1a'); ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.arc(-r * 0.07, r * 0.66, r * 0.04, 0, SXA_TAU); ctx.arc(-r * 0.02, r * 0.85, r * 0.03, 0, SXA_TAU); ctx.fill();
  ctx.globalAlpha = A;
  ctx.strokeStyle = sxaF(f, '#b8902a'); ctx.lineWidth = Math.max(1.2, r * 0.05);
  ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.09, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  ctx.restore();
  // flintlock arm (right) — raised toward the target while aiming
  ctx.save();
  ctx.translate(r * 0.4, -r * 0.2);
  ctx.rotate(-0.15 - aim * 1.0 + Math.sin(-step) * 0.12);
  sxaLimb(ctx, [[0, 0], [0, r * 0.3]], r * 0.1, r * 0.08, coat.shade, ink, null, false);
  ctx.fillStyle = boneP.primary; ctx.beginPath(); ctx.arc(0, r * 0.33, r * 0.06, 0, SXA_TAU); ctx.fill();
  ctx.fillStyle = sxaF(f, '#3a2414'); ctx.beginPath(); ctx.roundRect(-r * 0.05, r * 0.3, r * 0.1, r * 0.16, 2); ctx.fill();
  ctx.fillStyle = sxaF(f, '#2a2e34'); ctx.beginPath(); ctx.roundRect(-r * 0.035, r * 0.42, r * 0.07, r * 0.36, 1.5); ctx.fill();
  ctx.fillStyle = sxaF(f, '#b8902a'); ctx.fillRect(-r * 0.045, r * 0.44, r * 0.09, r * 0.03); ctx.fillRect(-r * 0.045, r * 0.74, r * 0.09, r * 0.03);
  if (aim > 0.3) drawGlow(ctx, 0, r * 0.32, r * 0.18 * aim, '#ffb24a', aim * 0.8);
  if (m.fireFlash > 0) { drawGlow(ctx, 0, r * 0.86, r * 0.45, '#ffd88a', 1); drawGlow(ctx, 0, r * 0.86, r * 0.25, glow, 0.8); }
  ctx.restore();
  // skull (jaw hanging slack, one socket burning)
  ctx.save();
  ctx.translate(0, -r * 0.5);
  const jaw = r * (0.03 + aim * 0.05 + Math.max(0, Math.sin(t * 2 + m.seed)) * 0.02);
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.1); ctx.lineTo(-r * 0.12, r * 0.24 + jaw); ctx.lineTo(r * 0.12, r * 0.24 + jaw); ctx.lineTo(r * 0.15, r * 0.1); ctx.closePath();
  sxaFlat(ctx, boneP.shade, boneP.line, 1);
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.12);
    ctx.quadraticCurveTo(-r * 0.27, -r * 0.18, 0, -r * 0.24);
    ctx.quadraticCurveTo(r * 0.27, -r * 0.18, r * 0.2, r * 0.12);
    ctx.lineTo(r * 0.1, r * 0.18); ctx.lineTo(-r * 0.1, r * 0.18);
    ctx.closePath();
  }, boneP, r * 0.28);
  // teeth line
  ctx.strokeStyle = boneP.line; ctx.lineWidth = 0.8;
  ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.04, r * 0.13); ctx.lineTo(i * r * 0.04, r * 0.19); } ctx.stroke();
  // sockets
  ctx.fillStyle = '#060404';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.09, -r * 0.02, r * 0.075, r * 0.065, side * 0.4, 0, SXA_TAU); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, r * 0.04); ctx.lineTo(-r * 0.03, r * 0.1); ctx.lineTo(r * 0.03, r * 0.1); ctx.closePath(); ctx.fill();
  sxaDot(ctx, r * 0.09, -r * 0.02, r * 0.035, glow, 0.8 + aim * 0.4);
  ctx.fillStyle = glow; ctx.globalAlpha = A * 0.5; ctx.beginPath(); ctx.arc(-r * 0.09, -r * 0.02, r * 0.02, 0, SXA_TAU); ctx.fill(); ctx.globalAlpha = A;
  // torn tricorn, kelp dripping from the brim
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.02, r * 0.4, -r * 0.1);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.42, r * 0.06, -r * 0.4);
  ctx.lineTo(0, -r * 0.33); ctx.lineTo(-r * 0.06, -r * 0.42);
  ctx.quadraticCurveTo(-r * 0.3, -r * 0.42, -r * 0.4, -r * 0.1);
  ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#161a1c'), '#000000', Math.max(1, r * 0.04));
  ctx.strokeStyle = sxaF(f, '#6a5a2a'); ctx.lineWidth = Math.max(0.8, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.36, -r * 0.12); ctx.quadraticCurveTo(0, -r * 0.05, r * 0.36, -r * 0.12); ctx.stroke();
  ctx.strokeStyle = sxaF(f, '#2e6a3e'); ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.09); ctx.quadraticCurveTo(r * 0.34 + Math.sin(t * 3) * r * 0.04, r * 0.05, r * 0.3, r * 0.15); ctx.stroke();
  ctx.restore();
}

// Reefback — armoured snapping sea-turtle: a ridged shell with keeled
// spikes and a serrated rim, crusted with coral, kelp and barnacles;
// hooked beak, burning eyes, clawed flippers; it tucks before slamming.
function sxaTurtle(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const paddle = Math.sin(m.anim * 1.1);
  const glow = '#7ff6ff';
  const shellP = sxaP(f, '#9aa88a', '#5a6a52', '#34402e', '#161e14', '#050804', '#7ff6ff');
  const skin = sxaP(f, '#a8b098', '#6a725e', '#424a3a', '#1e2418', '#070906', '#7ff6ff');
  const ink = shellP.line;
  const slam = ph === 'burst' ? 1 : 0;
  // kelp trailing behind
  ctx.lineCap = 'round';
  for (const [x, s] of [[-0.3, 0], [0.12, 1.3], [0.4, 2.2]]) {
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push([x * r + Math.sin(t * 2.5 - k * 0.9 + s) * r * 0.06 * k, -r * 0.6 - k * r * 0.14]);
    sxaTaper(ctx, pts, r * 0.05, r * 0.015);
    ctx.fillStyle = sxaF(f, '#2e5a32'); ctx.fill();
  }
  // flippers with hooked claws
  for (const side of [-1, 1]) {
    for (const [fy, len, k] of [[-0.3, 0.8, 1], [0.42, 0.55, -1]]) {
      ctx.save(); ctx.translate(side * r * 0.66, fy * r); ctx.scale(side, 1);
      ctx.rotate(0.45 + paddle * 0.35 * k + slam * 0.3 * k);
      sxaShade(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.14);
        ctx.quadraticCurveTo(r * len * 0.6, -r * 0.24, r * len, -r * 0.04);
        ctx.quadraticCurveTo(r * len * 0.6, r * 0.2, 0, r * 0.14);
        ctx.closePath();
      }, skin, r * 0.45, () => {
        ctx.fillStyle = skin.dark; ctx.globalAlpha = A * 0.4;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(r * len * i * 0.22, 0, r * 0.06, r * 0.05, 0, 0, SXA_TAU); ctx.fill(); }
      });
      ctx.fillStyle = sxaF(f, '#d8d0b8');
      for (let c = 0; c < 2; c++) { const cx = r * len * (0.55 + c * 0.2); ctx.beginPath(); ctx.moveTo(cx - r * 0.03, -r * 0.1); ctx.lineTo(cx + r * 0.05, -r * 0.2); ctx.lineTo(cx + r * 0.04, -r * 0.08); ctx.fill(); }
      ctx.restore();
    }
  }
  // head: wedge skull with a hooked beak (retracts while winding up)
  const tuck = ph === 'windup' || (m.windup || 0) > 0.5 ? 0.16 : 0;
  ctx.save(); ctx.translate(0, r * (0.74 - tuck));
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.14);
    ctx.quadraticCurveTo(-r * 0.32, r * 0.12, -r * 0.1, r * 0.24);
    ctx.lineTo(0, r * 0.34);
    ctx.lineTo(r * 0.1, r * 0.24);
    ctx.quadraticCurveTo(r * 0.32, r * 0.12, r * 0.26, -r * 0.14);
    ctx.closePath();
  }, skin, r * 0.32, () => {
    ctx.strokeStyle = skin.dark; ctx.globalAlpha = A * 0.45; ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.02); ctx.lineTo(r * 0.2, -r * 0.02); ctx.moveTo(-r * 0.15, r * 0.06); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.15, r * 0.06); ctx.stroke();
  });
  ctx.fillStyle = sxaF(f, '#2a2618');
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.2); ctx.lineTo(0, r * 0.38); ctx.lineTo(r * 0.1, r * 0.2); ctx.lineTo(0, r * 0.26); ctx.closePath(); ctx.fill();
  sxaEyes(ctx, 0, r * 0.06, r * 0.14, r * 0.07, r * 0.045, glow, crBlink(m, t), 0.6, 0.5);
  ctx.restore();
  // shell
  const shell = () => {
    ctx.beginPath();
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * SXA_TAU, rr = i % 2 ? 1 : 0.9;
      const x = Math.cos(a) * r * 0.84 * rr, y = -r * 0.04 + Math.sin(a) * r * 0.74 * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  sxaShade(ctx, shell, shellP, r, () => {
    // scute seams
    ctx.strokeStyle = shellP.dark; ctx.globalAlpha = A * 0.7; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    for (const y of [-0.42, -0.1, 0.22]) { ctx.moveTo(-r * 0.2, y * r); ctx.lineTo(r * 0.2, y * r); }
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.2, -r * 0.62); ctx.lineTo(side * r * 0.2, r * 0.5);
      ctx.moveTo(side * r * 0.2, -r * 0.3); ctx.lineTo(side * r * 0.62, -r * 0.42);
      ctx.moveTo(side * r * 0.2, r * 0.05); ctx.lineTo(side * r * 0.72, r * 0.02);
      ctx.moveTo(side * r * 0.2, r * 0.35); ctx.lineTo(side * r * 0.56, r * 0.48);
    }
    ctx.stroke();
    // inner marginal ring
    ctx.beginPath(); ctx.ellipse(0, -r * 0.04, r * 0.7, r * 0.6, 0, 0, SXA_TAU); ctx.stroke();
    // growth-ring texture
    ctx.globalAlpha = A * 0.3; ctx.strokeStyle = shellP.light; ctx.lineWidth = Math.max(0.7, r * 0.02);
    for (const [x, y] of [[-0.42, -0.2], [0.42, -0.2], [-0.45, 0.25], [0.45, 0.25]]) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.1, 0, SXA_TAU); ctx.stroke(); }
    // moss patches
    ctx.globalAlpha = A * 0.55; ctx.fillStyle = sxaF(f, '#3a6a3a');
    for (const [x, y, s] of [[-0.5, -0.35, 0.16], [0.35, 0.35, 0.13], [0.55, -0.1, 0.1]]) { ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.7, x * 2, 0, SXA_TAU); ctx.fill(); }
  });
  // keeled spine ridge down the middle
  for (const y of [-0.5, -0.24, 0.04, 0.3]) {
    ctx.beginPath(); ctx.moveTo(-r * 0.09, (y + 0.1) * r); ctx.lineTo(0, (y - 0.08) * r); ctx.lineTo(r * 0.09, (y + 0.1) * r); ctx.closePath();
    sxaFlat(ctx, shellP.light, ink, 1);
    ctx.fillStyle = shellP.shade; ctx.beginPath(); ctx.moveTo(0, (y - 0.08) * r); ctx.lineTo(r * 0.09, (y + 0.1) * r); ctx.lineTo(0, (y + 0.08) * r); ctx.closePath(); ctx.fill();
  }
  sxaSpec(ctx, -r * 0.35, -r * 0.45, r * 0.25, r * 0.07, -0.35, 0.25);
  // blood-coral growth + barnacles
  ctx.strokeStyle = sxaF(f, '#c8384a'); ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineCap = 'round';
  {
    const x = r * 0.42, y = -r * 0.5, sw = Math.sin(t * 2) * r * 0.03;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + sw, y - r * 0.24);
    ctx.moveTo(x + sw * 0.5, y - r * 0.1); ctx.lineTo(x - r * 0.12 + sw, y - r * 0.2);
    ctx.moveTo(x + sw * 0.7, y - r * 0.15); ctx.lineTo(x + r * 0.12 + sw, y - r * 0.26);
    ctx.stroke();
  }
  ctx.fillStyle = sxaF(f, '#d8d0bc'); ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
  for (const [bx, by, s] of [[-0.6, 0.12, 0.06], [-0.52, 0.24, 0.045], [0.1, 0.5, 0.05], [-0.25, -0.62, 0.04]]) {
    ctx.beginPath(); ctx.arc(bx * r, by * r, s * r, 0, SXA_TAU); ctx.fill(); ctx.stroke();
  }
  // glowing rift-coral polyps
  ctx.fillStyle = glow;
  for (const [bx, by] of [[-0.6, 0.12], [0.1, 0.5]]) { ctx.beginPath(); ctx.arc(bx * r, by * r, r * 0.02 + 0.4, 0, SXA_TAU); ctx.fill(); }
}

// Krakoth — abyssal kraken boss: a scarred, ridged mantle studded with
// bioluminescent runes, huge goat-pupil eyes under bony brows, a hooked
// beak ringed by writhing feeding arms, and eight tapered suckered
// tentacles; two great arms rear up when it charges a volley.
function sxaKraken(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a4a' : '#6ff6ff';
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const P = sxaP(f, '#c8a0d8', '#8a5aa0', '#4c2a62', '#220e32', '#08020e', rage ? '#ff6a7a' : '#7ff6ff');
  const tent = sxaF(f, '#3a1a4e'), tentHi = sxaF(f, '#7a4a90'), sucker = sxaF(f, '#d8b0d8');
  const ink = P.line;
  // eight tentacles fanning out, curling at the tips
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, k = i % 4;
    const great = k === 0 ? heave : 0; // inner pair rears up when charging
    let x = side * r * (0.18 + k * 0.14), y = r * 0.3;
    const pts = [[x, y]];
    const segs = 9;
    let a = Math.PI / 2 - side * (0.2 + k * 0.36);
    for (let s = 0; s < segs; s++) {
      a += side * (0.1 + k * 0.03) + Math.sin(t * 2.2 + i * 1.3 + s * 0.6) * 0.2 * (s / segs + 0.25) - side * heave * 0.14 - side * great * 0.32;
      const len = r * (0.2 + (k === 3 ? 0.02 : 0));
      x += Math.cos(a) * len; y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    sxaTaper(ctx, pts, r * 0.15, r * 0.012);
    ctx.fillStyle = tent; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.2, r * 0.03); ctx.lineJoin = 'round'; ctx.stroke();
    // upper-edge highlight + sucker row
    ctx.strokeStyle = tentHi; ctx.lineWidth = Math.max(1, r * 0.03); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let s = 0; s < pts.length - 2; s++) { const p = pts[s]; if (s === 0) ctx.moveTo(p[0] - side * r * 0.04, p[1] - r * 0.04); else ctx.lineTo(p[0] - side * r * 0.04 * (1 - s / segs), p[1] - r * 0.04 * (1 - s / segs)); }
    ctx.stroke();
    ctx.fillStyle = sucker;
    for (let s = 1; s < pts.length - 1; s += 1) {
      const p = pts[s], w = r * 0.04 * (1 - s / segs) + 0.6;
      ctx.beginPath(); ctx.arc(p[0] + side * r * 0.05 * (1 - s / segs), p[1] + r * 0.03 * (1 - s / segs), w, 0, SXA_TAU); ctx.fill();
    }
  }
  // mantle
  const mantle = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, r * 0.36);
    ctx.bezierCurveTo(-r * 0.96, -r * 0.3, -r * 0.5, -r * 1.02, 0, -r * 1.08);
    ctx.bezierCurveTo(r * 0.5, -r * 1.02, r * 0.96, -r * 0.3, r * 0.72, r * 0.36);
    ctx.quadraticCurveTo(0, r * 0.58, -r * 0.72, r * 0.36);
    ctx.closePath();
  };
  sxaShade(ctx, mantle, P, r, () => {
    // longitudinal ridges
    ctx.strokeStyle = P.dark; ctx.globalAlpha = A * 0.45; ctx.lineWidth = Math.max(1.2, r * 0.03);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(i * r * 0.05, -r * 1.0); ctx.quadraticCurveTo(i * r * 0.2, -r * 0.55, i * r * 0.22, -r * 0.2); }
    ctx.stroke();
    // mottling
    ctx.fillStyle = P.dark; ctx.globalAlpha = A * 0.3;
    for (const [x, y, s] of [[-0.5, -0.4, 0.12], [0.45, -0.55, 0.1], [0.2, -0.85, 0.08], [-0.25, -0.75, 0.07], [0.6, -0.1, 0.09]]) { ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.7, x, 0, SXA_TAU); ctx.fill(); }
    // old scars
    ctx.strokeStyle = P.hi; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.02);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.6); ctx.lineTo(-r * 0.2, -r * 0.35);
    ctx.moveTo(-r * 0.48, -r * 0.48); ctx.lineTo(-r * 0.43, -r * 0.56); ctx.moveTo(-r * 0.36, -r * 0.4); ctx.lineTo(-r * 0.3, -r * 0.48);
    ctx.moveTo(r * 0.3, -r * 0.82); ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.stroke();
  });
  sxaSpec(ctx, -r * 0.32, -r * 0.72, r * 0.25, r * 0.08, -0.5, 0.3);
  // bioluminescent runes
  const pulse = 0.55 + 0.35 * Math.sin(t * 2.5) + heave * 0.4 + rage * 0.2;
  ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1.2, r * 0.025); ctx.lineCap = 'round'; ctx.globalAlpha = A * Math.min(1, pulse);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95); ctx.lineTo(0, -r * 0.6); ctx.moveTo(-r * 0.08, -r * 0.82); ctx.lineTo(0, -r * 0.74); ctx.lineTo(r * 0.08, -r * 0.82);
  ctx.moveTo(-r * 0.1, -r * 0.55); ctx.lineTo(r * 0.1, -r * 0.55);
  ctx.stroke();
  ctx.fillStyle = glow;
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.12 + i * 0.152); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.62 - r * 0.25, r * 0.022 + 0.5, 0, SXA_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 0.75, r * 0.35, glow, 0.25 * pulse);
  // huge eyes: bony brow, glowing iris, horizontal goat pupil
  for (const side of [-1, 1]) {
    const ex = side * r * 0.34, ey = -r * 0.1;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(-side * 0.25);
    ctx.fillStyle = sxaF(f, '#12041c');
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.15, 0, 0, SXA_TAU); ctx.fill();
    ctx.fillStyle = rage ? '#ff6a3a' : '#e8c84a';
    ctx.beginPath(); ctx.ellipse(0, r * 0.01, r * 0.15, r * 0.1, 0, 0, SXA_TAU); ctx.fill();
    ctx.fillStyle = glow; ctx.globalAlpha = A * 0.5;
    ctx.beginPath(); ctx.ellipse(0, r * 0.03, r * 0.13, r * 0.06, 0, 0, Math.PI); ctx.fill();
    ctx.globalAlpha = A;
    const px = look.x * r * 0.04, py = look.y * r * 0.02;
    ctx.fillStyle = '#080208';
    ctx.beginPath(); ctx.ellipse(px, py, r * 0.1 * (1 - heave * 0.3), r * 0.028 + heave * r * 0.015, 0, 0, SXA_TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-r * 0.06, -r * 0.04, r * 0.025, 0, SXA_TAU); ctx.fill();
    ctx.restore();
    drawGlow(ctx, ex, ey, r * (0.25 + heave * 0.12), glow, 0.45 + heave * 0.3);
    // heavy bony brow
    ctx.beginPath();
    ctx.moveTo(side * r * 0.6, -r * 0.34); ctx.lineTo(side * r * 0.1, -r * 0.18); ctx.lineTo(side * r * 0.14, -r * 0.1); ctx.lineTo(side * r * 0.56, -r * 0.24); ctx.closePath();
    sxaFlat(ctx, P.shade, ink, Math.max(1, r * 0.025));
  }
  // feeding arms + beak
  for (let i = -2; i <= 2; i++) {
    if (!i) continue;
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push([i * r * 0.07 + Math.sin(t * 3 + i + k * 0.8) * r * 0.04 * k + i * k * r * 0.025, r * 0.22 + k * r * 0.09]);
    sxaTaper(ctx, pts, r * 0.045, r * 0.01);
    sxaFlat(ctx, tentHi, ink, 1);
  }
  const open = heave * r * 0.07;
  ctx.beginPath(); ctx.moveTo(-r * 0.13, r * 0.18); ctx.quadraticCurveTo(0, r * 0.14, r * 0.13, r * 0.18); ctx.lineTo(0, r * 0.36 - open); ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#2a2018'), '#000000', 1);
  ctx.beginPath(); ctx.moveTo(-r * 0.09, r * 0.24 + open); ctx.lineTo(r * 0.09, r * 0.24 + open); ctx.lineTo(0, r * 0.38 + open); ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#1a120c'), '#000000', 1);
  if (heave > 0.2) drawGlow(ctx, 0, r * 0.28, r * 0.3 * heave, glow, heave);
}

// ======================================================= GLACIAL PEAK ====
// Rimefang — gaunt ice ghoul: hunched blue-grey body bristling with ice
// shards along the spine, long clawed arms, digitigrade legs, a low wedge
// skull with swept-back ice horns and a fanged maw.
function sxaFrostling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.6 : 2.4);
  const step = Math.sin(run);
  const bob = Math.abs(Math.cos(run)) * r * 0.08;
  const glow = '#9fefff';
  const S = sxaP(f, '#e8f4fc', '#9ab4c8', '#5a7088', '#26364c', '#080e18', '#bff4ff');
  const ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#5a98c8'), ink = S.line;
  const crouch = ph === 'windup' ? 1 : 0;
  ctx.translate(0, -bob + crouch * r * 0.06);
  // ice shards along the spine (behind the shoulders)
  for (const [x, a, l] of [[-0.36, -0.55, 0.5], [-0.14, -0.2, 0.68], [0.12, 0.18, 0.6], [0.34, 0.55, 0.46]]) sxaShard(ctx, x * r, -r * 0.3, a, l * r * (1 + crouch * 0.15), r * 0.09, ice, iceD, ink);
  // digitigrade legs
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * step) * r * 0.16;
    const hip = [side * r * 0.2, r * 0.3], knee = [side * r * 0.4, r * 0.5 - lift], ank = [side * r * 0.26, r * 0.7 - lift], foot = [side * r * 0.34, r * 0.88 - lift * 0.6];
    sxaLimb(ctx, [hip, knee, ank, foot], r * 0.13, r * 0.06, S.shade, ink, S.primary, false);
    ctx.fillStyle = ice;
    for (const dx of [-0.08, 0, 0.08]) { ctx.beginPath(); ctx.moveTo(foot[0] + dx * r - r * 0.025, foot[1]); ctx.lineTo(foot[0] + dx * r * 1.4, foot[1] + r * 0.1); ctx.lineTo(foot[0] + dx * r + r * 0.025, foot[1]); ctx.fill(); }
  }
  // hunched torso
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.2, -r * 0.16, r * 0.42);
    ctx.lineTo(r * 0.16, r * 0.42);
    ctx.quadraticCurveTo(r * 0.5, r * 0.2, r * 0.44, -r * 0.3);
    ctx.quadraticCurveTo(0, -r * 0.56, -r * 0.44, -r * 0.3);
    ctx.closePath();
  }, S, r * 0.8, () => {
    ctx.strokeStyle = S.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const y = -r * 0.08 + i * r * 0.12; ctx.moveTo(-r * 0.3, y); ctx.quadraticCurveTo(0, y + r * 0.08, r * 0.3, y); }
    ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.35);
    ctx.stroke();
    ctx.fillStyle = S.hi; ctx.globalAlpha = A * 0.45;
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.3, r * 0.14, r * 0.05, -0.3, 0, SXA_TAU); ctx.fill();
  });
  // long clawed arms (swing against the legs; flung wide in the windup)
  for (const side of [-1, 1]) {
    const sw = -side * step * r * 0.1;
    const sh = [side * r * 0.4, -r * 0.24];
    const el = [side * r * (0.66 + crouch * 0.14), r * (0.08 - crouch * 0.12) + sw];
    const wr = [side * r * (0.56 + crouch * 0.32), r * (0.46 - crouch * 0.3) + sw * 1.4];
    sxaLimb(ctx, [sh, el, wr], r * 0.11, r * 0.06, S.primary, ink, S.light, false);
    for (const k of [-1, 0, 1]) {
      const a = Math.PI / 2 + k * 0.32 - side * 0.2 - crouch * side * 0.6;
      sxaSeg(ctx, wr[0], wr[1], wr[0] + Math.cos(a) * r * 0.24, wr[1] + Math.sin(a) * r * 0.24, r * 0.03, 0.3);
      sxaFlat(ctx, ice, ink, 0.8);
    }
  }
  // low wedge skull
  ctx.save();
  ctx.translate(0, -r * 0.4);
  for (const side of [-1, 1]) sxaShard(ctx, side * r * 0.2, -r * 0.22, side * 0.75, r * 0.5, r * 0.07, ice, iceD, ink);
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.14);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.4, 0, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.3, -r * 0.14);
    ctx.lineTo(r * 0.18, r * 0.12); ctx.lineTo(0, r * 0.22); ctx.lineTo(-r * 0.18, r * 0.12);
    ctx.closePath();
  }, S, r * 0.4);
  // fanged maw
  const open = r * (0.05 + crouch * 0.06 + (ph === 'burst' ? 0.05 : 0));
  ctx.fillStyle = sxaF(f, '#040810');
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.04); ctx.lineTo(r * 0.15, r * 0.04); ctx.lineTo(r * 0.06, r * 0.1 + open); ctx.lineTo(-r * 0.06, r * 0.1 + open); ctx.closePath(); ctx.fill();
  sxaFangs(ctx, -r * 0.13, r * 0.04, r * 0.13, r * 0.04, 4, r * 0.08, r * 0.025, 1, ice, null, 2);
  // heavy brow + eyes
  ctx.strokeStyle = S.dark; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.26, -r * 0.2); ctx.lineTo(side * r * 0.04, -r * 0.1); ctx.stroke(); }
  sxaEyes(ctx, 0, -r * 0.08, r * 0.13, r * 0.08, r * 0.045, glow, crBlink(m, t), 0.6, 0.4);
  ctx.restore();
}

// Rimemaw — a hopping lump of glacier: faceted blue ice under a crust of
// snow, crystal shards jutting from its back, a cracked glowing core and a
// wide maw of icicle teeth.
function sxaSnowblob(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.6;
  const coil = ph === 'windup' ? 1 : 0;
  const glow = '#8ff0ff';
  const P = sxaP(f, '#ffffff', '#d4e8f6', '#8eaecb', '#3c5c80', '#0a1628', '#bff4ff');
  const ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#4a88c0'), ink = P.line;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.22 - air * 0.08, 1 - coil * 0.22 + air * 0.12);
  ctx.translate(0, -r * 0.5);
  // back shards
  for (const [a, l, w] of [[-2.45, 0.55, 0.11], [-1.95, 0.75, 0.13], [-1.45, 0.62, 0.12], [-0.95, 0.5, 0.1]]) {
    sxaShard(ctx, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.55, a + Math.PI / 2, l * r, w * r, ice, iceD, ink);
  }
  // faceted boulder
  const N = 11, sd = m.seed * 1.7;
  const vx = [], vy = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * SXA_TAU + Math.sin(i * 3.1 + sd) * 0.12;
    const rr = r * (0.84 + 0.1 * Math.sin(i * 2.7 + sd));
    vx.push(Math.cos(a) * rr); vy.push(Math.sin(a) * rr * 0.9 + r * 0.04);
  }
  const body = () => { ctx.beginPath(); for (let i = 0; i < N; i++) { if (i) ctx.lineTo(vx[i], vy[i]); else ctx.moveTo(vx[i], vy[i]); } ctx.closePath(); };
  sxaShade(ctx, body, P, r, () => {
    // facets: alternate light/dark wedges from an off-centre apex
    const cx = -r * 0.12, cy = -r * 0.18;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      ctx.globalAlpha = A * (i % 3 === 0 ? 0.22 : i % 3 === 1 ? 0.12 : 0);
      ctx.fillStyle = i % 3 === 0 ? P.dark : '#ffffff';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx[i], vy[i]); ctx.lineTo(vx[j], vy[j]); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = A * 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); for (let i = 0; i < N; i += 2) { ctx.moveTo(cx, cy); ctx.lineTo(vx[i], vy[i]); } ctx.stroke();
    // snow crust on top
    ctx.globalAlpha = A * 0.9; ctx.fillStyle = sxaF(f, '#f4fbff');
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.3);
    for (let k = 0; k <= 8; k++) ctx.lineTo(-r + k * r * 0.25, -r * (0.32 - (k % 2) * 0.1) + Math.sin(k * 1.7 + sd) * r * 0.04);
    ctx.lineTo(r, -r); ctx.lineTo(-r, -r); ctx.closePath(); ctx.fill();
    // glowing core cracks
    ctx.globalAlpha = A * 0.9; ctx.strokeStyle = glow; ctx.lineWidth = Math.max(0.9, r * 0.03);
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.05); ctx.lineTo(-r * 0.44, r * 0.0); ctx.lineTo(-r * 0.4, -r * 0.14);
    ctx.moveTo(r * 0.68, r * 0.0); ctx.lineTo(r * 0.5, -r * 0.08); ctx.lineTo(r * 0.44, r * 0.06);
    ctx.stroke();
  });
  sxaSpec(ctx, -r * 0.35, -r * 0.4, r * 0.18, r * 0.05, -0.4, 0.5);
  // icicle maw
  const open = 0.4 + coil * 0.6 + air * 0.2;
  const my = r * 0.24, mh = r * (0.06 + 0.12 * open);
  ctx.fillStyle = sxaF(f, '#050c18');
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, my - r * 0.04);
  ctx.lineTo(-r * 0.3, my - mh); ctx.lineTo(0, my - mh * 0.7); ctx.lineTo(r * 0.3, my - mh); ctx.lineTo(r * 0.55, my - r * 0.04);
  ctx.lineTo(r * 0.3, my + mh); ctx.lineTo(0, my + mh * 1.2); ctx.lineTo(-r * 0.3, my + mh);
  ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, my, r * 0.35, glow, 0.25 + coil * 0.4);
  sxaFangs(ctx, -r * 0.48, my - mh * 0.85, r * 0.48, my - mh * 0.85, 6, r * (0.12 + open * 0.06), r * 0.035, 1, ice, null, 3);
  sxaFangs(ctx, -r * 0.36, my + mh, r * 0.36, my + mh, 4, r * 0.08, r * 0.03, -1, ice, null, 1);
  // eyes under a ridge of ice
  ctx.strokeStyle = P.dark; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.44, -r * 0.24); ctx.lineTo(side * r * 0.1, -r * 0.1); ctx.stroke(); }
  sxaEyes(ctx, 0, -r * 0.06, r * 0.25, r * 0.1, r * 0.05, glow, crBlink(m, t), 0.55, 0.38);
}

// Rimewing — gaunt frost bat: torn membranes on long finger bones rimed
// with ice, ice-spur wrists, tall ears, a snarling nose-leaf face with
// glowing eyes and long fangs, hooked feet tucked under.
function sxaIceBat(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 22 : 12) + m.seed);
  const glow = '#9fefff';
  const B = sxaP(f, '#9aaccc', '#5a6c90', '#344264', '#161e36', '#05070f', '#9fefff');
  const W = sxaP(f, '#8aa4c8', '#4e6488', '#2c3c5c', '#121c30', '#04060c', '#bff4ff');
  const bone = sxaF(f, '#c8d8ec'), ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#5a98c8'), ink = B.line;
  const charge = m.windup || 0;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * 0.32);
    const wy = -r * 0.62 + flap * r * 0.16, wx = r * 0.72;
    const t1 = [r * 1.5, -r * 0.3 + flap * r * 0.34], t2 = [r * 1.3, r * 0.3 + flap * r * 0.2], t3 = [r * 0.88, r * 0.44 + flap * r * 0.1];
    ctx.globalAlpha = A * 0.94;
    sxaShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.2);
      ctx.lineTo(wx, wy);
      ctx.lineTo(t1[0], t1[1]);
      ctx.quadraticCurveTo(r * 1.28, r * 0.0, t2[0], t2[1]);
      ctx.lineTo(r * 1.12, r * 0.16); ctx.lineTo(r * 1.06, r * 0.26);
      ctx.quadraticCurveTo(r * 0.98, r * 0.2, t3[0], t3[1]);
      ctx.quadraticCurveTo(r * 0.6, r * 0.2, r * 0.22, r * 0.3);
      ctx.closePath();
    }, W, r * 0.9, () => {
      ctx.strokeStyle = W.dark; ctx.globalAlpha = A * 0.4; ctx.lineWidth = Math.max(0.7, r * 0.02);
      ctx.beginPath();
      ctx.moveTo(wx, wy + r * 0.1); ctx.quadraticCurveTo(r * 1.0, r * 0.1, r * 1.2, r * 0.18);
      ctx.moveTo(wx, wy + r * 0.2); ctx.quadraticCurveTo(r * 0.75, r * 0.15, r * 0.55, r * 0.28);
      ctx.stroke();
    });
    ctx.globalAlpha = A;
    // finger bones + rime on the leading edge
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -r * 0.18); ctx.lineTo(wx, wy);
    ctx.lineTo(t1[0], t1[1]); ctx.moveTo(wx, wy); ctx.lineTo(t2[0], t2[1]); ctx.moveTo(wx, wy); ctx.lineTo(t3[0], t3[1]);
    ctx.stroke();
    ctx.strokeStyle = ice; ctx.lineWidth = Math.max(0.8, r * 0.025); ctx.globalAlpha = A * 0.8;
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.27); ctx.lineTo(wx, wy - r * 0.02); ctx.lineTo(t1[0], t1[1] - r * 0.02); ctx.stroke();
    ctx.globalAlpha = A;
    sxaShard(ctx, wx, wy, -0.5, r * 0.32, r * 0.06, ice, iceD, ink);
    ctx.restore();
  }
  // hooked feet
  for (const side of [-1, 1]) {
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.38); ctx.lineTo(side * r * 0.16, r * 0.58); ctx.lineTo(side * r * 0.1, r * 0.64); ctx.stroke();
  }
  // tall ears
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.08, -r * 0.42); ctx.lineTo(side * r * 0.36, -r * 1.02); ctx.lineTo(side * r * 0.34, -r * 0.62); ctx.lineTo(side * r * 0.3, -r * 0.34); ctx.closePath();
    sxaFlat(ctx, B.primary, ink, Math.max(1, r * 0.04));
    ctx.beginPath(); ctx.moveTo(side * r * 0.15, -r * 0.44); ctx.lineTo(side * r * 0.33, -r * 0.9); ctx.lineTo(side * r * 0.27, -r * 0.42); ctx.closePath();
    ctx.fillStyle = W.shade; ctx.fill();
  }
  // lean furred body
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.quadraticCurveTo(r * 0.42, -r * 0.4, r * 0.3, r * 0.1); ctx.quadraticCurveTo(r * 0.18, r * 0.45, 0, r * 0.48); ctx.quadraticCurveTo(-r * 0.18, r * 0.45, -r * 0.3, r * 0.1); ctx.quadraticCurveTo(-r * 0.42, -r * 0.4, 0, -r * 0.55); ctx.closePath(); }, B, r * 0.55, () => {
    ctx.strokeStyle = B.light; ctx.globalAlpha = A * 0.4; ctx.lineWidth = Math.max(0.7, r * 0.02);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const x = -r * 0.2 + i * r * 0.08, y = r * (0.05 + (i % 2) * 0.08); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.02, y + r * 0.12); }
    ctx.stroke();
  });
  // snarling face
  const open = r * (0.06 + charge * 0.08);
  ctx.fillStyle = sxaF(f, '#05060c');
  ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.08); ctx.lineTo(r * 0.15, -r * 0.08); ctx.lineTo(r * 0.08, r * 0.0 + open); ctx.lineTo(-r * 0.08, r * 0.0 + open); ctx.closePath(); ctx.fill();
  if (charge > 0.1) drawGlow(ctx, 0, -r * 0.02, r * 0.3 * charge, glow, charge * 0.7);
  ctx.fillStyle = ice;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.13, -r * 0.08); ctx.lineTo(side * r * 0.09, r * 0.1 + open * 0.5); ctx.lineTo(side * r * 0.06, -r * 0.08); ctx.closePath(); ctx.fill(); }
  // nose-leaf
  ctx.beginPath(); ctx.moveTo(0, -r * 0.3); ctx.lineTo(r * 0.06, -r * 0.14); ctx.lineTo(0, -r * 0.1); ctx.lineTo(-r * 0.06, -r * 0.14); ctx.closePath();
  sxaFlat(ctx, B.shade, ink, 0.8);
  sxaEyes(ctx, 0, -r * 0.24, r * 0.15, r * 0.075, r * 0.045, glow, crBlink(m, t), 0.6 + charge * 0.4, 0.42);
}

// Frost Wraith — a tall tattered shroud with an ice-shard crown, a void
// hood with two burning cold eyes, skeletal frost hands, and a staff of
// jagged crystal that blazes as it gathers a shot.
function sxaWraith(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const hover = Math.sin(t * 2.5 + m.seed) * r * 0.08;
  const glow = '#8ff0ff';
  const R = sxaP(f, '#a8c0dc', '#5c7898', '#2c405e', '#121c30', '#04070e', '#9fefff');
  const ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#4a88c0'), bone = sxaF(f, '#cfe0f0'), ink = R.line;
  const raise = m.windup || 0;
  ctx.translate(0, hover);
  // frost mist
  for (let i = 0; i < 3; i++) drawGlow(ctx, Math.sin(t * 3 + i) * r * 0.2, r * (0.7 + i * 0.25), r * (0.4 - i * 0.06), '#bfe8ff', 0.22);
  // trailing rags behind
  for (let i = 0; i < 5; i++) {
    const x0 = (-0.4 + i * 0.2) * r, pts = [];
    for (let k = 0; k <= 4; k++) pts.push([x0 + Math.sin(t * 4 - k * 0.9 + i * 1.3) * r * 0.06 * k, r * 0.45 + k * r * (0.12 + (i % 2) * 0.03)]);
    sxaTaper(ctx, pts, r * 0.08, r * 0.01);
    sxaFlat(ctx, R.shade, ink, 1);
  }
  // shroud
  const shroud = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.04, -r * 1.05);
    ctx.bezierCurveTo(r * 0.4, -r * 0.95, r * 0.42, -r * 0.6, r * 0.5, -r * 0.38);
    ctx.quadraticCurveTo(r * 0.62, r * 0.1, r * 0.52, r * 0.58);
    for (let i = 5; i >= 0; i--) {
      const x = -r * 0.5 + (i / 5) * r * 1.02;
      ctx.lineTo(x + r * 0.1, r * (0.42 + (i % 2) * 0.06));
      ctx.lineTo(x, r * (0.64 + (i % 2) * 0.12) + Math.sin(t * 5 + i + m.seed) * r * 0.05);
    }
    ctx.quadraticCurveTo(-r * 0.62, r * 0.1, -r * 0.5, -r * 0.38);
    ctx.bezierCurveTo(-r * 0.42, -r * 0.62, -r * 0.3, -r * 0.95, r * 0.04, -r * 1.05);
    ctx.closePath();
  };
  sxaShade(ctx, shroud, R, r, () => {
    ctx.strokeStyle = R.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    for (const x of [-0.3, -0.1, 0.12, 0.32]) { ctx.moveTo(x * r * 0.7, -r * 0.2); ctx.quadraticCurveTo(x * r * 1.1, r * 0.2, x * r * 1.2, r * 0.6); }
    ctx.stroke();
    ctx.strokeStyle = R.hi; ctx.globalAlpha = A * 0.35;
    ctx.beginPath(); ctx.moveTo(-r * 0.36, -r * 0.5); ctx.quadraticCurveTo(-r * 0.46, -r * 0.1, -r * 0.42, r * 0.3); ctx.stroke();
  });
  // void hood
  ctx.fillStyle = sxaF(f, '#01030a');
  ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.quadraticCurveTo(r * 0.3, -r * 0.72, r * 0.26, -r * 0.42); ctx.quadraticCurveTo(0, -r * 0.24, -r * 0.26, -r * 0.42); ctx.quadraticCurveTo(-r * 0.3, -r * 0.72, 0, -r * 0.82); ctx.fill();
  ctx.fillStyle = bone; ctx.globalAlpha = A * 0.22;
  ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.38); ctx.lineTo(r * 0.12, -r * 0.38); ctx.lineTo(0, -r * 0.3); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = A;
  const pulse = 0.55 + 0.3 * Math.sin(t * 4 + m.seed) + raise * 0.4;
  sxaEyes(ctx, 0, -r * 0.54, r * 0.11, r * 0.08, r * 0.04, glow, 1, pulse, 0.42);
  // shard crown
  for (const [x, a, l] of [[-0.24, -0.6, 0.3], [-0.1, -0.2, 0.4], [0.1, 0.15, 0.42], [0.25, 0.55, 0.3]]) sxaShard(ctx, x * r, -r * 0.82, a, l * r, r * 0.055, ice, iceD, ink);
  // reaching left hand
  ctx.save(); ctx.translate(-r * 0.46, -r * 0.08); ctx.rotate(0.5 - raise * 0.4);
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
  ctx.beginPath();
  for (const k of [-0.5, -0.15, 0.2, 0.55]) { ctx.moveTo(0, 0); ctx.lineTo(Math.sin(k) * r * 0.12, Math.cos(k) * r * 0.12); ctx.lineTo(Math.sin(k * 1.4) * r * 0.24, Math.cos(k * 1.4) * r * 0.26); }
  ctx.stroke();
  ctx.restore();
  // crystal staff, raised when charging
  const sx = r * 0.52, sy = -raise * r * 0.3;
  ctx.strokeStyle = sxaF(f, '#1a2434'); ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.moveTo(sx, r * 0.6 + sy); ctx.lineTo(sx, -r * 0.7 + sy); ctx.stroke();
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.moveTo(sx - r * 0.07, -r * 0.05 + sy); ctx.lineTo(sx + r * 0.05, -r * 0.08 + sy); ctx.moveTo(sx - r * 0.07, r * 0.03 + sy); ctx.lineTo(sx + r * 0.05, 0 + sy); ctx.stroke();
  sxaShard(ctx, sx - r * 0.06, -r * 0.68 + sy, -0.35, r * 0.24, r * 0.05, ice, iceD, ink);
  sxaShard(ctx, sx + r * 0.06, -r * 0.68 + sy, 0.35, r * 0.24, r * 0.05, ice, iceD, ink);
  sxaShard(ctx, sx, -r * 0.66 + sy, 0, r * 0.42, r * 0.08, ice, iceD, ink);
  drawGlow(ctx, sx, -r * 0.88 + sy, r * (0.2 + raise * 0.3), glow, 0.4 + raise * 0.6);
}

// Yeti — a hulking glacier ape: shaggy rime-matted fur, ice frozen into
// its shoulders, curled ram horns, a slate face with a fanged snarl; both
// fists rise overhead for the ground slam.
function sxaYeti(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  const glow = '#8ff0ff';
  const F = sxaP(f, '#ffffff', '#e2eaf2', '#b4c4d4', '#5a6e88', '#121c2a', '#bff4ff');
  const face = sxaP(f, '#8a9cb8', '#56688a', '#34445e', '#18223a', '#060a14', '#9fefff');
  const horn = sxaF(f, '#bcae8e'), hornD = sxaF(f, '#6a5c40');
  const ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#4a88c0'), ink = F.line;
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -1 : Math.max(0, m.windup || 0);
  const up = Math.max(0, raise), down = raise < 0 ? 1 : 0;
  ctx.translate(0, Math.abs(step) * r * 0.06);
  // stumpy legs
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? side * step * r * 0.1 : 0;
    sxaLimb(ctx, [[side * r * 0.3, r * 0.45], [side * r * 0.36, r * 0.82 - lift]], r * 0.2, r * 0.17, F.shade, ink, F.primary, false);
    ctx.fillStyle = face.shade;
    ctx.beginPath(); ctx.ellipse(side * r * 0.38, r * 0.9 - lift, r * 0.2, r * 0.08, 0, 0, SXA_TAU); ctx.fill();
  }
  // shaggy body: wide shoulders, jagged fur fringe
  const N = 26;
  const body = () => {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * SXA_TAU - Math.PI / 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const hump = Math.max(0, -sa) * Math.pow(Math.abs(ca), 0.6) * 0.14; // shoulder hump
      const rr = r * (i % 2 ? 0.86 : 0.96) * (1 + hump);
      const x = ca * rr * (sa < 0 ? 1.0 : 1.0 - sa * 0.3), y = sa * rr * 0.8 + r * 0.05;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  sxaShade(ctx, body, F, r, () => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = F.shade; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const x = -r * 0.75 + (i % 8) * r * 0.21 + (i > 7 ? r * 0.1 : 0), y = -r * 0.25 + (i > 7 ? r * 0.38 : 0) + Math.sin(i * 1.9) * r * 0.08;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + r * 0.05, y + r * 0.1, x - r * 0.01, y + r * 0.2);
    }
    ctx.stroke();
    ctx.strokeStyle = F.hi; ctx.globalAlpha = A * 0.6;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const x = -r * 0.62 + i * r * 0.12, y = -r * 0.52 + Math.abs(i - 3) * r * 0.05; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + r * 0.04, y + r * 0.08, x, y + r * 0.15); }
    ctx.stroke();
    // bare chest of slate hide
    ctx.globalAlpha = A * 0.7; ctx.fillStyle = face.light;
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.02); ctx.quadraticCurveTo(0, -r * 0.12, r * 0.3, -r * 0.02); ctx.quadraticCurveTo(r * 0.26, r * 0.3, 0, r * 0.4); ctx.quadraticCurveTo(-r * 0.26, r * 0.3, -r * 0.3, -r * 0.02); ctx.fill();
    ctx.strokeStyle = face.dark; ctx.globalAlpha = A * 0.45;
    ctx.beginPath(); ctx.moveTo(0, r * 0.02); ctx.lineTo(0, r * 0.36); ctx.moveTo(-r * 0.26, r * 0.1); ctx.quadraticCurveTo(-r * 0.1, r * 0.18, 0, r * 0.1); ctx.quadraticCurveTo(r * 0.1, r * 0.18, r * 0.26, r * 0.1); ctx.stroke();
    // fur fringe over the hide
    ctx.strokeStyle = F.light; ctx.globalAlpha = A * 0.8; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath(); for (let i = 0; i < 7; i++) { const x = -r * 0.3 + i * r * 0.1; ctx.moveTo(x, -r * 0.08); ctx.lineTo(x + r * 0.02, r * 0.04 + (i % 2) * r * 0.04); } ctx.stroke();
  });
  // ice frozen into the shoulders
  for (const side of [-1, 1]) for (const [x, a, l] of [[0.55, 0.5, 0.36], [0.72, 0.85, 0.28], [0.4, 0.2, 0.26]]) sxaShard(ctx, side * x * r, -r * 0.5 + (x - 0.4) * r * 0.5, side * a, l * r, r * 0.07, ice, iceD, ink);
  // head sunk between the shoulders
  ctx.save(); ctx.translate(0, -r * 0.42); ctx.scale(1.18, 1.18);
  // ram horns
  for (const side of [-1, 1]) {
    const pts = [[side * r * 0.16, -r * 0.18], [side * r * 0.36, -r * 0.34], [side * r * 0.52, -r * 0.2], [side * r * 0.5, r * 0.0], [side * r * 0.38, r * 0.06], [side * r * 0.36, -r * 0.06]];
    sxaTaper(ctx, pts, r * 0.09, r * 0.025);
    sxaFlat(ctx, horn, ink, Math.max(1, r * 0.03));
    ctx.strokeStyle = hornD; ctx.lineWidth = Math.max(0.7, r * 0.02);
    ctx.beginPath(); for (let k = 1; k < 4; k++) { const p = pts[k]; ctx.moveTo(p[0] - r * 0.05, p[1] - r * 0.03); ctx.lineTo(p[0] + r * 0.05, p[1] + r * 0.03); } ctx.stroke();
  }
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.24, -r * 0.3, 0, -r * 0.3);
    ctx.quadraticCurveTo(r * 0.24, -r * 0.3, r * 0.26, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.28, r * 0.18, 0, r * 0.24);
    ctx.quadraticCurveTo(-r * 0.28, r * 0.18, -r * 0.26, -r * 0.1);
    ctx.closePath();
  }, face, r * 0.3);
  // brow, eyes, snarl
  ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.16); ctx.lineTo(0, -r * 0.06); ctx.lineTo(r * 0.26, -r * 0.16); ctx.lineTo(r * 0.24, -r * 0.22); ctx.lineTo(-r * 0.24, -r * 0.22); ctx.closePath();
  sxaFlat(ctx, face.dark, null, 0);
  const rage = Math.max(up, down);
  sxaEyes(ctx, 0, -r * 0.07, r * 0.11, r * 0.06, r * 0.035, glow, crBlink(m, t), 0.5 + rage * 0.4, 0.35);
  const open = r * (0.04 + rage * 0.07);
  ctx.fillStyle = sxaF(f, '#05070c');
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.07); ctx.quadraticCurveTo(0, r * 0.03, r * 0.15, r * 0.07); ctx.lineTo(r * 0.1, r * 0.12 + open); ctx.lineTo(-r * 0.1, r * 0.12 + open); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sxaF(f, '#f0ece0');
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.06); ctx.lineTo(side * r * 0.09, r * 0.15 + open * 0.4); ctx.lineTo(side * r * 0.06, r * 0.06); ctx.fill();
    ctx.beginPath(); ctx.moveTo(side * r * 0.11, r * 0.13 + open); ctx.lineTo(side * r * 0.08, r * 0.04 + open * 0.3); ctx.lineTo(side * r * 0.05, r * 0.13 + open); ctx.fill();
  }
  ctx.restore();
  // massive arms: hang and swing, rise overhead in the windup, slam down
  for (const side of [-1, 1]) {
    const sw = side * step * r * 0.08;
    const sh = [side * r * 0.66, -r * 0.34];
    const elH = [side * r * 0.98, r * 0.08 + sw], fiH = [side * r * 0.86, r * 0.56 + sw];
    const elU = [side * r * 0.82, -r * 0.82], fiU = [side * r * 0.38, -r * 1.12];
    const elD = [side * r * 0.95, r * 0.1], fiD = [side * r * 0.62, r * 0.78];
    const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const el = down ? elD : lerp(elH, elU, up), fi = down ? fiD : lerp(fiH, fiU, up);
    sxaTaper(ctx, [sh, el, fi], r * 0.22, r * 0.16);
    sxaFlat(ctx, F.primary, ink, Math.max(1.2, r * 0.045));
    ctx.strokeStyle = F.hi; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(1, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sh[0] - side * r * 0.08, sh[1] - r * 0.06); ctx.lineTo(el[0] - side * r * 0.1, el[1] - r * 0.02); ctx.stroke();
    ctx.globalAlpha = A;
    ctx.save(); ctx.translate(fi[0], fi[1]);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.18, 0, 0, SXA_TAU); }, face, r * 0.2);
    ctx.fillStyle = ice;
    for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * r * 0.08 - r * 0.03, r * 0.12); ctx.lineTo(k * r * 0.1, r * 0.26); ctx.lineTo(k * r * 0.08 + r * 0.03, r * 0.12); ctx.fill(); }
    ctx.restore();
  }
  if (down) drawGlow(ctx, 0, r * 0.85, r * 0.9, '#dff8ff', 0.5);
}

// Hrimthurs — frost giant boss: blue-skinned titan in rime-crusted iron —
// spiked pauldrons, a horned helm crowned with ice, braided white beard
// with iron rings, glowing rune scars across the chest, blizzard breath.
function sxaFrostGiant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#8ff0ff';
  const breathe = Math.sin(t * 2.2) * 0.03;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const S = sxaP(f, '#d4e8ff', '#86aee0', '#4a70a8', '#1e3462', '#060c1e', rage ? '#ff8a8a' : '#9fefff');
  const I = sxaP(f, '#d0d8e4', '#7c889a', '#404a5a', '#1a2028', '#05070a', '#9fefff');
  const beardP = sxaP(f, '#ffffff', '#eef6ff', '#c4d4e6', '#7088a8', '#1a2638', '#ffffff');
  const ice = sxaF(f, '#e4f8ff'), iceD = sxaF(f, '#4a88c0'), ink = S.line;
  ctx.scale(1 + breathe, 1 - breathe);
  // arms hanging at the sides; they spread as it inhales
  for (const side of [-1, 1]) {
    const sw = Math.sin(t * 1.6 + side) * r * 0.04;
    const sh = [side * r * 0.66, -r * 0.3], el = [side * r * (0.98 + heave * 0.08), r * 0.12 + sw], fi = [side * r * (0.88 + heave * 0.14), r * 0.6 + sw - heave * r * 0.12];
    sxaTaper(ctx, [sh, el, fi], r * 0.19, r * 0.14);
    sxaFlat(ctx, S.primary, ink, Math.max(1.4, r * 0.035));
    ctx.strokeStyle = S.light; ctx.globalAlpha = A * 0.5; ctx.lineWidth = r * 0.04; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sh[0] - side * r * 0.06, sh[1]); ctx.lineTo(el[0] - side * r * 0.08, el[1]); ctx.stroke();
    ctx.globalAlpha = A;
    // iron gauntlet with knuckle spikes
    ctx.save(); ctx.translate(fi[0], fi[1]);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.18, -r * 0.16, r * 0.36, r * 0.32, r * 0.09); }, I, r * 0.22);
    ctx.fillStyle = ice;
    for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(k * r * 0.09 - r * 0.03, r * 0.12); ctx.lineTo(k * r * 0.09, r * 0.24); ctx.lineTo(k * r * 0.09 + r * 0.03, r * 0.12); ctx.fill(); }
    ctx.restore();
  }
  // torso
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -r * 0.36);
    ctx.quadraticCurveTo(0, -r * 0.6, r * 0.78, -r * 0.36);
    ctx.quadraticCurveTo(r * 0.76, r * 0.0, r * 0.56, r * 0.22);
    ctx.quadraticCurveTo(r * 0.42, r * 0.45, r * 0.44, r * 0.8);
    ctx.lineTo(-r * 0.44, r * 0.8);
    ctx.quadraticCurveTo(-r * 0.42, r * 0.45, -r * 0.56, r * 0.22);
    ctx.quadraticCurveTo(-r * 0.76, r * 0.0, -r * 0.78, -r * 0.36);
    ctx.closePath();
  }, S, r, () => {
    ctx.strokeStyle = S.dark; ctx.globalAlpha = A * 0.45; ctx.lineWidth = Math.max(1.2, r * 0.025);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.05); ctx.quadraticCurveTo(-r * 0.25, r * 0.1, 0, -r * 0.02); ctx.quadraticCurveTo(r * 0.25, r * 0.1, r * 0.5, -r * 0.05);
    ctx.moveTo(0, -r * 0.02); ctx.lineTo(0, r * 0.55);
    for (const y of [0.2, 0.36]) { ctx.moveTo(-r * 0.2, y * r); ctx.lineTo(r * 0.2, y * r); }
    ctx.stroke();
    // old scars
    ctx.strokeStyle = S.hi; ctx.globalAlpha = A * 0.45;
    ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.15); ctx.moveTo(r * 0.3, -r * 0.05); ctx.lineTo(r * 0.36, -r * 0.1); ctx.moveTo(r * 0.38, r * 0.05); ctx.lineTo(r * 0.44, 0); ctx.stroke();
  });
  // glowing runes on the chest
  const pulse = 0.5 + 0.3 * Math.sin(t * 2.6) + heave * 0.4 + rage * 0.2;
  ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1.2, r * 0.025); ctx.lineCap = 'round'; ctx.globalAlpha = A * Math.min(1, pulse);
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.18); ctx.lineTo(-r * 0.36, r * 0.02); ctx.lineTo(-r * 0.28, -r * 0.1);
  ctx.moveTo(-r * 0.3, r * 0.18); ctx.lineTo(-r * 0.4, r * 0.28); ctx.lineTo(-r * 0.3, r * 0.38);
  ctx.stroke();
  ctx.globalAlpha = A;
  // iron belt with an ice-gem clasp
  ctx.beginPath(); ctx.moveTo(-r * 0.58, r * 0.54); ctx.lineTo(r * 0.58, r * 0.54); ctx.lineTo(r * 0.52, r * 0.72); ctx.lineTo(-r * 0.52, r * 0.72); ctx.closePath();
  sxaFlat(ctx, I.primary, I.line, Math.max(1.2, r * 0.025));
  ctx.fillStyle = I.light; for (const x of [-0.4, -0.2, 0.2, 0.4]) { ctx.beginPath(); ctx.arc(x * r, r * 0.63, r * 0.025, 0, SXA_TAU); ctx.fill(); }
  sxaShard(ctx, 0, r * 0.74, 0, r * 0.22, r * 0.09, ice, iceD, ink);
  drawGlow(ctx, 0, r * 0.64, r * 0.2, glow, 0.4 * pulse);
  // spiked pauldrons
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.66, -r * 0.34);
    for (const [x, a, l] of [[-0.12, -0.35, 0.34], [0.05, 0.1, 0.44], [0.2, 0.55, 0.32]]) sxaShard(ctx, side * x * r, -r * 0.1, side * a, l * r, r * 0.07, ice, iceD, ink);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.2, side * 0.25, Math.PI, SXA_TAU); ctx.lineTo(r * 0.28, r * 0.04); ctx.quadraticCurveTo(0, r * 0.14, -r * 0.28, r * 0.04); ctx.closePath(); }, I, r * 0.3, () => {
      ctx.strokeStyle = I.dark; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(1, r * 0.02);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.13, side * 0.25, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    });
    ctx.fillStyle = I.light; for (const x of [-0.16, 0, 0.16]) { ctx.beginPath(); ctx.arc(x * r, -r * 0.02, r * 0.022, 0, SXA_TAU); ctx.fill(); }
    ctx.restore();
  }
  // head
  ctx.save(); ctx.translate(0, -r * 0.58); ctx.scale(1.1, 1.1);
  // helm horns of ice
  for (const side of [-1, 1]) {
    const pts = [[side * r * 0.2, -r * 0.14], [side * r * 0.38, -r * 0.3], [side * r * 0.44, -r * 0.55], [side * r * 0.36, -r * 0.78]];
    sxaTaper(ctx, pts, r * 0.07, r * 0.008);
    sxaFlat(ctx, ice, ink, Math.max(1, r * 0.02));
    ctx.strokeStyle = iceD; ctx.lineWidth = Math.max(1, r * 0.02);
    ctx.beginPath(); ctx.moveTo(pts[0][0] + side * r * 0.03, pts[0][1]); ctx.lineTo(pts[2][0] + side * r * 0.02, pts[2][1]); ctx.stroke();
  }
  // face
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.14); ctx.lineTo(r * 0.24, -r * 0.14); ctx.lineTo(r * 0.22, r * 0.1); ctx.quadraticCurveTo(0, r * 0.26, -r * 0.22, r * 0.1); ctx.closePath(); }, S, r * 0.3);
  // braided beard with iron rings
  const sway = Math.sin(t * 2) * r * 0.03;
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.0); ctx.lineTo(-r * 0.2, r * 0.22);
    ctx.lineTo(-r * 0.12 + sway, r * 0.5); ctx.lineTo(-r * 0.04 + sway, r * 0.36);
    ctx.lineTo(r * 0.0 + sway * 1.3, r * 0.68); ctx.lineTo(r * 0.04 + sway, r * 0.36);
    ctx.lineTo(r * 0.12 + sway, r * 0.5); ctx.lineTo(r * 0.2, r * 0.22); ctx.lineTo(r * 0.25, r * 0.0);
    ctx.quadraticCurveTo(r * 0.12, r * 0.14, 0, r * 0.1); ctx.quadraticCurveTo(-r * 0.12, r * 0.14, -r * 0.25, r * 0.0);
    ctx.closePath();
  }, beardP, r * 0.4, () => {
    ctx.strokeStyle = beardP.shade; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(0.8, r * 0.015);
    ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(i * r * 0.06, r * 0.12); ctx.lineTo(i * r * 0.04 + sway, r * 0.5); } ctx.stroke();
  });
  ctx.fillStyle = I.light;
  for (const [x, y] of [[-0.11, 0.38], [0.01, 0.54], [0.11, 0.38]]) { ctx.fillRect((x - 0.035) * r + sway, y * r, r * 0.07, r * 0.03); }
  // mouth + blizzard breath
  ctx.fillStyle = sxaF(f, '#04081a');
  ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.1, r * (0.025 + heave * 0.05), 0, 0, SXA_TAU); ctx.fill();
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.12, r * 0.35 * heave, glow, heave);
  // iron helm with nasal guard
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.08);
    ctx.quadraticCurveTo(-r * 0.32, -r * 0.42, 0, -r * 0.44);
    ctx.quadraticCurveTo(r * 0.32, -r * 0.42, r * 0.3, -r * 0.08);
    ctx.lineTo(r * 0.2, -r * 0.1); ctx.lineTo(r * 0.06, -r * 0.14); ctx.lineTo(r * 0.035, r * 0.04); ctx.lineTo(-r * 0.035, r * 0.04); ctx.lineTo(-r * 0.06, -r * 0.14); ctx.lineTo(-r * 0.2, -r * 0.1);
    ctx.closePath();
  }, I, r * 0.35, () => {
    ctx.fillStyle = I.light; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * r * 0.12, -r * 0.16, r * 0.018, 0, SXA_TAU); ctx.fill(); }
  });
  // ice crown
  for (let i = -2; i <= 2; i++) sxaShard(ctx, i * r * 0.1, -r * 0.4 + Math.abs(i) * r * 0.03, i * 0.15, r * (0.22 + (2 - Math.abs(i)) * 0.08), r * 0.04, ice, iceD, ink);
  // eyes burning under the helm rim
  sxaEyes(ctx, 0, -r * 0.02, r * 0.12, r * 0.07, r * 0.035, glow, 1, 0.6 + heave * 0.4 + rage * 0.3, 0.3);
  ctx.restore();
}

// ===================================================== OASIS CITADEL ====
// Sacred scarab — armoured tomb beetle in black-bronze chitin with a
// travelling metallic sheen and gold glyphs etched into its elytra, a
// toothed head-rake, snapping mandibles and spined legs; the wing-cases
// crack open on a dash.
function sxaScarab(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 5.5 : 3.2);
  const glow = '#ffc23a';
  const C = sxaP(f, '#b0d0b8', '#4e6e5c', '#243a30', '#0c1812', '#020403', '#ffc860');
  const legC = sxaF(f, '#1a1612'), legHi = sxaF(f, '#6a5a44'), gold = sxaF(f, '#d8a83a'), ink = C.line;
  // spined legs
  const legs = [[0.3, [0.78, 0.46], [0.94, 0.8]], [0.04, [0.92, 0.0], [1.12, 0.22]], [-0.22, [0.86, -0.46], [1.0, -0.8]]];
  for (const side of [-1, 1]) {
    legs.forEach(([by, kn, ft], i) => {
      const g = Math.sin(run + i * 2.1 + (side > 0 ? Math.PI : 0)) * r * 0.08;
      const b = [side * r * 0.32, by * r], k = [side * r * kn[0], kn[1] * r + g * 0.5], e = [side * r * ft[0], ft[1] * r + g];
      sxaLimb(ctx, [b, k, e], r * 0.08, r * 0.045, legC, ink, legHi, true);
      ctx.fillStyle = legC;
      for (const u of [0.35, 0.65]) { const x = k[0] + (e[0] - k[0]) * u, y = k[1] + (e[1] - k[1]) * u; ctx.beginPath(); ctx.moveTo(x - r * 0.03, y); ctx.lineTo(x + side * r * 0.08, y - r * 0.05); ctx.lineTo(x + r * 0.03, y + r * 0.02); ctx.fill(); }
    });
  }
  // elytra (open on a dash, revealing amber membranes)
  const open = ph === 'burst' ? 0.55 : ph === 'windup' ? 0.12 : 0;
  if (open > 0.2) {
    for (const side of [-1, 1]) {
      ctx.globalAlpha = A * 0.55; ctx.fillStyle = '#e8b860';
      ctx.beginPath(); ctx.moveTo(0, 0.1 * r); ctx.quadraticCurveTo(side * r * 1.3, -r * 0.2, side * r * 0.6, -r * 1.0); ctx.quadraticCurveTo(side * r * 0.2, -r * 0.6, 0, 0.1 * r); ctx.fill();
      ctx.globalAlpha = A;
    }
  }
  const sheen = ((t * 0.5 + m.seed * 0.3) % 1.6) - 0.8;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(0, r * 0.2); ctx.rotate(side * open * 0.6); ctx.translate(0, -r * 0.2);
    sxaShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.02, r * 0.22);
      ctx.quadraticCurveTo(side * r * 0.72, r * 0.24, side * r * 0.66, -r * 0.26);
      ctx.quadraticCurveTo(side * r * 0.56, -r * 0.84, side * r * 0.02, -r * 0.86);
      ctx.closePath();
    }, C, r * 0.8, () => {
      ctx.strokeStyle = C.dark; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(0.8, r * 0.025);
      ctx.beginPath();
      for (const k of [0.18, 0.34, 0.5]) { ctx.moveTo(side * r * k, r * 0.18); ctx.quadraticCurveTo(side * r * (k + 0.1), -r * 0.3, side * r * k * 0.7, -r * 0.8); }
      ctx.stroke();
      // travelling metallic sheen
      ctx.strokeStyle = C.hi; ctx.globalAlpha = A * 0.55; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.moveTo(-r, sheen * r - r * 0.4); ctx.lineTo(r, sheen * r + r * 0.2); ctx.stroke();
      // gold glyphs
      ctx.strokeStyle = gold; ctx.globalAlpha = A * 0.85; ctx.lineWidth = Math.max(0.8, r * 0.025);
      ctx.beginPath();
      ctx.moveTo(side * r * 0.26, -r * 0.5); ctx.lineTo(side * r * 0.26, -r * 0.34); ctx.moveTo(side * r * 0.2, -r * 0.42); ctx.lineTo(side * r * 0.32, -r * 0.42);
      ctx.moveTo(side * r * 0.4, -r * 0.14); ctx.arc(side * r * 0.36, -r * 0.14, r * 0.04, 0, SXA_TAU);
      ctx.moveTo(side * r * 0.22, r * 0.0); ctx.lineTo(side * r * 0.3, -r * 0.06); ctx.lineTo(side * r * 0.38, r * 0.0);
      ctx.stroke();
    });
    ctx.restore();
  }
  // pronotum shield
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.36);
    ctx.quadraticCurveTo(-r * 0.56, r * 0.1, 0, r * 0.08);
    ctx.quadraticCurveTo(r * 0.56, r * 0.1, r * 0.6, r * 0.36);
    ctx.lineTo(r * 0.44, r * 0.5); ctx.lineTo(r * 0.22, r * 0.5); ctx.lineTo(r * 0.12, r * 0.6); ctx.lineTo(-r * 0.12, r * 0.6); ctx.lineTo(-r * 0.22, r * 0.5); ctx.lineTo(-r * 0.44, r * 0.5);
    ctx.closePath();
  }, C, r * 0.6, () => {
    ctx.fillStyle = C.dark; ctx.globalAlpha = A * 0.5;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((-0.4 + i * 0.1) * r, (0.3 + (i % 2) * 0.08) * r, r * 0.018, 0, SXA_TAU); ctx.fill(); }
    ctx.fillStyle = gold; ctx.globalAlpha = A * 0.9;
    ctx.beginPath(); ctx.moveTo(0, r * 0.14); ctx.lineTo(r * 0.06, r * 0.26); ctx.lineTo(0, r * 0.38); ctx.lineTo(-r * 0.06, r * 0.26); ctx.closePath(); ctx.fill();
  });
  // head: toothed rake + snapping mandibles
  const snap = ph === 'windup' ? 1 : Math.sin(t * 7 + m.seed) * 0.5 + 0.5;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.1, r * 0.72); ctx.rotate(side * (0.2 + snap * 0.35));
    ctx.beginPath(); ctx.moveTo(0, -r * 0.04); ctx.quadraticCurveTo(side * r * 0.16, r * 0.1, -side * r * 0.04, r * 0.26); ctx.lineTo(side * r * 0.02, r * 0.1); ctx.lineTo(-side * r * 0.03, r * 0.02); ctx.closePath();
    sxaFlat(ctx, legC, ink, 1);
    ctx.restore();
  }
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, r * 0.56);
    ctx.lineTo(-r * 0.32, r * 0.7);
    for (let i = 0; i < 6; i++) { const x = -r * 0.32 + (i + 0.5) * r * 0.1067; ctx.lineTo(x, r * (0.84 - Math.abs(i - 2.5) * 0.02)); ctx.lineTo(x + r * 0.053, r * 0.74); }
    ctx.lineTo(r * 0.24, r * 0.56);
    ctx.closePath();
  }, C, r * 0.35);
  sxaDot(ctx, -r * 0.18, r * 0.62, r * 0.035, glow, 0.6);
  sxaDot(ctx, r * 0.18, r * 0.62, r * 0.035, glow, 0.6);
}

// Sandwraith — a howling column of grit with a hollow skull-face in the
// storm: deep sockets with burning eyes, a ragged maw, bones and stones
// whipped around it; it spins faster before it leaps.
function sxaDustDevil(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const spin = t * (ph === 'windup' ? 20 : 9) + m.seed;
  const glow = '#ffb040';
  const S = sxaP(f, '#f6e0b0', '#d4aa6e', '#9a703c', '#5a3c1c', '#1e1208', '#ffd27a');
  const rock = sxaF(f, '#4a3420'), boneC = sxaF(f, '#e8dcc0'), ink = S.line;
  // debris behind
  const deb = (front) => {
    for (let i = 0; i < 6; i++) {
      const a = spin * 0.7 + i * 1.05;
      if ((Math.sin(a) > 0) !== front) continue;
      const x = Math.cos(a) * r * (0.85 + (i % 3) * 0.12), y = -r * 0.45 + (i / 6) * r * 1.0 + Math.sin(a) * r * 0.12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2);
      if (i % 3 === 1) { ctx.beginPath(); ctx.roundRect(-r * 0.1, -r * 0.025, r * 0.2, r * 0.05, r * 0.025); sxaFlat(ctx, boneC, ink, 0.8); }
      else { ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.04); ctx.lineTo(r * 0.05, -r * 0.06); ctx.lineTo(r * 0.07, r * 0.03); ctx.lineTo(-r * 0.03, r * 0.06); ctx.closePath(); sxaFlat(ctx, rock, ink, 0.8); }
      ctx.restore();
    }
  };
  deb(false);
  // funnel: flared top, whipping narrow tail, axis swaying
  const W = (u) => r * (0.14 + 0.84 * Math.pow(1 - u, 1.7));
  const X = (u) => Math.sin(spin * 0.25 + u * 3.2) * r * 0.14 * u;
  const funnel = () => {
    ctx.beginPath();
    const n = 10;
    for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(X(u) - W(u) + Math.sin(spin + u * 6) * r * 0.05, -r * 0.85 + u * r * 1.8); }
    for (let i = n; i >= 0; i--) { const u = i / n; ctx.lineTo(X(u) + W(u) + Math.sin(spin + u * 6 + 1.5) * r * 0.05, -r * 0.85 + u * r * 1.8); }
    ctx.closePath();
  };
  ctx.globalAlpha = A * 0.82;
  sxaShade(ctx, funnel, S, r, () => {
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.3) / 9, y = -r * 0.85 + u * r * 1.8, w = W(u);
      const a0 = (spin * 0.9 + i * 1.3) % SXA_TAU;
      ctx.strokeStyle = i % 2 ? S.hi : S.dark; ctx.globalAlpha = A * (i % 2 ? 0.6 : 0.5); ctx.lineWidth = Math.max(1, r * (0.07 - u * 0.04));
      ctx.beginPath(); ctx.ellipse(X(u), y, w, r * 0.1 * (1 - u * 0.5), -0.08, a0, a0 + 2.4); ctx.stroke();
    }
    ctx.fillStyle = S.dark; ctx.globalAlpha = A * 0.4;
    for (let i = 0; i < 10; i++) { const a = spin * 1.3 + i * 2.4, u = i / 11; ctx.beginPath(); ctx.arc(X(u) + Math.cos(a) * W(u) * 0.8, -r * 0.8 + u * r * 1.8, r * 0.025, 0, SXA_TAU); ctx.fill(); }
  }, Math.max(1, r * 0.03));
  // vortex mouth at the top
  ctx.globalAlpha = A * 0.55; ctx.fillStyle = S.dark;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.85, W(0) * 0.92, r * 0.13, 0, 0, SXA_TAU); ctx.fill();
  ctx.globalAlpha = A * 0.8; ctx.strokeStyle = S.hi; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.ellipse(0, -r * 0.85, W(0) * 0.92, r * 0.13, 0, spin % SXA_TAU, spin % SXA_TAU + 3.6); ctx.stroke();
  ctx.globalAlpha = A;
  // hollow skull-face
  const fy = -r * 0.32;
  ctx.fillStyle = 'rgba(30,14,4,0.55)';
  ctx.beginPath(); ctx.ellipse(0, fy + r * 0.08, r * 0.42, r * 0.36, 0, 0, SXA_TAU); ctx.fill();
  ctx.fillStyle = sxaF(f, '#0e0602');
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.17, fy, r * 0.14, r * 0.1, -side * 0.35, 0, SXA_TAU); ctx.fill(); }
  sxaEyes(ctx, 0, fy, r * 0.17, r * 0.09, r * 0.045, glow, crBlink(m, t), 0.7, 0.4);
  const howl = r * (0.06 + (ph === 'windup' ? 0.08 : 0.02 * Math.sin(t * 6)));
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, fy + r * 0.2);
  ctx.lineTo(-r * 0.1, fy + r * 0.16); ctx.lineTo(0, fy + r * 0.2); ctx.lineTo(r * 0.1, fy + r * 0.16); ctx.lineTo(r * 0.2, fy + r * 0.2);
  ctx.lineTo(r * 0.12, fy + r * 0.26 + howl); ctx.lineTo(0, fy + r * 0.3 + howl); ctx.lineTo(-r * 0.12, fy + r * 0.26 + howl);
  ctx.closePath();
  ctx.fillStyle = sxaF(f, '#0e0602'); ctx.fill();
  sxaFangs(ctx, -r * 0.16, fy + r * 0.18, r * 0.16, fy + r * 0.18, 4, r * 0.06, r * 0.02, 1, S.light, null, 5);
  // streaking grit lines
  ctx.strokeStyle = S.hi; ctx.lineWidth = Math.max(0.8, r * 0.02); ctx.globalAlpha = A * 0.6;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) { const a = spin * 0.6 + i * 2.1, y = -r * 0.6 + i * r * 0.45; ctx.ellipse(0, y, r * (1.0 - i * 0.2), r * 0.1, 0, a, a + 0.9); }
  ctx.stroke();
  ctx.globalAlpha = A;
  deb(true);
}

// Bonepicker — lappet-faced vulture: ragged soot-brown wings with long
// fingered primaries, a spiky bone-pale ruff, a bare crimson wrinkled
// head, a heavy hooked beak, burning eye and dangling talons.
function sxaVulture(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 14 : 5) + m.seed);
  const glow = '#ff9a3a';
  const W = sxaP(f, '#a08670', '#66503e', '#3c2e24', '#1a120c', '#060403', '#ffb060');
  const feat = sxaF(f, '#2a1e16'), featHi = sxaF(f, '#7a644e'), ink = W.line;
  const skin = sxaP(f, '#f0a090', '#c0505a', '#8a2a34', '#4a1018', '#140406', '#ffb060');
  const beak = sxaF(f, '#d8cbb0'), beakD = sxaF(f, '#2a2218');
  const charge = m.windup || 0;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * 0.2);
    const wy = -r * 0.5 + flap * r * 0.1;
    // fingered primaries
    for (let k = 0; k < 6; k++) {
      const bx = r * (1.05 - k * 0.08), by = wy + r * (0.15 + k * 0.1);
      const a = -0.35 + k * 0.22 + flap * 0.1;
      const len = r * (0.62 - k * 0.04);
      sxaSeg(ctx, bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, r * 0.07, r * 0.02);
      sxaFlat(ctx, feat, ink, Math.max(0.8, r * 0.025));
    }
    sxaShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.18, -r * 0.24);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.62 + flap * r * 0.1, r * 1.05, wy);
      ctx.lineTo(r * 1.15, wy + r * 0.25);
      for (let k = 0; k < 6; k++) { const x = r * (1.0 - k * 0.14), y = wy + r * (0.42 + k * 0.03); ctx.lineTo(x + r * 0.04, y + r * 0.1); ctx.lineTo(x - r * 0.08, y); }
      ctx.lineTo(r * 0.2, r * 0.3); ctx.closePath();
    }, W, r * 0.8, () => {
      ctx.strokeStyle = featHi; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(0.8, r * 0.03);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const x = r * (0.35 + k * 0.12), y = -r * 0.25 + k * r * 0.02 + flap * r * 0.03; ctx.moveTo(x, y); ctx.lineTo(x + r * 0.06, y + r * 0.16); }
      ctx.stroke();
      ctx.strokeStyle = W.dark; ctx.globalAlpha = A * 0.45;
      ctx.beginPath(); for (let k = 0; k < 5; k++) { const x = r * (0.4 + k * 0.14); ctx.moveTo(x, r * 0.0); ctx.lineTo(x + r * 0.03, r * 0.3); } ctx.stroke();
    });
    ctx.restore();
  }
  // tail fan
  for (let k = -2; k <= 2; k++) { sxaSeg(ctx, k * r * 0.05, r * 0.4, k * r * 0.14, r * 0.85, r * 0.06, r * 0.05); sxaFlat(ctx, feat, ink, 1); }
  // dangling talons
  for (const side of [-1, 1]) {
    ctx.strokeStyle = sxaF(f, '#8a7a62'); ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.42); ctx.lineTo(side * r * 0.16, r * 0.62); ctx.stroke();
    ctx.strokeStyle = beakD; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    for (const k of [-1, 0, 1]) { ctx.moveTo(side * r * 0.16, r * 0.62); ctx.quadraticCurveTo(side * r * 0.16 + k * r * 0.08, r * 0.72, side * r * 0.16 + k * r * 0.05, r * 0.76); }
    ctx.stroke();
  }
  // body
  sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.34, r * 0.46, 0, 0, SXA_TAU); }, W, r * 0.5);
  // spiky ruff
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14), rr = r * (i % 2 ? 0.34 : 0.44); ctx.lineTo(Math.cos(a) * rr, -r * 0.24 + Math.sin(a) * rr * 0.55); }
  for (let i = 14; i >= 0; i--) { const a = Math.PI * (i / 14); ctx.lineTo(Math.cos(a) * r * 0.26, -r * 0.3 + Math.sin(a) * r * 0.1); }
  ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#d8ccb4'), ink, Math.max(1, r * 0.03));
  // bare head, lowered, hooked beak toward the prey
  const bob = Math.sin(t * 3 + m.seed) * r * 0.03 + charge * r * 0.04;
  ctx.save(); ctx.translate(0, -r * 0.44 + bob);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.18, -r * 0.02); ctx.quadraticCurveTo(-r * 0.2, -r * 0.24, 0, -r * 0.24); ctx.quadraticCurveTo(r * 0.2, -r * 0.24, r * 0.18, -r * 0.02); ctx.quadraticCurveTo(r * 0.12, r * 0.14, 0, r * 0.12); ctx.quadraticCurveTo(-r * 0.12, r * 0.14, -r * 0.18, -r * 0.02); ctx.closePath(); }, skin, r * 0.25, () => {
    ctx.strokeStyle = skin.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(0.7, r * 0.015);
    ctx.beginPath(); for (let i = 0; i < 3; i++) { const y = -r * 0.16 + i * r * 0.06; ctx.moveTo(-r * 0.14, y); ctx.quadraticCurveTo(0, y + r * 0.03, r * 0.14, y); } ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, r * 0.0); ctx.lineTo(r * 0.08, r * 0.0);
  ctx.quadraticCurveTo(r * 0.09, r * 0.2, r * 0.0, r * 0.3);
  ctx.quadraticCurveTo(-r * 0.03, r * 0.2, -r * 0.08, r * 0.0);
  ctx.closePath();
  sxaFlat(ctx, beak, ink, Math.max(1, r * 0.025));
  ctx.fillStyle = beakD; ctx.beginPath(); ctx.moveTo(-r * 0.03, r * 0.18); ctx.lineTo(r * 0.06, r * 0.16); ctx.quadraticCurveTo(r * 0.05, r * 0.26, 0, r * 0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = skin.dark; ctx.lineWidth = Math.max(1.2, r * 0.04);
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.18, -r * 0.16); ctx.lineTo(side * r * 0.04, -r * 0.08); ctx.stroke(); }
  sxaEyes(ctx, 0, -r * 0.07, r * 0.1, r * 0.05, r * 0.03, glow, crBlink(m, t), 0.55 + charge * 0.4, 0.35);
  ctx.restore();
}

// Tomb Priest — a gaunt mummy in rotting linen: bands torn open over
// black withered flesh, trailing strips, a gold usekh collar and diadem
// with a rearing cobra, one eye burning through the wraps, a clawed
// reaching hand and an iron-and-gold ankh that blazes to cast.
function sxaMummy(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const step = Math.sin(m.anim * 1.6);
  const glow = '#5affd0';
  const Wr = sxaP(f, '#f6ecd2', '#cbb88e', '#988460', '#54462e', '#1a140a', '#ffd88a');
  const flesh = sxaF(f, '#22180e'), gold = sxaF(f, '#d8a83a'), goldD = sxaF(f, '#7a5410'), lapis = sxaF(f, '#2a4278'), ink = Wr.line;
  const raise = m.windup || 0;
  // trailing strips
  ctx.lineCap = 'round';
  for (const [x, y, s, len] of [[-0.3, 0.3, 0, 0.5], [0.28, 0.36, 1.7, 0.4], [-0.5, -0.1, 3.1, 0.45]]) {
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push([x * r - k * r * 0.07 + Math.sin(t * 4 - k + s) * r * 0.05 * k, y * r + k * r * len * 0.25]);
    sxaTaper(ctx, pts, r * 0.05, r * 0.03);
    sxaFlat(ctx, Wr.primary, ink, 0.8);
  }
  // shuffling legs (one drags)
  for (const side of [-1, 1]) {
    const sw = side * step * 0.3;
    const hip = [side * r * 0.14, r * 0.36], knee = [side * r * 0.17 + Math.sin(sw) * r * 0.08, r * 0.62], ft = [side * r * 0.16 + Math.sin(sw) * r * 0.16, r * 0.88];
    sxaLimb(ctx, [hip, knee, ft], r * 0.11, r * 0.09, Wr.shade, ink, Wr.primary, false);
    ctx.strokeStyle = Wr.dark; ctx.lineWidth = 0.8; ctx.globalAlpha = A * 0.6;
    ctx.beginPath(); ctx.moveTo(knee[0] - r * 0.08, knee[1] + r * 0.05); ctx.lineTo(knee[0] + r * 0.08, knee[1] + r * 0.1); ctx.stroke();
    ctx.globalAlpha = A;
  }
  // gaunt torso
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.36);
    ctx.lineTo(r * 0.4, -r * 0.36);
    ctx.quadraticCurveTo(r * 0.36, r * 0.0, r * 0.25, r * 0.22);
    ctx.lineTo(r * 0.3, r * 0.46); ctx.lineTo(-r * 0.3, r * 0.46); ctx.lineTo(-r * 0.25, r * 0.22);
    ctx.quadraticCurveTo(-r * 0.36, r * 0.0, -r * 0.4, -r * 0.36);
    ctx.closePath();
  }, Wr, r * 0.7, () => {
    // wrapping bands
    ctx.lineWidth = Math.max(0.8, r * 0.02);
    for (let i = 0; i < 7; i++) {
      const y = -r * 0.3 + i * r * 0.12;
      ctx.strokeStyle = Wr.dark; ctx.globalAlpha = A * 0.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.45, y + r * 0.06); ctx.lineTo(r * 0.45, y - r * 0.05); ctx.stroke();
      ctx.strokeStyle = Wr.hi; ctx.globalAlpha = A * 0.35;
      ctx.beginPath(); ctx.moveTo(-r * 0.45, y + r * 0.08); ctx.lineTo(r * 0.45, y - r * 0.03); ctx.stroke();
    }
    // torn gaps over withered flesh, with a glimpse of rib
    ctx.globalAlpha = A; ctx.fillStyle = flesh;
    ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.02); ctx.quadraticCurveTo(-r * 0.05, -r * 0.1, r * 0.12, -r * 0.08); ctx.quadraticCurveTo(-r * 0.02, r * 0.04, -r * 0.24, -r * 0.02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.04, r * 0.2); ctx.quadraticCurveTo(r * 0.2, r * 0.12, r * 0.3, r * 0.16); ctx.quadraticCurveTo(r * 0.2, r * 0.24, r * 0.04, r * 0.2); ctx.fill();
    ctx.strokeStyle = sxaF(f, '#8a7a5a'); ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); ctx.moveTo(-r * 0.18, -r * 0.04); ctx.lineTo(r * 0.04, -r * 0.07); ctx.stroke();
    // grave stains
    ctx.fillStyle = sxaF(f, '#5a4426'); ctx.globalAlpha = A * 0.35;
    ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.2, r * 0.1, r * 0.07, 0.4, 0, SXA_TAU); ctx.ellipse(-r * 0.18, r * 0.32, r * 0.09, r * 0.06, 0, 0, SXA_TAU); ctx.fill();
  });
  // usekh collar
  for (let i = 2; i >= 0; i--) {
    ctx.fillStyle = i === 1 ? lapis : gold;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.36, r * (0.3 + i * 0.07), r * (0.1 + i * 0.06), 0, 0, Math.PI); ctx.fill();
  }
  ctx.strokeStyle = goldD; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -r * 0.36, r * 0.44, r * 0.22, 0, 0, Math.PI); ctx.stroke();
  // clawed reaching arm (left)
  ctx.save(); ctx.translate(-r * 0.4, -r * 0.26); ctx.rotate(0.9 + step * 0.12 - raise * 0.2);
  sxaLimb(ctx, [[0, 0], [0, r * 0.42]], r * 0.09, r * 0.075, Wr.primary, ink, Wr.hi, false);
  ctx.strokeStyle = flesh; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
  ctx.beginPath();
  for (const k of [-0.4, -0.1, 0.2, 0.45]) { ctx.moveTo(0, r * 0.44); ctx.lineTo(Math.sin(k) * r * 0.1, r * 0.54); ctx.lineTo(Math.sin(k) * r * 0.16, r * 0.62); }
  ctx.stroke();
  ctx.restore();
  // ankh staff (right) — raised and blazing while casting
  ctx.save(); ctx.translate(r * 0.44, -r * 0.22); ctx.rotate(-0.1 - raise * 0.45);
  sxaLimb(ctx, [[0, 0], [0, r * 0.3]], r * 0.09, r * 0.075, Wr.primary, ink, Wr.hi, false);
  ctx.strokeStyle = sxaF(f, '#2a2018'); ctx.lineWidth = Math.max(1.6, r * 0.06);
  ctx.beginPath(); ctx.moveTo(0, r * 0.62); ctx.lineTo(0, -r * 0.5); ctx.stroke();
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.6, r * 0.065);
  ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.48); ctx.lineTo(r * 0.15, -r * 0.48); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -r * 0.66, r * 0.1, r * 0.14, 0, 0, SXA_TAU); ctx.stroke();
  ctx.strokeStyle = goldD; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -r * 0.66, r * 0.06, r * 0.1, 0, 0, SXA_TAU); ctx.stroke();
  ctx.fillStyle = gold; ctx.fillRect(-r * 0.06, r * 0.26, r * 0.12, r * 0.06);
  drawGlow(ctx, 0, -r * 0.66, r * (0.16 + raise * 0.32), glow, 0.35 + raise * 0.65);
  ctx.restore();
  // wrapped head with a burning eye
  ctx.save(); ctx.translate(0, -r * 0.62);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.22, r * 0.14); ctx.quadraticCurveTo(-r * 0.28, -r * 0.24, 0, -r * 0.26); ctx.quadraticCurveTo(r * 0.28, -r * 0.24, r * 0.22, r * 0.14); ctx.quadraticCurveTo(0, r * 0.26, -r * 0.22, r * 0.14); ctx.closePath(); }, Wr, r * 0.3, () => {
    ctx.strokeStyle = Wr.dark; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const y = -r * 0.2 + i * r * 0.09; ctx.moveTo(-r * 0.3, y + r * 0.05); ctx.lineTo(r * 0.3, y - r * 0.04); } ctx.stroke();
  });
  ctx.fillStyle = flesh;
  ctx.beginPath(); ctx.moveTo(-r * 0.22, -r * 0.02); ctx.lineTo(r * 0.22, -r * 0.08); ctx.lineTo(r * 0.2, r * 0.02); ctx.lineTo(-r * 0.2, r * 0.06); ctx.closePath(); ctx.fill();
  sxaDot(ctx, r * 0.09, -r * 0.03, r * 0.04, glow, 0.8 + raise * 0.4);
  ctx.fillStyle = glow; ctx.globalAlpha = A * 0.4; ctx.beginPath(); ctx.arc(-r * 0.09, r * 0.0, r * 0.022, 0, SXA_TAU); ctx.fill(); ctx.globalAlpha = A;
  // gold diadem + rearing cobra
  ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.1); ctx.quadraticCurveTo(0, -r * 0.18, r * 0.26, -r * 0.14); ctx.lineTo(r * 0.26, -r * 0.1); ctx.quadraticCurveTo(0, -r * 0.13, -r * 0.26, -r * 0.05); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.14); ctx.quadraticCurveTo(-r * 0.08, -r * 0.3, 0, -r * 0.34); ctx.quadraticCurveTo(r * 0.08, -r * 0.3, r * 0.05, -r * 0.14); ctx.closePath();
  sxaFlat(ctx, gold, goldD, 1);
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -r * 0.24, r * 0.025, 0, SXA_TAU); ctx.fill();
  ctx.restore();
}

// one crustacean/arachnid pincer in unit coords (points to -y): palm with
// a hooked fixed finger and a dactyl that swings open by `snap`
function sxaChela(ctx, P, f, lw, snap) {
  const tipC = sxaF(f, '#efe2cc');
  ctx.save();
  ctx.translate(0.08, -0.22);
  ctx.rotate(0.1 + snap * 0.6);
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-0.07, 0.04);
    ctx.quadraticCurveTo(0.16, -0.12, 0.06, -0.56);
    ctx.lineTo(0.01, -0.4); ctx.lineTo(-0.03, -0.36); ctx.lineTo(-0.04, -0.26); ctx.lineTo(-0.08, -0.2); ctx.lineTo(-0.08, -0.1);
    ctx.closePath();
  }, P, 0.3, null, lw);
  ctx.fillStyle = tipC;
  ctx.beginPath(); ctx.moveTo(0.06, -0.56); ctx.lineTo(0.1, -0.4); ctx.lineTo(0.02, -0.42); ctx.closePath(); ctx.fill();
  ctx.restore();
  sxaShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-0.15, 0.14);
    ctx.quadraticCurveTo(-0.28, -0.08, -0.16, -0.28);
    ctx.quadraticCurveTo(-0.16, -0.6, -0.02, -0.82);
    ctx.lineTo(-0.03, -0.62); ctx.lineTo(0.0, -0.58); ctx.lineTo(-0.01, -0.48); ctx.lineTo(0.03, -0.44); ctx.lineTo(0.02, -0.34);
    ctx.lineTo(0.1, -0.26);
    ctx.quadraticCurveTo(0.22, -0.08, 0.15, 0.12);
    ctx.quadraticCurveTo(0.0, 0.2, -0.15, 0.14);
    ctx.closePath();
  }, P, 0.42, () => {
    ctx.strokeStyle = P.dark; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.moveTo(-0.14, 0.02); ctx.quadraticCurveTo(0, -0.06, 0.14, 0.0); ctx.stroke();
  }, lw);
  ctx.fillStyle = tipC;
  ctx.beginPath(); ctx.moveTo(-0.02, -0.82); ctx.lineTo(-0.1, -0.62); ctx.lineTo(-0.03, -0.62); ctx.closePath(); ctx.fill();
}

// Dunestinger — giant tomb scorpion: blackened-bronze plated body, eight
// spined legs, massive serrated pincers held forward, and a segmented tail
// arched over its back ending in a glowing venom bulb and hooked barb that
// cocks further forward as it charges.
function sxaScorpion(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const ph = m.action && m.action.phase;
  const walk = m.anim * 2;
  const venom = '#c8ff3a', glow = '#ffb04a';
  const C = sxaP(f, '#e0b070', '#9a6a38', '#5e3a1c', '#2a1608', '#0c0602', '#ffb04a');
  const legC = sxaF(f, '#3a2410'), legHi = sxaF(f, '#9a6a38'), ink = C.line;
  const strike = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : Math.max(0, m.windup || 0);
  // eight legs
  for (const side of [-1, 1]) {
    for (let i = 3; i >= 0; i--) {
      const g = Math.sin(walk + i * 1.6 + (side > 0 ? Math.PI : 0));
      const by = r * (-0.36 + i * 0.18);
      const b = [side * r * 0.32, by], k = [side * r * (0.78 + i * 0.03), by - r * 0.2 + g * r * 0.05], e = [side * r * (1.02 + i * 0.02), by + r * 0.2 + g * r * 0.08];
      sxaLimb(ctx, [b, k, e], r * 0.075, r * 0.04, legC, ink, legHi, true);
    }
  }
  // pincers held forward
  const snap = ph === 'windup' ? 1 : (Math.sin(t * 4 + m.seed) * 0.5 + 0.5) * 0.5;
  for (const side of [-1, 1]) {
    const sh = [side * r * 0.26, r * 0.3], el = [side * r * 0.7, r * 0.42], wr = [side * r * 0.58, r * 0.7];
    sxaLimb(ctx, [sh, el, wr], r * 0.12, r * 0.1, C.shade, ink, C.primary, false);
    ctx.save(); ctx.translate(wr[0], wr[1]);
    const s = r * 0.85;
    ctx.scale(side * s, s); ctx.rotate(Math.PI + 0.35);
    sxaChela(ctx, C, f, Math.max(1.2, r * 0.05) / s, snap);
    ctx.restore();
  }
  // plated body: rear plates first, then the head shield
  for (let i = 0; i < 5; i++) {
    const y = -r * 0.5 + i * r * 0.15, w = r * (0.36 + i * 0.03);
    ctx.save(); ctx.translate(0, y);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-w, r * 0.04); ctx.quadraticCurveTo(-w, -r * 0.1, 0, -r * 0.12); ctx.quadraticCurveTo(w, -r * 0.1, w, r * 0.04); ctx.quadraticCurveTo(0, r * 0.12, -w, r * 0.04); ctx.closePath(); }, C, r * 0.45, () => {
      ctx.fillStyle = C.hi; ctx.globalAlpha = A * 0.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.1); ctx.lineTo(r * 0.04, -r * 0.1); ctx.lineTo(0, r * 0.06); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  ctx.save(); ctx.translate(0, r * 0.26);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.08); ctx.quadraticCurveTo(0, -r * 0.2, r * 0.4, -r * 0.08); ctx.lineTo(r * 0.3, r * 0.14); ctx.lineTo(r * 0.12, r * 0.22); ctx.lineTo(-r * 0.12, r * 0.22); ctx.lineTo(-r * 0.3, r * 0.14); ctx.closePath(); }, C, r * 0.4, () => {
    ctx.strokeStyle = C.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.14); ctx.lineTo(0, r * 0.2); ctx.moveTo(-r * 0.25, 0); ctx.lineTo(-r * 0.1, r * 0.12); ctx.moveTo(r * 0.25, 0); ctx.lineTo(r * 0.1, r * 0.12); ctx.stroke();
  });
  sxaDot(ctx, -r * 0.06, r * 0.0, r * 0.03, glow, 0.5);
  sxaDot(ctx, r * 0.06, r * 0.0, r * 0.03, glow, 0.5);
  for (const side of [-1, 1]) for (const k of [0, 1]) { ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(side * r * (0.24 + k * 0.05), r * (0.04 + k * 0.03), r * 0.016 + 0.4, 0, SXA_TAU); ctx.fill(); }
  ctx.restore();
  // tail arching over the back, segment by segment
  let x = 0, y = -r * 0.56, a = -Math.PI / 2 + Math.sin(t * 2 + m.seed) * 0.12;
  const curl = 0.52 + strike * 0.14;
  for (let k = 0; k < 5; k++) {
    const sr = r * (0.17 - k * 0.012);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, sr, sr * 1.15, 0, 0, SXA_TAU); }, C, sr, () => {
      ctx.strokeStyle = C.dark; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(0.8, sr * 0.12);
      ctx.beginPath(); ctx.moveTo(0, -sr); ctx.lineTo(0, sr); ctx.stroke();
    });
    ctx.restore();
    a += curl * (k === 0 ? 0.4 : 1);
    x += Math.cos(a) * r * 0.24; y += Math.sin(a) * r * 0.24;
  }
  // venom bulb + barb
  ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
  const bulb = sxaP(f, '#f0ffb0', '#b0d850', '#6a8a20', '#2a3a08', '#0a1002', venom);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.13, r * 0.16, 0, 0, SXA_TAU); }, bulb, r * 0.16);
  ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.1); ctx.quadraticCurveTo(-r * 0.02, -r * 0.34, r * 0.12, -r * 0.4); ctx.quadraticCurveTo(r * 0.02, -r * 0.26, r * 0.06, -r * 0.1); ctx.closePath();
  sxaFlat(ctx, sxaF(f, '#1a1008'), '#000000', 1);
  ctx.restore();
  drawGlow(ctx, x, y, r * (0.22 + strike * 0.2), venom, 0.45 + strike * 0.5);
}

// Sethra — the sphinx boss: a cracked sandstone lion with great gilded
// wings, a stern pharaoh face behind a gold-and-lapis nemes, kohl-lined
// eyes and a cobra jewel that blaze when it fires, clawed forepaws.
function sxaSphinx(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxaFlash(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#ffc23a';
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const B = sxaP(f, '#f4e0b8', '#c8a676', '#8e7048', '#4a3820', '#140c04', rage ? '#ff8a6a' : '#ffd27a');
  const G = sxaP(f, '#fff2b0', '#e8c050', '#a8801c', '#5a400a', '#1a1002', '#fff0a0');
  const lapis = sxaF(f, '#22366a'), lapisD = sxaF(f, '#101a36'), ink = B.line;
  // great wings behind
  const spread = Math.sin(t * 1.4) * 0.05 + heave * 0.15;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.42, -r * 0.2); ctx.scale(side, 1); ctx.rotate(-0.15 - spread);
    sxaShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.1);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.7, r * 0.78, -r * 0.95);
      for (let k = 0; k < 4; k++) { const x = r * (0.8 - k * 0.17), y = -r * (0.9 - k * 0.2); ctx.lineTo(x + r * 0.02, y + r * 0.32); ctx.lineTo(x - r * 0.12, y + r * 0.16); }
      ctx.lineTo(r * 0.06, r * 0.22);
      ctx.closePath();
    }, G, r * 0.8, () => {
      // lapis feather bands
      ctx.strokeStyle = lapis; ctx.globalAlpha = A * 0.9; ctx.lineWidth = r * 0.06;
      ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 0.2); ctx.quadraticCurveTo(r * 0.4, -r * 0.6, r * 0.75, -r * 0.82); ctx.stroke();
      ctx.strokeStyle = G.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.015);
      ctx.beginPath(); for (let k = 0; k < 4; k++) { const x = r * (0.8 - k * 0.17), y = -r * (0.9 - k * 0.2); ctx.moveTo(x - r * 0.12, y + r * 0.16); ctx.lineTo(x - r * 0.2, y - r * 0.04); } ctx.stroke();
    });
    ctx.restore();
  }
  // lion body
  for (const side of [-1, 1]) sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.62, r * 0.42, r * 0.3, r * 0.26, side * 0.4, 0, SXA_TAU); }, B, r * 0.35);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.72, r * 0.5); ctx.quadraticCurveTo(-r * 0.86, -r * 0.05, -r * 0.3, -r * 0.18); ctx.lineTo(r * 0.3, -r * 0.18); ctx.quadraticCurveTo(r * 0.86, -r * 0.05, r * 0.72, r * 0.5); ctx.quadraticCurveTo(0, r * 0.72, -r * 0.72, r * 0.5); ctx.closePath(); }, B, r, () => {
    ctx.strokeStyle = B.dark; ctx.globalAlpha = A * 0.45; ctx.lineWidth = Math.max(1, r * 0.02);
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.1); ctx.lineTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 0.64, r * 0.32);
    ctx.moveTo(r * 0.55, r * 0.0); ctx.lineTo(r * 0.62, r * 0.14); ctx.lineTo(r * 0.56, r * 0.22); ctx.lineTo(r * 0.66, r * 0.34);
    ctx.moveTo(-r * 0.5, r * 0.5); ctx.quadraticCurveTo(-r * 0.4, r * 0.3, -r * 0.48, r * 0.12);
    ctx.moveTo(r * 0.5, r * 0.5); ctx.quadraticCurveTo(r * 0.4, r * 0.3, r * 0.48, r * 0.12);
    ctx.stroke();
  });
  // clawed forepaws
  for (const side of [-1, 1]) {
    const reach = Math.sin(t * 2 + side) * r * 0.03 + heave * r * 0.04;
    ctx.save(); ctx.translate(side * r * 0.46, r * 0.68 + reach);
    sxaShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.14, 0, 0, SXA_TAU); }, B, r * 0.25, () => {
      ctx.strokeStyle = B.dark; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(1, r * 0.015);
      ctx.beginPath(); for (const k of [-1, 0, 1]) { ctx.moveTo(k * r * 0.07, r * 0.0); ctx.lineTo(k * r * 0.08, r * 0.14); } ctx.stroke();
    });
    ctx.fillStyle = sxaF(f, '#1a1008');
    for (const k of [-1.5, -0.5, 0.5, 1.5]) { ctx.beginPath(); ctx.moveTo(k * r * 0.08 - r * 0.025, r * 0.1); ctx.quadraticCurveTo(k * r * 0.09, r * 0.22, k * r * 0.08 + r * 0.03, r * 0.24); ctx.lineTo(k * r * 0.08 + r * 0.02, r * 0.11); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // nemes lappets falling to the shoulders
  const nemes = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.82);
    ctx.quadraticCurveTo(0, -r * 1.02, r * 0.3, -r * 0.82);
    ctx.lineTo(r * 0.56, r * 0.12); ctx.lineTo(r * 0.3, r * 0.18); ctx.lineTo(r * 0.24, -r * 0.3);
    ctx.lineTo(-r * 0.24, -r * 0.3); ctx.lineTo(-r * 0.3, r * 0.18); ctx.lineTo(-r * 0.56, r * 0.12);
    ctx.closePath();
  };
  sxaShade(ctx, nemes, G, r, () => {
    ctx.fillStyle = lapis; ctx.globalAlpha = A * 0.92;
    for (let i = 0; i < 9; i++) ctx.fillRect(-r, -r * 0.95 + i * r * 0.13, r * 2, r * 0.055);
  });
  // usekh collar on the chest
  for (let i = 3; i >= 0; i--) {
    ctx.fillStyle = i % 2 ? lapis : G.primary;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * (0.28 + i * 0.07), r * (0.12 + i * 0.07), 0, 0, Math.PI); ctx.fill();
  }
  ctx.strokeStyle = G.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.49, r * 0.33, 0, 0, Math.PI); ctx.stroke();
  // stern face
  ctx.save(); ctx.translate(0, -r * 0.46);
  sxaShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.24); ctx.lineTo(r * 0.24, -r * 0.24); ctx.quadraticCurveTo(r * 0.26, r * 0.12, r * 0.12, r * 0.26); ctx.lineTo(-r * 0.12, r * 0.26); ctx.quadraticCurveTo(-r * 0.26, r * 0.12, -r * 0.24, -r * 0.24); ctx.closePath(); }, B, r * 0.32, () => {
    ctx.strokeStyle = B.dark; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(1, r * 0.012);
    ctx.beginPath(); ctx.moveTo(r * 0.14, -r * 0.24); ctx.lineTo(r * 0.1, -r * 0.12); ctx.lineTo(r * 0.16, -r * 0.04); ctx.moveTo(-r * 0.2, r * 0.06); ctx.lineTo(-r * 0.12, r * 0.14); ctx.stroke();
  });
  // false beard
  ctx.beginPath(); ctx.moveTo(-r * 0.06, r * 0.24); ctx.lineTo(r * 0.06, r * 0.24); ctx.lineTo(r * 0.05, r * 0.44); ctx.lineTo(-r * 0.05, r * 0.44); ctx.closePath();
  sxaFlat(ctx, G.primary, G.line, 1);
  ctx.fillStyle = lapis; for (let i = 0; i < 3; i++) ctx.fillRect(-r * 0.055, r * (0.28 + i * 0.05), r * 0.11, r * 0.02);
  // brows, kohl, blazing eyes
  ctx.strokeStyle = sxaF(f, '#1a0e04'); ctx.lineWidth = Math.max(1.5, r * 0.03); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.03, -r * 0.1); ctx.lineTo(side * r * 0.2, -r * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.03); ctx.lineTo(side * r * 0.24, -r * 0.05); ctx.stroke();
  }
  sxaEyes(ctx, 0, -r * 0.04, r * 0.12, r * 0.07, r * 0.035, glow, 1, 0.55 + heave * 0.45 + rage * 0.3, 0.2);
  ctx.strokeStyle = B.dark; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.02); ctx.lineTo(-r * 0.03, r * 0.1); ctx.lineTo(r * 0.02, r * 0.11); ctx.stroke();
  ctx.fillStyle = sxaF(f, '#2a1606');
  ctx.beginPath(); ctx.ellipse(0, r * 0.17, r * 0.08, r * (0.015 + heave * 0.04), 0, 0, SXA_TAU); ctx.fill();
  if (heave > 0.2) drawGlow(ctx, 0, r * 0.17, r * 0.2 * heave, glow, heave * 0.8);
  // rearing cobra on the brow
  ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.24); ctx.quadraticCurveTo(-r * 0.1, -r * 0.42, 0, -r * 0.46); ctx.quadraticCurveTo(r * 0.1, -r * 0.42, r * 0.04, -r * 0.24); ctx.closePath();
  sxaFlat(ctx, G.primary, G.line, 1.2);
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.035, 0, SXA_TAU); ctx.fill();
  drawGlow(ctx, 0, -r * 0.35, r * (0.12 + heave * 0.3), glow, 0.5 + heave * 0.5);
  ctx.restore();
}

// ============================================================ registry ====
// Sea species overrides disabled: keep bright cartoon designs from species.js
Object.assign(SPECIES.frostling, { draw: sxaFrostling, colors: { primary: '#5a7088', dark: '#080e18', glow: '#9fefff' } });
Object.assign(SPECIES.snowblob, { draw: sxaSnowblob, colors: { primary: '#8eaecb', dark: '#0a1628', glow: '#8ff0ff' } });
Object.assign(SPECIES.icebat, { draw: sxaIceBat, colors: { primary: '#344264', dark: '#05070f', glow: '#9fefff' } });
Object.assign(SPECIES.wraith, { draw: sxaWraith, colors: { primary: '#2c405e', dark: '#04070e', glow: '#8ff0ff' } });
Object.assign(SPECIES.yeti, { draw: sxaYeti, colors: { primary: '#b4c4d4', dark: '#121c2a', glow: '#8ff0ff' } });
Object.assign(SPECIES.frostgiant, { draw: sxaFrostGiant, colors: { primary: '#4a70a8', dark: '#060c1e', glow: '#8ff0ff' } });
Object.assign(SPECIES.scarab, { draw: sxaScarab, colors: { primary: '#243a30', dark: '#020403', glow: '#ffc23a' } });
Object.assign(SPECIES.dustdevil, { draw: sxaDustDevil, colors: { primary: '#9a703c', dark: '#1e1208', glow: '#ffb040' } });
Object.assign(SPECIES.vulture, { draw: sxaVulture, colors: { primary: '#3c2e24', dark: '#060403', glow: '#ff9a3a' } });
Object.assign(SPECIES.mummy, { draw: sxaMummy, colors: { primary: '#988460', dark: '#1a140a', glow: '#5affd0' } });
Object.assign(SPECIES.scorpion, { draw: sxaScorpion, colors: { primary: '#5e3a1c', dark: '#0c0602', glow: '#ffb04a' } });
Object.assign(SPECIES.sphinx, { draw: sxaSphinx, colors: { primary: '#8a6230', dark: '#140a02', glow: '#ffc23a' } });
