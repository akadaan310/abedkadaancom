/**
 * The corpus register. §1 (research material), §87, §90, §95.
 *
 * The laboratory holds research material; it is not identified with any one corpus. This
 * page is the register of what has been admitted and how far each source can be trusted.
 */
import { readState } from '../../lab/runtime';
import { Band, Tag } from '../ui';

export const dynamic = 'force-dynamic';

export default async function CorpusRegister() {
  const state = await readState();
  const unverified = state.corpora.filter((c) => c.sourceVerification !== 'VERIFIED_AGAINST_EDITION');

  return (
    <>
      <Band label="Corpus register" count={`${state.corpora.length} admitted`}>
        <div className="column">
          <p className="lede">Material admitted to the laboratory, and how far each source can be trusted.</p>
          <p className="note">
            Admitting a corpus does not endorse it. Each carries a verification status that governs what may be done
            with results computed from it, and only a human researcher can change that status.
          </p>
        </div>

        <div style={{ marginTop: '1.75rem' }}>
          {state.corpora.length === 0 && <p className="note">No corpus has been admitted.</p>}
          {state.corpora.map((c) => (
            <article className="record" key={c.id}>
              <div className="record-head">
                <Tag tone={c.sourceVerification === 'VERIFIED_AGAINST_EDITION' ? 'ink' : 'stamp'}>
                  {c.sourceVerification.replace(/_/g, ' ')}
                </Tag>
                <span className="spacer" />
                <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                  {c.loci.length} loci · {c.language}/{c.script}
                </span>
              </div>
              <h3 className="record-title"><a href={`/corpus/${c.slug}`}>{c.title}</a></h3>
              <p className="note tight" style={{ marginTop: '0.4rem' }}>{c.sourceStatement}</p>
              <div className="record-meta">
                <span className="mono">{c.slug}</span> · data version {c.dataVersion}
              </div>
            </article>
          ))}
        </div>
      </Band>

      {unverified.length > 0 && (
        <Band label="What an unverified status means">
          <div className="column">
            <div className="stamp">
              <span className="stamp-label">Standing restriction</span>
              Instruments may compute over unverified material, and those results are published with the rest. But the
              promotion gate refuses to mark any result resting on it as canonical, and the auditor raises it as a
              warning on every instrument that reads it. Only a human researcher, having checked the text against a
              named edition, can lift that restriction.
            </div>
          </div>
        </Band>
      )}

      <Band label="Material that is not admitted">
        <div className="column">
          <p className="note">
            The laboratory also constructs synthetic corpora with known ground truth. These are method-testing
            instruments — a positive control containing planted structure the engines should find, and a negative
            control containing none, which they must not. They are marked <span className="mono">SYNTHETIC</span>, are
            never admitted as research material, and no finding is ever computed from them. They exist to check that
            the instruments can tell the difference.
          </p>
        </div>
      </Band>
    </>
  );
}
