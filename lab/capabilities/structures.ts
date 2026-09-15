/**
 * Structure and embedding capabilities. Constitution §16 and §42.
 *
 * The causal chain is fixed: data → computation → relation → structure → embedding →
 * spatial representation. Geometry is computed *from* relations here; it is never
 * invented and then explained. An Embedding records the structure and basis it came
 * from precisely so that a visualization built on it can be traced back to data (§42).
 */
import type { Capability } from './kernel';
import { cfgNumber, cfgString, id } from './kernel';
import {
  connectedComponents,
  labelPropagation,
  modularity,
  partitionOf,
  shortestPath,
  type WeightedEdge,
} from './graph';
import { rng } from './rng';

function edgesOf(relations: readonly { endpoints: readonly [string, string]; weight: number }[]): WeightedEdge[] {
  return relations.map((r) => ({ from: r.endpoints[0], to: r.endpoints[1], weight: r.weight }));
}

export const thresholdGraph: Capability = {
  name: 'structure.threshold_graph',
  purpose: 'Build a weighted graph from a relation set by retaining relations at or above a threshold.',
  inputs: ['RelationSet'],
  output: 'StructureValue',
  configKeys: [
    { key: 'threshold', type: 'number', default: 0, note: 'Edge weight cutoff applied on top of the relation threshold.' },
  ],
  costUnits: 1,
  latencyHintMs: 3,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: [],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'RelationSet') throw new Error('structure.threshold_graph requires a RelationSet');
    const threshold = cfgNumber(config, 'threshold', 0);
    const kept = input.relations.filter((r) => r.weight >= threshold);
    const edges = edgesOf(kept);
    const nodes = input.nodes.map((n) => n.id);
    const possible = (nodes.length * (nodes.length - 1)) / 2;
    const structure = {
      kind: 'Structure' as const,
      id: id('str', { kind: 'THRESHOLD_GRAPH', nodes, edges, threshold }),
      structureKind: 'THRESHOLD_GRAPH' as const,
      nodes,
      edges,
      summary: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        density: possible === 0 ? 0 : edges.length / possible,
        totalWeight: edges.reduce((a, e) => a + e.weight, 0),
        threshold,
      },
      provenance: ctx.prov({
        parents: kept.map((r) => r.id),
        derivation: ['structure.threshold_graph'],
        configuration: { threshold },
      }),
      epistemicType: 'COMPUTED' as const,
    };
    return { type: 'StructureValue', structure, nodes: input.nodes };
  },
};

export const componentStructure: Capability = {
  name: 'structure.components',
  purpose: 'Partition a graph into connected components and score the partition with Newman modularity.',
  inputs: ['StructureValue'],
  output: 'StructureValue',
  configKeys: [],
  costUnits: 1,
  latencyHintMs: 3,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.threshold_graph'],
  run(inputs, _config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'StructureValue') throw new Error('structure.components requires a StructureValue');
    const { nodes, edges } = input.structure;
    const groups = connectedComponents(nodes, edges);
    const q = modularity(nodes, edges, partitionOf(groups));
    const sizes = groups.map((g) => g.length);
    const structure = {
      kind: 'Structure' as const,
      id: id('str', { kind: 'COMPONENTS', groups, parent: input.structure.id }),
      structureKind: 'COMPONENTS' as const,
      nodes,
      edges,
      groups,
      summary: {
        componentCount: groups.length,
        largestComponent: sizes.length > 0 ? Math.max(...sizes) : 0,
        singletons: sizes.filter((s) => s === 1).length,
        modularity: q,
      },
      provenance: ctx.prov({
        parents: [input.structure.id],
        derivation: [...input.structure.provenance.derivation, 'structure.components'],
      }),
      epistemicType: 'DERIVED' as const,
    };
    return { type: 'StructureValue', structure, nodes: input.nodes };
  },
};


/**
 * Community detection by weighted label propagation.
 *
 * Kept alongside `structure.components` rather than replacing it, because the two
 * disagreeing is itself informative: §36 warns against mistaking a useful composition
 * for a fundamental primitive, and comparing the two partitions (via
 * measure.partition_agreement) is a cheap, honest check on whether a grouping is real
 * or an artefact of the thresholding step.
 */
