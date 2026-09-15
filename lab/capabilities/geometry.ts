/**
 * Geometry of a computed embedding. Constitution §16, §20, §42.
 *
 * The causal chain in `structures.ts` ends at an embedding: relations become a structure,
 * the structure becomes coordinates. This module asks the next question — what *shape*
 * is that point cloud? — and answers it with a principal-axis decomposition of the
 * covariance matrix, reporting how elongated, how flat and how round the cloud is.
 *
 * Provenance of the method: this is the shape classifier carried by the Engine SDK
 * investigated in `docs/SDK-INVESTIGATION.md`, which ported it from an earlier system.
 * The algorithm is sound and domain-neutral — it operates on an arbitrary point set and
 * knows nothing about what the points are.
 *
 * What the SDK did *not* carry, and what is added here, is a null model. A bare
 * "this cloud is a filament" is not a finding: any finite point set has principal axes,
 * and the largest is always larger than the rest, so linearity is bounded away from zero
 * by sampling alone. §20 requires every statistical claim to say what it is being
 * compared against, so the statistic is run against a null and reported with a p-value.
 *
 * The null model here was chosen the hard way. The first attempt permuted each coordinate
 * axis independently across points — and it was circular in exactly the manner of
 * `/dispatches/the-result-that-wasnt`: the eigenvalues of an axis-aligned cloud *are* its
 * per-axis variances, which independent permutation preserves exactly, so a genuine
 * filament scored no better than its own null. The positive control caught it. The null
 * used below instead compares against an isotropic cloud of the same size and
 * dimensionality — a reference with no preferred direction by construction, which is what
 * the claim "this cloud has a direction" actually needs to beat.
 */
import type { Capability, LabValue } from './kernel';
import { cfgNumber } from './kernel';
import { measurement, permutationTest } from './measurement';

/** A standard normal draw from a seeded uniform, by the Box–Muller transform. */
function gaussian(next: () => number): number {
  const u = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

/**
 * Eigenvalues of a small real symmetric matrix by the cyclic Jacobi method, descending.
 *
 * Dimensionality here is the embedding's, which is 2 or 3 in practice, so a fixed sweep
 * count is both sufficient and bounded — the laboratory does not run unbounded iteration
 * inside a capability.
 */
export function symmetricEigenvalues(matrix: readonly (readonly number[])[], sweeps = 24): number[] {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-18) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => a[i]![i]!).sort((x, y) => y - x);
}

export interface PrincipalShape {
  /** (λ1 − λ2) / λ1 — near 1 the cloud is a filament: one axis dominates. */
  readonly linearity: number;
  /** (λ2 − λ3) / λ1 — near 1 the cloud is a sheet. Zero below three dimensions. */
  readonly planarity: number;
  /** λmin / λ1 — near 1 the cloud is a ball: every axis is equally long. */
  readonly sphericity: number;
  readonly eigenvalues: readonly number[];
}

/** Principal-axis shape of a point cloud. Degenerate input yields a defined, honest zero. */
export function principalShape(points: readonly (readonly number[])[]): PrincipalShape {
  const n = points.length;
  const dims = n > 0 ? points[0]!.length : 0;
  if (n < 2 || dims === 0) {
    return { linearity: 0, planarity: 0, sphericity: 0, eigenvalues: new Array(dims).fill(0) };
  }
  const centroid = new Array(dims).fill(0);
  for (const p of points) for (let d = 0; d < dims; d++) centroid[d] += p[d]! / n;

  const cov = Array.from({ length: dims }, () => new Array(dims).fill(0));
  for (const p of points) {
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        cov[i]![j] += ((p[i]! - centroid[i]) * (p[j]! - centroid[j])) / n;
      }
    }
  }
  const eig = symmetricEigenvalues(cov).map((v) => Math.max(0, v));
  const l1 = eig[0] ?? 0;
  if (l1 <= 1e-15) return { linearity: 0, planarity: 0, sphericity: 0, eigenvalues: eig };
  const l2 = eig[1] ?? 0;
  const l3 = eig[2] ?? 0;
  return {
    linearity: (l1 - l2) / l1,
    planarity: dims >= 3 ? (l2 - l3) / l1 : 0,
    sphericity: (eig[eig.length - 1] ?? 0) / l1,
    eigenvalues: eig,
  };
}

