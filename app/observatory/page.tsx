/**
 * The Observatory: the laboratory in its present state. §3, §17, §54, §57.
 *
 * Everything here is read from the ledger. If the laboratory has computed nothing, the
 * page says so rather than filling the space.
 */
import { readState } from '../../lab/runtime';
import { verifyChain } from '../../lab/ledger/events';
import { Band, EpistemicTag, Figure, StatusTag, Tag, actorLabel, fmt } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Observatory() {
  const state = await readState();
  const chain = verifyChain(state.events);
  const m = state.metrics;

  if (state.events.length === 0) {
    return (
      <Band label="Observatory">
        <div className="column">
          <p className="lede">The ledger is empty.</p>
          <p className="note">
            No corpus has been admitted and nothing has been computed. Run <span className="mono">npm run lab:seed</span>,
            then <span className="mono">npm run lab:tick</span>. This page shows what the laboratory actually did, and
            nothing else.
          </p>
        </div>
      </Band>
    );
  }

  const recent = [...state.events].reverse().slice(0, 18);
  const withNull = state.measurements.filter((x) => x.nullModel);

  return (
    <>
      <Band label="Observatory">
        <div className="column">
          <p className="lede">{state.programme?.statement}</p>
        </div>
      </Band>

      <Band label="Present state">
        <div className="figures">
          <Figure value={state.engines.length} label="instruments composed" />
          <Figure value={m.enginesRun} label="executions" />
          <Figure value={`${m.enginesPassed}/${m.enginesRun}`} label="met their criteria" />
          <Figure value={withNull.length} label="tested against a null" />
          <Figure value={m.measurementsExceedingNull} label="exceeded their null" />
          <Figure value={state.frontier.filter((f) => f.state !== 'CLOSED').length} label="open frontier items" />
        </div>
      </Band>

      <Band label="Instruments" count={`${state.engines.length}`}>
        {state.engines.map((rec) => (
          <article className="record" key={rec.engine.id}>
            <div className="record-head">
              <StatusTag status={rec.engine.status} />
              {rec.engine.challenges && <Tag tone="quiet">challenger</Tag>}
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                {rec.passes}/{rec.runs} met criteria
              </span>
            </div>
            <h3 className="record-title">
              <a href={`/engines/${rec.engine.id}`}>{rec.engine.name}</a>
            </h3>
            <div className="record-meta">{rec.engine.steps.map((s) => s.capability).join(' → ')}</div>
            <div className="record-meta">composed by {actorLabel(rec.engine.provenance.creator)}</div>
          </article>
        ))}
      </Band>

      <Band label="Research activity" count={`${m.events} events`}>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>time</th><th>event</th><th>actor</th><th>what</th></tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id}>
                  <td className="num" style={{ color: 'var(--faint)' }}>{e.timestamp.slice(11, 19)}</td>
                  <td className="mono">{e.payload.type}</td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>{actorLabel(e.actor)}</td>
                  <td>{describe(e.payload)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: '1rem' }}>
          Chain {chain.intact ? 'intact' : <strong style={{ color: 'var(--stamp)' }}>BROKEN — {chain.problems[0]}</strong>}.{' '}
          <a href="/ledger">The full ledger →</a>
        </p>
      </Band>

      <Band label="Is the discovery process producing anything">
        <div className="column">
          <p className="note">
            §47 requires that self-discovery be measured rather than assumed. These are the laboratory's own numbers
            about itself.
          </p>
        </div>
        <div className="figures" style={{ marginTop: '1.5rem' }}>
          <Figure value={`${(m.proposalYield * 100).toFixed(0)}%`} label="proposals that became instruments" />
          <Figure value={`${(m.discoveryYield * 100).toFixed(0)}%`} label="runs yielding a finding" />
          <Figure value={m.challengesRun} label="challenges run" />
          <Figure value={m.capabilityReuse} label="capabilities reused" />
          <Figure value={fmt(m.costUnitsSpent, 1)} label="cost units spent" />
          <Figure value={m.researcherAcceptances} label="researcher acceptances" />
        </div>
      </Band>

      {state.hypotheses.length > 0 && (
        <Band label="Hypotheses" count={`${state.hypotheses.length}`}>
          {state.hypotheses.map((h) => (
            <article className="record" key={h.id}>
              <div className="record-head">
                <EpistemicTag type={h.epistemicType} />
                <Tag tone="quiet">{h.state}</Tag>
                <span className="spacer" />
                <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                  {h.challengeCount} challenge{h.challengeCount === 1 ? '' : 's'}
                </span>
              </div>
              {h.statement}
              <div className="record-meta">proposed by {actorLabel(h.proposedBy)}</div>
            </article>
          ))}
        </Band>
      )}
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
