import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = 'ab409957844f70822222cf6d2f8c2c8bc8bab0a9';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist-confronto');
const marker = '.imprelio-confronto';
const markerText = 'output generato da npm run build:confronto\n';
const npmCli = process.env.npm_execpath;

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

async function rebase(file, links) {
  const source = await readFile(file, 'utf8');
  const seen = new Set();
  const html = source.replace(/<a\b[^>]*>/gi, (element) =>
    element.replace(/\bhref=(["'])([^"']*)\1/i, (attribute, quote, href) => {
      if (!Object.hasOwn(links, href)) return attribute;
      seen.add(href);
      return 'href=' + quote + links[href] + quote;
    }),
  );
  if (seen.size !== Object.keys(links).length) {
    throw new Error('Manca un link previsto in ' + file);
  }
  await writeFile(file, html);
}

async function buildVersion(directory, target) {
  run(process.execPath, [join(directory, 'node_modules/vite/bin/vite.js'),
    'build', '--base', './', '--outDir', target, '--emptyOutDir'], directory);
  await rebase(join(target, 'index.html'), { '/guida/': './guida/' });
  await rebase(join(target, 'guida/index.html'), {
    '/': '../', '/guida-imprelio.pdf': '../guida-imprelio.pdf',
  });
}

async function existingOutput() {
  try {
    return await lstat(output);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

if (!npmCli) throw new Error('Esegui npm run build:confronto.');

const temporary = await mkdtemp(join(tmpdir(), 'imprelio-confronto-'));
let staging;
let previous;
try {
  const priorSource = join(temporary, 'prima');
  const archive = join(temporary, 'prima.tar');
  await mkdir(priorSource);
  run('git', ['archive', '--format=tar', '--output=' + archive, baseline]);
  run('tar', ['-xf', archive, '-C', priorSource]);
  run(process.execPath, [npmCli, 'ci', '--include=dev', '--no-audit', '--no-fund',
    '--cache', join(tmpdir(), 'imprelio-landing-npm-cache')], priorSource);

  staging = await mkdtemp(join(root, '.dist-confronto-'));
  const next = join(staging, 'site');
  await buildVersion(priorSource, join(next, 'prima'));
  await buildVersion(root, join(next, 'dopo'));
  await copyFile(join(root, 'templates/confronto.html'), join(next, 'index.html'));
  await writeFile(join(next, marker), markerText);

  const current = await existingOutput();
  if (current) {
    if (!current.isDirectory() || (await readFile(join(output, marker), 'utf8').catch(() => '')) !== markerText) {
      throw new Error('dist-confronto esiste e non è riconosciuta come output generato.');
    }
    await rename(output, join(staging, 'precedente'));
    previous = join(staging, 'precedente');
  }

  try {
    await rename(next, output);
  } catch (error) {
    if (previous) {
      await rename(previous, output);
      previous = undefined;
    }
    throw error;
  }
  previous = undefined;
  console.log('Confronto pronto in dist-confronto/.');
} finally {
  await rm(temporary, { recursive: true, force: true });
  if (staging && !previous) await rm(staging, { recursive: true, force: true });
  if (previous) console.error('Output precedente conservato in ' + previous);
}
