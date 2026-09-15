/**
 * The model population. Constitution §23 (providers are replaceable) and §98.
 *
 * One HTTP layer for every OpenAI-compatible endpoint, configured from the environment.
 * No vendor is privileged: a provider is a row in a table, and the laboratory records
 * which one actually served each call. When a provider fails — no key, no quota, a
 * malformed reply — that failure is reported rather than hidden (§57, §90).
 */

export type Tier = 'fast' | 'strong';

export interface ProviderConfig {
  readonly name: string;
  readonly baseUrl: string;
  readonly apiKeyEnv: string;
  readonly models: Readonly<Record<Tier, string>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly note: string;
}

/**
 * Order is preference order: fastest first, then breadth. Every entry is optional —
 * the laboratory runs with none of them configured, on its deterministic offline
 * proposer, which never claims to be a model.
 */
export const PROVIDERS: readonly ProviderConfig[] = [
  {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnv: 'GROQ_API_KEY',
    models: { fast: 'qwen/qwen3.8-27b', strong: 'openai/gpt-oss-120b' },
    note: 'Low-latency inference. First choice for interactive demonstrations.',
  },
  {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: { fast: 'ministral-8b-latest', strong: 'mistral-medium-latest' },
    note: 'Independent vendor, used as a second opinion where model diversity matters.',
  },
  {
    name: 'cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    models: { fast: 'qwen-3.8-27b', strong: 'gpt-oss-120b' },
    note: 'Configured but currently without quota on this account; calls return payment_required.',
  },
  {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: { fast: 'mistralai/mistral-small-3.2-24b-instruct', strong: 'anthropic/claude-sonnet-4.5' },
    headers: { 'X-Title': 'abedkadaan.com' },
    note: 'Gateway to many vendors. Used for breadth and for routing a question to a different family of model.',
  },
];

export function configuredProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => (process.env[p.apiKeyEnv] ?? '').trim().length > 0);
}

export interface ChatAttempt {
  readonly provider: string;
  readonly model: string;
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ChatResult {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  /** Every provider tried, in order, including the ones that failed. §86: no hidden magic. */
  readonly attempts: readonly ChatAttempt[];
}

export class NoProviderAvailable extends Error {
  override readonly name = 'NoProviderAvailable';
  constructor(readonly attempts: readonly ChatAttempt[]) {
    super(
      attempts.length === 0
        ? 'No model provider is configured in this environment.'
        : `Every configured provider failed: ${attempts.map((a) => `${a.provider} (${a.error})`).join('; ')}`,
    );
  }
}

/** Some models return an empty `content` and put the answer in `reasoning`. Take either. */
function extractText(message: { content?: string | null; reasoning?: string | null } | undefined): string {
  const content = (message?.content ?? '').trim();
  if (content.length > 0) return content;
  return (message?.reasoning ?? '').trim();
}

/** Models fence JSON even when told not to. Unwrap before parsing rather than failing. */
export function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const firstBrace = body.indexOf('{');
  const lastBrace = body.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return body.slice(firstBrace, lastBrace + 1);
  return body;
}

export interface ChatRequest {
  readonly system: string;
  readonly user: string;
  readonly tier?: Tier;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly json?: boolean;
  readonly timeoutMs?: number;
  /** Restrict to these provider names, in this order. Defaults to the configured order. */
  readonly only?: readonly string[];
  /**
   * A key supplied by the visitor for this one call.
   *
   * It is used for the single request and never written to disk, a log, or the ledger.
   * The laboratory's own keys are not used when this is present, and no record of the
   * visitor's key survives the response.
   */
  readonly bringYourOwn?: { readonly provider: string; readonly apiKey: string; readonly model?: string };
}

export function providerByName(name: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.name === name);
}

/**
 * Call the first provider that answers. Each failure is recorded and the next is tried;
 * if all fail, the caller receives the whole attempt log rather than a generic error.
 */
export async function chat(req: ChatRequest): Promise<ChatResult> {
  const tier = req.tier ?? 'fast';
  const timeoutMs = req.timeoutMs ?? 20000;
  const byo = req.bringYourOwn;
  const byoConfig = byo ? providerByName(byo.provider) : undefined;
  const candidates = byoConfig
    ? [byoConfig]
    : configuredProviders().filter((p) => !req.only || req.only.includes(p.name));
  const attempts: ChatAttempt[] = [];

  if (byo && !byoConfig) {
    throw new NoProviderAvailable([
      { provider: byo.provider, model: '—', ok: false, latencyMs: 0, error: `unknown provider "${byo.provider}"` },
    ]);
  }

  for (const provider of candidates) {
    const model = byo?.model || provider.models[tier];
    const apiKey = byo?.apiKey ?? process.env[provider.apiKeyEnv];
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetch(provider.baseUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(provider.headers ?? {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: req.system },
              { role: 'user', content: req.user },
            ],
            max_tokens: req.maxTokens ?? 700,
            temperature: req.temperature ?? 0.2,
            ...(req.json ? { response_format: { type: 'json_object' } } : {}),
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const body = await response.text();
        let message = `${response.status}`;
        try {
          const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
          message = parsed.error?.message ?? parsed.message ?? message;
        } catch {
          message = `${response.status} ${body.slice(0, 120)}`;
        }
        attempts.push({ provider: provider.name, model, ok: false, latencyMs: Date.now() - started, error: message });
        continue;
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string | null; reasoning?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = extractText(payload.choices?.[0]?.message);
      if (text.length === 0) {
        attempts.push({ provider: provider.name, model, ok: false, latencyMs: Date.now() - started, error: 'empty response' });
        continue;
      }

      const latencyMs = Date.now() - started;
      attempts.push({ provider: provider.name, model, ok: true, latencyMs });
      return {
        text,
        provider: provider.name,
        model,
        latencyMs,
        promptTokens: payload.usage?.prompt_tokens ?? null,
        completionTokens: payload.usage?.completion_tokens ?? null,
        attempts,
      };
    } catch (err) {
      const message = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
      attempts.push({ provider: provider.name, model, ok: false, latencyMs: Date.now() - started, error: message });
    }
  }

  throw new NoProviderAvailable(attempts);
}
