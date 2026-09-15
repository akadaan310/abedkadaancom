# Architecture

The laboratory core (`lab/`) knows nothing about the web. The site (`app/`) only renders
what the ledger already contains. §58 requires this separation: the website can render the
state, but must not become the state.

```
                    researcher
                        │  (interprets, verifies, promotes)
                        ▼
  ┌──────────────────────────────────────────────────┐
  │  app/            observation surface              │  reads only
  └──────────────────────┬───────────────────────────┘
                         │ project()
  ┌──────────────────────▼───────────────────────────┐
  │  lab/ledger/     append-only hash-chained events  │  the history
  └──────────────────────▲───────────────────────────┘
                         │ append()
  ┌──────────────────────┴───────────────────────────┐
  │  lab/loop/       one bounded turn of the loop     │
  │       ├── lab/frontier/    what to do next        │
  │       ├── lab/nano/        who proposes           │
  │       ├── lab/engine/      compose, audit, run    │
  │       └── lab/capabilities/ what can be computed  │
  └──────────────────────┬───────────────────────────┘
                         │ reads
  ┌──────────────────────▼───────────────────────────┐
  │  lab/corpus/     versioned research material      │
  └──────────────────────────────────────────────────┘
```

## Why event-sourced

§27 says AI must not silently overwrite canonical research state. Rather than enforcing
that with review discipline, the ledger has **no update path at all**: `LedgerStore`
exposes `read` and `append`, nothing else. Each event's hash covers its own content and
its predecessor's hash, so altering any past event invalidates every event after it, and
`verifyChain` says so on the `/ledger` page.

A consequence worth stating: correcting a mistake means appending a correcting event, not
editing the original. The mistake stays visible. That is intended (§48).

## Why content-addressed ids

`contentId(prefix, value)` hashes the canonical JSON of an object's defining content. An
engine composed twice from the same steps, config and protocol **is** the same engine and
gets the same id; change any declared input and it is provably a different engine. This
makes §96 reproducibility checkable rather than aspirational — `tests/epistemics.test.ts`
asserts that re-executing an engine produces a byte-identical result id.

## Where the epistemic boundary lives

In the type system and in a throwing guard, not in prose:

```ts
permittedFor({ kind: 'NANO_LLM', ... })  // AI_PROPOSAL, AI_HYPOTHESIS, AI_OBSERVATION, …
permittedFor({ kind: 'ENGINE', ... })    // COMPUTED, DERIVED, INFERENCE
permittedFor({ kind: 'RESEARCHER', ... })// RESEARCHER_NOTE, RESEARCHER_INTERPRETATION, …
```

A `Relation` produced by `relation.cosine_profile` is `COMPUTED` even though a Nano-LLM
suggested computing it, because an engine computed it. A Nano-LLM's suggestion that two
passages are related is `AI_PROPOSAL` however confident the prose. The distinction is a
field on the object (§28), which is why the website can display it without deciding it.

## Values flowing through an engine

Engine steps pass typed values: `LocusSet → TextSet → TokenSet | ProfileSet →
RelationSet → StructureValue → EmbeddingValue → MeasurementSet`. `validateComposition`
checks the whole chain **before** execution, so a proposal naming a capability that does
not exist, or wiring a `TextSet` into something expecting a `ProfileSet`, is rejected at
composition time rather than failing halfway through a run (§61, §66).

This is also what stops a model from inventing tools: it cannot name a capability that is
not in the registry, and it is shown the registry in its prompt.

## Null models are part of the capability, not bolted on

`measure.modularity` re-runs *the same detector* that produced the observed partition on
each rewired draw, reading which detector that was from the provenance derivation chain
rather than from config, so the null cannot drift away from what actually ran. The shared
graph mathematics in `lab/capabilities/graph.ts` is used for both the observed statistic
and the null draws for the same reason (§20).

## The public surface

`app/` is a publication over the laboratory, in three parts. The **practice** (`/practice`)
sells instruments; the **arcade** (`/arcade`) gives prompts away; the **laboratory**
(`/laboratory` and the records beneath it) is the evidence for both. A route group,
`app/(lab)/`, adds the records' secondary navigation without changing any URL.

Guest entrances (`/visit/[guest]`) implement §43: many worlds from one research state.
An entrance changes the order and the register in which the laboratory introduces itself,
and is forbidden from changing a figure. Each reads the same live ledger and says so.

## Demonstrations and the arcade

`lab/demo/` runs ten demonstrations, one per service. Six are pure computation; four call
a model and then check what came back — and the check is what is displayed. `lab/arcade/`
holds twelve prompts and a runner that accepts either this site's models or a key the
visitor supplies for a single call.

Both are public endpoints that spend money, so `lab/demo/guard.ts` bounds input, rate
limits per address, and caps model-backed calls per day. Those counters live in process
memory, so on a serverless runtime each instance keeps its own and the ceiling is
approximate — said here rather than implied to be exact.

## Runtime

`lab/runtime.ts` is the single assembly point. On a read-only serverless filesystem the
file store reports `CapabilityUnavailable(WRITE_EXPERIMENT, PERMISSION_UNAVAILABLE)`
rather than pretending a write succeeded (§74, §90); the site still renders the committed
ledger. Ticks are run from the command line or a scheduled job, not from a page request.
