// Spawner — driven by the current LEVEL definition (src/data/levels.js).
// Spawns monster clumps, obstacles (moving on later levels), gates, and bosses.
import { CONFIG } from '../config.js';
import { Monster } from '../entities/monster.js';
import { Obstacle } from '../entities/obstacle.js';
import { Gate } from '../entities/gate.js';
import { Ship } from '../entities/ship.js';

const rand = (a, b) => a + Math.random() * (b - a);
const SHIP_SPRITES = ['ship-pirate-medium', 'ship-pirate-small', 'ship-medium'];

function weightedPick(spawns) {
  let total = 0;
  for (const k in spawns) total += spawns[k];
  let r = Math.random() * total;
  for (const k in spawns) { r -= spawns[k]; if (r <= 0) return k; }
  return Object.keys(spawns)[0];
}

export class Spawner {
  constructor(levelDef, levelIndex) {
    this.setLevel(levelDef, levelIndex);
  }

  setLevel(def, index) {
    this.def = def;
    this.level = index + 1;        // 1-based for display
    this.monsterTimer = 1.2;
    this.obstacleTimer = 3.0;
    this.gateTimer = 6.0;
    this.shipTimer = rand(1.2, 2.4);
    this.bossSpawned = false;
  }

  update(dt, state) {
    const def = this.def;

    // Monster clumps — each clump rolls a shared movement pattern so the
    // whole group carves the lane together (diagonal sweep, curved swoop, or
    // the classic straight drop), instead of every monster just waddling
    // straight down in place.
    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0) {
      this.monsterTimer = def.interval;
      const count = Math.round(rand(2, 3 + this.level * 0.5));
      const cx = rand(50, CONFIG.width - 50);

      const patternType = weightedPick({ straight: 3, diagonal: 4, carve: 3 });
      let targetX, curveAmp, curveFreq;
      if (patternType === 'diagonal') {
        // start on one side, finish clear across on the other — a straight
        // line traversal from corner to corner as the clump falls
        targetX = cx < CONFIG.width / 2 ? rand(CONFIG.width * 0.65, CONFIG.width - 30) : rand(30, CONFIG.width * 0.35);
        curveAmp = rand(8, 18);
        curveFreq = rand(3, 5);
      } else if (patternType === 'carve') {
        // a big swooping arc — can start and end almost anywhere, with a
        // pronounced curve overlay so it reads as a scythe-like sweep
        targetX = rand(30, CONFIG.width - 30);
        curveAmp = rand(45, 75);
        curveFreq = rand(1.6, 2.8);
      } else {
        targetX = cx;
        curveAmp = 14;
        curveFreq = 6;
      }
      const groupPhase = rand(0, Math.PI * 2); // shared so the clump moves in sync, like a flock

      for (let i = 0; i < count; i++) {
        const offset = rand(-60, 60);
        state.monsters.push(new Monster(
          weightedPick(def.spawns),
          Math.max(20, Math.min(CONFIG.width - 20, cx + offset)),
          rand(-90, -30),
          def.speed,
          {
            targetX: Math.max(20, Math.min(CONFIG.width - 20, targetX + offset * 0.4)),
            curveAmp,
            curveFreq,
            phase: groupPhase,
          },
          def.hpMult || 1
        ));
      }
    }

    // Boss at 50% of the level (levels flagged boss:true)
    if (def.boss && !this.bossSpawned && state.levelTime > def.duration * 0.5) {
      this.bossSpawned = true;
      const boss = new Monster('ogreBoss', CONFIG.width / 2, -80, def.speed * 0.6);
      boss.hp = boss.maxHp = Math.round((20 + this.level * 4) * (def.hpMult || 1));  // scales with level + stage
      state.monsters.push(boss);
      state.onBoss?.();
    }

    // Obstacles — drift down; on later levels they also slide sideways
    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.obstacleTimer = rand(3.5, 6);
      const o = new Obstacle(rand(60, CONFIG.width - 60), rand(-40, -20));
      if (def.movingObstacles) o.vx = (Math.random() < 0.5 ? -1 : 1) * rand(30, 60);
      state.obstacles.push(o);
    }

    // Ships — Sea War only. Sail in from one edge along the water-surface
    // line and out the other, shooting straight down at the Guardian the
    // whole way across. Kept deliberately rare (long spawnInterval, hard
    // maxOnScreen cap) — each one is tanky and fires a lot, so the threat
    // comes from a couple of tough ships rather than a swarm of weak ones.
    if (def.decor === 'bubbles' && state.ships) {
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

    // Gates — good portal + curse portal as a choice
    this.gateTimer -= dt;
    if (this.gateTimer <= 0) {
      this.gateTimer = rand(9, 14);
      const goodX = rand(70, CONFIG.width - 70);
      const curseX = goodX < CONFIG.width / 2 ? goodX + 140 : goodX - 140;
      state.gates.push(new Gate(goodX, CONFIG.gate.multipliers[Math.floor(Math.random() * CONFIG.gate.multipliers.length)]));
      state.gates.push(new Gate(curseX, CONFIG.gate.curse));
    }
  }
}
