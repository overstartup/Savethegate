import os
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 450, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    page.wait_for_timeout(1000)

    # Start Stage 1 (Level 1) & spawn Jelly & Pirate
    page.evaluate('''() => {
        window.__game.start(0); // Stage 1 Level 1
        while (window.__game.mode === 'LEVELUP') {
            window.__game.pick(0);
        }
        
        const s = window.__game.state;
        s.run.choices = [];
        delete s.tu;
        s.monsters = [];
        s.player.fireTimer = 999999; // don't shoot
        
        // Spawn Jelly (maxHp 6, previously had dots) and Pirate (maxHp 14, had line)
        const j = s.spawner.mk(s, 'slime', 150, 220); // jelly
        j.hp = 4; // damaged
        s.monsters.push(j);
        
        const p = s.spawner.mk(s, 'skeleton', 300, 220); // pirate
        p.hp = 8;
        s.monsters.push(p);
        
        window.__game.frame(1/60);
    }''')

    # Capture top right (HUD) to confirm NO HEARTS
    snap_path = "tools/no_hearts_solid_lines.png"
    page.screenshot(path=snap_path)
    im = Image.open(snap_path)
    im.save(os.path.join(artifact_dir, "no_hearts_and_solid_lines_verified.png"))
    
    # Crop HUD top-right area
    hud_crop = im.crop((250, 0, 450, 90))
    hud_crop.save(os.path.join(artifact_dir, "hud_top_right_no_hearts.png"))
    
    # Crop Jelly and Pirate area
    enemy_crop = im.crop((80, 160, 380, 300))
    enemy_crop.save(os.path.join(artifact_dir, "jelly_and_pirate_solid_lines.png"))
    print("Verification screenshots saved successfully!")

    browser.close()

