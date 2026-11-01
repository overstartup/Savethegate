// Rolling hazard — blocks spells, rolls slowly downward ("living lanes").
// main.js drawObstacle() draws it as a shaded round body turning by `roll`.
import { CONFIG } from '../config.js';

export class Obstacle {
  constructor(x, y, w = 76, h = 26) {
    this.x = x;   // center
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;  // set by spawner on levels with moving obstacles
    this.dead = false;
    this.seed = Math.random() * 1000; // its own lumpy outline / details
    this.roll = Math.random() * Math.PI * 2; // turned so far (radians)
  }

  update(dt) {
    this.y += CONFIG.obstacle.driftSpeed * dt;
    this.x += this.vx * dt;
    // roll with the distance travelled: forward downhill, plus sideways slides
    const r = Math.min(this.w, this.h) / 2;
    this.roll += (CONFIG.obstacle.driftSpeed + this.vx * 0.6) * dt / r;
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
