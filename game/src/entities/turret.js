// Turret ("Gun") — a player-placed auto-turret. Fires straight up on its
// own timer (reuses the Spell projectile, same as the Guardian's own fire)
// with no need for the player to aim it. Destroyable by enemy bullets and
// by monsters pressing against it.
import { CONFIG } from '../config.js';
import { statBonus } from '../data/upgrades.js';

export class Turret {
  // up = Armory levels { power, fireRate, hp } (data/upgrades.js)
  // stageIdx scales health so a gun survives tougher stages; damageMult is a
  // share of the Guardian's bolt damage (applied when it fires, in main.js)
  constructor(x, y, up = {}, stageIdx = 0) {
    const T = CONFIG.helpers.turret;
    this.x = x;
    this.y = y;
    this.r = T.size / 2;
    this.damageMult = T.damage * statBonus('turret', 'power', up.power || 0);
    this.fireInterval = T.shotInterval / statBonus('turret', 'fireRate', up.fireRate || 0);
    this.hp = T.hp * statBonus('turret', 'hp', up.hp || 0) * (1 + CONFIG.helpers.stageHp * stageIdx);
    this.range = T.range * statBonus('turret', 'range', up.range || 0); // Armory RANGE
    this.maxHp = this.hp;
    this.hitFlash = 0;
    this.dead = false;
    this.shootTimer = this.fireInterval * 0.5; // fire fairly quickly after being placed
    // looks: Armory level total → twin barrels (8+) and gold trim (20+)
    this.tier = (up.power || 0) + (up.fireRate || 0) + (up.hp || 0);
    this.twin = this.tier >= 8;
    this.aim = 0;            // radians off vertical, + = right (like Spell)
    this.want = 0;
    this.target = null;
    this.barrel = 0;         // twin barrels alternate
    this.recoil = [0, 0];    // per-barrel kick, cosmetic
    this.age = 0;
  }

  // Picks the nearest live enemy above the gun within range and swivels
  // toward it at a capped turn rate; with nothing in range it idles in a
  // slow sweep.
  update(dt, monsters = []) {
    const T = CONFIG.helpers.turret;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.recoil[0] = Math.max(0, this.recoil[0] - dt * 4);
    this.recoil[1] = Math.max(0, this.recoil[1] - dt * 4);
    this.shootTimer -= dt;
    this.age += dt;
    let best = null, bd = this.range * this.range;
    for (const m of monsters) {
      if (m.dead || m.y > this.y - 4 || m.y < CONFIG.playTop) continue;
      const dx = m.x - this.x, dy = m.y - this.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = m; }
    }
    this.target = best;
    this.want = best
      ? Math.max(-T.maxAim, Math.min(T.maxAim, Math.atan2(best.x - this.x, this.y - best.y)))
      : Math.sin(this.age * 0.8) * 0.35;
    const d = this.want - this.aim;
    this.aim += Math.max(-T.turnRate * dt, Math.min(T.turnRate * dt, d));
  }

  // 0..1 — how close the next shot is (drives the core glow)
  get charge() { return 1 - Math.max(0, this.shootTimer) / this.fireInterval; }

  // Fires only at a target, once the head is lined up with it.
  tryShoot() {
    if (this.dead || this.shootTimer > 0 || !this.target) return false;
    if (Math.abs(this.want - this.aim) > 0.15) return false;
    this.shootTimer = this.fireInterval;
    if (this.twin) this.barrel = 1 - this.barrel;
    this.recoil[this.barrel] = 1;
    return true;
  }

  // Where the next bolt leaves the (current) barrel.
  muzzle() {
    const ox = this.twin ? (this.barrel ? 1 : -1) * this.r * 0.29 : 0, len = this.r * 1.95; // barrel tip as drawn (render scale 1.2)
    const s = Math.sin(this.aim), c = Math.cos(this.aim);
    return { x: this.x + ox * c + len * s, y: this.y + ox * s - len * c };
  }

  onHit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.12;
    if (this.hp <= 0) this.dead = true;
  }
}
