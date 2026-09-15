/**
 * The offline proposer.
 *
 * This is NOT a language model and never claims to be. It is a small deterministic
 * search over the laboratory's own state that emits the same structured proposals a
 * Nano-LLM would, so the discovery loop is real and runnable with no API key and no
 * network. Its ModelUse records provider `local-heuristic`, which is what the website
 * displays — §57 forbids manufacturing the appearance of AI activity, and §86 forbids
 * hiding what actually produced a recommendation.
 *
 * It is deliberately weaker than a model at generating surprising questions (§31), and
 * exactly as strong at the thing that matters: whatever it proposes still has to survive
 * execution and a null model before it counts (§11).
 */
import { rankFrontier } from '../../frontier/frontier';
import type { FrontierItem } from '../../frontier/frontier';
import { seedFrom } from '../../capabilities/rng';
import { modelUse, type ModelProvider, type ProviderResponse } from '../provider';
import { NanoProposalBodySchema, type NanoContext, type NanoProposalBody, type NanoRole } from '../contract';

const MODEL_VERSION = 'heuristic-v1';

/**
 * Candidate compositions the proposer can assemble. These are the laboratory's standing
 * instrument designs; the proposer's job is choosing between them for a given question,
 * which is a composition search rather than a fixed pipeline (§67).
 */
function candidateCompositions(question: string, ctx: NanoContext) {
  const has = (n: string) => ctx.availableCapabilities.some((c) => c.name === n);
  const wantsLexical = /token|word|lexical|vocabulary|shared/i.test(question);
  const corpus = ctx.corpora[0]?.slug ?? '';

  const letterPath = [
    { capability: 'text.normalize.arabic', from: ['input'], as: 'normalized', config: {} },
    { capability: 'observable.letter_profile', from: ['normalized'], as: 'profiles', config: {} },
    { capability: 'relation.cosine_profile', from: ['profiles'], as: 'relations', config: { threshold: 0.85 } },
  ];
  const lexicalPath = [
    { capability: 'text.normalize.arabic', from: ['input'], as: 'normalized', config: {} },
    { capability: 'text.tokenize', from: ['normalized'], as: 'tokens', config: {} },
    { capability: 'relation.jaccard_tokens', from: ['tokens'], as: 'relations', config: { threshold: 0.2 } },
  ];

  const head = wantsLexical && has('relation.jaccard_tokens') ? lexicalPath : letterPath;

  const structuralTail = [
    { capability: 'structure.threshold_graph', from: ['relations'], as: 'graph', config: {} },
    { capability: 'structure.communities', from: ['graph'], as: 'communities', config: {} },
    { capability: 'measure.modularity', from: ['communities'], as: 'modularity', config: { iterations: 300 } },
  ];
  const spatialTail = [
    { capability: 'structure.threshold_graph', from: ['relations'], as: 'graph', config: {} },
    { capability: 'embedding.classical_mds', from: ['graph'], as: 'embedding', config: { dimensions: 2 } },
    { capability: 'measure.spatial_locality', from: ['embedding', 'relations'], as: 'locality', config: { iterations: 300 } },
  ];

  return [
    {
      name: `Structure engine over ${corpus}`,
      purpose: 'Test whether the chosen relation yields community structure beyond a degree-preserving null.',
      steps: [...head, ...structuralTail],
      nullModel: 'degree-preserving rewiring, re-detected with structure.communities',
      criteria: [
        { id: 'nondegenerate', description: 'The partition is not essentially all singletons.', statistic: 'partition_nondegeneracy', comparator: 'gte' as const, threshold: 0.3 },
        { id: 'exceeds-null', description: 'Modularity exceeds the rewiring null at the declared alpha.', statistic: 'newman_modularity.exceedsNull', comparator: 'gte' as const, threshold: 1 },
      ],
    },
    {
      name: `Spatial engine over ${corpus}`,
      purpose: 'Test whether an embedding of the relation graph actually carries the relation weights.',
      steps: [...head, ...spatialTail],
      nullModel: 'embedding-position permutation',
      criteria: [
        { id: 'locality-exceeds-null', description: 'Weight–distance locality exceeds the permutation null.', statistic: 'spatial_locality_correlation.exceedsNull', comparator: 'gte' as const, threshold: 1 },
      ],
    },
  ];
}

