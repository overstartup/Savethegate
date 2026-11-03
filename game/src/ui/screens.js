import { SPECIES } from '../render/species.js';
// Gamified dialogs — ribbon titles, glowing cards, star ratings, pulsing buttons.
// Fonts: 'Luckiest Guy' (titles) + 'Fredoka' (body), embedded free game fonts.
import { CONFIG } from '../config.js';
import { tr, fitFont, isRtl, LANGS, getLang } from '../i18n.js';
import { cfTarget } from './coinFx.js';
import { COIN_PACKS } from '../data/shop.js';
import { LEVELS, STAGE_SIZE, STAGE_COUNT, STAGE_THEMES } from '../data/levels.js';
import { drawHeroIcon } from '../render/hero.js';
import { drawGun } from '../render/gun.js';
import { st3CardStars, st3CardHint, st3StageChip, st3DrawMapChest, st3DrawChestPop } from './levelStars.js';
import { drawUnitArt, drawRankAura, drawRankCrest, rankMetal, RANK_LOOKS } from '../render/units.js';
import { UNITS, UNIT_ORDER, unitLevel, statCost, statLabel, unitTotalLevel, unitRank, rankCap, rankProgress, RANK_STEP } from '../data/upgrades.js';
import { AB_LIST, abName, abDesc, abUnlockedAt } from '../systems/abilities.js';

export const GAME_VERSION = 'v3.1 — GateWall';
export const F_TITLE = '"Luckiest Guy", "Noto Sans Arabic", "Arial Black", Arial';
export const F_BODY = '"Fredoka", "Noto Sans Arabic", "Trebuchet MS", Arial';

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
  tileImg.src = `assets/env/island_road_${n}.webp`;
  tileImg.onload = () => { TILE_IMAGES[i] = tileImg; };
  tileImg.onerror = () => { console.error('[TILE_IMAGES] failed to load', tileImg.src); };
});

// The GateWall shield emblem (same art as the app icon), shown beside the
// wordmark on the home page. Inlined as a data URI by build-standalone.mjs.
let EMBLEM_IMG = null;
{
  const img = new Image();
  img.src = 'assets/ui/emblem.png';
  img.onload = () => { EMBLEM_IMG = img; };
}

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

// High-definition AI-crafted Shatterling enemy sprites (Grumbles, Sir Squish, Zippy, Rattles, Mossback, Bruncle)
export const ENEMY_SPRITE_NAMES = ['goblin', 'slime', 'imp', 'skeleton', 'troll', 'ogreBoss'];
export const ENEMY_SPRITES = {};
for (const name of ENEMY_SPRITE_NAMES) {
  const img = new Image();
  img.src = `assets/sprites/enemies/${name}.webp`;
  img.onload = () => { ENEMY_SPRITES[name] = img; };
}

// Stage 1 'Sea War' Ocean Horde enemy sprites (Snapper, Jelly, Urchin, Lanternfin, Pirate, Turtle, Kraken)
export const SEA_SPRITE_NAMES = ['crab', 'jelly', 'urchin', 'lanternfin', 'pirate', 'turtle', 'kraken'];
export const SEA_SPRITES = {};
for (const name of SEA_SPRITE_NAMES) {
  const img = new Image();
  img.src = `assets/sprites/sea/${name}.webp`;
  img.onload = () => {
    SEA_SPRITES[name] = img;
    if (typeof SPECIES !== 'undefined' && SPECIES[name]) {
      SPECIES[name].sprite = img;
    }
  };
}

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
  ctx.font = fitFont(ctx, title, `30px ${F_TITLE}`, ribW - 30);
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
      ctx.font = fitFont(ctx, l, `19px ${F_BODY}`, cardW - 30);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = fitFont(ctx, l, `17px ${F_BODY}`, cardW - 30);
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
  ctx.font = fitFont(ctx, footer, `22px ${F_TITLE}`, btnW - 28);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c';
  ctx.lineWidth = 4;
  ctx.strokeText(footer, W / 2, btnY + 9);
  ctx.fillText(footer, W / 2, btnY + 9);
}

export const NAV_H = 72;
export const NAV_Y = H - NAV_H;

// ---- Bottom navigation ----------------------------------------------------
// Five tabs, mobile-game style: SHOP · ARMORY · BATTLE (home, centre) ·
// REWARDS · RANKS. The open page's tab widens into a raised gold-trimmed
// tile with a big bobbing icon and its name; the others stay compact.
// Settings lives on the gear in the home header. Tab rects depend on which
// tab is open, so hit-testing goes through navHit().
export const NAV_KEYS = ['shop', 'upgrades', 'play', 'rewards', 'leaderboard'];
const NAV_ACTIVE_W = 112;

export function navRects(activeKey) {
  const act = NAV_KEYS.includes(activeKey) ? activeKey : null;
  const restW = act ? (W - NAV_ACTIVE_W) / (NAV_KEYS.length - 1) : W / NAV_KEYS.length;
  const out = {};
  let x = 0;
  for (const k of NAV_KEYS) {
    const w = k === act ? NAV_ACTIVE_W : restW;
    out[k] = { x, y: NAV_Y, w, h: NAV_H };
    x += w;
  }
  return out;
}

// Which tab (key) a tap at (x, y) lands on, or null.
export function navHit(activeKey, x, y) {
  if (y < NAV_Y - 10) return null;
  const r = navRects(activeKey);
  for (const k of NAV_KEYS) if (x >= r[k].x && x < r[k].x + r[k].w) return k;
  return null;
}

export const MENU_BUTTONS = {
  // Header bar layout rect (avatar + name area) — not tappable itself.
  name:     { x: 0, y: 0, w: W, h: 58 },
  // Coin pill (opens the shop) and the settings gear, top-right.
  coins:    { x: W - 204, y: 0, w: 150, h: 58 },
  settings: { x: W - 48, y: 9, w: 40, h: 40 },
};

// Badges the nav shows (rewards waiting, an affordable Armory upgrade);
// main.js updates them every frame.
let navBadges = { rewards: 0, save: null };
export function setNavBadges(rewards, save) { navBadges = { rewards, save }; }

function drawGearIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  const teeth = 8, rOuter = s * 0.85, rInner = s * 0.6, rHole = s * 0.32;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * 2 * i) / (teeth * 2);
    const r = i % 2 === 0 ? rOuter : rInner;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
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

