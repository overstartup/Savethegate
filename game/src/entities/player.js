// Wizard: one-finger movement is the ONLY control; casting is automatic.
import { CONFIG } from '../config.js';

export class Player {
  // upgrades = saveData.permanent ({ power, speed, fireRate } levels 0..UPGRADE_MAX,
  // see data/upgrades.js) — permanent, bought from the main-menu Upgrades screen.
  constructor(upgrades = {}) {
    this.x = CONFIG.width / 2;
    this.y = CONFIG.player.y;
    this.size = CONFIG.player.size;
    this.fireTimer = 0;
    this.fireRateMult = 1;      // changed by portal gates (temporary, in-run)
    this.fireRateMultTime = 0;  // seconds remaining on gate effect
    this.hurtFlash = 0;

    // Permanent upgrade effects
    this.speedMult = 1 + (upgrades.speed || 0) * 0.08;      // SWIFTNESS: +8%/level
    this.fireRateBonus = 1 + (upgrades.fireRate || 0) * 0.08; // HASTE: +8%/level
    this.damage = CONFIG.spell.damage + (upgrades.power || 0); // POWER: +1 dmg/level

    // Blood line — a hit-buffer against enemy bullets. Getting shot chips
    // blood, not hearts directly; only a fully depleted blood line costs a
    // heart (then refills), so a few grazing hits are forgiving.
    this.blood = CONFIG.player.maxBlood;
    this.maxBlood = CONFIG.player.maxBlood;
    this.invuln = 0;

    // Shield — a timed buff (bought with coins, see WEAPONS.shield) that
    // blocks enemy bullets outright while active: no blood/heart loss at
    // all, the bullet just fizzles on contact. Ticks down in update().
    this.shieldTime = 0;
  }

  update(dt, input) {
    // Free 2D movement — fly anywhere on screen; you shoot from wherever you are
    const tx = input.targetX(this.x);
    const ty = input.targetY(this.y);
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = CONFIG.player.speed * this.speedMult * dt;
    if (dist <= step) { this.x = tx; this.y = ty; }
    else { this.x += (dx / dist) * step; this.y += (dy / dist) * step; }
    const half = this.size / 2;
    this.x = Math.max(half, Math.min(CONFIG.width - half, this.x));
    // Bottom clamp stops the Guardian right above the buy-button row (not
    // just above the screen edge) — the buttons are solid UI, so the player
    // should never be able to fly behind/under them.
    const maxY = CONFIG.height - CONFIG.hud.rowBottomOffset - half - 6;
    this.y = Math.max(half + 40, Math.min(maxY, this.y)); // 40 = HUD zone

    // Gate effect timer
    if (this.fireRateMultTime > 0) {
      this.fireRateMultTime -= dt;
      if (this.fireRateMultTime <= 0) this.fireRateMult = 1;
    }
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
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
      this.fireTimer = 1 / (CONFIG.player.fireRate * this.fireRateMult * this.fireRateBonus);
      return true;
    }
    return false;
  }

  applyGate(mult, duration = 8) {
    this.fireRateMult = mult;
    this.fireRateMultTime = duration;
  }

  // Called when an enemy bullet touches the wizard. Returns true if this hit
  // depleted the blood line (caller should dock one heart, then refill it).
  takeHit() {
    if (this.invuln > 0) return false;
    this.invuln = CONFIG.player.invulnAfterHit;
    this.hurtFlash = 0.15;
    this.blood -= 1;
    if (this.blood <= 0) {
      this.blood = this.maxBlood;
      return true;
    }
    return false;
  }
}
