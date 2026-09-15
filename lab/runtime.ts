/**
 * Runtime wiring. Constitution §58: the site renders research state; it is not the state.
 * This is the single place where the laboratory is assembled from its parts, so both the
 * website and the command-line scripts observe exactly the same ledger.
 */
import { join } from 'node:path';
import { FileLedgerStore, type LedgerStore } from './ledger/store';
import { project, type LabState } from './ledger/projection';
import { buildRegistry } from './capabilities/registry';
import { loadCorpusFile } from './corpus/loader';
import { NanoRouter } from './nano/router';
import type { Corpus } from './ontology/types';

export const LEDGER_PATH = process.env['LAB_LEDGER_PATH'] ?? join(process.cwd(), 'ledger', 'events.jsonl');
export const CORPUS_PATH = join(process.cwd(), 'lab', 'corpus', 'data', 'quran-short-surahs.json');

/** A serverless runtime gives a read-only filesystem; the store reports that honestly. §74, §90 */
export function ledgerStore(): LedgerStore {
  const writable = process.env['LAB_LEDGER_READONLY'] !== '1' && process.env['VERCEL'] !== '1';
  return new FileLedgerStore(LEDGER_PATH, { writable });
}

export async function loadCorpora(): Promise<Corpus[]> {
  return [await loadCorpusFile(CORPUS_PATH)];
}

export async function readState(): Promise<LabState> {
  return project(await ledgerStore().read());
}

export function router(): NanoRouter {
  return new NanoRouter({ openRouterApiKey: process.env['OPENROUTER_API_KEY'] });
}

export { buildRegistry };
