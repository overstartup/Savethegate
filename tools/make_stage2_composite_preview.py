from PIL import Image, ImageDraw
import os

NAMES = ['yeti', 'snowblob', 'frostling', 'wraith', 'frostgiant', 'icebat']
LABELS = ['Glacial Yeti', 'Bouncy Snow Blob', 'Frostling Rogue', 'Ice Wraith', 'Frost Giant Boss', 'Ice Bat']

creature_frames = {}
for name in NAMES:
    frames = []
    for i in range(16):
        im = Image.open(f'game/assets/sprites/anim/{name}_{i}.webp').convert('RGBA')
        frames.append(im)
    creature_frames[name] = frames

cell_w = 280
cell_h = 260
grid_w = cell_w * 3
grid_h = cell_h * 2 + 50

bg_color = (20, 38, 60, 255) # Frosty glacial dark blue

composite_frames = []
for f in range(16):
    img = Image.new('RGBA', (grid_w, grid_h), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((grid_w // 2, 25), "STAGE 2: GLACIAL PEAK - 16-FRAME SKELETAL RIG ENEMY LINEUP", fill=(190, 240, 255, 255), anchor="mm")

    for idx, (name, label) in enumerate(zip(NAMES, LABELS)):
        col = idx % 3
        row = idx // 3
        cx = col * cell_w + cell_w // 2
        cy = 50 + row * cell_h + cell_h // 2
        
        cf = creature_frames[name][f]
        w, h = cf.size
        scale = min(200.0 / w, 180.0 / h, 1.0)
        nw, nh = int(w * scale), int(h * scale)
        scaled = cf.resize((nw, nh), Image.Resampling.BILINEAR)

        px = int(cx - nw // 2)
        py = int(cy - nh // 2 - 12)
        img.alpha_composite(scaled, (px, py))

        draw.text((cx, cy + 85), label, fill=(220, 245, 255, 255), anchor="mm")
        draw.text((cx, cy + 102), f"Frame {f+1}/16", fill=(140, 190, 230, 255), anchor="mm")

    composite_frames.append(img.convert('RGB'))

artifact_dir = "C:/Users/over2/.gemini/antigravity/brain/0d5657c5-14eb-4bb6-b979-b36f27ef2084"
out_gif = os.path.join(artifact_dir, "stage2_16_frames_lineup.gif")
composite_frames[0].save(out_gif, save_all=True, append_images=composite_frames[1:], duration=60, loop=0)
print(f"Saved {out_gif}!")
