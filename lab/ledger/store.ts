/**
 * Ledger storage port and adapters.
 *
 * The laboratory core does not know where its ledger lives. §58 separates research
 * state from presentation, and §74 warns against assuming unlimited persistent
 * execution: on a read-only serverless runtime the file adapter reports an explicit
 * capability absence (§90) instead of pretending the write succeeded.
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CapabilityUnavailable } from '../ontology/errors';
import type { Actor } from '../ontology/epistemic';
import { sealEvent, type EventPayload, type ResearchEvent } from './events';

export interface EventDraft {
  readonly actor: Actor;
  readonly payload: EventPayload;
  readonly timestamp?: string;
}

export interface LedgerStore {
  readonly name: string;
  readonly writable: boolean;
  read(): Promise<readonly ResearchEvent[]>;
  append(drafts: readonly EventDraft[]): Promise<readonly ResearchEvent[]>;
}

function sealBatch(existing: readonly ResearchEvent[], drafts: readonly EventDraft[], now: () => string) {
  const sealed: ResearchEvent[] = [];
  let seq = existing.length;
  let prev = existing.length > 0 ? existing[existing.length - 1]!.hash : null;
  for (const draft of drafts) {
    const event = sealEvent({
      seq,
      timestamp: draft.timestamp ?? now(),
      actor: draft.actor,
      payload: draft.payload,
      prev,
    });
    sealed.push(event);
    prev = event.hash;
    seq += 1;
  }
  return sealed;
}

/** In-memory ledger, used by tests and by any read-only runtime that still wants to simulate. */
export class MemoryLedgerStore implements LedgerStore {
  readonly name = 'memory';
  readonly writable = true;
  private events: ResearchEvent[];

  constructor(seed: readonly ResearchEvent[] = [], private readonly now: () => string = () => new Date().toISOString()) {
    this.events = [...seed];
  }

  async read(): Promise<readonly ResearchEvent[]> {
    return this.events;
  }

  async append(drafts: readonly EventDraft[]): Promise<readonly ResearchEvent[]> {
    const sealed = sealBatch(this.events, drafts, this.now);
    this.events.push(...sealed);
    return sealed;
  }
}

/** Append-only JSONL on disk. One event per line; the file is never rewritten. */
export class FileLedgerStore implements LedgerStore {
  readonly name: string;
  readonly writable: boolean;

  constructor(
    private readonly path: string,
    opts: { writable?: boolean; now?: () => string } = {},
  ) {
    this.name = `file:${path}`;
    this.writable = opts.writable ?? true;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  private readonly now: () => string;

  async read(): Promise<readonly ResearchEvent[]> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const events: ResearchEvent[] = [];
    for (const [i, line] of raw.split('\n').entries()) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      try {
        events.push(JSON.parse(trimmed) as ResearchEvent);
      } catch {
        throw new Error(`ledger ${this.path}: line ${i + 1} is not valid JSON; refusing to guess at history`);
      }
    }
    return events;
  }

  async append(drafts: readonly EventDraft[]): Promise<readonly ResearchEvent[]> {
    if (!this.writable) {
      throw new CapabilityUnavailable(
        'WRITE_EXPERIMENT',
        'PERMISSION_UNAVAILABLE',
        `ledger at ${this.path} is mounted read-only in this runtime`,
      );
    }
    const existing = await this.read();
    const sealed = sealBatch(existing, drafts, this.now);
    if (sealed.length === 0) return sealed;
    const body = sealed.map((e) => JSON.stringify(e)).join('\n') + '\n';
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await appendFile(this.path, body, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EROFS' || code === 'EACCES' || code === 'EPERM') {
        throw new CapabilityUnavailable(
          'WRITE_EXPERIMENT',
          'PERMISSION_UNAVAILABLE',
          `the runtime filesystem is read-only (${code}); the laboratory can observe and compute here but cannot record`,
        );
      }
      throw err;
    }
    return sealed;
  }
}
