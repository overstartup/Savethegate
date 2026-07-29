// Monster stat table — the single source of truth for balance + sticker book.
// All enemies are "Shatterlings" — corrupted crystal creatures marching to
// reach and shatter the Landgate. Colors follow a crystal/gem palette so
// they read as living crystal, not generic fantasy critters.
// shootInterval (seconds) — omit/undefined for melee-only monsters that never fire.
export const MONSTERS = {
  goblin:   { hp: 1, speed: 1.0, coins: 1, size: 26, color: '#3fae9e', sticker: 'Grumbles, Lesser Shatterling' },
  slime:    { hp: 2, speed: 0.7, coins: 2, size: 34, color: '#5cc8e8', splitsInto: 'slimeSmall', sticker: 'Sir Squish, Crystal Ooze' },
  slimeSmall: { hp: 1, speed: 0.9, coins: 1, size: 20, color: '#9ae6ff', sticker: null },
  imp:      { hp: 1, speed: 1.6, coins: 2, size: 22, color: '#b358e0', flying: true, sticker: 'Zippy, Shard-Wing', shootInterval: 2.4 },
  skeleton: { hp: 3, speed: 0.8, coins: 3, size: 30, color: '#cfe8f0', sticker: 'Rattles, Cracked Warden', shootInterval: 3.0 },
  troll:    { hp: 6, speed: 0.5, coins: 5, size: 44, color: '#6a5c9e', sticker: 'Mossback, Stoneshard', shootInterval: 4.0 },
  ogreBoss: { hp: 30, speed: 0.3, coins: 25, size: 80, color: '#7a3fa0', boss: true, sticker: 'Bruncle, the Gate-Breaker', shootInterval: 1.6 },
};
