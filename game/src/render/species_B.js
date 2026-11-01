// Serious redesigns of stage species (group B) — replaces the drawing of
// existing SPECIES entries; see render/species.js for the draw contract.
// Crystallized Forest, Draconic Peaks and Gilded Aviary casts, redrawn as
// stylised dark-fantasy villains: hard silhouettes (horns, shards, blades),
// layered materials (chitin, bark, obsidian, brass) and one hot accent.
// Every top-level name is prefixed `sxb` (the standalone build shares one
// scope). Gradients come only from crShade (cached) — no per-frame ones.
import { SPECIES } from './species.js';
import { crShade, crBlink, drawGlow, crMix } from './creatures.js';

const SXB_TAU = Math.PI * 2;

// ------------------------------------------------------------ helpers ----

// hit-flash amount, same rule as creatures.js crPalette
function sxbFlash(m) { return m.hitFlash > 0 ? ((m.boss || m.elite) ? 0.3 : 0.85) : 0; }

// A fixed material (light/primary/shade/dark/rim) that still flashes white
// when hit. Cached per colour set + flash level.
const sxbMatCache = new Map();
function sxbMat(m, light, primary, shade, dark, rim) {
  const f = sxbFlash(m);
  const key = light + primary + shade + dark + rim + f;
  let p = sxbMatCache.get(key);
  if (!p) {
    p = f
      ? { light: crMix(light, '#ffffff', Math.min(1, f + 0.1)), primary: crMix(primary, '#ffffff', f), shade: crMix(shade, '#ffffff', f * 0.7), dark: crMix(dark, '#ffffff', f * 0.5), rim, glow: rim }
      : { light, primary, shade, dark, rim, glow: rim };
    if (sxbMatCache.size > 600) sxbMatCache.clear();
    sxbMatCache.set(key, p);
  }
  return p;
}
// flat colour that flashes with hits
function sxbC(m, col) { const f = sxbFlash(m); return f ? crMix(col, '#ffffff', f * 0.8) : col; }

// crShade with a restrained rim light: the shared rim is a thick crescent
// in the glow colour, which flattens dark armour into two-tone cartoon
// shapes — sink it toward the material's shade so it reads as a thin edge.
const sxbRimCache = new Map();
function sxbShade(ctx, pathFn, mat, r, outline = true) {
  const key = mat.light + mat.primary + mat.shade + mat.dark + mat.rim;
  let p = sxbRimCache.get(key);
  if (!p) {
    p = { light: mat.light, primary: mat.primary, shade: mat.shade, dark: mat.dark, glow: mat.glow, rim: crMix(mat.rim, mat.shade, 0.62) };
    if (sxbRimCache.size > 800) sxbRimCache.clear();
    sxbRimCache.set(key, p);
  }
  crShade(ctx, pathFn, p, r, outline);
}

// polygon from a flat [x,y,x,y…] list in r units
function sxbPath(ctx, r, p) {
  ctx.beginPath();
  ctx.moveTo(p[0] * r, p[1] * r);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * r, p[i + 1] * r);
  ctx.closePath();
}
// smooth closed shape through the midpoints of a control polygon
function sxbSmooth(ctx, r, p) {
  const n = p.length / 2;
  ctx.beginPath();
  ctx.moveTo((p[2 * n - 2] + p[0]) * 0.5 * r, (p[2 * n - 1] + p[1]) * 0.5 * r);
  for (let i = 0; i < n; i++) {
    const j = ((i + 1) % n) * 2;
    ctx.quadraticCurveTo(p[2 * i] * r, p[2 * i + 1] * r, (p[2 * i] + p[j]) * 0.5 * r, (p[2 * i + 1] + p[j + 1]) * 0.5 * r);
  }
  ctx.closePath();
}

// Glaring eyes: sharp blade-shaped glowing slits, inner corners low, with a
// white-hot core and a bloom. (x,y) = centre of the pair.
function sxbEyes(ctx, x, y, w, gap, col, core, blink, glowA, tilt = 0.28) {
  if (glowA > 0) for (const s of [-1, 1]) drawGlow(ctx, x + s * gap, y, w * 2.4, col, glowA);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(x + s * gap, y);
    ctx.scale(s, 1);
    ctx.rotate(-tilt);
    ctx.fillStyle = 'rgba(4,2,6,0.6)';
    ctx.beginPath(); ctx.ellipse(0, -w * 0.05, w * 1.35, w * 0.62, 0, 0, SXB_TAU); ctx.fill();
    ctx.scale(1, Math.max(0.12, blink));
    const eye = () => {
      ctx.beginPath();
      ctx.moveTo(-w, w * 0.14);
      ctx.quadraticCurveTo(-w * 0.1, -w * 0.58, w, -w * 0.2);
      ctx.quadraticCurveTo(w * 0.05, w * 0.5, -w, w * 0.14);
      ctx.closePath();
    };
    ctx.fillStyle = col; eye(); ctx.fill();
    ctx.scale(0.55, 0.5);
    ctx.fillStyle = core; eye(); ctx.fill();
    ctx.restore();
  }
}

// Faceted crystal shard: lit face + shadow face + edge + glint.
function sxbShard(ctx, x, y, ang, len, w, mat) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(w * 0.1, 0); ctx.closePath();
  ctx.fillStyle = mat.light; ctx.fill();
  ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(w * 0.1, 0); ctx.closePath();
  ctx.fillStyle = mat.shade; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -len * 0.7); ctx.lineTo(0, -len); ctx.lineTo(w, -len * 0.7); ctx.lineTo(w, 0);
  ctx.strokeStyle = mat.dark; ctx.lineWidth = Math.max(1, w * 0.22); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(0.7, w * 0.16);
  ctx.beginPath(); ctx.moveTo(-w * 0.5, -len * 0.12); ctx.lineTo(-w * 0.5, -len * 0.62); ctx.lineTo(-w * 0.05, -len * 0.9); ctx.stroke();
  ctx.restore();
}

// Tapered curved horn / claw / spike from (x0,y0) via (cx,cy) to tip.
function sxbHorn(ctx, x0, y0, cx, cy, x1, y1, w, col, hi, edge) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
  ctx.beginPath();
  ctx.moveTo(x0 + nx, y0 + ny);
  ctx.quadraticCurveTo(cx + nx * 0.5, cy + ny * 0.5, x1, y1);
  ctx.quadraticCurveTo(cx - nx * 0.5, cy - ny * 0.5, x0 - nx, y0 - ny);
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, w * 0.28); ctx.lineJoin = 'round'; ctx.stroke(); }
  if (hi) {
    ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.7, w * 0.3);
    ctx.beginPath(); ctx.moveTo(x0 + nx * 0.45, y0 + ny * 0.45); ctx.quadraticCurveTo(cx + nx * 0.25, cy + ny * 0.25, x1, y1); ctx.stroke();
  }
}

// Long pointed blade feather / flame tongue along +x after rotating by ang.
function sxbBlade(ctx, x, y, ang, len, w, col, edge, ol) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, -w);
  ctx.quadraticCurveTo(len * 0.62, -w * 1.15, len, 0);
  ctx.quadraticCurveTo(len * 0.55, w * 0.95, 0, w);
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  if (ol) { ctx.strokeStyle = ol; ctx.lineWidth = Math.max(0.8, w * 0.22); ctx.lineJoin = 'round'; ctx.stroke(); }
  if (edge) {
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.8, w * 0.3);
    ctx.beginPath(); ctx.moveTo(len * 0.25, -w * 0.95); ctx.quadraticCurveTo(len * 0.65, -w * 1.08, len, 0); ctx.stroke();
  }
  ctx.restore();
}

// row of fangs between x0..x1 on line y (dir 1 = pointing down)
function sxbFangs(ctx, x0, x1, y, n, len, col, dir = 1) {
  const step = (x1 - x0) / n;
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = x0 + i * step, L = len * ((i === 0 || i === n - 1) ? 1 : (i % 2 ? 0.55 : 0.8));
    ctx.moveTo(a, y); ctx.lineTo(a + step * 0.5, y + dir * L); ctx.lineTo(a + step, y);
  }
  ctx.fill();
}

// flame tongue standing on (x,y)
function sxbFlame(ctx, x, y, w, h, sway, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.9, x - w, y);
  ctx.fill();
}

// overlapping scale / feather scallops filling a box (clip beforehand)
function sxbScales(ctx, x, y, w, h, s, col, lw) {
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath();
  let row = 0;
  for (let yy = y; yy < y + h; yy += s * 0.62, row++) {
    for (let xx = x + (row % 2) * s * 0.5; xx < x + w; xx += s) {
      ctx.moveTo(xx + s * 0.5, yy);
      ctx.arc(xx, yy, s * 0.5, 0, Math.PI);
    }
  }
  ctx.stroke();
}

// glowing crack polyline (pts in r units)
function sxbCrack(ctx, r, pts, col, core, w) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0] * r, pts[1] * r);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * r, pts[i + 1] * r);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  if (core) { ctx.strokeStyle = core; ctx.lineWidth = Math.max(0.6, w * 0.4); ctx.stroke(); }
}

const sxbClamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// crystal materials (Crystallized Forest)
const sxbViolet = (m) => sxbMat(m, '#efe2ff', '#a07ae8', '#4a2c8a', '#150a30', '#e0d0ff');
const sxbTeal = (m) => sxbMat(m, '#dafff6', '#46d0b8', '#16605a', '#04201c', '#c8fff2');
const sxbJade = (m) => sxbMat(m, '#e4ffd8', '#62c86a', '#1e5a2e', '#06200c', '#e0ffd0');

// ------------------------------------------------------ CRYSTAL FOREST ----

// Shardfang — gaunt crystal-backed wolf-fox: a fan of violet/teal shards
// bursts from its shoulders, wedge skull with a dark facial mask, glowing
// slit eyes and bared fangs; lunges low, maw wide, when it dashes.
const SXB_FOX_BODY = [-0.62, -0.05, -0.5, -0.42, -0.2, -0.52, 0.2, -0.52, 0.5, -0.42, 0.62, -0.05, 0.45, 0.32, 0.15, 0.48, -0.15, 0.48, -0.45, 0.32];
const SXB_FOX_HEAD = [-0.15, -0.48, -0.42, -0.9, -0.36, -0.4, -0.5, -0.14, -0.3, -0.06, -0.13, 0.26, 0, 0.34, 0.13, 0.26, 0.3, -0.06, 0.5, -0.14, 0.36, -0.4, 0.42, -0.9, 0.15, -0.48];
function sxbShardfox(ctx, m, pal, t, look) {
  const r = m.r;
  const ph = m.action && m.action.phase;
  const burst = ph === 'burst', coil = ph === 'windup';
  const run = m.anim * (burst ? 3.8 : 2.6);
  const bound = Math.abs(Math.sin(run)) * r * 0.1;
  ctx.translate(0, -bound + (coil ? r * 0.08 : 0));
  const cv = sxbViolet(m), ct = sxbTeal(m);
  // crystal tail lashing behind
  ctx.save();
  ctx.translate(r * 0.3, r * 0.22);
  ctx.rotate(1.0 + Math.sin(t * 5 + m.seed) * 0.35 + (burst ? 0.4 : 0));
  sxbShard(ctx, 0, 0, 0, r * 0.7, r * 0.12, ct);
  sxbShard(ctx, -r * 0.1, -r * 0.05, -0.4, r * 0.42, r * 0.08, cv);
  sxbShard(ctx, r * 0.1, -r * 0.05, 0.4, r * 0.38, r * 0.07, cv);
  ctx.restore();
  // shoulder shards
  for (const [x, y, a, l, w, c] of [[-0.44, -0.3, -0.85, 0.55, 0.11, 0], [-0.22, -0.42, -0.35, 0.68, 0.12, 1], [0.2, -0.42, 0.3, 0.62, 0.12, 0], [0.44, -0.3, 0.8, 0.5, 0.1, 1]]) {
    sxbShard(ctx, x * r, y * r, a, l * r, w * r, c ? ct : cv);
  }
  // forelegs with claws
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const sw = Math.sin(run + (s > 0 ? Math.PI : 0));
    const lift = Math.max(0, sw) * r * 0.12;
    const px = s * r * (0.44 + sw * 0.04), py = r * 0.7 - lift;
    for (const [col, lw] of [[pal.dark, 0.21], [pal.shade, 0.12]]) {
      ctx.strokeStyle = col; ctx.lineWidth = r * lw;
      ctx.beginPath(); ctx.moveTo(s * r * 0.36, r * 0.05); ctx.lineTo(s * r * 0.52, r * 0.36); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.fillStyle = sxbC(m, '#e6def0');
    ctx.beginPath();
    for (const k of [-1, 0, 1]) { const cx = px + k * r * 0.07; ctx.moveTo(cx - r * 0.03, py); ctx.lineTo(cx + k * r * 0.025, py + r * 0.13); ctx.lineTo(cx + r * 0.03, py); }
    ctx.fill();
  }
  // body + ragged chest ruff
  sxbShade(ctx, () => sxbPath(ctx, r, SXB_FOX_BODY), pal, r * 0.8);
  ctx.fillStyle = pal.light; ctx.globalAlpha *= 0.35;
  sxbPath(ctx, r, [-0.34, 0.08, -0.22, 0.3, -0.12, 0.22, -0.06, 0.46, 0, 0.36, 0.06, 0.46, 0.12, 0.22, 0.22, 0.3, 0.34, 0.08]); ctx.fill();
  ctx.globalAlpha /= 0.35;
  // head
  ctx.save();
  ctx.translate(0, coil ? r * 0.06 : 0);
  sxbShade(ctx, () => sxbPath(ctx, r, SXB_FOX_HEAD), pal, r * 0.62);
  // inner ears glowing crystal
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.37, -r * 0.8); ctx.lineTo(s * r * 0.32, -r * 0.45); ctx.lineTo(s * r * 0.19, -r * 0.5); ctx.closePath(); }
  ctx.fill();
  ctx.fillStyle = ct.primary; ctx.globalAlpha *= 0.7;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.35, -r * 0.72); ctx.lineTo(s * r * 0.31, -r * 0.5); ctx.lineTo(s * r * 0.24, -r * 0.52); ctx.closePath(); }
  ctx.fill();
  ctx.globalAlpha /= 0.7;
  // dark facial mask running down the muzzle
  ctx.fillStyle = pal.dark; ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.4, -r * 0.22); ctx.lineTo(s * r * 0.08, -r * 0.1); ctx.lineTo(s * r * 0.05, r * 0.2); ctx.lineTo(s * r * 0.22, r * 0.02); ctx.closePath(); }
  ctx.fill();
  ctx.globalAlpha /= 0.6;
  // muzzle bridge highlight
  ctx.fillStyle = pal.light; ctx.globalAlpha *= 0.45;
  sxbPath(ctx, r, [-0.05, -0.38, 0.05, -0.38, 0.035, 0.18, -0.035, 0.18]); ctx.fill();
  ctx.globalAlpha /= 0.45;
  // brow + eyes
  sxbEyes(ctx, 0, -r * 0.2, r * 0.11, r * 0.17, pal.glow, '#f4fffc', crBlink(m, t), 0.55);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.34, -r * 0.36); ctx.lineTo(s * r * 0.07, -r * 0.24); }
  ctx.stroke();
  // snarl: gape under the muzzle, fangs
  const open = (burst || coil) ? 1 : 0.15;
  ctx.fillStyle = '#1e0410';
  ctx.beginPath();
  ctx.moveTo(-r * 0.17, r * 0.16);
  ctx.quadraticCurveTo(0, r * 0.32, r * 0.17, r * 0.16);
  ctx.quadraticCurveTo(r * 0.1, r * (0.38 + open * 0.16), 0, r * (0.42 + open * 0.16));
  ctx.quadraticCurveTo(-r * 0.1, r * (0.38 + open * 0.16), -r * 0.17, r * 0.16);
  ctx.fill();
  ctx.fillStyle = sxbC(m, '#f2ecf6');
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.13, r * 0.2); ctx.lineTo(s * r * 0.1, r * (0.33 + open * 0.06)); ctx.lineTo(s * r * 0.07, r * 0.25);
    ctx.moveTo(s * r * 0.08, r * (0.4 + open * 0.15)); ctx.lineTo(s * r * 0.06, r * (0.32 + open * 0.08)); ctx.lineTo(s * r * 0.03, r * (0.41 + open * 0.15));
  }
  ctx.fill();
  ctx.fillStyle = '#0a0408';
  ctx.beginPath(); ctx.ellipse(0, r * 0.27, r * 0.07, r * 0.045, 0, 0, SXB_TAU); ctx.fill();
  // brow crystal
  sxbShard(ctx, 0, -r * 0.38, 0, r * 0.22, r * 0.05, cv);
  ctx.restore();
}

