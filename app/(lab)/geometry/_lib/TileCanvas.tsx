'use client';

/**
 * The infinite tiling surface. A grid of blank cells extends in every direction; the
 * tiles a prototype places on it are positioned in the same cell units, so a data block
 * and an empty cell of the backdrop are the same shape at the same scale — the tiling is
 * not decoration laid behind the geometry, it is the coordinate system the geometry uses.
 */
import { useCallback, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react';
import { Tile } from './Tile';

const MIN_SCALE = 0.35;
const MAX_SCALE = 4;
const FIELD = 20000;

export function TileCanvas({
  cell = 64,
  height = 440,
  ariaLabel,
  children,
  onReturn,
  initialTx = 32,
  initialTy = 32,
}: {
  cell?: number;
  height?: number;
  ariaLabel: string;
  children: ReactNode;
  onReturn?: () => void;
  initialTx?: number;
  initialTy?: number;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(initialTx);
  const [ty, setTy] = useState(initialTy);
  /** Pointer-down origin, tracked from the first press — but panning (and the capture
   *  that would otherwise steal the click event from a tile underneath) only starts once
   *  movement crosses DRAG_THRESHOLD, so a plain tap still reaches the tile's onClick. */
  const pressed = useRef<{ x: number; y: number; tx: number; ty: number; pointerId: number; captured: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  const zoomIn = useCallback(() => setScale((s) => clamp(s * 1.25)), []);
  const zoomOut = useCallback(() => setScale((s) => clamp(s * 0.8)), []);
  const reset = useCallback(() => {
    setScale(1);
    setTx(initialTx);
    setTy(initialTy);
    onReturn?.();
  }, [initialTx, initialTy, onReturn]);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setScale((s) => clamp(s * (e.deltaY < 0 ? 1.12 : 0.89)));
  }, []);

  const DRAG_THRESHOLD = 4;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pressed.current = { x: e.clientX, y: e.clientY, tx, ty, pointerId: e.pointerId, captured: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pressed.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.captured) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      p.captured = true;
      setIsDragging(true);
      (e.currentTarget as Element).setPointerCapture?.(p.pointerId);
    }
    setTx(p.tx + dx);
    setTy(p.ty + dy);
  };
  const endDrag = () => {
    pressed.current = null;
    setIsDragging(false);
  };

  return (
    <div className="tile-canvas">
      <div className="tile-row tile-row--nowrap tile-canvas-toolbar">
        <Tile value="zoom in" onClick={zoomIn} style={{ minWidth: '5.5rem' }} />
        <Tile value="zoom out" onClick={zoomOut} style={{ minWidth: '5.5rem' }} />
        <Tile value="return" onClick={reset} accent style={{ minWidth: '5.5rem' }} />
        <Tile label="scale" value={`${Math.round(scale * 100)}%`} />
      </div>
      <div
        className="tile-canvas-viewport"
        style={{ height, cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        role="img"
        aria-label={ariaLabel}
      >
        <div
          className="tile-canvas-field"
          style={{
            width: FIELD,
            height: FIELD,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            ['--cell' as string]: `${cell}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
