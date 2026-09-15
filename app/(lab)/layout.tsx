import { LabNav } from '../lab-nav';

/**
 * The laboratory section. A route group, so every URL is unchanged — this only adds the
 * secondary navigation that lets a reader move between the records.
 */
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LabNav />
      {children}
    </>
  );
}
