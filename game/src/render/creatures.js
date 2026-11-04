// ============================================================
// Procedural, fully animated Shatterlings (motion-graphics creatures).
// Every enemy is drawn from vector shapes each frame — no sprite sheets —
// so it can walk, blink, lean into turns, squash when hit, charge a glowing
// shot before firing, and pop in when split. Colors come from the active
// stage's monsterTint so the same cast re-skins per environment.
//
// Helpers here are prefixed `cr` because the standalone build concatenates
// every module into one scope.
// ============================================================

import { SPECIES } from './species.js';
import { CONFIG } from '../config.js';

const crClamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function crHexToRgb(hex) {
  // also accepts 'rgb(r,g,b)' (palettes mix colors into rgb strings)
  if (hex.startsWith('rgb')) return hex.match(/[\d.]+/g).slice(0, 3).map(Number);
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const crMixCache = new Map();
// Mix two hex colors (f = 0 → a, 1 → b). Cached: called many times per frame.
export function crMix(a, b, f) {
  const key = a + b + f;
  let v = crMixCache.get(key);
  if (v) return v;
  const A = crHexToRgb(a), B = crHexToRgb(b);
  v = `rgb(${Math.round(A[0] + (B[0] - A[0]) * f)},${Math.round(A[1] + (B[1] - A[1]) * f)},${Math.round(A[2] + (B[2] - A[2]) * f)})`;
  crMixCache.set(key, v);
  return v;
}

function crEaseOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Pre-rendered soft glow dots (radial gradient baked once per color/size) —
// drawImage of a cached canvas is far cheaper than a gradient per frame.
const crGlowCache = new Map();
export function glowSprite(color, size = 32) {
  const key = color + size;
  let c = crGlowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size, size, 0, size, size, size);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 1;
  g.fillStyle = grad;
  g.fillRect(0, 0, size * 2, size * 2);
  crGlowCache.set(key, c);
  return c;
}

export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
  const img = glowSprite(color, 32);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

// Correct per-sprite tinting: bake the tint into an offscreen copy of the
// image (so 'source-atop' only touches the sprite's own pixels, never the
// background behind it — the old in-place version painted solid colored
// boxes over the scene).
const crTintCache = new WeakMap();
export function tintedImage(img, tint) {
  if (!img || !tint || !img.width) return img;
  let byTint = crTintCache.get(img);
  if (!byTint) { byTint = new Map(); crTintCache.set(img, byTint); }
  let c = byTint.get(tint);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.5;
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  byTint.set(tint, c);
  return c;
}

// Menacing eyes for the whole cast: narrow slanted almonds set in a dark
// socket under a heavy brow, a hot glowing iris with a slit pupil that
// tracks the Guardian. (Same signature as the old round cartoon eyes;
// pupilColor is ignored, angry > 0 lowers the brow further.)
const crEyeGrad = new Map();
export function crEyes(ctx, ex, ey, er, gap, look, blink, pupilColor = '#1a1030', angry = 0, browColor = '#1a1030') {
  const w = er * 1.15, h = er * 0.5;
  for (const side of [-1, 1]) {
    const x = ex + side * gap;
    const tilt = side * (0.32 + angry * 0.12); // inner corners low: a glare
    ctx.save();
    ctx.translate(x, ey);
    ctx.rotate(tilt);
    // dark socket
    ctx.fillStyle = 'rgba(8,4,14,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, w * 1.25, h * 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(1, Math.max(0.12, blink));
    // almond eye with a hot iris
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, -h * 1.6, w, 0);
    ctx.quadraticCurveTo(0, h * 1.25, -w, 0);
    ctx.closePath();
    const gk = Math.round(w * 2);
    let g = crEyeGrad.get(gk); // one gradient per eye size, reused by the horde
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
      g.addColorStop(0, '#fff3a0');
      g.addColorStop(0.35, '#ffb020');
      g.addColorStop(1, '#c0300c');
      crEyeGrad.set(gk, g);
    }
    ctx.fillStyle = g;
    ctx.fill();
    // slit pupil, following the Guardian
    ctx.fillStyle = '#120408';
    ctx.beginPath(); ctx.ellipse(look.x * w * 0.35, look.y * h * 0.2, w * 0.13, h * 0.95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // heavy brow ridge over the eye
    ctx.strokeStyle = browColor;
    ctx.lineWidth = Math.max(1.6, er * 0.42);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - side * w * 0.95, ey - h * 0.9 + angry * er * 0.15);
    ctx.lineTo(x + side * w * 1.15, ey - h * 2.1 - angry * er * 0.1);
    ctx.stroke();
  }
}

export function crBlink(m, t) {
  const cyc = (t + m.seed) % 3.4;
  return cyc < 0.12 ? 0.15 : 1;
}

