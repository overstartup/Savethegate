import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

OUT_DIR = r'c:\ov371\prj\Game\Save the gate'

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    page.goto('http://localhost:8000/play.html')
    time.sleep(1.0)

    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    canvas = page.query_selector("#game")
    box = canvas.bounding_box()
    page.mouse.click(box['x'] + 210, box['y'] + 496)
    time.sleep(1.0)

    # Spawn Stage 1 Sea War enemies: Pirate (Skeleton), Crab, Turtle, Lanternfin, Jelly, Kraken
    page.evaluate("""() => {
        if (typeof state !== 'undefined' && state) {
            if (state.monsters) state.monsters.length = 0;
            if (state.bullets) state.bullets.length = 0;
            if (state.player) state.player.shootCooldown = 999999;
            
            const list = [
                { type: 'goblin', skin: 'crab', x: 80, y: 190 },
                { type: 'slime', skin: 'jelly', x: 240, y: 180 },
                { type: 'imp', skin: 'lanternfin', x: 400, y: 190 },
                { type: 'skeleton', skin: 'pirate', x: 120, y: 290 },
                { type: 'troll', skin: 'turtle', x: 360, y: 290 },
                { type: 'ogreBoss', skin: 'kraken', x: 240, y: 400 }
            ];
            
            for (const item of list) {
                const m = new Monster(item.type, item.x, item.y, 0, null, 100);
                if (item.skin) m.skin = item.skin;
                m.maxHp = 9999;
                m.hp = 9999;
                state.monsters.push(m);
            }
        }
    }""")

    time.sleep(0.3)
    frames = []
    # Capture 16 frames across 2 full walk loops
    for i in range(16):
        time.sleep(0.08)
        f_path = os.path.join(OUT_DIR, f'stage1_test_frame_{i:02d}.png')
        page.screenshot(path=f_path)
        frames.append(Image.open(f_path))

    # Save animated GIF
    gif_path = os.path.join(OUT_DIR, 'stage1_frame_by_frame_live.gif')
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=90,
        loop=0
    )

    # Save preview image
    png_path = os.path.join(OUT_DIR, 'stage1_frame_by_frame_preview.png')
    frames[2].save(png_path)

    # Crop closeups of pirate, crab, turtle, kraken, lanternfin, jelly
    crops = {
        'pirate_close': (60, 220, 180, 360),
        'crab_close': (20, 130, 140, 250),
        'turtle_close': (300, 220, 420, 360),
        'kraken_close': (160, 320, 320, 480),
        'lanternfin_close': (340, 130, 460, 250),
        'jelly_close': (180, 120, 300, 240),
    }
    for cname, bbox in crops.items():
        cropped = frames[2].crop(bbox)
        cropped.save(os.path.join(OUT_DIR, f'{cname}.png'))

    browser.close()
    print('Stage 1 frame-by-frame verification completed successfully!')
