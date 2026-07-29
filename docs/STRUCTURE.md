# Project Structure — Landgate

Root: `C:\ov371\prj\Game\shootingstart\`
Three separated areas: **game/** (code, shippable), **docs/** (design), **graphics/** (art source).

```
shootingstart/
├── docs/                      # Design & planning — never shipped
│   ├── GAME_BLUEPRINT.md      # Design doc (read first)
│   ├── STRUCTURE.md           # This file
│   └── notes.md               # Scratchpad for design decisions
│
├── graphics/                  # Art SOURCE files — never shipped
│   ├── ART_STYLE_GUIDE.md     # Palette, style rules, sprite pipeline
│   ├── sprites/               # Master SVG sprites (100×100 viewBox)
│   │   ├── wizard.svg, goblin.svg, slime.svg, imp.svg,
│   │   ├── fireball.svg, portal-good.svg
│   └── concept/               # Sketches, references, palette tests
│
└── game/                      # The playable project (this folder ships)
    ├── index.html             # Entry point — mobile-ready (fullscreen, no-zoom)
    ├── assets/
    │   ├── sprites/           # Production copies exported from graphics/sprites
    │   └── sounds/
    └── src/
        ├── main.js            # Boot, responsive high-DPI canvas, game loop
        ├── config.js          # ALL tunable numbers (balance lives here)
        ├── input.js           # Touch drag + mouse + keyboard → one interface
        ├── entities/
        │   ├── player.js      # Wizard: movement clamp, auto-cast timer
        │   ├── monster.js     # Base monster + types (slime splits!)
        │   ├── spell.js       # Projectiles + upgrade modifiers
        │   ├── obstacle.js    # Runes, hedges, moving platforms (drift down)
        │   └── gate.js        # Multiplier / curse portals
        ├── systems/
        │   ├── spawner.js     # Waves, clumps, adaptive difficulty
        │   ├── collision.js   # All hit checks
        │   ├── upgrades.js    # In-run choices + permanent meta
        │   ├── particles.js   # Poofs, sparkles, shake, slowmo
        │   └── audio.js       # Web Audio zaps with pitch escalation
        ├── ui/
        │   ├── hud.js         # Star bar, coins, gate hearts, combo
        │   └── screens.js     # Menu, upgrade choice, results/share card
        └── data/
            ├── monsters.js    # Monster stat table (single source of truth)
            ├── waves.js       # Biome wave scripts
            └── save.js        # localStorage save/load
```

## Mobile & web support (built in)

- **Responsive canvas:** game logic runs at a fixed 420×740 design resolution;
  `main.js` letterboxes and scales it to any screen or orientation.
- **High-DPI:** rendering multiplied by `devicePixelRatio` (capped ×3) — sharp on
  Retina/AMOLED phones.
- **Touch-safe page:** no pinch-zoom, no pull-to-refresh, no text selection,
  `viewport-fit=cover` for notched phones; works as a home-screen web app.
- **Graphics:** SVG masters scale losslessly for every screen; production copies
  live in `game/assets/sprites/`.
- **Native stores later:** wrap `game/` with Capacitor for iOS/Android builds.

## Build order (Milestone M0)

1. `main.js` + `config.js` + `input.js` — loop running, wizard moving. ✅ done
2. `spell.js` + `monster.js` + `spawner.js` + `collision.js` — shooting things.
3. `obstacle.js` + `gate.js` — the lane/dodge layer.
4. `hud.js` + one upgrade in `upgrades.js` — a complete run.

No build tools needed: plain ES modules. Run a local server from `game/`
(`npx serve` or VS Code Live Server) and open `index.html`.
