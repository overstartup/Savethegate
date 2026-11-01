// ============================================================
// GateWall — ALL tunable numbers live here.
// Balance and tune the game by editing this file only.
//   Look & feel per stage ......... data/levels.js (cast, tints, ground)
//   Armory upgrade costs/effects .. data/upgrades.js
//   In-run power cards ............ systems/runUpgrades.js (RUN_UPGRADES)
// ============================================================
export const CONFIG = {
  // TESTING AID — keep false for release. When true, every stage on the
  // road map is playable regardless of progress.
  devUnlockAllStages: false,

  // Logical canvas (portrait). Everything is laid out in these units and
  // scaled to the device screen by main.js (see `quality.maxDpr`).
  width: 420,
  height: 740,

  // The Guardian (hero) — see entities/player.js, render/hero.js
  player: {
    speed: 420,          // px/sec max flying speed toward the finger
    y: 570,              // start height: on guard just in front of the Gate
    size: 36,            // collision diameter
    // Shooting starts slow and grows with the level reached and the Armory
    // (HASTE/POWER). In-run picks, portals and FEVER add on top, but never
    // past maxFireRate.
    fireRate: 5,         // bolts per second at Level 1, before upgrades
    levelFireRate: 0.025, // +2.5% fire rate per level reached
    levelDamage: 0.04,   // +4% bolt damage per level reached
    maxFireRate: 18,     // hard cap on bolts per second from every source
    // Blood line (hit-buffer). The equipped sticker normally sets this
    // (starter hero: 200); this is only the fallback. Empty blood → the next
    // hit costs a heart; it regenerates slowly when not being hit.
    maxBlood: 200,
    invulnAfterHit: 0.8, // seconds of immunity after a hit
    stickerDamagePerBolt: 100, // sticker damage rating that equals 1 bolt damage (starter hero: 1.2)
  },

  // The Guardian's bolts
  spell: {
    speed: 700,          // px/sec
    damage: 1,
    size: 10,
    critChance: 0.1,     // chance a bolt lands a critical hit…
    critMult: 2,         // …for this much damage (and a double knock-back)
  },

  // Enemy bullets (shooter species and boss volleys)
  enemyBullet: {
    speed: 260,          // px/sec
    size: 7,
  },

  // Enemies — per-species stats live in data/monsters.js
  monster: {
    baseSpeed: 60,       // px/sec descent at speed multiplier 1
  },

  // Ships — Abyssal Rift only. Sail along the water line and fire down.
  ship: {
    waterLine: 0.1,         // water surface (fraction of screen height): just under the HUD, so the whole stage is underwater
    baseSpeed: 46,          // px/sec
    size: 56,
    baseHp: 12,
    score: 90,
    shootInterval: 1.6,     // seconds between broadsides
    burstCount: 2,          // bullets per broadside
    burstSpread: 16,        // px between those bullets
    spawnInterval: [7, 11], // seconds between ships
    maxOnScreen: 2,
  },

  // Airships — Clockwork City only. Same patrol/broadside behaviour as the
  // ships above (same Ship entity, flagged .air), drawn procedurally as
  // brass zeppelins, flying a lane inside the hittable play field.
  airship: {
    lineY: 104,             // px — top of the airship lane (below CONFIG.playTop=80, so always hittable)
    laneDepth: 26,          // px — random extra drop per airship, so two don't stack on one line
    baseSpeed: 40,          // px/sec — a touch slower than a ship, they lumber
    size: 54,
    baseHp: 10,
    score: 90,
    shootInterval: 1.9,     // seconds between bomb drops
    burstCount: 2,          // bombs per drop
    burstSpread: 18,        // px between those bombs
    spawnInterval: [8, 12], // seconds between airships
    maxOnScreen: 2,
  },

  // Drifting obstacles ("living lanes") — block bolts
  obstacle: {
    driftSpeed: 22,      // px/sec
  },

  // Helpers bought from the buy row during a run (Armory upgrades add to
  // these). Damage is a SHARE of the Guardian's current bolt damage, so
  // helpers grow with Armory POWER and in-run level-ups instead of going
  // useless as enemies toughen. Wall/Gun health also grows per stage.
  helpers: {
    bomb:   { cost: 40, power: 800 },   // blast budget (spent nearest-first)
    shield: { cost: 45, duration: 10 }, // seconds of bullet immunity
    wall: {
      cost: 40, hp: 14, width: 90, height: 22, dropY: 520,
      thorns: 2.0,       // damage/sec to enemies pressed on it, x bolt damage
      crushDps: 2,       // hp/sec the wall loses while an enemy presses it
    },
    turret: {            // "GUN"
      cost: 80, hp: 12, size: 34, dropY: 560,
      shotInterval: 0.3, // seconds between shots
      damage: 0.9,       // per shot, x bolt damage
      crushDps: 3,       // hp/sec lost while an enemy touches it
      range: 460,        // px — aims at the nearest enemy above it in range
      turnRate: 6,       // rad/sec the head can swivel
      maxAim: 1.1,       // rad either side of straight up
    },
    angel: {             // "WARD SPRITE": stays for the whole run
      cost: 90,
      shotInterval: 0.25,
      damage: 0.5,       // per shot, x bolt damage
      guard: 3,          // bullets it soaks before being knocked out
      stun: 4,           // seconds knocked out (no shots, no blocking)
    },
    stageHp: 0.5,        // wall/gun hp +50% per stage
  },

  // Gift portals — always good: a fire-rate boost or a blood heal
  gate: {
    multipliers: [1.35, 1.6], // fire-rate boost options (temporary)
    bloodGiftChance: 0.35, // chance the gift is a heal instead
    bloodGiftHeal: 0.5,    // fraction of max blood restored
  },

  // Bottom buy-button row. rowBottomOffset = distance from the screen
  // bottom to the TOP of the row; the hero's movement is clamped above it.
  hud: {
    rowBottomOffset: 66,
    rowHeight: 64,
  },

  // Hearts. EVERY enemy that crosses the gate line costs one heart.
  gateHealth: 5,
  // Enemies above this line are still under the header (score, level,
  // hearts): bolts pass them by and nothing aims at them until they come
  // down into the play field.
  playTop: 80,
  gateY: 0, // set below: the gate line sits just above the buy row

  // Difficulty curve — the horde outgrows a hero who relies only on free
  // in-run level-ups, so Armory upgrades and helpers become necessary.
  // Tuned with the headless playtest bot (plays whole stages, uses helpers
  // with coins earned in the run). Armory level needed per stage (all units):
  //   ~4 -> Stage 1, ~8 -> Stages 2-5, ~14 -> Stages 6-9, ~20-26 -> 10-11,
  //   ~30+ -> Stage 12. A fresh free player (no daily rewards counted)
  //   clears Stage 1 in ~1.2 h, Stage 2 ~4 h, Stage 4 ~8 h, Stage 7 ~26 h.
  difficulty: {
    levelHp: 0.28,     // enemy hp +38% per level within a stage
    // enemy hp per stage: 1 + stageHp*s + stageHpSq*s^2 (s = stage-1):
    // x2.8 at stage 2, x7 at stage 4, x18 at stage 8, x32 at stage 12 —
    // a gentle first step, then a steady climb the Armory has to keep up with
    stageHp: 1.7,
    stageHpSq: 0.1,
    runHp: 0.05,       // enemy hp +5% per in-run level-up the player has
    levelShoot: 0.09,  // shooters fire 9% more often per level-in-stage
    stageShoot: 0.25,  // …and 25% more often per stage
    levelCrowd: 1.8,   // alive-on-screen cap grows per level-in-stage
    stageCrowd: 3,     // …and per stage
    bossBase: 50, bossLevel: 34, bossStage: 100, bossRun: 0.08, // a boss fight lasts ~40–70s
    runPower: 0.28,    // in-run Power Crystal: +28% per pick
    runRate: 0.2,      // in-run Haste Rune: +20% per pick
    feverRate: 1.4,    // fire-rate boost while FEVER lasts
    // Enemies grow with the Guardian's Armory power too, so a strong build
    // stays challenged: their hp gets this share of your POWER x HASTE bonus
    // (0.15 → a hero 3x stronger than base meets foes with +30% hp).
    armoryHp: 0.1,
    // Enemy bullets hit harder every level and every stage:
    // base x (1 + bulletStage x stage) x (1 + bulletLevel x level-in-stage).
    // Stage 1: 20 -> 31 over its 10 levels; stage 5: 56 -> 87; stage 12: 119 -> 183.
    bulletBase: 20,
    bulletStage: 0.45,
    bulletLevel: 0.06,
    eliteBullet: 1.3,  // elites' shots x this
    bossBullet: 1.5,   // stage boss volleys x this (captains: miniBullet)
    miniBullet: 1.25,
  },

  // Level pacing — every level is a run of waves (systems/spawner.js).
  waves: {
    quotaMult: 1.6,         // enemies per level = level's attackers x this…
    quotaFalloff: 0.03,
    bossLevelQuota: 0.75,   // boss levels (4, 7, 10) send this share of the attackers     // …minus this per level into the stage (x1.33 by the tenth)
    levelTime: [70, 7],     // target seconds of releases: 70s at a stage's L1, +7s per level
    baseWaves: 3,           // waves at a stage's first level…
    wavesPerLevel: 0.45,    // …growing to ~7 by its tenth
    breather: [4, 6.5],     // seconds of calm between waves
  },

  // Graphics quality — 2 high, 1 medium, 0 low. With `auto`, main.js
  // watches the real frame time and steps down when a device struggles
  // (and back up when there is headroom), so phones stay smooth.
  //   high:   full effects, up to 2x pixel density
  //   medium: 1.5x density; no creature auras / afterimages / near scenery
  //   low:    1x density; also no fog, light rays or HUD glow shadows
  quality: {
    level: 2,
    auto: true,
    maxDpr: [1, 1.5, 2],
  },

  // Ads (AdMob via Capacitor — no-op in a plain browser, see systems/ads.js)
  ads: {
    interstitialEveryNLevels: 2,  // full-screen ad on level clear every N levels
  },

  // Coin economy. Earned in play (~650 coins over Stage 1, more later),
  // topped up by free daily rewards, spent on the Armory (a full first rank
  // of the Guardian ≈ 2,800), helpers (35–80) and coin revives. Coin packs
  // in the shop (data/shop.js) shortcut the grind.
  // ONE value scale for every coin in the game: 10 coins = 1 cent, so the
  // $3.99 pack is 4,000 coins (data/shop.js). Earning is time-based: a
  // level takes ~1.5-2 min and pays ~4-8 cents; a whole stage (10 levels +
  // boss, ~20 min) about 1,000 coins = $1 at stage 1, more later on. Prices
  // follow from that: a revive costs about one level's coins, a helper
  // about half a level, an Armory rank a few stages (data/upgrades.js).
  economy: {
    coinDropChance: 0.25,     // share of kills that drop coins
    coinDropAmount: [2, 3],   // min/max coins per drop
    levelClear: { base: 30, perLevel: 5, perStage: 25 }, // coins for clearing a level (stage 1: 35-80)
    bossBonus: { base: 100, perStage: 50, finalMult: 1.5, miniShare: 0.4 }, // extra coins for a boss kill: stage boss (L10) x finalMult, captains (L4/L7) miniShare of that
    // revive price: base + perStage x stage, doubling for each revive in
    // the same run (stage 1: 100 / 200 / 400 = 10c / 20c / 40c)
    revive: { base: 100, perStage: 25, growth: 2, max: 3 },
    adRevives: 1,                 // free video revives per run
    // free rewards (systems/rewards.js, Rewards page)
    dailyLogin: [100, 150, 200, 250, 300, 400, 800], // 7-day streak, day 7 is the big one
    giftCoins: 60, giftHours: 4,                      // free gift every few hours
    // rewarded video: each one today pays the next step (a video earns us
    // ~1-2c, so these stay modest), up to videoCoins.length per day
    videoCoins: [30, 40, 50, 60, 80],
    invite: { friendGets: 500, youGet: 1000 },        // per friend who enters your code
    missionsPerDay: 3,
    // Daily Challenge (systems/challenge.js): `first` for the first finished
    // run of the day, `beatBest` for each later run that beats today's best
    challenge: { first: 150, beatBest: 50, levels: 3 },
    // star chest on the home map: one per `every` level stars earned,
    // paying coins + growth x chests already opened (ui/levelStars.js)
    starChest: { every: 10, coins: 150, growth: 10 },
  },
};

// Derived values (kept in one place so changing the HUD moves the gate too).
CONFIG.gateY = CONFIG.height - CONFIG.hud.rowBottomOffset - 12;
