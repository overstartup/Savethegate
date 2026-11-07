import math
import os
import numpy as np
from PIL import Image

PAD = 36
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
# 1. YETI (Heavy Gorilla Brute Walk: swinging ape arms, stomping feet, chest heave)
# ----------------------------------------------------------------------
def rig_yeti():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/yeti.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD

    # Pivots
    l_shoulder = (110.0 + PAD, 160.0 + PAD)
    r_shoulder = (290.0 + PAD, 160.0 + PAD)

    neck = (200.0 + PAD, 120.0 + PAD)

    # Masks
    m_l_arm = np.clip((145.0 + PAD - xx) / 35.0, 0.0, 1.0) * np.clip((yy - (110.0 + PAD)) / 35.0, 0.0, 1.0)
    m_r_arm = np.clip((xx - (255.0 + PAD)) / 35.0, 0.0, 1.0) * np.clip((yy - (110.0 + PAD)) / 35.0, 0.0, 1.0)

    # Solid vertical foot lift masks (NO angular shear!)
    m_l_foot = np.clip((195.0 + PAD - xx) / 25.0, 0.0, 1.0) * np.clip((yy - (270.0 + PAD)) / 25.0, 0.0, 1.0)
    m_r_foot = np.clip((xx - (205.0 + PAD)) / 25.0, 0.0, 1.0) * np.clip((yy - (270.0 + PAD)) / 25.0, 0.0, 1.0)

    m_head = np.clip(((165.0 + PAD) - yy) / 35.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - cx) / 80.0, 0.0, 1.0)
    m_chest = np.clip(1.0 - np.abs(xx - cx) / 75.0, 0.0, 1.0) * np.clip(1.0 - np.abs(yy - (200.0 + PAD)) / 60.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Heavy gorilla stride bob and roll
        step_bob = -abs(math.sin(theta)) * 8.0
        step_sway = math.sin(theta) * 4.5
        step_tilt = math.sin(theta) * math.radians(2.0)

        sx = xx.copy() - step_sway
        sy = yy.copy() - step_bob

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, 280.0 + PAD, step_tilt)

        # Alternating vertical foot lifts (clean ground lift & plant)
        lift_l = max(0.0, math.sin(theta)) * 14.0
        sy += m_l_foot * lift_l

        lift_r = max(0.0, math.sin(theta + math.pi)) * 14.0
        sy += m_r_foot * lift_r

        # Ape arm swings: wide, aggressive forward/backward pummel swings
        arm_l_rot = math.sin(theta) * math.radians(28.0)
        sx, sy = apply_joint_rot(sx, sy, m_l_arm, l_shoulder[0], l_shoulder[1], arm_l_rot)

        arm_r_rot = -math.sin(theta + math.pi) * math.radians(28.0)
        sx, sy = apply_joint_rot(sx, sy, m_r_arm, r_shoulder[0], r_shoulder[1], arm_r_rot)

        # Roaring head nod
        head_nod = math.sin(theta * 2.0) * math.radians(4.5)
        sx, sy = apply_joint_rot(sx, sy, m_head, cx, 120.0 + PAD, head_nod)

        # Chest breathing heave
        chest_heave = math.sin(theta) * 0.08
        sx += m_chest * (xx - cx) * chest_heave
        sy += m_chest * (yy - (200.0 + PAD)) * chest_heave

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 2. SNOWBLOB (Bouncy Ice Slime: squash, jump leap, hang-time, splat)
# ----------------------------------------------------------------------
def rig_snowblob():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/snowblob.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Body mask
    m_body = np.clip(1.0 - np.hypot(xx - cx, yy - cy) / 160.0, 0.0, 1.0)
    # Icicle drips / base
    m_base = np.clip((yy - (320.0 + PAD)) / 40.0, 0.0, 1.0)
    # Snowcap on top
    m_cap = np.clip(((140.0 + PAD) - yy) / 40.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Slime jump cycle:
        # 0..pi/2: squash down (prepare jump)
        # pi/2..pi: shoot upward into air
        # pi..3pi/2: float down
        # 3pi/2..2pi: splat and rebound
        hop_phase = math.sin(theta)
        
        # Vertical jump height
        jump_y = -max(0.0, hop_phase) * 22.0 + math.cos(theta) * 4.0

        # Squash and stretch:
        # Negative hop_phase = squash flat (wide x, flat y)
        # Positive hop_phase = stretch tall (narrow x, tall y)
        sq_x = -hop_phase * 0.22
        sq_y = hop_phase * 0.28

        sx = xx.copy()
        sy = yy.copy() - jump_y

        # Apply squash & stretch around center
        sx += m_body * (xx - cx) * sq_x
        sy += m_body * (yy - cy) * sq_y

        # Dripping icicle sway with trailing drag
        icicle_drag = np.sin(theta - (yy / 40.0)) * 9.0
        sx += m_base * icicle_drag
        sy -= m_base * max(0.0, hop_phase) * 10.0

        # Snowcap jiggle
        cap_jiggle = math.sin(theta * 2.0) * math.radians(5.0)
        sx, sy = apply_joint_rot(sx, sy, m_cap, cx, 80.0 + PAD, cap_jiggle)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 3. FROSTLING (Ice Goblin Rogue: fast dash, slashing daggers, horned head nod)
# ----------------------------------------------------------------------
def rig_frostling():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/frostling.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD

    # Arm pivots & masks
    l_shoulder = (120.0 + PAD, 170.0 + PAD)
    r_shoulder = (280.0 + PAD, 170.0 + PAD)
    m_l_dagger = np.clip((140.0 + PAD - xx) / 30.0, 0.0, 1.0) * np.clip((yy - (120.0 + PAD)) / 30.0, 0.0, 1.0)
    m_r_dagger = np.clip((xx - (260.0 + PAD)) / 30.0, 0.0, 1.0) * np.clip((yy - (120.0 + PAD)) / 30.0, 0.0, 1.0)

    # Feet / Legs (solid vertical lift masks, NO angular shear!)
    m_l_foot = np.clip((195.0 + PAD - xx) / 20.0, 0.0, 1.0) * np.clip((yy - (270.0 + PAD)) / 20.0, 0.0, 1.0)
    m_r_foot = np.clip((xx - (205.0 + PAD)) / 20.0, 0.0, 1.0) * np.clip((yy - (270.0 + PAD)) / 20.0, 0.0, 1.0)

    neck = (200.0 + PAD, 150.0 + PAD)
    m_head = np.clip(((175.0 + PAD) - yy) / 35.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - cx) / 75.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Agile running bob and sway
        step_bob = -abs(math.sin(theta)) * 7.0
        step_sway = math.sin(theta) * 3.5
        step_tilt = math.sin(theta) * math.radians(2.5)

        sx = xx.copy() - step_sway
        sy = yy.copy() - step_bob

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, 270.0 + PAD, step_tilt)

        # Clean vertical foot lifts on running strides
        lift_l = max(0.0, math.sin(theta)) * 13.0
        sy += m_l_foot * lift_l

        lift_r = max(0.0, math.sin(theta + math.pi)) * 13.0
        sy += m_r_foot * lift_r

        # Dagger slashing swings
        slash_l = math.sin(theta) * math.radians(28.0)
        reach_l = math.cos(theta) * 10.0
        sx, sy = apply_joint_rot(sx, sy, m_l_dagger, l_shoulder[0], l_shoulder[1], slash_l, tx=-reach_l)

        slash_r = -math.sin(theta + math.pi) * math.radians(28.0)
        reach_r = math.cos(theta + math.pi) * 10.0
        sx, sy = apply_joint_rot(sx, sy, m_r_dagger, r_shoulder[0], r_shoulder[1], slash_r, tx=reach_r)

        # Head lunge
        head_lunge = math.sin(theta * 2.0) * math.radians(4.0)
        sx, sy = apply_joint_rot(sx, sy, m_head, neck[0], neck[1], head_lunge)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 4. WRAITH (Hovering Frost Phantom: spectral float, sweeping scythe, mist trails)
