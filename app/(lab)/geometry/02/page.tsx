import { provenanceThreadData } from '../../../../lab/geometry/compute';
import { Band } from '../../../ui';
import { ProvenanceThread } from '../_lib/ProvenanceThread';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry02({ searchParams }: { searchParams: Promise<{ lens?: string; root?: string }> }) {
  const { lens: lensParam, root } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await provenanceThreadData(root);

  return (
    <>
      <GeometrySwitcher />
      <Band label="Geometry 02 · Provenance thread">
        <div className="column">
          <p className="lede">Walk any computed object back to its sources.</p>
          <p className="note">
            Pick a result. This walks <span className="mono">provenance.parents</span> backward from it, exactly as
            recorded when it was computed — the same chain a §21 provenance audit would follow.
          </p>
        </div>
      </Band>

      {!data || data.roots.length === 0 ? (
        <Band label="Unavailable"><p className="note">The ledger holds nothing with provenance yet. Run <span className="mono">npm run lab:tick 3</span>.</p></Band>
      ) : (
        <Band label="Thread" count={`${data.nodes.length} objects`}>
          <ProvenanceThread data={data} />
        </Band>
      )}

      <Band label="Metadata">
        <GeometryMeta
          data={<>the projected ledger (<span className="mono">/api/state</span>), one object and its ancestry</>}
          geometry="backward walk of the provenance DAG, laid out by generation or regrouped by object kind"
          actions="navigate to a different root · select a node · zoom · inspect its derivation and parents · relayout by kind (transform) · return"
          lens={lens}
          lensCopy={copyFor('provenance-thread', lens)}
        />
      </Band>
    </>
  );
}
