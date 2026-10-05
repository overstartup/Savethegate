// HUD — score, coins, hearts, level name, combo, weapon buy-buttons.
import { CONFIG } from '../config.js';
import { WEAPONS, STAGE_SIZE } from '../data/levels.js';
import { F_TITLE, F_BODY, CANNON_FRAMES } from './screens.js';

// All 5 buy-able items (bomb, shield, wall, turret, angel) in a single
// evenly-spaced row along the bottom, instead of the old two-row split
// (wall/turret stacked above bomb/shield). Free-ad button gets its own
// small slot centered just above the row so it doesn't crowd the 5 main
// icons, and only actually shows once a rewarded ad is ready.
const ROW_Y = CONFIG.height - CONFIG.hud.rowBottomOffset, ROW_W = 60, ROW_H = CONFIG.hud.rowHeight, ROW_GAP = 13;
const ROW_KEYS = ['bomb', 'shield', 'wall', 'turret', 'angel'];
const ROW_MARGIN = (CONFIG.width - (ROW_KEYS.length * ROW_W + (ROW_KEYS.length - 1) * ROW_GAP)) / 2;
const rowSlot = (i) => ({ x: ROW_MARGIN + i * (ROW_W + ROW_GAP), y: ROW_Y, w: ROW_W, h: ROW_H });

export const BUTTONS = {
  bomb: rowSlot(0),
  shield: rowSlot(1),
  wall: rowSlot(2),
  turret: rowSlot(3),
  angel: rowSlot(4),
  watchAd: { x: CONFIG.width / 2 - 34, y: CONFIG.height - 114, w: 68, h: 44 },
  shop: { x: 6, y: 42, w: 76, h: 24 },  // tap the coin pill to open the shop
  pause: { x: CONFIG.width - 34, y: 6, w: 28, h: 28 },  // top-right corner
};

// Hearts moved down to y=46 (from the old y=14) to make room for the pause
// button now sitting in that top-right corner above them.
const HEART_Y = 46;
let comboShown = 0, comboPop = 0;

export function buttonAt(x, y) {
  for (const k in BUTTONS) {
    const b = BUTTONS[k];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return k;
  }
  return null;
}

