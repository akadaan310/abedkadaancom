/**
 * Arabic text capabilities. Constitution §13 (observables and transformations), §39.
 *
 * Every transform here declares what it preserves, what it discards, and whether it is
 * invertible — and each declaration is an assertion the test suite checks (§13, §49).
 * Two are deliberately paired: a *recording* split that claims INVERTIBLE and proves it
 * by exact round-trip, and a normalization that claims LOSSY and is proven lossy. A
 * declaration that cannot be tested is not evidence.
 */
import type { Capability, LabValue, TextItem } from './kernel';
import { cfgBool, cfgString, id } from './kernel';
import { tokenize } from '../corpus/loader';

/** Combining marks: tashkeel, superscript alef, Qur'anic annotation signs, and tatweel. */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/u;

export function isMark(ch: string): boolean {
  return MARKS.test(ch);
}

/**
 * Split a string into its mark-free base and the exact positions of every removed mark.
 * Because positions are kept, `rejoinDiacritics` restores the original character for
 * character — the INVERTIBLE claim in the declaration below is therefore testable.
 */
export function splitDiacritics(text: string): { base: string; removed: { index: number; mark: string }[] } {
  const chars = [...text];
  let base = '';
  const removed: { index: number; mark: string }[] = [];
  for (const ch of chars) {
    if (isMark(ch)) {
      // index is the position in the *original* string, so reinsertion is unambiguous.
      removed.push({ index: base.length + removed.length, mark: ch });
    } else {
      base += ch;
    }
  }
  return { base, removed };
}

export function rejoinDiacritics(base: string, removed: readonly { index: number; mark: string }[]): string {
  const out = [...base];
  for (const { index, mark } of [...removed].sort((a, b) => a.index - b.index)) {
    out.splice(index, 0, mark);
  }
  return out.join('');
}

/**
 * Orthographic normalization: unify alef carriers, ya/alef-maqsura, ta-marbuta,
 * and hamza carriers. This genuinely destroys information — which is the point of
 * declaring it LOSSY and of the information-loss measurement capability.
 */
const NORMALIZE_MAP: Record<string, string> = {
  'آ': 'ا', // آ
  'أ': 'ا', // أ
  'إ': 'ا', // إ
  'ٱ': 'ا', // ٱ
  'ى': 'ي', // ى
  'ة': 'ه', // ة
  'ؤ': 'و', // ؤ
  'ئ': 'ي', // ئ
  'ء': '', // ء
};

export function normalizeArabic(text: string): string {
  const { base } = splitDiacritics(text);
  let out = '';
  for (const ch of base) {
    const mapped = NORMALIZE_MAP[ch];
    out += mapped === undefined ? ch : mapped;
  }
  return out.replace(/\s+/gu, ' ').trim();
}

/**
 * Consonantal skeleton: collapse letters that share an undotted rasm shape.
 * A coarse, explicitly approximate instrument — the laboratory records that it is an
 * approximation rather than implying a manuscript-accurate rasm (§86, §90).
 */
const RASM_CLASSES: Record<string, string> = {
  'ب': 'ٮ', 'ت': 'ٮ', 'ث': 'ٮ', 'ن': 'ٮ', 'ي': 'ٮ',
  'ج': 'ح', 'ح': 'ح', 'خ': 'ح',
  'د': 'د', 'ذ': 'د',
  'ر': 'ر', 'ز': 'ر',
  'س': 'س', 'ش': 'س',
  'ص': 'ص', 'ض': 'ص',
  'ط': 'ط', 'ظ': 'ط',
  'ع': 'ع', 'غ': 'ع',
  'ف': 'ڡ', 'ق': 'ڡ',
};

export function rasmSkeleton(text: string): string {
  let out = '';
  for (const ch of normalizeArabic(text)) {
    out += RASM_CLASSES[ch] ?? ch;
  }
  return out;
}

function textItemsFrom(value: LabValue): { corpusSlug: string; items: readonly TextItem[] } {
  if (value.type === 'LocusSet') {
    return {
      corpusSlug: value.corpusSlug,
      items: value.loci.map((l) => ({ id: l.id, ref: l.ref, text: l.text })),
    };
  }
  if (value.type === 'TextSet') return { corpusSlug: value.corpusSlug, items: value.items };
  throw new Error(`expected LocusSet or TextSet, received ${value.type}`);
}

