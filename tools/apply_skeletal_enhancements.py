import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Patch screens.js to load all stage master sprites and expose ALL_STAGE_SPRITES
screens_path = os.path.join(ROOT, 'game', 'src', 'ui', 'screens.js')
with open(screens_path, 'r', encoding='utf-8') as f:
    screens_src = f.read()

# Replace the SEA_SPRITES and ICE_SPRITES section with comprehensive ALL_STAGE_SPRITES loader
old_sprites_section = '''export const SEA_SPRITE_NAMES = ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'];
export const SEA_SPRITES = {};
for (const name of SEA_SPRITE_NAMES) {
  const img = new Image();
  SEA_SPRITES[name] = img;
  if (typeof SPECIES !== "undefined" && SPECIES[name]) SPECIES[name].sprite = img;
  img.src = `assets/sprites/sea/${name}.webp`;
  img.onload = () => {
    SEA_SPRITES[name] = img;
    if (typeof SPECIES !== 'undefined' && SPECIES[name]) {
      SPECIES[name].sprite = img;
    }
  };
}


export const ICE_SPRITE_NAMES = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
export const ICE_SPRITES = {};
for (const name of ICE_SPRITE_NAMES) {
  const img = new Image();
  ICE_SPRITES[name] = img;
  if (typeof SPECIES !== 'undefined' && SPECIES[name]) SPECIES[name].sprite = img;
  img.src = `assets/sprites/ice/${name}.webp`;
  img.onload = () => {
    ICE_SPRITES[name] = img;
    if (typeof SPECIES !== 'undefined' && SPECIES[name]) {
      SPECIES[name].sprite = img;
    }
  };
}'''

new_sprites_section = '''export const SEA_SPRITE_NAMES = ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'];
export const SEA_SPRITES = {};
export const ICE_SPRITE_NAMES = ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'];
export const ICE_SPRITES = {};
export const ALL_STAGE_SPRITES = {};

export const STAGE_SPRITE_DIRS = {
  sea: ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'],
  ice: ['frostling', 'snowblob', 'icebat', 'wraith', 'yeti', 'frostgiant'],
  desert: ['scarab', 'dustdevil', 'vulture', 'mummy', 'scorpion', 'sphinx'],
  crystal: ['shardfox', 'mushling', 'moth', 'treant', 'crystalgolem', 'eldertreant'],
  fire: ['kobold', 'magma', 'firebat', 'emberknight', 'drake', 'dragon'],
  aviary: ['finch', 'chick', 'toucan', 'owl', 'griffin', 'phoenix'],
  gloom: ['gloomling', 'wisp', 'raven', 'witch', 'bramble', 'shadowstag'],
  astral: ['starsprite', 'bloom', 'seedling', 'comet', 'astral', 'moongolem', 'seraph'],
  clockwork: ['cogbot', 'gearball', 'drone', 'steamsoldier', 'juggernaut', 'chronos'],
  jungle: ['shroomkin', 'sporeling', 'glowmoth', 'tiki', 'shroomgiant', 'serpent'],
  mountain: ['ram', 'boulder', 'pebble', 'eagle', 'guard', 'ogre', 'mountainking'],
  deepwood: ['boar', 'puff', 'spore', 'dragonfly', 'bonecrawler', 'mossbear', 'bonedragon'],
  enemies: ['goblin', 'slime', 'imp', 'skeleton', 'troll', 'ogreBoss'],
};

for (const [folder, names] of Object.entries(STAGE_SPRITE_DIRS)) {
  for (const name of names) {
    const img = new Image();
    ALL_STAGE_SPRITES[name] = img;
    if (folder === 'sea') SEA_SPRITES[name] = img;
    if (folder === 'ice') ICE_SPRITES[name] = img;
    if (folder === 'enemies') ENEMY_SPRITES[name] = img;
    if (typeof SPECIES !== 'undefined' && SPECIES[name]) SPECIES[name].sprite = img;
    img.src = `assets/sprites/${folder}/${name}.webp`;
    img.onload = () => {
      ALL_STAGE_SPRITES[name] = img;
      if (folder === 'sea') SEA_SPRITES[name] = img;
      if (folder === 'ice') ICE_SPRITES[name] = img;
      if (folder === 'enemies') ENEMY_SPRITES[name] = img;
      if (typeof SPECIES !== 'undefined' && SPECIES[name]) {
        SPECIES[name].sprite = img;
      }
    };
  }
}'''

if old_sprites_section in screens_src:
    screens_src = screens_src.replace(old_sprites_section, new_sprites_section)
    with open(screens_path, 'w', encoding='utf-8') as f:
        f.write(screens_src)
    print('Successfully patched screens.js')
else:
    print('Warning: old_sprites_section not found in screens.js')

# 2. Patch creatures.js to incorporate full skeletal and procedural articulation
creatures_path = os.path.join(ROOT, 'game', 'src', 'render', 'creatures.js')
with open(creatures_path, 'r', encoding='utf-8') as f:
    creatures_src = f.read()

# Let's verify and replace crBody in creatures.js
crbody_start = creatures_src.find('function crBody(ctx, m, tint, t, look, batImg, pal, extraRot = 0, extraScale = 1, enemyImg = null) {')
crbody_end = creatures_src.find('function crPalette(m, tint, flashAmt) {')

