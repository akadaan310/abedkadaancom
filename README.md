# abedkadaan.com

**Abed Kadaan — Living Research Laboratory.** A practice in computational
intelligence, a catalogue of free programmable prompts, and a working research
laboratory that backs both.

The site is a publication, not a dashboard. Everything it reports was computed by
code in this repository, and where the laboratory does not know something, it says so.

---

## Three surfaces

**The practice** — ten services, led by *Time-Durable Communication*: recovering what
a record actually encodes, and building records a stranger can verify decades later.
Each service states what it is not, and carries a live demonstration you can run
before speaking to anyone.

**The arcade** — twelve programmable prompts, given away. Games that make you hunt the
fatal flaw in a plausible finding; instruments that sort a decision into what is
established, inferred, assumed and unknown; contracts that stop a model overclaiming.
Every prompt is printed in full. Run them on this site's models or your own key.
SDK-level access for developers: **akadaan310@gmail.com**.

**The laboratory** — a running system that proposes its own instruments, computes them,
tests them against chance, attacks its own results, and records the failures.
Built from [`SPEC.md`](./SPEC.md), the Meta-Intelligence Operating Constitution, with no
prior codebase or SDK assumed (§59). Section references throughout the source point back
to it.

## The loop

```
research state
   → observe      a bounded process reads the frontier and the capability register
   → propose      it emits a schema-validated proposal, never a conclusion
   → compose      the proposal becomes an instrument, type-checked against the register
   → audit        provenance, null model and hidden assumptions are inspected
   → compute      the instrument executes over versioned material with a recorded seed
   → measure      statistics are compared against a declared null model
   → challenge    a counterexample instrument attacks the result
   → record       everything, including failure, is appended to a hash-chained ledger
   → expose       this site
   → observe again
```

## Running it

```bash
npm install
cp .env.example .env.local   # optional: add model provider keys
npm run lab:seed             # admit the corpus, open the first frontier items
npm run lab:tick 3           # run three turns of the loop
npm run lab:status           # what the laboratory can say about itself
npm run dev                  # the site at http://localhost:3000
npm test                     # 47 tests
```

No API key is required. With keys present, the loop and the demonstrations route to
real models; without them, the loop runs on a deterministic offline proposer labelled
`local-heuristic` everywhere it appears, which never claims to be a model (§57).

## Model providers

One HTTP layer for any OpenAI-compatible endpoint (`lab/models/providers.ts`), tried in
order, recording which one served and which failed. No vendor is privileged; model
identity is recorded for provenance and never confers authority.

| provider | env | status on this deployment |
|---|---|---|
| Groq | `GROQ_API_KEY` | reachable |
| Mistral | `MISTRAL_API_KEY` | reachable |
| OpenRouter | `OPENROUTER_API_KEY` | reachable |
| Cerebras | `CEREBRAS_API_KEY` | configured, no quota — returns `payment_required`, shown rather than hidden |

Adding a provider is a row in that table.

## Layout

| Layer | Where | What it does |
|---|---|---|
| Ontology | `lab/ontology/` | Computational primitives (§12); epistemic types and lifecycles (§15, §28) |
| Provenance | `lab/provenance/` | Machine-readable ancestry, completeness audit, lineage (§21, §65) |
| Ledger | `lab/ledger/` | Append-only hash-chained events, projection, materialized index (§22, §64) |
| Capabilities | `lab/capabilities/` | 21 real computations: Arabic transforms, observables, typed relations, community detection, MDS embedding, permutation and rewiring null models, challenge instruments |
| Engines | `lab/engine/` | Composition with static type-checking, execution, auditor, promotion gate (§7, §61, §69) |
| Nano-LLMs | `lab/nano/` | Role contracts, structured proposals, provider-agnostic routing (§5, §23, §62) |
| Models | `lab/models/` | The shared provider population |
| Arcade | `lab/arcade/` | The twelve programs and their runner |
| Demos | `lab/demo/` | Ten live service demonstrations, with spending guards |
| Frontier | `lab/frontier/` | Research economy, cost-aware ranking (§46, §75, §99) |
| Loop | `lab/loop/` | One bounded turn of the continuous loop (§24, §44) |
| Site | `app/` | Cover, practice, arcade, dispatches, laboratory records |

## Two things this system refuses to do

**It will not let AI conclude anything.** A model process may author `AI_PROPOSAL`,
`AI_HYPOTHESIS`, `AI_OBSERVATION`, `AI_INTERPRETATION` or `AI_COUNTEREXAMPLE`. It cannot
author `COMPUTED`, `DERIVED` or `INFERENCE` — those require an executed instrument — and
it cannot change an instrument's status at all. The check is a throwing guard in the data
model (`lab/ontology/epistemic.ts`), not a naming convention.

**It will not publish from an unverified source.** The working corpus is admitted as
`UNVERIFIED_TRANSCRIPTION`. Instruments may compute over it; the promotion gate refuses
to make any result resting on it `CANONICAL` until a human researcher verifies the text
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
| synthetic, cohesion 0.95 | yes | ~0.01 | **yes** |
| synthetic, cohesion 0.0 | none | ~0.77 | no |
| quran-short-surahs | unknown | ~0.15 | no |

Both null models are kept and displayed, the inadequate one labelled
`CONTROL, NOT A FINDING`. The full account is at `/dispatches/the-result-that-wasnt`,
where those figures are computed when the page is opened.

**The current honest state: zero supported findings.** No computed relation on this
corpus exceeds its null model, and the site says so on its front page.

## Security

Provider keys live in `.env.local`, which is gitignored and read server-side only. The
demonstration and arcade endpoints are public and spend money, so input is bounded,
requests are rate-limited per address, and model-backed calls have a daily ceiling. The
counters are per process, which is approximate on a serverless runtime — stated in the
code rather than implied to be stronger. A key supplied by a visitor is forwarded for
that single call and never stored or logged.

## Documents

- [`SPEC.md`](./SPEC.md) — the constitution this was built from
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — how the layers fit together
- [`docs/CONFORMANCE.md`](./docs/CONFORMANCE.md) — section by section: implemented, partial, deliberately absent
