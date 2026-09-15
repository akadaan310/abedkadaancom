/**
 * The constitution, and how to read what the laboratory reports.
 * §4 (the website is the paper), §53 (researcher / AI / computation), §93.
 *
 * The specification text is read from SPEC.md at request time, so this page cannot drift
 * from the document the system was actually built from.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Band, Tag } from '../ui';

export const dynamic = 'force-dynamic';

interface Section {
  readonly number: string;
  readonly title: string;
  readonly body: string;
}

async function loadConstitution(): Promise<{ sections: Section[]; error: string | null }> {
  try {
    const raw = await readFile(join(process.cwd(), 'SPEC.md'), 'utf8');
    const sections: Section[] = [];
    const parts = raw.split(/\n(?=# )/g);
    for (const part of parts) {
      const match = part.match(/^# (?:(\d+)\.\s*)?(.+?)\n([\s\S]*)$/);
      if (!match) continue;
      sections.push({
        number: match[1] ?? '—',
        title: (match[2] ?? '').trim(),
        body: (match[3] ?? '').replace(/^\s*-{3,}\s*$/gm, '').trim(),
      });
    }
    return { sections, error: null };
  } catch (err) {
    return { sections: [], error: (err as Error).message };
  }
}

export default async function Constitution() {
  const { sections, error } = await loadConstitution();

  return (
    <>
      <Band label="How to read this laboratory">
        <div className="column">
          <p className="lede">
            This site is not a report about research that happened elsewhere. It is the research environment itself,
            rendered.
          </p>
          <p className="note">
            Every instrument, measurement and null model shown here was computed by code in this repository, and every
            figure is traceable back to the material it came from.
          </p>
        </div>
      </Band>

      <Band label="Three kinds of claim, kept apart">
        <article className="record">
          <div className="record-head"><Tag tone="muted">Proposed</Tag></div>
          <p className="note tight">
            What a bounded model process suggested. It is a request for computation and carries no evidential weight,
            however fluent it reads. A proposal naming a capability the laboratory does not have is rejected before
            anything runs.
          </p>
        </article>
        <article className="record">
          <div className="record-head"><Tag tone="ink">Computed</Tag></div>
          <p className="note tight">
            What an executed instrument computed from named material at a named version, with a recorded seed. A
            statistic compared against a null model is an inference; one without a null model is descriptive only.
          </p>
        </article>
        <article className="record">
          <div className="record-head"><Tag tone="muted">Interpreted</Tag></div>
          <p className="note tight">
            What a human concluded. The computational system may discover patterns, relations and invariants; it does
            not convert them into interpretation, and never into theological certainty. That boundary stays visible
            rather than being erased.
          </p>
        </article>
        <article className="record">
          <div className="record-head"><Tag tone="stamp">Unresolved</Tag></div>
          <p className="note tight">
            What the laboratory cannot currently classify or compute. Absent capabilities are declared with a reason.
            A laboratory that always has an answer is not sophisticated; one that represents the boundary of what it
            knows is.
          </p>
        </article>
      </Band>

      <Band label="The loop">
        <pre>{`research state
   → observe      a bounded process reads the frontier and the capability register
   → propose      it emits a schema-validated proposal, never a conclusion
   → compose      the proposal becomes an instrument, type-checked against the register
   → audit        provenance, null model and hidden assumptions are inspected
   → compute      the instrument executes over versioned material with a recorded seed
   → measure      statistics are compared against a declared null model
   → challenge    a counterexample instrument attacks the result
   → record       everything, including failure, is appended to a hash-chained ledger
   → expose       this site
   → observe again`}</pre>
      </Band>

      <Band label="What would falsify what you see">
        <div className="column">
          <p className="note">
            Each measurement records a guard: a plain statement of what the number does not license. Each instrument
            declares its criteria before it runs, so the bar cannot move to fit the outcome. Each null model names the
            randomization and the seed it used, so it can be re-run. Where a result might depend on an arbitrary
            threshold or on one region of the material, a challenge instrument is composed to find out, and its verdict
            sits next to the claim it attacks.
          </p>
        </div>
      </Band>

      <Band label="The governing document" count={error ? 'unavailable' : `${sections.length} sections`}>
        <div className="column">
          <p className="note">
            The laboratory was built from this specification alone, with no prior codebase, SDK or framework assumed.
            It is reproduced in full, read from <span className="mono">SPEC.md</span> at request time so that this page
            cannot drift from the document the system was actually built from.
          </p>
        </div>

        {error && (
          <div className="stamp" style={{ marginTop: '1.5rem' }}>
            <span className="stamp-label">Document unavailable</span>
            SPEC.md could not be read in this runtime ({error}). The laboratory reports the absence rather than
            reproducing a copy that might differ from the original.
          </div>
        )}

        <div style={{ marginTop: '1.75rem' }}>
          {sections.map((s) => (
            <article className="record" key={`${s.number}-${s.title}`} id={`s${s.number}`}>
              <div className="record-head">
                <span className="mono" style={{ color: 'var(--faint)' }}>§{s.number}</span>
                <span className="spacer" />
              </div>
              <h3 className="record-title" style={{ fontSize: '0.98rem', letterSpacing: '0.04em' }}>{s.title}</h3>
              <pre style={{ marginTop: '0.6rem', whiteSpace: 'pre-wrap' }}>{s.body}</pre>
            </article>
          ))}
        </div>
      </Band>
    </>
  );
}
