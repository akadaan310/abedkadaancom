/**
 * The Observatory. §3, §17, §57.
 *
 * Everything below is read from the ledger. If the laboratory has computed nothing, this
 * page says so — it never manufactures activity to look alive.
 */
import { readState } from '../lab/runtime';
import { verifyChain } from '../lab/ledger/events';
import { EpistemicBadge, Stat, StatusBadge, actorLabel, fmt } from './ui';

export const dynamic = 'force-dynamic';

export default async function Observatory() {
  const state = await readState();
  const chain = verifyChain(state.events);
  const m = state.metrics;

  if (state.events.length === 0) {
    return (
      <>
        <h2>Observatory</h2>
        <div className="panel">
          <h3>The ledger is empty.</h3>
          <p className="note">
            No corpus has been admitted and nothing has been computed. Run <span className="mono">npm run lab:seed</span>{' '}
            and then <span className="mono">npm run lab:tick</span>. This page will show whatever the laboratory
            actually did, and nothing else.
          </p>
        </div>
      </>
    );
  }

  const unverified = state.corpora.filter((c) => c.sourceVerification !== 'VERIFIED_AGAINST_EDITION');
  const recent = [...state.events].reverse().slice(0, 14);
  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');
  const withNull = state.measurements.filter((x) => x.nullModel);

  return (
    <>
      <h2>Observatory</h2>
      <p className="lede">{state.programme?.statement}</p>

      {unverified.length > 0 && (
        <div className="warn">
          <strong>Source not yet verified.</strong> {unverified.map((c) => c.slug).join(', ')} is admitted as{' '}
          {unverified[0]!.sourceVerification.replace(/_/g, ' ').toLowerCase()}. Engines may compute over it, but no
          result resting on it can be promoted to canonical or published until a researcher checks the text against a
          named edition. <a href="/corpus">See the corpus.</a>
        </div>
      )}

      <div className="grid stats">
        <Stat n={m.enginesComposed} k="engines composed" />
        <Stat n={m.enginesRun} k="engines run" />
        <Stat n={`${m.enginesPassed}/${m.enginesRun}`} k="met their criteria" />
        <Stat n={withNull.length} k="measurements vs null" />
        <Stat n={m.measurementsExceedingNull} k="exceeded their null" />
        <Stat n={state.frontier.filter((f) => f.state !== 'CLOSED').length} k="open frontier items" />
      </div>

      <h2>What the laboratory currently holds</h2>
      <div className="grid two">
        <div className="panel">
          <h3>Supported findings</h3>
          {supported.length === 0 ? (
            <p className="note">
              Nothing has survived its null model yet. That is a result, not an absence of one: on this corpus the
              relations computed so far do not produce structure beyond chance.
            </p>
          ) : (
            <ul className="plain">
              {supported.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <div className="row">
                    <EpistemicBadge type={d.epistemicType} />
                    <a className="mono" href={`/provenance/${d.id}`}>trace</a>
                  </div>
                  <div style={{ marginTop: 4 }}>{d.statement}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="note" style={{ marginTop: 10 }}>
            <a href="/findings">All findings, with their interpretation guards →</a>
          </p>
        </div>

        <div className="panel">
          <h3>What remains unresolved</h3>
          <ul className="plain">
            {state.frontier
              .filter((f) => f.state !== 'CLOSED')
              .slice(0, 5)
              .map((f) => (
                <li key={f.id}>
                  <div className="row">
                    <span className="badge b-unresolved">{f.state.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ marginTop: 4 }}>{f.subject}</div>
                </li>
              ))}
          </ul>
          <p className="note" style={{ marginTop: 10 }}>
            <a href="/frontier">The whole frontier →</a>
          </p>
        </div>
      </div>

      <h2>Research activity</h2>
      <div className="panel scroll">
        <table>
          <thead>
            <tr><th>when</th><th>event</th><th>actor</th><th>what</th></tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id}>
                <td className="num">{e.timestamp.slice(11, 19)}</td>
                <td className="mono">{e.payload.type}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{actorLabel(e.actor)}</td>
                <td>{describe(e.payload)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Ledger: {m.events} events, hash chain{' '}
        {chain.intact ? 'intact' : <strong style={{ color: 'var(--fail)' }}>BROKEN — {chain.problems[0]}</strong>}.{' '}
        <a href="/ledger">Inspect the ledger →</a>
      </p>

      <h2>Is the AI discovering anything useful?</h2>
      <div className="panel">
        <p className="note">
          §47 of the constitution requires that self-discovery be measured rather than assumed. These are the
          laboratory's own numbers about itself.
        </p>
        <div className="grid stats" style={{ marginTop: 12 }}>
          <Stat n={`${(m.proposalYield * 100).toFixed(0)}%`} k="proposals that became engines" />
          <Stat n={`${(m.discoveryYield * 100).toFixed(0)}%`} k="runs yielding a finding" />
          <Stat n={m.challengesRun} k="challenges run" />
          <Stat n={m.capabilityReuse} k="capabilities reused" />
          <Stat n={fmt(m.costUnitsSpent, 1)} k="cost units spent" />
          <Stat n={m.researcherAcceptances} k="researcher acceptances" />
        </div>
      </div>

      <h2>Engines</h2>
      <div className="panel scroll">
        <table>
          <thead><tr><th>engine</th><th>status</th><th>runs</th><th>composed by</th></tr></thead>
          <tbody>
            {state.engines.slice(0, 8).map((e) => (
              <tr key={e.engine.id}>
                <td><a href={`/engines/${e.engine.id}`}>{e.engine.name}</a></td>
                <td><StatusBadge status={e.engine.status} /></td>
                <td className="num">{e.passes}/{e.runs}</td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{actorLabel(e.engine.provenance.creator)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function describe(p: { type: string } & Record<string, unknown>): string {
  switch (p.type) {
    case 'RESEARCH_STARTED': return `programme ${String(p['programme'])} opened`;
    case 'CORPUS_ADMITTED': return `corpus admitted: ${String((p['corpus'] as { slug: string }).slug)}`;
    case 'QUESTION_CREATED': return String(p['question']);
    case 'AI_OBSERVATION': return String(p['text']);
    case 'AI_PROPOSAL': return String((p['proposal'] as { summary: string }).summary);
    case 'HYPOTHESIS_PROPOSED': return String((p['hypothesis'] as { statement: string }).statement);
    case 'ENGINE_COMPOSED': return `composed ${String((p['engine'] as { name: string }).name)}`;
    case 'ENGINE_AUDITED': return `audit ${p['passed'] ? 'passed' : 'found problems'}`;
    case 'EXPERIMENT_QUEUED': return `queued: ${String((p['experiment'] as { question: string }).question)}`;
    case 'ENGINE_STARTED': return 'execution started';
    case 'ENGINE_COMPLETED': {
      const r = p['result'] as { evaluation: { passed: boolean }; measurements: unknown[] };
      return `completed, ${r.measurements.length} measurement(s), criteria ${r.evaluation.passed ? 'met' : 'not met'}`;
    }
    case 'ENGINE_FAILED': return `failed: ${String((p['result'] as { failure?: { reason: string } }).failure?.reason ?? '')}`;
    case 'DISCOVERY_RECORDED': return String((p['discovery'] as { statement: string }).statement);
    case 'HYPOTHESIS_CHALLENGED': return `hypothesis ${p['survived'] ? 'survived' : 'did not survive'} challenge`;
    case 'FRONTIER_ITEM_ADDED': return `frontier: ${String((p['item'] as { subject: string }).subject)}`;
    case 'FRONTIER_ITEM_CLAIMED': return 'frontier item claimed';
    case 'FRONTIER_ITEM_CLOSED': return `frontier item closed (${String(p['outcome'])})`;
    case 'CAPABILITY_GAP_DECLARED': return `capability gap: ${String((p['absence'] as { name: string }).name)}`;
    case 'BUDGET_EXHAUSTED': return `budget ${String(p['budget'])} exhausted`;
    default: return p.type;
  }
}
