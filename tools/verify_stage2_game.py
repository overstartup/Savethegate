import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"
html_path = os.path.abspath("game/play.html")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 480, "height": 854})
    
    # Enable console logs
    page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))
    
    # 1. Open game
    page.goto(f"file:///{html_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)
    
    # Inject Level 11 (Stage 2 Level 1) into save data or state
    page.evaluate("""() => {
        // Clear or set save to Level 11
        try {
            const raw = localStorage.getItem('gatewall_save_v1');
            let data = raw ? JSON.parse(raw) : {};
            data.level = 11;
            data.highestLevel = 11;
            data.gold = 50000;
            localStorage.setItem('gatewall_save_v1', JSON.stringify(data));
        } catch(e) {
            console.error(e);
        }
    }""")
    
    # Reload page with new save
    page.reload()
    page.wait_for_timeout(1000)
    
    # Tap Play to start game
    page.mouse.click(240, 560)
    page.wait_for_timeout(1200)
    
    # Take screenshot of Stage 2 gameplay start
    page.screenshot(path=os.path.join(artifact_dir, "stage2_gameplay_start.png"))
    print("Saved stage2_gameplay_start.png")
    
    # Spawn each Stage 2 creature so we see them all on screen moving!
    page.evaluate("""() => {
        const s = window.__dbg_state || window.state;
        if (!s) {
            console.warn("No state found directly, looking for active monsters");
        }
    }""")
    
    # Let waves spawn and capture 16 frames of movement animation
    frames = []
    for i in range(16):
        time.sleep(0.12)
        shot_path = os.path.join(artifact_dir, f"stage2_frame_{i}.png")
        page.screenshot(path=shot_path)
        frames.append(Image.open(shot_path))
        
    gif_path = os.path.join(artifact_dir, "stage2_gameplay_action.gif")
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=120, loop=0)
    print(f"Saved {gif_path}")
    
    # Now let's test Level 20 (Frostgiant Boss Level)
    page.evaluate("""() => {
        try {
            const raw = localStorage.getItem('gatewall_save_v1');
            let data = raw ? JSON.parse(raw) : {};
            data.level = 20;
            data.highestLevel = 20;
            localStorage.setItem('gatewall_save_v1', JSON.stringify(data));
        } catch(e) {}
    }""")
    page.reload()
    page.wait_for_timeout(1000)
    page.mouse.click(240, 560)
    page.wait_for_timeout(2500) # Boss arrives
    
    boss_shot = os.path.join(artifact_dir, "stage2_frostgiant_boss.png")
    page.screenshot(path=boss_shot)
    print(f"Saved {boss_shot}")
    
    browser.close()

