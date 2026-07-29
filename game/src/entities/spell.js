// Spell projectile — travels straight up.
import { CONFIG } from '../config.js';

export class Spell {
  constructor(x, y, damage = CONFIG.spell.damage) {
    this.x = x;
    this.y = y;
    this.r = CONFIG.spell.size;
    this.damage = damage;
    this.dead = false;
  }

  update(dt) {
    this.y -= CONFIG.spell.speed * dt;
    if (this.y < -30) this.dead = true;
  }
}
