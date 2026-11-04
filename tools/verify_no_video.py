import time
import os
from playwright.sync_api import sync_playwright

output_dir = r"c:\ov371\prj\Game\Save the gate\gameplay_check"
artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)

    # Bypass onboarding
    page.evaluate('''() => {
        try {
            const d = JSON.parse(localStorage.getItem('save_the_gate_save') || '{}');
            d.tutorialDone = true;
            localStorage.setItem('save_the_gate_save', JSON.stringify(d));
        } catch(e) {}
    }''')
    page.reload()
    time.sleep(1.0)

    # Dismiss name overlay if present
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    # Force ads to be ready
    page.evaluate('''() => {
        if (typeof ads !== 'undefined') {
            ads.isRewardedReady = () => true;
        }
    }''')

    # Start Stage 1
    page.mouse.click(210, 520)
    time.sleep(1.0)
    page.mouse.click(364, 99)
    time.sleep(1.0)

    # Check buttonAt around center (210, 626) where watchAd was
    has_watch_ad = page.evaluate('''() => {
        return typeof BUTTONS !== 'undefined' && !!BUTTONS.watchAd;
    }''')
    print('BUTTONS.watchAd exists:', has_watch_ad)

    # Take screenshot of gameplay gate and unit row
    snap_path = os.path.join(artifact_dir, "gameplay_no_play_video.png")
    page.screenshot(path=snap_path)
    print("Saved gameplay_no_play_video.png")

    # Crop the gate and unit bar area (y from 500 to 730)
    from PIL import Image
    im = Image.open(snap_path)
    crop = im.crop((50, 480, im.width - 50, 720))
    crop_path = os.path.join(artifact_dir, "gate_area_no_video_btn.png")
    crop.save(crop_path)
    print("Saved gate_area_no_video_btn.png")

    browser.close()

print("Verification complete!")

