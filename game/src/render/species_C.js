// Serious redesigns of stage species (group C) — replaces the drawing of
// existing SPECIES entries; see render/species.js for the draw contract.
// Abyssal Forest, Aetherial Gardens and Clockwork City casts: dark-fantasy
// silhouettes (horns, blades, armour, cracked stone, exposed gears) with a
// glowing accent per stage. Every material is mixed toward white by the hit
// flash (sxcMat / sxcC) so hits still pop.
import { SPECIES } from './species.js';
import { crShade, crBlink, drawGlow, crMix } from './creatures.js';

const SXC_TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers --
function sxcF(m) { return m.hitFlash > 0 ? ((m.boss || m.elite) ? 0.3 : 0.85) : 0; }
const sxcMatCache = new Map();
// material palette (light/primary/shade/dark/rim) with the hit flash mixed in
function sxcMat(base, f) {
  if (!f) return base;
  const key = base.light + base.primary + base.shade + f;
  let v = sxcMatCache.get(key);
  if (!v) {
    v = { light: crMix(base.light, '#ffffff', Math.min(1, f + 0.1)), primary: crMix(base.primary, '#ffffff', f), shade: crMix(base.shade, '#ffffff', f * 0.7), dark: crMix(base.dark, '#ffffff', f * 0.5), rim: base.rim, glow: base.glow };
    sxcMatCache.set(key, v);
  }
  return v;
}
function sxcC(c, f) { return f ? crMix(c, '#ffffff', f * 0.75) : c; }

// tapered limb / blade quad from (x0,y0) w0 to (x1,y1) w1
function sxcTaper(ctx, x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
  ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
  ctx.closePath();
}
// curved spike / horn / thorn / feather: base half-width w, tip at (x1,y1)
function sxcHorn(ctx, x0, y0, x1, y1, w, bend) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w, y0 + ny * w);
  ctx.quadraticCurveTo(mx + nx * w * 0.55, my + ny * w * 0.55, x1, y1);
  ctx.quadraticCurveTo(mx - nx * w * 0.55, my - ny * w * 0.55, x0 - nx * w, y0 - ny * w);
  ctx.closePath();
}
function sxcFill(ctx, fill, stroke, lw) {
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}
// faceted crystal shard: mid facet, dark facet, bright ridge sliver
function sxcShard(ctx, x, y, w, h, ang, cl, cm, cd, outline) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-w, -h * 0.6); ctx.lineTo(-w * 0.8, 0); ctx.lineTo(0, h * 0.14); ctx.closePath();
  ctx.fillStyle = cm; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, -h * 0.6); ctx.lineTo(w * 0.8, 0); ctx.lineTo(0, h * 0.14); ctx.closePath();
  ctx.fillStyle = cd; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-w * 0.45, -h * 0.58); ctx.lineTo(-w * 0.18, -h * 0.05); ctx.lineTo(0, h * 0.1); ctx.closePath();
  ctx.fillStyle = cl; ctx.fill();
  if (outline) {
    ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, -h * 0.6); ctx.lineTo(w * 0.8, 0); ctx.lineTo(0, h * 0.14); ctx.lineTo(-w * 0.8, 0); ctx.lineTo(-w, -h * 0.6); ctx.closePath();
    ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, w * 0.22); ctx.lineJoin = 'round'; ctx.stroke();
  }
  ctx.restore();
}
// narrow glaring slit eyes in a dark socket, inner corners low, under a brow
function sxcEyes(ctx, x, y, w, gap, color, blink, angry, brow, glowA = 0.55) {
  for (const side of [-1, 1]) {
    const ex = x + side * gap;
    if (glowA > 0) drawGlow(ctx, ex, y, w * 2.3, color, glowA);
    ctx.save(); ctx.translate(ex, y); ctx.scale(side, 1); ctx.rotate(-0.14 - angry * 0.12);
    ctx.fillStyle = 'rgba(4,2,10,0.78)';
    ctx.beginPath(); ctx.ellipse(0, 0, w * 1.3, w * 0.62, 0, 0, SXC_TAU); ctx.fill();
    ctx.scale(1, Math.max(0.15, blink));
    ctx.beginPath(); ctx.moveTo(-w * 0.95, w * 0.16);
    ctx.quadraticCurveTo(0, -w * 0.42, w, -w * 0.32);
    ctx.quadraticCurveTo(w * 0.15, w * 0.36, -w * 0.95, w * 0.16); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.42, w * 0.09, -0.12, 0, SXC_TAU); ctx.fill();
    ctx.restore();
    if (brow) {
      ctx.strokeStyle = brow; ctx.lineWidth = Math.max(1.4, w * 0.38); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - side * w * 1.0, y - w * (0.3 - angry * 0.18)); ctx.lineTo(ex + side * w * 1.25, y - w * 0.9); ctx.stroke();
    }
  }
}
// row of fangs along y (down = true points down)
function sxcFangs(ctx, x0, x1, y, n, h, color, down = true) {
  const dw = (x1 - x0) / n, s = down ? 1 : -1;
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = x0 + i * dw, hh = h * (i === 0 || i === n - 1 ? 1.35 : (i % 2 ? 0.6 : 0.9));
    ctx.moveTo(a, y); ctx.lineTo(a + dw * 0.5, y + s * hh); ctx.lineTo(a + dw, y);
  }
  ctx.fill();
}
// square-toothed cog
function sxcGearPath(ctx, r, teeth, depth, rot) {
  ctx.beginPath();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * SXC_TAU, k = (i % 4 === 1 || i % 4 === 2) ? 1 : 1 - depth;
    if (i) ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); else ctx.moveTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
  }
  ctx.closePath();
}
// raked saw-blade teeth
function sxcSawPath(ctx, r, n, depth, rot) {
  ctx.beginPath();
  const st = SXC_TAU / n, ri = r * (1 - depth);
  ctx.moveTo(Math.cos(rot) * ri, Math.sin(rot) * ri);
  for (let i = 0; i < n; i++) {
    const a = rot + i * st;
    ctx.lineTo(Math.cos(a + st * 0.82) * r, Math.sin(a + st * 0.82) * r);
    ctx.lineTo(Math.cos(a + st) * ri, Math.sin(a + st) * ri);
  }
  ctx.closePath();
}
// flame / spirit-fire silhouette with sharp licking tongues
function sxcFlame(ctx, w, h, t, seed, n = 10) {
  const cy = h * 0.15, pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * SXC_TAU, sa = Math.sin(a), up = Math.max(0, -sa);
    const tongue = (i === 0 ? 0.9 : i % 2 ? 0.55 : 0.18) + 0.22 * Math.sin(t * 9 + i * 1.9 + seed);
    const k = 1 + up * up * tongue;
    pts.push([Math.cos(a) * w + Math.sin(t * 5 + i + seed) * w * 0.1 * up, cy + sa * h * 0.7 * k]);
  }
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n], q = pts[i - 1];
    let mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const bottom = my > cy + h * 0.15;
    const k = bottom ? 0.28 : -0.32;
    mx += mx * k; my += (my - cy) * k;
    ctx.quadraticCurveTo(mx, my, p[0], p[1]);
  }
  ctx.closePath();
}
function sxcRivets(ctx, pts, r, rr, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (const [x, y] of pts) { ctx.moveTo(x * r + rr, y * r); ctx.arc(x * r, y * r, rr, 0, SXC_TAU); }
  ctx.fill();
}
const sxcSteamCols = [];
for (let i = 0; i <= 10; i++) sxcSteamCols.push(`rgba(190,184,178,${(0.035 * i).toFixed(3)})`);
function sxcSteam(ctx, x, y, r, t, seed, scale = 1) {
  for (let i = 0; i < 3; i++) {
    const p = (((t * 0.9 + i / 3 + seed) % 1) + 1) % 1;
    ctx.fillStyle = sxcSteamCols[Math.round(10 * (1 - p))];
    ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * r * 0.2 * scale, y - p * r * 1.2 * scale, r * (0.12 + p * 0.28) * scale, 0, SXC_TAU); ctx.fill();
  }
}

// ---------------------------------------------------------- materials ------
const SXC_SHADOW = { light: '#6e5aa8', primary: '#2c2148', shade: '#120c22', dark: '#05020a', rim: '#7a5ab8' };
const SXC_BONE = { light: '#f4eee0', primary: '#c0b6a0', shade: '#5a5044', dark: '#1a1610', rim: '#a898c8' };
const SXC_FEATHER = { light: '#6a5a90', primary: '#2a2040', shade: '#0e0a18', dark: '#030206', rim: '#9a80e0' };
const SXC_ROBE = { light: '#6a4a8a', primary: '#33204e', shade: '#150c24', dark: '#05020a', rim: '#4ab890' };
const SXC_BARK = { light: '#7a5a68', primary: '#3a2a34', shade: '#18101a', dark: '#060306', rim: '#7a4a9a' };
const SXC_MARBLE = { light: '#f2eef6', primary: '#a8a4bc', shade: '#45415f', dark: '#16142a', rim: '#8ab0e0' };
const SXC_INDIGO = { light: '#5a5ab8', primary: '#24246a', shade: '#0c0c30', dark: '#03030e', rim: '#5a9ad8' };
const SXC_VOID = { light: '#7a6ad8', primary: '#3a2a8a', shade: '#140c3a', dark: '#04020e', rim: '#8a6ad8' };
const SXC_GOLD = { light: '#fff2c0', primary: '#d8a840', shade: '#7a4e10', dark: '#2a1804', rim: '#fff2c0' };
const SXC_MOONSTONE = { light: '#c4c8dc', primary: '#727690', shade: '#2c2e46', dark: '#0e0f1c', rim: '#8ab0e0' };
const SXC_ICE = { light: '#c8dcf8', primary: '#4a5e98', shade: '#18204a', dark: '#060c22', rim: '#7fd8ff' };
const SXC_DARKANGEL = { light: '#6a5a98', primary: '#2a2050', shade: '#100a24', dark: '#04020a', rim: '#a8884a' };
const SXC_BRASS = { light: '#ffe0a0', primary: '#a87428', shade: '#4a300c', dark: '#1e1206', rim: '#c89050' };
const SXC_COPPER = { light: '#f0a070', primary: '#8a4a28', shade: '#3a1a0a', dark: '#1a0a04', rim: '#b86a40' };
const SXC_IRON = { light: '#9a9eaa', primary: '#464a54', shade: '#1c1e24', dark: '#0a0b0e', rim: '#8a5a3a' };

// ==================================================== ABYSSAL FOREST ======

// Gloomling — shadow stalker: a low, broad-shouldered hound of living
// shadow with amethyst shards along its spine, swept horn-ears, glaring slit
// eyes and a fanged wedge of a skull; smoke curls off its back as it lopes.
function sxcGloomling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase, wind = ph === 'windup', burst = ph === 'burst';
  const run = m.anim * (burst ? 3.6 : 2.4), s = Math.sin(run);
  ctx.translate(0, -Math.abs(s) * r * 0.08 + (wind ? r * 0.06 : 0));
  const fur = sxcMat(SXC_SHADOW, f), bone = sxcC('#e8dcff', f);
  // shadow smouldering off the back
  ctx.save(); ctx.translate(0, -r * 0.35); ctx.globalAlpha = A * 0.55;
  sxcFlame(ctx, r * 0.72, r * 0.75, t * 0.8, m.seed, 10); ctx.fillStyle = sxcC('#140c26', f); ctx.fill();
  ctx.restore(); ctx.globalAlpha = A;
  // haunches behind the shoulders
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.34, r * 0.48, r * 0.3, 0, 0, SXC_TAU); }, fur, r * 0.55);
  // amethyst shards along the spine
  for (const [x, y, w, h, a] of [[-0.26, -0.5, 0.08, 0.34, -0.55], [0.02, -0.6, 0.1, 0.46, 0.08], [0.28, -0.5, 0.07, 0.3, 0.6]]) {
    sxcShard(ctx, x * r, y * r, w * r, h * r, a, sxcC('#f4e4ff', f), sxcC('#a070f0', f), sxcC('#3a1e78', f), '#0a0418');
  }
  drawGlow(ctx, 0, -r * 0.7, r * 0.45, '#b48cff', 0.35);
  // front legs: digging, alternating, hooked claws
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * s) * r * 0.14, reach = side * s * r * 0.05;
    crShade(ctx, () => sxcTaper(ctx, side * r * 0.42, -r * 0.02, side * r * 0.47 + reach, r * 0.72 - lift, r * 0.19, r * 0.1), fur, r * 0.4);
    ctx.fillStyle = bone;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) { const cx = side * r * 0.46 + reach + k * r * 0.07; ctx.moveTo(cx - r * 0.03, r * 0.72 - lift); ctx.lineTo(cx + side * r * 0.01, r * 0.86 - lift); ctx.lineTo(cx + r * 0.03, r * 0.72 - lift); }
    ctx.fill();
  }
  // shoulders + chest with a jagged ruff
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.64, -r * 0.08);
    ctx.lineTo(-r * 0.8, -r * 0.3); ctx.lineTo(-r * 0.6, -r * 0.34); ctx.lineTo(-r * 0.7, -r * 0.56); ctx.lineTo(-r * 0.44, -r * 0.5);
    ctx.lineTo(-r * 0.42, -r * 0.72); ctx.lineTo(-r * 0.22, -r * 0.56); ctx.lineTo(0, -r * 0.68); ctx.lineTo(r * 0.22, -r * 0.56); ctx.lineTo(r * 0.42, -r * 0.72);
    ctx.lineTo(r * 0.44, -r * 0.5); ctx.lineTo(r * 0.7, -r * 0.56); ctx.lineTo(r * 0.6, -r * 0.34); ctx.lineTo(r * 0.8, -r * 0.3); ctx.lineTo(r * 0.64, -r * 0.08);
    ctx.lineTo(r * 0.5, r * 0.2); ctx.lineTo(r * 0.38, r * 0.16); ctx.lineTo(r * 0.24, r * 0.46);
    ctx.lineTo(-r * 0.24, r * 0.46); ctx.lineTo(-r * 0.38, r * 0.16); ctx.lineTo(-r * 0.5, r * 0.2);
    ctx.closePath();
  }, fur, r * 0.8);
  // fur strokes
  ctx.strokeStyle = fur.shade; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (const side of [-1, 1]) { ctx.moveTo(side * r * 0.5, -r * 0.3); ctx.lineTo(side * r * 0.36, -r * 0.12); ctx.moveTo(side * r * 0.42, r * 0.02); ctx.lineTo(side * r * 0.3, r * 0.2); }
  ctx.stroke();
  // wedge skull, head slung low
  const hy = burst ? r * 0.06 : 0;
  ctx.save(); ctx.translate(0, hy);
  // swept-back horn ears
  for (const side of [-1, 1]) {
    sxcHorn(ctx, side * r * 0.22, -r * 0.1, side * r * 0.6, -r * 0.62, r * 0.08, side * r * 0.08);
    sxcFill(ctx, sxcC('#4e3e80', f), '#05020a', Math.max(1, r * 0.045));
    sxcHorn(ctx, side * r * 0.26, -r * 0.14, side * r * 0.54, -r * 0.54, r * 0.03, side * r * 0.06);
    ctx.fillStyle = sxcC('#8a70c8', f); ctx.fill();
  }
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 0.14); ctx.lineTo(0, -r * 0.2); ctx.lineTo(r * 0.34, -r * 0.14);
    ctx.lineTo(r * 0.3, r * 0.1); ctx.lineTo(r * 0.16, r * 0.48); ctx.lineTo(0, r * 0.58);
    ctx.lineTo(-r * 0.16, r * 0.48); ctx.lineTo(-r * 0.3, r * 0.1); ctx.closePath();
  }, fur, r * 0.45);
  // lit brow plate + muzzle ridge
  ctx.fillStyle = sxcC('#4e3e80', f);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.13); ctx.lineTo(0, -r * 0.18); ctx.lineTo(r * 0.3, -r * 0.13); ctx.lineTo(r * 0.12, r * 0.0); ctx.lineTo(0, r * 0.3); ctx.lineTo(-r * 0.12, r * 0.0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = sxcC('#8a78c0', f); ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.16); ctx.lineTo(0, r * 0.3); ctx.stroke();
  // amethyst brow shard
  sxcShard(ctx, 0, -r * 0.12, r * 0.05, r * 0.16, 0, '#ffffff', sxcC('#b07aff', f), sxcC('#3a1e78', f), null);
  // jaw opens on the lunge
  const open = (burst ? 0.12 : wind ? 0.08 : 0.03) * r;
  ctx.fillStyle = '#05020a';
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.36); ctx.lineTo(r * 0.15, r * 0.36); ctx.lineTo(r * 0.08, r * 0.5 + open); ctx.lineTo(-r * 0.08, r * 0.5 + open); ctx.closePath(); ctx.fill();
  if (open > r * 0.05) drawGlow(ctx, 0, r * 0.44, r * 0.18, '#b48cff', 0.6);
  sxcFangs(ctx, -r * 0.14, r * 0.14, r * 0.36, 4, r * 0.09, bone, true);
  sxcEyes(ctx, 0, r * 0.06, r * 0.1, r * 0.15, '#d4b0ff', crBlink(m, t), wind ? 1 : 0.4, '#05020a', 0.7);
  ctx.restore();
}