// Rotcap — fungal horror: torn violet cap split by erupting crystals, a
// pale veined stalk on root tendrils, eyes glinting in the shadow of the
// gills above a lamprey maw ringed with teeth. Splits into smaller rotcaps.
function sxbMushling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.5;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.2 - air * 0.08, 1 - coil * 0.22 + air * 0.12);
  ctx.translate(0, -r * 0.5);
  const stem = sxbMat(m, '#ddd2c0', '#968a76', '#463c30', '#120e0a', '#9affe0');
  const cv = sxbViolet(m), ct = sxbTeal(m);
  // root tendrils
  ctx.lineCap = 'round';
  for (const [bx, tx, ty, k] of [[-0.2, -0.66, 0.62, 0], [-0.08, -0.3, 0.78, 1], [0.08, 0.32, 0.78, 2], [0.2, 0.68, 0.6, 3]]) {
    const w = Math.sin(m.anim * 2 + k * 1.7) * r * 0.06;
    ctx.strokeStyle = stem.dark; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(bx * r, r * 0.4); ctx.quadraticCurveTo((bx + tx) * 0.5 * r + w, r * 0.74, tx * r + w, ty * r); ctx.stroke();
    ctx.strokeStyle = stem.shade; ctx.lineWidth = r * 0.06; ctx.stroke();
  }
  // stalk
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.5);
    ctx.bezierCurveTo(-r * 0.5, r * 0.25, -r * 0.42, -r * 0.05, -r * 0.28, -r * 0.15);
    ctx.lineTo(r * 0.28, -r * 0.15);
    ctx.bezierCurveTo(r * 0.44, -r * 0.02, r * 0.52, r * 0.28, r * 0.3, r * 0.5);
    ctx.closePath();
  }, stem, r * 0.55);
  ctx.strokeStyle = pal.glow; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, r * 0.46); ctx.quadraticCurveTo(-r * 0.33, r * 0.22, -r * 0.18, r * 0.06);
  ctx.moveTo(r * 0.22, r * 0.47); ctx.quadraticCurveTo(r * 0.34, r * 0.26, r * 0.22, r * 0.1);
  ctx.stroke();
  ctx.globalAlpha = A;
  // gill shadow under the cap
  ctx.fillStyle = 'rgba(6,2,12,0.75)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.04, r * 0.44, r * 0.17, 0, 0, SXB_TAU); ctx.fill();
  // lamprey maw ringed with teeth
  const open = 0.45 + coil * 0.55 + air * 0.3;
  const my = r * 0.27, mw = r * 0.14, mh = r * (0.05 + open * 0.07);
  ctx.fillStyle = '#26060e';
  ctx.beginPath(); ctx.ellipse(0, my, mw, mh, 0, 0, SXB_TAU); ctx.fill();
  ctx.fillStyle = sxbC(m, '#efe6d2');
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * SXB_TAU + 0.2, a1 = a - 0.28, a2 = a + 0.28;
    ctx.moveTo(Math.cos(a1) * mw, my + Math.sin(a1) * mh);
    ctx.lineTo(Math.cos(a) * mw * 0.35, my + Math.sin(a) * mh * 0.35);
    ctx.lineTo(Math.cos(a2) * mw, my + Math.sin(a2) * mh);
  }
  ctx.fill();
  // eyes in the shadow
  sxbEyes(ctx, 0, r * 0.08, r * 0.085, r * 0.13, pal.glow, '#ffffff', crBlink(m, t), 0.5, 0.35);
  ctx.fillStyle = pal.glow;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.29, r * 0.1, Math.max(0.8, r * 0.03), 0, SXB_TAU); ctx.fill(); }
  // the cap: torn, asymmetric
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, r * 0.02);
    ctx.bezierCurveTo(-r * 0.98, -r * 0.7, -r * 0.4, -r * 0.98, r * 0.08, -r * 0.94);
    ctx.bezierCurveTo(r * 0.6, -r * 0.9, r * 0.98, -r * 0.6, r * 1.02, r * 0.0);
    for (let i = 1; i <= 8; i++) ctx.lineTo(r * (1.02 - i * 0.2525), r * (i % 2 ? -0.1 : 0.05) + (i === 3 ? r * 0.06 : 0));
    ctx.closePath();
  };
  sxbShade(ctx, cap, pal, r);
  ctx.save(); cap(); ctx.clip();
  ctx.fillStyle = pal.dark; ctx.globalAlpha = A * 0.35;
  for (const [x, y, w, h] of [[-0.55, -0.35, 0.18, 0.1], [0.15, -0.68, 0.14, 0.08], [0.55, -0.25, 0.16, 0.1], [-0.15, -0.22, 0.1, 0.06]]) { ctx.beginPath(); ctx.ellipse(x * r, y * r, w * r, h * r, 0.3, 0, SXB_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) { const x = -0.88 + i * 0.22; ctx.moveTo(x * r, 0); ctx.lineTo((x * 1.05) * r, -r * 0.14); }
  ctx.moveTo(-r * 0.35, -r * 0.8); ctx.lineTo(-r * 0.25, -r * 0.55); ctx.lineTo(-r * 0.32, -r * 0.4);
  ctx.stroke();
  ctx.restore();
  // crystals tearing out of the cap
  for (const [x, y, a, l, w, c] of [[-0.6, -0.45, -0.75, 0.48, 0.1, 0], [-0.2, -0.78, -0.2, 0.62, 0.13, 1], [0.28, -0.75, 0.32, 0.46, 0.1, 0], [0.7, -0.38, 0.9, 0.34, 0.08, 1]]) {
    sxbShard(ctx, x * r, y * r, a, l * r, w * r, c ? ct : cv);
  }
  drawGlow(ctx, -r * 0.2, -r * 1.05, r * 0.45, pal.glow, 0.25 + 0.15 * Math.sin(t * 3 + m.seed));
  // drifting spores
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.4 + i * 0.5 + m.seed * 0.13) % 1;
    ctx.globalAlpha = A * (1 - p) * 0.9;
    ctx.fillStyle = pal.glow;
    ctx.beginPath(); ctx.arc(Math.sin(t * 2 + i * 3) * r * 0.5, -r * 0.9 - p * r * 0.8, Math.max(0.8, r * 0.04), 0, SXB_TAU); ctx.fill();
  }
  ctx.globalAlpha = A;
}

// Deathglass Moth — sickle-winged moth with glowing crystal veins, a
// slit-pupil eyespot on each wing, a pale death's-head on the thorax,
// mandibles and swept feathered antennae.
function sxbMoth(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.abs(Math.sin(t * (fast ? 26 : 13) + m.seed));
  const fore = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.14);
    ctx.bezierCurveTo(r * 0.35, -r * 0.64, r * 0.95, -r * 0.94, r * 1.44, -r * 0.84);
    ctx.quadraticCurveTo(r * 1.26, -r * 0.66, r * 1.2, -r * 0.48);
    ctx.lineTo(r * 1.06, -r * 0.36);
    ctx.quadraticCurveTo(r * 0.98, -r * 0.24, r * 0.84, -r * 0.28);
    ctx.quadraticCurveTo(r * 0.72, -r * 0.12, r * 0.58, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.02, r * 0.12, r * 0.05);
    ctx.closePath();
  };
  const hind = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.1, 0);
    ctx.bezierCurveTo(r * 0.45, -r * 0.05, r * 0.86, r * 0.2, r * 0.82, r * 0.45);
    ctx.lineTo(r * 0.7, r * 1.0);
    ctx.quadraticCurveTo(r * 0.55, r * 0.56, r * 0.38, r * 0.5);
    ctx.quadraticCurveTo(r * 0.22, r * 0.36, r * 0.08, r * 0.2);
    ctx.closePath();
  };
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s * (0.3 + flap * 0.7), 1);
    ctx.rotate(0.06 - flap * 0.1);
    sxbShade(ctx, hind, pal, r * 0.7);
    sxbShade(ctx, fore, pal, r * 0.9);
    // glowing crystal veins
    ctx.strokeStyle = pal.glow; ctx.globalAlpha = A * 0.65; ctx.lineWidth = Math.max(0.8, r * 0.03);
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.1); ctx.quadraticCurveTo(r * 0.7, -r * 0.62, r * 1.36, -r * 0.8);
    ctx.moveTo(r * 0.15, -r * 0.08); ctx.quadraticCurveTo(r * 0.7, -r * 0.35, r * 1.06, -r * 0.38);
    ctx.moveTo(r * 0.15, -r * 0.05); ctx.lineTo(r * 0.7, -r * 0.18);
    ctx.moveTo(r * 0.12, r * 0.06); ctx.quadraticCurveTo(r * 0.55, r * 0.3, r * 0.7, r * 0.92);
    ctx.moveTo(r * 0.12, r * 0.04); ctx.lineTo(r * 0.72, r * 0.36);
    ctx.stroke();
    ctx.globalAlpha = A;
    // pale margin studs
    ctx.fillStyle = pal.light;
    for (const [x, y] of [[1.2, -0.62], [1.0, -0.42], [0.8, -0.32], [0.62, -0.22], [0.72, 0.5]]) { ctx.beginPath(); ctx.arc(x * r, y * r, Math.max(0.6, r * 0.028), 0, SXB_TAU); ctx.fill(); }
    // slit-pupil eyespot
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(r * 0.82, -r * 0.55, r * 0.15, r * 0.1, -0.4, 0, SXB_TAU); ctx.fill();
    ctx.fillStyle = pal.glow;
    ctx.beginPath(); ctx.ellipse(r * 0.82, -r * 0.55, r * 0.11, r * 0.065, -0.4, 0, SXB_TAU); ctx.fill();
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(r * 0.82, -r * 0.55, r * 0.022, r * 0.06, -0.4, 0, SXB_TAU); ctx.fill();
    ctx.restore();
  }
  // segmented abdomen with a barb
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.14, r * 0.12); ctx.quadraticCurveTo(-r * 0.17, r * 0.5, 0, r * 0.82); ctx.quadraticCurveTo(r * 0.17, r * 0.5, r * 0.14, r * 0.12); ctx.closePath(); }, { ...pal, primary: pal.shade }, r * 0.45);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (const y of [0.28, 0.42, 0.56, 0.68]) { const w = 0.15 - (y - 0.2) * 0.22; ctx.moveTo(-w * r, y * r); ctx.quadraticCurveTo(0, (y + 0.05) * r, w * r, y * r); }
  ctx.stroke();
  // furred thorax with a death's-head
  sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.04, r * 0.2, r * 0.21, 0, 0, SXB_TAU); }, { ...pal, primary: pal.shade }, r * 0.3);
  drawGlow(ctx, 0, -r * 0.04, r * 0.32, pal.glow, 0.35 + 0.35 * (m.windup || 0));
  ctx.fillStyle = sxbC(m, '#d8d2c0');
  ctx.beginPath(); ctx.ellipse(0, -r * 0.07, r * 0.09, r * 0.085, 0, 0, SXB_TAU); ctx.fill();
  ctx.fillRect(-r * 0.05, -r * 0.02, r * 0.1, r * 0.07);
  ctx.fillStyle = pal.dark;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.04, -r * 0.07, r * 0.028, 0, SXB_TAU); ctx.fill(); }
  // head: compound eyes + mandibles
  sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.13, r * 0.1, 0, 0, SXB_TAU); }, { ...pal, primary: pal.dark }, r * 0.2);
  for (const s of [-1, 1]) {
    drawGlow(ctx, s * r * 0.1, -r * 0.31, r * 0.14, pal.glow, 0.7);
    ctx.fillStyle = pal.glow; ctx.beginPath(); ctx.ellipse(s * r * 0.1, -r * 0.31, r * 0.065, r * 0.055, s * 0.4, 0, SXB_TAU); ctx.fill();
  }
  ctx.strokeStyle = sxbC(m, '#c8c0b0'); ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.05, -r * 0.22); ctx.quadraticCurveTo(s * r * 0.09, -r * 0.14, s * r * 0.01, -r * 0.1); }
  ctx.stroke();
  // swept feathered antennae
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    const tx = s * r * 0.5, ty = -r * 0.78 + Math.sin(t * 6 + s) * r * 0.04;
    ctx.moveTo(s * r * 0.05, -r * 0.38); ctx.quadraticCurveTo(s * r * 0.18, -r * 0.75, tx, ty);
    for (let k = 1; k <= 4; k++) {
      const f = k / 5, bx = s * r * (0.05 + f * 0.4), by = -r * (0.38 + f * 0.38);
      ctx.moveTo(bx, by); ctx.lineTo(bx + s * r * 0.08, by + r * 0.06);
    }
  }
  ctx.stroke();
}

// Thornwarden — gaunt hunched tree-wraith: twisted bark body with moss
// and glowing sap veins, hollow carved face, a crown of dead antler
// branches and crystals; raises a thorn staff whose crystal flares.
const SXB_TREANT_BODY = [-0.24, 0.5, -0.3, 0.16, -0.48, -0.18, -0.38, -0.5, -0.14, -0.64, 0.12, -0.62, 0.38, -0.48, 0.46, -0.18, 0.28, 0.14, 0.24, 0.5];
function sxbTreant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const raise = m.windup || 0;
  ctx.translate(0, Math.abs(step) * r * 0.04);
  const cv = sxbViolet(m), ct = sxbTeal(m);
  const wood = sxbMat(m, '#8a7058', '#4a3426', '#22160e', '#0a0604', pal.rim);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // dead antler branches + crown crystals (behind)
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, -r * 0.5); ctx.lineTo(-r * 0.5, -r * 0.85); ctx.lineTo(-r * 0.74, -r * 0.94);
  ctx.moveTo(-r * 0.5, -r * 0.85); ctx.lineTo(-r * 0.46, -r * 1.1);
  ctx.moveTo(r * 0.28, -r * 0.48); ctx.lineTo(r * 0.55, -r * 0.86); ctx.lineTo(r * 0.8, -r * 0.88);
  ctx.moveTo(r * 0.55, -r * 0.86); ctx.lineTo(r * 0.54, -r * 1.12);
  ctx.stroke();
  ctx.strokeStyle = pal.shade; ctx.lineWidth = r * 0.035; ctx.stroke();
  sxbShard(ctx, -r * 0.12, -r * 0.55, -0.35, r * 0.5, r * 0.1, cv);
  sxbShard(ctx, r * 0.08, -r * 0.58, 0.1, r * 0.66, r * 0.12, ct);
  sxbShard(ctx, r * 0.3, -r * 0.48, 0.55, r * 0.4, r * 0.09, cv);
  // root legs
  for (const s of [-1, 1]) {
    const fx = s * r * 0.26 + s * step * r * 0.1;
    sxbShade(ctx, () => sxbPath(ctx, 1, [s * r * 0.06, r * 0.3, s * r * 0.3, r * 0.3, fx + s * r * 0.08, r * 0.78, fx + s * r * 0.26, r * 0.93, fx, r * 0.86, fx - s * r * 0.16, r * 0.94, fx - s * r * 0.06, r * 0.76]), wood, r * 0.4);
  }
  // left arm hanging: long, with twig claws
  const sw = Math.sin(m.anim * 1.6 + 1) * r * 0.05;
  for (const [col, lw] of [[pal.dark, 0.15], [wood.primary, 0.08]]) {
    ctx.strokeStyle = col; ctx.lineWidth = r * lw;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.quadraticCurveTo(-r * 0.78, -r * 0.05, -r * 0.66 + sw, r * 0.38); ctx.stroke();
  }
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  for (const k of [-1, 0, 1]) { ctx.moveTo(-r * 0.66 + sw, r * 0.38); ctx.quadraticCurveTo(-r * (0.68 + k * 0.1) + sw, r * 0.5, -r * (0.62 + k * 0.14) + sw, r * 0.6); }
  ctx.stroke();
  // body
  sxbShade(ctx, () => sxbSmooth(ctx, r, SXB_TREANT_BODY), pal, r * 0.8);
  ctx.save(); sxbSmooth(ctx, r, SXB_TREANT_BODY); ctx.clip();
  ctx.strokeStyle = pal.dark; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  for (const x of [-0.32, -0.12, 0.1, 0.3]) { ctx.moveTo(x * r, -r * 0.6); ctx.quadraticCurveTo(x * r + r * 0.08, -r * 0.1, x * r - r * 0.04, r * 0.5); }
  ctx.stroke();
  ctx.fillStyle = '#3a8a6a'; ctx.globalAlpha = A * 0.5;
  ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.32, r * 0.16, r * 0.1, -0.5, 0, SXB_TAU); ctx.ellipse(r * 0.34, r * 0.25, r * 0.12, r * 0.08, 0.4, 0, SXB_TAU); ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  // glowing sap veins
  sxbCrack(ctx, r, [-0.05, 0.45, 0.02, 0.25, -0.06, 0.12], pal.glow, null, Math.max(1, r * 0.035));
  // hollow carved face
  const pulse = 0.65 + 0.35 * Math.sin(t * 3 + m.seed);
  ctx.fillStyle = '#060302';
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.04, -r * 0.3); ctx.lineTo(s * r * 0.3, -r * 0.42); ctx.lineTo(s * r * 0.27, -r * 0.24); ctx.lineTo(s * r * 0.08, -r * 0.2); ctx.closePath(); }
  ctx.fill();
  for (const s of [-1, 1]) {
    drawGlow(ctx, s * r * 0.17, -r * 0.29, r * (0.13 + raise * 0.06) * pulse + r * 0.05, pal.glow, 0.9);
    ctx.fillStyle = '#f4fff8'; ctx.beginPath(); ctx.ellipse(s * r * 0.17, -r * 0.29, r * 0.05, r * 0.025, s * -0.35, 0, SXB_TAU); ctx.fill();
  }
  // jagged gash mouth with splinter teeth
  const open = r * (0.06 + raise * 0.08);
  ctx.fillStyle = '#060302';
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.04); ctx.lineTo(-r * 0.08, -r * 0.0); ctx.lineTo(r * 0.04, -r * 0.05); ctx.lineTo(r * 0.2, -r * 0.02);
  ctx.lineTo(r * 0.12, r * 0.02 + open); ctx.lineTo(-r * 0.02, r * 0.04 + open); ctx.lineTo(-r * 0.14, r * 0.02 + open);
  ctx.closePath(); ctx.fill();
  if (raise > 0.05) drawGlow(ctx, 0, r * 0.02, r * 0.22 * raise, pal.glow, raise);
  sxbFangs(ctx, -r * 0.16, r * 0.16, -r * 0.02, 5, r * 0.06, sxbC(m, '#b8a480'), 1);
  // right arm gripping the thorn staff
  const sy = -raise * r * 0.3;
  ctx.strokeStyle = wood.dark; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.moveTo(r * 0.62, r * 0.55 + sy); ctx.lineTo(r * 0.58, -r * 0.78 + sy); ctx.stroke();
  ctx.strokeStyle = wood.light; ctx.lineWidth = r * 0.025;
  ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.5 + sy); ctx.lineTo(r * 0.565, -r * 0.74 + sy); ctx.stroke();
  ctx.fillStyle = wood.dark;
  ctx.beginPath();
  for (const y of [0.3, 0.0, -0.3]) { ctx.moveTo(r * 0.6, (y * r) + sy); ctx.lineTo(r * 0.7, (y - 0.08) * r + sy); ctx.lineTo(r * 0.61, (y - 0.06) * r + sy); }
  ctx.fill();
  for (const [col, lw] of [[pal.dark, 0.14], [wood.primary, 0.075]]) {
    ctx.strokeStyle = col; ctx.lineWidth = r * lw;
    ctx.beginPath(); ctx.moveTo(r * 0.38, -r * 0.3); ctx.quadraticCurveTo(r * 0.55, -r * 0.3, r * 0.6, -r * 0.08 + sy); ctx.stroke();
  }
  // claw-branch cradle + crystal
  ctx.strokeStyle = wood.dark; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.moveTo(r * 0.58, -r * 0.76 + sy); ctx.quadraticCurveTo(r * 0.44, -r * 0.88 + sy, r * 0.48, -r * 1.02 + sy);
  ctx.moveTo(r * 0.58, -r * 0.76 + sy); ctx.quadraticCurveTo(r * 0.72, -r * 0.88 + sy, r * 0.68, -r * 1.02 + sy);
  ctx.stroke();
  drawGlow(ctx, r * 0.58, -r * 0.92 + sy, r * (0.25 + raise * 0.35), pal.glow, 0.45 + raise * 0.5);
  sxbShard(ctx, r * 0.58, -r * 0.78 + sy, 0, r * 0.34, r * 0.08, ct);
}

