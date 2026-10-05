// Spell projectile — travels along (vx, vy); default is straight up.
// pierce: how many extra monsters it can pass through. kind picks the look
// ('bolt' player shot, 'fever' rainbow, 'seeker' homing missile, 'turret').
import { CONFIG } from '../config.js';

export class Spell {
  constructor(x, y, damage = CONFIG.spell.damage, opts = {}) {
    this.x = x;
    this.y = y;
    this.r = opts.r || CONFIG.spell.size;
    this.damage = damage;
    const speed = opts.speed || CONFIG.spell.speed;
    const ang = opts.angle || 0; // radians off vertical, + = right
    this.vx = Math.sin(ang) * speed;
    this.vy = -Math.cos(ang) * speed;
    this.speed = speed;
    this.pierce = opts.pierce || 0;
    this.kind = opts.kind || 'bolt';
    this.homing = !!opts.homing;
    this.hue = opts.hue || 0;
    this.hitSet = null;
    this.age = 0;
    this.dead = false;
  }

  update(dt) {
    this.age += dt;
    if (this.homing && this.target && !this.target.dead) {
      // steer toward the target, capped turn rate so missiles arc nicely
      const want = Math.atan2(this.target.x - this.x, -(this.target.y - this.y));
      const cur = Math.atan2(this.vx, -this.vy);
      let d = want - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const turn = Math.max(-6 * dt, Math.min(6 * dt, d));
      const a = cur + turn;
      this.vx = Math.sin(a) * this.speed;
      this.vy = -Math.cos(a) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -30 || this.y > CONFIG.height + 30 || this.x < -30 || this.x > CONFIG.width + 30) this.dead = true;
  }
}
