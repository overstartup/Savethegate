// All hit checks. Mutates state; reports events back via the events object.
import { CONFIG } from '../config.js';

export function resolveCollisions(state, events, dt = 1 / 60) {
  const { spells, monsters, obstacles, gates, player, enemyBullets, angels, ships, walls, turrets } = state;

  // Spell ↔ obstacle (runes block magic)
  for (const s of spells) {
    if (s.dead) continue;
    for (const o of obstacles) {
      if (o.contains(s.x, s.y, s.r)) { s.dead = true; events.spellBlocked(s); break; }
    }
  }

  // Spell ↔ monster
  for (const s of spells) {
    if (s.dead) continue;
    for (const m of monsters) {
      if (m.dead) continue;
      const dx = s.x - m.x, dy = s.y - m.y, rr = s.r + m.r;
      if (dx * dx + dy * dy <= rr * rr) {
        s.dead = true;
        const children = m.onHit(s.damage);
        if (m.dead) {
          events.kill(m);
          if (children) monsters.push(...children);
        } else {
          events.hit(m);
        }
        break;
      }
    }
  }

  // Spell ↔ ship (Sea War only — ships never split, just sink)
  if (ships && ships.length) {
    for (const s of spells) {
      if (s.dead) continue;
      for (const sh of ships) {
        if (sh.dead) continue;
        const dx = s.x - sh.x, dy = s.y - sh.y, rr = s.r + sh.r;
        if (dx * dx + dy * dy <= rr * rr) {
          s.dead = true;
          sh.onHit(s.damage);
          if (sh.dead) events.kill(sh); else events.hit(sh);
          break;
        }
      }
    }
  }

  // Enemy bullets ↔ walls/turrets — a proper barrier/target for enemy fire,
  // checked before bullets ever reach the player/angels below.
  if (enemyBullets && enemyBullets.length) {
    if (walls && walls.length) {
      for (const b of enemyBullets) {
        if (b.dead) continue;
        for (const w of walls) {
          if (w.dead) continue;
          if (w.contains(b.x, b.y, b.r)) { b.dead = true; w.onHit(1); break; }
        }
      }
    }
    if (turrets && turrets.length) {
      for (const b of enemyBullets) {
        if (b.dead) continue;
        for (const t of turrets) {
          if (t.dead) continue;
          const dx = b.x - t.x, dy = b.y - t.y, rr = b.r + t.r;
          if (dx * dx + dy * dy <= rr * rr) { b.dead = true; t.onHit(1); break; }
        }
      }
    }
  }

  // Monster ↔ wall — blocks the monster (pushed back above it) and chips
  // away at both sides while they're pressed together, so a weak monster
  // dies against the wall while a tough one eventually breaks through.
  if (walls && walls.length) {
    for (const m of monsters) {
      if (m.dead) continue;
      for (const w of walls) {
        if (w.dead) continue;
        if (w.contains(m.x, m.y, m.r)) {
          m.y = w.y - w.h / 2 - m.r; // hold it just above the wall
          w.onHit(CONFIG.wall.touchDamageToWall * dt);
          const children = m.onHit(CONFIG.wall.touchDamageToMonster * dt);
          if (m.dead) {
            events.kill(m);
            if (children) monsters.push(...children);
          } else {
            events.hit(m);
          }
          break;
        }
      }
    }
  }

  // Monster ↔ turret — chips the turret over time but does NOT block the
  // monster's advance (a turret is a target, not a barrier).
  if (turrets && turrets.length) {
    for (const m of monsters) {
      if (m.dead) continue;
      for (const t of turrets) {
        if (t.dead) continue;
        const dx = m.x - t.x, dy = m.y - t.y, rr = m.r + t.r;
        if (dx * dx + dy * dy <= rr * rr) {
          t.onHit(CONFIG.turret.touchDamageFromMonster * dt);
          break;
        }
      }
    }
  }

  // Monster reaches the GateWall (bottom) → lose a life
  for (const m of monsters) {
    if (!m.dead && m.y - m.r > CONFIG.height - 24) {
      m.dead = true;
      events.breach(m);
    }
  }

  // Monster ↔ player → lose a life
  const pr = player.size / 2;
  for (const m of monsters) {
    if (m.dead) continue;
    const dx = m.x - player.x, dy = m.y - player.y, rr = m.r + pr;
    if (dx * dx + dy * dy <= rr * rr) {
      m.dead = true;
      events.breach(m);
    }
  }

  // Player ↔ obstacle → gently push the wizard out (runes are solid)
  for (const o of obstacles) {
    if (o.contains(player.x, player.y, pr)) {
      const left = player.x - (o.x - o.w / 2 - pr);
      const right = (o.x + o.w / 2 + pr) - player.x;
      const top = player.y - (o.y - o.h / 2 - pr);
      const bottom = (o.y + o.h / 2 + pr) - player.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) player.x -= left;
      else if (m === right) player.x += right;
      else if (m === top) player.y -= top;
      else player.y += bottom;
    }
  }

  // Player ↔ gate → apply fire-rate effect
  for (const g of gates) {
    if (!g.dead && g.touches(player.x, player.y, pr)) {
      g.dead = true;
      events.gate(g);
    }
  }

  // Enemy bullets ↔ angels first (angels screen the wizard — this is what
  // makes buying one a pure upside instead of a risk), then ↔ player.
  // Neither ever "dies" from this — depleting a blood line just docks one
  // shared heart and refills, per design.
  if (enemyBullets && enemyBullets.length) {
    for (const b of enemyBullets) {
      if (b.dead) continue;

      let absorbed = false;
      if (angels && angels.length) {
        for (const a of angels) {
          const dx = b.x - a.x, dy = b.y - a.y, rr = b.r + 12;
          if (dx * dx + dy * dy <= rr * rr) {
            b.dead = true;
            absorbed = true;
            // Fire feedback on EVERY graze, not just when the line fully
            // empties — otherwise the first two hits look like nothing happened.
            events.grazed(a);
            if (a.takeHit(b.damage)) events.bloodLost(a);
            break;
          }
        }
      }
      if (absorbed) continue;

      const dx = b.x - player.x, dy = b.y - player.y, rr = b.r + pr;
      if (dx * dx + dy * dy <= rr * rr) {
        b.dead = true;
        if (player.shieldTime > 0) {
          events.shieldBlock(player); // bullet fizzles — no blood/heart loss while shielded
        } else {
          events.grazed(player);
          if (player.takeHit(b.damage)) events.bloodLost(player);
        }
      }
    }
  }
}
