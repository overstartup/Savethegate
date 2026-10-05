// Permanent ARMORY upgrades — bought with coins from the main-menu Upgrades
// page (NOT the in-run coin shop). Every unit the player fights with — the
// Guardian, Ward Sprite, Cannon, Stone Wall, Bomb, Shield — has its own
// stats, each upgraded separately. Costs grow EXPONENTIALLY per level
// (base × growth^level), so early levels are cheap but a truly strong
// character takes a lot of coins — earned slowly in play, or bought in the
// coin shop.
//
// Storage: the Guardian's levels live in saveData.permanent (keys power /
// speed / fireRate kept from older saves, + blood); every other unit lives
// in saveData.units[unitKey][statKey].
//
// per  = bonus per level. fmt 'pct' → +per×level as a percentage
//        multiplier; 'add' → +per×level in `unit` (e.g. hits, seconds).

export const UPGRADE_MAX = 20;

export const UNITS = {
  hero: {
    name: 'GUARDIAN', role: 'Your hero — fires on its own', color: '#ffd23d',
    stats: {
      power:    { label: 'POWER',     desc: 'Bolt damage',      per: 0.15, fmt: 'pct', base: 40, growth: 1.35, max: 20 },
      fireRate: { label: 'HASTE',     desc: 'Shots per second', per: 0.08, fmt: 'pct', base: 45, growth: 1.35, max: 20 },
      blood:    { label: 'VITALITY',  desc: 'Blood line (HP)',  per: 0.15, fmt: 'pct', base: 35, growth: 1.35, max: 20 },
      speed:    { label: 'SWIFTNESS', desc: 'Flying speed',     per: 0.08, fmt: 'pct', base: 30, growth: 1.4,  max: 10 },
    },
  },
  angel: {
    name: 'WARD SPRITE', role: 'Flies beside you and shoots', color: '#9ae6ff',
    stats: {
      power:    { label: 'POWER',  desc: 'Bolt damage',        per: 0.25, fmt: 'pct', base: 60, growth: 1.38, max: 15 },
      fireRate: { label: 'HASTE',  desc: 'Shots per second',   per: 0.12, fmt: 'pct', base: 60, growth: 1.38, max: 15 },
      blood:    { label: 'GUARD',  desc: 'Bullets it can soak', per: 1, fmt: 'add', unit: ' hits', base: 80, growth: 1.55, max: 8 },
    },
  },
  turret: {
    name: 'CANNON', role: 'Placed turret, fires on its own', color: '#ffd88a',
    stats: {
      power:    { label: 'POWER', desc: 'Shot damage',      per: 0.25, fmt: 'pct', base: 70, growth: 1.38, max: 15 },
      fireRate: { label: 'HASTE', desc: 'Shots per second', per: 0.10, fmt: 'pct', base: 70, growth: 1.38, max: 15 },
      hp:       { label: 'ARMOR', desc: 'Cannon health',    per: 0.25, fmt: 'pct', base: 55, growth: 1.38, max: 15 },
    },
  },
  wall: {
    name: 'STONE WALL', role: 'Blocks the lane', color: '#c8a06a',
    stats: {
      hp:     { label: 'STONE',  desc: 'Wall health',             per: 0.25, fmt: 'pct', base: 45, growth: 1.38, max: 15 },
      thorns: { label: 'THORNS', desc: 'Damage to foes touching it', per: 0.30, fmt: 'pct', base: 50, growth: 1.38, max: 15 },
    },
  },
  bomb: {
    name: 'BOMB', role: 'Blasts the nearest foes', color: '#ff8a3d',
    stats: {
      power: { label: 'BLAST', desc: 'Blast power', per: 0.20, fmt: 'pct', base: 50, growth: 1.4, max: 15 },
    },
  },
  shield: {
    name: 'SHIELD', role: 'Blocks all enemy bullets', color: '#7fd8ff',
    stats: {
      duration: { label: 'DURATION', desc: 'Shield time', per: 1.5, fmt: 'add', unit: 's', base: 45, growth: 1.4, max: 12 },
    },
  },
};

export const UNIT_ORDER = ['hero', 'angel', 'turret', 'wall', 'bomb', 'shield'];

export function unitLevel(save, unit, stat) {
  if (unit === 'hero') return save.permanent?.[stat] || 0;
  return save.units?.[unit]?.[stat] || 0;
}

export function setUnitLevel(save, unit, stat, level) {
  if (unit === 'hero') { save.permanent[stat] = level; return; }
  save.units = save.units || {};
  save.units[unit] = { ...(save.units[unit] || {}), [stat]: level };
}

// Exponential cost curve, rounded to a friendly multiple of 5.
export function statCost(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  return Math.round((s.base * Math.pow(s.growth, level)) / 5) * 5;
}

// Multiplier (pct) or flat bonus (add) at a given level.
export function statBonus(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  return s.fmt === 'pct' ? 1 + s.per * level : s.per * level;
}

export function statLabel(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  if (s.fmt === 'pct') return `+${Math.round(s.per * level * 100)}%`;
  const v = +(s.per * level).toFixed(1);
  return `+${v}${s.unit || ''}`;
}

// All of one unit's levels as a plain object (for entity constructors).
export function unitStats(save, unit) {
  const out = {};
  for (const stat in UNITS[unit].stats) out[stat] = unitLevel(save, unit, stat);
  return out;
}

export function unitTotalLevel(save, unit) {
  let t = 0;
  for (const stat in UNITS[unit].stats) t += unitLevel(save, unit, stat);
  return t;
}
