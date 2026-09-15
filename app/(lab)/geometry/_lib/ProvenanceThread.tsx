'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Stage } from './Stage';
import type { ProvenanceThreadData } from '../../../../lab/geometry/compute';

const W = 720;
const H = 460;
const PAD = 60;
const KIND_ORDER = ['Corpus', 'Locus', 'Relation', 'Structure', 'Embedding', 'Observable', 'Measurement', 'Engine', 'EngineResult', 'Discovery', 'Hypothesis'];

function RootPicker({ roots, selected }: { roots: ProvenanceThreadData['roots']; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <select
      className="geo-root-picker"
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('root', e.target.value);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }}
    >
      {roots.map((r) => (
        <option key={r.id} value={r.id}>
          {r.kind} · {r.label.slice(0, 60)}
        </option>
      ))}
    </select>
  );
}

export function ProvenanceThread({ data }: { data: ProvenanceThreadData }) {
  const [selected, setSelected] = useState<string | null>(data.nodes[0]?.id ?? null);
  const [byKind, setByKind] = useState(false);

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const edges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    for (const n of data.nodes) {
      for (const p of n.parents) {
        if (byId.has(p)) out.push({ from: n.id, to: p });
      }
    }
    return out;
  }, [data.nodes, byId]);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    if (!byKind) {
      const maxDepth = Math.max(0, ...data.nodes.map((n) => n.depth));
      const byDepth = new Map<number, typeof data.nodes>();
      for (const n of data.nodes) byDepth.set(n.depth, [...(byDepth.get(n.depth) ?? []), n]);
      for (const [depth, ns] of byDepth) {
        const x = maxDepth === 0 ? W / 2 : PAD + (depth / maxDepth) * (W - 2 * PAD);
        ns.forEach((n, i) => {
          const y = ns.length === 1 ? H / 2 : PAD + (i / (ns.length - 1 || 1)) * (H - 2 * PAD);
          pos.set(n.id, { x, y });
        });
      }
    } else {
      const buckets = new Map<string, typeof data.nodes>();
      for (const n of data.nodes) buckets.set(n.kind, [...(buckets.get(n.kind) ?? []), n]);
      const kinds = [...buckets.keys()].sort((a, b) => {
        const ia = KIND_ORDER.indexOf(a);
        const ib = KIND_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      kinds.forEach((kind, ki) => {
        const ns = buckets.get(kind)!;
        const x = kinds.length === 1 ? W / 2 : PAD + (ki / (kinds.length - 1 || 1)) * (W - 2 * PAD);
        ns.forEach((n, i) => {
          const y = ns.length === 1 ? H / 2 : PAD + (i / (ns.length - 1 || 1)) * (H - 2 * PAD);
          pos.set(n.id, { x, y });
        });
      });
    }
    return pos;
  }, [data.nodes, byKind]);

  const selectedNode = selected ? byId.get(selected) ?? null : null;

  return (
    <div className="geo-proto">
      <div className="geo-toprow">
        <span className="geo-toprow-label">Trace from</span>
        <RootPicker roots={data.roots} selected={data.selectedRoot} />
      </div>

      <Stage viewWidth={W} viewHeight={H} ariaLabel="Provenance thread" onReturn={() => setSelected(data.nodes[0]?.id ?? null)}>
        {edges.map((e, i) => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          const touches = selected === e.from || selected === e.to;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={touches ? 'var(--stamp)' : 'var(--rule-firm)'} strokeWidth={touches ? 1.4 : 0.7} />
          );
        })}
        {data.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const isSelected = n.id === selected;
          const isAi = n.epistemicType?.startsWith('AI_');
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`} onClick={() => setSelected(n.id)} style={{ cursor: 'pointer' }}>
              {isSelected && <circle r={9} fill="none" stroke="var(--stamp)" strokeWidth={1.2} />}
              <circle r={5} fill={isAi ? 'none' : 'var(--ink)'} stroke={isAi ? 'var(--muted)' : 'none'} strokeWidth={isAi ? 1.2 : 0} fillOpacity={0.85} />
              <text y={-11} textAnchor="middle" className="geo-node-label">{n.kind}</text>
            </g>
          );
        })}
      </Stage>

      <div className="geo-side">
        <div className="geo-figures">
          <div><span className="figure">{data.nodes.length}</span><span className="figure-label">objects in thread</span></div>
          <div><span className="figure">{Math.max(0, ...data.nodes.map((n) => n.depth))}</span><span className="figure-label">generations deep</span></div>
        </div>
        <div className="geo-actions">
          <button type="button" onClick={() => setByKind((v) => !v)}>
            {byKind ? 'lay out by generation (undo transform)' : 'lay out by kind (transform)'}
          </button>
        </div>
        {selectedNode ? (
          <article className="record geo-inspect">
            <div className="record-head">
              <span className="tag tag--ink">{selectedNode.kind}</span>
              {selectedNode.epistemicType && <span className="tag tag--quiet">{selectedNode.epistemicType}</span>}
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>generation {selectedNode.depth}</span>
            </div>
            <p>{selectedNode.label}</p>
            {selectedNode.derivation.length > 0 && (
              <p className="note mono" style={{ fontSize: '0.74rem' }}>{selectedNode.derivation.join(' → ')}</p>
            )}
            <p className="record-meta">{selectedNode.parents.length} parent{selectedNode.parents.length === 1 ? '' : 's'}</p>
          </article>
        ) : (
          <p className="note">Select a node in the thread to inspect it.</p>
        )}
      </div>
    </div>
  );
}
