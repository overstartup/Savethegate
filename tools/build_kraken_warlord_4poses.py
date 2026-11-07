import os
import math
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy.ndimage import binary_erosion

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"

# 1. Load untouched original kraken sprite
kr_src = 'game/assets/sprites/sea/kraken_head_backup.png' if os.path.exists('game/assets/sprites/sea/kraken_head_backup.png') else 'game/assets/sprites/sea/kraken.png'
kr = Image.open(kr_src).convert('RGBA')
kw, kh = kr.size # 464 x 307

head_mask = Image.new('L', (kw, kh), 0)
hdraw = ImageDraw.Draw(head_mask)
head_poly = [
    (155, 2), (310, 2),       # top of crown horns
    (320, 65), (308, 122),    # right outer crown horn
    (292, 138), (282, 165),   # right temple/cheek
    (305, 225),               # outer right beard tentacle
    (282, 255),               # right beard tip
    (258, 225),               # inner right cleft
    (242, 262),               # center-right beard tip
    (232, 238),               # center cleft
    (222, 262),               # center-left beard tip
    (206, 225),               # inner left cleft
    (182, 255),               # left beard tip
    (159, 225),               # outer left beard tentacle
    (182, 165), (172, 138),   # left cheek/temple
    (156, 122), (144, 65)     # left outer crown horn
]
hdraw.polygon(head_poly, fill=255)

kr_arr = np.array(kr).copy()
m_arr = np.array(head_mask)
inside = m_arr > 128
eroded = binary_erosion(inside, iterations=4)
border = inside & (~eroded)
yy_k, xx_k = np.mgrid[0:kh, 0:kw]
bottom_border = border & (yy_k > 195)

head_rgba = kr_arr.copy()
head_rgba[~inside, 3] = 0
head_rgba[bottom_border, 0] = 12
head_rgba[bottom_border, 1] = 28
head_rgba[bottom_border, 2] = 34
head_rgba[bottom_border, 3] = 255

# Boost vibrancy of the Kraken head's golden eyes & crown gem and sea-teal skin
r_h = head_rgba[:, :, 0].astype(np.float32)
g_h = head_rgba[:, :, 1].astype(np.float32)
b_h = head_rgba[:, :, 2].astype(np.float32)
is_teal_h = (g_h > r_h + 15) & (head_rgba[:, :, 3] > 50)
head_rgba[is_teal_h, 1] = np.clip(g_h[is_teal_h] * 1.18 + 10, 0, 255).astype(np.uint8)
head_rgba[is_teal_h, 2] = np.clip(b_h[is_teal_h] * 1.12 + 8, 0, 255).astype(np.uint8)

head_im = Image.fromarray(head_rgba, 'RGBA')
kraken_head = head_im.crop(head_im.getbbox())

# Extract ONLY the clean upper curved tentacle arches (y: 35..142)
l_tent_mask = Image.new('L', (kw, kh), 0)
ImageDraw.Draw(l_tent_mask).polygon([(15, 35), (140, 35), (140, 140), (15, 138)], fill=255)
lt_arr = kr_arr.copy()
lt_arr[np.array(l_tent_mask) < 128, 3] = 0
left_tentacle = Image.fromarray(lt_arr, 'RGBA').crop((15, 35, 140, 142))

r_tent_mask = Image.new('L', (kw, kh), 0)
ImageDraw.Draw(r_tent_mask).polygon([(324, 35), (450, 35), (450, 138), (324, 140)], fill=255)
rt_arr = kr_arr.copy()
rt_arr[np.array(r_tent_mask) < 128, 3] = 0
right_tentacle = Image.fromarray(rt_arr, 'RGBA').crop((324, 35, 450, 142))

