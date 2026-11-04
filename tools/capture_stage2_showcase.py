import os
import numpy as np
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    page.wait_for_timeout(1000)

    # Start Stage 2 & dismiss all levelup cards
    page.evaluate('''() => {
        window.__game.start(10); // Stage 2 Level 11
        while (window.__game.mode === 'LEVELUP') {
            window.__game.pick(0);
        }
        
        const s = window.__game.state;
        s.run.choices = [];
        delete s.tu;
        s.monsters = [];
        
        // Spawn each stage 2 enemy with proper speed: 0 (standing in showcase)
        const types = [
            { type: 'goblin', x: 80, y: 190 },                // frostling
            { type: 'slime', x: 225, y: 190 },                 // snowblob
            { type: 'imp', x: 370, y: 190, flying: true },     // icebat
            { type: 'skeleton', x: 130, y: 320 },              // wraith
            { type: 'troll', x: 320, y: 320 },                 // yeti
            { type: 'ogreBoss', x: 225, y: 470, boss: true }  // frostgiant
        ];
        
        for (const t of types) {
            const m = s.spawner.mk(s, t.type, t.x, t.y);
            m.speed = 0;
            m.vy = 0;
            if (t.boss) {
                m.boss = true;
                m.r = 48;
            }
            if (t.flying) {
                m.flying = true;
            }
            s.monsters.push(m);
        }
    }''')

    # Step and capture 16 animated frames (2 full cycles)
    crops = []
    full_snaps = []
    for f in range(16):
        page.evaluate('''() => {
            while (window.__game.mode === 'LEVELUP') {
                window.__game.pick(0);
            }
            window.__game.frame(1/8);
        }''')
        snap_path = f"tools/s2_march_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        full_snaps.append(im)
        # Crop battlefield area
        crop = im.crop((20, 110, 430, 560))
        crops.append(crop)

    # Save animated GIF using converted palette images
    gif_frames = [c.convert('P', palette=Image.Palette.ADAPTIVE) for c in crops]
    out_gif = os.path.join(artifact_dir, "stage2_in_game_verified.gif")
    gif_frames[0].save(
        out_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=125,
        loop=0
    )
    crops[0].save(os.path.join(artifact_dir, "stage2_in_game_verified.png"))
    full_snaps[0].save(os.path.join(artifact_dir, "stage2_full_gameplay_verified.png"))
    
    # Check difference between frame 0 and frame 4
    diff = np.sum(np.abs(np.array(crops[0].convert('RGB'), dtype=float) - np.array(crops[4].convert('RGB'), dtype=float)))
    print(f"Verified Stage 2 animation! Pixel difference between frame 0 and 4: {diff:,.0f}")
    print(f"Saved {out_gif}")

    browser.close()
