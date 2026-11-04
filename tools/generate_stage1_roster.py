import os
from PIL import Image, ImageDraw, ImageFont

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

# All 7 Stage 1 enemies
enemies = [
    ('Crab', 'goblin', 'Scuttler / Swarm', 'crab_0.webp'),
    ('Jellyfish', 'slime', 'Swimmer / Splitter', 'jelly_0.webp'),
    ('Urchin', 'slimeSmall', 'Spike Child', 'urchin_0.webp'),
    ('Lanternfin', 'imp', 'Flyer / Shooter', 'lanternfin_0.webp'),
    ('Pirate', 'skeleton', 'Fast Slasher', 'pirate_0.webp'),
    ('Turtle', 'troll', 'Armored Heavy Tank', 'turtle_0.webp'),
    ('Kraken', 'ogreBoss', 'Stage 1 Final Boss', 'kraken_0.webp'),
]

card_w, card_h = 240, 240
cols = 4
rows = 2
out_w = cols * card_w
out_h = rows * card_h

bg = Image.new('RGBA', (out_w, out_h), (10, 26, 46, 255))
draw = ImageDraw.Draw(bg)

for i, (name, role, desc, file) in enumerate(enemies):
    c = i % cols
    r = i // cols
    bx = c * card_w
    by = r * card_h

    # Card background
    draw.rounded_rectangle([bx + 8, by + 8, bx + card_w - 8, by + card_h - 8], radius=16, fill=(16, 42, 70, 255), outline=(60, 160, 220, 255), width=2)

    # Load and scale sprite
    sprite_path = os.path.join('game/assets/sprites/anim', file)
    im = Image.open(sprite_path)
    # Fit into 130x130 box
    scale = min(130 / im.width, 130 / im.height)
    sw = int(im.width * scale)
    sh = int(im.height * scale)
    im_scaled = im.resize((sw, sh), Image.LANCZOS)

    # Paste sprite
    px = bx + (card_w - sw) // 2
    py = by + 20 + (130 - sh) // 2
    bg.paste(im_scaled, (px, py), im_scaled)

    # Text
    draw.text((bx + card_w // 2, by + 165), name, fill=(255, 235, 120), anchor='mm')
    draw.text((bx + card_w // 2, by + 185), f'Role: {role}', fill=(140, 220, 255), anchor='mm')
    draw.text((bx + card_w // 2, by + 205), desc, fill=(180, 200, 220), anchor='mm')

# 8th card: Status Badge
bx = 3 * card_w
by = 1 * card_h
draw.rounded_rectangle([bx + 8, by + 8, bx + card_w - 8, by + card_h - 8], radius=16, fill=(20, 60, 50, 255), outline=(80, 220, 140, 255), width=2)
draw.text((bx + card_w // 2, by + 70), 'STAGE 1', fill=(100, 240, 160), anchor='mm')
draw.text((bx + card_w // 2, by + 105), 'SEA WAR', fill=(255, 255, 255), anchor='mm')
draw.text((bx + card_w // 2, by + 140), 'ALL 7 ENEMIES', fill=(255, 220, 100), anchor='mm')
draw.text((bx + card_w // 2, by + 175), 'COMPLETE & IN GAME', fill=(100, 240, 160), anchor='mm')

out_path = os.path.join(artifact_dir, 'stage1_all_enemies_complete.png')
bg.save(out_path)
print('Saved stage1_all_enemies_complete.png successfully!')

