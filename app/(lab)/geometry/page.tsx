import { Band } from '../../ui';
import { GEOMETRIES } from './_lib/geometries';

export const dynamic = 'force-dynamic';

const BLURB: Record<string, string> = {
  '01': 'Loci placed by a 2-D embedding of a computed relation graph, grouped by detected community.',
  '02': 'Any computed object, walked backward to its sources through the provenance DAG.',
  '03': 'The research frontier, plotted on its own declared gain, priority and novelty.',
  '04': 'One 4-D embedding of the corpus, viewed two axes at a time.',
  '05': 'The corpus’s own token counts and letter entropy, drawn directly as a grid.',
};

export default function GeometryIndex() {
  return (
    <>
      <div className="cover">
        <span className="kicker">Prototypes · Not the finished laboratory</span>
        <h1 className="headline">Five geometries, computed live.</h1>
        <p className="dek">
          Five small, working views of the same research state. Each one is real: the position, size or grouping of
          everything on screen came out of a capability this laboratory actually runs, over the corpus it has
          actually admitted — nothing here is placed by hand. This is a first look at shape, not a finished section
          of the site.
        </p>
      </div>

      <hr className="rule-heavy" />

      <Band label="Geometry 01–05">
        <ul className="contents">
          {GEOMETRIES.map((g) => (
            <li key={g.slug}>
              <a href={`/geometry/${g.slug}`}>
                <span className="no">{g.slug}</span>
                <span>
                  <h3>{g.name}</h3>
                  <span className="what">{BLURB[g.slug]}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Band>

      <Band label="How to read any of them">
        <div className="column">
          <p className="note">
            Every prototype supports the same loop: navigate to a subject, select a point, zoom to look closer,
            inspect the record behind it, apply one real transform of the geometry, then return. A small metadata
            card under each one states its data, its geometry, and its actions in three lines, and a lens picker lets
            you read the same numbers in six registers — the numbers never change, only how they are explained.
          </p>
        </div>
      </Band>
    </>
  );
}
