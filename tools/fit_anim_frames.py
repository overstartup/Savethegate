"""Crop each enemy set to its content, pad 12px, and re-save compressed.

All frames of a set get the same crop box, so their relative positions
(and the normalized alignment) are kept. Run after normalize_anim_frames.py.
Run:  python tools/fit_anim_frames.py
"""
import os
import re
from collections import defaultdict
from PIL import Image

ANIM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'sprites', 'anim')
FRAME = re.compile(r'([a-zA-Z]+)_(\d+)\.webp')
PAD = 12
QUALITY = 82

sets = defaultdict(list)
for f in os.listdir(ANIM):
    m = FRAME.fullmatch(f)
    if m:
        sets[m.group(1)].append(f)

total_before = total_after = 0
for name in sorted(sets):
    files = sorted(sets[name], key=lambda f: int(FRAME.fullmatch(f).group(2)))
    frames = [Image.open(os.path.join(ANIM, f)).convert('RGBA') for f in files]
    total_before += sum(os.path.getsize(os.path.join(ANIM, f)) for f in files)
    boxes = [im.getchannel('A').getbbox() for im in frames]
    boxes = [b for b in boxes if b]
    if not boxes:
        continue
    x0 = max(0, min(b[0] for b in boxes) - PAD)
    y0 = max(0, min(b[1] for b in boxes) - PAD)
    x1 = min(frames[0].width, max(b[2] for b in boxes) + PAD)
    y1 = min(frames[0].height, max(b[3] for b in boxes) + PAD)
    for f, im in zip(files, frames):
        path = os.path.join(ANIM, f)
        im.crop((x0, y0, x1, y1)).save(path, quality=QUALITY, method=6)
        total_after += os.path.getsize(path)
print(f'frames: {total_before/1e6:.1f} MB -> {total_after/1e6:.1f} MB')
