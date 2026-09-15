/** Self-description. §66, §89 — what the laboratory can do, and what it declares it cannot. */
import { buildRegistry, readState, router } from '../../lab/runtime';
import { DECLARED_ABSENCES } from '../../lab/capabilities/registry';
import { ROLES } from '../../lab/nano/roles';

export const dynamic = 'force-dynamic';

export default async function Capabilities() {
  const registry = buildRegistry();
  const state = await readState();
  const usage = state.metrics.capabilityUsage;
  const providers = router().describe();

  return (
    <>
      <h2>Capabilities</h2>
      <p className="note">
        Every computation the laboratory can perform, with its cost and how often engines have used it. A proposal
        naming anything not on this list is rejected before it runs.
      </p>

      <div className="panel scroll">
        <table>
          <thead><tr><th>capability</th><th>consumes → produces</th><th>cost</th><th>used</th></tr></thead>
          <tbody>
            {registry.all().map((c) => (
              <tr key={c.name}>
                <td>
                  <span className="mono">{c.name}</span>
                  <div className="note" style={{ fontSize: 12.5, marginTop: 3 }}>{c.purpose}</div>
                  {c.transform && (
                    <div className="note" style={{ fontSize: 12.5, marginTop: 4, color: 'var(--dim)' }}>
                      declares <strong>{c.transform.invertibility}</strong> · discards: {c.transform.discards.join(', ') || 'nothing'}
                    </div>
                  )}
                </td>
                <td className="mono" style={{ color: 'var(--muted)' }}>{c.inputs.join(', ') || '—'} → {c.output}</td>
                <td className="num">{c.costUnits}</td>
                <td className="num">{usage[c.name] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Transformations and their information loss</h2>
      <p className="note">
        §13 requires every transformation to declare what it preserves and discards, and requires those claims to be
        testable. The invertibility claims below are checked by the test suite, not taken on trust.
      </p>
      {registry.all().filter((c) => c.transform).map((c) => (
        <div className="panel" key={`t-${c.name}`}>
          <div className="row">
            <h3 className="mono">{c.name}</h3>
            <span className={`badge ${c.transform!.invertibility === 'INVERTIBLE' ? 'b-ok' : 'b-unresolved'}`}>
              {c.transform!.invertibility}
            </span>
          </div>
          <p className="note" style={{ marginTop: 6 }}>
            <strong>Preserves:</strong> {c.transform!.preserves.join(', ')}<br />
            <strong>Discards:</strong> {c.transform!.discards.join(', ') || 'nothing'}
          </p>
          {c.transform!.conditions.map((cond, i) => <p className="guard" key={i}>{cond}</p>)}
        </div>
      ))}

      <h2>Nano-LLM roles</h2>
      <p className="note">
        Roles are contracts, not models. Each may only request certain operations and may only claim certain epistemic
        types; a proposal violating its role is recorded as a violation rather than acted on.
      </p>
      {ROLES.map((r) => (
        <div className="panel" key={r.name}>
          <h3 className="mono">{r.name}</h3>
          <p className="note" style={{ marginTop: 4 }}>{r.capability}</p>
          <p className="note" style={{ color: 'var(--dim)' }}>
            may request: {r.allowedOps.join(', ') || '(nothing)'} · may claim: {r.permittedEpistemicTypes.join(', ')} · tier: {r.preferredTier}
          </p>
        </div>
      ))}

      <h2>Model providers</h2>
      <p className="note">
        The architecture does not depend on any one provider. This is what is actually configured right now.
      </p>
      {providers.map((p) => (
        <div className="panel" key={p.name}>
          <div className="row">
            <h3 className="mono">{p.name}</h3>
            <span className={`badge ${p.deterministic ? 'b-ok' : 'b-ai'}`}>{p.deterministic ? 'deterministic' : 'stochastic'}</span>
          </div>
          <p className="note" style={{ marginTop: 6 }}>{p.description}</p>
        </div>
      ))}

      <h2>Declared absences</h2>
      {DECLARED_ABSENCES.map((a) => (
        <div className="panel" key={a.name}>
          <div className="row"><h3 className="mono">{a.name}</h3><span className="badge b-fail">{a.reason.replace(/_/g, ' ')}</span></div>
          <p className="note" style={{ marginTop: 6 }}>{a.detail}</p>
        </div>
      ))}
    </>
  );
}