// Shardbound Colossus — slate-and-obsidian golem: massive faceted
// shoulders crowned with crystal growths, glowing seams, a small head sunk
// low with a burning visor, crystal-spiked fists; one fist rises to slam.
const SXB_GOLEM_BODY = [-0.88, -0.38, -0.68, -0.72, -0.28, -0.8, 0.3, -0.8, 0.7, -0.72, 0.9, -0.38, 0.62, 0.12, 0.38, 0.48, -0.38, 0.48, -0.62, 0.12];
function sxbGolemArm(ctx, r, s, ang, pal, cv, ct) {
  ctx.save();
  ctx.translate(s * r * 0.72, -r * 0.42);
  ctx.rotate(ang);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.17, -0.05, 0.17, -0.05, 0.14, 0.45, -0.14, 0.45]), pal, r * 0.4);
  const fist = [-0.26, 0.38, 0.26, 0.38, 0.31, 0.72, 0.12, 0.88, -0.18, 0.86, -0.31, 0.7];
  sxbShade(ctx, () => sxbPath(ctx, r, fist), pal, r * 0.45);
  ctx.strokeStyle = pal.light; ctx.globalAlpha *= 0.5; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.26, r * 0.4); ctx.lineTo(r * 0.26, r * 0.4); ctx.stroke();
  ctx.globalAlpha /= 0.5;
  for (const [x, a, l, c] of [[-0.18, 2.75, 0.3, 0], [0.0, 3.14, 0.38, 1], [0.18, 3.5, 0.3, 0]]) sxbShard(ctx, x * r, r * 0.82, a, l * r, r * 0.07, c ? ct : cv);
  ctx.restore();
}
function sxbCrystalGolem(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.06);
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : (m.windup || 0);
  const rage = ph === 'windup' ? 1 : (m.windup || 0);
  const cv = sxbViolet(m), ct = sxbTeal(m);
  const deep = sxbMat(m, pal.primary, pal.shade, pal.dark, '#000000', pal.rim);
  // legs
  for (const s of [-1, 1]) {
    const lift = s * step > 0 ? s * step * r * 0.12 : 0;
    sxbShade(ctx, () => sxbPath(ctx, r, [s * 0.1, 0.3, s * 0.5, 0.3, s * 0.56, 0.86 - lift / r, s * 0.08, 0.88 - lift / r]), deep, r * 0.4);
  }
  // torso
  sxbShade(ctx, () => sxbPath(ctx, r, SXB_GOLEM_BODY), pal, r);
  // facet planes
  ctx.fillStyle = pal.dark; ctx.globalAlpha = A * 0.35;
  sxbPath(ctx, r, [0.9, -0.38, 0.62, 0.12, 0.38, 0.48, 0.12, 0.2, 0.3, -0.3]); ctx.fill();
  sxbPath(ctx, r, [-0.62, 0.12, -0.38, 0.48, -0.1, 0.3, -0.45, -0.05]); ctx.fill();
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.25;
  sxbPath(ctx, r, [-0.68, -0.72, -0.28, -0.8, -0.1, -0.5, -0.6, -0.4]); ctx.fill();
  ctx.globalAlpha = A;
  // glowing seams
  const gw = Math.max(1.2, r * 0.045);
  ctx.globalAlpha = A * 0.3;
  sxbCrack(ctx, r, [-0.5, -0.58, -0.3, -0.22, -0.46, 0.18], pal.glow, null, gw * 3);
  sxbCrack(ctx, r, [0.36, -0.62, 0.2, -0.26, 0.46, 0.04, 0.3, 0.4], pal.glow, null, gw * 3);
  ctx.globalAlpha = A;
  sxbCrack(ctx, r, [-0.5, -0.58, -0.3, -0.22, -0.46, 0.18], pal.glow, '#ffffff', gw);
  sxbCrack(ctx, r, [0.36, -0.62, 0.2, -0.26, 0.46, 0.04, 0.3, 0.4], pal.glow, '#ffffff', gw);
  // chest core
  const pulse = 0.6 + 0.4 * Math.sin(t * 4 + m.seed);
  drawGlow(ctx, 0, -r * 0.08, r * (0.32 + rage * 0.2) * pulse, pal.glow, 0.8);
  ctx.fillStyle = pal.dark;
  sxbPath(ctx, r, [0, -0.32, 0.17, -0.08, 0, 0.18, -0.17, -0.08]); ctx.fill();
  sxbShard(ctx, 0, r * 0.12, 0, r * 0.4, r * 0.1, ct);
  // arms: left hangs, right rises for the slam
  sxbGolemArm(ctx, r, -1, 0.22 + step * 0.08, pal, cv, ct);
  sxbGolemArm(ctx, r, 1, -(0.22 + raise * 2.4) + step * 0.06, pal, cv, ct);
  // shoulder crystal growths
  for (const [x, y, a, l, w, c] of [[-0.7, -0.6, -0.55, 0.55, 0.12, 0], [-0.48, -0.74, -0.2, 0.42, 0.1, 1], [-0.86, -0.42, -0.95, 0.32, 0.08, 1], [0.62, -0.66, 0.4, 0.58, 0.13, 1], [0.84, -0.48, 0.9, 0.36, 0.09, 0]]) {
    sxbShard(ctx, x * r, y * r, a, l * r, w * r, c ? ct : cv);
  }
  // head sunk between the shoulders
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.25, -0.6, -0.2, -0.9, 0.2, -0.9, 0.25, -0.6, 0.12, -0.5, -0.12, -0.5]), deep, r * 0.35);
  ctx.fillStyle = pal.dark;
  sxbPath(ctx, r, [-0.27, -0.82, 0.27, -0.82, 0.22, -0.72, 0, -0.68, -0.22, -0.72]); ctx.fill();
  sxbEyes(ctx, 0, -r * 0.66, r * 0.075, r * 0.1, pal.glow, '#ffffff', 1, 0.6 + rage * 0.3, 0.35);
  ctx.fillStyle = pal.glow; ctx.globalAlpha = A * (0.4 + rage * 0.6);
  ctx.fillRect(-r * 0.1, -r * 0.56, r * 0.2, r * (0.02 + rage * 0.03));
  ctx.globalAlpha = A;
}

// The Elderglass — ancient blighted treant boss: crystal spires as a crown,
// dead antlers, a vast gnarled face with a bark brow shelf over burning
// eyes, splinter-toothed maw hiding a heart crystal, root beard and claws.
const SXB_ELDER_BODY = [-0.85, 0.1, -0.92, -0.3, -0.7, -0.66, -0.35, -0.78, 0, -0.7, 0.35, -0.8, 0.72, -0.62, 0.92, -0.25, 0.86, 0.15, 0.7, 0.55, 0.4, 0.8, 0, 0.86, -0.4, 0.8, -0.72, 0.55];
function sxbElderTreant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : pal.glow;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const cv = sxbViolet(m), ct = sxbTeal(m), cj = sxbJade(m);
  const wood = sxbMat(m, '#8a7058', '#4a3426', '#22160e', '#0a0604', pal.rim);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // dead antlers
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.55, -r * 0.6); ctx.lineTo(s * r * 0.95, -r * 1.05); ctx.lineTo(s * r * 1.25, -r * 1.1);
    ctx.moveTo(s * r * 0.95, -r * 1.05); ctx.lineTo(s * r * 1.0, -r * 1.35);
    ctx.moveTo(s * r * 0.75, -r * 0.82); ctx.lineTo(s * r * 1.1, -r * 0.78);
  }
  ctx.stroke();
  ctx.strokeStyle = wood.primary; ctx.lineWidth = r * 0.03; ctx.stroke();
  // crystal spire crown
  for (const [x, y, a, l, w, c] of [[-0.82, -0.3, -1.0, 0.45, 0.09, cj], [0.82, -0.3, 1.0, 0.45, 0.09, cv], [-0.6, -0.56, -0.55, 0.62, 0.12, cv], [0.58, -0.56, 0.52, 0.66, 0.12, ct], [-0.32, -0.7, -0.22, 0.8, 0.14, ct], [0.3, -0.72, 0.24, 0.74, 0.13, cj], [-0.02, -0.74, 0.02, 0.88, 0.16, cv]]) {
    sxbShard(ctx, x * r, y * r, a + Math.sin(t * 1.2 + x * 4) * 0.02, l * r, w * r, c);
  }
  drawGlow(ctx, 0, -r * 1.2, r * 0.7, rage ? '#ff4d5a' : '#b48cff', 0.3);
  // root arms with claw-roots
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.6 + s) * r * 0.06;
    const hx = s * r * 1.0 + sw, hy = r * 0.72;
    for (const [col, lw] of [[pal.dark, 0.26], [wood.shade, 0.19], [wood.primary, 0.09]]) {
      ctx.strokeStyle = col; ctx.lineWidth = r * lw;
      ctx.beginPath(); ctx.moveTo(s * r * 0.7, -r * 0.15); ctx.quadraticCurveTo(s * r * 1.22, r * 0.12, hx, hy); ctx.stroke();
    }
    for (const k of [-1.2, -0.4, 0.4, 1.2]) {
      sxbHorn(ctx, hx, hy, hx + s * r * 0.05 + k * r * 0.08, hy + r * 0.2, hx + k * r * 0.14 + s * r * 0.04, hy + r * 0.32, r * 0.04, wood.dark, wood.primary);
    }
  }
  // trunk
  sxbShade(ctx, () => sxbSmooth(ctx, r, SXB_ELDER_BODY), pal, r);
  ctx.save(); sxbSmooth(ctx, r, SXB_ELDER_BODY); ctx.clip();
  ctx.strokeStyle = pal.dark; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1.4, r * 0.03);
  ctx.beginPath();
  for (const x of [-0.72, -0.52, -0.3, 0.32, 0.54, 0.74]) { ctx.moveTo(x * r, -r * 0.7); ctx.quadraticCurveTo(x * r + r * 0.1, r * 0.1, x * r - r * 0.05, r * 0.85); }
  for (const [x, y] of [[-0.6, 0.35], [0.62, -0.05]]) { ctx.moveTo((x + 0.08) * r, y * r); ctx.ellipse(x * r, y * r, r * 0.08, r * 0.05, 0, 0, SXB_TAU); }
  ctx.stroke();
  ctx.fillStyle = '#3a8a6a'; ctx.globalAlpha = A * 0.45;
  ctx.beginPath(); ctx.ellipse(-r * 0.7, -r * 0.45, r * 0.24, r * 0.14, -0.5, 0, SXB_TAU); ctx.ellipse(r * 0.66, -r * 0.5, r * 0.2, r * 0.12, 0.5, 0, SXB_TAU); ctx.ellipse(r * 0.58, r * 0.5, r * 0.16, r * 0.1, 0.4, 0, SXB_TAU); ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  // glowing rune cracks on the cheeks
  const cw = Math.max(1.2, r * 0.03);
  sxbCrack(ctx, r, [-0.7, -0.1, -0.56, 0.05, -0.62, 0.22, -0.5, 0.38], glow, '#ffffff', cw);
  sxbCrack(ctx, r, [0.72, -0.15, 0.58, 0.02, 0.66, 0.2, 0.54, 0.35], glow, '#ffffff', cw);
  // brow shelf over sunken eye hollows
  ctx.fillStyle = '#050202';
  ctx.beginPath();
  for (const s of [-1, 1]) ctx.ellipse(s * r * 0.28, -r * 0.16, r * 0.2, r * 0.12, s * 0.3, 0, SXB_TAU);
  ctx.fill();
  sxbEyes(ctx, 0, -r * 0.15, r * 0.13, r * 0.28, glow, '#ffffff', 1, 0.75 + heave * 0.25, 0.35);
  if (heave > 0) for (const s of [-1, 1]) drawGlow(ctx, s * r * 0.28, -r * 0.15, r * 0.35 * heave, glow, heave * 0.6);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.66, -0.4, -0.3, -0.42, 0, -0.28, 0.3, -0.42, 0.66, -0.4, 0.5, -0.26, 0.18, -0.22, 0, -0.12, -0.18, -0.22, -0.5, -0.26]), wood, r * 0.6);
  // gnarled nose ridge
  ctx.strokeStyle = wood.light; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1.2, r * 0.035);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.quadraticCurveTo(r * 0.04, r * 0.02, -r * 0.02, r * 0.14); ctx.stroke();
  ctx.globalAlpha = A;
  // maw with splinter teeth and the heart crystal
  const mh = r * (0.14 + heave * 0.12);
  ctx.fillStyle = '#060202';
  ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.36, mh, 0, 0, SXB_TAU); ctx.fill();
  drawGlow(ctx, 0, r * 0.42, r * (0.22 + heave * 0.35), glow, 0.55 + heave * 0.45);
  sxbShard(ctx, 0, r * 0.4 + mh * 0.6, 0, mh * 1.2, r * 0.07, rage ? sxbMat(m, '#ffd0d0', '#ff4d5a', '#7a0a14', '#200204', '#ffd0d0') : ct);
  const teeth = sxbC(m, '#c8b48a');
  sxbFangs(ctx, -r * 0.32, r * 0.32, r * 0.4 - mh * 0.85, 7, r * 0.12, teeth, 1);
  sxbFangs(ctx, -r * 0.26, r * 0.26, r * 0.4 + mh * 0.9, 6, r * 0.09, teeth, -1);
  // root beard
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.4, r * 0.035);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const x = (-0.45 + i * 0.15) * r, sway = Math.sin(t * 1.8 + i) * r * 0.05;
    ctx.moveTo(x, r * 0.68); ctx.quadraticCurveTo(x + sway, r * 0.86, x + sway * 1.6, r * (0.98 + (i % 3) * 0.06));
  }
  ctx.stroke();
}

// ------------------------------------------------------------- DRACONIC ----

