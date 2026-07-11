# Deployment — Vercel + Supabase

This is the operational checklist to get myGPC live on Vercel with Supabase as
the backend. Written after Phases A–E were completed autonomously on
2026-07-10.

---

## What you need to provide

1. **Vercel account** — signed up with the same GitHub account that owns the
   repo (`alexanderschmitt-design/myGuentner`).
2. **Vercel access token** — from https://vercel.com/account/tokens (needed
   only if you want the CLI or a script to trigger deploys; the GitHub-Vercel
   integration doesn't require it).
3. Rotated **Anthropic key**, rotated **Gemini key**, rotated **DMS bearer
   token** (all currently in `.env`, all were exposed in chat history — treat
   as compromised).

---

## Vercel setup

### 1. Import the repo

- Vercel Dashboard → **Add New… → Project**
- Select repo `alexanderschmitt-design/myGuentner`
- **Root Directory**: set to **`nuxt`** — this is a nested Nuxt project.
  Everything else (framework detection, build command, output directory) is
  auto-detected once Root Directory points at the Nuxt folder.
- **Framework Preset**: Nuxt.js (auto-selected after Root Directory is set)
- Do **not** click Deploy yet — env vars first.

> If you already imported the project with Root Directory = `/` and got an
> "No Output Directory named .output" error: go to **Settings → General →
> Root Directory** and change it to `nuxt`, then hit **Redeploy** on the
> failed deployment. That's the fix.

### 2. Environment variables

Copy from your local `.env` into **Settings → Environment Variables**. All
target **Production, Preview, Development** unless noted.

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://xvtjgfwpowzbfojcgsxw.supabase.co` | |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Browser-safe; ends up in bundle |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | **Secret** — never in client bundle |
| `ANTHROPIC_API_KEY` | (new key after rotation) | Secret |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | |
| `GOOGLE_API_KEY` | (new key after rotation) | Secret |
| `GEMINI_MODEL` | `gemini-2.5-flash` | |
| `LLM_PROVIDER` | `anthropic` or `gemini` | |
| `OPENAI_API_KEY` | (add if you want RAG search) | Secret. Without this, `/api/rag/query` and `/api/chat` context are disabled |
| `RAG_EMBEDDING_MODE` | `openai` | |
| `RAG_EMBEDDING_MODEL` | `text-embedding-3-small` | 1536-dim, matches schema |
| `DMS_BASE_URL` | `https://dms-prod.guentner.com` | |
| `DMS_REPOSITORY_ID` | `cffcc398-5466-586f-921f-4655e26f70e0` | |
| `DMS_API_KEY` | (new bearer after rotation) | Secret |
| `DMS_AUTH_MODE` | `bearer` | |
| `GPCEU_BASE_URL` | `https://apieu-calc-test.azurewebsites.net` | Test backend; switch to prod URL when ready |
| `GPCEU_API_KEY` | (rotated) | Secret |
| `GPCEU_HEALTH_PATH` | `api/GPCDataQuery/gpcversion` | |

Vercel Preview deploys can share the same values. If you want an isolated
Preview environment (separate Supabase project), set overrides per-environment.

### 3. Deploy

- Click **Deploy** in the dashboard, or push a commit to `main` — the
  GitHub integration triggers a build automatically.
- Region should be `fra1` (already declared in `vercel.json`).
- Expected first build: ~2–3 minutes.

---

## First-user creation

Supabase Auth requires at least one user before anyone can log in. Two ways:

### Option A — via Supabase Studio (fastest)
- https://supabase.com/dashboard/project/xvtjgfwpowzbfojcgsxw
- Authentication → Users → **Add User** → Create user
- Set email + password, tick "Auto Confirm User"

### Option B — via the bootstrap script (from your dev machine)
```bash
node scripts/create-user.mjs alexander.schmitt@spark-radiance.eu Passwort123
```
Uses `SUPABASE_URL` + `SUPABASE_SECRET_KEY` from `.env`.

After the first user exists, additional users can be created via
`POST /api/admin/users` (any authenticated caller can create — restrict later
if needed).

---

## Post-deploy smoke test

Once the Vercel deployment is live, hit these URLs (replace host):

```bash
# 1. Login page
curl -I https://<host>/login
# → 200 OK

# 2. Any /api/* without auth returns 401
curl https://<host>/api/dms/health
# → 401 { "code": "UNAUTHENTICATED" }

# 3. Log in via browser at https://<host>/login
#    then in DevTools copy the Supabase auth cookie and:
curl -H "Cookie: sb-<hash>-auth-token=…" https://<host>/api/system/status
# → 200 with everything green
```

Browser walkthrough:
1. Visit `https://<host>/` → redirects to `/login`
2. Log in → redirects to `/`
3. Open the Wizard at `/mygps` → should work
4. Chat should stream (once ANTHROPIC or GEMINI key is set)

---

## Migrating existing local data (optional)

If you want the 36 local DMS docs and their embeddings in Supabase:

```bash
# One-off, from your dev machine (needs OPENAI_API_KEY in .env)
node scripts/migrate-local-to-supabase.mjs
```

Reads `uploads/_documents.json` + `uploads/*.pdf`, uploads PDFs to Supabase
Storage, re-embeds chunks with OpenAI (1536-dim), inserts everything.

Skip this if you're happy to re-import from DMS via `POST /api/dms/import` on
Vercel — that's cleaner but requires OPENAI_API_KEY to be set on Vercel first.

---

## Known limitations

- **Chat streaming on Hobby tier**: Vercel Hobby caps serverless function
  duration at 60s. Long LLM answers (>60s) will be cut. Upgrade to Pro (300s)
  or enable Fluid Compute if this becomes an issue.
- **Cookie-only auth for the API**: The Nitro auth middleware only accepts
  Supabase session cookies (which browsers send automatically). If you want to
  call the API from a script or curl, you'll need to add Bearer token support
  in `nuxt/server/middleware/auth.ts`.
- **The `baseURL: '/'`** in `nuxt.config.ts` means the app is served under
  `/` — not root. Vercel URL will be `https://…/login`, not
  `https://…/login`. To move to root, remove `baseURL` in `nuxt.config.ts` and
  redeploy.
- **DMS bulk-import**: synchronous only. Batches >~20 docs may time out on
  Vercel's function limits — use `scripts/migrate-local-to-supabase.mjs` for
  large migrations instead.
