/**
 * Projection. Constitution §22:
 *
 *     EVENT → DERIVATION → COMPUTED STATE → MATERIALIZED INDEX → CLIENT VIEW
 *
 * The ledger is the history; this is the only sanctioned way to read it. Nothing here
 * invents state: every field is derived from events that were actually recorded, which
 * is what makes §57 (no simulated activity) enforceable rather than aspirational.
 */
import type { ResearchEvent } from './events';
import type { FrontierItem, FrontierState } from '../frontier/frontier';
import type { Provenance } from '../provenance/provenance';
import type { Actor, EngineStatus } from '../ontology/epistemic';
import type {
  AiInterpretation,
  Corpus,
  DeclaredAbsence,
  Disagreement,
  Discovery,
  Engine,
  EngineResult,
  Experiment,
  Hypothesis,
  Measurement,
  Relation,
  ResearcherNote,
} from '../ontology/types';
import type { NanoProposal } from '../nano/contract';

/** An entry in the materialized index: enough to resolve provenance and lineage. §21, §55 */
export interface IndexedObject {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly epistemicType?: string;
  readonly provenance?: Provenance;
}

export interface QuestionRecord {
  readonly id: string;
  readonly question: string;
  readonly origin: string;
  readonly timestamp: string;
}

export interface EngineRecord {
  readonly engine: Engine;
  readonly rationale: string;
  readonly alternativesConsidered: readonly string[];
  readonly audit: { readonly passed: boolean; readonly findings: readonly string[] } | null;
  readonly runs: number;
  readonly passes: number;
  readonly failures: number;
  readonly lastResultId: string | null;
  /** Every status this engine has held, in order. §71: never erase earlier versions. */
  readonly history: readonly { readonly status: EngineStatus; readonly at: string; readonly reason: string }[];
}

/** §47: self-discovery must be measured, or "more generation" gets mistaken for intelligence. */
export interface LabMetrics {
  readonly events: number;
  readonly proposals: number;
  readonly proposalsExecuted: number;
  readonly enginesComposed: number;
  readonly enginesRun: number;
  readonly enginesPassed: number;
  readonly enginesFailed: number;
  readonly enginesRetained: number;
  readonly enginesCanonical: number;
  readonly discoveriesSupported: number;
  readonly discoveriesRejected: number;
  readonly challengesRun: number;
  readonly challengesSurvived: number;
  readonly measurementsWithNullModel: number;
  readonly measurementsExceedingNull: number;
  readonly capabilityUsage: Readonly<Record<string, number>>;
  readonly capabilityReuse: number;
  readonly costUnitsSpent: number;
  /** Proposals that produced an executed engine, over proposals made. §47 */
  readonly proposalYield: number;
  /** Supported discoveries over engines run. §47 */
  readonly discoveryYield: number;
  readonly researcherAcceptances: number;
  readonly researcherRejections: number;
}

export interface LabState {
  readonly programme: { readonly name: string; readonly statement: string } | null;
  readonly events: readonly ResearchEvent[];
  readonly corpora: readonly Corpus[];
  readonly questions: readonly QuestionRecord[];
  readonly proposals: readonly NanoProposal[];
  readonly engines: readonly EngineRecord[];
  readonly experiments: readonly Experiment[];
  readonly results: readonly EngineResult[];
  readonly relations: readonly Relation[];
  readonly measurements: readonly Measurement[];
  readonly hypotheses: readonly Hypothesis[];
  readonly discoveries: readonly Discovery[];
  readonly disagreements: readonly Disagreement[];
  readonly interpretations: readonly AiInterpretation[];
  readonly notes: readonly ResearcherNote[];
  readonly frontier: readonly FrontierItem[];
  readonly capabilityGaps: readonly { readonly absence: DeclaredAbsence; readonly requestedBy: Actor }[];
  readonly challenges: readonly {
    readonly hypothesisId: string;
    readonly challengerEngineId: string;
    readonly survived: boolean;
    readonly detail: string;
    readonly at: string;
  }[];
  readonly index: ReadonlyMap<string, IndexedObject>;
  readonly metrics: LabMetrics;
  readonly lastEventAt: string | null;
}

function push<T>(map: Map<string, T>, key: string, value: T) {
  map.set(key, value);
}