# Helper to draw a stylized 3-pronged Golden Abyssal Trident fin onto the weapon head
def draw_golden_trident_prongs(canv, cx, cy, angle_deg, scale=1.0):
    # Create a small high-res layer for the 3 golden prongs with thick dark outline
    sz = 180
    layer = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = sz // 2
    # Center main prong + left/right side prongs pointing UP (0 deg = up)
    prongs = [
        # Center tall prong
        [(c - int(11*scale), c + int(8*scale)), (c, c - int(48*scale)), (c + int(11*scale), c + int(8*scale))],
        # Left barb prong
        [(c - int(34*scale), c + int(12*scale)), (c - int(28*scale), c - int(32*scale)), (c - int(14*scale), c + int(10*scale))],
        # Right barb prong
        [(c + int(14*scale), c + int(10*scale)), (c + int(28*scale), c - int(32*scale)), (c + int(34*scale), c + int(12*scale))],
    ]
    for poly in prongs:
        # Outer dark cartoon outline
        d.polygon(poly, fill=(245, 190, 45, 255), outline=(14, 32, 40, 255), width=4)
    # Bright golden-white inner highlight on center prong
    hi = [(c - int(4*scale), c + int(4*scale)), (c, c - int(36*scale)), (c + int(4*scale), c + int(4*scale))]
    d.polygon(hi, fill=(255, 240, 150, 255))

    rot_layer = layer.rotate(-angle_deg, resample=Image.Resampling.BICUBIC, expand=False)
    canv.paste(rot_layer, (int(cx - c), int(cy - c)), rot_layer)