# ----------------------------------------------------------------------
def rig_wraith():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/wraith.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD

    # Scythe arm (right side)
    scythe_shoulder = (270.0 + PAD, 160.0 + PAD)
    m_scythe = np.clip((xx - (240.0 + PAD)) / 40.0, 0.0, 1.0) * np.clip((yy - (60.0 + PAD)) / 40.0, 0.0, 1.0)

    # Spectral mist trails (bottom half)
    m_mist = np.clip((yy - (240.0 + PAD)) / 40.0, 0.0, 1.0)
    m_head = np.clip(((150.0 + PAD) - yy) / 35.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - cx) / 60.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Floating levitation
        float_y = math.sin(theta) * 12.0
        float_x = math.cos(theta * 0.5) * 6.0
        float_tilt = math.sin(theta) * math.radians(4.5)

        sx = xx.copy() - float_x
        sy = yy.copy() - float_y

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, 200.0 + PAD, float_tilt)

        # Scythe sweeping harvest
        scythe_rot = math.sin(theta) * math.radians(24.0)
        sx, sy = apply_joint_rot(sx, sy, m_scythe, scythe_shoulder[0], scythe_shoulder[1], scythe_rot)

        # Undulating wispy mist tails
        mist_wave = np.sin(theta - (yy / 35.0)) * 14.0
        sx += m_mist * mist_wave

        # Spectral head nod
        head_nod = math.sin(theta) * math.radians(5.0)
        sx, sy = apply_joint_rot(sx, sy, m_head, cx, 120.0 + PAD, head_nod)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 5. FROSTGIANT (Colossal Boss March: thunderous footsteps, massive hammer slam)
