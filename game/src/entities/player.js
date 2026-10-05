// Wizard: one-finger movement is the ONLY control; casting is automatic.
import { CONFIG } from '../config.js';

export class Player {
  // upgrades = saveData.permanent ({ power, speed, fireRate } levels 0..UPGRADE_MAX,
  // see data/upgrades.js) — permanent, bought from the main-menu Upgrades screen.
  // activeSticker = the currently equipped sticker (hero/tool) that defines base stats.
  constructor(upgrades = {}, activeSticker = null) {
    this.x = CONFIG.width / 2;
    this.y = CONFIG.player.y;
    this.size = CONFIG.player.size;
    this.fireTimer = 0;
    this.fireRateMult = 1;      // changed by portal gates (temporary, in-run)
    this.fireRateMultTime = 0;  // seconds remaining on gate effect
    this.hurtFlash = 0;
    this.facing = 1; // 1 for right, -1 for left
    this.vx = 0;        // smoothed velocity → lean / dust (render only)
    this.vy = 0;
    this.recoil = 0;    // 1 right after a shot, decays → kick + muzzle flash
    this.runRateMult = 1; // in-run upgrades + FEVER (see systems/runUpgrades.js)

    // Permanent upgrade effects
    this.speedMult = 1 + (upgrades.speed || 0) * 0.08;      // SWIFTNESS: +8%/level
    this.fireRateBonus = 1 + (upgrades.fireRate || 0) * 0.08; // HASTE: +8%/level
    
    // Base stats come from the equipped sticker, plus power upgrades
    // Sticker damage is a power RATING (the starter hero is 120) — scaled
    // so 120 = 1 bolt damage against monster hp of 1-6 (data/monsters.js).
    // Using the raw 120 one-shot every enemy at every stage, which made hp,
    // pips, stage toughness and damage upgrades all meaningless.
    const baseDmg = activeSticker ? activeSticker.damage / CONFIG.player.stickerDamagePerBolt : CONFIG.spell.damage;
    this.damage = baseDmg * (1 + 0.15 * (upgrades.power || 0)); // POWER: +15% dmg/level

    // Blood line — a hit-buffer against enemy bullets.
    // The active sticker defines max blood (e.g., 200 HP).
    const baseBlood = activeSticker ? activeSticker.blood : CONFIG.player.maxBlood;
    const maxBlood = Math.round(baseBlood * (1 + 0.15 * (upgrades.blood || 0))); // VITALITY: +15%/level
    this.blood = maxBlood;
    this.maxBlood = maxBlood;
    this.invuln = 0;

    // Shield — a timed buff (bought with coins, see WEAPONS.shield) that
    // blocks enemy bullets outright while active: no blood/heart loss at
    // all, the bullet just fizzles on contact. Ticks down in update().
    this.shieldTime = 0;
  }

  update(dt, input) {
    // Free 2D movement — fly anywhere on screen; you shoot from wherever you
    // are. Simple straight-line pursuit of the touch point, no extra sway
    // or wobble layered on top — kept intentionally minimal per request.
    const px0 = this.x, py0 = this.y;
    const tx = input.targetX(this.x);
    const ty = input.targetY(this.y);
    const dx = tx - this.x, dy = ty - this.y;

    // Update facing direction based on movement
    if (dx > 0) this.facing = 1;
    else if (dx < 0) this.facing = -1;

    const dist = Math.hypot(dx, dy);
    const step = CONFIG.player.speed * this.speedMult * dt;
    if (dist <= step) { this.x = tx; this.y = ty; }
    else { this.x += (dx / dist) * step; this.y += (dy / dist) * step; }

    const half = this.size / 2;
    this.x = Math.max(half, Math.min(CONFIG.width - half, this.x));
    // Bottom clamp stops the Guardian above the buy-button row. This used to
    // only account for the collision half-size, but the drawn sprite's feet
    // sit well below this.y (see GUNNER_DISP_MULT/footY in main.js's
    // drawPlayer — the sprite is anchored at y + size*1.25, not y + half),
    // so the old clamp let the visible feet dip behind the buttons even
    // though the hit-circle itself was still clear. Clamp now accounts for
    // that full visual foot offset plus a small fixed buffer (was a much
    // bigger ~10%-of-screen buffer, which stopped the Guardian way too high
    // — he couldn't come down anywhere near the seafloor growth at all).
    const footOffset = this.size * 1.25;
    const maxY = CONFIG.height - CONFIG.hud.rowBottomOffset - footOffset - 20;
    this.y = Math.max(half + 40, Math.min(maxY, this.y)); // 40 = HUD zone

    const k = Math.min(1, dt * 10);
    this.vx += ((this.x - px0) / Math.max(dt, 1e-4) - this.vx) * k;
    this.vy += ((this.y - py0) / Math.max(dt, 1e-4) - this.vy) * k;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 9);

    // Gate effect timer
    if (this.fireRateMultTime > 0) {
      this.fireRateMultTime -= dt;
      if (this.fireRateMultTime <= 0) this.fireRateMult = 1;
    }
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    // Out-of-combat regen: after a few seconds without a hit, the blood
    // line slowly refills (2%/s) — so a drained Guardian recovers by
    // playing well, not only via blood-gift gates.
    this.sinceHit = (this.sinceHit || 0) + dt;
    if (this.sinceHit > 3.5 && this.blood < this.maxBlood) {
      this.blood = Math.min(this.maxBlood, this.blood + this.maxBlood * 0.02 * dt);
    }
    if (this.shieldTime > 0) this.shieldTime -= dt;

    this.fireTimer -= dt;
  }

  // Grants (or tops up) the bullet-blocking shield. Stacks additively so
  // buying a second one while the first is still up extends the total time
  // instead of wasting the purchase.
  addShield(seconds) {
    this.shieldTime = Math.max(this.shieldTime, 0) + seconds;
  }

  // Returns true when it's time to cast a spell
  tryFire() {
    if (this.fireTimer <= 0) {
      this.fireTimer = 1 / (CONFIG.player.fireRate * this.fireRateMult * this.fireRateBonus * this.runRateMult);
      this.recoil = 1;
      return true;
    }
    return false;
  }

  applyGate(mult, duration = 8) {
    this.fireRateMult = mult;
    this.fireRateMultTime = duration;
  }

  // A blood-gift gate — restores a fraction of max blood outright (never
  // more than the max, so it can't be stockpiled past full).
  healBlood(frac) {
    this.blood = Math.min(this.maxBlood, this.blood + this.maxBlood * frac);
  }

  // Called when an enemy bullet touches the wizard. Returns true exactly
  // once, the moment the blood line crosses from having some left to
  // empty (caller docks one gate for that). Blood and gates are separate
  // pools now — losing a gate does NOT refill blood anymore (that used to
  // happen automatically here and in events.breach()); the only way blood
  // comes back is a blood-gift gate (see healBlood()) or damage/upgrades.
  // Blood is clamped at 0 rather than going negative, and since the
  // "just crossed to empty" check only fires once, sitting at 0 blood
  // doesn't cost a gate on every subsequent hit — it just means there's no
  // buffer left until a blood gift tops it back up.
  takeHit(damage = 1) {
    if (this.invuln > 0) return false;
    this.invuln = CONFIG.player.invulnAfterHit;
    this.hurtFlash = 0.15;
    this.sinceHit = 0;
    // Already drained? This hit goes straight through to a heart (with a
    // longer grace window) — previously a drained Guardian was immune.
    if (this.blood <= 0) {
      this.invuln = 1.5;
      return true;
    }
    this.blood = Math.max(0, this.blood - damage);
    return this.blood <= 0;
  }
}
