/**
 * Computational ontology. Constitution §12.
 *
 * These are the durable primitives of the laboratory. Distinct concepts are kept
 * distinct even where they share a shape, because flattening them for architectural
 * convenience destroys the domain semantics the research depends on (§12, §39).
 */
import type { DiscoveryState, EngineStatus, EpistemicType, ExperimentStatus, Actor } from './epistemic';
import type { Provenance } from '../provenance/provenance';

// ---------------------------------------------------------------------------
// Research material
// ---------------------------------------------------------------------------

/**
 * How well the laboratory actually knows its own source text.
 * §87 and §90: the system must not silently promote an unverified transcription into
 * canonical source data, and it must be able to say what it does not know.
 */
export type SourceVerification =
  | 'VERIFIED_AGAINST_EDITION' // checked against a named printed/critical edition
  | 'UNVERIFIED_TRANSCRIPTION' // present and usable, but not yet checked by a human
  | 'SYNTHETIC';               // constructed by the laboratory for method testing

export interface Corpus {
  readonly kind: 'Corpus';
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly language: string;
  readonly script: string;
  readonly sourceVerification: SourceVerification;
  /** Free text naming the edition, file, or construction procedure behind this corpus. */
  readonly sourceStatement: string;
  readonly dataVersion: string;
  readonly loci: readonly Locus[];
  readonly epistemicType: Extract<EpistemicType, 'EXISTING'>;
}

/** An addressable position in a corpus: an ayah, a line, a record. §12, §38 */
export interface Locus {
  readonly kind: 'Locus';
  readonly id: string;
  readonly corpusSlug: string;
  /** Hierarchical address, coarse to fine, e.g. [112, 1] for surah 112 ayah 1. */
  readonly address: readonly number[];
  readonly ref: string;
  readonly text: string;
  readonly words: readonly Word[];
}

export interface Word {
  readonly kind: 'Word';
  readonly id: string;
  readonly locusId: string;
  readonly index: number;
  readonly surface: string;
}

export interface Segment {
  readonly kind: 'Segment';
  readonly id: string;
  readonly wordId: string;
  readonly index: number;
  readonly surface: string;
  readonly role: string;
}

export interface Span {
  readonly kind: 'Span';
  readonly id: string;
  readonly locusId: string;
  readonly start: number;
  readonly end: number;
}

// ---------------------------------------------------------------------------
// Observables and transformations. §13
// ---------------------------------------------------------------------------

/**
 * An Observable states what is being observed, what is retained, and what is
 * discarded. §13 makes the last of these mandatory: an observation that hides its
 * information loss cannot be reasoned about honestly.
 */
export interface Observable<V = unknown> {
  readonly kind: 'Observable';
  readonly id: string;
  readonly capability: string;
  readonly subjectId: string;
  readonly observes: string;
  readonly retains: readonly string[];
  readonly discards: readonly string[];
  readonly value: V;
  readonly provenance: Provenance;
  readonly epistemicType: Extract<EpistemicType, 'COMPUTED' | 'DERIVED'>;
}

/**
 * A declared transformation. §13 requires that reversibility and invariance claims be
 * *testable*, so a Transform declares them and the test suite checks them; the
 * declaration alone is never treated as evidence.
 */
export interface TransformDeclaration {
  readonly kind: 'TransformDeclaration';
  readonly capability: string;
  readonly operation: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly preserves: readonly string[];
  readonly discards: readonly string[];
  /** A declaration to be tested, never a fact to be trusted. §13 */
  readonly invertibility: 'INVERTIBLE' | 'LOSSY' | 'UNKNOWN';
  readonly conditions: readonly string[];
}

// ---------------------------------------------------------------------------
// Relations. §14
// ---------------------------------------------------------------------------

export const RELATION_KINDS = [
  'PROFILE_SIMILARITY',
  'LEXICAL_OVERLAP',
  'SKELETON_MATCH',
  'LENGTH_PROXIMITY',
  'SEQUENTIAL_ADJACENCY',
  'AI_SUGGESTED_AFFINITY',
] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

/** A relation is never a bare edge: it carries weight, evidence, and epistemic status. §14 */
export interface Relation {
  readonly kind: 'Relation';
  readonly id: string;
  readonly relationKind: RelationKind;
  readonly endpoints: readonly [string, string];
  readonly directed: boolean;
  readonly weight: number;
  readonly evidence: Evidence;
  readonly epistemicType: EpistemicType;
  readonly scope: string;
  readonly provenance: Provenance;
}

