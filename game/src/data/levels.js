import { CONFIG } from '../config.js';
import { tr } from '../i18n.js';
// GateWall is stage-based: STAGE_COUNT stages, STAGE_SIZE levels each.
// Each STAGE now has its OWN single environment — Stage 1 is entirely a Sea
// journey, Stage 2 entirely Jungle, Stage 3 entirely Desert, and so on —
// instead of every stage cycling through the same 10 mixed environments.
// The 10 levels inside a stage are still a difficulty ramp (same enemy/
// duration/interval progression as before), just reskinned with flavor
// names + art that all belong to that one theme.
// speed     = monster speed multiplier
// hpMult    = multiplies every spawned monster's base hp (see data/monsters.js)
// decor     = animated background effect (moving objects)
// attackers = a FIXED attacker quota for the level — once this many have
//             been sent and every one (plus the boss, if any) is dealt with,
//             the level clears. Every Shatterling that crosses the gate costs
//             a heart, so quotas start small and climb step by step; the
//             spawner (systems/spawner.js) also caps how many are alive at
//             once so the player is never swamped before they've grown.
// New enemy types are introduced one at a time (goblins → slimes → bats →
// skeletons → trolls) so each level teaches one new threat.
const LEVEL_PROGRESSION = [
  { attackers: 32,  spawns: { goblin: 3, slime: 2, imp: 2, skeleton: 2, troll: 1 }, speed: 0.8, boss: true, movingObstacles: false },
  { attackers: 40,  spawns: { goblin: 5, slime: 2 }, speed: 0.85, boss: false, movingObstacles: false },
  { attackers: 50,  spawns: { goblin: 4, slime: 3, imp: 1 }, speed: 0.9, boss: false, movingObstacles: false },
  { attackers: 60,  spawns: { goblin: 4, slime: 3, imp: 2, skeleton: 1 }, speed: 0.95, boss: true, movingObstacles: false },
  { attackers: 75,  spawns: { slime: 4, skeleton: 2, imp: 2, goblin: 2 }, speed: 1.0, boss: false, movingObstacles: true },
  { attackers: 90,  spawns: { imp: 3, skeleton: 3, troll: 1, goblin: 2 }, speed: 1.05, boss: false, movingObstacles: true },
  { attackers: 105, spawns: { slime: 3, skeleton: 3, troll: 2, imp: 2 }, speed: 1.1, boss: true, movingObstacles: true },
  { attackers: 125, spawns: { imp: 4, goblin: 3, troll: 2, skeleton: 2 }, speed: 1.15, boss: false, movingObstacles: true },
  { attackers: 145, spawns: { imp: 4, skeleton: 4, troll: 3 }, speed: 1.2, boss: false, movingObstacles: true },
  { attackers: 170, spawns: { imp: 4, skeleton: 4, troll: 4 }, speed: 1.3, boss: true, movingObstacles: true },
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
// typeSwap (optional) lets a stage substitute one monster TYPE for another
// in LEVEL_PROGRESSION's spawns. No stage uses it now: every stage has its
// own species for every role in `cast`, so all roles (flyers and brutes
// included) appear with art that fits the stage.
// monsterTint — { primary, dark, glow } per-stage enemy palette (see
// drawMonster/tintSprite in main.js). primary recolors sprite-based
// enemies (goblin/slime/imp) and fills the new procedural skeleton/troll/
// boss shapes; dark is their outline/shadow tone; glow is a small accent
// (eyes, rim-light, weapon glint) so every stage's Shatterlings visibly
// belong to that environment instead of every stage sharing one identical
// cast of colors.
// groundPalette — { hills: [far,mid,near], bands: [bottom..top], tree } used
// by drawGroundHills/drawGroundBands in main.js to give every stage the same
// layered-terrain treatment the Sea War stage originated (rolling hill
// silhouettes + a bounded 4-strata ground floor), just recolored per biome —
// see drawLandmark()'s per-decor cases, which now draw this ground FIRST,
// underneath each stage's existing unique set-piece props (towers, ice
// golem, cacti, etc.).
export const STAGE_THEMES = [
  {
    get name() { return tr('d.stage.abyssal_rift'); }, sky: ['#071c33', '#02080f'], decor: 'bubbles', decorColor: '#7fd8ff',
    monsterTint: { primary: '#3fb8d8', dark: '#0a2a3a', glow: '#aef2ff' },
    // Sea War draws its own dedicated water+hills+seafloor (see the
    // 'bubbles' case in drawLandmark) — this entry is kept for reference/
    // consistency but isn't read by the generic ground renderer.
    groundPalette: { hills: ['#3f7a5c', '#2a5a42', '#173d2e'], bands: ['#3d2b1a', '#5a3d22', '#7a5a34', '#e8d29e'], tree: '#0f2a20' },
    levelNames: ['Sunken Steps', 'Coral Ruins', 'Jellyfish Deep', 'Drowned Colonnade', 'Trench Gate',
      'Bioluminous Cavern', 'Kelp Labyrinth', 'The Rift Floor', 'Abyssal Temple', "Leviathan's Rift"],
    // cast — the stage's own species for each role (render/species.js)
    cast: { goblin: 'crab', slime: 'jelly', slimeSmall: 'urchin', imp: 'lanternfin', skeleton: 'pirate', troll: 'turtle', ogreBoss: 'kraken' },
  },
  {
    get name() { return tr('d.stage.glacial_peak'); }, sky: ['#2a4a6a', '#12222f'], decor: 'snow', decorColor: '#eaffff',
    monsterTint: { primary: '#bfe8ff', dark: '#1c3a4a', glow: '#eaffff' },
    cast: { goblin: 'frostling', slime: 'snowblob', slimeSmall: 'snowblob', imp: 'icebat', skeleton: 'wraith', troll: 'yeti', ogreBoss: 'frostgiant' },
    groundPalette: { hills: ['#3a5f78', '#2a4a60', '#1c3648'], bands: ['#16303f', '#284f63', '#4a7891', '#cfeaf5'], tree: '#0f2836' },
    levelNames: ['Frostgate Approach', 'Ice Palace Steps', 'Frozen Moat', 'Crystal Ramparts', 'Blizzard Courtyard',
      'Glacier Throne Room', 'Aurora Spire', 'Frostfire Hollow', 'Diamond Ice Vault', 'The Frozen Crown'],
  },
  {
    get name() { return tr('d.stage.oasis_citadel'); }, sky: ['#8a6a30', '#3d2e14'], decor: 'sand', decorColor: '#ffe9a8',
    monsterTint: { primary: '#d8a25c', dark: '#4a2e12', glow: '#ffe9a8' },
    cast: { goblin: 'scarab', slime: 'dustdevil', slimeSmall: 'dustdevil', imp: 'vulture', skeleton: 'mummy', troll: 'scorpion', ogreBoss: 'sphinx' },
    groundPalette: { hills: ['#7a5a28', '#5e451e', '#453218'], bands: ['#3d2b12', '#5a4018', '#8a6a2c', '#e8c878'], tree: '#3a4a1c' },
    levelNames: ['Desert Gate', 'Palm Court', 'Sunken Pools', 'Golden Bazaar', 'Mirage Walls',
      'Dune Ramparts', 'Citadel Courtyard', "Sultan's Terrace", 'Hidden Cistern', 'Throne of Sands'],
  },
  {
    get name() { return tr('d.stage.crystallized_forest'); }, sky: ['#123a2e', '#05140f'], decor: 'crystals', decorColor: '#8affea',
    monsterTint: { primary: '#5ce0c0', dark: '#0e3327', glow: '#c8fff2' },
    cast: { goblin: 'shardfox', slime: 'mushling', slimeSmall: 'mushling', imp: 'moth', skeleton: 'treant', troll: 'crystalgolem', ogreBoss: 'eldertreant' },
    groundPalette: { hills: ['#2f6a52', '#1c4e3a', '#0f3527'], bands: ['#0a2a1f', '#164a35', '#2f7a5c', '#8affea'], tree: '#0a2a1f' },
    levelNames: ['Crystal Brook', 'Prism Grove', 'Shard Falls', 'Gemlight Path', 'Rainbow Thicket',
      'Geode Hollow', 'Crystal Canopy', 'The Singing Falls', 'Radiant Glade', 'Heart of Crystal'],
    // A magical crystal grove can plausibly host the full cast as-is.
  },
  {
    get name() { return tr('d.stage.draconic_peaks'); }, sky: ['#2a0d10', '#0d0305'], decor: 'embers', decorColor: '#ff8a3d',
    monsterTint: { primary: '#e04a2a', dark: '#380a05', glow: '#ffb35c' },
    cast: { goblin: 'kobold', slime: 'magma', slimeSmall: 'magma', imp: 'firebat', skeleton: 'emberknight', troll: 'drake', ogreBoss: 'dragon' },
    groundPalette: { hills: ['#5a2418', '#3d160e', '#240b06'], bands: ['#1c0805', '#3d160e', '#7a2e12', '#ff8a3d'], tree: '#1c0805' },
    levelNames: ['Ember Slope', 'Cinder Path', "Dragon's Rest", 'Molten Ridge', 'Obsidian Spire',
      'Lava Bridge', 'Scaleforge', 'Dragonfire Vent', "Wyrm's Descent", 'Crown of Embers'],
  },
  {
    get name() { return tr('d.stage.gilded_aviary'); }, sky: ['#274a5e', '#0e1f2b'], decor: 'clouds', decorColor: '#ffe08a',
    monsterTint: { primary: '#e0b85c', dark: '#4a3410', glow: '#fff0c0' },
    cast: { goblin: 'finch', slime: 'egg', slimeSmall: 'chick', imp: 'toucan', skeleton: 'owl', troll: 'griffin', ogreBoss: 'phoenix' },
    groundPalette: { hills: ['#5a4a2e', '#453620', '#2e2314'], bands: ['#2e2314', '#4a3820', '#7a5e34', '#ffe08a'], tree: '#2e2314' },
    levelNames: ['Skyward Gate', 'Aviary Gardens', 'Songbird Terrace', 'Gilded Balcony', 'Cloud Perch',
      'Featherlight Court', 'Golden Dome', 'Aviary Spire', 'Windsong Hall', 'Throne of Feathers'],
  },
  {
    get name() { return tr('d.stage.abyssal_forest'); }, sky: ['#1a1030', '#08050f'], decor: 'crystals', decorColor: '#c9a6ff',
    monsterTint: { primary: '#9a6ad8', dark: '#241238', glow: '#e2c8ff' },
    cast: { goblin: 'gloomling', slime: 'wisp', slimeSmall: 'wisp', imp: 'raven', skeleton: 'witch', troll: 'bramble', ogreBoss: 'shadowstag' },
    groundPalette: { hills: ['#3a2a5e', '#2a1c48', '#1a1032'], bands: ['#140c28', '#281c48', '#4a3070', '#c9a6ff'], tree: '#140c28' },
    levelNames: ['Waterfall Hollow', 'Mossy Crystal Path', 'Shaded Grove', 'Whispering Falls', 'Fern Cavern',
      'Glowmoss Trail', 'Hidden Spring', 'Verdant Rift', 'Crystal Waterfall', 'Heart of the Grove'],
  },
  {
    get name() { return tr('d.stage.aetherial_gardens'); }, sky: ['#25204a', '#0b0a1c'], decor: 'voidstars', decorColor: '#b6c8ff',
    monsterTint: { primary: '#8ea8f0', dark: '#1c2048', glow: '#dce6ff' },
    cast: { goblin: 'starsprite', slime: 'bloom', slimeSmall: 'seedling', imp: 'comet', skeleton: 'astral', troll: 'moongolem', ogreBoss: 'seraph' },
    groundPalette: { hills: ['#38356a', '#28264e', '#1a1836'], bands: ['#141230', '#241f48', '#3f3a70', '#b6c8ff'], tree: '#141230' },
    levelNames: ['Floating Steps', 'Aether Pools', 'Sky Garden Path', 'Levitation Court', 'Cloudglass Terrace',
      'Whispering Arches', 'Astral Fountain', 'Ether Bridge', 'Garden of Stars', 'Aetherial Sanctum'],
  },
  {
    get name() { return tr('d.stage.clockwork_city'); }, sky: ['#4a3420', '#1c1409'], decor: 'rain', decorColor: '#e0a45a',
    monsterTint: { primary: '#c08838', dark: '#3a2308', glow: '#ffd27a' },
    cast: { goblin: 'cogbot', slime: 'gearball', slimeSmall: 'gear', imp: 'drone', skeleton: 'steamsoldier', troll: 'juggernaut', ogreBoss: 'chronos' },
    groundPalette: { hills: ['#5a4020', '#3d2b14', '#26190c'], bands: ['#1c1208', '#3a2814', '#6a4a20', '#e0a45a'], tree: '#1c1208' },
    levelNames: ['Gearworks Gate', 'Steam Alley', 'Cogwheel Yard', 'Airship Dock', 'Brass Boulevard',
      'Piston Court', 'Clocktower Approach', 'Rivet Row', 'Boiler Deep', 'The Grand Mechanism'],
  },
  {
    get name() { return tr('d.stage.spectral_jungle'); }, sky: ['#1c1030', '#08040f'], decor: 'fireflies', decorColor: '#c8a6ff',
    monsterTint: { primary: '#a680d8', dark: '#221238', glow: '#e4c8ff' },
    cast: { goblin: 'shroomkin', slime: 'sporeling', slimeSmall: 'sporeling', imp: 'glowmoth', skeleton: 'tiki', troll: 'shroomgiant', ogreBoss: 'serpent' },
    groundPalette: { hills: ['#3a2a5a', '#281c40', '#181028'], bands: ['#120c20', '#241c3a', '#4a3868', '#c8a6ff'], tree: '#120c20' },
    levelNames: ['Mushroom Path', 'Glowcap Hollow', 'Ghostlight Grove', 'Spore Marsh', 'Phantom Canopy',
      'Wisp Trail', 'Fungal Ruins', 'Spirit Thicket', 'Spectral Hollow', 'Heart of the Spectral Wood'],
  },
  {
    get name() { return tr('d.stage.crown_of_the_mountain_king'); }, sky: ['#4a4a55', '#1c1c22'], decor: 'banners', decorColor: '#e0d8c0',
    monsterTint: { primary: '#9a9aa8', dark: '#2a2a32', glow: '#e0d8c0' },
    cast: { goblin: 'ram', slime: 'boulder', slimeSmall: 'pebble', imp: 'eagle', skeleton: 'guard', troll: 'ogre', ogreBoss: 'mountainking' },
    groundPalette: { hills: ['#5a5a62', '#454549', '#2e2e32'], bands: ['#242428', '#3a3a40', '#5e5e66', '#e0d8c0'], tree: '#242428' },
    levelNames: ['Mountain Gate', "King's Approach", 'Stone Ramparts', 'Cliffside Court', 'Crownward Stair',
      'Royal Bastion', 'Summit Hall', "King's Vault", 'Throne Approach', 'Crown of the King'],
  },
  {
    get name() { return tr('d.stage.the_deepwood'); }, sky: ['#16301c', '#0a1a0e'], decor: 'spores', decorColor: '#8ad86a',
    monsterTint: { primary: '#5ca048', dark: '#122a10', glow: '#a8e880' },
    cast: { goblin: 'boar', slime: 'puff', slimeSmall: 'spore', imp: 'dragonfly', skeleton: 'bonecrawler', troll: 'mossbear', ogreBoss: 'bonedragon' },
    groundPalette: { hills: ['#2e5a2a', '#1e421c', '#122a10'], bands: ['#0d1f0c', '#1e3a18', '#3a6a2e', '#8ad86a'], tree: '#0d1f0c' },
    levelNames: ['Rootway Path', 'Vine Hollow', 'Ancient Bark Trail', 'Mossbound Ruins', 'Elderwood Grove',
      'Twisted Canopy', 'Hollow Trunk', 'Deepwood Sanctum', 'Rootcrown Chamber', 'Heart of the Deepwood'],
  },
];

// THE FIRST MINUTE: Stage 1's opening levels are softer for everyone, so
// the very first fight is a sure win and L2-L3 ramp gently. Only Stage 1
// uses this (later stages keep LEVEL_PROGRESSION as is).
//   crowd   — added to the spawner's alive-on-screen cap (systems/spawner.js)
//   noElite — no elite (tanky, glowing) variants on that level
//   timeMult — scales the level's target length (CONFIG.waves.levelTime)
const TU_STAGE1_EASE = [
  { attackers: 36, speed: 0.75, crowd: 0, noElite: true, timeMult: 0.85,
    spawns: { goblin: 4, slime: 3, slimeSmall: 2, imp: 2, skeleton: 2, troll: 1 }, boss: true },
  { attackers: 45, speed: 0.80, crowd: 0,
    spawns: { goblin: 4, slime: 3, slimeSmall: 2, imp: 2, skeleton: 2, troll: 1 }, boss: true },
  { attackers: 55, speed: 0.85,
    spawns: { goblin: 4, slime: 3, slimeSmall: 2, imp: 3, skeleton: 2, troll: 1 }, boss: true },
];

export const STAGE_SIZE = LEVEL_PROGRESSION.length; // 10 levels per stage
export const STAGE_COUNT = STAGE_THEMES.length;      // 6 themed stages

function buildStage(stageIdx) {
  // stageIdx 0 = Stage 1 (unchanged baseline — enemies still die in ~1 hit).
  // Each stage beyond that layers on more hp, more speed, denser spawns, and
  // a longer clock, so "Stage 5, Level 1" is a real step up from "Stage 1,
  // Level 1" even in its own theme.
  const theme = STAGE_THEMES[stageIdx];
  const hpMult = +(1 + stageIdx * 0.5).toFixed(2);
  const speedBump = +(1 + stageIdx * 0.06).toFixed(2);
  // Each later stage sends a few more attackers (+15%/stage) on top of
  // tougher (hpMult) and slightly faster (speedBump) Shatterlings.
  const attackersMult = 1 + stageIdx * 0.15;

  return LEVEL_PROGRESSION.map((lvl, i) => ({
    ...lvl,
    // translated at draw time (levelNames stay English; see lvlNameKey)
    get name() { return tr(lvlNameKey(theme.levelNames[i])); },
    sky: theme.sky,
    decor: theme.decor,
    decorColor: theme.decorColor,
    monsterTint: theme.monsterTint,
    cast: theme.cast || {},
    groundPalette: theme.groundPalette,
    stage: stageIdx + 1,
    attackers: Math.round(lvl.attackers * attackersMult),
    speed: +(lvl.speed * speedBump).toFixed(2),
    hpMult,
    spawns: remapSpawns(lvl.spawns, theme.typeSwap),
    // Stage 1 opens gentler (stage multipliers are all 1 there)
    ...(stageIdx === 0 ? TU_STAGE1_EASE[i] : null),
  }));
}

// 'Sunken Steps' → 'd.lvl.sunken_steps' (the key in src/lang/data.js).
function lvlNameKey(n) {
  return 'd.lvl.' + n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Redirects one monster type to another wherever it appears in a spawn
// table (see typeSwap on each STAGE_THEMES entry) — merges into any
// existing count for the target type rather than overwriting it, so total
// spawn weight/difficulty is unchanged, only which creature fills that
// slot changes.
function remapSpawns(spawns, typeSwap) {
  if (!typeSwap || Object.keys(typeSwap).length === 0) return spawns;
  const out = {};
  for (const [type, count] of Object.entries(spawns)) {
    const mapped = typeSwap[type] || type;
    out[mapped] = (out[mapped] || 0) + count;
  }
  return out;
}

// Flat array (Stage 1 levels 0-9, Stage 2 levels 10-19, ...) so the existing
// level-index progression logic in main.js needs no changes — it just keeps
// counting up through a longer list. Use STAGE_SIZE to derive stage/level-
// in-stage for display (see ui/hud.js).
export const LEVELS = [];
for (let s = 0; s < STAGE_COUNT; s++) LEVELS.push(...buildStage(s));

// Weapons the player can buy with coins during play
// Buy-row items. Prices and strength come from CONFIG.helpers (config.js).
const HELPERS_CFG = CONFIG.helpers;
export const WEAPONS = {
  bomb:   { cost: HELPERS_CFG.bomb.cost,   get label() { return tr('d.unit.bomb'); }, power: HELPERS_CFG.bomb.power },
  angel:  { cost: HELPERS_CFG.angel.cost,  get label() { return tr('d.unit.angel'); } },
  shield: { cost: HELPERS_CFG.shield.cost, get label() { return tr('d.unit.shield'); }, duration: HELPERS_CFG.shield.duration },
  wall:   { cost: HELPERS_CFG.wall.cost,   get label() { return tr('d.unit.wall'); } },
  turret: { cost: HELPERS_CFG.turret.cost, get label() { return tr('d.unit.gun'); } },
};
