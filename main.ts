// Echo Run — the entry program (Node 22, standard library only).
// It hands the game in: it copies this repository's game/ folder and
// screenshots/ folder to the output directory and writes dossier.json,
// the summary the judge reads, using the vendored make.fun library.
// The game itself is plain static files (game/index.html and its scripts,
// no library, no network request), so any static server can host it.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole entry is two folders and one summary file.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps match the scorer's own limits, so an entry this program accepts
// is one the scorer accepts: at most 4 screenshots of 256 KiB, at most 993
// game files totalling 48 MiB, and no game path over 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
