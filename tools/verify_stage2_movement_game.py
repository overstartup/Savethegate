import os
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    page.wait_for_timeout(1000)

    # Start Stage 2 (Level 11)
    page.evaluate('''() => {
        window.__game.start(10);
        const s = window.__game.state;
        s.monsters = []; // clear any initial
        
        // Spawn each stage 2 enemy with proper speed: 0 (standing in showcase)
        const types = [
            { type: 'goblin', x: 80, y: 180 },       // frostling
            { type: 'slime', x: 225, y: 180 },        // snowblob
            { type: 'imp', x: 370, y: 180 },          // icebat
            { type: 'skeleton', x: 130, y: 310 },     // wraith
            { type: 'troll', x: 320, y: 310 },        // yeti
            { type: 'ogreBoss', x: 225, y: 470, boss: true } // frostgiant
        ];
        
        for (const t of types) {
            const m = s.spawner.mk(s, t.type, t.x, t.y);
            m.speed = 0;
            m.vy = 0;
            if (t.boss) {
                m.boss = true;
                m.r = 48;
            }
            s.monsters.push(m);
        }
    }''')

    # Step simulation and capture 16 frames of movement!
    snaps = []
    crops = []
    for f in range(16):
        page.evaluate('window.__game.frame(1/8)') # 1/8 sec step = advances 1 anim frame per step
        snap_path = f"tools/s2_march_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        snaps.append(im)
        # Crop battlefield area
        crops.append(im.crop((20, 110, 430, 560)))

    # Save animated GIF using Pillow
    crops[0].save(
        os.path.join(artifact_dir, "stage2_in_game_verified.gif"),
        save_all=True,
        append_images=crops[1:],
        duration=125,
        loop=0
    )
    crops[0].save(os.path.join(artifact_dir, "stage2_in_game_verified.png"))
    print("Saved stage2_in_game_verified.gif successfully!")

    browser.close()

