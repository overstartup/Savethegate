// Serious redesigns of stage species (group D) — replaces the drawing of
// existing SPECIES entries; see render/species.js for the draw contract.
// Spectral Jungle, Crown of the Mountain King and The Deepwood casts:
// stylised dark-fantasy villains — hard silhouettes, layered shading,
// texture strokes and one glowing accent each. Everything is prefixed
// `sxd` (the standalone build shares one scope).
import { SPECIES } from './species.js';
import { crShade, crEyes, crBlink, crGem, drawGlow, crMix } from './creatures.js';

const SXD_TAU = Math.PI * 2;

// ------------------------------------------------------------ helpers ----

// hit-flash amount (same rule as creatures.js crPalette)
function sxdF(m) { return m.hitFlash > 0 ? ((m.boss || m.elite) ? 0.3 : 0.85) : 0; }

// A material palette for crShade that still flashes white on hits. Cached
// per colour set + flash level (only 3 flash levels exist).
const sxdMatCache = new Map();
function sxdMat(m, pal, light, primary, shade, dark, rim) {
  const f = sxdF(m);
  const rm = rim || crMix(primary, pal.glow, 0.32);
  const key = light + primary + shade + dark + rm + pal.glow + f;
  let p = sxdMatCache.get(key);
  if (!p) {
    p = f > 0
      ? { light: crMix(light, '#ffffff', Math.min(1, f + 0.1)), primary: crMix(primary, '#ffffff', f), shade: crMix(shade, '#ffffff', f * 0.7), dark: crMix(dark, '#ffffff', f * 0.5), glow: pal.glow, rim: rm }
      : { light, primary, shade, dark, glow: pal.glow, rim: rm };
    if (sxdMatCache.size > 600) sxdMatCache.clear();
    sxdMatCache.set(key, p);
  }
  return p;
}
// the live palette with a subtler rim light (the stock rim is a loud glow)
const sxdPCache = new Map();
function sxdP(pal, k = 0.3) {
  const key = pal.primary + pal.light + pal.shade + pal.dark + pal.glow + k;
  let p = sxdPCache.get(key);
  if (!p) {
    p = { ...pal, rim: crMix(pal.primary, pal.glow, k) };
    if (sxdPCache.size > 600) sxdPCache.clear();
    sxdPCache.set(key, p);
  }
  return p;
}
// flat colour that flashes with the body
function sxdC(m, c) { const f = sxdF(m); return f > 0 ? crMix(c, '#ffffff', f * 0.8) : c; }

// Glowing slit eye: dark socket, hot sharp almond, white core, soft glow.
// tilt > 0 on the right eye lowers the inner corner (a glare).
function sxdEye(ctx, x, y, w, h, tilt, color, blink, glowA = 1, socket = 'rgba(6,2,10,0.75)') {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt);
  if (socket) { ctx.fillStyle = socket; ctx.beginPath(); ctx.moveTo(-w * 1.3, h * 0.6); ctx.quadraticCurveTo(-w * 0.2, -h * 2.2, w * 1.3, -h * 0.5); ctx.quadraticCurveTo(w * 0.2, h * 1.9, -w * 1.3, h * 0.6); ctx.fill(); }
  ctx.scale(1, Math.max(0.15, blink));
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-w, h * 0.35); ctx.quadraticCurveTo(-w * 0.15, -h * 1.15, w, -h * 0.25); ctx.quadraticCurveTo(w * 0.1, h * 0.8, -w, h * 0.35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.85;
  ctx.beginPath(); ctx.ellipse(w * 0.05, 0, w * 0.34, h * 0.22, -0.2, 0, SXD_TAU); ctx.fill();
  ctx.restore();
  if (glowA > 0) drawGlow(ctx, x, y, w * 2.6, color, glowA);
}
function sxdEyes(ctx, x, y, w, h, gap, color, blink, glowA = 1, tilt = 0.32, socket) {
  sxdEye(ctx, x - gap, y, w, h, -tilt, color, blink, glowA, socket);
  ctx.save(); ctx.scale(-1, 1); sxdEye(ctx, -x - gap, y, w, h, -tilt, color, blink, glowA, socket); ctx.restore();
}

// Row of fangs between x0..x1 on baseline y, pointing dir (+1 down / -1 up).
function sxdFangs(ctx, x0, x1, y, n, len, dir, color, jitter = 0.35) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w;
    const l = len * (1 - jitter + jitter * (((i * 7 + 3) % 5) / 4)) * (i === 0 || i === n - 1 ? 0.7 : 1);
    ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y + dir * l); ctx.lineTo(x + w, y);
  }
  ctx.fill();
}

// Dark texture strokes (fur / bark / fibre). pts = [[x0,y0,x1,y1],…] in r units.
function sxdStrokes(ctx, r, pts, color, width, alpha) {
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const p of pts) { ctx.moveTo(p[0] * r, p[1] * r); if (p.length > 4) ctx.quadraticCurveTo(p[2] * r, p[3] * r, p[4] * r, p[5] * r); else ctx.lineTo(p[2] * r, p[3] * r); }
  ctx.stroke();
  ctx.globalAlpha = A;
}

// Soft specular highlight (a pale crescent).
function sxdSpec(ctx, x, y, rx, ry, rot, alpha = 0.35, color = '#ffffff') {
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, SXD_TAU); ctx.fill();
  ctx.globalAlpha = A;
}

// Internal cast shadow: a translucent dark shape.
function sxdShadow(ctx, alpha, path, color = '#000000') {
  const A = ctx.globalAlpha;
  ctx.globalAlpha = A * alpha; ctx.fillStyle = color; path(); ctx.fill();
  ctx.globalAlpha = A;
}

// Tapering curved horn / tusk / claw from (x0,y0) via control (cx,cy) to tip
// (x1,y1), base width w. Filled with a material and ridged.
function sxdHorn(ctx, x0, y0, cx, cy, x1, y1, w, fill, edge, ridges = 0, ridgeColor) {
  // sample the quadratic spine, offset both sides by a tapering half-width
  const N = 8, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N, ik = 1 - k;
    const px = ik * ik * x0 + 2 * ik * k * cx + k * k * x1, py = ik * ik * y0 + 2 * ik * k * cy + k * k * y1;
    let tx = 2 * ik * (cx - x0) + 2 * k * (x1 - cx), ty = 2 * ik * (cy - y0) + 2 * k * (y1 - cy);
    const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    const hw = w * 0.5 * Math.pow(1 - k, 0.8);
    L.push([px - ty * hw, py + tx * hw]); R.push([px + ty * hw, py - tx * hw]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= N; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.min(1.4, Math.max(0.6, w * 0.16)); ctx.lineJoin = 'round'; ctx.stroke(); }
  if (ridges) {
    ctx.strokeStyle = ridgeColor || edge; ctx.lineWidth = Math.max(0.8, w * 0.08);
    ctx.beginPath();
    for (let i = 1; i <= ridges; i++) { const j = Math.round(i / (ridges + 1) * N); ctx.moveTo(L[j][0], L[j][1]); ctx.lineTo(R[j][0], R[j][1]); }
    ctx.stroke();
  }
}

// Thick limb as two strokes (dark outline + material), round caps.
function sxdLimb(ctx, w, color, dark, path) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = w + Math.max(1.6, w * 0.25); path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; path(); ctx.stroke();
}

// Seeded jitter 0..1
function sxdRnd(seed, i) { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); }

// ===================================================== SPECTRAL JUNGLE ====
// Palette from the island: deep violet caps, bruised purple flesh, dark teal
// vines, cyan-teal bioluminescence.

// Shroomkin — fungal ghoul: lean fibrous stalk-body, long clawed arms, a tall
// hooked cap with a tattered brim that shades the face; two cyan slits and a
// vertical maw of gill-fangs glare out of the shadow. Ducks into a sprint.
function sxdShroomkin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const burst = ph === 'burst', wind = ph === 'windup';
  const run = m.anim * (burst ? 4.2 : 2.6);
  const flesh = sxdMat(m, pal, '#d9cbe6', '#8f7aa6', '#3e2c52', '#12061c');
  const bone = sxdC(m, '#e6dcef');
  const dk = sxdC(m, '#12061c');
  // legs: thin, back-jointed, root toes
  for (const side of [-1, 1]) {
    const s = Math.sin(run + (side > 0 ? Math.PI : 0));
    const hx = side * r * 0.15, hy = r * 0.36;
    const kx = side * r * 0.34 + s * r * 0.06, ky = r * 0.56;
    const fx = side * r * 0.24 + s * r * 0.16, fy = r * 0.86 - Math.max(0, s) * r * 0.12;
    sxdLimb(ctx, Math.max(1.6, r * 0.085), flesh.shade, dk, () => { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); });
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.beginPath(); for (const d of [-1, 0, 1]) { ctx.moveTo(fx, fy); ctx.lineTo(fx + d * r * 0.1 + side * r * 0.04, fy + r * 0.08); } ctx.stroke();
  }
  const bob = Math.abs(Math.sin(run)) * r * 0.06;
  ctx.translate(0, -bob);
  ctx.rotate(burst ? 0.12 * (m.action.dir || 1) : 0);
  // long arms with hooked claws, swinging opposite the legs
  for (const side of [-1, 1]) {
    const s = Math.sin(run + (side > 0 ? 0 : Math.PI));
    const raise = wind ? 1 : 0;
    const sx = side * r * 0.28, sy = -r * 0.02;
    const ex = side * r * (0.6 + raise * 0.1), ey = r * (0.22 - raise * 0.45) + s * r * 0.06;
    const hx = side * r * (0.56 + raise * 0.2) + s * r * 0.1, hy = r * (0.56 - raise * 0.85);
    sxdLimb(ctx, Math.max(1.8, r * 0.1), flesh.primary, dk, () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); });
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath();
    for (const d of [-0.6, 0, 0.6]) { ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + side * r * 0.12 + d * r * 0.06, hy + r * 0.08, hx + side * r * 0.04 + d * r * 0.1, hy + r * 0.2); }
    ctx.stroke();
  }
  // fibrous stalk torso
  const torso = () => { ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.2); ctx.quadraticCurveTo(-r * 0.34, r * 0.12, -r * 0.12, r * 0.46); ctx.lineTo(r * 0.12, r * 0.46); ctx.quadraticCurveTo(r * 0.34, r * 0.12, r * 0.3, -r * 0.2); ctx.closePath(); };
  crShade(ctx, torso, flesh, r * 0.6);
  sxdStrokes(ctx, r, [[-0.2, -0.1, -0.24, 0.15, -0.12, 0.4], [0.02, -0.12, 0.05, 0.2, 0.0, 0.42], [0.2, -0.1, 0.25, 0.15, 0.12, 0.4]], flesh.dark, Math.max(1, r * 0.035), 0.45);
  // glowing veins
  ctx.globalAlpha = A * (0.55 + 0.3 * Math.sin(t * 4 + m.seed));
  ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.4); ctx.quadraticCurveTo(-r * 0.16, r * 0.2, -r * 0.08, r * 0.05); ctx.moveTo(r * 0.12, r * 0.38); ctx.quadraticCurveTo(r * 0.18, r * 0.22, r * 0.1, r * 0.1); ctx.stroke();
  ctx.globalAlpha = A;
  // cast shadow of the cap over the face
  sxdShadow(ctx, 0.6, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.34, r * 0.2, 0, 0, SXD_TAU); }, '#0a0212');
  // face in the shadow: cyan slits + vertical gill maw
  const mad = wind ? 1 : 0;
  sxdEyes(ctx, 0, -r * 0.08, r * 0.11, r * 0.06, r * 0.13, pal.glow, crBlink(m, t), 0.75 + mad * 0.25, 0.38);
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.08, r * 0.04); ctx.lineTo(r * 0.08, r * 0.04); ctx.lineTo(r * 0.05, r * (0.22 + mad * 0.06)); ctx.lineTo(-r * 0.05, r * (0.22 + mad * 0.06)); ctx.closePath(); ctx.fill();
  sxdFangs(ctx, -r * 0.08, r * 0.08, r * 0.04, 4, r * 0.06, 1, bone, 0.2);
  // tall hooked cap with a tattered brim
  ctx.save();
  ctx.rotate(Math.sin(run * 0.5) * 0.05 + (burst ? 0.18 : 0));
  const tip = Math.sin(t * 2 + m.seed) * r * 0.04;
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, -r * 0.14);
    ctx.bezierCurveTo(-r * 0.75, -r * 0.5, -r * 0.35, -r * 0.62, -r * 0.18, -r * 0.92);
    ctx.quadraticCurveTo(r * 0.02, -r * 1.28, r * 0.42 + tip, -r * 1.2);
    ctx.quadraticCurveTo(r * 0.12, -r * 1.06, r * 0.18, -r * 0.85);
    ctx.bezierCurveTo(r * 0.38, -r * 0.6, r * 0.75, -r * 0.5, r * 0.92, -r * 0.14);
    for (let i = 1; i <= 8; i++) {
      const x = r * 0.92 - i * r * 0.23;
      ctx.lineTo(x + r * 0.115, -r * 0.14 + r * (0.07 + 0.06 * sxdRnd(m.seed, i)));
      ctx.lineTo(x, -r * 0.14 - (i === 8 ? 0 : r * 0.02));
    }
    ctx.closePath();
  };
  crShade(ctx, cap, sxdP(pal), r);
  // radial streaks + brim gill line
  sxdStrokes(ctx, r, [[0.0, -1.02, -0.3, -0.55, -0.6, -0.2], [0.05, -0.98, 0.0, -0.6, -0.05, -0.15], [0.12, -0.95, 0.35, -0.55, 0.6, -0.2]], pal.dark, Math.max(1, r * 0.04), 0.4);
  ctx.strokeStyle = pal.light; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.22); ctx.quadraticCurveTo(0, -r * 0.3, r * 0.85, -r * 0.22); ctx.stroke(); ctx.globalAlpha = A;
  // luminous pores
  const pulse = 0.6 + 0.3 * Math.sin(t * 4 + m.seed);
  for (const [x, y, s] of [[-0.45, -0.38, 0.07], [0.42, -0.4, 0.06], [-0.02, -0.66, 0.08], [0.2, -0.86, 0.045]]) {
    drawGlow(ctx, x * r, y * r, s * r * 3, pal.glow, pulse);
    ctx.fillStyle = '#dffff6'; ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.6, -0.3, 0, SXD_TAU); ctx.fill();
  }
  sxdSpec(ctx, -r * 0.38, -r * 0.55, r * 0.16, r * 0.05, -0.8, 0.3);
  ctx.restore();
}

// Sporeling — bloated spore-sac: lumpy blistered hide split by glowing
// veins, a crown of thorns, three glaring eyes and a wide maw of needle
// teeth; scuttles on root tendrils, swells before it bursts.
function sxdSporeling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const small = m.type === 'slimeSmall';
  const wob = Math.sin(t * 5 + m.seed);
  const coil = ph === 'windup' ? 1 : 0, air = ph === 'burst' ? 1 : 0;
  const dk = sxdC(m, '#0e0418');
  const bone = sxdC(m, '#efe6f4');
  if (!small) for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3 + m.seed) % 1; drawGlow(ctx, Math.sin(i * 2.3 + t) * r * 0.5, -r * 0.7 - p * r * 1.1, r * (0.1 + p * 0.18), pal.glow, 0.5 * (1 - p)); }
  // tendril legs
  ctx.strokeStyle = dk; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  for (let i = 0; i < (small ? 4 : 6); i++) {
    const k = small ? (i - 1.5) / 1.5 : (i - 2.5) / 2.5;
    const sw = Math.sin(m.anim * 3 + i * 1.7) * r * 0.08;
    ctx.moveTo(k * r * 0.5, r * 0.5); ctx.quadraticCurveTo(k * r * 0.75 + sw, r * 0.7, k * r * 0.8 + sw * 1.5, r * 0.88);
  }
  ctx.stroke();
  ctx.save();
  ctx.translate(0, r * 0.7);
  ctx.scale(1 + wob * 0.05 + coil * 0.16 - air * 0.1, 1 - wob * 0.05 - coil * 0.18 + air * 0.14);
  ctx.translate(0, -r * 0.7);
  const n = small ? 8 : 11, R = r * 0.74;
  const body = () => {
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * SXD_TAU - Math.PI / 2;
      const rr = R * (0.92 + 0.14 * sxdRnd(m.seed + 1, k % n));
      const am = ((k - 0.5) / n) * SXD_TAU - Math.PI / 2;
      if (!k) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.92);
      else ctx.quadraticCurveTo(Math.cos(am) * R * 1.12, Math.sin(am) * R * 1.04, Math.cos(a) * rr, Math.sin(a) * rr * 0.92);
    }
    ctx.closePath();
  };
  // thorn crown (behind)
  ctx.fillStyle = dk;
  ctx.beginPath();
  for (const [x, h, a] of (small ? [[-0.25, 0.32, -0.4], [0.2, 0.36, 0.35]] : [[-0.45, 0.32, -0.7], [-0.18, 0.42, -0.2], [0.12, 0.46, 0.15], [0.4, 0.34, 0.6]])) {
    const bx = x * r, by = -R * 0.8;
    ctx.moveTo(bx - r * 0.08, by + r * 0.08); ctx.lineTo(bx + Math.sin(a) * h * r, by - Math.cos(a) * h * r); ctx.lineTo(bx + r * 0.08, by + r * 0.08);
  }
  ctx.fill();
  crShade(ctx, body, sxdP(pal), r);
  // blisters
  for (const [x, y, s] of [[-0.4, -0.4, 0.1], [0.45, -0.25, 0.08], [-0.55, 0.05, 0.07], [0.2, -0.55, 0.06]]) {
    if (small && s < 0.08) continue;
    sxdShadow(ctx, 0.35, () => { ctx.beginPath(); ctx.arc(x * r + s * r * 0.15, y * r + s * r * 0.2, s * r, 0, SXD_TAU); }, pal.dark);
    sxdSpec(ctx, x * r - s * r * 0.1, y * r - s * r * 0.1, s * r * 0.8, s * r * 0.7, 0, 0.35, pal.light);
    sxdSpec(ctx, x * r - s * r * 0.35, y * r - s * r * 0.4, s * r * 0.3, s * r * 0.2, -0.5, 0.5);
  }
  // glowing cracked veins
  const vp = 0.5 + 0.35 * Math.sin(t * 3 + m.seed) + coil * 0.3;
  ctx.globalAlpha = A * Math.min(1, vp); ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.2); ctx.lineTo(-r * 0.45, -r * 0.12); ctx.lineTo(-r * 0.4, r * 0.05); ctx.lineTo(-r * 0.28, r * 0.08);
  ctx.moveTo(r * 0.6, -r * 0.05); ctx.lineTo(r * 0.42, -r * 0.08); ctx.lineTo(r * 0.36, -r * 0.3); ctx.lineTo(r * 0.22, -r * 0.36);
  if (!small) { ctx.moveTo(-r * 0.1, -r * 0.68); ctx.lineTo(-r * 0.04, -r * 0.52); ctx.lineTo(-r * 0.16, -r * 0.42); }
  ctx.stroke();
  ctx.globalAlpha = A;
  // maw: dark gash with glowing gullet and needle teeth
  const open = r * (0.1 + coil * 0.08 + air * 0.04 + Math.max(0, wob) * 0.02);
  const my = r * 0.2;
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.46, my - r * 0.04); ctx.quadraticCurveTo(0, my - open * 0.6, r * 0.46, my - r * 0.04); ctx.quadraticCurveTo(0, my + open * 1.6, -r * 0.46, my - r * 0.04); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, my + open * 0.35, r * 0.32, pal.glow, 0.35 + coil * 0.4);
  sxdFangs(ctx, -r * 0.38, r * 0.38, my - open * 0.22, small ? 5 : 7, open * 0.75, 1, bone);
  sxdFangs(ctx, -r * 0.3, r * 0.3, my + open * 0.62, small ? 4 : 6, open * 0.6, -1, bone);
  // three eyes: two glaring + a small one off-centre
  sxdEyes(ctx, 0, -r * 0.18, r * 0.13, r * 0.07, r * 0.2, pal.glow, crBlink(m, t), 0.8, 0.4);
  if (!small) sxdEye(ctx, r * 0.04, -r * 0.42, r * 0.07, r * 0.04, 0.1, pal.glow, crBlink(m, t + 1.1), 0.6);
  sxdSpec(ctx, -r * 0.3, -r * 0.5, r * 0.18, r * 0.07, -0.6, 0.28);
  ctx.restore();
}

