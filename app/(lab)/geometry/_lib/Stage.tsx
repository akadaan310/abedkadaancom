'use client';

/**
 * The shared geometry stage: pan, zoom and return, over an SVG viewBox.
 *
 * One implementation of navigate/zoom/return so the five prototypes share the same
 * physical behaviour and a reader can compare them fairly. Selection and inspection are
 * left to each prototype, since what "select" means differs by geometry.
 */
import { useCallback, useRef, useState, type PointerEvent, type ReactNode, type WheelEvent } from 'react';

const MIN_SCALE = 0.4;
const MAX_SCALE = 6;

export function Stage({
  viewWidth = 640,
  viewHeight = 460,
  ariaLabel,
  children,
  onReturn,
}: {
  viewWidth?: number;
  viewHeight?: number;
  ariaLabel: string;
  children: ReactNode;
  onReturn?: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomIn = useCallback(() => setScale((s) => clamp(s * 1.25)), []);
  const zoomOut = useCallback(() => setScale((s) => clamp(s * 0.8)), []);
  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    onReturn?.();
  }, [onReturn]);

  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    setScale((s) => clamp(s * (e.deltaY < 0 ? 1.12 : 0.89)));
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    dragging.current = { x: e.clientX, y: e.clientY, tx, ty };
    setIsDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = dragging.current;
    if (!d) return;
    setTx(d.tx + (e.clientX - d.x));
    setTy(d.ty + (e.clientY - d.y));
  };
  const endDrag = () => {
    dragging.current = null;
    setIsDragging(false);
  };

  return (
    <div className="geo-stage">
      <div className="geo-stage-toolbar">
        <button type="button" onClick={zoomIn}>zoom in</button>
        <button type="button" onClick={zoomOut}>zoom out</button>
        <button type="button" onClick={reset}>return</button>
        <span className="geo-stage-hint">drag to pan · wheel to zoom · {Math.round(scale * 100)}%</span>
      </div>
      <svg
        className="geo-stage-canvas"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        role="img"
        aria-label={ariaLabel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>{children}</g>
      </svg>
    </div>
  );
}
