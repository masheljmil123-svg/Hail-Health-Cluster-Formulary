import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { useHospital } from '@/hooks/useHospital';
import { formatDate } from '@/lib/format';
import { publicUpdates } from '@/services/library';

export function AboutPage() {
  const { hospital } = useHospital();
  return (
    <InfoShell eyebrow="About" title={`About the ${site.platformName}`}>
      <p>
        You are viewing the {hospital.nameEn} formulary within the {site.platformName}, part of {site.organizationName}. One
        shared medication catalog serves multiple hospitals; each hospital only shows medications explicitly assigned to it.
      </p>
      <p>
        Nothing in this prototype is an approved formulary, protocol, dose, or hospital policy. Clinical sections that have not been supplied display “Pending clinical review”.
      </p>
      <p>
        Official Hail Health Cluster identity guidance is published at{' '}
        <a className="font-medium text-primary hover:underline" href={site.identityUrl} target="_blank" rel="noreferrer">
          hailthy.net/identity
        </a>
        .
      </p>
    </InfoShell>
  );
}

export function ResourcesPage() {
  const { path } = useHospital();
  const cards = [
    { href: path('/drug-index'), title: 'Drug Index A–Z', text: 'Browse published medication records alphabetically or by therapeutic class.' },
    { href: path('/protocols-guidelines'), title: 'Protocols & Guidelines', text: 'Open published protocol and guideline documents.' },
    { href: path('/chemotherapy-protocols'), title: 'Chemotherapy Protocols', text: 'Browse published chemotherapy protocol records when available.' },
    { href: path('/education'), title: 'Patient Counseling Materials', text: 'Open published patient counseling materials.' },
    { href: path('/updates'), title: 'Latest Updates', text: 'See recently dated published records.' },
    { href: path('/search'), title: 'Search', text: 'Search by drug name, class, indication, or keyword.' },
  ];
  return (
    <InfoShell eyebrow="Resources" title="Library resources">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} to={card.href} className="rounded-2xl border border-line bg-canvas p-5 transition hover:border-primary/30 hover:bg-white">
            <h2 className="font-serif text-2xl text-navy">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{card.text}</p>
          </Link>
        ))}
      </div>
    </InfoShell>
  );
}

export function HelpPage() {
  return (
    <InfoShell eyebrow="Help" title="How to use this library">
      <h2 className="font-serif text-2xl text-navy">Search</h2>
      <p>Type a drug name, class, or keyword and press Enter or Search. Results stay on the search page until you open View details.</p>
      <h2 className="mt-6 font-serif text-2xl text-navy">Filters</h2>
      <p>Use the left-hand filters to narrow therapeutic class, formulary status, route, dosage form, and how recently a record was updated. Clear all removes those filters and keeps your query.</p>
      <h2 className="mt-6 font-serif text-2xl text-navy">Content updates</h2>
      <p>
        Visitors always see the repository-published catalog. Editors prepare drafts locally (development workspace), export
        approved JSON from Settings, import it into the repo, then commit and deploy to GitHub Pages.
      </p>
    </InfoShell>
  );
}

export function UpdatesPage() {
  const { hospital, catalog, path } = useHospital();
  const items = publicUpdates(catalog, { hospitalId: hospital.id, basePath: path('') });
  return (
    <InfoShell eyebrow="Updates" title="Latest updates">
      <p>Dates below are calculated from published records in the library.</p>
      <ul className="mt-4 divide-y divide-line">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-4 py-3">
            <Link to={item.href} className="font-medium text-navy hover:text-primary">
              {item.title}
            </Link>
            <time className="text-sm text-muted" dateTime={item.lastUpdated}>
              {formatDate(item.lastUpdated)}
            </time>
          </li>
        ))}
      </ul>
    </InfoShell>
  );
}

export function NotFoundPage() {
  return (
    <InfoShell eyebrow="404" title="Page not found">
      <p>That address is not part of the {site.platformName}.</p>
      <Link to="/" className="btn-primary mt-4">
        Change hospital
      </Link>
    </InfoShell>
  );
}

function InfoShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl text-navy">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-ink">{children}</div>
    </div>
  );
}
