/**
 * Seed the laboratory. Constitution §60: build the smallest real closed loop first.
 * This admits the research material and opens the first frontier items. It computes
 * nothing and concludes nothing — the loop does that.
 */
import { provenance } from '../lab/provenance/provenance';
import { contentId } from '../lab/ontology/canonical';
import { frontierItem } from '../lab/frontier/frontier';
import { ledgerStore, loadCorpora } from '../lab/runtime';
import type { EventDraft } from '../lab/ledger/store';

const store = ledgerStore();
const existing = await store.read();
if (existing.length > 0) {
  console.log(`ledger already has ${existing.length} events; seeding is append-only and was skipped`);
  process.exit(0);
}

const now = new Date().toISOString();
const corpora = await loadCorpora();
const system = { kind: 'SYSTEM' as const, component: 'seed' };
const prov = (derivation: string[]) =>
  provenance({
    creator: system,
    sources: Object.fromEntries(corpora.map((c) => [c.slug, c.dataVersion])),
    derivation,
    timestamp: now,
  });

const drafts: EventDraft[] = [
  {
    actor: system,
    payload: {
      type: 'RESEARCH_STARTED',
      programme: 'abedkadaan.com',
      statement:
        'A computational research laboratory in which bounded AI processes observe research state, propose ' +
        'instruments, and have those instruments computed, measured and challenged before anything counts as a result.',
    },
  },
  ...corpora.map((corpus) => ({ actor: system, payload: { type: 'CORPUS_ADMITTED' as const, corpus } })),
  {
    actor: system,
    payload: {
      type: 'QUESTION_CREATED',
      questionId: contentId('que', 'opening-question'),
      question:
        'Do the loci of this corpus fall into groups by any computable surface relation, beyond what a null model explains?',
      origin: 'researcher',
    },
  },
];

const items = [
  frontierItem({
    itemKind: 'QUESTION',
    state: 'UNEXPLORED',
    subject:
      'Do the loci of this corpus fall into groups by letter-profile similarity, beyond a degree-preserving null?',
    reason: 'The opening question of the programme. Nothing has been computed yet, so the answer is unknown.',
    novelty: 1,
    expectedInformationGain: 0.8,
    researchPriority: 0.9,
    uncertainty: 1,
    costEstimate: 12,
    dependencies: [],
    proposedBy: system,
    provenance: prov(['seed']),
  }),
  frontierItem({
    itemKind: 'QUESTION',
    state: 'UNEXPLORED',
    subject: 'Does shared token vocabulary relate loci across surah boundaries?',
    reason:
      'Lexical overlap is sparse on short undiacritized loci, so this may yield nothing. A negative result would ' +
      'itself bound what surface lexical relations can show on a corpus this size.',
    novelty: 0.9,
    expectedInformationGain: 0.6,
    researchPriority: 0.7,
    uncertainty: 1,
    costEstimate: 10,
    dependencies: [],
    proposedBy: system,
    provenance: prov(['seed']),
  }),
  frontierItem({
    itemKind: 'PROVENANCE_AUDIT',
    state: 'AWAITING_RESEARCHER',
    subject: 'Verify the working corpus against a printed edition',
    reason:
      'The corpus is admitted as UNVERIFIED_TRANSCRIPTION. Until a researcher verifies it against a named edition, ' +
      'no result computed from it may be promoted to canonical or published.',
    novelty: 0.2,
    expectedInformationGain: 1,
    researchPriority: 1,
    uncertainty: 0.5,
    costEstimate: 1,
    dependencies: [],
    proposedBy: system,
    provenance: prov(['seed']),
  }),
];
for (const item of items) drafts.push({ actor: system, payload: { type: 'FRONTIER_ITEM_ADDED', item } });

const written = await store.append(drafts);
console.log(`seeded ${written.length} events into ${store.name}`);
for (const c of corpora) console.log(`  corpus ${c.slug}: ${c.loci.length} loci, ${c.sourceVerification}`);
