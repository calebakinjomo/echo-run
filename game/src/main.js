// Echo Run — boot, game loop, state machine, input, scoring and the HUD.
// States: title -> playing -> levelclear -> (next level) -> gameclear,
// and playing -> dead -> playing. The ghost is your last run, banked when
// you die or press R; it replays, then freezes where it ended.


const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = makeSound();

const game = {
  state: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  ghost: null,
  recorder: makeRecorder(),
  run: 1,
  deaths: 0,
  time: 0,
  orbs: 0,
  totalScore: 0,
  levelScore: 0,
  deathReason: '',
  frozen: false, // screenshot pose: render the state, run no physics
  input: { left: false, right: false },
  jumpQueued: false,
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

function startLevel(index) {
  game.levelIndex = index;
  game.level = loadLevel(index);
  game.player = makePlayer(game.level.spawn);
  game.recorder.reset();
  game.time = 0;
  game.orbs = 0;
  game.state = 'playing';
}

function restartAttempt() {
  // Bank the run you just made as the echo, then run again.
  const banked = game.recorder.bank();
  if (banked) game.ghost = banked;
  // Fresh level state (orbs, plates and doors reset); the echo survives.
  game.level = loadLevel(game.levelIndex);
  game.player = makePlayer(game.level.spawn);
  game.recorder.reset();
  game.time = 0;
  game.orbs = 0;
  game.run++;
  game.state = 'playing';
}

function clearEchoAndRestart() {
  game.ghost = null;
  game.level = loadLevel(game.levelIndex);
  game.player = makePlayer(game.level.spawn);
  game.recorder.reset();
  game.time = 0;
  game.orbs = 0;
  game.run = 1;
  game.state = 'playing';
}

function startGame() {
  game.totalScore = 0;
  game.deaths = 0;
  game.run = 1;
  game.ghost = null;
  startLevel(0);
}

function levelScore() {
  const timeBonus = Math.max(0, Math.round(game.level.par - game.time)) * 10;
  return game.orbs * 100 + timeBonus;
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

function ghostStatus() {
  if (!game.ghost) return 'ECHO: none yet — press R to bank your run';
  const holding = game.level.plates.some((pl) => pl.pressed && rectsOverlap(game.ghost.rect(), pl));
  if (holding) return 'ECHO: holding a plate — the door is open';
  if (!game.ghost.done) return 'ECHO: replaying your last run';
  return 'ECHO: waiting where your last run ended';
}

function step() {
  if (game.state !== 'playing') return;
  if (game.frozen) {
    // Screenshot pose: no physics or timer, but plates and doors still react
    // so the echo holding a plate shows its door open.
    updatePlatesAndDoors(game.level, game.player, game.ghost);
    return;
  }
  const input = { left: game.input.left, right: game.input.right, jump: game.jumpQueued };
  game.jumpQueued = false;
  const result = stepPlayer(game.level, game.player, input);
  game.recorder.record(game.player.x, game.player.y, game.player.facing);
  if (game.ghost) game.ghost.tick();
  updatePlatesAndDoors(game.level, game.player, game.ghost);
  const got = collectOrbs(game.level, game.player);
  if (got > 0) {
    game.orbs += got;
    sound.orb();
  }
  game.time += 1 / 60;
  if (result === 'spike' || result === 'pit') {
    game.deathReason = result === 'spike' ? 'the spikes' : 'the pit';
    const banked = game.recorder.bank();
    if (banked) game.ghost = banked;
    game.deaths++;
    sound.death();
    game.state = 'dead';
    return;
  }
  if (onExit(game.level, game.player)) {
    game.levelScore = levelScore();
    game.totalScore += game.levelScore;
    sound.win();
    game.state = 'levelclear';
  }
}

function draw(now) {
  const scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const ox = (canvas.width - WORLD_W * scale) / 2;
  const oy = (canvas.height - WORLD_H * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07071a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  if (game.state === 'title') {
    drawTitle(ctx, now);
    return;
  }
  drawWorld(ctx, game.level, now);
  drawGhost(ctx, game.ghost, now);
  drawPlayer(ctx, game.player, now);
  drawHud(ctx, {
    levelNum: game.levelIndex + 1,
    levelName: game.level.name,
    time: fmtTime(game.time),
    orbs: game.orbs,
    totalOrbs: game.level.totalOrbs,
    run: game.run,
    deaths: game.deaths,
    ghostStatus: ghostStatus(),
    ghostHolding: game.ghost && game.level.plates.some((pl) => pl.pressed && rectsOverlap(game.ghost.rect(), pl)),
    hint: game.level.hint,
  });
  if (game.state === 'levelclear') {
    const last = game.levelIndex + 1 >= LEVEL_COUNT;
    drawCenterPanel(
      ctx,
      last ? 'ALL LEVELS CLEAR!' : 'LEVEL CLEAR!',
      [
        `${game.level.name} — orbs ${game.orbs}/${game.level.totalOrbs} · time ${fmtTime(game.time)}`,
        `Level score ${game.levelScore} · total ${game.totalScore}`,
        last ? 'Press ENTER to play again' : 'Press ENTER for the next level',
      ],
      PALETTE.exit,
    );
  } else if (game.state === 'dead') {
    drawCenterPanel(
      ctx,
      'ECHO LOST',
      [
        `You fell to ${game.deathReason}.`,
        'Your last run is banked as your echo — it will replay and hold the plate.',
        'Press R to run again · T to clear your echo',
      ],
      PALETTE.spike,
    );
  } else if (game.state === 'gameclear') {
    drawCenterPanel(
      ctx,
      'ECHO RUN COMPLETE!',
      [
        `Total score ${game.totalScore} · orbs across ${LEVEL_COUNT} levels · deaths ${game.deaths}`,
        'You and your echo cleared every level.',
        'Press ENTER to play again',
      ],
      PALETTE.exit,
    );
  }
}

// Fixed-step loop: 60 physics ticks a second, render every frame.
let last = performance.now();
let acc = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  acc += dt;
  while (acc >= 1 / 60) {
    step();
    acc -= 1 / 60;
  }
  draw(now);
  requestAnimationFrame(loop);
}

function onKey(e) {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') game.input.left = true;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') game.input.right = true;
  if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') {
    if (!e.repeat) game.jumpQueued = true;
    e.preventDefault();
  }
  if (k === 'ArrowDown' || k === 's' || k === 'S') e.preventDefault();
  if (e.repeat) return;
  sound.unlock();
  if (k === 'Enter') advance();
  if (k === 'r' || k === 'R') {
    if (game.state === 'playing' || game.state === 'dead') {
      sound.click();
      restartAttempt();
    }
  }
  if (k === 't' || k === 'T') {
    if (game.state === 'playing' || game.state === 'dead') {
      sound.click();
      clearEchoAndRestart();
    }
  }
  if (k === 'm' || k === 'M') sound.toggleMute();
}