// Wisp — soul-fire skull: a horned skull wreathed in licking violet-cyan
// ghostfire; the jaw drops and the fire roars when it gathers itself.
function sxcWisp(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase, wind = ph === 'windup';
  const flare = wind ? 1.18 : 1;
  const bob = Math.sin(t * 3 + m.seed) * r * 0.06;
  ctx.translate(0, bob);
  drawGlow(ctx, 0, -r * 0.1, r * 1.5, '#7a5aff', 0.45);
  ctx.globalAlpha = A * 0.7;
  sxcFlame(ctx, r * 0.78 * flare, r * 1.05 * flare, t, m.seed, 10); ctx.fillStyle = sxcC('#3a2490', f); ctx.fill();
  ctx.globalAlpha = A * 0.85;
  sxcFlame(ctx, r * 0.6 * flare, r * 0.88 * flare, t * 1.3, m.seed + 2, 8); ctx.fillStyle = sxcC('#7a5ae8', f); ctx.fill();
  ctx.globalAlpha = A;
  sxcFlame(ctx, r * 0.4, r * 0.62 * flare, t * 1.6, m.seed + 4, 8); ctx.fillStyle = sxcC('#9ff0ff', f); ctx.fill();
  // horned skull
  const bone = sxcMat(SXC_BONE, f);
  for (const side of [-1, 1]) {
    sxcHorn(ctx, side * r * 0.24, -r * 0.08, side * r * 0.52, -r * 0.5, r * 0.06, side * r * 0.1);
    sxcFill(ctx, bone.primary, '#0a0418', Math.max(1, r * 0.04));
  }
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.12);
    ctx.bezierCurveTo(-r * 0.4, -r * 0.18, -r * 0.24, -r * 0.36, 0, -r * 0.36);
    ctx.bezierCurveTo(r * 0.24, -r * 0.36, r * 0.4, -r * 0.18, r * 0.3, r * 0.12);
    ctx.lineTo(r * 0.2, r * 0.2); ctx.lineTo(r * 0.16, r * 0.3); ctx.lineTo(-r * 0.16, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.2);
    ctx.closePath();
  }, bone, r * 0.4);
  // cracks
  ctx.strokeStyle = bone.shade; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.36); ctx.lineTo(r * 0.1, -r * 0.24); ctx.lineTo(r * 0.04, -r * 0.16); ctx.stroke();
  // burning sockets
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#06020e';
    ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.02); ctx.lineTo(side * r * 0.24, -r * 0.12); ctx.lineTo(side * r * 0.22, r * 0.06); ctx.lineTo(side * r * 0.08, r * 0.08); ctx.closePath(); ctx.fill();
    drawGlow(ctx, side * r * 0.15, -r * 0.01, r * (0.16 + (wind ? 0.08 : 0)), '#9ff0ff', 0.95);
  }
  ctx.fillStyle = '#06020e';
  ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(-r * 0.04, r * 0.18); ctx.lineTo(r * 0.04, r * 0.18); ctx.closePath(); ctx.fill();
  // jaw drops when it gathers
  const jaw = (wind ? 0.12 : 0.02 + Math.max(0, Math.sin(t * 4 + m.seed)) * 0.03) * r;
  ctx.fillStyle = '#06020e'; ctx.fillRect(-r * 0.15, r * 0.26, r * 0.3, jaw + r * 0.04);
  sxcFangs(ctx, -r * 0.15, r * 0.15, r * 0.26, 5, r * 0.06, bone.light, true);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.17, r * 0.3 + jaw); ctx.lineTo(r * 0.17, r * 0.3 + jaw); ctx.lineTo(r * 0.12, r * 0.42 + jaw); ctx.lineTo(-r * 0.12, r * 0.42 + jaw); ctx.closePath(); }, bone, r * 0.2);
  sxcFangs(ctx, -r * 0.13, r * 0.13, r * 0.3 + jaw, 4, r * 0.05, bone.light, false);
  // embers rising
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.8 + i / 3 + m.seed) % 1;
    drawGlow(ctx, Math.sin(i * 2.3 + t * 2) * r * 0.4, -r * (0.5 + p * 0.9), r * 0.08 * (1 - p), '#9ff0ff', 0.9);
  }
}

// Raven — carrion raven of the abyss: ragged blade-feathered wings, a long
// hooked beak, a spiked crest and burning red eyes; folds into a dive.
function sxcRaven(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 24 : 12) + m.seed);
  const fe = sxcMat(SXC_FEATHER, f);
  const edge = sxcC('#8a6ad0', f), quill = sxcC('#14101e', f);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.22, -r * 0.18);
    ctx.rotate(fast ? -0.85 : -0.05 + flap * 0.5);
    if (fast) ctx.scale(0.7, 1);
    // primaries: long ragged blades hanging off the wing arm
    for (let i = 5; i >= 0; i--) {
      const u = i / 5, bx = r * (0.18 + u * 1.05), by = -r * (0.1 + Math.sin(u * 3) * 0.12);
      const len = r * (0.45 + u * 0.4), ang = 1.15 - u * 0.75;
      sxcHorn(ctx, bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, r * 0.075, -r * 0.03);
      ctx.fillStyle = i % 2 ? quill : fe.shade; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, r * 0.03); ctx.stroke();
    }
    // coverts + wing arm
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(0, r * 0.15);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.42, r * 1.3, -r * 0.2);
      ctx.lineTo(r * 1.0, -r * 0.05); ctx.lineTo(r * 0.82, r * 0.12); ctx.lineTo(r * 0.6, r * 0.08); ctx.lineTo(r * 0.42, r * 0.24); ctx.lineTo(r * 0.24, r * 0.2);
      ctx.closePath();
    }, fe, r * 0.6);
    // bony wing claw
    sxcHorn(ctx, r * 1.25, -r * 0.22, r * 1.42, -r * 0.42, r * 0.04, r * 0.04); ctx.fillStyle = sxcC('#d8ccb8', f); ctx.fill();
    ctx.restore();
  }
  // tail fan
  for (let i = -2; i <= 2; i++) {
    sxcHorn(ctx, i * r * 0.05, r * 0.45, i * r * 0.16, r * (1.0 - Math.abs(i) * 0.06), r * 0.06, 0);
    ctx.fillStyle = i % 2 ? quill : fe.shade; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
  }
  // talons
  for (const side of [-1, 1]) {
    ctx.strokeStyle = sxcC('#3a3040', f); ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.4); ctx.lineTo(side * r * 0.16, r * 0.62); ctx.stroke();
    ctx.fillStyle = sxcC('#d8ccb8', f);
    for (const k of [-1, 0, 1]) { sxcHorn(ctx, side * r * 0.16 + k * r * 0.04, r * 0.6, side * r * 0.16 + k * r * 0.09, r * 0.74, r * 0.025, k * r * 0.02); ctx.fill(); }
  }
  // body
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.42); ctx.bezierCurveTo(r * 0.42, -r * 0.35, r * 0.4, r * 0.3, 0, r * 0.55); ctx.bezierCurveTo(-r * 0.4, r * 0.3, -r * 0.42, -r * 0.35, 0, -r * 0.42); ctx.closePath(); }, fe, r * 0.55);
  ctx.strokeStyle = fe.shade; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) { const y = -r * 0.08 + k * r * 0.16; ctx.moveTo(-r * 0.2, y); ctx.lineTo(0, y + r * 0.08); ctx.lineTo(r * 0.2, y); }
  ctx.stroke();
  // crest spikes
  for (let k = -1; k <= 1; k++) { sxcHorn(ctx, k * r * 0.08, -r * 0.6, k * r * 0.2, -r * (0.95 - Math.abs(k) * 0.12), r * 0.05, k * r * 0.04); ctx.fillStyle = fe.primary; ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.52); ctx.lineTo(0, -r * 0.7); ctx.lineTo(r * 0.26, -r * 0.52); ctx.lineTo(r * 0.2, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.3); ctx.closePath(); }, fe, r * 0.35);
  // hooked beak
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.42); ctx.lineTo(r * 0.1, -r * 0.42); ctx.quadraticCurveTo(r * 0.08, -r * 0.1, -r * 0.01, r * 0.02); ctx.quadraticCurveTo(-r * 0.02, -r * 0.12, -r * 0.1, -r * 0.42); ctx.closePath();
  sxcFill(ctx, sxcC('#5a5260', f), '#05030a', Math.max(1, r * 0.03));
  ctx.strokeStyle = sxcC('#a8a0b0', f); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.02, -r * 0.4); ctx.lineTo(r * 0.02, -r * 0.08); ctx.stroke();
  sxcEyes(ctx, 0, -r * 0.48, r * 0.08, r * 0.14, '#ff2a4a', crBlink(m, t), 1, null, 0.8);
}

// Lantern Witch — gaunt hooded hag: tattered layered robes, a hood crowned
// with crooked antler twigs and a shadowed face with burning eyes, a bony
// claw that weaves a hex rune, and a gnarled staff hanging a ghost-lantern.
function sxcWitch(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const robe = sxcMat(SXC_ROBE, f), glow = '#7affc8';
  const ch = m.windup;
  const sway = Math.sin(m.anim * 1.6) * r * 0.03;
  // back cloak, tattered
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.55);
  ctx.quadraticCurveTo(-r * 0.75, r * 0.1, -r * 0.72, r * 0.85);
  for (let i = 0; i <= 6; i++) { const x = -r * 0.72 + i * r * 0.24; ctx.lineTo(x + r * 0.12, r * (0.7 + (i % 2) * 0.1) + Math.sin(t * 4 + i) * r * 0.03); ctx.lineTo(x + r * 0.24, r * (0.92 + ((i + 1) % 2) * 0.06)); }
  ctx.quadraticCurveTo(r * 0.75, r * 0.1, r * 0.3, -r * 0.55); ctx.closePath();
  sxcFill(ctx, robe.shade, robe.dark, Math.max(1.2, r * 0.05));
  // front robe
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.42); ctx.lineTo(r * 0.32, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.5, r * 0.2, r * 0.52, r * 0.8);
    for (let i = 5; i >= 0; i--) ctx.lineTo(-r * 0.52 + (i / 5) * r * 1.04 + sway, r * (0.86 + (i % 2) * 0.12) + Math.sin(t * 4 + i) * r * 0.03);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.2, -r * 0.32, -r * 0.42); ctx.closePath();
  }, robe, r * 0.8);
  // fold lines + belt of charms
  ctx.strokeStyle = robe.dark; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.05); ctx.lineTo(-r * 0.2, r * 0.82); ctx.moveTo(r * 0.14, r * 0.05); ctx.lineTo(r * 0.24, r * 0.84); ctx.stroke();
  ctx.fillStyle = sxcC('#2a1a10', f); ctx.fillRect(-r * 0.36, -r * 0.02, r * 0.72, r * 0.08);
  for (const x of [-0.2, 0.05, 0.22]) { ctx.fillStyle = sxcC('#d8ccb0', f); ctx.beginPath(); ctx.moveTo(x * r - r * 0.03, r * 0.06); ctx.lineTo(x * r, r * 0.18); ctx.lineTo(x * r + r * 0.03, r * 0.06); ctx.fill(); }
  // gnarled staff + swinging lantern
  const raise = ch * r * 0.2;
  ctx.strokeStyle = sxcC('#2a1a10', f); ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.88); ctx.quadraticCurveTo(r * 0.4, 0, r * 0.52, -r * 0.7 - raise); ctx.quadraticCurveTo(r * 0.6, -r * 0.92 - raise, r * 0.8, -r * 0.8 - raise); ctx.stroke();
  ctx.strokeStyle = sxcC('#5a3a20', f); ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(r * 0.47, r * 0.6); ctx.quadraticCurveTo(r * 0.38, 0, r * 0.5, -r * 0.68 - raise); ctx.stroke();
  const sw = Math.sin(t * 3 + m.seed) * 0.4;
  const lx = r * 0.8 + Math.sin(sw) * r * 0.18, ly = -r * 0.52 - raise + Math.cos(sw) * r * 0.04;
  ctx.strokeStyle = '#0a0606'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.8 - raise); ctx.lineTo(lx, ly - r * 0.16); ctx.stroke();
  drawGlow(ctx, lx, ly, r * (0.4 + ch * 0.35), glow, 0.75);
  ctx.fillStyle = sxcC('#1a120c', f);
  ctx.beginPath(); ctx.moveTo(lx - r * 0.08, ly - r * 0.16); ctx.lineTo(lx + r * 0.08, ly - r * 0.16); ctx.lineTo(lx + r * 0.11, ly + r * 0.1); ctx.lineTo(lx, ly + r * 0.18); ctx.lineTo(lx - r * 0.11, ly + r * 0.1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(lx, ly - r * 0.1); ctx.lineTo(lx + r * 0.06, ly + r * 0.06); ctx.lineTo(lx, ly + r * 0.1); ctx.lineTo(lx - r * 0.06, ly + r * 0.06); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - r * 0.015, ly - r * 0.02, r * 0.03, r * 0.08);
  // hex claw reaching out (left)
  const hx = -r * 0.55, hy = -r * 0.08 - ch * r * 0.15;
  ctx.strokeStyle = robe.primary; ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath(); ctx.moveTo(-r * 0.28, -r * 0.32); ctx.quadraticCurveTo(-r * 0.5, -r * 0.3, hx, hy); ctx.stroke();
  ctx.strokeStyle = sxcC('#a8b0a0', f); ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) { ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx - r * 0.1, hy + k * r * 0.05, hx - r * 0.12 + Math.abs(k) * r * 0.02, hy + r * 0.1 + k * r * 0.04); }
  ctx.stroke();
  if (ch > 0.05) {
    ctx.save(); ctx.translate(hx - r * 0.06, hy + r * 0.04); ctx.rotate(t * 3);
    ctx.globalAlpha = A * ch; ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, SXC_TAU);
    for (let k = 0; k < 5; k++) { const a = k * SXC_TAU * 2 / 5; if (k) ctx.lineTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); else ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); }
    ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.globalAlpha = A;
    drawGlow(ctx, hx - r * 0.06, hy + r * 0.04, r * 0.3 * ch, glow, 0.8);
  }
  // antler twigs crowning the hood
  ctx.strokeStyle = sxcC('#2a1a14', f); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.lineWidth = Math.max(1.4, r * 0.05);
    ctx.beginPath(); ctx.moveTo(side * r * 0.14, -r * 0.82); ctx.lineTo(side * r * 0.3, -r * 1.08); ctx.lineTo(side * r * 0.28, -r * 1.25);
    ctx.moveTo(side * r * 0.27, -r * 1.03); ctx.lineTo(side * r * 0.44, -r * 1.12); ctx.stroke();
  }
  // deep pointed hood
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.36, -r * 0.34);
    ctx.quadraticCurveTo(-r * 0.36, -r * 0.82, -r * 0.04, -r * 0.98);
    ctx.quadraticCurveTo(r * 0.08, -r * 1.06, r * 0.1, -r * 1.18);
    ctx.quadraticCurveTo(r * 0.22, -r * 0.98, r * 0.3, -r * 0.84);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.62, r * 0.36, -r * 0.34);
    ctx.quadraticCurveTo(0, -r * 0.22, -r * 0.36, -r * 0.34); ctx.closePath();
  }, robe, r * 0.5);
  // shadowed face: void, burning eyes, crooked nose and a pale chin
  ctx.fillStyle = '#030106';
  ctx.beginPath(); ctx.moveTo(-r * 0.22, -r * 0.36); ctx.quadraticCurveTo(-r * 0.24, -r * 0.76, 0, -r * 0.78); ctx.quadraticCurveTo(r * 0.24, -r * 0.76, r * 0.22, -r * 0.36); ctx.quadraticCurveTo(0, -r * 0.3, -r * 0.22, -r * 0.36); ctx.fill();
  ctx.fillStyle = sxcC('#6a7a6a', f);
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.42); ctx.quadraticCurveTo(0, -r * 0.32, r * 0.1, -r * 0.42); ctx.lineTo(0, -r * 0.34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.01, -r * 0.6); ctx.lineTo(r * 0.12, -r * 0.44); ctx.lineTo(r * 0.02, -r * 0.48); ctx.closePath(); ctx.fill();
  sxcEyes(ctx, 0, -r * 0.58, r * 0.065, r * 0.1, glow, crBlink(m, t), 1, null, 0.8 + ch * 0.2);
}

