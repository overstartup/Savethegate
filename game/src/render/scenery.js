// ============================================================
// Stage scenery — animated set-pieces that give every stage a sense of
// place, matched to its cast in render/species.js. Two layers:
//   drawSceneryFar(ctx, def, t)  — behind the hills/ground (big silhouettes)
//   drawSceneryNear(ctx, def, t) — in front of the ground, behind gameplay
// Kept translucent and in the upper/side areas so the lane stays readable.
// Stage is def.stage (1..12, matching STAGE_THEMES order in data/levels.js).
// Helpers prefixed `sc` (the standalone build shares one scope).
// ============================================================
import { CONFIG } from '../config.js';
import { drawGlow } from './creatures.js';

const SC_TAU = Math.PI * 2;
const scW = () => CONFIG.width;
const scH = () => CONFIG.height;

function scGear(ctx, x, y, r, teeth, rot, fill, alpha) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * SC_TAU;
    const rr = (i % 4 === 1 || i % 4 === 2) ? r : r * 0.84;
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.moveTo(r * 0.3, 0); ctx.arc(0, 0, r * 0.3, 0, SC_TAU, true);
  ctx.fill('evenodd');
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(r * 0.3, -r * 0.05, r * 0.5, r * 0.1); }
  ctx.restore();
}

