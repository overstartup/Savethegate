// Big animated in-game announcements — "LEVEL 3!", "BOSS INCOMING!", "KA-BOOM!"
// Elastic pop-in, golden sunburst rays, hold, fade-up out. Pure canvas, no DOM.
import { CONFIG } from '../config.js';
import { F_TITLE, F_BODY } from './screens.js';

const AW = CONFIG.width, AH = CONFIG.height;

export class Announcer {
  constructor() {
    this.queue = [];
    this.current = null;
  }

  show(title, sub = '', color = '#ffd23d', duration = 1.6) {
    const a = { title, sub, color, duration, t: 0 };
    if (this.current) this.queue.push(a);
    else this.current = a;
  }

  update(dt) {
    if (!this.current) return;
    this.current.t += dt;
    if (this.current.t >= this.current.duration) {
      this.current = this.queue.shift() || null;
    }
  }

  render(ctx) {
    const a = this.current;
    if (!a) return;

    const IN = 0.28, OUT = 0.35;
    const t = a.t;
    let scale, alpha, rise = 0;

    if (t < IN) {
      // elastic overshoot pop-in
      const p = t / IN;
      scale = 1 + 0.45 * Math.sin(p * Math.PI) * (1 - p) + (p < 1 ? 0 : 0);
      scale = 0.3 + 0.7 * p + 0.25 * Math.sin(p * Math.PI);
      alpha = p;
    } else if (t > a.duration - OUT) {
      const p = (a.duration - t) / OUT;
      scale = 1;
      alpha = p;
      rise = (1 - p) * -30;
    } else {
      scale = 1 + Math.sin(t * 6) * 0.015;  // gentle breathing
      alpha = 1;
    }

    const cy = AH * 0.34 + rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(AW / 2, cy);
    ctx.scale(scale, scale);

    // sunburst rays behind the text
    ctx.save();
    ctx.rotate(t * 0.35);
    ctx.fillStyle = a.color;
    ctx.globalAlpha = alpha * 0.16;
    for (let i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-26, -190);
      ctx.lineTo(26, -190);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = alpha;

    // dark pill behind text for readability
    const wPill = Math.max(240, a.title.length * 22 + 60);
    ctx.fillStyle = 'rgba(15,8,35,0.72)';
    ctx.beginPath();
    ctx.roundRect(-wPill / 2, -46, wPill, a.sub ? 96 : 68, 24);
    ctx.fill();
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-wPill / 2, -46, wPill, a.sub ? 96 : 68, 24);
    ctx.stroke();

    // title with glow
    ctx.textAlign = 'center';
    ctx.font = `40px ${F_TITLE}`;
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#2a1f4d';
    ctx.lineWidth = 8;
    ctx.strokeText(a.title, 0, 2);
    ctx.fillStyle = a.color;
    ctx.fillText(a.title, 0, 2);
    ctx.shadowBlur = 0;

    // subtitle
    if (a.sub) {
      ctx.font = `19px ${F_BODY}`;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(a.sub, 0, 34);
    }
    ctx.restore();
  }
}
