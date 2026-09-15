/**
 * Challenge capabilities. Constitution §19 (counterexample engines) and §68.
 *
 * A result gains strength by surviving serious attempts to break it. These capabilities
 * are those attempts made computational: they ask whether a finding depends on an
 * arbitrary threshold, and whether it survives removing part of the data. Both are
 * common ways for an apparently strong structural claim to be an artefact.
 */
import type { Capability } from './kernel';
import { cfgNumber, id } from './kernel';
import { adjustedRandIndex, connectedComponents, partitionOf } from './graph';
import { measurement } from './measurement';

export const thresholdStability: Capability = {
  name: 'challenge.threshold_stability',
  purpose: 'Test whether a partition survives moving the threshold that produced it.',
  inputs: ['RelationSet'],
  output: 'MeasurementSet',
  configKeys: [
    { key: 'from', type: 'number', default: 0.8, note: 'Lowest threshold to test.' },
    { key: 'to', type: 'number', default: 0.98, note: 'Highest threshold to test.' },
    { key: 'steps', type: 'number', default: 7, note: 'Number of thresholds across the range.' },
  ],
  costUnits: 3,
  latencyHintMs: 30,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.components'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'RelationSet') throw new Error('challenge.threshold_stability requires a RelationSet');
    const from = cfgNumber(config, 'from', 0.8);
    const to = cfgNumber(config, 'to', 0.98);
    const steps = Math.max(2, Math.round(cfgNumber(config, 'steps', 7)));
    const nodes = input.nodes.map((n) => n.id);

    const partitions = Array.from({ length: steps }, (_, i) => {
      const threshold = from + ((to - from) * i) / (steps - 1);
      const edges = input.relations
        .filter((r) => r.weight >= threshold)
        .map((r) => ({ from: r.endpoints[0], to: r.endpoints[1], weight: r.weight }));
      return { threshold, groups: connectedComponents(nodes, edges) };
    });

    const agreements: number[] = [];
    for (let i = 1; i < partitions.length; i++) {
      agreements.push(
        adjustedRandIndex(partitionOf(partitions[i - 1]!.groups), partitionOf(partitions[i]!.groups), nodes),
      );
    }
    const min = agreements.length > 0 ? Math.min(...agreements) : 1;
    const mean = agreements.length > 0 ? agreements.reduce((a, b) => a + b, 0) / agreements.length : 1;
    const componentCounts = partitions.map((p) => p.groups.length);

    const parents = input.relations.slice(0, 16).map((r) => r.id);
    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          statistic: 'threshold_stability_min_ari',
          value: min,
          subjectId: input.nodes[0]?.id ?? 'relation-set',
          guard:
            'The worst agreement between partitions at neighbouring thresholds. A low value means the grouping is an ' +
            'artefact of the chosen threshold, and any claim resting on it should be treated as unsupported.',
          parents,
          derivation: ['challenge.threshold_stability'],
          configuration: { from, to, steps },
          ctx,
        }),
        measurement({
          statistic: 'threshold_stability_mean_ari',
          value: mean,
          subjectId: input.nodes[0]?.id ?? 'relation-set',
          guard: 'Average agreement across neighbouring thresholds. Averages can hide a single catastrophic step; read the minimum too.',
          parents,
          derivation: ['challenge.threshold_stability'],
          configuration: { from, to, steps },
          ctx,
        }),
        measurement({
          statistic: 'component_count_spread',
          value: Math.max(...componentCounts) - Math.min(...componentCounts),
          subjectId: input.nodes[0]?.id ?? 'relation-set',
          guard: 'How much the number of components moves across the threshold range. Large spreads indicate a scale-dependent structure.',
          parents,
          derivation: ['challenge.threshold_stability'],
          configuration: { componentCounts },
          ctx,
        }),
      ],
    };
  },
};

export const holdoutStability: Capability = {
  name: 'challenge.holdout_stability',
  purpose: 'Test whether a partition survives removing an entire region of the corpus.',
  inputs: ['RelationSet'],
  output: 'MeasurementSet',
  configKeys: [
    { key: 'threshold', type: 'number', default: 0.9, note: 'Threshold at which the partitions are compared.' },
  ],
  costUnits: 3,
  latencyHintMs: 30,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.components'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'RelationSet') throw new Error('challenge.holdout_stability requires a RelationSet');
    const threshold = cfgNumber(config, 'threshold', 0.9);
    const nodes = input.nodes.map((n) => n.id);
    const regionOf = new Map(input.nodes.map((n) => [n.id, n.ref.split(':')[0] ?? 'unknown']));
    const regions = [...new Set(regionOf.values())].sort();

    const edgesAt = (keep: (id_: string) => boolean) =>
      input.relations
        .filter((r) => r.weight >= threshold && keep(r.endpoints[0]) && keep(r.endpoints[1]))
        .map((r) => ({ from: r.endpoints[0], to: r.endpoints[1], weight: r.weight }));

    const baseline = partitionOf(connectedComponents(nodes, edgesAt(() => true)));

    const scores: { region: string; ari: number }[] = [];
    for (const region of regions) {
      if (regions.length < 2) break;
      const kept = nodes.filter((n) => regionOf.get(n) !== region);
      if (kept.length < 3) continue;
      const held = partitionOf(connectedComponents(kept, edgesAt((n) => regionOf.get(n) !== region)));
      scores.push({ region, ari: adjustedRandIndex(baseline, held, kept) });
    }

    const worst = scores.length > 0 ? scores.reduce((a, b) => (b.ari < a.ari ? b : a)) : null;
    const parents = input.relations.slice(0, 16).map((r) => r.id);
    const subjectId = input.nodes[0]?.id ?? 'relation-set';

    if (!worst) {
      return {
        type: 'MeasurementSet',
        measurements: [
          measurement({
            statistic: 'holdout_stability_min_ari',
            value: 1,
            subjectId,
            guard:
              'No holdout was possible: this corpus has fewer than two regions, so the challenge did not run. ' +
              'Treat this as an untested claim, not a passed test.',
            parents,
            derivation: ['challenge.holdout_stability'],
            configuration: { threshold, regions: regions.length, ran: false },
            ctx,
          }),
        ],
      };
    }

    return {
      type: 'MeasurementSet',
      measurements: [
        measurement({
          statistic: 'holdout_stability_min_ari',
          value: worst.ari,
          subjectId,
          guard:
            `Worst-case agreement when a whole region is removed (region ${worst.region}). A low value means the ` +
            'structure depends on one region of the corpus and does not generalize across it.',
          parents,
          derivation: ['challenge.holdout_stability'],
          configuration: { threshold, regions: regions.length, ran: true, worstRegion: worst.region },
          ctx,
        }),
        measurement({
          statistic: 'holdout_regions_tested',
          value: scores.length,
          subjectId,
          guard: 'How many regions were actually held out. A single tested region is a weak challenge.',
          parents,
          derivation: ['challenge.holdout_stability'],
          configuration: { threshold },
          ctx,
        }),
      ],
    };
  },
};

export const challengeCapabilities: readonly Capability[] = [thresholdStability, holdoutStability];

export const CHALLENGE_ID_SALT = id('chl', 'challenge-capabilities-v1');
