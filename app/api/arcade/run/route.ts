/**
 * The arcade endpoint.
 *
 * Guarded like the demonstrations, with one difference: a visitor using their own key is
 * not charged against this site's daily ceiling, because they are paying for the call.
 * The key is forwarded for that request and never persisted or logged.
 */
import { runProgram, ArcadeError, type ArcadeTurn } from '../../../../lab/arcade/run';
import { programBySlug } from '../../../../lab/arcade/programs';
import { checkGuard, remainingToday } from '../../../../lab/demo/guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { program?: string; turns?: ArcadeTurn[]; byo?: { provider?: string; apiKey?: string; model?: string } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'BAD_REQUEST', detail: 'Body must be JSON.' }, { status: 400 });
  }

  const program = programBySlug(String(body.program ?? ''));
  if (!program) {
    return Response.json({ error: 'NO_SUCH_PROGRAM', detail: 'No program by that name.' }, { status: 404 });
  }

  const turns: ArcadeTurn[] = (body.turns ?? [])
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .map((t) => ({ role: t.role, content: t.content.slice(0, program.maxInput) }))
    .slice(-14);

  const usesOwnKey = Boolean(body.byo?.apiKey && body.byo.provider);
  const clientKey =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  // A visitor spending their own quota is still rate-limited for abuse, but is not
  // counted against this site's daily model ceiling.
  const verdict = checkGuard(clientKey, !usesOwnKey);
  if (!verdict.allowed) {
    return Response.json({ error: verdict.reason, detail: verdict.detail }, { status: 429 });
  }

  try {
    const result = await runProgram({
      program: program.slug,
      turns,
      ...(usesOwnKey
        ? { byo: { provider: String(body.byo!.provider), apiKey: String(body.byo!.apiKey), ...(body.byo!.model ? { model: String(body.byo!.model) } : {}) } }
        : {}),
    });
    return Response.json({ ...result, remainingToday: usesOwnKey ? null : remainingToday() });
  } catch (err) {
    if (err instanceof ArcadeError) {
      return Response.json({ error: err.reason, detail: err.message }, { status: 502 });
    }
    return Response.json({ error: 'RUN_FAILED', detail: (err as Error).message }, { status: 500 });
  }
}
