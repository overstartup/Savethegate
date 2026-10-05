// Enemy projectile — fired by ranged monsters (see MONSTERS[type].shootInterval)
// and boss volleys. Travels along (vx, vy); default straight down.
import { CONFIG } from '../config.js';

export class EnemyBullet {
  constructor(x, y, damage = 10, vx = 0, vy = CONFIG.enemyBullet.speed, big = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.big = big;
    this.r = CONFIG.enemyBullet.size * (big ? 1.4 : 1);
    this.age = Math.random() * 6;
    this.dead = false;
  }

  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > CONFIG.height + 30 || this.y < -60 || this.x < -40 || this.x > CONFIG.width + 40) this.dead = true;
  }
}