// Cinderclaw Kobold — lean obsidian-scaled raider crouched low: swept bone
// horns and cheek frills, ember eyes, a fanged snout, spiked pauldron,
// tattered loincloth and a barbed, heat-edged glaive levelled to charge.
function sxbKobold(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const burst = ph === 'burst', coil = ph === 'windup';
  const run = m.anim * (burst ? 3.8 : 2.6), step = Math.sin(run);
  ctx.translate(0, -Math.abs(step) * r * 0.06 + (coil ? r * 0.06 : 0));
  const belly = sxbMat(m, '#f0c890', '#b8804a', '#6a3e1c', '#1e0e04', '#ffb35c');
  const iron = sxbMat(m, '#d0ccd4', '#6a6672', '#2a2830', '#08080c', '#ff9a3d');
  const bone = sxbC(m, '#e2d4b4');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // tail
  const tx = -r * 1.0 + Math.sin(t * 6 + m.seed) * r * 0.15, ty = r * 0.05;
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.45); ctx.quadraticCurveTo(-r * 0.72, r * 0.68, tx, ty); ctx.quadraticCurveTo(-r * 0.66, r * 0.4, -r * 0.24, r * 0.24); ctx.closePath(); }, pal, r * 0.5);
  // digitigrade legs
  for (const s of [-1, 1]) {
    const sw = Math.sin(run + (s > 0 ? Math.PI : 0));
    const ax = s * r * (0.26 + sw * 0.08), ay = r * 0.7 - Math.max(0, sw) * r * 0.08;
    for (const [col, lw] of [[pal.dark, 0.17], [pal.shade, 0.09]]) {
      ctx.strokeStyle = col; ctx.lineWidth = r * lw;
      ctx.beginPath(); ctx.moveTo(s * r * 0.18, r * 0.3); ctx.lineTo(s * r * 0.38, r * 0.5); ctx.lineTo(ax, ay); ctx.stroke();
    }
    ctx.fillStyle = bone;
    ctx.beginPath();
    for (const k of [-1, 0, 1]) { const cx = ax + k * r * 0.06; ctx.moveTo(cx - r * 0.025, ay); ctx.lineTo(cx + k * r * 0.03, ay + r * 0.12); ctx.lineTo(cx + r * 0.025, ay); }
    ctx.fill();
  }
  // tattered loincloth
  ctx.fillStyle = sxbC(m, '#3a1e16');
  sxbPath(ctx, r, [-0.24, 0.3, 0.24, 0.3, 0.2, 0.52, 0.12, 0.44, 0.06, 0.62, -0.02, 0.46, -0.1, 0.58, -0.16, 0.44, -0.22, 0.5]); ctx.fill();
  // hunched torso
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.34, -0.22, -0.4, 0.1, -0.26, 0.4, 0.26, 0.4, 0.4, 0.1, 0.34, -0.22, 0, -0.32]), pal, r * 0.6);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.15, -0.12, 0.15, -0.12, 0.12, 0.34, -0.12, 0.34]), belly, r * 0.35, false);
  ctx.strokeStyle = belly.shade; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  for (const y of [-0.02, 0.1, 0.22]) { ctx.moveTo(-r * 0.14, y * r); ctx.lineTo(r * 0.14, y * r); }
  ctx.stroke();
  // belt
  ctx.strokeStyle = iron.shade; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(-r * 0.28, r * 0.33); ctx.lineTo(r * 0.28, r * 0.33); ctx.stroke();
  // left arm with claws
  for (const [col, lw] of [[pal.dark, 0.13], [pal.shade, 0.07]]) {
    ctx.strokeStyle = col; ctx.lineWidth = r * lw;
    ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.12); ctx.lineTo(-r * 0.52, r * 0.1); ctx.lineTo(-r * 0.44, r * 0.28); ctx.stroke();
  }
  ctx.fillStyle = bone;
  ctx.beginPath();
  for (const k of [-1, 0, 1]) { const cx = -r * 0.44 + k * r * 0.05; ctx.moveTo(cx - r * 0.02, r * 0.28); ctx.lineTo(cx + k * r * 0.03, r * 0.38); ctx.lineTo(cx + r * 0.02, r * 0.28); }
  ctx.fill();
  // spiked pauldron
  sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(-r * 0.33, -r * 0.2, r * 0.16, r * 0.11, -0.3, 0, SXB_TAU); }, iron, r * 0.25);
  sxbHorn(ctx, -r * 0.38, -r * 0.26, -r * 0.48, -r * 0.4, -r * 0.5, -r * 0.5, r * 0.04, iron.light, null, iron.dark);
  sxbHorn(ctx, -r * 0.26, -r * 0.28, -r * 0.3, -r * 0.4, -r * 0.3, -r * 0.48, r * 0.035, iron.light, null, iron.dark);
  // barbed glaive
  const level = coil || burst ? 1 : 0;
  ctx.save();
  ctx.translate(r * 0.46, r * 0.1);
  ctx.rotate(0.22 + level * 1.0);
  ctx.strokeStyle = sxbC(m, '#2e1c12'); ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(0, r * 0.55); ctx.lineTo(0, -r * 0.72); ctx.stroke();
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, -r * 0.68);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.95, r * 0.02, -r * 1.22);
    ctx.quadraticCurveTo(r * 0.1, -r * 0.98, r * 0.06, -r * 0.88);
    ctx.lineTo(r * 0.16, -r * 0.84); ctx.lineTo(r * 0.05, -r * 0.76); ctx.lineTo(r * 0.05, -r * 0.68);
    ctx.closePath();
  }, iron, r * 0.3);
  ctx.strokeStyle = '#ff8a3d'; ctx.globalAlpha = A * (0.6 + level * 0.4); ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.8); ctx.quadraticCurveTo(-r * 0.16, -r * 1.0, r * 0.02, -r * 1.2); ctx.stroke();
  ctx.globalAlpha = A;
  ctx.strokeStyle = iron.light; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.62); ctx.lineTo(r * 0.05, -r * 0.62); ctx.stroke();
  ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.08, r * 0.06, 0, 0, SXB_TAU); ctx.fill();
  ctx.restore();
  // head: horns + frills, wedge snout
  ctx.save();
  ctx.translate(0, coil ? r * 0.04 : 0);
  for (const s of [-1, 1]) {
    sxbHorn(ctx, s * r * 0.2, -r * 0.66, s * r * 0.36, -r * 0.98, s * r * 0.6, -r * 1.02, r * 0.07, bone, sxbC(m, '#fff6e0'), pal.dark);
    ctx.fillStyle = pal.shade;
    sxbPath(ctx, 1, [s * r * 0.3, -r * 0.62, s * r * 0.56, -r * 0.62, s * r * 0.4, -r * 0.52, s * r * 0.58, -r * 0.44, s * r * 0.36, -r * 0.4]); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.025); ctx.stroke();
  }
  const head = [-0.18, -0.76, -0.32, -0.64, -0.36, -0.46, -0.22, -0.3, -0.11, -0.12, 0, -0.08, 0.11, -0.12, 0.22, -0.3, 0.36, -0.46, 0.32, -0.64, 0.18, -0.76, 0, -0.79];
  sxbShade(ctx, () => sxbPath(ctx, r, head), pal, r * 0.45);
  ctx.save(); sxbPath(ctx, r, head); ctx.clip();
  sxbScales(ctx, -r * 0.34, -r * 0.78, r * 0.68, r * 0.2, r * 0.12, pal.dark, Math.max(0.8, r * 0.02));
  ctx.restore();
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.4;
  sxbPath(ctx, r, [-0.05, -0.42, 0.05, -0.42, 0.03, -0.15, -0.03, -0.15]); ctx.fill();
  ctx.globalAlpha = A;
  sxbEyes(ctx, 0, -r * 0.49, r * 0.095, r * 0.15, pal.glow, '#fff4c0', crBlink(m, t), 0.5);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.3, -r * 0.64); ctx.lineTo(s * r * 0.06, -r * 0.55); }
  ctx.stroke();
  // jaw line, fangs, nostrils
  const open = burst || coil ? 1 : 0;
  ctx.strokeStyle = '#1a0402'; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.28, -r * 0.36); ctx.quadraticCurveTo(s * r * 0.16, -r * 0.2, s * r * 0.04, -r * 0.13); }
  ctx.stroke();
  if (open) {
    ctx.fillStyle = '#2a0604';
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.13); ctx.lineTo(r * 0.1, -r * 0.13); ctx.lineTo(0, -r * 0.0); ctx.closePath(); ctx.fill();
    drawGlow(ctx, 0, -r * 0.08, r * 0.15, pal.glow, 0.6);
  }
  ctx.fillStyle = sxbC(m, '#f4ead4');
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.18, -r * 0.24); ctx.lineTo(s * r * 0.15, -r * 0.13); ctx.lineTo(s * r * 0.12, -r * 0.2); ctx.moveTo(s * r * 0.08, -r * 0.14); ctx.lineTo(s * r * 0.06, -r * 0.05); ctx.lineTo(s * r * 0.035, -r * 0.12); }
  ctx.fill();
  ctx.fillStyle = '#1a0402';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.05, -r * 0.16, r * 0.025, r * 0.015, s * 0.5, 0, SXB_TAU); ctx.fill(); }
  ctx.restore();
}

// Slagfiend — molten fiend under split basalt plates: lava glows through
// every seam, ember-slit eyes under a brow plate, a maw of black stone
// fangs over liquid fire; drips lava, smokes, and sheds embers.
const SXB_SLAG_PLATES = [
  [-0.98, -0.06, -0.82, -0.56, -0.42, -0.66, -0.36, -0.36, -0.56, -0.08],
  [-0.32, -0.7, 0.08, -1.05, 0.42, -0.66, 0.16, -0.46, -0.28, -0.42],
  [0.48, -0.62, 0.9, -0.48, 1.02, 0.0, 0.64, 0.02, 0.44, -0.32],
  [-0.96, 0.04, -0.58, 0.06, -0.48, 0.42, -0.9, 0.6],
  [0.62, 0.12, 1.0, 0.1, 0.9, 0.6, 0.5, 0.44],
  [-0.46, -0.3, 0.38, -0.36, 0.36, -0.14, 0, -0.08, -0.36, -0.12],
];
function sxbMagma(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.5;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.25 - air * 0.1, 1 - coil * 0.25 + air * 0.15);
  ctx.translate(0, -r * 0.5);
  drawGlow(ctx, 0, r * 0.1, r * 1.35, '#ff5a1a', 0.4);
  const lava = sxbMat(m, '#fff2a8', '#ffa030', '#d0300a', '#3a0802', '#fff0a0');
  const seed = m.seed;
  const body = () => {
    ctx.beginPath();
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * SXB_TAU;
      const wob = 1 + Math.sin(a * 3 + t * 4 + seed) * 0.04;
      let k = 1;
      if (Math.sin(a) < -0.25 && i % 2 === 0) k = 1.16;
      let y = Math.sin(a) * r * 0.86 * wob * k;
      if (y > r * 0.5) y = r * 0.5 + (y - r * 0.5) * 0.3;
      const x = Math.cos(a) * r * 0.98 * wob * k;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  sxbShade(ctx, body, lava, r, false);
  // basalt crust plates with lit top edges; seams stay molten
  ctx.save(); body(); ctx.clip();
  for (const p of SXB_SLAG_PLATES) {
    sxbPath(ctx, r, p);
    ctx.fillStyle = pal.primary; ctx.fill();
    ctx.strokeStyle = pal.light; ctx.globalAlpha = A * 0.55; ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath(); ctx.moveTo(p[0] * r, p[1] * r); ctx.lineTo(p[2] * r, p[3] * r); ctx.lineTo(p[4] * r, p[5] * r); ctx.stroke();
    ctx.globalAlpha = A;
  }
  ctx.fillStyle = pal.dark; ctx.globalAlpha = A * 0.45;
  sxbPath(ctx, r, [0.64, 0.02, 1.02, 0.0, 0.9, -0.3]); ctx.fill();
  sxbPath(ctx, r, [-0.56, -0.08, -0.36, -0.36, -0.7, -0.3]); ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  body(); ctx.strokeStyle = '#120404'; ctx.lineWidth = Math.max(1.6, r * 0.07); ctx.stroke();
  // ember eyes under the brow plate
  sxbEyes(ctx, 0, r * 0.0, r * 0.13, r * 0.24, '#ffd060', '#ffffff', crBlink(m, t), 0.55, 0.3);
  // maw of basalt fangs over liquid fire
  const open = 0.3 + air * 0.5 + coil * 0.4;
  drawGlow(ctx, 0, r * 0.3, r * (0.3 + open * 0.15), '#ffe08a', 0.7);
  const fang = sxbC(m, '#1a0e0e');
  sxbFangs(ctx, -r * 0.42, r * 0.42, r * 0.12, 6, r * (0.12 + open * 0.04), fang, 1);
  sxbFangs(ctx, -r * 0.36, r * 0.36, r * (0.44 + open * 0.06), 5, r * (0.1 + open * 0.05), fang, -1);
  // lava drips
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.7 + i * 0.5 + seed * 0.21) % 1;
    const x = (i ? 0.45 : -0.5) * r, y = r * 0.5 + p * r * 0.35;
    ctx.globalAlpha = A * (1 - p);
    ctx.fillStyle = '#ffb040';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.12); ctx.quadraticCurveTo(x + r * 0.06, y, x, y + r * 0.05); ctx.quadraticCurveTo(x - r * 0.06, y, x, y - r * 0.12); ctx.fill();
  }
  // smoke + embers
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.5 + i * 0.5 + seed) % 1;
    ctx.globalAlpha = A * 0.35 * (1 - p);
    ctx.fillStyle = '#4a3c3c';
    ctx.beginPath(); ctx.arc(Math.sin(i * 3 + t) * r * 0.3, -r * 0.85 - p * r * 0.9, r * (0.12 + p * 0.2), 0, SXB_TAU); ctx.fill();
    const q = (t * 0.9 + i * 0.37 + seed * 0.5) % 1;
    ctx.globalAlpha = A * (1 - q);
    ctx.fillStyle = '#ffd060';
    ctx.beginPath(); ctx.arc((i ? 0.3 : -0.35) * r + Math.sin(t * 3 + i) * r * 0.1, -r * 0.6 - q * r * 0.9, Math.max(0.8, r * 0.035), 0, SXB_TAU); ctx.fill();
  }
  ctx.globalAlpha = A;
}

// Ashwing — hell bat: obsidian membranes split by lava veins, torn trailing
// edges, wrist hooks, burning wingtips; tall ears, a pug nose-leaf and a
// fanged maw that glows hotter as it charges.
function sxbFireBat(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 24 : 13) + m.seed);
  const heat = m.windup || 0;
  const mem = sxbMat(m, '#7a3a34', '#3a1416', '#1a0608', '#060203', '#ff7a2a');
  const bone = sxbC(m, '#4a2e2a');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.rotate(-flap * 0.35);
    const ky = -r * 0.6 + flap * r * 0.15, tipY = -r * 0.25 + flap * r * 0.35;
    sxbShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.15);
      ctx.lineTo(r * 0.72, ky);
      ctx.lineTo(r * 1.42, tipY);
      ctx.quadraticCurveTo(r * 1.22, r * 0.1, r * 1.16, r * 0.34);
      ctx.lineTo(r * 1.08, r * 0.24); ctx.lineTo(r * 1.02, r * 0.3);
      ctx.quadraticCurveTo(r * 0.92, r * 0.14, r * 0.8, r * 0.38);
      ctx.quadraticCurveTo(r * 0.6, r * 0.14, r * 0.26, r * 0.3);
      ctx.closePath();
    }, mem, r * 0.8);
    // lava veins
    ctx.strokeStyle = pal.glow; ctx.globalAlpha = A * (0.45 + heat * 0.4); ctx.lineWidth = Math.max(0.8, r * 0.028);
    ctx.beginPath();
    ctx.moveTo(r * 0.72, ky); ctx.quadraticCurveTo(r * 0.9, r * 0.0, r * 1.12, r * 0.28);
    ctx.moveTo(r * 0.72, ky); ctx.quadraticCurveTo(r * 0.72, r * 0.05, r * 0.8, r * 0.34);
    ctx.moveTo(r * 0.45, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.18);
    ctx.stroke();
    ctx.globalAlpha = A;
    // bones
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.15); ctx.lineTo(r * 0.72, ky); ctx.lineTo(r * 1.42, tipY); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, r * 0.035);
    ctx.beginPath(); ctx.moveTo(r * 0.72, ky); ctx.lineTo(r * 1.14, r * 0.32); ctx.moveTo(r * 0.72, ky); ctx.lineTo(r * 0.8, r * 0.36); ctx.stroke();
    // wrist hook
    sxbHorn(ctx, r * 0.72, ky, r * 0.7, ky - r * 0.12, r * 0.62, ky - r * 0.18, r * 0.035, sxbC(m, '#d8c8b0'));
    // burning tip
    const f = 0.8 + 0.2 * Math.sin(t * 20 + m.seed + s);
    drawGlow(ctx, r * 1.42, tipY, r * 0.38 * f, '#ff7a2a', 0.85);
    sxbFlame(ctx, r * 1.42, tipY + r * 0.04, r * 0.06, r * 0.26 * f, Math.sin(t * 14 + s) * r * 0.05, '#ffd060');
    ctx.restore();
  }
  // ears
  for (const s of [-1, 1]) {
    sxbShade(ctx, () => sxbPath(ctx, r, [s * 0.1, -0.32, s * 0.4, -0.95, s * 0.44, -0.3]), mem, r * 0.4);
    ctx.fillStyle = pal.glow; ctx.globalAlpha = A * 0.55;
    sxbPath(ctx, r, [s * 0.2, -0.36, s * 0.38, -0.78, s * 0.38, -0.36]); ctx.fill();
    ctx.globalAlpha = A;
  }
  // body
  // furred torso under a shaggy collar, separate horned skull
  sxbShade(ctx, () => sxbSmooth(ctx, r, [0, 0.0, 0.3, 0.04, 0.34, 0.32, 0.18, 0.6, 0, 0.66, -0.18, 0.6, -0.34, 0.32, -0.3, 0.04]), pal, r * 0.5);
  sxbCrack(ctx, r, [-0.04, 0.56, 0.04, 0.44, -0.03, 0.34, 0.03, 0.24], pal.glow, '#ffe0a0', Math.max(1, r * 0.035));
  ctx.fillStyle = pal.dark;
  sxbPath(ctx, r, [-0.4, 0.0, -0.3, 0.2, -0.2, 0.12, -0.12, 0.28, 0, 0.16, 0.12, 0.28, 0.2, 0.12, 0.3, 0.2, 0.4, 0.0, 0, -0.1]); ctx.fill();
  for (const s of [-1, 1]) sxbHorn(ctx, s * r * 0.16, -r * 0.36, s * r * 0.2, -r * 0.5, s * r * 0.12, -r * 0.58, r * 0.035, sxbC(m, '#d8c8b0'), null, pal.dark);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.3, -0.4, -0.38, -0.14, -0.22, 0.08, 0, 0.17, 0.22, 0.08, 0.38, -0.14, 0.3, -0.4, 0, -0.46]), pal, r * 0.45);
  // nose-leaf, eyes, glowing fanged maw
  ctx.fillStyle = pal.shade;
  sxbPath(ctx, r, [-0.07, -0.08, 0, -0.24, 0.07, -0.08, 0, -0.02]); ctx.fill();
  sxbEyes(ctx, 0, -r * 0.18, r * 0.1, r * 0.18, '#ffb84a', '#fff4c0', crBlink(m, t), 0.5);
  const open = 0.3 + heat * 0.7 + (fast ? 0.5 : 0);
  ctx.fillStyle = '#2a0402';
  ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.04); ctx.quadraticCurveTo(0, r * (0.1 + open * 0.22), r * 0.18, r * 0.04); ctx.quadraticCurveTo(0, r * 0.1, -r * 0.18, r * 0.04); ctx.fill();
  drawGlow(ctx, 0, r * 0.1, r * (0.18 + heat * 0.3), '#ff6a2a', 0.4 + heat * 0.5);
  ctx.fillStyle = sxbC(m, '#fff0e0');
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.13, r * 0.05); ctx.lineTo(s * r * 0.1, r * (0.16 + open * 0.05)); ctx.lineTo(s * r * 0.07, r * 0.065);
    ctx.moveTo(s * r * 0.07, r * (0.1 + open * 0.2)); ctx.lineTo(s * r * 0.05, r * (0.04 + open * 0.14)); ctx.lineTo(s * r * 0.03, r * (0.1 + open * 0.2));
  }
  ctx.fill();
}

