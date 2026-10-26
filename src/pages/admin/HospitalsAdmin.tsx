import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { siteAssets } from '@/config/siteAssets';
import { useContent } from '@/hooks/useContent';
import { createEmptyHospital, sortedHospitals } from '@/services/hospitals';
import type { Hospital } from '@/types';

export function HospitalsAdmin() {
  const { state, saveHospital, deleteHospital, moveHospital } = useContent();
  const hospitals = sortedHospitals(state.hospitals);
  const [selectedId, setSelectedId] = useState(hospitals[0]?.id ?? '');
  const selected = hospitals.find((item) => item.id === selectedId) ?? hospitals[0];
  const [message, setMessage] = useState('');

  function addHospital() {
    const next = createEmptyHospital({
      displayOrder: (hospitals[hospitals.length - 1]?.displayOrder ?? 0) + 1,
      nameEn: 'New hospital',
      slug: `hospital-${Date.now().toString(36)}`,
    });
    saveHospital(next, true);
    setSelectedId(next.id);
    setMessage('Hospital added locally. Export the catalog to update GitHub Pages.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-navy">Hospital Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage welcome-page hospitals for the cluster portal. Names and photographs are editable. Enabling a card does not
            invent formulary content — medications still require per-drug hospital assignment.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={addHospital}>
          Add hospital
        </button>
      </div>

      {message && (
        <p className="rounded-xl bg-clinical px-4 py-3 text-sm text-navy" role="status">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="panel p-3">
          <ul className="space-y-1">
            {hospitals.map((hospital) => (
              <li key={hospital.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(hospital.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                    selected?.id === hospital.id ? 'bg-clinical font-semibold text-navy' : 'text-ink hover:bg-canvas'
                  }`}
                >
                  <span className="min-w-0 truncate">{hospital.nameEn}</span>
                  <span className={`ml-2 text-xs ${hospital.enabled ? 'text-emerald-700' : 'text-muted'}`}>
                    {hospital.enabled ? 'On' : 'Off'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {selected ? (
          <HospitalEditor
            hospital={selected}
            onSave={(next) => {
              saveHospital(next, false);
              setMessage('Hospital saved in the local workspace.');
            }}
            onDelete={() => {
              if (hospitals.length <= 1) {
                setMessage('Keep at least one hospital configuration.');
                return;
              }
              deleteHospital(selected.id);
              setSelectedId(hospitals.find((item) => item.id !== selected.id)?.id ?? '');
              setMessage('Hospital removed from the local workspace.');
            }}
            onMove={(direction) => moveHospital(selected.id, direction)}
          />
        ) : (
          <div className="panel p-8 text-sm text-muted">Select a hospital to edit.</div>
        )}
      </div>
    </div>
  );
}

function HospitalEditor({
  hospital,
  onSave,
  onDelete,
  onMove,
}: {
  hospital: Hospital;
  onSave: (hospital: Hospital) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [draft, setDraft] = useState(hospital);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(hospital);
    setError('');
  }, [hospital]);

  function patch(partial: Partial<Hospital>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function save() {
    setError('');
    const slug = draft.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!draft.nameEn.trim()) {
      setError('Enter an English display name.');
      return;
    }
    if (!slug) {
      setError('Enter a URL slug (letters, numbers, hyphens).');
      return;
    }
    onSave({ ...draft, slug, nameEn: draft.nameEn.trim(), nameAr: draft.nameAr.trim(), description: draft.description.trim() });
  }

  return (
    <div className="panel space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-navy">Edit hospital</h2>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp size={16} />
          </button>
          <button type="button" className="btn-secondary" onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <label className="block">
        <span className="ui-label">Display name (English)</span>
        <input className="ui-input" value={draft.nameEn} onChange={(event) => patch({ nameEn: event.target.value })} />
      </label>
      <label className="block">
        <span className="ui-label">Display name (Arabic)</span>
        <input className="ui-input" dir="rtl" value={draft.nameAr} onChange={(event) => patch({ nameAr: event.target.value })} />
      </label>
      <label className="block">
        <span className="ui-label">URL slug</span>
        <input className="ui-input" value={draft.slug} onChange={(event) => patch({ slug: event.target.value })} />
        <span className="mt-1 block text-xs text-muted">Public path: /hospital/{draft.slug || '…'}</span>
      </label>
      <label className="block">
        <span className="ui-label">Description</span>
        <textarea
          className="ui-input min-h-[88px]"
          value={draft.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </label>
      <label className="block">
        <span className="ui-label">Photograph path</span>
        <input
          className="ui-input"
          value={draft.imagePath}
          onChange={(event) => patch({ imagePath: event.target.value })}
          placeholder="Leave empty for abstract card treatment"
        />
        <span className="mt-1 block text-xs text-muted">
          Prefer files under /public/assets/hospitals/. King Salman: {siteAssets.hospitalExteriorPrimary}. King Khalid:{' '}
          /assets/hospitals/king-khalid.jpg. Do not reuse another hospital&apos;s building photo.
        </span>
      </label>
      <label className="block">
        <span className="ui-label">Card icon (when no photograph)</span>
        <select
          className="ui-input"
          value={draft.iconKey ?? 'building'}
          onChange={(event) => patch({ iconKey: event.target.value as Hospital['iconKey'] })}
        >
          <option value="building">Building</option>
          <option value="hospital">Hospital</option>
          <option value="baby">Maternity / children</option>
          <option value="heart-pulse">General / acute</option>
          <option value="brain">Mental health</option>
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm text-navy">
        <input type="checkbox" checked={draft.enabled} onChange={(event) => patch({ enabled: event.target.checked })} />
        Show this hospital on the welcome page
      </label>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={save}>
          Save hospital
        </button>
        <button type="button" className="btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
