// Monster — a physics body. Group members are spring-damped toward their
// slot in a Flock formation (systems/flocks.js); singles wander down the
// lane on smooth layered-sine "noise" with a per-type personality (goblins
// dart, imps swoop, slimes hop, trolls lumber). Hits are real impulses that
// shove the body back, and separation keeps bodies from overlapping.
// Slimes split when killed; ranged types (shootInterval in
// data/monsters.js) fire back periodically.
import { CONFIG } from '../config.js';
import { MONSTERS } from '../data/monsters.js';

// Signature moves: windup (s) → burst (s) with go/during/end hooks.
const ACTIONS = {
  goblin: { kind: 'dash', windup: 0.32, burst: 0.28, cd: [3, 6],
    go: (m, a) => { m.pvx = a.dir * 280; m.pvy = m.speed * 1.5; m.squish = 0.6; } },
  imp: { kind: 'swoop', windup: 0.25, burst: 0.75, cd: [2.5, 5],
    go: (m, a) => { m.pvy = -40; },
    during: (m, a) => { m.pvx = a.dir * 320 * Math.sin((a.t / 0.75) * Math.PI); } },
  slime: { kind: 'leap', windup: 0.3, burst: 0.55, cd: [2.5, 4.5],
    go: (m, a) => { m.pvx = a.dir * 120; m.pvy = m.speed * 0.6; m.squish = 0.8; },
    during: (m, a) => { m.z = Math.sin((a.t / 0.55) * Math.PI) * m.r * 2.2; },
    end: (m) => { m.z = 0; m.squish = 1; m.events.push('land'); } },
  slimeSmall: { kind: 'leap', windup: 0.2, burst: 0.4, cd: [1.8, 3.5],
    go: (m, a) => { m.pvx = a.dir * 140; m.pvy = m.speed * 0.6; },
    during: (m, a) => { m.z = Math.sin((a.t / 0.4) * Math.PI) * m.r * 2; },
    end: (m) => { m.z = 0; m.squish = 1; m.events.push('land'); } },
  skeleton: { kind: 'sidestep', windup: 0.18, burst: 0.22, cd: [3.5, 6.5],
    go: (m, a) => { m.pvx = a.dir * 230; } },
  troll: { kind: 'slam', windup: 0.55, burst: 0.12, cd: [4, 7],
    go: (m) => { m.pvy = m.speed * 0.5; },
    end: (m) => { m.squish = 1; m.events.push('slam'); } },
};

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

    // --- Action moves (see ACTIONS below): a small state machine
    // windup → burst → recover that gives each species a signature move —
    // goblins crouch and dash, bats dive-bomb, slimes leap, skeletons
    // side-step, trolls ground-slam. Render reads action/phase/z/ghosts.
    this.action = null;      // { kind, phase, t, dir }
    this.actionCd = 1.5 + Math.random() * 3;
    this.z = 0;              // height above the ground (slime leap)
    this.ghosts = [];        // afterimage trail during fast moves
    this.events = [];        // one-frame FX events for main.js ('slam', 'land')

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
    this._action(dt);
    this._move(dt);
    if (this.action && this.action.phase === 'burst') {
      this.ghosts.unshift({ x: this.x, y: this.y - this.z });
      if (this.ghosts.length > 5) this.ghosts.pop();
    } else if (this.ghosts.length) this.ghosts.pop();
    if (this.squish > 0) this.squish = Math.max(0, this.squish - dt * 5);
    if (this.fireFlash > 0) this.fireFlash -= dt;
    const realDt = Math.max(1e-4, dt);
    const ivx = (this.x - prevX) / realDt;
    this.vx += (ivx - this.vx) * Math.min(1, dt * 8);
    const travelled = Math.hypot(this.x - prevX, this.y - prevY);
    this.anim += travelled * 0.09 + dt * 2;
  }

  // Per-species signature moves. Only fired in the safe middle of the lane
  // (never right above the gate) so they add drama, not unfair leaks.
  _action(dt) {
    if (this.boss || this.dead) return;
    const a = this.action;
    if (!a) {
      this.actionCd -= dt;
      const safe = this.y > 70 && this.y < CONFIG.gateY - 190;
      if (this.actionCd <= 0 && safe && ACTIONS[this.type]) {
        this.action = { kind: ACTIONS[this.type].kind, phase: 'windup', t: 0, dir: this.x < CONFIG.width / 2 ? 1 : -1 };
        if (Math.random() < 0.35) this.action.dir *= -1;
      } else if (this.actionCd <= 0) {
        this.actionCd = 0.5;
      }
      return;
    }
    const spec = ACTIONS[this.type];
    a.t += dt;
    if (a.phase === 'windup' && a.t >= spec.windup) {
      a.phase = 'burst'; a.t = 0;
      spec.go(this, a);
    } else if (a.phase === 'burst') {
      if (spec.during) spec.during(this, a, dt);
      if (a.t >= spec.burst) {
        a.phase = 'recover'; a.t = 0;
        if (spec.end) spec.end(this, a);
      }
    } else if (a.phase === 'recover' && a.t >= 0.35) {
      this.action = null;
      this.actionCd = spec.cd[0] + Math.random() * (spec.cd[1] - spec.cd[0]);
    }
  }

  _move(dt) {
    if (this.boss) {
      // Bosses descend to a hover line near the top and fight from there —
      // weaving side to side and raining bullet patterns (see bossVolley in
      // main.js) instead of slowly sinking into the gate.
      this.age = (this.age || 0) + dt;
      const hoverY = 150;
      // stage-boss intro (systems/bosses.js): glide down to the hover line, no fire
      if (this.bzIntroT > 0) {
        this.bzIntroT -= dt;
        this.y += (hoverY - this.y) * Math.min(1, dt * 1.8);
        if (this.hitFlash > 0) this.hitFlash -= dt;
        return;
      }
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
    const ph = this.action && this.action.phase;
    if (ph === 'burst') {
      // the move owns the body: momentum + light drag, no steering
      ax = -this.pvx * 1.2;
      ay = (this.speed - this.pvy) * 0.8;
    } else if (ph === 'windup') {
      // brake hard and coil up
      ax = -this.pvx * 8;
      ay = -this.pvy * 8;
    } else if (this.flock && !this.flock.dead) {
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
    const maxV = this.speed * 3 + (ph === 'burst' ? 320 : 120);
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

  // kick scales the knock-back (a critical hit shoves twice as hard)
  onHit(damage, kick = 1) {
    if (this.bzIntroT > 0) return null; // stage boss is untouchable during its intro
    this.hp -= damage;
    this.hitFlash = 0.1;
    this.squish = 1;
    // real impulse: shoves the body back up the lane; its spring / steering
    // pulls it back into place, so hits read as physical
    if (!this.boss) this.pvy -= kick * (this.elite ? 35 : 70) / Math.max(1, this.r / 14);
    if (this.boss && !this.bzMini && !this.enraged && this.hp <= this.maxHp * 0.5) this.enraged = true;
    if (this.hp <= 0) {
      this.dead = true;
      // Splitting: a big slime always bursts into two small ones; on later
      // levels a small one may split once more into two tiny ones, and a
      // troll may break into two half-size trolls (chances set per level by
      // the spawner: splitSmall / splitBig). Tiny ones never split again.
      const gen = this.splitGen || 0;
      let into = null, scale = 1, hpShare = 1;
      if (this.splitsInto) into = this.splitsInto;
      else if (this.type === 'slimeSmall' && gen < 2 && Math.random() < (this.splitSmall || 0)) { into = 'slimeSmall'; scale = 0.72; hpShare = 0.5; }
      else if (this.type === 'troll' && !this.boss && gen === 0 && Math.random() < (this.splitBig || 0)) { into = 'troll'; scale = 0.7; hpShare = 0.4; }
      if (into) {
        const kids = [-1, 1].map((side) => {
          const k = new Monster(into, this.x + side * this.r * 0.6, this.y, this.speedMult, null, this.hpMult);
          k.isChild = true;
          k.splitGen = gen + 1;
          k.splitSmall = this.splitSmall;
          k.skin = this.childSkin || this.skin;
          k.childSkin = this.childSkin;
          if (scale !== 1) {
            k.r *= scale;
            k.hp = k.maxHp = Math.max(1, Math.round(this.maxHp * hpShare));
            if (k.shootInterval) { k.shootInterval *= 1.4; k.shootTimer = k.shootInterval * (0.5 + Math.random() * 0.5); }
          }
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