// --- Volume shading -------------------------------------------------------
// Every body gets the same lighting model so the cast reads as one world:
// a radial fill lit from the top-left, a rim light hugging the lower-right
// edge (in the stage's glow color), and a bold dark outline. pathFn builds
// the body path in local coordinates.
// Gradients are evaluated in the local (already-translated) coordinates at
// fill time, so one gradient object per (radius, palette) is reusable by
// every creature — creating them fresh per body part per frame was the
// biggest render cost with a full horde on screen.
const crGradCache = new Map();
export function crShade(ctx, pathFn, pal, r, outline = true) {
  pathFn();
  const key = Math.round(r * 2) + '|' + pal.light + '|' + pal.primary + '|' + pal.shade;
  let g = crGradCache.get(key);
  if (!g) {
    const rr = Math.round(r * 2) / 2;
    g = ctx.createRadialGradient(-rr * 0.35, -rr * 0.45, rr * 0.05, 0, 0, rr * 1.2);
    g.addColorStop(0, pal.light);
    g.addColorStop(0.5, pal.primary);
    g.addColorStop(1, pal.shade);
    if (crGradCache.size > 4000) crGradCache.clear();
    crGradCache.set(key, g);
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  pathFn();
  ctx.clip();
  // rim light: the same outline nudged up-left, so only a crescent of its
  // stroke lands inside the body along the lower-right edge
  ctx.translate(-r * 0.14, -r * 0.14);
  pathFn();
  ctx.strokeStyle = pal.rim;
  ctx.lineWidth = r * 0.18;
  ctx.stroke();
  ctx.restore();
  if (outline) {
    pathFn();
    ctx.strokeStyle = crMix(pal.dark, '#000000', 0.45);
    ctx.lineWidth = Math.max(1.6, r * 0.07);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function crGem(ctx, x, y, w, h, color, A) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h); ctx.lineTo(x + w, y - h * 0.2); ctx.lineTo(x, y + h * 0.35); ctx.lineTo(x - w, y - h * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = A * 0.7;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.35, y - h * 0.25); ctx.lineTo(x - w * 0.5, y - h * 0.25);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = A;
}

// --- Grumbles — crystal gremlin. Runs on stubby legs, ears flopping, claws
//     pumping; crouches with a snarl before a dash. ------------------------
function drawGoblin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = ph === 'burst' ? 3.4 : 2.2;
  const step = Math.sin(m.anim * run);
  const bounce = Math.abs(Math.cos(m.anim * run)) * r * 0.12;
  ctx.translate(0, -bounce);
  // tail
  ctx.strokeStyle = pal.shade;
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.45);
  ctx.quadraticCurveTo(-r * 1.0, r * 0.6 + Math.sin(t * 6 + m.seed) * r * 0.2, -r * 0.95, r * 0.05 + Math.sin(t * 6 + m.seed + 1) * r * 0.25);
  ctx.stroke();
  crGem(ctx, -r * 0.95, r * 0.05 + Math.sin(t * 6 + m.seed + 1) * r * 0.25, r * 0.12, r * 0.18, pal.glow, A);
  // legs + feet
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * step);
    const fx = side * r * 0.36 + side * step * r * 0.08, fy = r * 0.78 - lift * r * 0.25 + bounce;
    ctx.fillStyle = pal.shade;
    ctx.beginPath(); ctx.roundRect(fx - r * 0.12, r * 0.45, r * 0.24, fy - r * 0.45, r * 0.1); ctx.fill();
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(fx + side * r * 0.05, fy, r * 0.24, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ears
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.6, -r * 0.3);
    ctx.rotate(side * (0.35 + step * 0.16 * side) + (ph === 'windup' ? side * -0.4 : 0));
    const ear = () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.quadraticCurveTo(side * r * 0.6, -r * 0.62, side * r * 0.85, -r * 0.48); ctx.quadraticCurveTo(side * r * 0.45, -r * 0.05, 0, r * 0.22); ctx.closePath(); };
    ear();
    ctx.fillStyle = pal.primary; ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.stroke();
    ctx.fillStyle = pal.glow;
    ctx.globalAlpha = A * 0.55;
    ctx.beginPath(); ctx.moveTo(side * r * 0.08, -r * 0.08); ctx.quadraticCurveTo(side * r * 0.5, -r * 0.42, side * r * 0.66, -r * 0.4); ctx.quadraticCurveTo(side * r * 0.36, -r * 0.06, side * r * 0.08, r * 0.1); ctx.fill();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  // claws (pump while running, thrown back in the crouch)
  for (const side of [-1, 1]) {
    const sw = ph === 'windup' ? -0.9 : -side * step * 0.6;
    ctx.save();
    ctx.translate(side * r * 0.7, r * 0.1);
    ctx.rotate(side * 0.4 + sw * side);
    ctx.fillStyle = pal.primary;
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.13, r * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6e8';
    for (const c of [-1, 0, 1]) {
      ctx.beginPath(); ctx.moveTo(c * r * 0.07, r * 0.38); ctx.lineTo(c * r * 0.07 + r * 0.03, r * 0.52); ctx.lineTo(c * r * 0.07 + r * 0.06, r * 0.38); ctx.fill();
    }
    ctx.restore();
  }
  // body
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r * 0.8, 0, 0, Math.PI * 2); }, pal, r);
  // crystal belly plate
  ctx.fillStyle = pal.light;
  ctx.globalAlpha = A * 0.8;
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(r * 0.36, r * 0.32); ctx.lineTo(0, r * 0.68); ctx.lineTo(-r * 0.36, r * 0.32); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = A * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(r * 0.16, r * 0.24); ctx.lineTo(-r * 0.2, r * 0.3); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = A;
  // head crystals
  for (const [dx, h] of [[-0.3, 0.38], [0, 0.6], [0.3, 0.38]]) crGem(ctx, dx * r, -r * 0.72, r * 0.11, h * r, pal.glow, A);
  // face
  const snarl = ph === 'windup' ? 1 : m.windup;
  crEyes(ctx, 0, -r * 0.2, r * 0.22, r * 0.3, look, crBlink(m, t), '#1a1030', 1 + snarl * 0.6, pal.dark);
  ctx.fillStyle = '#2a0e1e';
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, r * 0.14);
  ctx.quadraticCurveTo(0, r * (0.42 + snarl * 0.22), r * 0.34, r * 0.14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const tx of [-0.2, -0.04, 0.12]) {
    ctx.beginPath(); ctx.moveTo(tx * r, r * 0.15); ctx.lineTo(tx * r + r * 0.09, r * 0.15); ctx.lineTo(tx * r + r * 0.045, r * 0.26); ctx.closePath(); ctx.fill();
  }
}