// Glowmoth — death's-head moth: hooked, tattered violet-black wings with a
// glaring eye-spot on each, a skull mark on the furred thorax, swept
// feathered antennae, cyan slit eyes; sheds a trail of light motes.
function sxdGlowmoth(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.abs(Math.sin(t * (fast ? 22 : 11) + m.seed));
  const dk = sxdC(m, '#08041a');
  for (let i = 1; i <= 4; i++) {
    const p = ((t * 1.5 + i / 4) % 1);
    drawGlow(ctx, Math.sin(t * 2 + i * 1.7 + m.seed) * r * 0.3, -r * (0.6 + p * 1.6), r * (0.22 - p * 0.14), pal.glow, 0.5 * (1 - p));
  }
  const wing = sxdMat(m, pal, '#6a5ab8', '#2e2266', '#120c34', '#04020e');
  const wingIn = sxdMat(m, pal, '#8a78d8', '#4a3a98', '#1c144a', '#04020e');
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * (0.28 + flap * 0.72), 1);
    // hind wing: tattered with a trailing hooked tail
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.08, r * 0.05);
      ctx.quadraticCurveTo(r * 0.75, r * 0.0, r * 0.82, r * 0.38);
      ctx.lineTo(r * 0.7, r * 0.46); ctx.lineTo(r * 0.72, r * 0.62);
      ctx.quadraticCurveTo(r * 0.6, r * 0.9, r * 0.66, r * 1.2);
      ctx.quadraticCurveTo(r * 0.4, r * 0.85, r * 0.3, r * 0.58);
      ctx.lineTo(r * 0.22, r * 0.62); ctx.lineTo(r * 0.08, r * 0.35);
      ctx.closePath();
    }, wing, r * 0.6);
    // fore wing with hooked tip and notched trailing edge
    const fore = () => {
      ctx.beginPath(); ctx.moveTo(r * 0.08, -r * 0.12);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.92, r * 1.38, -r * 0.84);
      ctx.quadraticCurveTo(r * 1.2, -r * 0.7, r * 1.32, -r * 0.52);
      ctx.lineTo(r * 1.14, -r * 0.36); ctx.lineTo(r * 1.16, -r * 0.18);
      ctx.lineTo(r * 0.92, -r * 0.06); ctx.lineTo(r * 0.86, r * 0.1);
      ctx.quadraticCurveTo(r * 0.4, r * 0.2, r * 0.08, r * 0.08);
      ctx.closePath();
    };
    crShade(ctx, fore, wingIn, r * 0.85);
    // dark marginal band + veins
    ctx.save(); fore(); ctx.clip();
    ctx.fillStyle = dk; ctx.globalAlpha = A * 0.7;
    ctx.beginPath(); ctx.ellipse(r * 1.25, -r * 0.5, r * 0.32, r * 0.5, 0.4, 0, SXD_TAU); ctx.fill();
    ctx.globalAlpha = A;
    ctx.restore();
    ctx.strokeStyle = pal.glow; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.45;
    ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 0.08); ctx.quadraticCurveTo(r * 0.7, -r * 0.6, r * 1.3, -r * 0.8); ctx.moveTo(r * 0.12, 0); ctx.lineTo(r * 1.05, -r * 0.3); ctx.moveTo(r * 0.12, r * 0.08); ctx.lineTo(r * 0.85, r * 0.04); ctx.moveTo(r * 0.12, r * 0.15); ctx.quadraticCurveTo(r * 0.5, r * 0.5, r * 0.62, r * 1.1); ctx.stroke();
    ctx.globalAlpha = A;
    // glaring eye-spot: dark ring, cyan iris, slit pupil
    const pulse = 0.75 + 0.25 * Math.sin(t * 4 + side + m.seed);
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(r * 0.72, -r * 0.42, r * 0.2, r * 0.15, -0.35, 0, SXD_TAU); ctx.fill();
    sxdEye(ctx, r * 0.72, -r * 0.42, r * 0.15, r * 0.08, -0.35, pal.glow, 1, 0.8 * pulse, null);
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(r * 0.73, -r * 0.42, r * 0.025, r * 0.07, -0.35, 0, SXD_TAU); ctx.fill();
    drawGlow(ctx, r * 0.66, r * 1.18, r * 0.16 * pulse, pal.glow, 0.8);
    ctx.restore();
  }
  // abdomen: segmented, banded
  const fur = sxdMat(m, pal, '#7a6a9a', '#3a2e5a', '#1a1230', '#06040e');
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.14, r * 0.05); ctx.quadraticCurveTo(-r * 0.18, r * 0.45, 0, r * 0.7); ctx.quadraticCurveTo(r * 0.18, r * 0.45, r * 0.14, r * 0.05); ctx.closePath(); }, fur, r * 0.4);
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.55;
  ctx.beginPath(); for (const y of [0.22, 0.36, 0.5]) { ctx.moveTo(-r * 0.13 * (1 - y * 0.6), y * r); ctx.quadraticCurveTo(0, y * r + r * 0.05, r * 0.13 * (1 - y * 0.6), y * r); } ctx.stroke();
  ctx.globalAlpha = A;
  // furred thorax with a skull mark
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.22, r * 0.2, 0, 0, SXD_TAU); }, fur, r * 0.3);
  sxdStrokes(ctx, r, [[-0.2, -0.1, -0.27, -0.05], [0.2, -0.1, 0.27, -0.05], [-0.16, 0.05, -0.22, 0.12], [0.16, 0.05, 0.22, 0.12]], fur.light, 1, 0.6);
  ctx.fillStyle = sxdC(m, '#d8d0b8');
  ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.1, r * 0.09, 0, 0, SXD_TAU); ctx.fill();
  ctx.fillRect(-r * 0.05, -r * 0.04, r * 0.1, r * 0.06);
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.arc(-r * 0.04, -r * 0.1, r * 0.03, 0, SXD_TAU); ctx.arc(r * 0.04, -r * 0.1, r * 0.03, 0, SXD_TAU); ctx.fill();
  // head + feathered antennae swept back
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.14, r * 0.11, 0, 0, SXD_TAU); }, fur, r * 0.2);
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const tx = side * r * 0.55, ty = -r * 0.75 + Math.sin(t * 5 + side) * r * 0.04;
    ctx.beginPath(); ctx.moveTo(side * r * 0.05, -r * 0.38); ctx.quadraticCurveTo(side * r * 0.12, -r * 0.8, tx, ty); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 1; k <= 4; k++) { const q = k / 5; const px = side * r * (0.08 + q * 0.42), py = -r * (0.45 + q * 0.32); ctx.moveTo(px, py); ctx.lineTo(px + side * r * 0.08, py + r * 0.06); }
    ctx.stroke(); ctx.lineWidth = Math.max(1, r * 0.04);
  }
  sxdEyes(ctx, 0, -r * 0.3, r * 0.07, r * 0.045, r * 0.07, pal.glow, crBlink(m, t), 0.8, 0.45);
}

// Tiki — the spirit mask: a tall carved hardwood war-mask with a jutting
// brow, fanged gaping mouth and glowing rune grooves, crowned by a halo of
// sharpened stakes, hovering over a ragged spectral shroud; raises a bone
// staff topped with a skull whose spirit-fire swells before it hurls.
function sxdTiki(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const hover = Math.sin(t * 2.4 + m.seed) * r * 0.05;
  const charge = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const dk = sxdC(m, '#0c0614');
  const bone = sxdC(m, '#e6dccb');
  const wood = sxdMat(m, pal, '#9a7258', '#5a3a2a', '#2a160e', '#0c0604', pal.glow);
  // ragged spectral shroud
  const shroud = sxdMat(m, pal, '#7a5ab0', '#3a2470', '#160a34', '#06020e');
  ctx.globalAlpha = A * 0.88;
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.36, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.4, -r * 0.5, r * 0.86);
    for (let i = 0; i < 6; i++) { const x = -r * 0.5 + (i + 1) * r * (1 / 6); const sw = Math.sin(t * 4 + i * 1.3) * r * 0.05; ctx.lineTo(x - r * 0.08 + sw, r * (0.6 + 0.08 * (i % 2))); ctx.lineTo(x + sw, r * (0.86 + 0.06 * sxdRnd(i, 2))); }
    ctx.quadraticCurveTo(r * 0.6, r * 0.4, r * 0.36, -r * 0.1);
    ctx.closePath();
  }, shroud, r * 0.7);
  ctx.globalAlpha = A;
  ctx.translate(0, hover);
  // halo of sharpened stakes
  for (let i = -3; i <= 3; i++) {
    const a = i * 0.32, len = r * (0.62 - Math.abs(i) * 0.04);
    ctx.save(); ctx.translate(0, -r * 0.42); ctx.rotate(a);
    ctx.fillStyle = wood.shade; ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.2); ctx.lineTo(0, -r * 0.2 - len); ctx.lineTo(r * 0.05, -r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = bone; ctx.beginPath(); ctx.moveTo(-r * 0.022, -r * 0.08 - len); ctx.lineTo(0, -r * 0.2 - len); ctx.lineTo(r * 0.022, -r * 0.08 - len); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // the mask: wide brow tapering to a pointed chin
  const mask = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.82); ctx.lineTo(r * 0.4, -r * 0.82);
    ctx.lineTo(r * 0.44, -r * 0.5); ctx.lineTo(r * 0.34, -r * 0.08);
    ctx.lineTo(r * 0.18, r * 0.18); ctx.lineTo(0, r * 0.3); ctx.lineTo(-r * 0.18, r * 0.18);
    ctx.lineTo(-r * 0.34, -r * 0.08); ctx.lineTo(-r * 0.44, -r * 0.5);
    ctx.closePath();
  };
  crShade(ctx, mask, wood, r * 0.75);
  // wood grain + crack
  sxdStrokes(ctx, r, [[-0.3, -0.75, -0.34, -0.3, -0.24, 0.02], [0.3, -0.76, 0.36, -0.3, 0.24, 0.0], [0.05, -0.8, 0.12, -0.7, 0.08, -0.6]], wood.dark, 1, 0.5);
  // heavy brow ridge
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.42, -r * 0.62); ctx.lineTo(0, -r * 0.44); ctx.lineTo(r * 0.42, -r * 0.62); ctx.lineTo(r * 0.4, -r * 0.5); ctx.lineTo(0, -r * 0.34); ctx.lineTo(-r * 0.4, -r * 0.5); ctx.closePath(); }, wood, r * 0.4);
  // deep eye holes with spirit-light
  for (const side of [-1, 1]) {
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.moveTo(side * r * 0.06, -r * 0.34); ctx.lineTo(side * r * 0.32, -r * 0.46); ctx.lineTo(side * r * 0.28, -r * 0.28); ctx.lineTo(side * r * 0.1, -r * 0.24); ctx.closePath(); ctx.fill();
    drawGlow(ctx, side * r * 0.19, -r * 0.33, r * (0.18 + charge * 0.12), pal.glow, 0.85);
    ctx.fillStyle = '#f0fffa'; ctx.beginPath(); ctx.ellipse(side * r * 0.19, -r * 0.33, r * 0.05, r * 0.025, side * -0.35, 0, SXD_TAU); ctx.fill();
  }
  // nose ridge
  ctx.fillStyle = wood.shade; ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.34); ctx.lineTo(r * 0.05, -r * 0.34); ctx.lineTo(r * 0.09, -r * 0.1); ctx.lineTo(-r * 0.09, -r * 0.1); ctx.closePath(); ctx.fill();
  // gaping fanged mouth with glowing gullet
  const gape = r * (0.1 + charge * 0.06);
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.05); ctx.lineTo(r * 0.25, -r * 0.05); ctx.lineTo(r * 0.16, -r * 0.03 + gape); ctx.lineTo(-r * 0.16, -r * 0.03 + gape); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, -r * 0.0 + gape * 0.4, r * (0.16 + charge * 0.12), pal.glow, 0.5 + charge * 0.5);
  sxdFangs(ctx, -r * 0.23, r * 0.23, -r * 0.05, 6, r * 0.07, 1, bone, 0.4);
  sxdFangs(ctx, -r * 0.15, r * 0.15, -r * 0.03 + gape, 4, r * 0.05, -1, bone, 0.4);
  // rune grooves on the cheeks
  ctx.globalAlpha = A * (0.55 + 0.45 * charge + 0.15 * Math.sin(t * 5)); ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (const side of [-1, 1]) { ctx.moveTo(side * r * 0.36, -r * 0.2); ctx.lineTo(side * r * 0.28, -r * 0.12); ctx.lineTo(side * r * 0.34, -r * 0.02); ctx.moveTo(side * r * 0.2, -r * 0.72); ctx.lineTo(side * r * 0.12, -r * 0.62); }
  ctx.moveTo(0, -r * 0.78); ctx.lineTo(0, -r * 0.6);
  ctx.moveTo(-r * 0.06, r * 0.14); ctx.lineTo(0, r * 0.22); ctx.lineTo(r * 0.06, r * 0.14);
  ctx.stroke();
  ctx.globalAlpha = A;
  // bone staff with a skull + spirit fire
  const raise = charge;
  ctx.save(); ctx.translate(r * 0.6, r * 0.2 - raise * r * 0.15); ctx.rotate(0.08 - raise * 0.18);
  sxdLimb(ctx, Math.max(2, r * 0.06), bone, dk, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.55); ctx.lineTo(0, -r * 0.7); });
  ctx.strokeStyle = sxdC(m, '#4a2a1a'); ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 0.04, r * 0.05); ctx.lineTo(r * 0.04, r * 0.1); ctx.moveTo(-r * 0.04, r * 0.12); ctx.lineTo(r * 0.04, r * 0.17); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.8, r * 0.11, r * 0.1, 0, 0, SXD_TAU); }, sxdMat(m, pal, '#fff8e8', '#d8ccb4', '#7a6e5a', '#1a140c'), r * 0.15);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(-r * 0.04, -r * 0.8, r * 0.03, 0, SXD_TAU); ctx.arc(r * 0.04, -r * 0.8, r * 0.03, 0, SXD_TAU); ctx.fill();
  for (let i = 0; i < 3; i++) drawGlow(ctx, Math.sin(t * 10 + i) * r * 0.04, -r * (0.92 + i * 0.12), r * (0.14 + raise * 0.12 - i * 0.03), pal.glow, 0.75);
  ctx.restore();
}

// Shroomgiant — hulking fungal colossus: hunched fibrous trunk, shelf-fungus
// pauldrons, gnarled mycelium arms ending in root claws, and a broad
// jagged cap pulled low over a void face with two burning eyes and a maw
// of gill-teeth. Rears both arms up before the slam.
function sxdShroomGiant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.1);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const slam = ph === 'burst' ? 1 : 0;
  const flesh = sxdMat(m, pal, '#cdbedc', '#86719e', '#3a2a4e', '#100618');
  const shelf = sxdMat(m, pal, '#b49ad0', '#6a4a92', '#2a1648', '#0a0418');
  const moss = sxdMat(m, pal, '#7ad0a8', '#2a6a5a', '#0e3028', '#03100c');
  const dk = sxdC(m, '#0a0412');
  const bone = sxdC(m, '#e8e0f0');
  ctx.translate(0, Math.abs(step) * r * 0.06 - rear * r * 0.1 + slam * r * 0.05);
  // root legs
  for (const side of [-1, 1]) {
    const s = Math.sin(m.anim * 1.1 + (side > 0 ? Math.PI : 0));
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.4); ctx.lineTo(side * r * 0.5 + s * r * 0.04, r * 0.45); ctx.lineTo(side * r * 0.52 + s * r * 0.05, r * 0.82 - Math.max(0, s) * r * 0.06); ctx.lineTo(side * r * 0.2, r * 0.84 - Math.max(0, s) * r * 0.06); ctx.closePath(); }, flesh, r * 0.4);
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); for (const d of [0.15, 0.35, 0.55]) { const x = side * r * (0.15 + d * 0.65); ctx.moveTo(x, r * 0.8); ctx.lineTo(x + side * r * 0.06, r * 0.93); } ctx.stroke();
  }
  // gnarled arms (behind the body)
  for (const side of [-1, 1]) {
    const lift = rear ? -1.0 * rear : slam ? 0.4 : step * side * 0.15;
    const sx = side * r * 0.5, sy = -r * 0.2;
    const hx = side * r * (1.0 - rear * 0.3), hy = r * (0.5 + lift * (rear ? 1.95 : 1.1));
    const cx = side * r * 1.15, cy = sy + lift * r * 0.3;
    sxdLimb(ctx, r * 0.28, flesh.shade, dk, () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, hx, hy); });
    ctx.strokeStyle = flesh.primary; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(sx - side * r * 0.04, sy - r * 0.04); ctx.quadraticCurveTo(cx - side * r * 0.06, cy - r * 0.05, hx - side * r * 0.05, hy - r * 0.04); ctx.stroke();
    ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.5;
    ctx.beginPath(); ctx.moveTo(sx, sy + r * 0.06); ctx.quadraticCurveTo(cx - side * r * 0.08, cy + r * 0.06, hx, hy); ctx.stroke(); ctx.globalAlpha = A;
    // root-claw fist
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(hx, hy, r * 0.2, 0, SXD_TAU); }, flesh, r * 0.25);
    for (const d of [-1, 0, 1]) sxdHorn(ctx, hx + d * r * 0.1, hy + r * 0.12, hx + d * r * 0.16, hy + r * 0.28, hx + d * r * 0.1 + side * r * 0.04, hy + r * 0.38, r * 0.08, bone, dk);
    // bracket fungus on the forearm
    const bx = (sx + hx) / 2 + side * r * 0.12, by = (sy + hy) / 2;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(bx, by, r * 0.15, r * 0.07, side * 0.3, Math.PI, 0); ctx.closePath(); }, shelf, r * 0.18);
    if (rear || slam) drawGlow(ctx, hx, hy, r * 0.35, pal.glow, 0.45 + rear * 0.4);
  }
  // hunched trunk body
  const body = () => { ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.25); ctx.quadraticCurveTo(-r * 0.68, r * 0.35, -r * 0.4, r * 0.62); ctx.quadraticCurveTo(0, r * 0.74, r * 0.4, r * 0.62); ctx.quadraticCurveTo(r * 0.68, r * 0.35, r * 0.6, -r * 0.25); ctx.closePath(); };
  crShade(ctx, body, flesh, r * 0.85);
  sxdStrokes(ctx, r, [[-0.45, -0.1, -0.5, 0.3, -0.3, 0.58], [-0.18, 0.0, -0.2, 0.35, -0.1, 0.66], [0.15, 0.0, 0.18, 0.35, 0.1, 0.66], [0.44, -0.1, 0.5, 0.3, 0.3, 0.58]], flesh.dark, Math.max(1, r * 0.03), 0.45);
  // glowing mycelium veins
  ctx.globalAlpha = A * (0.45 + 0.25 * Math.sin(t * 2.5 + m.seed) + rear * 0.3); ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.6); ctx.lineTo(-r * 0.24, r * 0.4); ctx.lineTo(-r * 0.32, r * 0.25); ctx.moveTo(r * 0.28, r * 0.62); ctx.lineTo(r * 0.22, r * 0.45); ctx.lineTo(r * 0.3, r * 0.32); ctx.lineTo(r * 0.24, r * 0.2); ctx.stroke();
  ctx.globalAlpha = A;
  // moss on the belly
  ctx.fillStyle = moss.primary; ctx.globalAlpha = A * 0.85;
  ctx.beginPath(); for (const [x, y, s] of [[-0.36, 0.5, 0.1], [-0.24, 0.58, 0.08], [0.36, 0.44, 0.07]]) { ctx.moveTo(x * r + s * r, y * r); ctx.arc(x * r, y * r, s * r, 0, SXD_TAU); } ctx.fill();
  ctx.globalAlpha = A;
  // shelf-fungus pauldrons (stacked plates) on the shoulders
  for (const side of [-1, 1]) {
    for (let k = 1; k >= 0; k--) {
      const x = side * r * (0.6 + k * 0.08), y = -r * (0.08 - k * 0.16), w = r * (0.26 - k * 0.06);
      crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.45, side * 0.35, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); }, shelf, w);
      ctx.strokeStyle = shelf.dark; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.5; ctx.beginPath(); ctx.ellipse(x, y, w * 0.8, w * 0.28, side * 0.35, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.globalAlpha = A;
    }
  }
  // void face in the cap's shadow
  sxdShadow(ctx, 0.55, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.5, r * 0.22, 0, 0, SXD_TAU); }, '#0a0212');
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.3); ctx.quadraticCurveTo(-r * 0.34, r * 0.12, 0, r * 0.22); ctx.quadraticCurveTo(r * 0.34, r * 0.12, r * 0.32, -r * 0.3); ctx.closePath(); ctx.fill();
  const rage = Math.max(rear, m.windup || 0);
  sxdEyes(ctx, 0, -r * 0.1, r * 0.11, r * 0.06, r * 0.14, pal.glow, crBlink(m, t), 0.9 + rage * 0.1, 0.42, null);
  // gill-tooth maw
  const open = r * (0.04 + rage * 0.07 + slam * 0.05);
  const my = r * 0.07;
  ctx.fillStyle = sxdC(m, '#2a0a3a'); ctx.beginPath(); ctx.ellipse(0, my, r * 0.18, open + r * 0.02, 0, 0, SXD_TAU); ctx.fill();
  if (rage > 0.1) drawGlow(ctx, 0, my, r * 0.25, pal.glow, rage * 0.6);
  sxdFangs(ctx, -r * 0.17, r * 0.17, my - open - r * 0.01, 6, open * 0.9 + r * 0.04, 1, bone);
  sxdFangs(ctx, -r * 0.13, r * 0.13, my + open + r * 0.015, 4, open * 0.7 + r * 0.03, -1, bone);
  // the broad jagged cap, pulled low
  drawGlow(ctx, 0, -r * 0.6, r * 1.3, pal.glow, 0.14 + 0.06 * Math.sin(t * 2 + m.seed));
  ctx.save(); ctx.rotate(step * 0.035);
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, -r * 0.22);
    ctx.bezierCurveTo(-r * 1.1, -r * 0.85, -r * 0.5, -r * 1.12, 0, -r * 1.14);
    ctx.bezierCurveTo(r * 0.5, -r * 1.12, r * 1.1, -r * 0.85, r * 1.2, -r * 0.22);
    for (let i = 1; i <= 10; i++) {
      const x = r * 1.2 - i * r * 0.24;
      ctx.lineTo(x + r * 0.12, -r * 0.22 + r * (0.06 + 0.07 * sxdRnd(m.seed + 3, i)));
      ctx.lineTo(x, -r * 0.22 - r * 0.02);
    }
    ctx.closePath();
  };
  crShade(ctx, cap, sxdP(pal), r * 1.2);
  // underside gill band peeking under the brim
  ctx.strokeStyle = pal.shade; ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 1.1, -r * 0.24); ctx.quadraticCurveTo(0, -r * 0.34, r * 1.1, -r * 0.24); ctx.stroke();
  sxdStrokes(ctx, r, [[0, -1.08, -0.5, -0.8, -0.9, -0.3], [0, -1.08, -0.2, -0.7, -0.35, -0.3], [0, -1.08, 0.2, -0.7, 0.35, -0.3], [0, -1.08, 0.5, -0.8, 0.9, -0.3]], pal.dark, Math.max(1, r * 0.04), 0.35);
  // dangling moss strands
  ctx.strokeStyle = moss.primary; ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath(); for (const x of [-0.95, -0.62, 0.7, 1.0]) { const sw = Math.sin(t * 2 + x * 5) * r * 0.04; ctx.moveTo(x * r, -r * 0.24); ctx.quadraticCurveTo(x * r + sw, -r * 0.08, x * r + sw * 2, r * 0.08); } ctx.stroke();
  // luminous pores
  for (const [x, y, s] of [[-0.62, -0.6, 0.08], [0.02, -0.92, 0.1], [0.6, -0.62, 0.075], [-0.25, -0.78, 0.05], [0.32, -0.82, 0.05]]) {
    drawGlow(ctx, x * r, y * r, s * r * 3, pal.glow, 0.55 + 0.3 * Math.sin(t * 3 + x * 7));
    ctx.fillStyle = '#dffff6'; ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.62, x * 0.4, 0, SXD_TAU); ctx.fill();
  }
  sxdSpec(ctx, -r * 0.45, -r * 0.85, r * 0.3, r * 0.08, -0.35, 0.22);
  ctx.restore();
}

