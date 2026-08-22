// Wave scripts per biome. Each wave: duration, spawn table (weights), density multiplier, boss.
export const BIOMES = ['forest', 'caves', 'lava', 'sky', 'shadow'];

export const WAVES = [
  { biome: 'forest', duration: 30, spawns: { goblin: 6, slime: 3 },            density: 1.0, boss: null },
  { biome: 'forest', duration: 35, spawns: { goblin: 5, slime: 4, imp: 2 },    density: 1.2, boss: null },
  { biome: 'forest', duration: 40, spawns: { goblin: 4, slime: 4, imp: 3, skeleton: 2 }, density: 1.4, boss: 'ogreBoss' },
  // TODO(M3): caves, lava, sky, shadow wave sets
];