// Ashen Knight — blackened plate with lava seams, spiked pauldrons, a
// horned great-helm with a burning V-visor and flame crest, tattered
// crimson cloak, a spiked tower shield and a molten-edged greatsword that
// rises and blazes before it hurls fire.
function sxbEmberKnight(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.7);
  const raise = m.windup || 0;
  ctx.translate(0, Math.abs(step) * r * 0.03);
  const cloth = sxbMat(m, '#b83a2a', '#6a1410', '#300606', '#0c0202', '#ff8a3d');
  const steel = pal;
  const horn = sxbC(m, '#2e2626');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // tattered cloak
  const c1 = Math.sin(t * 3.5) * r * 0.05, c2 = Math.sin(t * 3.5 + 1.3) * r * 0.05;
  sxbShade(ctx, () => sxbPath(ctx, 1, [-r * 0.42, -r * 0.4, r * 0.42, -r * 0.4, r * 0.6 + c1, r * 0.72, r * 0.44, r * 0.62, r * 0.3 + c1, r * 0.82, r * 0.12, r * 0.66, -r * 0.05 + c2, r * 0.86, -r * 0.22, r * 0.68, -r * 0.38 + c2, r * 0.82, -r * 0.6 + c2, r * 0.7]), cloth, r * 0.8);
  // greaves
  for (const s of [-1, 1]) {
    const x = s * r * 0.18 + Math.sin(s * step * 0.4) * r * 0.2;
    sxbShade(ctx, () => sxbPath(ctx, 1, [x - r * 0.12, r * 0.32, x + r * 0.12, r * 0.32, x + r * 0.11, r * 0.8, x + r * 0.16, r * 0.9, x - r * 0.16, r * 0.9, x - r * 0.11, r * 0.8]), steel, r * 0.4);
    ctx.fillStyle = steel.light;
    sxbPath(ctx, 1, [x - r * 0.06, r * 0.5, x + r * 0.06, r * 0.5, x, r * 0.62]); ctx.fill();
  }
  // breastplate with lava seams
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.38, -0.4, 0.38, -0.4, 0.34, 0.04, 0.24, 0.38, -0.24, 0.38, -0.34, 0.04]), steel, r * 0.8);
  ctx.strokeStyle = steel.light; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.38); ctx.lineTo(0, r * 0.2); ctx.stroke();
  ctx.globalAlpha = A;
  ctx.strokeStyle = steel.dark; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  for (const y of [0.2, 0.3]) { ctx.moveTo(-r * 0.28, y * r); ctx.quadraticCurveTo(0, (y + 0.06) * r, r * 0.28, y * r); }
  ctx.stroke();
  sxbCrack(ctx, r, [-0.22, -0.3, -0.12, -0.12, -0.2, 0.06], pal.glow, '#ffe0a0', Math.max(1, r * 0.035));
  sxbCrack(ctx, r, [0.24, -0.22, 0.14, -0.04], pal.glow, '#ffe0a0', Math.max(1, r * 0.03));
  drawGlow(ctx, 0, -r * 0.05, r * 0.18, pal.glow, 0.5 + raise * 0.4);
  // spiked pauldrons
  for (const s of [-1, 1]) {
    sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(s * r * 0.4, -r * 0.34, r * 0.2, r * 0.14, s * 0.25, 0, SXB_TAU); }, steel, r * 0.3);
    sxbHorn(ctx, s * r * 0.46, -r * 0.42, s * r * 0.56, -r * 0.56, s * r * 0.6, -r * 0.7, r * 0.05, horn, steel.light, steel.dark);
    sxbHorn(ctx, s * r * 0.32, -r * 0.44, s * r * 0.36, -r * 0.56, s * r * 0.36, -r * 0.64, r * 0.04, horn, steel.light, steel.dark);
  }
  // tower shield (left)
  ctx.save();
  ctx.translate(-r * 0.52, r * 0.08);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.22, -0.38, 0.22, -0.38, 0.26, -0.04, 0, 0.44, -0.26, -0.04]), steel, r * 0.45);
  ctx.strokeStyle = steel.light; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(1, r * 0.03);
  sxbPath(ctx, r, [-0.17, -0.32, 0.17, -0.32, 0.2, -0.04, 0, 0.36, -0.2, -0.04]); ctx.stroke();
  ctx.globalAlpha = A;
  ctx.globalAlpha = A * 0.85;
  sxbCrack(ctx, r, [-0.1, -0.2, -0.04, 0.12], pal.glow, '#ffe0a0', Math.max(1, r * 0.035));
  sxbCrack(ctx, r, [0.0, -0.24, 0.04, 0.16], pal.glow, '#ffe0a0', Math.max(1, r * 0.035));
  sxbCrack(ctx, r, [0.1, -0.2, 0.1, 0.1], pal.glow, '#ffe0a0', Math.max(1, r * 0.035));
  ctx.globalAlpha = A;
  for (const s of [-1, 1]) sxbHorn(ctx, s * r * 0.2, -r * 0.36, s * r * 0.26, -r * 0.46, s * r * 0.3, -r * 0.54, r * 0.04, horn, null, steel.dark);
  ctx.restore();
  // greatsword (right) — rises and blazes with the charge
  ctx.save();
  ctx.translate(r * 0.52, -r * 0.02);
  ctx.rotate(-0.25 - raise * 0.9);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.075, 0.06, -0.075, -0.95, 0, -1.1, 0.075, -0.95, 0.075, 0.06]), sxbMat(m, '#8a8890', '#3a3840', '#18161c', '#060508', '#ff8a3d'), r * 0.4);
  ctx.strokeStyle = '#ff7a2a'; ctx.globalAlpha = A * (0.55 + raise * 0.45); ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.moveTo(-r * 0.07, 0); ctx.lineTo(-r * 0.07, -r * 0.94); ctx.lineTo(0, -r * 1.08); ctx.lineTo(r * 0.07, -r * 0.94); ctx.lineTo(r * 0.07, 0); ctx.stroke();
  ctx.strokeStyle = '#ffe0a0'; ctx.globalAlpha = A * raise; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(0, -r * 0.92); ctx.stroke();
  ctx.globalAlpha = A;
  for (let i = 0; i < 3; i++) drawGlow(ctx, Math.sin(t * 12 + i) * r * 0.04, -r * (0.3 + i * 0.3), r * (0.12 + raise * 0.16), '#ff6a2a', 0.35 + raise * 0.5);
  ctx.fillStyle = steel.shade;
  sxbPath(ctx, r, [-0.24, 0.06, -0.3, -0.04, -0.08, 0.04, 0.08, 0.04, 0.3, -0.04, 0.24, 0.06, 0.08, 0.12, -0.08, 0.12]); ctx.fill();
  ctx.strokeStyle = steel.dark; ctx.lineWidth = Math.max(1, r * 0.025); ctx.stroke();
  ctx.strokeStyle = sxbC(m, '#2a1410'); ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(0, r * 0.12); ctx.lineTo(0, r * 0.28); ctx.stroke();
  ctx.restore();
  // horned great-helm
  for (const s of [-1, 1]) sxbHorn(ctx, s * r * 0.2, -r * 0.7, s * r * 0.56, -r * 0.78, s * r * 0.46, -r * 1.12, r * 0.07, horn, sxbC(m, '#6a5a54'), steel.dark);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.2, -0.4, -0.24, -0.68, -0.15, -0.83, 0, -0.88, 0.15, -0.83, 0.24, -0.68, 0.2, -0.4, 0, -0.34]), steel, r * 0.35);
  ctx.strokeStyle = steel.light; ctx.globalAlpha = A * 0.5; ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.86); ctx.lineTo(0, -r * 0.68); ctx.stroke();
  ctx.globalAlpha = A;
  // burning V-visor + breathing slots
  drawGlow(ctx, 0, -r * 0.6, r * (0.24 + raise * 0.12), '#ff6a2a', 0.85);
  ctx.fillStyle = '#080406';
  sxbPath(ctx, r, [-0.19, -0.66, 0, -0.56, 0.19, -0.66, 0.19, -0.6, 0, -0.5, -0.19, -0.6]); ctx.fill();
  ctx.fillStyle = sxbC(m, '#ff9a3d');
  sxbPath(ctx, r, [-0.16, -0.635, 0, -0.545, 0.16, -0.635, 0.16, -0.61, 0, -0.525, -0.16, -0.61]); ctx.fill();
  ctx.fillStyle = '#080406';
  for (const x of [-0.08, 0, 0.08]) ctx.fillRect(x * r - r * 0.012, -r * 0.48, r * 0.024, r * 0.08);
  // flame crest
  for (let i = 0; i < 3; i++) {
    const f = 0.8 + 0.2 * Math.sin(t * 11 + i * 2);
    sxbFlame(ctx, (i - 1) * r * 0.07, -r * 0.84, r * 0.06, r * (0.3 - Math.abs(i - 1) * 0.1) * f, Math.sin(t * 8 + i) * r * 0.05, i === 1 ? '#ffd060' : '#ff7a2a');
  }
}

// Scorchback Drake — hulking low drake: armoured obsidian hide over
// glowing seams, a fan of dorsal spikes, swept horns, a fanged jaw and a
// molten throat that blazes as it rears for the slam.
function sxbDrake(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.4);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const heat = Math.max(rear, m.windup || 0);
  ctx.translate(0, Math.abs(step) * r * 0.05 - rear * r * 0.15);
  const bone = sxbC(m, '#e2d4b8');
  const boneHi = sxbC(m, '#fff8e8');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // tail sweeping behind
  const tw = Math.sin(t * 2.5 + m.seed) * r * 0.15;
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.3); ctx.quadraticCurveTo(r * 1.0, r * 0.5, r * 1.2 + tw, r * 0.05); ctx.quadraticCurveTo(r * 0.95, r * 0.25, r * 0.4, r * 0.05); ctx.closePath(); }, pal, r * 0.5);
  sxbHorn(ctx, r * 1.12 + tw, r * 0.1, r * 1.25 + tw, -r * 0.05, r * 1.3 + tw, -r * 0.14, r * 0.05, bone, null, pal.dark);
  // dorsal spike fan
  for (let i = 0; i <= 8; i++) {
    const a = -2.75 + i * (2.2 / 8);
    const x = Math.cos(a) * r * 0.72, y = -r * 0.12 + Math.sin(a) * r * 0.55;
    const L = r * (0.3 + (1 - Math.abs(i - 4) / 4) * 0.18);
    sxbHorn(ctx, x, y, x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6, x + Math.cos(a - 0.15) * L, y + Math.sin(a - 0.15) * L, r * 0.07, pal.dark, pal.shade);
  }
  // hind legs
  for (const s of [-1, 1]) sxbShade(ctx, () => sxbPath(ctx, r, [s * 0.58, 0.2, s * 0.86, 0.3, s * 0.84, 0.72, s * 0.62, 0.74]), pal, r * 0.35);
  // body
  const body = [-0.85, 0.1, -0.78, -0.3, -0.45, -0.55, 0, -0.6, 0.45, -0.55, 0.78, -0.3, 0.85, 0.1, 0.6, 0.45, 0, 0.55, -0.6, 0.45];
  sxbShade(ctx, () => sxbSmooth(ctx, r, body), pal, r);
  ctx.save(); sxbSmooth(ctx, r, body); ctx.clip();
  sxbScales(ctx, -r * 0.85, -r * 0.6, r * 1.7, r * 0.5, r * 0.16, pal.dark, Math.max(0.8, r * 0.025));
  ctx.restore();
  // chest seams glow hotter with the charge
  ctx.globalAlpha = A * (0.45 + heat * 0.55);
  sxbCrack(ctx, r, [-0.3, 0.45, -0.18, 0.25, -0.24, 0.08], pal.glow, '#ffe0a0', Math.max(1, r * 0.04));
  sxbCrack(ctx, r, [0.3, 0.45, 0.2, 0.26, 0.26, 0.1], pal.glow, '#ffe0a0', Math.max(1, r * 0.04));
  ctx.globalAlpha = A;
  if (heat > 0.05) drawGlow(ctx, 0, r * 0.3, r * 0.5 * heat, '#ff6a2a', heat * 0.8);
  // front legs with talons
  for (const [s, ph2] of [[-1, 0], [1, Math.PI]]) {
    const fx = s * r * 0.5 + Math.sin(m.anim * 1.4 + ph2) * r * 0.08, fy = r * 0.84;
    sxbShade(ctx, () => sxbPath(ctx, 1, [s * r * 0.32, -r * 0.02, s * r * 0.72, r * 0.04, s * r * 0.74, r * 0.46, fx + s * r * 0.16, fy, fx - s * r * 0.16, fy, s * r * 0.42, r * 0.46]), pal, r * 0.45);
    ctx.fillStyle = bone;
    ctx.beginPath();
    for (const k of [-1, 0, 1]) { const cx = fx + k * r * 0.1; ctx.moveTo(cx - r * 0.04, fy - r * 0.02); ctx.lineTo(cx + k * r * 0.03, fy + r * 0.13); ctx.lineTo(cx + r * 0.04, fy - r * 0.02); }
    ctx.fill();
  }
  // head
  ctx.save();
  ctx.translate(0, -r * 0.12 - rear * r * 0.15);
  for (const s of [-1, 1]) {
    sxbHorn(ctx, s * r * 0.28, -r * 0.24, s * r * 0.55, -r * 0.42, s * r * 0.74, -r * 0.66, r * 0.08, bone, boneHi, pal.dark);
    sxbHorn(ctx, s * r * 0.38, -r * 0.02, s * r * 0.55, -r * 0.02, s * r * 0.66, -r * 0.12, r * 0.05, bone, null, pal.dark);
  }
  const head = [-0.38, -0.28, -0.42, -0.05, -0.28, 0.18, -0.15, 0.38, 0, 0.44, 0.15, 0.38, 0.28, 0.18, 0.42, -0.05, 0.38, -0.28, 0, -0.36];
  sxbShade(ctx, () => sxbPath(ctx, r, head), pal, r * 0.5);
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.35;
  sxbPath(ctx, r, [-0.08, -0.2, 0.08, -0.2, 0.06, 0.3, -0.06, 0.3]); ctx.fill();
  ctx.globalAlpha = A;
  sxbEyes(ctx, 0, -r * 0.1, r * 0.1, r * 0.18, '#ffc04a', '#fff4c0', crBlink(m, t), 0.55);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.36, -r * 0.24); ctx.lineTo(s * r * 0.06, -r * 0.16); }
  ctx.stroke();
  // jaw gape with fangs and fire
  const open = 0.15 + heat * 0.85;
  ctx.fillStyle = '#1a0302';
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, r * 0.2); ctx.lineTo(r * 0.22, r * 0.2);
  ctx.quadraticCurveTo(r * 0.12, r * (0.42 + open * 0.2), 0, r * (0.46 + open * 0.2));
  ctx.quadraticCurveTo(-r * 0.12, r * (0.42 + open * 0.2), -r * 0.22, r * 0.2);
  ctx.fill();
  if (heat > 0.05) drawGlow(ctx, 0, r * 0.36, r * 0.32 * heat, '#ffb35c', heat);
  ctx.fillStyle = sxbC(m, '#f4ead4');
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * r * 0.18, r * 0.2); ctx.lineTo(s * r * 0.14, r * (0.33 + open * 0.06)); ctx.lineTo(s * r * 0.1, r * 0.21);
    ctx.moveTo(s * r * 0.1, r * (0.44 + open * 0.18)); ctx.lineTo(s * r * 0.07, r * (0.34 + open * 0.1)); ctx.lineTo(s * r * 0.04, r * (0.45 + open * 0.18));
  }
  ctx.fill();
  ctx.fillStyle = '#100202';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.07, r * 0.28, r * 0.03, r * 0.02, s * 0.5, 0, SXB_TAU); ctx.fill(); }
  for (const s of [-1, 1]) {
    const p = (t * 0.9 + (s > 0 ? 0.5 : 0) + m.seed * 0.1) % 1;
    ctx.globalAlpha = A * 0.4 * (1 - p);
    ctx.fillStyle = '#5a4a48';
    ctx.beginPath(); ctx.arc(s * r * (0.08 + p * 0.1), r * 0.24 - p * r * 0.5, r * (0.04 + p * 0.1), 0, SXB_TAU); ctx.fill();
  }
  ctx.globalAlpha = A;
  ctx.restore();
}

