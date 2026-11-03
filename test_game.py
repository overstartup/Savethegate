from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    
    # 1. Load standalone game
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.5)
    
    # 2. Tap START PLAYING on the welcome screen (around center x=240, y=715)
    page.mouse.click(240, 715)
    time.sleep(1.5)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/test_home_ready.png')
    
    # 3. On Home Screen, tap "PLAY" button (usually center-bottom, around x=240, y=750 or card play button)
    # Let's click at x=240, y=750
    page.mouse.click(240, 750)
    time.sleep(2.0)
    
    # 4. If in stage route or start level, tap level 1 / play
    page.mouse.click(240, 750)
    time.sleep(2.0)
    
    # Let's wait for monsters to spawn in wave 1 (Sea War - Sunken Steps)
    time.sleep(3.0)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/test_gameplay_wave1.png')
    
    time.sleep(3.0)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/test_gameplay_wave2.png')
    
    browser.close()

print('Game test finished successfully!')
