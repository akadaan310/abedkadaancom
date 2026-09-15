# abedkadaan.com

A computational research laboratory in which bounded AI processes observe research state,
propose instruments, and have those instruments **computed, measured and challenged**
before anything counts as a result.

The website is not a report about the research. It is the laboratory, rendered.

Built from [`SPEC.md`](./SPEC.md) — the Meta-Intelligence Operating Constitution — with no
prior codebase, SDK or framework assumed (§59). Section references throughout the source
(`§7`, `§20`, `§90` …) point back to that document.

---

## The loop

```
research state
   → observe      a bounded process reads the frontier and the capability registry
   → propose      it emits a schema-validated proposal, never a conclusion
   → compose      the proposal becomes an Engine, type-checked against the registry
   → audit        provenance, null model and hidden assumptions are inspected
   → compute      the Engine executes over versioned source data with a recorded seed
   → measure      statistics are compared against a declared null model
   → challenge    a counterexample Engine attacks the result
   → record       everything, including failure, is appended to a hash-chained ledger
   → expose       this website
   → observe again
```

## Running it

```bash
npm install
npm run lab:seed     # admit the corpus, open the first frontier items
npm run lab:tick 3   # run three turns of the loop
npm run lab:status   # what the laboratory can say about itself
npm run dev          # the laboratory, rendered, at http://localhost:3000
npm test             # the epistemic test suite
```

No API key is required. With `OPENROUTER_API_KEY` set, Nano-LLM roles route to models
through OpenRouter (§23, §73); without it the loop runs on a deterministic offline
proposer that is labelled `local-heuristic` everywhere it appears and never claims to be
a language model (§57).

## What is actually here

| Layer | Where | What it does |
|---|---|---|
| Ontology | `lab/ontology/` | Corpus, Locus, Observable, Relation, Structure, Embedding, Measurement, Engine, Experiment (§12); epistemic types and lifecycles (§15, §28) |
| Provenance | `lab/provenance/` | Machine-readable ancestry, completeness audit, lineage walk (§21, §65) |
| Ledger | `lab/ledger/` | Append-only hash-chained events, projection to state, materialized index (§22, §64) |
| Capabilities | `lab/capabilities/` | 21 real computations: Arabic transforms, observables, typed relations, community detection, MDS embedding, permutation and rewiring null models, challenge instruments (§13, §14, §16, §20, §66) |
| Engines | `lab/engine/` | Composition with static type-checking, execution, auditor, promotion gate (§7, §61, §67, §69) |
| Nano-LLMs | `lab/nano/` | Role contracts, structured proposals, provider-agnostic routing (§5, §23, §62) |
| Frontier | `lab/frontier/` | Research economy, cost-aware ranking (§46, §75, §99) |
| Loop | `lab/loop/` | One bounded turn of the continuous loop (§24, §44) |
| Site | `app/` | Observatory, engines, findings, frontier, capabilities, ledger, corpus, provenance explorer |

## Two things this laboratory refuses to do

**It will not let AI conclude anything.** A Nano-LLM may author `AI_PROPOSAL`,
`AI_HYPOTHESIS`, `AI_OBSERVATION`, `AI_INTERPRETATION` or `AI_COUNTEREXAMPLE`. It cannot
author `COMPUTED`, `DERIVED` or `INFERENCE` — those require an executed Engine — and it
cannot change an Engine's status at all. The check is a throwing guard in the data model
(`lab/ontology/epistemic.ts`), not a naming convention.

**It will not publish from an unverified source.** The working corpus is admitted as
`UNVERIFIED_TRANSCRIPTION`. Engines may compute over it; the promotion gate refuses to
make any result resting on it `CANONICAL` until a human researcher verifies the text
against a named edition (`lab/engine/promote.ts`). See [`lab/corpus/README.md`](./lab/corpus/README.md).

## A worked example of why this matters

The laboratory's first structure engine reported modularity `Q = 0.585` at `p = 0.002`
against a label-permutation null model — an apparently strong result.

It was an artefact. Label propagation *maximizes* modularity, so comparing its output
against random relabellings of the same graph is circular: a synthetic corpus built with
**no planted structure at all** scored just as well. Replacing it with a degree-preserving
rewiring null — rerunning the same detector on random graphs of the same degree sequence —
separates the cases cleanly:

| corpus | planted structure | p | exceeds null |
|---|---|---|---|
| synthetic, cohesion 0.95 | yes | 0.013 | **yes** |
| synthetic, cohesion 0.0 | none | 0.768 | no |
| quran-short-surahs | unknown | 0.152 | no |

Both null models are kept and displayed, the inadequate one explicitly labelled
`CONTROL, NOT A FINDING`, because choosing a null model is itself a research decision that
a reader is entitled to inspect (§20, §54). The synthetic controls are in
`tests/nullmodels.test.ts`; the negative control is the decisive test.

**The current honest state of this laboratory: zero supported findings.** On this corpus,
no computed relation has yet produced structure exceeding its null model. That is a
result, and it is displayed as one.

## Documents

- [`SPEC.md`](./SPEC.md) — the constitution this was built from
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — how the layers fit together
- [`docs/CONFORMANCE.md`](./docs/CONFORMANCE.md) — section-by-section: what is implemented, what is deliberately absent
