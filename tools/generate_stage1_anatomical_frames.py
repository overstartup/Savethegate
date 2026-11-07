"""Generate high-fidelity anatomical 8-frame movement animations for Stage 1 (Sea War) enemies.

Enemies crafted with bespoke anatomical articulation:
1. pirate: True skeletal walk cycle (alternating bone leg strides with knee bending and foot plant,
   counter-swinging cutlass arm, bobbing anchor shield, skull nod, and billowing coat tails).
2. crab: Rapid 6-leg tripod scuttle gait, giant snapping scissor pincer claws, low bobbing carapace.
3. turtle: 4 heavy swimming paddle flippers with alternating power strokes, snapping dragon jaw thrust.
4. kraken: 8 distinct writhing tentacles surging in travelling propulsion waves, mantle breathing expansion.
5. lanternfin: Dorsal stalk lure swinging with physical pendulum arc, caudal tail fin sweeping.
6. jelly: True medusa jellyfish pulse (powerful bell dome contraction & upward surge, flowing tentacles).
7. urchin: Menacing radial spine bristling and nervous rolling wobble.
"""

import os
import math
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'game', 'assets', 'sprites', 'sea')
OUT_DIR = os.path.join(ROOT, 'game', 'assets', 'sprites', 'anim')
os.makedirs(OUT_DIR, exist_ok=True)

FRAMES = 8
PAD = 24

def bilinear(img, sx, sy):
    h, w = img.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = np.floor(sx).astype(int); y0 = np.floor(sy).astype(int)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]
    c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def smooth_mask(dist, radius):
    norm = np.clip(dist / max(1e-5, radius), 0.0, 1.0)
    return 0.5 + 0.5 * np.cos(norm * np.pi)

# ---------------------------------------------------------------------------
# 1. PIRATE (Skeleton Soldier)
# ---------------------------------------------------------------------------
def displacement_pirate(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)          # -1 .. 1
    ny = (yy - cy) / (h / 2)          # -1 (head) .. 1 (feet)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # 1. Torso & Pelvis walk bob and weight-shift sway
    body_bob = -np.abs(np.sin(theta)) * 9.0
    body_sway = np.sin(theta) * 4.5
    dy += body_bob
    dx += body_sway

    # 2. Left Leg (nx < -0.02, ny > 0.15) and Right Leg (nx > 0.02, ny > 0.15)
    leg_l = np.clip((-nx - 0.02) / 0.42, 0, 1) * np.clip((ny - 0.15) / 0.8, 0, 1) ** 1.3
    leg_r = np.clip((nx - 0.02) / 0.42, 0, 1) * np.clip((ny - 0.15) / 0.8, 0, 1) ** 1.3

    # Left leg stride: forward reach and knee bend
    stride_l = -np.cos(theta)
    lift_l = np.maximum(0, -np.sin(theta)) ** 1.4
    dy += leg_l * (-lift_l * 22.0)
    dx += leg_l * (stride_l * 16.0)

    # Right leg stride: alternating phase
    stride_r = np.cos(theta)
    lift_r = np.maximum(0, np.sin(theta)) ** 1.4
    dy += leg_r * (-lift_r * 22.0)
    dx += leg_r * (stride_r * 16.0)

    # 3. Right Arm with Cutlass (nx > 0.2, ny between -0.4 and 0.4)
    # Counter-swings in stride rhythm with weapon blade rotation
    arm_cutlass = np.clip((nx - 0.15) / 0.6, 0, 1) * np.clip((0.45 - np.abs(ny)) / 0.6, 0, 1)
    blade_tip = np.clip((nx - 0.4) / 0.5, 0, 1) * np.clip((-ny) / 0.7, 0, 1)
    cutlass_swing = np.sin(theta) * 18.0
    dy += arm_cutlass * (cutlass_swing * 0.5)
    dx += arm_cutlass * cutlass_swing
    dy += blade_tip * (-np.cos(theta) * 12.0)

    # 4. Left Arm with Anchor Shield (nx < -0.15, ny between -0.3 and 0.5)
    shield_mask = np.clip((-nx - 0.15) / 0.6, 0, 1) * np.clip((0.5 - np.abs(ny)) / 0.6, 0, 1)
    dy += shield_mask * (-np.sin(theta) * 10.0)
    dx += shield_mask * (-np.cos(theta) * 6.0)

    # 5. Skull & Bicorn Hat (ny < -0.15)
    head_mask = np.clip((1.0 - np.abs(nx) * 2.2), 0, 1) * np.clip((-ny - 0.15) / 0.75, 0, 1)
    dy += head_mask * (np.sin(theta * 2.0) * 3.5)
    dx += head_mask * (np.cos(theta) * 2.5)

    # 6. Tattered coat and seaweed fluttering behind (ny > 0.25)
    coat_mask = np.clip((ny - 0.25) / 0.75, 0, 1) ** 1.3
    dx += coat_mask * (np.sin(theta * 1.5 - ny * 3.5) * 10.0)

    return dx, dy

