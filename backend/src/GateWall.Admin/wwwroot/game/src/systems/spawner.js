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

// --- Formation patterns ------------------------------------------------
// Instead of dumping a whole clump on screen in the same instant, a wave
// now picks one of these named formations and spawns its monsters ONE AFTER
// ANOTHER on a short delay queue (see spawnQueue/update() below) — so the
// player reads each wave as a distinct, deliberate shape (a line marching
// across, a scattered ambush, a corner rush, a spinning ring, a sweeping
// arc, a horizontal wall, or a small simple drop) instead of everything
// appearing simultaneously in a formless pile.
//
// sizeFactor scales the wave's enemy count relative to the level's average
// wave size (see avgClumpSize below) — bigger/slower-reading formations
// (line, horizontal wall) get more monsters, dramatic/tight ones (circle,
// corner) get fewer so they still read clearly on screen.
const PATTERNS = [
  { name: 'lineSweep', weight: 3, sizeFactor: 1.1 },
  { name: 'randomScatter', weight: 3, sizeFactor: 0.9 },
  { name: 'cornerDive', weight: 2, sizeFactor: 0.8 },
  { name: 'flyCircle', weight: 2, sizeFactor: 0.6 },
  { name: 'carveSweep', weight: 2, sizeFactor: 0.9 },
  { name: 'topHorizontal', weight: 2, sizeFactor: 1.0 },
  { name: 'straightDrop', weight: 2, sizeFactor: 0.5 },
  { name: 'spiralDescent', weight: 2, sizeFactor: 0.9 },
  { name: 'zigzagRow', weight: 2, sizeFactor: 0.8 },
  { name: 'pincerConverge', weight: 2, sizeFactor: 0.9 },
  { name: 'cascadeRows', weight: 2, sizeFactor: 1.1 },
  { name: 'diagonalRain', weight: 2, sizeFactor: 0.8 },
];

function pickPattern() {
  let total = 0;
  for (const p of PATTERNS) total += p.weight;
  let r = Math.random() * total;
  for (const p of PATTERNS) { r -= p.weight; if (r <= 0) return p; }
  return PATTERNS[0];
}

// Each builder returns an array of spawn specs: { x, y, delay, targetX,
// curveAmp, curveFreq, phase } for the normal lerp+sine path, or
// { x, y, delay, type: 'circle', centerX, radius, angularSpeed, phase } for
// the orbiting fly-circle path. `delay` is seconds after the wave triggers
// before that individual monster actually appears — this is what creates
// the "one after another" sequenced feel instead of an instant pile-on.
//
// Every "marching" pattern spreads its monsters using a genuine PER-MONSTER
// step (stepMin..stepMax seconds between each one), not a fixed total window
// squeezed to fit however many are in the wave — so a wave really does read
// as a countable row/line arriving one at a time instead of a whole cluster
// materializing together in a blink. Wave sizes are also kept small (see
// MAX_WAVE in update() below), so even the biggest wave finishes entering in
// a few readable seconds rather than an instant pile-on OR an endless crawl.
function sequenceDelays(count, stepMin, stepMax) {
  const delays = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    delays.push(t);
    t += rand(stepMin, stepMax);
  }
  return delays;
}

// Marches across the lane in a line, entering one after another from one
// edge and crossing to the other — "line, all one after another, moves
// from left to right" (or right to left, direction randomized per wave).
function lineSweep(count) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const startX = dir === 1 ? 20 : CONFIG.width - 20;
  const endX = dir === 1 ? CONFIG.width - 20 : 20;
  const delays = sequenceDelays(count, 0.16, 0.26);
  return delays.map((delay) => ({
    delay,
    x: startX + rand(-15, 15),
    y: rand(-70, -30),
    targetX: endX,
    curveAmp: rand(10, 20),
    curveFreq: rand(4, 6),
    phase: rand(0, Math.PI * 2),
  }));
}

