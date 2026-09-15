/**
 * Promotion. Constitution §10, §26, §29.
 *
 * "Self-discovery does not mean self-authorization." Promotion is the gate: an Engine
 * never becomes canonical because an LLM proposed it, or because it happened to pass.
 * CANONICAL is reserved to a human researcher, and is refused outright when the
 * underlying source text has not been verified by one (§29, §87, §95).
 */
import { engineTransitionAllowed, requiresResearcher, type Actor, type EngineStatus } from '../ontology/epistemic';
import type { Corpus, Engine } from '../ontology/types';
import type { AuditReport } from './audit';

export interface PromotionDecision {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export function canPromote(init: {
  engine: Engine;
  to: EngineStatus;
  actor: Actor;
  audit?: AuditReport;
  corpora?: ReadonlyMap<string, Corpus>;
}): PromotionDecision {
  const reasons: string[] = [];
  const { engine, to, actor } = init;

  if (!engineTransitionAllowed(engine.status, to)) {
    reasons.push(`${engine.status} → ${to} is not a permitted transition`);
  }
  if (requiresResearcher(to) && actor.kind !== 'RESEARCHER') {
    reasons.push(`only a researcher may promote an engine to ${to} (§29); this request came from ${actor.kind}`);
  }
  if (actor.kind === 'NANO_LLM') {
    reasons.push('a Nano-LLM may propose an engine but may not change its status (§10)');
  }
  if (init.audit && !init.audit.passed) {
    reasons.push(`the engine has not passed audit: ${init.audit.findings.join('; ')}`);
  }
  if (to === 'CANONICAL' && init.corpora) {
    const source = init.corpora.get(String(engine.inputs['corpus'] ?? ''));
    if (source && source.sourceVerification !== 'VERIFIED_AGAINST_EDITION') {
      reasons.push(
        `the corpus "${source.slug}" is ${source.sourceVerification}: a result resting on an unverified source ` +
          'cannot be made canonical',
      );
    }
  }
  return { allowed: reasons.length === 0, reasons };
}
