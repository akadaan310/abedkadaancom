/** The Engine Garden. §17, §25, §84 — every engine, its lineage and its outcome. */
import { readState } from '../../lab/runtime';
import { StatusBadge, actorLabel } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Engines() {
  const state = await readState();
  return (
    <>
      <h2>Engines</h2>
      <p className="note">
        An Engine is a research instrument: a composition of capabilities with a declared evaluation protocol, fixed
        before it runs. An Engine never becomes canonical because something proposed it — promotion requires passing
        audit, meeting its own criteria, and a decision by the researcher.
      </p>
      {state.engines.length === 0 && <div className="panel"><p className="note">No engine has been composed yet.</p></div>}
      {state.engines.map((rec) => (
        <div className="panel" key={rec.engine.id}>
          <div className="row">
            <h3><a href={`/engines/${rec.engine.id}`}>{rec.engine.name}</a></h3>
            <StatusBadge status={rec.engine.status} />
            {rec.engine.challenges && <span className="badge b-ai">challenger</span>}
            <span className="spacer" />
            <span className="mono" style={{ color: 'var(--dim)' }}>{rec.passes}/{rec.runs} runs met criteria</span>
          </div>
          <p className="note" style={{ margin: '6px 0' }}>{rec.engine.purpose}</p>
          <div className="mono" style={{ color: 'var(--muted)' }}>{rec.engine.steps.map((s) => s.capability).join(' → ')}</div>
          <div className="mono" style={{ color: 'var(--dim)', marginTop: 6 }}>
            composed by {actorLabel(rec.engine.provenance.creator)}
            {rec.audit && ` · audit ${rec.audit.passed ? 'passed' : `found ${rec.audit.findings.length} problem(s)`}`}
          </div>
        </div>
      ))}
    </>
  );
}
