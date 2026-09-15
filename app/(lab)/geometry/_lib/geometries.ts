/** Plain data, deliberately kept out of any 'use client' file: a Server Component that
 *  imports a named export from a client module gets an opaque client reference back, not
 *  the value, so the switcher's route list has to live here instead of in Switcher.tsx. */
export const GEOMETRIES = [
  { slug: '01', name: 'Constellation' },
  { slug: '02', name: 'Provenance thread' },
  { slug: '03', name: 'Research field' },
  { slug: '04', name: 'Projection' },
  { slug: '05', name: 'Typographic' },
] as const;
