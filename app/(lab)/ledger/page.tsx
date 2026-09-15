/** The ledger: the durable history, and proof it has not been rewritten. §22, §64, §86 */
import { readState } from '../../../lab/runtime';
import { verifyChain } from '../../../lab/ledger/events';
import { Band, Tag, actorLabel } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function Ledger() {
  const state = await readState();
  const chain = verifyChain(state.events);
  const counts = new Map<string, number>();
  for (const e of state.events) counts.set(e.payload.type, (counts.get(e.payload.type) ?? 0) + 1);

  return (
    <>
      <Band label="Ledger" count={`${state.events.length} events`}>
        <div className="column">
          <p className="lede">Append-only, and hash-chained.</p>
          <p className="note">
            Each event's hash covers its own content and its predecessor's hash, so altering any past event
            invalidates every event after it. This is how <em>AI must not overwrite canonical research state</em> is
            enforced structurally rather than by convention: there is no update path at all. Correcting a mistake means
            appending a correction, not editing the original. The mistake stays visible.
          </p>
        </div>
        <div className="record-head" style={{ marginTop: '1.5rem' }}>
          <Tag tone={chain.intact ? 'ink' : 'stamp'}>{chain.intact ? 'chain intact' : 'chain broken'}</Tag>
          <span className="spacer" />
          <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{chain.checked} events verified</span>
        </div>
        {chain.problems.map((p, i) => <p className="guard" key={i} style={{ color: 'var(--stamp)' }}>{p}</p>)}
        {state.events.length > 0 && (
          <div className="chain-line" style={{ marginTop: '0.75rem' }}>
            head · {state.events[state.events.length - 1]!.hash}
          </div>
        )}
      </Band>

      <Band label="Event types recorded" count={`${counts.size}`}>
        <div className="scroll">
          <table>
            <thead><tr><th>type</th><th>count</th></tr></thead>
            <tbody>
              {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <tr key={t}><td className="mono">{t}</td><td className="num">{n}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>

      <Band label="Full history">
        <div className="scroll">
          <table>
            <thead><tr><th>#</th><th>timestamp</th><th>type</th><th>actor</th><th>hash</th></tr></thead>
            <tbody>
              {[...state.events].reverse().map((e) => (
                <tr key={e.id}>
                  <td className="num" style={{ color: 'var(--faint)' }}>{e.seq}</td>
                  <td className="num">{e.timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td className="mono">{e.payload.type}</td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{actorLabel(e.actor)}</td>
                  <td className="id">{e.hash.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>
    </>
  );
}
