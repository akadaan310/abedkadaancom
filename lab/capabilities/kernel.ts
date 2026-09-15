/**
 * The capability kernel. Constitution §66 (first-class capability system) and §61.
 *
 * A capability is a self-describing unit of real computation. It publishes what it
 * consumes, what it produces, what it costs, and what permissions it needs, so that an
 * Engine Composer can ask "what can I actually use?" instead of hallucinating tools (§66).
 * Capabilities are pure with respect to declared inputs: given the same values, config
 * and seed, they produce the same output, which is what §96 reproducibility rests on.
 */
import { contentId } from '../ontology/canonical';
import { provenance, type Provenance } from '../provenance/provenance';
import type { Actor } from '../ontology/epistemic';
import type {
  Corpus,
  Embedding,
  Locus,
  Measurement,
  Observable,
  Permission,
  Relation,
  Structure,
  TransformDeclaration,
} from '../ontology/types';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Values that flow between Engine steps. Typed so composition can be checked before it runs. */
export type LabValue =
  | { readonly type: 'LocusSet'; readonly corpusSlug: string; readonly loci: readonly Locus[] }
  | { readonly type: 'TextSet'; readonly corpusSlug: string; readonly items: readonly TextItem[] }
  | { readonly type: 'TokenSet'; readonly corpusSlug: string; readonly items: readonly TokenItem[] }
  | { readonly type: 'ProfileSet'; readonly corpusSlug: string; readonly items: readonly ProfileItem[]; readonly observables: readonly Observable[] }
  | { readonly type: 'RelationSet'; readonly nodes: readonly NodeRef[]; readonly relations: readonly Relation[] }
  | { readonly type: 'StructureValue'; readonly structure: Structure; readonly nodes: readonly NodeRef[] }
  | { readonly type: 'EmbeddingValue'; readonly embedding: Embedding; readonly nodes: readonly NodeRef[] }
  | { readonly type: 'MeasurementSet'; readonly measurements: readonly Measurement[] };

export type LabValueType = LabValue['type'];

export interface NodeRef {
  readonly id: string;
  readonly ref: string;
}
export interface TextItem extends NodeRef {
  readonly text: string;
  /** Marks removed by a recording transform, enabling an exact round-trip. §13 */
  readonly removed?: readonly { readonly index: number; readonly mark: string }[];
}
export interface TokenItem extends NodeRef {
  readonly tokens: readonly string[];
}
export interface ProfileItem extends NodeRef {
  readonly vector: Readonly<Record<string, number>>;
}

/** What a capability is given at run time. Nothing else is reachable from inside one. §50 */
export interface ComputeContext {
  readonly now: string;
  readonly actor: Actor;
  readonly corpora: ReadonlyMap<string, Corpus>;
  /** corpus slug → data version, carried into every provenance record. §65 */
  readonly sources: Readonly<Record<string, string>>;
  readonly seed: number;
  readonly engineId: string;
  readonly engineVersion: number;
  prov(init: {
    parents?: readonly string[];
    derivation?: readonly string[];
    configuration?: Record<string, unknown>;
    notes?: string;
  }): Provenance;
}

export interface Capability {
  readonly name: string;
  readonly purpose: string;
  readonly inputs: readonly LabValueType[];
  readonly output: LabValueType;
  readonly configKeys: readonly { readonly key: string; readonly type: string; readonly default: Json; readonly note: string }[];
  readonly costUnits: number;
  readonly latencyHintMs: number;
  readonly permissions: readonly Permission[];
  readonly dependencies: readonly string[];
  /** Present when this capability is a transformation; its claims are tested, not trusted. §13 */
  readonly transform?: TransformDeclaration;
  readonly run: (inputs: readonly LabValue[], config: Record<string, Json>, ctx: ComputeContext) => LabValue;
}

export class CapabilityRegistry {
  private readonly byName = new Map<string, Capability>();

  register(cap: Capability): this {
    if (this.byName.has(cap.name)) throw new Error(`capability ${cap.name} is already registered`);
    this.byName.set(cap.name, cap);
    return this;
  }

  get(name: string): Capability | undefined {
    return this.byName.get(name);
  }

  /** Throws rather than returning undefined: §90 forbids silently proceeding without a capability. */
  require(name: string): Capability {
    const cap = this.byName.get(name);
    if (!cap) {
      throw new Error(
        `CAPABILITY UNAVAILABLE: ${name} — COMPUTATION_UNSUPPORTED: not in the registry. ` +
          `Available: ${this.names().join(', ')}`,
      );
    }
    return cap;
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  names(): string[] {
    return [...this.byName.keys()].sort();
  }

  all(): Capability[] {
    return this.names().map((n) => this.byName.get(n)!);
  }

  /** The self-description a Nano-LLM sees. §66, §89 */
  describe(): {
    name: string;
    purpose: string;
    inputs: readonly string[];
    output: string;
    costUnits: number;
    permissions: readonly string[];
  }[] {
    return this.all().map((c) => ({
      name: c.name,
      purpose: c.purpose,
      inputs: c.inputs,
      output: c.output,
      costUnits: c.costUnits,
      permissions: c.permissions,
    }));
  }
}

/** Build a compute context bound to one engine run. */
export function computeContext(init: {
  now: string;
  actor: Actor;
  corpora: ReadonlyMap<string, Corpus>;
  sources: Record<string, string>;
  seed: number;
  engineId: string;
  engineVersion: number;
}): ComputeContext {
  return {
    ...init,
    prov(p) {
      return provenance({
        creator: init.actor,
        sources: init.sources,
        engineId: init.engineId,
        engineVersion: init.engineVersion,
        parents: p.parents ?? [],
        derivation: p.derivation ?? [],
        configuration: { seed: init.seed, ...(p.configuration ?? {}) },
        timestamp: init.now,
        ...(p.notes !== undefined ? { notes: p.notes } : {}),
      });
    },
  };
}

export function cfgNumber(config: Record<string, Json>, key: string, fallback: number): number {
  const v = config[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
export function cfgString(config: Record<string, Json>, key: string, fallback: string): string {
  const v = config[key];
  return typeof v === 'string' ? v : fallback;
}
export function cfgBool(config: Record<string, Json>, key: string, fallback: boolean): boolean {
  const v = config[key];
  return typeof v === 'boolean' ? v : fallback;
}

export function id(prefix: string, parts: unknown): string {
  return contentId(prefix, parts);
}

export type { Relation, Structure, Embedding, Measurement, Observable };
