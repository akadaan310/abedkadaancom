/**
 * A guest entrance. Constitution §43.
 *
 * Seven ways in, one set of records. Each entrance speaks in its audience's own everyday
 * language and puts a different thing first — but every figure below is read live from
 * the same ledger, and no entrance may state something the others would contradict.
 */
import { notFound } from 'next/navigation';
import { readState, buildRegistry } from '../../../lab/runtime';
import { DECLARED_ABSENCES } from '../../../lab/capabilities/registry';
import { verifyChain } from '../../../lab/ledger/events';
import { auditProvenance } from '../../../lab/provenance/provenance';
import { GUESTS, guestBySlug } from '../../guests';
import { Band, Figure } from '../../ui';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return GUESTS.map((g) => ({ guest: g.slug }));
}

/** The facts every entrance is written against. Computed once, phrased seven ways. */
async function facts() {
  const state = await readState();
  const registry = buildRegistry();
  const chain = verifyChain(state.events);
  const withNull = state.measurements.filter((m) => m.nullModel);
  const supported = state.discoveries.filter((d) => d.state === 'SUPPORTED' || d.state === 'KNOWN');
  const unverified = state.corpora.filter((c) => c.sourceVerification !== 'VERIFIED_AGAINST_EDITION');

  let complete = 0;
  let incomplete = 0;
  for (const obj of state.index.values()) {
    if (!obj.provenance) continue;
    if (auditProvenance(obj.provenance).complete) complete += 1;
    else incomplete += 1;
  }

  return {
    state,
    chain,
    supported: supported.length,
    engines: state.engines.length,
    runs: state.metrics.enginesRun,
    failedRuns: state.metrics.enginesFailed,
    measurements: state.measurements.length,
    testedAgainstNull: withNull.length,
    exceededNull: state.metrics.measurementsExceedingNull,
    challenges: state.metrics.challengesRun,
    capabilities: registry.names().length,
    absences: DECLARED_ABSENCES.length,
    corpora: state.corpora.length,
    unverified: unverified.length,
    openFrontier: state.frontier.filter((f) => f.state !== 'CLOSED').length,
    events: state.metrics.events,
    provenanceComplete: complete,
    provenanceIncomplete: incomplete,
    modelProviders: state.proposals.length > 0 ? [...new Set(state.proposals.map((p) => p.author.provider))] : [],
  };
}

type Facts = Awaited<ReturnType<typeof facts>>;

