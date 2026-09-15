/**
 * Canonical serialization and content addressing.
 *
 * Constitution §96 (reproducibility) and §65 (machine-readable provenance) require
 * that the identity of a computational object derive from its content, not from a
 * counter or a clock. Two runs that compute the same thing from the same inputs must
 * produce the same identifier; two runs that differ in any declared input must not.
 */
import { createHash } from 'node:crypto';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/**
 * Deterministic JSON: object keys sorted, undefined dropped, no incidental whitespace.
 * Numbers are emitted via JSON.stringify, so -0 normalizes to 0 and non-finite values
 * are rejected rather than silently becoming null (a silent null would corrupt an id).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): Json {
  if (value === null) return null;
  if (value === undefined) {
    throw new TypeError('canonicalize: undefined is not representable; omit the key instead');
  }
  const t = typeof value;
  if (t === 'boolean' || t === 'string') return value as Json;
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError(`canonicalize: non-finite number ${String(value)} is not representable`);
    }
    return (value as number) === 0 ? 0 : (value as number);
  }
  if (t === 'bigint') return (value as bigint).toString();
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : normalize(v)));
  if (t === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, Json> = {};
    for (const key of Object.keys(src).sort()) {
      const v = src[key];
      if (v === undefined) continue;
      out[key] = normalize(v);
    }
    return out;
  }
  throw new TypeError(`canonicalize: unsupported value of type ${t}`);
}

/** Full-width content hash of any canonicalizable value. */
export function digest(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

/**
 * A prefixed, content-addressed identifier, e.g. `eng_9f2c1a...`.
 * The prefix keeps ids legible in the ledger and in URLs without weakening the hash.
 */
export function contentId(prefix: string, value: unknown, width = 16): string {
  return `${prefix}_${digest(value).slice(0, width)}`;
}
