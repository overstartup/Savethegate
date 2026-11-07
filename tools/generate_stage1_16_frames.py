import math
import os
import numpy as np
from PIL import Image

PAD = 32
FRAMES = 16

def bilinear(img, sx, sy):
    """Accurate vectorised bilinear interpolation sampler."""
    h, w = img.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = np.floor(sx).astype(int)
    y0 = np.floor(sy).astype(int)
    fx = (sx - x0)[..., None]
    fy = (sy - y0)[..., None]
    a = img[y0, x0]
    b = img[y0, x0 + 1]
    c = img[y0 + 1, x0]
    d = img[y0 + 1, x0 + 1]
    return (a * (1.0 - fx) + b * fx) * (1.0 - fy) + (c * (1.0 - fx) + d * fx) * fy

def apply_joint_rot(sx, sy, mask, px, py, angle_rad, tx=0.0, ty=0.0):
    """Rotates coordinate space rigidly around pivot (px, py) weighted by smooth mask."""
    rel_x = sx - px - tx
    rel_y = sy - py - ty
    cos_a = math.cos(-angle_rad)
    sin_a = math.sin(-angle_rad)
    rot_x = px + rel_x * cos_a - rel_y * sin_a
    rot_y = py + rel_x * sin_a + rel_y * cos_a
    new_sx = sx * (1.0 - mask) + rot_x * mask
    new_sy = sy * (1.0 - mask) + rot_y * mask
    return new_sx, new_sy

