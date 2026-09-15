/**
 * Measurement capabilities. Constitution §11 and §20.
 *
 * Measurement is where a claim stops being rhetoric. Every Measurement produced here
 * carries an `interpretationGuard`: a plain statement of what the number does *not*
 * license, so that §20's distinction between "pattern detected" and "pattern exceeds
 * null expectation" survives the trip to the website.
 */
import type { Capability } from './kernel';
import { cfgNumber, id } from './kernel';
import {
  adjustedRandIndex,
  connectedComponents,
  entropy,
  euclidean,
  labelPropagation,
  modularity,
  nondegeneracy,
  partitionOf,
  pearson,
  rewireDegreePreserving,
} from './graph';
import type { Measurement, NullModelResult } from '../ontology/types';
import { rng, shuffled } from './rng';

export function measurement(init: {
  statistic: string;
  value: number;
  subjectId: string;
  guard: string;
  nullModel?: NullModelResult;
  parents: readonly string[];
  derivation: readonly string[];
  configuration?: Record<string, unknown>;
  ctx: Parameters<Capability['run']>[2];
}): Measurement {
  const { ctx } = init;
  return {
    kind: 'Measurement',
    id: id('mes', {
      statistic: init.statistic,
      value: init.value,
      subject: init.subjectId,
      nullModel: init.nullModel ?? null,
    }),
    statistic: init.statistic,
    value: init.value,
    subjectId: init.subjectId,
    ...(init.nullModel ? { nullModel: init.nullModel } : {}),
    interpretationGuard: init.guard,
    provenance: ctx.prov({
      parents: init.parents,
      derivation: init.derivation,
      configuration: init.configuration ?? {},
    }),
    // A statistic compared against a null model is an INFERENCE; a bare statistic is DERIVED.
    epistemicType: init.nullModel ? 'INFERENCE' : 'DERIVED',
  };
}

/**
 * Permutation test. §20: the laboratory must be able to ask whether an observed value
 * could arise under an appropriate null model.
 *
 * The p-value uses (hits + 1) / (iterations + 1), which keeps it strictly positive —
 * a permutation test can bound a p-value but never demonstrate that one is zero.
 */
export function permutationTest(init: {
  model: string;
  description: string;
  observed: number;
  iterations: number;
  seed: number;
  alpha: number;
  draw: (next: () => number) => number;
}): NullModelResult {
  const next = rng(init.seed);
  const draws: number[] = [];
  let atLeastAsExtreme = 0;
  for (let i = 0; i < init.iterations; i++) {
    const v = init.draw(next);
    draws.push(v);
    if (v >= init.observed) atLeastAsExtreme += 1;
  }
  const mean = draws.reduce((a, b) => a + b, 0) / Math.max(1, draws.length);
  const variance = draws.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, draws.length);
  const pValue = (atLeastAsExtreme + 1) / (init.iterations + 1);
  return {
    kind: 'NullModelResult',
    model: init.model,
    description: init.description,
    iterations: init.iterations,
    seed: init.seed,
    observed: init.observed,
    nullMean: mean,
    nullStdDev: Math.sqrt(variance),
    pValue,
    exceedsNull: pValue <= init.alpha,
    alpha: init.alpha,
  };
}

