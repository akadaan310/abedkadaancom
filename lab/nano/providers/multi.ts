/**
 * The research loop's model provider.
 *
 * Delegates to the shared provider layer, so the loop draws on exactly the population
 * configured for the rest of the system — no vendor-specific path, and one place where
 * a provider is added (§23). The reply is validated against the proposal schema and
 * discarded if it fails: a malformed proposal is a model failure, not research state.
 */
import { chat, configuredProviders, stripFences } from '../../models/providers';
import { CapabilityUnavailable } from '../../ontology/errors';
import {
  describeRequestShapes,
  NanoProposalBodySchema,
  PROPOSAL_TYPES,
  type NanoContext,
  type NanoProposalBody,
  type NanoRole,
} from '../contract';
import { modelUse, type ModelProvider, type ProviderResponse } from '../provider';

function systemPrompt(role: NanoRole): string {
  return [
    'You are a bounded research process inside a computational laboratory.',
    `Role: ${role.name}. Capability: ${role.capability}. Scope: ${role.scope}.`,
    role.instruction,
    '',
    'Hard rules:',
    '- You propose; you never conclude. Computation establishes results, not you.',
    '- Never name a capability that is not in the provided register.',
    '- Never claim a statistical result. Request the measurement instead.',
    `- You may only use these operations: ${role.allowedOps.join(', ') || '(none)'}.`,
    '- Each entry in "requests" must be an object matching exactly one of these shapes:',
    describeRequestShapes(role.allowedOps),
    `- epistemicType must be one of: ${role.permittedEpistemicTypes.join(', ')}.`,
    '- State wouldBeWrongIf: what would have to be true for your proposal to be wrong.',
    '',
    'Reply with JSON only, using these exact field names:',
    '{"proposalType":"...","summary":"...","rationale":"...","confidence":0.0,',
    ' "epistemicType":"...","requests":[],"evidenceIds":[],"wouldBeWrongIf":"..."}',
    '',
    `proposalType must be exactly one of: ${PROPOSAL_TYPES.join(' | ')}.`,
    'Do not invent values for any enumerated field. confidence is a number between 0 and 1.',
  ].join('\n');
}

function userPrompt(ctx: NanoContext): string {
  return JSON.stringify(
    {
      programme: ctx.programme,
      question: ctx.question,
      availableCapabilities: ctx.availableCapabilities,
      corpora: ctx.corpora,
      frontier: ctx.frontier,
      existingEngines: ctx.existingEngines,
      unusedCapabilities: ctx.unusedCapabilities,
      recentFindings: ctx.recentFindings,
      openDisagreements: ctx.openDisagreements,
      budgetRemainingCostUnits: ctx.budgetRemaining,
    },
    null,
    1,
  );
}

export class MultiModelProvider implements ModelProvider {
  readonly name = 'models';
  readonly deterministic = false;
  readonly description =
    'Routes each role to the first reachable provider in the configured population, recording which one served. ' +
    'Outputs are schema-validated and rejected if malformed. Sampling is stochastic, so every proposal records its ' +
    'provider, model, temperature and prompt digest.';

  static configured(): boolean {
    return configuredProviders().length > 0;
  }

  async propose(role: NanoRole, context: NanoContext, now: string): Promise<ProviderResponse> {
    const temperature = 0.3;
    const result = await chat({
      system: systemPrompt(role),
      user: userPrompt(context),
      tier: role.preferredTier === 'cheap' ? 'fast' : 'strong',
      json: true,
      temperature,
      maxTokens: 800,
    });

    let body: NanoProposalBody;
    let served = result;
    try {
      body = NanoProposalBodySchema.parse(JSON.parse(stripFences(result.text)));
    } catch (firstError) {
      // One correction round. The refusal is shown to the model rather than hidden, which
      // is the same courtesy the laboratory extends to a human researcher — and it is
      // still a refusal if the second attempt also fails. §62
      const retry = await chat({
        system: systemPrompt(role),
        user:
          `${userPrompt(context)}\n\nYour previous reply was refused by the schema validator. ` +
          `Correct it and reply with valid JSON only.\nValidator output: ${(firstError as Error).message.slice(0, 600)}`,
        tier: role.preferredTier === 'cheap' ? 'fast' : 'strong',
        json: true,
        temperature,
        maxTokens: 800,
      });
      try {
        body = NanoProposalBodySchema.parse(JSON.parse(stripFences(retry.text)));
        served = retry;
      } catch (secondError) {
        throw new CapabilityUnavailable(
          'PROPOSE_ENGINE',
          'INSUFFICIENT_EVIDENCE',
          `${retry.provider}/${retry.model} returned output that does not satisfy the proposal schema after one ` +
            `correction round: ${(secondError as Error).message.slice(0, 300)}`,
        );
      }
    }

    return {
      body,
      modelUse: modelUse({
        provider: served.provider,
        model: served.model,
        modelVersion: served.model,
        role: role.name,
        deterministic: false,
        temperature,
        seed: null,
        prompt: { system: systemPrompt(role), user: userPrompt(context) },
        output: body,
        costUnits: ((served.promptTokens ?? 0) + (served.completionTokens ?? 0)) / 1000,
        latencyMs: served.latencyMs,
        timestamp: now,
      }),
    };
  }
}
