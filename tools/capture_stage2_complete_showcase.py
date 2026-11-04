import os
import base64
import io
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    page.wait_for_timeout(1000)

    # Dismiss welcome modal
    page.evaluate('''() => {
        const btn = document.getElementById('nameSubmit');
        if (btn) btn.click();
        const m = document.getElementById('nameModal');
        if (m) m.style.display = 'none';
    }''')
    page.wait_for_timeout(300)

    # Setup Stage 2 with all 6 enemies and tumbling ice rocks
    page.evaluate('''() => {
        window.__game.start(10); // Stage 2 Level 11
        while (window.__game.mode === 'LEVELUP') {
            window.__game.pick(0);
        }
        
        const s = window.__game.state;
        s.run.choices = [];
        delete s.tu;
        delete s.levelBanner;
        delete s.banner;
        if (s.spawner) s.spawner.waveBanner = null;
        s.monsters = [];
        s.obstacles = [];
        s.player.fireTimer = 999999; // don't shoot

        // Spawn all 6 Stage 2 enemies positioned across the road
        const roster = [
            { type: 'goblin', x: 130, y: 150 },                 // frostling
            { type: 'slime', x: 225, y: 150 },                  // snowblob
            { type: 'imp', x: 320, y: 150, flying: true },      // icebat
            { type: 'skeleton', x: 140, y: 260 },               // wraith
            { type: 'troll', x: 310, y: 260 },                  // yeti
            { type: 'ogreBoss', x: 225, y: 390, boss: true }   // frostgiant
        ];

        for (const r of roster) {
            const m = s.spawner.mk(s, r.type, r.x, r.y);
            m.speed = 0;
            m.vy = 0;
            if (r.boss) { m.boss = true; m.r = 44; }
            if (r.flying) { m.flying = true; }
            // Set 75% health to showcase solid continuous red health bars
            m.hp = Math.round(m.maxHp * 0.75);
            s.monsters.push(m);
        }

        // Spawn rolling ice rocks
        for (let i = 0; i < 3; i++) {
            s.spawner.obstacleTimer = -1;
            s.spawner.update(0.1, s);
        }
        const rockChoices = ['ice_rocks_large', 'ice_rocks_small', 'crystal_large'];
        s.obstacles.forEach((ob, idx) => {
            ob.x = 100 + idx * 125;
            ob.y = 480 + (idx % 2) * 50;
            ob.spriteChoice = rockChoices[idx % rockChoices.length];
            ob.rotSpeed = (idx % 2 === 0 ? 1 : -1) * 2.2;
        });

        window.__game.frame(1/60);
    }''')

    # Step game and capture animated GIF frames
    frames = []
    crops = []
    for f in range(24): # 24 frames @ 30fps
        page.evaluate('''() => {
            delete window.__game.state.levelBanner;
            delete window.__game.state.banner;
            if (window.__game.state.spawner) window.__game.state.spawner.waveBanner = null;
            window.__game.frame(1/30);
        }''')
        data_url = page.evaluate('document.getElementById("game").toDataURL("image/png")')
        img_bytes = base64.b64decode(data_url.split(',')[1])
        frame_img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
        frames.append(frame_img)
        # Crop battlefield area
        crops.append(frame_img.crop((20, 100, 430, 580)))

    # Save initial full screenshot
    frames[0].save(os.path.join(artifact_dir, "stage2_all_features_verified.png"))

    # Save battlefield animated GIF
    gif_frames = [c.convert('P', palette=Image.Palette.ADAPTIVE) for c in crops]
    gif_frames[0].save(
        os.path.join(artifact_dir, "stage2_complete_movement_verified.gif"),
        save_all=True,
        append_images=gif_frames[1:],
        duration=75,
        loop=0
    )
    print("Stage 2 complete movement GIF and screenshot saved successfully!")

    browser.close()

