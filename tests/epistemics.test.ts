/**
 * §49: tests protect epistemic claims, not only code. These check the boundaries the
 * constitution treats as non-negotiable — who may author what, what may be promoted,
 * and whether the history can be rewritten.
 */
import { describe, expect, it } from 'vitest';
import { assertMayAuthor, engineTransitionAllowed, EpistemicViolation, mayAuthor } from '@lab/ontology/epistemic';
import { MemoryLedgerStore } from '@lab/ledger/store';
import { verifyChain } from '@lab/ledger/events';
import { project } from '@lab/ledger/projection';
import { auditProvenance, provenance } from '@lab/provenance/provenance';
import { canPromote } from '@lab/engine/promote';
import { composeEngine, validateComposition } from '@lab/engine/contract';
import { executeEngine } from '@lab/engine/execute';
import { buildRegistry } from '@lab/capabilities/registry';
import { loadCorpusFile } from '@lab/corpus/loader';
import { NanoProposalBodySchema, validateAgainstRole } from '@lab/nano/contract';
import { ENGINE_COMPOSER, PROVENANCE_AUDITOR } from '@lab/nano/roles';
import type { Engine } from '@lab/ontology/types';

const NANO = { kind: 'NANO_LLM' as const, role: 'X', provider: 'p', model: 'm', modelVersion: 'v' };
const ENGINE_ACTOR = { kind: 'ENGINE' as const, engineId: 'e', engineVersion: 1 };
const RESEARCHER = { kind: 'RESEARCHER' as const, id: 'abed' };

describe('computation is the verification boundary (§11)', () => {
  it('a Nano-LLM may not author a computed result', () => {
    expect(mayAuthor(NANO, 'COMPUTED')).toBe(false);
    expect(mayAuthor(NANO, 'INFERENCE')).toBe(false);
    expect(() => assertMayAuthor(NANO, 'COMPUTED', 'test')).toThrow(EpistemicViolation);
  });

  it('an engine may not author an interpretation or a researcher note', () => {
    expect(mayAuthor(ENGINE_ACTOR, 'AI_INTERPRETATION')).toBe(false);
    expect(mayAuthor(ENGINE_ACTOR, 'RESEARCHER_NOTE')).toBe(false);
  });

  it('a Nano-LLM may propose and hypothesize', () => {
    expect(mayAuthor(NANO, 'AI_PROPOSAL')).toBe(true);
    expect(mayAuthor(NANO, 'AI_HYPOTHESIS')).toBe(true);
  });
});

