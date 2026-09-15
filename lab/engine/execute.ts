/**
 * Engine execution. Constitution §11 (computation is the verification boundary), §61, §48.
 *
 * This is the only place in the laboratory where a claim becomes a computational result.
 * Nothing that happens upstream — however confident the prose — produces a Measurement.
 * Execution failures are captured as research state rather than thrown away (§48).
 */
import { contentId } from '../ontology/canonical';
import { provenance } from '../provenance/provenance';
import { computeContext, type LabValue } from '../capabilities/kernel';
import { seedFrom } from '../capabilities/rng';
import type { CapabilityRegistry } from '../capabilities/registry';
import { validateComposition } from './contract';
import type {
  Corpus,
  Embedding,
  Engine,
  EngineResult,
  EvaluationOutcome,
  FailureRecord,
  Measurement,
  Observable,
  Relation,
  Structure,
} from '../ontology/types';

export interface ExecuteOptions {
  readonly engine: Engine;
  readonly experimentId: string;
  readonly registry: CapabilityRegistry;
  readonly corpora: ReadonlyMap<string, Corpus>;
  readonly now: string;
  readonly seed?: number;
}

/**
 * Resolve a criterion's statistic against the measurements an engine produced.
 * `stat` reads the value; `stat.pValue` and `stat.exceedsNull` reach into the null model,
 * so an evaluation protocol can require significance rather than merely a large number.
 */
function resolveStatistic(measurements: readonly Measurement[], key: string): number | null {
  const [name, field] = key.split('.');
  const m = measurements.find((x) => x.statistic === name);
  if (!m) return null;
  if (!field) return m.value;
  if (field === 'pValue') return m.nullModel ? m.nullModel.pValue : null;
  if (field === 'exceedsNull') return m.nullModel ? (m.nullModel.exceedsNull ? 1 : 0) : null;
  if (field === 'nullMean') return m.nullModel ? m.nullModel.nullMean : null;
  return null;
}

function compare(observed: number, comparator: string, threshold: number): boolean {
  switch (comparator) {
    case 'gt': return observed > threshold;
    case 'gte': return observed >= threshold;
    case 'lt': return observed < threshold;
    case 'lte': return observed <= threshold;
    default: return false;
  }
}

function evaluate(engine: Engine, measurements: readonly Measurement[]): EvaluationOutcome {
  const checks = engine.evaluationProtocol.criteria.map((c) => {
    const observed = resolveStatistic(measurements, c.statistic);
    // A criterion whose statistic was never produced fails. Silence is not a pass. §56
    const passed = observed !== null && compare(observed, c.comparator, c.threshold);
    return {
      criterionId: c.id,
      statistic: c.statistic,
      observed,
      threshold: c.threshold,
      comparator: c.comparator,
      passed,
      ...(observed === null ? { note: 'statistic was not produced by this run' } : {}),
    };
  });
  return {
    kind: 'EvaluationOutcome',
    passed: checks.length > 0 && checks.every((c) => c.passed),
    checks,
  };
}

