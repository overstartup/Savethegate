// ============================================================
// The Guardian — procedural, fully animated hero (replaces the old 2-frame
// sprite). A bronze crystal-knight with an arm cannon:
//   • hover-thrusters under both boots, flaring when climbing / moving fast
//   • a cape simulated as a verlet rope (trails, swings, settles naturally)
//   • leans into movement, legs swing with momentum, idle "breathing" bob
//   • cannon recoil on every shot + barrel heat glow under sustained fire
//   • crystal core + visor glow (rainbow during FEVER), red flash when hurt
//   • speed afterimages when dashing across the lane
// Local units: u = p.size / 36, body center at (p.x, p.y).
// Helpers are prefixed `hr` (the standalone build shares one scope).
// ============================================================
import { drawGlow } from './creatures.js';
import { CONFIG } from '../config.js';

const HR_ARMOR = { light: '#ffcf8a', primary: '#c27a3a', shade: '#7a3e18', dark: '#3a1a0a', rim: '#ffe0b0' };
// Armour and cape by Armory rank: bronze up to rank 2, then silver, gold,
// and LEGEND violet; the cape trim takes the rank's metal.
const HR_RANK_ARMOR = [null, null, null,
  { light: '#ffffff', primary: '#b8c4d4', shade: '#5e6a7c', dark: '#262c38', rim: '#ffffff' },
  { light: '#fff3a8', primary: '#ffc23d', shade: '#a8700c', dark: '#4a2a04', rim: '#fffbe0' },
  { light: '#ffd6f6', primary: '#d070e0', shade: '#6a2a8a', dark: '#2a0a3a', rim: '#ffffff' }];
const HR_RANK_CAPE = [null, ['#3a5fe0', '#16246e'], ['#3a5fe0', '#16246e'], ['#3a5fe0', '#16246e'], ['#d0304a', '#5a0a1e'], ['#7a3ae0', '#1a0a4e']];
const HR_RANK_TRIM = [null, '#c8d0dc', '#e09a5a', '#ffffff', '#ffd23d', '#ff9ae6'];
const hrRank = (r) => Math.max(1, Math.min(5, r || 1));
const HR_HURT = { light: '#ffd0d0', primary: '#ff6b6b', shade: '#a02a3a', dark: '#4a0a14', rim: '#ffffff' };
const HR_CAPE = 12;

export function heroUnit(p) { return p.size / 36; }

// Where bolts leave the cannon (world coords).
export function heroMuzzle(p) {
  const u = heroUnit(p);
  return { x: p.x + (p.facing || 1) * 13 * u, y: p.y - 44 * u };
}

// Physics/animation state — call once per update tick.
export function updateHero(p, dt, t) {
  const u = heroUnit(p);
  if (!p.cape) {
    p.cape = [];
    for (let i = 0; i < 7; i++) p.cape.push({ x: p.x, y: p.y - 12 * u + i * 5 * u, px: p.x, py: p.y - 12 * u + i * 5 * u });
    p.heat = 0; p.trail = []; p._lastRecoil = 0;
  }
  // cape: verlet rope pinned between the shoulders
  const c = p.cape;
  c[0].x = p.x; c[0].y = p.y - 12 * u;
  const g = 1400 * dt * dt;
  for (let i = 1; i < c.length; i++) {
    const q = c[i];
    const vx = (q.x - q.px) * 0.9, vy = (q.y - q.py) * 0.9;
    q.px = q.x; q.py = q.y;
    q.x += vx + Math.sin(t * 7 + i * 0.9) * 0.12 * u;
    q.y += vy + g;
  }
  const L = 5 * u;
  for (let k = 0; k < 4; k++) {
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const diff = (d - L) / d;
      if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; }
      else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
    }
    c[0].x = p.x; c[0].y = p.y - 12 * u;
  }
  // cannon heat builds with each shot, cools when idle
  if (p.recoil > p._lastRecoil + 0.5) p.heat = Math.min(1, p.heat + 0.09);
  p._lastRecoil = p.recoil;
  p.heat = Math.max(0, p.heat - dt * 0.7);
  // afterimages when moving fast
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  if (speed > 240) {
    p.trail.unshift({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, facing: p.facing });
    if (p.trail.length > 5) p.trail.pop();
  } else if (p.trail.length) p.trail.pop();
}

