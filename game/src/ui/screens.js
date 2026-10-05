// Gamified dialogs — ribbon titles, glowing cards, star ratings, pulsing buttons.
// Fonts: 'Luckiest Guy' (titles) + 'Fredoka' (body), embedded free game fonts.
import { CONFIG } from '../config.js';
import { COIN_PACKS } from '../data/shop.js';
import { LEVELS, STAGE_SIZE, STAGE_COUNT, STAGE_THEMES } from '../data/levels.js';
import { UNITS, UNIT_ORDER, unitLevel, statCost, statLabel, unitTotalLevel } from '../data/upgrades.js';

export const GAME_VERSION = 'v3.1 — GateWall';
export const F_TITLE = '"Luckiest Guy", "Arial Black", Arial';
export const F_BODY = '"Fredoka", "Trebuchet MS", Arial';

const W = CONFIG.width, H = CONFIG.height;

// --- Themed environment art — tall gameplay backgrounds (one per stage
// theme) plus a single continuous treasure-map-style world background used
// for the whole stage route map. Loaded async; every drawImage call below
// checks readiness and falls back to the existing vector art until it lands.
// Names are looked up by index into STAGE_THEMES (stage order), NOT baked
// into the filename — so a stage can be inserted/reordered without renaming
// any art files on disk.
// Island tile art (island_road_*.png) for these 12 is AI-generated stage
// artwork (user-supplied, own generation) matched index-for-index to
// STAGE_THEMES in data/levels.js. No bg_*.jpg exists for these yet, so
// renderBackground() in main.js falls back to the sky gradient — expected.
const ENV_THEMES = [
  'abyssal_rift', 'glacial_peak', 'oasis_citadel', 'crystallized_forest',
  'draconic_peaks', 'gilded_aviary', 'abyssal_forest', 'aetherial_gardens',
  'clockwork_city', 'spectral_jungle', 'crown_mountain_king', 'the_deepwood',
];
export const BG_IMAGES = [];
ENV_THEMES.forEach((n, i) => {
  const bgImg = new Image();
  bgImg.src = `assets/env/bg_${n}.jpg`;
  bgImg.onload = () => { BG_IMAGES[i] = bgImg; };
});
// Floating rock islands used as the stage markers on the route map —
// transparent background (no big color-disc backdrop), chunky rock body +
// themed terrain top + small props + a dangling rock chunk, one per stage
// theme. Transparent art (vs. the old circular photo badges) is what lets
// them sit close on the map without reading as overlapping colored circles.
export const TILE_IMAGES = [];
ENV_THEMES.forEach((n, i) => {
  const tileImg = new Image();
  tileImg.src = `assets/env/island_road_${n}.png`;
  tileImg.onload = () => { TILE_IMAGES[i] = tileImg; };
  tileImg.onerror = () => { console.error('[TILE_IMAGES] failed to load', tileImg.src); };
});

// Real Kenney "Fish Pack 2.0" sprites (CC0) used to animate the Sea War
// gameplay background — rising bubbles, swaying seaweed, drifting fish —
// instead of the static baked-in decor.
const KENNEY_SEA_NAMES = [
  'bubble_a', 'bubble_b', 'bubble_c',
  'seaweed_green_a', 'seaweed_green_c', 'seaweed_orange_a', 'seaweed_pink_b', 'seaweed_grass_a',
  'fish_blue', 'fish_orange', 'fish_pink',
];
export const KENNEY_SEA = {};
KENNEY_SEA_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/env/kenney_sea/${n}.png`;
  img.onload = () => { KENNEY_SEA[n] = img; };
});

// Real Kenney "Pirate Kit" renders (CC0) — actual ship art for the Sea War
// ships (instead of a drawn hull), plus rocks/palm/flag used as hilltop
// scenery in the composited background.
const KENNEY_PIRATE_NAMES = [
  'ship-pirate-medium', 'ship-pirate-small', 'ship-medium',
  'rocks-a', 'rocks-sand-a', 'palm-detailed-bend', 'flag-pirate-high', 'barrel', 'crate',
];
export const KENNEY_PIRATE = {};
KENNEY_PIRATE_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/env/kenney_pirate/${n}.png`;
  img.onload = () => { KENNEY_PIRATE[n] = img; };
});

// Real Kenney "Castle Kit" renders (CC0) — actual tower/wall/flag/siege art
// used as fixed landmarks in the Castle stage's gameplay background.
const KENNEY_CASTLE_NAMES = [
  'tower-square', 'tower-square-roof', 'tower-square-top-roof',
  'wall-corner-half-tower', 'wall-corner-half', 'gate', 'metal-gate',
  'flag-banner-long', 'flag', 'flag-pennant',
  'rocks-large', 'siege-catapult', 'siege-ballista',
];
export const KENNEY_CASTLE = {};
KENNEY_CASTLE_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/env/kenney_castle/${n}.png`;
  img.onload = () => { KENNEY_CASTLE[n] = img; };
});

// Real low-poly desert plant renders (CraftPix, free license) — rendered
// from the pack's 3D models to flat-shaded 2D PNGs (see gen scripts), used
// as scattered scenery in the Desert Storm stage's gameplay background.
const DESERT_PLANT_NAMES = [
  'saguaro', 'prickly_pear', 'barrel_twin', 'spiny_barrel', 'thorn_column', 'tumbleweed', 'blossom_cactus',
];
export const DESERT_PLANTS = {};
DESERT_PLANT_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/env/desert_plants/${n}.png`;
  img.onload = () => { DESERT_PLANTS[n] = img; };
});

// User-supplied AI-generated ice/glacial art (own generation, no copyright
// concerns) — real frosted trees, crystal clusters, an ice golem sentinel,
// and an ice-crystal-inset wall, used as scenery in the Glacial Peak
// (Stage 1) gameplay background instead of the old drawn mountain icons.
const ICE_GLACIAL_NAMES = [
  'dead_tree', 'pine_tree', 'ice_bush', 'ice_golem',
  'ice_wall', 'ice_wall_crystal1', 'ice_wall_crystal2', 'ice_gate',
  'ice_rocks_small', 'ice_rocks_large',
  'crystal_small', 'crystal_medium', 'crystal_large',
];
export const ICE_GLACIAL = {};
ICE_GLACIAL_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/env/ice_glacial/${n}.png`;
  img.onload = () => { ICE_GLACIAL[n] = img; };
});

// User-supplied AI-generated flying-bat frames (own generation, no
// copyright concerns) — a 10-pose wing-flap cycle used to animate the
// flying "imp" enemy instead of the old single static SVG, so it actually
// looks alive in the air rather than gliding rigidly.
export const BAT_FRAME_COUNT = 10;
export const BAT_FRAMES = [];
for (let i = 0; i < BAT_FRAME_COUNT; i++) {
  const img = new Image();
  img.src = `assets/sprites/bat_ice/bat_${String(i).padStart(2, '0')}.png`;
  img.onload = () => { BAT_FRAMES[i] = img; };
}

// User-supplied cannon art (own generation, no copyright concerns) — a
// 4-frame fire cycle (idle, charging glow, muzzle blast, drifting smoke)
// used for the placeable Turret weapon instead of the old drawn grey disc.
const CANNON_NAMES = ['idle', 'glow', 'fire', 'smoke'];
export const CANNON_FRAMES = {};
CANNON_NAMES.forEach((n) => {
  const img = new Image();
  img.src = `assets/sprites/cannon/cannon_${n}.png`;
  img.onload = () => { CANNON_FRAMES[n] = img; };
});

function star(ctx, x, y, r, fill = '#ffd23d', rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#2a1f4d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// Faceted crystal shard — the brand motif for GateWall. Used as menu/
// panel decoration in place of the old plain stars, with an inner facet
// line and a small glint highlight so it reads as a cut gem, not a diamond
// playing-card suit.
function crystal(ctx, x, y, r, fill = '#7fd8ff', rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.62, -r * 0.28);
  ctx.lineTo(r * 0.38, r);
  ctx.lineTo(-r * 0.38, r);
  ctx.lineTo(-r * 0.62, -r * 0.28);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // inner facet line
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r * 0.7);
  ctx.stroke();
  // glint
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.16, r * 0.09, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Small themed silhouette per environment (keyed by the level's `decor`
// field, which already maps 1:1 to an environment). Used both as the Stage
// Map's node icon (small, r~15) and, scaled up, as gameplay-background
// scenery (see main.js drawLandmark) — one place defines what each biome
// "looks like" so the map and the actual level read as the same place.
export function envIcon(ctx, cx, cy, r, decorKey, t = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  switch (decorKey) {
    case 'fireflies': // Enchanted Forest — a little pine tree
      ctx.fillStyle = '#2f6b3a';
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, r * 0.3); ctx.lineTo(-r * 0.8, r * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(-r * 0.12, r * 0.3, r * 0.24, r * 0.5);
      break;
    case 'crystals': // Crystal Caves — a cut gem cluster
      crystal(ctx, 0, 0, r, '#9a7bff', 0);
      break;
    case 'banners': // Castle — a stone tower with a waving banner
      ctx.fillStyle = '#6a6a76';
      ctx.fillRect(-r * 0.42, -r * 0.15, r * 0.84, r * 1.15);
      ctx.fillStyle = '#4a4a56';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-r * 0.42 + i * r * 0.32, -r * 0.42, r * 0.22, r * 0.3);
      }
      ctx.fillStyle = '#a8302a';
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r * 0.42); ctx.lineTo(r * 0.05, r * 0.15);
      ctx.lineTo(r * 0.4 + Math.sin(t * 3) * r * 0.08, r * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.55); ctx.lineTo(r * 0.05, r * 0.15); ctx.stroke();
      break;
    case 'bubbles': // Sea War — a little ship hull + sail
      ctx.fillStyle = '#1c3a5c';
      ctx.beginPath(); ctx.moveTo(-r, r * 0.4); ctx.lineTo(r, r * 0.4); ctx.lineTo(r * 0.7, r * 0.9); ctx.lineTo(-r * 0.7, r * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8f9ff';
      ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.lineTo(0, -r); ctx.lineTo(r * 0.7, r * 0.3); ctx.closePath(); ctx.fill();
      break;
    case 'sand': // Desert Storm — a dune + sun
      ctx.fillStyle = '#ffd88a';
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98a3d';
      ctx.beginPath(); ctx.ellipse(0, r * 0.5, r, r * 0.4, 0, Math.PI, Math.PI * 2); ctx.fill();
      break;
    case 'snow': // Ice Peaks — a jagged mountain
      ctx.fillStyle = '#cfe0ee';
      ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(-r * 0.2, -r); ctx.lineTo(r * 0.3, -r * 0.2); ctx.lineTo(r, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(r * 0.05, -r * 0.55); ctx.lineTo(-r * 0.4, -r * 0.5); ctx.closePath(); ctx.fill();
      break;
    case 'embers': // Lava Peaks — a volcano with a puff of smoke
      ctx.fillStyle = '#4a2018';
      ctx.beginPath(); ctx.moveTo(-r, r * 0.6); ctx.lineTo(0, -r * 0.7); ctx.lineTo(r, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(180,180,190,${0.4 + 0.3 * Math.sin(t)})`;
      ctx.beginPath(); ctx.arc(r * 0.2, -r * 1.15 - Math.sin(t) * 3, r * 0.28, 0, Math.PI * 2); ctx.fill();
      break;
    case 'spores': // Haunted Swamp — a bare dead tree
      ctx.strokeStyle = '#3a4a2e'; ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, -r * 0.2);
      ctx.lineTo(-r * 0.6, -r * 0.8); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 0.6, -r * 0.9);
      ctx.stroke();
      break;
    case 'clouds': // Sky War — a floating island
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.1); ctx.lineTo(r, -r * 0.1); ctx.lineTo(r * 0.5, r * 0.6); ctx.lineTo(-r * 0.5, r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a8a3a';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'rain': // Storm Realm — a dark cloud bank with a lightning bolt
      ctx.fillStyle = '#3a3a4a';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(-r * 0.2, r * 0.5); ctx.lineTo(r * 0.05, r * 0.4); ctx.lineTo(-r * 0.15, r); ctx.lineTo(r * 0.35, r * 0.3); ctx.lineTo(r * 0.1, r * 0.35); ctx.closePath(); ctx.fill();
      break;
    case 'voidstars': // Shadow Realm — a broken ruined pillar
      ctx.fillStyle = '#3a2a52';
      ctx.fillRect(-r * 0.3, -r, r * 0.6, r * 1.6);
      ctx.fillStyle = '#1a0d2a';
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r); ctx.lineTo(r * 0.1, -r * 0.6); ctx.lineTo(r * 0.3, -r); ctx.closePath(); ctx.fill();
      break;
    default:
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Gamified dialog card: dim → glowing card → ribbon title → body → pulsing button
function panel(ctx, title, lines, footer, accent = '#ffd23d', stars = -1) {
  const t = performance.now() / 1000;

  // dim the world
  ctx.fillStyle = 'rgba(8,4,20,0.72)';
  ctx.fillRect(0, 0, W, H);

  const cardX = 28, cardY = 160, cardW = W - 56, cardH = 380;

  // glow behind card
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = 34;

  // card body
  const grad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  grad.addColorStop(0, '#332457');
  grad.addColorStop(1, '#1c1238');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 26);
  ctx.fill();
  ctx.restore();

  // border (double line = fancy)
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 26); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(cardX + 7, cardY + 7, cardW - 14, cardH - 14, 20); ctx.stroke();

  // ribbon banner
  const ribW = Math.min(cardW + 40, 330), ribH = 62, ribY = cardY - ribH / 2;
  const ribX = W / 2 - ribW / 2;
  ctx.fillStyle = '#a8302a';
  ctx.beginPath(); // ribbon tails
  ctx.moveTo(ribX - 22, ribY + 8); ctx.lineTo(ribX + 10, ribY + ribH / 2); ctx.lineTo(ribX - 22, ribY + ribH - 8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ribX + ribW + 22, ribY + 8); ctx.lineTo(ribX + ribW - 10, ribY + ribH / 2); ctx.lineTo(ribX + ribW + 22, ribY + ribH - 8);
  ctx.closePath(); ctx.fill();
  const ribGrad = ctx.createLinearGradient(0, ribY, 0, ribY + ribH);
  ribGrad.addColorStop(0, '#e0483d');
  ribGrad.addColorStop(1, '#b23028');
  ctx.fillStyle = ribGrad;
  ctx.beginPath(); ctx.roundRect(ribX, ribY, ribW, ribH, 14); ctx.fill();
  ctx.strokeStyle = '#7a1f1a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(ribX, ribY, ribW, ribH, 14); ctx.stroke();

  // title on ribbon
  ctx.textAlign = 'center';
  ctx.font = `30px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#7a1f1a';
  ctx.lineWidth = 5;
  ctx.strokeText(title, W / 2, ribY + ribH / 2 + 11);
  ctx.fillText(title, W / 2, ribY + ribH / 2 + 11);

  // stars row (level clear rating / decoration)
  if (stars >= 0) {
    for (let i = 0; i < 3; i++) {
      const filled = i < stars;
      const wob = Math.sin(t * 3 + i) * 0.08;
      star(ctx, W / 2 + (i - 1) * 52, cardY + 64, filled ? 22 : 18, filled ? '#ffd23d' : '#4a3f6a', wob);
    }
  } else {
    crystal(ctx, cardX + 26, cardY + 26, 12, accent, Math.sin(t) * 0.3);
    crystal(ctx, cardX + cardW - 26, cardY + 26, 12, accent, -Math.sin(t) * 0.3);
  }

  // body lines
  ctx.font = `17px ${F_BODY}`;
  const startY = stars >= 0 ? cardY + 120 : cardY + 74;
  lines.forEach((l, i) => {
    if (!l) return;
    if (l.startsWith('★')) {
      ctx.fillStyle = '#ffd23d';
      ctx.font = `19px ${F_BODY}`;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `17px ${F_BODY}`;
    }
    ctx.fillText(l, W / 2, startY + i * 31);
  });

  // pulsing button
  const pulse = 1 + Math.sin(t * 4) * 0.04;
  const btnW = 220 * pulse, btnH = 54 * pulse;
  const btnY = cardY + cardH - 44;
  ctx.save();
  ctx.shadowColor = '#58e07f';
  ctx.shadowBlur = 18;
  const btnGrad = ctx.createLinearGradient(0, btnY - btnH / 2, 0, btnY + btnH / 2);
  btnGrad.addColorStop(0, '#6ef598');
  btnGrad.addColorStop(1, '#38b85f');
  ctx.fillStyle = btnGrad;
  ctx.beginPath(); ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#1d7a3c';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, btnH / 2); ctx.stroke();
  ctx.font = `22px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c';
  ctx.lineWidth = 4;
  ctx.strokeText(footer, W / 2, btnY + 9);
  ctx.fillText(footer, W / 2, btnY + 9);
}

