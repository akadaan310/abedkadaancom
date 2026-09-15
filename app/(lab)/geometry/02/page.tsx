import { provenanceThreadData } from '../../../../lab/geometry/compute';
import { ProvenanceThread } from '../_lib/ProvenanceThread';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { Tile, TileRow } from '../_lib/Tile';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry02({ searchParams }: { searchParams: Promise<{ lens?: string; root?: string }> }) {
  const { lens: lensParam, root } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await provenanceThreadData(root);

  return (
    <>
      <GeometrySwitcher />
      <TileRow wrap={false}>
        <Tile wide label="02 · provenance thread" value="Walk any computed object back to its sources, following provenance.parents exactly as recorded when it was computed." />
      </TileRow>

      {!data || data.roots.length === 0 ? (
        <TileRow wrap={false}>
          <Tile wide label="unavailable" value="the ledger holds nothing with provenance yet. run npm run lab:tick 3." />
        </TileRow>
      ) : (
        <ProvenanceThread data={data} />
      )}

      <GeometryMeta
        data={<>the projected ledger (<span className="mono">/api/state</span>), one object and its ancestry</>}
        geometry="backward walk of the provenance DAG, laid out by generation or regrouped by object kind, one tile per object"
        actions="navigate to a different root · select a tile · zoom · inspect its derivation and parents · relayout by kind (transform) · return"
        lens={lens}
        lensCopy={copyFor('provenance-thread', lens)}
      />
    </>
  );
}