// Ignarax — elder obsidian dragon boss: vast torn wings veined with lava,
// a crown of swept horns over a fanged skull, burning eyes, a ribbed
// molten chest that heaves and a jaw that drops open on fire.
function sxbDragon(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3344' : '#ffb35c';
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const flap = Math.sin(t * 2.6);
  const mem = sxbMat(m, '#8a3a30', '#4a1612', '#1e0606', '#080202', rage ? '#ff6a6a' : '#ff9a4a');
  const bone = sxbC(m, '#d8c8a8');
  const boneHi = sxbC(m, '#fff6e0');
  const belly = sxbMat(m, '#5a4042', '#2e2022', '#140c0e', '#050304', glow);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // wings
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.translate(r * 0.36, -r * 0.24);
    ctx.rotate(-0.22 + flap * 0.22);
    const wing = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.75, -r * 0.62);
      ctx.lineTo(r * 1.55, -r * 0.86);
      ctx.quadraticCurveTo(r * 1.42, -r * 0.5, r * 1.6, -r * 0.24);
      ctx.lineTo(r * 1.48, -r * 0.2); ctx.lineTo(r * 1.5, -r * 0.08);
      ctx.quadraticCurveTo(r * 1.32, 0, r * 1.3, r * 0.3);
      ctx.lineTo(r * 1.18, r * 0.22); ctx.lineTo(r * 1.1, r * 0.34);
      ctx.quadraticCurveTo(r * 0.98, r * 0.24, r * 0.86, r * 0.5);
      ctx.quadraticCurveTo(r * 0.5, r * 0.26, r * 0.04, r * 0.34);
      ctx.closePath();
    };
    sxbShade(ctx, wing, mem, r * 1.2);
    ctx.strokeStyle = glow; ctx.globalAlpha = A * (0.35 + heave * 0.35 + rage * 0.2); ctx.lineWidth = Math.max(1, r * 0.022);
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.62); ctx.quadraticCurveTo(r * 1.1, -r * 0.4, r * 1.56, -r * 0.26);
    ctx.moveTo(r * 0.75, -r * 0.62); ctx.quadraticCurveTo(r * 1.0, -r * 0.1, r * 1.28, r * 0.28);
    ctx.moveTo(r * 0.75, -r * 0.62); ctx.quadraticCurveTo(r * 0.8, 0, r * 0.86, r * 0.48);
    ctx.moveTo(r * 0.3, -r * 0.2); ctx.quadraticCurveTo(r * 0.4, r * 0.1, r * 0.35, r * 0.3);
    ctx.stroke();
    ctx.globalAlpha = A;
    ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.75, -r * 0.62); ctx.lineTo(r * 1.55, -r * 0.86); ctx.stroke();
    ctx.lineWidth = r * 0.04;
    ctx.beginPath(); ctx.moveTo(r * 0.75, -r * 0.62); ctx.lineTo(r * 1.6, -r * 0.24); ctx.moveTo(r * 0.75, -r * 0.62); ctx.lineTo(r * 1.3, r * 0.3); ctx.moveTo(r * 0.75, -r * 0.62); ctx.lineTo(r * 0.86, r * 0.5); ctx.stroke();
    sxbHorn(ctx, r * 0.75, -r * 0.62, r * 0.72, -r * 0.78, r * 0.6, -r * 0.86, r * 0.05, bone, null, pal.dark);
    ctx.restore();
  }
  // body with ribbed molten chest
  const body = [-0.62, 0.0, -0.55, -0.35, -0.25, -0.5, 0.25, -0.5, 0.55, -0.35, 0.62, 0.0, 0.55, 0.45, 0.25, 0.72, -0.25, 0.72, -0.55, 0.45];
  sxbShade(ctx, () => sxbSmooth(ctx, r, body), pal, r * 0.8);
  ctx.save(); sxbSmooth(ctx, r, body); ctx.clip();
  sxbScales(ctx, -r * 0.62, -r * 0.5, r * 1.24, r * 0.55, r * 0.13, pal.dark, Math.max(1, r * 0.018));
  ctx.restore();
  const hv = 0.5 + 0.5 * Math.sin(t * 3) * 0.4 + heave * 0.5;
  for (let i = 0; i < 5; i++) {
    const y = r * (0.0 + i * 0.13), w = r * (0.34 - i * 0.04);
    drawGlow(ctx, 0, y + r * 0.06, w * 0.9, glow, 0.2 * hv);
    sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, y, w, r * 0.06, 0, 0, SXB_TAU); }, belly, r * 0.35, false);
    ctx.strokeStyle = glow; ctx.globalAlpha = A * Math.min(1, 0.4 + hv * 0.6); ctx.lineWidth = Math.max(1, r * 0.022);
    ctx.beginPath(); ctx.ellipse(0, y + r * 0.005, w * 0.95, r * 0.06, 0, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.globalAlpha = A;
  }
  // forelegs + talons
  for (const s of [-1, 1]) {
    sxbShade(ctx, () => sxbPath(ctx, r, [s * 0.4, 0.2, s * 0.62, 0.3, s * 0.6, 0.72, s * 0.34, 0.74, s * 0.36, 0.5]), pal, r * 0.4);
    for (const k of [-1, 0, 1]) sxbHorn(ctx, s * r * 0.47 + k * r * 0.09, r * 0.72, s * r * 0.47 + k * r * 0.12, r * 0.84, s * r * 0.46 + k * r * 0.1, r * 0.94, r * 0.035, bone, null, pal.dark);
  }
  // head
  ctx.save();
  ctx.translate(0, -r * 0.34);
  for (const s of [-1, 1]) {
    sxbHorn(ctx, s * r * 0.28, -r * 0.36, s * r * 0.62, -r * 0.6, s * r * 0.98, -r * 1.0, r * 0.1, bone, boneHi, pal.dark);
    sxbHorn(ctx, s * r * 0.38, -r * 0.18, s * r * 0.66, -r * 0.24, s * r * 0.86, -r * 0.44, r * 0.065, bone, null, pal.dark);
    sxbHorn(ctx, s * r * 0.46, 0.0, s * r * 0.6, r * 0.04, s * r * 0.72, -r * 0.02, r * 0.045, pal.shade, null, pal.dark);
    sxbHorn(ctx, s * r * 0.12, -r * 0.46, s * r * 0.16, -r * 0.6, s * r * 0.14, -r * 0.7, r * 0.04, pal.shade, null, pal.dark);
  }
  const head = [-0.42, -0.4, -0.5, -0.1, -0.36, 0.12, -0.22, 0.36, 0, 0.44, 0.22, 0.36, 0.36, 0.12, 0.5, -0.1, 0.42, -0.4, 0.2, -0.5, 0, -0.46, -0.2, -0.5];
  sxbShade(ctx, () => sxbPath(ctx, r, head), pal, r * 0.6);
  ctx.save(); sxbPath(ctx, r, head); ctx.clip();
  sxbScales(ctx, -r * 0.45, -r * 0.5, r * 0.9, r * 0.22, r * 0.12, pal.dark, Math.max(1, r * 0.016));
  ctx.restore();
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.35;
  sxbPath(ctx, r, [-0.09, -0.3, 0.09, -0.3, 0.07, 0.3, -0.07, 0.3]); ctx.fill();
  ctx.globalAlpha = A;
  // brow ridges + burning eyes
  sxbEyes(ctx, 0, -r * 0.16, r * 0.11, r * 0.2, glow, '#ffffff', 1, 0.8 + heave * 0.2);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.42, -r * 0.34); ctx.lineTo(s * r * 0.06, -r * 0.24); }
  ctx.stroke();
  // jaw drops open on fire
  const jaw = 0.12 + heave * 0.88;
  ctx.fillStyle = '#140202';
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, r * 0.16); ctx.lineTo(r * 0.26, r * 0.16);
  ctx.quadraticCurveTo(r * 0.16, r * (0.4 + jaw * 0.26), 0, r * (0.46 + jaw * 0.26));
  ctx.quadraticCurveTo(-r * 0.16, r * (0.4 + jaw * 0.26), -r * 0.26, r * 0.16);
  ctx.fill();
  if (heave > 0.05) drawGlow(ctx, 0, r * 0.36, r * 0.5 * heave, glow, heave);
  const fang = sxbC(m, '#fff4e0');
  sxbFangs(ctx, -r * 0.22, r * 0.22, r * 0.17, 6, r * (0.1 + jaw * 0.04), fang, 1);
  sxbFangs(ctx, -r * 0.14, r * 0.14, r * (0.44 + jaw * 0.24), 4, r * (0.08 + jaw * 0.05), fang, -1);
  ctx.fillStyle = '#100202';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 0.08, r * 0.26, r * 0.035, r * 0.022, s * 0.5, 0, SXB_TAU); ctx.fill(); }
  for (const s of [-1, 1]) {
    const p = (t * 0.8 + (s > 0 ? 0.4 : 0)) % 1;
    ctx.globalAlpha = A * 0.4 * (1 - p);
    ctx.fillStyle = '#5a4a48';
    ctx.beginPath(); ctx.arc(s * r * (0.1 + p * 0.1), r * 0.2 - p * r * 0.55, r * (0.05 + p * 0.1), 0, SXB_TAU); ctx.fill();
  }
  ctx.globalAlpha = A;
  ctx.restore();
}

// --------------------------------------------------------------- AVIARY ----

const sxbBrass = (m) => sxbMat(m, '#fff0b8', '#d8a440', '#7a5418', '#2a1804', '#fff4d0');
const sxbSteel = (m) => sxbMat(m, '#ffffff', '#b0b6c2', '#4a505c', '#10141a', '#ffffff');

// Razorbeak — clockwork-armoured raptor: slate plumage, a brass scale
// gorget and helm, crimson blade crest, a long hooked steel beak, knife
// primaries that flare when it sprints, red ember eyes.
function sxbFinch(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const burst = ph === 'burst', coil = ph === 'windup';
  const run = m.anim * (burst ? 3.8 : 2.6);
  const hop = Math.abs(Math.sin(run)) * r * 0.1;
  ctx.translate(0, -hop + (coil ? r * 0.05 : 0));
  const brass = sxbBrass(m), steel = sxbSteel(m);
  const crim = sxbC(m, '#b01e2a');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // blade tail
  for (let i = -2; i <= 2; i++) sxbBlade(ctx, 0, r * 0.3, Math.PI / 2 + i * (burst ? 0.3 : 0.17), r * (0.66 - Math.abs(i) * 0.06), r * 0.07, i % 2 ? pal.shade : pal.dark, brass.primary, pal.dark);
  // armoured legs + talons
  for (const s of [-1, 1]) {
    const sw = Math.sin(run + (s > 0 ? Math.PI : 0));
    const fx = s * r * (0.2 + sw * 0.05), fy = r * 0.8 - Math.max(0, sw) * r * 0.08;
    ctx.strokeStyle = steel.shade; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(s * r * 0.15, r * 0.45); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = brass.primary; ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(s * r * 0.165, r * 0.58); ctx.lineTo(s * r * 0.175, r * 0.62); ctx.stroke();
    for (const k of [-1, 0, 1]) sxbHorn(ctx, fx + k * r * 0.03, fy, fx + k * r * 0.1, fy + r * 0.04, fx + k * r * 0.11, fy + r * 0.13, r * 0.025, sxbC(m, '#1a1418'));
  }
  // folded knife wings (flare in the sprint)
  const flare = burst ? 1 : 0.12 + Math.sin(run) * 0.08;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * r * 0.34, -r * 0.24);
    ctx.rotate(-s * 0.9 * flare);
    for (let i = 0; i < 3; i++) sxbBlade(ctx, s * r * 0.12, r * (0.35 + i * 0.08), Math.PI / 2 - s * (0.15 + i * 0.12), r * (0.55 - i * 0.08), r * 0.06, steel.primary, '#ffffff', pal.dark);
    sxbShade(ctx, () => sxbPath(ctx, 1, [0, 0, s * r * 0.32, r * 0.18, s * r * 0.3, r * 0.56, s * r * 0.16, r * 0.72, s * r * 0.08, r * 0.46, -s * r * 0.02, r * 0.38]), pal, r * 0.45);
    ctx.restore();
  }
  // body
  sxbShade(ctx, () => sxbSmooth(ctx, r, [0, -0.55, 0.38, -0.35, 0.45, 0.05, 0.3, 0.45, 0, 0.58, -0.3, 0.45, -0.45, 0.05, -0.38, -0.35]), pal, r * 0.7);
  // brass scale gorget
  const gorget = [-0.27, -0.2, 0.27, -0.2, 0.22, 0.18, 0, 0.44, -0.22, 0.18];
  sxbShade(ctx, () => sxbPath(ctx, r, gorget), brass, r * 0.45);
  ctx.save(); sxbPath(ctx, r, gorget); ctx.clip();
  sxbScales(ctx, -r * 0.3, -r * 0.14, r * 0.6, r * 0.6, r * 0.13, brass.shade, Math.max(0.8, r * 0.025));
  ctx.restore();
  ctx.fillStyle = crim;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.08); ctx.lineTo(r * 0.05, r * 0.02); ctx.lineTo(0, r * 0.12); ctx.lineTo(-r * 0.05, r * 0.02); ctx.closePath(); ctx.fill();
  // head + brass helm
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.3, -0.66, -0.33, -0.4, -0.18, -0.28, 0.18, -0.28, 0.33, -0.4, 0.3, -0.66, 0, -0.76]), pal, r * 0.4);
  for (let i = -1; i <= 1; i++) sxbBlade(ctx, i * r * 0.06, -r * 0.78, -Math.PI / 2 - i * 0.35 + Math.sin(t * 4 + i) * 0.04 + (burst ? 0.25 : 0), r * (0.42 - Math.abs(i) * 0.08), r * 0.055, crim, sxbC(m, '#ff6a5a'), pal.dark);
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 0.46);
    ctx.quadraticCurveTo(-r * 0.31, -r * 0.84, 0, -r * 0.86);
    ctx.quadraticCurveTo(r * 0.31, -r * 0.84, r * 0.34, -r * 0.46);
    ctx.lineTo(r * 0.24, -r * 0.52); ctx.lineTo(r * 0.09, -r * 0.43); ctx.lineTo(-r * 0.09, -r * 0.43); ctx.lineTo(-r * 0.24, -r * 0.52);
    ctx.closePath();
  }, brass, r * 0.4);
  ctx.fillStyle = brass.dark;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.2, -r * 0.68, Math.max(0.7, r * 0.025), 0, SXB_TAU); ctx.fill(); }
  sxbEyes(ctx, 0, -r * 0.46, r * 0.075, r * 0.16, '#ff3a2a', '#ffd0a0', crBlink(m, t), 0.55);
  // long hooked steel beak
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.11, -r * 0.44); ctx.lineTo(r * 0.11, -r * 0.44);
    ctx.quadraticCurveTo(r * 0.1, -r * 0.18, r * 0.03, -r * 0.02);
    ctx.lineTo(-r * 0.01, r * 0.03);
    ctx.quadraticCurveTo(-r * 0.04, -r * 0.18, -r * 0.11, -r * 0.44);
    ctx.closePath();
  }, steel, r * 0.3);
  ctx.strokeStyle = steel.dark; ctx.lineWidth = Math.max(0.8, r * 0.02);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.4); ctx.lineTo(r * 0.01, -r * 0.06); ctx.stroke();
  if (burst || coil) { ctx.fillStyle = '#3a0408'; ctx.beginPath(); ctx.moveTo(-r * 0.07, -r * 0.28); ctx.lineTo(r * 0.07, -r * 0.28); ctx.lineTo(0, -r * 0.12); ctx.closePath(); ctx.fill(); }
}

// Brood Egg — a cracked, soot-dark egg bound in a brass incubator cage on
// clawed tripod legs; ember light leaks through the fractures (more as it
// takes damage), a slit eye glares from a broken hole and a talon claws
// its way out. Hatches into broodlings.
function sxbEgg(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const wob = Math.sin(t * 6 + m.seed) * (ph === 'windup' ? 0.3 : 0.1);
  ctx.rotate(wob);
  const brass = sxbBrass(m);
  const dmg = sxbClamp(1 - (m.hp != null ? m.hp : 1) / Math.max(1, m.maxHp || 1), 0, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // clawed tripod legs
  for (const [bx, by, fx, k] of [[-0.36, 0.55, -0.66, 0], [0, 0.72, 0.0, 1], [0.36, 0.55, 0.66, 2]]) {
    const lift = Math.max(0, Math.sin(m.anim * 2.4 + k * 2.1)) * r * 0.06;
    const fy = r * 0.94 - lift;
    ctx.strokeStyle = brass.dark; ctx.lineWidth = r * 0.11;
    ctx.beginPath(); ctx.moveTo(bx * r, by * r); ctx.quadraticCurveTo((bx + fx) * 0.6 * r, r * 0.95, fx * r, fy); ctx.stroke();
    ctx.strokeStyle = brass.primary; ctx.lineWidth = r * 0.06; ctx.stroke();
    for (const c of [-1, 0, 1]) sxbHorn(ctx, fx * r + c * r * 0.03, fy, fx * r + c * r * 0.09, fy + r * 0.02, fx * r + c * r * 0.1, fy + r * 0.1, r * 0.025, sxbC(m, '#1a1210'));
  }
  // shell
  const shell = () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.02, r * 0.66, r * 0.86, 0, 0, SXB_TAU); };
  sxbShade(ctx, shell, pal, r);
  ctx.save(); shell(); ctx.clip();
  ctx.fillStyle = pal.dark; ctx.globalAlpha = A * 0.4;
  ctx.beginPath();
  for (const [x, y, s] of [[-0.35, -0.5, 0.07], [0.3, -0.62, 0.05], [0.42, 0.1, 0.08], [-0.45, 0.25, 0.06], [0.1, 0.45, 0.05], [-0.15, -0.7, 0.04]]) { ctx.moveTo(x * r + s * r, y * r); ctx.arc(x * r, y * r, s * r, 0, SXB_TAU); }
  ctx.fill();
  ctx.globalAlpha = A;
  ctx.restore();
  // ember fractures (grow with damage)
  const cw = Math.max(1.2, r * 0.05);
  const main = [-0.4, -0.58, -0.22, -0.42, -0.32, -0.22, -0.08, -0.12, 0.08, -0.28, 0.3, -0.16, 0.52, -0.3];
  const n = 6 + Math.round(dmg * 8);
  sxbCrack(ctx, r, main.slice(0, Math.min(main.length, n)), '#ff6a2a', '#ffe8a0', cw);
  if (dmg > 0.3) sxbCrack(ctx, r, [-0.08, -0.12, -0.14, 0.12, 0.02, 0.3, -0.06, 0.5], '#ff6a2a', '#ffe8a0', cw * 0.8);
  if (dmg > 0.6) sxbCrack(ctx, r, [0.3, -0.16, 0.36, 0.1, 0.5, 0.2], '#ff6a2a', '#ffe8a0', cw * 0.8);
  drawGlow(ctx, -r * 0.1, -r * 0.2, r * (0.35 + dmg * 0.3), '#ff6a2a', 0.35 + dmg * 0.35);
  // brass cage: meridians + band with rivets
  for (const [col, lw] of [[brass.dark, 0.1], [brass.primary, 0.055]]) {
    ctx.strokeStyle = col; ctx.lineWidth = r * lw;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.02, r * 0.4, r * 0.86, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.moveTo(0, r * 0.84); ctx.ellipse(0, -r * 0.02, r * 0.4, r * 0.86, 0, Math.PI * 0.5, -Math.PI * 0.5, true);
    ctx.moveTo(r * 0.64, r * 0.24); ctx.ellipse(0, r * 0.24, r * 0.64, r * 0.13, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.strokeStyle = brass.light; ctx.globalAlpha = A * 0.7; ctx.lineWidth = Math.max(0.7, r * 0.02);
  ctx.beginPath(); ctx.ellipse(0, -r * 0.02, r * 0.4, r * 0.86, 0, Math.PI * 1.05, Math.PI * 1.35); ctx.stroke();
  ctx.globalAlpha = A;
  ctx.fillStyle = brass.dark;
  for (const a of [0.35, 0.95, 1.57, 2.2, 2.8]) { ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.64, r * 0.24 + Math.sin(a) * r * 0.13, Math.max(0.8, r * 0.035), 0, SXB_TAU); ctx.fill(); }
  // finial spike
  sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.86, r * 0.16, r * 0.07, 0, 0, SXB_TAU); }, brass, r * 0.2);
  sxbHorn(ctx, 0, -r * 0.88, 0, -r * 1.0, 0, -r * 1.14, r * 0.05, brass.primary, brass.light, brass.dark);
  // broken hole with a glaring slit eye
  ctx.fillStyle = '#0a0404';
  sxbPath(ctx, r, [0.0, -0.46, 0.1, -0.52, 0.2, -0.44, 0.27, -0.48, 0.3, -0.36, 0.22, -0.26, 0.12, -0.3, 0.02, -0.26, -0.04, -0.36]); ctx.fill();
  const bl = crBlink(m, t);
  drawGlow(ctx, r * 0.14, -r * 0.37, r * 0.2, '#ff5a2a', 0.7);
  ctx.save();
  ctx.translate(r * 0.14, -r * 0.37); ctx.scale(1, Math.max(0.15, bl));
  ctx.fillStyle = '#ffb02a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.1, r * 0.055, 0, 0, SXB_TAU); ctx.fill();
  ctx.fillStyle = '#ff4a1a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.06, r * 0.04, 0, 0, SXB_TAU); ctx.fill();
  ctx.fillStyle = '#120202'; ctx.beginPath(); ctx.ellipse(look.x * r * 0.03, 0, r * 0.015, r * 0.05, 0, 0, SXB_TAU); ctx.fill();
  ctx.restore();
  // talon clawing out of the side
  const tw = Math.sin(t * 5 + m.seed) * 0.25 + dmg * 0.3;
  ctx.save();
  ctx.translate(-r * 0.5, r * 0.02);
  ctx.rotate(-0.4 - tw);
  ctx.fillStyle = '#0a0404';
  sxbPath(ctx, r, [-0.04, -0.1, 0.06, -0.06, 0.04, 0.06, -0.06, 0.04]); ctx.fill();
  for (const k of [-1, 0, 1]) sxbHorn(ctx, -r * 0.02, k * r * 0.04, -r * 0.18, k * r * 0.07 - r * 0.02, -r * 0.24, k * r * 0.1 + r * 0.06, r * 0.025, sxbC(m, '#2a2024'), sxbC(m, '#8a7a80'));
  ctx.restore();
}

