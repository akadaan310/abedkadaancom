/**
 * Presentation helpers. §28 requires the epistemic distinction to live in the data model;
 * this is only how that existing distinction is shown, never where it is decided.
 */
export function EpistemicBadge({ type }: { type?: string }) {
  if (!type) return null;
  const cls = type.startsWith('AI_')
    ? 'b-ai'
    : type.startsWith('RESEARCHER')
      ? 'b-researcher'
      : type === 'UNRESOLVED'
        ? 'b-unresolved'
        : 'b-computed';
  return <span className={`badge ${cls}`}>{type.replace(/_/g, ' ')}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const bad = ['FAILED', 'REJECTED', 'DEPRECATED'].includes(status);
  const good = ['PASSED', 'RETAINED', 'CANONICAL'].includes(status);
  return <span className={`badge ${bad ? 'b-fail' : good ? 'b-ok' : 'b-unresolved'}`}>{status}</span>;
}

export function Stat({ n, k }: { n: string | number; k: string }) {
  return (
    <div className="stat">
      <span className="n">{n}</span>
      <span className="k">{k}</span>
    </div>
  );
}

export function actorLabel(actor: { kind: string; [k: string]: unknown }): string {
  if (actor.kind === 'NANO_LLM') return `${String(actor.role)} · ${String(actor.provider)}/${String(actor.model)}`;
  if (actor.kind === 'ENGINE') return `engine ${String(actor.engineId).slice(0, 12)}`;
  if (actor.kind === 'SYSTEM') return `system · ${String(actor.component)}`;
  return `researcher ${String(actor.id ?? '')}`;
}

export function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '—';
  return Math.abs(n) >= 1000 || (Math.abs(n) < 0.001 && n !== 0) ? n.toExponential(2) : n.toFixed(digits);
}
