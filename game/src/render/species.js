// ============================================================
// Stage species — every stage dresses the six gameplay ROLES (runner =
// goblin, splitter = slime, flyer = imp, soldier = skeleton, brute = troll,
// boss = ogreBoss) as creatures that belong to its world. Gameplay stats
// stay with the role; this file only decides look, motion and name.
// Each stage picks its cast in data/levels.js (theme.cast).
//
// draw(ctx, m, pal, t, look) works in local coords (origin = body center,
// radius m.r) exactly like the base drawers in render/creatures.js, and can
// read m.anim (walk phase), m.action (dash/leap/slam…), m.windup (shot
// charge), m.fireFlash, m.enraged. `colors` gives the species its own
// palette instead of the stage tint.
// Helpers prefixed `sp` (the standalone build shares one scope).
// ============================================================
import { crShade, crGem, crEyes, crBlink, drawGlow, crMix } from './creatures.js';
import { tr } from '../i18n.js';

const SP_TAU = Math.PI * 2;

// ---------------------------------------------------------------- SEA ----

// Snapper — scuttling reef crab: wide shell, snapping claws, six legs.
function spCrab(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const scuttle = m.anim * (ph === 'burst' ? 5 : 3);
  // legs (3 per side), alternating gait
  ctx.strokeStyle = pal.shade;
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ph2 = Math.sin(scuttle + i * 2.1 + (side > 0 ? Math.PI : 0));
      const bx = side * r * 0.55, by = r * (0.05 + i * 0.18);
      const kx = side * r * (0.95 + i * 0.05), ky = by - r * 0.15 + ph2 * r * 0.06;
      const fx = side * r * (1.15 + i * 0.05), fy = by + r * 0.3 + ph2 * r * 0.1;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }
  }
  // claws — raised, snapping open/closed; wide open in the windup
  const snap = ph === 'windup' ? 1 : (Math.sin(t * 6 + m.seed) * 0.5 + 0.5) * 0.7;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.75, -r * 0.35);
    ctx.rotate(side * (0.5 + Math.sin(scuttle * 0.5) * 0.1));
    ctx.strokeStyle = pal.primary; ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.lineTo(side * r * 0.1, -r * 0.1); ctx.stroke();
    ctx.translate(side * r * 0.12, -r * 0.3);
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.22, 0, 0, SP_TAU); }, pal, r * 0.35);
    // pincer gap
    ctx.fillStyle = 'rgba(10,20,30,0.85)';
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.05); ctx.lineTo(side * r * 0.32, -r * 0.08 - snap * r * 0.14); ctx.lineTo(side * r * 0.32, -r * 0.02 + snap * r * 0.06); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // shell
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.1);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.55, 0, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.85, -r * 0.55, r * 0.9, r * 0.1);
    ctx.quadraticCurveTo(r * 0.5, r * 0.55, 0, r * 0.5);
    ctx.quadraticCurveTo(-r * 0.5, r * 0.55, -r * 0.9, r * 0.1);
    ctx.closePath();
  }, pal, r);
  // shell spots + barnacle
  ctx.fillStyle = pal.light;
  ctx.globalAlpha = A * 0.6;
  for (const [x, y, s] of [[-0.4, -0.25, 0.1], [0.35, -0.3, 0.08], [0.1, -0.05, 0.06]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SP_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  crGem(ctx, -r * 0.55, -r * 0.05, r * 0.07, r * 0.13, pal.glow, A);
  // eye stalks
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 3 + side + m.seed) * r * 0.05;
    ctx.strokeStyle = pal.shade; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(side * r * 0.2, -r * 0.5); ctx.lineTo(side * r * 0.25 + sway, -r * 0.82); ctx.stroke();
    crEyes(ctx, side * r * 0.25 + sway, -r * 0.86, r * 0.13, 0.0001, look, crBlink(m, t), '#1a1030', 0, pal.dark);
  }
  // mouth
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.18); ctx.quadraticCurveTo(0, r * (0.12 + (ph === 'windup' ? 0.1 : 0)), r * 0.15, r * 0.18); ctx.stroke();
}

// Glimmerjelly — translucent jellyfish: pulsing bell, frills, trailing
// tentacles that ripple behind it, bioluminescent spots.
function spJelly(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const pulse = Math.sin(t * 4 + m.seed);
  const squeeze = ph === 'windup' ? 0.25 : ph === 'burst' ? -0.15 : pulse * 0.08;
  // tentacles (behind)
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x0 = (-0.6 + i * 0.24) * r;
    ctx.strokeStyle = crMix(pal.glow, pal.primary, (i % 2) * 0.5);
    ctx.globalAlpha = A * 0.75;
    ctx.lineWidth = Math.max(1.2, r * (i % 2 ? 0.05 : 0.08));
    ctx.beginPath();
    ctx.moveTo(x0, r * 0.25);
    for (let k = 1; k <= 5; k++) {
      const y = r * 0.25 + k * r * 0.22;
      ctx.lineTo(x0 + Math.sin(t * 5 - k * 0.9 + i + m.seed) * r * 0.12 * k * 0.5, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = A;
  ctx.save();
  ctx.scale(1 + squeeze, 1 - squeeze);
  // bell
  ctx.globalAlpha = A * 0.88;
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.25);
    ctx.bezierCurveTo(-r * 0.95, -r * 0.75, r * 0.95, -r * 0.75, r * 0.9, r * 0.25);
    for (let i = 6; i >= 0; i--) {
      const x = -r * 0.9 + (i / 6) * r * 1.8;
      ctx.quadraticCurveTo(x + r * 0.15, r * 0.42, x, r * 0.25);
    }
    ctx.closePath();
  }, pal, r);
  ctx.globalAlpha = A;
  // glowing spots
  for (const [x, y] of [[-0.45, -0.1], [0, -0.35], [0.45, -0.1], [-0.2, 0.08], [0.25, 0.1]]) {
    drawGlow(ctx, x * r, y * r, r * 0.16, pal.glow, 0.5 + 0.3 * Math.sin(t * 3 + x * 7));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.18, r * 0.08, -0.5, 0, SP_TAU); ctx.fill();
  crEyes(ctx, 0, -r * 0.05, r * 0.16, r * 0.24, look, crBlink(m, t), '#1a1030', ph === 'windup' ? 1 : 0, pal.dark);
  ctx.restore();
}

// Drowned Corsair — skeleton pirate: tricorn hat, eyepatch, cutlass, a
// flintlock that flashes when it fires, seaweed draped on its bones.
function spPirate(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.8);
  const bone = '#e8e0cc', boneDark = '#9a9078';
  ctx.lineCap = 'round';
  // legs
  for (const side of [-1, 1]) {
    const sw = side * step * 0.5;
    ctx.strokeStyle = bone; ctx.lineWidth = Math.max(2, r * 0.1);
    const kx = side * r * 0.16 + Math.sin(sw) * r * 0.3, ky = r * 0.5 + Math.cos(sw) * r * 0.28;
    ctx.beginPath(); ctx.moveTo(side * r * 0.14, r * 0.42); ctx.lineTo(kx, ky); ctx.lineTo(kx, ky + r * 0.3); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(kx + side * r * 0.05, ky + r * 0.32, r * 0.13, r * 0.07, 0, 0, SP_TAU); ctx.fill();
  }
  // tattered coat
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.2); ctx.lineTo(r * 0.42, -r * 0.2);
    ctx.lineTo(r * 0.5, r * 0.5); ctx.lineTo(r * 0.25, r * 0.4); ctx.lineTo(r * 0.1, r * 0.55);
    ctx.lineTo(-r * 0.1, r * 0.42); ctx.lineTo(-r * 0.3, r * 0.56); ctx.lineTo(-r * 0.5, r * 0.45);
    ctx.closePath();
  }, { ...pal, light: '#5a7a9a', primary: '#2a4a6a', shade: '#122438', dark: '#08121e' }, r * 0.6);
  // ribs peeking through
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.4, r * 0.06);
  for (let i = 0; i < 3; i++) { const y = -r * 0.05 + i * r * 0.13; ctx.beginPath(); ctx.moveTo(-r * 0.18, y); ctx.quadraticCurveTo(0, y - r * 0.05, r * 0.18, y); ctx.stroke(); }
  // seaweed strands
  ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.2); ctx.quadraticCurveTo(-r * 0.5 + Math.sin(t * 3) * r * 0.1, r * 0.1, -r * 0.38, r * 0.4); ctx.stroke();
  // cutlass arm (left)
  ctx.save();
  ctx.translate(-r * 0.45, -r * 0.05);
  ctx.rotate(0.6 + step * 0.25);
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.6, r * 0.08);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.35); ctx.stroke();
  ctx.strokeStyle = '#d8dde8'; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.moveTo(0, r * 0.35); ctx.quadraticCurveTo(-r * 0.15, r * 0.7, r * 0.05, r * 0.95); ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.arc(0, r * 0.36, r * 0.06, 0, SP_TAU); ctx.fill();
  ctx.restore();
  // flintlock arm (right) — raised while aiming
  const aim = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  ctx.save();
  ctx.translate(r * 0.42, -r * 0.05);
  ctx.rotate(-0.2 - aim * 0.9 + Math.sin(-step) * 0.15);
  ctx.strokeStyle = bone; ctx.lineWidth = Math.max(1.6, r * 0.08);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.35); ctx.stroke();
  ctx.fillStyle = '#4a2e1a';
  ctx.beginPath(); ctx.roundRect(-r * 0.06, r * 0.3, r * 0.12, r * 0.4, 2); ctx.fill();
  if (m.fireFlash > 0) drawGlow(ctx, 0, r * 0.75, r * 0.3, '#ffd88a', 1);
  ctx.restore();
  // skull
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.33, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: bone, shade: boneDark, dark: '#3a3428' }, r * 0.4);
  ctx.fillStyle = '#1a120a';
  ctx.beginPath(); ctx.ellipse(r * 0.12, -r * 0.52, r * 0.09, r * 0.1, 0, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, r * 0.12, -r * 0.52, r * 0.14, pal.glow, 0.8);
  // eyepatch
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(-r * 0.13, -r * 0.52, r * 0.1, r * 0.09, 0, 0, SP_TAU); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.62); ctx.lineTo(r * 0.3, -r * 0.42); ctx.stroke();
  ctx.fillStyle = bone;
  ctx.beginPath(); ctx.roundRect(-r * 0.16, -r * 0.3, r * 0.32, r * 0.1, 2); ctx.fill();
  // tricorn hat
  ctx.fillStyle = '#1e1a2a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.68);
  ctx.quadraticCurveTo(0, -r * 0.6, r * 0.5, -r * 0.68);
  ctx.quadraticCurveTo(r * 0.3, -r * 1.15, 0, -r * 1.0);
  ctx.quadraticCurveTo(-r * 0.3, -r * 1.15, -r * 0.5, -r * 0.68);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#e8e0cc';
  ctx.beginPath(); ctx.arc(0, -r * 0.85, r * 0.07, 0, SP_TAU); ctx.fill();
}

// Krakoth — kraken boss: huge mantle, glowing eyes, beak, eight writhing
// suckered tentacles that rear up when it charges a volley.
function spKraken(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : pal.glow;
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  // tentacles
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const base = { x: side * r * (0.2 + k * 0.15), y: r * 0.35 };
    ctx.strokeStyle = crMix(pal.primary, pal.dark, 0.25);
    ctx.lineCap = 'round';
    let x = base.x, y = base.y;
    const segs = 8;
    for (let s = 0; s < segs; s++) {
      // fan outward (left tentacles lean left), curl at the tips, rear up
      // and outward while it charges a volley
      const fan = 0.25 + k * 0.32;
      const a = Math.PI / 2 - side * fan + side * s * 0.13 + Math.sin(t * 2.5 + i + s * 0.6) * 0.3 * (s / segs + 0.3) - side * heave * 0.9 * (s / segs);
      const len = r * 0.21;
      const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
      ctx.lineWidth = r * 0.18 * (1 - s / segs) + 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      if (s % 2 === 0) { ctx.fillStyle = pal.light; ctx.beginPath(); ctx.arc(nx, ny, r * 0.03 + 1, 0, SP_TAU); ctx.fill(); }
      x = nx; y = ny;
    }
  }
  // mantle
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, r * 0.4);
    ctx.bezierCurveTo(-r * 0.95, -r * 0.4, -r * 0.4, -r * 1.05, 0, -r * 1.0);
    ctx.bezierCurveTo(r * 0.4, -r * 1.05, r * 0.95, -r * 0.4, r * 0.75, r * 0.4);
    ctx.quadraticCurveTo(0, r * 0.6, -r * 0.75, r * 0.4);
    ctx.closePath();
  }, pal, r);
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.4;
  for (const [x, y, s] of [[-0.35, -0.55, 0.12], [0.3, -0.7, 0.09], [0.1, -0.35, 0.07], [-0.1, -0.8, 0.06]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SP_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  // eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(side * r * 0.32, -r * 0.05, r * 0.17, r * 0.14, 0, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.32, -r * 0.05, r * (0.15 + heave * 0.1), glow, 0.7);
    ctx.fillStyle = '#120a1e';
    ctx.beginPath(); ctx.ellipse(side * r * 0.32 + look.x * r * 0.05, -r * 0.05 + look.y * r * 0.04, r * 0.05, r * 0.11, 0, 0, SP_TAU); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.moveTo(side * r * 0.5, -r * 0.25); ctx.lineTo(side * r * 0.15, -r * 0.16); ctx.stroke();
  }
  // beak
  const open = heave * r * 0.1;
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.22); ctx.lineTo(0, r * 0.38 + open); ctx.lineTo(r * 0.12, r * 0.22); ctx.closePath(); ctx.fill();
  if (heave > 0.2) drawGlow(ctx, 0, r * 0.3, r * 0.2 * heave, glow, heave);
  crGem(ctx, 0, -r * 0.82, r * 0.1, r * 0.2, glow, A);
}

// ------------------------------------------------------------- GLACIER ----

function spFurBall(ctx, r, pal, seed, t) {
  // jagged fur outline
  ctx.beginPath();
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * SP_TAU;
    const rr = r * (i % 2 ? 0.86 : 0.98) * (1 + Math.sin(t * 4 + i + seed) * 0.02);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.92;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Frostling — fluffy snow imp with icicle horns and a blue face mask;
// bounds on stubby feet, ears of frost.
function spFrostling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * (ph === 'burst' ? 3.4 : 2.2));
  const bounce = Math.abs(Math.cos(m.anim * 2.2)) * r * 0.12;
  ctx.translate(0, -bounce);
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * step);
    ctx.fillStyle = '#7a9ab8';
    ctx.beginPath(); ctx.ellipse(side * r * 0.35, r * 0.78 - lift * r * 0.25 + bounce, r * 0.22, r * 0.13, 0, 0, SP_TAU); ctx.fill();
  }
  crShade(ctx, () => spFurBall(ctx, r * 0.88, pal, m.seed, t), { ...pal, light: '#ffffff', primary: '#e8f4ff', shade: '#9ab8d8' }, r);
  // icicle horns
  for (const side of [-1, 1]) crGem(ctx, side * r * 0.42, -r * 0.62, r * 0.1, r * 0.42, '#bfe8ff', A);
  // blue face mask
  ctx.fillStyle = '#5c9ad8';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.5, r * 0.4, 0, 0, SP_TAU); ctx.fill();
  crEyes(ctx, 0, -r * 0.12, r * 0.17, r * 0.22, look, crBlink(m, t), '#0a1a30', 1 + (ph === 'windup' ? 0.6 : 0), '#1c3a6a');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.12); ctx.lineTo(r * 0.15, r * 0.12); ctx.lineTo(0, r * (0.24 + (ph === 'windup' ? 0.08 : 0))); ctx.closePath(); ctx.fill();
  // little scarf
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath(); ctx.roundRect(-r * 0.45, r * 0.3, r * 0.9, r * 0.14, r * 0.06); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.38); ctx.lineTo(r * 0.55 + Math.sin(t * 8) * r * 0.08, r * 0.62); ctx.lineTo(r * 0.38, r * 0.62); ctx.closePath(); ctx.fill();
}

// Snowblob — rolling snowball critter: coal eyes, carrot nose, twig arms.
function spSnowblob(ctx, m, pal, t, look) {
  const r = m.r;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.6;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.25 - air * 0.1, 1 - coil * 0.25 + air * 0.15);
  ctx.translate(0, -r * 0.5);
  ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const w = Math.sin(t * 5 + side) * 0.3 + (coil ? -0.6 : 0);
    ctx.save(); ctx.translate(side * r * 0.8, 0); ctx.rotate(side * (0.5 + w));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * r * 0.45, -r * 0.1); ctx.moveTo(side * r * 0.3, -r * 0.06); ctx.lineTo(side * r * 0.4, -r * 0.25); ctx.stroke();
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.82, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#eef6ff', shade: '#a8c4e0' }, r);
  ctx.fillStyle = 'rgba(160,190,220,0.5)';
  for (const [x, y, s] of [[-0.5, 0.35, 0.12], [0.45, 0.4, 0.1], [0.2, -0.6, 0.08]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SP_TAU); ctx.fill(); }
  ctx.fillStyle = '#1a1a22';
  for (const side of [-1, 1]) {
    const bl = crBlink(m, t);
    ctx.beginPath(); ctx.ellipse(side * r * 0.25 + look.x * r * 0.04, -r * 0.2, r * 0.09, r * 0.09 * bl, 0, 0, SP_TAU); ctx.fill();
  }
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.02); ctx.lineTo(r * 0.06, -r * 0.02); ctx.lineTo(r * 0.02 + look.x * r * 0.05, r * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a1a22';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * r * 0.11, r * 0.38 - Math.abs(i) * r * -0.03, r * 0.035, 0, SP_TAU); ctx.fill(); }
}

// Frost Wraith — hooded hovering spirit trailing mist, ice-crystal staff,
// burning blue eyes deep in the hood. No legs: it glides.
function spWraith(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const hover = Math.sin(t * 2.5 + m.seed) * r * 0.08;
  ctx.translate(0, hover);
  // mist trail
  for (let i = 0; i < 4; i++) drawGlow(ctx, Math.sin(t * 3 + i) * r * 0.2, r * (0.6 + i * 0.25), r * (0.35 - i * 0.05), '#bfe8ff', 0.25);
  // cloak
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.bezierCurveTo(r * 0.55, -r * 0.9, r * 0.6, -r * 0.2, r * 0.55, r * 0.5);
    for (let i = 4; i >= 0; i--) {
      const x = -r * 0.55 + (i / 4) * r * 1.1;
      const y = r * (0.55 + (i % 2) * 0.22) + Math.sin(t * 5 + i + m.seed) * r * 0.06;
      ctx.lineTo(x, y);
    }
    ctx.bezierCurveTo(-r * 0.6, -r * 0.2, -r * 0.55, -r * 0.9, 0, -r * 0.95);
    ctx.closePath();
  }, { ...pal, light: '#9ac8f0', primary: '#3a6a9a', shade: '#16304e', dark: '#0a1626' }, r);
  // hood opening
  ctx.fillStyle = '#060c18';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.3, r * 0.32, 0, 0, SP_TAU); ctx.fill();
  const pulse = 0.6 + 0.4 * Math.sin(t * 4 + m.seed);
  for (const side of [-1, 1]) {
    drawGlow(ctx, side * r * 0.12, -r * 0.48, r * 0.22 * pulse + r * 0.1, '#7fd8ff', 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(side * r * 0.12, -r * 0.48, r * 0.035, 0, SP_TAU); ctx.fill();
  }
  // staff + crystal, raised when charging
  const raise = m.windup;
  ctx.strokeStyle = '#d8eaff'; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.55 - raise * r * 0.3); ctx.lineTo(r * 0.55, -r * 0.8 - raise * r * 0.3); ctx.stroke();
  crGem(ctx, r * 0.55, -r * 0.88 - raise * r * 0.3, r * 0.14, r * 0.3, '#bfe8ff', A);
  if (raise > 0) drawGlow(ctx, r * 0.55, -r * 0.95, r * 0.3 * raise, '#9fe8ff', raise);
  // pale hand
  ctx.fillStyle = '#cfe4f8';
  ctx.beginPath(); ctx.arc(r * 0.48, -r * 0.05 - raise * r * 0.3, r * 0.08, 0, SP_TAU); ctx.fill();
}

// Yeti — hulking white-furred brute with curled horns and an icicle club;
// beats its chest before the ground slam.
function spYeti(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.08);
  const fur = { ...pal, light: '#ffffff', primary: '#e4eef8', shade: '#98b0c8', dark: '#3a4a5c' };
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.42, r * 0.78 - (side * step > 0 ? step * side * r * 0.15 : 0), r * 0.26, r * 0.16, 0, 0, SP_TAU); }, fur, r * 0.35);
  // icicle club arm (right) — raised overhead for the slam
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  ctx.save();
  ctx.translate(r * 0.62, -r * 0.05);
  ctx.rotate(-0.45 - raise * 2.4 + step * 0.15);
  ctx.strokeStyle = '#d8e8f8'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.5); ctx.stroke();
  crGem(ctx, 0, r * 1.25, r * 0.22, r * 0.7, '#9fd8ff', A);
  ctx.restore();
  // body
  crShade(ctx, () => spFurBall(ctx, r * 0.92, fur, m.seed, t), fur, r);
  // other arm
  ctx.save(); ctx.translate(-r * 0.7, -r * 0.05); ctx.rotate(0.45 + step * 0.3 + (ph === 'windup' ? 0.8 : 0));
  ctx.strokeStyle = '#d8e8f8'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); ctx.stroke();
  ctx.fillStyle = '#5c7a9a'; ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.15, 0, SP_TAU); ctx.fill();
  ctx.restore();
  // horns
  ctx.strokeStyle = '#c8b898'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.3, -r * 0.6);
    ctx.quadraticCurveTo(side * r * 0.75, -r * 0.95, side * r * 0.72, -r * 0.55);
    ctx.stroke();
  }
  // blue face
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.42, r * 0.36, 0, 0, SP_TAU); }, { ...pal, light: '#9ac8f0', primary: '#5c8ac0', shade: '#2a4a70', dark: '#14243a' }, r * 0.45);
  const rage = ph === 'windup' ? 1 : m.windup;
  crEyes(ctx, 0, -r * 0.26, r * 0.12, r * 0.18, look, crBlink(m, t), '#0a1a30', 1.2 + rage, '#14243a');
  ctx.fillStyle = '#14243a';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.02, r * 0.18, r * (0.05 + rage * 0.08), 0, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.14, -r * 0.05); ctx.lineTo(side * r * 0.09, r * 0.08); ctx.lineTo(side * r * 0.04, -r * 0.05); ctx.closePath(); ctx.fill(); }
}

// Hrimfrost — frost giant boss: blue giant with an ice crown, braided
// frost beard, crystal pauldrons; breath of blizzard when it fires.
function spFrostGiant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#9fe8ff';
  const breathe = Math.sin(t * 2.2) * 0.04;
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  ctx.scale(1 + breathe, 1 - breathe);
  const skin = { ...pal, light: '#bfe0ff', primary: '#5c8ad0', shade: '#24447a', dark: '#0e1a34' };
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.85, r * 0.1); ctx.rotate(side * (0.3 + Math.sin(t * 2.4 + side) * 0.25));
    ctx.strokeStyle = skin.primary; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.4); ctx.stroke();
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.22, 0, SP_TAU); }, skin, r * 0.3);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.8, r * 0.7, 0, 0, SP_TAU); }, skin, r);
  // ice pauldrons
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) crGem(ctx, side * r * (0.55 + k * 0.1), -r * (0.35 - k * 0.05), r * 0.08, r * (0.3 - k * 0.06), '#d8f2ff', A);
  // frost beard
  // braided frost beard: tapered strands that sway, with an open maw
  const sway = Math.sin(t * 2) * r * 0.03;
  const beard = [[-0.48, 0.0], [-0.4, 0.42], [-0.24, 0.34], [-0.14, 0.78], [0, 0.56], [0.14, 0.78], [0.24, 0.34], [0.4, 0.42], [0.48, 0.0], [0.25, 0.2], [0, 0.16], [-0.25, 0.2]];
  crShade(ctx, () => {
    ctx.beginPath();
    beard.forEach(([x, y], i) => { const px = x * r + (y > 0.3 ? sway * y * 2 : 0), py = y * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.closePath();
  }, { ...pal, light: '#ffffff', primary: '#e4f2ff', shade: '#9ab8d8', dark: '#3a5a7a', rim: '#ffffff' }, r * 0.6);
  ctx.fillStyle = '#0e1a34';
  ctx.beginPath(); ctx.ellipse(0, r * 0.24, r * 0.16, r * (0.04 + heave * 0.08), 0, 0, SP_TAU); ctx.fill();
  // mouth glow while breathing out
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.25, r * 0.3 * heave, glow, heave);
  // eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#0a1226';
    ctx.beginPath(); ctx.ellipse(side * r * 0.25, -r * 0.12, r * 0.14, r * 0.1, side * 0.3, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.25, -r * 0.11, r * (0.12 + heave * 0.1), glow, 0.9);
    ctx.strokeStyle = '#eef8ff'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.45, -r * 0.3); ctx.lineTo(side * r * 0.1, -r * 0.2); ctx.stroke();
  }
  // ice crown
  for (let i = -3; i <= 3; i++) crGem(ctx, i * r * 0.14, -r * 0.55, r * 0.07, r * (0.3 + (3 - Math.abs(i)) * 0.09), glow, A);
}

// -------------------------------------------------------------- DESERT ----

// Scarab — armored dung beetle: domed iridescent shell split down the
// middle, horn, six skittering legs; its wing-cases flick open on a dash.
function spScarab(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 5 : 3);
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = Math.max(1.6, r * 0.08);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(run + i * 2.1 + (side > 0 ? Math.PI : 0)) * r * 0.1;
      const by = r * (-0.15 + i * 0.3);
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, by);
      ctx.lineTo(side * r * 0.85, by + w - r * 0.05);
      ctx.lineTo(side * r * 1.0, by + r * 0.2 + w);
      ctx.stroke();
    }
  }
  // head + horn
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.3, r * 0.22, 0, 0, SP_TAU); }, { ...pal, light: '#6a5a3a', primary: '#3a2e1a', shade: '#1a1208', dark: '#0a0604' }, r * 0.35);
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath(); ctx.moveTo(-r * 0.08, -r * 0.75); ctx.quadraticCurveTo(0, -r * 1.15, r * 0.12, -r * 1.0); ctx.lineTo(r * 0.06, -r * 0.75); ctx.closePath(); ctx.fill();
  // wing cases (flick open during a dash)
  const open = ph === 'burst' ? 0.5 : ph === 'windup' ? 0.15 : 0;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(0, -r * 0.45);
    ctx.rotate(side * open);
    crShade(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * r * 0.75, -r * 0.05, side * r * 0.6, r * 0.75);
      ctx.quadraticCurveTo(side * r * 0.25, r * 1.0, 0, r * 0.9);
      ctx.closePath();
    }, pal, r * 0.8);
    ctx.restore();
  }
  // iridescent sheen sweeping over the shell
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = A * 0.35;
  const sh = ((t * 0.6 + m.seed) % 2) - 0.5;
  const g = ctx.createLinearGradient(-r, sh * r * 2 - r, r, sh * r * 2 + r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, '#7fffd4'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.6, r * 0.5, 0, 0, SP_TAU); ctx.fill();
  ctx.restore();
  // gold sun emblem
  crGem(ctx, 0, r * 0.2, r * 0.12, r * 0.18, pal.glow, A);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(side * r * 0.14, -r * 0.66, r * 0.06, 0, SP_TAU); ctx.fill();
  }
}

