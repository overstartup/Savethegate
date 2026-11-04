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

    # Start stage
    page.mouse.click(225, 520)
    time.sleep(1.0)
    page.mouse.click(364, 99)
    time.sleep(1.0)

    # Spawn all 6 Stage 2 Glacial Peak enemies on the battlefield!
    page.evaluate('''() => {
        if (!window.state) return;
        window.state.monsters = [
            // Row 1: Frostling (scamp), Snowblob (bouncing snowball), Icebat (crystalline flyer)
            { id: 101, type: 'goblin', skin: 'frostling', x: 80, y: 190, r: 24, speed: 0, hp: 100, maxHp: 100, spawnT: 1.0, anim: 0, seed: 0 },
            { id: 102, type: 'slime', skin: 'snowblob', x: 225, y: 190, r: 26, speed: 0, hp: 100, maxHp: 100, spawnT: 1.0, anim: 0, seed: 0 },
            { id: 103, type: 'imp', skin: 'icebat', x: 370, y: 190, r: 24, speed: 0, hp: 100, maxHp: 100, spawnT: 1.0, anim: 0, seed: 0, flying: true },
            
            // Row 2: Wraith (spectral phantom), Yeti (abominable brute)
            { id: 104, type: 'skeleton', skin: 'wraith', x: 130, y: 310, r: 28, speed: 0, hp: 100, maxHp: 100, spawnT: 1.0, anim: 0, seed: 0 },
            { id: 105, type: 'troll', skin: 'yeti', x: 320, y: 310, r: 36, speed: 0, hp: 200, maxHp: 200, spawnT: 1.0, anim: 0, seed: 0 },
            
            // Row 3: Frostgiant (Glacial Titan Boss)
            { id: 106, type: 'ogreBoss', skin: 'frostgiant', boss: true, x: 225, y: 460, r: 50, speed: 0, hp: 1000, maxHp: 1000, spawnT: 1.0, anim: 0, seed: 0 }
        ];
    }''')

    # Capture 16 frames of animation
    snaps = []
    crops = []
    for f in range(16):
        time.sleep(0.125)
        snap_path = f"tools/stage2_anim_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        snaps.append(im)
        # Crop the battle field (X: 20 to 430, Y: 130 to 570)
        crop = im.crop((20, 130, 430, 560))
        crops.append(crop)

    # Save full screenshot and animated GIF
    snaps[0].save(os.path.join(artifact_dir, "stage2_all_enemies_in_game.png"))
    crops[0].save(
        os.path.join(artifact_dir, "stage2_all_enemies_in_game.gif"),
        save_all=True,
        append_images=crops[1:],
        duration=125,
        loop=0
    )
    print("Saved stage2_all_enemies_in_game.gif successfully!")

    browser.close()

