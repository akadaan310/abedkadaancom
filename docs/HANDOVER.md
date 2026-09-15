# Handover — Engine SDK investigation

A prompt for the next agent. Copy everything below the line into a fresh session,
replacing `<OWNER/REPO>` with the Engine SDK repository.

---

## Who you are and what you are joining

You are investigating an existing **Engine SDK repository** to see what it can
contribute to **abedkadaan.com** — a working computational research laboratory
belonging to Abed Kadaan, already built and running.

Your job is **not** to rebuild anything, adopt the SDK's architecture, or port the site
onto it. Your job is to mine the SDK for evidence and extract what genuinely earns a
place. The governing instruction is §88 of the laboratory's constitution
(`SPEC.md` in the target repo):

> If prior research material, repositories, papers, or datasets become available later,
> inspect them as evidence. **Do not assume their architecture is correct. Do not discard
> genuine findings.** Extract data, algorithms, computational primitives, tests,
> observations, terminology when useful. But the current laboratory must remain
> understandable and runnable without them.

Read that sentence twice. An SDK that looks more sophisticated than the current system is
not thereby more correct, and "we already have a framework for that" is not an argument.

## The repositories

**Target (already built, do not restructure):** `akadaan310/abedkadaancom`, branch
`claude/new-session-xd8auu`. Read `README.md`, then `SPEC.md`, then
`docs/ARCHITECTURE.md` and `docs/CONFORMANCE.md` before touching anything.

**Note:** six commits on that branch are local-only and were not pushed at handover.
Confirm what is actually on the remote (`git log --oneline origin/<branch>..HEAD`) before
assuming the remote reflects the state described here.

**Under investigation:** `<OWNER/REPO>`. Attach it with the `add_repo` tool; if you do not
have the name, call `list_repos` first. Do not pre-check it with curl or `gh` — private
repos return 404 to unauthenticated requests and will mislead you.

## What already exists — do not rebuild these

Twenty-one registered capabilities, all real computation, all with declared contracts:

```
corpus.select_loci
text.diacritics.split  text.normalize.arabic  text.rasm_skeleton  text.tokenize
observable.letter_profile  observable.length
relation.cosine_profile  relation.jaccard_tokens  relation.length_proximity
structure.threshold_graph  structure.components  structure.communities
embedding.classical_mds  traverse.shortest_path
measure.modularity  measure.spatial_locality  measure.information_loss
measure.partition_agreement
challenge.threshold_stability  challenge.holdout_stability
```

Also already built: an append-only hash-chained ledger with projection, machine-readable
provenance with lineage walking, engine composition with static type-checking, an engine
auditor, a promotion gate, a cost-aware research frontier, a bounded discovery loop, a
provider-agnostic model layer, ten live service demonstrations, and a twelve-program
prompt arcade. 47 tests pass. The site builds and runs.

## The six declared absences — these are your targets

The laboratory publishes what it cannot do, with reasons
(`lab/capabilities/registry.ts`, shown at `/frontier` and `/capabilities`):

| absent capability | why | priority |
|---|---|---|
| `morphology.segment_arabic` | No morphological database. **Every token-level result is currently surface-form only, and no root-level claim is computable.** | **Highest.** This is the single biggest limitation on the research. |
| `audio.align_recitation` | No audio data or alignment model (§40) | High if the SDK carries either |
| `time.temporal_traversal` | No timing source; depends on audio (§41) | Follows audio |
| `engine.search_composition_space` | The composer ranks a small candidate set; it does not search (§32) | Medium |
| `meta.engine_benchmark` | Too few engines run for comparison to mean anything (§34) | Low — a real evidence problem, not a code problem |
| `external.fetch_dataset` | Permission not granted to any role (§50) | Deliberate; leave alone |

**If the SDK closes the morphology gap, that alone justifies the investigation.**

## What to extract, in priority order

1. **Datasets and corpora.** Morphological databases, verified texts, audio with
   alignments, timing data. Data is the scarcest thing here and the hardest to rebuild.
2. **Algorithms with known-good behaviour**, especially anything with tests attached.
   Port the algorithm; do not port the framework around it.
3. **Null models and controls.** Any randomisation procedure appropriate to a statistic
   the laboratory already computes. This is the laboratory's core discipline and good
   null models are rare.
4. **Tests, especially negative controls** — cases asserting that a method finds
   *nothing* when there is nothing. See "the one story you must understand" below.
5. **Terminology and domain semantics.** §12 forbids flattening distinct concepts for
   architectural convenience. If the SDK makes a distinction the ontology lacks, that is
   a finding.
6. **Observations and prior findings**, with whatever provenance they carry.

## What to ignore

Its orchestration layer, its storage abstraction, its agent framework, its build
tooling, its opinions about project structure. The laboratory has all of these and they
are load-bearing for guarantees the SDK probably does not make.

