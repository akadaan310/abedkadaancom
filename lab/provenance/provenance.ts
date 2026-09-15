/**
 * Provenance. Constitution §21 and §65.
 *
 * Every meaningful object must be able to answer: what produced this, from which data,
 * using which Engine, which version, which model, which Nano-LLMs, which parameters,
 * which prior discoveries, which tests, which researcher interventions. Provenance is
 * machine-readable and the graph it forms is queryable (§21).
 */
import { contentId } from '../ontology/canonical';
import type { Actor } from '../ontology/epistemic';

export interface Provenance {
  readonly kind: 'Provenance';
  /** The immediate producer of the object. */
  readonly creator: Actor;
  /** Source material this object ultimately rests on, by corpus slug and data version. */
  readonly sources: Record<string, string>;
  readonly engineId?: string;
  readonly engineVersion?: number;
  readonly models: readonly ModelUse[];
  /** Ids of the objects this one was derived from. Forms the provenance DAG. */
  readonly parents: readonly string[];
  /** The capability chain actually executed, in order. */
  readonly derivation: readonly string[];
  readonly configuration: Record<string, unknown>;
  readonly timestamp: string;
  /** Ids of tests or challenges applied to this object. */
  readonly tests: readonly string[];
  /** Ids of researcher interventions bearing on this object. §29 */
  readonly researcherInterventions: readonly string[];
  readonly notes?: string;
}

/**
 * A single use of a model. §97: two stochastic outputs are never treated as the same
 * process, so sampling configuration and timestamp are recorded alongside the model.
 */
export interface ModelUse {
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
  readonly role: string;
  readonly temperature: number | null;
  readonly seed: number | null;
  readonly deterministic: boolean;
  readonly promptDigest: string;
  readonly outputDigest: string;
  readonly costUnits: number;
  readonly latencyMs: number;
  readonly timestamp: string;
}

export interface ProvenanceInit {
  creator: Actor;
  sources?: Record<string, string>;
  engineId?: string;
  engineVersion?: number;
  models?: readonly ModelUse[];
  parents?: readonly string[];
  derivation?: readonly string[];
  configuration?: Record<string, unknown>;
  timestamp: string;
  tests?: readonly string[];
  researcherInterventions?: readonly string[];
  notes?: string;
}

export function provenance(init: ProvenanceInit): Provenance {
  const p: Provenance = {
    kind: 'Provenance',
    creator: init.creator,
    sources: init.sources ?? {},
    models: init.models ?? [],
    parents: init.parents ?? [],
    derivation: init.derivation ?? [],
    configuration: init.configuration ?? {},
    timestamp: init.timestamp,
    tests: init.tests ?? [],
    researcherInterventions: init.researcherInterventions ?? [],
  };
  return {
    ...p,
    ...(init.engineId !== undefined ? { engineId: init.engineId } : {}),
    ...(init.engineVersion !== undefined ? { engineVersion: init.engineVersion } : {}),
    ...(init.notes !== undefined ? { notes: init.notes } : {}),
  };
}

export function provenanceId(p: Provenance): string {
  return contentId('prov', p);
}

/**
 * Completeness check used by the Engine Auditor (§69) and by the test suite (§49).
 * An object whose provenance cannot answer the §21 questions is not promotable.
 */
export interface ProvenanceAudit {
  readonly complete: boolean;
  readonly missing: readonly string[];
  readonly warnings: readonly string[];
}

export function auditProvenance(p: Provenance | undefined, opts: { requireSources?: boolean } = {}): ProvenanceAudit {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!p) return { complete: false, missing: ['provenance'], warnings: [] };

  if (!p.creator) missing.push('creator');
  if (!p.timestamp || Number.isNaN(Date.parse(p.timestamp))) missing.push('timestamp');
  if (opts.requireSources !== false && Object.keys(p.sources).length === 0) missing.push('sources');
  if (p.creator?.kind === 'ENGINE' && p.derivation.length === 0) missing.push('derivation');
  if (p.creator?.kind === 'NANO_LLM' && p.models.length === 0) missing.push('models');

  for (const m of p.models) {
    if (!m.promptDigest) warnings.push(`model ${m.model} recorded without a prompt digest`);
    // §97: a nondeterministic producer must say so, so that reproducibility claims stay honest.
    if (!m.deterministic && m.seed === null && m.temperature === null) {
      warnings.push(`model ${m.model} is nondeterministic and records no sampling configuration`);
    }
  }
  if (p.parents.length === 0 && p.creator?.kind === 'ENGINE') {
    warnings.push('engine-produced object declares no parent objects');
  }
  return { complete: missing.length === 0, missing, warnings };
}

/** Walk the provenance DAG backwards. §55 (computational lineage), §83 (retracing). */
export function lineage(
  rootId: string,
  lookup: (id: string) => { id: string; provenance?: Provenance } | undefined,
  maxDepth = 32,
): { readonly id: string; readonly depth: number; readonly derivation: readonly string[] }[] {
  const out: { id: string; depth: number; derivation: readonly string[] }[] = [];
  const seen = new Set<string>();
  const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    if (seen.has(next.id) || next.depth > maxDepth) continue;
    seen.add(next.id);
    const node = lookup(next.id);
    if (!node) continue;
    out.push({ id: node.id, depth: next.depth, derivation: node.provenance?.derivation ?? [] });
    for (const parent of node.provenance?.parents ?? []) {
      queue.push({ id: parent, depth: next.depth + 1 });
    }
  }
  return out;
}
