// Echo Run — tiny synthesized sound effects (WebAudio, no audio files).
// Every sound is an oscillator blip so the game needs no network or assets.

function makeSound() {
  let ctx = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(vol || 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    // Call from a user gesture once so the browser lets audio play.
    unlock() {
      if (unlocked) return;
      unlocked = true;
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    jump() {
      tone(280, 0.12, 'square', 0.05, 520);
    },
    orb() {
      tone(880, 0.09, 'sine', 0.1, 1320);
    },
    plate() {
      tone(220, 0.08, 'triangle', 0.1, 330);
    },
    door() {
      tone(160, 0.25, 'sawtooth', 0.05, 480);
    },
    death() {
      tone(320, 0.35, 'sawtooth', 0.09, 60);
    },
    win() {
      tone(523, 0.12, 'sine', 0.1);
      setTimeout(() => tone(659, 0.12, 'sine', 0.1), 110);
      setTimeout(() => tone(784, 0.22, 'sine', 0.1), 220);
    },
    click() {
      tone(600, 0.05, 'square', 0.05);
    },
  };
}
