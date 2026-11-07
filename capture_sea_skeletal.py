import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

OUT_DIR = r'c:\ov371\prj\Game\Save the gate'
frames = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)
    
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)
        
    # Start stage 0
    page.evaluate("""() => {
        if (typeof saveData !== 'undefined') {
            saveData.stage = 0;
            saveData.level = 0;
            saveData.levelProgress = 0;
        }
        if (typeof startRun !== 'undefined') {
            startRun(0, 0);
        }
    }""")
    time.sleep(1.2)
    
    # Spawn the sea enemies including the skeleton pirate and turtle
    page.evaluate("""() => {
        if (typeof state !== 'undefined' && state) {
            if (state.monsters) state.monsters.length = 0;
            if (state.bullets) state.bullets.length = 0;
            if (state.player) {
                state.player.shootCooldown = 999999;
            }
            
            const list = [
                { type: 'skeleton', skin: 'pirate', x: 240, y: 220 },
                { type: 'goblin', skin: 'crab', x: 100, y: 190 },
                { type: 'troll', skin: 'turtle', x: 380, y: 230 },
                { type: 'imp', skin: 'lanternfin', x: 120, y: 310 },
                { type: 'ogreBoss', skin: 'kraken', x: 280, y: 380 }
            ];
            
            for (const item of list) {
                const m = new Monster(item.type, item.x, item.y, 0, null, 100);
                m.skin = item.skin;
                m.maxHp = 9999;
                m.hp = 9999;
                state.monsters.push(m);
            }
        }
    }""")
    
    time.sleep(0.5)
    
    # Capture 16 motion frames over 1.6 seconds
    for i in range(16):
        time.sleep(0.1)
        f_path = os.path.join(OUT_DIR, f'sea_skeletal_frame_{i:02d}.png')
        page.screenshot(path=f_path)
        frames.append(Image.open(f_path))
        
    browser.close()

# Save animated GIF of the skeletal motion
if frames:
    gif_path = os.path.join(OUT_DIR, 'sea_war_skeletal_animated.gif')
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=100, loop=0)
    print(f'Saved animated Sea War showcase GIF: {gif_path}')

print('Sea War capture completed!')
