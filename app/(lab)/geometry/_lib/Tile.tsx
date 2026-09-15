'use client';

/**
 * The one interface element. Every piece of this section — navigation, toolbar,
 * metadata, a computed data point — is one of these: a bordered block of typewriter
 * text, either outlined (chrome) or filled to a shade (a real measured value). There is
 * no other visual vocabulary; §94 still governs the palette, this just narrows the shape.
 */
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

export function Tile({
  x,
  y,
  w,
  h,
  cell = 64,
  filled = false,
  shade = 0.72,
  accent = false,
  dim = false,
  selected = false,
  wide = false,
  label,
  value,
  sub,
  onClick,
  href,
  title,
  style,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cell?: number;
  filled?: boolean;
  shade?: number;
  accent?: boolean;
  dim?: boolean;
  selected?: boolean;
  /** A flow tile with intrinsic, wrapping width instead of a fixed cell footprint —
   *  for the longer prose blocks (metadata, lens copy) that still read as one tile. */
  wide?: boolean;
  label?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  /** Renders as a real link (so navigation, back/forward and prefetch all work). */
  href?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const positioned = x !== undefined && y !== undefined;
  const classes = [
    'tile',
    filled ? 'tile--filled' : 'tile--outline',
    onClick || href ? 'tile--interactive' : '',
    selected ? 'tile--selected' : '',
    accent ? 'tile--accent' : '',
    wide ? 'tile--wide' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const computedStyle: CSSProperties = {
    ...(positioned ? { position: 'absolute', left: (x as number) * cell, top: (y as number) * cell } : {}),
    ...(wide ? {} : { width: (w ?? 1) * cell - 3, height: (h ?? 1) * cell - 3 }),
    opacity: dim ? 0.22 : 1,
    ['--shade' as string]: shade,
    ...style,
  };

  const content = (
    <>
      {label !== undefined && <span className="tile-label">{label}</span>}
      {value !== undefined && <span className="tile-value">{value}</span>}
      {sub !== undefined && <span className="tile-sub">{sub}</span>}
    </>
  );

  if (href) {
    return (
      <a className={classes} style={computedStyle} title={title} href={href} {...(selected ? { 'aria-current': 'page' as const } : {})}>
        {content}
      </a>
    );
  }

  const onKeyDown = onClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={classes}
      style={computedStyle}
      onClick={onClick}
      onKeyDown={onKeyDown}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content}
    </div>
  );
}

/** A fixed (non-canvas) row of tiles: toolbars, switchers, metadata strips. */
export function TileRow({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <div className={`tile-row${wrap ? '' : ' tile-row--nowrap'}`}>{children}</div>;
}
