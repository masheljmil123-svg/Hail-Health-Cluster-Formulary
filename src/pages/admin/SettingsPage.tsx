import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { site } from '@/config/site';
import { siteAssets } from '@/config/siteAssets';
import { useContent } from '@/hooks/useContent';
import { isEmailConfigured } from '@/services/emailNotifications';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

export function SettingsPage() {
  const { resetDemo } = useContent();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const backend = getSupabaseConfigStatus();
  const emailOk = isEmailConfigured();

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl text-navy">Settings</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Branding is centralized so names and images can change without editing page layouts.
      </p>
      <section className="panel mt-6 space-y-3 p-5 text-sm">
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
          <span className="text-muted">Alternative photograph:</span> {siteAssets.hospitalExteriorAlternative}
        </p>
        <p>
          <span className="text-muted">Logo:</span> {siteAssets.hailHealthClusterLogo}
        </p>
      </section>
      <section className="panel mt-4 space-y-3 p-5 text-sm leading-6">
        <h2 className="font-serif text-2xl text-navy">Backend & identity</h2>
        <p>
          <span className="font-medium text-navy">Database / Auth:</span>{' '}
          {backend.configured ? 'Supabase environment variables detected.' : 'Not configured — local browser persistence only.'}
        </p>
        <p className="text-muted">{backend.message}</p>
        <p>
          <span className="font-medium text-navy">Email notifications:</span>{' '}
          {emailOk
            ? 'Client is pointed at an email function URL.'
            : 'Not configured — in-app notifications still work. Outgoing email requires server-side EMAIL_* setup (docs/BACKEND.md).'}
        </p>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-serif text-2xl text-navy">Reset content library</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Clears this browser’s content library to an empty state (keeps branding media structure). Does not delete team accounts.
          User-created records in this browser will be removed.
        </p>
        {done && <p className="mt-3 text-sm text-emerald-700">Library reset to empty.</p>}
        <button type="button" className="btn-danger mt-4" onClick={() => setOpen(true)}>
          Reset content library
        </button>
      </section>
      <Modal open={open} title="Reset content library?" onClose={() => setOpen(false)}>
        <p>This removes all drugs and resources stored in this browser and starts from an empty library.</p>
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
