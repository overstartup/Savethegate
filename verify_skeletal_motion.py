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
        
    canvas = page.query_selector("#game")
    box = canvas.bounding_box()
    target_x = box['x'] + 210
    target_y = box['y'] + 496
    page.mouse.click(target_x, target_y)
    time.sleep(1.0)
    
    # Spawn the sea enemies including the skeleton pirate and turtle
    page.evaluate("""() => {
        if (typeof state !== 'undefined' && state && state.monsters) {
            state.monsters.length = 0;
            
            // Spawn Pirate (Skeleton), Crab, Turtle, Lanternfin across the lane
            const list = [
                { type: 'skeleton', skin: 'pirate', x: 240, y: 220 },
                { type: 'goblin', skin: 'crab', x: 100, y: 190 },
                { type: 'troll', skin: 'turtle', x: 380, y: 240 },
                { type: 'imp', skin: 'lanternfin', x: 120, y: 320 },
                { type: 'ogreBoss', skin: 'kraken', x: 260, y: 380 }
            ];
            
            for (const item of list) {
                const m = new Monster(item.type, item.x, item.y, 0, null, 1);
                m.skin = item.skin;
                state.monsters.push(m);
            }
        }
    }""")
    
    time.sleep(0.5)
    
    # Capture 16 motion frames over 1.6 seconds to show full walking stride and skeletal articulation
    for i in range(16):
        time.sleep(0.1)
        f_path = os.path.join(OUT_DIR, f'skeletal_frame_{i:02d}.png')
        page.screenshot(path=f_path)
        frames.append(Image.open(f_path))
        
    # Also capture crystal skeleton (Rattles) in motion
    page.evaluate("""() => {
        if (typeof state !== 'undefined' && state && state.monsters) {
            state.monsters.length = 0;
            const m = new Monster('skeleton', 240, 240, 0, null, 1);
            m.skin = null;
            state.monsters.push(m);
        }
    }""")
    time.sleep(0.3)
    page.screenshot(path=os.path.join(OUT_DIR, 'crystal_skeleton_motion.png'))
    
    browser.close()

# Save animated GIF of the skeletal motion
if frames:
    gif_path = os.path.join(OUT_DIR, 'sea_skeletal_motion.gif')
    frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=100, loop=0)
    print(f'Saved animated showcase GIF: {gif_path}')

print('Motion verification completed!')
