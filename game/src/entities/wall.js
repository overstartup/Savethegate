// Wall — a player-placed defensive barrier. Blocks monsters from passing
// (they're pushed back against it) and chips away at any monster pressed
// against it; monsters chip back at the wall in return, so a weak monster
// dies against the wall while a tough one eventually breaks through it.
// Also blocks enemy bullets (a proper barrier against enemy fire).
import { CONFIG } from '../config.js';

export class Wall {
  // up = Armory levels { hp, thorns } (data/upgrades.js)
  constructor(x, y, up = {}) {
    this.x = x;
    this.y = y;
    this.w = CONFIG.wall.width;
    this.h = CONFIG.wall.height;
    this.hp = CONFIG.wall.hp * (1 + 0.25 * (up.hp || 0));
    this.thorns = 1 + 0.3 * (up.thorns || 0);
    this.maxHp = this.hp;
    this.hitFlash = 0;
    this.dead = false;
  }

  contains(px, py, pr = 0) {
    return (
      px + pr > this.x - this.w / 2 && px - pr < this.x + this.w / 2 &&
      py + pr > this.y - this.h / 2 && py - pr < this.y + this.h / 2
    );
  }

  update(dt) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.12;
    if (this.hp <= 0) this.dead = true;
  }
}
