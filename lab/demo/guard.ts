/**
 * Demonstration guards.
 *
 * A public endpoint that calls paid model APIs is a spending endpoint. These limits are
 * deliberately conservative: a demonstration is worth showing, and is not worth funding
 * someone else's batch job.
 *
 * The counters live in process memory, so on a serverless runtime each instance keeps its
 * own. That makes the ceiling approximate rather than exact, which is stated here rather
 * than implied to be stronger than it is (§86).
 */

const WINDOW_MS = 60_000;
const PER_WINDOW = 6;

const hits = new Map<string, number[]>();
let dayKey = '';
let dayCount = 0;

export interface GuardVerdict {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly detail?: string;
}

export function dailyCap(): number {
  const raw = Number(process.env['DEMO_DAILY_CALL_CAP'] ?? '400');
  return Number.isFinite(raw) && raw > 0 ? raw : 400;
}

export function demosEnabled(): boolean {
  return (process.env['DEMO_ENABLED'] ?? '1') !== '0';
}

export function checkGuard(clientKey: string, costsAModelCall: boolean): GuardVerdict {
  if (!demosEnabled()) {
    return { allowed: false, reason: 'DEMONSTRATIONS_DISABLED', detail: 'Live demonstrations are switched off in this deployment.' };
  }

  const now = Date.now();
  const recent = (hits.get(clientKey) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) {
    return {
      allowed: false,
      reason: 'RATE_LIMITED',
      detail: `More than ${PER_WINDOW} demonstrations in a minute from one address. Wait a moment and try again.`,
    };
  }
  recent.push(now);
  hits.set(clientKey, recent);

  if (costsAModelCall) {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== dayKey) {
      dayKey = today;
      dayCount = 0;
    }
    if (dayCount >= dailyCap()) {
      return {
        allowed: false,
        reason: 'DAILY_CAP_REACHED',
        detail: `This instance has served its daily ceiling of ${dailyCap()} model-backed demonstrations. Computation-only demonstrations still run.`,
      };
    }
    dayCount += 1;
  }

  if (hits.size > 5000) hits.clear();
  return { allowed: true };
}

export function remainingToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) return dailyCap();
  return Math.max(0, dailyCap() - dayCount);
}
