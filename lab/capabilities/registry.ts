/**
 * The capability registry. Constitution §66, §89, §90.
 *
 * This is the laboratory's answer to "what can I actually use?" — and, just as
 * importantly, to "what can you not do?". Declared absences are first-class: an honest
 * empty space is worth more than a plausible stub, and §59 forbids placeholders that
 * falsely imply external engines exist.
 */
import { CapabilityRegistry } from './kernel';
import { arabicCapabilities } from './arabic';
import { relationCapabilities } from './relations';
import { structureCapabilities } from './structures';
import { measurementCapabilities } from './measurement';
import { challengeCapabilities } from './challenge';
import { geometryCapabilities } from './geometry';
import type { DeclaredAbsence } from '../ontology/types';

export function buildRegistry(): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  for (const cap of [
    ...arabicCapabilities,
    ...relationCapabilities,
    ...structureCapabilities,
    ...measurementCapabilities,
    ...challengeCapabilities,
    ...geometryCapabilities,
  ]) {
    registry.register(cap);
  }
  return registry;
}

/**
 * Capabilities the constitution anticipates that this laboratory does not have yet.
 *
 * These are published so a Nano-LLM asking for them receives a reason rather than a
 * hallucinated tool (§90), and so the frontier can carry an explicit AWAITING_CAPABILITY
 * item instead of quietly dropping the research direction (§46).
 */
export const DECLARED_ABSENCES: readonly DeclaredAbsence[] = [
  {
    name: 'morphology.segment_arabic',
    reason: 'REQUIRED_DATASET_MISSING',
    detail:
      'Morphological segmentation (root, pattern, clitics) needs a morphological database or analyser that is not ' +
      'present in this repository. Until it exists, every token-level result here is surface-form only, and any ' +
      'claim phrased in terms of roots is outside what this laboratory can currently compute. (§12, §38)',
  },
  {
    name: 'audio.align_recitation',
    reason: 'REQUIRED_DATASET_MISSING',
    detail:
      'Audio is a first-class research domain in §40, but no audio data or alignment model is present. AudioSegment, ' +
      'word alignment and reciter comparison are unimplemented rather than stubbed.',
  },
  {
    name: 'time.temporal_traversal',
    reason: 'REQUIRED_DATASET_MISSING',
    detail:
      'Temporal structure (§41) depends on recitation timing that arrives with audio. No timing source is available.',
  },
  {
    name: 'external.fetch_dataset',
    reason: 'PERMISSION_UNAVAILABLE',
    detail:
      'REQUEST_EXTERNAL_DATA is not granted to any role in this configuration. External scientific data cannot enter ' +
      'the laboratory without an explicit researcher-authorised capability grant. (§50)',
  },
  {
    name: 'engine.search_composition_space',
    reason: 'COMPUTATION_UNSUPPORTED',
    detail:
      'Exhaustive search over possible Engine compositions (§32) is not implemented. The Engine Composer currently ' +
      'generates and ranks a small set of candidate compositions rather than searching the space.',
  },
  {
    name: 'meta.engine_benchmark',
    reason: 'INSUFFICIENT_EVIDENCE',
    detail:
      'A Meta-Engine comparing Engines (§34) needs a population of Engines with comparable results. The laboratory ' +
      'records what it would need — engine families, shared primitives, benchmark outcomes — but has not yet run ' +
      'enough Engines for a comparison to mean anything.',
  },
];

export function absenceFor(name: string): DeclaredAbsence | undefined {
  return DECLARED_ABSENCES.find((a) => a.name === name);
}

export { CapabilityRegistry };
