import { tr } from '../i18n.js';
// Permanent ARMORY upgrades — bought with coins from the main-menu Upgrades
// page (NOT the in-run coin shop). Every unit the player fights with — the
// Guardian, Ward Sprite, Gun, Stone Wall, Bomb, Shield — has its own stats,
// each upgraded separately.
//
// RANKS: a unit's stats can each be raised RANK_STEP levels per rank. Once
// every stat of a unit reaches its rank's cap, the unit ranks up and all of
// its caps rise by RANK_STEP — with no final limit, so the game can keep
// growing. Costs climb steadily (statCost), so strength still takes more
// and more coins (earned in play, or bought in the coin shop).
//
// Storage: the Guardian's levels live in saveData.permanent (keys power /
// speed / fireRate kept from older saves, + blood, xp); every other unit
// lives in saveData.units[unitKey][statKey]. The rank is derived from the
// levels, so nothing extra is stored.
//
// per  = bonus per level. fmt 'pct' → +per×level as a percentage
//        multiplier; 'add' → +per×level in `unit` (e.g. hits, seconds).

export const RANK_STEP = 5;

export const UNITS = {
  hero: {
    get name() { return tr('d.unit.guardian'); }, get role() { return tr('d.role.hero'); }, color: '#ffd23d',
    stats: {
      power:    { get label() { return tr('d.stat.power'); },     get desc() { return tr('d.desc.bolt_damage'); },      per: 0.15, fmt: 'pct', base: 40 },
      fireRate: { get label() { return tr('d.stat.haste'); },     get desc() { return tr('d.desc.shots_per_second'); }, per: 0.08, fmt: 'pct', base: 45 },
      blood:    { get label() { return tr('d.stat.vitality'); },  get desc() { return tr('d.desc.blood_line_life'); }, per: 0.15, fmt: 'pct', base: 35 },
      speed:    { get label() { return tr('d.stat.swiftness'); }, get desc() { return tr('d.desc.flying_speed'); },     per: 0.08, fmt: 'pct', base: 30 },
      xp:       { get label() { return tr('d.stat.wisdom'); },    get desc() { return tr('d.desc.xp_from_gems'); },     per: 0.08, fmt: 'pct', base: 40 },
    },
  },
  angel: {
    get name() { return tr('d.unit.ward_sprite'); }, get role() { return tr('d.role.angel'); }, color: '#9ae6ff',
    stats: {
      power:    { get label() { return tr('d.stat.power'); },   get desc() { return tr('d.desc.bolt_damage'); },         per: 0.25, fmt: 'pct', base: 60 },
      fireRate: { get label() { return tr('d.stat.haste'); },   get desc() { return tr('d.desc.shots_per_second'); },    per: 0.12, fmt: 'pct', base: 60 },
      blood:    { get label() { return tr('d.stat.guard'); },   get desc() { return tr('d.desc.bullets_it_can_soak'); }, per: 1, fmt: 'add', unitKey: 'd.fmt.hits', base: 80 },
      recover:  { get label() { return tr('d.stat.recover'); }, get desc() { return tr('d.desc.back_up_faster_when_knocked_out'); }, per: 0.15, fmt: 'pct', base: 55 },
    },
  },
  turret: {
    get name() { return tr('d.unit.gun'); }, get role() { return tr('d.role.turret'); }, color: '#ffd88a',
    stats: {
      power:    { get label() { return tr('d.stat.power'); }, get desc() { return tr('d.desc.shot_damage'); },      per: 0.25, fmt: 'pct', base: 70 },
      fireRate: { get label() { return tr('d.stat.haste'); }, get desc() { return tr('d.desc.shots_per_second'); }, per: 0.10, fmt: 'pct', base: 70 },
      hp:       { get label() { return tr('d.stat.armor'); }, get desc() { return tr('d.desc.gun_health'); },       per: 0.25, fmt: 'pct', base: 55 },
      range:    { get label() { return tr('d.stat.range'); }, get desc() { return tr('d.desc.aiming_distance'); },  per: 0.08, fmt: 'pct', base: 50 },
    },
  },
  wall: {
    get name() { return tr('d.unit.stone_wall'); }, get role() { return tr('d.role.wall'); }, color: '#c8a06a',
    stats: {
      hp:     { get label() { return tr('d.stat.stone'); },  get desc() { return tr('d.desc.wall_health'); },                per: 0.25, fmt: 'pct', base: 45 },
      thorns: { get label() { return tr('d.stat.thorns'); }, get desc() { return tr('d.desc.damage_to_foes_touching_it'); }, per: 0.30, fmt: 'pct', base: 50 },
      width:  { get label() { return tr('d.stat.width'); },  get desc() { return tr('d.desc.covers_more_of_the_lane'); },    per: 0.06, fmt: 'pct', base: 45 },
    },
  },
  bomb: {
    get name() { return tr('d.unit.bomb'); }, get role() { return tr('d.role.bomb'); }, color: '#ff8a3d',
    stats: {
      power: { get label() { return tr('d.stat.blast'); }, get desc() { return tr('d.desc.blast_power'); }, per: 0.20, fmt: 'pct', base: 50 },
    },
  },
  shield: {
    get name() { return tr('d.unit.shield'); }, get role() { return tr('d.role.shield'); }, color: '#7fd8ff',
    stats: {
      duration: { get label() { return tr('d.stat.duration'); }, get desc() { return tr('d.desc.shield_time'); }, per: 1.5, fmt: 'add', unitKey: 'd.fmt.sec', base: 45 },
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

// Rank 1, 2, 3 … — goes up once every stat has reached the current cap.
export function unitRank(save, unit) {
  let lowest = Infinity;
  for (const stat in UNITS[unit].stats) lowest = Math.min(lowest, unitLevel(save, unit, stat));
  return 1 + Math.floor(lowest / RANK_STEP);
}

// Highest level any stat may reach at the unit's current rank.
export const rankCap = (save, unit) => unitRank(save, unit) * RANK_STEP;

// 0..1 — how far the unit is toward its next rank.
export function rankProgress(save, unit) {
  const floor = (unitRank(save, unit) - 1) * RANK_STEP;
  const stats = Object.keys(UNITS[unit].stats);
  let done = 0;
  for (const stat of stats) done += Math.min(RANK_STEP, unitLevel(save, unit, stat) - floor);
  return done / (stats.length * RANK_STEP);
}

// Steady climb with no ceiling: base × (1 + 0.35·level)², rounded to 5.
// e.g. base 40 → 40, 70, 115, 165 … ~800 at level 10, ~2.5k at level 20.
export function statCost(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  // x1.5: priced on the coin scale in config.js (economy) — the same
  // upgrade pace as before, now that levels pay more coins
  return Math.round((1.5 * s.base * Math.pow(1 + 0.35 * level, 2)) / 5) * 5;
}

// Multiplier (pct) or flat bonus (add) at a given level.
export function statBonus(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  return s.fmt === 'pct' ? 1 + s.per * level : s.per * level;
}

export function statLabel(unit, stat, level) {
  const s = UNITS[unit].stats[stat];
  // \u2066…\u2069 keeps "+15%" in that order inside right-to-left text
  if (s.fmt === 'pct') return `\u2066+${Math.round(s.per * level * 100)}%\u2069`;
  const v = +(s.per * level).toFixed(1);
  return s.unitKey ? tr(s.unitKey, { n: v }) : `\u2066+${v}\u2069`;
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
