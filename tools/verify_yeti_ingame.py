import os
import io
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    print("Navigating to http://localhost:8000/play.html...")
    page.goto('http://localhost:8000/play.html')
    page.wait_for_timeout(1500)

    # Dismiss modal
    page.evaluate('''() => {
        const btn = document.getElementById('nameSubmit');
        if (btn) btn.click();
        const m = document.getElementById('nameModal');
        if (m) m.style.display = 'none';
    }''')
    page.wait_for_timeout(300)

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
        s.projectiles = [];
        s.player.fireTimer = 999999;

        if (s.veteranBanner) s.veteranBanner = null;
        if (s.player.companions) s.player.companions = [];
        if (s.player.traps) s.player.traps = [];

        // Spawn 2 Yetis side by side marching down the lane
        const m1 = s.spawner.mk(s, 'troll', 160, 240);
        m1.hp = 99999; m1.maxHp = 99999; m1.speed = 22; m1.vy = 22; m1.vx = 0;
        s.monsters.push(m1);

        const m2 = s.spawner.mk(s, 'troll', 290, 260);
        m2.hp = 99999; m2.maxHp = 99999; m2.speed = 22; m2.vy = 22; m2.vx = 0;
        s.monsters.push(m2);
    }''')

    frames = []
    for f in range(24):
        page.wait_for_timeout(50)
        buf = page.screenshot()
        frames.append(Image.open(io.BytesIO(buf)))

    gif_path = os.path.join(artifact_dir, "yeti_clean_ingame_run.gif")
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
    print("Saved clean Yeti in-game GIF:", gif_path)

    still_path = os.path.join(artifact_dir, "yeti_clean_ingame_still.png")
    frames[8].save(still_path)

    # Crop the Yeti
    crop_yeti = frames[8].crop((100, 210, 350, 420))
    crop_path = os.path.join(artifact_dir, "yeti_formation_closeup.png")
    crop_yeti.save(crop_path)
    print("Saved Yeti closeup:", crop_path)

    browser.close()
    print("Done!")