// Bramble Beast — hulking thorn golem: a knotted mass of black briar and
// bark bristling with bone-pale thorns, amethyst shards erupting from its
// shoulders and a horned stag-skull for a face; whips a thorn vine overhead
// before the slam.
function sxcBramble(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.06);
  const bark = sxcMat(SXC_BARK, f), bone = sxcMat(SXC_BONE, f);
  const thorn = sxcC('#d8c8b0', f), vineC = sxcC('#4a3646', f);
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  const rage = ph === 'windup' ? 1 : m.windup;
  // root legs
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? step * r * 0.12 : 0;
    crShade(ctx, () => sxcTaper(ctx, side * r * 0.36, r * 0.3, side * r * 0.46, r * 0.86 - lift, r * 0.2, r * 0.16), bark, r * 0.4);
    ctx.fillStyle = bark.shade;
    for (const k of [-1, 0, 1]) { sxcHorn(ctx, side * r * 0.46 + k * r * 0.1, r * 0.84 - lift, side * r * 0.46 + k * r * 0.2, r * 0.96 - lift, r * 0.05, 0); ctx.fill(); }
  }
  // thorn whip arm (raised for the slam)
  ctx.save(); ctx.translate(r * 0.62, -r * 0.2); ctx.rotate(-0.4 - raise * 2.4);
  ctx.strokeStyle = vineC; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.32, r * 0.55, r * 0.02, r * 1.15); ctx.stroke();
  ctx.strokeStyle = bark.light; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.03, r * 0.05); ctx.quadraticCurveTo(r * 0.25, r * 0.55, -r * 0.02, r * 1.1); ctx.stroke();
  ctx.fillStyle = thorn;
  for (let i = 1; i < 6; i++) { const y = i * r * 0.2, x = Math.sin(i * 0.9) * r * 0.16 + r * 0.06; const sd = i % 2 ? 1 : -1; sxcHorn(ctx, x, y, x + sd * r * 0.16, y - r * 0.08, r * 0.035, 0); ctx.fill(); }
  ctx.restore();
  // knotted briar body
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.18); ctx.lineTo(-r * 0.74, -r * 0.52); ctx.lineTo(-r * 0.52, -r * 0.6); ctx.lineTo(-r * 0.36, -r * 0.74);
    ctx.lineTo(-r * 0.1, -r * 0.62); ctx.lineTo(r * 0.14, -r * 0.7); ctx.lineTo(r * 0.4, -r * 0.74); ctx.lineTo(r * 0.62, -r * 0.58); ctx.lineTo(r * 0.82, -r * 0.46);
    ctx.lineTo(r * 0.88, -r * 0.1); ctx.lineTo(r * 0.74, r * 0.22); ctx.lineTo(r * 0.5, r * 0.44); ctx.lineTo(r * 0.2, r * 0.5);
    ctx.lineTo(-r * 0.24, r * 0.52); ctx.lineTo(-r * 0.56, r * 0.4); ctx.lineTo(-r * 0.78, r * 0.18); ctx.closePath();
  }, bark, r);
  // twisted vine texture
  ctx.strokeStyle = bark.shade; ctx.lineWidth = Math.max(1.2, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.2); ctx.bezierCurveTo(-r * 0.3, -r * 0.5, r * 0.1, r * 0.2, r * 0.6, -r * 0.3);
  ctx.moveTo(-r * 0.6, r * 0.3); ctx.bezierCurveTo(-r * 0.2, r * 0.05, r * 0.3, r * 0.5, r * 0.7, r * 0.15);
  ctx.moveTo(-r * 0.2, -r * 0.6); ctx.bezierCurveTo(-r * 0.4, -r * 0.1, -r * 0.1, r * 0.3, -r * 0.3, r * 0.55);
  ctx.stroke();
  ctx.strokeStyle = bark.light; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); ctx.moveTo(-r * 0.68, -r * 0.24); ctx.bezierCurveTo(-r * 0.3, -r * 0.54, r * 0.1, r * 0.16, r * 0.58, -r * 0.34); ctx.stroke();
  // thorns jutting out of the silhouette
  ctx.fillStyle = thorn;
  for (let i = 0; i < 11; i++) {
    const a = i * 0.57 + 0.4, x = Math.cos(a) * r * 0.74, y = Math.sin(a) * r * 0.6 - r * 0.05;
    if (y > r * 0.35) continue;
    sxcHorn(ctx, x, y, x + Math.cos(a + 0.3) * r * 0.26, y + Math.sin(a + 0.3) * r * 0.26, r * 0.04, r * 0.03); ctx.fill();
  }
  // amethyst shards erupting from the shoulders
  for (const [x, y, w, h, a] of [[-0.62, -0.45, 0.1, 0.42, -0.6], [-0.4, -0.62, 0.08, 0.32, -0.2], [0.5, -0.56, 0.09, 0.36, 0.5]]) {
    sxcShard(ctx, x * r, y * r, w * r, h * r, a, sxcC('#f4e4ff', f), sxcC('#a070f0', f), sxcC('#3a1e78', f), '#0a0418');
  }
  drawGlow(ctx, -r * 0.5, -r * 0.7, r * 0.4, '#c86aff', 0.35);
  // heavy left claw arm hanging
  crShade(ctx, () => sxcTaper(ctx, -r * 0.62, -r * 0.1, -r * 0.8, r * 0.5, r * 0.15, r * 0.11), bark, r * 0.4);
  ctx.fillStyle = thorn;
  for (const k of [-1, 0, 1]) { sxcHorn(ctx, -r * 0.8 + k * r * 0.07, r * 0.52, -r * 0.82 + k * r * 0.12, r * 0.72, r * 0.035, -k * r * 0.03); ctx.fill(); }
  // stag-skull face
  for (const side of [-1, 1]) {
    ctx.strokeStyle = bone.primary; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath(); ctx.moveTo(side * r * 0.16, -r * 0.42); ctx.quadraticCurveTo(side * r * 0.36, -r * 0.62, side * r * 0.32, -r * 0.88);
    ctx.moveTo(side * r * 0.3, -r * 0.62); ctx.lineTo(side * r * 0.48, -r * 0.7); ctx.stroke();
  }
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.28, -r * 0.42); ctx.lineTo(r * 0.28, -r * 0.42);
    ctx.lineTo(r * 0.24, -r * 0.16); ctx.lineTo(r * 0.12, r * 0.12); ctx.lineTo(0, r * 0.18); ctx.lineTo(-r * 0.12, r * 0.12); ctx.lineTo(-r * 0.24, -r * 0.16); ctx.closePath();
  }, bone, r * 0.35);
  ctx.strokeStyle = bone.shade; ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.42); ctx.lineTo(r * 0.02, -r * 0.32); ctx.lineTo(-r * 0.03, -r * 0.24); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#05020a';
    ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.28); ctx.lineTo(side * r * 0.22, -r * 0.34); ctx.lineTo(side * r * 0.18, -r * 0.16); ctx.lineTo(side * r * 0.06, -r * 0.18); ctx.closePath(); ctx.fill();
    drawGlow(ctx, side * r * 0.13, -r * 0.25, r * (0.12 + rage * 0.08), '#d08aff', 0.95);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * r * 0.13, -r * 0.25, Math.max(0.8, r * 0.025), 0, SXC_TAU); ctx.fill();
  }
  ctx.fillStyle = '#05020a';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.04, r * 0.04, r * 0.022, r * 0.04, side * 0.3, 0, SXC_TAU); ctx.fill(); }
}

// Nocturne — the Shadow Stag boss: a towering spectral stag with a cracked
// bone mask, colossal crystal-tipped antlers veined with light, a tattered
// shadow mane and orbiting amethyst shards; the mask cracks blaze before a
// volley and burn red when enraged.
function sxcShadowStag(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a6a' : '#c89aff';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const fur = sxcMat(SXC_SHADOW, f), bone = sxcMat(SXC_BONE, f);
  const antC = sxcC('#1a1226', f), antL = sxcC('#4a3a68', f);
  const breathe = Math.sin(t * 1.4) * r * 0.02;
  // orbiting shards (behind)
  for (let i = 0; i < 6; i++) {
    const a = t * 0.7 + i * SXC_TAU / 6, z = Math.sin(a);
    if (z > 0) continue;
    sxcShard(ctx, Math.cos(a) * r * 1.15, -r * 0.2 + z * r * 0.35, r * 0.05, r * 0.14, a, '#f4e4ff', rage ? '#c83a5a' : '#9a6af0', '#2a1458', null);
  }
  // tattered shadow mane
  ctx.fillStyle = sxcC('#0e0a1e', f);
  ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.1);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, a = Math.PI + u * Math.PI, wob = Math.sin(t * 3 + i * 1.3) * r * 0.06;
    ctx.lineTo(Math.cos(a) * r * (0.95 + (i % 2) * 0.2) + wob, -r * 0.05 + Math.sin(a) * r * (0.75 + (i % 2) * 0.18));
    ctx.lineTo(Math.cos(a + 0.2) * r * 0.75, -r * 0.05 + Math.sin(a + 0.2) * r * 0.6);
  }
  ctx.lineTo(r * 0.8, r * 0.1); ctx.closePath(); ctx.fill();
  // antlers
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    const beam = [[0.22, -0.48], [0.5, -0.72], [0.62, -1.05], [0.92, -1.42]];
    const tines = [[1, 0.3, -1.08, 0.055], [2, 0.98, -1.12, 0.05], [2, 0.45, -1.42, 0.045], [3, 1.2, -1.5, 0.04], [3, 0.82, -1.7, 0.04]];
    for (const pass of [0, 1, 2]) {
      ctx.strokeStyle = pass === 0 ? '#05020a' : pass === 1 ? antC : antL;
      for (let i = 0; i < 3; i++) {
        const w = r * (0.13 - i * 0.03);
        ctx.lineWidth = pass === 0 ? w + 3 : pass === 1 ? w : w * 0.25;
        ctx.beginPath(); ctx.moveTo(beam[i][0] * r - (pass === 2 ? w * 0.25 : 0), beam[i][1] * r); ctx.lineTo(beam[i + 1][0] * r - (pass === 2 ? w * 0.25 : 0), beam[i + 1][1] * r); ctx.stroke();
      }
      for (const [bi, x, y, w] of tines) {
        ctx.lineWidth = pass === 0 ? w * r + 3 : pass === 1 ? w * r : w * r * 0.25;
        ctx.beginPath(); ctx.moveTo(beam[bi][0] * r, beam[bi][1] * r); ctx.lineTo(x * r, y * r); ctx.stroke();
      }
    }
    // glowing veins
    ctx.globalAlpha = A * (0.55 + heave * 0.45); ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1, r * 0.018);
    ctx.beginPath(); ctx.moveTo(beam[0][0] * r, beam[0][1] * r);
    for (let i = 1; i < 4; i++) ctx.lineTo(beam[i][0] * r + r * 0.02, beam[i][1] * r);
    ctx.stroke(); ctx.globalAlpha = A;
    // crystal tips
    for (const [bi, x, y] of tines) sxcShard(ctx, x * r, y * r, r * 0.045, r * 0.13, Math.atan2(y - beam[bi][1], x - beam[bi][0]) + Math.PI / 2, '#ffffff', rage ? '#ff6a8a' : '#c8a0ff', rage ? '#7a1a3a' : '#4a2a8a', null);
    sxcShard(ctx, 0.92 * r, -1.42 * r, r * 0.05, r * 0.16, 0.6, '#ffffff', rage ? '#ff6a8a' : '#c8a0ff', rage ? '#7a1a3a' : '#4a2a8a', null);
    drawGlow(ctx, 0.92 * r, -1.5 * r, r * 0.22, glow, 0.6);
    ctx.restore();
  }
  // chest + neck
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.78, r * 0.25);
    ctx.quadraticCurveTo(-r * 0.7, -r * 0.2, -r * 0.35, -r * 0.3);
    ctx.lineTo(r * 0.35, -r * 0.3); ctx.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.78, r * 0.25);
    ctx.lineTo(r * 0.6, r * 0.95); ctx.lineTo(r * 0.3, r * 0.82); ctx.lineTo(0, r * 1.0 + breathe); ctx.lineTo(-r * 0.3, r * 0.82); ctx.lineTo(-r * 0.6, r * 0.95);
    ctx.closePath();
  }, fur, r);
  // chest fur strokes
  ctx.strokeStyle = fur.shade; ctx.lineWidth = Math.max(1.2, r * 0.025);
  ctx.beginPath();
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { const y = r * (0.35 + k * 0.18); ctx.moveTo(side * r * (0.55 - k * 0.08), y); ctx.lineTo(side * r * (0.25 - k * 0.05), y + r * 0.12); }
  ctx.stroke();
  // long ears
  for (const side of [-1, 1]) {
    sxcHorn(ctx, side * r * 0.3, -r * 0.32, side * r * 0.82, -r * 0.42 + Math.sin(t * 2 + side) * r * 0.03, r * 0.1, -r * 0.06);
    sxcFill(ctx, fur.primary, '#05020a', Math.max(1.5, r * 0.025));
    sxcHorn(ctx, side * r * 0.36, -r * 0.33, side * r * 0.72, -r * 0.41, r * 0.04, -r * 0.03);
    ctx.fillStyle = sxcC('#4a2a5a', f); ctx.fill();
  }
  // head
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.44); ctx.quadraticCurveTo(0, -r * 0.6, r * 0.4, -r * 0.44);
    ctx.lineTo(r * 0.36, -r * 0.05); ctx.lineTo(r * 0.2, r * 0.5); ctx.quadraticCurveTo(0, r * 0.66, -r * 0.2, r * 0.5); ctx.lineTo(-r * 0.36, -r * 0.05); ctx.closePath();
  }, fur, r * 0.6);
  // bone mask
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 0.42); ctx.quadraticCurveTo(0, -r * 0.54, r * 0.34, -r * 0.42);
    ctx.lineTo(r * 0.3, -r * 0.08); ctx.lineTo(r * 0.14, r * 0.04); ctx.lineTo(r * 0.12, r * 0.4); ctx.lineTo(0, r * 0.5); ctx.lineTo(-r * 0.12, r * 0.4); ctx.lineTo(-r * 0.14, r * 0.04); ctx.lineTo(-r * 0.3, -r * 0.08); ctx.closePath();
  }, bone, r * 0.5);
  // glowing cracks + forehead rune
  ctx.globalAlpha = A * (0.6 + heave * 0.4); ctx.strokeStyle = glow; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, -r * 0.3); ctx.moveTo(-r * 0.06, -r * 0.38); ctx.lineTo(r * 0.06, -r * 0.38);
  ctx.moveTo(r * 0.16, -r * 0.46); ctx.lineTo(r * 0.2, -r * 0.32); ctx.lineTo(r * 0.14, -r * 0.24);
  ctx.moveTo(-r * 0.08, r * 0.1); ctx.lineTo(-r * 0.04, r * 0.22); ctx.lineTo(-r * 0.08, r * 0.3);
  ctx.stroke(); ctx.globalAlpha = A;
  drawGlow(ctx, 0, -r * 0.4, r * (0.12 + heave * 0.12), glow, 0.7);
  // eyes in deep sockets
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#05020a';
    ctx.beginPath(); ctx.moveTo(side * r * 0.06, -r * 0.2); ctx.lineTo(side * r * 0.3, -r * 0.3); ctx.lineTo(side * r * 0.26, -r * 0.1); ctx.lineTo(side * r * 0.1, -r * 0.06); ctx.closePath(); ctx.fill();
  }
  sxcEyes(ctx, 0, -r * 0.18, r * 0.08, r * 0.18, glow, 1, 1, null, 0.9 + heave * 0.1);
  for (const side of [-1, 1]) drawGlow(ctx, side * r * 0.18, -r * 0.18, r * (0.14 + heave * 0.16), glow, 0.6 + heave * 0.4);
  // nostrils + breath
  ctx.fillStyle = '#05020a';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.05, r * 0.4, r * 0.025, r * 0.045, side * 0.4, 0, SXC_TAU); ctx.fill(); }
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.58, r * 0.35 * heave, glow, heave);
  // orbiting shards (front)
  for (let i = 0; i < 6; i++) {
    const a = t * 0.7 + i * SXC_TAU / 6, z = Math.sin(a);
    if (z <= 0) continue;
    sxcShard(ctx, Math.cos(a) * r * 1.15, -r * 0.2 + z * r * 0.35, r * 0.06, r * 0.17, a, '#ffffff', rage ? '#ff6a8a' : '#b48cff', rage ? '#7a1a3a' : '#3a1e78', '#05020a');
  }
}

