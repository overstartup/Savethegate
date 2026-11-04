// Bosses — every stage has three boss fights:
//   L4  a CAPTAIN  (mini-boss): a big, crowned version of the stage's own
//       goblin-role species, with one special volley (an aimed fan).
//   L7  a WARLORD  (mini-boss): the same treatment for the skeleton-role
//       species, with a downward arc of bullets.
//   L10 the STAGE BOSS (the cast's ogreBoss): bigger, with a cinematic
//       intro (darkened screen, sliding WARNING banner, rumble, descent),
//       a second phase at 50% hp (flash, ENRAGED banner, faster, summons
//       minions of the stage cast) and a big slow-motion death with a
//       chain of explosions and a coin burst.
// Spawned by systems/spawner.js (bzSpawnBoss); main.js calls bzUpdate,
// bzVolley, bzOnKill and the render hooks.
import { CONFIG } from '../config.js';
import { Monster } from '../entities/monster.js';
import { EnemyBullet } from '../entities/enemyBullet.js';
import { SPECIES } from '../render/species.js';
import { drawGlow } from '../render/creatures.js';
import { tr, fitFont } from '../i18n.js';
import { audio } from './audio.js';
import { F_TITLE } from '../ui/screens.js';

export const BZ_TUNE = {
  miniScale: 1.4,      // captain / warlord size vs the regular species
  miniHp: 0.6,         // share of the old boss-hp formula a captain gets
  finalScale: 1.0,     // stage boss size vs before
  finalHp: 1.25,       // stage boss hp vs the old formula (phase 2 adds minions)
  introDur: 3.0,       // seconds of the stage-boss intro (no damage, no fire)
  summonEvery: 10,     // phase 2: seconds between minion summons
  summonMax: 4,        // phase 2: never more than this many minions alive
};

// Name shown on the boss bar and in the banners.
export function bzBossName(m) {
  if (m.bzMini) return m.skin ? tr('bz.cap.' + m.skin) : tr(m.bzRole === 'goblin' ? 'bz.capDefault' : 'bz.lordDefault');
  return (m.skin && SPECIES[m.skin]?.name) || tr('g.bossDefaultName');
}

// Replaces the old single boss spawn (spawner.update, def.boss levels).
export function bzSpawnBoss(sp, state, def) {
  const W = CONFIG.width;
  const lis = sp.lis;
  const mini = lis === 3 || lis === 6;
  const runLvl = state.run?.lvl || 0;
  const D = CONFIG.difficulty;
  const baseHp = (D.bossBase + D.bossLevel * lis + D.bossStage * sp.stageIdx) * (1 + D.bossRun * runLvl)
    * (1 + D.armoryHp * ((state.armoryDps || 1) - 1));
  // phase 0 → the weave starts at the lane center (the intro drops it there)
  const path = { targetX: W / 2, curveAmp: W * 0.32, curveFreq: 1.3, phase: 0 };
  let m;
  if (mini) {
    const role = lis === 3 ? 'goblin' : 'skeleton';
    m = new Monster(role, W / 2, -70, def.speed * 0.6, path);
    m.boss = true;
    m.bzMini = true;
    m.bzRole = role;
    m.r *= BZ_TUNE.miniScale;
    m.path.curveAmp = W * 0.24;
    m.path.curveFreq = role === 'goblin' ? 1.25 : 1.05;
    m.hp = m.maxHp = Math.max(20, Math.round(baseHp * BZ_TUNE.miniHp));
    m.skin = def.cast?.[role] || null;
    m.shootInterval = role === 'goblin' ? 2.1 : 2.6;
    m.shootTimer = 2.4;
    m.damage = Math.round((sp.t?.dmg || 20) * CONFIG.difficulty.miniBullet);
    m.score = 120;
    m.power = 900; // same as the stage boss: a bomb barely dents it
  } else {
    m = new Monster('ogreBoss', W / 2, -80, def.speed * 0.6, path);
    m.r *= BZ_TUNE.finalScale;
    m.y = -m.r * 1.6;
    m.hp = m.maxHp = Math.round(baseHp * BZ_TUNE.finalHp);
    m.skin = def.cast?.ogreBoss || null;
    m.bzFinal = true;
    m.damage = Math.round((sp.t?.dmg || 20) * CONFIG.difficulty.bossBullet);
    m.bzIntroT = BZ_TUNE.introDur;
  }
  state.monsters.push(m);
  state.onBoss?.(m);
  return m;
}

