import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

OUT_DIR = r'c:\ov371\prj\Game\Save the gate'

def capture_roster(page, name, monsters_list, gif_name, png_name):
    print(f'Testing {name}...')
    page.evaluate(f"""() => {{
        if (typeof state !== 'undefined' && state) {{
            if (state.monsters) state.monsters.length = 0;
            if (state.bullets) state.bullets.length = 0;
            if (state.player) state.player.shootCooldown = 999999;
            
            const list = {monsters_list};
            for (const item of list) {{
                const m = new Monster(item.type, item.x, item.y, 0, null, 100);
                if (item.skin) m.skin = item.skin;
                m.maxHp = 9999;
                m.hp = 9999;
                state.monsters.push(m);
            }}
        }}
    }}""")
    
    time.sleep(0.3)
    frames = []
    for i in range(16):
        time.sleep(0.08)
        f_path = os.path.join(OUT_DIR, f'temp_frame_{i:02d}.png')
        page.screenshot(path=f_path)
        frames.append(Image.open(f_path))
        
    # Save GIF
    gif_path = os.path.join(OUT_DIR, gif_name)
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=80,
        loop=0
    )
    
    # Save high-res single preview PNG
    png_path = os.path.join(OUT_DIR, png_name)
    frames[4].save(png_path)
    print(f'Saved {gif_path} and {png_path}')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)
    
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)
        
    canvas = page.query_selector("#game")
    box = canvas.bounding_box()
    page.mouse.click(box['x'] + 210, box['y'] + 496)
    time.sleep(1.0)
    
    # 1. Base Shatterlings (Goblin, Slime, Imp, Skeleton, Troll, OgreBoss Bruncle)
    capture_roster(
        page,
        'Base Shatterlings (Stage 0)',
        """[
            { type: 'goblin', x: 80, y: 190 },
            { type: 'slime', x: 240, y: 180 },
            { type: 'imp', x: 400, y: 190 },
            { type: 'skeleton', x: 120, y: 290 },
            { type: 'troll', x: 360, y: 290 },
            { type: 'ogreBoss', x: 240, y: 390 }
        ]""",
        'shatterlings_skeletal_motion.gif',
        'shatterlings_skeletal_preview.png'
    )
    
    # 2. Stage 1 Sea War Horde (Crab, Jelly, Lanternfin, Pirate, Turtle, Kraken)
    capture_roster(
        page,
        'Stage 1 Sea War Horde',
        """[
            { type: 'goblin', skin: 'crab', x: 80, y: 190 },
            { type: 'slime', skin: 'jelly', x: 240, y: 180 },
            { type: 'imp', skin: 'lanternfin', x: 400, y: 190 },
            { type: 'skeleton', skin: 'pirate', x: 120, y: 290 },
            { type: 'troll', skin: 'turtle', x: 360, y: 290 },
            { type: 'ogreBoss', skin: 'kraken', x: 240, y: 390 }
        ]""",
        'sea_war_skeletal_motion.gif',
        'sea_war_skeletal_preview.png'
    )
    
    # 3. Stage 2 Glacial Peak Horde (Frostling, Snowblob, Icebat, Wraith, Yeti, Frostgiant)
    capture_roster(
        page,
        'Stage 2 Glacial Peak Horde',
        """[
            { type: 'goblin', skin: 'frostling', x: 80, y: 190 },
            { type: 'slime', skin: 'snowblob', x: 240, y: 180 },
            { type: 'imp', skin: 'icebat', x: 400, y: 190 },
            { type: 'skeleton', skin: 'wraith', x: 120, y: 290 },
            { type: 'troll', skin: 'yeti', x: 360, y: 290 },
            { type: 'ogreBoss', skin: 'frostgiant', x: 240, y: 390 }
        ]""",
        'glacial_peak_skeletal_motion.gif',
        'glacial_peak_skeletal_preview.png'
    )

    # 4. Stage 3 Oasis Citadel Horde (Scarab, Dustdevil, Vulture, Mummy, Scorpion, Sphinx)
    capture_roster(
        page,
        'Stage 3 Oasis Citadel Horde',
        """[
            { type: 'goblin', skin: 'scarab', x: 80, y: 190 },
            { type: 'slime', skin: 'dustdevil', x: 240, y: 180 },
            { type: 'imp', skin: 'vulture', x: 400, y: 190 },
            { type: 'skeleton', skin: 'mummy', x: 120, y: 290 },
            { type: 'troll', skin: 'scorpion', x: 360, y: 290 },
            { type: 'ogreBoss', skin: 'sphinx', x: 240, y: 390 }
        ]""",
        'oasis_citadel_skeletal_motion.gif',
        'oasis_citadel_skeletal_preview.png'
    )
    
    browser.close()
    print('All rosters verified and animated showcase files ready!')
