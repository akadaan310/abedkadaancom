/**
 * Epistemic status.
 *
 * Constitution §28 requires that the distinction between an AI proposal, a computed
 * engine result, and a researcher interpretation exist *in the data model*, not merely
 * in visual styling. Every knowledge-bearing object in the laboratory carries one of
 * these tags, and the promotion rules below are the only sanctioned way to move an
 * object from one epistemic category toward another (§26, §87).
 */

/** Who or what produced a claim, and with what force. §28 */
export const EPISTEMIC_TYPES = [
  'EXISTING',              // source material admitted to the laboratory
  'COMPUTED',              // produced by an executed Engine over declared inputs
  'DERIVED',               // computed from other computed objects
  'INFERENCE',             // statistical inference carrying an explicit null model
  'AI_OBSERVATION',        // a Nano-LLM noticed something in current state
  'AI_HYPOTHESIS',         // a Nano-LLM proposed a testable claim
  'AI_PROPOSAL',           // a Nano-LLM proposed an object or an action
  'AI_INTERPRETATION',     // a Nano-LLM offered meaning, never a computational fact
  'AI_COUNTEREXAMPLE',     // a Nano-LLM proposed a way to break a claim
  'RESEARCHER_PROPOSAL',   // a human proposed it
  'RESEARCHER_NOTE',       // a human wrote it; never a computational fact
  'RESEARCHER_INTERPRETATION',
  'UNRESOLVED',            // the laboratory cannot currently classify this
] as const;
export type EpistemicType = (typeof EPISTEMIC_TYPES)[number];

/** Claims that a Nano-LLM may author. Anything else must come from computation or a human. */
export const AI_AUTHORABLE: readonly EpistemicType[] = [
  'AI_OBSERVATION',
  'AI_HYPOTHESIS',
  'AI_PROPOSAL',
  'AI_INTERPRETATION',
  'AI_COUNTEREXAMPLE',
  'UNRESOLVED',
];

/** Claims that only an executed Engine may author. §11 */
export const COMPUTATION_ONLY: readonly EpistemicType[] = ['COMPUTED', 'DERIVED', 'INFERENCE'];

/** Claims that only a human researcher may author. §29, §91 */
export const RESEARCHER_ONLY: readonly EpistemicType[] = [
  'RESEARCHER_PROPOSAL',
  'RESEARCHER_NOTE',
  'RESEARCHER_INTERPRETATION',
];

export type Actor =
  | { kind: 'RESEARCHER'; id: string }
  | { kind: 'NANO_LLM'; role: string; provider: string; model: string; modelVersion: string }
  | { kind: 'ENGINE'; engineId: string; engineVersion: number }
  | { kind: 'SYSTEM'; component: string };

/** Which epistemic types a given actor is permitted to author. §10, §11, §27 */
export function permittedFor(actor: Actor): readonly EpistemicType[] {
  switch (actor.kind) {
    case 'NANO_LLM':
      return AI_AUTHORABLE;
    case 'ENGINE':
      return COMPUTATION_ONLY;
    case 'RESEARCHER':
      return RESEARCHER_ONLY;
    case 'SYSTEM':
      return ['EXISTING', 'UNRESOLVED'];
  }
}

export function mayAuthor(actor: Actor, type: EpistemicType): boolean {
  return permittedFor(actor).includes(type);
}

/**
 * Guard for §10 ("self-discovery does not mean self-authorization") and §11
 * ("computation is the verification boundary"). Reversing these roles is the single
 * most damaging failure this system can have, so it throws rather than warns.
 */
export function assertMayAuthor(actor: Actor, type: EpistemicType, what: string): void {
  if (!mayAuthor(actor, type)) {
    throw new EpistemicViolation(
      `${actor.kind} may not author ${type} (${what}). Permitted: ${permittedFor(actor).join(', ')}`,
    );
  }
}

export class EpistemicViolation extends Error {
  override readonly name = 'EpistemicViolation';
}

/**
 * Discovery lifecycle. §15 — "not yet found" is not "does not exist",
 * and "AI proposed" is not "known".
 */
export const DISCOVERY_STATES = [
  'UNEXPLORED',
  'PROPOSED',
  'TESTING',
  'SUPPORTED',
  'CHALLENGED',
  'REJECTED',
  'WITHHELD',
  'KNOWN',
  'EXHAUSTED',
] as const;
export type DiscoveryState = (typeof DISCOVERY_STATES)[number];

/** Engine lifecycle. §7 — an Engine never becomes canonical because an LLM proposed it. */
export const ENGINE_STATUSES = [
  'PROPOSED',
  'EXPERIMENTAL',
  'RUNNING',
  'PASSED',
  'FAILED',
  'REJECTED',
  'RETAINED',
  'DEPRECATED',
  'CANONICAL',
] as const;
export type EngineStatus = (typeof ENGINE_STATUSES)[number];

/** Experiment lifecycle. §63 */
export const EXPERIMENT_STATUSES = [
  'PROPOSED',
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CHALLENGED',
  'REJECTED',
  'RETAINED',
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

/** State-transition tables. Promotion between states must be explicit. §26 */
const ENGINE_TRANSITIONS: Record<EngineStatus, readonly EngineStatus[]> = {
  PROPOSED: ['EXPERIMENTAL', 'REJECTED'],
  EXPERIMENTAL: ['RUNNING', 'REJECTED'],
  RUNNING: ['PASSED', 'FAILED'],
  PASSED: ['RETAINED', 'REJECTED', 'RUNNING'],
  FAILED: ['EXPERIMENTAL', 'REJECTED', 'RUNNING'],
  // CANONICAL is reachable only from RETAINED, and only by a researcher. §29
  RETAINED: ['CANONICAL', 'DEPRECATED', 'RUNNING', 'REJECTED'],
  REJECTED: ['EXPERIMENTAL'],
  CANONICAL: ['DEPRECATED'],
  DEPRECATED: [],
};

export function engineTransitionAllowed(from: EngineStatus, to: EngineStatus): boolean {
  return (ENGINE_TRANSITIONS[from] ?? []).includes(to);
}

/** §29: promotion to CANONICAL is reserved to the human researcher. */
export function requiresResearcher(to: EngineStatus): boolean {
  return to === 'CANONICAL';
}
