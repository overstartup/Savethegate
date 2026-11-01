// Web Audio synth — no sound files needed. Everything is synthesised live:
//  • SFX: layered oscillators + filtered noise bursts with pitch envelopes,
//    slight random detune, per-cue voice limits, a shared reverb send.
//  • Music: a tiny lookahead sequencer (bass / pad / arp / lead / perc), one
//    procedural loop per stage theme, crossfaded on change, ducked under big
//    SFX and quieter while paused.
//  • Bus: sfx + music → compressor/limiter → master (mute = master gain 0).
// All internal top-level names are prefixed `au` (the standalone build
// concatenates every module into one script).
let audioCtx = null;
let unlocked = false;
let muted = false;

let auMaster = null, auComp = null, auSfx = null;
let auVerbLo = null, auVerbHi = null;
let auMusicBus = null, auMusicDuck = null, auMusicQuiet = null;
let auEchoIn = null, auEchoDelay = null;
let auNoiseBuf = null;
let auLive = 0;          // live source nodes (debug / node-count check)
let auMade = 0;          // total sources ever created
const AU_MAX_LIVE = 120;  // hard ceiling — beyond this, non-critical sfx are dropped

function auCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      auBuildGraph(audioCtx);
    } catch (err) {
      console.warn('[audio] AudioContext could not be created:', err);
      audioCtx = null;
      return null;
    }
  }
  if (audioCtx.state === 'suspended' && unlocked && !document.hidden) {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function auBuildGraph(a) {
  auMaster = a.createGain();
  auMaster.gain.value = muted ? 0 : 0.9;
  auMaster.connect(a.destination);

  auComp = a.createDynamicsCompressor();
  auComp.threshold.value = -16;
  auComp.knee.value = 8;
  auComp.ratio.value = 10;
  auComp.attack.value = 0.002;
  auComp.release.value = 0.18;
  auComp.connect(auMaster);

  auSfx = a.createGain();
  auSfx.gain.value = 0.85;
  auSfx.connect(auComp);

  // shared noise buffer (1 s white noise), sliced at random offsets
  const len = Math.floor(a.sampleRate * 1);
  auNoiseBuf = a.createBuffer(1, len, a.sampleRate);
  const nd = auNoiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

  // shared reverb: generated stereo impulse (exp-decaying noise, darkening)
  const conv = a.createConvolver();
  const ilen = Math.floor(a.sampleRate * 1.3);
  const imp = a.createBuffer(2, ilen, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = imp.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < ilen; i++) {
      const k = i / ilen;
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - k * 0.4); // gets darker as it decays
      d[i] = lp * Math.pow(1 - k, 2.6) * (i < 60 ? i / 60 : 1);
    }
  }
  conv.buffer = imp;
  const verbOut = a.createGain();
  verbOut.gain.value = 0.5;
  conv.connect(verbOut).connect(auComp);
  auVerbLo = a.createGain(); auVerbLo.gain.value = 0.18; auVerbLo.connect(conv);
  auVerbHi = a.createGain(); auVerbHi.gain.value = 0.45; auVerbHi.connect(conv);

  // music chain: bus → duck → quiet → comp
  auMusicBus = a.createGain(); auMusicBus.gain.value = 0.5;
  auMusicDuck = a.createGain(); auMusicDuck.gain.value = 1;
  auMusicQuiet = a.createGain(); auMusicQuiet.gain.value = auMusicQuietOn ? 0.3 : 1;
  auMusicBus.connect(auMusicDuck).connect(auMusicQuiet).connect(auComp);
  auMusicBus.connect(auVerbLo);

  // music echo (tempo-synced feedback delay, darkened in the loop)
  auEchoIn = a.createGain(); auEchoIn.gain.value = 0.5;
  auEchoDelay = a.createDelay(1.5); auEchoDelay.delayTime.value = 0.36;
  const fb = a.createGain(); fb.gain.value = 0.32;
  const efl = a.createBiquadFilter(); efl.type = 'lowpass'; efl.frequency.value = 2600;
  auEchoIn.connect(auEchoDelay);
  auEchoDelay.connect(efl).connect(fb).connect(auEchoDelay);
  efl.connect(auMusicBus);
}

// ---- helpers ------------------------------------------------------------
const auMidi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const auRnd = (c = 0.04) => 1 + (Math.random() * 2 - 1) * c;
function auNoop() {}

function auTrack(src) {
  auLive++; auMade++;
  src.onended = () => { auLive--; };
}

// One oscillator voice with pitch + amp envelopes.
// o: { type, f0, f1, pdur, dur, vol, att, out, verb ('lo'|'hi'), detune, hold }
function auOsc(a, t, o) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(Math.max(20, o.f0), t);
  if (o.f1 && o.f1 !== o.f0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.pdur || o.dur));
  }
  if (o.detune) osc.detune.value = o.detune;
  const att = o.att ?? 0.003;
  const vol = o.vol ?? 0.1;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  if (o.hold) g.gain.setValueAtTime(vol, t + att + o.hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g);
  g.connect(o.out || auSfx);
  if (o.verb === 'hi') g.connect(auVerbHi);
  else if (o.verb === 'lo') g.connect(auVerbLo);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
  auTrack(osc);
  return osc;
}

// One filtered-noise burst. o: { dur, vol, ft, f0, f1, q, att, out, verb }
function auNoise(a, t, o) {
  const src = a.createBufferSource();
  src.buffer = auNoiseBuf;
  const f = a.createBiquadFilter();
  f.type = o.ft || 'bandpass';
  f.frequency.setValueAtTime(o.f0 || 1000, t);
  if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = a.createGain();
  const att = o.att ?? 0.002;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.1, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g);
  g.connect(o.out || auSfx);
  if (o.verb === 'hi') g.connect(auVerbHi);
  else if (o.verb === 'lo') g.connect(auVerbLo);
  const dur = Math.min(o.dur + 0.02, 0.98);
  src.start(t, Math.random() * (0.99 - dur), dur);
  auTrack(src);
  return src;
}

