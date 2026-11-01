// ============================================================
// Level stars — every level awards 1-3 stars on clear:
//   ★     cleared
//   ★★    no gate heart lost in the level (a revive means hearts were lost)
//   ★★★   also no revive and cleared under the level's par time
// The best per level lives in saveData.stars[levelIndex]. Every
// CONFIG.economy.starChest.every stars earned unlocks a star chest on the
// home map (saveData.starChests = chests already opened).
// main.js calls: st3Bind (each frame), st3Begin (level start), st3Track
// (each PLAYING frame), st3Award (on clear), st3CardTick (card clock),
// st3MenuTap / st3EatRelease (home taps). screens.js draws with
// st3CardStars / st3CardHint (level-clear card), st3StageChip (map) and
// st3DrawMapChest / st3DrawChestPop (home map chest).
// ============================================================
import { CONFIG } from '../config.js';
import { tr, fitFont } from '../i18n.js';
import { LEVELS, STAGE_SIZE } from '../data/levels.js';
import { audio } from '../systems/audio.js';

const ST3_FT = '"Luckiest Guy", "Noto Sans Arabic", "Arial Black", Arial';
const ST3_FB = '"Fredoka", "Noto Sans Arabic", "Trebuchet MS", Arial';
export const ST3_POP = [0.45, 0.8, 1.15]; // card: when each of the three stars pops
const ST3_CHEST_BTN = { x: CONFIG.width - 66, y: 58, w: 58, h: 62 };

let st3SaveRef = null;   // the live saveData (main.js rebinds it every frame)
let st3PopState = null;  // open chest dialog: { t0, coins, open, need }
let st3Eat = false;      // swallow the release that follows a chest tap

export function st3Bind(save) { st3SaveRef = save; }

// ---- rules --------------------------------------------------------------
// Par seconds for a level: its target release time (CONFIG.waves.levelTime)
// plus a fair margin to mop up the last wave, and extra for a boss.
export function st3Par(levelIndex) {
  const W = CONFIG.waves.levelTime, lis = levelIndex % STAGE_SIZE;
  const boss = LEVELS[levelIndex]?.boss;
  return Math.round(((W[0] + W[1] * lis) * 1.2 + 15 + (boss ? 30 : 0)) / 5) * 5;
}

