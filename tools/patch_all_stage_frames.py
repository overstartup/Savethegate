import re

with open('tools/make_enemy_frames.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Define the complete roster for all stages
NEW_ENEMIES = """ENEMIES = {
    # Stage 0: Castle & Dark Fields
    'goblin':     ('enemies/goblin.webp', 'front_walk', 1.0),
    'troll':      ('enemies/troll.webp', 'heavy_stomp', 1.0),
    'skeleton':   ('enemies/skeleton.webp', 'walk', 1.0),
    'slime':      ('enemies/slime.webp', 'front_bounce', 1.0),
    'ogreBoss':   ('enemies/ogreBoss.webp', 'titan_march', 0.8),
    'imp':        ('enemies/imp.webp', 'flap', 1.2),
    # Stage 1: Abyssal Rift
    'crab':       ('sea/crab.webp', 'front_walk', 1.0),
    'urchin':     ('sea/urchin.webp', 'bounce', 1.0),
    'pirate':     ('sea/pirate.webp', 'walk', 0.8),
    'jelly':      ('sea/jelly.webp', 'wave', 1.2),
    'kraken':     ('sea/kraken.webp', 'kraken_undulate', 1.0),
    'turtle':     ('sea/turtle.webp', 'turtle_walk', 1.0),
    'lanternfin': ('sea/lanternfin.webp', 'flap', 1.2),
    # Stage 2: Glacial Peak
    'frostling':   ('ice/frostling.webp', 'front_walk', 1.0),
    'snowblob':    ('ice/snowblob.webp', 'front_bounce', 1.0),
    'icebat':      ('ice/icebat.webp', 'front_bat_flap', 1.0),
    'wraith':      ('ice/wraith.webp', 'spectral_hover', 1.0),
    'yeti':        ('ice/yeti.webp', 'heavy_stomp', 1.0),
    'frostgiant':  ('ice/frostgiant.webp', 'titan_march', 1.0),
    # Stage 3: Oasis Citadel
    'scarab':      ('desert/scarab.webp', 'crawl', 1.0),
    'dustdevil':   ('desert/dustdevil.webp', 'vortex', 1.2),
    'vulture':     ('desert/vulture.webp', 'front_bat_flap', 1.1),
    'mummy':       ('desert/mummy.webp', 'front_walk', 0.85),
    'scorpion':    ('desert/scorpion.webp', 'crawl', 1.0),
    'sphinx':      ('desert/sphinx.webp', 'titan_march', 0.9),
    # Stage 4: Crystallized Forest
    'shardfox':    ('crystal/shardfox.webp', 'front_walk', 1.1),
    'mushling':    ('crystal/mushling.webp', 'front_bounce', 1.0),
    'moth':        ('crystal/moth.webp', 'front_bat_flap', 1.0),
    'treant':      ('crystal/treant.webp', 'walk', 0.9),
    'crystalgolem':('crystal/crystalgolem.webp', 'heavy_stomp', 1.0),
    'eldertreant': ('crystal/eldertreant.webp', 'titan_march', 0.8),
    # Stage 5: Draconic Peaks
    'kobold':      ('fire/kobold.webp', 'front_walk', 1.0),
    'magma':       ('fire/magma.webp', 'front_bounce', 1.1),
    'firebat':     ('fire/firebat.webp', 'front_bat_flap', 1.2),
    'emberknight': ('fire/emberknight.webp', 'walk', 0.9),
    'drake':       ('fire/drake.webp', 'heavy_stomp', 1.0),
    'dragon':      ('fire/dragon.webp', 'titan_march', 1.0),
    # Stage 6: Gilded Aviary
    'finch':       ('aviary/finch.webp', 'front_walk', 1.1),
    'chick':       ('aviary/chick.webp', 'bounce', 1.0),
    'toucan':      ('aviary/toucan.webp', 'front_bat_flap', 1.1),
    'owl':         ('aviary/owl.webp', 'front_bat_flap', 0.9),
    'griffin':     ('aviary/griffin.webp', 'heavy_stomp', 1.0),
    'phoenix':     ('aviary/phoenix.webp', 'front_bat_flap', 1.2),
    # Stage 7: Abyssal Forest
    'gloomling':   ('gloom/gloomling.webp', 'front_walk', 1.0),
    'wisp':        ('gloom/wisp.webp', 'spectral_hover', 1.2),
    'raven':       ('gloom/raven.webp', 'front_bat_flap', 1.0),
    'witch':       ('gloom/witch.webp', 'spectral_hover', 0.9),
    'bramble':     ('gloom/bramble.webp', 'heavy_stomp', 0.9),
    'shadowstag':  ('gloom/shadowstag.webp', 'titan_march', 1.0),
    # Stage 8: Aetherial Gardens
    'starsprite':  ('astral/starsprite.webp', 'spectral_hover', 1.1),
    'bloom':       ('astral/bloom.webp', 'bounce', 0.9),
    'seedling':    ('astral/seedling.webp', 'front_bounce', 1.0),
    'comet':       ('astral/comet.webp', 'front_bat_flap', 1.2),
    'astral':      ('astral/astral.webp', 'walk', 0.9),
    'moongolem':   ('astral/moongolem.webp', 'heavy_stomp', 1.0),
    'seraph':      ('astral/seraph.webp', 'titan_march', 1.0),
    # Stage 9: Clockwork City
    'cogbot':      ('clockwork/cogbot.webp', 'front_walk', 0.9),
    'gearball':    ('clockwork/gearball.webp', 'bounce', 1.0),
    'drone':       ('clockwork/drone.webp', 'spectral_hover', 1.2),
    'steamsoldier':('clockwork/steamsoldier.webp', 'walk', 0.9),
    'juggernaut':  ('clockwork/juggernaut.webp', 'heavy_stomp', 1.0),
    'chronos':     ('clockwork/chronos.webp', 'titan_march', 0.9),
    # Stage 10: Spectral Jungle
    'shroomkin':   ('jungle/shroomkin.webp', 'front_walk', 1.0),
    'sporeling':   ('jungle/sporeling.webp', 'front_bounce', 1.0),
    'glowmoth':    ('jungle/glowmoth.webp', 'front_bat_flap', 1.1),
    'tiki':        ('jungle/tiki.webp', 'walk', 0.9),
    'shroomgiant': ('jungle/shroomgiant.webp', 'heavy_stomp', 1.0),
    'serpent':     ('jungle/serpent.webp', 'kraken_undulate', 1.1),
    # Stage 11: Crown of the Mountain King
    'ram':         ('mountain/ram.webp', 'front_walk', 1.1),
    'boulder':     ('mountain/boulder.webp', 'bounce', 0.8),
    'pebble':      ('mountain/pebble.webp', 'front_bounce', 1.0),
    'eagle':       ('mountain/eagle.webp', 'front_bat_flap', 1.1),
    'guard':       ('mountain/guard.webp', 'walk', 0.9),
    'ogre':        ('mountain/ogre.webp', 'heavy_stomp', 1.0),
    'mountainking':('mountain/mountainking.webp', 'titan_march', 1.0),
    # Stage 12: The Deepwood
    'boar':        ('deepwood/boar.webp', 'front_walk', 1.2),
    'puff':        ('deepwood/puff.webp', 'front_bounce', 1.0),
    'spore':       ('deepwood/spore.webp', 'bounce', 1.0),
    'dragonfly':   ('deepwood/dragonfly.webp', 'front_bat_flap', 1.3),
    'bonecrawler': ('deepwood/bonecrawler.webp', 'crawl', 1.1),
    'mossbear':    ('deepwood/mossbear.webp', 'heavy_stomp', 1.0),
    'bonedragon':  ('deepwood/bonedragon.webp', 'titan_march', 1.1),
}"""

# Replace ENEMIES dict
code = re.sub(r'ENEMIES\s*=\s*\{[^}]+\}', NEW_ENEMIES, code)

# Add crawl & vortex displacements if not present
DISP_EXTRAS = '''
    if style == 'crawl':
        # Multilegged insect/arachnid scurry
        leg_l = np.clip((-nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.1) / 0.8, 0, 1) ** 1.2
        leg_r = np.clip((nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.1) / 0.8, 0, 1) ** 1.2
        p1 = np.sin(theta * 2.0)
        p2 = np.cos(theta * 2.0)
        dx += amp * 18.0 * (leg_l * p1 - leg_r * p1)
        dy += amp * 12.0 * (leg_l * p2 + leg_r * p2)
        # body scurry shudder
        dx += amp * 6.0 * np.sin(theta * 4.0)
        dy -= amp * 5.0 * np.abs(np.sin(theta * 2.0))
        return dx, dy
    if style == 'vortex':
        # Dustdevil spinning sand funnel
        spin = np.sin(theta * 3.0 + ny * 5.0)
        whip = np.cos(theta * 1.5 - ny * 3.0)
        funnel_width = np.clip((ny + 0.8) / 1.6, 0.2, 1.0)
        dx += amp * 28.0 * spin * funnel_width
        dy += amp * 14.0 * np.sin(theta * 2.0)
        return dx, dy
'''

if "style == 'crawl'" not in code:
    code = code.replace("if style == 'front_walk':", DISP_EXTRAS + "    if style == 'front_walk':", 1)

with open('tools/make_enemy_frames.py', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated make_enemy_frames.py with all 72 species for all stages!')

