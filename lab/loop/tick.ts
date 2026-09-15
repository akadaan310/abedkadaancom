/**
 * The continuous intelligence loop. Constitution §24 and §60.
 *
 *   RESEARCH STATE → OBSERVE → NANO-LLMs → DISCOVER → HYPOTHESIZE → COMPOSE → ENGINE
 *   → COMPUTE → MEASURE → CHALLENGE → RECORD → EXPOSE → UPDATED RESEARCH STATE ↺
 *
 * One tick is one turn of that loop. It is bounded by an explicit budget (§44, §75):
 * "continuous" means scheduled and accountable, not an uncontrolled infinite process.
 */
import { contentId } from '../ontology/canonical';
import { provenance } from '../provenance/provenance';
import { project, type LabState } from '../ledger/projection';
import type { EventDraft, LedgerStore } from '../ledger/store';
import { buildRegistry, DECLARED_ABSENCES, type CapabilityRegistry } from '../capabilities/registry';
import { composeEngine, type EngineSpec } from '../engine/contract';
import { executeEngine } from '../engine/execute';
import { auditEngine } from '../engine/audit';
import { frontierItem, rankFrontier, type FrontierItem } from '../frontier/frontier';
import { NanoRouter } from '../nano/router';
import { ENGINE_CHALLENGER, ENGINE_COMPOSER, ENGINE_DISCOVERER, PROVENANCE_AUDITOR } from '../nano/roles';
import type { NanoContext, NanoProposal } from '../nano/contract';
import type { Corpus, Engine, EvaluationCriterion } from '../ontology/types';

export interface TickOptions {
  readonly store: LedgerStore;
  readonly corpora: readonly Corpus[];
  readonly router: NanoRouter;
  readonly registry?: CapabilityRegistry;
  readonly now?: () => string;
  /** Cost units this tick may spend. Work that would exceed it is deferred, not skipped silently. §75 */
  readonly budgetCostUnits?: number;
}

export interface TickReport {
  readonly events: number;
  readonly proposals: number;
  readonly enginesComposed: number;
  readonly enginesRun: number;
  readonly measurements: number;
  readonly spent: number;
  readonly budget: number;
  readonly notes: readonly string[];
}

function contextFor(state: LabState, registry: CapabilityRegistry, question: string, budget: number): NanoContext {
  const used = new Set(Object.keys(state.metrics.capabilityUsage));
  return {
    programme: state.programme?.name ?? 'abedkadaan.com research laboratory',
    question,
    availableCapabilities: registry.all().map((c) => ({
      name: c.name,
      purpose: c.purpose,
      inputs: c.inputs.join(','),
      outputs: c.output,
      costUnits: c.costUnits,
    })),
    corpora: state.corpora.map((c) => ({ slug: c.slug, loci: c.loci.length, verification: c.sourceVerification })),
    frontier: state.frontier.map((f) => ({ id: f.id, subject: f.subject, state: f.state, reason: f.reason })),
    recentFindings: state.results
      .slice(-5)
      .flatMap((r) => r.measurements.map((m) => `${m.statistic}=${m.value.toFixed(3)}${m.nullModel ? ` (p=${m.nullModel.pValue.toFixed(3)})` : ''}`)),
    openDisagreements: state.disagreements.filter((d) => !d.resolvedByEngineId).map((d) => d.subject),
    unusedCapabilities: registry.names().filter((n) => !used.has(n)),
    existingEngines: state.engines.map((e) => ({
      id: e.engine.id,
      name: e.engine.name,
      status: e.engine.status,
      steps: e.engine.steps.map((s) => s.capability),
    })),
    budgetRemaining: budget,
  };
}

const DEFAULT_CRITERIA: readonly EvaluationCriterion[] = [
  { id: 'nondegenerate', description: 'The partition is not essentially all singletons.', statistic: 'partition_nondegeneracy', comparator: 'gte', threshold: 0.3 },
  { id: 'exceeds-null', description: 'The headline statistic exceeds its null model.', statistic: 'newman_modularity.exceedsNull', comparator: 'gte', threshold: 1 },
];

/** Turn a validated composeEngine request into an EngineSpec. Criteria are attached here,
 *  before execution, so an engine can never be evaluated against a bar chosen afterwards. §7 */
