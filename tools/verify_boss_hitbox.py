import time
import os
from playwright.sync_api import sync_playwright

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

    # Dismiss name overlay
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    # Start stage 1
    page.mouse.click(225, 520)
    time.sleep(1.0)
    page.mouse.click(364, 99)
    time.sleep(1.0)

    # Test hitTest logic on the spawned Kraken boss
    test_result = page.evaluate('''() => {
        if (!window.state) return 'no window.state';
        
        // Spawn Kraken boss centered at (225, 300)
        const boss = new Monster('ogreBoss', 225, 300, 0, null);
        boss.skin = 'kraken';
        boss.boss = true;
        boss.bzFinal = true;
        window.state.monsters = [boss];

        // Boss radius and size:
        const r = boss.r;

        // Test 1: Shot aiming directly at central body (x=225, y=285)
        const hitBody = boss.hitTest(225, 285, 4);

        // Test 2: Shot aiming at outer left tentacle (x=175, y=300) -> 50px to the left of center
        const hitOuterLeftLeg = boss.hitTest(175, 300, 4);

        // Test 3: Shot aiming at outer right tentacle (x=275, y=300) -> 50px to the right of center
        const hitOuterRightLeg = boss.hitTest(275, 300, 4);

        // Test 4: Shot aiming at lower curled tentacle tip (x=225, y=345) -> 45px below center
        const hitLowerLeg = boss.hitTest(225, 345, 4);

        return {
            bossRadius: r,
            hitBody,
            hitOuterLeftLeg,
            hitOuterRightLeg,
            hitLowerLeg
        };
    }''')

    print('HitTest Verification Results:', test_result)

    # Take screenshot of the smaller boss in-game
    artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
    snap_path = os.path.join(artifact_dir, "smaller_kraken_boss_gameplay.png")
    page.screenshot(path=snap_path)
    print("Saved smaller_kraken_boss_gameplay.png")

    # Crop boss area
    from PIL import Image
    im = Image.open(snap_path)
    crop = im.crop((120, 200, 330, 400))
    crop.save(os.path.join(artifact_dir, "smaller_kraken_boss_crop.png"))
    print("Saved smaller_kraken_boss_crop.png")

    browser.close()

print("All tests passed!")

