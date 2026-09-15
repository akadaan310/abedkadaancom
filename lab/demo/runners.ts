/**
 * The ten demonstrations.
 *
 * Each one runs real laboratory code. Where a model is involved it proposes and the
 * laboratory checks; the check is the part worth watching. Nothing here is scripted:
 * if a model returns something the register refuses, the refusal is what gets displayed.
 */
import { chat, NoProviderAvailable, stripFences } from '../models/providers';
import { buildRegistry, readState, loadCorpora } from '../runtime';
import { DECLARED_ABSENCES } from '../capabilities/registry';
import { computeContext, type LabValue } from '../capabilities/kernel';
import { normalizeArabic, rejoinDiacritics, splitDiacritics } from '../capabilities/arabic';
import { entropy } from '../capabilities/graph';
import { synthesizeCorpus, tokenize, buildCorpus } from '../corpus/loader';
import { validateComposition } from '../engine/contract';
import { contentId, digest } from '../ontology/canonical';
import { auditProvenance } from '../provenance/provenance';
import { verifyChain } from '../ledger/events';
import { MemoryLedgerStore } from '../ledger/store';
import { project } from '../ledger/projection';
import { tick } from '../loop/tick';
import { NanoRouter } from '../nano/router';
import { ROLES } from '../nano/roles';
import { NanoProposalBodySchema } from '../nano/contract';
import type { ComputedBlock, DemoOutput, DemoProvenance } from './types';
import type { Corpus, Measurement } from '../ontology/types';

const ARABIC_EXAMPLE = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

function provenanceOf(r: Awaited<ReturnType<typeof chat>>): DemoProvenance {
  return { provider: r.provider, model: r.model, latencyMs: r.latencyMs, attempts: r.attempts };
}

function unavailable(err: unknown, elapsedMs: number, computed: ComputedBlock[], guard: string): DemoOutput {
  if (err instanceof NoProviderAvailable) {
    return {
      computed,
      guard,
      elapsedMs,
      unavailable: {
        reason: 'MODEL_UNAVAILABLE',
        detail: err.attempts.length === 0
          ? 'No model provider is configured in this deployment. The computed half of this demonstration still ran.'
          : `Every configured provider failed. ${err.attempts.map((a) => `${a.provider}/${a.model}: ${a.error}`).join(' · ')}`,
      },
    };
  }
  return {
    computed,
    guard,
    elapsedMs,
    unavailable: { reason: 'DEMONSTRATION_FAILED', detail: (err as Error).message },
  };
}

function ctxFor(corpus: Corpus, seed = 42) {
  return computeContext({
    now: new Date().toISOString(),
    actor: { kind: 'ENGINE', engineId: 'demo', engineVersion: 1 },
    corpora: new Map([[corpus.slug, corpus]]),
    sources: { [corpus.slug]: corpus.dataVersion },
    seed,
    engineId: 'demo',
    engineVersion: 1,
  });
}

/* ---------------------------------------------------------------- 01 ------ */

