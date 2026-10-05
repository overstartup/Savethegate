// Monster — a physics body. Group members are spring-damped toward their
// slot in a Flock formation (systems/flocks.js); singles wander down the
// lane on smooth layered-sine "noise" with a per-type personality (goblins
// dart, imps swoop, slimes hop, trolls lumber). Hits are real impulses that
// shove the body back, and separation keeps bodies from overlapping.
// Slimes split when killed; ranged types (shootInterval in
// data/monsters.js) fire back periodically.
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

    this.speedMult = speedMult;
    // `path` is only used by the boss now (its weave amplitude/frequency);
    // everyone else moves by physics — see _move().
    this.path = path || { curveAmp: 120, curveFreq: 1.3, phase: Math.random() * Math.PI * 2 };
    this.wobble = this.path.phase ?? 0;
    const mv = d.movement || { amp: 1, freq: 1, bob: 0 };
    this.bobAmp = mv.bob || 0;
    // Physics state + single-wanderer personality (smooth noise = two
    // incommensurate sines, so the drift never visibly repeats).
    this.pvx = 0;
    this.pvy = this.speed;
    this.flock = null;
    this.wander = {
      a1: 34 * mv.amp, f1: 0.9 * mv.freq, p1: Math.random() * 6.28,
      a2: 14 * mv.amp, f2: 2.3 * mv.freq, p2: Math.random() * 6.28,
    };
    this.hopping = type === 'slime' || type === 'slimeSmall';
    this.age = 0;

    // --- Motion-graphics state (read by render/creatures.js) ---------------
    // anim: walk/flap cycle phase, advanced by distance travelled so feet
    // never "skate". vx: smoothed lateral velocity → lean into turns.
    // knock: spring-back offset after a hit. spawnT: pop-in timer.
    this.anim = Math.random() * 10;
    this.seed = Math.random() * 100;
    this.vx = 0;
    this.knock = 0;
    this.squish = 0;
    this.spawnT = 0;
    this.slowT = 0;      // Frost Nova slow (seconds remaining)
    this.elite = false;
    this.boss = !!d.boss;
    this.flying = !!d.flying;
    this.fireFlash = 0;  // mouth-glow right after a shot

    this.shootInterval = d.shootInterval || null;
    // stagger first shot so a whole clump doesn't fire in sync
    this.shootTimer = this.shootInterval ? this.shootInterval * (0.4 + Math.random() * 0.8) : null;
  }

  // Elite variant — tougher, bigger, golden aura, pays out a gem burst.
  makeElite() {
    this.elite = true;
    this.hp = this.maxHp = Math.max(3, Math.round(this.maxHp * 3));
    this.r *= 1.3;
    this.score *= 4;
    this.power *= 2;
  }

  update(dt) {
    const prevX = this.x, prevY = this.y;
    this.spawnT += dt;
    if (this.slowT > 0) { this.slowT -= dt; dt *= 0.45; }
    this._move(dt);
    if (this.squish > 0) this.squish = Math.max(0, this.squish - dt * 5);
    if (this.fireFlash > 0) this.fireFlash -= dt;
    const realDt = Math.max(1e-4, dt);
    const ivx = (this.x - prevX) / realDt;
    this.vx += (ivx - this.vx) * Math.min(1, dt * 8);
    const travelled = Math.hypot(this.x - prevX, this.y - prevY);
    this.anim += travelled * 0.09 + dt * 2;
  }

  _move(dt) {
    if (this.boss) {
      // Bosses descend to a hover line near the top and fight from there —
      // weaving side to side and raining bullet patterns (see bossVolley in
      // main.js) instead of slowly sinking into the gate.
      this.age = (this.age || 0) + dt;
      const hoverY = 150;
      if (this.y < hoverY) this.y = Math.min(hoverY, this.y + Math.max(40, this.speed * 3) * dt);
      else this.y = hoverY + Math.sin(this.age * 0.9) * 14;
      this.wobble += dt * (this.path.curveFreq ?? 1.3) * (this.enraged ? 1.5 : 1);
      this.x = CONFIG.width / 2 + Math.sin(this.wobble) * (this.path.curveAmp ?? 120);
      this.x = Math.max(this.r, Math.min(CONFIG.width - this.r, this.x));
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.shootTimer !== null) this.shootTimer -= dt;
      return;
    }
    this.age += dt;
    const W = CONFIG.width;
    let ax, ay;
    if (this.flock && !this.flock.dead) {
      // Critically-damped spring toward the formation slot, damped relative
      // to the leader's own velocity → the group glides as one body.
      const tgt = this.flock.target(this);
      const k = 14, c = 2 * Math.sqrt(k);
      ax = k * (tgt.x - this.x) - c * (this.pvx - this.flock.vx);
      ay = k * (tgt.y - this.y) - c * (this.pvy - this.flock.vy);
    } else {
      // Lone wanderer: steer toward a smoothly varying desired velocity.
      const w = this.wander, t = this.age;
      let dvx = Math.cos(t * w.f1 + w.p1) * w.a1 + Math.cos(t * w.f2 + w.p2) * w.a2;
      // soft walls — turn back well before the edge instead of clamping
      const edge = 40 + this.r;
      if (this.x < edge) dvx += (edge - this.x) * 4;
      if (this.x > W - edge) dvx -= (this.x - (W - edge)) * 4;
      let dvy = this.speed;
      if (this.hopping) dvy *= 0.35 + 1.3 * Math.abs(Math.sin(this.anim * 0.35 * Math.PI)); // hop rhythm
      ax = (dvx - this.pvx) * 3;
      ay = (dvy - this.pvy) * 3;
    }
    this.pvx += ax * dt;
    this.pvy += ay * dt;
    // speed limit so catch-ups and shoves stay graceful
    const maxV = this.speed * 3 + 120;
    const v = Math.hypot(this.pvx, this.pvy);
    if (v > maxV) { this.pvx *= maxV / v; this.pvy *= maxV / v; }
    this.x += this.pvx * dt;
    this.y += this.pvy * dt;
    if (this.x < this.r) { this.x = this.r; this.pvx = Math.abs(this.pvx) * 0.5; }
    if (this.x > W - this.r) { this.x = W - this.r; this.pvx = -Math.abs(this.pvx) * 0.5; }
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.shootTimer !== null) this.shootTimer -= dt;
  }

  // Returns true when it's time to fire an enemy bullet (only ranged types).
  tryShoot() {
    if (this.shootTimer === null || this.dead) return false;
    if (this.shootTimer <= 0 && this.y > 10) {
      this.shootTimer = this.shootInterval * (this.enraged ? 0.6 : 1);
      this.fireFlash = 0.18;
      return true;
    }
    return false;
  }

  // Returns array of split children when a splitter dies, else null.
  // True while the monster is visibly "charging" a shot — the renderer
  // draws a growing glow so the player can read incoming fire.
  get windup() {
    if (this.shootTimer === null || this.y < 10) return 0;
    const w = 0.45;
    return this.shootTimer < w ? 1 - this.shootTimer / w : 0;
  }

  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.1;
    this.squish = 1;
    // real impulse: shoves the body back up the lane; its spring / steering
    // pulls it back into place, so hits read as physical
    if (!this.boss) this.pvy -= (this.elite ? 35 : 70) / Math.max(1, this.r / 14);
    if (this.boss && !this.enraged && this.hp <= this.maxHp * 0.5) this.enraged = true;
    if (this.hp <= 0) {
      this.dead = true;
      if (this.splitsInto) {
        const kids = [-1, 1].map((side) => {
          const k = new Monster(this.splitsInto, this.x + side * this.r * 0.6, this.y, this.speedMult, null, this.hpMult);
          k.isChild = true;
          k.pvx = side * 160;   // burst apart sideways, then wander off
          k.pvy = -60;
          k.damage = this.damage;
          return k;
        });
        return kids;
      }
    }
    return null;
  }
}