# ----------------------------------------------------------------------
def rig_frostgiant():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/frostgiant.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Pivots (w=558, h=600):
    # Hammer is on the LEFT side (x < 220)
    hammer_shoulder = (170.0 + PAD, 160.0 + PAD)
    m_hammer = np.clip(((220.0 + PAD) - xx) / 45.0, 0.0, 1.0) * np.clip((yy - (70.0 + PAD)) / 45.0, 0.0, 1.0)

    # Gauntlet arm is on the RIGHT side (x > 360)
    gauntlet_shoulder = (390.0 + PAD, 160.0 + PAD)
    m_gauntlet = np.clip((xx - (360.0 + PAD)) / 45.0, 0.0, 1.0) * np.clip((yy - (70.0 + PAD)) / 45.0, 0.0, 1.0)

    # Legs: Left (x: 140..270), Right (x: 290..430), y > 370
    m_l_leg = np.clip(((270.0 + PAD) - xx) / 40.0, 0.0, 1.0) * np.clip((yy - (360.0 + PAD)) / 40.0, 0.0, 1.0) * np.clip((xx - (110.0 + PAD)) / 30.0, 0.0, 1.0)
    m_r_leg = np.clip((xx - (290.0 + PAD)) / 40.0, 0.0, 1.0) * np.clip((yy - (360.0 + PAD)) / 40.0, 0.0, 1.0) * np.clip(((450.0 + PAD) - xx) / 30.0, 0.0, 1.0)

    # Head & Beard: x: 200..360, y < 220
    neck = (280.0 + PAD, 180.0 + PAD)
    m_head = np.clip(((210.0 + PAD) - yy) / 40.0, 0.0, 1.0) * np.clip(1.0 - np.abs(xx - (280.0 + PAD)) / 90.0, 0.0, 1.0)

    # Chest: center x ~ 280, y ~ 180..360
    m_chest = np.clip(1.0 - np.abs(xx - (280.0 + PAD)) / 100.0, 0.0, 1.0) * np.clip(1.0 - np.abs(yy - (270.0 + PAD)) / 80.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Colossal thunderous footsteps bob & side roll
        body_bob = -math.sin(theta * 2.0)**2 * 14.0
        body_sway = math.sin(theta) * 10.0
        body_tilt = math.sin(theta) * math.radians(4.0)

        sx = xx.copy() - body_sway
        sy = yy.copy() - body_bob

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, 380.0 + PAD, body_tilt)

        # 1. MASSIVE HAMMER SLAM & RAISE
        hammer_rot = math.sin(theta) * math.radians(38.0)
        hammer_reach = math.cos(theta) * 16.0
        hammer_lift = -max(0.0, math.sin(theta)) * 22.0
        sx, sy = apply_joint_rot(sx, sy, m_hammer, hammer_shoulder[0], hammer_shoulder[1], hammer_rot, tx=-hammer_reach, ty=hammer_lift)

        # 2. GAUNTLET COMBAT COUNTER-SWING
        gauntlet_rot = -math.sin(theta + math.pi) * math.radians(32.0)
        gauntlet_reach = math.cos(theta + math.pi) * 14.0
        gauntlet_lift = -max(0.0, math.sin(theta + math.pi)) * 18.0
        sx, sy = apply_joint_rot(sx, sy, m_gauntlet, gauntlet_shoulder[0], gauntlet_shoulder[1], gauntlet_rot, tx=gauntlet_reach, ty=gauntlet_lift)

        # 3. THUNDEROUS STOMPING FOOTSTEPS (Clean vertical foot lifts, NO sideways leg shear)
        lift_l = max(0.0, math.sin(theta)) * 16.0
        sy += m_l_leg * lift_l

        lift_r = max(0.0, math.sin(theta + math.pi)) * 16.0
        sy += m_r_leg * lift_r

        # 4. ROARING HEAD & CROWN NOD
        head_nod = math.sin(theta * 2.0) * math.radians(7.0)
        head_lunge = math.cos(theta) * 5.0
        sx, sy = apply_joint_rot(sx, sy, m_head, neck[0], neck[1], head_nod, ty=head_lunge)

        # 5. DEEP CHEST BREATHING
        chest_breath = math.sin(theta) * 0.08
        sx += m_chest * (xx - (280.0 + PAD)) * chest_breath
        sy += m_chest * (yy - (270.0 + PAD)) * chest_breath

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

