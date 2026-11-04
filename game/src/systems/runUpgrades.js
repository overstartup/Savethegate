// ============================================================
// In-run progression (the Survivor.io-style layer from the blueprint):
// every kill drops an XP gem; fill the bar → the battle pauses and you pick
// 1 of 3 upgrades. Upgrades last for the whole run (across levels) and
// stack into builds: fans of bolts, piercing shards, orbiting blades that
// also eat enemy bullets, chain lightning, homing seekers, frost novas.
// ============================================================
import { cfBurst } from '../ui/coinFx.js';
import { CONFIG } from '../config.js';
import { Spell } from '../entities/spell.js';
import { drawGlow } from '../render/creatures.js';
import { tr, fitFont, isRtl } from '../i18n.js';

// Card name/description are looked up at draw time: tr('g.up.<key>') and
// tr('g.up.<key>.d', dv) — see src/lang/game.js.
export const RUN_UPGRADES = {
  // at most two bolt lines: the Guardian grows by power and speed, not by
  // filling the lane with streams of bolts
  multishot: { max: 1, icon: '✦', color: '#7fd8ff', weight: 4 },
  rapid:     { dv: { n: Math.round(CONFIG.difficulty.runRate * 100) }, max: 5, icon: '⚡', color: '#ffd23d', weight: 4 },
  power:     { dv: { n: Math.round(CONFIG.difficulty.runPower * 100) }, max: 5, icon: '◆', color: '#ff7ad9', weight: 4 },
  pierce:    { max: 3, icon: '➤', color: '#c8a2ff', weight: 3 },
  orbit:     { max: 3, icon: '✺', color: '#9ae6ff', weight: 3 },
  chain:     { max: 3, icon: 'ϟ', color: '#bfe9ff', weight: 3 },
  seeker:    { max: 3, icon: '➶', color: '#ff9a3d', weight: 3 },
  nova:      { max: 2, icon: '❄', color: '#aef2ff', weight: 2 },
  magnet:    { max: 2, icon: '◎', color: '#ffe680', weight: 2 },
  heal:      { dv: { n: 60 }, max: 99, icon: '♥', color: '#ff5c7a', weight: 3 },
  treasure:  { dv: { n: 15 }, max: 99, icon: '●', color: '#ffd23d', weight: 0 },
};

// A power pick is a reward, not a constant interruption: about one per
// level after the first two (8, 28, 60, 104 … gems, x the wave quota
// multiplier since levels hold more enemies), each one strong (see
// CONFIG.difficulty).
const xpNeed = (lvl) => Math.round((8 + 14 * lvl + 6 * lvl * lvl) * CONFIG.waves.quotaMult);

export function createRun() {
  return {
    xp: 0, lvl: 0, need: xpNeed(0),
    picks: {},
    gems: [],
    choices: null, choiceT: 0,
    bladeAngle: 0,
    chainT: 1.5, seekerT: 1, novaT: 3,
    fever: 0, feverReady: true,
    vacuum: false,
    xpFlash: 0,
  };
}

export const runLevel = (run, key) => run.picks[key] || 0;

export function damageMult(run) { return 1 + CONFIG.difficulty.runPower * runLevel(run, 'power'); }
export function rateMult(run) { return (1 + CONFIG.difficulty.runRate * runLevel(run, 'rapid')) * (run.fever > 0 ? CONFIG.difficulty.feverRate : 1); }

// Volley pattern for one trigger pull of the Guardian.
export function runFire(run, mx, my, baseDamage, spells) {
  const dmg = baseDamage * damageMult(run);
  const n = 1 + runLevel(run, 'multishot');
  const pierce = runLevel(run, 'pierce');
  const fever = run.fever > 0;
  const kind = fever ? 'fever' : 'bolt';
  const hue = (performance.now() / 4) % 360;
  for (let i = 0; i < n; i++) {
    const f = i - (n - 1) / 2;
    spells.push(new Spell(mx + f * 9, my, dmg, { angle: f * 0.07, pierce, kind, hue: hue + i * 40 }));
  }
}

