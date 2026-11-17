// All sound is synthesised with WebAudio — no audio files, no network.
// The synth only starts after the player's first click or key, so browsers
// never block it, and M toggles it off entirely.
const NOTES = { place: 660, shoot: 880, pop: 520, leak: 160, coin: 990, horn: 220, win: 523, lose: 110 };

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx !== null) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, seconds, type, when, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !master) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = ac.currentTime + (when || 0);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(1, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    place() { tone(NOTES.place, 0.12, 'triangle'); tone(NOTES.place * 1.5, 0.1, 'sine', 0.05); },
    shoot() { tone(NOTES.shoot, 0.05, 'square', 0, NOTES.shoot * 0.7); },
    pop() { tone(NOTES.pop, 0.09, 'sine', 0, NOTES.pop * 0.5); },
    coin() { tone(NOTES.coin, 0.1, 'sine'); tone(NOTES.coin * 1.26, 0.12, 'sine', 0.07); },
    leak() { tone(NOTES.leak, 0.3, 'sawtooth', 0, NOTES.leak * 0.6); },
    horn() { tone(NOTES.horn, 0.35, 'triangle'); tone(NOTES.horn * 1.5, 0.3, 'triangle', 0.12); },
    upgrade() { tone(587, 0.1, 'triangle'); tone(740, 0.1, 'triangle', 0.08); tone(880, 0.14, 'triangle', 0.16); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.13)); },
    lose() { [330, 262, 196, 131].forEach((f, i) => tone(f, 0.3, 'sawtooth', i * 0.16)); },
  };
}