function st3Fmt(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function st3Begin(st) {
  st.st3 = { t: 0, lost: 0, lives: st.lives, rv: (st.revives || 0) + (st.adRevives || 0), result: null };
}

export function st3Track(st, dt) {
  const s = st.st3;
  if (!s) return;
  if (st.lives < s.lives) s.lost += s.lives - st.lives;
  s.lives = st.lives;
  // the clock stops while placing a wall/turret and after the last kill
  if (!st.placePaused && !st.levelClearPending) s.t += dt;
}

// Scores the level just cleared and keeps the best in the save (the caller saves).
export function st3Award(st, save) {
  if (!st.st3) st3Begin(st);
  st3Track(st, 0);
  const s = st.st3, i = st.levelIndex;
  const revived = (st.revives || 0) + (st.adRevives || 0) > s.rv;
  const par = st3Par(i);
  const two = s.lost === 0 && !revived;
  const three = two && s.t <= par;
  const stars = 1 + (two ? 1 : 0) + (three ? 1 : 0);
  save.stars = save.stars || {};
  const prev = save.stars[i] || 0;
  if (stars > prev) save.stars[i] = stars;
  s.result = { stars, prev, par, t: s.t, lost: s.lost, revived };
  return s.result;
}

export function st3Total(save = st3SaveRef) {
  const m = save?.stars || {};
  let n = 0;
  for (const k in m) n += Math.max(0, Math.min(3, m[k] | 0));
  return n;
}

export function st3StageTotal(stageIdx, save = st3SaveRef) {
  const m = save?.stars || {};
  let n = 0;
  for (let i = stageIdx * STAGE_SIZE; i < (stageIdx + 1) * STAGE_SIZE; i++) n += m[i] || 0;
  return n;
}

export function st3ChestInfo(save = st3SaveRef) {
  const C = CONFIG.economy.starChest;
  const total = st3Total(save), opened = save?.starChests || 0;
  const ready = Math.max(0, Math.floor(total / C.every) - opened);
  const into = Math.max(0, total - opened * C.every);
  return { total, opened, ready, prog: Math.min(C.every, into), every: C.every,
    need: Math.max(0, (opened + 1) * C.every - total), coins: C.coins + C.growth * opened };
}

// ---- shared drawing -----------------------------------------------------
function st3StarPath(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2 + rot;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function st3Star(ctx, x, y, r, earned, rot = 0, outline = 3) {
  ctx.save();
  st3StarPath(ctx, x, y, r, rot);
  if (earned) {
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#e09a1a');
    ctx.fillStyle = g;
  } else ctx.fillStyle = '#4a4262';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = earned ? '#7a4a0a' : '#231b38'; ctx.lineWidth = outline;
  ctx.stroke();
  if (earned && r > 8) { // little glint
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.22, y - r * 0.3, r * 0.16, r * 0.09, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function st3Text(ctx, str, x, y, font, color, outline = 3, align = 'center') {
  ctx.textAlign = align; ctx.font = font; ctx.lineJoin = 'round';
  ctx.lineWidth = outline; ctx.strokeStyle = 'rgba(10,6,24,0.9)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

function st3Back(k) { k = Math.max(0, Math.min(1, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
function st3Ease(k) { k = Math.max(0, Math.min(1, k)); return 1 - Math.pow(1 - k, 3); }

// ---- level-clear card -----------------------------------------------------
// Sounds as the stars pop (called from main.js tickLevelClear).
export function st3CardTick(lc, res) {
  lc.st3n = lc.st3n || 0;
  while (lc.st3n < 3 && lc.t >= ST3_POP[lc.st3n]) {
    const i = lc.st3n++;
    if (lc.t - ST3_POP[i] > 0.4) continue; // skipped ahead with a tap — no sound pile-up
    if (!res || i < res.stars) audio.starEarn(i); else audio.starMiss();
  }
}

// The three stars above the card: earned ones gold (with a burst), missed grey.
export function st3CardStars(ctx, cx, topY, lt, now, res) {
  const n = res ? res.stars : 3;
  for (let i = 0; i < 3; i++) {
    const dt = lt - ST3_POP[i];
    const k = st3Back(dt / 0.3);
    if (k <= 0) continue;
    const earned = i < n;
    const sx = cx + (i - 1) * 50, sy = topY - 22 + (i === 1 ? -12 : 0);
    const r = (i === 1 ? 24 : 18) * k;
    if (earned && dt < 0.7) { // burst ring + sparks
      const q = dt / 0.7;
      ctx.save();
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = '#fff2a8'; ctx.lineWidth = 3 * (1 - q) + 1;
      ctx.beginPath(); ctx.arc(sx, sy, 10 + q * 34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd23d';
      for (let s = 0; s < 8; s++) {
        const a = s * Math.PI / 4 + i;
        ctx.beginPath(); ctx.arc(sx + Math.cos(a) * (12 + q * 40), sy + Math.sin(a) * (12 + q * 40), 2.4 * (1 - q) + 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (earned) {
      ctx.save(); ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 14;
      st3Star(ctx, sx, sy, r, true, Math.sin(now * 2 + i) * 0.08);
      ctx.restore();
    } else st3Star(ctx, sx, sy, r, false, 0);
  }
}

// One small line under the tiles: what the missed stars need (or a cheer).
export function st3CardHint(ctx, cx, y, maxW, res, lt) {
  if (!res) return;
  const a = st3Ease((lt - ST3_POP[2] - 0.2) / 0.4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  let str, col;
  if (res.stars >= 3) { str = tr('st3.perfect'); col = '#ffd23d'; }
  else {
    const parts = [];
    if (res.stars < 2) parts.push(tr('st3.need2'));
    parts.push(tr('st3.need3', { t: `⁦${st3Fmt(res.par)}⁩` }));
    str = parts.join('   ');
    col = '#d8cdf5';
  }
  st3Text(ctx, str, cx, y, fitFont(ctx, str, `12px ${ST3_FB}`, maxW), col, 3);
  ctx.restore();
}

// ---- home map ---------------------------------------------------------
// Replaces the old 5 decorative stars over each island: one star + "17/30".
export function st3StageChip(ctx, cx, cy, size, stageIdx, locked) {
  const max = STAGE_SIZE * 3, got = st3StageTotal(stageIdx);
  const full = got >= max;
  const label = `⁦${got}/${max}⁩`;
  ctx.save();
  if (locked) ctx.globalAlpha = 0.6;
  ctx.font = `13px ${ST3_FT}`;
  const tw = ctx.measureText(label).width;
  const w = tw + 34, h = 22, x = cx - w / 2, y = cy - h / 2;
  ctx.fillStyle = full ? 'rgba(120,70,10,0.85)' : 'rgba(20,13,40,0.72)';
  ctx.strokeStyle = full ? '#ffd23d' : got > 0 ? 'rgba(255,210,61,0.75)' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = full ? 2 : 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  st3Star(ctx, x + 13, cy, 8, got > 0, 0, 1.6);
  st3Text(ctx, label, x + 24 + tw / 2, cy + 5, `13px ${ST3_FT}`, full ? '#ffe680' : '#ffffff', 3);
  ctx.restore();
}

// A treasure chest; open 0 (shut) .. 1 (lid flung back).
function st3Chest(ctx, cx, cy, s, open, t, locked) {
  const bw = s, bh = s * 0.58, bx = cx - bw / 2, by = cy - bh * 0.15;
  ctx.save();
  // glow from inside once open
  if (open > 0) {
    const g = ctx.createRadialGradient(cx, by, 2, cx, by, s * 1.1);
    g.addColorStop(0, `rgba(255,236,150,${0.85 * open})`); g.addColorStop(1, 'rgba(255,210,61,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, by, s * 1.1, 0, Math.PI * 2); ctx.fill();
  }
  // body
  const wood = ctx.createLinearGradient(0, by, 0, by + bh);
  wood.addColorStop(0, '#a8602a'); wood.addColorStop(1, '#6a3414');
  ctx.fillStyle = wood; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, s * 0.07); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2c14a'; // gold bands
  ctx.fillRect(bx + bw * 0.14, by, bw * 0.1, bh); ctx.fillRect(bx + bw * 0.76, by, bw * 0.1, bh);
  ctx.fillRect(bx, by, bw, s * 0.06);
  // lid: a dome hinged at the back top edge, rotating up/back when open
  ctx.save();
  // tipped back over the hinge: seen from the front it shortens, rises and
  // shows its dark inside
  ctx.translate(cx, by - open * s * 0.08);
  ctx.scale(1, 1 - open * 0.45);
  const lh = s * 0.36;
  const lid = ctx.createLinearGradient(0, -lh, 0, 0);
  if (open > 0.5) { lid.addColorStop(0, '#5a2c10'); lid.addColorStop(1, '#3a1a08'); }
  else { lid.addColorStop(0, '#c87a38'); lid.addColorStop(1, '#8a4a1c'); }
  ctx.fillStyle = lid; ctx.strokeStyle = '#2a1408';
  ctx.beginPath();
  ctx.moveTo(-bw / 2, 0); ctx.lineTo(-bw / 2, -lh * 0.45);
  ctx.quadraticCurveTo(-bw / 2, -lh, 0, -lh); ctx.quadraticCurveTo(bw / 2, -lh, bw / 2, -lh * 0.45);
  ctx.lineTo(bw / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f2c14a';
  ctx.fillRect(-bw * 0.36, -lh * 0.95, bw * 0.1, lh * 0.95); ctx.fillRect(bw * 0.26, -lh * 0.95, bw * 0.1, lh * 0.95);
  ctx.restore();
  // lock plate (gone once open)
  if (open < 0.3) {
    ctx.fillStyle = locked ? '#8d8aa0' : '#ffe27a'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.roundRect(cx - s * 0.1, by - s * 0.06, s * 0.2, s * 0.22, s * 0.04); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1408';
    ctx.beginPath(); ctx.arc(cx, by + s * 0.03, s * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Floating chest button on the home map (top right, beside the logo).
export function st3DrawMapChest(ctx, t) {
  if (!st3SaveRef) return;
  const info = st3ChestInfo();
  const b = ST3_CHEST_BTN, cx = b.x + b.w / 2;
  const ready = info.ready > 0;
  const bob = ready ? Math.sin(t * 5) * 2 : 0;
  const wob = ready ? Math.sin(t * 9) * 0.06 * (Math.sin(t * 1.3) > 0.4 ? 1 : 0) : 0;
  ctx.save();
  if (ready) {
    ctx.save(); ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 4);
    const g = ctx.createRadialGradient(cx, b.y + 24, 4, cx, b.y + 24, 38);
    g.addColorStop(0, 'rgba(255,226,120,0.9)'); g.addColorStop(1, 'rgba(255,210,61,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, b.y + 24, 38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.translate(cx, b.y + 26 + bob); ctx.rotate(wob); ctx.translate(-cx, -(b.y + 26 + bob));
  st3Chest(ctx, cx, b.y + 26 + bob, 40, 0, t, !ready);
  ctx.restore();
  // progress pill: "★ 7/10" or OPEN!
  const label = ready ? tr('st3.chest.open') : `⁦${info.prog}/${info.every}⁩`;
  const pw = b.w + 4, px = cx - pw / 2, py = b.y + b.h - 18;
  ctx.fillStyle = ready ? '#2e9a52' : 'rgba(20,13,40,0.8)';
  ctx.strokeStyle = ready ? '#6ef598' : 'rgba(255,210,61,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(px, py, pw, 18, 9); ctx.fill(); ctx.stroke();
  if (!ready) {
    ctx.fillStyle = 'rgba(255,210,61,0.35)';
    ctx.beginPath(); ctx.roundRect(px + 2, py + 2, Math.max(6, (pw - 4) * info.prog / info.every), 14, 7); ctx.fill();
    st3Star(ctx, px + 10, py + 9, 6, true, 0, 1.2);
    st3Text(ctx, label, cx + 6, py + 14, `12px ${ST3_FT}`, '#ffffff', 3);
  } else st3Text(ctx, label, cx, py + 14, fitFont(ctx, label, `12px ${ST3_FT}`, pw - 8), '#ffffff', 3);
  if (info.ready > 1) { // more than one waiting
    ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.x + b.w - 4, b.y + 6, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    st3Text(ctx, String(info.ready), b.x + b.w - 4, b.y + 10, `11px ${ST3_FT}`, '#ffffff', 2);
  }
}

// Home-page tap: opens the chest (or explains how to fill it), closes the dialog.
export function st3MenuTap(x, y, save, addCoinsFn) {
  const now = performance.now() / 1000;
  if (st3PopState) {
    st3Eat = true;
    if (now - st3PopState.t0 > 0.6) st3PopState = null;
    return true;
  }
  const b = ST3_CHEST_BTN;
  if (x < b.x - 4 || x > b.x + b.w + 4 || y < b.y - 4 || y > b.y + b.h + 4) return false;
  st3Eat = true;
  const info = st3ChestInfo(save);
  if (info.ready > 0) {
    save.starChests = (save.starChests || 0) + 1;
    addCoinsFn(info.coins); // also saves
    audio.levelUp();
    st3PopState = { t0: now, open: true, coins: info.coins };
  } else {
    audio.pick();
    st3PopState = { t0: now, open: false, need: info.need };
  }
  return true;
}

// The release that ends a chest tap must not also launch a stage under it.
export function st3EatRelease() { const e = st3Eat; st3Eat = false; return e; }
export function st3ChestOpen() { return !!st3PopState; }

// The chest dialog over the home page.
export function st3DrawChestPop(ctx, t) {
  const p = st3PopState;
  if (!p) return;
  const W = CONFIG.width, H = CONFIG.height;
  const lt = performance.now() / 1000 - p.t0;
  const info = st3ChestInfo();
  ctx.save();
  ctx.fillStyle = `rgba(8,4,20,${0.72 * st3Ease(lt / 0.25)})`;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 - 10;
  const pop = st3Back(lt / 0.35);
  ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
  // card
  const cw = 300, ch = 300, x = cx - cw / 2, y = cy - ch / 2;
  ctx.save();
  ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 24;
  const g = ctx.createLinearGradient(0, y, 0, y + ch);
  g.addColorStop(0, '#3a2878'); g.addColorStop(1, '#1c1240');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 22); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 22); ctx.stroke();
  const title = tr('st3.chest.title');
  st3Text(ctx, title, cx, y + 40, fitFont(ctx, title, `26px ${ST3_FT}`, cw - 30), '#ffd23d', 5);

  const chY = y + 150;
  if (p.open) {
    // shake, then the lid flies open and coins burst out
    const shake = lt < 0.7 ? Math.sin(lt * 60) * 3 * (lt / 0.7) : 0;
    const open = st3Ease((lt - 0.7) / 0.25);
    if (open > 0) { // rays
      ctx.save();
      ctx.globalAlpha = 0.5 * open;
      ctx.translate(cx, chY - 10); ctx.rotate(lt * 0.6);
      for (let i = 0; i < 10; i++) {
        ctx.rotate(Math.PI / 5);
        const rg = ctx.createLinearGradient(0, 0, 0, -120);
        rg.addColorStop(0, 'rgba(255,226,120,0.9)'); rg.addColorStop(1, 'rgba(255,210,61,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -120); ctx.lineTo(14, -120); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    st3Chest(ctx, cx + shake, chY, 96, open, t, false);
    // coins arcing out of the chest
    for (let i = 0; i < 14; i++) {
      const k = (lt - 0.8 - i * 0.04) / 0.9;
      if (k <= 0 || k >= 1) continue;
      const a = -Math.PI / 2 + (i / 13 - 0.5) * 2.2;
      const d = 30 + 90 * k;
      const px = cx + Math.cos(a) * d, py = chY - 20 + Math.sin(a) * d + 160 * k * k;
      ctx.save(); ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#a8781a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(px, py, 7 * Math.abs(Math.cos(lt * 8 + i)) + 1.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const kt = st3Back((lt - 1.0) / 0.35);
    if (kt > 0) {
      const got = tr('st3.chest.got', { n: `⁦+${p.coins}⁩` });
      ctx.save(); ctx.translate(cx, y + 236); ctx.scale(kt, kt);
      st3Text(ctx, got, 0, 0, fitFont(ctx, got, `28px ${ST3_FT}`, cw - 30), '#ffe680', 5);
      ctx.restore();
    }
  } else {
    st3Chest(ctx, cx + (lt < 0.4 ? Math.sin(lt * 50) * 2 : 0), chY, 96, 0, t, true);
    const need = tr('st3.chest.need', { n: p.need });
    st3Text(ctx, need, cx, y + 232, fitFont(ctx, need, `17px ${ST3_FT}`, cw - 30), '#ffffff', 4);
  }
  // star progress toward the next chest
  const bx = x + 40, bw = cw - 80, by = y + 250;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 10, 5); ctx.fill();
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.roundRect(bx, by, Math.max(10, bw * info.prog / info.every), 10, 5); ctx.fill();
  st3Star(ctx, bx - 12, by + 5, 9, true, 0, 1.5);
  const every = tr('st3.chest.every', { n: info.every, have: info.prog });
  ctx.font = fitFont(ctx, every, `11px ${ST3_FB}`, cw - 30);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(every, cx, by + 28);
  if (lt > 1.2) {
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4);
    const tap = tr('st3.chest.tap');
    ctx.font = fitFont(ctx, tap, `11px ${ST3_FB}`, cw - 30); ctx.fillStyle = '#ffffff';
    ctx.fillText(tap, cx, y + ch + 22);
  }
  ctx.restore();
}