export const principalShapeCapability: Capability = {
  name: 'geometry.principal_shape',
  purpose:
    'Classify the shape of a computed embedding by its principal axes — filament, sheet or ball — against a null model that destroys joint structure but keeps each axis spread.',
  inputs: ['EmbeddingValue'],
  output: 'MeasurementSet',
  configKeys: [
    { key: 'iterations', type: 'number', default: 500, note: 'Permutation draws for the null model.' },
    { key: 'alpha', type: 'number', default: 0.05, note: 'Significance level, declared before running.' },
  ],
  costUnits: 4,
  latencyHintMs: 40,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['embedding.classical_mds'],
  run(inputs, config, ctx): LabValue {
    const input = inputs[0];
    if (!input || input.type !== 'EmbeddingValue') {
      throw new Error('geometry.principal_shape requires an EmbeddingValue');
    }
    const points = input.embedding.points.map((p) => [...p.coords]);
    if (points.length < 3) {
      throw new Error('geometry.principal_shape needs at least three embedded points to have a shape');
    }
    const dims = points[0]!.length;
    const observed = principalShape(points);
    const iterations = Math.max(1, Math.round(cfgNumber(config, 'iterations', 500)));
    const alpha = cfgNumber(config, 'alpha', 0.05);

    /**
     * The null model: an isotropic cloud of the same size and dimensionality.
     *
     * Isotropic means no preferred direction by construction, so whatever linearity such
     * a cloud shows is the amount attributable to finite sampling alone. An embedding
     * that does not beat it is not elongated in any sense the data supports.
     */
    const nullResult = permutationTest({
      model: 'isotropic cloud of equal size',
      description:
        'The statistic is recomputed on point clouds of the same size and dimensionality drawn from an ' +
        'isotropic Gaussian, which has no preferred direction by construction. This asks whether the embedding ' +
        'is more elongated than a directionless cloud of the same size would be by chance alone. It does not ' +
        'ask whether the relations the embedding was computed from carry structure.',
      observed: observed.linearity,
      iterations,
      seed: ctx.seed,
      alpha,
      draw: (next) => {
        const drawn = Array.from({ length: points.length }, () =>
          Array.from({ length: dims }, () => gaussian(next)),
        );
        return principalShape(drawn).linearity;
      },
    });

    const subjectId = input.embedding.id;
    const parents = [subjectId];
    const derivation = [...input.embedding.provenance.derivation, 'geometry.principal_shape'];
    const configuration = { iterations, alpha, points: points.length, dimensions: dims };

    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          statistic: 'principal_linearity',
          value: observed.linearity,
          subjectId,
          guard:
            'This describes the shape of an embedding, not of the material. The embedding was computed from ' +
            'relations that were themselves computed from an observable, and a change of observable can change ' +
            'this number entirely. The null model asks only whether the cloud is more elongated than a ' +
            'directionless cloud of the same size; passing it does not show that the relations behind the ' +
            'embedding carry structure, and it licenses no claim that the material has a direction.',
          nullModel: nullResult,
          parents,
          derivation,
          configuration,
          ctx,
        }),
        measurement({
          statistic: 'principal_planarity',
          value: observed.planarity,
          subjectId,
          guard:
            'Zero by construction below three dimensions — check the embedding dimensionality before reading ' +
            'anything into this value. Carries no null model of its own and is therefore descriptive only.',
          parents,
          derivation,
          configuration,
          ctx,
        }),
        measurement({
          statistic: 'principal_sphericity',
          value: observed.sphericity,
          subjectId,
          guard:
            'The ratio of the smallest principal axis to the largest. High sphericity means the embedding found ' +
            'no preferred direction, which is the expected outcome for material with no relational structure. ' +
            'Descriptive only: it carries no null model.',
          parents,
          derivation,
          configuration,
          ctx,
        }),
      ],
    };
  },
};

export const geometryCapabilities: readonly Capability[] = [principalShapeCapability];
