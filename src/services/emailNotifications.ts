/**
 * Server-side email notification integration stub.
 *
 * Outgoing email MUST NOT run in the browser and must never embed API keys
 * in client bundles. Configure a hospital-approved provider (e.g. Resend,
 * SendGrid, or Microsoft Graph) via Supabase Edge Functions or a backend API.
 *
 * Required environment variables (server / Edge Function only):
 *   EMAIL_PROVIDER=resend|sendgrid|graph|smtp
 *   EMAIL_API_KEY=...
 *   EMAIL_FROM="Hail Health Cluster Formulary <noreply@hospital.example>"
 *   EMAIL_ADMIN_TO=pharmacy.admin@hospital.example
 *   PUBLIC_APP_URL=https://formulary.hospital.example
 *
 * Events to wire once the provider is configured:
 *   1. New submission → administrator
 *   2. Changes requested → author
 *   3. Rejected → author
 *   4. Approved → author
 *   5. Published → author
 *
 * Emails must include subject, content title, status, date, and a secure link.
 * Do not include draft clinical text or private attachment URLs.
 */

export type EmailEvent =
  | 'submission'
  | 'changes-requested'
  | 'rejected'
  | 'approved'
  | 'published';

export interface EmailDispatchResult {
  attempted: boolean;
  delivered: boolean;
  reason: string;
}

export function isEmailConfigured(): boolean {
  // Client builds never receive EMAIL_* secrets. Configuration lives server-side.
  return Boolean(import.meta.env.VITE_EMAIL_ENABLED === 'true' && import.meta.env.VITE_EMAIL_FUNCTION_URL);
}

/**
 * Attempts to invoke the configured server function. Never reports success
 * when the provider is not configured.
 */
export async function dispatchWorkflowEmail(input: {
  event: EmailEvent;
  toUserId: string;
  contentTitle: string;
  status: string;
  securePath: string;
}): Promise<EmailDispatchResult> {
  if (!isEmailConfigured()) {
    return {
      attempted: false,
      delivered: false,
      reason:
        'Outgoing email is not configured. In-app notifications still work. Set server-side EMAIL_* variables and VITE_EMAIL_FUNCTION_URL — see docs/BACKEND.md.',
    };
  }

  const endpoint = String(import.meta.env.VITE_EMAIL_FUNCTION_URL);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: input.event,
        toUserId: input.toUserId,
        contentTitle: input.contentTitle,
        status: input.status,
        // Path only — server builds absolute URL from PUBLIC_APP_URL
        path: input.securePath,
        sentAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      return { attempted: true, delivered: false, reason: `Email function returned ${response.status}.` };
    }
    return { attempted: true, delivered: true, reason: 'Queued by email function.' };
  } catch (error) {
    return {
      attempted: true,
      delivered: false,
      reason: error instanceof Error ? error.message : 'Email dispatch failed.',
    };
  }
}
