/**
 * Model routing. Constitution §23, §45, §73.
 *
 * The laboratory selects a provider per role and records which one actually served each
 * proposal. When no model provider is configured it does not pretend one ran: it falls
 * back to the offline proposer, which is labelled honestly everywhere it appears (§57).
 */
import { LocalHeuristicProvider } from './providers/local-heuristic';
import { MultiModelProvider } from './providers/multi';
import { sealProposal, validateAgainstRole, type NanoContext, type NanoProposal, type NanoRole } from './contract';
import { provenance } from '../provenance/provenance';
import type { ModelProvider } from './provider';

export interface RouterOptions {
  readonly openRouterApiKey?: string | undefined;
  readonly models?: Partial<Record<NanoRole['preferredTier'], string>>;
  readonly fetchImpl?: typeof fetch;
}

export class NanoRouter {
  private readonly providers: ModelProvider[];

  constructor(opts: RouterOptions = {}) {
    const providers: ModelProvider[] = [];
    // Any configured provider serves the loop; with none, the offline proposer does,
    // and says so. The `openRouterApiKey` option is retained so existing callers keep
    // working, but provider selection now comes from the shared population. §23
    if (MultiModelProvider.configured() || opts.openRouterApiKey) {
      providers.push(new MultiModelProvider());
    }
    providers.push(new LocalHeuristicProvider());
    this.providers = providers;
  }

  /** What the laboratory can honestly say about its own model population. §89 */
  describe(): { name: string; deterministic: boolean; description: string }[] {
    return this.providers.map((p) => ({ name: p.name, deterministic: p.deterministic, description: p.description }));
  }

  get primary(): ModelProvider {
    return this.providers[0]!;
  }

  /**
   * Ask one role for one proposal. If a model provider fails, the failure is surfaced and
   * the offline proposer takes over — the loop must not stall, and it must not silently
   * report a model's work as having happened.
   */
  async propose(
    role: NanoRole,
    context: NanoContext,
    now: string,
  ): Promise<{ proposal: NanoProposal; problems: readonly string[]; providerError?: string }> {
    let providerError: string | undefined;
    for (const provider of this.providers) {
      try {
        const { body, modelUse } = await provider.propose(role, context, now);
        const problems = validateAgainstRole(role, body);
        const author = {
          kind: 'NANO_LLM' as const,
          role: role.name,
          provider: provider.name,
          model: modelUse.model,
          modelVersion: modelUse.modelVersion,
        };
        const proposal = sealProposal({
          role: role.name,
          author,
          body,
          modelUse,
          provenance: provenance({
            creator: author,
            models: [modelUse],
            derivation: [`nano:${role.name}`],
            configuration: { question: context.question, provider: provider.name },
            timestamp: now,
            sources: Object.fromEntries(context.corpora.map((c) => [c.slug, c.verification])),
          }),
        });
        return { proposal, problems, ...(providerError ? { providerError } : {}) };
      } catch (err) {
        providerError = `${provider.name}: ${(err as Error).message}`;
      }
    }
    throw new Error(`no provider could produce a proposal (${providerError ?? 'unknown'})`);
  }
}