function onKeyUp(e) {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') game.input.left = false;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') game.input.right = false;
}

function advance() {
  sound.unlock();
  sound.click();
  if (game.state === 'title') {
    startGame();
  } else if (game.state === 'levelclear') {
    if (game.levelIndex + 1 >= LEVEL_COUNT) {
      game.state = 'gameclear';
    } else {
      game.ghost = null;
      game.run = 1;
      startLevel(game.levelIndex + 1);
    }
  } else if (game.state === 'dead') {
    restartAttempt();
  } else if (game.state === 'gameclear') {
    game.state = 'title';
  }
}

canvas.addEventListener('click', () => {
  if (game.state !== 'playing') advance();
});
window.addEventListener('keydown', onKey);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('resize', fitCanvas);

// Screenshot poses: ?shot=start|play|win|lost renders a real game state.
function seedEchoToPlate() {
  const plate = game.level.plates[0];
  if (!plate) return;
  const targetX = plate.x + plate.w / 2 - 13;
  const startX = game.level.spawn.x;
  const samples = [];
  for (let i = 0; i < 90; i++) {
    const t = Math.min(1, i / 60);
    samples.push({ x: startX + (targetX - startX) * t, y: game.level.spawn.y, facing: 1 });
  }
  game.ghost = makeGhost(samples);
  game.ghost.t = 70; // at the plate, frozen there holding it down
  game.ghost.x = samples[70].x;
  game.ghost.y = samples[70].y;
}

function setupShot(shot) {
  if (shot === 'start') {
    game.state = 'title';
  } else if (shot === 'play') {
    startLevel(1);
    seedEchoToPlate();
    // Pose the runner mid-jump over the spikes, frozen for the shot.
    game.player.x = 350;
    game.player.y = 380;
    game.player.vy = 0;
    game.time = 12.3;
    game.orbs = 1;
    game.run = 2;
    game.frozen = true;
  } else if (shot === 'win') {
    startLevel(0);
    game.level.orbs.forEach((o) => { o.taken = true; });
    game.orbs = game.level.totalOrbs;
    game.time = 18.4;
    game.levelScore = levelScore();
    game.totalScore = game.levelScore;
    // Pose the runner just before the exit portal.
    game.player.x = 800;
    game.player.y = 446;
    game.state = 'levelclear';
  } else if (shot === 'lost') {
    startLevel(1);
    seedEchoToPlate();
    updatePlatesAndDoors(game.level, game.player, game.ghost);
    game.deathReason = 'the spikes';
    game.deaths = 1;
    game.state = 'dead';
  }
}

fitCanvas();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  setupShot(shot);
} else {
  game.level = loadLevel(0);
  game.player = makePlayer(game.level.spawn);
}
requestAnimationFrame(loop);