// Kaizoa — the spectral cobra boss: heavy coils of black-jade scale with
// pale belly plates, a vast ribbed hood painted with glowing spectacle
// marks, an arrow-headed skull with horned brows, burning slit eyes and
// long fangs; the hood flares and the jaws gape before every volley.
function sxdSerpent(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a5a' : pal.glow;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const scale = sxdMat(m, pal, '#3a8a72', '#17473d', '#082420', '#020c0a', '#2f6e5e');
  const hoodIn = sxdMat(m, pal, '#5aa088', '#2a6656', '#0e3029', '#020c0a', '#3a8070');
  const belly = sxdMat(m, pal, '#f0e8c8', '#b8ac84', '#5a5236', '#16120a', '#d8d0b0');
  const dk = sxdC(m, '#020a08');
  const bone = sxdC(m, '#f4f0e0');
  // coils (back to front): scale rows, belly band, a glowing seam
  for (let i = 3; i >= 0; i--) {
    const y = r * (0.78 - i * 0.17), w = r * (1.0 - i * 0.13), h = r * 0.21;
    const sx = Math.sin(t * 1.5 + i) * r * 0.06;
    const coil = () => { ctx.beginPath(); ctx.ellipse(sx, y, w, h, 0, 0, SXD_TAU); };
    crShade(ctx, coil, scale, r * 0.7);
    ctx.save(); coil(); ctx.clip();
    ctx.fillStyle = belly.shade; ctx.globalAlpha = A * 0.8;
    ctx.beginPath(); ctx.ellipse(sx, y + h * 0.95, w * 0.92, h * 0.45, 0, 0, SXD_TAU); ctx.fill();
    ctx.globalAlpha = A * 0.5; ctx.strokeStyle = dk; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -7; k <= 7; k++) {
      const x = sx + k * w * 0.13 + ((i % 2) * w * 0.065);
      ctx.moveTo(x - w * 0.065, y - h * 0.5); ctx.lineTo(x, y - h * 0.05); ctx.lineTo(x + w * 0.065, y - h * 0.5);
      ctx.moveTo(x - w * 0.065, y + h * 0.05); ctx.lineTo(x, y + h * 0.45);
    }
    ctx.stroke();
    ctx.globalAlpha = A * (0.35 + 0.25 * heave); ctx.strokeStyle = glow;
    ctx.beginPath();
    for (let k = -3; k <= 3; k += 2) { const x = sx + k * w * 0.2; ctx.moveTo(x - w * 0.05, y - h * 0.25); ctx.lineTo(x, y - h * 0.55); ctx.lineTo(x + w * 0.05, y - h * 0.25); }
    ctx.stroke();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  // rattling crystal tail tip
  ctx.save(); ctx.translate(r * 1.02 + Math.sin(t * 20) * r * 0.025, r * 0.66); ctx.rotate(0.3);
  for (let k = 0; k < 3; k++) crGem(ctx, 0, -k * r * 0.1, r * (0.07 - k * 0.012), r * 0.1, k ? scale.light : glow, A);
  ctx.restore();
  const sway = Math.sin(t * 1.2) * r * 0.06;
  ctx.save(); ctx.translate(sway, -r * 0.18);
  // vast ribbed hood: dark outer back, scaled inner face
  const flare = 1 + heave * 0.1;
  const hood = (k) => { ctx.beginPath(); ctx.moveTo(0, -r * 0.8 * k); ctx.bezierCurveTo(r * 0.85 * flare * k, -r * 0.8 * k, r * 0.72 * flare * k, -r * 0.0, r * 0.13, r * 0.5); ctx.lineTo(-r * 0.13, r * 0.5); ctx.bezierCurveTo(-r * 0.72 * flare * k, -r * 0.0, -r * 0.85 * flare * k, -r * 0.8 * k, 0, -r * 0.8 * k); ctx.closePath(); };
  crShade(ctx, () => hood(1), scale, r * 0.9);
  crShade(ctx, () => hood(0.86), hoodIn, r * 0.8, false);
  ctx.save(); hood(0.86); ctx.clip();
  // ribs + scale stipple
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.2, r * 0.025); ctx.globalAlpha = A * 0.5;
  ctx.beginPath(); for (const a of [-1.0, -0.6, -0.25, 0.25, 0.6, 1.0]) { ctx.moveTo(Math.sin(a) * r * 0.1, r * 0.3); ctx.quadraticCurveTo(Math.sin(a) * r * 0.5, -r * 0.15, Math.sin(a) * r * 0.82, -r * 0.62); } ctx.stroke();
  ctx.globalAlpha = A * 0.3; ctx.fillStyle = dk;
  ctx.beginPath();
  for (let yy = -5; yy <= 3; yy++) for (let xx = -6; xx <= 6; xx++) { const x = (xx + (yy & 1) * 0.5) * r * 0.11, y = yy * r * 0.1; ctx.moveTo(x + r * 0.02, y); ctx.arc(x, y, r * 0.02, 0, SXD_TAU); }
  ctx.fill();
  ctx.globalAlpha = A;
  // pale throat plates
  ctx.fillStyle = belly.primary; ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.08); ctx.quadraticCurveTo(0, r * 0.02, r * 0.15, -r * 0.08); ctx.lineTo(r * 0.11, r * 0.5); ctx.lineTo(-r * 0.11, r * 0.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = belly.shade; ctx.lineWidth = Math.max(1, r * 0.02); ctx.beginPath(); for (let k = 0; k < 6; k++) { const y = r * (0.0 + k * 0.085); ctx.moveTo(-r * 0.14, y); ctx.quadraticCurveTo(0, y + r * 0.03, r * 0.14, y); } ctx.stroke();
  sxdShadow(ctx, 0.45, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.3, r * 0.14, 0, 0, SXD_TAU); });
  ctx.restore();
  // glowing spectacle marks (false eyes) on the hood
  ctx.globalAlpha = A * (0.7 + 0.3 * heave);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.44, -r * 0.3); ctx.rotate(side * 0.35);
    ctx.strokeStyle = dk; ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.1, r * 0.15, 0, 0, SXD_TAU); ctx.stroke();
    ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1.2, r * 0.025);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.1, r * 0.15, 0, 0, SXD_TAU); ctx.stroke();
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.035, r * 0.08, 0, 0, SXD_TAU); ctx.fill();
    ctx.restore();
    drawGlow(ctx, side * r * 0.44, -r * 0.3, r * 0.2, glow, 0.35 + heave * 0.3);
  }
  ctx.globalAlpha = A;
  // arrow-headed skull with horned brows, rising above the hood
  const hy = -r * 0.06;
  ctx.save(); ctx.translate(0, hy);
  for (const side of [-1, 1]) sxdHorn(ctx, side * r * 0.17, -r * 0.62, side * r * 0.32, -r * 0.76, side * r * 0.3, -r * 0.98, r * 0.08, scale.shade, dk, 3, dk);
  const head = () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(r * 0.2, -r * 0.72); ctx.lineTo(r * 0.27, -r * 0.5); ctx.lineTo(r * 0.2, -r * 0.3); ctx.lineTo(r * 0.09, -r * 0.18); ctx.lineTo(-r * 0.09, -r * 0.18); ctx.lineTo(-r * 0.2, -r * 0.3); ctx.lineTo(-r * 0.27, -r * 0.5); ctx.lineTo(-r * 0.2, -r * 0.72); ctx.closePath(); };
  crShade(ctx, head, scale, r * 0.45);
  // head scutes
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.02); ctx.globalAlpha = A * 0.65;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, -r * 0.58); ctx.moveTo(-r * 0.16, -r * 0.7); ctx.lineTo(0, -r * 0.6); ctx.lineTo(r * 0.16, -r * 0.7); ctx.moveTo(-r * 0.12, -r * 0.3); ctx.lineTo(-r * 0.04, -r * 0.22); ctx.moveTo(r * 0.12, -r * 0.3); ctx.lineTo(r * 0.04, -r * 0.22); ctx.stroke();
  ctx.globalAlpha = A;
  sxdSpec(ctx, -r * 0.1, -r * 0.68, r * 0.08, r * 0.025, -0.4, 0.3);
  // heavy brow ridges + slit eyes
  sxdEyes(ctx, 0, -r * 0.47, r * 0.075, r * 0.04, r * 0.12, glow, 1, 0.65 + heave * 0.3, 0.42);
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(2, r * 0.04); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.22, -r * 0.6); ctx.lineTo(-r * 0.05, -r * 0.5); ctx.moveTo(r * 0.22, -r * 0.6); ctx.lineTo(r * 0.05, -r * 0.5); ctx.stroke();
  // jaws: dark gullet, long fangs, forked tongue
  const jaw = r * (0.03 + heave * 0.14);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.2); ctx.lineTo(r * 0.1, -r * 0.2); ctx.lineTo(r * 0.07, -r * 0.18 + jaw); ctx.lineTo(-r * 0.07, -r * 0.18 + jaw); ctx.closePath(); ctx.fill();
  if (heave > 0.1) drawGlow(ctx, 0, -r * 0.18 + jaw * 0.5, r * 0.35 * heave, glow, heave);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.09, -r * 0.18 + jaw); ctx.lineTo(r * 0.09, -r * 0.18 + jaw); ctx.lineTo(0, -r * 0.08 + jaw); ctx.closePath(); }, scale, r * 0.15);
  ctx.fillStyle = bone;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.095, -r * 0.21); ctx.quadraticCurveTo(side * r * 0.09, -r * 0.12 + jaw * 0.5, side * r * 0.055, -r * 0.08 + jaw * 0.6); ctx.lineTo(side * r * 0.06, -r * 0.21); ctx.closePath(); ctx.fill(); }
  if (Math.sin(t * 3) > 0.4 || heave > 0.5) {
    ctx.strokeStyle = sxdC(m, '#c8203a'); ctx.lineWidth = Math.max(1.5, r * 0.025); ctx.lineCap = 'round';
    const ty = -r * 0.12 + jaw;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.18); ctx.lineTo(0, ty + r * 0.06); ctx.lineTo(-r * 0.04, ty + r * 0.12); ctx.moveTo(0, ty + r * 0.06); ctx.lineTo(r * 0.04, ty + r * 0.12); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ================================================ CROWN OF THE MOUNTAIN ====
// Palette from the island: slate-grey granite, blackened iron, worn gold
// trim, amber rune-light.

const SXD_GOLD = ['#ffe08a', '#d8a038', '#7a5214', '#2a1a04'];

// gold trim stroke along a path (dark under-stroke + gold)
function sxdTrim(ctx, m, w, path) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = sxdC(m, SXD_GOLD[3]); ctx.lineWidth = w * 1.7; path(); ctx.stroke();
  ctx.strokeStyle = sxdC(m, SXD_GOLD[1]); ctx.lineWidth = w; path(); ctx.stroke();
}

// War-ram — battle-scarred mountain ram in an iron chanfron: coarse dark
// fleece, massive ridged spiral horns, hooves of black horn, burning amber
// eyes; drops its armoured head and snorts steam before the charge.
function sxdSpiralHorn(ctx, cx, cy, R0, R1, a0, sweep, w0, w1, fill, hi, edge, ridge) {
  const N = 14;
  const P = [];
  for (let k = 0; k <= N; k++) { const q = k / N, a = a0 + sweep * q, R = R0 + (R1 - R0) * q; P.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, (w0 + (w1 - w0) * q) * 0.5, a, R]); }
  const disc = (grow) => { ctx.beginPath(); for (const [x, y, w] of P) { ctx.moveTo(x + w + grow, y); ctx.arc(x, y, w + grow, 0, SXD_TAU); } };
  ctx.fillStyle = edge; disc(Math.max(1, w0 * 0.12)); ctx.fill();
  ctx.fillStyle = fill; disc(0); ctx.fill();
  // highlight along the outer face of the curl
  ctx.fillStyle = hi; ctx.globalAlpha *= 0.55;
  ctx.beginPath(); for (let k = 0; k < N * 0.7; k++) { const [x, y, w, a] = P[k]; const hx = x + Math.cos(a) * w * 0.35, hy = y + Math.sin(a) * w * 0.35 - w * 0.2; ctx.moveTo(hx + w * 0.4, hy); ctx.arc(hx, hy, w * 0.4, 0, SXD_TAU); } ctx.fill();
  ctx.globalAlpha /= 0.55;
  // growth ridges across the horn
  ctx.strokeStyle = ridge; ctx.lineWidth = Math.max(0.8, w0 * 0.07);
  ctx.beginPath(); for (let k = 1; k < N; k++) { const [x, y, w, a] = P[k]; const c = Math.cos(a), s = Math.sin(a); ctx.moveTo(x - c * w * 0.9, y - s * w * 0.9); ctx.lineTo(x + c * w * 0.9, y + s * w * 0.9); } ctx.stroke();
}

function sxdRam(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.8 : 2.4);
  const butt = ph === 'windup' ? 1 : ph === 'burst' ? 0.8 : 0;
  const fleece = sxdMat(m, pal, '#8a8478', '#4e4a42', '#24221e', '#0c0b0a');
  const iron = sxdMat(m, pal, '#b4bcc8', '#5a606c', '#262a32', '#0a0b0e', '#8a8f9a');
  const dk = sxdC(m, '#0c0b0a');
  // legs: rear pair (far) then front pair, with knees and black hooves
  for (const [x, p, far] of [[-0.4, 0, 1], [0.4, Math.PI, 1], [-0.22, Math.PI, 0], [0.22, 0, 0]]) {
    const s = Math.sin(run + p);
    const lx = x * r, top = r * (far ? 0.15 : 0.25), foot = r * (far ? 0.74 : 0.88) - Math.max(0, s) * r * 0.1;
    const kx = lx + s * r * 0.04, ky = (top + foot) * 0.5 + r * 0.04;
    sxdLimb(ctx, r * (far ? 0.1 : 0.12), far ? fleece.shade : fleece.primary, dk, () => { ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(kx, ky); ctx.lineTo(lx + s * r * 0.06, foot - r * 0.07); });
    const fx = lx + s * r * 0.06;
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(fx - r * 0.075, foot - r * 0.08); ctx.lineTo(fx + r * 0.075, foot - r * 0.08); ctx.lineTo(fx + r * 0.08, foot + r * 0.02); ctx.lineTo(fx + r * 0.01, foot + r * 0.02); ctx.lineTo(fx, foot - r * 0.02); ctx.lineTo(fx - r * 0.01, foot + r * 0.02); ctx.lineTo(fx - r * 0.08, foot + r * 0.02); ctx.closePath(); ctx.fill();
  }
  ctx.translate(0, -Math.abs(Math.sin(run)) * r * 0.05);
  // shaggy body: lumpy fleece locks
  const body = () => {
    ctx.beginPath();
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * SXD_TAU, am = ((i - 0.5) / n) * SXD_TAU;
      const x = Math.cos(a) * r * 0.66, y = r * 0.06 + Math.sin(a) * r * 0.46;
      if (!i) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(Math.cos(am) * r * 0.8, r * 0.06 + Math.sin(am) * r * 0.58, x, y);
    }
    ctx.closePath();
  };
  crShade(ctx, body, fleece, r * 0.8);
  sxdStrokes(ctx, r, [[-0.55, -0.05, -0.62, 0.1, -0.5, 0.2], [-0.4, 0.25, -0.42, 0.38, -0.3, 0.42], [0.55, -0.05, 0.62, 0.1, 0.5, 0.2], [0.4, 0.25, 0.42, 0.38, 0.3, 0.42], [-0.3, -0.3, -0.36, -0.2, -0.3, -0.1], [0.3, -0.3, 0.36, -0.2, 0.3, -0.1]], fleece.dark, Math.max(1, r * 0.04), 0.55);
  sxdStrokes(ctx, r, [[-0.48, -0.22, -0.52, -0.12, -0.44, -0.04], [0.42, -0.26, 0.48, -0.16, 0.42, -0.08]], fleece.light, Math.max(1, r * 0.03), 0.35);
  // head (drops for the charge)
  ctx.save(); ctx.translate(0, -r * 0.24 + butt * r * 0.2);
  // long wedge skull
  const skull = () => { ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.3); ctx.quadraticCurveTo(0, -r * 0.4, r * 0.26, -r * 0.3); ctx.quadraticCurveTo(r * 0.28, r * 0.02, r * 0.14, r * 0.3); ctx.quadraticCurveTo(0, r * 0.4, -r * 0.14, r * 0.3); ctx.quadraticCurveTo(-r * 0.28, r * 0.02, -r * 0.26, -r * 0.3); ctx.closePath(); };
  crShade(ctx, skull, fleece, r * 0.4);
  // massive spiral horns
  const hf = sxdC(m, '#a8987a'), hh = sxdC(m, '#f0e6cc'), hr = sxdC(m, '#4a3e2a');
  sxdSpiralHorn(ctx, r * 0.46, -r * 0.1, r * 0.3, r * 0.16, Math.PI + 0.55, 5.0, r * 0.26, r * 0.06, hf, hh, dk, hr);
  ctx.save(); ctx.scale(-1, 1);
  sxdSpiralHorn(ctx, r * 0.46, -r * 0.1, r * 0.3, r * 0.16, Math.PI + 0.55, 5.0, r * 0.26, r * 0.06, hf, hh, dk, hr);
  ctx.restore();
  // eyes under the horn bases
  sxdEyes(ctx, 0, -r * 0.06, r * 0.07, r * 0.04, r * 0.15, pal.glow, crBlink(m, t), 0.7 + butt * 0.3, 0.5);
  // iron chanfron with gold trim and a brow spike
  const plate = () => { ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.34); ctx.lineTo(r * 0.1, -r * 0.34); ctx.lineTo(r * 0.09, r * 0.14); ctx.lineTo(0, r * 0.24); ctx.lineTo(-r * 0.09, r * 0.14); ctx.closePath(); };
  crShade(ctx, plate, iron, r * 0.3);
  sxdTrim(ctx, m, Math.max(1, r * 0.025), plate);
  ctx.fillStyle = sxdC(m, '#dfe4ec'); ctx.beginPath(); ctx.moveTo(-r * 0.045, -r * 0.2); ctx.lineTo(0, -r * 0.46); ctx.lineTo(r * 0.045, -r * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dk; ctx.beginPath(); for (const y of [-0.08, 0.04]) { ctx.moveTo(-r * 0.05 + r * 0.014, y * r); ctx.arc(-r * 0.05, y * r, r * 0.014, 0, SXD_TAU); ctx.moveTo(r * 0.05 + r * 0.014, y * r); ctx.arc(r * 0.05, y * r, r * 0.014, 0, SXD_TAU); } ctx.fill();
  // muzzle + flared nostrils, steam on the windup
  for (const side of [-1, 1]) { ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(side * r * 0.06, r * 0.28, r * 0.025, r * 0.035, side * 0.4, 0, SXD_TAU); ctx.fill(); }
  if (butt) for (let i = 0; i < 2; i++) { const p = (t * 2.5 + i * 0.5) % 1; for (const side of [-1, 1]) drawGlow(ctx, side * r * (0.08 + p * 0.2), r * (0.34 + p * 0.15), r * (0.06 + p * 0.12), '#d8dde6', 0.5 * (1 - p)); }
  ctx.restore();
}

