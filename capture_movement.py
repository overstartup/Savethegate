import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 420, 'height': 740})

    # Capture console messages
    page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
    page.on("pageerror", lambda exc: print(f"[PAGE ERROR] {exc}"))

    # Load play.html
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/step1_load.png')

    # If nameOverlay is visible, click #nameSubmit
    overlay = page.query_selector("#nameOverlay")
    if overlay and overlay.is_visible():
        print("nameOverlay is visible, clicking #nameSubmit")
        page.click("#nameSubmit")
        time.sleep(1.0)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/step2_home.png')

    # Click on the canvas at (210, 496) to start the game
    print("Clicking CONTINUE_PLAY_BUTTON on canvas at (210, 496)")
    # We dispatch pointerdown and pointerup at (210, 496)
    canvas = page.query_selector("#game")
    box = canvas.bounding_box()
    print("Canvas bounding box:", box)
    target_x = box['x'] + 210
    target_y = box['y'] + 496
    page.mouse.click(target_x, target_y)
    time.sleep(1.0)
    page.screenshot(path='c:/ov371/prj/Game/Save the gate/step3_gameplay_start.png')

    # Let enemies spawn and move for several seconds, taking screenshots
    for i in range(1, 8):
        time.sleep(0.8)
        page.screenshot(path=f'c:/ov371/prj/Game/Save the gate/step4_moving_{i}.png')

    browser.close()

print("Capture script completed!")

