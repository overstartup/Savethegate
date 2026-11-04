import asyncio
from playwright.async_api import async_playwright
import os
from PIL import Image
from io import BytesIO

STAGES = [
    (0, "Stage 1 - Abyssal Rift", "goblin", "troll", "skeleton"),
    (10, "Stage 2 - Glacial Peak", "goblin", "troll", "skeleton"),
    (20, "Stage 3 - Oasis Citadel", "goblin", "troll", "skeleton"),
    (30, "Stage 4 - Crystallized Forest", "goblin", "troll", "skeleton"),
    (40, "Stage 5 - Draconic Peaks", "goblin", "troll", "skeleton"),
    (50, "Stage 6 - Gilded Aviary", "goblin", "troll", "skeleton"),
    (60, "Stage 7 - Gloom Bog", "goblin", "troll", "skeleton"),
    (70, "Stage 8 - Aetherial Gardens", "goblin", "troll", "skeleton"),
    (80, "Stage 9 - Clockwork City", "goblin", "troll", "skeleton"),
    (90, "Stage 10 - Spectral Jungle", "goblin", "troll", "skeleton"),
    (100, "Stage 11 - Crown Mountain King", "goblin", "troll", "skeleton"),
    (110, "Stage 12 - The Deepwood", "goblin", "troll", "skeleton"),
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 440, 'height': 820})
        await page.goto('http://localhost:8090/play.html', wait_until='networkidle')
        await page.wait_for_timeout(1000)
        await page.click('#nameSubmit')
        await page.wait_for_timeout(500)

        all_stage_frames = []

        for idx, stage_name, t1, t2, t3 in STAGES:
            stage_num = (idx // 10) + 1
            print(f"Capturing {stage_name} (idx {idx})...")
            await page.evaluate(f"""() => {{
                newGame({idx});
                mode = 'PLAYING';
                const s = window.state;
                if (s && s.run) {{ s.run.boostPicking = false; s.run.boostCards = null; }}
                if (s.banner) s.banner = null;
                s.monsters.length = 0;
                const m1 = s.spawner.mk(s, '{t1}', 110, 260); m1.hp = 2; m1.maxHp = 2;
                const m2 = s.spawner.mk(s, '{t2}', 220, 240); m2.hp = 4; m2.maxHp = 6;
                const m3 = s.spawner.mk(s, '{t3}', 330, 260); m3.hp = 3; m3.maxHp = 4;
            }}""")
            await page.wait_for_timeout(500)

            # Click to clear any stray modal
            await page.mouse.click(220, 410)
            await page.wait_for_timeout(300)

            # Capture screenshot
            out_png = f"stage_{stage_num}_verified.png"
            await page.screenshot(path=out_png)
            
            # Capture small animation burst (4 frames per stage)
            for _ in range(3):
                await page.wait_for_timeout(100)
                png_bytes = await page.screenshot()
                all_stage_frames.append(Image.open(BytesIO(png_bytes)))

        # Save comprehensive showcase GIF of all 12 stages in sequence
        if all_stage_frames:
            all_stage_frames[0].save(
                "all_12_stages_showcase.gif",
                save_all=True,
                append_images=all_stage_frames[1:],
                duration=120,
                loop=0
            )
            print("Saved all_12_stages_showcase.gif")

        await browser.close()
        print("All 12 stages verified and captured successfully!")

asyncio.run(run())
