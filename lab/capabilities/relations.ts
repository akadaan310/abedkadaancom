/**
 * Relation capabilities. Constitution §14: a relation is never a bare edge.
 *
 * Each relation produced here carries its kind, weight, the evidence and statistic behind
 * that weight, its epistemic type, and full provenance — so a relation computed from
 * letter frequencies can never be confused with one a model merely suggested (§14, §28).
 */
import type { Capability, NodeRef, ProfileItem } from './kernel';
import { cfgNumber, id } from './kernel';
import type { Relation, RelationKind } from '../ontology/types';

export function cosine(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, v] of Object.entries(a)) {
    na += v * v;
    const w = b[k];
    if (w !== undefined) dot += v * w;
  }
  for (const v of Object.values(b)) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function pairwise<T extends NodeRef>(
  items: readonly T[],
  score: (a: T, b: T) => { weight: number; statistic: string; details?: Record<string, number | string> },
  opts: { kind: RelationKind; threshold: number; scope: string; capability: string },
  ctx: Parameters<Capability['run']>[2],
): Relation[] {
  const relations: Relation[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      const { weight, statistic, details } = score(a, b);
      if (!Number.isFinite(weight) || weight < opts.threshold) continue;
      relations.push({
        kind: 'Relation',
        id: id('rel', { kind: opts.kind, endpoints: [a.id, b.id], weight, capability: opts.capability }),
        relationKind: opts.kind,
        endpoints: [a.id, b.id],
        directed: false,
        weight,
        evidence: {
          kind: 'Evidence',
          summary: `${statistic} between ${a.ref} and ${b.ref} is ${weight.toFixed(4)}`,
          statistic,
          value: weight,
          supportingIds: [a.id, b.id],
          ...(details ? { details } : {}),
        },
        // Computed from declared inputs by an executing engine, so COMPUTED — never
        // AI_PROPOSED, whatever suggested that this relation was worth computing. §14, §28
        epistemicType: 'COMPUTED',
        scope: opts.scope,
        provenance: ctx.prov({
          parents: [a.id, b.id],
          derivation: [opts.capability],
          configuration: { threshold: opts.threshold, statistic },
        }),
      });
    }
  }
  return relations;
}

function nodesOf(items: readonly NodeRef[]): NodeRef[] {
  return items.map((i) => ({ id: i.id, ref: i.ref }));
}

export const cosineProfileRelation: Capability = {
  name: 'relation.cosine_profile',
  purpose: 'Relate loci by the cosine similarity of their observed profile vectors.',
  inputs: ['ProfileSet'],
  output: 'RelationSet',
  configKeys: [
    { key: 'threshold', type: 'number', default: 0.9, note: 'Minimum similarity retained as a relation.' },
  ],
  costUnits: 2,
  latencyHintMs: 5,
  permissions: ['READ_RESEARCH_DATA', 'COMPUTE_RELATION'],
  dependencies: ['observable.letter_profile'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'ProfileSet') throw new Error('relation.cosine_profile requires a ProfileSet');
    const threshold = cfgNumber(config, 'threshold', 0.9);
    const relations = pairwise<ProfileItem>(
      input.items,
      (a, b) => ({ weight: cosine(a.vector, b.vector), statistic: 'cosine similarity of profile vectors' }),
      { kind: 'PROFILE_SIMILARITY', threshold, scope: input.corpusSlug, capability: 'relation.cosine_profile' },
      ctx,
    );
    return { type: 'RelationSet', nodes: nodesOf(input.items), relations };
  },
};

export const jaccardTokenRelation: Capability = {
  name: 'relation.jaccard_tokens',
  purpose: 'Relate loci by the Jaccard overlap of their token sets.',
  inputs: ['TokenSet'],
  output: 'RelationSet',
  configKeys: [
    { key: 'threshold', type: 'number', default: 0.15, note: 'Minimum overlap retained as a relation.' },
  ],
  costUnits: 2,
  latencyHintMs: 5,
  permissions: ['READ_RESEARCH_DATA', 'COMPUTE_RELATION'],
  dependencies: ['text.tokenize'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'TokenSet') throw new Error('relation.jaccard_tokens requires a TokenSet');
    const threshold = cfgNumber(config, 'threshold', 0.15);
    const relations = pairwise(
      input.items,
      (a, b) => ({
        weight: jaccard(a.tokens, b.tokens),
        statistic: 'Jaccard overlap of token sets',
        details: { aTokens: a.tokens.length, bTokens: b.tokens.length },
      }),
      { kind: 'LEXICAL_OVERLAP', threshold, scope: input.corpusSlug, capability: 'relation.jaccard_tokens' },
      ctx,
    );
    return { type: 'RelationSet', nodes: nodesOf(input.items), relations };
  },
};

export const lengthProximityRelation: Capability = {
  name: 'relation.length_proximity',
  purpose: 'Relate loci by proximity in token length. A deliberately weak relation, useful as a comparison baseline.',
  inputs: ['ProfileSet'],
  output: 'RelationSet',
  configKeys: [
    { key: 'threshold', type: 'number', default: 0.8, note: 'Minimum proximity retained.' },
  ],
  costUnits: 1,
  latencyHintMs: 3,
  permissions: ['READ_RESEARCH_DATA', 'COMPUTE_RELATION'],
  dependencies: ['observable.length'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'ProfileSet') throw new Error('relation.length_proximity requires a ProfileSet');
    const threshold = cfgNumber(config, 'threshold', 0.8);
    const relations = pairwise<ProfileItem>(
      input.items,
      (a, b) => {
        const la = a.vector['tokens'] ?? 0;
        const lb = b.vector['tokens'] ?? 0;
        const denom = Math.max(la, lb);
        const weight = denom === 0 ? 0 : 1 - Math.abs(la - lb) / denom;
        return { weight, statistic: 'relative token-length proximity', details: { aTokens: la, bTokens: lb } };
      },
      { kind: 'LENGTH_PROXIMITY', threshold, scope: input.corpusSlug, capability: 'relation.length_proximity' },
      ctx,
    );
    return { type: 'RelationSet', nodes: nodesOf(input.items), relations };
  },
};

export const relationCapabilities: readonly Capability[] = [
  cosineProfileRelation,
  jaccardTokenRelation,
  lengthProximityRelation,
];
