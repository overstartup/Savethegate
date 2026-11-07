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

    # Setup Stage 2 with Frostling squad running down the lane
    print("Spawning Frostling squad in Stage 2...")
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
        s.player.fireTimer = 999999; // don't shoot

        // Spawn 3 Frostlings running down lane
        const positions = [
            { x: 150, y: 180 },
            { x: 235, y: 140 },
            { x: 310, y: 190 }
        ];
        for (const pos of positions) {
            const m = s.spawner.mk(s, 'goblin', pos.x, pos.y);
            m.speed = 35;
            m.vy = 35;
            m.vx = 0;
            s.monsters.push(m);
        }
    }''')

    frames = []
    for f in range(24):
        page.wait_for_timeout(50)
        buf = page.screenshot()
        frames.append(Image.open(io.BytesIO(buf)))

    gif_path = os.path.join(artifact_dir, "frostling_ingame_run_verified.gif")
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
    print("Saved in-game Frostling run GIF:", gif_path)

    still_path = os.path.join(artifact_dir, "frostling_ingame_run_still.png")
    frames[6].save(still_path)

    # Closeup of center frostling
    crop_frostling = frames[6].crop((140, 160, 330, 380))
    crop_path = os.path.join(artifact_dir, "frostling_ingame_closeup.png")
    crop_frostling.save(crop_path)
    print("Saved closeup:", crop_path)

    browser.close()
    print("Done!")
