import os
import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    
    # Enable console logging
    page.on('console', lambda msg: print(f'[PAGE LOG] {msg.type}: {msg.text}'))
    page.on('pageerror', lambda err: print(f'[PAGE ERROR] {err}'))

    # Load play.html
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    time.sleep(1.0)
    
    # Mark tutorial done in localStorage so it doesn't block with tutorial modal
    page.evaluate('''() => {
        try {
            const d = JSON.parse(localStorage.getItem('save_the_gate_save') || '{}');
            d.tutorialDone = true;
            localStorage.setItem('save_the_gate_save', JSON.stringify(d));
        } catch(e) {}
    }''')
    page.reload()
    time.sleep(1.0)

    # Click START PLAYING (center x=240, y=715)
    page.mouse.click(240, 715)
    time.sleep(1.5)
    
    # On Home Screen, click PLAY button (around x=240, y=750)
    page.mouse.click(240, 750)
    time.sleep(1.5)

    # Click level 1 or play button
    page.mouse.click(240, 750)
    time.sleep(2.0)

    # Now in gameplay! Let's check state.monsters
    for i in range(1, 8):
        time.sleep(1.5)
        info = page.evaluate('''() => {
            if (typeof state === 'undefined' || !state.monsters) return 'no state';
            return state.monsters.map(m => ({
                id: m.id,
                type: m.type,
                skin: m.skin,
                x: Math.round(m.x),
                y: Math.round(m.y),
                hasFrameImg: !!m.frameImg,
                hp: m.hp
            }));
        }''')
        print(f'Frame {i} monsters: {info}')
        page.screenshot(path=f'tools/snap_{i}.png')

    browser.close()

print('Done playwright test')

