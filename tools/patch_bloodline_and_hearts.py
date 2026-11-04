import os

# 1. Patch main.js (always line for enemies, hero loses when blood finishes)
with open('game/src/main.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace pip dots with clean solid bar for all enemies
old_bloodline = """  if (m.maxHp > 1 && !m.boss) {
    const py = m.y - m.r - 9;
    if (m.maxHp <= 8) {
      const pipW = 4, gap = 1.5;
      const total = m.maxHp * pipW + (m.maxHp - 1) * gap;
      let px = m.x - total / 2;
      for (let i = 0; i < m.maxHp; i++) {
        ctx.fillStyle = i < m.hp ? '#ff5d7a' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(px + pipW / 2, py, pipW / 2, 0, Math.PI * 2);
        ctx.fill();
        px += pipW + gap;
      }
    } else {
      const w = m.r * 1.3;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(m.x - w / 2, py - 1.5, w, 3);
      ctx.fillStyle = '#ff5d7a';
      ctx.fillRect(m.x - w / 2, py - 1.5, w * (m.hp / m.maxHp), 3);
    }
  }"""

new_bloodline = """  if (m.maxHp > 1 && !m.boss) {
    const py = m.y - m.r - 9;
    const w = Math.max(26, m.r * 1.4);
    const h = 4;
    // Dark slot background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(m.x - w / 2, py - h / 2, w, h, 2);
    else ctx.fillRect(m.x - w / 2, py - h / 2, w, h);
    ctx.fill();
    // Smooth blood line fill
    const fillFrac = Math.max(0, Math.min(1, m.hp / m.maxHp));
    if (fillFrac > 0) {
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(m.x - w / 2, py - h / 2, w * fillFrac, h, 2);
      else ctx.fillRect(m.x - w / 2, py - h / 2, w * fillFrac, h);
      ctx.fill();
    }
  }"""

assert old_bloodline in text, "old_bloodline not found in main.js"
text = text.replace(old_bloodline, new_bloodline, 1)

# In bloodLost(who):
old_bloodlost = """  bloodLost(who) {
    state.lives--;
    // Losing a heart restores half the blood line — prevents a drained
    // Guardian from chain-losing every heart in a single bullet volley.
    if (who === state.player) { who.blood = who.maxBlood * 0.5; who.invuln = 1.5; }
    state.gateFlash = 0.35;
    audio.crack();
    particles.addShake(6);
    particles.poof(who.x, who.y, '#ff5d7a');
    if (state.lives === 1) announcer.show(tr('g.lastGate'), tr('g.protectGate'), '#ff5c7a', 1.3);
    if (state.lives <= 0 && state.dc) { dcFinish(false); return; } // Daily Challenge: straight to its results
    if (state.lives <= 0) {
      mode = 'GAMEOVER';"""

new_bloodlost = """  bloodLost(who) {
    // Hero blood is equal to his life — once blood finishes, he loses.
    if (who === state.player) {
      who.blood = 0;
      state.lives = 0;
    } else {
      state.lives--;
    }
    state.gateFlash = 0.35;
    audio.crack();
    particles.addShake(6);
    particles.poof(who.x, who.y, '#ff5d7a');
    if (state.lives <= 0 && state.dc) { dcFinish(false); return; }
    if (state.lives <= 0 || (who === state.player && who.blood <= 0)) {
      mode = 'GAMEOVER';"""

assert old_bloodlost in text, "old_bloodlost not found in main.js"
text = text.replace(old_bloodlost, new_bloodlost, 1)

# In breach(m):
old_breach = """  breach(m) {
    if (mode !== 'PLAYING') return; // run already ended this frame
    state.lives--;
    state.combo = 0;
    state.gateFlash = 0.5;
    audio.crack();
    particles.addShake(10);
    particles.shatter(m.x, CONFIG.gateY, '#ff5c7a', 14, 10);
    particles.ring(m.x, CONFIG.gateY, '#ff5c7a', 120, 0.45, 6);
    particles.scoreText(m.x, CONFIG.gateY - 20, '-1 ♥', '#ff5c7a', 22);
    state.player.hurtFlash = 0.4;
    if (state.lives === 1) announcer.show(tr('g.lastGate'), tr('g.protectGate'), '#ff5c7a', 1.3);
    if (state.lives <= 0 && state.dc) { dcFinish(false); return; } // Daily Challenge: straight to its results
    if (state.lives <= 0) {"""

new_breach = """  breach(m) {
    if (mode !== 'PLAYING') return; // run already ended this frame
    // A breach directly damages the hero's blood bar
    state.player.blood = Math.max(0, state.player.blood - state.player.maxBlood * 0.35);
    state.combo = 0;
    state.gateFlash = 0.5;
    audio.crack();
    particles.addShake(10);
    particles.shatter(m.x, CONFIG.gateY, '#ff5c7a', 14, 10);
    particles.ring(m.x, CONFIG.gateY, '#ff5c7a', 120, 0.45, 6);
    particles.scoreText(m.x, CONFIG.gateY - 20, '-GATE', '#ff5c7a', 22);
    state.player.hurtFlash = 0.4;
    if (state.player.blood <= 0) {
      state.lives = 0;
      if (state.dc) { dcFinish(false); return; }
      mode = 'GAMEOVER';"""

assert old_breach in text, "old_breach not found in main.js"
text = text.replace(old_breach, new_breach, 1)

with open('game/src/main.js', 'w', encoding='utf-8') as f:
    f.write(text)
print('main.js patched successfully!')

# 2. Patch hud.js (remove hearts from top HUD)
with open('game/src/ui/hud.js', 'r', encoding='utf-8') as f:
    hud_text = f.read()

old_hearts_hud = """  // Lives (top-right, below the pause button)
  for (let i = 0; i < CONFIG.gateHealth; i++) {
    heart(ctx, CONFIG.width - 22 - i * 25, HEART_Y, 18, i < state.lives);
  }"""

assert old_hearts_hud in hud_text, "old_hearts_hud not found in hud.js"
# Remove the heart loop
hud_text = hud_text.replace(old_hearts_hud, "  // Hearts removed: hero blood line under feet represents his life", 1)

with open('game/src/ui/hud.js', 'w', encoding='utf-8') as f:
    f.write(hud_text)
print('hud.js patched successfully!')

