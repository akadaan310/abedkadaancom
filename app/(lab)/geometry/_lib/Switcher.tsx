'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Tile, TileRow } from './Tile';
import { GEOMETRIES } from './geometries';

/** GEOMETRY 01 / 02 / 03 / 04 / 05 — the prototype switcher, itself a row of tiles. */
export function GeometrySwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lens = searchParams.get('lens');
  const suffix = lens ? `?lens=${lens}` : '';

  return (
    <nav aria-label="Geometry prototypes">
      <TileRow>
        <Tile label="geometry" value="index" href={`/geometry${suffix}`} selected={pathname === '/geometry'} style={{ minWidth: '6.5rem' }} />
        {GEOMETRIES.map((g) => {
          const href = `/geometry/${g.slug}`;
          return (
            <Tile
              key={g.slug}
              label={g.slug}
              value={g.name}
              href={`${href}${suffix}`}
              selected={pathname === href}
              style={{ minWidth: '6.5rem' }}
            />
          );
        })}
      </TileRow>
    </nav>
  );
}
