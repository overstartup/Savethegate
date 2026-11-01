// ============================================================
// GateWall v3.0 — entry point & orchestrator.
// MENU → PLAYING → LEVELCLEAR → … → VICTORY / GAMEOVER
// 10 themed levels, coins, buyable weapons (bomb / angel).
// ============================================================
import { CONFIG } from './config.js';
import { tr, setLang, deviceLang, isRtl, LANGS, getLang } from './i18n.js';
import { cfBurst, cfUpdate, cfDraw } from './ui/coinFx.js';
import './render/species_A.js';
import './render/species_B.js';
import './render/species_C.js';
import './render/species_D.js';
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
import { renderHUD, buttonAt, BUTTONS } from './ui/hud.js';
import { renderMenu, renderLevelClear, LC_TIMES, renderVictory, renderGameOver, GAMEOVER_BUTTONS, renderRewards, REWARDS_BUTTONS, navHit, setNavBadges, drawBottomNav, renderShop, SHOP_BUTTONS, MENU_BUTTONS, END_MENU_BUTTON, renderUpgrades, UPGRADE_BUTTONS, unitDialog, unitDialogRows, renderLeaderboard, LEADERBOARD_BUTTONS, renderSettings, SETTINGS_BUTTONS, PRIVACY_URL, homeLayout, homePlayRect, CONTINUE_CLOSE_BUTTON, CONTINUE_CARD_RECT, CONTINUE_PLAY_BUTTON, envIcon, renderPause, PAUSE_BUTTONS, renderPlacementBanner, PLACEMENT_CONTINUE_BUTTON, BG_IMAGES, KENNEY_SEA, KENNEY_PIRATE, KENNEY_CASTLE, DESERT_PLANTS, ICE_GLACIAL, BAT_FRAMES, BAT_FRAME_COUNT } from './ui/screens.js';
import { drawGun } from './render/gun.js';
import { drawUnitArt, drawStoneWall, unitRanks } from './render/units.js';
import { Announcer } from './ui/announce.js';
import { st3Bind, st3Begin, st3Track, st3Award, st3CardTick, st3MenuTap, st3EatRelease } from './ui/levelStars.js';
import { LEVELS, WEAPONS, STAGE_SIZE, STAGE_COUNT } from './data/levels.js';
import { COIN_PACKS } from './data/shop.js';
import { UNITS, UNIT_ORDER, unitLevel, setUnitLevel, statCost, statBonus, unitStats, unitTotalLevel, unitRank, rankCap } from './data/upgrades.js';
import { load, save, submitScore } from './data/save.js';
import { ads } from './systems/ads.js';
import { iap } from './systems/iap.js';
import { loginStatus, claimLogin, giftStatus, claimGift, videoStatus, noteVideoWatched, missions, trackMission, missionText, missionCoins, claimMission, inviteCode, rewardsWaiting } from './systems/rewards.js';
import { backend } from './systems/backend.js';
import { dcToday, dcStatus, dcRecordResult, dcApplyStart, dcLocked, dcSpeed, dcHeartBack, dcIsLast, dcNextIndex, dcBoard, dcLoadTop, dcSubmit } from './systems/challenge.js';
import { DC_CARD, DC_CARD_PLAY, DC_PANEL_BUTTONS, DC_RESULT_BUTTONS, dcRenderPanel, dcRenderResult, dcRenderHud } from './ui/challengeUi.js';
import { drawCreature, drawGlow } from './render/creatures.js';
import { bzOnBoss, bzUpdate, bzVolley, bzOnKill, bzBossName, bzDrawCrown, bzRenderBack, bzRenderFront } from './systems/bosses.js';
import { renderAtmosphereBack, renderAtmosphereFront } from './render/atmosphere.js';
import { applySeparation } from './systems/flocks.js';
import { drawHero, updateHero, heroMuzzle } from './render/hero.js';
import { SPECIES } from './render/species.js';
import { drawSceneryFar, drawSceneryNear, SCENERY_HAS_SUN } from './render/scenery.js';
import { drawStageSet } from './render/stageset.js';
import { drawGate } from './render/gate.js';
import { abUpdate, abHeroFired, abTurretFired, abBombBlast, abShieldUp, abDraw, abDrawGround } from './systems/abilities.js';
import { createRun, runFire, runUpdate, dropGems, applyPick, rateMult, damageMult, renderRunWorld, renderXPBar, renderLevelUp, levelUpTap, grantCatchUp } from './systems/runUpgrades.js';
import { sxReset, sxAfterPlayer, sxUpdate, sxDrawBack, sxDrawFront, sxDrawTop } from './systems/stagefx.js';
import { tuBegin, tuUpdate, tuDraw, tuTap, tuIsNewPlayer } from './systems/tutorial.js';

// no-op in a plain browser; activates real AdMob inside the native app.
// Re-sync once ready: the on-load syncBanner() below runs before init resolves.
ads.init().then(() => syncBanner());
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
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.quality.maxDpr[CONFIG.quality.level]);
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


// How long (seconds) to hold on the cleared lane before the LEVELCLEAR/
// VICTORY dialog actually appears, once the last attacker is gone — gives
// the player a beat to see the level actually finish instead of the dialog
// cutting in over the last kill.
const LEVEL_CLEAR_DELAY = 1.8;

// Bolts leave the procedural Guardian's arm cannon (see render/hero.js).
function gunnerMuzzle(p) { return heroMuzzle(p); }

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
  // Land stages: a full-screen set (ground, road, props from the stage's
  // island art — render/stageset.js) drawn FIRST, so each stage's own
  // set-piece props below still render on top of it. The underwater Sea
  // War ('bubbles') draws its own scene in the switch.
  if (def.decor !== 'bubbles') drawStageSet(ctx, def, t);
  switch (def.decor) {
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
    case 'bubbles': { // Sea War — fully underwater: a rippling surface just
      // under the HUD (the real Ship entities sail along it), sunbeams
      // slanting down through the water, and the layered seafloor.
      const waterY = h * CONFIG.ship.waterLine;
      ctx.strokeStyle = 'rgba(232,249,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) ctx.lineTo(x, waterY + Math.sin(x * 0.05 + t * 2) * 2);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rayEnd = h * 0.85;
      for (let i = 0; i < 5; i++) {
        const x0 = w * (0.08 + i * 0.22) + Math.sin(t * 0.3 + i) * 20;
        const sway = Math.sin(t * 0.4 + i * 1.7) * 30;
        const g = ctx.createLinearGradient(0, waterY, 0, rayEnd);
        g.addColorStop(0, 'rgba(220,250,255,0.16)');
        g.addColorStop(1, 'rgba(220,250,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - 14, waterY); ctx.lineTo(x0 + 14, waterY);
        ctx.lineTo(x0 + 70 + sway, rayEnd); ctx.lineTo(x0 + 10 + sway, rayEnd);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();

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
      if (!SCENERY_HAS_SUN[def.stage]) envIcon(ctx, w * 0.78, 70, 46, 'sand', t);
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
    case 'rain': // Storm Realm — fixed dark cloud banks with a flickering bolt
      envIcon(ctx, w * 0.3, 60, 44, 'rain', t);
      envIcon(ctx, w * 0.7, 46, 34, 'rain', t);
      break;
  }
}

function renderBackground(def, time) {
  const themeIdx = Math.max(0, Math.min(STAGE_COUNT - 1, (def.stage || 1) - 1));
  // Sea War draws its own procedural underwater backdrop (gradient here,
  // surface/sunbeams/seafloor in drawLandmark's 'bubbles' case) instead of
  // the static per-stage photo.
  const bgImg = def.decor === 'bubbles' ? null : BG_IMAGES[themeIdx];
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, CONFIG.width, CONFIG.height);
    // Faint tint so gameplay sprites keep contrast against the photo.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    if (def.decor === 'bubbles') {
      // Sea War is fully underwater: a thin strip of sky above the surface
      // (behind the HUD), then sunlit shallows fading to deep blue.
      const s = CONFIG.ship.waterLine;
      grad.addColorStop(0, '#9fe0ff');
      grad.addColorStop(s, '#c4efff');
      grad.addColorStop(s + 0.002, '#62c9e8');
      grad.addColorStop(0.55, '#2a92bd');
      grad.addColorStop(1, '#17628b');
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

  // stage set-pieces behind the hills (render/scenery.js)
  drawSceneryFar(ctx, def, time);

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

  // stage set-pieces in front of the ground (render/scenery.js)
  drawSceneryNear(ctx, def, time);

  // Storm Realm: occasional lightning flash
  if (def.decor === 'rain' && Math.random() < 0.006) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
}

// --- Game state --------------------------------------------------
let saveData = load();
// Language: the player's choice, else the phone's language (src/i18n.js).
setLang(saveData.settings?.lang || deviceLang());
refreshUnitRanks();
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
// The How-to-play card only greets brand-new players; anyone who has played
// before lands straight on the map with its big PLAY button.
let continueDismissed = (saveData.progress?.levelIndex || 0) > 0 || (saveData.best || 0) > 0;

// Stage road-map scrolling — the map lays out nodes at a fixed size/spacing
// regardless of how many stages exist, so once there are more than fit on
// one screen, the player drags vertically to see the rest. Tracked as a
// simple drag: press position + starting scroll, then delta each frame.
let mapScrollY = 0;
let mapFocusMode = null; // last mode seen by update(), to re-centre the map on arrival
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

// --- Onboarding + name entry (DOM overlay — real text input, works
// in-browser and in the Capacitor WebView, unlike window.prompt). First
// launch: welcome, pick a language, name your Guardian. From Settings the
// same card only asks for the name. The name shows in the Hall of Fame. ---
const nameOverlay = document.getElementById('nameOverlay');
const nameInput = document.getElementById('nameInput');
const nameSubmit = document.getElementById('nameSubmit');
const nameCancel = document.getElementById('nameCancel');
let renaming = false;

function chooseLang(code) {
  setLang(code);
  saveData.settings = { ...saveData.settings, lang: code };
  save(saveData);
  if (nameOverlay?.style.display === 'flex') fillNameOverlay();
}

function fillNameOverlay() {
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = tr(key); };
  set('obTitle', renaming ? 'c.ob.renameTitle' : 'c.ob.title');
  set('obSub', 'c.ob.sub');
  set('obNameLabel', 'c.ob.nameLabel');
  set('obHint', 'c.ob.hint');
  nameSubmit.textContent = tr(renaming ? 'c.ob.save' : 'c.ob.start');
  if (nameCancel) nameCancel.textContent = tr('c.ob.cancel');
  nameInput.placeholder = tr('c.ob.placeholder');
  nameOverlay.dir = isRtl() ? 'rtl' : 'ltr';
  nameOverlay.classList.toggle('rename', renaming);
  const box = document.getElementById('obLangs');
  if (box) {
    box.innerHTML = '';
    for (const l of LANGS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.name;
      b.className = l.code === getLang() ? 'on' : '';
      b.addEventListener('click', () => chooseLang(l.code));
      box.appendChild(b);
    }
  }
}

