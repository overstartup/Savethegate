// Spawner — driven by the current LEVEL definition (src/data/levels.js).
// Spawns monster clumps, obstacles (moving on later levels), gates, and bosses.
import { CONFIG } from '../config.js';
import { Monster } from '../entities/monster.js';
import { Obstacle } from '../entities/obstacle.js';
import { Gate } from '../entities/gate.js';
import { Ship } from '../entities/ship.js';
import { MONSTERS } from '../data/monsters.js';
import { Flock, pickFormation } from './flocks.js';
import { bzSpawnBoss } from './bosses.js';

const rand = (a, b) => a + Math.random() * (b - a);
const SHIP_SPRITES = ['ship-pirate-medium', 'ship-pirate-small', 'ship-medium'];

function weightedPick(spawns) {
  let total = 0;
  for (const k in spawns) total += spawns[k];
  let r = Math.random() * total;
  for (const k in spawns) { r -= spawns[k]; if (r <= 0) return k; }
  return Object.keys(spawns)[0];
}

// Each level is a run of WAVES (planWaves): every wave releases its share
// of the level's enemy quota in one random pattern — trickle, stream,
// flocks (formations gliding on a shared harmonic path, systems/flocks.js),
// pincer or rush — paced over time, with a breather between waves. An
// alive-on-screen cap grows with the level, the stage and the player's
// in-run power, so the Guardian is never swamped before they can grow.
export class Spawner {
  static RIFT_TIME = 0.65; // seconds a rift glows before its enemies come through
  static RIFT_Y = 96;      // rifts open just below the HUD; singles grow in right there

  constructor(levelDef, levelIndex) {
    this.setLevel(levelDef, levelIndex);
  }

  setLevel(def, index) {
    this.def = def;
    this.level = index + 1;        // 1-based for display
    this.lis = index % 10;         // level-in-stage, 0..9
    this.stageIdx = Math.floor(index / 10);
    this.obstacleTimer = 6.0;
    this.gateTimer = 6.0;
    this.shipTimer = rand(4, 6);
    this.bossSpawned = false;
    // Attacker-count-driven level: def.attackers is a fixed quota — the level
    // clears once all of them have been sent and dealt with (main.js).
    // boss levels send fewer regular attackers: the boss is the main event
    this.totalAttackers = Math.round((def.attackers || 10) * (CONFIG.waves.quotaMult - CONFIG.waves.quotaFalloff * this.lis) * (def.boss ? CONFIG.waves.bossLevelQuota : 1));
    this.spawnedCount = 0;
    this.flocks = [];
    this.planWaves();
  }

  allSpawned() {
    return this.spawnedCount >= this.totalAttackers;
  }

  // How many regular Shatterlings may be alive at once right now.
  maxAlive(runLvl) {
    const progress = this.spawnedCount / Math.max(1, this.totalAttackers);
    const D = CONFIG.difficulty;
    return Math.min(32, Math.round(4 + (this.def.crowd || 0) + D.levelCrowd * this.lis + D.stageCrowd * this.stageIdx + 0.45 * runLvl + 2 * progress));
  }

  // ---- wave director -------------------------------------------------
  // A level is a run of WAVES. Each wave releases its share of the quota in
  // one release pattern, paced so the level lasts CONFIG.waves.levelTime;
  // between waves the lane gets a short breather.
  planWaves() {
    const W = CONFIG.waves;
    const n = Math.max(2, Math.round(W.baseWaves + W.wavesPerLevel * this.lis));
    // later waves are bigger (the last one is the climax)
    const weights = [];
    for (let i = 0; i < n; i++) weights.push(0.7 + 0.7 * (i / (n - 1)) + rand(-0.12, 0.12));
    const wsum = weights.reduce((a, b) => a + b, 0);
    let left = this.totalAttackers;
    const releaseTime = (W.levelTime[0] + W.levelTime[1] * this.lis) * (this.def.timeMult || 1) - (n - 1) * W.breather[1];
    this.waves = weights.map((w, i) => {
      const count = i === n - 1 ? left : Math.max(3, Math.round(this.totalAttackers * w / wsum));
      left -= count;
      return {
        count,
        pattern: i === n - 1 ? (Math.random() < 0.5 ? 'flock' : 'rush') : this.pickPattern(),
        pace: Math.max(0.35, (releaseTime * w / wsum) / Math.max(1, count)), // seconds per enemy
      };
    });
    this.waveIdx = 0;
    this.waveLeft = this.waves[0].count;
    this.breather = 2.5;   // a moment before the first wave
    this.releaseTimer = 0;
    this.waveX = rand(70, CONFIG.width - 70);
    this.portals = [];    // arrival rifts at the top of the lane (drawn by main.js)
    this.queue = [];      // releases waiting for their rift to open
    this.recentX = [];
    this.clock = 0;
    this.waveStartT = 0;  // clock when the current wave began (top-edge glow)
  }

