/**
 * Guest lenses for the geometry prototypes.
 *
 * This is not the guest register (`app/guests.ts`) — it is a smaller, local device for
 * testing each geometry against six ways of reading it, per the brief: EVERYONE, FAMILY,
 * COMPANIES, RESEARCHERS, INTELLIGENCE, AI AGENTS. Like the register, a lens changes only
 * the register of the annotation prose. It never changes a coordinate, a threshold, or a
 * count — those come from `lab/geometry/compute.ts` and are identical under every lens.
 */

export const LENSES = [
  { slug: 'everyone', label: 'Everyone' },
  { slug: 'family', label: 'Family' },
  { slug: 'companies', label: 'Companies' },
  { slug: 'researchers', label: 'Researchers' },
  { slug: 'intelligence', label: 'Intelligence' },
  { slug: 'agents', label: 'AI Agents' },
] as const;

export type LensSlug = (typeof LENSES)[number]['slug'];

export const DEFAULT_LENS: LensSlug = 'everyone';

export function isLensSlug(v: string | undefined | null): v is LensSlug {
  return !!v && LENSES.some((l) => l.slug === v);
}

export const LENS_COPY: Record<string, Record<LensSlug, string>> = {
  constellation: {
    everyone:
      'Each dot is one real verse from the working text. Dots end up near each other only when the letters they use actually turned out similar — nobody placed them by hand.',
    family:
      'Every point is one of the passages in Abed’s corpus. The lines connect passages the laboratory found genuinely alike; the position of each dot came out of that computation, not a design choice.',
    companies:
      'A similarity graph over the working corpus: nodes are records, edges are a measured relation above a stated threshold, layout is a 2-D embedding of that graph — the same shape you would ask for in a document-similarity or knowledge-graph review.',
    researchers:
      'Cosine similarity of normalized letter-frequency profiles, threshold 0.55, partitioned by seeded weighted label propagation, laid out by classical MDS on (1 − weight). Modularity is printed live; weigh it against the rewiring-null result in Findings before reading the clusters as real.',
    intelligence:
      'A provenance-bearing relation graph. Every edge traces to a named statistic and threshold; every node to a source record. Nothing drawn here is asserted without a computation you can re-run from this same page.',
    agents:
      'derivation: text.normalize.arabic → observable.letter_profile → relation.cosine_profile(threshold=0.55) → structure.threshold_graph → structure.communities(seed=42) → embedding.classical_mds(dim=2, seed=42). Full state at /api/state.',
  },
  'provenance-thread': {
    everyone:
      'Pick anything the laboratory has computed and pull the thread: this shows exactly what it was built from, one step at a time, all the way back to the source text.',
    family:
      'This traces one result backward to show its ancestry — which computation produced it, and which passage it ultimately came from. Nothing is asserted without showing its lineage.',
    companies:
      'A literal audit trail: pick any computed artifact and walk its dependency chain back to source data. This is the chain-of-custody view an auditor or compliance reviewer would ask for.',
    researchers:
      'A backward walk of the provenance DAG (`lab/provenance/provenance.ts#lineage`) from a chosen object, following `provenance.parents` to a bounded depth. Each node prints its epistemic type so COMPUTED, DERIVED and AI-authored objects stay visibly distinct.',
    intelligence:
      'Full lineage reconstruction from any node to its root sources, with epistemic classification preserved at every hop — the structure a provenance audit is built on.',
    agents:
      'GET the object id, then walk lineage(id) → { id, depth, derivation }[]. Depth 0 is the selected root; increasing depth is closer to source. Parents come from provenance.parents.',
  },
  'research-field': {
    everyone:
      'This is the laboratory’s own to-do list, drawn as a field. Where a question sits shows how promising and how cheap the laboratory currently thinks it is.',
    family:
      'Every dot is a question or direction the laboratory has not fully resolved yet. Up and to the right is more interesting and more worth doing; the size of the dot is how novel it looks.',
    companies:
      'A prioritized backlog plotted by expected value: x is expected information gain, y is research priority, size is novelty, and the printed utility score is gain × priority × novelty ÷ cost — the same shape as any resourcing dashboard.',
    researchers:
      'The frontier (`lab/frontier/frontier.ts`), plotted on its own declared axes rather than a chosen layout. `utility()` = expectedInformationGain × researchPriority × novelty ÷ max(1, costEstimate), per §99. Closed items are shown dimmed rather than dropped.',
    intelligence:
      'A resource-allocation surface: every open item carries a declared cost estimate, priority and uncertainty, so its position is an auditable claim about where effort should go next, not an opinion.',
    agents:
      'Field = state.frontier. x=expectedInformationGain, y=researchPriority, r∝novelty, fill=state. utility = expectedInformationGain*researchPriority*novelty/max(1,costEstimate). Source: /api/state → frontier[].',
  },
  projection: {
    everyone:
      'The same set of passages, but placed in four computed dimensions at once — you are looking at only two of the four at a time, and you can change which two.',
    family:
      'This is the same passages as the constellation view, but embedded in more directions than a flat page can show. Switching the axis picker below shows a different honest slice of the same shape.',
    companies:
      'A 4-dimensional embedding of the corpus, exposed as a small multiple of 2-D projections — the standard way to inspect a high-dimensional clustering without pretending three axes were ever enough.',
    researchers:
      'Classical MDS at dimensions=4 on Jaccard token-overlap distances (`embedding.classical_mds`, seed 7). The axis picker re-projects the same coordinate set onto a different pair of the four computed dimensions; the pairwise Pearson correlation table below shows how independent those dimensions actually are.',
    intelligence:
      'A single computed embedding, deliberately shown from more than one angle, with the correlation between every pair of axes printed rather than assumed — so a viewer can judge how much of the apparent structure survives a change of projection.',
    agents:
      'points[i].coords has length 4. Select (dimA, dimB) to view coords[dimA] × coords[dimB]. correlations[] gives pearson(dimA, dimB) for all 6 pairs. basis: distance = 1 − Jaccard(tokens).',
  },
  typographic: {
    everyone:
      'Every block is a real passage, sized by how long it actually is and shaded by how varied its letters are — the geometry here is just typing, measured.',
    family:
      'Each rectangle is one passage from the corpus. Wider blocks have more words; darker blocks use a more varied mix of letters. Nothing about the shape is decorative — it is the text’s own measurements.',
    companies:
      'A data-driven typographic grid: block width is token count, shade is letter-entropy, both computed directly from the source records — a compact way to scan a whole corpus for outliers in length or vocabulary variety at a glance.',
    researchers:
      'Per-locus token and character counts (`observable.length`) and Shannon letter entropy in bits (`entropy()` over raw letter counts) drive block width and fill respectively. Sort order is a declared transform, applied to the same measured values.',
    intelligence:
      'A field of independently measured units: each block’s size and shading are traceable to a specific observable on a specific record, with no aggregation or interpretation applied.',
    agents:
      'blocks[i] = { tokens, characters, entropyBits } from observable.length and a direct Shannon-entropy pass over per-character counts (base e-free, bits). Sort keys: address | entropy | length.',
  },
};

export function copyFor(geometry: keyof typeof LENS_COPY, lens: LensSlug): string {
  return LENS_COPY[geometry]?.[lens] ?? '';
}
