// ============================================================
// Stage sets — full-screen battlefields for the land stages (2..12).
// Instead of a horizon across the middle of the screen, the ground fills it
// from a thin strip of sky (behind the HUD) down to the buy row: a road runs
// down the centre, narrowing into the distance, and props taken from each
// stage's island art on the home map (island_road_*.png) line both sides,
// smaller toward the top for depth. The road itself stays clear so enemies
// read well. Static parts are painted once per stage into a cached canvas;
// a few accents (turning gears, smoke, glows, twinkles, birds) animate live.
// Helpers prefixed `ss` (the standalone build shares one scope).
// ============================================================
import { CONFIG } from '../config.js';

export const SS_HORIZON = 0.15; // where the ground meets the sky (fraction of height)
const SS_TAU = Math.PI * 2;

function ssRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 0 at the horizon .. 1 at the bottom of the screen
function ssDepth(y) {
  const hy = CONFIG.height * SS_HORIZON;
  return Math.max(0, (y - hy) / (CONFIG.height - hy));
}
const ssLaneHalf = (y) => 26 + 84 * ssDepth(y);             // half the road width at y
const ssWiggle = (y) => Math.sin(y * 0.012) * 10 * ssDepth(y); // gentle bend in the road
// x of the road's centre at height y (the Gate's arch sits where it ends)
export const ssRoadCenter = (y) => CONFIG.width / 2 + ssWiggle(y);

function ssShade(g, x0, y0, x1, y1, c0, c1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  return gr;
}
function ssShadow(g, x, y, w) {
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, SS_TAU); g.fill();
}

// ---- props: (g, x, baseY, size, theme, rng, accents) ------------------
function ssPine(g, x, y, s, th) {
  ssShadow(g, x, y, s * 0.3);
  g.fillStyle = '#4a3020';
  g.fillRect(x - s * 0.04, y - s * 0.18, s * 0.08, s * 0.18);
  const [c1, c2] = th.pine;
  for (let i = 0; i < 3; i++) {
    const ty = y - s * (0.15 + i * 0.25), w = s * (0.32 - i * 0.07), h = s * 0.42;
    g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c1, c2);
    g.beginPath(); g.moveTo(x - w, ty); g.lineTo(x, ty - h); g.lineTo(x + w, ty); g.closePath(); g.fill();
    if (th.snow) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.moveTo(x - w * 0.45, ty - h * 0.55); g.lineTo(x, ty - h); g.lineTo(x + w * 0.45, ty - h * 0.55);
      g.quadraticCurveTo(x, ty - h * 0.45, x - w * 0.45, ty - h * 0.55);
      g.fill();
    }
  }
}

function ssCrystal(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.35);
  for (const [ox, hh, tilt] of [[-0.22, 0.6, -0.25], [0.2, 0.7, 0.2], [0, 1, 0]]) {
    const c = th.crystal[Math.floor(r() * th.crystal.length)];
    const h = hh * s, w = s * 0.11;
    g.save();
    g.translate(x + ox * s, y); g.rotate(tilt * 0.6);
    g.fillStyle = c[0];
    g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.75); g.lineTo(0, -h); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = c[1];
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.lineTo(w, -h * 0.75); g.lineTo(w, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-w * 0.5, -h * 0.1); g.lineTo(-w * 0.5, -h * 0.7); g.stroke();
    g.restore();
  }
  if (th.twinkle) acc.push({ type: 'twinkle', x, y: y - s * 0.6, s, color: '#ffffff' });
}

function ssRock(g, x, y, s, th) {
  const [c1, c2] = th.rock, w = s * 0.5, h = s * 0.42;
  ssShadow(g, x, y, w * 0.9);
  g.fillStyle = ssShade(g, x, y - h, x, y, c1, c2);
  g.beginPath();
  g.moveTo(x - w, y); g.lineTo(x - w * 0.85, y - h * 0.55); g.lineTo(x - w * 0.35, y - h);
  g.lineTo(x + w * 0.25, y - h * 0.9); g.lineTo(x + w * 0.8, y - h * 0.45); g.lineTo(x + w, y);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(x - w * 0.85, y - h * 0.55); g.lineTo(x - w * 0.35, y - h); g.lineTo(x - w * 0.1, y - h * 0.5); g.closePath(); g.fill();
  if (th.rockCap) {
    g.fillStyle = th.rockCap;
    g.beginPath();
    g.moveTo(x - w * 0.6, y - h * 0.75); g.lineTo(x - w * 0.35, y - h); g.lineTo(x + w * 0.25, y - h * 0.9);
    g.lineTo(x + w * 0.55, y - h * 0.62); g.quadraticCurveTo(x, y - h * 0.68, x - w * 0.6, y - h * 0.75);
    g.fill();
  }
}

function ssPool(g, x, y, s, th, r, acc) {
  const w = s * 0.8, h = s * 0.26, [wa, wb] = th.water;
  g.fillStyle = th.poolRim;
  g.beginPath(); g.ellipse(x, y - h, w + s * 0.06, h + s * 0.05, 0, 0, SS_TAU); g.fill();
  g.fillStyle = ssShade(g, x, y - 2 * h, x, y, wa, wb);
  g.beginPath(); g.ellipse(x, y - h, w, h, 0, 0, SS_TAU); g.fill();
  if (th.poolStars) { // a pool that reflects the night sky
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 7; k++) {
      const a = r() * SS_TAU, rr = Math.sqrt(r()) * 0.8;
      g.beginPath(); g.arc(x + Math.cos(a) * w * rr, y - h + Math.sin(a) * h * rr, Math.max(0.6, s * 0.012), 0, SS_TAU); g.fill();
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(x - w * 0.15, y - h * 1.2, w * 0.45, h * 0.3, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  if (th.poolAccent) acc.push({ type: th.poolAccent, x, y: y - h, s: w, color: th.poolGlow || '#ffffff' });
}

function ssPalm(g, x, y, s, th, r) {
  ssShadow(g, x + s * 0.1, y, s * 0.3);
  const lean = (r() - 0.5) * 0.5, tx = x + lean * s * 0.6, ty = y - s * 0.85;
  g.strokeStyle = '#8a6236'; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * s * 0.1, y - s * 0.5, tx, ty); g.stroke();
  g.strokeStyle = 'rgba(60,36,14,0.6)'; g.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const p = k / 6, px = x + (tx - x) * p, py = y + (ty - y) * p;
    g.beginPath(); g.moveTo(px - s * 0.035, py); g.lineTo(px + s * 0.035, py - s * 0.02); g.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55, len = s * (0.45 + 0.1 * (k % 2));
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.6 + len * 0.35;
    g.fillStyle = k % 2 ? '#3f8a3a' : '#5aa848';
    g.beginPath(); g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - s * 0.12, ex, ey);
    g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5, tx, ty);
    g.fill();
  }
  g.fillStyle = '#6a4420';
  for (const o of [-1, 1]) { g.beginPath(); g.arc(tx + o * s * 0.04, ty + s * 0.04, s * 0.04, 0, SS_TAU); g.fill(); }
}

function ssDomeHouse(g, x, y, s, th) {
  const [wall, wallDark] = th.house, w = s * 0.42, h = s * 0.48, trim = th.trim || '#e8c050';
  ssShadow(g, x, y, w * 1.1);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, wall, wallDark);
  g.fillRect(x - w, y - h, w * 2, h);
  g.fillStyle = 'rgba(40,24,10,0.75)';
  g.beginPath();
  g.moveTo(x - w * 0.22, y); g.lineTo(x - w * 0.22, y - h * 0.45); g.arc(x, y - h * 0.45, w * 0.22, Math.PI, 0); g.lineTo(x + w * 0.22, y);
  g.fill();
  for (const o of [-0.62, 0.62]) {
    g.beginPath();
    g.moveTo(x + o * w - w * 0.1, y - h * 0.5); g.lineTo(x + o * w - w * 0.1, y - h * 0.68);
    g.arc(x + o * w, y - h * 0.68, w * 0.1, Math.PI, 0); g.lineTo(x + o * w + w * 0.1, y - h * 0.5);
    g.fill();
  }
  g.fillStyle = ssShade(g, x - w * 0.8, 0, x + w * 0.8, 0, th.dome[0], th.dome[1]);
  g.beginPath();
  g.moveTo(x - w * 0.8, y - h); g.bezierCurveTo(x - w * 0.8, y - h - s * 0.42, x + w * 0.8, y - h - s * 0.42, x + w * 0.8, y - h);
  g.closePath(); g.fill();
  g.strokeStyle = trim; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.moveTo(x, y - h - s * 0.31); g.lineTo(x, y - h - s * 0.44); g.stroke();
  g.fillStyle = trim;
  g.beginPath(); g.arc(x, y - h - s * 0.46, s * 0.03, 0, SS_TAU); g.fill();
}

function ssWallSeg(g, x, y, s, th) {
  const [c1, c2] = th.wall, w = s * 0.6, h = s * 0.36, cw = w * 2 / 7;
  ssShadow(g, x, y, w);
  g.fillStyle = ssShade(g, x, y - h, x, y, c1, c2);
  g.fillRect(x - w, y - h, w * 2, h);
  for (let i = 0; i < 7; i += 2) g.fillRect(x - w + i * cw, y - h - s * 0.1, cw, s * 0.1 + 1);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  for (let row = 1; row < 3; row++) {
    const ly = y - h + row * h / 3;
    g.beginPath(); g.moveTo(x - w, ly); g.lineTo(x + w, ly); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(x - w, y - h, w * 2, Math.max(1, s * 0.03));
}

function ssPot(g, x, y, s) {
  const w = s * 0.16;
  ssShadow(g, x, y, w * 1.2);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#d88a4a', '#8a4a22');
  g.beginPath();
  g.moveTo(x - w * 0.5, y); g.quadraticCurveTo(x - w * 1.4, y - s * 0.2, x - w * 0.45, y - s * 0.38);
  g.lineTo(x + w * 0.45, y - s * 0.38); g.quadraticCurveTo(x + w * 1.4, y - s * 0.2, x + w * 0.5, y);
  g.closePath(); g.fill();
  g.fillStyle = '#6a3418';
  g.fillRect(x - w * 0.55, y - s * 0.42, w * 1.1, s * 0.05);
}

function ssRoundTree(g, x, y, s, th) {
  const [dark, light] = th.leaf;
  ssShadow(g, x, y, s * 0.32);
  g.fillStyle = th.trunk || '#5a3a22';
  g.beginPath(); g.moveTo(x - s * 0.05, y); g.lineTo(x - s * 0.03, y - s * 0.45); g.lineTo(x + s * 0.03, y - s * 0.45); g.lineTo(x + s * 0.05, y); g.fill();
  for (const [bx, by, br] of [[-0.16, -0.55, 0.2], [0.17, -0.56, 0.19], [0, -0.75, 0.24], [0, -0.5, 0.18]]) {
    g.fillStyle = ssShade(g, 0, y + (by - br) * s, 0, y + (by + br) * s, light, dark);
    g.beginPath(); g.arc(x + bx * s, y + by * s, br * s, 0, SS_TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath(); g.arc(x - s * 0.06, y - s * 0.82, s * 0.09, 0, SS_TAU); g.fill();
}

function ssMushroom(g, x, y, s, th, r, acc) {
  const [cap, capDark] = th.cap;
  ssShadow(g, x, y, s * 0.3);
  g.fillStyle = th.stem || '#efe6d0';
  g.beginPath();
  g.moveTo(x - s * 0.08, y); g.quadraticCurveTo(x - s * 0.04, y - s * 0.3, x - s * 0.06, y - s * 0.5);
  g.lineTo(x + s * 0.06, y - s * 0.5); g.quadraticCurveTo(x + s * 0.04, y - s * 0.3, x + s * 0.08, y);
  g.fill();
  g.fillStyle = ssShade(g, 0, y - s, 0, y - s * 0.45, cap, capDark);
  g.beginPath();
  g.moveTo(x - s * 0.4, y - s * 0.48); g.bezierCurveTo(x - s * 0.4, y - s, x + s * 0.4, y - s, x + s * 0.4, y - s * 0.48);
  g.quadraticCurveTo(x, y - s * 0.4, x - s * 0.4, y - s * 0.48);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [dx, dy, dr] of [[-0.18, -0.68, 0.05], [0.12, -0.78, 0.06], [0.24, -0.6, 0.04], [-0.02, -0.6, 0.035]]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, dr * s, 0, SS_TAU); g.fill();
  }
  if (th.capGlow) acc.push({ type: 'glow', x, y: y - s * 0.65, s: s * 0.7, color: th.capGlow });
}

function ssTwisted(g, x, y, s, th, r) {
  ssShadow(g, x, y, s * 0.3);
  g.strokeStyle = th.trunk; g.lineCap = 'round';
  const seg = (x0, y0, a, len, w, d) => {
    if (d > 3 || w < 0.8) return;
    const x1 = x0 + Math.sin(a) * len, y1 = y0 - Math.cos(a) * len;
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + Math.cos(a) * len * 0.25, (y0 + y1) / 2, x1, y1); g.stroke();
    seg(x1, y1, a - 0.5 - r() * 0.3, len * 0.68, w * 0.62, d + 1);
    seg(x1, y1, a + 0.45 + r() * 0.3, len * 0.62, w * 0.6, d + 1);
    if (d >= 2 && th.leaf) {
      g.fillStyle = th.leaf[1];
      g.beginPath(); g.arc(x1, y1, s * 0.05, 0, SS_TAU); g.fill();
    }
  };
  seg(x, y, (r() - 0.5) * 0.3, s * 0.38, Math.max(2, s * 0.09), 0);
}

function ssColumn(g, x, y, s, th, r) {
  const [c1, c2] = th.stone, w = s * 0.11, broken = r() < 0.35, h = s * (broken ? 0.55 + r() * 0.2 : 0.95);
  ssShadow(g, x, y, w * 2.2);
  g.fillStyle = c2;
  g.fillRect(x - w * 1.5, y - s * 0.06, w * 3, s * 0.06);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c1, c2);
  if (broken) {
    g.beginPath();
    g.moveTo(x - w, y - s * 0.06); g.lineTo(x - w, y - h); g.lineTo(x - w * 0.3, y - h - s * 0.06);
    g.lineTo(x + w * 0.2, y - h + s * 0.02); g.lineTo(x + w, y - h - s * 0.04); g.lineTo(x + w, y - s * 0.06);
    g.fill();
  } else {
    g.fillRect(x - w, y - h, w * 2, h - s * 0.06);
    g.fillStyle = c1;
    g.fillRect(x - w * 1.5, y - h - s * 0.06, w * 3, s * 0.07);
  }
  g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
  for (const o of [-0.4, 0.1, 0.55]) {
    g.beginPath(); g.moveTo(x + o * w, y - s * 0.07); g.lineTo(x + o * w, y - h + s * 0.04); g.stroke();
  }
}

function ssCage(g, x, y, s, th, r, acc) {
  const w = s * 0.24, h = s * 0.55, brass = '#d8a838';
  ssShadow(g, x, y, w * 1.3);
  g.fillStyle = '#8a6418';
  g.fillRect(x - w * 1.15, y - s * 0.06, w * 2.3, s * 0.06);
  g.fillStyle = 'rgba(255,240,200,0.1)';
  g.beginPath();
  g.moveTo(x - w, y - s * 0.06); g.lineTo(x - w, y - h);
  g.bezierCurveTo(x - w, y - h - s * 0.3, x + w, y - h - s * 0.3, x + w, y - h); g.lineTo(x + w, y - s * 0.06);
  g.fill();
  g.strokeStyle = brass; g.lineWidth = Math.max(1, s * 0.018);
  for (let i = 0; i <= 6; i++) {
    const bx = x - w + (2 * w) * i / 6;
    g.beginPath(); g.moveTo(bx, y - s * 0.06); g.lineTo(bx, y - h);
    g.quadraticCurveTo(bx + (x - bx) * 0.3, y - h - s * 0.22, x, y - h - s * 0.22); g.stroke();
  }
  g.lineWidth = Math.max(1.2, s * 0.03);
  g.beginPath(); g.moveTo(x - w, y - h * 0.55); g.lineTo(x + w, y - h * 0.55); g.stroke();
  g.fillStyle = brass;
  g.beginPath(); g.arc(x, y - h - s * 0.26, s * 0.035, 0, SS_TAU); g.fill();
  acc.push({ type: 'bird', x, y: y - h * 0.62, s, color: ['#ff7a5a', '#5ad8ff', '#ffd23d', '#8aff7a'][Math.floor(r() * 4)] });
}