export function project(events: readonly ResearchEvent[]): LabState {
  let programme: LabState['programme'] = null;
  const corpora: Corpus[] = [];
  const questions: QuestionRecord[] = [];
  const proposals: NanoProposal[] = [];
  const engines = new Map<string, EngineRecord>();
  const experiments = new Map<string, Experiment>();
  const results: EngineResult[] = [];
  const relations: Relation[] = [];
  const measurements: Measurement[] = [];
  const hypotheses = new Map<string, Hypothesis>();
  const discoveries = new Map<string, Discovery>();
  const disagreements = new Map<string, Disagreement>();
  const interpretations: AiInterpretation[] = [];
  const notes: ResearcherNote[] = [];
  const frontier = new Map<string, FrontierItem>();
  const capabilityGaps: LabState['capabilityGaps'][number][] = [];
  const challenges: LabState['challenges'][number][] = [];
  const index = new Map<string, IndexedObject>();
  const capabilityUsage: Record<string, number> = {};

  let costUnitsSpent = 0;
  let researcherAcceptances = 0;
  let researcherRejections = 0;
  const executedProposalIds = new Set<string>();

  const remember = (obj: IndexedObject) => index.set(obj.id, obj);

  const updateEngineStatus = (engineId: string, status: EngineStatus, at: string, reason: string) => {
    const rec = engines.get(engineId);
    if (!rec) return;
    engines.set(engineId, {
      ...rec,
      engine: { ...rec.engine, status },
      history: [...rec.history, { status, at, reason }],
    });
  };

  for (const event of events) {
    const at = event.timestamp;
    const p = event.payload;
    switch (p.type) {
      case 'RESEARCH_STARTED':
        programme = { name: p.programme, statement: p.statement };
        break;

      case 'CORPUS_ADMITTED':
        corpora.push(p.corpus);
        remember({
          id: p.corpus.id,
          kind: 'Corpus',
          label: p.corpus.title,
          epistemicType: p.corpus.epistemicType,
        });
        for (const locus of p.corpus.loci) {
          remember({ id: locus.id, kind: 'Locus', label: locus.ref, epistemicType: 'EXISTING' });
        }
        break;

      case 'QUESTION_CREATED':
        questions.push({ id: p.questionId, question: p.question, origin: p.origin, timestamp: at });
        remember({ id: p.questionId, kind: 'Question', label: p.question });
        break;

      case 'AI_OBSERVATION':
      case 'AI_PROPOSAL': {
        const proposal = p.type === 'AI_OBSERVATION' ? p.proposal : p.proposal;
        proposals.push(proposal);
        costUnitsSpent += proposal.modelUse.costUnits;
        remember({
          id: proposal.id,
          kind: 'NanoProposal',
          label: proposal.summary,
          epistemicType: proposal.epistemicType,
          provenance: proposal.provenance,
        });
        break;
      }

      case 'HYPOTHESIS_PROPOSED':
        hypotheses.set(p.hypothesis.id, p.hypothesis);
        remember({
          id: p.hypothesis.id,
          kind: 'Hypothesis',
          label: p.hypothesis.statement,
          epistemicType: p.hypothesis.epistemicType,
          provenance: p.hypothesis.provenance,
        });
        break;

      case 'RELATION_PROPOSED':
        relations.push(p.relation);
        remember({
          id: p.relation.id,
          kind: 'Relation',
          label: `${p.relation.relationKind} ${p.relation.endpoints.join(' ~ ')}`,
          epistemicType: p.relation.epistemicType,
          provenance: p.relation.provenance,
        });
        break;

      case 'ENGINE_COMPOSED': {
        push(engines, p.engine.id, {
          engine: p.engine,
          rationale: p.rationale,
          alternativesConsidered: p.alternativesConsidered,
          audit: null,
          runs: 0,
          passes: 0,
          failures: 0,
          lastResultId: null,
          history: [{ status: p.engine.status, at, reason: 'composed' }],
        });
        remember({
          id: p.engine.id,
          kind: 'Engine',
          label: p.engine.name,
          epistemicType: 'COMPUTED',
          provenance: p.engine.provenance,
        });
        for (const parent of p.engine.provenance.parents) {
          if (parent.startsWith('prop_')) executedProposalIds.add(parent);
        }
        break;
      }

      case 'ENGINE_AUDITED': {
        const rec = engines.get(p.engineId);
        if (rec) engines.set(p.engineId, { ...rec, audit: { passed: p.passed, findings: p.findings } });
        break;
      }

      case 'EXPERIMENT_QUEUED':
        experiments.set(p.experiment.id, p.experiment);
        remember({
          id: p.experiment.id,
          kind: 'Experiment',
          label: p.experiment.question,
          provenance: p.experiment.provenance,
        });
        break;

      case 'ENGINE_STARTED': {
        const exp = experiments.get(p.experimentId);
        if (exp) experiments.set(exp.id, { ...exp, status: 'RUNNING' });
        updateEngineStatus(p.engineId, 'RUNNING', at, `experiment ${p.experimentId} started`);
        break;
      }

      case 'ENGINE_COMPLETED':
      case 'ENGINE_FAILED': {
        const r = p.result;
        results.push(r);
        costUnitsSpent += r.costUnits;
        for (const step of r.provenance.derivation) {
          capabilityUsage[step] = (capabilityUsage[step] ?? 0) + 1;
        }
        relations.push(...r.relations);
        measurements.push(...r.measurements);
        for (const rel of r.relations) {
          remember({
            id: rel.id,
            kind: 'Relation',
            label: `${rel.relationKind} ${rel.endpoints.join(' ~ ')}`,
            epistemicType: rel.epistemicType,
            provenance: rel.provenance,
          });
        }
        for (const m of r.measurements) {
          remember({
            id: m.id,
            kind: 'Measurement',
            label: `${m.statistic} = ${m.value}`,
            epistemicType: m.epistemicType,
            provenance: m.provenance,
          });
        }
        for (const s of r.structures) {
          remember({ id: s.id, kind: 'Structure', label: s.structureKind, epistemicType: s.epistemicType, provenance: s.provenance });
        }
        for (const e of r.embeddings) {
          remember({ id: e.id, kind: 'Embedding', label: `${e.method} (${e.dimensions}d)`, epistemicType: e.epistemicType, provenance: e.provenance });
        }
        for (const o of r.observables) {
          remember({ id: o.id, kind: 'Observable', label: o.observes, epistemicType: o.epistemicType, provenance: o.provenance });
        }
        remember({ id: r.id, kind: 'EngineResult', label: r.ok ? 'engine result' : 'engine failure', provenance: r.provenance });

        const rec = engines.get(r.engineId);
        if (rec) {
          engines.set(r.engineId, {
            ...rec,
            engine: { ...rec.engine, status: r.evaluation.passed ? 'PASSED' : 'FAILED' },
            runs: rec.runs + 1,
            passes: rec.passes + (r.evaluation.passed ? 1 : 0),
            failures: rec.failures + (r.evaluation.passed ? 0 : 1),
            lastResultId: r.id,
            history: [
              ...rec.history,
              {
                status: r.evaluation.passed ? 'PASSED' : 'FAILED',
                at,
                reason: r.ok ? 'evaluation protocol applied' : (r.failure?.reason ?? 'execution failed'),
              },
            ],
          });
        }
        const exp = experiments.get(r.experimentId);
        if (exp) {
          experiments.set(exp.id, {
            ...exp,
            status: r.ok ? 'COMPLETED' : 'FAILED',
            resultId: r.id,
          });
        }
        break;
      }

      case 'MEASUREMENT_RECORDED':
        measurements.push(p.measurement);
        remember({
          id: p.measurement.id,
          kind: 'Measurement',
          label: `${p.measurement.statistic} = ${p.measurement.value}`,
          epistemicType: p.measurement.epistemicType,
          provenance: p.measurement.provenance,
        });
        break;

      case 'HYPOTHESIS_CHALLENGED': {
        challenges.push({
          hypothesisId: p.hypothesisId,
          challengerEngineId: p.challengerEngineId,
          survived: p.survived,
          detail: p.detail,
          at,
        });
        const h = hypotheses.get(p.hypothesisId);
        if (h) {
          hypotheses.set(h.id, {
            ...h,
            supportCount: h.supportCount + (p.survived ? 1 : 0),
            challengeCount: h.challengeCount + 1,
            state: p.survived ? (h.state === 'REJECTED' ? h.state : 'SUPPORTED') : 'CHALLENGED',
          });
        }
        break;
      }

      case 'COUNTEREXAMPLE_FOUND':
        remember({ id: `ctr_${event.id}`, kind: 'Counterexample', label: p.detail });
        break;

      case 'DISCOVERY_RECORDED':
        discoveries.set(p.discovery.id, p.discovery);
        remember({
          id: p.discovery.id,
          kind: 'Discovery',
          label: p.discovery.statement,
          epistemicType: p.discovery.epistemicType,
          provenance: p.discovery.provenance,
        });
        break;

      case 'DISAGREEMENT_RECORDED':
        disagreements.set(p.disagreement.id, p.disagreement);
        remember({ id: p.disagreement.id, kind: 'Disagreement', label: p.disagreement.subject, provenance: p.disagreement.provenance });
        break;

      case 'AI_INTERPRETATION_ADDED':
        interpretations.push(p.interpretation);
        remember({
          id: p.interpretation.id,
          kind: 'AiInterpretation',
          label: p.interpretation.text.slice(0, 120),
          epistemicType: p.interpretation.epistemicType,
          provenance: p.interpretation.provenance,
        });
        break;

      case 'ENGINE_RETAINED':
        updateEngineStatus(p.engineId, 'RETAINED', at, p.reason);
        break;

      case 'ENGINE_PROMOTED':
        updateEngineStatus(p.engineId, p.to as EngineStatus, at, p.reason);
        break;

      case 'ENGINE_DEPRECATED':
        updateEngineStatus(p.engineId, 'DEPRECATED', at, p.reason);
        break;

      case 'RESEARCHER_NOTE_ADDED':
        notes.push(p.note);
        remember({
          id: p.note.id,
          kind: 'ResearcherNote',
          label: p.note.content.slice(0, 120),
          epistemicType: p.note.epistemicType,
          provenance: p.note.provenance,
        });
        break;

      case 'RESEARCHER_ACCEPTED':
        researcherAcceptances += 1;
        break;

      case 'RESEARCHER_REJECTED':
        researcherRejections += 1;
        break;

      case 'FRONTIER_ITEM_ADDED':
        frontier.set(p.item.id, p.item);
        remember({ id: p.item.id, kind: 'FrontierItem', label: p.item.subject, provenance: p.item.provenance });
        break;

      case 'FRONTIER_ITEM_CLAIMED': {
        const item = frontier.get(p.itemId);
        if (item) frontier.set(item.id, { ...item, state: 'PARTIALLY_EXPLORED' as FrontierState });
        break;
      }

      case 'FRONTIER_ITEM_CLOSED': {
        const item = frontier.get(p.itemId);
        if (item) frontier.set(item.id, { ...item, state: 'CLOSED' as FrontierState });
        break;
      }

      case 'CAPABILITY_GAP_DECLARED':
        capabilityGaps.push({ absence: p.absence, requestedBy: p.requestedBy });
        break;

      case 'BUDGET_EXHAUSTED':
        break;
    }
  }

  const engineList = [...engines.values()];
  const measurementsWithNull = measurements.filter((m) => m.nullModel);
  const reusedCapabilities = Object.values(capabilityUsage).filter((n) => n > 1).length;
  const enginesRun = engineList.reduce((n, e) => n + e.runs, 0);
  const supported = [...discoveries.values()].filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');

  const metrics: LabMetrics = {
    events: events.length,
    proposals: proposals.length,
    proposalsExecuted: executedProposalIds.size,
    enginesComposed: engineList.length,
    enginesRun,
    enginesPassed: engineList.reduce((n, e) => n + e.passes, 0),
    enginesFailed: engineList.reduce((n, e) => n + e.failures, 0),
    enginesRetained: engineList.filter((e) => e.engine.status === 'RETAINED').length,
    enginesCanonical: engineList.filter((e) => e.engine.status === 'CANONICAL').length,
    discoveriesSupported: supported.length,
    discoveriesRejected: [...discoveries.values()].filter((d) => d.state === 'REJECTED').length,
    challengesRun: challenges.length,
    challengesSurvived: challenges.filter((c) => c.survived).length,
    measurementsWithNullModel: measurementsWithNull.length,
    measurementsExceedingNull: measurementsWithNull.filter((m) => m.nullModel?.exceedsNull).length,
    capabilityUsage,
    capabilityReuse: reusedCapabilities,
    costUnitsSpent,
    proposalYield: proposals.length === 0 ? 0 : executedProposalIds.size / proposals.length,
    discoveryYield: enginesRun === 0 ? 0 : supported.length / enginesRun,
    researcherAcceptances,
    researcherRejections,
  };

  return {
    programme,
    events,
    corpora,
    questions,
    proposals,
    engines: engineList,
    experiments: [...experiments.values()],
    results,
    relations,
    measurements,
    hypotheses: [...hypotheses.values()],
    discoveries: [...discoveries.values()],
    disagreements: [...disagreements.values()],
    interpretations,
    notes,
    frontier: [...frontier.values()],
    capabilityGaps,
    challenges,
    index,
    metrics,
    lastEventAt: events.length > 0 ? events[events.length - 1]!.timestamp : null,
  };
}