// ================================================== AETHERIAL GARDENS =====

// Star Sprite — a shard of a fallen star turned predator: an eight-pointed
// blade-star of pale gold crystal around an obsidian core with a glaring
// face and a jagged maw; spins into a buzz-saw dash.
function sxcStarSprite(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase, burst = ph === 'burst', wind = ph === 'windup';
  ctx.translate(0, Math.abs(Math.sin(m.anim * 2.4)) * -r * 0.06);
  drawGlow(ctx, 0, 0, r * 1.25, '#ffe8a0', 0.4);
  ctx.save(); ctx.rotate(Math.sin(m.anim * 1.2) * 0.2 + (burst ? t * 18 : 0) + (wind ? Math.sin(t * 40) * 0.08 : 0));
  const lit = sxcC('#fff8d8', f), mid = sxcC('#e0b050', f), dk = sxcC('#6a4210', f);
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, long = i % 2 === 0, L = r * (long ? 1.0 : 0.66), w = r * (long ? 0.17 : 0.13);
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, b = r * 0.3;
    ctx.beginPath(); ctx.moveTo(ca * b + px * w, sa * b + py * w); ctx.lineTo(ca * L, sa * L); ctx.lineTo(ca * b, sa * b); ctx.closePath();
    ctx.fillStyle = lit; ctx.fill();
    ctx.beginPath(); ctx.moveTo(ca * b - px * w, sa * b - py * w); ctx.lineTo(ca * L, sa * L); ctx.lineTo(ca * b, sa * b); ctx.closePath();
    ctx.fillStyle = i < 4 ? mid : dk; ctx.fill();
    ctx.beginPath(); ctx.moveTo(ca * b + px * w, sa * b + py * w); ctx.lineTo(ca * L, sa * L); ctx.lineTo(ca * b - px * w, sa * b - py * w);
    ctx.strokeStyle = '#2a1804'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineJoin = 'miter'; ctx.stroke();
  }
  ctx.restore();
  // obsidian core
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, SXC_TAU); }, sxcMat(SXC_VOID, f), r * 0.42);
  ctx.strokeStyle = sxcC('#ffe8a0', f); ctx.lineWidth = Math.max(1, r * 0.035); ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.33, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); ctx.globalAlpha = A;
  sxcEyes(ctx, 0, -r * 0.08, r * 0.1, r * 0.14, '#ffe070', crBlink(m, t), wind ? 1 : 0.5, null, 0.7);
  // jagged maw
  const open = (wind || burst ? 0.08 : 0.03) * r;
  ctx.fillStyle = '#05030e';
  ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.12); ctx.lineTo(r * 0.18, r * 0.12); ctx.lineTo(r * 0.1, r * 0.2 + open); ctx.lineTo(-r * 0.1, r * 0.2 + open); ctx.closePath(); ctx.fill();
  sxcFangs(ctx, -r * 0.16, r * 0.16, r * 0.12, 5, r * 0.06, '#fff4d0', true);
  if (open > r * 0.05) drawGlow(ctx, 0, r * 0.18, r * 0.14, '#ffe070', 0.7);
}

// Void Bloom — a carnivorous star-lily: blade petals of midnight indigo
// with glowing veins peel back from a toothed maw, a nebula eye glaring in
// its throat; barbed tendrils trail below. Bursts into seed pods.
function sxcBloom(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase;
  const open = ph === 'windup' ? 0.35 : ph === 'burst' ? -0.15 : Math.sin(t * 2 + m.seed) * 0.06;
  const vm = sxcMat(SXC_VOID, f), vein = '#d8a8ff';
  // barbed tendrils
  ctx.strokeStyle = sxcC('#1a1a4a', f); ctx.lineCap = 'round';
  for (const k of [-1, 0, 1]) {
    ctx.lineWidth = r * (k ? 0.07 : 0.09);
    const ex = k * r * 0.5 + Math.sin(t * 2 + k) * r * 0.1, ey = r * (0.95 - Math.abs(k) * 0.1);
    ctx.beginPath(); ctx.moveTo(k * r * 0.15, r * 0.3); ctx.quadraticCurveTo(k * r * 0.5, r * 0.55, ex, ey); ctx.stroke();
    ctx.fillStyle = sxcC('#c8d0ff', f);
    sxcHorn(ctx, (k * r * 0.15 + ex) / 2 + k * r * 0.1, r * 0.62, (k * r * 0.15 + ex) / 2 + k * r * 0.1 + r * 0.1, r * 0.56, r * 0.025, 0); ctx.fill();
  }
  // outer blade petals
  ctx.save(); ctx.rotate(t * 0.15 + m.seed);
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate(i * SXC_TAU / 5);
    const L = r * (0.95 + open * 0.3), W = r * (0.42 + open * 0.08), b = r * 0.12;
    const petal = () => { ctx.beginPath(); ctx.moveTo(0, -b); ctx.quadraticCurveTo(W, -L * 0.45, r * 0.06, -L); ctx.lineTo(0, -L * 0.88); ctx.lineTo(-r * 0.04, -L * 0.97); ctx.quadraticCurveTo(-W, -L * 0.45, 0, -b); ctx.closePath(); };
    crShade(ctx, petal, vm, r * 0.7);
    ctx.globalAlpha = A * 0.8; ctx.strokeStyle = vein; ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.beginPath(); ctx.moveTo(0, -b - r * 0.08); ctx.lineTo(0, -L * 0.82); ctx.moveTo(0, -L * 0.45); ctx.lineTo(W * 0.45, -L * 0.6); ctx.moveTo(0, -L * 0.55); ctx.lineTo(-W * 0.45, -L * 0.7); ctx.stroke();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  // inner petals, offset
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate((i + 0.5) * SXC_TAU / 5);
    const L = r * (0.66 + open * 0.2), W = r * 0.3;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(W, -L * 0.5, 0, -L); ctx.quadraticCurveTo(-W, -L * 0.5, 0, -r * 0.1); ctx.closePath();
    sxcFill(ctx, sxcC('#6a4ac0', f), '#0a0620', Math.max(1, r * 0.035));
    ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(W * 0.6, -L * 0.5, 0, -L); ctx.quadraticCurveTo(W * 0.1, -L * 0.5, 0, -r * 0.1); ctx.closePath();
    ctx.fillStyle = sxcC('#a88af0', f); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // maw: ring of teeth around the throat
  const mr = r * (0.34 + open * 0.08);
  ctx.fillStyle = '#05030e'; ctx.beginPath(); ctx.arc(0, 0, mr, 0, SXC_TAU); ctx.fill();
  drawGlow(ctx, 0, 0, mr * 1.4, '#7a8aff', 0.7);
  ctx.fillStyle = sxcC('#e8e0ff', f); ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * SXC_TAU + t * 0.1, a2 = a + SXC_TAU / 20;
    ctx.moveTo(Math.cos(a - 0.22) * mr, Math.sin(a - 0.22) * mr); ctx.lineTo(Math.cos(a2) * mr * 0.55, Math.sin(a2) * mr * 0.55); ctx.lineTo(Math.cos(a + 0.22) * mr, Math.sin(a + 0.22) * mr);
  }
  ctx.fill();
  // nebula eye
  drawGlow(ctx, 0, 0, mr * 0.7, '#9fe8ff', 0.9);
  ctx.fillStyle = sxcC('#cff4ff', f);
  ctx.beginPath(); ctx.ellipse(0, 0, mr * 0.34, mr * 0.34 * crBlink(m, t), 0, 0, SXC_TAU); ctx.fill();
  ctx.fillStyle = '#05030e';
  ctx.beginPath(); ctx.ellipse(look.x * mr * 0.1, look.y * mr * 0.06, mr * 0.07, mr * 0.28 * crBlink(m, t), 0, 0, SXC_TAU); ctx.fill();
}

// Seed Pod — a spined star-seed: cracked obsidian husk leaking light, two
// blade leaves and a glaring slit; hops on.
function sxcSeedling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const hop = Math.abs(Math.sin(m.anim * 3)) * r * 0.15;
  ctx.translate(0, -hop);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.1, -r * 0.6); ctx.rotate(side * (0.5 + Math.sin(t * 6) * 0.12));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * r * 0.22, -r * 0.3, 0, -r * 0.7); ctx.quadraticCurveTo(-side * r * 0.08, -r * 0.3, 0, 0); ctx.closePath();
    sxcFill(ctx, sxcC('#2a6a8a', f), '#04101a', Math.max(1, r * 0.06));
    ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(side * r * 0.04, -r * 0.55); ctx.stroke();
    ctx.restore();
  }
  // spines
  ctx.fillStyle = sxcC('#c8d0ff', f);
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.12 + Math.PI; sxcHorn(ctx, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.66, Math.cos(a) * r * 0.95, Math.sin(a) * r * 1.0, r * 0.07, 0); ctx.fill(); }
  for (const side of [-1, 1]) { sxcHorn(ctx, side * r * 0.62, r * 0.1, side * r * 0.95, r * 0.25, r * 0.07, 0); ctx.fill(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.75); ctx.bezierCurveTo(r * 0.75, -r * 0.6, r * 0.8, r * 0.55, 0, r * 0.78); ctx.bezierCurveTo(-r * 0.8, r * 0.55, -r * 0.75, -r * 0.6, 0, -r * 0.75); ctx.closePath(); }, sxcMat(SXC_VOID, f), r * 0.8);
  // glowing cracks
  ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.2, -r * 0.25); ctx.lineTo(-r * 0.32, -r * 0.05);
  ctx.moveTo(r * 0.3, r * 0.3); ctx.lineTo(r * 0.12, r * 0.45); ctx.lineTo(r * 0.22, r * 0.62); ctx.stroke();
  sxcEyes(ctx, 0, r * 0.02, r * 0.17, r * 0.24, '#9fe8ff', crBlink(m, t), 1, null, 0.6);
}

// Comet — a burning ice-meteor: jagged rock nucleus split by glowing
// fissures, a fanged crack of a mouth and a long streaming tail of blue
// fire; streaks across in a swoop.
function sxcComet(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const fast = m.action && m.action.phase === 'burst';
  const tail = fast ? 1.45 : 1;
  const ang = Math.atan2(-(m.pvy || 1), -(m.pvx || 0.0001));
  ctx.save(); ctx.rotate(ang - Math.PI / 2);
  // streaming fire tongues
  ctx.globalAlpha = A * 0.55;
  for (let k = 0; k < 3; k++) {
    const L = r * (2.0 + k * 0.5) * tail, w = r * (0.6 - k * 0.15), sw = Math.sin(t * 8 + k * 2) * r * 0.15;
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w * 0.6 + sw, L * 0.5, sw * 1.5, L); ctx.quadraticCurveTo(w * 0.6 + sw, L * 0.5, w, 0); ctx.closePath();
    ctx.fillStyle = k === 0 ? sxcC('#3a5ad8', f) : k === 1 ? sxcC('#7a9aff', f) : sxcC('#c8f0ff', f); ctx.fill();
  }
  ctx.globalAlpha = A;
  for (let i = 0; i < 4; i++) drawGlow(ctx, Math.sin(t * 9 + i) * r * 0.15, r * (0.5 + i * 0.45) * tail, r * (0.6 - i * 0.1), i % 2 ? '#7fd8ff' : '#b8a6ff', 0.4);
  // ice shards at the leading edge
  for (const k of [-1, 0, 1]) sxcShard(ctx, k * r * 0.35, -r * 0.45 + Math.abs(k) * r * 0.15, r * 0.08, r * 0.3, k * 0.6, '#ffffff', sxcC('#a8d8ff', f), sxcC('#3a5a9a', f), '#060c22');
  ctx.restore();
  // rock nucleus
  const ice = sxcMat(SXC_ICE, f);
  crShade(ctx, () => {
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i < n; i++) { const a = i / n * SXC_TAU + 0.3, k = 0.6 + ((i * 5 + 2) % 4) * 0.045; if (i) ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); else ctx.moveTo(Math.cos(a) * r * k, Math.sin(a) * r * k); }
    ctx.closePath();
  }, ice, r * 0.7);
  // facet edges + fissures
  ctx.strokeStyle = ice.shade; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(-r * 0.1, -r * 0.35); ctx.lineTo(r * 0.4, -r * 0.3); ctx.stroke();
  ctx.strokeStyle = '#c8f4ff'; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.05); ctx.lineTo(r * 0.32, r * 0.12); ctx.lineTo(r * 0.36, r * 0.35); ctx.moveTo(-r * 0.5, r * 0.2); ctx.lineTo(-r * 0.3, r * 0.25); ctx.stroke();
  sxcEyes(ctx, 0, -r * 0.1, r * 0.13, r * 0.2, '#c8f4ff', crBlink(m, t), 1, ice.dark, 0.6);
  ctx.fillStyle = '#04081a';
  ctx.beginPath(); ctx.moveTo(-r * 0.22, r * 0.18); ctx.lineTo(-r * 0.08, r * 0.24); ctx.lineTo(0, r * 0.2); ctx.lineTo(r * 0.1, r * 0.26); ctx.lineTo(r * 0.24, r * 0.17); ctx.lineTo(r * 0.12, r * 0.36); ctx.lineTo(-r * 0.12, r * 0.36); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, r * 0.3, r * 0.16, '#9fe8ff', 0.8);
  sxcFangs(ctx, -r * 0.14, r * 0.14, r * 0.22, 4, r * 0.06, '#f0f8ff', true);
}