function drawPlayIcon(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1c3a5c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.75); ctx.lineTo(-s * 0.5, s * 0.75); ctx.lineTo(s * 0.75, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Shared outline for the chunky tab icons.
const NAV_INK = '#1a1030';

// SHOP — a treasure chest, lid open, coins glowing inside.
function navIconShop(ctx, s, t) {
  ctx.lineWidth = 2; ctx.strokeStyle = NAV_INK; ctx.lineJoin = 'round';
  const glow = ctx.createRadialGradient(0, -s * 0.15, 1, 0, -s * 0.15, s * 0.7);
  glow.addColorStop(0, 'rgba(255,230,120,0.75)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.7, 0, Math.PI * 2); ctx.fill();
  // lid (tilted back)
  ctx.fillStyle = '#a8622e';
  ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.12); ctx.lineTo(-s * 0.5, -s * 0.62); ctx.quadraticCurveTo(0, -s * 0.85, s * 0.5, -s * 0.62); ctx.lineTo(s * 0.62, -s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
  // coins piled up
  ctx.fillStyle = '#ffd23d';
  for (const [x, y] of [[-0.28, -0.14], [0, -0.24], [0.28, -0.14], [-0.12, -0.02], [0.16, -0.02]]) {
    ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // body
  const g = ctx.createLinearGradient(0, -s * 0.1, 0, s * 0.62);
  g.addColorStop(0, '#c8783a'); g.addColorStop(1, '#7a3e18');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-s * 0.66, -s * 0.08, s * 1.32, s * 0.7, s * 0.1); ctx.fill(); ctx.stroke();
  // gold bands + lock
  ctx.fillStyle = '#ffd23d';
  for (const x of [-0.42, 0.42]) { ctx.beginPath(); ctx.rect(x * s - s * 0.07, -s * 0.08, s * 0.14, s * 0.7); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(-s * 0.13, s * 0.06, s * 0.26, s * 0.24, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = NAV_INK; ctx.beginPath(); ctx.arc(0, s * 0.16, s * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  const tw = (t * 1.2) % 3;
  if (tw < 1) { ctx.globalAlpha *= 1 - tw; ctx.beginPath(); ctx.arc(s * 0.26, -s * 0.3, s * 0.06, 0, Math.PI * 2); ctx.fill(); }
}

// ARMORY — a blue kite shield with a gold rim over a sword.
function navIconArmory(ctx, s) {
  ctx.lineWidth = 2; ctx.strokeStyle = NAV_INK; ctx.lineJoin = 'round';
  ctx.save(); ctx.rotate(-0.75);
  ctx.fillStyle = '#e8eef8';
  ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.95); ctx.lineTo(0, -s * 1.08); ctx.lineTo(s * 0.08, -s * 0.95); ctx.lineTo(s * 0.08, s * 0.5); ctx.lineTo(-s * 0.08, s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.roundRect(-s * 0.3, s * 0.48, s * 0.6, s * 0.12, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a4a1a'; ctx.beginPath(); ctx.rect(-s * 0.06, s * 0.6, s * 0.12, s * 0.3); ctx.fill(); ctx.stroke();
  ctx.restore();
  const sh = () => {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.62);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.55, s * 0.5, -s * 0.15);
    ctx.quadraticCurveTo(s * 0.42, s * 0.42, 0, s * 0.7);
    ctx.quadraticCurveTo(-s * 0.42, s * 0.42, -s * 0.5, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.55, 0, -s * 0.62); ctx.closePath();
  };
  ctx.fillStyle = '#ffd23d'; sh(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.scale(0.76, 0.76); ctx.translate(0, s * 0.03);
  const f = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.7);
  f.addColorStop(0, '#6ac8ff'); f.addColorStop(1, '#2a4ab8');
  ctx.fillStyle = f; sh(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.9;
  ctx.beginPath(); ctx.moveTo(0, -s * 0.28); ctx.lineTo(s * 0.12, 0); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.12, 0); ctx.closePath(); ctx.fill();
}

// BATTLE — two crossed swords with gold hilts, sparks at the cross.
function navIconBattle(ctx, s, t) {
  ctx.lineWidth = 2; ctx.strokeStyle = NAV_INK; ctx.lineJoin = 'round';
  for (const d of [-1, 1]) {
    ctx.save(); ctx.rotate(d * 0.78);
    const bg = ctx.createLinearGradient(-s * 0.1, 0, s * 0.1, 0);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#9fb0c6');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.72); ctx.lineTo(0, -s * 0.92); ctx.lineTo(s * 0.1, -s * 0.72); ctx.lineTo(s * 0.1, s * 0.38); ctx.lineTo(-s * 0.1, s * 0.38); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.roundRect(-s * 0.34, s * 0.36, s * 0.68, s * 0.13, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a3a8a'; ctx.beginPath(); ctx.rect(-s * 0.07, s * 0.49, s * 0.14, s * 0.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.arc(0, s * 0.86, s * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const p = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.fillStyle = `rgba(255,240,170,${0.5 + 0.5 * p})`;
  armStar(ctx, 0, -s * 0.12, s * 0.07 * (0.8 + p * 0.4));
}

// RANKS — a gold trophy cup with a star.
function navIconRanks(ctx, s) {
  ctx.lineWidth = 2; ctx.strokeStyle = NAV_INK; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.5); ctx.quadraticCurveTo(-s * 0.95, -s * 0.5, -s * 0.5, s * 0.05);
  ctx.moveTo(s * 0.5, -s * 0.5); ctx.quadraticCurveTo(s * 0.95, -s * 0.5, s * 0.5, s * 0.05);
  ctx.lineWidth = s * 0.14; ctx.strokeStyle = '#e8a82a'; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = NAV_INK;
  const g = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(0.5, '#ffd23d'); g.addColorStop(1, '#c8861a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-s * 0.58, -s * 0.66); ctx.lineTo(s * 0.58, -s * 0.66);
  ctx.quadraticCurveTo(s * 0.55, s * 0.18, 0, s * 0.26); ctx.quadraticCurveTo(-s * 0.55, s * 0.18, -s * 0.58, -s * 0.66);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-s * 0.1, s * 0.26, s * 0.2, s * 0.22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a3a8a';
  ctx.beginPath(); ctx.roundRect(-s * 0.4, s * 0.48, s * 0.8, s * 0.22, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  armStar(ctx, 0, -s * 0.24, s * 0.09);
}

const NAV_ITEMS = [
  { key: 'shop', label: 'm.nav.shop', draw: (ctx, s, t) => navIconShop(ctx, s, t) },
  { key: 'upgrades', label: 'm.nav.armory', draw: (ctx, s) => navIconArmory(ctx, s) },
  { key: 'play', label: 'm.nav.battle', draw: (ctx, s, t) => navIconBattle(ctx, s, t) },
  { key: 'rewards', label: 'm.nav.rewards', draw: (ctx, s, t) => rwGiftIcon(ctx, 0, s * 0.1, s * 1.6, t) },
  { key: 'leaderboard', label: 'm.nav.ranks', draw: (ctx, s) => navIconRanks(ctx, s) },
];

function navBadge(ctx, x, y, n, t) {
  const pop = 1 + 0.08 * Math.sin(t * 5);
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.fillStyle = '#e0483d'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  armText(ctx, n === true ? '!' : String(n), 0, 4.5, `12px ${F_TITLE}`, '#ffffff', 'center', 0);
  ctx.restore();
}

// "An upgrade is ready": a green disc with a white up-arrow that bobs and
// glows (same look as the arrows on the Armory cards) — good news, not a
// warning.
function navUpgradeBadge(ctx, x, y, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.save();
  ctx.translate(x, y - 1.5 * pulse);
  ctx.shadowColor = '#58e07f'; ctx.shadowBlur = 6 + 8 * pulse;
  ctx.fillStyle = '#2fbf5a'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(5, -0.5); ctx.lineTo(2, -0.5); ctx.lineTo(2, 5);
  ctx.lineTo(-2, 5); ctx.lineTo(-2, -0.5); ctx.lineTo(-5, -0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function navTab(ctx, r, item, active, t) {
  const cx = r.x + r.w / 2;
  if (active) {
    // raised tile poking above the bar
    const top = NAV_Y - 10;
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,61,0.55)'; ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, '#6a58d8'); g.addColorStop(0.55, '#3a2a98'); g.addColorStop(1, '#22175e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(r.x + 3, top, r.w - 6, H - top + 12, [16, 16, 0, 0]); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(r.x + 3, top, r.w - 6, H - top + 12, [16, 16, 0, 0]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r.x + 18, top + 4); ctx.lineTo(r.x + r.w - 18, top + 4); ctx.stroke();
    // light rays behind the icon
    ctx.save();
    ctx.beginPath(); ctx.roundRect(r.x + 3, top, r.w - 6, H - top, [16, 16, 0, 0]); ctx.clip();
    ctx.translate(cx, NAV_Y + 20); ctx.rotate(t * 0.4);
    ctx.fillStyle = 'rgba(255,230,150,0.12)';
    for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -60); ctx.lineTo(8, -60); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.translate(cx, NAV_Y + 20 + Math.sin(t * 3) * 1.5);
    item.draw(ctx, 22, t);
    ctx.restore();
    const lbl = tr(item.label);
    armText(ctx, lbl, cx, NAV_Y + 60, fitFont(ctx, lbl, `14px ${F_TITLE}`, r.w - 14), '#ffe98a', 'center', 4);
  } else {
    ctx.save(); ctx.translate(cx, NAV_Y + 27); ctx.globalAlpha = 0.95;
    item.draw(ctx, 18, t);
    ctx.restore();
    const lbl = tr(item.label);
    armText(ctx, lbl, cx, NAV_Y + 60, fitFont(ctx, lbl, `10px ${F_TITLE}`, r.w - 6), 'rgba(220,210,255,0.75)', 'center', 3);
  }
  // badges
  const bx = cx + (active ? 26 : 18), by = NAV_Y + (active ? 2 : 12);
  if (item.key === 'rewards' && navBadges.rewards > 0) navBadge(ctx, bx, by, navBadges.rewards, t);
  if (item.key === 'upgrades' && navBadges.save && UNIT_ORDER.some((u) => unitAffordable(navBadges.save, u))) navUpgradeBadge(ctx, bx, by, t);
}

// activeKey: one of NAV_KEYS, or null on pages without a tab (Settings).
export function drawBottomNav(ctx, activeKey) {
  const t = performance.now() / 1000;
  const rects = navRects(activeKey);

  ctx.save();
  ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
  const barGrad = ctx.createLinearGradient(0, NAV_Y, 0, H);
  barGrad.addColorStop(0, '#2c1e5a');
  barGrad.addColorStop(1, '#120a2a');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, NAV_Y, W, NAV_H);
  ctx.restore();
  // gold trim along the top edge, and grooves between tabs
  ctx.fillStyle = '#c8962a'; ctx.fillRect(0, NAV_Y, W, 3);
  ctx.fillStyle = 'rgba(255,240,190,0.55)'; ctx.fillRect(0, NAV_Y, W, 1);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (const k of NAV_KEYS.slice(1)) {
    const x = rects[k].x;
    ctx.beginPath(); ctx.moveTo(x, NAV_Y + 12); ctx.lineTo(x, H - 10); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (const k of NAV_KEYS.slice(1)) {
    const x = rects[k].x + 1.5;
    ctx.beginPath(); ctx.moveTo(x, NAV_Y + 12); ctx.lineTo(x, H - 10); ctx.stroke();
  }

  for (const item of NAV_ITEMS) if (item.key !== activeKey) navTab(ctx, rects[item.key], item, false, t);
  for (const item of NAV_ITEMS) if (item.key === activeKey) navTab(ctx, rects[item.key], item, true, t);
}

// Settings gear for page headers (tap target MENU_BUTTONS.settings).
export function drawSettingsGear(ctx) {
  const b = MENU_BUTTONS.settings, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.fillStyle = 'rgba(10,6,24,0.6)'; ctx.strokeStyle = 'rgba(154,230,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  drawGearIcon(ctx, cx, cy, 12, '#d8e4f4');
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

// Small PLAY/CONTINUE pill sitting just under the island the player is on
// — it scrolls with the map. main.js hit-tests homePlayRect() (same rect).
const MENU_PLAY_PAD = 44;
export function homePlayRect(scrollY, levelIndex) {
  const n = homeLayout(scrollY).nodes[Math.min(STAGE_COUNT - 1, Math.floor(levelIndex / STAGE_SIZE))];
  return { x: n.cx - 54, y: n.cy + n.size * 1.02, w: 108, h: 28 };
}

export function homeLayout(scrollY = 0) {
  const stageTop = HOME_STAGE_TOP;
  const stageBottom = NAV_Y - 26;
  const avail = Math.max(0, stageBottom - stageTop);
  const spacing = avail / REFERENCE_VIEWPORT_STAGES;
  // "size" is a hit-test/collision reference, deliberately smaller than the
  // island artwork itself is drawn (see drawStageNode's TILE_DRAW_SCALE) —
  // keeping it modest is what leaves visible gaps between consecutive nodes.
  const size = Math.max(50, Math.min(66, spacing * 0.62));
  // Extra room at the end for the PLAY pill under the last island.
  const contentHeight = spacing * STAGE_COUNT + MENU_PLAY_PAD;
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
// One sky for the whole home page: starry dusk behind the header/logo,
// brightening into daytime blue where the islands float. Defined in
// absolute page coordinates so any sub-rect painted with it lines up.
function homeSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, NAV_Y);
  g.addColorStop(0, '#1d1440');
  g.addColorStop(0.13, '#302a70');
  g.addColorStop(0.25, '#5677c4');
  g.addColorStop(0.38, '#8fd0ee');
  g.addColorStop(0.65, '#ade2f5');
  g.addColorStop(1, '#d4f0f8');
  return g;
}

function drawOceanBackdrop(ctx, top, bottom, t) {
  ctx.fillStyle = homeSky(ctx);
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
// A stage name drawn once into its own small canvas (2x for sharpness), in
// the title style: bold, dark outline, soft shadow, warm cream fill.
// Cached per name/size/state. `lw` is its width in logical px, `k` the scale.
const stageNameCache = new Map();
function stageNameImage(name, size, locked) {
  const key = `${name}|${size}|${locked ? 1 : 0}`;
  let c = stageNameCache.get(key);
  if (c) return c;
  const k = 2, pad = 6;
  c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `bold ${size}px ${F_TITLE}`;
  g.font = font;
  const tw = g.measureText(name).width;
  c.lw = tw + pad * 2;
  c.k = k;
  c.width = Math.ceil(c.lw * k);
  c.height = Math.ceil(size * 1.9 * k);
  g.scale(k, k);
  g.font = font;
  g.direction = 'rtl';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const x = c.lw / 2, y = size * 0.95;
  g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 4; g.shadowOffsetY = 1.2;
  g.lineWidth = 4;
  g.strokeStyle = locked ? 'rgba(30,26,40,0.9)' : 'rgba(36,20,10,0.9)';
  g.strokeText(name, x, y);
  g.shadowColor = 'transparent';
  g.fillStyle = locked ? 'rgba(255,255,255,0.8)' : '#ffe9a8';
  g.fillText(name, x, y);
  // keep it only once the web fonts are in, or it would stay in a fallback font
  if (!document.fonts || document.fonts.status === 'loaded') stageNameCache.set(key, c);
  return c;
}

function drawStageNameBanner(ctx, cx, peakY, radius, name, locked) {
  ctx.save();
  ctx.font = `bold ${Math.round(radius * 0.19)}px ${F_TITLE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const arcCenterY = peakY + radius;

  // Arabic/Persian letters join, so they can't be set one by one on the
  // arc. Instead the whole name is drawn once (same bold, outlined look as
  // the Latin titles) and that picture is bent onto the arc in thin
  // vertical slices, which keeps the letters joined.
  if (isRtl()) {
    const img = stageNameImage(name, Math.round(radius * 0.21), locked);
    const total = Math.min(Math.PI * 0.85, img.lw / radius);
    const SL = 2; // slice width in canvas px
    for (let sx = 0; sx < img.width; sx += SL) {
      const a = -Math.PI / 2 - total / 2 + ((sx + SL / 2) / img.width) * total;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * radius, arcCenterY + Math.sin(a) * radius);
      ctx.rotate(a + Math.PI / 2);
      const dw = (SL / img.k) * (total * radius / img.lw) + 0.35; // tiny overlap, no seams
      ctx.drawImage(img, sx, 0, SL, img.height, -dw / 2, -img.height / img.k / 2, dw, img.height / img.k);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

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

// Locked island: a turning magic seal (a rune ring with orbiting sparks and
// a soft shimmer sweeping across) and a gold padlock that bobs. The very
// next island to unlock glows brighter.
function drawStageSeal(ctx, cx, cy, size, t, i, next) {
  const r = size * 0.95, ry = size * 0.42, py = cy + size * 0.12;
  const glow = next ? 1 : 0.6;
  ctx.save();
  // soft shimmer dome
  const sweep = ((t * 0.35 + i * 0.27) % 1) * 2 - 0.5;
  const sg = ctx.createLinearGradient(cx - r, py - r, cx + r, py + r);
  const clamp01 = (v) => Math.min(1, Math.max(0, v)); // stops must stay in 0..1
  sg.addColorStop(clamp01(sweep - 0.12), 'rgba(160,140,255,0)');
  sg.addColorStop(clamp01(sweep), `rgba(200,190,255,${0.22 * glow})`);
  sg.addColorStop(clamp01(sweep + 0.12), 'rgba(160,140,255,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, size * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  // the rune ring, turning
  ctx.translate(cx, py);
  ctx.scale(1, ry / r);
  ctx.shadowColor = next ? '#bfa6ff' : '#8a7ad8'; ctx.shadowBlur = 10 * glow;
  ctx.strokeStyle = `rgba(190,170,255,${0.75 * glow})`; ctx.lineWidth = 2.2;
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -t * 18;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(190,170,255,${0.35 * glow})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
  // rune ticks around the ring
  ctx.fillStyle = `rgba(230,220,255,${0.8 * glow})`;
  for (let k = 0; k < 8; k++) {
    const a = t * 0.6 + k * Math.PI / 4;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  // sparks orbiting the ring
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
  for (let k = 0; k < 3; k++) {
    const a = -t * 1.4 + k * (Math.PI * 2 / 3) + i;
    ctx.fillStyle = k === 0 ? '#ffe98a' : '#e2d8ff';
    ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // gold padlock, bobbing, with a pulse when it is the next one to open
  const ly = cy + size * 0.02 + Math.sin(t * 2.2 + i) * 2.5, s = size * 0.2;
  ctx.save();
  ctx.translate(cx, ly);
  if (next) { const p = 1 + 0.06 * Math.sin(t * 4); ctx.scale(p, p); }
  ctx.shadowColor = next ? '#ffd23d' : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = next ? 14 : 6;
  ctx.strokeStyle = '#b8862a'; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -s * 0.35, s * 0.55, Math.PI, 0); ctx.stroke(); // shackle
  const lg = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.9);
  lg.addColorStop(0, '#ffe98a'); lg.addColorStop(1, '#d08a1a');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.roundRect(-s * 0.85, -s * 0.4, s * 1.7, s * 1.3, s * 0.3); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#7a4a0c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-s * 0.85, -s * 0.4, s * 1.7, s * 1.3, s * 0.3); ctx.stroke();
  ctx.fillStyle = '#5a3008'; // keyhole
  ctx.beginPath(); ctx.arc(0, s * 0.12, s * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-s * 0.07, s * 0.15, s * 0.14, s * 0.38);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.32, s * 1.4, s * 0.25, s * 0.12); ctx.fill();
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
  const { cx, size } = n;
  const cy = n.cy + Math.sin(t * 1.3 + i * 1.7) * 3; // islands float
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
    // locked islands keep their colours, just a little dimmed behind a seal
    if (locked) ctx.filter = 'saturate(0.85) brightness(0.7)';
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

  if (locked) drawStageSeal(ctx, cx, cy, size, t, i, stageStart === Math.ceil((furthestLevelIndex + 1) / STAGE_SIZE) * STAGE_SIZE);

  // Carved name, arced in a shallow dome right at the top edge of the
  // island art (peaks at the center, curves down at the ends). Sits a
  // bit higher above the island than before (was 1.05).
  drawStageNameBanner(ctx, cx, cy - baseR * 1.3, size * 1.35, theme.name, locked);

  // The stage's real level stars just above the name: "★ 17/30"
  // (best 1-3 per level, see ui/levelStars.js).
  st3StageChip(ctx, cx, cy - baseR * 1.85, size, i, locked);

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
// They live in the dusk band at the top of the home sky.
const MENU_STARS = Array.from({ length: 30 }, (_, i) => {
  // Deterministic pseudo-random spread using a simple hash of i, so the
  // field looks scattered but never changes between renders.
  const h1 = Math.sin(i * 12.9898) * 43758.5453; const rx = h1 - Math.floor(h1);
  const h2 = Math.sin(i * 78.233) * 12543.789; const ry = h2 - Math.floor(h2);
  const h3 = Math.sin(i * 37.719) * 5678.123; const rp = (h3 - Math.floor(h3)) * Math.PI * 2;
  return { x: rx * W, y: 4 + ry * 120, r: 0.6 + ((i * 7) % 5) * 0.3, phase: rp };
});

// Where the stage map fades out under the logo (see renderMenu).
const HOME_FADE_TOP = 118, HOME_FADE_H = 18;

// Re-paints the dusk sky over the top of the page after the map is drawn,
// so islands scrolled upward fade out softly under the logo instead of
// being chopped by a hard clip edge. Then the twinkling stars + a soft glow
// behind the emblem.
function drawMenuAtmosphere(ctx, t) {
  ctx.fillStyle = homeSky(ctx);
  ctx.fillRect(0, 0, W, HOME_FADE_TOP);
  ctx.save();
  for (let i = 0; i < HOME_FADE_H; i++) {
    ctx.globalAlpha = 1 - (i + 1) / (HOME_FADE_H + 1);
    ctx.fillRect(0, HOME_FADE_TOP + i, W, 1);
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#e4f2ff';
  for (const s of MENU_STARS) {
    const tw = 0.55 + Math.sin(t * 1.6 + s.phase) * 0.45;
    ctx.globalAlpha = Math.max(0, tw * (1 - s.y / 135));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(W / 2, 98, 8, W / 2, 98, 170);
  glow.addColorStop(0, 'rgba(255,214,140,0.20)');
  glow.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 20, W, 160);
}

// Small coin glyph shared by the header pill and the PLAY button.
export function drawCoinGlyph(ctx, cx, cy, r) {
  ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#a8781a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a8781a'; ctx.font = `bold ${Math.round(r * 1.25)}px Arial`; ctx.textAlign = 'center';
  ctx.fillText('¢', cx, cy + r * 0.45);
}

// Header: a glass strip over the dusk sky. Left: player chip (avatar disc +
// name + where they are in the campaign). Right: coin pill with a green +
// (same look as the in-run HUD coin counter), the tap target for the shop.
function drawHomeHeader(ctx, playerName, coins, stageNum, levelInStage) {
  const hh = MENU_BUTTONS.name.h;
  ctx.fillStyle = 'rgba(12,8,30,0.38)';
  ctx.fillRect(0, 0, W, hh);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, hh - 0.5); ctx.lineTo(W, hh - 0.5); ctx.stroke();

  // Player chip
  const name = playerName || tr('m.hdr.guardian');
  const avR = 17, avCx = 12 + avR, avCy = hh / 2;
  ctx.font = `15px ${F_BODY}`;
  const nameW = Math.min(150, ctx.measureText(name).width);
  const chipW = avR * 2 + 22 + Math.max(nameW, 78);
  ctx.fillStyle = 'rgba(10,6,24,0.5)';
  ctx.strokeStyle = 'rgba(154,230,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(8, avCy - 21, chipW, 42, 21); ctx.fill(); ctx.stroke();

  const ring = ctx.createLinearGradient(0, avCy - avR, 0, avCy + avR);
  ring.addColorStop(0, '#ffe89a'); ring.addColorStop(1, '#c98a1c');
  ctx.fillStyle = ring;
  ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.fill();
  const avGrad = ctx.createRadialGradient(avCx - 5, avCy - 5, 2, avCx, avCy, avR - 3);
  avGrad.addColorStop(0, '#bdeeff'); avGrad.addColorStop(1, '#3f7fd0');
  ctx.fillStyle = avGrad;
  ctx.beginPath(); ctx.arc(avCx, avCy, avR - 3, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `17px ${F_TITLE}`;
  ctx.fillStyle = '#0d1b2a';
  ctx.fillText(name.charAt(0).toUpperCase(), avCx, avCy + 6);

  ctx.textAlign = 'left';
  const tx = avCx + avR + 9;
  ctx.font = `15px ${F_BODY}`;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.beginPath(); ctx.rect(tx, 0, 150, hh); ctx.clip();
  ctx.fillText(name, tx, avCy - 1);
  ctx.restore();
  ctx.font = `10px ${F_BODY}`;
  ctx.fillStyle = '#9ae6ff';
  const whereStr = tr('m.hdr.where', { s: stageNum, l: levelInStage });
  ctx.font = fitFont(ctx, whereStr, `10px ${F_BODY}`, chipW - (tx - 8) - 8);
  ctx.fillText(whereStr, tx, avCy + 13);

  // Coin pill + green "+"
  const coinsStr = String(coins);
  ctx.font = `16px ${F_TITLE}`;
  const pillH = 34;
  const pillW = Math.max(100, ctx.measureText(coinsStr).width + 78);
  const pillX = W - pillW - 56, pillY = hh / 2 - pillH / 2;
  ctx.fillStyle = 'rgba(10,6,24,0.6)';
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2); ctx.fill(); ctx.stroke();
  drawCoinGlyph(ctx, pillX + 18, pillY + pillH / 2, 10);
  cfTarget(pillX + 18, pillY + pillH / 2);
  ctx.textAlign = 'left';
  ctx.font = `16px ${F_TITLE}`;
  ctx.fillStyle = '#ffe98a';
  ctx.fillText(coinsStr, pillX + 34, pillY + pillH / 2 + 6);
  const pcx = pillX + pillW - 17, pcy = pillY + pillH / 2;
  ctx.fillStyle = '#3fbf6f'; ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pcx, pcy, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pcx - 5.5, pcy); ctx.lineTo(pcx + 5.5, pcy); ctx.moveTo(pcx, pcy - 5.5); ctx.lineTo(pcx, pcy + 5.5); ctx.stroke();
  ctx.lineCap = 'butt';
  drawSettingsGear(ctx);
}

// Logo lockup: the shield emblem (gently bobbing) beside the GateWall
// wordmark, with a small tagline underneath.
function drawHomeLogo(ctx, t) {
  const emS = 60, gap = 8, baseY = 106;
  ctx.font = `38px ${F_TITLE}`;
  const tw = ctx.measureText('GateWall').width;
  const x0 = W / 2 - (emS + gap + tw) / 2;

  if (EMBLEM_IMG) {
    const bob = Math.sin(t * 2) * 2.5;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.drawImage(EMBLEM_IMG, x0, baseY - emS + 17 + bob, emS, emS);
    ctx.restore();
  }

  const tx = x0 + emS + gap;
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1238';
  ctx.lineWidth = 8;
  ctx.strokeText('GateWall', tx, baseY);
  const lg = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 2);
  lg.addColorStop(0, '#fff6d6');
  lg.addColorStop(0.5, '#ffd86b');
  lg.addColorStop(1, '#e8892a');
  ctx.fillStyle = lg;
  ctx.fillText('GateWall', tx, baseY);

  ctx.textAlign = 'center';
  ctx.font = `11px ${F_BODY}`;
  try { ctx.letterSpacing = isRtl() ? '0px' : '3px'; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(214,236,255,0.85)';
  ctx.fillText(tr('m.logo.tag'), tx + tw / 2, baseY + 18);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

// The primary action: a compact PLAY/CONTINUE pill tucked under the
// current island, with a little notch pointing up at it and a level chip.
function drawHomePlayButton(ctx, t, r, levelInStage, started) {
  const bob = Math.sin(t * 3) * 1.5;
  const x = r.x, y = r.y + bob, w = r.w, h = r.h, cx = x + w / 2;
  ctx.save();
  // soft glow underneath
  ctx.shadowColor = 'rgba(88,224,127,0.75)'; ctx.shadowBlur = 10 + 4 * Math.sin(t * 3.5);
  ctx.fillStyle = '#1d7a3c';
  ctx.beginPath(); ctx.roundRect(x, y + 3, w, h, h / 2); ctx.fill();
  ctx.restore();
  // the notch pointing up at the island
  ctx.fillStyle = '#7dfaa5';
  ctx.beginPath(); ctx.moveTo(cx - 7, y + 1); ctx.lineTo(cx, y - 6); ctx.lineTo(cx + 7, y + 1); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#7dfaa5'); g.addColorStop(1, '#2fae55');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.roundRect(x + 8, y + 3, w - 16, h * 0.3, h * 0.15); ctx.fill();
  // play glyph, label, level chip
  drawPlayIcon(ctx, x + 15, y + h / 2, 6, '#ffffff');
  const label = tr(started ? 'm.play.continue' : 'm.play.play');
  armText(ctx, label, x + 12 + (w - 40) / 2 + 6, y + h / 2 + 4.5, fitFont(ctx, label, `13px ${F_TITLE}`, w - 52), '#ffffff', 'center', 3);
  ctx.fillStyle = 'rgba(14,60,30,0.5)';
  ctx.beginPath(); ctx.roundRect(x + w - 26, y + 5, 20, h - 10, 7); ctx.fill();
  armText(ctx, String(levelInStage), x + w - 16, y + h / 2 + 4, `11px ${F_TITLE}`, '#ffffff', 'center', 2);
}

export function renderMenu(ctx, best, playerName, coins = 0, progressLevelIndex = 0, continueDismissed = false, mapScrollY = 0) {
  const t = performance.now() / 1000;

  // Where the player currently stands.
  const idx = Math.max(0, Math.min(LEVELS.length - 1, progressLevelIndex));
  const stageNum = Math.floor(idx / STAGE_SIZE) + 1;
  const levelInStage = (idx % STAGE_SIZE) + 1;
  const levelName = LEVELS[idx].name;
  const started = idx > 0;

  const layout = homeLayout(mapScrollY);

  // Island-chain stage map on the shared home sky. Clipped to the area
  // between the logo and the nav bar; drawMenuAtmosphere() then repaints
  // the dusk sky over the top so islands scrolled upward fade out softly.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOME_FADE_TOP, W, NAV_Y - HOME_FADE_TOP);
  ctx.clip();
  drawOceanBackdrop(ctx, HOME_FADE_TOP, NAV_Y, t);
  drawStagePath(ctx, layout.nodes, idx);
  layout.nodes.forEach((n, i) => drawStageNode(ctx, n, i, idx, t));
  if (continueDismissed) drawHomePlayButton(ctx, t, homePlayRect(mapScrollY, idx), levelInStage, started);
  ctx.restore();

  drawMenuAtmosphere(ctx, t);
  drawHomeHeader(ctx, playerName, coins, stageNum, levelInStage);
  drawHomeLogo(ctx, t);
  if (continueDismissed) st3DrawMapChest(ctx, t); // star chest (ui/levelStars.js)

  // Scroll affordance — a thin track + thumb on the right edge of the map,
  // only shown once there's actually more than one screenful of stages.
  if (layout.scrollMax > 0) {
    const trackX = W - 8, trackY = layout.stageTop - 6;
    const trackH = NAV_Y - 20 - trackY;
    ctx.fillStyle = 'rgba(20,13,40,0.18)';
    ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
    const thumbH = Math.max(24, trackH * (trackH / (trackH + layout.scrollMax)));
    const thumbY = trackY + (trackH - thumbH) * (layout.scrollY / layout.scrollMax);
    ctx.fillStyle = 'rgba(48,42,112,0.6)';
    ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
  }


  if (!continueDismissed) {
    // Same big dialog as GAME OVER / VICTORY / LEVEL CLEAR (ribbon banner,
    // dim background, pulsing button) — just with a close X added so it
    // isn't a hard blocker like those terminal screens are.
    panel(ctx, tr(started ? 'm.cont.title' : 'm.howto.title'), started ? [
      tr('m.cont.progress', { s: stageNum, sn: STAGE_COUNT, l: levelInStage, ln: STAGE_SIZE }),
      `⚔ ${levelName}`,
      '',
      tr('m.howto.fly1'),
      tr('m.howto.fly2'),
      best > 0 ? tr('m.best.score', { n: best }) : '',
    ] : [
      tr('m.howto.fly1'),
      tr('m.howto.fly2'),
      tr('m.howto.defend'),
      tr('m.howto.gems'),
      tr('m.howto.fever'),
      best > 0 ? tr('m.best.score', { n: best }) : '',
    ], tr(started ? 'm.play.continue' : 'm.cont.tap'));

    drawCloseX(ctx, CONTINUE_CLOSE_BUTTON);
  }

  // Nav bar drawn LAST so it stays visible and tappable even while the
  // continue dialog is open — you can still jump to Upgrades/Settings/Ranks
  // without closing it first.
  drawBottomNav(ctx, 'play');
  st3DrawChestPop(ctx, t); // star chest dialog, when open
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
  const placeHint = tr('m.place.hint');
  ctx.font = fitFont(ctx, placeHint, `14px ${F_BODY}`, W - 20);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(placeHint, W / 2, 76);

  const b = PLACEMENT_CONTINUE_BUTTON;
  ctx.fillStyle = '#3fbf6f';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
  const placeCont = tr('m.play.continue');
  ctx.font = fitFont(ctx, placeCont, `17px ${F_TITLE}`, b.w - 16);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 3;
  ctx.strokeText(placeCont, b.x + b.w / 2, b.y + b.h / 2 + 6);
  ctx.fillText(placeCont, b.x + b.w / 2, b.y + b.h / 2 + 6);
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
  const pauseTitle = tr('m.pause.title');
  ctx.font = fitFont(ctx, pauseTitle, `30px ${F_TITLE}`, c.w - 100);
  ctx.fillStyle = '#7fd8ff';
  ctx.strokeStyle = '#1c3a5c'; ctx.lineWidth = 5;
  ctx.strokeText(pauseTitle, W / 2, c.y + 52);
  ctx.fillText(pauseTitle, W / 2, c.y + 52);

  const pauseSub = tr('m.pause.sub');
  ctx.font = fitFont(ctx, pauseSub, `14px ${F_BODY}`, c.w - 24);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(pauseSub, W / 2, c.y + 90);

  const rb = PAUSE_BUTTONS.resume;
  ctx.fillStyle = '#3fbf6f';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(rb.x, rb.y, rb.w, rb.h, 14); ctx.fill(); ctx.stroke();
  const pauseCont = tr('m.play.continue');
  ctx.font = fitFont(ctx, pauseCont, `17px ${F_TITLE}`, rb.w - 16);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1d7a3c'; ctx.lineWidth = 3;
  ctx.strokeText(pauseCont, rb.x + rb.w / 2, rb.y + rb.h / 2 + 6);
  ctx.fillText(pauseCont, rb.x + rb.w / 2, rb.y + rb.h / 2 + 6);

  const ex = PAUSE_BUTTONS.exit;
  ctx.fillStyle = '#e0483d';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(ex.x, ex.y, ex.w, ex.h, 14); ctx.fill(); ctx.stroke();
  const pauseExit = tr('m.exit');
  ctx.font = fitFont(ctx, pauseExit, `17px ${F_TITLE}`, ex.w - 16);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 3;
  ctx.strokeText(pauseExit, ex.x + ex.w / 2, ex.y + ex.h / 2 + 6);
  ctx.fillText(pauseExit, ex.x + ex.w / 2, ex.y + ex.h / 2 + 6);
}

// Level-clear celebration timeline in seconds (main.js tickLevelClear runs
// the clock and moves on at `end`; a tap jumps to `fade`).
export const LC_TIMES = {
  pop: 0.35,                  // card springs in
  count: [0.45, 1.45],        // points count up
  coinsFly: 0.9,              // first coin leaves the card…
  coinGap: 0.09,              // …one more every this many seconds
  coinCount: 10,
  coinsLand: 0.9 + 0.65,      // flight time 0.65s → first landing
  fade: 3.7, end: 4.2,        // fade to black, then the next level
};
const LC_CARD = { x: 30, y: 196, w: W - 60, h: 282 };

function lcEase(k) { k = Math.max(0, Math.min(1, k)); return 1 - Math.pow(1 - k, 3); }
function lcBack(k) { k = Math.max(0, Math.min(1, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }

export function renderLevelClear(ctx, state, nextName, lc) {
  lc = lc || { t: 9, from: 0, coins: state.levelCoins || 0 };
  const T = LC_TIMES, lt = lc.t, now = performance.now() / 1000;
  const levelInStage = ((state.spawner.level - 1) % STAGE_SIZE) + 1;
  const isStageClear = levelInStage === STAGE_SIZE;
  const stageNum = Math.ceil(state.spawner.level / STAGE_SIZE);
  const c = LC_CARD, cx = W / 2;

  ctx.fillStyle = `rgba(8,4,20,${0.55 * lcEase(lt / 0.3)})`;
  ctx.fillRect(0, 0, W, H);

  // golden rays turning behind the card
  ctx.save();
  ctx.globalAlpha = 0.35 * lcEase(lt / 0.5);
  ctx.translate(cx, c.y + 40);
  ctx.rotate(now * 0.25);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const g = ctx.createLinearGradient(0, 0, 0, -320);
    g.addColorStop(0, 'rgba(255,210,61,0.9)'); g.addColorStop(1, 'rgba(255,210,61,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, -320); ctx.lineTo(26, -320); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // confetti raining over the whole screen
  const cols = ['#ffd23d', '#ff5c7a', '#58e07f', '#7fd8ff', '#b48aff', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const seed = i * 97.13;
    const fall = 90 + (seed % 70);
    const y = -20 + (lt * fall + (seed * 7) % 260) - 40;
    if (y > H + 10 || lt < 0.1) continue;
    const x = (seed * 13.7) % W + Math.sin(lt * 2 + i) * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lt * (2 + (i % 5)) + i);
    ctx.fillStyle = cols[i % cols.length];
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-4, -2, 8, 4 * Math.abs(Math.cos(lt * 5 + i)) + 1);
    ctx.restore();
  }

  // the card springs in
  const pop = lcBack(lt / T.pop);
  ctx.save();
  ctx.translate(cx, c.y + c.h / 2); ctx.scale(pop, pop); ctx.translate(-cx, -(c.y + c.h / 2));
  ctx.save();
  ctx.shadowColor = '#58e07f'; ctx.shadowBlur = 26;
  const pg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  pg.addColorStop(0, '#3a2878'); pg.addColorStop(1, '#1c1240');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 22); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#58e07f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 22); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12, 17); ctx.stroke();

  // three stars pop one after another above the ribbon: earned gold, missed grey (ui/levelStars.js)
  st3CardStars(ctx, cx, c.y, lt, now, state.st3?.result);

  // ribbon: "LEVEL n CLEAR!"
  const title = isStageClear ? tr('m.lc.stage', { n: stageNum }) : tr('m.lc.level', { n: levelInStage });
  const rw = c.w - 40, ry = c.y + 10;
  ctx.fillStyle = '#1d6a38';
  for (const s of [-1, 1]) {
    const ex = cx + s * (rw / 2 + 12);
    ctx.beginPath(); ctx.moveTo(ex, ry + 5); ctx.lineTo(cx + s * (rw / 2 - 6), ry + 19); ctx.lineTo(ex, ry + 33); ctx.closePath(); ctx.fill();
  }
  const rg = ctx.createLinearGradient(0, ry, 0, ry + 38);
  rg.addColorStop(0, '#6ef598'); rg.addColorStop(1, '#2e9a52');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.roundRect(cx - rw / 2, ry, rw, 38, 12); ctx.fill();
  armText(ctx, title, cx, ry + 28, fitFont(ctx, title, `22px ${F_TITLE}`, rw - 24), '#ffffff', 'center', 4);
  const cheer = tr(['m.lc.cheer1', 'm.lc.cheer2', 'm.lc.cheer3'][state.levelIndex % 3]);
  armText(ctx, cheer, cx, c.y + 72, `14px ${F_TITLE}`, '#ffd23d', 'center', 3);

  // points and coins tiles, counting up
  const gained = Math.max(0, state.score - (lc.from || 0));
  const kp = lcEase((lt - T.count[0]) / (T.count[1] - T.count[0]));
  const kc = lcEase((lt - T.coinsFly) / (T.coinCount * T.coinGap + 0.65));
  const tw = (c.w - 48) / 2, ty = c.y + 86;
  const tiles = [
    { label: tr('m.lc.points'), val: '+' + Math.round(gained * kp), sub: tr('m.lc.total', { n: state.score }), col: '#7fd8ff' },
    { label: tr('m.lc.coinsGot'), val: '+' + Math.round((lc.coins || 0) * kc), sub: '', col: '#ffd23d', coin: true },
  ];
  tiles.forEach((tl, i) => {
    const x = c.x + 18 + i * (tw + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.strokeStyle = tl.col + '99'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, ty, tw, 78, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = fitFont(ctx, tl.label, `11px ${F_TITLE}`, tw - 16); ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(tl.label, x + tw / 2, ty + 18);
    const v = `⁦${tl.val}⁩`;
    const font = `26px ${F_TITLE}`;
    ctx.font = font;
    const vw = ctx.measureText(v).width + (tl.coin ? 26 : 0);
    if (tl.coin) drawCoinGlyph(ctx, x + tw / 2 - vw / 2 + 10, ty + 42, 10);
    armText(ctx, v, x + tw / 2 + (tl.coin ? 13 : 0), ty + 51, font, tl.col, 'center', 4);
    if (tl.sub) {
      ctx.font = fitFont(ctx, tl.sub, `11px ${F_BODY}`, tw - 12); ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center'; ctx.fillText(tl.sub, x + tw / 2, ty + 69);
    }
  });

  // gate restored
  const rest = tr('m.lc.restored');
  ctx.font = `13px ${F_BODY}`;
  const restW = ctx.measureText(rest).width;
  goHeart(ctx, cx - restW / 2 - 6, c.y + 186, 8, true);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3c0';
  ctx.fillText(rest, cx + 8, c.y + 191);
  // what the missed stars need (or a cheer for all three)
  st3CardHint(ctx, cx, c.y + 207, c.w - 24, state.st3?.result, lt);

  // next level + the bar that runs down until it starts on its own
  const nextTxt = tr('m.lc.next', { name: nextName });
  ctx.textAlign = 'center'; ctx.font = fitFont(ctx, nextTxt, `14px ${F_TITLE}`, c.w - 40); ctx.fillStyle = '#ffffff';
  ctx.fillText(nextTxt, cx, c.y + 222);
  const bx = c.x + 30, bw = c.w - 60, by = c.y + 234;
  const left = 1 - Math.max(0, Math.min(1, (lt - T.pop) / (T.fade - T.pop)));
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, 8, 4); ctx.fill();
  ctx.fillStyle = '#58e07f';
  ctx.beginPath(); ctx.roundRect(bx, by, Math.max(8, bw * left), 8, 4); ctx.fill();
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now * 4);
  ctx.font = `11px ${F_BODY}`; ctx.fillStyle = '#ffffff';
  ctx.fillText(tr('m.lc.tap'), cx, c.y + 264);
  ctx.globalAlpha = 1;
  ctx.restore(); // card scale

  drawMenuLink(ctx);

  // coins fly from the coin tile up into the HUD coin pill
  const fromX = c.x + 18 + tw + 12 + tw / 2, fromY = ty + 42, toX = 20, toY = 54;
  for (let i = 0; i < T.coinCount; i++) {
    const k = (lt - T.coinsFly - i * T.coinGap) / 0.65;
    if (k <= 0 || k >= 1) continue;
    const e = lcEase(k);
    const x = fromX + (toX - fromX) * e + Math.sin(k * Math.PI) * (i % 2 ? 40 : -30);
    const y = fromY + (toY - fromY) * e - Math.sin(k * Math.PI) * 60;
    drawCoinGlyph(ctx, x, y, 9 - 3 * e);
  }
  // the pill flashes as coins land
  const land = (lt - T.coinsLand) % T.coinGap;
  if (lt > T.coinsLand && lt < T.coinsLand + T.coinCount * T.coinGap) {
    ctx.fillStyle = `rgba(255,230,120,${0.5 * (1 - land / T.coinGap)})`;
    ctx.beginPath(); ctx.arc(toX, toY, 16, 0, Math.PI * 2); ctx.fill();
  }

  // fade to black, then main.js starts the next level (which fades in)
  if (lt > T.fade) {
    ctx.fillStyle = `rgba(6,3,14,${Math.min(1, (lt - T.fade) / (T.end - T.fade))})`;
    ctx.fillRect(0, 0, W, H);
  }
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
  const linkExit = tr('m.exit');
  ctx.font = fitFont(ctx, linkExit, `15px ${F_TITLE}`, b.w - 16);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a241f'; ctx.lineWidth = 2.5;
  ctx.strokeText(linkExit, W / 2, b.y + b.h / 2 + 5);
  ctx.fillText(linkExit, W / 2, b.y + b.h / 2 + 5);
}

export function renderVictory(ctx, state, best) {
  const stageCount = Math.ceil(state.spawner.level / STAGE_SIZE);
  panel(ctx, tr('m.vic.title'), [
    tr('m.vic.all', { n: stageCount }),
    tr('m.vic.final', { n: state.score }),
    tr('m.vic.kills', { n: state.kills }),
    tr('m.vic.combo', { n: state.bestCombo }),
    state.score >= best ? tr('m.newbest') : tr('m.vic.best', { n: best }),
  ], tr('m.vic.again'), '#7fd8ff', 3);
  drawMenuLink(ctx);
}

// --- Coin shop --------------------------------------------------
// Layout is fixed so main.js can hit-test taps against these exact rects.
// --- SHOP page -----------------------------------------------------------
// A full page (the SHOP tab, or opened mid-run from the coin pill / GATE
// DOWN, then with a BACK button and no nav): a free video, the coin packs
// as treasure cards and Remove Ads. main.js hit-tests SHOP_BUTTONS.
const SH_X = 14, SH_W = W - 28, SH_GAP = 10;
const SH_PACK_W = (SH_W - SH_GAP * 2) / 3, SH_PACK_Y = 232, SH_PACK_H = 206;
export const SHOP_BUTTONS = {
  close: { x: 10, y: 8, w: 84, h: 36 }, // BACK (mid-run only)
  video: { x: SH_X + SH_W - 128, y: 128, w: 114, h: 40 },
  packs: COIN_PACKS.map((_, i) => ({ x: SH_X + i * (SH_PACK_W + SH_GAP), y: SH_PACK_Y, w: SH_PACK_W, h: SH_PACK_H })),
  removeAds: { x: SH_X + SH_W - 128, y: 492, w: 114, h: 40 },
};

// A heap of coins, bigger for bigger packs (size 0..2).
function shCoinPile(ctx, cx, cy, size, t) {
  const n = [4, 8, 13][size];
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34 + size * 8);
  glow.addColorStop(0, 'rgba(255,220,100,0.55)'); glow.addColorStop(1, 'rgba(255,220,100,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, 34 + size * 8, 0, Math.PI * 2); ctx.fill();
  const spots = [];
  for (let row = 0, k = 0; k < n; row++) {
    const inRow = Math.max(1, 5 - row);
    for (let j = 0; j < inRow && k < n; j++, k++) spots.push([(j - (inRow - 1) / 2) * 15, 14 - row * 9]);
  }
  for (const [dx, dy] of spots) {
    ctx.fillStyle = '#c8861a';
    ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy + 2, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23d'; ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy, 10, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath(); ctx.ellipse(cx + dx - 3, cy + dy - 1.5, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  const tw = (t * 0.9 + size * 0.37) % 2;
  if (tw < 0.6) {
    ctx.save(); ctx.globalAlpha = Math.sin(tw / 0.6 * Math.PI);
    ctx.fillStyle = '#ffffff'; armStar(ctx, cx + 12 - size * 6, cy - 4 - size * 9, 3.5);
    ctx.restore();
  }
}

function shSection(ctx, label, y) {
  armText(ctx, label, SH_X + 4, y, `15px ${F_TITLE}`, '#ffd23d', 'left', 3);
  ctx.strokeStyle = 'rgba(255,210,61,0.25)'; ctx.lineWidth = 1;
  ctx.font = `15px ${F_TITLE}`;
  const x0 = SH_X + 14 + ctx.measureText(label).width;
  ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(SH_X + SH_W, y - 5); ctx.stroke();
}

// info = { coins, iapEnabled, inRun, video: { left, coins }, videoReady,
//          removeAds (owned), removeAdsPrice }
export function renderShop(ctx, info) {
  const t = performance.now() / 1000;
  const B = SHOP_BUTTONS;
  pageShell(ctx, tr('m.nav.shop'), '#ffd23d');
  ctx.fillStyle = '#140c28'; // mid-run there's no nav bar: the page runs to the bottom
  ctx.fillRect(0, NAV_Y, W, H - NAV_Y);
  if (info.inRun) armButton(ctx, B.close, tr('m.back'), ['#7a6a8a', '#463a56'], t);
  // balance
  const bx = SH_X, by = 58;
  ctx.fillStyle = 'rgba(10,6,24,0.6)'; ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, 150, 32, 16); ctx.fill(); ctx.stroke();
  drawCoinGlyph(ctx, bx + 18, by + 16, 10);
  cfTarget(bx + 18, by + 16);
  armText(ctx, String(info.coins), bx + 34, by + 23, `16px ${F_TITLE}`, '#ffe98a', 'left', 3);

  // free coins (rewarded video)
  shSection(ctx, tr('m.shop.free'), 112);
  rwPanel(ctx, SH_X, 120, SH_W, 56, info.video.left > 0 && info.videoReady ? '#9ae6ff' : undefined);
  rwVideoIcon(ctx, SH_X + 30, 148, 32);
  const shTextW = B.video.x - (SH_X + 56) - 8;
  const watchStr = tr('m.watch');
  armText(ctx, watchStr, SH_X + 56, 145, fitFont(ctx, watchStr, `14px ${F_TITLE}`, shTextW), '#ffffff', 'left', 3);
  const videoInfo = tr('m.shop.videoInfo', { c: info.video.coins, n: info.video.left });
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, videoInfo, `11px ${F_BODY}`, shTextW); ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(videoInfo, SH_X + 56, 162);
  if (info.video.left <= 0) armButton(ctx, B.video, tr('m.shop.tomorrow'), ['#5a4a6a', '#3a2c48'], t);
  else if (!info.videoReady) armButton(ctx, B.video, tr('m.shop.novideo'), ['#5a4a6a', '#3a2c48'], t);
  else armButton(ctx, B.video, tr('m.shop.freeBtn'), ['#7fd8ff', '#2a7ab0'], t, true);

  // coin packs
  shSection(ctx, tr('m.shop.packs'), 210);
  COIN_PACKS.forEach((pack, i) => {
    const r = B.packs[i], best = !!pack.tag;
    ctx.save();
    if (best) { ctx.shadowColor = '#58e07f'; ctx.shadowBlur = 12 + 5 * Math.sin(t * 3); }
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, best ? '#2e5a4a' : '#3a2a68'); g.addColorStop(1, '#170e30');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = best ? '#58e07f' : 'rgba(255,210,61,0.55)'; ctx.lineWidth = best ? 2.5 : 1.5;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
    const packName = tr(`m.shop.pack.${pack.id}`);
    armText(ctx, packName, r.x + r.w / 2, r.y + 26, fitFont(ctx, packName, `15px ${F_TITLE}`, r.w - 12), pack.color, 'center', 3);
    shCoinPile(ctx, r.x + r.w / 2, r.y + 82, i, t);
    armText(ctx, pack.coins.toLocaleString('en-US'), r.x + r.w / 2, r.y + 134, `20px ${F_TITLE}`, '#ffe98a', 'center', 4);
    ctx.textAlign = 'center'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(tr('m.shop.coins'), r.x + r.w / 2, r.y + 148);
    const pb = { x: r.x + 10, y: r.y + r.h - 46, w: r.w - 20, h: 36 };
    armButton(ctx, pb, pack.storePrice || pack.price, info.iapEnabled ? ['#6ef598', '#2e9a52'] : ['#5a4a6a', '#3a2c48'], t);
    if (best) {
      const rw = 92;
      ctx.fillStyle = pack.bestValue ? '#ffb020' : '#58e07f'; ctx.strokeStyle = pack.bestValue ? '#7a4a08' : '#1d5a34'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(r.x + r.w / 2 - rw / 2, r.y - 10, rw, 20, 10); ctx.fill(); ctx.stroke();
      const packTag = tr(`m.shop.tag.${pack.id}`);
      armText(ctx, packTag, r.x + r.w / 2, r.y + 4, fitFont(ctx, packTag, `10px ${F_TITLE}`, rw - 10), '#ffffff', 'center', 2);
    }
  });

  // special
  shSection(ctx, tr('m.shop.special'), 474);
  rwPanel(ctx, SH_X, 482, SH_W, 60, info.removeAds ? 'rgba(88,224,127,0.4)' : '#b48aff');
  ctx.save(); ctx.translate(SH_X + 30, 512);
  ctx.fillStyle = '#3a2a68'; ctx.strokeStyle = '#b48aff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-16, -12, 32, 24, 5); ctx.fill(); ctx.stroke();
  const adStr = tr('m.shop.ad');
  armText(ctx, adStr, 0, 5, fitFont(ctx, adStr, `11px ${F_TITLE}`, 28), '#ffffff', 'center', 2);
  ctx.strokeStyle = '#ff5c7a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-18, 14); ctx.lineTo(18, -14); ctx.stroke();
  ctx.restore();
  const raW = B.removeAds.x - (SH_X + 56) - 8;
  const raStr = tr('m.shop.removeAds'), raDesc = tr('m.shop.removeAdsDesc'), ownedStr = tr('m.shop.owned');
  armText(ctx, raStr, SH_X + 56, 508, fitFont(ctx, raStr, `14px ${F_TITLE}`, raW), '#ffffff', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, raDesc, `11px ${F_BODY}`, raW); ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(raDesc, SH_X + 56, 525);
  if (info.removeAds) armText(ctx, ownedStr, B.removeAds.x + B.removeAds.w / 2, B.removeAds.y + 26, fitFont(ctx, ownedStr, `14px ${F_TITLE}`, B.removeAds.w), '#58e07f', 'center', 3);
  else armButton(ctx, B.removeAds, info.removeAdsPrice || tr('m.shop.buy'), info.iapEnabled ? ['#b48aff', '#6a3ab8'] : ['#5a4a6a', '#3a2c48'], t);

  const shopNote = info.testStore ? 'Test store (dev server): no real charge.'
    : tr(info.iapEnabled ? 'm.shop.charged' : 'm.shop.inApp');
  ctx.textAlign = 'center'; ctx.font = fitFont(ctx, shopNote, `11px ${F_BODY}`, W - 20); ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(shopNote, W / 2, 568);
  if (!info.inRun) drawBottomNav(ctx, 'shop');
}

import { ads } from '../systems/ads.js';
import { dcRenderCard } from './challengeUi.js';

// --- GATE DOWN (game over) --------------------------------------------
// The fallen gate over a SECOND CHANCE panel — new lives for coins or for a
// free video — then the run's results, a tip, and TRY AGAIN / ARMORY /
// HOME. main.js hit-tests GAMEOVER_BUTTONS.
// One compact card over a light dim, so the battlefield stays visible.
const GO_CARD = { x: 30, y: 214, w: W - 60, h: 330 };
const GO_HALF = (GO_CARD.w - 38) / 2;
export const GAMEOVER_BUTTONS = {
  reviveCoins: { x: GO_CARD.x + 14, y: GO_CARD.y + 140, w: GO_HALF, h: 46 }, // pay coins
  revive: { x: GO_CARD.x + 24 + GO_HALF, y: GO_CARD.y + 140, w: GO_HALF, h: 46 }, // watch a video
  retry: { x: GO_CARD.x + 14, y: GO_CARD.y + 228, w: GO_CARD.w - 28, h: 44 },
  armory: { x: GO_CARD.x + 14, y: GO_CARD.y + 282, w: GO_HALF, h: 36 },
  exit: { x: GO_CARD.x + 24 + GO_HALF, y: GO_CARD.y + 282, w: GO_HALF, h: 36 },
};

function goHeart(ctx, x, y, s, full) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.closePath();
  ctx.fillStyle = full ? '#ff4d6a' : 'rgba(255,255,255,0.12)'; ctx.fill();
  ctx.strokeStyle = full ? '#7a1020' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  if (full) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.35, s * 0.14, s * 0.09, -0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// A two-line choice button: icon + headline, and a caption under it.
function goChoice(ctx, r, top, caption, colors, enabled, t, icon) {
  armButton(ctx, r, '', enabled ? colors : ['#5a4a6a', '#3a2c48'], t, enabled);
  ctx.save();
  if (!enabled) ctx.globalAlpha = 0.6;
  icon(r.x + 24, r.y + r.h / 2 - 1);
  armText(ctx, top, r.x + 42, r.y + 21, fitFont(ctx, top, `15px ${F_TITLE}`, r.w - 50), '#ffffff', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, caption, `9px ${F_TITLE}`, r.w - 50); ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(caption, r.x + 42, r.y + 35);
  ctx.restore();
}

// The fallen gate: a cracked wall and towers, the arch's doors broken in,
// every ward-gem dark, rubble still falling.
function goBrokenGate(ctx, cx, cy, t) {
  const glow = ctx.createRadialGradient(cx, cy + 10, 6, cx, cy + 10, 110);
  glow.addColorStop(0, 'rgba(255,92,122,0.45)'); glow.addColorStop(1, 'rgba(255,92,122,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy + 10, 110, 0, Math.PI * 2); ctx.fill();

  const stone = (y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#8a8e98'); g.addColorStop(1, '#4a4e58');
    return g;
  };
  // curtain wall + merlons
  ctx.fillStyle = stone(cy - 6, cy + 52);
  ctx.fillRect(cx - 84, cy - 6, 168, 58);
  ctx.fillStyle = '#8a8e98';
  for (let x = cx - 84; x < cx + 80; x += 16) if (Math.abs(x - cx + 4) > 22) ctx.fillRect(x, cy - 14, 10, 9);
  // towers — the right one snapped off
  for (const side of [-1, 1]) {
    const tx = cx + side * 64, top = side < 0 ? cy - 44 : cy - 26;
    ctx.fillStyle = stone(top, cy + 52);
    ctx.beginPath();
    if (side < 0) {
      ctx.rect(tx - 16, top, 32, cy + 52 - top);
    } else {
      ctx.moveTo(tx - 16, cy + 52); ctx.lineTo(tx - 16, top - 4); ctx.lineTo(tx - 6, top + 6);
      ctx.lineTo(tx + 2, top - 8); ctx.lineTo(tx + 9, top + 4); ctx.lineTo(tx + 16, top - 2); ctx.lineTo(tx + 16, cy + 52);
    }
    ctx.fill();
    if (side < 0) { ctx.fillStyle = '#8a8e98'; for (let k = 0; k < 3; k++) ctx.fillRect(tx - 16 + k * 12, top - 8, 8, 9); }
    ctx.fillStyle = 'rgba(10,6,20,0.85)'; ctx.fillRect(tx - 2, top + 12, 4, 12);
  }
  // mortar lines
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let y = cy + 4; y < cy + 52; y += 10) { ctx.beginPath(); ctx.moveTo(cx - 84, y); ctx.lineTo(cx + 84, y); ctx.stroke(); }
  // arch, doors smashed in
  ctx.fillStyle = '#a4a8b2';
  ctx.beginPath(); ctx.arc(cx, cy + 24, 30, Math.PI, 0); ctx.lineTo(cx + 30, cy + 52); ctx.lineTo(cx - 30, cy + 52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#12080e';
  ctx.beginPath(); ctx.arc(cx, cy + 24, 24, Math.PI, 0); ctx.lineTo(cx + 24, cy + 52); ctx.lineTo(cx - 24, cy + 52); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5;
  ctx.translate(cx - 22, cy + 52); ctx.rotate(-0.55); // left door hanging
  ctx.fillRect(0, -40, 16, 40); ctx.strokeRect(0, -40, 16, 40);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#5a3a20'; ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5;
  ctx.translate(cx + 6, cy + 52); ctx.rotate(1.25); // right door knocked flat
  ctx.fillRect(0, -16, 32, 16); ctx.strokeRect(0, -16, 32, 16);
  ctx.restore();
  // glowing crack up through the wall
  ctx.strokeStyle = 'rgba(255,120,60,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx + 2, cy - 6); ctx.lineTo(cx - 6, cy - 14); ctx.lineTo(cx + 4, cy - 22); ctx.lineTo(cx - 2, cy - 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 34, cy + 10); ctx.lineTo(cx + 44, cy + 22); ctx.lineTo(cx + 40, cy + 36); ctx.stroke();
  // dark ward-gems
  for (let i = 0; i < 5; i++) {
    const gx = cx + (i - 2) * 14, gy = cy + 2;
    ctx.fillStyle = '#2a2a3a';
    ctx.beginPath(); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 4, gy); ctx.lineTo(gx, gy + 5); ctx.lineTo(gx - 4, gy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,160,180,0.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(gx - 2, gy - 3); ctx.lineTo(gx + 1, gy); ctx.lineTo(gx - 1, gy + 3); ctx.stroke();
  }
  // rubble still falling
  ctx.fillStyle = '#6e727c';
  for (let k = 0; k < 5; k++) {
    const p = (t * 0.6 + k * 0.2) % 1;
    const rx = cx + 50 + Math.sin(k * 2.1) * 14, ry = cy - 24 + p * 80;
    ctx.globalAlpha = 1 - p;
    ctx.beginPath(); ctx.arc(rx, ry, 2 + (k % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// info: { tip, reviveCost (0 = none left), canAdRevive, adReady }
export function renderGameOver(ctx, state, best, info = {}) {
  const t = performance.now() / 1000;
  const stageNum = Math.ceil(state.spawner.level / STAGE_SIZE);
  const levelInStage = ((state.spawner.level - 1) % STAGE_SIZE) + 1;
  const c = GO_CARD, B = GAMEOVER_BUTTONS;
  const coinOk = info.reviveCost > 0, adOk = info.canAdRevive && info.adReady;
  const anyLeft = info.reviveCost > 0 || info.canAdRevive;

  // light dim: the battlefield stays visible around the card
  ctx.fillStyle = 'rgba(8,4,20,0.55)';
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(120,0,20,0)'); vg.addColorStop(1, 'rgba(140,0,24,0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // card
  ctx.save();
  if (anyLeft) { ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 12 + 5 * Math.sin(t * 3); }
  const pg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  pg.addColorStop(0, 'rgba(58,40,96,0.96)'); pg.addColorStop(1, 'rgba(26,16,56,0.96)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 18); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = anyLeft ? '#ffd23d' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 18); ctx.stroke();

  // small fallen gate sitting on the ribbon
  ctx.save(); ctx.translate(W / 2, c.y - 34); ctx.scale(0.42, 0.42);
  goBrokenGate(ctx, 0, 0, t);
  ctx.restore();

  // ribbon across the top edge
  const rw = 190, rh = 32, ry = c.y - 14;
  ctx.fillStyle = '#8a1f2a';
  for (const s of [-1, 1]) {
    const ex = W / 2 + s * (rw / 2 + 14);
    ctx.beginPath(); ctx.moveTo(ex, ry + 4); ctx.lineTo(W / 2 + s * (rw / 2 - 6), ry + rh / 2); ctx.lineTo(ex, ry + rh - 4); ctx.closePath(); ctx.fill();
  }
  const rg = ctx.createLinearGradient(0, ry, 0, ry + rh);
  rg.addColorStop(0, '#ff5c7a'); rg.addColorStop(1, '#c0303f');
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.roundRect(W / 2 - rw / 2, ry, rw, rh, 10); ctx.fill();
  const goTitle = tr('m.go.title');
  armText(ctx, goTitle, W / 2, ry + 23, fitFont(ctx, goTitle, `20px ${F_TITLE}`, rw - 16), '#ffffff', 'center', 4);

  // where you fell
  armText(ctx, tr('m.play.where', { s: stageNum, l: levelInStage }), W / 2, c.y + 40, `13px ${F_TITLE}`, '#ffd23d', 'center', 3);
  ctx.textAlign = 'center'; ctx.font = `11px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(state.levelDef.name, W / 2, c.y + 55);

  // results: one slim row
  const stats = [['★', state.score, '#ffd23d'], ['⚔', state.kills, '#ff8a5a'], ['✦', '\u2066×' + state.bestCombo + '\u2069', '#7fd8ff']];
  const sw = (c.w - 28) / 3;
  stats.forEach(([icon, val, col], i) => {
    const x = c.x + 14 + i * sw, y = c.y + 64;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(x + 3, y, sw - 6, 26, 9); ctx.fill();
    ctx.font = `12px ${F_BODY}`;
    const vs = String(val), w1 = ctx.measureText(icon).width + 6;
    ctx.font = `14px ${F_TITLE}`;
    const x0 = x + sw / 2 - (w1 + ctx.measureText(vs).width) / 2;
    ctx.textAlign = 'left'; ctx.font = `12px ${F_BODY}`; ctx.fillStyle = col;
    ctx.fillText(icon, x0, y + 18);
    armText(ctx, vs, x0 + w1, y + 19, `14px ${F_TITLE}`, '#ffffff', 'left', 2);
  });
  if (state.score >= best && state.score > 0) {
    const pulse = 1 + Math.sin(t * 5) * 0.06;
    ctx.save(); ctx.translate(W / 2, c.y + 106); ctx.scale(pulse, pulse);
    armText(ctx, tr('m.newbest'), 0, 0, `13px ${F_TITLE}`, '#ffd23d', 'center', 3);
    ctx.restore();
  } else {
    ctx.textAlign = 'center'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(tr('m.go.best', { n: best }), W / 2, c.y + 105);
  }

  // second chance: title + small hearts, then the two choices
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(c.x + 16, c.y + 116); ctx.lineTo(c.x + c.w - 16, c.y + 116); ctx.stroke();
  const n = CONFIG.gateHealth;
  const chanceStr = tr(anyLeft ? 'm.go.second' : 'm.go.nomore');
  armText(ctx, chanceStr, c.x + 16, c.y + 133, fitFont(ctx, chanceStr, `12px ${F_TITLE}`, c.w - 44 - n * 17),
    anyLeft ? '#ffd23d' : 'rgba(255,255,255,0.5)', 'left', 2);
  const fill = anyLeft ? Math.min(n, Math.floor((t * 4) % (n + 3))) : 0;
  for (let i = 0; i < n; i++) goHeart(ctx, c.x + c.w - 20 - (n - 1 - i) * 17, c.y + 129, 6.5, i < fill);
  const enough = coinOk && state.coins >= info.reviveCost;
  goChoice(ctx, B.reviveCoins, coinOk ? String(info.reviveCost) : tr('m.go.used'), tr(coinOk ? (enough ? 'm.go.useCoins' : 'm.go.getCoins') : 'm.go.allCoin'),
    ['#ffd23d', '#c8861a'], coinOk, t, (x, y) => drawCoinGlyph(ctx, x, y, 11));
  goChoice(ctx, B.revive, tr(info.canAdRevive ? 'm.go.free' : 'm.go.used'), tr(info.canAdRevive ? (info.adReady ? 'm.watch' : 'm.go.noVideoNow') : 'm.go.onePerRun'),
    ['#7fd8ff', '#2a7ab0'], adOk, t, (x, y) => rwVideoIcon(ctx, x, y, 24));
  ctx.textAlign = 'center'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(tr('m.go.coins', { n: state.coins }), W / 2, c.y + 202);
  if (info.tip) {
    ctx.font = `10px ${F_BODY}`; ctx.fillStyle = '#bfeaff';
    let tip = info.tip;
    while (tip.length > 8 && ctx.measureText(tip).width > c.w - 28) tip = tip.slice(0, -2);
    if (tip !== info.tip) tip = tip.trimEnd() + '…';
    ctx.fillText(tip, W / 2, c.y + 217);
  }

  const pulse = 1 + Math.sin(t * 4) * 0.03;
  const r = B.retry, rr = { x: r.x + r.w * (1 - pulse) / 2, y: r.y + r.h * (1 - pulse) / 2, w: r.w * pulse, h: r.h * pulse };
  armButton(ctx, rr, tr('m.go.retry'), ['#6ef598', '#2e9a52'], t, !anyLeft);
  armButton(ctx, B.armory, tr('m.nav.armory'), ['#b48aff', '#6a3ab8'], t);
  armButton(ctx, B.exit, tr('m.go.home'), ['#7a6a8a', '#463a56'], t);
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
// The unit dialog is sized to its contents (header, one row per stat, the
// GET MORE COINS button) and centred above the nav bar.
const ARM_DLG_HEAD = 132, ARM_DLG_FOOT = 76;
const ARM_DLG_ABIL = 60; // rank-3 / rank-5 abilities strip (systems/abilities.js)
export function unitDialog(unit) {
  const n = Object.keys(UNITS[unit].stats).length;
  // rows shrink a little when a unit has many stats, so the box still fits
  const step = Math.min(98, Math.floor((NAV_Y - 66 - ARM_DLG_HEAD - ARM_DLG_FOOT - ARM_DLG_ABIL) / n));
  const h = ARM_DLG_HEAD + n * step - 10 + ARM_DLG_ABIL + ARM_DLG_FOOT;
  const box = { x: 16, y: Math.max(56, Math.round(50 + (NAV_Y - 50 - h) / 2)), w: W - 32, h };
  return {
    box, step,
    abil: { x: box.x + 12, y: box.y + ARM_DLG_HEAD + n * step - 4, w: box.w - 24, h: ARM_DLG_ABIL - 6 },
    close: { x: box.x + box.w - 44, y: box.y + 10, w: 34, h: 34 },
    getCoins: { x: W / 2 - 110, y: box.y + box.h - 58, w: 220, h: 42 },
  };
}
// Row + buy-button rects for every stat of a unit's dialog.
export function unitDialogRows(unit) {
  const { box: d, step } = unitDialog(unit), out = {}, rh = step - 10;
  Object.keys(UNITS[unit].stats).forEach((stat, i) => {
    const y = d.y + ARM_DLG_HEAD + i * step;
    out[stat] = {
      row: { x: d.x + 12, y, w: d.w - 24, h: rh },
      buy: { x: d.x + d.w - 128, y: y + (rh - 46) / 2, w: 106, h: 46 },
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
// art and the live procedural Guardian from render/hero.js), in the unit's
// rank look with its rank aura behind and crest above.
function drawUnitIcon(ctx, unit, x, y, s, t, heroImg, rank = 1) {
  ctx.save();
  ctx.translate(x, y);
  drawRankAura(ctx, rank, 0, 0, s, t);
  const bob = Math.sin(t * 2.4) * s * 0.04;
  switch (unit) {
    case 'hero': drawHeroIcon(ctx, 0, bob, s * 1.1, t, rank); break;
    case 'turret': armIconGun(ctx, s, t); break;
    default: drawUnitArt(ctx, unit, 0, 0, s, t, bob, rank); // same art as in battle (render/units.js)
  }
  drawRankCrest(ctx, rank, 0, 0, s, t);
  ctx.restore();
}

// 4-point twinkle star
function armStar(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2); ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2); ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2);
  ctx.fill();
}

// Gun: the live procedural turret (render/gun.js), sweeping and firing
// from alternating barrels; shows the player's real Armory look.
let armGunTier = 0;
function armIconGun(ctx, s, t) {
  const ph = (t / 0.35) % 2, k = ph % 1, b = Math.floor(ph);
  const recoil = [0, 0];
  recoil[armGunTier >= 8 ? b : 0] = Math.max(0, 1 - k * 2.5);
  drawGun(ctx, 0, s * 0.12, s * 0.42, { aim: Math.sin(t * 1.3) * 0.55, charge: k, recoil, tier: armGunTier });
}

// Rank by share of a unit's levels bought.
// Rank names/colours; rank 5 and beyond are all LEGEND (ranks never end).
const ARM_TIERS = [['p.tier.rookie', '#9aa3b8'], ['p.tier.bronze', '#e09a5a'], ['p.tier.silver', '#dfe8f5'],
  ['p.tier.gold', '#ffd23d'], ['p.tier.legend', '#ff7ae0']];
function armTier(rank) {
  const [key, color] = ARM_TIERS[Math.min(ARM_TIERS.length, rank) - 1];
  return { name: tr(key), color };
}

// Text with a dark outline.
export function armText(ctx, str, x, y, font, color, align = 'center', outline = 4) {
  ctx.textAlign = align;
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline;
  ctx.strokeStyle = 'rgba(10,6,24,0.9)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Segmented progress bar; frac 0..1 (the last lit segment may be partial).
function armSegBar(ctx, x, y, w, h, frac, segs, color) {
  const gap = segs > 14 ? 1.5 : 2;
  const sw = (w - gap * (segs - 1)) / segs, amount = frac * segs;
  for (let k = 0; k < segs; k++) {
    const sx = x + k * (sw + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(sx, y, sw, h, 2); ctx.fill();
    const f = Math.max(0, Math.min(1, amount - k));
    if (f > 0) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(sx, y, sw * f, h, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(sx + 1, y + 1, Math.max(0, sw * f - 2), Math.max(1, h * 0.3));
    }
  }
}

// Floating stone pedestal with a turning rune ring.
function armPedestal(ctx, x, y, rw, color, t) {
  ctx.save();
  const pg = ctx.createLinearGradient(0, y - 4, 0, y + rw * 0.3);
  pg.addColorStop(0, '#4a3a78'); pg.addColorStop(1, '#140c28');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(x, y + 5, rw, rw * 0.24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a4890';
  ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.22, 0, 0, 7); ctx.fill();
  const tg = ctx.createRadialGradient(x, y, 2, x, y, rw);
  tg.addColorStop(0, color + '66'); tg.addColorStop(1, color + '00');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.22, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.ellipse(x, y, rw * 0.8, rw * 0.16, 0, 0, 7); ctx.stroke();
  ctx.restore();
}

// Light rays turning behind a portrait (caller clips).
function armRays(ctx, x, y, color, t, len = 130) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(t * 0.25);
  ctx.fillStyle = color + '1a';
  for (let k = 0; k < 8; k++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, -len); ctx.lineTo(15, -len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Diagonal light sweep across a card every few seconds (caller clips).
function armShine(ctx, r, t, phase) {
  const p = ((t * 0.3 + phase) % 2) - 0.3;
  if (p < 0 || p > 1.2) return;
  const x = r.x - 60 + p * (r.w + 120) / 1.2;
  ctx.save();
  ctx.translate(x, r.y + r.h / 2); ctx.rotate(0.35);
  const g = ctx.createLinearGradient(-30, 0, 30, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -r.h, 60, r.h * 2);
  ctx.restore();
}

// Hexagon level badge.
function armBadge(ctx, x, y, n, color) {
  ctx.save();
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + k * Math.PI / 3;
    ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,8,28,0.9)'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  armText(ctx, String(n), x, y + 5, `13px ${F_TITLE}`, color, 'center', 3);
}

// Pulsing green "can upgrade" arrow.
function armUpArrow(ctx, x, y, t) {
  const p = 1 + Math.sin(t * 5) * 0.08;
  ctx.save();
  ctx.translate(x, y); ctx.scale(p, p);
  ctx.shadowColor = '#58e07f'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#3cc46a';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#eafff0'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6.5); ctx.lineTo(6, 0); ctx.lineTo(2.2, 0); ctx.lineTo(2.2, 6); ctx.lineTo(-2.2, 6); ctx.lineTo(-2.2, 0); ctx.lineTo(-6, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Background for the Armory page: forge glow, faint lattice, rising embers.
function armBackdrop(ctx, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 51, W, NAV_Y - 51); ctx.clip();
  const fg = ctx.createRadialGradient(W / 2, NAV_Y + 40, 10, W / 2, NAV_Y + 40, W * 0.95);
  fg.addColorStop(0, 'rgba(255,140,60,0.22)'); fg.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 51, W, NAV_Y - 51);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -NAV_Y; k < W; k += 28) {
    ctx.moveTo(k, 51); ctx.lineTo(k + NAV_Y, 51 + NAV_Y);
    ctx.moveTo(k + NAV_Y, 51); ctx.lineTo(k, 51 + NAV_Y);
  }
  ctx.stroke();
  const span = NAV_Y - 60;
  for (let i = 0; i < 24; i++) {
    const sp = 14 + (i * 7) % 20;
    const y = NAV_Y - ((t * sp + i * 61) % span);
    const x = (((i * 97 + Math.sin(t * 0.8 + i) * 12) % W) + W) % W;
    const a = Math.min(1, (y - 50) / 120) * (0.35 + 0.3 * Math.sin(t * 3 + i));
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(255,${170 + (i * 13) % 70},90,${a})`;
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function armCoinPill(ctx, coins) {
  const g = ctx.createLinearGradient(0, 60, 0, 92);
  g.addColorStop(0, 'rgba(46,32,80,0.95)'); g.addColorStop(1, 'rgba(14,8,30,0.95)');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(16, 60, 150, 32, 16); ctx.fill(); ctx.stroke();
  drawCoinGlyph(ctx, 34, 76, 11);
  cfTarget(34, 76);
  armText(ctx, String(coins), 52, 83, `17px ${F_TITLE}`, '#ffffff', 'left', 3);
}

// Raised glossy pill button. coin=true draws a coin glyph before the label.
export function armButton(ctx, r, label, colors, t, glow = false, coin = false) {
  ctx.save();
  if (glow) { ctx.shadowColor = colors[0]; ctx.shadowBlur = 10 + 6 * Math.sin(t * 5); }
  ctx.fillStyle = colors[1];
  ctx.beginPath(); ctx.roundRect(r.x, r.y + 3, r.w, r.h - 1, r.h / 2); ctx.fill(); // 3D lip
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h - 2, r.h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.roundRect(r.x + 8, r.y + 3, r.w - 16, r.h * 0.34, r.h * 0.17); ctx.fill();
  ctx.restore();
  const fs = Math.round(r.h * 0.42), cr = coin ? fs * 0.45 : 0;
  const font = fitFont(ctx, label, `${fs}px ${F_TITLE}`, r.w - 16 - (coin ? cr * 2 + 6 : 0));
  ctx.font = font;
  const tw = ctx.measureText(label).width;
  const x0 = r.x + r.w / 2 - (tw + (coin ? cr * 2 + 6 : 0)) / 2;
  const ty = r.y + r.h * 0.64;
  if (coin) drawCoinGlyph(ctx, x0 + cr, ty - fs * 0.33, cr);
  armText(ctx, label, x0 + (coin ? cr * 2 + 6 : 0), ty, font, '#ffffff', 'left', 3);
}

function unitAffordable(saveData, unit) {
  const cap = rankCap(saveData, unit);
  for (const stat in UNITS[unit].stats) {
    const lv = unitLevel(saveData, unit, stat);
    if (lv < cap && (saveData.coins || 0) >= statCost(unit, stat, lv)) return true;
  }
  return false;
}

// selected = unit key whose dialog is open (or null); flash = { unit, stat, t }
// pulses a just-bought row; heroImg = the Guardian sprite from main.js.
export function renderUpgrades(ctx, saveData, selected = null, t = 0, heroImg = null, flash = null) {
  pageShell(ctx, tr('p.armory.title'), '#ffd23d');
  armGunTier = unitTotalLevel(saveData, 'turret');
  armBackdrop(ctx, t);
  armCoinPill(ctx, saveData.coins || 0);
  armButton(ctx, UPGRADE_BUTTONS.getCoins, tr('p.armory.getCoins'), ['#ffd23d', '#d89a1a'], t);
  UNIT_ORDER.forEach((unit, i) => armCard(ctx, saveData, unit, i, t, heroImg));
  drawBottomNav(ctx, 'upgrades');
  if (selected) renderUnitDialog(ctx, saveData, selected, t, heroImg, flash);
}

function armCard(ctx, saveData, unit, i, t, heroImg) {
  const u = UNITS[unit];
  const r = UPGRADE_BUTTONS.cards[unit];
  const rank = unitRank(saveData, unit), frac = rankProgress(saveData, unit), tier = armTier(rank);
  const can = unitAffordable(saveData, unit);
  const cx = r.x + r.w / 2;
  ctx.save();
  ctx.translate(0, Math.sin(t * 1.8 + i) * 2);

  ctx.save();
  if (can) { ctx.shadowColor = u.color; ctx.shadowBlur = 12 + 5 * Math.sin(t * 4 + i); }
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#3a2a68'); g.addColorStop(0.55, '#24184a'); g.addColorStop(1, '#160e30');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
  armRays(ctx, cx, r.y + 62, u.color, t + i);
  const hg = ctx.createRadialGradient(cx, r.y + 62, 4, cx, r.y + 62, 62);
  hg.addColorStop(0, u.color + '55'); hg.addColorStop(1, u.color + '00');
  ctx.fillStyle = hg;
  ctx.fillRect(r.x, r.y, r.w, 124);
  armPedestal(ctx, cx, r.y + 100, 44, u.color, t + i);
  drawUnitIcon(ctx, unit, cx, r.y + 60, 64, t + i, heroImg, rank);
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.5 + k * 0.25 + i * 0.13) % 1;
    ctx.fillStyle = `rgba(255,255,255,${(1 - p) * 0.7})`;
    armStar(ctx, cx + Math.sin(k * 2.3 + i) * 34, r.y + 100 - p * 70, 1.2 + (1 - p) * 1.2);
  }
  armShine(ctx, r, t, i * 0.3);
  ctx.restore();

  ctx.strokeStyle = can ? u.color : tier.color + '99';
  ctx.lineWidth = can ? 2.5 : 1.5;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 15); ctx.stroke();

  armBadge(ctx, r.x + 22, r.y + 22, rank, tier.color);
  if (can) armUpArrow(ctx, r.x + r.w - 20, r.y + 20, t);
  armText(ctx, u.name, cx, r.y + 129, fitFont(ctx, u.name, `17px ${F_TITLE}`, r.w - 16), u.color);
  armSegBar(ctx, r.x + 16, r.y + 138, r.w - 32, 7, frac, 10, u.color); // progress to the next rank
  armText(ctx, tier.name, r.x + 16, r.y + 162, fitFont(ctx, tier.name, `12px ${F_TITLE}`, r.w / 2 - 20), tier.color, 'left', 3);
  const rankTxt = tr('p.armory.rankN', { n: rank });
  ctx.textAlign = 'right';
  ctx.font = fitFont(ctx, rankTxt, `12px ${F_BODY}`, r.w / 2 - 20);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(rankTxt, r.x + r.w - 16, r.y + 161);
  ctx.restore();
}

// Which little picture goes in a stat's medallion.
function armGlyphKind(unit, stat) {
  if (unit === 'bomb') return 'blast';
  if (stat === 'blood') return unit === 'angel' ? 'guard' : 'blood';
  if (stat === 'hp') return unit === 'wall' ? 'brick' : 'guard';
  return stat;
}

function armStatGlyph(ctx, kind, x, y, r, color, lit) {
  ctx.save();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, '#1a1034');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = lit ? '#ffffff' : color; ctx.lineWidth = 2; ctx.stroke();
  ctx.translate(x, y);
  const s = r * 0.55;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(20,10,40,0.85)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([px, py], k) => (k ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)));
    ctx.closePath(); ctx.stroke(); ctx.fill();
  };
  switch (kind) {
    case 'power':
      poly([[0.25, -1.05], [-0.55, 0.12], [-0.02, 0.12], [-0.25, 1.05], [0.55, -0.18], [0.02, -0.18]]);
      break;
    case 'fireRate':
      for (const bx of [-0.62, 0, 0.62]) {
        ctx.beginPath(); ctx.roundRect((bx - 0.2) * s, (-0.75 + Math.abs(bx) * 0.3) * s, 0.4 * s, 1.4 * s, 0.2 * s);
        ctx.stroke(); ctx.fill();
      }
      break;
    case 'blood':
      ctx.fillStyle = '#ff5a6a';
      ctx.beginPath();
      ctx.moveTo(0, 0.85 * s);
      ctx.bezierCurveTo(-1.25 * s, -0.05 * s, -0.6 * s, -1.05 * s, 0, -0.4 * s);
      ctx.bezierCurveTo(0.6 * s, -1.05 * s, 1.25 * s, -0.05 * s, 0, 0.85 * s);
      ctx.stroke(); ctx.fill();
      break;
    case 'speed':
      poly([[-0.1, -0.85], [0.9, 0], [-0.1, 0.85], [0.15, 0]]);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-1 * s, -0.45 * s); ctx.lineTo(-0.35 * s, -0.45 * s);
      ctx.moveTo(-1.05 * s, 0); ctx.lineTo(-0.2 * s, 0);
      ctx.moveTo(-1 * s, 0.45 * s); ctx.lineTo(-0.35 * s, 0.45 * s);
      ctx.stroke();
      break;
    case 'guard':
      ctx.fillStyle = '#bdeeff';
      ctx.beginPath();
      ctx.moveTo(0, -0.95 * s); ctx.quadraticCurveTo(0.85 * s, -0.8 * s, 0.8 * s, -0.25 * s);
      ctx.quadraticCurveTo(0.7 * s, 0.6 * s, 0, 1 * s); ctx.quadraticCurveTo(-0.7 * s, 0.6 * s, -0.8 * s, -0.25 * s);
      ctx.quadraticCurveTo(-0.85 * s, -0.8 * s, 0, -0.95 * s);
      ctx.stroke(); ctx.fill();
      break;
    case 'brick':
      ctx.fillStyle = '#e0b88a';
      for (const [bx, by, bw] of [[-0.95, -0.75, 0.9], [0.05, -0.75, 0.9], [-0.95, 0.05, 0.4], [-0.45, 0.05, 0.9], [0.55, 0.05, 0.4]]) {
        ctx.beginPath(); ctx.roundRect(bx * s, by * s, bw * s, 0.7 * s, 2); ctx.stroke(); ctx.fill();
      }
      break;
    case 'thorns':
      for (const tx of [-0.6, 0, 0.6]) poly([[tx - 0.32, 0.8], [tx, -0.95 + Math.abs(tx) * 0.3], [tx + 0.32, 0.8]]);
      break;
    case 'duration':
      ctx.beginPath(); ctx.arc(0, 0, 0.95 * s, 0, 7); ctx.stroke(); ctx.fill();
      ctx.strokeStyle = '#2a1a50'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.6 * s); ctx.moveTo(0, 0); ctx.lineTo(0.45 * s, 0.2 * s); ctx.stroke();
      break;
    case 'xp': { // a gem
      ctx.fillStyle = '#6ff0a0';
      const pts = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push([Math.cos(a) * 0.9, Math.sin(a) * 0.9]); }
      poly(pts);
      break;
    }
    case 'recover': // a circular arrow
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 0.7 * s, -0.4, Math.PI * 1.5); ctx.stroke();
      poly([[0.35, -1.05], [0.95, -0.7], [0.3, -0.35]]);
      break;
    case 'range': // crosshair
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 0.65 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(-0.3 * s, 0); ctx.moveTo(0.3 * s, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, -s); ctx.lineTo(0, -0.3 * s); ctx.moveTo(0, 0.3 * s); ctx.lineTo(0, s);
      ctx.stroke();
      break;
    case 'width': // <->
      poly([[-1, 0], [-0.45, -0.55], [-0.45, -0.22], [0.45, -0.22], [0.45, -0.55], [1, 0], [0.45, 0.55], [0.45, 0.22], [-0.45, 0.22], [-0.45, 0.55]]);
      break;
    case 'blast': {
      ctx.fillStyle = '#ffb347';
      const pts = [];
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? 0.5 : 1.05; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      poly(pts);
      break;
    }
  }
  ctx.restore();
}

// Splits text into at most `max` lines that fit `w` (current ctx.font).
function abWrapLines(ctx, str, w, max = 2) {
  const words = String(str).split(' '), lines = [];
  let cur = '';
  for (const wd of words) {
    const next = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(next).width <= w || !cur) cur = next;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  if (lines.length > max) lines.splice(max - 1, lines.length, lines.slice(max - 1).join(' '));
  return lines;
}

// Rank-ability strip of the unit dialog: two cards (RANK 3 / RANK 5), each
// locked (grey + padlock) or unlocked (glowing in the ability colour).
function abDrawStrip(ctx, r, unit, rank, t) {
  const list = AB_LIST[unit];
  if (!r || !list) return;
  const gap = 8, cw = (r.w - gap) / 2;
  list.forEach((ab, i) => {
    const x = r.x + i * (cw + gap), y = r.y, on = rank >= ab.rank;
    const cx = x + cw / 2;
    ctx.save();
    if (on) { ctx.shadowColor = ab.color; ctx.shadowBlur = 8 + 4 * Math.sin(t * 3 + i); }
    ctx.fillStyle = on ? ab.color + '26' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = on ? ab.color : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = on ? 2 : 1.2;
    ctx.beginPath(); ctx.roundRect(x, y, cw, r.h, 12); ctx.fill(); ctx.stroke();
    ctx.restore();
    // corner badge: padlock (locked) or star (unlocked)
    const bx = x + 13, by = y + 13;
    ctx.save();
    if (on) {
      ctx.fillStyle = ab.color;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5 + t * 0.6, rr = k % 2 ? 2.6 : 6.5;
        ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(bx, by - 2, 3.4, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(bx - 5, by - 2, 10, 7);
    }
    ctx.restore();
    const head = `${tr('p.armory.rankN', { n: ab.rank })} · ${abName(ab.id)}`;
    armText(ctx, head, cx + 6, y + 18, fitFont(ctx, head, `12px ${F_TITLE}`, cw - 34), on ? ab.color : 'rgba(255,255,255,0.45)', 'center', 3);
    ctx.font = `10px ${F_BODY}`;
    ctx.fillStyle = on ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.42)';
    ctx.textAlign = 'center';
    abWrapLines(ctx, abDesc(ab.id), cw - 14).forEach((ln, li) => {
      ctx.font = fitFont(ctx, ln, `10px ${F_BODY}`, cw - 10);
      ctx.fillText(ln, cx, y + 33 + li * 12);
    });
  });
}

function renderUnitDialog(ctx, saveData, unit, t, heroImg, flash) {
  const u = UNITS[unit];
  const dl = unitDialog(unit), d = dl.box;
  const rank = unitRank(saveData, unit), cap = rankCap(saveData, unit), tier = armTier(rank);
  ctx.fillStyle = 'rgba(8,4,20,0.8)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = u.color;
  ctx.shadowBlur = 26;
  const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
  g.addColorStop(0, '#3a2a68');
  g.addColorStop(1, '#170e30');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 22); ctx.fill();
  ctx.restore();

  // header: spotlight, rays, separator
  ctx.save();
  ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 22); ctx.clip();
  armRays(ctx, d.x + 66, d.y + 66, u.color, t, 160);
  const hg = ctx.createRadialGradient(d.x + 66, d.y + 66, 4, d.x + 66, d.y + 66, 120);
  hg.addColorStop(0, u.color + '55'); hg.addColorStop(1, u.color + '00');
  ctx.fillStyle = hg;
  ctx.fillRect(d.x, d.y, d.w, 128);
  armShine(ctx, { x: d.x, y: d.y, w: d.w, h: 124 }, t, 0);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(d.x + 16, d.y + 124); ctx.lineTo(d.x + d.w - 16, d.y + 124); ctx.stroke();
  ctx.strokeStyle = u.color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 22); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(d.x + 5, d.y + 5, d.w - 10, d.h - 10, 18); ctx.stroke();
  drawCloseX(ctx, dl.close);

  armPedestal(ctx, d.x + 66, d.y + 104, 46, u.color, t);
  drawUnitIcon(ctx, unit, d.x + 66, d.y + 62, 80, t, heroImg, rank);
  armText(ctx, u.name, d.x + 126, d.y + 44, fitFont(ctx, u.name, `24px ${F_TITLE}`, d.w - 126 - 52), u.color, 'left');
  ctx.textAlign = 'left';
  ctx.font = fitFont(ctx, u.role, `13px ${F_BODY}`, d.w - 126 - 16);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(u.role, d.x + 126, d.y + 64);
  const chip = `${tier.name}  ·  ${tr('p.armory.rankN', { n: rank })}`;
  ctx.font = `12px ${F_TITLE}`;
  const cw = ctx.measureText(chip).width + 20;
  ctx.fillStyle = tier.color + '2a'; ctx.strokeStyle = tier.color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(d.x + 126, d.y + 74, cw, 22, 11); ctx.fill(); ctx.stroke();
  armText(ctx, chip, d.x + 136, d.y + 90, `12px ${F_TITLE}`, tier.color, 'left', 3);
  drawCoinGlyph(ctx, d.x + 134, d.y + 109, 7);
  armText(ctx, String(saveData.coins || 0), d.x + 146, d.y + 114, `14px ${F_TITLE}`, '#ffd23d', 'left', 3);
  if (RANK_LOOKS[rank + 1]) { // what the next rank changes in the unit's look
    const nextTxt = tr('p.armory.next', { look: RANK_LOOKS[rank + 1] });
    armText(ctx, nextTxt, d.x + d.w - 18, d.y + 113, fitFont(ctx, nextTxt, `11px ${F_TITLE}`, d.w - 210), rankMetal(rank + 1), 'right', 3);
  }

  const rows = unitDialogRows(unit);
  for (const stat in u.stats) {
    const sdef = u.stats[stat];
    const { row, buy } = rows[stat];
    const lv = unitLevel(saveData, unit, stat);
    const maxed = lv >= cap; // done for this rank — the other stats must catch up
    const cost = maxed ? 0 : statCost(unit, stat, lv);
    const k = row.h / 88; // rows compress when a unit has many stats
    const afford = !maxed && (saveData.coins || 0) >= cost;
    const age = flash && flash.unit === unit && flash.stat === stat ? t - flash.t : 99;
    const fl = Math.max(0, 1 - age / 0.6);

    const rg = ctx.createLinearGradient(row.x, 0, row.x + row.w, 0);
    rg.addColorStop(0, u.color + (fl > 0 ? '44' : '1e'));
    rg.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = rg;
    ctx.strokeStyle = fl > 0 ? '#ffffff' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(row.x, row.y, row.w, row.h, 14); ctx.fill(); ctx.stroke();

    armStatGlyph(ctx, armGlyphKind(unit, stat), row.x + 30, row.y + row.h / 2, Math.min(20, row.h * 0.25), u.color, fl > 0);
    const tx = row.x + 60;
    const lblFont = fitFont(ctx, sdef.label, `18px ${F_TITLE}`, buy.x - tx - 64);
    armText(ctx, sdef.label, tx, row.y + 26 * k, lblFont, u.color, 'left', 3);
    ctx.font = lblFont;
    const lw = ctx.measureText(sdef.label).width;
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(tr('p.armory.lv', { n: lv }), tx + lw + 8, row.y + 26 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = fitFont(ctx, sdef.desc, `12px ${F_BODY}`, buy.x - tx - 8);
    ctx.fillText(sdef.desc, tx, row.y + 44 * k);
    const cur = lv === 0 ? tr('p.armory.base') : statLabel(unit, stat, lv);
    ctx.font = `bold 14px ${F_BODY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cur, tx, row.y + 64 * k);
    const curW = ctx.measureText(cur).width;
    if (maxed) {
      ctx.fillStyle = '#ffd23d';
      ctx.fillText('  ' + tr('p.armory.rankDone'), tx + curW, row.y + 64 * k);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('  →  ', tx + curW, row.y + 64 * k);
      ctx.fillStyle = '#6ef598';
      ctx.fillText(statLabel(unit, stat, lv + 1), tx + curW + ctx.measureText('  →  ').width, row.y + 64 * k);
    }
    armSegBar(ctx, tx, row.y + 72 * k, buy.x - tx - 12, 6, (lv - (cap - RANK_STEP)) / RANK_STEP, RANK_STEP, u.color); // this rank's steps

    if (maxed) armButton(ctx, buy, tr('p.armory.done'), ['#ffd23d', '#c8861a'], t);
    else if (afford) armButton(ctx, buy, String(cost), ['#6ef598', '#2e9a52'], t, true, true);
    else armButton(ctx, buy, String(cost), ['#6a5470', '#3e2c48'], t, false, true);

    if (age < 0.8) { // purchase burst: ring + floating "+1"
      const k = age / 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = u.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(buy.x + buy.w / 2, buy.y + buy.h / 2, 24 + k * 50, 0, 7); ctx.stroke();
      armText(ctx, '+1', buy.x + buy.w / 2, buy.y - 4 - k * 26, `20px ${F_TITLE}`, '#6ef598');
      ctx.restore();
    }
  }
  abDrawStrip(ctx, dl.abil, unit, rank, t);
  armButton(ctx, dl.getCoins, tr('p.armory.getMore'), ['#ffd23d', '#d89a1a'], t);

  // every stat finished its rank → the unit just ranked up
  const rAge = flash && flash.unit === unit && flash.rankUp ? t - flash.t : 99;
  const abNew = abUnlockedAt(unit, rank); // rank 3 / 5 unlock a new ability
  const rDur = abNew ? 2.8 : 1.6;
  if (rAge < rDur) {
    const k = rAge / rDur, pop = Math.min(1, rAge / 0.25);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
    ctx.translate(W / 2, d.y + d.h / 2 - k * 30);
    ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    armRays(ctx, 0, 0, tier.color, t * 2, 140);
    ctx.fillStyle = 'rgba(12,8,28,0.88)'; ctx.strokeStyle = tier.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-130, -44, 260, abNew ? 118 : 88, 20); ctx.fill(); ctx.stroke();
    const upTxt = tr('p.armory.rankUp');
    armText(ctx, upTxt, 0, -4, fitFont(ctx, upTxt, `32px ${F_TITLE}`, 244), tier.color);
    const lookTxt = RANK_LOOKS[Math.min(5, rank)] ? tr('p.armory.newLook', { look: RANK_LOOKS[Math.min(5, rank)] }) : `${u.name} · ${tr('p.armory.rankN', { n: rank })}`;
    armText(ctx, lookTxt, 0, 26, fitFont(ctx, lookTxt, `13px ${F_TITLE}`, 248), '#ffffff', 'center', 3);
    if (abNew) {
      const abTxt = tr('ab.newAbility', { name: abName(abNew.id) });
      const glow = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.save(); ctx.shadowColor = abNew.color; ctx.shadowBlur = 8 + 10 * glow;
      armText(ctx, abTxt, 0, 52, fitFont(ctx, abTxt, `16px ${F_TITLE}`, 244), abNew.color, 'center', 3);
      ctx.restore();
      ctx.font = fitFont(ctx, abDesc(abNew.id), `11px ${F_BODY}`, 244);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center';
      ctx.fillText(abDesc(abNew.id), 0, 68);
    }
    ctx.restore();
  }
}

// --- Settings --------------------------------------------------------
export const PRIVACY_URL = 'https://gatewall.turtoo.app/privacy';

const SET_ROW_X = 16, SET_ROW_W = W - 32, SET_ROW_H = 64, SET_ROW_GAP = 16, SET_TOP = 76;
export const SETTINGS_BUTTONS = {
  changeName: { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 0, w: SET_ROW_W, h: SET_ROW_H },
  language:  { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 1, w: SET_ROW_W, h: SET_ROW_H },
  mute:      { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 2, w: SET_ROW_W, h: SET_ROW_H },
  removeAds: { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 3, w: SET_ROW_W, h: SET_ROW_H },
  restore:   { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 4, w: SET_ROW_W, h: SET_ROW_H },
  privacy:   { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 5, w: SET_ROW_W, h: SET_ROW_H },
  reset:     { x: SET_ROW_X, y: SET_TOP + (SET_ROW_H + SET_ROW_GAP) * 6, w: SET_ROW_W, h: SET_ROW_H },
};
// The four language chips inside the LANGUAGE row (same order as LANGS).
const SET_LANG_W = (SET_ROW_W - 32 - 18) / 4;
SETTINGS_BUTTONS.langs = [0, 1, 2, 3].map((i) => ({
  x: SET_ROW_X + 16 + i * (SET_LANG_W + 6), y: SETTINGS_BUTTONS.language.y + 30, w: SET_LANG_W, h: 28,
}));

export function renderSettings(ctx, muted, playerName, adsRemoved, iapEnabled) {
  pageShell(ctx, tr('p.set.title'), '#9ae6ff');

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
    ctx.fillText(tr('p.set.yourName'), r.x + 16, r.y + 26);
    ctx.font = `13px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(playerName || tr('p.defaultName'), r.x + 16, r.y + 46);
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = '#bda6ff';
    ctx.fillText(tr('p.set.edit'), r.x + r.w - 16, r.y + 38);
  }

  // Language row: four chips, the current one lit
  {
    const r = SETTINGS_BUTTONS.language;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    armText(ctx, tr('c.lang.title'), r.x + 16, r.y + 22, `15px ${F_TITLE}`, '#7fd8ff', 'left', 3);
    LANGS.forEach((l, i) => {
      const c = SETTINGS_BUTTONS.langs[i], on = l.code === getLang();
      ctx.fillStyle = on ? '#2a7ab0' : 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = on ? '#bfeaff' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = on ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = fitFont(ctx, l.name, `13px ${F_BODY}`, c.w - 10);
      ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.75)';
      ctx.fillText(l.name, c.x + c.w / 2, c.y + 19);
    });
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
    ctx.fillText(tr('p.set.sound'), r.x + 16, r.y + 38);
    const sndTxt = tr(muted ? 'p.set.soundOff' : 'p.set.soundOn');
    ctx.textAlign = 'right';
    ctx.font = fitFont(ctx, sndTxt, `16px ${F_TITLE}`, r.w - 150);
    ctx.fillStyle = muted ? '#ff9a9a' : '#58e07f';
    ctx.fillText(sndTxt, r.x + r.w - 16, r.y + 38);
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
    const adsTitle = tr('p.set.removeAds');
    ctx.font = fitFont(ctx, adsTitle, `18px ${F_TITLE}`, r.w - 120);
    ctx.fillText(adsTitle, r.x + 16, r.y + 26);
    const adsDesc = tr(adsRemoved ? 'p.set.adsOwned' : iapEnabled ? 'p.set.adsOffer' : 'p.set.appOnly');
    ctx.font = fitFont(ctx, adsDesc, `12px ${F_BODY}`, r.w - 32);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(adsDesc, r.x + 16, r.y + 46);
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = adsRemoved ? '#58e07f' : (iapEnabled ? '#ffd23d' : 'rgba(255,255,255,0.4)');
    ctx.fillText(adsRemoved ? tr('p.set.owned') : (iapEnabled ? tr('p.set.buy') : '—'), r.x + r.w - 16, r.y + 38);
  }

  // Restore purchases row (brings back Remove Ads on a new device / reinstall)
  {
    const r = SETTINGS_BUTTONS.restore;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = iapEnabled ? '#7fd8ff' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `18px ${F_TITLE}`;
    ctx.fillStyle = '#7fd8ff';
    const rstTitle = tr('p.set.restoreTitle');
    ctx.font = fitFont(ctx, rstTitle, `18px ${F_TITLE}`, r.w - 140);
    ctx.fillText(rstTitle, r.x + 16, r.y + 26);
    const rstDesc = tr(iapEnabled ? 'p.set.restoreDesc' : 'p.set.restoreAppOnly');
    ctx.font = fitFont(ctx, rstDesc, `12px ${F_BODY}`, r.w - 32);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(rstDesc, r.x + 16, r.y + 46);
    ctx.textAlign = 'right';
    ctx.font = `16px ${F_TITLE}`;
    ctx.fillStyle = iapEnabled ? '#7fd8ff' : 'rgba(255,255,255,0.4)';
    ctx.fillText(iapEnabled ? tr('p.set.restore') : '—', r.x + r.w - 16, r.y + 38);
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
    ctx.fillText(tr('p.set.privacy'), r.x + 16, r.y + 38);
    ctx.textAlign = 'right';
    ctx.font = `14px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(tr('p.set.view'), r.x + r.w - 16, r.y + 38);
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
    const resetTitle = tr('p.set.reset');
    ctx.font = fitFont(ctx, resetTitle, `18px ${F_TITLE}`, r.w - 32);
    ctx.fillText(resetTitle, r.x + 16, r.y + 26);
    const resetDesc = tr('p.set.resetDesc');
    ctx.font = fitFont(ctx, resetDesc, `12px ${F_BODY}`, r.w - 32);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(resetDesc, r.x + 16, r.y + 46);
  }

  drawBottomNav(ctx, null);
}

// --- Hall of Fame (RANKS tab) ----------------------------------------------
// The live cross-device leaderboard from the backend (globalBoard /
// globalStatus, fetched by main.js openLeaderboard()): the top three on a
// podium, places 4–10 as cards, and the player's own card pinned above the
// nav bar. Offline it shows the player's best runs on this device instead.
// Helpers prefixed `lb`.
export const LEADERBOARD_BUTTONS = {};
const LB_MEDALS = [['#fff3a8', '#ffd23d', '#a8740c'], ['#ffffff', '#cfd8e8', '#7c8aa0'], ['#ffd6a8', '#e0a458', '#8a4a1a']];
const LB_ROW_H = 36, LB_ROWS_Y = 316;
const LB_YOU = { x: 14, y: NAV_Y - 66, w: W - 28, h: 52 };

const lbKey = (name) => (name || '').trim().toLowerCase();
function lbHue(name) {
  let h = 0;
  for (const ch of name || 'G') h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// Round portrait with the player's initial, ringed in a medal colour.
function lbAvatar(ctx, x, y, r, name, ring) {
  const hue = lbHue(name);
  const rg = ctx.createLinearGradient(0, y - r, 0, y + r);
  rg.addColorStop(0, ring[0]); rg.addColorStop(1, ring[2]);
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, `hsl(${hue},70%,72%)`); g.addColorStop(1, `hsl(${hue},60%,38%)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, Math.PI * 2); ctx.fill();
  armText(ctx, (name || 'G').charAt(0).toUpperCase(), x, y + r * 0.32, `${Math.round(r * 0.95)}px ${F_TITLE}`, '#ffffff', 'center', 3);
}

function lbCrown(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.5) * 2);
  const g = ctx.createLinearGradient(0, -s, 0, s * 0.6);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#d89a1a');
  ctx.fillStyle = g; ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.6); ctx.lineTo(-s, -s * 0.5); ctx.lineTo(-s * 0.5, 0); ctx.lineTo(0, -s);
  ctx.lineTo(s * 0.5, 0); ctx.lineTo(s, -s * 0.5); ctx.lineTo(s, s * 0.6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath(); ctx.arc(0, s * 0.2, s * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function lbFit(ctx, str, maxW) {
  if (ctx.measureText(str).width <= maxW) return str;
  while (str.length > 1 && ctx.measureText(str + '…').width > maxW) str = str.slice(0, -1);
  return str + '…';
}

// The top three on stepped pedestals: 1st in the middle, highest.
function lbPodium(ctx, top3, myKey, t) {
  const base = 300;
  const spots = [{ i: 1, x: W / 2 - 128, top: 232 }, { i: 2, x: W / 2 + 128, top: 246 }, { i: 0, x: W / 2, top: 212 }];
  // rays behind the champion
  ctx.save();
  ctx.translate(W / 2, 150); ctx.rotate(t * 0.2);
  ctx.fillStyle = 'rgba(255,210,61,0.08)';
  for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -150); ctx.lineTo(18, -150); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (const sp of spots) {
    const row = top3[sp.i];
    const m = LB_MEDALS[sp.i], pw = sp.i === 0 ? 124 : 112;
    // pedestal
    const g = ctx.createLinearGradient(0, sp.top, 0, base);
    g.addColorStop(0, '#4a3a8a'); g.addColorStop(1, '#22184a');
    ctx.fillStyle = g; ctx.strokeStyle = m[1]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(sp.x - pw / 2, sp.top, pw, base - sp.top, [12, 12, 0, 0]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = m[1]; ctx.fillRect(sp.x - pw / 2 + 2, sp.top + 2, pw - 4, 4);
    armText(ctx, String(sp.i + 1), sp.x, sp.top + 34, `28px ${F_TITLE}`, m[1], 'center', 4);
    if (!row) {
      armText(ctx, '—', sp.x, sp.top - 30, `20px ${F_TITLE}`, 'rgba(255,255,255,0.4)', 'center', 3);
      continue;
    }
    const mine = !!myKey && lbKey(row.name) === myKey;
    ctx.font = `13px ${F_TITLE}`;
    armText(ctx, String(row.score), sp.x, sp.top + 52, `13px ${F_TITLE}`, '#ffffff', 'center', 3);
    const ar = sp.i === 0 ? 28 : 23, ay = sp.top - 46;
    ctx.save();
    ctx.shadowColor = mine ? '#ffd23d' : m[1]; ctx.shadowBlur = mine ? 18 : 10;
    lbAvatar(ctx, sp.x, ay, ar, row.name, m);
    ctx.restore();
    if (sp.i === 0) lbCrown(ctx, sp.x, ay - ar - 12, 13, t);
    ctx.font = `13px ${F_TITLE}`;
    const nm = lbFit(ctx, row.name || tr('p.defaultName'), pw - 6);
    armText(ctx, nm, sp.x, sp.top - 8, `13px ${F_TITLE}`, mine ? '#ffe98a' : '#ffffff', 'center', 3);
  }
}

// One ranked card: rank, avatar, name + stage, score. tag replaces the
// avatar's initial (offline run cards show the stage reached).
function lbRow(ctx, y, rank, name, sub, score, mine, tag = null) {
  const x = 14, w = W - 28;
  ctx.fillStyle = mine ? 'rgba(255,210,61,0.16)' : 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = mine ? '#ffd23d' : 'rgba(255,255,255,0.1)'; ctx.lineWidth = mine ? 2 : 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, LB_ROW_H - 4, 12); ctx.fill(); ctx.stroke();
  const cy = y + (LB_ROW_H - 4) / 2;
  armText(ctx, String(rank), x + 22, cy + 6, `16px ${F_TITLE}`, mine ? '#ffd23d' : '#bdb0ff', 'center', 3);
  const ring = rank <= 3 ? LB_MEDALS[rank - 1] : ['#e8e0ff', '#9a8ad8', '#4a3a8a'];
  if (tag) {
    lbAvatar(ctx, x + 56, cy, 13, ' ', ring);
    armText(ctx, tag, x + 56, cy + 5, `13px ${F_TITLE}`, '#ffffff', 'center', 3);
  } else {
    lbAvatar(ctx, x + 56, cy, 13, name, ring);
  }
  ctx.font = `14px ${F_TITLE}`;
  armText(ctx, lbFit(ctx, name, 150) + (mine && !tag ? '  ' + tr('p.lb.youTag') : ''), x + 76, cy + (sub ? 0 : 5), `14px ${F_TITLE}`, mine ? '#ffe98a' : '#ffffff', 'left', 3);
  if (sub) {
    ctx.textAlign = 'left'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(200,190,255,0.75)';
    ctx.fillText(sub, x + 76, cy + 12);
  }
  ctx.fillStyle = '#ffd23d';
  armStar(ctx, x + w - 16, cy, 3.2);
  armText(ctx, String(score), x + w - 28, cy + 6, `15px ${F_TITLE}`, mine ? '#ffd23d' : '#7fd8ff', 'right', 3);
}

// The player's own card, pinned above the nav bar.
function lbYouCard(ctx, rankLabel, name, best, stage, t) {
  const c = LB_YOU;
  ctx.save();
  ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 10 + 4 * Math.sin(t * 3);
  const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  g.addColorStop(0, '#5a46b8'); g.addColorStop(1, '#2a1e6a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 16); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 16); ctx.stroke();
  const cy = c.y + c.h / 2;
  ctx.fillStyle = 'rgba(255,210,61,0.2)';
  ctx.beginPath(); ctx.roundRect(c.x + 8, c.y + 8, 58, c.h - 16, 10); ctx.fill();
  const youTxt = tr('p.lb.you');
  armText(ctx, youTxt, c.x + 37, c.y + 21, fitFont(ctx, youTxt, `9px ${F_TITLE}`, 52), '#ffe98a', 'center', 2);
  armText(ctx, rankLabel, c.x + 37, c.y + 40, fitFont(ctx, rankLabel, `16px ${F_TITLE}`, 52), '#ffffff', 'center', 3);
  lbAvatar(ctx, c.x + 92, cy, 17, name, LB_MEDALS[0]);
  ctx.font = `15px ${F_TITLE}`;
  armText(ctx, lbFit(ctx, name, 130), c.x + 118, cy - 2, `15px ${F_TITLE}`, '#ffffff', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(220,210,255,0.85)';
  ctx.fillText(tr('p.lb.reachedStage', { n: stage }), c.x + 118, cy + 14);
  ctx.textAlign = 'right'; ctx.font = `9px ${F_TITLE}`; ctx.fillStyle = 'rgba(255,233,138,0.8)';
  ctx.fillText(tr('p.lb.best'), c.x + c.w - 14, cy - 8);
  armText(ctx, String(best), c.x + c.w - 14, cy + 13, `18px ${F_TITLE}`, '#ffd23d', 'right', 3);
}

function lbStatus(ctx, text, color, t) {
  ctx.font = `11px ${F_TITLE}`;
  const w = ctx.measureText(text).width + 34;
  const x = W / 2 - w / 2, y = 54;
  ctx.fillStyle = 'rgba(10,6,24,0.55)'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, 22, 11); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.beginPath(); ctx.arc(x + 13, y + 11, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  armText(ctx, text, x + 22, y + 15, `11px ${F_TITLE}`, '#ffffff', 'left', 2);
}

export function renderLeaderboard(ctx, saveData, globalBoard, globalStatus) {
  const t = performance.now() / 1000;
  pageShell(ctx, tr('p.lb.title'), '#ffd23d');
  const myName = saveData.playerName || tr('p.defaultName');
  const myKey = lbKey(saveData.playerName);
  const myBest = saveData.best || 0;
  const myStage = Math.max(Math.floor((saveData.progress?.levelIndex || 0) / STAGE_SIZE) + 1,
    ...(saveData.leaderboard || []).map((r) => r.stage || 1));

  const haveGlobal = globalStatus === 'ready' && Array.isArray(globalBoard) && globalBoard.length > 0;
  if (haveGlobal) {
    // one entry per player (their best), in rank order
    const seen = new Set(), list = [];
    for (const r of globalBoard) {
      const k = lbKey(r.name);
      if (seen.has(k)) continue;
      seen.add(k); list.push(r);
    }
    lbStatus(ctx, tr('p.lb.live'), '#58e07f', t);
    lbPodium(ctx, list.slice(0, 3), myKey, t);
    list.slice(3, 10).forEach((r, i) => {
      lbRow(ctx, LB_ROWS_Y + i * LB_ROW_H, i + 4, r.name || tr('p.defaultName'), r.stageReached ? tr('p.lb.stageN', { n: r.stageReached }) : '', r.score, !!myKey && lbKey(r.name) === myKey);
    });
    const idx = list.findIndex((r) => lbKey(r.name) === myKey);
    lbYouCard(ctx, idx >= 0 ? `#${idx + 1}` : (list.length >= 50 ? '50+' : '—'), myName, Math.max(myBest, idx >= 0 ? list[idx].score : 0), myStage, t);
  } else {
    lbStatus(ctx, globalStatus === 'loading' ? tr('p.lb.connecting') : tr('p.lb.offline'), globalStatus === 'loading' ? '#ffd23d' : '#9aa3b8', t);
    const runs = (saveData.leaderboard || []).slice(0, 12);
    if (!runs.length) {
      ctx.save(); ctx.translate(W / 2, 220); navIconRanks(ctx, 46); ctx.restore();
      armText(ctx, tr('p.lb.noRuns'), W / 2, 310, `20px ${F_TITLE}`, '#ffffff', 'center', 3);
      const hintTxt = tr('p.lb.noRunsHint');
      ctx.textAlign = 'center'; ctx.font = fitFont(ctx, hintTxt, `13px ${F_BODY}`, W - 32); ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(hintTxt, W / 2, 334);
    } else {
      const top = 92, rh = LB_ROW_H + 6;
      runs.forEach((r, i) => {
        const when = r.date ? new Date(r.date).toLocaleDateString(getLang() === 'en' ? undefined : getLang() + '-u-nu-latn', { month: 'short', day: 'numeric' }) : '';
        if (top + i * rh + LB_ROW_H > LB_YOU.y - 6) return;
        lbRow(ctx, top + i * rh, i + 1, r.stage ? tr('p.lb.reachedStage', { n: r.stage }) : tr('p.lb.run'), when, r.score, i === 0, String(r.stage || '?'));
      });
    }
    lbYouCard(ctx, tr('p.lb.best'), myName, myBest, myStage, t);
  }

  drawBottomNav(ctx, 'leaderboard');
}

// --- REWARDS page --------------------------------------------------------
// Daily login streak, free gift, rewarded video, daily missions and invite
// friends (logic in systems/rewards.js; main.js passes the current status
// in `info` and hit-tests REWARDS_BUTTONS). The REWARDS tab of the bottom
// nav, whose badge counts the rewards waiting.
const RW_X = 16, RW_W = W - 32;
export const REWARDS_BUTTONS = {
  // (layout tightened to make room for the Daily Challenge card at y 284-346,
  // drawn by ui/challengeUi.js — see DC_CARD there)
  login: { x: W / 2 - 110, y: 142, w: 220, h: 34 },
  gift: { x: RW_X + 14, y: 238, w: (RW_W - 12) / 2 - 28, h: 30 },
  video: { x: RW_X + (RW_W - 12) / 2 + 12 + 14, y: 238, w: (RW_W - 12) / 2 - 28, h: 30 },
  missions: [0, 1, 2].map((i) => ({ x: RW_X + RW_W - 96, y: 374 + i * 46 + 6, w: 86, h: 28 })),
  share: { x: RW_X + 14, y: 610, w: (RW_W - 40) / 2, h: 36 },
  enterCode: { x: RW_X + 26 + (RW_W - 40) / 2, y: 610, w: (RW_W - 40) / 2, h: 36 },
  collect: { x: RW_X + RW_W - 160, y: 562, w: 146, h: 38 },
};

// A wrapped present: box, ribbon and bow.
function rwGiftIcon(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * s * 0.04);
  ctx.fillStyle = '#ff5c7a'; ctx.strokeStyle = '#7a1f2a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 0.12, s * 0.8, s * 0.5, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8aa0';
  ctx.beginPath(); ctx.roundRect(-s * 0.46, -s * 0.28, s * 0.92, s * 0.18, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.fillRect(-s * 0.07, -s * 0.28, s * 0.14, s * 0.66);
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(d * s * 0.14, -s * 0.34, s * 0.14, s * 0.08, d * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A small TV with a play triangle (rewarded video).
function rwVideoIcon(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3a2a68'; ctx.strokeStyle = '#9ae6ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-s * 0.42, -s * 0.3, s * 0.84, s * 0.6, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9ae6ff';
  ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.15); ctx.lineTo(s * 0.18, 0); ctx.lineTo(-s * 0.1, s * 0.15); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function rwSection(ctx, label, y, right = '') {
  armText(ctx, label, RW_X + 4, y, `15px ${F_TITLE}`, '#ffd23d', 'left', 3);
  if (right) {
    ctx.textAlign = 'right'; ctx.font = `12px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(right, RW_X + RW_W - 4, y);
  }
}

export function rwPanel(ctx, x, y, w, h, color = 'rgba(255,255,255,0.12)') {
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
}

const rwTime = (ms) => {
  const m = Math.ceil(ms / 60000), h = Math.floor(m / 60);
  return h > 0 ? tr('p.rw.timeHM', { h, m: m % 60 }) : tr('p.rw.timeM', { m });
};

// info = { login, gift, video, videoReady, missions: [{ text, progress, goal, coins, claimed }],
//          invite: { code, friends, unpaid, invited } | null, inviteAmounts: { friendGets, youGet },
//          dailyLogin: [coins…], coins, toast: { text, t } | null }
export function renderRewards(ctx, info, t) {
  pageShell(ctx, tr('p.rw.title'), '#ffd23d');
  const B = REWARDS_BUTTONS;
  drawCoinGlyph(ctx, 28, 25, 9);
  cfTarget(28, 25);
  armText(ctx, String(info.coins), 42, 31, `16px ${F_TITLE}`, '#ffffff', 'left', 3);

  // daily login
  const L = info.login;
  rwSection(ctx, tr('p.rw.dailyLogin'), 70, L.streak > 0 ? tr('p.rw.streak', { n: L.streak }) : tr('p.rw.comeBack'));
  const cw = (RW_W - 6 * 6) / 7;
  info.dailyLogin.forEach((coins, i) => {
    const x = RW_X + i * (cw + 6), y = 78;
    const done = i < L.index || (!L.claimable && i === L.index);
    const today = i === L.index && L.claimable;
    ctx.save();
    if (today) { ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 10 + 5 * Math.sin(t * 4); }
    ctx.fillStyle = done ? 'rgba(88,224,127,0.18)' : today ? 'rgba(255,210,61,0.2)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = done ? '#58e07f' : today ? '#ffd23d' : i === 6 ? '#ff7ae0' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = today ? 2.5 : 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, cw, 58, 10); ctx.fill(); ctx.stroke();
    ctx.restore();
    const dayTxt = tr('p.rw.day', { n: i + 1 });
    armText(ctx, dayTxt, x + cw / 2, y + 14, fitFont(ctx, dayTxt, `10px ${F_TITLE}`, cw - 6), i === 6 ? '#ff9ae8' : '#ffffff', 'center', 2);
    if (i === 6) rwGiftIcon(ctx, x + cw / 2, y + 31, 20, t);
    else drawCoinGlyph(ctx, x + cw / 2, y + 30, 7);
    armText(ctx, String(coins), x + cw / 2, y + 51, `12px ${F_TITLE}`, '#ffd23d', 'center', 2);
    if (done) armText(ctx, '✓', x + cw - 9, y + 13, `13px ${F_TITLE}`, '#58e07f', 'center', 2);
  });
  if (L.claimable) armButton(ctx, B.login, tr('p.rw.claim', { n: L.coins }), ['#6ef598', '#2e9a52'], t, true, true);
  else armButton(ctx, B.login, tr('p.rw.backTomorrow'), ['#5a4a6a', '#3a2c48'], t);

  // free gift + rewarded video
  rwSection(ctx, tr('p.rw.freeCoins'), 198);
  const tw = (RW_W - 12) / 2;
  rwPanel(ctx, RW_X, 206, tw, 70, info.gift.ready ? '#ffd23d' : undefined);
  rwPanel(ctx, RW_X + tw + 12, 206, tw, 70, info.video.left > 0 && info.videoReady ? '#9ae6ff' : undefined);
  rwGiftIcon(ctx, RW_X + 26, 223, 28, t);
  const giftLbl = tr('p.rw.gift'), giftEvery = tr('p.rw.everyH', { n: CONFIG.economy.giftHours });
  armText(ctx, giftLbl, RW_X + 46, 228, fitFont(ctx, giftLbl, `14px ${F_TITLE}`, 46), '#ffffff', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, giftEvery, `11px ${F_BODY}`, tw - 102); ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(giftEvery, RW_X + 96, 228);
  if (info.gift.ready) armButton(ctx, B.gift, String(info.gift.coins), ['#ffd23d', '#c8861a'], t, true, true);
  else armButton(ctx, B.gift, rwTime(info.gift.msLeft), ['#5a4a6a', '#3a2c48'], t);
  rwVideoIcon(ctx, RW_X + tw + 12 + 26, 223, 30);
  const vidLbl = tr('p.rw.video'), vidLeft = tr('p.rw.leftToday', { n: info.video.left });
  armText(ctx, vidLbl, RW_X + tw + 12 + 46, 228, fitFont(ctx, vidLbl, `14px ${F_TITLE}`, 54), '#ffffff', 'left', 3);
  ctx.textAlign = 'left'; ctx.font = fitFont(ctx, vidLeft, `11px ${F_BODY}`, tw - 110); ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(vidLeft, RW_X + tw + 12 + 104, 228);
  if (info.video.left <= 0) armButton(ctx, B.video, tr('p.rw.tomorrow'), ['#5a4a6a', '#3a2c48'], t);
  else if (!info.videoReady) armButton(ctx, B.video, tr('p.rw.noVideo'), ['#5a4a6a', '#3a2c48'], t);
  else armButton(ctx, B.video, `▶ ${info.video.coins}`, ['#7fd8ff', '#2a7ab0'], t, true);

  // daily missions
  rwSection(ctx, tr('p.rw.missions'), 366, tr('p.rw.newMissions'));
  info.missions.forEach((m, i) => {
    const y = 374 + i * 46;
    const done = m.progress >= m.goal;
    rwPanel(ctx, RW_X, y, RW_W, 40, m.claimed ? 'rgba(88,224,127,0.4)' : done ? '#58e07f' : undefined);
    armText(ctx, m.text, RW_X + 14, y + 17, fitFont(ctx, m.text, `13px ${F_TITLE}`, RW_W - 120), m.claimed ? 'rgba(255,255,255,0.5)' : '#ffffff', 'left', 3);
    const bw = RW_W - 140, frac = Math.min(1, m.progress / m.goal);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(RW_X + 14, y + 25, bw, 7, 4); ctx.fill();
    ctx.fillStyle = done ? '#58e07f' : '#7fd8ff';
    ctx.beginPath(); ctx.roundRect(RW_X + 14, y + 25, Math.max(8, bw * frac), 7, 4); ctx.fill();
    ctx.textAlign = 'right'; ctx.font = `9px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`${m.progress}/${m.goal}`, RW_X + 14 + bw, y + 22);
    const b = B.missions[i];
    if (m.claimed) armText(ctx, tr('p.rw.done'), b.x + b.w / 2, b.y + 20, fitFont(ctx, tr('p.rw.done'), `13px ${F_TITLE}`, b.w), '#58e07f', 'center', 3);
    else if (done) armButton(ctx, b, String(m.coins), ['#6ef598', '#2e9a52'], t, true, true);
    else armButton(ctx, b, String(m.coins), ['#5a4a6a', '#3a2c48'], t, false, true);
  });

  // invite friends
  const iy = 526;
  rwSection(ctx, tr('p.rw.invite'), iy);
  rwPanel(ctx, RW_X, iy + 8, RW_W, 128, '#b48aff');
  const invTxt = tr('p.rw.inviteInfo', { a: info.inviteAmounts.friendGets, b: info.inviteAmounts.youGet });
  ctx.textAlign = 'center'; ctx.font = fitFont(ctx, invTxt, `12px ${F_BODY}`, RW_W - 20); ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(invTxt, W / 2, iy + 28);
  if (info.invite) {
    ctx.fillStyle = 'rgba(180,138,255,0.15)'; ctx.strokeStyle = '#b48aff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(RW_X + 14, iy + 36, 170, 40, 12); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = `10px ${F_BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(tr('p.rw.yourCode'), RW_X + 26, iy + 51);
    armText(ctx, info.invite.code, RW_X + 26, iy + 70, `18px ${F_TITLE}`, '#ffffff', 'left', 3);
    if (info.invite.unpaid > 0) {
      armButton(ctx, B.collect, tr('p.rw.collect', { n: info.invite.unpaid * info.inviteAmounts.youGet }), ['#6ef598', '#2e9a52'], t, true, true);
    } else {
      const joinedTxt = tr(info.invite.friends === 1 ? 'p.rw.friendJoined' : 'p.rw.friendsJoined', { n: info.invite.friends });
      ctx.textAlign = 'right'; ctx.font = fitFont(ctx, joinedTxt, `12px ${F_BODY}`, RW_W - 210); ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(joinedTxt, RW_X + RW_W - 16, iy + 61);
    }
    armButton(ctx, B.share, tr('p.rw.share'), ['#b48aff', '#6a3ab8'], t);
    armButton(ctx, B.enterCode, info.invite.invited ? tr('p.rw.codeUsed') : tr('p.rw.enterCode'), info.invite.invited ? ['#5a4a6a', '#3a2c48'] : ['#7fd8ff', '#2a7ab0'], t);
  } else {
    const offTxt = tr('p.rw.offline');
    ctx.font = fitFont(ctx, offTxt, `13px ${F_BODY}`, RW_W - 20); ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(offTxt, W / 2, iy + 80);
  }
  if (info.dc) dcRenderCard(ctx, info.dc, t); // Daily Challenge card (ui/challengeUi.js)
  drawBottomNav(ctx, 'rewards');

  // short confirmation after a claim
  if (info.toast && t - info.toast.t < 1.6) {
    const k = (t - info.toast.t) / 1.6;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.fillStyle = 'rgba(12,8,28,0.92)'; ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W / 2 - 140, H / 2 - 30 - k * 20, 280, 52, 16); ctx.fill(); ctx.stroke();
    armText(ctx, info.toast.text, W / 2, H / 2 + 3 - k * 20, fitFont(ctx, info.toast.text, `17px ${F_TITLE}`, 264), '#ffd23d', 'center', 3);
    ctx.restore();
  }
}
