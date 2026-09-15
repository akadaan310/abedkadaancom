/** The practice: ten services, set as a contents page. */
import { SERVICES } from '../services';
import { Band } from '../ui';

export const metadata = {
  title: 'Practice — Abed Kadaan',
  description: 'Ten services in computational intelligence: measurement, validation, evidence architecture, and communication that survives time.',
};

export default function Practice() {
  return (
    <>
      <div className="cover">
        <span className="kicker">The practice · Ten services</span>
        <h1 className="headline headline--sm">
          Independent computational intelligence, sold as instruments rather than opinions.
        </h1>
        <p className="dek">
          Each service below is grounded in a working system on this site, and each one states what it is not.
          A practice whose argument is that it does not overclaim cannot open by overclaiming.
        </p>
      </div>

      <hr className="rule-heavy" />

      <ul className="contents" style={{ marginTop: '0.5rem' }}>
        {SERVICES.map((s) => (
          <li key={s.slug}>
            <a href={`/practice/${s.slug}`}>
              <span className="no">{s.no}</span>
              <span>
                <h3>{s.name}</h3>
                <span className="what">{s.dek}</span>
                <span className="for">For · {s.forWhom}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Band label="How an engagement starts">
        <div className="column">
          <p className="note">
            A short written exchange about the question, what evidence exists, and what decision depends on it. If the
            work is not something I should take — because an existing method already answers it, or because the
            evidence cannot bear the decision — that is the answer you get, and it costs nothing.
          </p>
          <p className="note">
            Scope, deliverable and the criteria for success are agreed in writing before work begins, for the same
            reason an instrument declares its criteria before it runs.
          </p>
        </div>
        <div className="signoff">
          <p className="note tight">
            <strong>Contact.</strong> Replace this line with the address or form you want enquiries to reach.
          </p>
          <p className="note">
            Left deliberately blank rather than filled with a placeholder that might reach nobody.
          </p>
        </div>
      </Band>
    </>
  );
}