// Dust Devil — a spinning funnel of sand with a grinning face in the
// swirl; whips faster before it leaps, sheds grit as it moves.
function spDustDevil(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const spin = t * (ph === 'windup' ? 22 : 10) + m.seed;
  // funnel bands
  for (let i = 0; i < 6; i++) {
    const y = -r * 0.7 + i * r * 0.28;
    const w = r * (1.0 - i * 0.13);
    const off = Math.sin(spin + i * 0.8) * r * 0.12;
    ctx.globalAlpha = A * (0.55 + 0.08 * i);
    ctx.fillStyle = crMix(pal.light, pal.shade, i / 6);
    ctx.beginPath(); ctx.ellipse(off, y, w, r * 0.16, 0, 0, SP_TAU); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.globalAlpha = A * 0.35; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(off, y, w * 0.85, r * 0.1, 0, Math.sin(spin + i) * 2, Math.sin(spin + i) * 2 + 2.5); ctx.stroke();
  }
  ctx.globalAlpha = A;
  // grit specks orbiting
  ctx.fillStyle = pal.light;
  for (let i = 0; i < 7; i++) {
    const a = spin * 0.8 + i * 0.9;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * (0.7 + (i % 3) * 0.15), -r * 0.4 + (i / 7) * r * 1.2 + Math.sin(a) * r * 0.08, r * 0.04 + 0.8, 0, SP_TAU); ctx.fill();
  }
  crEyes(ctx, 0, -r * 0.3, r * 0.15, r * 0.24, look, crBlink(m, t), '#2a1406', 1, pal.dark);
  ctx.strokeStyle = '#2a1406'; ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();
}

// Mummy — bandage-wrapped guardian: trailing wraps, one glowing eye
// through the gauze, golden collar, ankh staff that flares to shoot.
function spMummy(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const wrap = { ...pal, light: '#fff4dc', primary: '#e0cfa8', shade: '#9a8660', dark: '#3a2e1a' };
  // shuffling legs
  for (const side of [-1, 1]) {
    const sw = side * step * 0.35;
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.18 - r * 0.11 + Math.sin(sw) * r * 0.15, r * 0.35, r * 0.22, r * 0.5, r * 0.08); }, wrap, r * 0.4);
  }
  // body
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.42, -r * 0.35, r * 0.84, r * 0.8, r * 0.2); }, wrap, r * 0.8);
  // bandage lines
  ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) { const y = -r * 0.28 + i * r * 0.16; ctx.beginPath(); ctx.moveTo(-r * 0.42, y + r * 0.05); ctx.lineTo(r * 0.42, y - r * 0.04); ctx.stroke(); }
  // loose trailing wraps
  ctx.strokeStyle = wrap.primary; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.2); ctx.quadraticCurveTo(-r * 0.8, r * 0.5 + Math.sin(t * 4) * r * 0.1, -r * 0.7, r * 0.85); ctx.stroke();
  // golden collar + scarab gem
  ctx.fillStyle = '#e8b830';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.33, r * 0.45, r * 0.13, 0, 0, Math.PI); ctx.fill();
  crGem(ctx, 0, -r * 0.24, r * 0.08, r * 0.12, '#3ac8e8', A);
  // arms: one reaching forward, one holding the ankh
  ctx.save(); ctx.translate(-r * 0.45, -r * 0.2); ctx.rotate(1.1 + step * 0.15);
  ctx.strokeStyle = wrap.primary; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.45); ctx.stroke(); ctx.restore();
  const raise = m.windup;
  ctx.save(); ctx.translate(r * 0.48, -r * 0.15); ctx.rotate(-0.15 - raise * 0.5);
  ctx.strokeStyle = wrap.primary; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.3); ctx.stroke();
  ctx.strokeStyle = '#e8b830'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(0, r * 0.55); ctx.lineTo(0, -r * 0.55); ctx.moveTo(-r * 0.14, -r * 0.4); ctx.lineTo(r * 0.14, -r * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -r * 0.66, r * 0.09, r * 0.12, 0, 0, SP_TAU); ctx.stroke();
  if (raise > 0) drawGlow(ctx, 0, -r * 0.66, r * 0.35 * raise, '#ffd23d', raise);
  ctx.restore();
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.62, r * 0.3, 0, SP_TAU); }, wrap, r * 0.35);
  ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.28, -r * 0.76 + i * r * 0.13); ctx.lineTo(r * 0.28, -r * 0.7 + i * r * 0.13); ctx.stroke(); }
  ctx.fillStyle = '#1a1208';
  ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.62, r * 0.09, r * 0.05, 0, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, r * 0.1, -r * 0.62, r * 0.16, pal.glow, 0.9);
}

// Sethra — the sand sphinx boss: lion body, striped pharaoh headdress,
// gold-and-lapis collar, eyes and third-eye jewel blaze when it fires.
function spSphinx(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#ffd23d';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const body = { ...pal, light: '#ffe4a8', primary: '#d8a04c', shade: '#8a5a20', dark: '#3a2208' };
  // paws
  for (const side of [-1, 1]) {
    const reach = Math.sin(t * 2 + side) * r * 0.05;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.55, r * 0.7 + reach, r * 0.22, r * 0.14, 0, 0, SP_TAU); }, body, r * 0.3);
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.78, r * 0.55, 0, 0, SP_TAU); }, body, r);
  // nemes headdress (striped lappets behind the face)
  const nemes = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 0.85);
    ctx.quadraticCurveTo(0, -r * 1.05, r * 0.32, -r * 0.85);
    ctx.lineTo(r * 0.62, r * 0.15); ctx.lineTo(r * 0.3, r * 0.2); ctx.lineTo(r * 0.25, -r * 0.3);
    ctx.lineTo(-r * 0.25, -r * 0.3); ctx.lineTo(-r * 0.3, r * 0.2); ctx.lineTo(-r * 0.62, r * 0.15);
    ctx.closePath();
  };
  crShade(ctx, nemes, { ...pal, light: '#ffe680', primary: '#e8b830', shade: '#8a6410', dark: '#3a2a08' }, r);
  ctx.save(); nemes(); ctx.clip();
  ctx.fillStyle = '#2a4ab8';
  for (let i = 0; i < 9; i++) ctx.fillRect(-r, -r * 0.95 + i * r * 0.14, r * 2, r * 0.06);
  ctx.restore();
  // face
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.27, r * 0.33, 0, 0, SP_TAU); }, body, r * 0.4);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath(); ctx.ellipse(side * r * 0.11, -r * 0.48, r * 0.07, r * 0.045, 0, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.11, -r * 0.48, r * (0.09 + heave * 0.1), glow, 0.9);
    ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(side * r * 0.04, -r * 0.48); ctx.lineTo(side * r * 0.24, -r * 0.46); ctx.stroke();
  }
  ctx.fillStyle = '#3a2208';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.24, r * 0.1, r * (0.025 + heave * 0.05), 0, 0, SP_TAU); ctx.fill();
  // uraeus jewel on the brow
  crGem(ctx, 0, -r * 0.82, r * 0.08, r * 0.16, glow, A);
  if (heave > 0.1) drawGlow(ctx, 0, -r * 0.82, r * 0.4 * heave, glow, heave);
  // collar
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i % 2 ? '#2a4ab8' : '#e8b830'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * (0.32 + i * 0.07), 0.35, Math.PI - 0.35); ctx.stroke();
  }
}

// ------------------------------------------------------ CRYSTAL FOREST ----

// Shardfox — quick fox with a crystal-shard tail and ears; bounds low and
// pounces sideways on a dash.
function spShardfox(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.6 : 2.4);
  const bound = Math.abs(Math.sin(run)) * r * 0.12;
  ctx.translate(0, -bound);
  const fur = { ...pal, light: '#ffd8a8', primary: '#e8843c', shade: '#8a3e14', dark: '#2a1006' };
  // legs
  for (const [lx, ph2] of [[-0.35, 0], [0.35, Math.PI]]) {
    ctx.strokeStyle = fur.shade; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx * r, r * 0.35); ctx.lineTo(lx * r + Math.sin(run + ph2) * r * 0.15, r * 0.75 + bound); ctx.stroke();
  }
  // crystal tail
  ctx.save();
  ctx.translate(-r * 0.45, r * 0.2);
  ctx.rotate(-0.9 + Math.sin(t * 5 + m.seed) * 0.25);
  crGem(ctx, 0, -r * 0.35, r * 0.2, r * 0.6, pal.glow, A);
  crGem(ctx, r * 0.08, -r * 0.15, r * 0.13, r * 0.4, crMix(pal.glow, '#ffffff', 0.4), A);
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.55, r * 0.4, 0, 0, SP_TAU); }, fur, r * 0.7);
  // head
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.45);
    ctx.quadraticCurveTo(-r * 0.4, -r * 0.05, 0, r * 0.08);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.05, r * 0.42, -r * 0.45);
    ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.42, -r * 0.45);
    ctx.closePath();
  }, fur, r * 0.6);
  for (const side of [-1, 1]) crGem(ctx, side * r * 0.32, -r * 0.6, r * 0.1, r * 0.3, pal.glow, A);
  ctx.fillStyle = '#fff4e8';
  ctx.beginPath(); ctx.moveTo(-r * 0.22, -r * 0.18); ctx.quadraticCurveTo(0, r * 0.12, r * 0.22, -r * 0.18); ctx.quadraticCurveTo(0, -r * 0.05, -r * 0.22, -r * 0.18); ctx.fill();
  crEyes(ctx, 0, -r * 0.32, r * 0.11, r * 0.17, look, crBlink(m, t), '#1a0e04', 1, fur.dark);
  ctx.fillStyle = '#1a0e04'; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.05, 0, SP_TAU); ctx.fill();
}

// Mushling — walking crystal-capped mushroom; its cap glows and it
// spores when it lands; splits into sproutlings.
function spMushling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.5;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.2 - air * 0.08, 1 - coil * 0.22 + air * 0.12);
  ctx.translate(0, -r * 0.5);
  // stem
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.32, -r * 0.1, r * 0.64, r * 0.62, r * 0.2); }, { ...pal, light: '#fffaf0', primary: '#e8dcc8', shade: '#9a8a6a', dark: '#3a3020' }, r * 0.5);
  for (const side of [-1, 1]) { ctx.fillStyle = '#9a8a6a'; ctx.beginPath(); ctx.ellipse(side * r * 0.2, r * 0.55, r * 0.14, r * 0.08, 0, 0, SP_TAU); ctx.fill(); }
  crEyes(ctx, 0, r * 0.18, r * 0.12, r * 0.15, look, crBlink(m, t), '#1a1030', coil, '#3a3020');
  // cap
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.95, -r * 0.05); ctx.bezierCurveTo(-r * 0.9, -r * 0.95, r * 0.9, -r * 0.95, r * 0.95, -r * 0.05); ctx.quadraticCurveTo(0, r * 0.12, -r * 0.95, -r * 0.05); ctx.closePath(); }, pal, r);
  // crystal spots on the cap
  for (const [x, y, s] of [[-0.45, -0.35, 0.16], [0.1, -0.6, 0.2], [0.5, -0.3, 0.13]]) {
    crGem(ctx, x * r, y * r, s * r * 0.6, s * r, pal.glow, A);
    drawGlow(ctx, x * r, y * r - s * r * 0.3, s * r * 1.4, pal.glow, 0.35 + 0.2 * Math.sin(t * 3 + x * 9));
  }
}

// Glass Moth — fluttering crystal moth: stained-glass wings with eye-spots,
// feathery antennae, a glowing thorax; swoops in arcs.
function spMoth(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.abs(Math.sin(t * (fast ? 26 : 14) + m.seed));
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * (0.35 + flap * 0.65), 1);
    for (const [w, h, y, rot] of [[1.25, 0.85, -0.2, -0.35], [0.85, 0.6, 0.35, 0.4]]) {
      ctx.save(); ctx.translate(r * 0.15, y * r); ctx.rotate(rot);
      crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(r * w * 0.5, 0, r * w * 0.55, r * h * 0.45, 0, 0, SP_TAU); }, pal, r * 0.8);
      ctx.fillStyle = pal.glow; ctx.globalAlpha = A * 0.8;
      ctx.beginPath(); ctx.arc(r * w * 0.6, 0, r * h * 0.16, 0, SP_TAU); ctx.fill();
      ctx.fillStyle = pal.dark;
      ctx.beginPath(); ctx.arc(r * w * 0.6, 0, r * h * 0.07, 0, SP_TAU); ctx.fill();
      ctx.globalAlpha = A;
      ctx.restore();
    }
    ctx.restore();
  }
  // body + glowing thorax
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.16, r * 0.5, 0, 0, SP_TAU); }, { ...pal, primary: pal.shade }, r * 0.4);
  drawGlow(ctx, 0, -r * 0.05, r * 0.3, pal.glow, 0.6);
  // antennae
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.05, -r * 0.35);
    ctx.quadraticCurveTo(side * r * 0.3, -r * 0.8, side * r * 0.45, -r * 0.7 + Math.sin(t * 6 + side) * r * 0.05); ctx.stroke();
  }
  crEyes(ctx, 0, -r * 0.3, r * 0.1, r * 0.1, look, crBlink(m, t), '#1a1030', 0, pal.dark);
}

// Treant Sentinel — walking sapling-warrior: bark body with grain lines,
// leafy crystal crown, branch arms holding a thorn staff.
function spTreant(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const bark = { ...pal, light: '#a8845a', primary: '#6a4a2a', shade: '#3a2614', dark: '#1a1008' };
  // root legs
  for (const side of [-1, 1]) {
    ctx.strokeStyle = bark.primary; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    const sw = side * step * 0.3;
    ctx.beginPath(); ctx.moveTo(side * r * 0.2, r * 0.35); ctx.lineTo(side * r * 0.25 + Math.sin(sw) * r * 0.25, r * 0.85); ctx.lineTo(side * r * 0.45 + Math.sin(sw) * r * 0.25, r * 0.9); ctx.stroke();
  }
  // trunk
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.45); ctx.quadraticCurveTo(-r * 0.45, -r * 0.2, -r * 0.3, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.55); ctx.quadraticCurveTo(r * 0.45, -r * 0.2, r * 0.35, r * 0.45); ctx.closePath(); }, bark, r * 0.8);
  ctx.strokeStyle = 'rgba(20,10,4,0.45)'; ctx.lineWidth = 1.2;
  for (const x of [-0.15, 0.05, 0.2]) { ctx.beginPath(); ctx.moveTo(x * r, -r * 0.5); ctx.quadraticCurveTo(x * r + r * 0.06, 0, x * r - r * 0.03, r * 0.4); ctx.stroke(); }
  // face knot
  const pulse = 0.6 + 0.4 * Math.sin(t * 3 + m.seed);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#120a04'; ctx.beginPath(); ctx.ellipse(side * r * 0.13, -r * 0.25, r * 0.08, r * 0.06, 0, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.13, -r * 0.25, r * 0.12 * pulse + r * 0.04, pal.glow, 0.9);
  }
  ctx.strokeStyle = '#120a04'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.05); ctx.quadraticCurveTo(0, r * 0.02, r * 0.12, -r * 0.05); ctx.stroke();
  // branch arms + thorn staff
  const raise = m.windup;
  ctx.strokeStyle = bark.primary; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.25); ctx.quadraticCurveTo(-r * 0.7, -r * 0.1 + step * r * 0.1, -r * 0.65, r * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.25); ctx.lineTo(r * 0.6, -r * 0.05 - raise * r * 0.3); ctx.stroke();
  ctx.strokeStyle = '#4a3018'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(r * 0.62, r * 0.45 - raise * r * 0.3); ctx.lineTo(r * 0.62, -r * 0.85 - raise * r * 0.3); ctx.stroke();
  crGem(ctx, r * 0.62, -r * 0.92 - raise * r * 0.3, r * 0.12, r * 0.25, pal.glow, A);
  // leafy crystal crown
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.32;
    const x = Math.cos(a) * r * 0.45, y = -r * 0.6 + Math.sin(a) * r * 0.35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + Math.sin(t * 2 + i) * 0.08);
    ctx.fillStyle = i % 2 ? '#3ab86a' : '#2a8a4a';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.12, r * 0.12, r * 0.2, 0, 0, SP_TAU); ctx.fill();
    ctx.restore();
  }
  crGem(ctx, 0, -r * 0.92, r * 0.09, r * 0.2, pal.glow, A);
}

// Crystal Golem — rock brute studded with gem clusters; plates grind as it
// stomps, a huge crystal fist raised for the slam.
function spCrystalGolem(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.08);
  const rock = { ...pal, light: '#9aa0b0', primary: '#5c6070', shade: '#2e303c', dark: '#12131a' };
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.42 - r * 0.2, r * 0.55 - (side * step > 0 ? step * side * r * 0.15 : 0), r * 0.4, r * 0.3, r * 0.08); }, rock, r * 0.35);
  // crystal fist arm (raised for the slam)
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  ctx.save(); ctx.translate(r * 0.65, -r * 0.1); ctx.rotate(-0.45 - raise * 2.4 + step * 0.15);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.15, 0, r * 0.3, r * 0.6, r * 0.08); }, rock, r * 0.4);
  crGem(ctx, 0, r * 0.95, r * 0.28, r * 0.42, pal.glow, A);
  ctx.restore();
  // body: faceted boulder
  crShade(ctx, () => {
    ctx.beginPath();
    const pts = [[-0.8, 0.1], [-0.65, -0.5], [-0.2, -0.75], [0.35, -0.7], [0.8, -0.3], [0.78, 0.35], [0.3, 0.6], [-0.4, 0.62]];
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)));
    ctx.closePath();
  }, rock, r);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.75); ctx.lineTo(-r * 0.05, -r * 0.1); ctx.lineTo(-r * 0.4, r * 0.6); ctx.moveTo(-r * 0.05, -r * 0.1); ctx.lineTo(r * 0.78, r * 0.35); ctx.stroke();
  // gem clusters
  for (const [x, y, s, a] of [[-0.5, -0.55, 0.3, -0.4], [-0.3, -0.7, 0.4, -0.1], [0.4, -0.62, 0.32, 0.3], [0.62, 0.05, 0.22, 0.9]]) {
    ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(a); crGem(ctx, 0, 0, s * r * 0.35, s * r, pal.glow, A); ctx.restore();
  }
  // core face
  const rage = ph === 'windup' ? 1 : m.windup;
  for (const side of [-1, 1]) drawGlow(ctx, side * r * 0.2, -r * 0.15, r * (0.14 + rage * 0.08), pal.glow, 0.95);
  ctx.fillStyle = '#ffffff';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.2, -r * 0.15, r * 0.05, 0, SP_TAU); ctx.fill(); }
  ctx.fillStyle = pal.glow; ctx.globalAlpha = A * (0.5 + rage * 0.5);
  ctx.fillRect(-r * 0.18, r * 0.12, r * 0.36, r * (0.04 + rage * 0.05));
  ctx.globalAlpha = A;
}

// Elderglass — ancient treant boss: vast bark face in a crystal-leaf
// canopy, root arms, eyes and heart-crystal blaze when it fires.
function spElderTreant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : pal.glow;
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const bark = { ...pal, light: '#a8845a', primary: '#6a4a2a', shade: '#3a2614', dark: '#1a1008' };
  // canopy of crystal leaves
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    const rr = r * (0.95 + (i % 3) * 0.08);
    ctx.save(); ctx.translate(Math.cos(a) * rr, -r * 0.2 + Math.sin(a) * rr * 0.75); ctx.rotate(a + Math.PI / 2 + Math.sin(t * 1.5 + i) * 0.1);
    crGem(ctx, 0, 0, r * 0.14, r * 0.32, i % 2 ? pal.glow : crMix(pal.glow, '#3ab86a', 0.5), A);
    ctx.restore();
  }
  // root arms
  for (const side of [-1, 1]) {
    ctx.strokeStyle = bark.primary; ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.2;
    const sw = Math.sin(t * 1.8 + side) * 0.2;
    ctx.beginPath(); ctx.moveTo(side * r * 0.6, r * 0.1); ctx.quadraticCurveTo(side * r * (1.05 + sw), r * 0.35, side * r * 0.9, r * 0.85); ctx.stroke();
    ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(side * r * 0.9, r * 0.85); ctx.lineTo(side * r * 1.05, r * 1.0); ctx.moveTo(side * r * 0.9, r * 0.85); ctx.lineTo(side * r * 0.8, r * 1.02); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.72, r * 0.72, 0, 0, SP_TAU); }, bark, r);
  ctx.strokeStyle = 'rgba(20,10,4,0.45)'; ctx.lineWidth = 1.5;
  for (const x of [-0.45, -0.2, 0.25, 0.48]) { ctx.beginPath(); ctx.moveTo(x * r, -r * 0.45); ctx.quadraticCurveTo(x * r + r * 0.08, r * 0.2, x * r - r * 0.04, r * 0.8); ctx.stroke(); }
  // brows + eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#120a04';
    ctx.beginPath(); ctx.ellipse(side * r * 0.26, -r * 0.05, r * 0.15, r * 0.1, side * 0.2, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.26, -r * 0.05, r * (0.14 + heave * 0.12), glow, 0.95);
    ctx.strokeStyle = bark.shade; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.48, -r * 0.28); ctx.lineTo(side * r * 0.1, -r * 0.15); ctx.stroke();
  }
  // mouth hollow + heart crystal
  ctx.fillStyle = '#120a04';
  ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.25, r * (0.08 + heave * 0.12), 0, 0, SP_TAU); ctx.fill();
  crGem(ctx, 0, r * 0.4 + heave * r * 0.05, r * 0.09, r * 0.15, glow, A);
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.38, r * 0.35 * heave, glow, heave);
}

// ------------------------------------------------------------- DRACONIC ----

// Kobold — scrappy little lizard warrior: snout, frill, tail, and a spear
// it levels for the charge.
function spKobold(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.6 : 2.4);
  const step = Math.sin(run);
  const scale = { ...pal, light: '#ff9a6a', primary: '#c8482a', shade: '#6a1a0c', dark: '#2a0804' };
  // tail
  ctx.strokeStyle = scale.primary; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.35); ctx.quadraticCurveTo(-r * 0.9, r * 0.55, -r * 0.95 + Math.sin(t * 6 + m.seed) * r * 0.15, r * 0.15); ctx.stroke();
  // legs
  for (const side of [-1, 1]) {
    ctx.strokeStyle = scale.shade; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(side * r * 0.2, r * 0.4); ctx.lineTo(side * r * 0.25 + side * step * r * 0.12, r * 0.8); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.45, r * 0.45, 0, 0, SP_TAU); }, scale, r * 0.6);
  ctx.fillStyle = '#ffd8a0'; ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.25, r * 0.28, 0, 0, SP_TAU); ctx.fill();
  ctx.globalAlpha = A;
  // spear (levelled during the dash)
  const level = ph === 'windup' || ph === 'burst' ? 1 : 0;
  ctx.save(); ctx.translate(r * 0.4, r * 0.05); ctx.rotate(-0.25 + level * 1.2);
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(0, -r * 0.8); ctx.stroke();
  crGem(ctx, 0, -r * 0.88, r * 0.1, r * 0.22, '#d8dde8', A);
  ctx.restore();
  // head with snout + frill
  for (const side of [-1, 1]) crGem(ctx, side * r * 0.35, -r * 0.55, r * 0.1, r * 0.3, pal.glow, A);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.36, r * 0.3, 0, 0, SP_TAU); ctx.moveTo(r * 0.2, -r * 0.35); ctx.ellipse(0, -r * 0.22, r * 0.2, r * 0.14, 0, 0, SP_TAU); }, scale, r * 0.45);
  crEyes(ctx, 0, -r * 0.5, r * 0.11, r * 0.16, look, crBlink(m, t), '#2a0804', 1.2, scale.dark);
  ctx.fillStyle = '#2a0804';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.06, -r * 0.24, r * 0.025 + 0.5, 0, SP_TAU); ctx.fill(); }
}