// Broodling — vicious hatchling: sooty ragged down, a jagged half-shell
// still clinging on, a big hooked beak gaping with serrations, ember eyes,
// skinny clawed wing-stubs raised.
function sxbChick(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const hop = Math.abs(Math.sin(m.anim * 3)) * r * 0.15;
  ctx.translate(0, -hop);
  const shellMat = sxbMat(m, '#f4e6c4', '#c8a870', '#6a5230', '#20160a', '#ffe8b0');
  const beak = sxbMat(m, '#ffe8a0', '#c89030', '#6a4410', '#1e1004', '#ffffff');
  const claw = sxbC(m, '#1a1012');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // scrawny legs
  for (const s of [-1, 1]) {
    const fy = r * 0.85 + hop;
    ctx.strokeStyle = beak.shade; ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.beginPath(); ctx.moveTo(s * r * 0.2, r * 0.5); ctx.lineTo(s * r * 0.24, fy); ctx.stroke();
    for (const k of [-1, 0, 1]) sxbHorn(ctx, s * r * 0.24, fy, s * r * 0.24 + k * r * 0.1, fy + r * 0.04, s * r * 0.24 + k * r * 0.14, fy + r * 0.12, r * 0.035, claw);
  }
  // clawed wing-stubs raised
  const fl = Math.sin(t * 14 + m.seed) * 0.35;
  for (const s of [-1, 1]) {
    const tx = s * r * 0.85, ty = -r * 0.2 + fl * s * r * 0.15;
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.6, r * 0.12);
    ctx.beginPath(); ctx.moveTo(s * r * 0.4, r * 0.05); ctx.quadraticCurveTo(s * r * 0.7, r * 0.05, tx, ty); ctx.stroke();
    ctx.strokeStyle = pal.shade; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    sxbHorn(ctx, tx, ty, tx + s * r * 0.08, ty - r * 0.05, tx + s * r * 0.06, ty - r * 0.16, r * 0.04, claw);
  }
  // ragged sooty body
  const fur = () => {
    ctx.beginPath();
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * SXB_TAU;
      const rr = r * (i % 2 ? 0.62 : 0.78);
      const x = Math.cos(a) * rr * 0.92, y = r * 0.05 + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  sxbShade(ctx, fur, pal, r * 0.85);
  // clinging half-shell
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.72, 0.18, -0.52, 0.1, -0.4, 0.28, -0.22, 0.14, -0.06, 0.3, 0.1, 0.12, 0.26, 0.28, 0.42, 0.12, 0.56, 0.24, 0.72, 0.16, 0.6, 0.62, 0.3, 0.84, -0.3, 0.84, -0.6, 0.62]), shellMat, r * 0.8);
  ctx.strokeStyle = shellMat.dark; ctx.lineWidth = Math.max(0.8, r * 0.035);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.5); ctx.lineTo(-r * 0.3, r * 0.66); ctx.moveTo(r * 0.36, r * 0.26); ctx.lineTo(r * 0.3, r * 0.5); ctx.stroke();
  // shell shard helmet
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.52, -0.42, -0.38, -0.7, -0.22, -0.56, -0.08, -0.86, 0.1, -0.6, 0.28, -0.78, 0.36, -0.52, 0.52, -0.46, 0.4, -0.36, -0.4, -0.34]), shellMat, r * 0.5);
  // ember eyes
  sxbEyes(ctx, 0, -r * 0.25, r * 0.13, r * 0.21, '#ff4a2a', '#ffd0a0', crBlink(m, t), 0.6, 0.35);
  // gaping hooked beak
  const gape = 0.5 + 0.5 * Math.abs(Math.sin(t * 7 + m.seed));
  ctx.save(); ctx.translate(0, -r * 0.14); ctx.scale(1.4, 1.4); ctx.translate(0, r * 0.14);
  ctx.fillStyle = '#4a0a0e';
  ctx.beginPath(); ctx.moveTo(-r * 0.16, -r * 0.12); ctx.lineTo(r * 0.16, -r * 0.12); ctx.lineTo(0, r * (0.1 + gape * 0.12)); ctx.closePath(); ctx.fill();
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.12, r * (0.0 + gape * 0.06)); ctx.lineTo(r * 0.12, r * (0.0 + gape * 0.06)); ctx.lineTo(0, r * (0.2 + gape * 0.12)); ctx.closePath(); }, beak, r * 0.25);
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.16); ctx.lineTo(r * 0.18, -r * 0.16);
    ctx.quadraticCurveTo(r * 0.14, r * 0.02, r * 0.02, r * 0.14);
    ctx.lineTo(-r * 0.02, r * 0.18);
    ctx.quadraticCurveTo(-r * 0.06, r * 0.0, -r * 0.18, -r * 0.16);
    ctx.closePath();
  }, beak, r * 0.3);
  sxbFangs(ctx, -r * 0.12, r * 0.1, -r * 0.06, 4, r * 0.05, sxbC(m, '#fff4dc'), 1);
  ctx.restore();
}

// Sawbill Harrier — dark war-toucan: spread wings of knife primaries with
// brass edges, a crimson throat, and a huge brass-plated cleaver beak with
// a serrated edge and riveted band; ember eyes in a black mask.
function sxbToucan(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 22 : 11) + m.seed);
  const brass = sxbBrass(m);
  const crim = sxbMat(m, '#ff7a6a', '#b01e2a', '#5a0a10', '#1a0204', '#ffd0a0');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.translate(r * 0.22, -r * 0.12);
    ctx.rotate(-0.15 + flap * 0.45);
    for (let i = 0; i < 5; i++) sxbBlade(ctx, r * (0.5 + i * 0.1), r * (-0.12 + i * 0.07), -0.45 + i * 0.3, r * (0.8 - i * 0.07), r * 0.075, i % 2 ? pal.shade : pal.dark, brass.primary, pal.dark);
    sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.08); ctx.quadraticCurveTo(r * 0.5, -r * 0.45, r * 0.95, -r * 0.3); ctx.lineTo(r * 0.85, -r * 0.02); ctx.quadraticCurveTo(r * 0.5, r * 0.12, 0, r * 0.18); ctx.closePath(); }, pal, r * 0.6);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath();
    for (const x of [0.3, 0.5, 0.7]) { ctx.moveTo(x * r, -r * 0.2 + x * r * 0.05); ctx.lineTo((x + 0.06) * r, r * 0.08); }
    ctx.stroke();
    ctx.restore();
  }
  // tail blades
  for (let i = -1; i <= 1; i++) sxbBlade(ctx, 0, r * 0.45, Math.PI / 2 + i * 0.22, r * 0.5, r * 0.07, pal.dark, brass.shade, pal.dark);
  // body + crimson throat
  sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.36, r * 0.5, 0, 0, SXB_TAU); }, pal, r * 0.6);
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.18); ctx.quadraticCurveTo(0, -r * 0.24, r * 0.24, -r * 0.18); ctx.quadraticCurveTo(r * 0.18, r * 0.1, 0, r * 0.2); ctx.quadraticCurveTo(-r * 0.18, r * 0.1, -r * 0.24, -r * 0.18); ctx.closePath(); }, crim, r * 0.35, false);
  // head with black mask
  sxbShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.34, r * 0.27, 0, SXB_TAU); }, pal, r * 0.35);
  ctx.fillStyle = pal.dark;
  sxbPath(ctx, r, [-0.3, -0.48, 0.3, -0.48, 0.24, -0.3, 0, -0.34, -0.24, -0.3]); ctx.fill();
  // brass cleaver beak
  const beak = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, -r * 0.34);
    ctx.quadraticCurveTo(0, -r * 0.42, r * 0.15, -r * 0.34);
    ctx.quadraticCurveTo(r * 0.2, r * 0.2, r * 0.06, r * 0.74);
    ctx.quadraticCurveTo(r * 0.01, r * 0.8, -r * 0.03, r * 0.7);
    ctx.quadraticCurveTo(-r * 0.15, r * 0.2, -r * 0.15, -r * 0.34);
    ctx.closePath();
  };
  sxbShade(ctx, beak, brass, r * 0.6);
  ctx.save(); beak(); ctx.clip();
  ctx.fillStyle = crim.primary; ctx.fillRect(-r * 0.3, r * 0.4, r * 0.6, r * 0.5);
  ctx.fillStyle = crim.dark; ctx.fillRect(-r * 0.3, r * 0.6, r * 0.6, r * 0.3);
  ctx.restore();
  ctx.strokeStyle = brass.dark; ctx.lineWidth = Math.max(0.8, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.28);
  for (let i = 1; i <= 8; i++) ctx.lineTo((i % 2 ? 0.025 : -0.015) * r + i * r * 0.004, -r * 0.28 + i * r * 0.115);
  ctx.stroke();
  ctx.strokeStyle = brass.dark; ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.08); ctx.quadraticCurveTo(0, -r * 0.04, r * 0.16, -r * 0.08); ctx.stroke();
  ctx.fillStyle = brass.light;
  for (const x of [-0.09, 0, 0.09]) { ctx.beginPath(); ctx.arc(x * r, -r * 0.065, Math.max(0.7, r * 0.022), 0, SXB_TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-r * 0.07, -r * 0.2, r * 0.025, r * 0.08, 0.1, 0, SXB_TAU); ctx.fill();
  sxbEyes(ctx, 0, -r * 0.39, r * 0.075, r * 0.2, '#ff4a2a', '#ffd8a0', crBlink(m, t), 0.5);
}

// Gilded Sentinel — masked war-owl: charcoal plumage under a brass
// breastplate, a heart-shaped gilded mask with burning eye slits, blade
// ear-tufts, cloak wings and a recurve bow that draws a glowing arrow.
function sxbOwl(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const draw = m.windup || 0;
  ctx.translate(0, Math.abs(step) * r * 0.03);
  const brass = sxbBrass(m);
  const claw = sxbC(m, '#141012');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // talons
  for (const s of [-1, 1]) {
    const fy = r * 0.8 + (s * step > 0 ? -s * step * r * 0.05 : 0);
    ctx.strokeStyle = pal.shade; ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(s * r * 0.17, r * 0.5); ctx.lineTo(s * r * 0.2, fy); ctx.stroke();
    for (const k of [-1, 0, 1]) sxbHorn(ctx, s * r * 0.2 + k * r * 0.03, fy, s * r * 0.2 + k * r * 0.1, fy + r * 0.03, s * r * 0.2 + k * r * 0.12, fy + r * 0.13, r * 0.03, claw);
  }
  // cloak wings
  for (const s of [-1, 1]) {
    sxbShade(ctx, () => sxbPath(ctx, 1, [s * r * 0.36, -r * 0.42, s * r * 0.72, -r * 0.18, s * r * 0.74, r * 0.4, s * r * 0.62, r * 0.84, s * r * 0.52, r * 0.6, s * r * 0.44, r * 0.76, s * r * 0.36, r * 0.5]), pal, r * 0.6);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath(); ctx.moveTo(s * r * 0.6, -r * 0.1); ctx.lineTo(s * r * 0.6, r * 0.65); ctx.moveTo(s * r * 0.48, -r * 0.05); ctx.lineTo(s * r * 0.48, r * 0.55); ctx.stroke();
  }
  // body with feather scallops
  const body = () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.5, r * 0.56, 0, 0, SXB_TAU); };
  sxbShade(ctx, body, pal, r * 0.75);
  ctx.save(); body(); ctx.clip();
  sxbScales(ctx, -r * 0.5, r * 0.25, r * 1.0, r * 0.45, r * 0.15, pal.dark, Math.max(0.8, r * 0.025));
  ctx.restore();
  // brass breastplate
  const plate = [-0.32, -0.14, 0.32, -0.14, 0.3, 0.22, 0.15, 0.44, 0, 0.5, -0.15, 0.44, -0.3, 0.22];
  sxbShade(ctx, () => sxbPath(ctx, r, plate), brass, r * 0.5);
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(0.8, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, r * 0.0); ctx.lineTo(0, r * 0.12); ctx.lineTo(r * 0.22, r * 0.0);
  ctx.moveTo(-r * 0.18, r * 0.16); ctx.lineTo(0, r * 0.28); ctx.lineTo(r * 0.18, r * 0.16);
  ctx.stroke();
  ctx.strokeStyle = brass.light; ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.lineTo(0, r * 0.46); ctx.stroke();
  ctx.globalAlpha = A;
  ctx.fillStyle = brass.dark;
  for (const [x, y] of [[-0.26, -0.08], [0.26, -0.08], [-0.24, 0.2], [0.24, 0.2]]) { ctx.beginPath(); ctx.arc(x * r, y * r, Math.max(0.7, r * 0.025), 0, SXB_TAU); ctx.fill(); }
  // pauldrons
  for (const s of [-1, 1]) sxbShade(ctx, () => { ctx.beginPath(); ctx.ellipse(s * r * 0.36, -r * 0.18, r * 0.15, r * 0.1, s * 0.4, 0, SXB_TAU); }, brass, r * 0.2);
  // recurve bow (left) — draws back with the charge
  ctx.save();
  ctx.translate(-r * 0.66, r * 0.05);
  const bw = sxbC(m, '#2a1a12');
  ctx.strokeStyle = bw; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(r * 0.06, -r * 0.5); ctx.quadraticCurveTo(-r * 0.04, -r * 0.42, -r * 0.08, -r * 0.3); ctx.quadraticCurveTo(-r * 0.22, 0, -r * 0.08, r * 0.3); ctx.quadraticCurveTo(-r * 0.04, r * 0.42, r * 0.06, r * 0.5); ctx.stroke();
  ctx.fillStyle = brass.primary;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.06, s * r * 0.5, r * 0.04, 0, SXB_TAU); ctx.fill(); }
  const sx = r * 0.06 + draw * r * 0.22;
  ctx.strokeStyle = sxbC(m, '#e8dcc4'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(r * 0.06, -r * 0.5); ctx.lineTo(sx, 0); ctx.lineTo(r * 0.06, r * 0.5); ctx.stroke();
  if (draw > 0) {
    ctx.strokeStyle = sxbC(m, '#3a2a1a'); ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(-r * 0.3, 0); ctx.stroke();
    drawGlow(ctx, -r * 0.32, 0, r * 0.25 * draw, '#ffd27a', draw);
    ctx.fillStyle = '#fff4c0';
    ctx.beginPath(); ctx.moveTo(-r * 0.42, 0); ctx.lineTo(-r * 0.3, -r * 0.05); ctx.lineTo(-r * 0.3, r * 0.05); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // head: blade ear tufts, dark hood, gilded mask
  for (const s of [-1, 1]) sxbHorn(ctx, s * r * 0.32, -r * 0.66, s * r * 0.5, -r * 0.86, s * r * 0.62, -r * 1.08, r * 0.08, pal.shade, brass.primary, pal.dark);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.42, -0.72, -0.46, -0.45, -0.3, -0.24, 0, -0.18, 0.3, -0.24, 0.46, -0.45, 0.42, -0.72, 0, -0.64]), pal, r * 0.5);
  const mask = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.7, -r * 0.36, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.44, -r * 0.38, -r * 0.2, -r * 0.27);
    ctx.lineTo(0, -r * 0.16);
    ctx.lineTo(r * 0.2, -r * 0.27);
    ctx.quadraticCurveTo(r * 0.44, -r * 0.38, r * 0.36, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.7, 0, -r * 0.6);
    ctx.closePath();
  };
  sxbShade(ctx, mask, brass, r * 0.42);
  ctx.strokeStyle = brass.shade; ctx.lineWidth = Math.max(0.8, r * 0.025);
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.06, -r * 0.58); ctx.quadraticCurveTo(s * r * 0.3, -r * 0.6, s * r * 0.34, -r * 0.44); }
  ctx.stroke();
  ctx.strokeStyle = brass.light; ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.58); ctx.lineTo(0, -r * 0.3); ctx.stroke();
  ctx.globalAlpha = A;
  sxbEyes(ctx, 0, -r * 0.45, r * 0.1, r * 0.17, '#ffb020', '#fff4c0', crBlink(m, t), 0.6 + draw * 0.3);
  // hooked beak under the mask
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.3); ctx.lineTo(r * 0.06, -r * 0.3); ctx.quadraticCurveTo(r * 0.05, -r * 0.18, 0, -r * 0.1); ctx.quadraticCurveTo(-r * 0.05, -r * 0.18, -r * 0.06, -r * 0.3); ctx.closePath(); }, sxbSteel(m), r * 0.15);
}

