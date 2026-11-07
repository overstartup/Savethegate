// Builds play.html â€” a single self-contained file that runs by double-click (file://).
import { readFileSync, writeFileSync } from 'fs';

const ORDER = [
  'src/config.js', 'src/lang/common.js', 'src/lang/menus.js', 'src/lang/pages.js', 'src/lang/game.js', 'src/lang/data.js',
  'src/lang/bosses.js', 'src/lang/stagefx.js', 'src/lang/tutorial.js', 'src/lang/armory2.js', 'src/lang/stars.js', 'src/lang/challenge.js', 'src/i18n.js',
  'src/data/monsters.js', 'src/data/waves.js', 'src/data/levels.js', 'src/data/shop.js', 'src/data/upgrades.js', 'src/data/save.js',
  'src/input.js', 'src/entities/player.js', 'src/entities/spell.js',
  'src/entities/monster.js', 'src/entities/obstacle.js', 'src/entities/gate.js', 'src/entities/angel.js',
  'src/entities/enemyBullet.js', 'src/entities/ship.js',
  'src/entities/wall.js', 'src/entities/turret.js',
  'src/systems/flocks.js', 'src/systems/bosses.js', 'src/systems/spawner.js', 'src/systems/abilities.js', 'src/systems/collision.js', 'src/systems/particles.js',
  'src/render/creatures.js', 'src/render/species.js', 'src/render/species_A.js', 'src/render/species_B.js', 'src/render/species_C.js', 'src/render/species_D.js', 'src/render/scenery.js', 'src/render/stageset.js', 'src/render/gate.js', 'src/render/hero.js', 'src/render/gun.js', 'src/render/units.js', 'src/render/atmosphere.js', 'src/systems/runUpgrades.js', 'src/systems/stagefx.js',
  'src/systems/audio.js', 'src/systems/ads.js', 'src/systems/iap.js', 'src/systems/backend.js', 'src/systems/rewards.js', 'src/systems/challenge.js',
  'src/ui/coinFx.js', 'src/ui/hud.js', 'src/ui/levelStars.js', 'src/ui/screens.js', 'src/ui/challengeUi.js', 'src/ui/announce.js', 'src/systems/tutorial.js', 'src/main.js',
];

const seen = new Set();
let code = '';
for (const f of ORDER) {
  let src = readFileSync(f, 'utf8')
    .split('\n')
    .filter(l => !l.trim().startsWith('import '))
    .map(l => l.replace(/^export /, ''))
    // dedupe identical top-level helper lines (e.g. const rand = ...)
    .filter(l => {
      const t = l.trim();
      if (/^const (rand|pick) = /.test(t)) {
        if (seen.has(t)) return false;
        seen.add(t);
      }
      return true;
    })
    .join('\n');
  code += `\n// ===== ${f} =====\n${src}\n`;
}

// (The old SVG sprites and 21 gunner frames are no longer used â€” enemies
// and the hero are drawn procedurally â€” so nothing is inlined for them.)
let spriteData = '';