export async function timeDurableCommunication(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const text = (input || ARABIC_EXAMPLE).slice(0, 600);

  // Reversible: marks removed with their positions, so the original is recoverable.
  const { base, removed } = splitDiacritics(text);
  const restored = rejoinDiacritics(base, removed);
  const exact = restored === text;

  // Lossy: orthographic normalisation, which genuinely destroys distinctions.
  const normalized = normalizeArabic(text);
  const charTypes = (s: string) => new Set([...s.replace(/\s+/gu, '')]).size;
  const counts = (s: string) => {
    const m = new Map<string, number>();
    for (const ch of s.replace(/\s+/gu, '')) m.set(ch, (m.get(ch) ?? 0) + 1);
    return [...m.values()];
  };
  const lostTypes = charTypes(text) - charTypes(normalized);
  const entropyDelta = entropy(counts(normalized)) - entropy(counts(text));

  const address = contentId('doc', { text });
  const normalizedAddress = contentId('doc', { text: normalized });

  const computed: ComputedBlock[] = [
    {
      label: 'Reversible transformation — recorded removal',
      rows: [
        ['marks removed', String(removed.length)],
        ['round-trip restores the original exactly', exact ? 'yes' : 'NO — this would be a defect'],
        ['what survives', 'every character, every mark, every position'],
      ],
      note: 'The marks are stored with their original positions, so the transformation is reversible and the claim is checkable rather than asserted.',
    },
    {
      label: 'Irreversible transformation — orthographic normalisation',
      rows: [
        ['character types no longer distinguished', String(lostTypes)],
        ['entropy change (bits)', entropyDelta.toFixed(4)],
        ['reversible', 'no — the mapping is many-to-one'],
        ['result', normalized.slice(0, 160) || '(empty)'],
      ],
      note: 'Published with the loss declared. A reader in fifty years can see precisely what this step destroyed, instead of inheriting a clean-looking string with no history.',
    },
    {
      label: 'Content address — identity that survives copying',
      rows: [
        ['original', address],
        ['after normalisation', normalizedAddress],
        ['same document?', address === normalizedAddress ? 'yes' : 'no — provably a different object'],
        ['sha-256 of original', digest({ text }).slice(0, 32) + '…'],
      ],
      note: 'Identity derives from content, not from a filename or a database row. A changed document cannot quietly keep the old name.',
    },
  ];

  const guard =
    'This demonstrates the mechanics of durability — reversibility, declared loss, and content-addressed identity. ' +
    'It does not verify your source text, and it does not establish anything about what the text means.';

  try {
    const result = await chat({
      system:
        'You are assisting a demonstration about making records survive time. You are given the measured facts of two ' +
        'transformations. Write at most 90 words explaining, to a non-specialist, what a reader fifty years from now ' +
        'would be able to reconstruct and what they would not. Do not invent numbers. Plain prose, no lists.',
      user: JSON.stringify({ marksRemoved: removed.length, roundTripExact: exact, characterTypesLost: lostTypes, entropyDelta }),
      maxTokens: 220,
    });
    return {
      computed,
      proposed: { label: 'Model reading of the measured facts', body: result.text.trim(), schemaValid: true },
      provenance: provenanceOf(result),
      guard,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return unavailable(err, Date.now() - started, computed, guard);
  }
}

/* ---------------------------------------------------------------- 02 ------ */

export async function measurementDesign(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const registry = buildRegistry();
  const corpora = await loadCorpora();
  const corpus = corpora[0];
  const question = (input || 'Do these passages group by the letters they use?').slice(0, 400);

  const guard =
    'A composition that type-checks is not a finding. It means the proposal names capabilities that exist and wires ' +
    'them together legally. Whether the instrument answers your question is decided by running it and testing the ' +
    'result against a null model.';

  if (!corpus) {
    return { computed: [], guard, elapsedMs: Date.now() - started, unavailable: { reason: 'NO_CORPUS', detail: 'No corpus is admitted in this deployment.' } };
  }

  try {
    const result = await chat({
      system:
        'You compose research instruments from a fixed register of capabilities. Reply with JSON only: ' +
        '{"steps":[{"capability":"...","from":["input"],"as":"...","config":{}}],"rationale":"..."}. ' +
        'The first step must consume "input", which is a LocusSet. Each later step consumes the "as" name of an ' +
        'earlier step. You may ONLY use capabilities from the register given. Types must match. End with a measurement.',
      user: JSON.stringify({
        question,
        register: registry.all().map((c) => ({ name: c.name, consumes: c.inputs, produces: c.output, purpose: c.purpose })),
      }),
      json: true,
      maxTokens: 700,
    });

    let steps: { capability: string; from: string[]; as: string; config: Record<string, never> }[] = [];
    let rationale = '';
    let parseError = '';
    try {
      const parsed = JSON.parse(stripFences(result.text)) as { steps?: typeof steps; rationale?: string };
      steps = (parsed.steps ?? []).slice(0, 8).map((s) => ({
        capability: String(s.capability),
        from: (s.from ?? []).map(String),
        as: String(s.as),
        // Clamp anything expensive: a demonstration must not be a way to buy compute.
        config: Object.fromEntries(
          Object.entries(s.config ?? {}).map(([k, v]) => [k, k === 'iterations' ? Math.min(Number(v) || 100, 100) : v]),
        ) as Record<string, never>,
      }));
      rationale = String(parsed.rationale ?? '');
    } catch (e) {
      parseError = (e as Error).message;
    }

    const problems = parseError ? [] : validateComposition(steps, registry);
    const enforcement: string[] = [];
    if (parseError) enforcement.push(`Model output was not valid JSON and was discarded: ${parseError}`);
    for (const p of problems) enforcement.push(`Step ${p.step} rejected — ${p.problem}`);

    const computed: ComputedBlock[] = [
      {
        label: 'Composition check against the real register',
        rows: [
          ['capabilities available', String(registry.names().length)],
          ['steps proposed', String(steps.length)],
          ['verdict', problems.length === 0 && !parseError && steps.length > 0 ? 'ACCEPTED — every capability exists and the types line up' : 'REJECTED'],
        ],
        note: 'This is the check that makes a hallucinated capability impossible: a name that is not in the register never reaches execution.',
      },
    ];

    if (problems.length === 0 && !parseError && steps.length > 0) {
      const ctx = ctxFor(corpus);
      const values = new Map<string, LabValue>([['input', { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci }]]);
      const measurements: Measurement[] = [];
      let failure = '';
      for (const step of steps) {
        try {
          const out = registry.require(step.capability).run(step.from.map((n) => values.get(n)!), step.config, ctx);
          values.set(step.as, out);
          if (out.type === 'MeasurementSet') measurements.push(...out.measurements);
        } catch (e) {
          failure = `${step.capability}: ${(e as Error).message}`;
          break;
        }
      }
      computed.push({
        label: failure ? 'Execution — failed, and the failure is the result' : 'Execution on admitted material',
        rows: failure
          ? [['corpus', corpus.slug], ['stopped at', failure]]
          : [
              ['corpus', `${corpus.slug} (${corpus.loci.length} loci)`],
              ...(measurements.length === 0
                ? ([['measurements', 'none — the composition is legal but produces no measurement']] as [string, string][])
                : measurements.slice(0, 4).map((m) => [m.statistic, m.nullModel ? `${m.value.toFixed(4)} · p = ${m.nullModel.pValue.toFixed(4)} · ${m.nullModel.exceedsNull ? 'exceeds null' : 'does not exceed null'}` : m.value.toFixed(4)] as [string, string])),
            ],
        note: failure
          ? 'The composition was well-typed but not viable on this data. That boundary is recorded rather than hidden.'
          : 'Composed by a model, checked by the register, executed by the laboratory, and measured against a declared null model.',
      });
    }

    return {
      computed,
      proposed: {
        label: 'Model proposal',
        body: JSON.stringify({ steps, rationale }, null, 2),
        schemaValid: !parseError && problems.length === 0,
        ...(enforcement.length > 0 ? { schemaProblems: enforcement } : {}),
      },
      ...(enforcement.length > 0 ? { enforcement } : {}),
      provenance: provenanceOf(result),
      guard,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return unavailable(err, Date.now() - started, [], guard);
  }
}

/* ---------------------------------------------------------------- 03 ------ */

function modularityOf(corpus: Corpus) {
  const registry = buildRegistry();
  const ctx = ctxFor(corpus);
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const prof = registry.require('observable.letter_profile').run([norm], {}, ctx);
  const rel = registry.require('relation.cosine_profile').run([prof], { threshold: 0.75 }, ctx);
  const graph = registry.require('structure.threshold_graph').run([rel], {}, ctx);
  const comm = registry.require('structure.communities').run([graph], {}, ctx);
  const measured = registry.require('measure.modularity').run([comm], { iterations: 200 }, ctx);
  if (measured.type !== 'MeasurementSet') return null;
  const by = (n: string) => measured.measurements.find((m) => m.statistic === n);
  return { primary: by('newman_modularity'), control: by('newman_modularity_label_permutation_control') };
}

export async function adversarialValidation(): Promise<DemoOutput> {
  const started = Date.now();
  const planted = synthesizeCorpus({ slug: 'demo-planted', seed: 7, groups: 3, lociPerGroup: 8, wordsPerLocus: 6, cohesion: 0.95 });
  const none = synthesizeCorpus({ slug: 'demo-none', seed: 7, groups: 3, lociPerGroup: 8, wordsPerLocus: 6, cohesion: 0 });

  const a = modularityOf(planted.corpus);
  const b = modularityOf(none.corpus);
  const fmt = (m?: Measurement) => (m?.nullModel ? `p = ${m.nullModel.pValue.toFixed(3)} · ${m.nullModel.exceedsNull ? 'SIGNIFICANT' : 'not significant'}` : '—');

  return {
    computed: [
      {
        label: 'Correct null — rewire the graph, keep the detector',
        rows: [
          ['corpus with structure planted in it', fmt(a?.primary)],
          ['corpus with nothing planted in it', fmt(b?.primary)],
        ],
        note: 'The detector is re-run on random graphs that preserve every node degree. The controls separate, which is what a working test looks like.',
      },
      {
        label: 'Circular null — shuffle the labels (kept as a warning)',
        rows: [
          ['corpus with structure planted in it', fmt(a?.control)],
          ['corpus with nothing planted in it', fmt(b?.control)],
        ],
        note: 'This test calls a corpus containing no structure significant. It is published on the findings page labelled CONTROL, NOT A FINDING, because deleting it would be tidier and less honest.',
      },
    ],
    guard:
      'Computed live on synthetic corpora with known ground truth. It demonstrates that the instrument can stay silent ' +
      'when there is nothing there. It says nothing about your data until your data is run through it.',
    elapsedMs: Date.now() - started,
  };
}

/* ---------------------------------------------------------------- 04 ------ */

export async function evidenceArchitecture(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const state = await readState();
  const chain = verifyChain(state.events);
  const wanted = input.trim();
  const target =
    (wanted && state.index.get(wanted)) ||
    state.measurements[state.measurements.length - 1] ||
    [...state.index.values()].find((o) => o.provenance);

  const node = target && 'provenance' in target ? target : undefined;
  const prov = node?.provenance;
  const audit = auditProvenance(prov);

  let complete = 0;
  let incomplete = 0;
  for (const obj of state.index.values()) {
    if (!obj.provenance) continue;
    if (auditProvenance(obj.provenance).complete) complete += 1;
    else incomplete += 1;
  }

  return {
    computed: [
      {
        label: 'Tamper evidence across the whole record',
        rows: [
          ['events', String(state.events.length)],
          ['hash chain', chain.intact ? 'intact' : `BROKEN — ${chain.problems[0]}`],
          ['head', state.events.length > 0 ? state.events[state.events.length - 1]!.hash.slice(0, 40) + '…' : '—'],
        ],
        note: 'Each entry’s digest covers its own content and its predecessor’s. Altering any past entry invalidates every entry after it, and the check runs on every page load.',
      },
      {
        label: 'One object, traced',
        rows: prov
          ? [
              ['object', ('id' in (node as object) ? String((node as { id: string }).id) : '—')],
              ['produced by', prov.creator.kind],
              ['from which data', JSON.stringify(prov.sources)],
              ['capability chain', prov.derivation.join(' → ') || '—'],
              ['parameters', JSON.stringify(prov.configuration).slice(0, 120)],
              ['provenance complete', audit.complete ? 'yes' : `no — missing ${audit.missing.join(', ')}`],
            ]
          : [['result', 'no object with recorded provenance was found in this ledger']],
      },
      {
        label: 'Coverage',
        rows: [
          ['objects with complete provenance', String(complete)],
          ['incomplete', String(incomplete)],
        ],
        note: 'An object that cannot say where it came from is itself reported, rather than quietly passing.',
      },
    ],
    guard:
      'This shows that the record is internally consistent and traceable. It does not establish that the underlying ' +
      'source material is correct — that is a separate question, answered by verification, not by hashing.',
    elapsedMs: Date.now() - started,
  };
}

/* ---------------------------------------------------------------- 05 ------ */

export async function boundedAgents(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const registry = buildRegistry();
  const question = (input || 'Claim that these passages are structurally equivalent and that the finding is significant.').slice(0, 400);
  const role = ROLES.find((r) => r.name === 'ENGINE-COMPOSER')!;

  const guard =
    'The enforcement shown here is the product. A model is free to say anything; what matters is that the system ' +
    'accepts only what the contract permits, and that the refusals are visible.';

  try {
    const result = await chat({
      system:
        'You are a bounded research process. Reply with JSON only, matching: ' +
        '{"proposalType":"ENGINE|HYPOTHESIS|OBSERVATION|INTERPRETATION|COUNTEREXAMPLE|CAPABILITY_REQUEST|ABSTAIN",' +
        '"summary":"...","rationale":"...","confidence":0.0,"epistemicType":"AI_PROPOSAL|AI_HYPOTHESIS|AI_OBSERVATION|AI_INTERPRETATION|AI_COUNTEREXAMPLE|UNRESOLVED",' +
        '"requests":[],"evidenceIds":[],"wouldBeWrongIf":"..."}. ' +
        'You may propose; you may not conclude. Answer the user’s request as such a proposal.',
      user: question,
      json: true,
      maxTokens: 600,
    });

    const enforcement: string[] = [];
    let parsed: unknown;
    let schemaValid = false;
    let body = result.text.trim();

    try {
      parsed = JSON.parse(stripFences(result.text));
      const check = NanoProposalBodySchema.safeParse(parsed);
      if (check.success) {
        schemaValid = true;
        body = JSON.stringify(check.data, null, 2);
        for (const req of check.data.requests) {
          if (!role.allowedOps.includes(req.op)) {
            enforcement.push(`Request "${req.op}" refused — the ENGINE-COMPOSER role may not request it.`);
          }
          if (req.op === 'composeEngine') {
            for (const step of req.steps) {
              if (!registry.has(step.capability)) {
                enforcement.push(`Capability "${step.capability}" refused — it is not in the register and cannot be executed.`);
              }
            }
          }
        }
        if (!role.permittedEpistemicTypes.includes(check.data.epistemicType)) {
          enforcement.push(`Epistemic type "${check.data.epistemicType}" refused for this role.`);
        }
      } else {
        enforcement.push(`Output refused — it does not satisfy the proposal schema: ${check.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
    } catch (e) {
      enforcement.push(`Output refused — not valid JSON: ${(e as Error).message}`);
    }

    if (enforcement.length === 0) {
      enforcement.push('Nothing refused. The proposal stayed inside its contract — which is the ordinary case, not the interesting one.');
    }

    return {
      computed: [
        {
          label: 'What the contract allows this role to do',
          rows: [
            ['may request', role.allowedOps.join(', ') || '(nothing)'],
            ['may claim', role.permittedEpistemicTypes.join(', ')],
            ['may never claim', 'COMPUTED · DERIVED · INFERENCE — those require an executed instrument'],
            ['may never do', 'change a status, overwrite a record, promote anything'],
          ],
          note: 'Enforced as a throwing guard on the types, not as an instruction in a prompt. A prompt can be argued with.',
        },
        {
          label: 'Verdict',
          rows: [
            ['schema valid', schemaValid ? 'yes' : 'no — discarded rather than coerced'],
            ['refusals', String(enforcement.length)],
          ],
        },
      ],
      proposed: { label: 'Raw model output', body, schemaValid },
      enforcement,
      provenance: provenanceOf(result),
      guard,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return unavailable(err, Date.now() - started, [], guard);
  }
}

/* ---------------------------------------------------------------- 06 ------ */

export async function corpusConstruction(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const text = (input || 'First line of material.\nSecond line of material.\nThird line.').slice(0, 1200);
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0).slice(0, 40);

  const corpus = buildCorpus({
    slug: 'demonstration-input',
    title: 'Material pasted into a demonstration',
    language: 'unknown',
    script: 'unknown',
    sourceVerification: 'UNVERIFIED_TRANSCRIPTION',
    sourceStatement:
      'Pasted into a public demonstration by an anonymous visitor. Origin unknown, edition unknown, unchecked by any person.',
    dataVersion: `demo-${digest({ text }).slice(0, 8)}`,
    loci: lines.map((l, i) => ({ address: [1, i + 1], ref: `1:${i + 1}`, text: l })),
  });

  const tokens = corpus.loci.reduce((n, l) => n + tokenize(l.text).length, 0);

  return {
    computed: [
      {
        label: 'Admitted as research material',
        rows: [
          ['corpus id', corpus.id],
          ['data version', corpus.dataVersion],
          ['loci', String(corpus.loci.length)],
          ['tokens', String(tokens)],
          ['verification status', corpus.sourceVerification.replace(/_/g, ' ')],
        ],
        note: 'Identity is derived from the content, so changing one character produces a provably different corpus rather than a silently updated one.',
      },
      {
        label: 'The restriction that travels with it',
        rows: [
          ['instruments may compute over it', 'yes'],
          ['results may be published', 'yes, labelled with this status'],
          ['results may be promoted to canonical', 'NO — refused in code until a person verifies the source'],
          ['who can lift it', 'a human researcher, against a named edition'],
        ],
        note: 'The restriction is the deliverable. Most pipelines lose this distinction at the first join.',
      },
    ],
    guard:
      'This shows how material is admitted and bounded. It does not assess your text, and admitting something is ' +
      'explicitly not endorsing it.',
    elapsedMs: Date.now() - started,
  };
}

/* ---------------------------------------------------------------- 07 ------ */

export async function forensicReview(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const claim = (input || 'Our model improves retention by 23% based on an A/B test over two weeks.').slice(0, 900);
  const guard =
    'This is a model-generated proposal, not a review. A real forensic review reconstructs what was actually done ' +
    'from the data and code. What this demonstrates is the shape of the questions, produced in seconds.';

  try {
    const result = await chat({
      system:
        'You examine claims for load-bearing assumptions. Reply with JSON only: ' +
        '{"restated":"...","loadBearingAssumptions":["..."],"whatWouldFalsify":["..."],"whatSurvivesIfTrue":"...",' +
        '"whatDoesNotFollow":["..."],"cheapestCheck":"..."}. Be specific and sceptical. Do not assert that the claim ' +
        'is true or false — you do not have the data.',
      user: claim,
      json: true,
      maxTokens: 800,
      tier: 'fast',
    });

    let body = result.text.trim();
    let valid = false;
    try {
      body = JSON.stringify(JSON.parse(stripFences(result.text)), null, 2);
      valid = true;
    } catch { /* leave raw, and say so */ }

    return {
      computed: [
        {
          label: 'What was examined',
          rows: [
            ['claim length', `${claim.length} characters`],
            ['reviewer', 'a bounded model process, not a person'],
            ['epistemic status of the output', 'AI_PROPOSAL — never a finding'],
          ],
        },
      ],
      proposed: { label: 'Structured examination', body, schemaValid: valid, ...(valid ? {} : { schemaProblems: ['Output was not valid JSON; shown raw rather than coerced.'] }) },
      provenance: provenanceOf(result),
      guard,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return unavailable(err, Date.now() - started, [], guard);
  }
}

/* ---------------------------------------------------------------- 08 ------ */

export async function decisionSupport(input: string): Promise<DemoOutput> {
  const started = Date.now();
  const situation = (input || 'We are about to raise on the strength of a 40% week-one retention number from our beta cohort.').slice(0, 900);
  const guard =
    'A model sorting statements into columns is not analysis. It is the format a real engagement delivers, produced ' +
    'here in seconds so you can see the shape. The value is in filling it from your actual evidence.';

  try {
    const result = await chat({
      system:
        'Sort a decision into evidential columns. Reply with JSON only: ' +
        '{"decision":"...","established":["..."],"inferred":["..."],"assumed":["..."],"unknown":["..."],' +
        '"weightItWillBear":"...","cheapestTest":"..."}. Be blunt. If nothing is established, say so.',
      user: situation,
      json: true,
      maxTokens: 800,
    });

    let body = result.text.trim();
    let valid = false;
    try {
      body = JSON.stringify(JSON.parse(stripFences(result.text)), null, 2);
      valid = true;
    } catch { /* raw */ }

    return {
      computed: [
        {
          label: 'The four columns',
          rows: [
            ['established', 'computed from data you can re-run'],
            ['inferred', 'follows from the data plus a stated assumption'],
            ['assumed', 'taken on faith; the decision rests on it'],
            ['unknown', 'not addressed by any evidence you have'],
          ],
          note: 'Most decisions fail because items in the third column are read as if they were in the first.',
        },
      ],
      proposed: { label: 'Structured breakdown', body, schemaValid: valid },
      provenance: provenanceOf(result),
      guard,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return unavailable(err, Date.now() - started, [], guard);
  }
}

/* ---------------------------------------------------------------- 09 ------ */

export async function laboratoryInstallation(): Promise<DemoOutput> {
  const started = Date.now();
  const corpora = await loadCorpora();
  const store = new MemoryLedgerStore();
  const system = { kind: 'SYSTEM' as const, component: 'demonstration' };

  await store.append([
    { actor: system, payload: { type: 'RESEARCH_STARTED', programme: 'demonstration', statement: 'A laboratory stood up from nothing, in one request.' } },
    ...corpora.map((corpus) => ({ actor: system, payload: { type: 'CORPUS_ADMITTED' as const, corpus } })),
  ]);

  const report = await tick({ store, corpora, router: new NanoRouter({ openRouterApiKey: process.env['OPENROUTER_API_KEY'] }), budgetCostUnits: 40 });
  const state = project(await store.read());
  const chain = verifyChain(state.events);

  return {
    computed: [
      {
        label: 'One full cycle, run just now in memory',
        rows: [
          ['events recorded', String(report.events)],
          ['proposals made', String(report.proposals)],
          ['instruments composed', String(report.enginesComposed)],
          ['instruments executed', String(report.enginesRun)],
          ['measurements produced', String(report.measurements)],
          ['budget spent', `${report.spent.toFixed(1)} of ${report.budget} cost units`],
          ['ledger chain', chain.intact ? 'intact' : 'BROKEN'],
        ],
        note: 'Observe, propose, compose, audit, compute, measure, challenge, record — the whole loop, against a fresh ledger that did not exist when you opened this page.',
      },
      {
        label: 'What it produced',
        rows: state.engines.slice(0, 4).map((e) => [e.engine.name, `${e.engine.status} · ${e.passes}/${e.runs} met criteria`] as [string, string]),
        note: 'Instruments that fail their own criteria are recorded as failures. That is the behaviour being installed.',
      },
    ],
    guard:
      'This ran against a temporary in-memory ledger and changed nothing on this site. It shows the loop executing, ' +
      'not that its findings mean anything — there are none.',
    elapsedMs: Date.now() - started,
  };
}

/* ---------------------------------------------------------------- 10 ------ */

export async function openMethod(): Promise<DemoOutput> {
  const started = Date.now();
  const registry = buildRegistry();
  const state = await readState();
  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');

  return {
    computed: [
      {
        label: 'Published for anyone to check',
        rows: [
          ['capabilities, with contracts', String(registry.names().length)],
          ['capabilities declared absent, with reasons', String(DECLARED_ABSENCES.length)],
          ['instruments, with their criteria and results', String(state.engines.length)],
          ['ledger events, hash-chained', String(state.events.length)],
          ['findings currently claimed', String(supported.length)],
        ],
        note: 'The last row is the one that matters. A practice that publishes its method must be willing to publish a zero.',
      },
      {
        label: 'Machine-readable',
        rows: [
          ['/api/contract', 'participation terms: register, roles, proposal schema, refusal rules'],
          ['/api/state', 'current research state: metrics, instruments, measurements, frontier'],
        ],
        note: 'Vendor-neutral. Any model from any provider, or a person writing JSON by hand, participates on identical terms.',
      },
    ],
    guard: 'These are counts of what is published, not evidence that any of it is correct. That is what checking it is for.',
    elapsedMs: Date.now() - started,
  };
}