// Per-cue voice limiting: at most `max` overlapping voices and a minimum
// gap between triggers. Voices are counted by their scheduled end times —
// no timers needed.
const auVoices = {};
function auPlay(name, max, gap, len, fn, critical = false) {
  if (muted) return;
  try {
    const a = auCtx();
    if (!a || a.state !== 'running') return;
    if (!critical && auLive > AU_MAX_LIVE) return;
    const now = a.currentTime;
    const v = auVoices[name] || (auVoices[name] = { ends: [], last: -1 });
    if (now - v.last < gap) return;
    let n = 0;
    for (let i = v.ends.length - 1; i >= 0; i--) {
      if (v.ends[i] <= now) v.ends.splice(i, 1); else n++;
    }
    if (n >= max) return;
    v.last = now;
    v.ends.push(now + len);
    fn(a, now + 0.005);
  } catch (err) {
    console.warn('[audio] ' + name + ' failed:', err);
  }
}

// Push the music down under a big sound, then let it swell back.
function auDuck(depth = 0.35, hold = 0.25, release = 0.7) {
  if (!audioCtx || !auMusicDuck) return;
  const t = audioCtx.currentTime;
  const g = auMusicDuck.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(Math.min(g.value, 1), t);
  g.linearRampToValueAtTime(depth, t + 0.04);
  g.setValueAtTime(depth, t + 0.04 + hold);
  g.linearRampToValueAtTime(1, t + 0.04 + hold + release);
}

// ---- music ----------------------------------------------------------------
const AU_SCALES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  phrygDom: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
};
// root = bass MIDI note. prog = scale degree of each bar's chord (4 bars).
// bass/arp: 16 steps per bar. bass chars R root, F fifth, O octave.
// arp digits index chord tones [root, 3rd, 5th, oct, oct+3rd].
// perc: layered 16-step strings (K kick, S snare, r soft snare, h hat,
// k clock tick, D/T hand drum, m tom, s shaker, * sparkle, b bubble).
const AU_THEMES = {
  menu:      { bpm: 72,  root: 38, scale: 'lydian',    prog: [0, 4, 5, 3], bass: 'R.......F.......', bassT: 'sine', pad: { type: 'sine', cut: 1500 },
               arp: '0..1..2..3..2...', arpT: 'triangle', arpOct: 24, bell: true, arpVol: 0.045, lead: { type: 'sine', oct: 24, dens: 0.18 }, perc: [], echo: 0.5 },
  sea:       { bpm: 80,  root: 41, scale: 'lydian',    prog: [0, 1, 0, 4], bass: 'R.......R...F...', bassT: 'sine', pad: { type: 'triangle', cut: 900 },
               arp: '0.1.2.3.2.1.0.1.', arpT: 'sine', arpOct: 24, bell: false, arpVol: 0.05, lead: { type: 'sine', oct: 24, dens: 0.22 }, perc: ['b.......b...b...'], echo: 0.6 },
  ice:       { bpm: 96,  root: 40, scale: 'ionian',    prog: [0, 5, 3, 4], bass: 'R...F...R...F...', bassT: 'triangle', pad: { type: 'sine', cut: 2400 },
               arp: '3.2.1.3.2.0.3.1.', arpT: 'sine', arpOct: 36, bell: true, arpVol: 0.04, lead: { type: 'triangle', oct: 24, dens: 0.3 }, perc: ['*...*...*...*.*.'], echo: 0.45 },
  desert:    { bpm: 100, root: 38, scale: 'phrygDom',  prog: [0, 1, 0, 6], bass: 'R..R..R.R..R..F.', bassT: 'triangle', pad: { type: 'sawtooth', cut: 650, vol: 0.5 },
               arp: null, lead: { type: 'triangle', oct: 24, dens: 0.5, vol: 0.075 }, perc: ['D..T..D.D..T.TT.'], echo: 0.3 },
  crystal:   { bpm: 92,  root: 45, scale: 'dorian',    prog: [0, 3, 6, 4], bass: 'R.....R...F.....', bassT: 'triangle', pad: { type: 'triangle', cut: 1600 },
               arp: '0.1.2.3.1.2.3.4.', arpT: 'sine', arpOct: 24, bell: true, arpVol: 0.04, lead: { type: 'sine', oct: 24, dens: 0.25 }, perc: ['K...........K...', '..........*.....'], echo: 0.45 },
  volcano:   { bpm: 132, root: 40, scale: 'phrygian',  prog: [0, 0, 5, 1], bass: 'RRO.RRO.RRF.RRO.', bassT: 'sawtooth', bassCut: 520, pad: { type: 'sawtooth', cut: 800, vol: 0.55 },
               arp: null, lead: { type: 'square', oct: 24, dens: 0.38, vol: 0.05 }, perc: ['K.......K.K.....', '....S.......S...', '..h...h...h...h.'], echo: 0.2, percVol: 1 },
  aviary:    { bpm: 112, root: 43, scale: 'ionian',    prog: [0, 3, 1, 4], bass: 'R...F...R.R.F...', bassT: 'triangle', pad: { type: 'triangle', cut: 2000 },
               arp: '0.2.1.3.0.2.1.3.', arpT: 'triangle', arpOct: 24, bell: false, arpVol: 0.04, lead: { type: 'triangle', oct: 24, dens: 0.42 }, perc: ['s.s.s.s.s.s.s.s.'], echo: 0.3 },
  gloomwood: { bpm: 84,  root: 42, scale: 'aeolian',   prog: [0, 5, 2, 6], bass: 'R.......F...R...', bassT: 'sine', pad: { type: 'sine', cut: 1000 },
               arp: '0..2..1..3..2...', arpT: 'sine', arpOct: 24, bell: true, arpVol: 0.045, lead: { type: 'sine', oct: 24, dens: 0.2 }, perc: ['K...........K...'], echo: 0.55 },
  aether:    { bpm: 76,  root: 36, scale: 'lydian',    prog: [0, 4, 1, 5], bass: 'R...............', bassT: 'sine', pad: { type: 'triangle', cut: 1800 },
               arp: '0.1.2.3.4.3.2.1.', arpT: 'sine', arpOct: 36, bell: true, arpVol: 0.035, lead: { type: 'sine', oct: 24, dens: 0.15 }, perc: [], echo: 0.6 },
  clockwork: { bpm: 112, root: 36, scale: 'dorian',    prog: [0, 0, 3, 4], bass: 'R.R.F.R.R.R.F.O.', bassT: 'triangle', bassShort: true, pad: { type: 'square', cut: 1000, vol: 0.4 },
               arp: '0.1.2.1.0.1.2.1.', arpT: 'square', arpOct: 24, bell: false, arpVol: 0.025, arpShort: true, lead: { type: 'triangle', oct: 24, dens: 0.25 }, perc: ['k.k.k.k.k.k.k.k.', 'K.......K.......'], echo: 0.25 },
  spooky:    { bpm: 90,  root: 47, scale: 'harmMinor', prog: [0, 5, 3, 4], bass: 'R..R....F..F....', bassT: 'sine', pad: { type: 'triangle', cut: 900 },
               arp: '0..1.2..3..2.1..', arpT: 'sine', arpOct: 24, bell: false, arpVol: 0.055, arpShort: true, lead: { type: 'sine', oct: 24, dens: 0.25 }, perc: ['m.....m.....m.m.'], echo: 0.5 },
  castle:    { bpm: 100, root: 38, scale: 'aeolian',   prog: [0, 5, 6, 4], bass: 'R...R.R.F...F.F.', bassT: 'triangle', pad: { type: 'sawtooth', cut: 1100, vol: 0.55 },
               arp: null, lead: { type: 'square', oct: 24, dens: 0.36, vol: 0.045 }, perc: ['K.......K.......', '....S..r....S.rr'], echo: 0.25 },
  deepwood:  { bpm: 88,  root: 43, scale: 'dorian',    prog: [0, 3, 0, 6], bass: 'R.....F.....R...', bassT: 'triangle', pad: { type: 'triangle', cut: 1100 },
               arp: '0..1..2..3..2...', arpT: 'sine', arpOct: 24, bell: false, arpVol: 0.045, lead: { type: 'triangle', oct: 24, dens: 0.3 }, perc: ['D.....T.D..T....'], echo: 0.4, percVol: 0.6 },
};
// stage index (0-based, STAGE_THEMES order) → theme
const AU_STAGE_KEYS = ['sea', 'ice', 'desert', 'crystal', 'volcano', 'aviary', 'gloomwood', 'aether', 'clockwork', 'spooky', 'castle', 'deepwood'];
// decor name → theme (so setMusic(levelDef.decor) also works)
const AU_DECOR_KEYS = { bubbles: 'sea', snow: 'ice', sand: 'desert', crystals: 'crystal', embers: 'volcano', clouds: 'aviary',
  voidstars: 'aether', rain: 'clockwork', fireflies: 'spooky', banners: 'castle', spores: 'deepwood' };

