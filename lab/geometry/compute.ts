/**
 * Geometry prototypes. §16, §42: visualization must emerge from computed structure —
 * never invented and retrofitted with meaning. Every function here calls the same
 * capabilities the laboratory itself uses (`lab/capabilities/*`) or reads the same
 * projected ledger (`lab/ledger/projection`) the Observatory reads. Nothing in this
 * file invents a coordinate, a grouping, or a size that was not computed.
 *
 * This module is server-only (it touches the filesystem through loadCorpora/readState).
 * The route files import it directly; client components receive plain, already-computed
 * JSON — never a live capability handle.
 */
import { buildRegistry, loadCorpora, readState } from '../runtime';
import { computeContext, type LabValue } from '../capabilities/kernel';
import { pearson, entropy } from '../capabilities/graph';
import { lineage, type Provenance } from '../provenance/provenance';
import { utility } from '../frontier/frontier';
import type { Corpus, Locus } from '../ontology/types';

const ACTOR = { kind: 'ENGINE' as const, engineId: 'geometry-prototype', engineVersion: 1 };

function ctxFor(corpus: Corpus, seed: number) {
  return computeContext({
    now: new Date().toISOString(),
    actor: ACTOR,
    corpora: new Map([[corpus.slug, corpus]]),
    sources: { [corpus.slug]: corpus.dataVersion },
    seed,
    engineId: 'geometry-prototype',
    engineVersion: 1,
  });
}

async function primaryCorpus(): Promise<Corpus | null> {
  const corpora = await loadCorpora();
  return corpora[0] ?? null;
}

// ---------------------------------------------------------------------------
// 01 — Constellation: a relation field over the admitted corpus
// ---------------------------------------------------------------------------

export interface ConstellationPoint {
  readonly id: string;
  readonly ref: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly group: number;
  readonly degree: number;
}
export interface ConstellationEdge {
  readonly from: string;
  readonly to: string;
  readonly weight: number;
}
export interface ConstellationData {
  readonly kind: 'constellation';
  readonly corpusSlug: string;
  readonly sourceVerification: string;
  readonly points: readonly ConstellationPoint[];
  readonly edges: readonly ConstellationEdge[];
  readonly groupCount: number;
  readonly modularity: number;
  readonly threshold: number;
  readonly derivation: readonly string[];
}

