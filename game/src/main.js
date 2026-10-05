// ============================================================
// GateWall v3.0 — entry point & orchestrator.
// MENU → PLAYING → LEVELCLEAR → … → VICTORY / GAMEOVER
// 10 themed levels, coins, buyable weapons (bomb / angel).
// ============================================================
import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { Player } from './entities/player.js';
import { Spell } from './entities/spell.js';
import { Angel } from './entities/angel.js';
import { EnemyBullet } from './entities/enemyBullet.js';
import { Ship } from './entities/ship.js';
import { Wall } from './entities/wall.js';
import { Turret } from './entities/turret.js';
import { Spawner } from './systems/spawner.js';
import { resolveCollisions } from './systems/collision.js';
import { Particles } from './systems/particles.js';
import { audio } from './systems/audio.js';
import { renderHUD, buttonAt } from './ui/hud.js';
import { renderMenu, renderLevelClear, renderVictory, renderGameOver, REVIVE_BUTTON, renderShop, SHOP_BUTTONS, MENU_BUTTONS, END_MENU_BUTTON, renderUpgrades, UPGRADE_BUTTONS, UNIT_DIALOG, unitDialogRows, renderLeaderboard, LEADERBOARD_BUTTONS, renderSettings, SETTINGS_BUTTONS, PRIVACY_URL, homeLayout, CONTINUE_CLOSE_BUTTON, CONTINUE_CARD_RECT, CONTINUE_PLAY_BUTTON, envIcon, renderPause, PAUSE_BUTTONS, renderPlacementBanner, PLACEMENT_CONTINUE_BUTTON, BG_IMAGES, KENNEY_SEA, KENNEY_PIRATE, KENNEY_CASTLE, DESERT_PLANTS, ICE_GLACIAL, BAT_FRAMES, BAT_FRAME_COUNT, CANNON_FRAMES } from './ui/screens.js';
import { Announcer } from './ui/announce.js';
import { LEVELS, WEAPONS, STAGE_SIZE, STAGE_COUNT } from './data/levels.js';
import { COIN_PACKS } from './data/shop.js';
import { UNITS, unitLevel, setUnitLevel, statCost, statBonus, unitStats } from './data/upgrades.js';
import { load, save, submitScore } from './data/save.js';
import { ads } from './systems/ads.js';
import { iap } from './systems/iap.js';
import { backend } from './systems/backend.js';
import { drawCreature, drawGlow } from './render/creatures.js';
import { renderAtmosphereBack, renderAtmosphereFront } from './render/atmosphere.js';
import { applySeparation } from './systems/flocks.js';
import { createRun, runFire, runUpdate, dropGems, applyPick, rateMult, renderRunWorld, renderXPBar, renderLevelUp, levelUpTap, grantCatchUp } from './systems/runUpgrades.js';

ads.init(); // no-op in a plain browser; activates real AdMob inside the native app
iap.init(); // no-op in a plain browser; activates real purchases inside the native app

// Belt-and-suspenders audio unlock: the canvas's own pointerdown handler
// (below, via input.onTap) already calls audio.unlock() on every tap, but
// some browsers/embeds don't deliver pointer events reliably to a bare
// canvas. Listening on the whole window for the first real interaction of
// ANY kind guarantees we get at least one legitimate user gesture to unlock
// Web Audio on. (This does NOT fix a muted browser tab — that's a separate,
// browser-level mute that page code cannot override; check the tab's speaker
// icon / right-click → Unmute if sound is still silent after interacting.)
for (const evt of ['pointerdown', 'click', 'touchstart', 'keydown']) {
  window.addEventListener(evt, () => audio.unlock(), { once: true, passive: true });
}

let modeBeforeShop = 'PLAYING'; // resume here after closing the shop

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Polyfill for older browsers (roundRect missing pre-2022)
if (ctx && !ctx.roundRect) {
  Object.getPrototypeOf(ctx).roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

const input = createInput(canvas, CONFIG.width, CONFIG.height);

// Preload game fonts so canvas text uses them from the first frame
if (document.fonts?.load) {
  document.fonts.load('20px "Luckiest Guy"');
  document.fonts.load('17px "Fredoka"');
}

// --- Responsive, high-DPI canvas ---------------------------------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const scale = Math.min(
    window.innerWidth / CONFIG.width,
    window.innerHeight / CONFIG.height
  );
  canvas.style.width = `${CONFIG.width * scale}px`;
  canvas.style.height = `${CONFIG.height * scale}px`;
  canvas.width = Math.round(CONFIG.width * scale * dpr);
  canvas.height = Math.round(CONFIG.height * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// --- Sprites -----------------------------------------------------
const SPRITES = {};

// --- Gunner sprite geometry ------------------------------------------
// The gunner_07/gunner_08 art is tall/narrow (drawn by width, anchored at
// the feet — see the render code below). GUNNER_DISP_MULT controls how big
// the sprite is drawn relative to the (unchanged) collision size. The
// fractions below were measured directly off gunner_07.png (the flame-less
// "idle" frame, 220x444): the barrel muzzle sits ~97.97% of the sprite's
// height above the feet, and its center is ~24.09% of the sprite's width
// to the right of the character's horizontal center.
const GUNNER_DISP_MULT = 0.9; // was 1.8 — half-size on-screen character

// How long (seconds) to hold on the cleared lane before the LEVELCLEAR/
// VICTORY dialog actually appears, once the last attacker is gone — gives
// the player a beat to see the level actually finish instead of the dialog
// cutting in over the last kill.
const LEVEL_CLEAR_DELAY = 4.0;
const GUNNER_ASPECT = 444 / 220; // sprite height / width
const GUNNER_MUZZLE_X_FRAC = 0.2409;
const GUNNER_MUZZLE_Y_FRAC = 0.9797;

function gunnerMuzzle(p) {
  const dispW = p.size * GUNNER_DISP_MULT;
  const dispH = dispW * GUNNER_ASPECT;
  const footY = p.y + p.size * 1.25;
  return {
    x: p.x + p.facing * GUNNER_MUZZLE_X_FRAC * dispW,
    y: footY - GUNNER_MUZZLE_Y_FRAC * dispH,
  };
}
for (const name of ['wizard', 'goblin', 'slime', 'imp', 'fireball', 'portal-good']) {
  const img = new Image();
  img.src = `assets/sprites/${name}.svg`;
  img.onload = () => { SPRITES[name] = img; };
}

for (let i = 0; i < 21; i++) {
  const name = `gunner_${String(i).padStart(2, '0')}`;
  const img = new Image();
  img.src = `assets/sprites/gunner/${name}.png`;
  img.onload = () => { SPRITES[name] = img; };
}

function drawSprite(name, x, y, size, alpha = 1, flipX = false) {
  const img = SPRITES[name];
  ctx.globalAlpha = alpha;
  if (img) {
    if (flipX) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Environment decor (moving background objects) ---------------
const rand = (a, b) => a + Math.random() * (b - a);
let decor = [];

function makeDecor(def) {
  decor = [];
  const n = def.decor === 'clouds' ? 8 : 26;
  // Bubbles now only make sense in the water band (bottom half of the Sea
  // War screen, below the hills) — see CONFIG.ship.waterLine. Kept clear of
  // the buy-button row at the very bottom (was height-10, which let bubbles
  // drift right through/behind the row and read as odd little pale
  // crescent shapes poking out at the row's edges).
  const waterY = CONFIG.height * CONFIG.ship.waterLine;
  const bubbleFloor = CONFIG.height - CONFIG.hud.rowBottomOffset - 50;
  for (let i = 0; i < n; i++) {
    decor.push({
      x: rand(0, CONFIG.width),
      y: def.decor === 'bubbles' ? rand(waterY + 10, bubbleFloor) : rand(0, CONFIG.height),
      r: def.decor === 'clouds' ? rand(30, 70) : rand(1.5, 4),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.6, 1.4),
    });
  }
}

function updateDecor(dt, def) {
  for (const d of decor) {
    d.phase += dt * 2;
    switch (def.decor) {
      case 'fireflies': d.x += Math.sin(d.phase) * 18 * dt; d.y += Math.cos(d.phase * 0.7) * 14 * dt; break;
      case 'crystals':  d.y += 22 * d.speed * dt; break;
      case 'bubbles':   d.y -= 34 * d.speed * dt; d.x += Math.sin(d.phase) * 10 * dt; break;
      case 'sand':      d.x += 150 * d.speed * dt; break;
      case 'snow':      d.y += 40 * d.speed * dt; d.x += Math.sin(d.phase) * 20 * dt; break;
      case 'embers':    d.y -= 55 * d.speed * dt; d.x += Math.sin(d.phase * 2) * 12 * dt; break;
      case 'banners':   d.y += 16 * d.speed * dt; d.x += Math.sin(d.phase * 0.8) * 10 * dt; break; // drifting straw/dust
      case 'spores':    d.y -= 12 * d.speed * dt; d.x += Math.sin(d.phase * 0.5) * 22 * dt; break;
      case 'clouds':    d.x += 26 * d.speed * dt; break;
      case 'rain':      d.y += 380 * d.speed * dt; d.x -= 60 * dt; break;
      case 'voidstars': break; // twinkle in place
    }
    // wrap around edges
    if (d.x < -80) d.x += CONFIG.width + 160;
    if (d.x > CONFIG.width + 80) d.x -= CONFIG.width + 160;
    if (def.decor === 'bubbles') {
      // Bubbles rise and must wrap back to the seafloor, not off the top of
      // the whole screen — the hills above the water line aren't their
      // space. Wrap point kept clear of the buy-button row, same as their
      // initial spawn range in makeDecor() above.
      const waterY = CONFIG.height * CONFIG.ship.waterLine;
      const bubbleFloor = CONFIG.height - CONFIG.hud.rowBottomOffset - 50;
      if (d.y < waterY - 20) d.y = bubbleFloor;
    } else {
      if (d.y < -80) d.y += CONFIG.height + 160;
      if (d.y > CONFIG.height + 80) d.y -= CONFIG.height + 160;
    }
  }
}

// --- Sea War only: real Kenney sprites brought to life ------------------
// Swaying seaweed along the seafloor + a couple of fish drifting through
// the water column, using the actual CC0 Kenney "Fish Pack 2.0" art
// instead of drawn shapes.
const SEAWEED_SPRITES = ['seaweed_green_a', 'seaweed_green_c', 'seaweed_orange_a', 'seaweed_pink_b', 'seaweed_grass_a'];
const FISH_SPRITES = ['fish_blue', 'fish_orange', 'fish_pink'];
let seaweedPatches = [];
let seaFish = [];

function makeSeaLife() {
  seaweedPatches = [];
  // Evenly tiled along the new sandy seafloor band (see the 'bubbles' case
  // in drawLandmark) instead of loosely scattered, so it reads as a
  // continuous grown-in strip like the reference underwater scene.
  const floorY = CONFIG.height - 46;
  for (let x = 14; x < CONFIG.width - 14; x += rand(28, 40)) {
    seaweedPatches.push({
      x, y: floorY,
      sprite: SEAWEED_SPRITES[Math.floor(rand(0, SEAWEED_SPRITES.length))],
      size: rand(38, 64),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.7, 1.3),
    });
  }

  // A few extra, larger swaying seaweed patches at specific marked spots
  // (both far corners and a few in between) — same Kenney seaweed sprite
  // object already used for the rest of the seafloor growth, just sized up
  // so they read as the taller "tree" accents at those points instead of
  // introducing a differently-styled shape.
  const treeXFracs = [0.05, 0.18, 0.42, 0.6, 0.9];
  for (const fx of treeXFracs) {
    seaweedPatches.push({
      x: fx * CONFIG.width, y: floorY,
      sprite: SEAWEED_SPRITES[Math.floor(rand(0, SEAWEED_SPRITES.length))],
      size: rand(70, 88),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.6, 0.9),
    });
  }

  seaFish = [];
  // Fish swim in small schools banded into horizontal "layers" at
  // different depths — each school shares one sprite, direction, and
  // speed so it reads as a group moving together, like the reference
  // aquarium scene's stacked rows of same-color schools, instead of a
  // handful of solo fish scattered at random.
  // Bottom bound is pulled well above the buy-button row now (was just
  // height-90, which let the lowest school swim right through/behind the
  // row and pop weirdly at the screen edges as it wrapped) — fish now stay
  // clear of that row entirely, confined to open water above it.
  const waterY = CONFIG.height * CONFIG.ship.waterLine;
  const layerCount = 4;
  const floorLimit = CONFIG.height - CONFIG.hud.rowBottomOffset - 60;
  const bandH = (floorLimit - waterY) / layerCount;
  for (let layer = 0; layer < layerCount; layer++) {
    const layerY = waterY + 40 + (layer + 0.5) * bandH;
    const schoolSize = Math.floor(rand(3, 6));
    const dir = Math.random() < 0.5 ? 1 : -1;
    const sprite = FISH_SPRITES[layer % FISH_SPRITES.length];
    const baseSize = rand(22, 34);
    const baseSpeed = dir * rand(20, 40);
    const startX = rand(0, CONFIG.width);
    for (let i = 0; i < schoolSize; i++) {
      seaFish.push({
        x: startX + i * dir * rand(18, 28),
        y: layerY + rand(-14, 14),
        vx: baseSpeed * rand(0.9, 1.1),
        bobPhase: rand(0, Math.PI * 2),
        sprite,
        size: baseSize * rand(0.85, 1.15),
      });
    }
  }
}

function updateSeaLife(dt) {
  for (const s of seaweedPatches) s.phase += dt * s.speed;
  for (const f of seaFish) {
    f.x += f.vx * dt;
    f.bobPhase += dt * 1.6;
    if (f.vx > 0 && f.x > CONFIG.width + 40) f.x = -40;
    if (f.vx < 0 && f.x < -40) f.x = CONFIG.width + 40;
  }
}

