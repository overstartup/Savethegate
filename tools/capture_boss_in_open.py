import os
import io
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
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
        window.__game.start(10);
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

        // Dismiss any veteran banner element
        if (s.veteranBanner) s.veteranBanner = null;
        if (s.banner) s.banner = null;

        // Spawn Frost Giant King marching in open center road at y=360
        const boss = s.spawner.mk(s, 'ogreBoss', 225, 360);
        boss.boss = true;
        boss.skin = 'frostgiant';
        boss.r = 44;
        boss.hp = 999999;
        boss.maxHp = 999999;
        boss.speed = 15;
        boss.vy = 15;
        boss.vx = 0;
        s.monsters.push(boss);
    }''')

    frames = []
    for f in range(24):
        page.wait_for_timeout(50)
        buf = page.screenshot()
        frames.append(Image.open(io.BytesIO(buf)))

    # Save open road closeup
    crop_boss = frames[10].crop((120, 270, 330, 480))
    crop_path = os.path.join(artifact_dir, "frostgiant_open_closeup.png")
    crop_boss.save(crop_path)
    print("Saved Frost Giant open road closeup:", crop_path)

    # Save animated GIF of the open road march
    crop_frames = [f.crop((120, 270, 330, 480)) for f in frames]
    gif_crop_path = os.path.join(artifact_dir, "frostgiant_open_march.gif")
    crop_frames[0].save(gif_crop_path, save_all=True, append_images=crop_frames[1:], duration=60, loop=0)
    print("Saved Frost Giant open march GIF:", gif_crop_path)

    browser.close()
    print("Done!")
