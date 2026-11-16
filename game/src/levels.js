// Echo Run — level data and the map parser.
// A level is a 24 x 13 grid of 40px tiles (world 960 x 520, floor row 12).
// Map characters:
//   '#' solid block      ' ' empty        'P' player spawn
//   'E' exit portal      'o' orb          '^' spikes (sit on the floor)
//   'a','b','c' plates   'A','B','C' doors (linked to the plate of the same letter)
// Door modes are set per level: 'hold' (open while its plate is pressed),
// 'timed' (open while pressed, then stays open 2s), 'latch' (opens for good
// once its plate is pressed even once).

const TILE = 40;
const WORLD_W = 960;
const WORLD_H = 540;

const LEVEL_DEFS = [
  {
    name: 'First Echo',
    hint: 'Stand on the plate, press R to bank your run — your echo holds it. Then run through the open door.',
    par: 25,
    doorModes: { A: 'hold' },
    map: [
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '             o          ',
      '  P   o a     A   o   E ',
      '########################',
    ],
  },
  {
    name: 'Spike Garden',
    hint: 'Your echo holds the plate. Jump the spikes and the pit, and mind your footing.',
    par: 35,
    doorModes: { A: 'hold' },
    map: [
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '           o            ',
      '      o         o       ',
      '  P   a ^^    A  ^^  E  ',
      '###########  ###########',
    ],
  },
  {
    name: 'Double Door',
    hint: 'Your echo holds the first plate. Press the second plate and dash through before it shuts!',
    par: 45,
    doorModes: { A: 'hold', B: 'timed' },
    map: [
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                  o      ',
      '       o       o        ',
      '  P  a   A  ^^ b   B  E ',
      '########################',
    ],
  },
  {
    name: 'The Gauntlet',
    hint: 'The teal door latches open once pressed. The amber door needs your echo. Chain them.',
    par: 60,
    doorModes: { C: 'latch', A: 'hold' },
    map: [
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                        ',
      '                     o  ',
      '       o        o       ',
      '  P  c ^^ C   a ^^ A  E ',
      '############  ##########',
    ],
  },
];

function parseLevel(def) {
  const level = {
    name: def.name,
    hint: def.hint,
    par: def.par,
    doorModes: def.doorModes,
    solids: [],
    spikes: [],
    plates: [],
    doors: [],
    orbs: [],
    spawn: { x: 80, y: 440 },
    exit: { x: 880, y: 400, w: 40, h: 80 },
    totalOrbs: 0,
  };
  def.map.forEach((row, ry) => {
    if (row.length !== 24) throw new Error(`level ${def.name} row ${ry} is ${row.length} chars, want 24`);
    for (let rx = 0; rx < 24; rx++) {
      const ch = row[rx];
      const x = rx * TILE;
      const y = ry * TILE;
      if (ch === '#') {
        level.solids.push({ x, y, w: TILE, h: TILE });
      } else if (ch === 'P') {
        level.spawn = { x: x + 7, y: y + 6 };
      } else if (ch === 'E') {
        level.exit = { x, y: y - TILE, w: TILE, h: TILE * 2 };
      } else if (ch === 'o') {
        level.orbs.push({ x: x + TILE / 2, y: y + TILE / 2, r: 9, taken: false });
      } else if (ch === '^') {
        level.spikes.push({ x: x + 4, y: y + TILE - 18, w: TILE - 8, h: 18 });
      } else if (ch >= 'a' && ch <= 'z') {
        level.plates.push({ id: ch, x: x + 2, y: y + TILE - 8, w: TILE - 4, h: 8, pressed: false });
      } else if (ch >= 'A' && ch <= 'Z') {
        level.doors.push({
          id: ch,
          mode: def.doorModes[ch] || 'hold',
          x,
          y: y - TILE,
          w: TILE,
          h: TILE * 2,
          open: false,
          holdTimer: 0,
          latched: false,
        });
      }
    }
  });
  level.totalOrbs = level.orbs.length;
  return level;
}

function loadLevel(index) {
  return parseLevel(LEVEL_DEFS[index]);
}

const LEVEL_COUNT = LEVEL_DEFS.length;