export interface Evidence {
  readonly kind: 'Evidence';
  readonly summary: string;
  readonly statistic?: string;
  readonly value?: number;
  readonly supportingIds: readonly string[];
  readonly details?: Record<string, number | string>;
}

// ---------------------------------------------------------------------------
// Structures, embeddings, measurements. §16
// ---------------------------------------------------------------------------

export interface Structure {
  readonly kind: 'Structure';
  readonly id: string;
  readonly structureKind: 'THRESHOLD_GRAPH' | 'COMPONENTS' | 'ORDERING';
  readonly nodes: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string; readonly weight: number }[];
  readonly groups?: readonly (readonly string[])[];
  readonly summary: Record<string, number>;
  readonly provenance: Provenance;
  readonly epistemicType: Extract<EpistemicType, 'COMPUTED' | 'DERIVED'>;
}

/**
 * A spatial representation. §16 and §42: geometry must have computational ancestry,
 * so an Embedding always names the structure and basis it was computed from.
 */
export interface Embedding {
  readonly kind: 'Embedding';
  readonly id: string;
  readonly method: string;
  readonly dimensions: number;
  readonly fromStructureId: string;
  readonly basis: string;
  readonly seed: number;
  readonly points: readonly { readonly id: string; readonly coords: readonly number[] }[];
  readonly provenance: Provenance;
  readonly epistemicType: Extract<EpistemicType, 'COMPUTED' | 'DERIVED'>;
}

/** A measurement with an explicit null model wherever it claims unusualness. §20 */
export interface Measurement {
  readonly kind: 'Measurement';
  readonly id: string;
  readonly statistic: string;
  readonly value: number;
  readonly subjectId: string;
  readonly nullModel?: NullModelResult;
  readonly interpretationGuard: string;
  readonly provenance: Provenance;
  readonly epistemicType: Extract<EpistemicType, 'COMPUTED' | 'DERIVED' | 'INFERENCE'>;
}

/**
 * The outcome of testing an observed statistic against a defined null model.
 * §20 forbids confusing "pattern detected" with "pattern exceeds null expectation".
 */
export interface NullModelResult {
  readonly kind: 'NullModelResult';
  readonly model: string;
  readonly description: string;
  readonly iterations: number;
  readonly seed: number;
  readonly observed: number;
  readonly nullMean: number;
  readonly nullStdDev: number;
  /** Fraction of null draws at least as extreme as the observation (one-sided, +1 smoothing). */
  readonly pValue: number;
  readonly exceedsNull: boolean;
  readonly alpha: number;
}

// ---------------------------------------------------------------------------
// Capabilities, Engines, Experiments. §61, §63, §66
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  'READ_RESEARCH_DATA',
  'COMPUTE_RELATION',
  'RUN_ENGINE',
  'PROPOSE_ENGINE',
  'WRITE_EXPERIMENT',
  'READ_PROVENANCE',
  'REQUEST_EXTERNAL_DATA',
  'CREATE_VIEW',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Why a capability the laboratory does not have is unavailable. §90 */
export type CapabilityAbsenceReason =
  | 'REQUIRED_DATASET_MISSING'
  | 'MODEL_UNAVAILABLE'
  | 'COMPUTATION_UNSUPPORTED'
  | 'PERMISSION_UNAVAILABLE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'RESOURCE_BUDGET_EXCEEDED';

export interface DeclaredAbsence {
  readonly name: string;
  readonly reason: CapabilityAbsenceReason;
  readonly detail: string;
}

