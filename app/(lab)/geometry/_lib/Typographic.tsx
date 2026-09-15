'use client';

import { useMemo, useState } from 'react';
import { TileCanvas } from './TileCanvas';
import { Tile, TileRow } from './Tile';
import type { TypeBlock, TypographicData } from '../../../../lab/geometry/compute';

const COLS = 7;
const CELL = 84;

type SortKey = 'address' | 'entropy' | 'length';
const NEXT: Record<SortKey, SortKey> = { address: 'entropy', entropy: 'length', length: 'address' };
const SORT_LABEL: Record<SortKey, string> = {
  address: 'sorted by address',
  entropy: 'sorted by letter entropy',
  length: 'sorted by token count',
};

function sortBlocks(blocks: readonly TypeBlock[], key: SortKey): readonly TypeBlock[] {
  const out = [...blocks];
  if (key === 'address') {
    out.sort((a, b) => {
      for (let i = 0; i < Math.max(a.address.length, b.address.length); i++) {
        const d = (a.address[i] ?? 0) - (b.address[i] ?? 0);
        if (d !== 0) return d;
      }
      return 0;
    });
  } else if (key === 'entropy') {
    out.sort((a, b) => b.entropyBits - a.entropyBits);
  } else {
    out.sort((a, b) => b.tokens - a.tokens);
  }
  return out;
}

export function Typographic({ data }: { data: TypographicData }) {
  const [sortKey, setSortKey] = useState<SortKey>('address');
  const [selected, setSelected] = useState<string | null>(null);

  const ordered = useMemo(() => sortBlocks(data.blocks, sortKey), [data.blocks, sortKey]);
  const maxTokens = Math.max(1, ...data.blocks.map((b) => b.tokens));
  const maxEntropy = Math.max(1e-6, ...data.blocks.map((b) => b.entropyBits));
  const rows = Math.ceil(ordered.length / COLS);

  const selectedBlock = selected ? data.blocks.find((b) => b.id === selected) ?? null : null;

  return (
    <div>
      <TileCanvas cell={CELL} height={rows * CELL + 8} ariaLabel="Typographic data geometry" onReturn={() => setSelected(null)}>
        {ordered.map((b, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const widthFraction = Math.max(0.22, b.tokens / maxTokens);
          const shade = 0.28 + 0.6 * (b.entropyBits / maxEntropy);
          const isSelected = b.id === selected;
          return (
            <Tile
              key={b.id}
              x={col}
              y={row}
              w={widthFraction}
              cell={CELL}
              filled
              shade={shade}
              selected={isSelected}
              label={b.ref}
              value={`${b.tokens}t`}
              sub={`${b.entropyBits.toFixed(2)} bit`}
              onClick={() => setSelected(b.id)}
              title={b.text}
            />
          );
        })}
      </TileCanvas>

      <TileRow>
        <Tile label="loci" value={data.blocks.length} />
        <Tile label="longest, tokens" value={maxTokens} />
        <Tile label="max letter entropy, bits" value={maxEntropy.toFixed(2)} />
        <Tile label="transform" value={SORT_LABEL[NEXT[sortKey]]} onClick={() => setSortKey((k) => NEXT[k])} />
        <Tile label="current order" value={SORT_LABEL[sortKey]} />
      </TileRow>

      {selectedBlock ? (
        <TileRow wrap={false}>
          <Tile
            wide
            label={`${selectedBlock.ref} · ${selectedBlock.tokens} tokens · ${selectedBlock.characters} characters · ${selectedBlock.entropyBits.toFixed(3)} bits`}
            value={<span className="arabic" style={{ fontSize: '1.05rem', lineHeight: 1.8 }}>{selectedBlock.text}</span>}
          />
        </TileRow>
      ) : (
        <TileRow wrap={false}>
          <Tile wide label="inspect" value="select a block to see the passage and its measured extent." />
        </TileRow>
      )}
    </div>
  );
}
