import os
from PIL import Image
import numpy as np

src = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084\frostling_run_spritesheet_1793826460943.jpg"
im = Image.open(src).convert('RGB')
arr = np.array(im, dtype=np.float32)

# High quality alpha extraction from white background
dist_white = np.linalg.norm(255.0 - arr, axis=-1)
alpha = np.clip((dist_white - 15.0) / 20.0, 0.0, 1.0) * 255.0
rgba = np.dstack([arr, alpha]).astype(np.uint8)
out_im = Image.fromarray(rgba, 'RGBA')

blocks = [(60, 334), (410, 655), (708, 991), (1042, 1315)]
poses = []
max_w, max_h = 320, 360

for idx, (x0, x1) in enumerate(blocks):
    col_crop = out_im.crop((x0, 0, x1, out_im.height))
    bb = col_crop.getbbox()
    if bb:
        tight = col_crop.crop(bb)
        # Center horizontally, ground-align vertically
        canv = Image.new('RGBA', (max_w, max_h), (0, 0, 0, 0))
        px = (max_w - tight.width) // 2
        py = max_h - tight.height - 20
        canv.paste(tight, (px, py), tight)
        poses.append(canv)
        p_path = rf"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084\frostling_hand_pose_{idx}.png"
        canv.save(p_path)
        print(f"Saved pose {idx}: size {tight.size}")

gif_path = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084\frostling_hand_4poses.gif"
poses[0].save(gif_path, save_all=True, append_images=poses[1:], duration=140, loop=0)
print("Saved 4-pose preview:", gif_path)
