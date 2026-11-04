import asyncio
from playwright.async_api import async_playwright
import os
from PIL import Image
from io import BytesIO

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 440, 'height': 820})
        page = await context.new_page()

        print("Loading http://localhost:8090/play.html ...")
        await page.goto("http://localhost:8090/play.html", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Dismiss onboarding if open
        await page.evaluate("""() => {
            const btn = document.getElementById('nameSubmit');
            if (btn) btn.click();
        }""")
        await page.wait_for_timeout(1000)

        # Helper to dismiss boost cards and tutorial overlays
        dismiss_script = """() => {
            const s = window.state;
            if (s && s.run) {
                s.run.boostPicking = false;
                s.run.boostCards = null;
            }
            if (typeof tuDismiss === 'function') tuDismiss();
        }"""

        # 1. Test Stage 1 (Sea War): check enemies have solid health line, no hearts in HUD
        print("Testing Stage 1 ...")
        await page.evaluate("""() => {
            if (typeof newGame === 'function') {
                newGame(0);
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) { s.run.boostPicking = false; s.run.boostCards = null; }
                s.monsters.length = 0;
                const t = s.spawner.mk(s, 'troll', 120, 300);
                t.hp = 4; t.maxHp = 6;
                const j = s.spawner.mk(s, 'slime', 220, 280);
                j.hp = 2; j.maxHp = 3;
                const pi = s.spawner.mk(s, 'skeleton', 320, 300);
                pi.hp = 3; pi.maxHp = 4;
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate(dismiss_script)
        await page.screenshot(path="stage1_solid_lines_verified.png")
        print("Captured stage1_solid_lines_verified.png")

        # 2. Test Stage 2 (Glacial Peak, levelIndex 10): check circle in center is GONE, enemies have solid health lines
        print("Testing Stage 2 ...")
        await page.evaluate("""() => {
            if (typeof newGame === 'function') {
                newGame(10); // Stage 2 (index 10)
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) { s.run.boostPicking = false; s.run.boostCards = null; }
                s.monsters.length = 0;
                const f = s.spawner.mk(s, 'goblin', 120, 320);
                f.hp = 2; f.maxHp = 2;
                const y = s.spawner.mk(s, 'troll', 240, 300);
                y.hp = 4; y.maxHp = 6;
                const w = s.spawner.mk(s, 'skeleton', 340, 320);
                w.hp = 3; w.maxHp = 4;
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate(dismiss_script)
        await page.screenshot(path="stage2_no_circle_solid_lines.png")
        print("Captured stage2_no_circle_solid_lines.png")

        # 3. Test Stage 3 (Oasis Citadel, levelIndex 20)
        print("Testing Stage 3 ...")
        await page.evaluate("""() => {
            if (typeof newGame === 'function') {
                newGame(20); // Stage 3 (index 20)
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) { s.run.boostPicking = false; s.run.boostCards = null; }
                s.monsters.length = 0;
                const sc = s.spawner.mk(s, 'goblin', 120, 320);
                sc.hp = 2; sc.maxHp = 2;
                const mu = s.spawner.mk(s, 'skeleton', 240, 320);
                mu.hp = 3; mu.maxHp = 4;
                const sp = s.spawner.mk(s, 'troll', 340, 300);
                sp.hp = 4; sp.maxHp = 6;
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate(dismiss_script)
        await page.screenshot(path="stage3_desert_verified.png")
        print("Captured stage3_desert_verified.png")

        # Record a 12-frame movement GIF of Stage 3
        frames = []
        for i in range(12):
            await page.wait_for_timeout(80)
            png_bytes = await page.screenshot()
            img = Image.open(BytesIO(png_bytes))
            frames.append(img)
        frames[0].save("stage3_movement_loop.gif", save_all=True, append_images=frames[1:], duration=80, loop=0)
        print("Saved stage3_movement_loop.gif")

        # 4. Test Stage 4 (Crystallized Forest, levelIndex 30)
        print("Testing Stage 4 ...")
        await page.evaluate("""() => {
            if (typeof newGame === 'function') {
                newGame(30); // Stage 4 (index 30)
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) { s.run.boostPicking = false; s.run.boostCards = null; }
                s.monsters.length = 0;
                const fox = s.spawner.mk(s, 'goblin', 120, 320);
                fox.hp = 3; fox.maxHp = 3;
                const tre = s.spawner.mk(s, 'skeleton', 240, 320);
                tre.hp = 4; tre.maxHp = 5;
                const gol = s.spawner.mk(s, 'troll', 340, 300);
                gol.hp = 5; gol.maxHp = 7;
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate(dismiss_script)
        await page.screenshot(path="stage4_crystal_verified.png")
        print("Captured stage4_crystal_verified.png")

        # 5. Test Stage 5 (Draconic Peaks, levelIndex 40)
        print("Testing Stage 5 ...")
        await page.evaluate("""() => {
            if (typeof newGame === 'function') {
                newGame(40); // Stage 5 (index 40)
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) { s.run.boostPicking = false; s.run.boostCards = null; }
                s.monsters.length = 0;
                const kob = s.spawner.mk(s, 'goblin', 120, 320);
                kob.hp = 3; kob.maxHp = 3;
                const bat = s.spawner.mk(s, 'imp', 240, 260);
                bat.hp = 2; bat.maxHp = 2;
                const dra = s.spawner.mk(s, 'troll', 340, 300);
                dra.hp = 6; dra.maxHp = 8;
            }
        }""")
        await page.wait_for_timeout(400)
        await page.evaluate(dismiss_script)
        await page.screenshot(path="stage5_fire_verified.png")
        print("Captured stage5_fire_verified.png")

        # Record a 12-frame movement GIF of Stage 5
        frames = []
        for i in range(12):
            await page.wait_for_timeout(80)
            png_bytes = await page.screenshot()
            img = Image.open(BytesIO(png_bytes))
            frames.append(img)
        frames[0].save("stage5_movement_loop.gif", save_all=True, append_images=frames[1:], duration=80, loop=0)
        print("Saved stage5_movement_loop.gif")

        await browser.close()

asyncio.run(main())