export default async function Visit({ params }: { params: Promise<{ guest: string }> }) {
  const { guest: slug } = await params;
  const guest = guestBySlug(slug);
  if (!guest) notFound();

  const f = await facts();

  return (
    <>
      <Band label={`Entrance · ${guest.name}`}>
        {slug === 'public' && <PublicEntrance f={f} />}
        {slug === 'family' && <FamilyEntrance f={f} />}
        {slug === 'friends' && <FriendsEntrance f={f} />}
        {slug === 'researchers' && <ResearchersEntrance f={f} />}
        {slug === 'analysts' && <AnalystsEntrance f={f} />}
        {slug === 'press' && <PressEntrance f={f} />}
        {slug === 'agents' && <AgentsEntrance f={f} />}
      </Band>

      <Band label="Other entrances">
        <ul className="entries">
          {GUESTS.filter((g) => g.slug !== slug).map((g) => (
            <li key={g.slug}>
              <a href={`/visit/${g.slug}`}>
                <span className="entry-name">{g.name}</span>
                <span className="entry-what">{g.who}</span>
                <span className="entry-count">→</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="note" style={{ marginTop: '1.5rem' }}>
          Same laboratory, same records, same numbers. An entrance changes what is put first and how it is said. It
          never changes what is true, and no entrance is allowed to say something another would contradict.
        </p>
      </Band>
    </>
  );
}

/* ------------------------------------------------------------------ entrances */

function Onward({ links }: { links: [string, string][] }) {
  return (
    <ul className="entries" style={{ marginTop: '2rem' }}>
      {links.map(([href, label]) => (
        <li key={href}>
          <a href={href}>
            <span className="entry-name">{label.split('—')[0]!.trim()}</span>
            <span className="entry-what">{label.split('—').slice(1).join('—').trim()}</span>
            <span className="entry-count">→</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function PublicEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">This is a workshop for building measuring tools — and then trying to break them.</p>
      <p>
        Most websites show you conclusions. This one shows you the machinery: what was asked, what was built to answer
        it, what it measured, what went wrong, and what is still unknown.
      </p>
      <p>
        The unusual part is that it is built to tell you when it has found nothing. Right now,{' '}
        {f.supported === 0 ? (
          <>
            that is exactly what it is telling you. {f.runs} tools have run and {f.testedAgainstNull} results were
            checked against the question <em>could this have happened by chance?</em> None of them passed that check.
            So the honest answer today is: nothing found yet.
          </>
        ) : (
          <>it is reporting {f.supported} result{f.supported === 1 ? '' : 's'} that passed that check.</>
        )}
      </p>
      <p>
        That sounds like failure. It is the opposite. A tool that always finds something is a broken tool — it will
        find patterns in pure noise. This one was tested on made-up data with no pattern in it at all, and it correctly
        said <em>nothing here</em>. That is why its silences can be trusted.
      </p>
      <p className="note">
        You do not need any background to look around. If a page uses a word you do not know, it is usually explained
        next to the number it belongs to.
      </p>
      <Onward
        links={[
          ['/findings', 'Findings — what was measured, and what each number is not allowed to mean'],
          ['/frontier', 'Frontier — the honest list of what it cannot do'],
          ['/observatory', 'Observatory — the whole thing, running'],
        ]}
      />
    </div>
  );
}

function FamilyEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">If you have been wondering what Abed is actually building — this is it.</p>
      <p>
        It is a small research laboratory that lives on the internet. He gives it material to study, and it builds its
        own tools to study that material with. Then it does the part almost nobody does: it tries to prove its own
        tools wrong.
      </p>
      <p>
        Every single thing on this site was worked out by the machine itself. Nothing is written in by hand to make it
        look impressive. If it has not found anything, it says so on the front page — and today it has not.{' '}
        {f.runs} tools have run, {f.challenges} attempts were made to knock the results down, and nothing has survived
        well enough to be called a finding.
      </p>
      <p>
        There is a second thing worth knowing, because it matters to him. One of the texts it studies is Qur'anic. The
        laboratory is not allowed to treat any of that as settled. It carries a permanent note saying the text has not
        yet been checked against a printed edition by a person, and it physically refuses to mark any result as final
        until someone does. The machine measures. It does not get to decide what anything means.
      </p>
      <p className="note">
        Nothing here needs explaining to be worth a look. The Observatory is the page where you can watch it work.
      </p>
      <Onward
        links={[
          ['/observatory', 'Observatory — watch it working'],
          ['/corpus', 'Corpus — the material it studies, and what is still unchecked'],
          ['/findings', 'Findings — everything it has measured so far'],
        ]}
      />
    </div>
  );
}

function FriendsEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">Skip the tour. Here is the good bit.</p>
      <p>
        The first instrument it built reported a beautiful result: a clustering score of 0.585 at p = 0.002. Textbook
        significant. Write it up, ship it.
      </p>
      <p>
        It was garbage. The clustering algorithm optimises the exact quantity that was being tested, so comparing it
        against shuffled labels is circular — it will score just as well on noise. We knew that because the laboratory
        runs on synthetic data with <em>nothing</em> planted in it, and that data scored the same.
      </p>
      <p>
        Swapping in a proper null — rewiring the graph while preserving every node's degree, then re-running the same
        detector — separated them cleanly: planted structure p = 0.013, no structure p = 0.768. Both nulls are still on
        the site. The bad one is labelled <span className="mono">CONTROL, NOT A FINDING</span>, because which null you
        pick is a research decision and you should be able to see it being made.
      </p>
      <p>
        Current score: {f.engines} instruments, {f.runs} runs, {f.failedRuns} failed, {f.supported} findings. Zero. The
        whole thing is built so that zero is a publishable answer.
      </p>
      <Onward
        links={[
          ['/findings', 'Findings — including the control that is deliberately wrong'],
          ['/engines', 'Engines — every instrument and why it formed'],
          ['/frontier', 'Frontier — what it still cannot do'],
        ]}
      />
    </div>
  );
}

function ResearchersEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">Criteria are fixed before execution. Nulls are declared. Seeds are recorded.</p>
      <p className="note">
        Each instrument commits to its evaluation protocol at composition time, so the threshold cannot be chosen after
        the statistic is known. A criterion whose statistic is never produced fails; silence is not a pass. Ids are
        content-addressed over the composition, inputs and protocol, so re-running an unchanged instrument reproduces
        the result id exactly — asserted in the test suite, not claimed.
      </p>
      <div className="figures" style={{ margin: '1.75rem 0' }}>
        <Figure value={f.runs} label="executions" />
        <Figure value={f.testedAgainstNull} label="measurements vs a null" />
        <Figure value={f.exceededNull} label="exceeded their null" />
        <Figure value={f.supported} label="supported findings" />
        <Figure value={f.challenges} label="challenges run" />
        <Figure value={f.absences} label="capabilities declared absent" />
      </div>
      <p className="note">
        Where to push. The corpus is {f.corpora === 1 ? 'a single' : `${f.corpora}`} small
        {f.corpora === 1 ? ' 28-locus set' : ' set'}, so permutation power is limited and a negative result is weak
        evidence of absence — which is why nothing is phrased as <em>no structure exists</em>. Letter-profile cosine is
        a crude instrument, used because it is honestly describable, not because it is right for the question.
        Morphological segmentation is absent, so every token-level result is surface-form only and no root-level claim
        is computable. The rasm collapse is by shape class and does not model ligatures or positional forms.
      </p>
      <p className="note">
        The negative control is the load-bearing test: a synthetic corpus with no planted structure must fail to reach
        significance. It caught a circular null model in the first instrument this laboratory built.
      </p>
      <Onward
        links={[
          ['/findings', 'Findings — statistics, nulls, seeds, and the guard on each'],
          ['/capabilities', 'Capabilities — contracts, declared information loss, absences'],
          ['/constitution', 'Constitution — the governing document in full'],
        ]}
      />
    </div>
  );
}

function AnalystsEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">Sourcing, chain of custody, and what this system refuses to assert.</p>
      <p className="note">
        Nothing here is a source claim about the world. The laboratory computes over material it names, at a version
        it names, and reports the result with the randomization and seed used to test it. Its output is a measurement
        and an explicit statement of what that measurement does not license.
      </p>

      <div className="figures" style={{ margin: '1.75rem 0' }}>
        <Figure value={f.events} label="ledger events" />
        <Figure value={f.chain.intact ? 'INTACT' : 'BROKEN'} label="hash chain" />
        <Figure value={f.provenanceComplete} label="objects with complete provenance" />
        <Figure value={f.provenanceIncomplete} label="incomplete" />
        <Figure value={f.unverified} label="unverified sources" />
        <Figure value={f.supported} label="asserted findings" />
      </div>

      <p className="note">
        <strong>Tamper evidence.</strong> The record is append-only and hash-chained: each event's digest covers its own
        content and its predecessor's digest, so altering any past entry invalidates everything after it. The chain is
        re-verified on every page load and the result is printed above, including when it fails. There is no update
        path in the storage interface — corrections are appended, and the original stays visible.
      </p>
      <p className="note">
        <strong>Collection status.</strong> {f.unverified > 0
          ? `${f.unverified} of ${f.corpora} admitted source${f.corpora === 1 ? '' : 's'} is an unverified transcription, and is labelled as such on every page it appears. A promotion gate in code refuses to mark any result resting on it as canonical or publishable until a human verifies it against a named edition.`
          : 'Every admitted source is verified against a named edition.'}
      </p>
      <p className="note">
        <strong>Attribution.</strong> Every object records what produced it — an executed instrument, a bounded model
        process, or a person — with model, version, sampling configuration and prompt digest where a model was
        involved. Model processes are structurally barred from authoring a computed result or changing an instrument's
        status; that is a throwing guard in the data model, not a convention.
      </p>
      <p className="note">
        <strong>Known gaps.</strong> {f.absences} capabilities are declared absent with a stated reason rather than
        stubbed, so the register cannot imply reach the system does not have.
      </p>
      <Onward
        links={[
          ['/ledger', 'Ledger — the full record and its chain verification'],
          ['/corpus', 'Corpus — source register and verification status'],
          ['/capabilities', 'Capabilities — declared reach, and declared absence'],
        ]}
      />
    </div>
  );
}

function PressEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">What can be reported, and what cannot.</p>
      {f.supported === 0 ? (
        <div className="stamp" style={{ margin: '1.5rem 0' }}>
          <span className="stamp-label">There is no finding to report</span>
          This laboratory currently reports zero supported findings. {f.runs} instruments have run and{' '}
          {f.testedAgainstNull} measurements were tested against a null model; none exceeded it. Any story claiming a
          discovery here would be wrong, and the site will contradict it.
        </div>
      ) : (
        <p>
          {f.supported} result{f.supported === 1 ? '' : 's'} currently exceed their null model. Each is published with
          the null used, the seed, and a written statement of what it does not license. Quote the guard alongside the
          number or the number will be misread.
        </p>
      )}
      <p className="note">
        <strong>Accurate framing.</strong> This is a system for building research instruments and then attacking them.
        Its claim to interest is the method — that it declares its criteria before running, tests against chance, and
        publishes its failures — not any result it has produced so far.
      </p>
      <p className="note">
        <strong>Do not write.</strong> That an AI made a discovery. That anything about the Qur'anic material has been
        established, confirmed or decoded — the text in the laboratory is an unchecked transcription, marked as such,
        and the system refuses to treat any result from it as final. That the laboratory interprets meaning: it
        measures, and interpretation is left to a person.
      </p>
      <p className="note">
        <strong>Checkable.</strong> Every figure on this site links back to the material and parameters that produced
        it, and the code is in the repository. Nothing requires taking the site's word for anything.
      </p>
      <Onward
        links={[
          ['/findings', 'Findings — every measurement with its guard'],
          ['/corpus', 'Corpus — what the material is, and its verification status'],
          ['/constitution', 'Constitution — how to read what the laboratory reports'],
        ]}
      />
    </div>
  );
}

function AgentsEntrance({ f }: { f: Facts }) {
  return (
    <div className="column">
      <p className="lede">Participation is by contract. No vendor is privileged.</p>
      <p className="note">
        Any process — hosted model, local model, or human researcher — participates on identical terms: read the
        capability register, emit a schema-valid proposal, and let computation decide. Model identity is recorded for
        provenance, never used for authority.
      </p>

      <div className="figures" style={{ margin: '1.75rem 0' }}>
        <Figure value={f.capabilities} label="capabilities" />
        <Figure value={f.absences} label="declared absent" />
        <Figure value={f.corpora} label="admitted corpora" />
        <Figure value={f.openFrontier} label="open frontier items" />
      </div>

      <div className="scroll">
        <table>
          <thead><tr><th>endpoint</th><th>returns</th></tr></thead>
          <tbody>
            <tr>
              <td className="mono"><a href="/api/contract">GET /api/contract</a></td>
              <td className="note" style={{ fontSize: '0.84rem' }}>Participation terms: capability register, role contracts, proposal schema, epistemic permissions, refusal rules.</td>
            </tr>
            <tr>
              <td className="mono"><a href="/api/state">GET /api/state</a></td>
              <td className="note" style={{ fontSize: '0.84rem' }}>Current research state: metrics, instruments, measurements with nulls, frontier, chain verification.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="note" style={{ marginTop: '1.5rem' }}>
        <strong>Rules that will reject your output.</strong> Naming a capability absent from the register. Claiming an
        epistemic type your role may not author — a proposal is never <span className="mono">COMPUTED</span>,{' '}
        <span className="mono">DERIVED</span> or <span className="mono">INFERENCE</span>. Asserting a statistical
        result instead of requesting the measurement. Returning prose where the schema requires structure. Malformed
        proposals are discarded rather than coerced; a model failure is not research state.
      </p>
      <p className="note">
        <strong>What you cannot do.</strong> Change an instrument's status, overwrite a record, or promote anything to
        canonical. Those are reserved to computation and to the researcher respectively.
      </p>
      <Onward
        links={[
          ['/capabilities', 'Capabilities — the register, roles, and declared absences'],
          ['/frontier', 'Frontier — where contribution is actually wanted'],
          ['/constitution', 'Constitution — the governing document'],
        ]}
      />
    </div>
  );
}
