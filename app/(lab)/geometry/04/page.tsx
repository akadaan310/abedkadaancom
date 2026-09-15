import { projectionData } from '../../../../lab/geometry/compute';
import { Band } from '../../../ui';
import { Projection } from '../_lib/Projection';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry04({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await projectionData();

  return (
    <>
      <GeometrySwitcher />
      <Band label="Geometry 04 · Higher-dimensional projection">
        <div className="column">
          <p className="lede">One 4-dimensional embedding, viewed two axes at a time.</p>
          <p className="note">
            The corpus is embedded in 4 computed dimensions by classical MDS on token-overlap distance. A page can
            only show two axes at once — the picker below changes which honest slice you are looking at.
          </p>
        </div>
      </Band>

      {!data ? (
        <Band label="Unavailable"><p className="note">No corpus is admitted. Run <span className="mono">npm run lab:seed</span>.</p></Band>
      ) : (
        <Band label="Projection" count={`${data.points.length} loci · ${data.dimensions} dimensions`}>
          <Projection data={data} />
        </Band>
      )}

      <Band label="Metadata">
        <GeometryMeta
          data={<>corpus loci, related by <span className="mono">relation.jaccard_tokens</span></>}
          geometry={<>embedding.classical_mds(dimensions=4) — basis: {data?.basis ?? '—'}</>}
          actions="pick an axis pair · select a point · zoom · inspect its full coordinate vector · scale all axes together (transform) · return"
          lens={lens}
          lensCopy={copyFor('projection', lens)}
        />
      </Band>
    </>
  );
}
