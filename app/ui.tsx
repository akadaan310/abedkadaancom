/**
 * Presentation helpers.
 *
 * §28 requires the epistemic distinction to live in the data model. This is only how that
 * existing distinction is typeset — never where it is decided. The three visual weights
 * are: computed (ink), proposed or interpreted (muted), unresolved or absent (stamp).
 */

export function Tag({ children, tone = 'quiet' }: { children: React.ReactNode; tone?: 'ink' | 'muted' | 'stamp' | 'quiet' }) {
  const cls = tone === 'ink' ? 'tag tag--ink' : tone === 'stamp' ? 'tag tag--stamp' : tone === 'quiet' ? 'tag tag--quiet' : 'tag';
  return <span className={cls}>{children}</span>;
}

export function EpistemicTag({ type }: { type?: string }) {
  if (!type) return null;
  const tone = type.startsWith('AI_')
    ? 'muted'
    : type === 'UNRESOLVED'
      ? 'stamp'
      : type.startsWith('RESEARCHER')
        ? 'muted'
        : 'ink';
  return <Tag tone={tone as 'ink' | 'muted' | 'stamp'}>{type.replace(/_/g, ' ')}</Tag>;
}

export function StatusTag({ status }: { status: string }) {
  const stamp = ['FAILED', 'REJECTED', 'DEPRECATED'].includes(status);
  const ink = ['PASSED', 'RETAINED', 'CANONICAL'].includes(status);
  return <Tag tone={stamp ? 'stamp' : ink ? 'ink' : 'quiet'}>{status}</Tag>;
}

export function Band({
  label,
  count,
  children,
  id,
}: {
  label: string;
  count?: string | number;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="band" {...(id ? { id } : {})}>
      <h2 className="band-label">
        {label}
        {count !== undefined && <span className="count">{count}</span>}
      </h2>
      <div className="band-body">{children}</div>
    </section>
  );
}

export function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <span className="figure">{value}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}

export function actorLabel(actor: { kind: string; [k: string]: unknown }): string {
  if (actor.kind === 'NANO_LLM') return `${String(actor.role)} · ${String(actor.provider)}/${String(actor.model)}`;
  if (actor.kind === 'ENGINE') return `instrument ${String(actor.engineId).slice(0, 12)}`;
  if (actor.kind === 'SYSTEM') return `system · ${String(actor.component)}`;
  return `researcher ${String(actor.id ?? '')}`;
}

export function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '—';
  return Math.abs(n) >= 10000 || (Math.abs(n) < 0.001 && n !== 0) ? n.toExponential(2) : n.toFixed(digits);
}