// Stone Brute (boulder) — a living granite boulder: chiselled facets,
// lichen crusts, a rune hammered into its brow that smoulders amber, deep
// eye-cracks and a jagged split of a mouth; it rolls, the face stays put.
function sxdBoulder(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const charge = ph === 'windup' ? 1 : 0;
  const rock = sxdMat(m, pal, '#a8acb4', '#6a6e78', '#30333a', '#0e0f12', '#8a8e98');
  const dk = sxdC(m, '#0e0f12');
  const n = 10;
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * SXD_TAU + 0.2; const rr = r * (0.78 + 0.16 * sxdRnd(m.seed + 7, i)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]); }
  const body = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
  ctx.save(); ctx.rotate(Math.sin(m.anim * 0.8) * 0.12);
  crShade(ctx, body, rock, r);
  // facets: lit and shadowed planes
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = rock.light; ctx.globalAlpha = A * 0.35;
  ctx.beginPath(); ctx.moveTo(pts[5][0], pts[5][1]); ctx.lineTo(pts[6][0], pts[6][1]); ctx.lineTo(pts[7][0], pts[7][1]); ctx.lineTo(-r * 0.1, -r * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rock.dark; ctx.globalAlpha = A * 0.35;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(r * 0.15, r * 0.35); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.lineTo(-r * 0.2, r * 0.3); ctx.closePath(); ctx.globalAlpha = A * 0.2; ctx.fill();
  ctx.globalAlpha = A;
  // lichen crusts
  ctx.fillStyle = sxdC(m, '#8a9a5a'); ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); for (const [x, y, s] of [[-0.45, -0.55, 0.1], [-0.3, -0.62, 0.07], [0.55, 0.3, 0.06]]) { ctx.moveTo(x * r + s * r, y * r); ctx.arc(x * r, y * r, s * r, 0, SXD_TAU); } ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  // cracks
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.2); ctx.lineTo(r * 0.48, -r * 0.1); ctx.lineTo(r * 0.5, r * 0.12); ctx.moveTo(-r * 0.72, r * 0.15); ctx.lineTo(-r * 0.5, r * 0.22); ctx.lineTo(-r * 0.45, r * 0.45); ctx.stroke();
  ctx.restore();
  // heavy brow ledge
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.18); ctx.lineTo(0, -r * 0.24); ctx.lineTo(r * 0.1, -r * 0.18); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.5, -r * 0.14); ctx.lineTo(0, -r * 0.06); ctx.lineTo(-r * 0.5, -r * 0.14); ctx.closePath(); }, rock, r * 0.5);
  // brow rune
  const glowA = 0.55 + 0.3 * Math.sin(t * 3 + m.seed) + charge * 0.4;
  ctx.globalAlpha = A * Math.min(1, glowA); ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.5); ctx.lineTo(-r * 0.06, -r * 0.3); ctx.moveTo(-r * 0.06, -r * 0.4); ctx.lineTo(r * 0.08, -r * 0.52); ctx.moveTo(-r * 0.06, -r * 0.4); ctx.lineTo(r * 0.08, -r * 0.28); ctx.stroke();
  ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 0.4, r * 0.25, pal.glow, 0.3 + charge * 0.4);
  sxdEyes(ctx, 0, -r * 0.03, r * 0.11, r * 0.05, r * 0.24, pal.glow, crBlink(m, t), 0.7 + charge * 0.3, 0.3);
  // jagged split mouth
  const open = r * (0.05 + charge * 0.06);
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.36, r * 0.24); ctx.lineTo(-r * 0.2, r * 0.2 - open * 0.3); ctx.lineTo(-r * 0.05, r * 0.26 - open * 0.5); ctx.lineTo(r * 0.12, r * 0.2 - open * 0.4); ctx.lineTo(r * 0.36, r * 0.25); ctx.lineTo(r * 0.15, r * 0.3 + open); ctx.lineTo(-r * 0.1, r * 0.32 + open); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, r * 0.27, r * 0.22, pal.glow, 0.35 + charge * 0.4);
  sxdFangs(ctx, -r * 0.28, r * 0.28, r * 0.22, 5, r * 0.07, 1, rock.light, 0.5);
}

// Shard (pebble) — a jagged splinter of granite on two stumpy legs, its
// single glowing fissure-eye blazing; hops after its target.
function sxdPebble(ctx, m, pal, t, look) {
  const r = m.r;
  const hop = Math.abs(Math.sin(m.anim * 3));
  const rock = sxdMat(m, pal, '#b4b8c0', '#6e727c', '#32353c', '#0e0f12', '#8a8e98');
  const dk = sxdC(m, '#0e0f12');
  for (const side of [-1, 1]) sxdLimb(ctx, Math.max(1.6, r * 0.13), rock.dark, dk, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.25, r * 0.3); ctx.lineTo(side * r * (0.3 + hop * 0.08), r * 0.8 - hop * r * 0.15); });
  ctx.translate(0, -hop * r * 0.18);
  ctx.rotate(Math.sin(m.anim * 3) * 0.1);
  const SP = [[-0.1, -1.05], [0.12, -0.6], [0.45, -0.9], [0.44, -0.45], [0.8, -0.32], [0.6, 0.2], [0.25, 0.5], [-0.45, 0.45], [-0.78, 0.02], [-0.55, -0.32], [-0.62, -0.75], [-0.3, -0.5]];
  const shard = () => { ctx.beginPath(); ctx.moveTo(SP[0][0] * r, SP[0][1] * r); for (let i = 1; i < SP.length; i++) ctx.lineTo(SP[i][0] * r, SP[i][1] * r); ctx.closePath(); };
  crShade(ctx, shard, rock, r);
  ctx.save(); shard(); ctx.clip();
  ctx.fillStyle = rock.light; ctx.globalAlpha *= 0.4;
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 1.05); ctx.lineTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.55, -r * 0.32); ctx.lineTo(-r * 0.1, -r * 0.25); ctx.closePath(); ctx.moveTo(r * 0.45, -r * 0.9); ctx.lineTo(r * 0.44, -r * 0.45); ctx.lineTo(r * 0.2, -r * 0.4); ctx.closePath(); ctx.fill();
  ctx.restore();
  // fissure across the face with a blazing eye
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.05); ctx.lineTo(-r * 0.2, -r * 0.12); ctx.lineTo(r * 0.15, -r * 0.02); ctx.lineTo(r * 0.55, -r * 0.14); ctx.stroke();
  ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.07); ctx.lineTo(-r * 0.2, -r * 0.12); ctx.lineTo(r * 0.15, -r * 0.02); ctx.lineTo(r * 0.45, -r * 0.12); ctx.stroke();
  sxdEyes(ctx, 0, -r * 0.08, r * 0.12, r * 0.06, r * 0.2, pal.glow, crBlink(m, t), 0.55, 0.25);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.2); ctx.lineTo(r * 0.2, r * 0.16); ctx.lineTo(r * 0.05, r * 0.28); ctx.closePath(); ctx.fill();
}

// Stormtalon (eagle) — the King's war eagle: broad slate-and-bronze wings
// of layered blade-feathers, a gilded iron war-helm over a hooked beak,
// amber eyes, and black hooked talons hanging ready.
function sxdEagle(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 20 : 9) + m.seed);
  const plume = sxdMat(m, pal, '#a08a6a', '#5a4632', '#2a1e12', '#0c0804', '#7a6448');
  const cover = sxdMat(m, pal, '#c8b89a', '#8a765a', '#4a3a26', '#120c06', '#a89070');
  const iron = sxdMat(m, pal, '#c0c6d0', '#6a707c', '#2a2e36', '#0a0b0e', '#9aa0aa');
  const dk = sxdC(m, '#0c0804');
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.22, -r * 0.12); ctx.rotate(-0.15 - flap * 0.42);
    // primaries: separate blade feathers
    for (let k = 0; k < 5; k++) {
      const a = -0.5 + k * 0.22, len = r * (1.25 - k * 0.12);
      ctx.save(); ctx.translate(r * 0.55, r * 0.0); ctx.rotate(a);
      crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.07); ctx.quadraticCurveTo(len * 0.6, -r * 0.1, len, r * 0.02); ctx.quadraticCurveTo(len * 0.6, r * 0.08, 0, r * 0.07); ctx.closePath(); }, plume, r * 0.4);
      ctx.restore();
    }
    // arm + covert row
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.12);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.32, r * 0.85, -r * 0.18);
      for (let k = 0; k < 5; k++) { const x = r * (0.85 - k * 0.19); ctx.lineTo(x - r * 0.06, r * 0.12); ctx.lineTo(x - r * 0.16, r * 0.0); }
      ctx.lineTo(0, r * 0.18); ctx.closePath();
    }, cover, r * 0.6);
    sxdStrokes(ctx, r, [[0.2, -0.05, 0.75, -0.15], [0.15, 0.05, 0.6, -0.02]], cover.dark, 1, 0.5);
    ctx.restore();
  }
  // body + chest feathers
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.3); ctx.quadraticCurveTo(r * 0.36, -r * 0.2, r * 0.3, r * 0.25); ctx.quadraticCurveTo(r * 0.2, r * 0.6, 0, r * 0.7); ctx.quadraticCurveTo(-r * 0.2, r * 0.6, -r * 0.3, r * 0.25); ctx.quadraticCurveTo(-r * 0.36, -r * 0.2, 0, -r * 0.3); ctx.closePath(); }, plume, r * 0.6);
  ctx.strokeStyle = cover.light; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.45;
  ctx.beginPath(); for (let row = 0; row < 3; row++) for (let k = -1; k <= 1; k++) { const x = (k + (row & 1) * 0.5) * r * 0.14, y = r * (0.05 + row * 0.14); ctx.moveTo(x - r * 0.06, y); ctx.quadraticCurveTo(x, y + r * 0.07, x + r * 0.06, y); } ctx.stroke();
  ctx.globalAlpha = A;
  // tail fan peeking below
  ctx.fillStyle = plume.shade; ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.6); ctx.lineTo(-r * 0.2, r * 0.9); ctx.lineTo(0, r * 0.82); ctx.lineTo(r * 0.2, r * 0.9); ctx.lineTo(r * 0.15, r * 0.6); ctx.closePath(); ctx.fill();
  // talons: black hooks on gold-scaled feet
  for (const side of [-1, 1]) {
    ctx.strokeStyle = sxdC(m, '#c8a040'); ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.55); ctx.lineTo(side * r * 0.16, r * 0.74); ctx.stroke();
    for (const d of [-1, 0, 1]) sxdHorn(ctx, side * r * 0.16, r * 0.74, side * r * 0.16 + d * r * 0.08, r * 0.84, side * r * 0.16 + d * r * 0.12, r * 0.8, r * 0.05, dk, null);
  }
  // head: white-grey crest + iron war-helm with gold trim
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.24, -r * 0.48); ctx.lineTo(r * 0.3, -r * 0.24); ctx.lineTo(r * 0.12, -r * 0.14); ctx.lineTo(-r * 0.12, -r * 0.14); ctx.lineTo(-r * 0.3, -r * 0.24); ctx.lineTo(-r * 0.24, -r * 0.48); ctx.closePath(); }, sxdMat(m, pal, '#ffffff', '#d8d4cc', '#7a766e', '#1a1814', '#e8e4dc'), r * 0.35);
  const helm = () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.66); ctx.lineTo(r * 0.2, -r * 0.5); ctx.lineTo(r * 0.16, -r * 0.34); ctx.lineTo(0, -r * 0.4); ctx.lineTo(-r * 0.16, -r * 0.34); ctx.lineTo(-r * 0.2, -r * 0.5); ctx.closePath(); };
  crShade(ctx, helm, iron, r * 0.3);
  sxdTrim(ctx, m, Math.max(1, r * 0.025), helm);
  sxdEyes(ctx, 0, -r * 0.33, r * 0.07, r * 0.035, r * 0.12, pal.glow, crBlink(m, t), 0.7 + (m.windup || 0) * 0.3, 0.5);
  // hooked gold beak
  ctx.fillStyle = sxdC(m, SXD_GOLD[1]); ctx.strokeStyle = sxdC(m, SXD_GOLD[3]); ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.08, -r * 0.28); ctx.lineTo(r * 0.08, -r * 0.28); ctx.quadraticCurveTo(r * 0.07, -r * 0.08, 0, -r * 0.02); ctx.quadraticCurveTo(-r * 0.07, -r * 0.08, -r * 0.08, -r * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
  sxdSpec(ctx, -r * 0.03, -r * 0.2, r * 0.02, r * 0.05, 0.2, 0.5);
}

// Royal Guard — blackened plate with gold trim, spiked pauldrons, a crowned
// great helm whose T-visor smoulders amber, a crimson tabard bearing the
// crown and a crescent-bladed halberd it levels (blade glowing) to fire.
function sxdGuard(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.7);
  const aim = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const steel = sxdMat(m, pal, '#9aa2b0', '#4a505c', '#1e222a', '#08090c', '#7a8090');
  const cloth = sxdMat(m, pal, '#c84a4a', '#7a1a22', '#3a080e', '#120204', '#a83038');
  const dk = sxdC(m, '#08090c');
  // greaves
  for (const side of [-1, 1]) {
    const sw = side * step * 0.35;
    const leg = () => { ctx.beginPath(); ctx.moveTo(side * r * 0.2 - r * 0.11 + Math.sin(sw) * r * 0.12, r * 0.35); ctx.lineTo(side * r * 0.2 + r * 0.11 + Math.sin(sw) * r * 0.12, r * 0.35); ctx.lineTo(side * r * 0.2 + r * 0.12 + Math.sin(sw) * r * 0.15, r * 0.86); ctx.lineTo(side * r * 0.2 - r * 0.12 + Math.sin(sw) * r * 0.15, r * 0.86); ctx.closePath(); };
    crShade(ctx, leg, steel, r * 0.4);
  }
  // mail skirt
  ctx.fillStyle = steel.shade; ctx.beginPath(); ctx.moveTo(-r * 0.36, r * 0.2); ctx.lineTo(r * 0.36, r * 0.2); ctx.lineTo(r * 0.4, r * 0.52); ctx.lineTo(-r * 0.4, r * 0.52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dk; ctx.globalAlpha = A * 0.5;
  ctx.beginPath(); for (let yy = 0; yy < 3; yy++) for (let xx = -4; xx <= 4; xx++) { const x = (xx + (yy & 1) * 0.5) * r * 0.08, y = r * (0.27 + yy * 0.08); ctx.moveTo(x + r * 0.022, y); ctx.arc(x, y, r * 0.022, 0, SXD_TAU); } ctx.fill();
  ctx.globalAlpha = A;
  // breastplate
  const chest = () => { ctx.beginPath(); ctx.moveTo(-r * 0.38, -r * 0.34); ctx.lineTo(r * 0.38, -r * 0.34); ctx.lineTo(r * 0.34, r * 0.1); ctx.lineTo(r * 0.2, r * 0.28); ctx.lineTo(-r * 0.2, r * 0.28); ctx.lineTo(-r * 0.34, r * 0.1); ctx.closePath(); };
  crShade(ctx, chest, steel, r * 0.6);
  // tabard with the crown
  const tab = () => { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.24); ctx.lineTo(r * 0.2, -r * 0.24); ctx.lineTo(r * 0.18, r * 0.62); ctx.lineTo(0, r * 0.52); ctx.lineTo(-r * 0.18, r * 0.62); ctx.closePath(); };
  crShade(ctx, tab, cloth, r * 0.45, false);
  sxdTrim(ctx, m, Math.max(1, r * 0.025), tab);
  ctx.fillStyle = sxdC(m, SXD_GOLD[1]);
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.1); ctx.lineTo(-r * 0.11, -r * 0.05); ctx.lineTo(-r * 0.05, r * 0.02); ctx.lineTo(0, -r * 0.09); ctx.lineTo(r * 0.05, r * 0.02); ctx.lineTo(r * 0.11, -r * 0.05); ctx.lineTo(r * 0.1, r * 0.1); ctx.closePath(); ctx.fill();
  // spiked pauldrons
  for (const side of [-1, 1]) {
    const pd = () => { ctx.beginPath(); ctx.ellipse(side * r * 0.4, -r * 0.3, r * 0.22, r * 0.15, side * 0.3, Math.PI, 0); ctx.closePath(); };
    sxdHorn(ctx, side * r * 0.42, -r * 0.38, side * r * 0.5, -r * 0.52, side * r * 0.6, -r * 0.62, r * 0.09, sxdC(m, '#c8ccd4'), dk);
    crShade(ctx, pd, steel, r * 0.3);
    sxdTrim(ctx, m, Math.max(1, r * 0.022), () => { ctx.beginPath(); ctx.ellipse(side * r * 0.4, -r * 0.3, r * 0.22, r * 0.15, side * 0.3, Math.PI, 0); });
  }
  // halberd: haft, crescent axe, top spike
  ctx.save(); ctx.translate(r * 0.5, r * 0.12); ctx.rotate(-0.08 - aim * 0.75);
  sxdLimb(ctx, Math.max(1.6, r * 0.06), sxdC(m, '#4a3220'), dk, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(0, -r * 1.0); });
  const blade = () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.92); ctx.quadraticCurveTo(r * 0.38, -r * 0.92, r * 0.36, -r * 0.5); ctx.quadraticCurveTo(r * 0.2, -r * 0.7, 0, -r * 0.6); ctx.closePath(); };
  crShade(ctx, blade, sxdMat(m, pal, '#e8ecf4', '#9aa2b0', '#3a404c', '#0a0b0e', '#c8ccd4'), r * 0.3);
  ctx.fillStyle = sxdC(m, '#c8ccd4'); ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.92); ctx.lineTo(0, -r * 1.2); ctx.lineTo(r * 0.04, -r * 0.92); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(-r * 0.16, -r * 0.74); ctx.lineTo(0, -r * 0.7); ctx.closePath(); ctx.fill();
  if (aim > 0.05) { ctx.globalAlpha = A * aim; ctx.strokeStyle = pal.glow; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.moveTo(r * 0.04, -r * 0.88); ctx.quadraticCurveTo(r * 0.34, -r * 0.88, r * 0.33, -r * 0.54); ctx.stroke(); ctx.globalAlpha = A; drawGlow(ctx, r * 0.2, -r * 0.8, r * 0.35 * aim, pal.glow, aim); }
  if (m.fireFlash > 0) drawGlow(ctx, 0, -r * 1.1, r * 0.35, '#ffffff', 1);
  ctx.restore();
  // gauntlet on the haft
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(r * 0.48, r * 0.1, r * 0.1, 0, SXD_TAU); }, steel, r * 0.12);
  // crowned great helm with a T-visor
  const helm = () => { ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.4); ctx.lineTo(-r * 0.27, -r * 0.72); ctx.quadraticCurveTo(0, -r * 0.9, r * 0.27, -r * 0.72); ctx.lineTo(r * 0.25, -r * 0.4); ctx.quadraticCurveTo(0, -r * 0.3, -r * 0.25, -r * 0.4); ctx.closePath(); };
  crShade(ctx, helm, steel, r * 0.4);
  ctx.fillStyle = dk; ctx.fillRect(-r * 0.2, -r * 0.62, r * 0.4, r * 0.07); ctx.fillRect(-r * 0.035, -r * 0.62, r * 0.07, r * 0.22);
  ctx.globalAlpha = A * (0.7 + aim * 0.3); ctx.fillStyle = pal.glow; ctx.fillRect(-r * 0.17, -r * 0.6, r * 0.34, r * 0.025); ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 0.59, r * (0.22 + aim * 0.1), pal.glow, 0.7);
  ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.6; ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(0, -r * 0.66); ctx.stroke(); ctx.globalAlpha = A;
  // gold circlet with points
  ctx.fillStyle = sxdC(m, SXD_GOLD[1]); ctx.strokeStyle = sxdC(m, SXD_GOLD[3]); ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(-r * 0.27, -r * 0.7);
  for (let i = 0; i <= 4; i++) { const x = -r * 0.27 + i * r * 0.135; ctx.lineTo(x, -r * (i % 2 ? 0.8 : 0.92)); }
  ctx.lineTo(r * 0.27, -r * 0.7); ctx.quadraticCurveTo(0, -r * 0.8, -r * 0.27, -r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  sxdSpec(ctx, -r * 0.12, -r * 0.74, r * 0.05, r * 0.02, -0.4, 0.5);
}

