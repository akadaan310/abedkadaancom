import { constellationData } from '../../../../lab/geometry/compute';
import { Constellation } from '../_lib/Constellation';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { Tile, TileRow } from '../_lib/Tile';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry01({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await constellationData();

  return (
    <>
      <GeometrySwitcher />
      <TileRow wrap={false}>
        <Tile wide label="01 · constellation" value="A relation field over the admitted corpus. Position comes from a computed 2-D embedding, quantized onto this grid." />
      </TileRow>

      {!data ? (
        <TileRow wrap={false}>
          <Tile wide label="unavailable" value="no corpus is admitted. run npm run lab:seed." />
        </TileRow>
      ) : (
        <Constellation data={data} />
      )}

      <GeometryMeta
        data={<>corpus <span className="mono">{data?.corpusSlug ?? '—'}</span> ({data?.sourceVerification}), all admitted loci</>}
        geometry="relation.cosine_profile → structure.threshold_graph → structure.communities → embedding.classical_mds(2), quantized onto the tile grid"
        actions="navigate the canvas · select a tile · zoom (wheel/tiles) · inspect the record and its relations · isolate a cluster (transform) · return"
        lens={lens}
        lensCopy={copyFor('constellation', lens)}
      />
    </>
  );
}
