'use client';

import { usePathname } from 'next/navigation';

/** The publication's primary sections. The laboratory records sit one level in, under
 *  their own index, so the front of the site is not a control panel. */
export const SECTIONS = [
  ['/practice', 'Practice'],
  ['/dispatches', 'Dispatches'],
  ['/laboratory', 'Laboratory'],
  ['/constitution', 'Constitution'],
] as const;

const LAB_PREFIXES = ['/observatory', '/engines', '/findings', '/frontier', '/capabilities', '/corpus', '/ledger', '/provenance'];

export function PrimaryNav() {
  const pathname = usePathname();
  return (
    <nav className="primary" aria-label="Sections">
      {SECTIONS.map(([href, label]) => {
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === '/laboratory' && LAB_PREFIXES.some((p) => pathname.startsWith(p)));
        return (
          <a key={href} href={href} {...(active ? { 'aria-current': 'page' as const } : {})}>
            {label}
          </a>
        );
      })}
    </nav>
  );
}
