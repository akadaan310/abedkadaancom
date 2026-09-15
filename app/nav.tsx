'use client';

import { usePathname } from 'next/navigation';

/** The public navigation. The current section is marked for assistive tech and visually. */
export const SECTIONS = [
  ['/observatory', 'Observatory'],
  ['/engines', 'Engines'],
  ['/findings', 'Findings'],
  ['/frontier', 'Frontier'],
  ['/capabilities', 'Capabilities'],
  ['/corpus', 'Corpus'],
  ['/ledger', 'Ledger'],
  ['/constitution', 'Constitution'],
] as const;

export function PrimaryNav() {
  const pathname = usePathname();
  return (
    <nav className="primary" aria-label="Laboratory sections">
      {SECTIONS.map(([href, label]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <a key={href} href={href} {...(active ? { 'aria-current': 'page' as const } : {})}>
            {label}
          </a>
        );
      })}
    </nav>
  );
}
