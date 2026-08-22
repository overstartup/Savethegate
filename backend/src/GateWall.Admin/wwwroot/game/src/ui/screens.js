// Gamified dialogs — ribbon titles, glowing cards, star ratings, pulsing buttons.
// Fonts: 'Luckiest Guy' (titles) + 'Fredoka' (body), embedded free game fonts.
import { CONFIG } from '../config.js';
import { COIN_PACKS } from '../data/shop.js';
import { LEVELS, STAGE_SIZE, STAGE_COUNT, STAGE_THEMES } from '../data/levels.js';
import { UPGRADES, UPGRADE_MAX, upgradeCost } from '../data/upgrades.js';

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
  'glacial_peak', 'oasis_citadel', 'abyssal_rift', 'crystallized_forest',
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

// Bottom nav is 3 regular tabs (Upgrades / Settings on the left, Ranks on
// the right) plus a big circular PLAY button floating dead-center, elevated
// above the bar — the main call-to-action, not just another tab. FAB_GAP is
// the width reserved in the middle of the bar for it (so the two side
// groups don't overlap it); the FAB itself sits at exactly W/2 regardless
// of how the side groups are split.
const FAB_GAP = 100;
const NAV_SIDE_W = (W - FAB_GAP) / 2;
export const MENU_BUTTONS = {
  // Header bar layout rect (avatar + name area) — no longer tappable itself;
  // renaming now happens from the Settings screen. Kept for header sizing.
  name:        { x: 0, y: 0, w: W, h: 58 },
  // Coin balance pill, top-right of the header — the only tappable part of
  // the header, opens the buy-coins shop. Sized generously to always cover
  // the pill regardless of how many digits the coin balance has.
  coins:       { x: W - 160, y: 0, w: 160, h: 58 },
  upgrades:    { x: 0,                    y: NAV_Y, w: NAV_SIDE_W / 2, h: NAV_H },
  settings:    { x: NAV_SIDE_W / 2,       y: NAV_Y, w: NAV_SIDE_W / 2, h: NAV_H },
  leaderboard: { x: NAV_SIDE_W + FAB_GAP, y: NAV_Y, w: NAV_SIDE_W,     h: NAV_H },
  // Elevated hit area — taller than the bar itself so the part of the FAB
  // that pokes up above NAV_Y is still tappable.
  play:        { x: W / 2 - 36, y: NAV_Y - 36, w: 72, h: 72 },
};
const NAV_ITEMS = [
  { key: 'upgrades', icon: '⚡', label: 'UPGRADES', accent: '#ff8a3d' },
  { key: 'settings', icon: '⚙️', label: 'SETTINGS', accent: '#9ae6ff' },
  { key: 'leaderboard', icon: '🏆', label: 'RANKS', accent: '#ffd23d' },
];

// One tab-bar segment: icon glyph on top, small label underneath, a thin
// divider on the left edge (skipped for the first segment). The active tab
// gets a brighter underline so it's clear which page you're on.
function navItem(ctx, b, icon, label, accent, active, first) {
  if (!first) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + 8); ctx.lineTo(b.x, b.y + b.h - 8); ctx.stroke();
  }
  if (active) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = accent;
    ctx.fillRect(b.x + b.w * 0.2, b.y, b.w * 0.6, 3);
  }
  ctx.textAlign = 'center';
  ctx.font = `20px ${F_TITLE}`;
  ctx.fillStyle = active ? accent : 'rgba(255,255,255,0.65)';
  ctx.fillText(icon, b.x + b.w / 2, b.y + 30);
  ctx.font = `10px ${F_BODY}`;
  ctx.fillStyle = active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
  ctx.fillText(label, b.x + b.w / 2, b.y + 50);
}