let auMusicWant = null;      // requested theme key (null = silence)
let auMusicKey = null;       // theme actually playing
let auMusicQuietOn = false;
let auTracks = [];           // active tracks (≤2 while crossfading)
let auSeqTimer = null;
const AU_LOOKAHEAD = 0.22;

function auHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function auRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// scale degree → semitones above the theme root
function auDeg(th, d) {
  const sc = AU_SCALES[th.scale];
  const o = Math.floor(d / 7);
  return sc[((d % 7) + 7) % 7] + 12 * o;
}

// 4-bar melody phrase: on 8ths, chord tones on strong beats, steps between.
function auMakePhrase(th, rnd) {
  const steps = new Array(64).fill(null);
  let prev = 7; // degree around the octave
  for (let i = 0; i < 64; i += 2) {
    const bar = i >> 4;
    const strong = i % 8 === 0;
    const p = th.lead.dens * (strong ? 1.7 : 1) * (i >= 56 ? 0.4 : 1);
    if (i === 56) { steps[i] = { d: 7, len: 6 }; prev = 7; continue; } // resolve home
    if (rnd() > p) continue;
    let d;
    if (strong) {
      const root = th.prog[bar];
      const opts = [root, root + 2, root + 4, root + 7, root + 9];
      d = opts.reduce((b, x) => (Math.abs(x - prev) < Math.abs(b - prev) ? x : b), opts[0]);
      if (rnd() < 0.3) d = opts[Math.floor(rnd() * opts.length)];
    } else {
      d = prev + [-2, -1, -1, 1, 1, 2, 0][Math.floor(rnd() * 7)];
    }
    d = Math.max(2, Math.min(12, d));
    steps[i] = { d, len: rnd() < 0.5 ? 2 : (rnd() < 0.5 ? 4 : 3) };
    prev = d;
  }
  // a note never rings into the next one
  let lastIdx = -1;
  for (let i = 0; i < 64; i++) if (steps[i]) { if (lastIdx >= 0) steps[lastIdx].len = Math.min(steps[lastIdx].len, i - lastIdx); lastIdx = i; }
  return steps;
}

function auNewTrack(a, key) {
  const th = AU_THEMES[key];
  const rnd = auRng(auHash(key));
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(1, a.currentTime + 1.6);
  out.connect(auMusicBus);
  const padF = a.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = th.pad?.cut || 1200; padF.Q.value = 0.7;
  padF.connect(out);
  let bassOut = out;
  if (th.bassCut) { bassOut = a.createBiquadFilter(); bassOut.type = 'lowpass'; bassOut.frequency.value = th.bassCut; bassOut.Q.value = 3; bassOut.connect(out); }
  let leadOut = out;
  if (th.lead.type === 'square' || th.lead.type === 'sawtooth') { leadOut = a.createBiquadFilter(); leadOut.type = 'lowpass'; leadOut.frequency.value = 1800; leadOut.connect(out); }
  const echo = a.createGain(); echo.gain.value = th.echo || 0; echo.connect(auEchoIn);
  return {
    key, th, out, padF, bassOut, leadOut, echo,
    step: 0, next: a.currentTime + 0.08, sd: 60 / th.bpm / 4,
    phrases: [auMakePhrase(th, rnd), auMakePhrase(th, rnd)],
    endAt: Infinity,
  };
}

