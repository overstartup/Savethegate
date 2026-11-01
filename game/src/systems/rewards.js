// ============================================================
// Free rewards (the Rewards page): a 7-day login streak, a timed gift, a
// capped rewarded video, three daily missions and invite-a-friend. All
// state lives in saveData.rewards; amounts come from CONFIG.economy.
// Every claim returns the coins to credit (0 when nothing was due), and the
// caller adds them and saves.
// ============================================================
import { CONFIG } from '../config.js';
import { tr } from '../i18n.js';

const E = () => CONFIG.economy;
const DAY = 86400000;

// local-calendar day number (so "today" flips at the player's midnight)
const dayNum = (ms = Date.now()) => {
  const d = new Date(ms);
  return Math.floor((ms - d.getTimezoneOffset() * 60000) / DAY);
};

function R(save) {
  save.rewards = save.rewards || {};
  return save.rewards;
}

// ---- 7-day login streak ------------------------------------------------
// day: which calendar day (1..7) is up next; claimable: not yet taken today
export function loginStatus(save, now = Date.now()) {
  const r = R(save), today = dayNum(now);
  const claimedToday = r.loginDay === today;
  const continues = r.loginDay === today - 1 || claimedToday;
  const streak = continues ? (r.streak || 0) : 0;
  const nextIndex = claimedToday ? (streak - 1) % 7 : streak % 7;
  return { claimable: !claimedToday, index: nextIndex, streak, coins: E().dailyLogin[nextIndex] };
}

export function claimLogin(save, now = Date.now()) {
  const st = loginStatus(save, now);
  if (!st.claimable) return 0;
  const r = R(save);
  r.streak = st.streak + 1;
  r.loginDay = dayNum(now);
  return st.coins;
}

// ---- timed gift ---------------------------------------------------------
export function giftStatus(save, now = Date.now()) {
  const r = R(save), wait = E().giftHours * 3600000;
  const left = Math.max(0, (r.giftAt || 0) + wait - now);
  return { ready: left === 0, msLeft: left, coins: E().giftCoins };
}

export function claimGift(save, now = Date.now()) {
  if (!giftStatus(save, now).ready) return 0;
  R(save).giftAt = now;
  return E().giftCoins;
}

// ---- rewarded video (daily cap) --------------------------------------
export function videoStatus(save, now = Date.now()) {
  const r = R(save), today = dayNum(now);
  const used = r.videoDay === today ? (r.videos || 0) : 0;
  const ladder = E().videoCoins;
  return { left: Math.max(0, ladder.length - used), coins: ladder[Math.min(used, ladder.length - 1)] };
}

export function noteVideoWatched(save, now = Date.now()) {
  const r = R(save), today = dayNum(now);
  if (r.videoDay !== today) { r.videoDay = today; r.videos = 0; }
  const ladder = E().videoCoins;
  const coins = ladder[Math.min(r.videos, ladder.length - 1)];
  r.videos++;
  return coins;
}

// ---- daily missions -----------------------------------------------------
export const MISSIONS = {
  kills:   { text: (n) => tr('p.mission.kills', { n }), goals: [150, 250, 400], coins: 100 },
  levels:  { text: (n) => tr('p.mission.levels', { n }), goals: [2, 3, 5], coins: 120 },
  boss:    { text: () => tr('p.mission.boss'), goals: [1], coins: 150 },
  helpers: { text: (n) => tr('p.mission.helpers', { n }), goals: [2, 4], coins: 80 },
  crits:   { text: (n) => tr('p.mission.crits', { n }), goals: [40, 80], coins: 80 },
};

// Today's missions — the same three all day, a fresh set tomorrow.
export function missions(save, now = Date.now()) {
  const r = R(save), today = dayNum(now);
  if (r.missionDay !== today || !Array.isArray(r.missions)) {
    let seed = today * 9301 + 49297;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const keys = Object.keys(MISSIONS);
    const pick = [];
    while (pick.length < Math.min(E().missionsPerDay, keys.length)) {
      const k = keys[Math.floor(rnd() * keys.length)];
      if (!pick.includes(k)) pick.push(k);
    }
    r.missionDay = today;
    r.missions = pick.map((key) => {
      const m = MISSIONS[key];
      return { key, goal: m.goals[Math.floor(rnd() * m.goals.length)], progress: 0, claimed: false };
    });
  }
  return r.missions;
}

export function trackMission(save, key, amount = 1) {
  for (const m of missions(save)) if (m.key === key && !m.claimed) m.progress = Math.min(m.goal, m.progress + amount);
}

export function missionText(m) { return MISSIONS[m.key].text(m.goal); }
export function missionCoins(m) { return MISSIONS[m.key].coins; }

export function claimMission(save, i) {
  const m = missions(save)[i];
  if (!m || m.claimed || m.progress < m.goal) return 0;
  m.claimed = true;
  return missionCoins(m);
}

// ---- invite codes ---------------------------------------------------------
// A short code derived from the server player id (no extra storage); the
// backend decodes it the same way (InviteCode in Program.cs).
export function inviteCode(playerId) {
  if (!playerId) return '';
  return 'G' + (playerId * 7919 + 12345).toString(36).toUpperCase();
}

// How many rewards are waiting (the badge on the home-screen gift button).
export function rewardsWaiting(save, now = Date.now()) {
  let n = 0;
  if (loginStatus(save, now).claimable) n++;
  if (giftStatus(save, now).ready) n++;
  for (const m of missions(save, now)) if (!m.claimed && m.progress >= m.goal) n++;
  if ((R(save).inviteCoins || 0) > 0) n++;
  return n;
}
