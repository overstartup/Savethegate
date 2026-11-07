import asyncio
import os
from PIL import Image
import io
from playwright.async_api import async_playwright

async def capture_stage1():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 480, 'height': 854})
        page = await context.new_page()

        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

        print("Navigating to http://localhost:8000/play.html...")
        await page.goto('http://localhost:8000/play.html')
        await page.wait_for_timeout(2000)

        # Click the play button / start game
        # Click center of screen to hit play
        await page.mouse.click(240, 520)
        await page.wait_for_timeout(1000)

        # Let enemies spawn and march forward
        await page.wait_for_timeout(3000)

        frames = []
        print("Recording live gameplay frames...")
        for i in range(25):
            screenshot_bytes = await page.screenshot()
            im = Image.open(io.BytesIO(screenshot_bytes))
            frames.append(im.convert('RGB'))
            await page.wait_for_timeout(60)

        artifact_dir = "C:/Users/over2/.gemini/antigravity/brain/0d5657c5-14eb-4bb6-b979-b36f27ef2084"
        out_gif = os.path.join(artifact_dir, "stage1_16_frames_gameplay.gif")
        frames[0].save(out_gif, save_all=True, append_images=frames[1:], duration=60, loop=0)
        print(f"Captured {len(frames)} frames to {out_gif}")

        # Also capture a high-res still
        screenshot_bytes = await page.screenshot()
        im = Image.open(io.BytesIO(screenshot_bytes))
        out_png = os.path.join(artifact_dir, "stage1_16_frames_still.png")
        im.save(out_png)
        print(f"Captured still to {out_png}")

        await browser.close()
        print("Console errors:", console_errors)

if __name__ == '__main__':
    asyncio.run(capture_stage1())