function ssTopiary(g, x, y, s) {
  ssShadow(g, x, y, s * 0.22);
  g.fillStyle = ssShade(g, x - s * 0.14, 0, x + s * 0.14, 0, '#c86a3a', '#7a3a1a');
  g.beginPath(); g.moveTo(x - s * 0.14, y - s * 0.2); g.lineTo(x + s * 0.14, y - s * 0.2); g.lineTo(x + s * 0.1, y); g.lineTo(x - s * 0.1, y); g.fill();
  g.fillStyle = '#5a3a20';
  g.fillRect(x - s * 0.02, y - s * 0.4, s * 0.04, s * 0.2);
  for (const [by, br] of [[-0.55, 0.2], [-0.88, 0.14]]) {
    g.fillStyle = ssShade(g, 0, y + (by - br) * s, 0, y + (by + br) * s, '#8ad070', '#2f6a30');
    g.beginPath(); g.arc(x, y + by * s, br * s, 0, SS_TAU); g.fill();
  }
}

function ssLamp(g, x, y, s, th, r, acc) {
  const pole = th.lampPole || '#3a3a44', light = th.lampLight || '#ffe08a', h = s * 0.85;
  g.fillStyle = pole;
  g.fillRect(x - s * 0.02, y - h, s * 0.04, h);
  g.fillRect(x - s * 0.07, y - s * 0.04, s * 0.14, s * 0.04);
  g.fillStyle = light;
  g.beginPath(); g.moveTo(x - s * 0.07, y - h); g.lineTo(x + s * 0.07, y - h); g.lineTo(x + s * 0.05, y - h - s * 0.13); g.lineTo(x - s * 0.05, y - h - s * 0.13); g.fill();
  g.fillStyle = pole;
  g.beginPath(); g.moveTo(x - s * 0.09, y - h - s * 0.13); g.lineTo(x + s * 0.09, y - h - s * 0.13); g.lineTo(x, y - h - s * 0.22); g.fill();
  acc.push({ type: 'glow', x, y: y - h - s * 0.06, s: s * 0.5, color: light });
}

function ssChimney(g, x, y, s, th, r, acc) {
  const w = s * 0.12, h = s;
  ssShadow(g, x, y, w * 2);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#a85a3a', '#5a2a1a');
  g.fillRect(x - w, y - h, w * 2, h);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (let k = 1; k < 8; k++) { const ly = y - h * k / 8; g.beginPath(); g.moveTo(x - w, ly); g.lineTo(x + w, ly); g.stroke(); }
  g.fillStyle = '#3a2a22';
  g.fillRect(x - w * 1.35, y - h - s * 0.05, w * 2.7, s * 0.07);
  g.fillStyle = '#c89048';
  g.fillRect(x - w, y - h * 0.62, w * 2, s * 0.04);
  acc.push({ type: 'smoke', x, y: y - h - s * 0.05, s, color: 'rgba(90,80,75,' });
}

function ssPipe(g, x, y, s) {
  const pw = s * 0.09;
  g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(x - s * 0.4, y - pw); g.lineTo(x + s * 0.05, y - pw);
  g.quadraticCurveTo(x + s * 0.2, y - pw, x + s * 0.2, y - s * 0.2); g.lineTo(x + s * 0.2, y - s * 0.7);
  g.strokeStyle = '#7a5222'; g.lineWidth = pw + 2; g.stroke();
  g.strokeStyle = '#d8a050'; g.lineWidth = pw * 0.6; g.stroke();
  g.fillStyle = '#7a5222';
  g.fillRect(x - s * 0.17, y - pw * 1.9, pw * 0.9, pw * 1.8);
  g.fillRect(x + s * 0.2 - pw, y - s * 0.5, pw * 2, pw * 0.8);
  g.strokeStyle = '#b03a2a'; g.lineWidth = Math.max(1, s * 0.025);
  g.beginPath(); g.arc(x + s * 0.2, y - s * 0.72, s * 0.08, 0, SS_TAU); g.stroke();
}

function ssHouse(g, x, y, s, th) {
  const [wall, wallDark] = th.house, w = s * 0.38, h = s * 0.45;
  ssShadow(g, x, y, w * 1.2);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, wall, wallDark);
  g.fillRect(x - w, y - h, w * 2, h);
  g.fillStyle = ssShade(g, 0, y - h - s * 0.35, 0, y - h, th.roof[0], th.roof[1]);
  g.beginPath(); g.moveTo(x - w * 1.18, y - h); g.lineTo(x, y - h - s * 0.36); g.lineTo(x + w * 1.18, y - h); g.closePath(); g.fill();
  g.fillStyle = th.window || '#ffd88a';
  for (const o of [-0.5, 0.5]) g.fillRect(x + o * w - w * 0.15, y - h * 0.75, w * 0.3, h * 0.28);
  g.fillStyle = 'rgba(30,18,10,0.8)';
  g.fillRect(x - w * 0.16, y - h * 0.45, w * 0.32, h * 0.45);
}

function ssTower(g, x, y, s, th) {
  const [c1, c2] = th.wall, w = s * 0.17, h = s * 0.8;
  ssShadow(g, x, y, w * 1.6);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c1, c2);
  g.fillRect(x - w, y - h, w * 2, h);
  g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
  for (let k = 1; k < 6; k++) { const ly = y - h * k / 6; g.beginPath(); g.moveTo(x - w, ly); g.lineTo(x + w, ly); g.stroke(); }
  g.fillStyle = 'rgba(20,16,30,0.75)';
  g.beginPath();
  g.moveTo(x - w * 0.25, y - h * 0.55); g.lineTo(x - w * 0.25, y - h * 0.7); g.arc(x, y - h * 0.7, w * 0.25, Math.PI, 0); g.lineTo(x + w * 0.25, y - h * 0.55);
  g.fill();
  g.fillStyle = ssShade(g, 0, y - h - s * 0.4, 0, y - h, th.roof[0], th.roof[1]);
  g.beginPath(); g.moveTo(x - w * 1.3, y - h); g.lineTo(x, y - h - s * 0.42); g.lineTo(x + w * 1.3, y - h); g.closePath(); g.fill();
  if (th.flag) {
    g.strokeStyle = '#3a3030'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y - h - s * 0.42); g.lineTo(x, y - h - s * 0.58); g.stroke();
    g.fillStyle = th.flag;
    g.beginPath(); g.moveTo(x, y - h - s * 0.58); g.lineTo(x + s * 0.13, y - h - s * 0.54); g.lineTo(x, y - h - s * 0.5); g.fill();
  }
}

function ssSpire(g, x, y, s, th, r) {
  const w = s * 0.28, lean = (r() - 0.5) * s * 0.15;
  ssShadow(g, x, y, w);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#4a3434', '#1a0e0e');
  g.beginPath();
  g.moveTo(x - w, y); g.lineTo(x - w * 0.55, y - s * 0.45); g.lineTo(x - w * 0.3 + lean, y - s * 0.7);
  g.lineTo(x + lean * 1.4, y - s); g.lineTo(x + w * 0.35 + lean, y - s * 0.6); g.lineTo(x + w * 0.6, y - s * 0.35); g.lineTo(x + w, y);
  g.closePath(); g.fill();
  g.strokeStyle = '#ff7a2a'; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(x - w * 0.2, y); g.lineTo(x - w * 0.05, y - s * 0.25); g.lineTo(x + w * 0.15, y - s * 0.4); g.lineTo(x + lean, y - s * 0.62); g.stroke();
}

function ssVent(g, x, y, s, th, r, acc) {
  const w = s * 0.3;
  ssShadow(g, x, y, w);
  g.fillStyle = ssShade(g, 0, y - s * 0.3, 0, y, '#5a3a32', '#2a1612');
  g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w * 0.3, y - s * 0.3); g.lineTo(x + w * 0.3, y - s * 0.3); g.lineTo(x + w, y); g.fill();
  g.fillStyle = '#ff8a2a';
  g.beginPath(); g.ellipse(x, y - s * 0.3, w * 0.3, s * 0.04, 0, 0, SS_TAU); g.fill();
  acc.push({ type: 'smoke', x, y: y - s * 0.32, s, color: 'rgba(70,60,60,' });
  acc.push({ type: 'glow', x, y: y - s * 0.3, s: s * 0.3, color: '#ff7a2a' });
}

function ssHut(g, x, y, s, th) {
  const w = s * 0.3, h = s * 0.3;
  ssShadow(g, x, y, w * 1.2);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#a8845a', '#5a4026');
  g.fillRect(x - w, y - h, w * 2, h);
  g.fillStyle = 'rgba(30,18,10,0.85)';
  g.beginPath(); g.ellipse(x, y - h * 0.4, w * 0.25, h * 0.4, 0, Math.PI, 0); g.lineTo(x + w * 0.25, y); g.lineTo(x - w * 0.25, y); g.fill();
  g.fillStyle = ssShade(g, 0, y - h - s * 0.4, 0, y - h, th.hutRoof[0], th.hutRoof[1]);
  g.beginPath();
  g.moveTo(x - w * 1.35, y - h + s * 0.03); g.quadraticCurveTo(x - w * 0.3, y - h - s * 0.2, x, y - h - s * 0.42);
  g.quadraticCurveTo(x + w * 0.3, y - h - s * 0.2, x + w * 1.35, y - h + s * 0.03);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y - h - s * 0.4); g.lineTo(x + k * w * 0.55, y - h + s * 0.02); g.stroke(); }
}

function ssVine(g, x, y, s, th, r) {
  const dir = r() < 0.5 ? -1 : 1;
  g.strokeStyle = th.vine; g.lineCap = 'round';
  let px = x, py = y;
  for (let i = 1; i <= 10; i++) {
    const p = i / 10, nx = x + dir * Math.sin(p * 3.2) * s * 0.25 * p, ny = y - p * s * 0.9;
    g.lineWidth = Math.max(1, s * 0.09 * (1 - p * 0.85));
    g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
    if (i % 2 === 0 && i < 10) {
      g.fillStyle = 'rgba(255,200,255,0.5)';
      g.beginPath(); g.arc(nx - dir * s * 0.03, ny, Math.max(0.8, s * 0.02 * (1 - p)), 0, SS_TAU); g.fill();
    }
    px = nx; py = ny;
  }
  g.lineWidth = Math.max(1, s * 0.015);
  g.beginPath(); g.arc(px + dir * s * 0.05, py, s * 0.05, 0, Math.PI * 1.5); g.stroke();
}

function ssFern(g, x, y, s, th, r) {
  g.strokeStyle = th.fern; g.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = -1.2 + k * 0.48 + (r() - 0.5) * 0.2, len = s * (0.4 + r() * 0.2);
    const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len * 0.8;
    g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(a) * len * 0.5, y - len * 0.75, ex, ey); g.stroke();
    g.lineWidth = Math.max(0.8, s * 0.018);
    for (let j = 1; j < 5; j++) {
      const p = j / 5, lx = x + (ex - x) * p, ly = y + (ey - y) * p - len * 0.3 * Math.sin(p * Math.PI);
      g.beginPath();
      g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a) * s * 0.06, ly + Math.sin(a) * s * 0.06 - s * 0.03);
      g.moveTo(lx, ly); g.lineTo(lx - Math.cos(a) * s * 0.06, ly - Math.sin(a) * s * 0.06 - s * 0.03);
      g.stroke();
    }
  }
}

function ssTrunk(g, x, y, s, th) {
  const w = s * 0.2;
  ssShadow(g, x, y, w * 2.4);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#6a4a2e', '#2a1a0e');
  g.beginPath();
  g.moveTo(x - w * 2.2, y); g.quadraticCurveTo(x - w * 1.1, y - s * 0.05, x - w, y - s * 0.25);
  g.lineTo(x - w * 0.85, y - s * 1.2); g.lineTo(x + w * 0.85, y - s * 1.2); g.lineTo(x + w, y - s * 0.25);
  g.quadraticCurveTo(x + w * 1.1, y - s * 0.05, x + w * 2.2, y);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (const o of [-0.5, 0, 0.45]) {
    g.beginPath(); g.moveTo(x + o * w, y - s * 0.1); g.quadraticCurveTo(x + o * w + w * 0.2, y - s * 0.6, x + o * w, y - s * 1.15); g.stroke();
  }
  g.fillStyle = 'rgba(120,190,80,0.55)';
  g.beginPath(); g.ellipse(x - w * 0.4, y - s * 0.5, w * 0.35, s * 0.12, 0.3, 0, SS_TAU); g.fill();
  g.fillStyle = th.leaf[0];
  for (const [cx, cy, cr] of [[0, -1.25, 0.38], [-0.3, -1.1, 0.25], [0.3, -1.12, 0.27]]) {
    g.beginPath(); g.arc(x + cx * s, y + cy * s, cr * s, 0, SS_TAU); g.fill();
  }
}

function ssPebbles(g, x, y, s, th, r) {
  const cols = th.pebbles || ['#c8a0ff', '#7fd8c0', '#ffb0d0', '#a8c8ff'];
  for (let k = 0; k < 6; k++) {
    g.fillStyle = cols[k % cols.length];
    g.beginPath(); g.ellipse(x + (r() - 0.5) * s * 0.6, y - r() * s * 0.15, s * 0.06, s * 0.04, 0, 0, SS_TAU); g.fill();
  }
}

// a gear on a post — the gear itself is a live accent (it turns)
function ssGearPost(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.2);
  g.fillStyle = '#3a2a1a';
  g.fillRect(x - s * 0.04, y - s * 0.4, s * 0.08, s * 0.4);
  acc.push({ type: 'gear', x, y: y - s * 0.42, s, dir: r() < 0.5 ? -1 : 1 });
}