export const selectLoci: Capability = {
  name: 'corpus.select_loci',
  purpose: 'Select loci from an admitted corpus, optionally restricted to one address prefix.',
  inputs: ['LocusSet'],
  output: 'LocusSet',
  configKeys: [
    { key: 'addressPrefix', type: 'number|null', default: null, note: 'Keep only loci whose first address component matches.' },
    { key: 'exclude', type: 'number|null', default: null, note: 'Drop loci whose first address component matches (holdout tests).' },
  ],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  run(inputs, config) {
    const input = inputs[0];
    if (!input || input.type !== 'LocusSet') throw new Error('corpus.select_loci requires a LocusSet');
    const prefix = config['addressPrefix'];
    const exclude = config['exclude'];
    const loci = input.loci.filter((l) => {
      const head = l.address[0];
      if (typeof prefix === 'number' && head !== prefix) return false;
      if (typeof exclude === 'number' && head === exclude) return false;
      return true;
    });
    return { type: 'LocusSet', corpusSlug: input.corpusSlug, loci };
  },
};

export const diacriticsSplit: Capability = {
  name: 'text.diacritics.split',
  purpose: 'Separate Arabic text into its mark-free base and the exact marks removed, so the split is reversible.',
  inputs: ['LocusSet'],
  output: 'TextSet',
  configKeys: [],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  transform: {
    kind: 'TransformDeclaration',
    capability: 'text.diacritics.split',
    operation: 'recording removal of combining marks',
    inputType: 'Arabic string',
    outputType: 'Arabic string + positioned mark list',
    preserves: ['consonantal base', 'mark identity', 'mark position', 'word order', 'character order'],
    discards: [],
    invertibility: 'INVERTIBLE',
    conditions: ['marks are recorded with their original positions', 'no normalization is applied'],
  },
  run(inputs, _config, _ctx) {
    const { corpusSlug, items } = textItemsFrom(inputs[0]!);
    return {
      type: 'TextSet',
      corpusSlug,
      items: items.map((it) => {
        const { base, removed } = splitDiacritics(it.text);
        return { id: it.id, ref: it.ref, text: base, removed };
      }),
    };
  },
};

export const normalizeCapability: Capability = {
  name: 'text.normalize.arabic',
  purpose: 'Normalize Arabic orthography: drop marks, unify alef and hamza carriers, alef maqsura, ta marbuta.',
  inputs: ['LocusSet'],
  output: 'TextSet',
  configKeys: [
    { key: 'collapseRasm', type: 'boolean', default: false, note: 'Additionally collapse letters sharing an undotted shape.' },
  ],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  transform: {
    kind: 'TransformDeclaration',
    capability: 'text.normalize.arabic',
    operation: 'orthographic normalization',
    inputType: 'Arabic string',
    outputType: 'normalized Arabic string',
    preserves: ['word order', 'word count', 'consonantal sequence up to carrier identity'],
    discards: ['vocalization', 'hamza carrier identity', 'alef maqsura vs ya', 'ta marbuta vs ha', 'tatweel'],
    invertibility: 'LOSSY',
    conditions: ['distinct inputs may map to identical outputs; the mapping is many-to-one'],
  },
  run(inputs, config) {
    const { corpusSlug, items } = textItemsFrom(inputs[0]!);
    const rasm = cfgBool(config, 'collapseRasm', false);
    return {
      type: 'TextSet',
      corpusSlug,
      items: items.map((it) => ({
        id: it.id,
        ref: it.ref,
        text: rasm ? rasmSkeleton(it.text) : normalizeArabic(it.text),
      })),
    };
  },
};

export const skeletonCapability: Capability = {
  name: 'text.rasm_skeleton',
  purpose: 'Collapse Arabic text to an approximate undotted consonantal skeleton.',
  inputs: ['LocusSet'],
  output: 'TextSet',
  configKeys: [],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['text.normalize.arabic'],
  transform: {
    kind: 'TransformDeclaration',
    capability: 'text.rasm_skeleton',
    operation: 'approximate rasm collapse',
    inputType: 'Arabic string',
    outputType: 'undotted skeleton string',
    preserves: ['letter count', 'word order', 'stroke-shape class'],
    discards: ['dotting', 'vocalization', 'carrier identity'],
    invertibility: 'LOSSY',
    conditions: [
      'this is an approximation of rasm by shape class, not a manuscript-accurate rasm',
      'ligature and positional-form effects are not modelled',
    ],
  },
  run(inputs) {
    const { corpusSlug, items } = textItemsFrom(inputs[0]!);
    return {
      type: 'TextSet',
      corpusSlug,
      items: items.map((it) => ({ id: it.id, ref: it.ref, text: rasmSkeleton(it.text) })),
    };
  },
};