export const measureModularity: Capability = {
  name: 'measure.modularity',
  purpose:
    'Measure the modularity of a computed partition against a degree-preserving rewiring null model, ' +
    'using the same detector on each random draw.',
  inputs: ['StructureValue'],
  output: 'MeasurementSet',
  configKeys: [
    { key: 'iterations', type: 'number', default: 300, note: 'Rewiring draws.' },
    { key: 'alpha', type: 'number', default: 0.05, note: 'Significance level declared before running.' },
    { key: 'swapsPerEdge', type: 'number', default: 5, note: 'Double-edge swaps per edge, per draw.' },
  ],
  costUnits: 6,
  latencyHintMs: 250,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.communities'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'StructureValue') throw new Error('measure.modularity requires a StructureValue');
    const groups = input.structure.groups;
    if (!groups || groups.length === 0) {
      throw new Error('measure.modularity requires a partitioned structure; run structure.communities first');
    }
    const { nodes, edges } = input.structure;
    const observed = modularity(nodes, edges, partitionOf(groups));
    const iterations = Math.max(1, Math.round(cfgNumber(config, 'iterations', 300)));
    const alpha = cfgNumber(config, 'alpha', 0.05);
    const swapsPerEdge = Math.max(1, cfgNumber(config, 'swapsPerEdge', 5));

    // The null must re-run whichever detector produced the observed partition, or the
    // comparison is not like-for-like. The detector is read from the derivation chain
    // rather than configured, so it cannot drift away from what actually ran.
    const usedLabelPropagation = input.structure.provenance.derivation.includes('structure.communities');
    const detector = usedLabelPropagation ? 'structure.communities' : 'structure.components';
    const detect = (es: readonly { from: string; to: string; weight: number }[], seed: number) =>
      usedLabelPropagation ? labelPropagation(nodes, es, seed) : connectedComponents(nodes, es);

    const primaryNull = permutationTest({
      model: `degree-preserving rewiring, re-detected with ${detector}`,
      description:
        'On each draw the graph is rewired by double-edge swaps, preserving every node degree and the edge-weight ' +
        'multiset, and the same detector is run again on the rewired graph. This asks whether the observed ' +
        'modularity is higher than what this detector finds in a structureless graph of the same shape.',
      observed,
      iterations,
      seed: ctx.seed,
      alpha,
      draw: (next) => {
        const rewired = rewireDegreePreserving(edges, next, swapsPerEdge);
        const drawSeed = Math.floor(next() * 0xffffffff) >>> 0;
        return modularity(nodes, rewired, partitionOf(detect(rewired, drawSeed)));
      },
    });

    // Reported as a control, never as the finding: a modularity-maximizing detector beats
    // random labels on almost any graph. Keeping both visible is how the laboratory shows
    // that choosing the null model is itself a research decision. §20, §54
    const labelPermutationControl = permutationTest({
      model: 'community-label permutation (graph fixed, partition sizes fixed)',
      description:
        'Nodes are randomly reassigned to communities of the same sizes on the same graph. Retained only as a ' +
        'demonstration that this null is too weak for an optimized partition.',
      observed,
      iterations,
      seed: ctx.seed,
      alpha,
      draw: (next) => {
        const sizes = groups.map((g) => g.length);
        const perm = shuffled(nodes, next);
        const assignment = new Map<string, number>();
        let cursor = 0;
        sizes.forEach((size, community) => {
          for (let i = 0; i < size; i++) {
            const node = perm[cursor++];
            if (node !== undefined) assignment.set(node, community);
          }
        });
        return modularity(nodes, edges, assignment);
      },
    });

    const derivation = [...input.structure.provenance.derivation, 'measure.modularity'];
    return {
      type: 'MeasurementSet',
      measurements: [
        // Reported alongside modularity, never separately: an all-singleton partition
        // scores Q = 0 and beats a random partition trivially, so a modularity result
        // without this number can look significant while saying nothing. §20
        measurement({
          statistic: 'partition_nondegeneracy',
          value: nondegeneracy(groups),
          subjectId: input.structure.id,
          guard:
            'Fraction of loci placed in a group of two or more. Near zero means the partition is essentially all ' +
            'singletons, in which case the modularity result below is an artefact and must not be read as structure.',
          parents: [input.structure.id],
          derivation,
          ctx,
        }),
        measurement({
          statistic: 'newman_modularity',
          value: observed,
          subjectId: input.structure.id,
          guard:
            'Modularity above the rewiring null means this detector found more community structure in the observed ' +
            'graph than in structureless graphs of the same degree sequence. It does not show that the communities ' +
            'are meaningful, nor that the relation the graph was built from is the right relation to have computed.',
          nullModel: primaryNull,
          parents: [input.structure.id],
          derivation,
          configuration: { iterations, alpha, swapsPerEdge, detector },
          ctx,
        }),
        measurement({
          statistic: 'newman_modularity_label_permutation_control',
          value: observed,
          subjectId: input.structure.id,
          guard:
            'CONTROL, NOT A FINDING. This compares the same value against a null that permutes community labels on ' +
            'the observed graph. A modularity-maximizing detector beats that null on structureless data too, so a ' +
            'significant result here is uninformative. It is recorded to make the difference between an appropriate ' +
            'and an inappropriate null model inspectable.',
          nullModel: labelPermutationControl,
          parents: [input.structure.id],
          derivation,
          configuration: { iterations, alpha },
          ctx,
        }),
      ],
    };
  },
};

