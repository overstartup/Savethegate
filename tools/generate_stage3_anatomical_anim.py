"""Generate high-quality anatomical 8-frame movement animations for Stage 3 (Oasis Citadel) enemies.
Each frame articulates the exact anatomical parts of the creature:
- Mummy: Coherent anatomical walk cycle (alternating leg strides, menacing reaching arms, cloth flutter, chest glow).
- Scarab: Tripod gait leg articulation, snapping mandibles, carapace bob.
- Dustdevil: Swirling desert vortex rotation, whipping sand funnel, glowing eye pulse.
- Vulture: Full avian wing flap power strokes, body surge, talon tuck.
- Scorpion: Snapping pincer thrusts, arching venom stinger strike, 6-leg crawl.
- Sphinx: Majestic wing flap, muscular lion paw tread, regal chest expansion.
"""
import os
import math
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'game', 'assets', 'sprites', 'desert')
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

def smooth_mask(dist, radius, feather=0.4):
    norm = np.clip((dist) / max(1e-5, radius), 0.0, 1.0)
    # Cosine smoothstep: 1 at center, 0 at edge
    return 0.5 + 0.5 * np.cos(norm * np.pi)

def displacement_mummy(w, h, theta):
    # Normalized coords: -1..1 across sprite
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # 1. Torso & Pelvis: Core body walk sway (sinusoidal, natural weight shift)
    stride = np.sin(theta)
    bob = -np.abs(np.sin(theta)) * 10.0
    body_sway = stride * 5.0
    
    # 2. Legs: Anatomically separated left leg (nx < 0) and right leg (nx > 0)
    leg_mask_l = np.clip((-nx - 0.02) / 0.45, 0, 1) * np.clip((ny - 0.15) / 0.8, 0, 1) ** 1.3
    leg_mask_r = np.clip((nx - 0.02) / 0.45, 0, 1) * np.clip((ny - 0.15) / 0.8, 0, 1) ** 1.3
    
    # Left leg stride: forward lift, knee bend, foot plant
    leg_l_lift = np.maximum(0, -stride) ** 1.3
    leg_l_thrust = -np.cos(theta) * 14.0
    # Right leg stride: alternating phase
    leg_r_lift = np.maximum(0, stride) ** 1.3
    leg_r_thrust = np.cos(theta) * 14.0
    
    dy += leg_mask_l * (-leg_l_lift * 24.0 + leg_l_thrust * 0.4)
    dx += leg_mask_l * (np.cos(theta) * 10.0)
    
    dy += leg_mask_r * (-leg_r_lift * 24.0 + leg_r_thrust * 0.4)
    dx += leg_mask_r * (-np.cos(theta) * 10.0)
    
    # 3. Torso & Kilt: Connected smooth weight transfer
    torso_mask = np.clip((1.0 - np.abs(nx) * 1.5), 0, 1) * np.clip((0.4 - np.abs(ny - 0.05)) / 0.5, 0, 1)
    dy += torso_mask * bob
    dx += torso_mask * body_sway
    
    # 4. Arms & Hands: Menacing undead reach
    # Left arm (our view left) reaches forward aggressively when right leg is forward
    arm_mask_l = np.clip((-nx - 0.2) / 0.65, 0, 1) * np.clip((0.35 - ny) / 0.75, 0, 1)
    arm_mask_r = np.clip((nx - 0.2) / 0.65, 0, 1) * np.clip((0.35 - ny) / 0.75, 0, 1)
    
    reach_l = np.cos(theta) * 16.0
    reach_r = -np.cos(theta) * 16.0
    
    dy += arm_mask_l * (reach_l + bob * 0.5)
    dx += arm_mask_l * (stride * 12.0)
    
    dy += arm_mask_r * (reach_r + bob * 0.5)
    dx += arm_mask_r * (stride * 12.0)
    
    # 5. Head & Pharaoh Nemes headdress: Confident, menacing undead nod
    head_mask = np.clip((1.0 - np.abs(nx) * 1.8), 0, 1) * np.clip((-ny - 0.2) / 0.75, 0, 1)
    dy += head_mask * (bob * 0.75 + np.sin(theta * 2.0) * 3.0)
    dx += head_mask * (body_sway * 0.6)
    
    # 6. Trailing bandage ribbons: Fluid cloth ripple
    bandage_mask = np.clip((np.abs(nx) - 0.35) / 0.65, 0, 1) * np.clip((ny - 0.0) / 0.8, 0, 1)
    dx += bandage_mask * np.sin(theta * 1.5 + ny * 4.0) * 12.0
    dy += bandage_mask * np.cos(theta * 1.5 + ny * 3.0) * 6.0
    
    return dx, dy