// ---- 3 · Oasis Citadel: giant sun, distant pyramids, heat shimmer ------
function scDesertFar(ctx, t) {
  const W = scW(), H = scH();
  drawGlow(ctx, W * 0.72, H * 0.17, 90, '#ffd88a', 0.35);
  ctx.fillStyle = 'rgba(255,230,160,0.85)';
  ctx.beginPath(); ctx.arc(W * 0.72, H * 0.17, 34, 0, SC_TAU); ctx.fill();
  // pyramids, far to near
  for (const [x, base, s, a] of [[0.22, 0.47, 170, 0.5], [0.58, 0.46, 110, 0.4], [0.86, 0.48, 140, 0.55]]) {
    const px = x * W, py = base * H;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c89048';
    ctx.beginPath(); ctx.moveTo(px - s * 0.6, py); ctx.lineTo(px, py - s * 0.62); ctx.lineTo(px + s * 0.6, py); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a5a24';
    ctx.beginPath(); ctx.moveTo(px, py - s * 0.62); ctx.lineTo(px + s * 0.6, py); ctx.lineTo(px + s * 0.1, py); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe680';
    ctx.beginPath(); ctx.moveTo(px - s * 0.07, py - s * 0.53); ctx.lineTo(px, py - s * 0.62); ctx.lineTo(px + s * 0.07, py - s * 0.53); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function scDesertNear(ctx, t) {
  const W = scW(), H = scH();
  // heat shimmer bands rising off the dunes
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const y = H * 0.6 - ((t * 18 + i * 40) % 160);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 3 + i) * 3);
    for (let x = W; x >= 0; x -= 14) ctx.lineTo(x, y + 4 + Math.sin(x * 0.05 + t * 3 + i) * 3);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---- 5 · Draconic Peaks: erupting volcano, lava falls, ash ---------------
function scVolcanoFar(ctx, t) {
  const W = scW(), H = scH();
  const cx = W * 0.5, base = H * 0.6, top = H * 0.27;
  drawGlow(ctx, cx, top, 120, '#ff6a2a', 0.35 + 0.1 * Math.sin(t * 2));
  // mountain body
  const g = ctx.createLinearGradient(0, top, 0, base);
  g.addColorStop(0, '#4a1a12'); g.addColorStop(1, '#1a0806');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.62, base);
  ctx.quadraticCurveTo(cx - W * 0.2, top + 40, cx - 30, top);
  ctx.lineTo(cx + 30, top);
  ctx.quadraticCurveTo(cx + W * 0.2, top + 40, cx + W * 0.62, base);
  ctx.closePath(); ctx.fill();
  // lava falls down the flanks
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = k ? 'rgba(255,220,120,0.55)' : 'rgba(255,90,30,0.55)';
      ctx.lineWidth = k ? 2 : 6;
      ctx.beginPath();
      ctx.moveTo(cx + side * 18, top + 4);
      for (let i = 1; i <= 8; i++) {
        const y = top + i * ((base - top) / 8);
        ctx.lineTo(cx + side * (18 + i * 12) + Math.sin(i * 1.7 + side) * 8, y);
      }
      ctx.stroke();
    }
    // glowing droplets running down
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.25 + i / 3 + (side > 0 ? 0.5 : 0)) % 1;
      const y = top + p * (base - top);
      drawGlow(ctx, cx + side * (18 + p * 96), y, 8, '#ffb35c', 0.8);
    }
  }
  ctx.restore();
  // eruption: crater glow + lava bombs
  drawGlow(ctx, cx, top, 40, '#ffd88a', 0.8);
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.55 + i / 6) % 1;
    const vx = Math.sin(i * 2.3) * 60;
    const x = cx + vx * p, y = top - 150 * p + 210 * p * p;
    drawGlow(ctx, x, y, 7 - p * 3, '#ff8a3d', 1 - p * 0.6);
  }
  // smoke column
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.12 + i / 5) % 1;
    ctx.fillStyle = `rgba(40,30,30,${0.45 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(cx + Math.sin(i + t * 0.5) * 20 + p * 40, top - 20 - p * 150, 18 + p * 40, 0, SC_TAU); ctx.fill();
  }
}

// ---- 8 · Aetherial Gardens: ringed planet, moon, floating islands --------
function scAetherFar(ctx, t) {
  const W = scW(), H = scH();
  // ringed planet
  ctx.save(); ctx.translate(W * 0.78, H * 0.16);
  drawGlow(ctx, 0, 0, 70, '#9ab0ff', 0.3);
  const g = ctx.createRadialGradient(-12, -12, 4, 0, 0, 34);
  g.addColorStop(0, '#d8c8ff'); g.addColorStop(1, '#5a4aa8');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, SC_TAU); ctx.fill();
  ctx.rotate(-0.35);
  ctx.strokeStyle = 'rgba(220,210,255,0.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 58, 13, 0, 0, SC_TAU); ctx.stroke();
  ctx.restore();
  // crescent moon
  ctx.fillStyle = 'rgba(255,248,220,0.85)';
  ctx.beginPath(); ctx.arc(W * 0.16, H * 0.1, 18, 0, SC_TAU); ctx.arc(W * 0.16 + 8, H * 0.1 - 5, 15, 0, SC_TAU, true); ctx.fill();
  // floating islands bobbing
  for (const [x, y, s, ph] of [[0.2, 0.32, 1, 0], [0.7, 0.4, 0.75, 2], [0.45, 0.24, 0.55, 4]]) {
    const bx = x * W, by = y * H + Math.sin(t * 0.8 + ph) * 6;
    ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#3a3460';
    ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(50, 0); ctx.lineTo(18, 40); ctx.lineTo(0, 60); ctx.lineTo(-20, 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5ab87a';
    ctx.beginPath(); ctx.ellipse(0, 0, 52, 9, 0, 0, SC_TAU); ctx.fill();
    // little glowing tree
    ctx.fillStyle = '#2a2050'; ctx.fillRect(-2, -26, 4, 26);
    drawGlow(ctx, 0, -30, 16, '#c8a6ff', 0.8);
    // dripping light
    drawGlow(ctx, 0, 60 + ((t * 20 + ph * 10) % 40), 4, '#9ab0ff', 0.7);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---- 9 · Clockwork City: giant gears, clock tower, steam pipes -----------
function scClockFar(ctx, t) {
  const W = scW(), H = scH();
  // clock tower silhouette
  const tx = W * 0.5, base = H * 0.6;
  ctx.fillStyle = 'rgba(30,20,10,0.75)';
  ctx.fillRect(tx - 28, base - 230, 56, 230);
  ctx.beginPath(); ctx.moveTo(tx - 36, base - 230); ctx.lineTo(tx, base - 290); ctx.lineTo(tx + 36, base - 230); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,170,0.8)';
  ctx.beginPath(); ctx.arc(tx, base - 190, 20, 0, SC_TAU); ctx.fill();
  ctx.strokeStyle = '#3a2310'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tx, base - 190); ctx.lineTo(tx + Math.cos(t * 0.3) * 11, base - 190 + Math.sin(t * 0.3) * 11);
  ctx.moveTo(tx, base - 190); ctx.lineTo(tx + Math.cos(t * 2) * 16, base - 190 + Math.sin(t * 2) * 16); ctx.stroke();
  // giant meshing gears either side
  scGear(ctx, W * 0.08, H * 0.32, 70, 12, t * 0.3, '#5a3a18', 0.55);
  scGear(ctx, W * 0.25, H * 0.44, 40, 9, -t * 0.52, '#7a5222', 0.5);
  scGear(ctx, W * 0.94, H * 0.26, 60, 11, -t * 0.25, '#5a3a18', 0.55);
  scGear(ctx, W * 0.8, H * 0.4, 34, 8, t * 0.44, '#7a5222', 0.5);
}
function scClockNear(ctx, t) {
  const W = scW(), H = scH();
  // brass pipes along the edges, venting steam
  for (const side of [0, 1]) {
    const x = side ? W - 10 : 10;
    ctx.fillStyle = 'rgba(160,110,40,0.6)';
    ctx.fillRect(x - 6, H * 0.08, 12, H * 0.5);
    ctx.fillStyle = 'rgba(90,60,20,0.7)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 8, H * (0.12 + i * 0.12), 16, 6);
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3 + side * 0.5) % 1;
      ctx.fillStyle = `rgba(230,230,240,${0.35 * (1 - p)})`;
      ctx.beginPath(); ctx.arc(x + (side ? -1 : 1) * (8 + p * 30), H * 0.3 - p * 20, 6 + p * 14, 0, SC_TAU); ctx.fill();
    }
  }
}

// ---- 1 · Abyssal Rift (fully underwater): caustics, sunken wreck
function scSeaNear(ctx, t) {
  const W = scW(), H = scH();
  const wl = H * CONFIG.ship.waterLine;
  // caustic light ripples drifting through the water column
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,240,255,0.08)'; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = wl + 30 + i * 32;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 1.5 + i * 1.3) * 6);
    ctx.stroke();
  }
  ctx.restore();
  // sunken wreck resting on the seafloor (left)
  const bx = W * 0.2, by = H - 120;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.15);
  ctx.fillStyle = 'rgba(60,40,30,0.55)';
  ctx.beginPath(); ctx.moveTo(-55, 0); ctx.quadraticCurveTo(0, 26, 55, 0); ctx.lineTo(48, -16); ctx.lineTo(-50, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,30,0.55)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-5, -16); ctx.lineTo(10, -70); ctx.stroke();
  ctx.fillStyle = 'rgba(200,190,170,0.25)'; ctx.beginPath(); ctx.moveTo(10, -66); ctx.lineTo(36, -40); ctx.lineTo(8, -34); ctx.closePath(); ctx.fill();
  ctx.restore();
  // bubbles rising from the wreck
  for (let i = 0; i < 4; i++) { const p = (t * 0.4 + i / 4) % 1; drawGlow(ctx, bx + Math.sin(i * 2 + t) * 8, by - 20 - p * 160, 4, '#e8fbff', 0.6 * (1 - p)); }
}

// ---- 2 · Glacial Peak: jagged snow peaks far away, wind-blown snow plumes
function scGlacierFar(ctx, t) {
  const W = scW(), H = scH();
  for (const [base, col, amp, ph] of [[H * 0.42, 'rgba(160,200,230,0.45)', 120, 0], [H * 0.47, 'rgba(110,150,190,0.5)', 90, 2]]) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, base);
    for (let i = 0; i <= 8; i++) { const x = (i / 8) * W; ctx.lineTo(x, base - (i % 2 ? amp * (0.6 + 0.4 * Math.sin(i + ph)) : amp * 0.25)); }
    ctx.lineTo(W, base + 40); ctx.lineTo(0, base + 40); ctx.closePath(); ctx.fill();
    // snow caps
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 1; i <= 7; i += 2) {
      const x = (i / 8) * W, top = base - amp * (0.6 + 0.4 * Math.sin(i + ph));
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x - 18, top + 24); ctx.lineTo(x + 18, top + 24); ctx.closePath(); ctx.fill();
      // wind plume off the summit
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.ellipse(x + 30 + Math.sin(t + i) * 6, top + 6, 30, 5, 0, 0, SC_TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
    }
  }
}

// ---- 4 · Crystallized Forest: towering crystal spires pulsing with light
function scCrystalFar(ctx, t) {
  const W = scW(), H = scH();
  for (const [x, h, w, ph, col] of [[0.1, 230, 34, 0, '#5ce0c0'], [0.3, 160, 24, 1.5, '#c8a6ff'], [0.72, 200, 30, 3, '#5ce0c0'], [0.9, 260, 38, 4.5, '#9ae6ff'], [0.52, 120, 18, 2.2, '#c8fff2']]) {
    const bx = x * W, by = H * 0.56;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + ph);
    drawGlow(ctx, bx, by - h * 0.6, w * 2.2, col, 0.25 + pulse * 0.25);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(bx - w / 2, by); ctx.lineTo(bx - w * 0.35, by - h * 0.8); ctx.lineTo(bx, by - h); ctx.lineTo(bx + w * 0.35, by - h * 0.8); ctx.lineTo(bx + w / 2, by); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(bx - w * 0.15, by); ctx.lineTo(bx - w * 0.2, by - h * 0.78); ctx.lineTo(bx, by - h); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // light running up the spire
    const p = (t * 0.3 + ph) % 1;
    drawGlow(ctx, bx, by - p * h, 6, '#ffffff', 0.8 * (1 - p));
  }
}

// ---- 6 · Gilded Aviary: golden pillars, hanging birdcages, sunbeams -------
function scAviaryFar(ctx, t) {
  const W = scW(), H = scH();
  // sunbeams
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = W * (0.25 + i * 0.25) + Math.sin(t * 0.3 + i) * 15;
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, 'rgba(255,230,150,0.18)'); g.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x + 70, H * 0.6); ctx.lineTo(x - 30, H * 0.6); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // pillars
  for (const x of [0.06, 0.94]) {
    ctx.fillStyle = 'rgba(200,160,70,0.55)'; ctx.fillRect(x * W - 16, H * 0.05, 32, H * 0.55);
    ctx.fillStyle = 'rgba(255,220,140,0.6)'; ctx.fillRect(x * W - 22, H * 0.05, 44, 12); ctx.fillRect(x * W - 22, H * 0.58, 44, 12);
    ctx.fillStyle = 'rgba(140,100,30,0.4)'; for (let k = -1; k <= 1; k++) ctx.fillRect(x * W + k * 9 - 1.5, H * 0.08, 3, H * 0.5);
  }
  // swaying birdcages
  for (const [x, len, ph] of [[0.3, 90, 0], [0.62, 130, 2], [0.8, 70, 4]]) {
    const ax = x * W, sw = Math.sin(t * 0.9 + ph) * 0.12;
    ctx.save(); ctx.translate(ax, 0); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(200,160,70,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(0, len + 22, 18, Math.PI, 0); ctx.lineTo(18, len + 46); ctx.lineTo(-18, len + 46); ctx.closePath(); ctx.stroke();
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 7, len + 6 + Math.abs(k) * 2); ctx.lineTo(k * 7, len + 46); ctx.stroke(); }
    drawGlow(ctx, 0, len + 34, 10, '#ffe680', 0.6);
    ctx.restore();
  }
}

// ---- 7 · Abyssal Forest: twisted dead trees, hanging lanterns, mushrooms -
function scAbyssForestFar(ctx, t) {
  const W = scW(), H = scH();
  const branch = (x, y, a, len, w, depth) => {
    if (depth === 0 || len < 6) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    branch(x2, y2, a - 0.5, len * 0.7, w * 0.65, depth - 1);
    branch(x2, y2, a + 0.45, len * 0.65, w * 0.65, depth - 1);
  };
  ctx.strokeStyle = 'rgba(90,64,140,0.75)'; ctx.lineCap = 'round';
  for (const [x, h, s] of [[0.08, 0.58, 1], [0.92, 0.6, 1.1], [0.35, 0.56, 0.6]]) branch(x * W, h * H, -Math.PI / 2 + (x - 0.5) * 0.3, 90 * s, 12 * s, 5);
  // hanging lanterns
  for (const [x, y, ph] of [[0.15, 0.24, 0], [0.85, 0.2, 2], [0.38, 0.33, 4]]) {
    const sw = Math.sin(t * 1.2 + ph) * 6;
    ctx.strokeStyle = 'rgba(90,64,140,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x * W, y * H - 30); ctx.lineTo(x * W + sw, y * H); ctx.stroke();
    drawGlow(ctx, x * W + sw, y * H + 6, 20 + Math.sin(t * 4 + ph) * 3, '#c8a6ff', 0.7);
    ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fillRect(x * W + sw - 3, y * H, 6, 10);
  }
}
function scAbyssForestNear(ctx, t) {
  const W = scW(), H = scH();
  // glowing mushroom clusters along the edges
  for (const [x, y, s, ph] of [[0.05, 0.82, 1, 0], [0.12, 0.84, 0.7, 1], [0.93, 0.8, 1.1, 2], [0.86, 0.83, 0.6, 3]]) {
    const px = x * W, py = y * H;
    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + ph);
    drawGlow(ctx, px, py - 10 * s, 22 * s, '#9a6aff', 0.4 * pulse);
    ctx.fillStyle = 'rgba(230,220,255,0.6)'; ctx.fillRect(px - 2 * s, py - 12 * s, 4 * s, 12 * s);
    ctx.fillStyle = `rgba(180,120,255,${0.6 + pulse * 0.3})`;
    ctx.beginPath(); ctx.ellipse(px, py - 12 * s, 10 * s, 6 * s, 0, Math.PI, 0); ctx.fill();
  }
}

// ---- 10 · Spectral Jungle: ruined step temple, ghostly waterfall, vines --
function scJungleFar(ctx, t) {
  const W = scW(), H = scH();
  // step temple silhouette
  const cx = W * 0.5, base = H * 0.56;
  ctx.fillStyle = 'rgba(80,56,120,0.7)';
  for (let i = 0; i < 5; i++) { const w = 180 - i * 32, y = base - i * 26; ctx.fillRect(cx - w / 2, y - 26, w, 26); }
  ctx.fillRect(cx - 14, base - 156, 28, 26);
  drawGlow(ctx, cx, base - 143, 16, '#7affc8', 0.6 + 0.3 * Math.sin(t * 2));
  // ghostly waterfall (right): a glowing stream with falling droplets
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fx = W * 0.82, ftop = H * 0.12, fbot = H * 0.55;
  const fg = ctx.createLinearGradient(0, ftop, 0, fbot);
  fg.addColorStop(0, 'rgba(160,220,255,0.05)'); fg.addColorStop(0.5, 'rgba(160,220,255,0.22)'); fg.addColorStop(1, 'rgba(160,220,255,0.1)');
  ctx.fillStyle = fg;
  ctx.beginPath(); ctx.moveTo(fx - 10, ftop); ctx.lineTo(fx + 10, ftop); ctx.lineTo(fx + 18, fbot); ctx.lineTo(fx - 18, fbot); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 10; i++) {
    const p = (t * 0.7 + i / 10) % 1;
    drawGlow(ctx, fx + Math.sin(i * 2.7) * (8 + p * 8), ftop + p * (fbot - ftop), 3, '#e8fbff', 0.7);
  }
  drawGlow(ctx, fx, fbot, 40, '#9fe8ff', 0.35);
  ctx.restore();
}
function scJungleNear(ctx, t) {
  const W = scW(), H = scH();
  // hanging vines swaying from the top edge
  ctx.strokeStyle = 'rgba(60,140,80,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [x, len, ph] of [[0.04, 180, 0], [0.12, 110, 1], [0.88, 150, 2], [0.97, 220, 3]]) {
    ctx.beginPath(); ctx.moveTo(x * W, 0);
    for (let k = 1; k <= 6; k++) ctx.lineTo(x * W + Math.sin(t * 1.2 + ph + k * 0.6) * k * 2.5, (k / 6) * len);
    ctx.stroke();
    ctx.fillStyle = 'rgba(80,170,100,0.6)';
    for (let k = 1; k <= 5; k++) { ctx.beginPath(); ctx.ellipse(x * W + Math.sin(t * 1.2 + ph + k * 0.6) * k * 2.5 + 5, (k / 6) * len, 6, 3, 0.6, 0, SC_TAU); ctx.fill(); }
  }
}

// ---- 11 · Crown of the Mountain King: mountain range + hilltop castle ----
function scMountainFar(ctx, t) {
  const W = scW(), H = scH();
  ctx.fillStyle = 'rgba(90,92,110,0.55)';
  ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W * 0.15, H * 0.3); ctx.lineTo(W * 0.32, H * 0.42); ctx.lineTo(W * 0.5, H * 0.2); ctx.lineTo(W * 0.68, H * 0.4); ctx.lineTo(W * 0.85, H * 0.28); ctx.lineTo(W, H * 0.45); ctx.lineTo(W, H * 0.6); ctx.lineTo(0, H * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y] of [[0.15, 0.3], [0.5, 0.2], [0.85, 0.28]]) { ctx.beginPath(); ctx.moveTo(x * W, y * H); ctx.lineTo(x * W - 24, y * H + 30); ctx.lineTo(x * W + 24, y * H + 30); ctx.closePath(); ctx.fill(); }
  // castle on the central peak
  const cx = W * 0.5, cy = H * 0.24;
  ctx.fillStyle = 'rgba(50,50,62,0.85)';
  ctx.fillRect(cx - 30, cy - 10, 60, 24);
  for (const dx of [-30, -6, 18]) ctx.fillRect(cx + dx, cy - 34, 12, 26);
  for (const dx of [-30, -6, 18]) { ctx.beginPath(); ctx.moveTo(cx + dx - 2, cy - 34); ctx.lineTo(cx + dx + 6, cy - 46); ctx.lineTo(cx + dx + 14, cy - 34); ctx.closePath(); ctx.fill(); }
  for (const dx of [-24, 0, 24]) { ctx.fillStyle = 'rgba(255,210,120,0.8)'; ctx.fillRect(cx + dx - 2, cy - 4, 4, 6); }
  // fluttering banners
  for (const dx of [-24, 24]) {
    ctx.fillStyle = 'rgba(200,48,58,0.85)';
    ctx.beginPath(); ctx.moveTo(cx + dx, cy - 48); ctx.lineTo(cx + dx + 14 + Math.sin(t * 5 + dx) * 3, cy - 44); ctx.lineTo(cx + dx, cy - 40); ctx.closePath(); ctx.fill();
  }
}

// ---- 12 · The Deepwood: colossal trunks, light shafts, falling leaves -----
function scDeepwoodFar(ctx, t) {
  const W = scW(), H = scH();
  // light shafts
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = W * (0.2 + i * 0.2);
    const a = 0.05 + 0.04 * Math.sin(t * 0.7 + i);
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    g.addColorStop(0, `rgba(220,255,180,${a * 2})`); g.addColorStop(1, 'rgba(220,255,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 70, H * 0.65); ctx.lineTo(x + 20, H * 0.65); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // colossal trunks with roots
  for (const [x, w, a] of [[0.04, 70, 0.85], [0.96, 80, 0.85], [0.3, 30, 0.5], [0.75, 36, 0.55]]) {
    const px = x * W;
    ctx.fillStyle = `rgba(74,54,32,${a})`;
    ctx.fillRect(px - w / 2, 0, w, H * 0.6);
    ctx.beginPath(); ctx.moveTo(px - w / 2, H * 0.6); ctx.quadraticCurveTo(px - w, H * 0.6, px - w * 1.2, H * 0.64); ctx.lineTo(px + w * 1.2, H * 0.64); ctx.quadraticCurveTo(px + w, H * 0.6, px + w / 2, H * 0.6); ctx.closePath(); ctx.fill();
    // hanging moss
    ctx.strokeStyle = `rgba(90,140,60,${a * 0.8})`; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) { const mx = px - w / 2 + (k + 0.5) * (w / 4); ctx.beginPath(); ctx.moveTo(mx, H * 0.1); ctx.lineTo(mx + Math.sin(t + k) * 4, H * 0.1 + 40 + k * 8); ctx.stroke(); }
  }
}
function scDeepwoodNear(ctx, t) {
  const W = scW(), H = scH();
  // a few big leaves tumbling down
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.08 + i / 6) % 1;
    const x = (i * 71) % W + Math.sin(t * 1.5 + i) * 30, y = p * H * 0.9;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i);
    ctx.fillStyle = 'rgba(120,180,70,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.5, 0, 0, SC_TAU); ctx.fill();
    ctx.restore();
  }
}

// ----------------------------------------------------------- dispatch ----
const SC_FAR = { 2: scGlacierFar, 3: scDesertFar, 4: scCrystalFar, 5: scVolcanoFar, 6: scAviaryFar, 7: scAbyssForestFar, 8: scAetherFar, 9: scClockFar, 10: scJungleFar, 11: scMountainFar, 12: scDeepwoodFar };
const SC_NEAR = { 1: scSeaNear, 3: scDesertNear, 7: scAbyssForestNear, 9: scClockNear, 10: scJungleNear, 12: scDeepwoodNear };
// Stages whose scenery draws its own sun (skip the landmark's sun icon).
export const SCENERY_HAS_SUN = { 3: true };

export function drawSceneryFar(ctx, def, t) {
  const fn = SC_FAR[def.stage];
  if (fn) { ctx.save(); fn(ctx, t); ctx.restore(); }
}
export function drawSceneryNear(ctx, def, t) {
  if (CONFIG.quality.level < 2) return; // decorative only — first to go
  const fn = SC_NEAR[def.stage];
  if (fn) { ctx.save(); fn(ctx, t); ctx.restore(); }
}