export const measureSpatialLocality: Capability = {
  name: 'measure.spatial_locality',
  purpose: 'Measure whether an embedding actually places strongly related loci close together, against a null model.',
  inputs: ['EmbeddingValue', 'RelationSet'],
  output: 'MeasurementSet',
  configKeys: [
    { key: 'iterations', type: 'number', default: 500, note: 'Permutation draws.' },
    { key: 'alpha', type: 'number', default: 0.05, note: 'Significance level declared before running.' },
  ],
  costUnits: 4,
  latencyHintMs: 60,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['embedding.classical_mds'],
  run(inputs, config, ctx) {
    const emb = inputs[0];
    const rel = inputs[1];
    if (!emb || emb.type !== 'EmbeddingValue') throw new Error('measure.spatial_locality requires an EmbeddingValue');
    if (!rel || rel.type !== 'RelationSet') throw new Error('measure.spatial_locality requires a RelationSet');

    const coords = new Map(emb.embedding.points.map((p) => [p.id, p.coords]));
    const pairs = rel.relations
      .filter((r) => coords.has(r.endpoints[0]) && coords.has(r.endpoints[1]))
      .map((r) => ({
        weight: r.weight,
        distance: euclidean(coords.get(r.endpoints[0])!, coords.get(r.endpoints[1])!),
      }));

    if (pairs.length < 3) {
      throw new Error('measure.spatial_locality needs at least three embedded relations to correlate');
    }

    // Negative correlation is the hypothesis: stronger relation ⇒ smaller distance.
    // The statistic is negated so that "larger is better" holds for the permutation test.
    const observed = -pearson(pairs.map((p) => p.weight), pairs.map((p) => p.distance));
    const iterations = Math.max(1, Math.round(cfgNumber(config, 'iterations', 500)));
    const alpha = cfgNumber(config, 'alpha', 0.05);
    const ids = emb.embedding.points.map((p) => p.id);

    const nullResult = permutationTest({
      model: 'embedding-position permutation',
      description:
        'Embedding coordinates are randomly reassigned among loci and the weight–distance correlation is recomputed. ' +
        'This asks whether the geometry carries the relation structure, or whether any layout of these points would score as well.',
      observed,
      iterations,
      seed: ctx.seed,
      alpha,
      draw: (next) => {
        const perm = shuffled(ids, next);
        const shuffledCoords = new Map<string, readonly number[]>();
        ids.forEach((original, i) => shuffledCoords.set(original, coords.get(perm[i]!)!));
        const ds = rel.relations
          .filter((r) => shuffledCoords.has(r.endpoints[0]) && shuffledCoords.has(r.endpoints[1]))
          .map((r) => euclidean(shuffledCoords.get(r.endpoints[0])!, shuffledCoords.get(r.endpoints[1])!));
        return -pearson(pairs.map((p) => p.weight), ds);
      },
    });

    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          statistic: 'spatial_locality_correlation',
          value: observed,
          subjectId: emb.embedding.id,
          guard:
            'This measures only whether the embedding preserves the relation weights it was computed from. ' +
            'It says nothing about whether those relations track anything in the text, and a visually striking ' +
            'layout with a poor score is decoration, not evidence.',
          nullModel: nullResult,
          parents: [emb.embedding.id, ...rel.relations.slice(0, 8).map((r) => r.id)],
          derivation: [...emb.embedding.provenance.derivation, 'measure.spatial_locality'],
          configuration: { iterations, alpha, pairs: pairs.length },
          ctx,
        }),
      ],
    };
  },
};