// ---- shared shape helpers ---------------------------------------------
function ssPoly(g, pts) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
}
// arch-topped opening (door / window), filled with the current fillStyle
function ssArch(g, x, base, hw, h) {
  g.beginPath();
  g.moveTo(x - hw, base); g.lineTo(x - hw, base - h + hw); g.arc(x, base - h + hw, hw, Math.PI, 0); g.lineTo(x + hw, base);
  g.closePath(); g.fill();
}
// one two-faced crystal prism, c = [lit face, shadow face]
function ssShard(g, x, y, w, h, tilt, c) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.fillStyle = c[0]; ssPoly(g, [-w, 0, -w, -h * 0.78, 0, -h, 0, 0]); g.fill();
  g.fillStyle = c[1]; ssPoly(g, [0, 0, 0, -h, w, -h * 0.78, w, 0]); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)'; ssPoly(g, [-w, -h * 0.78, 0, -h, 0, -h * 0.88, -w * 0.6, -h * 0.74]); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-w * 0.5, -h * 0.1); g.lineTo(-w * 0.5, -h * 0.68); g.stroke();
  g.restore();
}
function ssShards(g, x, y, s, cols, r) {
  for (const [ox, hh, tilt] of [[-0.42, 0.45, -0.35], [-0.2, 0.8, -0.15], [0.05, 1, 0.02], [0.28, 0.65, 0.22], [0.46, 0.38, 0.42]]) {
    ssShard(g, x + ox * s, y, s * 0.1, hh * s, tilt * 0.7, cols[Math.floor(r() * cols.length)]);
  }
}
// tower; roof = cone colours, or null for a crenellated top
function ssLmTower(g, x, base, w, h, c, roof, rh, win) {
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c[0], c[1]);
  g.fillRect(x - w, base - h, w * 2, h);
  if (roof) {
    g.fillStyle = ssShade(g, x - w, 0, x + w, 0, roof[0], roof[1]);
    ssPoly(g, [x - w * 1.25, base - h, x, base - h - rh, x + w * 1.25, base - h]); g.fill();
  } else {
    const m = w * 2.3 / 5;
    g.fillRect(x - w * 1.15, base - h - 2, w * 2.3, 2);
    for (let i = 0; i < 5; i += 2) g.fillRect(x - w * 1.15 + i * m, base - h - 2 - m * 0.8, m, m * 0.8 + 0.5);
  }
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x - w, base - h, w * 0.5, h);
  if (win) { g.fillStyle = win; ssArch(g, x, base - h * 0.42, Math.max(1.5, w * 0.3), Math.max(4, h * 0.26)); }
}
// pointed (onion-ish) dome with a gold finial
function ssLmDome(g, x, base, rw, rh, cols, gold) {
  g.fillStyle = ssShade(g, x - rw, 0, x + rw, 0, cols[0], cols[1]);
  g.beginPath(); g.moveTo(x - rw, base);
  g.bezierCurveTo(x - rw, base - rh * 0.9, x - rw * 0.25, base - rh * 0.85, x, base - rh);
  g.bezierCurveTo(x + rw * 0.25, base - rh * 0.85, x + rw, base - rh * 0.9, x + rw, base);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.beginPath(); g.ellipse(x - rw * 0.42, base - rh * 0.5, rw * 0.14, rh * 0.26, -0.3, 0, SS_TAU); g.fill();
  if (gold) {
    g.strokeStyle = gold; g.lineWidth = Math.max(1, rw * 0.07);
    g.beginPath(); g.moveTo(x, base - rh); g.lineTo(x, base - rh - rw * 0.4); g.stroke();
    g.fillStyle = gold; g.beginPath(); g.arc(x, base - rh - rw * 0.42, Math.max(1, rw * 0.09), 0, SS_TAU); g.fill();
  }
}
// waterfall ribbon with foam; its light streaks are a live accent
function ssFall(g, x, top, bot, hw, acc) {
  g.fillStyle = ssShade(g, x - hw, 0, x + hw, 0, '#d8f8ff', '#58b4e6');
  g.fillRect(x - hw, top, hw * 2, bot - top);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
  for (const o of [-0.5, 0.05, 0.55]) { g.beginPath(); g.moveTo(x + o * hw, top + 2); g.lineTo(x + o * hw, bot - 2); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(x + k * hw * 0.55, bot - 1, hw * 0.45, 0, SS_TAU); g.fill(); }
  acc.push({ type: 'shimmer', x, y: top, w: hw * 2, h: bot - top });
}
function ssLava(g, pts, w) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = 'rgba(255,90,20,0.5)'; g.lineWidth = w * 2.4; g.stroke();
  g.strokeStyle = '#ffb43a'; g.lineWidth = w; g.stroke();
}
// rocky ledge with a mossy top across the far end
function ssLedge(g, cx, by, half, top, cols, moss, r) {
  const pts = [cx - half, by + 8];
  for (let x = cx - half; x <= cx + half; x += 14) pts.push(x, by - top - r() * 6);
  pts.push(cx + half, by + 8);
  g.fillStyle = ssShade(g, 0, by - top - 6, 0, by + 8, cols[0], cols[1]);
  ssPoly(g, pts); g.fill();
  g.strokeStyle = moss; g.lineWidth = 3; g.lineJoin = 'round';
  g.beginPath(); for (let i = 2; i < pts.length - 2; i += 2) g.lineTo(pts[i], pts[i + 1] + 1); g.stroke();
}
// twisted tree with a clumpy canopy (blossom tree / blue aether tree)
function ssBloom(g, x, base, s, trunk, c1, c2, flat) {
  g.strokeStyle = trunk; g.lineCap = 'round';
  g.lineWidth = Math.max(2, s * 0.09);
  g.beginPath(); g.moveTo(x, base);
  g.bezierCurveTo(x - s * 0.16, base - s * 0.25, x + s * 0.16, base - s * 0.4, x - s * 0.02, base - s * 0.6); g.stroke();
  g.lineWidth = Math.max(1, s * 0.04);
  g.beginPath(); g.moveTo(x - s * 0.02, base - s * 0.6); g.quadraticCurveTo(x - s * 0.12, base - s * 0.62, x - s * 0.26, base - s * 0.72);
  g.moveTo(x - s * 0.02, base - s * 0.6); g.quadraticCurveTo(x + s * 0.12, base - s * 0.64, x + s * 0.24, base - s * 0.76); g.stroke();
  const fy = flat ? 0.6 : 1;
  for (const [bx, by, br, c] of [[-0.26, -0.74, 0.18, c1], [0.24, -0.78, 0.19, c1], [0, -0.88, 0.22, c1], [-0.1, -0.68, 0.14, c2], [0.3, -0.66, 0.12, c2]]) {
    g.fillStyle = ssShade(g, 0, base + (by - br) * s, 0, base + (by + br) * s, c[0], c[1]);
    g.beginPath(); g.ellipse(x + bx * s, base + by * s, br * s * (flat ? 1.35 : 1), br * s * fy, 0, 0, SS_TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + (k - 2) * s * 0.11, base - s * (0.8 + (k % 2) * 0.1), Math.max(0.7, s * 0.016), 0, SS_TAU); g.fill(); }
}
// curly vine ending in a spiral
function ssCurl(g, x, base, h, dir, col, w) {
  g.strokeStyle = col; g.lineCap = 'round';
  let px = x, py = base;
  for (let i = 1; i <= 8; i++) {
    const p = i / 8, nx = x + dir * Math.sin(p * 2.6) * h * 0.18, ny = base - p * h;
    g.lineWidth = Math.max(1, w * (1 - p * 0.6));
    g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
    if (i === 3 || i === 5) {
      g.fillStyle = col;
      g.beginPath(); g.ellipse(nx + dir * h * 0.07, ny, h * 0.06, h * 0.025, dir * 0.5, 0, SS_TAU); g.fill();
    }
    px = nx; py = ny;
  }
  g.lineWidth = Math.max(1, w * 0.45);
  g.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = k / 24 * SS_TAU * 1.4, rr = h * 0.15 * (1 - k / 30);
    const sx = px + dir * (rr - Math.cos(a) * rr), sy = py - Math.sin(a) * rr;
    if (k) g.lineTo(sx, sy); else g.moveTo(sx, sy);
  }
  g.stroke();
}
// a perched parrot (feet at x,y); its wing is a live accent that flaps now and then
function ssParrot(g, x, y, s, cols, dir, acc) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = cols[1];
  ssPoly(g, [-s * 0.04, -s * 0.28, -s * 0.26, s * 0.32, -s * 0.12, s * 0.34, s * 0.08, -s * 0.22]); g.fill();
  g.fillStyle = cols[0];
  g.beginPath(); g.ellipse(0, -s * 0.45, s * 0.17, s * 0.3, -0.25, 0, SS_TAU); g.fill();
  g.beginPath(); g.arc(s * 0.1, -s * 0.78, s * 0.15, 0, SS_TAU); g.fill();
  g.fillStyle = '#ffcf4a';
  g.beginPath(); g.moveTo(s * 0.2, -s * 0.86); g.quadraticCurveTo(s * 0.38, -s * 0.8, s * 0.27, -s * 0.64); g.lineTo(s * 0.2, -s * 0.72); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s * 0.13, -s * 0.81, s * 0.05, 0, SS_TAU); g.fill();
  g.fillStyle = '#111111'; g.beginPath(); g.arc(s * 0.145, -s * 0.81, s * 0.025, 0, SS_TAU); g.fill();
  g.restore();
  acc.push({ type: 'flap', x: x - dir * s * 0.04, y: y - s * 0.56, s, dir, color: cols[1] });
}
const SS_PARROTS = [['#3ac8e8', '#1a5ab8'], ['#ff5a3a', '#ffd23d'], ['#4ad86a', '#1a7a5a'], ['#ffd23d', '#2a8ad8']];
// brass drum + glass dome aviary cage
function ssCageDome(g, x, base, w, hd, hm) {
  const brass = ['#f2cc66', '#8a5a18'];
  g.fillStyle = brass[1]; g.fillRect(x - w * 1.15, base - hd * 0.22, w * 2.3, hd * 0.22);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, 'rgba(200,248,238,0.95)', 'rgba(48,128,128,0.95)');
  g.fillRect(x - w, base - hd, w * 2, hd * 0.78);
  g.beginPath(); g.moveTo(x - w, base - hd);
  g.bezierCurveTo(x - w, base - hd - hm * 1.3, x + w, base - hd - hm * 1.3, x + w, base - hd); g.closePath(); g.fill();
  g.strokeStyle = brass[0]; g.lineWidth = Math.max(1, w * 0.07);
  for (let i = 0; i <= 4; i++) {
    const bx = x - w + 2 * w * i / 4;
    g.beginPath(); g.moveTo(bx, base - hd * 0.22); g.lineTo(bx, base - hd);
    g.quadraticCurveTo(bx + (x - bx) * 0.1, base - hd - hm * 0.9, x, base - hd - hm * 0.97); g.stroke();
  }
  g.lineWidth = Math.max(1.2, w * 0.1);
  for (const yy of [base - hd, base - hd * 0.22]) { g.beginPath(); g.moveTo(x - w * 1.05, yy); g.lineTo(x + w * 1.05, yy); g.stroke(); }
  g.fillStyle = brass[0];
  g.beginPath(); g.arc(x, base - hd - hm - w * 0.12, Math.max(1, w * 0.13), 0, SS_TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.arc(x, base - hd, w * 0.75, Math.PI * 1.15, Math.PI * 1.4); g.stroke();
}
function ssClockFace(g, x, y, rr) {
  g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(x, y, rr, 0, SS_TAU); g.fill();
  g.strokeStyle = '#a8761e'; g.lineWidth = Math.max(1, rr * 0.18); g.stroke();
  g.strokeStyle = '#3a2a14'; g.lineWidth = Math.max(0.6, rr * 0.08);
  for (let k = 0; k < 12; k += 3) {
    const a = k / 12 * SS_TAU;
    g.beginPath(); g.moveTo(x + Math.cos(a) * rr * 0.7, y + Math.sin(a) * rr * 0.7); g.lineTo(x + Math.cos(a) * rr * 0.88, y + Math.sin(a) * rr * 0.88); g.stroke();
  }
  g.lineWidth = Math.max(0.8, rr * 0.12);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - rr * 0.65); g.moveTo(x, y); g.lineTo(x + rr * 0.45, y + rr * 0.15); g.stroke();
}
function ssCrown(g, x, base, w, h) {
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#ffe680', '#c08a10');
  ssPoly(g, [x - w, base, x - w, base - h * 0.75, x - w * 0.6, base - h * 0.45, x - w * 0.3, base - h, x, base - h * 0.5,
    x + w * 0.3, base - h, x + w * 0.6, base - h * 0.45, x + w, base - h * 0.75, x + w, base]);
  g.fill();
  g.strokeStyle = '#8a5a08'; g.lineWidth = Math.max(0.8, w * 0.06); g.stroke();
  g.fillStyle = '#e8343a'; g.beginPath(); g.arc(x, base - h * 0.22, Math.max(1, w * 0.12), 0, SS_TAU); g.fill();
  g.fillStyle = '#3a8aff';
  for (const o of [-0.6, 0.6]) { g.beginPath(); g.arc(x + o * w, base - h * 0.22, Math.max(0.8, w * 0.08), 0, SS_TAU); g.fill(); }
}
function ssTemple(g, x, base, s, acc) {
  const w = s * 0.5, h = s * 0.55, sb = base - s * 0.11;
  g.fillStyle = '#2e2220'; g.fillRect(x - w * 1.18, base - s * 0.06, w * 2.36, s * 0.06);
  g.fillStyle = '#3a2a28'; g.fillRect(x - w * 1.08, base - s * 0.11, w * 2.16, s * 0.055);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#5e4a46', '#221614');
  g.fillRect(x - w, sb - h, w * 2, h);
  g.fillStyle = '#2a1c1a';
  ssPoly(g, [x - w * 1.15, sb - h, x + w * 1.15, sb - h, x + w * 0.9, sb - h - s * 0.12, x - w * 0.62, sb - h - s * 0.12, x - w * 0.75, sb - h - s * 0.06]); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (const o of [-0.8, -0.45, 0.35, 0.7]) g.fillRect(x + o * w, sb - h, w * 0.12, h);
  g.fillStyle = ssShade(g, 0, sb - h * 0.62, 0, sb, '#ffd84a', '#ff5a1a');
  ssArch(g, x, sb, w * 0.24, h * 0.62);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x + w * 0.6, sb - h); g.lineTo(x + w * 0.5, sb - h * 0.6); g.lineTo(x + w * 0.7, sb - h * 0.3); g.stroke();
  acc.push({ type: 'glow', x, y: sb - h * 0.3, s: s * 0.4, color: '#ff7a2a' });
}
function ssBoilerArt(g, x, base, s, acc) {
  const w = s * 0.28, h = s * 0.55;
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#7a6a5e', '#2a221e');
  g.fillRect(x - w, base - h, w * 2, h);
  g.beginPath(); g.ellipse(x, base - h, w, w * 0.32, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#c89048';
  for (const yy of [base - h * 0.85, base - h * 0.15]) g.fillRect(x - w, yy, w * 2, Math.max(1, s * 0.035));
  g.fillStyle = 'rgba(255,220,160,0.6)';
  for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - w * 0.8 + k * w * 0.4, base - h * 0.85 + s * 0.017, Math.max(0.6, s * 0.012), 0, SS_TAU); g.fill(); }
  g.fillStyle = ssShade(g, 0, base - h * 0.62, 0, base - h * 0.15, '#ffe27a', '#ff6a1a');
  ssArch(g, x, base - h * 0.18, w * 0.42, h * 0.45);
  g.strokeStyle = '#3a2a1e'; g.lineWidth = Math.max(1, s * 0.02);
  for (const o of [-0.2, 0, 0.2]) { g.beginPath(); g.moveTo(x + o * w, base - h * 0.55); g.lineTo(x + o * w, base - h * 0.18); g.stroke(); }
  g.fillStyle = '#fff2d0'; g.beginPath(); g.arc(x - w * 0.55, base - h * 1.02, s * 0.07, 0, SS_TAU); g.fill();
  g.strokeStyle = '#8a5a22'; g.lineWidth = Math.max(0.8, s * 0.015); g.stroke();
  g.fillStyle = ssShade(g, x + w * 0.2, 0, x + w * 0.55, 0, '#8a7a6e', '#3a302a');
  g.fillRect(x + w * 0.2, base - h - s * 0.4, w * 0.36, s * 0.42);
  g.fillStyle = '#c89048'; g.fillRect(x + w * 0.12, base - h - s * 0.42, w * 0.52, s * 0.05);
  acc.push({ type: 'smoke', x: x + w * 0.38, y: base - h - s * 0.42, s: s * 0.9, color: 'rgba(240,240,244,' });
  acc.push({ type: 'glow', x, y: base - h * 0.38, s: s * 0.45, color: '#ff8a2a' });
}
function ssSkull(g, x, base, s) {
  const bone = ['#f0eacc', '#9a9070'];
  g.strokeStyle = bone[1]; g.lineWidth = Math.max(2, s * 0.08); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + s * 0.3, base - s * 0.62); g.quadraticCurveTo(x + s * 0.6, base - s * 0.9, x + s * 0.85, base - s * 0.78); g.stroke();
  g.fillStyle = ssShade(g, 0, base - s * 0.75, 0, base, bone[0], bone[1]);
  g.beginPath(); g.ellipse(x + s * 0.18, base - s * 0.45, s * 0.36, s * 0.3, 0, 0, SS_TAU); g.fill();
  ssPoly(g, [x, base - s * 0.62, x - s * 0.58, base - s * 0.34, x - s * 0.6, base - s * 0.2, x + s * 0.05, base - s * 0.2]); g.fill();
  ssPoly(g, [x - s * 0.5, base - s * 0.1, x + s * 0.28, base - s * 0.2, x + s * 0.32, base - s * 0.02, x - s * 0.42, base]); g.fill();
  g.fillStyle = '#f8f4e0';
  for (let k = 0; k < 5; k++) ssPoly(g, [x - s * 0.5 + k * s * 0.11, base - s * 0.2, x - s * 0.45 + k * s * 0.11, base - s * 0.12, x - s * 0.4 + k * s * 0.11, base - s * 0.2]), g.fill();
  g.fillStyle = '#1a2014';
  g.beginPath(); g.ellipse(x + s * 0.02, base - s * 0.46, s * 0.1, s * 0.08, -0.3, 0, SS_TAU); g.fill();
  g.beginPath(); g.arc(x - s * 0.5, base - s * 0.3, s * 0.03, 0, SS_TAU); g.fill();
  g.fillStyle = '#5a9a3a';
  for (const [dx, dy, dr] of [[0.2, -0.72, 0.12], [0.38, -0.62, 0.09], [-0.1, -0.6, 0.07], [0.45, -0.2, 0.08]]) {
    g.beginPath(); g.arc(x + dx * s, base + dy * s, dr * s, 0, SS_TAU); g.fill();
  }
}
// bone with a dark outline
function ssBone(g, x0, y0, cx, cy, x1, y1, w) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1);
  g.strokeStyle = '#7a7258'; g.lineWidth = w + 2; g.stroke();
  g.strokeStyle = '#ece6c4'; g.lineWidth = w; g.stroke();
}
function ssHangVine(g, x, y, len, col) {
  g.strokeStyle = col; g.lineWidth = 1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y + len * 0.5, x - 1, y + len); g.stroke();
  g.fillStyle = col;
  for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(x + (k % 2 ? 1.6 : -1.4), y + len * k / 3.4, 1.6, 0.8, k % 2 ? 0.5 : -0.5, 0, SS_TAU); g.fill(); }
}
function ssAirship(g, x, y, s) {
  g.fillStyle = ssShade(g, 0, y - s * 0.36, 0, y + s * 0.36, '#c89a62', '#5a3a1e');
  g.beginPath(); g.ellipse(x, y, s, s * 0.36, 0, 0, SS_TAU); g.fill();
  g.strokeStyle = 'rgba(60,36,16,0.6)'; g.lineWidth = 1;
  for (const o of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(x + o * s * 0.9, y, s * 0.08, s * 0.34, 0, 0, SS_TAU); g.stroke(); }
  g.fillStyle = '#5a3a1e';
  ssPoly(g, [x - s * 0.85, y, x - s * 1.25, y - s * 0.4, x - s * 1.1, y]); g.fill();
  ssPoly(g, [x - s * 0.85, y, x - s * 1.25, y + s * 0.4, x - s * 1.1, y]); g.fill();
  g.fillRect(x - s * 0.3, y + s * 0.42, s * 0.6, s * 0.16);
  g.strokeStyle = '#5a3a1e';
  g.beginPath(); g.moveTo(x - s * 0.25, y + s * 0.3); g.lineTo(x - s * 0.2, y + s * 0.44); g.moveTo(x + s * 0.25, y + s * 0.3); g.lineTo(x + s * 0.2, y + s * 0.44); g.stroke();
}
function ssBigMush(g, x, base, cr, h, cap, acc) {
  g.fillStyle = ssShade(g, x - cr * 0.15, 0, x + cr * 0.15, 0, '#f2eaff', '#9a88c0');
  g.beginPath();
  g.moveTo(x - cr * 0.16, base); g.quadraticCurveTo(x - cr * 0.02, base - h * 0.5, x - cr * 0.1, base - h);
  g.lineTo(x + cr * 0.1, base - h); g.quadraticCurveTo(x + cr * 0.12, base - h * 0.5, x + cr * 0.18, base);
  g.closePath(); g.fill();
  g.fillStyle = '#4a2a7a';
  g.beginPath(); g.ellipse(x, base - h + 1, cr * 0.92, cr * 0.13, 0, 0, SS_TAU); g.fill();
  g.fillStyle = ssShade(g, 0, base - h - cr * 0.6, 0, base - h, cap[0], cap[1]);
  g.beginPath(); g.moveTo(x - cr, base - h);
  g.bezierCurveTo(x - cr, base - h - cr * 0.8, x + cr, base - h - cr * 0.8, x + cr, base - h);
  g.quadraticCurveTo(x, base - h - cr * 0.12, x - cr, base - h); g.fill();
  g.fillStyle = 'rgba(200,250,255,0.85)';
  for (const [dx, dy, dr] of [[-0.5, -0.25, 0.08], [-0.1, -0.48, 0.1], [0.38, -0.36, 0.07], [0.62, -0.14, 0.05], [-0.72, -0.08, 0.05], [0.12, -0.2, 0.05]]) {
    g.beginPath(); g.arc(x + dx * cr, base - h + dy * cr, dr * cr, 0, SS_TAU); g.fill();
  }
  acc.push({ type: 'glow', x, y: base - h + cr * 0.1, s: cr * 0.85, color: '#c8a0ff', alpha: 0.5 });
}

