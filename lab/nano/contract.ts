/**
 * The Nano-LLM contract. Constitution §5, §26, §62.
 *
 * A Nano-LLM is defined by its role and contract, not by a model size (§5). It is never
 * required to return only prose: everything that touches computation or orchestration
 * comes back as a structured, schema-validated proposal (§62), and every proposal is a
 * *request* for computation, never a result (§11).
 */
import { z } from 'zod';
import { contentId } from '../ontology/canonical';
import { AI_AUTHORABLE, type Actor, type EpistemicType } from '../ontology/epistemic';
import type { ModelUse, Provenance } from '../provenance/provenance';

/** The typed operations by which AI may create experimental state. §26 */
export const NanoRequestSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('proposeRelation'),
    relationKind: z.string(),
    endpoints: z.tuple([z.string(), z.string()]),
    reason: z.string(),
  }),
  z.object({
    op: z.literal('proposeTransformation'),
    name: z.string(),
    claim: z.enum(['INVERTIBLE', 'LOSSY', 'UNKNOWN']),
    reason: z.string(),
  }),
  z.object({
    op: z.literal('recordHypothesis'),
    statement: z.string(),
    testableAs: z.string(),
  }),
  z.object({
    op: z.literal('composeEngine'),
    name: z.string(),
    purpose: z.string(),
    question: z.string(),
    /** Capability names must exist in the registry; the composer rejects the rest. §66, §90 */
    steps: z.array(
      z.object({
        capability: z.string(),
        from: z.array(z.string()),
        as: z.string(),
        config: z.record(z.unknown()).default({}),
      }),
    ),
    nullModel: z.string().nullable(),
    challenges: z.string().nullable().optional(),
  }),
  z.object({
    op: z.literal('proposeExperiment'),
    engineRef: z.string(),
    question: z.string(),
    inputs: z.record(z.unknown()).default({}),
  }),
  z.object({ op: z.literal('requestMeasurement'), statistic: z.string(), subjectId: z.string() }),
  z.object({ op: z.literal('requestCounterexample'), againstEngineId: z.string(), strategy: z.string() }),
  z.object({ op: z.literal('requestStructure'), fromRelationKind: z.string(), method: z.string() }),
  z.object({ op: z.literal('requestTraversal'), fromId: z.string(), toId: z.string() }),
  z.object({
    op: z.literal('requestCapability'),
    name: z.string(),
    why: z.string(),
  }),
]);
export type NanoRequest = z.infer<typeof NanoRequestSchema>;

export const PROPOSAL_TYPES = [
  'OBSERVATION',
  'HYPOTHESIS',
  'ENGINE',
  'RELATION',
  'EXPERIMENT',
  'COUNTEREXAMPLE',
  'CAPABILITY_REQUEST',
  'INTERPRETATION',
  'ABSTAIN',
] as const;

/**
 * The wire schema a model must satisfy. Anything that fails this is discarded rather
 * than coerced: a malformed proposal is a model failure, not research state.
 */
export const NanoProposalBodySchema = z.object({
  proposalType: z.enum(PROPOSAL_TYPES),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
  epistemicType: z.enum(AI_AUTHORABLE as unknown as [EpistemicType, ...EpistemicType[]]),
  requests: z.array(NanoRequestSchema).default([]),
  evidenceIds: z.array(z.string()).default([]),
  /** What would have to be true for this proposal to be wrong. §31, §68 */
  wouldBeWrongIf: z.string().default(''),
});
export type NanoProposalBody = z.infer<typeof NanoProposalBodySchema>;

export interface NanoProposal extends NanoProposalBody {
  readonly kind: 'NanoProposal';
  readonly id: string;
  readonly role: string;
  readonly author: Extract<Actor, { kind: 'NANO_LLM' }>;
  readonly modelUse: ModelUse;
  readonly provenance: Provenance;
}

export function sealProposal(input: {
  role: string;
  author: Extract<Actor, { kind: 'NANO_LLM' }>;
  body: NanoProposalBody;
  modelUse: ModelUse;
  provenance: Provenance;
}): NanoProposal {
  const id = contentId('prop', {
    role: input.role,
    author: input.author,
    body: input.body,
    promptDigest: input.modelUse.promptDigest,
    outputDigest: input.modelUse.outputDigest,
    timestamp: input.modelUse.timestamp,
  });
  return {
    kind: 'NanoProposal',
    id,
    role: input.role,
    author: input.author,
    modelUse: input.modelUse,
    provenance: input.provenance,
    ...input.body,
  };
}

/** The context a Nano-LLM observes. §62: input context → observation → structured proposal. */
export interface NanoContext {
  readonly programme: string;
  readonly question: string;
  /** What the laboratory can actually do right now, so the model does not invent tools. §66 */
  readonly availableCapabilities: readonly {
    readonly name: string;
    readonly purpose: string;
    readonly inputs: string;
    readonly outputs: string;
    readonly costUnits: number;
  }[];
  readonly corpora: readonly { readonly slug: string; readonly loci: number; readonly verification: string }[];
  readonly frontier: readonly { readonly id: string; readonly subject: string; readonly state: string; readonly reason: string }[];
  readonly recentFindings: readonly string[];
  readonly openDisagreements: readonly string[];
  readonly unusedCapabilities: readonly string[];
  readonly existingEngines: readonly { readonly id: string; readonly name: string; readonly status: string; readonly steps: readonly string[] }[];
  readonly budgetRemaining: number;
}

/** A role definition: capability, scope, contract, constraints, evaluation. §5 */
export interface NanoRole {
  readonly name: string;
  readonly capability: string;
  readonly scope: string;
  readonly instruction: string;
  readonly allowedOps: readonly NanoRequest['op'][];
  readonly permittedEpistemicTypes: readonly EpistemicType[];
  /** Routing hint, not a hard binding: any provider may serve any role. §23 */
  readonly preferredTier: 'cheap' | 'strong' | 'independent';
  readonly maxCostUnits: number;
}

/**
 * A proposal may only carry operations its role is allowed to request, and may only
 * claim epistemic types its role permits. §50: capabilities are explicit, not implied.
 */
export function validateAgainstRole(role: NanoRole, body: NanoProposalBody): string[] {
  const problems: string[] = [];
  if (!role.permittedEpistemicTypes.includes(body.epistemicType)) {
    problems.push(`role ${role.name} may not author ${body.epistemicType}`);
  }
  for (const req of body.requests) {
    if (!role.allowedOps.includes(req.op)) {
      problems.push(`role ${role.name} may not request ${req.op}`);
    }
  }
  return problems;
}