export function dropGems(run, x, y, value) {
  // Split big values into a few gems so a boss/elite kill bursts satisfyingly.
  const pieces = value >= 20 ? 6 : value >= 6 ? 3 : 1;
  const each = value / pieces;
  for (let i = 0; i < pieces; i++) {
    const a = Math.random() * Math.PI * 2, sp = pieces > 1 ? 60 + Math.random() * 120 : 0;
    run.gems.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (pieces > 1 ? 60 : 0),
      value: each, t: 0, spin: Math.random() * 6, pulled: false,
      tier: each >= 6 ? 2 : each >= 2 ? 1 : 0,
    });
  }
  if (run.gems.length > 220) run.gems.splice(0, run.gems.length - 220);
}

function rollChoices(run, player) {
  const pool = [];
  for (const [key, u] of Object.entries(RUN_UPGRADES)) {
    if (!u.weight) continue;
    if (runLevel(run, key) >= u.max) continue;
    if (key === 'heal' && player.blood > player.maxBlood * 0.75) continue;
    pool.push(key);
  }
  const out = [];
  while (out.length < 3 && pool.length) {
    let total = 0;
    for (const k of pool) total += RUN_UPGRADES[k].weight;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= RUN_UPGRADES[pool[idx]].weight; if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  while (out.length < 3) out.push('treasure');
  return out;
}

// Applies a chosen card. Returns true if another level-up is already queued.
export function applyPick(run, key, st) {
  if (key === 'heal') st.player.healBlood(0.6);
  else if (key === 'treasure') { st.coins += 15; cfBurst(15, CONFIG.width / 2, 300); }
  else run.picks[key] = runLevel(run, key) + 1;
  run.choices = null;
  return checkLevelUp(run, st.player);
}

function checkLevelUp(run, player) {
  if (run.choices) return false;
  if (run.bonus > 0) {
    // free hand-picked powers (Veteran Boost) — no XP cost
    run.bonus--;
    run.choiceTitle = 'g.cardVeteran'; // i18n key, resolved when drawn
    run.choices = rollChoices(run, player);
    run.choiceT = 0;
    return true;
  }
  if (run.xp < run.need) return false;
  run.choiceTitle = 'g.cardReward';
  run.xp -= run.need;
  run.lvl++;
  run.need = xpNeed(run.lvl);
  run.choices = rollChoices(run, player);
  run.choiceT = 0;
  return true;
}

// Veteran Boost — a run that starts past the first level gets the powers a
// typical run would have earned by then (so "Continue" from Level 5 isn't a
// fresh Guardian thrown at a Level-5 horde). Most are auto-drafted; the
// last few are hand-picked from cards as the level opens.
export function grantCatchUp(run, player, levelIndex) {
  if (levelIndex <= 0) return 0;
  const total = Math.min(14, Math.round(1 + 0.7 * levelIndex));
  const manual = Math.min(1, total); // one hand-picked card, the rest auto-drafted
  for (let i = 0; i < total - manual; i++) {
    const key = rollChoices(run, player).find((k) => k !== 'heal' && k !== 'treasure');
    if (key) run.picks[key] = runLevel(run, key) + 1;
  }
  run.lvl = total;
  run.need = xpNeed(total);
  run.bonus = manual;
  return total;
}

const nearest = (list, x, y, maxD, skip) => {
  let best = null, bd = maxD * maxD;
  for (const m of list) {
    if (m.dead || m.y < CONFIG.playTop || (skip && skip.has(m))) continue;
    const d = (m.x - x) ** 2 + (m.y - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
};

// api = { damageMonster(m, dmg), particles, audio }
// Returns true when a level-up choice just became pending.
export function runUpdate(dt, run, st, api) {
  const p = st.player;
  const dmgBase = p.power * damageMult(run);
  if (run.fever > 0) run.fever -= dt;
  if (run.xpFlash > 0) run.xpFlash -= dt;
  let leveled = false;

  // --- XP gems: drift, get magnetized, collect ---
  const magR = 70 + 70 * runLevel(run, 'magnet');
  for (const g of run.gems) {
    g.t += dt;
    g.spin += dt * 4;
    const dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    // every gem homes in after a short float, so XP is never lost — power
    // growth stays steady even while the player is busy dodging
    if (run.vacuum || d < magR || g.t > 2.2) g.pulled = true;
    if (g.pulled) {
      const sp = Math.min(900, 260 + g.t * 500);
      g.vx += ((dx / d) * sp - g.vx) * Math.min(1, dt * 10);
      g.vy += ((dy / d) * sp - g.vy) * Math.min(1, dt * 10);
    } else {
      g.vx *= Math.pow(0.05, dt);
      g.vy += (45 - g.vy) * Math.min(1, dt * 3); // settle into a gentle downward drift
    }
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    if (d < 20) {
      g.dead = true;
      run.xp += g.value * (p.xpMult || 1); // Armory WISDOM
      run.xpFlash = 0.15;
      api.audio.gem?.();
    } else if (g.y > CONFIG.height + 20) g.dead = true;
  }
  run.gems = run.gems.filter((g) => !g.dead);
  if (checkLevelUp(run, p)) leveled = true;

  // --- Orbit blades: cut monsters, eat enemy bullets ---
  const blades = runLevel(run, 'orbit');
  if (blades) {
    run.bladeAngle += dt * 3.6;
    const R = 58;
    for (let i = 0; i < blades; i++) {
      const a = run.bladeAngle + (i / blades) * Math.PI * 2;
      const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.85;
      for (const m of st.monsters) {
        if (m.dead) continue;
        if ((m._bladeCd || 0) > st.levelTime) continue;
        const rr = m.r + 10;
        if ((m.x - bx) ** 2 + (m.y - by) ** 2 < rr * rr) {
          m._bladeCd = st.levelTime + 0.3;
          api.particles.sparkle(bx, by, '#bff4ff', 3);
          api.damageMonster(m, dmgBase * 0.9);
        }
      }
      for (const b of st.enemyBullets) {
        if (!b.dead && (b.x - bx) ** 2 + (b.y - by) ** 2 < (b.r + 9) ** 2) {
          b.dead = true;
          api.particles.sparkle(b.x, b.y, '#e07bff', 4);
        }
      }
    }
  }

  // --- Chain lightning ---
  const chain = runLevel(run, 'chain');
  if (chain) {
    run.chainT -= dt;
    if (run.chainT <= 0) {
      const first = nearest(st.monsters, p.x, p.y - 40, 300);
      if (first) {
        run.chainT = 2.0 - 0.45 * (chain - 1);
        const hitSet = new Set([first]);
        const pts = [{ x: p.x, y: p.y - 30 }, { x: first.x, y: first.y }];
        let cur = first;
        for (let k = 0; k < 2 + chain * 2; k++) {
          const nx = nearest(st.monsters, cur.x, cur.y, 140, hitSet);
          if (!nx) break;
          hitSet.add(nx);
          pts.push({ x: nx.x, y: nx.y });
          cur = nx;
        }
        api.particles.bolt(pts, '#9fdcff');
        api.audio.zapChain?.();
        for (const m of hitSet) api.damageMonster(m, dmgBase * 2.2);
      } else run.chainT = 0.3;
    }
  }

  // --- Seeker missiles ---
  const seeker = runLevel(run, 'seeker');
  if (seeker) {
    run.seekerT -= dt;
    if (run.seekerT <= 0 && st.monsters.length) {
      run.seekerT = 1.7 - 0.35 * (seeker - 1);
      for (let i = 0; i < seeker; i++) {
        const s = new Spell(p.x, p.y - 20, dmgBase * 2.5, {
          angle: (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.7),
          speed: 360, homing: true, kind: 'seeker', r: 8,
        });
        st.spells.push(s);
      }
    }
  }
  // assign / refresh homing targets
  for (const s of st.spells) {
    if (s.homing && (!s.target || s.target.dead)) s.target = nearest(st.monsters, s.x, s.y, 600);
  }

  // --- Frost nova ---
  const nova = runLevel(run, 'nova');
  if (nova) {
    run.novaT -= dt;
    if (run.novaT <= 0) {
      run.novaT = 6.5 - 1.5 * (nova - 1);
      const R = 160 + 70 * (nova - 1);
      api.particles.ring(p.x, p.y, '#aef2ff', R, 0.5, 6);
      api.particles.ring(p.x, p.y, '#ffffff', R * 0.7, 0.4, 3);
      api.audio.nova?.();
      for (const m of st.monsters) {
        if (m.dead) continue;
        if ((m.x - p.x) ** 2 + (m.y - p.y) ** 2 < R * R) {
          m.slowT = 2.6;
          api.damageMonster(m, dmgBase * 1.2);
        }
      }
    }
  }
  return leveled;
}

// --- Rendering -------------------------------------------------------------
// XP gems are round-cut stones in green / gold / pink — never the bolts'
// icy blue diamond, so rewards and shots don't get mixed up.
const GEM_COLORS = [['#6ff0a0', '#1f9a52'], ['#ffe066', '#c88a10'], ['#ff8ad8', '#b02a8a']];

export function renderRunWorld(ctx, run, p, t) {
  for (const g of run.gems) {
    const s = 4 + g.tier * 2;
    const [light, dark] = GEM_COLORS[g.tier];
    drawGlow(ctx, g.x, g.y, s * 2.2, light, 0.35);
    ctx.save();
    ctx.translate(g.x, g.y + Math.sin(g.spin) * 1.5);
    ctx.scale(Math.cos(g.spin * 0.8) * 0.25 + 0.85, 1);
    ctx.beginPath(); // hexagonal cut
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,10,0.75)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = light; // table facet
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3;
      ctx.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55 - s * 0.1);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.35, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const blades = runLevel(run, 'orbit');
  if (blades) {
    const R = 58;
    for (let i = 0; i < blades; i++) {
      const a = run.bladeAngle + (i / blades) * Math.PI * 2;
      const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.85;
      drawGlow(ctx, bx, by, 18, '#7fd8ff', 0.55);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(t * 14 + i);
      ctx.fillStyle = '#e8fbff';
      ctx.strokeStyle = '#3a7fa8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const aa = (k / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(aa) * 10, Math.sin(aa) * 10);
        ctx.lineTo(Math.cos(aa + 0.6) * 3.5, Math.sin(aa + 0.6) * 3.5);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}

// XP bar — thin glowing strip just above the buy-button row.
export function renderXPBar(ctx, run) {
  const x = 14, w = CONFIG.width - 28, h = 7;
  const y = CONFIG.height - CONFIG.hud.rowBottomOffset - 16;
  const frac = Math.min(1, run.xp / run.need);
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,24,0.6)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
  if (frac > 0) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#5cc8e8');
    grad.addColorStop(1, '#d27bff');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * frac), h, 4); ctx.fill();
  }
  if (run.xpFlash > 0) {
    ctx.globalAlpha = run.xpFlash * 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.stroke();
  // level badge
  ctx.fillStyle = '#2a1f4d';
  ctx.strokeStyle = '#d27bff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + 4, y + h / 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px "Luckiest Guy", Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(run.lvl + 1), x + 4, y + h / 2 + 4);
  if (run.fever > 0) {
    ctx.font = '12px "Luckiest Guy", Arial';
    ctx.fillStyle = `hsl(${(performance.now() / 3) % 360},100%,70%)`;
    ctx.fillText(tr('g.feverTimer', { n: Math.ceil(run.fever) }), CONFIG.width / 2, y - 5);
  }
  ctx.restore();
}

const CARD = { x: 52, w: CONFIG.width - 104, h: 74, gap: 10, top: 270 };
export const cardRect = (i) => ({ x: CARD.x, y: CARD.top + i * (CARD.h + CARD.gap), w: CARD.w, h: CARD.h });

export function levelUpTap(run, x, y) {
  if (!run.choices || run.choiceT < 0.45) return -1; // ignore the still-held drag finger
  for (let i = 0; i < run.choices.length; i++) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export function renderLevelUp(ctx, run, t) {
  if (!run.choices) return;
  const ct = run.choiceT;
  ctx.save();
  ctx.fillStyle = `rgba(8,4,20,${Math.min(0.55, ct * 3)})`;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // radiating light behind the title
  ctx.save();
  ctx.translate(CONFIG.width / 2, CARD.top - 40);
  ctx.rotate(t * 0.4);
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffd23d';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -120); ctx.lineTo(12, -120); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  const ts = easeOutBack(Math.min(1, ct / 0.35));
  ctx.save();
  ctx.translate(CONFIG.width / 2, CARD.top - 34);
  ctx.scale(ts, ts);
  ctx.textAlign = 'center';
  ctx.font = '28px "Luckiest Guy", Arial';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#2a1f4d';
  const title = tr(run.choiceTitle || 'g.cardLevelUp');
  ctx.font = fitFont(ctx, title, ctx.font, CONFIG.width - 40);
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(title, 0, 0);
  ctx.font = '13px "Fredoka", Arial';
  ctx.fillStyle = '#e8dcff';
  ctx.fillText(tr('g.pickOne'), 0, 20);
  ctx.restore();

  run.choices.forEach((key, i) => {
    const u = RUN_UPGRADES[key];
    const r = cardRect(i);
    const local = Math.max(0, Math.min(1, (ct - 0.08 - i * 0.08) / 0.35));
    if (local <= 0) return;
    const e = easeOutBack(local);
    const lvlNow = runLevel(run, key);
    ctx.save();
    ctx.translate(r.x + r.w / 2 + (1 - e) * 200 * (i % 2 ? 1 : -1), r.y + r.h / 2);
    const hover = Math.sin(t * 3 + i) * 2;
    ctx.translate(0, hover);
    ctx.globalAlpha = Math.min(1, local * 2);
    // card body
    const grad = ctx.createLinearGradient(0, -r.h / 2, 0, r.h / 2);
    grad.addColorStop(0, '#3a2a66');
    grad.addColorStop(1, '#1e1440');
    ctx.fillStyle = grad;
    ctx.strokeStyle = u.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fill(); ctx.stroke();
    // shimmering sweep
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.clip();
    const sweep = ((t * 0.6 + i * 0.3) % 1.6) * r.w * 1.4 - r.w;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sweep, -r.h / 2); ctx.lineTo(sweep + 40, -r.h / 2); ctx.lineTo(sweep - 10, r.h / 2); ctx.lineTo(sweep - 50, r.h / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // icon orb (on the right in Arabic/Persian: the card is mirrored, s = -1)
    const s = isRtl() ? -1 : 1;
    const ix = s * (-r.w / 2 + 38);
    drawGlow(ctx, ix, 0, 30, u.color, 0.5 + 0.2 * Math.sin(t * 4 + i));
    ctx.fillStyle = '#140c28';
    ctx.strokeStyle = u.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ix, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawUpgradePreview(ctx, key, ix, 0, 15, u.color, t, i);
    // text, starting next to the orb on the reading side
    ctx.textAlign = s > 0 ? 'left' : 'right';
    ctx.fillStyle = '#ffffff';
    const tx = ix + s * 32;
    const textW = r.w / 2 - 12 - (s * ix + 32);
    const cardName = tr(`g.up.${key}`);
    ctx.font = fitFont(ctx, cardName, '17px "Luckiest Guy", "Noto Sans Arabic", Arial', textW - (u.max < 99 && lvlNow === 0 ? 34 : 0));
    ctx.fillText(cardName, tx, -9);
    const cardDesc = tr(`g.up.${key}.d`, u.dv);
    ctx.font = fitFont(ctx, cardDesc, '12px "Fredoka", "Noto Sans Arabic", Arial', textW);
    ctx.fillStyle = '#d8ccf5';
    ctx.fillText(cardDesc, tx, 9);
    // level pips
    if (u.max < 99) {
      for (let k = 0; k < u.max; k++) {
        ctx.fillStyle = k < lvlNow ? u.color : k === lvlNow ? '#ffffff' : 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(ix + s * (37 + k * 11), 25, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      if (lvlNow === 0) {
        ctx.fillStyle = '#ffd23d';
        ctx.font = '11px "Luckiest Guy", "Noto Sans Arabic", Arial';
        ctx.textAlign = s > 0 ? 'right' : 'left';
        ctx.fillText(tr('g.cardNew'), s * (r.w / 2 - 12), -r.h / 2 + 18);
      }
    }
    ctx.restore();
  });
  ctx.restore();
}

// A small animated picture of what each power does, drawn in the card's icon
// orb: the shots, their count and where they go. (cx, cy) = orb centre,
// R = picture radius, t = seconds. Unknown keys fall back to the glyph.
function drawUpgradePreview(ctx, key, cx, cy, R, color, t, seed = 0) {
  const cyc = (speed, off = 0) => ((t * speed + off) % 1 + 1) % 1;
  const shot = (x, y, len, w) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - len / 2, w, len, w / 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(x - w / 5, y - len / 2, w * 0.4, len * 0.55, w / 4); ctx.fill();
  };
  const foe = (x, y, r) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  };
  ctx.save();
  switch (key) {
    case 'multishot': // twin shots side by side
      for (const dx of [-0.38, 0.38]) shot(cx + dx * R, cy + R - cyc(1.1) * 2 * R, R * 0.7, R * 0.3);
      break;
    case 'rapid': // a fast stream of shots
      for (let k = 0; k < 3; k++) shot(cx, cy + R - cyc(2.4, k / 3) * 2 * R, R * 0.45, R * 0.24);
      break;
    case 'power': // one big shot
      shot(cx, cy + R - cyc(0.8) * 2 * R, R * 1.2, R * 0.6);
      break;
    case 'pierce': // a shot going straight through a foe
      foe(cx, cy - R * 0.2, R * 0.4);
      shot(cx, cy + R - cyc(0.9) * 2 * R, R * 0.6, R * 0.26);
      break;
    case 'orbit': // blades circling the Guardian
      for (let k = 0; k < 3; k++) {
        const a = t * 2.4 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75, R * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'chain': // lightning zig-zag between two foes
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const x = cx - R + (2 * R * k) / 4;
        const jitter = (Math.sin(Math.floor(t * 10) * 7.1 + k * 3.3 + seed) * 0.5 + 0.5) * R * 0.5 * (k % 2 ? 1 : -1);
        k ? ctx.lineTo(x, cy + jitter) : ctx.moveTo(x, cy + jitter);
      }
      ctx.stroke();
      break;
    case 'seeker': // homing shot curving onto a target
      foe(cx + R * 0.55, cy - R * 0.45, R * 0.3);
      {
        const p = cyc(0.8);
        const x = cx - R * 0.8 + p * R * 1.3, y = cy + R * 0.6 - Math.sin(p * Math.PI) * R * 0.9;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'nova': // expanding ring blast
      {
        const p = cyc(0.9);
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - p;
        ctx.beginPath(); ctx.arc(cx, cy, R * (0.2 + p * 0.85), 0, Math.PI * 2); ctx.stroke();
      }
      break;
    case 'magnet': // gems pulled into the centre
      for (let k = 0; k < 4; k++) {
        const p = cyc(0.9, k / 4), a = k * Math.PI / 2 + 0.4;
        const rr = R * (1 - p);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R * 0.18, 0, Math.PI * 2); ctx.fill();
      }
      break;
    default: // heal, treasure and anything else: the glyph
      ctx.fillStyle = color;
      ctx.font = '22px "Fredoka", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(RUN_UPGRADES[key].icon, cx, cy + 8);
  }
  ctx.restore();
}
