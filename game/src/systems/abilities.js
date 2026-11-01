// ARMORY RANK ABILITIES — every Armory unit unlocks a real new ability at
// Rank 3 and another at Rank 5 (ranks: data/upgrades.js unitRank).
//
//   hero   R3 PIERCING STAR  every 5th volley pierces 2 foes, x1.5 damage
//          R5 STAR BURST     every 8 s a fan of 10 golden stars
//   angel  R3 CHAIN LIGHTNING every 3 s lightning leaps across 4 foes
//          R5 SECOND WIND    once per level: revives right after a knock-out
//   turret R3 DOUBLE BARREL  each shot fires a 2nd bolt (50% damage)
//          R5 HOMING ROUNDS  shots curve after their target
//   wall   R3 MIRROR STONE   enemy bullets bounce back as shards
//          R5 BRAMBLE WALL   thorns x2 + foes near the wall are slowed
//   bomb   R3 NAPALM         the blast leaves a burning patch for 4 s
//          R5 CLUSTER BOMB   3 extra mini-bombs fly at the nearest foes
//   shield R3 MIRROR SHIELD  blocked bullets fly back at foes
//          R5 GATE MEND      once per level a shield restores 1 gate heart
//
// Hooks: main.js calls abUpdate (every frame), abHeroFired, abTurretFired,
// abBombBlast, abShieldUp, abDrawGround/abDraw; collision.js calls
// abWallBlock / abShieldBlock. Per-level state lives in state.ab.
import { CONFIG } from '../config.js';
import { tr } from '../i18n.js';
import { Spell } from '../entities/spell.js';
import { unitRank } from '../data/upgrades.js';
import { drawGlow } from '../render/creatures.js';

// rank needed, name key, description key, colour — read by the Armory dialog
export const AB_LIST = {
  hero:   [{ rank: 3, id: 'hero3', color: '#ffd23d' }, { rank: 5, id: 'hero5', color: '#ffd23d' }],
  angel:  [{ rank: 3, id: 'angel3', color: '#9ae6ff' }, { rank: 5, id: 'angel5', color: '#9ae6ff' }],
  turret: [{ rank: 3, id: 'turret3', color: '#ffd88a' }, { rank: 5, id: 'turret5', color: '#ffd88a' }],
  wall:   [{ rank: 3, id: 'wall3', color: '#c8a06a' }, { rank: 5, id: 'wall5', color: '#7bd96a' }],
  bomb:   [{ rank: 3, id: 'bomb3', color: '#ff8a3d' }, { rank: 5, id: 'bomb5', color: '#ff8a3d' }],
  shield: [{ rank: 3, id: 'shield3', color: '#7fd8ff' }, { rank: 5, id: 'shield5', color: '#ff7a9a' }],
};
export const abName = (id) => tr('ab.' + id);
export const abDesc = (id) => tr('ab.' + id + '.d');
// The ability a unit unlocks exactly at this rank (or null).
export function abUnlockedAt(unit, rank) {
  return (AB_LIST[unit] || []).find((a) => a.rank === rank) || null;
}

const AB_TUNE = {
  heroEvery: 5, heroPierce: 2, heroMult: 1.5,
  burstEvery: 8, burstCount: 10, burstMult: 1.2,
  zapEvery: 3, zapJumps: 4, zapRange: 300, zapHop: 170, zapMult: 3,
  reviveDelay: 0.4,
  twinMult: 0.5,
  mirrorMult: 0.9,
  thornMult: 2, slowZone: 110,
  napalmR: 95, napalmTime: 4, napalmDps: 2.5,
  minis: 3, miniR: 75, miniMult: 8, miniFlight: 0.55,
};

let abCtx = null; // { save, fx: { particles, audio, damageMonster } } — set every frame

