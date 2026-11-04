// ============================================================
// Stage mechanics — ONE light gameplay twist per stage.
// Each starts gently at the stage's level 2 and grows a little by level 10
// (sx.k: 0 → 1). Hazards are always telegraphed before they can hurt.
//   0 Abyssal Rift      side current bends the hero's bolts
//   1 Glacial Peak      icy patches: the hero slides (keeps momentum)
//   2 Oasis Citadel     sandstorm gusts drift enemies sideways
//   3 Crystal Forest    crystals split a bolt into 3
//   4 Draconic Peaks    lava cracks glow, then flare (hurts the hero)
//   5 Gilded Aviary     golden feathers: touch for a short fire-rate buff
//   6 Abyssal Forest    spore pods: shoot them → slow-zone for enemies
//   7 Aetherial Gardens star portals teleport bolts across the field
//   8 Clockwork City    (already has airships — no extra twist)
//   9 Spectral Jungle   fog banks hide enemies until the hero is close
//  10 Mountain King     falling rocks with a shadow warning
//  11 The Deepwood      vine bulbs root the hero unless shot first
// main.js calls: sxReset (startLevel), sxAfterPlayer (right after the
// hero moves), sxUpdate (after spells/monsters move, before collisions),
// sxDrawBack (ground layer, under the bolts), sxDrawFront (over the horde,
// under enemy bullets and the hero).
// ============================================================
import { CONFIG } from '../config.js';
import { tr } from '../i18n.js';
import { Spell } from '../entities/spell.js';

const SX_INFO = [
  { id: 'current', color: '#7fd8ff' },
  { id: 'ice', color: '#bff4ff' },
  { id: 'sand', color: '#ffd27a' },
  { id: 'crystal', color: '#8affea' },
  { id: 'lava', color: '#ff7a3d' },
  { id: 'feather', color: '#ffe08a' },
  { id: 'spore', color: '#c9a6ff' },
  { id: 'portal', color: '#b6c8ff' },
  null,
  { id: 'fog', color: '#c8a6ff' },
  { id: 'rock', color: '#e0d8c0' },
  { id: 'vine', color: '#8ad86a' },
];

const sxRand = (a, b) => a + Math.random() * (b - a);
const sxClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sxIsHeroBolt = (s) => s.kind === 'bolt' || s.kind === 'fever';
function sxHeroMaxY(p) { return CONFIG.height - CONFIG.hud.rowBottomOffset - p.size * 1.0 - 20; }

export function sxReset(st, index) {
  const stage = Math.floor(index / 10), lis = index % 10;
  const info = SX_INFO[stage] || null;
  st.sx = {
    stage, info, on: !!info && lis >= 1,
    k: sxClamp((lis - 1) / 8, 0, 1),
    t: 0, timer: 2.5, introDone: false,
    items: [], zones: [],
    px: st.player.x, py: st.player.y, vx: 0, vy: 0, onIce: false,
    rootT: 0, rootBy: null,
    cur: 0, gust: null, streaks: [],
  };
  const sx = st.sx;
  if (!sx.on) return;
  const id = info.id;
  if (id === 'ice') {
    // Disabled circle in center: field kept clean and natural for Stage 2
  } else if (id === 'crystal') {
    const n = 2 + Math.round(sx.k * 2);
    for (let i = 0; i < n; i++) {
      const col = (i + 0.5) / n;
      sx.items.push({ x: col * CONFIG.width + sxRand(-20, 20), y: sxRand(250, 420), r: 15, flash: 0, seed: Math.random() * 10 });
    }
  } else if (id === 'portal') {
    sx.items.push({ side: -1, r: 24 + 6 * sx.k, flash: 0 }, { side: 1, r: 24 + 6 * sx.k, flash: 0 });
  } else if (id === 'fog') {
    const n = 2 + Math.round(sx.k);
    for (let i = 0; i < n; i++) {
      const blobs = [];
      for (let j = 0; j < 6; j++) blobs.push({ dx: sxRand(-90, 90), dy: sxRand(-30, 30), r: sxRand(45, 70) });
      sx.items.push({ x: sxRand(0, CONFIG.width), y: 150 + i * (260 / n) + sxRand(0, 40), v: (i % 2 ? -1 : 1) * sxRand(10, 18), blobs });
    }
  } else if (id === 'current' || id === 'sand') {
    for (let i = 0; i < 26; i++) sx.streaks.push({ x: Math.random() * CONFIG.width, y: sxRand(90, 640), len: sxRand(16, 40), sp: sxRand(0.7, 1.3) });
  }
}