// ---- signature landmarks: the island's centrepiece, far up the road -----
// (g, cx = road end x, by = base line just below the horizon, theme, rng, accents)
function ssLmIcePalace(g, cx, by, th, r, acc) {
  const ice = ['#f6fdff', '#8ec4e4'], roof = ['#eefaff', '#5ea6d4'], win = 'rgba(50,108,165,0.8)';
  g.fillStyle = ssShade(g, 0, by - 18, 0, by + 6, '#eef9ff', '#a4d0ea');
  ssPoly(g, [cx - 134, by + 6, cx - 112, by - 10, cx - 70, by - 18, cx + 70, by - 18, cx + 114, by - 9, cx + 136, by + 6]); g.fill();
  g.strokeStyle = 'rgba(90,150,200,0.4)'; g.lineWidth = 1;
  for (const ox of [-100, -64, -24, 30, 72, 106]) { g.beginPath(); g.moveTo(cx + ox, by - 14); g.lineTo(cx + ox + 4, by + 4); g.stroke(); }
  for (const [ox, w, h, rh] of [[-66, 8, 22, 18], [66, 8, 22, 18], [-40, 10, 34, 22], [40, 10, 34, 22]]) ssLmTower(g, cx + ox, by - 16, w, h, ice, roof, rh, win);
  g.fillStyle = ssShade(g, cx - 50, 0, cx + 50, 0, ice[0], ice[1]);
  g.fillRect(cx - 50, by - 38, 100, 22);
  for (let i = 0; i < 9; i += 2) g.fillRect(cx - 50 + i * 100 / 9, by - 42, 100 / 9, 4.5);
  g.fillStyle = win;
  for (const ox of [-36, -22, 22, 36]) ssArch(g, cx + ox, by - 22, 3, 10);
  ssArch(g, cx, by - 16, 8, 15);
  ssLmTower(g, cx, by - 38, 13, 14, ice, roof, 24, win);
  for (const ox of [-22, 22]) ssLmTower(g, cx + ox, by - 42, 5, 8, ice, roof, 13, null);
  const cols = [['#f4fcff', '#7fbfe6'], ['#dcf4ff', '#5aa6dc'], ['#ffffff', '#9ad2ee']];
  ssShards(g, cx - 106, by + 8, 46, cols, r);
  ssShards(g, cx + 108, by + 8, 52, cols, r);
  ssShards(g, cx - 150, by + 26, 34, cols, r);
  ssShards(g, cx + 156, by + 28, 30, cols, r);
  acc.push({ type: 'twinkle', x: cx - 106, y: by - 22, s: 40, color: '#ffffff' });
  acc.push({ type: 'twinkle', x: cx + 108, y: by - 24, s: 44, color: '#ffffff' });
  acc.push({ type: 'twinkle', x: cx, y: by - 50, s: 40, color: '#ffffff' });
}

function ssLmOasis(g, cx, by, th, r, acc) {
  const sand = ['#f2cc90', '#a8723a'], dome = ['#f4c880', '#a0642a'], win = 'rgba(70,40,16,0.8)', gold = '#ffd23d';
  const mx = cx - 94; // minaret
  g.fillStyle = ssShade(g, mx - 6, 0, mx + 6, 0, sand[0], sand[1]);
  g.fillRect(mx - 6, by - 64, 12, 64);
  g.fillRect(mx - 9, by - 50, 18, 3);
  g.fillRect(mx - 4.5, by - 72, 9, 9);
  g.fillRect(mx - 7, by - 66, 14, 2.5);
  g.fillStyle = win; ssArch(g, mx, by - 32, 2, 8); ssArch(g, mx, by - 54, 1.6, 6);
  ssLmDome(g, mx, by - 72, 6, 11, dome, gold);
  for (const [ox, w, h] of [[-122, 14, 16], [-70, 20, 30], [-42, 16, 22], [46, 20, 30], [78, 17, 22], [106, 15, 17]]) {
    const x = cx + ox;
    g.fillStyle = ssShade(g, x - w, 0, x + w, 0, sand[0], sand[1]);
    g.fillRect(x - w, by - h, w * 2, h);
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x - w, by - h, w * 2, 2);
    g.fillStyle = win;
    for (const o of [-0.5, 0.5]) ssArch(g, x + o * w, by - h + 12, 2, 6);
  }
  ssLmDome(g, cx - 70, by - 30, 13, 16, dome, gold);
  ssLmDome(g, cx + 78, by - 22, 12, 15, dome, gold);
  ssLmDome(g, cx + 46, by - 30, 10, 12, ['#5ad0c8', '#1f8a86'], gold);
  // central great dome on a drum
  g.fillStyle = ssShade(g, cx - 34, 0, cx + 34, 0, sand[0], sand[1]);
  g.fillRect(cx - 34, by - 28, 68, 28);
  g.fillRect(cx - 24, by - 38, 48, 10);
  g.fillStyle = win;
  for (const o of [-16, -6, 6, 16]) ssArch(g, cx + o, by - 30, 1.6, 6);
  ssLmDome(g, cx, by - 38, 26, 28, dome, gold);
  // striped awning on a side house
  const ax = cx + 46, ay = by - 10;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#f6e8c8' : '#d8483a';
    ssPoly(g, [ax - 14 + i * 4.7, ay - 6, ax - 14 + (i + 1) * 4.7, ay - 6, ax - 16 + (i + 1) * 5.3, ay, ax - 16 + i * 5.3, ay]); g.fill();
  }
  // front crenellated wall with the gate the road runs through
  g.fillStyle = ssShade(g, 0, by - 14, 0, by + 2, '#e8bc7c', '#a06a34');
  g.fillRect(cx - 142, by - 12, 284, 14);
  for (let x = cx - 142; x < cx + 142; x += 9) g.fillRect(x, by - 16, 5, 4);
  for (const o of [-1, 1]) ssLmTower(g, cx + o * 22, by + 2, 9, 24, ['#f0c486', '#a06a34'], null, 0, null);
  g.fillStyle = 'rgba(60,34,14,0.85)'; ssArch(g, cx, by + 2, 12, 17);
  ssPalm(g, cx - 122, by + 16, 46, th, r);
  ssPalm(g, cx + 126, by + 14, 50, th, r);
  ssPalm(g, cx - 156, by + 30, 40, th, r);
  ssPalm(g, cx + 160, by + 32, 42, th, r);
}

function ssLmCrystalFalls(g, cx, by, th, r, acc) {
  const P = ['#e4b8ff', '#7a3ad0'], T = ['#b4fff2', '#1f9a8a'], A = ['#ffe69a', '#d0841a'], G = ['#d0ffa0', '#3a9a3a'];
  ssLedge(g, cx, by, 180, 16, ['#5a6e88', '#2a3448'], '#3aa070', r);
  // stream along the ledge top that pours off as a waterfall beside the road
  g.strokeStyle = '#6ad4f4'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + 74, by - 22); g.quadraticCurveTo(cx + 52, by - 16, cx + 40, by - 20); g.stroke();
  for (const [ox, h, w, tilt, c] of [[-162, 34, 8, -0.3, G], [-138, 54, 11, -0.18, P], [-112, 70, 13, -0.06, T], [-88, 48, 10, 0.1, A],
    [-66, 34, 8, 0.22, P], [-48, 22, 6, 0.3, G], [62, 34, 8, -0.24, P], [86, 72, 14, -0.04, G], [112, 56, 12, 0.08, A], [136, 46, 10, 0.2, P], [158, 32, 8, 0.32, T]]) {
    ssShard(g, cx + ox, by - 12, w, h, tilt, c);
  }
  ssFall(g, cx + 40, by - 21, by + 8, 6, acc);
  g.fillStyle = 'rgba(160,230,255,0.55)';
  g.beginPath(); g.ellipse(cx + 40, by + 9, 14, 3.5, 0, 0, SS_TAU); g.fill();
  for (const [ox, oy, rr, c] of [[-28, 4, 4, '#c8a0ff'], [-36, 6, 3, '#7fd8c0'], [56, 8, 3.5, '#ffb0d0'], [26, 8, 3, '#a8c8ff']]) {
    g.fillStyle = c; g.beginPath(); g.ellipse(cx + ox, by + oy, rr, rr * 0.7, 0, 0, SS_TAU); g.fill();
  }
  for (const [ox, h] of [[-112, 60], [86, 62], [-138, 46]]) acc.push({ type: 'twinkle', x: cx + ox, y: by - 12 - h * 0.6, s: 30, color: '#ffffff' });
}

function ssLmVolcano(g, cx, by, th, r, acc) {
  const pts = [cx - 215, by + 6];
  for (let x = cx - 215; x <= cx + 215; x += 11) pts.push(x, by - 8 - (r() < 0.5 ? r() * 30 : r() * 10));
  pts.push(cx + 215, by + 6);
  g.fillStyle = '#3a2420'; ssPoly(g, pts); g.fill();
  const vx = cx + 84, top = by - 66;
  g.fillStyle = ssShade(g, vx - 110, 0, vx + 110, 0, '#64423a', '#1a0e0c');
  ssPoly(g, [vx - 124, by + 6, vx - 34, top + 8, vx - 12, top, vx + 12, top, vx + 32, top + 6, vx + 134, by + 6]); g.fill();
  g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(vx, top + 1, 12, 3, 0, 0, SS_TAU); g.fill();
  g.fillStyle = '#ffd84a'; g.beginPath(); g.ellipse(vx, top + 1, 6, 1.5, 0, 0, SS_TAU); g.fill();
  ssLava(g, [vx - 6, top + 2, vx - 14, top + 16, vx - 10, top + 28, vx - 26, top + 44, vx - 34, top + 58, vx - 56, by + 6], 2);
  ssLava(g, [vx + 7, top + 2, vx + 14, top + 20, vx + 30, top + 36, vx + 36, top + 54, vx + 58, by + 6], 1.6);
  const v2 = cx - 118, t2 = by - 42;
  g.fillStyle = ssShade(g, v2 - 70, 0, v2 + 70, 0, '#5a3a34', '#1a0e0c');
  ssPoly(g, [v2 - 86, by + 6, v2 - 10, t2, v2 + 10, t2 + 1, v2 + 84, by + 6]); g.fill();
  ssLava(g, [v2, t2 + 2, v2 + 6, t2 + 18, v2 - 4, t2 + 32, v2 + 10, by + 6], 1.3);
  ssTemple(g, cx - 56, by + 4, 34, acc);
  ssTemple(g, cx + 44, by + 6, 26, acc);
  for (const [ox, h, w] of [[-180, 64, 16], [-156, 44, 12], [172, 66, 16], [194, 46, 12], [-196, 38, 10]]) {
    const x = cx + ox;
    g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#4a3434', '#140a0a');
    ssPoly(g, [x - w, by + 20, x - w * 0.5, by + 20 - h * 0.5, x - w * 0.15, by + 20 - h, x + w * 0.3, by + 20 - h * 0.62, x + w, by + 20]); g.fill();
    g.strokeStyle = '#ff7a2a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - w * 0.1, by + 20); g.lineTo(x, by + 20 - h * 0.3); g.lineTo(x - w * 0.12, by + 20 - h * 0.6); g.stroke();
  }
  acc.push({ type: 'glow', x: vx, y: top, s: 28, color: '#ff6a1a' });
  acc.push({ type: 'smoke', x: vx, y: top - 2, s: 76, color: 'rgba(120,110,108,' });
  acc.push({ type: 'smoke', x: v2, y: t2, s: 40, color: 'rgba(110,100,98,' });
}

function ssLmAviary(g, cx, by, th, r, acc) {
  g.fillStyle = ssShade(g, 0, by - 10, 0, by + 4, '#d8b060', '#6a4a1a');
  g.fillRect(cx - 124, by - 8, 248, 10);
  g.fillStyle = '#a07a2a';
  for (let x = cx - 120; x <= cx + 120; x += 10) g.fillRect(x, by - 14, 1.5, 6);
  g.fillRect(cx - 122, by - 15, 244, 1.5);
  // brass pipes linking the cages
  g.strokeStyle = '#8a5a1a'; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(cx - 80, by - 20); g.quadraticCurveTo(cx - 60, by - 30, cx - 36, by - 22); g.moveTo(cx + 80, by - 20); g.quadraticCurveTo(cx + 60, by - 30, cx + 36, by - 22); g.stroke();
  g.strokeStyle = '#e8b850'; g.lineWidth = 1.5; g.stroke();
  for (const o of [-1, 1]) ssCageDome(g, cx + o * 82, by - 8, 18, 20, 18);
  for (const o of [-1, 1]) ssCageDome(g, cx + o * 124, by + 2, 11, 13, 11);
  // central hall: cream stone + brass columns + lit door
  g.fillStyle = ssShade(g, cx - 34, 0, cx + 34, 0, '#fbf0d4', '#c8b080');
  g.fillRect(cx - 34, by - 32, 68, 24);
  g.fillStyle = ssShade(g, 0, by - 32, 0, by - 8, '#f2cc66', '#8a5a18');
  for (let i = -3; i <= 3; i++) if (i) g.fillRect(cx + i * 10 - 1.6, by - 32, 3.2, 24);
  g.fillStyle = '#ffd88a'; ssArch(g, cx, by - 8, 6, 15);
  g.fillStyle = '#b8862a'; g.fillRect(cx - 38, by - 36, 76, 4);
  // the great glass dome with its clock
  ssCageDome(g, cx, by - 36, 32, 4, 28);
  ssClockFace(g, cx, by - 52, 8);
  g.fillStyle = '#d8a838'; g.fillRect(cx - 2.5, by - 80, 5, 6);
  ssLmDome(g, cx, by - 80, 4, 6, ['#f2cc66', '#8a5a18'], '#ffe08a');
  // parrots perched on the cages and on posts
  ssParrot(g, cx - 82, by - 47, 15, SS_PARROTS[0], 1, acc);
  ssParrot(g, cx + 82, by - 47, 15, SS_PARROTS[1], -1, acc);
  g.fillStyle = '#8a5a18';
  for (const o of [-1, 1]) { g.fillRect(cx + o * 50 - 1.2, by - 58, 2.4, 50); g.fillRect(cx + o * 50 - 7, by - 59, 14, 2); }
  ssParrot(g, cx - 52, by - 59, 13, SS_PARROTS[2], 1, acc);
  ssParrot(g, cx + 52, by - 59, 13, SS_PARROTS[3], -1, acc);
  acc.push({ type: 'twinkle', x: cx, y: by - 56, s: 50, color: '#fff6dc' });
}