// Magma Blob — molten blob under a cracked basalt crust: lava glows through
// the cracks, it smokes, and splatters fire when it lands.
function spMagma(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = (m.anim * 0.35) % 1;
  const air = ph === 'burst' ? 1 : Math.sin(hop * Math.PI) * 0.5;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.translate(0, r * 0.5);
  ctx.scale(1 + coil * 0.25 - air * 0.1, 1 - coil * 0.25 + air * 0.15);
  ctx.translate(0, -r * 0.5);
  drawGlow(ctx, 0, 0, r * 1.3, '#ff6a2a', 0.45);
  const blob = () => {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * SP_TAU;
      const wob = 1 + Math.sin(a * 4 + t * 5 + m.seed) * 0.05;
      let y = Math.sin(a) * r * 0.85 * wob;
      if (y > r * 0.5) y = r * 0.5 + (y - r * 0.5) * 0.3;
      const x = Math.cos(a) * r * 0.95 * wob;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  crShade(ctx, blob, { ...pal, light: '#ffe08a', primary: '#ff6a2a', shade: '#a01a08', dark: '#2a0604', rim: '#ffe08a' }, r);
  // basalt crust plates
  ctx.save(); blob(); ctx.clip();
  ctx.fillStyle = '#2a1a1a';
  for (const [x, y, w, h, a] of [[-0.45, -0.45, 0.35, 0.22, 0.3], [0.2, -0.6, 0.4, 0.2, -0.2], [0.5, -0.1, 0.25, 0.28, 0.5], [-0.6, 0.1, 0.22, 0.2, -0.4]]) {
    ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, w * r, h * r, 0, 0, SP_TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // smoke wisps
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.5 + i * 0.5 + m.seed) % 1;
    ctx.fillStyle = `rgba(80,70,70,${0.35 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(Math.sin(i * 3 + t) * r * 0.3, -r * 0.8 - p * r * 0.9, r * (0.12 + p * 0.2), 0, SP_TAU); ctx.fill();
  }
  crEyes(ctx, 0, -r * 0.05, r * 0.17, r * 0.27, look, crBlink(m, t), '#2a0604', 1, '#2a0604');
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.18, r * (0.05 + air * 0.08), 0, 0, SP_TAU); ctx.fill();
}

// Ember Knight — horned black-iron knight with a burning sword; flames lick
// off the helm crest and the blade flares before it throws fire.
function spEmberKnight(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.7);
  const iron = { ...pal, light: '#8a8a9a', primary: '#3a3a48', shade: '#1a1a22', dark: '#08080c', rim: '#ff8a3d' };
  for (const side of [-1, 1]) {
    const sw = side * step * 0.4;
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.2 - r * 0.12 + Math.sin(sw) * r * 0.2, r * 0.35, r * 0.24, r * 0.52, r * 0.06); }, iron, r * 0.4);
  }
  // cape
  ctx.fillStyle = '#8a1a1a';
  ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(r * 0.4, -r * 0.3); ctx.lineTo(r * 0.5 + Math.sin(t * 4) * r * 0.05, r * 0.7); ctx.lineTo(-r * 0.5 + Math.sin(t * 4 + 1) * r * 0.05, r * 0.7); ctx.closePath(); ctx.fill();
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.4, -r * 0.35, r * 0.8, r * 0.78, r * 0.15); }, iron, r * 0.8);
  crGem(ctx, 0, r * 0.05, r * 0.1, r * 0.16, '#ff8a3d', A);
  // shield (left)
  ctx.save(); ctx.translate(-r * 0.5, r * 0.05);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.3); ctx.lineTo(r * 0.25, -r * 0.3); ctx.lineTo(r * 0.2, r * 0.15); ctx.lineTo(0, r * 0.38); ctx.lineTo(-r * 0.2, r * 0.15); ctx.closePath(); }, { ...iron, primary: '#6a1a1a', light: '#c84a3a' }, r * 0.4);
  ctx.restore();
  // flaming sword (right)
  const raise = m.windup;
  ctx.save(); ctx.translate(r * 0.5, -r * 0.05); ctx.rotate(-0.3 - raise * 0.9);
  ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.moveTo(0, r * 0.15); ctx.lineTo(0, -r * 0.85); ctx.stroke();
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.12); ctx.lineTo(r * 0.15, r * 0.12); ctx.stroke();
  for (let i = 0; i < 4; i++) drawGlow(ctx, Math.sin(t * 12 + i) * r * 0.05, -r * (0.2 + i * 0.18), r * (0.16 + raise * 0.12), '#ff6a2a', 0.6 + raise * 0.3);
  ctx.restore();
  // horned helm with visor glow + flame crest
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.3, 0, SP_TAU); }, iron, r * 0.35);
  ctx.fillStyle = '#c8b898';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.22, -r * 0.7); ctx.quadraticCurveTo(side * r * 0.55, -r * 0.85, side * r * 0.5, -r * 1.05); ctx.lineTo(side * r * 0.3, -r * 0.78); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#08080c'; ctx.fillRect(-r * 0.2, -r * 0.6, r * 0.4, r * 0.08);
  drawGlow(ctx, 0, -r * 0.56, r * 0.2, '#ff6a2a', 0.9);
  for (let i = 0; i < 3; i++) drawGlow(ctx, Math.sin(t * 9 + i * 2) * r * 0.06, -r * (0.88 + i * 0.12), r * (0.12 - i * 0.025), '#ffb35c', 0.8);
}

// Drake — wingless young dragon brute on four legs: horned head, spined
// back, tail; rears and its throat glows before the slam.
function spDrake(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.4);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const hide = { ...pal, light: '#ff8a5a', primary: '#b8341a', shade: '#5a1006', dark: '#1a0402' };
  ctx.translate(0, Math.abs(step) * r * 0.06 - rear * r * 0.15);
  // tail
  ctx.strokeStyle = hide.primary; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.22;
  ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.quadraticCurveTo(-r * 0.6, r * 0.9, -r * 1.0 + Math.sin(t * 3) * r * 0.1, r * 0.6); ctx.stroke();
  crGem(ctx, -r * 1.0 + Math.sin(t * 3) * r * 0.1, r * 0.55, r * 0.1, r * 0.2, '#ffb35c', A);
  // four legs
  for (const [x, ph2] of [[-0.55, 0], [-0.2, Math.PI], [0.2, 0], [0.55, Math.PI]]) {
    ctx.strokeStyle = hide.shade; ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.moveTo(x * r, r * 0.3); ctx.lineTo(x * r + Math.sin(m.anim * 1.4 + ph2) * r * 0.1, r * 0.82); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.82, r * 0.5, 0, 0, SP_TAU); }, hide, r);
  ctx.fillStyle = '#ffc890'; ctx.globalAlpha = A * 0.55;
  ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.55, r * 0.18, 0, 0, SP_TAU); ctx.fill(); ctx.globalAlpha = A;
  // back spines
  for (let i = -3; i <= 3; i++) crGem(ctx, i * r * 0.2, -r * 0.3 + Math.abs(i) * r * 0.04, r * 0.08, r * 0.24, '#3a0a04', A);
  // head
  const heat = Math.max(rear, m.windup);
  ctx.save(); ctx.translate(0, -r * 0.4 - rear * r * 0.15);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.42, r * 0.36, 0, 0, SP_TAU); }, hide, r * 0.5);
  for (const side of [-1, 1]) { ctx.fillStyle = '#e8d8b8'; ctx.beginPath(); ctx.moveTo(side * r * 0.25, -r * 0.2); ctx.quadraticCurveTo(side * r * 0.6, -r * 0.45, side * r * 0.55, -r * 0.7); ctx.lineTo(side * r * 0.38, -r * 0.3); ctx.closePath(); ctx.fill(); }
  crEyes(ctx, 0, -r * 0.08, r * 0.1, r * 0.17, look, crBlink(m, t), '#ffb35c', 1.5, hide.dark);
  ctx.fillStyle = '#1a0402';
  ctx.beginPath(); ctx.ellipse(0, r * 0.17, r * 0.22, r * (0.05 + heat * 0.07), 0, 0, SP_TAU); ctx.fill();
  if (heat > 0.1) drawGlow(ctx, 0, r * 0.17, r * 0.3 * heat, '#ff6a2a', heat);
  ctx.restore();
}

// Ignarax — elder dragon boss: great horned head with a spiked frill,
// beating wings, molten throat that blazes before each volley.
function spDragon(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3344' : '#ffb35c';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const hide = { ...pal, light: '#ff8a5a', primary: '#a82a14', shade: '#4a0c04', dark: '#160302' };
  const flap = Math.sin(t * 3);
  // wings
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.35, -r * 0.2); ctx.rotate(-0.3 + flap * 0.25);
    ctx.fillStyle = '#6a1408';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(r * 1.3, -r * 0.6); ctx.lineTo(r * 1.15, r * 0.05);
    ctx.lineTo(r * 0.9, -r * 0.1); ctx.lineTo(r * 0.8, r * 0.35); ctx.lineTo(r * 0.55, r * 0.15); ctx.lineTo(r * 0.35, r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a0604'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.3, -r * 0.6); ctx.moveTo(r * 0.2, 0); ctx.lineTo(r * 0.9, -r * 0.1); ctx.moveTo(r * 0.15, r * 0.1); ctx.lineTo(r * 0.55, r * 0.15); ctx.stroke();
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.6, r * 0.5, 0, 0, SP_TAU); }, hide, r * 0.8);
  // spiked frill
  for (let i = -4; i <= 4; i++) {
    const a = -Math.PI / 2 + i * 0.28;
    ctx.save(); ctx.translate(Math.cos(a) * r * 0.5, -r * 0.15 + Math.sin(a) * r * 0.5); ctx.rotate(a + Math.PI / 2);
    crGem(ctx, 0, 0, r * 0.07, r * 0.25, i % 2 ? '#3a0a04' : glow, A);
    ctx.restore();
  }
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.5, r * 0.42, 0, 0, SP_TAU); }, hide, r * 0.6);
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#e8d8b8';
    ctx.beginPath(); ctx.moveTo(side * r * 0.3, -r * 0.35); ctx.quadraticCurveTo(side * r * 0.85, -r * 0.6, side * r * 0.75, -r * 1.05); ctx.lineTo(side * r * 0.45, -r * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#160302';
    ctx.beginPath(); ctx.ellipse(side * r * 0.2, -r * 0.18, r * 0.12, r * 0.07, side * 0.35, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.2, -r * 0.18, r * (0.12 + heave * 0.1), glow, 0.95);
  }
  // long muzzle tapering down, nostrils, fanged jaw that drops open
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 0.02);
    ctx.quadraticCurveTo(-r * 0.22, r * 0.32, 0, r * 0.38);
    ctx.quadraticCurveTo(r * 0.22, r * 0.32, r * 0.26, -r * 0.02);
    ctx.closePath();
  }, hide, r * 0.4);
  ctx.fillStyle = '#160302';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.07, r * 0.28, r * 0.03, r * 0.05, side * 0.4, 0, SP_TAU); ctx.fill(); }
  const jaw = heave * r * 0.12;
  ctx.beginPath(); ctx.moveTo(-r * 0.18, r * 0.18); ctx.quadraticCurveTo(0, r * 0.3 + jaw, r * 0.18, r * 0.18); ctx.lineTo(r * 0.14, r * 0.2 + jaw * 0.6); ctx.quadraticCurveTo(0, r * 0.36 + jaw, -r * 0.14, r * 0.2 + jaw * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff4e0';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.19); ctx.lineTo(side * r * 0.08, r * 0.28 + jaw * 0.5); ctx.lineTo(side * r * 0.04, r * 0.21); ctx.closePath(); ctx.fill(); }
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.28, r * 0.45 * heave, glow, heave);
  for (const side of [-1, 1]) {
    const p = (t * 0.8 + side * 0.3) % 1;
    ctx.fillStyle = `rgba(90,80,80,${0.4 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(side * r * 0.1, r * 0.02 - p * r * 0.5, r * (0.05 + p * 0.1), 0, SP_TAU); ctx.fill();
  }
}

// --------------------------------------------------------------- AVIARY ----

// Gilded Finch — round golden bird that hops and flutters; tail feathers
// fan when it dashes.
function spFinch(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const hop = Math.abs(Math.sin(m.anim * 2.4)) * r * 0.14;
  ctx.translate(0, -hop);
  const gold = { ...pal, light: '#fff0b0', primary: '#f0b830', shade: '#9a6410', dark: '#3a2404' };
  // tail fan
  for (let i = -2; i <= 2; i++) {
    ctx.save(); ctx.translate(0, r * 0.45); ctx.rotate(Math.PI + i * (ph === 'burst' ? 0.32 : 0.18));
    ctx.fillStyle = i % 2 ? '#e8603c' : gold.shade;
    ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.1, r * 0.35, 0, 0, SP_TAU); ctx.fill(); ctx.restore();
  }
  for (const side of [-1, 1]) { ctx.strokeStyle = '#e8803c'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(side * r * 0.2, r * 0.6); ctx.lineTo(side * r * 0.25, r * 0.85 + hop); ctx.stroke(); }
  // wings flutter
  const flap = Math.sin(t * (ph === 'burst' ? 30 : 10) + m.seed);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.6, 0); ctx.rotate(side * (0.4 + flap * 0.4));
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.15, 0, r * 0.32, r * 0.18, 0, 0, SP_TAU); }, gold, r * 0.4);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, SP_TAU); }, gold, r * 0.8);
  ctx.fillStyle = '#fff4d8'; ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.35, r * 0.32, 0, 0, SP_TAU); ctx.fill();
  // crest
  for (const dx of [-0.08, 0.04, 0.16]) { ctx.fillStyle = '#e8603c'; ctx.beginPath(); ctx.ellipse(dx * r, -r * 0.7, r * 0.06, r * 0.18, dx * 3, 0, SP_TAU); ctx.fill(); }
  crEyes(ctx, 0, -r * 0.18, r * 0.14, r * 0.22, look, crBlink(m, t), '#1a1030', 1, gold.dark);
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.0); ctx.lineTo(r * 0.1, r * 0.0); ctx.lineTo(0, r * 0.18); ctx.closePath(); ctx.fill();
}

// Golden Egg — hopping jeweled egg that wobbles, cracks when hurt and
// hatches into chicks (its splitter children).
function spEgg(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const wob = Math.sin(t * 6 + m.seed) * (ph === 'windup' ? 0.35 : 0.12);
  ctx.rotate(wob);
  const shell = { ...pal, light: '#ffffff', primary: '#f8e0a0', shade: '#b89040', dark: '#4a3410' };
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.92, 0, 0, SP_TAU); }, shell, r);
  // jewel band
  ctx.fillStyle = '#2a4ab8'; ctx.fillRect(-r * 0.7, -r * 0.05, r * 1.4, r * 0.14);
  for (const x of [-0.45, 0, 0.45]) crGem(ctx, x * r, r * 0.05, r * 0.07, r * 0.12, x ? '#ff5c7a' : '#58e07f', A);
  // crack grows as hp drops
  const dmg = 1 - Math.max(0, m.hp) / Math.max(1, m.maxHp);
  if (dmg > 0.05) {
    ctx.strokeStyle = shell.dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.4); ctx.lineTo(-r * 0.2, -r * 0.25); ctx.lineTo(0, -r * 0.45); ctx.lineTo(r * 0.2 * dmg * 2, -r * 0.28); ctx.stroke();
  }
  // peeking eyes through a slit
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(-r * 0.32, -r * 0.42, r * 0.64, r * 0.16);
  for (const side of [-1, 1]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * r * 0.14 + look.x * r * 0.04, -r * 0.34, r * 0.06, 0, SP_TAU); ctx.fill(); }
}

// Chick — fluffy hatchling with a bit of shell still on its head.
function spChick(ctx, m, pal, t, look) {
  const r = m.r;
  const hop = Math.abs(Math.sin(m.anim * 3)) * r * 0.15;
  ctx.translate(0, -hop);
  for (const side of [-1, 1]) { ctx.strokeStyle = '#e8803c'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(side * r * 0.2, r * 0.6); ctx.lineTo(side * r * 0.25, r * 0.85 + hop); ctx.stroke(); }
  crShade(ctx, () => spFurBall(ctx, r * 0.8, pal, m.seed, t), { ...pal, light: '#fffbd0', primary: '#ffe060', shade: '#c89820', dark: '#4a3404' }, r);
  for (const side of [-1, 1]) { ctx.fillStyle = '#f0c840'; ctx.beginPath(); ctx.ellipse(side * r * 0.72, r * 0.05, r * 0.2, r * 0.12, side * (0.5 + Math.sin(t * 14) * 0.4), 0, SP_TAU); ctx.fill(); }
  // shell cap
  ctx.fillStyle = '#f8e0a0'; ctx.strokeStyle = '#b89040'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.45); ctx.lineTo(-r * 0.3, -r * 0.7); ctx.lineTo(-r * 0.1, -r * 0.5); ctx.lineTo(r * 0.1, -r * 0.75); ctx.lineTo(r * 0.3, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.45); ctx.quadraticCurveTo(0, -r * 1.05, -r * 0.5, -r * 0.45); ctx.fill(); ctx.stroke();
  crEyes(ctx, 0, -r * 0.1, r * 0.15, r * 0.22, look, crBlink(m, t), '#1a1030', 0, '#4a3404');
  ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.12); ctx.lineTo(r * 0.1, r * 0.12); ctx.lineTo(0, r * 0.28); ctx.closePath(); ctx.fill();
}

// Owl Sentinel — armored owl archer: big round eyes, ear tufts, gilded
// breastplate; draws its bow before loosing.
function spOwl(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const plume = { ...pal, light: '#c8a882', primary: '#7a5a3a', shade: '#3a2614', dark: '#140a04' };
  for (const side of [-1, 1]) { ctx.strokeStyle = '#e8a83c'; ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.moveTo(side * r * 0.18, r * 0.5); ctx.lineTo(side * r * 0.2 + side * step * r * 0.08, r * 0.85); ctx.stroke(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.6, r * 0.62, 0, 0, SP_TAU); }, plume, r * 0.8);
  // gilded breastplate
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.05); ctx.lineTo(r * 0.35, -r * 0.05); ctx.lineTo(r * 0.25, r * 0.5); ctx.lineTo(0, r * 0.62); ctx.lineTo(-r * 0.25, r * 0.5); ctx.closePath(); }, { ...pal, light: '#fff0b0', primary: '#e8b830', shade: '#8a6410', dark: '#3a2a08' }, r * 0.5);
  // bow (left wing) — drawn back while charging
  const draw = m.windup;
  ctx.save(); ctx.translate(-r * 0.6, r * 0.0);
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.45, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 1;
  const sx = Math.cos(1.2) * r * 0.45, sy = Math.sin(1.2) * r * 0.45;
  ctx.beginPath(); ctx.moveTo(sx, -sy); ctx.lineTo(-draw * r * 0.25, 0); ctx.lineTo(sx, sy); ctx.stroke();
  if (draw > 0) drawGlow(ctx, -draw * r * 0.25, 0, r * 0.2 * draw, '#fff0c0', draw);
  ctx.restore();
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.48, r * 0.38, 0, 0, SP_TAU); }, plume, r * 0.55);
  for (const side of [-1, 1]) { ctx.fillStyle = plume.shade; ctx.beginPath(); ctx.moveTo(side * r * 0.28, -r * 0.8); ctx.lineTo(side * r * 0.5, -r * 1.08); ctx.lineTo(side * r * 0.45, -r * 0.72); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#f4e4c8';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.2, -r * 0.55, r * 0.2, 0, SP_TAU); ctx.fill(); }
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ffb31a'; ctx.beginPath(); ctx.arc(side * r * 0.2 + look.x * r * 0.03, -r * 0.55, r * 0.13, 0, SP_TAU); ctx.fill();
    ctx.fillStyle = '#1a0e04'; ctx.beginPath(); ctx.arc(side * r * 0.2 + look.x * r * 0.04, -r * 0.55 + look.y * r * 0.03, r * 0.07 * crBlink(m, t), 0, SP_TAU); ctx.fill();
  }
  ctx.fillStyle = '#e8a83c'; ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.42); ctx.lineTo(r * 0.06, -r * 0.42); ctx.lineTo(0, -r * 0.28); ctx.closePath(); ctx.fill();
}

// Griffin — eagle-headed lion brute with spread golden wings; rears and
// beats its wings before slamming down.
function spGriffin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.3);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const fur = { ...pal, light: '#ffd890', primary: '#c8903a', shade: '#6a4410', dark: '#2a1a04' };
  ctx.translate(0, -rear * r * 0.15);
  const flap = Math.sin(t * (rear ? 14 : 3)) * (0.2 + rear * 0.3);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.3, -r * 0.2); ctx.rotate(-0.5 + flap);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#fff0c0' : '#e8b830';
      ctx.beginPath(); ctx.ellipse(r * (0.35 + i * 0.2), -r * 0.1 + i * r * 0.08, r * 0.3, r * 0.1, -0.3 + i * 0.15, 0, SP_TAU); ctx.fill();
    }
    ctx.restore();
  }
  for (const [x, ph2] of [[-0.45, 0], [0.45, Math.PI]]) { ctx.strokeStyle = fur.shade; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.moveTo(x * r, r * 0.35); ctx.lineTo(x * r + Math.sin(m.anim * 1.3 + ph2) * r * 0.1, r * 0.85); ctx.stroke(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.72, r * 0.5, 0, 0, SP_TAU); }, fur, r);
  // eagle head with white feathers + hooked beak
  ctx.save(); ctx.translate(0, -r * 0.35);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r * 0.36, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#f4f0e8', shade: '#b0a890', dark: '#3a3428' }, r * 0.45);
  crEyes(ctx, 0, -r * 0.08, r * 0.1, r * 0.16, look, crBlink(m, t), '#1a0e04', 1.4, '#3a3428');
  ctx.fillStyle = '#ffb31a';
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.08); ctx.quadraticCurveTo(0, r * 0.05, r * 0.12, r * 0.08); ctx.quadraticCurveTo(r * 0.05, r * (0.35 + rear * 0.1), -r * 0.02, r * 0.3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Aurelia — the Sun Phoenix boss: radiant fire-plumed bird, sweeping flame
// wings, tail streamers; its core flares like a small sun before volleys.
function spPhoenix(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3344' : '#ffd23d';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  drawGlow(ctx, 0, 0, r * 1.8, '#ff9a3d', 0.35);
  const flap = Math.sin(t * 2.6);
  // flame wings
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.3, -r * 0.1); ctx.rotate(-0.4 + flap * 0.3);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#ffd23d', '#ff9a3d', '#ff5c3d'][i % 3];
      ctx.beginPath(); ctx.ellipse(r * (0.3 + i * 0.18), -r * 0.2 + i * r * 0.1, r * 0.35, r * 0.11, -0.5 + i * 0.12, 0, SP_TAU); ctx.fill();
    }
    ctx.restore();
  }
  // tail streamers
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = i % 2 ? '#ff9a3d' : '#ffd23d'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.4);
    ctx.quadraticCurveTo(i * r * 0.3 + Math.sin(t * 3 + i) * r * 0.2, r * 0.9, i * r * 0.45, r * 1.2 + Math.sin(t * 2 + i) * r * 0.1);
    ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.45, r * 0.5, 0, 0, SP_TAU); }, { ...pal, light: '#fff4c0', primary: '#ff9a3d', shade: '#b8380c', dark: '#3a0e02' }, r * 0.6);
  // sun core
  drawGlow(ctx, 0, r * 0.15, r * (0.35 + heave * 0.35), glow, 0.9);
  // head + plume crest
  for (let i = -2; i <= 2; i++) crGem(ctx, i * r * 0.1, -r * 0.6, r * 0.06, r * (0.3 - Math.abs(i) * 0.05), i % 2 ? '#ff5c3d' : '#ffd23d', A);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.24, 0, SP_TAU); }, { ...pal, light: '#fff4c0', primary: '#ffb35c', shade: '#c84a1a', dark: '#3a0e02' }, r * 0.3);
  for (const side of [-1, 1]) {
    drawGlow(ctx, side * r * 0.1, -r * 0.45, r * (0.08 + heave * 0.06), glow, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * r * 0.1, -r * 0.45, r * 0.03, 0, SP_TAU); ctx.fill();
  }
  ctx.fillStyle = '#3a0e02'; ctx.beginPath(); ctx.moveTo(-r * 0.06, -r * 0.35); ctx.lineTo(r * 0.06, -r * 0.35); ctx.lineTo(0, -r * 0.22); ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------- ABYSSAL FOREST ----

// Gloomling — shadow-cat critter: inky body with wispy edges, huge glowing
// eyes, curling tail; it melts into smoke trails when it dashes.
function spGloomling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.6 : 2.4);
  const bob = Math.abs(Math.sin(run)) * r * 0.1;
  ctx.translate(0, -bob);
  const ink = { ...pal, light: '#5a4a7a', primary: '#2a1e44', shade: '#120a22', dark: '#05020c', rim: pal.glow };
  ctx.strokeStyle = ink.primary; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.35); ctx.quadraticCurveTo(-r * 0.95, r * 0.3, -r * 0.8, -r * 0.2 + Math.sin(t * 5 + m.seed) * r * 0.15); ctx.stroke();
  for (const side of [-1, 1]) { ctx.strokeStyle = ink.shade; ctx.lineWidth = r * 0.13; ctx.beginPath(); ctx.moveTo(side * r * 0.25, r * 0.4); ctx.lineTo(side * r * 0.28 + Math.sin(run + side) * r * 0.12, r * 0.8 + bob); ctx.stroke(); }
  // wispy body
  crShade(ctx, () => {
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * SP_TAU;
      const rr = r * (0.7 + (i % 2) * 0.08 + Math.sin(t * 6 + i + m.seed) * 0.04);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.85;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }, ink, r);
  for (const side of [-1, 1]) { ctx.fillStyle = ink.primary; ctx.beginPath(); ctx.moveTo(side * r * 0.2, -r * 0.55); ctx.lineTo(side * r * 0.5, -r * 0.95); ctx.lineTo(side * r * 0.55, -r * 0.45); ctx.closePath(); ctx.fill(); }
  for (const side of [-1, 1]) {
    drawGlow(ctx, side * r * 0.25, -r * 0.12, r * 0.3, pal.glow, 0.8);
    ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(side * r * 0.25, -r * 0.12, r * 0.17, r * 0.17 * crBlink(m, t), 0, 0, SP_TAU); ctx.fill();
    ctx.fillStyle = '#05020c'; ctx.beginPath(); ctx.ellipse(side * r * 0.25 + look.x * r * 0.05, -r * 0.12, r * 0.04, r * 0.12 * crBlink(m, t), 0, 0, SP_TAU); ctx.fill();
  }
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.18); ctx.lineTo(-r * 0.04, r * 0.24); ctx.lineTo(r * 0.04, r * 0.18); ctx.lineTo(r * 0.12, r * 0.24); ctx.stroke();
}

// Wisp — ghost flame: a flickering teardrop of spirit-fire with a sad
// face; splits into smaller wisps.
function spWisp(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const fl = Math.sin(t * 9 + m.seed);
  drawGlow(ctx, 0, 0, r * 1.4, pal.glow, 0.5);
  const coil = ph === 'windup' ? 0.2 : 0;
  ctx.scale(1 + coil, 1 - coil);
  const flame = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r * (1.05 + fl * 0.1));
    ctx.bezierCurveTo(r * 0.35 + fl * r * 0.08, -r * 0.55, r * 0.85, -r * 0.05, r * 0.7, r * 0.35);
    ctx.quadraticCurveTo(r * 0.45, r * 0.8, 0, r * 0.75);
    ctx.quadraticCurveTo(-r * 0.45, r * 0.8, -r * 0.7, r * 0.35);
    ctx.bezierCurveTo(-r * 0.85, -r * 0.05, -r * 0.35 - fl * r * 0.08, -r * 0.55, 0, -r * (1.05 + fl * 0.1));
    ctx.closePath();
  };
  ctx.globalAlpha = A * 0.85;
  crShade(ctx, flame, { ...pal, light: '#ffffff', primary: pal.glow, shade: pal.primary, rim: '#ffffff' }, r);
  ctx.globalAlpha = A;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = A * 0.6;
  ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.35, r * 0.4, 0, 0, SP_TAU); ctx.fill(); ctx.globalAlpha = A;
  ctx.fillStyle = '#1a0e2a';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.2, r * 0.1, r * 0.08, r * 0.12 * crBlink(m, t), 0, 0, SP_TAU); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.08, r * (0.05 + (ph === 'windup' ? 0.06 : 0)), 0, 0, SP_TAU); ctx.fill();
}

