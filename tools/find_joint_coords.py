import numpy as np
from PIL import Image

for name in ['pirate', 'crab', 'turtle', 'kraken', 'lanternfin', 'jelly', 'urchin']:
    p = f'game/assets/sprites/sea/{name}.webp'
    im = Image.open(p)
    w, h = im.size
    print(f'=== {name.upper()} ({w}x{h}) ===')
    arr = np.array(im)
    alpha = arr[:, :, 3]
    # Find bounding box
    ys, xs = np.nonzero(alpha > 20)
    print(f'BBox: X=[{xs.min()}..{xs.max()}], Y=[{ys.min()}..{ys.max()}]')
    print(f'Center of Mass: ({xs.mean():.1f}, {ys.mean():.1f})')
