/**
 * The public surface must not drift from the laboratory it describes.
 *
 * These are cheap structural checks that catch the failure mode this site cannot afford:
 * a page advertising something the system does not have.
 */
import { describe, expect, it } from 'vitest';
import { SERVICES, serviceBySlug } from '../app/services';
import { GUESTS, guestBySlug } from '../app/guests';
import { DEMOS, demoFor } from '@lab/demo';
import { PROVIDERS, configuredProviders, stripFences } from '@lab/models/providers';
import { buildRegistry, DECLARED_ABSENCES } from '@lab/capabilities/registry';

describe('the practice', () => {
  it('offers ten services with unique slugs and numbers', () => {
    expect(SERVICES).toHaveLength(10);
    expect(new Set(SERVICES.map((s) => s.slug)).size).toBe(10);
    expect(new Set(SERVICES.map((s) => s.no)).size).toBe(10);
  });

  it('leads with Time-Durable Communication', () => {
    expect(SERVICES[0]!.slug).toBe('time-durable-communication');
    expect(SERVICES[0]!.no).toBe('01');
  });

  it('states what every service is not', () => {
    for (const s of SERVICES) {
      expect(s.notThis.length, `${s.slug} must declare its boundary`).toBeGreaterThan(40);
      expect(s.dek.length).toBeGreaterThan(20);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });

  it('resolves by slug and 404s otherwise', () => {
    expect(serviceBySlug('time-durable-communication')).toBeDefined();
    expect(serviceBySlug('nonexistent')).toBeUndefined();
  });
});

describe('demonstrations', () => {
  it('gives every service exactly one demonstration', () => {
    expect(DEMOS).toHaveLength(SERVICES.length);
    for (const s of SERVICES) {
      expect(demoFor(s.slug), `${s.slug} has no demonstration`).toBeDefined();
    }
  });

  it('registers no demonstration for a service that does not exist', () => {
    for (const d of DEMOS) {
      expect(serviceBySlug(d.service), `${d.service} is not a service`).toBeDefined();
    }
  });

  it('bounds every input it accepts', () => {
    for (const d of DEMOS) {
      if (!d.input) continue;
      expect(d.input.maxLength).toBeGreaterThan(0);
      expect(d.input.maxLength).toBeLessThanOrEqual(2000);
    }
  });
});

describe('guest entrances', () => {
  it('are unique and resolvable', () => {
    expect(new Set(GUESTS.map((g) => g.slug)).size).toBe(GUESTS.length);
    for (const g of GUESTS) expect(guestBySlug(g.slug)).toBe(g);
    expect(guestBySlug('nonexistent')).toBeUndefined();
  });

  it('include the audiences the site is written for', () => {
    const slugs = GUESTS.map((g) => g.slug);
    for (const required of ['founders', 'family', 'researchers', 'analysts', 'press', 'agents']) {
      expect(slugs, `missing entrance: ${required}`).toContain(required);
    }
  });
});

describe('model providers', () => {
  it('privileges no vendor and names an env key for each', () => {
    for (const p of PROVIDERS) {
      expect(p.apiKeyEnv).toMatch(/_API_KEY$/);
      expect(p.baseUrl).toMatch(/^https:\/\//);
      expect(p.models.fast.length).toBeGreaterThan(0);
    }
  });

  it('reports none configured when the environment is empty', () => {
    const saved = PROVIDERS.map((p) => process.env[p.apiKeyEnv]);
    for (const p of PROVIDERS) delete process.env[p.apiKeyEnv];
    expect(configuredProviders()).toHaveLength(0);
    PROVIDERS.forEach((p, i) => {
      if (saved[i] !== undefined) process.env[p.apiKeyEnv] = saved[i]!;
    });
  });

  it('unwraps fenced JSON, which models emit regardless of instruction', () => {
    expect(stripFences('```json\n{"ok":true}\n```')).toBe('{"ok":true}');
    expect(stripFences('Here you go: {"ok":true} — hope that helps')).toBe('{"ok":true}');
    expect(stripFences('{"ok":true}')).toBe('{"ok":true}');
  });
});

describe('the site never advertises a capability the laboratory lacks', () => {
  it('keeps declared absences absent from the register', () => {
    const registry = buildRegistry();
    for (const absence of DECLARED_ABSENCES) {
      expect(registry.has(absence.name), `${absence.name} is declared absent but is registered`).toBe(false);
      expect(absence.detail.length).toBeGreaterThan(40);
    }
  });
});

describe('the arcade', () => {
  it('publishes twelve programs with unique slugs', async () => {
    const { PROGRAMS, programBySlug } = await import('@lab/arcade/programs');
    expect(PROGRAMS).toHaveLength(12);
    expect(new Set(PROGRAMS.map((p) => p.slug)).size).toBe(12);
    expect(programBySlug('null-hypothesis')).toBeDefined();
    expect(programBySlug('nonexistent')).toBeUndefined();
  });

  it('gives every program a substantial prompt and bounded input', async () => {
    const { PROGRAMS } = await import('@lab/arcade/programs');
    for (const p of PROGRAMS) {
      // The prompt is the product; a thin one is not worth giving away.
      expect(p.system.length, `${p.slug} prompt is too thin`).toBeGreaterThan(400);
      expect(p.what.length).toBeGreaterThan(0);
      expect(p.maxInput).toBeGreaterThan(0);
      expect(p.maxInput).toBeLessThanOrEqual(2000);
    }
  });

  it('covers every declared category', async () => {
    const { PROGRAMS, CATEGORIES } = await import('@lab/arcade/programs');
    for (const c of CATEGORIES) {
      expect(PROGRAMS.filter((p) => p.category === c.id).length, `no programs in ${c.id}`).toBeGreaterThan(0);
    }
  });

  it('caps conversation history so a run cannot grow without bound', async () => {
    const { renderConversation } = await import('@lab/arcade/run');
    const { programBySlug } = await import('@lab/arcade/programs');
    const program = programBySlug('null-hypothesis')!;
    const turns = Array.from({ length: 40 }, (_, i) => ({ role: 'user' as const, content: `turn ${i}` }));
    const rendered = renderConversation(program, turns);
    expect(rendered).not.toContain('turn 0');
    expect(rendered).toContain('turn 39');
  });

  it('rejects a bring-your-own provider that does not exist', async () => {
    const { runProgram, ArcadeError } = await import('@lab/arcade/run');
    await expect(
      runProgram({ program: 'the-refusal', turns: [{ role: 'user', content: 'hi' }], byo: { provider: 'not-a-provider', apiKey: 'x' } }),
    ).rejects.toThrow(ArcadeError);
  });
});
