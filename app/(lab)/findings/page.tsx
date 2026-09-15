/** Findings, and what they are not allowed to mean. §20, §28, §56, §92 */
import { readState } from '../../../lab/runtime';
import { Band, EpistemicTag, Tag, fmt } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function Findings() {
  const state = await readState();
  const withNull = state.measurements.filter((m) => m.nullModel);
  const exceeded = withNull.filter((m) => m.nullModel!.exceedsNull);
  const notExceeded = withNull.filter((m) => !m.nullModel!.exceedsNull);
  const plain = state.measurements.filter((m) => !m.nullModel);

  return (
    <>
      <Band label="Findings">
        <div className="column">
          <p className="lede">A number is not a finding.</p>
          <p className="note">
            Measurements are separated below by whether they exceeded a declared null model — the difference between
            <em> a pattern was detected</em> and <em>a pattern exceeded what chance produces</em>. Each carries the
            guard recorded by the capability that computed it.
          </p>
        </div>
      </Band>

      <Band label="Exceeded their null model" count={`${exceeded.length}`}>
        {exceeded.length === 0 ? (
          <div className="column">
            <p className="note">
              Nothing yet. On the material admitted so far, the computed relations do not produce structure beyond
              what a degree-preserving null model explains. That is an honest negative result and is kept as one.
            </p>
          </div>
        ) : (
          exceeded.map((m) => <MeasurementRecord key={m.id} m={m} />)
        )}
      </Band>

      <Band label="Did not exceed their null model" count={`${notExceeded.length}`}>
        <div className="column">
          <p className="note">Recorded, not discarded. A failed hypothesis bounds what the instruments can show.</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {notExceeded.map((m) => <MeasurementRecord key={m.id} m={m} />)}
        </div>
      </Band>

      <Band label="Measured without a null model" count={`${plain.length}`}>
        <div className="column">
          <p className="note">Descriptive statistics only. These are never significance claims.</p>
        </div>
        <div className="scroll" style={{ marginTop: '1.25rem' }}>
          <table>
            <thead><tr><th>statistic</th><th>value</th><th>status</th></tr></thead>
            <tbody>
              {plain.map((m) => (
                <tr key={m.id}>
                  <td><a className="mono" href={`/provenance/${m.id}`}>{m.statistic}</a></td>
                  <td className="num">{fmt(m.value)}</td>
                  <td><EpistemicTag type={m.epistemicType} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>

      {state.interpretations.length > 0 && (
        <Band label="Interpretation" count={`${state.interpretations.length}`}>
          <div className="column">
            <p className="note">
              Marked as interpretation, linked to what it interprets, and never a computational fact.
            </p>
            {state.interpretations.map((i) => (
              <article className="record" key={i.id}>
                <div className="record-head"><EpistemicTag type={i.epistemicType} /></div>
                {i.text}
              </article>
            ))}
          </div>
        </Band>
      )}
    </>
  );
}

function MeasurementRecord({ m }: { m: Awaited<ReturnType<typeof readState>>['measurements'][number] }) {
  const n = m.nullModel!;
  return (
    <article className="record">
      <div className="record-head">
        <EpistemicTag type={m.epistemicType} />
        <Tag tone={n.exceedsNull ? 'ink' : 'quiet'}>p = {fmt(n.pValue)}</Tag>
        <span className="spacer" />
        <a className="mono plain" href={`/provenance/${m.id}`}>trace →</a>
      </div>
      <h3 className="record-title mono" style={{ fontSize: '1rem' }}>{m.statistic} = {fmt(m.value)}</h3>
      <p className="note tight" style={{ marginTop: '0.45rem' }}><strong>Null model.</strong> {n.description}</p>
      <div className="record-meta">
        observed {fmt(n.observed)} · null mean {fmt(n.nullMean)} ± {fmt(n.nullStdDev)} · {n.iterations} draws · seed {n.seed} · alpha {n.alpha}
      </div>
      <p className="guard">{m.interpretationGuard}</p>
    </article>
  );
}
