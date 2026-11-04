import os
from playwright.sync_api import sync_playwright

html_path = os.path.abspath('game/play.html').replace('\\', '/')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 480, 'height': 854})
    page.goto(f'file:///{html_path}')
    page.wait_for_timeout(1000)
    
    # Set to Level 11 and start
    page.evaluate("""() => {
        let d = JSON.parse(localStorage.getItem('gatewall_save_v1') || '{}');
        d.level = 11;
        d.highestLevel = 11;
        localStorage.setItem('gatewall_save_v1', JSON.stringify(d));
    }""")
    page.reload()
    page.wait_for_timeout(1000)
    page.mouse.click(240, 560) # Start Level 11
    page.wait_for_timeout(4000) # Wait 4 seconds for wave 1 to march
    
    info = page.evaluate("""() => {
        // Look for monsters in window
        if (typeof state !== 'undefined' && state && state.monsters) {
            return state.monsters.map(m => ({
                type: m.type,
                skin: m.skin,
                x: Math.round(m.x),
                y: Math.round(m.y),
                hasFrame: !!m.frameImg,
                frameSrc: m.frameImg ? (m.frameImg.src ? m.frameImg.src.substring(0, 30) : 'yes') : null
            }));
        }
        return 'no state.monsters';
    }""")
    print('Monsters on screen:', info)
    
    page.screenshot(path=r'C:\Users\over2\.gemini\antigravity\brain\167ae094-1321-44ea-b4c4-1bbb11ce0cba\stage2_level11_monsters.png')
    browser.close()

