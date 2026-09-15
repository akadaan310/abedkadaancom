/**
 * §20: a shape is not a finding until it has been compared against something.
 *
 * The positive cases check that the classifier describes geometry correctly. The negative
 * control checks the thing that actually matters — that a cloud with no preferred
 * direction is not reported as having one. The Engine SDK this method came from shipped
 * the classifier with no null model and no such control; see docs/SDK-INVESTIGATION.md.
 */
import { describe, expect, it } from 'vitest';
import { principalShape, symmetricEigenvalues, principalShapeCapability } from '@lab/capabilities/geometry';
import { computeContext, type LabValue } from '@lab/capabilities/kernel';
import { rng } from '@lab/capabilities/rng';
import { provenance } from '@lab/provenance/provenance';

function ctxFor(seed: number) {
  return computeContext({
    now: new Date().toISOString(),
    actor: { kind: 'ENGINE', engineId: 'test', engineVersion: 1 },
    corpora: new Map(),
    sources: {},
    seed,
    engineId: 'test',
    engineVersion: 1,
  });
}

function embeddingOf(points: readonly (readonly number[])[]): LabValue {
  return {
    type: 'EmbeddingValue',
    embedding: {
      kind: 'Embedding',
      id: 'emb_test',
      method: 'fixture',
      dimensions: points[0]!.length,
      fromStructureId: 'str_test',
      basis: 'fixture',
      seed: 1,
      points: points.map((coords, i) => ({ id: `n${i}`, coords })),
      provenance: provenance({
        creator: { kind: 'ENGINE', engineId: 'test', engineVersion: 1 },
        sources: {},
        derivation: ['fixture'],
        timestamp: new Date().toISOString(),
      }),
      epistemicType: 'DERIVED',
    },
    nodes: points.map((_, i) => ({ id: `n${i}`, ref: `n${i}` })),
  } as LabValue;
}

describe('symmetricEigenvalues', () => {
  it('recovers the eigenvalues of a diagonal matrix, descending', () => {
    expect(symmetricEigenvalues([[3, 0], [0, 1]])).toEqual([3, 1]);
  });

  it('diagonalizes a known symmetric matrix', () => {
    // [[2,1],[1,2]] has eigenvalues 3 and 1.
    const eig = symmetricEigenvalues([[2, 1], [1, 2]]);
    expect(eig[0]).toBeCloseTo(3, 10);
    expect(eig[1]).toBeCloseTo(1, 10);
  });
});

describe('principalShape describes geometry', () => {
  it('scores points on a line as a filament', () => {
    const line = Array.from({ length: 30 }, (_, i) => [i, 0, 0]);
    const shape = principalShape(line);
    expect(shape.linearity).toBeGreaterThan(0.99);
    expect(shape.sphericity).toBeLessThan(0.01);
  });

  it('scores points on a plane as a sheet, not a filament', () => {
    const plane: number[][] = [];
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) plane.push([x, y, 0]);
    const shape = principalShape(plane);
    expect(shape.planarity).toBeGreaterThan(0.9);
    expect(shape.linearity).toBeLessThan(0.1);
  });

  it('is defined on degenerate input rather than throwing or returning NaN', () => {
    const identical = Array.from({ length: 5 }, () => [1, 1, 1]);
    const shape = principalShape(identical);
    expect(Number.isFinite(shape.linearity)).toBe(true);
    expect(shape.linearity).toBe(0);
  });
});

describe('geometry.principal_shape negative control', () => {
  it('does not report a direction in a cloud that has none', () => {
    // An isotropic ball: no planted direction at all. The classifier will still return a
    // non-zero linearity, because finite samples always have a longest axis — which is
    // exactly why the null model has to be the thing that decides.
    const next = rng(11);
    const ball = Array.from({ length: 120 }, () => [next() * 2 - 1, next() * 2 - 1, next() * 2 - 1]);
    const out = principalShapeCapability.run([embeddingOf(ball)], { iterations: 200 }, ctxFor(3));
    if (out.type !== 'MeasurementSet') throw new Error('expected a MeasurementSet');
    const linearity = out.measurements.find((m) => m.statistic === 'principal_linearity')!;

    expect(linearity.value).toBeGreaterThan(0); // a longest axis always exists
    expect(linearity.nullModel).toBeDefined();
    expect(linearity.nullModel!.exceedsNull).toBe(false); // ...and it means nothing
  });

  it('does report a direction when there genuinely is one', () => {
    // The positive control, so the test above cannot pass merely by never firing.
    const next = rng(5);
    const filament = Array.from({ length: 120 }, () => [next() * 20 - 10, next() * 0.2, next() * 0.2]);
    const out = principalShapeCapability.run([embeddingOf(filament)], { iterations: 200 }, ctxFor(3));
    if (out.type !== 'MeasurementSet') throw new Error('expected a MeasurementSet');
    const linearity = out.measurements.find((m) => m.statistic === 'principal_linearity')!;
    expect(linearity.nullModel!.exceedsNull).toBe(true);
  });

  it('carries an interpretation guard on every measurement it emits', () => {
    const next = rng(2);
    const cloud = Array.from({ length: 40 }, () => [next(), next(), next()]);
    const out = principalShapeCapability.run([embeddingOf(cloud)], { iterations: 50 }, ctxFor(1));
    if (out.type !== 'MeasurementSet') throw new Error('expected a MeasurementSet');
    expect(out.measurements).toHaveLength(3);
    for (const m of out.measurements) expect(m.interpretationGuard.length).toBeGreaterThan(40);
  });
});
