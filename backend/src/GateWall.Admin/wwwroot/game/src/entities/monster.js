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
    // Base bullet damage raised (was 10) so enemy fire actually chews into
    // the blood line meaningfully instead of needing ~20 hits to cost a
    // heart — bullets should hurt.
    this.damage = Math.max(5, Math.round((d.damage || 20) * hpMult));
    this.r = d.size / 2;
    this.color = d.color;
    this.score = d.coins * 10;
    this.speed = CONFIG.monster.baseSpeed * d.speed * speedMult;
    this.splitsInto = d.splitsInto || null;
    this.hitFlash = 0;
    this.dead = false;
    // Fixed power cost for the BOMB weapon's power-budget targeting (see
    // buyWeapon('bomb') in main.js) — deliberately NOT scaled by hpMult, so
    // the bomb behaves consistently across every stage.
    this.power = d.power ?? 50;

    // Movement path — { targetX, curveAmp, curveFreq, phase }. Default is the
    // old behavior: a gentle in-place waddle straight down (randomized phase
    // so solo monsters don't all wobble identically). Group clumps get an
    // explicit shared path from the spawner — in that case the phase must be
    // used EXACTLY as given (no extra randomness added), or the sine overlay
    // desyncs between members and the "move together" effect is lost.
    const basePath = path || { targetX: x, curveAmp: 14, curveFreq: 6, phase: Math.random() * Math.PI * 2 };
    // Every type gets its own movement "personality" (see MONSTERS.<type>.
    // movement) layered on top of whatever shared clump path was assigned —
    // this is what makes a goblin dart, a slime bounce, a skeleton march,
    // and a troll lumber differently even when spawned in the same clump
    // heading the same direction, instead of every monster on screen moving
    // identically.
    const mv = d.movement || { amp: 1, freq: 1, bob: 0 };
    if (basePath.type === 'circle') {
      // Circle/spiral formation (see spawner.js's flyCircle pattern) — orbits
      // a fixed center point while still falling at normal speed, instead of
      // lerping toward a targetX. Personality amp/freq don't apply to the
      // orbit itself (would just distort the circle) so this path is left
      // as-is rather than run through the curveAmp/curveFreq multiply below.
      this.path = { ...basePath };
      this.age = 0;
    } else {
      this.path = {
        ...basePath,
        curveAmp: (basePath.curveAmp ?? 14) * mv.amp,
        curveFreq: (basePath.curveFreq ?? 6) * mv.freq,
      };
    }
    this.bobAmp = mv.bob || 0;
    this.wobble = this.path.phase ?? 0;

    this.shootInterval = d.shootInterval || null;
    // stagger first shot so a whole clump doesn't fire in sync
    this.shootTimer = this.shootInterval ? this.shootInterval * (0.4 + Math.random() * 0.8) : null;
  }

  update(dt) {
    if (this.path.type === 'circle') {
      // Fly-circle formation — orbits a fixed center point while still
      // falling at the normal per-monster speed, instead of lerping toward a
      // targetX. This is what makes the "fly circle" pattern read as a real
      // spinning ring/spiral of monsters rather than just a wobbly line.
      this.age += dt;
      this.y = this.startY + this.speed * this.age;
      const angle = (this.path.phase || 0) + this.age * (this.path.angularSpeed || 3);
      this.x = this.path.centerX + Math.cos(angle) * this.path.radius;
      this.x = Math.max(this.r, Math.min(CONFIG.width - this.r, this.x));
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.shootTimer !== null) this.shootTimer -= dt;
      return;
    }

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
