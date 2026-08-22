// Monster — travels a "path" from its spawn point toward a target point at
// the bottom of the screen, with a wave/curve overlay riding on top. This is
// what lets clumps carve diagonal or swooping lines across the lane instead
// of just dropping straight down — a whole clump can share the same path so
// they move together like a flock. Slimes split when killed; ranged types
// (shootInterval set in data/monsters.js) fire back periodically.
import { CONFIG } from '../config.js';
import { MONSTERS } from '../data/monsters.js';

export class Monster {
  constructor(type, x, y, speedMult = 1, path = null, hpMult = 1) {
    const d = MONSTERS[type];
    this.type = type;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    // hpMult scales up with stage (see data/levels.js) — early stages keep
    // the base one-or-two-hit kill, later stages need more hits.
    this.hpMult = hpMult;
    const hp = Math.max(1, Math.round(d.hp * hpMult));
    this.hp = hp;
    this.maxHp = hp;
    this.damage = Math.max(5, Math.round((d.damage || 10) * hpMult));
    this.r = d.size / 2;
    this.color = d.color;
    this.score = d.coins * 10;
    this.speed = CONFIG.monster.baseSpeed * d.speed * speedMult;
    this.splitsInto = d.splitsInto || null;
    this.hitFlash = 0;
    this.dead = false;

    // Movement path — { targetX, curveAmp, curveFreq, phase }. Default is the
    // old behavior: a gentle in-place waddle straight down (randomized phase
    // so solo monsters don't all wobble identically). Group clumps get an
    // explicit shared path from the spawner — in that case the phase must be
    // used EXACTLY as given (no extra randomness added), or the sine overlay
    // desyncs between members and the "move together" effect is lost.
    this.path = path || { targetX: x, curveAmp: 14, curveFreq: 6, phase: Math.random() * Math.PI * 2 };
    this.wobble = this.path.phase ?? 0;

    this.shootInterval = d.shootInterval || null;
    // stagger first shot so a whole clump doesn't fire in sync
    this.shootTimer = this.shootInterval ? this.shootInterval * (0.4 + Math.random() * 0.8) : null;
  }

  update(dt) {
    this.y += this.speed * dt;
    this.wobble += dt * (this.path.curveFreq ?? 6);

    // Ease (smoothstep) the lateral drift from spawn point to target point as
    // the monster falls, so a clump can start in one corner and finish in
    // another — the sine overlay on top gives it a carved, swooping feel
    // rather than a straight diagonal line.
    const span = Math.max(1, CONFIG.height - this.startY);
    const progress = Math.max(0, Math.min(1, (this.y - this.startY) / span));
    const eased = progress * progress * (3 - 2 * progress);
    const baseX = this.startX + (this.path.targetX - this.startX) * eased;
    this.x = baseX + Math.sin(this.wobble) * (this.path.curveAmp ?? 14);

    this.x = Math.max(this.r, Math.min(CONFIG.width - this.r, this.x));
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shootTimer !== null) this.shootTimer -= dt;
  }

  // Returns true when it's time to fire an enemy bullet (only ranged types).
  tryShoot() {
    if (this.shootTimer === null || this.dead) return false;
    if (this.shootTimer <= 0 && this.y > 10) {
      this.shootTimer = this.shootInterval;
      return true;
    }
    return false;
  }

  // Returns array of split children when a splitter dies, else null.
  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.dead = true;
      if (this.splitsInto) {
        const childPath = { targetX: this.x, curveAmp: 16, curveFreq: 7, phase: Math.random() * Math.PI * 2 };
        return [
          new Monster(this.splitsInto, this.x - this.r * 0.8, this.y, 1, childPath, this.hpMult),
          new Monster(this.splitsInto, this.x + this.r * 0.8, this.y, 1, childPath, this.hpMult),
        ];
      }
    }
    return null;
  }
}