function discovererBody(ctx: NanoContext): NanoProposalBody {
  const ranked = rankFrontier(ctx.frontier as unknown as FrontierItem[]);
  const pick = ranked[0];
  if (!pick) {
    return {
      proposalType: 'ABSTAIN',
      summary: 'No actionable frontier item is available.',
      rationale:
        'Every frontier item is closed, awaiting a capability the laboratory does not have, or awaiting the researcher. ' +
        'Proposing work here would be activity without research value.',
      confidence: 0.9,
      epistemicType: 'UNRESOLVED',
      requests: [],
      evidenceIds: [],
      wouldBeWrongIf: 'a new frontier item is added, or a declared capability gap is filled',
    };
  }
  const gap = ctx.unusedCapabilities[0];
  return {
    proposalType: 'HYPOTHESIS',
    summary: `Investigate: ${pick.subject}`,
    rationale:
      `Selected from the frontier by expected information gain × priority × novelty ÷ cost. The item is ${pick.state} ` +
      `because: ${pick.reason}.` +
      (gap ? ` The capability ${gap} has not yet been used by any engine, so this run also tests an unused instrument.` : ''),
    confidence: 0.5,
    epistemicType: 'AI_HYPOTHESIS',
    requests: [
      {
        op: 'recordHypothesis',
        statement: pick.subject,
        testableAs: 'compose an engine ending in a measurement compared against a declared null model',
      },
    ],
    evidenceIds: [pick.id],
    wouldBeWrongIf: 'the measurement fails to exceed its null model, or the partition it rests on is degenerate',
  };
}

function composerBody(ctx: NanoContext): NanoProposalBody {
  const candidates = candidateCompositions(ctx.question, ctx);
  const known = new Set(ctx.existingEngines.map((e) => e.steps.join('>')));
  // Prefer a composition the laboratory has not already run: repeating an engine adds
  // reproducibility evidence but no new information, and §75 makes that trade explicit.
  const chosen = candidates.find((c) => !known.has(c.steps.map((s) => s.capability).join('>'))) ?? candidates[0]!;
  const missing = chosen.steps.map((s) => s.capability).filter((n) => !ctx.availableCapabilities.some((c) => c.name === n));

  if (missing.length > 0) {
    return {
      proposalType: 'CAPABILITY_REQUEST',
      summary: `Cannot compose: ${missing.join(', ')} not available`,
      rationale: 'The composition this question needs uses capabilities that are not in the registry.',
      confidence: 0.95,
      epistemicType: 'UNRESOLVED',
      requests: missing.map((name) => ({ op: 'requestCapability' as const, name, why: `required by ${chosen.name}` })),
      evidenceIds: [],
      wouldBeWrongIf: 'an equivalent composition exists using only registered capabilities',
    };
  }

  return {
    proposalType: 'ENGINE',
    summary: chosen.name,
    rationale:
      `${chosen.purpose} Chosen over ${candidates.length - 1} alternative composition(s) because it has not been run ` +
      'in this laboratory and it terminates in a measurement with a declared null model.',
    confidence: 0.6,
    epistemicType: 'AI_PROPOSAL',
    requests: [
      {
        op: 'composeEngine',
        name: chosen.name,
        purpose: chosen.purpose,
        question: ctx.question,
        steps: chosen.steps,
        nullModel: chosen.nullModel,
      },
    ],
    evidenceIds: [],
    wouldBeWrongIf: 'the composition type-checks but cannot run on this data, or the result depends on the threshold',
  };
}

