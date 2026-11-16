// Echo Run — all canvas drawing: the world, the player, the ghost, the HUD
// and the menu screens. One coherent palette: deep indigo night, cyan player,
// magenta echo, amber orbs.

const PALETTE = {
  skyTop: '#0d0d24',
  skyBottom: '#1c1440',
  ground: '#2e2a55',
  groundTop: '#4a4480',
  spike: '#ff4d6d',
  plate: '#3ddc84',
  platePressed: '#7dffb0',
  doorHold: '#ffb020',
  doorTimed: '#ff7ad9',
  doorLatch: '#35e0e0',
  doorFrame: '#5a5470',
  orb: '#ffc93c',
  exit: '#7dffd4',
  player: '#35e0e0',
  ghost: '#ff5fd0',
  text: '#f2f0ff',
  dim: '#9d97c9',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWorld(ctx, level, time) {
  const g = ctx.createLinearGradient(0, 0, 0, 540);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 960, 540);
  // Distant stars.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 173) % 960;
    const sy = (i * 97) % 300;
    ctx.fillRect(sx, sy, 2, 2);
  }
  // Echo moon.
  ctx.fillStyle = '#e8e4ff';
  ctx.beginPath();
  ctx.arc(830, 80, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.skyBottom;
  ctx.beginPath();
  ctx.arc(842, 72, 30, 0, Math.PI * 2);
  ctx.fill();

  for (const s of level.solids) {
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = PALETTE.groundTop;
    ctx.fillRect(s.x, s.y, s.w, 5);
  }
  for (const spike of level.spikes) {
    ctx.fillStyle = PALETTE.spike;
    ctx.beginPath();
    ctx.moveTo(spike.x, spike.y + spike.h);
    ctx.lineTo(spike.x + spike.w / 2, spike.y);
    ctx.lineTo(spike.x + spike.w, spike.y + spike.h);
    ctx.closePath();
    ctx.fill();
  }
  for (const plate of level.plates) {
    const pressed = plate.pressed;
    ctx.fillStyle = pressed ? PALETTE.platePressed : PALETTE.plate;
    const y = pressed ? plate.y + 3 : plate.y;
    roundRect(ctx, plate.x, y, plate.w, pressed ? 5 : 8, 3);
    ctx.fill();
  }
  for (const door of level.doors) {
    const color = door.mode === 'latch' ? PALETTE.doorLatch : door.mode === 'timed' ? PALETTE.doorTimed : PALETTE.doorHold;
    ctx.fillStyle = PALETTE.doorFrame;
    ctx.fillRect(door.x - 3, door.y - 4, door.w + 6, door.h + 4);
    if (door.open) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(door.x, door.y, door.w, 6);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(door.x + 2, door.y + 2, door.w - 4, door.h - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < 4; i++) ctx.fillRect(door.x + 2, door.y + 12 + i * 18, door.w - 4, 3);
    }
  }
  for (const orb of level.orbs) {
    if (orb.taken) continue;
    const bob = Math.sin(time / 300 + orb.x) * 3;
    ctx.fillStyle = PALETTE.orb;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, orb.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(orb.x - 3, orb.y + bob - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Exit portal.
  const pulse = 0.6 + Math.sin(time / 200) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.exit;
  roundRect(ctx, level.exit.x + 4, level.exit.y + 4, level.exit.w - 8, level.exit.h - 4, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0d0d24';
  roundRect(ctx, level.exit.x + 10, level.exit.y + 12, level.exit.w - 20, level.exit.h - 16, 8);
  ctx.fill();
  ctx.restore();
}

function drawRunner(ctx, x, y, facing, color, alpha, time) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, 26, 34, 8);
  ctx.fill();
  // Eye looking the way it runs.
  ctx.fillStyle = '#0d0d24';
  const ex = facing === 1 ? x + 17 : x + 5;
  ctx.fillRect(ex, y + 10, 5, 6);
  // Little feet.
  ctx.fillStyle = color;
  const step = Math.sin(time / 90) * 2;
  ctx.fillRect(x + 3, y + 32, 8, 4 + step * 0.3);
  ctx.fillRect(x + 15, y + 32, 8, 4 - step * 0.3);
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  drawRunner(ctx, player.x, player.y, player.facing, PALETTE.player, 1, time);
}

function drawGhost(ctx, ghost, time) {
  if (!ghost) return;
  // Fading trail behind the echo.
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = PALETTE.ghost;
  for (let i = 1; i <= 4; i++) {
    const idx = Math.max(0, ghost.t - i * 4);
    const s = ghost.samples[idx];
    if (s) ctx.fillRect(s.x + 4, s.y + 6, 18, 26);
  }
  ctx.restore();
  drawRunner(ctx, ghost.x, ghost.y, ghost.facing, PALETTE.ghost, 0.55, time);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = PALETTE.ghost;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ECHO', ghost.x + 13, ghost.y - 8);
  ctx.restore();
}

function drawHud(ctx, hud) {
  ctx.fillStyle = 'rgba(10,10,30,0.55)';
  ctx.fillRect(0, 0, 960, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LEVEL ${hud.levelNum} · ${hud.levelName}`, 12, 22);
  ctx.textAlign = 'center';
  ctx.fillText(`TIME ${hud.time}`, 480, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`ORBS ${hud.orbs}/${hud.totalOrbs}   RUN ${hud.run}   DEATHS ${hud.deaths}`, 948, 22);
  // Ghost status line.
  ctx.textAlign = 'left';
  ctx.font = '13px sans-serif';
  ctx.fillStyle = hud.ghostHolding ? PALETTE.platePressed : PALETTE.dim;
  ctx.fillText(hud.ghostStatus, 12, 52);
  // Hint line.
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hud.hint, 480, 528);
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,8,26,0.72)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = accent || PALETTE.text;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 480, 200);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, 480, 250 + i * 28);
  });
}

function drawTitle(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, 540);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect((i * 173) % 960, (i * 97) % 320, 2, 2);
  }
  // A ghost and a runner chasing the title.
  const bob = Math.sin(time / 300) * 6;
  drawRunner(ctx, 300, 330 + bob, 1, PALETTE.ghost, 0.55, time);
  drawRunner(ctx, 620, 330 - bob, -1, PALETTE.player, 1, time);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ECHO RUN', 480, 180);
  ctx.fillStyle = PALETTE.ghost;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('team up with your own ghost', 480, 220);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px sans-serif';
  ctx.fillText('Run the level. Die or press R — your echo replays your last run.', 480, 300);
  ctx.fillText('Its weight holds plates and opens doors you cannot hold alone.', 480, 326);
  ctx.fillStyle = PALETTE.player;
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(time / 250) > 0 ? 1 : 0.25;
  ctx.globalAlpha = blink;
  ctx.fillText('Press ENTER or click to start', 480, 430);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '14px sans-serif';
  ctx.fillText('Move: ← → or A / D · Jump: ↑ / W / Space · Bank run: R · Clear echo: T · Mute: M', 480, 470);
}
