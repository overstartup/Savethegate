import time
import os
from playwright.sync_api import sync_playwright
from PIL import Image

output_dir = r"c:\ov371\prj\Game\Save the gate\gameplay_frames"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)

    # 1. Onboarding
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        page.click("#nameSubmit")
        time.sleep(0.8)

    # 2. Home screen - click continue button
    page.mouse.click(210, 496)
    time.sleep(1.0)

    # 3. Dismiss tutorial "SKIP TIPS" at (364, 99)
    page.mouse.click(364, 99)
    time.sleep(0.5)

    # 4. Record frames of enemies spawning, walking, and being shot
    frames = []
    guardian_x = 210
    step_dx = 15
    
    print("Recording gameplay frames...")
    # Record for ~6 seconds at ~10 fps = 60 frames
    for i in range(50):
        # Move guardian slowly back and forth to show responsiveness
        guardian_x += step_dx
        if guardian_x > 320:
            guardian_x = 320
            step_dx = -15
        elif guardian_x < 100:
            guardian_x = 100
            step_dx = 15
        
        page.mouse.move(guardian_x, 570)
        
        frame_path = os.path.join(output_dir, f"frame_{i:03d}.png")
        page.screenshot(path=frame_path)
        img = Image.open(frame_path).convert("RGB")
        frames.append(img)
        time.sleep(0.1)

    browser.close()

# Save animated GIF
gif_path = r"c:\ov371\prj\Game\Save the gate\creatures_moving.gif"
if frames:
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=100,
        loop=0,
        optimize=True
    )
    print(f"Saved GIF with {len(frames)} frames to {gif_path}")

print("Recording complete!")

