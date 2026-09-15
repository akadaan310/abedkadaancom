/**
 * The cover.
 *
 * A publication, not a control panel. It states what the practice is, demonstrates it
 * live before asking for anything, lists the services, and offers a way in for each kind
 * of visitor. Every figure is read from the ledger; §57 forbids manufactured activity.
 */
import { readState, buildRegistry } from '../lab/runtime';
import { verifyChain } from '../lab/ledger/events';
import { demoFor } from '../lab/demo';
import { PROGRAMS } from '../lab/arcade/programs';
import { SERVICES } from './services';
import { GUESTS } from './guests';
import { Demo } from './demo';
import { Band } from './ui';

export const dynamic = 'force-dynamic';

export default async function Cover() {
  const state = await readState();
  const registry = buildRegistry();
  const chain = verifyChain(state.events);
  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');
  const withNull = state.measurements.filter((m) => m.nullModel);
  const flagship = demoFor('time-durable-communication');

  return (
    <>
      <div className="cover">
        <span className="kicker">Independent computational intelligence</span>
        <h1 className="headline">
          I build instruments that measure what has not been measured — then I try to break them.
        </h1>
        <p className="dek">
          Analytic tradecraft, engineering scale, and the method published in the open — failures included.
          The laboratory below is not a case study. It is running, and it currently reports nothing.
        </p>
        <div className="byline">
          <span>{SERVICES.length} services</span>
          <span>{PROGRAMS.length} free programs</span>
          <span>{state.engines.length} instruments built</span>
          <span>{supported.length} {supported.length === 1 ? 'finding' : 'findings'} claimed</span>
          <span>Ledger {chain.intact ? 'intact' : 'broken'}</span>
        </div>
      </div>

      {flagship && (
        <Demo
          service={flagship.service}
          title={flagship.title}
          ask={flagship.ask}
          usesModel={flagship.usesModel}
          input={flagship.input}
        />
      )}

      <Band label="The practice" count={`${SERVICES.length} services`}>
        <div className="column">
          <p className="note">
            Each carries a live demonstration you can run before speaking to anyone, and each states plainly what it
            is not.
          </p>
        </div>
        <ul className="contents" style={{ marginTop: '1.5rem' }}>
          {SERVICES.map((s) => (
            <li key={s.slug}>
              <a href={`/practice/${s.slug}`}>
                <span className="no">{s.no}</span>
                <span>
                  <h3>{s.name}</h3>
                  <span className="what">{s.dek}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <Band label="Free to take" count={`${PROGRAMS.length} programs`}>
        <div className="column">
          <p className="note">
            The <a href="/arcade">LLM Arcade</a> is a catalogue of programmable prompts that turn any model into a
            specific instrument — a game where you hunt the fatal flaw in a plausible finding, a reviewer that attacks
            your claim and scores which defences held, a contract that stops a model overclaiming. Each prompt is
            printed in full and costs nothing. Run them here, or take them and go.
          </p>
        </div>
        <ul className="contents" style={{ marginTop: '1.5rem' }}>
          {PROGRAMS.slice(0, 4).map((p) => (
            <li key={p.slug}>
              <a href={`/arcade/${p.slug}`}>
                <span className="no">{p.category === 'GAME' ? '▶' : p.category === 'INSTRUMENT' ? '⊟' : '§'}</span>
                <span>
                  <h3>{p.name}</h3>
                  <span className="what">{p.kicker}</span>
                </span>
              </a>
            </li>
          ))}
          <li>
            <a href="/arcade">
              <span className="no">—</span>
              <span>
                <h3>The whole catalogue</h3>
                <span className="what">All {PROGRAMS.length} programs, and SDK access for developers.</span>
              </span>
            </a>
          </li>
        </ul>
      </Band>

      <Band label="Dispatch">
        <ul className="contents">
          <li>
            <a href="/dispatches/the-result-that-wasnt">
              <span className="no">01</span>
              <span>
                <h3>The result that was not there</h3>
                <span className="what">
                  A clustering score of 0.585 at p = 0.002. Textbook significant. It was an artefact, and the thing
                  that caught it was a corpus built to contain nothing at all.
                </span>
                <span className="for">Method · Null models · Figures computed when you open it</span>
              </span>
            </a>
          </li>
        </ul>
      </Band>

      <Band label="The evidence">
        <div className="column">
          <p className="note">
            {supported.length === 0
              ? `A working laboratory, open to inspection: ${state.engines.length} instruments composed, ${state.metrics.enginesRun} executed, ${withNull.length} measurements tested against a declared null model, and zero findings claimed. An instrument that always finds something is broken; this one is built so that a zero is publishable.`
              : `${supported.length} ${supported.length === 1 ? 'measurement currently exceeds' : 'measurements currently exceed'} the null model declared for it, each published with that null and a written statement of what it does not license. Exceeding a null model is not the same as being true.`}
          </p>
          <p className="note">
            <a href="/laboratory">Enter the laboratory →</a>
          </p>
        </div>
      </Band>

      <Band label="Who is visiting">
        <div className="column">
          <p className="note">
            The same records, introduced differently. Choose how you would like to be shown around — the figures do
            not change, only what is put first.
          </p>
        </div>
        <ul className="entries" style={{ marginTop: '1.5rem' }}>
          {GUESTS.map((g) => (
            <li key={g.slug}>
              <a href={`/visit/${g.slug}`}>
                <span className="entry-name">{g.name}</span>
                <span className="entry-what">{g.who}</span>
                <span className="entry-count">→</span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <div className="colophon" style={{ marginTop: '3.5rem', borderTop: 'none' }}>
        <div className="state-line" style={{ marginTop: 0 }}>
          {state.metrics.events} ledger events · chain {chain.intact ? 'intact' : 'BROKEN'} ·{' '}
          {registry.names().length} capabilities · {state.engines.length} instruments ·{' '}
          {state.metrics.enginesRun} executions · {supported.length} supported findings
          {state.lastEventAt ? ` · last activity ${state.lastEventAt.replace('T', ' ').slice(0, 19)}Z` : ''}
        </div>
      </div>
    </>
  );
}