function specFrom(proposal: NanoProposal, corpusSlug: string): EngineSpec | null {
  const req = proposal.requests.find((r) => r.op === 'composeEngine');
  if (!req || req.op !== 'composeEngine') return null;
  const steps = req.steps.map((s) => ({
    capability: s.capability,
    from: s.from,
    as: s.as,
    config: (s.config ?? {}) as Record<string, never>,
  }));
  const isChallenge = steps.some((s) => s.capability.startsWith('challenge.'));
  const usesLocality = steps.some((s) => s.capability === 'measure.spatial_locality');
  const criteria: readonly EvaluationCriterion[] = isChallenge
    ? [
        { id: 'threshold-stable', description: 'The grouping survives moving the threshold.', statistic: 'threshold_stability_min_ari', comparator: 'gte', threshold: 0.5 },
      ]
    : usesLocality
      ? [
          { id: 'locality-exceeds-null', description: 'Weight–distance locality exceeds the permutation null.', statistic: 'spatial_locality_correlation.exceedsNull', comparator: 'gte', threshold: 1 },
        ]
      : DEFAULT_CRITERIA;

  return {
    name: req.name,
    purpose: req.purpose,
    question: req.question,
    steps,
    inputs: { corpus: corpusSlug },
    evaluationProtocol: { kind: 'EvaluationProtocol', criteria, alpha: 0.05 },
    nullModel: req.nullModel,
    ...(req.challenges ? { challenges: req.challenges } : {}),
  };
}