// Arrival: a short banner for captains, the full intro for the stage boss.
export function bzOnBoss(m, st, particles) {
  if (m.bzMini) audio.bossRoar();
  else if (audio.bossIntro) audio.bossIntro(); else audio.bossRoar();
  if (m.bzMini) {
    particles.addShake(8);
    st.bzBanner = { kind: 'mini', title: tr(m.bzRole === 'goblin' ? 'bz.capIncoming' : 'bz.lordIncoming'), sub: bzBossName(m), color: '#ffd23d', t: 0, dur: 2.4 };
  } else {
    particles.addShake(12);
    st.bzIntro = { t: 0, dur: BZ_TUNE.introDur, roared: false };
    st.bzBanner = { kind: 'warning', title: tr('bz.warning'), sub: bzBossName(m), color: '#ff3a4a', t: 0, dur: BZ_TUNE.introDur };
  }
}

// Per-frame: intro, phase 2 trigger + summons, death sequence, flying coins.
export function bzUpdate(st, dt, particles) {
  if (st.bzBanner) { st.bzBanner.t += dt; if (st.bzBanner.t >= st.bzBanner.dur) st.bzBanner = null; }
  if (st.bzFlash > 0) st.bzFlash = Math.max(0, st.bzFlash - dt * 1.6);
  const boss = st.monsters.find((m) => m.bzFinal && !m.dead);
  if (st.bzIntro) {
    const it = st.bzIntro;
    it.t += dt;
    if (it.t < it.dur * 0.75) particles.addShake(dt * 26); // ground rumble
    if (!it.roared && it.t > it.dur * 0.55) {
      it.roared = true;
      audio.bossRoar();
      particles.addShake(10);
      if (boss) {
        particles.ring(boss.x, boss.y, '#ff3a4a', boss.r * 3, 0.6, 6);
        particles.ring(boss.x, boss.y, '#ffffff', boss.r * 2, 0.45, 3);
      }
    }
    if (it.t >= it.dur) st.bzIntro = null;
  }
  if (boss && boss.enraged && !boss.bzP2) {
    // ---- phase 2 ----
    boss.bzP2 = true;
    boss.bzSummonT = 1.0;
    st.bzFlash = 0.8;
    st.bzFlashColor = '255,60,70';
    st.bzBanner = { kind: 'enraged', title: tr('bz.enraged'), sub: tr('bz.enragedSub'), color: '#ff3a4a', t: 0, dur: 2.2 };
    if (audio.bossPhase) audio.bossPhase(); else audio.bossRoar();
    particles.addShake(12);
    for (let i = 0; i < 3; i++) particles.ring(boss.x, boss.y, ['#ffffff', '#ff3a4a', '#ff8a3d'][i], boss.r * (2 + i), 0.5 + i * 0.12, 6 - i);
    // flush the old pattern so the new one starts right away
    boss.shootTimer = Math.min(boss.shootTimer ?? 1, 0.8);
  }
  if (boss && boss.bzP2) {
    boss.bzSummonT -= dt;
    if (boss.bzSummonT <= 0) {
      boss.bzSummonT = BZ_TUNE.summonEvery;
      bzSummon(st, boss, particles);
    }
  }
  // death: a chain of explosions across the body, then the big pop
  const d = st.bzDeath;
  if (d) {
    d.t += dt;
    while (d.done < d.n && d.t >= d.done * d.step) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * d.r;
      const x = d.x + Math.cos(a) * rr, y = d.y + Math.sin(a) * rr * 0.8;
      particles.shatter(x, y, d.color, d.r * 0.5, 10);
      particles.ring(x, y, Math.random() < 0.5 ? '#ffd23d' : '#ffffff', d.r * 0.9, 0.35, 4);
      particles.sparkle(x, y, '#ffe9a8', 6);
      particles.addShake(d.mini ? 3 : 5);
      audio.stomp();
      d.done++;
    }
    if (!d.popped && d.t >= d.n * d.step) {
      d.popped = true;
      audio.bigBoom();
      particles.addShake(12);
      st.bzFlash = d.mini ? 0.35 : 0.7;
      st.bzFlashColor = '255,255,255';
      for (let i = 0; i < 4; i++) particles.ring(d.x, d.y, ['#ffffff', '#ffd23d', '#ff7ad9', d.color][i], d.r * (2.2 + i * 1.2), 0.6 + i * 0.15, 9 - i * 2);
      particles.shatter(d.x, d.y, d.color, d.r * 1.4, d.mini ? 24 : 50);
      bzCoinBurst(st, d.x, d.y, d.coinsN);
    }
    if (d.t > d.n * d.step + 2) st.bzDeath = null;
  }
  // coins: burst out, fall a moment, then fly to the HUD coin pill
  if (st.bzCoins) {
    for (const c of st.bzCoins) {
      c.t += dt;
      if (c.t < 0.55) {
        c.vy += 600 * dt;
        c.vx *= 1 - dt * 1.5;
        c.x += c.vx * dt; c.y += c.vy * dt;
      } else {
        const k = Math.min(1, dt * (4 + (c.t - 0.55) * 10));
        c.x += (20 - c.x) * k; c.y += (54 - c.y) * k;
        if (Math.hypot(c.x - 20, c.y - 54) < 8) {
          c.dead = true;
          if (Math.random() < 0.35) audio.coin?.();
        }
      }
    }
    st.bzCoins = st.bzCoins.filter((c) => !c.dead);
    if (!st.bzCoins.length) st.bzCoins = null;
  }
}

