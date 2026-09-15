/**
 * The participation contract. Constitution §23, §50, §62, §66, §89.
 *
 * Any research agent — a hosted model, a local model, another laboratory, or a person
 * writing JSON by hand — participates on these terms. Nothing here is vendor-specific:
 * the contract describes capabilities, roles and schemas, never a provider. Model
 * identity is recorded for provenance and never confers authority.
 */
import { zodToJsonSchema } from './schema';
import { buildRegistry, readState } from '../../../lab/runtime';
import { DECLARED_ABSENCES } from '../../../lab/capabilities/registry';
import { ROLES } from '../../../lab/nano/roles';
import { NanoProposalBodySchema } from '../../../lab/nano/contract';
import { AI_AUTHORABLE, COMPUTATION_ONLY, RESEARCHER_ONLY } from '../../../lab/ontology/epistemic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const registry = buildRegistry();
  const state = await readState();

  return Response.json({
    contract: 'abedkadaan.com/participation',
    version: 1,
    statement:
      'Propose; do not conclude. Computation establishes results. Any process may participate on identical terms.',

    capabilities: registry.all().map((c) => ({
      name: c.name,
      purpose: c.purpose,
      consumes: c.inputs,
      produces: c.output,
      config: c.configKeys,
      costUnits: c.costUnits,
      permissions: c.permissions,
      dependencies: c.dependencies,
      ...(c.transform
        ? {
            transform: {
              operation: c.transform.operation,
              preserves: c.transform.preserves,
              discards: c.transform.discards,
              invertibility: c.transform.invertibility,
              conditions: c.transform.conditions,
            },
          }
        : {}),
    })),

    declaredAbsent: DECLARED_ABSENCES,

    roles: ROLES.map((r) => ({
      name: r.name,
      capability: r.capability,
      scope: r.scope,
      instruction: r.instruction,
      allowedOperations: r.allowedOps,
      permittedEpistemicTypes: r.permittedEpistemicTypes,
      maxCostUnits: r.maxCostUnits,
    })),

    epistemicPermissions: {
      note: 'Which actor may author which kind of claim. Enforced as a throwing guard in the data model.',
      agentMayAuthor: AI_AUTHORABLE,
      computationOnly: COMPUTATION_ONLY,
      researcherOnly: RESEARCHER_ONLY,
    },

    proposalSchema: zodToJsonSchema(NanoProposalBodySchema),

    rejection: [
      'Naming a capability that is not in the register.',
      'Claiming an epistemic type the role may not author.',
      'Asserting a statistical result instead of requesting the measurement.',
      'Returning prose where the schema requires structure.',
      'Malformed proposals are discarded rather than coerced.',
    ],

    reserved: [
      'Changing an instrument status is reserved to computation and the researcher.',
      'Promotion to CANONICAL is reserved to the researcher, and is refused while the source is unverified.',
      'The ledger is append-only; no participant can overwrite a record.',
    ],

    researchMaterial: state.corpora.map((c) => ({
      slug: c.slug,
      title: c.title,
      language: c.language,
      loci: c.loci.length,
      sourceVerification: c.sourceVerification,
      dataVersion: c.dataVersion,
    })),

    openFrontier: state.frontier
      .filter((f) => f.state !== 'CLOSED')
      .map((f) => ({ id: f.id, kind: f.itemKind, state: f.state, subject: f.subject, reason: f.reason, costEstimate: f.costEstimate })),

    state: '/api/state',
  });
}
