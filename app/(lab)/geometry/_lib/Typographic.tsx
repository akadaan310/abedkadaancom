'use client';

import { useMemo, useState } from 'react';
import { Stage } from './Stage';
import type { TypeBlock, TypographicData } from '../../../../lab/geometry/compute';

const W = 660;
const H = 440;
const PAD = 30;
const COLS = 7;

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
  const cellW = (W - 2 * PAD) / COLS;
  const cellH = (H - 2 * PAD) / rows;

  const selectedBlock = selected ? data.blocks.find((b) => b.id === selected) ?? null : null;

  return (
    <div className="geo-proto">
      <Stage viewWidth={W} viewHeight={H} ariaLabel="Typographic data geometry" onReturn={() => setSelected(null)}>
        {ordered.map((b, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const cx = PAD + col * cellW;
          const cy = PAD + row * cellH;
          const w = Math.max(6, (b.tokens / maxTokens) * (cellW - 8));
          const h = cellH - 10;
          const shade = 0.22 + 0.65 * (b.entropyBits / maxEntropy);
          const isSelected = b.id === selected;
          return (
            <g key={b.id} onClick={() => setSelected(b.id)} style={{ cursor: 'pointer' }}>
              <rect
                x={cx}
                y={cy}
                width={w}
                height={h}
                fill="var(--ink)"
                fillOpacity={shade}
                stroke={isSelected ? 'var(--stamp)' : 'var(--rule-firm)'}
                strokeWidth={isSelected ? 1.6 : 0.6}
              />
              <text x={cx + 4} y={cy + h - 6} className="geo-node-label" style={{ textAnchor: 'start' }}>{b.ref}</text>
            </g>
          );
        })}
      </Stage>

      <div className="geo-side">
        <div className="geo-figures">
          <div><span className="figure">{data.blocks.length}</span><span className="figure-label">loci</span></div>
          <div><span className="figure">{maxTokens}</span><span className="figure-label">longest, tokens</span></div>
          <div><span className="figure">{maxEntropy.toFixed(2)}</span><span className="figure-label">max letter entropy, bits</span></div>
        </div>
        <div className="geo-actions">
          <button type="button" onClick={() => setSortKey((k) => NEXT[k])}>
            {SORT_LABEL[NEXT[sortKey]]} (transform)
          </button>
          <span className="note" style={{ marginLeft: '0.75rem' }}>currently {SORT_LABEL[sortKey]}</span>
        </div>
        {selectedBlock ? (
          <article className="record geo-inspect">
            <div className="record-head">
              <span className="tag tag--ink">{selectedBlock.ref}</span>
              <span className="spacer" />
              <span className="num" style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{selectedBlock.entropyBits.toFixed(3)} bits</span>
            </div>
            <p className="arabic" style={{ fontSize: '1.05rem' }}>{selectedBlock.text}</p>
            <p className="record-meta">{selectedBlock.tokens} tokens · {selectedBlock.characters} characters</p>
          </article>
        ) : (
          <p className="note">Select a block to see the passage and its measured extent.</p>
        )}
      </div>
    </div>
  );
}
