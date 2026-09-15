/** Self-description: what can be computed, on what terms, and what cannot. §66, §89, §90 */
import { buildRegistry, readState, router } from '../../lab/runtime';
import { DECLARED_ABSENCES } from '../../lab/capabilities/registry';
import { ROLES } from '../../lab/nano/roles';
import { Band, Tag } from '../ui';

export const dynamic = 'force-dynamic';

export default async function Capabilities() {
  const registry = buildRegistry();
  const state = await readState();
  const usage = state.metrics.capabilityUsage;
  const providers = router().describe();
  const transforms = registry.all().filter((c) => c.transform);

  return (
    <>
      <Band label="Capabilities" count={`${registry.names().length} registered`}>
        <div className="column">
          <p className="lede">Every computation this laboratory can perform.</p>
          <p className="note">
            A proposal naming anything not on this list is rejected before it runs. This is the register an agent
            reads to find out what it may actually ask for, rather than inventing a tool that does not exist.
          </p>
        </div>
        <div className="scroll" style={{ marginTop: '1.75rem' }}>
          <table>
            <thead><tr><th>capability</th><th>consumes → produces</th><th>cost</th><th>used</th></tr></thead>
            <tbody>
              {registry.all().map((c) => (
                <tr key={c.name}>
                  <td>
                    <span className="mono">{c.name}</span>
                    <div className="note tight" style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>{c.purpose}</div>
                  </td>
                  <td className="mono" style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {c.inputs.join(', ') || '—'} → {c.output}
                  </td>
                  <td className="num">{c.costUnits}</td>
                  <td className="num">{usage[c.name] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>

      <Band label="Transformations and their information loss" count={`${transforms.length}`}>
        <div className="column">
          <p className="note">
            Every transformation declares what it preserves, what it discards, and whether it is reversible. Those
            declarations are checked by the test suite, not taken on trust.
          </p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {transforms.map((c) => (
            <article className="record" key={c.name}>
              <div className="record-head">
                <Tag tone={c.transform!.invertibility === 'INVERTIBLE' ? 'ink' : 'quiet'}>{c.transform!.invertibility}</Tag>
                <span className="spacer" />
                <span className="mono" style={{ color: 'var(--faint)' }}>{c.name}</span>
              </div>
              <p className="note tight"><strong>Preserves.</strong> {c.transform!.preserves.join(', ')}</p>
              <p className="note tight"><strong>Discards.</strong> {c.transform!.discards.join(', ') || 'nothing'}</p>
              {c.transform!.conditions.map((cond, i) => <p className="guard" key={i}>{cond}</p>)}
            </article>
          ))}
        </div>
      </Band>

      <Band label="Roles" count={`${ROLES.length}`}>
        <div className="column">
          <p className="note">
            Roles are contracts, not models. Each may request only certain operations and claim only certain kinds of
            statement; a proposal that violates its role is recorded as a violation rather than acted on.
          </p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {ROLES.map((r) => (
            <article className="record" key={r.name}>
              <div className="record-head">
                <span className="mono" style={{ letterSpacing: '0.08em' }}>{r.name}</span>
                <span className="spacer" />
                <Tag tone="quiet">{r.preferredTier}</Tag>
              </div>
              <p className="note tight">{r.capability}</p>
              <div className="record-meta">may request: {r.allowedOps.join(', ') || '(nothing)'}</div>
              <div className="record-meta">may claim: {r.permittedEpistemicTypes.join(', ')}</div>
            </article>
          ))}
        </div>
      </Band>

      <Band label="Model providers" count={`${providers.length}`}>
        <div className="column">
          <p className="note">The architecture depends on no single provider. This is what is configured right now.</p>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {providers.map((p) => (
            <article className="record" key={p.name}>
              <div className="record-head">
                <span className="mono">{p.name}</span>
                <Tag tone="quiet">{p.deterministic ? 'deterministic' : 'stochastic'}</Tag>
              </div>
              <p className="note tight">{p.description}</p>
            </article>
          ))}
        </div>
      </Band>

      <Band label="Declared absent" count={`${DECLARED_ABSENCES.length}`}>
        <div className="column">
          <p className="note">
            Published with a reason rather than stubbed, so that nothing can claim a capability that does not exist.
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