function openNameEntry(rename = !!saveData.playerName) {
  if (!nameOverlay) return;
  renaming = rename;
  nameInput.value = saveData.playerName || '';
  fillNameOverlay();
  nameOverlay.style.display = 'flex';
  if (renaming) setTimeout(() => nameInput.focus(), 50);
}
function closeNameEntry() {
  if (!nameOverlay) return;
  const v = (nameInput.value || '').trim().slice(0, 14);
  saveData.playerName = v || tr('c.ob.placeholder');
  if (!saveData.settings?.lang) saveData.settings = { ...saveData.settings, lang: getLang() };
  save(saveData);
  nameOverlay.style.display = 'none';
  if (saveData.playerId) syncProfile(); else registerWithBackend();
  tuStartFirstRun();
}
// THE FIRST MINUTE: a brand-new player goes from the onboarding card
// straight into Stage 1 Level 1 with the guided hints (systems/tutorial.js),
// skipping the home page's How-to-play card.
function tuStartFirstRun() {
  if (renaming || mode !== 'MENU' || !tuIsNewPlayer(saveData)) return;
  continueDismissed = true;
  newGame(0);
  mode = 'PLAYING';
  syncBanner();
}
function cancelNameEntry() {
  if (!nameOverlay) return;
  if (!saveData.playerName) {
    saveData.playerName = tr('c.ob.placeholder');
    save(saveData);
  }
  nameOverlay.style.display = 'none';
  tuStartFirstRun();
}
if (nameSubmit) nameSubmit.addEventListener('click', closeNameEntry);
if (nameCancel) nameCancel.addEventListener('click', cancelNameEntry);
if (nameInput) nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') closeNameEntry(); });

if (!saveData.playerName) openNameEntry(false);

// Level-clear celebration: the card pops in, points and coins count up,
// coins fly into the HUD pill, then it fades out on its own and the next
// level fades in (renderLevelClear draws it from state.lc.t).
function tickLevelClear(dt) {
  const lc = state.lc;
  lc.t += dt;
  st3CardTick(lc, state.st3?.result); // a chime as each earned star pops
  // a coin "lands" in the pill every so often while they fly
  const landed = Math.floor(Math.max(0, lc.t - LC_TIMES.coinsLand) / LC_TIMES.coinGap);
  if (landed > lc.landed && landed <= LC_TIMES.coinCount) { lc.landed = landed; audio.gem(); }
  if (lc.t >= LC_TIMES.end) {
    state.lc = null;
    startLevel(dcNextIndex(state)); // +1, or the Daily Challenge's next level
    mode = 'PLAYING';
    state.fadeIn = 0.5;
    syncBanner();
  }
}

// --- The bomb: thrown in an arc from the Guardian onto the enemies closest
// to the gate, spinning with a sparking fuse and a shadow that grows as it
// falls; it blows up where it lands. -----------------------------------------
function throwBomb() {
  const st = state, p = st.player;
  const near = st.monsters.filter((m) => !m.dead && m.y > CONFIG.playTop).sort((a, b) => b.y - a.y).slice(0, 5);
  const tx = near.length ? near.reduce((a, m) => a + m.x, 0) / near.length : p.x;
  const ty = near.length ? near.reduce((a, m) => a + m.y, 0) / near.length : Math.max(CONFIG.playTop + 80, p.y - 260);
  const d = Math.hypot(tx - p.x, ty - p.y);
  st.bombsFlying = st.bombsFlying || [];
  st.bombsFlying.push({ x0: p.x, y0: p.y - 24, tx, ty, t: 0, dur: 0.45 + Math.min(0.35, d / 1400), h: 90 + d * 0.25, spin: (Math.random() < 0.5 ? -1 : 1) * 9 });
  audio.pick();
}

function updateBombs(dt) {
  const st = state;
  if (!st.bombsFlying?.length) return;
  for (const b of st.bombsFlying) {
    b.t += dt;
    const k = Math.min(1, b.t / b.dur);
    // fuse sparks + a puff of smoke trailing behind
    if (Math.random() < 0.6) {
      const x = b.x0 + (b.tx - b.x0) * k, y = b.y0 + (b.ty - b.y0) * k - Math.sin(Math.PI * k) * b.h;
      particles.sparkle(x + Math.cos(b.t * b.spin) * 9, y - 12, Math.random() < 0.5 ? '#ffd23d' : '#ff8a3d', 1);
    }
    if (b.t >= b.dur) { b.done = true; bombLand(b.tx, b.ty); }
  }
  st.bombsFlying = st.bombsFlying.filter((b) => !b.done);
}

// Power-based blast — no unconditional full-screen clear. The bomb has a
// fixed power budget (WEAPONS.bomb.power) and spends it on the monsters
// nearest the impact first (MONSTERS.<type>.power each) until the next one
// costs more than what's left: a wave of goblins gets wiped, the same bomb
// in a knot of trolls or on a boss barely dents it.
function bombLand(x, y) {
  const st = state;
  audio.bigBoom();
  auHitStop(0.06);
  particles.addShake(14);
  particles.ring(x, y, '#ffd23d', 150, 0.45, 8);
  particles.ring(x, y, '#ff8a3d', 95, 0.35, 6);
  particles.shatter(x, y, '#ff8a3d', 30, 26);
  particles.shatter(x, y, '#3a2a1a', 20, 12);
  const nearest = st.monsters.filter((m) => !m.dead).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  let budget = WEAPONS.bomb.power * statBonus('bomb', 'power', unitLevel(saveData, 'bomb', 'power'));
  let killed = 0;
  for (const m of nearest) {
    if (m.power > budget) break; // power exhausted — anything farther is untouched
    budget -= m.power;
    m.dead = true;
    events.kill(m);
    killed++;
  }
  announcer.show(tr('g.kaboom'), killed > 0 ? tr('g.destroyedN', { n: killed }) : tr('g.notEnoughPower'), '#ff8a3d', 1.1);
  st.bombFlash = 0.25; // white flash
  abBombBlast(st, nearest); // Armory rank abilities (napalm / cluster)
}

