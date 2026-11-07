import os
from PIL import Image
import numpy as np

src = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084\yeti_walk_spritesheet_1793827648435.jpg"
im = Image.open(src).convert('RGB')
arr = np.array(im, dtype=np.float32)

# High quality alpha extraction from white background
dist_white = np.linalg.norm(255.0 - arr, axis=-1)
alpha = np.clip((dist_white - 15.0) / 22.0, 0.0, 1.0) * 255.0
rgba = np.dstack([arr, alpha]).astype(np.uint8)
out_im = Image.fromarray(rgba, 'RGBA')

blocks = [(26, 349), (362, 688), (703, 1019), (1035, 1348)]
poses = []
CANV_SIZE = 560

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"

for idx, (x0, x1) in enumerate(blocks):
    col_crop = out_im.crop((x0, 0, x1, out_im.height))
    bb = col_crop.getbbox()
    if bb:
        tight = col_crop.crop(bb)
        canv = Image.new('RGBA', (CANV_SIZE, CANV_SIZE), (0, 0, 0, 0))
        px = (CANV_SIZE - tight.width) // 2
        # Ground align: bottom margin 35px
        py = CANV_SIZE - tight.height - 35
        canv.paste(tight, (px, py), tight)
        poses.append(canv)
        p_path = os.path.join(artifact_dir, f"yeti_front_pose_{idx}.png")
        canv.save(p_path)
        print(f"Saved Yeti pose {idx}: original size {tight.size}")

p0, p1, p2, p3 = poses

def blend(imA, imB, alpha_factor):
    a = np.array(imA, dtype=np.float32)
    b = np.array(imB, dtype=np.float32)
    res = a * (1.0 - alpha_factor) + b * alpha_factor
    return Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), 'RGBA')

# 16 frames cycle:
# 0..3: Left leg strike & forward stride (p0 -> p1)
# 4..7: Drop into heavy ape crouch (p1 -> p2)
# 8..11: Right leg strike & forward stride (p2 -> p3)
# 12..15: Mid-air stride spring & rebound (p3 -> p0)
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

# Resize to standard crisp 400x400 game resolution
frames_16_game = [f.resize((400, 400), Image.Resampling.LANCZOS) for f in frames_16]
p0_game = p0.resize((400, 400), Image.Resampling.LANCZOS)

# Save preview GIF
preview_path = os.path.join(artifact_dir, "yeti_clean_direct_front_16.gif")
frames_16_game[0].save(preview_path, save_all=True, append_images=frames_16_game[1:], duration=70, loop=0)
print("Saved 16-frame preview GIF:", preview_path)

# Save master sprite
p0_game.save("game/assets/sprites/ice/yeti.webp", format="WEBP", quality=95)
print("Updated game/assets/sprites/ice/yeti.webp")

# Save all 16 webp frames
for i, f_img in enumerate(frames_16_game):
    dest = f"game/assets/sprites/anim/yeti_{i}.webp"
    f_img.save(dest, format="WEBP", quality=95)
print("Saved 16 webp frames to game/assets/sprites/anim/yeti_*.webp")