# ----------------------------------------------------------------------
# 6. ICEBAT (Flapping Flight: wing strokes, aerodynamic swoop)
# ----------------------------------------------------------------------
def rig_icebat():
    im, arr, xx, yy, pw, ph = prepare_image('game/assets/sprites/ice/icebat.webp')
    w, h = im.size
    cx = (w / 2.0) + PAD
    cy = (h / 2.0) + PAD

    # Wings
    m_l_wing = np.clip(((160.0 + PAD) - xx) / 40.0, 0.0, 1.0)
    m_r_wing = np.clip((xx - (240.0 + PAD)) / 40.0, 0.0, 1.0)

    frames = []
    for f in range(FRAMES):
        theta = (f / FRAMES) * 2.0 * math.pi

        # Flapping dive & climb
        flight_y = math.sin(theta) * 9.0
        pitch = math.sin(theta) * math.radians(6.0)

        sx = xx.copy()
        sy = yy.copy() - flight_y

        sx, sy = apply_joint_rot(sx, sy, np.ones_like(xx), cx, cy, pitch)

        # Wing beat cycle
        wing_beat = math.sin(theta) * math.radians(34.0)
        wing_flap_y = -math.sin(theta) * 14.0
        sx, sy = apply_joint_rot(sx, sy, m_l_wing, 160.0 + PAD, cy, -wing_beat, ty=wing_flap_y)
        sx, sy = apply_joint_rot(sx, sy, m_r_wing, 240.0 + PAD, cy, wing_beat, ty=wing_flap_y)

        warped = bilinear(arr, sx, sy)
        frames.append(Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA'))
    return frames

RIGS_STAGE2 = {
    'yeti': rig_yeti,
    'snowblob': rig_snowblob,
    'frostling': rig_frostling,
    'wraith': rig_wraith,
    'frostgiant': rig_frostgiant,
    'icebat': rig_icebat,
}

def main():
    os.makedirs('game/assets/sprites/anim', exist_ok=True)
    for name, rig_fn in RIGS_STAGE2.items():
        print(f"Generating 16 frames for {name}...")
        frames = rig_fn()
        for idx, frame in enumerate(frames):
            out_path = f"game/assets/sprites/anim/{name}_{idx}.webp"
            frame.save(out_path, format='WEBP', quality=90)
        gif_path = f"game/assets/sprites/anim/{name}_16_preview.gif"
        frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
        print(f"Saved {name} frames [0..15] and preview {gif_path}")

if __name__ == '__main__':
    main()