// Hit rects for the persistent bottom navigation bar — Home, Stage Map,
// Upgrades, Settings, Top Guardians — plus the player's name header strip.
// This bar is drawn (and hit-tested) on EVERY one of those five screens, not
// just the home screen, so each destination is a real page you navigate
// directly between rather than a dialog you have to close first.
export const NAV_H = 72;
export const NAV_Y = H - NAV_H;

// Bottom nav is 4 equal-width tabs (Upgrades / Settings / Play / Ranks) — Play
// is just another tab now, not a specially-elevated floating FAB. Whichever
// tab is the CURRENTLY ACTIVE page gets raised a bit above the other three
// (see navItem()) so "selected" reads as elevation, not just a color change —
// and that applies the same way no matter which of the 4 tabs is active.
const NAV_SEG_W = W / 4;
export const MENU_BUTTONS = {
  // Header bar layout rect (avatar + name area) — no longer tappable itself;
  // renaming now happens from the Settings screen. Kept for header sizing.
  name:        { x: 0, y: 0, w: W, h: 58 },
  // Coin balance pill, top-right of the header — the only tappable part of
  // the header, opens the buy-coins shop. Sized generously to always cover
  // the pill regardless of how many digits the coin balance has.
  coins:       { x: W - 160, y: 0, w: 160, h: 58 },
  upgrades:    { x: 0,              y: NAV_Y, w: NAV_SEG_W, h: NAV_H },
  settings:    { x: NAV_SEG_W,      y: NAV_Y, w: NAV_SEG_W, h: NAV_H },
  play:        { x: NAV_SEG_W * 2,  y: NAV_Y, w: NAV_SEG_W, h: NAV_H },
  leaderboard: { x: NAV_SEG_W * 3,  y: NAV_Y, w: NAV_SEG_W, h: NAV_H },
};
// Custom vector icons (replace the old system-emoji glyphs — those render
// inconsistently across devices and read as flat/generic against the rest
// of the game's hand-drawn fantasy-UI look). Each takes a center point +
// radius-ish size and a fill color, and draws with a matching dark stroke
// so they sit on the nav bar the same way weapon/HUD icons do.
function drawBoltIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.85);
  ctx.lineTo(-s * 0.55, s * 0.12);
  ctx.lineTo(-s * 0.05, s * 0.12);
  ctx.lineTo(-s * 0.18, s * 0.85);
  ctx.lineTo(s * 0.55, -s * 0.12);
  ctx.lineTo(s * 0.02, -s * 0.12);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawGearIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  const teeth = 8, rOuter = s * 0.85, rInner = s * 0.6, rHole = s * 0.32;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * 2 * i) / (teeth * 2);
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#140c28';
  ctx.beginPath(); ctx.arc(0, 0, rHole, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTrophyIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 1.4;
  // cup
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.75);
  ctx.lineTo(s * 0.5, -s * 0.75);
  ctx.quadraticCurveTo(s * 0.5, s * 0.05, 0, s * 0.15);
  ctx.quadraticCurveTo(-s * 0.5, s * 0.05, -s * 0.5, -s * 0.75);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // handles
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.6);
  ctx.quadraticCurveTo(-s * 0.95, -s * 0.55, -s * 0.55, -s * 0.1);
  ctx.moveTo(s * 0.5, -s * 0.6);
  ctx.quadraticCurveTo(s * 0.95, -s * 0.55, s * 0.55, -s * 0.1);
  ctx.stroke();
  // stem + base
  ctx.beginPath(); ctx.rect(-s * 0.08, s * 0.15, s * 0.16, s * 0.22); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-s * 0.32, s * 0.37, s * 0.64, s * 0.14, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawPlayIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.75);
  ctx.lineTo(-s * 0.5, s * 0.75);
  ctx.lineTo(s * 0.75, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const NAV_ITEMS = [
  { key: 'upgrades', draw: drawBoltIcon, label: 'UPGRADES', accent: '#ff8a3d' },
  { key: 'settings', draw: drawGearIcon, label: 'SETTINGS', accent: '#9ae6ff' },
  { key: 'play', draw: drawPlayIcon, label: 'PLAY', accent: '#7fd8ff' },
  { key: 'leaderboard', draw: drawTrophyIcon, label: 'RANKS', accent: '#ffd23d' },
];

// One tab-bar segment. Inactive tabs are flat: small vector icon + label,
// thin divider on the left edge (skipped for the first segment). The
// CURRENTLY ACTIVE tab — whichever of the 4 that is, including PLAY — gets
// raised above the bar as a glowing gem-bezel medallion instead of just a
// color change, so "selected" reads as genuine elevation no matter which
// page you're on.
function navItem(ctx, b, item, active, first, t) {
  const cx = b.x + b.w / 2;
  if (!first && !active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + 8); ctx.lineTo(b.x, b.y + b.h - 8); ctx.stroke();
  }
  if (!active) {
    item.draw(ctx, cx, b.y + 29, 13, 'rgba(255,255,255,0.6)');
    ctx.textAlign = 'center';
    ctx.font = `10px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(item.label, cx, b.y + 50);
    return;
  }

  // Raised gem-bezel medallion — same treatment for whichever tab is active,
  // sitting mostly inside the bar with just a small lift above the top edge
  // (not a big circle floating way above it).
  const r = 20 + Math.sin(t * 3) * 1;
  const cy = NAV_Y + 12;

  ctx.save();
  ctx.shadowColor = item.accent;
  ctx.shadowBlur = 24;
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, '#eaf9ff');
  grad.addColorStop(1, item.accent);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#e8f9ff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, Math.PI * 2); ctx.stroke();

  item.draw(ctx, cx, cy, 13, '#0d1b2a');

  crystal(ctx, cx - r - 10, cy, 4, item.accent, t * 0.8);
  crystal(ctx, cx + r + 10, cy, 4, item.accent, -t * 0.8);

  ctx.textAlign = 'center';
  ctx.font = `10px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(item.label, cx, NAV_Y + 50);
}

// The full bottom nav bar: 3 side tabs + the central elevated PLAY fab.
// `activeKey` matches one of NAV_ITEMS[].key, or 'play', so the current
// page's tab can be highlighted. Background is now a themed gradient with a
// faint diamond-facet texture instead of flat near-black, to match the rest
// of the game's crystal/gem-toned UI instead of reading as generic app chrome.
export function drawBottomNav(ctx, activeKey) {
  const t = performance.now() / 1000;

  ctx.save();
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 14;
  const barGrad = ctx.createLinearGradient(0, NAV_Y, 0, H);
  barGrad.addColorStop(0, 'rgba(34,22,64,0.97)');
  barGrad.addColorStop(1, 'rgba(14,9,28,0.98)');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, NAV_Y, W, NAV_H);
  ctx.restore();

  // Faint repeating diamond-facet texture across the bar — subtle, reads as
  // cut-crystal/gem material rather than a plain flat panel.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#9ae6ff';
  ctx.lineWidth = 1;
  const step = 26;
  for (let x = -NAV_H; x < W + NAV_H; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, NAV_Y);
    ctx.lineTo(x + NAV_H, H);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = '#7fd8ff';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(127,216,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, NAV_Y); ctx.lineTo(W, NAV_Y); ctx.stroke();
  ctx.restore();

  // Draw inactive tabs first, then the active one last so its raised
  // medallion (which pokes up and slightly overlaps its neighbors) always
  // renders on top of the flat tabs beside it.
  NAV_ITEMS.forEach((item, i) => {
    if (item.key !== activeKey) navItem(ctx, MENU_BUTTONS[item.key], item, false, i === 0, t);
  });
  NAV_ITEMS.forEach((item, i) => {
    if (item.key === activeKey) navItem(ctx, MENU_BUTTONS[item.key], item, true, i === 0, t);
  });
}

