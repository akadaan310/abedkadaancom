import { researchFieldData } from '../../../../lab/geometry/compute';
import { ResearchField } from '../_lib/ResearchField';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { Tile, TileRow } from '../_lib/Tile';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry03({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await researchFieldData();

  return (
    <>
      <GeometrySwitcher />
      <TileRow wrap={false}>
        <Tile wide label="03 · research field" value="The frontier, spatialized by its own declared expected gain, priority and novelty — not a layout choice." />
      </TileRow>

      <ResearchField data={data} />

      <GeometryMeta
        data="the research frontier (lab/frontier/frontier.ts), open and closed items"
        geometry="tile grid on (expectedInformationGain, researchPriority), or a 1-D rank by utility"
        actions="select a tile · zoom · inspect its subject, reason and cost · rank by utility (transform) · return"
        lens={lens}
        lensCopy={copyFor('research-field', lens)}
      />
    </>
  );
}