## Invariants you must not break

These are enforced in code, not convention. Violating one is a defect, not a trade-off.

1. **A model process may never author a computed result.** `AI_PROPOSAL`,
   `AI_HYPOTHESIS`, `AI_OBSERVATION`, `AI_INTERPRETATION`, `AI_COUNTEREXAMPLE` only.
   `COMPUTED` / `DERIVED` / `INFERENCE` require an executed engine. This is a throwing
   guard in `lab/ontology/epistemic.ts`.
2. **The ledger is append-only and hash-chained.** There is no update path. A correction
   is a new event; the mistake stays visible.
3. **Ids are content-addressed.** A changed thing is provably a different thing.
4. **Every transformation declares what it preserves, discards, and whether it is
   invertible** — and the test suite checks the declaration (§13). A capability that
   cannot state its information loss is not ready.
5. **Every statistical claim carries a null model**, and every measurement carries an
   `interpretationGuard` stating what it does not license (§20).
6. **A capability the registry does not contain cannot be executed.** No proposal, from
   any model, can name its way past this.
7. **Absence is declared, never stubbed** (§59, §90). If the SDK gets you halfway to a
   capability, the honest move is a narrower capability that works, plus a revised
   absence — not a placeholder that implies reach the system lacks.
8. **The Qur'anic corpus is `UNVERIFIED_TRANSCRIPTION`.** Compute over it freely;
   the promotion gate refuses to make any result resting on it canonical until a human
   verifies it against a named edition. Do not weaken this, and do not let the laboratory
   become identified with that one corpus — it is one entry in a register.

## The capability contract you must write against

`lab/capabilities/kernel.ts`. A capability declares:

```ts
{
  name, purpose,
  inputs: LabValueType[],   // LocusSet TextSet TokenSet ProfileSet
  output: LabValueType,     // RelationSet StructureValue EmbeddingValue MeasurementSet
  configKeys, costUnits, latencyHintMs, permissions, dependencies,
  transform?,               // required if it transforms text: preserves/discards/invertibility/conditions
  run(inputs, config, ctx)  // pure w.r.t. declared inputs; same inputs + config + seed ⇒ same output
}
```

Register it in `lab/capabilities/registry.ts`, and remove or narrow the corresponding
entry in `DECLARED_ABSENCES` in the same commit. Anything stochastic draws from the
seeded generator in `lab/capabilities/rng.ts` — never `Math.random`.

## The one story you must understand before proposing anything

The first instrument this laboratory built reported modularity `Q = 0.585` at
`p = 0.002` — textbook significant. It was an artefact. The community detector maximises
the quantity being tested, so comparing it against shuffled labels is circular; a
synthetic corpus containing **no planted structure at all** scored the same. It was
caught by a negative control, not by review.

The corrected null (degree-preserving rewiring, same detector re-run) separates the
controls cleanly. Both nulls remain published, the bad one labelled
`CONTROL, NOT A FINDING`. Read `/dispatches/the-result-that-wasnt` and
`tests/nullmodels.test.ts`.

**The current honest state of this laboratory is zero supported findings.** If your work
produces a finding, your first obligation is to try to break it. If the SDK contains
findings, apply the same scepticism — inherited results are not verified results.

## What to deliver

Write `docs/SDK-INVESTIGATION.md` in the target repo containing:

1. **What the SDK actually is** — one paragraph, no marketing language.
2. **Inventory** — its capabilities, datasets, algorithms and tests, mapped against the
   21 existing capabilities and the 6 declared absences. Mark each: *already have*,
   *closes a declared absence*, *new and useful*, *not useful here*.
3. **Extraction plan** — ordered by research value, with effort estimates and what each
   item would let the laboratory compute that it currently cannot.
4. **What you are deliberately not taking, and why.**
5. **Risks** — licensing, data provenance, unverified sources, anything that would make
   a result uncitable. A dataset with unknown provenance is an `UNVERIFIED` corpus at
   best; say so.
6. **Open questions for Abed** — decisions that are his, not yours.

Then, if and only if something clearly earns it, implement **one** capability end to end:
contract, tests including a negative control, registry entry, revised absence, and a
demonstration of it running on admitted material. One real capability beats six
plausible ones.

## How this goes wrong

You adopt the SDK's framing because it is articulate. You port an algorithm without its
null model and the laboratory starts reporting findings it cannot defend. You fill a
declared absence with a stub, so the system now claims reach it does not have. You take a
dataset with unknown provenance and quietly admit it as verified. You let the Qur'anic
corpus become the identity of the laboratory instead of one corpus in a register.

Every one of those is worse than reporting that the SDK had nothing to offer. A clean
"nothing here worth taking" is a perfectly good result, and this system is built to
publish exactly that kind of answer.
