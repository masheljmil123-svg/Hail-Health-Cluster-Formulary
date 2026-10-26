import { ArrowLeft, List, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { DrugImageCarousel } from '@/components/drugs/DrugImageCarousel';
import { PublicDrugReferences } from '@/components/drugs/PublicDrugReferences';
import { RichTextView } from '@/components/editor/RichTextEditor';
import { MedicationAlertBadge } from '@/components/ui/MedicationAlertBadge';
import { SAFETY_FLAG_LABEL } from '@/config/monograph';
import { isLocalAdminEnabled } from '@/config/runtime';
import { useAuth } from '@/hooks/useAuth';
import { useContent } from '@/hooks/useContent';
import { useHospital } from '@/hooks/useHospital';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { isRichDocEmpty } from '@/lib/richtext';
import { getPublicReferences } from '@/services/drugReferences';
import { isDrugEnabledForHospital } from '@/services/hospitals';
import { formatFormulationLine } from '@/services/migrateDrugs';
import { collectionFor } from '@/services/library';
import {
  getPublicSections,
  hasMeaningfulWorkingContent,
  resolveSectionRenderContent,
} from '@/services/sectionPublication';
import type { DocumentKind, Drug, LibraryDocument, MonographSection } from '@/types';

export function DrugDetailPage() {
  const { id } = useParams();
  const { hospital, catalog, path } = useHospital();
  const { state: workspace } = useContent();
  const { allowed } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const preview = isLocalAdminEnabled() && params.get('preview') === '1' && allowed('content:update');
  const state = preview ? workspace : catalog;
  const drug = state.drugs.find((item) => item.id === id);
  const enabledHere = drug ? isDrugEnabledForHospital(drug, hospital.id) : false;
  const back =
    (location.state as { search?: string } | null)?.search ||
    path(`/search?q=${encodeURIComponent(drug?.genericName ?? '')}`);

  const relatedDocs = useMemo(() => (drug ? relatedDocuments(state, drug) : []), [drug, state]);

  const visibleSections = useMemo(() => {
    if (!drug) return [];
    if (preview) {
      // Demo admin preview: show working copy of sections with meaningful draft content.
      return [...drug.monographSections]
        .filter((section) => section.isVisible !== false && hasMeaningfulWorkingContent(section, drug, relatedDocs))
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return getPublicSections(drug, relatedDocs);
  }, [drug, preview, relatedDocs]);

  const publicReferences = useMemo(() => (drug ? getPublicReferences(drug) : []), [drug]);

  const tocSections = useMemo(() => {
    const sections = [...visibleSections].sort((a, b) => a.title.localeCompare(b.title));
    if (publicReferences.length) {
      sections.push({
        id: 'public-refs',
        key: 'references',
        title: 'References',
        displayOrder: 9999,
        isVisible: true,
        contentType: 'links',
        richText: { type: 'doc', content: [] },
        status: 'published',
        publishedContent: null,
      } as MonographSection);
    }
    return sections;
  }, [visibleSections, publicReferences.length]);

  useEffect(() => {
    if (!tocSections.length) return;
    const observers: IntersectionObserver[] = [];
    for (const section of tocSections) {
      const element = document.getElementById(sectionAnchor(section));
      if (!element) continue;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActiveSection(section.id);
          }
        },
        { rootMargin: '-120px 0px -55% 0px', threshold: [0, 0.25, 0.5] },
      );
      observer.observe(element);
      observers.push(observer);
    }
    const hash = location.hash.replace('#', '');
    if (hash) {
      const match = tocSections.find((section) => sectionAnchor(section) === hash);
      if (match) setActiveSection(match.id);
    }
    return () => observers.forEach((observer) => observer.disconnect());
  }, [tocSections, location.hash]);

  if (!drug || (drug.status !== 'published' && !preview) || (!preview && !enabledHere)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl text-navy">Medication unavailable</h1>
        <p className="mt-3 text-muted">
          This medication is not part of the {hospital.nameEn} formulary catalog, or it is not published.
        </p>
        <Link to={path('/search')} className="btn-primary mt-6">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="drug-monograph mx-auto max-w-page px-4 py-5 sm:px-6 sm:py-6">
      <Link to={back} className="drug-monograph__meta inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
        <ArrowLeft size={14} />
        Back to results
      </Link>

      <div className="drug-monograph__meta mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-950">
        Only administrator-approved and published monograph sections are shown publicly.
      </div>

      {drug.status !== 'published' && (
        <p className="drug-monograph__meta mt-2 rounded-xl bg-clinical px-3 py-2 text-navy">
          Previewing a {drug.status} record. Public visitors cannot see this page.
        </p>
      )}

      <div className="mt-4 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav
            className="drug-monograph__toc sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-sm"
            aria-label="Monograph contents"
          >
            <p className="drug-monograph__toc-label text-muted">Contents A–Z</p>
            <ul className="mt-1.5 space-y-0.5">
              {tocSections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${sectionAnchor(section)}`}
                    className={cn(
                      'block transition',
                      activeSection === section.id ? 'bg-clinical font-semibold text-primary' : 'text-navy hover:bg-canvas',
                    )}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div>
          <div className="mb-3 lg:hidden">
            <button type="button" className="btn-secondary w-full py-2 text-sm" onClick={() => setTocOpen(true)}>
              <List size={15} />
              Contents
            </button>
          </div>

          {tocOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Monograph contents">
              <button type="button" className="absolute inset-0 bg-navy/40" aria-label="Close contents" onClick={() => setTocOpen(false)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="drug-monograph__section-title text-navy">Contents A–Z</h2>
                  <button type="button" className="text-sm font-medium text-primary" onClick={() => setTocOpen(false)}>
                    Close
                  </button>
                </div>
                <ul className="drug-monograph__toc space-y-0.5">
                  {tocSections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${sectionAnchor(section)}`}
                        className="block text-navy hover:bg-canvas"
                        onClick={() => setTocOpen(false)}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <article className="drug-monograph__panel panel">
            <header className="drug-monograph__header border-b border-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="drug-monograph__title text-navy">{drug.genericName}</h1>
                  <p className="drug-monograph__subtitle text-muted">
                    {drug.brandNames.length ? `Brand names: ${drug.brandNames.join(', ')}` : 'No brand names recorded'}
                  </p>
                  {drug.synonyms.length > 0 && (
                    <p className="drug-monograph__subtitle text-muted">Synonyms: {drug.synonyms.join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <MedicationAlertBadge classification={drug.publishedAlertClassification} />
                  <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => window.print()}>
                    <Printer size={14} />
                    Print
                  </button>
                </div>
              </div>
              <dl className="drug-monograph__summary mt-3 grid sm:grid-cols-2 lg:grid-cols-4">
                <Meta label="Therapeutic class" value={drug.therapeuticClass || '—'} />
                <Meta label="Pharmacological class" value={drug.pharmacologicalClass || '—'} />
                <Meta label="Last reviewed" value={formatDate(drug.lastReviewedAt || drug.lastUpdated)} />
                <Meta label="Document version" value={drug.version} />
              </dl>
              {drug.images.length > 0 && (
                <div className="mt-3">
                  <DrugImageCarousel images={drug.images} />
                </div>
              )}
            </header>

            <div className="drug-monograph__sections">
              {visibleSections.length === 0 && (
                <p className="drug-monograph__meta text-muted">
                  No approved monograph sections have been published for this medication yet.
                </p>
              )}
              {visibleSections.map((section) => (
                <section key={section.id} id={sectionAnchor(section)} className="drug-monograph__section">
                  <h2 className="drug-monograph__section-title text-navy">{section.title}</h2>
                  {preview && section.status !== 'published' && (
                    <p className="drug-monograph__meta mt-1 text-amber-800">
                      Admin preview — section status: {section.status} (included when the medication is Published)
                    </p>
                  )}
                  <div className="drug-monograph__section-body">
                    <SectionBody section={section} drug={drug} relatedDocs={relatedDocs} preview={preview} />
                  </div>
                </section>
              ))}
              <PublicDrugReferences drug={drug} />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function SectionBody({
  section,
  drug,
  relatedDocs,
  preview = false,
}: {
  section: MonographSection;
  drug: Drug;
  relatedDocs: LibraryDocument[];
  preview?: boolean;
}) {
  const content = resolveSectionRenderContent(section, { preview });
  const richText = content.richText;
  const structured = content.structured ?? {};

  if (section.key === 'brand-name' && isRichDocEmpty(richText) && drug.brandNames.length) {
    return <p>{drug.brandNames.join(', ')}</p>;
  }
  if (section.key === 'synonyms' && isRichDocEmpty(richText) && drug.synonyms.length) {
    return <p>{drug.synonyms.join(', ')}</p>;
  }
  if (section.key === 'therapeutic-class' && isRichDocEmpty(richText) && drug.therapeuticClass) {
    return <p>{drug.therapeuticClass}</p>;
  }
  if (section.key === 'dosage-forms') {
    if (drug.formulations.length) {
      return (
        <ul className="list-disc space-y-1 pl-5">
          {drug.formulations.map((form) => (
            <li key={form.id}>{formatFormulationLine(form)}</li>
          ))}
        </ul>
      );
    }
  }
  if (section.key === 'dosing' && drug.dosingEntries.length) {
    return (
      <div className="space-y-2.5">
        {!isRichDocEmpty(richText) && <RichTextView value={richText} />}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="drug-monograph__table min-w-full text-left">
            <thead className="bg-canvas text-navy">
              <tr>
                <th>Indication</th>
                <th>Population</th>
                <th>Dose</th>
                <th>Route</th>
                <th>Frequency</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {drug.dosingEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-line">
                  <td>{entry.indication || '—'}</td>
                  <td>{entry.population || '—'}</td>
                  <td>
                    {[entry.dose, entry.doseUnit].filter(Boolean).join(' ') || '—'}
                    {entry.maximumDose ? ` (max ${entry.maximumDose})` : ''}
                  </td>
                  <td>{entry.route || '—'}</td>
                  <td>{entry.frequency || '—'}</td>
                  <td>{entry.notes || entry.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (section.key === 'dosage-adjustment') {
    const rows = [
      { label: 'Kidney impairment', value: structured.kidney },
      { label: 'Liver impairment', value: structured.liver },
      { label: 'Obesity', value: structured.obesity },
    ].filter((row) => String(row.value || '').trim());
    if (!rows.length) return null;
    return (
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="drug-monograph__adjust-card bg-canvas">
            <dt className="text-navy">{row.label}</dt>
            <dd className="text-ink">{String(row.value)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (section.key === 'medication-safety') {
    const alertLabel =
      drug.publishedAlertClassification === 'high-alert'
        ? 'High Alert'
        : drug.publishedAlertClassification === 'low'
          ? 'Low'
          : preview
            ? drug.alertClassification === 'high-alert'
              ? 'High Alert'
              : drug.alertClassification === 'low'
                ? 'Low'
                : 'Not Specified'
            : null;
    return (
      <div className="space-y-2">
        {alertLabel && (
          <p>
            Medication Alert Classification: <span className="font-semibold">{alertLabel}</span>
          </p>
        )}
        <ul className="space-y-1">
          {(['lasa', 'hazardous'] as const).map((flag) => (
            <li key={flag} className="flex items-center gap-2">
              <span className={cn('inline-block h-2 w-2 rounded-full', drug.safetyFlags.includes(flag) ? 'bg-rose-600' : 'bg-slate-300')} />
              {SAFETY_FLAG_LABEL[flag]}: {drug.safetyFlags.includes(flag) ? 'Yes' : 'No'}
            </li>
          ))}
        </ul>
        {structured.notes ? <p className="text-ink">{String(structured.notes)}</p> : null}
        {!isRichDocEmpty(richText) && <RichTextView value={richText} />}
      </div>
    );
  }
  if (section.key === 'administration') {
    if (structured.noSpecialInstructions) {
      return <p>No special instructions.</p>;
    }
    const text = String(structured.specificInstructions || '').trim();
    return text ? <p className="whitespace-pre-wrap">{text}</p> : null;
  }
  if (section.key === 'fee') {
    if (drug.feeApplicable === true || structured.applicable === true) return <p>Yes</p>;
    if (drug.feeApplicable === false || structured.applicable === false) return <p>No</p>;
    return null;
  }
  if (section.key === 'guidelines-protocols') {
    return (
      <div className="space-y-2">
        {!isRichDocEmpty(richText) && <RichTextView value={richText} />}
        {relatedDocs.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {relatedDocs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium text-navy">{doc.title}</p>
                  <p className="drug-monograph__meta text-muted">{doc.category}</p>
                </div>
                <ResourceActions document={doc} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (isRichDocEmpty(richText)) return null;
  return <RichTextView value={richText} />;
}

function ResourceActions({ document }: { document: LibraryDocument }) {
  const attachment = document.attachments[0];
  const link = document.externalLinks[0];
  if (attachment?.url) {
    return (
      <a className="font-semibold text-primary hover:underline" href={attachment.url} target="_blank" rel="noreferrer">
        Open PDF
      </a>
    );
  }
  if (link?.url) {
    return (
      <a className="font-semibold text-primary hover:underline" href={link.url} target="_blank" rel="noreferrer">
        Open link
      </a>
    );
  }
  const kind: DocumentKind =
    document.id.startsWith('guideline') ? 'guideline' : document.id.startsWith('chemo') || document.id.includes('chemo') ? 'chemotherapy' : 'protocol';
  const base = kind === 'guideline' ? '/guidelines' : kind === 'chemotherapy' ? '/chemotherapy-protocols' : '/protocols';
  return (
    <Link className="font-semibold text-primary hover:underline" to={`${base}/${document.id}`}>
      View
    </Link>
  );
}

function relatedDocuments(
  state: ReturnType<typeof useContent>['state'],
  drug: Drug,
): LibraryDocument[] {
  const pools = [
    ...collectionFor(state, 'protocol'),
    ...collectionFor(state, 'guideline'),
    ...collectionFor(state, 'chemotherapy'),
  ];
  return pools.filter(
    (doc) =>
      doc.status === 'published' &&
      (drug.relatedResourceIds.includes(doc.id) || doc.relatedDrugIds?.includes(drug.id)),
  );
}

function sectionAnchor(section: MonographSection): string {
  return `section-${section.key}-${section.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="drug-monograph__summary-card bg-canvas">
      <dt className="drug-monograph__meta-label text-muted">{label}</dt>
      <dd className="drug-monograph__meta-value text-navy">{value}</dd>
    </div>
  );
}
