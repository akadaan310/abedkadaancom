/** What the laboratory can currently say about itself. §89 */
import { readState, buildRegistry } from '../lab/runtime';
import { verifyChain } from '../lab/ledger/events';
import { DECLARED_ABSENCES } from '../lab/capabilities/registry';

const state = await readState();
const chain = verifyChain(state.events);
const m = state.metrics;

console.log(`programme: ${state.programme?.name ?? '(not started)'}`);
console.log(`ledger: ${m.events} events, chain ${chain.intact ? 'intact' : `BROKEN: ${chain.problems.join('; ')}`}`);
console.log(`corpora: ${state.corpora.map((c) => `${c.slug} (${c.loci.length} loci, ${c.sourceVerification})`).join(', ')}`);
console.log(`capabilities: ${buildRegistry().names().length} registered, ${DECLARED_ABSENCES.length} declared absent`);
console.log(`engines: ${m.enginesComposed} composed, ${m.enginesRun} run, ${m.enginesPassed} passed, ${m.enginesFailed} failed`);
console.log(`measurements: ${state.measurements.length}, of which ${m.measurementsWithNullModel} carry a null model, ${m.measurementsExceedingNull} exceed it`);
console.log(`discoveries: ${m.discoveriesSupported} supported, ${m.discoveriesRejected} rejected`);
console.log(`frontier: ${state.frontier.filter((f) => f.state !== 'CLOSED').length} open`);
console.log(`proposal yield: ${(m.proposalYield * 100).toFixed(0)}%  discovery yield: ${(m.discoveryYield * 100).toFixed(0)}%`);