// Phase-2 summon: a few of the stage's own goblin-role species burst out.
function bzSummon(st, boss, particles) {
  const sp = st.spawner;
  if (!sp.t) sp.tune(st);
  const alive = st.monsters.filter((m) => m.bzMinion && !m.dead).length;
  const n = Math.min(3, BZ_TUNE.summonMax - alive);
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2;
    const x = Math.max(40, Math.min(CONFIG.width - 40, boss.x + off * boss.r * 1.2));
    const y = boss.y + boss.r * 0.7;
    const mm = sp.mk(st, 'goblin', x, y);
    mm.bzMinion = true;
    mm.pvx = off * 140;
    mm.pvy = 90;
    particles.ring(x, y, '#ff4d5a', 34, 0.35, 3);
    particles.poof?.(x, y, '#ff8a8a');
  }
  if (n > 0) {
    audio.bossShot();
    boss.fireFlash = 0.3;
  }
}

// Captain / warlord volleys. Returns false for the stage boss so main.js
// keeps using its classic bossVolley patterns.
export function bzVolley(m, st, particles) {
  if (!m.bzMini) return false;
  m.volley = (m.volley || 0) + 1;
  const sp = CONFIG.enemyBullet.speed;
  const dmg = Math.round(m.damage * 0.8);
  const ox = m.x, oy = m.y + m.r * 0.5;
  if (m.bzRole === 'goblin') {
    // aimed fan: 5 bullets spread around the Guardian
    const base = Math.atan2(st.player.y - oy, st.player.x - ox);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.2;
      st.enemyBullets.push(new EnemyBullet(ox, oy, dmg, Math.cos(a) * sp * 0.95, Math.sin(a) * sp * 0.95, true));
    }
  } else {
    // downward arc of 9, offset every other volley so the gaps move
    const n = 9, shift = (m.volley % 2) * 0.09;
    for (let i = 0; i < n; i++) {
      const a = 0.35 + shift + (i / (n - 1)) * (Math.PI - 0.7);
      st.enemyBullets.push(new EnemyBullet(ox, oy, dmg, Math.cos(a) * sp * 0.72, Math.sin(a) * sp * 0.72, true));
    }
  }
  particles.ring(ox, oy, '#ffd23d', 36, 0.3, 4);
  audio.bossShot();
  return true;
}

