/**
 * Graph mathematics shared by structure, measurement, null-model and challenge
 * capabilities. Kept separate from the capability wrappers so the same code computes
 * an observed statistic and its null distribution — §20 depends on those being
 * literally the same computation, not two implementations that might drift apart.
 */
import { rng, shuffled } from './rng';

export interface WeightedEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}

export type Partition = ReadonlyMap<string, number>;

/** Undirected connected components over a weighted edge list. */
export function connectedComponents(nodes: readonly string[], edges: readonly WeightedEdge[]): string[][] {
  const parent = new Map<string, string>(nodes.map((n) => [n, n]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  for (const e of edges) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue;
    const a = find(e.from);
    const b = find(e.to);
    if (a !== b) parent.set(a, b);
  }
  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const root = find(n);
    const arr = groups.get(root) ?? [];
    arr.push(n);
    groups.set(root, arr);
  }
  // Sorted so that the same graph always yields the same group ordering. §96
  return [...groups.values()]
    .map((g) => [...g].sort())
    .sort((a, b) => (b.length - a.length) || a[0]!.localeCompare(b[0]!));
}

export function partitionOf(groups: readonly (readonly string[])[]): Map<string, number> {
  const p = new Map<string, number>();
  groups.forEach((g, i) => g.forEach((n) => p.set(n, i)));
  return p;
}

/**
 * Newman modularity Q of a partition on a weighted undirected graph.
 * Q = (1/2m) Σ_ij [A_ij − k_i k_j / 2m] δ(c_i, c_j)
 */
export function modularity(nodes: readonly string[], edges: readonly WeightedEdge[], partition: Partition): number {
  const degree = new Map<string, number>(nodes.map((n) => [n, 0]));
  let twoM = 0;
  for (const e of edges) {
    if (!degree.has(e.from) || !degree.has(e.to)) continue;
    degree.set(e.from, degree.get(e.from)! + e.weight);
    degree.set(e.to, degree.get(e.to)! + e.weight);
    twoM += 2 * e.weight;
  }
  if (twoM === 0) return 0;

  let intra = 0;
  for (const e of edges) {
    if (partition.get(e.from) === partition.get(e.to) && partition.has(e.from)) intra += 2 * e.weight;
  }
  const byCommunity = new Map<number, number>();
  for (const n of nodes) {
    const c = partition.get(n);
    if (c === undefined) continue;
    byCommunity.set(c, (byCommunity.get(c) ?? 0) + (degree.get(n) ?? 0));
  }
  let expected = 0;
  for (const dc of byCommunity.values()) expected += (dc / twoM) ** 2;
  return intra / twoM - expected;
}

/** Adjusted Rand Index between two partitions over the same node set. */
export function adjustedRandIndex(a: Partition, b: Partition, nodes: readonly string[]): number {
  const shared = nodes.filter((n) => a.has(n) && b.has(n));
  const n = shared.length;
  if (n < 2) return 1;

  const table = new Map<string, number>();
  const rowSums = new Map<number, number>();
  const colSums = new Map<number, number>();
  for (const node of shared) {
    const i = a.get(node)!;
    const j = b.get(node)!;
    const key = `${i}:${j}`;
    table.set(key, (table.get(key) ?? 0) + 1);
    rowSums.set(i, (rowSums.get(i) ?? 0) + 1);
    colSums.set(j, (colSums.get(j) ?? 0) + 1);
  }
  const choose2 = (x: number) => (x * (x - 1)) / 2;
  let sumTable = 0;
  for (const v of table.values()) sumTable += choose2(v);
  let sumRow = 0;
  for (const v of rowSums.values()) sumRow += choose2(v);
  let sumCol = 0;
  for (const v of colSums.values()) sumCol += choose2(v);
  const total = choose2(n);
  const expected = (sumRow * sumCol) / total;
  const max = (sumRow + sumCol) / 2;
  if (max === expected) return 1;
  return (sumTable - expected) / (max - expected);
}

