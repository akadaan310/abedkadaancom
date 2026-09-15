/**
 * The Engine Auditor. Constitution §69: an Engine should be auditable before promotion.
 * Also §27 and §29 — the checks a researcher would otherwise have to make by hand.
 */
import { auditProvenance } from '../provenance/provenance';
import type { CapabilityRegistry } from '../capabilities/registry';
import type { Corpus, Engine, EngineResult } from '../ontology/types';
import { validateComposition } from './contract';

export interface AuditReport {
  readonly passed: boolean;
  readonly findings: readonly string[];
  readonly warnings: readonly string[];
}

export function auditEngine(init: {
  engine: Engine;
  registry: CapabilityRegistry;
  corpora: ReadonlyMap<string, Corpus>;
  result?: EngineResult;
}): AuditReport {
  const { engine, registry, result } = init;
  const findings: string[] = [];
  const warnings: string[] = [];

  for (const p of validateComposition(engine.steps, registry)) {
    findings.push(`composition: step ${p.step}: ${p.problem}`);
  }

  const prov = auditProvenance(engine.provenance);
  for (const m of prov.missing) findings.push(`provenance: missing ${m}`);
  for (const w of prov.warnings) warnings.push(`provenance: ${w}`);

  if (engine.evaluationProtocol.criteria.length === 0) {
    findings.push('evaluation: the engine declares no criteria, so it can neither pass nor fail');
  }

  // §20: a statistical claim without a null model is not a finding.
  const claimsSignificance = engine.evaluationProtocol.criteria.some((c) => c.statistic.includes('.pValue') || c.statistic.includes('.exceedsNull'));
  if (claimsSignificance && !engine.nullModel) {
    findings.push('null model: the protocol tests significance but the engine names no null model');
  }

  // §21: every input must be traceable to a versioned source.
  if (Object.keys(engine.dataVersions).length === 0) {
    findings.push('provenance: no data versions recorded, so results cannot be reproduced');
  }

  // §90: hidden assumptions surfaced from the transform declarations actually used.
  for (const name of engine.capabilities) {
    const cap = registry.get(name);
    for (const condition of cap?.transform?.conditions ?? []) {
      warnings.push(`assumption (${name}): ${condition}`);
    }
  }

  const source = init.corpora.get(String(engine.inputs['corpus'] ?? ''));
  if (source && source.sourceVerification !== 'VERIFIED_AGAINST_EDITION') {
    warnings.push(
      `source: corpus "${source.slug}" is ${source.sourceVerification}; results may be computed but not published or ` +
        'made canonical until a researcher verifies the text',
    );
  }

  if (result) {
    const rp = auditProvenance(result.provenance);
    for (const m of rp.missing) findings.push(`result provenance: missing ${m}`);
    for (const m of result.measurements) {
      if (!m.interpretationGuard) findings.push(`measurement ${m.statistic}: no interpretation guard recorded`);
      if (m.epistemicType === 'INFERENCE' && !m.nullModel) {
        findings.push(`measurement ${m.statistic}: labelled INFERENCE without a null model`);
      }
    }
    if (result.measurements.length === 0 && result.ok) {
      warnings.push('result: the engine ran without producing any measurement');
    }
  }

  return { passed: findings.length === 0, findings, warnings };
}
