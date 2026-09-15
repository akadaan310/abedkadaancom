/** The laboratory index: the records, and what each one holds. */
import { readState, buildRegistry } from '../../lab/runtime';
import { DECLARED_ABSENCES } from '../../lab/capabilities/registry';
import { verifyChain } from '../../lab/ledger/events';
import { Band, Figure } from '../ui';

export const dynamic = 'force-dynamic';

export default async function LaboratoryIndex() {
  const state = await readState();
  const registry = buildRegistry();
  const chain = verifyChain(state.events);
  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');
  const withNull = state.measurements.filter((m) => m.nullModel);

  const records: [string, string, string, string][] = [
    ['01', '/observatory', 'Observatory', 'The laboratory in its present state: activity, instruments, and what it measures about itself.'],
    ['02', '/engines', 'Engines', 'Every instrument — why it formed, what it was required to prove, and what it ran.'],
    ['03', '/findings', 'Findings', 'Measurements, separated by whether they exceeded a declared null model.'],
    ['04', '/frontier', 'Frontier', 'What has not been done, what is blocked, and what this laboratory cannot compute.'],
    ['05', '/capabilities', 'Capabilities', 'Every available computation, its contract, and the terms on which an agent may participate.'],
    ['06', '/corpus', 'Corpus', 'The register of admitted research material and its verification status.'],
    ['07', '/ledger', 'Ledger', 'The append-only, hash-chained record of everything that happened.'],
  ];

  return (
    <>
      <div className="cover">
        <span className="kicker">The laboratory · Working system</span>
        <h1 className="headline headline--sm">
          Not a case study. A running laboratory you can audit line by line.
        </h1>
        <p className="dek">
          It proposes its own instruments, computes them, tests them against chance, attacks its own results, and
          records the failures. Every figure below is read live from its ledger.
        </p>
      </div>

      <hr className="rule-heavy" />

      <div className="figures" style={{ margin: '2rem 0 0' }}>
        <Figure value={state.engines.length} label="instruments" />
        <Figure value={state.metrics.enginesRun} label="executions" />
        <Figure value={withNull.length} label="tested against a null" />
        <Figure value={supported.length} label="supported findings" />
        <Figure value={registry.names().length} label="capabilities" />
        <Figure value={DECLARED_ABSENCES.length} label="declared absent" />
      </div>

      <p className="note" style={{ marginTop: '1.5rem', maxWidth: '44rem' }}>
        {supported.length === 0
          ? 'Zero supported findings is the honest current state, and the laboratory reports it on its own front page. An instrument that always finds something is broken.'
          : `${supported.length} finding(s) currently exceed their null model, each published with the null used and a written statement of what it does not license.`}{' '}
        Ledger chain {chain.intact ? 'intact' : 'BROKEN'} across {state.metrics.events} events.
      </p>

      <Band label="The records">
        <ul className="contents">
          {records.map(([no, href, name, what]) => (
            <li key={href}>
              <a href={href}>
                <span className="no">{no}</span>
                <span>
                  <h3>{name}</h3>
                  <span className="what">{what}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <Band label="For machines">
        <div className="column">
          <p className="note">
            Two endpoints, vendor-neutral. <a href="/api/contract">/api/contract</a> publishes the participation terms:
            the capability register, role contracts, the proposal schema, and the rules that cause output to be
            rejected. <a href="/api/state">/api/state</a> publishes current research state.
          </p>
        </div>
      </Band>
    </>
  );
}
