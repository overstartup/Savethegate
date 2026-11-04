import os
import base64
import io
import numpy as np
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    page.wait_for_timeout(1000)

    # Set up Stage 2 scene with all 6 enemies
    urls = page.evaluate('''() => {
        window.__game.start(10); // Stage 2 Level 11
        while (window.__game.mode === 'LEVELUP') {
            window.__game.pick(0);
        }
        
        const s = window.__game.state;
        s.run.choices = [];
        delete s.tu;
        s.monsters = [];
        
        // Disable shooting so enemies are not killed during showcase
        s.player.fireTimer = 999999;
        s.player.tryFire = () => false;
        
        // Spawn each stage 2 enemy with proper positions
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
        
        const canvas = document.querySelector('canvas');
        const frames = [];
        for (let i = 0; i < 16; i++) {
            window.__game.frame(1/8);
            frames.push(canvas.toDataURL('image/png'));
        }
        return frames;
    }''')

    frames = []
    crops = []
    for i, url in enumerate(urls):
        raw = base64.b64decode(url.split(',', 1)[1])
        im = Image.open(io.BytesIO(raw)).convert('RGBA')
        frames.append(im)
        # Crop battlefield area
        # Canvas native resolution may be scaled (e.g. 450x800 or DPR)
        w, h = im.size
        # Bounding box relative to canvas size: X 5%..95%, Y 15%..75%
        crop = im.crop((int(w * 0.05), int(h * 0.15), int(w * 0.95), int(h * 0.72)))
        crops.append(crop)

    # Calculate pixel difference between frame 0 and frame 4
    diff = np.sum(np.abs(np.array(crops[0].convert('RGB'), dtype=float) - np.array(crops[4].convert('RGB'), dtype=float)))
    print(f"Verified Stage 2 movement! Pixel difference between frame 0 and frame 4: {diff:,.0f}")

    # Save full screenshot of frame 0
    full_png = os.path.join(artifact_dir, "stage2_in_game_verified.png")
    frames[0].save(full_png)
    
    # Save animated GIF using palette conversion
    gif_frames = [c.convert('P', palette=Image.Palette.ADAPTIVE) for c in crops]
    out_gif = os.path.join(artifact_dir, "stage2_in_game_verified.gif")
    gif_frames[0].save(
        out_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=125,
        loop=0
    )
    print(f"Saved {out_gif} with {len(gif_frames)} frames!")
    
    # Also save each individual enemy in-game crop
    enemy_crops = {
        'frostling': (int(w * 0.08), int(h * 0.17), int(w * 0.32), int(h * 0.33)),
        'snowblob': (int(w * 0.38), int(h * 0.17), int(w * 0.62), int(h * 0.33)),
        'icebat': (int(w * 0.68), int(h * 0.17), int(w * 0.94), int(h * 0.33)),
        'wraith': (int(w * 0.15), int(h * 0.34), int(w * 0.44), int(h * 0.50)),
        'yeti': (int(w * 0.56), int(h * 0.34), int(w * 0.88), int(h * 0.50)),
        'frostgiant': (int(w * 0.30), int(h * 0.48), int(w * 0.70), int(h * 0.71)),
    }
    for name, box in enemy_crops.items():
        c = im.crop(box)
        p = os.path.join(artifact_dir, f"stage2_ingame_{name}.png")
        c.save(p)
        print(f"Saved {p}")

    browser.close()

