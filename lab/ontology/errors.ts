/**
 * Typed failures. Constitution §90: capability absence must be explicit, with a reason,
 * and the system must never let an AI hallucinate a capability it does not have.
 */
import type { CapabilityAbsenceReason, DeclaredAbsence } from './types';

export class CapabilityUnavailable extends Error {
  override readonly name = 'CapabilityUnavailable';
  readonly absence: DeclaredAbsence;
  constructor(name: string, reason: CapabilityAbsenceReason, detail: string) {
    super(`CAPABILITY UNAVAILABLE: ${name} — ${reason}: ${detail}`);
    this.absence = { name, reason, detail };
  }
}

/** A computation was asked for something its contract does not cover. §66 */
export class ContractViolation extends Error {
  override readonly name = 'ContractViolation';
}

/** A budget guard stopped work before it ran. §44, §75 */
export class BudgetExceeded extends Error {
  override readonly name = 'BudgetExceeded';
  constructor(readonly budget: string, readonly spent: number, readonly limit: number) {
    super(`budget ${budget} exhausted: ${spent} of ${limit}`);
  }
}
