import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'abedkadaan.com — research laboratory',
  description:
    'A computational research laboratory in which bounded AI processes propose instruments, engines compute them, and null models decide what counts as a result.',
};

const NAV = [
  ['/', 'Observatory'],
  ['/engines', 'Engines'],
  ['/findings', 'Findings'],
  ['/frontier', 'Frontier'],
  ['/capabilities', 'Capabilities'],
  ['/ledger', 'Ledger'],
  ['/corpus', 'Corpus'],
  ['/about', 'How to read this'],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="wrap">
            <div className="brand">
              <h1>abedkadaan.com</h1>
              <span className="sub">living research laboratory</span>
            </div>
            <nav className="site">
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>{label}</a>
              ))}
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site">
          <div className="wrap">
            Every number on this site was computed by an engine in this repository, from the corpus named beside it.
            Nothing here is generated for display. Where the laboratory does not know something, it says so.
          </div>
        </footer>
      </body>
    </html>
  );
}
