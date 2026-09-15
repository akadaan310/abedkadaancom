'use client';

import { useMemo, useState } from 'react';
import { TileCanvas } from './TileCanvas';
import { Tile, TileRow } from './Tile';
import { resolvePlacement, normalize } from './grid';
import type { ConstellationData } from '../../../../lab/geometry/compute';

const COLS = 16;
const ROWS = 11;
const CELL = 64;
const GROUP_SHADE = [0.82, 0.68, 0.54, 0.76, 0.6, 0.46];

export function Constellation({ data }: { data: ConstellationData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(false);

  const xs = data.points.map((p) => p.x);
  const ys = data.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const positions = useMemo(
    () =>
      resolvePlacement(
        data.points,
        (p) => p.id,
        (p) => normalize(p.x, minX, maxX, COLS),
        (p) => normalize(p.y, minY, maxY, ROWS),
        COLS,
        ROWS,
      ),
    [data.points, minX, maxX, minY, maxY],
  );

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;
  const neighborIds = new Set(
    selected ? data.edges.filter((e) => e.from === selected || e.to === selected).map((e) => (e.from === selected ? e.to : e.from)) : [],
  );
  const neighborEdges = selected ? data.edges.filter((e) => e.from === selected || e.to === selected) : [];

  return (
    <div>
      <TileCanvas
        cell={CELL}
        height={ROWS * CELL + 8}
        ariaLabel="Constellation of relation field"
        onReturn={() => {
          setSelected(null);
          setIsolate(false);
        }}
      >
        {data.points.map((p) => {
          const pos = positions.get(p.id)!;
          const isSelected = p.id === selected;
          const isNeighbor = neighborIds.has(p.id);
          const dim = isolate && selectedPoint && p.group !== selectedPoint.group;
          return (
            <Tile
              key={p.id}
              x={pos.x}
              y={pos.y}
              cell={CELL}
              filled
              shade={GROUP_SHADE[((p.group % GROUP_SHADE.length) + GROUP_SHADE.length) % GROUP_SHADE.length]}
              selected={isSelected}
              accent={isNeighbor}
              dim={!!dim}
              label={`grp ${p.group}`}
              value={p.ref}
              sub={`deg ${p.degree}`}
              onClick={() => setSelected(p.id)}
              title={p.text}
            />
          );
        })}
      </TileCanvas>

      <TileRow>
        <Tile label="loci" value={data.points.length} />
        <Tile label="relations" value={data.edges.length} sub={`≥ ${data.threshold}`} />
        <Tile label="communities" value={data.groupCount} />
        <Tile label="modularity Q" value={data.modularity.toFixed(3)} />
        <Tile
          label="transform"
          value={isolate ? 'show all' : 'isolate cluster'}
          onClick={() => setIsolate((v) => !v)}
          accent={isolate}
        />
      </TileRow>

      {selectedPoint ? (
        <>
          <TileRow wrap={false}>
            <Tile
              wide
              label={`${selectedPoint.ref} · group ${selectedPoint.group} · degree ${selectedPoint.degree}`}
              value={<span className="arabic" style={{ fontSize: '1.05rem', lineHeight: 1.8 }}>{selectedPoint.text}</span>}
            />
          </TileRow>
          <TileRow>
            {neighborEdges.slice(0, 12).map((e, i) => {
              const otherId = e.from === selectedPoint.id ? e.to : e.from;
              const other = data.points.find((p) => p.id === otherId);
              return (
                <Tile key={i} label="relation" value={other?.ref ?? otherId} sub={`w ${e.weight.toFixed(3)}`} onClick={() => setSelected(otherId)} />
              );
            })}
          </TileRow>
        </>
      ) : (
        <TileRow wrap={false}>
          <Tile wide label="inspect" value="select a tile to see the record and its measured relations." />
        </TileRow>
      )}
    </div>
  );
}