// Fully chaotic — random start, random target, random timing. "Move
// random" — the ambush wave, unpredictable on purpose. Timing is
// independent per monster (not a clean sequence), but the window now scales
// with the wave's own size so a bigger scatter wave still visibly trickles
// in over more time instead of all landing within the same short window.
function randomScatter(count) {
  const specs = [];
  const window = Math.min(2.6, Math.max(0.8, count * 0.22));
  for (let i = 0; i < count; i++) {
    specs.push({
      delay: rand(0, window),
      x: rand(30, CONFIG.width - 30),
      y: rand(-90, -20),
      targetX: rand(30, CONFIG.width - 30),
      curveAmp: rand(20, 50),
      curveFreq: rand(2, 5),
      phase: rand(0, Math.PI * 2),
    });
  }
  return specs;
}

// A fast rush from one top corner straight to the opposite bottom corner,
// entering one after another along the same diagonal — "move from corner
// top to corner down."
function cornerDive(count) {
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? 25 : CONFIG.width - 25;
  const endX = fromLeft ? CONFIG.width - 25 : 25;
  const delays = sequenceDelays(count, 0.18, 0.28);
  return delays.map((delay) => ({
    delay,
    x: startX + rand(-10, 10),
    y: rand(-80, -30),
    targetX: endX,
    curveAmp: rand(6, 14),
    curveFreq: rand(2, 3),
    phase: rand(0, Math.PI * 2),
    speedMult: 1.15,
  }));
}

// A spinning ring of monsters orbiting a shared center point as they
// descend — "fly circle." Evenly spaced around the ring so it reads as a
// deliberate rotating formation, not a scatter.
function flyCircle(count) {
  const cx = rand(CONFIG.width * 0.3, CONFIG.width * 0.7);
  const radius = rand(50, 90);
  const dirSign = Math.random() < 0.5 ? 1 : -1;
  const delays = sequenceDelays(count, 0.1, 0.16);
  return delays.map((delay, i) => ({
    delay,
    x: cx, y: -50,
    type: 'circle',
    centerX: cx,
    radius,
    angularSpeed: dirSign * rand(2.2, 3.2),
    phase: (i / count) * Math.PI * 2,
  }));
}

// A big, wide swooping arc — "carve" — same shared curve for the whole
// wave, entering one after another so the scythe-like sweep unfurls across
// the screen instead of appearing all at once.
function carveSweep(count) {
  const targetX = rand(30, CONFIG.width - 30);
  const curveAmp = rand(50, 80);
  const curveFreq = rand(1.4, 2.2);
  const cx = rand(50, CONFIG.width - 50);
  const delays = sequenceDelays(count, 0.15, 0.22);
  return delays.map((delay) => ({
    delay,
    x: cx + rand(-30, 30),
    y: rand(-90, -30),
    targetX,
    curveAmp,
    curveFreq,
    phase: rand(0, Math.PI * 2),
  }));
}

// A wide horizontal row spread across the top of the lane, dropping down
// together with only minor stagger — "just horizontal in top" — reads as a
// wall of enemies descending in formation rather than a line crossing or a
// scatter.
function topHorizontal(count) {
  const margin = 40;
  const delays = sequenceDelays(count, 0.09, 0.14);
  return delays.map((delay, i) => {
    const x = margin + (i / Math.max(1, count - 1)) * (CONFIG.width - margin * 2);
    return {
      delay,
      x,
      y: rand(-60, -30),
      targetX: x + rand(-20, 20),
      curveAmp: rand(6, 12),
      curveFreq: rand(3, 5),
      phase: rand(0, Math.PI * 2),
    };
  });
}

// A small, simple near-center drop — kept as a lighter "breather" wave
// between the bigger, busier formations so not every single wave is a
// full-blown set piece.
function straightDrop(count) {
  const cx = rand(60, CONFIG.width - 60);
  const delays = sequenceDelays(count, 0.22, 0.32);
  return delays.map((delay) => ({
    delay,
    x: cx + rand(-50, 50),
    y: rand(-70, -20),
    targetX: cx + rand(-30, 30),
    curveAmp: 14,
    curveFreq: 6,
    phase: rand(0, Math.PI * 2),
  }));
}

// Corner-to-corner diagonal descent with a pronounced winding/spiral sway on
// top — starts clustered in one top corner, one after another, and snakes
// its way down to the opposite side instead of a clean straight diagonal
// (that's cornerDive). The higher curveFreq is what reads as "winding."
function spiralDescent(count) {
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? 20 : CONFIG.width - 20;
  const endX = fromLeft ? CONFIG.width - 20 : 20;
  const delays = sequenceDelays(count, 0.14, 0.22);
  return delays.map((delay) => ({
    delay,
    x: startX + rand(-8, 8),
    y: rand(-80, -30),
    targetX: endX,
    curveAmp: rand(35, 55),
    curveFreq: rand(3.5, 5),
    phase: rand(0, Math.PI * 2),
  }));
}

