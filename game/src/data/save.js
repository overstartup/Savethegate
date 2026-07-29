// localStorage save/load. Keep the schema versioned from day one.
const KEY = 'spellstorm-save-v1';

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    const d = defaults();
    if (!raw) return d;
    // Deep-merge so saves from before a schema change (new fields) still
    // come back with sane defaults instead of undefined.
    return {
      ...d,
      ...raw,
      permanent: { ...d.permanent, ...(raw.permanent || {}) },
      leaderboard: Array.isArray(raw.leaderboard) ? raw.leaderboard : d.leaderboard,
      progress: { ...d.progress, ...(raw.progress || {}) },
      settings: { ...d.settings, ...(raw.settings || {}) },
    };
  } catch {
    return defaults();
  }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// Records a finished run into the on-device Top Guardians list (capped at
// 20, sorted best-first). This is a LOCAL leaderboard — it only ranks runs
// played on this device. A real cross-device "all players" ranking needs a
// backend (Google Play Games Services is the natural next step once the
// Android app is published) — see the leaderboard screen note in screens.js.
export function submitScore(saveData, { name, score, stage }) {
  const list = Array.isArray(saveData.leaderboard) ? saveData.leaderboard : [];
  list.push({ name: (name || 'Guardian').slice(0, 14), score, stage, date: Date.now() });
  list.sort((a, b) => b.score - a.score);
  saveData.leaderboard = list.slice(0, 20);
  return saveData.leaderboard;
}

function defaults() {
  return {
    coins: 0,
    playerName: '',
    // Permanent meta-upgrades, bought with coins from the main-menu Upgrades
    // screen (separate from the in-run coin shop). Each is a level 0..UPGRADE_MAX
    // (see data/upgrades.js) that persists across every run.
    permanent: { power: 0, speed: 0, fireRate: 0 },
    stickers: [],          // monster ids collected
    streak: { wins: 0, losses: 0 },  // for adaptive difficulty
    leaderboard: [],        // top local runs: { name, score, stage, date }
    // Furthest level the player has reached (0-based index into LEVELS).
    // Only advances on a successful level clear — losing a run does NOT
    // roll this back, so "Continue" always picks up from the furthest point
    // reached rather than restarting from Level 1 every time.
    progress: { levelIndex: 0 },
    settings: { muted: false },
    removeAds: false,   // set true once the "Remove Ads" IAP is purchased
    playerId: null,     // server-side Player.Id once this device has registered with the backend
    recoveryCode: '',   // human-typeable code from the server, for recovering this account on a new device
  };
}
