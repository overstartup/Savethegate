import time
import os
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

output_dir = r"c:\ov371\prj\Game\Save the gate\gameplay_frames_deep"
os.makedirs(output_dir, exist_ok=True)
artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    page.goto('file:///c:/ov371/prj/Game\Save the gate/game/play.html')
    time.sleep(1.0)

    # Dismiss onboarding
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.5)

    # Click continue to start Stage 1
    page.mouse.click(210, 496)
    time.sleep(0.8)

    # Skip tutorial tips
    page.mouse.click(364, 99)
    time.sleep(0.4)

    # Let's inspect live monsters from JS
    frames = []
    print("Beginning smart play recording...")
    
    # Run for 80 steps (~12-14 seconds of battle)
    for step in range(80):
        # Find lowest enemy or closest enemy to aim at
        target_x = page.evaluate("""() => {
            try {
                if (window.state && window.state.monsters && window.state.monsters.length > 0) {
                    // find lowest active monster (closest to bottom)
                    let lowest = null;
                    for (const m of window.state.monsters) {
                        if (!lowest || m.y > lowest.y) lowest = m;
                    }
                    return lowest ? lowest.x : 210;
                }
            } catch(e) {}
            return 210;
        }""")
        
        # If target_x is found, aim Guardian there
        if target_x is None or target_x == 210:
            # fallback sinusoidal sweep
            import math
            tx = 210 + int(math.sin(step * 0.25) * 110)
        else:
            tx = int(target_x)
        
        page.mouse.move(tx, 570)
        time.sleep(0.12)
        
        frame_path = os.path.join(output_dir, f"frame_{step:03d}.png")
        page.screenshot(path=frame_path)
        img = Image.open(frame_path).convert("RGB")
        # Resize to 315x555 for web/artifact viewing performance
        img_thumb = img.resize((315, 555), Image.Resampling.LANCZOS)
        frames.append(img_thumb)

    browser.close()

# Save animated GIF
gif_path = os.path.join(artifact_dir, "creatures_battle.gif")
local_gif = r"c:\ov371\prj\Game\Save the gate\creatures_battle.gif"

if frames:
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
        optimize=True
    )
    shutil.copyfile(gif_path, local_gif)
    print(f"Saved battle GIF with {len(frames)} frames to {gif_path}")

# Also copy 4 milestone frames to artifact directory
milestones = [10, 30, 50, 70]
for idx, m in enumerate(milestones):
    src = os.path.join(output_dir, f"frame_{m:03d}.png")
    dst = os.path.join(artifact_dir, f"creature_action_{idx+1}.png")
    if os.path.exists(src):
        shutil.copyfile(src, dst)
        print(f"Copied milestone {src} -> {dst}")

print("Smart play recording finished!")

