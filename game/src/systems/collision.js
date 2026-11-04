// All hit checks. Mutates state; reports events back via the events object.
import { CONFIG } from '../config.js';
import { abWallBlock, abShieldBlock } from './abilities.js';

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
      if (m.dead || m.y < CONFIG.playTop) continue; // safe under the header
      if (s.hitSet && s.hitSet.has(m)) continue; // piercing shot already went through this one
      const hit = m.hitTest ? m.hitTest(s.x, s.y, s.r) : ((s.x - m.x) ** 2 + (s.y - m.y) ** 2 <= (s.r + m.r) ** 2);
      if (hit) {
        if (s.pierce > 0) {
          s.pierce--;
          (s.hitSet || (s.hitSet = new Set())).add(m);
        } else {
          s.dead = true;
        }
        // critical hits: double damage, double knock-back (CONFIG.spell)
        s.crit = Math.random() < CONFIG.spell.critChance;
        const children = m.onHit(s.crit ? s.damage * CONFIG.spell.critMult : s.damage, s.crit ? 2 : 1);
        if (m.dead) {
          events.kill(m, s);
          if (children) monsters.push(...children);
        } else {
          events.hit(m, s);
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
          if (w.contains(b.x, b.y, b.r)) { b.dead = true; w.onHit(1); abWallBlock(state, w, b); break; }
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
          if (m.pvy > 0) m.pvy = 0;
          w.onHit(CONFIG.helpers.wall.crushDps * dt);
          const children = m.onHit(w.thorns * (state.boltDamage || 1) * dt);
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
          t.onHit(CONFIG.helpers.turret.crushDps * dt);
          break;
        }
      }
    }
  }

  // Monster reaches the GateWall (bottom) → lose a life
  for (const m of monsters) {
    if (!m.dead && !m.boss && m.y > CONFIG.gateY) {
      m.dead = true;
      events.breach(m);
    }
  }

  // Monster ↔ player → it explodes on the Guardian (heavy blood-line hit)
  const pr = player.size / 2;
  for (const m of monsters) {
    if (m.dead) continue;
    const dx = m.x - player.x, dy = m.y - player.y, rr = m.r + pr;
    if (dx * dx + dy * dy <= rr * rr) {
      m.dead = true;
      events.rammed(m);
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

  // Enemy bullets ↔ ward sprites first (they screen the Guardian — a pure
  // upside: a sprite that runs out of guard is only knocked out for a while,
  // it never costs a heart), then ↔ player. The player never "dies" from
  // this — depleting the blood line docks one shared heart and refills.
  if (enemyBullets && enemyBullets.length) {
    for (const b of enemyBullets) {
      if (b.dead) continue;

      let absorbed = false;
      if (angels && angels.length) {
        for (const a of angels) {
          if (!a.guarding) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = b.r + 12;
          if (dx * dx + dy * dy <= rr * rr) {
            b.dead = true;
            absorbed = true;
            // Fire feedback on EVERY graze, not just when the line fully
            // empties — otherwise the first two hits look like nothing happened.
            events.grazed(a);
            a.takeHit();
            break;
          }
        }
      }
      if (absorbed) continue;

      const dx = b.x - player.x, dy = b.y - player.y, rr = b.r + pr;
      if (dx * dx + dy * dy <= rr * rr) {
        b.dead = true;
        if (player.shieldTime > 0) {
          events.shieldBlock(player); abShieldBlock(state, b); // bullet fizzles — no blood/heart loss while shielded
        } else {
          events.grazed(player);
          if (player.takeHit(b.damage)) events.bloodLost(player);
        }
      }
    }
  }
}
