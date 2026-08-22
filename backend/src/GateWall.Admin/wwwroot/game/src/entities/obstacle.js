// Stone rune obstacle — blocks spells, drifts slowly downward ("living lanes").
import { CONFIG } from '../config.js';

export class Obstacle {
  constructor(x, y, w = 76, h = 26) {
    this.x = x;   // center
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;  // set by spawner on levels with moving obstacles
    this.dead = false;
  }

  update(dt) {
    this.y += CONFIG.obstacle.driftSpeed * dt;
    this.x += this.vx * dt;
    // bounce off screen edges
    if (this.x - this.w / 2 < 0) { this.x = this.w / 2; this.vx = Math.abs(this.vx); }
    if (this.x + this.w / 2 > CONFIG.width) { this.x = CONFIG.width - this.w / 2; this.vx = -Math.abs(this.vx); }
    if (this.y - this.h / 2 > CONFIG.height) this.dead = true;
  }

  contains(px, py, pr = 0) {
    return (
      px + pr > this.x - this.w / 2 && px - pr < this.x + this.w / 2 &&
      py + pr > this.y - this.h / 2 && py - pr < this.y + this.h / 2
    );
  }
}