// Shared full-page background + header for the four nav-bar destinations
// (Map/Upgrades/Settings/Ranks). Fills edge-to-edge from the top down to the
// nav bar — a real page, not a dimmed dialog floating over the game.
export function pageShell(ctx, title, accent) {
  const grad = ctx.createLinearGradient(0, 0, 0, NAV_Y);
  grad.addColorStop(0, '#241a42');
  grad.addColorStop(1, '#140c28');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, NAV_Y);

  ctx.fillStyle = 'rgba(16,10,32,0.55)';
  ctx.fillRect(0, 0, W, 50);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(W, 50); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = `22px ${F_TITLE}`;
  ctx.fillStyle = accent;
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 4;
  ctx.strokeText(title, W / 2, 34);
  ctx.fillText(title, W / 2, 34);
}

// Home-page layout. The stage map now always occupies the full area below
// the logo (it's no longer squeezed by the continue card, since that card
// is a big overlay dialog now — see renderMenu) — and main.js needs these
// exact same node rects for tap hit-testing.
const HOME_LOGO_BOTTOM = 92;
const HOME_STAGE_TOP = 148;
// Gentle left/right stagger (like a chain of floating islands on a lazy
// diagonal route) instead of a sharp switchback — was 108, which combined
// with the old tighter vertical spacing made the path zigzag hard enough to
// feel cluttered. A softer amplitude reads calmer without losing the "wide
// chain of islands" feel.
const NODE_ZIGZAG = 68;

// Node spacing/size is fixed to what looks good for a reference viewport,
// regardless of how many stages actually exist — this is what makes
// scrolling necessary (and correct) once a 6th+ stage is added, instead of
// silently cramming every node into the same box until they're unreadable.
// Was 5 (too many stages crammed into one screen, cramped/cluttered feel) —
// fewer stages per screenful means each one gets noticeably more breathing
// room, at the cost of a bit more scrolling to see the whole map.
const REFERENCE_VIEWPORT_STAGES = 3.6;

export function homeLayout(scrollY = 0) {
  const stageTop = HOME_STAGE_TOP;
  const stageBottom = NAV_Y - 26;
  const avail = Math.max(0, stageBottom - stageTop);
  const spacing = avail / REFERENCE_VIEWPORT_STAGES;
  // "size" is a hit-test/collision reference, deliberately smaller than the
  // island artwork itself is drawn (see drawStageNode's TILE_DRAW_SCALE) —
  // keeping it modest is what leaves visible gaps between consecutive nodes.
  const size = Math.max(50, Math.min(66, spacing * 0.62));
  const contentHeight = spacing * STAGE_COUNT;
  const scrollMax = Math.max(0, contentHeight - avail);
  const sy = Math.max(0, Math.min(scrollMax, scrollY));
  const nodes = Array.from({ length: STAGE_COUNT }, (_, i) => {
    // Alternate left/right around center, easing the outermost nodes in a
    // touch so nothing clips the screen edges.
    const dir = i % 2 === 0 ? -1 : 1;
    const amp = NODE_ZIGZAG * (i === 0 || i === STAGE_COUNT - 1 ? 0.7 : 1);
    return {
      cx: W / 2 + dir * amp,
      cy: stageTop + spacing * (i + 0.5) - sy,
      size,
    };
  });
  // Exact square tile bounds, reused by main.js for tap hit-testing.
  const rows = nodes.map((n) => ({ x: n.cx - n.size / 2, y: n.cy - n.size / 2, w: n.size, h: n.size }));
  return { stageTop, stageBottom, nodes, rows, scrollMax, scrollY: sy };
}

// The continue dialog is now the SAME big overlay style as the level-clear/
// victory/game-over screens (see `panel()`) — same card size, same dim
// background, floating right over the stage map — just with a close X added
// so it isn't a hard blocker. These match panel()'s own card geometry
// exactly so main.js can hit-test taps against it.
const PANEL_CARD = { x: 28, y: 160, w: W - 56, h: 380 };
export const CONTINUE_CARD_RECT = PANEL_CARD;
export const CONTINUE_CLOSE_BUTTON = {
  x: PANEL_CARD.x + PANEL_CARD.w - 42, y: PANEL_CARD.y + 10, w: 32, h: 32,
};
// The pulsing "CONTINUE"/"TAP TO PLAY" pill drawn by panel() — geometry
// matches its base (non-pulsing) size/position exactly so main.js can
// hit-test taps against the actual button instead of the whole card.
export const CONTINUE_PLAY_BUTTON = {
  x: W / 2 - 110, y: PANEL_CARD.y + PANEL_CARD.h - 44 - 27, w: 220, h: 54,
};

// A single flat stepping-stone — a chunky rounded-hexagon rock (matching
// the reference: flat brown top, dark outline, soft pale glow/mist sitting
// underneath it) rather than a plain dot. Reached stones glow warm gold;
// unreached ones sit dim and grey so progress reads at a glance.
function drawStone(ctx, cx, cy, r, reached, seed) {
  // soft pale "mist" ring under the stone, like it's resting on cloud/water
  ctx.save();
  ctx.globalAlpha = reached ? 0.5 : 0.32;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.28, r * 1.35, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // irregular flat-topped hexagon-ish rock silhouette
  const n = 7;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const wob = 0.82 + 0.18 * Math.sin(seed + i * 2.1);
    pts.push([cx + Math.cos(a) * r * wob, cy + Math.sin(a) * r * wob * 0.82]);
  }
  ctx.save();
  if (reached) { ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 8; }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = reached ? '#a9642f' : '#6b5648';
  ctx.fill();
  ctx.strokeStyle = reached ? '#5c3418' : '#372a22';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // lighter top-facet highlight for a touch of volume
  ctx.fillStyle = reached ? 'rgba(255,214,140,0.55)' : 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.15, cy - r * 0.22, r * 0.45, r * 0.28, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// The route between islands — a little path of stepping stones (like the
// reference) instead of a plain dotted line or rope bridge. The name/stars
// are now plain arced text with no background plaque (see drawStageNode),
// so there's nothing left for the stones to collide with — the path runs
// straight through, unbroken, stage to stage.
function drawStonePath(ctx, a, b, reached, pathIdx) {
  const x0 = a.cx, y0 = a.cy, x1 = b.cx, y1 = b.cy;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const px = -dy / len, py = dx / len; // perpendicular, for a little zigzag
  // Fewer stones spaced further apart, with a gentler wobble (was step 30 /
  // amplitude 7) — the denser path was a big part of what made the map read
  // as cluttered, especially with the sharper zigzag it used to sit inside.
  const step = 42;
  const count = Math.max(2, Math.round(len / step));
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const wobble = Math.sin(t * Math.PI * 2 + pathIdx) * 5;
    const x = x0 + dx * t + px * wobble;
    const y = y0 + dy * t + py * wobble;
    const r = 8 + ((i + pathIdx) % 2) * 2;
    drawStone(ctx, x, y, r, reached, pathIdx * 3 + i);
  }
}

function drawStagePath(ctx, nodes, furthestLevelIndex) {
  const furthestStage = Math.min(STAGE_COUNT - 1, Math.floor(furthestLevelIndex / STAGE_SIZE));
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    drawStonePath(ctx, a, b, i < furthestStage, i);
  }
}

