/**
 * §20 and §49: the null model is what separates "a pattern was detected" from "a pattern
 * exceeds chance". These tests use synthetic corpora with known ground truth, so the
 * instruments themselves are validated rather than assumed.
 */
import { describe, expect, it } from 'vitest';
import { synthesizeCorpus } from '@lab/corpus/loader';
import { buildRegistry } from '@lab/capabilities/registry';
import { computeContext, type LabValue } from '@lab/capabilities/kernel';
import { permutationTest } from '@lab/capabilities/measurement';

function runPipeline(cohesion: number, seed = 42) {
  const { corpus } = synthesizeCorpus({
    slug: `synthetic-${cohesion}`,
    seed: 7,
    groups: 3,
    lociPerGroup: 8,
    wordsPerLocus: 6,
    cohesion,
  });
  const registry = buildRegistry();
  const ctx = computeContext({
    now: '2026-01-01T00:00:00.000Z',
    actor: { kind: 'ENGINE', engineId: 'test', engineVersion: 1 },
    corpora: new Map([[corpus.slug, corpus]]),
    sources: { [corpus.slug]: corpus.dataVersion },
    seed,
    engineId: 'test',
    engineVersion: 1,
  });
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const profiles = registry.require('observable.letter_profile').run([norm], {}, ctx);
  const relations = registry.require('relation.cosine_profile').run([profiles], { threshold: 0.75 }, ctx);
  const graph = registry.require('structure.threshold_graph').run([relations], {}, ctx);
  const communities = registry.require('structure.communities').run([graph], {}, ctx);
  const measured = registry.require('measure.modularity').run([communities], { iterations: 300 }, ctx);
  if (measured.type !== 'MeasurementSet') throw new Error('expected measurements');
  return Object.fromEntries(measured.measurements.map((m) => [m.statistic, m]));
}

describe('the modularity null model discriminates real structure from none', () => {
  it('finds planted structure in the positive control', () => {
    const m = runPipeline(0.95)['newman_modularity']!;
    expect(m.nullModel).toBeDefined();
    expect(m.nullModel!.exceedsNull).toBe(true);
  });

  it('does NOT find structure in the negative control', () => {
    // The decisive test. A modularity-maximizing detector scores highly on structureless
    // data too, so a null model that cannot reject this case is not a null model at all.
    const m = runPipeline(0)['newman_modularity']!;
    expect(m.nullModel!.exceedsNull).toBe(false);
  });

  it('keeps the inadequate label-permutation null visible as a control, and it fails here', () => {
    const control = runPipeline(0)['newman_modularity_label_permutation_control']!;
    // Recorded precisely because it reports significance on structureless data.
    expect(control.nullModel!.exceedsNull).toBe(true);
    expect(control.interpretationGuard).toContain('CONTROL, NOT A FINDING');
  });

  it('reports partition degeneracy alongside modularity', () => {
    expect(runPipeline(0.95)['partition_nondegeneracy']).toBeDefined();
  });
});

describe('permutation p-values are bounded, never zero', () => {
  it('cannot claim p = 0 however extreme the observation', () => {
    const result = permutationTest({
      model: 'test',
      description: 'test',
      observed: 1e9,
      iterations: 100,
      seed: 1,
      alpha: 0.05,
      draw: () => 0,
    });
    expect(result.pValue).toBeGreaterThan(0);
    expect(result.pValue).toBeCloseTo(1 / 101, 6);
  });
});

describe('measurements are reproducible from their recorded seed', () => {
  it('produces identical values on a re-run', () => {
    const a = runPipeline(0.95, 99)['newman_modularity']!;
    const b = runPipeline(0.95, 99)['newman_modularity']!;
    expect(b.value).toBe(a.value);
    expect(b.nullModel!.pValue).toBe(a.nullModel!.pValue);
    expect(b.id).toBe(a.id);
  });
});
