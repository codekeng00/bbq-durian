# DealMaker — AI-Assisted Sales & Contract Workflow

Vite + React + TypeScript SPA. DealMaker simulates an end-to-end, two-team
sales pipeline: a **Sales** team turns a raw conversation into an AI-drafted
proposal email, and a **Business** team reviews, then approves (generating a
contract) or rejects it back to Sales.

The app currently runs on **mock AI** so the full workflow and UI can be
exercised without a backend. The four AI functions in `src/services/ai/` are
the only integration boundary — they will later be swapped for real agents
(Featherless AI open-source models) with no changes to the pages.

## Requirements

- Node.js 18+

## Getting started

```bash
npm install     # install dependencies
npm run dev     # start the dev server
```

Open the URL printed in the terminal (default `http://localhost:5173`).

### Try the workflow

1. On the login screen click **Sales Executive** (this prefills Alice's
   account), then **Authenticate**. You land on an empty pipeline.
2. Click **New → Use sample conversation**. The AI pipeline runs, then asks
   for any missing detail (the sample omits the decision maker). Answer it.
3. A proposal email is generated — review/edit it and **Submit to Business**.
4. Log out, log in as **Business Admin** (Bob). The proposal is waiting in
   **Pending Review**. Open it to see the AI risk/compliance evaluation, then
   **Approve & Generate** or **Reject & Feedback** (pick a preset reason).
5. Log back in as Sales: an approved deal shows the generated contract; a
   rejected deal shows the reason and lets you revise and resubmit.

All state lives in `sessionStorage`, so it survives refreshes but clears when
the browser tab closes. Use **Reset Demo Data** in the sidebar to start over.

## Build

```bash
npm run build      # type-check + bundle to dist/
npm run preview    # preview the production build locally
```

## Routes

| Route | Role | Page |
|---|---|---|
| `/` | — | Login (role buttons prefill the demo account) |
| `/active-pipelines-sales` | Sales | Sales landing — deal list / empty state |
| `/active-pipelines-business` | Business | Business landing — pending review + history |
| `/analysis-workspace` | Sales | Upload conversation → AI pipeline → gap-filling chat |
| `/analysis-chat` | Sales | Edit the proposal email; submit / resubmit to Business |
| `/contract-approval` | Business | Review proposal + AI evaluation; approve or reject |
| `/contract-received` | Sales | View the generated contract (read-only) |

Pages pass the active record via a `?dealId=` query parameter.

## Architecture

- **Data layer** — `src/context/DemoContext.tsx` holds a single `deals` array
  (one `Deal` per opportunity) plus the current team, persisted to
  `sessionStorage`. Pages read and mutate it only through the `useDemoData()`
  hook (`src/hooks/useDemoData.ts`); no component hardcodes business data.
- **AI boundary** — `src/services/ai/` contains four swappable async functions:
  - `analyzeConversation` — parse the uploaded text, extract fields, flag gaps
  - `provideMissingInfo` — fold a user's chat answer back into the extraction
  - `generateEmail` — build the proposal email from the collected info
  - `evaluateProposal` — produce the Business-side risk/compliance assessment

  Today these are rule-based mocks; later they become calls to real AI agents.
  Their signatures (plain data in, typed result out, no UI imports) are the
  contract that keeps the swap zero-touch for the pages.

## Deployment

This is a static SPA — build it, then serve `dist/` from any static host
(Vercel, Netlify, Nginx, etc.).

**Important:** because routing uses `BrowserRouter`, the host must be
configured with an SPA fallback so that any path returns `index.html`
(otherwise refreshing a non-root route like `/active-pipelines-sales`
returns 404).

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

- `src/pages/` — one component per route, grouped by area (`auth`, `dashboard`,
  `analysis`, `contract`)
- `src/components/` — shared layout pieces (`AppSidebar`, `DashboardSidebar`,
  `EmptyPipelineState`)
- `src/context/`, `src/hooks/` — the `DemoContext` data layer and its hook
- `src/services/ai/` — the four mock AI functions (future agent integration point)
- `src/data/` — TypeScript types and the demo user accounts
- `src/styles/` — global CSS copied unchanged from the original prototype
- `public/assets/` — images/icons; `public/sample-conversation.txt` — demo input