// Raven — dark crow: glossy feathers, sharp beak, red eye; folds its wings
// for a dive.
function spRaven(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 24 : 14) + m.seed);
  const feather = { ...pal, light: '#9a8ac8', primary: '#4a3a6a', shade: '#1c1430', dark: '#06040c', rim: '#d8c8ff' };
  drawGlow(ctx, 0, 0, r * 1.6, '#9a6ad8', 0.3); // keeps the dark bird readable on a dark wood
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(fast ? -0.9 : -0.15 + flap * 0.55);
    ctx.fillStyle = feather.primary;
    ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.1);
    for (let i = 0; i < 5; i++) ctx.lineTo(r * (0.5 + i * 0.28), -r * (0.25 + (i % 2) * 0.1) + i * r * 0.12);
    ctx.lineTo(r * 1.5, r * 0.35); ctx.lineTo(r * 0.3, r * 0.25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c8b0ff'; ctx.lineWidth = 1.4; ctx.stroke(); // glossy feather edge
    ctx.restore();
  }
  ctx.fillStyle = feather.primary;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.5); ctx.lineTo(0, r * 1.0); ctx.lineTo(r * 0.2, r * 0.5); ctx.closePath(); ctx.fill();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.55, 0, 0, SP_TAU); }, feather, r * 0.6);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.3, 0, SP_TAU); }, feather, r * 0.35);
  ctx.fillStyle = '#c8b898';
  ctx.beginPath(); ctx.moveTo(-r * 0.08, -r * 0.35); ctx.lineTo(r * 0.08, -r * 0.35); ctx.lineTo(0, -r * 0.05); ctx.closePath(); ctx.fill();
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.12, -r * 0.5, r * 0.1, '#ff3a4a', 0.9); ctx.fillStyle = '#ff6a6a'; ctx.beginPath(); ctx.arc(side * r * 0.12, -r * 0.5, r * 0.04, 0, SP_TAU); ctx.fill(); }
}

// Lantern Witch — hooded hag with a crooked hat, ragged robe and a hanging
// spirit-lantern that swings and flares to cast.
function spWitch(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.6);
  const robe = { ...pal, light: '#6a4a8a', primary: '#3a2456', shade: '#1a0e2a', dark: '#08040e' };
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.35); ctx.lineTo(r * 0.3, -r * 0.35);
    for (let i = 4; i >= 0; i--) ctx.lineTo(-r * 0.55 + (i / 4) * r * 1.1, r * (0.75 + (i % 2) * 0.12) + Math.sin(t * 4 + i) * r * 0.04);
    ctx.closePath();
  }, robe, r * 0.8);
  // face in hood
  ctx.fillStyle = '#7ab86a';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.42, r * 0.22, r * 0.24, 0, 0, SP_TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.42); ctx.lineTo(r * 0.3, -r * 0.3); ctx.lineTo(r * 0.06, -r * 0.32); ctx.closePath(); ctx.fill();
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.09, -r * 0.47, r * 0.08, '#ffd23d', 0.9); }
  ctx.strokeStyle = '#1a0e2a'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.3); ctx.quadraticCurveTo(0, -r * 0.26, r * 0.08, -r * 0.31); ctx.stroke();
  // crooked hat
  ctx.fillStyle = '#1a0e2a';
  ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.48, r * 0.1, 0, 0, SP_TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.64); ctx.lineTo(r * 0.25, -r * 0.64); ctx.quadraticCurveTo(r * 0.1, -r * 1.0, r * 0.35 + Math.sin(t * 2) * r * 0.05, -r * 1.2); ctx.quadraticCurveTo(-r * 0.05, -r * 1.0, -r * 0.25, -r * 0.64); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8a6ff'; ctx.fillRect(-r * 0.22, -r * 0.72, r * 0.44, r * 0.06);
  // lantern on a crook, swinging
  const raise = m.windup;
  ctx.strokeStyle = '#4a3018'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.moveTo(r * 0.45, r * 0.6); ctx.lineTo(r * 0.45, -r * 0.6 - raise * r * 0.2); ctx.quadraticCurveTo(r * 0.45, -r * 0.8 - raise * r * 0.2, r * 0.7, -r * 0.7 - raise * r * 0.2); ctx.stroke();
  const sw = Math.sin(t * 3 + m.seed) * 0.4;
  const lx = r * 0.7 + Math.sin(sw) * r * 0.2, ly = -r * 0.5 - raise * r * 0.2 + Math.cos(sw) * r * 0.05;
  drawGlow(ctx, lx, ly, r * (0.35 + raise * 0.3), pal.glow, 0.8);
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(lx - r * 0.1, ly - r * 0.14, r * 0.2, r * 0.26);
  ctx.fillStyle = pal.glow; ctx.fillRect(lx - r * 0.06, ly - r * 0.1, r * 0.12, r * 0.18);
}

// Bramble Beast — hulking mass of thorny vines with a skull-like face,
// glowing berries; whips a thorn-vine overhead before the slam.
function spBramble(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.07);
  const vine = { ...pal, light: '#6a8a5a', primary: '#2e4a2a', shade: '#122012', dark: '#040a04' };
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  // whip vine
  ctx.save(); ctx.translate(r * 0.55, -r * 0.1); ctx.rotate(-0.45 - raise * 2.4);
  ctx.strokeStyle = vine.primary; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.3, r * 0.5, 0, r * 1.1); ctx.stroke();
  for (let i = 1; i < 5; i++) crGem(ctx, Math.sin(i) * r * 0.12, i * r * 0.24, r * 0.05, r * 0.12, '#c8a882', A);
  ctx.restore();
  for (const side of [-1, 1]) { ctx.strokeStyle = vine.shade; ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.moveTo(side * r * 0.4, r * 0.4); ctx.lineTo(side * r * 0.45, r * 0.85 - (side * step > 0 ? step * r * 0.12 : 0)); ctx.stroke(); }
  // tangled body
  crShade(ctx, () => spFurBall(ctx, r * 0.9, vine, m.seed, t), vine, r);
  ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.6) * r * 0.2, Math.sin(i * 1.6) * r * 0.2, r * 0.45, i, i + 1.6); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i * 0.8 + 0.3; crGem(ctx, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.75, r * 0.05, r * 0.14, '#c8a882', A); }
  // berries
  for (const [x, y] of [[-0.5, 0.3], [0.45, 0.35], [-0.2, 0.55], [0.6, -0.2]]) { drawGlow(ctx, x * r, y * r, r * 0.12, pal.glow, 0.6); ctx.fillStyle = '#c84aff'; ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.06, 0, SP_TAU); ctx.fill(); }
  // skull face
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.36, r * 0.32, 0, 0, SP_TAU); }, { ...pal, light: '#fff4e0', primary: '#d8ccb0', shade: '#8a7a60', dark: '#2a2418' }, r * 0.4);
  const rage = ph === 'windup' ? 1 : m.windup;
  for (const side of [-1, 1]) { ctx.fillStyle = '#05020c'; ctx.beginPath(); ctx.ellipse(side * r * 0.14, -r * 0.2, r * 0.1, r * 0.09, 0, 0, SP_TAU); ctx.fill(); drawGlow(ctx, side * r * 0.14, -r * 0.2, r * (0.1 + rage * 0.08), pal.glow, 0.9); }
  ctx.fillStyle = '#05020c'; ctx.fillRect(-r * 0.15, -r * 0.02, r * 0.3, r * (0.05 + rage * 0.05));
}

// Nocturne — the Shadow Stag boss: a vast spectral stag head with towering
// glowing antlers and a crown of floating motes; eyes blaze before volleys.
function spShadowStag(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a6a' : pal.glow;
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  // antlers
  ctx.strokeStyle = glow; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    drawGlow(ctx, r * 0.6, -r * 0.8, r * 0.6, glow, 0.25);
    ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.45); ctx.quadraticCurveTo(r * 0.7, -r * 0.6, r * 0.85, -r * 1.25); ctx.stroke();
    ctx.lineWidth = r * 0.06;
    for (const [x0, y0, x1, y1] of [[0.5, -0.6, 0.45, -1.0], [0.68, -0.85, 1.05, -1.0], [0.8, -1.05, 0.65, -1.35]]) { ctx.beginPath(); ctx.moveTo(x0 * r, y0 * r); ctx.lineTo(x1 * r, y1 * r); ctx.stroke(); }
    ctx.restore();
  }
  // floating motes
  for (let i = 0; i < 8; i++) { const a = t * 0.8 + i * 0.785; drawGlow(ctx, Math.cos(a) * r * 1.1, -r * 0.3 + Math.sin(a) * r * 0.45, r * 0.07, glow, 0.7); }
  // head (long muzzle)
  const fur = { ...pal, light: '#5a4a8a', primary: '#241a44', shade: '#0e0820', dark: '#04020a', rim: glow };
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.35);
    ctx.quadraticCurveTo(0, -r * 0.65, r * 0.5, -r * 0.35);
    ctx.quadraticCurveTo(r * 0.45, r * 0.25, r * 0.18, r * 0.7);
    ctx.quadraticCurveTo(0, r * 0.82, -r * 0.18, r * 0.7);
    ctx.quadraticCurveTo(-r * 0.45, r * 0.25, -r * 0.5, -r * 0.35);
    ctx.closePath();
  }, fur, r);
  for (const side of [-1, 1]) { ctx.fillStyle = fur.primary; ctx.beginPath(); ctx.moveTo(side * r * 0.42, -r * 0.3); ctx.lineTo(side * r * 0.8, -r * 0.35); ctx.lineTo(side * r * 0.5, -r * 0.1); ctx.closePath(); ctx.fill(); }
  // mask markings + eyes
  ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.3); ctx.stroke(); ctx.globalAlpha = A;
  for (const side of [-1, 1]) {
    drawGlow(ctx, side * r * 0.2, -r * 0.12, r * (0.16 + heave * 0.14), glow, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(side * r * 0.2, -r * 0.12, r * 0.07, r * 0.04, side * 0.4, 0, SP_TAU); ctx.fill();
  }
  ctx.fillStyle = '#04020a'; ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.1, r * 0.06, 0, 0, SP_TAU); ctx.fill();
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.7, r * 0.3 * heave, glow, heave);
}

// ---------------------------------------------------- AETHERIAL GARDENS ----

function spStarPath(ctx, r, pts = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = -Math.PI / 2 + (i / (pts * 2)) * SP_TAU;
    const rr = i % 2 ? r * inner : r;
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

// Star Sprite — a little living star that tumbles and twinkles; spins into
// a sparkling dash.
function spStarSprite(ctx, m, pal, t, look) {
  const r = m.r;
  const ph = m.action && m.action.phase;
  drawGlow(ctx, 0, 0, r * 1.3, '#fff0a0', 0.45);
  ctx.save();
  ctx.rotate(Math.sin(m.anim * 1.2) * 0.25 + (ph === 'burst' ? t * 20 : 0));
  crShade(ctx, () => spStarPath(ctx, r * 0.95, 5, 0.5), { ...pal, light: '#ffffff', primary: '#ffe060', shade: '#c8901a', dark: '#4a3004', rim: '#ffffff' }, r);
  ctx.restore();
  crEyes(ctx, 0, -r * 0.05, r * 0.14, r * 0.18, look, crBlink(m, t), '#2a1a04', ph === 'windup' ? 1 : 0, '#4a3004');
  ctx.strokeStyle = '#4a3004'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.12, 0.2, Math.PI - 0.2); ctx.stroke();
  for (const side of [-1, 1]) { ctx.fillStyle = 'rgba(255,120,150,0.5)'; ctx.beginPath(); ctx.arc(side * r * 0.3, r * 0.1, r * 0.07, 0, SP_TAU); ctx.fill(); }
}

// Nebula Bloom — a cosmic flower bud whose petals hold a swirling nebula;
// it bursts into seedlings when destroyed.
function spBloom(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const open = ph === 'windup' ? 0.4 : ph === 'burst' ? -0.2 : Math.sin(t * 2 + m.seed) * 0.08;
  // stem + leaves
  ctx.strokeStyle = '#3ab86a'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.quadraticCurveTo(r * 0.1, r * 0.7, 0, r * 0.9); ctx.stroke();
  for (const side of [-1, 1]) { ctx.fillStyle = '#2a8a4a'; ctx.beginPath(); ctx.ellipse(side * r * 0.22, r * 0.7, r * 0.2, r * 0.08, side * 0.5, 0, SP_TAU); ctx.fill(); }
  // petals
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * SP_TAU + t * 0.3;
    ctx.save(); ctx.rotate(a); ctx.translate(0, -r * (0.42 + open * 0.3));
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.42, 0, 0, SP_TAU); }, { ...pal, light: '#ffd8ff', primary: '#b87af0', shade: '#5a2a9a', dark: '#1a0a34' }, r * 0.45);
    ctx.restore();
  }
  // nebula heart
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#7fd8ff'); g.addColorStop(1, '#3a2a8a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, SP_TAU); ctx.fill();
  for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, 1.2, 0, SP_TAU); ctx.fill(); }
  crEyes(ctx, 0, -r * 0.02, r * 0.11, r * 0.15, look, crBlink(m, t), '#1a0a34', 0, '#1a0a34');
}

// Seedling — sprouting star-seed with two leaves (Nebula Bloom's children).
function spSeedling(ctx, m, pal, t, look) {
  const r = m.r;
  const hop = Math.abs(Math.sin(m.anim * 3)) * r * 0.15;
  ctx.translate(0, -hop);
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(0, -r * 0.6); ctx.rotate(side * (0.6 + Math.sin(t * 6) * 0.15)); ctx.fillStyle = '#3ab86a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.15, r * 0.32, 0, 0, SP_TAU); ctx.fill(); ctx.restore(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.78, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#9ac8ff', shade: '#3a5ab8', dark: '#0e1a44' }, r);
  crEyes(ctx, 0, -r * 0.05, r * 0.15, r * 0.22, look, crBlink(m, t), '#0e1a44', 0, '#0e1a44');
}

// Comet — blazing ice-comet with a long glittering tail; streaks across in
// a swoop.
function spComet(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const tail = fast ? 2.6 : 1.8;
  const ang = Math.atan2(-(m.pvy || 1), -(m.pvx || 0.0001));
  ctx.save(); ctx.rotate(ang - Math.PI / 2);
  for (let i = 0; i < 6; i++) drawGlow(ctx, Math.sin(t * 8 + i) * r * 0.1, r * (0.5 + i * 0.35) * tail / 1.8, r * (0.7 - i * 0.1), i % 2 ? '#7fd8ff' : '#c8a6ff', 0.45);
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#bfe8ff', shade: '#5a8ad0', dark: '#16244a', rim: '#ffffff' }, r * 0.8);
  drawGlow(ctx, 0, 0, r * 0.9, '#ffffff', 0.4);
  crEyes(ctx, 0, -r * 0.05, r * 0.14, r * 0.2, look, crBlink(m, t), '#16244a', 1, '#16244a');
}

// Astral Sentinel — robed star-mage: deep-blue robe sewn with
// constellations, faceless hood with a single eye, orbiting orb it hurls.
function spAstral(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const hover = Math.sin(t * 2.2 + m.seed) * r * 0.06;
  ctx.translate(0, hover);
  const robe = { ...pal, light: '#5a6ad8', primary: '#22286a', shade: '#0e1034', dark: '#04050e' };
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(0, -r * 0.95);
    ctx.bezierCurveTo(r * 0.5, -r * 0.9, r * 0.6, 0, r * 0.55, r * 0.8);
    ctx.lineTo(-r * 0.55, r * 0.8);
    ctx.bezierCurveTo(-r * 0.6, 0, -r * 0.5, -r * 0.9, 0, -r * 0.95);
    ctx.closePath();
  }, robe, r);
  // constellation stitched on the robe
  const stars = [[-0.25, 0.1], [0.05, 0.25], [0.3, 0.05], [0.15, 0.5], [-0.2, 0.55]];
  ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); stars.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r))); ctx.stroke();
  for (const [x, y] of stars) drawGlow(ctx, x * r, y * r, r * 0.08, '#ffffff', 0.9);
  // hood + single eye
  ctx.fillStyle = '#04050e'; ctx.beginPath(); ctx.ellipse(0, -r * 0.48, r * 0.26, r * 0.28, 0, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, 0, -r * 0.5, r * 0.2, pal.glow, 1);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.08, r * 0.05 * crBlink(m, t), 0, 0, SP_TAU); ctx.fill();
  // orbiting orb, drawn in close when charging
  const ch = m.windup;
  const a = t * 2.5 + m.seed;
  const R = r * (0.8 - ch * 0.4);
  drawGlow(ctx, Math.cos(a) * R, -r * 0.1 + Math.sin(a) * R * 0.4, r * (0.22 + ch * 0.2), '#c8a6ff', 0.9);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(Math.cos(a) * R, -r * 0.1 + Math.sin(a) * R * 0.4, r * 0.07, 0, SP_TAU); ctx.fill();
}

// Moon Golem — stone brute built around a glowing crescent moon, rune-cut
// arms; raises its crescent fist for the slam.
function spMoonGolem(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.08);
  const stone = { ...pal, light: '#b8bcd8', primary: '#6a6e90', shade: '#30324a', dark: '#10111c' };
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.42 - r * 0.2, r * 0.55 - (side * step > 0 ? step * r * 0.15 : 0), r * 0.4, r * 0.3, r * 0.1); }, stone, r * 0.35);
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : ph === 'burst' ? -0.3 : m.windup;
  ctx.save(); ctx.translate(r * 0.65, -r * 0.1); ctx.rotate(-0.45 - raise * 2.4 + step * 0.15);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.15, 0, r * 0.3, r * 0.65, r * 0.1); }, stone, r * 0.4);
  ctx.fillStyle = '#fff4c0'; drawGlow(ctx, 0, r * 0.9, r * 0.35, '#fff4c0', 0.6);
  ctx.beginPath(); ctx.arc(0, r * 0.9, r * 0.25, 0, SP_TAU); ctx.arc(r * 0.1, r * 0.85, r * 0.2, 0, SP_TAU, true); ctx.fill();
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.75, -r * 0.65, r * 1.5, r * 1.25, r * 0.35); }, stone, r);
  // glowing crescent moon core
  drawGlow(ctx, 0, -r * 0.05, r * 0.6, '#fff4c0', 0.6);
  ctx.fillStyle = '#fff4c0';
  ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.36, 0, SP_TAU); ctx.arc(r * 0.15, -r * 0.12, r * 0.3, 0, SP_TAU, true); ctx.fill();
  // runes
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 1.4;
  for (const [x, y] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.3], [0.5, 0.3]]) { ctx.beginPath(); ctx.moveTo(x * r - 3, y * r - 4); ctx.lineTo(x * r + 3, y * r); ctx.lineTo(x * r - 3, y * r + 4); ctx.stroke(); }
  const rage = ph === 'windup' ? 1 : m.windup;
  for (const side of [-1, 1]) drawGlow(ctx, side * r * 0.3, -r * 0.45, r * (0.1 + rage * 0.08), pal.glow, 1);
}

