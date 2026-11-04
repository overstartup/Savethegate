import time
import os
import shutil
from playwright.sync_api import sync_playwright
from PIL import Image

output_dir = r"c:\ov371\prj\Game\Save the gate\hero_grade_frames"
os.makedirs(output_dir, exist_ok=True)
artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
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

    frames = []
    print("Capturing hero-grade creature frames with full VFX...")
    for step in range(50):
        import math
        # Move Guardian across screen
        tx = 210 + int(math.sin(step * 0.25) * 115)
        page.mouse.move(tx, 570)
        time.sleep(0.1)
        
        frame_path = os.path.join(output_dir, f"frame_{step:03d}.png")
        page.screenshot(path=frame_path)
        img = Image.open(frame_path).convert("RGB")
        img_thumb = img.resize((315, 555), Image.Resampling.LANCZOS)
        frames.append(img_thumb)

    browser.close()

gif_path = os.path.join(artifact_dir, "creatures_hero_grade.gif")
local_gif = r"c:\ov371\prj\Game\Save the gate\creatures_hero_grade.gif"

if frames:
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=100,
        loop=0,
        optimize=True
    )
    shutil.copyfile(gif_path, local_gif)
    print(f"Saved GIF with {len(frames)} frames to {gif_path}")

milestones = [12, 24, 36, 48]
for idx, m in enumerate(milestones):
    src = os.path.join(output_dir, f"frame_{m:03d}.png")
    dst = os.path.join(artifact_dir, f"hero_tier_action_{idx+1}.png")
    if os.path.exists(src):
        shutil.copyfile(src, dst)
        print(f"Copied milestone {src} -> {dst}")

print("Hero-grade capture completed!")

