import { FormEvent, useState } from 'react';
import { builtinAssetMeta } from '@/config/siteAssets';
import { useContent } from '@/hooks/useContent';
import type { MediaRecord } from '@/types';

export function MediaPage() {
  const { state, updateMedia, addUpload, deleteUpload } = useContent();
  const [error, setError] = useState('');

  function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const alt = (form.elements.namedItem('alt') as HTMLInputElement).value;
    if (!file) {
      setError('Choose an image file.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > 500_000) {
      setError('Choose an image under 500 KB. Larger files are not stored in this browser demo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addUpload({ title, alt, src: String(reader.result) });
      form.reset();
      setError('');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <h1 className="font-serif text-4xl text-navy">Media Library</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Built-in photographs and the Hail Health Cluster logo are replaced by changing the files listed in the asset configuration. Uploaded images stay in this browser only.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.media.map((record) => (
          <MediaCard key={record.id} record={record} onSave={updateMedia} onDelete={record.assetKey === 'upload' ? () => deleteUpload(record.id) : undefined} />
        ))}
      </div>
      <form onSubmit={onUpload} className="panel mt-6 max-w-xl space-y-3 p-5">
        <h2 className="font-serif text-2xl text-navy">Add an image</h2>
        <label className="block">
          <span className="ui-label">Title</span>
          <input name="title" className="ui-input" />
        </label>
        <label className="block">
          <span className="ui-label">Alt text</span>
          <input name="alt" className="ui-input" />
        </label>
        <label className="block">
          <span className="ui-label">Image file</span>
          <input name="file" type="file" accept="image/*" className="block w-full text-sm" />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary">
          Add to library
        </button>
      </form>
    </div>
  );
}

function MediaCard({ record, onSave, onDelete }: { record: MediaRecord; onSave: (record: MediaRecord) => void; onDelete?: () => void }) {
  const [alt, setAlt] = useState(record.alt);
  const [title, setTitle] = useState(record.title);
  const src = record.assetKey === 'upload' ? record.src ?? '' : builtinAssetMeta[record.assetKey].src;
  return (
    <article className="panel overflow-hidden">
      <div className="aspect-[16/10] bg-clinical">
        {src ? <img src={src} alt={alt} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm text-muted">Image unavailable</div>}
      </div>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="ui-label">Title</span>
          <input className="ui-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="block">
          <span className="ui-label">Alt text</span>
          <input className="ui-input" value={alt} onChange={(event) => setAlt(event.target.value)} />
        </label>
        <p className="text-xs text-muted">{record.assetKey === 'upload' ? 'Stored in this browser' : `Asset key: ${record.assetKey}`}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => onSave({ ...record, title, alt })}>
            Save text
          </button>
          {onDelete && (
            <button type="button" className="btn-secondary" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
