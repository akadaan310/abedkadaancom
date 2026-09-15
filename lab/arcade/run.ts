/**
 * Running an arcade program.
 *
 * The visitor may use the laboratory's own models or supply their own key. A supplied key
 * is used for that single call and never written anywhere — not to disk, not to a log,
 * not to the ledger.
 */
import { chat, NoProviderAvailable, PROVIDERS } from '../models/providers';
import { programBySlug, type Program } from './programs';

export interface ArcadeTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface ArcadeRequest {
  readonly program: string;
  readonly turns: readonly ArcadeTurn[];
  readonly byo?: { readonly provider: string; readonly apiKey: string; readonly model?: string };
}

export interface ArcadeResponse {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly usedOwnKey: boolean;
  readonly attempts: readonly { provider: string; model: string; ok: boolean; error?: string }[];
}

export class ArcadeError extends Error {
  override readonly name = 'ArcadeError';
  constructor(readonly reason: string, message: string) {
    super(message);
  }
}

/** Conversation history is capped: a demonstration is not a hosting service. */
const MAX_TURNS = 14;

export function renderConversation(program: Program, turns: readonly ArcadeTurn[]): string {
  const recent = turns.slice(-MAX_TURNS);
  if (recent.length === 0) return 'Begin.';
  if (!program.conversational) return recent[recent.length - 1]!.content;
  return recent.map((t) => `${t.role === 'user' ? 'PLAYER' : 'YOU'}: ${t.content}`).join('\n\n');
}

export async function runProgram(req: ArcadeRequest): Promise<ArcadeResponse> {
  const program = programBySlug(req.program);
  if (!program) throw new ArcadeError('NO_SUCH_PROGRAM', `There is no program called "${req.program}".`);

  if (req.byo && !PROVIDERS.some((p) => p.name === req.byo!.provider)) {
    throw new ArcadeError(
      'UNKNOWN_PROVIDER',
      `"${req.byo.provider}" is not one of the supported providers: ${PROVIDERS.map((p) => p.name).join(', ')}.`,
    );
  }

  try {
    const result = await chat({
      system: program.system,
      user: renderConversation(program, req.turns),
      tier: program.tier,
      temperature: program.category === 'GAME' ? 0.8 : 0.3,
      maxTokens: 900,
      timeoutMs: 25000,
      ...(req.byo ? { bringYourOwn: req.byo } : {}),
    });
    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usedOwnKey: Boolean(req.byo),
      attempts: result.attempts.map((a) => ({ provider: a.provider, model: a.model, ok: a.ok, ...(a.error ? { error: a.error } : {}) })),
    };
  } catch (err) {
    if (err instanceof NoProviderAvailable) {
      throw new ArcadeError(
        req.byo ? 'YOUR_PROVIDER_REFUSED' : 'NO_MODEL_AVAILABLE',
        req.byo
          ? // The key may be fine and the quota exhausted; those are different problems,
            // and telling someone their key is broken when it is not wastes their time.
            `${req.byo.provider} refused the call made with your key. ${err.attempts.map((a) => a.error).join('; ')}`
          : err.attempts.length === 0
            ? 'No model is configured on this deployment. Supply your own key to run this program.'
            : `Every model this site can reach failed. ${err.attempts.map((a) => `${a.provider}: ${a.error}`).join('; ')}`,
      );
    }
    throw err;
  }
}
