# Historical Supabase materials (not used at runtime)

This folder retains SQL migrations and CLI config from an earlier cloud prototype.

The active Hail Health Cluster Formulary website is **local-first / GitHub Pages**:

- Runtime does not connect to Supabase.
- Published content lives in `src/data/published/catalog.ts`.
- Local drafts live in IndexedDB on the editor’s machine.

Do not apply these migrations as part of normal site publishing. The remote Supabase project (if any) was left untouched by the Phase 1 local-first change.