// Mountain Ogre — slab-shouldered grey-skinned brute with a scarred hide,
// underbite tusks, an iron pauldron chained across its chest and a maul
// of hewn granite banded in iron; heaves the maul overhead to slam.
function sxdOgre(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.07);
  const skin = sxdMat(m, pal, '#b4b8a0', '#6e7462', '#30342a', '#0c0e0a', '#8a9078');
  const iron = sxdMat(m, pal, '#8a909a', '#40454e', '#1a1d22', '#08090b', '#6a707a');
  const rock = sxdMat(m, pal, '#b8b4ac', '#76726a', '#36332e', '#0e0d0b', '#9a968e');
  const leather = sxdMat(m, pal, '#8a6a4a', '#4a3222', '#22160c', '#0a0604', '#6a4e36');
  const dk = sxdC(m, '#0c0e12');
  const bone = sxdC(m, '#ece4cc');
  // legs + feet
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? step * r * 0.12 : 0;
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.15, r * 0.4); ctx.lineTo(side * r * 0.55, r * 0.4); ctx.lineTo(side * r * 0.58, r * 0.85 - lift); ctx.lineTo(side * r * 0.14, r * 0.85 - lift); ctx.closePath(); }, skin, r * 0.4);
    ctx.fillStyle = dk; ctx.beginPath(); for (const d of [0.2, 0.36, 0.52]) { const x = side * r * d; ctx.moveTo(x - r * 0.04, r * 0.85 - lift); ctx.lineTo(x, r * 0.92 - lift); ctx.lineTo(x + r * 0.04, r * 0.85 - lift); } ctx.fill();
  }
  // maul arm (right) — raise for the slam
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : ph === 'burst' ? -0.3 : (m.windup || 0);
  ctx.save(); ctx.translate(r * 0.68, -r * 0.18); ctx.rotate(-0.4 - raise * 2.4 + step * 0.12);
  sxdLimb(ctx, r * 0.26, skin.primary, dk, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.5); });
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.05, r * 0.3, r * 0.1, r * 0.7, r * 0.03); }, leather, r * 0.3);
  const head = () => { ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.92); ctx.lineTo(r * 0.28, r * 0.88); ctx.lineTo(r * 0.32, r * 1.34); ctx.lineTo(-r * 0.26, r * 1.38); ctx.closePath(); };
  crShade(ctx, head, rock, r * 0.5);
  ctx.fillStyle = iron.primary; ctx.fillRect(-r * 0.3, r * 1.0, r * 0.62, r * 0.07); ctx.fillRect(-r * 0.28, r * 1.22, r * 0.62, r * 0.07);
  ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.95); ctx.lineTo(-r * 0.02, r * 1.12); ctx.lineTo(-r * 0.12, r * 1.3); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.32, r * 0.15, 0, SXD_TAU); }, skin, r * 0.18);
  ctx.restore();
  // massive torso: slab shoulders, gut
  const torso = () => { ctx.beginPath(); ctx.moveTo(-r * 0.82, -r * 0.3); ctx.quadraticCurveTo(-r * 0.7, -r * 0.62, -r * 0.2, -r * 0.55); ctx.lineTo(r * 0.2, -r * 0.55); ctx.quadraticCurveTo(r * 0.7, -r * 0.62, r * 0.82, -r * 0.3); ctx.quadraticCurveTo(r * 0.82, r * 0.25, r * 0.55, r * 0.5); ctx.quadraticCurveTo(0, r * 0.66, -r * 0.55, r * 0.5); ctx.quadraticCurveTo(-r * 0.82, r * 0.25, -r * 0.82, -r * 0.3); ctx.closePath(); };
  crShade(ctx, torso, skin, r);
  // pecs + gut shading, scars
  sxdShadow(ctx, 0.3, () => { ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.08); ctx.quadraticCurveTo(0, r * 0.06, r * 0.5, -r * 0.08); ctx.quadraticCurveTo(0, r * 0.0, -r * 0.5, -r * 0.08); }, skin.dark);
  ctx.strokeStyle = skin.dark; ctx.lineWidth = Math.max(1.5, r * 0.035); ctx.globalAlpha = A * 0.55;
  ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.08); ctx.quadraticCurveTo(-r * 0.2, r * 0.05, 0, -r * 0.05); ctx.quadraticCurveTo(r * 0.2, r * 0.05, r * 0.45, -r * 0.08); ctx.moveTo(-r * 0.2, r * 0.2); ctx.quadraticCurveTo(0, r * 0.28, r * 0.2, r * 0.2); ctx.stroke();
  ctx.strokeStyle = sxdC(m, '#c89090'); ctx.lineWidth = Math.max(1, r * 0.02); ctx.globalAlpha = A * 0.6;
  ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.05); ctx.lineTo(-r * 0.15, r * 0.28); ctx.moveTo(-r * 0.3, r * 0.14); ctx.lineTo(-r * 0.24, r * 0.1); ctx.moveTo(-r * 0.24, r * 0.22); ctx.lineTo(-r * 0.18, r * 0.18); ctx.stroke();
  ctx.globalAlpha = A;
  // deltoid bulge on the maul side + diagonal leather strap with studs
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(r * 0.66, -r * 0.3, r * 0.24, r * 0.2, 0.4, 0, SXD_TAU); }, skin, r * 0.3);
  const strap = () => { ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.36, -r * 0.56); ctx.lineTo(-r * 0.5, r * 0.32); ctx.lineTo(-r * 0.36, r * 0.38); ctx.closePath(); };
  crShade(ctx, strap, leather, r * 0.4);
  ctx.fillStyle = iron.light; ctx.beginPath(); for (let k = 1; k < 5; k++) { const q = k / 5; const x = r * 0.43 - q * r * 0.86, y = -r * 0.53 + q * r * 0.88; ctx.moveTo(x + r * 0.025, y); ctx.arc(x, y, r * 0.025, 0, SXD_TAU); } ctx.fill();
  // belt + loin
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.36); ctx.quadraticCurveTo(0, r * 0.5, r * 0.6, r * 0.36); ctx.lineTo(r * 0.58, r * 0.48); ctx.quadraticCurveTo(0, r * 0.62, -r * 0.58, r * 0.48); ctx.closePath(); }, leather, r * 0.5);
  crGem(ctx, 0, r * 0.52, r * 0.08, r * 0.08, sxdC(m, SXD_GOLD[1]), A);
  // left arm: big fist hanging
  const sw = step * 0.15 + (ph === 'windup' ? 0.6 : 0);
  ctx.save(); ctx.translate(-r * 0.72, -r * 0.22); ctx.rotate(0.35 + sw);
  sxdLimb(ctx, r * 0.26, skin.primary, dk, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); });
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.17, 0, SXD_TAU); }, skin, r * 0.2);
  ctx.restore();
  // spiked iron pauldron on the left shoulder
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(-r * 0.62, -r * 0.4, r * 0.3, r * 0.2, -0.3, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); }, iron, r * 0.35);
  for (const [x, y] of [[-0.78, -0.52], [-0.58, -0.58], [-0.4, -0.52]]) sxdHorn(ctx, x * r, y * r, x * r, (y - 0.1) * r, (x - 0.02) * r, (y - 0.2) * r, r * 0.08, sxdC(m, '#c8ccd4'), dk);
  // small head sunk between the shoulders
  const rage = ph === 'windup' ? 1 : (m.windup || 0);
  for (const side of [-1, 1]) { ctx.fillStyle = skin.shade; ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.025); ctx.beginPath(); ctx.moveTo(side * r * 0.24, -r * 0.6); ctx.lineTo(side * r * 0.42, -r * 0.7); ctx.lineTo(side * r * 0.26, -r * 0.48); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const hd = () => { ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.64); ctx.quadraticCurveTo(0, -r * 0.86, r * 0.26, -r * 0.64); ctx.lineTo(r * 0.3, -r * 0.4); ctx.quadraticCurveTo(r * 0.2, -r * 0.24, 0, -r * 0.24); ctx.quadraticCurveTo(-r * 0.2, -r * 0.24, -r * 0.3, -r * 0.4); ctx.closePath(); };
  crShade(ctx, hd, skin, r * 0.38);
  sxdShadow(ctx, 0.45, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.54, r * 0.22, r * 0.06, 0, 0, SXD_TAU); }, skin.dark);
  sxdEyes(ctx, 0, -r * 0.53, r * 0.06, r * 0.032, r * 0.1, pal.glow, crBlink(m, t), 0.6 + rage * 0.4, 0.45);
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.62); ctx.lineTo(-r * 0.03, -r * 0.56); ctx.moveTo(r * 0.2, -r * 0.62); ctx.lineTo(r * 0.03, -r * 0.56); ctx.stroke();
  // underbite jaw with tusks
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, -r * 0.36, r * 0.13, r * (0.03 + rage * 0.04), 0, 0, SXD_TAU); ctx.fill();
  for (const side of [-1, 1]) sxdHorn(ctx, side * r * 0.1, -r * 0.33, side * r * 0.12, -r * 0.42, side * r * 0.15, -r * 0.48, r * 0.05, bone, dk);
}

// Vargrum — the Mountain King: a towering giant-king in blackened plate
// edged with gold over a royal cape, a shaggy fur collar, a horned
// crown-helm whose cheek-guards frame a shadowed face with burning eyes, a
// long braided iron-grey beard ringed with gold, and a great rune hammer
// raised at his side whose runes ignite before each volley.
function sxdMountainKing(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d3a' : pal.glow;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const steel = sxdMat(m, pal, '#7a8290', '#363c48', '#15181e', '#060709', '#5a6272');
  const steelL = sxdMat(m, pal, '#aab2be', '#5a6270', '#22262e', '#060709', '#7a8290');
  const fur = sxdMat(m, pal, '#c8c2b6', '#7a746a', '#36322c', '#100e0c', '#a8a298');
  const cape = sxdMat(m, pal, '#a83a3a', '#5a1018', '#24040a', '#0c0204', '#7a2028');
  const beardM = sxdMat(m, pal, '#eceae4', '#a8a49c', '#55524c', '#141210', '#c8c4bc');
  const gold = sxdMat(m, pal, SXD_GOLD[0], SXD_GOLD[1], SXD_GOLD[2], SXD_GOLD[3], '#ffe08a');
  const dk = sxdC(m, '#060709');
  const sway = Math.sin(t * 1.3) * r * 0.02;
  // royal cape flaring behind
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.62, -r * 0.4); ctx.quadraticCurveTo(-r * 1.0, r * 0.4, -r * 0.95 + sway, r * 0.98); ctx.lineTo(-r * 0.5, r * 0.88); ctx.lineTo(0, r * 0.98); ctx.lineTo(r * 0.5, r * 0.88); ctx.lineTo(r * 0.95 + sway, r * 0.98); ctx.quadraticCurveTo(r * 1.0, r * 0.4, r * 0.62, -r * 0.4); ctx.closePath(); }, cape, r);
  sxdStrokes(ctx, r, [[-0.75, 0.1, -0.85, 0.5, -0.78, 0.9], [0.75, 0.1, 0.85, 0.5, 0.78, 0.9]], cape.dark, Math.max(1.5, r * 0.03), 0.6);
  // plate legs + sabatons
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.1, r * 0.55); ctx.lineTo(side * r * 0.42, r * 0.55); ctx.lineTo(side * r * 0.46, r * 0.92); ctx.lineTo(side * r * 0.06, r * 0.92); ctx.closePath(); }, steel, r * 0.4);
    sxdTrim(ctx, m, Math.max(1, r * 0.015), () => { ctx.beginPath(); ctx.moveTo(side * r * 0.08, r * 0.75); ctx.lineTo(side * r * 0.44, r * 0.75); });
  }
  // torso: broad V of plate
  const torso = () => { ctx.beginPath(); ctx.moveTo(-r * 0.66, -r * 0.42); ctx.lineTo(r * 0.66, -r * 0.42); ctx.quadraticCurveTo(r * 0.62, r * 0.1, r * 0.42, r * 0.38); ctx.lineTo(-r * 0.42, r * 0.38); ctx.quadraticCurveTo(-r * 0.62, r * 0.1, -r * 0.66, -r * 0.42); ctx.closePath(); };
  crShade(ctx, torso, steel, r * 0.9);
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.02); ctx.globalAlpha = A * 0.6;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.3); ctx.lineTo(0, r * 0.36); ctx.moveTo(-r * 0.5, r * 0.08); ctx.quadraticCurveTo(-r * 0.25, r * 0.16, -r * 0.05, r * 0.1); ctx.moveTo(r * 0.5, r * 0.08); ctx.quadraticCurveTo(r * 0.25, r * 0.16, r * 0.05, r * 0.1); ctx.stroke();
  ctx.globalAlpha = A;
  sxdSpec(ctx, -r * 0.35, -r * 0.1, r * 0.12, r * 0.05, -0.6, 0.18);
  // plated tassets with gold rims
  for (let k = 0; k < 3; k++) {
    const y = r * (0.34 + k * 0.1), w = r * (0.46 + k * 0.04);
    const ts = () => { ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.lineTo(w + r * 0.03, y + r * 0.12); ctx.quadraticCurveTo(0, y + r * 0.18, -w - r * 0.03, y + r * 0.12); ctx.closePath(); };
    crShade(ctx, ts, steelL, r * 0.5);
    sxdTrim(ctx, m, Math.max(1, r * 0.014), () => { ctx.beginPath(); ctx.moveTo(w + r * 0.03, y + r * 0.12); ctx.quadraticCurveTo(0, y + r * 0.18, -w - r * 0.03, y + r * 0.12); });
  }
  // rune buckle
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.26); ctx.lineTo(r * 0.12, r * 0.38); ctx.lineTo(0, r * 0.5); ctx.lineTo(-r * 0.12, r * 0.38); ctx.closePath(); }, gold, r * 0.15);
  crGem(ctx, 0, r * 0.4, r * 0.05, r * 0.07, glow, A);
  drawGlow(ctx, 0, r * 0.38, r * 0.16, glow, 0.5 + heave * 0.4);
  // left arm: gauntlet fist
  sxdLimb(ctx, r * 0.2, steel.shade, dk, () => { ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.2); ctx.lineTo(-r * 0.86, r * 0.32); });
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 1.02, r * 0.26, r * 0.3, r * 0.28, r * 0.07); }, steelL, r * 0.3);
  sxdTrim(ctx, m, Math.max(1, r * 0.016), () => { ctx.beginPath(); ctx.moveTo(-r * 1.0, r * 0.34); ctx.lineTo(-r * 0.74, r * 0.34); });
  // massive pauldrons with gold rims and spikes
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    sxdHorn(ctx, r * 0.72, -r * 0.5, r * 0.82, -r * 0.66, r * 0.98, -r * 0.78, r * 0.11, steelL.light, dk);
    sxdHorn(ctx, r * 0.9, -r * 0.36, r * 1.02, -r * 0.46, r * 1.14, -r * 0.5, r * 0.09, steelL.light, dk);
    const pd = () => { ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 0.44); ctx.quadraticCurveTo(r * 0.82, -r * 0.7, r * 1.04, -r * 0.24); ctx.lineTo(r * 0.94, r * 0.02); ctx.quadraticCurveTo(r * 0.68, -r * 0.14, r * 0.46, -r * 0.1); ctx.closePath(); };
    crShade(ctx, pd, steelL, r * 0.6);
    for (let k = 0; k < 2; k++) { ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.018); ctx.globalAlpha = A * 0.6; ctx.beginPath(); ctx.moveTo(r * (0.5 + k * 0.08), -r * (0.38 - k * 0.12)); ctx.quadraticCurveTo(r * (0.8 + k * 0.04), -r * (0.5 - k * 0.14), r * (0.98 - k * 0.02), -r * (0.18 - k * 0.12)); ctx.stroke(); ctx.globalAlpha = A; }
    sxdTrim(ctx, m, Math.max(1.5, r * 0.022), () => { ctx.beginPath(); ctx.moveTo(r * 1.04, -r * 0.24); ctx.lineTo(r * 0.94, r * 0.02); ctx.quadraticCurveTo(r * 0.68, -r * 0.14, r * 0.46, -r * 0.1); });
    ctx.restore();
  }
  // shaggy fur collar
  const collar = () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.56, -r * 0.34);
    for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; const x = Math.cos(a) * r * 0.56, y = -r * 0.4 + Math.sin(a) * r * 0.2; ctx.quadraticCurveTo(x - Math.cos(a) * r * 0.06, y - r * 0.08, x, y); }
    for (let i = 0; i <= 8; i++) { const x = r * 0.56 - i * r * 0.14; ctx.quadraticCurveTo(x - r * 0.07, -r * (0.18 + 0.05 * sxdRnd(9, i)), x - r * 0.14, -r * 0.3); }
    ctx.closePath();
  };
  crShade(ctx, collar, fur, r * 0.6);
  sxdStrokes(ctx, r, [[-0.45, -0.42, -0.42, -0.3], [-0.28, -0.5, -0.25, -0.34], [0.28, -0.5, 0.25, -0.34], [0.45, -0.42, 0.42, -0.3], [-0.12, -0.52, -0.1, -0.4], [0.12, -0.52, 0.1, -0.4]], fur.dark, Math.max(1, r * 0.022), 0.55);
  // braided beard flowing over the chest
  const beard = () => { ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.5); ctx.quadraticCurveTo(-r * 0.34, -r * 0.05, -r * 0.16, r * 0.18); ctx.lineTo(-r * 0.05, r * 0.02); ctx.lineTo(r * 0.05, r * 0.02); ctx.lineTo(r * 0.16, r * 0.18); ctx.quadraticCurveTo(r * 0.34, -r * 0.05, r * 0.26, -r * 0.5); ctx.closePath(); };
  crShade(ctx, beard, beardM, r * 0.45);
  sxdStrokes(ctx, r, [[-0.2, -0.4, -0.24, -0.1, -0.15, 0.12], [-0.08, -0.38, -0.1, -0.15, -0.06, 0.0], [0.08, -0.38, 0.1, -0.15, 0.06, 0.0], [0.2, -0.4, 0.24, -0.1, 0.15, 0.12]], beardM.shade, Math.max(1, r * 0.016), 0.75);
  for (const side of [-1, 1]) {
    const bx = side * r * 0.15, by = r * 0.16;
    sxdLimb(ctx, Math.max(2, r * 0.065), beardM.primary, dk, () => { ctx.beginPath(); ctx.moveTo(bx, by - r * 0.04); ctx.lineTo(bx + side * r * 0.01 + sway, by + r * 0.28); });
    ctx.strokeStyle = beardM.shade; ctx.lineWidth = 1; ctx.beginPath(); for (const y of [0.06, 0.13, 0.2]) { ctx.moveTo(bx - r * 0.03, by + y * r); ctx.lineTo(bx + r * 0.03, by + y * r + r * 0.03); } ctx.stroke();
    ctx.fillStyle = sxdC(m, SXD_GOLD[1]); ctx.fillRect(bx - r * 0.045 + sway * 0.5, by + r * 0.22, r * 0.09, r * 0.05);
  }
  // face: shadowed under the helm, burning eyes, a scowl in the beard
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.74); ctx.lineTo(r * 0.24, -r * 0.74); ctx.lineTo(r * 0.22, -r * 0.42); ctx.lineTo(-r * 0.22, -r * 0.42); ctx.closePath(); }, sxdMat(m, pal, '#b08870', '#6e4a38', '#301c12', '#0c0604', '#8a6450'), r * 0.3);
  sxdShadow(ctx, 0.6, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.64, r * 0.26, r * 0.1, 0, 0, SXD_TAU); }, '#000000');
  sxdEyes(ctx, 0, -r * 0.62, r * 0.075, r * 0.038, r * 0.11, glow, crBlink(m, t), 0.75 + heave * 0.25, 0.42);
  ctx.fillStyle = sxdC(m, '#4a2e20'); ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.6); ctx.lineTo(r * 0.04, -r * 0.6); ctx.lineTo(r * 0.06, -r * 0.5); ctx.lineTo(-r * 0.06, -r * 0.5); ctx.closePath(); ctx.fill();
  // moustache + mouth
  ctx.fillStyle = beardM.light;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.quadraticCurveTo(-r * 0.16, -r * 0.5, -r * 0.24, -r * 0.36); ctx.quadraticCurveTo(-r * 0.12, -r * 0.42, 0, -r * 0.44); ctx.quadraticCurveTo(r * 0.12, -r * 0.42, r * 0.24, -r * 0.36); ctx.quadraticCurveTo(r * 0.16, -r * 0.5, 0, -r * 0.5); ctx.fill();
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.07, r * (0.012 + heave * 0.035), 0, 0, SXD_TAU); ctx.fill();
  if (heave > 0.2) drawGlow(ctx, 0, -r * 0.4, r * 0.14, glow, heave * 0.6);
  // horned crown-helm with cheek guards
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    sxdHorn(ctx, r * 0.24, -r * 0.84, r * 0.66, -r * 0.88, r * 0.66, -r * 1.22, r * 0.13, sxdC(m, '#d8ccb0'), dk, 4, sxdC(m, '#6a5e48'));
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.8); ctx.lineTo(r * 0.32, -r * 0.76); ctx.lineTo(r * 0.3, -r * 0.46); ctx.lineTo(r * 0.2, -r * 0.4); ctx.closePath(); }, steelL, r * 0.25);
    ctx.restore();
  }
  const helm = () => { ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.72); ctx.quadraticCurveTo(-r * 0.32, -r * 0.98, 0, -r * 1.0); ctx.quadraticCurveTo(r * 0.32, -r * 0.98, r * 0.32, -r * 0.72); ctx.lineTo(r * 0.18, -r * 0.7); ctx.lineTo(0, -r * 0.62); ctx.lineTo(-r * 0.18, -r * 0.7); ctx.closePath(); };
  crShade(ctx, helm, steel, r * 0.45);
  sxdTrim(ctx, m, Math.max(1.2, r * 0.02), () => { ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.72); ctx.lineTo(-r * 0.18, -r * 0.7); ctx.lineTo(0, -r * 0.62); ctx.lineTo(r * 0.18, -r * 0.7); ctx.lineTo(r * 0.32, -r * 0.72); });
  // gold crown on the helm
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.84); for (let i = 0; i <= 6; i++) { const x = -r * 0.3 + i * r * 0.1; ctx.lineTo(x, -r * (i % 2 ? 0.96 : (i === 3 ? 1.2 : 1.1))); } ctx.lineTo(r * 0.3, -r * 0.84); ctx.quadraticCurveTo(0, -r * 0.92, -r * 0.3, -r * 0.84); ctx.closePath(); }, gold, r * 0.4);
  crGem(ctx, 0, -r * 0.94, r * 0.05, r * 0.08, glow, A);
  drawGlow(ctx, 0, -r * 0.94, r * 0.15, glow, 0.6);
  // rune hammer raised at his right side (in front)
  ctx.save(); ctx.translate(r * 0.86, r * 0.3); ctx.rotate(0.15 - heave * 0.9 + Math.sin(t * 1.5) * 0.04);
  sxdLimb(ctx, Math.max(2, r * 0.075), sxdC(m, '#3a2616'), dk, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.lineTo(0, -r * 0.9); });
  ctx.strokeStyle = sxdC(m, SXD_GOLD[1]); ctx.lineWidth = Math.max(1.5, r * 0.025);
  ctx.beginPath(); for (const y of [-0.1, -0.2, -0.3]) { ctx.moveTo(-r * 0.04, y * r); ctx.lineTo(r * 0.04, y * r - r * 0.035); } ctx.stroke();
  const hh = () => { ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 1.22); ctx.lineTo(r * 0.34, -r * 1.22); ctx.lineTo(r * 0.4, -r * 1.16); ctx.lineTo(r * 0.4, -r * 0.86); ctx.lineTo(r * 0.34, -r * 0.8); ctx.lineTo(-r * 0.34, -r * 0.8); ctx.lineTo(-r * 0.4, -r * 0.86); ctx.lineTo(-r * 0.4, -r * 1.16); ctx.closePath(); };
  crShade(ctx, hh, steelL, r * 0.5);
  sxdTrim(ctx, m, Math.max(1.2, r * 0.02), () => { ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.86); ctx.lineTo(-r * 0.4, -r * 1.16); ctx.moveTo(r * 0.4, -r * 0.86); ctx.lineTo(r * 0.4, -r * 1.16); });
  ctx.globalAlpha = A * (0.6 + heave * 0.4); ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1.5, r * 0.028);
  ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 1.12); ctx.lineTo(-r * 0.18, -r * 0.9); ctx.lineTo(-r * 0.1, -r * 1.12); ctx.moveTo(r * 0.02, -r * 1.14); ctx.lineTo(r * 0.02, -r * 0.88); ctx.moveTo(r * 0.02, -r * 1.01); ctx.lineTo(r * 0.14, -r * 1.12); ctx.moveTo(r * 0.02, -r * 1.01); ctx.lineTo(r * 0.14, -r * 0.9); ctx.moveTo(r * 0.22, -r * 1.12); ctx.lineTo(r * 0.3, -r * 0.9); ctx.stroke();
  ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 1.0, r * (0.35 + heave * 0.3), glow, 0.3 + heave * 0.5);
  ctx.restore();
  // gauntlet gripping the haft
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(r * 0.72, r * 0.16, r * 0.28, r * 0.24, r * 0.06); }, steelL, r * 0.25);
}

