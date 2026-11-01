// ============================================================
// Languages — English, German, Arabic, Persian.
//   tr('key', { n: 5 })  → the text in the current language, with {n}
//                          replaced. Falls back to English, then the key.
// The words live in src/lang/*.js, one entry per key with all four
// languages side by side: { en: 'PLAY', de: 'SPIELEN', ar: '…', fa: '…' }.
// Arabic and Persian draw right-to-left (main.js sets ctx.direction); the
// screen layout itself is not mirrored.
// ============================================================
import { STR_COMMON } from './lang/common.js';
import { STR_MENUS } from './lang/menus.js';
import { STR_PAGES } from './lang/pages.js';
import { STR_GAME } from './lang/game.js';
import { STR_DATA } from './lang/data.js';
import { STR_BOSSES } from './lang/bosses.js';
import { STR_STAGEFX } from './lang/stagefx.js';
import { STR_TUTORIAL } from './lang/tutorial.js';
import { STR_ARMORY2 } from './lang/armory2.js';
import { STR_STARS } from './lang/stars.js';
import { STR_CHALLENGE } from './lang/challenge.js';

export const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'fa', name: 'فارسی' },
];

const I18N_TABLE = Object.assign({}, STR_COMMON, STR_MENUS, STR_PAGES, STR_GAME, STR_DATA,
  STR_BOSSES, STR_STAGEFX, STR_TUTORIAL, STR_ARMORY2, STR_STARS, STR_CHALLENGE);
let curLang = 'en';

// The phone's language if we have it, else English.
export function deviceLang() {
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
  const code = nav.toLowerCase().slice(0, 2);
  return LANGS.some((l) => l.code === code) ? code : 'en';
}

export function setLang(code) {
  curLang = LANGS.some((l) => l.code === code) ? code : 'en';
  // Only the page language: the overlay sets its own dir, and the page
  // itself stays ltr so the canvas doesn't shift.
  if (typeof document !== 'undefined') document.documentElement.lang = curLang;
}

export function getLang() { return curLang; }
export function isRtl() { return curLang === 'ar' || curLang === 'fa'; }

export function tr(key, vars) {
  const e = I18N_TABLE[key];
  let s = e ? (e[curLang] ?? e.en) : key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

// Shrinks a canvas font until `str` fits in maxW (German words run long).
// Takes and returns a font string like `18px "Luckiest Guy", …`.
export function fitFont(ctx, str, font, maxW) {
  ctx.font = font;
  const w = ctx.measureText(str).width;
  if (w <= maxW) return font;
  const m = font.match(/^(\d+(?:\.\d+)?)px(.*)$/);
  if (!m) return font;
  const size = Math.max(7, Math.floor(parseFloat(m[1]) * maxW / w));
  return `${size}px${m[2]}`;
}