// A tight column that whips sharply side to side as it falls, staying
// roughly centered — reads as an alert, darting zigzag rather than a smooth
// sweep or a wide spiral.
function zigzagRow(count) {
  const cx = rand(80, CONFIG.width - 80);
  const delays = sequenceDelays(count, 0.12, 0.2);
  return delays.map((delay) => ({
    delay,
    x: cx + rand(-20, 20),
    y: rand(-70, -30),
    targetX: cx,
    curveAmp: rand(55, 75),
    curveFreq: rand(2.5, 3.5),
    phase: rand(0, Math.PI * 2),
  }));
}

// Two mini-lines entering from BOTH edges at once (alternating left/right by
// spawn order), converging toward the middle — a pincer rush rather than a
// single-direction crossing.
function pincerConverge(count) {
  const delays = sequenceDelays(count, 0.15, 0.22);
  return delays.map((delay, i) => {
    const fromLeft = i % 2 === 0;
    const startX = fromLeft ? 20 : CONFIG.width - 20;
    return {
      delay,
      x: startX,
      y: rand(-80, -30),
      targetX: CONFIG.width / 2 + rand(-20, 20),
      curveAmp: rand(10, 18),
      curveFreq: rand(3, 4.5),
      phase: rand(0, Math.PI * 2),
    };
  });
}

// Two or three successive horizontal rows, each row appearing as its own
// mini-wall a beat after the last — a stepped cascade instead of
// topHorizontal's single flat wall.
function cascadeRows(count) {
  const rows = Math.min(3, Math.max(2, Math.round(count / 6)));
  const perRow = Math.ceil(count / rows);
  const margin = 40;
  const specs = [];
  let placed = 0;
  for (let row = 0; row < rows && placed < count; row++) {
    const rowCount = Math.min(perRow, count - placed);
    for (let i = 0; i < rowCount; i++) {
      const x = margin + (rowCount > 1 ? i / (rowCount - 1) : 0.5) * (CONFIG.width - margin * 2);
      specs.push({
        delay: row * 0.55 + rand(0, 0.08),
        x, y: rand(-60, -30),
        targetX: x + rand(-15, 15),
        curveAmp: rand(6, 10), curveFreq: rand(3, 5), phase: rand(0, Math.PI * 2),
      });
    }
    placed += rowCount;
  }
  return specs;
}

// Independent diagonal streaks all sharing the same slant direction but
// starting from scattered points across the top — reads as a "rain" of
// enemies falling at an angle rather than one coherent line.
function diagonalRain(count) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const delays = sequenceDelays(count, 0.1, 0.16);
  return delays.map((delay) => {
    const startX = rand(20, CONFIG.width - 20);
    return {
      delay,
      x: startX,
      y: rand(-90, -20),
      targetX: Math.max(20, Math.min(CONFIG.width - 20, startX + dir * rand(80, 160))),
      curveAmp: rand(8, 16), curveFreq: rand(3, 5), phase: rand(0, Math.PI * 2),
    };
  });
}

