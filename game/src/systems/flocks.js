// ============================================================
// Flocks — physics-driven group movement for Shatterlings.
//
// A Flock is a VIRTUAL leader (not a monster, so killing members never
// breaks the group) that glides down the lane on a smooth harmonic path:
// steady descent + a sine sway around a center that drifts and softly
// bounces off the lane edges. Each member is pulled toward its formation
// slot by a critically-damped spring (no jitter, no overshoot), damped
// RELATIVE to the leader's velocity so the whole group glides as one.
// When members die the survivors are re-slotted and smoothly "close
// ranks". Separation (applySeparation) keeps every body from overlapping.
// ============================================================
import { CONFIG } from '../config.js';

const flRand = (a, b) => a + Math.random() * (b - a);

// name → weight; later levels unlock the showier formations (see pickFormation)
const FORMATION_INFO = {
  vee:     { weight: 3, minLis: 0 },
  line:    { weight: 3, minLis: 0 },
  arc:     { weight: 2, minLis: 0 },
  wave:    { weight: 2, minLis: 1 },
  diamond: { weight: 2, minLis: 2 },
  snake:   { weight: 2, minLis: 1 },
  circle:  { weight: 2, minLis: 3 },
};

export function pickFormation(lis) {
  const list = Object.entries(FORMATION_INFO).filter(([, f]) => lis >= f.minLis);
  let total = 0;
  for (const [, f] of list) total += f.weight;
  let r = Math.random() * total;
  for (const [k, f] of list) { r -= f.weight; if (r <= 0) return k; }
  return list[0][0];
}

export class Flock {
  // opts: { x, formation, size, speed, spacing }
  constructor(opts) {
    const W = CONFIG.width;
    this.formation = opts.formation;
    this.spacing = opts.spacing || 34;
    this.speed = opts.speed;                 // descent px/s
    this.t = 0;
    this.members = [];
    this.trail = [];                         // leader history (snake formation)
    this.slots = new Map();
    this.aliveCount = -1;

    // Harmonic path: sway around a drifting center.
    const n = opts.size;
    const halfW = this.halfWidth(n);
    const margin = 30 + halfW;
    this.cx = Math.max(margin, Math.min(W - margin, opts.x));
    this.margin = margin;
    const snake = this.formation === 'snake';
    this.amp = snake ? flRand(60, 110) : flRand(18, 46);
    this.freq = snake ? flRand(1.2, 1.8) : flRand(0.5, 1.1);
    this.phase = flRand(0, Math.PI * 2);
    this.drift = (Math.random() < 0.5 ? -1 : 1) * flRand(8, 26);
    this.spin = (Math.random() < 0.5 ? -1 : 1) * flRand(0.8, 1.3); // circle rotation
    this.x = this.cx + Math.sin(this.phase) * this.amp;
    this.y = -40 - this.depth(n);
    this.vx = 0;
    this.vy = this.speed;
    this.heading = 0;
    this.dead = false;
  }

  halfWidth(n) {
    const s = this.spacing;
    switch (this.formation) {
      case 'line': case 'wave': return ((n - 1) / 2) * s;
      case 'vee': return Math.ceil((n - 1) / 2) * s;
      case 'arc': return Math.min(n, 7) * s * 0.4;
      case 'circle': return this.ringRadius(n);
      case 'diamond': return Math.ceil(Math.sqrt(n)) * s * 0.75;
      case 'snake': return this.amp || 80;
      default: return s;
    }
  }

  depth(n) {
    const s = this.spacing;
    switch (this.formation) {
      case 'vee': return Math.ceil((n - 1) / 2) * s * 0.8;
      case 'circle': return this.ringRadius(n) * 2;
      case 'diamond': return Math.ceil(Math.sqrt(n)) * s * 1.5;
      case 'snake': return n * 26;
      default: return s;
    }
  }

  ringRadius(n) { return Math.max(this.spacing * 0.9, (n * this.spacing) / (2 * Math.PI)); }

  add(m) {
    m.flock = this;
    this.members.push(m);
  }

