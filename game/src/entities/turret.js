// Turret ("Gun") — a player-placed auto-turret. Fires straight up on its
// own timer (reuses the Spell projectile, same as the Guardian's own fire)
// with no need for the player to aim it. Destroyable by enemy bullets and
// by monsters pressing against it.
import { CONFIG } from '../config.js';

export class Turret {
  // up = Armory levels { power, fireRate, hp } (data/upgrades.js)
  constructor(x, y, up = {}) {
    this.x = x;
    this.y = y;
    this.r = CONFIG.turret.size / 2;
    this.damage = CONFIG.turret.damage * (1 + 0.25 * (up.power || 0));
    this.fireInterval = CONFIG.turret.fireRate / (1 + 0.1 * (up.fireRate || 0));
    this.hp = CONFIG.turret.hp * (1 + 0.25 * (up.hp || 0));
    this.maxHp = this.hp;
    this.hitFlash = 0;
    this.dead = false;
    this.shootTimer = CONFIG.turret.fireRate * 0.5; // fire fairly quickly after being placed
    this.barrelRecoil = 0; // purely cosmetic kick animation on fire
  }

  update(dt) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.barrelRecoil > 0) this.barrelRecoil -= dt * 4;
    this.shootTimer -= dt;
  }

  tryShoot() {
    if (this.dead) return false;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.fireInterval;
      this.barrelRecoil = 1;
      return true;
    }
    return false;
  }

  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.12;
    if (this.hp <= 0) this.dead = true;
  }
}
