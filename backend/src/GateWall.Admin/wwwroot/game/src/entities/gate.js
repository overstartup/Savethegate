// Portal gate — drifts down; walking through it changes your fire rate for 8s.
// Good (green): ×2 / ×3. Curse (purple): ×0.5. Steer wisely!
import { CONFIG } from '../config.js';

export class Gate {
  constructor(x, mult) {
    this.x = x;
    this.y = -40;
    this.rx = 44;
    this.ry = 30;
    this.mult = mult;
    this.good = mult > 1;
    this.pulse = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(dt) {
    this.y += CONFIG.monster.baseSpeed * 1.15 * dt;
    this.pulse += dt * 4;
    if (this.y - this.ry > CONFIG.height + 20) this.dead = true;
  }

  touches(px, py, pr) {
    const dx = (px - this.x) / (this.rx + pr);
    const dy = (py - this.y) / (this.ry + pr);
    return dx * dx + dy * dy <= 1;
  }
}
