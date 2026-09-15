/**
 * Nano-LLM roles. Constitution §5, §67, §68, §69, §70.
 *
 * Roles are capabilities and contracts, not models. Several roles may share one model and
 * one role may be served by different models on different runs (§5, §23). What a role
 * fixes is its scope, the operations it may request, and the epistemic types it may claim.
 */
import type { NanoRole } from './contract';

export const ENGINE_DISCOVERER: NanoRole = {
  name: 'ENGINE-DISCOVERER',
  capability: 'Search the research frontier for opportunities that justify building a new instrument.',
  scope: 'frontier, unused capabilities, recurring computational patterns',
  instruction:
    'Inspect the current research state. Identify an unexplored or weakly supported item that the available ' +
    'capabilities could actually investigate. Propose one question worth computing. Do not assert findings.',
  allowedOps: ['recordHypothesis', 'requestCapability'],
  permittedEpistemicTypes: ['AI_OBSERVATION', 'AI_HYPOTHESIS', 'UNRESOLVED'],
  preferredTier: 'cheap',
  maxCostUnits: 4,
};

export const ENGINE_COMPOSER: NanoRole = {
  name: 'ENGINE-COMPOSER',
  capability: 'Turn a question into an executable composition of existing capabilities.',
  scope: 'capability registry, engine lineage',
  instruction:
    'Given a question and the capabilities that actually exist, assemble a step sequence that would answer it. ' +
    'Never name a capability that is not in the registry. Prefer a composition that ends in a measurement with a ' +
    'null model. Generate more than one candidate where the choice is not obvious.',
  allowedOps: ['composeEngine', 'proposeExperiment', 'requestCapability'],
  permittedEpistemicTypes: ['AI_PROPOSAL', 'UNRESOLVED'],
  preferredTier: 'strong',
  maxCostUnits: 8,
};

export const ENGINE_CHALLENGER: NanoRole = {
  name: 'ENGINE-CHALLENGER',
  capability: 'Attack a result: find what would make it misleading.',
  scope: 'engine results, measurements, null models',
  instruction:
    'Given an engine and its result, state what could make the result an artefact — threshold dependence, a weak ' +
    'null model, one region of the corpus carrying the effect — and compose an engine that would expose it.',
  allowedOps: ['composeEngine', 'requestCounterexample', 'recordHypothesis'],
  permittedEpistemicTypes: ['AI_COUNTEREXAMPLE', 'AI_HYPOTHESIS', 'AI_OBSERVATION'],
  preferredTier: 'independent',
  maxCostUnits: 8,
};

export const PROVENANCE_AUDITOR: NanoRole = {
  name: 'PROVENANCE-AUDITOR',
  capability: 'Check that recorded objects can answer where they came from.',
  scope: 'provenance graph, epistemic labels',
  instruction:
    'Inspect recent objects for missing provenance, absent interpretation guards, or epistemic labels that claim ' +
    'more than the computation supports. Report what cannot be explained rather than explaining it away.',
  allowedOps: ['recordHypothesis'],
  permittedEpistemicTypes: ['AI_OBSERVATION', 'UNRESOLVED'],
  preferredTier: 'cheap',
  maxCostUnits: 3,
};

export const INTERPRETER: NanoRole = {
  name: 'INTERPRETER',
  capability: 'Offer a reading of a computed result, explicitly as interpretation.',
  scope: 'engine results',
  instruction:
    'Given a measured result, say what it might mean and what it cannot mean. Your output is AI_INTERPRETATION: it ' +
    'is never a computational fact and never a theological claim (§93).',
  allowedOps: [],
  permittedEpistemicTypes: ['AI_INTERPRETATION'],
  preferredTier: 'strong',
  maxCostUnits: 4,
};

export const ROLES: readonly NanoRole[] = [
  ENGINE_DISCOVERER,
  ENGINE_COMPOSER,
  ENGINE_CHALLENGER,
  PROVENANCE_AUDITOR,
  INTERPRETER,
];

export function roleByName(name: string): NanoRole | undefined {
  return ROLES.find((r) => r.name === name);
}
