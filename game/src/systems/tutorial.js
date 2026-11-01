// ============================================================
// THE FIRST MINUTE — a guided first run for brand-new players.
// Only on Stage 1 Level 1, only while saveData.tutorialDone is unset (and
// the player has no progress yet). Every hint is non-blocking (the battle
// keeps running), shown once (saveData.tuSeen), and the whole thing can be
// skipped with the small SKIP TIPS pill.
//   drag   — animated hand: "DRAG TO MOVE" until the Guardian moves
//   shoot  — "YOUR GUARDIAN SHOOTS BY ITSELF"
//   gate   — the first time an enemy gets close: the gate line glows
//   pick   — the first level-up: a hand points at a card, "PICK A POWER"
//   helper — the first time coins cover a helper: pulse on the buy row
// main.js calls tuBegin (newGame), tuUpdate (update), tuDraw (render) and
// tuTap (press handler).
// ============================================================
import { cfBurst } from '../ui/coinFx.js';
import { CONFIG } from '../config.js';
import { tr, fitFont } from '../i18n.js';
import { save } from '../data/save.js';
import { WEAPONS } from '../data/levels.js';
import { BUTTONS } from '../ui/hud.js';
import { cardRect } from './runUpgrades.js';

const TU_TITLE = '"Luckiest Guy", "Noto Sans Arabic", "Arial Black", Arial';
const TU_BODY = '"Fredoka", "Noto Sans Arabic", "Trebuchet MS", Arial';
const TU_INK = '#2a1f4d';
const TU_SKIP = { x: CONFIG.width - 104, y: 86, w: 96, h: 26 };
const TU_HELPER_ORDER = ['bomb', 'wall', 'shield', 'turret', 'angel'];

// No progress, no best score, never finished the guided run.
export function tuIsNewPlayer(sd) {
  return !!sd && !sd.tutorialDone && (sd.progress?.levelIndex || 0) === 0 && !((sd.best || 0) > 0);
}

// Called from newGame(): arms the guided run on Stage 1 Level 1 for a
// brand-new player (state.tu), otherwise leaves it off.
export function tuBegin(st, sd, idx) {
  st.tu = null;
  if (idx !== 0 || !tuIsNewPlayer(sd)) return;
  sd.tuSeen = sd.tuSeen || {};
  st.tu = {
    sd, seen: sd.tuSeen, t: 0,
    tip: null, queue: [],
    sx: st.player.x, sy: st.player.y, moved: false,
    pickActive: false, gifted: false,
  };
  // a calm beat before the first wave so the drag hint lands first
  if (st.spawner) st.spawner.breather = Math.max(st.spawner.breather || 0, 4.5);
}

function tuMark(tu, key) {
  if (tu.seen[key]) return;
  tu.seen[key] = 1;
  save(tu.sd);
}

function tuFinish(tu) {
  if (!tu.sd.tutorialDone) { tu.sd.tutorialDone = true; save(tu.sd); }
}

// kind: 'drag' (until the Guardian moves), 'text', 'gate', 'helper'
function tuShow(tu, kind, title, sub, dur, extra) {
  const tip = { kind, title, sub, dur, t: 0, ...(extra || {}) };
  if (!tu.tip) tu.tip = tip;
  else if (tu.tip.kind === 'drag' && kind !== 'drag') {
    // a timely hint pre-empts the drag hand; it comes back afterwards
    tu.queue.unshift(tu.tip);
    tu.tip = tip;
  } else tu.queue.push(tip);
}

function tuCheapestHelper(coins) {
  for (const k of TU_HELPER_ORDER) if (WEAPONS[k] && coins >= WEAPONS[k].cost) return k;
  return null;
}

