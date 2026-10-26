# King Salman Specialist Hospital — Hail Health Cluster Formulary

Static website for the **Hail Health Cluster Formulary** at **King Salman Specialist Hospital**, part of **Hail Health Cluster**. Visitors browse the repository-published medication and clinical resource catalog on GitHub Pages.

**Live site:** https://masheljmil123-svg.github.io/KSSH-Formulary-Library/

## Technologies

- React 18 + Vite + TypeScript + Tailwind CSS
- Published catalog in `src/data/published/`
- Local admin workspace via IndexedDB (development only)

## Setup

Requires Node.js 18 or later.

```bash
npm install
npm run dev
```

Production build (public catalog only — admin routes disabled):

```bash
npm run build
npm run preview
```

GitHub Pages build uses base path `/KSSH-Formulary-Library/` (set in `.github/workflows/deploy-github-pages.yml`).

## Publishing content

1. Edit drafts in the local admin workspace (`npm run dev` → Login).
2. Approve records, then **Settings → Export approved catalog JSON**.
3. Import into the repository:

```bash
npm run import-catalog -- ./formulary-catalog-export-YYYY-MM-DD.json
```

4. Commit `src/data/published/catalog.ts` and push to `main`. GitHub Actions rebuilds and updates the same Pages URL.

Local Publish actions do **not** update GitHub automatically. See `docs/BACKEND.md`.

## Notes

- Public pages always read the version-controlled published catalog.
- Local drafts never appear for other visitors until exported, committed, and deployed.
- Phase 3 medication drafts stay local until supervisor clinical verification.
- Branding lives in `src/config/site.ts` and `src/config/siteAssets.ts`.
- Private medication references and IndexedDB files are never included in the public build.