def displacement_scarab(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # Insect tripod gait: Left front/rear + Right mid vs Right front/rear + Left mid
    phase_a = np.sin(theta * 2.0)
    phase_b = -phase_a
    
    # Left legs
    front_leg_l = np.clip((-nx - 0.25) / 0.65, 0, 1) * np.clip((ny - 0.2) / 0.75, 0, 1)
    mid_leg_l   = np.clip((-nx - 0.35) / 0.65, 0, 1) * np.clip((0.3 - np.abs(ny)) / 0.4, 0, 1)
    rear_leg_l  = np.clip((-nx - 0.25) / 0.65, 0, 1) * np.clip((-ny - 0.1) / 0.75, 0, 1)
    
    # Right legs
    front_leg_r = np.clip((nx - 0.25) / 0.65, 0, 1) * np.clip((ny - 0.2) / 0.75, 0, 1)
    mid_leg_r   = np.clip((nx - 0.35) / 0.65, 0, 1) * np.clip((0.3 - np.abs(ny)) / 0.4, 0, 1)
    rear_leg_r  = np.clip((nx - 0.25) / 0.65, 0, 1) * np.clip((-ny - 0.1) / 0.75, 0, 1)
    
    # Leg movements
    dx += front_leg_l * (-phase_a * 18.0)
    dy += front_leg_l * (np.cos(theta * 2.0) * 14.0)
    
    dx += mid_leg_l * (-phase_b * 16.0)
    dy += mid_leg_l * (-np.cos(theta * 2.0) * 12.0)
    
    dx += rear_leg_l * (-phase_a * 15.0)
    dy += rear_leg_l * (np.cos(theta * 2.0) * 12.0)
    
    dx += front_leg_r * (phase_b * 18.0)
    dy += front_leg_r * (-np.cos(theta * 2.0) * 14.0)
    
    dx += mid_leg_r * (phase_a * 16.0)
    dy += mid_leg_r * (np.cos(theta * 2.0) * 12.0)
    
    dx += rear_leg_r * (phase_b * 15.0)
    dy += rear_leg_r * (-np.cos(theta * 2.0) * 12.0)
    
    # Snapping Mandibles (front center): open and clamp
    mandible_l = np.clip((-nx - 0.05) / 0.35, 0, 1) * np.clip((ny - 0.25) / 0.65, 0, 1)
    mandible_r = np.clip((nx - 0.05) / 0.35, 0, 1) * np.clip((ny - 0.25) / 0.65, 0, 1)
    snap = np.sin(theta * 4.0)
    dx += mandible_l * (-snap * 10.0)
    dx += mandible_r * (snap * 10.0)
    dy += (mandible_l + mandible_r) * (np.abs(snap) * 6.0)
    
    # Carapace & Body: Weight shift & crawl rumble
    body_mask = np.clip(1.0 - (nx**2 + ny**2), 0, 1) ** 1.5
    dy += body_mask * (-np.abs(np.sin(theta * 2.0)) * 6.0)
    dx += body_mask * (np.sin(theta) * 4.0)
    
    return dx, dy

def displacement_dustdevil(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # 1. Tornado Swirl: rotational displacement around center
    # Funnel wider at top (ny < 0) and tapered at bottom tip (ny > 0.5)
    width_factor = np.clip((0.8 - ny) / 1.5, 0.2, 1.2)
    
    # Multi-frequency high-speed vortex rotation
    spin_angle = theta * 3.5 + ny * 6.0
    dx += np.sin(spin_angle) * (26.0 * width_factor)
    dy += np.cos(spin_angle) * (8.0 * width_factor)
    
    # 2. Dynamic S-curve funnel whip
    whip_phase = theta * 1.5
    funnel_whip = np.sin(whip_phase - ny * 3.0) * (20.0 * (1.0 - np.abs(ny) * 0.4))
    dx += funnel_whip
    
    # 3. Upward draft / updraft suction
    dy -= 14.0 * np.abs(np.sin(theta * 2.0))
    
    # 4. Orbiting dust cloud puffs
    outer_dust = np.clip((np.abs(nx) - 0.3) / 0.7, 0, 1)
    dx += outer_dust * np.sin(theta * 4.0 + ny * 8.0) * 14.0
    dy += outer_dust * np.cos(theta * 3.0 + nx * 5.0) * 10.0
    
    # 5. Menacing Eyes: focused intensity pulse
    eye_mask = np.clip((1.0 - np.abs(nx) * 2.2), 0, 1) * np.clip((0.3 - np.abs(ny + 0.1)) / 0.3, 0, 1)
    dy += eye_mask * (np.sin(theta * 2.0) * 4.0)
    dx += eye_mask * (funnel_whip * 0.3)
    
    return dx, dy

def displacement_vulture(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # True Avian Flight Cycle: Power downstroke vs recovery upstroke
    # Downstroke is fast & powerful, upstroke has slight wing fold
    flap = np.sin(theta)
    
    # Left and right wings
    wing_l = np.clip((-nx - 0.15) / 0.85, 0, 1) ** 1.1
    wing_r = np.clip((nx - 0.15) / 0.85, 0, 1) ** 1.1
    
    # Outer primary feathers get massive sweep
    feather_l = np.clip((-nx - 0.5) / 0.5, 0, 1) ** 1.3
    feather_r = np.clip((nx - 0.5) / 0.5, 0, 1) ** 1.3
    
    # 1. Vertical wing sweep: powerful downstroke
    dy += wing_l * (flap * 52.0)
    dy += wing_r * (flap * 52.0)
    
    dy += feather_l * (np.sin(theta + 0.4) * 22.0)
    dy += feather_r * (np.sin(theta + 0.4) * 22.0)
    
    # 2. Horizontal wing span flex: wings spread on downstroke, fold slightly on upstroke
    dx += wing_l * (-flap * 16.0)
    dx += wing_r * (flap * 16.0)
    
    # 3. Body Surge: when wings push down (flap < 0 in displacement means pushing down in screen coords),
    # body rises up
    body_mask = np.clip((1.0 - np.abs(nx) * 2.5), 0, 1) * np.clip((1.0 - np.abs(ny) * 1.5), 0, 1)
    dy += body_mask * (-flap * 16.0)
    
    # 4. Head & Talons: Raptor forward surge
    head_mask = np.clip((1.0 - np.abs(nx) * 2.5), 0, 1) * np.clip((0.4 - ny) / 0.6, 0, 1)
    dy += head_mask * (-flap * 12.0 + np.sin(theta * 2.0) * 3.0)
    
    talon_mask = np.clip((1.0 - np.abs(nx) * 2.0), 0, 1) * np.clip((ny - 0.3) / 0.6, 0, 1)
    dy += talon_mask * (-flap * 14.0)
    
    return dx, dy

def displacement_scorpion(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # 1. Giant Pincers: Alternating aggressive thrust & snap
    pincer_l = np.clip((-nx - 0.25) / 0.75, 0, 1) * np.clip((0.4 - ny) / 0.9, 0, 1)
    pincer_r = np.clip((nx - 0.25) / 0.75, 0, 1) * np.clip((0.4 - ny) / 0.9, 0, 1)
    
    thrust_l = np.sin(theta) * 18.0
    thrust_r = -np.sin(theta) * 18.0
    snap_l = np.maximum(0, np.cos(theta)) * 12.0
    snap_r = np.maximum(0, -np.cos(theta)) * 12.0
    
    dy += pincer_l * thrust_l
    dx += pincer_l * (-snap_l)
    
    dy += pincer_r * thrust_r
    dx += pincer_r * (snap_r)
    
    # 2. Venom Stinger Tail: Arches forward and strikes
    tail_mask = np.clip((1.0 - np.abs(nx) * 2.5), 0, 1) * np.clip((-ny - 0.1) / 0.85, 0, 1)
    stinger_strike = np.sin(theta * 2.0) * 22.0
    tail_sway = np.cos(theta) * 12.0
    
    dy += tail_mask * (-np.maximum(0, stinger_strike) * 1.4 + np.abs(tail_sway) * 0.3)
    dx += tail_mask * tail_sway
    
    # 3. 6 Walking Legs: Arachnid crawling cadence
    legs_l = np.clip((-nx - 0.1) / 0.8, 0, 1) * np.clip((ny - 0.05) / 0.85, 0, 1)
    legs_r = np.clip((nx - 0.1) / 0.8, 0, 1) * np.clip((ny - 0.05) / 0.85, 0, 1)
    
    crawl_l = np.sin(theta * 2.0) * 14.0
    crawl_r = -crawl_l
    
    dy += legs_l * crawl_l
    dx += legs_l * (np.cos(theta * 2.0) * 8.0)
    
    dy += legs_r * crawl_r
    dx += legs_r * (-np.cos(theta * 2.0) * 8.0)
    
    # 4. Heavily armored carapace: Solid predator rumble
    body_mask = np.clip((1.0 - np.abs(nx) * 1.8), 0, 1) * np.clip((0.4 - np.abs(ny)) / 0.6, 0, 1)
    dy += body_mask * (-np.abs(np.sin(theta * 2.0)) * 6.0)
    dx += body_mask * (np.sin(theta) * 5.0)
    
    return dx, dy

def displacement_sphinx(w, h, theta):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    nx = (xx - cx) / (w / 2)
    ny = (yy - cy) / (h / 2)
    
    dx = np.zeros((h, w), np.float32)
    dy = np.zeros((h, w), np.float32)
    
    # 1. Grand Golden Wings: Majestic power stroke flap
    flap = np.sin(theta)
    wing_l = np.clip((-nx - 0.25) / 0.75, 0, 1) ** 1.1
    wing_r = np.clip((nx - 0.25) / 0.75, 0, 1) ** 1.1
    
    dy += wing_l * (flap * 44.0)
    dx += wing_l * (-flap * 14.0)
    
    dy += wing_r * (flap * 44.0)
    dx += wing_r * (flap * 14.0)
    
    # 2. Lion Front Paws: Alternating regal tread
    stride = np.sin(theta)
    paw_l = np.clip((-nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.3) / 0.65, 0, 1)
    paw_r = np.clip((nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.3) / 0.65, 0, 1)
    
    dy += paw_l * (-np.maximum(0, -stride) * 18.0)
    dy += paw_r * (-np.maximum(0, stride) * 18.0)
    
    # 3. Regal Pharaoh Body & Chest: Breathing expansion and majestic rise
    chest_mask = np.clip((1.0 - np.abs(nx) * 2.0), 0, 1) * np.clip((0.5 - np.abs(ny)) / 0.6, 0, 1)
    dy += chest_mask * (-flap * 12.0 - np.abs(stride) * 6.0)
    dx += chest_mask * (stride * 4.0)
    
    # 4. Sun Disc & Nemes Crown: Golden radiance hover
    head_mask = np.clip((1.0 - np.abs(nx) * 2.2), 0, 1) * np.clip((-ny - 0.15) / 0.8, 0, 1)
    dy += head_mask * (-flap * 10.0 + np.sin(theta * 2.0) * 3.0)
    
    return dx, dy

DISPATCH = {
    'mummy': displacement_mummy,
    'scarab': displacement_scarab,
    'dustdevil': displacement_dustdevil,
    'vulture': displacement_vulture,
    'scorpion': displacement_scorpion,
    'sphinx': displacement_sphinx,
}

def generate_frames():
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
        
        yy, xx = np.mgrid[0:ph, 0:pw].astype(np.float32)
        
        anim_frames = []
        for i in range(FRAMES):
            theta = (i / FRAMES) * 2.0 * math.pi
            dx, dy = disp_fn(pw, ph, theta)
            
            sx = xx + dx
            sy = yy + dy
            
            warped = bilinear(arr, sx, sy)
            out_im = Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGBA')
            
            # Save frame
            frame_path = os.path.join(OUT_DIR, f'{name}_{i}.webp')
            out_im.save(frame_path, 'WEBP', quality=95)
            anim_frames.append(out_im)
            
        # Also save animated GIF for user review
        gif_path = os.path.join(r'C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba', f'stage3_{name}_animated.gif')
        anim_frames[0].save(
            gif_path,
            save_all=True,
            append_images=anim_frames[1:],
            duration=125,
            loop=0
        )
        print(f'Generated {FRAMES} frames + GIF for {name}: {gif_path}')

if __name__ == '__main__':
    generate_frames()