function auChordTones(tr, bar) {
  const th = tr.th, r = th.prog[bar];
  return [auDeg(th, r), auDeg(th, r + 2), auDeg(th, r + 4), auDeg(th, r) + 12, auDeg(th, r + 2) + 12];
}

function auPerc(a, t, ch, tr, i) {
  const pv = (tr.th.percVol ?? 0.8);
  const out = tr.out;
  switch (ch) {
    case 'K': auOsc(a, t, { f0: 150, f1: 42, pdur: 0.12, dur: 0.22, vol: 0.32 * pv, out }); break;
    case 'S': auNoise(a, t, { ft: 'bandpass', f0: 1900, q: 0.8, dur: 0.14, vol: 0.13 * pv, out });
              auOsc(a, t, { type: 'triangle', f0: 220, f1: 160, dur: 0.07, vol: 0.06 * pv, out }); break;
    case 'r': auNoise(a, t, { ft: 'bandpass', f0: 2200, q: 1, dur: 0.07, vol: 0.05 * pv, out }); break;
    case 'h': auNoise(a, t, { ft: 'highpass', f0: 7000, q: 0.7, dur: 0.035, vol: 0.06 * pv, out }); break;
    case 'k': auOsc(a, t, { type: 'sine', f0: (i % 4 === 0) ? 2100 : 1500, dur: 0.025, vol: 0.05 * pv, out });
              auNoise(a, t, { ft: 'highpass', f0: 5000, q: 1, dur: 0.012, vol: 0.06 * pv, out }); break;
    case 'D': auOsc(a, t, { f0: 120, f1: 70, pdur: 0.08, dur: 0.18, vol: 0.22 * pv, out }); break;
    case 'T': auNoise(a, t, { ft: 'bandpass', f0: 2600, q: 2.5, dur: 0.05, vol: 0.09 * pv, out });
              auOsc(a, t, { type: 'triangle', f0: 420, f1: 380, dur: 0.05, vol: 0.05 * pv, out }); break;
    case 'm': if (Math.random() < 0.8) auOsc(a, t, { f0: 150 * (Math.random() < 0.5 ? 1 : 0.75), f1: 85, pdur: 0.2, dur: 0.3, vol: 0.18 * pv, out }); break;
    case 's': auNoise(a, t, { ft: 'highpass', f0: 6500, q: 0.7, att: 0.015, dur: 0.06, vol: 0.035 * pv, out }); break;
    case '*': if (Math.random() < 0.55) auOsc(a, t, { f0: 2800 + Math.random() * 2200, dur: 0.12, vol: 0.022 * pv, out: tr.echo }); break;
    case 'b': if (Math.random() < 0.55) auOsc(a, t, { f0: 260 + Math.random() * 200, f1: 900 + Math.random() * 400, dur: 0.09, vol: 0.04 * pv, out }); break;
    default: break;
  }
}

function auPlayStep(a, tr, t) {
  const th = tr.th, sd = tr.sd;
  const s16 = tr.step % 16, bar = (tr.step >> 4) % 4, loop = tr.step >> 6;
  const root = th.root;
  const chord = auChordTones(tr, bar);

  // pad: one chord per bar (3 detuned voices → one envelope → track filter)
  if (s16 === 0 && th.pad) {
    const g = a.createGain();
    const len = sd * 16;
    const pv = 0.05 * (th.pad.vol ?? 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pv, t + len * 0.3);
    g.gain.setValueAtTime(pv, t + len * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
    g.connect(tr.padF);
    [0, 1, 2].forEach((k) => {
      const o = a.createOscillator();
      o.type = th.pad.type;
      o.frequency.value = auMidi(root + 12 + chord[k]);
      o.detune.value = (k - 1) * 7;
      o.connect(g); o.start(t); o.stop(t + len + 0.3); auTrack(o);
    });
  }

  // bass
  const bc = th.bass[s16];
  if (bc && bc !== '.') {
    let n = 1; while (n < 4 && th.bass[(s16 + n) % 16] === '.') n++;
    const semi = chord[0] + (bc === 'F' ? 7 : bc === 'O' ? 12 : 0);
    const len = th.bassShort ? sd * 0.9 : sd * n * 0.95;
    auOsc(a, t, { type: th.bassT, f0: auMidi(root + semi), dur: len + 0.06, vol: th.bassT === 'sine' ? 0.26 : 0.2, att: 0.006, hold: len * 0.4, out: tr.bassOut });
  }

  // arp
  if (th.arp) {
    const ac = th.arp[s16];
    if (ac && ac !== '.') {
      const f = auMidi(root + th.arpOct + chord[+ac]);
      const len = th.arpShort ? sd * 1.2 : sd * 2.2;
      const v = th.arpVol;
      auOsc(a, t, { type: th.arpT, f0: f, dur: len, vol: v, out: tr.out });
      if (th.bell) auOsc(a, t, { type: 'sine', f0: f * 2.01, dur: len * 0.6, vol: v * 0.35, out: tr.echo });
      else if (th.echo) auOsc(a, t, { type: 'sine', f0: f, dur: len * 0.5, vol: v * 0.4, out: tr.echo });
    }
  }

  // lead melody (silent on the first loop — an intro)
  if (loop > 0) {
    const ph = tr.phrases[loop % 2];
    const nt = ph[tr.step % 64];
    if (nt) {
      const L = th.lead;
      const f = auMidi(root + L.oct + auDeg(th, nt.d));
      const len = sd * nt.len;
      const v = L.vol ?? 0.065;
      auOsc(a, t, { type: L.type, f0: f, dur: len + 0.08, vol: v, att: 0.012, hold: len * 0.5, out: tr.leadOut });
      if (th.echo && nt.len >= 3) auOsc(a, t, { type: 'sine', f0: f, dur: len, vol: v * 0.5, att: 0.01, out: tr.echo });
    }
  }

  // percussion
  for (const layer of th.perc) {
    const pc = layer[s16];
    if (pc && pc !== '.') auPerc(a, t, pc, tr, s16);
  }
}

function auSeqTick() {
  const a = audioCtx;
  if (!a || muted || a.state !== 'running') return;
  const now = a.currentTime;
  for (const tr of auTracks) {
    if (tr.next < now - 0.15) tr.next = now + 0.05; // fell behind (tab hidden) — skip, don't burst
    let guard = 0;
    while (tr.next < now + AU_LOOKAHEAD && tr.next < tr.endAt && guard++ < 16) {
      try { auPlayStep(a, tr, tr.next); } catch (err) { console.warn('[audio] music step failed:', err); }
      const swing = (tr.step % 2 === 0) ? (tr.th.swing || 0) : -(tr.th.swing || 0);
      tr.next += tr.sd * (1 + swing);
      tr.step++;
    }
  }
  // drop tracks whose fade-out finished
  for (let i = auTracks.length - 1; i >= 0; i--) {
    const tr = auTracks[i];
    if (now > tr.endAt + 0.6) {
      try { tr.out.disconnect(); tr.echo.disconnect(); } catch { /* already gone */ }
      auTracks.splice(i, 1);
    }
  }
  if (!auTracks.length && auSeqTimer) { clearInterval(auSeqTimer); auSeqTimer = null; }
}

function auMusicApply() {
  const a = audioCtx;
  if (!a || !unlocked) return;
  const key = auMusicWant;
  if (key === auMusicKey) return;
  auMusicKey = key;
  const now = a.currentTime;
  for (const tr of auTracks) {
    if (tr.endAt !== Infinity) continue;
    tr.endAt = now + 1.4;
    tr.out.gain.cancelScheduledValues(now);
    tr.out.gain.setValueAtTime(Math.max(0.0001, tr.out.gain.value), now);
    tr.out.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  }
  if (key && AU_THEMES[key]) {
    const tr = auNewTrack(a, key);
    auEchoDelay.delayTime.setTargetAtTime(tr.sd * 3, now, 0.2);
    auTracks.push(tr);
  }
  if (auTracks.length && !auSeqTimer) auSeqTimer = setInterval(auSeqTick, 60);
}

function auResolveKey(k) {
  if (k === null || k === undefined || k === false) return null;
  if (typeof k === 'number') return AU_STAGE_KEYS[((k % AU_STAGE_KEYS.length) + AU_STAGE_KEYS.length) % AU_STAGE_KEYS.length];
  if (AU_THEMES[k]) return k;
  if (AU_DECOR_KEYS[k]) return AU_DECOR_KEYS[k];
  return 'menu';
}

// Battery: stop the clock entirely while the page is hidden.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!audioCtx || !unlocked) return;
    if (document.hidden) audioCtx.suspend().catch(() => {});
    else audioCtx.resume().catch(() => {});
  });
}

