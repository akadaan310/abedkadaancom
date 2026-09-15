/** Findings, with what they do not license. §20, §28, §56, §92 */
import { readState } from '../../lab/runtime';
import { EpistemicBadge, fmt } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Findings() {
  const state = await readState();
  const withNull = state.measurements.filter((m) => m.nullModel);
  const exceeded = withNull.filter((m) => m.nullModel!.exceedsNull);
  const notExceeded = withNull.filter((m) => !m.nullModel!.exceedsNull);
  const plain = state.measurements.filter((m) => !m.nullModel);

  return (
    <>
      <h2>Findings</h2>
      <p className="note">
        A number is not a finding. Below, measurements are separated by whether they exceeded a declared null model —
        the difference between <em>a pattern was detected</em> and <em>a pattern exceeded what chance produces</em>.
        Each carries the guard recorded by the capability that computed it.
      </p>

      <h2>Exceeded their null model ({exceeded.length})</h2>
      {exceeded.length === 0 && (
        <div className="panel">
          <p className="note">
            Nothing yet. On this corpus, the relations computed so far do not produce structure beyond what a
            degree-preserving null model explains. That is an honest negative result and is kept as one.
          </p>
        </div>
      )}
      {exceeded.map((m) => <Card key={m.id} m={m} />)}

      <h2>Did not exceed their null model ({notExceeded.length})</h2>
      <p className="note">Recorded, not discarded. A failed hypothesis bounds what the instruments can show. (§48)</p>
      {notExceeded.map((m) => <Card key={m.id} m={m} />)}

      <h2>Measured without a null model ({plain.length})</h2>
      <p className="note">
        Descriptive statistics. These are never significance claims, and the laboratory does not treat them as findings.
      </p>
      <div className="panel scroll">
        <table>
          <thead><tr><th>statistic</th><th>value</th><th>status</th></tr></thead>
          <tbody>
            {plain.map((m) => (
              <tr key={m.id}>
                <td><a className="mono" href={`/provenance/${m.id}`}>{m.statistic}</a></td>
                <td className="num">{fmt(m.value)}</td>
                <td><EpistemicBadge type={m.epistemicType} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.interpretations.length > 0 && (
        <>
          <h2>AI interpretation</h2>
          <p className="note">
            Marked as interpretation, linked to the objects it interprets, and never a computational fact or a
            theological claim. (§92, §93)
          </p>
          {state.interpretations.map((i) => (
            <div className="panel" key={i.id}><EpistemicBadge type={i.epistemicType} /><p>{i.text}</p></div>
          ))}
        </>
      )}
    </>
  );
}

function Card({ m }: { m: Awaited<ReturnType<typeof readState>>['measurements'][number] }) {
  const n = m.nullModel!;
  return (
    <div className="panel">
      <div className="row">
        <h3 className="mono">{m.statistic} = {fmt(m.value)}</h3>
        <EpistemicBadge type={m.epistemicType} />
        <span className={`badge ${n.exceedsNull ? 'b-ok' : 'b-unresolved'}`}>p = {fmt(n.pValue)}</span>
      </div>
      <p className="note" style={{ marginTop: 8 }}><strong>Null model:</strong> {n.description}</p>
      <p className="note">
        <span className="mono">
          observed {fmt(n.observed)} · null mean {fmt(n.nullMean)} ± {fmt(n.nullStdDev)} · {n.iterations} draws · seed {n.seed} · alpha {n.alpha}
        </span>
      </p>
      <p className="guard">{m.interpretationGuard}</p>
      <p className="note" style={{ marginTop: 8 }}><a href={`/provenance/${m.id}`}>Trace this measurement →</a></p>
    </div>
  );
}