function renderSeaLife(ctx) {
  for (const s of seaweedPatches) {
    const img = KENNEY_SEA[s.sprite];
    if (!img) continue;
    const sway = Math.sin(s.phase) * 0.14;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(sway);
    ctx.drawImage(img, -s.size / 2, -s.size, s.size, s.size);
    ctx.restore();
  }
  for (const f of seaFish) {
    const img = KENNEY_SEA[f.sprite];
    if (!img) continue;
    const bob = Math.sin(f.bobPhase) * 6;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    if (f.vx < 0) ctx.scale(-1, 1); // face the direction of travel
    ctx.drawImage(img, -f.size / 2, -f.size / 2, f.size, f.size);
    ctx.restore();
  }
}

// Slow-drifting aurora borealis bands for the Glacial Peak sky — three
// translucent wavy ribbons in green/blue/violet, each scrolling at its own
// speed so they never lock into a repeating pattern.
function drawAurora(t) {
  const w = CONFIG.width, h = CONFIG.height;
  const bands = [
    { color: 'rgba(88,224,159,0.32)', yBase: h * 0.16, amp: 16, freq: 0.013, speed: 0.18 },
    { color: 'rgba(127,216,255,0.24)', yBase: h * 0.24, amp: 20, freq: 0.010, speed: -0.13 },
    { color: 'rgba(179,142,255,0.20)', yBase: h * 0.10, amp: 12, freq: 0.017, speed: 0.10 },
  ];
  ctx.save();
  for (const b of bands) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, b.yBase);
    for (let x = 0; x <= w; x += 24) {
      ctx.lineTo(x, b.yBase + Math.sin(x * b.freq + t * b.speed) * b.amp);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fillStyle = b.color;
    ctx.fill();
  }
  ctx.restore();
}

// A silhouette tree (simple round canopy over a trunk) and a small grass
// tuft (a few curved blades), both drawn as flat solid shapes so they read
// clearly against the hill bands behind them without needing dedicated art.
// The tree takes an optional sway angle (radians) so it can gently rock
// like the seaweed does, instead of standing perfectly still — pivoting
// around its base (x, y), not its center, so it reads as rooted swaying
// rather than floating/rotating in place.
function drawTreeSilhouette(x, y, s, color, sway = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, 0);
  ctx.lineTo(-s * 0.08, -s * 0.5);
  ctx.lineTo(s * 0.08, -s * 0.5);
  ctx.lineTo(s * 0.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.7, s * 0.42, 0, Math.PI * 2);
  ctx.arc(-s * 0.3, -s * 0.55, s * 0.3, 0, Math.PI * 2);
  ctx.arc(s * 0.3, -s * 0.55, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGrassTuft(x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = 'round';
  for (const dx of [-0.35, -0.1, 0.15, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y);
    ctx.quadraticCurveTo(x + dx * s * 1.4, y - s * 0.55, x + dx * s * 0.6, y - s * 0.9);
    ctx.stroke();
  }
}

// Sea War's own layered backdrop — three rolling hill silhouettes running
// from the water line up into the sky, each a shade darker than the one
// behind it (so the nearest hill reads as being in its own shadow, like
// the far/mid/near bands of a real coastline), plus a scatter of grass
// tufts and small trees sitting in the "valleys" between hill crests on
// the two nearer layers for a fuller, less empty view. Drawn in place of
// the old static background photo for this decor type (see renderBackground).
function drawHills(w, h, t) {
  const waterY = h * CONFIG.ship.waterLine;
  // Each layer combines two sine frequencies (a big rolling crest + a
  // smaller secondary wobble) instead of one uniform sine, so the hills
  // come out as an irregular mixed range of high peaks and low saddles
  // rather than a repeating row of identical bumps.
  const layers = [
    { baseY: waterY - 92, amp1: 20, freq1: 0.0075, amp2: 8,  freq2: 0.021, phase: 0.4, color: '#3f7a5c' },  // far — lightest
    { baseY: waterY - 56, amp1: 26, freq1: 0.010,  amp2: 11, freq2: 0.026, phase: 2.6, color: '#2a5a42' },  // mid — darker, in the far hill's shadow
    { baseY: waterY - 18, amp1: 32, freq1: 0.013,  amp2: 14, freq2: 0.031, phase: 4.4, color: '#173d2e' },  // near — darkest, its own cast shadow
  ];
  const crestY = (layer, x) =>
    layer.baseY - Math.abs(Math.sin(x * layer.freq1 + layer.phase)) * layer.amp1
                - Math.abs(Math.sin(x * layer.freq2 + layer.phase * 1.7)) * layer.amp2;

  layers.forEach((layer, i) => {
    ctx.beginPath();
    ctx.moveTo(0, waterY + 4);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, crestY(layer, x));
    ctx.lineTo(w, waterY + 4);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();

    // Grass + trees between the hills — only on the two nearer layers so
    // the far hill stays a clean, simple silhouette (depth cue: detail
    // increases as things get closer, same as the real world).
    if (i === 1) {
      for (const fx of [0.16, 0.38, 0.62, 0.84]) {
        const x = fx * w;
        drawGrassTuft(x, crestY(layer, x) + 2, 14, '#3f7a5c');
      }
    }
    if (i === 2) {
      // Trees sit right in the corners of the hill scene now, and sway
      // gently like the seaweed does (see renderSeaLife) instead of
      // standing perfectly still — a slow, small rock back and forth,
      // each on its own phase so the two don't move in lockstep.
      const swayL = Math.sin(t * 0.9) * 0.05;
      const swayR = Math.sin(t * 0.9 + 1.8) * 0.05;
      drawTreeSilhouette(w * 0.07, crestY(layer, w * 0.07) + 2, 44, '#0f2a20', swayL);
      drawTreeSilhouette(w * 0.93, crestY(layer, w * 0.93) + 2, 40, '#0f2a20', swayR);
      for (const fx of [0.06, 0.32, 0.5, 0.62, 0.9]) {
        const x = fx * w;
        drawGrassTuft(x, crestY(layer, x) + 2, 16, '#2a5a42');
      }
    }
  });
}

// Generalized version of drawHills() above, for every LAND stage (Sea War
// keeps its own dedicated water-line version). Same rolling-silhouette
// technique — three layers combining two sine frequencies each, darkening
// toward the viewer — but anchored to a fixed baseline (no water line to
// sit above) and using the stage's own groundPalette.hills/tree colors
// instead of the sea's fixed green.
function drawGroundHills(w, h, t, baseline, palette) {
  const layers = [
    { baseY: baseline - 92, amp1: 20, freq1: 0.0075, amp2: 8,  freq2: 0.021, phase: 0.4, color: palette.hills[0] },
    { baseY: baseline - 56, amp1: 26, freq1: 0.010,  amp2: 11, freq2: 0.026, phase: 2.6, color: palette.hills[1] },
    { baseY: baseline - 18, amp1: 32, freq1: 0.013,  amp2: 14, freq2: 0.031, phase: 4.4, color: palette.hills[2] },
  ];
  const crestY = (layer, x) =>
    layer.baseY - Math.abs(Math.sin(x * layer.freq1 + layer.phase)) * layer.amp1
                - Math.abs(Math.sin(x * layer.freq2 + layer.phase * 1.7)) * layer.amp2;

  layers.forEach((layer, i) => {
    ctx.beginPath();
    ctx.moveTo(0, baseline + 4);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, crestY(layer, x));
    ctx.lineTo(w, baseline + 4);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
    if (i === 1) {
      for (const fx of [0.16, 0.38, 0.62, 0.84]) {
        const x = fx * w;
        drawGrassTuft(x, crestY(layer, x) + 2, 14, palette.hills[0]);
      }
    }
    if (i === 2) {
      const swayL = Math.sin(t * 0.9) * 0.05;
      const swayR = Math.sin(t * 0.9 + 1.8) * 0.05;
      drawTreeSilhouette(w * 0.07, crestY(layer, w * 0.07) + 2, 44, palette.tree, swayL);
      drawTreeSilhouette(w * 0.93, crestY(layer, w * 0.93) + 2, 40, palette.tree, swayR);
      for (const fx of [0.06, 0.32, 0.5, 0.62, 0.9]) {
        const x = fx * w;
        drawGrassTuft(x, crestY(layer, x) + 2, 16, palette.hills[1]);
      }
    }
  });
}

// Generalized version of the Sea War seafloor bands — four strata, each its
// own bounded strip between its own undulating curve and the curve of the
// band directly below it (not filled all the way to the screen bottom,
// which was the original layering bug — see the 'bubbles' case), recolored
// per stage via groundPalette.bands. Used as the actual ground every
// character/monster stands and walks on, for every stage.
function drawGroundBands(w, h, t, palette) {
  const bandDefs = [
    { baseY: h - 20, amp1: 6, freq1: 0.020, amp2: 3, freq2: 0.05, phase: 0.0, speed: 0,    color: palette.bands[0] },
    { baseY: h - 44, amp1: 7, freq1: 0.017, amp2: 3, freq2: 0.04, phase: 1.7, speed: 0.05, color: palette.bands[1] },
    { baseY: h - 70, amp1: 8, freq1: 0.023, amp2: 3, freq2: 0.06, phase: 3.3, speed: 0.12, color: palette.bands[2] },
    { baseY: h - 98, amp1: 9, freq1: 0.026, amp2: 4, freq2: 0.07, phase: 5.1, speed: 0.4,  color: palette.bands[3] },
  ];
  const duneY = (b, x) =>
    b.baseY - Math.abs(Math.sin(x * b.freq1 + b.phase + t * b.speed)) * b.amp1
            - Math.abs(Math.sin(x * b.freq2 + b.phase * 1.6 + t * b.speed * 1.3)) * b.amp2;

  let floorOf = () => h;
  bandDefs.forEach((b, i) => {
    const topY = (x) => duneY(b, x);
    const bottomY = floorOf;
    ctx.beginPath();
    ctx.moveTo(0, bottomY(0));
    ctx.lineTo(0, topY(0));
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, topY(x));
    ctx.lineTo(w, topY(w));
    ctx.lineTo(w, bottomY(w));
    for (let x = w; x >= 0; x -= 10) ctx.lineTo(x, bottomY(x));
    ctx.closePath();
    ctx.fillStyle = b.color;
    ctx.fill();
    if (i === bandDefs.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, topY(0));
      for (let x = 0; x <= w; x += 10) ctx.lineTo(x, topY(x));
      ctx.stroke();
    }
    floorOf = topY;
  });
}

