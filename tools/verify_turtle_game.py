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

    # Spawn single centered turtle to inspect its walking animation in gameplay
    page.evaluate('''() => {
        if (!window.state) return;
        window.state.monsters = [{
            id: 9999,
            type: 'troll',
            skin: 'turtle',
            x: 225,
            y: 350,
            r: 34,
            vx: 0,
            vy: 0,
            pvy: 12,
            speed: 25,
            hp: 20,
            maxHp: 20,
            spawnT: 1.0,
            anim: 0,
            seed: 0,
            boss: false,
            flying: false,
            action: null
        }];
    }''')

    # Capture 16 frames across 2 full walking loops
    crops = []
    for f in range(16):
        time.sleep(0.125)
        snap_path = f"tools/turtle_walk_game_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        # Crop centered turtle area (X: 140 to 310, Y: 260 to 440)
        crop = im.crop((140, 260, 310, 440))
        crops.append(crop)

    # Save animated GIF of the turtle walking in-game
    crops[0].save(
        os.path.join(artifact_dir, "turtle_in_game_walk.gif"),
        save_all=True,
        append_images=crops[1:],
        duration=125,
        loop=0
    )
    crops[0].save(os.path.join(artifact_dir, "turtle_in_game_walk.png"))
    print("Saved turtle_in_game_walk.gif successfully!")

    browser.close()

print("Verification complete!")

