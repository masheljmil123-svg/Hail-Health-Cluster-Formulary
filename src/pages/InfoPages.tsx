import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { useContent } from '@/hooks/useContent';
import { formatDate } from '@/lib/format';
import { publicUpdates } from '@/services/library';

export function AboutPage() {
  return (
    <InfoShell eyebrow="About" title={`About the ${site.platformName}`}>
      <p>
        The {site.platformName} is a demonstration catalog for {site.hospitalName}, part of {site.organizationName}. It shows how staff could browse medication records, protocols, guidelines, and patient education materials.
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
  const cards = [
    { href: '/drug-index', title: 'Drug Index A–Z', text: 'Browse published medication records alphabetically.' },
    { href: '/protocols', title: 'Protocols', text: 'Open demonstration protocol records.' },
    { href: '/guidelines', title: 'Guidelines', text: 'Open demonstration guideline records.' },
    { href: '/education', title: 'Patient Education', text: 'Open demonstration education records.' },
    { href: '/updates', title: 'Latest Updates', text: 'See recently dated published records.' },
    { href: '/search', title: 'Search', text: 'Search by drug name, class, indication, or keyword.' },
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
      <h2 className="mt-6 font-serif text-2xl text-navy">Demonstration sign-in</h2>
      <p>
        The login page has a labeled demo mode for moving between the public site and the administrator pages. It is not a hospital account and it is not secure. Open <Link className="text-primary hover:underline" to="/login">Login</Link> to see the demonstration username.
      </p>
    </InfoShell>
  );
}

export function UpdatesPage() {
  const { state } = useContent();
  const items = publicUpdates(state);
  return (
    <InfoShell eyebrow="Updates" title="Latest updates">
      <p>Dates below are demonstration record dates, calculated from the local library.</p>
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
      <p>That address is not part of the Formulary Library.</p>
      <Link to="/" className="btn-primary mt-4">
        Return home
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
