'use client';

import { useMemo, useState } from 'react';
import { Stage } from './Stage';
import type { ConstellationData } from '../../../../lab/geometry/compute';

const GROUP_OPACITY = [1, 0.62, 0.4, 0.78, 0.5, 0.32];
const PAD = 48;
const W = 640;
const H = 440;

export function Constellation({ data }: { data: ConstellationData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(false);

  const laid = useMemo(() => {
    const xs = data.points.map((p) => p.x);
    const ys = data.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const pos = new Map(
      data.points.map((p) => [
        p.id,
        {
          x: PAD + ((p.x - minX) / spanX) * (W - 2 * PAD),
          y: PAD + ((p.y - minY) / spanY) * (H - 2 * PAD),
        },
      ]),
    );
    return pos;
  }, [data.points]);

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;
  const neighborEdges = selected ? data.edges.filter((e) => e.from === selected || e.to === selected) : [];

  const dim = (group: number) => {
    if (!isolate || !selectedPoint) return false;
    return group !== selectedPoint.group;
  };

  return (
    <div className="geo-proto">
      <Stage viewWidth={W} viewHeight={H} ariaLabel="Constellation of relation field" onReturn={() => { setSelected(null); setIsolate(false); }}>
        {data.edges.map((e, i) => {
          const a = laid.get(e.from);
          const b = laid.get(e.to);
          if (!a || !b) return null;
          const touches = selected === e.from || selected === e.to;
          const pa = data.points.find((p) => p.id === e.from);
          const faded = isolate && selectedPoint && pa && dim(pa.group);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={touches ? 'var(--stamp)' : 'var(--rule-firm)'}
              strokeWidth={touches ? 1.4 : 0.6}
              opacity={faded ? 0.08 : Math.max(0.15, e.weight)}
            />
          );
        })}
        {data.points.map((p) => {
          const pos = laid.get(p.id)!;
          const r = 3.2 + Math.min(6, p.degree) * 0.9;
          const opacity = GROUP_OPACITY[((p.group % GROUP_OPACITY.length) + GROUP_OPACITY.length) % GROUP_OPACITY.length];
          const isSelected = p.id === selected;
          return (
            <g
              key={p.id}
              transform={`translate(${pos.x} ${pos.y})`}
              onClick={() => setSelected(p.id)}
              style={{ cursor: 'pointer' }}
              opacity={dim(p.group) ? 0.14 : 1}
            >
              {isSelected && <circle r={r + 5} fill="none" stroke="var(--stamp)" strokeWidth={1.2} />}
              <circle r={r} fill="var(--ink)" fillOpacity={opacity} />
              <text y={-r - 5} textAnchor="middle" className="geo-node-label">{p.ref}</text>
            </g>
          );
        })}
      </Stage>

      <div className="geo-side">
        <div className="geo-figures">
          <div><span className="figure">{data.points.length}</span><span className="figure-label">loci</span></div>
          <div><span className="figure">{data.edges.length}</span><span className="figure-label">relations ≥ {data.threshold}</span></div>
          <div><span className="figure">{data.groupCount}</span><span className="figure-label">communities</span></div>
          <div><span className="figure">{data.modularity.toFixed(3)}</span><span className="figure-label">modularity Q</span></div>
        </div>

        <div className="geo-actions">
          <button type="button" disabled={!selectedPoint} onClick={() => setIsolate((v) => !v)}>
            {isolate ? 'show all (undo transform)' : 'isolate cluster (transform)'}
          </button>
        </div>

        {selectedPoint ? (
          <article className="record geo-inspect">
            <div className="record-head">
              <span className="tag tag--ink">{selectedPoint.ref}</span>
              <span className="tag tag--quiet">group {selectedPoint.group}</span>
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>degree {selectedPoint.degree}</span>
            </div>
            <p className="arabic" style={{ fontSize: '1.05rem' }}>{selectedPoint.text}</p>
            <p className="note">
              {neighborEdges.length} relation{neighborEdges.length === 1 ? '' : 's'} above threshold {data.threshold}.
            </p>
            {neighborEdges.length > 0 && (
              <ul className="index" style={{ marginTop: '0.5rem' }}>
                {neighborEdges.slice(0, 8).map((e, i) => {
                  const otherId = e.from === selectedPoint.id ? e.to : e.from;
                  const other = data.points.find((p) => p.id === otherId);
                  return (
                    <li key={i} className="mono" style={{ fontSize: '0.78rem' }}>
                      → {other?.ref ?? otherId} · weight {e.weight.toFixed(3)}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        ) : (
          <p className="note">Select a point to inspect the record and its measured relations.</p>
        )}
      </div>
    </div>
  );
}
