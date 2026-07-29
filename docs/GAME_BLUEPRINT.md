# SPELLSTORM LANES — Game Blueprint

*Working title. A fantasy lane shooter for kids and adults.*
*Version 0.1 — 2026-07-27*

---

## 1. One-line pitch

A wizard at the bottom of the screen auto-casts magic upward while hordes of goofy fantasy monsters march down through shifting lanes — you only steer, dodging obstacles and grabbing spell-multiplier gates to survive the storm.

## 2. Why this can work (research-backed)

The "hybrid-casual" formula proven by Habby (Archero, Survivor.io) is: a juicy, one-finger core loop + light meta progression + TikTok-friendly visuals. Survivor.io's hypnotic mass-kill feedback and Archero's dodge-while-auto-attacking skill layer are exactly the two ingredients this design combines. Key takeaways applied here:

- **One-finger control, auto-fire** — the entire skill is positioning (Archero's core insight).
- **Horde density** — screens full of enemies melting under spells reads great in short videos (Survivor.io's TikTok success).
- **Multiplier gates** — the most-copied viral mechanic in lane shooters; we make them fantasy portals.
- **Family-friendly, not gory** — monsters "poof" into coins/stars, never blood. Plants vs. Zombies proved cartoon horde-defense appeals to kids AND adults; tone matters more than difficulty.

Sources: [MAF Top Mobile Games 2025](https://maf.ad/en/blog/top-mobile-games-2025/), [Naavik — Evolution of Hybridcasual](https://naavik.co/deep-dives/evolution-of-hybridcasual-deepdive/), [AppQuantum — Survivor.io analysis](https://appquantum.medium.com/how-innovation-and-iteration-have-transformed-survivor-io-1485b50180b3), [Axios — Survivor.io TikTok boost](https://www.axios.com/2022/08/26/survivorio-habby-tiktok-ios-android), [Naavik — Survivor.io vs Archero](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)

## 3. Fantasy theme

- **Player:** a young apprentice wizard (choose skin: wizard, witch, dragon-rider kid, robot-mage — cosmetic only).
- **Enemies (instead of zombies):** cartoon goblins, slimes, skeleton jesters, mushroom trolls, flying imps, and big boss ogres/dragons. Cute-scary, like *Clash Royale* / *PvZ* tone.
- **Bullets = spells:** fireballs, ice shards, lightning chains, star bolts. Upgrades visibly change the projectile (bigger, splitting, bouncing).
- **World:** you defend the Landgate at the bottom of the screen. Levels travel through biomes: Enchanted Forest → Crystal Caves → Lava Peaks → Sky Castle → Shadow Realm.
- **Obstacles between you and the horde:** stone runes (block spells), thorn hedges (destructible), magic portals (×2 / ×3 fire-rate gates, or curse gates that halve it — steer wisely!), and moving cloud platforms that shift the safe lanes.

## 4. Core loop (30–90 second runs)

1. Monsters spawn at top in clumps and march down.
2. Wizard auto-casts constantly; player drags left/right with one finger.
3. Player weaves between obstacles into clear lanes, choosing which gates to pass through (multiplier portals vs. curse portals).
4. Kills drop stars (XP) and coins. Filling the star bar mid-run offers a choice of 3 spell upgrades (Survivor.io-style mini-roguelike choice).
5. Wave ends with a mini-boss. Survive → next wave, faster and denser.
6. Death/level-end → results screen → coins spent on permanent upgrades (meta).

**Fail state:** monsters reaching the Landgate crack it (3 hits = run over). Touching the player = one crack too. No death animation for the kid-hero — they get "dizzy stars," gate shatters into light, instant retry.

## 5. The twist (what makes it not a clone)

**Living lanes:** obstacles slowly slide downward too, so safe paths constantly shift — the level "breathes." Combined with split-on-hit slimes (one big slime → two small → four tiny), the screen dynamically fills and clears. Skilled adults optimize gate-routing and split-chains; kids can just dodge and blast.

## 6. Difficulty for kids AND adults

- **Adaptive rubber-banding:** after 2 failed runs, spawn density quietly drops 15%; win streaks raise it. No visible "easy mode" — nobody feels babied.
- **Two skill layers:** dodging (accessible, kids) and gate-route optimization + upgrade synergy (mastery, adults).
- **Controls:** touch-drag (mobile), mouse-drag or arrow keys (desktop). Cross-platform from day one: HTML5 canvas core, wrappable with Capacitor for iOS/Android.

## 7. Progression & meta

- **In-run (temporary):** spell upgrades chosen from star bar (multi-shot, bounce, pierce, chain lightning, frost slow, giant fireball).
- **Permanent (coins):** base fire rate, spell power, gate health, starting upgrade slot.
- **Cosmetic (earn or IAP later):** character skins, spell colors, trail effects. Monetization is cosmetics + optional rewarded ads (double coins) — kid-safe, no pay-to-win.
- **Collection hook:** monster-pedia — every new monster type defeated is added to a sticker book. Kids love completing it; adults get lore blurbs.

## 8. Viral / share moments

- End-of-run auto-generated highlight card: "342 goblins bonked, best combo ×48" with the sticker-book art.
- Near-miss slow-motion: last-second dodge triggers a 0.3s slowmo — clip-worthy.
- Weekly seeded challenge run (same spawn pattern for everyone) with a shareable score card.

## 9. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Engine | HTML5 Canvas + vanilla JS (upgrade path: Phaser 3) | Zero-install prototype, runs everywhere, easy to wrap |
| Mobile wrapper | Capacitor | One codebase → iOS + Android + web |
| Audio | Web Audio API | Pitch-shifted pops/zaps, tiny footprint |
| Saves | localStorage → cloud later | Simple first |
| Art | Flat cartoon vector style, big silhouettes | Readable at speed, cheap to produce, kid-friendly |

## 10. Milestones

1. **M0 — Grey-box prototype (1–2 weeks):** rectangles only. Movement, auto-fire, spawning, obstacles, gates, one upgrade. *Goal: does steering feel good?*
2. **M1 — Juice pass:** particles, screen shake, sounds, split-slimes, mini-boss.
3. **M2 — Meta:** coins, permanent upgrades, sticker book, adaptive difficulty.
4. **M3 — Content:** 5 biomes, 12 monster types, 10 spells, weekly challenge.
5. **M4 — Ship:** Capacitor builds, store pages, TikTok clip capture.

## 11. Project structure

See `STRUCTURE.md` for the file-by-file map of the `src/` folder scaffolded in this directory.