function drawBombs(st) {
  if (!st.bombsFlying?.length) return;
  const t = st.levelTime;
  for (const b of st.bombsFlying) {
    const k = Math.min(1, b.t / b.dur);
    const gx = b.x0 + (b.tx - b.x0) * k, gy = b.y0 + (b.ty - b.y0) * k;
    const lift = Math.sin(Math.PI * k) * b.h;
    // shadow on the ground: small while it is high, big as it comes down
    const sh = 0.35 + 0.65 * (1 - lift / b.h);
    ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * sh})`;
    ctx.beginPath(); ctx.ellipse(gx, gy + 10, 20 * sh, 7 * sh, 0, 0, Math.PI * 2); ctx.fill();
    // target marker pulsing where it will land
    ctx.strokeStyle = `rgba(255,120,60,${0.5 + 0.4 * Math.sin(t * 20)})`;
    ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.ellipse(b.tx, b.ty + 10, 34, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // the bomb itself: bigger at the top of its arc (closer to the camera),
    // spinning, squashing a touch right before impact
    const scale = 1 + 0.45 * Math.sin(Math.PI * k);
    const squash = k > 0.9 ? 1 - (k - 0.9) * 2.5 : 1;
    ctx.save();
    ctx.translate(gx, gy - lift);
    ctx.rotate(b.t * b.spin);
    ctx.scale(scale / squash, scale * squash);
    drawUnitArt(ctx, 'bomb', 0, 0, 34, t, 0);
    ctx.restore();
  }
}

function startLevel(index) {
  const def = LEVELS[index];
  state.levelStartScore = state.score; // the level-clear card counts up from here
  state.levelIndex = index;
  if (state.dc) state.dc.step = Math.max(0, state.dc.levels.indexOf(index)); // Daily Challenge: which of its levels
  state.player.levelIndex = index; // shooting grows with the level
  state.levelDef = def;
  state.levelTime = 0;
  state.spawner.setLevel(def, index);
  state.monsters = [];
  state.corpses = [];
  state.spells = [];
  state.obstacles = [];
  state.gates = [];
  state.enemyBullets = [];
  state.ships = [];
  airshipDebris.length = 0;
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
  st3Begin(state); // fresh level-star tracking (ui/levelStars.js)
  sxReset(state, index); // this stage's one twist (systems/stagefx.js)
  if (state.run) { state.run.vacuum = false; state.run.gems = []; }
  // NOTE: state.angels is deliberately NOT reset here — angels are a
  // permanent purchase and carry over from one level to the next.
  makeDecor(def);
  if (def.decor === 'bubbles') makeSeaLife();
  announcer.show(tr('g.levelN', { n: index + 1 }), `⚔ ${def.name} ⚔`, '#7fd8ff', 2.0);
}

function newGame(startIndex = 0) {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, startIndex));
  const activeSticker = saveData.stickers?.find(s => s.equipped) || saveData.stickers?.[0];
  state = {
    player: new Player(saveData.permanent, activeSticker),
    // Armory POWER x HASTE bonus — enemies grow with it (CONFIG.difficulty.armoryHp)
    armoryDps: statBonus('hero', 'power', saveData.permanent?.power || 0) * statBonus('hero', 'fireRate', saveData.permanent?.fireRate || 0),
    spells: [], monsters: [], obstacles: [], gates: [], angels: [], enemyBullets: [], ships: [], walls: [], turrets: [], corpses: [],
    placing: null,
    placePaused: false,
    spawner: new Spawner(LEVELS[idx], idx),
    score: 0, kills: 0, coins: saveData.coins,
    lives: CONFIG.gateHealth,
    gateFlash: 0,
    combo: 0, bestCombo: 0, comboTimer: 0,
    levelIndex: idx, levelDef: LEVELS[idx], levelTime: 0,
    run: createRun(),
    onBoss: (b) => bzOnBoss(b, state, particles), // banners / intro: systems/bosses.js
  };
  startLevel(idx);
  tuBegin(state, saveData, idx); // guided first run (brand-new players, L1 only)
  const boost = grantCatchUp(state.run, state.player, idx);
  if (boost) announcer.show(tr('g.veteranBoost'), tr('g.veteranBoostSub', { n: boost, lvl: idx + 1 }), '#ffd23d', 2.2);
}

// Credits coins to whichever balance is live: the run's (mid-run, incl.
// the shop or GATE DOWN screen) or the saved one (menus).
const MENU_PAGES = ['MENU', 'UPGRADES', 'SETTINGS', 'LEADERBOARD', 'REWARDS'];
function inRun() {
  return state && (mode === 'PLAYING' || mode === 'PAUSED' || mode === 'LEVELUP' || mode === 'GAMEOVER'
    || mode === 'LEVELCLEAR' || (mode === 'SHOP' && !MENU_PAGES.includes(modeBeforeShop)));
}
// Coins the player gets outside the battle flow (rewards, shop, chests).
// They fly from (x, y) — by default the last tap — into the coin counter.
let cfTapX = CONFIG.width / 2, cfTapY = CONFIG.height / 2;
function addCoins(n, x = cfTapX, y = cfTapY) {
  if (!n) return;
  cfBurst(n, x, y);
  if (inRun()) { state.coins += n; persistCoins(); return; }
  saveData.coins = (saveData.coins || 0) + n;
  save(saveData);
  syncProfile();
}

// Store purchases are verified by the backend, then granted here (also
// purchases approved later, e.g. after an app restart). A transaction id
// is only ever paid once.
iap.onGrant = (productId, transactionId) => {
  saveData.iapTx = saveData.iapTx || [];
  if (transactionId && saveData.iapTx.includes(transactionId)) return;
  if (transactionId) saveData.iapTx = [...saveData.iapTx.slice(-49), transactionId];
  if (productId === 'remove_ads') {
    saveData.removeAds = true;
    ads.setRemoved(true);
    ads.hideBanner();
    save(saveData);
    return;
  }
  const pack = COIN_PACKS.find((p) => p.id === productId);
  if (pack) addCoins(pack.coins);
};

function persistCoins() {
  saveData.coins = state.coins;
  if (!state.dc && state.score > (saveData.best || 0)) saveData.best = state.score; // challenge runs keep their own best
  save(saveData);
  syncProfile();
}

// --- Weapons -----------------------------------------------------
function buyWeapon(key) {
  if (dcLocked(state, key)) { audio.gateCurse(); announcer.show(tr('dc.locked'), '', '#ff8a3d', 1.0); return; } // Daily Challenge: ONLY BOMBS
  if (state.coins >= WEAPONS[key].cost && !((key === 'wall' || key === 'turret') && state.placing)) trackMission(saveData, 'helpers');
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
    throwBomb(); // the Guardian lobs it; it blows up where it lands (bombLand)
  } else if (key === 'angel') {
    audio.gateGood();
    announcer.show(tr('g.wardSummoned'), '', '#bdeeff', 1.0);
    const side = state.angels.length % 2 === 0 ? 1 : -1;
    state.angels.push(new Angel(side, unitStats(saveData, 'angel')));
    particles.sparkle(state.player.x, state.player.y - 40, '#bdeeff');
  } else if (key === 'shield') {
    audio.gateGood();
    const dur = WEAPONS.shield.duration + statBonus('shield', 'duration', unitLevel(saveData, 'shield', 'duration'));
    announcer.show(tr('g.shieldUp'), tr('g.seconds', { n: dur }), '#7fd8ff', 1.0);
    state.player.addShield(dur);
    abShieldUp(state, CONFIG.gateHealth); // Armory rank 5: mends a gate heart
    particles.sparkle(state.player.x, state.player.y, '#7fd8ff');
  } else if (key === 'wall') {
    audio.gateGood();
    announcer.show(tr('g.dragToPlace'), '', '#c8a06a', 1.2);
    state.placing = { type: 'wall', x: state.player.x, y: CONFIG.helpers.wall.dropY, armed: false };
    state.placePaused = true;
  } else if (key === 'turret') {
    audio.gateGood();
    announcer.show(tr('g.dragToPlace'), '', '#ffd88a', 1.2);
    state.placing = { type: 'turret', x: state.player.x, y: CONFIG.helpers.turret.dropY, armed: false };
    state.placePaused = true;
  }
  persistCoins();
}

function watchRewardedAd() {
  if (!ads.isRewardedReady() || videoStatus(saveData).left <= 0) { audio.gateCurse(); return; }
  ads.showRewarded(
    () => {
      // player watched the full ad — grant the reward (shared daily cap)
      const coins = noteVideoWatched(saveData);
      addCoins(coins);
      audio.gateGood();
      if (mode === 'REWARDS') rewardsToast = { text: tr('g.coinsToast', { n: coins }), t: performance.now() / 1000 };
      else announcer.show(tr('g.thanks'), tr('g.coinsPlus', { n: coins }), '#7fd8ff', 1.3);
      if (state && inRun()) particles.sparkle(CONFIG.width / 2, state.player.y - 40, '#7fd8ff');
    },
    () => { audio.gateCurse(); } // no ad available right now
  );
}

// --- ARMORY: permanent unit upgrades (main menu, persist across runs) ----
let armorySel = null;    // unit whose upgrade dialog is open
let armoryFlash = null;  // { unit, stat, t, rankUp } — pulse on the row just bought

function buyUnitStat(unit, stat) {
  const level = unitLevel(saveData, unit, stat);
  if (level >= rankCap(saveData, unit)) return; // finish the other stats to rank up
  const cost = statCost(unit, stat, level);
  if ((saveData.coins || 0) < cost) { audio.gateCurse(); openShop(); return; } // short — offer coins
  saveData.coins -= cost;
  const rankBefore = unitRank(saveData, unit);
  setUnitLevel(saveData, unit, stat, level + 1);
  save(saveData);
  syncProfile();
  audio.pick();
  armoryFlash = { unit, stat, t: performance.now() / 1000, rankUp: unitRank(saveData, unit) > rankBefore };
  if (armoryFlash.rankUp) { audio.levelUp(); refreshUnitRanks(); }
}

// Battle art reads each unit's rank look from render/units.js unitRanks.
function refreshUnitRanks() {
  for (const k of UNIT_ORDER) unitRanks[k] = unitRank(saveData, k);
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
    announcer.show(tr('g.adsRemoved'), tr('g.adsRemovedSub'), '#58e07f', 1.6);
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
  for (const p of COIN_PACKS) p.storePrice = iap.price(p.id); // the store's local price, when known
  modeBeforeShop = mode;
  mode = 'SHOP';
  syncBanner();
}

// What the SHOP page shows (it's a page in menus, and mid-run too).
function shopInfo() {
  return {
    coins: inRun() ? state.coins : (saveData.coins || 0),
    iapEnabled: iap.enabled,
    testStore: iap.testMode,
    inRun: !MENU_PAGES.includes(modeBeforeShop),
    video: videoStatus(saveData),
    videoReady: ads.isRewardedReady(),
    removeAds: !!saveData.removeAds,
    removeAdsPrice: iap.price('remove_ads'),
  };
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
  const bought = await iap.buy(pack.id); // coins are credited by iap.onGrant
  if (bought) {
    audio.gateGood();
    announcer.show(iap.testMode ? tr('g.testPurchase') : tr('g.purchased'), tr('g.coinsPlus', { n: pack.coins }), '#ffd23d', 1.4);
    closeShop();
  } else {
    audio.gateCurse();
  }
}

// The bottom nav bar (Shop / Armory / Battle / Rewards / Ranks) is drawn —
// and tappable — on every menu page, so each is a real page you jump
// between. Checked first in every page's tap handler, before that page's
// own buttons. The open page's tab is wider, so hit-testing needs it.
const NAV_TAB_OF = { MENU: 'play', UPGRADES: 'upgrades', LEADERBOARD: 'leaderboard', REWARDS: 'rewards', SHOP: 'shop' };
function navTap(x, y) {
  if (x === null) return false;
  const key = navHit(NAV_TAB_OF[mode] || null, x, y);
  if (!key) return false;
  armorySel = null; // leaving via the nav bar closes any Armory dialog
  resetArmed = false;
  if (key === 'shop') { if (mode !== 'SHOP') { audio.pick(); openShop(); } return true; }
  if (mode === 'SHOP') closeShop();
  if (key === 'play') { if (mode !== 'MENU') audio.pick(); mode = 'MENU'; syncBanner(); }
  else if (key === 'upgrades') { if (mode !== 'UPGRADES') audio.pick(); mode = 'UPGRADES'; syncBanner(); }
  else if (key === 'rewards') { if (mode !== 'REWARDS') openRewards(); }
  else if (key === 'leaderboard') { if (mode !== 'LEADERBOARD') openLeaderboard(); }
  return true;
}

// --- Tap handling ------------------------------------------------
input.onTap((x, y) => {
  audio.unlock();
  cfTapX = x; cfTapY = y;

  if (mode === 'SHOP') {
    if (x === null) return;
    const fromMenu = MENU_PAGES.includes(modeBeforeShop);
    if (fromMenu && navTap(x, y)) return; // the SHOP tab
    if (!fromMenu && hit(SHOP_BUTTONS.close, x, y)) { closeShop(); return; } // BACK to the run
    if (hit(SHOP_BUTTONS.video, x, y)) { watchRewardedAd(); return; }
    if (hit(SHOP_BUTTONS.removeAds, x, y)) { buyRemoveAds(); return; }
    SHOP_BUTTONS.packs.forEach((r, i) => {
      if (hit(r, x, y)) buyCoinPack(COIN_PACKS[i]);
    });
    return;
  }

  if (mode === 'UPGRADES') {
    if (x === null) return;
    if (armorySel) {
      const dl = unitDialog(armorySel);
      if (hit(dl.close, x, y) || !hit(dl.box, x, y)) { armorySel = null; return; } // X or tap outside closes
      if (hit(dl.getCoins, x, y)) { openShop(); return; }
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

  if (mode === 'REWARDS') {
    if (x === null) return;
    if (dcPanelOpen) { dcPanelTap(x, y); return; } // Daily Challenge detail panel is modal
    if (navTap(x, y)) return;
    if (hit(DC_CARD_PLAY, x, y)) { audio.pick(); dcStart(); return; }
    if (hit(DC_CARD, x, y)) { audio.pick(); dcPanelOpen = true; dcLoadTop(dcToday().day); return; }
    rewardsTap(x, y);
    return;
  }

  if (mode === 'DCRESULT') {
    if (x === null) return;
    if (hit(DC_RESULT_BUTTONS.again, x, y)) { audio.pick(); dcStart(); return; }
    if (hit(DC_RESULT_BUTTONS.done, x, y)) { audio.pick(); dcResult = null; openRewards(); return; }
    return;
  }

  if (mode === 'SETTINGS') {
    if (x === null) return;
    if (navTap(x, y)) return;
    if (hit(SETTINGS_BUTTONS.changeName, x, y)) { resetArmed = false; openNameEntry(); return; }
    const li = SETTINGS_BUTTONS.langs.findIndex((r) => hit(r, x, y));
    if (li >= 0) { resetArmed = false; chooseLang(LANGS[li].code); audio.gateGood(); return; }
    if (hit(SETTINGS_BUTTONS.mute, x, y)) {
      const next = !audio.isMuted();
      audio.setMuted(next);
      saveData.settings = { ...saveData.settings, muted: next };
      save(saveData);
      resetArmed = false;
      return;
    }
    if (hit(SETTINGS_BUTTONS.removeAds, x, y)) { resetArmed = false; buyRemoveAds(); return; }
    if (hit(SETTINGS_BUTTONS.restore, x, y)) {
      resetArmed = false;
      if (!iap.enabled) { audio.gateCurse(); return; }
      iap.restore().then((ok) => announcer.show(tr(ok ? 'g.restored' : 'g.nothingToRestore'), ok ? tr('g.restoredSub') : '', '#7fd8ff', 1.4));
      return;
    }
    if (hit(SETTINGS_BUTTONS.privacy, x, y)) { resetArmed = false; openPrivacy(); return; }
    if (hit(SETTINGS_BUTTONS.reset, x, y)) {
      if (!resetArmed) {
        resetArmed = true; // first tap just arms it — see the "tap twice" hint in screens.js
        announcer.show(tr('g.tapAgain'), tr('g.tapAgainSub'), '#ff5c7a', 1.6);
        return;
      }
      saveData.progress = { levelIndex: 0 };
      save(saveData);
      resetArmed = false;
      announcer.show(tr('g.progressReset'), tr('g.progressResetSub'), '#ff5c7a', 1.4);
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
    if (continueDismissed && st3MenuTap(x, y, saveData, addCoins)) return; // star chest (or its dialog)
    // Header: only the coin pill is tappable (opens the buy-coins shop).
    // The avatar/name area no longer opens name-edit — that now lives in
    // Settings — and the rest of the header does nothing when tapped.
    if (hit(MENU_BUTTONS.coins, x, y)) { openShop(); return; }
    if (hit(MENU_BUTTONS.settings, x, y)) { resetArmed = false; audio.pick(); mode = 'SETTINGS'; syncBanner(); return; }
    if (navTap(x, y)) return;
    if (!continueDismissed && hit(CONTINUE_CLOSE_BUTTON, x, y)) { continueDismissed = true; return; }
    if (continueDismissed && hit(homePlayRect(mapScrollY, saveData.progress?.levelIndex || 0), x, y)) {
      newGame(saveData.progress?.levelIndex || 0);
      mode = 'PLAYING';
      syncBanner();
      return;
    }

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
  if (mode === 'GAMEOVER') {
    if (x === null) return;
    const B = GAMEOVER_BUTTONS;
    if (hit(B.retry, x, y)) {
      newGame(saveData.progress?.levelIndex || 0);
      mode = 'PLAYING';
      syncBanner();
      return;
    }
    if (hit(B.armory, x, y)) { mode = 'UPGRADES'; syncBanner(); return; }
    if (hit(B.exit, x, y)) { mode = 'MENU'; syncBanner(); return; }
    const cost = reviveCost();
    if (cost > 0 && hit(B.reviveCoins, x, y)) {
      if (state.coins < cost) { audio.gateCurse(); openShop(); return; }
      state.coins -= cost;
      state.revives = (state.revives || 0) + 1;
      persistCoins();
      reviveRun();
      return;
    }
    if (hit(B.revive, x, y)) {
      if ((state.adRevives || 0) >= CONFIG.economy.adRevives || !ads.isRewardedReady()) { audio.gateCurse(); return; }
      ads.showRewarded(() => {
        state.adRevives = (state.adRevives || 0) + 1;
        reviveRun(); // watched the full ad: full hearts and back in
      }, () => { audio.gateCurse(); });
    }
    return;
  }
  if (mode === 'VICTORY') {
    if (x !== null && hit(END_MENU_BUTTON, x, y)) { mode = 'MENU'; syncBanner(); return; }

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
    if (x === null) return;
    if (hit(END_MENU_BUTTON, x, y)) { mode = 'MENU'; syncBanner(); return; }
    // a tap anywhere skips straight to the fade into the next level
    if (state.lc) state.lc.t = Math.max(state.lc.t, LC_TIMES.fade);
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
    if (tuTap(state, x, y)) return; // SKIP TIPS pill
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
    state.walls.push(new Wall(px, py, unitStats(saveData, 'wall'), state.spawner.stageIdx));
    particles.sparkle(px, py, '#c8a06a');
  } else if (type === 'turret') {
    state.turrets.push(new Turret(px, py, unitStats(saveData, 'turret'), state.spawner.stageIdx));
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
  if (st3EatRelease()) return; // this gesture tapped the star chest
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

// [au] Hit-stop: a near-freeze of a few frames (≤70 ms) on big impacts, on
// top of timeScale. A cooldown keeps it from ever chaining into a stutter
// (bomb chain-kills, rapid boss crits).
let auHitStopT = 0, auHitStopCd = 0;
function auHitStop(sec = 0.05, shake = 0, cd = 0.2) {
  if (auHitStopCd > 0) return;
  auHitStopT = Math.max(auHitStopT, Math.min(sec, 0.07));
  auHitStopCd = auHitStopT + cd;
  if (shake) particles.addShake(shake);
}
function auHitStopScale(rawDt) {
  if (auHitStopCd > 0) auHitStopCd -= rawDt;
  if (auHitStopT > 0.002) { auHitStopT -= rawDt; return 0.04; }
  return 1;
}
// [au] Music follows the screen: stage theme in a run (quiet when not
// actively playing), calm loop on home pages, silence + jingle at the end.
let auPrevMode = null;
function auMusicSync() {
  if (mode !== auPrevMode) {
    if (mode === 'VICTORY') audio.victoryJingle();
    auPrevMode = mode;
  }
  const inGame = !!(state?.levelDef && inRun() && mode !== 'GAMEOVER');
  if (mode === 'GAMEOVER' || mode === 'VICTORY') audio.setMusic(null);
  else if (inGame) audio.setMusic((state.levelDef.stage || 1) - 1);
  else audio.setMusic('menu');
  audio.setMusicQuiet(inGame && mode !== 'PLAYING');
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

// Which helper would save the player right now? Drives the pulsing "TAP!"
// hint on the buy row (ui/hud.js) — only for helpers they can afford, so it
// teaches the toolkit without nagging toward the shop.
function pickHelperHint(st) {
  const can = (k) => st.coins >= WEAPONS[k].cost;
  const p = st.player;
  const bossFiring = st.enemyBullets.length > 8 && st.monsters.some((m) => m.boss);
  if (p.shieldTime <= 0 && can('shield') && (p.blood < p.maxBlood * 0.35 || bossFiring)) return 'shield';
  let near = 0, brute = false;
  for (const m of st.monsters) {
    if (m.dead || m.boss) continue;
    if (m.y > CONFIG.gateY - 170) near++;
    if ((m.elite || m.type === 'troll') && m.y > CONFIG.gateY - 260) brute = true;
  }
  if (near >= 3 && can('bomb')) return 'bomb';
  if (brute && st.walls.length === 0 && can('wall')) return 'wall';
  return null;
}

// One-frame FX raised by monster action moves (entities/monster.js ACTIONS).
function monsterFx(m) {
  const tint = state.levelDef?.monsterTint;
  for (const e of m.events) {
    if (e === 'land') {
      particles.ring(m.x, m.y + m.r * 0.6, tint?.glow || '#ffffff', m.r * 1.8, 0.3, 3);
      for (let i = 0; i < 6; i++) particles.dust(m.x + (Math.random() - 0.5) * m.r * 1.6, m.y + m.r * 0.6, tint?.primary || m.color);
    } else if (e === 'slam') {
      particles.ring(m.x, m.y + m.r * 0.7, '#ff8a3d', m.r * 3.2, 0.45, 6);
      particles.ring(m.x, m.y + m.r * 0.7, '#ffffff', m.r * 2.2, 0.3, 3);
      particles.shatter(m.x, m.y + m.r * 0.7, '#8a6a4a', m.r * 0.6, 8);
      particles.addShake(3);
      audio.stomp();
    }
  }
  m.events.length = 0;
}

const events = {
  // a bolt landed without killing: a spark in the bolt's colour at the
  // impact point; critical hits burst gold with a small "CRIT!"
  hit(m, s) {
    if (m.boss && s?.crit) auHitStop(0.035, 2, 0.6); // [au] boss crits land with weight
    const col = s?.kind === 'turret' ? '#ffd23d' : s?.kind === 'fever' ? '#ff7ad9' : '#bfeaff';
    const ix = s ? s.x : m.x, iy = s ? s.y : m.y;
    if (s?.crit) {
      trackMission(saveData, 'crits');
      particles.sparkle(ix, iy, '#ffd23d', 7);
      particles.ring(ix, iy, '#ffd23d', m.r * 1.3, 0.22, 3);
      particles.scoreText(m.x, m.y - m.r - 6, tr('g.crit'), '#ffd23d', 13);
    } else {
      particles.sparkle(ix, iy, col, 4);
      particles.ring(ix, iy, col, Math.max(10, m.r * 0.7), 0.14, 2);
    }
  },

  kill(m) {
    state.kills++;
    state.combo++;
    state.comboTimer = 1.2;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    if (state.combo === 20) announcer.show(tr('g.unstoppable'), tr('g.chain20'), '#ff8a3d', 1.2);
    const bonus = state.combo >= 3 ? state.combo : 0;
    const pts = m.score + bonus;
    state.score += pts;
    // Coins are scarce by design — only some kills drop any, and bosses always do.
    const E = CONFIG.economy;
    if (m.boss) {
      bzOnKill(m, state, particles); // bonus coins, BOSS DEFEATED banner, death blasts (systems/bosses.js)
      if (!m.bzMini) trackMission(saveData, 'boss');
    } else if (Math.random() < E.coinDropChance) {
      const [lo, hi] = E.coinDropAmount;
      const drop = Math.round(lo + Math.random() * (hi - lo));
      state.coins += drop;
      cfBurst(drop, m.x, m.y);
    }
    trackMission(saveData, 'kills');
    audio.pop(state.combo);
    audio.shatter();
    // Shatterlings break apart into crystal shards in their stage color.
    const tint = state.levelDef?.monsterTint;
    const shardColor = tint?.primary || m.color;
    particles.shatter(m.x, m.y, shardColor, m.r, m.boss ? 40 : m.elite ? 18 : 8);
    if (m.anim !== undefined && state.corpses.length < 40) {
      // ragdoll: the body is knocked up and away, spinning, then shrinks out
      const dir = Math.random() < 0.5 ? -1 : 1;
      state.corpses.push({
        ...m, action: null, ghosts: null, windup: 0, z: 0, hitFlash: 1, flock: null, maxHp: 1, elite: false,
        cvx: dir * (60 + Math.random() * 90), cvy: -(160 + Math.random() * 120) * (m.boss ? 0.4 : 1),
        rot: 0, vr: dir * (6 + Math.random() * 6), t: 0, life: m.boss ? 0.9 : 0.45, corpseScale: 1,
      });
    }
    particles.shatter(m.x, m.y, tint?.glow || '#ffffff', m.r * 0.6, m.boss ? 14 : 3);
    particles.ring(m.x, m.y, tint?.glow || '#ffffff', m.r * 1.8, 0.28, 3);
    particles.scoreText(m.x, m.y - m.r, `+${pts}`, m.elite ? '#ffd23d' : '#ffe9a8', m.elite || m.boss ? 24 : 16);

    // XP gems (see systems/runUpgrades.js)
    if (m.air) airshipBurst(m); // Clockwork City airship: sparks, smoke, falling gears
    if (state.run && m.isShip !== true) dropGems(state.run, m.x, m.y, m.boss ? 40 : m.elite ? 10 : m.type === 'troll' ? 3 : m.type === 'skeleton' ? 2 : 1);

    if (m.elite) {
      slowmo(0.25, 0.35);
      auHitStop(0.045);
      particles.addShake(7);
      particles.ring(m.x, m.y, '#ffd23d', 70, 0.45, 5);
      state.coins += 3;
      cfBurst(3, m.x, m.y);
      particles.scoreText(m.x, m.y - m.r - 22, '+3 coins', '#ffd23d', 15);
    }
    if (m.boss) {
      auHitStopCd = 0; auHitStop(0.07);
      slowmo(m.bzMini ? 0.7 : 1.6, m.bzMini ? 0.25 : 0.15);
      particles.addShake(14);
      audio.bigBoom();
      for (let i = 0; i < 3; i++) particles.ring(m.x, m.y, ['#ffffff', '#ffd23d', '#ff7ad9'][i], 120 + i * 60, 0.6 + i * 0.15, 8 - i * 2);
      state.enemyBullets.length = 0;
    }

    // FEVER — a 25+ kill chain supercharges the Guardian for a few seconds.
    if (state.run && state.combo >= 25 && state.run.feverReady) {
      state.run.fever = 7;
      state.run.feverReady = false;
      audio.fever();
      announcer.show(tr('g.fever'), '', '#ff7ad9', 1.1);
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
    if (state.lives === 1) announcer.show(tr('g.lastGate'), tr('g.protectGate'), '#ff5c7a', 1.3);
    if (state.lives <= 0 && state.dc) { dcFinish(false); return; } // Daily Challenge: straight to its results
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
      particles.scoreText(g.x, g.y, tr('g.bloodRestored'), '#ff5c7a');
    } else {
      state.player.applyGate(g.mult);
      particles.sparkle(g.x, g.y, '#58e07f');
      particles.scoreText(g.x, g.y, tr('g.magicMult', { n: g.mult }), '#58e07f');
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
    if (state.lives === 1) announcer.show(tr('g.lastGate'), tr('g.protectGate'), '#ff5c7a', 1.3);
    if (state.lives <= 0 && state.dc) { dcFinish(false); return; } // Daily Challenge: straight to its results
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
  // Arriving on the home page: scroll the map so the player's island (and
  // its CONTINUE pill) sits in view.
  if (mode === 'MENU' && mapFocusMode !== 'MENU') {
    const lay = homeLayout(0);
    const n = lay.nodes[Math.min(lay.nodes.length - 1, Math.floor((saveData.progress?.levelIndex || 0) / STAGE_SIZE))];
    mapScrollY = Math.max(0, Math.min(lay.scrollMax, n.cy - (lay.stageTop + lay.stageBottom) / 2 + 20));
  }
  mapFocusMode = mode;
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
  if (mode === 'LEVELCLEAR' && state?.lc) tickLevelClear(dt);
  if (state?.fadeIn > 0) state.fadeIn -= dt;
  if (state?.tu) tuUpdate(state, dt, mode, announcer);
  if (mode !== 'PLAYING') return;
  const st = state;
  const def = st.levelDef;
  dt *= dcSpeed(st); // Daily Challenge DOUBLE SPEED (1 otherwise)

  st.levelTime += dt;
  st3Track(st, dt); // level-star clock + hearts lost
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
  sxAfterPlayer(st, dt, particles); // stage twist: icy slide / vine roots
  updateHero(st.player, dt, st.levelTime); // cape physics, cannon heat, afterimages
  if (st.player.tryFire()) {
    const { x: muzzleX, y: muzzleY } = gunnerMuzzle(st.player);
    const abN0 = st.spells.length;
    runFire(st.run, muzzleX, muzzleY, st.player.power, st.spells);
    abHeroFired(st, abN0); // Armory rank 3: every 5th volley pierces
    particles.sparkle(muzzleX, muzzleY, st.run.fever > 0 ? `hsl(${(st.levelTime * 400) % 360},100%,70%)` : '#ffe9a8', 2);
    particles.addShake(0.6);
    audio.zap();
  }
  // footstep dust while the Guardian is moving quickly
  if (Math.hypot(st.player.vx, st.player.vy) > 160 && Math.random() < dt * 30) {
    particles.dust(st.player.x, st.player.y + st.player.size * 1.2);
  }

  // the Guardian's current bolt damage: helpers deal a share of it
  st.boltDamage = st.player.power * damageMult(st.run);
  for (const a of st.angels) { a.boltDamage = st.boltDamage; a.update(dt, st.player, st.spells); }
  st.angels = st.angels.filter((a) => !a.dead);

  st.spawner.update(dt, st);
  bzUpdate(st, dt, particles);
  st.spells.forEach((s) => s.update(dt));
  st.monsters.forEach((m) => {
    m.update(dt);
    if (m.events.length) monsterFx(m);
    if (m.tryShoot()) {
      if (m.boss) { if (!bzVolley(m, st, particles)) bossVolley(m); }
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
      const SC = sh.air ? CONFIG.airship : CONFIG.ship; // airships drop bombs the same way
      const n = SC.burstCount;
      const spread = SC.burstSpread;
      const startX = sh.x - ((n - 1) * spread) / 2;
      for (let i = 0; i < n; i++) {
        st.enemyBullets.push(new EnemyBullet(startX + i * spread, sh.y + sh.r * 0.4, sh.damage));
      }
      audio.enemyShot();
    }
  });
  st.walls.forEach((w) => w.update(dt));
  st.turrets.forEach((t) => {
    t.update(dt, st.monsters);
    if (t.tryShoot()) {
      const mz = t.muzzle();
      st.spells.push(new Spell(mz.x, mz.y, st.boltDamage * t.damageMult, { kind: 'turret', angle: t.aim }));
      abTurretFired(st, t, st.spells[st.spells.length - 1]); // Armory rank abilities
      audio.zap();
    }
  });
  abUpdate(dt, st, saveData, { particles, audio, damageMonster });

  sxUpdate(st, dt, { particles, audio, announcer, saveData, save, damageMonster, bloodLost: () => events.bloodLost(st.player) });
  if (mode !== 'PLAYING') return; // a stage hazard just cost the last heart
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
  updateAirshipDebris(dt);
  st.walls = st.walls.filter((w) => !w.dead);
  st.turrets = st.turrets.filter((t) => !t.dead);

  if (st.comboTimer > 0) {
    st.comboTimer -= dt;
    if (st.comboTimer <= 0) { st.combo = 0; if (st.run.fever <= 0) st.run.feverReady = true; }
  }
  if (st.bombFlash > 0) st.bombFlash -= dt;
  updateBombs(dt);
  st.helperHint = pickHelperHint(st);
  // knocked-away corpses: fly, spin, shrink out
  for (const c of st.corpses) {
    c.t += dt;
    c.x += c.cvx * dt; c.y += c.cvy * dt; c.cvy += 900 * dt;
    c.rot += c.vr * dt;
    c.corpseScale = Math.max(0.01, 1 - (c.t / c.life) ** 2);
  }
  st.corpses = st.corpses.filter((c) => c.t < c.life);
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
  const clearNow = allAttackersSpawned && bossHandled && st.monsters.length === 0 && !st.bzDeath; // let a boss death play out

  if (clearNow && !st.levelClearPending) {
    st.levelClearPending = true;
    st.levelClearTimer = LEVEL_CLEAR_DELAY;
    announcer.show(tr('g.levelClear'), '', '#58e07f', LEVEL_CLEAR_DELAY);
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
    if (st.dc && dcIsLast(st)) { dcFinish(true); return; } // Daily Challenge: all its levels done
    if (!st.dc) st3Award(st, saveData); // 1-3 level stars, best kept in saveData.stars (saved below)
    if (st.levelIndex >= LEVELS.length - 1) {
      mode = 'VICTORY';
      audio.waveUp();
      // Full playthrough done — keep every stage open (progress never goes
      // back; replaying any stage is the player's choice on the map).
      saveData.progress = { levelIndex: Math.max(saveData.progress?.levelIndex || 0, LEVELS.length - 1) };
      persistCoins();
      submitScore(saveData, { name: saveData.playerName, score: st.score, stage: Math.ceil(st.spawner.level / STAGE_SIZE) });
      save(saveData);
      backend.submitScore(saveData.playerId, st.score, Math.ceil(st.spawner.level / STAGE_SIZE));
      ads.showInterstitial();
      syncBanner(); // VICTORY screen — banner comes back once the interstitial dismisses
    } else {
      mode = 'LEVELCLEAR';
      audio.waveUp();
      st.lives = dcHeartBack(st, st.lives); // +1 heart (GLASS GATE challenge: stays at one)
      const LC = CONFIG.economy.levelClear;
      st.levelCoins = LC.base + LC.perLevel * st.spawner.lis + LC.perStage * st.spawner.stageIdx;
      st.coins += st.levelCoins;
      // the celebration card's clock (see renderLevelClear / LC_TIMES)
      st.lc = { t: 0, from: st.levelStartScore || 0, coins: st.levelCoins, landed: 0 };
      if (!st.dc) trackMission(saveData, 'levels');
      // Persist the furthest point reached so the home screen's "Continue"
      // picks up here even if the player quits before finishing the next level.
      // (Daily Challenge runs never move the normal progress.)
      // only ever forward: replaying an earlier stage never pulls the
      // player's furthest level (and their Continue point) back
      if (!st.dc) saveData.progress = { levelIndex: Math.max(saveData.progress?.levelIndex || 0, st.levelIndex + 1) };
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
// --- Obstacles: rolling hazards, one look per stage ----------------------
// Each one is a round body that turns as it rolls down (o.roll, see
// entities/obstacle.js). Its surface details turn with it, while the light
// stays fixed top-left — a highlight, a dark core edge and a ground shadow
// make it read as a solid 3D ball, rock, log or gear rather than a flat tile.
const OB_KIND = {
  bubbles: 'barrel', snow: 'ice', sand: 'sandstone', crystals: 'geode', embers: 'lava',
  clouds: 'marble', voidstars: 'orb', rain: 'gear', fireflies: 'puffball', banners: 'granite', spores: 'log',
};

// Lumpy outline points for a rock, fixed per obstacle (seeded).
function obOutline(o, r, n = 9, lump = 0.16) {
  if (!o.pts || o.ptsR !== r) {
    let s = o.seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    o.pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
      const rr = r * (1 - lump + rnd() * lump);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    o.ptsR = r;
  }
  return o.pts;
}
function obPath(pts) {
  ctx.beginPath();
  const m = (i) => pts[(i + pts.length) % pts.length];
  ctx.moveTo((m(-1)[0] + m(0)[0]) / 2, (m(-1)[1] + m(0)[1]) / 2);
  for (let i = 0; i < pts.length; i++) {
    const a = m(i), b = m(i + 1);
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
}
function obGearPath(r, teeth = 9) {
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.8;
    ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  ctx.closePath();
}
// Fixed top-left light over a body path already set in the rotated frame.
function obShade(roll, r, hi = 0.4, lo = 0.5) {
  const la = -roll - Math.PI * 0.75; // light direction in the turning frame
  const lx = Math.cos(la) * r * 0.45, ly = Math.sin(la) * r * 0.45;
  const g = ctx.createRadialGradient(lx, ly, r * 0.05, lx * 0.3, ly * 0.3, r * 1.25);
  g.addColorStop(0, `rgba(255,255,255,${hi})`);
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, `rgba(0,0,0,${lo})`);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawObstacle(o, def) {
  const pal = def.groundPalette;
  const base = pal ? pal.bands[2] : '#6a6080';
  const dark = pal ? pal.bands[0] : '#2a1f4d';
  const light = pal ? pal.bands[3] : '#7fd8ff';
  const kind = OB_KIND[def.decor] || 'granite';
  const r = Math.min(o.w, o.h) / 2;
  const t = state ? state.levelTime : performance.now() / 1000;
  // lumpy bodies bob a little as they tumble over their corners
  const bob = (kind === 'gear' || kind === 'orb' || kind === 'log' || kind === 'marble') ? 0 : Math.abs(Math.sin(o.roll * 2)) * r * 0.07;
  const x = o.x, y = o.y - bob;

  // ground shadow (doesn't turn)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(o.x + r * 0.18, o.y + r * 0.86, r * 0.92, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();

  // glowing kinds get a soft halo first
  const halo = kind === 'lava' ? '#ff7a2a' : kind === 'orb' ? light : kind === 'puffball' ? '#b48aff' : null;
  if (halo) {
    const hg = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.6);
    hg.addColorStop(0, halo + '55'); hg.addColorStop(1, halo + '00');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.roll);
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'barrel': { // Kenney barrel/crate, now rolling
      const img = KENNEY_PIRATE[o.spriteChoice || 'barrel'];
      if (img) { const dw = r * 2, dh = dw * (img.height / img.width); ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); }
      else { ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'gear': { // brass cog: a darker back face shows its thickness
      ctx.save(); ctx.translate(r * 0.1, r * 0.14);
      obGearPath(r); ctx.fillStyle = '#5a3a14'; ctx.fill();
      ctx.restore();
      obGearPath(r);
      ctx.fillStyle = '#c8902e'; ctx.fill();
      obShade(o.roll, r, 0.5, 0.45);
      ctx.strokeStyle = '#4a2e0c'; ctx.lineWidth = 2.5; obGearPath(r); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,160,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) { // spokes
        const a = i * Math.PI / 2;
        ctx.strokeStyle = '#7a5218'; ctx.lineWidth = r * 0.14;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); ctx.stroke();
      }
      ctx.fillStyle = '#3a240a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'log': { // mossy log rolling end-on: bark rim, growth rings, moss
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#4a321c'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = '#c89a62'; ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,30,0.6)'; ctx.lineWidth = 1.5;
      for (const k of [0.62, 0.42, 0.22]) { ctx.beginPath(); ctx.arc(r * 0.04, -r * 0.03, r * k, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(90,50,20,0.7)'; ctx.lineWidth = 1.5; // drying crack
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.5, r * 0.2); ctx.lineTo(r * 0.78, r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      obShade(o.roll, r, 0.25, 0.5);
      ctx.fillStyle = '#5ca048'; // moss clumps on the bark
      for (const a of [0.4, 2.1, 4.2]) { ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, r * 0.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#26180c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'marble': { // gilded marble column drum: gold rim, veins, rosette
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#d8a83a'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#f2ead8'; ctx.fill();
      ctx.strokeStyle = 'rgba(150,130,110,0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.2); ctx.quadraticCurveTo(-r * 0.1, r * 0.1, r * 0.3, -r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.5); ctx.quadraticCurveTo(r * 0.2, r * 0.2, r * 0.6, r * 0.35); ctx.stroke();
      ctx.fillStyle = '#d8a83a';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.13, r * 0.06, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      obShade(o.roll, r, 0.45, 0.4);
      ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 2.5; ctx.stroke();
      break;
    }
    case 'orb': { // aether orb: deep night inside with turning stars
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      const og = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      og.addColorStop(0, '#5a6ad8'); og.addColorStop(1, '#141238');
      ctx.fillStyle = og; ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + o.seed, d = r * (0.2 + (i % 4) * 0.18);
        const tw = 0.6 + 0.4 * Math.sin(t * 4 + i);
        ctx.globalAlpha = tw;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.3 + (i % 2), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(182,200,255,0.5)'; ctx.lineWidth = 1.5; // a mist ribbon around it
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.35, 0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      obShade(o.roll, r, 0.55, 0.35);
      ctx.strokeStyle = '#b6c8ff'; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'puffball': { // glowing purple mushroom puffball with teal spots
      const pts = obOutline(o, r, 10, 0.08);
      obPath(pts); ctx.fillStyle = '#7a4ab8'; ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + o.seed, d = r * (0.3 + (i % 3) * 0.2);
        ctx.fillStyle = `rgba(110,240,230,${0.6 + 0.3 * Math.sin(t * 3 + i)})`;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.1 + (i % 2) * 0.05), 0, Math.PI * 2); ctx.fill();
      }
      obPath(pts); obShade(o.roll, r, 0.4, 0.5);
      ctx.strokeStyle = '#2a1048'; ctx.lineWidth = 2.5; obPath(pts); ctx.stroke();
      break;
    }
    case 'ice': { // clear ice boulder: facets inside, frosty rim
      const pts = obOutline(o, r, 7, 0.12);
      obPath(pts); ctx.fillStyle = 'rgba(150,215,245,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3);
      for (const k of [2, 4, 6]) { ctx.lineTo(pts[k][0] * 0.95, pts[k][1] * 0.95); ctx.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,110,160,0.35)';
      ctx.beginPath(); ctx.moveTo(pts[3][0] * 0.9, pts[3][1] * 0.9); ctx.lineTo(pts[4][0] * 0.9, pts[4][1] * 0.9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      obPath(pts); obShade(o.roll, r, 0.6, 0.35);
      ctx.strokeStyle = '#1c3a4a'; ctx.lineWidth = 2.5; obPath(pts); ctx.stroke();
      break;
    }
    case 'geode': { // mossy rock with crystals breaking out of it
      const pts = obOutline(o, r * 0.86, 9, 0.14);
      const cols = ['#b48aff', '#5ce0c0', '#ffc86a'];
      for (let i = 0; i < 3; i++) { // shards stick out past the rock
        const a = i * 2.1 + o.seed, len = r * (1.05 + (i % 2) * 0.12);
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = cols[i]; ctx.strokeStyle = '#0e3327'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * 0.14, 0); ctx.lineTo(-r * 0.1, -len * 0.8); ctx.lineTo(0, -len); ctx.lineTo(r * 0.1, -len * 0.8); ctx.lineTo(r * 0.14, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.moveTo(-r * 0.05, -len * 0.2); ctx.lineTo(-r * 0.04, -len * 0.75); ctx.lineTo(0, -len * 0.9); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      obPath(pts); ctx.fillStyle = base; ctx.fill();
      ctx.fillStyle = '#3a8a5a';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
      obPath(pts); obShade(o.roll, r, 0.35, 0.55);
      ctx.strokeStyle = dark; ctx.lineWidth = 2.5; obPath(pts); ctx.stroke();
      break;
    }
    default: { // rocks: sandstone, lava rock, granite
      const pts = obOutline(o, r, kind === 'lava' ? 8 : 9, kind === 'granite' ? 0.2 : 0.15);
      const fill = kind === 'lava' ? '#2a1a1c' : kind === 'sandstone' ? '#c8964e' : '#8a8a96';
      obPath(pts); ctx.fillStyle = fill; ctx.fill();
      if (kind === 'sandstone') { // sediment bands
        ctx.save(); obPath(pts); ctx.clip();
        ctx.strokeStyle = 'rgba(120,70,30,0.35)'; ctx.lineWidth = r * 0.12;
        for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(-r, k * r); ctx.quadraticCurveTo(0, k * r + r * 0.15, r, k * r); ctx.stroke(); }
        ctx.restore();
      } else if (kind === 'lava') { // glowing cracks
        const pulse = 0.65 + 0.35 * Math.sin(t * 5 + o.seed);
        ctx.strokeStyle = `rgba(255,${140 + 60 * pulse | 0},40,${pulse})`; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.05); ctx.lineTo(r * 0.15, r * 0.45); ctx.moveTo(-r * 0.1, -r * 0.05); ctx.lineTo(r * 0.55, -r * 0.25); ctx.stroke();
      } else { // granite flecks + a crack
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 6; i++) { const a = i * 1.7 + o.seed; ctx.fillRect(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 2, 2); }
        ctx.strokeStyle = 'rgba(40,40,48,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.7); ctx.lineTo(0, -r * 0.1); ctx.lineTo(-r * 0.15, r * 0.4); ctx.stroke();
      }
      obPath(pts); obShade(o.roll, r, kind === 'lava' ? 0.2 : 0.42, 0.55);
      ctx.strokeStyle = kind === 'lava' ? '#120606' : dark; ctx.lineWidth = 2.5; obPath(pts); ctx.stroke();
    }
  }
  ctx.restore();

  // a glint that stays put on the lit side (sells the round 3D shape)
  if (kind !== 'barrel' && kind !== 'lava') {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.16, r * 0.08, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  if (kind === 'lava' && Math.random() < 0.08) particles.sparkle(x + (Math.random() - 0.5) * r, y - r * 0.5, '#ff8a3d', 1); // embers
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
  if (m.bzMini) bzDrawCrown(ctx, m, state ? state.levelTime : 0);
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

// White silhouette of a ship sprite for its hit flash, made once per image.
const shipMasks = new Map();
function shipFlashMask(img) {
  let c = shipMasks.get(img);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    shipMasks.set(img, c);
  }
  return c;
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
    // a hit jolts the hull and flashes only the ship's own shape (never
    // the sprite's square box)
    const jolt = s.hitFlash > 0 ? Math.sin(s.hitFlash * 90) * 2 : 0;
    ctx.drawImage(img, -dw / 2 + jolt, -dh / 2, dw, dh);
    if (s.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.8, s.hitFlash * 8);
      ctx.drawImage(shipFlashMask(img), -dw / 2 + jolt, -dh / 2, dw, dh);
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

// Clockwork City airship — drawn procedurally (no sprite): a ribbed brass/
// copper envelope with tail fins, a gondola with glowing windows, a spinning
// propeller and steam puffs. Local space faces +x; mirrored by travel dir.
// The hit flash re-fills the same silhouette in white (never a box).
function airshipSilhouette(r) {
  const cy = -r * 0.18;
  ctx.beginPath(); ctx.ellipse(0, cy, r, r * 0.46, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); // top fin
  ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 1.1, -r * 0.94); ctx.lineTo(-r * 1.2, -r * 0.62); ctx.lineTo(-r * 0.9, -r * 0.36);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); // bottom fin
  ctx.moveTo(-r * 0.6, r * 0.14); ctx.lineTo(-r * 1.1, r * 0.58); ctx.lineTo(-r * 1.2, r * 0.26); ctx.lineTo(-r * 0.9, 0);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-r * 0.44, r * 0.3, r * 0.86, r * 0.32, 5); ctx.fill(); // gondola
}

function drawAirship(s) {
  const r = s.r;
  const t = performance.now() / 1000 + s.bobPhase;
  const cy = -r * 0.18, ry = r * 0.46;
  const OUT = '#3a2210';
  ctx.save();
  ctx.translate(s.x + (s.hitFlash > 0 ? Math.sin(s.hitFlash * 90) * 2 : 0), s.y);
  if (s.dir < 0) ctx.scale(-1, 1);
  ctx.rotate(Math.sin(s.bobPhase * 0.9) * 0.04); // gentle nose pitch with the bob
  ctx.lineJoin = 'round';

  // steam puffs drifting back from the gondola's exhaust
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.8 + k / 3) % 1;
    ctx.globalAlpha = 0.55 * (1 - p);
    ctx.fillStyle = '#efe8dc';
    ctx.beginPath();
    ctx.arc(-r * 0.62 - p * r * 0.9, r * 0.42 - p * r * 0.55, r * (0.08 + p * 0.16), 0, Math.PI * 2);
    ctx.fill();
  }
  // damaged: dark smoke curling off the envelope
  if (s.hp / s.maxHp < 0.5) {
    for (let k = 0; k < 2; k++) {
      const p = (t * 0.6 + k / 2) % 1;
      ctx.globalAlpha = 0.5 * (1 - p);
      ctx.fillStyle = '#3c3632';
      ctx.beginPath();
      ctx.arc(r * 0.1 - p * r * 0.7, cy - ry - p * r * 0.6, r * (0.1 + p * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // fins (behind the envelope)
  ctx.fillStyle = '#8c4f26';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 1.1, -r * 0.94); ctx.lineTo(-r * 1.2, -r * 0.62); ctx.lineTo(-r * 0.9, -r * 0.36);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.14); ctx.lineTo(-r * 1.1, r * 0.58); ctx.lineTo(-r * 1.2, r * 0.26); ctx.lineTo(-r * 0.9, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // gondola struts + gondola
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * 0.2); ctx.lineTo(-r * 0.32, r * 0.32);
  ctx.moveTo(r * 0.26, r * 0.2); ctx.lineTo(r * 0.3, r * 0.32);
  ctx.stroke();
  const gg = ctx.createLinearGradient(0, r * 0.3, 0, r * 0.62);
  gg.addColorStop(0, '#9a5a2c'); gg.addColorStop(1, '#5a3218');
  ctx.fillStyle = gg;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-r * 0.44, r * 0.3, r * 0.86, r * 0.32, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9a352'; // brass trim band
  ctx.fillRect(-r * 0.42, r * 0.33, r * 0.82, r * 0.05);
  // glowing windows (soft pulsing halo, then the pane)
  const glow = 0.35 + 0.2 * Math.sin(t * 3);
  for (const wx of [-r * 0.14, r * 0.16]) {
    ctx.fillStyle = `rgba(255,200,90,${glow})`;
    ctx.beginPath(); ctx.arc(wx, r * 0.48, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(wx, r * 0.48, r * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // propeller at the gondola's tail — blades foreshorten as they spin
  const px = -r * 0.52, py = r * 0.46;
  ctx.fillStyle = 'rgba(230,220,200,0.18)';
  ctx.beginPath(); ctx.ellipse(px, py, r * 0.05, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  const bl = r * 0.27 * Math.cos(t * 26);
  ctx.fillStyle = '#c9c2b4';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(px, py - bl / 2, r * 0.05, Math.abs(bl / 2) + 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(px, py + bl / 2, r * 0.05, Math.abs(bl / 2) + 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9a352';
  ctx.beginPath(); ctx.arc(px + r * 0.04, py, r * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // envelope — brass/copper gradient, ribs, seam, nose cap, highlight
  const eg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  eg.addColorStop(0, '#f2c27a'); eg.addColorStop(0.45, '#c9813f'); eg.addColorStop(1, '#7a4420');
  ctx.fillStyle = eg;
  ctx.beginPath(); ctx.ellipse(0, cy, r, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,36,14,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const x = i * r * 0.26;
    ctx.moveTo(x, cy - ry); ctx.quadraticCurveTo(x + x * 0.3, cy, x, cy + ry);
  }
  ctx.moveTo(-r, cy + ry * 0.15); ctx.lineTo(r, cy + ry * 0.15);
  ctx.stroke();
  ctx.fillStyle = '#e0aa58'; // brass nose cap
  ctx.fillRect(r * 0.8, cy - ry, r * 0.3, ry * 2);
  ctx.fillStyle = '#ffd890'; // rivets on the seam
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * r * 0.26 + r * 0.13, cy + ry * 0.15, 1.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,245,215,0.35)'; // top sheen
  ctx.beginPath(); ctx.ellipse(r * 0.1, cy - ry * 0.55, r * 0.62, ry * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(0, cy, r, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.8, cy - ry * 0.6); ctx.lineTo(r * 0.8, cy + ry * 0.6); ctx.stroke();

  // hit flash — the same silhouette in white
  if (s.hitFlash > 0) {
    ctx.globalAlpha = Math.min(0.85, s.hitFlash * 8);
    ctx.fillStyle = '#fff';
    airshipSilhouette(r);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (s.maxHp > 1) {
    const py2 = s.y - r - 8;
    const w = r * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(s.x - w / 2, py2 - 2, w, 5);
    ctx.fillStyle = '#ff5d7a';
    ctx.fillRect(s.x - w / 2, py2 - 2, w * (s.hp / s.maxHp), 5);
  }
}

// Airship wreck — sparks, smoke and loose gears tumbling down when one is
// shot down (airships burst in the sky; only sea ships belong to the water).
const airshipDebris = [];
function airshipBurst(m) {
  particles.sparkle(m.x, m.y, '#ffd27a', 14);
  particles.sparkle(m.x, m.y, '#ff9a3a', 8);
  particles.poof(m.x, m.y, 'rgba(120,108,98,0.7)');
  particles.ring(m.x, m.y, '#ffc86a', m.r * 2.2, 0.35, 4);
  particles.addShake(4);
  const cols = ['#d9a352', '#b0703a', '#8a8f96'];
  for (let i = 0; i < 7 && airshipDebris.length < 80; i++) {
    airshipDebris.push({
      x: m.x + (Math.random() - 0.5) * m.r, y: m.y, vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 160,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, s: 4 + Math.random() * 6,
      t: 0, life: 1.1 + Math.random() * 0.6, color: cols[i % 3],
    });
  }
  for (let i = 0; i < 5 && airshipDebris.length < 80; i++) {
    airshipDebris.push({
      smoke: true, x: m.x + (Math.random() - 0.5) * m.r * 1.4, y: m.y + (Math.random() - 0.5) * m.r * 0.6,
      vx: (Math.random() - 0.5) * 40, vy: -15 - Math.random() * 25, s: 8 + Math.random() * 6, t: 0, life: 1.0 + Math.random() * 0.5,
    });
  }
}
function updateAirshipDebris(dt) {
  for (const d of airshipDebris) {
    d.t += dt;
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.smoke) d.s += 14 * dt;
    else { d.vy += 420 * dt; d.rot += d.vr * dt; }
  }
  for (let i = airshipDebris.length - 1; i >= 0; i--) if (airshipDebris[i].t >= airshipDebris[i].life) airshipDebris.splice(i, 1);
}
function drawAirshipDebris() {
  for (const d of airshipDebris) {
    const k = d.t / d.life;
    ctx.save();
    if (d.smoke) {
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.fillStyle = '#4a423c';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#2a1a0c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let j = 0; j < 32; j++) {
        const a = (j / 32) * Math.PI * 2, rr = j % 4 < 2 ? d.s : d.s * 0.74;
        if (j === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1a0c';
      ctx.beginPath(); ctx.arc(0, 0, d.s * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// Player-placed Wall — a squat stone-brick barrier with a hit-flash overlay
// and a thin hp bar, same treatment as monsters/ships.
// Player-placed Stone Wall — the same art as its Armory portrait
// (render/units.js), stretched to the wall's real size; cracks as it wears.
function drawWall(w) {
  ctx.save();
  drawStoneWall(ctx, w.x, w.y, w.w, w.h, performance.now() / 1000, 1 - w.hp / (w.maxHp || 1));
  if (w.hitFlash > 0) {
    ctx.globalAlpha = Math.min(1, w.hitFlash * 5);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h, 5);
    ctx.fill();
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

// Player-placed Gun — drawn by render/gun.js: it swivels toward its target,
// its core glows as the next shot charges, barrels recoil and flash.
function drawTurret(t) {
  drawGun(ctx, t.x, t.y, t.r * 1.2, { // drawn a bit larger than its hit circle
    aim: t.aim || 0, charge: t.fireInterval ? t.charge : 0.5,
    recoil: t.recoil, tier: t.tier || 0, hitFlash: t.hitFlash,
  });

  if (t.maxHp > 1) {
    const py = t.y + t.r * 1.45; // under the plinth — the barrels swing above
    const bw = t.r * 1.8;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(t.x - bw / 2 - 1, py - 1, bw + 2, 6, 3); ctx.fill();
    ctx.fillStyle = t.hp / t.maxHp > 0.35 ? '#ffd88a' : '#ff6b5a';
    ctx.beginPath(); ctx.roundRect(t.x - bw / 2, py, bw * Math.max(0, t.hp / t.maxHp), 4, 2); ctx.fill();
  }
}

function drawSpell(s) {
  const ang = Math.atan2(s.vx, -s.vy);
  const r = s.r * 0.7; // drawn smaller than the hit radius
  let col, core = '#ffffff';
  if (s.kind === 'fever') col = `hsl(${(s.hue + s.age * 600) % 360},100%,62%)`;
  else if (s.kind === 'seeker') col = '#ff9a3d';
  else if (s.kind === 'turret') col = '#ffd23d';
  else col = '#7fd8ff';
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(ang);
  // trail
  const len = s.kind === 'seeker' ? 18 : 20;
  // two-step tapered trail (no per-bolt gradient objects)
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = r * 0.9;
  ctx.beginPath(); ctx.moveTo(0, len * 0.5); ctx.lineTo(0, 0); ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = r * 0.6;
  ctx.beginPath(); ctx.moveTo(0, len); ctx.lineTo(0, len * 0.5); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  drawGlow(ctx, s.x, s.y, r * 1.7, s.kind === 'fever' ? '#ff7ad9' : col, 0.45);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath();
  if (s.kind === 'seeker') {
    ctx.roundRect(-3, -8, 6, 14, 3);
  } else {
    ctx.moveTo(0, -r * 1.3); ctx.lineTo(r * 0.45, 0); ctx.lineTo(0, r * 0.9); ctx.lineTo(-r * 0.45, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.18, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
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
  const bossName = bzBossName(boss);
  const label = boss.enraged ? tr('g.bossEnraged', { name: bossName.split(/[,،]/)[0] }) : bossName;
  ctx.strokeText(label, CONFIG.width / 2, y - 6);
  ctx.fillStyle = boss.enraged ? '#ff8a8a' : '#ffd23d';
  ctx.fillText(label, CONFIG.width / 2, y - 6);
  ctx.restore();
}

// Arrival rifts: a soft glowing tear at the top of the lane where the next
// enemies are about to come through (systems/spawner.js), and a brief glow
// along the top edge when a new wave begins.
function drawRifts(st) {
  const sp = st.spawner, col = st.levelDef.monsterTint?.glow || '#ffffff', y = sp.constructor.RIFT_Y;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const since = sp.clock - sp.waveStartT;
  if (sp.waveIdx > 0 && since >= 0 && since < 1.2) {
    const band = ctx.createLinearGradient(0, 60, 0, 150);
    band.addColorStop(0, col + '00'); band.addColorStop(0.4, col + '55'); band.addColorStop(1, col + '00');
    ctx.globalAlpha = 1 - since / 1.2;
    ctx.fillStyle = band;
    ctx.fillRect(0, 60, CONFIG.width, 90);
  }
  for (const p of sp.portals) {
    const open = Math.min(1, p.t / 0.25), close = Math.min(1, (p.life - p.t) / 0.3), a = open * close;
    if (a <= 0) continue;
    const hw = p.w / 2 * open;
    ctx.globalAlpha = a;
    const glow = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.w * 1.1);
    glow.addColorStop(0, col + '88'); glow.addColorStop(1, col + '00');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(p.x, y, p.w * 1.1, p.w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // dark void with an outlined, glowing rim — reads on bright stages too
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(24,10,44,0.8)';
    ctx.beginPath(); ctx.ellipse(p.x, y, hw, 6 * open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(10,4,24,0.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(p.x, y, hw, 6 * open, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(p.x, y, hw, 6 * open, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = col; // sparks drifting down out of the rift
    for (let k = 0; k < 5; k++) {
      const f = (p.t * 1.4 + k / 5) % 1;
      ctx.beginPath(); ctx.arc(p.x + (k - 2) * hw * 0.35, y + f * 34, 1.6 * (1 - f) + 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// --- REWARDS page: daily login, gift, video, missions, invite friends ----
let rewardsToast = null;   // { text, t } — the short "+75 COINS" confirmation
let inviteState = null;    // { code, friends, unpaid, invited } from the backend

function openRewards() {
  mode = 'REWARDS';
  syncBanner();
  audio.gateGood();
  inviteState = saveData.playerId ? { code: inviteCode(saveData.playerId), friends: 0, unpaid: 0, invited: false } : null;
  backend.inviteInfo(saveData.playerId).then((info) => { if (info) inviteState = info; });
}

function rewardsInfo() {
  const E = CONFIG.economy;
  return {
    coins: saveData.coins || 0,
    login: loginStatus(saveData),
    dailyLogin: E.dailyLogin,
    gift: giftStatus(saveData),
    video: videoStatus(saveData),
    videoReady: ads.isRewardedReady(),
    missions: missions(saveData).map((m) => ({ text: missionText(m), progress: m.progress, goal: m.goal, coins: missionCoins(m), claimed: m.claimed })),
    invite: inviteState,
    inviteAmounts: E.invite,
    toast: rewardsToast,
    dc: dcStatus(saveData), // Daily Challenge card
  };
}

function rewardClaimed(coins) {
  if (!coins) { audio.gateCurse(); return; }
  addCoins(coins);
  audio.pick();
  rewardsToast = { text: tr('g.coinsToast', { n: coins }), t: performance.now() / 1000 };
}

async function shareInvite() {
  if (!inviteState) return;
  const text = tr('g.inviteShare', { code: inviteState.code, n: CONFIG.economy.invite.friendGets });
  const url = 'https://gatewall.turtoo.app';
  try {
    if (navigator.share) { await navigator.share({ title: 'GateWall', text, url }); return; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    rewardsToast = { text: tr('g.codeCopied'), t: performance.now() / 1000 };
  } catch { /* share sheet closed */ }
}

async function enterInviteCode() {
  if (!inviteState || inviteState.invited) { audio.gateCurse(); return; }
  const code = (window.prompt(tr('g.enterInviteCode')) || '').trim();
  if (!code) return;
  const res = await backend.claimInvite(saveData.playerId, code);
  if (res?.error) { rewardsToast = { text: res.error.toUpperCase().slice(0, 28), t: performance.now() / 1000 }; audio.gateCurse(); return; }
  inviteState = { ...inviteState, invited: true };
  rewardClaimed(res.coins);
}

async function collectInvites() {
  const res = await backend.collectInvites(saveData.playerId);
  if (!res) { audio.gateCurse(); return; }
  inviteState = { ...inviteState, unpaid: 0 };
  rewardClaimed(res.coins);
}

function rewardsTap(x, y) {
  const B = REWARDS_BUTTONS;
  if (hit(B.login, x, y)) { rewardClaimed(claimLogin(saveData)); return; }
  if (hit(B.gift, x, y)) { rewardClaimed(claimGift(saveData)); return; }
  if (hit(B.video, x, y)) { watchRewardedAd(); return; }
  for (let i = 0; i < B.missions.length; i++) {
    if (hit(B.missions[i], x, y)) { rewardClaimed(claimMission(saveData, i)); return; }
  }
  if (inviteState && hit(B.share, x, y)) { shareInvite(); return; }
  if (inviteState && hit(B.enterCode, x, y)) { enterInviteCode(); return; }
  if (inviteState?.unpaid > 0 && hit(B.collect, x, y)) { collectInvites(); return; }
}

// --- DAILY CHALLENGE (systems/challenge.js, ui/challengeUi.js) ------------
// A normal run with state.dc set; it ends on its results card (DCRESULT)
// and never touches saveData.progress, saveData.best or the leaderboards.
let dcPanelOpen = false; // the detail panel over the Rewards page
let dcResult = null;     // what the DCRESULT card shows

function dcStart() {
  const today = dcToday();
  dcPanelOpen = false;
  dcResult = null;
  newGame(today.levels[0]);
  dcApplyStart(state, today);
  mode = 'PLAYING';
  syncBanner();
  announcer.show(tr('dc.title'), tr('dc.twist.' + today.twist), '#ffd23d', 2.2);
}

function dcFinish(cleared) {
  const st = state, dc = st.dc;
  mode = 'DCRESULT';
  if (cleared) audio.waveUp(); else audio.gameOver();
  const r = dcRecordResult(saveData, dc.day, st.score);
  st.coins += r.coins; // run coins + the challenge reward
  cfBurst(r.coins, CONFIG.width / 2, CONFIG.height / 2);
  persistCoins();
  dcResult = { ...r, cleared, score: st.score, levelsDone: dc.step + (cleared ? 1 : 0), levelsTotal: dc.levels.length };
  dcSubmit(saveData.playerId, dc.day, st.score);
  syncBanner();
}

function dcPanelTap(x, y) {
  const B = DC_PANEL_BUTTONS;
  if (hit(B.play, x, y)) { audio.pick(); dcStart(); return; }
  if (hit(B.close, x, y) || !hit(B.box, x, y)) { dcPanelOpen = false; audio.pick(); }
}

// Coin price of the next revive in this run (0 when none are left).
// Coin price of the next revive (0 = none left this run): about one
// level's coins at this stage, doubling for each revive in the run.
function reviveCost() {
  const R = CONFIG.economy.revive, n = state?.revives || 0;
  if (!state || n >= R.max) return 0;
  return Math.round((R.base + R.perStage * state.spawner.stageIdx) * Math.pow(R.growth, n) / 5) * 5;
}

// Back into the fight with full hearts and blood (ad or coin revive).
function reviveRun() {
  state.lives = CONFIG.gateHealth;
  state.player.blood = state.player.maxBlood;
  state.player.invuln = 2;
  state.enemyBullets = [];
  mode = 'PLAYING';
  syncBanner();
  audio.gateGood();
}

// One line on the GATE DOWN card pointing at what would help most next time.
function gameOverTip() {
  const p = saveData.permanent || {};
  if ((p.power || 0) < 3) return tr('g.tip.power');
  if ((p.fireRate || 0) < 3) return tr('g.tip.haste');
  if (!state.walls.length && !state.turrets.length) return tr('g.tip.wall');
  if (!state.angels.length) return tr('g.tip.ward');
  return tr('g.tip.bomb');
}

function render() {
  ctx.save();
  ctx.direction = isRtl() ? 'rtl' : 'ltr'; // Arabic/Persian text reads right-to-left
  setNavBadges(rewardsWaiting(saveData), saveData);
  st3Bind(saveData); // level stars / star chest read the live save
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
  if (mode === 'REWARDS') {
    renderRewards(ctx, rewardsInfo(), performance.now() / 1000);
    if (dcPanelOpen) dcRenderPanel(ctx, dcStatus(saveData), dcBoard, saveData.playerName, performance.now() / 1000);
    ctx.restore();
    return;
  }

  if (mode === 'UPGRADES') {
    renderBackground(LEVELS[0], 0);
    renderUpgrades(ctx, saveData, armorySel, performance.now() / 1000, null, armoryFlash);
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
    renderShop(ctx, shopInfo());
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
  // the Gate being defended, where the road ends (render/gate.js)
  drawGate(ctx, st.levelDef, st.lives, CONFIG.gateHealth, st.gateFlash, st.levelTime);
  drawRifts(st);

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
  abDrawGround(ctx, st); // Armory abilities: napalm, bramble zone
  sxDrawBack(ctx, st); // stage twist, ground layer (ice, lava, shadows…)
  for (const sp of st.spells) drawSpell(sp);

  // XP gems (under the monsters so the horde stays readable)
  renderRunWorld(ctx, { ...st.run, picks: {} }, st.player, st.levelTime);

  // Ships (Sea War only) — drawn before monsters so falling Shatterlings
  // read as being in front of/closer than the ships out on the water.
  for (const sh of st.ships) { if (sh.air) drawAirship(sh); else drawShip(sh); }
  drawAirshipDebris();

  // Knocked-away corpses, then the living horde
  for (const c of st.corpses) drawMonster(c);
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
      drawWall({ x: st.placing.x, y: st.placing.y, w: CONFIG.helpers.wall.width * statBonus('wall', 'width', unitLevel(saveData, 'wall', 'width')), h: CONFIG.helpers.wall.height, hp: 1, maxHp: 1, hitFlash: 0 });
    } else {
      drawTurret({ x: st.placing.x, y: st.placing.y, r: CONFIG.helpers.turret.size / 2, hp: 1, maxHp: 1, hitFlash: 0, tier: unitTotalLevel(saveData, 'turret') });
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

  sxDrawFront(ctx, st); // stage twist over the horde (fog, crystals, rocks…)
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
  abDraw(ctx, st); // Armory abilities: star bolts, lightning sparks, mini-bombs…

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
    ctx.shadowBlur = 0;
    // the Armory's shield emblem rides above the bubble while it lasts
    drawUnitArt(ctx, 'shield', p.x + p.size * 0.75, p.y - p.size * 0.75, 18, tt);
    ctx.restore();
  }

  // The Guardian — procedural animated hero (render/hero.js): cape physics,
  // boot thrusters, lean, cannon recoil + heat, afterimages, muzzle flash.
  if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 12) % 2 === 0) ctx.globalAlpha = 0.5;
  if (p.invuln > 0 && p.hurtFlash <= 0 && Math.floor(p.invuln * 14) % 2 === 0) ctx.globalAlpha = 0.6;
  drawHero(ctx, p, st.levelTime, { fever: st.run.fever > 0, hurt: p.hurtFlash > 0, rank: unitRanks.hero });
  sxDrawTop(ctx, st); // stage hazard warnings stay visible over the hero
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
    // the hero's boots (see render/hero.js).
    const barW = p.size * 0.9, barH = 4;
    const bx = p.x - barW / 2, by = p.y + p.size * 1.05; // just under the boots
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

  drawBombs(st); // bombs in the air, over everything on the field

  // Bomb flash
  if (st.bombFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${st.bombFlash * 2.4})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  bzRenderBack(ctx, st);
  renderAtmosphereFront(ctx, st, st.levelTime, st.run.fever);
  particles.render(ctx);
  announcer.render(ctx);
  renderHUD(ctx, st, ads.isRewardedReady());
  renderXPBar(ctx, st.run);
  drawBossBar(st);
  bzRenderFront(ctx, st);
  if (st.dc) dcRenderHud(ctx, st, BUTTONS); // Daily Challenge tag + locked helpers

  if (mode === 'LEVELCLEAR') renderLevelClear(ctx, st, LEVELS[dcNextIndex(st)].name, st.lc);
  if (mode === 'PLAYING' && st.fadeIn > 0) { // the next level fades in from black
    ctx.fillStyle = `rgba(6,3,14,${Math.min(1, st.fadeIn / 0.5)})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
  if (mode === 'VICTORY') renderVictory(ctx, st, saveData.best || 0);
  if (mode === 'DCRESULT' && dcResult) dcRenderResult(ctx, dcStatus(saveData), dcResult, dcBoard, saveData.playerName, performance.now() / 1000);
  if (mode === 'GAMEOVER') {
    renderGameOver(ctx, st, saveData.best || 0, {
      tip: gameOverTip(), reviveCost: reviveCost(),
      canAdRevive: (st.adRevives || 0) < CONFIG.economy.adRevives, adReady: ads.isRewardedReady(),
    });
  }
  if (mode === 'SHOP') renderShop(ctx, shopInfo());
  if (mode === 'PAUSED') renderPause(ctx);
  if (mode === 'PLAYING' && st.placePaused && !st.placing) renderPlacementBanner(ctx);
  if (mode === 'LEVELUP') renderLevelUp(ctx, st.run, performance.now() / 1000);
  if (st.tu) tuDraw(ctx, st, mode); // first-run hints, over everything

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
  next() { if (mode === 'LEVELCLEAR') { state.lc = null; startLevel(dcNextIndex(state)); mode = 'PLAYING'; syncBanner(); } },
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
  // read-only view of the menu UI, for UI tests that tap real button rects
  ui: { get save() { return saveData; }, get armorySel() { return armorySel; },
    MENU_BUTTONS, UPGRADE_BUTTONS, unitDialog, unitDialogRows, SHOP_BUTTONS },
};

