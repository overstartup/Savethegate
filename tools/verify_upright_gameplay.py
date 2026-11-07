import os
import io
from playwright.sync_api import sync_playwright
from PIL import Image

artifact_dir = r"C:\Users\over2\.gemini\antigravity\brain\0d5657c5-14eb-4bb6-b979-b36f27ef2084"
os.makedirs(artifact_dir, exist_ok=True)

def record_upright():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 450, 'height': 800})
        print("Navigating to http://localhost:8000/play.html...")
        page.goto('http://localhost:8000/play.html')
        page.wait_for_timeout(1500)

        # Dismiss modal if open
        page.evaluate('''() => {
            const btn = document.getElementById('nameSubmit');
            if (btn) btn.click();
            const m = document.getElementById('nameModal');
            if (m) m.style.display = 'none';
        }''')
        page.wait_for_timeout(300)

        # ----------------- STAGE 1 (Sea War): Crabs & Turtles Running Upright -----------------
        print("Recording Stage 1: Crabs, Turtles, Urchins running upright toward gate...")
        page.evaluate('''() => {
            window.__game.start(0); // Stage 1 Level 1
            while (window.__game.mode === 'LEVELUP') {
                window.__game.pick(0);
            }
            const s = window.__game.state;
            s.run.choices = [];
            delete s.tu;
            delete s.levelBanner;
            delete s.banner;
            if (s.spawner) s.spawner.waveBanner = null;
            s.monsters = [];
            s.player.fireTimer = 999999; // don't shoot

            // Spawn 4 crabs + turtle + urchin with lateral flocking movement
            const types = [
                { type: 'goblin', x: 140, y: 160 }, // crab
                { type: 'goblin', x: 230, y: 120 }, // crab
                { type: 'goblin', x: 310, y: 170 }, // crab
                { type: 'goblin', x: 220, y: 220 }, // crab
                { type: 'troll', x: 160, y: 310 },  // turtle
                { type: 'slime', x: 290, y: 290 }   // urchin
            ];
            for (const item of types) {
                const m = s.spawner.mk(s, item.type, item.x, item.y);
                m.vx = (Math.random() - 0.5) * 80; // significant horizontal velocity to verify NO sideways lean
                m.vy = 45; // moving down lane
                s.monsters.push(m);
            }
        }''')

        stage1_frames = []
        for f in range(24):
            # Advance frame
            page.wait_for_timeout(50)
            # Update lateral movement to induce steering
            page.evaluate('''(f) => {
                const s = window.__game.state;
                for (const m of s.monsters) {
                    m.vx = Math.sin(f * 0.4 + m.seed) * 60; // vigorous weaving left and right
                }
            }''', f)
            buf = page.screenshot()
            stage1_frames.append(Image.open(io.BytesIO(buf)))

        stage1_gif_path = os.path.join(artifact_dir, "stage1_upright_monsters.gif")
        stage1_frames[0].save(stage1_gif_path, save_all=True, append_images=stage1_frames[1:], duration=60, loop=0)
        print("Saved Stage 1 GIF:", stage1_gif_path)

        stage1_still = os.path.join(artifact_dir, "stage1_upright_monsters_still.png")
        stage1_frames[10].save(stage1_still)

        # Closeup of crab
        crop_crab = stage1_frames[10].crop((150, 140, 360, 350))
        crop_crab.save(os.path.join(artifact_dir, "stage1_crab_upright_closeup.png"))

        # ----------------- STAGE 2 (Ice): Frostling, Yeti, Frost Giant Upright -----------------
        print("Recording Stage 2: Frostling, Yeti, Snowblob, Frost Giant upright...")
        page.evaluate('''() => {
            window.__game.start(10); // Stage 2 Level 11
            while (window.__game.mode === 'LEVELUP') {
                window.__game.pick(0);
            }
            const s = window.__game.state;
            s.run.choices = [];
            delete s.tu;
            delete s.levelBanner;
            delete s.banner;
            if (s.spawner) s.spawner.waveBanner = null;
            s.monsters = [];
            s.player.fireTimer = 999999;

            const roster = [
                { type: 'goblin', x: 130, y: 150 },                 // frostling
                { type: 'slime', x: 230, y: 150 },                  // snowblob
                { type: 'troll', x: 330, y: 220 },                  // yeti
                { type: 'ogreBoss', x: 225, y: 350, boss: true }   // frostgiant
            ];
            for (const r of roster) {
                const m = s.spawner.mk(s, r.type, r.x, r.y);
                m.vx = 40;
                m.vy = 30;
                if (r.boss) { m.boss = true; m.r = 44; }
                s.monsters.push(m);
            }
        }''')

        stage2_frames = []
        for f in range(24):
            page.wait_for_timeout(50)
            page.evaluate('''(f) => {
                const s = window.__game.state;
                for (const m of s.monsters) {
                    m.vx = Math.cos(f * 0.35 + m.seed) * 55; // vigorous left-right weave
                }
            }''', f)
            buf = page.screenshot()
            stage2_frames.append(Image.open(io.BytesIO(buf)))

        stage2_gif_path = os.path.join(artifact_dir, "stage2_upright_monsters.gif")
        stage2_frames[0].save(stage2_gif_path, save_all=True, append_images=stage2_frames[1:], duration=60, loop=0)
        print("Saved Stage 2 GIF:", stage2_gif_path)

        stage2_still = os.path.join(artifact_dir, "stage2_upright_monsters_still.png")
        stage2_frames[10].save(stage2_still)

        # Closeup of Yeti and Frostling
        crop_stage2 = stage2_frames[10].crop((90, 120, 380, 420))
        crop_stage2.save(os.path.join(artifact_dir, "stage2_upright_closeup.png"))

        browser.close()
        print("Verification complete!")

if __name__ == '__main__':
    record_upright()
