// Big animated in-game announcements — "LEVEL 3!", "BOSS INCOMING!", "KA-BOOM!"
// Elastic pop-in, golden sunburst rays, hold, fade-up out. Pure canvas, no DOM.
import { CONFIG } from '../config.js';
import { F_TITLE, F_BODY } from './screens.js';
import { fitFont } from '../i18n.js';

const AW = CONFIG.width, AH = CONFIG.height;

export class Announcer {
  constructor() {
    this.queue = [];
    this.current = null;
  }

  show(title, sub = '', color = '#ffd23d', duration = 1.6) {
    const a = { title, sub, color, duration, t: 0 };
    if (!this.current) { this.current = a; return; }
    // never pile up: keep only the newest waiting message and let the one
    // on screen finish quickly
    this.queue = [a];
    this.current.duration = Math.min(this.current.duration, this.current.t + 0.5);
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

    // Kept small and see-through — these fire constantly during play (every
    // weapon use, combo, heart lost, ...) so they read as a quick corner-of-
    // the-eye confirmation, not a big banner blocking the lane the player is
    // actually watching. Capped well under full alpha even at its most
    // "solid" moment, and sized down a lot from the old big-banner look.
    const cy = AH * 0.22 + rise;
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.translate(AW / 2, cy);
    ctx.scale(scale, scale);

    // sunburst rays behind the text — faint, just a hint of color/motion
    ctx.save();
    ctx.rotate(t * 0.35);
    ctx.fillStyle = a.color;
    ctx.globalAlpha = alpha * 0.08;
    for (let i = 0; i < 10; i++) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-16, -110);
      ctx.lineTo(16, -110);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = alpha * 0.7;

    // dark pill behind text for readability — much more transparent than
    // before so the gameplay behind it stays visible.
    // Pill sized from the measured title (works for any language/script),
    // which itself shrinks to fit the screen if it is very long.
    const titleFont = fitFont(ctx, a.title, `22px ${F_TITLE}`, AW - 60);
    const subFont = a.sub ? fitFont(ctx, a.sub, `12px ${F_BODY}`, AW - 60) : '';
    ctx.font = titleFont;
    let wPill = ctx.measureText(a.title).width + 36;
    if (a.sub) { ctx.font = subFont; wPill = Math.max(wPill, ctx.measureText(a.sub).width + 28); }
    wPill = Math.min(AW - 24, Math.max(150, wPill));
    ctx.fillStyle = 'rgba(15,8,35,0.4)';
    ctx.beginPath();
    ctx.roundRect(-wPill / 2, -28, wPill, a.sub ? 58 : 42, 16);
    ctx.fill();
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-wPill / 2, -28, wPill, a.sub ? 58 : 42, 16);
    ctx.stroke();

    // title with glow
    ctx.textAlign = 'center';
    ctx.font = titleFont;
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#2a1f4d';
    ctx.lineWidth = 4;
    ctx.strokeText(a.title, 0, 0);
    ctx.fillStyle = a.color;
    ctx.fillText(a.title, 0, 0);
    ctx.shadowBlur = 0;

    // subtitle
    if (a.sub) {
      ctx.font = subFont;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(a.sub, 0, 20);
    }
    ctx.restore();
  }
}
