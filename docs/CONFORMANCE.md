# Conformance to the constitution

What is implemented, what is partial, and what is deliberately absent. §90 requires
capability absence to be explicit; this document applies that rule to the build itself.

## Implemented

| § | Requirement | Where |
|---|---|---|
| 5, 62 | Nano-LLM roles with contracts; structured output, never bare prose | `lab/nano/roles.ts`, `contract.ts` |
| 6, 67 | Proposals become executable compositions of real capabilities | `lab/nano/providers/`, `lab/engine/contract.ts` |
| 7, 61 | Engine as first-class structured state with a lifecycle | `lab/ontology/types.ts`, `lab/engine/` |
| 8 | Engine formation observable: rationale, audit, alternatives recorded | `ENGINE_COMPOSED`, `/engines/[id]` |
| 10, 26, 29 | Promotion gates; CANONICAL reserved to the researcher | `lab/engine/promote.ts` |
| 11 | Computation is the verification boundary | `lab/engine/execute.ts`; epistemic guard |
| 12 | Computational ontology, distinctions preserved | `lab/ontology/types.ts` |
| 13 | Transforms declare preservation, loss, invertibility — and are tested | `lab/capabilities/arabic.ts`, `tests/transforms.test.ts` |
| 14 | Typed relations with weight, evidence, epistemic type, provenance | `lab/capabilities/relations.ts` |
| 15, 28, 87 | Discovery lifecycle; epistemic categories in the data model | `lab/ontology/epistemic.ts` |
| 16, 42 | Structure before visualization; embeddings record their basis | `lab/capabilities/structures.ts` |
| 19, 68 | Counterexample engines composed against results | `lab/capabilities/challenge.ts`, tick |
| 20 | Null models first-class, with an appropriateness distinction | `lab/capabilities/measurement.ts` |
| 21, 65 | Machine-readable provenance; queryable lineage | `lab/provenance/`, `/provenance/[id]` |
| 22, 64 | Event-driven state, hash-chained, projected | `lab/ledger/` |
| 23, 73 | Provider-agnostic routing via OpenRouter | `lab/nano/router.ts` |
| 24, 60 | The closed loop, bounded by budget | `lab/loop/tick.ts` |
| 44, 45, 75, 76, 99 | Cost-aware scheduling, frontier queue, research economy | `lab/frontier/` |
| 46 | Explicit frontier with blocked states | `/frontier` |
| 47 | Self-discovery measured | `LabMetrics`, Observatory |
| 48 | Failure preserved as research state | `FailureRecord` |
| 49 | Tests protect epistemic claims | `tests/` (29 tests) |
| 50 | Capabilities carry permissions | `Capability.permissions` |
| 54, 55, 83 | AI's work and computational lineage inspectable | `/engines/[id]`, `/provenance/[id]` |
| 56, 57 | Uncertainty exposed; no manufactured activity | throughout the site |
| 66, 89, 90 | Self-describing registry; declared absences | `lab/capabilities/registry.ts`, `/capabilities` |
| 69 | Engine auditor | `lab/engine/audit.ts` |
| 87, 95 | Source verification gates publication | `lab/corpus/`, promotion gate |
| 96, 97 | Reproducibility from seeds; nondeterminism recorded | `ModelUse`, content-addressed ids |

## Partial

- **§18, §98 — AI disagreement.** The `Disagreement` type, the ledger event and the
  projection exist, and roles are routed to different model tiers. Nothing yet routes the
  *same* question to several models and records where they diverge. The type is in place
  so that doing so does not require a schema change.
- **§32 — searching the space of Engines.** The composer generates and ranks a small
  candidate set. It does not search the composition space; declared absent as
  `engine.search_composition_space`.
- **§34, §72 — Meta-Engines and meta-learning.** Declared absent as
  `meta.engine_benchmark`: comparing engines needs a population of engines with
  comparable results, and six runs is not that. Recording it as a gap is the honest move.
- **§92 — AI interpretation.** The type, marking and linkage exist; the offline proposer
  deliberately abstains rather than emitting template prose dressed as interpretation.
  With a model provider configured, the INTERPRETER role produces it.

## Deliberately absent

Published at `/capabilities` and `/frontier` as declared absences, because §59 forbids
placeholders that falsely imply external engines exist:

- `morphology.segment_arabic` — no morphological database is present. **Every token-level
  result here is surface-form only**, and no claim phrased in terms of roots is currently
  computable.
- `audio.align_recitation` (§40) and `time.temporal_traversal` (§41) — no audio data or
  alignment model exists in this repository.
- `external.fetch_dataset` — `REQUEST_EXTERNAL_DATA` is granted to no role.

## Known limitations of the current instruments

- The corpus is 28 loci. Permutation tests on a corpus this small have limited power; a
  negative result is weak evidence of absence, which is why findings are reported as
  "did not exceed its null model" rather than "no structure exists".
- Letter-profile cosine similarity is a crude instrument. It is used because it is
  genuinely computable and honestly described, not because it is the right instrument for
  Qur'anic structure.
- `text.rasm_skeleton` approximates rasm by shape class. It does not model ligatures or
  positional forms, and its declaration says so.
