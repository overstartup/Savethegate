// Spawner — driven by the current LEVEL definition (src/data/levels.js).
// Spawns monster clumps, obstacles (moving on later levels), gates, and bosses.
import { CONFIG } from '../config.js';
import { Monster } from '../entities/monster.js';
import { Obstacle } from '../entities/obstacle.js';
import { Gate } from '../entities/gate.js';
import { Ship } from '../entities/ship.js';
import { MONSTERS } from '../data/monsters.js';
import { Flock, pickFormation } from './flocks.js';

const rand = (a, b) => a + Math.random() * (b - a);
const SHIP_SPRITES = ['ship-pirate-medium', 'ship-pirate-small', 'ship-medium'];

function weightedPick(spawns) {
  let total = 0;
  for (const k in spawns) total += spawns[k];
  let r = Math.random() * total;
  for (const k in spawns) { r -= spawns[k]; if (r <= 0) return k; }
  return Object.keys(spawns)[0];
}

// Monsters arrive as FLOCKS (formations gliding on a shared harmonic path —
// see systems/flocks.js) or as lone wanderers. Difficulty climbs step by
// step: an alive-on-screen cap, group size and pace all start small and
// grow with the level's place in its stage, how far through the level you
// are, and the player's in-run power — so the Guardian is never swamped
// before they've had a chance to grow.
export class Spawner {
  constructor(levelDef, levelIndex) {
    this.setLevel(levelDef, levelIndex);
  }

  setLevel(def, index) {
    this.def = def;
    this.level = index + 1;        // 1-based for display
    this.lis = index % 10;         // level-in-stage, 0..9
    this.stageIdx = Math.floor(index / 10);
    this.groupTimer = 1.5;
    this.obstacleTimer = 6.0;
    this.gateTimer = 6.0;
    this.shipTimer = rand(4, 6);
    this.bossSpawned = false;
    // Attacker-count-driven level: def.attackers is a fixed quota — the level
    // clears once all of them have been sent and dealt with (main.js).
    this.totalAttackers = def.attackers || 10;
    this.spawnedCount = 0;
    this.flocks = [];
    this.intensity = 1;
  }

  allSpawned() {
    return this.spawnedCount >= this.totalAttackers;
  }

  // How many regular Shatterlings may be alive at once right now.
  maxAlive(runLvl) {
    const progress = this.spawnedCount / Math.max(1, this.totalAttackers);
    return Math.min(30, Math.round(4 + 1.4 * this.lis + 2.5 * this.stageIdx + 0.45 * runLvl + 2 * progress));
  }

  spawnGroup(state) {
    const def = this.def;
    const runLvl = state.run?.lvl || 0;
    const progress = this.spawnedCount / Math.max(1, this.totalAttackers);
    const left = this.totalAttackers - this.spawnedCount;
    const hpScale = (1 + 0.1 * this.lis) * (1 + 0.02 * runLvl);
    const hpMult = (def.hpMult || 1) * hpScale;
    // bullets get stronger per stage, but gently — tankier foes carry the climb
    const dmg = Math.max(5, Math.round(20 * (1 + 0.25 * this.stageIdx)));
    const eliteChance = Math.min(0.07, 0.015 + 0.004 * this.lis + 0.006 * this.stageIdx);
    this.intensity = 1 + 0.06 * this.lis + 0.03 * runLvl;

    // Lone wanderer or a flock? Singles are common early (gentle), flocks
    // take over as the level heats up.
    const singleChance = Math.max(0.2, 0.55 - 0.04 * this.lis - 0.25 * progress);
    const baseSize = 2 + 0.45 * this.lis + 1.0 * this.stageIdx + 0.15 * runLvl + 2 * progress;
    let size = Math.random() < singleChance ? 1 : Math.round(rand(baseSize - 0.5, baseSize + 1.5));
    size = Math.max(1, Math.min(size, 12, left));

    const groupType = weightedPick(def.spawns);
    const mk = (type, x, y) => {
      const m = new Monster(type, x, y, def.speed, null, hpMult);
      m.damage = dmg;
      if (Math.random() < eliteChance) m.makeElite();
      state.monsters.push(m);
      return m;
    };

    if (size === 1) {
      mk(groupType, rand(50, CONFIG.width - 50), rand(-60, -30));
    } else {
      const d = MONSTERS[groupType];
      const formation = pickFormation(this.lis + this.stageIdx * 2);
      const flock = new Flock({
        x: rand(60, CONFIG.width - 60),
        formation,
        size,
        speed: CONFIG.monster.baseSpeed * def.speed * (d?.speed || 1) * 0.9,
        spacing: Math.max(30, (d?.size || 26) * 1.25),
      });
      // mostly one species per flock (reads cleaner); later a few mixed
      const mixed = Math.random() < 0.1 + 0.03 * this.lis;
      for (let i = 0; i < size; i++) {
        const type = mixed && i > 0 ? weightedPick(def.spawns) : groupType;
        // members enter staggered above their leader and spring into place
        const m = mk(type, flock.x + rand(-20, 20), flock.y - 40 - i * 22);
        flock.add(m);
      }
      this.flocks.push(flock);
    }
    this.spawnedCount += size;
    // rest gap before the next arrival — shrinks gently as things heat up
    this.groupTimer = (rand(1.4, 2.3) + size * 0.22) / this.intensity;
  }

