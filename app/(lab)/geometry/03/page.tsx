import { researchFieldData } from '../../../../lab/geometry/compute';
import { Band } from '../../../ui';
import { ResearchField } from '../_lib/ResearchField';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry03({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await researchFieldData();

  return (
    <>
      <GeometrySwitcher />
      <Band label="Geometry 03 · Research field">
        <div className="column">
          <p className="lede">The frontier, spatialized by its own declared economy.</p>
          <p className="note">
            Each point is a real frontier item — a question, hypothesis, counterexample or capability gap the
            laboratory logged. Its position is its own declared expected gain and priority (§46, §99), not a layout choice.
          </p>
        </div>
      </Band>

      <Band label="Field" count={`${data.points.length} items`}>
        <ResearchField data={data} />
      </Band>

      <Band label="Metadata">
        <GeometryMeta
          data="the research frontier (lab/frontier/frontier.ts), open and closed items"
          geometry="scatter on (expectedInformationGain, researchPriority), point size = novelty, or 1-D rank by utility"
          actions="select a point · zoom · inspect its subject, reason and cost · rank by utility (transform) · return"
          lens={lens}
          lensCopy={copyFor('research-field', lens)}
        />
      </Band>
    </>
  );
}
