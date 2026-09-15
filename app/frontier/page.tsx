/** The research frontier. §46, §56, §75, §90 */
import { readState } from '../../lab/runtime';
import { rankFrontier, utility } from '../../lab/frontier/frontier';
import { DECLARED_ABSENCES } from '../../lab/capabilities/registry';
import { fmt } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Frontier() {
  const state = await readState();
  const open = state.frontier.filter((f) => f.state !== 'CLOSED');
  const ranked = rankFrontier(state.frontier);
  const blocked = open.filter((f) => f.state === 'AWAITING_CAPABILITY' || f.state === 'AWAITING_RESEARCHER');

  return (
    <>
      <h2>Research frontier</h2>
      <p className="note">
        What the laboratory knows it has not done. Items are ranked by expected information gain × research priority ×
        novelty ÷ cost, so the laboratory can say "interesting but expensive" and defer rather than spending
        indiscriminately.
      </p>

      <h2>Actionable now ({ranked.length})</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>subject</th><th>kind</th><th>state</th><th>cost</th><th>utility</th></tr></thead>
          <tbody>
            {ranked.map((f) => (
              <tr key={f.id}>
                <td>{f.subject}<div className="note" style={{ fontSize: 12.5, marginTop: 3 }}>{f.reason}</div></td>
                <td className="mono">{f.itemKind}</td>
                <td><span className="badge b-unresolved">{f.state.replace(/_/g, ' ')}</span></td>
                <td className="num">{f.costEstimate}</td>
                <td className="num">{fmt(utility(f), 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Blocked ({blocked.length})</h2>
      <p className="note">Waiting on a capability the laboratory does not have, or on the researcher. Not forgotten.</p>
      <ul className="plain">
        {blocked.map((f) => (
          <li key={f.id} className="panel" style={{ marginBottom: 8 }}>
            <div className="row"><span className="badge b-unresolved">{f.state.replace(/_/g, ' ')}</span><strong>{f.subject}</strong></div>
            <p className="note" style={{ marginTop: 6 }}>{f.reason}</p>
          </li>
        ))}
      </ul>

      <h2>What this laboratory cannot currently do</h2>
      <p className="note">
        Declared absences, published so that no process can invent a capability that does not exist. (§90)
      </p>
      {DECLARED_ABSENCES.map((a) => (
        <div className="panel" key={a.name}>
          <div className="row"><h3 className="mono">{a.name}</h3><span className="badge b-fail">{a.reason.replace(/_/g, ' ')}</span></div>
          <p className="note" style={{ marginTop: 6 }}>{a.detail}</p>
        </div>
      ))}
    </>
  );
}