// Inline per-theme environment art (tall background photos for live
// gameplay, plus the single continuous world-map image for the road map)
// as data URIs.
// Must match ENV_THEMES in src/ui/screens.js exactly (index-matched to
// STAGE_THEMES in src/data/levels.js) â€” this list used to be a separate
// hardcoded 6-entry array here that silently fell out of sync with the
// real 12-stage list, baking in stale/undefined tile art. Read it straight
// out of screens.js instead so the two can never drift apart again.
const screensSrc = readFileSync('src/ui/screens.js', 'utf8');
const envThemesMatch = screensSrc.match(/const ENV_THEMES = \[([\s\S]*?)\];/);
const envThemes = envThemesMatch[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
console.log('envThemes for build:', envThemes);
let envData = 'const BG_DATA = [];\n';
envThemes.forEach((n, i) => {
  try {
    const jpg = readFileSync(`assets/env/bg_${n}.jpg`);
    envData += `BG_DATA[${i}] = "data:image/jpeg;base64,${jpg.toString('base64')}";\n`;
  } catch { /* no bg photo for this theme yet â€” runtime falls back to sky gradient */ }
});
envData += 'const TILE_DATA = [];\n';
envThemes.forEach((n, i) => {
  // WebP (~20 KB each, with alpha) - the full-colour PNGs are ~150 KB
  const webp = readFileSync(`assets/env/island_road_${n}.webp`);
  envData += `TILE_DATA[${i}] = "data:image/webp;base64,${webp.toString('base64')}";\n`;
});
// Inline the real Kenney "Fish Pack 2.0" sprites used to animate the Sea
// War background (bubbles, seaweed, fish).
const kenneySeaNames = [
  'bubble_a', 'bubble_b', 'bubble_c',
  'seaweed_green_a', 'seaweed_green_c', 'seaweed_orange_a', 'seaweed_pink_b', 'seaweed_grass_a',
  'fish_blue', 'fish_orange', 'fish_pink',
];
let kenneyData = 'const KENNEY_SEA_DATA = {\n';
for (const n of kenneySeaNames) {
  const png = readFileSync(`assets/env/kenney_sea/${n}.png`);
  kenneyData += `  ${JSON.stringify(n)}: "data:image/png;base64,${png.toString('base64')}",\n`;
}
kenneyData += '};\n';
envData += kenneyData;

// Inline the real Kenney "Pirate Kit" renders used for the Sea War ships
// and hilltop scenery (palm trees, rocks, flag).
const kenneyPirateNames = [
  'ship-pirate-medium', 'ship-pirate-small', 'ship-medium',
  'rocks-a', 'rocks-sand-a', 'palm-detailed-bend', 'flag-pirate-high', 'barrel', 'crate',
];
let kenneyPirateData = 'const KENNEY_PIRATE_DATA = {\n';
for (const n of kenneyPirateNames) {
  const png = readFileSync(`assets/env/kenney_pirate/${n}.png`);
  kenneyPirateData += `  ${JSON.stringify(n)}: "data:image/png;base64,${png.toString('base64')}",\n`;
}
kenneyPirateData += '};\n';
envData += kenneyPirateData;

// Inline the real Kenney "Castle Kit" renders used as Castle-stage landmarks
// (towers, walls, gate, flags, siege equipment) and the stage-tile prop art.
const kenneyCastleNames = [
  'tower-square', 'tower-square-roof', 'tower-square-top-roof',
  'wall-corner-half-tower', 'wall-corner-half', 'gate', 'metal-gate',
  'flag-banner-long', 'flag', 'flag-pennant',
  'rocks-large', 'siege-catapult', 'siege-ballista',
];
let kenneyCastleData = 'const KENNEY_CASTLE_DATA = {\n';
for (const n of kenneyCastleNames) {
  const png = readFileSync(`assets/env/kenney_castle/${n}.png`);
  kenneyCastleData += `  ${JSON.stringify(n)}: "data:image/png;base64,${png.toString('base64')}",\n`;
}
kenneyCastleData += '};\n';
envData += kenneyCastleData;

// Inline the real low-poly desert plant renders (CraftPix, free license â€”
// original 3D FBX models rendered to flat-shaded 2D PNGs) used as Desert
// Storm gameplay-background scenery.
const desertPlantNames = [
  'saguaro', 'prickly_pear', 'barrel_twin', 'spiny_barrel', 'thorn_column', 'tumbleweed', 'blossom_cactus',
];
let desertPlantData = 'const DESERT_PLANTS_DATA = {\n';
for (const n of desertPlantNames) {
  const png = readFileSync(`assets/env/desert_plants/${n}.png`);
  desertPlantData += `  ${JSON.stringify(n)}: "data:image/png;base64,${png.toString('base64')}",\n`;
}
desertPlantData += '};\n';
envData += desertPlantData;

// Inline the user-supplied AI-generated ice/glacial art (own generation, no
// copyright concerns) used as Glacial Peak (Stage 1) gameplay-background
// scenery â€” trees, crystal clusters, an ice golem, and ice walls/gate.
const iceGlacialNames = [
  'dead_tree', 'pine_tree', 'ice_bush', 'ice_golem',
  'ice_wall', 'ice_wall_crystal1', 'ice_wall_crystal2', 'ice_gate',
  'ice_rocks_small', 'ice_rocks_large',
  'crystal_small', 'crystal_medium', 'crystal_large',
];
let iceGlacialData = 'const ICE_GLACIAL_DATA = {\n';
for (const n of iceGlacialNames) {
  const png = readFileSync(`assets/env/ice_glacial/${n}.png`);
  iceGlacialData += `  ${JSON.stringify(n)}: "data:image/png;base64,${png.toString('base64')}",\n`;
}
iceGlacialData += '};\n';
envData += iceGlacialData;

// Inline the user-supplied AI-generated flying-bat wing-flap frames (own
// generation, no copyright concerns) used to animate the "imp" enemy.
const BAT_FRAME_COUNT = 10;
let batData = 'const BAT_DATA = [];\n';
for (let i = 0; i < BAT_FRAME_COUNT; i++) {
  const name = `bat_${String(i).padStart(2, '0')}`;
  const png = readFileSync(`assets/sprites/bat_ice/${name}.png`);
  batData += `BAT_DATA[${i}] = "data:image/png;base64,${png.toString('base64')}";\n`;
}
envData += batData;

let enemySpriteData = 'const ENEMY_SPRITE_DATA = {};\n';
const enemyNames = ['goblin', 'slime', 'imp', 'skeleton', 'troll', 'ogreBoss'];
for (const n of enemyNames) {
  const webp = readFileSync(`assets/sprites/enemies/${n}.webp`);
  enemySpriteData += `ENEMY_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\n`;
}
envData += enemySpriteData;

let seaSpriteData = 'const SEA_SPRITE_DATA = {};\n';
const seaNames = ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'];
for (const n of seaNames) {
  const webp = readFileSync(`assets/sprites/sea/${n}.webp`);
  seaSpriteData += `SEA_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\n`;
}
envData += seaSpriteData;

let iceSpriteData = 'const ICE_SPRITE_DATA = {};\n';
const iceNames = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
for (const n of iceNames) {
  const webp = readFileSync(`assets/sprites/ice/${n}.webp`);
  iceSpriteData += `ICE_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\n`;
}
envData += iceSpriteData;

let allStageSpriteData = 'const ALL_STAGE_SPRITES_DATA = {};\n';
const stageSpriteDirs = {
  sea: ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'],
  ice: ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'],
  desert: ['scarab', 'dustdevil', 'vulture', 'mummy', 'scorpion', 'sphinx'],
  crystal: ['shardfox', 'mushling', 'moth', 'treant', 'crystalgolem', 'eldertreant'],
  fire: ['kobold', 'magma', 'firebat', 'emberknight', 'drake', 'dragon'],
  aviary: ['finch', 'chick', 'toucan', 'owl', 'griffin', 'phoenix'],
  gloom: ['gloomling', 'wisp', 'raven', 'witch', 'bramble', 'shadowstag'],
  astral: ['starsprite', 'bloom', 'seedling', 'comet', 'astral', 'moongolem', 'seraph'],
  clockwork: ['cogbot', 'gearball', 'drone', 'steamsoldier', 'juggernaut', 'chronos'],
  jungle: ['shroomkin', 'sporeling', 'glowmoth', 'tiki', 'shroomgiant', 'serpent'],
  mountain: ['ram', 'boulder', 'pebble', 'eagle', 'guard', 'ogre', 'mountainking'],
  deepwood: ['boar', 'puff', 'spore', 'dragonfly', 'bonecrawler', 'mossbear', 'bonedragon'],
  enemies: ['goblin', 'slime', 'imp', 'skeleton', 'troll', 'ogreBoss'],
};
for (const [folder, names] of Object.entries(stageSpriteDirs)) {
  for (const n of names) {
    try {
      const webp = readFileSync(`assets/sprites/${folder}/${n}.webp`);
      allStageSpriteData += `ALL_STAGE_SPRITES_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\n`;
    } catch (e) {
      console.warn(`Could not read assets/sprites/${folder}/${n}.webp:`, e.message);
    }
  }
}
envData += allStageSpriteData;

// Baked enemy movement frames (tools/make_enemy_frames.py + normalize_anim_frames.py):
// 16 frames for the sets in SIXTEEN, otherwise 8. Must match src/ui/screens.js.
const SIXTEEN = new Set(["crab", "jelly", "urchin", "lanternfin", "pirate", "turtle", "kraken", "yeti", "snowblob", "frostling", "wraith", "frostgiant", "icebat"]);
let animData = 'const ANIM_DATA = {};\n';
for (const n of ["goblin", "troll", "skeleton", "slime", "ogreBoss", "imp", "crab", "urchin", "pirate", "jelly", "kraken", "turtle", "lanternfin", "frostling", "snowblob", "icebat", "wraith", "yeti", "frostgiant", "scarab", "dustdevil", "vulture", "mummy", "scorpion", "sphinx", "shardfox", "mushling", "moth", "treant", "crystalgolem", "eldertreant", "kobold", "magma", "firebat", "emberknight", "drake", "dragon", "finch", "chick", "toucan", "owl", "griffin", "phoenix", "gloomling", "wisp", "raven", "witch", "bramble", "shadowstag", "starsprite", "bloom", "seedling", "comet", "astral", "moongolem", "seraph", "cogbot", "gearball", "drone", "steamsoldier", "juggernaut", "chronos", "shroomkin", "sporeling", "glowmoth", "tiki", "shroomgiant", "serpent", "ram", "boulder", "pebble", "eagle", "guard", "ogre", "mountainking", "boar", "puff", "spore", "dragonfly", "bonecrawler", "mossbear", "bonedragon"]) {
  const frames = [];
  const count = SIXTEEN.has(n) ? 16 : 8;
  for (let i = 0; i < count; i++) {
    const webp = readFileSync(`assets/sprites/anim/${n}_${i}.webp`);
    frames.push(`"data:image/webp;base64,${webp.toString('base64')}"`);
  }
  animData += `ANIM_DATA[${JSON.stringify(n)}] = [${frames.join(',')}];
`;
}
envData += animData;

spriteData += envData;
code = code
  .replace('bgImg.src = `assets/env/bg_${n}.jpg`;', 'if (BG_DATA[i]) bgImg.src = BG_DATA[i];')
  .replace('tileImg.src = `assets/env/island_road_${n}.webp`;', 'tileImg.src = TILE_DATA[i];')
  .replace('img.src = `assets/env/kenney_sea/${n}.png`;', 'img.src = KENNEY_SEA_DATA[n];')
  .replace('img.src = `assets/env/kenney_pirate/${n}.png`;', 'img.src = KENNEY_PIRATE_DATA[n];')
  .replace('img.src = `assets/env/kenney_castle/${n}.png`;', 'img.src = KENNEY_CASTLE_DATA[n];')
  .replace('img.src = `assets/env/desert_plants/${n}.png`;', 'img.src = DESERT_PLANTS_DATA[n];')
  .replace('img.src = `assets/env/ice_glacial/${n}.png`;', 'img.src = ICE_GLACIAL_DATA[n];')
  .replace('img.src = `assets/sprites/bat_ice/bat_${String(i).padStart(2, \'0\')}.png`;', 'img.src = BAT_DATA[i];')
  .replace('img.src = `assets/sprites/enemies/${name}.webp`;', 'img.src = ENEMY_SPRITE_DATA[name];')
  .replace('img.src = `assets/sprites/sea/${name}.webp`;', 'img.src = SEA_SPRITE_DATA[name];')
  .replace('img.src = `assets/sprites/${folder}/${name}.webp`;', 'if (typeof ALL_STAGE_SPRITES_DATA !== "undefined" && ALL_STAGE_SPRITES_DATA[name]) img.src = ALL_STAGE_SPRITES_DATA[name];')
  .replace('img.src = `assets/sprites/anim/${name}_${i}.webp`;', 'img.src = ANIM_DATA[name][i];');

// Inline the home-page shield emblem (src/ui/screens.js).
const emblemUri = `data:image/png;base64,${readFileSync('assets/ui/emblem.png').toString('base64')}`;
if (!code.includes("img.src = 'assets/ui/emblem.png';")) throw new Error('emblem src line not found in screens.js');
code = code.replace("img.src = 'assets/ui/emblem.png';", `img.src = ${JSON.stringify(emblemUri)};`);

// Inline fonts as data URIs
const fonts = {
  "assets/fonts/luckiest-guy.woff2": null,
  "assets/fonts/fredoka.woff2": null,
  "assets/fonts/noto-sans-arabic.woff2": null,
};
let fontCss = '';
for (const f in fonts) {
  fonts[f] = `data:font/woff2;base64,${readFileSync(f).toString('base64')}`;
}

// Inline favicon as a data URI so the standalone play.html has an icon in the browser tab
const faviconPng = readFileSync('favicon.png');
const faviconDataUri = `data:image/png;base64,${faviconPng.toString('base64')}`;

const html = readFileSync('index-dev.html', 'utf8')
  .replace("url('assets/fonts/luckiest-guy.woff2')", `url('${fonts["assets/fonts/luckiest-guy.woff2"]}')`)
  .replace("url('assets/fonts/fredoka.woff2')", `url('${fonts["assets/fonts/fredoka.woff2"]}')`)
  .replace("url('assets/fonts/noto-sans-arabic.woff2')", `url('${fonts["assets/fonts/noto-sans-arabic.woff2"]}')`)
  .replace('href="favicon.png"', `href="${faviconDataUri}"`)
  .replace('src="assets/ui/emblem.png"', `src="${emblemUri}"`)
  .replace('<script type="module" src="src/main.js"></script>',
           `<script>\n"use strict";\n${spriteData}${code}\n</script>`);
writeFileSync('play.html', html); writeFileSync('index.html', html);
console.log('Built play.html,', html.length, 'bytes');