// Flat sky backdrop for the stage map — light blue gradient with a few
// bold, flat-shaded clouds, echoing the reference layout's sky (instead of
// an ocean/ground image), consistent with the flat-badge island style.
function drawOceanBackdrop(ctx, top, bottom, t) {
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, '#8fd8f0');
  grad.addColorStop(1, '#c9ecf7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, W, bottom - top);

  // Fewer, softer clouds than before (was 10 at 0.85 alpha) — this is sky
  // dressing behind the islands/path, not the focal point, so it should
  // stay quiet instead of competing for attention.
  for (let i = 0; i < 6; i++) {
    const h1 = Math.sin(i * 12.9898) * 43758.5453; const rx = h1 - Math.floor(h1);
    const h2 = Math.sin(i * 78.233) * 12543.789; const ry = h2 - Math.floor(h2);
    const x = ((rx * W + t * 6 * (1 + (i % 3))) % (W + 80)) - 40;
    const y = top + ry * (bottom - top);
    const s = 15 + (i % 3) * 5;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(x - s * 0.7, y + s * 0.15, s * 0.65, s * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(x + s * 0.7, y + s * 0.1, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Stage-tile hero creatures ---------------------------------------
// One small, characterful critter per stage theme — drawn as vector art
// (no image assets to fetch/inline, so it works everywhere the rest of the
// game's canvas art does) but with enough shading/detail to read as a real
// mascot rather than an icon. Each is centered at (cx,cy) and scaled to s
// (roughly the tile size).

function drawFishCreature(ctx, cx, cy, s, t) {
  const wag = Math.sin(t * 4) * 0.35;
  ctx.save();
  ctx.translate(cx, cy);
  // tail
  ctx.save();
  ctx.rotate(wag * 0.5);
  ctx.fillStyle = '#3d9fd6';
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, 0);
  ctx.lineTo(-s * 0.56, -s * 0.22);
  ctx.lineTo(-s * 0.56, s * 0.22);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // body
  const bodyGrad = ctx.createLinearGradient(-s * 0.3, -s * 0.25, s * 0.3, s * 0.25);
  bodyGrad.addColorStop(0, '#bdf3ff'); bodyGrad.addColorStop(0.55, '#4fc3e8'); bodyGrad.addColorStop(1, '#1f7fb3');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.34, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // dorsal fin
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath();
  ctx.moveTo(-s * 0.02, -s * 0.22); ctx.lineTo(s * 0.1, -s * 0.4); ctx.lineTo(s * 0.2, -s * 0.2);
  ctx.closePath(); ctx.fill();
  // stripes
  ctx.strokeStyle = 'rgba(20,60,90,0.35)'; ctx.lineWidth = s * 0.03;
  for (const dx of [-0.08, 0.06, 0.2]) {
    ctx.beginPath(); ctx.moveTo(s * dx, -s * 0.2); ctx.lineTo(s * dx, s * 0.2); ctx.stroke();
  }
  // eye
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.03, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath(); ctx.arc(s * 0.245, -s * 0.03, s * 0.038, 0, Math.PI * 2); ctx.fill();
  // little bubbles
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let k = 0; k < 2; k++) {
    const by = -s * 0.4 - ((t * 20 + k * 14) % (s * 0.5));
    ctx.beginPath(); ctx.arc(s * (0.3 + k * 0.12), by, s * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawParrotCreature(ctx, cx, cy, s, t) {
  const flap = Math.sin(t * 5) * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  // tail feathers
  ctx.strokeStyle = '#4fd66a'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.1); ctx.quadraticCurveTo(-s * 0.35, s * 0.3, -s * 0.4, s * 0.55); ctx.stroke();
  ctx.strokeStyle = '#3aa8ff';
  ctx.beginPath(); ctx.moveTo(0, s * 0.14); ctx.quadraticCurveTo(-s * 0.15, s * 0.4, -s * 0.12, s * 0.6); ctx.stroke();
  // wing
  ctx.save();
  ctx.rotate(flap);
  ctx.fillStyle = '#2fae53';
  ctx.beginPath();
  ctx.ellipse(s * 0.02, s * 0.02, s * 0.22, s * 0.15, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5c3d';
  ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.06, s * 0.09, s * 0.05, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // body
  const bodyGrad = ctx.createLinearGradient(-s * 0.2, -s * 0.3, s * 0.2, s * 0.2);
  bodyGrad.addColorStop(0, '#7be88a'); bodyGrad.addColorStop(1, '#2f9e50');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.24, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.26, s * 0.15, 0, Math.PI * 2); ctx.fill();
  // beak
  ctx.fillStyle = '#e0662b';
  ctx.beginPath();
  ctx.moveTo(s * 0.28, -s * 0.26); ctx.lineTo(s * 0.42, -s * 0.2); ctx.lineTo(s * 0.27, -s * 0.16);
  ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.29, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawScorpionCreature(ctx, cx, cy, s, t) {
  const curl = Math.sin(t * 2) * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  // legs
  ctx.strokeStyle = '#7a5a2e'; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k += 2) {
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.05 * j - s * 0.05, k * s * 0.1);
      ctx.lineTo(s * 0.05 * j - s * 0.02, k * s * 0.24);
      ctx.stroke();
    }
  }
  // tail (segmented, curling up)
  ctx.save();
  ctx.translate(-s * 0.2, 0);
  ctx.rotate(-0.6 + curl);
  ctx.fillStyle = '#d69b3f';
  let tx = 0, ty = 0, ang = 0;
  for (let seg = 0; seg < 4; seg++) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, s * (0.11 - seg * 0.012), s * (0.08 - seg * 0.01), ang, 0, Math.PI * 2);
    ctx.fill();
    ang -= 0.55; tx += Math.cos(ang) * s * 0.12; ty += Math.sin(ang) * s * 0.12;
  }
  ctx.fillStyle = '#8a2e2e';
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + s * 0.08, ty - s * 0.02); ctx.lineTo(tx, ty + s * 0.06); ctx.closePath(); ctx.fill();
  ctx.restore();
  // body
  const bodyGrad = ctx.createLinearGradient(-s * 0.2, -s * 0.1, s * 0.2, s * 0.15);
  bodyGrad.addColorStop(0, '#e8b96a'); bodyGrad.addColorStop(1, '#a8702f');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(s * 0.05, s * 0.02, s * 0.24, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  // pincers
  ctx.fillStyle = '#c99248';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.3, k * s * 0.14, s * 0.1, s * 0.06, k * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // eyes
  ctx.fillStyle = '#2a1a0a';
  ctx.beginPath(); ctx.arc(s * 0.12, -s * 0.03, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.02, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPenguinCreature(ctx, cx, cy, s, t) {
  const flap = Math.sin(t * 4) * 0.22;
  ctx.save();
  ctx.translate(cx, cy);
  // feet
  ctx.fillStyle = '#ff9a3d';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * s * 0.1, s * 0.36); ctx.lineTo(k * s * 0.2, s * 0.42); ctx.lineTo(k * s * 0.03, s * 0.42);
    ctx.closePath(); ctx.fill();
  }
  // body
  const bodyGrad = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.35);
  bodyGrad.addColorStop(0, '#3a3f52'); bodyGrad.addColorStop(1, '#14161f');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.28, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  // wings
  ctx.save();
  ctx.rotate(flap);
  ctx.fillStyle = '#14161f';
  ctx.beginPath(); ctx.ellipse(-s * 0.28, s * 0.02, s * 0.08, s * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(-flap);
  ctx.fillStyle = '#14161f';
  ctx.beginPath(); ctx.ellipse(s * 0.28, s * 0.02, s * 0.08, s * 0.22, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // belly
  ctx.fillStyle = '#fbfeff';
  ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.17, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = '#14161f';
  ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.16, 0, Math.PI * 2); ctx.fill();
  // beak
  ctx.fillStyle = '#ff9a3d';
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.28); ctx.lineTo(s * 0.06, -s * 0.28); ctx.lineTo(0, -s * 0.19);
  ctx.closePath(); ctx.fill();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.33, s * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.06, -s * 0.33, s * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath(); ctx.arc(-s * 0.055, -s * 0.33, s * 0.022, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.065, -s * 0.33, s * 0.022, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDragonCreature(ctx, cx, cy, s, t) {
  const glow = 0.7 + Math.sin(t * 5) * 0.3;
  ctx.save();
  ctx.translate(cx, cy);
  // horns
  ctx.fillStyle = '#3a2035';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * s * 0.14, -s * 0.22);
    ctx.quadraticCurveTo(k * s * 0.3, -s * 0.5, k * s * 0.1, -s * 0.42);
    ctx.quadraticCurveTo(k * s * 0.2, -s * 0.28, k * s * 0.05, -s * 0.16);
    ctx.closePath(); ctx.fill();
  }
  // head/skull
  const headGrad = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.28);
  headGrad.addColorStop(0, '#7a3552'); headGrad.addColorStop(1, '#3d1a2e');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.32, -s * 0.24, s * 0.3, s * 0.06);
  ctx.quadraticCurveTo(s * 0.26, s * 0.28, 0, s * 0.32);
  ctx.quadraticCurveTo(-s * 0.26, s * 0.28, -s * 0.3, s * 0.06);
  ctx.quadraticCurveTo(-s * 0.32, -s * 0.24, 0, -s * 0.3);
  ctx.closePath(); ctx.fill();
  // snout
  ctx.fillStyle = '#3d1a2e';
  ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.14, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  // fangs
  ctx.fillStyle = '#f4e8d8';
  ctx.beginPath(); ctx.moveTo(-s * 0.08, s * 0.24); ctx.lineTo(-s * 0.05, s * 0.36); ctx.lineTo(-s * 0.02, s * 0.24); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.02, s * 0.24); ctx.lineTo(s * 0.05, s * 0.36); ctx.lineTo(s * 0.08, s * 0.24); ctx.closePath(); ctx.fill();
  // glowing eyes
  ctx.save();
  ctx.shadowColor = '#ff8a3d'; ctx.shadowBlur = s * 0.25 * glow;
  ctx.fillStyle = `rgba(255,138,61,${glow})`;
  ctx.beginPath(); ctx.ellipse(-s * 0.11, -s * 0.02, s * 0.06, s * 0.04, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.11, -s * 0.02, s * 0.06, s * 0.04, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // smoke puff
  ctx.fillStyle = 'rgba(120,120,130,0.4)';
  const puffY = -s * 0.3 - ((t * 14) % (s * 0.4));
  ctx.beginPath(); ctx.arc(s * 0.02, puffY, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Castle stage — a stone gargoyle bust perched on the battlements, wings
// half-furled, amber eyes that flicker like the other stages' glow cues.
function drawGargoyleCreature(ctx, cx, cy, s, t) {
  const flicker = 0.6 + Math.sin(t * 6) * 0.4;
  ctx.save();
  ctx.translate(cx, cy);
  // furled wings behind the head
  ctx.fillStyle = '#5a5a68';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * s * 0.12, -s * 0.05);
    ctx.quadraticCurveTo(k * s * 0.42, -s * 0.15, k * s * 0.36, s * 0.22);
    ctx.quadraticCurveTo(k * s * 0.24, s * 0.1, k * s * 0.14, s * 0.28);
    ctx.closePath(); ctx.fill();
  }
  // ears/horns
  ctx.fillStyle = '#4a4a56';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * s * 0.16, -s * 0.22);
    ctx.lineTo(k * s * 0.28, -s * 0.44);
    ctx.lineTo(k * s * 0.08, -s * 0.2);
    ctx.closePath(); ctx.fill();
  }
  // stone head
  const headGrad = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.32);
  headGrad.addColorStop(0, '#8a8a96'); headGrad.addColorStop(1, '#4a4a56');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.28, -s * 0.22, s * 0.26, s * 0.08);
  ctx.quadraticCurveTo(s * 0.22, s * 0.3, 0, s * 0.34);
  ctx.quadraticCurveTo(-s * 0.22, s * 0.3, -s * 0.26, s * 0.08);
  ctx.quadraticCurveTo(-s * 0.28, -s * 0.22, 0, -s * 0.3);
  ctx.closePath(); ctx.fill();
  // brow ridge
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath(); ctx.ellipse(0, -s * 0.06, s * 0.24, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  // snout
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.12, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  // glowing eyes
  ctx.save();
  ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = s * 0.22 * flicker;
  ctx.fillStyle = `rgba(255,210,61,${flicker})`;
  ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.04, s * 0.055, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.04, s * 0.055, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

const STAGE_CREATURES = [drawFishCreature, drawGargoyleCreature, drawParrotCreature, drawScorpionCreature, drawPenguinCreature, drawDragonCreature];

// The stage name, set along a downward-curving arc (a "half circle") that
// peaks at (cx, peakY) — no plaque/box behind it, just the lettering, bold
// outline + soft drop shadow so it still reads clearly over any background.
function drawStageNameBanner(ctx, cx, peakY, radius, name, locked) {
  ctx.save();
  ctx.font = `bold ${Math.round(radius * 0.19)}px ${F_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const arcCenterY = peakY + radius;

  const chars = [...name];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  // Cap the span so a long name never wraps more than a true half-circle.
  const totalAngle = Math.min(Math.PI * 0.85, totalWidth / radius);
  let angle = -totalAngle / 2;

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    angle += w / 2 / radius;
    const a = -Math.PI / 2 + angle;
    const x = cx + Math.cos(a) * radius;
    const y = arcCenterY + Math.sin(a) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.2;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = locked ? 'rgba(30,26,40,0.85)' : 'rgba(36,20,10,0.85)';
    ctx.strokeText(chars[i], 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.75)' : '#ffe9a8';
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    angle += w / 2 / radius;
  }
  ctx.restore();
}

// A single small carved star for the 5-star rating row.
function drawTinyStar(ctx, cx, cy, r, filled) {
  const spikes = 5, outer = r, inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.save();
    ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffd23d';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#a8781a';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  }
  ctx.lineWidth = 1;
  ctx.stroke();
}

// The 5-star rating row, set along the same kind of downward-curving arc as
// the name (peaking at (cx, peakY)) — filled left-to-right based on how
// much of the stage the player has cleared so far.
function drawStageStars(ctx, cx, peakY, radius, filled) {
  const n = 5;
  // Was 0.56 — tighter span packs the 5 stars closer together instead of
  // spreading them almost a third of the way around the arc.
  const totalAngle = Math.PI * 0.34;
  const arcCenterY = peakY + radius;
  const step = totalAngle / (n - 1);
  const startAngle = -Math.PI / 2 - totalAngle / 2;
  const r = radius * 0.135;
  for (let i = 0; i < n; i++) {
    const a = startAngle + step * i;
    const x = cx + Math.cos(a) * radius;
    const y = arcCenterY + Math.sin(a) * radius;
    drawTinyStar(ctx, x, y, r, i < filled);
  }
}

function drawStageNode(ctx, n, i, furthestLevelIndex, t) {
  const { cx, cy, size } = n;
  const stageStart = i * STAGE_SIZE;
  const cleared = Math.max(0, Math.min(STAGE_SIZE, furthestLevelIndex - stageStart));
  const locked = !CONFIG.devUnlockAllStages && stageStart > furthestLevelIndex;
  const complete = cleared >= STAGE_SIZE;
  const current = !locked && !complete;
  const baseR = size / 2;
  // The island artwork is drawn noticeably bigger than the "size" hit-box
  // (islands are wide, flat rock shapes, not tight circles) but nowhere
  // near the old 2.3x — that gap between drawn art and hit-box spacing is
  // exactly what was causing every node to visually swallow its neighbors.
  const TILE_DRAW_SCALE = 1.85;

  const theme = STAGE_THEMES[i];
  const tileImg = TILE_IMAGES[i];

  if (current) {
    ctx.save();
    ctx.shadowColor = '#ffd23d';
    ctx.shadowBlur = 18 + Math.sin(t * 4) * 6;
    ctx.strokeStyle = 'rgba(255,210,61,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy + baseR * 0.15, baseR * 1.15, baseR * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (tileImg) {
    // Source PNG is a 320x320 canvas with the island centered horizontally
    // and its main body roughly in the upper-middle band (see
    // gen_floating_islands2.py) — anchor so the rock's visual center lands
    // on cy, not the raw image center (which includes the dangling chunk).
    const dw = size * TILE_DRAW_SCALE;
    const dh = dw; // square source
    const dx = cx - dw / 2;
    const dy = cy - dh * 0.42;
    ctx.save();
    if (locked) { ctx.filter = 'grayscale(0.9) brightness(0.55)'; ctx.globalAlpha = 0.85; }
    ctx.drawImage(tileImg, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.restore();
    if (!locked) {
      // The stage's animated hero creature perches on the open terrain
      // (grass/sand/snow) below the treeline — lower and smaller than the
      // old anchor, which used to clip it awkwardly across tall foliage
      // (worst on Jungle's dense canopy).
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy + baseR * 0.2, baseR * 0.34, 0, Math.PI * 2); ctx.clip();
      STAGE_CREATURES[i % STAGE_CREATURES.length](ctx, cx, cy + baseR * 0.2, size * 0.3, t);
      ctx.restore();
    }
  } else {
    // Fallback while the image is still loading.
    const grad = ctx.createRadialGradient(cx - baseR * 0.3, cy - baseR * 0.35, baseR * 0.15, cx, cy, baseR);
    if (locked) { grad.addColorStop(0, '#5c5578'); grad.addColorStop(1, '#302a4a'); }
    else { grad.addColorStop(0, theme.decorColor); grad.addColorStop(0.55, theme.sky[0]); grad.addColorStop(1, theme.sky[1]); }
    ctx.beginPath(); ctx.ellipse(cx, cy, baseR * 1.1, baseR * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (locked) {
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(size * 0.34)}px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('🔒', cx, cy + size * 0.1);
  }

  // Carved name, arced in a shallow dome right at the top edge of the
  // island art (peaks at the center, curves down at the ends). Sits a
  // bit higher above the island than before (was 1.05).
  drawStageNameBanner(ctx, cx, cy - baseR * 1.3, size * 1.35, theme.name, locked);

  // 5-star rating, arced the same way just above the name — fills in with
  // the player's progress through the stage (no numbers, just stars).
  const starsFilled = locked ? 0 : Math.round((cleared / STAGE_SIZE) * 5);
  drawStageStars(ctx, cx, cy - baseR * 2.1, size * 1.1, starsFilled);

  // A simple OK check once the player has fully passed the stage — no text,
  // just the mark, sitting clear of the name/stars up top.
  if (complete) {
    const cxb = cx + baseR * 0.9, cyb = cy + baseR * 0.85;
    ctx.fillStyle = '#3fbf6f';
    ctx.beginPath(); ctx.arc(cxb, cyb, size * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cxb - size * 0.07, cyb); ctx.lineTo(cxb - size * 0.015, cyb + size * 0.06); ctx.lineTo(cxb + size * 0.08, cyb - size * 0.07);
    ctx.stroke();
  }
}

// Fixed star-field positions (computed once, not per-frame) so the
// twinkle animation doesn't jitter — only opacity/size pulse with time.
const MENU_STARS = Array.from({ length: 36 }, (_, i) => {
  // Deterministic pseudo-random spread using a simple hash of i, so the
  // field looks scattered but never changes between renders.
  const h1 = Math.sin(i * 12.9898) * 43758.5453; const rx = h1 - Math.floor(h1);
  const h2 = Math.sin(i * 78.233) * 12543.789; const ry = h2 - Math.floor(h2);
  const h3 = Math.sin(i * 37.719) * 5678.123; const rp = (h3 - Math.floor(h3)) * Math.PI * 2;
  return { x: rx * W, y: ry * (H - NAV_H) * 0.7, r: 0.6 + ((i * 7) % 5) * 0.35, phase: rp };
});

// Soft glowing atmosphere behind the header/logo — twinkling stars plus a
// big radial glow — drawn once at the top of the page so it reads as a
// designed screen, not a flat color fill.
function drawMenuAtmosphere(ctx, t) {
  ctx.save();
  for (const s of MENU_STARS) {
    const tw = 0.35 + Math.sin(t * 1.6 + s.phase) * 0.35 + 0.35;
    ctx.globalAlpha = Math.max(0, Math.min(1, tw));
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(W / 2, 96, 10, W / 2, 96, 190);
  glow.addColorStop(0, 'rgba(127,216,255,0.22)');
  glow.addColorStop(1, 'rgba(127,216,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 260);
}

export function renderMenu(ctx, best, playerName, coins = 0, progressLevelIndex = 0, continueDismissed = false, mapScrollY = 0) {
  const t = performance.now() / 1000;

  drawMenuAtmosphere(ctx, t);

  // Header bar — player identity on the left (avatar + name, tap to
  // rename), current coin balance on the right, sitting on a gradient
  // strip with a glowing bottom edge so it reads as real app chrome.
  const nb = MENU_BUTTONS.name;
  const hdrGrad = ctx.createLinearGradient(0, 0, 0, nb.h);
  hdrGrad.addColorStop(0, 'rgba(38,26,68,0.92)');
  hdrGrad.addColorStop(1, 'rgba(20,13,40,0.8)');
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
  ctx.save();
  ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(127,216,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, nb.h); ctx.lineTo(W, nb.h); ctx.stroke();
  ctx.restore();

  // Avatar badge — first letter of the player's name on a glowing crystal disc.
  const avR = 17, avCx = 28, avCy = nb.h / 2;
  const avGrad = ctx.createRadialGradient(avCx - 5, avCy - 5, 2, avCx, avCy, avR);
  avGrad.addColorStop(0, '#bdeeff'); avGrad.addColorStop(1, '#4a8fd6');
  ctx.fillStyle = avGrad;
  ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8f9ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `bold 16px ${F_TITLE}`;
  ctx.fillStyle = '#0d1b2a';
  ctx.fillText((playerName || 'G').charAt(0).toUpperCase(), avCx, avCy + 6);

  ctx.textAlign = 'left';
  ctx.font = `14px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`${playerName || 'Guardian'}`, avCx + avR + 10, avCy + 5);

  // Coin balance pill, top-right
  const coinsStr = String(coins);
  ctx.font = `13px ${F_BODY}`;
  const pillW = Math.max(58, ctx.measureText(coinsStr).width + 44), pillH = 26;
  const pillX = W - pillW - 12, pillY = nb.h / 2 - pillH / 2;
  ctx.fillStyle = 'rgba(255,210,61,0.14)';
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2); ctx.fill(); ctx.stroke();
  const coinCx = pillX + 15, coinCy = pillY + pillH / 2;
  ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#a8781a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(coinCx, coinCy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a8781a'; ctx.font = `bold 10px Arial`; ctx.textAlign = 'center';
  ctx.fillText('¢', coinCx, coinCy + 3.5);
  ctx.textAlign = 'left';
  ctx.font = `13px ${F_TITLE}`;
  ctx.fillStyle = '#ffe98a';
  ctx.fillText(coinsStr, coinCx + 13, coinCy + 5);

  // Logo — bigger, with a soft glow banner behind it and more sparkle.
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(W / 2, 100 + Math.sin(t * 2) * 3);
  ctx.font = `36px ${F_TITLE}`;
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 7;
  ctx.strokeText('GateWall', 0, 0);
  const lg = ctx.createLinearGradient(0, -24, 0, 12);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(0.45, '#bdeeff');
  lg.addColorStop(0.75, '#7fd8ff');
  lg.addColorStop(1, '#b358e0');
  ctx.fillStyle = lg;
  ctx.fillText('GateWall', 0, 0);
  // thin glowing underline flourish
  ctx.save();
  ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(127,216,255,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-92, 14); ctx.lineTo(92, 14); ctx.stroke();
  ctx.restore();
  ctx.restore();
  crystal(ctx, W / 2 - 140, 96, 11, '#7fd8ff', t * 0.5);
  crystal(ctx, W / 2 + 140, 96, 11, '#7fd8ff', -t * 0.5);
  crystal(ctx, W / 2 - 108, 108, 6, '#b358e0', -t * 0.7);
  crystal(ctx, W / 2 + 108, 108, 6, '#b358e0', t * 0.7);

  // Where the player currently stands.
  const idx = Math.max(0, Math.min(LEVELS.length - 1, progressLevelIndex));
  const stageNum = Math.floor(idx / STAGE_SIZE) + 1;
  const levelInStage = (idx % STAGE_SIZE) + 1;
  const levelName = LEVELS[idx].name;
  const started = idx > 0;

  const layout = homeLayout(mapScrollY);

  // Island-chain stage map — an ocean backdrop with a sailing route between
  // themed islands — always visible underneath, drawn first so the
  // continue dialog (below) floats right over it, same as it would over
  // any other screen. Clipped to the map viewport so stages scrolled above/
  // below the visible band don't bleed into the header or nav bar.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, layout.stageTop - 34, W, layout.stageBottom - (layout.stageTop - 34));
  ctx.clip();
  drawOceanBackdrop(ctx, layout.stageTop - 30, NAV_Y, t);
  drawStagePath(ctx, layout.nodes, idx);
  layout.nodes.forEach((n, i) => drawStageNode(ctx, n, i, idx, t));
  ctx.restore();

  // Scroll affordance — a thin track + thumb on the right edge of the map,
  // only shown once there's actually more than one screenful of stages.
  if (layout.scrollMax > 0) {
    const trackX = W - 8, trackY = layout.stageTop - 20, trackH = layout.stageBottom - trackY;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
    const thumbH = Math.max(24, trackH * (trackH / (trackH + layout.scrollMax)));
    const thumbY = trackY + (trackH - thumbH) * (layout.scrollY / layout.scrollMax);
    ctx.fillStyle = 'rgba(127,216,255,0.75)';
    ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
    // A gentle bounce-hint arrow the first time there's more to see below.
    if (layout.scrollY < layout.scrollMax - 4) {
      const bounce = Math.sin(t * 3) * 4;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 8, layout.stageBottom - 6 + bounce);
      ctx.lineTo(W / 2 + 8, layout.stageBottom - 6 + bounce);
      ctx.lineTo(W / 2, layout.stageBottom + 4 + bounce);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  if (!continueDismissed) {
    // Same big dialog as GAME OVER / VICTORY / LEVEL CLEAR (ribbon banner,
    // dim background, pulsing button) — just with a close X added so it
    // isn't a hard blocker like those terminal screens are.
    panel(ctx, started ? 'CONTINUE YOUR RUN' : 'HOW TO PLAY', started ? [
      `Stage ${stageNum} of ${STAGE_COUNT}  ·  Level ${levelInStage} of ${STAGE_SIZE}`,
      `⚔ ${levelName}`,
      '',
      'Fly the Guardian anywhere —',
      'magic fires by itself!',
      best > 0 ? `★ Best score: ${best} ★` : '',
    ] : [
      'Fly the Guardian anywhere —',
      'magic fires by itself!',
      'Defend the GateWall!',
      'Grab gems — LEVEL UP — pick powers',
      'Chain 25 kills for FEVER!',
      best > 0 ? `★ Best score: ${best} ★` : '',
    ], started ? 'CONTINUE' : 'TAP TO PLAY');

    drawCloseX(ctx, CONTINUE_CLOSE_BUTTON);
  }

  // Nav bar drawn LAST so it stays visible and tappable even while the
  // continue dialog is open — you can still jump to Upgrades/Settings/Ranks
  // without closing it first.
  drawBottomNav(ctx, 'play');
}

