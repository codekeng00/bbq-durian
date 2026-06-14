# DealMaker / Nexus Sales — React App

Vite + React + TypeScript SPA migrated from the original static HTML prototype.
React Router handles navigation between the 12 pages; styling reuses the
original `styles.css`, `screens.css`, and `login.css` as-is.

## Requirements

- Node.js 18+

## Development

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (default `http://localhost:5173`).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Routes

| Route | Page |
|---|---|
| `/` | Login |
| `/dashboard` | Dashboard (empty pipeline state) |
| `/active-pipelines-keng-empty` | Active Pipelines (Keng, empty) |
| `/active-pipelines-keng` | Active Pipelines (Keng) |
| `/active-pipelines-susu` | Active Pipelines (Susu) |
| `/analysis-workspace` | Analysis Workspace |
| `/analysis-chat` | Analysis Chat / Email draft |
| `/client-email-review` | Client Email Review |
| `/compliance-report` | Compliance Report |
| `/contract-approval` | Contract Approval |
| `/contract-blocked` | Contract Blocked |
| `/contract-received` | Contract Received |

## Deployment

This is a static SPA — build it, then serve `dist/` from any static host
(Vercel, Netlify, Nginx, etc.).

**Important:** because routing uses `BrowserRouter`, the host must be
configured with an SPA fallback so that any path returns `index.html`
(otherwise refreshing a non-root route like `/dashboard` returns 404).

Example Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/dealmaker;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

Static assets live in `public/assets/` and are referenced via absolute
paths (`/assets/...`), so no path adjustments are needed after build.

## Project structure

- `src/pages/` — one component per route
- `src/components/` — shared layout pieces (`AppSidebar`, `DashboardSidebar`,
  `EmptyPipelineState`)
- `src/styles/` — global CSS copied unchanged from the original prototype
- `public/assets/` — images/icons referenced by pages and components