// ---- cue table ------------------------------------------------------------
let gemLastAu = 0, gemStreakAu = 0, auVictoryAt = -10;

const auApi = {
  // Call on first user input. Browsers only allow AudioContext to actually
  // produce sound after a real user gesture — this both creates the context
  // and nudges it out of "suspended".
  unlock() {
    if (unlocked) {
      if (audioCtx && audioCtx.state === 'suspended' && !document.hidden) audioCtx.resume().catch(() => {});
      return;
    }
    unlocked = true;
    const a = auCtx();
    if (a) {
      console.info('[audio] unlocked, context state:', a.state);
      auMusicApply();
    } else unlocked = false;
  },
  setMuted(v) {
    muted = !!v;
    if (audioCtx && auMaster) {
      const t = audioCtx.currentTime;
      auMaster.gain.cancelScheduledValues(t);
      auMaster.gain.value = muted ? 0 : 0.9;
      auMaster.gain.setValueAtTime(muted ? 0 : 0.9, t);
    }
  },
  isMuted() { return muted; },

  // Music: theme key ('menu', 'sea', 'ice', 'desert', 'crystal', 'volcano',
  // 'aviary', 'gloomwood', 'aether', 'clockwork', 'spooky', 'castle',
  // 'deepwood'), a stage index (0-based), a levelDef.decor name, or null
  // for silence. Same key again = no-op, so it is safe to call every frame.
  setMusic(k) {
    const key = auResolveKey(k);
    if (key === auMusicWant) return;
    auMusicWant = key;
    auMusicApply();
  },
  // Pause screens etc.: music drops to ~30 %.
  setMusicQuiet(q) {
    q = !!q;
    if (q === auMusicQuietOn) return;
    auMusicQuietOn = q;
    if (audioCtx && auMusicQuiet) auMusicQuiet.gain.setTargetAtTime(q ? 0.3 : 1, audioCtx.currentTime, 0.15);
  },
  duck(depth = 0.35, hold = 0.25) { auDuck(depth, hold); },
  // debug: live source nodes, total created, music state
  stats() {
    return { live: auLive, made: auMade, tracks: auTracks.length, music: auMusicKey, quiet: auMusicQuietOn,
      muted, state: audioCtx?.state || 'none', master: auMaster ? auMaster.gain.value : null };
  },

  // ---- gameplay cues ----
  // player shot — the most frequent sound in the game: short, soft, tight
  zap() {
    auPlay('zap', 4, 0.035, 0.08, (a, t) => {
      const r = auRnd(0.06);
      auOsc(a, t, { type: 'square', f0: 1250 * r, f1: 420 * r, dur: 0.065, vol: 0.022 });
      auOsc(a, t, { type: 'triangle', f0: 2400 * r, f1: 900, dur: 0.04, vol: 0.02 });
    });
  },
  // kill pop — combo raises the pitch
  pop(combo = 0) {
    auPlay('pop', 5, 0.022, 0.16, (a, t) => {
      const f = (240 + Math.min(combo, 24) * 24) * auRnd(0.05);
      auOsc(a, t, { type: 'sine', f0: f, f1: f * 2.3, pdur: 0.07, dur: 0.14, vol: 0.16, verb: 'lo' });
      auOsc(a, t, { type: 'triangle', f0: f * 3, f1: f * 1.4, dur: 0.06, vol: 0.05 });
      auNoise(a, t, { ft: 'bandpass', f0: 1800 * auRnd(0.15), q: 1.2, dur: 0.06, vol: 0.1 });
    });
  },
  // crystal shards breaking
  shatter() {
    auPlay('shatter', 4, 0.03, 0.22, (a, t) => {
      const f = 2300 + Math.random() * 1400;
      auOsc(a, t, { type: 'sine', f0: f, f1: f * 0.92, dur: 0.18, vol: 0.03, verb: 'hi' });
      auOsc(a, t + 0.015, { type: 'sine', f0: f * 1.47, f1: f * 1.3, dur: 0.12, vol: 0.022 });
      auNoise(a, t, { ft: 'highpass', f0: 4500, q: 0.8, dur: 0.07, vol: 0.06 });
    });
  },
  gateGood() {
    auPlay('gateGood', 3, 0.06, 0.45, (a, t) => {
      const r = auRnd(0.02);
      [0, 4, 7, 12].forEach((s, i) => {
        const f = auMidi(72 + s) * r;
        auOsc(a, t + i * 0.045, { type: 'triangle', f0: f, dur: 0.22, vol: 0.07, verb: 'hi' });
        auOsc(a, t + i * 0.045, { type: 'sine', f0: f * 2, dur: 0.14, vol: 0.025 });
      });
      auNoise(a, t, { ft: 'bandpass', f0: 2500, f1: 7000, q: 1.5, att: 0.05, dur: 0.25, vol: 0.03 });
    });
  },
  // error / "no" / curse
  gateCurse() {
    auPlay('gateCurse', 2, 0.08, 0.3, (a, t) => {
      const r = auRnd(0.03);
      auOsc(a, t, { type: 'square', f0: 330 * r, f1: 165 * r, dur: 0.26, vol: 0.045 });
      auOsc(a, t, { type: 'square', f0: 311 * r, f1: 155 * r, dur: 0.26, vol: 0.035 });
      auOsc(a, t, { type: 'sine', f0: 110, f1: 70, dur: 0.22, vol: 0.12 });
    });
  },
  // gate hit / heart lost — heavy crunch
  crack() {
    auPlay('crack', 3, 0.06, 0.45, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 140, f1: 38, pdur: 0.25, dur: 0.4, vol: 0.4 });
      auOsc(a, t, { type: 'sawtooth', f0: 95 * auRnd(), f1: 50, dur: 0.25, vol: 0.06 });
      auNoise(a, t, { ft: 'lowpass', f0: 2400, f1: 180, q: 0.8, dur: 0.42, vol: 0.32, verb: 'lo' });
      auNoise(a, t, { ft: 'bandpass', f0: 3200, q: 2, dur: 0.09, vol: 0.12 });
      auDuck(0.5, 0.15);
    }, true);
  },
  gameOver() {
    auPlay('gameOver', 1, 0.5, 2, (a, t) => {
      [67, 63, 60, 55].forEach((m, i) => {
        auOsc(a, t + i * 0.22, { type: 'triangle', f0: auMidi(m), f1: auMidi(m) * 0.985, dur: i === 3 ? 1.3 : 0.35, vol: 0.11, verb: 'hi' });
        auOsc(a, t + i * 0.22, { type: 'sine', f0: auMidi(m - 12), dur: i === 3 ? 1.3 : 0.3, vol: 0.06 });
      });
      auOsc(a, t, { type: 'sawtooth', f0: 55, f1: 41, dur: 1.8, vol: 0.05, att: 0.3 });
      auDuck(0.1, 1.5, 1.2);
    }, true);
  },
  waveUp() {
    auPlay('waveUp', 1, 0.2, 0.5, (a, t) => {
      auNoise(a, t, { ft: 'bandpass', f0: 400, f1: 3500, q: 2, att: 0.15, dur: 0.4, vol: 0.09 });
      auOsc(a, t + 0.08, { type: 'triangle', f0: auMidi(74), dur: 0.18, vol: 0.07, verb: 'hi' });
      auOsc(a, t + 0.18, { type: 'triangle', f0: auMidi(81), dur: 0.3, vol: 0.07, verb: 'hi' });
    });
  },
  enemyShot() {
    auPlay('enemyShot', 3, 0.045, 0.1, (a, t) => {
      const r = auRnd(0.08);
      auOsc(a, t, { type: 'triangle', f0: 260 * r, f1: 110 * r, dur: 0.09, vol: 0.05 });
      auNoise(a, t, { ft: 'bandpass', f0: 900 * r, q: 2, dur: 0.06, vol: 0.04 });
    });
  },
  // enemy bullet chips a blood line (no heart lost yet)
  grazed() {
    auPlay('grazed', 2, 0.06, 0.12, (a, t) => {
      auOsc(a, t, { type: 'square', f0: 210 * auRnd(), f1: 90, dur: 0.1, vol: 0.05 });
      auOsc(a, t, { type: 'sine', f0: 120, f1: 60, dur: 0.12, vol: 0.18 });
      auNoise(a, t, { ft: 'bandpass', f0: 1400, q: 1.2, dur: 0.07, vol: 0.1 });
    });
  },
  // Gem pickups rise in pitch while collected in quick succession.
  gem() {
    const now = performance.now();
    if (now - gemLastAu < 45) return;
    gemStreakAu = now - gemLastAu < 400 ? Math.min(gemStreakAu + 1, 16) : 0;
    gemLastAu = now;
    auPlay('gem', 4, 0.04, 0.12, (a, t) => {
      const f = auMidi(84 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36, 38][gemStreakAu] * 0.5);
      auOsc(a, t, { type: 'sine', f0: f, f1: f * 1.02, dur: 0.1, vol: 0.05 });
      auOsc(a, t, { type: 'sine', f0: f * 2.76, dur: 0.05, vol: 0.015 });
    });
  },
  levelUp() {
    auPlay('levelUp', 1, 0.3, 0.8, (a, t) => {
      [72, 76, 79, 84].forEach((m, i) => {
        auOsc(a, t + i * 0.07, { type: 'triangle', f0: auMidi(m), dur: 0.28, vol: 0.08, verb: 'hi' });
        auOsc(a, t + i * 0.07, { type: 'square', f0: auMidi(m + 12), dur: 0.1, vol: 0.015 });
      });
      auNoise(a, t + 0.2, { ft: 'highpass', f0: 6000, q: 0.7, att: 0.1, dur: 0.5, vol: 0.035, verb: 'hi' });
      auDuck(0.45, 0.4);
    }, true);
  },
  // level-clear card stars (ui/levelStars.js): a rising chime per earned star (i = 0..2), a dull thud for a missed one
  starEarn(i = 0) {
    auPlay('starEarn', 3, 0.05, 0.5, (a, t) => {
      const m = 79 + [0, 4, 7][Math.max(0, Math.min(2, i))];
      auOsc(a, t, { type: 'triangle', f0: auMidi(m), f1: auMidi(m) * 1.03, dur: 0.22, vol: 0.08, verb: 'hi' });
      auOsc(a, t + 0.06, { type: 'sine', f0: auMidi(m + 12), dur: 0.35, vol: 0.05, verb: 'hi' });
      auNoise(a, t, { ft: 'highpass', f0: 5000, q: 0.7, dur: 0.12, vol: 0.03 });
    }, true);
  },
  starMiss() {
    auPlay('starMiss', 2, 0.05, 0.25, (a, t) => {
      auOsc(a, t, { type: 'triangle', f0: 220, f1: 150, dur: 0.18, vol: 0.07 });
    });
  },
  // UI select / card pick
  pick() {
    auPlay('pick', 2, 0.05, 0.22, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 660, f1: 1100, pdur: 0.06, dur: 0.12, vol: 0.09 });
      auOsc(a, t + 0.05, { type: 'triangle', f0: 990, f1: 1320, dur: 0.16, vol: 0.05, verb: 'lo' });
      auNoise(a, t, { ft: 'highpass', f0: 3000, q: 0.7, dur: 0.02, vol: 0.04 });
    });
  },
  fever() {
    auPlay('fever', 1, 0.5, 0.9, (a, t) => {
      [69, 73, 76, 81, 85, 88].forEach((m, i) => {
        auOsc(a, t + i * 0.05, { type: 'square', f0: auMidi(m), dur: 0.14, vol: 0.03 });
        auOsc(a, t + i * 0.05, { type: 'triangle', f0: auMidi(m), dur: 0.2, vol: 0.05, verb: 'hi' });
      });
      auNoise(a, t, { ft: 'bandpass', f0: 600, f1: 6000, q: 3, att: 0.2, dur: 0.45, vol: 0.08 });
      auDuck(0.5, 0.3);
    }, true);
  },
  // chain lightning — crackling electric zips
  zapChain() {
    auPlay('zapChain', 3, 0.06, 0.18, (a, t) => {
      const r = auRnd(0.1);
      auOsc(a, t, { type: 'sawtooth', f0: 1600 * r, f1: 300, dur: 0.12, vol: 0.03 });
      for (let i = 0; i < 3; i++) auNoise(a, t + i * 0.035, { ft: 'bandpass', f0: 3000 + Math.random() * 3000, q: 4, dur: 0.03, vol: 0.07 });
    });
  },
  // frost nova — icy shimmering blast
  nova() {
    auPlay('nova', 2, 0.15, 0.5, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 1500, f1: 180, dur: 0.4, vol: 0.08, verb: 'hi' });
      auOsc(a, t, { type: 'sine', f0: 90, f1: 45, dur: 0.3, vol: 0.18 });
      auNoise(a, t, { ft: 'highpass', f0: 8000, f1: 1500, q: 1, dur: 0.45, vol: 0.09, verb: 'hi' });
    });
  },
  bossRoar() {
    auPlay('bossRoar', 1, 0.6, 1.1, (a, t) => {
      auOsc(a, t, { type: 'sawtooth', f0: 95, f1: 58, dur: 1.0, att: 0.08, vol: 0.12 });
      auOsc(a, t, { type: 'sawtooth', f0: 97.5, f1: 60, dur: 1.0, att: 0.08, vol: 0.09 });
      auOsc(a, t, { type: 'square', f0: 48, f1: 36, dur: 1.0, att: 0.1, vol: 0.06 });
      auNoise(a, t, { ft: 'bandpass', f0: 500, f1: 220, q: 1.5, att: 0.1, dur: 1.0, vol: 0.25, verb: 'lo' });
      auDuck(0.25, 0.8, 1.0);
    }, true);
  },
  bossShot() {
    auPlay('bossShot', 3, 0.06, 0.22, (a, t) => {
      const r = auRnd(0.06);
      auOsc(a, t, { type: 'sawtooth', f0: 300 * r, f1: 110, dur: 0.2, vol: 0.05 });
      auOsc(a, t, { type: 'sine', f0: 150 * r, f1: 70, dur: 0.18, vol: 0.12 });
      auNoise(a, t, { ft: 'bandpass', f0: 800, q: 1.5, dur: 0.12, vol: 0.07 });
    });
  },
  stomp() {
    auPlay('stomp', 2, 0.1, 0.35, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 95, f1: 32, pdur: 0.2, dur: 0.32, vol: 0.42 });
      auNoise(a, t, { ft: 'lowpass', f0: 600, f1: 120, q: 0.8, dur: 0.25, vol: 0.25, verb: 'lo' });
    }, true);
  },
  bigBoom() {
    auPlay('bigBoom', 2, 0.12, 1.0, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 90, f1: 26, pdur: 0.6, dur: 0.9, vol: 0.5 });
      auOsc(a, t, { type: 'triangle', f0: 180, f1: 50, dur: 0.35, vol: 0.1 });
      auNoise(a, t, { ft: 'lowpass', f0: 3200, f1: 90, q: 0.9, dur: 0.95, vol: 0.42, verb: 'lo' });
      auNoise(a, t, { ft: 'bandpass', f0: 2600, q: 1.5, dur: 0.22, vol: 0.12 });
      auDuck(0.3, 0.4, 0.9);
    }, true);
  },

  // ---- new cues ----
  coin() {
    auPlay('coin', 3, 0.04, 0.3, (a, t) => {
      const r = auRnd(0.01);
      auOsc(a, t, { type: 'square', f0: 988 * r, dur: 0.07, vol: 0.03 });
      auOsc(a, t + 0.065, { type: 'square', f0: 1319 * r, dur: 0.22, vol: 0.03 });
      auOsc(a, t + 0.065, { type: 'sine', f0: 2638 * r, dur: 0.2, vol: 0.03, verb: 'hi' });
    });
  },
  uiTap() {
    auPlay('uiTap', 2, 0.03, 0.06, (a, t) => {
      auOsc(a, t, { type: 'sine', f0: 820 * auRnd(0.03), f1: 600, dur: 0.05, vol: 0.07 });
      auNoise(a, t, { ft: 'highpass', f0: 3500, q: 0.7, dur: 0.015, vol: 0.04 });
    });
  },
  chestOpen() {
    auPlay('chestOpen', 1, 0.4, 1.3, (a, t) => {
      auOsc(a, t, { type: 'sawtooth', f0: 70, f1: 110, dur: 0.3, att: 0.05, vol: 0.05 }); // creak
      auNoise(a, t, { ft: 'bandpass', f0: 500, f1: 900, q: 6, att: 0.05, dur: 0.3, vol: 0.08 });
      auOsc(a, t + 0.28, { type: 'sine', f0: 110, f1: 55, dur: 0.2, vol: 0.25 }); // lid thump
      [72, 76, 79, 84, 88, 91].forEach((m, i) => {
        auOsc(a, t + 0.34 + i * 0.05, { type: 'triangle', f0: auMidi(m), dur: 0.3, vol: 0.06, verb: 'hi' });
      });
      auNoise(a, t + 0.34, { ft: 'highpass', f0: 7000, q: 0.7, att: 0.15, dur: 0.8, vol: 0.04, verb: 'hi' });
      auDuck(0.45, 0.6);
    }, true);
  },
  bossIntro() {
    auPlay('bossIntro', 1, 2, 2.6, (a, t) => {
      auOsc(a, t, { type: 'sawtooth', f0: 55, f1: 52, dur: 2.4, att: 0.9, vol: 0.09 });
      auOsc(a, t, { type: 'sawtooth', f0: 55.6, f1: 52.4, dur: 2.4, att: 0.9, vol: 0.07 });
      auNoise(a, t, { ft: 'lowpass', f0: 150, f1: 1200, q: 3, att: 1.4, dur: 2.0, vol: 0.18 });
      [0, 0.55, 1.1, 1.4].forEach((d, i) => {
        auOsc(a, t + d, { type: 'sine', f0: 110 - i * 8, f1: 45, pdur: 0.25, dur: 0.6, vol: 0.32, verb: 'lo' });
        auNoise(a, t + d, { ft: 'lowpass', f0: 900, f1: 150, q: 0.8, dur: 0.4, vol: 0.12 });
      });
      auDuck(0.15, 2.0, 1.2);
    }, true);
  },
  bossPhase() {
    auPlay('bossPhase', 1, 0.6, 1.0, (a, t) => {
      auOsc(a, t, { type: 'square', f0: 420, f1: 60, dur: 0.6, vol: 0.06, verb: 'hi' });
      auOsc(a, t, { type: 'sine', f0: 1250, f1: 1180, dur: 0.5, vol: 0.05, verb: 'hi' }); // metallic ring
      auOsc(a, t, { type: 'sine', f0: 1730, f1: 1700, dur: 0.4, vol: 0.03 });
      auOsc(a, t, { type: 'sine', f0: 100, f1: 35, dur: 0.5, vol: 0.35 });
      auNoise(a, t, { ft: 'bandpass', f0: 600, f1: 200, q: 1.2, dur: 0.7, vol: 0.18 });
      auDuck(0.3, 0.5);
    }, true);
  },
  // result stars: i = 0, 1, 2 rise in pitch
  starPop(i = 0) {
    auPlay('starPop', 3, 0.05, 0.5, (a, t) => {
      const f = auMidi(79 + [0, 4, 7, 12][Math.max(0, Math.min(3, i | 0))]);
      auOsc(a, t, { type: 'triangle', f0: f, dur: 0.4, vol: 0.09, verb: 'hi' });
      auOsc(a, t, { type: 'sine', f0: f * 2, dur: 0.25, vol: 0.035 });
      auOsc(a, t, { type: 'sine', f0: 140, f1: 60, dur: 0.12, vol: 0.18 });
      auNoise(a, t, { ft: 'highpass', f0: 6000, q: 0.7, dur: 0.18, vol: 0.05, verb: 'hi' });
    });
  },
  victoryJingle() {
    const now = audioCtx ? audioCtx.currentTime : 0;
    if (now - auVictoryAt < 3) return;
    auPlay('victory', 1, 2.5, 2.2, (a, t) => {
      auVictoryAt = now;
      const notes = [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [76, 0.6], [79, 0.72]];
      notes.forEach(([m, d]) => {
        auOsc(a, t + d, { type: 'square', f0: auMidi(m), dur: 0.16, vol: 0.035 });
        auOsc(a, t + d, { type: 'triangle', f0: auMidi(m), dur: 0.2, vol: 0.07, verb: 'hi' });
      });
      [72, 76, 79, 84].forEach((m) => auOsc(a, t + 0.9, { type: 'triangle', f0: auMidi(m), dur: 1.2, att: 0.02, hold: 0.4, vol: 0.05, verb: 'hi' }));
      auOsc(a, t + 0.9, { type: 'sine', f0: auMidi(48), dur: 1.2, vol: 0.18 });
      [0, 0.36, 0.9].forEach((d) => auNoise(a, t + d, { ft: 'bandpass', f0: 1900, q: 0.8, dur: 0.12, vol: 0.08 }));
      auNoise(a, t + 0.9, { ft: 'highpass', f0: 6000, q: 0.7, att: 0.1, dur: 1.0, vol: 0.04, verb: 'hi' });
      auDuck(0.1, 1.6, 1.0);
    }, true);
  },
};

// Unknown cue names (a feature calling a sound that doesn't exist yet) are
// harmless no-ops instead of TypeErrors.
export const audio = new Proxy(auApi, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === 'string' && prop !== 'then' && prop !== 'toJSON' && !prop.startsWith('__')) return auNoop;
    return undefined;
  },
});