// --- Pause dialog (tap the pause button top-right during a run) --------
// A genuine transient dialog (not a nav-bar page) — dims and freezes the
// run behind it, with two clear actions: resume, or exit back to the home
// page (the run itself is simply abandoned, same as any other quit).
const PAUSE_CARD = { x: 50, y: 250, w: W - 100, h: 220 };
const PAUSE_BTN_W = (PAUSE_CARD.w - 56) / 2, PAUSE_BTN_H = 54;
export const PAUSE_BUTTONS = {
  resume: { x: PAUSE_CARD.x + 20, y: PAUSE_CARD.y + 140, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
  exit:   { x: PAUSE_CARD.x + 20 + PAUSE_BTN_W + 16, y: PAUSE_CARD.y + 140, w: PAUSE_BTN_W, h: PAUSE_BTN_H },
};

// --- Placement pause banner (drag a wall/turret into position) ---------
// The whole battlefield freezes the moment a wall/turret is bought so the
// Guardian is never dragged into danger while aiming. This small banner +
// button sits up top (out of the way of the drag surface) — tap CONTINUE
// once every item is placed to unfreeze and resume the fight.
export const PLACEMENT_CONTINUE_BUTTON = { x: W / 2 - 90, y: 96, w: 180, h: 46 };

export function renderPlacementBanner(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,4,20,0.55)';
  ctx.fillRect(0, 56, W, 108);

  ctx.textAlign = 'center';
  ctx.font = `14px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Battle paused — drag to place, buy more, or continue', W / 2, 76);

  const b = PLACEMENT_CONTINUE_BUTTON;
  ctx.fillStyle = '#3fbf6f';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
  ctx.font = `17px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 3;
  ctx.strokeText('CONTINUE', b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.fillText('CONTINUE', b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.restore();
}

export function renderPause(ctx) {
  ctx.fillStyle = 'rgba(8,4,20,0.78)';
  ctx.fillRect(0, 0, W, H);

  const c = PAUSE_CARD;
  ctx.save();
  ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 30;
  const grad = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  grad.addColorStop(0, '#332457'); grad.addColorStop(1, '#1c1238');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 22); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 22); ctx.stroke();

  const t = performance.now() / 1000;
  crystal(ctx, c.x + 34, c.y + 40, 13, '#7fd8ff', Math.sin(t) * 0.4);
  crystal(ctx, c.x + c.w - 34, c.y + 40, 13, '#7fd8ff', -Math.sin(t) * 0.4);

  ctx.textAlign = 'center';
  ctx.font = `30px ${F_TITLE}`;
  ctx.fillStyle = '#7fd8ff';
  ctx.strokeStyle = '#1c3a5c'; ctx.lineWidth = 5;
  ctx.strokeText('PAUSED', W / 2, c.y + 52);
  ctx.fillText('PAUSED', W / 2, c.y + 52);

  ctx.font = `14px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('The gate holds while you take a breather.', W / 2, c.y + 90);

  const rb = PAUSE_BUTTONS.resume;
  ctx.fillStyle = '#3fbf6f';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(rb.x, rb.y, rb.w, rb.h, 14); ctx.fill(); ctx.stroke();
  ctx.font = `17px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 3;
  ctx.strokeText('CONTINUE', rb.x + rb.w / 2, rb.y + rb.h / 2 + 6);
  ctx.fillText('CONTINUE', rb.x + rb.w / 2, rb.y + rb.h / 2 + 6);

  const ex = PAUSE_BUTTONS.exit;
  ctx.fillStyle = '#e0483d';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(ex.x, ex.y, ex.w, ex.h, 14); ctx.fill(); ctx.stroke();
  ctx.font = `17px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 3;
  ctx.strokeText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 + 6);
  ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 + 6);
}

export function renderLevelClear(ctx, state, nextName) {
  const levelInStage = ((state.spawner.level - 1) % STAGE_SIZE) + 1;
  const isStageClear = levelInStage === STAGE_SIZE;
  const stageNum = Math.ceil(state.spawner.level / STAGE_SIZE);
  panel(ctx, isStageClear ? `STAGE ${stageNum} CLEAR!` : `LEVEL ${levelInStage} CLEAR!`, [
    `Score: ${state.score}`,
    `Coins: ${state.coins}  (+bonus!)`,
    '+1 gate restored',
    '',
    `Next: ${nextName}`,
  ], 'CONTINUE', '#58e07f');
  // Exit back to the menu instead of continuing straight into the next
  // level — same small link used on the Victory screen.
  drawMenuLink(ctx);
}

// Small "return to the Upgrades/Leaderboard menu" link shown under the
// end-of-run panels — otherwise those screens have no way back to the menu.
export const END_MENU_BUTTON = { x: W / 2 - 70, y: 160 + 380 + 12, w: 140, h: 40 };

function drawMenuLink(ctx) {
  const b = END_MENU_BUTTON;
  ctx.fillStyle = '#e0483d';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `15px ${F_TITLE}`;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 2.5;
  ctx.strokeText('EXIT', W / 2, b.y + b.h / 2 + 5);
  ctx.fillText('EXIT', W / 2, b.y + b.h / 2 + 5);
}

export function renderVictory(ctx, state, best) {
  const stageCount = Math.ceil(state.spawner.level / STAGE_SIZE);
  panel(ctx, 'GateWall SEALED!', [
    `All ${stageCount} stages saved!`,
    `Final score: ${state.score}`,
    `Monsters bonked: ${state.kills}`,
    `Best combo: x${state.bestCombo}`,
    state.score >= best ? '★ NEW BEST! ★' : `Best: ${best}`,
  ], 'PLAY AGAIN', '#7fd8ff', 3);
  drawMenuLink(ctx);
}

// --- Coin shop --------------------------------------------------
// Layout is fixed so main.js can hit-test taps against these exact rects.
const SHOP_CARD = { x: 24, y: 128, w: W - 48, h: 490 };
const SHOP_ROW_H = 108;
export const SHOP_BUTTONS = {
  close: { x: SHOP_CARD.x + SHOP_CARD.w - 40, y: SHOP_CARD.y + 8, w: 32, h: 32 },
  packs: COIN_PACKS.map((_, i) => ({
    x: SHOP_CARD.x + 16,
    y: SHOP_CARD.y + 78 + i * (SHOP_ROW_H + 12),
    w: SHOP_CARD.w - 32,
    h: SHOP_ROW_H,
  })),
};

function drawCoinStack(ctx, cx, cy, big) {
  const r = big ? 22 : 16;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + (i - 1) * r * 0.5, cy - i * 4, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? '#ffe98a' : '#ffd23d';
    ctx.fill();
    ctx.strokeStyle = '#a8781a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function renderShop(ctx, state, iapEnabled) {
  ctx.fillStyle = 'rgba(8,4,20,0.82)';
  ctx.fillRect(0, 0, W, H);

  const c = SHOP_CARD;
  ctx.save();
  ctx.shadowColor = '#ffd23d';
  ctx.shadowBlur = 30;
  const grad = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  grad.addColorStop(0, '#332457');
  grad.addColorStop(1, '#1c1238');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(c.x, c.y, c.w, c.h, 24);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 24); ctx.stroke();

  // title
  ctx.textAlign = 'center';
  ctx.font = `28px ${F_TITLE}`;
  ctx.fillStyle = '#ffd23d';
  ctx.strokeStyle = '#2a1f4d';
  ctx.lineWidth = 5;
  ctx.strokeText('COIN SHOP', W / 2, c.y + 42);
  ctx.fillText('COIN SHOP', W / 2, c.y + 42);

  ctx.font = `13px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`You have ${state.coins} coins`, W / 2, c.y + 62);

  // close button (X)
  const cl = SHOP_BUTTONS.close;
  ctx.fillStyle = '#e0483d';
  ctx.beginPath(); ctx.arc(cl.x + cl.w / 2, cl.y + cl.h / 2, cl.w / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cl.x + 9, cl.y + 9); ctx.lineTo(cl.x + cl.w - 9, cl.y + cl.h - 9);
  ctx.moveTo(cl.x + cl.w - 9, cl.y + 9); ctx.lineTo(cl.x + 9, cl.y + cl.h - 9);
  ctx.stroke();

  // package rows
  COIN_PACKS.forEach((pack, i) => {
    const r = SHOP_BUTTONS.packs[i];
    ctx.fillStyle = pack.bestValue ? 'rgba(88,224,127,0.16)' : 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = pack.bestValue ? '#58e07f' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fill(); ctx.stroke();

    if (pack.bestValue) {
      ctx.fillStyle = '#58e07f';
      ctx.font = `11px ${F_BODY}`;
      ctx.textAlign = 'center';
      ctx.fillText('★ BEST VALUE ★', r.x + r.w / 2, r.y - 4);
    }

    drawCoinStack(ctx, r.x + 46, r.y + r.h / 2, i === 2);

    ctx.textAlign = 'left';
    ctx.font = `20px ${F_TITLE}`;
    ctx.fillStyle = pack.color;
    ctx.fillText(pack.label, r.x + 90, r.y + 40);
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`+${pack.coins} coins`, r.x + 90, r.y + 64);

    // price / buy pill on the right
    const pillW = 88, pillH = 40, pillX = r.x + r.w - pillW - 14, pillY = r.y + (r.h - pillH) / 2;
    ctx.fillStyle = iapEnabled ? '#3fbf6f' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = iapEnabled ? '#1d7a3c' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = iapEnabled ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.fillText(pack.price, pillX + pillW / 2, pillY + pillH / 2 + 6);
  });

  if (!iapEnabled) {
    ctx.textAlign = 'center';
    ctx.font = `13px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Purchases available in the app version', W / 2, c.y + c.h - 16);
  }
}

import { ads } from '../systems/ads.js';

export const REVIVE_BUTTON = { x: 44, y: 460, w: 272, h: 56 }; // Assuming W=360, W-88=272

export function renderGameOver(ctx, state, best) {
  const stageNum = Math.ceil(state.spawner.level / STAGE_SIZE);
  const levelInStage = ((state.spawner.level - 1) % STAGE_SIZE) + 1;
  panel(ctx, 'GATE DOWN!', [
    `Reached: Stage ${stageNum}, Level ${levelInStage}`,
    `${state.levelDef.name}`,
    `Score: ${state.score}`,
    `Monsters bonked: ${state.kills}`,
    state.score >= best ? '★ NEW BEST! ★' : `Best: ${best}`,
  ], 'TRY AGAIN', '#ff5c7a');
  
  if (ads.isRewardedReady()) {
    const b = REVIVE_BUTTON;
    ctx.fillStyle = '#ff9900';
    ctx.strokeStyle = '#b36b00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill(); ctx.stroke();
    
    ctx.textAlign = 'center';
    ctx.font = `bold 18px ${F_BODY}`;
    ctx.fillStyle = '#fff';
    ctx.fillText('WATCH AD TO REVIVE', 180, b.y + 34); // 180 = center of 360
  }

  drawMenuLink(ctx);
}

// --- ARMORY (permanent upgrades page) ---------------------------------
// A grid of every unit the player fights with; tapping one opens a dialog
// where each of its stats is upgraded separately. Costs climb exponentially
// (data/upgrades.js), and GET COINS buttons lead to the coin shop.
const ARM_TOP = 104, ARM_GAP = 12, ARM_CW = (W - 32 - ARM_GAP) / 2, ARM_CH = 172;
export const UPGRADE_BUTTONS = {
  getCoins: { x: W - 16 - 130, y: 60, w: 130, h: 32 },
  cards: Object.fromEntries(UNIT_ORDER.map((u, i) => [u, {
    x: 16 + (i % 2) * (ARM_CW + ARM_GAP),
    y: ARM_TOP + Math.floor(i / 2) * (ARM_CH + ARM_GAP),
    w: ARM_CW, h: ARM_CH,
  }])),
};
const ARM_DLG = { x: 16, y: 66, w: W - 32, h: 580 };
export const UNIT_DIALOG = {
  close: { x: ARM_DLG.x + ARM_DLG.w - 44, y: ARM_DLG.y + 10, w: 34, h: 34 },
  getCoins: { x: W / 2 - 110, y: ARM_DLG.y + ARM_DLG.h - 56, w: 220, h: 42 },
};
// Row + buy-button rects for every stat of a unit's dialog.
export function unitDialogRows(unit) {
  const out = {};
  Object.keys(UNITS[unit].stats).forEach((stat, i) => {
    const y = ARM_DLG.y + 132 + i * 98;
    out[stat] = {
      row: { x: ARM_DLG.x + 12, y, w: ARM_DLG.w - 24, h: 88 },
      buy: { x: ARM_DLG.x + ARM_DLG.w - 128, y: y + 22, w: 106, h: 46 },
    };
  });
  return out;
}

function drawCloseX(ctx, cl) {
  ctx.fillStyle = '#e0483d';
  ctx.beginPath(); ctx.arc(cl.x + cl.w / 2, cl.y + cl.h / 2, cl.w / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cl.x + 9, cl.y + 9); ctx.lineTo(cl.x + cl.w - 9, cl.y + cl.h - 9);
  ctx.moveTo(cl.x + cl.w - 9, cl.y + 9); ctx.lineTo(cl.x + 9, cl.y + cl.h - 9);
  ctx.stroke();
}

// Animated unit portraits for the Armory (procedural, plus the real cannon
// art and the Guardian sprite passed in from main.js).
function drawUnitIcon(ctx, unit, x, y, s, t, heroImg) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 2.4) * s * 0.04;
  switch (unit) {
    case 'hero': {
      if (heroImg) {
        const h = s * 1.5, w = h * (heroImg.naturalWidth / heroImg.naturalHeight);
        ctx.drawImage(heroImg, -w / 2, -h * 0.55 + bob, w, h);
      } else {
        ctx.fillStyle = '#ffd23d';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, 7); ctx.fill();
      }
      break;
    }
    case 'angel': {
      ctx.translate(0, bob * 2);
      const flap = Math.sin(t * 10) * 0.35;
      ctx.fillStyle = 'rgba(154,230,255,0.85)';
      ctx.strokeStyle = '#1c3a52';
      ctx.lineWidth = 2;
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.3 + flap);
        ctx.beginPath(); ctx.ellipse(s * 0.32, 0, s * 0.26, s * 0.12, 0.5, 0, 7); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#bdeeff';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.24, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7fd8ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.34, s * 0.18, s * 0.06, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#1c3a52';
      ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.02, 2.5, 0, 7); ctx.arc(s * 0.07, -s * 0.02, 2.5, 0, 7); ctx.fill();
      break;
    }
    case 'turret': {
      const img = CANNON_FRAMES[Math.sin(t * 3) > 0.85 ? 'fire' : 'idle'] || CANNON_FRAMES.idle;
      if (img) {
        const h = s * 1.3, w = h * (img.width / img.height);
        ctx.drawImage(img, -w / 2, -h * 0.6, w, h);
      }
      break;
    }
    case 'wall': {
      const w = s * 1.1, h = s * 0.5;
      ctx.fillStyle = '#8a6a4a';
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
      for (const fx of [-0.25, 0.25]) { ctx.moveTo(fx * w, -h / 2); ctx.lineTo(fx * w, 0); }
      ctx.moveTo(0, 0); ctx.lineTo(0, h / 2);
      ctx.stroke();
      ctx.fillStyle = '#d8c8a8'; // thorns
      for (let i = 0; i < 5; i++) {
        const tx = -w / 2 + 8 + i * ((w - 16) / 4);
        ctx.beginPath();
        ctx.moveTo(tx - 5, -h / 2); ctx.lineTo(tx, -h / 2 - 9 - Math.sin(t * 3 + i) * 2); ctx.lineTo(tx + 5, -h / 2);
        ctx.fill();
      }
      break;
    }
    case 'bomb': {
      ctx.translate(0, bob);
      ctx.fillStyle = '#2a2438';
      ctx.strokeStyle = '#120c1e';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, s * 0.05, s * 0.36, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(-s * 0.13, -s * 0.08, s * 0.08, s * 0.12, -0.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c8a06a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s * 0.18, -s * 0.24); ctx.quadraticCurveTo(s * 0.35, -s * 0.5, s * 0.22, -s * 0.55); ctx.stroke();
      const sp = 0.6 + 0.4 * Math.sin(t * 22);
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.57, 5 * sp + 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.57, 2, 0, 7); ctx.fill();
      break;
    }
    case 'shield': {
      const g = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.shadowColor = '#7fd8ff';
      ctx.shadowBlur = 16 * g;
      ctx.fillStyle = '#3a7fa8';
      ctx.strokeStyle = '#bdeeff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.42);
      ctx.quadraticCurveTo(s * 0.36, -s * 0.36, s * 0.34, -s * 0.12);
      ctx.quadraticCurveTo(s * 0.3, s * 0.3, 0, s * 0.46);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.3, -s * 0.34, -s * 0.12);
      ctx.quadraticCurveTo(-s * 0.36, -s * 0.36, 0, -s * 0.42);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.28); ctx.lineTo(0, s * 0.3);
      ctx.moveTo(-s * 0.2, -s * 0.05); ctx.lineTo(s * 0.2, -s * 0.05);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function armCoinPill(ctx, coins) {
  ctx.fillStyle = 'rgba(10,6,24,0.6)';
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(16, 60, 150, 32, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.strokeStyle = '#a8781a';
  ctx.beginPath(); ctx.arc(34, 76, 10, 0, 7); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `17px ${F_TITLE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(coins), 52, 83);
}

