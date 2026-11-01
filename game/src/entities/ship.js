// Ship — Sea War only. Patrols horizontally along the water surface line
// (left→right or right→left), firing bullets down at the Guardian, and can
// be shot down for score/coins just like a regular monster. It never falls
// and never reaches the GateWall directly — its bullets are the threat.
// Passing sprite 'airship' makes a Clockwork City airship instead: same
// behaviour, CONFIG.airship stats, flagged .air (drawn procedurally in
// main.js, no water effects, bursts into gears/smoke when shot down).
import { CONFIG } from '../config.js';

export class Ship {
  constructor(x, y, dir, speedMult = 1, hpMult = 1, sprite = 'ship-pirate-medium') {
    this.type = 'ship';
    this.air = sprite === 'airship';
    const C = this.air ? CONFIG.airship : CONFIG.ship;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.dir = dir; // 1 = sailing left→right, -1 = right→left
    // The small hull is lighter/faster than the two mediums, for variety.
    const speedBoost = sprite === 'ship-pirate-small' ? 1.35 : 1;
    this.speed = C.baseSpeed * speedMult * speedBoost;
    this.r = C.size / 2;
    this.sprite = sprite;
    this.color = this.air ? '#b8743a' : '#2a4d70'; // fallback tint if the sprite hasn't loaded yet
    const baseHp = sprite === 'ship-pirate-small' ? C.baseHp - 1 : C.baseHp;
    const hp = Math.max(2, Math.round(baseHp * hpMult));
    this.hp = hp;
    this.maxHp = hp;
    // Raised alongside monster bullet damage (was 15) so ship cannonballs
    // hurt proportionally more too.
    this.damage = Math.max(5, Math.round(24 * hpMult));
    this.hitFlash = 0;
    this.score = C.score;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.dead = false;

    this.shootInterval = C.shootInterval;
    this.shootTimer = this.shootInterval * (0.3 + Math.random() * 0.7);
  }

  update(dt) {
    this.x += this.dir * this.speed * dt;
    // ships sway on the swell; airships ride a slower, deeper float
    this.bobPhase += dt * (this.air ? 1.2 : 1.6);
    this.y = this.baseY + Math.sin(this.bobPhase) * (this.air ? 5 : 4);
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shootTimer !== null) this.shootTimer -= dt;
    // Sailed clean off the far edge — recycle rather than lingering forever.
    if (this.x < -70 || this.x > CONFIG.width + 70) this.dead = true;
  }

  tryShoot() {
    if (this.dead || this.shootTimer === null) return false;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootInterval;
      return true;
    }
    return false;
  }

  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.1;
    if (this.hp <= 0) this.dead = true;
    return null; // ships never split
  }
}
