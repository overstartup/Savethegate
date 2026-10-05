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

const crClamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function crHexToRgb(hex) {
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

function crEyes(ctx, ex, ey, er, gap, look, blink, pupilColor = '#1a1030', angry = 0, browColor = '#1a1030') {
  for (const side of [-1, 1]) {
    const x = ex + side * gap;
    ctx.save();
    ctx.translate(x, ey);
    ctx.scale(1, blink);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pupilColor;
    ctx.beginPath(); ctx.arc(look.x * er * 0.4, look.y * er * 0.4, er * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(look.x * er * 0.4 - er * 0.2, look.y * er * 0.4 - er * 0.25, er * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (angry) {
      ctx.strokeStyle = browColor;
      ctx.lineWidth = Math.max(1.5, er * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - side * er * 1.1, ey - er * 1.25 - angry * er * 0.1);
      ctx.lineTo(x + side * er * 0.7, ey - er * 0.85 + angry * er * 0.25);
      ctx.stroke();
    }
  }
}

function crBlink(m, t) {
  const cyc = (t + m.seed) % 3.4;
  return cyc < 0.12 ? 0.15 : 1;
}

// --- Grumbles — crystal gremlin: floppy ears, stubby running legs,
//     crystal spikes on its head, toothy grin. ---------------------------
function drawGoblin(ctx, m, pal, t, look) {
  const r = m.r;
  const step = Math.sin(m.anim * 2.2);
  const bounce = Math.abs(Math.cos(m.anim * 2.2)) * r * 0.12;
  ctx.translate(0, -bounce);
  // legs
  ctx.fillStyle = pal.dark;
  for (const side of [-1, 1]) {
    const lift = side * step;
    ctx.beginPath();
    ctx.ellipse(side * r * 0.38, r * 0.72 - Math.max(0, lift) * r * 0.22 + bounce, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ears (flop with the run cycle)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.62, -r * 0.25);
    ctx.rotate(side * (0.35 + step * 0.18 * side));
    ctx.fillStyle = pal.primary;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.18);
    ctx.lineTo(side * r * 0.75, -r * 0.42);
    ctx.lineTo(0, r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.05, -r * 0.08);
    ctx.lineTo(side * r * 0.5, -r * 0.3);
    ctx.lineTo(side * r * 0.05, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // head crystals
  ctx.fillStyle = pal.glow;
  for (const [dx, h] of [[-0.28, 0.42], [0, 0.6], [0.28, 0.42]]) {
    ctx.beginPath();
    ctx.moveTo(dx * r - r * 0.1, -r * 0.62);
    ctx.lineTo(dx * r, -r * (0.62 + h));
    ctx.lineTo(dx * r + r * 0.1, -r * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  // body
  ctx.fillStyle = pal.primary;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r * 0.78, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.light;
  ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.48, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  // face
  crEyes(ctx, 0, -r * 0.18, r * 0.22, r * 0.3, look, crBlink(m, t), '#1a1030', 1, pal.dark);
  // grin with teeth
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.16);
  ctx.quadraticCurveTo(0, r * (0.48 + m.windup * 0.15), r * 0.32, r * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const tx of [-0.16, 0.06]) {
    ctx.beginPath();
    ctx.moveTo(tx * r, r * 0.17); ctx.lineTo(tx * r + r * 0.1, r * 0.17); ctx.lineTo(tx * r + r * 0.05, r * 0.28);
    ctx.closePath(); ctx.fill();
  }
}

// --- Sir Squish — crystal ooze: hops with squash & stretch, jiggly wobbly
//     outline, inner bubbles, shiny highlight. ----------------------------
function drawSlime(ctx, m, pal, t, look) {
  const r = m.r;
  const hop = (m.anim * 0.35) % 1;                 // 0..1 hop cycle
  const air = Math.sin(hop * Math.PI);             // 0 on ground, 1 at apex
  const land = hop < 0.12 ? 1 - hop / 0.12 : 0;    // squash right after landing
  const sx = 1 + land * 0.25 - air * 0.1;
  const sy = 1 - land * 0.22 + air * 0.14;
  ctx.translate(0, -air * r * 0.35);
  ctx.scale(sx, sy);
  // body — wobbly blob with flat-ish bottom
  const N = 18;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wob = 1 + Math.sin(a * 3 + t * 7 + m.seed) * 0.05;
    let x = Math.cos(a) * r * 0.95 * wob;
    let y = Math.sin(a) * r * 0.85 * wob;
    if (y > r * 0.5) y = r * 0.5 + (y - r * 0.5) * 0.3; // flatten the base
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(1, pal.primary);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.stroke();
  // inner rising bubbles
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i * 0.33 + m.seed) % 1;
    ctx.beginPath();
    ctx.arc(Math.sin(i * 2.1 + m.seed) * r * 0.4, r * 0.4 - ph * r * 0.9, r * (0.06 + i * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.42, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
  // face
  crEyes(ctx, 0, -r * 0.08, r * 0.2, r * 0.3, look, crBlink(m, t));
  ctx.fillStyle = pal.dark;
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * (0.1 + air * 0.05), r * (0.07 + air * 0.08), 0, 0, Math.PI * 2); ctx.fill();
}

// --- Zippy — bat-winged imp (procedural fallback when bat art missing). --
function drawImp(ctx, m, pal, t, look) {
  const r = m.r;
  const flap = Math.sin(t * 18 + m.seed);
  // wings
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.2 + flap * 0.55);
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.1);
    ctx.quadraticCurveTo(r * 1.2, -r * 1.0, r * 1.7, -r * 0.3);
    ctx.quadraticCurveTo(r * 1.3, -r * 0.1, r * 1.35, r * 0.2);
    ctx.quadraticCurveTo(r * 0.9, 0, r * 0.85, r * 0.35);
    ctx.quadraticCurveTo(r * 0.55, r * 0.1, r * 0.3, r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // tail
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.6);
  ctx.quadraticCurveTo(Math.sin(t * 6 + m.seed) * r * 0.6, r * 1.1, Math.sin(t * 6 + m.seed + 1) * r * 0.4, r * 1.4);
  ctx.stroke();
  ctx.fillStyle = pal.primary;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // horns
  ctx.fillStyle = pal.glow;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.3, -r * 0.55); ctx.lineTo(side * r * 0.55, -r * 1.05); ctx.lineTo(side * r * 0.55, -r * 0.45);
    ctx.closePath(); ctx.fill();
  }
  crEyes(ctx, 0, -r * 0.1, r * 0.2, r * 0.26, look, crBlink(m, t), '#1a1030', 1, pal.dark);
}

// --- Rattles — marching crystal skeleton: swinging bone limbs, chattering
//     jaw while charging a shot, pulsing eye sockets. ---------------------
function drawSkeleton(ctx, m, pal, t) {
  const r = m.r;
  const step = Math.sin(m.anim * 1.8);
  const bone = pal.primary, dark = pal.dark, glow = pal.glow;
  ctx.lineCap = 'round';
  // legs
  ctx.strokeStyle = bone;
  ctx.lineWidth = Math.max(2, r * 0.13);
  for (const side of [-1, 1]) {
    const sw = side * step * 0.45;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.15, r * 0.5);
    ctx.lineTo(side * r * 0.2 + Math.sin(sw) * r * 0.5, r * 0.5 + Math.cos(sw) * r * 0.5);
    ctx.stroke();
  }
  // pelvis
  ctx.fillStyle = bone;
  ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.25, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  // arms (swing opposite to legs); right arm holds a crystal staff
  for (const side of [-1, 1]) {
    const sw = -side * step * 0.5;
    const hx = side * r * 0.55 + Math.sin(sw) * r * 0.3;
    const hy = r * 0.3 + Math.cos(sw) * r * 0.25;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.4, -r * 0.08);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    if (side === 1) {
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath(); ctx.moveTo(hx, hy + r * 0.4); ctx.lineTo(hx, hy - r * 0.9); ctx.stroke();
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 1.25); ctx.lineTo(hx + r * 0.15, hy - r * 0.95); ctx.lineTo(hx, hy - r * 0.8); ctx.lineTo(hx - r * 0.15, hy - r * 0.95);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = bone;
      ctx.lineWidth = Math.max(2, r * 0.13);
    }
  }
  // ribcage + spine
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.48); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const y = -r * 0.08 + i * r * 0.17;
    const w = r * (0.42 - i * 0.07);
    ctx.beginPath(); ctx.moveTo(-w, y); ctx.quadraticCurveTo(0, y + r * 0.1, w, y); ctx.stroke();
  }
  // skull
  const chatter = m.windup > 0 ? Math.abs(Math.sin(t * 40)) * r * 0.08 : 0;
  ctx.fillStyle = bone;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-r * 0.2, -r * 0.27 + chatter, r * 0.4, r * 0.16, 3); ctx.fill(); ctx.stroke();
  const pulse = 0.6 + 0.4 * Math.sin(t * 4 + m.seed);
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.58, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.58, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = glow;
  ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.58, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.58, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// --- Mossback — hulking crystal troll: heavy stomping gait, club that
