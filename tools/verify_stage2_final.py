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

    # Dismiss welcome modal if present
    page.evaluate('''() => {
        const btn = document.getElementById('nameSubmit');
        if (btn) btn.click();
        const m = document.getElementById('nameModal');
        if (m) m.style.display = 'none';
    }''')
    page.wait_for_timeout(300)

    # Start Stage 2 (Level 11)
    res = page.evaluate('''() => {
        window.__game.start(10); // Stage 2 Level 11
        while (window.__game.mode === 'LEVELUP') {
            window.__game.pick(0);
        }
        
        const s = window.__game.state;
        s.run.choices = [];
        delete s.tu;
        s.monsters = [];
        s.obstacles = [];
        s.player.fireTimer = 999999; // don't shoot while testing visuals
        
        // Ensure stage 2 decor is active
        const def = s.levelDef;
        
        // Spawn tumbling ice rocks / crystals via spawner
        for (let i = 0; i < 3; i++) {
            s.spawner.obstacleTimer = -1;
            s.spawner.update(0.1, s);
        }
        // Position them nicely for camera showcase
        const choices = ['ice_rocks_large', 'ice_rocks_small', 'crystal_large'];
        s.obstacles.forEach((ob, idx) => {
            ob.x = 90 + idx * 135;
            ob.y = 280 + (idx % 2) * 80;
            ob.spriteChoice = choices[idx % choices.length];
            ob.rotSpeed = (idx % 2 === 0 ? 1 : -1) * 2.5;
        });

        // Spawn Stage 2 enemies (cast maps them to frostling, wraith, yeti) with various HP to test solid lines
        const e1 = s.spawner.mk(s, 'goblin', 110, 160); // frostling
        e1.hp = Math.round(e1.maxHp * 0.7);
        
        const e2 = s.spawner.mk(s, 'skeleton', 225, 150); // wraith
        e2.hp = Math.round(e2.maxHp * 0.5);

        const e3 = s.spawner.mk(s, 'troll', 340, 170); // yeti
        e3.hp = Math.round(e3.maxHp * 0.8);

        window.__game.frame(1/60);
        return {
            decor: def.decor,
            obstaclesCount: s.obstacles.length,
            monstersCount: s.monsters.length,
            stagefxItems: s.stagefx ? s.stagefx.items.length : 0
        };
    }''')
    print("Stage 2 test state:", res)

    # Capture initial frame
    snap_path = "tools/stage2_verified.png"
    page.screenshot(path=snap_path)
    im = Image.open(snap_path)
    im.save(os.path.join(artifact_dir, "stage2_verified.png"))

    # Crop the road center & rolling stones
    stones_crop = im.crop((40, 200, 410, 460))
    stones_crop.save(os.path.join(artifact_dir, "stage2_hd_stones_verified.png"))

    # Record 16 animated frames of Stage 2 gameplay
    frames = []
    for f in range(24):
        page.evaluate('window.__game.frame(1/30);')
        data_url = page.evaluate('document.getElementById("game").toDataURL("image/png")')
        img_bytes = base64.b64decode(data_url.split(',')[1])
        frame_img = Image.open(io.BytesIO(img_bytes)).convert('RGBA')
        frames.append(frame_img)

    # Save animated GIF
    gif_frames = [f.convert('P', palette=Image.Palette.ADAPTIVE) for f in frames]
    gif_frames[0].save(
        os.path.join(artifact_dir, "stage2_gameplay_enhanced.gif"),
        save_all=True,
        append_images=gif_frames[1:],
        duration=66,
        loop=0
    )
    print("Stage 2 enhanced GIF saved to artifacts!")

    # Check center circle absence
    # Center was roughly x: 225, y: 350-450
    center_crop = im.crop((120, 320, 330, 440))
    center_crop.save(os.path.join(artifact_dir, "stage2_center_no_circle.png"))

    browser.close()
