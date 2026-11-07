import os
import io
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"
shutil.copyfile(
    r"c:\ov371\prj\Game\Save the gate\game\assets\sprites\sea\kraken_head_backup.png",
    os.path.join(artifact_dir, "kraken_old_head_backup.png")
)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800}, device_scale_factor=2)
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
        window.__game.start(0); // Stage 1 (Sunken Rift - Sea Stage)
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

        // Spawn Krakoth, the Deep Maw marching down center lane
        const cx = s.world ? s.world.w * 0.5 : 180;
        const boss = s.spawner.mk(s, 'ogreBoss', cx, 260);
        boss.boss = true;
        boss.skin = 'kraken';
        boss.r = 46;
        boss.x = cx;
        boss.targetX = cx;
        boss.lane = 1;
        boss.hp = 999999;
        boss.maxHp = 999999;
        boss.speed = 20;
        boss.vy = 20;
        boss.vx = 0;
        s.monsters.push(boss);

        // Also spawn two Stage 1 crabs flanking the boss
        const c1 = s.spawner.mk(s, 'goblin', cx - 105, 340);
        c1.skin = 'crab';
        c1.x = cx - 105;
        c1.targetX = cx - 105;
        c1.hp = 999999;
        c1.maxHp = 999999;
        c1.speed = 22;
        c1.vy = 22;
        c1.vx = 0;
        s.monsters.push(c1);

        const c2 = s.spawner.mk(s, 'goblin', cx + 105, 340);
        c2.skin = 'crab';
        c2.x = cx + 105;
        c2.targetX = cx + 105;
        c2.hp = 999999;
        c2.maxHp = 999999;
        c2.speed = 22;
        c2.vy = 22;
        c2.vx = 0;
        s.monsters.push(c2);
    }''')

    frames = []
    for f in range(24):
        page.wait_for_timeout(50)
        buf = page.screenshot()
        im = Image.open(io.BytesIO(buf))
        frames.append(im.resize((450, 800), Image.Resampling.LANCZOS))
        if f == 10:
            im.save(os.path.join(artifact_dir, "kraken_boss_ingame_still.png"))
            # High-DPI crop around the boss (2x scale: 900x1600)
            crop_boss = im.crop((230, 380, 670, 820))
            crop_boss.save(os.path.join(artifact_dir, "kraken_boss_closeup.png"))

    gif_path = os.path.join(artifact_dir, "kraken_boss_ingame_run.gif")
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=60, loop=0)
    print("Saved clean Kraken Boss in-game GIF and closeup!")
    browser.close()