function challengerBody(ctx: NanoContext): NanoProposalBody {
  const target = ctx.existingEngines.find((e) => e.status === 'PASSED') ?? ctx.existingEngines[0];
  if (!target) {
    return {
      proposalType: 'ABSTAIN',
      summary: 'Nothing to challenge yet.',
      rationale: 'No engine has produced a result, so there is no claim to attack.',
      confidence: 0.95,
      epistemicType: 'UNRESOLVED',
      requests: [],
      evidenceIds: [],
      wouldBeWrongIf: 'an engine completes a run',
    };
  }
  const relationStep = target.steps.find((s) => s.startsWith('relation.')) ?? 'relation.cosine_profile';
  const head =
    relationStep === 'relation.jaccard_tokens'
      ? [
          { capability: 'text.normalize.arabic', from: ['input'], as: 'normalized', config: {} },
          { capability: 'text.tokenize', from: ['normalized'], as: 'tokens', config: {} },
          { capability: 'relation.jaccard_tokens', from: ['tokens'], as: 'relations', config: { threshold: 0.2 } },
        ]
      : [
          { capability: 'text.normalize.arabic', from: ['input'], as: 'normalized', config: {} },
          { capability: 'observable.letter_profile', from: ['normalized'], as: 'profiles', config: {} },
          { capability: 'relation.cosine_profile', from: ['profiles'], as: 'relations', config: { threshold: 0.85 } },
        ];

  return {
    proposalType: 'COUNTEREXAMPLE',
    summary: `Challenge ${target.name}: threshold dependence and regional dependence`,
    rationale:
      'A community result on a thresholded similarity graph has two standard failure modes: the grouping may exist ' +
      'only at the chosen cutoff, and it may be carried entirely by one region of the corpus. Both are computable.',
    confidence: 0.7,
    epistemicType: 'AI_COUNTEREXAMPLE',
    requests: [
      {
        op: 'composeEngine',
        name: `Counterexample engine against ${target.name}`,
        purpose: 'Test whether the target result survives moving the threshold and removing a region of the corpus.',
        question: `Does ${target.name} report structure that is an artefact of its threshold or of one corpus region?`,
        steps: [
          ...head,
          { capability: 'challenge.threshold_stability', from: ['relations'], as: 'thresholdChallenge', config: { from: 0.8, to: 0.92, steps: 7 } },
        ],
        nullModel: null,
        challenges: target.id,
      },
    ],
    evidenceIds: [target.id],
    wouldBeWrongIf: 'the partition is stable across thresholds and survives every regional holdout',
  };
}

function auditorBody(ctx: NanoContext): NanoProposalBody {
  return {
    proposalType: 'OBSERVATION',
    summary: `${ctx.recentFindings.length} recent finding(s) reviewed for provenance completeness`,
    rationale:
      ctx.recentFindings.length === 0
        ? 'No results have been recorded yet, so there is nothing whose provenance could be incomplete.'
        : `Reviewed: ${ctx.recentFindings.slice(0, 3).join(' | ')}`,
    confidence: 0.6,
    epistemicType: 'AI_OBSERVATION',
    requests: [],
    evidenceIds: [],
    wouldBeWrongIf: 'an object is found whose provenance cannot name its engine, inputs and data version',
  };
}

export class LocalHeuristicProvider implements ModelProvider {
  readonly name = 'local-heuristic';
  readonly deterministic = true;
  readonly description =
    'A deterministic search over the laboratory\'s own state. Not a language model: it proposes from fixed rules over ' +
    'the frontier and the capability registry, and is recorded as such in every provenance entry.';

  async propose(role: NanoRole, context: NanoContext, now: string): Promise<ProviderResponse> {
    const started = Date.now();
    let body: NanoProposalBody;
    switch (role.name) {
      case 'ENGINE-COMPOSER':
        body = composerBody(context);
        break;
      case 'ENGINE-CHALLENGER':
        body = challengerBody(context);
        break;
      case 'PROVENANCE-AUDITOR':
        body = auditorBody(context);
        break;
      case 'INTERPRETER':
        body = {
          proposalType: 'ABSTAIN',
          summary: 'Interpretation is not offered by the offline proposer.',
          rationale:
            'Interpretive prose from a rule-based procedure would be a template, not a reading. §92 requires AI ' +
            'interpretation to be genuine and marked; a template dressed as interpretation is worse than silence.',
          confidence: 1,
          epistemicType: 'UNRESOLVED',
          requests: [],
          evidenceIds: [],
          wouldBeWrongIf: 'a language-model provider is configured',
        };
        break;
      default:
        body = discovererBody(context);
    }
    const parsed = NanoProposalBodySchema.parse(body);
    return {
      body: parsed,
      modelUse: modelUse({
        provider: this.name,
        model: 'frontier-search',
        modelVersion: MODEL_VERSION,
        role: role.name,
        deterministic: true,
        temperature: null,
        seed: seedFrom([role.name, context.question]),
        prompt: { role: role.name, question: context.question, frontier: context.frontier.map((f) => f.id) },
        output: parsed,
        costUnits: 0,
        latencyMs: Date.now() - started,
        timestamp: now,
      }),
    };
  }
}
