import { ExternalLink, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createMediaObjectUrl } from '@/services/mediaStore';
import type { LibraryDocument } from '@/types';

export function DocumentAttachments({ document }: { document: LibraryDocument }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function load() {
      const next: Record<string, string> = {};
      for (const attachment of document.attachments) {
        if (attachment.url) {
          next[attachment.id] = attachment.url;
          continue;
        }
        if (!attachment.mediaId) continue;
        const url = await createMediaObjectUrl(attachment.mediaId);
        if (url) {
          created.push(url);
          next[attachment.id] = url;
        }
      }
      if (!cancelled) setUrls(next);
      else created.forEach((url) => URL.revokeObjectURL(url));
    }
    void load();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [document.attachments]);

  const hasAttachments = document.attachments.length > 0 || document.externalLinks.length > 0;
  if (!hasAttachments) {
    return <p className="mt-3 italic text-muted">No PDF or external link has been added for this record.</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {document.attachments.map((attachment) => {
        const href = urls[attachment.id];
        return (
          <li key={attachment.id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 py-3 text-sm font-medium text-primary hover:bg-white"
              >
                <FileText size={16} />
                Open / download {attachment.name}
              </a>
            ) : (
              <span className="text-sm text-muted">{attachment.name} (unavailable in this browser session)</span>
            )}
          </li>
        );
      })}
      {document.externalLinks.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-primary hover:bg-canvas"
          >
            <ExternalLink size={16} />
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