export const communityStructure: Capability = {
  name: 'structure.communities',
  purpose: 'Detect communities in a weighted graph by seeded label propagation, and score them with modularity.',
  inputs: ['StructureValue'],
  output: 'StructureValue',
  configKeys: [
    { key: 'seed', type: 'number', default: 0, note: 'Visit-order seed; 0 means take the engine seed.' },
    { key: 'maxIterations', type: 'number', default: 64, note: 'Propagation rounds before giving up on convergence.' },
  ],
  costUnits: 2,
  latencyHintMs: 10,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.threshold_graph'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'StructureValue') throw new Error('structure.communities requires a StructureValue');
    const { nodes, edges } = input.structure;
    const seed = cfgNumber(config, 'seed', 0) || ctx.seed;
    const maxIterations = Math.max(1, Math.round(cfgNumber(config, 'maxIterations', 64)));
    const groups = labelPropagation(nodes, edges, seed, maxIterations);
    const q = modularity(nodes, edges, partitionOf(groups));
    const sizes = groups.map((g) => g.length);
    const structure = {
      kind: 'Structure' as const,
      id: id('str', { kind: 'COMPONENTS', method: 'label_propagation', groups, parent: input.structure.id, seed }),
      structureKind: 'COMPONENTS' as const,
      nodes,
      edges,
      groups,
      summary: {
        componentCount: groups.length,
        largestComponent: sizes.length > 0 ? Math.max(...sizes) : 0,
        singletons: sizes.filter((s) => s === 1).length,
        modularity: q,
        seed,
      },
      provenance: ctx.prov({
        parents: [input.structure.id],
        derivation: [...input.structure.provenance.derivation, 'structure.communities'],
        configuration: { seed, maxIterations, method: 'weighted label propagation' },
      }),
      epistemicType: 'DERIVED' as const,
    };
    return { type: 'StructureValue', structure, nodes: input.nodes };
  },
};

/**
 * Classical multidimensional scaling by power iteration.
 *
 * Distances come from the structure's own edge weights (d = 1 − w), with unlinked pairs
 * assigned the maximal distance. That choice is recorded in the embedding's `basis`
 * field because it is an assumption a reader is entitled to challenge (§86).
 */
function classicalMds(nodes: readonly string[], edges: readonly WeightedEdge[], dims: number, seed: number): number[][] {
  const n = nodes.length;
  const indexOf = new Map(nodes.map((id_, i) => [id_, i]));
  const d = Array.from({ length: n }, () => new Array(n).fill(1));
  for (let i = 0; i < n; i++) d[i]![i] = 0;
  for (const e of edges) {
    const i = indexOf.get(e.from);
    const j = indexOf.get(e.to);
    if (i === undefined || j === undefined) continue;
    const dist = Math.max(0, 1 - e.weight);
    d[i]![j] = dist;
    d[j]![i] = dist;
  }

  // Double centering: B = -0.5 * J D² J
  const sq = d.map((row) => row.map((v) => v * v));
  const rowMean = sq.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const grand = rowMean.reduce((a, b) => a + b, 0) / n;
  const b = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => -0.5 * (sq[i]![j]! - rowMean[i]! - rowMean[j]! + grand)),
  );

  const coords = Array.from({ length: n }, () => new Array(dims).fill(0));
  const next = rng(seed);
  for (let k = 0; k < dims; k++) {
    let v = Array.from({ length: n }, () => next() * 2 - 1);
    let eigenvalue = 0;
    for (let iter = 0; iter < 256; iter++) {
      const w = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += b[i]![j]! * v[j]!;
        w[i] = s;
      }
      const norm = Math.sqrt(w.reduce((a, x) => a + x * x, 0));
      if (norm < 1e-12) {
        v = new Array(n).fill(0);
        eigenvalue = 0;
        break;
      }
      const nextV = w.map((x) => x / norm);
      const delta = nextV.reduce((a, x, i) => a + Math.abs(x - v[i]!), 0);
      v = nextV;
      eigenvalue = norm;
      if (delta < 1e-10) break;
    }
    const scale = Math.sqrt(Math.max(0, eigenvalue));
    for (let i = 0; i < n; i++) coords[i]![k] = v[i]! * scale;
    // Deflate so the next iteration finds the following eigenvector.
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) b[i]![j]! -= eigenvalue * v[i]! * v[j]!;
    }
  }
  return coords;
}

