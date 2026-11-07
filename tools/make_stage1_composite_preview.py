from PIL import Image, ImageDraw, ImageFont
import glob
import os

NAMES = ['pirate', 'crab', 'turtle', 'kraken', 'lanternfin', 'jelly', 'urchin']
LABELS = ['Pirate Captain', 'Armored Crab', 'Dragon Turtle', 'Colossal Kraken', 'Lanternfin', 'Crystal Jelly', 'Deep Urchin']

# Load frames
creature_frames = {}
for name in NAMES:
    frames = []
    for i in range(16):
        im = Image.open(f'game/assets/sprites/anim/{name}_{i}.webp').convert('RGBA')
        frames.append(im)
    creature_frames[name] = frames

# Canvas size: 7 columns or 2 rows
# Let's do 2 rows: row 1 (4 enemies), row 2 (3 enemies centered)
cell_w = 260
cell_h = 240
grid_w = cell_w * 4
grid_h = cell_h * 2 + 50

bg_color = (14, 24, 45, 255) # Deep oceanic dark blue

composite_frames = []
for f in range(16):
    img = Image.new('RGBA', (grid_w, grid_h), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.text((grid_w // 2, 25), "STAGE 1: SEA WAR - 16-FRAME SKELETAL RIG ENEMY LINEUP", fill=(255, 215, 0, 255), anchor="mm")

    # Render each enemy
    for idx, (name, label) in enumerate(zip(NAMES, LABELS)):
        if idx < 4:
            col = idx
            row = 0
            cx = col * cell_w + cell_w // 2
            cy = 50 + cell_h // 2
        else:
            col = idx - 4
            row = 1
            cx = int((col + 0.5) * cell_w + cell_w // 2)
            cy = int(50 + cell_h + cell_h // 2)
        
        cf = creature_frames[name][f]
        # fit inside 200x180
        w, h = cf.size
        scale = min(200.0 / w, 180.0 / h, 1.0)
        nw, nh = int(w * scale), int(h * scale)
        scaled = cf.resize((nw, nh), Image.Resampling.BILINEAR)

        px = int(cx - nw // 2)
        py = int(cy - nh // 2 - 10)
        img.alpha_composite(scaled, (px, py))

        # Draw label
        draw.text((cx, cy + 85), label, fill=(180, 220, 255, 255), anchor="mm")
        draw.text((cx, cy + 102), f"Frame {f+1}/16", fill=(120, 160, 200, 255), anchor="mm")

    composite_frames.append(img.convert('RGB'))

artifact_dir = "C:/Users/over2/.gemini/antigravity/brain/0d5657c5-14eb-4bb6-b979-b36f27ef2084"
out_gif = os.path.join(artifact_dir, "stage1_16_frames_lineup.gif")
composite_frames[0].save(out_gif, save_all=True, append_images=composite_frames[1:], duration=60, loop=0)
print(f"Saved {out_gif}!")
