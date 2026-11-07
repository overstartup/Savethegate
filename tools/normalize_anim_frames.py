"""Make every frame of an enemy set the same size and stop it drifting.

For each set (game/assets/sprites/anim/<name>_<i>.webp):
- find where the art sits in each frame (alpha bounding box),
- move each frame so its centre-x and foot line match the set's median,
  so only the real motion of the art is left and the whole body does not drift,
- pad every frame onto one shared canvas, so the drawn size never jumps.

Run:  python tools/normalize_anim_frames.py
"""
import os
import re
import statistics
from collections import defaultdict
from PIL import Image

ANIM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game', 'assets', 'sprites', 'anim')
FRAME = re.compile(r'([a-zA-Z]+)_(\d+)\.webp')
ALPHA_MIN = 40  # ignore faint glows when measuring where the body sits


def body_box(im):
    a = im.getchannel('A').point(lambda v: 255 if v >= ALPHA_MIN else 0)
    box = a.getbbox()
    return box  # (x0, y0, x1, y1) or None


def normalize(name, files):
    frames = [Image.open(os.path.join(ANIM, f)).convert('RGBA') for f in files]
    boxes = [body_box(im) for im in frames]
    ok = [b for b in boxes if b]
    if not ok:
        return
    med_cx = statistics.median((b[0] + b[2]) / 2 for b in ok)
    med_bottom = statistics.median(b[3] for b in ok)
    offs = []
    for b in boxes:
        if not b:
            offs.append((0, 0))
            continue
        offs.append((round(med_cx - (b[0] + b[2]) / 2), round(med_bottom - b[3])))
    mx = max(abs(o[0]) for o in offs)
    my = max(abs(o[1]) for o in offs)
    W = max(im.width for im in frames) + 2 * mx
    H = max(im.height for im in frames) + 2 * my
    for f, im, (ox, oy) in zip(files, frames, offs):
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((W - im.width) // 2 + ox, (H - im.height) // 2 + oy))
        canvas.save(os.path.join(ANIM, f), quality=90, method=6)
    print(f'{name}: {len(files)} frames -> {W}x{H}, max shift x{mx} y{my}')


if __name__ == '__main__':
    sets = defaultdict(list)
    for f in os.listdir(ANIM):
        m = FRAME.fullmatch(f)
        if m:
            sets[m.group(1)].append(f)
    for name in sorted(sets):
        normalize(name, sorted(sets[name], key=lambda f: int(FRAME.fullmatch(f).group(2))))
