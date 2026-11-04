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

    # Bypass tutorial modal
    page.evaluate('''() => {
        try {
            const d = JSON.parse(localStorage.getItem('save_the_gate_save') || '{}');
            d.tutorialDone = true;
            localStorage.setItem('save_the_gate_save', JSON.stringify(d));
        } catch(e) {}
    }''')
    page.reload()
    time.sleep(1.0)

    # Dismiss name overlay if visible
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    # Start stage 1
    page.mouse.click(225, 520)
    time.sleep(1.0)
    page.mouse.click(364, 99)
    time.sleep(1.5)

    # Inject all 7 sea enemies
    res = page.evaluate('''() => {
        if (!window.state) return 'no window.state';
        window.state.monsters = [];
        const seaTypes = [
            { type: 'troll', skin: 'turtle', name: 'Turtle', x: 130, y: 220, r: 32 },
            { type: 'ogreBoss', skin: 'kraken', name: 'Kraken', x: 320, y: 220, r: 42, boss: true },
            { type: 'goblin', skin: 'crab', name: 'Crab', x: 80, y: 350, r: 20 },
            { type: 'slime', skin: 'jelly', name: 'Jellyfish', x: 225, y: 350, r: 22 },
            { type: 'skeleton', skin: 'pirate', name: 'Pirate', x: 370, y: 350, r: 20 },
            { type: 'imp', skin: 'lanternfin', name: 'Lanternfin', x: 150, y: 470, r: 22, flying: true },
            { type: 'slimeSmall', skin: 'urchin', name: 'Urchin', x: 300, y: 470, r: 14 }
        ];
        seaTypes.forEach((def, i) => {
            window.state.monsters.push({
                id: 2000 + i,
                type: def.type,
                skin: def.skin,
                x: def.x,
                y: def.y,
                r: def.r,
                vx: 0,
                vy: 0,
                pvy: 8,
                speed: 25,
                hp: 10,
                maxHp: 10,
                spawnT: 1.0,
                anim: 0,
                seed: i * 1.5,
                boss: !!def.boss,
                flying: !!def.flying,
                action: null
            });
        });
        return window.state.monsters.length;
    }''')
    print('Spawned sea enemies count:', res)

    # Capture 16 frames (2 full animation cycles)
    frames = []
    for f in range(16):
        time.sleep(0.125)
        snap_path = f"tools/showcase_frame_{f}.png"
        page.screenshot(path=snap_path)
        im = Image.open(snap_path)
        frames.append(im)

    # Save static showcase screenshot
    frames[0].save(os.path.join(artifact_dir, "sea_all_new_graphics_showcase.png"))
    print("Saved sea_all_new_graphics_showcase.png")

    # Save animated GIF
    frames[0].save(
        os.path.join(artifact_dir, "sea_all_new_graphics_animated.gif"),
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0
    )
    print("Saved sea_all_new_graphics_animated.gif")

    browser.close()

print("Showcase generation complete!")