function armButton(ctx, r, label, colors, t, glow = false) {
  ctx.save();
  if (glow) { ctx.shadowColor = colors[0]; ctx.shadowBlur = 10 + 6 * Math.sin(t * 5); }
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.h / 2); ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(r.h * 0.42)}px ${F_TITLE}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h * 0.66);
}

function unitAffordable(saveData, unit) {
  for (const stat in UNITS[unit].stats) {
    const lv = unitLevel(saveData, unit, stat);
    if (lv < UNITS[unit].stats[stat].max && (saveData.coins || 0) >= statCost(unit, stat, lv)) return true;
  }
  return false;
}

// selected = unit key whose dialog is open (or null); flash = { unit, stat, t }
// pulses a just-bought row; heroImg = the Guardian sprite from main.js.
export function renderUpgrades(ctx, saveData, selected = null, t = 0, heroImg = null, flash = null) {
  pageShell(ctx, 'ARMORY', '#ffd23d');
  armCoinPill(ctx, saveData.coins || 0);
  armButton(ctx, UPGRADE_BUTTONS.getCoins, '+ GET COINS', ['#ffd23d', '#d89a1a'], t);

  UNIT_ORDER.forEach((unit, i) => {
    const u = UNITS[unit];
    const r = UPGRADE_BUTTONS.cards[unit];
    const total = unitTotalLevel(saveData, unit);
    let maxTotal = 0;
    for (const st in u.stats) maxTotal += u.stats[st].max;
    const can = unitAffordable(saveData, unit);
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.8 + i) * 2);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#34265e');
    g.addColorStop(1, '#1c1238');
    ctx.fillStyle = g;
    ctx.strokeStyle = can ? u.color : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = can ? 2.5 : 1.5;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill(); ctx.stroke();
    const hg = ctx.createRadialGradient(r.x + r.w / 2, r.y + 58, 4, r.x + r.w / 2, r.y + 58, 56);
    hg.addColorStop(0, u.color + '55');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(r.x, r.y, r.w, 116);
    drawUnitIcon(ctx, unit, r.x + r.w / 2, r.y + 62, 70, t + i, heroImg);
    ctx.textAlign = 'center';
    ctx.font = `17px ${F_TITLE}`;
    ctx.fillStyle = u.color;
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 126);
    const bx = r.x + 16, bw = r.w - 32, by = r.y + 138;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 6, 3); ctx.fill();
    ctx.fillStyle = u.color;
    ctx.beginPath(); ctx.roundRect(bx, by, Math.max(6, bw * (total / maxTotal)), 6, 3); ctx.fill();
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`POWER LV ${total}`, r.x + r.w / 2, r.y + 160);
    if (can) { // something here is affordable right now
      ctx.fillStyle = '#58e07f';
      ctx.beginPath(); ctx.arc(r.x + r.w - 16, r.y + 16, 6 + Math.sin(t * 5) * 1.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  });

  drawBottomNav(ctx, 'upgrades');
  if (selected) renderUnitDialog(ctx, saveData, selected, t, heroImg, flash);
}