// Called from main.js events.kill for any boss. Pays the bonus and starts
// the death sequence. Returns the coins paid.
export function bzOnKill(m, st, particles) {
  const E = CONFIG.economy.bossBonus;
  const full = Math.round((E.base + E.perStage * (st.spawner?.stageIdx || 0)) * (E.finalMult ?? 1.5));
  const n = m.bzMini ? Math.round(full * (E.miniShare ?? 0.4)) : full;
  st.coins += n;
  // minions crumble with their master
  for (const mm of st.monsters) {
    if (mm.bzMinion && !mm.dead) {
      mm.dead = true;
      particles.shatter(mm.x, mm.y, '#ff8a8a', mm.r, 8);
    }
  }
  st.enemyBullets.length = 0;
  const tint = st.levelDef?.monsterTint;
  const sp = m.skin && SPECIES[m.skin];
  st.bzDeath = {
    x: m.x, y: m.y, r: m.r, mini: !!m.bzMini, t: 0, done: 0,
    n: m.bzMini ? 4 : 8, step: m.bzMini ? 0.09 : 0.11,
    color: sp?.colors?.primary || tint?.primary || m.color, coinsN: m.bzMini ? 10 : 22, popped: false,
  };
  st.bzBanner = {
    kind: 'defeat', title: tr(m.bzMini ? 'bz.capDefeated' : 'bz.defeated'), sub: tr('bz.coins', { n }),
    color: m.bzMini ? '#ffd23d' : '#58e07f', t: 0, dur: m.bzMini ? 2.4 : 3.4,
  };
  st.bzIntro = null;
  return n;
}

function bzCoinBurst(st, x, y, n) {
  st.bzCoins = st.bzCoins || [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const v = 160 + Math.random() * 220;
    st.bzCoins.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: -Math.random() * 0.15, spin: Math.random() * 6 });
  }
}

// ---------------------------------------------------------------- render --

