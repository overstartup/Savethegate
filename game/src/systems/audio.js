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
  // Gem pickups rise in pitch while collected in quick succession.
  gem() {
    const now = performance.now();
    if (now - gemLast < 45) return;
    gemStreak = now - gemLast < 400 ? Math.min(gemStreak + 1, 16) : 0;
    gemLast = now;
    tone(900 + gemStreak * 45, 0.05, 'sine', 0.035, 200);
  },
  levelUp()    { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.08, 0), i * 70)); },
  pick()       { tone(660, 0.1, 'sine', 0.09, 440); tone(990, 0.18, 'triangle', 0.05, 300); },
  fever()      { [440, 554, 659, 880, 1109].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.04, 60), i * 55)); },
  zapChain()   { tone(1400, 0.12, 'sawtooth', 0.035, -1000); },
  nova()       { tone(1200, 0.35, 'sine', 0.06, -900); },
  shatter()    { tone(1600 + Math.random() * 400, 0.07, 'triangle', 0.025, -900); },
  bossRoar()   { tone(90, 0.7, 'sawtooth', 0.12, -40); tone(60, 0.8, 'square', 0.06, -20); },
  bossShot()   { tone(240, 0.18, 'sawtooth', 0.05, -160); },
  bigBoom()    { tone(70, 0.6, 'sawtooth', 0.14, -30); tone(160, 0.35, 'square', 0.06, -120); },
};
let gemLast = 0, gemStreak = 0;
