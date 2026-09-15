import { Tile, TileRow } from './_lib/Tile';
import { TileCanvas } from './_lib/TileCanvas';
import { GEOMETRIES } from './_lib/geometries';

export const dynamic = 'force-dynamic';

const BLURB: Record<string, string> = {
  '01': 'Loci placed by a 2-D embedding of a computed relation graph, grouped by detected community.',
  '02': 'Any computed object, walked backward to its sources through the provenance DAG.',
  '03': 'The research frontier, plotted on its own declared gain, priority and novelty.',
  '04': 'One 4-D embedding of the corpus, viewed two axes at a time.',
  '05': 'The corpus’s own token counts and letter entropy, drawn directly as tiles.',
};

const CELL = 128;

export default function GeometryIndex() {
  return (
    <>
      <TileRow wrap={false}>
        <Tile
          wide
          label="Geometry · prototypes, not the finished laboratory"
          value="Five small, working views of the same research state, tiled onto one infinite surface. The position, size and shade of every tile below came out of a capability this laboratory actually runs — nothing here is placed by hand."
        />
      </TileRow>

      <TileCanvas cell={CELL} height={CELL * 4 + 24} ariaLabel="Geometry prototype index">
        {GEOMETRIES.map((g, i) => (
          <Tile
            key={g.slug}
            x={(i % 3) * 3}
            y={Math.floor(i / 3) * 2}
            w={2.7}
            h={1.7}
            cell={CELL}
            filled
            shade={0.42 + i * 0.09}
            label={`geometry ${g.slug}`}
            value={g.name}
            sub={BLURB[g.slug]}
            href={`/geometry/${g.slug}`}
          />
        ))}
      </TileCanvas>

      <TileRow wrap={false}>
        <Tile
          wide
          label="how to read any of them"
          value="Every prototype supports the same loop: navigate to a subject, select a tile, zoom to look closer, inspect the record behind it, apply one real transform of the geometry, then return. A metadata tile under each one states its data, its geometry and its actions, and a lens row lets you read the same numbers in six registers — the numbers never change, only how they are explained."
        />
      </TileRow>
    </>
  );
}
