import re

ALL_ENEMIES = [
    'goblin', 'troll', 'skeleton', 'slime', 'ogreBoss', 'imp',
    'crab', 'urchin', 'pirate', 'jelly', 'kraken', 'turtle', 'lanternfin',
    'frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant',
    'scarab', 'dustdevil', 'vulture', 'mummy', 'scorpion', 'sphinx',
    'shardfox', 'mushling', 'moth', 'treant', 'crystalgolem', 'eldertreant',
    'kobold', 'magma', 'firebat', 'emberknight', 'drake', 'dragon',
    'finch', 'chick', 'toucan', 'owl', 'griffin', 'phoenix',
    'gloomling', 'wisp', 'raven', 'witch', 'bramble', 'shadowstag',
    'starsprite', 'bloom', 'seedling', 'comet', 'astral', 'moongolem', 'seraph',
    'cogbot', 'gearball', 'drone', 'steamsoldier', 'juggernaut', 'chronos',
    'shroomkin', 'sporeling', 'glowmoth', 'tiki', 'shroomgiant', 'serpent',
    'ram', 'boulder', 'pebble', 'eagle', 'guard', 'ogre', 'mountainking',
    'boar', 'puff', 'spore', 'dragonfly', 'bonecrawler', 'mossbear', 'bonedragon'
]

enemies_json = ', '.join(f"'{name}'" for name in ALL_ENEMIES)

# 1. Patch screens.js
with open('game/src/ui/screens.js', 'r', encoding='utf-8') as f:
    screens_code = f.read()

anim_target = re.search(r'export const ANIM_FRAMES = \{\};\s*for \(const name of \[[^\]]+\]\)', screens_code)
if anim_target:
    screens_code = screens_code[:anim_target.start()] + f"export const ANIM_FRAMES = {{}};\nfor (const name of [{enemies_json}])" + screens_code[anim_target.end():]
    with open('game/src/ui/screens.js', 'w', encoding='utf-8') as f:
        f.write(screens_code)
    print("screens.js patched successfully!")
else:
    print("Could not find ANIM_FRAMES target in screens.js")

# 2. Patch build-standalone.mjs
with open('game/build-standalone.mjs', 'r', encoding='utf-8') as f:
    build_code = f.read()

build_target = re.search(r'for \(const n of \[[^\]]+\]\)\s*\{\s*const frames = \[\];', build_code)
if build_target:
    build_code = build_code[:build_target.start()] + f"for (const n of [{enemies_json}]) {{\n  const frames = [];" + build_code[build_target.end():]
    with open('game/build-standalone.mjs', 'w', encoding='utf-8') as f:
        f.write(build_code)
    print("build-standalone.mjs patched successfully!")
else:
    print("Could not find build-standalone anim target")

