import type { ReactNode } from 'react';
import { LensPicker } from './LensPicker';
import type { LensSlug } from './lenses';

/** The tiny DATA → GEOMETRY → ACTIONS card that sits beside every prototype. */
export function GeometryMeta({
  data,
  geometry,
  actions,
  lens,
  lensCopy,
}: {
  data: ReactNode;
  geometry: ReactNode;
  actions: ReactNode;
  lens: LensSlug;
  lensCopy: string;
}) {
  return (
    <div className="geo-meta">
      <div className="geo-meta-row">
        <span className="geo-meta-k">Data</span>
        <span className="geo-meta-v">{data}</span>
      </div>
      <div className="geo-meta-row">
        <span className="geo-meta-k">Geometry</span>
        <span className="geo-meta-v">{geometry}</span>
      </div>
      <div className="geo-meta-row">
        <span className="geo-meta-k">Actions</span>
        <span className="geo-meta-v">{actions}</span>
      </div>
      <LensPicker current={lens} />
      <p className="geo-lens-copy">{lensCopy}</p>
    </div>
  );
}
