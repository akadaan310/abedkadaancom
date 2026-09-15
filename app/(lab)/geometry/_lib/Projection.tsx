'use client';

import { useMemo, useState } from 'react';
import { TileCanvas } from './TileCanvas';
import { Tile, TileRow } from './Tile';
import { resolvePlacement, normalize } from './grid';
import type { ProjectionData } from '../../../../lab/geometry/compute';

const COLS = 14;
const ROWS = 10;
const CELL = 64;

export function Projection({ data }: { data: ProjectionData }) {
  const [dimA, setDimA] = useState(0);
  const [dimB, setDimB] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [sharedScale, setSharedScale] = useState(false);

  const globalExtent = useMemo(() => {
    const all = data.points.flatMap((p) => p.coords);
    return { min: Math.min(...all), max: Math.max(...all) };
  }, [data.points]);

  const positions = useMemo(() => {
    const xs = data.points.map((p) => p.coords[dimA] ?? 0);
    const ys = data.points.map((p) => p.coords[dimB] ?? 0);
    const minX = sharedScale ? globalExtent.min : Math.min(...xs);
    const maxX = sharedScale ? globalExtent.max : Math.max(...xs);
    const minY = sharedScale ? globalExtent.min : Math.min(...ys);
    const maxY = sharedScale ? globalExtent.max : Math.max(...ys);
    return resolvePlacement(
      data.points,
      (p) => p.id,
      (p) => normalize(p.coords[dimA] ?? 0, minX, maxX, COLS),
      (p) => normalize(1 - normalize(p.coords[dimB] ?? 0, minY, maxY, 1), 0, 1, ROWS),
      COLS,
      ROWS,
    );
  }, [data.points, dimA, dimB, sharedScale, globalExtent]);

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;
  const dims = Array.from({ length: data.dimensions }, (_, i) => i);
  const corr = data.correlations.find((c) => (c.a === dimA && c.b === dimB) || (c.a === dimB && c.b === dimA));

  return (
    <div>
      <TileRow wrap={false}>
        <Tile label="axis" value="A" />
        {dims.map((d) => (
          <Tile key={d} label={`D${d + 1}`} value={`D${d + 1}`} selected={d === dimA} onClick={() => d !== dimB && setDimA(d)} />
        ))}
        <Tile label="axis" value="B" />
        {dims.map((d) => (
          <Tile key={d} label={`D${d + 1}`} value={`D${d + 1}`} selected={d === dimB} onClick={() => d !== dimA && setDimB(d)} />
        ))}
        {corr && <Tile label={`r(D${dimA + 1},D${dimB + 1})`} value={corr.r.toFixed(3)} />}
      </TileRow>

      <TileCanvas cell={CELL} height={ROWS * CELL + 8} ariaLabel="Higher-dimensional projection" onReturn={() => setSelected(null)}>
        {data.points.map((p) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          const isSelected = p.id === selected;
          return (
            <Tile
              key={p.id}
              x={pos.x}
              y={pos.y}
              cell={CELL}
              filled
              shade={0.68}
              selected={isSelected}
              label={`D${dimA + 1}·D${dimB + 1}`}
              value={p.ref}
              onClick={() => setSelected(p.id)}
              title={p.text}
            />
          );
        })}
      </TileCanvas>

      <TileRow>
        <Tile label="computed dimensions" value={data.dimensions} />
        <Tile label="loci embedded" value={data.points.length} />
        <Tile
          label="transform"
          value={sharedScale ? 'scale each pair' : 'scale all axes together'}
          onClick={() => setSharedScale((v) => !v)}
          accent={sharedScale}
        />
      </TileRow>

      <TileRow>
        {data.correlations.map((c, i) => (
          <Tile key={i} label={`D${c.a + 1} · D${c.b + 1}`} value={c.r.toFixed(3)} />
        ))}
      </TileRow>

      {selectedPoint ? (
        <TileRow wrap={false}>
          <Tile
            wide
            label={selectedPoint.ref}
            value={`${selectedPoint.text}\n[${selectedPoint.coords.map((c) => c.toFixed(3)).join(', ')}]`}
          />
        </TileRow>
      ) : (
        <TileRow wrap={false}>
          <Tile wide label="inspect" value={`select a tile to see its full coordinate vector across all ${data.dimensions} dimensions.`} />
        </TileRow>
      )}
    </div>
  );
}
