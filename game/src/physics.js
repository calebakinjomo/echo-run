// Echo Run — physics: running, jumping, tile collision, and the
// plate/door/spike/orb/exit rules. Pure functions over plain objects so the
// game loop stays small.


const PLAYER_W = 26;
const PLAYER_H = 34;
const GRAVITY = 0.55;
const MOVE_SPEED = 3.4;
const JUMP_SPEED = 11.5;
const MAX_FALL = 13;

function makePlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facing: 1,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function solidAt(level, x, y) {
  for (const s of level.solids) {
    if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return s;
  }
  return null;
}

// Doors are solid while closed. A closed door blocks like a wall.
function doorIsSolid(door) {
  return !door.open;
}

function blockedAt(level, x, y) {
  if (solidAt(level, x, y)) return true;
  for (const d of level.doors) {
    if (doorIsSolid(d) && x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return true;
  }
  return false;
}

function moveAxis(level, p, dx, dy) {
  p.x += dx;
  if (dx !== 0) {
    const top = p.y + 2;
    const bottom = p.y + p.h - 2;
    if (dx > 0) {
      const edge = p.x + p.w;
      if (blockedAt(level, edge, top) || blockedAt(level, edge, bottom) || blockedAt(level, edge, (top + bottom) / 2)) {
        p.x = Math.floor(edge / 40) * 40 - p.w - 0.01;
      }
    } else {
      const edge = p.x;
      if (blockedAt(level, edge, top) || blockedAt(level, edge, bottom) || blockedAt(level, edge, (top + bottom) / 2)) {
        p.x = (Math.floor(edge / 40) + 1) * 40 + 0.01;
      }
    }
  }
  p.y += dy;
  p.onGround = false;
  if (dy !== 0) {
    const left = p.x + 2;
    const right = p.x + p.w - 2;
    if (dy > 0) {
      const edge = p.y + p.h;
      if (blockedAt(level, left, edge) || blockedAt(level, right, edge)) {
        p.y = Math.floor(edge / 40) * 40 - p.h - 0.01;
        p.vy = 0;
        p.onGround = true;
      }
    } else {
      const edge = p.y;
      if (blockedAt(level, left, edge) || blockedAt(level, right, edge)) {
        p.y = (Math.floor(edge / 40) + 1) * 40 + 0.01;
        p.vy = 0;
      }
    }
  }
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > WORLD_W) p.x = WORLD_W - p.w;
}

// One physics tick. input: {left, right, jump}. Returns 'alive' | 'spike' | 'pit'.
function stepPlayer(level, p, input) {
  if (input.left) {
    p.vx = -MOVE_SPEED;
    p.facing = -1;
  } else if (input.right) {
    p.vx = MOVE_SPEED;
    p.facing = 1;
  } else {
    p.vx = 0;
  }
  if (input.jump) p.jumpBuffer = 8;
  if (p.jumpBuffer > 0) p.jumpBuffer--;
  if (p.onGround) p.coyote = 8;
  else if (p.coyote > 0) p.coyote--;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -JUMP_SPEED;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.onGround = false;
  }
  p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
  moveAxis(level, p, p.vx, 0);
  moveAxis(level, p, 0, p.vy);
  if (p.y > WORLD_H + 10) return 'pit';
  const feet = { x: p.x + 4, y: p.y + p.h - 6, w: p.w - 8, h: 6 };
  for (const s of level.spikes) {
    if (rectsOverlap(feet, s)) return 'spike';
  }
  return 'alive';
}

// Plates are pressed by the player or by the ghost standing on them.
// Doors follow their mode: hold (open while pressed), timed (open while
// pressed, then 2s more), latch (open for good once pressed).
function updatePlatesAndDoors(level, player, ghost) {
  const bodies = [player];
  if (ghost) bodies.push(ghost.rect());
  for (const plate of level.plates) {
    const was = plate.pressed;
    plate.pressed = bodies.some((b) => rectsOverlap(b, plate));
    if (plate.pressed && !was) plate.justPressed = true;
    else plate.justPressed = false;
  }
  for (const door of level.doors) {
    const plate = level.plates.find((pl) => pl.id.toLowerCase() === door.id.toLowerCase());
    const pressed = plate ? plate.pressed : false;
    if (door.mode === 'latch') {
      if (pressed) door.latched = true;
      door.open = door.latched;
    } else if (door.mode === 'timed') {
      if (pressed) {
        door.open = true;
        door.holdTimer = 120; // 2 seconds at 60 ticks
      } else if (door.holdTimer > 0) {
        door.holdTimer--;
        door.open = true;
      } else {
        door.open = false;
      }
    } else {
      door.open = pressed;
    }
  }
}

// Orbs the player touches. Returns how many were just collected.
function collectOrbs(level, player) {
  let got = 0;
  for (const orb of level.orbs) {
    if (orb.taken) continue;
    const dx = player.x + player.w / 2 - orb.x;
    const dy = player.y + player.h / 2 - orb.y;
    if (dx * dx + dy * dy < (orb.r + 14) * (orb.r + 14)) {
      orb.taken = true;
      got++;
    }
  }
  return got;
}

function onExit(level, player) {
  return rectsOverlap(player, level.exit);
}