// The full bottom nav bar: 3 side tabs + the central elevated PLAY fab.
// `activeKey` matches one of NAV_ITEMS[].key, or 'play', so the current
// page's tab can be highlighted.
export function drawBottomNav(ctx, activeKey) {
  ctx.save();
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(16,10,32,0.96)';
  ctx.fillRect(0, NAV_Y, W, NAV_H);
  ctx.restore();
  ctx.strokeStyle = 'rgba(127,216,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, NAV_Y); ctx.lineTo(W, NAV_Y); ctx.stroke();

  NAV_ITEMS.forEach((item, i) => {
    navItem(ctx, MENU_BUTTONS[item.key], item.icon, item.label, item.accent, item.key === activeKey, i === 0);
  });

  // Central PLAY fab — circular, elevated above the bar line.
  const active = activeKey === 'play';
  const cx = W / 2, cy = NAV_Y;
  const t = performance.now() / 1000;
  const r = 30 + (active ? Math.sin(t * 3) * 1.5 : 0);
  ctx.save();
  ctx.shadowColor = '#7fd8ff';
  ctx.shadowBlur = active ? 22 : 14;
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, active ? '#9ae6ff' : '#3fa8d6');
  grad.addColorStop(1, active ? '#4fb0e0' : '#1c6a94');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e8f9ff';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  // play triangle
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 12); ctx.lineTo(cx - 8, cy + 12); ctx.lineTo(cx + 12, cy);
  ctx.closePath(); ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `10px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('PLAY', cx, cy + r + 14);
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
// Wide left/right stagger (like a chain of floating islands on a diagonal
// route) instead of a near-straight vertical stack — this is most of what
// makes the map read as "spaced out" rather than a pile of overlapping tiles.
const NODE_ZIGZAG = 108;

// Node spacing/size is fixed to what looks good for a ~5-stage viewport,
// regardless of how many stages actually exist — this is what makes
// scrolling necessary (and correct) once a 6th+ stage is added, instead of
// silently cramming every node into the same box until they're unreadable.
const REFERENCE_VIEWPORT_STAGES = 5;

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
// reference) instead of a plain dotted line or rope bridge.
function drawStonePath(ctx, x0, y0, x1, y1, reached, pathIdx) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const px = -dy / len, py = dx / len; // perpendicular, for a little zigzag
  const step = 30;
  const count = Math.max(2, Math.round(len / step));
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const wobble = Math.sin(t * Math.PI * 3 + pathIdx) * 7;
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
    drawStonePath(ctx, a.cx, a.cy, b.cx, b.cy, i < furthestStage, i);
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

  for (let i = 0; i < 10; i++) {
    const h1 = Math.sin(i * 12.9898) * 43758.5453; const rx = h1 - Math.floor(h1);
    const h2 = Math.sin(i * 78.233) * 12543.789; const ry = h2 - Math.floor(h2);
    const x = ((rx * W + t * 6 * (1 + (i % 3))) % (W + 80)) - 40;
    const y = top + ry * (bottom - top);
    const s = 16 + (i % 3) * 6;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
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

// A 5-point gold star medal with the stage number in the center — replaces
// the old black rounded-square plaque, echoing the star-medal badges in the
// reference layout.
function drawStarMedal(ctx, cx, cy, r, label, locked, complete) {
  const spikes = 5;
  const outer = r, inner = r * 0.46;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx, cy - outer, cx, cy + outer);
  if (locked) { grad.addColorStop(0, '#8a8a96'); grad.addColorStop(1, '#5c5c68'); }
  else if (complete) { grad.addColorStop(0, '#8ff0ae'); grad.addColorStop(1, '#3fbf6f'); }
  else { grad.addColorStop(0, '#ffe98a'); grad.addColorStop(1, '#e8a53d'); }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = locked ? '#3a3a44' : '#a8781a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(r * 0.85)}px ${F_TITLE}`;
  ctx.fillStyle = locked ? 'rgba(255,255,255,0.7)' : '#3a2408';
  ctx.fillText(label, cx, cy + r * 0.32);
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

  // Star-medal stage number, above the island (like a rank badge).
  drawStarMedal(ctx, cx, cy - baseR * 0.98, size * 0.24, String(i + 1), locked, complete);

  // Clear check, upper-right of the island
  if (complete) {
    const cxb = cx + baseR * 0.85, cyb = cy - baseR * 0.75;
    ctx.fillStyle = '#3fbf6f';
    ctx.beginPath(); ctx.arc(cxb, cyb, size * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cxb - size * 0.07, cyb); ctx.lineTo(cxb - size * 0.015, cyb + size * 0.06); ctx.lineTo(cxb + size * 0.08, cyb - size * 0.07);
    ctx.stroke();
  }

  // Label under the island
  ctx.font = `10px ${F_BODY}`;
  ctx.textAlign = 'center';
  const labelY = cy + baseR * 0.7 + 20;
  if (locked) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('LOCKED', cx, labelY); }
  else if (complete) { ctx.fillStyle = '#58e07f'; ctx.fillText('CLEARED', cx, labelY); }
  else { ctx.fillStyle = '#ffd23d'; ctx.fillText(`${cleared}/${STAGE_SIZE} passed`, cx, labelY); }
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

  ctx.textAlign = 'center';
  ctx.font = `11px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(layout.scrollMax > 0 ? 'Tap a stage · drag to scroll' : 'Tap a stage to jump in', W / 2, layout.stageBottom + 14);

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
      'Defend the GateWall',
      'through 5 stages of trials.',
      'Earn coins — buy BOMBS & ANGELS',
      best > 0 ? `★ Best score: ${best} ★` : '',
    ], started ? 'CONTINUE' : 'TAP TO PLAY');

    drawCloseX(ctx, CONTINUE_CLOSE_BUTTON);
  }

  // Nav bar drawn LAST so it stays visible and tappable even while the
  // continue dialog is open — you can still jump to Upgrades/Settings/Ranks
  // without closing it first.
  drawBottomNav(ctx, 'play');

  ctx.textAlign = 'right';
  ctx.font = `10px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(GAME_VERSION, W - 10, H - NAV_H - 6);
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
    '+1 heart restored',
    '',
    `Next: ${nextName}`,
  ], 'CONTINUE', '#58e07f');
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