// Astral Sentinel — a towering star-warden: midnight robe sewn with a
// glowing constellation and edged in gold, spiked marble pauldrons, a tall
// hood framing a blank marble mask split by one vertical burning eye; it
// draws its orbiting star in close before hurling it.
function sxcAstral(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const hover = Math.sin(t * 2.2 + m.seed) * r * 0.06;
  ctx.translate(0, hover);
  const robe = sxcMat(SXC_INDIGO, f), gold = sxcC('#e8c060', f), marble = sxcMat(SXC_MARBLE, f);
  const ch = m.windup, glow = '#ffe8a0';
  const a = t * 2.5 + m.seed, R = r * (0.85 - ch * 0.45);
  const ox = Math.cos(a) * R, oy = -r * 0.1 + Math.sin(a) * R * 0.4;
  const orb = () => { drawGlow(ctx, ox, oy, r * (0.24 + ch * 0.22), '#c8a6ff', 0.9); sxcShard(ctx, ox, oy + r * 0.05, r * 0.06, r * 0.14, t * 3, '#ffffff', '#e8d8ff', '#8a6ad8', null); };
  if (Math.sin(a) < 0) orb();
  // star-dust trailing from the hem
  for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i / 3 + m.seed) % 1; drawGlow(ctx, (i - 1) * r * 0.3, r * (0.85 + p * 0.4), r * 0.1 * (1 - p), '#b6c8ff', 0.8); }
  // robe: flared, tattered hem
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.42); ctx.lineTo(r * 0.32, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.55, r * 0.2, r * 0.62, r * 0.85);
    for (let i = 6; i >= 0; i--) ctx.lineTo(-r * 0.62 + (i / 6) * r * 1.24, r * (0.8 + (i % 2) * 0.16) + Math.sin(t * 3 + i) * r * 0.03);
    ctx.quadraticCurveTo(-r * 0.55, r * 0.2, -r * 0.32, -r * 0.42); ctx.closePath();
  }, robe, r);
  // gold trim: centre panel + hem band
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.2, r * 0.04);
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.3); ctx.lineTo(-r * 0.16, r * 0.82); ctx.moveTo(r * 0.1, -r * 0.3); ctx.lineTo(r * 0.16, r * 0.82); ctx.stroke();
  // constellation
  const stars = [[-0.38, 0.15], [-0.28, 0.45], [-0.42, 0.65], [0.3, 0.1], [0.4, 0.4], [0.28, 0.66]];
  ctx.strokeStyle = 'rgba(200,220,255,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(stars[0][0] * r, stars[0][1] * r); ctx.lineTo(stars[1][0] * r, stars[1][1] * r); ctx.lineTo(stars[2][0] * r, stars[2][1] * r);
  ctx.moveTo(stars[3][0] * r, stars[3][1] * r); ctx.lineTo(stars[4][0] * r, stars[4][1] * r); ctx.lineTo(stars[5][0] * r, stars[5][1] * r); ctx.stroke();
  for (const [x, y] of stars) drawGlow(ctx, x * r, y * r, r * 0.07, '#ffffff', 0.9);
  // rune sigil on the panel
  ctx.strokeStyle = glow; ctx.globalAlpha = A * (0.6 + ch * 0.4); ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(0, r * 0.4); ctx.moveTo(-r * 0.06, r * 0.15); ctx.lineTo(r * 0.06, r * 0.25); ctx.moveTo(r * 0.06, r * 0.15); ctx.lineTo(-r * 0.06, r * 0.25); ctx.stroke(); ctx.globalAlpha = A;
  // spiked marble pauldrons
  for (const side of [-1, 1]) {
    sxcHorn(ctx, side * r * 0.36, -r * 0.5, side * r * 0.62, -r * 0.82, r * 0.06, -side * r * 0.04); sxcFill(ctx, gold, '#2a1804', 1);
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.14, -r * 0.5); ctx.quadraticCurveTo(side * r * 0.5, -r * 0.62, side * r * 0.6, -r * 0.3); ctx.lineTo(side * r * 0.42, -r * 0.22); ctx.lineTo(side * r * 0.2, -r * 0.3); ctx.closePath(); }, marble, r * 0.35);
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(side * r * 0.2, -r * 0.33); ctx.lineTo(side * r * 0.42, -r * 0.25); ctx.lineTo(side * r * 0.58, -r * 0.33); ctx.stroke();
  }
  // tall hood
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.4); ctx.quadraticCurveTo(-r * 0.3, -r * 0.85, 0, -r * 1.1); ctx.quadraticCurveTo(r * 0.3, -r * 0.85, r * 0.26, -r * 0.4); ctx.quadraticCurveTo(0, -r * 0.32, -r * 0.26, -r * 0.4); ctx.closePath(); }, robe, r * 0.45);
  ctx.fillStyle = '#02020a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.17, r * 0.24, 0, 0, SXC_TAU); ctx.fill();
  // marble mask with a single vertical eye
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.13, -r * 0.76); ctx.quadraticCurveTo(0, -r * 0.84, r * 0.13, -r * 0.76); ctx.lineTo(r * 0.11, -r * 0.52); ctx.lineTo(0, -r * 0.42); ctx.lineTo(-r * 0.11, -r * 0.52); ctx.closePath(); }, marble, r * 0.2);
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, r * 0.025); ctx.beginPath(); ctx.moveTo(-r * 0.13, -r * 0.74); ctx.quadraticCurveTo(0, -r * 0.82, r * 0.13, -r * 0.74); ctx.stroke();
  drawGlow(ctx, 0, -r * 0.62, r * (0.18 + ch * 0.12), glow, 0.9);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.025, r * 0.09 * crBlink(m, t), 0, 0, SXC_TAU); ctx.fill();
  // casting claw beneath the orb
  ctx.strokeStyle = robe.primary; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.38, -r * 0.2); ctx.quadraticCurveTo(r * 0.55, r * 0.0, r * 0.5 - ch * r * 0.1, r * 0.15 - ch * r * 0.2); ctx.stroke();
  ctx.strokeStyle = marble.light; ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); for (const k of [-1, 0, 1]) { ctx.moveTo(r * 0.5 - ch * r * 0.1, r * 0.15 - ch * r * 0.2); ctx.lineTo(r * 0.5 + k * r * 0.06 - ch * r * 0.1, r * 0.27 - ch * r * 0.2); } ctx.stroke();
  if (Math.sin(a) >= 0) orb();
}

// Moon Golem — a marble colossus of floating, cracked blocks bound with
// gold, a crescent moon burning in its chest and a visor slit for a face;
// lifts its crescent-blade fist for the slam.
function sxcMoonGolem(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.06);
  const stone = sxcMat(SXC_MOONSTONE, f), gold = sxcC('#d8a840', f), crack = sxcC('#1e1c34', f), moon = '#fff2c0', glow = '#cfe8ff';
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  const rage = ph === 'windup' ? 1 : m.windup;
  const block = (pts) => () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r))); ctx.closePath(); };
  // legs
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? step * r * 0.14 : 0;
    ctx.save(); ctx.translate(0, -lift);
    crShade(ctx, block([[side * 0.2, 0.42], [side * 0.56, 0.42], [side * 0.6, 0.88], [side * 0.16, 0.88]]), stone, r * 0.35);
    ctx.fillStyle = gold; ctx.fillRect(Math.min(side * 0.18, side * 0.58) * r, r * 0.56, r * 0.4, r * 0.05);
    ctx.restore();
  }
  // left arm hanging
  crShade(ctx, block([[-0.62, -0.3], [-0.92, -0.2], [-0.95, 0.3], [-0.66, 0.36]]), stone, r * 0.4);
  crShade(ctx, block([[-0.98, 0.36], [-0.66, 0.38], [-0.68, 0.66], [-0.96, 0.64]]), stone, r * 0.3);
  // torso: faceted block
  crShade(ctx, block([[-0.62, -0.5], [-0.3, -0.66], [0.3, -0.66], [0.62, -0.5], [0.66, 0.1], [0.42, 0.5], [-0.42, 0.5], [-0.66, 0.1]]), stone, r);
  // facet shading + cracks
  ctx.fillStyle = 'rgba(30,26,60,0.28)';
  ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.66); ctx.lineTo(r * 0.62, -r * 0.5); ctx.lineTo(r * 0.66, r * 0.1); ctx.lineTo(r * 0.42, r * 0.5); ctx.lineTo(r * 0.32, r * 0.1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = crack; ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.45); ctx.lineTo(-r * 0.38, -r * 0.3); ctx.lineTo(-r * 0.45, -r * 0.12); ctx.moveTo(r * 0.2, r * 0.48); ctx.lineTo(r * 0.28, r * 0.3); ctx.lineTo(r * 0.22, r * 0.2); ctx.stroke();
  // gold banding
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.4, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 0.64, -r * 0.2); ctx.lineTo(-r * 0.46, -r * 0.24); ctx.moveTo(r * 0.46, -r * 0.24); ctx.lineTo(r * 0.64, -r * 0.2); ctx.moveTo(-r * 0.5, r * 0.36); ctx.lineTo(r * 0.5, r * 0.36); ctx.stroke();
  // crescent moon core
  ctx.fillStyle = '#0a0a1e'; ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.3, 0, SXC_TAU); ctx.fill();
  drawGlow(ctx, 0, -r * 0.08, r * (0.55 + rage * 0.2), moon, 0.6);
  ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.24, 0, SXC_TAU); ctx.arc(r * 0.1, -r * 0.14, r * 0.2, 0, SXC_TAU, true); ctx.fill();
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.4, r * 0.04); ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.3, 0, SXC_TAU); ctx.stroke();
  // shoulder boulders with gold spikes
  for (const side of [-1, 1]) {
    sxcHorn(ctx, side * r * 0.62, -r * 0.7, side * r * 0.8, -r * 1.05, r * 0.06, side * r * 0.05); sxcFill(ctx, gold, '#2a1804', 1);
    crShade(ctx, block([[side * 0.36, -0.62], [side * 0.62, -0.84], [side * 0.9, -0.64], [side * 0.86, -0.34], [side * 0.5, -0.34]]), stone, r * 0.4);
  }
  // sunken head with visor slit
  crShade(ctx, block([[-0.2, -0.86], [0.2, -0.86], [0.24, -0.6], [0, -0.52], [-0.24, -0.6]]), stone, r * 0.3);
  ctx.fillStyle = '#05051a'; ctx.fillRect(-r * 0.17, -r * 0.74, r * 0.34, r * 0.07);
  drawGlow(ctx, 0, -r * 0.705, r * (0.22 + rage * 0.1), glow, 0.9);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.13, -r * 0.715, r * 0.26, Math.max(1, r * 0.022));
  // crescent-blade fist arm (raised for the slam)
  ctx.save(); ctx.translate(r * 0.66, -r * 0.3); ctx.rotate(-0.4 - raise * 2.4 + step * 0.12);
  crShade(ctx, block([[-0.16, 0], [0.16, 0], [0.14, 0.5], [-0.14, 0.5]]), stone, r * 0.35);
  ctx.fillStyle = gold; ctx.fillRect(-r * 0.15, r * 0.42, r * 0.3, r * 0.06);
  crShade(ctx, block([[-0.2, 0.5], [0.2, 0.5], [0.22, 0.78], [-0.22, 0.78]]), stone, r * 0.3);
  drawGlow(ctx, 0, r * 0.95, r * 0.3, moon, 0.55);
  ctx.beginPath(); ctx.arc(0, r * 0.82, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.arc(0, r * 0.7, r * 0.3, 0.8 * Math.PI, 0.2 * Math.PI, true); ctx.closePath();
  sxcFill(ctx, sxcC('#fff8e0', f), '#3a3060', Math.max(1, r * 0.03));
  ctx.restore();
  // floating rubble
  for (let i = 0; i < 3; i++) { const a = t * 1.1 + i * 2.1, x = Math.cos(a) * r * 0.9, y = -r * 0.1 + Math.sin(a) * r * 0.2 - r * 0.6; if (Math.sin(a) < -0.2) continue; ctx.fillStyle = stone.shade; ctx.beginPath(); ctx.moveTo(x, y - r * 0.06); ctx.lineTo(x + r * 0.06, y); ctx.lineTo(x, y + r * 0.05); ctx.lineTo(x - r * 0.05, y); ctx.closePath(); ctx.fill(); }
}

