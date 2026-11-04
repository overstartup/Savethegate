import time
import os
from playwright.sync_api import sync_playwright

output_dir = r"c:\ov371\prj\Game\Save the gate\gameplay_check"
os.makedirs(output_dir, exist_ok=True)
artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)

    # Dismiss onboarding if present
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    # Click continue to start Stage 1
    page.mouse.click(210, 496)
    time.sleep(1.0)

    # Skip tutorial tips
    page.mouse.click(364, 99)
    time.sleep(0.8)

    # Save screenshot of initial gameplay
    page.screenshot(path=os.path.join(output_dir, "wave_start.png"))
    print("Saved wave_start.png")

    # Let enemies advance
    for i in range(1, 10):
        time.sleep(1.0)
        # Keep shooting down the lane
        page.mouse.move(210, 200)
        page.mouse.down()
        time.sleep(0.3)
        page.mouse.up()
        snap_path = os.path.join(output_dir, f"wave_advance_{i}.png")
        page.screenshot(path=snap_path)
        print(f"Saved {snap_path}")

    # Copy key screenshots to artifact directory
    import shutil
    shutil.copyfile(os.path.join(output_dir, "wave_advance_3.png"), os.path.join(artifact_dir, "sea_graphics_wave_3.png"))
    shutil.copyfile(os.path.join(output_dir, "wave_advance_6.png"), os.path.join(artifact_dir, "sea_graphics_wave_6.png"))
    shutil.copyfile(os.path.join(output_dir, "wave_advance_9.png"), os.path.join(artifact_dir, "sea_graphics_wave_9.png"))

    browser.close()

print("Verification run completed successfully!")

