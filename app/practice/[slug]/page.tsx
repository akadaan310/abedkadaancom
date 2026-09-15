/** One service, set as a feature page. */
import { notFound } from 'next/navigation';
import { SERVICES, serviceBySlug } from '../../services';
import { demoFor } from '../../../lab/demo';
import { Demo } from '../../demo';
import { Band } from '../../ui';

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) notFound();

  const demo = demoFor(slug);
  const index = SERVICES.findIndex((s) => s.slug === slug);
  const next = SERVICES[(index + 1) % SERVICES.length]!;

  return (
    <>
      <div className="cover">
        <span className="kicker">Service {service.no} · The practice</span>
        <h1 className="headline headline--sm">{service.name}</h1>
        <p className="dek">{service.dek}</p>
        <div className="byline">
          <span>For · {service.forWhom}</span>
        </div>
      </div>

      <hr className="rule-heavy" />

      <div className="feature" style={{ marginTop: '2.25rem' }}>
        {service.body.map((p, i) => <p key={i}>{p}</p>)}

        <div className="pullquote">{service.notThis}</div>

        {demo && (
          <Demo
            service={demo.service}
            title={demo.title}
            ask={demo.ask}
            usesModel={demo.usesModel}
            input={demo.input}
          />
        )}

        {service.evidence && (
          <p className="note">
            Demonstrated here: <a href={service.evidence.href}>{service.evidence.label}</a>.
          </p>
        )}
      </div>

      <Band label="Next">
        <ul className="contents">
          <li>
            <a href={`/practice/${next.slug}`}>
              <span className="no">{next.no}</span>
              <span>
                <h3>{next.name}</h3>
                <span className="what">{next.dek}</span>
              </span>
            </a>
          </li>
          <li>
            <a href="/practice">
              <span className="no">—</span>
              <span>
                <h3>All ten services</h3>
                <span className="what">The full contents of the practice.</span>
              </span>
            </a>
          </li>
        </ul>
      </Band>
    </>
  );
}