function ssLmAbyssFalls(g, cx, by, th, r, acc) {
  const P = ['#e0b8ff', '#6a2ac8'], V = ['#c8a8ff', '#4a2a9a'], G = ['#a8ffb0', '#2a9a5a'], B = ['#b0e8ff', '#3a7ad8'];
  ssLedge(g, cx, by, 180, 18, ['#4e4272', '#1e1834'], '#3a9a5a', r);
  for (const [ox, h, w, tilt, c] of [[-166, 36, 9, -0.3, G], [-142, 74, 14, -0.16, P], [-114, 60, 12, 0.02, V], [-92, 42, 9, 0.16, P], [-72, 28, 7, 0.3, B], [-56, 18, 5, 0.36, P]]) {
    ssShard(g, cx + ox, by - 12, w, h, tilt, c);
  }
  g.strokeStyle = '#6ad4f4'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + 20, by - 26); g.quadraticCurveTo(cx + 36, by - 20, cx + 34, by - 22); g.stroke();
  ssFall(g, cx + 36, by - 23, by + 8, 6.5, acc);
  g.fillStyle = 'rgba(140,220,255,0.5)'; g.beginPath(); g.ellipse(cx + 36, by + 9, 15, 3.5, 0, 0, SS_TAU); g.fill();
  ssBloom(g, cx + 92, by - 6, 70, '#4a2e2a', ['#ffd0ea', '#d0609a'], ['#e0ff9a', '#6aa83a']);
  for (const [ox, h, w, tilt, c] of [[124, 54, 11, -0.12, G], [146, 70, 13, 0.04, G], [168, 42, 9, 0.24, B]]) ssShard(g, cx + ox, by - 10, w, h, tilt, c);
  ssMushroom(g, cx + 60, by + 6, 14, th, r, acc);
  ssMushroom(g, cx - 42, by + 6, 12, th, r, acc);
  acc.push({ type: 'twinkle', x: cx - 142, y: by - 50, s: 34, color: '#ffffff' });
  acc.push({ type: 'twinkle', x: cx + 146, y: by - 50, s: 30, color: '#ffffff' });
}

function ssLmObservatory(g, cx, by, th, r, acc) {
  const ix = cx + 60, iy = by - 30;
  // twisted blue-leaved tree and a purple crystal on the left
  ssBloom(g, cx - 120, by + 8, 74, '#6a5878', ['#9aa8ff', '#2e2e9a'], ['#7a88f0', '#26267a'], true);
  ssShards(g, cx - 76, by + 8, 34, [['#e8c0ff', '#8a4ad8'], ['#d8a8ff', '#6a2ac8']], r);
  // floating marble island
  g.fillStyle = ssShade(g, 0, iy, 0, iy + 34, '#d4d0ea', '#6e6a90');
  ssPoly(g, [ix - 74, iy, ix + 74, iy, ix + 58, iy + 10, ix + 34, iy + 18, ix + 10, iy + 34, ix - 16, iy + 20, ix - 48, iy + 12]); g.fill();
  g.strokeStyle = 'rgba(60,56,90,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(ix - 30, iy + 4); g.lineTo(ix - 10, iy + 20); g.moveTo(ix + 30, iy + 4); g.lineTo(ix + 12, iy + 26); g.stroke();
  g.fillStyle = ssShade(g, 0, iy - 7, 0, iy + 7, '#ffffff', '#c4c0e2');
  g.beginPath(); g.ellipse(ix, iy, 74, 7, 0, 0, SS_TAU); g.fill();
  // starry pool
  g.fillStyle = ssShade(g, 0, iy - 4, 0, iy + 4, '#3a3ea8', '#14164e');
  g.beginPath(); g.ellipse(ix - 36, iy, 22, 4.2, 0, 0, SS_TAU); g.fill();
  g.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(ix - 52 + k * 6.5, iy - 1.5 + (k % 3), 0.7, 0, SS_TAU); g.fill(); }
  // domed observatory gazebo
  const ox = ix + 16;
  g.fillStyle = ssShade(g, 0, iy - 26, 0, iy, '#ffffff', '#b8bedc');
  for (const o of [-14, -5, 5, 14]) g.fillRect(ox + o - 1.8, iy - 24, 3.6, 22);
  g.fillRect(ox - 18, iy - 28, 36, 4);
  g.fillRect(ox - 18, iy - 3, 36, 3);
  ssLmDome(g, ox, iy - 28, 17, 16, ['#a8baff', '#3a4ab8'], '#ffe08a');
  g.strokeStyle = '#ffe08a'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(ox - 17, iy - 28.5); g.lineTo(ox + 17, iy - 28.5); g.stroke();
  // telescope
  const tx = ix + 52;
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(tx, iy - 12); g.lineTo(tx - 6, iy); g.moveTo(tx, iy - 12); g.lineTo(tx + 6, iy); g.moveTo(tx, iy - 12); g.lineTo(tx + 1, iy + 1); g.stroke();
  g.save(); g.translate(tx, iy - 13); g.rotate(-0.65);
  g.fillStyle = ssShade(g, 0, -4, 0, 4, '#ffe08a', '#a8761e');
  ssPoly(g, [-8, -2.2, 18, -3.6, 18, 3.6, -8, 2.2]); g.fill();
  g.fillStyle = '#7a5218'; g.fillRect(4, -3, 2, 6);
  g.fillStyle = '#cfeaff'; g.beginPath(); g.ellipse(18, 0, 1.4, 3.6, 0, 0, SS_TAU); g.fill();
  g.restore();
  // marble staircase from the island down to the road end
  for (let i = 7; i >= 0; i--) {
    const sx = ix - 66 - i * 5.5, sy = iy + 2 + i * 4.2;
    g.fillStyle = '#b4b8d6'; g.fillRect(sx - 8, sy, 14, 4.2);
    g.fillStyle = '#ffffff'; g.fillRect(sx - 8, sy, 14, 1.4);
  }
  g.fillStyle = '#9a9ec4';
  ssPoly(g, [ix - 60, iy + 2, ix - 60, iy + 8, ix - 98, iy + 35, ix - 104, iy + 35]); g.fill();
  acc.push({ type: 'twinkle', x: ix - 36, y: iy, s: 36, color: '#ffffff' });
  acc.push({ type: 'mist', x: cx, y: by - 4, w: 360, s: 7, color: '#d8c8ff' });
  acc.push({ type: 'mist', x: cx + 40, y: by + 22, w: 300, s: 5, color: '#c8d0ff' });
}

function ssLmClockwork(g, cx, by, th, r, acc) {
  const cu = ['#b07040', '#4a2a16'], iron = ['#7a6a60', '#2a221e'];
  ssAirship(g, cx - 150, by - 52, 15);
  ssAirship(g, cx + 152, by - 38, 11);
  for (const [ox, h] of [[-120, 54], [-102, 42], [124, 50]]) {
    const x = cx + ox;
    g.fillStyle = ssShade(g, x - 4, 0, x + 4, 0, iron[0], iron[1]);
    g.fillRect(x - 4, by - h, 8, h);
    g.fillStyle = '#c89048'; g.fillRect(x - 5, by - h, 10, 3); g.fillRect(x - 4, by - h * 0.55, 8, 2);
    acc.push({ type: 'smoke', x, y: by - h, s: 34, color: 'rgba(110,100,96,' });
  }
  for (const [ox, w, h] of [[-128, 18, 20], [-84, 28, 30], [-44, 18, 40], [46, 22, 36], [90, 28, 26], [132, 16, 18]]) {
    const x = cx + ox;
    g.fillStyle = ssShade(g, x - w, 0, x + w, 0, cu[0], cu[1]);
    g.fillRect(x - w, by - h, w * 2, h);
    g.fillStyle = '#d8a050'; g.fillRect(x - w, by - h, w * 2, 2.5);
    g.fillStyle = 'rgba(255,220,160,0.5)';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x - w + 3 + k * (w * 2 - 6) / 3, by - h + 5, 0.8, 0, SS_TAU); g.fill(); }
    g.fillStyle = '#ffc86a';
    for (let k = 0; k < Math.floor(w / 9); k++) g.fillRect(x - w + 5 + k * 9, by - h * 0.62, 3.5, 5);
  }
  // pipes
  g.strokeStyle = '#6a4418'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx - 112, by - 12); g.lineTo(cx - 14, by - 12); g.moveTo(cx + 14, by - 16); g.lineTo(cx + 104, by - 16); g.lineTo(cx + 104, by - 30); g.stroke();
  g.strokeStyle = '#e0a850'; g.lineWidth = 2; g.stroke();
  // clocktower
  g.fillStyle = ssShade(g, cx - 10, 0, cx + 10, 0, cu[0], cu[1]);
  g.fillRect(cx - 10, by - 48, 20, 48);
  g.fillStyle = ssShade(g, cx - 13, 0, cx + 13, 0, '#c88a4a', '#5a3218');
  g.fillRect(cx - 13, by - 66, 26, 20);
  g.fillStyle = '#d8a050'; g.fillRect(cx - 14, by - 48, 28, 3); g.fillRect(cx - 14, by - 67, 28, 3);
  ssClockFace(g, cx, by - 56.5, 8);
  g.fillStyle = ssShade(g, cx - 14, 0, cx + 14, 0, '#6aa08e', '#2e5a4e');
  ssPoly(g, [cx - 15, by - 67, cx, by - 82, cx + 15, by - 67]); g.fill();
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(cx, by - 82); g.lineTo(cx, by - 88); g.stroke();
  g.fillStyle = '#ffc86a'; g.fillRect(cx - 2, by - 38, 4, 7);
  ssBoilerArt(g, cx + 30, by + 4, 30, acc);
  acc.push({ type: 'gear', x: cx - 64, y: by - 38, s: 62, dir: 1, alpha: 0.72 });
  acc.push({ type: 'gear', x: cx - 37, y: by - 24, s: 36, dir: -1, alpha: 0.72 });
  acc.push({ type: 'gear', x: cx + 70, y: by - 38, s: 50, dir: -1, alpha: 0.72 });
}

function ssLmMushCanopy(g, cx, by, th, r, acc) {
  for (const [ox, h, dir] of [[-158, 62, 1], [-120, 42, -1], [146, 68, -1], [176, 44, 1], [-30, 26, 1]]) ssCurl(g, cx + ox, by + 8, h, dir, '#2fb8a8', 3.2);
  const cap = ['#d4a8ff', '#5a2ab0'];
  ssBigMush(g, cx - 34, by - 2, 18, 26, cap, acc);
  ssBigMush(g, cx - 92, by + 4, 36, 40, cap, acc);
  ssBigMush(g, cx + 76, by + 6, 52, 46, ['#c890ff', '#4a1e98'], acc);
  for (let k = 0; k < 6; k++) {
    acc.push({ type: 'wisp', x: cx - 150 + k * 60 + r() * 20, y: by - 30 + r() * 30, s: 7, color: '#7fe8ff' });
  }
}

function ssLmFortress(g, cx, by, th, r, acc) {
  const st = ['#c0c4cc', '#5e626c'], win = '#ffc84a';
  for (const side of [-1, 1]) {
    const pts = [cx + side * 214, by + 70, cx + side * 214, by - 34];
    for (let k = 0; k <= 7; k++) pts.push(cx + side * (214 - k * 14), by - 38 + k * 4 - r() * 12);
    pts.push(cx + side * 100, by + 2, cx + side * 130, by + 70);
    g.fillStyle = ssShade(g, 0, by - 40, 0, by + 70, '#a8acb4', '#4a4e56');
    ssPoly(g, pts); g.fill();
    g.strokeStyle = 'rgba(40,42,50,0.35)'; g.lineWidth = 1;
    g.fillStyle = 'rgba(30,32,40,0.18)';
    for (let k = 0; k < 4; k++) { const x = cx + side * (204 - k * 26); ssPoly(g, [x, by - 30 + k * 5, x + side * 12, by + 64, x + side * 22, by + 64, x + side * 6, by - 24 + k * 5]); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.14)';
    for (let k = 0; k < 3; k++) { const x = cx + side * (192 - k * 28); ssPoly(g, [x, by - 28 + k * 5, x - side * 10, by - 6 + k * 4, x - side * 2, by + 6 + k * 4]); g.fill(); }
    for (let k = 0; k < 4; k++) { const x = cx + side * (200 - k * 22); g.beginPath(); g.moveTo(x, by - 26 + k * 4); g.lineTo(x + side * 8, by + 40); g.stroke(); }
  }
  g.fillStyle = ssShade(g, 0, by - 24, 0, by + 2, st[0], st[1]);
  g.fillRect(cx - 98, by - 22, 196, 24);
  for (let x = cx - 98; x < cx + 98; x += 8) g.fillRect(x, by - 26, 4.5, 4);
  for (const [ox, w, h] of [[-98, 13, 46], [98, 13, 46], [-60, 11, 58], [60, 11, 58]]) ssLmTower(g, cx + ox, by + 2, w, h, st, null, 0, win);
  g.fillStyle = ssShade(g, cx - 34, 0, cx + 34, 0, st[0], st[1]);
  g.fillRect(cx - 34, by - 44, 68, 22);
  g.fillStyle = '#d8b040'; g.fillRect(cx - 36, by - 46, 72, 2.5);
  g.fillStyle = win;
  for (const o of [-24, -12, 12, 24]) ssArch(g, cx + o, by - 28, 2.2, 9);
  g.fillStyle = ssShade(g, cx - 28, 0, cx + 28, 0, '#7a8090', '#2e323c');
  g.beginPath(); g.moveTo(cx - 28, by - 46); g.bezierCurveTo(cx - 28, by - 62, cx + 28, by - 62, cx + 28, by - 46); g.closePath(); g.fill();
  g.strokeStyle = '#d8b040'; g.lineWidth = 1;
  for (const o of [-14, 0, 14]) { g.beginPath(); g.moveTo(cx + o * 1.6, by - 46); g.quadraticCurveTo(cx + o, by - 57, cx, by - 58); g.stroke(); }
  ssCrown(g, cx, by - 57, 14, 13);
  g.fillStyle = '#26282e'; ssArch(g, cx, by + 2, 11, 20);
  g.strokeStyle = '#ffd84a'; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 2, by - 17); g.lineTo(cx - 2, by - 8); g.moveTo(cx - 2, by - 12.5); g.lineTo(cx + 3, by - 17); g.moveTo(cx - 2, by - 12.5); g.lineTo(cx + 3, by - 8); g.stroke();
  acc.push({ type: 'glow', x: cx, y: by - 12, s: 16, color: '#ffd84a' });
  acc.push({ type: 'twinkle', x: cx, y: by - 62, s: 28, color: '#fff2a0' });
}

function ssLmDragon(g, cx, by, th, r, acc) {
  g.fillStyle = ssShade(g, 0, by - 20, 0, by + 10, '#3e6a32', '#1a3016');
  g.beginPath(); g.moveTo(cx - 190, by + 10); g.quadraticCurveTo(cx - 120, by - 22, cx - 20, by - 8);
  g.quadraticCurveTo(cx + 80, by - 26, cx + 190, by + 10); g.closePath(); g.fill();
  // mossy trees at the flanks
  for (const [ox, s] of [[-168, 70], [170, 64]]) {
    const x = cx + ox;
    g.strokeStyle = '#3a2e1c'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, by + 14); g.quadraticCurveTo(x + 8, by - s * 0.4, x - 4, by - s * 0.7); g.stroke();
    g.fillStyle = '#2e5a22';
    for (const [bx, byy, br] of [[-0.3, -0.75, 0.24], [0.25, -0.8, 0.26], [0, -0.95, 0.28]]) { g.beginPath(); g.arc(x + bx * s, by + byy * s, br * s, 0, SS_TAU); g.fill(); }
    for (let k = 0; k < 5; k++) ssHangVine(g, x - s * 0.4 + k * s * 0.2, by - s * 0.62, 10 + (k % 3) * 6, '#4a8a3a');
  }
  // spine as a cubic from the neck over the road end to the tail
  const P = [cx - 64, by - 18, cx - 20, by - 76, cx + 92, by - 62, cx + 162, by - 2];
  const at = (p) => {
    const q = 1 - p;
    return [q * q * q * P[0] + 3 * q * q * p * P[2] + 3 * q * p * p * P[4] + p * p * p * P[6], q * q * q * P[1] + 3 * q * q * p * P[3] + 3 * q * p * p * P[5] + p * p * p * P[7]];
  };
  // far-side ribs, darker
  for (let p = 0.38; p <= 0.8; p += 0.07) {
    const [sx, sy] = at(p);
    g.globalAlpha = 0.7; ssBone(g, sx, sy, sx - 26, sy + 8, sx - 8, by + 2, 2.6); g.globalAlpha = 1;
  }
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(P[0], P[1]); g.bezierCurveTo(P[2], P[3], P[4], P[5], P[6], P[7]);
  g.strokeStyle = '#7a7258'; g.lineWidth = 7; g.stroke();
  g.strokeStyle = '#ece6c4'; g.lineWidth = 5; g.stroke();
  for (let p = 0.04; p < 0.98; p += 0.045) {
    const [sx, sy] = at(p);
    g.fillStyle = '#e4dcb8'; g.beginPath(); g.arc(sx, sy, 3.2, 0, SS_TAU); g.fill();
    g.fillStyle = '#d8d0aa'; ssPoly(g, [sx - 1.5, sy - 2, sx + 1, sy - 8, sx + 2, sy - 2]); g.fill();
  }
  // near-side ribs
  for (let p = 0.38; p <= 0.8; p += 0.07) {
    const [sx, sy] = at(p);
    ssBone(g, sx, sy, sx + 30, sy + 6, sx + 12, by + 4, 3.2);
  }
  // moss + hanging vines on the bones
  g.fillStyle = '#5a9a3a';
  for (let p = 0.1; p < 0.95; p += 0.09) {
    const [sx, sy] = at(p);
    g.beginPath(); g.ellipse(sx + 1, sy - 2, 5, 2.6, 0, 0, SS_TAU); g.fill();
    if (r() < 0.7) ssHangVine(g, sx, sy + 2, 8 + r() * 14, '#4a8a3a');
  }
  ssSkull(g, cx - 84, by + 2, 40);
  // twisted roots across the base
  g.strokeStyle = '#3a2a16'; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const x = cx - 170 + k * 52 + r() * 14;
    if (Math.abs(x - cx) < 34) continue;
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, by + 10); g.bezierCurveTo(x + 8, by, x + 14, by + 14, x + 26, by + 6); g.stroke();
  }
  acc.push({ type: 'glow', x: cx + 50, y: by - 30, s: 50, color: '#d8ffe4', alpha: 0.55 });
  acc.push({ type: 'glow', x: cx - 84, y: by - 16, s: 7, color: '#9affb0' });
  acc.push({ type: 'wisp', x: cx + 20, y: by - 20, s: 7, color: '#d8ffe4' });
  acc.push({ type: 'wisp', x: cx + 110, y: by - 14, s: 6, color: '#d8ffe4' });
}

