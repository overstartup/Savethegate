// GateWall is stage-based: STAGE_COUNT stages, STAGE_SIZE levels each.
// Each STAGE now has its OWN single environment — Stage 1 is entirely a Sea
// journey, Stage 2 entirely Jungle, Stage 3 entirely Desert, and so on —
// instead of every stage cycling through the same 10 mixed environments.
// The 10 levels inside a stage are still a difficulty ramp (same enemy/
// duration/interval progression as before), just reskinned with flavor
// names + art that all belong to that one theme.
// interval = seconds between monster clumps (lower = harder)
// speed    = monster speed multiplier
// hpMult   = multiplies every spawned monster's base hp (see data/monsters.js)
// decor    = animated background effect (moving objects)
const LEVEL_PROGRESSION = [
  // A couple of imps from level 1 on, so the "enemies shoot back" mechanic
  // is visible right away instead of only showing up two levels in.
  { duration: 38, spawns: { goblin: 6, slime: 3, imp: 1 }, interval: 1.9, speed: 1.0, boss: false, movingObstacles: false },
  { duration: 41, spawns: { goblin: 4, slime: 4, imp: 2 }, interval: 1.7, speed: 1.1, boss: false, movingObstacles: false },
  { duration: 44, spawns: { slime: 5, goblin: 3, imp: 2 }, interval: 1.55, speed: 1.2, boss: false, movingObstacles: true },
  { duration: 47, spawns: { goblin: 4, imp: 3, skeleton: 2 }, interval: 1.4, speed: 1.3, boss: true, movingObstacles: true },
  { duration: 50, spawns: { slime: 4, skeleton: 3, imp: 2 }, interval: 1.3, speed: 1.4, boss: false, movingObstacles: true },
  { duration: 53, spawns: { imp: 4, skeleton: 3, troll: 1 }, interval: 1.2, speed: 1.5, boss: false, movingObstacles: true },
  { duration: 56, spawns: { slime: 4, skeleton: 3, troll: 2 }, interval: 1.1, speed: 1.6, boss: true, movingObstacles: true },
  { duration: 59, spawns: { imp: 6, goblin: 3, troll: 2 }, interval: 1.0, speed: 1.7, boss: false, movingObstacles: true },
  { duration: 62, spawns: { imp: 4, skeleton: 4, troll: 3 }, interval: 0.85, speed: 1.85, boss: false, movingObstacles: true },
  { duration: 68, spawns: { imp: 4, skeleton: 4, troll: 4 }, interval: 0.7, speed: 2.0, boss: true, movingObstacles: true },
];

