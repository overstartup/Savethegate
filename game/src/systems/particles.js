// Juice: poofs, sparkles, crystal shatter shards, shockwave rings, lightning
// arcs, floating score text, screen shake.
const rand = (a, b) => a + Math.random() * (b - a);

// Hard cap so a huge chain of kills can never tank the frame rate.
const MAX_PARTICLES = 700;

export class Particles {
  constructor() {
    this.list = [];
    this.shards = [];
    this.rings = [];
    this.bolts = [];
    this.texts = [];
    this.shake = 0;
  }

  poof(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 160);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rand(3, 8), life: rand(0.25, 0.5), t: 0, color,
      });
    }
  }

  sparkle(x, y, color = '#ffd23d', n = 6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(20, 90);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        r: rand(2, 4), life: rand(0.3, 0.6), t: 0, color,
      });
    }
  }

  // Small upward dust kicked off the Guardian's feet while moving fast.
  dust(x, y, color = 'rgba(255,255,255,0.6)') {
    this.list.push({
      x: x + rand(-6, 6), y, vx: rand(-20, 20), vy: rand(-30, -10),
      r: rand(2, 4), life: rand(0.25, 0.4), t: 0, color, noGravity: true,
    });
  }

  // Crystal shatter — spinning triangular shards flung out with gravity.
  // This is the main "monster died" read: Shatterlings break apart.
  shatter(x, y, color, radius = 14, count = 9) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(80, 220) * (radius / 14) ** 0.4;
      this.shards.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        rot: rand(0, Math.PI * 2), vr: rand(-12, 12),
        s: rand(0.25, 0.55) * radius, life: rand(0.45, 0.8), t: 0, color,
      });
    }
  }

  // Expanding shockwave ring.
  ring(x, y, color = '#ffffff', maxR = 40, life = 0.35, width = 4) {
    this.rings.push({ x, y, color, maxR, life, t: 0, width });
  }

  // Jagged lightning arc through a list of points [{x,y}, ...].
  bolt(points, color = '#bfe9ff', life = 0.18) {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const n = 6;
      const pts = [a];
      for (let k = 1; k < n; k++) {
        const f = k / n;
        const nx = -(b.y - a.y), ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        const off = rand(-10, 10);
        pts.push({ x: a.x + (b.x - a.x) * f + (nx / len) * off, y: a.y + (b.y - a.y) * f + (ny / len) * off });
      }
      pts.push(b);
      segs.push(pts);
    }
    this.bolts.push({ segs, color, life, t: 0 });
  }

  scoreText(x, y, str, color = '#ffd23d', size = 18) {
    this.texts.push({ x, y, str, color, t: 0, life: 0.8, size });
  }

  addShake(amount) { this.shake = Math.min(12, this.shake + amount); }

  update(dt) {
    for (const p of this.list) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.noGravity) p.vy += 300 * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
    if (this.list.length > MAX_PARTICLES) this.list.splice(0, this.list.length - MAX_PARTICLES);

    for (const s of this.shards) {
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 520 * dt; s.rot += s.vr * dt;
      s.vx *= 0.985;
    }
    this.shards = this.shards.filter((s) => s.t < s.life);
    if (this.shards.length > 400) this.shards.splice(0, this.shards.length - 400);

    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const b of this.bolts) b.t += dt;
    this.bolts = this.bolts.filter((b) => b.t < b.life);

    for (const t of this.texts) { t.t += dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter((t) => t.t < t.life);
    this.shake *= Math.pow(0.001, dt); // fast decay
  }

  render(ctx) {
    for (const p of this.list) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of this.shards) {
      const a = 1 - s.t / s.life;
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(0, -s.s);
      ctx.lineTo(s.s * 0.55, s.s * 0.6);
      ctx.lineTo(-s.s * 0.55, s.s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, -s.s);
      ctx.lineTo(s.s * 0.18, s.s * 0.2);
      ctx.lineTo(-s.s * 0.3, s.s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const r of this.rings) {
      const f = r.t / r.life;
      const ease = 1 - (1 - f) * (1 - f);
      ctx.globalAlpha = (1 - f) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - f) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(1, r.maxR * ease), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.bolts.length) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const b of this.bolts) {
        const a = 1 - b.t / b.life;
        for (const pass of [{ w: 6, c: b.color, al: 0.35 }, { w: 2, c: '#ffffff', al: 1 }]) {
          ctx.globalAlpha = a * pass.al;
          ctx.strokeStyle = pass.c;
          ctx.lineWidth = pass.w;
          for (const pts of b.segs) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const f = t.t / t.life;
      // quick pop-in scale, then float + fade
      const pop = f < 0.15 ? 0.6 + (f / 0.15) * 0.6 : 1.2 - Math.min(0.2, (f - 0.15));
      ctx.globalAlpha = 1 - f * f;
      ctx.font = `bold ${Math.round(t.size * pop)}px "Fredoka", Arial`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,10,40,0.7)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