  // A release spot away from the last few, so arrivals spread across the lane.
  pickX(lo = 50, hi = CONFIG.width - 50) {
    let best = rand(lo, hi), bestD = -1;
    for (let k = 0; k < 6; k++) {
      const x = rand(lo, hi);
      const d = this.recentX.length ? Math.min(...this.recentX.map((r) => Math.abs(r - x))) : 999;
      if (d > 80) { best = x; break; }
      if (d > bestD) { bestD = d; best = x; }
    }
    this.recentX.push(best);
    if (this.recentX.length > 3) this.recentX.shift();
    return best;
  }

  pickPattern() {
    // early levels lean on gentle patterns; flocks and rushes grow later
    const p = {
      trickle: 3, stream: 2, flock: 1 + 0.3 * this.lis, pincer: 1 + 0.15 * this.lis, rush: 0.4 + 0.2 * this.lis,
      zigzag: 1.2, wall: this.lis >= 2 ? 0.8 + 0.1 * this.lis : 0,
    };
    return weightedPick(p);
  }

  get waveNumber() { return Math.min(this.waves.length, this.waveIdx + 1); }

  // stats for everything released right now (level, stage, run, Armory)
  tune(state) {
    const runLvl = state.run?.lvl || 0;
    const D = CONFIG.difficulty;
    const armory = 1 + D.armoryHp * ((state.armoryDps || 1) - 1);
    this.t = {
      hpMult: (1 + D.stageHp * this.stageIdx + D.stageHpSq * this.stageIdx * this.stageIdx) * (1 + D.levelHp * this.lis) * (1 + D.runHp * runLvl) * armory,
      shootMult: 1 / (1 + D.levelShoot * this.lis + D.stageShoot * this.stageIdx),
      // bullets hit harder every level and every stage (CONFIG.difficulty)
      dmg: Math.max(5, Math.round(D.bulletBase * (1 + D.bulletStage * this.stageIdx) * (1 + D.bulletLevel * this.lis))),
      // later levels: more enemies that split when killed (see Monster.onHit)
      splitSmall: Math.min(0.5, 0.04 + 0.03 * this.lis + 0.04 * this.stageIdx),
      splitBig: this.stageIdx === 0 && this.lis < 4 ? 0 : Math.min(0.5, 0.05 + 0.03 * this.lis + 0.04 * this.stageIdx),
      eliteChance: this.def.noElite ? 0 : Math.min(0.07, 0.015 + 0.004 * this.lis + 0.006 * this.stageIdx),
    };
  }

  mk(state, type, x, y) {
    const def = this.def, t = this.t || { hpMult: 1, dmg: 10, splitSmall: false, splitBig: false };
    const m = new Monster(type, x, y, def.speed, null, t.hpMult);
    m.damage = t.dmg;
    m.splitSmall = t.splitSmall; // small ones may split again
    m.splitBig = t.splitBig;     // trolls may break in two
    m.skin = def.cast?.[type] || null; // stage-themed species (render/species.js)
    m.childSkin = def.cast?.slimeSmall || m.skin; // what a splitter breaks into
    if (m.shootInterval) { m.shootInterval *= t.shootMult; m.shootTimer *= t.shootMult; }
    if (Math.random() < t.eliteChance) { m.makeElite(); m.damage = Math.round(m.damage * CONFIG.difficulty.eliteBullet); }
    state.monsters.push(m);
    this.spawnedCount++;
    return m;
  }

  single(state, x) {
    this.mk(state, weightedPick(this.def.spawns), Math.max(40, Math.min(CONFIG.width - 40, x)), Spawner.RIFT_Y + rand(-4, 4));
  }

