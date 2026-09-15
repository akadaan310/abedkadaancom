/**
 * The front door.
 *
 * Quiet by intent. It establishes what the laboratory is, what it currently knows, what
 * it does not know, and where a visitor enters the machinery — and nothing else. Every
 * figure is read from the ledger; §57 forbids manufacturing activity to look alive.
 */
import { readState, buildRegistry } from '../lab/runtime';
import { DECLARED_ABSENCES } from '../lab/capabilities/registry';
import { verifyChain } from '../lab/ledger/events';
import { Band, Tag } from './ui';

export const dynamic = 'force-dynamic';

export default async function FrontDoor() {
  const state = await readState();
  const registry = buildRegistry();
  const chain = verifyChain(state.events);

  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');
  const openFrontier = state.frontier.filter((f) => f.state !== 'CLOSED');
  const testedAgainstNull = state.measurements.filter((m) => m.nullModel);
  const unverified = state.corpora.filter((c) => c.sourceVerification !== 'VERIFIED_AGAINST_EDITION');

  const entries: [string, string, string][] = [
    ['/observatory', 'Observatory', 'The laboratory in its current state: activity, instruments, and what it measures about itself.'],
    ['/engines', 'Engines', 'Research instruments — why each was formed, what it was required to prove, what it ran.'],
    ['/findings', 'Findings', 'Measurements, separated by whether they exceeded a declared null model.'],
    ['/frontier', 'Frontier', 'What has not been done, what is blocked, and what this laboratory cannot compute.'],
    ['/capabilities', 'Capabilities', 'Every computation available, its contract, and the terms on which an agent may participate.'],
    ['/corpus', 'Corpus', 'The register of admitted research material and its verification status.'],
    ['/ledger', 'Ledger', 'The append-only hash-chained record of everything that happened.'],
    ['/constitution', 'Constitution', 'The document this laboratory was built from, and how to read what it reports.'],
  ];
  const counts: Record<string, string> = {
    '/observatory': `${state.metrics.events} events`,
    '/engines': `${state.engines.length}`,
    '/findings': `${state.measurements.length}`,
    '/frontier': `${openFrontier.length} open`,
    '/capabilities': `${registry.names().length}`,
    '/corpus': `${state.corpora.length}`,
    '/ledger': chain.intact ? 'intact' : 'BROKEN',
    '/constitution': '100 §',
  };

  return (
    <>
      <div style={{ paddingTop: '4rem' }}>
        <p className="display column">
          A computational laboratory for constructing, measuring, challenging, and preserving research instruments.
        </p>
      </div>

      <Band label="What the laboratory knows">
        <div className="column">
          {supported.length === 0 ? (
            <>
              <p className="lede">Nothing yet.</p>
              <p className="note">
                {state.metrics.enginesRun === 0
                  ? 'No instrument has been executed, so there is nothing to report.'
                  : `${state.metrics.enginesRun} instruments have run and ${testedAgainstNull.length} measurements have been ` +
                    'tested against a declared null model. None has exceeded it. On this material, the relations ' +
                    'computed so far do not produce structure beyond what chance explains.'}
              </p>
              <p className="note">
                That is a result, and it is kept as one. A laboratory that always has an answer is not a sophisticated
                laboratory; one that represents the boundary of what it knows is.
              </p>
            </>
          ) : (
            <ul className="index">
              {supported.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <div className="record-head">
                    <Tag tone="ink">{d.epistemicType.replace(/_/g, ' ')}</Tag>
                    <span className="spacer" />
                    <a className="mono plain" href={`/provenance/${d.id}`}>trace →</a>
                  </div>
                  {d.statement}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Band>

      <Band label="What it does not know">
        <div className="column">
          <ul className="index">
            {openFrontier.slice(0, 4).map((f) => (
              <li key={f.id}>
                <div className="record-head">
                  <Tag tone={f.state === 'AWAITING_RESEARCHER' || f.state === 'AWAITING_CAPABILITY' ? 'stamp' : 'quiet'}>
                    {f.state.replace(/_/g, ' ')}
                  </Tag>
                </div>
                {f.subject}
              </li>
            ))}
          </ul>
          <p className="note" style={{ marginTop: '1.25rem' }}>
            {DECLARED_ABSENCES.length} capabilities are declared absent with a stated reason rather than stubbed, so
            that no process can invent one. <a href="/frontier">The whole frontier →</a>
          </p>
        </div>
      </Band>

      {unverified.length > 0 && (
        <Band label="Standing caution">
          <div className="column">
            <div className="stamp">
              <span className="stamp-label">Source not verified</span>
              {unverified.length === 1
                ? `The corpus ${unverified[0]!.slug} is admitted as an unverified transcription.`
                : `${unverified.length} admitted corpora are unverified transcriptions.`}{' '}
              Instruments may compute over such material, but no result resting on it can be promoted to canonical or
              published until a human researcher verifies the text against a named edition. That gate is enforced in
              code. <a href="/corpus">The corpus register →</a>
            </div>
          </div>
        </Band>
      )}

      <Band label="Enter the machinery">
        <ul className="entries">
          {entries.map(([href, name, what]) => (
            <li key={href}>
              <a href={href}>
                <span className="entry-name">{name}</span>
                <span className="entry-what">{what}</span>
                <span className="entry-count">{counts[href]}</span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <div className="colophon" style={{ marginTop: '3.5rem', borderTop: 'none' }}>
        <div className="state-line" style={{ marginTop: 0 }}>
          {state.metrics.events} ledger events · chain {chain.intact ? 'intact' : 'BROKEN'} ·{' '}
          {registry.names().length} capabilities · {state.engines.length} instruments ·{' '}
          {state.metrics.enginesRun} runs · {supported.length} supported findings
          {state.lastEventAt ? ` · last activity ${state.lastEventAt.replace('T', ' ').slice(0, 19)}Z` : ''}
        </div>
      </div>
    </>
  );
}
