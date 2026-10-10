#!/usr/bin/env node
// Builds src/content/generated/decks.json from the verified TSV transcriptions in content/source.
// Fails (exit 1) on schema errors; prints warnings for entries that need a human look.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'content/decks.json'), 'utf8'));
const flags = JSON.parse(readFileSync(resolve(root, 'content/review-flags.json'), 'utf8')).flags;

const errors = [];
const warnings = [];
const DEVANAGARI_DIGITS = /[०-९]/;
const LATIN_DIGITS = /[0-9]/;
const ALLOWED = /^[ऀ-ॿ0-9 ()/\-–.,:]+$/u;

const key = (s) => s.normalize('NFC').replace(/\s+/g, '').replace(/[()]/g, '');

function parseTsv(path, deck) {
  const text = readFileSync(resolve(root, path), 'utf8');
  const cards = [];
  const seenPages = new Set();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const where = `${path}:${i + 1}`;
    const cols = line.split('\t');
    if (cols.length !== 3) {
      errors.push(`${where}: expected 3 tab-separated columns, got ${cols.length}`);
      return;
    }
    const [pageRaw, targetRaw, forbiddenRaw] = cols;
    const page = Number(pageRaw);
    if (!Number.isInteger(page) || page < 1) errors.push(`${where}: invalid page "${pageRaw}"`);
    if (seenPages.has(page)) errors.push(`${where}: page ${page} listed twice`);
    seenPages.add(page);

    const target = targetRaw.normalize('NFC').trim();
    const forbidden = forbiddenRaw.split(' | ').map((w) => w.normalize('NFC').trim());
    if (target !== targetRaw.trim()) warnings.push(`${where}: target was not NFC-normalised in source`);
    if (!target) errors.push(`${where}: empty target`);
    if (forbidden.length === 0 || forbidden.some((w) => !w)) errors.push(`${where}: empty forbidden word`);
    if (forbidden.length !== 4) warnings.push(`${where}: ${forbidden.length} forbidden words (most cards have 4)`);
    if (new Set(forbidden.map(key)).size !== forbidden.length) errors.push(`${where}: duplicate forbidden word on same card`);
    if (forbidden.some((w) => key(w) === key(target))) errors.push(`${where}: target repeated as forbidden word`);
    for (const w of [target, ...forbidden]) {
      if (!ALLOWED.test(w)) warnings.push(`${where}: unexpected characters in "${w}"`);
      if (LATIN_DIGITS.test(w)) warnings.push(`${where}: Latin digits in "${w}" (other cards use Devanagari digits)`);
    }
    cards.push({
      id: `${deck.id}-${String(page).padStart(3, '0')}`,
      deckId: deck.id,
      target,
      forbidden,
      source: { pdf: deck.sourcePdf, page },
    });
  });
  return cards;
}

const decks = manifest.decks.map((d) => {
  if (!/^[a-z0-9]+$/.test(d.id)) errors.push(`deck id "${d.id}" must be lowercase alphanumeric`);
  const cards = parseTsv(d.source, d);
  return { id: d.id, title: d.title, sourcePdf: d.sourcePdf, alsoIn: d.alsoIn ?? [], cards };
});

if (new Set(decks.map((d) => d.id)).size !== decks.length) errors.push('duplicate deck ids');

// Cross-card checks
const all = decks.flatMap((d) => d.cards);
const byTarget = new Map();
for (const c of all) {
  const k = key(c.target);
  byTarget.set(k, [...(byTarget.get(k) ?? []), c.id]);
}
for (const [, ids] of byTarget) if (ids.length > 1) warnings.push(`duplicate target across cards: ${ids.join(', ')}`);

const byExact = new Map();
for (const c of all) {
  const k = [key(c.target), ...c.forbidden.map(key).sort()].join('|');
  if (byExact.has(k)) errors.push(`identical card: ${byExact.get(k)} and ${c.id}`);
  byExact.set(k, c.id);
}
const ids = new Set(all.map((c) => c.id));
for (const f of flags) if (!ids.has(f.cardId)) errors.push(`review flag references unknown card ${f.cardId}`);
const mixedDigits = all.some((c) => DEVANAGARI_DIGITS.test(c.target + c.forbidden.join(''))) && all.some((c) => LATIN_DIGITS.test(c.target + c.forbidden.join('')));
if (mixedDigits) warnings.push('content mixes Devanagari and Latin digits');

const out = {
  schemaVersion: 1,
  generatedBy: 'scripts/build-content.mjs',
  decks,
};
const outPath = resolve(root, 'src/content/generated/decks.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

const summary = decks.map((d) => `${d.id}: ${d.cards.length} cards`).join(', ');
console.log(`content: ${decks.length} decks, ${all.length} cards (${summary})`);
console.log(`content: ${flags.length} entries flagged for human review (content/review-flags.json)`);
for (const w of warnings) console.log(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}
