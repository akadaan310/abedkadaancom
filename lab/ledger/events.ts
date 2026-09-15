/**
 * Research events. Constitution §22 (research state is event-driven) and §64.
 *
 * The ledger is append-only and hash-chained. This is how §27 is enforced structurally
 * rather than by convention: there is no update path, so AI can propose and record but
 * cannot silently overwrite canonical source data, validated results, or provenance.
 * Any change is itself an event, and the chain makes the history tamper-evident.
 */
import { contentId, digest } from '../ontology/canonical';
import type { Actor } from '../ontology/epistemic';
import type {
  AiInterpretation,
  Corpus,
  Disagreement,
  Discovery,
  Engine,
  EngineResult,
  Experiment,
  Hypothesis,
  Measurement,
  Relation,
  ResearcherNote,
  DeclaredAbsence,
} from '../ontology/types';
import type { FrontierItem } from '../frontier/frontier';
import type { NanoProposal } from '../nano/contract';

export const EVENT_TYPES = [
  'RESEARCH_STARTED',
  'CORPUS_ADMITTED',
  'QUESTION_CREATED',
  'AI_OBSERVATION',
  'AI_PROPOSAL',
  'HYPOTHESIS_PROPOSED',
  'RELATION_PROPOSED',
  'ENGINE_COMPOSED',
  'ENGINE_AUDITED',
  'EXPERIMENT_QUEUED',
  'ENGINE_STARTED',
  'ENGINE_COMPLETED',
  'ENGINE_FAILED',
  'MEASUREMENT_RECORDED',
  'HYPOTHESIS_CHALLENGED',
  'COUNTEREXAMPLE_FOUND',
  'DISCOVERY_RECORDED',
  'DISAGREEMENT_RECORDED',
  'AI_INTERPRETATION_ADDED',
  'ENGINE_RETAINED',
  'ENGINE_PROMOTED',
  'ENGINE_DEPRECATED',
  'RESEARCHER_NOTE_ADDED',
  'RESEARCHER_ACCEPTED',
  'RESEARCHER_REJECTED',
  'FRONTIER_ITEM_ADDED',
  'FRONTIER_ITEM_CLAIMED',
  'FRONTIER_ITEM_CLOSED',
  'CAPABILITY_GAP_DECLARED',
  'BUDGET_EXHAUSTED',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventPayload =
  | { type: 'RESEARCH_STARTED'; programme: string; statement: string }
  | { type: 'CORPUS_ADMITTED'; corpus: Corpus }
  | { type: 'QUESTION_CREATED'; questionId: string; question: string; origin: string }
  | { type: 'AI_OBSERVATION'; observationId: string; text: string; aboutIds: readonly string[]; proposal: NanoProposal }
  | { type: 'AI_PROPOSAL'; proposal: NanoProposal }
  | { type: 'HYPOTHESIS_PROPOSED'; hypothesis: Hypothesis }
  | { type: 'RELATION_PROPOSED'; relation: Relation }
  | { type: 'ENGINE_COMPOSED'; engine: Engine; alternativesConsidered: readonly string[]; rationale: string }
  | { type: 'ENGINE_AUDITED'; engineId: string; passed: boolean; findings: readonly string[] }
  | { type: 'EXPERIMENT_QUEUED'; experiment: Experiment }
  | { type: 'ENGINE_STARTED'; experimentId: string; engineId: string }
  | { type: 'ENGINE_COMPLETED'; result: EngineResult }
  | { type: 'ENGINE_FAILED'; result: EngineResult }
  | { type: 'MEASUREMENT_RECORDED'; measurement: Measurement }
  | { type: 'HYPOTHESIS_CHALLENGED'; hypothesisId: string; challengerEngineId: string; survived: boolean; detail: string }
  | { type: 'COUNTEREXAMPLE_FOUND'; againstEngineId: string; detail: string; measurementIds: readonly string[] }
  | { type: 'DISCOVERY_RECORDED'; discovery: Discovery }
  | { type: 'DISAGREEMENT_RECORDED'; disagreement: Disagreement }
  | { type: 'AI_INTERPRETATION_ADDED'; interpretation: AiInterpretation }
  | { type: 'ENGINE_RETAINED'; engineId: string; reason: string }
  | { type: 'ENGINE_PROMOTED'; engineId: string; from: string; to: string; reason: string }
  | { type: 'ENGINE_DEPRECATED'; engineId: string; reason: string; supersededBy: string | null }
  | { type: 'RESEARCHER_NOTE_ADDED'; note: ResearcherNote }
  | { type: 'RESEARCHER_ACCEPTED'; targetId: string; reason: string }
  | { type: 'RESEARCHER_REJECTED'; targetId: string; reason: string }
  | { type: 'FRONTIER_ITEM_ADDED'; item: FrontierItem }
  | { type: 'FRONTIER_ITEM_CLAIMED'; itemId: string; leaseUntil: string }
  | { type: 'FRONTIER_ITEM_CLOSED'; itemId: string; outcome: string; detail: string }
  | { type: 'CAPABILITY_GAP_DECLARED'; absence: DeclaredAbsence; requestedBy: Actor }
  | { type: 'BUDGET_EXHAUSTED'; budget: string; spent: number; limit: number };

export interface ResearchEvent {
  readonly kind: 'ResearchEvent';
  readonly id: string;
  readonly seq: number;
  readonly timestamp: string;
  readonly actor: Actor;
  readonly payload: EventPayload;
  /** Hash of the previous event, or null for the genesis event. Makes history tamper-evident. */
  readonly prev: string | null;
  readonly hash: string;
}

/** Seal an event into the chain. The hash covers the payload *and* the predecessor. */
export function sealEvent(input: {
  seq: number;
  timestamp: string;
  actor: Actor;
  payload: EventPayload;
  prev: string | null;
}): ResearchEvent {
  const body = {
    seq: input.seq,
    timestamp: input.timestamp,
    actor: input.actor,
    payload: input.payload,
    prev: input.prev,
  };
  const hash = digest(body);
  return {
    kind: 'ResearchEvent',
    id: contentId('evt', body),
    seq: input.seq,
    timestamp: input.timestamp,
    actor: input.actor,
    payload: input.payload,
    prev: input.prev,
    hash,
  };
}

export interface ChainVerification {
  readonly intact: boolean;
  readonly checked: number;
  readonly problems: readonly string[];
}

/** Verify sequence continuity, link integrity, and per-event hashes. §22, §49 */
export function verifyChain(events: readonly ResearchEvent[]): ChainVerification {
  const problems: string[] = [];
  let prevHash: string | null = null;
  events.forEach((e, i) => {
    if (e.seq !== i) problems.push(`event ${e.id}: seq ${e.seq} out of order at position ${i}`);
    if (e.prev !== prevHash) problems.push(`event ${e.id}: prev link mismatch at seq ${e.seq}`);
    const recomputed = digest({
      seq: e.seq,
      timestamp: e.timestamp,
      actor: e.actor,
      payload: e.payload,
      prev: e.prev,
    });
    if (recomputed !== e.hash) problems.push(`event ${e.id}: hash mismatch (content altered after sealing)`);
    prevHash = e.hash;
  });
  return { intact: problems.length === 0, checked: events.length, problems };
}