  flock(state, size, x) {
    const def = this.def;
    // Heavy brutes and bosses never spawn in swarming flocks
    const flockSpawns = { ...def.spawns };
    delete flockSpawns.troll;
    delete flockSpawns.ogreBoss;
    const groupType = Object.keys(flockSpawns).length ? weightedPick(flockSpawns) : weightedPick(def.spawns);
    const d = MONSTERS[groupType];
    const flock = new Flock({
      x: x ?? rand(60, CONFIG.width - 60),
      formation: pickFormation(this.lis + this.stageIdx * 2),
      size,
      speed: CONFIG.monster.baseSpeed * def.speed * (d?.speed || 1) * 0.9,
      spacing: Math.max(30, (d?.size || 26) * 1.25),
    });
    // mostly one species per flock (reads cleaner); later a few mixed
    const mixed = Math.random() < 0.1 + 0.03 * this.lis;
    for (let i = 0; i < size; i++) {
      const type = mixed && i > 0 ? weightedPick(def.spawns) : groupType;
      // members enter staggered above their leader and spring into place
      flock.add(this.mk(state, type, flock.x + rand(-20, 20), flock.y - 40 - i * 22));
    }
    this.flocks.push(flock);
  }

  // Plans the next bit of the current wave and sets the wait to the next.
  // Each release first opens a rift at the top of the lane (RIFT_TIME), so
  // the player sees where it will come in; the wave starts sparse and
  // builds toward its end.
  releaseStep(state) {
    const w = this.waves[this.waveIdx], W = CONFIG.width;
    const left = this.waveLeft;
    const build = 1.3 - 0.5 * (1 - left / Math.max(1, w.count)); // slow start, busier finish
    const out = []; // { kind: 'single' | 'flock', x, size }
    const one = (x) => out.push({ kind: 'single', x });
    switch (w.pattern) {
      case 'trickle': // singles at random places and random gaps
        one(this.pickX());
        this.releaseTimer = w.pace * rand(0.5, 1.5);
        break;
      case 'stream': { // a column down one lane, then it shifts
        one(this.waveX + rand(-14, 14));
        this.streamRun = (this.streamRun || 0) + 1;
        if (this.streamRun >= 4 + Math.floor(rand(0, 3))) {
          this.streamRun = 0;
          this.waveX = this.pickX(70, W - 70);
          this.releaseTimer = w.pace * rand(2.5, 4);
        } else {
          this.releaseTimer = 0.5;
        }
        break;
      }
      case 'flock': {
        const size = Math.max(2, Math.min(left, 12, Math.round(rand(3, 4 + this.lis * 0.5 + this.stageIdx))));
        out.push({ kind: 'flock', x: this.pickX(80, W - 80), size });
        this.releaseTimer = w.pace * size * rand(0.8, 1.2);
        break;
      }
      case 'pincer': // from both edges at once
        one(rand(40, 90));
        if (left > 1) one(rand(W - 90, W - 40));
        this.releaseTimer = w.pace * 2 * rand(0.8, 1.3);
        break;
      case 'rush': { // a quick burst, then calm
        one(this.pickX());
        this.rushRun = (this.rushRun || 0) + 1;
        if (this.rushRun >= 4 + Math.floor(rand(0, 5))) {
          this.releaseTimer = w.pace * this.rushRun;
          this.rushRun = 0;
        } else {
          this.releaseTimer = 0.28;
        }
        break;
      }
      case 'zigzag': // alternating edges, like a slalom
        this.zig = !this.zig;
        one(this.zig ? rand(50, 140) : rand(W - 140, W - 50));
        this.releaseTimer = w.pace * rand(0.7, 1.1);
        break;
      case 'wall': { // a row across the lane with one gap to shoot through
        const n = Math.max(2, Math.min(left, 4 + Math.floor(rand(0, 3))));
        const slots = n + 1, gap = Math.floor(rand(0, slots));
        for (let k = 0, placed = 0; k < slots && placed < n; k++) {
          if (k === gap) continue;
          one(50 + (W - 100) * (k + 0.5) / slots);
          placed++;
        }
        this.releaseTimer = w.pace * n * rand(0.9, 1.2);
        break;
      }
    }
    this.releaseTimer *= build;
    for (const r of out) {
      const n = r.kind === 'flock' ? r.size : 1;
      this.waveLeft -= n;
      this.portals.push({ x: r.x, w: r.kind === 'flock' ? 40 + r.size * 7 : 30, t: 0, life: Spawner.RIFT_TIME + 0.5 });
      this.queue.push({ ...r, at: this.clock + Spawner.RIFT_TIME });
    }
  }

  // Releases whose rift has been open long enough come through it.
  arrive(state) {
    if (!this.queue.length) return;
    this.tune(state);
    this.queue = this.queue.filter((r) => {
      if (r.at > this.clock) return true;
      if (r.kind === 'flock') this.flock(state, r.size, r.x);
      else this.single(state, r.x);
      return false;
    });
  }

