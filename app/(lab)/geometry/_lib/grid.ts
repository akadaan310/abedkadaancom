/**
 * Quantizes a computed continuous coordinate onto the tile grid. The grid is the
 * interface's only spatial vocabulary now, so a prototype's real coordinates (an MDS
 * embedding, a frontier utility score, a measured extent) have to land on integer
 * cells — this does that placement deterministically, without discarding relative order,
 * and resolves collisions by nudging outward to the nearest free cell rather than
 * silently stacking two computed points on top of each other.
 */
export function normalize(value: number, min: number, max: number, size: number): number {
  const span = max - min || 1;
  return ((value - min) / span) * (size - 1);
}

export function resolvePlacement<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  rawX: (item: T) => number,
  rawY: (item: T) => number,
  cols: number,
  rows: number,
): Map<string, { x: number; y: number }> {
  const occupied = new Set<string>();
  const pos = new Map<string, { x: number; y: number }>();
  const maxR = Math.max(cols, rows);

  for (const item of items) {
    let gx = Math.max(0, Math.min(cols - 1, Math.round(rawX(item))));
    let gy = Math.max(0, Math.min(rows - 1, Math.round(rawY(item))));
    let key = `${gx},${gy}`;

    if (occupied.has(key)) {
      let placed = false;
      for (let r = 1; r <= maxR && !placed; r++) {
        for (let dy = -r; dy <= r && !placed; dy++) {
          for (let dx = -r; dx <= r && !placed; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const nk = `${nx},${ny}`;
            if (!occupied.has(nk)) {
              gx = nx;
              gy = ny;
              key = nk;
              placed = true;
            }
          }
        }
      }
    }

    occupied.add(key);
    pos.set(idOf(item), { x: gx, y: gy });
  }
  return pos;
}