export const measureInformationLoss: Capability = {
  name: 'measure.information_loss',
  purpose: 'Quantify what a transformation actually discarded, by comparing type counts and entropy before and after.',
  inputs: ['TextSet', 'TextSet'],
  output: 'MeasurementSet',
  configKeys: [],
  costUnits: 2,
  latencyHintMs: 10,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  run(inputs, _config, ctx) {
    const before = inputs[0];
    const after = inputs[1];
    if (!before || before.type !== 'TextSet' || !after || after.type !== 'TextSet') {
      throw new Error('measure.information_loss requires two TextSets (before, after)');
    }
    const beforeById = new Map(before.items.map((i) => [i.id, i.text]));
    const collisions = new Map<string, Set<string>>();
    for (const item of after.items) {
      const original = beforeById.get(item.id);
      if (original === undefined) continue;
      const bucket = collisions.get(item.text) ?? new Set<string>();
      bucket.add(original);
      collisions.set(item.text, bucket);
    }
    // Distinct inputs sharing an output are direct, countable evidence of a many-to-one map.
    const merged = [...collisions.values()].filter((s) => s.size > 1).length;

    const charCounts = (items: readonly { text: string }[]) => {
      const counts = new Map<string, number>();
      for (const it of items) for (const ch of it.text.replace(/\s+/gu, '')) counts.set(ch, (counts.get(ch) ?? 0) + 1);
      return counts;
    };
    const cb = charCounts(before.items);
    const ca = charCounts(after.items);
    const hBefore = entropy([...cb.values()]);
    const hAfter = entropy([...ca.values()]);

    const subjectId = after.items[0]?.id ?? before.items[0]?.id ?? 'unknown';
    const common = {
      parents: before.items.map((i) => i.id),
      derivation: ['measure.information_loss'],
      ctx,
    };
    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          ...common,
          statistic: 'distinct_character_types_lost',
          value: cb.size - ca.size,
          subjectId,
          guard: 'A count of character types the transformation no longer distinguishes. Zero here does not imply invertibility.',
        }),
        measurement({
          ...common,
          statistic: 'character_entropy_delta_bits',
          value: hAfter - hBefore,
          subjectId,
          guard: 'Change in character-level Shannon entropy. Entropy is a summary, not a complete account of what was lost.',
        }),
        measurement({
          ...common,
          statistic: 'distinct_inputs_merged',
          value: merged,
          subjectId,
          guard:
            'The number of output strings that two or more distinct inputs collapsed onto. Any value above zero is ' +
            'direct evidence that the transformation is not invertible on this corpus.',
        }),
      ],
    };
  },
};

export const measurePartitionAgreement: Capability = {
  name: 'measure.partition_agreement',
  purpose: 'Compare two partitions of the same loci by Adjusted Rand Index.',
  inputs: ['StructureValue', 'StructureValue'],
  output: 'MeasurementSet',
  configKeys: [],
  costUnits: 2,
  latencyHintMs: 5,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.components'],
  run(inputs, _config, ctx) {
    const a = inputs[0];
    const b = inputs[1];
    if (!a || a.type !== 'StructureValue' || !b || b.type !== 'StructureValue') {
      throw new Error('measure.partition_agreement requires two StructureValues');
    }
    if (!a.structure.groups || !b.structure.groups) {
      throw new Error('measure.partition_agreement requires partitioned structures');
    }
    const shared = a.structure.nodes.filter((n) => b.structure.nodes.includes(n));
    const ari = adjustedRandIndex(partitionOf(a.structure.groups), partitionOf(b.structure.groups), shared);
    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          statistic: 'adjusted_rand_index',
          value: ari,
          subjectId: a.structure.id,
          guard:
            'Agreement between two partitions, corrected for chance. High agreement means the two procedures grouped ' +
            'the loci alike; it does not mean either grouping is correct.',
          parents: [a.structure.id, b.structure.id],
          derivation: ['measure.partition_agreement'],
          configuration: { sharedNodes: shared.length },
          ctx,
        }),
      ],
    };
  },
};

export const measurementCapabilities: readonly Capability[] = [
  measureModularity,
  measureSpatialLocality,
  measureInformationLoss,
  measurePartitionAgreement,
];
