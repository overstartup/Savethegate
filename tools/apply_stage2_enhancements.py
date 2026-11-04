import os
import re

# ============================================================
# 1. Patch stagefx.js — Remove the center circle/puddle in Stage 2
# ============================================================
with open('game/src/systems/stagefx.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Disable items in sxReset for id === 'ice'
target_reset = """  if (id === 'ice') {
    const n = 1 + Math.round(sx.k * 2);
    for (let i = 0; i < n; i++) {
      // spread the patches across the hero's usual band, one per column
      const col = (i + 0.5) / n;
      sx.items.push({ x: sxClamp(col * CONFIG.width + sxRand(-30, 30), 70, CONFIG.width - 70), y: sxRand(400, 590),
        rx: sxRand(62, 80), ry: sxRand(26, 34), seed: Math.random() * 10 });
    }
  }"""

repl_reset = """  if (id === 'ice') {
    // Disabled circle in center: field kept clean and natural for Stage 2
  }"""

if target_reset in text:
    text = text.replace(target_reset, repl_reset, 1)

# Disable drawing in sxDrawBack
target_draw = """  if (id === 'ice') {
    for (const e of sx.items) {
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(e.x - e.rx * 0.3, e.y - e.ry * 0.3, 2, e.x, e.y, e.rx);
      g.addColorStop(0, 'rgba(200,245,255,0.9)');
      g.addColorStop(0.5, 'rgba(80,185,245,0.8)');
      g.addColorStop(1, 'rgba(30,120,210,0.8)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9; ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b4f7a'; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.rx + 3, e.ry + 3, 0, 0, Math.PI * 2); ctx.stroke();
      // snowflake mark so it reads as "slippery", not as scenery
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3 + t * 0.3;
        ctx.moveTo(e.x + e.rx * 0.5 - Math.cos(a) * 8, e.y - Math.sin(a) * 8);
        ctx.lineTo(e.x + e.rx * 0.5 + Math.cos(a) * 8, e.y + Math.sin(a) * 8);
      }
      ctx.stroke();
      // cracks + a sweeping glint
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = e.seed + i * 2.1;
        ctx.moveTo(e.x + Math.cos(a) * e.rx * 0.15, e.y + Math.sin(a) * e.ry * 0.15);
        ctx.lineTo(e.x + Math.cos(a) * e.rx * 0.65, e.y + Math.sin(a) * e.ry * 0.6);
      }
      ctx.stroke();
      const gx = e.x - e.rx + ((t * 50 + e.seed * 40) % (e.rx * 3));
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(gx, e.y - e.ry * 0.3, 6, e.ry * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'lava') {"""

repl_draw = """  if (id === 'ice') {
    // Disabled circle in center for Stage 2
  } else if (id === 'lava') {"""

if target_draw in text:
    text = text.replace(target_draw, repl_draw, 1)

with open('game/src/systems/stagefx.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('stagefx.js patched: Stage 2 center circle removed!')

# ============================================================
# 2. Patch spawner.js & obstacle.js — Stage 2 High-Def Rolling Ice Stones
# ============================================================
with open('game/src/systems/spawner.js', 'r', encoding='utf-8') as f:
    sp_text = f.read()

target_sp = "if (def.decor === 'bubbles') o.spriteChoice = Math.random() < 0.5 ? 'barrel' : 'crate';"
repl_sp = """if (def.decor === 'bubbles') o.spriteChoice = Math.random() < 0.5 ? 'barrel' : 'crate';
      if (def.decor === 'snow') {
        const iceChoices = ['ice_rocks_large', 'ice_rocks_small', 'crystal_large', 'crystal_medium'];
        o.spriteChoice = iceChoices[Math.floor(Math.random() * iceChoices.length)];
        o.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.5);
      }"""

if target_sp in sp_text and 'iceChoices' not in sp_text:
    sp_text = sp_text.replace(target_sp, repl_sp, 1)
    with open('game/src/systems/spawner.js', 'w', encoding='utf-8') as f:
        f.write(sp_text)
    print('spawner.js patched: Stage 2 ice stone spriteChoices added!')

with open('game/src/entities/obstacle.js', 'r', encoding='utf-8') as f:
    ob_text = f.read()

target_ob_roll = "this.roll += (CONFIG.obstacle.driftSpeed + this.vx * 0.6) * dt / r;"
repl_ob_roll = """if (this.rotSpeed) {
      this.roll += this.rotSpeed * dt;
    } else {
      this.roll += (CONFIG.obstacle.driftSpeed + this.vx * 0.6) * dt / r;
    }"""

if target_ob_roll in ob_text and 'this.rotSpeed' not in ob_text:
    ob_text = ob_text.replace(target_ob_roll, repl_ob_roll, 1)
    with open('game/src/entities/obstacle.js', 'w', encoding='utf-8') as f:
        f.write(ob_text)
    print('obstacle.js patched: smooth rolling physics added!')

# ============================================================
# 3. Patch main.js — Render High-Def Ice Stones in drawObstacle
# ============================================================
with open('game/src/main.js', 'r', encoding='utf-8') as f:
    main_text = f.read()

idx_case = main_text.find("case 'ice': {")
end_case = main_text.find("break;", idx_case)
old_case_ice = main_text[idx_case:end_case+6]

new_case_ice = """case 'ice': { // High-definition rolling glacial rock / crystal
      const choice = o.spriteChoice || 'ice_rocks_large';
      const img = (typeof ICE_GLACIAL !== 'undefined' && ICE_GLACIAL[choice]) || (typeof ICE_GLACIAL !== 'undefined' && ICE_GLACIAL.ice_rocks_large);
      if (img && (img.naturalWidth || img.width)) {
        const dw = r * 2.3, dh = dw * (img.height / img.width);
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        // Dynamic crystalline glint
        const spark = Math.sin(t * 6 + (o.seed || 0));
        if (spark > 0.45) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(r * 0.35, -r * 0.35, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const pts = obOutline(o, r, 7, 0.12);
        obPath(pts); ctx.fillStyle = 'rgba(150,215,245,0.92)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3);
        for (const k of [2, 4, 6]) { ctx.lineTo(pts[k][0] * 0.95, pts[k][1] * 0.95); ctx.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3); }
        ctx.stroke();
      }
      break;"""

if old_case_ice in main_text:
    main_text = main_text.replace(old_case_ice, new_case_ice, 1)
    with open('game/src/main.js', 'w', encoding='utf-8') as f:
        f.write(main_text)
    print('main.js patched: High-definition rolling ice rocks render connected!')

# ============================================================
# 4. Patch make_enemy_frames.py with advanced displacements
# ============================================================
with open('tools/make_enemy_frames.py', 'r', encoding='utf-8') as f:
    tool_text = f.read()

idx_s2 = tool_text.find("if style == 'front_walk':")
end_s2 = tool_text.find("return dx, dy", idx_s2)
# find the next return dx, dy
end_s2 = tool_text.find("return dx, dy", tool_text.find("if style == 'titan_march':")) + 13
old_s2_block = tool_text[idx_s2:end_s2]

new_s2_block = """if style == 'front_walk':
        # 1. Legs alternating stride
        leg_l = np.clip((-nx - 0.04) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.75, 0, 1) ** 1.2
        leg_r = np.clip((nx - 0.04) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.75, 0, 1) ** 1.2
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.3
        lift_r = np.maximum(0, np.sin(theta)) ** 1.3
        dy -= amp * 26.0 * (leg_l * lift_l + leg_r * lift_r)
        dx += amp * 12.0 * (leg_l * np.cos(theta) - leg_r * np.cos(theta))
        
        # 2. Body run bounce & torso lean
        dy -= amp * 14.0 * np.abs(np.sin(theta))
        dx += amp * 8.0 * np.sin(theta)
        
        # 3. Dagger arms dynamic thrusts
        arm_l = np.clip((-nx - 0.15) / 0.5, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        arm_r = np.clip((nx - 0.15) / 0.5, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        dy += amp * 16.0 * np.cos(theta) * arm_l - amp * 16.0 * np.cos(theta) * arm_r
        dx += amp * 10.0 * np.sin(theta) * (arm_l + arm_r)
        return dx, dy
    if style == 'front_bounce':
        lift = np.sin(theta)**2
        squash = np.cos(theta * 2)
        dy_jump = -amp * 36.0 * lift
        dy += dy_jump + amp * 26.0 * squash * ny
        dx -= amp * 24.0 * squash * nx
        base_mask = np.clip((ny - 0.2) / 0.8, 0, 1) ** 1.4
        dx -= amp * 16.0 * np.maximum(0, squash) * nx * base_mask
        shard_mask = np.clip((0.2 - ny) / 0.8, 0, 1)
        dx += amp * 12.0 * np.sin(theta * 2 - 0.6) * shard_mask
        return dx, dy
    if style == 'front_bat_flap':
        wx = np.clip((np.abs(nx) - 0.22) / 0.78, 0, 1) ** 1.2
        flap = np.sin(theta)
        dy += amp * 48.0 * flap * wx
        dx -= amp * 18.0 * flap * wx * np.sign(nx)
        tip_mask = np.clip((np.abs(nx) - 0.65) / 0.35, 0, 1)
        dy += amp * 16.0 * np.sin(theta + 0.4) * tip_mask
        body_mask = 1.0 - wx
        dy -= amp * 14.0 * flap * body_mask
        return dx, dy
    if style == 'spectral_hover':
        dy += amp * 22.0 * np.sin(theta)
        hem_mask = np.clip((ny - 0.05) / 0.95, 0, 1) ** 1.3
        dx += amp * 30.0 * np.sin(theta * 1.5 - ny * 4.0) * hem_mask
        dx += amp * 12.0 * np.cos(theta * 2.5 - ny * 6.0) * hem_mask
        dy += amp * 10.0 * np.cos(theta * 1.5 - ny * 3.5) * hem_mask
        claw_mask = np.clip((np.abs(nx) - 0.18) / 0.6, 0, 1) * np.clip((0.35 - np.abs(ny)) / 0.6, 0, 1)
        dy -= amp * 15.0 * np.cos(theta) * claw_mask
        dx += amp * 12.0 * np.sin(theta) * np.sign(nx) * claw_mask
        return dx, dy
    if style == 'heavy_stomp':
        dx += amp * 16.0 * np.sin(theta)
        dy -= amp * 16.0 * np.abs(np.sin(theta * 2))
        paw_l = np.clip((-nx - 0.06) / 0.5, 0, 1) * np.clip((ny - 0.18) / 0.8, 0, 1) ** 1.3
        paw_r = np.clip((nx - 0.06) / 0.5, 0, 1) * np.clip((ny - 0.18) / 0.8, 0, 1) ** 1.3
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.3
        lift_r = np.maximum(0, np.sin(theta)) ** 1.3
        dy -= amp * 32.0 * (paw_l * lift_l + paw_r * lift_r)
        dx += amp * 12.0 * (paw_l * np.cos(theta) - paw_r * np.cos(theta))
        arm_l = np.clip((-nx - 0.22) / 0.55, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        arm_r = np.clip((nx - 0.22) / 0.55, 0, 1) * np.clip((0.35 - ny) / 0.8, 0, 1)
        dy += amp * 22.0 * np.cos(theta) * arm_l - amp * 22.0 * np.cos(theta) * arm_r
        dx += amp * 14.0 * np.sin(theta) * (arm_l + arm_r)
        return dx, dy
    if style == 'titan_march':
        dx += amp * 14.0 * np.sin(theta)
        dy -= amp * 14.0 * np.abs(np.sin(theta * 2))
        leg_l = np.clip((-nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.78, 0, 1) ** 1.3
        leg_r = np.clip((nx - 0.05) / 0.45, 0, 1) * np.clip((ny - 0.18) / 0.78, 0, 1) ** 1.3
        lift_l = np.maximum(0, -np.sin(theta)) ** 1.4
        lift_r = np.maximum(0, np.sin(theta)) ** 1.4
        dy -= amp * 28.0 * (leg_l * lift_l + leg_r * lift_r)
        hammer_mask = np.clip((nx - 0.15) / 0.85, 0, 1) * np.clip((0.4 - ny) / 0.8, 0, 1)
        dy += amp * 20.0 * np.sin(theta + 0.4) * hammer_mask
        dx += amp * 14.0 * np.cos(theta + 0.4) * hammer_mask
        head_mask = np.clip((0.2 - ny) / 0.7, 0, 1) * (1.0 - np.clip(np.abs(nx) - 0.2, 0, 1))
        dy += amp * 8.0 * np.sin(theta) * head_mask
        return dx, dy"""

tool_text = tool_text.replace(old_s2_block, new_s2_block, 1)
with open('tools/make_enemy_frames.py', 'w', encoding='utf-8') as f:
    f.write(tool_text)
print('make_enemy_frames.py updated with advanced stage 2 animation displacements!')