export const tokenizeCapability: Capability = {
  name: 'text.tokenize',
  purpose: 'Split text into whitespace-delimited word tokens.',
  inputs: ['TextSet'],
  output: 'TokenSet',
  configKeys: [
    { key: 'unique', type: 'boolean', default: false, note: 'Collapse to the type set rather than the token sequence.' },
  ],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  transform: {
    kind: 'TransformDeclaration',
    capability: 'text.tokenize',
    operation: 'whitespace tokenization',
    inputType: 'string',
    outputType: 'token list',
    preserves: ['token order', 'token surface'],
    discards: ['whitespace width', 'line structure'],
    invertibility: 'LOSSY',
    conditions: ['no morphological segmentation is performed; clitics remain attached'],
  },
  run(inputs, config) {
    const input = inputs[0];
    if (!input || input.type !== 'TextSet') throw new Error('text.tokenize requires a TextSet');
    const unique = cfgBool(config, 'unique', false);
    return {
      type: 'TokenSet',
      corpusSlug: input.corpusSlug,
      items: input.items.map((it) => {
        const tokens = tokenize(it.text);
        return { id: it.id, ref: it.ref, tokens: unique ? [...new Set(tokens)] : tokens };
      }),
    };
  },
};

/** An Observable over characters. §13: it says what it retains and what it throws away. */
export const letterProfile: Capability = {
  name: 'observable.letter_profile',
  purpose: 'Observe each locus as a normalized letter-frequency vector.',
  inputs: ['TextSet'],
  output: 'ProfileSet',
  configKeys: [
    { key: 'normalize', type: 'boolean', default: true, note: 'Divide counts by length, so long and short loci stay comparable.' },
  ],
  costUnits: 1,
  latencyHintMs: 2,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'TextSet') throw new Error('observable.letter_profile requires a TextSet');
    const normalize = cfgBool(config, 'normalize', true);
    const observables = [];
    const items = [];
    for (const it of input.items) {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const ch of it.text.replace(/\s+/gu, '')) {
        counts[ch] = (counts[ch] ?? 0) + 1;
        total += 1;
      }
      const vector: Record<string, number> = {};
      for (const [k, v] of Object.entries(counts)) vector[k] = normalize && total > 0 ? v / total : v;
      items.push({ id: it.id, ref: it.ref, vector });
      observables.push({
        kind: 'Observable' as const,
        id: id('obs', { cap: 'observable.letter_profile', subject: it.id, vector }),
        capability: 'observable.letter_profile',
        subjectId: it.id,
        observes: `letter frequency of ${it.ref}`,
        retains: ['letter identity', 'letter frequency', normalize ? 'relative proportion' : 'raw count'],
        discards: ['letter order', 'word boundaries', 'word identity', 'syntax'],
        value: vector,
        provenance: ctx.prov({ parents: [it.id], derivation: ['observable.letter_profile'], configuration: { normalize } }),
        epistemicType: 'COMPUTED' as const,
      });
    }
    return { type: 'ProfileSet', corpusSlug: input.corpusSlug, items, observables };
  },
};

export const lengthProfile: Capability = {
  name: 'observable.length',
  purpose: 'Observe each locus as its token count and character count.',
  inputs: ['TokenSet'],
  output: 'ProfileSet',
  configKeys: [],
  costUnits: 1,
  latencyHintMs: 1,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  run(inputs, _config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'TokenSet') throw new Error('observable.length requires a TokenSet');
    const items = [];
    const observables = [];
    for (const it of input.items) {
      const vector = {
        tokens: it.tokens.length,
        characters: it.tokens.join('').length,
      };
      items.push({ id: it.id, ref: it.ref, vector });
      observables.push({
        kind: 'Observable' as const,
        id: id('obs', { cap: 'observable.length', subject: it.id, vector }),
        capability: 'observable.length',
        subjectId: it.id,
        observes: `extent of ${it.ref}`,
        retains: ['token count', 'character count'],
        discards: ['every lexical and structural property'],
        value: vector,
        provenance: ctx.prov({ parents: [it.id], derivation: ['observable.length'] }),
        epistemicType: 'COMPUTED' as const,
      });
    }
    return { type: 'ProfileSet', corpusSlug: input.corpusSlug, items, observables };
  },
};

export const arabicCapabilities: readonly Capability[] = [
  selectLoci,
  diacriticsSplit,
  normalizeCapability,
  skeletonCapability,
  tokenizeCapability,
  letterProfile,
  lengthProfile,
];

export { cfgString };
