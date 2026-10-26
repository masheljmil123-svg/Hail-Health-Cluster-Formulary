# Local-first publishing (GitHub Pages)

This project is a static site. Visitors always read the **published catalog** checked into the repository.

## Data layers

| Layer | Location | Purpose |
| --- | --- | --- |
| **Published catalog** | `src/data/published/catalog.ts` | Single source of truth for GitHub Pages visitors |
| **Local workspace** | IndexedDB (`kssh-formulary-workspace-v1`) + media blobs | Drafts, edits, attachments on one development browser |
| **Historical SQL** | `supabase/migrations/` | Kept for reference only — not used at runtime |

## Publishing workflow

1. Run `npm run dev` (local admin is enabled in development).
2. Sign in to the local workspace and edit content.
3. Mark records approved/published in the workspace (local status only).
4. Open **Admin → Settings → Export approved catalog JSON**.
5. Import into the repo:

```bash
npm run import-catalog -- ./formulary-catalog-export-YYYY-MM-DD.json
```

6. Review the diff, commit, and deploy to GitHub Pages.

Local “Publish” buttons never update GitHub or other visitors’ browsers.

## Admin availability

- Enabled automatically with `npm run dev`.
- Hidden in production builds unless `VITE_ENABLE_LOCAL_ADMIN=true` (local preview only — do not enable on the public Pages site).

## Optional GitHub Pages base path

If the site is served from a project subpath, set:

```bash
VITE_BASE_PATH=/your-repo-name/
```
