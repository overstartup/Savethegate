// ============================================================
// The Gate — the fortress the player defends, drawn across the bottom of the
// battlefield where every stage's road ends: a crenellated wall, two towers
// and a gatehouse with an arched door. Enemies that reach it cost a heart
// (collision.js, CONFIG.gateY). Ward-gems above the arch show the hearts
// left; every lost heart darkens a gem and cracks the wall further. Themed
// per stage. Static parts are cached (rebuilt only when hearts change);
// gems, banners and torches animate live. Helpers prefixed `gt`.
// ============================================================
import { CONFIG } from '../config.js';
import { ssRoadCenter } from './stageset.js';

const GT_TAU = Math.PI * 2;

// stone: [light, dark] · trim: arch/edge stone · door: [light, dark]
// glow: ward-gems · banner · extra: decoration on the stonework
// material: 'brick' (default) | 'ice' | 'logs' · top: tower tops (see
// gtTowerTop) · roof: tower-top colours · emblem: on the arch keystone ·
// side: stage scenery beside the gate (gtSide). Built from each stage's
// island art on the home map.
const GT_THEMES = {
  1: { stone: ['#5f8a8c', '#2c4a52'], trim: '#8ab8b4', door: ['#3a5a52', '#16282a'], glow: '#7fe8ff', banner: '#2a8ab0', extra: 'coral', top: 'coral', emblem: 'shell', side: 'seaweed' },
  2: { stone: ['#e2f2fa', '#9cc4dc'], trim: '#ffffff', door: ['#6aa8d0', '#2a5a80'], glow: '#9ae6ff', banner: '#3a7ac8', extra: 'icicles', material: 'ice', top: 'spire', emblem: 'snowflake', side: 'crystals' },
  3: { stone: ['#ecc888', '#b07a3e'], trim: '#ffe0a0', door: ['#8a5428', '#4a2a10'], glow: '#ffd23d', banner: '#1fa098', roof: ['#5ad0c8', '#1f8a86'], top: 'onion', emblem: 'sun', side: 'palms' },
  4: { stone: ['#8aa89a', '#4a6a5c'], trim: '#c8b0ff', door: ['#5a4a7a', '#2a2040'], glow: '#c88aff', banner: '#8a4ad8', extra: 'crystals', top: 'crystal', emblem: 'gem', side: 'crystals' },
  5: { stone: ['#4e3a36', '#1e1412'], trim: '#6a4a40', door: ['#3a2018', '#140806'], glow: '#ff7a2a', banner: '#b02a1a', extra: 'lava', top: 'horns', emblem: 'skull', side: 'spires' },
  6: { stone: ['#f6eed8', '#c8b48a'], trim: '#e8b838', door: ['#8a5a28', '#4a2a10'], glow: '#ffe08a', banner: '#3a8a5a', roof: ['#e8b838', '#a07818'], top: 'cage', emblem: 'bird', side: 'trees', sideColor: '#4f8a4a' },
  7: { stone: ['#4e4274', '#221a3c'], trim: '#7a6aa8', door: ['#2a2040', '#0e0a1a'], glow: '#9a7aff', banner: '#5a3aa8', extra: 'runes', top: 'tree', emblem: 'eye', side: 'crystals' },
  8: { stone: ['#ffffff', '#b8bedc'], trim: '#ffe08a', door: ['#5a62b0', '#262a60'], glow: '#b6c8ff', banner: '#4a5ab8', roof: ['#f0f2fc', '#8a9aee'], top: 'dome', emblem: 'star', side: 'columns' },
  9: { stone: ['#9a7a56', '#4e3a24'], trim: '#c89048', door: ['#5a4a3a', '#2a2018'], glow: '#ffc86a', banner: '#8a3a2a', extra: 'rivets', top: 'chimney', emblem: 'gear' },
  10: { stone: ['#5e4a7a', '#2a1e3e'], trim: '#8a7aa8', door: ['#4a3a24', '#22180e'], glow: '#c8a0ff', banner: '#3e8a6e', extra: 'vines', roof: ['#b088ff', '#5a2ab0'], top: 'mushroom', emblem: 'spore', side: 'mushrooms' },
  11: { stone: ['#b4b8c0', '#6e727c'], trim: '#d8dce4', door: ['#6a4a2a', '#2e1e10'], glow: '#ffd23d', banner: '#3a5ab8', roof: ['#5a7ac8', '#2a3a7a'], top: 'cone', emblem: 'crown', side: 'pines' },
  12: { stone: ['#8a6a46', '#4a3420'], trim: '#9a8a6a', door: ['#4a3420', '#1e140a'], glow: '#a8ff7a', banner: '#3a6a2a', extra: 'vines', material: 'logs', top: 'stake', emblem: 'leaf', side: 'trees', sideColor: '#2a5a2a' },
};

function gtRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

// Layout, all derived from the gate line so it moves with CONFIG.
function gtLayout() {
  const gy = CONFIG.gateY;
  const cx = ssRoadCenter(gy);
  return {
    gy, cx,
    wallTop: gy - 36,          // wall walk (enemies "hit" the wall here)
    houseTop: gy - 80,         // gatehouse roofline
    houseHalf: 64,
    towerTop: gy - 108,
    towerHalf: 21,
    towerOff: 86,              // tower centres at cx ± towerOff
    archR: 36,
    archY: gy - 4,             // arch spring line
    gemY: gy - 62,             // row of ward-gems above the arch
    top: gy - 150,             // top of the cached region
  };
}

function gtBricks(g, x0, y0, x1, y1, r, rowH = 11, brickW = 26) {
  g.save();
  g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  for (let y = y0, row = 0; y < y1; y += rowH, row++) {
    const off = (row % 2) * brickW / 2;
    for (let x = x0 - brickW + off; x < x1; x += brickW) {
      const v = r() - 0.5;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v * 0.14})` : `rgba(0,0,0,${-v * 0.18})`;
      g.fillRect(x + 1, y + 1, brickW - 2, rowH - 2);
    }
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x0, y + rowH - 1, x1 - x0, 1);
    for (let x = x0 - brickW + off; x < x1; x += brickW) g.fillRect(x, y, 1, rowH);
  }
  g.restore();
}

function gtMerlons(g, x0, x1, y, h, w, gap, c) {
  g.fillStyle = c;
  for (let x = x0; x < x1 - 2; x += w + gap) g.fillRect(x, y - h, Math.min(w, x1 - x), h + 1);
}

// ---- per-stage styling: tower tops, wall material, emblem, side decor ----
function gtGrad(g, x0, y0, x1, y1, c0, c1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}

// wall/tower/gatehouse body texture
function gtBody(g, th, x0, y0, x1, y1, r, rowH = 11, brickW = 26) {
  if (th.material === 'logs') { // vertical logs with dark gaps
    g.save();
    g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    for (let x = x0; x < x1; x += 10) {
      g.fillStyle = gtGrad(g, x, 0, x + 10, 0, 'rgba(255,230,190,0.18)', 'rgba(0,0,0,0.25)');
      g.fillRect(x + 1, y0, 8, y1 - y0);
      g.fillStyle = 'rgba(20,12,4,0.5)';
      g.fillRect(x, y0, 1, y1 - y0);
      if (r() < 0.35) { g.fillStyle = 'rgba(60,40,20,0.5)'; g.beginPath(); g.ellipse(x + 5, y0 + 8 + r() * (y1 - y0 - 16), 2, 3, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  } else if (th.material === 'ice') {
    gtBricks(g, x0, y0, x1, y1, r, 16, 34);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = y0; y < y1; y += 16) g.fillRect(x0, y, x1 - x0, 1);
  } else {
    gtBricks(g, x0, y0, x1, y1, r, rowH, brickW);
  }
}

// battlement along a top edge (pointed stakes on a log palisade)
function gtTopEdge(g, th, x0, x1, y, h, w, gap) {
  if (th.material === 'logs') {
    g.fillStyle = th.stone[0];
    for (let x = x0; x < x1; x += 10) {
      g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(x + 5, y - h - 2); g.lineTo(x + 9, y + 1); g.closePath(); g.fill();
    }
  } else {
    gtMerlons(g, x0, x1, y, h, w, gap, th.stone[0]);
  }
}

// the top of each tower, per stage
function gtTowerTop(g, th, x, y, w, r) {
  const roofGrad = () => gtGrad(g, x - w, 0, x + w, 0, (th.roof || th.stone)[0], (th.roof || th.stone)[1]);
  switch (th.top) {
    case 'cone':
      g.fillStyle = roofGrad();
      g.beginPath(); g.moveTo(x - w - 5, y); g.lineTo(x, y - 32); g.lineTo(x + w + 5, y); g.closePath(); g.fill();
      break;
    case 'onion': // Oasis: bulb dome with a gold finial
      g.fillStyle = roofGrad();
      g.beginPath();
      g.moveTo(x - w - 1, y);
      g.bezierCurveTo(x - w - 9, y - 20, x - 6, y - 24, x, y - 38);
      g.bezierCurveTo(x + 6, y - 24, x + w + 9, y - 20, x + w + 1, y);
      g.closePath(); g.fill();
      g.strokeStyle = '#ffd23d'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y - 38); g.lineTo(x, y - 47); g.stroke();
      g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(x, y - 48, 2.5, 0, Math.PI * 2); g.fill();
      break;
    case 'cage': // Aviary: golden birdcage dome
      g.fillStyle = 'rgba(255,236,170,0.25)';
      g.beginPath(); g.arc(x, y, w + 3, Math.PI, 0); g.fill();
      g.strokeStyle = '#e8b838'; g.lineWidth = 1.6;
      for (let k = -3; k <= 3; k++) {
        g.beginPath(); g.moveTo(x + k * (w + 3) / 3.5, y);
        g.quadraticCurveTo(x + k * (w + 3) / 3.5, y - (w + 3) * 0.9, x, y - w - 3); g.stroke();
      }
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - w - 4, y); g.lineTo(x + w + 4, y); g.stroke();
      g.fillStyle = '#e8b838'; g.beginPath(); g.arc(x, y - w - 6, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = ['#ff7a5a', '#5ad8ff'][Math.floor(r() * 2)]; // a bird inside
      g.beginPath(); g.ellipse(x, y - 7, 4.5, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + 3.5, y - 10, 2.5, 0, Math.PI * 2); g.fill();
      break;
    case 'spire': // Glacial: a crown of ice spikes
      for (const [ox, h, c] of [[-0.55, 22, '#cfeeff'], [0.55, 26, '#b8e4fa'], [0, 42, '#ffffff']]) {
        g.fillStyle = gtGrad(g, x + ox * w - 6, 0, x + ox * w + 6, 0, c, '#7fc8ec');
        g.beginPath(); g.moveTo(x + ox * w - 6, y + 1); g.lineTo(x + ox * w, y - h); g.lineTo(x + ox * w + 6, y + 1); g.closePath(); g.fill();
      }
      break;
    case 'crystal': // Crystallized Forest: a cluster of coloured crystals
      for (const [ox, h, a, c] of [[-0.6, 24, -0.3, ['#e0b0ff', '#8a4ad8']], [0.6, 28, 0.3, ['#b0fff0', '#2aa890']], [0, 40, 0, ['#ffc0e0', '#d04a90']]]) {
        g.save(); g.translate(x + ox * w, y + 1); g.rotate(a);
        g.fillStyle = c[0]; g.beginPath(); g.moveTo(-5, 0); g.lineTo(-5, -h * 0.75); g.lineTo(0, -h); g.lineTo(0, 0); g.fill();
        g.fillStyle = c[1]; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.lineTo(5, -h * 0.75); g.lineTo(5, 0); g.fill();
        g.restore();
      }
      break;
    case 'horns': // Draconic: jagged crown and two curved horns
      g.fillStyle = th.stone[0];
      g.beginPath(); g.moveTo(x - w, y + 1);
      for (let k = 0; k <= 6; k++) g.lineTo(x - w + k * (w * 2 / 6), y - (k % 2 ? 4 : 11));
      g.lineTo(x + w, y + 1); g.closePath(); g.fill();
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 4; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(x + s * w * 0.7, y - 6); g.quadraticCurveTo(x + s * (w + 12), y - 18, x + s * (w + 4), y - 34); g.stroke();
      }
      break;
    case 'chimney': // Clockwork: a brick smokestack (smoke is drawn live)
      gtMerlons(g, x - w - 3, x + w + 3, y, 8, 9, 6, th.stone[0]);
      g.fillStyle = gtGrad(g, x - 6, 0, x + 6, 0, '#a85a3a', '#5a2a1a');
      g.fillRect(x - 6, y - 30, 12, 30);
      g.fillStyle = '#3a2a22'; g.fillRect(x - 8, y - 33, 16, 5);
      g.fillStyle = '#c89048'; g.fillRect(x - 6, y - 18, 12, 2);
      break;
    case 'mushroom': // Spectral Jungle: a giant glowing cap
      g.fillStyle = gtGrad(g, 0, y - 30, 0, y, (th.roof || ['#a878ff'])[0], (th.roof || ['', '#5a2ab0'])[1]);
      g.beginPath(); g.moveTo(x - w - 12, y + 2); g.bezierCurveTo(x - w - 12, y - 34, x + w + 12, y - 34, x + w + 12, y + 2);
      g.quadraticCurveTo(x, y - 6, x - w - 12, y + 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (const [dx, dy, rr] of [[-10, -14, 3.5], [6, -20, 4], [14, -9, 2.5], [-2, -9, 2]]) { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, Math.PI * 2); g.fill(); }
      break;
    case 'dome': // Aetherial: white observatory dome with a slit
      g.fillStyle = roofGrad();
      g.beginPath(); g.arc(x, y, w + 2, Math.PI, 0); g.fill();
      g.fillStyle = 'rgba(20,24,60,0.7)'; g.fillRect(x - 2, y - w - 1, 4, w);
      g.strokeStyle = '#ffe08a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - w - 3, y); g.lineTo(x + w + 3, y); g.stroke();
      break;
    case 'coral': // Abyssal Rift: a broken, coral-grown top
      g.fillStyle = th.stone[0];
      g.beginPath(); g.moveTo(x - w, y + 1); g.lineTo(x - w, y - 6); g.lineTo(x - w * 0.3, y - 2); g.lineTo(x + w * 0.2, y - 10); g.lineTo(x + w, y - 4); g.lineTo(x + w, y + 1); g.fill();
      g.lineCap = 'round';
      for (const [ox, c] of [[-0.5, '#ff7a8a'], [0.4, '#ffb05a'], [0, '#c87aff']]) {
        g.strokeStyle = c; g.lineWidth = 3;
        const bx = x + ox * w;
        g.beginPath(); g.moveTo(bx, y - 4); g.lineTo(bx, y - 18); g.moveTo(bx, y - 11); g.lineTo(bx - 6, y - 20); g.moveTo(bx, y - 13); g.lineTo(bx + 6, y - 22); g.stroke();
      }
      break;
    case 'tree': // Abyssal Forest: twisted branches with violet leaves
      g.strokeStyle = '#2e1e42'; g.lineCap = 'round';
      for (const [a, len] of [[-0.6, 22], [0.1, 30], [0.7, 20]]) {
        g.lineWidth = 4;
        const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(a) * len * 0.3 + 4, y - len * 0.6, ex, ey); g.stroke();
        g.fillStyle = 'rgba(138,106,216,0.85)';
        g.beginPath(); g.arc(ex, ey, 7, 0, Math.PI * 2); g.fill();
      }
      break;
    case 'stake': // Deepwood: sharpened log tops
      g.fillStyle = th.stone[0];
      for (let xx = x - w; xx < x + w; xx += 8) {
        g.beginPath(); g.moveTo(xx, y + 1); g.lineTo(xx + 4, y - 12); g.lineTo(xx + 8, y + 1); g.closePath(); g.fill();
      }
      break;
    default:
      gtMerlons(g, x - w - 3, x + w + 3, y, 8, 9, 6, th.stone[0]);
      g.fillStyle = th.stone[0]; g.fillRect(x - w - 3, y - 1, w * 2 + 6, 4);
  }
}

// emblem on the arch's keystone, per stage (the gear turns — drawn live)
function gtEmblem(g, kind, x, y) {
  g.save();
  g.translate(x, y);
  g.lineJoin = 'round';
  switch (kind) {
    case 'crown':
      g.fillStyle = '#ffd23d'; g.strokeStyle = '#7a5410'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-10, 5); g.lineTo(-10, -5); g.lineTo(-5, 0); g.lineTo(0, -8); g.lineTo(5, 0); g.lineTo(10, -5); g.lineTo(10, 5); g.closePath(); g.fill(); g.stroke();
      break;
    case 'skull':
      g.fillStyle = '#e8dcc0';
      g.beginPath(); g.ellipse(0, -1, 9, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(-5, 4, 10, 5);
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 2.5; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 7, -5); g.quadraticCurveTo(s * 14, -10, s * 12, -16); g.stroke(); }
      g.fillStyle = '#ff6a2a';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 3.5, -1, 2.2, 0, Math.PI * 2); g.fill(); }
      break;
    case 'star':
      g.fillStyle = '#ffe08a';
      g.beginPath(); g.moveTo(0, -11); g.quadraticCurveTo(0, 0, 11, 0); g.quadraticCurveTo(0, 0, 0, 11); g.quadraticCurveTo(0, 0, -11, 0); g.quadraticCurveTo(0, 0, 0, -11); g.fill();
      break;
    case 'shell':
      g.fillStyle = '#ffb0c0'; g.strokeStyle = '#a8506a'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 7); g.arc(0, 2, 10, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.fill(); g.stroke();
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(0, 7); g.lineTo(k * 4, -6); g.stroke(); }
      break;
    case 'sun':
      g.fillStyle = '#ffd23d'; g.strokeStyle = '#ffd23d'; g.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); g.stroke(); }
      g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill();
      break;
    case 'snowflake':
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(c * 10, s * 10);
        g.moveTo(c * 6, s * 6); g.lineTo(c * 6 + Math.cos(a + 0.8) * 3, s * 6 + Math.sin(a + 0.8) * 3); g.stroke();
      }
      break;
    case 'gem':
      g.fillStyle = '#e0b0ff'; g.beginPath(); g.moveTo(0, -10); g.lineTo(-7, 0); g.lineTo(0, 0); g.fill();
      g.fillStyle = '#8a4ad8'; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 0); g.lineTo(0, 0); g.fill();
      g.fillStyle = '#5a2aa8'; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(0, 9); g.fill();
      break;
    case 'bird':
      g.fillStyle = '#e8b838';
      g.beginPath(); g.ellipse(0, 1, 8, 5, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(6, -4, 3.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-6, 0); g.lineTo(-13, -6); g.lineTo(-10, 2); g.fill();
      g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(9, -5); g.lineTo(13, -3.5); g.lineTo(9, -2.5); g.fill();
      break;
    case 'eye':
      g.fillStyle = '#d8c8ff';
      g.beginPath(); g.moveTo(-11, 0); g.quadraticCurveTo(0, -9, 11, 0); g.quadraticCurveTo(0, 9, -11, 0); g.fill();
      g.fillStyle = '#7a4ad8'; g.beginPath(); g.arc(0, 0, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#140a28'; g.beginPath(); g.arc(0, 0, 2, 0, Math.PI * 2); g.fill();
      break;
    case 'spore':
      g.fillStyle = '#e0c8ff'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a878ff';
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 2, 0, Math.PI * 2); g.fill(); }
      break;
    case 'leaf':
      g.fillStyle = '#6aba4a'; g.strokeStyle = '#2a5a1a'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(-10, 0, 0, -11); g.quadraticCurveTo(10, 0, 0, 10); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, 9); g.lineTo(0, -8); g.stroke();
      break;
    default: // plain keystone
      g.fillStyle = '#9a9ea8';
      g.beginPath(); g.moveTo(-7, -8); g.lineTo(7, -8); g.lineTo(5, 3); g.lineTo(-5, 3); g.closePath(); g.fill();
  }
  g.restore();
}

// stage scenery standing beside the gate, behind the curtain wall
function gtSide(g, th, L, r) {
  const W = CONFIG.width, base = L.wallTop + 12;
  const spots = [];
  for (const side of [-1, 1]) {
    const inner = L.cx + side * (L.towerOff + L.towerHalf + 14);
    for (let k = 0; k < 3; k++) {
      const x = inner + side * (k * 34 + r() * 12);
      if (x > 6 && x < W - 6) spots.push(x);
    }
  }
  for (const x of spots) {
    switch (th.side) {
      case 'palms': {
        const tx = x + (r() - 0.5) * 10, ty = base - 44;
        g.strokeStyle = '#8a6236'; g.lineWidth = 3.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x, base - 25, tx, ty); g.stroke();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.6, len = 20;
          g.strokeStyle = k % 2 ? '#3f8a3a' : '#5aa848'; g.lineWidth = 4;
          g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 4, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.5 + 9); g.stroke();
        }
        break;
      }
      case 'pines': {
        const h = 38 + r() * 14;
        g.fillStyle = th.sideColor || '#2e5a3a';
        for (let k = 0; k < 3; k++) {
          const ty = base - h * (0.25 + k * 0.28), w = 12 - k * 3;
          g.beginPath(); g.moveTo(x - w, ty + 10); g.lineTo(x, ty - 12); g.lineTo(x + w, ty + 10); g.closePath(); g.fill();
        }
        break;
      }
      case 'crystals': {
        const c = [['#e0b0ff', '#8a4ad8'], ['#b0fff0', '#2aa890'], ['#cfeeff', '#6fb6e0']][Math.floor(r() * 3)];
        for (const [ox, h] of [[-5, 20 + r() * 8], [5, 26 + r() * 10]]) {
          g.fillStyle = c[0]; g.beginPath(); g.moveTo(x + ox - 4, base); g.lineTo(x + ox, base - h); g.lineTo(x + ox, base); g.fill();
          g.fillStyle = c[1]; g.beginPath(); g.moveTo(x + ox, base); g.lineTo(x + ox, base - h); g.lineTo(x + ox + 4, base); g.fill();
        }
        break;
      }
      case 'seaweed': {
        g.strokeStyle = ['#3fa070', '#ff8a5a', '#c87aff'][Math.floor(r() * 3)]; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, base);
        for (let k = 1; k <= 5; k++) g.lineTo(x + Math.sin(k * 1.4) * 5, base - k * 9);
        g.stroke();
        break;
      }
      case 'mushrooms': {
        const h = 20 + r() * 14;
        g.fillStyle = '#e0d8f0'; g.fillRect(x - 2.5, base - h, 5, h);
        g.fillStyle = '#8a5ad8';
        g.beginPath(); g.ellipse(x, base - h, 12, 7, 0, Math.PI, 0); g.fill();
        break;
      }
      case 'spires': {
        const h = 24 + r() * 16;
        g.fillStyle = '#2a1a16';
        g.beginPath(); g.moveTo(x - 8, base); g.lineTo(x - 1, base - h); g.lineTo(x + 8, base); g.fill();
        g.strokeStyle = 'rgba(255,110,30,0.8)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x - 1, base - h * 0.3); g.lineTo(x + 1, base - h * 0.7); g.stroke();
        break;
      }
      case 'columns': {
        const h = 30 + r() * 14;
        g.fillStyle = gtGrad(g, x - 5, 0, x + 5, 0, '#ffffff', '#b8bedc');
        g.fillRect(x - 5, base - h, 10, h);
        g.fillRect(x - 8, base - h - 4, 16, 4);
        break;
      }
      case 'trees': {
        g.fillStyle = '#4a3420'; g.fillRect(x - 3, base - 22, 6, 22);
        g.fillStyle = th.sideColor || '#2e5a2a';
        g.beginPath(); g.arc(x, base - 30, 14, 0, Math.PI * 2); g.arc(x - 9, base - 22, 10, 0, Math.PI * 2); g.arc(x + 9, base - 22, 10, 0, Math.PI * 2); g.fill();
        break;
      }
    }
  }
}

function gtBuild(stage, th, lives, max, k) {
  const L = gtLayout(), W = CONFIG.width, H = CONFIG.height;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * k); cv.height = Math.round((H - L.top) * k);
  const g = cv.getContext('2d');
  g.scale(k, k); g.translate(0, -L.top);
  const r = gtRng(stage * 7919 + 3);
  const { gy, cx, wallTop, houseTop, houseHalf, towerTop, towerHalf, towerOff, archR } = L;
  const stoneGrad = (y0, y1) => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, th.stone[0]); gr.addColorStop(1, th.stone[1]);
    return gr;
  };

  // shadow the wall casts up onto the field
  const sh = g.createLinearGradient(0, wallTop - 22, 0, wallTop);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = sh; g.fillRect(0, wallTop - 22, W, 22);

  // stage scenery standing beside the gate, behind the curtain wall
  gtSide(g, th, L, r);

  // curtain wall
  g.fillStyle = stoneGrad(wallTop, H);
  g.fillRect(0, wallTop, W, H - wallTop);
  gtBody(g, th, 0, wallTop + 3, W, H, r);
  gtTopEdge(g, th, 0, W, wallTop, 9, 15, 9);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, wallTop, W, 2);

  // towers
  for (const side of [-1, 1]) {
    const tx = cx + side * towerOff;
    g.fillStyle = stoneGrad(towerTop, H);
    g.fillRect(tx - towerHalf, towerTop, towerHalf * 2, H - towerTop);
    gtBody(g, th, tx - towerHalf, towerTop + 3, tx + towerHalf, H, r, 10, 20);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(tx + towerHalf - 6, towerTop, 6, H - towerTop); // side shade
    gtTowerTop(g, th, tx, towerTop, towerHalf, r);
    g.fillStyle = 'rgba(10,6,20,0.85)'; // arrow slit
    g.fillRect(tx - 2, towerTop + 14, 4, 14);
  }

  // gatehouse
  g.fillStyle = stoneGrad(houseTop, H);
  g.fillRect(cx - houseHalf, houseTop, houseHalf * 2, H - houseTop);
  gtBody(g, th, cx - houseHalf, houseTop + 3, cx + houseHalf, H, r);
  gtTopEdge(g, th, cx - houseHalf - 2, cx + houseHalf + 2, houseTop, 9, 13, 8);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(cx - houseHalf, houseTop, houseHalf * 2, 2);

  // arch: voussoir ring, dark opening, doors
  const ay = L.archY;
  g.fillStyle = th.trim;
  g.beginPath(); g.arc(cx, ay, archR + 7, Math.PI, 0); g.lineTo(cx + archR + 7, H); g.lineTo(cx - archR - 7, H); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (let k2 = 1; k2 < 9; k2++) {
    const a = Math.PI + k2 * Math.PI / 9;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * archR, ay + Math.sin(a) * archR); g.lineTo(cx + Math.cos(a) * (archR + 7), ay + Math.sin(a) * (archR + 7)); g.stroke();
  }
  const dg = g.createLinearGradient(0, ay - archR, 0, H);
  dg.addColorStop(0, th.door[0]); dg.addColorStop(1, th.door[1]);
  g.fillStyle = dg;
  g.beginPath(); g.arc(cx, ay, archR, Math.PI, 0); g.lineTo(cx + archR, H); g.lineTo(cx - archR, H); g.closePath(); g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
  for (let x = cx - archR + 9; x < cx + archR; x += 9) { g.beginPath(); g.moveTo(x, ay - archR); g.lineTo(x, H); g.stroke(); }
  g.fillStyle = 'rgba(30,30,40,0.75)'; // iron bands with studs
  for (const by of [ay - 18, ay + 4]) {
    g.fillRect(cx - archR, by, archR * 2, 4);
    g.fillStyle = 'rgba(200,200,210,0.6)';
    for (let x = cx - archR + 5; x < cx + archR; x += 10) { g.beginPath(); g.arc(x, by + 2, 1.2, 0, GT_TAU); g.fill(); }
    g.fillStyle = 'rgba(30,30,40,0.75)';
  }
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(cx - 1, ay - archR, 2, H); // split between the two doors
  g.restore();
  // the stage's emblem on the keystone (a turning gear is drawn live)
  if (th.emblem !== 'gear') gtEmblem(g, th.emblem, cx, ay - archR - 3);

  // gem sockets (live glow drawn on top)
  for (const p of gtGemPos(L, max)) {
    g.fillStyle = 'rgba(10,6,20,0.8)';
    g.beginPath(); g.arc(p.x, p.y, 6.5, 0, GT_TAU); g.fill();
    g.strokeStyle = th.trim; g.lineWidth = 1.5; g.stroke();
  }

  // stage decoration on the stonework
  gtExtra(g, th, L, r);

  // damage: every lost heart adds a crack (and chips a merlon)
  const cr = gtRng(911);
  const spots = [];
  for (let i = 0; i < max; i++) spots.push([cr() * W, wallTop + 6 + cr() * 26]);
  for (let i = 0; i < max - lives; i++) {
    let [x, y] = spots[i];
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(x - 8, wallTop - 10, 16, 11); // broken merlon gap
    g.strokeStyle = 'rgba(10,6,10,0.75)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, wallTop);
    for (let j = 0; j < 5; j++) { x += (cr() - 0.5) * 14; y += 5 + cr() * 6; g.lineTo(x, y); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8; g.stroke();
  }
  return { stage, lives, max, k, top: L.top, canvas: cv, L };
}

// a row across the gatehouse front, above the arch
function gtGemPos(L, max) {
  const out = [], step = 19;
  for (let i = 0; i < max; i++) out.push({ x: L.cx + (i - (max - 1) / 2) * step, y: L.gemY });
  return out;
}

function gtExtra(g, th, L, r) {
  const W = CONFIG.width, { wallTop, cx, towerTop, towerOff, towerHalf, houseTop, houseHalf } = L;
  switch (th.extra) {
    case 'icicles':
      g.fillStyle = 'rgba(240,252,255,0.9)';
      g.fillRect(0, wallTop - 2, W, 3);
      for (let x = 4; x < W; x += 9 + r() * 8) {
        const len = 4 + r() * 10;
        g.beginPath(); g.moveTo(x - 2.5, wallTop + 1); g.lineTo(x, wallTop + 1 + len); g.lineTo(x + 2.5, wallTop + 1); g.fill();
      }
      break;
    case 'coral':
      for (let i = 0; i < 16; i++) {
        const x = r() * W, y = wallTop + 4 + r() * 30;
        g.fillStyle = ['#ff7a8a', '#ffb05a', '#c87aff', '#5ad8b0'][i % 4];
        g.beginPath(); g.arc(x, y, 2 + r() * 3, 0, GT_TAU); g.fill();
        g.beginPath(); g.arc(x + 3, y - 2, 1.5 + r() * 2, 0, GT_TAU); g.fill();
      }
      break;
    case 'lava':
      g.strokeStyle = 'rgba(255,110,30,0.7)'; g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        let x = r() * W, y = wallTop + 3;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 12; y += 6 + r() * 6; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    case 'crystals':
      for (let i = 0; i < 9; i++) {
        const x = r() * W, y = wallTop + 2, h = 8 + r() * 10;
        g.fillStyle = ['#e0b0ff', '#b0fff0', '#ffc0e0'][i % 3];
        g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - h); g.lineTo(x + 3, y); g.fill();
      }
      break;
    case 'runes':
      g.fillStyle = 'rgba(154,122,255,0.55)'; g.font = '9px serif'; g.textAlign = 'center';
      for (let i = 0; i < 12; i++) g.fillText('ᚱᚨᚷᛟᛞᚹ'[i % 6], 14 + i * (W - 28) / 11, wallTop + 22);
      break;
    case 'rivets':
      g.fillStyle = 'rgba(255,220,160,0.55)';
      for (let x = 6; x < W; x += 13) for (const y of [wallTop + 6, wallTop + 30]) { g.beginPath(); g.arc(x, y, 1.3, 0, GT_TAU); g.fill(); }
      g.fillStyle = 'rgba(200,144,72,0.6)'; g.fillRect(0, wallTop + 16, W, 3);
      break;
    case 'vines':
      g.strokeStyle = 'rgba(70,140,70,0.85)'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        let x = r() * W, y = wallTop;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (r() - 0.5) * 10; y += 5 + r() * 4; g.lineTo(x, y); }
        g.stroke();
        g.fillStyle = 'rgba(90,170,80,0.9)';
        g.beginPath(); g.ellipse(x, y, 3, 2, 0.5, 0, GT_TAU); g.fill();
      }
      break;
  }
  // gold trim along the gatehouse for the fancier stages
  if (th.roof && (th.trim === '#e8b838' || th.trim === '#ffe08a')) {
    g.fillStyle = th.trim;
    g.fillRect(cx - houseHalf, houseTop + 4, houseHalf * 2, 2);
    for (const side of [-1, 1]) g.fillRect(cx + side * towerOff - towerHalf, towerTop + 4, towerHalf * 2, 2);
  }
}

function gtGearLive(ctx, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(t * 0.9);
  ctx.fillStyle = '#d8a050'; ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * GT_TAU, rr = (i % 4 === 1 || i % 4 === 2) ? r : r * 0.8;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.moveTo(r * 0.3, 0); ctx.arc(0, 0, r * 0.3, 0, GT_TAU, true);
  ctx.fill('evenodd'); ctx.stroke();
  ctx.restore();
}

let gtCache = null;

// lives/max = hearts left / total; flash > 0 right after a breach.
export function drawGate(ctx, def, lives, max, flash, t) {
  const th = GT_THEMES[def.stage] || GT_THEMES[11];
  const k = ctx.getTransform().a;
  lives = Math.max(0, Math.min(max, lives));
  if (!gtCache || gtCache.stage !== def.stage || gtCache.lives !== lives || gtCache.max !== max || Math.abs(gtCache.k - k) > 0.01) {
    gtCache = gtBuild(def.stage, th, lives, max, k);
  }
  const L = gtCache.L, W = CONFIG.width;
  ctx.drawImage(gtCache.canvas, 0, L.top, W, CONFIG.height - L.top);

  // banners hanging down the towers, gently fluttering
  for (const side of [-1, 1]) {
    const bx = L.cx + side * L.towerOff, by = L.towerTop + 44, bw = 18, bh = 34;
    const sway = Math.sin(t * 2.2 + side) * 2.5;
    ctx.fillStyle = th.banner;
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, by); ctx.lineTo(bx + bw / 2, by);
    ctx.lineTo(bx + bw / 2 + sway, by + bh); ctx.lineTo(bx + sway, by + bh - 6); ctx.lineTo(bx - bw / 2 + sway, by + bh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx - bw / 2, by, bw, 3);
    ctx.fillStyle = th.glow;
    ctx.beginPath(); ctx.arc(bx + sway * 0.5, by + 13, 3, 0, GT_TAU); ctx.fill();
  }

  if (th.emblem === 'gear') gtGearLive(ctx, L.cx, L.archY - L.archR - 3, 11, t);
  for (const side of [-1, 1]) {
    const tx = L.cx + side * L.towerOff;
    if (th.top === 'chimney') {
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.4 + k / 3 + side * 0.17) % 1;
        ctx.fillStyle = `rgba(90,80,75,${(0.4 * (1 - p)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(tx + Math.sin(p * 4 + side) * 4 + p * 8, L.towerTop - 34 - p * 30, 4 + p * 9, 0, GT_TAU); ctx.fill();
      }
    } else if (th.top === 'mushroom') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 2 + side);
      const gr = ctx.createRadialGradient(tx, L.towerTop - 14, 0, tx, L.towerTop - 14, 40);
      gr.addColorStop(0, '#c8a0ff'); gr.addColorStop(1, '#c8a0ff00');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(tx, L.towerTop - 14, 40, 0, GT_TAU); ctx.fill();
      ctx.restore();
    }
  }

  // torches either side of the arch (glowing orbs underwater)
  for (const side of [-1, 1]) {
    const tx = L.cx + side * (L.archR + 18), ty = L.archY - 22;
    const f = 0.75 + 0.25 * Math.sin(t * 13 + side * 2) * Math.sin(t * 7.3);
    const col = def.stage === 1 ? '#7fe8ff' : '#ffb347';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(tx, ty, 0, tx, ty, 16 * f);
    gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(tx, ty, 16 * f, 0, GT_TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = def.stage === 1 ? '#dffaff' : '#ffe08a';
    ctx.beginPath(); ctx.ellipse(tx, ty - 2 * f, 2.5, 4.5 * f, 0, 0, GT_TAU); ctx.fill();
  }

  // ward-gems: one per heart, lit while that heart is kept
  gtGemPos(L, max).forEach((p, i) => {
    if (i < lives) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 3 + i);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 13 * pulse);
      gr.addColorStop(0, th.glow + 'cc'); gr.addColorStop(1, th.glow + '00');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, 13 * pulse, 0, GT_TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = th.glow;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x + 4, p.y); ctx.lineTo(p.x, p.y + 5); ctx.lineTo(p.x - 4, p.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1.5, 1.2, 0, GT_TAU); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(160,160,180,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x - 3, p.y - 4); ctx.lineTo(p.x + 1, p.y); ctx.lineTo(p.x - 1, p.y + 4); ctx.stroke();
    }
  });

  // breach: the wall flashes red
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,60,60,${Math.min(0.55, flash)})`;
    ctx.fillRect(0, L.wallTop - 10, W, CONFIG.height - L.wallTop + 10);
  }
}