// --- Auto quality governor --------------------------------------------
// Every ~1.5s of gameplay, look at the median frame time. Too slow → drop a
// quality level (fewer pixels, fewer decorative effects). Comfortably fast
// for three windows in a row → step back up. Medians ignore one-off hitches.
const qgSamples = [];
let qgFastWindows = 0;
function tuneQuality(frameDt) {
  const Q = CONFIG.quality;
  if (!Q.auto || frameDt <= 0 || frameDt > 0.25) return; // tab switch / pause
  qgSamples.push(frameDt);
  if (qgSamples.length < 90) return;
  qgSamples.sort((a, b) => a - b);
  const median = qgSamples[45];
  qgSamples.length = 0;
  if (median > 1 / 42 && Q.level > 0) {
    Q.level--; qgFastWindows = 0; resize();
  } else if (median < 1 / 58 && Q.level < 2) {
    if (++qgFastWindows >= 3) { Q.level++; qgFastWindows = 0; resize(); }
  } else qgFastWindows = 0;
}

// --- Loop --------------------------------------------------------
let last = performance.now();
function loop(now) {
  const frameDt = (now - last) / 1000;
  const rawDt = Math.min(frameDt, 0.05);
  last = now;
  if (mode === 'PLAYING') tuneQuality(frameDt);
  if (slowmoT > 0) slowmoT -= rawDt;
  else timeScale += (1 - timeScale) * Math.min(1, rawDt * 6);
  const dt = rawDt * timeScale * auHitStopScale(rawDt);
  auMusicSync();
  update(dt);
  particles.update(dt);
  announcer.update(dt);
  cfUpdate(rawDt);
  render();
  cfDraw(ctx); // flying coins over every screen
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
