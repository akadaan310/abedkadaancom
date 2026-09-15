'use client';

import { useMemo, useState } from 'react';
import { TileCanvas } from './TileCanvas';
import { Tile, TileRow } from './Tile';
import { resolvePlacement, normalize } from './grid';
import type { ResearchFieldData } from '../../../../lab/geometry/compute';

const COLS = 12;
const ROWS = 8;
const CELL = 68;

export function ResearchField({ data }: { data: ResearchFieldData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [ranked, setRanked] = useState(false);

  const sortedByUtility = useMemo(() => [...data.points].sort((a, b) => b.utility - a.utility), [data.points]);

  const fieldPositions = useMemo(
    () =>
      resolvePlacement(
        data.points,
        (p) => p.id,
        (p) => normalize(p.x, 0, 1, COLS),
        (p) => normalize(1 - p.y, 0, 1, ROWS),
        COLS,
        ROWS,
      ),
    [data.points],
  );
  const rankedPositions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    sortedByUtility.forEach((p, i) => pos.set(p.id, { x: i, y: 0 }));
    return pos;
  }, [sortedByUtility]);
  const positions = ranked ? rankedPositions : fieldPositions;

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;

  return (
    <div>
      <TileCanvas
        cell={CELL}
        height={ranked ? CELL + 8 : ROWS * CELL + 8}
        ariaLabel="Research field"
        onReturn={() => setSelected(null)}
      >
        {data.points.map((p) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          const isSelected = p.id === selected;
          const closed = p.state === 'CLOSED';
          const contested = p.state === 'HIGHLY_CONTESTED';
          return (
            <Tile
              key={p.id}
              x={pos.x}
              y={pos.y}
              cell={CELL}
              filled={!closed}
              shade={contested ? 0.9 : 0.4 + p.size * 0.4}
              accent={contested}
              selected={isSelected}
              dim={closed}
              label={p.itemKind}
              value={p.subject.slice(0, 20)}
              sub={ranked ? `u ${p.utility.toFixed(2)}` : p.state}
              onClick={() => setSelected(p.id)}
              title={p.subject}
            />
          );
        })}
      </TileCanvas>

      <TileRow>
        <Tile label="frontier items" value={data.points.length} />
        <Tile label="still open" value={data.points.filter((p) => p.state !== 'CLOSED').length} />
        <Tile
          label="transform"
          value={ranked ? 'plot gain × priority' : 'rank by utility'}
          onClick={() => setRanked((v) => !v)}
          accent={ranked}
        />
      </TileRow>

      {selectedPoint ? (
        <TileRow wrap={false}>
          <Tile
            wide
            label={`${selectedPoint.itemKind} · ${selectedPoint.state} · utility ${selectedPoint.utility.toFixed(3)}`}
            value={`${selectedPoint.subject}\n${selectedPoint.reason}\ngain ${selectedPoint.x.toFixed(2)} · priority ${selectedPoint.y.toFixed(2)} · novelty ${selectedPoint.size.toFixed(2)} · cost ${selectedPoint.costEstimate} · proposed by ${selectedPoint.proposedBy}`}
          />
        </TileRow>
      ) : (
        <TileRow wrap={false}>
          <Tile wide label="inspect" value="select a tile to see what it is and why it is on the frontier." />
        </TileRow>
      )}
    </div>
  );
}
