/**
 * A dispatch: the narrative of a real failure in this laboratory.
 *
 * The exhibit is computed when this page is requested, using the same capabilities the
 * laboratory uses — not quoted from a previous run. If the instruments change, the
 * article's own numbers change with them, and the argument either survives or does not.
 */
import { buildRegistry } from '../../../lab/runtime';
import { synthesizeCorpus, loadCorpusDirectory } from '../../../lab/corpus/loader';
import { computeContext, type LabValue } from '../../../lab/capabilities/kernel';
import { CORPUS_DIR } from '../../../lab/runtime';
import { Band, fmt } from '../../ui';
import type { Corpus, Measurement } from '../../../lab/ontology/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'The result that was not there — Abed Kadaan',
  description: 'A significant-looking finding, a circular null model, and the control that caught it.',
};

/** Run the structure pipeline over one corpus and return its modularity measurements. */
function measure(corpus: Corpus, seed = 42): { primary?: Measurement; control?: Measurement; nondegeneracy?: Measurement } {
  const registry = buildRegistry();
  const ctx = computeContext({
    now: new Date().toISOString(),
    actor: { kind: 'ENGINE', engineId: 'dispatch', engineVersion: 1 },
    corpora: new Map([[corpus.slug, corpus]]),
    sources: { [corpus.slug]: corpus.dataVersion },
    seed,
    engineId: 'dispatch',
    engineVersion: 1,
  });
  const input: LabValue = { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci };
  const norm = registry.require('text.normalize.arabic').run([input], {}, ctx);
  const profiles = registry.require('observable.letter_profile').run([norm], {}, ctx);
  const relations = registry.require('relation.cosine_profile').run([profiles], { threshold: 0.75 }, ctx);
  const graph = registry.require('structure.threshold_graph').run([relations], {}, ctx);
  const communities = registry.require('structure.communities').run([graph], {}, ctx);
  const measured = registry.require('measure.modularity').run([communities], { iterations: 300 }, ctx);
  if (measured.type !== 'MeasurementSet') return {};
  const by = (name: string) => measured.measurements.find((m) => m.statistic === name);
  return {
    primary: by('newman_modularity'),
    control: by('newman_modularity_label_permutation_control'),
    nondegeneracy: by('partition_nondegeneracy'),
  };
}