// painted on its own layer, then washed with the theme's haze so it reads as distance
function ssLandmark(g, stage, th, k, acc) {
  const W = CONFIG.width, H = CONFIG.height, hy = H * SS_HORIZON;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const lg = cv.getContext('2d');
  lg.scale(k, k);
  const r = ssRng(stage * 7919 + 3);
  th.landmark(lg, W / 2, hy + 10, th, r, acc);
  lg.globalCompositeOperation = 'source-atop';
  const f = th.lmFog == null ? 1 : th.lmFog, hex = (a) => Math.round(Math.min(1, a * f) * 255).toString(16).padStart(2, '0');
  const fg = lg.createLinearGradient(0, hy - 80, 0, hy + 90);
  fg.addColorStop(0, th.haze + hex(0.22)); fg.addColorStop(0.55, th.haze + hex(0.4)); fg.addColorStop(1, th.haze + hex(0.18));
  lg.fillStyle = fg; lg.fillRect(0, 0, W, H);
  g.drawImage(cv, 0, 0, W, H);
}

// ---- new side props (from each island's details) -----------------------
function ssIceSpire(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.24);
  ssShard(g, x - s * 0.13, y, s * 0.06, s * 0.42, -0.35, ['#e0f6ff', '#8fcbeb']);
  ssShard(g, x, y, s * 0.1, s, (r() - 0.5) * 0.12, ['#f4fcff', '#6fb4e0']);
  ssShard(g, x + s * 0.13, y, s * 0.05, s * 0.3, 0.4, ['#e0f6ff', '#8fcbeb']);
  g.fillStyle = '#f6fcff';
  g.beginPath(); g.ellipse(x, y - s * 0.01, s * 0.24, s * 0.06, 0, 0, SS_TAU); g.fill();
  acc.push({ type: 'twinkle', x, y: y - s * 0.6, s: s * 0.6, color: '#ffffff' });
}

function ssFrozenPond(g, x, y, s, th, r, acc) {
  const w = s * 0.78, h = s * 0.25;
  g.fillStyle = '#f6fcff';
  g.beginPath(); g.ellipse(x, y - h, w + s * 0.08, h + s * 0.06, 0, 0, SS_TAU); g.fill();
  g.fillStyle = ssShade(g, 0, y - 2 * h, 0, y, '#e8fbff', '#86c8ec');
  g.beginPath(); g.ellipse(x, y - h, w, h, 0, 0, SS_TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    let px = x + (r() - 0.5) * w, py = y - h + (r() - 0.5) * h * 0.8;
    g.beginPath(); g.moveTo(px, py);
    for (let j = 0; j < 3; j++) { px += (r() - 0.5) * w * 0.4; py += (r() - 0.5) * h * 0.4; g.lineTo(px, py); }
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  for (let k = 0; k < 5; k++) {
    const a = r() * SS_TAU;
    g.beginPath(); g.arc(x + Math.cos(a) * (w + s * 0.04), y - h + Math.sin(a) * (h + s * 0.03), s * (0.04 + r() * 0.04), 0, SS_TAU); g.fill();
  }
  acc.push({ type: 'twinkle', x, y: y - h, s: w, color: '#ffffff' });
}

function ssMinaret(g, x, y, s, th) {
  const [c1, c2] = th.house, w = s * 0.065;
  ssShadow(g, x, y, s * 0.15);
  g.fillStyle = ssShade(g, x - w * 1.8, 0, x + w * 1.8, 0, c1, c2);
  g.fillRect(x - w * 1.8, y - s * 0.22, w * 3.6, s * 0.22);
  g.fillRect(x - w, y - s * 0.84, w * 2, s * 0.62);
  g.fillRect(x - w * 1.8, y - s * 0.62, w * 3.6, s * 0.035);
  g.fillRect(x - w * 0.75, y - s * 0.94, w * 1.5, s * 0.1);
  g.fillRect(x - w * 1.4, y - s * 0.86, w * 2.8, s * 0.025);
  g.fillStyle = 'rgba(60,34,14,0.8)';
  ssArch(g, x, y, w * 0.8, s * 0.12);
  ssArch(g, x, y - s * 0.38, w * 0.4, s * 0.1);
  ssLmDome(g, x, y - s * 0.94, w * 0.95, s * 0.12, th.dome, th.trim || '#ffd23d');
}

function ssAwning(g, x, y, s, th, r) {
  const w = s * 0.36, h = s * 0.28, [c1, c2] = th.house;
  ssShadow(g, x, y, w * 1.2);
  g.fillStyle = '#6a4420';
  for (const o of [-0.95, 0.95]) g.fillRect(x + o * w - s * 0.02, y - s * 0.62, s * 0.04, s * 0.62);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c1, c2);
  g.fillRect(x - w, y - h, w * 2, h);
  const goods = ['#ff9a2a', '#7ac83a', '#ffd23d', '#d8483a'];
  for (let k = 0; k < 5; k++) {
    g.fillStyle = goods[Math.floor(r() * goods.length)];
    g.beginPath(); g.arc(x - w * 0.75 + k * w * 0.37, y - h - s * 0.035, s * 0.04, 0, SS_TAU); g.fill();
  }
  const ay = y - s * 0.52, seg = w * 2.3 / 6, cols = r() < 0.5 ? ['#d8483a', '#f6e8c8'] : ['#2aa8a0', '#f6e8c8'];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i % 2];
    const x0 = x - w * 1.15 + i * seg;
    ssPoly(g, [x - w * 0.9 + i * w * 1.8 / 6, ay - s * 0.16, x - w * 0.9 + (i + 1) * w * 1.8 / 6, ay - s * 0.16, x0 + seg, ay, x0, ay]); g.fill();
    g.beginPath(); g.arc(x0 + seg / 2, ay, seg / 2, 0, Math.PI); g.fill();
  }
}

function ssBrook(g, x, y, s, th, r, acc) {
  const w = s * 0.6, cols = th.pebbles || ['#c8a0ff', '#7fd8c0', '#ffb0d0', '#a8c8ff'];
  g.fillStyle = 'rgba(40,140,90,0.55)';
  g.beginPath(); g.ellipse(x, y - s * 0.08, w * 1.1, s * 0.15, 0, 0, SS_TAU); g.fill();
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - w, y - s * 0.02); g.quadraticCurveTo(x - w * 0.2, y - s * 0.22, x + w * 0.2, y - s * 0.08); g.quadraticCurveTo(x + w * 0.6, y, x + w, y - s * 0.12);
  g.strokeStyle = '#4ab8e8'; g.lineWidth = s * 0.13; g.stroke();
  g.strokeStyle = 'rgba(210,248,255,0.85)'; g.lineWidth = Math.max(1, s * 0.035); g.stroke();
  for (let k = 0; k < 7; k++) {
    const p = k / 6, sx = x - w + p * w * 2, sy = y - s * 0.08 + (k % 2 ? s * 0.11 : -s * 0.13);
    const rr = s * (0.045 + r() * 0.03);
    g.fillStyle = cols[k % cols.length];
    g.beginPath(); g.ellipse(sx, sy, rr * 1.2, rr, 0, 0, SS_TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath(); g.arc(sx - rr * 0.35, sy - rr * 0.35, rr * 0.35, 0, SS_TAU); g.fill();
  }
  acc.push({ type: 'twinkle', x, y: y - s * 0.1, s: w, color: '#ffffff' });
}

function ssTempleRuin(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.45);
  ssTemple(g, x, y, s * 0.8, acc);
}

function ssPerch(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.14);
  g.fillStyle = '#8a5a18'; g.beginPath(); g.ellipse(x, y - s * 0.02, s * 0.1, s * 0.03, 0, 0, SS_TAU); g.fill();
  g.fillStyle = ssShade(g, x - s * 0.03, 0, x + s * 0.03, 0, '#f2cc66', '#8a5a18');
  g.fillRect(x - s * 0.025, y - s * 0.62, s * 0.05, s * 0.62);
  g.fillRect(x - s * 0.18, y - s * 0.64, s * 0.36, s * 0.035);
  g.fillStyle = '#f2cc66';
  for (const o of [-1, 1]) { g.beginPath(); g.arc(x + o * s * 0.18, y - s * 0.622, s * 0.03, 0, SS_TAU); g.fill(); }
  ssParrot(g, x + s * 0.04, y - s * 0.64, s * 0.36, SS_PARROTS[Math.floor(r() * SS_PARROTS.length)], r() < 0.5 ? -1 : 1, acc);
}

function ssClockCage(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.3);
  ssCageDome(g, x, y, s * 0.24, s * 0.34, s * 0.28);
  ssClockFace(g, x, y - s * 0.18, s * 0.08);
  acc.push({ type: 'bird', x: x - s * 0.06, y: y - s * 0.42, s, color: ['#ff7a5a', '#5ad8ff', '#ffd23d', '#8aff7a'][Math.floor(r() * 4)] });
}

function ssFountain(g, x, y, s, th, r, acc) {
  const w = s * 0.42;
  ssShadow(g, x, y, w * 1.1);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#f2cc66', '#8a5a18');
  g.beginPath(); g.ellipse(x, y - s * 0.08, w, w * 0.3, 0, 0, SS_TAU); g.fill();
  g.fillRect(x - w, y - s * 0.08, w * 2, s * 0.06);
  g.fillStyle = '#8ae0ff'; g.beginPath(); g.ellipse(x, y - s * 0.09, w * 0.85, w * 0.22, 0, 0, SS_TAU); g.fill();
  g.fillStyle = '#c89838'; g.fillRect(x - s * 0.03, y - s * 0.46, s * 0.06, s * 0.38);
  g.beginPath(); g.ellipse(x, y - s * 0.46, w * 0.42, w * 0.13, 0, 0, SS_TAU); g.fill();
  g.strokeStyle = 'rgba(200,245,255,0.85)'; g.lineWidth = Math.max(1, s * 0.025);
  for (const o of [-1, 1]) { g.beginPath(); g.moveTo(x + o * w * 0.4, y - s * 0.46); g.quadraticCurveTo(x + o * w * 0.75, y - s * 0.44, x + o * w * 0.7, y - s * 0.12); g.stroke(); }
  g.beginPath(); g.moveTo(x, y - s * 0.48); g.lineTo(x, y - s * 0.62); g.stroke();
  acc.push({ type: 'twinkle', x, y: y - s * 0.12, s: w, color: '#ffffff' });
}

function ssTelescope(g, x, y, s) {
  ssShadow(g, x, y, s * 0.2);
  g.strokeStyle = '#6a4a2a'; g.lineWidth = Math.max(1, s * 0.03);
  g.beginPath(); g.moveTo(x, y - s * 0.45); g.lineTo(x - s * 0.2, y); g.moveTo(x, y - s * 0.45); g.lineTo(x + s * 0.18, y); g.moveTo(x, y - s * 0.45); g.lineTo(x + s * 0.02, y + s * 0.02); g.stroke();
  g.save(); g.translate(x, y - s * 0.48); g.rotate(-0.6);
  g.fillStyle = ssShade(g, 0, -s * 0.08, 0, s * 0.08, '#ffe08a', '#a8761e');
  ssPoly(g, [-s * 0.25, -s * 0.05, s * 0.42, -s * 0.085, s * 0.42, s * 0.085, -s * 0.25, s * 0.05]); g.fill();
  g.fillStyle = '#7a5218';
  for (const o of [-0.1, 0.18]) g.fillRect(o * s, -s * 0.075, s * 0.04, s * 0.15);
  g.fillStyle = '#cfeaff'; g.beginPath(); g.ellipse(s * 0.42, 0, s * 0.025, s * 0.085, 0, 0, SS_TAU); g.fill();
  g.restore();
}

function ssMarbleStair(g, x, y, s) {
  const n = 5, sw = s * 0.5, sh = s * 0.11;
  ssShadow(g, x, y, sw * 0.8);
  g.fillStyle = '#9a9ec4';
  ssPoly(g, [x + sw * 0.5, y, x + sw * 0.5 - n * s * 0.07, y - n * sh, x + sw * 0.62 - n * s * 0.07, y - n * sh, x + sw * 0.62, y]); g.fill();
  for (let i = n - 1; i >= 0; i--) {
    const sx = x - i * s * 0.07, sy = y - i * sh;
    g.fillStyle = ssShade(g, 0, sy - sh, 0, sy, '#f4f4fc', '#b4b8d6');
    g.fillRect(sx - sw * 0.5, sy - sh, sw, sh);
    g.fillStyle = '#ffffff'; g.fillRect(sx - sw * 0.5, sy - sh, sw, Math.max(1, sh * 0.25));
  }
  g.fillStyle = '#ffffff';
  for (const i of [0, n - 1]) {
    const sx = x - i * s * 0.07 + sw * 0.5, sy = y - i * sh - sh;
    g.fillRect(sx, sy - s * 0.16, s * 0.05, s * 0.16);
    g.beginPath(); g.arc(sx + s * 0.025, sy - s * 0.17, s * 0.035, 0, SS_TAU); g.fill();
  }
}

function ssBoiler(g, x, y, s, th, r, acc) {
  ssShadow(g, x, y, s * 0.32);
  ssBoilerArt(g, x, y, s, acc);
}

function ssMushHouse(g, x, y, s, th, r, acc) {
  const w = s * 0.3, h = s * 0.36, [cap, capDark] = th.cap;
  ssShadow(g, x, y, w * 1.4);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#e0d0b8', '#7a6a5a');
  g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 1.15, y - h, x - w * 0.75, y - h);
  g.lineTo(x + w * 0.75, y - h); g.quadraticCurveTo(x + w * 1.15, y - h, x + w, y); g.closePath(); g.fill();
  g.fillStyle = '#4a3020'; ssArch(g, x - w * 0.1, y, w * 0.28, h * 0.68);
  g.fillStyle = '#ffd27a'; ssArch(g, x - w * 0.1, y, w * 0.2, h * 0.58);
  g.fillStyle = '#4a3020'; g.beginPath(); g.arc(x + w * 0.58, y - h * 0.58, w * 0.18, 0, SS_TAU); g.fill();
  g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(x + w * 0.58, y - h * 0.58, w * 0.12, 0, SS_TAU); g.fill();
  g.fillStyle = ssShade(g, 0, y - h - s * 0.45, 0, y - h * 0.8, cap, capDark);
  g.beginPath(); g.moveTo(x - w * 1.55, y - h * 0.82);
  g.bezierCurveTo(x - w * 1.4, y - h - s * 0.55, x + w * 1.4, y - h - s * 0.55, x + w * 1.55, y - h * 0.82);
  g.quadraticCurveTo(x, y - h * 1.05, x - w * 1.55, y - h * 0.82); g.fill();
  g.fillStyle = 'rgba(230,250,255,0.8)';
  for (const [dx, dy, dr] of [[-0.8, -1.25, 0.14], [0.1, -1.6, 0.18], [0.85, -1.2, 0.12], [-0.25, -1.3, 0.09]]) {
    g.beginPath(); g.arc(x + dx * w, y + dy * h, dr * w, 0, SS_TAU); g.fill();
  }
  acc.push({ type: 'glow', x: x - w * 0.1, y: y - h * 0.3, s: s * 0.32, color: '#ffd27a' });
}

