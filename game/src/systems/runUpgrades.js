// ============================================================
// In-run progression (the Survivor.io-style layer from the blueprint):
// every kill drops an XP gem; fill the bar → the battle pauses and you pick
// 1 of 3 upgrades. Upgrades last for the whole run (across levels) and
// stack into builds: fans of bolts, piercing shards, orbiting blades that
// also eat enemy bullets, chain lightning, homing seekers, frost novas.
// ============================================================
import { CONFIG } from '../config.js';
import { Spell } from '../entities/spell.js';
import { drawGlow } from '../render/creatures.js';

export const RUN_UPGRADES = {
  multishot: { name: 'Twin Bolts', desc: '+1 bolt in every volley', max: 4, icon: '✦', color: '#7fd8ff', weight: 4 },
  rapid:     { name: 'Haste Rune', desc: '+20% fire rate', max: 5, icon: '⚡', color: '#ffd23d', weight: 4 },
  power:     { name: 'Power Crystal', desc: '+35% bolt damage', max: 5, icon: '◆', color: '#ff7ad9', weight: 4 },
  pierce:    { name: 'Piercing Shards', desc: 'Bolts pass through +1 foe', max: 3, icon: '➤', color: '#c8a2ff', weight: 3 },
  side:      { name: 'Wing Cannons', desc: 'Extra diagonal bolts', max: 2, icon: '⋎', color: '#58e07f', weight: 3 },
  orbit:     { name: 'Orbit Blades', desc: 'Spinning blades cut foes & block bullets', max: 4, icon: '✺', color: '#9ae6ff', weight: 3 },
  chain:     { name: 'Chain Lightning', desc: 'Lightning leaps between foes', max: 3, icon: 'ϟ', color: '#bfe9ff', weight: 3 },
  seeker:    { name: 'Seeker Missiles', desc: 'Homing missiles hunt foes', max: 3, icon: '➶', color: '#ff9a3d', weight: 3 },
  nova:      { name: 'Frost Nova', desc: 'Pulses freeze & slow nearby foes', max: 2, icon: '❄', color: '#aef2ff', weight: 2 },
  magnet:    { name: 'Gem Magnet', desc: 'Pull gems from much further', max: 2, icon: '◎', color: '#ffe680', weight: 2 },
  heal:      { name: 'Mend', desc: 'Restore 60% of your blood line', max: 99, icon: '♥', color: '#ff5c7a', weight: 3 },
  treasure:  { name: 'Treasure', desc: '+15 coins right now', max: 99, icon: '●', color: '#ffd23d', weight: 0 },
};

// Power climbs step by step: the first few level-ups come quickly (5, 7,
// 13, 23 gems…) so a new run feels the Guardian grow within Level 1.
const xpNeed = (lvl) => 5 + 2 * lvl * lvl;

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

export function damageMult(run) { return 1 + 0.35 * runLevel(run, 'power'); }
export function rateMult(run) { return (1 + 0.2 * runLevel(run, 'rapid')) * (run.fever > 0 ? 1.6 : 1); }

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
  const side = runLevel(run, 'side');
  const angles = side >= 2 ? [0.42, 0.8] : side >= 1 ? [0.42] : [];
  for (const a of angles) {
    spells.push(new Spell(mx, my, dmg * 0.8, { angle: a, pierce, kind, hue }));
    spells.push(new Spell(mx, my, dmg * 0.8, { angle: -a, pierce, kind, hue }));
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
  else if (key === 'treasure') st.coins += 15;
  else run.picks[key] = runLevel(run, key) + 1;
  run.choices = null;
  return checkLevelUp(run, st.player);
}

