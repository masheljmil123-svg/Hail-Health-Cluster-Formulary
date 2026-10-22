import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { site } from '@/config/site';
import { siteAssets } from '@/config/siteAssets';
import { useContent } from '@/hooks/useContent';

export function SettingsPage() {
  const { resetDemo } = useContent();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl text-navy">Settings</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Branding is centralized so names and images can change without editing page layouts. This page does not connect to hospital systems.
      </p>
      <section className="panel mt-6 space-y-3 p-5 text-sm">
        <h2 className="font-serif text-2xl text-navy">Branding</h2>
        <p><span className="text-muted">Hospital:</span> {site.hospitalName}</p>
        <p><span className="text-muted">Platform:</span> {site.platformName}</p>
        <p><span className="text-muted">Organization:</span> {site.organizationName}</p>
        <p><span className="text-muted">Primary photograph:</span> {siteAssets.hospitalExteriorPrimary}</p>
        <p><span className="text-muted">Alternative photograph:</span> {siteAssets.hospitalExteriorAlternative}</p>
        <p><span className="text-muted">Logo:</span> {siteAssets.hailHealthClusterLogo}</p>
      </section>
      <section className="panel mt-4 space-y-3 p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl text-navy">Identity provider</h2>
        <p>
          Sign-in uses the demo provider in <span className="font-medium text-navy">src/services/authProvider.ts</span>. Replace that module with a server-side identity provider before production. Do not treat the demo session as secure.
        </p>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-serif text-2xl text-navy">Demonstration data</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Reset restores the original sample library and removes local edits, including uploaded images.</p>
        {done && <p className="mt-3 text-sm text-emerald-700">Demonstration data was reset.</p>}
        <button type="button" className="btn-danger mt-4" onClick={() => setOpen(true)}>
          Reset demonstration data
        </button>
      </section>
      <Modal open={open} title="Reset demonstration data?" onClose={() => setOpen(false)}>
        <p>This clears local edits and restores the sample library in this browser.</p>
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
