# Art Style Guide — Landgate

## Style
Flat cartoon vector. Big rounded shapes, thick dark outlines (#2a1f4d, 3–4 units),
oversized eyes, no gradients except soft radial glows on magic. Cute-scary tone —
think Clash Royale / Plants vs Zombies, never realistic or gory.

## Why SVG
All sprites are authored as SVG in `graphics/sprites/`. SVG scales losslessly from
a 360px phone to a 4K monitor — one file serves web and mobile. At build time
(or runtime) they are rasterized to the exact display size, so they're always sharp.

Rule: author every sprite on a 100×100 viewBox, centered, with ~8% padding so
rotation never clips.

## Palette
| Use | Hex |
|---|---|
| Background night | #1a1030 |
| Background deep | #0d0820 |
| Outline | #2a1f4d |
| Wizard robe | #7c5cff |
| Wizard hat/accent | #5c3cff |
| Fire spell | #ff8a3d → glow #ffd23d |
| Ice spell | #6fd8ff |
| Goblin green | #6abf4b |
| Slime teal | #4bc0bf |
| Imp red | #e06666 |
| Good portal | #58e07f |
| Curse portal | #b358e0 |
| Coins/stars | #ffd23d |

## Readability rules (small screens)
- Silhouette-first: every monster must be identifiable as a black shape.
- Minimum on-screen size 22 design-units; no detail thinner than 2 units.
- Enemies warm/green colors, player + spells cool purple/blue — instant team reading.
- Motion sells character: bounce slimes, waddle goblins — animation over detail.

## Pipeline
1. Author/edit SVG here in `graphics/sprites/`.
2. Export/copy production-ready files to `game/assets/sprites/`.
3. `graphics/concept/` holds sketches, references, palette tests — never shipped.
