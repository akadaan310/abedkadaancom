/**
 * Load .env.local for command-line entry points.
 *
 * Next.js does this for the website; the laboratory scripts run outside it, and should
 * observe the same configuration rather than silently falling back to the offline
 * proposer because a key was present but unread.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadEnv(file = '.env.local'): void {
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), file), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined && value !== '') process.env[key] = value;
  }
}
