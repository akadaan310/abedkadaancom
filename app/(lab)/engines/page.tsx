/** The register of instruments. §17, §84 */
import { readState } from '../../../lab/runtime';
import { Band, StatusTag, Tag, actorLabel } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function Engines() {
  const state = await readState();
  return (
    <Band label="Instruments" count={`${state.engines.length}`}>
      <div className="column">
        <p className="note">
          An instrument is a composition of capabilities with an evaluation protocol fixed before it runs. Nothing
          becomes canonical because something proposed it: promotion requires passing audit, meeting its own declared
          criteria, and a decision by the researcher.
        </p>
      </div>
      <div style={{ marginTop: '1.75rem' }}>
        {state.engines.length === 0 && <p className="note">No instrument has been composed yet.</p>}
        {state.engines.map((rec) => (
          <article className="record" key={rec.engine.id}>
            <div className="record-head">
              <StatusTag status={rec.engine.status} />
              {rec.engine.challenges && <Tag tone="quiet">challenger</Tag>}
              {rec.audit && <Tag tone={rec.audit.passed ? 'quiet' : 'stamp'}>{rec.audit.passed ? 'audited' : `${rec.audit.findings.length} audit finding(s)`}</Tag>}
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{rec.passes}/{rec.runs} met criteria</span>
            </div>
            <h3 className="record-title"><a href={`/engines/${rec.engine.id}`}>{rec.engine.name}</a></h3>
            <p className="note tight" style={{ marginTop: '0.35rem' }}>{rec.engine.purpose}</p>
            <div className="record-meta">{rec.engine.steps.map((s) => s.capability).join(' → ')}</div>
            <div className="record-meta">composed by {actorLabel(rec.engine.provenance.creator)} · <span className="id">{rec.engine.id}</span></div>
          </article>
        ))}
      </div>
    </Band>
  );
}
