/** The research material, and exactly how far it can be trusted. §87, §90, §95 */
import { readState } from '../../lab/runtime';

export const dynamic = 'force-dynamic';

export default async function CorpusPage() {
  const state = await readState();
  return (
    <>
      <h2>Research material</h2>
      {state.corpora.length === 0 && <div className="panel"><p className="note">No corpus has been admitted.</p></div>}
      {state.corpora.map((c) => (
        <div key={c.id}>
          <div className="panel">
            <div className="row">
              <h3>{c.title}</h3>
              <span className={`badge ${c.sourceVerification === 'VERIFIED_AGAINST_EDITION' ? 'b-ok' : 'b-fail'}`}>
                {c.sourceVerification.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="note" style={{ marginTop: 8 }}>{c.sourceStatement}</p>
            <p className="note" style={{ color: 'var(--dim)' }}>
              <span className="mono">{c.loci.length} loci · {c.language}/{c.script} · data version {c.dataVersion}</span>
            </p>
          </div>

          <div className="panel scroll">
            <table>
              <thead><tr><th>ref</th><th>text</th><th>words</th></tr></thead>
              <tbody>
                {c.loci.map((l) => (
                  <tr key={l.id}>
                    <td className="num"><a href={`/provenance/${l.id}`}>{l.ref}</a></td>
                    <td className="arabic">{l.text}</td>
                    <td className="num">{l.words.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
