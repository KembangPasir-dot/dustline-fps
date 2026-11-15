import { writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { buildDossier } from './vendor/makefun-threejs.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });

if (existsSync('game')) {
  cpSync('game', join(outDir, 'game'), { recursive: true });
}
if (existsSync('screenshots')) {
  cpSync('screenshots', join(outDir, 'screenshots'), { recursive: true });
}

const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
console.log('Successfully built dossier and copied files to', outDir);