// --- Guardian upgrades page (permanent, bought here) -----------------
// Rows fill the page below the header, full width; no floating card, no
// close button — leave via the bottom nav bar like any other page.
const UPG_ROW_X = 16, UPG_ROW_W = W - 32, UPG_ROW_H = 116, UPG_ROW_GAP = 14, UPG_TOP = 76;
export const UPGRADE_BUTTONS = {
  buy: {
    power:    { x: UPG_ROW_X, y: UPG_TOP + (UPG_ROW_H + UPG_ROW_GAP) * 0, w: UPG_ROW_W, h: UPG_ROW_H },
    speed:    { x: UPG_ROW_X, y: UPG_TOP + (UPG_ROW_H + UPG_ROW_GAP) * 1, w: UPG_ROW_W, h: UPG_ROW_H },
    fireRate: { x: UPG_ROW_X, y: UPG_TOP + (UPG_ROW_H + UPG_ROW_GAP) * 2, w: UPG_ROW_W, h: UPG_ROW_H },
  },
};

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

export function renderUpgrades(ctx, saveData) {
  pageShell(ctx, 'GUARDIAN UPGRADES', '#7fd8ff');

  ctx.textAlign = 'center';
  ctx.font = `13px ${F_BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`You have ${saveData.coins} coins`, W / 2, 66);

  for (const key in UPGRADES) {
    const u = UPGRADES[key];
    const r = UPGRADE_BUTTONS.buy[key];
    const level = saveData.permanent[key] || 0;
    const maxed = level >= UPGRADE_MAX;
    const cost = maxed ? 0 : upgradeCost(key, level);
    const affordable = !maxed && saveData.coins >= cost;

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = affordable ? u.color : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `19px ${F_TITLE}`;
    ctx.fillStyle = u.color;
    ctx.fillText(u.label, r.x + 16, r.y + 28);

    ctx.font = `13px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(u.tagline, r.x + 16, r.y + 48);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `12px ${F_BODY}`;
    ctx.fillText(u.perLevel, r.x + 16, r.y + 64);

    // level pips
    for (let i = 0; i < UPGRADE_MAX; i++) {
      ctx.fillStyle = i < level ? u.color : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(r.x + 18 + i * 20, r.y + 88, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = maxed ? '#58e07f' : (affordable ? '#ffd23d' : '#ff9a9a');
    ctx.fillText(maxed ? 'MAXED' : `${cost}¢`, r.x + r.w - 16, r.y + r.h - 14);
  }

  drawBottomNav(ctx, 'upgrades');
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

function drawRankRows(ctx, list) {
  list.forEach((row, i) => {
    const y = LB_TOP + 16 + i * 44;
    const rankColor = i === 0 ? '#ffd23d' : i === 1 ? '#cfd8e8' : i === 2 ? '#e0a458' : 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = rankColor;
    ctx.fillText(`${i + 1}.`, 20, y);
    ctx.font = `16px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(row.name || 'Guardian', 55, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7fd8ff';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillText(String(row.score), W - 20, y);
  });
}

export function renderLeaderboard(ctx, saveData, globalBoard, globalStatus) {
  pageShell(ctx, 'TOP RANKS', '#ffd23d');

  const haveGlobal = globalStatus === 'ready' && Array.isArray(globalBoard) && globalBoard.length > 0;
  const localList = (saveData.leaderboard || []).slice(0, 10);

  if (haveGlobal) {
    drawRankRows(ctx, globalBoard.slice(0, 10));
  } else if (globalStatus === 'loading') {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Loading global rankings…', W / 2, LB_TOP + 30);
    if (localList.length > 0) drawRankRows(ctx, localList);
  } else if (localList.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('No runs yet — play a game to set the first record!', W / 2, LB_TOP + 50);
  } else {
    drawRankRows(ctx, localList);
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