// --- Sir Squish — crystal ooze. Jiggly translucent blob with a spinning
//     crystal heart; squashes before a leap, stretches in the air, splats on
//     landing. -------------------------------------------------------------
function drawSlime(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.6;
  const land = hop < 0.12 ? 1 - hop / 0.12 : 0;
  const coil = ph === 'windup' ? 1 : 0;
  const sx = 1 + land * 0.22 + coil * 0.3 - air * 0.14;
  const sy = 1 - land * 0.2 - coil * 0.3 + air * 0.2;
  if (ph !== 'burst') ctx.translate(0, -air * r * 0.25);
  ctx.translate(0, r * 0.5);
  ctx.scale(sx, sy);
  ctx.translate(0, -r * 0.5);
  const blob = () => {
    const N = 22;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 3 + t * 7 + m.seed) * 0.05 + Math.sin(a * 5 - t * 5) * 0.025;
      const x = Math.cos(a) * r * 0.95 * wob;
      let y = Math.sin(a) * r * 0.85 * wob;
      if (y > r * 0.5) y = r * 0.5 + (y - r * 0.5) * 0.3;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ctx.globalAlpha = A * 0.93;
  crShade(ctx, blob, pal, r);
  ctx.globalAlpha = A;
  // spinning crystal heart inside
  ctx.save();
  ctx.rotate(t * 1.5 + m.seed);
  ctx.globalAlpha = A * 0.55;
  crGem(ctx, 0, r * 0.15, r * 0.2, r * 0.32, pal.glow, A * 0.55);
  ctx.restore();
  ctx.globalAlpha = A;
  // rising bubbles
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.6 + i * 0.25 + m.seed) % 1;
    ctx.beginPath();
    ctx.arc(Math.sin(i * 2.1 + m.seed) * r * 0.45, r * 0.4 - p * r * 0.95, r * (0.05 + (i % 3) * 0.025), 0, Math.PI * 2);
    ctx.fill();
  }
  // specular highlights
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.45, r * 0.2, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.62, r * 0.05, 0, Math.PI * 2); ctx.fill();
  // drips along the base
  ctx.fillStyle = pal.primary;
  for (const dx of [-0.55, 0.1, 0.6]) {
    const d = (Math.sin(t * 2 + dx * 9 + m.seed) * 0.5 + 0.5) * r * 0.16;
    ctx.beginPath(); ctx.ellipse(dx * r, r * 0.52 + d * 0.5, r * 0.07, r * 0.06 + d * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  // face
  crEyes(ctx, 0, -r * 0.1, r * 0.21, r * 0.3, look, crBlink(m, t), '#1a1030', coil ? 1 : 0, pal.dark);
  ctx.fillStyle = '#2a0e1e';
  ctx.beginPath(); ctx.ellipse(0, r * 0.24, r * (0.1 + air * 0.06), r * (0.06 + air * 0.1 + coil * 0.04), 0, 0, Math.PI * 2); ctx.fill();
}

// --- Zippy — bat-winged imp (procedural fallback for the bat art). -------
function drawImp(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 30 : 18) + m.seed);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.2 + flap * (fast ? 0.3 : 0.55) - (fast ? 0.5 : 0));
    const wing = () => {
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.1);
      ctx.quadraticCurveTo(r * 1.2, -r * 1.0, r * 1.75, -r * 0.3);
      ctx.quadraticCurveTo(r * 1.3, -r * 0.1, r * 1.35, r * 0.2);
      ctx.quadraticCurveTo(r * 0.9, 0, r * 0.85, r * 0.35);
      ctx.quadraticCurveTo(r * 0.55, r * 0.1, r * 0.3, r * 0.3);
      ctx.closePath();
    };
    wing();
    const g = ctx.createLinearGradient(r * 0.3, 0, r * 1.7, 0);
    g.addColorStop(0, pal.dark); g.addColorStop(1, pal.shade);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = pal.glow; ctx.globalAlpha = A * 0.5; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(r * 0.35, 0); ctx.lineTo(r * 1.7, -r * 0.3); ctx.moveTo(r * 0.35, 0.05 * r); ctx.lineTo(r * 1.3, r * 0.18); ctx.stroke();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.6);
  ctx.quadraticCurveTo(Math.sin(t * 6 + m.seed) * r * 0.6, r * 1.1, Math.sin(t * 6 + m.seed + 1) * r * 0.4, r * 1.4);
  ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); }, pal, r * 0.85);
  for (const side of [-1, 1]) crGem(ctx, side * r * 0.42, -r * 0.62, r * 0.1, r * 0.4, pal.glow, A);
  crEyes(ctx, 0, -r * 0.1, r * 0.2, r * 0.26, look, crBlink(m, t), '#1a1030', 1, pal.dark);
}

