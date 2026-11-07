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

        // Spawn Frost Giant King marching down center lane
        const boss = s.spawner.mk(s, 'ogreBoss', 225, 260);
        boss.boss = true;
        boss.skin = 'frostgiant';
        boss.r = 44;
        boss.hp = 999999;
        boss.maxHp = 999999;
        boss.speed = 18;
        boss.vy = 18;
        boss.vx = 0;
        s.monsters.push(boss);
    }''')

    frames = []
    for f in range(24):
        page.wait_for_timeout(50)
        buf = page.screenshot()
        frames.append(Image.open(io.BytesIO(buf)))

    gif_path = os.path.join(artifact_dir, "frostgiant_clean_ingame_run.gif")
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
    print("Saved clean Frost Giant in-game GIF:", gif_path)

    still_path = os.path.join(artifact_dir, "frostgiant_clean_ingame_still.png")
    frames[8].save(still_path)

    # Crop the Frost Giant Boss
    crop_boss = frames[8].crop((130, 200, 320, 420))
    crop_path = os.path.join(artifact_dir, "frostgiant_boss_closeup.png")
    crop_boss.save(crop_path)
    print("Saved Frost Giant closeup:", crop_path)

    browser.close()
    print("Done!")
