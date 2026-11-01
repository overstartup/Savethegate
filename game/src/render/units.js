import { tr } from '../i18n.js';
// ============================================================
// Unit art shared by the Armory page, the in-run buy row and the battlefield,
// so a helper looks the same everywhere: the Ward Sprite, the Stone Wall,
// the Bomb and the Shield. (The Gun has its own module, render/gun.js; the
// Guardian is render/hero.js.) Helpers prefixed `un`. Each unit's look
// grows with its Armory rank (see "Rank looks").
// ============================================================

// 4-point twinkle star
function unStar(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2); ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2); ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2);
  ctx.fill();
}

// ---- Rank looks ---------------------------------------------------------
// Every Armory rank adds to a unit's art, so upgrades show on the card and
// on the battlefield: 2 BRONZE trim, 3 SILVER plating, 4 GOLD trim and a
// halo, 5+ LEGEND gem tones and a crown. main.js keeps unitRanks current;
// drawUnitArt reads it when no rank is passed.
export const unitRanks = {};
const UN_METAL = ['#c8d0dc', '#c8d0dc', '#e09a5a', '#dfe8f5', '#ffd23d', '#ff7ae0'];
const UN_METAL_DARK = ['#56657c', '#56657c', '#7a4a20', '#6e7c92', '#a8740c', '#7a2a8a'];
export const rankMetal = (rank) => UN_METAL[Math.max(1, Math.min(5, rank || 1))];
const unMetalDark = (rank) => UN_METAL_DARK[Math.max(1, Math.min(5, rank || 1))];
// what the next rank adds (Armory dialog hint); none past LEGEND
export const RANK_LOOKS = {
  get 2() { return tr('d.look.bronze'); },
  get 3() { return tr('d.look.silver'); },
  get 4() { return tr('d.look.gold'); },
  get 5() { return tr('d.look.legend'); },
};

