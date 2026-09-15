/**
 * §13 and §49: transformation claims must be testable, and tests protect claims, not just
 * code. Each declaration in the registry is checked against what the code actually does.
 */
import { describe, expect, it } from 'vitest';
import { normalizeArabic, rejoinDiacritics, splitDiacritics, rasmSkeleton } from '@lab/capabilities/arabic';
import { buildRegistry } from '@lab/capabilities/registry';
import { loadCorpusFile } from '@lab/corpus/loader';
import { computeContext, type LabValue } from '@lab/capabilities/kernel';

const SAMPLES = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'قُلْ هُوَ اللَّهُ أَحَدٌ',
  'مَالِكِ يَوْمِ الدِّينِ',
];

describe('text.diacritics.split declares INVERTIBLE', () => {
  it('round-trips every sample exactly', () => {
    for (const s of SAMPLES) {
      const { base, removed } = splitDiacritics(s);
      expect(rejoinDiacritics(base, removed)).toBe(s);
    }
  });

  it('round-trips text that carries no marks at all', () => {
    const s = 'قل هو الله أحد';
    const { base, removed } = splitDiacritics(s);
    expect(removed).toHaveLength(0);
    expect(rejoinDiacritics(base, removed)).toBe(s);
  });
});

describe('text.normalize.arabic declares LOSSY', () => {
  it('is genuinely not invertible: distinct inputs collapse onto one output', () => {
    const collapsed = new Set(['أحد', 'احد', 'إحد'].map(normalizeArabic));
    expect(collapsed.size).toBe(1);
  });

  it('discards exactly what it says it discards', () => {
    expect(normalizeArabic('الرَّحْمَٰنِ')).not.toContain('ّ');
    expect(normalizeArabic('صلاة')).toContain('ه'); // ta marbuta → ha
    expect(normalizeArabic('علىٰ')).toContain('ي'); // alef maqsura → ya
  });

  it('preserves word count, as declared', () => {
    for (const s of SAMPLES) {
      expect(normalizeArabic(s).split(' ').length).toBe(s.split(' ').length);
    }
  });
});

describe('text.rasm_skeleton declares LOSSY', () => {
  it('collapses letters that share an undotted shape', () => {
    expect(new Set(['ب', 'ت', 'ث', 'ن'].map(rasmSkeleton)).size).toBe(1);
    expect(new Set(['ج', 'ح', 'خ'].map(rasmSkeleton)).size).toBe(1);
    expect(rasmSkeleton('ف')).toBe(rasmSkeleton('ق'));
    // Letters with different shapes must stay distinct, or the instrument is useless.
    expect(rasmSkeleton('ب')).not.toBe(rasmSkeleton('ج'));
  });
});

describe('every declared transform is honest about invertibility', () => {
  it('no capability claims INVERTIBLE while merging distinct inputs on the real corpus', async () => {
    const corpus = await loadCorpusFile('lab/corpus/data/quran-short-surahs.json');
    const registry = buildRegistry();
    const ctx = computeContext({
      now: new Date().toISOString(),
      actor: { kind: 'ENGINE', engineId: 'test', engineVersion: 1 },
      corpora: new Map([[corpus.slug, corpus]]),
      sources: { [corpus.slug]: corpus.dataVersion },
      seed: 1,
      engineId: 'test',
      engineVersion: 1,
    });
    const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };

    for (const cap of registry.all()) {
      if (cap.transform?.invertibility !== 'INVERTIBLE') continue;
      if (!cap.inputs.includes('LocusSet')) continue;
      const out = cap.run([input], {}, ctx);
      if (out.type !== 'TextSet') continue;
      for (const item of out.items) {
        const original = corpus.loci.find((l) => l.id === item.id)!;
        expect(rejoinDiacritics(item.text, item.removed ?? [])).toBe(original.text);
      }
    }
  });
});
