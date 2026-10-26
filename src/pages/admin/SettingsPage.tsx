import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { site } from '@/config/site';
import { siteAssets } from '@/config/siteAssets';
import { useContent } from '@/hooks/useContent';
import {
  buildExportPackage,
  downloadExportPackage,
  validateExportPackage,
  type ExportValidation,
} from '@/services/exportCatalog';

export function SettingsPage() {
  const { state, resetDemo } = useContent();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [exportResult, setExportResult] = useState<ExportValidation | null>(null);
  const [exportError, setExportError] = useState('');

  function onExport() {
    setExportError('');
    setExportResult(null);
    try {
      const pkg = buildExportPackage(state);
      const validation = validateExportPackage(pkg);
      setExportResult(validation);
      if (!validation.ok) return;
      downloadExportPackage(pkg);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed.');
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl text-navy">Settings</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Advanced workspace tools. Day-to-day medication work uses Manage Drugs and Review Requests.
      </p>

      <section className="panel mt-6 space-y-3 p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl text-navy">Update the online website</h2>
        <p className="text-muted">
          <span className="font-medium text-navy">Publish</span> in Manage Drugs updates this browser&apos;s hospital preview
          immediately. Other visitors on GitHub Pages only see updates after you export, import into the repository, and
          deploy.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-muted">
          <li>Publish medications in Manage Drugs or Approve &amp; Publish from Review Requests.</li>
          <li>Export the validated catalog JSON below.</li>
          <li>
            Run <code className="rounded bg-canvas px-1.5 py-0.5 text-navy">npm run import-catalog -- ./your-export.json</code>
          </li>
          <li>Commit the updated catalog file and deploy GitHub Pages.</li>
        </ol>
        <button type="button" className="btn-primary mt-2" onClick={onExport}>
          Export catalog for deployment
        </button>
        {exportError && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {exportError}
          </p>
        )}
        {exportResult && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${exportResult.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}
            role="status"
          >
            {exportResult.ok ? (
              <p>
                Export ready — hospitals {exportResult.counts.hospitals}, drugs {exportResult.counts.drugs}, protocols{' '}
                {exportResult.counts.protocols}, guidelines {exportResult.counts.guidelines}, counseling{' '}
                {exportResult.counts.education}, chemotherapy {exportResult.counts.chemotherapy}, classes{' '}
                {exportResult.counts.therapeuticClasses}.
              </p>
            ) : (
              <ul className="list-disc pl-4">
                {exportResult.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {exportResult.warnings.map((item) => (
              <p key={item} className="mt-1">
                {item}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="panel mt-4 space-y-3 p-5 text-sm">
        <h2 className="font-serif text-2xl text-navy">Advanced tools</h2>
        <ul className="space-y-2 text-muted">
          <li>
            <Link className="font-medium text-primary hover:underline" to="/admin/users">
              Users &amp; Permissions
            </Link>{' '}
            — local browser accounts only
          </li>
          <li>
            <Link className="font-medium text-primary hover:underline" to="/admin/media">
              Media Library
            </Link>{' '}
            — uploaded images and files
          </li>
          <li>
            <Link className="font-medium text-primary hover:underline" to="/admin/sections">
              Homepage Sections
            </Link>{' '}
            — welcome and homepage content blocks
          </li>
          <li>
            <Link className="font-medium text-primary hover:underline" to="/admin/guidelines">
              Guidelines
            </Link>{' '}
            — also available under Protocols &amp; Guidelines
          </li>
        </ul>
      </section>

      <section className="panel mt-4 space-y-3 p-5 text-sm">
        <h2 className="font-serif text-2xl text-navy">Branding</h2>
        <p>
          <span className="text-muted">Hospital:</span> {site.hospitalName}
        </p>
        <p>
          <span className="text-muted">Platform:</span> {site.platformName}
        </p>
        <p>
          <span className="text-muted">Organization:</span> {site.organizationName}
        </p>
        <p>
          <span className="text-muted">Primary photograph:</span> {siteAssets.hospitalExteriorPrimary}
        </p>
        <p>
          <span className="text-muted">Logo:</span> {siteAssets.hailHealthClusterLogo}
        </p>
      </section>

      <section className="panel mt-4 space-y-3 p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl text-navy">Data layers</h2>
        <p>
          <span className="font-medium text-navy">Published catalog:</span> version-controlled file{' '}
          <code className="rounded bg-canvas px-1.5 py-0.5">src/data/published/catalog.ts</code> (what visitors see).
        </p>
        <p>
          <span className="font-medium text-navy">Local drafts:</span> IndexedDB workspace on this device (editing only).
        </p>
        <p>
          <span className="font-medium text-navy">Email / cloud sync:</span> not used in this static deployment.
        </p>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="font-serif text-2xl text-navy">Reset local workspace</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Clears this browser’s IndexedDB workspace to an empty structural library. Does not change the published repository
          catalog or remote systems.
        </p>
        {done && <p className="mt-3 text-sm text-emerald-700">Local workspace reset to empty.</p>}
        <button type="button" className="btn-danger mt-4" onClick={() => setOpen(true)}>
          Reset local workspace
        </button>
      </section>
      <Modal open={open} title="Reset local workspace?" onClose={() => setOpen(false)}>
        <p>This removes local drafts in this browser only. The published GitHub Pages catalog is unchanged.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              resetDemo();
              setDone(true);
              setOpen(false);
            }}
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