// Astraea — the Star Seraph boss: a radiant figure with six wings of
// light, a halo of orbiting stars and a starburst heart that flares.
function spSeraph(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a6a' : '#fff0c0';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  drawGlow(ctx, 0, 0, r * 1.8, '#c8a6ff', 0.3);
  // six wings
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.25, -r * 0.1 + (k - 1) * r * 0.3);
      ctx.rotate(-0.6 + k * 0.5 + Math.sin(t * 2 + k) * 0.12);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,250,230,0.85)' : 'rgba(200,180,255,0.85)';
        ctx.beginPath(); ctx.ellipse(r * (0.35 + i * 0.18), 0, r * 0.32, r * 0.08, 0, 0, SP_TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  // robe body
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.bezierCurveTo(r * 0.4, -r * 0.4, r * 0.45, r * 0.4, r * 0.35, r * 0.85); ctx.lineTo(-r * 0.35, r * 0.85); ctx.bezierCurveTo(-r * 0.45, r * 0.4, -r * 0.4, -r * 0.4, 0, -r * 0.45); ctx.closePath(); }, { ...pal, light: '#f0e8ff', primary: '#b8a8f0', shade: '#5a4aa8', dark: '#1a1440' }, r * 0.7);
  // starburst heart
  ctx.save(); ctx.translate(0, r * 0.1); ctx.rotate(t);
  ctx.globalAlpha = A * (0.7 + heave * 0.3);
  crShade(ctx, () => spStarPath(ctx, r * (0.2 + heave * 0.12), 8, 0.4), { ...pal, light: '#ffffff', primary: glow, shade: '#c8a6ff', dark: '#2a2058' }, r * 0.3);
  ctx.globalAlpha = A;
  ctx.restore();
  drawGlow(ctx, 0, r * 0.1, r * (0.22 + heave * 0.3), glow, 0.5 + heave * 0.3);
  // serene masked face
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.6, r * 0.22, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#f0e8ff', shade: '#a89ad8', dark: '#2a2058' }, r * 0.3);
  for (const side of [-1, 1]) drawGlow(ctx, side * r * 0.08, -r * 0.62, r * (0.06 + heave * 0.06), glow, 1);
  // halo of orbiting stars
  for (let i = 0; i < 7; i++) {
    const a = t * 1.2 + i * (SP_TAU / 7);
    ctx.save(); ctx.translate(Math.cos(a) * r * 0.42, -r * 0.92 + Math.sin(a) * r * 0.1); ctx.rotate(t * 2);
    ctx.fillStyle = glow; spStarPath(ctx, r * 0.07, 5, 0.45); ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------- CLOCKWORK CITY ----

function spGearPath(ctx, r, teeth = 8, depth = 0.18, rot = 0) {
  ctx.beginPath();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * SP_TAU;
    const tooth = (i % 4 === 1 || i % 4 === 2) ? 1 : 1 - depth;
    const x = Math.cos(a) * r * tooth, y = Math.sin(a) * r * tooth;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
const SP_BRASS = { light: '#ffe6a0', primary: '#c8902a', shade: '#6a4410', dark: '#2a1a04', rim: '#fff4c8' };
const SP_STEEL = { light: '#d8dce8', primary: '#7a8090', shade: '#3a3e4a', dark: '#14161c', rim: '#ffffff' };

function spSteam(ctx, x, y, r, t, seed) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.9 + i / 3 + seed) % 1;
    ctx.fillStyle = `rgba(230,230,240,${0.5 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * r * 0.2, y - p * r * 1.2, r * (0.15 + p * 0.3), 0, SP_TAU); ctx.fill();
  }
}

// Cogbot — little wind-up robot: boxy brass body, big round lens eye, a
// winding key turning on its back, clacking legs.
function spCogbot(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 4 : 2.6);
  const bob = Math.abs(Math.sin(run)) * r * 0.08;
  ctx.translate(0, -bob);
  // winding key (spins faster in a windup)
  ctx.save(); ctx.translate(0, -r * 0.7); ctx.rotate(t * (ph === 'windup' ? 20 : 4));
  ctx.strokeStyle = SP_BRASS.shade; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.2); ctx.stroke();
  ctx.fillStyle = SP_BRASS.primary;
  ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.28, r * 0.13, r * 0.08, 0, 0, SP_TAU); ctx.ellipse(r * 0.15, -r * 0.28, r * 0.13, r * 0.08, 0, 0, SP_TAU); ctx.fill();
  ctx.restore();
  for (const side of [-1, 1]) { ctx.strokeStyle = SP_STEEL.primary; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(side * r * 0.25, r * 0.4); ctx.lineTo(side * r * 0.28, r * 0.62 + Math.max(0, side * Math.sin(run)) * -r * 0.12); ctx.lineTo(side * r * 0.4, r * 0.75); ctx.stroke(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.55, -r * 0.6, r * 1.1, r * 1.05, r * 0.18); }, { ...pal, ...SP_BRASS }, r);
  for (const [x, y] of [[-0.42, -0.48], [0.42, -0.48], [-0.42, 0.32], [0.42, 0.32]]) { ctx.fillStyle = SP_BRASS.shade; ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.04 + 0.5, 0, SP_TAU); ctx.fill(); }
  // lens eye
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.3, 0, SP_TAU); }, { ...pal, ...SP_STEEL }, r * 0.35);
  drawGlow(ctx, look.x * r * 0.06, -r * 0.12 + look.y * r * 0.04, r * 0.25, ph === 'windup' ? '#ff4d5a' : pal.glow, 0.9);
  ctx.fillStyle = '#14161c'; ctx.beginPath(); ctx.arc(look.x * r * 0.06, -r * 0.12 + look.y * r * 0.04, r * 0.08, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#14161c'; ctx.fillRect(-r * 0.25, r * 0.2, r * 0.5, r * 0.08);
}

// Gearball — a rolling ball of meshing cogs; shatters into loose gears.
function spGearball(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const roll = m.anim * 0.6 + (m.action && m.action.phase === 'burst' ? t * 10 : 0);
  crShade(ctx, () => spGearPath(ctx, r * 0.95, 10, 0.16, roll), { ...pal, ...SP_BRASS }, r);
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  crShade(ctx, () => spGearPath(ctx, r * 0.55, 7, 0.22, -roll * 1.6), { ...pal, ...SP_STEEL }, r * 0.6);
  ctx.restore();
  ctx.fillStyle = SP_BRASS.dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, 0, 0, r * 0.22, pal.glow, 0.8);
  crEyes(ctx, 0, -r * 0.02, r * 0.1, r * 0.13, look, crBlink(m, t), '#14161c', 1, '#14161c');
}

// Gear — loose spinning cog (Gearball's children).
function spGear(ctx, m, pal, t, look) {
  const r = m.r;
  crShade(ctx, () => spGearPath(ctx, r * 0.9, 8, 0.2, m.anim * 1.2), { ...pal, ...SP_BRASS }, r);
  ctx.fillStyle = SP_BRASS.dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, SP_TAU); ctx.fill();
  crEyes(ctx, 0, 0, r * 0.12, r * 0.14, look, crBlink(m, t), '#14161c', 0, '#14161c');
}

// Steam Soldier — brass automaton trooper: dome helmet with a red visor
// slit, chimney venting steam, a long rifle shouldered to fire.
function spSteamSoldier(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.8);
  for (const side of [-1, 1]) {
    const sw = side * step * 0.35;
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.2 - r * 0.11 + Math.sin(sw) * r * 0.15, r * 0.35, r * 0.22, r * 0.5, r * 0.05); }, { ...pal, ...SP_STEEL }, r * 0.4);
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.42, -r * 0.32, r * 0.84, r * 0.78, r * 0.12); }, { ...pal, ...SP_BRASS }, r * 0.8);
  // pressure gauge
  ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.15, 0, SP_TAU); ctx.fill();
  ctx.strokeStyle = '#c8302a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, r * 0.05); ctx.lineTo(Math.cos(t * 2 + m.seed) * r * 0.11, r * 0.05 + Math.sin(t * 2 + m.seed) * r * 0.11); ctx.stroke();
  // chimney + steam
  ctx.fillStyle = SP_STEEL.shade; ctx.fillRect(-r * 0.32, -r * 0.62, r * 0.12, r * 0.3);
  spSteam(ctx, -r * 0.26, -r * 0.65, r, t, m.seed);
  // rifle
  const aim = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  ctx.save(); ctx.translate(r * 0.42, -r * 0.05); ctx.rotate(-0.4 - aim * 0.8);
  ctx.fillStyle = '#4a2e1a'; ctx.fillRect(-r * 0.06, -r * 0.1, r * 0.12, r * 0.35);
  ctx.fillStyle = SP_STEEL.primary; ctx.fillRect(-r * 0.04, -r * 0.85, r * 0.08, r * 0.8);
  if (m.fireFlash > 0) drawGlow(ctx, 0, -r * 0.9, r * 0.3, '#ffd88a', 1);
  ctx.restore();
  // dome helmet
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.3, Math.PI, 0); ctx.lineTo(r * 0.3, -r * 0.35); ctx.lineTo(-r * 0.3, -r * 0.35); ctx.closePath(); }, { ...pal, ...SP_BRASS }, r * 0.35);
  ctx.fillStyle = '#14161c'; ctx.fillRect(-r * 0.22, -r * 0.5, r * 0.44, r * 0.08);
  drawGlow(ctx, 0, -r * 0.46, r * 0.16, '#ff4d5a', 0.9);
  ctx.fillStyle = SP_BRASS.light; ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.05, 0, SP_TAU); ctx.fill();
}

// Brass Juggernaut — boiler-bellied steam brute: glowing furnace grate,
// twin smokestacks, a piston fist it ratchets up before the slam.
function spJuggernaut(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.06);
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.42 - r * 0.22, r * 0.55 - (side * step > 0 ? step * r * 0.15 : 0), r * 0.44, r * 0.3, r * 0.06); }, { ...pal, ...SP_STEEL }, r * 0.35);
  // smokestacks
  for (const side of [-1, 1]) { ctx.fillStyle = SP_STEEL.shade; ctx.fillRect(side * r * 0.35 - r * 0.08, -r * 1.0, r * 0.16, r * 0.4); spSteam(ctx, side * r * 0.35, -r * 1.02, r, t, m.seed + side); }
  // piston arm
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : ph === 'burst' ? -0.3 : m.windup;
  ctx.save(); ctx.translate(r * 0.7, -r * 0.1); ctx.rotate(-0.45 - raise * 2.4 + step * 0.12);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.12, 0, r * 0.24, r * 0.55, r * 0.05); }, { ...pal, ...SP_STEEL }, r * 0.3);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.25, r * 0.55, r * 0.5, r * 0.35, r * 0.08); }, { ...pal, ...SP_BRASS }, r * 0.4);
  ctx.restore();
  // boiler body
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.78, -r * 0.62, r * 1.56, r * 1.2, r * 0.4); }, { ...pal, ...SP_BRASS }, r);
  for (const y of [-0.35, 0.35]) { ctx.strokeStyle = SP_BRASS.shade; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(-r * 0.78, y * r); ctx.lineTo(r * 0.78, y * r); ctx.stroke(); }
  // furnace grate glow
  const heat = 0.6 + 0.4 * Math.sin(t * 5) + (ph === 'windup' ? 0.5 : 0);
  drawGlow(ctx, 0, r * 0.12, r * 0.4 * heat, '#ff8a3d', 0.9);
  ctx.strokeStyle = '#2a1a04'; ctx.lineWidth = r * 0.05;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.1, -r * 0.02); ctx.lineTo(i * r * 0.1, r * 0.28); ctx.stroke(); }
  // porthole eyes
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(side * r * 0.3, -r * 0.35, r * 0.13, 0, SP_TAU); }, { ...pal, ...SP_STEEL }, r * 0.15);
    drawGlow(ctx, side * r * 0.3, -r * 0.35, r * 0.12, pal.glow, 0.95);
  }
}

// Chronos — the Clockwork Colossus boss: a giant clock-face head with
// sweeping hands, a gear crown, pendulum swinging below; its numerals
// flash when it fires.
function spChronos(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#7fd8ff';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  // pendulum
  const sw = Math.sin(t * 2.2) * 0.5;
  ctx.save(); ctx.translate(0, r * 0.6); ctx.rotate(sw);
  ctx.strokeStyle = SP_BRASS.shade; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.5); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.6, r * 0.14, 0, SP_TAU); }, { ...pal, ...SP_BRASS }, r * 0.2);
  ctx.restore();
  // gear shoulders
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.85, -r * 0.1);
    crShade(ctx, () => spGearPath(ctx, r * 0.35, 9, 0.2, t * side), { ...pal, ...SP_STEEL }, r * 0.4);
    ctx.restore();
  }
  // crown of gears
  for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(i * r * 0.38, -r * 0.82); crShade(ctx, () => spGearPath(ctx, r * 0.18, 7, 0.25, t * 2 * (i % 2 ? -1 : 1)), { ...pal, ...SP_BRASS }, r * 0.2); ctx.restore(); }
  // clock face
  crShade(ctx, () => spGearPath(ctx, r * 0.78, 16, 0.08, 0), { ...pal, ...SP_BRASS }, r);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#fff4e0', shade: '#c8b890', dark: '#3a2e1a' }, r * 0.7);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * SP_TAU;
    ctx.fillStyle = heave > 0.3 && i % 3 === 0 ? glow : '#3a2e1a';
    ctx.fillRect(Math.cos(a) * r * 0.5 - 2, Math.sin(a) * r * 0.5 - 2, 4, 4);
  }
  // hands
  ctx.strokeStyle = '#2a1a04'; ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 0.5) * r * 0.32, Math.sin(t * 0.5) * r * 0.32); ctx.stroke();
  ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 3) * r * 0.48, Math.sin(t * 3) * r * 0.48); ctx.stroke();
  // eyes in the dial
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.22, -r * 0.18, r * (0.1 + heave * 0.1), glow, 1); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * r * 0.22, -r * 0.18, r * 0.04, 0, SP_TAU); ctx.fill(); }
  crGem(ctx, 0, 0, r * 0.06, r * 0.08, glow, A);
}

// ------------------------------------------------------ SPECTRAL JUNGLE ----

// Spirit Monkey — glowing ghost-monkey: long curling tail, big ears,
// swings its arms as it scampers and leaps sideways.
function spMonkey(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.6 : 2.4);
  const fur = { ...pal, light: '#e4c8ff', primary: '#9a6ad8', shade: '#4a2a7a', dark: '#1a0a30' };
  ctx.globalAlpha = A * 0.92;
  ctx.strokeStyle = fur.primary; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.4); ctx.bezierCurveTo(-r * 0.9, r * 0.6, -r * 1.0, -r * 0.4, -r * 0.6, -r * 0.5 + Math.sin(t * 4) * r * 0.1); ctx.stroke();
  for (const side of [-1, 1]) {
    const sw = Math.sin(run + (side > 0 ? Math.PI : 0)) * 0.6 + (ph === 'windup' ? -1 : 0);
    ctx.save(); ctx.translate(side * r * 0.45, -r * 0.05); ctx.rotate(side * (0.4 + sw));
    ctx.strokeStyle = fur.shade; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = fur.shade; ctx.beginPath(); ctx.moveTo(side * r * 0.2, r * 0.4); ctx.lineTo(side * r * 0.25 + Math.sin(run + side) * r * 0.1, r * 0.75); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.42, r * 0.42, 0, 0, SP_TAU); }, fur, r * 0.6);
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.arc(side * r * 0.42, -r * 0.45, r * 0.16, 0, SP_TAU); }, fur, r * 0.2);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.33, 0, SP_TAU); }, fur, r * 0.4);
  ctx.fillStyle = '#f0e0ff'; ctx.beginPath(); ctx.ellipse(0, -r * 0.33, r * 0.24, r * 0.2, 0, 0, SP_TAU); ctx.fill();
  ctx.globalAlpha = A;
  crEyes(ctx, 0, -r * 0.42, r * 0.09, r * 0.12, look, crBlink(m, t), '#1a0a30', 1, fur.dark);
  ctx.strokeStyle = fur.dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -r * 0.28, r * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
}

// Ghost Frog — translucent spirit frog: inflating throat, big round eyes on
// top, leaps on a coil; splits into tadpoles.
function spFrog(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const coil = ph === 'windup' ? 1 : 0;
  const air = ph === 'burst' ? 1 : 0;
  const skin = { ...pal, light: '#d8fff0', primary: '#5ce0b0', shade: '#1a7a5a', dark: '#06281c' };
  ctx.translate(0, r * 0.4); ctx.scale(1 + coil * 0.2 - air * 0.15, 1 - coil * 0.2 + air * 0.2); ctx.translate(0, -r * 0.4);
  // legs
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.55, r * 0.35); ctx.rotate(side * (air ? 0.9 : 0.2));
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.18, side * 0.4, 0, SP_TAU); }, skin, r * 0.4);
    ctx.restore();
  }
  ctx.globalAlpha = A * 0.9;
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.75, r * 0.55, 0, 0, SP_TAU); }, skin, r);
  ctx.globalAlpha = A;
  // throat sac pulses
  const sac = 0.5 + 0.5 * Math.sin(t * 4 + m.seed);
  ctx.fillStyle = '#c8fff0'; ctx.globalAlpha = A * 0.7;
  ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * (0.25 + sac * 0.12), r * (0.15 + sac * 0.08), 0, 0, SP_TAU); ctx.fill(); ctx.globalAlpha = A;
  // spirit spots
  for (const [x, y] of [[-0.4, -0.05], [0.35, 0.0], [0.1, -0.25]]) drawGlow(ctx, x * r, y * r, r * 0.12, pal.glow, 0.6);
  // eyes on top
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.arc(side * r * 0.3, -r * 0.38, r * 0.2, 0, SP_TAU); }, skin, r * 0.25);
  crEyes(ctx, 0, -r * 0.4, r * 0.13, r * 0.3, look, crBlink(m, t), '#06281c', 0, '#06281c');
  ctx.strokeStyle = skin.dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.12); ctx.quadraticCurveTo(0, r * 0.26, r * 0.35, r * 0.12); ctx.stroke();
}

// Tadpole — wriggling spirit tadpole (Ghost Frog's children).
function spTadpole(ctx, m, pal, t, look) {
  const r = m.r;
  ctx.strokeStyle = '#5ce0b0'; ctx.lineWidth = r * 0.25; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, r * 0.3);
  for (let k = 1; k <= 4; k++) ctx.lineTo(Math.sin(t * 12 - k + m.seed) * r * 0.2 * k * 0.5, r * 0.3 + k * r * 0.22);
  ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.55, 0, 0, SP_TAU); }, { ...pal, light: '#d8fff0', primary: '#5ce0b0', shade: '#1a7a5a', dark: '#06281c' }, r);
  crEyes(ctx, 0, -r * 0.1, r * 0.15, r * 0.24, look, crBlink(m, t), '#06281c', 0, '#06281c');
}

// Spectral Toucan — ghostly toucan with a huge glowing rainbow beak;
// swoops in long arcs.
function spToucan(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 22 : 12) + m.seed);
  const plume = { ...pal, light: '#9a8ac8', primary: '#3a2a5a', shade: '#160e26', dark: '#06030c', rim: '#e4c8ff' };
  drawGlow(ctx, 0, 0, r * 1.5, '#a680d8', 0.3);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(-0.2 + flap * 0.5);
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(r * 0.7, 0, r * 0.6, r * 0.22, 0.2, 0, SP_TAU); }, plume, r * 0.7);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.38, r * 0.5, 0, 0, SP_TAU); }, plume, r * 0.6);
  ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.25, r * 0.2, 0, 0, SP_TAU); ctx.fill();
  // giant rainbow beak
  const g = ctx.createLinearGradient(0, -r * 0.05, 0, r * 0.9);
  g.addColorStop(0, '#ffd23d'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#ff3a6a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.05); ctx.quadraticCurveTo(r * 0.25, r * 0.2, r * 0.05, r * 0.95); ctx.quadraticCurveTo(-r * 0.05, r * 0.4, -r * 0.15, -r * 0.05); ctx.fill();
  drawGlow(ctx, r * 0.02, r * 0.4, r * 0.25, '#ffb35c', 0.4);
  crEyes(ctx, 0, -r * 0.2, r * 0.09, r * 0.14, look, crBlink(m, t), '#06030c', 0, '#06030c');
}

// Tiki Shaman — carved wooden mask over a grass-skirted spirit, feather
// headdress, bone staff with a spirit flame it hurls.
function spTiki(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.8);
  ctx.translate(0, Math.abs(step) * r * 0.05);
  // grass skirt
  ctx.strokeStyle = '#8ab85a'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const x = -r * 0.4 + i * r * 0.1; ctx.beginPath(); ctx.moveTo(x, r * 0.15); ctx.lineTo(x + Math.sin(t * 5 + i) * r * 0.05, r * 0.75); ctx.stroke(); }
  // spirit body
  ctx.globalAlpha = A * 0.85;
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.35, r * 0.3, 0, 0, SP_TAU); }, { ...pal, light: '#f0e0ff', primary: '#a680d8', shade: '#4a2a7a', dark: '#1a0a30' }, r * 0.5);
  ctx.globalAlpha = A;
  // feather headdress
  for (let i = -3; i <= 3; i++) {
    ctx.save(); ctx.translate(0, -r * 0.55); ctx.rotate(i * 0.28);
    ctx.fillStyle = ['#ff5c3d', '#ffd23d', '#3ab86a', '#3a8ad8'][(i + 3) % 4];
    ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.08, r * 0.3, 0, 0, SP_TAU); ctx.fill(); ctx.restore();
  }
  // carved mask
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.32, -r * 0.8, r * 0.64, r * 0.75, r * 0.12); }, { ...pal, light: '#c8945a', primary: '#8a5a2a', shade: '#4a2a10', dark: '#1a0a04' }, r * 0.6);
  ctx.strokeStyle = '#1a0a04'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.6); ctx.lineTo(r * 0.25, -r * 0.6); ctx.stroke();
  for (const side of [-1, 1]) { ctx.fillStyle = '#1a0a04'; ctx.beginPath(); ctx.ellipse(side * r * 0.12, -r * 0.48, r * 0.09, r * 0.07, 0, 0, SP_TAU); ctx.fill(); drawGlow(ctx, side * r * 0.12, -r * 0.48, r * 0.1, pal.glow, 0.95); }
  ctx.fillStyle = '#1a0a04'; ctx.fillRect(-r * 0.2, -r * 0.28, r * 0.4, r * 0.1);
  ctx.fillStyle = '#fff4e0'; for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.18 + i * r * 0.1, -r * 0.28, r * 0.05, r * 0.05);
  // bone staff + spirit flame
  const raise = m.windup;
  ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.6); ctx.lineTo(r * 0.5, -r * 0.65 - raise * r * 0.2); ctx.stroke();
  for (let i = 0; i < 3; i++) drawGlow(ctx, r * 0.5 + Math.sin(t * 10 + i) * r * 0.04, -r * (0.75 + i * 0.12) - raise * r * 0.2, r * (0.14 + raise * 0.1 - i * 0.02), pal.glow, 0.8);
}

// Spirit Gorilla — massive ghost-silverback: knuckle-walking, glowing tribal
// marks, beats its chest (windup) before smashing the ground.
function spGorilla(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  const fur = { ...pal, light: '#8a7aa8', primary: '#3a2e52', shade: '#1a1228', dark: '#06040c', rim: pal.glow };
  const beat = ph === 'windup' ? Math.abs(Math.sin(t * 16)) : 0;
  ctx.translate(0, Math.abs(step) * r * 0.07);
  // knuckle arms
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.7, -r * 0.15);
    ctx.rotate(side * (ph === 'windup' ? -2.0 + beat * 0.5 : 0.25 + step * side * 0.15));
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.17, 0, r * 0.34, r * 0.75, r * 0.15); }, fur, r * 0.4);
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, r * 0.8, r * 0.18, 0, SP_TAU); }, fur, r * 0.2);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.72, r * 0.62, 0, 0, SP_TAU); }, fur, r);
  // chest + glowing tribal marks
  ctx.fillStyle = '#5a4a72'; ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.42, r * 0.35, 0, 0, SP_TAU); ctx.fill();
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 1.6; ctx.globalAlpha = A * (0.6 + beat * 0.4);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.25); ctx.lineTo(-r * 0.3, r * 0.45); ctx.moveTo(r * 0.3, r * 0.05); ctx.lineTo(r * 0.1, r * 0.25); ctx.lineTo(r * 0.3, r * 0.45); ctx.stroke();
  ctx.globalAlpha = A;
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.34, r * 0.3, 0, 0, SP_TAU); }, fur, r * 0.4);
  ctx.fillStyle = '#6a5a82'; ctx.beginPath(); ctx.ellipse(0, -r * 0.38, r * 0.24, r * 0.18, 0, 0, SP_TAU); ctx.fill();
  const rage = ph === 'windup' ? 1 : m.windup;
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.12, -r * 0.52, r * (0.08 + rage * 0.06), pal.glow, 1); }
  ctx.strokeStyle = fur.dark; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.6); ctx.lineTo(r * 0.25, -r * 0.6); ctx.stroke();
  ctx.fillStyle = fur.dark; ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.12, r * (0.03 + rage * 0.05), 0, 0, SP_TAU); ctx.fill();
}

// Kaizoa — the Jade Serpent boss: coiled spectral serpent with a hooded
// cobra head, jade scales, rattling tail; fangs bared before volleys.
function spSerpent(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a6a' : '#7affc8';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const jade = { ...pal, light: '#c8ffe0', primary: '#3ab880', shade: '#145a3a', dark: '#04201a' };
  // coils (back to front)
  for (let i = 3; i >= 0; i--) {
    const y = r * (0.75 - i * 0.18), w = r * (0.95 - i * 0.12);
    const sx = Math.sin(t * 1.5 + i) * r * 0.08;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(sx, y, w, r * 0.2, 0, 0, SP_TAU); }, jade, r * 0.6);
    ctx.strokeStyle = 'rgba(4,32,26,0.5)'; ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.arc(sx + k * w * 0.25, y, r * 0.06, 0, Math.PI); ctx.stroke(); }
  }
  // rattling tail tip
  crGem(ctx, r * 0.95 + Math.sin(t * 20) * r * 0.03, r * 0.7, r * 0.08, r * 0.18, glow, A);
  // neck rising + hood
  const sway = Math.sin(t * 1.2) * r * 0.08;
  ctx.save(); ctx.translate(sway, -r * 0.2);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.5); ctx.quadraticCurveTo(0, r * 0.1, -r * 0.12, -r * 0.2); ctx.lineTo(r * 0.12, -r * 0.2); ctx.quadraticCurveTo(0, r * 0.1, r * 0.25, r * 0.5); ctx.closePath(); }, jade, r * 0.5);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.bezierCurveTo(r * 0.75, -r * 0.7, r * 0.6, -r * 0.05, 0, r * 0.05); ctx.bezierCurveTo(-r * 0.6, -r * 0.05, -r * 0.75, -r * 0.7, 0, -r * 0.8); ctx.closePath(); }, jade, r * 0.8);
  // hood pattern
  ctx.strokeStyle = glow; ctx.globalAlpha = A * 0.6; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.4, r * 0.1, 0, SP_TAU); ctx.moveTo(r * 0.35, -r * 0.4); ctx.arc(r * 0.25, -r * 0.4, r * 0.1, 0, SP_TAU); ctx.stroke(); ctx.globalAlpha = A;
  // head
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.22, r * 0.26, 0, 0, SP_TAU); }, jade, r * 0.3);
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.09, -r * 0.38, r * (0.08 + heave * 0.06), glow, 1); ctx.fillStyle = '#04201a'; ctx.beginPath(); ctx.ellipse(side * r * 0.09, -r * 0.38, r * 0.015, r * 0.05, 0, 0, SP_TAU); ctx.fill(); }
  // fangs + flicking tongue
  ctx.fillStyle = '#04201a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.1, r * (0.02 + heave * 0.06), 0, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.07, -r * 0.16); ctx.lineTo(side * r * 0.05, -r * 0.07 + heave * r * 0.04); ctx.lineTo(side * r * 0.03, -r * 0.16); ctx.closePath(); ctx.fill(); }
  if (Math.sin(t * 3) > 0.5) { ctx.strokeStyle = '#ff3a6a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.lineTo(0, -r * 0.0); ctx.lineTo(-r * 0.04, r * 0.04); ctx.moveTo(0, 0); ctx.lineTo(r * 0.04, r * 0.04); ctx.stroke(); }
  if (heave > 0.1) drawGlow(ctx, 0, -r * 0.12, r * 0.3 * heave, glow, heave);
  ctx.restore();
}

// ------------------------------------------------- CROWN OF THE MOUNTAIN ----

// Ram — shaggy mountain goat with curled horns; lowers its head and
// charges on a dash.
function spRam(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 3.8 : 2.4);
  const butt = ph === 'windup' || ph === 'burst' ? 1 : 0;
  const wool = { ...pal, light: '#ffffff', primary: '#e0dcd0', shade: '#9a9488', dark: '#3a3630' };
  for (const [x, p] of [[-0.4, 0], [-0.15, Math.PI], [0.15, 0], [0.4, Math.PI]]) {
    ctx.strokeStyle = '#4a4440'; ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(x * r, r * 0.35); ctx.lineTo(x * r + Math.sin(run + p) * r * 0.1, r * 0.8); ctx.stroke();
  }
  crShade(ctx, () => spFurBall(ctx, r * 0.7, wool, m.seed, t), wool, r);
  // head (lowered for the charge)
  ctx.save(); ctx.translate(0, -r * 0.35 + butt * r * 0.25);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.34, 0, 0, SP_TAU); }, { ...pal, light: '#b8a890', primary: '#7a6a52', shade: '#3a3022', dark: '#140e08' }, r * 0.4);
  // curled horns
  ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * r * 0.3, -r * 0.1, r * 0.2, side > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1, side > 0 ? Math.PI * 0.6 : Math.PI * 1.4, side < 0); ctx.stroke(); }
  crEyes(ctx, 0, -r * 0.05, r * 0.08, r * 0.14, look, crBlink(m, t), '#140e08', 1 + butt, '#140e08');
  ctx.fillStyle = '#140e08'; ctx.beginPath(); ctx.arc(-r * 0.05, r * 0.2, 1.4, 0, SP_TAU); ctx.arc(r * 0.05, r * 0.2, 1.4, 0, SP_TAU); ctx.fill();
  ctx.restore();
}

// Boulder — a rolling rock with a grumpy face, moss on top; cracks into
// pebbles.
function spBoulder(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const roll = m.anim * 0.4;
  const rock = { ...pal, light: '#c8c8d0', primary: '#8a8a96', shade: '#4a4a56', dark: '#16161c' };
  ctx.save(); ctx.rotate(roll);
  crShade(ctx, () => {
    ctx.beginPath();
    const pts = 9;
    for (let i = 0; i < pts; i++) { const a = (i / pts) * SP_TAU; const rr = r * (0.82 + ((i * 37 + Math.floor(m.seed)) % 5) * 0.04); if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
  }, rock, r);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.3); ctx.lineTo(-r * 0.1, r * 0.1); ctx.lineTo(r * 0.3, r * 0.45); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#5a8a4a'; ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.65, r * 0.35, r * 0.12, -0.2, 0, SP_TAU); ctx.fill();
  crEyes(ctx, 0, -r * 0.1, r * 0.15, r * 0.25, look, crBlink(m, t), '#16161c', 1.2, '#16161c');
  ctx.strokeStyle = '#16161c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.15, Math.PI + 0.4, -0.4); ctx.stroke();
}

// Pebble — small hopping stone (Boulder's children).
function spPebble(ctx, m, pal, t, look) {
  const r = m.r;
  ctx.translate(0, -Math.abs(Math.sin(m.anim * 3)) * r * 0.15);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.75, r * 0.6, 0.2, 0, SP_TAU); }, { ...pal, light: '#c8c8d0', primary: '#8a8a96', shade: '#4a4a56', dark: '#16161c' }, r);
  crEyes(ctx, 0, -r * 0.05, r * 0.14, r * 0.22, look, crBlink(m, t), '#16161c', 0.6, '#16161c');
}

// Royal Guard — plate-armored halberdier with a red plume and tabard
// bearing the crown; levels the halberd to fire.
function spGuard(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.7);
  const steel = { ...pal, light: '#ffffff', primary: '#b8bcc8', shade: '#5a5e6a', dark: '#1a1c22' };
  for (const side of [-1, 1]) { const sw = side * step * 0.35; crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(side * r * 0.2 - r * 0.11 + Math.sin(sw) * r * 0.15, r * 0.35, r * 0.22, r * 0.5, r * 0.06); }, steel, r * 0.4); }
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.4, -r * 0.32, r * 0.8, r * 0.75, r * 0.15); }, steel, r * 0.8);
  // tabard with crown
  ctx.fillStyle = '#a82a3a'; ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.28); ctx.lineTo(r * 0.25, -r * 0.28); ctx.lineTo(r * 0.22, r * 0.5); ctx.lineTo(0, r * 0.6); ctx.lineTo(-r * 0.22, r * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.1); ctx.lineTo(-r * 0.12, -r * 0.05); ctx.lineTo(-r * 0.06, r * 0.02); ctx.lineTo(0, -r * 0.08); ctx.lineTo(r * 0.06, r * 0.02); ctx.lineTo(r * 0.12, -r * 0.05); ctx.lineTo(r * 0.12, r * 0.1); ctx.closePath(); ctx.fill();
  // halberd
  const aim = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  ctx.save(); ctx.translate(r * 0.48, r * 0.1); ctx.rotate(-0.1 - aim * 0.7);
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(0, -r * 1.0); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(r * 0.35, -r * 0.85, r * 0.3, -r * 0.55); ctx.lineTo(0, -r * 0.6); ctx.closePath(); }, steel, r * 0.3);
  crGem(ctx, 0, -r * 1.05, r * 0.06, r * 0.2, '#d8dde8', A);
  if (m.fireFlash > 0) drawGlow(ctx, 0, -r * 1.0, r * 0.3, '#ffffff', 1);
  ctx.restore();
  // great helm + plume
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.26, -r * 0.82, r * 0.52, r * 0.5, r * 0.12); }, steel, r * 0.35);
  ctx.fillStyle = '#1a1c22'; ctx.fillRect(-r * 0.2, -r * 0.62, r * 0.4, r * 0.06); ctx.fillRect(-r * 0.03, -r * 0.62, r * 0.06, r * 0.2);
  drawGlow(ctx, 0, -r * 0.6, r * 0.12, pal.glow, 0.7);
  ctx.fillStyle = '#c8303a';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.quadraticCurveTo(-r * 0.4 + Math.sin(t * 4) * r * 0.05, -r * 1.15, -r * 0.5, -r * 0.7); ctx.quadraticCurveTo(-r * 0.2, -r * 0.95, 0, -r * 0.82); ctx.fill();
}

// Hill Ogre — big-bellied ogre with a tree-trunk club, rope belt and one
// tooth; heaves the trunk overhead to slam.
function spOgre(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  ctx.translate(0, Math.abs(step) * r * 0.07);
  const skin = { ...pal, light: '#c8d8a0', primary: '#8aa05a', shade: '#4a5a2a', dark: '#1a220a' };
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.42, r * 0.78 - (side * step > 0 ? step * r * 0.15 : 0), r * 0.26, r * 0.15, 0, 0, SP_TAU); }, { ...skin, primary: '#6a4a2a', light: '#a8845a', shade: '#3a2614' }, r * 0.35);
  const raise = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : ph === 'burst' ? -0.3 : m.windup;
  ctx.save(); ctx.translate(r * 0.65, -r * 0.05); ctx.rotate(-0.45 - raise * 2.4 + step * 0.15);
  ctx.strokeStyle = skin.primary; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.5); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.14, r * 0.45, r * 0.28, r * 0.85, r * 0.1); }, { ...skin, light: '#a8845a', primary: '#6a4a2a', shade: '#3a2614', dark: '#1a1008' }, r * 0.4);
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.82, r * 0.72, 0, 0, SP_TAU); }, skin, r);
  ctx.fillStyle = skin.light; ctx.globalAlpha = A * 0.5; ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.5, r * 0.38, 0, 0, SP_TAU); ctx.fill(); ctx.globalAlpha = A;
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(-r * 0.75, r * 0.45); ctx.quadraticCurveTo(0, r * 0.6, r * 0.75, r * 0.45); ctx.stroke();
  ctx.save(); ctx.translate(-r * 0.72, -r * 0.05); ctx.rotate(0.45 + step * 0.3 + (ph === 'windup' ? 0.7 : 0));
  ctx.strokeStyle = skin.primary; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.55); ctx.stroke(); ctx.restore();
  // face: small head on the bulk
  const rage = ph === 'windup' ? 1 : m.windup;
  crEyes(ctx, 0, -r * 0.32, r * 0.11, r * 0.17, look, crBlink(m, t), '#1a220a', 1.2 + rage, skin.dark);
  ctx.fillStyle = skin.shade; ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.12, r * 0.08, 0, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#1a220a'; ctx.beginPath(); ctx.ellipse(0, r * 0.02, r * 0.22, r * (0.05 + rage * 0.06), 0, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#fff8e0'; ctx.fillRect(r * 0.05, -r * 0.02, r * 0.07, r * 0.1);
}

// Vargrum — the Mountain King boss: towering dwarf-giant with a jeweled
// crown, braided beard, rune hammer; his runes ignite before volleys.
function spMountainKing(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff4d5a' : '#7fd8ff';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const steel = { ...pal, light: '#ffffff', primary: '#a8acb8', shade: '#4a4e5a', dark: '#14161c' };
  // rune hammer (right)
  ctx.save(); ctx.translate(r * 0.85, r * 0.0); ctx.rotate(-0.5 - heave * 1.2 + Math.sin(t * 1.5) * 0.1);
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.lineTo(0, -r * 0.7); ctx.stroke();
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.35, -r * 0.95, r * 0.7, r * 0.35, r * 0.06); }, steel, r * 0.5);
  ctx.strokeStyle = glow; ctx.lineWidth = 1.6; ctx.globalAlpha = A * (0.5 + heave * 0.5);
  ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.85); ctx.lineTo(-r * 0.1, -r * 0.7); ctx.lineTo(0, -r * 0.85); ctx.lineTo(r * 0.1, -r * 0.7); ctx.lineTo(r * 0.2, -r * 0.85); ctx.stroke(); ctx.globalAlpha = A;
  ctx.restore();
  // fist (left)
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(-r * 0.85, r * 0.45, r * 0.2, 0, SP_TAU); }, { ...pal, light: '#ffd8b0', primary: '#d89a6a', shade: '#8a5a30', dark: '#3a2010' }, r * 0.25);
  // armored body
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.78, r * 0.68, 0, 0, SP_TAU); }, steel, r);
  crGem(ctx, 0, r * 0.3, r * 0.1, r * 0.16, glow, A);
  // face
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.34, r * 0.3, 0, 0, SP_TAU); }, { ...pal, light: '#ffd8b0', primary: '#d89a6a', shade: '#8a5a30', dark: '#3a2010' }, r * 0.4);
  for (const side of [-1, 1]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(side * r * 0.12, -r * 0.35, r * 0.07, r * 0.05, 0, 0, SP_TAU); ctx.fill(); drawGlow(ctx, side * r * 0.12, -r * 0.35, r * (0.05 + heave * 0.08), glow, 0.9); ctx.fillStyle = '#14161c'; ctx.beginPath(); ctx.arc(side * r * 0.12 + look.x * r * 0.02, -r * 0.35, r * 0.03, 0, SP_TAU); ctx.fill(); }
  ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.24, -r * 0.48); ctx.lineTo(side * r * 0.04, -r * 0.42); ctx.stroke(); }
  // braided beard
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.25); ctx.quadraticCurveTo(-r * 0.3, r * 0.2, -r * 0.12, r * 0.5); ctx.lineTo(0, r * 0.38); ctx.lineTo(r * 0.12, r * 0.5); ctx.quadraticCurveTo(r * 0.3, r * 0.2, r * 0.32, -r * 0.25); ctx.quadraticCurveTo(0, -r * 0.1, -r * 0.32, -r * 0.25); ctx.fill();
  ctx.fillStyle = '#ffd23d'; for (const side of [-1, 1]) ctx.fillRect(side * r * 0.12 - r * 0.04, r * 0.3, r * 0.08, r * 0.05);
  ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.ellipse(0, -r * 0.13, r * 0.1, r * (0.02 + heave * 0.05), 0, 0, SP_TAU); ctx.fill();
  // jeweled crown
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 0.52);
  for (let i = 0; i <= 4; i++) { const x = -r * 0.34 + i * r * 0.17; ctx.lineTo(x, i % 2 ? -r * 0.68 : -r * 0.86); }
  ctx.lineTo(r * 0.34, -r * 0.52); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6410'; ctx.lineWidth = 1.2; ctx.stroke();
  for (const [x, c] of [[-0.17, '#ff5c7a'], [0, glow], [0.17, '#58e07f']]) crGem(ctx, x * r, -r * 0.6, r * 0.05, r * 0.08, c, A);
}

// ------------------------------------------------------------ DEEPWOOD ----

// Boar — tusked forest boar with a bristly mane; paws the ground then
// charges on a dash.
function spBoar(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 4 : 2.6);
  const paw = ph === 'windup' ? Math.sin(t * 25) * r * 0.08 : 0;
  const hide = { ...pal, light: '#a88a6a', primary: '#6a4a32', shade: '#3a2414', dark: '#140a04' };
  for (const [x, p] of [[-0.42, 0], [-0.15, Math.PI], [0.15, 0], [0.42, Math.PI]]) { ctx.strokeStyle = hide.dark; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(x * r, r * 0.3); ctx.lineTo(x * r + Math.sin(run + p) * r * 0.1, r * 0.8 + (x > 0 ? paw : 0)); ctx.stroke(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.75, r * 0.5, 0, 0, SP_TAU); }, hide, r);
  // bristle mane
  ctx.fillStyle = hide.dark;
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.12 - r * 0.05, -r * 0.3); ctx.lineTo(i * r * 0.12, -r * 0.55 + Math.abs(i) * r * 0.04); ctx.lineTo(i * r * 0.12 + r * 0.05, -r * 0.3); ctx.closePath(); ctx.fill(); }
  // head + snout + tusks
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.36, r * 0.32, 0, 0, SP_TAU); }, hide, r * 0.45);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.08, r * 0.2, r * 0.14, 0, 0, SP_TAU); }, { ...hide, light: '#e8b8a0', primary: '#c8806a', shade: '#7a4a3a' }, r * 0.25);
  ctx.fillStyle = hide.dark; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.07, r * 0.08, r * 0.03, r * 0.05, 0, 0, SP_TAU); ctx.fill(); }
  ctx.fillStyle = '#fff8e0';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.16, r * 0.15); ctx.quadraticCurveTo(side * r * 0.32, r * 0.05, side * r * 0.3, -r * 0.12); ctx.lineTo(side * r * 0.22, r * 0.08); ctx.closePath(); ctx.fill(); }
  crEyes(ctx, 0, -r * 0.25, r * 0.08, r * 0.15, look, crBlink(m, t), '#140a04', 1.4, hide.dark);
}

// Spore Puff — a plump puffball mushroom that wheezes clouds of spores;
// bursts into floating spores.
function spPuff(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const swell = ph === 'windup' ? 0.2 : Math.sin(t * 3 + m.seed) * 0.05;
  for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3 + m.seed) % 1; drawGlow(ctx, Math.sin(i * 2 + t) * r * 0.4, -r * 0.6 - p * r, r * (0.2 + p * 0.3), pal.glow, 0.35 * (1 - p)); }
  ctx.save(); ctx.scale(1 + swell, 1 + swell);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.75, 0, 0, SP_TAU); }, { ...pal, light: '#fff8e8', primary: '#e8d8b0', shade: '#9a8a60', dark: '#3a3020' }, r);
  ctx.fillStyle = '#c8b890';
  for (const [x, y, s] of [[-0.4, -0.35, 0.08], [0.2, -0.5, 0.06], [0.45, -0.1, 0.07], [-0.15, -0.15, 0.05]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SP_TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#8ab85a'; ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 0.6, r * 0.12, 0, 0, SP_TAU); ctx.fill();
  crEyes(ctx, 0, r * 0.05, r * 0.13, r * 0.22, look, crBlink(m, t), '#3a3020', 0, '#3a3020');
  ctx.fillStyle = '#3a3020'; ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.08, r * (0.04 + swell * 0.3), 0, 0, SP_TAU); ctx.fill();
}

// Spore — drifting glowing spore with a tiny face (Spore Puff's children).
function spSpore(ctx, m, pal, t, look) {
  const r = m.r;
  drawGlow(ctx, 0, 0, r * 1.3, pal.glow, 0.5);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#c8f0a0', shade: '#6a9a40', dark: '#1a2a0a' }, r);
  ctx.strokeStyle = '#c8f0a0'; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const a = i + t; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65); ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.stroke(); }
  crEyes(ctx, 0, 0, r * 0.14, r * 0.2, look, crBlink(m, t), '#1a2a0a', 0, '#1a2a0a');
}

// Mantis Warrior — towering stick-insect blademaster: triangle head with
// compound eyes, folded scythe arms that rise before it slashes a shot.
function spMantis(ctx, m, pal, t) {
  const r = m.r, A = ctx.globalAlpha;
  const step = Math.sin(m.anim * 1.8);
  const chitin = { ...pal, light: '#c8f0a0', primary: '#6ab84a', shade: '#2a5a1a', dark: '#0a1a04' };
  ctx.strokeStyle = chitin.shade; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 2; i++) { const sw = Math.sin(m.anim * 1.8 + i * Math.PI + (side > 0 ? 0 : Math.PI)) * r * 0.1; ctx.beginPath(); ctx.moveTo(side * r * 0.1, r * (0.2 + i * 0.15)); ctx.lineTo(side * r * 0.45, r * (0.35 + i * 0.15)); ctx.lineTo(side * r * 0.5 + sw, r * (0.8 + i * 0.05)); ctx.stroke(); }
  // abdomen + thorax
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.22, r * 0.35, 0, 0, SP_TAU); }, chitin, r * 0.4);
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.1, -r * 0.4, r * 0.2, r * 0.6, r * 0.08); }, chitin, r * 0.35);
  // scythe arms
  const raise = m.windup;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.1, -r * 0.25); ctx.rotate(side * (0.4 - raise * 0.9) + step * 0.08);
    ctx.strokeStyle = chitin.primary; ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * r * 0.35, -r * 0.25); ctx.stroke();
    ctx.strokeStyle = '#e8ffd8'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.moveTo(side * r * 0.35, -r * 0.25); ctx.quadraticCurveTo(side * r * 0.55, r * 0.05, side * r * 0.4, r * 0.3); ctx.stroke();
    if (raise > 0) drawGlow(ctx, side * r * 0.45, 0, r * 0.15 * raise, pal.glow, raise);
    ctx.restore();
  }
  // triangle head
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.65); ctx.lineTo(r * 0.32, -r * 0.65); ctx.lineTo(0, -r * 0.32); ctx.closePath(); }, chitin, r * 0.35);
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.22, -r * 0.62, r * 0.12, pal.glow, 0.8); ctx.fillStyle = '#e8ffd8'; ctx.beginPath(); ctx.ellipse(side * r * 0.22, -r * 0.62, r * 0.09, r * 0.07, 0, 0, SP_TAU); ctx.fill(); }
  ctx.strokeStyle = chitin.dark; ctx.lineWidth = 1;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.08, -r * 0.65); ctx.quadraticCurveTo(side * r * 0.2, -r * 1.0, side * r * 0.35, -r * 1.0 + Math.sin(t * 5 + side) * r * 0.04); ctx.stroke(); }
}

// Moss Bear — huge bear grown over with moss and toadstools; rears up on
// its hind legs before slamming its paws down.
function spMossBear(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.2);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const fur = { ...pal, light: '#a88a6a', primary: '#6a4a2e', shade: '#3a2614', dark: '#140a04' };
  ctx.translate(0, Math.abs(step) * r * 0.07 - rear * r * 0.15);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.62, -r * 0.05); ctx.rotate(side * (rear ? -2.2 : 0.3 + step * side * 0.15));
    crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.17, 0, r * 0.34, r * 0.65, r * 0.15); }, fur, r * 0.4);
    ctx.fillStyle = '#e8dcc8'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.08, r * 0.65); ctx.lineTo(i * r * 0.08 + r * 0.02, r * 0.78); ctx.lineTo(i * r * 0.08 + r * 0.04, r * 0.65); ctx.fill(); }
    ctx.restore();
  }
  crShade(ctx, () => spFurBall(ctx, r * 0.85, fur, m.seed, t), fur, r);
  // moss blanket + toadstools
  ctx.fillStyle = '#5a8a3a';
  ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.55, r * 0.55, r * 0.2, -0.1, 0, SP_TAU); ctx.fill();
  for (const [x, y] of [[-0.45, -0.7], [0.2, -0.72]]) { ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x * r - 1.5, y * r, 3, r * 0.12); ctx.fillStyle = '#d83a3a'; ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.1, r * 0.06, 0, Math.PI, 0); ctx.fill(); }
  // face
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.36, r * 0.32, 0, 0, SP_TAU); }, fur, r * 0.45);
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.arc(side * r * 0.3, -r * 0.42, r * 0.11, 0, SP_TAU); }, fur, r * 0.12);
  ctx.fillStyle = '#c8a882'; ctx.beginPath(); ctx.ellipse(0, -r * 0.03, r * 0.17, r * 0.13, 0, 0, SP_TAU); ctx.fill();
  const rage = rear || m.windup;
  crEyes(ctx, 0, -r * 0.22, r * 0.08, r * 0.15, look, crBlink(m, t), '#140a04', 1 + rage, fur.dark);
  ctx.fillStyle = '#140a04'; ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.06, r * 0.04, 0, 0, SP_TAU); ctx.fill();
  if (rage) { ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.1, r * 0.06 * rage, 0, 0, SP_TAU); ctx.fill(); }
}

// Verdant — the Wild Heart boss: a colossal flytrap bloom on a thorny
// vine body; its jaws gape wide and glow before volleys.
function spFlytrap(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff3a4a' : '#d8ff7a';
  const heave = Math.max(m.windup, m.fireFlash > 0 ? 1 : 0);
  const leaf = { ...pal, light: '#c8f0a0', primary: '#4aa040', shade: '#1a5a1a', dark: '#062006' };
  // writhing vines
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1, k = i % 3;
    ctx.strokeStyle = leaf.shade; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.5);
    ctx.bezierCurveTo(side * r * (0.4 + k * 0.2), r * 0.9, side * r * (0.8 + k * 0.1) + Math.sin(t * 2 + i) * r * 0.1, r * (0.3 - k * 0.3), side * r * (1.0 + k * 0.05), r * (0.6 - k * 0.4) + Math.sin(t * 2.5 + i) * r * 0.1);
    ctx.stroke();
    crGem(ctx, side * r * (1.0 + k * 0.05), r * (0.6 - k * 0.4) + Math.sin(t * 2.5 + i) * r * 0.1, r * 0.06, r * 0.14, '#e8ffd8', A);
  }
  // leafy collar
  for (let i = 0; i < 8; i++) { const a = (i / 8) * SP_TAU; ctx.save(); ctx.translate(Math.cos(a) * r * 0.55, r * 0.35 + Math.sin(a) * r * 0.18); ctx.rotate(a + Math.PI / 2); crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.15, r * 0.35, 0, 0, SP_TAU); }, leaf, r * 0.35); ctx.restore(); }
  // jaws — an upper and lower lobe that gape apart around a glowing
  // gullet, interlocking teeth on each inner rim
  const gape = r * (0.08 + heave * 0.22 + Math.sin(t * 2) * 0.02);
  drawGlow(ctx, 0, r * 0.05, r * (0.25 + heave * 0.35), glow, 0.7 + heave * 0.3);
  ctx.fillStyle = '#3a0a0a';
  ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.5, gape + r * 0.04, 0, 0, SP_TAU); ctx.fill();
  for (const side of [-1, 1]) {
    const y0 = r * 0.05 + side * gape;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, y0, r * 0.62, r * 0.34, 0, side < 0 ? Math.PI : 0, side < 0 ? SP_TAU : Math.PI); ctx.closePath(); },
      { ...leaf, primary: side < 0 ? '#5ab84a' : '#3a8a3a', light: '#c8f0a0', shade: '#1a5a1a' }, r * 0.6);
    // red inner rim
    ctx.strokeStyle = '#d84a4a'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, y0); ctx.lineTo(r * 0.6, y0); ctx.stroke();
    ctx.fillStyle = '#fff8e0';
    for (let k = -3; k <= 3; k++) {
      const x = k * r * 0.16 + (side > 0 ? r * 0.08 : 0);
      ctx.beginPath(); ctx.moveTo(x - r * 0.04, y0); ctx.lineTo(x, y0 - side * r * 0.13); ctx.lineTo(x + r * 0.04, y0); ctx.closePath(); ctx.fill();
    }
  }
  // eyes on the upper lip
  for (const side of [-1, 1]) { drawGlow(ctx, side * r * 0.3, -r * 0.42, r * 0.1, glow, 1); ctx.fillStyle = '#062006'; ctx.beginPath(); ctx.ellipse(side * r * 0.3, -r * 0.42, r * 0.02, r * 0.06, 0, 0, SP_TAU); ctx.fill(); }
}

// ------------------------------------------------- fillers for every cast ----
// The flyer and brute roles each stage was still borrowing from the crystal
// cast: an angler and a reef turtle for the deep, bats for ice and fire, a
// vulture and a giant scorpion for the desert, a clockwork drone, a war
// eagle and a deepwood dragonfly.

// Lanternfin — deep-sea angler: round body, toothy grin, a glowing lure on
// a stalk that flares as it charges a shot, fins fanning as it swims.
function spLanternfin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fan = Math.sin(t * 9 + m.seed);
  ctx.save(); ctx.translate(0, -r * 0.75); ctx.rotate(fan * 0.25);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(-r * 0.45, -r * 0.45); ctx.quadraticCurveTo(0, -r * 0.25, r * 0.45, -r * 0.45); ctx.closePath(); }, { ...pal, primary: pal.shade }, r * 0.5);
  ctx.restore();
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * r * 0.78, r * 0.05); ctx.rotate(side * (0.3 + fan * 0.35));
    crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.15); ctx.quadraticCurveTo(side * r * 0.55, -r * 0.05, side * r * 0.45, r * 0.35); ctx.quadraticCurveTo(side * r * 0.2, r * 0.2, 0, r * 0.15); ctx.closePath(); }, pal, r * 0.4);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, SP_TAU); }, pal, r);
  ctx.fillStyle = pal.glow; ctx.globalAlpha = A * 0.4;
  for (const [sx, sy] of [[-0.55, 0.1], [0.55, 0.05], [-0.4, -0.45], [0.42, -0.42]]) { ctx.beginPath(); ctx.arc(sx * r, sy * r, r * 0.06, 0, SP_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  // jaws open wide as the shot charges
  const open = 0.35 + 0.65 * Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const mh = r * (0.05 + 0.18 * open), my = r * 0.34;
  ctx.fillStyle = '#0a0612';
  ctx.beginPath(); ctx.ellipse(0, my, r * 0.52, mh, 0, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#f4f0e0';
  for (let i = -3; i <= 3; i++) {
    const x = i * r * 0.13, w = r * 0.05;
    ctx.beginPath(); ctx.moveTo(x - w, my - mh); ctx.lineTo(x, my - mh + r * 0.12); ctx.lineTo(x + w, my - mh); ctx.fill();
    if (i > -3 && i < 3) { ctx.beginPath(); ctx.moveTo(x - w, my + mh); ctx.lineTo(x, my + mh - r * 0.1); ctx.lineTo(x + w, my + mh); ctx.fill(); }
  }
  crEyes(ctx, 0, -r * 0.15, r * 0.14, r * 0.3, look, crBlink(m, t), '#1a1030', 1, pal.dark);
  const lx = Math.sin(t * 2 + m.seed) * r * 0.2, ly = -r * 1.3;
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.quadraticCurveTo(r * 0.15, -r * 1.35, lx, ly); ctx.stroke();
  const pulse = 0.7 + 0.3 * Math.sin(t * 5 + m.seed) + (m.windup || 0) * 0.8;
  drawGlow(ctx, lx, ly, r * 0.5 * pulse, pal.glow, 0.9);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx, ly, r * 0.11, 0, SP_TAU); ctx.fill();
}

// Reefback — giant sea turtle: plated shell grown over with coral and
// barnacles, paddling flippers; tucks its head in before it fires.
function spTurtle(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const paddle = Math.sin(m.anim * 1.1);
  const skin = { ...pal, light: '#bfe8c0', primary: '#6aa878', shade: '#3a6a4a', dark: '#14281c' };
  for (const side of [-1, 1]) {
    for (const [fy, len, k] of [[-0.35, 0.75, 1], [0.45, 0.5, -1]]) {
      ctx.save(); ctx.translate(side * r * 0.68, fy * r); ctx.rotate(side * (0.5 + paddle * 0.35 * k));
      crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * len * 0.5, 0, r * len * 0.55, r * 0.17, 0, 0, SP_TAU); }, skin, r * 0.4);
      ctx.restore();
    }
  }
  const tuck = ph === 'windup' || (m.windup || 0) > 0.5 ? 0.14 : 0;
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * (0.8 - tuck), r * 0.3, r * 0.26, 0, 0, SP_TAU); }, skin, r * 0.35);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.82, r * 0.72, 0, 0, SP_TAU); }, pal, r);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1.2, r * 0.04); ctx.globalAlpha = A * 0.7;
  const hex = (cx, cy, s) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s * 0.85); }
    ctx.closePath(); ctx.stroke();
  };
  hex(0, -r * 0.08, r * 0.24);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hex(Math.cos(a) * r * 0.48, -r * 0.08 + Math.sin(a) * r * 0.4, r * 0.17); }
  ctx.globalAlpha = A;
  ctx.strokeStyle = '#ff7a8a'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
  for (const [cx, seed] of [[-0.35, 0], [0.3, 1.7]]) {
    const x = cx * r, y = -r * 0.55, sw = Math.sin(t * 2 + seed) * r * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + sw, y - r * 0.3);
    ctx.moveTo(x + sw * 0.5, y - r * 0.14); ctx.lineTo(x - r * 0.12 + sw, y - r * 0.27);
    ctx.moveTo(x + sw * 0.6, y - r * 0.18); ctx.lineTo(x + r * 0.12 + sw, y - r * 0.3);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8e0cc'; ctx.strokeStyle = pal.dark; ctx.lineWidth = 1;
  for (const [bx, by] of [[0.5, 0.25], [-0.55, 0.15], [0.1, 0.42]]) { ctx.beginPath(); ctx.arc(bx * r, by * r, r * 0.06, 0, SP_TAU); ctx.fill(); ctx.stroke(); }
  crEyes(ctx, 0, r * (0.84 - tuck), r * 0.08, r * 0.13, look, crBlink(m, t), '#0a1a10', 1 + (m.windup || 0), skin.dark);
}

// Bats — leathery wings on finger bones, fuzzy body, big ears and fangs.
// trim(ctx, r) draws a stage detail at each wing tip (icicle / flame).
function spBat(ctx, m, pal, t, look, trim) {
  const r = m.r;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 24 : 13) + m.seed);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * 0.35);
    const ky = -r * 0.55 + flap * r * 0.15, tipY = -r * 0.2 + flap * r * 0.35;
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.15);
      ctx.lineTo(r * 0.75, ky); ctx.lineTo(r * 1.35, tipY);
      ctx.quadraticCurveTo(r * 1.15, r * 0.15, r * 1.0, r * 0.3);
      ctx.quadraticCurveTo(r * 0.85, r * 0.1, r * 0.68, r * 0.3);
      ctx.quadraticCurveTo(r * 0.5, r * 0.12, r * 0.25, r * 0.25);
      ctx.closePath();
    }, { ...pal, primary: pal.shade }, r * 0.8);
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.moveTo(r * 0.75, ky); ctx.lineTo(r * 1.0, r * 0.3); ctx.moveTo(r * 0.75, ky); ctx.lineTo(r * 0.68, r * 0.3); ctx.stroke();
    if (trim) { ctx.save(); ctx.translate(r * 1.35, tipY); trim(ctx, r); ctx.restore(); }
    ctx.restore();
  }
  for (const side of [-1, 1]) crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.12, -r * 0.35); ctx.lineTo(side * r * 0.38, -r * 0.85); ctx.lineTo(side * r * 0.42, -r * 0.3); ctx.closePath(); }, pal, r * 0.4);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.5, 0, 0, SP_TAU); }, pal, r * 0.6);
  crEyes(ctx, 0, -r * 0.1, r * 0.12, r * 0.16, look, crBlink(m, t), '#1a0a10', 1 + (m.windup || 0), pal.dark);
  ctx.fillStyle = '#ffffff';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.11, r * 0.15); ctx.lineTo(side * r * 0.07, r * 0.3); ctx.lineTo(side * r * 0.03, r * 0.15); ctx.closePath(); ctx.fill(); }
}

// Rimewing — frost bat with icicle claws and a frost-crystal brow.
function spIceBat(ctx, m, pal, t, look) {
  const A = ctx.globalAlpha;
  spBat(ctx, m, pal, t, look, (c, r) => crGem(c, 0, r * 0.1, r * 0.07, r * 0.2, '#e6fbff', A));
  crGem(ctx, 0, -m.r * 0.3, m.r * 0.09, m.r * 0.16, '#9fe0ff', A);
}

// Cinderwing — ember bat trailing flames from its wing tips.
function spFireBat(ctx, m, pal, t, look) {
  spBat(ctx, m, pal, t, look, (c, r) => {
    const f = 0.8 + 0.2 * Math.sin(t * 20 + m.seed);
    drawGlow(c, 0, 0, r * 0.4 * f, '#ff8a3d', 0.9);
    c.fillStyle = '#ffd23d';
    c.beginPath(); c.moveTo(-r * 0.07, 0); c.quadraticCurveTo(0, -r * 0.3 * f, r * 0.07, 0); c.arc(0, 0, r * 0.07, 0, Math.PI); c.fill();
  });
  drawGlow(ctx, 0, m.r * 0.05, m.r * 0.5, '#ff6a2a', 0.35 + 0.4 * (m.windup || 0));
}

// Bonepicker — desert vulture: ragged gliding wings, cream ruff, bald
// pink head and a hooked beak.
function spVulture(ctx, m, pal, t, look) {
  const r = m.r;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 14 : 5) + m.seed);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.rotate(-flap * 0.2);
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.2);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.55 + flap * r * 0.1, r * 1.45, -r * 0.1 + flap * r * 0.2);
      for (let k = 0; k < 5; k++) {
        const x = r * (1.45 - k * 0.24), y = r * (0.05 + k * 0.06) + flap * r * 0.15 * (1 - k / 5);
        ctx.lineTo(x - r * 0.04, y + r * 0.2); ctx.lineTo(x - r * 0.14, y);
      }
      ctx.lineTo(r * 0.2, r * 0.3); ctx.closePath();
    }, pal, r * 0.8);
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.36, r * 0.5, 0, 0, SP_TAU); }, { ...pal, primary: pal.shade }, r * 0.6);
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.22, r * 0.36, r * 0.17, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#efe6d4', shade: '#b8a888', dark: '#4a3a28' }, r * 0.4);
  const bob = Math.sin(t * 3 + m.seed) * r * 0.03;
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.45 + bob, r * 0.2, r * 0.22, 0, 0, SP_TAU); }, { ...pal, light: '#ffd0c8', primary: '#e0907e', shade: '#a05a4a', dark: '#3a1a14' }, r * 0.3);
  ctx.fillStyle = '#e8c860'; ctx.strokeStyle = '#4a3a10'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -r * 0.38 + bob); ctx.lineTo(r * 0.08, -r * 0.38 + bob);
  ctx.quadraticCurveTo(r * 0.06, -r * 0.2 + bob, 0, -r * 0.15 + bob);
  ctx.quadraticCurveTo(-r * 0.03, -r * 0.24 + bob, -r * 0.08, -r * 0.38 + bob);
  ctx.fill(); ctx.stroke();
  crEyes(ctx, 0, -r * 0.5 + bob, r * 0.06, r * 0.1, look, crBlink(m, t), '#1a0a08', 1.4 + (m.windup || 0), '#3a1a14');
}

// Dunestinger — giant scorpion: eight legs, snapping pincers, and a
// segmented tail that arches over its back; the stinger glows and
// curls further forward as it charges.
function spScorpion(ctx, m, pal, t, look) {
  const r = m.r;
  const ph = m.action && m.action.phase;
  const walk = m.anim * 2;
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2, r * 0.08); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ph2 = Math.sin(walk + i * 1.6 + (side > 0 ? Math.PI : 0));
      const by = r * (-0.35 + i * 0.2);
      ctx.beginPath(); ctx.moveTo(side * r * 0.35, by);
      ctx.lineTo(side * r * (0.75 + i * 0.04), by - r * 0.18 + ph2 * r * 0.05);
      ctx.lineTo(side * r * (1.0 + i * 0.03), by + r * 0.2 + ph2 * r * 0.08);
      ctx.stroke();
    }
  }
  const snap = ph === 'windup' ? 1 : (Math.sin(t * 5 + m.seed) * 0.5 + 0.5) * 0.6;
  for (const side of [-1, 1]) {
    ctx.strokeStyle = pal.shade; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(side * r * 0.3, r * 0.3); ctx.quadraticCurveTo(side * r * 0.75, r * 0.45, side * r * 0.55, r * 0.8); ctx.stroke();
    ctx.save(); ctx.translate(side * r * 0.55, r * 0.9);
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.26, 0, 0, SP_TAU); }, pal, r * 0.3);
    ctx.fillStyle = 'rgba(20,8,0,0.85)';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.02); ctx.lineTo(-side * r * 0.05 - snap * side * r * 0.1, r * 0.3); ctx.lineTo(side * r * 0.06, r * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.05, r * 0.46, r * 0.6, 0, 0, SP_TAU); }, pal, r * 0.7);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(1, r * 0.04);
  for (const sy of [-0.35, -0.12, 0.1]) { ctx.beginPath(); ctx.ellipse(0, sy * r, r * 0.4, r * 0.1, 0, 0.15, Math.PI - 0.15); ctx.stroke(); }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.42, r * 0.26, r * 0.18, 0, 0, SP_TAU); }, { ...pal, primary: pal.shade }, r * 0.3);
  crEyes(ctx, 0, r * 0.4, r * 0.06, r * 0.1, look, crBlink(m, t), '#1a0a00', 1.5, pal.dark);
  const strike = ph === 'windup' ? Math.min(1, m.action.t / 0.4) : (m.windup || 0);
  let x = 0, y = -r * 0.5, a = -Math.PI / 2 + Math.sin(t * 2 + m.seed) * 0.15;
  for (let k = 0; k < 5; k++) {
    const sr = r * (0.19 - k * 0.018);
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, sr, 0, SP_TAU); }, pal, sr);
    a += 0.5 + strike * 0.12;
    x += Math.cos(a) * r * 0.24; y += Math.sin(a) * r * 0.24;
  }
  drawGlow(ctx, x, y, r * (0.25 + strike * 0.3), pal.glow, 0.5 + strike * 0.5);
  ctx.fillStyle = '#2a1404';
  ctx.beginPath(); ctx.moveTo(x - r * 0.08, y - r * 0.04); ctx.quadraticCurveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, x + Math.cos(a) * r * 0.25 + r * 0.02, y + Math.sin(a) * r * 0.25); ctx.lineTo(x + r * 0.08, y + r * 0.04); ctx.closePath(); ctx.fill();
}

// Cogwing — clockwork drone: brass sphere on twin rotors, one red lens
// that tracks you, a little barrel that glows as it charges.
function spDrone(ctx, m, pal, t, look) {
  const r = m.r;
  ctx.rotate(Math.sin(t * 2 + m.seed) * 0.12);
  const brass = { ...pal, light: '#fff0b8', primary: '#d8a84a', shade: '#8a6420', dark: '#2a1a06' };
  for (const side of [-1, 1]) {
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * r * 0.4, -r * 0.1); ctx.lineTo(side * r * 0.95, -r * 0.38); ctx.stroke();
    ctx.save(); ctx.translate(side * r * 0.95, -r * 0.45);
    ctx.fillStyle = 'rgba(230,225,215,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.1, 0, 0, SP_TAU); ctx.fill();
    const c = Math.cos(t * 40 + side) * r * 0.48;
    ctx.strokeStyle = 'rgba(40,30,20,0.85)'; ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath(); ctx.moveTo(-c, 0); ctx.lineTo(c, 0); ctx.stroke();
    ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, SP_TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.roundRect(-r * 0.08, r * 0.4, r * 0.16, r * 0.32, r * 0.04); ctx.fill();
  if (m.windup > 0) drawGlow(ctx, 0, r * 0.75, r * 0.35 * m.windup, '#ff8a3d', 0.9);
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, SP_TAU); }, brass, r * 0.6);
  ctx.fillStyle = brass.dark;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.035, 0, SP_TAU); ctx.fill(); }
  const lx = (look?.x || 0) * r * 0.12, ly = (look?.y || 0) * r * 0.12;
  ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, lx, ly, r * 0.35, pal.glow, 0.7);
  ctx.fillStyle = pal.glow; ctx.beginPath(); ctx.arc(lx, ly, r * 0.14, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx - r * 0.05, ly - r * 0.05, r * 0.045, 0, SP_TAU); ctx.fill();
}

// Stormtalon — the Mountain King's war eagle: broad brown wings in big
// beats, white head, gold beak and talons, fierce brow.
function spEagle(ctx, m, pal, t, look) {
  const r = m.r;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.sin(t * (fast ? 20 : 9) + m.seed);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.25, -r * 0.1); ctx.rotate(-0.2 - flap * 0.4);
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.1);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.38, r * 1.3, -r * 0.15);
      for (let k = 0; k < 4; k++) { const x = r * (1.3 - k * 0.26); ctx.lineTo(x - r * 0.05, r * 0.14 + k * r * 0.02); ctx.lineTo(x - r * 0.2, -r * 0.02 + k * r * 0.04); }
      ctx.lineTo(0, r * 0.22); ctx.closePath();
    }, pal, r * 0.8);
    ctx.fillStyle = 'rgba(255,240,210,0.35)';
    ctx.beginPath(); ctx.ellipse(r * 0.6, -r * 0.12, r * 0.35, r * 0.06, -0.2, 0, SP_TAU); ctx.fill();
    ctx.restore();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.34, r * 0.5, 0, 0, SP_TAU); }, pal, r * 0.6);
  ctx.strokeStyle = '#e8b830'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.12, r * 0.6); ctx.lineTo(side * r * 0.16, r * 0.78);
    ctx.moveTo(side * r * 0.16, r * 0.78); ctx.lineTo(side * r * 0.24, r * 0.84);
    ctx.moveTo(side * r * 0.16, r * 0.78); ctx.lineTo(side * r * 0.1, r * 0.86); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.32, r * 0.26, r * 0.26, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#f2eee6', shade: '#b8b0a0', dark: '#3a342a' }, r * 0.35);
  ctx.fillStyle = '#ffc23d'; ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.09, -r * 0.24); ctx.lineTo(r * 0.09, -r * 0.24); ctx.quadraticCurveTo(r * 0.07, -r * 0.06, 0, -r * 0.02); ctx.quadraticCurveTo(-r * 0.04, -r * 0.1, -r * 0.09, -r * 0.24); ctx.fill(); ctx.stroke();
  crEyes(ctx, 0, -r * 0.36, r * 0.07, r * 0.12, look, crBlink(m, t), '#1a1008', 1.6 + (m.windup || 0), '#3a2a10');
}

// Glintwing — deepwood dragonfly: four buzzing glass wings, a long
// segmented tail behind it, huge glowing compound eyes.
function spDragonfly(ctx, m, pal, t, look) {
  const r = m.r;
  const fast = m.action && m.action.phase === 'burst';
  const buzz = Math.sin(t * (fast ? 60 : 40) + m.seed);
  const sway = Math.sin(t * 3 + m.seed) * 0.15;
  for (let k = 5; k >= 0; k--) {
    const sr = r * (0.13 - k * 0.012), y = -r * (0.3 + k * 0.17), x = Math.sin(sway * (k + 1)) * r * 0.08 * k;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, sr, r * 0.1, 0, 0, SP_TAU); }, k % 2 ? { ...pal, primary: pal.shade } : pal, sr);
  }
  for (const side of [-1, 1]) {
    for (const [y, rot, len] of [[-0.12, -0.25, 1.25], [0.1, 0.25, 1.05]]) {
      ctx.save(); ctx.translate(side * r * 0.12, y * r); ctx.scale(side, 1); ctx.rotate(rot + buzz * 0.12);
      ctx.fillStyle = 'rgba(220,255,240,0.35)'; ctx.strokeStyle = 'rgba(30,60,40,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(r * len * 0.5, 0, r * len * 0.55, r * 0.17, 0, 0, SP_TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.05, 0); ctx.lineTo(r * len, 0); ctx.stroke();
      ctx.restore();
    }
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.3, 0, 0, SP_TAU); }, pal, r * 0.35);
  drawGlow(ctx, 0, r * 0.3, r * 0.45, pal.glow, 0.4 + 0.5 * (m.windup || 0));
  for (const side of [-1, 1]) {
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(side * r * 0.14, r * 0.32, r * 0.16, 0, SP_TAU); }, { ...pal, light: '#e8fff4', primary: pal.glow, shade: pal.primary }, r * 0.2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(side * r * 0.14 - r * 0.05 + (look?.x || 0) * r * 0.04, r * 0.27, r * 0.045, 0, SP_TAU); ctx.fill();
  }
}

// --------------------------------------------- SPECTRAL JUNGLE (fungal) ----
// Matches the island art: giant purple glowcaps, curly teal vines, wisps.

// Shroomkin — little mushroom-folk: purple spotted glowing cap, stubby
// legs pattering, an angry scowl under the brim; ducks the cap to dash.
function spShroomkin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const run = m.anim * (ph === 'burst' ? 4.2 : 2.6);
  const stem = { ...pal, light: '#fff6ff', primary: '#e2d2ee', shade: '#8a74a8', dark: pal.dark };
  // legs
  ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2.5, r * 0.16); ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const s = Math.sin(run + (side > 0 ? Math.PI : 0));
    ctx.beginPath(); ctx.moveTo(side * r * 0.18, r * 0.42); ctx.lineTo(side * r * 0.22 + s * r * 0.14, r * 0.8 - Math.max(0, s) * r * 0.1); ctx.stroke();
  }
  ctx.translate(0, -Math.abs(Math.sin(run)) * r * 0.07);
  // little nub arms swinging
  for (const side of [-1, 1]) {
    const s = Math.sin(run + (side > 0 ? 0 : Math.PI)) * r * 0.1;
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.44, r * 0.2 + s, r * 0.12, r * 0.15, side * 0.4, 0, SP_TAU); }, stem, r * 0.2);
  }
  // stem body with the face
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.38, -r * 0.18, r * 0.76, r * 0.7, r * 0.26); }, stem, r * 0.6);
  const mad = ph === 'windup' ? 1.6 : 1.1;
  crEyes(ctx, 0, r * 0.12, r * 0.12, r * 0.15, look, crBlink(m, t), '#1a0630', mad, pal.dark);
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.36); ctx.quadraticCurveTo(0, r * 0.29, r * 0.1, r * 0.36); ctx.stroke();
  // glowing cap, tipped forward while dashing
  ctx.save(); ctx.rotate(Math.sin(run * 0.5) * 0.06 + (ph === 'burst' ? 0.15 * (m.action.dir || 1) : 0));
  drawGlow(ctx, 0, -r * 0.4, r * 1.05, pal.glow, 0.22 + 0.1 * Math.sin(t * 3 + m.seed));
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.92, -r * 0.08); ctx.bezierCurveTo(-r * 0.9, -r * 1.0, r * 0.9, -r * 1.0, r * 0.92, -r * 0.08); ctx.quadraticCurveTo(0, r * 0.1, -r * 0.92, -r * 0.08); ctx.closePath(); }, pal, r);
  // gill fringe under the brim
  ctx.strokeStyle = pal.shade; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.22, -r * 0.04 + Math.abs(i) * r * 0.01); ctx.lineTo(i * r * 0.17, r * 0.03); ctx.stroke(); }
  // luminous spots
  for (const [x, y, s] of [[-0.48, -0.36, 0.13], [0.05, -0.62, 0.16], [0.5, -0.32, 0.11], [-0.12, -0.3, 0.07]]) {
    drawGlow(ctx, x * r, y * r, s * r * 2, pal.glow, 0.55 + 0.25 * Math.sin(t * 4 + x * 8));
    ctx.fillStyle = '#e8fff8'; ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.75, 0, 0, SP_TAU); ctx.fill();
  }
  ctx.restore();
}

// Sporeling — wobbling glow-puffball: scalloped fuzzy purple sphere with
// teal luminous freckles and a curly sprout; puffs spores, splits small.
function spSporeling(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const small = m.type === 'slimeSmall';
  const wob = Math.sin(t * 5 + m.seed);
  const coil = ph === 'windup' ? 1 : 0, air = ph === 'burst' ? 1 : 0;
  if (!small) for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3 + m.seed) % 1; drawGlow(ctx, Math.sin(i * 2.3 + t) * r * 0.5, -r * 0.7 - p * r * 1.1, r * (0.12 + p * 0.22), pal.glow, 0.5 * (1 - p)); }
  ctx.save();
  ctx.translate(0, r * 0.7);
  ctx.scale(1 + wob * 0.06 + coil * 0.18 - air * 0.1, 1 - wob * 0.06 - coil * 0.2 + air * 0.14);
  ctx.translate(0, -r * 0.7);
  const n = small ? 9 : 12, R = r * 0.78;
  crShade(ctx, () => {
    ctx.beginPath(); ctx.moveTo(R, 0);
    for (let k = 0; k < n; k++) {
      const a1 = (k + 0.5) / n * SP_TAU, a2 = (k + 1) / n * SP_TAU;
      ctx.quadraticCurveTo(Math.cos(a1) * R * 1.16, Math.sin(a1) * R * 1.16, Math.cos(a2) * R, Math.sin(a2) * R);
    }
    ctx.closePath();
  }, pal, r);
  // teal freckles + bright core
  for (const [x, y, s] of [[-0.42, -0.3, 0.1], [0.38, -0.38, 0.12], [0.5, 0.15, 0.08], [-0.55, 0.15, 0.07], [0.05, -0.58, 0.08]]) {
    if (small && s < 0.09) continue;
    drawGlow(ctx, x * r, y * r, s * r * 2.2, pal.glow, 0.6 + 0.3 * Math.sin(t * 3 + x * 9));
    ctx.fillStyle = '#e0fff8'; ctx.beginPath(); ctx.arc(x * r, y * r, s * r * 0.6, 0, SP_TAU); ctx.fill();
  }
  // curly vine sprout on top
  ctx.strokeStyle = '#3ad8b0'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.lineCap = 'round';
  const sw = Math.sin(t * 3 + m.seed) * r * 0.06;
  ctx.beginPath(); ctx.moveTo(0, -R * 1.02); ctx.quadraticCurveTo(r * 0.05 + sw, -r * 1.2, r * 0.22 + sw, -r * 1.12);
  ctx.arc(r * 0.16 + sw, -r * 1.08, r * 0.07, -0.6, 2.6); ctx.stroke();
  crEyes(ctx, 0, -r * 0.02, r * 0.14, r * 0.22, look, crBlink(m, t), '#160a30', coil ? 1 : 0, pal.dark);
  ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.08, r * (0.04 + coil * 0.04 + air * 0.05), 0, 0, SP_TAU); ctx.fill();
  ctx.restore();
}

// Glowmoth — spectral luna moth: translucent violet wings with luminous
// eye-spot rings and long glowing tail streamers, a fluffy collar, glowing
// antennae, and a fading trail of light motes behind it.
function spGlowmoth(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const fast = m.action && m.action.phase === 'burst';
  const flap = Math.abs(Math.sin(t * (fast ? 22 : 11) + m.seed));
  // glow trail (behind = up the lane)
  for (let i = 1; i <= 5; i++) {
    const p = ((t * 1.5 + i / 5) % 1);
    drawGlow(ctx, Math.sin(t * 2 + i * 1.7 + m.seed) * r * 0.35, -r * (0.6 + p * 1.8), r * (0.28 - p * 0.18), pal.glow, 0.55 * (1 - p));
  }
  drawGlow(ctx, 0, 0, r * 1.6, pal.glow, 0.25);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * (0.3 + flap * 0.7), 1);
    // hind wing with a long streamer tail
    ctx.globalAlpha = A * 0.78;
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.1);
      ctx.quadraticCurveTo(r * 0.75, r * 0.05, r * 0.7, r * 0.45);
      ctx.quadraticCurveTo(r * 0.62, r * 0.75, r * 0.55, r * 1.25);
      ctx.quadraticCurveTo(r * 0.35, r * 0.7, r * 0.1, r * 0.4);
      ctx.closePath();
    }, { ...pal, primary: pal.shade }, r * 0.6);
    // fore wing
    crShade(ctx, () => {
      ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.15);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.95, r * 1.35, -r * 0.7);
      ctx.quadraticCurveTo(r * 1.25, -r * 0.05, r * 0.65, r * 0.15);
      ctx.quadraticCurveTo(r * 0.3, r * 0.2, r * 0.1, r * 0.1);
      ctx.closePath();
    }, pal, r * 0.8);
    ctx.globalAlpha = A;
    // glowing veins
    ctx.strokeStyle = pal.glow; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.55;
    ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.05); ctx.lineTo(r * 1.2, -r * 0.62); ctx.moveTo(r * 0.15, 0); ctx.lineTo(r * 0.95, -r * 0.1); ctx.moveTo(r * 0.15, r * 0.2); ctx.lineTo(r * 0.55, r * 1.1); ctx.stroke();
    ctx.globalAlpha = A;
    // luminous eye-spot ring + streamer tip
    const pulse = 0.7 + 0.3 * Math.sin(t * 4 + side + m.seed);
    drawGlow(ctx, r * 0.8, -r * 0.42, r * 0.32 * pulse, pal.glow, 0.9);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.42, r * 0.13, 0, SP_TAU); ctx.stroke();
    ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.42, r * 0.06, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, r * 0.55, r * 1.2, r * 0.22 * pulse, pal.glow, 0.9);
    ctx.restore();
  }
  // segmented body + fluffy collar
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.15, r * 0.42, 0, 0, SP_TAU); }, { ...pal, primary: pal.shade }, r * 0.4);
  ctx.strokeStyle = pal.glow; ctx.lineWidth = 1; ctx.globalAlpha = A * 0.6;
  for (const y of [0.15, 0.3, 0.45]) { ctx.beginPath(); ctx.moveTo(-r * 0.12, y * r); ctx.quadraticCurveTo(0, y * r + r * 0.05, r * 0.12, y * r); ctx.stroke(); }
  ctx.globalAlpha = A;
  crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -r * 0.18, r * 0.26, r * 0.22, 0, 0, SP_TAU); }, { ...pal, light: '#ffffff', primary: '#e8e0ff', shade: '#9a8ad8' }, r * 0.3);
  // feathery antennae with glowing tips
  ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    const tx = side * r * 0.5, ty = -r * 0.8 + Math.sin(t * 5 + side) * r * 0.05;
    ctx.beginPath(); ctx.moveTo(side * r * 0.06, -r * 0.35); ctx.quadraticCurveTo(side * r * 0.2, -r * 0.85, tx, ty); ctx.stroke();
    drawGlow(ctx, tx, ty, r * 0.16, pal.glow, 1);
  }
  crEyes(ctx, 0, -r * 0.2, r * 0.1, r * 0.12, look, crBlink(m, t), '#120a3a', fast ? 1 : 0, pal.dark);
}

// Glowcap Giant — lumbering mushroom brute: a huge glowing spotted cap
// draped in moss, a thick stem body with a shadowed scowl, and mossy
// vine arms that curl at the ends; rears both arms up before it slams.
function spShroomGiant(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const step = Math.sin(m.anim * 1.1);
  const rear = ph === 'windup' ? Math.min(1, m.action.t / 0.45) : 0;
  const slam = ph === 'burst' ? 1 : 0;
  const stem = { ...pal, light: '#f4e8ff', primary: '#c8b4dc', shade: '#6a5888', dark: pal.dark };
  const moss = { ...pal, light: '#9ae8a0', primary: '#3a8a5a', shade: '#1a4a32', dark: '#06200f' };
  ctx.translate(0, Math.abs(step) * r * 0.06 - rear * r * 0.1 + slam * r * 0.05);
  // root legs
  for (const side of [-1, 1]) {
    const s = Math.sin(m.anim * 1.1 + (side > 0 ? Math.PI : 0));
    crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(side * r * 0.3 + s * r * 0.05, r * 0.72 - Math.max(0, s) * r * 0.06, r * 0.2, r * 0.15, 0, 0, SP_TAU); }, stem, r * 0.25);
  }
  // vine arms (behind the body)
  for (const side of [-1, 1]) {
    const lift = rear ? -1.0 * rear : slam ? 0.4 : step * side * 0.15;
    const sx = side * r * 0.42, sy = -r * 0.05;
    const hx = side * r * (0.95 - rear * 0.3), hy = r * (0.5 + lift * (rear ? 1.95 : 1.1));
    ctx.lineCap = 'round';
    ctx.strokeStyle = moss.dark; ctx.lineWidth = r * 0.26;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(side * r * 1.05, sy - r * 0.1 + lift * r * 0.3, hx, hy); ctx.stroke();
    ctx.strokeStyle = moss.primary; ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(side * r * 1.05, sy - r * 0.1 + lift * r * 0.3, hx, hy); ctx.stroke();
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(hx, hy, r * 0.2, 0, SP_TAU); }, moss, r * 0.25);
    // curling vine tendril off the fist
    ctx.strokeStyle = '#3ad8b0'; ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath(); ctx.moveTo(hx + side * r * 0.12, hy + r * 0.1); ctx.quadraticCurveTo(hx + side * r * 0.35, hy + r * 0.2, hx + side * r * 0.3, hy - r * 0.02);
    ctx.arc(hx + side * r * 0.24, hy - r * 0.02, r * 0.06, 0, Math.PI * 1.6); ctx.stroke();
    if (rear || slam) drawGlow(ctx, hx, hy, r * 0.3, pal.glow, 0.5 + rear * 0.4);
  }
  // stem body
  crShade(ctx, () => { ctx.beginPath(); ctx.roundRect(-r * 0.48, -r * 0.25, r * 0.96, r * 0.95, r * 0.32); }, stem, r * 0.8);
  // shadowed face under the brim
  ctx.fillStyle = 'rgba(26,6,48,0.45)'; ctx.beginPath(); ctx.ellipse(0, -r * 0.08, r * 0.4, r * 0.18, 0, 0, SP_TAU); ctx.fill();
  const rage = Math.max(rear, m.windup || 0);
  for (const side of [-1, 1]) {
    drawGlow(ctx, side * r * 0.16, r * 0.0, r * (0.13 + rage * 0.08), pal.glow, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(side * r * 0.16, r * 0.0, r * 0.06, r * 0.045, 0, 0, SP_TAU); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath(); ctx.moveTo(side * r * 0.06, -r * 0.04); ctx.lineTo(side * r * 0.28, -r * 0.12); ctx.stroke();
  }
  ctx.fillStyle = pal.dark;
  ctx.beginPath(); ctx.ellipse(0, r * 0.26, r * 0.16, r * (0.04 + rage * 0.08), 0, 0, SP_TAU); ctx.fill();
  // moss patch on the belly
  ctx.fillStyle = moss.primary; ctx.globalAlpha = A * 0.8;
  for (const [x, y, s] of [[-0.3, 0.5, 0.12], [-0.18, 0.58, 0.09], [0.32, 0.42, 0.08]]) { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, SP_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  // the huge glowing cap
  drawGlow(ctx, 0, -r * 0.55, r * 1.4, pal.glow, 0.2 + 0.08 * Math.sin(t * 2 + m.seed));
  ctx.save(); ctx.rotate(step * 0.04);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 1.15, -r * 0.18); ctx.bezierCurveTo(-r * 1.1, -r * 1.35, r * 1.1, -r * 1.35, r * 1.15, -r * 0.18); ctx.quadraticCurveTo(0, r * 0.02, -r * 1.15, -r * 0.18); ctx.closePath(); }, pal, r * 1.2);
  // moss draped over the brim with dangling strands
  ctx.fillStyle = moss.primary;
  ctx.beginPath(); ctx.moveTo(-r * 1.1, -r * 0.3);
  for (let i = 0; i <= 8; i++) { const x = -r * 1.1 + i * r * 0.275; ctx.quadraticCurveTo(x - r * 0.14, -r * (0.42 + (i % 2) * 0.08), x, -r * 0.3); }
  ctx.quadraticCurveTo(0, -r * 0.08, -r * 1.1, -r * 0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = moss.primary; ctx.lineWidth = Math.max(1.5, r * 0.04);
  for (const x of [-0.95, -0.55, 0.6, 0.9]) { const sw = Math.sin(t * 2 + x * 5) * r * 0.04; ctx.beginPath(); ctx.moveTo(x * r, -r * 0.22); ctx.quadraticCurveTo(x * r + sw, -r * 0.05, x * r + sw * 2, r * 0.1); ctx.stroke(); }
  // luminous spots
  for (const [x, y, s] of [[-0.6, -0.62, 0.15], [0.05, -0.92, 0.18], [0.62, -0.6, 0.14], [-0.2, -0.55, 0.09], [0.32, -0.8, 0.08]]) {
    drawGlow(ctx, x * r, y * r, s * r * 2, pal.glow, 0.6 + 0.3 * Math.sin(t * 3 + x * 7));
    ctx.fillStyle = '#e8fff8'; ctx.beginPath(); ctx.ellipse(x * r, y * r, s * r, s * r * 0.72, 0, 0, SP_TAU); ctx.fill();
  }
  ctx.restore();
}

// --------------------------------------------------- DEEPWOOD (mossbone) ----
// Matches the island art: a moss-grown dragon skeleton tangled in roots.

// Bone outline helper: a dark stroke under a bone-colored one.
function spBoneLine(ctx, w, bone, dark, path) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = w * 1.6; path(); ctx.stroke();
  ctx.strokeStyle = bone; ctx.lineWidth = w; path(); ctx.stroke();
}

// Moss tuft helper: a lumpy green clump with a lighter speckle.
function spMossTuft(ctx, x, y, s) {
  ctx.fillStyle = '#3a7a2e';
  ctx.beginPath(); ctx.arc(x - s * 0.5, y, s * 0.7, 0, SP_TAU); ctx.arc(x + s * 0.45, y + s * 0.05, s * 0.65, 0, SP_TAU); ctx.arc(x, y - s * 0.35, s * 0.7, 0, SP_TAU); ctx.fill();
  ctx.fillStyle = '#8ac860';
  ctx.beginPath(); ctx.arc(x - s * 0.2, y - s * 0.45, s * 0.28, 0, SP_TAU); ctx.fill();
}

// Bonecrawler — small mossy bone drake skittering on four bony legs:
// hollow ribcage with a ghostly glow inside, moss on its spine, a horned
// skull with green eyes; its jaw drops and glows as it charges a shot.
function spBonecrawler(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const crawl = m.anim * 2.2;
  const charge = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const bone = { ...pal, rim: pal.light };
  // tail of shrinking vertebrae, swishing
  let x = 0, y = r * 0.5, a = Math.PI / 2 + 0.5;
  for (let k = 0; k < 6; k++) {
    const s = r * (0.15 - k * 0.018);
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, s, 0, SP_TAU); }, bone, s * 2);
    a += 0.22 + Math.sin(t * 3 + m.seed - k * 0.6) * 0.18;
    x += Math.cos(a) * r * 0.18; y += Math.sin(a) * r * 0.14;
  }
  // four stubby bony lizard legs (elbows out, clawed toes), crawling gait
  for (const side of [-1, 1]) {
    for (const [ly, p] of [[-0.08, 0], [0.38, Math.PI]]) {
      const g = Math.sin(crawl + p + (side > 0 ? Math.PI : 0));
      const kx = side * r * 0.68, ky = ly * r - r * 0.05 + g * r * 0.07;
      const fx = side * r * (0.72 + g * 0.06), fy = ly * r + r * 0.3 - Math.max(0, g) * r * 0.08;
      spBoneLine(ctx, Math.max(2, r * 0.13), pal.light, pal.dark, () => { ctx.beginPath(); ctx.moveTo(side * r * 0.3, ly * r); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); });
      spBoneLine(ctx, Math.max(1, r * 0.05), pal.light, pal.dark, () => { ctx.beginPath(); for (const d of [-1, 0, 1]) { ctx.moveTo(fx, fy); ctx.lineTo(fx + side * r * 0.08 + d * r * 0.07, fy + r * 0.1); } });
    }
  }
  // shoulder + hip girdles
  for (const gy of [-0.08, 0.38]) crShade(ctx, () => { ctx.beginPath(); ctx.ellipse(0, gy * r, r * 0.34, r * 0.1, 0, 0, SP_TAU); }, bone, r * 0.3);
  // ribcage: dark hollow with a faint ghost-glow, ribs arcing over it
  ctx.fillStyle = '#0e1a0a'; ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.36, r * 0.24, 0, 0, SP_TAU); ctx.fill();
  drawGlow(ctx, 0, r * 0.15, r * 0.36, pal.glow, 0.4 + charge * 0.4);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ry = r * (0.0 + i * 0.12);
      spBoneLine(ctx, Math.max(1.5, r * 0.08), pal.primary, pal.dark, () => { ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(side * r * 0.48, ry - r * 0.02, side * r * 0.32, ry + r * 0.13); });
    }
  }
  spBoneLine(ctx, Math.max(2, r * 0.11), pal.light, pal.dark, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.5); });
  spMossTuft(ctx, -r * 0.1, -r * 0.12, r * 0.13);
  spMossTuft(ctx, r * 0.14, r * 0.36, r * 0.1);
  // moss strand hanging off the ribs
  ctx.strokeStyle = '#4a8a32'; ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.2); ctx.quadraticCurveTo(-r * 0.34 + Math.sin(t * 3 + m.seed) * r * 0.05, r * 0.35, -r * 0.3, r * 0.48); ctx.stroke();
  // horned skull (big — it's the readable part at small size)
  ctx.save(); ctx.translate(0, -r * 0.42); ctx.scale(1.35, 1.35);
  for (const side of [-1, 1]) {
    ctx.fillStyle = pal.primary; ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(side * r * 0.16, -r * 0.12); ctx.quadraticCurveTo(side * r * 0.42, -r * 0.2, side * r * 0.45, -r * 0.45); ctx.lineTo(side * r * 0.28, -r * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.08); ctx.quadraticCurveTo(-r * 0.3, -r * 0.3, 0, -r * 0.3); ctx.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.3, -r * 0.08); ctx.quadraticCurveTo(r * 0.24, r * 0.2, 0, r * 0.24); ctx.quadraticCurveTo(-r * 0.24, r * 0.2, -r * 0.3, -r * 0.08); ctx.closePath(); }, bone, r * 0.35);
  // dropping jaw
  const jaw = r * (0.03 + charge * 0.12);
  ctx.fillStyle = '#0e1a0a'; ctx.beginPath(); ctx.ellipse(0, r * 0.2 + jaw * 0.5, r * 0.13, r * 0.02 + jaw * 0.6, 0, 0, SP_TAU); ctx.fill();
  if (charge > 0.1) drawGlow(ctx, 0, r * 0.22, r * 0.3 * charge, pal.glow, charge);
  ctx.fillStyle = pal.light;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * r * 0.1, r * 0.17); ctx.lineTo(side * r * 0.07, r * 0.25); ctx.lineTo(side * r * 0.04, r * 0.17); ctx.closePath(); ctx.fill(); }
  // hollow sockets with green eye-lights tracking the guardian
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#0e1a0a'; ctx.beginPath(); ctx.ellipse(side * r * 0.13, -r * 0.08, r * 0.09, r * 0.08, side * 0.3, 0, SP_TAU); ctx.fill();
    const ex = side * r * 0.13 + (look?.x || 0) * r * 0.03, ey = -r * 0.08 + (look?.y || 0) * r * 0.03;
    drawGlow(ctx, ex, ey, r * (0.1 + charge * 0.06), pal.glow, 1);
    ctx.fillStyle = '#eaffd8'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.03, 0, SP_TAU); ctx.fill();
  }
  spMossTuft(ctx, -r * 0.05, -r * 0.27, r * 0.08);
  ctx.restore();
}

// Ossarach — the Mossbone Wyrm boss: a colossal dragon skeleton grown over
// with moss — tattered mossy wing membranes on finger bones, a ribcage with
// a ghost-green heart, hanging vines, and a horned skull whose jaw gapes
// and blazes before each volley.
function spBoneDragon(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const rage = m.enraged ? 1 : 0;
  const glow = rage ? '#ff5a3a' : pal.glow;
  const heave = Math.max(m.windup || 0, m.fireFlash > 0 ? 1 : 0);
  const flap = Math.sin(t * 2.2);
  const bw = Math.max(2, r * 0.06);
  // wings: finger bones with tattered moss membranes
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1); ctx.translate(r * 0.35, -r * 0.25); ctx.rotate(-0.25 + flap * 0.18);
    const tips = [[r * 1.35, -r * 0.7], [r * 1.25, -r * 0.1], [r * 0.95, r * 0.35], [r * 0.55, r * 0.55]];
    ctx.globalAlpha = A * 0.82;
    ctx.fillStyle = '#2a4a22';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 1; i < tips.length; i++) {
      const [px, py] = tips[i - 1], [qx, qy] = tips[i];
      const mx = (px + qx) / 2 - r * 0.12, my = (py + qy) / 2 - r * 0.02;
      ctx.lineTo(mx + r * 0.05, my + r * 0.12); ctx.lineTo(mx - r * 0.04, my + r * 0.02); ctx.lineTo(mx - r * 0.1, my + r * 0.16); ctx.lineTo(qx, qy);
    }
    ctx.lineTo(r * 0.1, r * 0.4); ctx.closePath(); ctx.fill();
    // rotten tears in the membrane
    ctx.fillStyle = '#0c1808'; ctx.globalAlpha = A * 0.7;
    ctx.beginPath(); ctx.ellipse(r * 0.85, -r * 0.18, r * 0.09, r * 0.05, 0.4, 0, SP_TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.6, r * 0.18, r * 0.06, r * 0.04, -0.2, 0, SP_TAU); ctx.fill();
    ctx.globalAlpha = A;
    ctx.fillStyle = '#5a9a3a';
    for (const [mx, my] of [[0.5, -0.25], [0.95, -0.4], [0.75, 0.05]]) { ctx.beginPath(); ctx.arc(mx * r, my * r, r * 0.05, 0, SP_TAU); ctx.fill(); }
    // arm + finger bones
    const wx = r * 0.5, wy = -r * 0.32;
    for (const [tx, ty] of tips) spBoneLine(ctx, bw * 0.85, pal.primary, pal.dark, () => { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(tx, ty); });
    spBoneLine(ctx, bw * 1.4, pal.light, pal.dark, () => { ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.05); ctx.lineTo(wx, wy); });
    crShade(ctx, () => { ctx.beginPath(); ctx.arc(wx, wy, bw * 1.3, 0, SP_TAU); }, { ...pal, rim: pal.light }, bw * 1.5);
    // wrist claw
    ctx.fillStyle = pal.light; ctx.strokeStyle = pal.dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wx - bw, wy - bw * 0.5); ctx.quadraticCurveTo(wx - r * 0.05, wy - r * 0.25, wx + r * 0.08, wy - r * 0.28); ctx.lineTo(wx + bw, wy - bw * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    // hanging moss strands from the wing bones
    ctx.strokeStyle = '#4a8a32'; ctx.lineWidth = Math.max(1.2, r * 0.025);
    for (const [tx, ty] of tips.slice(0, 2)) { const hx = tx * 0.6, hy = ty * 0.6, sw = Math.sin(t * 2 + tx) * r * 0.04; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + sw, hy + r * 0.2, hx + sw * 2, hy + r * 0.35); ctx.stroke(); }
    ctx.restore();
  }
  // ribcage with the ghost heart
  ctx.fillStyle = '#0c1808'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.45, 0, 0, SP_TAU); ctx.fill();
  const beat = 0.7 + 0.3 * Math.abs(Math.sin(t * 2.5));
  drawGlow(ctx, 0, r * 0.38, r * (0.45 + heave * 0.2) * beat, glow, 0.7);
  ctx.fillStyle = '#eaffd8'; ctx.globalAlpha = A * 0.8; ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.07 * beat, 0, SP_TAU); ctx.fill(); ctx.globalAlpha = A;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ry = r * (0.0 + i * 0.17), w = r * (0.62 - i * 0.07);
      spBoneLine(ctx, bw, pal.primary, pal.dark, () => { ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(side * w * 1.1, ry - r * 0.04, side * w * 0.75, ry + r * 0.2); });
    }
  }
  spBoneLine(ctx, bw * 1.5, pal.light, pal.dark, () => { ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(0, r * 0.85); });
  // vines hanging off the ribs, swaying
  ctx.lineCap = 'round';
  for (const [vx, len, k] of [[-0.42, 0.55, 0], [-0.15, 0.4, 1], [0.25, 0.6, 2], [0.5, 0.35, 3]]) {
    const sw = Math.sin(t * 1.8 + k * 1.3) * r * 0.06;
    ctx.strokeStyle = '#2e5a22'; ctx.lineWidth = Math.max(1.5, r * 0.035);
    const x0 = vx * r, y0 = r * (0.3 + k * 0.05);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + sw, y0 + r * len * 0.4, x0 - sw, y0 + r * len * 0.7, x0 + sw * 1.5, y0 + r * len); ctx.stroke();
    ctx.fillStyle = '#6ab840';
    ctx.beginPath(); ctx.ellipse(x0 + sw * 1.5, y0 + r * len, r * 0.04, r * 0.025, 0.5, 0, SP_TAU); ctx.fill();
  }
  // moss on the shoulders and spine
  spMossTuft(ctx, -r * 0.32, -r * 0.12, r * 0.12);
  spMossTuft(ctx, r * 0.36, -r * 0.08, r * 0.1);
  spMossTuft(ctx, r * 0.04, r * 0.62, r * 0.09);
  // skull
  const sway = Math.sin(t * 1.1) * r * 0.04;
  ctx.save(); ctx.translate(sway, -r * 0.42);
  for (const side of [-1, 1]) {
    // swept-back horns
    ctx.fillStyle = pal.primary; ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2, r * 0.03);
    ctx.beginPath(); ctx.moveTo(side * r * 0.22, -r * 0.2); ctx.quadraticCurveTo(side * r * 0.7, -r * 0.3, side * r * 0.75, -r * 0.75); ctx.quadraticCurveTo(side * r * 0.55, -r * 0.4, side * r * 0.38, -r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a8a32'; ctx.beginPath(); ctx.arc(side * r * 0.42, -r * 0.27, r * 0.05, 0, SP_TAU); ctx.fill();
  }
  crShade(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.42, -r * 0.42, 0, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.42, -r * 0.42, r * 0.4, -r * 0.1);
    ctx.quadraticCurveTo(r * 0.32, r * 0.1, r * 0.2, r * 0.18);
    ctx.lineTo(r * 0.16, r * 0.38); ctx.quadraticCurveTo(0, r * 0.46, -r * 0.16, r * 0.38);
    ctx.lineTo(-r * 0.2, r * 0.18);
    ctx.quadraticCurveTo(-r * 0.32, r * 0.1, -r * 0.4, -r * 0.1);
    ctx.closePath();
  }, { ...pal, rim: pal.light }, r * 0.5);
  // cracks
  ctx.strokeStyle = pal.shade; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.4); ctx.lineTo(r * 0.02, -r * 0.3); ctx.lineTo(-r * 0.03, -r * 0.24); ctx.stroke();
  // moss cap on the skull
  spMossTuft(ctx, -r * 0.14, -r * 0.38, r * 0.1);
  spMossTuft(ctx, r * 0.12, -r * 0.4, r * 0.08);
  // eye sockets + glowing eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#0c1808';
    ctx.beginPath(); ctx.ellipse(side * r * 0.17, -r * 0.14, r * 0.12, r * 0.09, side * 0.35, 0, SP_TAU); ctx.fill();
    drawGlow(ctx, side * r * 0.17, -r * 0.14, r * (0.14 + heave * 0.1), glow, 1);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(side * r * 0.17 + (look?.x || 0) * r * 0.03, -r * 0.14 + (look?.y || 0) * r * 0.02, r * 0.035, 0, SP_TAU); ctx.fill();
  }
  // nostrils
  ctx.fillStyle = '#0c1808';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r * 0.06, r * 0.3, r * 0.025, r * 0.04, side * 0.4, 0, SP_TAU); ctx.fill(); }
  // gaping lower jaw with fangs
  const jaw = heave * r * 0.16;
  ctx.fillStyle = '#0c1808';
  ctx.beginPath(); ctx.ellipse(0, r * 0.42 + jaw * 0.5, r * 0.15, r * 0.03 + jaw * 0.5, 0, 0, SP_TAU); ctx.fill();
  if (heave > 0.1) drawGlow(ctx, 0, r * 0.44 + jaw * 0.5, r * 0.45 * heave, glow, heave);
  crShade(ctx, () => { ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.38 + jaw); ctx.quadraticCurveTo(0, r * 0.58 + jaw, r * 0.2, r * 0.38 + jaw); ctx.lineTo(r * 0.16, r * 0.45 + jaw); ctx.quadraticCurveTo(0, r * 0.62 + jaw, -r * 0.16, r * 0.45 + jaw); ctx.closePath(); }, pal, r * 0.25);
  ctx.fillStyle = pal.light;
  for (let k = -2; k <= 2; k++) { const fx = k * r * 0.06; ctx.beginPath(); ctx.moveTo(fx - r * 0.025, r * 0.37); ctx.lineTo(fx, r * 0.44 + (k % 2 ? 0 : r * 0.02)); ctx.lineTo(fx + r * 0.025, r * 0.37); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// ---------------------------------------------------- ABYSSAL RIFT (extra) ----

// Rollspine — spiky purple sea urchin that rolls along on its spines; the
// face stays upright while the spine ball turns.
function spUrchin(ctx, m, pal, t, look) {
  const r = m.r, A = ctx.globalAlpha;
  const ph = m.action && m.action.phase;
  const coil = ph === 'windup' ? 1 : 0;
  ctx.save();
  ctx.rotate(m.anim * 0.9 + m.seed);
  const n = 14;
  for (let k = 0; k < n; k++) {
    const a = k / n * SP_TAU, len = r * (k % 2 ? 0.95 : 1.15) * (1 + coil * 0.12);
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, w = r * 0.09;
    ctx.fillStyle = k % 2 ? pal.shade : pal.primary;
    ctx.beginPath(); ctx.moveTo(ca * r * 0.5 + px * w, sa * r * 0.5 + py * w); ctx.lineTo(ca * len, sa * len); ctx.lineTo(ca * r * 0.5 - px * w, sa * r * 0.5 - py * w); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = pal.glow; ctx.beginPath(); ctx.arc(ca * len, sa * len, r * 0.05, 0, SP_TAU); ctx.fill();
  }
  ctx.restore();
  crShade(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, SP_TAU); }, pal, r * 0.7);
  ctx.fillStyle = pal.light; ctx.globalAlpha = A * 0.5;
  for (const [x, y] of [[-0.3, -0.3], [0.32, -0.25], [-0.05, -0.45]]) { ctx.beginPath(); ctx.arc(x * r, y * r, r * 0.05, 0, SP_TAU); ctx.fill(); }
  ctx.globalAlpha = A;
  crEyes(ctx, 0, -r * 0.02, r * 0.15, r * 0.2, look, crBlink(m, t), '#1e0a34', coil, pal.dark);
  ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(0, r * 0.26, r * 0.08, r * (0.03 + coil * 0.04), 0, 0, SP_TAU); ctx.fill();
}

// ----------------------------------------------------------- registry ----
// name is shown on the boss bar for bosses.
export const SPECIES = {
  crab: { draw: spCrab, colors: { primary: '#e8603c', dark: '#3a1208', glow: '#ffd2a8' } },
  jelly: { draw: spJelly, colors: { primary: '#c87ae8', dark: '#2a0e44', glow: '#9ff4ff' } },
  pirate: { draw: spPirate },
  kraken: { draw: spKraken, get name() { return tr('d.boss.kraken'); }, colors: { primary: '#7a4ab8', dark: '#1a0a30', glow: '#9ff4ff' } },
  frostling: { draw: spFrostling },
  snowblob: { draw: spSnowblob },
  wraith: { draw: spWraith },
  yeti: { draw: spYeti },
  frostgiant: { draw: spFrostGiant, get name() { return tr('d.boss.frostgiant'); } },
  scarab: { draw: spScarab, colors: { primary: '#2a7a6a', dark: '#0a2420', glow: '#ffd23d' } },
  dustdevil: { draw: spDustDevil },
  mummy: { draw: spMummy },
  sphinx: { draw: spSphinx, get name() { return tr('d.boss.sphinx'); } },
  shardfox: { draw: spShardfox },
  mushling: { draw: spMushling },
  moth: { draw: spMoth },
  treant: { draw: spTreant },
  crystalgolem: { draw: spCrystalGolem },
  eldertreant: { draw: spElderTreant, get name() { return tr('d.boss.eldertreant'); } },
  kobold: { draw: spKobold },
  magma: { draw: spMagma },
  emberknight: { draw: spEmberKnight },
  drake: { draw: spDrake },
  dragon: { draw: spDragon, get name() { return tr('d.boss.dragon'); } },
  finch: { draw: spFinch },
  egg: { draw: spEgg },
  chick: { draw: spChick },
  owl: { draw: spOwl },
  griffin: { draw: spGriffin },
  phoenix: { draw: spPhoenix, get name() { return tr('d.boss.phoenix'); } },
  gloomling: { draw: spGloomling },
  wisp: { draw: spWisp },
  raven: { draw: spRaven },
  witch: { draw: spWitch },
  bramble: { draw: spBramble },
  shadowstag: { draw: spShadowStag, get name() { return tr('d.boss.shadowstag'); } },
  starsprite: { draw: spStarSprite },
  bloom: { draw: spBloom },
  seedling: { draw: spSeedling },
  comet: { draw: spComet },
  astral: { draw: spAstral },
  moongolem: { draw: spMoonGolem },
  seraph: { draw: spSeraph, get name() { return tr('d.boss.seraph'); } },
  cogbot: { draw: spCogbot },
  gearball: { draw: spGearball },
  gear: { draw: spGear },
  steamsoldier: { draw: spSteamSoldier },
  juggernaut: { draw: spJuggernaut },
  chronos: { draw: spChronos, get name() { return tr('d.boss.chronos'); } },
  monkey: { draw: spMonkey },
  frog: { draw: spFrog },
  tadpole: { draw: spTadpole },
  toucan: { draw: spToucan },
  tiki: { draw: spTiki },
  gorilla: { draw: spGorilla },
  serpent: { draw: spSerpent, get name() { return tr('d.boss.serpent'); } },
  ram: { draw: spRam },
  boulder: { draw: spBoulder },
  pebble: { draw: spPebble },
  guard: { draw: spGuard },
  ogre: { draw: spOgre },
  mountainking: { draw: spMountainKing, get name() { return tr('d.boss.mountainking'); } },
  boar: { draw: spBoar },
  puff: { draw: spPuff },
  spore: { draw: spSpore },
  mantis: { draw: spMantis },
  mossbear: { draw: spMossBear },
  flytrap: { draw: spFlytrap, get name() { return tr('d.boss.flytrap'); } },
  lanternfin: { draw: spLanternfin, colors: { primary: '#2a5a7a', dark: '#06141e', glow: '#9ff4ff' } },
  turtle: { draw: spTurtle, colors: { primary: '#4a8a7a', dark: '#0e2a24', glow: '#9ff4ff' } },
  icebat: { draw: spIceBat, colors: { primary: '#6a9ac8', dark: '#14243a', glow: '#dff6ff' } },
  firebat: { draw: spFireBat, colors: { primary: '#8a2a1a', dark: '#1a0604', glow: '#ffb347' } },
  vulture: { draw: spVulture, colors: { primary: '#5a4436', dark: '#1a120c', glow: '#ffd23d' } },
  scorpion: { draw: spScorpion, colors: { primary: '#c8823a', dark: '#2a1404', glow: '#ffe08a' } },
  drone: { draw: spDrone, colors: { primary: '#d8a84a', dark: '#2a1a06', glow: '#ff5a3d' } },
  eagle: { draw: spEagle, colors: { primary: '#6a4a2a', dark: '#1e140a', glow: '#ffd23d' } },
  dragonfly: { draw: spDragonfly, colors: { primary: '#3aa86a', dark: '#0a2414', glow: '#8ff0c0' } },
  shroomkin: { draw: spShroomkin, colors: { primary: '#9a4ad8', dark: '#1a0630', glow: '#7affe0' } },
  sporeling: { draw: spSporeling, colors: { primary: '#8a5ae0', dark: '#160a30', glow: '#7affe0' } },
  glowmoth: { draw: spGlowmoth, colors: { primary: '#7a7af0', dark: '#120a3a', glow: '#9affff' } },
  shroomgiant: { draw: spShroomGiant, colors: { primary: '#8a3ad0', dark: '#1a0630', glow: '#7affe0' } },
  bonecrawler: { draw: spBonecrawler, colors: { primary: '#d8d0ae', dark: '#1a2210', glow: '#9aff7a' } },
  bonedragon: { draw: spBoneDragon, get name() { return tr('d.boss.bonedragon'); }, colors: { primary: '#d8d0ae', dark: '#1a2210', glow: '#b8ff7a' } },
  urchin: { draw: spUrchin, colors: { primary: '#9a3ad0', dark: '#1e0a34', glow: '#ff9af0' } },
};
