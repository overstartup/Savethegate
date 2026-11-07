import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Update main.js to synchronize frame indexing with movement physics
main_path = os.path.join(ROOT, 'game', 'src', 'main.js')
with open(main_path, 'r', encoding='utf-8') as f:
    main_src = f.read()

old_main_anim = """  // baked movement frames: pick by time, only once the image has loaded
  const animKey = m.boss ? (m.skin || 'ogreBoss') : (m.skin || (m.type === 'slimeSmall' ? 'slime' : m.type));
  const animSet = ANIM_FRAMES[animKey];
  const animImg = animSet ? animSet[Math.floor((state ? state.levelTime : performance.now() / 1000) * 8 + (m.seed || 0)) % animSet.length] : null;
  m.frameImg = animImg && animImg.complete && animImg.naturalWidth ? animImg : null;"""

new_main_anim = """  // baked movement frames: pick by creature walk cycle (m.anim) for true cadence
  const animKey = m.boss ? (m.skin || 'ogreBoss') : (m.skin || (m.type === 'slimeSmall' ? 'slime' : m.type));
  const animSet = ANIM_FRAMES[animKey];
  let animImg = null;
  if (animSet && animSet.length > 0) {
    const frameIndex = Math.floor((m.anim || 0) * 1.5 + (m.seed || 0)) % animSet.length;
    const candidate = animSet[frameIndex];
    if (candidate && candidate.complete && candidate.naturalWidth) {
      animImg = candidate;
    }
  }
  m.frameImg = animImg;"""

if old_main_anim in main_src:
    main_src = main_src.replace(old_main_anim, new_main_anim)
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_src)
    print('Updated main.js animation indexing successfully!')
else:
    print('Warning: old_main_anim pattern not found in main.js')

