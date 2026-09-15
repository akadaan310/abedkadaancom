/**
 * One instrument: why it formed, what it was required to prove, what it ran, what failed.
 * §8, §54, §55 — the machinery of a result is part of the result.
 */
import { readState } from '../../../../lab/runtime';
import { Band, EpistemicTag, StatusTag, Tag, actorLabel, fmt } from '../../../ui';

export const dynamic = 'force-dynamic';

export default async function EnginePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const rec = state.engines.find((e) => e.engine.id === id);

  if (!rec) {
    return (
      <Band label="Instrument">
        <p className="note">No instrument with id <span className="mono">{id}</span> is recorded in this ledger.</p>
      </Band>
    );
  }

  const engine = rec.engine;
  const results = state.results.filter((r) => r.engineId === engine.id);
  const challenger = state.engines.find((e) => e.engine.challenges === engine.id);
  const challenged = engine.challenges ? state.engines.find((e) => e.engine.id === engine.challenges) : undefined;

  return (
    <>
      <Band label="Instrument">
        <div className="record-head">
          <StatusTag status={engine.status} />
          {engine.challenges && <Tag tone="quiet">challenger</Tag>}
          <span className="spacer" />
          <span className="id">{engine.id}</span>
        </div>
        <div className="column">
          <h1 className="record-title" style={{ fontSize: '1.5rem', margin: '0.5rem 0 0.75rem' }}>{engine.name}</h1>
          <p className="lede">{engine.purpose}</p>
          <p className="note"><strong>Question.</strong> {engine.question}</p>
        </div>
      </Band>

      <Band label="Why it formed">
        <div className="column">
          <p className="note tight">Proposed by <span className="mono">{actorLabel(engine.provenance.creator)}</span>.</p>
          {engine.provenance.notes && <p>{engine.provenance.notes}</p>}
          {challenged && (
            <p className="note">This instrument exists to challenge <a href={`/engines/${challenged.engine.id}`}>{challenged.engine.name}</a>.</p>
          )}
          {challenger && (
            <p className="note">Challenged by <a href={`/engines/${challenger.engine.id}`}>{challenger.engine.name}</a>.</p>
          )}
        </div>
      </Band>

      <Band label="Composition" count={`${engine.steps.length} steps`}>
        <div className="scroll">
          <table>
            <thead><tr><th>#</th><th>capability</th><th>consumes</th><th>produces</th><th>config</th></tr></thead>
            <tbody>
              {engine.steps.map((s, i) => (
                <tr key={s.as}>
                  <td className="num" style={{ color: 'var(--faint)' }}>{i}</td>
                  <td className="mono">{s.capability}</td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{s.from.join(', ')}</td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{s.as}</td>
                  <td className="mono" style={{ color: 'var(--faint)' }}>{JSON.stringify(s.config)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>

      <Band label="Evaluation protocol">
        <div className="column">
          <p className="note">Declared before execution, so the bar cannot be moved to fit the outcome.</p>
        </div>
        <ul className="index" style={{ marginTop: '1.25rem' }}>
          {engine.evaluationProtocol.criteria.map((c) => (
            <li key={c.id}>
              <span className="mono">{c.statistic} {c.comparator} {c.threshold}</span>
              <div className="note tight" style={{ marginTop: '0.3rem' }}>{c.description}</div>
            </li>
          ))}
        </ul>
        <div className="record-meta">null model: {engine.nullModel ?? 'none declared'} · alpha {engine.evaluationProtocol.alpha}</div>
      </Band>

      {rec.audit && (
        <Band label="Audit">
          <div className="record-head">
            <Tag tone={rec.audit.passed ? 'ink' : 'stamp'}>{rec.audit.passed ? 'passed' : 'problems found'}</Tag>
          </div>
          <ul className="index" style={{ marginTop: '1rem' }}>
            {rec.audit.findings.map((f, i) => <li key={i} className="note">{f}</li>)}
          </ul>
        </Band>
      )}

      <Band label="Runs" count={`${results.length}`}>
        {results.length === 0 && <p className="note">This instrument has not been executed.</p>}
        {results.map((r) => (
          <article className="record" key={r.id}>
            <div className="record-head">
              <Tag tone={r.evaluation.passed ? 'ink' : 'stamp'}>
                {r.ok ? (r.evaluation.passed ? 'criteria met' : 'criteria not met') : 'execution failed'}
              </Tag>
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                {r.durationMs} ms · {r.costUnits} cost units
              </span>
            </div>

            {r.failure && (
              <div className="column" style={{ marginTop: '0.5rem' }}>
                <p className="note tight"><strong>Failure is kept as research state.</strong> {r.failure.reason}</p>
                {r.failure.boundaryDiscovered && <p className="note">Boundary discovered: {r.failure.boundaryDiscovered}</p>}
              </div>
            )}

            {r.measurements.length > 0 && (
              <div className="scroll" style={{ marginTop: '1rem' }}>
                <table>
                  <thead><tr><th>statistic</th><th>value</th><th>null model</th><th>p</th><th>exceeds</th></tr></thead>
                  <tbody>
                    {r.measurements.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <a className="mono" href={`/provenance/${m.id}`}>{m.statistic}</a>{' '}
                          <EpistemicTag type={m.epistemicType} />
                        </td>
                        <td className="num">{fmt(m.value)}</td>
                        <td className="note" style={{ fontSize: '0.8rem' }}>{m.nullModel?.model ?? '—'}</td>
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

            <div className="scroll" style={{ marginTop: '1.25rem' }}>
              <table>
                <thead><tr><th>criterion</th><th>required</th><th>observed</th><th>verdict</th></tr></thead>
                <tbody>
                  {r.evaluation.checks.map((c) => (
                    <tr key={c.criterionId}>
                      <td className="mono">{c.criterionId}</td>
                      <td className="num">{c.statistic} {c.comparator} {c.threshold}</td>
                      <td className="num">{c.observed === null ? (c.note ?? '—') : fmt(c.observed)}</td>
                      <td><Tag tone={c.passed ? 'ink' : 'stamp'}>{c.passed ? 'held' : 'failed'}</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="record-meta">
              produced {r.relations.length} relation(s), {r.structures.length} structure(s), {r.embeddings.length} embedding(s) ·{' '}
              <a href={`/provenance/${r.id}`}>trace this result →</a>
            </div>
          </article>
        ))}
      </Band>

      <Band label="Reproducing this">
        <div className="column">
          <p className="note">
            The instrument id is content-addressed: an identical composition is the same instrument, and a changed one
            is provably a different instrument.
          </p>
          <div className="record-meta">data versions: {JSON.stringify(engine.dataVersions)}</div>
          <div className="record-meta">inputs: {JSON.stringify(engine.inputs)}</div>
        </div>
      </Band>
    </>
  );
}