export interface EngineStep {
  readonly capability: string;
  /** Names of prior step outputs (or `input`) this step consumes. */
  readonly from: readonly string[];
  readonly as: string;
  readonly config: Record<string, Json>;
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** An Engine is structured state, not a function reference. §7 */
export interface Engine {
  readonly kind: 'Engine';
  readonly id: string;
  readonly engineVersion: number;
  readonly name: string;
  readonly purpose: string;
  readonly question: string;
  readonly parentEngines: readonly string[];
  readonly capabilities: readonly string[];
  readonly steps: readonly EngineStep[];
  readonly inputs: Record<string, Json>;
  readonly outputs: readonly string[];
  readonly models: readonly string[];
  readonly evaluationProtocol: EvaluationProtocol;
  readonly nullModel: string | null;
  readonly dataVersions: Record<string, string>;
  readonly configuration: Record<string, Json>;
  readonly status: EngineStatus;
  readonly provenance: Provenance;
  /** Set when this Engine exists to challenge another. §19, §68 */
  readonly challenges?: string;
}

/** The criteria an Engine must meet to pass; declared before it runs. §7, §69 */
export interface EvaluationProtocol {
  readonly kind: 'EvaluationProtocol';
  readonly criteria: readonly EvaluationCriterion[];
  readonly alpha: number;
}

export interface EvaluationCriterion {
  readonly id: string;
  readonly description: string;
  readonly statistic: string;
  readonly comparator: 'gt' | 'gte' | 'lt' | 'lte';
  readonly threshold: number;
}

export interface Experiment {
  readonly kind: 'Experiment';
  readonly id: string;
  readonly question: string;
  readonly hypothesisId: string | null;
  readonly engineId: string;
  readonly engineVersion: number;
  readonly inputs: Record<string, Json>;
  readonly configuration: Record<string, Json>;
  readonly nullModel: string | null;
  readonly participants: readonly Actor[];
  readonly status: ExperimentStatus;
  readonly resultId: string | null;
  readonly provenance: Provenance;
}

/** What an Engine run produced, including what failed. §48 */
export interface EngineResult {
  readonly kind: 'EngineResult';
  readonly id: string;
  readonly engineId: string;
  readonly engineVersion: number;
  readonly experimentId: string;
  readonly ok: boolean;
  readonly failure?: FailureRecord;
  readonly relations: readonly Relation[];
  readonly structures: readonly Structure[];
  readonly embeddings: readonly Embedding[];
  readonly measurements: readonly Measurement[];
  readonly observables: readonly Observable[];
  readonly evaluation: EvaluationOutcome;
  readonly costUnits: number;
  readonly durationMs: number;
  readonly provenance: Provenance;
}

/** Failure is research state and is never erased. §48 */
export interface FailureRecord {
  readonly kind: 'FailureRecord';
  readonly attempted: string;
  readonly reason: string;
  readonly failedAssumptions: readonly string[];
  readonly boundaryDiscovered: string | null;
  readonly revisitWith: string | null;
}

export interface EvaluationOutcome {
  readonly kind: 'EvaluationOutcome';
  readonly passed: boolean;
  readonly checks: readonly {
    readonly criterionId: string;
    readonly statistic: string;
    readonly observed: number | null;
    readonly threshold: number;
    readonly comparator: string;
    readonly passed: boolean;
    readonly note?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Knowledge objects
// ---------------------------------------------------------------------------

export interface Hypothesis {
  readonly kind: 'Hypothesis';
  readonly id: string;
  readonly statement: string;
  readonly question: string;
  readonly testableAs: string;
  readonly proposedBy: Actor;
  readonly epistemicType: EpistemicType;
  readonly state: DiscoveryState;
  readonly supportCount: number;
  readonly challengeCount: number;
  readonly provenance: Provenance;
}

export interface Discovery {
  readonly kind: 'Discovery';
  readonly id: string;
  readonly statement: string;
  readonly state: DiscoveryState;
  readonly subjectIds: readonly string[];
  readonly measurementIds: readonly string[];
  readonly survivedChallenges: number;
  readonly failedChallenges: number;
  readonly epistemicType: EpistemicType;
  readonly provenance: Provenance;
}

export interface ResearcherNote {
  readonly kind: 'ResearcherNote';
  readonly id: string;
  readonly author: string;
  readonly timestamp: string;
  readonly scope: string;
  readonly content: string;
  readonly relatedIds: readonly string[];
  readonly epistemicType: EpistemicType;
  readonly provenance: Provenance;
}

/** AI prose is always marked and always linked to what it interprets. §92 */
export interface AiInterpretation {
  readonly kind: 'AiInterpretation';
  readonly id: string;
  readonly text: string;
  readonly interpretsIds: readonly string[];
  readonly author: Actor;
  readonly epistemicType: Extract<EpistemicType, 'AI_INTERPRETATION'>;
  readonly provenance: Provenance;
}

/** Disagreement is preserved, not synthesized away. §18 */
export interface Disagreement {
  readonly kind: 'Disagreement';
  readonly id: string;
  readonly subject: string;
  readonly positions: readonly {
    readonly actor: Actor;
    readonly stance: 'SUPPORTS' | 'OPPOSES' | 'ALTERNATIVE' | 'ABSTAINS';
    readonly claim: string;
  }[];
  readonly resolvedByEngineId: string | null;
  readonly provenance: Provenance;
}
