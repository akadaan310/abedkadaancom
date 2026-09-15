/**
 * The practice. Ten services.
 *
 * Each is grounded in something demonstrable in this repository, and each carries a
 * `notThis` line — what the service is *not*. A practice whose entire argument is that it
 * does not overclaim cannot open with a sales page that overclaims.
 */

export interface Service {
  readonly no: string;
  readonly slug: string;
  readonly name: string;
  /** The one-line statement of the offer. */
  readonly dek: string;
  readonly body: readonly string[];
  readonly forWhom: string;
  /** The honest boundary. Printed next to the offer, not buried. */
  readonly notThis: string;
  /** What in the laboratory demonstrates this, if anything does yet. */
  readonly evidence?: { readonly label: string; readonly href: string };
}

export const SERVICES: readonly Service[] = [
  {
    no: '01',
    slug: 'time-durable-communication',
    name: 'Time-Durable Communication',
    dek: 'Reading a record back across time, and building records that still hold up decades forward.',
    body: [
      'Most information does not survive its own context. A dataset outlives the person who knew which column was a guess. A finding outlives the caveat that made it honest. A text outlives the edition it was set from. What is left is a number with no way to ask it a question.',
      'This service works in both directions. Backward: recovering what a record actually encodes — what can be established from it, what cannot, and what was lost in every transformation between the source and the claim. Forward: constructing records that a stranger can verify in fifty years without you present to explain them.',
      'In practice that means content-addressed identity, so a thing and a changed thing are provably different things; declared information loss at every transformation, so nobody later mistakes a normalisation for the original; an append-only record with no update path, so a correction is a new entry and the mistake stays visible; and a stated verification status that travels with the material and governs what may be done with it.',
    ],
    forWhom: 'Archives, long-horizon research programmes, institutions whose records must outlive their staff.',
    notThis: 'Not digitisation, and not storage. The hard part is not keeping the bytes — it is keeping the meaning, the uncertainty and the chain of custody attached to them.',
    evidence: { label: 'The ledger and its chain verification', href: '/ledger' },
  },
  {
    no: '02',
    slug: 'measurement-design',
    name: 'Measurement Design',
    dek: 'You have a question that no off-the-shelf metric answers. I build the instrument.',
    body: [
      'The common failure is not bad analysis. It is reaching for the nearest available metric because it exists, and then quietly redefining the question to be the one that metric answers.',
      'This is the opposite move: start from the question, work out what would actually have to be computed to address it, and build that — with the criteria for success fixed in writing before anything runs, so the threshold cannot be chosen after the number is known.',
    ],
    forWhom: 'Teams measuring something genuinely new, where the existing metric is borrowed and everyone knows it.',
    notThis: 'Not a dashboard. An instrument that reports "no effect" is a working instrument, and you should expect to be told that.',
    evidence: { label: 'Every instrument, and why it formed', href: '/engines' },
  },
  {
    no: '03',
    slug: 'adversarial-validation',
    name: 'Adversarial Validation',
    dek: 'You have a result. I try to break it, properly, before someone else does.',
    body: [
      'A result is worth what it survives. The work is designing the null model your result should have been tested against, the control that would expose it if it were an artefact, and the holdout that shows whether it generalises or rests on one region of your data.',
      'The laboratory on this site caught exactly this failure in its own first instrument: a significant-looking clustering result that scored just as well on synthetic data containing no structure at all. The null model was circular. That is the class of error this service exists to find.',
    ],
    forWhom: 'Anyone about to publish, ship, fundraise on, or make a decision from a number.',
    notThis: 'Not a rubber stamp. If the result holds, you get the evidence that it holds. If it does not, you find out from me rather than from a reviewer or a journalist.',
    evidence: { label: 'The result that was not there', href: '/dispatches/the-result-that-wasnt' },
  },
  {
    no: '04',
    slug: 'evidence-architecture',
    name: 'Evidence Architecture',
    dek: 'Systems that can show where every claim came from, including the ones they got wrong.',
    body: [
      'When a system makes claims, the question that eventually arrives is: what produced this, from which data, at which version, under which parameters, and who decided it was true? Most systems cannot answer. The answer has to be designed in from the start, because it cannot be reconstructed afterwards.',
      'Provenance that is machine-readable and queryable. A record that is tamper-evident rather than merely backed up. Failure kept as state instead of deleted. Audit as a routine that runs, not a document that is written.',
    ],
    forWhom: 'Regulated environments, safety cases, anyone who will one day be asked to prove a claim they made two years ago.',
    notThis: 'Not compliance theatre. The output is a system that answers the question, not a policy asserting that it could.',
    evidence: { label: 'Trace any figure back to its source', href: '/observatory' },
  },
  {
    no: '05',
    slug: 'bounded-agents',
    name: 'Bounded Agent Systems',
    dek: 'AI that structurally cannot overclaim, because the boundary is in the data model.',
    body: [
      'The failure mode of an AI system is not usually a wrong answer. It is a confident answer that nothing checked — a model asserting a statistical result it never computed, in prose fluent enough that no one asked.',
      'The fix is architectural. A model process may propose, hypothesise, observe, interpret and object. It may not author a computed result, it may not change a status, and it may not promote anything. Those are enforced as throwing guards on the types, not as instructions in a prompt. A proposal naming a capability the system does not have is rejected before it runs. Any model from any vendor participates on identical terms.',
    ],
    forWhom: 'Teams putting agents somewhere the cost of a confident wrong answer is real.',
    notThis: 'Not prompt engineering, and not a guardrail bolted on afterwards. If the boundary can be argued with, it is not a boundary.',
    evidence: { label: 'The participation contract', href: '/capabilities' },
  },
  {
    no: '06',
    slug: 'corpus-construction',
    name: 'Corpus Construction and Verification',
    dek: 'Turning material into research-grade material, with its uncertainty attached.',
    body: [
      'Admitting a source is a decision, and it should be recorded as one. What edition, what transcription, checked by whom, and what may be done with results computed from it before a human has verified it.',
      'The laboratory here holds a Qur’anic working set admitted as an unverified transcription. It is labelled as such on every page it appears, and the system refuses in code to mark any result resting on it as settled. That restriction is the product, not an apology for the data.',
    ],
    forWhom: 'Textual, historical, legal and scientific corpora where provenance decides what the work is worth.',
    notThis: 'Not scraping, and not cleaning. The deliverable includes the parts you are not allowed to trust yet.',
    evidence: { label: 'The corpus register', href: '/corpus' },
  },
  {
    no: '07',
    slug: 'forensic-review',
    name: 'Forensic Review',
    dek: 'Independent examination of a model, a dataset, a benchmark, or a published claim.',
    body: [
      'A vendor benchmark, an internal result, a paper you are about to build on, a dataset you are about to buy. The review reconstructs what was actually done, identifies the assumptions doing the load-bearing work, and states plainly which conclusions survive and which do not.',
      'Findings are written so that a non-specialist decision-maker and a specialist reviewer can both act on them, and every criticism is reproducible rather than asserted.',
    ],
    forWhom: 'Investors, acquirers, editors, boards, and teams inheriting someone else’s analysis.',
    notThis: 'Not an endorsement service. The conclusion is whatever the examination finds, and it is delivered in writing either way.',
  },
  {
    no: '08',
    slug: 'decision-support',
    name: 'Decision Support Under Uncertainty',
    dek: 'Whether a number is solid enough to bet on — and what would change the answer.',
    body: [
      'Leaders rarely need more analysis. They need to know how much weight a specific number will bear, what would have to be true for it to be wrong, and what the cheapest test is that would find out.',
      'The deliverable is short: what is established, what is inferred, what is assumed, what is unknown, and the smallest piece of work that would move something from one column to the next.',
    ],
    forWhom: 'Founders and executives making a decision that turns on evidence they did not produce.',
    notThis: 'Not strategy consulting, and not a recommendation dressed as analysis. Where the evidence does not decide the question, the report says the evidence does not decide the question.',
  },
  {
    no: '09',
    slug: 'laboratory-installation',
    name: 'Laboratory Installation',
    dek: 'Standing the loop up inside your organisation, so it runs without me.',
    body: [
      'The whole cycle, installed and handed over: a register of what your systems can actually compute, instruments composed against it, criteria fixed before execution, results tested against declared null models, challenges run against your own findings, and every step recorded in a way that survives staff turnover.',
      'The engagement ends with your team running it and the documentation to keep running it.',
    ],
    forWhom: 'Research groups and technical organisations that want the method internalised rather than rented.',
    notThis: 'Not a retainer, and not a platform licence. The reference implementation is open, and you are meant to outgrow the engagement.',
    evidence: { label: 'The loop, running', href: '/observatory' },
  },
  {
    no: '10',
    slug: 'open-method',
    name: 'Open Method',
    dek: 'The method, the code and the failures published in the open — including this laboratory.',
    body: [
      'Everything demonstrated on this site is a working system with its source available, not a case study written after the fact. The negative results are published beside the positive ones, every measurement carries the null model it was tested against and a written statement of what it does not license, and the count of supported findings is computed from the ledger rather than asserted — including when that count is zero.',
      'Collaboration, replication, teaching and joint publication all sit here. Sponsoring open work is also possible, on the condition that sponsorship never decides an outcome.',
    ],
    forWhom: 'Researchers, institutions, funders and anyone who would rather check the work than be told about it.',
    notThis: 'Not marketing. If the open work contradicts something I have said elsewhere, the open work is the version that stands.',
    evidence: { label: 'The governing document', href: '/constitution' },
  },
];

export function serviceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
