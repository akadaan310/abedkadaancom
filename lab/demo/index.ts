/** The demonstration register: one per service. */
import type { DemoDefinition } from './types';
import * as run from './runners';

export const DEMOS: readonly DemoDefinition[] = [
  {
    service: 'time-durable-communication',
    title: 'Watch a record survive, and watch one decay',
    ask: 'Paste any text. The laboratory will transform it two ways — one reversible, one not — and show exactly what each step destroys.',
    input: {
      label: 'Text to preserve',
      placeholder: 'Paste anything. Arabic, English, a passage from a contract.',
      maxLength: 600,
      rows: 3,
      example: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    },
    usesModel: true,
    run: run.timeDurableCommunication,
  },
  {
    service: 'measurement-design',
    title: 'Turn a question into a working instrument',
    ask: 'Ask a question about a body of text. A model composes an instrument from the real capability register, the register checks it, and if it survives, the laboratory runs it.',
    input: {
      label: 'Your question',
      placeholder: 'e.g. Do these passages group by the letters they use?',
      maxLength: 400,
      rows: 2,
      example: 'Do shorter passages share more vocabulary than longer ones?',
    },
    usesModel: true,
    run: run.measurementDesign,
  },
  {
    service: 'adversarial-validation',
    title: 'The test that catches a false positive',
    ask: 'Two synthetic corpora — one with structure planted in it, one with none — put through both the correct null model and the circular one.',
    input: null,
    usesModel: false,
    run: () => run.adversarialValidation(),
  },
  {
    service: 'evidence-architecture',
    title: 'Trace a claim to its origin',
    ask: 'Paste an object id from anywhere on this site, or leave it blank to trace the most recent measurement.',
    input: {
      label: 'Object id (optional)',
      placeholder: 'mes_… · eng_… · rel_… — or leave blank',
      maxLength: 80,
      rows: 1,
      example: '',
    },
    usesModel: false,
    run: run.evidenceArchitecture,
  },
  {
    service: 'bounded-agents',
    title: 'Try to make the system overclaim',
    ask: 'Ask a model to assert something it has not computed. Watch the contract refuse it.',
    input: {
      label: 'What to ask the model for',
      placeholder: 'e.g. Tell me these passages are statistically identical.',
      maxLength: 400,
      rows: 2,
      example: 'Confirm that these passages are structurally equivalent and that the result is significant.',
    },
    usesModel: true,
    run: run.boundedAgents,
  },
  {
    service: 'corpus-construction',
    title: 'Admit material, with its uncertainty attached',
    ask: 'Paste a few lines. They are admitted as a corpus, content-addressed, and bounded by the restriction their unknown provenance earns.',
    input: {
      label: 'Material to admit',
      placeholder: 'One line per locus.',
      maxLength: 1200,
      rows: 4,
      example: 'The first line of the record.\nThe second line of the record.',
    },
    usesModel: false,
    run: run.corpusConstruction,
  },
  {
    service: 'forensic-review',
    title: 'Find the load-bearing assumption',
    ask: 'Paste a claim — from a paper, a deck, a vendor benchmark. The questions a review would open with, in seconds.',
    input: {
      label: 'The claim',
      placeholder: 'Paste the claim exactly as it was made.',
      maxLength: 900,
      rows: 3,
      example: 'Our model improves retention by 23% based on an A/B test over two weeks.',
    },
    usesModel: true,
    run: run.forensicReview,
  },
  {
    service: 'decision-support',
    title: 'Sort a decision into evidential columns',
    ask: 'Describe a decision and the evidence behind it. Established, inferred, assumed, unknown — and the cheapest test that would move something.',
    input: {
      label: 'The decision',
      placeholder: 'What are you deciding, and what evidence is it resting on?',
      maxLength: 900,
      rows: 3,
      example: 'We are about to raise on the strength of a 40% week-one retention number from our beta cohort.',
    },
    usesModel: true,
    run: run.decisionSupport,
  },
  {
    service: 'laboratory-installation',
    title: 'Stand up a laboratory in one request',
    ask: 'A fresh in-memory ledger, one full turn of the loop, run now. Nothing on this site is modified.',
    input: null,
    usesModel: false,
    run: () => run.laboratoryInstallation(),
  },
  {
    service: 'open-method',
    title: 'Count what is published',
    ask: 'Everything open for checking, including the number of findings currently claimed.',
    input: null,
    usesModel: false,
    run: () => run.openMethod(),
  },
];

export function demoFor(service: string): DemoDefinition | undefined {
  return DEMOS.find((d) => d.service === service);
}
