/** Machine-readable research state. §21: the provenance graph should itself be queryable. */
import { readState } from '../../../lab/runtime';
import { verifyChain } from '../../../lab/ledger/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readState();
  return Response.json({
    programme: state.programme,
    chain: verifyChain(state.events),
    metrics: state.metrics,
    corpora: state.corpora.map((c) => ({
      slug: c.slug,
      title: c.title,
      loci: c.loci.length,
      sourceVerification: c.sourceVerification,
      dataVersion: c.dataVersion,
    })),
    engines: state.engines.map((e) => ({
      id: e.engine.id,
      name: e.engine.name,
      status: e.engine.status,
      steps: e.engine.steps.map((s) => s.capability),
      runs: e.runs,
      passes: e.passes,
      challenges: e.engine.challenges ?? null,
    })),
    measurements: state.measurements.map((m) => ({
      id: m.id,
      statistic: m.statistic,
      value: m.value,
      epistemicType: m.epistemicType,
      nullModel: m.nullModel ?? null,
      interpretationGuard: m.interpretationGuard,
    })),
    discoveries: state.discoveries,
    frontier: state.frontier.filter((f) => f.state !== 'CLOSED'),
    capabilityGaps: state.capabilityGaps,
    lastEventAt: state.lastEventAt,
  });
}