export async function tick(opts: TickOptions): Promise<TickReport> {
  const registry = opts.registry ?? buildRegistry();
  const now = opts.now ?? (() => new Date().toISOString());
  const budget = opts.budgetCostUnits ?? 60;
  const corpora = new Map(opts.corpora.map((c) => [c.slug, c]));
  const drafts: EventDraft[] = [];
  const notes: string[] = [];
  let spent = 0;
  let composed = 0;
  let ran = 0;
  let measurements = 0;
  let proposals = 0;

  const state = project(await opts.store.read());
  const dataVersions = Object.fromEntries(opts.corpora.map((c) => [c.slug, c.dataVersion]));
  const corpusSlug = opts.corpora[0]?.slug ?? '';

  // ---- OBSERVE: pick the most valuable frontier item the laboratory can act on. §46, §99
  const ranked = rankFrontier(state.frontier as FrontierItem[]);
  const target = ranked[0];
  const question = target?.subject ?? 'Does any computed relation in this corpus yield structure beyond its null model?';
  if (target) {
    drafts.push({
      actor: { kind: 'SYSTEM', component: 'scheduler' },
      payload: { type: 'FRONTIER_ITEM_CLAIMED', itemId: target.id, leaseUntil: now() },
    });
  }

  const ctx = () => contextFor(state, registry, question, budget - spent);

  // ---- DISCOVER / HYPOTHESIZE
  const discovery = await opts.router.propose(ENGINE_DISCOVERER, ctx(), now());
  proposals += 1;
  spent += discovery.proposal.modelUse.costUnits;
  drafts.push({
    actor: discovery.proposal.author,
    payload: {
      type: 'AI_OBSERVATION',
      observationId: discovery.proposal.id,
      text: discovery.proposal.summary,
      aboutIds: discovery.proposal.evidenceIds,
      proposal: discovery.proposal,
    },
  });
  if (discovery.providerError) notes.push(`provider fallback: ${discovery.providerError}`);
  for (const p of discovery.problems) notes.push(`role violation (discoverer): ${p}`);

  const hypothesisReq = discovery.proposal.requests.find((r) => r.op === 'recordHypothesis');
  let hypothesisId: string | null = null;
  if (hypothesisReq && hypothesisReq.op === 'recordHypothesis') {
    hypothesisId = contentId('hyp', { statement: hypothesisReq.statement, by: discovery.proposal.id });
    drafts.push({
      actor: discovery.proposal.author,
      payload: {
        type: 'HYPOTHESIS_PROPOSED',
        hypothesis: {
          kind: 'Hypothesis',
          id: hypothesisId,
          statement: hypothesisReq.statement,
          question,
          testableAs: hypothesisReq.testableAs,
          proposedBy: discovery.proposal.author,
          epistemicType: 'AI_HYPOTHESIS',
          state: 'PROPOSED',
          supportCount: 0,
          challengeCount: 0,
          provenance: discovery.proposal.provenance,
        },
      },
    });
  }

  // ---- COMPOSE → COMPUTE → MEASURE, for the composer and then the challenger. §6, §19
  const runEngineFrom = async (proposal: NanoProposal, label: string): Promise<Engine | null> => {
    const spec = specFrom(proposal, corpusSlug);
    if (!spec) {
      notes.push(`${label}: proposal carried no composeEngine request`);
      return null;
    }
    let engine: Engine;
    try {
      engine = composeEngine({
        spec,
        registry,
        actor: proposal.author,
        dataVersions,
        now: now(),
        parents: [proposal.id],
        models: [proposal.modelUse],
        rationale: proposal.rationale,
      });
    } catch (err) {
      // A composition the registry rejects is recorded, not hidden: §48, §90.
      notes.push(`${label}: composition rejected — ${(err as Error).message}`);
      drafts.push({
        actor: { kind: 'SYSTEM', component: 'engine-composer' },
        payload: {
          type: 'CAPABILITY_GAP_DECLARED',
          absence: { name: 'engine.composition', reason: 'COMPUTATION_UNSUPPORTED', detail: (err as Error).message },
          requestedBy: proposal.author,
        },
      });
      return null;
    }

    const audit = auditEngine({ engine, registry, corpora });
    drafts.push({
      actor: { kind: 'SYSTEM', component: 'engine-auditor' },
      payload: { type: 'ENGINE_AUDITED', engineId: engine.id, passed: audit.passed, findings: [...audit.findings, ...audit.warnings] },
    });
    drafts.push({
      actor: proposal.author,
      payload: {
        type: 'ENGINE_COMPOSED',
        engine,
        alternativesConsidered: [],
        rationale: proposal.rationale,
      },
    });
    composed += 1;

    const experimentId = contentId('exp', { engine: engine.id, question: spec.question, at: now() });
    drafts.push({
      actor: { kind: 'SYSTEM', component: 'scheduler' },
      payload: {
        type: 'EXPERIMENT_QUEUED',
        experiment: {
          kind: 'Experiment',
          id: experimentId,
          question: spec.question,
          hypothesisId,
          engineId: engine.id,
          engineVersion: engine.engineVersion,
          inputs: spec.inputs,
          configuration: spec.configuration ?? {},
          nullModel: spec.nullModel,
          participants: [proposal.author, { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion }],
          status: 'QUEUED',
          resultId: null,
          provenance: provenance({
            creator: { kind: 'SYSTEM', component: 'scheduler' },
            sources: dataVersions,
            parents: [engine.id, proposal.id],
            derivation: engine.capabilities,
            timestamp: now(),
          }),
        },
      },
    });

    const estimated = engine.capabilities.reduce((n, c) => n + (registry.get(c)?.costUnits ?? 1), 0);
    if (spent + estimated > budget) {
      // §75: the laboratory must be able to say "interesting but expensive" and defer.
      notes.push(`${label}: deferred, estimated ${estimated} cost units would exceed the remaining budget`);
      drafts.push({
        actor: { kind: 'SYSTEM', component: 'scheduler' },
        payload: { type: 'BUDGET_EXHAUSTED', budget: 'tick', spent, limit: budget },
      });
      return engine;
    }

    drafts.push({ actor: { kind: 'SYSTEM', component: 'scheduler' }, payload: { type: 'ENGINE_STARTED', experimentId, engineId: engine.id } });
    const result = executeEngine({ engine, experimentId, registry, corpora, now: now() });
    spent += result.costUnits;
    ran += 1;
    measurements += result.measurements.length;
    drafts.push({
      actor: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
      payload: result.ok ? { type: 'ENGINE_COMPLETED', result } : { type: 'ENGINE_FAILED', result },
    });

    // ---- RECORD: a passing engine yields a discovery; a failing one yields a recorded
    // failure. Neither is promoted further without a researcher. §10, §15, §48
    //
    // A challenger that passes is NOT a discovery: it reports that the claim it attacked
    // withstood one attack. Recording that as a finding would quietly convert "survived a
    // test" into "is true", which is exactly the collapse §15 and §19 forbid. Its outcome
    // is recorded as a challenge result against the hypothesis instead.
    if (result.ok && result.evaluation.passed && !engine.challenges) {
      const headline = result.measurements.find((m) => m.nullModel) ?? result.measurements[0];
      drafts.push({
        actor: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
        payload: {
          type: 'DISCOVERY_RECORDED',
          discovery: {
            kind: 'Discovery',
            id: contentId('dis', { engine: engine.id, result: result.id }),
            statement: headline
              ? `${engine.name}: ${headline.statistic} = ${headline.value.toFixed(4)}${headline.nullModel ? `, p = ${headline.nullModel.pValue.toFixed(4)} against ${headline.nullModel.model}` : ''}`
              : `${engine.name} met its evaluation criteria`,
            state: 'SUPPORTED',
            subjectIds: [engine.id, result.id],
            measurementIds: result.measurements.map((m) => m.id),
            survivedChallenges: 0,
            failedChallenges: 0,
            epistemicType: 'INFERENCE',
            provenance: result.provenance,
          },
        },
      });
    }
    if (hypothesisId && engine.challenges) {
      drafts.push({
        actor: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
        payload: {
          type: 'HYPOTHESIS_CHALLENGED',
          hypothesisId,
          challengerEngineId: engine.id,
          survived: result.evaluation.passed,
          detail: result.evaluation.checks.map((c) => `${c.statistic} ${c.comparator} ${c.threshold}: ${c.passed ? 'held' : 'failed'} (observed ${c.observed ?? 'not produced'})`).join('; '),
        },
      });
    }
    return engine;
  };

  const composer = await opts.router.propose(ENGINE_COMPOSER, ctx(), now());
  proposals += 1;
  spent += composer.proposal.modelUse.costUnits;
  drafts.push({ actor: composer.proposal.author, payload: { type: 'AI_PROPOSAL', proposal: composer.proposal } });
  for (const p of composer.problems) notes.push(`role violation (composer): ${p}`);
  const built = await runEngineFrom(composer.proposal, 'composer');

  // ---- CHALLENGE: a result gains strength only by surviving an attempt to break it. §19
  if (built) {
    const challengerCtx = contextFor(
      project([...(await opts.store.read()), ...[]]),
      registry,
      `Does ${built.name} survive challenge?`,
      budget - spent,
    );
    const challenger = await opts.router.propose(
      ENGINE_CHALLENGER,
      {
        ...challengerCtx,
        existingEngines: [{ id: built.id, name: built.name, status: 'PASSED', steps: built.steps.map((s) => s.capability) }],
      },
      now(),
    );
    proposals += 1;
    spent += challenger.proposal.modelUse.costUnits;
    drafts.push({ actor: challenger.proposal.author, payload: { type: 'AI_PROPOSAL', proposal: challenger.proposal } });
    await runEngineFrom(challenger.proposal, 'challenger');
  }

  // ---- AUDIT
  const auditor = await opts.router.propose(PROVENANCE_AUDITOR, ctx(), now());
  proposals += 1;
  spent += auditor.proposal.modelUse.costUnits;
  drafts.push({
    actor: auditor.proposal.author,
    payload: { type: 'AI_OBSERVATION', observationId: auditor.proposal.id, text: auditor.proposal.summary, aboutIds: [], proposal: auditor.proposal },
  });

  if (target) {
    drafts.push({
      actor: { kind: 'SYSTEM', component: 'scheduler' },
      payload: {
        type: 'FRONTIER_ITEM_CLOSED',
        itemId: target.id,
        outcome: ran > 0 ? 'investigated' : 'not investigated',
        detail: notes.join(' | ') || 'a tick of the loop completed',
      },
    });
  }

  // The frontier is refilled from what this tick could not do: unused capabilities and
  // declared absences become explicit research items rather than disappearing. §46, §90
  const used = new Set(Object.keys(project([...(await opts.store.read())]).metrics.capabilityUsage));
  for (const absence of DECLARED_ABSENCES.slice(0, 2)) {
    const item = frontierItem({
      itemKind: 'CAPABILITY_GAP',
      state: 'AWAITING_CAPABILITY',
      subject: `Capability gap: ${absence.name}`,
      reason: absence.detail,
      novelty: 0.8,
      expectedInformationGain: 0.7,
      researchPriority: 0.6,
      uncertainty: 0.9,
      costEstimate: 40,
      dependencies: [],
      proposedBy: { kind: 'SYSTEM', component: 'capability-registry' },
      provenance: provenance({
        creator: { kind: 'SYSTEM', component: 'capability-registry' },
        sources: dataVersions,
        derivation: ['registry.declared_absences'],
        timestamp: now(),
      }),
    });
    if (!state.frontier.some((f) => f.id === item.id)) {
      drafts.push({ actor: { kind: 'SYSTEM', component: 'capability-registry' }, payload: { type: 'FRONTIER_ITEM_ADDED', item } });
    }
  }
  for (const name of registry.names().filter((n) => !used.has(n)).slice(0, 2)) {
    const cap = registry.require(name);
    const item = frontierItem({
      itemKind: 'ENGINE',
      state: 'UNEXPLORED',
      subject: `No engine has yet used ${name}`,
      reason: `${cap.purpose} It is registered and available but unused, so its research value is untested.`,
      novelty: 0.9,
      expectedInformationGain: 0.5,
      researchPriority: 0.5,
      uncertainty: 0.8,
      costEstimate: cap.costUnits * 3,
      dependencies: [],
      proposedBy: { kind: 'SYSTEM', component: 'capability-registry' },
      provenance: provenance({
        creator: { kind: 'SYSTEM', component: 'capability-registry' },
        sources: dataVersions,
        derivation: ['registry.unused_capabilities'],
        timestamp: now(),
      }),
    });
    if (!state.frontier.some((f) => f.id === item.id)) {
      drafts.push({ actor: { kind: 'SYSTEM', component: 'capability-registry' }, payload: { type: 'FRONTIER_ITEM_ADDED', item } });
    }
  }

  const written = await opts.store.append(drafts);
  return {
    events: written.length,
    proposals,
    enginesComposed: composed,
    enginesRun: ran,
    measurements,
    spent,
    budget,
    notes,
  };
}