export async function constellationData(): Promise<ConstellationData | null> {
  const corpus = await primaryCorpus();
  if (!corpus) return null;
  const registry = buildRegistry();
  const ctx = ctxFor(corpus, 42);
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const profiles = registry.require('observable.letter_profile').run([norm], {}, ctx);
  const threshold = 0.55;
  const relations = registry.require('relation.cosine_profile').run([profiles], { threshold }, ctx);
  if (relations.type !== 'RelationSet') return null;
  const graph = registry.require('structure.threshold_graph').run([relations], {}, ctx);
  const communities = registry.require('structure.communities').run([graph], { seed: 42 }, ctx);
  if (communities.type !== 'StructureValue') return null;
  const embedding = registry.require('embedding.classical_mds').run([communities], { dimensions: 2, seed: 42 }, ctx);
  if (embedding.type !== 'EmbeddingValue') return null;

  const groupOf = new Map<string, number>();
  (communities.structure.groups ?? []).forEach((g, i) => g.forEach((n) => groupOf.set(n, i)));
  const degree = new Map<string, number>();
  for (const e of communities.structure.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const textOf = new Map(corpus.loci.map((l) => [l.id, l.text]));
  const refOf = new Map(corpus.loci.map((l) => [l.id, l.ref]));

  const points = embedding.embedding.points.map((p) => ({
    id: p.id,
    ref: refOf.get(p.id) ?? p.id,
    text: textOf.get(p.id) ?? '',
    x: p.coords[0] ?? 0,
    y: p.coords[1] ?? 0,
    group: groupOf.get(p.id) ?? -1,
    degree: degree.get(p.id) ?? 0,
  }));

  return {
    kind: 'constellation',
    corpusSlug: corpus.slug,
    sourceVerification: corpus.sourceVerification,
    points,
    edges: communities.structure.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
    groupCount: communities.structure.groups?.length ?? 0,
    modularity: communities.structure.summary['modularity'] ?? 0,
    threshold,
    derivation: embedding.embedding.provenance.derivation,
  };
}

// ---------------------------------------------------------------------------
// 02 — Provenance thread: walk the DAG backward from a chosen object
// ---------------------------------------------------------------------------

export interface ThreadNode {
  readonly id: string;
  readonly depth: number;
  readonly kind: string;
  readonly label: string;
  readonly epistemicType?: string;
  readonly derivation: readonly string[];
  readonly parents: readonly string[];
}
export interface ThreadRoot {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
}
export interface ProvenanceThreadData {
  readonly kind: 'provenance-thread';
  readonly roots: readonly ThreadRoot[];
  readonly selectedRoot: string;
  readonly nodes: readonly ThreadNode[];
}

export async function provenanceThreadData(rootId?: string): Promise<ProvenanceThreadData | null> {
  const state = await readState();
  const candidateKinds = ['Measurement', 'Discovery', 'Engine', 'Relation', 'Structure', 'Embedding', 'Hypothesis'];
  const roots: ThreadRoot[] = [...state.index.values()]
    .filter((o) => candidateKinds.includes(o.kind) && o.provenance)
    .map((o) => ({ id: o.id, kind: o.kind, label: o.label }))
    .slice(0, 60);
  if (roots.length === 0) return { kind: 'provenance-thread', roots: [], selectedRoot: '', nodes: [] };

  const defaultRoot = roots.find((r) => r.kind === 'Measurement') ?? roots[0]!;
  const selectedRoot = rootId && roots.some((r) => r.id === rootId) ? rootId : defaultRoot.id;
  const lookup = (id: string) => {
    const o = state.index.get(id);
    if (!o) return undefined;
    return { id: o.id, provenance: o.provenance as Provenance | undefined };
  };
  const walked = lineage(selectedRoot, lookup, 24);
  const nodes: ThreadNode[] = walked.map((w) => {
    const o = state.index.get(w.id);
    const parents = o?.provenance?.parents ?? [];
    return {
      id: w.id,
      depth: w.depth,
      kind: o?.kind ?? 'unknown',
      label: o?.label ?? w.id,
      epistemicType: o?.epistemicType,
      derivation: w.derivation,
      parents,
    };
  });
  return { kind: 'provenance-thread', roots, selectedRoot, nodes };
}

// ---------------------------------------------------------------------------
// 03 — Research field: the frontier, spatialized by its own economy
// ---------------------------------------------------------------------------

export interface FieldPoint {
  readonly id: string;
  readonly subject: string;
  readonly reason: string;
  readonly itemKind: string;
  readonly state: string;
  readonly x: number; // expectedInformationGain
  readonly y: number; // researchPriority
  readonly size: number; // novelty
  readonly utility: number;
  readonly costEstimate: number;
  readonly proposedBy: string;
}
export interface ResearchFieldData {
  readonly kind: 'research-field';
  readonly points: readonly FieldPoint[];
}

function actorLabelOf(actor: { kind: string; [k: string]: unknown }): string {
  if (actor.kind === 'NANO_LLM') return `${String(actor['role'])} · ${String(actor['provider'])}/${String(actor['model'])}`;
  if (actor.kind === 'ENGINE') return `instrument ${String(actor['engineId']).slice(0, 10)}`;
  if (actor.kind === 'SYSTEM') return `system · ${String(actor['component'])}`;
  return `researcher ${String(actor['id'] ?? '')}`;
}

export async function researchFieldData(): Promise<ResearchFieldData> {
  const state = await readState();
  const points = state.frontier.map((f) => ({
    id: f.id,
    subject: f.subject,
    reason: f.reason,
    itemKind: f.itemKind,
    state: f.state,
    x: f.expectedInformationGain,
    y: f.researchPriority,
    size: f.novelty,
    utility: utility(f),
    costEstimate: f.costEstimate,
    proposedBy: actorLabelOf(f.proposedBy),
  }));
  return { kind: 'research-field', points };
}

// ---------------------------------------------------------------------------
// 04 — Higher-dimensional projection: one embedding, many 2D views of it
// ---------------------------------------------------------------------------

export interface ProjectionPoint {
  readonly id: string;
  readonly ref: string;
  readonly text: string;
  readonly coords: readonly number[];
}
export interface ProjectionData {
  readonly kind: 'projection';
  readonly dimensions: number;
  readonly points: readonly ProjectionPoint[];
  readonly correlations: readonly { readonly a: number; readonly b: number; readonly r: number }[];
  readonly basis: string;
}

export async function projectionData(): Promise<ProjectionData | null> {
  const corpus = await primaryCorpus();
  if (!corpus) return null;
  const registry = buildRegistry();
  const ctx = ctxFor(corpus, 7);
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const tokens = registry.require('text.tokenize').run([norm], {}, ctx);
  const relations = registry.require('relation.jaccard_tokens').run([tokens], { threshold: 0.08 }, ctx);
  if (relations.type !== 'RelationSet') return null;
  const graph = registry.require('structure.threshold_graph').run([relations], {}, ctx);
  const dims = 4;
  const embedding = registry.require('embedding.classical_mds').run([graph], { dimensions: dims, seed: 7 }, ctx);
  if (embedding.type !== 'EmbeddingValue') return null;

  const textOf = new Map(corpus.loci.map((l) => [l.id, l.text]));
  const refOf = new Map(corpus.loci.map((l) => [l.id, l.ref]));
  const points = embedding.embedding.points.map((p) => ({
    id: p.id,
    ref: refOf.get(p.id) ?? p.id,
    text: textOf.get(p.id) ?? '',
    coords: p.coords,
  }));

  const correlations: { a: number; b: number; r: number }[] = [];
  for (let a = 0; a < dims; a++) {
    for (let b = a + 1; b < dims; b++) {
      const xs = points.map((p) => p.coords[a] ?? 0);
      const ys = points.map((p) => p.coords[b] ?? 0);
      correlations.push({ a, b, r: pearson(xs, ys) });
    }
  }

  return { kind: 'projection', dimensions: dims, points, correlations, basis: embedding.embedding.basis };
}

// ---------------------------------------------------------------------------
// 05 — Typographic / data geometry: the corpus's own measured extent
// ---------------------------------------------------------------------------

export interface TypeBlock {
  readonly id: string;
  readonly ref: string;
  readonly text: string;
  readonly address: readonly number[];
  readonly tokens: number;
  readonly characters: number;
  readonly entropyBits: number;
}
export interface TypographicData {
  readonly kind: 'typographic';
  readonly corpusSlug: string;
  readonly blocks: readonly TypeBlock[];
}

function localeEntropy(text: string): number {
  const counts: Record<string, number> = {};
  for (const ch of text.replace(/\s+/gu, '')) counts[ch] = (counts[ch] ?? 0) + 1;
  return entropy(Object.values(counts));
}

export async function typographicData(): Promise<TypographicData | null> {
  const corpus = await primaryCorpus();
  if (!corpus) return null;
  const registry = buildRegistry();
  const ctx = ctxFor(corpus, 1);
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const tokens = registry.require('text.tokenize').run([norm], {}, ctx);
  const lengths = registry.require('observable.length').run([tokens], {}, ctx);
  if (lengths.type !== 'ProfileSet') return null;
  const byId = new Map(lengths.items.map((it) => [it.id, it.vector]));
  const locusById = new Map<string, Locus>(corpus.loci.map((l) => [l.id, l]));

  const blocks = lengths.items.map((it) => {
    const locus = locusById.get(it.id);
    const vector = byId.get(it.id) ?? {};
    return {
      id: it.id,
      ref: it.ref,
      text: locus?.text ?? '',
      address: locus?.address ?? [],
      tokens: vector['tokens'] ?? 0,
      characters: vector['characters'] ?? 0,
      entropyBits: localeEntropy(locus?.text ?? ''),
    };
  });

  return { kind: 'typographic', corpusSlug: corpus.slug, blocks };
}