// Lazily (re)built at the start of each level.
function abState(st) {
  if (!abCtx || !st) return null;
  if (!st.ab || st.ab.def !== st.levelDef) {
    const r = {};
    for (const u in AB_LIST) r[u] = unitRank(abCtx.save, u);
    st.ab = { def: st.levelDef, r, shots: 0, burstT: 0, patches: [], minis: [], mended: false, tick: 0 };
    for (const a of st.angels || []) { a.abRevived = false; a.abReviveT = 0; }
  }
  return st.ab;
}
const abHas = (ab, unit, rank) => ab && ab.r[unit] >= rank;

function abTargets(st) {
  return st.monsters.filter((m) => !m.dead && m.y >= CONFIG.playTop && m.y < CONFIG.gateY);
}

function abNearest(list, x, y, maxD = Infinity, skip = null) {
  let best = null, bd = maxD * maxD;
  for (const m of list) {
    if (skip && skip.has(m)) continue;
    const d = (m.x - x) ** 2 + (m.y - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// A bolt fired back up the lane, aimed at the nearest foe (mirror abilities).
function abReflect(st, x, y, mult, kind) {
  const tgt = abNearest(abTargets(st).filter((m) => m.y < y), x, y);
  const ang = tgt ? Math.max(-1.2, Math.min(1.2, Math.atan2(tgt.x - x, y - tgt.y))) : 0;
  const s = new Spell(x, y - 6, (st.boltDamage || 1) * mult, { angle: ang, kind: 'turret', speed: CONFIG.spell.speed * 0.9 });
  s.abMirror = kind;
  st.spells.push(s);
  return s;
}

// --- per-frame -------------------------------------------------------------
export function abUpdate(dt, st, save, fx) {
  abCtx = { save, fx };
  const ab = abState(st);
  if (!ab) return;
  const P = fx.particles, foes = abTargets(st), bolt = st.boltDamage || 1;
  ab.tick += dt;

  // HERO R5 — STAR BURST: charges for 8 s, waits for a target, then fires.
  if (abHas(ab, 'hero', 5)) {
    ab.burstT = Math.min(AB_TUNE.burstEvery, ab.burstT + dt);
    if (ab.burstT >= AB_TUNE.burstEvery && foes.length) {
      ab.burstT = 0;
      const p = st.player;
      for (let i = 0; i < AB_TUNE.burstCount; i++) {
        const ang = -1.0 + (2.0 * i) / (AB_TUNE.burstCount - 1);
        const s = new Spell(p.x, p.y - 20, bolt * AB_TUNE.burstMult, { angle: ang, pierce: 1, kind: 'turret', r: CONFIG.spell.size * 1.3 });
        s.abStar = true;
        st.spells.push(s);
      }
      P.ring(p.x, p.y, '#ffd23d', 110, 0.45, 6);
      P.ring(p.x, p.y, '#ffffff', 70, 0.3, 3);
      P.sparkle(p.x, p.y - 20, '#ffd23d', 14);
      P.addShake(4);
      fx.audio.levelUp?.();
    }
  }

  // ANGEL R3 — CHAIN LIGHTNING / R5 — SECOND WIND
  for (const a of st.angels) {
    if (abHas(ab, 'angel', 5)) {
      if (a.stun > 0 && !a.abRevived) { a.abRevived = true; a.abReviveT = AB_TUNE.reviveDelay; }
      if (a.abReviveT > 0) {
        a.abReviveT -= dt;
        if (a.abReviveT <= 0) {
          a.stun = 0; a.blood = a.maxBlood; a.invuln = 1.2;
          P.ring(a.x, a.y, '#9ae6ff', 130, 0.5, 6);
          P.ring(a.x, a.y, '#ffffff', 80, 0.35, 3);
          P.sparkle(a.x, a.y, '#bdeeff', 16);
          P.scoreText(a.x, a.y - 30, tr('ab.fx.revive'), '#9ae6ff', 16);
          fx.audio.gateGood?.();
          // the nova wipes nearby bullets and scorches nearby foes
          for (const b of st.enemyBullets) if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 < 130 * 130) b.dead = true;
          for (const m of foes) if ((m.x - a.x) ** 2 + (m.y - a.y) ** 2 < 130 * 130) fx.damageMonster(m, bolt * 2);
        }
      }
    }
    if (abHas(ab, 'angel', 3)) {
      a.abZapT = (a.abZapT ?? AB_TUNE.zapEvery * (a.side > 0 ? 0.5 : 1)) - dt;
      if (a.abZapT <= 0 && a.stun <= 0) {
        const first = abNearest(foes, a.x, a.y, AB_TUNE.zapRange);
        if (first) {
          a.abZapT = AB_TUNE.zapEvery;
          const pts = [{ x: a.x, y: a.y }], hit = new Set();
          let cur = first;
          while (cur && hit.size < AB_TUNE.zapJumps) {
            hit.add(cur);
            pts.push({ x: cur.x, y: cur.y });
            cur = abNearest(foes, cur.x, cur.y, AB_TUNE.zapHop, hit);
          }
          P.bolt(pts, '#bfe9ff', 0.3);
          P.bolt(pts, '#ffffff', 0.16);
          for (const m of hit) {
            P.sparkle(m.x, m.y, '#bfe9ff', 5);
            fx.damageMonster(m, bolt * a.damageMult * AB_TUNE.zapMult);
          }
          fx.audio.zap?.();
        } else a.abZapT = 0.2;
      }
    }
  }

  // TURRET R3 — twin barrels show on the gun art
  if (abHas(ab, 'turret', 3)) for (const t of st.turrets) { t.twin = true; t.tier = Math.max(t.tier || 0, 8); }

  // WALL R5 — BRAMBLE WALL: thorns x2 (once per wall) and a slowing zone
  if (abHas(ab, 'wall', 5)) {
    for (const w of st.walls) {
      if (!w.abBramble) { w.abBramble = true; w.thorns *= AB_TUNE.thornMult; }
      for (const m of foes) {
        if (m.boss) continue;
        if (Math.abs(m.x - w.x) < w.w / 2 + 20 && m.y > w.y - AB_TUNE.slowZone && m.y < w.y + w.h) m.slowT = Math.max(m.slowT || 0, 0.25);
      }
    }
  }

  // BOMB R3 — NAPALM patches
  for (const pt of ab.patches) {
    pt.t += dt; pt.tick -= dt;
    if (Math.random() < dt * 30) P.sparkle(pt.x + (Math.random() - 0.5) * pt.r * 1.6, pt.y + (Math.random() - 0.5) * pt.r * 0.6, Math.random() < 0.5 ? '#ff8a3d' : '#ffd23d', 1);
    if (pt.tick <= 0) {
      pt.tick = 0.25;
      for (const m of foes) {
        const dx = (m.x - pt.x) / (pt.r + m.r), dy = (m.y - pt.y) / (pt.r * 0.55 + m.r);
        if (dx * dx + dy * dy <= 1) fx.damageMonster(m, bolt * AB_TUNE.napalmDps * 0.25);
      }
    }
  }
  ab.patches = ab.patches.filter((pt) => pt.t < AB_TUNE.napalmTime);

  // BOMB R5 — CLUSTER mini-bombs in flight
  for (const mb of ab.minis) {
    mb.t += dt;
    if (mb.tgt && !mb.tgt.dead) { mb.tx = mb.tgt.x; mb.ty = mb.tgt.y; }
    if (mb.t >= AB_TUNE.miniFlight) {
      mb.done = true;
      P.ring(mb.tx, mb.ty, '#ff8a3d', AB_TUNE.miniR, 0.35, 5);
      P.shatter(mb.tx, mb.ty, '#ffd23d', 14, 8);
      P.poof(mb.tx, mb.ty, '#ff6a2a');
      P.addShake(3);
      fx.audio.crack?.();
      for (const m of abTargets(st)) {
        if ((m.x - mb.tx) ** 2 + (m.y - mb.ty) ** 2 <= (AB_TUNE.miniR + m.r) ** 2) fx.damageMonster(m, bolt * AB_TUNE.miniMult);
      }
    }
  }
  ab.minis = ab.minis.filter((mb) => !mb.done);
}

// HERO R3 — called right after the Guardian's volley (spells from index n0).
export function abHeroFired(st, n0) {
  const ab = abState(st);
  if (!abHas(ab, 'hero', 3)) return;
  ab.shots++;
  if (ab.shots % AB_TUNE.heroEvery) return;
  for (let i = n0; i < st.spells.length; i++) {
    const s = st.spells[i];
    s.pierce += AB_TUNE.heroPierce;
    s.damage *= AB_TUNE.heroMult;
    s.r *= 1.4;
    s.abStar = true;
  }
  abCtx.fx.particles.sparkle(st.player.x, st.player.y - 30, '#ffd23d', 6);
}

// TURRET R3/R5 — called with the bolt the gun just fired.
export function abTurretFired(st, t, s) {
  const ab = abState(st);
  if (!ab || !s) return;
  const shots = [s];
  if (abHas(ab, 'turret', 3)) {
    // the other barrel fires too
    t.barrel = 1 - t.barrel;
    t.recoil[t.barrel] = 1;
    const mz = t.muzzle();
    const s2 = new Spell(mz.x, mz.y, s.damage * AB_TUNE.twinMult, { kind: 'turret', angle: t.aim + 0.04 });
    st.spells.push(s2);
    shots.push(s2);
  }
  if (abHas(ab, 'turret', 5)) for (const b of shots) { b.homing = true; b.target = t.target; b.abHoming = true; }
}

// WALL R3 — an enemy bullet hit a wall: bounce it back.
export function abWallBlock(st, w, b) {
  const ab = abState(st);
  if (!abHas(ab, 'wall', 3)) return;
  abReflect(st, b.x, w.y - w.h / 2, AB_TUNE.mirrorMult, 'wall');
  abCtx.fx.particles.sparkle(b.x, w.y - w.h / 2, '#ffe9b0', 4);
}

// SHIELD R3 — a bullet fizzled on the shield: send it back.
export function abShieldBlock(st, b) {
  const ab = abState(st);
  if (!abHas(ab, 'shield', 3)) return;
  abReflect(st, b.x, b.y, AB_TUNE.mirrorMult, 'shield');
  abCtx.fx.particles.ring(b.x, b.y, '#7fd8ff', 22, 0.2, 2);
}

// SHIELD R5 — raising a shield mends one gate heart, once per level.
export function abShieldUp(st, maxLives) {
  const ab = abState(st);
  if (!abHas(ab, 'shield', 5) || ab.mended || st.lives >= maxLives) return;
  ab.mended = true;
  st.lives++;
  const P = abCtx.fx.particles, x = CONFIG.width / 2, y = CONFIG.gateY;
  P.ring(x, y, '#ff7a9a', 160, 0.6, 6);
  P.sparkle(x, y - 10, '#ff7a9a', 18);
  P.scoreText(x, y - 40, '+1 ♥', '#ff7a9a', 26);
  P.scoreText(x, y - 70, tr('ab.fx.mend'), '#ffd0dc', 16);
}

// BOMB R3/R5 — called after the bomb's blast (list = monsters, nearest-first).
export function abBombBlast(st, list) {
  const ab = abState(st);
  if (!ab) return;
  const P = abCtx.fx.particles;
  const alive = abTargets(st);
  if (abHas(ab, 'bomb', 3)) {
    // where the blast front stopped: the last foe it destroyed, else the
    // nearest survivor, else mid-lane
    let spot = null;
    for (const m of list) if (m.dead) spot = m;
    if (!spot) spot = alive.slice().sort((a, b) => b.y - a.y)[0];
    const x = spot ? spot.x : CONFIG.width / 2;
    const y = Math.max(CONFIG.playTop + 60, Math.min(CONFIG.gateY - 60, spot ? spot.y : CONFIG.height * 0.5));
    ab.patches.push({ x, y, r: AB_TUNE.napalmR, t: 0, tick: 0 });
    P.ring(x, y, '#ff6a2a', AB_TUNE.napalmR * 1.3, 0.4, 5);
  }
  if (abHas(ab, 'bomb', 5)) {
    const p = st.player, pool = alive.slice().sort((a, b) => b.y - a.y);
    for (let i = 0; i < AB_TUNE.minis; i++) {
      const tgt = pool[i] || null;
      const tx = tgt ? tgt.x : 70 + Math.random() * (CONFIG.width - 140);
      const ty = tgt ? tgt.y : CONFIG.playTop + 120 + Math.random() * 200;
      ab.minis.push({ x0: p.x, y0: p.y - 20, tx, ty, tgt, t: -i * 0.08, spin: Math.random() * 6 });
    }
  }
}

// --- drawing -----------------------------------------------------------------
// Under the horde: napalm patches, the bramble slow zone.
export function abDrawGround(ctx, st) {
  const ab = st.ab;
  if (!ab || ab.def !== st.levelDef) return;
  const now = performance.now() / 1000;
  for (const pt of ab.patches) {
    const life = 1 - pt.t / AB_TUNE.napalmTime, fade = Math.min(1, life * 3, pt.t * 6);
    ctx.save();
    ctx.globalAlpha = fade * 0.85;
    const g = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, pt.r);
    g.addColorStop(0, 'rgba(255,220,90,0.9)');
    g.addColorStop(0.45, 'rgba(255,110,30,0.6)');
    g.addColorStop(1, 'rgba(160,30,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, pt.r, pt.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    // licking flame tongues
    ctx.fillStyle = 'rgba(255,170,60,0.8)';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + pt.x;
      const fx = pt.x + Math.cos(a) * pt.r * 0.6, fy = pt.y + Math.sin(a) * pt.r * 0.3;
      const h = 14 + 10 * Math.sin(now * 9 + i * 1.7);
      ctx.beginPath();
      ctx.moveTo(fx - 6, fy); ctx.quadraticCurveTo(fx, fy - h * 1.4, fx + 6, fy); ctx.fill();
    }
    ctx.restore();
  }
  if (ab.r.wall >= 5) {
    for (const w of st.walls) {
      ctx.save();
      const g = ctx.createLinearGradient(0, w.y - AB_TUNE.slowZone, 0, w.y);
      g.addColorStop(0, 'rgba(110,220,110,0)');
      g.addColorStop(1, `rgba(110,220,110,${0.18 + 0.06 * Math.sin(now * 3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(w.x - w.w / 2 - 20, w.y - AB_TUNE.slowZone, w.w + 40, AB_TUNE.slowZone);
      ctx.restore();
    }
  }
}

function abStarPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4, rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// Over the battle: star bolts, mirror shards, reticles, mini-bombs, charge
// ring, sprite sparks, wall vines.
export function abDraw(ctx, st) {
  const ab = st.ab;
  if (!ab || ab.def !== st.levelDef) return;
  const now = performance.now() / 1000;
  for (const s of st.spells) {
    if (s.abStar) {
      drawGlow(ctx, s.x, s.y, s.r * 2.6, '#ffd23d', 0.6);
      ctx.fillStyle = '#fff6c8';
      abStarPath(ctx, s.x, s.y, s.r * 1.1, s.age * 9);
      ctx.fill();
    } else if (s.abMirror) {
      drawGlow(ctx, s.x, s.y, s.r * 2.2, s.abMirror === 'shield' ? '#7fd8ff' : '#ffe9b0', 0.55);
    } else if (s.abHoming) {
      drawGlow(ctx, s.x, s.y, s.r * 1.8, '#ff9a3d', 0.35);
    }
  }
  // Gun R5: lock-on reticle on each gun's target
  if (ab.r.turret >= 5) {
    for (const t of st.turrets) {
      const m = t.target;
      if (!m || m.dead) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(now * 2);
      ctx.strokeStyle = 'rgba(255,154,61,0.8)'; ctx.lineWidth = 2;
      const r = m.r + 8;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.arc(0, 0, r, -0.4, 0.4); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // Wall R3 mirror sheen / R5 bramble vines
  for (const w of st.walls) {
    const top = w.y - w.h / 2;
    if (ab.r.wall >= 3) {
      const k = (now * 0.6 + w.x * 0.01) % 1.6;
      ctx.save();
      ctx.beginPath(); ctx.rect(w.x - w.w / 2, top, w.w, w.h); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const sx = w.x - w.w / 2 + k * (w.w + 40) - 20;
      ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + 10, top); ctx.lineTo(sx, top + w.h); ctx.lineTo(sx - 10, top + w.h); ctx.fill();
      ctx.restore();
    }
    if (ab.r.wall >= 5) {
      ctx.save();
      ctx.strokeStyle = '#3f9a3a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = -w.w / 2; x <= w.w / 2; x += 4) ctx.lineTo(w.x + x, top + 3 + Math.sin(x * 0.25) * 3);
      ctx.stroke();
      ctx.fillStyle = '#9be37e';
      for (let x = -w.w / 2 + 6; x < w.w / 2; x += 12) {
        const bx = w.x + x, by = top + 2 + Math.sin(x * 0.25) * 3;
        ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx, by - 8); ctx.lineTo(bx + 3, by); ctx.fill();
      }
      ctx.restore();
    }
  }
  // Ward sprite R3 spark ready / R5 halo while the revive is unused
  for (const a of st.angels) {
    if (a.stun > 0 && !(a.abReviveT > 0)) continue;
    if (ab.r.angel >= 5 && !a.abRevived) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,240,170,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(a.x, a.y - 22, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (a.abReviveT > 0) {
      const k = 1 - a.abReviveT / AB_TUNE.reviveDelay;
      ctx.save();
      ctx.strokeStyle = '#bdeeff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, 30 - k * 14, 0, Math.PI * 2 * k); ctx.stroke();
      ctx.restore();
    }
    if (ab.r.angel >= 3 && a.abZapT != null && a.abZapT < 0.6 && a.stun <= 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(190,233,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a0 = now * 7 + i * 2.1;
        ctx.moveTo(a.x + Math.cos(a0) * 10, a.y + Math.sin(a0) * 10);
        ctx.lineTo(a.x + Math.cos(a0 + 0.4) * 17, a.y + Math.sin(a0 + 0.4) * 17);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  // Shield R3 — mirror facets spin round the bubble
  const p = st.player;
  if (ab.r.shield >= 3 && p.shieldTime > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,240,255,0.75)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = now * 1.5 + (i * Math.PI) / 3, r = p.size * 1.08;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, a, a + 0.35); ctx.stroke();
    }
    ctx.restore();
  }
  // Hero R5 — star-burst charge ring
  if (ab.r.hero >= 5) {
    const k = ab.burstT / AB_TUNE.burstEvery, full = k >= 1;
    ctx.save();
    ctx.globalAlpha = full ? 0.6 + 0.4 * Math.sin(now * 10) : 0.55;
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(p.x, p.y + 4, p.size * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
    if (full) { ctx.fillStyle = '#fff6c8'; abStarPath(ctx, p.x, p.y - p.size * 0.8 + 4, 6, now * 4); ctx.fill(); }
    ctx.restore();
  }
  // Bomb R5 — mini-bombs arcing to their targets
  for (const mb of ab.minis) {
    if (mb.t < 0) continue;
    const f = Math.min(1, mb.t / AB_TUNE.miniFlight);
    const x = mb.x0 + (mb.tx - mb.x0) * f;
    const y = mb.y0 + (mb.ty - mb.y0) * f - Math.sin(f * Math.PI) * 90;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(mb.spin + mb.t * 12);
    ctx.fillStyle = '#2a1e2e';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = Math.floor(mb.t * 20) % 2 ? '#ffd23d' : '#ffffff';
    ctx.beginPath(); ctx.arc(0, -10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