function ssCurlVine(g, x, y, s, th, r) {
  ssCurl(g, x, y, s * 0.9, r() < 0.5 ? -1 : 1, th.curl || '#2fb8a8', Math.max(1.5, s * 0.07));
}

function ssTotem(g, x, y, s, th, r, acc) {
  const w = s * 0.15, h = s * 0.75;
  ssShadow(g, x, y, w * 1.6);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, '#8a9a8a', '#3a4a3e');
  g.beginPath(); g.moveTo(x - w * 1.1, y); g.lineTo(x - w, y - h + w); g.arc(x, y - h + w, w, Math.PI, 0); g.lineTo(x + w * 1.1, y); g.closePath(); g.fill();
  g.fillStyle = 'rgba(20,28,24,0.7)';
  g.fillRect(x - w * 0.7, y - h * 0.82, w * 1.4, h * 0.04);
  g.fillRect(x - w * 0.45, y - h * 0.55, w * 0.9, h * 0.08);
  g.fillRect(x - w * 0.5, y - h * 0.25, w * 1.0, h * 0.06);
  g.fillStyle = '#7fe8ff';
  for (const o of [-0.4, 0.4]) { g.beginPath(); g.ellipse(x + o * w, y - h * 0.71, w * 0.18, w * 0.13, 0, 0, SS_TAU); g.fill(); }
  g.fillStyle = '#4aa86a';
  for (const [dx, dy, dr] of [[-0.5, -0.98, 0.5], [0.4, -1.0, 0.4], [-0.9, -0.4, 0.3], [0.85, -0.15, 0.32]]) {
    g.beginPath(); g.arc(x + dx * w, y + dy * h, dr * w, 0, SS_TAU); g.fill();
  }
  acc.push({ type: 'glow', x, y: y - h * 0.71, s: s * 0.2, color: '#7fe8ff' });
}

function ssWisp(g, x, y, s, th, r, acc) {
  acc.push({ type: 'wisp', x, y: y - s * 0.6, s: s * 0.22, color: th.wisp || '#7fe8ff' });
}

function ssRibs(g, x, y, s, th, r) {
  ssShadow(g, x, y, s * 0.35);
  const lw = Math.max(1.5, s * 0.06);
  for (const k of [-1, 0, 1]) {
    const bx = x + k * s * 0.17, h = s * (0.75 - Math.abs(k) * 0.15);
    ssBone(g, bx, y, bx - s * 0.06, y - h, bx + s * 0.2, y - h * 0.82, lw);
    g.fillStyle = '#5a9a3a';
    g.beginPath(); g.ellipse(bx - s * 0.02, y - h * 0.62, s * 0.05, s * 0.03, 0, 0, SS_TAU); g.fill();
  }
  g.fillStyle = '#4a8a3a';
  g.beginPath(); g.ellipse(x, y, s * 0.4, s * 0.06, 0, 0, SS_TAU); g.fill();
}

function ssBoneArch(g, x, y, s, th, r) {
  ssShadow(g, x, y, s * 0.42);
  const lw = Math.max(2, s * 0.08);
  ssBone(g, x - s * 0.34, y, x - s * 0.36, y - s * 0.95, x + s * 0.03, y - s * 0.92, lw);
  ssBone(g, x + s * 0.34, y, x + s * 0.36, y - s * 0.95, x - s * 0.03, y - s * 0.88, lw);
  g.fillStyle = '#5a9a3a';
  for (const [dx, dy] of [[-0.2, -0.86], [0.18, -0.84], [-0.3, -0.5], [0.31, -0.45]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, s * 0.08, s * 0.035, 0, 0, SS_TAU); g.fill();
  }
  for (let k = 0; k < 4; k++) ssHangVine(g, x - s * 0.18 + k * s * 0.12, y - s * 0.86, s * (0.18 + r() * 0.25), '#4a8a3a');
  g.strokeStyle = '#3a2a16'; g.lineWidth = Math.max(1, s * 0.04); g.lineCap = 'round';
  for (const o of [-1, 1]) {
    g.beginPath(); g.moveTo(x + o * s * 0.34, y); g.quadraticCurveTo(x + o * s * 0.48, y - s * 0.04, x + o * s * 0.56, y + s * 0.02); g.stroke();
  }
}

function ssCrownTower(g, x, y, s, th) {
  const [c1, c2] = th.wall, w = s * 0.16, h = s * 0.72;
  ssShadow(g, x, y, w * 1.6);
  ssLmTower(g, x, y, w, h, [c1, c2], null, 0, '#ffc84a');
  g.fillStyle = '#ffc84a'; ssArch(g, x, y - h * 0.75, w * 0.22, h * 0.12);
  ssCrown(g, x, y - h - s * 0.08, w * 0.85, s * 0.14);
}

function ssRuneGate(g, x, y, s, th, r, acc) {
  const [c1, c2] = th.wall, w = s * 0.36, h = s * 0.55;
  ssShadow(g, x, y, w * 1.1);
  g.fillStyle = ssShade(g, x - w, 0, x + w, 0, c1, c2);
  g.fillRect(x - w, y - h, w * 2, h);
  const m = w * 2 / 7;
  for (let i = 0; i < 7; i += 2) g.fillRect(x - w + i * m, y - h - m * 0.7, m, m * 0.7 + 0.5);
  g.fillStyle = '#26282e'; ssArch(g, x, y, w * 0.48, h * 0.66);
  g.strokeStyle = '#ffd84a'; g.lineWidth = Math.max(1, s * 0.03); g.lineCap = 'round';
  const ry = y - h * 0.84, rh = h * 0.12;
  g.beginPath(); g.moveTo(x - rh * 0.4, ry - rh); g.lineTo(x - rh * 0.4, ry + rh);
  g.moveTo(x - rh * 0.4, ry); g.lineTo(x + rh * 0.5, ry - rh); g.moveTo(x - rh * 0.4, ry); g.lineTo(x + rh * 0.5, ry + rh); g.stroke();
  acc.push({ type: 'glow', x, y: ry, s: s * 0.22, color: '#ffd84a' });
}

function ssBlossomTree(g, x, y, s, th, r) {
  ssShadow(g, x, y, s * 0.3);
  ssBloom(g, x, y, s, '#4a2e2a', ['#ffd0ea', '#d0609a'], ['#e0ff9a', '#6aa83a']);
}

// [draw, size multiplier]
const SS_PROPS = {
  pine: [ssPine, 1.15], crystal: [ssCrystal, 0.9], rock: [ssRock, 0.7], pool: [ssPool, 0.9],
  palm: [ssPalm, 1.2], domeHouse: [ssDomeHouse, 1.0], wall: [ssWallSeg, 0.8], pot: [ssPot, 0.55],
  roundTree: [ssRoundTree, 1.1], mushroom: [ssMushroom, 0.8], bigMushroom: [ssMushroom, 1.3],
  twisted: [ssTwisted, 1.1], column: [ssColumn, 1.0], cage: [ssCage, 0.95], topiary: [ssTopiary, 0.8],
  lamp: [ssLamp, 0.9], chimney: [ssChimney, 1.1], pipe: [ssPipe, 0.8], house: [ssHouse, 1.0],
  tower: [ssTower, 1.15], spire: [ssSpire, 1.1], vent: [ssVent, 0.7], hut: [ssHut, 0.9],
  vine: [ssVine, 0.9], fern: [ssFern, 0.7], trunk: [ssTrunk, 1.0], pebbles: [ssPebbles, 0.6],
  gear: [ssGearPost, 1.0],
  iceSpire: [ssIceSpire, 1.0], frozenPond: [ssFrozenPond, 0.95], minaret: [ssMinaret, 1.25], awning: [ssAwning, 0.95],
  brook: [ssBrook, 0.9], temple: [ssTempleRuin, 1.0], perch: [ssPerch, 0.95], clockCage: [ssClockCage, 0.95],
  fountain: [ssFountain, 0.8], telescope: [ssTelescope, 0.8], stair: [ssMarbleStair, 0.9], boiler: [ssBoiler, 0.9],
  mushHouse: [ssMushHouse, 1.1], curlVine: [ssCurlVine, 0.9], totem: [ssTotem, 0.9], wisp: [ssWisp, 1.0],
  ribs: [ssRibs, 1.0], boneArch: [ssBoneArch, 1.25], crownTower: [ssCrownTower, 1.15], runeGate: [ssRuneGate, 0.95],
  blossom: [ssBlossomTree, 1.1],
};

// ---- per-stage themes (from each stage's island art) -----------------
const SS_THEMES = {
  2: { // Glacial Peak — ice spires, snowy pines, frozen pool
    ground: ['#d6eaf5', '#9cc6de'], haze: '#eaf7ff', speck: ['#ffffff', '#6f9cbc'],
    road: ['#c4e8f8', '#8cc8e6'], roadEdge: '#5a94b8', pattern: 'cracks',
    pine: ['#3f6f5c', '#1d3f31'], snow: true,
    crystal: [['#e8f8ff', '#8fd0ee'], ['#cfeeff', '#6fb6e0']], twinkle: true,
    rock: ['#b8d4e4', '#6a8ea6'], rockCap: '#ffffff',
    water: ['#c8f0ff', '#7fc8ec'], poolRim: '#eef9ff', poolAccent: 'twinkle',
    wall: ['#e0f2fa', '#9cc8e0'], roof: ['#a8dcf4', '#5a9cc8'],
    landmark: ssLmIcePalace, lmFog: 0.7,
    props: [['pine', 3], ['crystal', 2.4], ['rock', 1.5], ['frozenPond', 0.6], ['iceSpire', 1.2], ['tower', 0.4]],
  },
  3: { // Oasis Citadel — palms, domed houses, sandstone walls, oasis pool
    ground: ['#f2d79a', '#d6a252'], haze: '#fff2cc', speck: ['#fff4d8', '#a8722e'],
    road: ['#ecd09a', '#c99a5a'], roadEdge: '#8a5e2a', pattern: 'tiles',
    house: ['#ecc07e', '#b0783a'], dome: ['#5ad0c8', '#1f8a86'], trim: '#ffd23d',
    wall: ['#e2b474', '#a8723a'],
    water: ['#5ad8e8', '#1f8aa8'], poolRim: '#c89858', poolAccent: 'twinkle',
    landmark: ssLmOasis,
    props: [['palm', 3], ['domeHouse', 1.2], ['wall', 1], ['pool', 0.5], ['pot', 0.8], ['minaret', 0.6], ['awning', 0.8]],
  },
  4: { // Crystallized Forest — crystal clusters, pebble path, mushrooms
    ground: ['#64b494', '#2c6a56'], haze: '#d0fff2', speck: ['#b0ffe4', '#1a443a'],
    road: ['#9a88b8', '#5e4e7a'], roadEdge: '#3a2e52', pattern: 'cobble',
    crystal: [['#e0b0ff', '#8a4ad8'], ['#b0fff0', '#2aa890'], ['#ffc0e0', '#d04a90']], twinkle: true,
    leaf: ['#2a7a54', '#7fd8a0'], cap: ['#e08aff', '#8a3ab0'], capGlow: '#e8a0ff',
    rock: ['#7aa898', '#3a5e52'], rockCap: 'rgba(110,200,140,0.7)',
    landmark: ssLmCrystalFalls,
    props: [['crystal', 3], ['roundTree', 1], ['mushroom', 1], ['pebbles', 0.6], ['brook', 1], ['rock', 0.6]],
  },
  5: { // Draconic Peaks — jagged spires, lava pools, smoking vents
    ground: ['#4e3430', '#1c1010'], haze: '#ff8a5a', speck: ['#ff6a2a', '#000000'],
    road: ['#30201c', '#140c0a'], roadEdge: '#ff6a2a', pattern: 'lavaCracks',
    rock: ['#5a4038', '#221410'],
    water: ['#ffd84a', '#ff4a1a'], poolRim: '#2a1612', poolAccent: 'glow', poolGlow: '#ff6a2a',
    landmark: ssLmVolcano, lmFog: 0.6,
    props: [['spire', 2.6], ['rock', 1.3], ['pool', 0.35], ['vent', 1], ['temple', 0.7]],
  },
  6: { // Gilded Aviary — brass birdcages, topiary, lamps, marble columns
    ground: ['#d4dcae', '#869868'], haze: '#fff8dc', speck: ['#ffffff', '#4e5e36'],
    road: ['#f4e8c8', '#cdb88a'], roadEdge: '#a08040', pattern: 'checker',
    stone: ['#fbf3dc', '#c8b48a'], lampPole: '#6a4a1a', lampLight: '#ffe08a',
    water: ['#9ae6ff', '#3a9ac8'], poolRim: '#e8dcbc',
    landmark: ssLmAviary,
    props: [['cage', 1.3], ['clockCage', 0.8], ['perch', 1.2], ['topiary', 1.5], ['lamp', 1], ['column', 0.6], ['fountain', 0.5]],
  },
  7: { // Abyssal Forest — twisted trees, violet crystals, glowing plants
    ground: ['#3e3062', '#1a1230'], haze: '#8a6aff', speck: ['#c9a6ff', '#0a0614'],
    road: ['#4e4074', '#2a2048'], roadEdge: '#9a7aff', pattern: 'cobble',
    trunk: '#2e1e42', leaf: ['#3a2a6a', '#8a6ad8'],
    crystal: [['#d8b8ff', '#7a4ad8'], ['#a8e8ff', '#3a8ad8']], twinkle: true,
    cap: ['#7fe8ff', '#2a8ab0'], capGlow: '#7fe8ff', stem: '#c8d8ff',
    rock: ['#4a3e6a', '#1e1834'], rockCap: 'rgba(90,180,110,0.7)',
    pebbles: ['#c8a0ff', '#7fd8c0', '#8ab0ff', '#a8e0a0'], lmFog: 0.5,
    landmark: ssLmAbyssFalls,
    props: [['twisted', 1.6], ['blossom', 1], ['crystal', 2], ['mushroom', 1.4], ['brook', 0.8], ['rock', 0.8]],
  },
  8: { // Aetherial Gardens — marble columns, star pools, blue trees, observatory
    ground: ['#d2d8f2', '#8c94c8'], haze: '#f0f2ff', speck: ['#ffffff', '#5a62a0'],
    road: ['#f6f6fc', '#c8cce6'], roadEdge: '#8a90c0', pattern: 'steps',
    stone: ['#ffffff', '#b8bedc'], leaf: ['#3a52b8', '#8aa8ff'], trunk: '#6a6a8a',
    water: ['#4a4eb0', '#1c1e5e'], poolRim: '#e8eaf8', poolAccent: 'twinkle', poolStars: true,
    house: ['#f0f2fc', '#b4bade'], dome: ['#8a9aee', '#4a5ab8'], trim: '#ffe08a',
    landmark: ssLmObservatory,
    props: [['column', 1.8], ['pool', 1], ['roundTree', 1.4], ['twisted', 0.6], ['stair', 0.7], ['telescope', 0.5], ['domeHouse', 0.3]],
  },
  9: { // Clockwork City — turning gears, smokestacks, brass pipes, brick houses
    ground: ['#8e6e48', '#4a3622'], haze: '#e8c088', speck: ['#d8a868', '#2a1e12'],
    road: ['#6e5e4e', '#3e342a'], roadEdge: '#c89048', pattern: 'plates', roadLine: 'rgba(20,12,4,0.35)',
    house: ['#9a5638', '#5a2c1a'], roof: ['#6aa08e', '#2e5a4e'], window: '#ffd27a',
    lampPole: '#2a2018', lampLight: '#ffc86a',
    landmark: ssLmClockwork,
    props: [['gear', 1.8], ['chimney', 1.2], ['pipe', 1.2], ['house', 1.2], ['lamp', 0.8], ['boiler', 1]],
  },
  10: { // Spectral Jungle — giant glowing mushrooms, huts, tentacle vines, ferns
    ground: ['#44305e', '#1e1432'], haze: '#b48aff', speck: ['#c8a6ff', '#0c0818'],
    road: ['#5e4c3c', '#382c20'], roadEdge: '#22180e', pattern: 'dirt',
    cap: ['#a878ff', '#5a2ab0'], capGlow: '#c8a0ff', stem: '#e0d8f0',
    hutRoof: ['#8a7040', '#4a3a1c'], vine: '#7a4ab0', fern: '#3e8a6e',
    curl: '#2fb8a8', wisp: '#7fe8ff', lmFog: 0.45,
    landmark: ssLmMushCanopy,
    props: [['bigMushroom', 2.2], ['mushHouse', 1], ['curlVine', 1.3], ['fern', 1.2], ['mushroom', 0.9], ['totem', 0.5], ['wisp', 0.8]],
  },
  11: { // Crown of the Mountain King — castle towers, battlements, pines, rocks
    ground: ['#90a676', '#4e6440'], haze: '#eef0f4', speck: ['#d0e0b8', '#26321e'],
    road: ['#b0b0b8', '#76767e'], roadEdge: '#4a4a52', pattern: 'cobble',
    wall: ['#b4b8c0', '#6e727c'], roof: ['#5a7ac8', '#2a3a7a'], flag: '#ffd23d',
    pine: ['#3a6a48', '#1e3e28'], rock: ['#a0a4ac', '#5a5e66'],
    landmark: ssLmFortress,
    props: [['tower', 1], ['crownTower', 0.5], ['runeGate', 0.4], ['wall', 1.2], ['pine', 1.8], ['rock', 1.6]],
  },
  12: { // The Deepwood — giant trunks, dark trees, ferns, mossy boulders
    ground: ['#46663a', '#162a14'], haze: '#a8e08a', speck: ['#8ad86a', '#081006'],
    road: ['#5e4a32', '#3a2c1c'], roadEdge: '#22180e', pattern: 'roots',
    leaf: ['#1e4a22', '#4e8a3e'], fern: '#5a9a44',
    rock: ['#5a6a4e', '#2a3424'], rockCap: 'rgba(110,190,80,0.75)',
    cap: ['#e8a84a', '#9a5a1a'],
    landmark: ssLmDragon, lmFog: 0.6,
    props: [['trunk', 1.6], ['roundTree', 1.2], ['fern', 1.6], ['rock', 1], ['mushroom', 0.6], ['ribs', 1], ['boneArch', 0.4]],
  },
};

