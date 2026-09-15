/**
 * The demonstration endpoint.
 *
 * Public, and therefore guarded: bounded input, per-address rate limiting, and a daily
 * ceiling on model-backed calls. A refusal is returned as a stated reason, not a generic
 * error — the same rule the rest of the laboratory follows (§90).
 */
import { demoFor } from '../../../../lab/demo';
import { checkGuard, remainingToday } from '../../../../lab/demo/guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  const demo = demoFor(service);
  if (!demo) {
    return Response.json({ error: 'NO_SUCH_DEMONSTRATION', detail: `There is no demonstration registered for "${service}".` }, { status: 404 });
  }

  let input = '';
  try {
    const body = (await request.json()) as { input?: unknown };
    input = typeof body.input === 'string' ? body.input : '';
  } catch {
    input = '';
  }
  if (demo.input && input.length > demo.input.maxLength) {
    input = input.slice(0, demo.input.maxLength);
  }

  const clientKey =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const verdict = checkGuard(clientKey, demo.usesModel);
  if (!verdict.allowed) {
    return Response.json(
      { unavailable: { reason: verdict.reason, detail: verdict.detail }, computed: [], guard: '', elapsedMs: 0 },
      { status: 429 },
    );
  }

  try {
    const output = await demo.run(input);
    return Response.json({ ...output, remainingToday: demo.usesModel ? remainingToday() : null });
  } catch (err) {
    return Response.json(
      {
        computed: [],
        guard: '',
        elapsedMs: 0,
        unavailable: { reason: 'DEMONSTRATION_FAILED', detail: (err as Error).message },
      },
      { status: 500 },
    );
  }
}
