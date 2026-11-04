import os
import json
import base64
import io
from playwright.sync_api import sync_playwright
from PIL import Image
import numpy as np

# Map each stage theme to its species
STAGE_SPECIES = {
    'desert': {
        'theme_id': 'oasis_citadel',
        'palette': {'primary': '#d8a25c', 'dark': '#4a2e12', 'glow': '#ffe9a8'},
        'cast': ['scarab', 'dustdevil', 'vulture', 'mummy', 'scorpion', 'sphinx']
    },
    'crystal': {
        'theme_id': 'crystallized_forest',
        'palette': {'primary': '#5ce0c0', 'dark': '#0e3327', 'glow': '#c8fff2'},
        'cast': ['shardfox', 'mushling', 'moth', 'treant', 'crystalgolem', 'eldertreant']
    },
    'fire': {
        'theme_id': 'draconic_peaks',
        'palette': {'primary': '#e04a2a', 'dark': '#380a05', 'glow': '#ffb35c'},
        'cast': ['kobold', 'magma', 'firebat', 'emberknight', 'drake', 'dragon']
    },
    'aviary': {
        'theme_id': 'gilded_aviary',
        'palette': {'primary': '#e0b85c', 'dark': '#4a3410', 'glow': '#fff0c0'},
        'cast': ['finch', 'chick', 'toucan', 'owl', 'griffin', 'phoenix']
    },
    'gloom': {
        'theme_id': 'abyssal_forest',
        'palette': {'primary': '#9a6ad8', 'dark': '#241238', 'glow': '#e2c8ff'},
        'cast': ['gloomling', 'wisp', 'raven', 'witch', 'bramble', 'shadowstag']
    },
    'astral': {
        'theme_id': 'aetherial_gardens',
        'palette': {'primary': '#8ea8f0', 'dark': '#1c2048', 'glow': '#dce6ff'},
        'cast': ['starsprite', 'bloom', 'seedling', 'comet', 'astral', 'moongolem', 'seraph']
    },
    'clockwork': {
        'theme_id': 'clockwork_city',
        'palette': {'primary': '#c08838', 'dark': '#3a2308', 'glow': '#ffd27a'},
        'cast': ['cogbot', 'gearball', 'drone', 'steamsoldier', 'juggernaut', 'chronos']
    },
    'jungle': {
        'theme_id': 'spectral_jungle',
        'palette': {'primary': '#a680d8', 'dark': '#221238', 'glow': '#e4c8ff'},
        'cast': ['shroomkin', 'sporeling', 'glowmoth', 'tiki', 'shroomgiant', 'serpent']
    },
    'mountain': {
        'theme_id': 'crown_of_the_mountain_king',
        'palette': {'primary': '#9a9aa8', 'dark': '#2a2a32', 'glow': '#e0d8c0'},
        'cast': ['ram', 'boulder', 'pebble', 'eagle', 'guard', 'ogre', 'mountainking']
    },
    'deepwood': {
        'theme_id': 'the_deepwood',
        'palette': {'primary': '#5ca048', 'dark': '#122a10', 'glow': '#a8e880'},
        'cast': ['boar', 'puff', 'spore', 'dragonfly', 'bonecrawler', 'mossbear', 'bonedragon']
    }
}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 800, 'height': 800})
    page.goto('file:///c:/ov371/prj/Game/Save the gate/game/play.html')
    
    for folder, data in STAGE_SPECIES.items():
        out_dir = f'game/assets/sprites/{folder}'
        os.makedirs(out_dir, exist_ok=True)
        
        for name in data['cast']:
            target_path = f'{out_dir}/{name}.webp'
            if os.path.exists(target_path):
                print(f'Using existing high-def sprite for {name} ({target_path})')
                continue
                
            pal = data['palette']
            js_code = f'''() => {{
                const c = document.createElement('canvas');
                c.width = 512; c.height = 512;
                const ctx = c.getContext('2d');
                ctx.translate(256, 256);
                const sp = SPECIES['{name}'];
                if (sp && sp.draw) {{
                    const pal = Object.assign({{
                        primary: '{pal["primary"]}',
                        dark: '{pal["dark"]}',
                        light: '#ffffff',
                        shade: '{pal["dark"]}',
                        glow: '{pal["glow"]}',
                        rim: '#ffffff'
                    }}, sp.colors || {{}});
                    sp.draw(ctx, {{ r: 155, anim: 0, squish: 0, action: null, windup: 0, fireFlash: 0 }}, pal, 0, {{ x: 0, y: 1 }});
                }}
                return c.toDataURL('image/png');
            }}'''
            
            durl = page.evaluate(js_code)
            raw = base64.b64decode(durl.split(',')[1])
            im = Image.open(io.BytesIO(raw)).convert('RGBA')
            
            # Crop to non-transparent bounding box with padding
            alpha = np.array(im)[:, :, 3]
            nz_y, nz_x = np.nonzero(alpha > 10)
            if len(nz_y) > 0:
                y1, y2 = max(0, nz_y.min() - 10), min(512, nz_y.max() + 11)
                x1, x2 = max(0, nz_x.min() - 10), min(512, nz_x.max() + 11)
                im = im.crop((x1, y1, x2, y2))
                
            im.save(target_path, 'WEBP', quality=95)
            print(f'Baked {folder}/{name} -> {target_path} ({im.size})')
            
    browser.close()
    print('All stage master sprites ready!')