// One theme per stage — sky gradient, animated background decor, and 10
// flavor names for that stage's own difficulty ramp (index-matched to
// LEVEL_PROGRESSION above).
// Art: island tiles are AI-generated stage-island illustrations (user-
// supplied, own generation — no copyright concerns), one per stage, wired
// in via ENV_THEMES/TILE_IMAGES in ui/screens.js (index-matched to this
// array). decor values reuse the existing particle/landmark render paths in
// main.js — 'bubbles'/'banners'/'sand' additionally unlock the real Kenney
// sprite systems (ships, castle towers, desert cacti), so those three are
// kept on the stages that actually depict water/castle/desert scenes.
export const STAGE_THEMES = [
  {
    name: 'Glacial Peak', sky: ['#2a4a6a', '#12222f'], decor: 'snow', decorColor: '#eaffff',
    levelNames: ['Frostgate Approach', 'Ice Palace Steps', 'Frozen Moat', 'Crystal Ramparts', 'Blizzard Courtyard',
      'Glacier Throne Room', 'Aurora Spire', 'Frostfire Hollow', 'Diamond Ice Vault', 'The Frozen Crown'],
  },
  {
    name: 'Oasis Citadel', sky: ['#8a6a30', '#3d2e14'], decor: 'sand', decorColor: '#ffe9a8',
    levelNames: ['Desert Gate', 'Palm Court', 'Sunken Pools', 'Golden Bazaar', 'Mirage Walls',
      'Dune Ramparts', 'Citadel Courtyard', "Sultan's Terrace", 'Hidden Cistern', 'Throne of Sands'],
  },
  {
    name: 'Abyssal Rift', sky: ['#071c33', '#02080f'], decor: 'bubbles', decorColor: '#7fd8ff',
    levelNames: ['Sunken Steps', 'Coral Ruins', 'Jellyfish Deep', 'Drowned Colonnade', 'Trench Gate',
      'Bioluminous Cavern', 'Kelp Labyrinth', 'The Rift Floor', 'Abyssal Temple', "Leviathan's Rift"],
  },
  {
    name: 'Crystallized Forest', sky: ['#123a2e', '#05140f'], decor: 'crystals', decorColor: '#8affea',
    levelNames: ['Crystal Brook', 'Prism Grove', 'Shard Falls', 'Gemlight Path', 'Rainbow Thicket',
      'Geode Hollow', 'Crystal Canopy', 'The Singing Falls', 'Radiant Glade', 'Heart of Crystal'],
  },
  {
    name: 'Draconic Peaks', sky: ['#2a0d10', '#0d0305'], decor: 'embers', decorColor: '#ff8a3d',
    levelNames: ['Ember Slope', 'Cinder Path', "Dragon's Rest", 'Molten Ridge', 'Obsidian Spire',
      'Lava Bridge', 'Scaleforge', 'Dragonfire Vent', "Wyrm's Descent", 'Crown of Embers'],
  },
  {
    name: 'Gilded Aviary', sky: ['#274a5e', '#0e1f2b'], decor: 'clouds', decorColor: '#ffe08a',
    levelNames: ['Skyward Gate', 'Aviary Gardens', 'Songbird Terrace', 'Gilded Balcony', 'Cloud Perch',
      'Featherlight Court', 'Golden Dome', 'Aviary Spire', 'Windsong Hall', 'Throne of Feathers'],
  },
  {
    name: 'Abyssal Forest', sky: ['#1a1030', '#08050f'], decor: 'crystals', decorColor: '#c9a6ff',
    levelNames: ['Waterfall Hollow', 'Mossy Crystal Path', 'Shaded Grove', 'Whispering Falls', 'Fern Cavern',
      'Glowmoss Trail', 'Hidden Spring', 'Verdant Rift', 'Crystal Waterfall', 'Heart of the Grove'],
  },
  {
    name: 'Aetherial Gardens', sky: ['#25204a', '#0b0a1c'], decor: 'voidstars', decorColor: '#b6c8ff',
    levelNames: ['Floating Steps', 'Aether Pools', 'Sky Garden Path', 'Levitation Court', 'Cloudglass Terrace',
      'Whispering Arches', 'Astral Fountain', 'Ether Bridge', 'Garden of Stars', 'Aetherial Sanctum'],
  },
  {
    name: 'Clockwork City', sky: ['#4a3420', '#1c1409'], decor: 'rain', decorColor: '#e0a45a',
    levelNames: ['Gearworks Gate', 'Steam Alley', 'Cogwheel Yard', 'Airship Dock', 'Brass Boulevard',
      'Piston Court', 'Clocktower Approach', 'Rivet Row', 'Boiler Deep', 'The Grand Mechanism'],
  },
  {
    name: 'Spectral Jungle', sky: ['#1c1030', '#08040f'], decor: 'fireflies', decorColor: '#c8a6ff',
    levelNames: ['Mushroom Path', 'Glowcap Hollow', 'Ghostlight Grove', 'Spore Marsh', 'Phantom Canopy',
      'Wisp Trail', 'Fungal Ruins', 'Spirit Thicket', 'Spectral Hollow', 'Heart of the Spectral Wood'],
  },
  {
    name: 'Crown of the Mountain King', sky: ['#4a4a55', '#1c1c22'], decor: 'banners', decorColor: '#e0d8c0',
    levelNames: ['Mountain Gate', "King's Approach", 'Stone Ramparts', 'Cliffside Court', 'Crownward Stair',
      'Royal Bastion', 'Summit Hall', "King's Vault", 'Throne Approach', 'Crown of the King'],
  },
  {
    name: 'The Deepwood', sky: ['#16301c', '#0a1a0e'], decor: 'spores', decorColor: '#8ad86a',
    levelNames: ['Rootway Path', 'Vine Hollow', 'Ancient Bark Trail', 'Mossbound Ruins', 'Elderwood Grove',
      'Twisted Canopy', 'Hollow Trunk', 'Deepwood Sanctum', 'Rootcrown Chamber', 'Heart of the Deepwood'],
  },
];

export const STAGE_SIZE = LEVEL_PROGRESSION.length; // 10 levels per stage
export const STAGE_COUNT = STAGE_THEMES.length;      // 6 themed stages

function buildStage(stageIdx) {
  // stageIdx 0 = Stage 1 (unchanged baseline — enemies still die in ~1 hit).
  // Each stage beyond that layers on more hp, more speed, denser spawns, and
  // a longer clock, so "Stage 5, Level 1" is a real step up from "Stage 1,
  // Level 1" even in its own theme.
  const theme = STAGE_THEMES[stageIdx];
  const hpMult = +(1 + stageIdx * 0.6).toFixed(2);
  const speedBump = +(1 + stageIdx * 0.12).toFixed(2);
  const durationBump = 1 + stageIdx * 0.08;

  return LEVEL_PROGRESSION.map((lvl, i) => ({
    ...lvl,
    name: theme.levelNames[i],
    sky: theme.sky,
    decor: theme.decor,
    decorColor: theme.decorColor,
    stage: stageIdx + 1,
    duration: Math.round(lvl.duration * durationBump),
    interval: +Math.max(0.35, lvl.interval - stageIdx * 0.12).toFixed(2),
    speed: +(lvl.speed * speedBump).toFixed(2),
    hpMult,
  }));
}

// Flat array (Stage 1 levels 0-9, Stage 2 levels 10-19, ...) so the existing
// level-index progression logic in main.js needs no changes — it just keeps
// counting up through a longer list. Use STAGE_SIZE to derive stage/level-
// in-stage for display (see ui/hud.js).
export const LEVELS = [];
for (let s = 0; s < STAGE_COUNT; s++) LEVELS.push(...buildStage(s));

// Weapons the player can buy with coins during play
export const WEAPONS = {
  bomb:   { cost: 30, label: 'BOMB' },   // clears every monster on screen
  angel:  { cost: 60, label: 'ANGEL' },  // helper angel auto-shoots for 15s
  shield: { cost: 40, label: 'SHIELD', duration: 10 }, // blocks enemy bullets for N seconds
  wall:   { cost: 35, label: 'WALL' },   // drops a barrier that blocks/chips monsters
  turret: { cost: 70, label: 'GUN' },    // drops an auto-firing turret in the lane
};
