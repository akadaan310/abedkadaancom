import { projectionData } from '../../../../lab/geometry/compute';
import { Projection } from '../_lib/Projection';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { Tile, TileRow } from '../_lib/Tile';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry04({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await projectionData();

  return (
    <>
      <GeometrySwitcher />
      <TileRow wrap={false}>
        <Tile wide label="04 · projection" value="One 4-D embedding of the corpus, viewed two axes at a time. Pick which pair of computed dimensions to tile." />
      </TileRow>

      {!data ? (
        <TileRow wrap={false}>
          <Tile wide label="unavailable" value="no corpus is admitted. run npm run lab:seed." />
        </TileRow>
      ) : (
        <Projection data={data} />
      )}

      <GeometryMeta
        data={<>corpus loci, related by <span className="mono">relation.jaccard_tokens</span></>}
        geometry={<>embedding.classical_mds(dimensions=4) — basis: {data?.basis ?? '—'}</>}
        actions="pick an axis pair (tiles) · select a tile · zoom · inspect its full coordinate vector · scale all axes together (transform) · return"
        lens={lens}
        lensCopy={copyFor('projection', lens)}
      />
    </>
  );
}
