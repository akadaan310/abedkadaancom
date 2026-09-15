# The Engine SDK, inspected as evidence

Governed by §88: prior material is evidence, not architecture. Nothing below was adopted
because it was articulate, and nothing was discarded because it was unfamiliar.

The repository investigated is `akadaan310/ARABIC_TIMELESS`, branch
`claude/engine-sdk-investigation-j93p96`.

---

## 1. What it actually is

Two things in one repository. The first is a twenty-layer formal specification of a
writing system's skeleton, organised around an admission test — a candidate is a layer
only if it is executable by hand, closes over its own alphabet, is underivable from the
layers beneath it, accounts exactly for what it loses, and can be checked by one person
without instruments. The second, under `packages/`, is a set of TypeScript modules the
SDK's own authors extracted from three earlier systems, each module carrying a ledger
citation to the file and line it came from, and each recording what it deliberately did
*not* port. The extraction discipline is genuinely good: it documents anti-patterns it
refused to carry forward and marks unverified claims as discrepancies rather than
resolving them in its own favour.

It is not, despite the name, an engine that runs anything end to end. `packages/` is a
type substrate with unit tests and no corpus wiring; the SDK's README says so plainly.

---

## 2. Inventory

### Against the capability register

| SDK item | Verdict | Why |
|---|---|---|
| `structure/shapeOf` — PCA shape classifier (Jacobi eigensolver) | **new and useful — taken** | Sound, domain-neutral, operates on arbitrary point sets. Shipped as `geometry.principal_shape`. See §3. |
| `spatial/measureBasis` — null-model locality | **already have, and ours is stronger** | See the defect in §5. Our `measure.spatial_locality` runs a seeded permutation test and reports a p-value; `measureBasis` reports a bare ratio with no sampling distribution. |
| `arabic/verifyInvertibility` | **already have** | The SDK bills this as its flagship gap-closer. `tests/transforms.test.ts` already sweeps every registered capability that declares INVERTIBLE and proves the round-trip on the real corpus — over the register, not over six hand-listed objects. |
| `provenance` — multi-hop derivation record | **already have** | Ours additionally carries model attributions, test references and researcher interventions, and is content-addressed. |
| `capability` — descriptor with honest `UNAVAILABLE` | **already have** | `DECLARED_ABSENCES` plus a throwing `require()`. The SDK's own note that client-side gating is not a security boundary matches our server-side enforcement. |
| `corpus` — typed granularity, `project()` refuses unregistered changes | **new, partially useful** | Our `Locus` is a flat address array. Typed granularity with explicit projection is a real improvement, but it is a refactor of the ontology, not a capability. Recorded as a candidate, not taken. |
| `relation.epistemicType` — textual vs perceptual | **new and useful — not yet taken** | A distinction our ontology lacks: whether a relation is settled by the material alone or by a perceptual judgement. §12 forbids flattening distinctions for convenience; this is a genuine one. See §6. |
| `discovery.reconcileState` — bound-relative exhaustion | **new and useful — not yet taken** | An EXHAUSTED claim demotes to KNOWN the moment the bounds it was computed under change. Our frontier has no equivalent, and now that selections carry a `limit`, "exhausted under which bound?" is a live question. |
| `traversal.walk` — replayable greedy walk with full step log | **new, marginal here** | We have `traverse.shortest_path`. A logged greedy walk is different, but nothing in the current research programme asks for it. |
| The twenty-layer spec's distinction between the outer skeleton and the inner one | **terminology finding** | Two erasures of the same string, reaching different invariants. Our register has one. Noted; the capability that would use it is not currently in scope. |

### Datasets

One real dataset: a derived morphological bundle — 1,651 roots, 4,241 lemmas, 16,722
surface forms — joined from two upstream sources, with an attribution file that states its
provenance and licence honestly and without prompting.

Measured against our corpus rather than assumed: **98.2% of tokens resolve, 73% carry a
root, 52 distinct roots recovered**, after reconciling a normalisation mismatch (the bundle
writes the hamza-carrier as two characters where our normalizer folds it to one; 51 of
16,619 reconciled keys collide, which is the quantified information loss of that bridge).
Two tokens remain unresolved because the bundle has genuine coverage holes — a standalone
pronoun is missing although its clitic-prefixed forms are present.

**Not taken.** Both upstream sources are GPL, so the derived data is GPL, and this
repository declares no licence. That is a decision for the owner, not for an agent, and it
is hard to unwind from history. See §5 and §6.

---

## 3. What was taken, and what it lets the laboratory compute

**`geometry.principal_shape`** — one capability, end to end: contract, registry entry,
tests with both controls, running on admitted material.

It answers a question the laboratory could not previously ask. `embedding.classical_mds`
produced coordinates, and nothing measured what shape those coordinates formed. The
capability reports how elongated, how flat and how round the cloud is, by the eigenvalues
of its covariance matrix.

