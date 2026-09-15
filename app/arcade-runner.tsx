'use client';

import { useState } from 'react';

interface Props {
  program: string;
  conversational: boolean;
  inputLabel: string;
  placeholder: string;
  example: string;
  maxInput: number;
}

interface Turn { role: 'user' | 'assistant'; content: string }
interface Meta { provider: string; model: string; latencyMs: number; usedOwnKey: boolean; remainingToday: number | null }

const PROVIDERS = ['groq', 'mistral', 'cerebras', 'openrouter'] as const;

/**
 * The cabinet.
 *
 * Runs on this site's models by default, or on a key the visitor supplies. A supplied key
 * lives in component state for the session only — it is sent with the request it is used
 * for and is never stored by this page or by the server.
 */
export function ArcadeRunner({ program, conversational, inputLabel, placeholder, example, maxInput }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [value, setValue] = useState(example);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<{ reason: string; detail: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<string>('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content || busy) return;

    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setValue('');
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/arcade/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program,
          turns: next,
          ...(apiKey.trim() ? { byo: { provider, apiKey: apiKey.trim(), ...(model.trim() ? { model: model.trim() } : {}) } } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError({ reason: data.error ?? 'FAILED', detail: data.detail ?? 'The run did not complete.' });
      } else {
        setTurns([...next, { role: 'assistant', content: data.text }]);
        setMeta({ provider: data.provider, model: data.model, latencyMs: data.latencyMs, usedOwnKey: data.usedOwnKey, remainingToday: data.remainingToday });
      }
    } catch (err) {
      setError({ reason: 'NETWORK', detail: (err as Error).message });
    }
    setBusy(false);
  }

  function reset() {
    setTurns([]);
    setMeta(null);
    setError(null);
    setValue(example);
  }

  return (
    <section className="cabinet">
      <div className="cabinet-head">
        <span className="cabinet-label">Run it</span>
        <button type="button" className="cabinet-toggle" onClick={() => setShowKey(!showKey)}>
          {showKey ? 'use this site’s models' : 'use your own key'}
        </button>
      </div>

      {showKey && (
        <div className="cabinet-key">
          <p className="note tight">
            Your key is sent with the request it is used for and is never stored or logged, here or on the server.
            It stays in this page for the session and disappears when you close the tab. If you would rather not,
            this site’s own models run the program for free.
          </p>
          <div className="cabinet-key-fields">
            <label>
              <span>Provider</span>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>API key</span>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off" spellCheck={false} />
            </label>
            <label>
              <span>Model (optional)</span>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="leave blank for the default" spellCheck={false} />
            </label>
          </div>
        </div>
      )}

      {turns.length > 0 && (
        <div className="transcript">
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'turn turn--user' : 'turn turn--model'}>
              <span className="turn-label">{t.role === 'user' ? 'You' : 'Program'}</span>
              <div className="turn-body">{t.content}</div>
            </div>
          ))}
          {busy && <div className="turn turn--model"><span className="turn-label">Program</span><div className="turn-body note">running…</div></div>}
        </div>
      )}

      {error && (
        <div className="stamp" style={{ marginTop: '1.25rem' }}>
          <span className="stamp-label">{error.reason.replace(/_/g, ' ')}</span>
          {error.detail}
        </div>
      )}

      <form onSubmit={send} className="cabinet-form">
        <label className="demo-field-label" htmlFor={`arcade-${program}`}>
          {turns.length > 0 && conversational ? 'Your reply' : inputLabel}
          <span className="demo-count">{value.length}/{maxInput}</span>
        </label>
        <textarea
          id={`arcade-${program}`}
          value={value}
          rows={3}
          maxLength={maxInput}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <div className="cabinet-actions">
          <button type="submit" disabled={busy || value.trim().length === 0}>
            {busy ? 'Running…' : turns.length > 0 ? 'Send' : 'Start'}
          </button>
          {turns.length > 0 && (
            <button type="button" className="cabinet-secondary" onClick={reset} disabled={busy}>
              Reset
            </button>
          )}
        </div>
      </form>

      {meta && (
        <div className="demo-foot">
          served by {meta.provider}/{meta.model} in {meta.latencyMs} ms
          {meta.usedOwnKey ? ' · using your key' : meta.remainingToday !== null ? ` · ${meta.remainingToday} free runs left on this instance today` : ''}
        </div>
      )}
    </section>
  );
}