// Called every frame from update() (before its PLAYING-only early return).
export function tuUpdate(st, dt, mode, announcer) {
  const tu = st?.tu;
  if (!tu) return;

  // first level-up: point at the cards while they're up
  if (mode === 'LEVELUP' && !tu.seen.pick) tu.pickActive = true;
  if (tu.pickActive && mode !== 'LEVELUP') { tu.pickActive = false; tuMark(tu, 'pick'); }
  if (mode !== 'PLAYING' || st.placePaused) return;

  tu.t += dt;
  const p = st.player;

  // DRAG TO MOVE — until the Guardian has really moved
  if (!tu.moved && Math.hypot(p.x - tu.sx, p.y - tu.sy) > 36) {
    tu.moved = true;
    if (!tu.seen.drag) {
      tuMark(tu, 'drag');
      if (tu.tip?.kind === 'drag') tu.tip = null;
      tu.queue = tu.queue.filter((q) => q.kind !== 'drag');
      if (!tu.seen.shoot) {
        tuMark(tu, 'shoot');
        tuShow(tu, 'text', tr('tu.shoot'), tr('tu.shootSub'), 3.4, { great: true });
      }
    }
  }
  if (!tu.seen.drag && !tu.moved && !tu.dragQueued && tu.t > 1.8) {
    tu.dragQueued = true;
    tuShow(tu, 'drag', tr('tu.drag'), tr('tu.dragSub'), Infinity);
  }
  // someone who already knows how to drag still learns about auto-fire
  if (tu.seen.drag && !tu.seen.shoot && tu.t > 1.8) {
    tuMark(tu, 'shoot');
    tuShow(tu, 'text', tr('tu.shoot'), tr('tu.shootSub'), 3.4);
  }

  // DON'T LET THEM REACH THE GATE — the first time one gets close
  if (!tu.seen.gate) {
    const close = st.monsters.some((m) => !m.dead && !m.boss && m.y > CONFIG.gateY - 190);
    if (close) {
      tuMark(tu, 'gate');
      tuShow(tu, 'gate', tr('tu.gate'), tr('tu.gateSub'), 3.6);
    }
  }

  // A starter gift part-way through Level 1, so the first helper is
  // affordable during the guided run (new players start with 0 coins).
  const sp = st.spawner;
  const bombCost = WEAPONS.bomb?.cost || 40;
  if (!tu.seen.helper && !tu.gifted && st.levelIndex === 0 && sp
      && sp.spawnedCount >= sp.totalAttackers * 0.4 && st.coins < bombCost) {
    tu.gifted = true;
    const n = Math.ceil((bombCost - st.coins) / 5) * 5;
    st.coins += n;
    cfBurst(n, 210, 330);
    announcer?.show(tr('tu.gift'), tr('tu.giftSub', { n }), '#ffd23d', 1.8);
  }

  // TAP TO CALL A HELPER — the first time coins cover one
  if (!tu.seen.helper) {
    const key = tuCheapestHelper(st.coins);
    if (key) {
      tuMark(tu, 'helper');
      tuShow(tu, 'helper', tr('tu.helper'), tr('tu.helperSub'), 9, { key, coins0: st.coins });
    }
  }

  // advance the current tip
  const tip = tu.tip;
  if (tip) {
    tip.t += dt;
    let done = tip.t >= tip.dur;
    if (tip.kind === 'helper') {
      // bought something (coins went down) or the helper is already out
      if (st.coins < tip.coins0 || st.placing || st.placePaused) done = true;
    }
    if (tip.kind === 'drag' && tu.moved) done = true;
    if (done) {
      tu.tip = null;
      while (tu.queue.length && !tu.tip) {
        const q = tu.queue.shift();
        if (q.kind === 'drag' && tu.moved) continue;
        q.t = 0;
        tu.tip = q;
      }
    }
  }

  // Level 1 cleared (or left): the guided run is done
  if (st.levelClearPending || st.levelIndex > 0) {
    tuFinish(tu);
    if (!tu.tip && !tu.queue.length && tu.seen.helper) st.tu = null;
  }
}

// SKIP TIPS — returns true when the press was used.
export function tuTap(st, x, y) {
  const tu = st?.tu;
  if (!tu || x === null || x === undefined) return false;
  const b = TU_SKIP;
  if (x < b.x - 4 || x > b.x + b.w + 4 || y < b.y - 4 || y > b.y + b.h + 4) return false;
  for (const k of ['drag', 'shoot', 'gate', 'pick', 'helper']) tu.seen[k] = 1;
  tuFinish(tu);
  st.tu = null;
  return true;
}

// ---- drawing --------------------------------------------------------