// --- Rattles — crystal skeleton warden: marching bone legs with knees, a
//     round shield, a crystal staff, tattered cape and burning eye sockets.
function drawSkeleton(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.8);
  const bone = pal.light, boneDark = pal.primary;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // tattered cape behind
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.2);
  ctx.lineTo(r * 0.4, -r * 0.2);
  for (let i = 4; i >= 0; i--) {
    const x = -r * 0.5 + (i / 4) * r;
    const y = r * (0.75 + (i % 2) * 0.15) + Math.sin(t * 5 + i + m.seed) * r * 0.08;
    ctx.lineTo(x + r * 0.05, y);
  }
  ctx.closePath(); ctx.fill();
  // legs (thigh + shin with knee bend)
  for (const side of [-1, 1]) {
    const sw = side * step * 0.5;
    const kx = side * r * 0.16 + Math.sin(sw) * r * 0.32, ky = r * 0.5 + Math.cos(sw) * r * 0.28;
    const fx = kx + Math.sin(sw * 0.4) * r * 0.1, fy = ky + r * 0.32;
    ctx.strokeStyle = boneDark; ctx.lineWidth = Math.max(2.5, r * 0.15);
    ctx.beginPath(); ctx.moveTo(side * r * 0.14, r * 0.45); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath(); ctx.moveTo(side * r * 0.14, r * 0.45); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = bone;
    ctx.beginPath(); ctx.ellipse(fx + side * r * 0.06, fy, r * 0.12, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  }
  // pelvis
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.26, r * 0.11, 0, 0, Math.PI * 2); }, { ...pal, light: bone }, r * 0.5);
  // torso shadow + ribs + spine
  ctx.fillStyle = 'rgba(10,6,20,0.55)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.4, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = bone;
  ctx.lineWidth = Math.max(1.8, r * 0.09);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.45); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const y = -r * 0.06 + i * r * 0.16, w = r * (0.4 - i * 0.06);
    ctx.beginPath(); ctx.moveTo(-w, y + r * 0.04); ctx.quadraticCurveTo(0, y - r * 0.06, w, y + r * 0.04); ctx.stroke();
  }
  // shield arm (left) and staff arm (right)
  const sw = -step * 0.4;
  ctx.save();
  ctx.translate(-r * 0.48, r * 0.05 + Math.sin(sw) * r * 0.05);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); }, { ...pal, light: crMix(pal.primary, '#ffffff', 0.25) }, r * 0.4);
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.stroke();
  crGem(ctx, 0, r * 0.06, r * 0.07, r * 0.13, pal.glow, A);
  ctx.restore();
  const hx = r * 0.55 + Math.sin(-sw) * r * 0.15, hy = r * 0.25;
  const raise = m.windup;
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.8, r * 0.1);
  ctx.beginPath(); ctx.moveTo(r * 0.36, -r * 0.08); ctx.lineTo(hx, hy - raise * r * 0.35); ctx.stroke();
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.moveTo(hx, hy + r * 0.45 - raise * r * 0.35); ctx.lineTo(hx, hy - r * 0.95 - raise * r * 0.35); ctx.stroke();
  crGem(ctx, hx, hy - r * 0.98 - raise * r * 0.35, r * 0.13, r * 0.24, pal.glow, A);
  // skull
  const chatter = m.windup > 0 ? Math.abs(Math.sin(t * 40)) * r * 0.08 : 0;
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.4, 0, Math.PI * 2); }, { ...pal, light: '#ffffff', primary: bone, shade: boneDark }, r * 0.45);
  ctx.fillStyle = bone; ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath(); ctx.roundRect(-r * 0.2, -r * 0.28 + chatter, r * 0.4, r * 0.16, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 1;
  for (const tx of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(tx * r, -r * 0.28 + chatter); ctx.lineTo(tx * r, -r * 0.16 + chatter); ctx.stroke(); }
  // crystal crown shards
  for (const dx of [-0.22, 0, 0.22]) crGem(ctx, dx * r, -r * 0.88, r * 0.07, r * (dx ? 0.16 : 0.24), pal.glow, A);
  // burning eye sockets
  const pulse = 0.6 + 0.4 * Math.sin(t * 4 + m.seed);
  ctx.fillStyle = '#120a1e';
  ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.57, r * 0.12, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.57, r * 0.12, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  drawGlow(ctx, -r * 0.15, -r * 0.58, r * 0.2 * pulse + r * 0.08, pal.glow, 0.8);
  drawGlow(ctx, r * 0.15, -r * 0.58, r * 0.2 * pulse + r * 0.08, pal.glow, 0.8);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.58, r * 0.04, 0, Math.PI * 2); ctx.arc(r * 0.15, -r * 0.58, r * 0.04, 0, Math.PI * 2); ctx.fill();
}