function checkLevelUp(run, player) {
  if (run.choices) return false;
  if (run.bonus > 0) {
    // free hand-picked powers (Veteran Boost) — no XP cost
    run.bonus--;
    run.choiceTitle = 'VETERAN BOOST';
    run.choices = rollChoices(run, player);
    run.choiceT = 0;
    return true;
  }
  if (run.xp < run.need) return false;
  run.choiceTitle = 'LEVEL UP!';
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
  const total = Math.min(22, Math.round(2 + 1.1 * levelIndex));
  const manual = Math.min(3, total);
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
    if (m.dead || (skip && skip.has(m))) continue;
    const d = (m.x - x) ** 2 + (m.y - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
};

// api = { damageMonster(m, dmg), particles, audio }
// Returns true when a level-up choice just became pending.
export function runUpdate(dt, run, st, api) {
  const p = st.player;
  const dmgBase = p.damage * damageMult(run);
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
      run.xp += g.value;
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
const GEM_COLORS = ['#7fd8ff', '#58e07f', '#d27bff'];

export function renderRunWorld(ctx, run, p, t) {
  for (const g of run.gems) {
    const s = 4 + g.tier * 2.2;
    const col = GEM_COLORS[g.tier];
    drawGlow(ctx, g.x, g.y, s * 2.6, col, 0.45);
    ctx.save();
    ctx.translate(g.x, g.y + Math.sin(g.spin) * 1.5);
    ctx.scale(Math.cos(g.spin * 0.8) * 0.4 + 0.8, 1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.3); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.3); ctx.lineTo(-s, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 0.35, -s * 0.1); ctx.lineTo(-s * 0.5, 0); ctx.closePath(); ctx.fill();
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
    ctx.fillText(`FEVER ${Math.ceil(run.fever)}s`, CONFIG.width / 2, y - 5);
  }
  ctx.restore();
}

const CARD = { x: 34, w: CONFIG.width - 68, h: 104, gap: 16, top: 214 };
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
  ctx.fillStyle = `rgba(8,4,20,${Math.min(0.72, ct * 3)})`;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // radiating light behind the title
  ctx.save();
  ctx.translate(CONFIG.width / 2, 150);
  ctx.rotate(t * 0.4);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#d27bff';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -260); ctx.lineTo(18, -260); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  const ts = easeOutBack(Math.min(1, ct / 0.35));
  ctx.save();
  ctx.translate(CONFIG.width / 2, 150);
  ctx.scale(ts, ts);
  ctx.textAlign = 'center';
  ctx.font = '40px "Luckiest Guy", Arial';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#2a1f4d';
  const title = run.choiceTitle || 'LEVEL UP!';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(title, 0, 0);
  ctx.font = '16px "Fredoka", Arial';
  ctx.fillStyle = '#e8dcff';
  ctx.fillText('Choose a power', 0, 30);
  ctx.restore();

  run.choices.forEach((key, i) => {
    const u = RUN_UPGRADES[key];
    const r = cardRect(i);
    const local = Math.max(0, Math.min(1, (ct - 0.08 - i * 0.08) / 0.35));
    if (local <= 0) return;
    const e = easeOutBack(local);
    const lvlNow = runLevel(run, key);
    ctx.save();
    ctx.translate(r.x + r.w / 2 + (1 - e) * 260 * (i % 2 ? 1 : -1), r.y + r.h / 2);
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
    ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    // shimmering sweep
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 16); ctx.clip();
    const sweep = ((t * 0.6 + i * 0.3) % 1.6) * r.w * 1.4 - r.w;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sweep, -r.h / 2); ctx.lineTo(sweep + 40, -r.h / 2); ctx.lineTo(sweep - 10, r.h / 2); ctx.lineTo(sweep - 50, r.h / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // icon orb
    const ix = -r.w / 2 + 50;
    drawGlow(ctx, ix, 0, 44, u.color, 0.5 + 0.2 * Math.sin(t * 4 + i));
    ctx.fillStyle = '#140c28';
    ctx.strokeStyle = u.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ix, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = u.color;
    ctx.font = '30px "Fredoka", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(u.icon, ix, 11);
    // text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '21px "Luckiest Guy", Arial';
    ctx.fillText(u.name, ix + 44, -12);
    ctx.font = '14px "Fredoka", Arial';
    ctx.fillStyle = '#d8ccf5';
    ctx.fillText(u.desc, ix + 44, 12);
    // level pips
    if (u.max < 99) {
      for (let k = 0; k < u.max; k++) {
        ctx.fillStyle = k < lvlNow ? u.color : k === lvlNow ? '#ffffff' : 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(ix + 50 + k * 14, 34, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      if (lvlNow === 0) {
        ctx.fillStyle = '#ffd23d';
        ctx.font = '12px "Luckiest Guy", Arial';
        ctx.textAlign = 'right';
        ctx.fillText('NEW!', r.w / 2 - 14, -r.h / 2 + 22);
      }
    }
    ctx.restore();
  });
  ctx.restore();
}