// =========================================================== DEEPWOOD ====
// Palette from the island: moss and lichen greens, black bark, roots,
// old ivory bone and a sickly green ghost-light.

// moss clump: dark base, lighter speckled top
function sxdMoss(ctx, m, x, y, s) {
  ctx.fillStyle = sxdC(m, '#2a4a1e');
  ctx.beginPath(); ctx.moveTo(x - s * 0.5 + s * 0.7, y); ctx.arc(x - s * 0.5, y, s * 0.7, 0, SXD_TAU); ctx.moveTo(x + s * 0.45 + s * 0.65, y + s * 0.05); ctx.arc(x + s * 0.45, y + s * 0.05, s * 0.65, 0, SXD_TAU); ctx.moveTo(x + s * 0.7, y - s * 0.35); ctx.arc(x, y - s * 0.35, s * 0.7, 0, SXD_TAU); ctx.fill();
  ctx.fillStyle = sxdC(m, '#5a8a32');
  ctx.beginPath(); ctx.moveTo(x - s * 0.15 + s * 0.38, y - s * 0.45); ctx.arc(x - s * 0.15, y - s * 0.45, s * 0.38, 0, SXD_TAU); ctx.moveTo(x + s * 0.4 + s * 0.25, y - s * 0.1); ctx.arc(x + s * 0.4, y - s * 0.1, s * 0.25, 0, SXD_TAU); ctx.fill();
  ctx.fillStyle = sxdC(m, '#9ac860');
  ctx.beginPath(); ctx.arc(x - s * 0.25, y - s * 0.6, s * 0.12, 0, SXD_TAU); ctx.fill();
}

// bone stroke (dark under-stroke + bone colour)
function sxdBone(ctx, w, bone, dark, path) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = w + Math.max(1.5, w * 0.5); path(); ctx.stroke();
  ctx.strokeStyle = bone; ctx.lineWidth = w; path(); ctx.stroke();
}

// Dire Boar — a hulking black-bristled boar, hunched shoulders under a
// spiked mane crusted with moss, scarred snout, long yellowed tusks and
// small sunken green eyes; paws the earth and steams before it charges.
function sxdBoar(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 4 : 2.6);
  const wind = ph === 'windup' ? 1 : 0;
  const paw = wind ? Math.sin(t * 25) * r * 0.08 : 0;
  const hide = sxdMat(m, pal, '#7a6250', '#3e2e22', '#1c140e', '#080504', '#5a4636');
  const snoutM = sxdMat(m, pal, '#8a7068', '#4a3630', '#201410', '#0a0604', '#6a5048');
  const dk = sxdC(m, '#080504');
  const tusk = sxdC(m, '#ece2c4');
  // legs: stout, hooved
  for (const [x, p, far] of [[-0.46, 0, 1], [0.46, Math.PI, 1], [-0.26, Math.PI, 0], [0.26, 0, 0]]) {
    const s = Math.sin(run + p);
    const lx = x * r, foot = r * (far ? 0.68 : 0.8) - Math.max(0, s) * r * 0.1 + (x > 0 && !far ? paw : 0);
    sxdLimb(ctx, r * (far ? 0.16 : 0.2), far ? hide.shade : hide.primary, dk, () => { ctx.beginPath(); ctx.moveTo(lx, r * 0.25); ctx.lineTo(lx + s * r * 0.06, foot - r * 0.06); });
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(lx + s * r * 0.06 - r * 0.08, foot - r * 0.06); ctx.lineTo(lx + s * r * 0.06 + r * 0.08, foot - r * 0.06); ctx.lineTo(lx + s * r * 0.06 + r * 0.07, foot + r * 0.03); ctx.lineTo(lx + s * r * 0.06, foot); ctx.lineTo(lx + s * r * 0.06 - r * 0.07, foot + r * 0.03); ctx.closePath(); ctx.fill();
  }
  ctx.translate(0, -Math.abs(Math.sin(run)) * r * 0.05 + wind * r * 0.05);
  // spiked bristle mane silhouette (behind)
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.05);
  for (let i = 0; i <= 10; i++) { const q = i / 10, x = -r * 0.7 + q * r * 1.4; const h = r * (0.42 + Math.sin(q * Math.PI) * 0.36 + 0.06 * sxdRnd(m.seed, i)); ctx.lineTo(x - r * 0.05, -r * 0.2 - Math.sin(q * Math.PI) * r * 0.1); ctx.lineTo(x, -h); }
  ctx.lineTo(r * 0.7, -r * 0.05); ctx.closePath(); ctx.fill();
  // hunched body
  const body = () => { ctx.beginPath(); ctx.moveTo(-r * 0.78, r * 0.12); ctx.quadraticCurveTo(-r * 0.8, -r * 0.4, 0, -r * 0.46); ctx.quadraticCurveTo(r * 0.8, -r * 0.4, r * 0.78, r * 0.12); ctx.quadraticCurveTo(r * 0.6, r * 0.5, 0, r * 0.48); ctx.quadraticCurveTo(-r * 0.6, r * 0.5, -r * 0.78, r * 0.12); ctx.closePath(); };
  crShade(ctx, body, hide, r);
  sxdStrokes(ctx, r, [[-0.6, -0.1, -0.5, 0.0], [-0.65, 0.12, -0.55, 0.2], [0.6, -0.1, 0.5, 0.0], [0.65, 0.12, 0.55, 0.2], [-0.4, -0.3, -0.32, -0.2], [0.4, -0.3, 0.32, -0.2], [-0.45, 0.3, -0.36, 0.36], [0.45, 0.3, 0.36, 0.36]], hide.light, Math.max(1, r * 0.03), 0.45);
  sxdMoss(ctx, m, -r * 0.4, -r * 0.34, r * 0.13);
  sxdMoss(ctx, m, r * 0.45, -r * 0.3, r * 0.1);
  // heavy head, low and forward
  ctx.save(); ctx.translate(0, r * 0.02 + wind * r * 0.06);
  const head = () => { ctx.beginPath(); ctx.moveTo(-r * 0.38, -r * 0.3); ctx.quadraticCurveTo(0, -r * 0.44, r * 0.38, -r * 0.3); ctx.quadraticCurveTo(r * 0.36, -r * 0.02, r * 0.17, r * 0.2); ctx.lineTo(-r * 0.17, r * 0.2); ctx.quadraticCurveTo(-r * 0.36, -r * 0.02, -r * 0.38, -r * 0.3); ctx.closePath(); };
  crShade(ctx, head, hide, r * 0.5);
  // ears laid back
  for (const side of [-1, 1]) { ctx.fillStyle = hide.shade; ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(side * r * 0.26, -r * 0.3); ctx.lineTo(side * r * 0.5, -r * 0.42); ctx.lineTo(side * r * 0.36, -r * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // brow + sunken eyes
  sxdShadow(ctx, 0.5, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.14, r * 0.3, r * 0.08, 0, 0, SXD_TAU); });
  sxdEyes(ctx, 0, -r * 0.14, r * 0.07, r * 0.035, r * 0.17, pal.glow, crBlink(m, t), 0.6 + wind * 0.4, 0.45);
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.26); ctx.lineTo(-r * 0.07, -r * 0.17); ctx.moveTo(r * 0.3, -r * 0.26); ctx.lineTo(r * 0.07, -r * 0.17); ctx.stroke();
  // snout disc with scars
  const sn = () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.14, r * 0.1, 0, 0, SXD_TAU); };
  crShade(ctx, sn, snoutM, r * 0.2);
  ctx.fillStyle = dk; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.05, r * 0.16, r * 0.022, r * 0.035, side * 0.3, 0, SXD_TAU); ctx.fill(); }
  sxdStrokes(ctx, r, [[-0.12, 0.0, 0.0, 0.03, 0.12, 0.0], [-0.1, -0.05, 0.0, -0.02, 0.1, -0.05]], hide.dark, Math.max(1, r * 0.025), 0.7);
  ctx.strokeStyle = sxdC(m, '#d8a090'); ctx.lineWidth = 1; ctx.globalAlpha = A * 0.7; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.05); ctx.lineTo(-r * 0.05, r * 0.03); ctx.stroke(); ctx.globalAlpha = A;
  // long curved tusks
  for (const side of [-1, 1]) sxdHorn(ctx, side * r * 0.13, r * 0.2, side * r * 0.52, r * 0.28, side * r * 0.5, -r * 0.24, r * 0.2, tusk, dk, 3, sxdC(m, '#a8987a'));
  if (wind || ph === 'burst') for (let i = 0; i < 2; i++) { const p = (t * 2.5 + i * 0.5) % 1; for (const side of [-1, 1]) drawGlow(ctx, side * r * (0.08 + p * 0.2), r * (0.28 + p * 0.15), r * (0.06 + p * 0.12), '#c8d8c0', 0.45 * (1 - p)); }
  ctx.restore();
}

// Rotpuff (puff) — a swollen, warty puffball rotted through: moss growing
// over its crown, split vents venting green spore-light, a ragged maw of
// woody teeth and two sunken eyes; root tendrils grip the ground.
function sxdPuff(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const wind = ph === 'windup' ? 1 : 0;
  const swell = wind ? 0.14 : Math.sin(t * 3 + m.seed) * 0.04;
  const skin = sxdMat(m, pal, '#a8a074', '#625a38', '#2a2614', '#0c0a04', '#7a7048');
  const dk = sxdC(m, '#0c0a04');
  const bone = sxdC(m, '#e8dcb8');
  for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3 + m.seed) % 1; drawGlow(ctx, Math.sin(i * 2 + t) * r * 0.35, -r * 0.7 - p * r, r * (0.12 + p * 0.22), pal.glow, 0.4 * (1 - p)); }
  // roots
  ctx.strokeStyle = sxdC(m, '#2a1e12'); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const k = (i - 2) / 2; const sw = Math.sin(m.anim * 2 + i) * r * 0.05; ctx.moveTo(k * r * 0.4, r * 0.55); ctx.quadraticCurveTo(k * r * 0.7 + sw, r * 0.7, k * r * 0.85 + sw, r * 0.9); } ctx.stroke();
  ctx.save(); ctx.translate(0, r * 0.6); ctx.scale(1 + swell, 1 + swell * 0.8); ctx.translate(0, -r * 0.6);
  const n = 10;
  const body = () => {
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * SXD_TAU - Math.PI / 2, am = ((k - 0.5) / n) * SXD_TAU - Math.PI / 2;
      const rr = r * (0.72 + 0.12 * sxdRnd(m.seed + 2, k % n));
      if (!k) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.85 + r * 0.05);
      else ctx.quadraticCurveTo(Math.cos(am) * r * 0.9, Math.sin(am) * r * 0.78 + r * 0.05, Math.cos(a) * rr, Math.sin(a) * rr * 0.85 + r * 0.05);
    }
    ctx.closePath();
  };
  crShade(ctx, body, skin, r);
  // warts
  for (const [x, y, s] of [[-0.5, -0.1, 0.07], [0.5, 0.05, 0.08], [0.3, 0.4, 0.06], [-0.35, 0.4, 0.05]]) {
    ctx.fillStyle = skin.shade; ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SXD_TAU); ctx.fill();
    sxdSpec(ctx, x * r - s * r * 0.3, y * r - s * r * 0.35, s * r * 0.4, s * r * 0.3, 0, 0.5, skin.light);
  }
  // moss crown + spore vents
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = sxdC(m, '#2e4e1e'); ctx.beginPath(); ctx.moveTo(-r, -r * 0.3);
  for (let i = 0; i <= 8; i++) { const x = -r + i * r * 0.25; ctx.quadraticCurveTo(x - r * 0.12, -r * (0.16 + 0.08 * (i % 2)), x, -r * 0.3); }
  ctx.lineTo(r, -r); ctx.lineTo(-r, -r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sxdC(m, '#5a8a32'); ctx.globalAlpha = A * 0.8;
  ctx.beginPath(); for (const [x, y, s] of [[-0.4, -0.5, 0.12], [0.1, -0.62, 0.14], [0.45, -0.45, 0.1]]) { ctx.moveTo(x * r + s * r, y * r); ctx.arc(x * r, y * r, s * r, 0, SXD_TAU); } ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  const vp = 0.55 + 0.35 * Math.sin(t * 4 + m.seed) + wind * 0.3;
  for (const [x, y] of [[-0.22, -0.5], [0.28, -0.56]]) {
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.08, r * 0.04, 0.3, 0, SXD_TAU); ctx.fill();
    drawGlow(ctx, x * r, y * r, r * 0.18, pal.glow, Math.min(1, vp));
  }
  // sunken eyes
  sxdShadow(ctx, 0.5, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.38, r * 0.1, 0, 0, SXD_TAU); }, skin.dark);
  sxdEyes(ctx, 0, -r * 0.08, r * 0.1, r * 0.05, r * 0.2, pal.glow, crBlink(m, t), 0.75, 0.38);
  // ragged maw with woody teeth
  const open = r * (0.08 + wind * 0.08 + swell * 0.3);
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.42, r * 0.18); ctx.quadraticCurveTo(0, r * 0.12, r * 0.42, r * 0.18); ctx.quadraticCurveTo(0, r * 0.2 + open * 2.2, -r * 0.42, r * 0.18); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, r * 0.25, r * 0.25, pal.glow, 0.3 + wind * 0.4);
  sxdFangs(ctx, -r * 0.36, r * 0.36, r * 0.16, 6, open * 0.9 + r * 0.03, 1, bone, 0.5);
  sxdFangs(ctx, -r * 0.26, r * 0.26, r * 0.2 + open * 1.1, 5, open * 0.7 + r * 0.02, -1, bone, 0.5);
  ctx.restore();
}

