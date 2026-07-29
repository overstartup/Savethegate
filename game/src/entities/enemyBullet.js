// Enemy projectile — fired by ranged monsters (see MONSTERS[type].shootInterval),
// travels straight down. Blocked by obstacles just like the player's spells.
import { CONFIG } from '../config.js';

export class EnemyBullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = CONFIG.enemyBullet.size;
    this.dead = false;
  }

  update(dt) {
    this.y += CONFIG.enemyBullet.speed * dt;
    if (this.y > CONFIG.height + 30) this.dead = true;
  }
}