function hrShade(ctx, path, pal, r) {
  path();
  const gr = ctx.createRadialGradient(-r * 0.4, -r * 0.5, r * 0.05, 0, 0, r * 1.25);
  gr.addColorStop(0, pal.light);
  gr.addColorStop(0.5, pal.primary);
  gr.addColorStop(1, pal.shade);
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.save();
  path(); ctx.clip();
  ctx.translate(-r * 0.12, -r * 0.12);
  path();
  ctx.strokeStyle = pal.rim;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = r * 0.18;
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function hrCape(ctx, p, u, ghost, rank) {
  const c = p.cape;
  if (!c) return;
  const left = [], right = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x;
    const d = Math.hypot(nx, ny) || 1;
    nx /= d; ny /= d;
    const w = (HR_CAPE * 0.55 + i * 1.3) * u;
    left.push({ x: c[i].x + nx * w, y: c[i].y + ny * w });
    right.push({ x: c[i].x - nx * w, y: c[i].y - ny * w });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const q of left) ctx.lineTo(q.x, q.y);
  // ragged hem
  const last = c[c.length - 1];
  ctx.lineTo(last.x + (left[left.length - 1].x - last.x) * 0.3, last.y + 3 * u);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  if (ghost) { ctx.fillStyle = ghost; ctx.fill(); return; }
  const gr = ctx.createLinearGradient(c[0].x, c[0].y, last.x, last.y);
  const cc = HR_RANK_CAPE[hrRank(rank)];
  gr.addColorStop(0, cc[0]);
  gr.addColorStop(1, cc[1]);
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = HR_RANK_TRIM[hrRank(rank)];
  ctx.lineWidth = 1.4 * u;
  ctx.stroke();
}

