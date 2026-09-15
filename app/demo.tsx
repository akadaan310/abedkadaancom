'use client';

import { useState } from 'react';
import type { DemoOutput } from '../lab/demo/types';

interface Props {
  service: string;
  title: string;
  ask: string;
  usesModel: boolean;
  input: { label: string; placeholder: string; maxLength: number; rows: number; example: string } | null;
}

/**
 * A live demonstration.
 *
 * The result is laid out in the same order the laboratory insists on: what was computed
 * first, what a model said second and clearly marked, what was refused third, and the
 * guard last. It degrades to a stated reason when a provider is unavailable.
 */
export function Demo({ service, title, ask, usesModel, input }: Props) {
  const [value, setValue] = useState(input?.example ?? '');
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<(DemoOutput & { remainingToday?: number | null }) | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('running');
    setResult(null);
    try {
      const response = await fetch(`/api/demo/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });
      setResult((await response.json()) as DemoOutput);
    } catch (err) {
      setResult({
        computed: [],
        guard: '',
        elapsedMs: 0,
        unavailable: { reason: 'NETWORK', detail: (err as Error).message },
      });
    }
    setState('done');
  }

  return (
    <section className="demo">
      <div className="demo-head">
        <span className="demo-label">Live demonstration{usesModel ? ' · calls a model' : ' · computation only'}</span>
        <h3 className="demo-title">{title}</h3>
        <p className="note">{ask}</p>
      </div>

      <form onSubmit={submit} className="demo-form">
        {input && (
          <>
            <label className="demo-field-label" htmlFor={`demo-${service}`}>
              {input.label}
              <span className="demo-count">{value.length}/{input.maxLength}</span>
            </label>
            <textarea
              id={`demo-${service}`}
              value={value}
              rows={input.rows}
              maxLength={input.maxLength}
              placeholder={input.placeholder}
              onChange={(e) => setValue(e.target.value)}
              spellCheck={false}
            />
          </>
        )}
        <button type="submit" disabled={state === 'running'}>
          {state === 'running' ? 'Running…' : input ? 'Run it' : 'Run the demonstration'}
        </button>
      </form>

      {state === 'running' && (
        <p className="note demo-running">
          {usesModel ? 'Calling a model, then checking what it returned.' : 'Computing.'}
        </p>
      )}

      {result && (
        <div className="demo-result">
          {result.unavailable && (
            <div className="stamp">
              <span className="stamp-label">{result.unavailable.reason.replace(/_/g, ' ')}</span>
              {result.unavailable.detail}
            </div>
          )}

          {result.computed.map((block) => (
            <div className="demo-block" key={block.label}>
              <span className="demo-block-label">Computed · {block.label}</span>
              <div className="scroll">
                <table>
                  <tbody>
                    {block.rows.map(([k, v], i) => (
                      <tr key={`${k}-${i}`}>
                        <th style={{ width: '42%' }}>{k}</th>
                        <td className="mono" style={{ wordBreak: 'break-word' }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {block.note && <p className="note demo-note">{block.note}</p>}
            </div>
          ))}

          {result.proposed && (
            <div className="demo-block">
              <span className="demo-block-label demo-block-label--model">
                Proposed by a model · {result.proposed.schemaValid ? 'schema valid' : 'schema invalid'} · not a finding
              </span>
              <pre className="demo-output">{result.proposed.body}</pre>
              {result.proposed.schemaProblems?.map((p, i) => (
                <p className="note demo-note" key={i}>{p}</p>
              ))}
            </div>
          )}

          {result.enforcement && result.enforcement.length > 0 && (
            <div className="demo-block">
              <span className="demo-block-label">Enforcement</span>
              <ul className="index">
                {result.enforcement.map((e, i) => (
                  <li key={i} className="note">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {result.guard && <p className="guard">{result.guard}</p>}

          <div className="demo-foot">
            {result.provenance
              ? `served by ${result.provenance.provider}/${result.provenance.model} in ${result.provenance.latencyMs} ms`
              : 'no model was called'}
            {result.elapsedMs ? ` · ${result.elapsedMs} ms total` : ''}
            {result.provenance && result.provenance.attempts.filter((a) => !a.ok).length > 0
              ? ` · tried first: ${result.provenance.attempts.filter((a) => !a.ok).map((a) => `${a.provider} (${a.error})`).join(', ')}`
              : ''}
          </div>
        </div>
      )}
    </section>
  );
}