// Gold crown + aura on captains/warlords (drawn on top of the species).
export function bzDrawCrown(ctx, m, t) {
  if (!m.bzMini) return;
  const r = m.r;
  drawGlow(ctx, m.x, m.y, r * 1.9, '#ffcc33', 0.22 + 0.08 * Math.sin(t * 4));
  ctx.save();
  ctx.translate(m.x, m.y - (m.z || 0));
  // rotating gold ring at the feet
  ctx.save();
  ctx.scale(1, 0.35);
  ctx.rotate(t * 1.4);
  ctx.strokeStyle = 'rgba(255,210,61,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.arc(0, r * 2.6, r * 1.15, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // crown
  const w = r * 0.95, h = r * 0.55;
  const cy = -r * 0.92 + Math.sin(t * 4 + m.seed) * 1.5;
  ctx.rotate(Math.max(-0.3, Math.min(0.3, (m.vx || 0) / 400)) - 0.12);
  ctx.translate(0, cy);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2 - w * 0.05, -h * 0.85);
  ctx.lineTo(-w * 0.25, -h * 0.4);
  ctx.lineTo(0, -h);
  ctx.lineTo(w * 0.25, -h * 0.4);
  ctx.lineTo(w / 2 + w * 0.05, -h * 0.85);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#c98a12');
  ctx.fillStyle = g;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = '#4a2a00';
  ctx.fill(); ctx.stroke();
  // band
  ctx.fillStyle = '#b8780e';
  ctx.fillRect(-w / 2, -h * 0.2, w, h * 0.2);
  ctx.strokeRect(-w / 2, -h * 0.2, w, h * 0.2);
  // jewels + point balls
  const jr = Math.max(1.6, r * 0.07);
  ctx.fillStyle = '#ff3a5a';
  ctx.beginPath(); ctx.arc(0, -h * 0.1, jr * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3ad0ff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * w * 0.3, -h * 0.1, jr, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff6c8';
  for (const [px, py] of [[-w / 2 - w * 0.05, -h * 0.85], [0, -h], [w / 2 + w * 0.05, -h * 0.85]]) {
    ctx.beginPath(); ctx.arc(px, py, jr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // glint
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-w * 0.2, -h * 0.55, w * 0.06, h * 0.14, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Under the HUD: intro darkness (a spotlight on the boss) and phase flashes.
export function bzRenderBack(ctx, st) {
  const W = CONFIG.width, H = CONFIG.height;
  const it = st.bzIntro;
  if (it) {
    const fadeIn = Math.min(1, it.t / 0.35), fadeOut = Math.min(1, (it.dur - it.t) / 0.6);
    const a = 0.68 * Math.max(0, Math.min(fadeIn, fadeOut));
    const boss = st.monsters.find((m) => m.bzFinal && !m.dead);
    const bx = boss ? boss.x : W / 2, by = boss ? Math.max(60, boss.y) : 150, br = boss ? boss.r : 50;
    const g = ctx.createRadialGradient(bx, by, br * 1.2, bx, by, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(20,0,10,0)');
    g.addColorStop(0.25, `rgba(20,0,10,${a * 0.75})`);
    g.addColorStop(1, `rgba(8,0,6,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // pulsing red edges
    ctx.save();
    ctx.globalAlpha = a * (0.45 + 0.35 * Math.sin(it.t * 9));
    const e = ctx.createLinearGradient(0, 0, 0, H);
    e.addColorStop(0, 'rgba(255,30,50,0.6)'); e.addColorStop(0.15, 'rgba(255,30,50,0)');
    e.addColorStop(0.85, 'rgba(255,30,50,0)'); e.addColorStop(1, 'rgba(255,30,50,0.6)');
    ctx.fillStyle = e;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (st.bzFlash > 0) {
    ctx.fillStyle = `rgba(${st.bzFlashColor || '255,255,255'},${Math.min(0.75, st.bzFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function bzText(ctx, str, x, y, size, color, maxW, outline = 5) {
  ctx.font = fitFont(ctx, str, `${size}px ${F_TITLE}`, maxW);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline;
  ctx.strokeStyle = '#1a0610';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function bzCoin(ctx, x, y, r, spin) {
  const sx = Math.abs(Math.cos(spin)) * 0.8 + 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function bzHazardBand(ctx, x, y, w, h, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#1a0408';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff2a3a';
  const step = 22, off = (t * 60) % (step * 2);
  for (let sx = x - h - step * 2 + off; sx < x + w + h; sx += step * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h); ctx.lineTo(sx + h, y); ctx.lineTo(sx + h + step, y); ctx.lineTo(sx + step, y + h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#ffb0b8'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// Over everything (after the boss bar): banners + flying coins.
export function bzRenderFront(ctx, st) {
  const W = CONFIG.width;
  if (st.lc) { st.bzBanner = st.bzCoins = null; return; } // the level-clear dialog is up
  if (st.bzCoins) for (const c of st.bzCoins) if (c.t >= 0) bzCoin(ctx, c.x, c.y, 7, c.spin + c.t * 9);
  const b = st.bzBanner;
  if (!b) return;
  const t = b.t, out = Math.max(0, Math.min(1, (b.dur - t) / 0.4));
  const ease = (p) => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
  ctx.save();
  if (b.kind === 'warning') {
    const cy = 300;
    const slide = (1 - ease(t / 0.4)) * W + (1 - out) * W;
    ctx.globalAlpha = out;
    bzHazardBand(ctx, -10 - slide, cy - 52, W + 20, 18, t);
    bzHazardBand(ctx, -10 + slide, cy + 50, W + 20, 18, -t);
    ctx.fillStyle = 'rgba(20,2,8,0.72)';
    ctx.fillRect(0, cy - 34, W, 84);
    const pulse = 1 + 0.06 * Math.sin(t * 14);
    ctx.save();
    ctx.translate(W / 2, cy - 6);
    ctx.scale(pulse, pulse);
    const blink = Math.sin(t * 12) > -0.3;
    bzText(ctx, b.title, 0, 0, 44, blink ? '#ff3a4a' : '#ffb0b8', W - 60, 7);
    ctx.restore();
    bzText(ctx, b.sub, W / 2 + (1 - ease((t - 0.3) / 0.4)) * -W, cy + 32, 18, '#ffd23d', W - 40, 4);
  } else if (b.kind === 'enraged') {
    const cy = 300;
    const p = ease(t / 0.3);
    ctx.globalAlpha = out;
    ctx.fillStyle = 'rgba(60,0,10,0.6)';
    ctx.fillRect(0, cy - 36 * p, W, 72 * p + 18);
    ctx.save();
    ctx.translate(W / 2 + (Math.random() - 0.5) * 4 * out, cy);
    const s = 0.4 + 0.6 * p + 0.04 * Math.sin(t * 16);
    ctx.scale(s, s);
    bzText(ctx, b.title, 0, 0, 46, '#ff3a4a', W - 50, 7);
    ctx.restore();
    bzText(ctx, b.sub, W / 2, cy + 34, 16, '#ffd0a0', W - 40, 4);
  } else if (b.kind === 'mini') {
    const cy = 250;
    const slide = (1 - ease(t / 0.35)) * -W;
    ctx.globalAlpha = out;
    ctx.translate(slide, 0);
    const g = ctx.createLinearGradient(0, cy - 30, 0, cy + 40);
    g.addColorStop(0, 'rgba(90,50,0,0.85)'); g.addColorStop(1, 'rgba(40,18,0,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(10, cy - 30); ctx.lineTo(W - 10, cy - 30); ctx.lineTo(W - 30, cy + 5); ctx.lineTo(W - 10, cy + 40);
    ctx.lineTo(10, cy + 40); ctx.lineTo(30, cy + 5); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3; ctx.stroke();
    bzText(ctx, b.title, W / 2, cy - 8, 30, '#ffd23d', W - 90, 6);
    bzText(ctx, b.sub, W / 2, cy + 22, 16, '#fff2c0', W - 90, 4);
  } else if (b.kind === 'defeat') {
    const cy = 290;
    const p = Math.max(0, Math.min(1, t / 0.45));
    const s = p < 1 ? 0.3 + 0.9 * p - 0.2 * Math.sin(p * Math.PI) * (p) : 1 + 0.03 * Math.sin(t * 5);
    ctx.globalAlpha = out * Math.min(1, t / 0.15);
    // sunburst
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(t * 0.6);
    ctx.fillStyle = 'rgba(255,220,90,0.16)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -220); ctx.lineTo(22, -220); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(s, s);
    bzText(ctx, b.title, 0, 0, 42, b.color, W - 40, 7);
    ctx.restore();
    if (t > 0.35) {
      ctx.globalAlpha = out * Math.min(1, (t - 0.35) / 0.25);
      bzCoin(ctx, W / 2 - 70, cy + 40, 11, t * 4);
      bzText(ctx, b.sub, W / 2 + 10, cy + 41, 24, '#ffd23d', W - 160, 5);
    }
  }
  ctx.restore();
}
