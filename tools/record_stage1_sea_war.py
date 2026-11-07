import asyncio
import os
import io
from PIL import Image
from playwright.async_api import async_playwright

async def record_stage1_sea_war():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 480, 'height': 854})

        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))

        await page.goto('http://localhost:8000/play.html')
        await page.wait_for_timeout(1000)

        # Force reset to Stage 1 Level 0 (Sea War) and start run
        await page.evaluate("""() => {
            localStorage.clear();
            if (typeof newGame === 'function') {
                newGame(0);
                mode = 'PLAYING';
            }
        }""")

        await page.wait_for_timeout(500)

        # Wait for monsters to spawn in wave 1 of Stage 1
        print("Waiting for Stage 1 Sea War wave to spawn...")
        for _ in range(20):
            await page.wait_for_timeout(500)
            cnt = await page.evaluate("() => (typeof state !== 'undefined' && state && state.monsters) ? state.monsters.length : 0")
            print(f"Monsters on field: {cnt}")
            if cnt >= 3:
                break

        # Capture 32 frames of the Stage 1 Sea War enemies marching down
        frames = []
        print("Recording Stage 1 animation frames...")
        for i in range(32):
            screenshot_bytes = await page.screenshot()
            im = Image.open(io.BytesIO(screenshot_bytes))
            frames.append(im.convert('RGB'))
            await page.wait_for_timeout(60)

        artifact_dir = "C:/Users/over2/.gemini/antigravity/brain/0d5657c5-14eb-4bb6-b979-b36f27ef2084"
        out_gif = os.path.join(artifact_dir, "stage1_sea_war_16_frames_live.gif")
        frames[0].save(out_gif, save_all=True, append_images=frames[1:], duration=60, loop=0)
        print(f"Saved {len(frames)} frames to {out_gif}")

        still_png = os.path.join(artifact_dir, "stage1_sea_war_16_frames_live_still.png")
        frames[15].save(still_png)
        print(f"Saved still to {still_png}")

        await browser.close()
        print("Errors:", errors)

if __name__ == '__main__':
    asyncio.run(record_stage1_sea_war())
