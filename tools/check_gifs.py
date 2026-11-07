import os
from PIL import Image

for name in ['pirate', 'crab', 'turtle', 'kraken', 'lanternfin', 'jelly', 'urchin']:
    p = f'stage1_{name}_frame_by_frame.gif'
    if os.path.exists(p):
        im = Image.open(p)
        print(f'{name:12}: {im.n_frames} frames, duration={im.info.get("duration")}ms, size={im.size}')
