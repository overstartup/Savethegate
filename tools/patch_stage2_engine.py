import os

# 1. Patch screens.js
with open('game/src/ui/screens.js', 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "['goblin', 'troll', 'skeleton', 'slime', 'ogreBoss', 'crab', 'urchin', 'pirate', 'jelly', 'kraken', 'turtle', 'lanternfin']"
repl1 = "['goblin', 'troll', 'skeleton', 'slime', 'ogreBoss', 'crab', 'urchin', 'pirate', 'jelly', 'kraken', 'turtle', 'lanternfin', 'frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant']"
if target1 in text:
    text = text.replace(target1, repl1, 1)

if 'ICE_SPRITES' not in text:
    idx = text.find('function star(ctx')
    ice_block = """
export const ICE_SPRITE_NAMES = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
export const ICE_SPRITES = {};
for (const name of ICE_SPRITE_NAMES) {
  const img = new Image();
  ICE_SPRITES[name] = img;
  if (typeof SPECIES !== 'undefined' && SPECIES[name]) SPECIES[name].sprite = img;
  img.src = `assets/sprites/ice/${name}.webp`;
  img.onload = () => {
    ICE_SPRITES[name] = img;
    if (typeof SPECIES !== 'undefined' && SPECIES[name]) {
      SPECIES[name].sprite = img;
    }
  };
}
"""
    text = text[:idx] + ice_block + text[idx:]

with open('game/src/ui/screens.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('screens.js patched!')

# 2. Patch creatures.js
with open('game/src/render/creatures.js', 'r', encoding='utf-8') as f:
    text = f.read()

target_sea = "const seaSprite = (typeof SEA_SPRITES !== 'undefined' && m.skin && SEA_SPRITES[m.skin]) || (sp && sp.sprite);"
repl_ice = """const seaSprite = (typeof SEA_SPRITES !== 'undefined' && m.skin && SEA_SPRITES[m.skin]) || (sp && sp.sprite);
  const iceSprite = (typeof ICE_SPRITES !== 'undefined' && m.skin && ICE_SPRITES[m.skin]);"""

if target_sea in text and 'iceSprite' not in text:
    text = text.replace(target_sea, repl_ice, 1)

target_sprite_img = "const spriteImg = m.frameImg || (seaSprite && (seaSprite.naturalWidth || seaSprite.width) ? seaSprite : null) || (enemyImg && (enemyImg.naturalWidth || enemyImg.width) ? enemyImg : null) || (sp && sp.sprite && sp.sprite.width ? sp.sprite : null);"
repl_sprite_img = "const spriteImg = m.frameImg || (seaSprite && (seaSprite.naturalWidth || seaSprite.width) ? seaSprite : null) || (iceSprite && (iceSprite.naturalWidth || iceSprite.width) ? iceSprite : null) || (enemyImg && (enemyImg.naturalWidth || enemyImg.width) ? enemyImg : null) || (sp && sp.sprite && sp.sprite.width ? sp.sprite : null);"

if target_sprite_img in text:
    text = text.replace(target_sprite_img, repl_sprite_img, 1)

# mult for frostgiant: let's give frostgiant boss a majestic scale (e.g. 2.0)
target_mult = "const mult = (m.boss && m.skin === 'kraken') ? 1.85 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3)));"
repl_mult = "const mult = (m.boss && m.skin === 'kraken') ? 1.85 : (m.boss && m.skin === 'frostgiant') ? 2.1 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3)));"

if target_mult in text:
    text = text.replace(target_mult, repl_mult, 1)

with open('game/src/render/creatures.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('creatures.js patched!')

# 3. Patch build-standalone.mjs
with open('game/build-standalone.mjs', 'r', encoding='utf-8') as f:
    text = f.read()

target_anim_loop = "for (const n of ['goblin', 'troll', 'skeleton', 'slime', 'ogreBoss', 'crab', 'urchin', 'pirate', 'jelly', 'kraken', 'turtle', 'lanternfin']) {"
repl_anim_loop = "for (const n of ['goblin', 'troll', 'skeleton', 'slime', 'ogreBoss', 'crab', 'urchin', 'pirate', 'jelly', 'kraken', 'turtle', 'lanternfin', 'frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant']) {"

if target_anim_loop in text:
    text = text.replace(target_anim_loop, repl_anim_loop, 1)

target_sea_data = "envData += seaSpriteData;\n"
ice_data_block = """envData += seaSpriteData;

let iceSpriteData = 'const ICE_SPRITE_DATA = {};\\n';
const iceNames = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
for (const n of iceNames) {
  const webp = readFileSync(`assets/sprites/ice/${n}.webp`);
  iceSpriteData += `ICE_SPRITE_DATA[${JSON.stringify(n)}] = "data:image/webp;base64,${webp.toString('base64')}";\\n`;
}
envData += iceSpriteData;
"""

if target_sea_data in text and 'iceSpriteData' not in text:
    text = text.replace(target_sea_data, ice_data_block, 1)

target_replace = ".replace('img.src = `assets/sprites/sea/${name}.webp`;', 'img.src = SEA_SPRITE_DATA[name];')"
repl_replace = """.replace('img.src = `assets/sprites/sea/${name}.webp`;', 'img.src = SEA_SPRITE_DATA[name];')
  .replace('img.src = `assets/sprites/ice/${name}.webp`;', 'img.src = ICE_SPRITE_DATA[name];')"""

if target_replace in text and 'assets/sprites/ice/' not in text:
    text = text.replace(target_replace, repl_replace, 1)

with open('game/build-standalone.mjs', 'w', encoding='utf-8') as f:
    f.write(text)
print('build-standalone.mjs patched!')