// Burr (spore) — a hooked thorn-seed rolling after its parent: a ball of
// curved black barbs around a pulsing green core with one slit eye.
function sxdSpore(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const dk = sxdC(m, '#0e0a04');
  const barb = sxdC(m, '#4a3a22');
  const pulse = 0.7 + 0.3 * Math.sin(t * 6 + m.seed);
  ctx.translate(0, Math.sin(t * 4 + m.seed) * r * 0.08);
  drawGlow(ctx, 0, 0, r * 1.2, pal.glow, 0.35 * pulse);
  ctx.save(); ctx.rotate(t * 1.2 + m.seed);
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * SXD_TAU, c = Math.cos(a), s = Math.sin(a);
    const bx = c * r * 0.42, by = s * r * 0.42;
    const tx = c * r * 1.0 - s * r * 0.25, ty = s * r * 1.0 + c * r * 0.25;
    sxdHorn(ctx, bx, by, c * r * 0.85, s * r * 0.85, tx, ty, r * 0.2, barb, dk);
  }
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, SXD_TAU); }, sxdMat(m, pal, '#8a7a50', '#4a3e22', '#1e180c', '#0a0804', '#6a5a36'), r * 0.55);
  // cracked open to the core
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.16, 0, 0, SXD_TAU); ctx.fill();
  sxdEye(ctx, 0, 0, r * 0.3, r * 0.13, 0, pal.glow, crBlink(m, t), 0.8 * pulse, null);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse((look?.x || 0) * r * 0.08, 0, r * 0.04, r * 0.12, 0, 0, SXD_TAU); ctx.fill();
}

// Glintwing (dragonfly) — a predatory deepwood dragonfly: bronze-green
// armoured thorax, huge faceted green eyes, serrated mandibles, four veined
// wings with smoked tips, and a long barbed segmented tail.
function sxdDragonfly(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const buzz = Math.sin(t * (fast ? 60 : 40) + m.seed);
  const sway = Math.sin(t * 3 + m.seed) * 0.12;
  const chitin = sxdMat(m, pal, '#8ab060', '#3a5a26', '#16260e', '#060a04', '#6a8a48');
  const bronze = sxdMat(m, pal, '#d8b070', '#7a5a2a', '#36260e', '#0e0804', '#a8844a');
  const dk = sxdC(m, '#060a04');
  // long barbed tail behind (up the lane)
  for (let k = 6; k >= 0; k--) {
    const sr = r * (0.12 - k * 0.01), y = -r * (0.32 + k * 0.17), x = Math.sin(sway * (k + 1)) * r * 0.06 * k;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, sr, r * 0.1, 0, 0, SXD_TAU); }, k % 2 ? bronze : chitin, sr * 1.4);
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(x - sr * 0.9, y - r * 0.02); ctx.lineTo(x - sr * 1.5, y - r * 0.08); ctx.lineTo(x - sr * 0.8, y + r * 0.03); ctx.moveTo(x + sr * 0.9, y - r * 0.02); ctx.lineTo(x + sr * 1.5, y - r * 0.08); ctx.lineTo(x + sr * 0.8, y + r * 0.03); ctx.fill();
  }
  { const x = Math.sin(sway * 8) * r * 0.42, y = -r * 1.5; sxdHorn(ctx, x, y + r * 0.08, x, y - r * 0.05, x + r * 0.1, y - r * 0.1, r * 0.08, sxdC(m, '#e8e0c0'), dk); }
  // four veined wings with smoked tips
  for (const side of [-1, 1]) {
    for (const [y, rot, len] of [[-0.14, -0.28, 1.3], [0.08, 0.22, 1.1]]) {
      ctx.save(); ctx.translate(side * r * 0.12, y * r); ctx.scale(side, 1); ctx.rotate(rot + buzz * 0.12);
      const wing = () => { ctx.beginPath(); ctx.moveTo(r * 0.02, -r * 0.06); ctx.quadraticCurveTo(r * len * 0.5, -r * 0.24, r * len, -r * 0.06); ctx.quadraticCurveTo(r * len * 1.02, r * 0.08, r * len * 0.85, r * 0.12); ctx.quadraticCurveTo(r * len * 0.4, r * 0.18, r * 0.02, r * 0.06); ctx.closePath(); };
      ctx.fillStyle = 'rgba(200,240,210,0.28)'; wing(); ctx.fill();
      ctx.save(); wing(); ctx.clip();
      ctx.fillStyle = 'rgba(16,30,12,0.65)'; ctx.beginPath(); ctx.ellipse(r * len * 0.92, 0, r * 0.22, r * 0.2, 0, 0, SXD_TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(30,60,30,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let k = 1; k <= 5; k++) { const x = r * len * k / 6; ctx.moveTo(x, -r * 0.2); ctx.lineTo(x + r * 0.04, r * 0.2); } ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(10,24,8,0.85)'; ctx.lineWidth = 1; wing(); ctx.stroke();
      ctx.strokeStyle = pal.glow; ctx.globalAlpha = A * 0.4; ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.02); ctx.quadraticCurveTo(r * len * 0.5, -r * 0.12, r * len * 0.95, -r * 0.05); ctx.stroke(); ctx.globalAlpha = A;
      ctx.restore();
    }
  }
  // armoured thorax
  const thx = () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.34); ctx.lineTo(r * 0.2, -r * 0.2); ctx.lineTo(r * 0.22, r * 0.1); ctx.lineTo(r * 0.12, r * 0.24); ctx.lineTo(-r * 0.12, r * 0.24); ctx.lineTo(-r * 0.22, r * 0.1); ctx.lineTo(-r * 0.2, -r * 0.2); ctx.closePath(); };
  crShade(ctx, thx, chitin, r * 0.35);
  ctx.strokeStyle = bronze.primary; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.3); ctx.lineTo(0, r * 0.2); ctx.moveTo(-r * 0.18, -r * 0.06); ctx.lineTo(r * 0.18, -r * 0.06); ctx.stroke();
  sxdSpec(ctx, -r * 0.08, -r * 0.18, r * 0.06, r * 0.025, -0.6, 0.4);
  // six thin hooked legs folded under
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.03); ctx.lineCap = 'round';
  ctx.beginPath(); for (const side of [-1, 1]) for (const y of [0.02, 0.1, 0.18]) { ctx.moveTo(side * r * 0.15, y * r); ctx.lineTo(side * r * 0.28, y * r + r * 0.1); ctx.lineTo(side * r * 0.22, y * r + r * 0.2); } ctx.stroke();
  // head: huge faceted compound eyes, mandibles
  const ey = r * 0.36;
  drawGlow(ctx, 0, ey, r * 0.45, pal.glow, 0.25 + 0.5 * (m.windup || 0));
  for (const side of [-1, 1]) {
    const ex = side * r * 0.15;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.17, r * 0.15, side * 0.3, 0, SXD_TAU); }, sxdMat(m, pal, '#e8ffd0', '#7ad850', '#1e5a14', '#041004', '#c8ff9a'), r * 0.2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.17, r * 0.15, side * 0.3, 0, SXD_TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(4,20,4,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = -3; k <= 3; k++) { ctx.moveTo(ex + k * r * 0.05 - r * 0.1, ey - r * 0.2); ctx.lineTo(ex + k * r * 0.05 + r * 0.1, ey + r * 0.2); ctx.moveTo(ex + k * r * 0.05 + r * 0.1, ey - r * 0.2); ctx.lineTo(ex + k * r * 0.05 - r * 0.1, ey + r * 0.2); }
    ctx.stroke(); ctx.restore();
    sxdSpec(ctx, ex - side * r * 0.04 + (look?.x || 0) * r * 0.03, ey - r * 0.06, r * 0.04, r * 0.025, 0, 0.8);
  }
  const bite = m.windup || 0;
  for (const side of [-1, 1]) sxdHorn(ctx, side * r * 0.06, ey + r * 0.1, side * r * (0.14 + bite * 0.05), ey + r * 0.22, side * r * 0.02, ey + r * 0.32, r * 0.06, bronze.light, dk);
}

// Bonecrawler — a skittering bone-drake: a long horned skull with a fanged
// snout, a spined backbone and hollow ribcage haunted by green light, moss
// rotting over the bones, and four jointed bone legs ending in hooks; the
// jaw drops and blazes as it charges a shot.
function sxdBonecrawler(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const crawl = m.anim * 2.2;
  const charge = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const boneM = sxdMat(m, pal, '#f4ecd0', '#c8bc96', '#6a6044', '#141208', '#e0d6b4');
  const bone = sxdC(m, '#d8ccaa'), boneL = sxdC(m, '#efe6c8');
  const dk = sxdC(m, '#0e1408');
  // tail of shrinking vertebrae with spines, swishing
  let x = 0, y = r * 0.5, a = Math.PI / 2 + 0.5;
  for (let k = 0; k < 6; k++) {
    const s = r * (0.13 - k * 0.016);
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s, 0, SXD_TAU); }, boneM, s * 2);
    a += 0.22 + Math.sin(t * 3 + m.seed - k * 0.6) * 0.18;
    x += Math.cos(a) * r * 0.17; y += Math.sin(a) * r * 0.13;
  }
  // four jointed bone legs with hooked tips, high spider knees
  for (const side of [-1, 1]) {
    for (const [ly, p] of [[-0.1, 0], [0.36, Math.PI]]) {
      const g = Math.sin(crawl + p + (side > 0 ? Math.PI : 0));
      const kx = side * r * 0.72, ky = ly * r - r * 0.22 + g * r * 0.07;
      const fx = side * r * (0.8 + g * 0.06), fy = ly * r + r * 0.32 - Math.max(0, g) * r * 0.08;
      sxdBone(ctx, Math.max(1.8, r * 0.09), bone, dk, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.28, ly * r); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); });
      sxdHorn(ctx, fx, fy - r * 0.02, fx + side * r * 0.02, fy + r * 0.08, fx - side * r * 0.06, fy + r * 0.14, r * 0.07, boneL, dk);
      ctx.fillStyle = boneL; ctx.beginPath(); ctx.arc(kx, ky, Math.max(1.5, r * 0.055), 0, SXD_TAU); ctx.fill();
    }
  }
  // girdles
  for (const gy of [-0.1, 0.36]) crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, gy * r, r * 0.32, r * 0.09, 0, 0, SXD_TAU); }, boneM, r * 0.3);
  // hollow ribcage with ghost-light
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, r * 0.14, r * 0.34, r * 0.22, 0, 0, SXD_TAU); ctx.fill();
  drawGlow(ctx, 0, r * 0.14, r * 0.34, pal.glow, 0.45 + charge * 0.4);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ry = r * (-0.02 + i * 0.12);
    sxdBone(ctx, Math.max(1.3, r * 0.06), bone, dk, () => { ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(side * r * 0.46, ry - r * 0.04, side * r * 0.3, ry + r * 0.14); });
  }
  // spine with dorsal spikes
  sxdBone(ctx, Math.max(2, r * 0.09), boneL, dk, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.5); });
  ctx.fillStyle = boneL; ctx.strokeStyle = dk; ctx.lineWidth = 1;
  ctx.beginPath(); for (const sy of [0.02, 0.16, 0.3]) { ctx.moveTo(-r * 0.04, sy * r); ctx.lineTo(r * 0.12, sy * r - r * 0.08); ctx.lineTo(r * 0.04, sy * r + r * 0.02); } ctx.fill(); ctx.stroke();
  sxdMoss(ctx, m, -r * 0.14, -r * 0.1, r * 0.11);
  sxdMoss(ctx, m, r * 0.16, r * 0.38, r * 0.08);
  ctx.strokeStyle = sxdC(m, '#3e6a28'); ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.moveTo(-r * 0.28, r * 0.2); ctx.quadraticCurveTo(-r * 0.32 + Math.sin(t * 3 + m.seed) * r * 0.05, r * 0.36, -r * 0.27, r * 0.5); ctx.stroke();
  // long horned skull
  ctx.save(); ctx.translate(0, -r * 0.44); ctx.scale(1.3, 1.3);
  for (const side of [-1, 1]) sxdHorn(ctx, side * r * 0.14, -r * 0.18, side * r * 0.42, -r * 0.26, side * r * 0.46, -r * 0.56, r * 0.1, boneM.primary, dk, 3, boneM.shade);
  const skull = () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.2); ctx.quadraticCurveTo(0, -r * 0.34, r * 0.24, -r * 0.2); ctx.lineTo(r * 0.22, -r * 0.02); ctx.lineTo(r * 0.12, r * 0.08); ctx.lineTo(r * 0.09, r * 0.28); ctx.lineTo(-r * 0.09, r * 0.28); ctx.lineTo(-r * 0.12, r * 0.08); ctx.lineTo(-r * 0.22, -r * 0.02); ctx.closePath(); };
  crShade(ctx, skull, boneM, r * 0.32);
  ctx.strokeStyle = boneM.shade; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.02, -r * 0.28); ctx.lineTo(r * 0.03, -r * 0.2); ctx.lineTo(0, -r * 0.14); ctx.stroke();
  // sockets with green eye-lights
  for (const side of [-1, 1]) {
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(side * r * 0.03, -r * 0.1); ctx.lineTo(side * r * 0.2, -r * 0.16); ctx.lineTo(side * r * 0.16, -r * 0.02); ctx.lineTo(side * r * 0.05, -r * 0.02); ctx.closePath(); ctx.fill();
    const ex = side * r * 0.11 + (look?.x || 0) * r * 0.015, ey = -r * 0.07;
    drawGlow(ctx, ex, ey, r * (0.14 + charge * 0.06), pal.glow, 0.95);
    ctx.fillStyle = '#eaffd8'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.03, r * 0.018, side * -0.3, 0, SXD_TAU); ctx.fill();
  }
  // nasal slits
  ctx.fillStyle = dk; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.03, r * 0.16, r * 0.012, r * 0.03, side * 0.3, 0, SXD_TAU); ctx.fill(); }
  // dropping lower jaw with fangs
  const jaw = r * (0.02 + charge * 0.12);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-r * 0.09, r * 0.26); ctx.lineTo(r * 0.09, r * 0.26); ctx.lineTo(r * 0.07, r * 0.28 + jaw); ctx.lineTo(-r * 0.07, r * 0.28 + jaw); ctx.closePath(); ctx.fill();
  if (charge > 0.1) drawGlow(ctx, 0, r * 0.28 + jaw * 0.5, r * 0.28 * charge, pal.glow, charge);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.09, r * 0.28 + jaw); ctx.lineTo(r * 0.09, r * 0.28 + jaw); ctx.lineTo(r * 0.06, r * 0.36 + jaw); ctx.lineTo(-r * 0.06, r * 0.36 + jaw); ctx.closePath(); }, boneM, r * 0.12);
  sxdFangs(ctx, -r * 0.085, r * 0.085, r * 0.27, 4, r * 0.06, 1, boneL, 0.2);
  sxdMoss(ctx, m, -r * 0.08, -r * 0.24, r * 0.07);
  ctx.restore();
}