/** Pearson correlation. Returns 0 when either series has no variance. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i]!;
    my += ys[i]!;
  }
  mx /= n;
  my /= n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

export function euclidean(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Shannon entropy of a multiset, in bits. Used to quantify transform information loss. §13 */
export function entropy(counts: readonly number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Breadth-first shortest path over the (unweighted view of the) graph. §83 retracing */
export function shortestPath(
  nodes: readonly string[],
  edges: readonly WeightedEdge[],
  from: string,
  to: string,
): string[] | null {
  if (!nodes.includes(from) || !nodes.includes(to)) return null;
  if (from === to) return [from];
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    adj.get(e.from)?.push(e.to);
    adj.get(e.to)?.push(e.from);
  }
  const prev = new Map<string, string>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of (adj.get(cur) ?? []).sort()) {
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cur);
      if (next === to) {
        const path = [to];
        let step = to;
        while (prev.has(step)) {
          step = prev.get(step)!;
          path.unshift(step);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/**
 * Weighted label propagation.
 *
 * Connected components on a thresholded similarity graph is a poor community detector:
 * it yields one giant component just below the threshold and all singletons just above,
 * so any "cluster" it reports is largely an artefact of where the cutoff was placed.
 * Label propagation uses the edge weights themselves, which makes the resulting
 * partition — and therefore the modularity claim built on it — worth measuring.
 *
 * Determinism (§96) comes from the seeded visit order and from breaking ties on the
 * lexicographically smallest label rather than on iteration order.
 */
export function labelPropagation(
  nodes: readonly string[],
  edges: readonly WeightedEdge[],
  seed: number,
  maxIterations = 64,
): string[][] {
  const adjacency = new Map<string, { node: string; weight: number }[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    if (!adjacency.has(e.from) || !adjacency.has(e.to)) continue;
    adjacency.get(e.from)!.push({ node: e.to, weight: e.weight });
    adjacency.get(e.to)!.push({ node: e.from, weight: e.weight });
  }

  const label = new Map<string, string>(nodes.map((n) => [n, n]));
  const next = rng(seed);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (const node of shuffled(nodes, next)) {
      const neighbours = adjacency.get(node) ?? [];
      if (neighbours.length === 0) continue;
      const totals = new Map<string, number>();
      for (const n of neighbours) {
        const l = label.get(n.node)!;
        totals.set(l, (totals.get(l) ?? 0) + n.weight);
      }
      let best = label.get(node)!;
      let bestWeight = totals.get(best) ?? -Infinity;
      for (const [l, w] of [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (w > bestWeight + 1e-12) {
          best = l;
          bestWeight = w;
        }
      }
      if (best !== label.get(node)) {
        label.set(node, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const l = label.get(n)!;
    const arr = groups.get(l) ?? [];
    arr.push(n);
    groups.set(l, arr);
  }
  return [...groups.values()]
    .map((g) => [...g].sort())
    .sort((a, b) => (b.length - a.length) || a[0]!.localeCompare(b[0]!));
}

/** Fraction of nodes sitting in a group of size two or more. §20: guards against a
 *  degenerate all-singleton partition scoring well merely by avoiding mistakes. */
export function nondegeneracy(groups: readonly (readonly string[])[]): number {
  const total = groups.reduce((a, g) => a + g.length, 0);
  if (total === 0) return 0;
  const grouped = groups.filter((g) => g.length > 1).reduce((a, g) => a + g.length, 0);
  return grouped / total;
}

/**
 * Degree-preserving edge rewiring (double-edge swap).
 *
 * The right null model for a community-detection result is *not* a random relabelling of
 * an optimized partition — a detector that maximizes modularity will beat random labels
 * on almost any graph, including a graph with no structure at all, so that test is
 * circular and reports significance where none exists. The appropriate question (§20) is
 * whether the observed modularity exceeds what the *same detector* finds in a random
 * graph with the same degree sequence. This produces such a graph.
 *
 * Edge weights travel with their slots, so the weight distribution is preserved too.
 */
export function rewireDegreePreserving(
  edges: readonly WeightedEdge[],
  next: () => number,
  swapsPerEdge = 5,
): WeightedEdge[] {
  const out = edges.map((e) => ({ ...e }));
  if (out.length < 2) return out;
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const present = new Set(out.map((e) => key(e.from, e.to)));
  const attempts = Math.max(1, Math.round(out.length * swapsPerEdge));

  for (let i = 0; i < attempts; i++) {
    const x = Math.floor(next() * out.length);
    const y = Math.floor(next() * out.length);
    if (x === y) continue;
    const e1 = out[x]!;
    const e2 = out[y]!;
    // Swap endpoints: (a,b),(c,d) -> (a,d),(c,b). Degrees are unchanged by construction.
    const a = e1.from;
    const b = e1.to;
    const c = e2.from;
    const d = e2.to;
    if (a === d || c === b) continue;
    const k1 = key(a, d);
    const k2 = key(c, b);
    if (k1 === k2 || present.has(k1) || present.has(k2)) continue;
    present.delete(key(a, b));
    present.delete(key(c, d));
    present.add(k1);
    present.add(k2);
    out[x] = { from: a, to: d, weight: e1.weight };
    out[y] = { from: c, to: b, weight: e2.weight };
  }
  return out;
}
