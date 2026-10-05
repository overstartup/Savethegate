// ============================================================
// Stage atmosphere — motion layers drawn over every stage's backdrop so the
// battlefield always feels alive: swaying god-rays tinted by the stage,
// drifting fog banks, depth motes streaming past, a cinematic vignette, a
// red danger pulse when Shatterlings close in on the gate, and a rainbow
// border during FEVER.
// ============================================================
import { CONFIG } from '../config.js';

let atVignette = null;
function atGetVignette() {
  if (atVignette) return atVignette;
  const c = document.createElement('canvas');
  c.width = CONFIG.width; c.height = CONFIG.height;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(CONFIG.width / 2, CONFIG.height * 0.45, CONFIG.height * 0.3, CONFIG.width / 2, CONFIG.height * 0.45, CONFIG.height * 0.78);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  atVignette = c;
  return c;
}

const atFogCache = new Map();
function atFogBand(color) {
  let c = atFogCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 512; c.height = 120;
  const g = c.getContext('2d');
  // a few soft overlapping puffs → a seamless-ish cloud band
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * 512 + Math.random() * 30, y = 60 + (Math.random() - 0.5) * 40, r = 40 + Math.random() * 40;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    // wrap copy so it tiles horizontally
    g.fillRect(x - r - 512, y - r, r * 2, r * 2);
    g.fillRect(x - r + 512, y - r, r * 2, r * 2);
  }
  atFogCache.set(color, c);
  return c;
}

function atHexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const atMotes = [];
for (let i = 0; i < 26; i++) {
  atMotes.push({ x: Math.random() * CONFIG.width, y: Math.random() * CONFIG.height, z: 0.3 + Math.random() * 0.9, ph: Math.random() * 6 });
}

// Back layer: drawn right after the stage background, before gameplay.
export function renderAtmosphereBack(ctx, def, t) {
  const W = CONFIG.width, H = CONFIG.height;
  const col = def.decorColor || '#ffffff';

  // god rays from the top, slowly swaying
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const baseX = W * (0.15 + i * 0.25) + Math.sin(t * 0.25 + i * 1.7) * 30;
    const spread = 50 + 20 * Math.sin(t * 0.4 + i);
    const a = 0.05 + 0.03 * Math.sin(t * 0.7 + i * 2.1);
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    grad.addColorStop(0, atHexA(col, a));
    grad.addColorStop(1, atHexA(col, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(baseX - 14, -10);
    ctx.lineTo(baseX + 14, -10);
    ctx.lineTo(baseX + spread + 60, H * 0.75);
    ctx.lineTo(baseX - spread + 60, H * 0.75);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // drifting fog banks at two depths
  const fog = atFogBand(atHexA(col, 0.16));
  for (const [y, speed, alpha] of [[H * 0.3, 9, 0.7], [H * 0.62, -14, 0.5]]) {
    const off = ((t * speed) % 512 + 512) % 512;
    ctx.globalAlpha = alpha;
    for (let x = -off; x < W; x += 512) ctx.drawImage(fog, x, y - 60);
  }
  ctx.globalAlpha = 1;

  // depth motes streaming down — sells the feeling of marching forward
  ctx.fillStyle = col;
  for (const m of atMotes) {
    const y = ((m.y + t * m.z * 38) % (H + 20)) - 10;
    const x = m.x + Math.sin(t * 0.8 + m.ph) * 10 * m.z;
    ctx.globalAlpha = 0.12 + 0.18 * m.z;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + m.z * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Front layer: vignette + danger + fever, drawn after gameplay, before HUD.
export function renderAtmosphereFront(ctx, st, t, fever) {
  const W = CONFIG.width, H = CONFIG.height;
  ctx.drawImage(atGetVignette(), 0, 0);

  // danger: how close is the nearest Shatterling to the gate?
  let maxY = 0;
  for (const m of st.monsters) if (!m.dead && !m.boss && m.y > maxY) maxY = m.y;
  const danger = Math.max(0, Math.min(1, (maxY - H * 0.55) / (H * 0.3)));
  if (danger > 0) {
    const pulse = 0.55 + 0.45 * Math.sin(t * 9);
    const grad = ctx.createLinearGradient(0, H, 0, H * 0.6);
    grad.addColorStop(0, `rgba(255,40,70,${0.42 * danger * pulse})`);
    grad.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  // The gate line — a living energy barrier the Shatterlings must not cross.
  {
    const gy = CONFIG.gateY;
    const hurt = Math.min(1, (st.gateFlash || 0) * 2);
    const low = st.lives <= 1;
    const base = hurt > 0 || low ? '255,92,122' : '127,216,255';
    const pulse = 0.55 + 0.25 * Math.sin(t * (low ? 9 : 3));
    const grad = ctx.createLinearGradient(0, gy - 26, 0, gy + 4);
    grad.addColorStop(0, `rgba(${base},0)`);
    grad.addColorStop(1, `rgba(${base},${0.28 * pulse + hurt * 0.4})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, gy - 26, W, 30);
    ctx.save();
    ctx.strokeStyle = `rgba(${base},${0.75 * pulse + hurt * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = gy + Math.sin(x * 0.05 + t * 4) * 1.5 + Math.sin(x * 0.13 - t * 6) * hurt * 4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // runes travelling along the barrier
    ctx.fillStyle = `rgba(255,255,255,${0.6 * pulse})`;
    for (let i = 0; i < 6; i++) {
      const x = ((t * 40 + i * (W / 6)) % (W + 20)) - 10;
      ctx.beginPath(); ctx.arc(x, gy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // gate hit flash along the bottom edge
  if (st.gateFlash > 0) {
    const grad = ctx.createLinearGradient(0, H, 0, H - 160);
    grad.addColorStop(0, `rgba(255,70,90,${Math.min(0.7, st.gateFlash * 2)})`);
    grad.addColorStop(1, 'rgba(255,70,90,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 160, W, 160);
  }

  if (fever > 0) {
    const hue = (t * 240) % 360;
    ctx.save();
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 12);
    ctx.strokeStyle = `hsl(${hue},100%,65%)`;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = `hsl(${(hue + 120) % 360},100%,75%)`;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.restore();
  }
}
