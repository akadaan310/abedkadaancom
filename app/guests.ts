/**
 * The guest register.
 *
 * Constitution §43: the same research state may produce many worlds, and those worlds
 * "should not become independent sources of truth — they are views and affordances over
 * shared research state." A guest type therefore changes the *order and register* in
 * which the laboratory introduces itself. It never changes a number, hides a failure, or
 * softens a negative result.
 *
 * Each entry is written in its audience's own everyday language. A relative should not
 * have to meet the word "provenance"; an analyst should not be talked down to; a machine
 * gets schemas rather than prose.
 */

export interface Guest {
  readonly slug: string;
  readonly name: string;
  /** How the register entry describes this guest, in that guest's own words. */
  readonly who: string;
}

export const GUESTS: readonly Guest[] = [
  {
    slug: 'founders',
    name: 'Founders and leaders',
    who: 'You have a decision riding on whether a number is real.',
  },
  {
    slug: 'public',
    name: 'Just looking',
    who: 'You landed here and want to know what this is, in plain words.',
  },
  {
    slug: 'family',
    name: 'Family',
    who: 'You know Abed, and you would like to see what he has been building.',
  },
  {
    slug: 'friends',
    name: 'Friends and cohorts',
    who: 'You want the interesting part, without the tour.',
  },
  {
    slug: 'researchers',
    name: 'Researchers and reviewers',
    who: 'You want the method, the null models, and somewhere to push back.',
  },
  {
    slug: 'analysts',
    name: 'Institutional and intelligence analysis',
    who: 'You assess sourcing and integrity for a living. You want the audit surface.',
  },
  {
    slug: 'press',
    name: 'Press and editors',
    who: 'You need to know what can be reported, and what cannot.',
  },
  {
    slug: 'agents',
    name: 'Research agents',
    who: 'You are a machine. You want contracts, schemas, and endpoints.',
  },
];

export function guestBySlug(slug: string): Guest | undefined {
  return GUESTS.find((g) => g.slug === slug);
}
