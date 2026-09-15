/** The frontier: what has not been done, and what cannot be. §46, §56, §75, §90 */
import { readState } from '../../lab/runtime';
import { rankFrontier, utility } from '../../lab/frontier/frontier';
import { DECLARED_ABSENCES } from '../../lab/capabilities/registry';
import { Band, Tag, fmt } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Frontier() {
  const state = await readState();
  const open = state.frontier.filter((f) => f.state !== 'CLOSED');
  const ranked = rankFrontier(state.frontier);
  const blocked = open.filter((f) => f.state === 'AWAITING_CAPABILITY' || f.state === 'AWAITING_RESEARCHER');

  return (
    <>
      <Band label="Frontier">
        <div className="column">
          <p className="lede">What the laboratory knows it has not done.</p>
          <p className="note">
            Items are ranked by expected information gain × research priority × novelty ÷ cost, so the laboratory can
            say <em>interesting but expensive</em> and defer, rather than spending indiscriminately.
          </p>
        </div>
      </Band>

      <Band label="Actionable now" count={`${ranked.length}`}>
        {ranked.length === 0 && <p className="note">Nothing is actionable: every item is blocked or closed.</p>}
        {ranked.map((f) => (
          <article className="record" key={f.id}>
            <div className="record-head">
              <Tag tone="quiet">{f.itemKind.replace(/_/g, ' ')}</Tag>
              <Tag tone="quiet">{f.state.replace(/_/g, ' ')}</Tag>
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                cost {f.costEstimate} · utility {fmt(utility(f), 4)}
              </span>
            </div>
            <h3 className="record-title">{f.subject}</h3>
            <p className="note tight" style={{ marginTop: '0.4rem' }}>{f.reason}</p>
          </article>
        ))}
      </Band>

      <Band label="Blocked" count={`${blocked.length}`}>
        <div className="column">
          <p className="note">Waiting on a capability the laboratory does not have, or on the researcher. Not forgotten.</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {blocked.map((f) => (
            <article className="record" key={f.id}>
              <div className="record-head"><Tag tone="stamp">{f.state.replace(/_/g, ' ')}</Tag></div>
              <h3 className="record-title">{f.subject}</h3>
              <p className="note tight" style={{ marginTop: '0.4rem' }}>{f.reason}</p>
            </article>
          ))}
        </div>
      </Band>

      <Band label="What this laboratory cannot do" count={`${DECLARED_ABSENCES.length}`}>
        <div className="column">
          <p className="note">
            Declared absences, published so that no process can invent a capability that does not exist.
          </p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {DECLARED_ABSENCES.map((a) => (
            <article className="record" key={a.name}>
              <div className="record-head">
                <Tag tone="stamp">{a.reason.replace(/_/g, ' ')}</Tag>
                <span className="spacer" />
                <span className="mono" style={{ color: 'var(--faint)' }}>{a.name}</span>
              </div>
              <p className="note tight">{a.detail}</p>
            </article>
          ))}
        </div>
      </Band>
    </>
  );
}
