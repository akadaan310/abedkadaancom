/**
 * The research frontier. Constitution §46, §76, §99.
 *
 * Self-discovery without direction is just generation. The frontier is the explicit
 * record of what is unexplored, weakly supported, contested, expensive, or blocked,
 * and it is what gives a Nano-LLM something to choose between (§46). Each item carries
 * a cost estimate so the laboratory can say "interesting but expensive" and defer (§75).
 */
import { contentId } from '../ontology/canonical';
import type { Actor } from '../ontology/epistemic';
import type { Provenance } from '../provenance/provenance';

export const FRONTIER_KINDS = [
  'QUESTION',
  'HYPOTHESIS',
  'COUNTEREXAMPLE',
  'ENGINE',
  'CAPABILITY_GAP',
  'DATA_REQUEST',
  'PROVENANCE_AUDIT',
] as const;
export type FrontierKind = (typeof FRONTIER_KINDS)[number];

export const FRONTIER_STATES = [
  'UNEXPLORED',
  'PARTIALLY_EXPLORED',
  'WEAKLY_SUPPORTED',
  'HIGHLY_CONTESTED',
  'COMPUTATIONALLY_EXPENSIVE',
  'AWAITING_CAPABILITY',
  'AWAITING_RESEARCHER',
  'CLOSED',
] as const;
export type FrontierState = (typeof FRONTIER_STATES)[number];

export interface FrontierItem {
  readonly kind: 'FrontierItem';
  readonly id: string;
  readonly itemKind: FrontierKind;
  readonly state: FrontierState;
  readonly subject: string;
  /** Why this is on the frontier at all. §86: no hidden magic. */
  readonly reason: string;
  readonly novelty: number;
  readonly expectedInformationGain: number;
  readonly researchPriority: number;
  readonly uncertainty: number;
  /** Estimated cost in laboratory cost units (1 unit ≈ one elementary computation batch). */
  readonly costEstimate: number;
  readonly dependencies: readonly string[];
  readonly proposedBy: Actor;
  readonly provenance: Provenance;
}

export interface FrontierItemInit extends Omit<FrontierItem, 'kind' | 'id'> {}

export function frontierItem(init: FrontierItemInit): FrontierItem {
  const id = contentId('fro', {
    itemKind: init.itemKind,
    subject: init.subject,
    reason: init.reason,
  });
  return { kind: 'FrontierItem', id, ...init };
}

/**
 * Research economy. §99 offers a shape rather than a formula:
 *
 *     expected_information_gain × research_priority × novelty ÷ computational_cost
 *
 * The exact formula is an implementation decision; the principle is not. Cost is
 * floored at 1 so that a free-looking item cannot dominate by dividing by zero.
 */
export function utility(item: FrontierItem): number {
  const cost = Math.max(1, item.costEstimate);
  return (item.expectedInformationGain * item.researchPriority * item.novelty) / cost;
}

/** Items the laboratory may act on itself, versus those that are blocked on someone else. */
export function isActionable(item: FrontierItem): boolean {
  return (
    item.state !== 'CLOSED' &&
    item.state !== 'AWAITING_RESEARCHER' &&
    item.state !== 'AWAITING_CAPABILITY'
  );
}

/** Rank the actionable frontier by utility. Ties break on id so ordering is reproducible. */
export function rankFrontier(items: readonly FrontierItem[]): readonly FrontierItem[] {
  return [...items].filter(isActionable).sort((a, b) => {
    const d = utility(b) - utility(a);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}
