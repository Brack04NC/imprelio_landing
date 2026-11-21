import { access, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const pages = ['/index.html', '/guida/index.html'];
const origin = 'https://imprelio.local';
const indexPath = (pathname) => pathname.endsWith('/') ? pathname + 'index.html' : pathname;
const errors = [];

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function isInsideProject(path) {
  const pathFromRoot = relative(projectRoot, path);
  return pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`);
}

async function isFile(path) {
  try {
    await access(path);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function validateUrl(value, attribute) {
  if (!value || value !== value.trim()) {
    errors.push(`${attribute} vuoto o con spazi esterni: "${value}"`);
    return false;
  }

  if (value === '#') {
    errors.push(`${attribute} usa un fragment vuoto: "${value}"`);
    return false;
  }

  if (/[<>{}|\\]/.test(value) || /^(?:https?|mailto|tel);/i.test(value)) {
    errors.push(`${attribute} malformato: "${value}"`);
    return false;
  }

  if (value.startsWith('//')) {
    try {
      const url = new URL(`https:${value}`);
      if (!url.hostname) throw new Error('hostname mancante');
      return false;
    } catch {
      errors.push(`${attribute} esterno malformato: "${value}"`);
      return false;
    }
  }

  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (!url.hostname || !['http:', 'https:'].includes(url.protocol)) {
        throw new Error('URL non valido');
      }
    } catch {
      errors.push(`${attribute} esterno malformato: "${value}"`);
    }
    return false;
  }

  if (value.startsWith('mailto:')) {
    if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+(?:\?.*)?$/i.test(value)) {
      errors.push(`indirizzo email malformato: "${value}"`);
    }
    return false;
  }

  if (value.startsWith('tel:')) {
    if (!/^tel:\+?[\d().\s-]{6,}$/i.test(value)) {
      errors.push(`numero telefonico malformato: "${value}"`);
    }
    return false;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    errors.push(`protocollo non consentito in ${attribute}: "${value}"`);
    return false;
  }

  return !value.startsWith('#');
}

function localCandidates(url) {
  let pathname;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    errors.push(`percorso locale con escape non valido: "${url.pathname}"`);
    return [];
  }

  const cleanPath = indexPath(pathname).replace(/^\/+/, '');
  const directPath = resolve(projectRoot, cleanPath);
  const publicPath = resolve(projectRoot, 'public', cleanPath);
  const candidates = cleanPath.startsWith('src/')
    ? [directPath]
    : [publicPath, directPath];

  const safeCandidates = candidates.filter(isInsideProject);
  if (safeCandidates.length !== candidates.length) {
    errors.push(`percorso locale fuori dal progetto: "${url.pathname}"`);
  }
  return safeCandidates;
}

const placeholderPatterns = [
  [/\b(?:TODO|TBD|FIXME)\b/i, 'marcatore TODO/TBD/FIXME'],
  [/lorem\s+ipsum/i, 'testo Lorem ipsum'],
  [
    /(?:example\.(?:com|org|net)|placeholder\.(?:com|test)|\[(?:placeholder|insert [^\]]+)\])/i,
    'dominio o testo placeholder',
  ],
  [/\{\{[^}]+\}\}|\$\{[^}]+\}/, 'segnaposto di template'],
  [/javascript\s*:/i, 'URL JavaScript'],
  [/<!-- GUIDE_CHAPTERS -->/, 'capitoli della guida mancanti'],
];

function readIds(html, pathname) {
  const ids = new Set();
  for (const match of html.matchAll(/\bid\s*=\s*(["'])([^"']+)\1/gi)) {
    const id = decodeHtml(match[2]);
    if (ids.has(id)) errors.push(`${pathname} ha un id duplicato: "${id}"`);
    ids.add(id);
  }
  return ids;
}

const documents = new Map();
for (const pathname of pages) {
  try {
    const html = await readFile(resolve(projectRoot, pathname.slice(1)), 'utf8');
    documents.set(pathname, { html, ids: readIds(html, pathname) });
  } catch (error) {
    errors.push(`Impossibile leggere ${pathname}: ${error.message}`);
  }
}

async function verifyPage(pathname, html) {
  for (const [pattern, label] of placeholderPatterns) {
    if (pattern.test(html)) errors.push(`${pathname}: trovato ${label}`);
  }

  const references = [];
  for (const match of html.matchAll(/\b(href|src|srcset)\s*=\s*(["'])(.*?)\2/gi)) {
    const attribute = match[1].toLowerCase();
    const rawValue = decodeHtml(match[3]);

    if (attribute !== 'srcset') {
      references.push({ attribute, value: rawValue });
      continue;
    }

    for (const candidate of rawValue.split(',')) {
      const [value, descriptor, ...extra] = candidate.trim().split(/\s+/);
      if (!value || extra.length > 0 || (descriptor && !/^(?:\d+w|\d*\.?\d+x)$/.test(descriptor))) {
        errors.push(`srcset malformato: "${rawValue}"`);
        continue;
      }
      references.push({ attribute, value });
    }
  }

  for (const { attribute, value } of references) {
    const isLocalFile = validateUrl(value, attribute);

    let parsed;
    try {
      parsed = new URL(value, origin + pathname);
    } catch {
      errors.push(`${attribute} non interpretabile: "${value}"`);
      continue;
    }

    const targetPage = parsed.origin === origin && documents.get(indexPath(parsed.pathname));
    if (targetPage && parsed.hash) {
      let target;
      try {
        target = decodeURIComponent(parsed.hash.slice(1));
      } catch {
        errors.push(`fragment con escape non valido: "${value}"`);
        continue;
      }
      if (!target || !targetPage.ids.has(target)) {
        errors.push(`fragment senza id corrispondente: "${value}"`);
      }
    }

    if (!isLocalFile) continue;
    const candidates = localCandidates(parsed);
    if (!(await Promise.all(candidates.map(isFile))).some(Boolean)) {
      errors.push(`risorsa locale non trovata (${attribute}="${value}")`);
    }
  }

  if (references.length === 0) errors.push(`nessun href o src trovato in ${pathname}`);
  return references.length;
}

let referenceCount = 0;
let idCount = 0;
for (const [pathname, { html, ids }] of documents) {
  referenceCount += await verifyPage(pathname, html);
  idCount += ids.size;
}

const pdfPath = join(projectRoot, 'public', 'guida-imprelio.pdf');
if (await isFile(pdfPath)) {
  const pdf = await readFile(pdfPath);
  if (pdf.subarray(0, 5).toString() !== '%PDF-') errors.push('guida-imprelio.pdf non è un PDF valido');
}

if (errors.length > 0) {
  console.error('Verifica fallita:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Verifica completata: ${referenceCount} riferimenti, ${idCount} id e risorse locali valide.`,
);
