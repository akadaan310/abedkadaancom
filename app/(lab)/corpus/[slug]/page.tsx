/** One admitted corpus. §38 (multi-scale), §87 (verification status travels with it). */
import { notFound } from 'next/navigation';
import { readState } from '../../../../lab/runtime';
import { Band, Tag } from '../../../ui';

export const dynamic = 'force-dynamic';

export default async function CorpusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await readState();
  const corpus = state.corpora.find((c) => c.slug === slug);
  if (!corpus) notFound();

  const verified = corpus.sourceVerification === 'VERIFIED_AGAINST_EDITION';
  const rtl = corpus.script === 'Arab';
  const tokens = corpus.loci.reduce((n, l) => n + l.words.length, 0);

  return (
    <>
      <Band label="Corpus">
        <div className="record-head">
          <Tag tone={verified ? 'ink' : 'stamp'}>{corpus.sourceVerification.replace(/_/g, ' ')}</Tag>
          <span className="spacer" />
          <span className="id">{corpus.id}</span>
        </div>
        <div className="column">
          <h1 className="record-title" style={{ fontSize: '1.4rem', margin: '0.5rem 0 0.75rem' }}>{corpus.title}</h1>
          <p className="note">{corpus.sourceStatement}</p>
        </div>
        <div className="record-meta">
          <span className="mono">{corpus.slug}</span> · data version {corpus.dataVersion} · {corpus.loci.length} loci ·{' '}
          {tokens} tokens · {corpus.language}/{corpus.script}
        </div>
      </Band>

      {!verified && (
        <Band label="Restriction">
          <div className="column">
            <div className="stamp">
              <span className="stamp-label">Not verified against an edition</span>
              Results computed from this material are published, but cannot be promoted to canonical or published as
              settled until a human researcher verifies the text against a named edition and records that decision.
              The gate is enforced in code, not left to discipline.
            </div>
          </div>
        </Band>
      )}

      <Band label="Loci" count={`${corpus.loci.length}`}>
        <div className="scroll">
          <table>
            <thead><tr><th style={{ width: '5rem' }}>ref</th><th>text</th><th style={{ width: '4rem' }}>words</th></tr></thead>
            <tbody>
              {corpus.loci.map((l) => (
                <tr key={l.id}>
                  <td className="num"><a href={`/provenance/${l.id}`}>{l.ref}</a></td>
                  <td className={rtl ? 'arabic' : ''} {...(rtl ? { dir: 'rtl' as const } : {})}>{l.text}</td>
                  <td className="num">{l.words.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Band>
    </>
  );
}
