# Design notes / scratchpad

- 2026-07-27: Blueprint v0.1 created. Theme: fantasy (wizard vs. cartoon monsters), replaces zombies for kid-friendliness.
- Open questions:
  - Gate effects: per-wave or timed (e.g. 10s)? Prototype both in M0.
  - Should obstacles damage the player on touch, or just block? Start with block-only (kid-friendly).
  - Combo window length for pitch-escalating sounds: try 1.2s.

- 2026-10-05: Gameplay + motion-graphics pass.
  - Enemies are now procedural animated vector creatures (`game/src/render/creatures.js`): walk/hop/flap cycles, blinking eyes that track the Guardian, lean into turns, squash + knockback on hit, glowing shot wind-up telegraph, crystal-shatter deaths. Fixes the old tint bug (tinted sprites painted solid boxes over the background).
  - In-run progression (`game/src/systems/runUpgrades.js`): kills drop XP gems → LEVEL UP → pick 1 of 3 (Twin Bolts, Haste, Power, Piercing, Wing Cannons, Orbit Blades, Chain Lightning, Seekers, Frost Nova, Magnet, Mend). Starting a run past level 1 grants a "Veteran Boost" so Continue is viable.
  - FEVER at a 25-kill combo (rainbow fire, ×1.6 rate, 7s). Elites (golden, 3× hp, gem burst + slow-mo). Boss now hovers and fires radial / aimed / spiral volleys, enrages <50% hp, has an HP bar; HP scales with run power.
  - Gate integrity pool (150) behind each heart — a leak chips it by monster size instead of costing a whole heart. Ramming a monster hits blood instead of a heart. Blood regens 2%/s after 3.5s untouched; at 0 blood a hit costs a heart (was: immune); losing a heart to bullets refills half the blood line.
  - Sticker damage is now a rating (120 = 1 bolt damage); before, 120 dmg one-shot everything and made hp/stages/POWER meaningless. POWER upgrade = +15%/level.
  - Spawner intensity scales with run level, level-in-stage and level quota (`systems/spawner.js`).
  - Playtest hooks (dev only): `__game.start(i)`, `__game.sim(seconds, picker)` headless fast-forward, `window.__autopilot = (state) => ({x, y})`. Balance was tuned with a simple dodge-and-target bot: ~75% clear L1 losing ~1 heart; strong runs reach L6–L10; Continue from L5 now survives several levels.

- 2026-10-05 (pass 2): Strict gate + gentle ramp + flock physics + Armory.
  - EVERY Shatterling crossing the gate line (CONFIG.gateY, drawn as an energy barrier above the buy row) costs a heart; hearts 3 → 5. The gate-integrity pool from pass 1 is gone.
  - Levels start tiny (L1 = 30 goblins, then 40, 50… 170 at L10; +15%/stage) and introduce one enemy type at a time. The spawner caps enemies alive on screen (grows with level-in-stage, stage, run power, progress), so leaks stay rare. XP gems always home in after ~2s and early level-ups come fast (xpNeed = 5 + 2·lvl²), so power climbs step by step.
  - Movement (`systems/flocks.js`): groups fly as formations (vee, line, arc, wave, diamond, snake, rotating ring) behind a virtual leader on a harmonic path; members are critically-damped springs to their slots, re-slot ("close ranks") when someone dies, and soft-body separation keeps everyone from overlapping. Singles wander on smooth layered-sine noise with per-type personality (slimes hop). Hits are physical impulses.
  - Armory (`data/upgrades.js`, Upgrades page): Guardian, Ward Sprite, Cannon, Stone Wall, Bomb, Shield, each with separately upgraded stats. Cost = base × growth^level (≈×1.35–1.55 per level, up to 8–20 levels), so a strong hero takes many coins; "GET COINS" buttons open the coin shop (IAP). Hero levels stay in saveData.permanent (+ new `blood`); other units in saveData.units.
  - Test hooks: `__game.sim` now mutes audio (suspended-AudioContext node pile-up used to stall the page), `__game.frame()` steps+renders one frame.
  - Bot results (fresh save, no Armory): Stage 1 L1–L9 cleared without a single gate leak; boss levels cost 1–2 hearts to boss bullets.
