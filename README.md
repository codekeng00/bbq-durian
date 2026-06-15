# DealMaker

DealMaker is a cross-department sales and contract workflow built for the
Band of Agents Hackathon Track 1. It preserves the supplied Sales-to-Business
workflow and the existing React UI while replacing the mock logic with a
durable multi-agent backend.

## What it demonstrates

- Seven specialized LangGraph agents across two pipelines.
- Band rooms as the collaboration layer for structured agent handoffs.
- Featherless powers extraction and proposal construction.
- AI/ML API powers compliance, business reasoning, judgment, and embeddings.
- Human review before Sales sends a proposal and before Business decides it.
- RAG over internal sales and compliance policies.
- Durable cross-team state in Cloudflare D1.
- Versioned approval, structured remediation feedback, contract drafting, and
  authenticated internal signature records.
- One Cloudflare Worker serving both the SPA and API.
- A visible rules-only fallback that requires documented human override before
  approval when live AI is unavailable.

## Workflow

### Sales pipeline

1. Sales Parsing Agent extracts intent, client, value, and requirements.
2. The UI asks the salesperson for required missing facts.
3. Sales Enrichment Agent retrieves pricing and policy knowledge with RAG.
4. Sales Construction Agent writes the proposal email.
5. Sales Validation Agent checks completeness, policy, sensitive data, and
   unsupported promises.
6. The salesperson reviews and edits the draft before submitting it.

### Business pipeline

1. Business Parsing Agent structures the submitted email and terms.
2. Business Evaluation Agent retrieves policy and scores risk, profitability,
   compliance, and priority.
3. Business Judgment Agent recommends approve or reject.
4. The business user makes the final decision.
5. Approval generates a contract. Rejection returns a reason to Sales.

## Why Band is central

Each pipeline creates a Band room containing its specialized remote agents.
Every LangGraph node sends its structured output to the next agent with an
explicit Band `@mention`. The recipient then reloads its room context through
Band's context endpoint, and that context is supplied to the next node.

This means configured production runs use Band for:

- agent identity and room membership;
- directed handoff routing;
- shared structured context;
- context rehydration;
- a visible, unified audit trail.

If Band credentials are absent, the same graph runs locally so development is
not blocked. Hackathon judging should use configured Band agents.

## Architecture

```text
React/Vite SPA
      |
Cloudflare Worker API
      |
      +-- LangGraph.js sales and business graphs
      +-- Band Agent API rooms, mentions, and context
      +-- Featherless AI extraction and generation
      +-- AI/ML API review, judgment, and embeddings
      +-- Cloudflare Vectorize semantic retrieval
      +-- Cloudflare D1 deals, policy chunks, and agent events
```

The frontend does not contain model or platform secrets. All provider calls
are made by the Worker.

## Local setup

Requirements:

- Node.js 20+
- A free Cloudflare account
- Band remote-agent credentials for a judged multi-agent run
- Featherless and AI/ML API keys for live model and embedding calls

## Choose a run mode

Run the interactive launcher:

```powershell
npm start
```

It provides two choices:

```text
1. Demo mode
2. Cloudflare mode
```

You can also run either mode directly.

### Demo mode

```powershell
npm run start:demo
```

Demo mode:

- runs at `http://127.0.0.1:8787`;
- uses local D1 storage;
- requires no Cloudflare deployment or bank card;
- uses deterministic fallback agents when provider secrets are absent;
- uses HttpOnly localhost-only sessions for seeded development users;
- clearly labels rules-only analysis instead of presenting it as live AI.

### Cloudflare mode

```powershell
npm run start:cloudflare
```

Cloudflare mode:

- verifies Cloudflare authentication and configuration;
- builds the application;
- applies remote D1 migrations;
- deploys the Worker and frontend to a public Cloudflare URL;
- uses remote D1, Vectorize, Worker secrets, and configured Band agents.

Cloudflare mode requires completing the Cloudflare deployment setup below
once. The launcher stops with exact setup instructions if the D1 database ID
has not been configured.

Install and initialize local D1:

```bash
npm install
npm run build
npm run db:migrate:local
```

Copy `.dev.vars.example` to `.dev.vars` and add local secrets. `.dev.vars` is
gitignored.

The older full local Worker command remains available:

```bash
npm run dev:full
```

Open `http://127.0.0.1:8787`.

`npm run dev` runs only Vite and is useful for CSS work, but API-backed flows
require `npm run dev:full`.

## Band setup

Create these seven **Remote Agents** in the Band dashboard:

```text
Sales Parsing Agent
Sales Enrichment Agent
Sales Construction Agent
Sales Validation Agent
Business Parsing Agent
Business Evaluation Agent
Business Judgment Agent
```

Make the four Sales agents siblings/contacts and do the same for the three
Business agents so the room owner can recruit them. Put each agent ID, API key,
name, and handle into the `BAND_AGENTS_JSON` structure shown in
`.dev.vars.example`.