const PATTERN_BUILDERS = {
  lineSweep, randomScatter, cornerDive, flyCircle, carveSweep, topHorizontal, straightDrop,
  spiralDescent, zigzagRow, pincerConverge, cascadeRows, diagonalRain,
};

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
    // Attacker-count-driven level: def.attackers is a fixed quota (not a
    // clock) — the level runs until this many regular enemies have been
    // sent out AND every one of them (plus the boss, if any) is cleared.
    // See main.js's level-complete check and allSpawned() below.
    this.totalAttackers = def.attackers || 10;
    this.spawnedCount = 0;
    // Delayed-spawn queue — a wave commits a whole formation's worth of
    // monsters at once (see update() below) but each one carries its own
    // `delay` before it actually appears, so a formation like lineSweep or
    // cornerDive plays out as a visible sequence (one after another) instead
    // of every monster in the wave popping in on the same frame.
    this.spawnQueue = [];
  }

  // True once every attacker in this level's quota has been committed to a
  // wave (some may still be sitting in spawnQueue or alive on screen — this
  // only tracks the spawn schedule, not what's actually visible yet).
  allSpawned() {
    return this.spawnedCount >= this.totalAttackers;
  }

  update(dt, state) {
    const def = this.def;

    // Formation waves — each wave picks ONE named pattern (line sweep,
    // random scatter, corner dive, fly circle, carve sweep, top horizontal
    // row, or a small straight drop) and queues its monsters with individual
    // delays so the formation plays out in a clear, readable sequence rather
    // than the whole wave appearing in a single instant. See the PATTERNS /
    // PATTERN_BUILDERS table above.
    this.monsterTimer -= dt;
    if (this.monsterTimer <= 0 && !this.allSpawned()) {
      // Every wave is a group of 5-20 — small and deliberately bounded so it
      // always reads as a countable formation (per the real per-monster step
      // delays in sequenceDelays above), never a shapeless pile, regardless
      // of how huge the level's total attacker quota is.
      const MIN_WAVE = 5, MAX_WAVE = 20;
      const pattern = pickPattern();
      const desired = Math.round(rand(MIN_WAVE, MAX_WAVE) * pattern.sizeFactor);
      // Clamp to the group-size band and to whatever's left in the level's
      // attacker quota — the very last wave of a level is often smaller than
      // a full one so the count lands exactly on def.attackers instead of
      // overshooting it.
      const count = Math.max(3, Math.min(Math.min(desired, MAX_WAVE), this.totalAttackers - this.spawnedCount));

      const specs = PATTERN_BUILDERS[pattern.name](count, def);
      let spawnSpan = 0;
      for (const s of specs) {
        spawnSpan = Math.max(spawnSpan, s.delay);
        const x = Math.max(20, Math.min(CONFIG.width - 20, s.x));
        this.spawnQueue.push({
          type: weightedPick(def.spawns),
          x,
          y: s.y,
          delay: s.delay,
          speedMult: def.speed * (s.speedMult || 1),
          hpMult: def.hpMult || 1,
          path: s.type === 'circle'
            ? { type: 'circle', centerX: s.centerX, radius: s.radius, angularSpeed: s.angularSpeed, phase: s.phase }
            : { targetX: Math.max(20, Math.min(CONFIG.width - 20, s.targetX)), curveAmp: s.curveAmp, curveFreq: s.curveFreq, phase: s.phase },
        });
      }
      this.spawnedCount += specs.length;

      // The NEXT wave is not allowed to start until THIS one has fully
      // finished entering (spawnSpan — the delay of its last-arriving
      // monster) plus a deliberate rest gap on top. This is the actual fix
      // for "no delay between sending evils / everything piles up
      // together": before, the timer reset to a fixed def.interval no
      // matter how long the current wave's formation took to finish
      // spawning, so a wide formation and the next wave's formation would
      // start overlapping mid-entrance, reading as one big mess. The rest
      // gap shrinks slightly on later levels (still floored) so the pace
      // picks up without ever losing the readable pause between groups.
      const restGap = Math.max(0.32, rand(0.55, 0.95) - (this.level - 1) * 0.02);
      this.monsterTimer = spawnSpan + restGap;
    }

    // Drain the delayed-spawn queue — this is what turns a committed
    // formation into monsters actually appearing on screen one after
    // another, on each one's own schedule, instead of all at once.
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      item.delay -= dt;
      if (item.delay <= 0) {
        state.monsters.push(new Monster(item.type, item.x, item.y, item.speedMult, item.path, item.hpMult));
        this.spawnQueue.splice(i, 1);
      }
    }

    // Boss (levels flagged boss:true) — spawns as the finale once the whole
    // regular attacker quota has been sent out AND the spawn queue has fully
    // drained (so the boss doesn't appear mid-formation, before the last
    // wave has actually finished entering), instead of at a fixed time.
    if (def.boss && !this.bossSpawned && this.allSpawned() && this.spawnQueue.length === 0) {
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
      boss.hp = boss.maxHp = Math.round((20 + this.level * 4) * (def.hpMult || 1));  // scales with level + stage
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
      this.obstacleTimer = rand(3.5, 6);
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
