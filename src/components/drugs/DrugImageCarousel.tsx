import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { createMediaObjectUrl } from '@/services/mediaStore';
import type { DrugImageRef } from '@/types';

export function DrugImageCarousel({ images }: { images: DrugImageRef[] }) {
  const ordered = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const primaryIndex = Math.max(
    0,
    ordered.findIndex((item) => item.isPrimary),
  );
  const [index, setIndex] = useState(primaryIndex >= 0 ? primaryIndex : 0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function load() {
      setLoading(true);
      const next: Record<string, string> = {};
      for (const image of ordered) {
        const url = await createMediaObjectUrl(image.mediaId);
        if (url) {
          created.push(url);
          next[image.id] = url;
        }
      }
      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      } else {
        created.forEach((url) => URL.revokeObjectURL(url));
      }
    }
    void load();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  if (!ordered.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-line bg-canvas text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <ImageOff size={18} />
          No medication images uploaded
        </span>
      </div>
    );
  }

  const current = ordered[Math.min(index, ordered.length - 1)];
  const url = urls[current.id];

  function go(delta: number) {
    setIndex((value) => (value + delta + ordered.length) % ordered.length);
  }

  return (
    <div
      className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Medication images"
    >
      <div className="relative aspect-[16/10] bg-canvas">
        {loading && <div className="absolute inset-0 animate-pulse bg-slate-100" aria-hidden="true" />}
        {url ? (
          <img src={url} alt={current.altText || current.caption || 'Medication image'} className="h-full w-full object-contain p-4" />
        ) : (
          !loading && (
            <div className="grid h-full place-items-center text-sm text-muted">Image unavailable in this browser session</div>
          )
        )}
        {ordered.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy shadow hover:bg-white"
              onClick={() => go(-1)}
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy shadow hover:bg-white"
              onClick={() => go(1)}
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
      {current.caption && <p className="border-t border-line px-4 py-2 text-sm text-muted">{current.caption}</p>}
      {ordered.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-line p-3">
          {ordered.map((image, itemIndex) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={cn(
                'h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-canvas',
                itemIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-line',
              )}
              aria-label={`Show image ${itemIndex + 1}`}
              aria-current={itemIndex === index}
            >
              {urls[image.id] ? (
                <img src={urls[image.id]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="block h-full w-full bg-slate-100" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