// A couple of concrete scenery objects per environment — some fixed
// landmarks (trees, mountains, ruins), some genuinely moving (the Sea War
// ship drifts across, swamp trees sway, embers/lightning flicker) — on top
// of the existing particle decor (fireflies/snow/rain/etc), which is
// atmosphere rather than "a place". Reuses envIcon() from ui/screens.js so
// the Stage Map's node icons and the actual level look like the same spot.
function drawLandmark(def, t) {
  const w = CONFIG.width, h = CONFIG.height;
  // Clearance so front-row decorative props (trees, golems, towers, rocks —
  // anything otherwise anchored close to the true bottom edge) sit fully
  // above the buy-button row instead of being hidden behind it. Flat
  // ground/floor fills (e.g. the Sea War seafloor bands) are NOT offset —
  // those are meant to still run edge-to-edge behind the buttons, like a
  // real floor continuing under UI chrome; only the standalone objects on
  // top of that floor move up.
  const GO = 108;
  // Every stage now gets the same layered-terrain treatment the Sea War
  // stage originated — rolling hill silhouettes + a bounded 4-strata ground
  // floor (see drawGroundHills/drawGroundBands above) — drawn FIRST, right
  // here, so each stage's own unique set-piece props (castle towers, ice
  // golem, cacti, volcano, etc.) still render on top of it via the switch
  // below. Sea War ('bubbles') is the one exception — it already has its own
  // dedicated water-line version of this same idea and would double-draw a
  // conflicting floor if this ran for it too.
  if (def.decor !== 'bubbles' && def.groundPalette) {
    drawGroundHills(w, h, t, h * 0.62, def.groundPalette);
    drawGroundBands(w, h, t, def.groundPalette);
  }
  switch (def.decor) {
    case 'fireflies': // Enchanted Forest — a couple of fixed pine trees
      envIcon(ctx, 46, h - 46 - GO, 42, 'fireflies', t);
      envIcon(ctx, w - 46, h - 40 - GO, 34, 'fireflies', t);
      break;
    case 'crystals': // Crystal Caves — fixed crystal clusters
      envIcon(ctx, 40, h - 40 - GO, 38, 'crystals', t);
      envIcon(ctx, w - 40, h - 34 - GO, 30, 'crystals', t);
      break;
    case 'banners': { // Castle — real Kenney "Castle Kit" towers flanking the
      // lane with a gently fluttering banner on each, plus a squat siege
      // catapult crouched in the corner.
      const flutter = Math.sin(t * 3) * 0.05;
      for (const side of [-1, 1]) {
        const tx = side < 0 ? 44 : w - 44;
        const towerImg = KENNEY_CASTLE['tower-square-roof'];
        if (towerImg) {
          ctx.drawImage(towerImg, tx - 58, h - 152 - GO, 116, 116);
        } else {
          envIcon(ctx, tx, h - 60 - GO, 44, 'banners', t);
        }
        const flagImg = KENNEY_CASTLE['flag-banner-long'];
        if (flagImg) {
          ctx.save();
          ctx.translate(tx + side * 30, h - 128 - GO);
          ctx.rotate(flutter * side);
          ctx.drawImage(flagImg, -20, -20, 40, 40);
          ctx.restore();
        }
      }
      const catapultImg = KENNEY_CASTLE['siege-catapult'];
      if (catapultImg) ctx.drawImage(catapultImg, w / 2 - 30, h - 76 - GO, 60, 60);
      break;
    }
    case 'bubbles': { // Sea War — layered hills (see drawHills) meeting the
      // sea at a bright water-surface line; the real Ship entities
      // (spawner/main.js) sail along it.
      drawHills(w, h, t);
      const waterY = h * CONFIG.ship.waterLine;
      ctx.strokeStyle = 'rgba(232,249,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, waterY); ctx.lineTo(w, waterY); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,230,255,0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, waterY + 3); ctx.lineTo(w, waterY + 3); ctx.stroke();

      // Layered seafloor — four distinct strata, each its own bounded strip
      // between its own undulating curve and the curve of the band directly
      // below it (not each one filling all the way down to the screen
      // bottom, which was the bug: the last-drawn, shallowest band's polygon
      // covered everything beneath it, so only one color ever actually
      // showed). Amplitudes are kept comfortably smaller than the gaps
      // between each band's baseY so the curves never cross and hide a
      // whole layer again.
      const floorBands = [
        { baseY: h - 20,  amp1: 6, freq1: 0.020, amp2: 3, freq2: 0.05, phase: 0.0, speed: 0,    color: '#3d2b1a' }, // darkest rock, bottom-most
        { baseY: h - 44,  amp1: 7, freq1: 0.017, amp2: 3, freq2: 0.04, phase: 1.7, speed: 0.05, color: '#5a3d22' }, // mid rock
        { baseY: h - 70,  amp1: 8, freq1: 0.023, amp2: 3, freq2: 0.06, phase: 3.3, speed: 0.12, color: '#7a5a34' }, // silt
        { baseY: h - 98,  amp1: 9, freq1: 0.026, amp2: 4, freq2: 0.07, phase: 5.1, speed: 0.4,  color: '#e8d29e' }, // pale sunlit sand, topmost
      ];
      const duneY = (b, x) =>
        b.baseY - Math.abs(Math.sin(x * b.freq1 + b.phase + t * b.speed)) * b.amp1
                - Math.abs(Math.sin(x * b.freq2 + b.phase * 1.6 + t * b.speed * 1.3)) * b.amp2;

      // Bottom-most band's floor is the screen edge itself; every band
      // above it is floored by the curve of the one just below, so each
      // layer only occupies its own strip and every color stays visible.
      let floorOf = () => h;
      floorBands.forEach((b, i) => {
        const topY = (x) => duneY(b, x);
        const bottomY = floorOf;
        ctx.beginPath();
        ctx.moveTo(0, bottomY(0));
        ctx.lineTo(0, topY(0));
        for (let x = 0; x <= w; x += 10) ctx.lineTo(x, topY(x));
        ctx.lineTo(w, topY(w));
        ctx.lineTo(w, bottomY(w));
        for (let x = w; x >= 0; x -= 10) ctx.lineTo(x, bottomY(x));
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();
        // Only the topmost (sand) band gets the bright wet-edge highlight —
        // it's the one actually catching the light at the water's surface.
        if (i === floorBands.length - 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, topY(0));
          for (let x = 0; x <= w; x += 10) ctx.lineTo(x, topY(x));
          ctx.stroke();
        }
        floorOf = topY;
      });
      break;
    }
    case 'sand': { // Desert Storm — fixed sun, plus real low-poly cacti
      // (CraftPix desert plant pack, rendered to flat-shaded PNGs) scattered
      // along both edges of the lane instead of the old drawn dune blob.
      envIcon(ctx, w * 0.78, 70, 46, 'sand', t);
      const plant = (name, x, y, drawH) => {
        const img = DESERT_PLANTS[name];
        if (!img) { envIcon(ctx, x, y, drawH * 0.5, 'sand', t); return; }
        const drawW = drawH * (img.width / img.height);
        ctx.drawImage(img, x - drawW / 2, y - drawH, drawW, drawH);
      };
      plant('saguaro', w * 0.13, h - 34 - GO, 78);
      plant('prickly_pear', w * 0.87, h - 30 - GO, 56);
      plant('spiny_barrel', w * 0.06, h * 0.4, 40);
      plant('blossom_cactus', w * 0.93, h * 0.55, 46);
      break;
    }
    case 'snow': { // Glacial Peak (Stage 1) — real frosted trees, crystal
      // clusters, ice walls, rock piles, and an ice golem sentinel
      // (user-supplied AI-generated art, own generation), arranged as a full
      // top-to-bottom icy frame down both edges of the lane — like a cave of
      // ice — instead of just a couple of small accents near the bottom.
      const ice = (name, x, y, drawH, alpha = 1) => {
        const img = ICE_GLACIAL[name];
        ctx.globalAlpha = alpha;
        if (!img) { envIcon(ctx, x, y, drawH * 0.5, 'snow', t); ctx.globalAlpha = 1; return; }
        const drawW = drawH * (img.width / img.height);
        ctx.drawImage(img, x - drawW / 2, y - drawH, drawW, drawH);
        ctx.globalAlpha = 1;
      };
      // Left wall, top to bottom.
      ice('crystal_medium', w * 0.07, h * 0.14, 36, 0.9);
      ice('ice_rocks_small', w * 0.05, h * 0.30, 44);
      ice('crystal_large', w * 0.05, h * 0.42, 40);
      ice('ice_wall_crystal1', w * 0.02, h * 0.66, 58, 0.85);
      ice('pine_tree', w * 0.13, h - 30 - GO, 82);
      // Right wall, top to bottom (mirrored, different pieces for variety).
      ice('crystal_small', w * 0.93, h * 0.12, 28, 0.9);
      ice('ice_rocks_large', w * 0.97, h * 0.28, 50);
      ice('crystal_medium', w * 0.95, h * 0.5, 34);
      ice('ice_wall_crystal2', w * 0.99, h * 0.70, 58, 0.85);
      ice('dead_tree', w * 0.87, h - 26 - GO, 76);
      const golemImg = ICE_GLACIAL.ice_golem;
      if (golemImg) {
        const gh = 68, gw = gh * (golemImg.width / golemImg.height);
        ctx.drawImage(golemImg, w / 2 - gw / 2, h - gh - 6 - GO, gw, gh);
      } else {
        envIcon(ctx, w / 2, h - 40 - GO, 40, 'snow', t);
      }
      break;
    }
    case 'embers': // Lava Peaks — fixed volcano with an animated smoke puff
      envIcon(ctx, w / 2, h - 60 - GO, 56, 'embers', t);
      break;
    case 'spores': { // Haunted Swamp — dead trees that gently sway (moving)
      const sway = Math.sin(t * 0.6) * 0.05;
      ctx.save(); ctx.translate(36, h - 40 - GO); ctx.rotate(sway); envIcon(ctx, 0, 0, 34, 'spores', t); ctx.restore();
      ctx.save(); ctx.translate(w - 36, h - 30 - GO); ctx.rotate(-sway); envIcon(ctx, 0, 0, 26, 'spores', t); ctx.restore();
      break;
    }
    case 'clouds': // Sky War — fixed floating island (the moving clouds are decor)
      envIcon(ctx, w / 2, h - 90 - GO, 50, 'clouds', t);
      break;
    case 'rain': // Storm Realm — fixed dark cloud banks with a flickering bolt
      envIcon(ctx, w * 0.3, 60, 44, 'rain', t);
      envIcon(ctx, w * 0.7, 46, 34, 'rain', t);
      break;
    case 'voidstars': // Shadow Realm — fixed ruined pillars
      envIcon(ctx, 40, h - 46 - GO, 40, 'voidstars', t);
      envIcon(ctx, w - 40, h - 46 - GO, 40, 'voidstars', t);
      break;
  }
}

