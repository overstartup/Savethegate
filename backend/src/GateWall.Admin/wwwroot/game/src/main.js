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
import { renderMenu, renderLevelClear, renderVictory, renderGameOver, REVIVE_BUTTON, renderShop, SHOP_BUTTONS, MENU_BUTTONS, END_MENU_BUTTON, renderUpgrades, UPGRADE_BUTTONS, renderLeaderboard, LEADERBOARD_BUTTONS, renderSettings, SETTINGS_BUTTONS, PRIVACY_URL, homeLayout, CONTINUE_CLOSE_BUTTON, CONTINUE_CARD_RECT, envIcon, renderPause, PAUSE_BUTTONS, BG_IMAGES, KENNEY_SEA, KENNEY_PIRATE, KENNEY_CASTLE, DESERT_PLANTS, ICE_GLACIAL, BAT_FRAMES, BAT_FRAME_COUNT, CANNON_FRAMES } from './ui/screens.js';
import { Announcer } from './ui/announce.js';
import { LEVELS, WEAPONS, STAGE_SIZE, STAGE_COUNT } from './data/levels.js';
import { COIN_PACKS } from './data/shop.js';
import { UPGRADE_MAX, upgradeCost } from './data/upgrades.js';
import { load, save, submitScore } from './data/save.js';
import { ads } from './systems/ads.js';
import { iap } from './systems/iap.js';
import { backend } from './systems/backend.js';

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
const MONSTER_SPRITE = { goblin: 'goblin', slime: 'slime', slimeSmall: 'slime', imp: 'imp' };

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
  // War screen, below the hills) — see CONFIG.ship.waterLine.
  const waterY = CONFIG.height * CONFIG.ship.waterLine;
  for (let i = 0; i < n; i++) {
    decor.push({
      x: rand(0, CONFIG.width),
      y: def.decor === 'bubbles' ? rand(waterY + 10, CONFIG.height - 10) : rand(0, CONFIG.height),
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
      // the whole screen — the hills above the water line aren't their space.
      const waterY = CONFIG.height * CONFIG.ship.waterLine;
      if (d.y < waterY - 20) d.y = CONFIG.height - 10;
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
  seaFish = [];
  // Fish swim in small schools banded into horizontal "layers" at
  // different depths — each school shares one sprite, direction, and
  // speed so it reads as a group moving together, like the reference
  // aquarium scene's stacked rows of same-color schools, instead of a
  // handful of solo fish scattered at random.
  const waterY = CONFIG.height * CONFIG.ship.waterLine;
  const layerCount = 4;
  const bandH = (CONFIG.height - 90 - waterY) / layerCount;
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
    case 'bubbles': { // Sea War — bright water-surface line where the hills
      // meet the sea; the real Ship entities (spawner/main.js) sail along it.
      const waterY = h * CONFIG.ship.waterLine;
      ctx.strokeStyle = 'rgba(232,249,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, waterY); ctx.lineTo(w, waterY); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,230,255,0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, waterY + 3); ctx.lineTo(w, waterY + 3); ctx.stroke();

      // Two-tone seafloor — a darker rock base with a lighter, gently
      // wavy sand layer over the top, matching the classic Kenney "Fish
      // Pack" underwater scene's scalloped sand-over-rock silhouette,
      // instead of the old flat gradient band.
      const rockY = h - 34;
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(0, rockY, w, 34);

      const sandBaseY = h - 74;
      const waveAmp = 8, waveFreq = 0.028;
      const waveY = (x) => sandBaseY + Math.sin(x * waveFreq + t * 0.4) * waveAmp;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, waveY(0));
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, waveY(x));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = '#e0c48c';
      ctx.fill();
      // wet-sand edge highlight tracing the same wave
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, waveY(0));
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, waveY(x));
      ctx.stroke();

      // No tree here — this is a sea/shore scene, not a jungle beach, so
      // the palm was pulled per feedback; a second sand-rock cluster on
      // the left balances it instead.
      const rockImg = KENNEY_PIRATE['rocks-sand-a'];
      if (rockImg) {
        const rh = 34, rw = rh * (rockImg.width / rockImg.height);
        ctx.drawImage(rockImg, w * 0.1 - rw / 2, h - 10 - rh * 0.5 - GO, rw, rh);
        ctx.drawImage(rockImg, w * 0.85 - rw / 2, h - 6 - rh * 0.5 - GO, rw, rh);
        ctx.drawImage(rockImg, w * 0.06 - rw * 0.6 / 2, h - 8 - rh * 0.5 * 0.6 - GO, rw * 0.6, rh * 0.6);
      }
      const crateImg = KENNEY_PIRATE.crate;
      if (crateImg) {
        const ch2 = 30, cw2 = ch2 * (crateImg.width / crateImg.height);
        ctx.drawImage(crateImg, w * 0.92 - cw2 / 2, h - ch2 - 6 - GO, cw2, ch2);
      }
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
  const bgImg = BG_IMAGES[themeIdx];
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, CONFIG.width, CONFIG.height);
    // Faint tint so gameplay sprites keep contrast against the photo.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    grad.addColorStop(0, def.sky[0]);
    grad.addColorStop(1, def.sky[1]);
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
// Show banner immediately on the main menu
ads.showBanner();
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
    spawner: new Spawner(LEVELS[idx], idx),
    score: 0, kills: 0, coins: saveData.coins,
    lives: CONFIG.gateHealth,
    gateFlash: 0,
    combo: 0, bestCombo: 0, comboTimer: 0,
    levelIndex: idx, levelDef: LEVELS[idx], levelTime: 0,
    onBoss: () => { audio.crack(); announcer.show('BOSS INCOMING!', 'Defeat it to clear the level!', '#ff5c7a', 2.0); particles.addShake(8); },
  };
  startLevel(idx);
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
    announcer.show('KA-BOOM!', '', '#ff8a3d', 1.1);
    particles.addShake(12);
    for (const m of state.monsters) {
      if (m.dead) continue;
      m.dead = true;
      events.kill(m);
    }
    // white flash
    state.bombFlash = 0.25;
  } else if (key === 'angel') {
    audio.gateGood();
    announcer.show('WARD SUMMONED!', 'A crystal sprite joins you — for good!', '#bdeeff', 1.4);
    const side = state.angels.length % 2 === 0 ? 1 : -1;
    state.angels.push(new Angel(side));
    particles.sparkle(state.player.x, state.player.y - 40, '#bdeeff');
  } else if (key === 'shield') {
    audio.gateGood();
    const dur = WEAPONS.shield.duration;
    announcer.show('SHIELD UP!', `Blocks bullets for ${dur}s`, '#7fd8ff', 1.2);
    state.player.addShield(dur);
    particles.sparkle(state.player.x, state.player.y, '#7fd8ff');
  } else if (key === 'wall') {
    audio.gateGood();
    announcer.show('DRAG TO PLACE', 'Drag anywhere, release to set the wall', '#c8a06a', 1.6);
    state.placing = { type: 'wall', x: state.player.x, y: CONFIG.wall.dropY, armed: false };
  } else if (key === 'turret') {
    audio.gateGood();
    announcer.show('DRAG TO PLACE', 'Drag anywhere, release to set the turret', '#ffd88a', 1.6);
    state.placing = { type: 'turret', x: state.player.x, y: CONFIG.turret.dropY, armed: false };
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

// --- Permanent Guardian upgrades (main menu, persists across runs) -----
function buyUpgrade(key) {
  const level = saveData.permanent[key] || 0;
  if (level >= UPGRADE_MAX) return;
  const cost = upgradeCost(key, level);
  if (saveData.coins < cost) { audio.gateCurse(); return; }
  saveData.coins -= cost;
  saveData.permanent[key] = level + 1;
  save(saveData);
  syncProfile();
  audio.gateGood();
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
}

function closeShop() {
  mode = modeBeforeShop;
}

function hit(btn, x, y) {
  return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

// --- Global leaderboard (backend) -----------------------------------------
let globalBoard = null;         // array of { rank, name, score, stageReached } once loaded
let globalBoardStatus = 'idle'; // idle | loading | ready | error

function openLeaderboard() {
  mode = 'LEADERBOARD';
  if (globalBoardStatus === 'loading') return;
  globalBoardStatus = 'loading';
  backend.topLeaderboard(20).then((rows) => {
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
    if (state) {
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
  if (hit(MENU_BUTTONS.play, x, y)) { mode = 'MENU'; return true; }
  if (hit(MENU_BUTTONS.upgrades, x, y)) { mode = 'UPGRADES'; return true; }
  if (hit(MENU_BUTTONS.settings, x, y)) { resetArmed = false; mode = 'SETTINGS'; return true; }
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
    if (navTap(x, y)) return;
    for (const key in UPGRADE_BUTTONS.buy) {
      if (hit(UPGRADE_BUTTONS.buy[key], x, y)) buyUpgrade(key);
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
      if (hit(CONTINUE_CARD_RECT, x, y)) {
        newGame(saveData.progress?.levelIndex || 0);
        mode = 'PLAYING';
        ads.showBanner();
      }
      // Dialog is open and dimming the whole page — anything outside its
      // card (and outside the close X, checked above) is a no-op; the
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
    if (x !== null && hit(END_MENU_BUTTON, x, y)) { mode = 'MENU'; ads.showBanner(); return; }
    
    // Revive button handling
    if (mode === 'GAMEOVER' && x !== null && ads.isRewardedReady() && typeof REVIVE_BUTTON !== 'undefined' && hit(REVIVE_BUTTON, x, y)) {
      ads.showRewarded(() => {
        // Reward: Full health and resume!
        state.player.hp = state.player.maxHp;
        mode = 'PLAYING';
        ads.showBanner();
      }, () => {
        // Fallback if ad failed
      });
      return;
    }

    newGame(saveData.progress?.levelIndex || 0);
    mode = 'PLAYING';
    ads.showBanner();
    return;
  }
  if (mode === 'LEVELCLEAR') {
    startLevel(state.levelIndex + 1);
    mode = 'PLAYING';
    ads.showBanner();
    return;
  }

  if (mode === 'PAUSED') {
    if (x === null) return;
    if (hit(PAUSE_BUTTONS.resume, x, y)) { mode = 'PLAYING'; ads.showBanner(); return; }
    if (hit(PAUSE_BUTTONS.exit, x, y)) { mode = 'MENU'; ads.showBanner(); return; } // abandon the run, no score submitted
    return;
  }

  if (mode === 'PLAYING' && x !== null) {
    // Mid-placement, any fresh press anywhere on the field is the start of
    // the placement drag, not a button press — HUD buttons are ignored
    // until the wall/turret is dropped.
    if (state.placing) return;
    const btn = buttonAt(x, y);
    if (btn === 'pause') { mode = 'PAUSED'; ads.hideBanner(); }
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
    state.walls.push(new Wall(px, py));
    announcer.show('WALL SET!', 'Blocks attackers in its lane', '#c8a06a', 1.1);
    particles.sparkle(px, py, '#c8a06a');
  } else if (type === 'turret') {
    state.turrets.push(new Turret(px, py));
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
    ads.showBanner();
    return;
  }
});

// --- Collision events (points, coins, lives, juice) --------------
const events = {
  hit(m) { particles.sparkle(m.x, m.y, '#fff'); },

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
    particles.poof(m.x, m.y, m.color);
    particles.scoreText(m.x, m.y - m.r, `+${pts}`);
  },

  breach(m) {
    state.lives--;
    state.combo = 0;
    state.gateFlash = 0.35;
    audio.crack();
    particles.addShake(10);
    particles.poof(m.x, Math.min(m.y, CONFIG.height - 20), '#ff5c7a');
    state.player.hurtFlash = 0.4;
    if (state.lives === 1) announcer.show('LAST HEART!', 'Protect the gate!', '#ff5c7a', 1.3);
    if (state.lives <= 0) {
      mode = 'GAMEOVER';
      audio.gameOver();
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: state.score, stage: Math.ceil(state.spawner.level / STAGE_SIZE) });
      save(saveData);
      backend.submitScore(saveData.playerId, state.score, Math.ceil(state.spawner.level / STAGE_SIZE));
      ads.hideBanner();
      ads.showInterstitial(); // ad after losing — the highest-value placement
    }
  },

  gate(g) {
    state.player.applyGate(g.mult);
    if (g.good) {
      audio.gateGood();
      particles.sparkle(g.x, g.y, '#58e07f');
      particles.scoreText(g.x, g.y, `×${g.mult} MAGIC!`, '#58e07f');
    } else {
      audio.gateCurse();
      particles.sparkle(g.x, g.y, '#b358e0');
      particles.scoreText(g.x, g.y, 'CURSED!', '#b358e0');
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
  // Costs one shared heart; the blood line itself already refilled itself.
  bloodLost(who) {
    state.lives--;
    state.gateFlash = 0.35;
    audio.crack();
    particles.addShake(6);
    particles.poof(who.x, who.y, '#ff5d7a');
    if (state.lives === 1) announcer.show('LAST HEART!', 'Protect the gate!', '#ff5c7a', 1.3);
    if (state.lives <= 0) {
      mode = 'GAMEOVER';
      audio.gameOver();
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: state.score, stage: Math.ceil(state.spawner.level / STAGE_SIZE) });
      save(saveData);
      ads.hideBanner();
      ads.showInterstitial();
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

  if (mode !== 'PLAYING') return;
  const st = state;
  const def = st.levelDef;

  st.levelTime += dt;
  updateDecor(dt, def);
  if (def.decor === 'bubbles') updateSeaLife(dt);

  if (st.placing) {
    // Placement mode: the drag surface controls the ghost item instead of
    // the Guardian — freeze movement/firing so the player isn't dragged
    // into danger while aiming a placement.
    st.placing.x = input.targetX(st.placing.x);
    st.placing.y = input.targetY(st.placing.y);
    st.placing.x = Math.max(30, Math.min(CONFIG.width - 30, st.placing.x));
    st.placing.y = Math.max(120, Math.min(st.player.y - 36, st.placing.y));
  } else {
    st.player.update(dt, input);
    if (st.player.tryFire()) {
      st.spells.push(new Spell(st.player.x, st.player.y - st.player.size, st.player.damage));
      audio.zap();
    }
  }

  for (const a of st.angels) a.update(dt, st.player, st.spells);
  st.angels = st.angels.filter((a) => !a.dead);

  st.spawner.update(dt, st);
  st.spells.forEach((s) => s.update(dt));
  st.monsters.forEach((m) => {
    m.update(dt);
    if (m.tryShoot()) {
      st.enemyBullets.push(new EnemyBullet(m.x, m.y + m.r, m.damage));
      audio.enemyShot();
    }
  });
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
      st.spells.push(new Spell(t.x, t.y - t.r, CONFIG.turret.damage));
      audio.zap();
    }
  });

  resolveCollisions(st, events, dt);

  st.enemyBullets = st.enemyBullets.filter((b) => !b.dead);
  st.ships = st.ships.filter((sh) => !sh.dead);
  st.walls = st.walls.filter((w) => !w.dead);
  st.turrets = st.turrets.filter((t) => !t.dead);

  if (st.comboTimer > 0) {
    st.comboTimer -= dt;
    if (st.comboTimer <= 0) st.combo = 0;
  }
  if (st.bombFlash > 0) st.bombFlash -= dt;
  if (st.gateFlash > 0) st.gateFlash -= dt;

  st.spells = st.spells.filter((s) => !s.dead);
  st.monsters = st.monsters.filter((m) => !m.dead);
  st.obstacles = st.obstacles.filter((o) => !o.dead);
  st.gates = st.gates.filter((g) => !g.dead);

  // Level complete: time up + boss (if any) defeated
  const bossAlive = st.monsters.some((m) => m.type === 'ogreBoss');
  if (st.levelTime >= def.duration && !bossAlive) {
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
      ads.hideBanner();
      ads.showInterstitial();
    } else {
      mode = 'LEVELCLEAR';
      audio.waveUp();
      st.lives = Math.min(CONFIG.gateHealth, st.lives + 1);
      st.coins += CONFIG.economy.levelClearBonus;   // small, flat — not a coin faucet
      // Persist the furthest point reached so the home screen's "Continue"
      // picks up here even if the player quits before finishing the next level.
      saveData.progress = { levelIndex: st.levelIndex + 1 };
      persistCoins();
      ads.hideBanner();
      levelsSinceInterstitial++;
      if (levelsSinceInterstitial >= CONFIG.ads.interstitialEveryNLevels) {
        levelsSinceInterstitial = 0;
        ads.showInterstitial(); // periodic ad between levels — not every single one
      }
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

// --- Render ------------------------------------------------------
function drawMonster(m) {
  const sprite = MONSTER_SPRITE[m.type];
  const size = m.r * 2.4;
  const batImg = m.type === 'imp' && BAT_FRAMES.length
    ? BAT_FRAMES[Math.floor(m.wobble * 1.5) % BAT_FRAME_COUNT]
    : null;
  if (batImg) {
    // Animated ice-bat wing-flap cycle (user-supplied AI art) for the
    // flying "imp" enemy, instead of one rigid static sprite — driven by
    // the monster's own wobble phase so a clump of imps doesn't flap in
    // lockstep, and freezes correctly whenever the game is paused.
    const bw = size * (batImg.width / batImg.height);
    ctx.drawImage(batImg, m.x - bw / 2, m.y - size / 2, bw, size);
  } else if (sprite && SPRITES[sprite]) {
    drawSprite(sprite, m.x, m.y, size);
  } else {
    ctx.fillStyle = m.color;
    ctx.strokeStyle = '#2a1f4d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(m.x - m.r * 0.3, m.y - m.r * 0.15, m.r * 0.18, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(m.x + m.r * 0.3, m.y - m.r * 0.15, m.r * 0.18, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1f4d';
    ctx.beginPath(); ctx.arc(m.x - m.r * 0.3, m.y - m.r * 0.12, m.r * 0.09, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(m.x + m.r * 0.3, m.y - m.r * 0.12, m.r * 0.09, 0, 7); ctx.fill();
  }
  if (m.hitFlash > 0) {
    ctx.globalAlpha = m.hitFlash * 6;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Blood-line: every enemy that takes more than one hit shows it, always
  // visible (not just after first damage) so toughness reads at a glance in
  // later stages. Low hp counts use tiny pips (matches the wizard/ward
  // motif); very tanky late-stage enemies (trolls, bosses) fall back to a
  // slim bar so the row doesn't overflow the sprite.
  if (m.maxHp > 1) {
    const py = m.y - m.r - 9;
    if (m.maxHp <= 8) {
      const pipW = 5, gap = 2;
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
      const w = m.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(m.x - w / 2, py - 2, w, 5);
      ctx.fillStyle = '#ff5d7a';
      ctx.fillRect(m.x - w / 2, py - 2, w * (m.hp / m.maxHp), 5);
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
    renderUpgrades(ctx, saveData);
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
  if (mode === 'SHOP' && !state) {
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

  // Obstacles
  for (const o of st.obstacles) {
    ctx.fillStyle = '#4a4066';
    ctx.strokeStyle = '#2a1f4d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7fd8ff';
    ctx.font = 'bold 14px "Fredoka", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ᚱ', o.x, o.y + 5);
  }

  // Gates — mini crystal archways. Good ones glow icy blue, cursed ones violet.
  for (const g of st.gates) {
    const glow = 0.5 + 0.3 * Math.sin(g.pulse);
    const tint = g.good ? '#7fd8ff' : '#b358e0';
    ctx.globalAlpha = glow;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // inner faceted ring, like a cut gem seen edge-on
    ctx.globalAlpha = glow * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.ellipse(g.x, g.y, g.rx - 8, g.ry - 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint;
    ctx.font = '20px "Luckiest Guy", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(g.good ? `×${g.mult}` : '×½', g.x, g.y + 7);
  }

  // Spells
  for (const s of st.spells) {
    if (SPRITES['fireball']) drawSprite('fireball', s.x, s.y, s.r * 4);
    else {
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

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
    ctx.fillStyle = '#b358e0';
    ctx.strokeStyle = '#3d1f5c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
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

  // Automaton Gunner (p declared above, at the shield-ring check)
  if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 12) % 2 === 0) ctx.globalAlpha = 0.5;
  
  // Continuous loop animation (21 frames)
  // roughly 60ms per frame for a smooth continuous cycle
  const frameIdx = Math.floor(performance.now() / 60) % 21;
  const gunnerSprite = `gunner_${String(frameIdx).padStart(2, '0')}`;
  drawSprite(gunnerSprite, p.x, p.y, p.size * 2.5, 1, p.facing === -1);
  
  ctx.globalAlpha = 1;

  // Player Blood-line
  if (p.maxBlood > 1) {
    const py = p.y + p.size + 8;
    const w = p.size * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(p.x - w / 2, py - 2, w, 5);
    ctx.fillStyle = '#7fd8ff';
    ctx.fillRect(p.x - w / 2, py - 2, w * Math.max(0, p.blood / p.maxBlood), 5);
  }
  if (!SPRITES['wizard']) {
    ctx.fillStyle = '#7c5cff';
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Wizard's blood-line pips (tiny hearts under the wizard's feet)
  {
    const pipW = 7, gap = 3;
    const total = p.maxBlood * pipW + (p.maxBlood - 1) * gap;
    let px = p.x - total / 2;
    const py = p.y + p.size * 1.1;
    for (let i = 0; i < p.maxBlood; i++) {
      ctx.fillStyle = i < p.blood ? '#ff5d7a' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(px + pipW / 2, py, pipW / 2, 0, Math.PI * 2);
      ctx.fill();
      px += pipW + gap;
    }
  }

  // The GateWall — always visible, cracks segment by segment as hearts
  // are lost. Drawn as a foreground layer so it reads clearly even with
  // monsters and bullets passing in front of it.
  drawGateWall(ctx, st);

  // Bomb flash
  if (st.bombFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${st.bombFlash * 2.4})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  particles.render(ctx);
  announcer.render(ctx);
  renderHUD(ctx, st, ads.isRewardedReady());

  if (mode === 'LEVELCLEAR') renderLevelClear(ctx, st, LEVELS[st.levelIndex + 1].name);
  if (mode === 'VICTORY') renderVictory(ctx, st, saveData.best || 0);
  if (mode === 'GAMEOVER') renderGameOver(ctx, st, saveData.best || 0);
  if (mode === 'SHOP') renderShop(ctx, st, iap.enabled);
  if (mode === 'PAUSED') renderPause(ctx);

  ctx.restore();
}

// Debug/test hook (harmless in production)
window.__game = { get mode() { return mode; }, get state() { return state; }, buyWeapon };

// --- Loop --------------------------------------------------------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  particles.update(dt);
  announcer.update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