# 2. Function to transform each warrior pose into KRAKOTH, THE DEEP MAW
def transform_pose_to_kraken_boss(pose_im, pose_idx):
    arr = np.array(pose_im).copy()
    h, w, _ = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]

    # Clean stray speck in Pose 2
    if pose_idx == 2:
        arr[240:290, :140, 3] = 0

    # Erase original Frost Giant crown & upper head above the neck
    head_configs = [
        # (cx, cy_top, erase_x0, erase_x1, erase_y0, erase_y1)
        (310, 150, 258, 360, 145, 250), # Pose 0
        (298, 148, 248, 336, 145, 250), # Pose 1
        (320, 132, 268, 372, 120, 238), # Pose 2
        (322, 158, 268, 372, 155, 260), # Pose 3
    ]
    hcx, hcy, ex0, ex1, ey0, ey1 = head_configs[pose_idx]
    arr[ey0:ey1, ex0:ex1, 3] = 0

    # Extract RGB channels for palette transformation
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    is_color = (a > 30) & (lum > 38) & (b > r + 15)

    # Base transformation: Ice Cyan -> Abyssal Sea-Teal & Bioluminescent Emerald
    new_r = r.copy()
    new_g = g.copy()
    new_b = b.copy()

    new_r[is_color] = np.clip(r[is_color] * 0.65 + 12, 0, 255)
    new_g[is_color] = np.clip(g[is_color] * 1.04 + 14, 0, 255)
    new_b[is_color] = np.clip(b[is_color] * 0.78 + 10, 0, 255)

    # Region 1: Coral-Red Shoulder Pauldron Spikes (exact polygon per pose so chest armor/forearms aren't touched!)
    pauldron_polys = [
        [[(178, 205), (262, 205), (255, 285), (178, 295)], [(348, 220), (415, 220), (415, 295), (352, 285)]], # Pose 0
        [[(178, 205), (262, 205), (255, 285), (178, 295)], [(340, 220), (395, 220), (395, 285), (345, 285)]], # Pose 1
        [[(238, 225), (275, 225), (275, 275), (238, 275)], [(355, 225), (388, 225), (388, 275), (355, 275)]], # Pose 2
        [[(188, 215), (272, 215), (265, 295), (188, 305)], [(360, 230), (425, 230), (425, 305), (362, 295)]], # Pose 3
    ]
    p_mask_im = Image.new('L', (w, h), 0)
    p_draw = ImageDraw.Draw(p_mask_im)
    for poly in pauldron_polys[pose_idx]:
        p_draw.polygon(poly, fill=255)
    coral_mask = np.array(p_mask_im.filter(ImageFilter.GaussianBlur(3.0)), dtype=np.float32) / 255.0

    spike_factor = coral_mask * np.clip((lum - 85.0) / 80.0, 0.0, 1.0) * (is_color.astype(np.float32))
    coral_r = np.clip(lum * 1.35 + 45, 0, 255)
    coral_g = np.clip(lum * 0.62 + 15, 0, 255)
    coral_b = np.clip(lum * 0.42 + 10, 0, 255)
    new_r = new_r * (1.0 - spike_factor) + coral_r * spike_factor
    new_g = new_g * (1.0 - spike_factor) + coral_g * spike_factor
    new_b = new_b * (1.0 - spike_factor) + coral_b * spike_factor

    # Region 2: Exact Polygon Mask for the Golden Weapon Head in each of the 4 poses!
    hammer_polys = [
        [(225, 342), (310, 358), (294, 492), (208, 466)], # Pose 0: tilted low hammer head (100% of head, 0% of boot!)
        [(352, 142), (438, 192), (396, 256), (334, 202)], # Pose 1: shoulder-lifted hammer head
        [(162,  32), (242,  82), (188, 184), (114, 132)], # Pose 2: high overhead hammer head
        [(382, 326), (470, 326), (470, 490), (382, 490)], # Pose 3: vertical downward slam hammer head (100% of head!)
    ]
    h_mask_im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(h_mask_im).polygon(hammer_polys[pose_idx], fill=255)
    h_mask = np.array(h_mask_im.filter(ImageFilter.GaussianBlur(2.0)), dtype=np.float32) / 255.0

    # Golden belt & chest runes (exclude Pose 3 hands holding shaft across the waist)
    if pose_idx < 3:
        rune_mask = np.clip((xx - 245)/10.0, 0, 1) * np.clip((365 - xx)/10.0, 0, 1) * \
                    np.clip((yy - 295)/10.0, 0, 1) * np.clip((430 - yy)/10.0, 0, 1) * \
                    np.clip((lum - 145.0) / 45.0, 0.0, 1.0)
    else:
        rune_mask = np.zeros_like(lum)

    gold_factor = np.maximum(h_mask * np.clip((lum - 45.0) / 45.0, 0.0, 1.0), rune_mask) * (is_color.astype(np.float32))
    gold_r = np.clip(lum * 1.32 + 44, 0, 255)
    gold_g = np.clip(lum * 0.98 + 20, 0, 255)
    gold_b = np.clip(lum * 0.30 + 4, 0, 255)
    new_r = new_r * (1.0 - gold_factor) + gold_r * gold_factor
    new_g = new_g * (1.0 - gold_factor) + gold_g * gold_factor
    new_b = new_b * (1.0 - gold_factor) + gold_b * gold_factor

    arr[:, :, 0] = np.clip(new_r, 0, 255).astype(np.uint8)
    arr[:, :, 1] = np.clip(new_g, 0, 255).astype(np.uint8)
    arr[:, :, 2] = np.clip(new_b, 0, 255).astype(np.uint8)

    body_recolored = Image.fromarray(arr, 'RGBA')

    # Composite onto final canvas
    canv = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    # Layer 0: Upper Coiled Shoulder Tentacles tucked cleanly behind the pauldrons & torso!
    tent_configs = [
        (  5,  -5, -145,  20, 172), # Pose 0: ready stride
        ( -5,   6, -145,  22, 160), # Pose 1: lifting up
        (-12,  12, -135,  10, 148), # Pose 2: high overhead flare
        ( 12, -12, -142,  18, 182), # Pose 3: slamming down
    ]
    la, ra, lx_off, rx_off, ty_pos = tent_configs[pose_idx]
    lt_s = left_tentacle.resize((120, 105), Image.Resampling.LANCZOS).rotate(la, resample=Image.Resampling.BICUBIC, expand=True)
    rt_s = right_tentacle.resize((120, 105), Image.Resampling.LANCZOS).rotate(ra, resample=Image.Resampling.BICUBIC, expand=True)
    canv.paste(lt_s, (hcx + lx_off, ty_pos), lt_s)
    canv.paste(rt_s, (hcx + rx_off, ty_pos), rt_s)

    # Layer 1: Recolored Abyssal Warrior Body
    canv.paste(body_recolored, (0, 0), body_recolored)

    # Layer 2: Crowned Kraken Cephalopod Head + 4-Tentacle Beard
    kh_w, kh_h = 148, 212
    kh_scaled = kraken_head.resize((kh_w, kh_h), Image.Resampling.LANCZOS)
    head_angles = [0, -2, 2, 3]
    if head_angles[pose_idx] != 0:
        kh_scaled = kh_scaled.rotate(head_angles[pose_idx], resample=Image.Resampling.BICUBIC, expand=False)
    canv.paste(kh_scaled, (hcx - kh_w // 2, hcy), kh_scaled)

    return canv

# Build all 4 poses
kraken_poses = []
for i in range(4):
    src_pose = Image.open(os.path.join(artifact_dir, f"frostgiant_front_pose_{i}.png")).convert('RGBA')
    kp = transform_pose_to_kraken_boss(src_pose, i)
    kp_path = os.path.join(artifact_dir, f"kraken_warlord_pose_{i}.png")
    kp.save(kp_path)
    kraken_poses.append(kp)

# Save a 4-pose horizontal sheet preview showing the full boots (y: 30..555)
sheet = Image.new('RGB', (440 * 4, 525), (255, 255, 255))
for i, kp in enumerate(kraken_poses):
    cropped = kp.crop((70, 30, 510, 555))
    sheet.paste(cropped, (i * 440, 0), cropped)
sheet_path = os.path.join(artifact_dir, "kraken_warlord_4poses_sheet.png")
sheet.save(sheet_path)
print("Saved perfected 4-pose sheet:", sheet_path)

# 3. Bake the 16-frame cycle for Stage 1 Boss (kraken_0.webp .. kraken_15.webp)
p0, p1, p2, p3 = kraken_poses

def blend(imA, imB, alpha_factor):
    a = np.array(imA, dtype=np.float32)
    b = np.array(imB, dtype=np.float32)
    res = a * (1.0 - alpha_factor) + b * alpha_factor
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), 'RGBA')

