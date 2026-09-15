/**
 * Research material. Constitution §1 (research material), §38 (multi-scale), §87.
 *
 * A corpus enters the laboratory with an explicit verification status. Nothing here
 * upgrades that status: only a human researcher can declare a text verified (§29), and
 * the promotion gate in `lab/engine/promote.ts` refuses to make anything canonical that
 * rests on an unverified transcription.
 */
import { readFile } from 'node:fs/promises';
import { contentId } from '../ontology/canonical';
import { rng, seedFrom, shuffled } from '../capabilities/rng';
import type { Corpus, Locus, SourceVerification, Word } from '../ontology/types';

export interface CorpusFile {
  readonly slug: string;
  readonly title: string;
  readonly language: string;
  readonly script: string;
  readonly sourceVerification: SourceVerification;
  readonly sourceStatement: string;
  readonly dataVersion: string;
  readonly loci: readonly { readonly address: readonly number[]; readonly ref: string; readonly text: string }[];
}

/** Whitespace tokenization. The Word scale of §38; morphology is a declared gap (§90). */
export function tokenize(text: string): string[] {
  return text.split(/\s+/u).map((t) => t.trim()).filter((t) => t.length > 0);
}

export function buildCorpus(file: CorpusFile): Corpus {
  const corpusId = contentId('cor', {
    slug: file.slug,
    dataVersion: file.dataVersion,
    loci: file.loci.map((l) => [l.ref, l.text]),
  });

  const loci: Locus[] = file.loci.map((l) => {
    const locusId = contentId('loc', { corpus: file.slug, ref: l.ref, text: l.text });
    const words: Word[] = tokenize(l.text).map((surface, index) => ({
      kind: 'Word' as const,
      id: contentId('wrd', { locusId, index, surface }),
      locusId,
      index,
      surface,
    }));
    return {
      kind: 'Locus' as const,
      id: locusId,
      corpusSlug: file.slug,
      address: l.address,
      ref: l.ref,
      text: l.text,
      words,
    };
  });

  return {
    kind: 'Corpus',
    id: corpusId,
    slug: file.slug,
    title: file.title,
    language: file.language,
    script: file.script,
    sourceVerification: file.sourceVerification,
    sourceStatement: file.sourceStatement,
    dataVersion: file.dataVersion,
    loci,
    epistemicType: 'EXISTING',
  };
}

export async function loadCorpusFile(path: string): Promise<Corpus> {
  const raw = await readFile(path, 'utf8');
  const file = JSON.parse(raw) as CorpusFile;
  return buildCorpus(file);
}

/** Material whose findings may never be published without a human verifying the source. §29, §95 */
export function requiresVerificationBeforePublication(corpus: Corpus): boolean {
  return corpus.sourceVerification !== 'VERIFIED_AGAINST_EDITION';
}

// ---------------------------------------------------------------------------
// Synthetic controls
// ---------------------------------------------------------------------------

/**
 * A corpus with *known* planted structure, and one with none.
 *
 * These are method-testing instruments, not research material, and are marked SYNTHETIC
 * so they can never be mistaken for a source text. They give the laboratory something
 * the constitution repeatedly demands but rarely gets for free: a positive control (does
 * the engine find structure that is really there?) and a negative control (does it stay
 * silent when there is none?), which is how §47's false-positive rate becomes measurable.
 */
export interface SyntheticSpec {
  readonly slug: string;
  readonly seed: number;
  readonly groups: number;
  readonly lociPerGroup: number;
  readonly wordsPerLocus: number;
  /** 0 = no planted structure at all; 1 = every word drawn from the group's own lexicon. */
  readonly cohesion: number;
}

const SYNTH_ALPHABET = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');

function syntheticLexicon(next: () => number, size: number, length: number): string[] {
  const words = new Set<string>();
  while (words.size < size) {
    let w = '';
    for (let i = 0; i < length; i++) {
      w += SYNTH_ALPHABET[Math.floor(next() * SYNTH_ALPHABET.length)]!;
    }
    words.add(w);
  }
  return [...words];
}

export function synthesizeCorpus(spec: SyntheticSpec): { corpus: Corpus; plantedGroups: readonly (readonly string[])[] } {
  const next = rng(spec.seed);
  const shared = syntheticLexicon(next, 24, 4);
  const lexicons = Array.from({ length: spec.groups }, () => syntheticLexicon(next, 12, 4));

  const loci: CorpusFile['loci'][number][] = [];
  const planted: string[][] = Array.from({ length: spec.groups }, () => []);

  for (let g = 0; g < spec.groups; g++) {
    for (let i = 0; i < spec.lociPerGroup; i++) {
      const words: string[] = [];
      for (let w = 0; w < spec.wordsPerLocus; w++) {
        const pool = next() < spec.cohesion ? lexicons[g]! : shared;
        words.push(pool[Math.floor(next() * pool.length)]!);
      }
      const ref = `${g + 1}:${i + 1}`;
      loci.push({ address: [g + 1, i + 1], ref, text: words.join(' ') });
      planted[g]!.push(ref);
    }
  }

  const file: CorpusFile = {
    slug: spec.slug,
    title: `Synthetic control corpus (${spec.groups} groups, cohesion ${spec.cohesion})`,
    language: 'synthetic',
    script: 'Arab',
    sourceVerification: 'SYNTHETIC',
    sourceStatement:
      `Constructed by lab/corpus/loader.ts#synthesizeCorpus with seed ${spec.seed} and cohesion ` +
      `${spec.cohesion}. This is a method-testing instrument with known ground truth, not research material.`,
    dataVersion: `synthetic-${spec.seed}-${spec.cohesion}`,
    loci: shuffled(loci, rng(seedFrom(['order', spec.seed]))),
  };

  const corpus = buildCorpus(file);
  const refToId = new Map(corpus.loci.map((l) => [l.ref, l.id]));
  return {
    corpus,
    plantedGroups: planted.map((refs) => refs.map((r) => refToId.get(r)!).filter(Boolean)),
  };
}
