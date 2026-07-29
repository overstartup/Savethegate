// Juice: poofs, sparkles, floating score text, screen shake.
const rand = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor() {
    this.list = [];
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

  sparkle(x, y, color = '#ffd23d') {
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(20, 90);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        r: rand(2, 4), life: rand(0.3, 0.6), t: 0, color,
      });
    }
  }

  scoreText(x, y, str, color = '#ffd23d') {
    this.texts.push({ x, y, str, color, t: 0, life: 0.8 });
  }

  addShake(amount) { this.shake = Math.min(12, this.shake + amount); }

  update(dt) {
    for (const p of this.list) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
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
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Fredoka", Arial';
    for (const t of this.texts) {
      ctx.globalAlpha = 1 - t.t / t.life;
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
