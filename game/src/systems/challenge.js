// ============================================================
// Daily Challenge — one special run per day, the same for everyone: a
// stage plus a twist, both picked from the date. Reached from the Rewards
// page (ui/challengeUi.js draws it, main.js runs it through the normal game
// loop with `state.dc` set). It never touches saveData.progress, the normal
// best score or the normal leaderboards; its own record lives in
// saveData.challenge = { day, best, plays }.
// ============================================================
import { CONFIG } from '../config.js';
import { STAGE_SIZE, STAGE_COUNT } from '../data/levels.js';
import { API_BASE_URL } from './backend.js';

// The twists. i18n keys: dc.twist.<key> (name) and dc.twist.<key>.info.
export const DC_TWISTS = ['bombs', 'speed', 'boss', 'glass', 'nolvl'];
// Which level of a stage each boss sits on (levels 4, 7, 10).
const DC_BOSS_LIS = [3, 6, 9];
// Only the first stages, so a newer player still has a fair shot.
const DC_STAGE_POOL = 4;

// The player's local calendar date, 'YYYY-MM-DD' (Western digits).
export function dcDayKey(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dcHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Today's run: { day, twist, stageIdx, levels: [levelIndex…] }
export function dcToday(now = Date.now()) {
  const day = dcDayKey(now);
  const h = dcHash('gatewall-daily-' + day);
  const twist = DC_TWISTS[h % DC_TWISTS.length];
  const stageIdx = Math.floor(h / 7) % Math.min(DC_STAGE_POOL, STAGE_COUNT);
  const n = CONFIG.economy.challenge.levels;
  const base = stageIdx * STAGE_SIZE;
  let levels;
  if (twist === 'boss') levels = DC_BOSS_LIS.slice(0, n).map((l) => base + l);
  else {
    const start = Math.floor(h / 131) % 3; // level 1, 2 or 3 of the stage
    levels = Array.from({ length: n }, (_, i) => base + start + i);
  }
  return { day, twist, stageIdx, levels };
}

function dcRec(save, day) {
  if (!save.challenge || save.challenge.day !== day) save.challenge = { day, best: 0, plays: 0 };
  return save.challenge;
}

// What the Rewards card / results screen need about today.
export function dcStatus(save, now = Date.now()) {
  const today = dcToday(now);
  const r = save.challenge && save.challenge.day === today.day ? save.challenge : { best: 0, plays: 0 };
  return { ...today, best: r.best || 0, plays: r.plays || 0 };
}

// A finished run: updates today's record and returns the reward.
// { coins, first, newBest, prevBest, best }
export function dcRecordResult(save, day, score) {
  const E = CONFIG.economy.challenge;
  const r = dcRec(save, day);
  const first = (r.plays || 0) === 0;
  const prevBest = r.best || 0;
  const newBest = score > prevBest;
  let coins = 0;
  if (first) coins += E.first;
  else if (newBest) coins += E.beatBest;
  r.plays = (r.plays || 0) + 1;
  if (newBest) r.best = score;
  return { coins, first, newBest, prevBest, best: r.best };
}

// ---- in-run twist hooks (called from main.js) ----------------------------
// Sets up a fresh run (state from newGame) as today's challenge.
export function dcApplyStart(st, today) {
  st.dc = { day: today.day, twist: today.twist, levels: today.levels, step: 0 };
  if (today.twist === 'glass') st.lives = 1;
  if (today.twist === 'nolvl' && st.run) { st.run.bonus = 0; st.run.need = Infinity; st.run.choices = null; }
}

// True when the twist locks this buy-row helper.
export function dcLocked(st, key) {
  return !!(st && st.dc && st.dc.twist === 'bombs' && key !== 'bomb' && key !== 'watchAd' && key !== 'shop' && key !== 'pause');
}

// Game-speed factor for this frame.
export function dcSpeed(st) { return st && st.dc && st.dc.twist === 'speed' ? 2 : 1; }

// Hearts the gate gets back on a level clear (normal: +1).
export function dcHeartBack(st, lives) {
  if (st && st.dc && st.dc.twist === 'glass') return Math.min(1, lives);
  return Math.min(CONFIG.gateHealth, lives + 1);
}

// Is the current level the challenge's last?
export function dcIsLast(st) { return !!st.dc && st.dc.step >= st.dc.levels.length - 1; }

// The level that follows the current one (challenge order or just +1).
export function dcNextIndex(st) {
  if (!st.dc) return st.levelIndex + 1;
  return st.dc.levels[Math.min(st.dc.levels.length - 1, st.dc.step + 1)];
}

// ---- ranking (backend) ------------------------------------------------------
// Offline-safe: any failure resolves to null and the UI shows the local best.
async function dcRequest(path, opts = {}) {
  if (typeof fetch !== 'function') return null;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, signal: ctrl?.signal, ...opts });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Today's top list: { day, status: 'loading' | 'ready' | 'offline', rows }
export const dcBoard = { day: '', status: 'offline', rows: [] };

export function dcLoadTop(day) {
  dcBoard.day = day;
  dcBoard.status = 'loading';
  return dcRequest(`/api/challenge/top?day=${encodeURIComponent(day)}&count=10`).then((rows) => {
    if (dcBoard.day !== day) return;
    if (Array.isArray(rows)) { dcBoard.rows = rows; dcBoard.status = 'ready'; }
    else { dcBoard.rows = []; dcBoard.status = 'offline'; }
  });
}

export function dcSubmit(playerId, day, score) {
  if (!playerId) return dcLoadTop(day).then(() => null);
  return dcRequest('/api/challenge/score', { method: 'POST', body: JSON.stringify({ playerId, day, score }) })
    .then((r) => { dcLoadTop(day); return r; });
}