// Right after the hero moved: icy sliding and vine roots adjust his step.
export function sxAfterPlayer(st, dt, particles) {
  const sx = st.sx;
  if (!sx || !sx.on || dt <= 0) return;
  const p = st.player;
  if (sx.info.id === 'ice') {
    const dvx = (p.x - sx.px) / dt, dvy = (p.y - sx.py) / dt;
    sx.onIce = sx.items.some((e) => ((p.x - e.x) / e.rx) ** 2 + ((p.y + p.size * 0.6 - e.y) / e.ry) ** 2 <= 1);
    if (sx.onIce) {
      const grip = 2.6 - 1.0 * sx.k; // lower grip = longer slide
      const kk = Math.min(1, dt * grip);
      sx.vx += (dvx - sx.vx) * kk;
      sx.vy += (dvy - sx.vy) * kk;
      p.x = sxClamp(sx.px + sx.vx * dt, p.size / 2, CONFIG.width - p.size / 2);
      p.y = sxClamp(sx.py + sx.vy * dt, p.size / 2 + 40, sxHeroMaxY(p));
      if (Math.hypot(sx.vx, sx.vy) > 120 && Math.random() < dt * 25) particles.sparkle(p.x, p.y + p.size * 0.9, '#e6fbff', 1);
    } else {
      sx.vx = dvx; sx.vy = dvy;
    }
  } else if (sx.info.id === 'vine' && sx.rootT > 0) {
    sx.rootT -= dt;
    p.x = sx.px; p.y = sx.py; // held in place (still shooting)
    p.vx = 0; p.vy = 0;
  }
  sx.px = p.x; sx.py = p.y;
}