  // Slot offsets (relative to the leader, +y = toward the gate) for n alive.
  assignSlots(alive) {
    const n = alive.length, s = this.spacing;
    this.slots.clear();
    alive.forEach((m, i) => {
      let dx = 0, dy = 0;
      switch (this.formation) {
        case 'line': case 'wave':
          dx = (i - (n - 1) / 2) * s; break;
        case 'vee': {
          const k = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
          dx = side * k * s; dy = -k * s * 0.8; break;
        }
        case 'arc': {
          const a = n > 1 ? -1.0 + (2.0 * i) / (n - 1) : 0;
          const R = Math.max(s * 1.6, (n * s) / 2.2);
          dx = Math.sin(a) * R; dy = Math.cos(a) * R * 0.45 - R * 0.45; break;
        }
        case 'circle':
          dx = i; dy = 0; break; // angle index — resolved live in target()
        case 'diamond': {
          const k = Math.ceil(Math.sqrt(n));
          const row = Math.floor(i / k), col = i % k;
          dx = (col - row) * s * 0.75;
          dy = -(col + row) * s * 0.75 + (k - 1) * s * 0.75;
          break;
        }
        case 'snake':
          dx = i; break; // trail index — resolved live in target()
      }
      this.slots.set(m, { dx, dy, i });
    });
    this.aliveCount = n;
  }

  update(dt) {
    const W = CONFIG.width;
    this.t += dt;
    // center drifts and softly reflects inside the lane
    this.cx += this.drift * dt;
    if (this.cx < this.margin) { this.cx = this.margin; this.drift = Math.abs(this.drift); }
    if (this.cx > W - this.margin) { this.cx = W - this.margin; this.drift = -Math.abs(this.drift); }
    const nx = this.cx + Math.sin(this.freq * this.t + this.phase) * this.amp;
    this.vx = (nx - this.x) / Math.max(dt, 1e-4);
    this.x = nx;
    this.vy = this.speed;
    this.y += this.speed * dt;
    this.heading = Math.atan2(this.vx, this.vy); // 0 = straight down
    // trail sampled by DISTANCE (every 2px) so the snake spacing holds even
    // during slow-motion or frame drops
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y) >= 2) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 600) this.trail.shift();
    }

    const alive = this.members.filter((m) => !m.dead);
    if (alive.length !== this.aliveCount) this.assignSlots(alive);
    if (!alive.length && this.t > 0.5) this.dead = true;
    if (this.y > CONFIG.height + 400) this.dead = true;
  }

  // World-space target for member m.
  target(m) {
    const slot = this.slots.get(m);
    if (!slot) return { x: this.x, y: this.y };
    if (this.formation === 'snake') {
      // follow-the-leader: each member rides the leader's own trail, a fixed
      // distance behind — the group slithers like one creature
      const back = Math.round((slot.i * this.spacing * 0.85) / 2);
      const p = this.trail[Math.max(0, this.trail.length - 1 - back)];
      return p ? { x: p.x, y: p.y } : { x: this.x, y: this.y - slot.i * this.spacing };
    }
    if (this.formation === 'circle') {
      const n = Math.max(1, this.aliveCount);
      const a = (slot.i / n) * Math.PI * 2 + this.t * this.spin;
      const R = this.ringRadius(n);
      return { x: this.x + Math.cos(a) * R, y: this.y + Math.sin(a) * R * 0.8 };
    }
    let { dx, dy } = slot;
    if (this.formation === 'wave') dy += Math.sin(this.t * 3.2 - slot.i * 0.9) * this.spacing * 0.45;
    // tilt the formation gently into the turn — reads like banking birds
    const rot = -this.heading * 0.6;
    const c = Math.cos(rot), s = Math.sin(rot);
    return { x: this.x + dx * c - dy * s, y: this.y + dx * s + dy * c };
  }
}

// Soft-body separation — overlapping Shatterlings push each other apart
// through their velocities (so the springs/wander smooth it out), never by
// snapping positions.
export function applySeparation(monsters, dt) {
  const n = monsters.length;
  for (let i = 0; i < n; i++) {
    const a = monsters[i];
    if (a.dead || a.boss) continue;
    for (let j = i + 1; j < n; j++) {
      const b = monsters[j];
      if (b.dead || b.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const minD = (a.r + b.r) * 1.05;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minD * minD || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const push = ((minD - d) / minD) * 900 * dt;
      const ux = dx / d, uy = dy / d;
      a.pvx -= ux * push; a.pvy -= uy * push * 0.6;
      b.pvx += ux * push; b.pvy += uy * push * 0.6;
    }
  }
}