// --- Mossback — hulking crystal troll. Heavy stomping gait, moss and
//     glowing back crystals; heaves its club overhead before a ground slam.
function drawTroll(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  const stomp = Math.abs(step) * r * 0.08;
  ctx.translate(0, stomp);
  // feet
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? step * side * r * 0.15 : 0;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.45, r * 0.8 - lift, r * 0.3, r * 0.17, 0, 0, Math.PI * 2); }, pal, r * 0.4);
  }
  // back crystals
  for (const [dx, h, a] of [[-0.55, 0.55, -0.45], [-0.18, 0.8, -0.1], [0.25, 0.6, 0.25]]) {
    ctx.save();
    ctx.translate(dx * r, -r * 0.45);
    ctx.rotate(a);
    crGem(ctx, 0, 0, r * 0.14, h * r, pal.glow, A);
    ctx.restore();
  }
  // club arm — heaved overhead for the slam / a shot
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  // rest: hangs down-right; raise swings it overhead (angle toward π)
  const armA = -0.45 - raise * 2.4 + step * 0.15;
  ctx.save();
  ctx.translate(r * 0.62, -r * 0.05);
  ctx.rotate(armA);
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); ctx.stroke();
  ctx.strokeStyle = '#4a2e1a';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath(); ctx.moveTo(0, r * 0.45); ctx.lineTo(0, r * 1.15); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 1.22, r * 0.26, r * 0.32, 0, 0, Math.PI * 2); }, { ...pal, light: '#9a7a5a', primary: '#6a4a2e', shade: '#3a2414' }, r * 0.35);
  for (const [sx, sy] of [[-0.14, 1.12], [0.14, 1.3], [0, 1.45]]) crGem(ctx, sx * r, sy * r, r * 0.06, r * 0.12, pal.glow, A);
  ctx.restore();
  // body
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.4, -r * 0.3, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.72, r * 0.72, -r * 0.3);
    ctx.quadraticCurveTo(r * 0.92, r * 0.1, r * 0.65, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.85, -r * 0.65, r * 0.6);
    ctx.closePath();
  };
  crShade(ctx, body, pal, r);
  // moss patches
  ctx.save();
  body(); ctx.clip();
  ctx.fillStyle = crMix(pal.dark, '#5ca048', 0.45);
  ctx.globalAlpha = A * 0.55;
  for (const [mx, my, mr] of [[-0.55, -0.35, 0.3], [0.3, -0.55, 0.22], [-0.7, 0.25, 0.2]]) {
    ctx.beginPath(); ctx.arc(mx * r, my * r, mr * r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = A;
  ctx.fillStyle = pal.light;
  ctx.globalAlpha = A * 0.6;
  ctx.beginPath(); ctx.ellipse(0, r * 0.28, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = A;
  // off arm swinging
  ctx.save();
  ctx.translate(-r * 0.7, -r * 0.05);
  ctx.rotate(0.45 + step * 0.3 + (ph === 'windup' ? 0.7 : 0));
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.6); ctx.stroke();
  ctx.fillStyle = pal.shade;
  ctx.beginPath(); ctx.arc(0, r * 0.66, r * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // face
  const rage = ph === 'windup' ? 1 : m.windup;
  crEyes(ctx, r * 0.05, -r * 0.25, r * 0.13, r * 0.2, look, crBlink(m, t), '#1a1030', 1.2 + rage, pal.dark);
  ctx.fillStyle = pal.shade;
  ctx.beginPath(); ctx.ellipse(r * 0.06, -r * 0.08, r * 0.1, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a0e1e';
  ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.08, r * 0.2, r * (0.05 + rage * 0.07), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8ec';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.05 + side * r * 0.18, r * 0.06);
    ctx.lineTo(r * 0.05 + side * r * 0.13, -r * 0.14);
    ctx.lineTo(r * 0.05 + side * r * 0.07, r * 0.06);
    ctx.closePath(); ctx.fill();
  }
}

// --- Bruncle, the Gate-Breaker — boss: breathing shaded bulk, crystal
//     crown, swinging fists; eyes and maw flare when it fires; red when
//     enraged under half health. ------------------------------------------
function drawBoss(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const breathe = Math.sin(t * 2.2) * 0.04;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : pal.glow;
  ctx.scale(1 + breathe, 1 - breathe);
  // cape
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.3);
  ctx.quadraticCurveTo(-r * 1.15, r * 0.6 + Math.sin(t * 2) * r * 0.08, -r * 0.6, r * 0.95);
  ctx.lineTo(r * 0.6, r * 0.95);
  ctx.quadraticCurveTo(r * 1.15, r * 0.6 + Math.sin(t * 2 + 1) * r * 0.08, r * 0.7, -r * 0.3);
  ctx.closePath(); ctx.fill();
  // fists
  for (const side of [-1, 1]) {
    const sw = Math.sin(t * 2.4 + side) * 0.25;
    ctx.save();
    ctx.translate(side * r * 0.85, r * 0.1);
    ctx.rotate(side * (0.3 + sw));
    ctx.strokeStyle = pal.primary;
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.4); ctx.stroke();
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.23, 0, Math.PI * 2); }, pal, r * 0.3);
    drawGlow(ctx, 0, r * 0.52, r * 0.14, glow, 0.8);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.8, r * 0.7, 0, 0, Math.PI * 2); }, pal, r);
  // armored chest plate
  ctx.fillStyle = pal.shade;
  ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.25); ctx.lineTo(r * 0.4, r * 0.25); ctx.lineTo(r * 0.25, r * 0.65); ctx.lineTo(-r * 0.25, r * 0.65); ctx.closePath(); ctx.fill();
  crGem(ctx, 0, r * 0.48, r * 0.1, r * 0.16, glow, A);
  // crown
  for (let i = -2; i <= 2; i++) {
    const h = r * (0.35 + (2 - Math.abs(i)) * 0.14);
    crGem(ctx, i * r * 0.2, -r * 0.5, r * 0.09, h, glow, A);
  }
  // horns
  for (const side of [-1, 1]) {
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.5, -r * 0.4);
    ctx.quadraticCurveTo(side * r * 1.0, -r * 0.6, side * r * 0.85, -r * 1.05);
    ctx.lineTo(side * r * 0.3, -r * 0.52);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = crMix(pal.dark, '#ffffff', 0.35); ctx.lineWidth = 1.5; ctx.stroke();
  }
  // eyes
  const eyeHeat = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0, rage * 0.6);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#120a1e';
    ctx.beginPath(); ctx.ellipse(side * r * 0.28, -r * 0.08, r * 0.17, r * 0.12, side * 0.3, 0, Math.PI * 2); ctx.fill();
    drawGlow(ctx, side * r * 0.28, -r * 0.07, r * (0.14 + eyeHeat * 0.12), glow, 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(side * r * 0.28 + look.x * r * 0.04, -r * 0.07 + look.y * r * 0.03, r * (0.05 + eyeHeat * 0.03), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.48, -r * 0.28); ctx.lineTo(side * r * 0.12, -r * 0.16); ctx.stroke();
  }
  // maw
  const open = Math.max(m.windup * 0.6, m.fireFlash > 0 ? 1 : 0);
  ctx.fillStyle = '#1a0812';
  ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.32, r * (0.06 + open * 0.14), 0, 0, Math.PI * 2); ctx.fill();
  if (open > 0.1) drawGlow(ctx, 0, r * 0.34, r * 0.25 * open, glow, open);
  ctx.fillStyle = '#fff8ec';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.24, r * 0.25); ctx.lineTo(side * r * 0.17, r * 0.46); ctx.lineTo(side * r * 0.1, r * 0.25);
    ctx.closePath(); ctx.fill();
  }
}

