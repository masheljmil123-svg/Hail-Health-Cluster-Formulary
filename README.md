# King Salman Specialist Hospital — Hail Health Cluster Formulary

Frontend for the **Hail Health Cluster Formulary** at **King Salman Specialist Hospital**, part of **Hail Health Cluster**. Clinicians can browse and search medication records, protocols, guidelines, and patient education materials. Administrators can manage that content from a protected dashboard.

This is a local prototype. Sample records are **not approved for clinical use**.

## Technologies

- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide React
- LocalStorage for demonstration persistence

## Project structure

```text
src/
  components/     Shared UI, header, search, admin tables
  pages/          Public and administrator screens
  hooks/          Authentication and content state
  services/       Search, storage, demo auth
  data/           Sample library seed
  config/         Hospital names, image paths, permissions
  types/          TypeScript interfaces
public/assets/    Hospital photographs and Hail Health Cluster logo
```

Branding and image paths are centralized in `src/config/site.ts` and `src/config/siteAssets.ts`. Replace files under `public/assets/` without changing page layouts.

## Setup

Requires Node.js 18 or later.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the address Vite prints, typically `http://localhost:5173`.

Production build:

```bash
npm run build
npm run preview
```

## Demonstration sign-in

The login page uses a labeled **DEMO authentication mode**. It stays in the browser, is not secure, and is not connected to hospital systems.

- Username: `administrator`
- Password: `formulary-demo`

## Notes

- Public visitors can search published demonstration records.
- Medication details open on a separate page after a result is selected.
- Administrator changes persist in this browser through LocalStorage.
- A production deployment needs a server-side identity provider, server-enforced authorization, and a real content database.