function hrFlame(ctx, x, y, len, w, t, seed) {
  const fl = len * (0.85 + Math.random() * 0.3);
  drawGlow(ctx, x, y + fl * 0.45, w * 2.4, '#5cc8ff', 0.55);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createLinearGradient(0, y, 0, y + fl);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.35, 'rgba(127,216,255,0.85)');
  gr.addColorStop(1, 'rgba(60,120,255,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.8, y + fl * 0.55, x + Math.sin(t * 40 + seed) * w * 0.3, y + fl);
  ctx.quadraticCurveTo(x + w * 0.8, y + fl * 0.55, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Body in local coordinates (origin = body center, facing right).
function hrBody(ctx, p, u, t, opts) {
  const ghost = opts.ghost;
  const pal = opts.hurt ? HR_HURT : (HR_RANK_ARMOR[hrRank(opts.rank)] || HR_ARMOR);
  const fever = opts.fever;
  const coreCol = fever ? `hsl(${(t * 400) % 360},100%,65%)` : '#7fd8ff';
  const vx = (p.vx || 0) * (p.facing || 1);
  const bob = Math.sin(t * 3.2) * 1.2 * u;
  const legSwing = Math.max(-0.55, Math.min(0.55, -vx / 500));
  const flat = (path) => { path(); ctx.fillStyle = ghost; ctx.fill(); };
  const shade = (path, r, palette = pal) => (ghost ? flat(path) : hrShade(ctx, path, palette, r));

  ctx.translate(0, bob);

  // legs + boots (+ thrusters)
  for (const side of [-1, 1]) {
    const a = legSwing + side * Math.sin(t * 3.2) * 0.06;
    const hx = side * 5 * u, hy = 7 * u;
    const fx = hx + Math.sin(a) * 16 * u, fy = hy + Math.cos(a) * 16 * u;
    ctx.strokeStyle = ghost || '#5a2e14';
    ctx.lineWidth = 6 * u;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke();
    if (!ghost) {
      ctx.strokeStyle = pal.primary;
      ctx.lineWidth = 3.5 * u;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo((hx + fx) / 2, (hy + fy) / 2); ctx.stroke();
      const climb = Math.max(0, -(p.vy || 0)) / 300 + Math.abs(p.vx || 0) / 700;
      hrFlame(ctx, fx, fy + 4 * u, (7 + 11 * Math.min(1.2, 0.35 + climb)) * u, 3 * u, t, side);
    }
    shade(() => { ctx.beginPath(); ctx.roundRect(fx - 4.5 * u, fy - 3 * u, 9 * u, 7 * u, 2.5 * u); }, 6 * u);
  }

  // shield arm (back side)
  ctx.save();
  ctx.translate(-13 * u, -6 * u);
  ctx.rotate(0.25 + Math.sin(t * 3.2 + 1) * 0.05);
  shade(() => { ctx.beginPath(); ctx.roundRect(-3.5 * u, 0, 7 * u, 13 * u, 3 * u); }, 8 * u);
  shade(() => {
    ctx.beginPath();
    ctx.moveTo(-5 * u, 9 * u); ctx.lineTo(5 * u, 9 * u); ctx.lineTo(4 * u, 18 * u); ctx.lineTo(0, 22 * u); ctx.lineTo(-4 * u, 18 * u);
    ctx.closePath();
  }, 9 * u, { ...pal, light: '#bdeeff', primary: '#4a8fd0', shade: '#1c3a6a', rim: '#ffffff' });
  ctx.restore();

  // torso (chest plate) + belt
  shade(() => {
    ctx.beginPath();
    ctx.moveTo(-12 * u, -14 * u);
    ctx.lineTo(12 * u, -14 * u);
    ctx.quadraticCurveTo(13 * u, -2 * u, 9 * u, 6 * u);
    ctx.lineTo(-9 * u, 6 * u);
    ctx.quadraticCurveTo(-13 * u, -2 * u, -12 * u, -14 * u);
    ctx.closePath();
  }, 14 * u);
  if (!ghost) {
    ctx.fillStyle = '#3a1a0a';
    ctx.beginPath(); ctx.roundRect(-9.5 * u, 4 * u, 19 * u, 4.5 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.roundRect(-2.5 * u, 4.5 * u, 5 * u, 3.5 * u, 1 * u); ctx.fill();
    // crystal core
    const pulse = 0.75 + 0.25 * Math.sin(t * 5);
    drawGlow(ctx, 0, -5 * u, 10 * u * pulse, fever ? '#ff7ad9' : '#7fd8ff', 0.8);
    ctx.fillStyle = coreCol;
    ctx.beginPath(); ctx.moveTo(0, -11 * u); ctx.lineTo(4 * u, -5 * u); ctx.lineTo(0, 1 * u); ctx.lineTo(-4 * u, -5 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(0, -11 * u); ctx.lineTo(1.6 * u, -6 * u); ctx.lineTo(-2 * u, -5.5 * u); ctx.closePath(); ctx.fill();
  }

  // head: helmet + visor + crest
  shade(() => { ctx.beginPath(); ctx.arc(0, -21 * u, 8.5 * u, 0, Math.PI * 2); }, 9 * u);
  if (!ghost) {
    ctx.fillStyle = '#1a0d22';
    ctx.beginPath(); ctx.roundRect(-6.5 * u, -23 * u, 13 * u, 4.5 * u, 2 * u); ctx.fill();
    const vis = fever ? coreCol : '#9ff4ff';
    drawGlow(ctx, 2 * u, -20.8 * u, 7 * u, fever ? '#ff7ad9' : '#7fd8ff', 0.7);
    ctx.fillStyle = vis;
    ctx.beginPath(); ctx.roundRect(-4.5 * u, -21.8 * u, 10 * u, 2 * u, 1 * u); ctx.fill();
    // crystal crest
    ctx.fillStyle = '#7fd8ff';
    ctx.beginPath(); ctx.moveTo(-2 * u, -28 * u); ctx.lineTo(0, -36 * u); ctx.lineTo(2.5 * u, -28 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(-1 * u, -28.5 * u); ctx.lineTo(0, -35 * u); ctx.lineTo(0.6 * u, -28.5 * u); ctx.closePath(); ctx.fill();
  }

  // pauldrons
  for (const side of [-1, 1]) {
    shade(() => { ctx.beginPath(); ctx.ellipse(side * 12 * u, -12.5 * u, 6.5 * u, 5 * u, side * 0.25, 0, Math.PI * 2); }, 7 * u);
  }

  // cannon arm — points straight up, kicks back on each shot
  const kick = (p.recoil || 0) * (p.recoil || 0) * 6 * u;
  ctx.save();
  ctx.translate(13 * u, kick);
  shade(() => { ctx.beginPath(); ctx.roundRect(-4 * u, -12 * u, 8 * u, 14 * u, 3 * u); }, 8 * u); // forearm
  shade(() => { ctx.beginPath(); ctx.roundRect(-4.5 * u, -42 * u, 9 * u, 32 * u, 3 * u); }, 12 * u, { ...pal, light: '#e8e0d8', primary: '#8a8590', shade: '#3e3a48', rim: '#ffffff' }); // barrel
  if (!ghost) {
    ctx.fillStyle = pal.primary;
    for (const by of [-36, -26, -16]) { ctx.beginPath(); ctx.roundRect(-5.5 * u, by * u, 11 * u, 3 * u, 1.2 * u); ctx.fill(); }
    // heat vents glow
    const heat = p.heat || 0;
    if (heat > 0.05) {
      drawGlow(ctx, 0, -27 * u, (6 + heat * 8) * u, '#ff8a3d', heat * 0.9);
      ctx.fillStyle = `rgba(255,${Math.round(200 - heat * 120)},80,${0.4 + heat * 0.6})`;
      for (const vy of [-31, -21]) { ctx.beginPath(); ctx.roundRect(-2.5 * u, vy * u, 5 * u, 1.6 * u, 0.8 * u); ctx.fill(); }
    }
    ctx.fillStyle = '#1a1220';
    ctx.beginPath(); ctx.ellipse(0, -42 * u, 3 * u, 1.4 * u, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Full hero draw in world space. opts: { fever, hurt, rank }
export function drawHero(ctx, p, t, opts = {}) {
  const u = heroUnit(p);
  const f = p.facing || 1;
  const lean = Math.max(-0.24, Math.min(0.24, (p.vx || 0) / 1400));

  // speed afterimages (cyan ghosts)
  if (p.trail && p.trail.length > 1 && (!CONFIG.quality || CONFIG.quality.level >= 2)) {
    for (let i = p.trail.length - 1; i >= 1; i--) {
      const g = p.trail[i];
      ctx.save();
      ctx.globalAlpha = 0.22 * (1 - i / p.trail.length);
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.max(-0.24, Math.min(0.24, (g.vx || 0) / 1400)));
      ctx.scale(g.facing || 1, 1);
      hrBody(ctx, { ...p, vx: g.vx, vy: g.vy, recoil: 0 }, u, t, { ghost: '#7fd8ff' });
      ctx.restore();
    }
  }

  // hover shadow on the ground
  ctx.save();
  ctx.globalAlpha *= 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 36 * u, 13 * u, 3.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  hrCape(ctx, p, u, null, opts.rank);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(lean);
  ctx.scale(f, 1);
  hrBody(ctx, p, u, t, opts);
  ctx.restore();

  // muzzle flash star
  if ((p.recoil || 0) > 0.55) {
    const mz = heroMuzzle(p);
    const k = (p.recoil - 0.55) / 0.45;
    drawGlow(ctx, mz.x, mz.y, (10 + k * 12) * u, opts.fever ? '#ff7ad9' : '#ffe9a8', k);
    ctx.save();
    ctx.translate(mz.x, mz.y);
    ctx.rotate(t * 20);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = k;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = (i % 2 === 0 ? 8 * k + 2 : 2) * u;
      ctx.lineTo(Math.cos((i / 8) * Math.PI * 2) * rr, Math.sin((i / 8) * Math.PI * 2) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// Static-ish portrait for menus (Armory card / dialog).
const hrIcons = new Map(); // one physics state per portrait size (card vs dialog)
export function drawHeroIcon(ctx, x, y, s, t, rank = 1) {
  let p = hrIcons.get(s);
  if (!p) { p = { x: 0, y: 0, size: 36, facing: 1, vx: 0, vy: 0, recoil: 0, heat: 0 }; hrIcons.set(s, p); }
  p.size = 36 * (s / 80);
  const u = heroUnit(p);
  p.x = x; p.y = y + 6 * u;
  p.recoil = Math.max(0, Math.sin(t * 3)) > 0.97 ? 1 : (p.recoil || 0) * 0.9;
  updateHero(p, 1 / 60, t);
  drawHero(ctx, p, t, { rank });
}

