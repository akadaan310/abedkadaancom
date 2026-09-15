/** One program: what it is, the prompt in full, and a cabinet to run it in. */
import { notFound } from 'next/navigation';
import { PROGRAMS, programBySlug } from '../../../lab/arcade/programs';
import { configuredProviders } from '../../../lab/models/providers';
import { ArcadeRunner } from '../../arcade-runner';
import { Band, Tag } from '../../ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = programBySlug(slug);
  return program
    ? { title: `${program.name} — LLM Arcade`, description: program.kicker }
    : { title: 'Program not found' };
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = programBySlug(slug);
  if (!program) notFound();

  const index = PROGRAMS.findIndex((p) => p.slug === slug);
  const next = PROGRAMS[(index + 1) % PROGRAMS.length]!;
  const free = configuredProviders().length > 0;

  return (
    <>
      <div className="cover">
        <span className="kicker">LLM Arcade · {program.category.toLowerCase()}</span>
        <h1 className="headline headline--sm">{program.name}</h1>
        <p className="dek">{program.kicker}</p>
        <div className="byline">
          <span>{program.conversational ? 'Multi-turn' : 'Single shot'}</span>
          <span>{program.tier === 'strong' ? 'Wants a strong model' : 'Runs on a fast model'}</span>
          <span>{free ? 'Free to run here' : 'Bring your own key'}</span>
        </div>
      </div>

      <hr className="rule-heavy" />

      <div className="feature" style={{ marginTop: '2rem' }}>
        {program.what.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <ArcadeRunner
        program={program.slug}
        conversational={program.conversational}
        inputLabel={program.inputLabel}
        placeholder={program.placeholder}
        example={program.example}
        maxInput={program.maxInput}
      />

      <Band label="The prompt">
        <div className="column">
          <p className="note">
            This is the whole program. Copy it into any model — hosted, local, whatever you already pay for. No
            attribution required and nothing to accept.
          </p>
        </div>
        <div className="prompt-block">
          <pre>{program.system}</pre>
        </div>
        <p className="note" style={{ marginTop: '0.85rem' }}>
          Use it as the system prompt. {program.conversational
            ? 'It is written to hold a conversation, so keep the history in the thread.'
            : 'It is written for a single exchange; each run is independent.'}
        </p>
      </Band>

      <Band label="Next">
        <ul className="contents">
          <li>
            <a href={`/arcade/${next.slug}`}>
              <span className="no">{next.category === 'GAME' ? '▶' : next.category === 'INSTRUMENT' ? '⊟' : '§'}</span>
              <span>
                <h3>{next.name}</h3>
                <span className="what">{next.kicker}</span>
              </span>
            </a>
          </li>
          <li>
            <a href="/arcade">
              <span className="no">—</span>
              <span>
                <h3>The whole catalogue</h3>
                <span className="what">All {PROGRAMS.length} programs.</span>
              </span>
            </a>
          </li>
        </ul>
      </Band>

      <Band label="Built on">
        <div className="column">
          <p className="note">
            <Tag tone="quiet">practice</Tag>{' '}
            These programs are the discipline of the laboratory, compressed into prompts. The same rules govern the
            system that runs on this site: <a href="/laboratory">see it working</a>, or read{' '}
            <a href="/constitution">the document it was built from</a>.
          </p>
          <p className="note">
            SDK-level access for developers is available by request —{' '}
            <a href="mailto:akadaan310@gmail.com?subject=Arcade%20SDK%20access">akadaan310@gmail.com</a>.
          </p>
        </div>
      </Band>
    </>
  );
}
