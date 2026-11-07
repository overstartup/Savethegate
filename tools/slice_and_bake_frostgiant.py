import os
from PIL import Image
import numpy as np

src = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084\frost_giant_king_spritesheet_v3_1793828614875.jpg"
im = Image.open(src).convert('RGB')
arr = np.array(im, dtype=np.float32)

# High quality alpha extraction from white background
dist_white = np.linalg.norm(255.0 - arr, axis=-1)
alpha = np.clip((dist_white - 15.0) / 22.0, 0.0, 1.0) * 255.0
rgba = np.dstack([arr, alpha]).astype(np.uint8)
out_im = Image.fromarray(rgba, 'RGBA')

# Crop 4 distinct poses
# Pose 0: (30, 0, 350, h)
p0_crop = out_im.crop((30, 0, 350, out_im.height))

# Pose 1: (360, 0, 695, h), zero out x_abs > 665 and y < 270
p1_arr = np.array(out_im.crop((360, 0, 695, out_im.height)))
p1_arr[:270, (665 - 360):, 3] = 0
p1_crop = Image.fromarray(p1_arr)

# Pose 2: (670, 0, 1025, h), zero out x_abs < 695 and y >= 270
p2_arr = np.array(out_im.crop((670, 0, 1025, out_im.height)))
p2_arr[270:, :(695 - 670), 3] = 0
p2_crop = Image.fromarray(p2_arr)

# Pose 3: (1020, 0, 1365, h)
p3_crop = out_im.crop((1020, 0, 1365, out_im.height))

raw_poses = [p0_crop, p1_crop, p2_crop, p3_crop]
CANV_SIZE = 580
ground_y = CANV_SIZE - 40 # feet touch this line

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"
aligned_poses = []

for idx, p in enumerate(raw_poses):
    bb = p.getbbox()
    tight = p.crop(bb)
    canv = Image.new('RGBA', (CANV_SIZE, CANV_SIZE), (0, 0, 0, 0))
    px = (CANV_SIZE - tight.width) // 2
    # Ground alignment: align bottom of feet to ground_y
    py = ground_y - tight.height
    canv.paste(tight, (px, py), tight)
    aligned_poses.append(canv)
    p_path = os.path.join(artifact_dir, f"frostgiant_front_pose_{idx}.png")
    canv.save(p_path)
    print(f"Saved Frost Giant pose {idx}: original size {tight.size}")

p0, p1, p2, p3 = aligned_poses

def blend(imA, imB, alpha_factor):
    a = np.array(imA, dtype=np.float32)
    b = np.array(imB, dtype=np.float32)
    res = a * (1.0 - alpha_factor) + b * alpha_factor
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), 'RGBA')

# 16-frame cycle:
# 0..3: Pose 0 (ready carry) -> Pose 1 (heave up onto shoulder)
# 4..7: Pose 1 (shoulder heave) -> Pose 2 (OVERHEAD APEX & STOMP - hand up high!)
# 8..11: Pose 2 (overhead apex) -> Pose 3 (DOWNWARD HAMMER SLAM - hand goes down!)
# 12..15: Pose 3 (slam follow-through) -> Pose 0 (rebound & reset)
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

# Standard game resolution 440x440
frames_16_game = [f.resize((440, 440), Image.Resampling.LANCZOS) for f in frames_16]
p0_game = p0.resize((440, 440), Image.Resampling.LANCZOS)

# Save preview GIF
preview_path = os.path.join(artifact_dir, "frostgiant_clean_direct_front_16.gif")
frames_16_game[0].save(preview_path, save_all=True, append_images=frames_16_game[1:], duration=75, loop=0)
print("Saved 16-frame preview GIF:", preview_path)

# Save master sprite
p0_game.save("game/assets/sprites/ice/frostgiant.webp", format="WEBP", quality=95)
print("Updated game/assets/sprites/ice/frostgiant.webp")

# Save all 16 webp frames
for i, f_img in enumerate(frames_16_game):
    dest = f"game/assets/sprites/anim/frostgiant_{i}.webp"
    f_img.save(dest, format="WEBP", quality=95)
print("Saved 16 webp frames to game/assets/sprites/anim/frostgiant_*.webp")
