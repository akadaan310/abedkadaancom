# Research material

## Verification status

`data/quran-short-surahs.json` is admitted to the laboratory as
**`UNVERIFIED_TRANSCRIPTION`**.

It was transcribed in imlaa'i orthography, without full tashkeel, by the implementing
agent from general knowledge, so that the laboratory would have real Arabic research
material on its first run. **It has not been checked against a printed or critical
edition.**

The laboratory handles this explicitly rather than quietly:

- the status is displayed on every page that shows the corpus;
- `lab/engine/promote.ts` refuses to promote any result resting on it to `CANONICAL`;
- the Engine Auditor raises it as a warning on every engine that reads it;
- the frontier carries a permanent `AWAITING_RESEARCHER` item to verify it.

## Replacing it with a verified text

Drop in a file of the same shape and update two fields:

```json
{
  "slug": "quran",
  "sourceVerification": "VERIFIED_AGAINST_EDITION",
  "sourceStatement": "Name the edition, printing and date here.",
  "dataVersion": "1.0.0",
  "loci": [{ "address": [1, 1], "ref": "1:1", "text": "…" }]
}
```

Changing the text changes `dataVersion`, which changes every content-addressed id derived
from it. Past results remain in the ledger, correctly attributed to the data version they
were computed from; they are not silently revalidated against the new text.

## Synthetic controls

`synthesizeCorpus()` builds corpora with known ground truth, marked `SYNTHETIC`. They are
method-testing instruments, never research material: a positive control (planted structure
the engines should find) and a negative control (no structure, which they must not find).