// ---- road -------------------------------------------------------------
function ssRoadRows(n) {
  const hy = CONFIG.height * SS_HORIZON, H = CONFIG.height;
  const ys = [];
  for (let i = 0; i <= n; i++) ys.push(hy + (H - hy) * Math.pow(i / n, 1.45));
  return ys;
}
function ssRoadPoint(r) {
  const hy = CONFIG.height * SS_HORIZON, y = hy + Math.pow(r(), 1.2) * (CONFIG.height - hy);
  return [CONFIG.width / 2 + ssWiggle(y) + (r() * 2 - 1) * ssLaneHalf(y) * 0.9, y];
}

function ssRoadPattern(g, th, r) {
  const W = CONFIG.width, ys = ssRoadRows(22), line = th.roadLine || 'rgba(0,0,0,0.18)';
  switch (th.pattern) {
    case 'tiles': case 'plates': case 'checker': case 'steps':
      for (let i = 0; i < ys.length - 1; i++) {
        const y0 = ys[i], y1 = ys[i + 1], rh = y1 - y0, half = ssLaneHalf(y1), cx = W / 2 + ssWiggle(y1);
        if (th.pattern === 'steps') {
          g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx - half, y0, half * 2, Math.max(1, rh * 0.18));
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(cx - half, y1 - rh * 0.2, half * 2, rh * 0.2);
          continue;
        }
        const n = 4, tw = 2 * half / n, shift = th.pattern === 'tiles' && i % 2 ? tw / 2 : 0;
        for (let c = -1; c < n; c++) {
          const x0 = cx - half + c * tw + shift;
          if (th.pattern === 'checker' && (c + i) % 2 === 0) { g.fillStyle = 'rgba(120,90,40,0.12)'; g.fillRect(x0, y0, tw, rh); }
          g.strokeStyle = line; g.lineWidth = 1; g.strokeRect(x0, y0, tw, rh);
          if (th.pattern === 'plates') {
            g.fillStyle = 'rgba(255,220,160,0.5)';
            const rr = Math.max(0.7, rh * 0.06);
            for (const [px, py] of [[x0 + 3, y0 + 3], [x0 + tw - 3, y0 + 3], [x0 + 3, y1 - 3], [x0 + tw - 3, y1 - 3]]) {
              g.beginPath(); g.arc(px, py, rr, 0, SS_TAU); g.fill();
            }
          }
        }
      }
      break;
    case 'cobble':
      for (let i = 0; i < ys.length - 1; i++) {
        const y0 = ys[i], y1 = ys[i + 1], rh = y1 - y0, half = ssLaneHalf(y1), cx = W / 2 + ssWiggle(y1);
        const n = Math.max(3, Math.round(2 * half / (rh * 1.5))), cw = 2 * half / n;
        for (let c = 0; c < n + 1; c++) {
          const x = cx - half + (c + (i % 2) * 0.5) * cw;
          g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
          g.strokeStyle = line; g.lineWidth = 1;
          g.beginPath(); g.ellipse(x, (y0 + y1) / 2, cw * 0.44, rh * 0.42, 0, 0, SS_TAU); g.fill(); g.stroke();
        }
      }
      break;
    case 'cracks': case 'lavaCracks':
      for (let k = 0; k < 26; k++) {
        let [x, y] = ssRoadPoint(r);
        const d = ssDepth(y);
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 24 * (0.4 + d); y += (r() - 0.3) * 10 * (0.4 + d); g.lineTo(x, y); }
        if (th.pattern === 'lavaCracks') {
          g.strokeStyle = 'rgba(255,90,20,0.45)'; g.lineWidth = 2 + 3 * d; g.stroke();
          g.strokeStyle = '#ffc34a'; g.lineWidth = 0.6 + d; g.stroke();
        } else {
          g.strokeStyle = 'rgba(40,90,130,0.35)'; g.lineWidth = 0.6 + d; g.stroke();
        }
      }
      break;
    case 'dirt':
      for (let k = 0; k < 90; k++) {
        const [x, y] = ssRoadPoint(r), d = ssDepth(y);
        g.fillStyle = k % 2 ? 'rgba(0,0,0,0.15)' : 'rgba(255,230,190,0.12)';
        g.beginPath(); g.ellipse(x, y, 1 + 3 * d, 0.6 + 1.5 * d, 0, 0, SS_TAU); g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      for (const f of [-0.45, 0.45]) {
        g.lineWidth = 3;
        g.beginPath();
        for (const y of ys) g.lineTo(W / 2 + ssWiggle(y) + f * ssLaneHalf(y), y);
        g.stroke();
      }
      break;
    case 'roots':
      g.strokeStyle = '#3a2614'; g.lineCap = 'round';
      for (let k = 0; k < 11; k++) {
        const [x, y] = ssRoadPoint(r), d = ssDepth(y), half = ssLaneHalf(y), dir = r() < 0.5 ? -1 : 1;
        g.lineWidth = 1.5 + 4 * d;
        g.beginPath(); g.moveTo(x - dir * half, y - 4 * d);
        g.quadraticCurveTo(x, y + (r() - 0.5) * 16 * d, x + dir * half * 0.8, y + 6 * d);
        g.stroke();
      }
      break;
  }
}

function ssRoad(g, th, r) {
  const W = CONFIG.width, H = CONFIG.height, hy = H * SS_HORIZON;
  g.beginPath();
  for (let y = hy; y <= H; y += 8) g.lineTo(W / 2 - ssLaneHalf(y) + ssWiggle(y), y);
  for (let y = H; y >= hy; y -= 8) g.lineTo(W / 2 + ssLaneHalf(y) + ssWiggle(y), y);
  g.closePath();
  g.fillStyle = ssShade(g, 0, hy, 0, H, th.road[0], th.road[1]);
  g.fill();
  g.save(); g.clip();
  ssRoadPattern(g, th, r);
  g.restore();
  g.strokeStyle = th.roadEdge; g.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    g.beginPath();
    for (let y = hy; y <= H; y += 8) g.lineTo(W / 2 + side * ssLaneHalf(y) + ssWiggle(y), y);
    g.stroke();
  }
}

// ---- build the static set (once per stage / pixel scale) --------------
function ssBuild(stage, th, k) {
  const W = CONFIG.width, H = CONFIG.height, hy = H * SS_HORIZON;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const g = cv.getContext('2d');
  g.scale(k, k);
  const r = ssRng(stage * 9973 + 17), acc = [];

  // ground, with a soft far ridge where it meets the sky strip
  g.fillStyle = ssShade(g, 0, hy - 14, 0, H, th.ground[0], th.ground[1]);
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, hy);
  for (let x = 0; x <= W; x += 10) {
    g.lineTo(x, hy - 6 - Math.abs(Math.sin(x * 0.02 + stage)) * 9 - Math.abs(Math.sin(x * 0.051 + stage * 2)) * 4);
  }
  g.lineTo(W, H); g.closePath(); g.fill();
  const hz = g.createLinearGradient(0, hy - 16, 0, hy + 70);
  hz.addColorStop(0, th.haze + '99'); hz.addColorStop(1, th.haze + '00');
  g.fillStyle = hz; g.fillRect(0, hy - 16, W, 86);

  // ground texture
  for (let i = 0; i < 170; i++) {
    const y = hy + Math.pow(r(), 0.8) * (H - hy), d = ssDepth(y);
    g.fillStyle = th.speck[i % 2] + (i % 2 ? '55' : '66');
    g.beginPath(); g.ellipse(r() * W, y, (1 + 3.5 * d) * (0.6 + r()), (0.6 + 1.6 * d) * (0.6 + r()), 0, 0, SS_TAU); g.fill();
  }

  if (th.landmark) ssLandmark(g, stage, th, k, acc);
  // ssRoad removed: battlefield designed naturally with ground and objects
  // ssRoad(g, th, r);

  // props down both sides, painted far to near
  const bag = th.props.map(([name, wgt]) => [SS_PROPS[name], wgt]);
  const total = bag.reduce((a, b) => a + b[1], 0);
  const pick = () => { let v = r() * total; for (const [p, wgt] of bag) { v -= wgt; if (v <= 0) return p; } return bag[0][0]; };
  const props = [];
  for (const side of [-1, 1]) {
    let y = hy + 4 + r() * 6;
    while (y < H - 84) {
      const d = ssDepth(y), half = ssLaneHalf(y), count = W / 2 - half > 120 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        if (r() < 0.12) continue;
        const [fn, mult] = pick(), s = (16 + 56 * d) * (0.85 + r() * 0.3) * mult;
        const inner = half + 6 + s * 0.3, outer = W / 2 + 6;
        const off = inner + Math.max(0, outer - inner) * (count === 2 ? (c + r()) / 2 : r());
        props.push({ fn, x: W / 2 + side * off + ssWiggle(y), y: y + (r() - 0.5) * 6, s });
      }
      y += 10 + 34 * d + r() * 8;
    }
  }
  props.sort((a, b) => a.y - b.y);
  for (const p of props) { g.save(); p.fn(g, p.x, p.y, p.s, th, r, acc); g.restore(); }

  // darken the outer edges a touch so props sit back and the road reads
  for (const right of [false, true]) {
    const vg = g.createLinearGradient(right ? W : 0, 0, right ? W - 90 : 90, 0);
    vg.addColorStop(0, 'rgba(0,0,0,0.28)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vg; g.fillRect(right ? W - 90 : 0, hy - 20, 90, H);
  }
  acc.sort((a, b) => a.y - b.y);
  return { stage, k, canvas: cv, accents: acc };
}

// ---- live accents -----------------------------------------------------
function ssGearLive(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#c89048'; ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * SS_TAU, rr = (i % 4 === 1 || i % 4 === 2) ? r : r * 0.82;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.moveTo(r * 0.28, 0); ctx.arc(0, 0, r * 0.28, 0, SS_TAU, true);
  ctx.fill('evenodd'); ctx.stroke();
  ctx.fillStyle = '#7a5222';
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(r * 0.28, -r * 0.06, r * 0.45, r * 0.12); }
  ctx.restore();
}

function ssAccent(ctx, a, t) {
  switch (a.type) {
    case 'gear':
      if (a.alpha) { ctx.save(); ctx.globalAlpha = a.alpha; }
      ssGearLive(ctx, a.x, a.y, a.s * 0.32, t * 0.8 * a.dir);
      if (a.alpha) ctx.restore();
      break;
    case 'flap': { // parrot wing: folded, with an occasional burst of flapping
      const burst = Math.sin(t * 0.9 + a.x * 0.7) > 0.6;
      const ang = burst ? 1.95 - 3.1 * Math.abs(Math.sin(t * 15 + a.x)) : 1.95;
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(a.dir, 1); ctx.rotate(ang);
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.ellipse(a.s * 0.2, 0, a.s * 0.26, a.s * 0.1, 0, 0, SS_TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'shimmer': { // light streaks sliding down a waterfall
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const p = (t * 0.8 + k / 4 + a.x * 0.013) % 1, sx = a.x - a.w / 2 + a.w * (0.2 + 0.6 * ((k * 0.37) % 1));
        const y0 = a.y + p * a.h, y1 = Math.min(a.y + a.h, y0 + a.h * 0.2);
        ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y1); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'wisp': { // a drifting ghost light
      const wx = a.x + Math.cos(t * 1.1 + a.y) * a.s * 1.2, wy = a.y + Math.sin(t * 1.6 + a.x) * a.s * 1.4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3 + a.x);
      const gr = ctx.createRadialGradient(wx, wy, 0, wx, wy, a.s * 2.2);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, a.color); gr.addColorStop(1, a.color + '00');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(wx, wy, a.s * 2.2, 0, SS_TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'mist': { // a slow swirling mist ribbon
      const d = Math.sin(t * 0.35 + a.y) * 14;
      ctx.save();
      ctx.globalAlpha = 0.22; ctx.strokeStyle = a.color; ctx.lineWidth = a.s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x - a.w / 2 + d, a.y);
      ctx.bezierCurveTo(a.x - a.w / 4 + d, a.y - 14, a.x + d * 0.5, a.y + 12, a.x + a.w / 4 - d, a.y - 4);
      ctx.quadraticCurveTo(a.x + a.w * 0.4 - d, a.y - 12, a.x + a.w / 2 - d, a.y + 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'smoke':
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.35 + k / 3 + a.x * 0.01) % 1;
        ctx.fillStyle = a.color + (0.35 * (1 - p)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(a.x + Math.sin(p * 4 + a.x) * a.s * 0.1 + p * a.s * 0.15, a.y - p * a.s * 0.7, a.s * (0.06 + p * 0.14), 0, SS_TAU);
        ctx.fill();
      }
      break;
    case 'glow': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.35 + 0.25 * Math.sin(t * 2 + a.x * 0.1)) * (a.alpha || 1);
      const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.s);
      gr.addColorStop(0, a.color); gr.addColorStop(1, a.color + '00');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, SS_TAU); ctx.fill();
      ctx.restore();
      break;
    }
    case 'twinkle':
      ctx.fillStyle = a.color;
      for (let k = 0; k < 3; k++) {
        const p = Math.sin(t * 3 + k * 2.1 + a.x);
        if (p < 0.3) continue;
        const sx = a.x + Math.sin(k * 2.4 + a.y) * a.s * 0.45, sy = a.y + Math.cos(k * 1.7 + a.x) * a.s * 0.18;
        const rr = (p - 0.3) * Math.max(1.5, a.s * 0.06);
        ctx.beginPath();
        ctx.moveTo(sx, sy - rr * 2); ctx.quadraticCurveTo(sx, sy, sx + rr * 2, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + rr * 2); ctx.quadraticCurveTo(sx, sy, sx - rr * 2, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - rr * 2);
        ctx.fill();
      }
      break;
    case 'bird': {
      const hop = Math.abs(Math.sin(t * 3 + a.x)) * a.s * 0.05, by = a.y - hop, bs = a.s * 0.07;
      ctx.fillStyle = a.color;
      ctx.beginPath(); ctx.ellipse(a.x, by, bs * 1.2, bs, 0, 0, SS_TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(a.x + bs * 0.9, by - bs * 0.7, bs * 0.65, 0, SS_TAU); ctx.fill();
      ctx.fillStyle = '#ffb030';
      ctx.beginPath(); ctx.moveTo(a.x + bs * 1.5, by - bs * 0.8); ctx.lineTo(a.x + bs * 2.1, by - bs * 0.6); ctx.lineTo(a.x + bs * 1.5, by - bs * 0.45); ctx.fill();
      break;
    }
  }
}

let ssCache = null;

// Draws the stage's full-screen set. Returns false for stages without one
// (the underwater Stage 1 draws its own).
export function drawStageSet(ctx, def, t) {
  const th = SS_THEMES[def.stage];
  if (!th) return false;
  const k = ctx.getTransform().a;
  if (!ssCache || ssCache.stage !== def.stage || Math.abs(ssCache.k - k) > 0.01) ssCache = ssBuild(def.stage, th, k);
  ctx.drawImage(ssCache.canvas, 0, 0, CONFIG.width, CONFIG.height);
  if (CONFIG.quality.level > 0) for (const a of ssCache.accents) ssAccent(ctx, a, t);
  return true;
}