export default async function Dispatch() {
  const planted = synthesizeCorpus({ slug: 'control-planted', seed: 7, groups: 3, lociPerGroup: 8, wordsPerLocus: 6, cohesion: 0.95 });
  const unplanted = synthesizeCorpus({ slug: 'control-none', seed: 7, groups: 3, lociPerGroup: 8, wordsPerLocus: 6, cohesion: 0 });
  const admitted = (await loadCorpusDirectory(CORPUS_DIR))[0];

  const rows = [
    { label: 'Synthetic — structure planted', note: 'positive control', ...measure(planted.corpus) },
    { label: 'Synthetic — nothing planted', note: 'negative control', ...measure(unplanted.corpus) },
    ...(admitted ? [{ label: `Admitted material — ${admitted.slug}`, note: 'real corpus', ...measure(admitted) }] : []),
  ];

  return (
    <>
      <div className="cover">
        <span className="kicker">Dispatch 01 · Method</span>
        <h1 className="headline">The result that was not there.</h1>
        <p className="dek">
          A clustering score of 0.585 at p = 0.002. Textbook significant. It was an artefact, and the thing that
          caught it was a corpus built to contain nothing at all.
        </p>
        <div className="byline">
          <span>Computational method</span>
          <span>Reproducible from this page</span>
        </div>
      </div>

      <hr className="rule-heavy" />

      <div className="feature" style={{ marginTop: '2.25rem' }}>
        <p>
          The first instrument this laboratory ever composed was asked a modest question: do the passages of a small
          Arabic corpus fall into groups by the letters they use? It normalised the text, built a letter-frequency
          profile for each passage, computed the similarity between every pair, kept the strong pairs as a graph, and
          ran a community detector over the result.
        </p>
        <p>
          It found communities. To check they were not an accident, it compared the modularity of that grouping against
          a null model: shuffle the community labels across the same graph, recompute, repeat three hundred times, and
          see how often chance does as well. Chance almost never did. The observed score sat far outside the
          distribution. By every convention that matters, the finding was significant.
        </p>
        <p>
          The laboratory also runs on two corpora that are not research material at all. One is constructed with real
          groups planted inside it, so an instrument that works should find them. The other is constructed from the
          same vocabulary with the group structure switched off — it contains nothing to find. They exist for one
          purpose: to check that the instruments can tell the difference.
        </p>

        <div className="pullquote">
          The corpus with nothing in it scored just as well.
        </div>

        <p>
          The error was not in the code. It was in the null model. The community detector works by maximising exactly
          the quantity being tested, so comparing its output against random relabellings of the same graph asks a
          question with a foregone answer: an optimiser will beat random assignment on almost any graph, including one
          with no structure whatsoever. The test was circular. It had been measuring the detector, not the data.
        </p>
        <p>
          The correct comparison keeps the detector and randomises the world instead. Rewire the graph so that every
          node keeps its exact number of connections and the weights are preserved, then run the same detector again on
          that rewired graph, three hundred times. Now the question is the right one: does this detector find more
          structure here than it finds in a structureless graph of the same shape?
        </p>
        <p>
          Under that null, the controls separate. Below is the comparison, computed when you loaded this page.
        </p>

        <div className="exhibit">
          <div className="exhibit-label">Exhibit · Newman modularity under two null models</div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>corpus</th>
                  <th>Q</th>
                  <th>rewiring null</th>
                  <th>label-permutation null</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td>
                      {r.label}
                      <div className="note" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{r.note}</div>
                    </td>
                    <td className="num">{r.primary ? fmt(r.primary.value, 3) : '—'}</td>
                    <td className="num">
                      {r.primary?.nullModel
                        ? `p = ${fmt(r.primary.nullModel.pValue, 3)} · ${r.primary.nullModel.exceedsNull ? 'significant' : 'not significant'}`
                        : '—'}
                    </td>
                    <td className="num">
                      {r.control?.nullModel
                        ? `p = ${fmt(r.control.nullModel.pValue, 3)} · ${r.control.nullModel.exceedsNull ? 'significant' : 'not significant'}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ paddingTop: '0.85rem' }}>
            Three hundred draws per null, seed 42, computed at request time by the same capabilities the laboratory
            uses. The final column is the discredited test, kept deliberately: it calls a corpus containing no
            structure significant, which is precisely why it cannot be used.
          </p>
        </div>

        <p>
          Both null models are still published on this site. The weak one carries the label{' '}
          <span className="mono">CONTROL, NOT A FINDING</span> and a written explanation of why it fails. Deleting it
          would have been tidier and less honest: which null model you choose is a research decision, and a reader is
          entitled to watch it being made.
        </p>
        <p>
          The corrected instrument reports no significant structure in the real corpus. That is the current, honest
          state of this laboratory — zero supported findings, published on its front page. The finding that would have
          been announced was not a discovery. It was a measurement of the measuring device.
        </p>

        <details className="more">
          <summary>What this costs, and why it is the whole job</summary>
          <div className="more-body">
            <p className="note">
              Every part of this was cheap except the habit. Building the negative control took minutes. Running it
              took seconds. What it required was deciding, before any result existed, that an instrument would have to
              prove it could stay silent before anything it said would be believed.
            </p>
            <p className="note">
              Most published versions of this error are never caught, because nobody builds the corpus that contains
              nothing. It is the least interesting artefact in any laboratory and the one that does the most work.
            </p>
          </div>
        </details>
      </div>

      <Band label="Where this is in the system">
        <ul className="contents">
          <li>
            <a href="/findings">
              <span className="no">→</span>
              <span>
                <h3>Findings</h3>
                <span className="what">Both null models, side by side, with the guard printed on each.</span>
              </span>
            </a>
          </li>
          <li>
            <a href="/practice/adversarial-validation">
              <span className="no">→</span>
              <span>
                <h3>Adversarial Validation</h3>
                <span className="what">The service that exists to find this class of error in your work.</span>
              </span>
            </a>
          </li>
        </ul>
      </Band>
    </>
  );
}
