'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
    <div className="geo-lens" role="group" aria-label="Read this geometry as">
      <span className="geo-lens-label">Read as</span>
      <div className="geo-lens-options">
        {LENSES.map((l) => (
          <button
            key={l.slug}
            type="button"
            className="geo-lens-btn"
            aria-current={l.slug === current ? 'true' : undefined}
            onClick={() => setLens(l.slug)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