The algorithm is the SDK's, near-verbatim in substance, generalised from three dimensions
to the embedding's own. **The null model is not the SDK's, because the SDK has none.** A
bare "this cloud is a filament" is not a finding: the largest principal axis of a finite
sample is always the largest, so linearity is bounded away from zero by sampling alone.

The null took two attempts, and the failure is worth recording. The first permuted each
coordinate axis independently across points — and it was circular in exactly the manner of
`/dispatches/the-result-that-wasnt`. The eigenvalues of an axis-aligned cloud *are* its
per-axis variances, which independent permutation preserves exactly, so a genuine filament
scored no better than its own null. It was caught by the positive control, not by review.
The null now compares against an isotropic cloud of the same size and dimensionality, which
has no preferred direction by construction. Both controls are in `tests/geometry.test.ts`.

No declared absence closed. `geometry.principal_shape` is a new capability, not a gap
filler, and `DECLARED_ABSENCES` is unchanged.

---

## 4. What is deliberately not taken

Its orchestration layer, its storage abstraction, its build tooling and its opinions about
project structure — all of which we have, load-bearing, for guarantees the SDK does not
make. Its `Observable`/`Transform` generalisation, because ours is already tested against
the register. Its locality evaluator, because ours is better and because porting it would
mean importing the defect in §5. Its morphological bundle, on licence grounds. Its
traversal walk, because no current research question needs it.

Also not taken: the SDK's framing. It presents itself as the canonical substrate three
prior systems should converge on. That may be true for those systems. It is not an argument
about this one, and the parts of it that are genuinely better than what we have — typed
granularity, bound-relative exhaustion, the textual/perceptual distinction — are better on
their own merits, which is the only reason to want them.

---

## 5. Risks

**The morphological bundle is GPL.** Both upstream sources are GPL, so the derived data is
GPL. This repository declares no licence and is private. Vendoring the bundle would attach
that obligation to any distribution of this source, and committing it is hard to reverse.
Not taken pending an owner decision.

**The SDK's only null model is broken, and its tests do not catch it.** `measureBasis`
samples "random pairs" from a linear congruential generator written as
`(seed * 1103515245 + 12345) >>> 0`. That product exceeds 2⁵³, so it loses precision in
floating point and the sequence is not the generator it claims to be. Measured:

- the seed sequence has period **6,063**, not 2³², so 20,000 draws are ~3,031 distinct
  pairs repeated three times over while `nullModelSampleSize` reports 18,567;
- **99.8% of sampled indices are even**, so on a 60-node set the null model ever touches
  **28 of 60 nodes**.

On isotropic data the median-ratio statistic is robust enough to survive this. On data
where index order correlates with position — which is what an ordered corpus is — it does
not: in a layout where parity tracks cluster membership, the reported `medianRandom` is
**0.167 against a true 9.575, a 98.3% error**, and the reported locality is 0.10 where the
correct value is 0.0017.

The SDK's spatial test asserts only that `nullModelSampleSize > 0`. It never checks that a
structureless cloud scores ~1.0, which is the control that would have caught this. This is
the strongest single argument in this document for §88's instruction not to assume a prior
system's architecture is correct.

**Inherited results are not verified results.** The SDK carries no findings, so nothing was
inherited. Had it carried any, the same scepticism would apply.

---

## 6. Open questions for Abed

1. **The GPL bundle.** It closes `morphology.segment_arabic` outright and measurably — 98%
   coverage, 52 roots — and it would make root-level claims computable for the first time.
   Taking it makes any distribution of this source carry a GPL obligation on that data.
   Worth it, or not?

2. **Upgrading the corpus to `VERIFIED_AGAINST_EDITION`.** The text is now a verbatim copy
   of a named, licensed edition with a recorded checksum, not an agent's recollection.
   §29 reserves the declaration for you. Upgrading it is a checksum comparison, and it is
   what currently stands between this laboratory and its first promotable result.

3. **`relation.epistemicType`.** Adding a textual/perceptual distinction to the relation
   ontology is a real §12 improvement and a schema change that touches the ledger. Worth
   doing before more events accumulate, or not at all?

4. **Bound-relative exhaustion.** Now that selections carry a `limit`, a frontier item
   closed as exhausted was exhausted *under a bound*. The SDK's `reconcileState` is the
   right shape for this. Should the frontier adopt it?

5. **The measurement that now exceeds its null.** `measure.spatial_locality` reports
   0.3505 at p = 0.0033 on the admitted material, and the laboratory has recorded it as a
   supported discovery with zero challenges run against it. A structureless synthetic
   control does **not** produce a false positive here, so it is not the artefact the
   founding dispatch describes. But the embedding was produced by MDS *from the very
   relations the statistic correlates against*, and the measurement's own interpretation
   guard says it shows only that the embedding preserved the weights it was built from.
   It is displayed with that guard. Whether it should be described as a finding at all is
   your call, and the honest answer may be to strengthen the challenge instruments before
   the site says anything more about it.