def prepare_image(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    pw, ph = w + PAD * 2, h + PAD * 2
    padded = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    padded.paste(im, (PAD, PAD))
    arr = np.array(padded, dtype=np.float32)
    yy, xx = np.mgrid[0:ph, 0:pw].astype(np.float32)
    return im, arr, xx, yy, pw, ph

# ----------------------------------------------------------------------
# 1. PIRATE (Humanoid Walk: Pelvis, 2-joint legs, cutlass swing, shield bob, head nod)
# ----------------------------------------------------------------------
def rig_pirate():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/pirate.webp')
    
    l_hip = (135.0 + PAD, 185.0 + PAD)
    l_knee = (128.0 + PAD, 225.0 + PAD)
    r_hip = (185.0 + PAD, 185.0 + PAD)
    r_knee = (192.0 + PAD, 225.0 + PAD)
    r_shoulder = (210.0 + PAD, 135.0 + PAD)
    l_shoulder = (115.0 + PAD, 140.0 + PAD)
    neck = (161.0 + PAD, 115.0 + PAD)

    dist_l_hip = np.sqrt(((xx - l_hip[0]) / 32.0)**2 + ((yy - l_hip[1]) / 50.0)**2)
    m_l_thigh = np.clip((1.2 - dist_l_hip) / 0.4, 0.0, 1.0) * np.clip((yy - l_hip[1] + 10.0) / 20.0, 0.0, 1.0)
    m_l_shin = np.clip((yy - l_knee[1]) / 25.0, 0.0, 1.0) * np.clip((35.0 - np.abs(xx - l_knee[0])) / 20.0, 0.0, 1.0)

    dist_r_hip = np.sqrt(((xx - r_hip[0]) / 32.0)**2 + ((yy - r_hip[1]) / 50.0)**2)
    m_r_thigh = np.clip((1.2 - dist_r_hip) / 0.4, 0.0, 1.0) * np.clip((yy - r_hip[1] + 10.0) / 20.0, 0.0, 1.0)
    m_r_shin = np.clip((yy - r_knee[1]) / 25.0, 0.0, 1.0) * np.clip((35.0 - np.abs(xx - r_knee[0])) / 20.0, 0.0, 1.0)

    m_cutlass = np.clip((xx - r_shoulder[0] + 15.0) / 35.0, 0.0, 1.0) * np.clip((yy - 30.0) / 40.0, 0.0, 1.0) * np.clip((ph - 60.0 - yy) / 40.0, 0.0, 1.0)
    m_shield = np.clip((l_shoulder[0] + 15.0 - xx) / 35.0, 0.0, 1.0) * np.clip((yy - 40.0) / 40.0, 0.0, 1.0) * np.clip((ph - 50.0 - yy) / 40.0, 0.0, 1.0)
    m_head = np.clip((neck[1] + 15.0 - yy) / 35.0, 0.0, 1.0) * np.clip((1.0 - np.abs(xx - neck[0]) / 65.0), 0.0, 1.0)
    m_coat = np.clip((yy - (195.0 + PAD)) / 45.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi
        body_bob = -math.sin(theta * 2.0)**2 * 7.0
        body_sway = math.sin(theta) * 3.5

        sx = xx.copy() - body_sway
        sy = yy.copy() - body_bob

        thigh_l = math.sin(theta) * math.radians(24.0)
        knee_l = -max(0.0, math.sin(theta)) * math.radians(35.0)
        sx, sy = apply_joint_rot(sx, sy, m_l_thigh, l_hip[0], l_hip[1], thigh_l)
        sx, sy = apply_joint_rot(sx, sy, m_l_shin, l_knee[0], l_knee[1], knee_l)

        thigh_r = math.sin(theta + math.pi) * math.radians(24.0)
        knee_r = -max(0.0, math.sin(theta + math.pi)) * math.radians(35.0)
        sx, sy = apply_joint_rot(sx, sy, m_r_thigh, r_hip[0], r_hip[1], thigh_r)
        sx, sy = apply_joint_rot(sx, sy, m_r_shin, r_knee[0], r_knee[1], knee_r)

        arm_cutlass = math.sin(theta) * math.radians(22.0)
        sx, sy = apply_joint_rot(sx, sy, m_cutlass, r_shoulder[0], r_shoulder[1], arm_cutlass)

        arm_shield = -math.sin(theta) * math.radians(12.0)
        sx, sy = apply_joint_rot(sx, sy, m_shield, l_shoulder[0], l_shoulder[1], arm_shield)

        head_nod = math.sin(theta * 2.0) * math.radians(4.0)
        sx, sy = apply_joint_rot(sx, sy, m_head, neck[0], neck[1], head_nod)

        coat_wave = np.sin(theta - (yy / ph) * 4.0) * 8.0
        sx += m_coat * coat_wave

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 2. CRAB (Direct Front View: 6 legs alternating tripod crawl + BIG prominent snapping claws)
# ----------------------------------------------------------------------
def rig_crab():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/crab.webp')
    w, h = im.size

    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Pivots for direct front view
    l_shoulder = (140.0 + PAD, 200.0 + PAD)
    l_elbow = (90.0 + PAD, 160.0 + PAD)
    l_pincer = (65.0 + PAD, 110.0 + PAD)

    r_shoulder = (300.0 + PAD, 200.0 + PAD)
    r_elbow = (350.0 + PAD, 160.0 + PAD)
    r_pincer = (375.0 + PAD, 110.0 + PAD)

    # Left arm & claw:
    dist_l_arm = np.hypot((xx - l_elbow[0]) / 1.1, (yy - l_elbow[1]))
    m_l_arm = np.clip((120.0 - dist_l_arm) / 35.0, 0.0, 1.0) * np.clip((cx - 30.0 - xx) / 40.0, 0.0, 1.0) * np.clip(((270.0 + PAD) - yy) / 40.0, 0.0, 1.0)
    m_l_pincer = np.clip((105.0 + PAD - xx) / 35.0, 0.0, 1.0) * np.clip(((160.0 + PAD) - yy) / 35.0, 0.0, 1.0)

    # Right arm & claw:
    dist_r_arm = np.hypot((xx - r_elbow[0]) / 1.1, (yy - r_elbow[1]))
    m_r_arm = np.clip((120.0 - dist_r_arm) / 35.0, 0.0, 1.0) * np.clip((xx - (cx + 30.0)) / 40.0, 0.0, 1.0) * np.clip(((270.0 + PAD) - yy) / 40.0, 0.0, 1.0)
    m_r_pincer = np.clip((xx - (335.0 + PAD)) / 35.0, 0.0, 1.0) * np.clip(((160.0 + PAD) - yy) / 35.0, 0.0, 1.0)

    # Left legs
    m_l_legs = np.clip(((160.0 + PAD) - xx) / 35.0, 0.0, 1.0) * np.clip((yy - (210.0 + PAD)) / 30.0, 0.0, 1.0)
    # Right legs
    m_r_legs = np.clip((xx - (280.0 + PAD)) / 35.0, 0.0, 1.0) * np.clip((yy - (210.0 + PAD)) / 30.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Aggressive scuttle lunging
        body_bob = -math.sin(theta * 2.0)**2 * 8.0
        body_sway = math.sin(theta) * 7.0

        sx = xx.copy() - body_sway
        sy = yy.copy() - body_bob

        # BIG, EXAGGERATED CLAW MOVEMENTS:
        # Left claw: raises high up, spreads outward, lunges forward and SNAPS shut
        claw_l_rot = math.sin(theta) * math.radians(32.0)
        claw_l_reach = math.cos(theta) * 14.0
        claw_l_lift = -max(0.0, math.sin(theta)) * 18.0
        pincer_l_snap = -max(0.0, math.sin(theta + 0.4)) * math.radians(28.0)

        sx, sy = apply_joint_rot(sx, sy, m_l_arm, l_shoulder[0], l_shoulder[1], claw_l_rot, tx=-claw_l_reach, ty=claw_l_lift)
        sx, sy = apply_joint_rot(sx, sy, m_l_pincer, l_pincer[0], l_pincer[1], pincer_l_snap)

        # Right claw: in counter-phase, raises up high, spreads outward, slams forward and SNAPS shut
        claw_r_rot = -math.sin(theta + math.pi) * math.radians(32.0)
        claw_r_reach = math.cos(theta + math.pi) * 14.0
        claw_r_lift = -max(0.0, math.sin(theta + math.pi)) * 18.0
        pincer_r_snap = max(0.0, math.sin(theta + math.pi + 0.4)) * math.radians(28.0)

        sx, sy = apply_joint_rot(sx, sy, m_r_arm, r_shoulder[0], r_shoulder[1], claw_r_rot, tx=claw_r_reach, ty=claw_r_lift)
        sx, sy = apply_joint_rot(sx, sy, m_r_pincer, r_pincer[0], r_pincer[1], pincer_r_snap)

        # Scuttling legs alternating walk stride
        leg_l_angle = math.sin(theta) * math.radians(22.0)
        leg_l_lift = -max(0.0, math.sin(theta)) * 10.0
        sx, sy = apply_joint_rot(sx, sy, m_l_legs, 130.0 + PAD, 230.0 + PAD, leg_l_angle, ty=leg_l_lift)

        leg_r_angle = -math.sin(theta + math.pi) * math.radians(22.0)
        leg_r_lift = -max(0.0, math.sin(theta + math.pi)) * 10.0
        sx, sy = apply_joint_rot(sx, sy, m_r_legs, 310.0 + PAD, 230.0 + PAD, leg_r_angle, ty=leg_r_lift)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 3. TURTLE (Heavy Dragon Turtle: lunging head bite, pillar legs, tail lash)
# ----------------------------------------------------------------------
def rig_turtle():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/turtle.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # In turtle.webp (w=388, h=301), facing LEFT!
    # Head on LEFT: x: 6..150, y: 10..220
    neck = (140.0 + PAD, 130.0 + PAD)
    jaw = (90.0 + PAD, 170.0 + PAD)
    m_head = np.clip(((155.0 + PAD) - xx) / 35.0, 0.0, 1.0) * np.clip(((220.0 + PAD) - yy) / 35.0, 0.0, 1.0)
    m_jaw = np.clip(((120.0 + PAD) - xx) / 30.0, 0.0, 1.0) * np.clip((yy - (150.0 + PAD)) / 25.0, 0.0, 1.0)

    # Front heavy pillar leg: x: 80..180, y: 160..300
    f_shoulder = (145.0 + PAD, 175.0 + PAD)
    m_f_leg = np.clip(1.0 - np.abs(xx - (130.0 + PAD)) / 45.0, 0.0, 1.0) * np.clip((yy - (165.0 + PAD)) / 30.0, 0.0, 1.0)

    # Rear walking leg: x: 190..280, y: 160..280
    r_hip = (235.0 + PAD, 175.0 + PAD)
    m_r_leg = np.clip(1.0 - np.abs(xx - (235.0 + PAD)) / 45.0, 0.0, 1.0) * np.clip((yy - (165.0 + PAD)) / 30.0, 0.0, 1.0)

    # Spiky tail on the RIGHT: x: 280..388, y: 140..280
    tail_base = (290.0 + PAD, 200.0 + PAD)
    m_tail = np.clip((xx - (280.0 + PAD)) / 35.0, 0.0, 1.0) * np.clip(1.0 - np.abs(yy - tail_base[1]) / 45.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Heavy reptile quadruped stride bob, sway, and pitch
        body_bob = -math.sin(theta * 2.0)**2 * 8.0
        body_sway = math.sin(theta) * 6.0
        body_pitch = math.sin(theta) * math.radians(4.5)

        sx = xx.copy() - body_sway
        sy = yy.copy() - body_bob

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, cy, body_pitch)

        # 1. FRONT HEAVY PILLAR LEG STRIDE
        f_leg_angle = math.sin(theta) * math.radians(34.0)
        f_leg_lift = -max(0.0, math.sin(theta)) * 14.0
        f_leg_reach = -math.cos(theta) * 10.0
        sx, sy = apply_joint_rot(sx, sy, m_f_leg, f_shoulder[0], f_shoulder[1], f_leg_angle, tx=f_leg_reach, ty=f_leg_lift)

        # 2. REAR WALKING LEG STRIDE
        r_leg_angle = math.sin(theta + math.pi) * math.radians(30.0)
        r_leg_lift = -max(0.0, math.sin(theta + math.pi)) * 12.0
        r_leg_reach = -math.cos(theta + math.pi) * 8.0
        sx, sy = apply_joint_rot(sx, sy, m_r_leg, r_hip[0], r_hip[1], r_leg_angle, tx=r_leg_reach, ty=r_leg_lift)

        # 3. DRACONIC HEAD LUNGE & JAW CHOMP
        head_lunge = -math.cos(theta) * 12.0
        head_nod = math.sin(theta) * math.radians(10.0)
        jaw_bite = max(0.0, math.sin(theta * 2.0)) * math.radians(20.0)
        sx, sy = apply_joint_rot(sx, sy, m_head, neck[0], neck[1], head_nod, tx=head_lunge)
        sx, sy = apply_joint_rot(sx, sy, m_jaw, jaw[0], jaw[1], jaw_bite)

        # 4. SPIKED TAIL COUNTER-LASH
        tail_rot = math.sin(theta - 1.0) * math.radians(26.0)
        sx, sy = apply_joint_rot(sx, sy, m_tail, tail_base[0], tail_base[1], tail_rot)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 4. KRAKEN (Leviathan siphon jet + 8 progressive undulating tentacle chains)
# ----------------------------------------------------------------------
def rig_kraken():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/kraken.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Mantle dome (top half)
    m_mantle = np.clip(((150.0 + PAD) - yy) / 45.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - cx) / 100.0, 0.0, 1.0)

    # 4 distinct tentacle lateral zones (left outer, left inner, right inner, right outer)
    m_tentacles = np.clip((yy - (130.0 + PAD)) / 40.0, 0.0, 1.0)
    m_t_l_outer = m_tentacles * np.clip(((120.0 + PAD) - xx) / 40.0, 0.0, 1.0)
    m_t_l_inner = m_tentacles * np.clip(1.0 - np.abs(xx - (170.0 + PAD)) / 45.0, 0.0, 1.0)
    m_t_r_inner = m_tentacles * np.clip(1.0 - np.abs(xx - (290.0 + PAD)) / 45.0, 0.0, 1.0)
    m_t_r_outer = m_tentacles * np.clip((xx - (340.0 + PAD)) / 40.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Siphon jet propulsion: rapid upward surge then buoyant descent
        pulse = math.sin(theta)
        body_surge = -max(0.0, pulse) * 12.0 + (1.0 - math.cos(theta)) * 3.0
        
        # Mantle expansion / contraction
        mantle_squeeze = math.sin(theta) * 0.08

        sx = xx.copy()
        sy = yy.copy() - body_surge

        # Squeeze mantle horizontally and stretch vertically
        sx += m_mantle * (xx - cx) * mantle_squeeze
        sy -= m_mantle * (yy - 60.0) * mantle_squeeze

        # Undulating sine waves traveling down each tentacle chain
        # Amplitude increases toward tentacle tips (larger yy)
        tip_weight = np.clip((yy - (140.0 + PAD)) / 130.0, 0.0, 1.5)

        wave_lo = np.sin(theta - (yy / 45.0)) * 14.0 * tip_weight
        wave_li = np.sin(theta + 1.2 - (yy / 40.0)) * 12.0 * tip_weight
        wave_ri = np.sin(theta + 2.4 - (yy / 40.0)) * 12.0 * tip_weight
        wave_ro = np.sin(theta + 3.6 - (yy / 45.0)) * 14.0 * tip_weight

        sx += m_t_l_outer * wave_lo
        sx += m_t_l_inner * wave_li
        sx += m_t_r_inner * wave_ri
        sx += m_t_r_outer * wave_ro

        # Upward curling curl on tips
        curl = np.sin(theta * 2.0 - (yy / 30.0)) * 6.0 * tip_weight
        sy += m_tentacles * curl

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 5. LANTERNFIN (Anglerfish caudal fin tail sweep + pendulum glowing lure)
# ----------------------------------------------------------------------
def rig_lanternfin():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/lanternfin.webp')
    w, h = im.size

    # Caudal fin & tail base (left rear side)
    tail_peduncle = (120.0 + PAD, 140.0 + PAD)
    tail_fin = (60.0 + PAD, 140.0 + PAD)
    m_tail = np.clip(((150.0 + PAD) - xx) / 45.0, 0.0, 1.0)
    m_fin = np.clip(((90.0 + PAD) - xx) / 35.0, 0.0, 1.0)

    # Lure stalk and glowing bulb (top right)
    stalk_root = (190.0 + PAD, 65.0 + PAD)
    bulb = (260.0 + PAD, 45.0 + PAD)
    m_stalk = np.clip((xx - (170.0 + PAD)) / 40.0, 0.0, 1.0) * np.clip(((100.0 + PAD) - yy) / 40.0, 0.0, 1.0)
    m_bulb = np.clip((xx - (230.0 + PAD)) / 25.0, 0.0, 1.0) * np.clip(((75.0 + PAD) - yy) / 25.0, 0.0, 1.0)

    # Massive predatory lower jaw (bottom right)
    jaw_hinge = (210.0 + PAD, 160.0 + PAD)
    m_jaw = np.clip((xx - (200.0 + PAD)) / 30.0, 0.0, 1.0) * np.clip((yy - (150.0 + PAD)) / 25.0, 0.0, 1.0)

    # Pectoral fin (mid flank)
    pectoral = (175.0 + PAD, 165.0 + PAD)
    m_pectoral = np.clip(1.0 - np.hypot(xx - pectoral[0], yy - pectoral[1]) / 35.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Swimming forward surge & roll
        body_heave = math.sin(theta) * 5.0
        body_pitch = math.sin(theta) * math.radians(3.5)

        sx = xx.copy()
        sy = yy.copy() - body_heave

        # Caudal tail wave (traveling fish wave)
        tail_sweep = math.sin(theta) * math.radians(24.0)
        fin_sweep = math.sin(theta - 0.7) * math.radians(18.0)
        sx, sy = apply_joint_rot(sx, sy, m_tail, tail_peduncle[0], tail_peduncle[1], tail_sweep)
        sx, sy = apply_joint_rot(sx, sy, m_fin, tail_fin[0], tail_fin[1], fin_sweep)

        # Bioluminescent lure pendulum physics (delayed phase momentum)
        stalk_sway = math.sin(theta - 1.2) * math.radians(22.0)
        bulb_bob = math.cos(theta - 1.2) * 8.0
        sx, sy = apply_joint_rot(sx, sy, m_stalk, stalk_root[0], stalk_root[1], stalk_sway)
        sx, sy = apply_joint_rot(sx, sy, m_bulb, bulb[0], bulb[1], stalk_sway * 1.5, ty=bulb_bob)

        # Predatory jaw snap
        jaw_snap = max(0.0, math.sin(theta)) * math.radians(15.0)
        sx, sy = apply_joint_rot(sx, sy, m_jaw, jaw_hinge[0], jaw_hinge[1], jaw_snap)

        # Pectoral fin fast flutter
        pec_flutter = math.sin(theta * 3.0) * math.radians(16.0)
        sx, sy = apply_joint_rot(sx, sy, m_pectoral, pectoral[0], pectoral[1], pec_flutter)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 6. JELLY (Hydrodynamic bell dome pulse, buoyant glide & flowing tentacles)
# ----------------------------------------------------------------------
def rig_jelly():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/jelly.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD

    # Bell dome (top half)
    m_bell = np.clip(((140.0 + PAD) - yy) / 45.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - cx) / 80.0, 0.0, 1.0)
    # Bell rim margin
    m_rim = np.clip(1.0 - np.abs(yy - (130.0 + PAD)) / 25.0, 0.0, 1.0)
    # Trailing tentacles (bottom half)
    m_tentacles = np.clip((yy - (130.0 + PAD)) / 35.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Cnidarian Jet Propulsion cycle:
        # Phase 0..0.4: power contraction (shoots up)
        # Phase 0.4..1.0: relaxed buoyant drift
        thrust_phase = math.sin(theta)
        
        # Upward pulse
        y_thrust = -math.pow(max(0.0, thrust_phase), 1.5) * 16.0 + math.cos(theta) * 4.0

        # Bell squashes wide on intake, narrows and elongates vertically on jet thrust
        bell_squeeze_x = -thrust_phase * 0.16
        bell_squeeze_y = thrust_phase * 0.22

        sx = xx.copy()
        sy = yy.copy() - y_thrust

        # Apply bell dome deformation
        sx += m_bell * (xx - cx) * bell_squeeze_x
        sy -= m_bell * (yy - (50.0 + PAD)) * bell_squeeze_y

        # Bell rim outward flare
        rim_flare = math.sin(theta + 0.8) * 6.0
        sx += m_rim * np.sign(xx - cx) * rim_flare

        # Trailing tentacles undulation with hydrodynamic drag
        trail_depth = np.clip((yy - (130.0 + PAD)) / 100.0, 0.0, 2.0)
        tentacle_wave = np.sin(theta - (yy / 30.0)) * 14.0 * trail_depth
        sx += m_tentacles * tentacle_wave
        # Tentacles trail downward during upward thrust
        sy -= m_tentacles * max(0.0, thrust_phase) * 8.0 * trail_depth

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 7. URCHIN (Radial spine bristling pulse & rolling waddle)
# ----------------------------------------------------------------------
def rig_urchin():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/sea/urchin.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Distance from center
    dist = np.hypot(xx - cx, yy - cy)
    angle = np.arctan2(yy - cy, xx - cx)

    # Core vs Spines mask
    m_spines = np.clip((dist - 35.0) / 25.0, 0.0, 1.0)
    m_core = np.clip((45.0 - dist) / 20.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Heavy rolling waddle
        tilt = math.sin(theta) * math.radians(14.0)
        waddle_x = math.sin(theta) * 6.0
        waddle_y = -math.sin(theta * 2.0)**2 * 5.0

        sx = xx.copy() - waddle_x
        sy = yy.copy() - waddle_y

        # Body tilt around base
        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, cy + 20.0, tilt)

        # Radial spine bristling pulse (spines extend radially)
        spine_pulse = math.sin(theta * 2.0) * 0.12
        # Angular ripple traveling around the spines
        angular_wave = np.sin(theta + angle * 3.0) * 4.0

        sx -= m_spines * (np.cos(angle) * (spine_pulse * dist + angular_wave))
        sy -= m_spines * (np.sin(angle) * (spine_pulse * dist + angular_wave))

        # Core breathing pulse
        core_breath = math.sin(theta) * 0.06
        sx += m_core * (xx - cx) * core_breath
        sy += m_core * (yy - cy) * core_breath

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

RIGS = {
    'pirate': rig_pirate,
    'crab': rig_crab,
    'turtle': rig_turtle,
    'kraken': rig_kraken,
    'lanternfin': rig_lanternfin,
    'jelly': rig_jelly,
    'urchin': rig_urchin,
}

def main():
    os.makedirs('game/assets/sprites/anim', exist_ok=True)
    for name, rig_fn in RIGS.items():
        print(f"Generating 16 frames for {name}...")
        frames = rig_fn()
        for idx, frame in enumerate(frames):
            out_path = f"game/assets/sprites/anim/{name}_{idx}.webp"
            frame.save(out_path, format='WEBP', quality=90)
        # Also save a composite preview GIF for inspection
        gif_path = f"game/assets/sprites/anim/{name}_16_preview.gif"
        frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
        print(f"Saved {name} frames [0..15] and preview {gif_path}")

if __name__ == '__main__':
    main()