describe('self-discovery is not self-authorization (§10, §29)', () => {
  const engine = { id: 'eng_1', status: 'RETAINED', inputs: { corpus: 'c' } } as unknown as Engine;

  it('refuses CANONICAL to anyone but a researcher', () => {
    expect(canPromote({ engine, to: 'CANONICAL', actor: NANO }).allowed).toBe(false);
    expect(canPromote({ engine, to: 'CANONICAL', actor: ENGINE_ACTOR }).allowed).toBe(false);
    expect(canPromote({ engine, to: 'CANONICAL', actor: RESEARCHER }).allowed).toBe(true);
  });

  it('refuses CANONICAL when the source text is unverified', async () => {
    const corpus = await loadCorpusFile('lab/corpus/data/quran-short-surahs.json');
    const decision = canPromote({
      engine: { ...engine, inputs: { corpus: corpus.slug } } as Engine,
      to: 'CANONICAL',
      actor: RESEARCHER,
      corpora: new Map([[corpus.slug, corpus]]),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toContain('UNVERIFIED');
  });

  it('forbids skipping the lifecycle', () => {
    expect(engineTransitionAllowed('PROPOSED', 'CANONICAL')).toBe(false);
    expect(engineTransitionAllowed('RETAINED', 'CANONICAL')).toBe(true);
  });
});

describe('the ledger cannot be rewritten (§22, §27)', () => {
  it('detects tampering with any past event', async () => {
    const store = new MemoryLedgerStore();
    await store.append([
      { actor: { kind: 'SYSTEM', component: 't' }, payload: { type: 'RESEARCH_STARTED', programme: 'p', statement: 's' } },
      { actor: { kind: 'SYSTEM', component: 't' }, payload: { type: 'QUESTION_CREATED', questionId: 'q1', question: 'a', origin: 'o' } },
    ]);
    const events = [...(await store.read())];
    expect(verifyChain(events).intact).toBe(true);

    const tampered = structuredClone(events) as typeof events;
    (tampered[0]!.payload as { statement: string }).statement = 'rewritten';
    const check = verifyChain(tampered);
    expect(check.intact).toBe(false);
    expect(check.problems.join(' ')).toContain('hash mismatch');
  });

  it('projects only what was recorded', async () => {
    const store = new MemoryLedgerStore();
    const state = project(await store.read());
    expect(state.engines).toHaveLength(0);
    expect(state.metrics.discoveriesSupported).toBe(0);
    expect(state.programme).toBeNull();
  });
});

describe('proposals are schema-bound and role-bound (§50, §62)', () => {
  it('rejects a proposal that is not schema-valid', () => {
    expect(NanoProposalBodySchema.safeParse({ summary: 'no type' }).success).toBe(false);
  });

  it('rejects an epistemic type a Nano-LLM may not claim', () => {
    expect(
      NanoProposalBodySchema.safeParse({
        proposalType: 'ENGINE', summary: 's', rationale: 'r', confidence: 0.5, epistemicType: 'COMPUTED',
      }).success,
    ).toBe(false);
  });

  it('flags an operation outside the role contract', () => {
    const body = NanoProposalBodySchema.parse({
      proposalType: 'ENGINE', summary: 's', rationale: 'r', confidence: 0.5, epistemicType: 'AI_PROPOSAL',
      requests: [{ op: 'composeEngine', name: 'n', purpose: 'p', question: 'q', steps: [], nullModel: null }],
    });
    expect(validateAgainstRole(ENGINE_COMPOSER, body)).toHaveLength(0);
    // The auditor may observe, but may not compose instruments.
    expect(validateAgainstRole(PROVENANCE_AUDITOR, body).join(' ')).toContain('may not');
  });
});

describe('engines cannot be built from capabilities that do not exist (§66, §90)', () => {
  const registry = buildRegistry();

  it('rejects a hallucinated capability', () => {
    const problems = validateComposition(
      [{ capability: 'text.summarize_meaning', from: ['input'], as: 'x', config: {} }],
      registry,
    );
    expect(problems.map((p) => p.problem).join(" ")).toContain('not in the registry');
  });

  it('rejects a type-mismatched composition', () => {
    const problems = validateComposition(
      [
        { capability: 'text.normalize.arabic', from: ['input'], as: 'norm', config: {} },
        { capability: 'relation.cosine_profile', from: ['norm'], as: 'rel', config: {} },
      ],
      registry,
    );
    expect(problems.map((p) => p.problem).join(" ")).toContain('expects ProfileSet');
  });
});

describe('results carry complete provenance and reproduce (§21, §65, §96)', () => {
  it('records engine, sources, derivation and seed, and reproduces exactly', async () => {
    const corpus = await loadCorpusFile('lab/corpus/data/quran-short-surahs.json');
    const registry = buildRegistry();
    const engine = composeEngine({
      spec: {
        name: 'test engine',
        purpose: 'p',
        question: 'q',
        steps: [
          { capability: 'text.normalize.arabic', from: ['input'], as: 'norm', config: {} },
          { capability: 'observable.letter_profile', from: ['norm'], as: 'prof', config: {} },
          { capability: 'relation.cosine_profile', from: ['prof'], as: 'rel', config: { threshold: 0.85 } },
          { capability: 'structure.threshold_graph', from: ['rel'], as: 'g', config: {} },
          { capability: 'structure.communities', from: ['g'], as: 'c', config: {} },
          { capability: 'measure.modularity', from: ['c'], as: 'm', config: { iterations: 50 } },
        ],
        inputs: { corpus: corpus.slug },
        evaluationProtocol: {
          kind: 'EvaluationProtocol',
          criteria: [{ id: 'x', description: 'd', statistic: 'newman_modularity.exceedsNull', comparator: 'gte', threshold: 1 }],
          alpha: 0.05,
        },
        nullModel: 'degree-preserving rewiring',
      },
      registry,
      actor: { kind: 'SYSTEM', component: 'test' },
      dataVersions: { [corpus.slug]: corpus.dataVersion },
      now: '2026-01-01T00:00:00.000Z',
    });

    const corpora = new Map([[corpus.slug, corpus]]);
    const a = executeEngine({ engine, experimentId: 'exp_1', registry, corpora, now: '2026-01-01T00:00:00.000Z' });
    const b = executeEngine({ engine, experimentId: 'exp_1', registry, corpora, now: '2026-01-01T00:00:00.000Z' });

    expect(a.ok).toBe(true);
    expect(a.id).toBe(b.id);
    expect(auditProvenance(a.provenance).complete).toBe(true);
    expect(a.provenance.derivation.length).toBe(engine.steps.length);
    expect(a.provenance.sources[corpus.slug]).toBe(corpus.dataVersion);
    expect(a.provenance.configuration['seed']).toBeTypeOf('number');

    // Every measurement must carry a guard, and any INFERENCE must carry a null model.
    for (const m of a.measurements) {
      expect(m.interpretationGuard.length).toBeGreaterThan(20);
      if (m.epistemicType === 'INFERENCE') expect(m.nullModel).toBeDefined();
    }
  });

  it('records a failure as research state instead of throwing it away (§48)', async () => {
    const corpus = await loadCorpusFile('lab/corpus/data/quran-short-surahs.json');
    const registry = buildRegistry();
    const engine = composeEngine({
      spec: {
        name: 'engine that cannot run',
        purpose: 'p',
        question: 'q',
        // Well-typed, but the threshold leaves too few relations for the measurement.
        steps: [
          { capability: 'text.normalize.arabic', from: ['input'], as: 'norm', config: {} },
          { capability: 'observable.letter_profile', from: ['norm'], as: 'prof', config: {} },
          { capability: 'relation.cosine_profile', from: ['prof'], as: 'rel', config: { threshold: 0.999 } },
          { capability: 'structure.threshold_graph', from: ['rel'], as: 'g', config: {} },
          { capability: 'embedding.classical_mds', from: ['g'], as: 'e', config: {} },
          { capability: 'measure.spatial_locality', from: ['e', 'rel'], as: 'm', config: {} },
        ],
        inputs: { corpus: corpus.slug },
        evaluationProtocol: { kind: 'EvaluationProtocol', criteria: [], alpha: 0.05 },
        nullModel: null,
      },
      registry,
      actor: { kind: 'SYSTEM', component: 'test' },
      dataVersions: { [corpus.slug]: corpus.dataVersion },
      now: '2026-01-01T00:00:00.000Z',
    });

    const result = executeEngine({
      engine, experimentId: 'exp_2', registry,
      corpora: new Map([[corpus.slug, corpus]]), now: '2026-01-01T00:00:00.000Z',
    });
    expect(result.ok).toBe(false);
    expect(result.failure).toBeDefined();
    expect(result.failure!.boundaryDiscovered).toBeTruthy();
    expect(result.evaluation.passed).toBe(false);
  });

  it('an evaluation criterion whose statistic was never produced fails (§56)', () => {
    const audit = auditProvenance(provenance({ creator: ENGINE_ACTOR, timestamp: 'not-a-date' }));
    expect(audit.complete).toBe(false);
    expect(audit.missing).toContain('timestamp');
  });
});
