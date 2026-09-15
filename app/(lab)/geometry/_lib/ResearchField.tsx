'use client';

import { useMemo, useState } from 'react';
import { Stage } from './Stage';
import type { ResearchFieldData } from '../../../../lab/geometry/compute';

const W = 640;
const H = 440;
const PAD = 56;

export function ResearchField({ data }: { data: ResearchFieldData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [ranked, setRanked] = useState(false);

  const sortedByUtility = useMemo(() => [...data.points].sort((a, b) => b.utility - a.utility), [data.points]);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    if (!ranked) {
      for (const p of data.points) {
        pos.set(p.id, {
          x: PAD + p.x * (W - 2 * PAD),
          y: H - PAD - p.y * (H - 2 * PAD),
        });
      }
    } else {
      const maxU = Math.max(1e-6, ...sortedByUtility.map((p) => p.utility));
      sortedByUtility.forEach((p, i) => {
        const x = sortedByUtility.length === 1 ? W / 2 : PAD + (i / (sortedByUtility.length - 1 || 1)) * (W - 2 * PAD);
        const y = H - PAD - (p.utility / maxU) * (H - 2 * PAD);
        pos.set(p.id, { x, y });
      });
    }
    return pos;
  }, [data.points, ranked, sortedByUtility]);

  const selectedPoint = selected ? data.points.find((p) => p.id === selected) ?? null : null;

  return (
    <div className="geo-proto">
      <Stage viewWidth={W} viewHeight={H} ariaLabel="Research field" onReturn={() => setSelected(null)}>
        {!ranked && (
          <>
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--rule)" strokeWidth={1} />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--rule)" strokeWidth={1} />
            <text x={W / 2} y={H - PAD + 26} textAnchor="middle" className="geo-axis-label">expected information gain →</text>
            <text x={PAD - 14} y={H / 2} textAnchor="middle" className="geo-axis-label" transform={`rotate(-90 ${PAD - 14} ${H / 2})`}>research priority →</text>
          </>
        )}
        {data.points.map((p) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          const r = 3 + p.size * 9;
          const closed = p.state === 'CLOSED';
          const contested = p.state === 'HIGHLY_CONTESTED';
          const isSelected = p.id === selected;
          return (
            <g key={p.id} transform={`translate(${pos.x} ${pos.y})`} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
              {isSelected && <circle r={r + 6} fill="none" stroke="var(--stamp)" strokeWidth={1.2} />}
              <circle
                r={r}
                fill={closed ? 'none' : contested ? 'var(--stamp)' : 'var(--ink)'}
                fillOpacity={closed ? 0 : 0.72}
                stroke={closed ? 'var(--faint)' : 'none'}
                strokeDasharray={closed ? '2 2' : undefined}
              />
            </g>
          );
        })}
      </Stage>

      <div className="geo-side">
        <div className="geo-figures">
          <div><span className="figure">{data.points.length}</span><span className="figure-label">frontier items</span></div>
          <div><span className="figure">{data.points.filter((p) => p.state !== 'CLOSED').length}</span><span className="figure-label">still open</span></div>
        </div>
        <div className="geo-actions">
          <button type="button" onClick={() => setRanked((v) => !v)}>
            {ranked ? 'plot by gain × priority (undo transform)' : 'rank by utility (transform)'}
          </button>
        </div>
        {selectedPoint ? (
          <article className="record geo-inspect">
            <div className="record-head">
              <span className="tag tag--ink">{selectedPoint.itemKind}</span>
              <span className="tag tag--quiet">{selectedPoint.state}</span>
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                utility {selectedPoint.utility.toFixed(3)}
              </span>
            </div>
            <p>{selectedPoint.subject}</p>
            <p className="guard">{selectedPoint.reason}</p>
            <p className="record-meta">
              gain {selectedPoint.x.toFixed(2)} · priority {selectedPoint.y.toFixed(2)} · novelty {selectedPoint.size.toFixed(2)} ·
              cost {selectedPoint.costEstimate} · proposed by {selectedPoint.proposedBy}
            </p>
          </article>
        ) : (
          <p className="note">Select a point to see what it is and why it is on the frontier.</p>
        )}
      </div>
    </div>
  );
}
