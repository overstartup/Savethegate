// Ward Sprite (class name kept as Angel for save-compat) — bought with coins;
// a living crystal shard that flies beside the Guardian, auto-fires bolts, and
// stays for good (persists across levels). Has its own blood-line buffer so
// enemy fire hits the sprite first without ever "punishing" the purchase —
// depleting it costs one shared heart, then it refills and keeps fighting.
import { Spell } from './spell.js';
import { CONFIG } from '../config.js';

export class Angel {
  constructor(side = 1) {
    this.side = side;       // -1 left, +1 right of the wizard
    this.fireTimer = 0;
    this.x = 0;
    this.y = 0;
    this.bob = 0;
    this.blood = CONFIG.angel.maxBlood;
    this.maxBlood = CONFIG.angel.maxBlood;
    this.invuln = 0;
    this.hitFlash = 0;
    this.dead = false;
  }

  update(dt, player, spells) {
    this.bob += dt * 5;
    this.x = player.x + this.side * 46;
    this.y = player.y - 6 + Math.sin(this.bob) * 5;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 0.25;
      spells.push(new Spell(this.x, this.y - 18));
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  // Called when an enemy bullet touches this angel. Returns true if this hit
  // depleted the blood line (caller should dock one heart, then refill it).
  takeHit(damage = 1) {
    if (this.invuln > 0) return false;
    this.invuln = 0.5; // IFrames
    this.hitFlash = 0.15;
    this.blood -= damage;
    if (this.blood <= 0) {
      this.blood = this.maxBlood; // refill — angels never die from this
      return true;
    }
    return false;
  }

  render(ctx) {
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    ctx.save();
    if (flicker) ctx.globalAlpha = 0.4;
    // crystal wings (faceted, icy blue instead of white feathers)
    ctx.fillStyle = 'rgba(154,230,255,0.85)';
    ctx.strokeStyle = '#1c3a52';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(this.x + s * 14, this.y + 2, 10, 5, s * 0.6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // body — a small faceted crystal shard (flashes red on hit)
    ctx.fillStyle = this.hitFlash > 0 ? '#ff6b6b' : '#bdeeff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(this.x - 3, this.y - 3, 3, 4.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // ward-ring (icy blue instead of gold halo)
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 14, 8, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // face
    ctx.fillStyle = '#1c3a52';
    ctx.beginPath(); ctx.arc(this.x - 3, this.y - 1, 1.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(this.x + 3, this.y - 1, 1.4, 0, 7); ctx.fill();
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
