// ============================================================
// GateWall — ALL tunable numbers live here.
// Balance the game by editing this file only.
// ============================================================
export const CONFIG = {
  // TEMP TESTING AID — set back to false before release. When true, every
  // stage on the road map is tappable/playable regardless of progress, so
  // all 5 themes can be tested directly instead of grinding stage 1 first.
  devUnlockAllStages: false,

  // Canvas (portrait, phone-like)
  width: 420,
  height: 740,

  // Player (wizard)
  player: {
    speed: 420,          // px/sec horizontal drag speed cap
    y: 640,              // fixed vertical position (kept a bit above the buy-button row clamp)
    size: 36,
    fireRate: 6,         // spells per second (base)
    // "blood line" hit-buffer — depleting it costs 1 heart, then refills.
    // This is only a fallback for the rare case a run somehow starts with no
    // equipped sticker (normally the sticker's own `blood` — e.g. 200 —
    // wins). Kept in the same 200-ish ballpark so bullets (5-10+ damage
    // each) always take several hits to cost a heart, never just one.
    maxBlood: 200,
    invulnAfterHit: 0.8, // seconds of immunity after taking a blood-line hit (no instant double-hits)
  },

  // Spells
  spell: {
    speed: 620,          // px/sec upward
    damage: 1,
    size: 10,
  },

  // Angels — persistent helpers (no lifetime timer). They soak hits with
  // their own blood line before the wizard's is touched, which is what makes
  // buying one a pure upside instead of a risk.
  angel: {
    maxBlood: 2,
  },

  // Enemy bullets — some monster types (see shootInterval in data/monsters.js)
  // now shoot back. Their fire hits the blood-line buffer, same as touching a monster.
  enemyBullet: {
    speed: 260,          // px/sec downward
    size: 7,
  },

  // Monsters
  monster: {
    baseSpeed: 60,       // px/sec downward
    clumpSize: [2, 6],   // min/max per clump
    spawnInterval: 1.7,  // seconds between clumps (shrinks per wave)
  },

  // Ships — Sea War only. Patrol the water-surface line horizontally and
  // shoot straight down (reuses enemyBullet); destroyable like a monster.
  ship: {
    waterLine: 0.5,       // fraction of CONFIG.height where hills end / water begins
    baseSpeed: 46,        // px/sec horizontal sail speed
    size: 56,
    baseHp: 12,            // real damage sponge — takes a sustained volley to sink
    score: 90,              // pays out more, matching the higher hp
    shootInterval: 1.6,    // seconds between broadsides (was 2.6 — fires more often)
    burstCount: 2,          // bullets per broadside, side-by-side spread
    burstSpread: 16,        // px between bullets in a spread
    spawnInterval: [7, 11], // seconds between ship spawns — fewer ships on screen at once
    maxOnScreen: 2,         // hard cap regardless of timer, so it never gets swarmy
  },

  // Obstacles & gates
  obstacle: {
    driftSpeed: 22,      // "living lanes" — obstacles slide down slowly
  },

  // Player-placeable defenses — bought from the weapon bar like bomb/shield/
  // angel, but instead of an instant effect they drop a structure into the
  // lane above the Guardian that fights on its own until destroyed.
  wall: {
    cost: 35,
    hp: 10,
    width: 90,
    height: 22,
    dropY: 520,             // fixed placement row, above the Guardian
    touchDamageToMonster: 2.5, // per second a monster is pressed against it
    touchDamageToWall: 2,      // per second a monster is pressed against it
  },
  turret: {
    cost: 70,
    hp: 7,
    size: 34,
    dropY: 560,             // slightly lower than the wall row
    fireRate: 0.45,          // seconds between shots — fast, steady fire
    damage: 1,
    touchDamageFromMonster: 3, // per second a monster is pressed against it
  },
  // Gates are now a pure gift — no more curse/bad portal. Most of the time
  // it's a fire-rate multiplier (×2/×3 for a few seconds); sometimes
  // (bloodGiftChance) it's a straight partial heal of the blood line
  // instead, so the gift stays interesting without ever punishing the
  // player for grabbing it.
  gate: {
    multipliers: [2, 3],   // fire-rate gift options
    bloodGiftChance: 0.35, // chance a gate gift is a blood-heal instead of a fire-rate mult
    bloodGiftHeal: 0.5,    // fraction of max blood restored by a blood-gift gate
  },

  // HUD — the bottom buy-button row's position, shared between ui/hud.js
  // (where it draws the row) and entities/player.js (which clamps the
  // Guardian's movement to stop above it, so the player can never fly
  // behind/under the buttons). rowBottomOffset is measured up from the
  // screen's bottom edge to the TOP of the row.
  hud: {
    rowBottomOffset: 66, // was 76 — pushed the row further down toward the edge
    rowHeight: 64,
  },

  // GateWall (base health)
  gateHealth: 3,

  // Adaptive difficulty
  adaptive: {
    easeAfterLosses: 2,   // consecutive losses before easing
    easeFactor: 0.85,     // spawn density multiplier when easing
    hardenPerWin: 1.05,
  },

  // Ads (AdMob via Capacitor — no-op in a plain browser, see src/systems/ads.js)
  ads: {
    interstitialEveryNLevels: 2,  // full-screen ad on level-clear every N levels
    rewardedCoins: 25,             // coins granted for watching a rewarded ad
  },

  // Coin economy — deliberately tight. Kills/levels trickle a few coins;
  // BOMB and ANGEL are meant to feel earned or worth buying, not free-flowing.
  economy: {
    coinDropChance: 0.35,     // only some kills drop a coin at all
    coinDropAmount: [1, 2],   // min/max coins per drop (when one occurs)
    levelClearBonus: 4,       // flat bonus per level, not scaled by level number
  },
};
