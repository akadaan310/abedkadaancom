/**
 * The arcade catalogue.
 *
 * Free, and free in the way that matters: the prompt itself is printed on every program
 * page, so anyone can take it and run it elsewhere without this site being involved.
 */
import { CATEGORIES, PROGRAMS, type ProgramCategory } from '../../lab/arcade/programs';
import { configuredProviders } from '../../lab/models/providers';
import { Band } from '../ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'LLM Arcade & Catalog — Abed Kadaan',
  description: 'Programmable prompts that turn a general model into a specific instrument. Free to take, free to run.',
};

export default async function Arcade({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const active = (CATEGORIES.find((x) => x.id === c?.toUpperCase())?.id ?? null) as ProgramCategory | null;
  const shown = active ? PROGRAMS.filter((p) => p.category === active) : PROGRAMS;
  const providers = configuredProviders();

  return (
    <>
      <div className="cover">
        <span className="kicker">LLM Arcade &amp; Catalog · Free</span>
        <h1 className="headline headline--sm">
          Prompts that turn a general model into a specific instrument.
        </h1>
        <p className="dek">
          Twelve programs built out of the practice&rsquo;s discipline: declare the test before the answer, separate
          what was established from what was guessed, and say plainly when you do not know. Run them here on this
          site&rsquo;s models, or bring your own key. The prompt is printed in full on every page — take it and go.
        </p>
        <div className="byline">
          <span>{PROGRAMS.length} programs</span>
          <span>{providers.length > 0 ? `${providers.length} models available free` : 'bring your own key'}</span>
          <span>No sign-up</span>
        </div>
      </div>

      <hr className="rule-heavy" />

      <nav className="cat-nav" style={{ marginTop: '1.5rem' }} aria-label="Categories">
        <a href="/arcade" {...(active === null ? { 'aria-current': 'true' as const } : {})}>All {PROGRAMS.length}</a>
        {CATEGORIES.map((cat) => (
          <a key={cat.id} href={`/arcade?c=${cat.id.toLowerCase()}`} {...(active === cat.id ? { 'aria-current': 'true' as const } : {})}>
            {cat.label} {PROGRAMS.filter((p) => p.category === cat.id).length}
          </a>
        ))}
      </nav>

      {CATEGORIES.filter((cat) => !active || cat.id === active).map((cat) => {
        const inCat = shown.filter((p) => p.category === cat.id);
        if (inCat.length === 0) return null;
        return (
          <Band key={cat.id} label={cat.label} count={`${inCat.length}`}>
            <div className="column">
              <p className="note">{cat.blurb}</p>
            </div>
            <ul className="contents" style={{ marginTop: '1.25rem' }}>
              {inCat.map((p) => (
                <li key={p.slug}>
                  <a href={`/arcade/${p.slug}`}>
                    <span className="no">{p.category === 'GAME' ? '▶' : p.category === 'INSTRUMENT' ? '⊟' : '§'}</span>
                    <span>
                      <h3>{p.name}</h3>
                      <span className="what">{p.kicker}</span>
                      <span className="for">{p.conversational ? 'Multi-turn' : 'Single shot'} · {p.tier === 'strong' ? 'Wants a strong model' : 'Runs on a fast model'}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Band>
        );
      })}

      <Band label="Developer access">
        <div className="column">
          <p className="note">
            These programs are also available at SDK level — the prompts, their contracts, and the runner behind
            them, callable from your own application rather than through this page.
          </p>
          <p className="note">
            Access is by request while it is in early hands. Write to{' '}
            <a href="mailto:akadaan310@gmail.com?subject=Arcade%20SDK%20access">akadaan310@gmail.com</a> saying what
            you want to build with it, and you will get an answer either way.
          </p>
          <p className="note">
            The participation contract these programs are built on is already public and needs no permission:{' '}
            <a href="/api/contract">/api/contract</a>.
          </p>
        </div>
      </Band>

      <Band label="On the word free">
        <div className="column">
          <p className="note">
            The prompts are given away outright: printed in full, no attribution required, no licence to accept. The
            hosted runs are free within a daily ceiling, because they cost money and an open endpoint attracts
            scrapers before it attracts people. When the ceiling is reached the page says so and you can supply your
            own key — which is used for that one call and never stored.
          </p>
        </div>
      </Band>
    </>
  );
}
