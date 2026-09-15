/**
 * Engine composition and validation. Constitution §7, §61, §67.
 *
 * An Engine is structured state that can be checked before it is ever run: every step
 * must name a capability that exists, and every step's inputs must type-match what the
 * previous steps produce. This is what stops a Nano-LLM from proposing an instrument
 * out of capabilities the laboratory does not have (§66, §90).
 */
import { contentId } from '../ontology/canonical';
import { provenance } from '../provenance/provenance';
import type { CapabilityRegistry } from '../capabilities/registry';
import type { Actor } from '../ontology/epistemic';
import type { Engine, EngineStep, EvaluationProtocol } from '../ontology/types';
import type { ModelUse } from '../provenance/provenance';

export interface EngineSpec {
  readonly name: string;
  readonly purpose: string;
  readonly question: string;
  readonly steps: readonly EngineStep[];
  readonly inputs: Record<string, string | number | boolean | null>;
  readonly evaluationProtocol: EvaluationProtocol;
  readonly nullModel: string | null;
  readonly parentEngines?: readonly string[];
  readonly challenges?: string;
  readonly configuration?: Record<string, string | number | boolean | null>;
}

export interface CompositionProblem {
  readonly step: number;
  readonly problem: string;
}

/** Static check of a composition against the registry. Runs before execution, always. */
export function validateComposition(
  steps: readonly EngineStep[],
  registry: CapabilityRegistry,
): CompositionProblem[] {
  const problems: CompositionProblem[] = [];
  const produced = new Map<string, string>([['input', 'LocusSet']]);

  steps.forEach((step, i) => {
    const cap = registry.get(step.capability);
    if (!cap) {
      problems.push({
        step: i,
        problem: `capability "${step.capability}" is not in the registry (available: ${registry.names().join(', ')})`,
      });
      return;
    }
    if (step.from.length !== cap.inputs.length) {
      problems.push({
        step: i,
        problem: `${step.capability} takes ${cap.inputs.length} input(s) but ${step.from.length} were bound`,
      });
    }
    step.from.forEach((source, j) => {
      const actual = produced.get(source);
      const expected = cap.inputs[j];
      if (actual === undefined) {
        problems.push({ step: i, problem: `step input "${source}" is not produced by any earlier step` });
      } else if (expected !== undefined && actual !== expected) {
        problems.push({
          step: i,
          problem: `${step.capability} input ${j} expects ${expected} but "${source}" is a ${actual}`,
        });
      }
    });
    if (produced.has(step.as)) {
      problems.push({ step: i, problem: `step output name "${step.as}" is already used` });
    }
    produced.set(step.as, cap.output);
  });

  return problems;
}

/** Seal a validated spec into an Engine. Its id is content-addressed, so an identical
 *  composition is the same Engine and a changed one is provably a different Engine. §7, §96 */
export function composeEngine(init: {
  spec: EngineSpec;
  registry: CapabilityRegistry;
  actor: Actor;
  dataVersions: Record<string, string>;
  now: string;
  parents?: readonly string[];
  models?: readonly ModelUse[];
  rationale?: string;
}): Engine {
  const problems = validateComposition(init.spec.steps, init.registry);
  if (problems.length > 0) {
    throw new Error(
      `engine composition rejected:\n${problems.map((p) => `  step ${p.step}: ${p.problem}`).join('\n')}`,
    );
  }
  const capabilities = [...new Set(init.spec.steps.map((s) => s.capability))].sort();
  const engineVersion = 1;
  const id = contentId('eng', {
    name: init.spec.name,
    steps: init.spec.steps,
    inputs: init.spec.inputs,
    protocol: init.spec.evaluationProtocol,
    engineVersion,
  });

  return {
    kind: 'Engine',
    id,
    engineVersion,
    name: init.spec.name,
    purpose: init.spec.purpose,
    question: init.spec.question,
    parentEngines: init.spec.parentEngines ?? [],
    capabilities,
    steps: init.spec.steps,
    inputs: init.spec.inputs,
    outputs: init.spec.steps.map((s) => s.as),
    models: (init.models ?? []).map((m) => `${m.provider}/${m.model}@${m.modelVersion}`),
    evaluationProtocol: init.spec.evaluationProtocol,
    nullModel: init.spec.nullModel,
    dataVersions: init.dataVersions,
    configuration: init.spec.configuration ?? {},
    // Composed is not tested. An Engine begins PROPOSED and can only be promoted by
    // the explicit transitions in lab/engine/promote.ts. §7, §10
    status: 'PROPOSED',
    provenance: provenance({
      creator: init.actor,
      sources: init.dataVersions,
      parents: init.parents ?? [],
      derivation: capabilities,
      configuration: { ...init.spec.inputs, ...(init.spec.configuration ?? {}) },
      timestamp: init.now,
      models: init.models ?? [],
      ...(init.rationale ? { notes: init.rationale } : {}),
    }),
    ...(init.spec.challenges ? { challenges: init.spec.challenges } : {}),
  };
}