if crbody_start != -1 and crbody_end != -1:
    new_crbody = '''function crBody(ctx, m, tint, t, look, batImg, pal, extraRot = 0, extraScale = 1, enemyImg = null) {
  const sp = m.skin && SPECIES[m.skin];
  const r = m.r;
  const ph = m.action && m.action.phase;
  ctx.save();
  ctx.translate(m.x, m.y - (m.z || 0));
  // windup: trembling crouch that telegraphs the move
  if (ph === 'windup') ctx.translate((Math.random() - 0.5) * r * 0.08, 0);
  if (FACE_RIGHT.has(m.skin || m.type) && m.vx < -6) ctx.scale(-1, 1);
  ctx.rotate(crClamp(m.vx / 320, -0.4, 0.4) * (m.boss ? 0.25 : 1) + extraRot);
  // splits pop out fast; everything else grows in as it comes through its rift
  const pop = m.isChild ? crEaseOutBack(Math.min(1, m.spawnT / 0.3)) : m.boss ? 1 : crEaseOutBack(Math.min(1, m.spawnT / 0.45));
  const sq = m.squish * 0.2 + (ph === 'windup' && m.type !== 'imp' ? 0.12 : 0);
  ctx.scale(pop * (1 + sq) * extraScale, pop * (1 - sq) * extraScale);

  // Real Graphic Sprites (AI/painted master sprites + animated frames)
  const masterImg = (typeof ALL_STAGE_SPRITES !== 'undefined' && ALL_STAGE_SPRITES[m.skin || m.type])
    || (typeof SEA_SPRITES !== 'undefined' && m.skin && SEA_SPRITES[m.skin])
    || (typeof ICE_SPRITES !== 'undefined' && m.skin && ICE_SPRITES[m.skin])
    || (sp && sp.sprite)
    || enemyImg;
  const spriteImg = (masterImg && (masterImg.naturalWidth || masterImg.width) ? masterImg : null) || m.frameImg;

  if (spriteImg) {
    const isSwimmer = m.skin === 'jelly' || m.skin === 'lanternfin' || m.skin === 'kraken' || m.skin === 'turtle' || m.skin === 'serpent' || m.skin === 'urchin';
    const isFlyer = m.flying || m.type === 'imp' || m.skin === 'lanternfin' || m.skin === 'icebat' || m.skin === 'vulture' || m.skin === 'moth' || m.skin === 'firebat' || m.skin === 'toucan' || m.skin === 'owl' || m.skin === 'griffin' || m.skin === 'phoenix' || m.skin === 'raven' || m.skin === 'comet' || m.skin === 'drone' || m.skin === 'glowmoth' || m.skin === 'eagle' || m.skin === 'dragonfly';
    const cadence = (ph === 'burst' ? 5.2 : 3.4);
    const step = (m.anim || 0) * cadence;

    // 1. Organic movement: step bounce, waddle roll, stride squash & stretch, breathing
    const bounce = isFlyer ? Math.sin(t * 4 + m.seed) * r * 0.12 : Math.abs(Math.cos(step)) * r * 0.14;
    const waddle = isFlyer ? Math.sin(t * 3 + m.seed) * 0.08 : Math.sin(step) * 0.11;
    const breathe = Math.sin(t * 3.5 + m.seed) * 0.04;
    const strideSq = Math.sin(step * 2) * 0.06;

    ctx.translate(0, -bounce);
    ctx.rotate(waddle);
    ctx.scale(1 + strideSq + breathe, 1 - strideSq + breathe);

    // 2. Animated procedural appendages underneath the sprite body
    if (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton') || m.skin === 'mummy' || m.skin === 'wraith' || m.skin === 'guard' || m.skin === 'steamsoldier' || m.skin === 'emberknight' || m.skin === 'treant' || m.skin === 'bonecrawler') {
      // Full marching skeletal legs with bone joints & boots
      ctx.save();
      const isPirate = m.skin === 'pirate';
      const isMummy = m.skin === 'mummy';
      const isWraith = m.skin === 'wraith';
      const isArmored = m.skin === 'guard' || m.skin === 'steamsoldier' || m.skin === 'emberknight';
      const isWood = m.skin === 'treant' || m.skin === 'bonecrawler';

      for (const side of [-1, 1]) {
        const legStride = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, legStride);
        const hx = side * r * 0.26, hy = r * 0.42;
        const kx = side * r * 0.30 + legStride * r * 0.16;
        const ky = r * 0.72 - lift * r * 0.20;
        const fx = side * r * 0.32 + legStride * r * 0.22;
        const fy = r * 0.96 - lift * r * 0.10;

        ctx.strokeStyle = isPirate ? '#b8c8b0' : isMummy ? '#c8b48a' : isWraith ? '#3c5a70' : isArmored ? (pal.shade || '#505a68') : isWood ? '#5a4228' : (pal.shade || '#9bb0c0');
        ctx.lineWidth = Math.max(2, r * 0.10);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

        ctx.fillStyle = isPirate ? '#a0b098' : isMummy ? '#d8c8a0' : isWraith ? '#5080a0' : isArmored ? (pal.light || '#8898a8') : (pal.light || '#c0d4e8');
        ctx.beginPath(); ctx.arc(kx, ky, r * 0.08, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = isPirate ? '#261810' : isMummy ? '#4a3a20' : isWraith ? '#1a2a38' : isArmored ? (pal.dark || '#222830') : (pal.dark || '#1a202c');
        ctx.beginPath(); ctx.ellipse(fx + legStride * r * 0.04, fy, r * 0.15, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
      }

      if (isPirate || isMummy || isWraith) {
        ctx.strokeStyle = isPirate ? '#2a4a3c' : isMummy ? '#a89872' : 'rgba(120, 200, 255, 0.55)';
        ctx.lineWidth = Math.max(1.5, r * 0.08);
        for (let i = -1; i <= 1; i += 2) {
          const wave = Math.sin(t * 5 + i + m.seed) * r * 0.15;
          ctx.beginPath();
          ctx.moveTo(i * r * 0.35, r * 0.3);
          ctx.quadraticCurveTo(i * r * 0.5 + wave, r * 0.7, i * r * 0.4 + wave * 0.6, r * 1.05);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (m.skin === 'crab' || m.skin === 'scarab') {
      // 6 scuttling legs walking alongside the sprite with alternating tripod gait
      ctx.save();
      const isScarab = m.skin === 'scarab';
      ctx.strokeStyle = isScarab ? (pal.shade || '#3a2818') : (pal.shade || '#5a2010');
      ctx.lineWidth = Math.max(2.5, r * 0.11);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const legPhase = Math.sin(step + i * 2.1 + (side > 0 ? Math.PI : 0));
          const bx = side * r * 0.55, by = r * (0.05 + i * 0.18);
          const kx = side * r * (0.95 + i * 0.05), ky = by - r * 0.12 + legPhase * r * 0.14;
          const fx = side * r * (1.2 + i * 0.05), fy = by + r * 0.28 + legPhase * r * 0.2;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
          ctx.fillStyle = isScarab ? '#ffd25a' : (pal.light || '#ff8a5a');
          ctx.beginPath(); ctx.arc(kx, ky, r * 0.055, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    } else if ((!m.skin && m.type === 'goblin') || m.skin === 'frostling' || m.skin === 'kobold' || m.skin === 'shroomkin') {
      // 2 agile digitigrade runner legs sprinting with rapid cadence and knee springs
      ctx.save();
      const runStep = step * 1.35;
      for (const side of [-1, 1]) {
        const legStride = Math.sin(runStep + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, legStride);
        const hx = side * r * 0.32, hy = r * 0.35;
        const kx = side * r * 0.42 + legStride * r * 0.22;
        const ky = r * 0.65 - lift * r * 0.24;
        const ax = side * r * 0.35 + legStride * r * 0.15;
        const ay = r * 0.88 - lift * r * 0.12;
        const fx = side * r * 0.38 + legStride * r * 0.26;
        const fy = r * 0.98;

        ctx.strokeStyle = pal.shade || '#2c4030';
        ctx.lineWidth = Math.max(2, r * 0.11);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(ax, ay); ctx.lineTo(fx, fy); ctx.stroke();

        ctx.fillStyle = pal.dark || '#162018';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.12, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'shardfox' || m.skin === 'ram' || m.skin === 'boar') {
      ctx.save();
      ctx.strokeStyle = pal.shade || '#3a2818';
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const fPhase = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const rPhase = Math.sin(step + (side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5));
        const fx = side * r * 0.45 + fPhase * r * 0.18, fy = r * 0.85 - Math.max(0, fPhase) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(side * r * 0.3, r * 0.35); ctx.lineTo(fx, fy); ctx.stroke();
        const rx = side * r * 0.65 - rPhase * r * 0.18, ry = r * 0.88 - Math.max(0, rPhase) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(side * r * 0.45, r * 0.45); ctx.lineTo(rx, ry); ctx.stroke();
      }
      ctx.restore();
    } else if (m.skin === 'turtle') {
      // 4 heavy paddle flippers pushing with swimming strokes
      ctx.save();
      ctx.strokeStyle = pal.shade || '#2a3a24';
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const strokePhase = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const fx = side * r * 0.85 + strokePhase * r * 0.18;
        const fy = r * 0.25 - strokePhase * r * 0.12;
        ctx.beginPath(); ctx.moveTo(side * r * 0.45, r * 0.1); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = pal.primary || '#3d5236';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.22, r * 0.15, side * 0.4 + strokePhase * 0.2, 0, Math.PI * 2); ctx.fill();
      }
      for (const side of [-1, 1]) {
        const pushPhase = Math.sin(step + (side > 0 ? Math.PI : 0));
        const rx = side * r * 0.70 - pushPhase * r * 0.14;
        const ry = r * 0.65 + pushPhase * r * 0.08;
        ctx.beginPath(); ctx.moveTo(side * r * 0.35, r * 0.45); ctx.lineTo(rx, ry); ctx.stroke();
      }
      ctx.restore();
    } else if ((!m.skin && m.type === 'troll') || m.skin === 'ogre' || m.skin === 'crystalgolem' || m.skin === 'bramble' || m.skin === 'shroomgiant') {
      // Massive tree-trunk stone legs with heavy boulder knees and cracked stone feet
      ctx.save();
      for (const side of [-1, 1]) {
        const stompPhase = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, stompPhase);
        const hx = side * r * 0.40, hy = r * 0.35;
        const kx = side * r * 0.44 + stompPhase * r * 0.15;
        const ky = r * 0.68 - lift * r * 0.22;
        const fx = side * r * 0.46 + stompPhase * r * 0.20;
        const fy = r * 0.98 - lift * r * 0.08;

        ctx.strokeStyle = pal.dark || '#2a1a12';
        ctx.lineWidth = Math.max(3.5, r * 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

        ctx.fillStyle = pal.shade || '#4a3220';
        ctx.beginPath(); ctx.arc(kx, ky, r * 0.14, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = pal.dark || '#1a1008';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.22, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'yeti' || m.skin === 'mossbear') {
      // Heavy gorilla/ape knuckle-walking arms swinging with rhythmic ground impacts
      ctx.save();
      ctx.strokeStyle = pal.shade || '#8aa0b8';
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const armStride = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const fx = side * r * 0.65 + armStride * r * 0.18;
        const fy = r * 0.72 - Math.max(0, armStride) * r * 0.12;
        ctx.beginPath(); ctx.moveTo(side * r * 0.45, r * 0.15); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = pal.dark || '#3a4a58';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.18, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'scorpion') {
      // 6 jointed arachnid walking legs + arched venom stinger tail
      ctx.save();
      ctx.strokeStyle = pal.shade || '#4a2810';
      ctx.lineWidth = Math.max(2, r * 0.11);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const crawl = Math.sin(step * 1.5 + i * 2.0 + (side > 0 ? Math.PI : 0));
          const bx = side * r * 0.45, by = r * (0.1 + i * 0.18);
          const kx = side * r * 0.85, ky = by - r * 0.15 + crawl * r * 0.14;
          const fx = side * r * 1.15 + crawl * r * 0.15, fy = by + r * 0.32;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        }
      }
      const tailSway = Math.sin(t * 4 + m.seed) * r * 0.15;
      const stingerStrike = ph === 'windup' ? r * 0.35 : 0;
      ctx.strokeStyle = pal.primary || '#7a421a';
      ctx.lineWidth = Math.max(2.5, r * 0.14);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.3);
      ctx.quadraticCurveTo(tailSway * 1.2, -r * 0.9, tailSway * 0.5, -r * (1.1 + stingerStrike));
      ctx.stroke();
      drawGlow(ctx, tailSway * 0.5, -r * (1.15 + stingerStrike), r * 0.25, '#7aff6a', 0.85);
      ctx.fillStyle = '#baff5a';
      ctx.beginPath(); ctx.arc(tailSway * 0.5, -r * (1.15 + stingerStrike), r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (m.skin === 'kraken') {
      // 8 massive writhing suction-cup tentacles
      ctx.save();
      ctx.strokeStyle = pal.primary || '#1c4d58';
      ctx.lineWidth = Math.max(3, r * 0.13);
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const spread = (i - 3.5) / 3.5;
        const tPhase = Math.sin(t * 4 + i * 0.85 + m.seed);
        const bx = spread * r * 0.65, by = r * 0.35;
        const cx1 = bx + spread * r * 0.35 + tPhase * r * 0.22;
        const cy1 = r * 0.85 + Math.abs(tPhase) * r * 0.15;
        const ex = bx + spread * r * 0.60 + Math.sin(t * 3.5 + i) * r * 0.28;
        const ey = r * 1.35 + Math.cos(t * 3.5 + i) * r * 0.18;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx1, cy1, ex, ey); ctx.stroke();
        ctx.fillStyle = pal.glow || '#6ff6ff';
        ctx.beginPath(); ctx.arc(cx1, cy1, r * 0.055, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if ((!m.skin && m.type === 'ogreBoss') || m.skin === 'mountainking') {
      // Bruncle: Colossal armored titan legs with heavy spiked greaves and boots
      ctx.save();
      for (const side of [-1, 1]) {
        const titanStride = Math.sin(step * 0.85 + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, titanStride);
        const hx = side * r * 0.42, hy = r * 0.38;
        const kx = side * r * 0.48 + titanStride * r * 0.20;
        const ky = r * 0.75 - lift * r * 0.22;
        const fx = side * r * 0.52 + titanStride * r * 0.25;
        const fy = r * 1.05 - lift * r * 0.08;

        ctx.strokeStyle = pal.dark || '#1a0d24';
        ctx.lineWidth = Math.max(4, r * 0.22);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

        ctx.fillStyle = pal.shade || '#3a1e4e';
        ctx.beginPath(); ctx.arc(kx, ky, r * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.glow || '#a85aff';
        ctx.beginPath(); ctx.arc(kx, ky, r * 0.07, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = pal.dark || '#0d0614';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.26, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'frostgiant') {
      // Frostgiant: Colossal glacial titan legs with frozen crag boots
      ctx.save();
      for (const side of [-1, 1]) {
        const stride = Math.sin(step * 0.85 + (side > 0 ? 0 : Math.PI));
        const lift = Math.max(0, stride);
        const hx = side * r * 0.45, hy = r * 0.35;
        const kx = side * r * 0.50 + stride * r * 0.18;
        const ky = r * 0.72 - lift * r * 0.22;
        const fx = side * r * 0.54 + stride * r * 0.22;
        const fy = r * 1.02;

        ctx.strokeStyle = '#162840';
        ctx.lineWidth = Math.max(4, r * 0.20);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();

        ctx.fillStyle = '#6098c8';
        ctx.beginPath(); ctx.arc(kx, ky, r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#101c2a';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.25, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'sphinx') {
      // 4 lion paws padding in alternating majestic stride
      ctx.save();
      ctx.strokeStyle = pal.shade || '#5a3d1a';
      ctx.lineWidth = Math.max(3, r * 0.15);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const stride = Math.sin(step + (side > 0 ? 0 : Math.PI));
        const fx = side * r * 0.45 + stride * r * 0.18, fy = r * 0.92 - Math.max(0, stride) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(side * r * 0.35, r * 0.35); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = pal.primary || '#8a6230';
        ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.18, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (m.skin === 'lanternfin') {
      // Propelling caudal fin behind body
      ctx.save();
      const tailSweep = Math.sin(t * 12 + m.seed) * 0.35;
      ctx.translate(-r * 0.85, 0);
      ctx.rotate(tailSweep);
      ctx.fillStyle = pal.shade || '#1a3242';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-r * 0.45, -r * 0.35); ctx.lineTo(-r * 0.28, 0); ctx.lineTo(-r * 0.45, r * 0.35);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    if (m.skin === 'jelly' || m.skin === 'urchin') {
      // Undulating tentacles trailing below
      ctx.save();
      ctx.strokeStyle = pal.glow || '#9ff4ff';
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const ox = i * r * 0.22;
        const wave = Math.sin(t * 6 + i * 1.3 + m.seed) * r * 0.22;
        ctx.beginPath();
        ctx.moveTo(ox, r * 0.2);
        ctx.quadraticCurveTo(ox + wave, r * 0.7, ox + wave * 0.5, r * 1.25);
        ctx.stroke();
      }
      ctx.restore();
    } else if ((!m.skin && (m.type === 'slime' || m.type === 'slimeSmall')) || m.skin === 'snowblob' || m.skin === 'magma') {
      // Viscous ooze puddle and dripping droplets flying off
      ctx.save();
      const bounceSq = Math.abs(Math.sin(step)) * r * 0.18;
      ctx.fillStyle = pal.primary || '#5cc8e8';
      ctx.globalAlpha = 0.65;
      for (const side of [-1, 1]) {
        const dropY = r * 0.45 + bounceSq;
        const dropX = side * (r * 0.75 + bounceSq * 0.5);
        ctx.beginPath(); ctx.arc(dropX, dropY, r * 0.10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 2b. Flying wing flutter & swimming fins behind the body
    if (isFlyer) {
      ctx.save();
      const wingFlap = Math.sin(t * 22 + m.seed);
      const isBat = (!m.skin && m.type === 'imp') || m.skin === 'firebat' || m.skin === 'icebat';
      const isAvian = m.skin === 'vulture' || m.skin === 'eagle' || m.skin === 'owl' || m.skin === 'raven' || m.skin === 'phoenix' || m.skin === 'griffin' || m.skin === 'sphinx';

      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.65, -r * 0.15);
        ctx.scale(side * (0.65 + wingFlap * 0.5), 1);
        if (isBat) {
          ctx.fillStyle = pal.glow || 'rgba(180, 230, 255, 0.65)';
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(r * 0.85, -r * 0.55); ctx.lineTo(r * 0.70, r * 0.15); ctx.lineTo(r * 0.35, r * 0.30);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = pal.dark || '#2a1a38';
          ctx.lineWidth = Math.max(1.8, r * 0.08);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.85, -r * 0.55); ctx.lineTo(r * 0.70, r * 0.15); ctx.stroke();
        } else if (isAvian) {
          ctx.fillStyle = pal.primary || '#8a6230';
          ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.ellipse(r * 0.5, -r * 0.1, r * 0.75, r * 0.35, -0.2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = pal.light || '#ffd25a'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(r * 0.85, -r * 0.35); ctx.lineTo(r * 1.15, -r * 0.45);
          ctx.moveTo(r * 0.95, -r * 0.15); ctx.lineTo(r * 1.25, -r * 0.20);
          ctx.stroke();
        } else {
          ctx.fillStyle = pal.glow || 'rgba(180, 230, 255, 0.65)';
          ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.65, r * 0.32, -0.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      if ((!m.skin && m.type === 'imp') || m.skin === 'firebat') {
        const tailSweep = Math.sin(t * 7 + m.seed) * r * 0.28;
        const tx1 = tailSweep * 0.6, ty1 = r * 0.85;
        const tx2 = tailSweep * 1.2, ty2 = r * 1.35;
        ctx.strokeStyle = pal.dark || '#221033';
        ctx.lineWidth = Math.max(2, r * 0.10);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, r * 0.35); ctx.quadraticCurveTo(tx1, ty1, tx2, ty2); ctx.stroke();
        drawGlow(ctx, tx2, ty2, r * 0.20, pal.glow || '#d870ff', 0.85);
        ctx.fillStyle = pal.glow || '#ff8aff';
        ctx.beginPath(); ctx.arc(tx2, ty2, r * 0.08, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw the sprite body (with subtle head/body tracking tilt)
    ctx.save();
    if (look && typeof look.x === 'number') {
      ctx.rotate(look.x * 0.08); // Head/torso tracks player direction
    }
    const aspect = spriteImg.width / spriteImg.height;
    const mult = (m.boss && m.skin === 'kraken') ? 1.85 : (m.boss && m.skin === 'frostgiant') ? 2.1 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.6 : (m.type === 'imp' ? 2.4 : 2.3)));
    const h = r * mult * (m.type === 'slimeSmall' ? 0.72 : 1);
    const w = h * aspect;
    if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.3);
    let drawImg = spriteImg;
    if (pal?.flashAmt && pal.flashAmt > 0.3) {
      drawImg = tintedImage(spriteImg, '#ffffff');
    } else if (!m.skin && tint?.primary) {
      drawImg = tintedImage(spriteImg, tint.primary);
    }
    ctx.drawImage(drawImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    // 4. Hands, Weapons & Claws animated combat articulation
    if (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton') || m.skin === 'mummy' || m.skin === 'wraith' || m.skin === 'guard' || m.skin === 'steamsoldier' || m.skin === 'emberknight') {
      const isPirate = m.skin === 'pirate';
      const isMummy = m.skin === 'mummy';
      const isWraith = m.skin === 'wraith';
      const armSwing = Math.sin(step) * 0.35;
      const windupAngle = ph === 'windup' ? -1.1 : (ph === 'burst' ? 0.7 : armSwing);

      // Primary weapon arm
      ctx.save();
      ctx.translate(r * 0.75, r * 0.05);
      ctx.rotate(0.3 + windupAngle);
      ctx.strokeStyle = isPirate ? '#b8c8b0' : isMummy ? '#c8b48a' : isWraith ? '#3c5a70' : (pal.shade || '#9bb0c0');
      ctx.lineWidth = Math.max(2, r * 0.10);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.25, -r * 0.15); ctx.stroke();

      ctx.save();
      ctx.translate(r * 0.25, -r * 0.15);
      ctx.rotate(-0.2 + (ph === 'windup' ? -0.4 : 0));
      
      if (isWraith) {
        ctx.fillStyle = '#60a8d8'; ctx.strokeStyle = '#0a1828'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.3); ctx.lineTo(r * 0.05, -r * 0.85); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.05, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.75, -r * 0.95, r * 0.85, -r * 0.45);
        ctx.quadraticCurveTo(r * 0.45, -r * 0.65, r * 0.05, -r * 0.75);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        drawGlow(ctx, r * 0.75, -r * 0.75, r * 0.35, '#9fefff', 0.8);
      } else if (isMummy) {
        ctx.fillStyle = '#ffd25a'; ctx.strokeStyle = '#3a200a'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.08, -r * 0.45);
        ctx.quadraticCurveTo(r * 0.45, -r * 0.65, r * 0.25, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.10, -r * 0.65, -r * 0.05, -r * 0.45);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = isPirate ? '#889890' : (pal.glow || '#9ff0ff');
        ctx.strokeStyle = isPirate ? '#3a4a40' : (pal.dark || '#1a202c');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.06, r * 0.08); ctx.lineTo(r * 0.12, -r * 0.65);
        ctx.lineTo(r * 0.02, -r * 0.75); ctx.lineTo(-r * 0.08, -r * 0.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(r * 0.10, -r * 0.15); ctx.lineTo(r * 0.03, -r * 0.70); ctx.stroke();
      }
      ctx.restore();
      ctx.restore();

      // Shield arm
      ctx.save();
      const shieldBob = Math.sin(step + Math.PI) * r * 0.08;
      ctx.translate(-r * 0.72, r * 0.12 + shieldBob);
      ctx.rotate(-0.2 - (ph === 'windup' ? 0.3 : 0));
      ctx.strokeStyle = isPirate ? '#b8c8b0' : isMummy ? '#c8b48a' : (pal.shade || '#9bb0c0');
      ctx.lineWidth = Math.max(2, r * 0.10);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.15, -r * 0.10); ctx.stroke();

      if (isPirate) {
        ctx.strokeStyle = '#2a3a34'; ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.15, r * 0.28, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.15); ctx.lineTo(-r * 0.15, r * 0.42); ctx.stroke();
      } else if (isMummy) {
        ctx.fillStyle = '#ffd25a'; ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.rect(-r * 0.22, 0, r * 0.14, r * 0.35); ctx.fill(); ctx.stroke();
        drawGlow(ctx, -r * 0.15, -r * 0.15, r * 0.25, '#ffe07a', 0.8);
      } else if (isWraith) {
        drawGlow(ctx, -r * 0.15, 0, r * 0.45, '#9fefff', 0.9);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = pal.shade || '#2c3e50'; ctx.strokeStyle = pal.glow || '#9ff0ff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.28); ctx.lineTo(-r * 0.22, -r * 0.20); ctx.lineTo(-r * 0.18, r * 0.25); ctx.lineTo(0, r * 0.42); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    } else if ((!m.skin && m.type === 'goblin') || m.skin === 'frostling' || m.skin === 'kobold') {
      ctx.save();
      for (const side of [-1, 1]) {
        const armSwing = Math.sin(step + (side > 0 ? 0 : Math.PI)) * 0.4;
        const daggerAngle = ph === 'windup' ? -1.2 : (ph === 'burst' ? 0.8 : armSwing);
        ctx.save();
        ctx.translate(side * r * 0.65, r * 0.12);
        ctx.rotate(side * 0.25 + daggerAngle);
        ctx.strokeStyle = pal.shade || '#3a5040'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * r * 0.22, -r * 0.18); ctx.stroke();
        ctx.translate(side * r * 0.22, -r * 0.18);
        ctx.fillStyle = pal.glow || '#7fffe0'; ctx.strokeStyle = pal.dark || '#102016'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.05, 0); ctx.lineTo(side * r * 0.08, -r * 0.48); ctx.lineTo(0, -r * 0.58); ctx.lineTo(-side * r * 0.08, -r * 0.48);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.52); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    } else if ((!m.skin && m.type === 'troll') || m.skin === 'ogre' || m.skin === 'crystalgolem') {
      ctx.save();
      const clubSwing = Math.sin(step) * 0.25;
      const windupHold = ph === 'windup' ? -1.4 : (ph === 'burst' ? 0.9 : clubSwing);
      ctx.save();
      ctx.translate(r * 0.82, r * 0.10);
      ctx.rotate(0.35 + windupHold);
      ctx.strokeStyle = pal.shade || '#3a2010'; ctx.lineWidth = Math.max(3, r * 0.18); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.25, -r * 0.22); ctx.stroke();
      ctx.translate(r * 0.25, -r * 0.22);
      ctx.strokeStyle = '#3a2212'; ctx.lineWidth = Math.max(2.5, r * 0.14);
      ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(0, -r * 0.85); ctx.stroke();
      ctx.fillStyle = pal.dark || '#22140a'; ctx.strokeStyle = pal.glow || '#ffb04a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(-r * 0.22, -r * 0.95, r * 0.44, r * 0.40); ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.save();
      const fistSwing = Math.sin(step + Math.PI) * r * 0.15;
      ctx.translate(-r * 0.75, r * 0.20 + fistSwing);
      ctx.fillStyle = pal.shade || '#3a2010';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.20, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.restore();
    } else if ((!m.skin && m.type === 'ogreBoss')) {
      ctx.save();
      const maceSwing = Math.sin(step * 0.85) * 0.25;
      const windupHold = ph === 'windup' ? -1.5 : (ph === 'burst' ? 1.1 : maceSwing);
      ctx.save();
      ctx.translate(r * 0.88, r * 0.05);
      ctx.rotate(0.3 + windupHold);
      ctx.strokeStyle = pal.dark || '#1a0d24'; ctx.lineWidth = Math.max(4, r * 0.22); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.32, -r * 0.25); ctx.stroke();
      ctx.translate(r * 0.32, -r * 0.25);
      ctx.strokeStyle = '#12051a'; ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.beginPath(); ctx.moveTo(0, r * 0.35); ctx.lineTo(0, -r * 1.10); ctx.stroke();
      drawGlow(ctx, 0, -r * 1.10, r * 0.65, pal.glow || '#c85aff', 0.9);
      ctx.fillStyle = pal.shade || '#4a1e6a'; ctx.strokeStyle = pal.glow || '#d88aff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -r * 1.10, r * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.35, -r * 1.10 + Math.sin(a) * r * 0.35);
        ctx.lineTo(Math.cos(a) * r * 0.58, -r * 1.10 + Math.sin(a) * r * 0.58);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(-r * 0.85, r * 0.15 + Math.sin(step * 0.85 + Math.PI) * r * 0.10);
      ctx.fillStyle = pal.dark || '#1a0d24'; ctx.strokeStyle = pal.glow || '#c85aff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.restore();
    } else if (m.skin === 'frostgiant') {
      ctx.save();
      const clubSwing = Math.sin(step * 0.85) * 0.25;
      const windupHold = ph === 'windup' ? -1.4 : (ph === 'burst' ? 1.0 : clubSwing);
      ctx.save();
      ctx.translate(r * 0.85, r * 0.10);
      ctx.rotate(0.3 + windupHold);
      ctx.strokeStyle = '#102030'; ctx.lineWidth = Math.max(3.5, r * 0.18);
      ctx.beginPath(); ctx.moveTo(0, r * 0.2); ctx.lineTo(0, -r * 1.05); ctx.stroke();
      drawGlow(ctx, 0, -r * 0.95, r * 0.55, '#8ff0ff', 0.9);
      ctx.fillStyle = '#60a0d0'; ctx.strokeStyle = '#c0f0ff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.7); ctx.lineTo(r * 0.25, -r * 0.75);
      ctx.lineTo(r * 0.15, -r * 1.25); ctx.lineTo(-r * 0.20, -r * 1.20);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.restore();
    } else if (m.skin === 'crab' || m.skin === 'scarab') {
      const snap = ph === 'windup' ? 1.0 : (Math.sin(t * 7 + m.seed) * 0.5 + 0.5) * 0.8;
      for (const side of [-1, 1]) {
        ctx.save();
        const armLift = Math.sin(step + (side > 0 ? 0 : Math.PI)) * r * 0.08;
        ctx.translate(side * r * 0.8, -r * 0.3 + armLift);
        ctx.rotate(side * (0.45 + Math.sin(step * 0.7) * 0.12));
        ctx.strokeStyle = pal.primary || '#d84a2a'; ctx.lineWidth = Math.max(2, r * 0.14); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, r * 0.15); ctx.lineTo(side * r * 0.1, -r * 0.12); ctx.stroke();
        ctx.translate(side * r * 0.1, -r * 0.15);
        ctx.fillStyle = pal.shade || '#8a2010';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0a1018';
        ctx.beginPath();
        ctx.moveTo(-r * 0.04, -r * 0.04);
        ctx.lineTo(side * r * 0.22, -r * 0.07 - snap * r * 0.12);
        ctx.lineTo(side * r * 0.22, -r * 0.01 + snap * r * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (m.skin === 'scorpion') {
      const snap = ph === 'windup' ? 1.0 : (Math.sin(t * 8 + m.seed) * 0.5 + 0.5) * 0.85;
      for (const side of [-1, 1]) {
        ctx.save();
        const armPump = Math.sin(step + (side > 0 ? 0 : Math.PI)) * r * 0.12;
        ctx.translate(side * r * 0.85, -r * 0.25 + armPump);
        ctx.rotate(side * (0.5 + Math.sin(step) * 0.15));
        ctx.strokeStyle = pal.shade || '#4a2810'; ctx.lineWidth = Math.max(2.5, r * 0.16); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, r * 0.2); ctx.lineTo(side * r * 0.15, -r * 0.18); ctx.stroke();
        ctx.translate(side * r * 0.15, -r * 0.18);
        ctx.fillStyle = pal.primary || '#7a421a';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#100602';
        ctx.beginPath();
        ctx.moveTo(-r * 0.05, -r * 0.05);
        ctx.lineTo(side * r * 0.32, -r * 0.12 - snap * r * 0.18);
        ctx.lineTo(side * r * 0.32, snap * r * 0.10);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (m.skin === 'turtle') {
      ctx.save();
      const hx = r * 0.45 * Math.sign(m.pvx || 1);
      ctx.translate(hx, -r * 0.05);
      const eyeX = (look?.x || 0) * r * 0.03, eyeY = (look?.y || 0) * r * 0.03;
      drawGlow(ctx, eyeX, eyeY, r * 0.14, pal.glow || '#7ff6ff', 0.8);
      ctx.fillStyle = '#fffae0';
      ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 5. Head & eye movements: swaying stalks, tracking slit pupils, blinking, glowing soul flames
    if (m.skin === 'crab') {
      for (const side of [-1, 1]) {
        const sway = Math.sin(t * 3.5 + side + m.seed) * r * 0.06;
        const headNod = Math.sin(step * 1.5) * r * 0.04;
        crEyes(ctx, side * r * 0.24 + sway, -r * 0.58 + headNod, r * 0.12, 0.0001, look, crBlink(m, t), '#1a1030', 0, pal.dark);
      }
    } else if (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton') || m.skin === 'mummy' || m.skin === 'wraith') {
      const nod = Math.sin(step * 2) * r * 0.04;
      const eyeColor = (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton')) ? '#5affea' : m.skin === 'wraith' ? '#8fffff' : '#ffd25a';
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.14 + (look?.x || 0) * r * 0.04;
        const eyeY = -r * 0.42 + nod + (look?.y || 0) * r * 0.03;
        ctx.fillStyle = 'rgba(5, 12, 18, 0.85)';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.08, 0, Math.PI * 2); ctx.fill();
        drawGlow(ctx, eyeX, eyeY, r * 0.16, eyeColor, 0.85);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.035, 0, Math.PI * 2); ctx.fill();
      }
      const jawGap = Math.max(0, Math.sin(step * 2.5)) * r * 0.06 + (ph === 'windup' ? r * 0.08 : 0);
      if (jawGap > 1) {
        ctx.fillStyle = 'rgba(10, 20, 25, 0.9)';
        ctx.beginPath(); ctx.ellipse(0, -r * 0.24 + nod + jawGap * 0.5, r * 0.12, jawGap * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if ((!m.skin && m.type === 'goblin') || m.skin === 'frostling' || m.skin === 'kobold') {
      const nod = Math.sin(step * 1.8) * r * 0.03;
      const eyeColor = (!m.skin && m.type === 'goblin') ? '#5affaa' : m.skin === 'frostling' ? '#9fefff' : '#ff9a3d';
      for (const side of [-1, 1]) {
        const earTwitch = Math.sin(t * 6 + side * 2 + m.seed) * 0.18;
        ctx.save();
        ctx.translate(side * r * 0.38, -r * 0.48 + nod);
        ctx.rotate(side * 0.65 + earTwitch);
        ctx.fillStyle = pal.primary || '#3fae9e'; ctx.strokeStyle = pal.dark || '#102018'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * r * 0.35, -r * 0.28); ctx.lineTo(0, r * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.16 + (look?.x || 0) * r * 0.04;
        const eyeY = -r * 0.36 + nod + (look?.y || 0) * r * 0.03;
        drawGlow(ctx, eyeX, eyeY, r * 0.14, eyeColor, 0.85);
        ctx.fillStyle = '#061208';
        ctx.beginPath(); ctx.ellipse(eyeX, eyeY, r * 0.03, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if ((!m.skin && m.type === 'troll') || m.skin === 'ogre') {
      const nod = Math.sin(step) * r * 0.04;
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.20 + (look?.x || 0) * r * 0.03;
        const eyeY = -r * 0.38 + nod + (look?.y || 0) * r * 0.03;
        drawGlow(ctx, eyeX, eyeY, r * 0.16, '#ff8a2a', 0.9);
        ctx.fillStyle = '#1a0802';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.04, 0, Math.PI * 2); ctx.fill();
      }
    } else if ((!m.skin && m.type === 'ogreBoss')) {
      const nod = Math.sin(step * 0.85) * r * 0.04;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.35, -r * 0.70 + nod);
        ctx.rotate(side * 0.45);
        ctx.strokeStyle = pal.dark || '#180824'; ctx.lineWidth = Math.max(3, r * 0.16); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * r * 0.25, -r * 0.45, side * r * 0.45, -r * 0.55); ctx.stroke();
        drawGlow(ctx, side * r * 0.45, -r * 0.55, r * 0.25, '#c85aff', 0.85);
        ctx.restore();
      }
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.22 + (look?.x || 0) * r * 0.04;
        const eyeY = -r * 0.36 + nod + (look?.y || 0) * r * 0.04;
        drawGlow(ctx, eyeX, eyeY, r * 0.22, '#ff3366', 0.95);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.045, 0, Math.PI * 2); ctx.fill();
      }
    } else if (m.skin === 'kraken') {
      const pulse = Math.sin(t * 4 + m.seed) * 0.5 + 0.5;
      drawGlow(ctx, 0, -r * 0.85, r * (0.2 + pulse * 0.15), '#ffd23d', 0.85);
      for (const side of [-1, 1]) {
        const ex = side * r * 0.26 + (look?.x || 0) * r * 0.04;
        const ey = -r * 0.25 + (look?.y || 0) * r * 0.04;
        drawGlow(ctx, ex, ey, r * 0.18, '#ffb820', 0.9);
        ctx.fillStyle = '#100802';
        ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.03, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (m.skin === 'lanternfin') {
      ctx.save();
      const lureSwing = Math.sin(t * 4.5 + m.seed) * r * 0.22;
      const lx = r * 0.70 + lureSwing;
      const ly = -r * 0.85 + Math.abs(Math.sin(t * 4.5)) * r * 0.10;
      ctx.strokeStyle = '#081820'; ctx.lineWidth = Math.max(1.8, r * 0.08);
      ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.45); ctx.quadraticCurveTo(r * 0.55, -r * 1.05, lx, ly); ctx.stroke();
      drawGlow(ctx, lx, ly, r * 0.35, '#8fffff', 0.95);
      drawGlow(ctx, lx, ly, r * 0.18, '#ffffff', 1.0);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(lx, ly, r * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if ((!m.skin && (m.type === 'slime' || m.type === 'slimeSmall'))) {
      const coreBob = Math.sin(t * 4 + m.seed) * r * 0.08;
      drawGlow(ctx, 0, coreBob, r * 0.45, pal.glow || '#9ff4ff', 0.9);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.25 + coreBob); ctx.lineTo(r * 0.18, coreBob);
      ctx.lineTo(0, r * 0.25 + coreBob); ctx.lineTo(-r * 0.18, coreBob);
      ctx.closePath(); ctx.fill();
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.22 + (look?.x || 0) * r * 0.03;
        const eyeY = -r * 0.15 + (look?.y || 0) * r * 0.03;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#061824';
        ctx.beginPath(); ctx.arc(eyeX + (look?.x || 0) * r * 0.04, eyeY + (look?.y || 0) * r * 0.04, r * 0.05, 0, Math.PI * 2); ctx.fill();
      }
    } else if ((!m.skin && m.type === 'imp')) {
      for (const side of [-1, 1]) {
        ctx.fillStyle = pal.dark || '#281038';
        ctx.beginPath();
        ctx.moveTo(side * r * 0.15, -r * 0.45); ctx.lineTo(side * r * 0.38, -r * 0.72); ctx.lineTo(side * r * 0.25, -r * 0.42);
        ctx.closePath(); ctx.fill();
        const eyeX = side * r * 0.18 + (look?.x || 0) * r * 0.03;
        const eyeY = -r * 0.32 + (look?.y || 0) * r * 0.03;
        drawGlow(ctx, eyeX, eyeY, r * 0.16, '#ff40e0', 0.95);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.035, 0, Math.PI * 2); ctx.fill();
      }
    } else if (m.skin === 'sphinx') {
      drawGlow(ctx, 0, -r * 0.65, r * 0.30, '#ffd25a', 0.85);
      for (const side of [-1, 1]) {
        const eyeX = side * r * 0.20 + (look?.x || 0) * r * 0.03;
        const eyeY = -r * 0.35 + (look?.y || 0) * r * 0.03;
        drawGlow(ctx, eyeX, eyeY, r * 0.16, '#ffd25a', 0.9);
        ctx.fillStyle = '#120800';
        ctx.beginPath(); ctx.ellipse(eyeX, eyeY, r * 0.03, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (sp) {
    sp.draw(ctx, m, pal, t, look);
  } else if (batImg && m.type === 'imp') {
    const img = tintedImage(batImg, tint?.primary);
    const size = r * 2.5;
    const bw = size * (batImg.width / batImg.height);
    if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.5);
    ctx.drawImage(img, -bw / 2, -size / 2, bw, size);
  } else {
    (CREATURE_DRAW[m.type] || drawGoblin)(ctx, m, pal, t, look);
  }
  ctx.restore();
}

'''
    creatures_src = creatures_src[:crbody_start] + new_crbody + creatures_src[crbody_end:]
    with open(creatures_path, 'w', encoding='utf-8') as f:
        f.write(creatures_src)
    print('Successfully patched creatures.js')
else:
    print('Warning: crBody bounds not found in creatures.js')
