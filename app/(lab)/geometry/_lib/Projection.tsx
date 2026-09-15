'use client';

import { useMemo, useState } from 'react';
import { Stage } from './Stage';
import type { ProjectionData } from '../../../../lab/geometry/compute';

const W = 640;
const H = 440;
const PAD = 50;

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
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    return new Map(
      data.points.map((p) => [
        p.id,
        {
          x: PAD + (((p.coords[dimA] ?? 0) - minX) / spanX) * (W - 2 * PAD),
          y: H - PAD - (((p.coords[dimB] ?? 0) - minY) / spanY) * (H - 2 * PAD),
        },
      ]),
    );
  }, [data.points, dimA, dimB, sharedScale, globalExtent]);

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;
  const dims = Array.from({ length: data.dimensions }, (_, i) => i);
  const corr = data.correlations.find((c) => (c.a === dimA && c.b === dimB) || (c.a === dimB && c.b === dimA));

  return (
    <div className="geo-proto">
      <div className="geo-toprow">
        <span className="geo-toprow-label">Axes</span>
        <select value={dimA} onChange={(e) => setDimA(Number(e.target.value))}>
          {dims.map((d) => <option key={d} value={d} disabled={d === dimB}>D{d + 1}</option>)}
        </select>
        <span className="geo-toprow-x">×</span>
        <select value={dimB} onChange={(e) => setDimB(Number(e.target.value))}>
          {dims.map((d) => <option key={d} value={d} disabled={d === dimA}>D{d + 1}</option>)}
        </select>
        {corr && <span className="note" style={{ marginLeft: 'auto' }}>r(D{dimA + 1}, D{dimB + 1}) = {corr.r.toFixed(3)}</span>}
      </div>

      <Stage viewWidth={W} viewHeight={H} ariaLabel="Higher-dimensional projection" onReturn={() => setSelected(null)}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--rule)" strokeWidth={1} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--rule)" strokeWidth={1} />
        <text x={W / 2} y={H - PAD + 26} textAnchor="middle" className="geo-axis-label">D{dimA + 1} →</text>
        <text x={PAD - 14} y={H / 2} textAnchor="middle" className="geo-axis-label" transform={`rotate(-90 ${PAD - 14} ${H / 2})`}>D{dimB + 1} →</text>
        {data.points.map((p) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          const isSelected = p.id === selected;
          return (
            <g key={p.id} transform={`translate(${pos.x} ${pos.y})`} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
              {isSelected && <circle r={9} fill="none" stroke="var(--stamp)" strokeWidth={1.2} />}
              <circle r={4} fill="var(--ink)" fillOpacity={0.78} />
              <text y={-10} textAnchor="middle" className="geo-node-label">{p.ref}</text>
            </g>
          );
        })}
      </Stage>

      <div className="geo-side">
        <div className="geo-figures">
          <div><span className="figure">{data.dimensions}</span><span className="figure-label">computed dimensions</span></div>
          <div><span className="figure">{data.points.length}</span><span className="figure-label">loci embedded</span></div>
        </div>
        <div className="geo-actions">
          <button type="button" onClick={() => setSharedScale((v) => !v)}>
            {sharedScale ? 'scale each pair independently (undo transform)' : 'scale all axes together (transform)'}
          </button>
        </div>

        <details className="more" style={{ marginTop: '0.5rem' }}>
          <summary>Dimension correlations</summary>
          <div className="more-body">
            <table>
              <thead><tr><th>pair</th><th>pearson r</th></tr></thead>
              <tbody>
                {data.correlations.map((c, i) => (
                  <tr key={i}><td className="mono">D{c.a + 1} · D{c.b + 1}</td><td className="num">{c.r.toFixed(3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {selectedPoint ? (
          <article className="record geo-inspect">
            <div className="record-head"><span className="tag tag--ink">{selectedPoint.ref}</span></div>
            <p className="arabic" style={{ fontSize: '1.05rem' }}>{selectedPoint.text}</p>
            <p className="record-meta mono">[{selectedPoint.coords.map((c) => c.toFixed(3)).join(', ')}]</p>
          </article>
        ) : (
          <p className="note">Select a point to see its full coordinate vector across all {data.dimensions} dimensions.</p>
        )}
      </div>
    </div>
  );
}