export const spectralEmbedding: Capability = {
  name: 'embedding.classical_mds',
  purpose: 'Embed a computed structure in low-dimensional space by classical MDS on its edge weights.',
  inputs: ['StructureValue'],
  output: 'EmbeddingValue',
  configKeys: [
    { key: 'dimensions', type: 'number', default: 2, note: 'Output dimensionality.' },
    { key: 'seed', type: 'number', default: 0, note: 'Power-iteration seed; 0 means take the engine seed.' },
  ],
  costUnits: 3,
  latencyHintMs: 25,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.threshold_graph'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'StructureValue') throw new Error('embedding.classical_mds requires a StructureValue');
    const dims = Math.max(1, Math.round(cfgNumber(config, 'dimensions', 2)));
    const seed = cfgNumber(config, 'seed', 0) || ctx.seed;
    const coords = classicalMds(input.structure.nodes, input.structure.edges, dims, seed);
    const points = input.structure.nodes.map((nodeId, i) => ({ id: nodeId, coords: coords[i]! }));
    const embedding = {
      kind: 'Embedding' as const,
      id: id('emb', { structure: input.structure.id, dims, seed, points }),
      method: 'classical MDS (double centering, power iteration with deflation)',
      dimensions: dims,
      fromStructureId: input.structure.id,
      basis: 'distance = 1 − relation weight; pairs with no retained relation are assigned the maximal distance of 1',
      seed,
      points,
      provenance: ctx.prov({
        parents: [input.structure.id],
        derivation: [...input.structure.provenance.derivation, 'embedding.classical_mds'],
        configuration: { dimensions: dims, seed },
        notes: 'Geometry derived from computed relations. Spatial proximity here is a claim to be measured, not an illustration.',
      }),
      epistemicType: 'DERIVED' as const,
    };
    return { type: 'EmbeddingValue', embedding, nodes: input.nodes };
  },
};

export const traversal: Capability = {
  name: 'traverse.shortest_path',
  purpose: 'Find a shortest path between two loci through a computed structure, preserving the path as research data.',
  inputs: ['StructureValue'],
  output: 'StructureValue',
  configKeys: [
    { key: 'fromRef', type: 'string', default: '', note: 'Locus ref to start from; empty means the first node.' },
    { key: 'toRef', type: 'string', default: '', note: 'Locus ref to reach; empty means the last node.' },
  ],
  costUnits: 1,
  latencyHintMs: 2,
  permissions: ['READ_RESEARCH_DATA'],
  dependencies: ['structure.threshold_graph'],
  run(inputs, config, ctx) {
    const input = inputs[0];
    if (!input || input.type !== 'StructureValue') throw new Error('traverse.shortest_path requires a StructureValue');
    const byRef = new Map(input.nodes.map((n) => [n.ref, n.id]));
    const fromRef = cfgString(config, 'fromRef', '');
    const toRef = cfgString(config, 'toRef', '');
    const from = byRef.get(fromRef) ?? input.structure.nodes[0];
    const to = byRef.get(toRef) ?? input.structure.nodes[input.structure.nodes.length - 1];
    const path = from && to ? shortestPath(input.structure.nodes, input.structure.edges, from, to) : null;
    const structure = {
      kind: 'Structure' as const,
      id: id('str', { kind: 'ORDERING', path, parent: input.structure.id }),
      structureKind: 'ORDERING' as const,
      nodes: path ?? [],
      edges: (path ?? []).slice(1).map((n, i) => ({ from: (path ?? [])[i]!, to: n, weight: 1 })),
      summary: { pathLength: path ? path.length - 1 : -1, reachable: path ? 1 : 0 },
      provenance: ctx.prov({
        parents: [input.structure.id],
        derivation: [...input.structure.provenance.derivation, 'traverse.shortest_path'],
        configuration: { fromRef, toRef },
      }),
      epistemicType: 'DERIVED' as const,
    };
    return { type: 'StructureValue', structure, nodes: input.nodes };
  },
};

export const structureCapabilities: readonly Capability[] = [
  thresholdGraph,
  componentStructure,
  communityStructure,
  spectralEmbedding,
  traversal,
];
