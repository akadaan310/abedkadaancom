import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PrimaryNav } from './nav';

export const metadata: Metadata = {
  title: 'Abed Kadaan — Living Research Laboratory',
  description:
    'A computational laboratory for constructing, measuring, challenging, and preserving research instruments.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="masthead">
          <div className="sheet masthead-inner">
            <a className="wordmark" href="/">
              <span className="name">Abed Kadaan</span>
              <span className="role">Living Research Laboratory</span>
            </a>
            <PrimaryNav />
          </div>
        </header>

        <main>
          <div className="sheet">{children}</div>
        </main>

        <footer className="colophon">
          <div className="sheet">
            <div className="column">
              Every figure on this site was computed by an instrument in this repository, from the corpus named
              beside it. Nothing is generated for display. Where the laboratory does not know something, it says so.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