function heart(ctx, x, y, s, filled) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5c7a' : 'rgba(255,255,255,0.15)';
  ctx.fill();
  ctx.strokeStyle = '#2a1f4d';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function coin(ctx, x, y, r) {
  ctx.fillStyle = '#ffd23d';
  ctx.strokeStyle = '#a8781a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a8781a';
  ctx.font = `bold ${r * 1.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('¢', x, y + r * 0.45);
}

function drawBombIcon(ctx, cx, cy) {
  ctx.fillStyle = '#333';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy + 4, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx + 8, cy - 6); ctx.quadraticCurveTo(cx + 16, cy - 16, cx + 10, cy - 20); ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.arc(cx + 10, cy - 21, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(cx - 5, cy - 1, 4.5, 0, Math.PI * 2); ctx.fill();
}

function drawAngelIcon(ctx, cx, cy) {
  ctx.fillStyle = 'rgba(154,230,255,0.9)';
  ctx.strokeStyle = '#1c3a52';
  ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + s * 11, cy + 3, 8, 4, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#bdeeff';
  ctx.beginPath(); ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7fd8ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(cx, cy - 11, 7, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawShieldIcon(ctx, cx, cy) {
  ctx.fillStyle = 'rgba(127,216,255,0.85)';
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 15);
  ctx.lineTo(cx + 12, cy - 9);
  ctx.lineTo(cx + 12, cy + 4);
  ctx.quadraticCurveTo(cx + 12, cy + 15, cx, cy + 19);
  ctx.quadraticCurveTo(cx - 12, cy + 15, cx - 12, cy + 4);
  ctx.lineTo(cx - 12, cy - 9);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 1); ctx.lineTo(cx - 1, cy + 5); ctx.lineTo(cx + 6, cy - 7);
  ctx.stroke();
}

function drawWallIcon(ctx, cx, cy) {
  ctx.fillStyle = '#a9642f';
  ctx.strokeStyle = '#5c3418';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - 14, cy - 9, 28, 18, 3); ctx.fill(); ctx.stroke();
  // brick lines
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy);
  ctx.moveTo(cx - 7, cy - 9); ctx.lineTo(cx - 7, cy);
  ctx.moveTo(cx + 7, cy - 9); ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 9);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(cx - 13, cy - 8, 26, 3);
}

function drawTurretIcon(ctx, cx, cy) {
  const img = CANNON_FRAMES.idle;
  if (img) {
    const dh = 34, dw = dh * (img.width / img.height);
    ctx.drawImage(img, cx - dw / 2, cy + 12 - dh, dw, dh);
    return;
  }
  // Fallback (art not yet loaded)
  ctx.fillStyle = '#5a6270';
  ctx.strokeStyle = '#20242c';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy + 5, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy + 5);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#3a3f48';
  ctx.strokeStyle = '#15171c';
  ctx.beginPath(); ctx.roundRect(-4, -20, 8, 18, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(cx - 3, cy + 2, 3, 0, Math.PI * 2); ctx.fill();
}

function drawTvIcon(ctx, cx, cy) {
  ctx.fillStyle = '#2a2a3d';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - 13, cy - 9, 26, 18, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7fd8ff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 6, cy - 12); ctx.lineTo(cx - 10, cy - 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 6, cy - 12); ctx.lineTo(cx + 10, cy - 18); ctx.stroke();
  // play triangle
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy - 5); ctx.lineTo(cx - 4, cy + 5); ctx.lineTo(cx + 5, cy);
  ctx.closePath(); ctx.fill();
}

function drawButton(ctx, key, state, adsReady) {
  const b = BUTTONS[key];
  const isAd = key === 'watchAd';
  const cost = isAd ? 0 : WEAPONS[key].cost;
  const affordable = isAd ? adsReady : state.coins >= cost;
  ctx.globalAlpha = affordable ? 0.95 : 0.55;

  // Soft outer glow behind the frame so the row reads as lit pedestals
  // rather than flat UI chrome — an inexpensive way to echo the "ornate
  // ice-arch" look without needing per-theme art for the whole HUD.
  ctx.save();
  ctx.shadowColor = affordable ? (isAd ? '#7fd8ff' : '#ffd23d') : 'rgba(255,90,90,0.5)';
  ctx.shadowBlur = affordable ? 10 : 4;
  ctx.fillStyle = 'rgba(20,12,45,0.75)';
  ctx.strokeStyle = affordable ? (isAd ? '#7fd8ff' : '#ffd23d') : 'rgba(255,90,90,0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 12);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  // Inner top highlight — a thin bright arc along the top edge, like light
  // catching a curved rim, plus small frost-glint corner dots.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h * 0.15, b.w * 0.42, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(b.x + 6, b.y + 6, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x + b.w - 6, b.y + 6, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const cx = b.x + b.w / 2, cy = b.y + b.h / 2 - 6;
  if (key === 'bomb') drawBombIcon(ctx, cx, cy);
  else if (key === 'angel') drawAngelIcon(ctx, cx, cy);
  else if (key === 'shield') drawShieldIcon(ctx, cx, cy);
  else if (key === 'wall') drawWallIcon(ctx, cx, cy);
  else if (key === 'turret') drawTurretIcon(ctx, cx, cy);
  else drawTvIcon(ctx, cx, cy);

  if (isAd) {
    ctx.fillStyle = affordable ? '#7fd8ff' : '#999';
    ctx.font = `11px ${F_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillText('FREE', cx, b.y + b.h - 7);
  } else {
    coin(ctx, cx - 12, b.y + b.h - 11, 6);
    ctx.fillStyle = affordable ? '#ffd23d' : '#ff9a9a';
    ctx.font = `12px ${F_BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(cost), cx - 3, b.y + b.h - 7);
  }
  ctx.globalAlpha = 1;

  // Clear buy/lock indicator: green check if affordable, red "+" (go buy coins) if not.
  const badgeX = b.x + b.w - 8, badgeY = b.y + 8;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
  ctx.fillStyle = affordable ? '#3fbf6f' : '#e0483d';
  ctx.fill();
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (affordable && !isAd) {
    // checkmark
    ctx.moveTo(badgeX - 4, badgeY);
    ctx.lineTo(badgeX - 1, badgeY + 3);
    ctx.lineTo(badgeX + 4, badgeY - 4);
  } else if (!affordable) {
    // plus (go buy more coins)
    ctx.moveTo(badgeX - 4, badgeY); ctx.lineTo(badgeX + 4, badgeY);
    ctx.moveTo(badgeX, badgeY - 4); ctx.lineTo(badgeX, badgeY + 4);
  }
  ctx.stroke();
}

function drawCoinPill(ctx, state) {
  const b = BUTTONS.shop;
  ctx.fillStyle = 'rgba(20,12,45,0.7)';
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
  ctx.fill(); ctx.stroke();

  coin(ctx, b.x + 14, b.y + b.h / 2, 8);
  ctx.fillStyle = '#fff';
  ctx.font = `14px ${F_BODY}`;
  ctx.textAlign = 'left';
  ctx.fillText(String(state.coins), b.x + 25, b.y + b.h / 2 + 5);

  // little "+" badge to make it obviously tappable
  ctx.beginPath();
  ctx.arc(b.x + b.w - 2, b.y + b.h / 2, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#3fbf6f';
  ctx.fill();
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + b.w - 6, b.y + b.h / 2); ctx.lineTo(b.x + b.w + 2, b.y + b.h / 2);
  ctx.moveTo(b.x + b.w - 2, b.y + b.h / 2 - 4); ctx.lineTo(b.x + b.w - 2, b.y + b.h / 2 + 4);
  ctx.stroke();
}

export function renderHUD(ctx, state, adsReady = false) {
  // Score (top-left)
  ctx.textAlign = 'left';
  ctx.font = `24px ${F_TITLE}`;
  ctx.fillStyle = '#ffd23d';
  ctx.strokeStyle = '#2a1f4d';
  ctx.lineWidth = 4;
  ctx.strokeText(String(state.score), 14, 34);
  ctx.fillText(String(state.score), 14, 34);

  // Coins (tappable pill, opens the shop)
  drawCoinPill(ctx, state);

  // Level (top-center) — two stacked lines, both set in the same bold
  // title font/style now (was italic/softer for the name) so the level's
  // flavor name reads as part of the same readout, not a separate caption.
  ctx.textAlign = 'center';
  const stageNum = Math.ceil(state.spawner.level / STAGE_SIZE);
  const levelInStage = ((state.spawner.level - 1) % STAGE_SIZE) + 1;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  ctx.font = `bold 16px ${F_TITLE}`;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(`STAGE ${stageNum} · LV ${levelInStage}/${STAGE_SIZE}`, CONFIG.width / 2, 21);

  ctx.font = `bold 12px ${F_TITLE}`;
  ctx.fillStyle = 'rgba(255,233,168,0.75)';
  ctx.fillText(state.levelDef.name, CONFIG.width / 2, 36);
  ctx.restore();

  // Level progress bar — tracks the attacker quota being sent out (not a
  // clock), thin/small to match the rest of the HUD's slimmer bars.
  const prog = Math.min(1, state.spawner.spawnedCount / state.spawner.totalAttackers);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(CONFIG.width / 2 - 55, 44, 110, 3);
  ctx.fillStyle = '#7fd8ff';
  ctx.fillRect(CONFIG.width / 2 - 55, 44, 110 * prog, 3);

  // Lives (top-right, below the pause button)
  for (let i = 0; i < CONFIG.gateHealth; i++) {
    heart(ctx, CONFIG.width - 22 - i * 25, HEART_Y, 18, i < state.lives);
  }

  // Pause button (top-right corner)
  {
    const b = BUTTONS.pause;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.fillStyle = 'rgba(20,12,45,0.75)';
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, b.w / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7fd8ff';
    ctx.fillRect(cx - 6, cy - 7, 4, 14);
    ctx.fillRect(cx + 2, cy - 7, 4, 14);
  }

  // Combo
  // Combo — punchy counter that pops on every kill and heats up from icy
  // blue toward hot pink as it nears the FEVER threshold (25).
  if (state.combo !== comboShown) { if (state.combo > comboShown) comboPop = 1; comboShown = state.combo; }
  comboPop *= 0.88;
  if (state.combo >= 3) {
    const heat = Math.min(1, state.combo / 25);
    const col = `hsl(${195 + heat * 135},100%,${65 + heat * 5}%)`;
    const sc = 1 + comboPop * 0.45;
    ctx.save();
    ctx.translate(16, 92);
    ctx.scale(sc, sc);
    ctx.textAlign = 'left';
    ctx.font = `24px ${F_TITLE}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,10,40,0.8)';
    ctx.strokeText(`×${state.combo}`, 0, 0);
    ctx.fillStyle = col;
    ctx.fillText(`×${state.combo}`, 0, 0);
    ctx.restore();
    ctx.font = `11px ${F_TITLE}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'left';
    ctx.fillText('COMBO', 16, 104);
    // combo timer bar — how long until the chain drops
    const tw = 54 * Math.max(0, Math.min(1, state.comboTimer / 1.2));
    ctx.fillStyle = col;
    ctx.fillRect(16, 108, tw, 3);
  }

  // Active gate effect
  const p = state.player;
  if (p.fireRateMultTime > 0) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = p.fireRateMult > 1 ? '#58e07f' : '#b358e0';
    ctx.fillText(
      `${p.fireRateMult > 1 ? '×' + p.fireRateMult : '×½'} magic ${Math.ceil(p.fireRateMultTime)}s`,
      p.x, p.y - 42
    );
  }
  if (p.shieldTime > 0) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = '#7fd8ff';
    ctx.fillText(`🛡 shield ${Math.ceil(p.shieldTime)}s`, p.x, p.y - (p.fireRateMultTime > 0 ? 60 : 42));
  }

  // All 5 buy-able items in one row along the bottom, plus the free
  // rewarded-ad button in its own small slot just above (only when ready).
  drawButton(ctx, 'bomb', state, adsReady);
  drawButton(ctx, 'shield', state, adsReady);
  drawButton(ctx, 'wall', state, adsReady);
  drawButton(ctx, 'turret', state, adsReady);
  drawButton(ctx, 'angel', state, adsReady);
  if (adsReady) drawButton(ctx, 'watchAd', state, adsReady);
}
