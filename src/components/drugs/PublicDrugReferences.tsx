import { ExternalLink, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPublicReferences } from '@/services/drugReferences';
import { createMediaObjectUrl } from '@/services/mediaStore';
import type { Drug, DrugReference } from '@/types';

/**
 * Public monograph References block.
 * Renders only approved Public references — never Private metadata or files.
 */
export function PublicDrugReferences({ drug }: { drug: Drug }) {
  const references = getPublicReferences(drug);
  if (!references.length) return null;

  return (
    <section id="section-references-public-refs" className="drug-monograph__section">
      <h2 className="drug-monograph__section-title text-navy">References</h2>
      <div className="drug-monograph__section-body">
        <ul className="divide-y divide-line rounded-xl border border-line">
          {references.map((ref) => (
            <li key={ref.id} className="px-3 py-2.5">
              <PublicReferenceRow reference={ref} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PublicReferenceRow({ reference }: { reference: DrugReference }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    async function load() {
      if (!reference.attachmentId) return;
      const url = await createMediaObjectUrl(reference.attachmentId);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        revoked = url;
        setFileUrl(url);
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [reference.attachmentId]);

  return (
    <div>
      <p className="font-medium text-navy">{reference.title}</p>
      {reference.citation && <p className="drug-monograph__meta mt-0.5 text-muted">{reference.citation}</p>}
      <div className="mt-1 flex flex-wrap gap-3">
        {reference.url && (
          <a
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            href={reference.url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} />
            Open link
          </a>
        )}
        {reference.attachmentId && fileUrl && (
          <a
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={14} />
            Open {reference.attachmentName || 'document'}
          </a>
        )}
        {reference.attachmentId && !fileUrl && (
          <span className="text-sm text-muted">Document unavailable in this browser session</span>
        )}
      </div>
    </div>
  );
}