// Astraea — the Fallen Seraph boss: six ragged wings of night-black
// feathers lit along their edges in gold, a shattered halo, a tall
// armoured robe with gold filigree and a blazing star-wound in the chest,
// a featureless marble mask weeping dark tears, and a long sword held
// point-down; the wound flares before each volley, red when enraged.
function sxcSeraph(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a5a' : '#ffe0a0';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const robe = sxcMat(SXC_DARKANGEL, f), marble = sxcMat(SXC_MARBLE, f), gold = sxcC('#e0b050', f);
  const fe = sxcC('#14102a', f), fe2 = sxcC('#2a2250', f), edge = rage ? '#ff6a6a' : sxcC('#d8b060', f);
  drawGlow(ctx, 0, -r * 0.2, r * 1.9, rage ? '#ff3a5a' : '#8a6ad8', 0.25);
  // broken halo behind the head
  ctx.save(); ctx.translate(0, -r * 0.85); ctx.rotate(t * 0.3);
  ctx.strokeStyle = glow; ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = 'butt';
  for (let k = 0; k < 4; k++) { const a0 = k * SXC_TAU / 4 + 0.25; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, a0, a0 + SXC_TAU / 4 - 0.5); ctx.stroke(); }
  ctx.restore();
  drawGlow(ctx, 0, -r * 0.85, r * 0.6, glow, 0.35 + heave * 0.2);
  // wings: three pairs of ragged feather fans
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.18, -r * 0.35 + k * r * 0.32);
      ctx.rotate(-0.75 + k * 0.6 + Math.sin(t * 1.6 + k * 0.7) * 0.1);
      const span = r * (1.35 - k * 0.3), nf = 7 - k;
      for (let i = nf - 1; i >= 0; i--) {
        const u = i / (nf - 1), bx = span * (0.15 + u * 0.75), by = -r * 0.08 * Math.sin(u * 3);
        const len = r * (0.4 + u * 0.55) * (1 - k * 0.2), ang = 1.25 - u * 0.95;
        sxcHorn(ctx, bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, r * 0.07, -r * 0.03);
        ctx.fillStyle = i % 2 ? fe : fe2; ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, r * 0.018); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.quadraticCurveTo(span * 0.4, -r * 0.3, span, -r * 0.05); ctx.lineTo(span * 0.7, r * 0.1); ctx.lineTo(span * 0.4, r * 0.18); ctx.closePath();
      sxcFill(ctx, robe.primary, '#04020a', Math.max(1, r * 0.03));
      ctx.restore();
    }
  }
  // robe
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.42); ctx.lineTo(r * 0.3, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.48, r * 0.3, r * 0.5, r * 0.95);
    for (let i = 6; i >= 0; i--) ctx.lineTo(-r * 0.5 + (i / 6) * r * 1.0, r * (0.92 + (i % 2) * 0.12) + Math.sin(t * 2.5 + i) * r * 0.02);
    ctx.quadraticCurveTo(-r * 0.48, r * 0.3, -r * 0.3, -r * 0.42); ctx.closePath();
  }, robe, r * 0.9);
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.2, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.3); ctx.lineTo(-r * 0.18, r * 0.95); ctx.moveTo(r * 0.12, r * 0.3); ctx.lineTo(r * 0.18, r * 0.95);
  ctx.moveTo(-r * 0.12, r * 0.55); ctx.quadraticCurveTo(0, r * 0.62, r * 0.12, r * 0.55); ctx.stroke();
  // breastplate
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.42); ctx.lineTo(r * 0.32, -r * 0.42); ctx.lineTo(r * 0.28, r * 0.05); ctx.lineTo(0, r * 0.32); ctx.lineTo(-r * 0.28, r * 0.05); ctx.closePath(); }, marble, r * 0.45);
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.2, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.28, r * 0.05); ctx.lineTo(0, r * 0.32); ctx.lineTo(r * 0.28, r * 0.05); ctx.moveTo(0, -r * 0.42); ctx.lineTo(0, -r * 0.25); ctx.stroke();
  // star wound
  ctx.save(); ctx.translate(0, -r * 0.08); ctx.rotate(t * 0.8);
  const sr = r * (0.16 + heave * 0.1);
  ctx.fillStyle = glow; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const aa = i / 16 * SXC_TAU, rr = i % 2 ? sr * 0.35 : sr * (i % 4 ? 0.8 : 1.3); if (i) ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  drawGlow(ctx, 0, -r * 0.08, r * (0.3 + heave * 0.35), glow, 0.7 + heave * 0.3);
  // pauldrons
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.2, -r * 0.48); ctx.quadraticCurveTo(side * r * 0.52, -r * 0.6, side * r * 0.56, -r * 0.3); ctx.lineTo(side * r * 0.3, -r * 0.24); ctx.closePath(); }, marble, r * 0.3);
    sxcHorn(ctx, side * r * 0.42, -r * 0.52, side * r * 0.6, -r * 0.76, r * 0.04, -side * r * 0.03); ctx.fillStyle = gold; ctx.fill();
  }
  // sword held point-down in front
  const swx = r * 0.36;
  ctx.fillStyle = sxcC('#c8c8e0', f);
  ctx.beginPath(); ctx.moveTo(swx - r * 0.045, -r * 0.02); ctx.lineTo(swx + r * 0.045, -r * 0.02); ctx.lineTo(swx + r * 0.03, r * 0.9); ctx.lineTo(swx, r * 1.05); ctx.lineTo(swx - r * 0.03, r * 0.9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1a1830'; ctx.lineWidth = Math.max(1, r * 0.015); ctx.stroke();
  ctx.strokeStyle = glow; ctx.globalAlpha = A * 0.7; ctx.beginPath(); ctx.moveTo(swx, r * 0.02); ctx.lineTo(swx, r * 0.9); ctx.stroke(); ctx.globalAlpha = A;
  ctx.fillStyle = gold; ctx.fillRect(swx - r * 0.13, -r * 0.06, r * 0.26, r * 0.045);
  ctx.fillStyle = robe.primary; ctx.beginPath(); ctx.arc(swx, -r * 0.12, r * 0.06, 0, SXC_TAU); ctx.fill();
  // head: crown of thin spikes, marble mask with dark tears
  for (let k = -2; k <= 2; k++) { sxcHorn(ctx, k * r * 0.06, -r * 0.72, k * r * 0.11, -r * (1.0 - Math.abs(k) * 0.07), r * 0.022, 0); ctx.fillStyle = gold; ctx.fill(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.68); ctx.quadraticCurveTo(0, -r * 0.8, r * 0.16, -r * 0.68); ctx.lineTo(r * 0.14, -r * 0.5); ctx.lineTo(0, -r * 0.4); ctx.lineTo(-r * 0.14, -r * 0.5); ctx.closePath(); }, marble, r * 0.25);
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, r * 0.02); ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.68); ctx.quadraticCurveTo(0, -r * 0.8, r * 0.16, -r * 0.68); ctx.stroke();
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = Math.max(1, r * 0.018);
  ctx.beginPath(); for (const side of [-1, 1]) { ctx.moveTo(side * r * 0.07, -r * 0.58); ctx.lineTo(side * r * 0.075, -r * 0.48); ctx.lineTo(side * r * 0.065, -r * 0.44); } ctx.stroke();
  sxcEyes(ctx, 0, -r * 0.6, r * 0.05, r * 0.07, glow, 1, 0.6, null, 0.8 + heave * 0.2);
}

// ===================================================== CLOCKWORK CITY =====

// Cogbot — clockwork stalker: a scuttling brass spider-automaton with an
// iron faceplate, one burning red lens, scissoring mandibles and four
// needle legs; its crank spins up before it lunges.
function sxcCogbot(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase, wind = ph === 'windup';
  const run = m.anim * (ph === 'burst' ? 4 : 2.6);
  ctx.translate(0, -Math.abs(Math.sin(run)) * r * 0.06);
  const brass = sxcMat(SXC_BRASS, f), iron = sxcMat(SXC_IRON, f);
  const legC = sxcC('#2a2a30', f), legL = sxcC('#8a8e98', f), red = wind ? '#ff2a1a' : '#ff5a2a';
  // crank on the back
  ctx.save(); ctx.translate(0, -r * 0.62); ctx.rotate(t * (wind ? 22 : 4));
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.lineTo(r * 0.22, 0); ctx.stroke();
  ctx.fillStyle = brass.primary; ctx.beginPath(); ctx.arc(-r * 0.22, 0, r * 0.07, 0, SXC_TAU); ctx.arc(r * 0.22, 0, r * 0.07, 0, SXC_TAU); ctx.fill();
  ctx.restore();
  // four armoured blade legs arching over the body
  ctx.lineJoin = 'round';
  for (const k of [0, 1]) {
    for (const side of [-1, 1]) {
      const ph2 = run + k * Math.PI + (side > 0 ? Math.PI / 2 : 0), lift = Math.max(0, Math.sin(ph2)) * r * 0.16;
      const sx = side * r * 0.36, sy = -r * 0.22 + k * r * 0.3;
      const kx = side * r * (0.92 - k * 0.06), ky = -r * (0.62 - k * 0.32) - lift;
      const fx = side * r * (0.8 + k * 0.04) + Math.cos(ph2) * side * r * 0.06, fy = r * (0.5 + k * 0.32) - lift * 0.6;
      sxcTaper(ctx, sx, sy, kx, ky, r * 0.13, r * 0.09); sxcFill(ctx, k ? iron.primary : iron.shade, '#0a0b0e', Math.max(1, r * 0.04));
      sxcTaper(ctx, kx, ky, fx, fy, r * 0.09, r * 0.015); sxcFill(ctx, k ? iron.primary : iron.shade, '#0a0b0e', Math.max(1, r * 0.04));
      ctx.strokeStyle = legL; ctx.lineWidth = Math.max(0.8, r * 0.025);
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.04); ctx.lineTo(kx, ky - r * 0.03); ctx.lineTo(fx - side * r * 0.01, fy - r * 0.08); ctx.stroke();
      ctx.fillStyle = brass.primary; ctx.beginPath(); ctx.arc(kx, ky, r * 0.065, 0, SXC_TAU); ctx.fill();
      ctx.strokeStyle = '#0a0b0e'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // carapace: wide armoured shell
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.42); ctx.lineTo(-r * 0.2, -r * 0.62); ctx.lineTo(r * 0.2, -r * 0.62); ctx.lineTo(r * 0.5, -r * 0.42); ctx.lineTo(r * 0.56, -r * 0.02); ctx.lineTo(r * 0.3, r * 0.3); ctx.lineTo(-r * 0.3, r * 0.3); ctx.lineTo(-r * 0.56, -r * 0.02); ctx.closePath(); }, brass, r * 0.6);
  // iron spine plate + segment seams
  ctx.fillStyle = iron.primary;
  ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.62); ctx.lineTo(r * 0.12, -r * 0.62); ctx.lineTo(r * 0.08, -r * 0.16); ctx.lineTo(-r * 0.08, -r * 0.16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.52, -r * 0.24); ctx.lineTo(-r * 0.1, -r * 0.3); ctx.moveTo(r * 0.1, -r * 0.3); ctx.lineTo(r * 0.52, -r * 0.24); ctx.stroke();
  sxcRivets(ctx, [[-0.4, -0.36], [0.4, -0.36], [-0.44, -0.08], [0.44, -0.08]], r, Math.max(0.8, r * 0.03), brass.light);
  // iron faceplate
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.16); ctx.lineTo(r * 0.3, -r * 0.16); ctx.lineTo(r * 0.24, r * 0.2); ctx.lineTo(0, r * 0.34); ctx.lineTo(-r * 0.24, r * 0.2); ctx.closePath(); }, iron, r * 0.35);
  // mandibles
  const snap = (wind ? 0.35 : 0.1) * Math.sin(t * (wind ? 30 : 6));
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.14, r * 0.26); ctx.rotate(side * (0.2 + snap));
    sxcHorn(ctx, 0, 0, -side * r * 0.06, r * 0.32, r * 0.05, side * r * 0.06); sxcFill(ctx, legL, '#0a0b0e', 1);
    ctx.restore();
  }
  // red lens
  ctx.fillStyle = '#0a0606'; ctx.beginPath(); ctx.arc(0, r * 0.02, r * 0.15, 0, SXC_TAU); ctx.fill();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.2, r * 0.04); ctx.stroke();
  drawGlow(ctx, look.x * r * 0.03, r * 0.02 + look.y * r * 0.02, r * (0.3 + (wind ? 0.12 : 0)), red, 0.9);
  ctx.fillStyle = red; ctx.beginPath(); ctx.arc(look.x * r * 0.03, r * 0.02 + look.y * r * 0.02, r * 0.08, 0, SXC_TAU); ctx.fill();
  ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(look.x * r * 0.03, r * 0.02 + look.y * r * 0.02, r * 0.03, 0, SXC_TAU); ctx.fill();
}

// Gearball — a rolling saw-engine: an iron saw-blade rim around counter-
// spinning brass cogs, strapped in a riveted cage with a furnace eye at its
// heart; shatters into loose saw-cogs.
function sxcGearball(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase;
  const roll = m.anim * 0.6 + (ph === 'burst' ? t * 10 : 0);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f), copper = sxcMat(SXC_COPPER, f);
  crShade(ctx, () => sxcSawPath(ctx, r * 0.98, 16, 0.2, roll), iron, r);
  ctx.strokeStyle = iron.light; ctx.lineWidth = Math.max(1, r * 0.025); ctx.globalAlpha = A * 0.6;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.74, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke(); ctx.globalAlpha = A;
  // counter-rotating cogs
  ctx.save(); ctx.translate(-r * 0.22, -r * 0.18);
  crShade(ctx, () => sxcGearPath(ctx, r * 0.36, 8, 0.24, -roll * 1.8), brass, r * 0.4);
  ctx.restore();
  ctx.save(); ctx.translate(r * 0.26, r * 0.2);
  crShade(ctx, () => sxcGearPath(ctx, r * 0.32, 7, 0.26, roll * 2.1), copper, r * 0.36);
  ctx.restore();
  // cage straps
  ctx.strokeStyle = iron.dark; ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 0.1); ctx.quadraticCurveTo(0, r * 0.18, r * 0.72, -r * 0.1); ctx.stroke();
  ctx.strokeStyle = iron.primary; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 0.1); ctx.quadraticCurveTo(0, r * 0.18, r * 0.72, -r * 0.1); ctx.stroke();
  sxcRivets(ctx, [[-0.5, -0.02], [0, 0.04], [0.5, -0.02]], r, Math.max(0.8, r * 0.035), brass.light);
  // furnace eye
  ctx.fillStyle = '#0a0404'; ctx.beginPath(); ctx.arc(0, -r * 0.06, r * 0.24, 0, SXC_TAU); ctx.fill();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.4, r * 0.05); ctx.stroke();
  sxcEyes(ctx, 0, -r * 0.06, r * 0.13, 0, '#ff7a2a', crBlink(m, t), 1, null, 0.4);
  drawGlow(ctx, 0, -r * 0.06, r * 0.4, '#ff5a1a', 0.7);
}

// Saw Cog — a loose spinning saw-blade with a furnace eye (Gearball's
// children).
function sxcGear(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f);
  const rot = m.anim * 1.6;
  crShade(ctx, () => sxcSawPath(ctx, r * 0.95, 10, 0.26, rot), iron, r);
  crShade(ctx, () => sxcGearPath(ctx, r * 0.55, 6, 0.25, -rot * 0.5), brass, r * 0.6);
  ctx.fillStyle = '#0a0404'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, SXC_TAU); ctx.fill();
  drawGlow(ctx, 0, 0, r * 0.5, '#ff5a1a', 0.75);
  ctx.save(); ctx.scale(1, Math.max(0.15, crBlink(m, t)));
  ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(-r * 0.24, r * 0.04); ctx.quadraticCurveTo(0, -r * 0.14, r * 0.24, r * 0.04); ctx.quadraticCurveTo(0, r * 0.1, -r * 0.24, r * 0.04); ctx.fill();
  ctx.fillStyle = '#fff4c0'; ctx.fillRect(-r * 0.1, -r * 0.005, r * 0.2, Math.max(1, r * 0.04));
  ctx.restore();
}

