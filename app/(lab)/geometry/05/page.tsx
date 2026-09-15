import { typographicData } from '../../../../lab/geometry/compute';
import { Band } from '../../../ui';
import { Typographic } from '../_lib/Typographic';
import { GeometryMeta } from '../_lib/Meta';
import { GeometrySwitcher } from '../_lib/Switcher';
import { DEFAULT_LENS, copyFor, isLensSlug } from '../_lib/lenses';

export const dynamic = 'force-dynamic';

export default async function Geometry05({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: lensParam } = await searchParams;
  const lens = isLensSlug(lensParam) ? lensParam : DEFAULT_LENS;
  const data = await typographicData();

  return (
    <>
      <GeometrySwitcher />
      <Band label="Geometry 05 · Typographic">
        <div className="column">
          <p className="lede">The corpus's own measured extent, as geometry.</p>
          <p className="note">
            No embedding here — each block is one passage, sized by its own token count and shaded by its own
            letter entropy. The geometry is the typography, measured rather than designed.
          </p>
        </div>
      </Band>

      {!data ? (
        <Band label="Unavailable"><p className="note">No corpus is admitted. Run <span className="mono">npm run lab:seed</span>.</p></Band>
      ) : (
        <Band label="Grid" count={`${data.blocks.length} loci`}>
          <Typographic data={data} />
        </Band>
      )}

      <Band label="Metadata">
        <GeometryMeta
          data={<>corpus <span className="mono">{data?.corpusSlug ?? '—'}</span>, per-locus token/character counts and letter entropy</>}
          geometry="a grid whose cell width is token count and whose shade is Shannon letter-entropy (bits), reorderable"
          actions="select a block · zoom · inspect the passage and its measurements · change sort order (transform) · return"
          lens={lens}
          lensCopy={copyFor('typographic', lens)}
        />
      </Band>
    </>
  );
}