  update(dt, state) {
    const def = this.def;
    const runLvl = state.run?.lvl || 0;

    for (const f of this.flocks) f.update(dt);
    this.flocks = this.flocks.filter((f) => !f.dead);

    this.groupTimer -= dt;
    if (this.groupTimer <= 0 && !this.allSpawned()) {
      let alive = 0;
      for (const m of state.monsters) if (!m.dead && !m.boss) alive++;
      if (alive < this.maxAlive(runLvl)) this.spawnGroup(state);
      else this.groupTimer = 0.4; // lane is full — wait for the player to thin it
    }

    // Boss (levels flagged boss:true) — spawns as the finale once the whole
    // regular attacker quota has been sent out AND the spawn queue has fully
    // drained (so the boss doesn't appear mid-formation, before the last
    // wave has actually finished entering), instead of at a fixed time.
    if (def.boss && !this.bossSpawned && this.allSpawned()) {
      this.bossSpawned = true;
      // A big, continuous side-to-side weave (wide amplitude, unhurried
      // frequency) instead of the default near-static center drop every
      // other monster gets — this is what makes the boss actually read as
      // "alive" and threatening on screen, the same active, swooping feel
      // the flying bat/imp enemy has, rather than just sinking straight down.
      const bossPath = {
        targetX: CONFIG.width / 2,
        curveAmp: CONFIG.width * 0.32,
        curveFreq: 1.3,
        phase: rand(0, Math.PI * 2),
      };
      const boss = new Monster('ogreBoss', CONFIG.width / 2, -80, def.speed * 0.6, bossPath);
      // Scales with level, stage AND the player's in-run power so the boss
      // is always a real fight (~20s) instead of melting to a strong build.
      const runLvl = state.run?.lvl || 0;
      boss.hp = boss.maxHp = Math.round((100 + 35 * this.lis + 120 * this.stageIdx) * (1 + 0.2 * runLvl));
      state.monsters.push(boss);
      state.onBoss?.();
    }

    // Obstacles — drift down; on later levels they also slide sideways.
    // Size varies per stage decor so each one's drawObstacle() shape (see
    // main.js) reads correctly: a big blocky chunk for glacier ice, a
    // slightly larger craggy chunk for mountain boulders, and a compact
    // square for sea barrels/crates (real Kenney art, not drawn) tossed
    // overboard — everything else keeps the original plank-ish default.
    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.obstacleTimer = Math.max(3.5, rand(7, 11) - this.lis * 0.4); // rare early, more later
      let ow = 76, oh = 26;
      if (def.decor === 'snow') { ow = 60; oh = 60; }        // big ice block — chunky, near-square
      else if (def.decor === 'banners') { ow = 58; oh = 46; } // mountain boulder — squat and heavy
      else if (def.decor === 'bubbles') { ow = 40; oh = 40; } // barrel/crate thrown from a ship — compact square
      const o = new Obstacle(rand(60, CONFIG.width - 60), rand(-40, -20), ow, oh);
      if (def.movingObstacles) o.vx = (Math.random() < 0.5 ? -1 : 1) * rand(30, 60);
      // Sea War's obstacle is real Kenney barrel/crate art (see drawObstacle
      // in main.js) — pick which one this particular piece of cargo is.
      if (def.decor === 'bubbles') o.spriteChoice = Math.random() < 0.5 ? 'barrel' : 'crate';
      state.obstacles.push(o);
    }

    // Ships — Sea War only. Sail in from one edge along the water-surface
    // line and out the other, shooting straight down at the Guardian the
    // whole way across. Kept deliberately rare (long spawnInterval, hard
    // maxOnScreen cap) — each one is tanky and fires a lot, so the threat
    // comes from a couple of tough ships rather than a swarm of weak ones.
    if (def.decor === 'bubbles' && state.ships && this.lis >= 1) { // no ships on a stage's opening level
      this.shipTimer -= dt;
      if (this.shipTimer <= 0) {
        if (state.ships.length >= CONFIG.ship.maxOnScreen) {
          this.shipTimer = 1.0; // at the cap — check back soon instead of a full fresh wait
        } else {
          const [lo, hi] = CONFIG.ship.spawnInterval;
          // Slightly faster spawns on later, faster stages (def.speed grows
          // per stage) — still bounded by maxOnScreen, so it stays handleable.
          const paceScale = Math.max(0.55, 1 - (def.speed - 1) * 0.15);
          this.shipTimer = rand(lo, hi) * paceScale;
          const dir = Math.random() < 0.5 ? 1 : -1;
          const startX = dir === 1 ? -60 : CONFIG.width + 60;
          const y = CONFIG.height * CONFIG.ship.waterLine + rand(14, 46);
          const sprite = SHIP_SPRITES[Math.floor(rand(0, SHIP_SPRITES.length))];
          state.ships.push(new Ship(startX, y, dir, def.speed, def.hpMult || 1, sprite));
        }
      }
    }

    // Gates — a single gift portal, never a curse/bad choice anymore. Most
    // of the time it's a fire-rate boost (×2/×3); sometimes instead it's a
    // straight partial heal of the blood line (see CONFIG.gate.bloodGiftChance).
    this.gateTimer -= dt;
    if (this.gateTimer <= 0) {
      this.gateTimer = rand(9, 14);
      const x = rand(70, CONFIG.width - 70);
      if (Math.random() < CONFIG.gate.bloodGiftChance) {
        state.gates.push(new Gate(x, null, 'blood'));
      } else {
        const mult = CONFIG.gate.multipliers[Math.floor(Math.random() * CONFIG.gate.multipliers.length)];
        state.gates.push(new Gate(x, mult, 'mult'));
      }
    }
  }
}