const CREATURE_DRAW = {
  goblin: drawGoblin,
  slime: drawSlime,
  slimeSmall: drawSlime,
  imp: drawImp,
  skeleton: drawSkeleton,
  troll: drawTroll,
  ogreBoss: drawBoss,
};

// Draws the creature body (no shadow/aura) at its position — used for the
// live monster, its afterimages and its knocked-away corpse.
// Baked-frame sprites drawn facing right; mirrored when moving left so the head leads.
const FACE_RIGHT = new Set(['goblin', 'lanternfin']);

function crBody(ctx, m, tint, t, look, batImg, pal, extraRot = 0, extraScale = 1, enemyImg = null) {
  const sp = m.skin && SPECIES[m.skin];
  const r = m.r;
  const ph = m.action && m.action.phase;
  ctx.save();
  ctx.translate(m.x, m.y - (m.z || 0));
  // windup: trembling crouch that telegraphs the move
  if (ph === 'windup') ctx.translate((Math.random() - 0.5) * r * 0.08, 0);
  if (m.frameImg && FACE_RIGHT.has(m.skin || m.type) && m.vx < -6) ctx.scale(-1, 1);
  ctx.rotate(crClamp(m.vx / 320, -0.4, 0.4) * (m.boss ? 0.25 : 1) + extraRot);
  // splits pop out fast; everything else grows in as it comes through its rift
  const pop = m.isChild ? crEaseOutBack(Math.min(1, m.spawnT / 0.3)) : m.boss ? 1 : crEaseOutBack(Math.min(1, m.spawnT / 0.45));
  const sq = m.squish * 0.2 + (ph === 'windup' && m.type !== 'imp' ? 0.12 : 0);
  ctx.scale(pop * (1 + sq) * extraScale, pop * (1 - sq) * extraScale);
  // Real Graphic Sprites (AI/painted sprites + animated frames)
  const seaSprite = (typeof SEA_SPRITES !== 'undefined' && m.skin && SEA_SPRITES[m.skin]) || (sp && sp.sprite);
  const iceSprite = (typeof ICE_SPRITES !== 'undefined' && m.skin && ICE_SPRITES[m.skin]);
  const spriteImg = m.frameImg || (seaSprite && (seaSprite.naturalWidth || seaSprite.width) ? seaSprite : null) || (iceSprite && (iceSprite.naturalWidth || iceSprite.width) ? iceSprite : null) || (enemyImg && (enemyImg.naturalWidth || enemyImg.width) ? enemyImg : null) || (sp && sp.sprite && sp.sprite.width ? sp.sprite : null);
  if (spriteImg) {
    const isSwimmer = m.skin === 'jelly' || m.skin === 'lanternfin' || m.skin === 'kraken' || m.skin === 'turtle';
    const isFlyer = m.flying || m.type === 'imp' || m.skin === 'lanternfin';
    const cadence = (ph === 'burst' ? 5.2 : 3.4);
    const step = (m.anim || 0) * cadence;

    // Baked-frame enemies (tools/make_enemy_frames.py) carry their own motion,
    // so the procedural bob, waddle and limb overlays are skipped for them.
    if (!m.frameImg) {
    // 1. Organic movement: step bounce, waddle roll, stride squash & stretch, breathing
    const bounce = isFlyer ? Math.sin(t * 4 + m.seed) * r * 0.12 : Math.abs(Math.cos(step)) * r * 0.14;
    const waddle = isFlyer ? Math.sin(t * 3 + m.seed) * 0.08 : Math.sin(step) * 0.11;
    const breathe = Math.sin(t * 3.5 + m.seed) * 0.04;
    const strideSq = Math.sin(step * 2) * 0.06;

    ctx.translate(0, -bounce);
    ctx.rotate(waddle);
    ctx.scale(1 + strideSq + breathe, 1 - strideSq + breathe);

    // 2. Animated procedural appendages underneath the sprite body
    if (m.skin === 'crab' || (!m.skin && (m.type === 'goblin' || m.type === 'troll'))) {
      // 6 scuttling legs walking alongside the sprite
      ctx.save();
      ctx.strokeStyle = pal.shade || '#5a2010';
      ctx.lineWidth = Math.max(2.5, r * 0.11);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const legPhase = Math.sin(step + i * 2.1 + (side > 0 ? Math.PI : 0));
          const bx = side * r * 0.55, by = r * (0.05 + i * 0.18);
          const kx = side * r * (0.95 + i * 0.05), ky = by - r * 0.12 + legPhase * r * 0.14;
          const fx = side * r * (1.2 + i * 0.05), fy = by + r * 0.28 + legPhase * r * 0.2;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        }
      }
      ctx.restore();
    } else if (m.skin === 'jelly' || m.type === 'slime' || m.type === 'slimeSmall') {
      // Undulating tentacles / droplets trailing below
      ctx.save();
      ctx.strokeStyle = pal.glow || '#9ff4ff';
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const ox = i * r * 0.22;
        const wave = Math.sin(t * 6 + i * 1.3 + m.seed) * r * 0.22;
        ctx.beginPath();
        ctx.moveTo(ox, r * 0.2);
        ctx.quadraticCurveTo(ox + wave, r * 0.7, ox + wave * 0.5, r * 1.25);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2b. Flying wing flutter & swimming fins behind the body
    if (isFlyer) {
      ctx.save();
      const wingFlap = Math.sin(t * 22 + m.seed);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.65, -r * 0.15);
        ctx.scale(side * (0.65 + wingFlap * 0.5), 1);
        ctx.fillStyle = pal.glow || 'rgba(180, 230, 255, 0.65)';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.65, r * 0.32, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    }

    // 3. Draw the sprite body (with subtle head/body tracking tilt)
    ctx.save();
    if (look && typeof look.x === 'number') {
      ctx.rotate(look.x * 0.08); // Head/torso tracks player direction
    }
    const aspect = spriteImg.width / spriteImg.height;
    const mult = (m.boss && m.skin === 'kraken') ? 1.85 : (m.boss && m.skin === 'frostgiant') ? 2.1 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3)));
    const h = r * mult * (m.type === 'slimeSmall' ? 0.72 : 1);
    const w = h * aspect;
    if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.3);
    let drawImg = spriteImg;
    if (pal?.flashAmt && pal.flashAmt > 0.3) {
      drawImg = tintedImage(spriteImg, '#ffffff');
    } else if (!m.skin && tint?.primary) {
      drawImg = tintedImage(spriteImg, tint.primary);
    }
    ctx.drawImage(drawImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    // 4. Hands & Claws animated micro-movements
    if (m.skin === 'crab' && !m.frameImg) {
      // Claws snapping open/closed in rhythm; wide open in attack windup
      const snap = ph === 'windup' ? 1.0 : (Math.sin(t * 7 + m.seed) * 0.5 + 0.5) * 0.8;
      for (const side of [-1, 1]) {
        ctx.save();
        const armLift = Math.sin(step + (side > 0 ? 0 : Math.PI)) * r * 0.08;
        ctx.translate(side * r * 0.8, -r * 0.3 + armLift);
        ctx.rotate(side * (0.45 + Math.sin(step * 0.7) * 0.12));
        ctx.strokeStyle = pal.primary || '#d84a2a';
        ctx.lineWidth = Math.max(2, r * 0.14);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, r * 0.15); ctx.lineTo(side * r * 0.1, -r * 0.12); ctx.stroke();
        ctx.translate(side * r * 0.1, -r * 0.15);
        ctx.fillStyle = pal.shade || '#8a2010';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        // Snapping pincer notch
        ctx.fillStyle = '#0a1018';
        ctx.beginPath();
        ctx.moveTo(-r * 0.04, -r * 0.04);
        ctx.lineTo(side * r * 0.22, -r * 0.07 - snap * r * 0.12);
        ctx.lineTo(side * r * 0.22, -r * 0.01 + snap * r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (!m.skin && (m.type === 'goblin' || m.type === 'skeleton' || m.type === 'troll')) {
      // Pumping hands / arms that swing with step rhythm
      ctx.save();
      for (const side of [-1, 1]) {
        const armSwing = Math.sin(step + (side > 0 ? 0 : Math.PI)) * r * 0.18;
        ctx.fillStyle = pal.shade || '#4a3020';
        ctx.beginPath();
        ctx.arc(side * r * 0.6, r * 0.15 + armSwing, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Head & eye movements: swaying stalks, tracking slit pupils, blinking
    if (m.skin === 'crab') {
      for (const side of [-1, 1]) {
        const sway = Math.sin(t * 3.5 + side + m.seed) * r * 0.06;
        const headNod = Math.sin(step * 1.5) * r * 0.04;
        crEyes(ctx, side * r * 0.24 + sway, -r * 0.58 + headNod, r * 0.12, 0.0001, look, crBlink(m, t), '#1a1030', 0, pal.dark);
      }
    }
  } else if (sp) {
    sp.draw(ctx, m, pal, t, look);
  } else if (batImg && m.type === 'imp') {
    const img = tintedImage(batImg, tint?.primary);
    const size = r * 2.5;
    const bw = size * (batImg.width / batImg.height);
    if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.5);
    ctx.drawImage(img, -bw / 2, -size / 2, bw, size);
  } else {
    (CREATURE_DRAW[m.type] || drawGoblin)(ctx, m, pal, t, look);
  }
  ctx.restore();
}

function crPalette(m, tint, flashAmt) {
  const primary = tint?.primary || m.color;
  const dark = tint?.dark || '#2a1f4d';
  const glow = tint?.glow || '#ffffff';
  const f = flashAmt;
  const p = f > 0 ? crMix(primary, '#ffffff', f) : primary;
  return {
    primary: p,
    light: crMix(primary, '#ffffff', Math.min(1, 0.26 + f)),
    shade: f > 0 ? crMix(crMix(primary, dark, 0.72), '#ffffff', f * 0.7) : crMix(primary, dark, 0.72),
    dark: f > 0 ? crMix(dark, '#ffffff', f * 0.5) : dark,
    glow,
    rim: crMix(glow, '#ffffff', 0.2),
    flashAmt: f,
  };
}

// Main entry. look = {x, y} unit-ish vector toward the Guardian so eyes
// track the player. batImg (optional) = current bat-art frame for imps.
export function drawCreature(ctx, m, tint, t, look, batImg = null, enemyImg = null) {
  const r = m.r;
  // Hit flash: full white pop for small fry, a subtle tint for bosses and
  // elites (they're hit near-constantly).
  const flashAmt = m.hitFlash > 0 ? ((m.boss || m.elite) ? 0.3 : 0.85) : 0;
  // stage species may bring its own palette (render/species.js)
  const sp = m.skin && SPECIES[m.skin];
  if (sp && sp.colors) tint = sp.colors;
  const pal = crPalette(m, tint, flashAmt);
  const ph = m.action && m.action.phase;

  // ground shadow — stays on the ground while a slime leaps, shrinking
  const lift = (m.z || 0) / (r * 2.2);
  ctx.save();
  ctx.globalAlpha = (m.flying ? 0.14 : 0.28) * (1 - lift * 0.5);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(m.x, m.y + r * (m.flying ? 1.8 : 0.95), r * (m.flying ? 0.5 : 0.8) * (1 - lift * 0.35), r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 1. Dynamic movement ripples & footstep shockwaves
  const runPhase = (m.anim || 0) * 3.5;
  const ripT = (runPhase % Math.PI) / Math.PI;
  const ripR = r * (0.35 + ripT * 0.85);
  const ripAlpha = (1 - ripT) * (m.flying ? 0.15 : 0.38) * (1 - lift * 0.7);
  ctx.save();
  ctx.strokeStyle = pal.glow || 'rgba(127, 216, 255, 0.6)';
  ctx.lineWidth = Math.max(1, 2 * (1 - ripT));
  ctx.globalAlpha = ripAlpha;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y + r * 0.82, ripR, ripR * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. Trailing motion wake lines
  const spd = Math.hypot(m.vx || 0, m.pvy || m.speed || 80);
  if (spd > 35 && CONFIG.quality.level >= 2) {
    ctx.save();
    ctx.strokeStyle = pal.glow || '#7fd8ff';
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.28 * (1 - lift * 0.5);
    for (const side of [-0.5, 0.5]) {
      const wx = m.x + side * r * 0.85;
      const wy = m.y + r * 0.3;
      const tLen = Math.min(24, spd * 0.15);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx - (m.vx || 0) * 0.04, wy - tLen);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Fire embers, rising sparks & elemental motion particles
  const isFireStage = m.skin === 'kobold' || m.skin === 'firebat' || m.skin === 'magma' || m.enraged;
  if (CONFIG.quality.level >= 2 && (isFireStage || ph === 'burst' || m.elite || m.boss)) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const sparkT = (t * 5 + i * 2.2 + (m.seed || 0)) % 1;
      const sx = m.x + Math.sin(t * 10 + i * 3) * r * 0.55;
      const sy = m.y + r * 0.4 - sparkT * r * 1.6;
      const sr = (1 - sparkT) * (isFireStage ? 4.5 : 3.0);
      ctx.fillStyle = isFireStage ? '#ff6a1a' : pal.glow;
      ctx.globalAlpha = (1 - sparkT) * 0.75;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // soft aura in the stage glow color — keeps every enemy readable on busy
  // backgrounds and makes the horde feel magical
  if (CONFIG.quality.level >= 2) drawGlow(ctx, m.x, m.y - (m.z || 0), r * 1.5, pal.glow, 0.16);
  if (m.elite) {
    drawGlow(ctx, m.x, m.y, r * 2.1, '#ffcc33', 0.35 + 0.15 * Math.sin(t * 5));
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(t * 1.8);
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (m.boss) drawGlow(ctx, m.x, m.y, r * 1.6, m.enraged ? '#ff3344' : pal.glow, 0.3 + 0.1 * Math.sin(t * 3));
  if (m.slowT > 0) drawGlow(ctx, m.x, m.y, r * 1.4, '#9fe8ff', 0.4);

  // windup tell — a pulsing ring so the player sees the move coming
  if (ph === 'windup') {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 30);
    ctx.strokeStyle = m.type === 'troll' ? '#ff8a3d' : pal.glow;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(m.x, m.y, r * (1.2 + 0.2 * Math.sin(t * 20)), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // afterimages + speed lines while bursting
  if (m.ghosts && m.ghosts.length > 1 && CONFIG.quality.level >= 2) {
    const ghostPal = crPalette(m, tint, 0.6);
    for (let i = m.ghosts.length - 1; i >= 1; i--) {
      const g = m.ghosts[i];
      ctx.save();
      ctx.globalAlpha = 0.28 * (1 - i / m.ghosts.length);
      crBody(ctx, { ...m, x: g.x, y: g.y, z: 0, action: null, ghosts: null, windup: 0 }, tint, t, look, batImg, ghostPal, 0, 1, enemyImg);
      ctx.restore();
    }
    const g0 = m.ghosts[m.ghosts.length - 1];
    const dx = m.x - g0.x, dy = m.y - (m.z || 0) - g0.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (const off of [-0.6, 0, 0.6]) {
      const nx = -dy / d * r * off, ny = dx / d * r * off;
      ctx.beginPath();
      ctx.moveTo(m.x - dx / d * r * 1.1 + nx, m.y - (m.z || 0) - dy / d * r * 1.1 + ny);
      ctx.lineTo(m.x - dx / d * r * 2.4 + nx, m.y - (m.z || 0) - dy / d * r * 2.4 + ny);
      ctx.stroke();
    }
    ctx.restore();
  }

  crBody(ctx, m, tint, t, look, batImg, pal, m.rot || 0, m.corpseScale || 1, enemyImg);

  // 4. Charging-shot telegraph — swirling energy vortex + lens flare + intense glowing plasma core
  const w = m.windup;
  if (w > 0) {
    const oy = m.y + r * (m.boss ? 0.35 : 0.55);
    drawGlow(ctx, m.x, oy, 8 + w * r * (m.boss ? 1.4 : 1.0), m.enraged ? '#ff4d5a' : pal.glow, 0.85);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Converging vortex sparks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = t * 12 + (i * Math.PI / 2);
      const d = (1 - (w % 0.25) / 0.25) * r * 1.4;
      ctx.beginPath();
      ctx.moveTo(m.x + Math.cos(a) * d, oy + Math.sin(a) * d);
      ctx.lineTo(m.x, oy);
      ctx.stroke();
    }
    // Core burst
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(m.x, oy, 2 + w * 4.5, 0, Math.PI * 2); ctx.fill();
    // Cross lens flare
    ctx.strokeStyle = pal.glow || '#7fd8ff';
    ctx.lineWidth = 2;
    const flLen = w * r * 0.85;
    ctx.beginPath();
    ctx.moveTo(m.x - flLen, oy); ctx.lineTo(m.x + flLen, oy);
    ctx.moveTo(m.x, oy - flLen); ctx.lineTo(m.x, oy + flLen);
    ctx.stroke();
    ctx.restore();
  }
}