For deployment, store the JSON as one Worker secret:

```bash
npx wrangler secret put BAND_AGENTS_JSON
```

The repository includes a safer setup workflow:

1. Copy your Band user API key from `https://app.band.ai/users/settings`.
2. Paste it into `band-user-key.local.txt`. This file is gitignored.
3. Generate all seven External Agents:

```powershell
npm run band:create
```

The command calls Band's Human API, captures every one-time agent API key, and
writes `band-agents.local.json`.

4. Upload the generated credentials:

```powershell
npm run band:configure
```

To create the agents, upload the Worker secret, and redeploy in one command:

```powershell
npm run band:create-and-deploy
```

Both `band-user-key.local.txt` and `band-agents.local.json` are gitignored.

### Keep Band agents online

Band marks external agents online only while their SDK WebSocket runtime is
connected. Start all seven identities in the background:

```powershell
npm run band:online
```

Stop them with:

```powershell
npm run band:offline
```

The Cloudflare Worker continues to execute the LangGraph workflows and LLM
calls. The local SDK runtime maintains the long-lived Band connections because
request-driven Cloudflare Workers cannot guarantee permanent outbound
WebSockets.

For manual setup, fill in `band-agents.local.json` directly.

1. Fill in `band-agents.local.json`. This file is gitignored.
2. Run:

```powershell
npm run band:configure
```

The script validates every ID, API key, name, and handle, uploads the
`BAND_AGENTS_JSON` Worker secret, and redeploys `dealmaker-web`.

## Cloudflare deployment

Create free-tier resources:

```bash
npx wrangler d1 create dealmaker
npx wrangler vectorize create dealmaker-knowledge --dimensions=384 --metric=cosine
```

Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned D1
database ID, then apply the schema:

```bash
npm run db:migrate:remote
```

Add secrets:

```bash
npx wrangler secret put FEATHERLESS_API_KEY
npx wrangler secret put AIMLAPI_API_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put AUTH_SECRET
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
npx wrangler secret put BAND_AGENTS_JSON
```

Deploy:

```bash
npm run deploy
```

Index the seeded policy knowledge once after deployment:

```bash
curl -X POST "https://YOUR-WORKER/api/knowledge/reindex" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Until indexing is complete, retrieval automatically falls back to D1 keyword
search. This keeps the workflow functional while still providing semantic RAG
when Vectorize is ready.

## Cloudflare Access login

Protect the deployed Worker with a Cloudflare Access self-hosted application.
Use the free One-time PIN identity provider or organization SSO. Configure
`ACCESS_TEAM_DOMAIN` and the application's `ACCESS_AUD`; the Worker verifies
the Access JWT signature and maps the authenticated email to an active D1 user.
Roles and organization scope are always derived server-side.

The role picker is available only on localhost when the demo launcher enables
development authentication. It cannot be used on a public hostname.

## Validation

```bash
npm run build
npm run typecheck:worker
npm run lint
npm test
npx wrangler deploy --dry-run
```

The rules-only fallback covers local testing without provider keys. Business
approval in this mode requires a written human override reason. A live run
should configure all providers so Band rooms, model calls, and Vectorize
retrieval are visible.

## API overview

| Route | Purpose |
|---|---|
| `GET /api/health` | Provider and binding readiness |
| `GET/POST/DELETE /api/auth/session` | Verified session or localhost development login |
| `POST /api/agents/analyze` | Sales parsing |
| `POST /api/agents/missing-info` | Required-field completion |
| `POST /api/agents/generate-email` | Sales graph |
| `GET/POST /api/deals` | Organization-scoped deal persistence |
| `GET /api/deals/:id` | Tenant-scoped deal and current evaluation |
| `PATCH /api/deals/:id/email` | Human-edited proposal |
| `POST /api/deals/:id/submit` | Sales-to-Business handoff |
| `POST /api/deals/:id/withdraw` | Withdraw pending work for revision |
| `POST /api/deals/:id/evaluate` | Business graph |
| `POST /api/deals/:id/approve` | Version-checked approval and contract draft |
| `POST /api/deals/:id/reject` | Structured feedback routing |
| `POST /api/deals/:id/sign` | Authenticated internal signature record |
| `POST /api/deals/:id/archive` | Soft archive completed work |
| `POST /api/knowledge/reindex` | Vectorize ingestion |

## Security

- Never commit `.dev.vars`, provider keys, Band agent keys, or account
  passwords.
- Rotate any key pasted into chat, screenshots, issues, or commit history.
- Use scoped Worker secrets and Cloudflare Access for the deployed app.
- Every deal query is scoped to the authenticated organization.
- Deal updates use optimistic versions and a server-enforced state machine.
- Approved outcomes are immutable; revisions create a new proposal version.
- There is no global reset or client-controlled role header.
