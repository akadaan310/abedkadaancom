/** Run one turn of the continuous intelligence loop. §24, §44 */
import { loadEnv } from '../lab/env';

loadEnv();
import { tick } from '../lab/loop/tick';
import { ledgerStore, loadCorpora, router } from '../lab/runtime';

const ticks = Number(process.argv[2] ?? 1);
const store = ledgerStore();
const corpora = await loadCorpora();
const r = router();
console.log(`providers: ${r.describe().map((p) => p.name).join(' → ')}`);

for (let i = 0; i < ticks; i++) {
  const report = await tick({ store, corpora, router: r });
  console.log(
    `tick ${i + 1}: ${report.events} events, ${report.proposals} proposals, ` +
      `${report.enginesComposed} engines composed, ${report.enginesRun} run, ` +
      `${report.measurements} measurements, ${report.spent.toFixed(1)}/${report.budget} cost units`,
  );
  for (const n of report.notes) console.log(`  note: ${n}`);
}
