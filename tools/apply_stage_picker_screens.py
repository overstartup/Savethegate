import re

# 1. Update game/src/ui/screens.js
with open('game/src/ui/screens.js', 'r', encoding='utf-8') as f:
    screens = f.read()

# Replace rows in homeLayout
old_rows = """  // Exact square tile bounds, reused by main.js for tap hit-testing.
  const rows = nodes.map((n) => ({ x: n.cx - n.size / 2, y: n.cy - n.size / 2, w: n.size, h: n.size }));"""
new_rows = """  // Generous island bounds so tapping the island art, banner, or name triggers the stage
  const rows = nodes.map((n) => ({ x: n.cx - 90, y: n.cy - 75, w: 180, h: 150 }));"""

if old_rows in screens:
    screens = screens.replace(old_rows, new_rows)
else:
    # Try with CRLF
    screens = screens.replace(old_rows.replace('\n', '\r\n'), new_rows.replace('\n', '\r\n'))

# Add STAGE_PICK_BUTTONS definition right before homeLayout or after
stage_picker_code = """
export const STAGE_PICK_BUTTONS = Array.from({ length: 12 }, (_, i) => {
  const btnW = 30, gap = 4;
  const totalW = 12 * btnW + 11 * gap;
  const startX = (W - totalW) / 2;
  return {
    x: startX + i * (btnW + gap),
    y: NAV_Y - 34,
    w: btnW,
    h: 28,
    stage: i + 1,
    level: i * STAGE_SIZE,
  };
});

export const PAUSE_CARD = { x: 30, y: 150, w: W - 60, h: 340 };
export const PAUSE_STAGE_BUTTONS = [];
for (let i = 0; i < 12; i++) {
  const row = Math.floor(i / 6);
  const col = i % 6;
  const bw = (PAUSE_CARD.w - 44) / 6;
  const bh = 34;
  PAUSE_STAGE_BUTTONS.push({
    x: PAUSE_CARD.x + 12 + col * (bw + 4),
    y: PAUSE_CARD.y + 112 + row * (bh + 8),
    w: bw,
    h: bh,
    stage: i + 1,
    level: i * STAGE_SIZE,
  });
}
"""

# Replace PAUSE_CARD and PAUSE_BUTTONS
old_pause_card = """const PAUSE_CARD = { x: 50, y: 250, w: W - 100, h: 220 };
const PAUSE_BTN_W = (PAUSE_CARD.w - 56) / 2, PAUSE_BTN_H = 54;
export const PAUSE_BUTTONS = {
  resume: { x: PAUSE_CARD.x + 20, y: PAUSE_CARD.y + 140, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
  exit:   { x: PAUSE_CARD.x + 20 + PAUSE_BTN_W + 16, y: PAUSE_CARD.y + 140, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
};"""

new_pause_card = stage_picker_code + """
const PAUSE_BTN_W = (PAUSE_CARD.w - 56) / 2, PAUSE_BTN_H = 46;
export const PAUSE_BUTTONS = {
  resume: { x: PAUSE_CARD.x + 20, y: PAUSE_CARD.y + 265, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
  exit:   { x: PAUSE_CARD.x + 20 + PAUSE_BTN_W + 16, y: PAUSE_CARD.y + 265, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
};"""

if old_pause_card in screens:
    screens = screens.replace(old_pause_card, new_pause_card)
else:
    screens = screens.replace(old_pause_card.replace('\n', '\r\n'), new_pause_card.replace('\n', '\r\n'))

# Enhance renderPause to draw the stage buttons
old_render_pause = """  const pauseSub = tr('m.pause.sub');
  ctx.font = fitFont(ctx, pauseSub, `14px ${F_BODY}`, c.w - 24);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(pauseSub, W / 2, c.y + 90);

  const rb = PAUSE_BUTTONS.resume;"""

new_render_pause = """  const pauseSub = tr('m.pause.sub');
  ctx.font = fitFont(ctx, pauseSub, `14px ${F_BODY}`, c.w - 24);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(pauseSub, W / 2, c.y + 80);

  // Quick Stage Selector inside Pause Menu
  ctx.font = `12px ${F_TITLE}`;
  ctx.fillStyle = '#ffd23d';
  ctx.fillText('⚡ TAP ANY STAGE TO TEST ⚡', W / 2, c.y + 102);

  const STAGE_COLORS = [
    '#38bdf8', '#93c5fd', '#fcd34d', '#c084fc', '#f87171', '#fbbf24',
    '#a855f7', '#818cf8', '#fb923c', '#4ade80', '#94a3b8', '#22c55e'
  ];

  PAUSE_STAGE_BUTTONS.forEach((b, i) => {
    ctx.save();
    ctx.fillStyle = STAGE_COLORS[i % STAGE_COLORS.length] + '40';
    ctx.strokeStyle = STAGE_COLORS[i % STAGE_COLORS.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `14px ${F_TITLE}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(String(b.stage), b.x + b.w / 2, b.y + b.h / 2 + 5);
    ctx.restore();
  });

  const rb = PAUSE_BUTTONS.resume;"""

if old_render_pause in screens:
    screens = screens.replace(old_render_pause, new_render_pause)
else:
    screens = screens.replace(old_render_pause.replace('\n', '\r\n'), new_render_pause.replace('\n', '\r\n'))

# Add STAGE_PICK_BUTTONS to renderMenu right before drawBottomNav
old_nav_draw = """  drawBottomNav(ctx, 'play');"""
new_nav_draw = """  // Quick Stage Select Bar above bottom nav
  const STAGE_COLORS = [
    '#38bdf8', '#93c5fd', '#fcd34d', '#c084fc', '#f87171', '#fbbf24',
    '#a855f7', '#818cf8', '#fb923c', '#4ade80', '#94a3b8', '#22c55e'
  ];
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 28, 0.85)';
  ctx.beginPath();
  ctx.roundRect(6, NAV_Y - 40, W - 12, 36, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 61, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  STAGE_PICK_BUTTONS.forEach((b, i) => {
    ctx.fillStyle = STAGE_COLORS[i % STAGE_COLORS.length];
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `13px ${F_TITLE}`;
    ctx.fillStyle = '#0a0a14';
    ctx.textAlign = 'center';
    ctx.fillText(String(b.stage), b.x + b.w / 2, b.y + b.h / 2 + 4.5);
  });
  ctx.restore();

  drawBottomNav(ctx, 'play');"""

if old_nav_draw in screens:
    screens = screens.replace(old_nav_draw, new_nav_draw)
else:
    screens = screens.replace(old_nav_draw.replace('\n', '\r\n'), new_nav_draw.replace('\n', '\r\n'))

with open('game/src/ui/screens.js', 'w', encoding='utf-8') as f:
    f.write(screens)
print("Updated game/src/ui/screens.js successfully")
