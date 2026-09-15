/** The ledger. §22, §64, §86 — the durable history, and proof it has not been rewritten. */
import { readState } from '../../lab/runtime';
import { verifyChain } from '../../lab/ledger/events';
import { actorLabel } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Ledger() {
  const state = await readState();
  const chain = verifyChain(state.events);
  const counts = new Map<string, number>();
  for (const e of state.events) counts.set(e.payload.type, (counts.get(e.payload.type) ?? 0) + 1);

  return (
    <>
      <h2>Research ledger</h2>
      <p className="note">
        Append-only and hash-chained: each event's hash covers its own content and its predecessor, so altering any
        past event invalidates every event after it. This is how "AI must not overwrite canonical research state" is
        enforced structurally rather than by convention — there is no update path at all.
      </p>

      <div className="panel">
        <div className="row">
          <h3>{state.events.length} events</h3>
          <span className={`badge ${chain.intact ? 'b-ok' : 'b-fail'}`}>{chain.intact ? 'chain intact' : 'chain broken'}</span>
        </div>
        {chain.problems.map((p, i) => <p className="guard" key={i} style={{ color: 'var(--fail)' }}>{p}</p>)}
        {state.events.length > 0 && (
          <p className="chain" style={{ marginTop: 10 }}>
            head: {state.events[state.events.length - 1]!.hash}
          </p>
        )}
      </div>

      <h2>Event types recorded</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>type</th><th>count</th></tr></thead>
          <tbody>
            {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <tr key={t}><td className="mono">{t}</td><td className="num">{n}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Full history</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>#</th><th>timestamp</th><th>type</th><th>actor</th><th>hash</th></tr></thead>
          <tbody>
            {[...state.events].reverse().map((e) => (
              <tr key={e.id}>
                <td className="num">{e.seq}</td>
                <td className="num">{e.timestamp.replace('T', ' ').slice(0, 19)}</td>
                <td className="mono">{e.payload.type}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{actorLabel(e.actor)}</td>
                <td className="chain">{e.hash.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