// Armory backdrop for a unit's rank: 2+ a rune ring under it, 3+ motes
// circling it, 4+ a turning sun halo, 5+ a shifting prism glow and sparks.
export function drawRankAura(ctx, rank, x, y, s, t) {
  if (rank < 2) return;
  const c = rankMetal(rank);
  ctx.save();
  ctx.translate(x, y);
  if (rank >= 5) {
    const hue = (t * 60) % 360;
    const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.75);
    g.addColorStop(0, `hsla(${hue},100%,70%,0.45)`);
    g.addColorStop(1, `hsla(${(hue + 80) % 360},100%,60%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, 7); ctx.fill();
  }
  if (rank >= 4) {
    ctx.save();
    ctx.rotate(t * 0.5);
    ctx.fillStyle = rank >= 5 ? 'rgba(255,170,240,0.3)' : 'rgba(255,210,61,0.32)';
    for (let k = 0; k < 12; k++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(-s * 0.045, -s * 0.3); ctx.lineTo(0, -s * 0.74); ctx.lineTo(s * 0.045, -s * 0.3); ctx.fill();
    }
    ctx.restore();
  }
  // rune ring on the ground
  ctx.save();
  ctx.translate(0, s * 0.46); ctx.scale(1, 0.3);
  ctx.strokeStyle = c; ctx.globalAlpha = 0.8; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.52, 0, 7); ctx.stroke();
  ctx.setLineDash([s * 0.06, s * 0.05]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.stroke();
  ctx.restore();
  if (rank >= 3) {
    const n = Math.min(6, rank);
    for (let k = 0; k < n; k++) {
      const a = t * 1.6 + k * Math.PI * 2 / n;
      ctx.fillStyle = c; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(a * 3);
      unStar(ctx, Math.cos(a) * s * 0.58, Math.sin(a) * s * 0.18 + s * 0.12, 2.2);
    }
    ctx.globalAlpha = 1;
  }
  if (rank >= 5) {
    for (let k = 0; k < 5; k++) {
      const p = (t * 0.6 + k / 5) % 1;
      ctx.fillStyle = `hsla(${(t * 90 + k * 70) % 360},100%,80%,${1 - p})`;
      ctx.beginPath(); ctx.arc(Math.sin(k * 2.7 + t) * s * 0.4, s * 0.4 - p * s * 0.9, 1.5 + (1 - p) * 1.5, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

// Over the unit: rank 4 a turning gold star, 5+ a crown with a prism gem.
export function drawRankCrest(ctx, rank, x, y, s, t) {
  if (rank < 4) return;
  ctx.save();
  ctx.translate(x, y - s * 0.6 + Math.sin(t * 2) * 2);
  if (rank >= 5) {
    const w = s * 0.17, h = s * 0.11;
    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#d89a1a');
    ctx.fillStyle = g; ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-w, h * 0.6); ctx.lineTo(-w, -h * 0.5); ctx.lineTo(-w * 0.5, 0); ctx.lineTo(0, -h);
    ctx.lineTo(w * 0.5, 0); ctx.lineTo(w, -h * 0.5); ctx.lineTo(w, h * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = `hsl(${(t * 90) % 360},100%,70%)`;
    ctx.beginPath(); ctx.arc(0, h * 0.2, h * 0.3, 0, 7); ctx.fill();
  } else {
    ctx.rotate(Math.sin(t * 1.5) * 0.25);
    ctx.fillStyle = '#ffd23d';
    unStar(ctx, 0, 0, s * 0.05);
    ctx.fillStyle = '#fff';
    unStar(ctx, 0, 0, s * 0.022);
  }
  ctx.restore();
}

// Ward Sprite: a cut crystal with crystal-feather wings and a ward ring.
// Rank: 3+ a 4th feather, 5+ a 5th; ring in rank metal; 4+ gold-tipped
// feathers; 5+ a rose crystal.
function unSprite(ctx, s, t, bob, rank) {
  ctx.translate(0, bob * 2);
  const au = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 0.62);
  au.addColorStop(0, 'rgba(154,230,255,0.45)');
  au.addColorStop(1, 'rgba(154,230,255,0)');
  ctx.fillStyle = au;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, 7); ctx.fill();
  const flap = Math.sin(t * 9) * 0.28;
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.15 + flap);
    const nf = rank >= 5 ? 5 : rank >= 3 ? 4 : 3;
    for (let k = 0; k < nf; k++) {
      const len = s * (0.52 - k * 0.07);
      ctx.save(); ctx.rotate(-0.6 + k * 1.0 / (nf - 1));
      const wg = ctx.createLinearGradient(s * 0.12, 0, s * 0.12 + len, 0);
      wg.addColorStop(0, 'rgba(255,255,255,0.95)');
      wg.addColorStop(1, rank >= 5 ? 'rgba(255,154,230,0.7)' : rank >= 4 ? 'rgba(255,210,61,0.75)' : 'rgba(127,216,255,0.55)');
      ctx.fillStyle = wg; ctx.strokeStyle = 'rgba(28,58,82,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s * 0.12, 0); ctx.lineTo(s * 0.12 + len * 0.45, -s * 0.07);
      ctx.lineTo(s * 0.12 + len, 0); ctx.lineTo(s * 0.12 + len * 0.45, s * 0.05);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  const bw = s * 0.22, bh = s * 0.3;
  const facets = rank >= 5 ? ['#ffffff', '#ffd6f6', '#ff9ae6', '#c050c8'] : ['#ffffff', '#bdeeff', '#7fd8ff', '#3a9fd8'];
  for (const [c, a, b] of [[facets[0], [0, -bh], [-bw, 0]], [facets[1], [0, -bh], [bw, 0]],
    [facets[2], [-bw, 0], [0, bh]], [facets[3], [bw, 0], [0, bh]]]) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#1c3a52'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(bw, 0); ctx.lineTo(0, bh); ctx.lineTo(-bw, 0); ctx.closePath(); ctx.stroke();
  const blink = (t % 3.2) < 0.12 ? 0.2 : 1;
  ctx.fillStyle = '#12304a';
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex * s * 0.07, -s * 0.02, s * 0.03, s * 0.045 * blink, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff';
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.arc(ex * s * 0.07 + 1, -s * 0.035, 1.2, 0, 7); ctx.fill(); }
  ctx.save();
  ctx.shadowColor = rank >= 2 ? rankMetal(rank) : '#7fd8ff'; ctx.shadowBlur = 10;
  ctx.strokeStyle = rank >= 2 ? rankMetal(rank) : '#e6fbff'; ctx.lineWidth = rank >= 4 ? 3.2 : 2.5;
  ctx.beginPath(); ctx.ellipse(0, -s * 0.42, s * 0.17, s * 0.05, 0, 0, 7); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 3; k++) {
    const a = t * 2.2 + k * 2.09;
    ctx.fillStyle = `rgba(230,251,255,${0.5 + 0.5 * Math.sin(a * 2)})`;
    unStar(ctx, Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.16 + s * 0.05, 2.5);
  }
}

// Stone Wall of any size: two courses of shaded stones with moss and a row
// of steel spikes on top. (cx, cy) is the centre of the stonework; dmg 0..1
// adds cracks as the wall wears down. Rank: 2+ a banner, 3+ an iron band,
// 4+ gold spikes, 5+ glowing runes.
export function drawStoneWall(ctx, cx, cy, w, h, t, dmg = 0, rank = unitRanks.wall || 1) {
  const top = cy - h / 2, rh = h / 2, spikeH = h * 0.5, lw = Math.max(1, h * 0.09);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(cx, top + h + 3, w * 0.55, Math.max(3, h * 0.18), 0, 0, 7); ctx.fill();
  const n = Math.max(4, Math.round(w / 14)), sw = Math.min(h * 0.3, (w / n) * 0.42);
  for (let i = 0; i < n; i++) {
    const sx = cx - w / 2 + w * (i + 0.5) / n, sh = spikeH + Math.sin(t * 3 + i) * spikeH * 0.08;
    const sg = ctx.createLinearGradient(sx - sw, 0, sx + sw, 0);
    sg.addColorStop(0, rank >= 4 ? '#fff3a8' : '#f2f6fb');
    sg.addColorStop(1, rank >= 4 ? '#b8820c' : '#6f7c8e');
    ctx.fillStyle = sg; ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = Math.max(1, lw * 0.75);
    ctx.beginPath(); ctx.moveTo(sx - sw, top + 2); ctx.lineTo(sx, top - sh); ctx.lineTo(sx + sw, top + 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  const tops = ['#c4a37c', '#b8966e', '#ad8a62'], bots = ['#7a5a3c', '#6e5034', '#664a30'];
  const cols = Math.max(3, Math.round(w / (rh * 2.6)));
  for (let r = 0; r < 2; r++) {
    const y0 = top + r * rh, off = r ? 0.5 : 0;
    for (let k = -1; k < cols; k++) {
      const x0 = Math.max(cx - w / 2, cx - w / 2 + (k + off) * w / cols) + lw * 0.75;
      const x1 = Math.min(cx + w / 2, cx - w / 2 + (k + 1 + off) * w / cols) - lw * 0.75;
      if (x1 - x0 < 2) continue;
      const shade = (r * 3 + k + 3) % 3;
      const g = ctx.createLinearGradient(0, y0, 0, y0 + rh);
      g.addColorStop(0, tops[shade]);
      g.addColorStop(1, bots[shade]);
      ctx.fillStyle = g; ctx.strokeStyle = '#3e2a18'; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.roundRect(x0, y0 + 1, x1 - x0, rh - 2, Math.min(4, rh * 0.3)); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,210,0.45)'; ctx.lineWidth = Math.max(1, lw * 0.75);
      ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 1 + rh * 0.2); ctx.lineTo(x1 - 3, y0 + 1 + rh * 0.2); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(110,170,80,0.85)';
  for (const [mx, mr] of [[-0.32, 0.22], [0.05, 0.18], [0.36, 0.26]]) {
    ctx.beginPath(); ctx.ellipse(cx + mx * w, top + 2, mr * h + 3, mr * h * 0.6, 0, 0, 7); ctx.fill();
  }
  if (rank >= 3) { // riveted iron band along the seam
    const bh = Math.max(3, h * 0.14);
    const ig = ctx.createLinearGradient(0, top + rh - bh / 2, 0, top + rh + bh / 2);
    ig.addColorStop(0, rankMetal(rank)); ig.addColorStop(1, unMetalDark(rank));
    ctx.fillStyle = ig; ctx.strokeStyle = '#1a1424'; ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.beginPath(); ctx.roundRect(cx - w / 2 + 2, top + rh - bh / 2, w - 4, bh, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1424';
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(cx - w / 2 + w * (i + 0.5) / n, top + rh, Math.max(1, bh * 0.18), 0, 7); ctx.fill();
    }
  }
  if (rank >= 5) { // runes glowing in the stones
    const pulse = 0.55 + 0.45 * Math.sin(t * 3);
    ctx.save();
    ctx.globalAlpha = pulse; ctx.strokeStyle = '#ff9ae6'; ctx.lineWidth = Math.max(1.2, h * 0.07);
    ctx.shadowColor = '#ff7ae0'; ctx.shadowBlur = 8;
    for (const rx of [-0.3, 0, 0.3]) {
      const x = cx + rx * w, y = top + rh * 1.5, r = rh * 0.28;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  if (rank >= 2) { // banner in the rank's colour, waving from a pole
    const px = cx - w * 0.36, py = top - h * 1.05, fh = h * 0.42, fw = h * 0.6;
    ctx.strokeStyle = '#3e2a18'; ctx.lineWidth = Math.max(1.5, lw);
    ctx.beginPath(); ctx.moveTo(px, top + 2); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = rankMetal(rank); ctx.strokeStyle = '#1a1424'; ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let k = 1; k <= 4; k++) ctx.lineTo(px + fw * k / 4, py + Math.sin(t * 5 + k) * fh * 0.15);
    ctx.lineTo(px + fw * 0.8, py + fh * 0.5 + Math.sin(t * 5 + 4) * fh * 0.15);
    for (let k = 4; k >= 0; k--) ctx.lineTo(px + fw * k / 4, py + fh + Math.sin(t * 5 + k) * fh * 0.15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // wear: a few cracks, more as dmg rises
  const cracks = Math.round(Math.max(0, Math.min(1, dmg)) * 4);
  ctx.strokeStyle = 'rgba(20,10,4,0.8)'; ctx.lineWidth = Math.max(1, lw);
  for (let i = 0; i < cracks; i++) {
    let x = cx - w / 2 + w * (0.18 + 0.21 * i), y = top + 1;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 1; j <= 3; j++) { x += (j % 2 ? 1 : -1) * w * 0.03; y += h / 3; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}

// Bomb: shaded iron sphere, steel cap, sparking fuse. Rank: 2+ a riveted
// metal band, 3+ a second band, 4+ a gold cap, 5+ glowing runes.
function unBomb(ctx, s, t, bob, rank) {
  ctx.translate(0, bob);
  const R = s * 0.34, cy = s * 0.08;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, cy + R + 3, R * 0.85, 5, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(-R * 0.35, cy - R * 0.4, R * 0.1, 0, cy, R);
  g.addColorStop(0, '#6c6488'); g.addColorStop(0.55, '#2c2540'); g.addColorStop(1, '#120c1e');
  ctx.fillStyle = g; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, cy, R, 0, 7); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, cy, R - 1, 0, 7); ctx.clip();
  if (rank < 2) {
    ctx.fillStyle = 'rgba(255,138,61,0.85)';
    ctx.fillRect(-R, cy + R * 0.18, 2 * R, R * 0.2);
  } else {
    const bands = rank >= 3 ? [R * 0.18, -R * 0.42] : [R * 0.18];
    for (const by of bands) {
      const bg = ctx.createLinearGradient(0, cy + by, 0, cy + by + R * 0.22);
      bg.addColorStop(0, rankMetal(rank)); bg.addColorStop(1, unMetalDark(rank));
      ctx.fillStyle = bg;
      ctx.fillRect(-R, cy + by, 2 * R, R * 0.22);
      ctx.fillStyle = '#1a1424';
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * R * 0.36, cy + by + R * 0.11, Math.max(1, R * 0.05), 0, 7); ctx.fill(); }
    }
    if (rank >= 5) {
      ctx.fillStyle = `rgba(255,154,230,${0.55 + 0.45 * Math.sin(t * 4)})`;
      for (const rx of [-0.45, 0, 0.45]) {
        const x = rx * R, y = cy - R * 0.08, r = R * 0.12;
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y); ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(-R * 0.38, cy - R * 0.4, R * 0.18, R * 0.28, -0.6, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(R * 0.45, cy - R * 0.82); ctx.rotate(0.6);
  const cg = ctx.createLinearGradient(-R * 0.22, 0, R * 0.22, 0);
  cg.addColorStop(0, rank >= 4 ? '#fff3a8' : '#c9d0dc'); cg.addColorStop(1, rank >= 4 ? '#a8740c' : '#5d6676');
  ctx.fillStyle = cg; ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-R * 0.22, -R * 0.14, R * 0.44, R * 0.28, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  const fx0 = R * 0.6, fy0 = cy - R, fx1 = R * 0.75, fy1 = cy - R * 1.55;
  ctx.strokeStyle = '#c8a06a'; ctx.lineWidth = 3; ctx.setLineDash([3, 2]);
  ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.quadraticCurveTo(R * 1.05, cy - R * 1.25, fx1, fy1); ctx.stroke();
  ctx.setLineDash([]);
  const sp = 0.7 + 0.3 * Math.sin(t * 25);
  const sg = ctx.createRadialGradient(fx1, fy1, 0, fx1, fy1, 12 * sp);
  sg.addColorStop(0, 'rgba(255,255,230,1)'); sg.addColorStop(0.4, 'rgba(255,200,60,0.85)'); sg.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(fx1, fy1, 12 * sp, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    const a = k * 1.047 + t * 7, l = 5 + 4 * ((Math.sin(t * 31 + k * 3) + 1) / 2);
    ctx.beginPath();
    ctx.moveTo(fx1 + Math.cos(a) * 4, fy1 + Math.sin(a) * 4);
    ctx.lineTo(fx1 + Math.cos(a) * (4 + l), fy1 + Math.sin(a) * (4 + l));
    ctx.stroke();
  }
}

function unShieldPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.quadraticCurveTo(s * 0.36, -s * 0.36, s * 0.34, -s * 0.12);
  ctx.quadraticCurveTo(s * 0.3, s * 0.3, 0, s * 0.46);
  ctx.quadraticCurveTo(-s * 0.3, s * 0.3, -s * 0.34, -s * 0.12);
  ctx.quadraticCurveTo(-s * 0.36, -s * 0.36, 0, -s * 0.42);
}

// Shield: steel rim, blue face with a moving shine, gold gate emblem.
// Rank: 2+ rim in rank metal, 3+ small wings, 5+ a violet face and a gem.
function unShield(ctx, s, t, rank) {
  if (rank >= 3) { // wings behind the rim
    const flap = Math.sin(t * 3) * 0.12;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd, 1); ctx.rotate(flap);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k === 0 ? '#ffffff' : '#dfe8f5'; ctx.strokeStyle = '#1c2a3e'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.26, -s * 0.2 + k * s * 0.1);
        ctx.quadraticCurveTo(s * 0.5, -s * 0.36 + k * s * 0.12, s * (0.66 - k * 0.08), -s * 0.3 + k * s * 0.16);
        ctx.quadraticCurveTo(s * 0.46, -s * 0.12 + k * s * 0.12, s * 0.26, -s * 0.04 + k * s * 0.1);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.save();
  ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 18 * (0.6 + 0.4 * Math.sin(t * 3));
  const rim = ctx.createLinearGradient(-s * 0.35, -s * 0.4, s * 0.35, s * 0.45);
  rim.addColorStop(0, '#f4f8ff'); rim.addColorStop(0.5, rank >= 2 ? rankMetal(rank) : '#9fb0c6'); rim.addColorStop(1, unMetalDark(rank));
  ctx.fillStyle = rim; ctx.strokeStyle = '#1c2a3e'; ctx.lineWidth = 2.5;
  unShieldPath(ctx, s); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.scale(0.78, 0.78); ctx.translate(0, s * 0.02);
  const face = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.45);
  face.addColorStop(0, rank >= 5 ? '#e08aff' : '#5cc4ff'); face.addColorStop(1, rank >= 5 ? '#4a1a86' : '#1b4a86');
  ctx.fillStyle = face;
  unShieldPath(ctx, s); ctx.fill();
  ctx.clip();
  const sx = ((t * 0.6) % 1.6) * s * 1.4 - s * 0.8;
  ctx.rotate(0.35);
  const shg = ctx.createLinearGradient(sx - s * 0.15, 0, sx + s * 0.15, 0);
  shg.addColorStop(0, 'rgba(255,255,255,0)'); shg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); shg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shg;
  ctx.fillRect(sx - s * 0.15, -s, s * 0.3, 2 * s);
  ctx.restore();
  const ew = s * 0.13, eh = s * 0.2;
  ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-ew, eh * 0.6); ctx.lineTo(-ew, -eh * 0.1); ctx.arc(0, -eh * 0.1, ew, Math.PI, 0); ctx.lineTo(ew, eh * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1b4a86';
  ctx.beginPath();
  ctx.moveTo(-ew * 0.45, eh * 0.6); ctx.lineTo(-ew * 0.45, 0); ctx.arc(0, 0, ew * 0.45, Math.PI, 0); ctx.lineTo(ew * 0.45, eh * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6eef8';
  for (const [rx, ry] of [[-0.31, -0.18], [0.31, -0.18], [0, -0.37], [-0.2, 0.25], [0.2, 0.25]]) {
    ctx.beginPath(); ctx.arc(rx * s, ry * s, Math.max(1, s * 0.03), 0, 7); ctx.fill();
  }
  if (rank >= 5) { // prism gem at the top of the rim
    ctx.fillStyle = `hsl(${(t * 90) % 360},100%,72%)`; ctx.strokeStyle = '#2a0a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.47); ctx.lineTo(s * 0.06, -s * 0.38); ctx.lineTo(0, -s * 0.29); ctx.lineTo(-s * 0.06, -s * 0.38); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
}

// One unit's art centred at (x, y), s = portrait size. bob = vertical sway;
// rank defaults to the unit's current Armory rank.
export function drawUnitArt(ctx, unit, x, y, s, t, bob = 0, rank = unitRanks[unit] || 1) {
  ctx.save();
  ctx.translate(x, y);
  switch (unit) {
    case 'angel': unSprite(ctx, s, t, bob, rank); break;
    case 'wall': drawStoneWall(ctx, 0, s * 0.12, s * 1.15, s * 0.4, t, 0, rank); break;
    case 'bomb': unBomb(ctx, s, t, bob, rank); break;
    case 'shield': unShield(ctx, s, t, rank); break;
  }
  ctx.restore();
}
