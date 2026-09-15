'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tile, TileRow } from './Tile';
import { LENSES, type LensSlug } from './lenses';

/** Sets ?lens= on the current geometry route without touching any other query param. */
export function LensPicker({ current }: { current: LensSlug }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setLens = (slug: LensSlug) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lens', slug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <TileRow>
      {LENSES.map((l) => (
        <Tile
          key={l.slug}
          label="read as"
          value={l.label}
          selected={l.slug === current}
          onClick={() => setLens(l.slug)}
          style={{ minWidth: '6rem' }}
        />
      ))}
    </TileRow>
  );
}
