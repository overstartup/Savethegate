// Permanent Guardian upgrades — bought with coins from the main-menu Upgrades
// screen (NOT the in-run coin shop). Each level is permanent and persists
// across every run via saveData.permanent. This is how the player gets
// stronger over time: more damage to down tougher Shatterlings, more speed
// to dodge enemy fire, and faster casting.
export const UPGRADE_MAX = 5;

export const UPGRADES = {
  power:    { label: 'POWER',     tagline: 'Hit harder — down tougher Shatterlings.', baseCost: 40, costStep: 25, color: '#ff8a3d', perLevel: '+1 dmg' },
  speed:    { label: 'SWIFTNESS', tagline: 'Move faster to dodge enemy fire.',        baseCost: 35, costStep: 20, color: '#58e07f', perLevel: '+8% speed' },
  fireRate: { label: 'HASTE',     tagline: 'Cast spells more often.',                 baseCost: 45, costStep: 25, color: '#7fd8ff', perLevel: '+8% cast rate' },
};

export function upgradeCost(key, level) {
  const u = UPGRADES[key];
  return u.baseCost + level * u.costStep;
}