// Moss Bear — a dead bear the forest wears: a hunched, moss-matted hulk
// with towering shoulders, a bare skull for a face with green fire in the
// sockets, ribs showing through a rotted flank, root-antlers sprouting
// from the hump and long forearms ending in hooked bone claws; rears up
// before it slams both paws down.
function sxdMossBear(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const slam = ph === 'burst' ? 1 : 0;
  const fur = sxdMat(m, pal, '#6e5a44', '#3a2c1e', '#1a120a', '#060402', '#56442e');
  const furD = sxdMat(m, pal, '#5a4836', '#2e2216', '#140e08', '#060402', '#46362a');
  const moss = sxdMat(m, pal, '#8ac060', '#3e6a28', '#1a3410', '#060e04', '#6a9a48');
  const boneM = sxdMat(m, pal, '#f4ecd0', '#c8bc96', '#6a6044', '#141208', '#e0d6b4');
  const dk = sxdC(m, '#060402');
  const bone = sxdC(m, '#e8dfc0');
  ctx.translate(0, Math.abs(step) * r * 0.06 - rear * r * 0.15 + slam * r * 0.04);
  // root-antlers behind the hump
  for (const side of [-1, 1]) {
    sxdBone(ctx, Math.max(2, r * 0.06), sxdC(m, '#4a3624'), dk, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.3, -r * 0.6); ctx.quadraticCurveTo(side * r * 0.5, -r * 0.85, side * r * 0.46, -r * 1.1); ctx.moveTo(side * r * 0.44, -r * 0.82); ctx.lineTo(side * r * 0.7, -r * 0.96); ctx.moveTo(side * r * 0.47, -r * 0.98); ctx.lineTo(side * r * 0.32, -r * 1.08); });
  }
  // stumpy hind legs
  for (const side of [-1, 1]) {
    const s = Math.sin(m.anim * 1.2 + (side > 0 ? Math.PI : 0));
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.18, r * 0.5); ctx.lineTo(side * r * 0.5, r * 0.5); ctx.lineTo(side * r * 0.52, r * 0.86 - Math.max(0, s) * r * 0.08); ctx.lineTo(side * r * 0.2, r * 0.86 - Math.max(0, s) * r * 0.08); ctx.closePath(); }, furD, r * 0.35);
  }
  // hunched body: towering shoulders, narrower haunch
  const body = () => { ctx.beginPath(); ctx.moveTo(-r * 0.55, r * 0.62); ctx.quadraticCurveTo(-r * 0.8, r * 0.1, -r * 0.88, -r * 0.3); ctx.quadraticCurveTo(-r * 0.8, -r * 0.72, -r * 0.3, -r * 0.7); ctx.quadraticCurveTo(0, -r * 0.62, r * 0.3, -r * 0.7); ctx.quadraticCurveTo(r * 0.8, -r * 0.72, r * 0.88, -r * 0.3); ctx.quadraticCurveTo(r * 0.8, r * 0.1, r * 0.55, r * 0.62); ctx.quadraticCurveTo(0, r * 0.72, -r * 0.55, r * 0.62); ctx.closePath(); };
  crShade(ctx, body, fur, r);
  sxdStrokes(ctx, r, [[-0.7, -0.1, -0.6, 0.0], [-0.66, 0.15, -0.56, 0.24], [0.7, -0.1, 0.6, 0.0], [0.66, 0.15, 0.56, 0.24], [-0.4, 0.45, -0.3, 0.52], [0.35, 0.48, 0.25, 0.54], [-0.1, 0.3, 0.0, 0.38]], fur.light, Math.max(1, r * 0.03), 0.4);
  // rotted flank: ribs through the hide
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(r * 0.34, r * 0.24, r * 0.2, r * 0.2, -0.3, 0, SXD_TAU); ctx.fill();
  drawGlow(ctx, r * 0.34, r * 0.24, r * 0.22, pal.glow, 0.35 + rear * 0.3);
  for (let i = 0; i < 3; i++) sxdBone(ctx, Math.max(1.3, r * 0.04), bone, dk, () => { ctx.beginPath(); ctx.moveTo(r * 0.16, r * (0.1 + i * 0.12)); ctx.quadraticCurveTo(r * 0.38, r * (0.04 + i * 0.12), r * 0.52, r * (0.16 + i * 0.1)); });
  // moss mantle over the hump with hanging strands
  const mb = () => { ctx.beginPath(); ctx.moveTo(-r * 0.86, -r * 0.3); ctx.quadraticCurveTo(-r * 0.8, -r * 0.72, -r * 0.3, -r * 0.72); ctx.quadraticCurveTo(0, -r * 0.66, r * 0.3, -r * 0.72); ctx.quadraticCurveTo(r * 0.8, -r * 0.72, r * 0.86, -r * 0.3); for (let i = 0; i <= 10; i++) { const x = r * 0.86 - i * r * 0.172; ctx.quadraticCurveTo(x - r * 0.09, -r * (0.22 + 0.12 * sxdRnd(m.seed + 5, i)), x - r * 0.172, -r * 0.34); } ctx.closePath(); };
  crShade(ctx, mb, moss, r * 0.8);
  ctx.strokeStyle = moss.shade; ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.beginPath(); for (const x of [-0.7, -0.45, 0.55, 0.75]) { const sw = Math.sin(t * 2 + x * 5) * r * 0.03; ctx.moveTo(x * r, -r * 0.32); ctx.quadraticCurveTo(x * r + sw, -r * 0.15, x * r + sw * 2, -r * 0.02); } ctx.stroke();
  for (const [x, y, s] of [[-0.55, -0.62, 0.08], [0.48, -0.66, 0.06]]) {
    ctx.fillStyle = sxdC(m, '#d8d0b0'); ctx.fillRect(x * r - s * r * 0.2, y * r, s * r * 0.4, s * r * 1.2);
    ctx.fillStyle = sxdC(m, '#6a2a1a'); ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.55, 0, Math.PI, 0); ctx.fill();
  }
  // long forearms in front, hooked bone claws
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.62, -r * 0.3);
    ctx.rotate(side * (rear ? -2.3 * rear : slam ? 0.5 : 0.12 + step * side * 0.12));
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.05); ctx.quadraticCurveTo(-r * 0.28, r * 0.4, -r * 0.18, r * 0.78); ctx.lineTo(r * 0.18, r * 0.78); ctx.quadraticCurveTo(r * 0.26, r * 0.4, r * 0.2, -r * 0.05); ctx.closePath(); }, fur, r * 0.45);
    ctx.fillStyle = moss.primary; ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.2, r * 0.1, 0, 0, SXD_TAU); ctx.fill();
    sxdStrokes(ctx, r, [[-0.1, 0.3, -0.12, 0.45], [0.1, 0.35, 0.08, 0.5]], fur.dark, Math.max(1, r * 0.03), 0.5);
    for (const d of [-1, 0, 1]) sxdHorn(ctx, d * r * 0.11, r * 0.72, d * r * 0.14, r * 0.9, d * r * 0.06, r * 1.04, r * 0.09, bone, dk);
    if (rear || slam) drawGlow(ctx, 0, r * 0.85, r * 0.3, pal.glow, 0.3 + rear * 0.4);
    ctx.restore();
  }
  // bare skull face, set low between the shoulders, torn ears
  ctx.save(); ctx.translate(0, -r * 0.24);
  for (const side of [-1, 1]) { ctx.fillStyle = furD.primary; ctx.strokeStyle = dk; ctx.lineWidth = Math.max(1, r * 0.025); ctx.beginPath(); ctx.moveTo(side * r * 0.2, -r * 0.28); ctx.lineTo(side * r * 0.36, -r * 0.44); ctx.lineTo(side * r * 0.34, -r * 0.32); ctx.lineTo(side * r * 0.4, -r * 0.3); ctx.lineTo(side * r * 0.3, -r * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const skull = () => { ctx.beginPath(); ctx.moveTo(-r * 0.28, -r * 0.22); ctx.quadraticCurveTo(0, -r * 0.4, r * 0.28, -r * 0.22); ctx.quadraticCurveTo(r * 0.3, r * 0.04, r * 0.15, r * 0.15); ctx.lineTo(r * 0.11, r * 0.3); ctx.lineTo(-r * 0.11, r * 0.3); ctx.lineTo(-r * 0.15, r * 0.15); ctx.quadraticCurveTo(-r * 0.3, r * 0.04, -r * 0.28, -r * 0.22); ctx.closePath(); };
  crShade(ctx, skull, boneM, r * 0.4);
  ctx.strokeStyle = boneM.shade; ctx.lineWidth = Math.max(1, r * 0.02); ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.31); ctx.lineTo(r * 0.1, -r * 0.21); ctx.lineTo(r * 0.06, -r * 0.13); ctx.stroke();
  const rage = Math.max(rear, m.windup || 0);
  for (const side of [-1, 1]) {
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.15); ctx.lineTo(side * r * 0.24, -r * 0.21); ctx.lineTo(side * r * 0.19, -r * 0.03); ctx.lineTo(side * r * 0.06, -r * 0.03); ctx.closePath(); ctx.fill();
    drawGlow(ctx, side * r * 0.14, -r * 0.1, r * (0.16 + rage * 0.08), pal.glow, 0.95);
    ctx.fillStyle = '#eaffd8'; ctx.beginPath(); ctx.ellipse(side * r * 0.14, -r * 0.1, r * 0.035, r * 0.02, side * -0.3, 0, SXD_TAU); ctx.fill();
  }
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.05); ctx.lineTo(r * 0.05, r * 0.05); ctx.lineTo(0, r * 0.13); ctx.closePath(); ctx.fill();
  const open = r * (0.03 + rage * 0.08 + slam * 0.04);
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.11, open + r * 0.015, 0, 0, SXD_TAU); ctx.fill();
  sxdFangs(ctx, -r * 0.11, r * 0.11, r * 0.28 - open * 0.5, 5, r * 0.06 + open * 0.4, 1, bone, 0.3);
  sxdMoss(ctx, m, -r * 0.15, -r * 0.3, r * 0.08);
  ctx.restore();
}

// Ossarach — the Mossbone Wyrm: a colossal dragon skeleton the forest has
// claimed — tattered moss-membrane wings on finger bones, a spined neck, a
// ribcage cradling a ghost-green heart, hanging vines, and a long horned
// draconic skull whose jaw gapes and blazes before each volley.
function sxdBoneDragon(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff5a3a' : pal.glow;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const flap = Math.sin(t * 2.2);
  const bw = Math.max(2, r * 0.055);
  const boneM = sxdMat(m, pal, '#f4ecd0', '#c8bc96', '#6a6044', '#141208', '#e0d6b4');
  const memb = sxdMat(m, pal, '#5a7a3a', '#2a3e1c', '#101a0a', '#040802', '#40602a');
  const bone = sxdC(m, '#d8ccaa'), boneL = sxdC(m, '#efe6c8');
  const dk = sxdC(m, '#0a1006');
  // wings: finger bones with tattered moss membranes
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.35, -r * 0.28); ctx.rotate(-0.25 + flap * 0.16);
    const tips = [[r * 1.38, -r * 0.72], [r * 1.28, -r * 0.1], [r * 0.98, r * 0.36], [r * 0.56, r * 0.56]];
    const wx = r * 0.5, wy = -r * 0.34;
    const mem = () => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wx, wy); ctx.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < tips.length; i++) {
        const [px, py] = tips[i - 1], [qx, qy] = tips[i];
        const mx = (px + qx) / 2 - r * 0.14, my = (py + qy) / 2 - r * 0.02;
        ctx.lineTo(mx + r * 0.06, my + r * 0.1); ctx.lineTo(mx - r * 0.04, my + r * 0.02); ctx.lineTo(mx - r * 0.1, my + r * 0.16); ctx.lineTo(qx, qy);
      }
      ctx.lineTo(r * 0.1, r * 0.4); ctx.closePath();
    };
    ctx.globalAlpha = A * 0.92;
    crShade(ctx, mem, memb, r * 0.9);
    ctx.globalAlpha = A;
    // rot holes + moss spots + membrane veins
    ctx.fillStyle = dk; ctx.globalAlpha = A * 0.75;
    ctx.beginPath(); ctx.ellipse(r * 0.88, -r * 0.2, r * 0.09, r * 0.05, 0.4, 0, SXD_TAU); ctx.moveTo(r * 0.66, r * 0.18); ctx.ellipse(r * 0.6, r * 0.18, r * 0.06, r * 0.04, -0.2, 0, SXD_TAU); ctx.fill();
    ctx.globalAlpha = A;
    ctx.strokeStyle = memb.dark; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.5;
    ctx.beginPath(); for (const [tx, ty] of tips) { ctx.moveTo(wx * 0.6, wy * 0.2); ctx.quadraticCurveTo((wx + tx) * 0.45, (wy + ty) * 0.6, tx * 0.85, ty * 0.85 + r * 0.06); } ctx.stroke();
    ctx.globalAlpha = A;
    // finger bones + arm
    for (const [tx, ty] of tips) sxdBone(ctx, bw * 0.8, bone, dk, () => { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(tx, ty); });
    sxdBone(ctx, bw * 1.35, boneL, dk, () => { ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.05); ctx.lineTo(wx, wy); });
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(wx, wy, bw * 1.3, 0, SXD_TAU); }, boneM, bw * 1.5);
    sxdHorn(ctx, wx - bw * 0.5, wy - bw * 0.6, wx - r * 0.02, wy - r * 0.24, wx + r * 0.1, wy - r * 0.3, bw * 1.4, boneL, dk);
    // hanging moss strands
    ctx.strokeStyle = sxdC(m, '#3e6a28'); ctx.lineWidth = Math.max(1.2, r * 0.022);
    ctx.beginPath(); for (const [tx, ty] of tips.slice(0, 3)) { const hx = tx * 0.62, hy = ty * 0.62, sw = Math.sin(t * 2 + tx) * r * 0.04; ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + sw, hy + r * 0.2, hx + sw * 2, hy + r * 0.34); } ctx.stroke();
    ctx.restore();
  }
  // ribcage with the ghost heart
  ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(0, r * 0.36, r * 0.54, r * 0.44, 0, 0, SXD_TAU); ctx.fill();
  const beat = 0.7 + 0.3 * Math.abs(Math.sin(t * 2.5));
  drawGlow(ctx, 0, r * 0.4, r * (0.5 + heave * 0.2) * beat, glow, 0.75);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.bezierCurveTo(-r * 0.14, r * 0.38, -r * 0.1, r * 0.26, 0, r * 0.33); ctx.bezierCurveTo(r * 0.1, r * 0.26, r * 0.14, r * 0.38, 0, r * 0.5); ctx.closePath(); }, sxdMat(m, pal, '#ffffff', '#c8ffb0', glow, '#0a2004', '#ffffff'), r * 0.14 * beat, false);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ry = r * (0.02 + i * 0.16), w = r * (0.6 - i * 0.07);
      sxdBone(ctx, bw, bone, dk, () => { ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(side * w * 1.1, ry - r * 0.04, side * w * 0.72, ry + r * 0.22); });
    }
  }
  sxdBone(ctx, bw * 1.5, boneL, dk, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(0, r * 0.86); });
  // hanging vines
  ctx.lineCap = 'round';
  for (const [vx, len, k] of [[-0.42, 0.55, 0], [-0.15, 0.4, 1], [0.25, 0.6, 2], [0.5, 0.35, 3]]) {
    const sw = Math.sin(t * 1.8 + k * 1.3) * r * 0.06;
    ctx.strokeStyle = sxdC(m, '#2a4a1c'); ctx.lineWidth = Math.max(1.5, r * 0.03);
    const x0 = vx * r, y0 = r * (0.3 + k * 0.05);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + sw, y0 + r * len * 0.4, x0 - sw, y0 + r * len * 0.7, x0 + sw * 1.5, y0 + r * len); ctx.stroke();
    ctx.fillStyle = sxdC(m, '#6aa040'); ctx.beginPath(); ctx.ellipse(x0 + sw * 1.5, y0 + r * len, r * 0.035, r * 0.022, 0.5, 0, SXD_TAU); ctx.fill();
  }
  sxdMoss(ctx, m, -r * 0.34, -r * 0.12, r * 0.12);
  sxdMoss(ctx, m, r * 0.38, -r * 0.08, r * 0.1);
  sxdMoss(ctx, m, r * 0.06, r * 0.64, r * 0.08);
  // spined neck vertebrae up to the skull
  const sway = Math.sin(t * 1.1) * r * 0.04;
  for (let k = 0; k < 3; k++) {
    const vy = -r * (0.08 + k * 0.12), vx = sway * (k / 3);
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(vx, vy, r * 0.09, r * 0.06, 0, 0, SXD_TAU); }, boneM, r * 0.12);
    ctx.fillStyle = boneL; ctx.strokeStyle = dk; ctx.lineWidth = 1;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(vx + side * r * 0.06, vy - r * 0.02); ctx.lineTo(vx + side * r * 0.2, vy - r * 0.08); ctx.lineTo(vx + side * r * 0.07, vy + r * 0.03); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  // long horned draconic skull
  ctx.save(); ctx.translate(sway, -r * 0.46);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    sxdHorn(ctx, r * 0.2, -r * 0.24, r * 0.66, -r * 0.34, r * 0.74, -r * 0.8, r * 0.13, boneM.primary, dk, 4, boneM.shade);
    sxdHorn(ctx, r * 0.28, -r * 0.08, r * 0.5, -r * 0.08, r * 0.6, -r * 0.3, r * 0.07, boneM.shade, dk);
    ctx.restore();
  }
  const skull = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, -r * 0.16);
    ctx.quadraticCurveTo(-r * 0.36, -r * 0.42, 0, -r * 0.44);
    ctx.quadraticCurveTo(r * 0.36, -r * 0.42, r * 0.36, -r * 0.16);
    ctx.lineTo(r * 0.28, r * 0.02); ctx.lineTo(r * 0.16, r * 0.1);
    ctx.lineTo(r * 0.13, r * 0.36); ctx.quadraticCurveTo(0, r * 0.44, -r * 0.13, r * 0.36);
    ctx.lineTo(-r * 0.16, r * 0.1); ctx.lineTo(-r * 0.28, r * 0.02);
    ctx.closePath();
  };
  crShade(ctx, skull, boneM, r * 0.5);
  // brow ridges + cracks
  ctx.strokeStyle = boneM.shade; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.42); ctx.lineTo(r * 0.02, -r * 0.32); ctx.lineTo(-r * 0.03, -r * 0.24); ctx.moveTo(r * 0.1, r * 0.12); ctx.lineTo(r * 0.06, r * 0.22); ctx.stroke();
  sxdMoss(ctx, m, -r * 0.16, -r * 0.38, r * 0.09);
  sxdMoss(ctx, m, r * 0.14, -r * 0.4, r * 0.07);
  // angular sockets + glowing eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.18); ctx.lineTo(side * r * 0.3, -r * 0.26); ctx.lineTo(side * r * 0.25, -r * 0.06); ctx.lineTo(side * r * 0.08, -r * 0.06); ctx.closePath(); ctx.fill();
    const ex = side * r * 0.16 + (look?.x || 0) * r * 0.02, ey = -r * 0.14 + (look?.y || 0) * r * 0.01;
    drawGlow(ctx, ex, ey, r * (0.18 + heave * 0.1), glow, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.045, r * 0.022, side * -0.3, 0, SXD_TAU); ctx.fill();
  }
  ctx.strokeStyle = dk; ctx.lineWidth = Math.max(2, r * 0.035); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.3); ctx.lineTo(-r * 0.06, -r * 0.2); ctx.moveTo(r * 0.32, -r * 0.3); ctx.lineTo(r * 0.06, -r * 0.2); ctx.stroke();
  // nostrils
  ctx.fillStyle = dk;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.055, r * 0.28, r * 0.022, r * 0.04, side * 0.4, 0, SXD_TAU); ctx.fill(); }
  // upper fangs + gaping lower jaw
  const jaw = heave * r * 0.18;
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.moveTo(-r * 0.13, r * 0.36); ctx.lineTo(r * 0.13, r * 0.36); ctx.lineTo(r * 0.12, r * 0.4 + jaw); ctx.lineTo(-r * 0.12, r * 0.4 + jaw); ctx.closePath(); ctx.fill();
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.4 + jaw * 0.5, r * 0.5 * heave, glow, heave);
  sxdFangs(ctx, -r * 0.13, r * 0.13, r * 0.35, 5, r * 0.08, 1, boneL, 0.4);
  const lj = () => { ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.32 + jaw); ctx.lineTo(r * 0.2, r * 0.32 + jaw); ctx.lineTo(r * 0.13, r * 0.5 + jaw); ctx.quadraticCurveTo(0, r * 0.58 + jaw, -r * 0.13, r * 0.5 + jaw); ctx.closePath(); };
  crShade(ctx, lj, boneM, r * 0.25);
  sxdFangs(ctx, -r * 0.14, r * 0.14, r * 0.36 + jaw, 5, -r * 0.07, 1, boneL, 0.4);
  ctx.restore();
}

// =========================================================== registry ====
Object.assign(SPECIES.shroomkin, { draw: sxdShroomkin, colors: { primary: '#6a2ea8', dark: '#10041e', glow: '#5affd8' } });
Object.assign(SPECIES.sporeling, { draw: sxdSporeling, colors: { primary: '#7a3aa8', dark: '#12041e', glow: '#5affd8' } });
Object.assign(SPECIES.glowmoth, { draw: sxdGlowmoth, colors: { primary: '#4a3a98', dark: '#08041a', glow: '#7af4ff' } });
Object.assign(SPECIES.tiki, { draw: sxdTiki, colors: { primary: '#5a3a2a', dark: '#0c0604', glow: '#b07aff' } });
Object.assign(SPECIES.shroomgiant, { draw: sxdShroomGiant, colors: { primary: '#5e2898', dark: '#0e0418', glow: '#5affd8' } });
Object.assign(SPECIES.serpent, { draw: sxdSerpent, colors: { primary: '#1e5a4c', dark: '#020c0a', glow: '#6affc0' } });
Object.assign(SPECIES.ram, { draw: sxdRam, colors: { primary: '#4e4a42', dark: '#0c0b0a', glow: '#ffb238' } });
Object.assign(SPECIES.boulder, { draw: sxdBoulder, colors: { primary: '#6a6e78', dark: '#0e0f12', glow: '#ffb238' } });
Object.assign(SPECIES.pebble, { draw: sxdPebble, colors: { primary: '#6e727c', dark: '#0e0f12', glow: '#ffb238' } });
Object.assign(SPECIES.eagle, { draw: sxdEagle, colors: { primary: '#5a4632', dark: '#0c0804', glow: '#ffb238' } });
Object.assign(SPECIES.guard, { draw: sxdGuard, colors: { primary: '#4a505c', dark: '#08090c', glow: '#ffb238' } });
Object.assign(SPECIES.ogre, { draw: sxdOgre, colors: { primary: '#66707c', dark: '#0c0e12', glow: '#ffb238' } });
Object.assign(SPECIES.mountainking, { draw: sxdMountainKing, colors: { primary: '#3c424e', dark: '#060709', glow: '#ffb238' } });
Object.assign(SPECIES.boar, { draw: sxdBoar, colors: { primary: '#3e2e22', dark: '#080504', glow: '#a8ff5a' } });
Object.assign(SPECIES.puff, { draw: sxdPuff, colors: { primary: '#625a38', dark: '#100c06', glow: '#a8ff5a' } });
Object.assign(SPECIES.spore, { draw: sxdSpore, colors: { primary: '#4a3e22', dark: '#0a0804', glow: '#b8ff6a' } });
Object.assign(SPECIES.dragonfly, { draw: sxdDragonfly, colors: { primary: '#3a5a26', dark: '#060a04', glow: '#a8ff6a' } });
Object.assign(SPECIES.bonecrawler, { draw: sxdBonecrawler, colors: { primary: '#c8bc96', dark: '#0e1408', glow: '#9aff7a' } });
Object.assign(SPECIES.mossbear, { draw: sxdMossBear, colors: { primary: '#3a2c1e', dark: '#060402', glow: '#a8ff5a' } });
Object.assign(SPECIES.bonedragon, { draw: sxdBoneDragon, colors: { primary: '#c8bc96', dark: '#0a1006', glow: '#b8ff7a' } });
