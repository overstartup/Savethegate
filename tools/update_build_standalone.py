import os

build_path = 'game/build-standalone.mjs'
with open(build_path, 'r', encoding='utf-8') as f:
    src = f.read()

target = """let iceSpriteData = 'const ICE_SPRITE_DATA = {};\\n';
const iceNames = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
for (const n of iceNames) {
  const webp = readFileSync(`assets/sprites/ice/${n}.webp`);
  iceSpriteData += `ICE_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\\n`;
}
envData += iceSpriteData;"""

replacement = """let iceSpriteData = 'const ICE_SPRITE_DATA = {};\\n';
const iceNames = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
for (const n of iceNames) {
  const webp = readFileSync(`assets/sprites/ice/${n}.webp`);
  iceSpriteData += `ICE_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\\n`;
}
envData += iceSpriteData;

let allStageSpriteData = 'const ALL_STAGE_SPRITES_DATA = {};\\n';
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
      allStageSpriteData += `ALL_STAGE_SPRITES_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\\n`;
    } catch (e) {
      console.warn(`Could not read assets/sprites/${folder}/${n}.webp:`, e.message);
    }
  }
}
envData += allStageSpriteData;"""

if target in src:
    src = src.replace(target, replacement)
    code_target = ".replace('img.src = `assets/sprites/sea/${name}.webp`;', 'img.src = SEA_SPRITE_DATA[name];')"
    code_replacement = ".replace('img.src = `assets/sprites/sea/${name}.webp`;', 'img.src = SEA_SPRITE_DATA[name];')\n  .replace('img.src = `assets/sprites/${folder}/${name}.webp`;', 'if (typeof ALL_STAGE_SPRITES_DATA !== \"undefined\" && ALL_STAGE_SPRITES_DATA[name]) img.src = ALL_STAGE_SPRITES_DATA[name];')"
    src = src.replace(code_target, code_replacement)
    with open(build_path, 'w', encoding='utf-8') as f:
        f.write(src)
    print('Updated build-standalone.mjs successfully!')
else:
    print('Error: target not found in build-standalone.mjs')