# ---------------------------------------------------------------------------
# 2. CRAB (Snapper - Runner)
# ---------------------------------------------------------------------------
def displacement_crab(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # Fast scuttle cadence
    scuttle_phase = theta * 2.0

    # 1. Low Carapace fast sprint shudder
    dy -= np.abs(np.sin(scuttle_phase)) * 6.0
    dx += np.sin(scuttle_phase) * 3.5

    # 2. 6-Leg Tripod Gait Articulation:
    # Outer legs (nx < -0.2 and nx > 0.2, ny > -0.1)
    legs_l = np.clip((-nx - 0.15) / 0.8, 0, 1) * np.clip((ny + 0.1) / 0.9, 0, 1) ** 1.2
    legs_r = np.clip((nx - 0.15) / 0.8, 0, 1) * np.clip((ny + 0.1) / 0.9, 0, 1) ** 1.2

    # Tripod alternating stride
    crawl_l = np.sin(scuttle_phase)
    lift_l = np.maximum(0, crawl_l) ** 1.3
    crawl_r = -np.sin(scuttle_phase)
    lift_r = np.maximum(0, crawl_r) ** 1.3

    dy += legs_l * (-lift_l * 16.0)
    dx += legs_l * (np.cos(scuttle_phase) * 12.0)
    dy += legs_r * (-lift_r * 16.0)
    dx += legs_r * (-np.cos(scuttle_phase) * 12.0)

    # 3. Giant Scissor Pincers: Aggressive rhythmic snapping
    pincer_l = np.clip((-nx - 0.3) / 0.7, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
    pincer_r = np.clip((nx - 0.3) / 0.7, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)

    # Snapping scissor action
    snap_l = np.maximum(0, np.sin(scuttle_phase)) * 14.0
    snap_r = np.maximum(0, -np.sin(scuttle_phase)) * 14.0

    dx += pincer_l * (-snap_l)
    dy += pincer_l * (np.cos(scuttle_phase) * 8.0)
    dx += pincer_r * (snap_r)
    dy += pincer_r * (-np.cos(scuttle_phase) * 8.0)

    # 4. Eye stalks swaying
    eyes_mask = np.clip((1.0 - np.abs(nx) * 2.8), 0, 1) * np.clip((-ny - 0.2) / 0.7, 0, 1)
    dx += eyes_mask * (np.sin(scuttle_phase * 1.5) * 5.0)

    return dx, dy

# ---------------------------------------------------------------------------
# 3. TURTLE (Iron Shell - Brute)
# ---------------------------------------------------------------------------
def displacement_turtle(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # Heavy swimming propulsion
    stroke = np.sin(theta)

    # 1. 4 Heavy Paddle Flippers
    # Front-right flipper (nx > 0.2, ny > 0.05)
    flipper_fr = np.clip((nx - 0.15) / 0.65, 0, 1) * np.clip((ny - 0.05) / 0.85, 0, 1) ** 1.3
    # Front-left flipper (nx < -0.15, ny > 0.05)
    flipper_fl = np.clip((-nx - 0.15) / 0.65, 0, 1) * np.clip((ny - 0.05) / 0.85, 0, 1) ** 1.3

    # Alternating powerful paddle push
    dy += flipper_fr * (stroke * 22.0)
    dx += flipper_fr * (-np.cos(theta) * 16.0)

    dy += flipper_fl * (-stroke * 22.0)
    dx += flipper_fl * (np.cos(theta) * 16.0)

    # 2. Snapping Dragon Head (nx > 0.3, ny between -0.4 and 0.2)
    head_mask = np.clip((nx - 0.25) / 0.65, 0, 1) * np.clip((0.3 - np.abs(ny)) / 0.6, 0, 1)
    head_bite = np.sin(theta * 2.0)
    dx += head_mask * (head_bite * 14.0)
    dy += head_mask * (np.cos(theta * 2.0) * 6.0)

    # 3. Heavy armored shell roll & bob
    shell_mask = np.clip((1.0 - np.abs(nx) * 1.6), 0, 1) * np.clip((1.0 - np.abs(ny) * 1.5), 0, 1)
    dy += shell_mask * (-np.abs(np.sin(theta * 2.0)) * 6.0)
    dx += shell_mask * (stroke * 3.5)

    return dx, dy

# ---------------------------------------------------------------------------
# 4. KRAKEN (Abyssal Leviathan - Boss)
# ---------------------------------------------------------------------------
def displacement_kraken(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # 1. 8 Writhing Tentacles across the lower half (ny > -0.1)
    tentacle_zone = np.clip((ny + 0.15) / 1.05, 0, 1) ** 1.2
    
    # Wave propagation across horizontal spread
    spread_wave = theta + nx * 3.5
    dx += tentacle_zone * (np.sin(spread_wave) * 18.0)
    dy += tentacle_zone * (-np.cos(spread_wave) * 14.0)

    # Outer grasping arms (curling inward on downbeat)
    grasp_l = np.clip((-nx - 0.4) / 0.6, 0, 1) * np.clip((0.4 - np.abs(ny)) / 0.6, 0, 1)
    grasp_r = np.clip((nx - 0.4) / 0.6, 0, 1) * np.clip((0.4 - np.abs(ny)) / 0.6, 0, 1)
    dx += grasp_l * (np.sin(theta) * 16.0)
    dy += grasp_l * (-np.cos(theta) * 14.0)
    dx += grasp_r * (-np.sin(theta + 1.2) * 16.0)
    dy += grasp_r * (-np.cos(theta + 1.2) * 14.0)

    # 2. Mantle & Crown Head Breathing Pulse (ny < 0.0)
    mantle_mask = np.clip((1.0 - np.abs(nx) * 1.8), 0, 1) * np.clip((-ny) / 0.8, 0, 1)
    pulse = np.sin(theta)
    dy += mantle_mask * (-pulse * 8.0)
    dx += mantle_mask * (-nx * pulse * 5.0)

    return dx, dy

# ---------------------------------------------------------------------------
# 5. LANTERNFIN (Flyer / Swimmer)
# ---------------------------------------------------------------------------
def displacement_lanternfin(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # 1. Angler Lure & Stalk: Physical pendulum swing (nx > 0.2, ny < -0.2)
    lure_mask = np.clip((nx - 0.15) / 0.75, 0, 1) * np.clip((-ny - 0.1) / 0.85, 0, 1) ** 1.2
    lure_swing = np.sin(theta) * 24.0
    lure_lift = -np.abs(np.sin(theta)) * 10.0
    dx += lure_mask * lure_swing
    dy += lure_mask * lure_lift

    # 2. Caudal Tail Fin Sweep (nx < -0.15)
    tail_mask = np.clip((-nx - 0.1) / 0.85, 0, 1) ** 1.3
    tail_sweep = np.sin(theta * 2.0) * 20.0
    dx += tail_mask * tail_sweep
    dy += tail_mask * (np.cos(theta * 2.0) * 8.0)

    # 3. Fish Body Swimming Surge
    body_mask = np.clip((1.0 - np.abs(nx) * 1.5), 0, 1) * np.clip((1.0 - np.abs(ny) * 1.5), 0, 1)
    dy += body_mask * (np.sin(theta) * 7.0)
    dx += body_mask * (np.cos(theta * 2.0) * 5.0)

    return dx, dy

# ---------------------------------------------------------------------------
# 6. JELLY (Splitter)
# ---------------------------------------------------------------------------
def displacement_jelly(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # True Medusa Jet-Propulsion Cycle:
    # Sharp contraction thrust, followed by buoyant upward glide
    power_thrust = np.sin(theta)
    
    # 1. Bell Dome Squash & Stretch (ny < 0.1)
    bell_mask = np.clip((0.2 - ny) / 1.1, 0, 1)
    # Dome shoots upward on contraction
    dy += bell_mask * (-power_thrust * 22.0)
    # Lateral contraction / expansion
    dx += bell_mask * (-nx * power_thrust * 14.0)

    # 2. Trailing Tentacles Undulation (ny > 0.0)
    tentacles = np.clip((ny) / 0.9, 0, 1) ** 1.3
    tentacle_wave = theta - ny * 3.8
    dx += tentacles * (np.sin(tentacle_wave) * 20.0)
    dy += tentacles * (-np.cos(tentacle_wave) * 10.0 + power_thrust * 8.0)

    return dx, dy

# ---------------------------------------------------------------------------
# 7. URCHIN (Small Splitter)
# ---------------------------------------------------------------------------
def displacement_urchin(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)

    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)

    # Radial bristling pulse
    dist = np.sqrt(nx ** 2 + ny ** 2)
    pulse = np.sin(theta * 2.0) * 12.0

    # Spines push outward and pull inward
    dx += nx * pulse * np.clip(dist / 0.8, 0, 1)
    dy += ny * pulse * np.clip(dist / 0.8, 0, 1)

    # Nervous rolling wobble
    dx += np.sin(theta * 3.0) * 5.0
    dy -= np.abs(np.cos(theta * 2.0)) * 6.0

    return dx, dy

DISPATCH = {
    'pirate': displacement_pirate,
    'crab': displacement_crab,
    'turtle': displacement_turtle,
    'kraken': displacement_kraken,
    'lanternfin': displacement_lanternfin,
    'jelly': displacement_jelly,
    'urchin': displacement_urchin,
}

def generate_stage1_frames():
    for name, disp_fn in DISPATCH.items():
        src_path = os.path.join(SRC_DIR, f'{name}.webp')
        if not os.path.exists(src_path):
            print(f'Error: {src_path} does not exist!')
            continue

        im = Image.open(src_path).convert('RGBA')
        w, h = im.size
        pw, ph = w + PAD * 2, h + PAD * 2

        padded = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
        padded.paste(im, (PAD, PAD))
        arr = np.array(padded, dtype=np.float32)

        anim_frames = []
        for i in range(FRAMES):
            theta = (i / FRAMES) * 2.0 * math.pi
            dx, dy = disp_fn(pw, ph, theta)

            yy, xx = np.mgrid[0:ph, 0:pw].astype(np.float32)
            sx = xx - dx
            sy = yy - dy

            warped = bilinear(arr, sx, sy)
            out_im = Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA')

            frame_path = os.path.join(OUT_DIR, f'{name}_{i}.webp')
            out_im.save(frame_path, 'WEBP', quality=95)
            anim_frames.append(out_im)

        # Save animated preview GIF for visual quality review
        gif_path = os.path.join(ROOT, f'stage1_{name}_frame_by_frame.gif')
        anim_frames[0].save(
            gif_path,
            save_all=True,
            append_images=anim_frames[1:],
            duration=90,
            loop=0
        )
        print(f'Generated {FRAMES} frame-by-frame webp sprites + GIF for {name}: {gif_path}')

if __name__ == '__main__':
    generate_stage1_frames()