// Aurum War-Griffin — armoured griffin brute: bronze wings of blade
// feathers, brass scale barding, an eagle head in a crested war-helm with
// a crimson plume, a hooked beak that gapes as it rears and beats down.
function sxbGriffin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.3);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  ctx.translate(0, -rear * r * 0.15);
  const flap = Math.sin(t * (rear ? 14 : 3)) * (0.2 + rear * 0.35);
  const wingMat = sxbMat(m, '#c8a070', '#6a4a2a', '#2e1e0e', '#0c0804', '#ffe08a');
  const brass = sxbBrass(m);
  const white = sxbMat(m, '#ffffff', '#d8d0c0', '#7a7060', '#1e1a14', '#fff0c0');
  const claw = sxbC(m, '#141012');
  const gold = sxbMat(m, '#fff0a0', '#e8b030', '#8a5a10', '#2a1804', '#ffffff');
  const crim = sxbC(m, '#a8182a');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // wings
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.translate(r * 0.3, -r * 0.25);
    ctx.rotate(-0.45 + flap);
    for (let i = 0; i < 6; i++) sxbBlade(ctx, r * (0.32 + i * 0.18), r * (0.06 + i * 0.01), 1.25 - i * 0.17, r * (0.5 + i * 0.05), r * 0.08, i % 2 ? wingMat.shade : wingMat.dark, brass.primary, wingMat.dark);
    sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.6, -r * 0.45, r * 1.38, -r * 0.3); for (let k = 0; k <= 6; k++) { const x = 1.3 - k * 0.2, y = -0.24 + k * 0.075; ctx.lineTo(r * x, r * (y + 0.14)); ctx.lineTo(r * (x - 0.1), r * (y + 0.06)); } ctx.lineTo(r * 0.05, r * 0.25); ctx.closePath(); }, wingMat, r * 0.8);
    ctx.strokeStyle = wingMat.dark; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath(); for (let k = 1; k <= 5; k++) { const x = 1.3 - k * 0.2, y = -0.24 + k * 0.075; ctx.moveTo(r * x, r * (y + 0.14)); ctx.lineTo(r * (x - 0.08), r * (y - 0.1)); } ctx.stroke();
    ctx.strokeStyle = brass.primary; ctx.globalAlpha = A * 0.7; ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.02); ctx.quadraticCurveTo(r * 0.6, -r * 0.42, r * 1.36, -r * 0.29); ctx.stroke();
    ctx.globalAlpha = A;
    ctx.restore();
  }
  // lion hind legs
  for (const s of [-1, 1]) sxbShade(ctx, () => sxbPath(ctx, r, [s * 0.52, 0.2, s * 0.8, 0.3, s * 0.8, 0.82, s * 0.6, 0.84]), pal, r * 0.35);
  // body
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.75, 0.15, -0.68, -0.2, -0.35, -0.4, 0.35, -0.4, 0.68, -0.2, 0.75, 0.15, 0.55, 0.55, 0, 0.65, -0.55, 0.55]), pal, r);
  // brass scale barding
  const bard = [-0.42, -0.26, 0.42, -0.26, 0.36, 0.2, 0, 0.44, -0.36, 0.2];
  sxbShade(ctx, () => sxbPath(ctx, r, bard), brass, r * 0.6);
  ctx.save(); sxbPath(ctx, r, bard); ctx.clip();
  sxbScales(ctx, -r * 0.45, -r * 0.2, r * 0.9, r * 0.66, r * 0.14, brass.shade, Math.max(0.8, r * 0.022));
  ctx.restore();
  // eagle forelegs; one lifts its talons as it rears
  for (const s of [-1, 1]) {
    const lift = s < 0 ? rear * r * 0.3 : 0;
    const fx = s * r * 0.36 + Math.sin(m.anim * 1.3 + (s > 0 ? Math.PI : 0)) * r * 0.06, fy = r * 0.84 - lift;
    ctx.strokeStyle = gold.shade; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(s * r * 0.34, r * 0.3); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = gold.primary; ctx.lineWidth = r * 0.06; ctx.stroke();
    for (const k of [-1, 0, 1]) sxbHorn(ctx, fx + k * r * 0.04, fy, fx + k * r * 0.12, fy + r * 0.04, fx + k * r * 0.13, fy + r * 0.15, r * 0.035, claw);
  }
  // head
  ctx.save();
  ctx.translate(0, -r * 0.4);
  ctx.fillStyle = white.shade;
  sxbPath(ctx, r, [-0.46, 0.1, -0.36, 0.0, -0.44, -0.12, -0.32, -0.16, 0, 0.36, 0.32, -0.16, 0.44, -0.12, 0.36, 0.0, 0.46, 0.1, 0.3, 0.3, 0, 0.38, -0.3, 0.3]); ctx.fill();
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.32, -0.25, -0.38, 0.0, -0.25, 0.22, 0, 0.28, 0.25, 0.22, 0.38, 0.0, 0.32, -0.25, 0, -0.35]), white, r * 0.42);
  // crested war-helm + plume
  for (let i = 0; i < 3; i++) sxbBlade(ctx, 0, -r * 0.36, -Math.PI / 2 - 0.5 - i * 0.18 + Math.sin(t * 3 + i) * 0.05, r * (0.5 - i * 0.08), r * 0.05, crim, null, sxbC(m, '#3a0408'));
  sxbHorn(ctx, 0, -r * 0.34, 0, -r * 0.5, r * 0.02, -r * 0.66, r * 0.06, brass.primary, brass.light, brass.dark);
  sxbShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.02);
    ctx.quadraticCurveTo(-r * 0.37, -r * 0.38, 0, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.37, -r * 0.38, r * 0.35, -r * 0.02);
    ctx.lineTo(r * 0.24, r * 0.06); ctx.lineTo(r * 0.22, -r * 0.08); ctx.lineTo(r * 0.08, -r * 0.0); ctx.lineTo(-r * 0.08, -r * 0.0); ctx.lineTo(-r * 0.22, -r * 0.08); ctx.lineTo(-r * 0.24, r * 0.06);
    ctx.closePath();
  }, brass, r * 0.42);
  ctx.strokeStyle = brass.light; ctx.globalAlpha = A * 0.6; ctx.lineWidth = Math.max(0.8, r * 0.025);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, -r * 0.05); ctx.stroke();
  ctx.globalAlpha = A;
  sxbEyes(ctx, 0, -r * 0.04, r * 0.085, r * 0.16, '#ffcc3a', '#fffbe0', crBlink(m, t), 0.6);
  // hooked beak, gaping as it rears
  const gape = rear * r * 0.1;
  ctx.fillStyle = '#3a0408';
  ctx.beginPath(); ctx.moveTo(-r * 0.09, r * 0.12); ctx.lineTo(r * 0.09, r * 0.12); ctx.lineTo(0, r * 0.3 + gape); ctx.closePath(); ctx.fill();
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.13, r * 0.02); ctx.lineTo(r * 0.13, r * 0.02); ctx.quadraticCurveTo(r * 0.12, r * 0.24, r * 0.02, r * 0.38); ctx.lineTo(-r * 0.01, r * 0.42); ctx.quadraticCurveTo(-r * 0.04, r * 0.24, -r * 0.13, r * 0.02); ctx.closePath(); }, gold, r * 0.3);
  ctx.restore();
}

// Aurelia, the Sun Tyrant — armoured phoenix boss: wings of crimson and
// gold blade feathers whose tips burn, flame-blade tail and crest, a
// gilded breastplate around a molten core, a gilded beak-mask and
// white-hot eyes. Blood-red when enraged.
function sxbPhoenix(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3344' : '#ffd23d';
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const flap = Math.sin(t * 2.6);
  drawGlow(ctx, 0, 0, r * 1.9, rage ? '#ff2a2a' : '#ff8a2a', 0.3);
  const ember = rage ? sxbMat(m, '#ff6a5a', '#8a0a14', '#3a0206', '#100002', '#ffd27a') : sxbMat(m, '#ff8a4a', '#a8281a', '#4a0a06', '#140202', '#ffd27a');
  const gold = sxbMat(m, '#fff4c0', '#f0b030', '#9a5410', '#2a1404', '#ffffff');
  const fDark = ember.shade, fMid = ember.primary, fGold = gold.primary, fHot = sxbC(m, rage ? '#ff8a6a' : '#ffe27a');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // flame-blade tail
  for (let i = -2; i <= 2; i++) {
    const sw = Math.sin(t * 3 + i) * 0.08;
    sxbBlade(ctx, 0, r * 0.4, Math.PI / 2 + i * 0.26 + sw, r * (1.15 - Math.abs(i) * 0.12), r * 0.1, i % 2 ? fGold : fDark, fHot, ember.dark);
  }
  // wings: crimson outer blades with burning tips, gold inner coverts
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.translate(r * 0.3, -r * 0.18);
    ctx.rotate(-0.3 + flap * 0.26);
    for (let i = 0; i < 7; i++) {
      const a = -0.75 + i * 0.27, L = r * (1.08 - Math.abs(i - 2) * 0.07), bx = r * (0.12 + i * 0.1), by = r * (-0.1 + i * 0.05);
      sxbBlade(ctx, bx, by, a, L, r * 0.1, i % 2 ? fMid : fDark, fGold, ember.dark);
      const tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L;
      if (i % 2 === 0) drawGlow(ctx, tx, ty, r * (0.2 + heave * 0.1), '#ff9a3d', 0.7);
    }
    for (let i = 0; i < 6; i++) sxbBlade(ctx, r * (0.05 + i * 0.08), r * (-0.05 + i * 0.04), -0.6 + i * 0.27, r * (0.6 - Math.abs(i - 2) * 0.05), r * 0.08, i % 2 ? fGold : gold.shade, fHot, ember.dark);
    ctx.restore();
  }
  // body
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.42, -0.2, -0.3, -0.45, 0, -0.5, 0.3, -0.45, 0.42, -0.2, 0.38, 0.25, 0.2, 0.55, 0, 0.62, -0.2, 0.55, -0.38, 0.25]), ember, r * 0.7);
  // gilded breastplate with a molten core
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.3, -0.26, 0.3, -0.26, 0.26, 0.18, 0, 0.46, -0.26, 0.18]), gold, r * 0.5);
  ctx.strokeStyle = gold.shade; ctx.lineWidth = Math.max(1, r * 0.022);
  ctx.beginPath();
  for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.26, -r * 0.2); ctx.quadraticCurveTo(s * r * 0.16, r * 0.0, s * r * 0.04, r * 0.36); }
  ctx.stroke();
  const pulse = 0.75 + 0.25 * Math.sin(t * 5);
  ctx.fillStyle = ember.dark;
  sxbPath(ctx, r, [0, -0.14, 0.13, 0.06, 0, 0.26, -0.13, 0.06]); ctx.fill();
  drawGlow(ctx, 0, r * 0.06, r * (0.32 + heave * 0.35) * pulse, glow, 0.9);
  ctx.fillStyle = fHot;
  sxbPath(ctx, r, [0, -0.08, 0.08, 0.06, 0, 0.19, -0.08, 0.06]); ctx.fill();
  // collar of gold blades
  for (let i = -3; i <= 3; i++) sxbBlade(ctx, i * r * 0.07, -r * 0.36, Math.PI / 2 + i * 0.22, r * 0.22, r * 0.05, i % 2 ? fGold : gold.shade, null, ember.dark);
  // head
  ctx.save();
  ctx.translate(0, -r * 0.56);
  for (let i = -2; i <= 2; i++) {
    const f = 0.85 + 0.15 * Math.sin(t * 9 + i * 1.7);
    sxbBlade(ctx, i * r * 0.04, -r * 0.14, -Math.PI / 2 + i * 0.3 + Math.sin(t * 4 + i) * 0.05, r * (0.62 - Math.abs(i) * 0.1) * f, r * 0.065, i % 2 ? fGold : fMid, fHot, ember.dark);
  }
  sxbShade(ctx, () => sxbSmooth(ctx, r, [-0.25, -0.14, -0.27, 0.06, -0.12, 0.2, 0, 0.22, 0.12, 0.2, 0.27, 0.06, 0.25, -0.14, 0, -0.24]), ember, r * 0.35);
  sxbShade(ctx, () => sxbPath(ctx, r, [-0.28, -0.1, -0.1, -0.06, 0, 0.0, 0.1, -0.06, 0.28, -0.1, 0.24, 0.04, 0.08, 0.06, 0, 0.12, -0.08, 0.06, -0.24, 0.04]), gold, r * 0.3);
  sxbEyes(ctx, 0, -r * 0.02, r * 0.075, r * 0.13, rage ? '#ff4a3a' : '#fff0a0', '#ffffff', 1, 0.8 + heave * 0.2);
  const gape = heave * r * 0.08;
  if (heave > 0.05) {
    ctx.fillStyle = '#2a0202';
    ctx.beginPath(); ctx.moveTo(-r * 0.06, r * 0.12); ctx.lineTo(r * 0.06, r * 0.12); ctx.lineTo(0, r * 0.28 + gape); ctx.closePath(); ctx.fill();
    drawGlow(ctx, 0, r * 0.2, r * 0.25 * heave, glow, heave);
  }
  sxbShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.08, r * 0.06); ctx.lineTo(r * 0.08, r * 0.06); ctx.quadraticCurveTo(r * 0.07, r * 0.2, r * 0.01, r * 0.3); ctx.lineTo(-r * 0.01, r * 0.32); ctx.quadraticCurveTo(-r * 0.03, r * 0.2, -r * 0.08, r * 0.06); ctx.closePath(); }, gold, r * 0.2);
  ctx.restore();
}

// ------------------------------------------------------------ register ----
Object.assign(SPECIES.shardfox, { draw: sxbShardfox, colors: { primary: '#3c3656', dark: '#0c0a18', glow: '#7affe0' } });
Object.assign(SPECIES.mushling, { draw: sxbMushling, colors: { primary: '#5e3a80', dark: '#120822', glow: '#7affe0' } });
Object.assign(SPECIES.moth, { draw: sxbMoth, colors: { primary: '#36304e', dark: '#08060f', glow: '#8affea' } });
Object.assign(SPECIES.treant, { draw: sxbTreant, colors: { primary: '#544438', dark: '#100b08', glow: '#8affd0' } });
Object.assign(SPECIES.crystalgolem, { draw: sxbCrystalGolem, colors: { primary: '#4a5064', dark: '#0a0c14', glow: '#8affea' } });
Object.assign(SPECIES.eldertreant, { draw: sxbElderTreant, colors: { primary: '#544236', dark: '#100a08', glow: '#8affe0' } });
Object.assign(SPECIES.kobold, { draw: sxbKobold, colors: { primary: '#6a3024', dark: '#160604', glow: '#ff9a3d' } });
Object.assign(SPECIES.magma, { draw: sxbMagma, colors: { primary: '#2e2426', dark: '#070304', glow: '#ff8a2a' } });
Object.assign(SPECIES.firebat, { draw: sxbFireBat, colors: { primary: '#2e1e20', dark: '#080405', glow: '#ff8a3d' } });
Object.assign(SPECIES.emberknight, { draw: sxbEmberKnight, colors: { primary: '#36323c', dark: '#07060a', glow: '#ff7a2a' } });
Object.assign(SPECIES.drake, { draw: sxbDrake, colors: { primary: '#4a2a26', dark: '#0c0405', glow: '#ff8a3d' } });
Object.assign(SPECIES.dragon, { draw: sxbDragon, colors: { primary: '#46282a', dark: '#0a0304', glow: '#ff9a3d' } });
Object.assign(SPECIES.finch, { draw: sxbFinch, colors: { primary: '#28343f', dark: '#06090e', glow: '#ffc85a' } });
Object.assign(SPECIES.egg, { draw: sxbEgg, colors: { primary: '#40342e', dark: '#0c0806', glow: '#ff7a3a' } });
Object.assign(SPECIES.chick, { draw: sxbChick, colors: { primary: '#3e3236', dark: '#0a0608', glow: '#ff7a3a' } });
Object.assign(SPECIES.toucan, { draw: sxbToucan, colors: { primary: '#222a36', dark: '#05070c', glow: '#ffb84a' } });
Object.assign(SPECIES.owl, { draw: sxbOwl, colors: { primary: '#40362f', dark: '#0c0806', glow: '#ffd27a' } });
Object.assign(SPECIES.griffin, { draw: sxbGriffin, colors: { primary: '#5e4630', dark: '#120c06', glow: '#ffd23d' } });
Object.assign(SPECIES.phoenix, { draw: sxbPhoenix, colors: { primary: '#8a2416', dark: '#1a0402', glow: '#ffc83d' } });