// A chunky cartoon pointing hand, fingertip at (0,0), pointing up before
// rotation. Outline pass first, then the fill, so the parts read as one.
function tuHand(ctx, x, y, rot, s = 1, press = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s * (1 - press * 0.08), s * (1 - press * 0.08));
  const parts = (c) => {
    c.beginPath(); c.roundRect(-7, 0, 14, 34, 7);            // index finger
    c.roundRect(-19, 22, 34, 32, 12);                         // palm
    c.roundRect(5, 18, 12, 18, 6);                            // curled fingers
    c.ellipse(-20, 34, 7, 11, -0.5, 0, Math.PI * 2);          // thumb
  };
  ctx.lineJoin = 'round';
  parts(ctx);
  ctx.strokeStyle = TU_INK; ctx.lineWidth = 7; ctx.stroke();
  parts(ctx);
  ctx.fillStyle = '#fff6e8'; ctx.fill();
  // knuckle crease + cuff
  ctx.strokeStyle = 'rgba(42,31,77,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5, 22); ctx.lineTo(5, 22); ctx.stroke();
  ctx.fillStyle = '#7fd8ff'; ctx.strokeStyle = TU_INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-20, 50, 36, 12, 5); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Outlined, glowing title text (the game's chunky look).
function tuText(ctx, str, x, y, size, color, maxW, glow = color) {
  ctx.font = fitFont(ctx, str, `${size}px ${TU_TITLE}`, maxW);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = TU_INK; ctx.lineWidth = 6;
  ctx.strokeText(str, x, y);
  ctx.shadowColor = glow; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

// The hint card: a rounded glass pill with a title and a short line.
function tuCard(ctx, tip, cy, a, color) {
  const W = CONFIG.width - 48, x = 24, h = tip.sub ? 64 : 44;
  const pop = Math.min(1, tip.t / 0.25);
  const sc = 0.85 + 0.15 * (1 - Math.pow(1 - pop, 3));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(CONFIG.width / 2, cy);
  ctx.scale(sc, sc);
  ctx.translate(-CONFIG.width / 2, -cy);
  ctx.fillStyle = 'rgba(20,12,44,0.78)';
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.roundRect(x, cy - h / 2, W, h, 18); ctx.fill();
  ctx.shadowBlur = 0; ctx.stroke();
  const ty = tip.sub ? cy - 11 : cy;
  tuText(ctx, tip.title, CONFIG.width / 2, ty, 22, '#ffffff', W - 24, color);
  if (tip.sub) {
    ctx.font = fitFont(ctx, tip.sub, `600 14px ${TU_BODY}`, W - 24);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8ccff';
    ctx.fillText(tip.sub, CONFIG.width / 2, cy + 15);
  }
  ctx.restore();
}

function tuSkipPill(ctx) {
  const b = TU_SKIP;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(20,12,44,0.7)';
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 13); ctx.fill(); ctx.stroke();
  const s = tr('tu.skip') + ' ›';
  ctx.font = fitFont(ctx, s, `12px ${TU_TITLE}`, b.w - 12);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

// Drawn last in render(), over the HUD and the level-up cards.
export function tuDraw(ctx, st, mode) {
  const tu = st?.tu;
  if (!tu) return;
  const now = performance.now() / 1000;
  ctx.save();
  ctx.textBaseline = 'middle';

  if (mode === 'LEVELUP' && tu.pickActive && st.run?.choices) {
    if (st.run.choiceT > 0.5) {
      const r = cardRect(0);
      const a = Math.min(1, (st.run.choiceT - 0.5) / 0.3);
      const pulse = 0.5 + 0.5 * Math.sin(now * 7);
      ctx.globalAlpha = a;
      ctx.strokeStyle = `rgba(255,232,120,${0.6 + 0.4 * pulse})`;
      ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 14 + 10 * pulse;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(r.x - 4 - pulse * 3, r.y - 4 - pulse * 3, r.w + 8 + pulse * 6, r.h + 8 + pulse * 6, 18); ctx.stroke();
      ctx.shadowBlur = 0;
      const tap = Math.max(0, Math.sin(now * 4));
      tuHand(ctx, r.x + r.w - 26 + tap * 6, r.y + r.h * 0.62 + tap * 8, -0.5, 0.95, tap);
      const ly = cardRect(2).y + cardRect(2).h + 34;
      tuText(ctx, tr('tu.pick'), CONFIG.width / 2, ly, 26, '#ffd23d', CONFIG.width - 60);
    }
    ctx.restore();
    return;
  }
  if (mode !== 'PLAYING' || st.placePaused || st.placing) { ctx.restore(); return; }

  tuSkipPill(ctx);
  const tip = tu.tip;
  if (!tip) { ctx.restore(); return; }
  const fadeOut = Number.isFinite(tip.dur) ? Math.min(1, (tip.dur - tip.t) / 0.35) : 1;
  const a = Math.max(0, Math.min(1, tip.t / 0.25, fadeOut));
  const p = st.player;

  if (tip.kind === 'drag') {
    // the hand sweeps side to side just below the Guardian, with a trail
    const sweep = Math.sin(now * 2.2);
    const hx = CONFIG.width / 2 + sweep * 90, hy = Math.min(CONFIG.gateY - 70, p.y + 70);
    ctx.globalAlpha = a * 0.55;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CONFIG.width / 2 - 100, hy - 6); ctx.lineTo(CONFIG.width / 2 + 100, hy - 6); ctx.stroke();
    ctx.setLineDash([]);
    // arrowheads at both ends
    ctx.fillStyle = '#ffffff';
    for (const d of [-1, 1]) {
      const ex = CONFIG.width / 2 + d * 118;
      ctx.beginPath(); ctx.moveTo(ex, hy - 6); ctx.lineTo(ex - d * 12, hy - 14); ctx.lineTo(ex - d * 12, hy + 2); ctx.closePath(); ctx.fill();
    }
    // touch ripple at the fingertip
    ctx.globalAlpha = a * (0.5 + 0.3 * Math.sin(now * 8));
    ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy - 6, 14 + 4 * Math.sin(now * 8), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a;
    tuHand(ctx, hx, hy - 6, -0.25 + sweep * 0.15, 1.05);
    tuCard(ctx, tip, 420, a, '#7fd8ff');
  } else if (tip.kind === 'gate') {
    // the gate line glows red with arrows falling toward it
    const gy = CONFIG.gateY;
    const pulse = 0.5 + 0.5 * Math.sin(now * 9);
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, gy - 30, 0, gy + 4);
    g.addColorStop(0, 'rgba(255,60,90,0)');
    g.addColorStop(1, `rgba(255,60,90,${0.35 + 0.3 * pulse})`);
    ctx.fillStyle = g; ctx.fillRect(0, gy - 30, CONFIG.width, 34);
    ctx.strokeStyle = '#ff5c7a'; ctx.lineWidth = 4;
    ctx.shadowColor = '#ff5c7a'; ctx.shadowBlur = 16 + 10 * pulse;
    ctx.beginPath(); ctx.moveTo(8, gy); ctx.lineTo(CONFIG.width - 8, gy); ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const ax = 60 + i * ((CONFIG.width - 120) / 3);
      const ay = gy - 46 + ((now * 40 + i * 9) % 22);
      ctx.fillStyle = '#ff5c7a'; ctx.strokeStyle = TU_INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ax - 10, ay - 8); ctx.lineTo(ax + 10, ay - 8); ctx.lineTo(ax, ay + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    tuCard(ctx, tip, 420, a, '#ff5c7a');
  } else if (tip.kind === 'helper') {
    const b = BUTTONS[tip.key];
    if (b) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 8);
      const cx = b.x + b.w / 2;
      ctx.globalAlpha = a;
      // spotlight ring around the button
      ctx.strokeStyle = `rgba(255,232,120,${0.6 + 0.4 * pulse})`;
      ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 16 + 12 * pulse; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(b.x - 6 - pulse * 4, b.y - 6 - pulse * 4, b.w + 12 + pulse * 8, b.h + 12 + pulse * 8, 16); ctx.stroke();
      ctx.shadowBlur = 0;
      const tap = Math.max(0, Math.sin(now * 4));
      // hand comes down from above and taps the button
      tuHand(ctx, cx + 4, b.y + 12 - 30 + tap * 22, Math.PI - 0.15, 0.9, tap);
    }
    tuCard(ctx, tip, 420, a, '#ffd23d');
  } else {
    tuCard(ctx, tip, 420, a, tip.great ? '#58e07f' : '#ffd23d');
  }
  ctx.restore();
}