// api = { particles, audio, announcer, saveData, save, bloodLost, damageMonster }
export function sxUpdate(st, dt, api) {
  const sx = st.sx;
  if (!sx || !sx.on) return;
  sx.t += dt;
  const { particles, audio } = api;
  const p = st.player;
  const W = CONFIG.width;
  const quiet = st.levelClearPending; // no new hazards while the lane clears

  // one-time intro banner per stage (after the LEVEL N banner)
  if (!sx.introDone && st.levelTime > 2.3) {
    sx.introDone = true;
    const seen = api.saveData.sxSeen || (api.saveData.sxSeen = {});
    if (!seen[sx.stage]) {
      seen[sx.stage] = 1;
      api.save(api.saveData);
      api.announcer.show(tr(`sx.t.${sx.info.id}`), tr(`sx.s.${sx.info.id}`), sx.info.color, 2.6);
    }
  }

  const id = sx.info.id;
  const hitHero = (x, y, R, frac, color) => {
    if (Math.hypot(p.x - x, p.y - y) > R + p.size * 0.3) return;
    if (p.shieldTime > 0) { particles.sparkle(p.x, p.y, '#7fd8ff'); return; }
    if (p.invuln > 0) return;
    particles.sparkle(p.x, p.y, color, 8);
    particles.addShake(4);
    audio.grazed();
    if (p.takeHit(Math.max(1, Math.round(p.maxBlood * frac)))) api.bloodLost();
  };
  // bolts that touch a round thing
  const boltHits = (x, y, r, filter = sxIsHeroBolt) => st.spells.filter((s) => !s.dead && filter(s) && (s.x - x) ** 2 + (s.y - y) ** 2 <= (r + s.r) ** 2);

  if (id === 'current') {
    // a slow back-and-forth tide; strength grows with the level
    sx.cur = Math.sin(sx.t * 0.45 + 0.6) * (60 + 90 * sx.k);
    for (const s of st.spells) if (!s.homing && s.kind !== 'turret') s.vx += sx.cur * dt;
    for (const k of sx.streaks) {
      k.x += sx.cur * 1.6 * k.sp * dt;
      if (k.x > W + 40) k.x = -40; else if (k.x < -40) k.x = W + 40;
    }
  } else if (id === 'sand') {
    const period = 9 - 2 * sx.k;
    if (!sx.gust) {
      sx.timer -= dt;
      if (sx.timer <= 0 && !quiet) {
        sx.gust = { dir: Math.random() < 0.5 ? -1 : 1, t: 0, warn: 1.5, dur: 2.2 + sx.k, str: 40 + 45 * sx.k };
        sx.timer = period;
      }
    } else {
      const g = sx.gust;
      g.t += dt;
      if (g.t > g.warn) {
        const ramp = Math.min(1, (g.t - g.warn) / 0.4) * Math.min(1, (g.warn + g.dur - g.t) / 0.4);
        for (const m of st.monsters) {
          if (m.dead) continue;
          m.x = sxClamp(m.x + g.dir * g.str * ramp * (m.boss ? 0.35 : 1) * dt, m.r, W - m.r);
        }
      }
      if (g.t > g.warn + g.dur) sx.gust = null;
    }
    const gp = sxGustPower(sx);
    const flow = sx.gust ? sx.gust.dir * (40 + 380 * gp) : 30;
    for (const k of sx.streaks) {
      k.x += flow * k.sp * dt;
      if (k.x > W + 40) k.x = -40; else if (k.x < -40) k.x = W + 40;
    }
  } else if (id === 'crystal') {
    for (const c of sx.items) {
      if (c.flash > 0) c.flash -= dt * 3;
      if (st.spells.length > 170) continue;
      for (const s of boltHits(c.x, c.y, c.r)) {
        if (s.sxSplit) continue;
        s.sxSplit = true;
        const ang = Math.atan2(s.vx, -s.vy);
        for (const d of [-0.34, 0.34]) {
          const n = new Spell(c.x, c.y, s.damage * 0.6, { angle: ang + d, kind: s.kind, hue: s.hue, speed: s.speed, pierce: s.pierce });
          n.sxSplit = true;
          st.spells.push(n);
        }
        c.flash = 1;
        particles.sparkle(c.x, c.y, '#8affea', 3);
      }
    }
  } else if (id === 'lava') {
    sx.timer -= dt;
    const maxOn = sx.k > 0.5 ? 2 : 1;
    if (sx.timer <= 0 && !quiet && sx.items.length < maxOn) {
      sx.timer = 6.5 - 2.5 * sx.k;
      const near = Math.random() < 0.6;
      const x = near ? p.x + sxRand(-50, 50) : sxRand(50, W - 50);
      const y = near ? p.y + sxRand(-30, 40) : sxRand(380, 600);
      sx.items.push({ x: sxClamp(x, 50, W - 50), y: sxClamp(y, 300, 610), R: 42 + 10 * sx.k, t: 0, warn: 1.8 - 0.2 * sx.k, hit: false, seed: Math.random() * 10 });
    }
    for (const c of sx.items) {
      c.t += dt;
      if (!c.hit && c.t >= c.warn) {
        c.hit = true;
        particles.shatter(c.x, c.y, '#ff8a3d', c.R * 0.6, 12);
        particles.ring(c.x, c.y, '#ffb347', c.R * 1.4, 0.35, 5);
        audio.stomp();
        hitHero(c.x, c.y, c.R, 0.2, '#ff8a3d');
        for (const m of st.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < c.R + m.r) api.damageMonster(m, (st.boltDamage || 1) * 3);
      }
      if (c.hit && c.t < c.warn + 0.5 && Math.random() < dt * 30) particles.sparkle(c.x + sxRand(-c.R, c.R) * 0.7, c.y + sxRand(-10, 10), '#ffb347', 1);
    }
    sx.items = sx.items.filter((c) => c.t < c.warn + 1.4);
  } else if (id === 'feather') {
    sx.timer -= dt;
    if (sx.timer <= 0 && !quiet && sx.items.length < 3) {
      sx.timer = 5.5 - 1.5 * sx.k;
      sx.items.push({ x0: sxRand(50, W - 50), y: 90, t: 0, seed: Math.random() * 10 });
    }
    for (const f of sx.items) {
      f.t += dt;
      f.y += (48 + 10 * sx.k) * dt;
      f.x = sxClamp(f.x0 + Math.sin(f.t * 1.6 + f.seed) * 40, 20, W - 20);
      if (Math.hypot(f.x - p.x, f.y - p.y) < 22 + p.size / 2) {
        f.dead = true;
        if (p.fireRateMultTime > 0 && p.fireRateMult >= 1.4) p.fireRateMultTime = Math.max(p.fireRateMultTime, 3);
        else p.applyGate(1.4, 3);
        audio.gateGood();
        particles.sparkle(f.x, f.y, '#ffe08a', 10);
        particles.ring(p.x, p.y, '#ffd23d', 50, 0.35, 4);
        particles.scoreText(p.x, p.y - 40, tr('sx.fast'), '#ffd23d', 16);
      }
      if (f.y > CONFIG.gateY) f.dead = true;
    }
    sx.items = sx.items.filter((f) => !f.dead);
  } else if (id === 'spore') {
    sx.timer -= dt;
    if (sx.timer <= 0 && !quiet && sx.items.length < 3) {
      sx.timer = 6 - 2 * sx.k;
      sx.items.push({ x: sxRand(50, W - 50), y: 95, t: 0, seed: Math.random() * 10 });
    }
    for (const pod of sx.items) {
      pod.t += dt;
      pod.y += 26 * dt;
      const hits = boltHits(pod.x, pod.y, 15, () => true);
      if (hits.length) {
        hits[0].dead = true;
        pod.dead = true;
        sx.zones.push({ x: pod.x, y: pod.y, R: 75 + 15 * sx.k, t: 0, life: 4 });
        particles.shatter(pod.x, pod.y, '#c9a6ff', 14, 10);
        particles.ring(pod.x, pod.y, '#c9a6ff', 80, 0.4, 4);
        audio.nova();
      }
      if (pod.y > 600) { pod.dead = true; particles.poof(pod.x, pod.y, '#7a5ab0'); }
    }
    sx.items = sx.items.filter((pod) => !pod.dead);
    for (const z of sx.zones) {
      z.t += dt;
      for (const m of st.monsters) if (!m.dead && Math.hypot(m.x - z.x, m.y - z.y) < z.R + m.r * 0.5) m.slowT = Math.max(m.slowT || 0, 0.25);
    }
    sx.zones = sx.zones.filter((z) => z.t < z.life);
  } else if (id === 'portal') {
    const [a, b] = sx.items;
    sxPortalPos(sx, a, b);
    for (const [from, to] of [[a, b], [b, a]]) {
      if (from.flash > 0) from.flash -= dt * 3;
      for (const s of boltHits(from.x, from.y, from.r - 6, (s) => sxIsHeroBolt(s) || s.kind === 'turret')) {
        if (s.sxPorted) continue;
        s.sxPorted = true;
        s.x = to.x + (s.x - from.x) * 0.3;
        s.y = to.y - to.r * 0.6;
        from.flash = 1; to.flash = 1;
        if (Math.random() < 0.4) particles.sparkle(to.x, to.y, '#b6c8ff', 2);
      }
    }
  } else if (id === 'fog') {
    for (const f of sx.items) {
      f.x += f.v * dt;
      if (f.x > W + 140) f.x = -140; else if (f.x < -140) f.x = W + 140;
    }
  } else if (id === 'rock') {
    sx.timer -= dt;
    const maxOn = sx.k > 0.5 ? 2 : 1;
    if (sx.timer <= 0 && !quiet && sx.items.length < maxOn) {
      sx.timer = 5.5 - 2 * sx.k;
      const near = Math.random() < 0.6;
      sx.items.push({ x: sxClamp(near ? p.x + sxRand(-30, 30) : sxRand(40, W - 40), 40, W - 40),
        y: sxClamp(near ? p.y + sxRand(-20, 30) : sxRand(220, 600), 150, 615),
        R: 38 + 8 * sx.k, t: 0, warn: 1.6 - 0.15 * sx.k, hit: false, rot: Math.random() * 6 });
    }
    for (const r of sx.items) {
      r.t += dt;
      if (!r.hit && r.t >= r.warn) {
        r.hit = true;
        particles.shatter(r.x, r.y, '#9a8f80', r.R * 0.7, 14);
        particles.ring(r.x, r.y, '#e0d8c0', r.R * 1.5, 0.35, 5);
        for (let i = 0; i < 5; i++) particles.dust(r.x + sxRand(-r.R, r.R) * 0.6, r.y + sxRand(-8, 8));
        particles.addShake(4);
        audio.stomp();
        hitHero(r.x, r.y, r.R, 0.2, '#e0d8c0');
        for (const m of st.monsters) if (!m.dead && Math.hypot(m.x - r.x, m.y - r.y) < r.R + m.r) api.damageMonster(m, (st.boltDamage || 1) * 4);
      }
    }
    sx.items = sx.items.filter((r) => r.t < r.warn + 0.9);
  } else if (id === 'vine') {
    sx.timer -= dt;
    if (sx.timer <= 0 && !quiet && sx.items.length < 1 + (sx.k > 0.5 ? 1 : 0) && sx.rootT <= 0) {
      sx.timer = 6.5 - 2 * sx.k;
      // sprouts just ahead of the hero so his own bolts can cut it
      sx.items.push({ x: sxClamp(p.x + sxRand(-45, 45), 40, W - 40), y: sxClamp(p.y - sxRand(45, 95), 200, 560),
        R: 62 + 14 * sx.k, t: 0, grow: 2.6 - 0.3 * sx.k, hp: 3 + Math.round(2 * sx.k), hpMax: 3 + Math.round(2 * sx.k), state: 'grow', seed: Math.random() * 10 });
    }
    for (const v of sx.items) {
      v.t += dt;
      for (const s of boltHits(v.x, v.y, 16, (s) => s.kind !== 'seeker')) {
        if (v.state === 'gone') break;
        s.dead = true;
        v.hp--;
        particles.sparkle(v.x, v.y, '#8ad86a', 4);
        if (v.hp <= 0) {
          v.state = 'gone';
          particles.shatter(v.x, v.y, '#5fae46', 16, 10);
          audio.shatter();
          if (sx.rootBy === v) { sx.rootT = 0; sx.rootBy = null; }
        }
      }
      if (v.state === 'grow' && v.t >= v.grow) {
        v.state = 'lash';
        v.lashT = 0;
        if (Math.hypot(p.x - v.x, p.y - v.y) < v.R + p.size * 0.3 && p.shieldTime <= 0) {
          sx.rootT = 1.0 + 0.6 * sx.k;
          sx.rootBy = v;
          audio.gateCurse();
          particles.scoreText(p.x, p.y - 44, tr('sx.rooted'), '#8ad86a', 18);
        }
      }
      if (v.state === 'lash') {
        v.lashT += dt;
        if (v.lashT > Math.max(0.8, sx.rootBy === v ? sx.rootT + 0.3 : 0)) v.state = 'gone';
      }
    }
    if (sx.rootT <= 0) sx.rootBy = null;
    sx.items = sx.items.filter((v) => v.state !== 'gone');
  }
}