// Cogwing — clockwork gunship drone: an armoured iron-and-brass hull with a
// spiked prow, twin ducted rotors, antenna spines, one red tracking lens and
// an underslung cannon that heats as it charges.
function sxcDrone(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  ctx.rotate(Math.sin(t * 2 + m.seed) * 0.1);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f), red = '#ff3a1a';
  // rotor arms + ducted fans
  for (const side of [-1, 1]) {
    crShade(ctx, () => sxcTaper(ctx, side * r * 0.3, -r * 0.1, side * r * 0.86, -r * 0.36, r * 0.08, r * 0.05), iron, r * 0.3);
    ctx.save(); ctx.translate(side * r * 0.95, -r * 0.42);
    ctx.fillStyle = 'rgba(220,210,190,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.12, 0, 0, SXC_TAU); ctx.fill();
    const c = Math.cos(t * 40 + side) * r * 0.46;
    ctx.strokeStyle = 'rgba(30,24,18,0.85)'; ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath(); ctx.moveTo(-c, 0); ctx.lineTo(c, 0); ctx.stroke();
    ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.12, 0, 0, SXC_TAU); ctx.stroke();
    ctx.fillStyle = iron.dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, SXC_TAU); ctx.fill();
    ctx.restore();
  }
  // underslung cannon
  ctx.fillStyle = sxcC('#2a2a30', f); ctx.beginPath(); ctx.roundRect(-r * 0.09, r * 0.3, r * 0.18, r * 0.5, r * 0.03); ctx.fill();
  ctx.fillStyle = brass.primary; ctx.fillRect(-r * 0.11, r * 0.5, r * 0.22, r * 0.06); ctx.fillRect(-r * 0.11, r * 0.7, r * 0.22, r * 0.05);
  if (m.windup > 0) { drawGlow(ctx, 0, r * 0.82, r * 0.4 * m.windup, '#ff8a3d', 0.9); ctx.fillStyle = crMix('#2a2a30', '#ff8a3d', Math.min(1, m.windup)); ctx.fillRect(-r * 0.07, r * 0.6, r * 0.14, r * 0.2); }
  // antenna spines
  for (const side of [-1, 1]) { sxcHorn(ctx, side * r * 0.16, -r * 0.48, side * r * 0.32, -r * 0.88, r * 0.035, 0); ctx.fillStyle = iron.light; ctx.fill(); }
  // hull: armoured shield with a prow spike
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.55, -r * 0.1); ctx.lineTo(r * 0.3, r * 0.38); ctx.lineTo(0, r * 0.62); ctx.lineTo(-r * 0.3, r * 0.38); ctx.lineTo(-r * 0.55, -r * 0.1); ctx.closePath(); }, brass, r * 0.6);
  // iron armour plate
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.4); ctx.lineTo(r * 0.32, -r * 0.4); ctx.lineTo(r * 0.38, -r * 0.08); ctx.lineTo(r * 0.18, r * 0.3); ctx.lineTo(-r * 0.18, r * 0.3); ctx.lineTo(-r * 0.38, -r * 0.08); ctx.closePath(); }, iron, r * 0.45);
  sxcRivets(ctx, [[-0.28, -0.32], [0.28, -0.32], [-0.3, -0.06], [0.3, -0.06], [0, 0.48]], r, Math.max(0.8, r * 0.03), brass.light);
  // hooded lens
  const lx = (look?.x || 0) * r * 0.06, ly = (look?.y || 0) * r * 0.05;
  ctx.fillStyle = '#0a0606'; ctx.beginPath(); ctx.arc(0, -r * 0.06, r * 0.2, 0, SXC_TAU); ctx.fill();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.2, r * 0.05); ctx.stroke();
  drawGlow(ctx, lx, -r * 0.06 + ly, r * 0.38, red, 0.85);
  ctx.fillStyle = red; ctx.beginPath(); ctx.arc(lx, -r * 0.06 + ly, r * 0.1, 0, SXC_TAU); ctx.fill();
  ctx.fillStyle = '#fff0d0'; ctx.beginPath(); ctx.arc(lx, -r * 0.06 + ly, r * 0.04, 0, SXC_TAU); ctx.fill();
  ctx.fillStyle = iron.primary; ctx.beginPath(); ctx.moveTo(-r * 0.26, -r * 0.2); ctx.lineTo(r * 0.26, -r * 0.2); ctx.lineTo(r * 0.16, -r * 0.1); ctx.lineTo(-r * 0.16, -r * 0.1); ctx.closePath(); ctx.fill();
}

// Steam Trooper — armoured automaton rifleman: an iron gas-mask helm with
// twin red goggles and a respirator snout, brass pauldrons, a riveted
// breastplate with a pressure gauge, a boiler tank venting steam on its
// back and a long brass-banded rifle it shoulders to fire.
function sxcSteamSoldier(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const step = Math.sin(m.anim * 1.8);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f), copper = sxcMat(SXC_COPPER, f);
  const aim = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  // boiler tank + chimney behind
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.5, -r * 0.62, r * 0.3, r * 0.6, r * 0.12); }, copper, r * 0.35);
  ctx.fillStyle = iron.shade; ctx.fillRect(-r * 0.44, -r * 0.9, r * 0.12, r * 0.3);
  ctx.fillStyle = iron.dark; ctx.fillRect(-r * 0.47, -r * 0.92, r * 0.18, r * 0.05);
  sxcSteam(ctx, -r * 0.38, -r * 0.95, r, t, m.seed, 0.8);
  // armoured legs
  for (const side of [-1, 1]) {
    const sw = side * step * r * 0.06, lift = Math.max(0, side * step) * r * 0.08;
    crShade(ctx, () => sxcTaper(ctx, side * r * 0.18, r * 0.32, side * r * 0.22 + sw, r * 0.86 - lift, r * 0.12, r * 0.1), iron, r * 0.35);
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.08 + sw * 0.5, r * 0.52 - lift * 0.5); ctx.lineTo(side * r * 0.34 + sw * 0.5, r * 0.52 - lift * 0.5); ctx.lineTo(side * r * 0.21 + sw * 0.5, r * 0.68 - lift * 0.5); ctx.closePath(); }, brass, r * 0.15);
    ctx.fillStyle = iron.dark; ctx.fillRect(side * r * 0.22 + sw - r * 0.13, r * 0.84 - lift, r * 0.26, r * 0.08);
  }
  // torso
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.38, -r * 0.4); ctx.lineTo(r * 0.38, -r * 0.4); ctx.lineTo(r * 0.32, r * 0.18); ctx.lineTo(r * 0.2, r * 0.38); ctx.lineTo(-r * 0.2, r * 0.38); ctx.lineTo(-r * 0.32, r * 0.18); ctx.closePath(); }, iron, r * 0.7);
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.2, r * 0.04);
  ctx.beginPath(); ctx.moveTo(-r * 0.32, r * 0.18); ctx.lineTo(r * 0.32, r * 0.18); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, -r * 0.18); ctx.stroke();
  sxcRivets(ctx, [[-0.3, -0.3], [0.3, -0.3], [-0.26, 0.1], [0.26, 0.1], [-0.12, 0.28], [0.12, 0.28]], r, Math.max(0.8, r * 0.028), brass.light);
  // pressure gauge
  ctx.fillStyle = sxcC('#e8dcc0', f); ctx.beginPath(); ctx.arc(-r * 0.13, -r * 0.02, r * 0.11, 0, SXC_TAU); ctx.fill();
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1, r * 0.03); ctx.stroke();
  ctx.strokeStyle = '#c8201a'; ctx.lineWidth = Math.max(1, r * 0.025);
  const ga = -2.4 + aim * 2 + Math.sin(t * 5 + m.seed) * 0.15;
  ctx.beginPath(); ctx.moveTo(-r * 0.13, -r * 0.02); ctx.lineTo(-r * 0.13 + Math.cos(ga) * r * 0.08, -r * 0.02 + Math.sin(ga) * r * 0.08); ctx.stroke();
  // breathing hoses
  ctx.strokeStyle = sxcC('#2a2622', f); ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.5); ctx.quadraticCurveTo(-r * 0.3, -r * 0.35, -r * 0.24, -r * 0.18); ctx.moveTo(r * 0.06, -r * 0.5); ctx.quadraticCurveTo(r * 0.2, -r * 0.3, r * 0.12, -r * 0.12); ctx.stroke();
  // pauldrons
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.24, -r * 0.48); ctx.quadraticCurveTo(side * r * 0.56, -r * 0.52, side * r * 0.56, -r * 0.18); ctx.lineTo(side * r * 0.3, -r * 0.24); ctx.closePath(); }, brass, r * 0.3);
    ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1, r * 0.025); ctx.beginPath(); ctx.moveTo(side * r * 0.3, -r * 0.38); ctx.quadraticCurveTo(side * r * 0.48, -r * 0.4, side * r * 0.5, -r * 0.24); ctx.stroke();
  }
  // rifle (shouldered when aiming)
  ctx.save(); ctx.translate(r * 0.4, -r * 0.1); ctx.rotate(-0.35 - aim * 0.85);
  ctx.fillStyle = sxcC('#3a2416', f); ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.05); ctx.lineTo(r * 0.06, -r * 0.05); ctx.lineTo(r * 0.08, r * 0.3); ctx.lineTo(-r * 0.04, r * 0.32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = iron.primary; ctx.fillRect(-r * 0.045, -r * 0.95, r * 0.09, r * 0.92);
  ctx.fillStyle = iron.dark; ctx.fillRect(-r * 0.02, -r * 0.95, r * 0.04, r * 0.85);
  ctx.fillStyle = brass.primary; for (const y of [-0.85, -0.55, -0.25]) ctx.fillRect(-r * 0.06, y * r, r * 0.12, r * 0.05);
  ctx.fillStyle = brass.shade; ctx.fillRect(r * 0.05, -r * 0.4, r * 0.06, r * 0.22);
  if (m.fireFlash > 0) { drawGlow(ctx, 0, -r * 1.0, r * 0.35, '#ffd88a', 1); }
  else if (aim > 0) drawGlow(ctx, 0, -r * 0.97, r * 0.15 * aim, '#ff7a3a', 0.8);
  ctx.restore();
  // gloved hand on the rifle
  ctx.fillStyle = iron.shade; ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.08, r * 0.08, 0, SXC_TAU); ctx.fill();
  // gas-mask helm
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.48); ctx.lineTo(-r * 0.26, -r * 0.7); ctx.quadraticCurveTo(-r * 0.24, -r * 0.94, 0, -r * 0.96); ctx.quadraticCurveTo(r * 0.24, -r * 0.94, r * 0.26, -r * 0.7); ctx.lineTo(r * 0.24, -r * 0.48); ctx.lineTo(r * 0.12, -r * 0.4); ctx.lineTo(-r * 0.12, -r * 0.4); ctx.closePath(); }, iron, r * 0.35);
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.4, r * 0.05);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.96); ctx.lineTo(0, -r * 0.78); ctx.moveTo(-r * 0.26, -r * 0.72); ctx.lineTo(r * 0.26, -r * 0.72); ctx.stroke();
  // goggles
  for (const side of [-1, 1]) {
    ctx.fillStyle = brass.primary; ctx.beginPath(); ctx.arc(side * r * 0.11, -r * 0.62, r * 0.085, 0, SXC_TAU); ctx.fill();
    ctx.fillStyle = '#ff3a1a'; ctx.beginPath(); ctx.arc(side * r * 0.11, -r * 0.62, r * 0.055, 0, SXC_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.11, -r * 0.62, r * (0.13 + aim * 0.06), '#ff4a2a', 0.85);
    ctx.fillStyle = '#ffe0c0'; ctx.fillRect(side * r * 0.11 - r * 0.03, -r * 0.635, r * 0.06, Math.max(1, r * 0.02));
  }
  // respirator snout
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.08, -r * 0.54); ctx.lineTo(r * 0.08, -r * 0.54); ctx.lineTo(r * 0.06, -r * 0.4); ctx.lineTo(-r * 0.06, -r * 0.4); ctx.closePath(); }, brass, r * 0.12);
  ctx.strokeStyle = brass.dark; ctx.lineWidth = 1; ctx.beginPath(); for (const y of [-0.5, -0.46, -0.42]) { ctx.moveTo(-r * 0.05, y * r); ctx.lineTo(r * 0.05, y * r); } ctx.stroke();
}

