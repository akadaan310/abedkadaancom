import { typographicData } from '../../../../lab/geometry/compute';
import { Typographic } from '../_lib/Typographic';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { Tile, TileRow } from '../_lib/Tile';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry05({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await typographicData();

  return (
    <>
      <GeometrySwitcher />
      <TileRow wrap={false}>
        <Tile wide label="05 · typographic" value="No embedding here — each tile is one passage, sized by its own token count and shaded by its own letter entropy." />
      </TileRow>

      {!data ? (
        <TileRow wrap={false}>
          <Tile wide label="unavailable" value="no corpus is admitted. run npm run lab:seed." />
        </TileRow>
      ) : (
        <Typographic data={data} />
      )}

      <GeometryMeta
        data={<>corpus <span className="mono">{data?.corpusSlug ?? '—'}</span>, per-locus token/character counts and letter entropy</>}
        geometry="a tile grid whose width is token count and whose shade is Shannon letter-entropy (bits), reorderable"
        actions="select a tile · zoom · inspect the passage and its measurements · change sort order (transform) · return"
        lens={lens}
        lensCopy={copyFor('typographic', lens)}
      />
    </>
  );
}
