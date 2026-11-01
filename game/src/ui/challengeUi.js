// ============================================================
// Daily Challenge screens: the card on the Rewards page, its detail panel
// (rule, rewards, today's top scores) and the results card after a run.
// Logic lives in systems/challenge.js; main.js hit-tests the rects below.
// ============================================================
import { CONFIG } from '../config.js';
import { tr, fitFont } from '../i18n.js';
import { armText, armButton, rwPanel, drawCoinGlyph, F_TITLE, F_BODY } from './screens.js';

const DC_W = CONFIG.width, DC_H = CONFIG.height;

// Card on the Rewards page (between FREE COINS and DAILY MISSIONS).
export const DC_CARD = { x: 16, y: 284, w: DC_W - 32, h: 62 };
export const DC_CARD_PLAY = { x: DC_CARD.x + DC_CARD.w - 102, y: DC_CARD.y + 14, w: 90, h: 36 };

// Detail panel (opened by tapping the card).
const DC_PANEL = { x: 22, y: 92, w: DC_W - 44, h: 500 };
export const DC_PANEL_BUTTONS = {
  close: { x: DC_PANEL.x + DC_PANEL.w - 40, y: DC_PANEL.y + 8, w: 32, h: 32 },
  play: { x: DC_PANEL.x + 24, y: DC_PANEL.y + DC_PANEL.h - 62, w: DC_PANEL.w - 48, h: 46 },
  box: DC_PANEL,
};

// Results card.
const DC_RES = { x: 30, y: 150, w: DC_W - 60, h: 440 };
export const DC_RESULT_BUTTONS = {
  again: { x: DC_RES.x + 14, y: DC_RES.y + DC_RES.h - 58, w: (DC_RES.w - 38) / 2, h: 44 },
  done: { x: DC_RES.x + 24 + (DC_RES.w - 38) / 2, y: DC_RES.y + DC_RES.h - 58, w: (DC_RES.w - 38) / 2, h: 44 },
};

const DC_TWIST_COLOR = { bombs: '#ff8a3d', speed: '#7fd8ff', boss: '#ff5c7a', glass: '#bdeeff', nolvl: '#d27bff' };

// "STAGE 2 · LEVELS 3–5" / "STAGE 2 · BOSS LEVELS 4, 7, 10"
export function dcRouteText(dc) {
  const inStage = dc.levels.map((i) => (i % 10) + 1);
  const route = dc.twist === 'boss'
    ? tr('dc.bossLevels', { list: inStage.join(', ') })
    : tr('dc.levels', { a: inStage[0], b: inStage[inStage.length - 1] });
  return `${tr('dc.stage', { n: dc.stageIdx + 1 })} · ${route}`;
}

// A gold medallion with a star and the day of the month.
function dcMedal(ctx, x, y, r, t, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color; ctx.shadowBlur = 8 + 4 * Math.sin(t * 3);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, '#fff2a8'); g.addColorStop(1, '#d99a1a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.3 : r * 0.68;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,0,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

function dcWrap(ctx, text, maxW) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const tryS = cur ? cur + ' ' + w : w;
    if (ctx.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS;
  }
  if (cur) lines.push(cur);
  return lines;
}

// info = dcStatus(save) (+ board)
export function dcRenderCard(ctx, info, t) {
  const c = DC_CARD, col = DC_TWIST_COLOR[info.twist] || '#ffd23d';
  const fresh = info.plays === 0;
  ctx.save();
  if (fresh) { ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 8 + 5 * Math.sin(t * 3); }
  const g = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
  g.addColorStop(0, 'rgba(90,60,170,0.55)'); g.addColorStop(1, 'rgba(40,24,90,0.55)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill();
  ctx.restore();
  rwPanel(ctx, c.x, c.y, c.w, c.h, fresh ? '#ffd23d' : 'rgba(255,210,61,0.45)');
  dcMedal(ctx, c.x + 30, c.y + c.h / 2, 19, t, col);
  const tx = c.x + 58, maxW = DC_CARD_PLAY.x - tx - 8;
  const title = tr('dc.title');
  armText(ctx, title, tx, c.y + 19, fitFont(ctx, title, `13px ${F_TITLE}`, maxW), '#ffd23d', 'left', 3);
  const rule = `${tr('dc.twist.' + info.twist)} · ${tr('dc.stage', { n: info.stageIdx + 1 })}`;
  armText(ctx, rule, tx, c.y + 38, fitFont(ctx, rule, `14px ${F_TITLE}`, maxW), col, 'left', 3);
  const sub = fresh ? tr('dc.firstReward', { n: CONFIG.economy.challenge.first }) : tr('dc.bestToday', { n: info.best });
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, sub, `11px ${F_BODY}`, maxW); ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(sub, tx, c.y + 54);
  armButton(ctx, DC_CARD_PLAY, tr('dc.play'), ['#6ef598', '#2e9a52'], t, fresh);
}