function renderUnitDialog(ctx, saveData, unit, t, heroImg, flash) {
  const u = UNITS[unit];
  const d = ARM_DLG;
  ctx.fillStyle = 'rgba(8,4,20,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = u.color;
  ctx.shadowBlur = 24;
  const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
  g.addColorStop(0, '#36275f');
  g.addColorStop(1, '#1a1034');
  ctx.fillStyle = g;
  ctx.strokeStyle = u.color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 22); ctx.fill(); ctx.stroke();
  ctx.restore();
  drawCloseX(ctx, UNIT_DIALOG.close);

  drawUnitIcon(ctx, unit, d.x + 62, d.y + 64, 84, t, heroImg);
  ctx.textAlign = 'left';
  ctx.font = `24px ${F_TITLE}`;
  ctx.fillStyle = u.color;
  ctx.fillText(u.name, d.x + 118, d.y + 52);
  ctx.font = `13px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(u.role, d.x + 118, d.y + 74);
  ctx.fillStyle = '#ffd23d';
  ctx.font = `15px ${F_TITLE}`;
  ctx.fillText(`● ${saveData.coins || 0} coins`, d.x + 118, d.y + 100);

  const rows = unitDialogRows(unit);
  for (const stat in u.stats) {
    const sdef = u.stats[stat];
    const { row, buy } = rows[stat];
    const lv = unitLevel(saveData, unit, stat);
    const maxed = lv >= sdef.max;
    const cost = maxed ? 0 : statCost(unit, stat, lv);
    const afford = !maxed && (saveData.coins || 0) >= cost;
    const fl = flash && flash.unit === unit && flash.stat === stat ? Math.max(0, 1 - (t - flash.t) / 0.6) : 0;

    ctx.fillStyle = fl > 0 ? `rgba(255,255,255,${0.06 + fl * 0.25})` : 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = fl > 0 ? '#ffffff' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(row.x, row.y, row.w, row.h, 14); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = u.color;
    ctx.fillText(sdef.label, row.x + 14, row.y + 26);
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`${sdef.desc}  ·  LV ${lv}/${sdef.max}`, row.x + 14, row.y + 45);
    ctx.font = `14px ${F_BODY}`;
    ctx.fillStyle = '#ffffff';
    const cur = lv === 0 ? 'base' : statLabel(unit, stat, lv);
    ctx.fillText(maxed ? `${cur}  (max)` : `${cur}  →  ${statLabel(unit, stat, lv + 1)}`, row.x + 14, row.y + 68);
    const tw = Math.min(150, row.w - 160);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(row.x + 14, row.y + 76, tw, 4);
    ctx.fillStyle = u.color;
    ctx.fillRect(row.x + 14, row.y + 76, tw * (lv / sdef.max), 4);

    if (maxed) armButton(ctx, buy, 'MAX', ['#58e07f', '#2e9a52'], t);
    else if (afford) armButton(ctx, buy, `● ${cost}`, ['#6ef598', '#38b85f'], t, true);
    else armButton(ctx, buy, `● ${cost}`, ['#7a5a6a', '#4a3442'], t);
  }
  armButton(ctx, UNIT_DIALOG.getCoins, '+ GET MORE COINS', ['#ffd23d', '#d89a1a'], t);
}

// --- Settings --------------------------------------------------------
export const PRIVACY_URL = 'https://gatewall.turtoo.app/privacy';

const SET_ROW_X = 16, SET_ROW_W = W - 32, SET_ROW_H = 64, SET_ROW_GAP = 16, SET_TOP = 76;
export const SETTINGS_BUTTONS = {
  changeName: { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 0, w: SET_ROW_W, h: SET_ROW_H },
  mute:      { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 1, w: SET_ROW_W, h: SET_ROW_H },
  removeAds: { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 2, w: SET_ROW_W, h: SET_ROW_H },
  privacy:   { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 3, w: SET_ROW_W, h: SET_ROW_H },
  reset:     { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 4, w: SET_ROW_W, h: SET_ROW_H },
};

export function renderSettings(ctx, muted, playerName, adsRemoved, iapEnabled) {
  pageShell(ctx, 'SETTINGS', '#9ae6ff');

  // Change name row
  {
    const r = SETTINGS_BUTTONS.changeName;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#bda6ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#bda6ff';
    ctx.fillText('YOUR NAME', r.x + 16, r.y + 26);
    ctx.font = `13px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(playerName || 'Guardian', r.x + 16, r.y + 46);
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = '#bda6ff';
    ctx.fillText('EDIT ✎', r.x + r.w - 16, r.y + 38);
  }

  // Sound toggle row
  {
    const r = SETTINGS_BUTTONS.mute;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = muted ? 'rgba(255,255,255,0.25)' : '#58e07f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#fff';
    ctx.fillText('SOUND', r.x + 16, r.y + 38);
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = muted ? '#ff9a9a' : '#58e07f';
    ctx.fillText(muted ? 'OFF — tap to enable' : 'ON — tap to mute', r.x + r.w - 16, r.y + 38);
  }

  // Remove Ads (IAP) row
  {
    const r = SETTINGS_BUTTONS.removeAds;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = adsRemoved ? '#58e07f' : '#ffd23d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#ffd23d';
    ctx.fillText('REMOVE ADS', r.x + 16, r.y + 26);
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(
      adsRemoved ? 'Purchased — banners and interstitials are off' :
      iapEnabled ? 'One-time purchase, no more banner/interstitial ads' :
      'Purchases available in the app version',
      r.x + 16, r.y + 46
    );
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = adsRemoved ? '#58e07f' : (iapEnabled ? '#ffd23d' : 'rgba(255,255,255,0.4)');
    ctx.fillText(adsRemoved ? 'OWNED' : (iapEnabled ? 'BUY' : '—'), r.x + r.w - 16, r.y + 38);
  }

  // Privacy policy row
  {
    const r = SETTINGS_BUTTONS.privacy;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#9ae6ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#9ae6ff';
    ctx.fillText('PRIVACY POLICY', r.x + 16, r.y + 38);
    ctx.textAlign = 'right';
    ctx.font = `14px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('View ↗', r.x + r.w - 16, r.y + 38);
  }

  // Reset progress row
  {
    const r = SETTINGS_BUTTONS.reset;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#ff5c7a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#ff9a9a';
    ctx.fillText('RESET PROGRESS', r.x + 16, r.y + 26);
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Start back at Stage 1, Level 1 (tap twice to confirm)', r.x + 16, r.y + 46);
  }

  drawBottomNav(ctx, 'settings');
}

// --- Top Guardians page --------------------------------------------------
// Prefers the real cross-device leaderboard fetched from the backend
// (globalBoard/globalStatus, driven by main.js's openLeaderboard()); falls
// back to the on-device-only list (saveData.leaderboard) whenever the
// backend can't be reached (offline, not deployed yet, still loading).
const LB_TOP = 76;
export const LEADERBOARD_BUTTONS = {};

// `mine` marks the row belonging to the current player — drawn with a
// highlighted pill behind it (and a brighter name/score) so their own rank
// stands out "between the list too," not just as a number they have to hunt
// for. Used both for a row found in place within the visible list and for
// the pinned "YOUR RANK" row appended below it when they're further down
// than what got fetched.
function drawRankRows(ctx, list, myName) {
  const myKey = (myName || '').trim().toLowerCase();
  list.forEach((row, i) => {
    const y = LB_TOP + 16 + i * 44;
    const mine = !!myKey && (row.name || '').trim().toLowerCase() === myKey;
    if (mine) {
      ctx.fillStyle = 'rgba(255,210,61,0.14)';
      ctx.strokeStyle = 'rgba(255,210,61,0.55)';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, 10, y - 26, W - 20, 36, 10);
      ctx.fill();
      ctx.stroke();
    }
    const rankColor = mine ? '#ffd23d' : i === 0 ? '#ffd23d' : i === 1 ? '#cfd8e8' : i === 2 ? '#e0a458' : 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = rankColor;
    ctx.fillText(`${row.rank ?? i + 1}.`, 20, y);
    ctx.font = `16px ${F_BODY}`;
    ctx.fillStyle = mine ? '#fff6d8' : 'rgba(255,255,255,0.92)';
    ctx.fillText((row.name || 'Guardian') + (mine ? ' (you)' : ''), 55, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = mine ? '#ffd23d' : '#7fd8ff';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillText(String(row.score), W - 20, y);
  });
}

// Small local helper — roundRectPath() elsewhere in this file may draw
// directly with ctx.roundRect(); some older canvas targets don't support
// that, so the leaderboard's highlight pill uses its own manual path.
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderLeaderboard(ctx, saveData, globalBoard, globalStatus) {
  pageShell(ctx, 'TOP RANKS', '#ffd23d');

  const haveGlobal = globalStatus === 'ready' && Array.isArray(globalBoard) && globalBoard.length > 0;
  const localList = (saveData.leaderboard || []).slice(0, 10);
  const myName = saveData.playerName || '';
  const myKey = myName.trim().toLowerCase();
  const myBest = saveData.best || 0;

  if (haveGlobal) {
    const shown = globalBoard.slice(0, 10);
    drawRankRows(ctx, shown, myName);
    // If I'm not already visible among the shown rows, look further down
    // the fetched list (up to 50 — see openLeaderboard()) for my real rank;
    // if I'm not even in THAT, pin a "YOUR RANK" row below with my best
    // score so I can still see where I stand relative to the visible list,
    // instead of just vanishing off the bottom with no context at all.
    const foundIdx = globalBoard.findIndex((r) => (r.name || '').trim().toLowerCase() === myKey);
    if (myKey && foundIdx === -1) {
      const y = LB_TOP + 16 + shown.length * 44 + 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, y - 24); ctx.lineTo(W - 20, y - 24);
      ctx.stroke();
      drawRankRows(ctx, [{ rank: '50+', name: myName || 'Guardian', score: myBest }], myName);
    } else if (myKey && foundIdx >= 10) {
      // I'm ranked but outside the visible top 10 — pin my row below too.
      const y = LB_TOP + 16 + shown.length * 44 + 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, y - 24); ctx.lineTo(W - 20, y - 24);
      ctx.stroke();
      drawRankRows(ctx, [globalBoard[foundIdx]], myName);
    }
  } else if (globalStatus === 'loading') {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Loading global rankings…', W / 2, LB_TOP + 30);
    if (localList.length > 0) drawRankRows(ctx, localList, myName);
  } else if (localList.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('No runs yet — play a game to set the first record!', W / 2, LB_TOP + 50);
  } else {
    drawRankRows(ctx, localList, myName);
  }

  ctx.textAlign = 'center';
  ctx.font = `12px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(
    haveGlobal ? 'Live global rankings' : 'On-device rankings — couldn’t reach the global leaderboard',
    W / 2, NAV_Y - 12
  );

  drawBottomNav(ctx, 'leaderboard');
}
