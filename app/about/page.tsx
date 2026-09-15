/** §4: the website is the paper. §53: the human / AI / computation triangle. */
export default function About() {
  return (
    <>
      <h2>How to read this laboratory</h2>
      <p className="lede">
        This site is not a report about research that happened elsewhere. It is the research environment itself,
        rendered. Every engine, measurement and null model shown here was computed by code in this repository, and
        every number is traceable back to the text it came from.
      </p>

      <h2>The loop</h2>
      <div className="panel">
        <pre className="mono" style={{ color: 'var(--muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
{`research state
   → observe            a bounded process reads the current frontier
   → propose            it emits a structured proposal, never a conclusion
   → compose            the proposal becomes an Engine, checked against the registry
   → audit              provenance, null model and assumptions are inspected
   → compute            the Engine executes over versioned source data
   → measure            statistics are compared against a declared null model
   → challenge          a counterexample Engine attacks the result
   → record             everything, including failure, is appended to the ledger
   → expose             this website
   → observe again`}
        </pre>
      </div>

      <h2>Three kinds of claim, kept apart</h2>
      <div className="grid two">
        <div className="panel">
          <h3><span className="badge b-ai">AI proposal</span></h3>
          <p className="note">
            What a bounded model process suggested. It is a request for computation and carries no evidential weight,
            however fluent it reads. A proposal that names a capability the laboratory does not have is rejected
            before anything runs.
          </p>
        </div>
        <div className="panel">
          <h3><span className="badge b-computed">Engine result</span></h3>
          <p className="note">
            What an executed Engine computed from named data at a named version, with a recorded seed. A statistic
            compared against a null model is labelled an inference; one without a null model is descriptive only.
          </p>
        </div>
        <div className="panel">
          <h3><span className="badge b-researcher">Researcher interpretation</span></h3>
          <p className="note">
            What a human concluded. The computational system may discover patterns, relations and invariants; it does
            not convert them into interpretation, and never into theological certainty. That boundary is kept visible
            rather than erased.
          </p>
        </div>
        <div className="panel">
          <h3><span className="badge b-unresolved">Unresolved</span></h3>
          <p className="note">
            What the laboratory cannot currently classify or compute. Absent capabilities are declared with a reason.
            A laboratory that always has an answer is not sophisticated; one that represents the boundary of what it
            knows is.
          </p>
        </div>
      </div>

      <h2>What would falsify what you see</h2>
      <div className="panel">
        <p className="note">
          Each measurement records an interpretation guard: a plain statement of what the number does not license.
          Each Engine declares its evaluation criteria before it runs, so the bar cannot move to fit the outcome. Each
          null model names the randomization it used and the seed it used, so it can be re-run. Where a result depends
          on an arbitrary threshold or on one region of the corpus, a challenge Engine is composed to find out, and
          its verdict is shown next to the claim it attacks.
        </p>
      </div>

      <h2>Source and provenance</h2>
      <div className="panel">
        <p className="note">
          The ledger is append-only and hash-chained; nothing in this system can rewrite a past event. The working
          corpus is admitted as an unverified transcription and is labelled as such everywhere it appears. Results may
          be computed from it, but none can be promoted to canonical or published until a human researcher verifies
          the text against a named edition. That gate is enforced in code, not left to discipline.
        </p>
      </div>
    </>
  );
}
