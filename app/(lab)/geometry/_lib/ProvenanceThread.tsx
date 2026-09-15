'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TileCanvas } from './TileCanvas';
import { Tile, TileRow } from './Tile';
import type { ProvenanceThreadData } from '../../../../lab/geometry/compute';

const CELL = 76;
const KIND_ORDER = ['Corpus', 'Locus', 'Relation', 'Structure', 'Embedding', 'Observable', 'Measurement', 'Engine', 'EngineResult', 'Discovery', 'Hypothesis'];

function RootRow({ roots, selected }: { roots: ProvenanceThreadData['roots']; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <TileRow wrap={false}>
      {roots.map((r) => (
        <Tile
          key={r.id}
          label={r.kind}
          value={r.label.slice(0, 22)}
          selected={r.id === selected}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('root', r.id);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
        />
      ))}
    </TileRow>
  );
}

export function ProvenanceThread({ data }: { data: ProvenanceThreadData }) {
  const [selected, setSelected] = useState<string | null>(data.nodes[0]?.id ?? null);
  const [byKind, setByKind] = useState(false);

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    if (!byKind) {
      const byDepth = new Map<number, typeof data.nodes>();
      for (const n of data.nodes) byDepth.set(n.depth, [...(byDepth.get(n.depth) ?? []), n]);
      for (const [depth, ns] of byDepth) {
        ns.forEach((n, i) => pos.set(n.id, { x: depth, y: i }));
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
        buckets.get(kind)!.forEach((n, i) => pos.set(n.id, { x: ki, y: i }));
      });
    }
    return pos;
  }, [data.nodes, byKind]);

  const selectedNode = selected ? byId.get(selected) ?? null : null;
  const rows = Math.max(1, ...data.nodes.map((n) => (positions.get(n.id)?.y ?? 0) + 1));

  return (
    <div>
      <RootRow roots={data.roots} selected={data.selectedRoot} />

      <TileCanvas
        cell={CELL}
        height={Math.min(520, rows * CELL + 8)}
        ariaLabel="Provenance thread"
        onReturn={() => setSelected(data.nodes[0]?.id ?? null)}
      >
        {data.nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const isSelected = n.id === selected;
          const isParentOfSelected = selectedNode?.parents.includes(n.id) ?? false;
          const isChildOfSelected = n.parents.includes(selected ?? '');
          return (
            <Tile
              key={n.id}
              x={p.x}
              y={p.y}
              cell={CELL}
              filled={!n.epistemicType?.startsWith('AI_')}
              shade={0.62}
              selected={isSelected}
              accent={isParentOfSelected || isChildOfSelected}
              label={n.kind}
              value={n.label.slice(0, 26)}
              sub={`gen ${n.depth}`}
              onClick={() => setSelected(n.id)}
              title={n.label}
            />
          );
        })}
      </TileCanvas>

      <TileRow>
        <Tile label="objects in thread" value={data.nodes.length} />
        <Tile label="generations deep" value={Math.max(0, ...data.nodes.map((n) => n.depth))} />
        <Tile
          label="transform"
          value={byKind ? 'by generation' : 'group by kind'}
          onClick={() => setByKind((v) => !v)}
          accent={byKind}
        />
      </TileRow>

      {selectedNode ? (
        <TileRow wrap={false}>
          <Tile
            wide
            label={`${selectedNode.kind}${selectedNode.epistemicType ? ' · ' + selectedNode.epistemicType : ''} · generation ${selectedNode.depth} · ${selectedNode.parents.length} parent${selectedNode.parents.length === 1 ? '' : 's'}`}
            value={`${selectedNode.label}${selectedNode.derivation.length > 0 ? '\n' + selectedNode.derivation.join(' → ') : ''}`}
          />
        </TileRow>
      ) : (
        <TileRow wrap={false}>
          <Tile wide label="inspect" value="select a tile in the thread to inspect it." />
        </TileRow>
      )}
    </div>
  );
}
