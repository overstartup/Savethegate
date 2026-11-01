// Ward Sprite (class name kept as Angel for save-compat) — bought with coins;
// a living crystal shard that flies beside the Guardian, auto-fires bolts, and
// stays for good (persists across levels). It soaks enemy bullets meant for
// the Guardian; after `guard` bullets it is knocked out for a few seconds
// (dimmed, no shots, no blocking), then recovers. It never costs a heart.
import { Spell } from './spell.js';
import { CONFIG } from '../config.js';
import { statBonus } from '../data/upgrades.js';
import { drawUnitArt } from '../render/units.js';

export class Angel {
  // up = Armory levels { power, fireRate, blood } (data/upgrades.js)
  constructor(side = 1, up = {}) {
    this.side = side;       // -1 left, +1 right of the wizard
    // damage = share of the Guardian's bolt damage (boltDamage is refreshed
    // by main.js every frame), boosted by Armory POWER
    this.damageMult = CONFIG.helpers.angel.damage * statBonus('angel', 'power', up.power || 0);
    this.boltDamage = 1;
    this.fireInterval = CONFIG.helpers.angel.shotInterval / statBonus('angel', 'fireRate', up.fireRate || 0);
    this.fireTimer = 0;
    this.x = 0;
    this.y = 0;
    this.bob = 0;
    this.maxBlood = CONFIG.helpers.angel.guard + statBonus('angel', 'blood', up.blood || 0);
    this.stunTime = CONFIG.helpers.angel.stun / statBonus('angel', 'recover', up.recover || 0); // Armory RECOVER
    this.blood = this.maxBlood;
    this.invuln = 0;
    this.hitFlash = 0;
    this.stun = 0;          // >0 → knocked out
    this.dead = false;
  }

  update(dt, player, spells) {
    this.bob += dt * 5;
    this.x = player.x + this.side * 46;
    this.y = player.y - 6 + Math.sin(this.bob) * 5;
    if (this.stun > 0) { this.stun -= dt; if (this.hitFlash > 0) this.hitFlash -= dt; return; }
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      spells.push(new Spell(this.x, this.y - 18, this.boltDamage * this.damageMult));
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  // Can it catch bullets right now?
  get guarding() { return this.stun <= 0; }

  // Called when an enemy bullet touches this sprite: each bullet uses one
  // guard; the last one knocks it out for a while. Returns true on knock-out.
  takeHit() {
    if (this.invuln > 0) return false;
    this.invuln = 0.3; // IFrames
    this.hitFlash = 0.15;
    this.blood -= 1;
    if (this.blood <= 0) {
      this.blood = this.maxBlood; // recovers full once the knock-out ends
      this.stun = this.stunTime;
      return true;
    }
    return false;
  }

  render(ctx) {
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    if (this.stun > 0) ctx.globalAlpha = 0.3; // knocked out
    // the same crystal sprite as the Armory portrait (render/units.js)
    drawUnitArt(ctx, 'angel', this.x, this.y, 34, this.bob / 5);
    if (this.hitFlash > 0) { // flashes red when it soaks a bullet
      ctx.fillStyle = 'rgba(255,90,90,0.55)';
      ctx.beginPath(); ctx.arc(this.x, this.y, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // blood-line pips (tiny hearts under the angel)
    const pipW = 6, gap = 3;
    const total = this.maxBlood * pipW + (this.maxBlood - 1) * gap;
    let px = this.x - total / 2;
    for (let i = 0; i < this.maxBlood; i++) {
      ctx.fillStyle = i < this.blood ? '#ff5d7a' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(px + pipW / 2, this.y + 16, pipW / 2, 0, Math.PI * 2);
      ctx.fill();
      px += pipW + gap;
    }
  }
}
