import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContourSVG } from './contour-field.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const [template, css, engine, project, photo, app, sourceLicense, studioLicense] = await Promise.all([
  read('index.html'), read('styles.css'), read('contour-field.mjs'), read('project-format.mjs'), read('photo-field.mjs'), read('app.mjs'),
  read('licenses/DSH-running-panel-MIT.txt'), read('LICENSE'),
]);
const example = buildContourSVG({ field: { seed: 451, controls: [[0.34,0.36,0.2,0.27],[0.7,0.62,0.25,-0.22]] },
  style: { alpha: 0.55, light: { enabled: true, color: '#b9701a', intensity: 0.7, angle: 35, width: 0.2, speed: 0.08 } } },
  { width: 600, height: 800, time: 12 });
await writeFile(path.join(root, 'example.svg'), example, 'utf8');
const code = [engine, project, photo, app.replace(/^import[^\n]+\n/gm, '')].map(source => source.replace(/^export /gm, '')).join('\n');
const notices = '等高线工坊 (Contour Workshop) license\n' + studioLicense.trimEnd() + '\n\nPULSE DSH Running Panel source notice\n' + sourceLicense.trimEnd();
const html = ('<!--\n' + notices + '\n-->\n' + template).replace('<link rel="stylesheet" href="./styles.css">', '<style>\n' + css + '\n</style>')
  .replace('href="./" aria-label=', 'href="#" aria-label=')
  .replace('<script type="module" src="./app.mjs"></script>', '<script type="module">\n' + code + '\n</script>');
await writeFile(path.join(root, '等高线工坊.html'), html, 'utf8');
console.log('Built 等高线工坊.html — standalone, offline, no external imports.');
