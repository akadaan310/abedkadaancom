/**
 * Seeded pseudo-random generation.
 *
 * Constitution §96 requires that an investigation be reproducible from its data version,
 * configuration, parameters and random seeds. Every stochastic step in the laboratory —
 * null models above all (§20) — draws from a seeded generator, never from Math.random,
 * so a recorded seed is enough to re-derive the exact result.
 */

/** mulberry32: small, fast, and stable across runtimes, which is what reproducibility needs. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy, driven by a seeded generator. */
export function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Derive a stable integer seed from any canonicalizable configuration. */
export function seedFrom(parts: readonly (string | number)[]): number {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h >>> 0;
}
