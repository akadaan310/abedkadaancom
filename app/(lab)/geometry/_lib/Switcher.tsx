'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { GEOMETRIES } from './geometries';

/** GEOMETRY 01 / 02 / 03 / 04 / 05 — the prototype switcher. Carries ?lens= across it. */
export function GeometrySwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lens = searchParams.get('lens');
  const suffix = lens ? `?lens=${lens}` : '';

  return (
    <nav className="geo-switcher" aria-label="Geometry prototypes">
      <a href={`/geometry${suffix}`} className="geo-switcher-home">Geometry</a>
      <div className="geo-switcher-links">
        {GEOMETRIES.map((g) => {
          const href = `/geometry/${g.slug}`;
          const active = pathname === href;
          return (
            <a key={g.slug} href={`${href}${suffix}`} {...(active ? { 'aria-current': 'page' as const } : {})}>
              <span className="geo-switcher-no">{g.slug}</span>
              <span className="geo-switcher-name">{g.name}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
