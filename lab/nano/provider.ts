/**
 * Model provider abstraction. Constitution §23: model providers are replaceable.
 *
 * The research contracts stay independent of any vendor. A provider receives a role, a
 * context and a prompt, and returns a schema-valid proposal body plus the ModelUse record
 * that provenance requires (§65, §97).
 */
import { digest } from '../ontology/canonical';
import type { ModelUse } from '../provenance/provenance';
import type { NanoContext, NanoProposalBody, NanoRole } from './contract';

export interface ProviderResponse {
  readonly body: NanoProposalBody;
  readonly modelUse: ModelUse;
}

export interface ModelProvider {
  readonly name: string;
  readonly deterministic: boolean;
  /** Human-readable statement of what this provider actually is. Shown on the website. §86 */
  readonly description: string;
  propose(role: NanoRole, context: NanoContext, now: string): Promise<ProviderResponse>;
}

export function modelUse(init: {
  provider: string;
  model: string;
  modelVersion: string;
  role: string;
  deterministic: boolean;
  temperature: number | null;
  seed: number | null;
  prompt: unknown;
  output: unknown;
  costUnits: number;
  latencyMs: number;
  timestamp: string;
}): ModelUse {
  return {
    provider: init.provider,
    model: init.model,
    modelVersion: init.modelVersion,
    role: init.role,
    temperature: init.temperature,
    seed: init.seed,
    deterministic: init.deterministic,
    promptDigest: digest(init.prompt),
    outputDigest: digest(init.output),
    costUnits: init.costUnits,
    latencyMs: init.latencyMs,
    timestamp: init.timestamp,
  };
}
