// Portal gate — drifts down; walking through it is a pure gift, never a
// punishment. Two kinds: 'mult' (most common) boosts fire rate ×2/×3 for a
// few seconds; 'blood' (rarer — see CONFIG.gate.bloodGiftChance) instead
// restores part of the blood line outright. There is no more curse/bad
// portal — every gate is worth grabbing.
// Sized smaller than the old dual-portal layout (this used to be one of two
// side-by-side choices; now it's a single small gift drifting down the lane).
import { CONFIG } from '../config.js';

export class Gate {
  constructor(x, mult, kind = 'mult') {
    this.x = x;
    this.y = -40;
    this.rx = 30;
    this.ry = 20;
    this.kind = kind;             // 'mult' | 'blood'
    this.mult = mult;             // only meaningful for kind === 'mult'
    this.good = true;             // every gate is a gift now
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
