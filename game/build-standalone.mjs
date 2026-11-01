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

spriteData += envData;
code = code
  .replace('bgImg.src = `assets/env/bg_${n}.jpg`;', 'if (BG_DATA[i]) bgImg.src = BG_DATA[i];')
  .replace('tileImg.src = `assets/env/island_road_${n}.webp`;', 'tileImg.src = TILE_DATA[i];')
  .replace('img.src = `assets/env/kenney_sea/${n}.png`;', 'img.src = KENNEY_SEA_DATA[n];')
  .replace('img.src = `assets/env/kenney_pirate/${n}.png`;', 'img.src = KENNEY_PIRATE_DATA[n];')
  .replace('img.src = `assets/env/kenney_castle/${n}.png`;', 'img.src = KENNEY_CASTLE_DATA[n];')
  .replace('img.src = `assets/env/desert_plants/${n}.png`;', 'img.src = DESERT_PLANTS_DATA[n];')
  .replace('img.src = `assets/env/ice_glacial/${n}.png`;', 'img.src = ICE_GLACIAL_DATA[n];')
  .replace('img.src = `assets/sprites/bat_ice/bat_${String(i).padStart(2, \'0\')}.png`;', 'img.src = BAT_DATA[i];');

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