function renderBackground(def, time) {
  const themeIdx = Math.max(0, Math.min(STAGE_COUNT - 1, (def.stage || 1) - 1));
  // Sea War draws its own procedural sky-and-hills backdrop (see drawHills()
  // in drawLandmark's 'bubbles' case) instead of the static per-stage photo
  // — that's what makes the layered, shadowed hill silhouettes with
  // grass/trees between them possible, instead of a flat baked-in image.
  const bgImg = def.decor === 'bubbles' ? null : BG_IMAGES[themeIdx];
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, CONFIG.width, CONFIG.height);
    // Faint tint so gameplay sprites keep contrast against the photo.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    if (def.decor === 'bubbles') {
      // Bright open-air daytime sky for the coastal hill scene — the
      // theme's own dark abyssal-depths palette (def.sky) is for the water
      // itself elsewhere, not for a sunny shoreline with grassy hills.
      grad.addColorStop(0, '#8fd8ff');
      grad.addColorStop(1, '#cdeeff');
    } else {
      grad.addColorStop(0, def.sky[0]);
      grad.addColorStop(1, def.sky[1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  // Glacial Peak (Stage 1) — soft drifting aurora bands across the upper
  // sky, drawn before the landmark art so the crystals/trees/golem sit in
  // front of the glow rather than on top of it.
  if (def.decor === 'snow') drawAurora(time);

  drawLandmark(def, time);

  // Sea War: the swaying seaweed sits under the bubbles/fish so it reads
  // as seafloor growth, not something floating in open water.
  if (def.decor === 'bubbles') renderSeaLife(ctx);

  ctx.fillStyle = def.decorColor;
  for (const d of decor) {
    if (def.decor === 'clouds') {
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.decor === 'rain') {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = def.decorColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + 14);
      ctx.stroke();
    } else if (def.decor === 'bubbles' && KENNEY_SEA.bubble_a) {
      // Real bubble sprites instead of plain dots, cycling through the
      // three Kenney bubble variants for a bit of visual variety.
      const spriteKey = ['bubble_a', 'bubble_b', 'bubble_c'][Math.floor(d.r) % 3];
      const img = KENNEY_SEA[spriteKey];
      const s = d.r * 6;
      ctx.globalAlpha = 0.75;
      if (img) ctx.drawImage(img, d.x - s / 2, d.y - s / 2, s, s);
    } else {
      const tw = def.decor === 'voidstars' || def.decor === 'fireflies'
        ? 0.3 + 0.7 * Math.abs(Math.sin(d.phase)) : 0.55;
      ctx.globalAlpha = tw * 0.8;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Storm Realm: occasional lightning flash
  if (def.decor === 'rain' && Math.random() < 0.006) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
}

// --- Game state --------------------------------------------------
let saveData = load();
if (typeof saveData.coins !== 'number') saveData.coins = 0;
audio.setMuted(!!saveData.settings?.muted);
ads.setRemoved(!!saveData.removeAds);
let mode = 'MENU';

// The bottom banner belongs on every screen EXCEPT active gameplay — it
// would sit awkwardly close to the buy-button row and the Guardian's own
// movement space otherwise. Call this right after every `mode = 'X'`
// assignment so banner visibility can never drift out of sync with the
// screen actually on display (single source of truth, instead of manually
// scattering show/hide calls next to each mode change).
function syncBanner() {
  if (mode === 'PLAYING' || mode === 'LEVELUP') ads.hideBanner();
  else ads.showBanner();
}
syncBanner(); // MENU on load — show immediately
let state = null;
let resetArmed = false; // "tap RESET PROGRESS twice" confirmation guard
let continueDismissed = false; // home page: collapses the continue card to a slim strip

// Stage road-map scrolling — the map lays out nodes at a fixed size/spacing
// regardless of how many stages exist, so once there are more than fit on
// one screen, the player drags vertically to see the rest. Tracked as a
// simple drag: press position + starting scroll, then delta each frame.
let mapScrollY = 0;
let mapDragging = false;
let mapDragStartPy = 0;
let mapDragStartScroll = 0;
let mapMoved = false; // true once a press has moved enough to count as a scroll, not a tap
const particles = new Particles();
const announcer = new Announcer();

// --- Backend sync (cross-device leaderboard) ------------------------------
// Fire-and-forget: backend.js resolves to null on any failure (offline,
// backend not deployed yet, timeout), so none of this ever blocks or
// breaks the game — it just silently stays local-only until reachable.
function syncProfile() {
  if (!saveData.playerId) return;
  const stage = Math.floor((saveData.progress?.levelIndex || 0) / STAGE_SIZE) + 1;
  backend.sync(saveData.playerId, {
    name: saveData.playerName,
    coins: saveData.coins,
    powerLevel: saveData.permanent?.power || 0,
    speedLevel: saveData.permanent?.speed || 0,
    fireRateLevel: saveData.permanent?.fireRate || 0,
    currentStage: stage,
  });
}

async function registerWithBackend() {
  if (saveData.playerId) { syncProfile(); return; } // already registered — just push current state
  const result = await backend.register(saveData.playerName, saveData.email);
  if (result?.id) {
    saveData.playerId = result.id;
    if (result.recoveryCode) saveData.recoveryCode = result.recoveryCode;
    save(saveData);
    syncProfile();
  }
}
registerWithBackend();

// --- Name entry (DOM overlay — real text input, works in-browser and in the
// Capacitor WebView, unlike window.prompt which Android WebView won't show
// without extra native wiring). The name is what appears on the Top
// Guardians leaderboard. -------------------------------------------------
const nameOverlay = document.getElementById('nameOverlay');
const nameInput = document.getElementById('nameInput');
const nameSubmit = document.getElementById('nameSubmit');
const nameCancel = document.getElementById('nameCancel');

function openNameEntry() {
  if (!nameOverlay) return;
  nameInput.value = saveData.playerName || '';
  nameOverlay.style.display = 'flex';
  setTimeout(() => nameInput.focus(), 50);
}
function closeNameEntry() {
  if (!nameOverlay) return;
  const v = (nameInput.value || '').trim().slice(0, 14);
  saveData.playerName = v || 'Guardian';
  save(saveData);
  nameOverlay.style.display = 'none';
  if (saveData.playerId) syncProfile(); else registerWithBackend();
}
function cancelNameEntry() {
  if (!nameOverlay) return;
  if (!saveData.playerName) {
    saveData.playerName = 'Guardian';
    save(saveData);
  }
  nameOverlay.style.display = 'none';
}
if (nameSubmit) nameSubmit.addEventListener('click', closeNameEntry);
if (nameCancel) nameCancel.addEventListener('click', cancelNameEntry);
if (nameInput) nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') closeNameEntry(); });

if (!saveData.playerName) openNameEntry();

function startLevel(index) {
  const def = LEVELS[index];
  state.levelIndex = index;
  state.levelDef = def;
  state.levelTime = 0;
  state.spawner.setLevel(def, index);
  state.monsters = [];
  state.spells = [];
  state.obstacles = [];
  state.gates = [];
  state.enemyBullets = [];
  state.ships = [];
  state.walls = [];
  state.turrets = [];
  state.placing = null;
  state.placePaused = false;
  // Level-clear is detected the instant the last attacker is gone, but the
  // actual LEVELCLEAR/VICTORY screen switch is held off for a few seconds
  // (see the update() check below) so the moment doesn't get yanked away
  // from the player the frame it happens — they get to see the lane go
  // quiet and the "LEVEL CLEAR!" banner before the dialog cuts in.
  state.levelClearPending = false;
  state.levelClearTimer = 0;
  if (state.run) { state.run.vacuum = false; state.run.gems = []; }
  // NOTE: state.angels is deliberately NOT reset here — angels are a
  // permanent purchase and carry over from one level to the next.
  makeDecor(def);
  if (def.decor === 'bubbles') makeSeaLife();
  announcer.show(`LEVEL ${index + 1}`, `⚔ ${def.name} ⚔`, '#7fd8ff', 2.0);
}

function newGame(startIndex = 0) {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, startIndex));
  const activeSticker = saveData.stickers?.find(s => s.equipped) || saveData.stickers?.[0];
  state = {
    player: new Player(saveData.permanent, activeSticker),
    spells: [], monsters: [], obstacles: [], gates: [], angels: [], enemyBullets: [], ships: [], walls: [], turrets: [],
    placing: null,
    placePaused: false,
    spawner: new Spawner(LEVELS[idx], idx),
    score: 0, kills: 0, coins: saveData.coins,
    lives: CONFIG.gateHealth,
    gateFlash: 0,
    combo: 0, bestCombo: 0, comboTimer: 0,
    levelIndex: idx, levelDef: LEVELS[idx], levelTime: 0,
    run: createRun(),
    onBoss: () => { audio.bossRoar(); announcer.show('BOSS INCOMING!', 'Defeat it to clear the level!', '#ff5c7a', 2.0); particles.addShake(10); },
  };
  startLevel(idx);
  const boost = grantCatchUp(state.run, state.player, idx);
  if (boost) announcer.show('VETERAN BOOST!', `+${boost} powers for Level ${idx + 1}`, '#ffd23d', 2.2);
}

function persistCoins() {
  saveData.coins = state.coins;
  if (state.score > (saveData.best || 0)) saveData.best = state.score;
  save(saveData);
  syncProfile();
}

// --- Weapons -----------------------------------------------------
function buyWeapon(key) {
  if ((key === 'wall' || key === 'turret') && state.placing) {
    // Already placing one — finish that placement (drag it, release to
    // drop) before buying another.
    audio.gateCurse();
    return;
  }
  const cost = WEAPONS[key].cost;
  if (state.coins < cost) {
    audio.gateCurse();
    openShop(); // not enough coins — send the player straight to the shop
    return;
  }
  state.coins -= cost;
  if (key === 'bomb') {
    audio.crack();
    particles.addShake(12);
    // Power-based blast — no longer an unconditional full-screen clear.
    // The bomb has a fixed power budget (WEAPONS.bomb.power) and detonates
    // outward from the gate: the closest monsters to the gate (highest y —
    // nearest the Guardian/gate line) are destroyed first, one at a time,
    // spending their type's power cost (MONSTERS.<type>.power) out of the
    // budget, until the next-closest monster costs more than what's left.
    // A wave of cheap goblins gets mostly wiped; the same bomb thrown into
    // a knot of trolls or a boss barely dents it.
    const closestFirst = state.monsters.filter(m => !m.dead).sort((a, b) => b.y - a.y);
    let budget = WEAPONS.bomb.power * statBonus('bomb', 'power', unitLevel(saveData, 'bomb', 'power'));
    let killed = 0;
    for (const m of closestFirst) {
      if (m.power > budget) break; // power exhausted — anything farther is untouched
      budget -= m.power;
      m.dead = true;
      events.kill(m);
      killed++;
    }
    announcer.show('KA-BOOM!', killed > 0 ? `${killed} destroyed!` : 'Not enough power!', '#ff8a3d', 1.1);
    // white flash
    state.bombFlash = 0.25;
  } else if (key === 'angel') {
    audio.gateGood();
    announcer.show('WARD SUMMONED!', 'A crystal sprite joins you — for good!', '#bdeeff', 1.4);
    const side = state.angels.length % 2 === 0 ? 1 : -1;
    state.angels.push(new Angel(side, unitStats(saveData, 'angel')));
    particles.sparkle(state.player.x, state.player.y - 40, '#bdeeff');
  } else if (key === 'shield') {
    audio.gateGood();
    const dur = WEAPONS.shield.duration + statBonus('shield', 'duration', unitLevel(saveData, 'shield', 'duration'));
    announcer.show('SHIELD UP!', `Blocks bullets for ${dur}s`, '#7fd8ff', 1.2);
    state.player.addShield(dur);
    particles.sparkle(state.player.x, state.player.y, '#7fd8ff');
  } else if (key === 'wall') {
    audio.gateGood();
    announcer.show('DRAG TO PLACE', 'The battle is paused — drag to place, then tap CONTINUE', '#c8a06a', 1.6);
    state.placing = { type: 'wall', x: state.player.x, y: CONFIG.wall.dropY, armed: false };
    state.placePaused = true;
  } else if (key === 'turret') {
    audio.gateGood();
    announcer.show('DRAG TO PLACE', 'The battle is paused — drag to place, then tap CONTINUE', '#ffd88a', 1.6);
    state.placing = { type: 'turret', x: state.player.x, y: CONFIG.turret.dropY, armed: false };
    state.placePaused = true;
  }
  persistCoins();
}

function watchRewardedAd() {
  if (!ads.isRewardedReady()) return;
  ads.showRewarded(
    () => {
      // player watched the full ad — grant the reward
      state.coins += CONFIG.ads.rewardedCoins;
      persistCoins();
      audio.gateGood();
      announcer.show('THANKS!', `+${CONFIG.ads.rewardedCoins} coins`, '#7fd8ff', 1.3);
      particles.sparkle(CONFIG.width / 2, state.player.y - 40, '#7fd8ff');
    },
    () => { audio.gateCurse(); } // no ad available right now
  );
}

// --- ARMORY: permanent unit upgrades (main menu, persist across runs) ----
let armorySel = null;    // unit whose upgrade dialog is open
let armoryFlash = null;  // { unit, stat, t } — pulse on the row just bought

function buyUnitStat(unit, stat) {
  const def = UNITS[unit].stats[stat];
  const level = unitLevel(saveData, unit, stat);
  if (level >= def.max) return;
  const cost = statCost(unit, stat, level);
  if ((saveData.coins || 0) < cost) { audio.gateCurse(); openShop(); return; } // short — offer coins
  saveData.coins -= cost;
  setUnitLevel(saveData, unit, stat, level + 1);
  save(saveData);
  syncProfile();
  audio.pick();
  armoryFlash = { unit, stat, t: performance.now() / 1000 };
}

// --- Remove Ads (one-time IAP) — app-only, same "no-op in a browser tab"
// pattern as the coin packs in the shop. ------------------------------------
async function buyRemoveAds() {
  if (saveData.removeAds) return; // already owned
  if (!iap.enabled) { audio.gateCurse(); return; } // browser tab — app only
  const bought = await iap.buy('remove_ads');
  if (bought) {
    saveData.removeAds = true;
    ads.setRemoved(true);
    ads.hideBanner();
    save(saveData);
    audio.gateGood();
    announcer.show('ADS REMOVED!', 'Thanks for supporting GateWall', '#58e07f', 1.6);
  } else {
    audio.gateCurse();
  }
}

// Opens the privacy policy (gatewall.turtoo.app) in the system browser.
function openPrivacy() {
  window.open?.(PRIVACY_URL, '_blank', 'noopener,noreferrer');
}

let levelsSinceInterstitial = 0;

// --- Coin shop -----------------------------------------------------
function openShop() {
  if (mode === 'SHOP') return;
  modeBeforeShop = mode;
  mode = 'SHOP';
  syncBanner();
}

function closeShop() {
  mode = modeBeforeShop;
  syncBanner();
}

function hit(btn, x, y) {
  return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

// --- Global leaderboard (backend) -----------------------------------------
let globalBoard = null;         // array of { rank, name, score, stageReached } once loaded
let globalBoardStatus = 'idle'; // idle | loading | ready | error

function openLeaderboard() {
  mode = 'LEADERBOARD';
  syncBanner();
  if (globalBoardStatus === 'loading') return;
  globalBoardStatus = 'loading';
  // Fetch a bigger slice (was 20) so a mid-pack player is more likely to
  // actually be sitting inside the fetched rows — this is what lets
  // screens.js highlight "your rank" in place instead of always having to
  // fall back to a pinned "not in this list" row. Backend caps at 100.
  backend.topLeaderboard(50).then((rows) => {
    if (Array.isArray(rows)) { globalBoard = rows; globalBoardStatus = 'ready'; }
    else globalBoardStatus = 'error'; // offline / unreachable — screens.js falls back to local list
  });
}

async function buyCoinPack(pack) {
  if (!iap.enabled) { audio.gateCurse(); return; } // app-only in a plain browser
  const bought = await iap.buy(pack.id);
  if (bought) {
    // The shop can be opened either mid-run (state exists) or from the
    // home-screen coin pill (no active run, state is null) — credit
    // whichever coin total is live so a purchase from the menu doesn't
    // silently vanish (and isn't lost if a run is in progress either).
    if (state && modeBeforeShop === 'PLAYING') {
      state.coins += pack.coins;
      persistCoins();
    } else {
      saveData.coins = (saveData.coins || 0) + pack.coins;
      save(saveData);
      syncProfile();
    }
    audio.gateGood();
    announcer.show('PURCHASED!', `+${pack.coins} coins`, '#ffd23d', 1.4);
    closeShop();
  } else {
    audio.gateCurse();
  }
}

// The bottom nav bar (Home/Map/Upgrades/Settings/Ranks) is drawn — and must
// be tappable — on every one of those five screens, not just the home
// screen, so each is a real page you jump directly between instead of a
// dialog you have to close first. Checked first in every page's tap
// handler, before that page's own buttons.
function navTap(x, y) {
  if (x === null) return false;
  if (y >= MENU_BUTTONS.play.y) armorySel = null; // leaving via the nav bar closes any Armory dialog
  if (hit(MENU_BUTTONS.play, x, y)) { mode = 'MENU'; syncBanner(); return true; }
  if (hit(MENU_BUTTONS.upgrades, x, y)) { mode = 'UPGRADES'; syncBanner(); return true; }
  if (hit(MENU_BUTTONS.settings, x, y)) { resetArmed = false; mode = 'SETTINGS'; syncBanner(); return true; }
  if (hit(MENU_BUTTONS.leaderboard, x, y)) { openLeaderboard(); return true; }
  return false;
}

// --- Tap handling ------------------------------------------------
input.onTap((x, y) => {
  audio.unlock();

  if (mode === 'SHOP') {
    if (x === null) return;
    if (hit(SHOP_BUTTONS.close, x, y)) { closeShop(); return; }
    SHOP_BUTTONS.packs.forEach((r, i) => {
      if (hit(r, x, y)) buyCoinPack(COIN_PACKS[i]);
    });
    return;
  }

  if (mode === 'UPGRADES') {
    if (x === null) return;
    if (armorySel) {
      if (hit(UNIT_DIALOG.close, x, y)) { armorySel = null; return; }
      if (hit(UNIT_DIALOG.getCoins, x, y)) { openShop(); return; }
      const rows = unitDialogRows(armorySel);
      for (const stat in rows) {
        if (hit(rows[stat].buy, x, y)) { buyUnitStat(armorySel, stat); return; }
      }
      return; // dialog is modal
    }
    if (navTap(x, y)) return;
    if (hit(UPGRADE_BUTTONS.getCoins, x, y)) { openShop(); return; }
    for (const unit in UPGRADE_BUTTONS.cards) {
      if (hit(UPGRADE_BUTTONS.cards[unit], x, y)) { armorySel = unit; audio.gateGood(); return; }
    }
    return;
  }

  if (mode === 'LEADERBOARD') {
    if (x === null) return;
    navTap(x, y);
    return;
  }

  if (mode === 'SETTINGS') {
    if (x === null) return;
    if (navTap(x, y)) return;
    if (hit(SETTINGS_BUTTONS.changeName, x, y)) { resetArmed = false; openNameEntry(); return; }
    if (hit(SETTINGS_BUTTONS.mute, x, y)) {
      const next = !audio.isMuted();
      audio.setMuted(next);
      saveData.settings = { ...saveData.settings, muted: next };
      save(saveData);
      resetArmed = false;
      return;
    }
    if (hit(SETTINGS_BUTTONS.removeAds, x, y)) { resetArmed = false; buyRemoveAds(); return; }
    if (hit(SETTINGS_BUTTONS.privacy, x, y)) { resetArmed = false; openPrivacy(); return; }
    if (hit(SETTINGS_BUTTONS.reset, x, y)) {
      if (!resetArmed) {
        resetArmed = true; // first tap just arms it — see the "tap twice" hint in screens.js
        announcer.show('TAP AGAIN TO CONFIRM', 'This wipes your stage progress', '#ff5c7a', 1.6);
        return;
      }
      saveData.progress = { levelIndex: 0 };
      save(saveData);
      resetArmed = false;
      announcer.show('PROGRESS RESET', 'Back to Stage 1, Level 1', '#ff5c7a', 1.4);
      return;
    }
    return;
  }

  if (mode === 'MENU') {
    if (x === null) return;
    // A fresh press always clears the previous gesture's "was this a
    // scroll drag" flag immediately (not just next frame via update()) —
    // otherwise a very quick tap right after a drag could still read the
    // old drag's mapMoved=true and get silently ignored.
    mapMoved = false;
    // Header: only the coin pill is tappable (opens the buy-coins shop).
    // The avatar/name area no longer opens name-edit — that now lives in
    // Settings — and the rest of the header does nothing when tapped.
    if (hit(MENU_BUTTONS.coins, x, y)) { openShop(); return; }
    if (navTap(x, y)) return;
    if (!continueDismissed && hit(CONTINUE_CLOSE_BUTTON, x, y)) { continueDismissed = true; return; }

    // Only two things start a run from here: tapping the continue dialog
    // (while it's open — it floats over the map, same as the game-over
    // screen would), or tapping a stage node. Everywhere else on the home
    // page is inert — no "tap anywhere".
    if (!continueDismissed) {
      // Only the actual CONTINUE/TAP TO PLAY button starts the run — tapping
      // elsewhere on the card (including its center) does nothing, same as
      // the close X only working when tapped exactly.
      if (hit(CONTINUE_PLAY_BUTTON, x, y)) {
        newGame(saveData.progress?.levelIndex || 0);
        mode = 'PLAYING';
        syncBanner();
      }
      // Dialog is open and dimming the whole page — anything outside its
      // button (and outside the close X, checked above) is a no-op; the
      // stage map underneath isn't really tappable while it's covered.
      return;
    }

    // Stage map — node activation happens on RELEASE (see input.onRelease
    // below), not here on press, so a press-and-drag scrolls the map
    // instead of instantly launching whatever stage happened to be under
    // the finger when the gesture started.
    return;
  }
  if (mode === 'GAMEOVER' || mode === 'VICTORY') {
    if (x !== null && hit(END_MENU_BUTTON, x, y)) { mode = 'MENU'; syncBanner(); return; }

    // Revive button handling
    if (mode === 'GAMEOVER' && x !== null && ads.isRewardedReady() && typeof REVIVE_BUTTON !== 'undefined' && hit(REVIVE_BUTTON, x, y)) {
      ads.showRewarded(() => {
        // Reward: Full health and resume!
        state.lives = CONFIG.gateHealth;
        state.player.blood = state.player.maxBlood;
        state.player.invuln = 2;
        state.enemyBullets = [];
        mode = 'PLAYING';
        syncBanner();
      }, () => {
        // Fallback if ad failed
      });
      return;
    }

    // Only the actual TRY AGAIN / PLAY AGAIN button restarts — tapping
    // anywhere else on the Game Over / Victory card is a no-op, same as the
    // home page's continue dialog.
    if (x !== null && hit(CONTINUE_PLAY_BUTTON, x, y)) {
      newGame(saveData.progress?.levelIndex || 0);
      mode = 'PLAYING';
      syncBanner();
    }
    return;
  }
  if (mode === 'LEVELCLEAR') {
    if (x !== null && hit(END_MENU_BUTTON, x, y)) { mode = 'MENU'; syncBanner(); return; }
    if (x !== null && hit(CONTINUE_PLAY_BUTTON, x, y)) {
      startLevel(state.levelIndex + 1);
      mode = 'PLAYING';
      syncBanner();
    }
    return;
  }

  if (mode === 'LEVELUP') {
    if (x === null) return;
    const i = levelUpTap(state.run, x, y);
    if (i < 0) return;
    const key = state.run.choices[i];
    audio.pick();
    particles.sparkle(CONFIG.width / 2, 300, '#ffd23d', 14);
    const again = applyPick(state.run, key, state);
    if (again) audio.levelUp();
    else { mode = 'PLAYING'; syncBanner(); state.player.invuln = Math.max(state.player.invuln, 0.6); }
    return;
  }

  if (mode === 'PAUSED') {
    if (x === null) return;
    if (hit(PAUSE_BUTTONS.resume, x, y)) { mode = 'PLAYING'; syncBanner(); return; }
    if (hit(PAUSE_BUTTONS.exit, x, y)) { mode = 'MENU'; syncBanner(); return; } // abandon the run, no score submitted
    return;
  }

  if (mode === 'PLAYING' && x !== null) {
    // Mid-placement, any fresh press anywhere on the field is the start of
    // the placement drag, not a button press — HUD buttons are ignored
    // until the wall/turret is dropped.
    if (state.placing) return;
    if (state.placePaused) {
      // Between placements, the battle stays frozen — the only taps that
      // matter are CONTINUE (resume) or buying another wall/turret.
      if (hit(PLACEMENT_CONTINUE_BUTTON, x, y)) { state.placePaused = false; }
      else { const btn = buttonAt(x, y); if (btn === 'wall' || btn === 'turret') buyWeapon(btn); }
      return;
    }
    const btn = buttonAt(x, y);
    if (btn === 'pause') { mode = 'PAUSED'; syncBanner(); }
    else if (btn === 'watchAd') watchRewardedAd();
    else if (btn === 'shop') openShop();
    else if (btn) buyWeapon(btn);
  }
});

// Finalizes a wall/turret drag-placement on release. The buy tap itself
// ends in a release too (same gesture) — that first release is ignored via
// the `armed` flag so the player gets a genuine fresh drag gesture to
// position the item before it's dropped.
input.onRelease((x, y) => {
  if (mode !== 'PLAYING' || !state.placing) return;
  if (!state.placing.armed) {
    state.placing.armed = true; // trailing release from the buy-button tap — ignore
    return;
  }
  const { type, x: px, y: py } = state.placing;
  if (type === 'wall') {
    state.walls.push(new Wall(px, py, unitStats(saveData, 'wall')));
    announcer.show('WALL SET!', 'Blocks attackers in its lane', '#c8a06a', 1.1);
    particles.sparkle(px, py, '#c8a06a');
  } else if (type === 'turret') {
    state.turrets.push(new Turret(px, py, unitStats(saveData, 'turret')));
    announcer.show('TURRET SET!', 'Fires on its own until destroyed', '#ffd88a', 1.1);
    particles.sparkle(px, py, '#ffd88a');
  }
  audio.gateGood();
  state.placing = null;
});

// Stage map node activation — fires on RELEASE, and only if the gesture
// didn't move enough to count as a scroll drag (see update()'s mapMoved
// tracking). This is what lets the same press-drag-release gesture either
// scroll the map or tap a stage, depending on whether the finger moved.
input.onRelease((x, y) => {
  if (mode !== 'MENU' || !continueDismissed || mapMoved || x === null) return;
  const furthest = saveData.progress?.levelIndex || 0;
  const layout = homeLayout(mapScrollY);
  for (let i = 0; i < layout.rows.length; i++) {
    if (!hit(layout.rows[i], x, y)) continue;
    const stageStart = i * STAGE_SIZE;
    if (!CONFIG.devUnlockAllStages && stageStart > furthest) { audio.gateCurse(); return; } // locked
    const stageEnd = stageStart + STAGE_SIZE - 1;
    // Jumping into a not-yet-reached stage (dev unlock) always starts it
    // fresh at level 1, rather than trying to resume past where you've
    // actually gotten to.
    const targetLevel = furthest <= stageEnd ? Math.max(furthest, stageStart) : stageStart;
    newGame(targetLevel);
    mode = 'PLAYING';
    syncBanner();
    return;
  }
});

// --- Collision events (points, coins, lives, juice) --------------
// Global slow-motion for big moments (elite/boss kills). update() runs on
// dt * timeScale; it eases back to 1 on its own.
let timeScale = 1;
let slowmoT = 0;
function slowmo(duration, scale = 0.3) {
  slowmoT = Math.max(slowmoT, duration);
  timeScale = Math.min(timeScale, scale);
}

// Single entry point for every non-collision damage source (orbit blades,
// chain lightning, frost nova) so kills/splits/juice always behave the same.
function damageMonster(m, dmg) {
  if (m.dead) return;
  const children = m.onHit(dmg);
  if (m.dead) {
    events.kill(m);
    if (children) state.monsters.push(...children);
  } else {
    events.hit(m);
  }
}

// Boss bullet patterns — alternates between a radial burst, an aimed fan,
// and (once enraged under 50% hp) a rotating double spiral.
function bossVolley(m) {
  const st = state;
  m.volley = (m.volley || 0) + 1;
  const sp = CONFIG.enemyBullet.speed * (m.enraged ? 0.95 : 0.8);
  const dmg = Math.round(m.damage * 0.75); // volleys are many bullets — each hits softer
  const ox = m.x, oy = m.y + m.r * 0.4;
  const pattern = m.enraged ? m.volley % 3 : m.volley % 2;
  if (pattern === 0) {
    const n = m.enraged ? 14 : 10;
    const off = m.volley * 0.3;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      st.enemyBullets.push(new EnemyBullet(ox, oy, dmg, Math.cos(a) * sp * 0.75, Math.sin(a) * sp * 0.75, true));
    }
  } else if (pattern === 1) {
    const base = Math.atan2(st.player.y - oy, st.player.x - ox);
    const n = m.enraged ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.22;
      st.enemyBullets.push(new EnemyBullet(ox, oy, dmg, Math.cos(a) * sp * 1.1, Math.sin(a) * sp * 1.1, true));
    }
  } else {
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < 6; i++) {
        const a = m.volley * 0.5 + k * Math.PI + i * 0.18;
        st.enemyBullets.push(new EnemyBullet(ox, oy, dmg, Math.cos(a) * sp * 0.7, Math.abs(Math.sin(a)) * sp * 0.7 + 40, true));
      }
    }
  }
  particles.ring(ox, oy, m.enraged ? '#ff4d5a' : '#e07bff', 40, 0.3, 4);
  audio.bossShot();
}

