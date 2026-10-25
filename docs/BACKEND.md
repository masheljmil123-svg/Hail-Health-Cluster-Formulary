# Backend configuration — Hail Health Cluster Formulary

This application implements a controlled publishing workflow (draft → pending review → approve → publish).  
Frontend route guards are **not** sufficient authorization for hospital production.

## Current runtime modes

| Mode | When | What works |
|------|------|------------|
| **Local (default)** | `VITE_SUPABASE_URL` unset | Empty library, team accounts, review workflow, in-app notifications — **this browser only** |
| **Supabase** | URL + anon key set | Shared Postgres, Auth, Storage, RLS (apply migrations below) |
| **Email** | Server function configured | Outgoing workflow emails (never from the browser with API keys) |

## Required environment variables

### Client (Vite)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Optional — only if an Edge Function / API is deployed for mail
VITE_EMAIL_ENABLED=true
VITE_EMAIL_FUNCTION_URL=https://YOUR_PROJECT.supabase.co/functions/v1/send-workflow-email
```

### Server / Edge Function only (never commit; never expose to the browser)

```bash
EMAIL_PROVIDER=resend   # or sendgrid | graph | smtp
EMAIL_API_KEY=...
EMAIL_FROM="Hail Health Cluster Formulary <noreply@hospital.example>"
EMAIL_ADMIN_TO=pharmacy.admin@hospital.example
PUBLIC_APP_URL=https://formulary.hospital.example
SUPABASE_SERVICE_ROLE_KEY=...   # server only
```

## Supabase setup

1. Create a project that meets Hail Health Cluster / MoH data residency requirements.
2. Apply `supabase/migrations/20260324000000_formulary_workflow.sql`.
3. Enable Auth (email invite). Disable public self-registration for privileged roles.
4. Create private Storage buckets for draft attachments; public read only for published object paths via signed URLs or RLS.
5. Wire Edge Functions for:
   - workflow email dispatch
   - atomic publish (content row + approved version + audit in one transaction)

## Security checklist before hospital deployment

- [ ] RLS policies enforce role, ownership, and publication status
- [ ] Team members cannot set `status` to `published` / `approved` via API
- [ ] Draft file objects are not world-readable
- [ ] Disabled accounts cannot obtain tokens
- [ ] Audit log written on every review action
- [ ] Email never includes draft clinical text or private attachment URLs
- [ ] IT / security sign-off on IdP, hosting, and backups

## Email events

1. New submission → Administrator  
2. Changes requested → Author  
3. Rejected → Author  
4. Approved → Author  
5. Published → Author  

If email is not configured, the UI reports that clearly and **does not** simulate successful delivery. In-app notifications still work.