//     winds up overhead before a shot, glowing back crystals. -----------
function drawTroll(ctx, m, pal, t, look) {
  const r = m.r;
  const step = Math.sin(m.anim * 1.2);
  const stomp = Math.abs(step) * r * 0.08;
  ctx.translate(0, stomp);
  // feet
  ctx.fillStyle = pal.dark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.45, r * 0.78 - (side * step > 0 ? step * side * r * 0.15 : 0), r * 0.28, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // back crystals
  ctx.fillStyle = pal.glow;
  for (const [dx, h, a] of [[-0.5, 0.5, -0.4], [-0.15, 0.7, -0.1], [0.25, 0.55, 0.25]]) {
    ctx.save();
    ctx.translate(dx * r, -r * 0.45);
    ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-r * 0.12, 0); ctx.lineTo(0, -h * r); ctx.lineTo(r * 0.12, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // club arm: raises overhead as the shot charges
  const raise = m.windup;
  const armA = 0.9 - raise * 2.4 + step * 0.15;
  ctx.save();
  ctx.translate(r * 0.62, -r * 0.05);
  ctx.rotate(armA);
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = r * 0.26;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); ctx.stroke();
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = r * 0.14;
  ctx.beginPath(); ctx.moveTo(0, r * 0.45); ctx.lineTo(0, r * 1.15); ctx.stroke();
  ctx.fillStyle = pal.dark;
  ctx.beginPath(); ctx.ellipse(0, r * 1.2, r * 0.22, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pal.glow;
  ctx.beginPath(); ctx.arc(-r * 0.1, r * 1.15, r * 0.06, 0, Math.PI * 2); ctx.arc(r * 0.1, r * 1.28, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // body
  ctx.fillStyle = pal.primary;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(2.5, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, r * 0.2);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.4, -r * 0.3, -r * 0.6);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.72, r * 0.72, -r * 0.3);
  ctx.quadraticCurveTo(r * 0.92, r * 0.1, r * 0.65, r * 0.5);
  ctx.quadraticCurveTo(0, r * 0.85, -r * 0.65, r * 0.6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.light;
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // left arm swinging
  ctx.save();
  ctx.translate(-r * 0.7, -r * 0.05);
  ctx.rotate(-0.5 - step * 0.35);
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = r * 0.26;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.6); ctx.stroke();
  ctx.restore();
  // face
  crEyes(ctx, r * 0.05, -r * 0.25, r * 0.13, r * 0.2, look, crBlink(m, t), '#1a1030', 1.2, pal.dark);
  ctx.fillStyle = '#fff8ec';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.05 + side * r * 0.18, r * 0.02);
    ctx.lineTo(r * 0.05 + side * r * 0.12, -r * 0.14);
    ctx.lineTo(r * 0.05 + side * r * 0.06, r * 0.04);
    ctx.closePath(); ctx.fill();
  }
}

