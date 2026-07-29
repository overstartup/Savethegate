// Web Audio synth — no sound files needed. Combo raises the pop pitch.
let audioCtx = null;
let unlocked = false;
let muted = false;

function ac() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      console.warn('[audio] AudioContext could not be created:', err);
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.warn('[audio] resume() failed:', err));
  }
  return audioCtx;
}

function tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  if (muted) return;
  try {
    const a = ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  } catch (err) {
    console.warn('[audio] tone() failed:', err);
  }
}

export const audio = {
  // Call on first user input. Browsers only allow AudioContext to actually
  // produce sound after a real user gesture — this both creates the context
  // and nudges it out of "suspended". Logs to console so a genuinely broken
  // audio setup (vs. just a muted tab) is easy to tell apart in devtools.
  unlock() {
    if (unlocked) return;
    const a = ac();
    if (a) {
      unlocked = true;
      console.info('[audio] unlocked, context state:', a.state);
    }
  },
  setMuted(v) { muted = !!v; },
  isMuted()   { return muted; },
  zap()        { tone(880, 0.06, 'square', 0.03, -300); },
  pop(combo=0) { tone(300 + Math.min(combo, 24) * 30, 0.12, 'triangle', 0.1, 120); },
  gateGood()   { tone(520, 0.15, 'sine', 0.1, 260); tone(780, 0.2, 'sine', 0.06, 260); },
  gateCurse()  { tone(300, 0.25, 'sawtooth', 0.07, -150); },
  crack()      { tone(140, 0.3, 'sawtooth', 0.12, -80); },
  gameOver()   { tone(400, 0.5, 'triangle', 0.1, -300); },
  waveUp()     { tone(600, 0.12, 'sine', 0.08, 200); tone(900, 0.18, 'sine', 0.06, 200); },
  enemyShot()  { tone(180, 0.08, 'sawtooth', 0.025, -60); },
  grazed()     { tone(220, 0.07, 'square', 0.05, -40); }, // enemy bullet chips a blood line (no heart lost yet)
};
