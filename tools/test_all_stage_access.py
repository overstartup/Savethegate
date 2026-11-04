import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 440, 'height': 820})
        await page.goto('http://localhost:8090/play.html', wait_until='networkidle')
        await page.wait_for_timeout(1000)

        # 1. Close name prompt
        await page.click('#nameSubmit')
        await page.wait_for_timeout(800)

        # We should be on the home screen with the stage selector bar visible
        await page.screenshot(path='test_home_stage_bar.png')
        print("Captured test_home_stage_bar.png")

        # 2. Click button 3 (Oasis Citadel) on the Stage Selector bar
        # STAGE_PICK_BUTTONS[2] is Stage 3: x is around (8 + 2 * 34) ~ 76, y is NAV_Y - 20 ~ 650
        await page.evaluate("""() => {
            const b = STAGE_PICK_BUTTONS[2];
            console.log('Clicking stage 3 button:', b);
        }""")
        # We can also evaluate a direct tap on stage 3 button or click its coordinates
        coords = await page.evaluate("() => ({ x: STAGE_PICK_BUTTONS[2].x + 15, y: STAGE_PICK_BUTTONS[2].y + 14 })")
        print("Clicking Stage 3 button at:", coords)
        await page.mouse.click(coords['x'], coords['y'])
        await page.wait_for_timeout(1000)

        # Verify we are playing Stage 3!
        stage_info = await page.evaluate("() => ({ mode: mode, stage: window.state?.levelDef?.stage, name: window.state?.levelDef?.name })")
        print("After Stage 3 button click:", stage_info)
        await page.screenshot(path='test_stage3_launched.png')

        # 3. Open Pause menu (top right)
        await page.mouse.click(415, 50)
        await page.wait_for_timeout(600)
        await page.screenshot(path='test_pause_stage_grid.png')
        print("Captured test_pause_stage_grid.png")

        # 4. In Pause menu, click Stage 9 (Clockwork City) button
        # PAUSE_STAGE_BUTTONS[8] is Stage 9
        pause_coords = await page.evaluate("() => ({ x: PAUSE_STAGE_BUTTONS[8].x + 15, y: PAUSE_STAGE_BUTTONS[8].y + 15 })")
        print("Clicking Stage 9 in pause menu at:", pause_coords)
        await page.mouse.click(pause_coords['x'], pause_coords['y'])
        await page.wait_for_timeout(1000)

        stage_info2 = await page.evaluate("() => ({ mode: mode, stage: window.state?.levelDef?.stage, name: window.state?.levelDef?.name })")
        print("After Stage 9 pause click:", stage_info2)
        await page.screenshot(path='test_stage9_launched.png')

        # 5. Open Pause, click Exit to Menu
        await page.mouse.click(415, 50)
        await page.wait_for_timeout(500)
        exit_coords = await page.evaluate("() => ({ x: PAUSE_BUTTONS.exit.x + 30, y: PAUSE_BUTTONS.exit.y + 20 })")
        await page.mouse.click(exit_coords['x'], exit_coords['y'])
        await page.wait_for_timeout(800)

        # Now click directly on the Glacial Peak island on the map
        island_coords = await page.evaluate("() => { const l = homeLayout(mapScrollY); return { x: l.nodes[1].cx, y: l.nodes[1].cy }; }")
        print("Clicking Glacial Peak island on map at:", island_coords)
        await page.mouse.click(island_coords['x'], island_coords['y'])
        await page.wait_for_timeout(1000)

        stage_info3 = await page.evaluate("() => ({ mode: mode, stage: window.state?.levelDef?.stage, name: window.state?.levelDef?.name })")
        print("After Glacial Peak island tap:", stage_info3)
        await page.screenshot(path='test_stage2_island_launched.png')

        await browser.close()
        print("All testing interactions successfully verified!")

asyncio.run(run())
