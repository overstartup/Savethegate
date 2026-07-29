// ============================================================
// Backend sync — talks to the Landgate .NET API (CrystalGate.Api)
// so the "TOP RANKS" screen shows a real cross-device leaderboard
// instead of only runs played on this one phone.
//
// Every call here is fire-and-forget-safe: if the API is unreachable
// (offline, backend not deployed yet, request times out) every
// function just resolves to `null` and the caller falls back to the
// on-device data. The game never blocks or breaks because of this.
//
// TODO: swap API_BASE_URL for your real deployed backend URL before
// publishing — this placeholder points at nothing reachable yet
// (same "fill in before shipping" pattern as PRIVACY_URL in
// ui/screens.js). Until then, all backend calls simply fail closed.
// ============================================================

export const API_BASE_URL = 'https://api.turtoo.app';

const TIMEOUT_MS = 6000;
const DEVICE_ID_KEY = 'crystalgate-device-id';

async function request(path, opts = {}) {
  if (typeof fetch !== 'function') return null; // very old WebView — treat as offline
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl?.signal,
      ...opts,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // offline, DNS failure, backend not deployed, CORS, timeout — all treated the same
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// A stable per-install id so the same phone always maps back to the
// same server-side Player row across app restarts.
function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev-anon'; // localStorage unavailable — degrade gracefully, no crash
  }
}

export const backend = {
  // Registers this device (idempotent — same DeviceId always returns the
  // same player). Returns { id, name, email, recoveryCode, coins, ... } or null.
  async register(name, email) {
    return request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify({ deviceId: getDeviceId(), name, email }),
    });
  },

  // Pushes local progress up so the leaderboard/admin panel stay current.
  async sync(playerId, patch) {
    if (!playerId) return null;
    return request(`/api/players/${playerId}/sync`, { method: 'PUT', body: JSON.stringify(patch) });
  },

  async getProfile(playerId) {
    if (!playerId) return null;
    return request(`/api/players/${playerId}`);
  },

  // Reclaims an existing account on a new device using its recovery code.
  async recover(recoveryCode) {
    return request('/api/players/recover', {
      method: 'POST',
      body: JSON.stringify({ recoveryCode, deviceId: getDeviceId() }),
    });
  },

  async submitScore(playerId, score, stageReached) {
    if (!playerId) return null;
    return request('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ playerId, score, stageReached }),
    });
  },

  // Global top-N across ALL players (not just this device).
  async topLeaderboard(count = 20) {
    return request(`/api/leaderboard/top?count=${count}`);
  },
};
