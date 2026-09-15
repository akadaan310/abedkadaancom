/**
 * OpenRouter provider. Constitution §23 and §73.
 *
 * OpenRouter is used as a gateway to many providers, never as the architecture. Nothing
 * in the research contracts depends on it: this file implements the same ModelProvider
 * interface as the offline proposer, and the laboratory works with it absent.
 *
 * A model's output is parsed against the proposal schema and discarded if it fails.
 * Convincing prose is not a proposal, and a proposal is still not a result (§11, §62).
 */
import { NanoProposalBodySchema, type NanoContext, type NanoProposalBody, type NanoRole } from '../contract';
import { modelUse, type ModelProvider, type ProviderResponse } from '../provider';
import { CapabilityUnavailable } from '../../ontology/errors';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** Tier → model. Routing is by task difficulty, cost and independence, per §45 and §73. */
export const DEFAULT_MODEL_TIERS: Readonly<Record<NanoRole['preferredTier'], string>> = {
  cheap: 'anthropic/claude-haiku-4.5',
  strong: 'anthropic/claude-sonnet-4.5',
  // A different vendor on purpose: model diversity is part of the methodology (§98).
  independent: 'google/gemini-2.5-pro',
};

function systemPrompt(role: NanoRole): string {
  return [
    'You are a Nano-LLM inside a computational research laboratory.',
    `Role: ${role.name}. Capability: ${role.capability}. Scope: ${role.scope}.`,
    role.instruction,
    '',
    'Hard rules:',
    '- You propose; you never conclude. Computation establishes results, not you.',
    '- Never name a capability that is not in the provided registry list.',
    '- Never claim a statistical result. Request the measurement instead.',
    `- You may only use these operations: ${role.allowedOps.join(', ') || '(none)'}.`,
    `- epistemicType must be one of: ${role.permittedEpistemicTypes.join(', ')}.`,
    '- State wouldBeWrongIf: what would have to be true for your proposal to be wrong.',
    '',
    'Reply with JSON only, matching this shape:',
    '{"proposalType":"...","summary":"...","rationale":"...","confidence":0.0,',
    ' "epistemicType":"...","requests":[],"evidenceIds":[],"wouldBeWrongIf":"..."}',
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

export interface OpenRouterOptions {
  readonly apiKey: string;
  readonly models?: Partial<Record<NanoRole['preferredTier'], string>>;
  readonly temperature?: number;
  readonly referer?: string;
  readonly title?: string;
  readonly fetchImpl?: typeof fetch;
}

export class OpenRouterProvider implements ModelProvider {
  readonly name = 'openrouter';
  readonly deterministic = false;
  readonly description =
    'Routes each role to a model through OpenRouter. Outputs are schema-validated and rejected if malformed. ' +
    'Because sampling is stochastic, every proposal records its model, version, temperature and prompt digest.';

  constructor(private readonly opts: OpenRouterOptions) {}

  private modelFor(role: NanoRole): string {
    return this.opts.models?.[role.preferredTier] ?? DEFAULT_MODEL_TIERS[role.preferredTier];
  }

  async propose(role: NanoRole, context: NanoContext, now: string): Promise<ProviderResponse> {
    const started = Date.now();
    const model = this.modelFor(role);
    const temperature = this.opts.temperature ?? 0.4;
    const messages = [
      { role: 'system', content: systemPrompt(role) },
      { role: 'user', content: userPrompt(context) },
    ];
    const doFetch = this.opts.fetchImpl ?? fetch;

    const response = await doFetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.opts.referer ? { 'HTTP-Referer': this.opts.referer } : {}),
        ...(this.opts.title ? { 'X-Title': this.opts.title } : {}),
      },
      body: JSON.stringify({ model, messages, temperature, response_format: { type: 'json_object' } }),
    });

    if (!response.ok) {
      throw new CapabilityUnavailable(
        'PROPOSE_ENGINE',
        'MODEL_UNAVAILABLE',
        `OpenRouter returned ${response.status} for ${model}: ${(await response.text()).slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
      model?: string;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new CapabilityUnavailable('PROPOSE_ENGINE', 'MODEL_UNAVAILABLE', `${model} returned no content`);
    }

    let body: NanoProposalBody;
    try {
      body = NanoProposalBodySchema.parse(JSON.parse(content));
    } catch (err) {
      // A malformed proposal is a model failure, not research state. It is never coerced.
      throw new CapabilityUnavailable(
        'PROPOSE_ENGINE',
        'INSUFFICIENT_EVIDENCE',
        `${model} returned output that does not satisfy the proposal schema: ${(err as Error).message}`,
      );
    }

    return {
      body,
      modelUse: modelUse({
        provider: this.name,
        model,
        modelVersion: payload.model ?? model,
        role: role.name,
        deterministic: false,
        temperature,
        seed: null,
        prompt: messages,
        output: body,
        // Token count stands in for cost until a pricing table is wired in. §45
        costUnits: payload.usage?.total_tokens ? payload.usage.total_tokens / 1000 : 1,
        latencyMs: Date.now() - started,
        timestamp: now,
      }),
    };
  }
}