// Brass Juggernaut — hulking siege engine: a riveted iron boiler chest
// with a roaring furnace grate, spiked brass pauldrons, twin copper stacks
// belching steam, a hunched helm with a burning visor slit, a hydraulic
// claw arm and a spiked piston fist it ratchets up before the slam.
function sxcJuggernaut(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.05);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f), copper = sxcMat(SXC_COPPER, f);
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : ph === 'burst' ? -0.3 : m.windup;
  const heat = 0.6 + 0.4 * Math.sin(t * 5) + (ph === 'windup' ? 0.5 : 0);
  // stacks rising behind the shoulders
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.26, -r * 0.5); ctx.lineTo(side * r * 0.3, -r * 1.0); ctx.lineTo(side * r * 0.46, -r * 1.0); ctx.lineTo(side * r * 0.46, -r * 0.5); ctx.closePath(); }, copper, r * 0.3);
    ctx.fillStyle = iron.dark; ctx.fillRect(side * r * 0.38 - r * 0.12, -r * 1.05, r * 0.24, r * 0.07);
    ctx.fillStyle = '#ff7a2a'; ctx.globalAlpha = A * 0.6 * Math.min(1, heat); ctx.fillRect(side * r * 0.38 - r * 0.06, -r * 1.0, r * 0.12, r * 0.03); ctx.globalAlpha = A;
    sxcSteam(ctx, side * r * 0.38, -r * 1.08, r, t, m.seed + side, 0.6);
  }
  // stumpy legs
  for (const side of [-1, 1]) {
    const lift = side * step > 0 ? step * r * 0.12 : 0;
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.14, r * 0.42); ctx.lineTo(side * r * 0.5, r * 0.42); ctx.lineTo(side * r * 0.56, r * 0.9 - lift); ctx.lineTo(side * r * 0.1, r * 0.9 - lift); ctx.closePath(); }, iron, r * 0.35);
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.1, r * 0.56 - lift * 0.5); ctx.lineTo(side * r * 0.54, r * 0.56 - lift * 0.5); ctx.lineTo(side * r * 0.32, r * 0.76 - lift * 0.5); ctx.closePath(); }, brass, r * 0.2);
  }
  // long hydraulic claw arm reaching the ground (left)
  crShade(ctx, () => sxcTaper(ctx, -r * 0.72, -r * 0.3, -r * 0.92, r * 0.42, r * 0.14, r * 0.1), iron, r * 0.35);
  ctx.strokeStyle = sxcC('#c8ccd8', f); ctx.lineWidth = Math.max(1.2, r * 0.04); ctx.beginPath(); ctx.moveTo(-r * 0.74, -r * 0.2); ctx.lineTo(-r * 0.88, r * 0.32); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 1.08, r * 0.36, r * 0.32, r * 0.22, r * 0.05); }, brass, r * 0.25);
  ctx.fillStyle = iron.light;
  for (const k of [-1, 0, 1]) { sxcHorn(ctx, -r * 0.92 + k * r * 0.1, r * 0.56, -r * 0.92 + k * r * 0.16, r * 0.84, r * 0.05, -k * r * 0.05); ctx.fill(); ctx.strokeStyle = '#0a0b0e'; ctx.lineWidth = 1; ctx.stroke(); }
  // hulking torso: broad shoulders tapering to the belly
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.78, -r * 0.48); ctx.lineTo(-r * 0.4, -r * 0.66); ctx.lineTo(r * 0.4, -r * 0.66); ctx.lineTo(r * 0.78, -r * 0.48); ctx.lineTo(r * 0.7, -r * 0.05); ctx.lineTo(r * 0.5, r * 0.48); ctx.lineTo(-r * 0.5, r * 0.48); ctx.lineTo(-r * 0.7, -r * 0.05); ctx.closePath(); }, iron, r);
  // plate seams + brass bands
  ctx.strokeStyle = iron.shade; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.66, -r * 0.1); ctx.lineTo(-r * 0.34, -r * 0.04); ctx.moveTo(r * 0.66, -r * 0.1); ctx.lineTo(r * 0.34, -r * 0.04); ctx.stroke();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath(); ctx.moveTo(-r * 0.56, r * 0.38); ctx.lineTo(r * 0.56, r * 0.38); ctx.stroke();
  sxcRivets(ctx, [[-0.6, -0.36], [0.6, -0.36], [-0.56, 0.06], [0.56, 0.06], [-0.4, 0.38], [0, 0.38], [0.4, 0.38]], r, Math.max(0.9, r * 0.03), brass.light);
  // furnace belly
  ctx.fillStyle = '#140604'; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.02); ctx.lineTo(r * 0.3, -r * 0.02); ctx.lineTo(r * 0.24, r * 0.32); ctx.lineTo(-r * 0.24, r * 0.32); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, r * 0.15, r * 0.55 * heat, '#ff6a1a', 0.95);
  ctx.fillStyle = '#ffa030'; ctx.globalAlpha = A * Math.min(1, 0.4 + heat * 0.5);
  ctx.beginPath(); ctx.moveTo(-r * 0.24, r * 0.04); ctx.lineTo(r * 0.24, r * 0.04); ctx.lineTo(r * 0.2, r * 0.28); ctx.lineTo(-r * 0.2, r * 0.28); ctx.closePath(); ctx.fill(); ctx.globalAlpha = A;
  ctx.fillStyle = '#fff0b0'; ctx.globalAlpha = A * Math.min(1, heat * 0.6); ctx.fillRect(-r * 0.16, r * 0.18, r * 0.32, r * 0.08); ctx.globalAlpha = A;
  ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.1, -r * 0.02); ctx.lineTo(i * r * 0.085, r * 0.32); } ctx.stroke();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.2, r * 0.04);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.02); ctx.lineTo(r * 0.3, -r * 0.02); ctx.lineTo(r * 0.24, r * 0.32); ctx.lineTo(-r * 0.24, r * 0.32); ctx.closePath(); ctx.stroke();
  // massive spiked pauldrons
  for (const side of [-1, 1]) {
    for (const k of [0, 1, 2]) { sxcHorn(ctx, side * r * (0.5 + k * 0.16), -r * (0.72 - k * 0.06), side * r * (0.56 + k * 0.22), -r * (1.02 - k * 0.1), r * 0.055, side * r * 0.03); sxcFill(ctx, iron.light, '#0a0b0e', 1); }
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.34, -r * 0.66); ctx.quadraticCurveTo(side * r * 0.92, -r * 0.86, side * r * 1.0, -r * 0.34); ctx.lineTo(side * r * 0.72, -r * 0.2); ctx.lineTo(side * r * 0.46, -r * 0.4); ctx.closePath(); }, brass, r * 0.45);
    ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(side * r * 0.44, -r * 0.56); ctx.quadraticCurveTo(side * r * 0.82, -r * 0.7, side * r * 0.88, -r * 0.32); ctx.stroke();
  }
  // helm sunk low between the shoulders, horned, burning visor
  for (const side of [-1, 1]) { sxcHorn(ctx, side * r * 0.16, -r * 0.6, side * r * 0.3, -r * 0.84, r * 0.045, side * r * 0.04); sxcFill(ctx, iron.light, '#0a0b0e', 1); }
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.62); ctx.lineTo(0, -r * 0.72); ctx.lineTo(r * 0.24, -r * 0.62); ctx.lineTo(r * 0.22, -r * 0.36); ctx.lineTo(r * 0.1, -r * 0.24); ctx.lineTo(-r * 0.1, -r * 0.24); ctx.lineTo(-r * 0.22, -r * 0.36); ctx.closePath(); }, iron, r * 0.3);
  ctx.fillStyle = '#0a0404'; ctx.beginPath(); ctx.moveTo(-r * 0.19, -r * 0.52); ctx.lineTo(0, -r * 0.44); ctx.lineTo(r * 0.19, -r * 0.52); ctx.lineTo(r * 0.17, -r * 0.44); ctx.lineTo(0, -r * 0.38); ctx.lineTo(-r * 0.17, -r * 0.44); ctx.closePath(); ctx.fill();
  drawGlow(ctx, 0, -r * 0.46, r * (0.24 + (ph === 'windup' ? 0.1 : 0)), '#ff5a1a', 0.95);
  ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = Math.max(1, r * 0.02); ctx.beginPath(); ctx.moveTo(-r * 0.14, -r * 0.475); ctx.lineTo(0, -r * 0.425); ctx.lineTo(r * 0.14, -r * 0.475); ctx.stroke();
  ctx.strokeStyle = iron.dark; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); for (const x of [-0.06, 0, 0.06]) { ctx.moveTo(x * r, -r * 0.34); ctx.lineTo(x * r, -r * 0.27); } ctx.stroke();
  // piston fist (raised for the slam)
  ctx.save(); ctx.translate(r * 0.76, -r * 0.3); ctx.rotate(-0.45 - raise * 2.4 + step * 0.1);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.14, 0, r * 0.28, r * 0.55, r * 0.05); }, iron, r * 0.3);
  ctx.fillStyle = sxcC('#d8dce4', f); ctx.fillRect(-r * 0.04, r * 0.05, r * 0.08, r * 0.45);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.28, r * 0.52, r * 0.56, r * 0.38, r * 0.06); }, brass, r * 0.4);
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.moveTo(-r * 0.26, r * 0.66); ctx.lineTo(r * 0.26, r * 0.66); ctx.stroke();
  ctx.fillStyle = iron.light;
  for (const k of [-1, 0, 1]) { sxcHorn(ctx, k * r * 0.16, r * 0.88, k * r * 0.18, r * 1.06, r * 0.05, 0); ctx.fill(); ctx.strokeStyle = '#0a0b0e'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}

// Chronos — the Clockwork Colossus boss: an iron titan haloed by a vast
// rotating clock-ring whose blade-hands sweep behind its head, a crown of
// saw-teeth, a stern iron mask with burning eyes, spinning gear pauldrons,
// a chest cavity of whirring cogs around a time-core, and a scythe-bladed
// pendulum swinging beneath. Numerals blaze when it fires; red when enraged.
function sxcChronos(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha, f = sxcF(m);
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d3a' : '#7fd8ff';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const iron = sxcMat(SXC_IRON, f), brass = sxcMat(SXC_BRASS, f), copper = sxcMat(SXC_COPPER, f);
  // clock-ring halo
  ctx.save(); ctx.translate(0, -r * 0.55);
  ctx.save(); ctx.rotate(t * 0.15);
  crShade(ctx, () => { sxcSawPath(ctx, r * 0.98, 24, 0.08, 0); ctx.moveTo(r * 0.8, 0); ctx.arc(0, 0, r * 0.8, 0, SXC_TAU, true); }, brass, r);
  ctx.restore();
  ctx.fillStyle = 'rgba(10,14,24,0.55)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, SXC_TAU); ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * SXC_TAU, big = i % 3 === 0;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = heave > 0.3 && big ? glow : sxcC('#e8d8b0', f);
    ctx.fillRect(-r * (big ? 0.03 : 0.015), -r * 0.77, r * (big ? 0.06 : 0.03), r * (big ? 0.13 : 0.08));
    ctx.restore();
  }
  if (heave > 0.3) drawGlow(ctx, 0, 0, r * 1.0, glow, 0.25 * heave);
  // blade hands
  for (const [sp, L, w] of [[0.5, 0.62, 0.05], [2.4, 0.76, 0.035]]) {
    const a = t * sp * 0.4;
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-r * w, 0); ctx.lineTo(0, -r * L); ctx.lineTo(r * w, 0); ctx.lineTo(0, r * 0.14); ctx.closePath();
    sxcFill(ctx, sxcC('#1a1a20', f), glow, Math.max(1, r * 0.012));
    ctx.restore();
  }
  ctx.restore();
  // pendulum with a scythe bob
  const sw = Math.sin(t * 2.2) * 0.45;
  ctx.save(); ctx.translate(0, r * 0.45); ctx.rotate(sw);
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.58); ctx.quadraticCurveTo(0, r * 0.95, r * 0.3, r * 0.58); ctx.quadraticCurveTo(0, r * 0.75, -r * 0.3, r * 0.58); ctx.closePath();
  sxcFill(ctx, sxcC('#c8ccd8', f), '#0a0b0e', Math.max(1, r * 0.02));
  ctx.fillStyle = brass.primary; ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.07, 0, SXC_TAU); ctx.fill();
  ctx.restore();
  // torso
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.3); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.45, r * 0.3); ctx.lineTo(r * 0.2, r * 0.6); ctx.lineTo(-r * 0.2, r * 0.6); ctx.lineTo(-r * 0.45, r * 0.3); ctx.closePath(); }, iron, r * 0.8);
  // chest cavity with cogs + time core
  ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.18); ctx.lineTo(r * 0.3, -r * 0.18); ctx.lineTo(r * 0.24, r * 0.25); ctx.lineTo(0, r * 0.42); ctx.lineTo(-r * 0.24, r * 0.25); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(-r * 0.12, r * 0.02); sxcGearPath(ctx, r * 0.16, 8, 0.25, t * 1.5); ctx.fillStyle = brass.primary; ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(r * 0.13, r * 0.08); sxcGearPath(ctx, r * 0.13, 7, 0.28, -t * 1.9); ctx.fillStyle = copper.primary; ctx.fill(); ctx.restore();
  drawGlow(ctx, 0, r * 0.1, r * (0.24 + heave * 0.2), glow, 0.9);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.05, 0, SXC_TAU); ctx.fill();
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.18); ctx.lineTo(r * 0.3, -r * 0.18); ctx.lineTo(r * 0.24, r * 0.25); ctx.lineTo(0, r * 0.42); ctx.lineTo(-r * 0.24, r * 0.25); ctx.closePath(); ctx.stroke();
  sxcRivets(ctx, [[-0.46, -0.22], [0.46, -0.22], [-0.38, 0.22], [0.38, 0.22]], r, Math.max(1, r * 0.025), brass.light);
  // arms
  for (const side of [-1, 1]) {
    crShade(ctx, () => sxcTaper(ctx, side * r * 0.6, -r * 0.2, side * r * 0.78, r * 0.45, r * 0.12, r * 0.09), iron, r * 0.3);
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.78 - r * 0.12, r * 0.42, r * 0.24, r * 0.2, r * 0.05); }, brass, r * 0.2);
  }
  // gear pauldrons
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.66, -r * 0.32);
    crShade(ctx, () => sxcSawPath(ctx, r * 0.32, 12, 0.22, t * side * 0.8), iron, r * 0.35);
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, SXC_TAU); }, brass, r * 0.18);
    ctx.fillStyle = iron.dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.05, 0, SXC_TAU); ctx.fill();
    ctx.restore();
  }
  // crown of saw-teeth
  for (let k = -2; k <= 2; k++) { sxcHorn(ctx, k * r * 0.08, -r * 0.72, k * r * 0.13, -r * (1.0 - Math.abs(k) * 0.06), r * 0.035, 0); sxcFill(ctx, brass.primary, '#1e1206', 1); }
  // stern iron mask
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.74); ctx.lineTo(r * 0.24, -r * 0.74); ctx.lineTo(r * 0.26, -r * 0.48); ctx.lineTo(r * 0.12, -r * 0.3); ctx.lineTo(-r * 0.12, -r * 0.3); ctx.lineTo(-r * 0.26, -r * 0.48); ctx.closePath(); }, iron, r * 0.35);
  ctx.strokeStyle = brass.primary; ctx.lineWidth = Math.max(1.2, r * 0.025);
  ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.74); ctx.lineTo(r * 0.24, -r * 0.74); ctx.moveTo(0, -r * 0.74); ctx.lineTo(0, -r * 0.6); ctx.stroke();
  ctx.strokeStyle = iron.dark; ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath(); for (const x of [-0.06, 0, 0.06]) { ctx.moveTo(x * r, -r * 0.4); ctx.lineTo(x * r, -r * 0.32); } ctx.stroke();
  sxcEyes(ctx, 0, -r * 0.55, r * 0.07, r * 0.11, glow, 1, 1, null, 0.8 + heave * 0.2);
  for (const side of [-1, 1]) drawGlow(ctx, side * r * 0.11, -r * 0.55, r * (0.1 + heave * 0.12), glow, 0.5 + heave * 0.5);
}

// ------------------------------------------------------------- register ---
Object.assign(SPECIES.gloomling, { draw: sxcGloomling, colors: { primary: '#3a2a5e', dark: '#0a0614', glow: '#b48cff' } });
Object.assign(SPECIES.wisp, { draw: sxcWisp, colors: { primary: '#7a5ad8', dark: '#140a2a', glow: '#9ff0ff' } });
Object.assign(SPECIES.raven, { draw: sxcRaven, colors: { primary: '#2a2040', dark: '#06040c', glow: '#b48cff' } });
Object.assign(SPECIES.witch, { draw: sxcWitch, colors: { primary: '#3a2456', dark: '#08040e', glow: '#8affd0' } });
Object.assign(SPECIES.bramble, { draw: sxcBramble, colors: { primary: '#3a2a34', dark: '#0a060a', glow: '#c86aff' } });
Object.assign(SPECIES.shadowstag, { draw: sxcShadowStag, colors: { primary: '#2a1e48', dark: '#06030e', glow: '#c89aff' } });
Object.assign(SPECIES.starsprite, { draw: sxcStarSprite, colors: { primary: '#c8a050', dark: '#1a1440', glow: '#ffe8a0' } });
Object.assign(SPECIES.bloom, { draw: sxcBloom, colors: { primary: '#3a2a8a', dark: '#0e0a2a', glow: '#9fe8ff' } });
Object.assign(SPECIES.seedling, { draw: sxcSeedling, colors: { primary: '#3a2a8a', dark: '#0a0a24', glow: '#9fe8ff' } });
Object.assign(SPECIES.comet, { draw: sxcComet, colors: { primary: '#7a9ad8', dark: '#0a1430', glow: '#9fe8ff' } });
Object.assign(SPECIES.astral, { draw: sxcAstral, colors: { primary: '#24246a', dark: '#06061a', glow: '#ffe8a0' } });
Object.assign(SPECIES.moongolem, { draw: sxcMoonGolem, colors: { primary: '#a8a4c0', dark: '#16142a', glow: '#cfe8ff' } });
Object.assign(SPECIES.seraph, { draw: sxcSeraph, colors: { primary: '#2a2050', dark: '#0a0618', glow: '#ffe0a0' } });
Object.assign(SPECIES.cogbot, { draw: sxcCogbot, colors: { primary: '#b88030', dark: '#1e1206', glow: '#ff6a2a' } });
Object.assign(SPECIES.gearball, { draw: sxcGearball, colors: { primary: '#50545e', dark: '#0a0b0e', glow: '#ff6a2a' } });
Object.assign(SPECIES.gear, { draw: sxcGear, colors: { primary: '#50545e', dark: '#0a0b0e', glow: '#ff6a2a' } });
Object.assign(SPECIES.drone, { draw: sxcDrone, colors: { primary: '#b88030', dark: '#1e1206', glow: '#ff4a2a' } });
Object.assign(SPECIES.steamsoldier, { draw: sxcSteamSoldier, colors: { primary: '#50545e', dark: '#0a0b0e', glow: '#ff6a2a' } });
Object.assign(SPECIES.juggernaut, { draw: sxcJuggernaut, colors: { primary: '#50545e', dark: '#0a0b0e', glow: '#ff7a2a' } });
Object.assign(SPECIES.chronos, { draw: sxcChronos, colors: { primary: '#b88030', dark: '#1e1206', glow: '#7fd8ff' } });
