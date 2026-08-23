// Monster stat table — the single source of truth for balance + sticker book.
// All enemies are "Shatterlings" — corrupted crystal creatures marching to
// reach and shatter the GateWall. Colors follow a crystal/gem palette so
// they read as living crystal, not generic fantasy critters.
// shootInterval (seconds) — omit/undefined for melee-only monsters that never fire.
// movement = { amp, freq, bob } tunes how lively each type's path-wobble
// overlay reads on top of whatever shared clump path the spawner assigns —
// amp/freq multiply the clump's curveAmp/curveFreq (see entities/monster.js)
// so every type keeps its own "personality" even inside a mixed clump
// heading the same direction, and bob adds a small per-type squash/bounce
// pulse in the renderer (drawMonster in main.js) for extra life without
// touching the actual movement math.
// power — how much of the BOMB weapon's power budget this type costs to
// destroy (see WEAPONS.bomb.power / buyWeapon('bomb') in main.js). Fixed,
// independent of hp/hpMult scaling, so the bomb behaves the same way at
// every stage: a fixed pool of power that gets spent on the closest
// monsters to the gate first, and runs out faster against tougher types.
export const MONSTERS = {
  goblin:   { hp: 1, speed: 1.0, coins: 1, size: 26, color: '#3fae9e', sticker: 'Grumbles, Lesser Shatterling', power: 50,
    movement: { amp: 1.3, freq: 1.7, bob: 0.10 } },              // quick, darting zigzag
  slime:    { hp: 2, speed: 0.7, coins: 2, size: 34, color: '#5cc8e8', splitsInto: 'slimeSmall', sticker: 'Sir Squish, Crystal Ooze', power: 90,
    movement: { amp: 0.85, freq: 1.15, bob: 0.22 } },            // slow squash-and-stretch bounce
  slimeSmall: { hp: 1, speed: 0.9, coins: 1, size: 20, color: '#9ae6ff', sticker: null, power: 40,
    movement: { amp: 1.0, freq: 1.6, bob: 0.26 } },              // twitchier little bounce
  imp:      { hp: 1, speed: 1.6, coins: 2, size: 22, color: '#b358e0', flying: true, sticker: 'Zippy, Shard-Wing', shootInterval: 2.4, power: 60,
    movement: { amp: 1.5, freq: 1.35, bob: 0.06 } },             // wide swooping flight
  skeleton: { hp: 3, speed: 0.8, coins: 3, size: 30, color: '#cfe8f0', sticker: 'Rattles, Cracked Warden', shootInterval: 3.0, power: 150,
    movement: { amp: 0.55, freq: 0.8, bob: 0.05 } },             // steady, disciplined march
  troll:    { hp: 6, speed: 0.5, coins: 5, size: 44, color: '#6a5c9e', sticker: 'Mossback, Stoneshard', shootInterval: 4.0, power: 300,
    // amp trimmed (was 1.7) — a hulking troll swinging THAT wide read as
    // erratic rather than heavy; a smaller amp at the same low freq now
    // reads as a slow, labored, weighty sway instead.
    movement: { amp: 1.15, freq: 0.5, bob: 0.14 } },             // heavy, labored lumbering sway
  ogreBoss: { hp: 30, speed: 0.3, coins: 25, size: 80, color: '#7a3fa0', boss: true, sticker: 'Bruncle, the Gate-Breaker', shootInterval: 1.6, power: 900,
    movement: { amp: 1.0, freq: 1.0, bob: 0.08 } },              // keeps spawner's own big explicit weave as-is
};