# 2. Update creatures.js: Priority to frameImg, clean frame-by-frame rendering with NO stick overlays
creatures_path = os.path.join(ROOT, 'game', 'src', 'render', 'creatures.js')
with open(creatures_path, 'r', encoding='utf-8') as f:
    creatures_src = f.read()

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

  // Directional mirroring for right-facing sprites
  if (FACE_RIGHT.has(m.skin || m.type) && m.vx < -6) ctx.scale(-1, 1);
  ctx.rotate(crClamp(m.vx / 320, -0.4, 0.4) * (m.boss ? 0.25 : 1) + extraRot);

  // Growth pop-in and damage squash
  const pop = m.isChild ? crEaseOutBack(Math.min(1, m.spawnT / 0.3)) : m.boss ? 1 : crEaseOutBack(Math.min(1, m.spawnT / 0.45));
  const sq = m.squish * 0.2 + (ph === 'windup' && m.type !== 'imp' ? 0.12 : 0);
  ctx.scale(pop * (1 + sq) * extraScale, pop * (1 - sq) * extraScale);

  // Select sprite: PRIORITY TO FRAME-BY-FRAME ANIMATION (m.frameImg)
  const masterImg = (typeof ALL_STAGE_SPRITES !== 'undefined' && ALL_STAGE_SPRITES[m.skin || m.type])
    || (typeof SEA_SPRITES !== 'undefined' && m.skin && SEA_SPRITES[m.skin])
    || (typeof ICE_SPRITES !== 'undefined' && m.skin && ICE_SPRITES[m.skin])
    || (sp && sp.sprite)
    || enemyImg;
  const spriteImg = m.frameImg || (masterImg && (masterImg.naturalWidth || masterImg.width) ? masterImg : null);

  if (spriteImg) {
    const isSwimmer = m.skin === 'jelly' || m.skin === 'lanternfin' || m.skin === 'kraken' || m.skin === 'turtle' || m.skin === 'serpent' || m.skin === 'urchin';
    const isFlyer = m.flying || m.type === 'imp' || m.skin === 'lanternfin' || m.skin === 'icebat' || m.skin === 'vulture' || m.skin === 'moth' || m.skin === 'firebat';
    const cadence = (ph === 'burst' ? 5.2 : 3.4);
    const step = (m.anim || 0) * cadence;

    // When frame-by-frame animation (m.frameImg) is active, the artwork is ALREADY
    // beautifully articulated frame-by-frame! We do NOT draw crude vector stick limbs over it.
    // The procedural overlays below ONLY run as a fallback when no frame images exist (!m.frameImg).
    if (!m.frameImg) {
      // 1. Organic movement: step bounce, waddle roll, stride squash & stretch, breathing
      const bounce = isFlyer ? Math.sin(t * 4 + m.seed) * r * 0.12 : Math.abs(Math.cos(step)) * r * 0.14;
      const waddle = isFlyer ? Math.sin(t * 3 + m.seed) * 0.08 : Math.sin(step) * 0.11;
      const breathe = Math.sin(t * 3.5 + m.seed) * 0.04;
      const strideSq = Math.sin(step * 2) * 0.06;

      ctx.translate(0, -bounce);
      ctx.rotate(waddle);
      ctx.scale(1 + strideSq + breathe, 1 - strideSq + breathe);

      // Under-appendages fallback
      if (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton') || m.skin === 'mummy' || m.skin === 'wraith') {
        ctx.save();
        for (const side of [-1, 1]) {
          const legStride = Math.sin(step + (side > 0 ? 0 : Math.PI));
          const lift = Math.max(0, legStride);
          ctx.strokeStyle = pal.shade || '#9bb0c0'; ctx.lineWidth = Math.max(2, r * 0.10); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(side * r * 0.26, r * 0.42); ctx.lineTo(side * r * 0.30 + legStride * r * 0.16, r * 0.72 - lift * r * 0.20); ctx.lineTo(side * r * 0.32 + legStride * r * 0.22, r * 0.96 - lift * r * 0.10); ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      // For authentic frame-by-frame: subtle banking tilt during attack burst
      if (ph === 'burst') ctx.rotate(Math.sign(m.pvx || 1) * 0.18);
    }

    // Draw the frame-by-frame creature sprite
    ctx.save();
    if (look && typeof look.x === 'number') {
      ctx.rotate(look.x * 0.035); // Subtle creature eye/head tracking
    }
    const aspect = spriteImg.width / spriteImg.height;
    const mult = (m.boss && m.skin === 'kraken') ? 1.95 : (m.boss && m.skin === 'frostgiant') ? 2.1 : (m.boss ? 2.2 : (m.type === 'troll' ? 2.5 : (m.type === 'imp' ? 2.3 : 2.2)));
    const h = r * mult * (m.type === 'slimeSmall' ? 0.72 : 1);
    const w = h * aspect;

    let drawImg = spriteImg;
    if (pal?.flashAmt && pal.flashAmt > 0.3) {
      drawImg = tintedImage(spriteImg, '#ffffff');
    } else if (!m.skin && tint?.primary && !m.frameImg) {
      drawImg = tintedImage(spriteImg, tint.primary);
    }
    ctx.drawImage(drawImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Fallback over-appendages (ONLY when !m.frameImg)
    if (!m.frameImg) {
      if (m.skin === 'pirate' || (!m.skin && m.type === 'skeleton')) {
        // Simple sword arm fallback
        ctx.save();
        const armSwing = Math.sin(step) * 0.35;
        ctx.translate(r * 0.75, r * 0.05);
        ctx.rotate(0.3 + (ph === 'windup' ? -1.1 : armSwing));
        ctx.strokeStyle = pal.glow || '#9ff0ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.2, -r * 0.6); ctx.stroke();
        ctx.restore();
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
    # Also add 'turtle' to FACE_RIGHT
    creatures_src = creatures_src.replace(
        "const FACE_RIGHT = new Set(['goblin', 'lanternfin']);",
        "const FACE_RIGHT = new Set(['goblin', 'lanternfin', 'turtle']);"
    )
    with open(creatures_path, 'w', encoding='utf-8') as f:
        f.write(creatures_src)
    print('Updated creatures.js successfully!')
else:
    print('Warning: crBody bounds not found in creatures.js')
