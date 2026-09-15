/** Provenance explorer. §21, §55, §83 — move backward from a result to the data. */
import { readState } from '../../../lab/runtime';
import { lineage, auditProvenance } from '../../../lab/provenance/provenance';
import { EpistemicBadge, actorLabel } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function Provenance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const node = state.index.get(id);

  if (!node) {
    return (
      <>
        <h2>Provenance</h2>
        <div className="panel">
          <p className="note">
            No object with id <span className="mono">{id}</span> is in the materialized index. It was never recorded,
            or it belongs to a different ledger.
          </p>
        </div>
      </>
    );
  }

  const chain = lineage(id, (x) => {
    const found = state.index.get(x);
    return found ? { id: found.id, ...(found.provenance ? { provenance: found.provenance } : {}) } : undefined;
  });
  const audit = auditProvenance(node.provenance);
  const p = node.provenance;

  return (
    <>
      <h2>Provenance</h2>
      <div className="row">
        <h3>{node.label}</h3>
        <span className="badge b-unresolved">{node.kind}</span>
        <EpistemicBadge type={node.epistemicType} />
      </div>
      <p className="chain">{node.id}</p>

      <h2>What produced this</h2>
      <div className="panel">
        {p ? (
          <>
            <p className="note">
              <strong>Creator:</strong> <span className="mono">{actorLabel(p.creator)}</span><br />
              <strong>When:</strong> <span className="mono">{p.timestamp}</span><br />
              <strong>From which data:</strong> <span className="mono">{JSON.stringify(p.sources)}</span><br />
              {p.engineId && <><strong>Engine:</strong> <a className="mono" href={`/engines/${p.engineId}`}>{p.engineId}</a> v{p.engineVersion}<br /></>}
              <strong>Capability chain:</strong> <span className="mono">{p.derivation.join(' → ') || '—'}</span><br />
              <strong>Parameters:</strong> <span className="mono">{JSON.stringify(p.configuration)}</span>
            </p>
            {p.models.length > 0 && (
              <div className="scroll" style={{ marginTop: 10 }}>
                <table>
                  <thead><tr><th>model</th><th>role</th><th>deterministic</th><th>temp</th><th>prompt digest</th></tr></thead>
                  <tbody>
                    {p.models.map((m, i) => (
                      <tr key={i}>
                        <td className="mono">{m.provider}/{m.model}</td>
                        <td className="mono">{m.role}</td>
                        <td className="num">{m.deterministic ? 'yes' : 'no'}</td>
                        <td className="num">{m.temperature ?? '—'}</td>
                        <td className="chain">{m.promptDigest.slice(0, 20)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {p.notes && <p className="guard">{p.notes}</p>}
          </>
        ) : (
          <p className="note">This object carries no provenance record. That is itself a finding, and the auditor flags it.</p>
        )}
      </div>

      <h2>Provenance completeness</h2>
      <div className="panel">
        <span className={`badge ${audit.complete ? 'b-ok' : 'b-fail'}`}>{audit.complete ? 'complete' : 'incomplete'}</span>
        {audit.missing.length > 0 && <p className="note" style={{ marginTop: 8 }}>Missing: {audit.missing.join(', ')}</p>}
        {audit.warnings.map((w, i) => <p className="guard" key={i}>{w}</p>)}
      </div>

      <h2>Lineage ({chain.length} objects)</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>depth</th><th>object</th><th>kind</th><th>produced by</th></tr></thead>
          <tbody>
            {chain.map((step) => {
              const n = state.index.get(step.id);
              return (
                <tr key={step.id}>
                  <td className="num">{step.depth}</td>
                  <td><a href={`/provenance/${step.id}`}>{n?.label ?? step.id}</a></td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{n?.kind ?? '—'}</td>
                  <td className="mono" style={{ color: 'var(--dim)' }}>{step.derivation.join(' → ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