const events = {
  hit(m) {
    particles.sparkle(m.x, m.y, '#fff', 3);
  },

  kill(m) {
    state.kills++;
    state.combo++;
    state.comboTimer = 1.2;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    if (state.combo === 10) announcer.show('MEGA COMBO!', '×10 chain!', '#7fd8ff', 1.2);
    if (state.combo === 20) announcer.show('UNSTOPPABLE!', '×20 chain!!', '#ff8a3d', 1.2);
    if (m.type === 'ogreBoss') announcer.show('BOSS DEFEATED!', 'The land is safe!', '#58e07f', 1.8);
    const bonus = state.combo >= 3 ? state.combo : 0;
    const pts = m.score + bonus;
    state.score += pts;
    // Coins are scarce by design — only some kills drop any, and bosses always do.
    if (m.type === 'ogreBoss' || Math.random() < CONFIG.economy.coinDropChance) {
      const [lo, hi] = CONFIG.economy.coinDropAmount;
      const drop = m.type === 'ogreBoss' ? hi * 5 : Math.round(lo + Math.random() * (hi - lo));
      state.coins += drop;
    }
    audio.pop(state.combo);
    audio.shatter();
    // Shatterlings break apart into crystal shards in their stage color.
    const tint = state.levelDef?.monsterTint;
    const shardColor = tint?.primary || m.color;
    particles.shatter(m.x, m.y, shardColor, m.r, m.boss ? 40 : m.elite ? 18 : 8);
    particles.shatter(m.x, m.y, tint?.glow || '#ffffff', m.r * 0.6, m.boss ? 14 : 3);
    particles.ring(m.x, m.y, tint?.glow || '#ffffff', m.r * 1.8, 0.28, 3);
    particles.scoreText(m.x, m.y - m.r, `+${pts}`, m.elite ? '#ffd23d' : '#ffe9a8', m.elite || m.boss ? 24 : 16);

    // XP gems (see systems/runUpgrades.js)
    if (state.run && m.isShip !== true) dropGems(state.run, m.x, m.y, m.boss ? 40 : m.elite ? 10 : m.type === 'troll' ? 3 : m.type === 'skeleton' ? 2 : 1);

    if (m.elite) {
      slowmo(0.25, 0.35);
      particles.addShake(5);
      particles.ring(m.x, m.y, '#ffd23d', 70, 0.45, 5);
      state.coins += 3;
      particles.scoreText(m.x, m.y - m.r - 22, '+3 coins', '#ffd23d', 15);
    }
    if (m.boss) {
      slowmo(0.9, 0.2);
      particles.addShake(12);
      audio.bigBoom();
      for (let i = 0; i < 3; i++) particles.ring(m.x, m.y, ['#ffffff', '#ffd23d', '#ff7ad9'][i], 120 + i * 60, 0.6 + i * 0.15, 8 - i * 2);
      state.enemyBullets.length = 0;
    }

    // FEVER — a 25+ kill chain supercharges the Guardian for a few seconds.
    if (state.run && state.combo >= 25 && state.run.feverReady) {
      state.run.fever = 7;
      state.run.feverReady = false;
      audio.fever();
      announcer.show('FEVER!', 'Rainbow fire unleashed!', '#ff7ad9', 1.3);
      particles.ring(state.player.x, state.player.y, '#ff7ad9', 160, 0.5, 6);
    }
  },

  // A Shatterling crossed the gate line — costs one heart, always.
  breach(m) {
    if (mode !== 'PLAYING') return; // run already ended this frame
    state.lives--;
    state.combo = 0;
    state.gateFlash = 0.5;
    audio.crack();
    particles.addShake(10);
    particles.shatter(m.x, CONFIG.gateY, '#ff5c7a', 14, 10);
    particles.ring(m.x, CONFIG.gateY, '#ff5c7a', 120, 0.45, 6);
    particles.scoreText(m.x, CONFIG.gateY - 20, '-1 ♥', '#ff5c7a', 22);
    state.player.hurtFlash = 0.4;
    if (state.lives > 1) announcer.show('GATE BREACHED!', `${state.lives} hearts left`, '#ff5c7a', 1.1);
    if (state.lives === 1) announcer.show('LAST GATE!', 'Protect the gate!', '#ff5c7a', 1.3);
    if (state.lives <= 0) {
      mode = 'GAMEOVER';
      audio.gameOver();
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: state.score, stage: Math.ceil(state.spawner.level / STAGE_SIZE) });
      save(saveData);
      backend.submitScore(saveData.playerId, state.score, Math.ceil(state.spawner.level / STAGE_SIZE));
      ads.showInterstitial(); // ad after losing — the highest-value placement
      syncBanner(); // GAMEOVER screen — banner comes back once the interstitial dismisses
    }
  },

  // A Shatterling crashed into the Guardian — it explodes (no score), and
  // the blast hits the blood line hard. Shielded? It just shatters.
  rammed(m) {
    particles.shatter(m.x, m.y, m.color, m.r, 8);
    particles.ring(m.x, m.y, '#ff5d7a', m.r * 2.4, 0.3, 4);
    const p = state.player;
    if (p.shieldTime > 0) { events.kill(m); return; }
    particles.addShake(6);
    audio.grazed();
    p.invuln = 0;
    if (p.takeHit((m.damage || 20) * (m.elite ? 3 : 2))) events.bloodLost(p);
  },

  // Every gate is a gift now — no more curse/bad portal. Either a fire-rate
  // boost or a partial blood-line heal, both always good to grab.
  gate(g) {
    audio.gateGood();
    if (g.kind === 'blood') {
      state.player.healBlood(CONFIG.gate.bloodGiftHeal);
      particles.sparkle(g.x, g.y, '#ff5c7a');
      particles.scoreText(g.x, g.y, 'BLOOD RESTORED!', '#ff5c7a');
    } else {
      state.player.applyGate(g.mult);
      particles.sparkle(g.x, g.y, '#58e07f');
      particles.scoreText(g.x, g.y, `×${g.mult} MAGIC!`, '#58e07f');
    }
  },

  spellBlocked(s) { particles.sparkle(s.x, s.y, '#9a8fc7'); },

  // An enemy bullet touched the wizard or an angel. Fires on EVERY hit, even
  // ones that don't empty the blood line yet — otherwise the first couple of
  // hits look like nothing happened at all.
  grazed(who) {
    audio.grazed();
    particles.sparkle(who.x, who.y, '#ff5d7a');
  },

  // A bullet hit the wizard while the shield was up — it just fizzles out,
  // no blood/heart cost at all. Distinct blue spark so it visibly reads as
  // "blocked" rather than "grazed".
  shieldBlock(who) {
    particles.sparkle(who.x, who.y, '#7fd8ff');
  },

  // A blood line (wizard's or an angel's) got fully depleted by enemy fire.
  // Costs one shared gate. Blood stays empty afterward — it no longer
  // auto-refills — so it only comes back via a blood-gift gate.
  bloodLost(who) {
    state.lives--;
    // Losing a heart restores half the blood line — prevents a drained
    // Guardian from chain-losing every heart in a single bullet volley.
    if (who === state.player) { who.blood = who.maxBlood * 0.5; who.invuln = 1.5; }
    state.gateFlash = 0.35;
    audio.crack();
    particles.addShake(6);
    particles.poof(who.x, who.y, '#ff5d7a');
    if (state.lives === 1) announcer.show('LAST GATE!', 'Protect the gate!', '#ff5c7a', 1.3);
    if (state.lives <= 0) {
      mode = 'GAMEOVER';
      audio.gameOver();
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: state.score, stage: Math.ceil(state.spawner.level / STAGE_SIZE) });
      save(saveData);
      ads.showInterstitial();
      syncBanner(); // GAMEOVER screen — banner comes back once the interstitial dismisses
    }
  },
};

