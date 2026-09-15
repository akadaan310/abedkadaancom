# Research material

The laboratory holds a **register** of corpora, not a single text. Nothing in the engine
layer is specific to any one of them: a corpus is an addressed sequence of loci with a
declared verification status, and every capability computes over that shape alone.

## Verification status

`data/tanzil-uthmani.json` is admitted as **`UNVERIFIED_TRANSCRIPTION`**, and the reason
is narrower than that label usually implies.

The text is a **verbatim copy of a named digital edition** — the Tanzil Quran Text
(Uthmani), Copyright (C) 2007–2021 Tanzil Project, released under Creative Commons
Attribution 3.0. It was not transcribed by an agent from memory. `scripts/fetch-corpus.mjs`
records the source URL and the SHA-256 of the exact bytes it was built from, and rebuilds
the file deterministically.

It is nonetheless not marked `VERIFIED_AGAINST_EDITION`, because §29 reserves that
declaration for a human researcher. Upgrading it is a checksum comparison against the
Tanzil project's published text, not a re-reading — but it is a human's call to make, and
the laboratory does not make it on their behalf.

Until then, handled explicitly rather than quietly:

- the status is displayed on every page that shows the corpus;
- `lab/engine/promote.ts` refuses to promote any result resting on it to `CANONICAL`;
- the Engine Auditor raises it as a warning on every engine that reads it;
- the frontier carries a permanent `AWAITING_RESEARCHER` item to verify it.

## The licence constrains how the text is stored

The Tanzil licence permits verbatim copying and **forbids modification**. The text is
therefore stored exactly as retrieved, and every normalization the laboratory performs —
mark stripping, orthographic folding, skeleton collapse — happens inside a declared
capability at compute time, applied to a copy. No transform writes back to the corpus.

This is the same discipline §13 already required for a different reason, so the licence
costs the laboratory nothing it was not already doing.

## Scale, and why selection is a first-class step

The corpus is 6,236 loci. Relations are pairwise, so an unbounded selection is quadratic
and neither a page render nor a loop turn can afford it. `corpus.select_loci` therefore
carries a `limit` alongside its address filters, and compositions select before they
compute. The bound is ordinary recorded configuration: it travels in the engine's
provenance, so a result always states the selection it was computed over.

## Rebuilding

```bash
node scripts/fetch-corpus.mjs
```

Changing the text changes `dataVersion`, which changes every content-addressed id derived
from it. Past results remain in the ledger, correctly attributed to the data version they
were computed from; they are not silently revalidated against the new text.

## Adding a corpus

Drop a file of the same shape into `data/`. The register loads the directory, so nothing
else needs to change:

```json
{
  "slug": "your-corpus",
  "sourceVerification": "VERIFIED_AGAINST_EDITION",
  "sourceStatement": "Name the edition, printing and date here.",
  "dataVersion": "1.0.0",
  "loci": [{ "address": [1, 1], "ref": "1:1", "text": "…" }]
}
```

## Synthetic controls

`synthesizeCorpus()` builds corpora with known ground truth, marked `SYNTHETIC`. They are
method-testing instruments, never research material: a positive control (planted structure
the engines should find) and a negative control (no structure, which they must not find).
The negative control is the reason `/dispatches/the-result-that-wasnt` exists.