  update(dt, state) {
    const def = this.def;
    const runLvl = state.run?.lvl || 0;

    for (const f of this.flocks) f.update(dt);
    this.flocks = this.flocks.filter((f) => !f.dead);

    this.clock += dt;
    for (const p of this.portals) p.t += dt;
    this.portals = this.portals.filter((p) => p.t < p.life);
    this.arrive(state);

    if (!this.allSpawned()) {
      let alive = this.queue.length;
      for (const m of state.monsters) if (!m.dead && !m.boss) alive++;
      if (this.waveLeft <= 0 && this.waveIdx < this.waves.length - 1) {
        // wave fully released: breather, then the next wave once the lane
        // has mostly cleared (or after a while regardless)
        this.waveIdx++;
        this.waveLeft = this.waves[this.waveIdx].count;
        this.breather = rand(CONFIG.waves.breather[0], CONFIG.waves.breather[1]);
        this.breatherMax = this.breather + 8;
        this.waveX = rand(70, CONFIG.width - 70);
      }
      if (this.waveLeft <= 0) {
        // last wave fully scheduled — just let its rifts deliver
      } else if (this.breather > 0) {
        this.breather -= dt;
        this.breatherMax -= dt;
        if (this.breather <= 0 && alive > 3 + this.lis / 2 && this.breatherMax > 0) this.breather = 0.3;
        if (this.breather <= 0) this.waveStartT = this.clock; // a new wave begins
      } else {
        this.releaseTimer -= dt;
        if (this.releaseTimer <= 0) {
          if (alive < this.maxAlive(runLvl)) this.releaseStep(state);
          else this.releaseTimer = 0.4; // lane is full — wait for the player to thin it
        }
      }
    }

    // Boss (levels flagged boss:true) — spawns as the finale once the whole
    // regular attacker quota has been sent out AND the spawn queue has fully
    // drained (so the boss doesn't appear mid-formation, before the last
    // wave has actually finished entering), instead of at a fixed time.
    if (def.boss && !this.bossSpawned && this.allSpawned()) {
      this.bossSpawned = true;
      // Captains (L4/L7) and the stage boss (L10): a weaving hover fight
      // whose hp scales with level, stage and in-run power — see
      // systems/bosses.js.
      bzSpawnBoss(this, state, def);
    }

    // Obstacles — roll down; on later levels they also slide sideways.
    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.obstacleTimer = Math.max(3.5, rand(7, 11) - this.lis * 0.4); // rare early, more later
      // round rolling bodies (see drawObstacle in main.js): a little
      // variety in size, barrels a touch smaller
      const os = def.decor === 'bubbles' ? rand(40, 46) : rand(46, 60);
      const ow = os, oh = os;
      const o = new Obstacle(rand(60, CONFIG.width - 60), rand(-40, -20), ow, oh);
      if (def.movingObstacles) o.vx = (Math.random() < 0.5 ? -1 : 1) * rand(30, 60);
      // Sea War's obstacle is real Kenney barrel/crate art (see drawObstacle
      // in main.js) — pick which one this particular piece of cargo is.
      if (def.decor === 'bubbles') o.spriteChoice = Math.random() < 0.5 ? 'barrel' : 'crate';
      if (def.decor === 'snow') {
        const iceChoices = ['ice_rocks_large', 'ice_rocks_small', 'crystal_large', 'crystal_medium'];
        o.spriteChoice = iceChoices[Math.floor(Math.random() * iceChoices.length)];
        o.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.5);
      }
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

    // Airships — Clockwork City (stage 8) only, matching its island art of
    // brass zeppelins. Same Ship entity and rules as above (flagged .air),
    // CONFIG.airship stats, flying a lane inside the hittable play field.
    if (this.stageIdx === 8 && state.ships && this.lis >= 1) { // none on the opening level
      this.shipTimer -= dt;
      if (this.shipTimer <= 0) {
        const A = CONFIG.airship;
        if (state.ships.length >= A.maxOnScreen) {
          this.shipTimer = 1.0;
        } else {
          const [lo, hi] = A.spawnInterval;
          const paceScale = Math.max(0.6, 1 - (def.speed - 1) * 0.15);
          this.shipTimer = rand(lo, hi) * paceScale;
          const dir = Math.random() < 0.5 ? 1 : -1;
          const startX = dir === 1 ? -60 : CONFIG.width + 60;
          // keep a second airship off the first one's line
          let y = A.lineY + rand(0, A.laneDepth);
          const other = state.ships[0];
          if (other && Math.abs(other.baseY - y) < 14) y = other.baseY < A.lineY + A.laneDepth / 2 ? other.baseY + 18 : other.baseY - 18;
          state.ships.push(new Ship(startX, y, dir, def.speed, def.hpMult || 1, 'airship'));
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
