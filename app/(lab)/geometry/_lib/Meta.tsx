import type { ReactNode } from 'react';
import { Tile, TileRow } from './Tile';
import { LensPicker } from './LensPicker';
import type { LensSlug } from './lenses';

/** DATA → GEOMETRY → ACTIONS, plus the lens reading — each row one wide tile. */
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
    <div>
      <TileRow wrap={false}>
        <Tile wide label="data" value={data} />
      </TileRow>
      <TileRow wrap={false}>
        <Tile wide label="geometry" value={geometry} />
      </TileRow>
      <TileRow wrap={false}>
        <Tile wide label="actions" value={actions} />
      </TileRow>
      <LensPicker current={lens} />
      <TileRow wrap={false}>
        <Tile wide label={`read as · ${lens}`} value={lensCopy} />
      </TileRow>
    </div>
  );
}
