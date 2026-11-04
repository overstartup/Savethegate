import time
import os
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})

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

    # Start stage 1
    page.mouse.click(225, 520)
    time.sleep(1.0)
    page.mouse.click(364, 99)
    time.sleep(1.0)

    # Spawn centered Kraken boss
    page.evaluate('''() => {
        if (!window.state) return;
        window.state.monsters = [{
            id: 8888,
            type: 'ogreBoss',
            skin: 'kraken',
            x: 225,
            y: 330,
            r: 44,
            vx: 0,
            vy: 0,
            pvy: 8,
            speed: 20,
            hp: 100,
            maxHp: 100,
            spawnT: 1.0,
            anim: 0,
            seed: 0,
            boss: true,
            flying: false,
            action: null
        }];
    }''')

    # Capture 16 frames (2 full undulating loops)
    crops = []
    for f in range(16):
        time.sleep(0.125)
        snap_path = f"tools/kraken_game_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        # Crop centered kraken area (X: 100 to 350, Y: 220 to 450)
        crop = im.crop((90, 210, 360, 450))
        crops.append(crop)

    # Save animated GIF of the Kraken in-game
    crops[0].save(
        os.path.join(artifact_dir, "kraken_in_game_motion.gif"),
        save_all=True,
        append_images=crops[1:],
        duration=125,
        loop=0
    )
    crops[0].save(os.path.join(artifact_dir, "kraken_in_game_motion.png"))
    print("Saved kraken_in_game_motion.gif successfully!")

    browser.close()

print("Verification complete!")

