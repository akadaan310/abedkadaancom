/**
 * Live demonstrations.
 *
 * A demonstration must obey the same rule as the laboratory: computation establishes
 * results, a model only proposes (§11). Every demo therefore returns two separated
 * things — what was *computed*, and what a model *said* — plus the provenance of the
 * model call and a guard stating what the demonstration does not prove (§20, §28).
 */

export interface ComputedBlock {
  readonly label: string;
  readonly rows: readonly (readonly [string, string])[];
  readonly note?: string;
}

export interface ProposedBlock {
  readonly label: string;
  /** Pretty-printed structured output, or prose where the demo asked for prose. */
  readonly body: string;
  readonly schemaValid: boolean;
  readonly schemaProblems?: readonly string[];
}

export interface DemoProvenance {
  readonly provider: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly attempts: readonly { provider: string; model: string; ok: boolean; latencyMs: number; error?: string }[];
}

export interface DemoOutput {
  /** Results established by running real laboratory capabilities. */
  readonly computed: readonly ComputedBlock[];
  /** What a model proposed, if a model was involved. Never a computational fact. */
  readonly proposed?: ProposedBlock;
  /** What the laboratory refused, and why. The interesting half of a bounded system. */
  readonly enforcement?: readonly string[];
  readonly provenance?: DemoProvenance;
  /** What this demonstration does not establish. Always present. */
  readonly guard: string;
  /** Set when the demo could not run. Reported, never disguised as a result. */
  readonly unavailable?: { readonly reason: string; readonly detail: string };
  readonly elapsedMs: number;
}

export interface DemoDefinition {
  /** The service this demonstrates. */
  readonly service: string;
  readonly title: string;
  /** What the visitor is asked for, in plain words. */
  readonly ask: string;
  readonly input: {
    readonly label: string;
    readonly placeholder: string;
    readonly maxLength: number;
    readonly rows: number;
    readonly example: string;
  } | null;
  /** True when the demonstration calls a model; false when it is pure computation. */
  readonly usesModel: boolean;
  readonly run: (input: string) => Promise<DemoOutput>;
}