export function executeEngine(opts: ExecuteOptions): EngineResult {
  const started = Date.now();
  const { engine, registry, corpora, now } = opts;
  const seed = opts.seed ?? seedFrom([engine.id, engine.engineVersion, String(engine.inputs['corpus'])]);

  const relations: Relation[] = [];
  const structures: Structure[] = [];
  const embeddings: Embedding[] = [];
  const measurements: Measurement[] = [];
  const observables: Observable[] = [];
  const derivation: string[] = [];
  let costUnits = 0;

  const fail = (reason: string, failedAssumptions: string[], boundary: string | null): EngineResult => {
    const failure: FailureRecord = {
      kind: 'FailureRecord',
      attempted: `${engine.name}: ${engine.question}`,
      reason,
      failedAssumptions,
      boundaryDiscovered: boundary,
      revisitWith: null,
    };
    return {
      kind: 'EngineResult',
      id: contentId('res', { engine: engine.id, experiment: opts.experimentId, failure, now }),
      engineId: engine.id,
      engineVersion: engine.engineVersion,
      experimentId: opts.experimentId,
      ok: false,
      failure,
      relations,
      structures,
      embeddings,
      measurements,
      observables,
      evaluation: { kind: 'EvaluationOutcome', passed: false, checks: [] },
      costUnits,
      durationMs: Date.now() - started,
      provenance: provenance({
        creator: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
        sources: engine.dataVersions,
        engineId: engine.id,
        engineVersion: engine.engineVersion,
        parents: [engine.id],
        derivation,
        configuration: { seed, ...engine.inputs },
        timestamp: now,
        notes: `failed: ${reason}`,
      }),
    };
  };

  const problems = validateComposition(engine.steps, registry);
  if (problems.length > 0) {
    return fail(
      `composition is invalid: ${problems.map((p) => `step ${p.step}: ${p.problem}`).join('; ')}`,
      ['every step names a registered capability', 'step input types match'],
      'the engine was composed against a registry that no longer matches',
    );
  }

  const corpusSlug = String(engine.inputs['corpus'] ?? '');
  const corpus = corpora.get(corpusSlug);
  if (!corpus) {
    return fail(
      `corpus "${corpusSlug}" is not admitted to this laboratory`,
      ['the named corpus exists'],
      'engines cannot invent their own research material',
    );
  }

  const ctx = computeContext({
    now,
    actor: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
    corpora,
    sources: { [corpus.slug]: corpus.dataVersion },
    seed,
    engineId: engine.id,
    engineVersion: engine.engineVersion,
  });

  const values = new Map<string, LabValue>([
    ['input', { type: 'LocusSet', corpusSlug: corpus.slug, loci: corpus.loci }],
  ]);

  for (const [i, step] of engine.steps.entries()) {
    const cap = registry.require(step.capability);
    const inputs = step.from.map((name) => values.get(name)!);
    try {
      const output = cap.run(inputs, step.config, ctx);
      values.set(step.as, output);
      derivation.push(step.capability);
      costUnits += cap.costUnits;

      if (output.type === 'RelationSet') relations.push(...output.relations);
      if (output.type === 'StructureValue') structures.push(output.structure);
      if (output.type === 'EmbeddingValue') embeddings.push(output.embedding);
      if (output.type === 'MeasurementSet') measurements.push(...output.measurements);
      if (output.type === 'ProfileSet') observables.push(...output.observables);
    } catch (err) {
      return fail(
        `step ${i} (${step.capability}) failed: ${(err as Error).message}`,
        [`${step.capability} could run on the values produced upstream`],
        `the composition is well-typed but not viable on this data: ${(err as Error).message}`,
      );
    }
  }

  const evaluation = evaluate(engine, measurements);

  return {
    kind: 'EngineResult',
    id: contentId('res', {
      engine: engine.id,
      experiment: opts.experimentId,
      measurements: measurements.map((m) => [m.statistic, m.value]),
      seed,
    }),
    engineId: engine.id,
    engineVersion: engine.engineVersion,
    experimentId: opts.experimentId,
    ok: true,
    relations,
    structures,
    embeddings,
    measurements,
    observables,
    evaluation,
    costUnits,
    durationMs: Date.now() - started,
    provenance: provenance({
      creator: { kind: 'ENGINE', engineId: engine.id, engineVersion: engine.engineVersion },
      sources: { [corpus.slug]: corpus.dataVersion },
      engineId: engine.id,
      engineVersion: engine.engineVersion,
      parents: [engine.id, corpus.id],
      derivation,
      configuration: { seed, ...engine.inputs },
      timestamp: now,
      notes: evaluation.passed
        ? 'all declared evaluation criteria were met'
        : 'one or more declared evaluation criteria were not met',
    }),
  };
}
