import { writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });

// Verify screenshots exist and meet size limits (max 256 KiB each, count 3 or 4)
const screenshotsDir = join(scriptDir, 'screenshots');
if (!existsSync(screenshotsDir)) {
  throw new Error(`Error: screenshots directory '${screenshotsDir}' does not exist.`);
}

const shotFiles = readdirSync(screenshotsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`Error: expected 3 or 4 screenshot files in '${screenshotsDir}', found ${shotFiles.length}: ${shotFiles.join(', ')}.`);
}

for (const file of shotFiles) {
  const filePath = join(screenshotsDir, file);
  const stats = statSync(filePath);
  const maxSize = 262144; // 256 KiB
  if (stats.size > maxSize) {
    throw new Error(`Error: screenshot '${file}' size (${stats.size} bytes) exceeds maximum allowed size of 256 KiB (${maxSize} bytes).`);
  }
}

if (existsSync(join(scriptDir, 'game'))) {
  cpSync(join(scriptDir, 'game'), join(outDir, 'game'), { recursive: true });
}
if (existsSync(join(scriptDir, 'screenshots'))) {
  cpSync(join(scriptDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
console.log('Successfully built dossier and verified screenshots for', outDir);