// --- Bruncle, the Gate-Breaker — boss: breathing bulk, crystal crown,
//     swinging fists, eyes and maw flare when it fires, enraged red glow
//     under half health. ------------------------------------------------
function drawBoss(ctx, m, pal, t, look) {
  const r = m.r;
  const breathe = Math.sin(t * 2.2) * 0.04;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : pal.glow;
  ctx.scale(1 + breathe, 1 - breathe);
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
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // body
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r * 0.9);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(1, pal.primary);
  ctx.fillStyle = grad;
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = Math.max(3, r * 0.06);
  ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.8, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // crown of crystals
  for (let i = -2; i <= 2; i++) {
    const h = r * (0.35 + (2 - Math.abs(i)) * 0.14);
    const cx = i * r * 0.2;
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 5 + i);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.09, -r * 0.5);
    ctx.lineTo(cx, -r * 0.5 - h);
    ctx.lineTo(cx + r * 0.09, -r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // horns
  ctx.fillStyle = pal.dark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.5, -r * 0.4);
    ctx.quadraticCurveTo(side * r * 1.0, -r * 0.6, side * r * 0.85, -r * 1.05);
    ctx.lineTo(side * r * 0.3, -r * 0.52);
    ctx.closePath(); ctx.fill();
  }
  // eyes — glow intensifies with the shot windup / rage
  const eyeHeat = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0, rage * 0.6);
  for (const side of [-1, 1]) {
    ctx.fillStyle = pal.dark;
    ctx.beginPath(); ctx.ellipse(side * r * 0.28, -r * 0.08, r * 0.17, r * 0.12, side * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(side * r * 0.28 + look.x * r * 0.04, -r * 0.07 + look.y * r * 0.03, r * (0.08 + eyeHeat * 0.04), 0, Math.PI * 2); ctx.fill();
    // angry brow
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.48, -r * 0.28); ctx.lineTo(side * r * 0.12, -r * 0.16); ctx.stroke();
  }
  // maw opens on fire
  const open = Math.max(m.windup * 0.6, m.fireFlash > 0 ? 1 : 0);
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.32, r * (0.06 + open * 0.14), 0, 0, Math.PI * 2);
  ctx.fill();
  if (open > 0.1) {
    ctx.fillStyle = glow;
    ctx.globalAlpha = open;
    ctx.beginPath(); ctx.ellipse(0, r * 0.37, r * 0.18, r * 0.06 * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#fff8ec';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.24, r * 0.28); ctx.lineTo(side * r * 0.17, r * 0.48); ctx.lineTo(side * r * 0.1, r * 0.28);
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

// Main entry. look = {x, y} unit-ish vector toward the Guardian so eyes
// track the player. batImg (optional) = current bat-art frame for imps.
export function drawCreature(ctx, m, tint, t, look, batImg = null) {
  const primary = tint?.primary || m.color;
  const dark = tint?.dark || '#2a1f4d';
  const glow = tint?.glow || '#ffffff';
  // Hit flash: full white pop for small fry, but a subtle tint for bosses
  // and elites — they're hit near-constantly, and a permanent white-out
  // would hide all their animation.
  const flash = m.hitFlash > 0;
  const fa = (m.boss || m.elite) ? 0.3 : 0.85;
  const pal = {
    primary: flash ? crMix(primary, '#ffffff', fa) : primary,
    light: crMix(primary, '#ffffff', flash ? Math.min(1, 0.4 + fa) : 0.4),
    dark: flash ? crMix(dark, '#ffffff', fa * 0.6) : dark,
    glow,
  };
  const r = m.r;

  // ground shadow (flyers cast a smaller, fainter one further below)
  ctx.save();
  ctx.globalAlpha = m.flying ? 0.14 : 0.26;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(m.x, m.y + r * (m.flying ? 1.8 : 0.95), r * (m.flying ? 0.5 : 0.8), r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // elite aura — rotating golden rune ring + soft glow
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
  if (m.boss) drawGlow(ctx, m.x, m.y, r * 1.6, m.enraged ? '#ff3344' : glow, 0.3 + 0.1 * Math.sin(t * 3));
  if (m.slowT > 0) drawGlow(ctx, m.x, m.y, r * 1.4, '#9fe8ff', 0.4);

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(crClamp(m.vx / 320, -0.32, 0.32) * (m.boss ? 0.25 : 1));
  const pop = m.isChild ? crEaseOutBack(Math.min(1, m.spawnT / 0.3)) : 1;
  const sq = m.squish * 0.2;
  ctx.scale(pop * (1 + sq), pop * (1 - sq));

  if (batImg && m.type === 'imp') {
    const img = tintedImage(batImg, tint?.primary);
    const size = r * 2.4;
    const bw = size * (batImg.width / batImg.height);
    ctx.drawImage(img, -bw / 2, -size / 2, bw, size);
    if (flash) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    (CREATURE_DRAW[m.type] || drawGoblin)(ctx, m, pal, t, look);
  }
  ctx.restore();

  // charging-shot telegraph — a growing glow orb where the shot comes from
  const w = m.windup;
  if (w > 0) {
    const oy = m.y + r * (m.boss ? 0.4 : 0.55);
    drawGlow(ctx, m.x, oy, 4 + w * r * (m.boss ? 0.9 : 0.6), m.enraged ? '#ff4d5a' : '#e07bff', 0.5 + w * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = w;
    ctx.beginPath(); ctx.arc(m.x, oy, 1.5 + w * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