// --- Update ------------------------------------------------------
function update(dt) {
  // Stage-map drag-to-scroll tracking — runs even outside PLAYING mode
  // (the map lives on the MENU screen). Only active once the continue
  // dialog is dismissed, since the dialog floats over the map and isn't
  // part of the scrollable content.
  if (mode === 'MENU' && continueDismissed) {
    const PROBE = -999999;
    const py = input.targetY(PROBE);
    if (py !== PROBE) {
      if (!mapDragging) {
        mapDragging = true;
        mapDragStartPy = py;
        mapDragStartScroll = mapScrollY;
        mapMoved = false;
      } else {
        const dy = py - mapDragStartPy;
        if (Math.abs(dy) > 6) mapMoved = true;
        const { scrollMax } = homeLayout(mapScrollY);
        mapScrollY = Math.max(0, Math.min(scrollMax, mapDragStartScroll - dy));
      }
    } else {
      mapDragging = false;
    }
  } else {
    mapDragging = false;
  }

  if (mode === 'LEVELUP' && state?.run) state.run.choiceT += dt;
  if (mode !== 'PLAYING') return;
  const st = state;
  const def = st.levelDef;

  st.levelTime += dt;
  updateDecor(dt, def);
  if (def.decor === 'bubbles') updateSeaLife(dt);

  if (st.placing) {
    // Placement mode: the drag surface controls the ghost item instead of
    // the Guardian. The vertical range is a FIXED band across the play
    // field (not tied to wherever the Guardian happened to be standing
    // when the item was bought) — otherwise if the Guardian was up near
    // the top, the old player.y-relative cap made it impossible to drag
    // the item back down to the lower half of the field at all.
    st.placing.x = input.targetX(st.placing.x);
    st.placing.y = input.targetY(st.placing.y);
    st.placing.x = Math.max(30, Math.min(CONFIG.width - 30, st.placing.x));
    const placeMaxY = CONFIG.height - CONFIG.hud.rowBottomOffset - 20;
    st.placing.y = Math.max(120, Math.min(placeMaxY, st.placing.y));
  }

  if (st.placePaused) {
    // The whole battlefield is frozen while placing a wall/turret (and
    // stays frozen across placing more than one) — nothing attacks, moves,
    // or fires until the player taps CONTINUE. Only decor/ambient animation
    // above keeps running so the scene doesn't look dead.
    return;
  }

  st.player.runRateMult = rateMult(st.run);
  // window.__autopilot (debug/playtest bot only) can steer instead of touch.
  const ap = window.__autopilot && window.__autopilot(st);
  st.player.update(dt, ap ? { targetX: () => ap.x, targetY: () => ap.y } : input);
  if (st.player.tryFire()) {
    const { x: muzzleX, y: muzzleY } = gunnerMuzzle(st.player);
    runFire(st.run, muzzleX, muzzleY, st.player.damage, st.spells);
    particles.sparkle(muzzleX, muzzleY, st.run.fever > 0 ? `hsl(${(st.levelTime * 400) % 360},100%,70%)` : '#ffe9a8', 2);
    particles.addShake(0.6);
    audio.zap();
  }
  // footstep dust while the Guardian is moving quickly
  if (Math.hypot(st.player.vx, st.player.vy) > 160 && Math.random() < dt * 30) {
    particles.dust(st.player.x, st.player.y + st.player.size * 1.2);
  }

  for (const a of st.angels) a.update(dt, st.player, st.spells);
  st.angels = st.angels.filter((a) => !a.dead);

  st.spawner.update(dt, st);
  st.spells.forEach((s) => s.update(dt));
  st.monsters.forEach((m) => {
    m.update(dt);
    if (m.tryShoot()) {
      if (m.boss) bossVolley(m);
      else {
        st.enemyBullets.push(new EnemyBullet(m.x, m.y + m.r, m.damage));
        audio.enemyShot();
      }
    }
  });
  applySeparation(st.monsters, dt); // bodies push apart softly, never overlap
  st.obstacles.forEach((o) => o.update(dt));
  st.gates.forEach((g) => g.update(dt));
  st.enemyBullets.forEach((b) => b.update(dt));
  st.ships.forEach((sh) => {
    sh.update(dt);
    if (sh.tryShoot()) {
      // A full broadside — several cannonballs in a side-by-side spread
      // instead of one bullet, so a rarer, tougher ship still feels like a
      // real threat while there are only ever 1-2 on screen at once.
      const n = CONFIG.ship.burstCount;
      const spread = CONFIG.ship.burstSpread;
      const startX = sh.x - ((n - 1) * spread) / 2;
      for (let i = 0; i < n; i++) {
        st.enemyBullets.push(new EnemyBullet(startX + i * spread, sh.y + sh.r * 0.4, sh.damage));
      }
      audio.enemyShot();
    }
  });
  st.walls.forEach((w) => w.update(dt));
  st.turrets.forEach((t) => {
    t.update(dt);
    if (t.tryShoot()) {
      st.spells.push(new Spell(t.x, t.y - t.r, t.damage, { kind: 'turret' }));
      audio.zap();
    }
  });

  resolveCollisions(st, events, dt);
  if (mode !== 'PLAYING') return; // a breach just ended the run

  if (runUpdate(dt, st.run, st, { damageMonster, particles, audio })) {
    mode = 'LEVELUP';
    syncBanner();
    audio.levelUp();
    particles.ring(st.player.x, st.player.y, '#d27bff', 120, 0.5, 6);
  }

  st.enemyBullets = st.enemyBullets.filter((b) => !b.dead);
  st.ships = st.ships.filter((sh) => !sh.dead);
  st.walls = st.walls.filter((w) => !w.dead);
  st.turrets = st.turrets.filter((t) => !t.dead);

  if (st.comboTimer > 0) {
    st.comboTimer -= dt;
    if (st.comboTimer <= 0) { st.combo = 0; if (st.run.fever <= 0) st.run.feverReady = true; }
  }
  if (st.bombFlash > 0) st.bombFlash -= dt;
  if (st.gateFlash > 0) st.gateFlash -= dt;

  st.spells = st.spells.filter((s) => !s.dead);
  st.monsters = st.monsters.filter((m) => !m.dead);
  st.obstacles = st.obstacles.filter((o) => !o.dead);
  st.gates = st.gates.filter((g) => !g.dead);

  // Level complete: the level's whole attacker quota has been sent out (not
  // a clock), the boss (if this level has one) has been spawned and beaten,
  // and nothing hostile is left standing. Don't cut straight to the
  // LEVELCLEAR/VICTORY dialog the instant this becomes true — hold for a
  // few seconds first (LEVEL_CLEAR_DELAY) so the player gets a beat to see
  // the lane clear out and the banner below, instead of the dialog
  // slamming in over the last kill.
  const allAttackersSpawned = st.spawner.allSpawned();
  const bossHandled = !def.boss || st.spawner.bossSpawned;
  const clearNow = allAttackersSpawned && bossHandled && st.monsters.length === 0;

  if (clearNow && !st.levelClearPending) {
    st.levelClearPending = true;
    st.levelClearTimer = LEVEL_CLEAR_DELAY;
    announcer.show('LEVEL CLEAR!', '', '#58e07f', LEVEL_CLEAR_DELAY);
  } else if (!clearNow && st.levelClearPending) {
    // Extremely rare (e.g. a split-spawning slime lands after the check),
    // but if something hostile is somehow back on screen, cancel the
    // countdown instead of cutting to the dialog with enemies still alive.
    st.levelClearPending = false;
  }

  if (st.levelClearPending) {
    st.levelClearTimer -= dt;
    st.run.vacuum = true; // pull every remaining gem in before the dialog
  }

  if (st.levelClearPending && st.levelClearTimer <= 0 && mode === 'PLAYING') {
    st.levelClearPending = false;
    if (st.levelIndex >= LEVELS.length - 1) {
      mode = 'VICTORY';
      audio.waveUp();
      // Full playthrough done — start the next run back at Stage 1 rather
      // than re-triggering VICTORY instantly on "Continue".
      saveData.progress = { levelIndex: 0 };
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: st.score, stage: Math.ceil(st.spawner.level / STAGE_SIZE) });
      save(saveData);
      backend.submitScore(saveData.playerId, st.score, Math.ceil(st.spawner.level / STAGE_SIZE));
      ads.showInterstitial();
      syncBanner(); // VICTORY screen — banner comes back once the interstitial dismisses
    } else {
      mode = 'LEVELCLEAR';
      audio.waveUp();
      st.lives = Math.min(CONFIG.gateHealth, st.lives + 1);
      st.coins += CONFIG.economy.levelClearBonus;   // small, flat — not a coin faucet
      // Persist the furthest point reached so the home screen's "Continue"
      // picks up here even if the player quits before finishing the next level.
      saveData.progress = { levelIndex: st.levelIndex + 1 };
      persistCoins();
      levelsSinceInterstitial++;
      if (levelsSinceInterstitial >= CONFIG.ads.interstitialEveryNLevels) {
        levelsSinceInterstitial = 0;
        ads.showInterstitial(); // periodic ad between levels — not every single one
      }
      syncBanner(); // LEVELCLEAR screen — banner comes back once any interstitial dismisses
    }
  }
}