// The detail panel over the Rewards page. board = { status, rows }, myName for the YOU row.
export function dcRenderPanel(ctx, info, board, myName, t) {
  const p = DC_PANEL, B = DC_PANEL_BUTTONS, col = DC_TWIST_COLOR[info.twist] || '#ffd23d';
  ctx.fillStyle = 'rgba(6,3,16,0.72)';
  ctx.fillRect(0, 0, DC_W, DC_H);
  const pg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  pg.addColorStop(0, 'rgba(58,40,110,0.98)'); pg.addColorStop(1, 'rgba(24,14,54,0.98)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 18); ctx.fill();
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 18); ctx.stroke();

  // close X
  const cb = B.close;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(cb.x + cb.w / 2, cb.y + cb.h / 2, 14, 0, Math.PI * 2); ctx.fill();
  armText(ctx, '✕', cb.x + cb.w / 2, cb.y + cb.h / 2 + 6, `16px ${F_TITLE}`, '#ffffff', 'center', 3);

  dcMedal(ctx, p.x + 40, p.y + 40, 22, t, col);
  const title = tr('dc.title');
  armText(ctx, title, p.x + 72, p.y + 34, fitFont(ctx, title, `18px ${F_TITLE}`, p.w - 130), '#ffd23d', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = `11px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(info.day, p.x + 72, p.y + 52);

  // the twist
  const tw = tr('dc.twist.' + info.twist);
  armText(ctx, tw, DC_W / 2, p.y + 96, fitFont(ctx, tw, `24px ${F_TITLE}`, p.w - 30), col, 'center', 4);
  ctx.font = `13px ${F_BODY}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  dcWrap(ctx, tr('dc.twist.' + info.twist + '.info'), p.w - 40).slice(0, 2)
    .forEach((ln, i) => ctx.fillText(ln, DC_W / 2, p.y + 120 + i * 17));
  const route = dcRouteText(info);
  armText(ctx, route, DC_W / 2, p.y + 166, fitFont(ctx, route, `13px ${F_TITLE}`, p.w - 30), '#ffe9a8', 'center', 3);
  const rw = tr('dc.rewards', { a: CONFIG.economy.challenge.first, b: CONFIG.economy.challenge.beatBest });
  ctx.font = fitFont(ctx, rw, `12px ${F_BODY}`, p.w - 30); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'center';
  ctx.fillText(rw, DC_W / 2, p.y + 186);
  const same = tr('dc.sameForAll');
  ctx.font = fitFont(ctx, same, `10px ${F_BODY}`, p.w - 30); ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(same, DC_W / 2, p.y + 203);

  // today's top
  const ly = p.y + 220;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(p.x + 16, ly); ctx.lineTo(p.x + p.w - 16, ly); ctx.stroke();
  armText(ctx, tr('dc.top'), p.x + 18, ly + 22, `14px ${F_TITLE}`, '#ffd23d', 'left', 3);
  dcRenderTopRows(ctx, info, board, myName, p.x + 14, ly + 32, p.w - 28, 7, 24);

  armButton(ctx, B.play, tr('dc.play'), ['#6ef598', '#2e9a52'], t, true);
}

// Ranking rows, or a status line when offline / empty, then the YOU row.
function dcRenderTopRows(ctx, info, board, myName, x, y, w, maxRows, rh) {
  const rows = board && board.status === 'ready' ? board.rows.slice(0, maxRows) : [];
  const me = (myName || '').trim().toLowerCase();
  if (board && board.status === 'ready' && rows.length) {
    rows.forEach((r, i) => {
      const ry = y + i * rh, mine = me && (r.name || '').trim().toLowerCase() === me;
      ctx.fillStyle = mine ? 'rgba(255,210,61,0.18)' : i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.roundRect(x, ry, w, rh - 3, 8); ctx.fill();
      const medal = ['#ffd23d', '#dfe8f5', '#e09a5a'][i] || '#9aa3b8';
      armText(ctx, String(r.rank || i + 1), x + 18, ry + rh * 0.62, `13px ${F_TITLE}`, medal, 'center', 2);
      ctx.font = `13px ${F_BODY}`;
      let name = r.name || '?';
      while (ctx.measureText(name).width > w - 130 && name.length > 2) name = name.slice(0, -1);
      armText(ctx, name, x + 38, ry + rh * 0.62, `13px ${F_BODY}`, '#ffffff', 'left', 2);
      armText(ctx, String(r.score), x + w - 10, ry + rh * 0.62, `13px ${F_TITLE}`, mine ? '#ffd23d' : '#7fd8ff', 'right', 2);
    });
  } else {
    const msg = !board || board.status === 'offline' ? tr('dc.offline')
      : board.status === 'loading' ? tr('dc.loading') : tr('dc.noScores');
    ctx.textAlign = 'center'; ctx.font = fitFont(ctx, msg, `12px ${F_BODY}`, w - 10); ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(msg, x + w / 2, y + 24);
  }
  // your own best today, always (works offline)
  const yy = y + Math.max(1, rows.length || 1.4) * rh + 6;
  ctx.fillStyle = 'rgba(255,210,61,0.14)'; ctx.strokeStyle = 'rgba(255,210,61,0.6)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(x, yy, w, rh, 8); ctx.fill(); ctx.stroke();
  const you = tr('dc.you');
  armText(ctx, you, x + 12, yy + rh * 0.66, fitFont(ctx, you, `12px ${F_TITLE}`, 60), '#ffe98a', 'left', 2);
  const bt = tr('dc.bestToday', { n: info.best });
  armText(ctx, bt, x + w - 10, yy + rh * 0.66, fitFont(ctx, bt, `13px ${F_TITLE}`, w - 90), '#ffd23d', 'right', 2);
}

// res = { cleared, score, best, coins, first, newBest, prevBest, levelsDone, levelsTotal }
export function dcRenderResult(ctx, info, res, board, myName, t) {
  const c = DC_RES, B = DC_RESULT_BUTTONS, col = DC_TWIST_COLOR[info.twist] || '#ffd23d';
  ctx.fillStyle = 'rgba(8,4,20,0.62)';
  ctx.fillRect(0, 0, DC_W, DC_H);
  ctx.save();
  ctx.shadowColor = res.cleared ? '#58e07f' : '#ffd23d'; ctx.shadowBlur = 12 + 5 * Math.sin(t * 3);
  const pg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  pg.addColorStop(0, 'rgba(58,40,96,0.97)'); pg.addColorStop(1, 'rgba(26,16,56,0.97)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 18); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = res.cleared ? '#58e07f' : '#ffd23d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 18); ctx.stroke();

  // ribbon
  const rw = 230, rh = 34, ry = c.y - 16;
  const rg = ctx.createLinearGradient(0, ry, 0, ry + rh);
  rg.addColorStop(0, res.cleared ? '#6ef598' : '#ff5c7a'); rg.addColorStop(1, res.cleared ? '#2e9a52' : '#c0303f');
  ctx.fillStyle = res.cleared ? '#1f6a3a' : '#8a1f2a';
  for (const s of [-1, 1]) {
    const ex = DC_W / 2 + s * (rw / 2 + 14);
    ctx.beginPath(); ctx.moveTo(ex, ry + 4); ctx.lineTo(DC_W / 2 + s * (rw / 2 - 6), ry + rh / 2); ctx.lineTo(ex, ry + rh - 4); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.roundRect(DC_W / 2 - rw / 2, ry, rw, rh, 10); ctx.fill();
  const head = tr(res.cleared ? 'dc.res.clear' : 'dc.res.fallen');
  armText(ctx, head, DC_W / 2, ry + 24, fitFont(ctx, head, `19px ${F_TITLE}`, rw - 16), '#ffffff', 'center', 4);

  // rule
  const title = `${tr('dc.title')} · ${tr('dc.twist.' + info.twist)}`;
  armText(ctx, title, DC_W / 2, c.y + 42, fitFont(ctx, title, `13px ${F_TITLE}`, c.w - 24), col, 'center', 3);
  const lv = tr('dc.res.levels', { i: res.levelsDone, n: res.levelsTotal });
  ctx.textAlign = 'center'; ctx.font = `11px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(lv, DC_W / 2, c.y + 58);

  // score
  ctx.font = `11px ${F_TITLE}`; ctx.fillStyle = 'rgba(255,233,138,0.8)';
  ctx.fillText(tr('dc.res.score'), DC_W / 2, c.y + 82);
  armText(ctx, String(res.score), DC_W / 2, c.y + 118, `38px ${F_TITLE}`, '#ffffff', 'center', 5);
  if (res.newBest && res.score > 0) {
    const pulse = 1 + Math.sin(t * 5) * 0.06;
    ctx.save(); ctx.translate(DC_W / 2, c.y + 142); ctx.scale(pulse, pulse);
    armText(ctx, tr('dc.res.newBest'), 0, 0, `14px ${F_TITLE}`, '#ffd23d', 'center', 3);
    ctx.restore();
  } else {
    ctx.font = `12px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center';
    ctx.fillText(tr('dc.bestToday', { n: res.best }), DC_W / 2, c.y + 142);
  }

  // reward
  const by = c.y + 156;
  ctx.fillStyle = res.coins > 0 ? 'rgba(255,210,61,0.14)' : 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.roundRect(c.x + 16, by, c.w - 32, 40, 12); ctx.fill();
  if (res.coins > 0) {
    drawCoinGlyph(ctx, c.x + 40, by + 20, 11);
    armText(ctx, `+${res.coins}`, c.x + 58, by + 27, `20px ${F_TITLE}`, '#ffd23d', 'left', 3);
    const why = tr(res.first ? 'dc.res.first' : 'dc.res.beat');
    armText(ctx, why, c.x + c.w - 28, by + 26, fitFont(ctx, why, `12px ${F_TITLE}`, c.w - 150), '#ffffff', 'right', 2);
  } else {
    const msg = tr('dc.res.noReward', { n: res.best, c: CONFIG.economy.challenge.beatBest });
    ctx.textAlign = 'center'; ctx.font = fitFont(ctx, msg, `12px ${F_BODY}`, c.w - 50); ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(msg, DC_W / 2, by + 25);
  }

  // today's top
  armText(ctx, tr('dc.top'), c.x + 18, by + 66, `13px ${F_TITLE}`, '#ffd23d', 'left', 3);
  dcRenderTopRows(ctx, { ...info, best: res.best }, board, myName, c.x + 14, by + 74, c.w - 28, 4, 24);

  armButton(ctx, B.again, tr('dc.again'), ['#7fd8ff', '#2a7ab0'], t);
  armButton(ctx, B.done, tr('dc.done'), ['#6ef598', '#2e9a52'], t, true);
}

// Small in-run tag under the HUD: "DAILY CHALLENGE 1/3 · ONLY BOMBS",
// plus padlocks over the buy-row helpers the twist locks.
export function dcRenderHud(ctx, st, buttons) {
  const dc = st.dc;
  const txt = `${tr('dc.levelOf', { i: dc.step + 1, n: dc.levels.length })} · ${tr('dc.twist.' + dc.twist)}`;
  ctx.save();
  ctx.font = `11px ${F_TITLE}`;
  const w = Math.min(DC_W - 120, ctx.measureText(txt).width + 22), x = DC_W / 2 - w / 2, y = 70;
  ctx.fillStyle = 'rgba(16,8,36,0.7)'; ctx.strokeStyle = DC_TWIST_COLOR[dc.twist] || '#ffd23d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, 20, 10); ctx.fill(); ctx.stroke();
  armText(ctx, txt, DC_W / 2, y + 14, fitFont(ctx, txt, `11px ${F_TITLE}`, w - 12), '#ffffff', 'center', 2);
  if (dc.twist === 'bombs' && buttons) {
    for (const k of ['shield', 'wall', 'turret', 'angel']) {
      const b = buttons[k];
      if (!b) continue;
      ctx.fillStyle = 'rgba(10,6,24,0.62)';
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
      // padlock
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.strokeStyle = '#d8d0ec'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy - 4, 7, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#d8d0ec';
      ctx.beginPath(); ctx.roundRect(cx - 10, cy - 4, 20, 15, 3); ctx.fill();
      ctx.fillStyle = '#3a2c48';
      ctx.beginPath(); ctx.arc(cx, cy + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
