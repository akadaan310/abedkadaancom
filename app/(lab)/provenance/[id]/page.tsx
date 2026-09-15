/** Provenance: move backward from any object to the data it rests on. §21, §55, §83 */
import { readState } from '../../../../lab/runtime';
import { auditProvenance, lineage } from '../../../../lab/provenance/provenance';
import { Band, EpistemicTag, Tag, actorLabel } from '../../../ui';

export const dynamic = 'force-dynamic';

export default async function Provenance({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const node = state.index.get(id);

  if (!node) {
    return (
      <Band label="Provenance">
        <p className="note">
          No object with id <span className="mono">{id}</span> is in the materialized index. It was never recorded,
          or it belongs to a different ledger.
        </p>
      </Band>
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
      <Band label="Provenance">
        <div className="record-head">
          <Tag tone="quiet">{node.kind}</Tag>
          <EpistemicTag type={node.epistemicType} />
        </div>
        <div className="column">
          <h1 className="record-title" style={{ fontSize: '1.3rem', margin: '0.5rem 0 0.4rem' }}>{node.label}</h1>
          <div className="id">{node.id}</div>
        </div>
      </Band>

      <Band label="What produced this">
        {p ? (
          <>
            <div className="scroll">
              <table>
                <tbody>
                  <tr><th style={{ width: '11rem' }}>creator</th><td className="mono">{actorLabel(p.creator)}</td></tr>
                  <tr><th>when</th><td className="mono">{p.timestamp}</td></tr>
                  <tr><th>from which data</th><td className="mono">{JSON.stringify(p.sources)}</td></tr>
                  {p.engineId && (
                    <tr>
                      <th>instrument</th>
                      <td><a className="mono" href={`/engines/${p.engineId}`}>{p.engineId}</a> v{p.engineVersion}</td>
                    </tr>
                  )}
                  <tr><th>capability chain</th><td className="mono">{p.derivation.join(' → ') || '—'}</td></tr>
                  <tr><th>parameters</th><td className="mono">{JSON.stringify(p.configuration)}</td></tr>
                </tbody>
              </table>
            </div>

            {p.models.length > 0 && (
              <div className="scroll" style={{ marginTop: '1.5rem' }}>
                <table>
                  <thead><tr><th>model</th><th>role</th><th>deterministic</th><th>temp</th><th>prompt digest</th></tr></thead>
                  <tbody>
                    {p.models.map((mu, i) => (
                      <tr key={i}>
                        <td className="mono">{mu.provider}/{mu.model}</td>
                        <td className="mono">{mu.role}</td>
                        <td className="num">{mu.deterministic ? 'yes' : 'no'}</td>
                        <td className="num">{mu.temperature ?? '—'}</td>
                        <td className="id">{mu.promptDigest.slice(0, 24)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {p.notes && <p className="guard">{p.notes}</p>}
          </>
        ) : (
          <p className="note">
            This object carries no provenance record. That is itself a finding, and the auditor reports it.
          </p>
        )}
      </Band>

      <Band label="Completeness">
        <div className="record-head">
          <Tag tone={audit.complete ? 'ink' : 'stamp'}>{audit.complete ? 'complete' : 'incomplete'}</Tag>
        </div>
        <div className="column" style={{ marginTop: '0.75rem' }}>
          {audit.missing.length > 0 && <p className="note tight">Missing: {audit.missing.join(', ')}</p>}
          {audit.warnings.map((w, i) => <p className="guard" key={i}>{w}</p>)}
          {audit.complete && audit.warnings.length === 0 && (
            <p className="note">This object can answer what produced it, from which data, and with what parameters.</p>
          )}
        </div>
      </Band>

      <Band label="Lineage" count={`${chain.length} objects`}>
        <div className="scroll">
          <table>
            <thead><tr><th>depth</th><th>object</th><th>kind</th><th>produced by</th></tr></thead>
            <tbody>
              {chain.map((step) => {
                const n = state.index.get(step.id);
                return (
                  <tr key={step.id}>
                    <td className="num" style={{ color: 'var(--faint)' }}>{step.depth}</td>
                    <td><a href={`/provenance/${step.id}`}>{n?.label ?? step.id}</a></td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>{n?.kind ?? '—'}</td>
                    <td className="mono" style={{ color: 'var(--faint)' }}>{step.derivation.join(' → ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Band>
    </>
  );
}