// --- The GateWall itself ---------------------------------------
// A permanent, always-visible barrier of faceted shard segments along the
// bottom of the screen — one segment per heart of CONFIG.gateHealth. This is
// what "breaching" in collision.js actually means visually: a segment goes
// dark and cracked the moment its matching heart is lost, and re-lights the
// instant a heart is restored (level clear, etc.) since it's derived live
// from state.lives every frame rather than tracked separately.
function drawGateWall(ctx, state) {
  const segs = CONFIG.gateHealth;
  const y0 = CONFIG.height - 30;
  const barH = 20;
  const gap = 4;
  const segW = (CONFIG.width - gap * (segs + 1)) / segs;
  const t = performance.now() / 1000;

  for (let i = 0; i < segs; i++) {
    const cracked = i >= state.lives;
    const x0 = gap + i * (segW + gap);
    const cx = x0 + segW / 2;
    const pulse = cracked ? 0 : 0.55 + 0.25 * Math.sin(t * 2.4 + i);

    ctx.save();
    if (!cracked) {
      ctx.shadowColor = '#7fd8ff';
      ctx.shadowBlur = 14 * pulse;
    }
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + barH);
    if (cracked) {
      grad.addColorStop(0, '#2a3550');
      grad.addColorStop(1, '#161c2c');
    } else {
      grad.addColorStop(0, '#bdeeff');
      grad.addColorStop(1, '#5cc8e8');
    }
    ctx.fillStyle = grad;
    // faceted shard-block shape — a little crystal battlement
    ctx.beginPath();
    ctx.moveTo(x0 + 4, y0 + barH);
    ctx.lineTo(x0, y0 + 6);
    ctx.lineTo(cx, y0);
    ctx.lineTo(x0 + segW, y0 + 6);
    ctx.lineTo(x0 + segW - 4, y0 + barH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = cracked ? '#0d1220' : '#1c3a5c';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (cracked) {
      // crack lines across the dimmed, broken shard
      ctx.strokeStyle = 'rgba(120,150,190,0.5)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx - 6, y0 + 3);
      ctx.lineTo(cx + 2, y0 + 10);
      ctx.lineTo(cx - 3, y0 + barH - 2);
      ctx.stroke();
    } else {
      // glint on a whole, healthy shard
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - segW * 0.18, y0 + 6, 3, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // brief white shatter-flash when a heart was JUST lost
  if (state.gateFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.gateFlash * 1.8})`;
    ctx.fillRect(0, y0 - 6, CONFIG.width, barH + 12);
  }
}

// --- Obstacle ("falling stone") shapes, one per stage decor -------------
// These used to be one identical purple rounded rect with a rune everywhere.
// Every stage now gets its own drifting hazard silhouette + color (pulled
// from that stage's groundPalette so it visually matches the ground/hills
// it's falling past) instead of the same block regardless of theme.
function drawObstacle(o, def) {
  const pal = def.groundPalette;
  const base = pal ? pal.bands[2] : '#4a4066';
  const dark = pal ? pal.bands[0] : '#2a1f4d';
  const light = pal ? pal.bands[3] : '#7fd8ff';
  const x = o.x, y = o.y, w = o.w, h = o.h;
  ctx.fillStyle = base;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;

  switch (def.decor) {
    case 'bubbles': { // Sea War — a real barrel or crate (Kenney "Pirate
      // Kit" art, not a drawn shape), as if it had been thrown/lost
      // overboard from one of the passing ships — o.spriteChoice is set
      // once at spawn time (see spawner.js) so it doesn't flicker between
      // the two every frame.
      const img = KENNEY_PIRATE[o.spriteChoice || 'barrel'];
      if (img) {
        const dw = w, dh = dw * (img.height / img.width);
        ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
      } else {
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'snow': { // Glacial Peak — a BIG chunky ice block: a hexagonal
      // facet body (now drawn near-square per its larger spawner size) with
      // several bright crack/facet highlights so it reads as a real hunk of
      // ice, not a small pebble.
      ctx.beginPath();
      ctx.moveTo(x - w * 0.28, y - h / 2); ctx.lineTo(x + w * 0.28, y - h / 2);
      ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.28, y + h / 2);
      ctx.lineTo(x - w * 0.28, y + h / 2); ctx.lineTo(x - w / 2, y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - w * 0.18, y - h * 0.32); ctx.lineTo(x + w * 0.05, y + h * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.02, y - h * 0.28); ctx.lineTo(x + w * 0.24, y + h * 0.05); ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.moveTo(x - w * 0.28, y - h / 2); ctx.lineTo(x + w * 0.1, y - h / 2); ctx.lineTo(x - w * 0.1, y - h * 0.1); ctx.lineTo(x - w * 0.4, y - h * 0.15); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'sand': { // cracked sandstone block
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - w * 0.2, y - h * 0.4); ctx.lineTo(x - w * 0.05, y); ctx.lineTo(x + w * 0.15, y + h * 0.35); ctx.stroke();
      break;
    }
    case 'crystals': { // faceted crystal shard (used by Crystallized Forest / Abyssal Forest)
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w * 0.32, y - h * 0.05);
      ctx.lineTo(x + w * 0.2, y + h / 2); ctx.lineTo(x - w * 0.2, y + h / 2);
      ctx.lineTo(x - w * 0.32, y - h * 0.05); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = light; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w * 0.1, y); ctx.lineTo(x, y + h * 0.3); ctx.lineTo(x - w * 0.1, y); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'embers': { // jagged obsidian rock with a glowing crack
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + h * 0.3); ctx.lineTo(x - w * 0.3, y - h / 2);
      ctx.lineTo(x + w * 0.1, y - h * 0.3); ctx.lineTo(x + w / 2, y - h * 0.4);
      ctx.lineTo(x + w * 0.35, y + h / 2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - w * 0.1, y - h * 0.3); ctx.lineTo(x + w * 0.05, y + h * 0.2); ctx.stroke();
      break;
    }
    case 'clouds': { // broken gilded marble/column fragment
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y); ctx.lineTo(x + w / 2 - 6, y); ctx.stroke();
      break;
    }
    case 'voidstars': { // elongated floating aether shard
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.6); ctx.lineTo(x + w * 0.22, y);
      ctx.lineTo(x, y + h * 0.6); ctx.lineTo(x - w * 0.22, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rain': { // brass gear/cog chunk — Clockwork City
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * 0.72;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fireflies': { // mushroom-capped log — Spectral Jungle
      ctx.beginPath(); ctx.roundRect(x - w * 0.35, y - h * 0.2, w * 0.7, h * 0.4, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.ellipse(x, y - h * 0.32, w * 0.28, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();
      break;
    }
    case 'banners': { // grey granite boulder — Crown of the Mountain King
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + h * 0.2); ctx.lineTo(x - w * 0.25, y - h / 2);
      ctx.lineTo(x + w * 0.25, y - h * 0.45); ctx.lineTo(x + w / 2, y + h * 0.15);
      ctx.lineTo(x + w * 0.1, y + h / 2); ctx.lineTo(x - w * 0.2, y + h * 0.45);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'spores': { // moss-wrapped log — The Deepwood
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * 0.32, w, h * 0.64, h * 0.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = light; ctx.lineWidth = 2;
      for (const fx of [-0.28, 0, 0.28]) {
        ctx.beginPath(); ctx.moveTo(x + fx * w, y - h * 0.3); ctx.lineTo(x + fx * w, y + h * 0.3); ctx.stroke();
      }
      break;
    }
    default: // fallback — the original stone-rune block
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = light;
      ctx.font = 'bold 14px "Fredoka", Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ᚱ', x, y + 5);
  }
}

// --- Render ------------------------------------------------------
function drawMonster(m) {
  // Fully procedural, animated Shatterlings (see render/creatures.js): walk
  // cycles, blinking eyes that track the Guardian, lean into turns, squash
  // + knockback on hit, glowing shot wind-ups. The flying imp keeps its
  // hand-made bat wing-flap frames, now tinted correctly per stage.
  const tint = state?.levelDef?.monsterTint;
  const p = state?.player;
  let look = { x: 0, y: 1 };
  if (p) {
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    look = { x: dx / d, y: dy / d };
  }
  const batImg = m.type === 'imp' && BAT_FRAMES.length
    ? BAT_FRAMES[Math.floor(m.anim * 1.2 + m.seed) % BAT_FRAME_COUNT]
    : null;
  drawCreature(ctx, m, tint, state ? state.levelTime : performance.now() / 1000, look, batImg);
  // Blood-line: every enemy that takes more than one hit shows it, always
  // visible (not just after first damage) so toughness reads at a glance in
  // later stages. Low hp counts use tiny pips (matches the wizard/ward
  // motif); very tanky late-stage enemies (trolls, bosses) fall back to a
  // slim bar so the row doesn't overflow the sprite.
  if (m.maxHp > 1 && !m.boss) {
    const py = m.y - m.r - 9;
    if (m.maxHp <= 8) {
      const pipW = 4, gap = 1.5;
      const total = m.maxHp * pipW + (m.maxHp - 1) * gap;
      let px = m.x - total / 2;
      for (let i = 0; i < m.maxHp; i++) {
        ctx.fillStyle = i < m.hp ? '#ff5d7a' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(px + pipW / 2, py, pipW / 2, 0, Math.PI * 2);
        ctx.fill();
        px += pipW + gap;
      }
    } else {
      const w = m.r * 1.3;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(m.x - w / 2, py - 1.5, w, 3);
      ctx.fillStyle = '#ff5d7a';
      ctx.fillRect(m.x - w / 2, py - 1.5, w * (m.hp / m.maxHp), 3);
    }
  }
}

// Sea War ship — the real Kenney "Pirate Kit" ship render (not a drawn
// shape), flipped to face its direction of travel, with a wake trail and the
// same hit-flash + hp-bar treatment as drawMonster.
function drawShip(s) {
  const r = s.r;
  const img = KENNEY_PIRATE[s.sprite];

  // wake ripple behind the ship (drawn first, so the hull sits on top)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#e8f9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const wakeDir = -s.dir;
  ctx.moveTo(s.x + wakeDir * r * 0.6, s.y + r * 0.3);
  ctx.quadraticCurveTo(s.x + wakeDir * r * 1.6, s.y + r * 0.55, s.x + wakeDir * r * 2.6, s.y + r * 0.35);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(s.x, s.y);
  // The baked sprite (assets/env/kenney_pirate/ship-*.png) is pre-rotated so
  // its bow points LEFT by default — only mirror when sailing right.
  if (s.dir > 0) ctx.scale(-1, 1);
  if (img) {
    const dw = r * 2.3, dh = dw; // sprite is ~square with transparent padding
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    if (s.hitFlash > 0) {
      ctx.globalAlpha = s.hitFlash * 5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalAlpha = 1;
    }
  } else {
    // Fallback shape while the sprite is still loading.
    ctx.fillStyle = s.color;
    ctx.strokeStyle = '#10141c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.42); ctx.lineTo(r, r * 0.42); ctx.lineTo(r * 0.72, r * 0.85); ctx.lineTo(-r * 0.72, r * 0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  if (s.maxHp > 1) {
    const py = s.y - r - 14;
    const w = r * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(s.x - w / 2, py - 2, w, 5);
    ctx.fillStyle = '#ff5d7a';
    ctx.fillRect(s.x - w / 2, py - 2, w * (s.hp / s.maxHp), 5);
  }
}

// Player-placed Wall — a squat stone-brick barrier with a hit-flash overlay
// and a thin hp bar, same treatment as monsters/ships.
function drawWall(w) {
  ctx.save();
  ctx.fillStyle = '#8a6a4a';
  ctx.strokeStyle = '#4a3420';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h, 5);
  ctx.fill(); ctx.stroke();
  // brick seams
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  const rows = 2, cols = 4;
  for (let r = 1; r < rows; r++) {
    const ly = w.y - w.h / 2 + (w.h / rows) * r;
    ctx.beginPath(); ctx.moveTo(w.x - w.w / 2, ly); ctx.lineTo(w.x + w.w / 2, ly); ctx.stroke();
  }
  for (let c = 1; c < cols; c++) {
    const lx = w.x - w.w / 2 + (w.w / cols) * c;
    ctx.beginPath(); ctx.moveTo(lx, w.y - w.h / 2); ctx.lineTo(lx, w.y + w.h / 2); ctx.stroke();
  }
  if (w.hitFlash > 0) {
    ctx.globalAlpha = w.hitFlash * 5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (w.maxHp > 1) {
    const py = w.y - w.h / 2 - 8;
    const bw = w.w;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(w.x - bw / 2, py - 2, bw, 5);
    ctx.fillStyle = '#c8a06a';
    ctx.fillRect(w.x - bw / 2, py - 2, bw * (w.hp / w.maxHp), 5);
  }
}

// Player-placed Turret ("Gun") — real cannon art (user-supplied, own
// generation) cycling through 4 frames keyed on its own fire timer: idle,
// a bright glow just before it fires (anticipation), a muzzle-blast frame
// right on the shot, and drifting smoke as it cools down — instead of the
// old plain drawn grey disc + barrel.
function drawTurret(t) {
  ctx.save();
  ctx.translate(t.x, t.y);

  const img = t.barrelRecoil > 0.7 ? CANNON_FRAMES.fire
    : t.barrelRecoil > 0.25 ? CANNON_FRAMES.smoke
    : t.shootTimer !== undefined && t.shootTimer < 0.3 ? CANNON_FRAMES.glow
    : CANNON_FRAMES.idle;

  if (img) {
    const dh = t.r * 3.6, dw = dh * (img.width / img.height);
    // small recoil kick, same feel as the old vector barrel
    const kick = t.barrelRecoil * 3;
    ctx.drawImage(img, -dw / 2, -dh + t.r * 1.1 + kick, dw, dh);
    if (t.hitFlash > 0) {
      ctx.globalAlpha = t.hitFlash * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else {
    // Fallback (art not yet loaded) — old drawn look.
    ctx.fillStyle = '#6a6f7a';
    ctx.strokeStyle = '#2e3138';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, t.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    const kick = t.barrelRecoil * 4;
    ctx.fillStyle = '#ffd88a';
    ctx.strokeStyle = '#8a6a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-t.r * 0.28, -t.r * 1.5 + kick, t.r * 0.56, t.r * 1.15, 3);
    ctx.fill(); ctx.stroke();
    if (t.hitFlash > 0) {
      ctx.globalAlpha = t.hitFlash * 5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();

  if (t.maxHp > 1) {
    const py = t.y - t.r - 10;
    const bw = t.r * 1.8;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(t.x - bw / 2, py - 2, bw, 5);
    ctx.fillStyle = '#ffd88a';
    ctx.fillRect(t.x - bw / 2, py - 2, bw * (t.hp / t.maxHp), 5);
  }
}

function drawSpell(s) {
  const ang = Math.atan2(s.vx, -s.vy);
  let col, core = '#ffffff';
  if (s.kind === 'fever') col = `hsl(${(s.hue + s.age * 600) % 360},100%,62%)`;
  else if (s.kind === 'seeker') col = '#ff9a3d';
  else if (s.kind === 'turret') col = '#ffd23d';
  else col = '#7fd8ff';
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(ang);
  // trail
  const len = s.kind === 'seeker' ? 20 : 26;
  const grad = ctx.createLinearGradient(0, 0, 0, len);
  grad.addColorStop(0, col);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = grad;
  ctx.lineWidth = s.r * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, len); ctx.lineTo(0, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  drawGlow(ctx, s.x, s.y, s.r * 1.7, s.kind === 'fever' ? '#ff7ad9' : col, 0.45);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath();
  if (s.kind === 'seeker') {
    ctx.roundRect(-3, -8, 6, 14, 3);
  } else {
    ctx.moveTo(0, -s.r * 1.3); ctx.lineTo(s.r * 0.45, 0); ctx.lineTo(0, s.r * 0.9); ctx.lineTo(-s.r * 0.45, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.ellipse(0, -s.r * 0.15, s.r * 0.18, s.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (s.kind === 'seeker' && Math.random() < 0.5) particles.dust(s.x, s.y, 'rgba(255,200,150,0.5)');
}

// Boss health bar under the top HUD while a boss is alive.
function drawBossBar(st) {
  const boss = st.monsters.find((m) => m.boss && !m.dead);
  if (!boss) return;
  const x = 90, w = CONFIG.width - 180, y = 104, h = 10;
  const frac = Math.max(0, boss.hp / boss.maxHp);
  boss._shownFrac = boss._shownFrac === undefined ? frac : boss._shownFrac + (frac - boss._shownFrac) * 0.08;
  ctx.save();
  ctx.fillStyle = 'rgba(10,4,20,0.75)';
  ctx.beginPath(); ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 8); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(x, y, w * boss._shownFrac, h, 6); ctx.fill();
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, boss.enraged ? '#ff2d4a' : '#b358e0');
  grad.addColorStop(1, boss.enraged ? '#ff8a3d' : '#ff5c9a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(x, y, Math.max(0.01, w * frac), h, 6); ctx.fill();
  ctx.font = '13px "Luckiest Guy", Arial';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1a0d30';
  const label = boss.enraged ? 'BRUNCLE — ENRAGED!' : 'BRUNCLE, THE GATE-BREAKER';
  ctx.strokeText(label, CONFIG.width / 2, y - 6);
  ctx.fillStyle = boss.enraged ? '#ff8a8a' : '#ffd23d';
  ctx.fillText(label, CONFIG.width / 2, y - 6);
  ctx.restore();
}

function render() {
  ctx.save();
  if (particles.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * particles.shake, (Math.random() - 0.5) * particles.shake);
  }

  if (mode === 'MENU') {
    // A plain app-chrome background (same dark purple as every other nav
    // page's pageShell), NOT the live level-1 gameplay background — the
    // home/Play page should read as a menu, not as a level you're mid-run
    // in. Stage tiles show off each theme's own colors on top of this.
    const menuGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    menuGrad.addColorStop(0, '#241a42');
    menuGrad.addColorStop(1, '#140c28');
    ctx.fillStyle = menuGrad;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    renderMenu(ctx, saveData.best || 0, saveData.playerName, saveData.coins || 0, saveData.progress?.levelIndex || 0, continueDismissed, mapScrollY);
    ctx.restore();
    return;
  }

  if (mode === 'UPGRADES') {
    renderBackground(LEVELS[0], 0);
    renderUpgrades(ctx, saveData, armorySel, performance.now() / 1000, SPRITES.gunner_07, armoryFlash);
    ctx.restore();
    return;
  }

  if (mode === 'SETTINGS') {
    renderBackground(LEVELS[0], 0);
    renderSettings(ctx, audio.isMuted(), saveData.playerName, !!saveData.removeAds, iap.enabled);
    ctx.restore();
    return;
  }

  // Shop opened from the home-screen coin pill — no run in progress, so
  // there's no `state` to draw gameplay behind it. Render it as its own
  // plain page instead of falling through to the PLAYING-mode gameplay
  // render below (which would crash reading state.levelDef on null).
  if (mode === 'SHOP' && (!state || modeBeforeShop !== 'PLAYING')) {
    renderBackground(LEVELS[0], 0);
    renderShop(ctx, { coins: saveData.coins || 0 }, iap.enabled);
    ctx.restore();
    return;
  }

  if (mode === 'LEADERBOARD') {
    renderBackground(LEVELS[0], 0);
    renderLeaderboard(ctx, saveData, globalBoard, globalBoardStatus);
    ctx.restore();
    return;
  }

  const st = state;
  renderBackground(st.levelDef, st.levelTime);
  renderAtmosphereBack(ctx, st.levelDef, st.levelTime);

  // Obstacles — each stage gets its own drifting hazard silhouette (see
  // drawObstacle above) instead of one identical purple rune block.
  for (const o of st.obstacles) drawObstacle(o, st.levelDef);

  // Gates — small mini crystal archways, always a gift now (no more curse
  // portal). Fire-rate gifts glow icy blue with a ×mult label; blood-heal
  // gifts glow warm pink/red with a small heart instead.
  for (const g of st.gates) {
    const glow = 0.5 + 0.3 * Math.sin(g.pulse);
    const tint = g.kind === 'blood' ? '#ff5c7a' : '#7fd8ff';
    ctx.globalAlpha = glow;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // inner faceted ring, like a cut gem seen edge-on
    ctx.globalAlpha = glow * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, g.rx - 6, g.ry - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint;
    ctx.font = '15px "Luckiest Guy", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(g.kind === 'blood' ? '♥' : `×${g.mult}`, g.x, g.y + 5);
  }

  // Spells — glowing crystal bolts oriented along their flight path, with a
  // light trail. FEVER bolts cycle through the rainbow; seekers are orange
  // missiles with a smoke tail; turret shots are golden.
  for (const sp of st.spells) drawSpell(sp);

  // XP gems (under the monsters so the horde stays readable)
  renderRunWorld(ctx, { ...st.run, picks: {} }, st.player, st.levelTime);

  // Ships (Sea War only) — drawn before monsters so falling Shatterlings
  // read as being in front of/closer than the ships out on the water.
  for (const sh of st.ships) drawShip(sh);

  // Monsters
  for (const m of st.monsters) drawMonster(m);

  // Player-placed defenses — drawn after monsters so they read as being in
  // the same lane the monsters are pressing against.
  for (const w of st.walls) drawWall(w);
  for (const t of st.turrets) drawTurret(t);

  // Placement ghost — a translucent preview of the wall/turret being
  // dragged into position, plus a pulsing ring so the drop point is obvious.
  if (st.placing) {
    const pt = performance.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.55;
    if (st.placing.type === 'wall') {
      drawWall({ x: st.placing.x, y: st.placing.y, w: CONFIG.wall.width, h: CONFIG.wall.height, hp: CONFIG.wall.hp, maxHp: CONFIG.wall.hp, hitFlash: 0 });
    } else {
      drawTurret({ x: st.placing.x, y: st.placing.y, r: CONFIG.turret.size / 2, hp: CONFIG.turret.hp, maxHp: CONFIG.turret.hp, hitFlash: 0, barrelRecoil: 0 });
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(pt * 5) * 0.3;
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(st.placing.x, st.placing.y, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Enemy bullets (dark bolts — visually distinct from the wizard's orange fire)
  for (const b of st.enemyBullets) {
    const pulse = 1 + Math.sin(b.age * 14) * 0.15;
    drawGlow(ctx, b.x, b.y, b.r * 2.6 * pulse, b.big ? '#ff4d8a' : '#c25cff', 0.75);
    ctx.fillStyle = b.big ? '#ffd0e4' : '#f0d4ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.55 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Angels
  for (const a of st.angels) a.render(ctx);

  // Shield ring — drawn behind the wizard while shieldTime is active, fading
  // and flickering in its last couple of seconds as a "running out" cue.
  const p = st.player;
  if (p.shieldTime > 0) {
    const tt = performance.now() / 1000;
    const fading = p.shieldTime < 2;
    const flicker = fading ? (Math.floor(tt * 8) % 2 === 0 ? 0.35 : 0.85) : 0.7 + Math.sin(tt * 3) * 0.15;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#7fd8ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Automaton Gunner — 2-frame firing cycle, plus motion: leans into its
  // movement, kicks back on every shot (recoil squash), hovers on a soft
  // ground shadow, and flashes a muzzle star when it fires.
  if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 12) % 2 === 0) ctx.globalAlpha = 0.5;
  if (p.invuln > 0 && p.hurtFlash <= 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.6;
  const gunnerSprite = Math.floor(st.levelTime * 6) % 2 === 0 ? 'gunner_07' : 'gunner_08';
  {
    const img = SPRITES[gunnerSprite];
    const footY = p.y + p.size * 1.25;
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = 0.28 * prevA;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, footY + 2, p.size * 0.55, p.size * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = prevA;
    if (img) {
      // Tall/narrow frames — scale by width, anchor the FEET on a fixed line.
      const dispW = p.size * GUNNER_DISP_MULT;
      const dispH = dispW * (img.naturalHeight / img.naturalWidth);
      const lean = Math.max(-0.22, Math.min(0.22, p.vx / 1600));
      const kick = p.recoil * p.recoil;
      ctx.save();
      ctx.translate(p.x, footY);
      ctx.rotate(lean);
      ctx.scale(1 + kick * 0.05, 1 - kick * 0.06);
      if (p.facing === -1) ctx.scale(-1, 1);
      ctx.drawImage(img, -dispW / 2, -dispH, dispW, dispH);
      ctx.restore();
    }
    if (p.recoil > 0.55) {
      const mz = gunnerMuzzle(p);
      const f = (p.recoil - 0.55) / 0.45;
      const col = st.run.fever > 0 ? `hsl(${(st.levelTime * 400) % 360},100%,70%)` : '#ffe9a8';
      drawGlow(ctx, mz.x, mz.y, 10 + f * 10, st.run.fever > 0 ? '#ff7ad9' : col, f); // fixed key — glow sprites are cached per color
      ctx.save();
      ctx.translate(mz.x, mz.y);
      ctx.rotate(st.levelTime * 20);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = f;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 === 0 ? 7 * f + 2 : 2;
        ctx.lineTo(Math.cos((i / 8) * Math.PI * 2) * rr, Math.sin((i / 8) * Math.PI * 2) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // Orbit blades circle the Guardian (drawn over him)
  renderRunWorld(ctx, { ...st.run, gems: [] }, p, st.levelTime);

  ctx.globalAlpha = 1;

  // Guardian's blood line — one clean full progress bar under the
  // character's feet (replaces the old thin sliver + separate row of
  // tiny pip-dots, which were redundant and easy to mistake for a stray
  // line). Blood-red fill to match the "blood line" theme, rounded, with
  // a border so it reads clearly as a health bar even at a glance.
  if (p.maxBlood > 1) {
    // Smaller and tucked right under his feet now (was a much wider/longer
    // bar floating well below him) — matches the same foot offset used for
    // the sprite itself (see GUNNER_DISP_MULT/footY above).
    const barW = p.size * 0.9, barH = 4;
    const bx = p.x - barW / 2, by = p.y + p.size * 1.25;
    const frac = Math.max(0, Math.min(1, p.blood / p.maxBlood));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 4); ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = frac > 0.3 ? '#ff5d7a' : '#ff2d4a';
      ctx.beginPath(); ctx.roundRect(bx, by, barW * frac, barH, 4); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 4); ctx.stroke();
    ctx.restore();
  }

  // The GateWall crystal-segment bar used to render here, right behind the
  // buy-button row — its glow showed through the gaps between buttons and
  // clashed with themed seafloors/grounds (esp. Sea War's sand). Lives are
  // already tracked by the heart icons in the top-right HUD, so this
  // redundant bottom bar has been removed rather than re-themed per stage.

  // Bomb flash
  if (st.bombFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${st.bombFlash * 2.4})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  renderAtmosphereFront(ctx, st, st.levelTime, st.run.fever);
  particles.render(ctx);
  announcer.render(ctx);
  renderHUD(ctx, st, ads.isRewardedReady());
  renderXPBar(ctx, st.run);
  drawBossBar(st);

  if (mode === 'LEVELCLEAR') renderLevelClear(ctx, st, LEVELS[st.levelIndex + 1].name);
  if (mode === 'VICTORY') renderVictory(ctx, st, saveData.best || 0);
  if (mode === 'GAMEOVER') renderGameOver(ctx, st, saveData.best || 0);
  if (mode === 'SHOP') renderShop(ctx, st, iap.enabled);
  if (mode === 'PAUSED') renderPause(ctx);
  if (mode === 'PLAYING' && st.placePaused && !st.placing) renderPlacementBanner(ctx);
  if (mode === 'LEVELUP') renderLevelUp(ctx, st.run, performance.now() / 1000);

  ctx.restore();
}

// Debug/test hook (harmless in production)
window.__game = {
  get mode() { return mode; }, get state() { return state; }, buyWeapon,
  start(i = 0) { newGame(i); mode = 'PLAYING'; syncBanner(); },
  pick(i = 0) {
    if (mode !== 'LEVELUP') return false;
    const again = applyPick(state.run, state.run.choices[i], state);
    if (!again) { mode = 'PLAYING'; syncBanner(); }
    return true;
  },
  next() { if (mode === 'LEVELCLEAR') { startLevel(state.levelIndex + 1); mode = 'PLAYING'; syncBanner(); } },
  // Steps + renders one frame (for driving the game when rAF is throttled).
  frame(dt = 1 / 60) { update(dt); particles.update(dt); announcer.update(dt); render(); },
  // Headless fast-forward for balance testing: steps the simulation without
  // rendering. picker(choices) → index decides level-up cards.
  sim(seconds, picker = () => 0) {
    const steps = Math.round(seconds * 60);
    // muted while fast-forwarding: hundreds of synth blips per second would
    // pile up as audio nodes (and stall the page if audio isn't unlocked yet)
    const wasMuted = audio.isMuted();
    audio.setMuted(true);
    try {
      for (let i = 0; i < steps; i++) {
        if (mode === 'LEVELUP') this.pick(picker(state.run.choices));
        else if (mode === 'LEVELCLEAR') this.next();
        else if (mode !== 'PLAYING') break;
        update(1 / 60);
        particles.update(1 / 60);
      }
    } finally {
      audio.setMuted(wasMuted);
    }
    return mode;
  },
};

// --- Loop --------------------------------------------------------
let last = performance.now();
function loop(now) {
  const rawDt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (slowmoT > 0) slowmoT -= rawDt;
  else timeScale += (1 - timeScale) * Math.min(1, rawDt * 6);
  const dt = rawDt * timeScale;
  update(dt);
  particles.update(dt);
  announcer.update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
