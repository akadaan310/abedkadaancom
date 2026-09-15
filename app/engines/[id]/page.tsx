/** One Engine: why it formed, what it ran, what it measured, what it failed. §8, §54, §55 */
import { readState } from '../../../lab/runtime';
import { EpistemicBadge, StatusBadge, actorLabel, fmt } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function EnginePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const rec = state.engines.find((e) => e.engine.id === id);
  if (!rec) return <><h2>Engine</h2><div className="panel"><p className="note">No engine with id {id} is recorded.</p></div></>;

  const engine = rec.engine;
  const results = state.results.filter((r) => r.engineId === engine.id);
  const challenger = state.engines.find((e) => e.engine.challenges === engine.id);
  const challenged = engine.challenges ? state.engines.find((e) => e.engine.id === engine.challenges) : undefined;

  return (
    <>
      <h2>Engine</h2>
      <div className="row"><h3 style={{ fontSize: 20 }}>{engine.name}</h3><StatusBadge status={engine.status} /></div>
      <p className="lede">{engine.purpose}</p>
      <p className="note"><strong>Question:</strong> {engine.question}</p>

      <h2>Why this engine formed</h2>
      <div className="panel">
        <p className="note" style={{ marginBottom: 8 }}>
          Proposed by <span className="mono">{actorLabel(engine.provenance.creator)}</span>.
        </p>
        {engine.provenance.notes && <p>{engine.provenance.notes}</p>}
        {challenged && (
          <p className="note">
            This engine exists to challenge <a href={`/engines/${challenged.engine.id}`}>{challenged.engine.name}</a>.
          </p>
        )}
        {challenger && (
          <p className="note">
            Challenged by <a href={`/engines/${challenger.engine.id}`}>{challenger.engine.name}</a>.
          </p>
        )}
      </div>

      <h2>Composition</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>#</th><th>capability</th><th>consumes</th><th>produces</th><th>config</th></tr></thead>
          <tbody>
            {engine.steps.map((s, i) => (
              <tr key={s.as}>
                <td className="num">{i}</td>
                <td className="mono">{s.capability}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{s.from.join(', ')}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{s.as}</td>
                <td className="mono" style={{ color: 'var(--dim)' }}>{JSON.stringify(s.config)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Evaluation protocol</h2>
      <div className="panel">
        <p className="note">Declared before execution, so the bar cannot be moved to fit the outcome.</p>
        <ul className="plain">
          {engine.evaluationProtocol.criteria.map((c) => (
            <li key={c.id}>
              <span className="mono">{c.statistic} {c.comparator} {c.threshold}</span> — {c.description}
            </li>
          ))}
        </ul>
        <p className="note" style={{ marginTop: 8 }}>
          Null model: {engine.nullModel ?? 'none declared'} · alpha {engine.evaluationProtocol.alpha}
        </p>
      </div>

      {rec.audit && (
        <>
          <h2>Audit</h2>
          <div className="panel">
            <p><span className={`badge ${rec.audit.passed ? 'b-ok' : 'b-fail'}`}>{rec.audit.passed ? 'passed' : 'problems found'}</span></p>
            <ul className="plain">{rec.audit.findings.map((f, i) => <li key={i} className="note">{f}</li>)}</ul>
          </div>
        </>
      )}

      <h2>Runs</h2>
      {results.length === 0 && <div className="panel"><p className="note">This engine has not been executed.</p></div>}
      {results.map((r) => (
        <div className="panel" key={r.id}>
          <div className="row">
            <span className={`badge ${r.evaluation.passed ? 'b-ok' : 'b-fail'}`}>
              {r.ok ? (r.evaluation.passed ? 'criteria met' : 'criteria not met') : 'execution failed'}
            </span>
            <span className="spacer" />
            <span className="mono" style={{ color: 'var(--dim)' }}>{r.durationMs} ms · {r.costUnits} cost units</span>
          </div>

          {r.failure && (
            <div style={{ marginTop: 10 }}>
              <p className="note"><strong>Failure is kept as research state.</strong> {r.failure.reason}</p>
              {r.failure.boundaryDiscovered && <p className="note">Boundary discovered: {r.failure.boundaryDiscovered}</p>}
            </div>
          )}

          {r.measurements.length > 0 && (
            <div className="scroll" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>statistic</th><th>value</th><th>null model</th><th>p</th><th>exceeds</th></tr></thead>
                <tbody>
                  {r.measurements.map((m) => (
                    <tr key={m.id}>
                      <td><a href={`/provenance/${m.id}`} className="mono">{m.statistic}</a> <EpistemicBadge type={m.epistemicType} /></td>
                      <td className="num">{fmt(m.value)}</td>
                      <td className="note" style={{ fontSize: 12.5 }}>{m.nullModel?.model ?? '—'}</td>
                      <td className="num">{m.nullModel ? fmt(m.nullModel.pValue) : '—'}</td>
                      <td className="num">{m.nullModel ? (m.nullModel.exceedsNull ? 'yes' : 'no') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r.measurements.map((m) => (
            <p className="guard" key={`g-${m.id}`}><span className="mono">{m.statistic}</span> — {m.interpretationGuard}</p>
          ))}

          <div className="scroll" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>criterion</th><th>required</th><th>observed</th><th></th></tr></thead>
              <tbody>
                {r.evaluation.checks.map((c) => (
                  <tr key={c.criterionId}>
                    <td className="mono">{c.criterionId}</td>
                    <td className="num">{c.statistic} {c.comparator} {c.threshold}</td>
                    <td className="num">{c.observed === null ? (c.note ?? '—') : fmt(c.observed)}</td>
                    <td><span className={`badge ${c.passed ? 'b-ok' : 'b-fail'}`}>{c.passed ? 'held' : 'failed'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            Produced {r.relations.length} relation(s), {r.structures.length} structure(s), {r.embeddings.length} embedding(s).{' '}
            <a href={`/provenance/${r.id}`}>Trace this result →</a>
          </p>
        </div>
      ))}

      <h2>Reproducing this</h2>
      <div className="panel">
        <p className="note">
          Data versions: <span className="mono">{JSON.stringify(engine.dataVersions)}</span><br />
          Inputs: <span className="mono">{JSON.stringify(engine.inputs)}</span><br />
          Engine id is content-addressed: an identical composition is the same engine, a changed one is a different engine.
        </p>
      </div>
    </>
  );
}
