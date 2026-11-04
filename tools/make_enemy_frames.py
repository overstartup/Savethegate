"""Bake looping movement frames for each enemy from its existing sprite.

Each frame warps the painted pixels: flyers flap their outer parts, swimmers
undulate their trailing parts, walkers bob and swing their lower limbs. The
warp is a sinusoid over one loop, so frame N-1 flows into frame 0 seamlessly.

Output: game/assets/sprites/anim/<name>_<i>.webp  (i = 0..FRAMES-1)
Run:    python tools/make_enemy_frames.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'game', 'assets', 'sprites')
OUT = os.path.join(SRC, 'anim')
FRAMES = 8
PAD = 16  # transparent margin so displaced pixels are not cut off

# name -> (source file, motion style, amplitude scale)
ENEMIES = {
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
}


def bilinear(img, sx, sy):
    h, w = img.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = np.floor(sx).astype(int); y0 = np.floor(sy).astype(int)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]
    c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def displacement_kraken(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = xx - PAD
    sy = yy - PAD

    def make_mask(cx, cy, rx, ry):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.5, 0.0, 1.0)
        return 0.5 - 0.5 * np.cos(mask * np.pi)

    # Anatomical masks for the Kraken:
    m_up_left = make_mask(75, 110, 70, 85)         # Left Upper Raised Tentacle
    m_up_right = make_mask(390, 110, 70, 85)       # Right Upper Raised Tentacle
    m_low_left_outer = make_mask(60, 220, 68, 75)  # Left Lower Outer Tentacle
    m_low_left_inner = make_mask(160, 240, 58, 65) # Left Lower Inner Tentacle
    m_low_right_outer = make_mask(405, 220, 68, 75)# Right Lower Outer Tentacle
    m_low_right_inner = make_mask(305, 240, 58, 65)# Right Lower Inner Tentacle
    m_center_low = make_mask(232, 245, 52, 58)     # Center Lower Tentacles
    m_head = make_mask(232, 95, 78, 85)            # Crowned Mantle / Head

    # 1. Left Upper Tentacle: coiling clutch inward/outward
    dx_up_left = np.sin(theta) * 15.0
    dy_up_left = -np.cos(theta) * 12.0

    # 2. Right Upper Tentacle (asymmetric clutch):
    dx_up_right = -np.sin(theta + 2.5) * 15.0
    dy_up_right = -np.cos(theta + 2.5) * 12.0

    # 3 & 4. Left Lower Tentacles: muscular travelling propulsion wave
    wave_L1 = theta + 1.2
    dx_low_left_outer = np.sin(wave_L1) * 13.0
    dy_low_left_outer = -np.cos(wave_L1) * 13.0

    wave_L2 = theta + 2.4
    dx_low_left_inner = np.sin(wave_L2) * 10.0
    dy_low_left_inner = -np.cos(wave_L2) * 11.0

    # 5 & 6. Right Lower Tentacles:
    wave_R1 = theta + 3.8
    dx_low_right_outer = np.sin(wave_R1) * 13.0
    dy_low_right_outer = -np.cos(wave_R1) * 13.0

    wave_R2 = theta + 5.0
    dx_low_right_inner = np.sin(wave_R2) * 10.0
    dy_low_right_inner = -np.cos(wave_R2) * 11.0

    # 7. Center Lower Tentacles:
    dx_center = np.sin(theta * 2.0) * 4.5
    dy_center = np.cos(theta * 2.0) * 7.0

    # 8. Head: majestic breathing hover
    dy_head = -np.sin(theta) * 4.0
    dx_head = np.cos(theta * 0.5) * 2.0

    total_w = (
        m_up_left + m_up_right +
        m_low_left_outer + m_low_left_inner +
        m_low_right_outer + m_low_right_inner +
        m_center_low + m_head + 1e-5
    )

    tdx = (
        m_up_left * dx_up_left +
        m_up_right * dx_up_right +
        m_low_left_outer * dx_low_left_outer +
        m_low_left_inner * dx_low_left_inner +
        m_low_right_outer * dx_low_right_outer +
        m_low_right_inner * dx_low_right_inner +
        m_center_low * dx_center +
        m_head * dx_head
    ) / np.maximum(1.0, total_w)

    tdy = (
        m_up_left * dy_up_left +
        m_up_right * dy_up_right +
        m_low_left_outer * dy_low_left_outer +
        m_low_left_inner * dy_low_left_inner +
        m_low_right_outer * dy_low_right_outer +
        m_low_right_inner * dy_low_right_inner +
        m_center_low * dy_center +
        m_head * dy_head
    ) / np.maximum(1.0, total_w)

    return tdx, tdy


def displacement_turtle_walk(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = xx - PAD
    sy = yy - PAD

    def make_mask(cx, cy, rx, ry, y_min=0):
        d = np.sqrt(((sx - cx) / rx) ** 2 + ((sy - cy) / ry) ** 2)
        mask = np.clip((1.2 - d) / 0.45, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(mask * np.pi)
        if y_min > 0:
            top_fade = np.clip((sy - y_min) / 20.0, 0.0, 1.0)
            mask *= top_fade
        return mask

    m_leg1 = make_mask(55, 220, 48, 52, y_min=165)
    m_leg2 = make_mask(125, 240, 52, 68, y_min=170)
    m_leg3 = make_mask(215, 225, 42, 52, y_min=170)
    m_leg4 = make_mask(335, 235, 55, 62, y_min=160)
    m_head = make_mask(320, 160, 55, 42, y_min=110)
    m_body = make_mask(180, 110, 130, 85)

    j_y1, f_y1 = 175.0, 255.0
    j_y2, f_y2 = 185.0, 294.0
    j_y3, f_y3 = 180.0, 265.0
    j_y4, f_y4 = 175.0, 280.0

    grad1 = np.clip((sy - j_y1) / (f_y1 - j_y1), 0.0, 1.0) ** 1.3
    grad2 = np.clip((sy - j_y2) / (f_y2 - j_y2), 0.0, 1.0) ** 1.3
    grad3 = np.clip((sy - j_y3) / (f_y3 - j_y3), 0.0, 1.0) ** 1.3
    grad4 = np.clip((sy - j_y4) / (f_y4 - j_y4), 0.0, 1.0) ** 1.3

    reach_front = 18.0
    reach_rear = 14.0
    lift_front = 18.0
    lift_rear = 13.0
    body_bob = 3.5

    phase_A = theta % (2.0 * np.pi)
    phase_B = (theta + np.pi) % (2.0 * np.pi)

    def foot_disp(phase, reach, lift):
        dx = -reach * np.cos(phase)
        if phase < np.pi:
            dy = -lift * np.sin(phase)
        else:
            dy = 0.0
        return dx, dy

    dx2_f, dy2_f = foot_disp(phase_A, reach_front, lift_front)
    dx3_f, dy3_f = foot_disp(phase_A, reach_rear, lift_rear)
    dx4_f, dy4_f = foot_disp(phase_B, reach_front, lift_front)
    dx1_f, dy1_f = foot_disp(phase_B, reach_rear, lift_rear)

    dx1 = grad1 * dx1_f; dy1 = grad1 * dy1_f
    dx2 = grad2 * dx2_f; dy2 = grad2 * dy2_f
    dx3 = grad3 * dx3_f; dy3 = grad3 * dy3_f
    dx4 = grad4 * dx4_f; dy4 = grad4 * dy4_f

    body_dy = -np.abs(np.sin(theta * 2.0)) * body_bob
    body_dx = np.sin(theta) * 2.5
    head_dx = body_dx + np.cos(theta * 2.0) * 3.5
    head_dy = body_dy + np.sin(theta * 2.0) * 2.0

    w1 = m_leg1; w2 = m_leg2; w3 = m_leg3; w4 = m_leg4
    wh = m_head; wb = m_body
    total_w = w1 + w2 + w3 + w4 + wh + wb + 1e-5

    tdx = (w1 * dx1 + w2 * dx2 + w3 * dx3 + w4 * dx4 + wh * head_dx + wb * body_dx) / np.maximum(1.0, total_w)
    tdy = (w1 * dy1 + w2 * dy2 + w3 * dy3 + w4 * dy4 + wh * head_dy + wb * body_dy) / np.maximum(1.0, total_w)

    return tdx, tdy


def displacement(style, amp, w, h, theta, seed):
    if style == 'turtle_walk':
        return displacement_turtle_walk(w, h, theta)
    if style == 'kraken_undulate':
        return displacement_kraken(w, h, theta)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)          # -1 .. 1 across the sprite
    ny = (yy - cy) / (h / 2)          # -1 (top) .. 1 (bottom)
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    s = seed * 0.9

    
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
    if style == 'front_walk':
        # 1. Legs alternating stride
        leg_l = np.clip((-nx - 0.04) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.75, 0, 1) ** 1.2
        leg_r = np.clip((nx - 0.04) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.75, 0, 1) ** 1.2
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.3
        lift_r = np.maximum(0, np.sin(theta)) ** 1.3
        dy -= amp * 26.0 * (leg_l * lift_l + leg_r * lift_r)
        dx += amp * 12.0 * (leg_l * np.cos(theta) - leg_r * np.cos(theta))
        
        # 2. Body run bounce & torso lean
        dy -= amp * 14.0 * np.abs(np.sin(theta))
        dx += amp * 8.0 * np.sin(theta)
        
        # 3. Dagger arms dynamic thrusts
        arm_l = np.clip((-nx - 0.15) / 0.5, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        arm_r = np.clip((nx - 0.15) / 0.5, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        dy += amp * 16.0 * np.cos(theta) * arm_l - amp * 16.0 * np.cos(theta) * arm_r
        dx += amp * 10.0 * np.sin(theta) * (arm_l + arm_r)
        return dx, dy
    if style == 'front_bounce':
        lift = np.sin(theta)**2
        squash = np.cos(theta * 2)
        dy_jump = -amp * 36.0 * lift
        dy += dy_jump + amp * 26.0 * squash * ny
        dx -= amp * 24.0 * squash * nx
        base_mask = np.clip((ny - 0.2) / 0.8, 0, 1) ** 1.4
        dx -= amp * 16.0 * np.maximum(0, squash) * nx * base_mask
        shard_mask = np.clip((0.2 - ny) / 0.8, 0, 1)
        dx += amp * 12.0 * np.sin(theta * 2 - 0.6) * shard_mask
        return dx, dy
    if style == 'front_bat_flap':
        wx = np.clip((np.abs(nx) - 0.22) / 0.78, 0, 1) ** 1.2
        flap = np.sin(theta)
        dy += amp * 48.0 * flap * wx
        dx -= amp * 18.0 * flap * wx * np.sign(nx)
        tip_mask = np.clip((np.abs(nx) - 0.65) / 0.35, 0, 1)
        dy += amp * 16.0 * np.sin(theta + 0.4) * tip_mask
        body_mask = 1.0 - wx
        dy -= amp * 14.0 * flap * body_mask
        return dx, dy
    if style == 'spectral_hover':
        dy += amp * 22.0 * np.sin(theta)
        hem_mask = np.clip((ny - 0.05) / 0.95, 0, 1) ** 1.3
        dx += amp * 30.0 * np.sin(theta * 1.5 - ny * 4.0) * hem_mask
        dx += amp * 12.0 * np.cos(theta * 2.5 - ny * 6.0) * hem_mask
        dy += amp * 10.0 * np.cos(theta * 1.5 - ny * 3.5) * hem_mask
        claw_mask = np.clip((np.abs(nx) - 0.18) / 0.6, 0, 1) * np.clip((0.35 - np.abs(ny)) / 0.6, 0, 1)
        dy -= amp * 15.0 * np.cos(theta) * claw_mask
        dx += amp * 12.0 * np.sin(theta) * np.sign(nx) * claw_mask
        return dx, dy
    if style == 'heavy_stomp':
        dx += amp * 16.0 * np.sin(theta)
        dy -= amp * 16.0 * np.abs(np.sin(theta * 2))
        paw_l = np.clip((-nx - 0.06) / 0.5, 0, 1) * np.clip((ny - 0.18) / 0.8, 0, 1) ** 1.3
        paw_r = np.clip((nx - 0.06) / 0.5, 0, 1) * np.clip((ny - 0.18) / 0.8, 0, 1) ** 1.3
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.3
        lift_r = np.maximum(0, np.sin(theta)) ** 1.3
        dy -= amp * 32.0 * (paw_l * lift_l + paw_r * lift_r)
        dx += amp * 12.0 * (paw_l * np.cos(theta) - paw_r * np.cos(theta))
        arm_l = np.clip((-nx - 0.22) / 0.55, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        arm_r = np.clip((nx - 0.22) / 0.55, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        dy += amp * 22.0 * np.cos(theta) * arm_l - amp * 22.0 * np.cos(theta) * arm_r
        dx += amp * 14.0 * np.sin(theta) * (arm_l + arm_r)
        return dx, dy
    if style == 'titan_march':
        dx += amp * 14.0 * np.sin(theta)
        dy -= amp * 14.0 * np.abs(np.sin(theta * 2))
        leg_l = np.clip((-nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.78, 0, 1) ** 1.3
        leg_r = np.clip((nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.78, 0, 1) ** 1.3
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.4
        lift_r = np.maximum(0, np.sin(theta)) ** 1.4
        dy -= amp * 28.0 * (leg_l * lift_l + leg_r * lift_r)
        hammer_mask = np.clip((nx - 0.15) / 0.85, 0, 1) * np.clip((0.4 - ny) / 0.8, 0, 1)
        dy += amp * 20.0 * np.sin(theta + 0.4) * hammer_mask
        dx += amp * 14.0 * np.cos(theta + 0.4) * hammer_mask
        head_mask = np.clip((0.2 - ny) / 0.7, 0, 1) * (1.0 - np.clip(np.abs(nx) - 0.2, 0, 1))
        dy += amp * 8.0 * np.sin(theta) * head_mask
        return dx, dy

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)          # -1 .. 1 across the sprite
    ny = (yy - cy) / (h / 2)          # -1 (top) .. 1 (bottom)
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    s = seed * 0.9
    if style == 'flap':
        wx = np.clip(np.abs(nx), 0, 1) ** 1.6
        side = np.sign(nx)
        dy = amp * h * 0.12 * np.sin(theta + s) * wx * (1.0 - 0.4 * np.clip(ny, 0, 1))
        dx = amp * w * 0.06 * np.sin(theta + s + 0.6) * wx * side
    elif style == 'wave':
        wy = np.clip((ny + 0.2) / 1.2, 0, 1) ** 1.4
        dx = amp * w * 0.15 * np.sin(theta - 2.2 * ny + s) * wy
        dy = amp * h * 0.03 * np.cos(theta - 2.2 * ny + s) * wy
    elif style == 'walk':
        dy = -amp * h * 0.08 * np.abs(np.sin(theta + s))
        limb = np.clip((ny - 0.1) / 0.9, 0, 1) ** 1.2
        dx = amp * w * 0.12 * np.sin(theta + s + np.pi * (nx > 0)) * limb
        dy += amp * h * 0.02 * np.cos(theta + s + np.pi * (nx > 0)) * limb
    elif style == 'bounce':
        lift = np.abs(np.sin(theta + s))
        dy = -amp * h * 0.10 * lift * np.ones_like(ny)
        dx = amp * w * 0.02 * np.sin(theta + s) * np.clip((ny + 1) / 2, 0, 1)
    return dx, dy


def make(name, rel, style, amp):
    im = Image.open(os.path.join(SRC, rel)).convert('RGBA')
    im = im.resize((im.width, im.height), Image.LANCZOS)
    arr = np.zeros((im.height + 2 * PAD, im.width + 2 * PAD, 4), np.float32)
    arr[PAD:-PAD, PAD:-PAD] = np.asarray(im, np.float32)
    h, w = arr.shape[:2]
    seed = sum(ord(c) for c in name) % 7
    for f in range(FRAMES):
        theta = 2 * np.pi * f / FRAMES
        dx, dy = displacement(style, amp, w, h, theta, seed)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        frame = bilinear(arr, xx - dx, yy - dy)
        out = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8), 'RGBA')
        out.save(os.path.join(OUT, f'{name}_{f}.webp'), quality=90, method=6)
    print(f'{name}: {FRAMES} frames {w}x{h} ({style})')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (rel, style, amp) in ENEMIES.items():
        make(name, rel, style, amp)
