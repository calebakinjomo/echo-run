// Echo Run — the echo recorder and the ghost that replays it.
// Every physics tick the recorder saves the player's position and facing.
// When a run ends (death, or the player banks it with R), the recording
// becomes the ghost: it replays from the start of the level, and when the
// recording runs out the ghost stays frozen at its last spot — still heavy
// enough to hold a plate down.

const MAX_SAMPLES = 60 * 90; // 90 seconds at 60 ticks a second

function makeRecorder() {
  return {
    samples: [],
    record(x, y, facing) {
      if (this.samples.length < MAX_SAMPLES) {
        this.samples.push({ x, y, facing });
      }
    },
    // Hand the recording over as a ghost. Returns null if nothing was recorded.
    // The samples are copied: the recorder keeps recording the next run into
    // its own array, and the ghost must keep the run it was given.
    bank() {
      if (this.samples.length < 2) return null;
      return makeGhost(this.samples.slice());
    },
    reset() {
      this.samples.length = 0;
    },
  };
}

function makeGhost(samples) {
  return {
    samples,
    t: 0,
    x: samples[0].x,
    y: samples[0].y,
    facing: samples[0].facing,
    done: false,
    // Advance one tick. After the last sample the ghost freezes in place.
    tick() {
      if (this.t >= this.samples.length) {
        this.done = true;
        return;
      }
      const s = this.samples[this.t];
      this.x = s.x;
      this.y = s.y;
      this.facing = s.facing;
      this.t++;
      if (this.t >= this.samples.length) this.done = true;
    },
    reset() {
      this.t = 0;
      this.done = false;
      this.x = this.samples[0].x;
      this.y = this.samples[0].y;
      this.facing = this.samples[0].facing;
    },
    // The ghost's body, for pressing plates (same size as the player).
    rect() {
      return { x: this.x, y: this.y, w: 26, h: 34 };
    },
  };
}
