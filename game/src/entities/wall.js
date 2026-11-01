// Wall — a player-placed defensive barrier. Blocks monsters from passing
// (they're pushed back against it) and chips away at any monster pressed
// against it; monsters chip back at the wall in return, so a weak monster
// dies against the wall while a tough one eventually breaks through it.
// Also blocks enemy bullets (a proper barrier against enemy fire).
import { CONFIG } from '../config.js';
import { statBonus } from '../data/upgrades.js';

export class Wall {
  // up = Armory levels { hp, thorns } (data/upgrades.js)
  constructor(x, y, up = {}, stageIdx = 0) {
    const W = CONFIG.helpers.wall;
    this.x = x;
    this.y = y;
    this.w = W.width * statBonus('wall', 'width', up.width || 0); // Armory WIDTH
    this.h = W.height;
    this.hp = W.hp * statBonus('wall', 'hp', up.hp || 0) * (1 + CONFIG.helpers.stageHp * stageIdx);
    this.thorns = W.thorns * statBonus('wall', 'thorns', up.thorns || 0); // x bolt damage, per second
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
