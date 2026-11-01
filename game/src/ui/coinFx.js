// ============================================================
// Flying coins — whenever the player gets coins, a burst of coins flies
// from where they were earned into the coin counter at the top, which
// pulses and chimes as they land.
//   cfTarget(x, y)          the counter on screen calls this each frame it
//                           draws its coin icon (HUD, home header, pages)
//   cfBurst(amount, x, y)   start a flight from (x, y)
//   cfUpdate(dt) / cfDraw(ctx)   main.js, every frame (drawn on top)
//   cfPulse()               0..1 bump for the counter to scale with
// Helpers prefixed `cf` (the standalone build shares one scope).
// ============================================================
import { audio } from '../systems/audio.js';

const cfFlights = [];
const cfTo = { x: 24, y: 54 };
let cfPulseT = 0;
let cfChimeT = 0;

export function cfTarget(x, y) { cfTo.x = x; cfTo.y = y; }

export function cfPulse() { return Math.max(0, cfPulseT / 0.25); }

// How many coin sprites a gain is shown with: one for a pinch, up to 14.
function cfCount(amount) {
  if (amount <= 3) return 1;
  return Math.min(14, 2 + Math.round(Math.log2(amount) * 1.4));
}

export function cfBurst(amount, x, y) {
  if (!amount || amount <= 0) return;
  if (cfFlights.length > 60) return; // plenty in the air already
  const n = cfCount(amount);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 70;
    cfFlights.push({
      x0: x, y0: y,
      ox: Math.cos(a) * sp * 0.6, oy: Math.sin(a) * sp * 0.6 - 30, // first a little pop outward
      t: -i * 0.045,           // stagger
      dur: 0.55 + Math.random() * 0.2,
      spin: Math.random() * 6,
      big: n === 1 ? 9 : 8,
    });
  }
}

export function cfUpdate(dt) {
  if (cfPulseT > 0) cfPulseT -= dt;
  if (cfChimeT > 0) cfChimeT -= dt;
  for (let i = cfFlights.length - 1; i >= 0; i--) {
    const f = cfFlights[i];
    f.t += dt;
    if (f.t >= f.dur) {
      cfFlights.splice(i, 1);
      cfPulseT = 0.25;
      if (cfChimeT <= 0) { audio.coin?.(); cfChimeT = 0.06; }
    }
  }
}

function cfCoin(ctx, x, y, r, spin) {
  const sx = Math.max(0.25, Math.abs(Math.cos(spin))); // turning coin
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.fillStyle = '#c8861a';
  ctx.beginPath(); ctx.arc(0, 1, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#e09a1a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a8650c'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function cfDraw(ctx) {
  if (!cfFlights.length && cfPulseT <= 0) return;
  ctx.save();
  ctx.direction = 'ltr';
  for (const f of cfFlights) {
    if (f.t < 0) continue;
    const k = f.t / f.dur;
    // pop out for the first quarter, then swoop into the counter
    const pop = Math.min(1, k / 0.25);
    const sx = f.x0 + f.ox * pop, sy = f.y0 + f.oy * pop;
    const m = Math.max(0, (k - 0.2) / 0.8), e = m * m * (3 - 2 * m);
    const cx = sx + (cfTo.x - sx) * e - Math.sin(m * Math.PI) * 30;
    const cy = sy + (cfTo.y - sy) * e - Math.sin(m * Math.PI) * 40;
    ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, f.t / 0.08);
    // a short sparkle trail
    ctx.fillStyle = 'rgba(255,230,120,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, f.big * 0.55 * (1 - m * 0.4), 0, Math.PI * 2); ctx.fill();
    cfCoin(ctx, cx, cy, f.big * (1 - 0.3 * e), f.spin + f.t * 14);
  }
  ctx.globalAlpha = 1;
  // a glow ring on the counter as coins land
  if (cfPulseT > 0) {
    const p = cfPulseT / 0.25;
    ctx.strokeStyle = `rgba(255,220,100,${0.8 * p})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cfTo.x, cfTo.y, 12 + (1 - p) * 10, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
