'use client';

import { usePathname } from 'next/navigation';

/** The records, as a secondary index. Kept out of the primary nav so the front of the
 *  publication stays quiet, and kept complete so no record is unreachable. */
export const LAB_SECTIONS = [
  ['/observatory', 'Observatory'],
  ['/engines', 'Engines'],
  ['/findings', 'Findings'],
  ['/frontier', 'Frontier'],
  ['/capabilities', 'Capabilities'],
  ['/corpus', 'Corpus'],
  ['/ledger', 'Ledger'],
  ['/geometry', 'Geometry'],
] as const;

export function LabNav() {
  const pathname = usePathname();
  return (
    <nav className="secondary" aria-label="Laboratory records">
      <a href="/laboratory" className="secondary-home">The Laboratory</a>
      <div className="secondary-links">
        {LAB_SECTIONS.map(([href, label]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <a key={href} href={href} {...(active ? { 'aria-current': 'page' as const } : {})}>
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