function sxGustPower(sx) {
  const g = sx.gust;
  if (!g) return 0;
  if (g.t < g.warn) return 0.25 * (g.t / g.warn);
  return Math.min(1, (g.t - g.warn) / 0.4) * Math.min(1, (g.warn + g.dur - g.t) / 0.4);
}

function sxPortalPos(sx, a, b) {
  // the pair bobs up and down in mirror; later levels swing wider
  const sw = 50 + 50 * sx.k;
  a.x = 62; a.y = 330 + Math.sin(sx.t * 0.5) * sw;
  b.x = CONFIG.width - 62; b.y = 330 - Math.sin(sx.t * 0.5) * sw;
}

// ---------- drawing ----------
export function sxDrawBack(ctx, st) {
  const sx = st.sx;
  if (!sx || !sx.on) return;
  const id = sx.info.id, t = st.levelTime;
  ctx.save();
  if (id === 'ice') {
    // Disabled circle in center for Stage 2
  } else if (id === 'lava') {
    for (const c of sx.items) {
      const warnF = Math.min(1, c.t / c.warn);
      if (!c.hit) {
        // glowing cracks spread out from the centre, a pulsing warning ring
        const pulse = 0.5 + 0.5 * Math.sin(c.t * (8 + 10 * warnF));
        ctx.globalAlpha = 0.25 + 0.3 * warnF;
        ctx.fillStyle = '#ff3d1a';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R, c.R * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R, c.R * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        sxCracks(ctx, c, warnF, '#ffd27a', 2.5);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = '#5a1606'; ctx.lineWidth = 3;
        ctx.font = '20px "Luckiest Guy", Arial'; ctx.textAlign = 'center';
        ctx.strokeText('!', c.x, c.y - c.R * 0.5 - 6); ctx.fillText('!', c.x, c.y - c.R * 0.5 - 6);
      } else {
        const ft = (c.t - c.warn) / 1.4;
        ctx.globalAlpha = Math.max(0, 1 - ft);
        const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.R);
        g.addColorStop(0, '#fff3c4'); g.addColorStop(0.4, '#ff9a3d'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R * 1.1, c.R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        sxCracks(ctx, c, 1, '#ffe9a8', 3);
      }
    }
  } else if (id === 'rock') {
    for (const r of sx.items) {
      if (r.hit) {
        const f = (r.t - r.warn) / 0.9;
        ctx.globalAlpha = Math.max(0, 1 - f);
        ctx.fillStyle = 'rgba(40,34,30,0.5)';
        ctx.beginPath(); ctx.ellipse(r.x, r.y + 6, r.R * 0.9, r.R * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const f = Math.min(1, r.t / r.warn);
      ctx.globalAlpha = 0.25 + 0.45 * f;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.R * (0.4 + 0.6 * f), r.R * 0.42 * (0.4 + 0.6 * f), 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(r.t * 14) ** 2;
      ctx.strokeStyle = '#ff5c4a'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.R, r.R * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (id === 'spore') {
    for (const z of sx.zones) {
      const a = Math.min(1, z.t * 4) * Math.min(1, (z.life - z.t) / 0.6);
      ctx.globalAlpha = 0.35 * a;
      const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.R);
      g.addColorStop(0, '#e6d4ff'); g.addColorStop(0.7, '#9a6ae0'); g.addColorStop(1, 'rgba(120,80,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.6 * a;
      ctx.strokeStyle = '#d9c2ff'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.R * (0.92 + 0.05 * Math.sin(z.t * 4)), z.t * 0.6, z.t * 0.6 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (id === 'vine') {
    for (const v of sx.items) {
      const f = v.state === 'grow' ? Math.min(1, v.t / v.grow) : 1;
      // reach ring
      ctx.globalAlpha = (v.state === 'grow' ? 0.35 + 0.45 * f : 0.5) * (0.75 + 0.25 * Math.sin(v.t * 10));
      ctx.strokeStyle = '#8ad86a'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(v.x, v.y, v.R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.12 + 0.18 * f;
      ctx.fillStyle = '#2f6a22';
      ctx.beginPath(); ctx.arc(v.x, v.y, v.R * f, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function sxCracks(ctx, c, f, color, w) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = c.seed + i * 1.05;
    const len = c.R * (0.55 + 0.4 * ((i * 37) % 10) / 10) * f;
    ctx.moveTo(c.x, c.y);
    const mx = c.x + Math.cos(a + 0.3) * len * 0.5, my = c.y + Math.sin(a + 0.3) * len * 0.5 * 0.45;
    ctx.lineTo(mx, my);
    ctx.lineTo(c.x + Math.cos(a) * len, c.y + Math.sin(a) * len * 0.45);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

let sxFogCanvas = null;
export function sxDrawFront(ctx, st) {
  const sx = st.sx;
  if (!sx || !sx.on) return;
  const id = sx.info.id, t = st.levelTime, W = CONFIG.width;
  const p = st.player;
  ctx.save();
  if (id === 'current') {
    const a = Math.min(1, Math.abs(sx.cur) / 120);
    ctx.strokeStyle = '#d4f6ff'; ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
    for (const k of sx.streaks) {
      ctx.globalAlpha = 0.18 + 0.4 * a * k.sp * 0.8;
      const dir = Math.sign(sx.cur) || 1;
      ctx.beginPath();
      ctx.moveTo(k.x, k.y);
      ctx.quadraticCurveTo(k.x - dir * k.len * 0.5, k.y + Math.sin(t * 2 + k.y) * 3, k.x - dir * k.len * (0.6 + a), k.y);
      ctx.stroke();
    }
    // chevrons at the side show which way the current pulls
    if (a > 0.2) {
      const dir = Math.sign(sx.cur);
      ctx.globalAlpha = 0.35 * a + 0.15;
      for (const y of [230, 420]) sxChevrons(ctx, dir > 0 ? W - 30 : 30, y, dir, 9, '#7fd8ff', '#0a2a44');
    }
  } else if (id === 'sand') {
    const gp = sxGustPower(sx);
    ctx.globalAlpha = 0.07 + 0.26 * gp;
    ctx.fillStyle = '#d9a75a';
    ctx.fillRect(0, CONFIG.playTop, W, CONFIG.gateY - CONFIG.playTop);
    ctx.strokeStyle = '#ffe2a8'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    const dir = sx.gust ? sx.gust.dir : 1;
    for (const k of sx.streaks) {
      ctx.globalAlpha = 0.15 + 0.5 * gp;
      ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - dir * k.len * (0.5 + 1.5 * gp), k.y + 2); ctx.stroke();
    }
    if (sx.gust && sx.gust.t < sx.gust.warn + 0.3) {
      // the warning: big arrows blow in from the side
      const f = Math.min(1, sx.gust.t / 0.3);
      ctx.globalAlpha = f * (0.6 + 0.4 * Math.sin(sx.gust.t * 12));
      for (const y of [200, 330, 460]) sxChevrons(ctx, W / 2 + sx.gust.dir * ((sx.gust.t * 160) % 120 - 60), y, sx.gust.dir, 20, '#ffd27a', '#4a2e0a');
    }
  } else if (id === 'crystal') {
    for (const c of sx.items) {
      const bob = Math.sin(t * 2 + c.seed) * 3;
      const x = c.x, y = c.y + bob, r = c.r;
      ctx.globalAlpha = 0.35 + 0.4 * Math.max(0, c.flash);
      const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4);
      g.addColorStop(0, '#c8fff4'); g.addColorStop(1, 'rgba(60,220,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x + r * 0.8, y - r * 0.2); ctx.lineTo(x + r * 0.5, y + r);
      ctx.lineTo(x - r * 0.5, y + r); ctx.lineTo(x - r * 0.8, y - r * 0.2); ctx.closePath();
      ctx.fillStyle = c.flash > 0 ? '#ffffff' : '#5ff0d4';
      ctx.strokeStyle = '#0b3b33'; ctx.lineWidth = 3;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 0.35, y - r * 0.2); ctx.lineTo(x, y + r * 0.7); ctx.closePath(); ctx.fill();
      // tiny "×3" hint
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#dffff8'; ctx.strokeStyle = '#0b3b33'; ctx.lineWidth = 3;
      ctx.font = '11px "Luckiest Guy", Arial'; ctx.textAlign = 'center';
      ctx.strokeText('×3', x, y + r + 13); ctx.fillText('×3', x, y + r + 13);
    }
  } else if (id === 'feather') {
    for (const f of sx.items) {
      const a = Math.sin(f.t * 3.2 + f.seed) * 0.6;
      ctx.globalAlpha = 0.5;
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 26);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.quadraticCurveTo(9, -4, 3, 14); ctx.lineTo(-3, 14); ctx.quadraticCurveTo(-9, -4, 0, -16);
      ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#6a4300'; ctx.lineWidth = 2.5;
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 18); ctx.stroke();
      ctx.restore();
    }
  } else if (id === 'spore') {
    for (const pod of sx.items) {
      const pul = 1 + Math.sin(pod.t * 5 + pod.seed) * 0.08;
      const r = 14 * pul;
      ctx.globalAlpha = 0.5;
      const g = ctx.createRadialGradient(pod.x, pod.y, 2, pod.x, pod.y, r * 2.2);
      g.addColorStop(0, '#e6d4ff'); g.addColorStop(1, 'rgba(150,90,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pod.x, pod.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9a6ae0'; ctx.strokeStyle = '#2a1050'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(pod.x, pod.y, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6d4ff';
      for (let i = 0; i < 4; i++) {
        const a = pod.seed + i * 1.6;
        ctx.beginPath(); ctx.arc(pod.x + Math.cos(a) * r * 0.45, pod.y + Math.sin(a) * r * 0.5, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (id === 'portal') {
    for (const pt of sx.items) {
      if (pt.x === undefined) continue;
      const r = pt.r;
      ctx.globalAlpha = 0.45 + 0.4 * Math.max(0, pt.flash);
      const g = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, r * 1.8);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#9fb4ff'); g.addColorStop(1, 'rgba(90,100,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = i ? '#ffffff' : '#7f8cff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * (i ? 0.62 : 1), t * (i ? -3 : 2) * pt.side, t * (i ? -3 : 2) * pt.side + Math.PI * 1.5);
        ctx.stroke();
      }
      sxStar(ctx, pt.x, pt.y, r * 0.38, t * 1.5 * pt.side);
    }
    // a faint dotted link between the two
    const [a, b] = sx.items;
    if (a.x !== undefined) {
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#b6c8ff'; ctx.lineWidth = 2; ctx.setLineDash([2, 10]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(a.x + a.r, a.y); ctx.lineTo(b.x - b.r, b.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (id === 'fog') {
    sxDrawFog(ctx, st, sx, p);
  } else if (id === 'vine') {
    sxDrawVines(ctx, sx);
  }
  ctx.restore();
}

// Drawn after the hero: warning rings must never hide behind him, the
// falling rock lands on top, and roots wrap his legs.
export function sxDrawTop(ctx, st) {
  const sx = st.sx;
  if (!sx || !sx.on) return;
  const id = sx.info.id, t = st.levelTime, p = st.player;
  ctx.save();
  if (id === 'lava' || id === 'rock') {
    for (const c of sx.items) {
      if (c.hit) continue;
      const f = Math.min(1, c.t / c.warn);
      const ry = c.R * (id === 'lava' ? 0.45 : 0.42);
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(c.t * (8 + 10 * f)) ** 2;
      ctx.lineWidth = 3.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 20;
      ctx.strokeStyle = id === 'lava' ? '#ffb347' : '#ff5c4a';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // the "!" sits on the near rim, out of the hero's way
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = '#3a0e04'; ctx.lineWidth = 3.5;
      ctx.font = '22px "Luckiest Guy", Arial'; ctx.textAlign = 'center';
      const ex = c.x + c.R * 0.95, ey = c.y + 6;
      ctx.strokeText('!', ex, ey); ctx.fillText('!', ex, ey);
    }
  }
  if (id === 'rock') {
    for (const r of sx.items) {
      if (r.hit) continue;
      const fall = 0.4;
      const ft = (r.t - (r.warn - fall)) / fall;
      if (ft <= 0) continue;
      const y = r.y - (1 - ft) * (r.y + 40);
      const rr = r.R * 0.62;
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(r.x, y); ctx.rotate(r.rot + ft * 2);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, k = 0.8 + 0.2 * Math.sin(i * 2.7 + r.rot);
        if (i === 0) ctx.moveTo(Math.cos(a) * rr * k, Math.sin(a) * rr * k); else ctx.lineTo(Math.cos(a) * rr * k, Math.sin(a) * rr * k);
      }
      ctx.closePath();
      ctx.fillStyle = '#8a7f72'; ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3.5;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-rr * 0.3, -rr * 0.3, rr * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  if (id === 'vine' && sx.rootT > 0) sxDrawRoots(ctx, p, t);
  ctx.restore();
}

function sxDrawVines(ctx, sx) {
    for (const v of sx.items) {
      const f = v.state === 'grow' ? Math.min(1, v.t / v.grow) : 1;
      // tendrils reaching out
      ctx.strokeStyle = '#3f8a2c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 5; i++) {
        const a = v.seed + i * 1.256 + Math.sin(v.t * 2 + i) * 0.15;
        const len = (v.state === 'lash' ? v.R : v.R * 0.6 * f);
        ctx.beginPath(); ctx.moveTo(v.x, v.y);
        ctx.quadraticCurveTo(v.x + Math.cos(a + 0.6) * len * 0.5, v.y + Math.sin(a + 0.6) * len * 0.5, v.x + Math.cos(a) * len, v.y + Math.sin(a) * len);
        ctx.stroke();
      }
      // the bulb
      const r = 9 + 7 * f;
      ctx.globalAlpha = 1;
      ctx.fillStyle = v.hp < v.hpMax ? '#a8e07f' : '#5fae46'; ctx.strokeStyle = '#173a10'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(v.x, v.y, r * 0.85, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8ff9a';
      ctx.beginPath(); ctx.arc(v.x - r * 0.25, v.y - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
    }
}

function sxDrawRoots(ctx, p, t) {
    {
      // vines wrapped around the hero's legs
      ctx.strokeStyle = '#3f8a2c'; ctx.lineWidth = 4; ctx.globalAlpha = 0.95; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = p.y + p.size * (0.3 + i * 0.25);
        ctx.beginPath(); ctx.ellipse(p.x, yy, p.size * 0.55, 5, Math.sin(t * 6 + i) * 0.15, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#8ad86a';
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + 0.4;
        ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * p.size * 0.55, p.y + p.size * 0.5 + Math.sin(a) * 6, 5, 2.5, a, 0, Math.PI * 2); ctx.fill();
      }
    }
}

// Two outlined chevrons pointing dir (+1 right, -1 left) — drawn as paths,
// not text, so right-to-left languages don't mirror them.
function sxChevrons(ctx, x, y, dir, s, fill, edge) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [w, col] of [[s * 0.75, edge], [s * 0.4, fill]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath();
    for (const off of [-s * 0.7, s * 0.7]) {
      const cx = x + off;
      ctx.moveTo(cx - dir * s * 0.5, y - s); ctx.lineTo(cx + dir * s * 0.5, y); ctx.lineTo(cx - dir * s * 0.5, y + s);
    }
    ctx.stroke();
  }
}

function sxStar(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#fff6c4'; ctx.strokeStyle = '#3a3a8a'; ctx.lineWidth = 2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Fog banks drawn over the horde with a clear bubble around the hero, so
// enemies inside the fog read dim until he gets close.
function sxDrawFog(ctx, st, sx, p) {
  const W = CONFIG.width, H = CONFIG.height;
  if (!sxFogCanvas) {
    if (typeof document === 'undefined') return;
    sxFogCanvas = document.createElement('canvas');
    sxFogCanvas.width = W; sxFogCanvas.height = H;
  }
  const fc = sxFogCanvas.getContext('2d');
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-over';
  fc.clearRect(0, 0, W, H);
  const dens = 0.72 + 0.15 * sx.k;
  for (const f of sx.items) {
    for (const b of f.blobs) {
      const x = f.x + b.dx, y = f.y + b.dy + Math.sin(st.levelTime * 0.6 + b.dx) * 4;
      const g = fc.createRadialGradient(x, y, 4, x, y, b.r);
      g.addColorStop(0, `rgba(170,155,215,${dens})`);
      g.addColorStop(0.6, `rgba(140,125,195,${dens * 0.85})`);
      g.addColorStop(1, 'rgba(120,105,180,0)');
      fc.fillStyle = g;
      fc.beginPath(); fc.arc(x, y, b.r, 0, Math.PI * 2); fc.fill();
    }
  }
  // the hero's lantern clears a bubble
  fc.globalCompositeOperation = 'destination-out';
  const R = 135;
  const hg = fc.createRadialGradient(p.x, p.y - 40, 20, p.x, p.y - 40, R);
  hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.6, 'rgba(0,0,0,0.8)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  fc.fillStyle = hg;
  fc.beginPath(); fc.arc(p.x, p.y - 40, R, 0, Math.PI * 2); fc.fill();
  fc.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(sxFogCanvas, 0, 0, W, H);
  // soft wisps on top for the ghostly look
  ctx.globalAlpha = 0.18; ctx.strokeStyle = '#d9c8ff'; ctx.lineWidth = 2;
  for (const f of sx.items) {
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 80, 18, 0, Math.PI * 1.1 + st.levelTime * 0.3, Math.PI * 1.9 + st.levelTime * 0.3);
    ctx.stroke();
  }
}
