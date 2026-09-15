/** Dispatches: written accounts of method, drawn from real work in the laboratory. */
import { Band } from '../ui';

export const metadata = {
  title: 'Dispatches — Abed Kadaan',
  description: 'Written accounts of method, drawn from real work in the laboratory.',
};

const DISPATCHES = [
  {
    no: '01',
    href: '/dispatches/the-result-that-wasnt',
    title: 'The result that was not there',
    dek: 'A clustering score of 0.585 at p = 0.002. Textbook significant. It was an artefact, and the thing that caught it was a corpus built to contain nothing at all.',
    tag: 'Method · Null models',
  },
];

export default function Dispatches() {
  return (
    <>
      <div className="cover">
        <span className="kicker">Dispatches</span>
        <h1 className="headline headline--sm">Accounts of method, including the ones that go badly.</h1>
        <p className="dek">
          Written from work that actually ran in the laboratory on this site. The figures in each piece are computed
          when you open it, so an argument that stops being true stops being printed.
        </p>
      </div>

      <hr className="rule-heavy" />

      <ul className="contents" style={{ marginTop: '0.5rem' }}>
        {DISPATCHES.map((d) => (
          <li key={d.href}>
            <a href={d.href}>
              <span className="no">{d.no}</span>
              <span>
                <h3>{d.title}</h3>
                <span className="what">{d.dek}</span>
                <span className="for">{d.tag}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Band label="On the count">
        <div className="column">
          <p className="note">
            One dispatch. There is no archive of back issues, because there has been one laboratory failure worth
            writing up and it would be strange to pad the list.
          </p>
        </div>
      </Band>
    </>
  );
}
