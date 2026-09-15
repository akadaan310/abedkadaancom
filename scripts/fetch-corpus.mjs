/**
 * Build the working corpus from a named, licensed digital edition.
 *
 * Research material must be traceable to something a stranger can obtain and check
 * (§1, §29, §65). This script records exactly where the text came from, under what
 * licence, and the SHA-256 of the bytes it was built from, so that verification is a
 * checksum comparison rather than an act of faith.
 *
 * The licence permits verbatim redistribution and FORBIDS modification, so the text is
 * stored exactly as retrieved. Every normalization the laboratory performs is a declared
 * capability applied at compute time, never a change to the stored material.
 *
 *   node scripts/fetch-corpus.mjs
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const SOURCE = 'https://quran-json.risan.workers.dev/text/uthmani/quran.json';
const EDITION = 'Tanzil Quran Text (Uthmani), Copyright (C) 2007-2021 Tanzil Project, Creative Commons Attribution 3.0';

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`source returned ${res.status}`);
const bytes = Buffer.from(await res.arrayBuffer());
const sha256 = createHash('sha256').update(bytes).digest('hex');
const chapters = JSON.parse(bytes.toString('utf8'));

const loci = [];
for (const chapter of chapters) {
  for (const verse of chapter.verses) {
    loci.push({ address: [chapter.id, verse.id], ref: `${chapter.id}:${verse.id}`, text: verse.text });
  }
}

const file = {
  slug: 'tanzil-uthmani',
  title: 'Classical Arabic reference corpus — Tanzil Uthmani edition',
  language: 'ar',
  script: 'Arab',
  sourceVerification: 'UNVERIFIED_TRANSCRIPTION',
  sourceStatement:
    `Retrieved verbatim from a named digital edition: ${EDITION}. ` +
    `Source URL: ${SOURCE}. SHA-256 of the retrieved payload: ${sha256}. ` +
    `Rebuild with \`node scripts/fetch-corpus.mjs\`. ` +
    `This is a verbatim copy of a named edition, not an agent transcription — but §29 reserves ` +
    `the VERIFIED_AGAINST_EDITION declaration for a human researcher. Upgrading it is a checksum ` +
    `comparison against the Tanzil project's published text, not a re-reading. ` +
    `The licence permits verbatim copying and forbids modification, so the text is stored unchanged; ` +
    `all normalization happens in declared capabilities at compute time.`,
  dataVersion: `tanzil-uthmani-${sha256.slice(0, 12)}`,
  loci,
};

await writeFile('lab/corpus/data/tanzil-uthmani.json', JSON.stringify(file, null, 2) + '\n', 'utf8');
console.log(`wrote ${loci.length} loci across ${chapters.length} chapters`);
console.log(`dataVersion ${file.dataVersion}`);
