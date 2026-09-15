import { constellationData } from '../../../../lab/geometry/compute';
import { Band } from '../../../ui';
import { Constellation } from '../_lib/Constellation';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry01({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await constellationData();

  return (
    <>
      <GeometrySwitcher />
      <Band label="Geometry 01 · Constellation">
        <div className="column">
          <p className="lede">A relation field over the admitted corpus.</p>
          <p className="note">
            Every passage in the working corpus is a point. Position comes from a 2-D embedding of a relation graph
            the laboratory actually computed — not a force layout tuned to look interesting.
          </p>
        </div>
      </Band>

      {!data ? (
        <Band label="Unavailable"><p className="note">No corpus is admitted. Run <span className="mono">npm run lab:seed</span>.</p></Band>
      ) : (
        <Band label="Field" count={`${data.points.length} loci · ${data.edges.length} relations`}>
          <Constellation data={data} />
        </Band>
      )}

      <Band label="Metadata">
        <GeometryMeta
          data={<>corpus <span className="mono">{data?.corpusSlug ?? '—'}</span> ({data?.sourceVerification}), all admitted loci</>}
          geometry={<>relation.cosine_profile → structure.threshold_graph → structure.communities → embedding.classical_mds(2)</>}
          actions="navigate the stage · select a point · zoom (wheel/buttons) · inspect the record and its relations · isolate a cluster (transform) · return"
          lens={lens}
          lensCopy={copyFor('constellation', lens)}
        />
      </Band>
    </>
  );
}