frames_16 = [
    p0,
    blend(p0, p1, 0.4),
    p1,
    blend(p1, p2, 0.35),
    p2,
    blend(p2, p3, 0.4),
    p3,
    blend(p3, p0, 0.5),
    p0,
    blend(p0, p1, 0.5),
    p1,
    blend(p1, p2, 0.45),
    p2,
    blend(p2, p3, 0.5),
    p3,
    blend(p3, p0, 0.6)
]

frames_16_game = [f.resize((440, 440), Image.Resampling.LANCZOS) for f in frames_16]
p0_game = p0.resize((440, 440), Image.Resampling.LANCZOS)

# Save preview GIF
preview_path = os.path.join(artifact_dir, "kraken_clean_direct_front_16.gif")
frames_16_game[0].save(preview_path, save_all=True, append_images=frames_16_game[1:], duration=75, loop=0)
print("Saved 16-frame Kraken Boss preview GIF:", preview_path)

# Update master sprite
p0_game.save("game/assets/sprites/sea/kraken.webp", format="WEBP", quality=95)
print("Updated game/assets/sprites/sea/kraken.webp")

# Save all 16 webp frames
for i, f_img in enumerate(frames_16_game):
    dest = f"game/assets/sprites/anim/kraken_{i}.webp"
    f_img.save(dest, format="WEBP", quality=95)
print("Saved 16 webp frames to game/assets/sprites/anim/kraken_*.webp")
